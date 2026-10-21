// WP-10 (proofs DP-7, DP-8, DP-9, DP-14): the write service's command pipeline. One test per guard and per refusal code, and each
// refusal is proved to have written nothing: the record still holds its old cells and the journal has no new row. The write
// service works only in a scratch sandbox here; nothing touches the repository's data/.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { newOpId } from '../../packages/data/src/digest.ts';
import { parseCommand } from '../../packages/data/src/parse.ts';
import { rowHash } from '../../packages/data/src/digest.ts';
import { HASH, QUOTE, SOURCE, command, dropTemplate, journalSize, measurement, root, scratch } from './write-helpers.mjs';

after(dropTemplate);

/** Run `overrides` as a command, expect a refusal with `code`, and prove nothing changed. */
async function refused(code, overrides, { store, setup } = {}) {
  const sb = await scratch(store === undefined ? {} : { store });
  try {
    if (setup) setup(sb.ws);
    const before = measurement(sb.ws).cells;
    const journal = journalSize(sb.ws);
    const result = sb.ws.apply(command(sb.ws, typeof overrides === 'function' ? overrides(sb.ws) : overrides));
    assert.equal(result.status, 'refused', JSON.stringify(result));
    assert.equal(result.code, code, result.detail);
    assert.ok(result.detail.length > 20, 'a refusal says why in words');
    assert.deepEqual(measurement(sb.ws).cells, before, 'a refused command changes no cell');
    assert.equal(journalSize(sb.ws), journal, 'a refused command writes no change record');
    return result;
  } finally { sb.cleanup(); }
}

// ---------------------------------------------------------------- the command applies, all cells together

test('a correction applies: every related cell changes together, the row keeps its place, one draft change record is written', async () => {
  const sb = await scratch();
  try {
    const before = measurement(sb.ws);
    const cmd = command(sb.ws);
    const result = sb.ws.apply(cmd);
    assert.equal(result.status, 'applied');
    assert.equal(result.changeRecordIds.length, 1);
    assert.equal(result.impact.recordIds[0], 'V000001');
    assert.equal(result.impact.snapshotDigest, sb.ws.stamp().snapshotDigest);
    const after = measurement(sb.ws);
    assert.equal(after.ord, before.ord, 'order is data: the row stays where it was');
    assert.equal(after.get('Raw value'), '1.25');
    assert.equal(after.get('Raw numeric'), '1.25');
    assert.equal(after.get('Normalized value'), '1250');
    const typed = sb.ws.db.prepare('SELECT raw_numeric, normalized_value, normalized_value_state FROM measurements WHERE measurementid = ?').get('V000001');
    assert.deepEqual({ ...typed }, { raw_numeric: 1.25, normalized_value: 1250, normalized_value_state: null }, 'the typed columns follow the text');
    const [draft] = sb.ws.drafts();
    assert.equal(draft.status, 'draft');
    assert.deepEqual(draft.record.before, cmd.expect.cells);
    assert.deepEqual(draft.record.after, cmd.set);
    assert.equal(draft.record.actor.kind, 'agent');
    assert.equal(draft.record.actor.model, 'claude-sonnet-5-5');
    assert.deepEqual(draft.record.evidence, cmd.evidence);
    assert.equal(draft.record.quoteCheck.status, 'verified', 'the fake store holds the page, so the quote check ran');
    assert.equal(draft.record.base.snapshotDigest, cmd.base.snapshotDigest);
  } finally { sb.cleanup(); }
});

test('without the private store the quote check is "not run", never "verified" (04 section 5.1)', async () => {
  const sb = await scratch({ store: null });
  try {
    assert.equal(sb.ws.apply(command(sb.ws)).status, 'applied');
    const check = sb.ws.drafts()[0].record.quoteCheck;
    assert.equal(check.status, 'not-run');
    assert.match(check.reason, /store absent/);
    assert.match(check.opsDigest, /^[0-9a-f]{64}$/);
  } finally { sb.cleanup(); }
});

test('a missing-state word stays a word: it is stored as text, the typed column is NULL and the state names it, never 0', async () => {
  const sb = await scratch();
  try {
    const result = sb.ws.apply(command(sb.ws, {
      set: { 'Raw value': 'Not published', 'Raw numeric': 'Not published', 'Normalized value': 'Not published' },
      evidence: { sourceId: SOURCE, sha256: HASH, page: 1, locator: 'Table 1', quote: QUOTE },
    }));
    assert.equal(result.status, 'applied', JSON.stringify(result));
    const row = sb.ws.db.prepare('SELECT raw_numeric_text, raw_numeric, raw_numeric_state, normalized_value_text, normalized_value, normalized_value_state FROM measurements WHERE measurementid = ?').get('V000001');
    assert.deepEqual({ ...row }, {
      raw_numeric_text: 'Not published', raw_numeric: null, raw_numeric_state: 'Not published',
      normalized_value_text: 'Not published', normalized_value: null, normalized_value_state: 'Not published',
    });
    assert.equal(measurement(sb.ws).get('Normalized value'), 'Not published');
  } finally { sb.cleanup(); }
});

// ---------------------------------------------------------------- idempotency (DP-9)

test('the same opId twice is applied once: the retry is a duplicate with no second edit and no second change record', async () => {
  const sb = await scratch();
  try {
    const cmd = command(sb.ws);
    const first = sb.ws.apply(cmd);
    const retry = sb.ws.apply(cmd);
    assert.equal(first.status, 'applied');
    assert.equal(retry.status, 'duplicate');
    assert.deepEqual(retry.changeRecordIds, first.changeRecordIds);
    assert.equal(journalSize(sb.ws), 1);
    assert.equal(measurement(sb.ws).get('Normalized value'), '1250');
  } finally { sb.cleanup(); }
});

test('a retry after a restart is still a duplicate, and so is a retry after the workspace was rebuilt on a newer base', async () => {
  const sb = await scratch();
  try {
    const cmd = command(sb.ws);
    assert.equal(sb.ws.apply(cmd).status, 'applied');
    sb.ws.close();
    sb.ws = await sb.open();
    assert.equal(sb.ws.apply(cmd).status, 'duplicate');
    assert.equal(journalSize(sb.ws), 1);
  } finally { sb.cleanup(); }
});

test('opid-conflict: the same opId with other content is refused, not silently taken for the first command', async () => {
  const sb = await scratch();
  try {
    const cmd = command(sb.ws);
    assert.equal(sb.ws.apply(cmd).status, 'applied');
    const other = sb.ws.apply({ ...cmd, reason: 'A different reason for a different change.' });
    assert.equal(other.status, 'refused');
    assert.equal(other.code, 'opid-conflict');
    assert.equal(journalSize(sb.ws), 1);
  } finally { sb.cleanup(); }
});

test('opid-invalid: an opId that is not a ULID is refused', async () => {
  await refused('opid-invalid', { opId: 'not-a-ulid' });
});

test('unsupported-kind: the proposal commands are refused until WP-28 (every other kind is WP-17\'s, in write-commands.test.mjs)', async () => {
  await refused('unsupported-kind', { kind: 'acceptProposal' });
});

// ---------------------------------------------------------------- one writer (writer-locked)

test('writer-locked: a live process holding the lock makes the command refused and writes nothing', async () => {
  const sb = await scratch();
  try {
    writeFileSync(join(sb.dir, 'writer.lock'), `${JSON.stringify({ pid: process.pid, host: (await import('node:os')).hostname(), since: '2026-10-21T00:00:00.000Z', token: 'someone-else' })}\n`);
    const result = sb.ws.apply(command(sb.ws));
    assert.equal(result.status, 'refused');
    assert.equal(result.code, 'writer-locked');
    assert.match(result.detail, new RegExp(`process ${process.pid}`));
    assert.equal(journalSize(sb.ws), 0);
    assert.equal(measurement(sb.ws).get('Normalized value'), '1240');
  } finally { sb.cleanup(); }
});

test('a lock left by a process that is gone is taken over, and the lock is released after every command', async () => {
  const sb = await scratch();
  try {
    const dead = spawnSync(process.execPath, ['-e', '0']);
    assert.equal(dead.status, 0);
    writeFileSync(join(sb.dir, 'writer.lock'), `${JSON.stringify({ pid: dead.pid, host: (await import('node:os')).hostname(), since: '2026-10-21T00:00:00.000Z', token: 'dead' })}\n`);
    assert.equal(sb.ws.apply(command(sb.ws)).status, 'applied');
    assert.equal(existsSync(join(sb.dir, 'writer.lock')), false, 'the lock is released');
  } finally { sb.cleanup(); }
});

// ---------------------------------------------------------------- stale base and stale expectation (DP-8)

test('stale-base: a command written against another approved snapshot is refused, with both digests', async () => {
  const result = await refused('stale-base', (ws) => ({ base: { snapshotDigest: 'a'.repeat(64), commit: 'abc' + '0'.repeat(37) } }));
  assert.match(result.detail, /aaaaaaaaaaaa/);
  assert.match(result.detail, /open check/);
});

test('stale: a cell that moved is refused with the expected and the current values, in words and as data', async () => {
  const sb = await scratch();
  try {
    const cmd = command(sb.ws, { expect: { cells: { 'Raw value': '1.30', 'Raw numeric': '1.24', 'Normalized value': '1240' } } });
    const result = sb.ws.apply(cmd);
    assert.equal(result.status, 'refused');
    assert.equal(result.code, 'stale');
    assert.match(result.detail, /Raw value: expected "1\.30", found "1\.24"/);
    assert.deepEqual(result.expected, cmd.expect);
    assert.equal(result.current.cells['Raw value'], '1.24');
    assert.equal(result.current.rowHash, rowHash('measurements', measurement(sb.ws).cells));
    assert.equal(result.current.schemaDigest, sb.ws.stamp().schemaSha256);
    assert.equal(journalSize(sb.ws), 0);
  } finally { sb.cleanup(); }
});

test('stale: after another correction landed on the record, the second writer is refused and sees what the first wrote', async () => {
  const sb = await scratch();
  try {
    assert.equal(sb.ws.apply(command(sb.ws)).status, 'applied');
    const late = sb.ws.apply(command(sb.ws, { set: { 'Raw value': '1.26', 'Raw numeric': '1.26', 'Normalized value': '1260' } }));
    assert.equal(late.status, 'refused');
    assert.equal(late.code, 'stale');
    assert.equal(late.current.cells['Normalized value'], '1250');
    assert.equal(measurement(sb.ws).get('Normalized value'), '1250');
  } finally { sb.cleanup(); }
});

test('stale: a row hash that no longer matches, a schema digest that moved, and a record that is not there are each refused as stale', async () => {
  const sb = await scratch();
  try {
    const hash = rowHash('measurements', measurement(sb.ws).cells);
    assert.equal(sb.ws.apply(command(sb.ws, { expect: { rowHash: 'b'.repeat(64) } })).code, 'stale');
    const schema = sb.ws.apply(command(sb.ws, { expect: { rowHash: hash, schemaDigest: 'c'.repeat(64) } }));
    assert.equal(schema.code, 'stale');
    assert.match(schema.detail, /schema moved/);
    const missing = sb.ws.apply(command(sb.ws, { target: { table: 'measurements', id: 'V999999' }, expect: { rowHash: hash } }));
    assert.equal(missing.code, 'stale');
    assert.equal(missing.current.rowHash, null);
    assert.equal(missing.current.cells, null);
    assert.equal(sb.ws.apply(command(sb.ws, { expect: { rowHash: hash } })).status, 'applied', 'the row hash alone is a complete expectation');
  } finally { sb.cleanup(); }
});

test('expectation-empty: an expect that names nothing is refused', async () => {
  await refused('expectation-empty', { expect: { cells: {} } });
});

test('expectation-partial: every cell a correction replaces must be named in expect (or the row hash given)', async () => {
  const result = await refused('expectation-partial', { expect: { cells: { 'Raw value': '1.24' } } });
  assert.match(result.detail, /Raw numeric, Normalized value/);
});

// ---------------------------------------------------------------- the target and the cells

test('unknown-target: an unknown table, column or key, an address of the wrong shape, and a table name that is SQL are all refused before any SQL is built', async () => {
  await refused('unknown-target', { target: { table: 'measurements; DROP TABLE grades', id: 'V000001' } });
  await refused('unknown-target', { target: { table: 'measurements' } }); // no id
  await refused('unknown-target', { set: { 'Raw value"; DROP TABLE grades; --': '1' }, expect: { rowHash: 'd'.repeat(64) } });
  await refused('unknown-target', { target: { table: 'headlines', id: 'M001' }, set: { Use: 'x' }, expect: { cells: { Use: 'y' } } }); // a composite key needs its parts
  await refused('unknown-target', { expect: { cells: { 'No such column': 'x', 'Raw value': '1.24', 'Raw numeric': '1.24', 'Normalized value': '1240' } } });
});

test('values are bound parameters: a quote and SQL in a cell are stored as text and break nothing', async () => {
  const sb = await scratch();
  try {
    const note = "O'Brien's \"quoted\"; DROP TABLE grades; -- text";
    const cur = measurement(sb.ws).get('Notes');
    const result = sb.ws.apply(command(sb.ws, { set: { Notes: `${cur} ${note}` }, expect: { cells: { Notes: cur } } }));
    assert.equal(result.status, 'applied', JSON.stringify(result));
    assert.equal(measurement(sb.ws).get('Notes'), `${cur} ${note}`);
    assert.equal(Number(sb.ws.db.prepare('SELECT count(*) AS n FROM grades').get().n), 1193);
  } finally { sb.cleanup(); }
});

test('not-canonical: a cell must be canonical text (trimmed; null for empty), so the command, its record and its CSV are one thing', async () => {
  await refused('not-canonical', { set: { 'Raw value': ' 1.25', 'Raw numeric': '1.25', 'Normalized value': '1250' } });
  await refused('not-canonical', { set: { 'Raw value': '1.25', 'Raw numeric': '', 'Normalized value': '1250' } });
});

test('no-change: a command that sets what is already there records nothing', async () => {
  await refused('no-change', { set: { 'Raw value': '1.24', 'Raw numeric': '1.24', 'Normalized value': '1240' } });
});

test('delete-refused: a key column identifies the record, so changing it would remove the record under its old key', async () => {
  const result = await refused('delete-refused', { set: { MeasurementID: 'V000999' }, expect: { cells: { MeasurementID: 'V000001' } } });
  assert.match(result.detail, /nothing is deleted/);
});

test('schema-violation: a word the column does not declare, a value the vocabulary or pattern refuses', async () => {
  const word = await refused('schema-violation', { set: { 'Raw value': '1.25', 'Raw numeric': 'N/A', 'Normalized value': '1250' } });
  assert.match(word.detail, /Not published/);
  const vocab = await refused('schema-violation', (ws) => ({ set: { 'Data status': 'Invented status' }, expect: { cells: { 'Data status': measurement(ws).get('Data status') } } }));
  assert.match(vocab.detail, /check/i);
  assert.match(vocab.detail, /vocabulary/);
});

test('reference-missing: a reference to a record that does not exist is refused by the database foreign key', async () => {
  await refused('reference-missing', { set: { GradeID: 'G999-99' }, expect: { cells: { GradeID: 'G001-01' } } });
});

// ---------------------------------------------------------------- raw, numeric and normalized change together

test('cells-not-together: raw, numeric and normalized cells change together, or the command says why', async () => {
  await refused('cells-not-together', { set: { 'Raw numeric': '1.25' }, expect: { cells: { 'Raw numeric': '1.24' } } });
  const sb = await scratch();
  try {
    const apart = sb.ws.apply(command(sb.ws, { set: { 'Raw numeric': '1.25' }, expect: { cells: { 'Raw numeric': '1.24' } }, apart: 'The sheet prints 1.25 in the raw cell already; only its typed number was wrong.' }));
    assert.equal(apart.status, 'applied', JSON.stringify(apart));
    assert.match(sb.ws.drafts()[0].record.cellsApart, /typed number was wrong/);
  } finally { sb.cleanup(); }
});

test('missing-as-number: a normalized number cannot rest on a raw value that is a missing-state word', async () => {
  await refused('missing-as-number', { set: { 'Raw value': '1.25', 'Raw numeric': 'Not published', 'Normalized value': '1250' } });
});

test('unit-mismatch: the normalized unit must be a unit of the property', async () => {
  await refused('unit-mismatch', { set: { 'Normalized unit': 'MPa' }, expect: { cells: { 'Normalized unit': 'kg/m³' } } });
});

test('ownership-mismatch: a measurement\'s grade must belong to its material (D36)', async () => {
  await refused('ownership-mismatch', (ws) => {
    const other = ws.db.prepare("SELECT gradeid FROM grades WHERE materialid <> 'M001' LIMIT 1").get().gradeid;
    return { set: { GradeID: other }, expect: { cells: { GradeID: 'G001-01' } } };
  });
});

// ---------------------------------------------------------------- evidence

test('evidence-missing: a decision-reading column cannot change without complete evidence', async () => {
  await refused('evidence-missing', { evidence: undefined });
  await refused('evidence-missing', { evidence: { sourceId: SOURCE, sha256: 'not-a-hash', page: 1, locator: 'Table 1', quote: QUOTE } });
  await refused('evidence-missing', { evidence: { sourceId: SOURCE, sha256: HASH, page: 0, locator: 'Table 1', quote: QUOTE } });
});

test('a correction always carries its evidence (the contract), even when only Notes change; the evidence is checked either way', async () => {
  const sb = await scratch();
  try {
    const cur = measurement(sb.ws).get('Notes');
    const set = { Notes: `${cur} Reviewed on 2026-10-21.` };
    const bare = sb.ws.apply(command(sb.ws, { set, expect: { cells: { Notes: cur } }, evidence: undefined }));
    assert.equal(bare.code, 'evidence-missing');
    const wrong = sb.ws.apply(command(sb.ws, { set, expect: { cells: { Notes: cur } }, evidence: { sourceId: SOURCE, sha256: 'f'.repeat(64), page: 1, locator: 'T', quote: QUOTE } }));
    assert.equal(wrong.code, 'source-hash-mismatch');
    assert.equal(sb.ws.apply(command(sb.ws, { set, expect: { cells: { Notes: cur } } })).status, 'applied');
  } finally { sb.cleanup(); }
});

test('a whitespace-only quote is no evidence: it would be "found" on every page', async () => {
  await refused('evidence-missing', { evidence: { sourceId: SOURCE, sha256: HASH, page: 1, locator: 'T', quote: '   ' } });
  await refused('evidence-missing', { evidence: { sourceId: SOURCE, sha256: HASH, page: 1, locator: '  ', quote: QUOTE } });
});

test('source-not-retrieved: the source must be listed, retrieved (or a retrieved copy) and cited', async () => {
  const unlisted = await refused('source-not-retrieved', { evidence: { sourceId: 'NO-SUCH-SOURCE', sha256: HASH, page: 1, locator: 'T', quote: QUOTE } });
  assert.match(unlisted.detail, /does not list/);
  await refused('source-not-retrieved', (ws) => {
    const s = ws.db.prepare("SELECT sourceid FROM sources WHERE citation_role <> 'cited' LIMIT 1").get().sourceid;
    return { evidence: { sourceId: s, sha256: HASH, page: 1, locator: 'T', quote: QUOTE } };
  });
});

test('source-hash-mismatch: the evidence hash must be the source row\'s recorded SHA-256', async () => {
  const result = await refused('source-hash-mismatch', { evidence: { sourceId: SOURCE, sha256: 'e'.repeat(64), page: 1, locator: 'T', quote: QUOTE } });
  assert.match(result.detail, /eeeeeeeeeeee/);
});

test('evidence-source-mismatch: a record is corrected from the source it cites', async () => {
  await refused('evidence-source-mismatch', (ws) => {
    const s = ws.db.prepare("SELECT sourceid, sha256 FROM sources WHERE access_state = 'retrieved' AND citation_role = 'cited' AND sourceid <> ? AND sha256 GLOB '[0-9a-f]*' LIMIT 1").get(SOURCE);
    return { evidence: { sourceId: s.sourceid, sha256: s.sha256, page: 1, locator: 'T', quote: QUOTE } };
  });
});

test('quote-not-on-page: with the private store, the quote must be on the hash-checked page', async () => {
  const wrong = await refused('quote-not-on-page', { evidence: { sourceId: SOURCE, sha256: HASH, page: 2, locator: 'T', quote: QUOTE } });
  assert.match(wrong.detail, /not on page 2/);
  const beyond = await refused('quote-not-on-page', { evidence: { sourceId: SOURCE, sha256: HASH, page: 9, locator: 'T', quote: QUOTE } });
  assert.match(beyond.detail, /2 page\(s\); there is no page 9/);
});

test('value-not-printed (D97): the value must be a number the quoted line prints, whole, and a number printed once has one role', async () => {
  const absent = await refused('value-not-printed', { evidence: { sourceId: SOURCE, sha256: HASH, page: 1, locator: 'T', quote: 'Density ISO 1183 g/cc 1.30' } }, { store: null });
  assert.match(absent.detail, /Raw numeric 1\.25 is not a number the quoted line prints/);
  // "1.25" inside "11.25" is not 1.25: a number inside another is not printed by this reading.
  await refused('value-not-printed', { evidence: { sourceId: SOURCE, sha256: HASH, page: 1, locator: 'T', quote: 'Density 11.25 g/cc' } }, { store: null });
  // The line prints 90 once, but the correction gives it two roles: the anneal temperature and the raw number.
  const role = await refused('value-not-printed', {
    set: { 'Raw value': '90', 'Raw numeric': '90', 'Normalized value': '90', 'Anneal °C': '90' },
    expect: { cells: { 'Raw value': '1.24', 'Raw numeric': '1.24', 'Normalized value': '1240', 'Anneal °C': 'Not applicable' } },
    evidence: { sourceId: SOURCE, sha256: HASH, page: 1, locator: 'T', quote: 'Strength 90 MPa' },
  }, { store: null });
  assert.match(role.detail, /printed once/);
});

// ---------------------------------------------------------------- rule rows and Notes

async function ruleRowCommand(ws, overrides = {}) {
  const limit = ws.db.prepare(`SELECT l.limitid AS id, l.basis AS basis, l.sourceid AS sourceid, s.sha256 AS sha FROM class_limits l JOIN sources s ON s.sourceid = l.sourceid
    WHERE s.access_state IN ('retrieved', 'retrieved-copy') AND s.citation_role = 'cited' AND s.sha256 GLOB '[0-9a-f]*' LIMIT 1`).get();
  return command(ws, {
    target: { table: 'class_limits', id: limit.id }, expect: { cells: { Basis: limit.basis } }, set: { Basis: `${limit.basis} (re-read)` },
    evidence: { sourceId: limit.sourceid, sha256: limit.sha, page: 1, locator: 'T', quote: 'any line' }, rulings: ['R-OQ09a'], ...overrides,
  });
}

test('ruling-missing: a rule row cites a ruling that exists in docs/next/rulings.csv', async () => {
  const sb = await scratch({ store: null });
  try {
    const none = sb.ws.apply(await ruleRowCommand(sb.ws, { rulings: undefined }));
    assert.equal(none.code, 'ruling-missing');
    const unknown = sb.ws.apply(await ruleRowCommand(sb.ws, { rulings: ['R-NOPE'] }));
    assert.equal(unknown.code, 'ruling-missing');
    assert.match(unknown.detail, /R-NOPE/);
    assert.equal(journalSize(sb.ws), 0);
    assert.equal(sb.ws.apply(await ruleRowCommand(sb.ws)).status, 'applied', 'with an existing ruling the rule row is accepted');
  } finally { sb.cleanup(); }
});

test('rule-row-not-alone: a rule row travels alone in its change set, whichever arrives second', async () => {
  const sb = await scratch({ store: null });
  try {
    assert.equal(sb.ws.apply(command(sb.ws)).status, 'applied');
    const second = sb.ws.apply(await ruleRowCommand(sb.ws));
    assert.equal(second.code, 'rule-row-not-alone');
  } finally { sb.cleanup(); }
  const sb2 = await scratch({ store: null });
  try {
    assert.equal(sb2.ws.apply(await ruleRowCommand(sb2.ws)).status, 'applied');
    const second = sb2.ws.apply(command(sb2.ws));
    assert.equal(second.code, 'rule-row-not-alone');
    assert.equal(measurement(sb2.ws).get('Normalized value'), '1240');
  } finally { sb2.cleanup(); }
});

test('notes-id-token: new Notes text names no migration or change set; the dated correction note stays (OQ-16 A)', async () => {
  const sb = await scratch();
  try {
    const cur = measurement(sb.ws).get('Notes');
    assert.match(cur, /m118/, 'the existing note carries a migration token; that old text is not "new"');
    const set = (text) => command(sb.ws, { set: { Notes: text }, expect: { cells: { Notes: cur } } });
    for (const bad of ['Corrected 2026-10-21 (m413) against the source.', 'See 2026-11-04-pla-basic-density-7f3a.', `Corrected by CR-${newOpId()}.`]) {
      const result = sb.ws.apply(set(`${cur} ${bad}`));
      assert.equal(result.code, 'notes-id-token', bad);
    }
    assert.equal(measurement(sb.ws).get('Notes'), cur);
    assert.equal(sb.ws.apply(set(`${cur} Corrected 2026-10-21 against the source: the density is 1.25.`)).status, 'applied', 'the old token is kept, a dated note is added');
  } finally { sb.cleanup(); }
});

// ---------------------------------------------------------------- a failure inside the transaction (DP-7)

test('an interrupted multi-cell edit leaves the whole previous state and is thrown, never returned as a success (DP-7)', async () => {
  const sb = await scratch();
  try {
    const before = measurement(sb.ws).cells;
    // The change record cannot be written (as a full disk would): the three cells already updated in this transaction must roll back.
    sb.ws.db.exec("CREATE TRIGGER inject_fault BEFORE INSERT ON change_log BEGIN SELECT RAISE(ABORT, 'disk full (injected)'); END");
    assert.throws(() => sb.ws.apply(command(sb.ws)), /disk full \(injected\)/);
    assert.deepEqual(measurement(sb.ws).cells, before);
    assert.equal(journalSize(sb.ws), 0);
    assert.equal(sb.ws.db.inTransaction, false);
    sb.ws.db.exec('DROP TRIGGER inject_fault');
    assert.equal(sb.ws.apply(command(sb.ws)).status, 'applied', 'the workspace is usable after the failure');
  } finally { sb.cleanup(); }
});

test('a command read from JSON that is not understood is not applied: every problem is listed', () => {
  const parsed = parseCommand({ opId: 'x', kind: 'correctValue', target: { table: 'nope' }, expect: { cells: { A: 1 } }, reason: '', actor: { kind: 'agent', name: 'a' } });
  assert.equal(parsed.ok, false);
  const text = parsed.problems.join('\n');
  for (const piece of ['opId', 'target.table', 'expect.cells.A', 'reason', 'actor.model', 'base']) assert.match(text, new RegExp(piece.replace('.', '\\.')));
});

test('the write service never opens a path under data/: a workspace inside the data it reads is refused', async () => {
  const { Workspace } = await import('../../packages/data/src/workspace.ts');
  await assert.rejects(() => Workspace.open({ workspaceDir: join(root, 'data', 'scratch-ws'), store: null }), /sandbox outside the data it reads/);
  assert.equal(existsSync(join(root, 'data', 'scratch-ws')), false, 'nothing was created');
});
