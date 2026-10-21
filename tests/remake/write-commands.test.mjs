// WP-17 (proofs DP-6, DP-9, DP-14): the commands that change rows. One test per command, and one per refusal code of each command; every refusal is
// proved to have changed nothing (the snapshot digest of all 36 tables and the journal are as they were). The correctValue guards are
// tested in write-guards.test.mjs; here the other commands meet the same guards where they work differently.
// The write service works in a scratch sandbox only; nothing touches the repository's data/.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { rowHash } from '../../packages/data/src/digest.ts';
import { RETIREMENT_COLUMNS } from '../../packages/data/src/write-rows.ts';
import { storageOf } from '../../packages/data/src/storage.ts';
import { HASH, QUOTE, SOURCE, cmd, dropTemplate, fingerprint, journalSize, newOpId, recordBy, refusedWith, scratch, schemaExpect, storeOf } from './write-helpers.mjs';

after(dropTemplate);

const evidence = { sourceId: SOURCE, sha256: HASH, page: 1, locator: 'Table 1', quote: QUOTE };
const tableRows = (ws, table) => Number(ws.db.prepare(`SELECT count(*) AS n FROM "${table}"`).get().n);

// ---------------------------------------------------------------- addMeasurement

/** A second printing of the density row of V000001: its own ID and locator, the value the fake sheet prints (1.25 g/cc). */
function newMeasurement(ws, overrides = {}) {
  const { all } = recordBy(ws, 'measurements', 'MeasurementID', 'V000001');
  const next = `V${String(Number(ws.db.prepare('SELECT max(measurementid) AS m FROM measurements').get().m.slice(1)) + 1).padStart(6, '0')}`;
  const row = { ...all, MeasurementID: next, 'Raw value': '1.25', 'Raw numeric': '1.25', 'Normalized value': '1250', Locator: 'p. 1: Density (second printing)', Notes: 'A second printing of the sheet.', ...overrides };
  return cmd(ws, 'addMeasurement', { target: { table: 'measurements' }, expect: schemaExpect(ws), row, evidence });
}
test('addMeasurement: a new observation is appended at the end, with its evidence, and one draft change record says what was added', async () => {
  const sb = await scratch();
  try {
    const rows = tableRows(sb.ws, 'measurements');
    const command = newMeasurement(sb.ws);
    const result = sb.ws.apply(command);
    assert.equal(result.status, 'applied', JSON.stringify(result));
    assert.equal(tableRows(sb.ws, 'measurements'), rows + 1);
    const added = recordBy(sb.ws, 'measurements', 'MeasurementID', command.row.MeasurementID);
    assert.equal(added.ord, rows + 1, 'order is data: the new row is last');
    assert.equal(added.get('Raw numeric'), '1.25');
    const typed = sb.ws.db.prepare('SELECT raw_numeric, normalized_value FROM measurements WHERE measurementid = ?').get(command.row.MeasurementID);
    assert.deepEqual({ ...typed }, { raw_numeric: 1.25, normalized_value: 1250 }, 'the typed columns follow the text');
    const [draft] = sb.ws.drafts();
    assert.equal(draft.record.kind, 'addMeasurement');
    assert.deepEqual(draft.record.before, {});
    assert.equal(draft.record.after.MeasurementID, command.row.MeasurementID);
    assert.equal(draft.record.tier, 0);
    assert.equal(draft.record.quoteCheck.status, 'verified');
    assert.deepEqual(draft.record.args.expect, command.expect);
    // the same opId again is a duplicate: one row, one record
    assert.equal(sb.ws.apply(command).status, 'duplicate');
    assert.equal(tableRows(sb.ws, 'measurements'), rows + 1);
    assert.equal(journalSize(sb.ws), 1);
  } finally { sb.cleanup(); }
});

test('addMeasurement duplicate-key: an ID that is there is never reused', async () => {
  await refusedWith('duplicate-key', (ws) => newMeasurement(ws, { MeasurementID: 'V000001' }));
});

test('addMeasurement duplicate-key: the same observation (grade, property, source, locator, conditions) is refused unless it says it is a twin on purpose', async () => {
  const result = await refusedWith('duplicate-key', (ws) => newMeasurement(ws, { Locator: 'p. 1: Density' }));
  assert.match(result.detail, /V000001/);
  assert.match(result.detail, /duplicateOf/);
  const sb = await scratch();
  try {
    const twin = newMeasurement(sb.ws, { Locator: 'p. 1: Density' });
    assert.equal(sb.ws.apply({ ...twin, duplicateOf: { id: 'V000001', reason: 'The maker reprints this table in a second data sheet; D89 counts it once.' } }).status, 'applied');
    assert.equal(sb.ws.drafts()[0].record.duplicateOf.id, 'V000001', 'the twin is on the record');
  } finally { sb.cleanup(); }
});

test('addMeasurement duplicate-of-invalid: a twin on purpose names a record that exists and gives its reason', async () => {
  await refusedWith('duplicate-of-invalid', (ws) => ({ ...newMeasurement(ws, { Locator: 'p. 1: Density' }), duplicateOf: { id: 'V000001', reason: ' ' } }));
  await refusedWith('duplicate-of-invalid', (ws) => ({ ...newMeasurement(ws, { Locator: 'p. 1: Density' }), duplicateOf: { id: 'V999999', reason: 'There is no such record.' } }));
});

test('addMeasurement not-for-command: it appends to measurements, and addRecord does not (a measurement has a natural key and always its evidence)', async () => {
  await refusedWith('not-for-command', (ws) => ({ ...newMeasurement(ws), target: { table: 'grades' } }));
  await refusedWith('not-for-command', (ws) => ({ ...newMeasurement(ws), kind: 'addRecord' }));
});

test('addMeasurement expectation-empty: a new record expects the schema it was written against (expect.schemaDigest), nothing else can be expected of a row that is not there', async () => {
  await refusedWith('expectation-empty', (ws) => ({ ...newMeasurement(ws), expect: { cells: { MeasurementID: null } } }));
});

test('addMeasurement stale: a schema digest that is not the workspace\'s is refused with the digest it holds', async () => {
  const result = await refusedWith('stale', (ws) => ({ ...newMeasurement(ws), expect: { schemaDigest: 'e'.repeat(64) } }));
  assert.match(result.current.schemaDigest, /^[0-9a-f]{64}$/);
});

test('addMeasurement evidence-missing, value-not-printed, ownership-mismatch: the guards of a decision-reading write run on every cell of a new row', async () => {
  await refusedWith('evidence-missing', (ws) => { const { evidence: _gone, ...rest } = newMeasurement(ws); return rest; });
  await refusedWith('value-not-printed', (ws) => newMeasurement(ws, { 'Raw value': '1.30', 'Raw numeric': '1.30', 'Normalized value': '1300' }));
  await refusedWith('ownership-mismatch', (ws) => newMeasurement(ws, { MaterialID: 'M002' }));
  await refusedWith('missing-as-number', (ws) => newMeasurement(ws, { 'Raw numeric': 'Not published' }));
  await refusedWith('unit-mismatch', (ws) => newMeasurement(ws, { 'Normalized unit': 'furlongs' }));
});

test('addMeasurement notes-id-token and not-canonical: a new Notes cell names no migration, and every cell is canonical text', async () => {
  await refusedWith('notes-id-token', (ws) => newMeasurement(ws, { Notes: 'Added by m501-a-new-migration.' }));
  await refusedWith('not-canonical', (ws) => newMeasurement(ws, { Notes: ' padded ' }));
  await refusedWith('unknown-target', (ws) => newMeasurement(ws, { 'No such column': 'x' }));
});

// ---------------------------------------------------------------- addRecord

const linkRow = (ws) => {
  const material = ws.db.prepare("SELECT materialid AS m FROM materials WHERE materialid NOT IN (SELECT materialid FROM material_links WHERE link = 'h2c-status' AND recordid = 'H2C-WIKI') ORDER BY _ord LIMIT 1").get().m;
  return { MaterialID: material, Link: 'h2c-status', RecordID: 'H2C-WIKI' };
};

test('addRecord: a new row of another table is appended at the end; a table with no source-backed cell needs no evidence; an unkeyed table is addressed by its unique key', async () => {
  const sb = await scratch();
  try {
    const row = linkRow(sb.ws);
    const rows = tableRows(sb.ws, 'material_links');
    const command = cmd(sb.ws, 'addRecord', { target: { table: 'material_links' }, expect: schemaExpect(sb.ws), row });
    assert.equal(sb.ws.apply(command).status, 'applied');
    assert.equal(tableRows(sb.ws, 'material_links'), rows + 1);
    const hit = sb.ws.db.prepare('SELECT _ord FROM material_links WHERE materialid = ? AND link = ? AND recordid = ?').get(row.MaterialID, row.Link, row.RecordID);
    assert.equal(hit._ord, rows + 1);
    assert.equal(sb.ws.drafts()[0].record.recordId, `${row.MaterialID} | h2c-status | H2C-WIKI`);
    // the same key again is the same record: refused as a duplicate key, with the record unchanged
    const again = sb.ws.apply({ ...command, opId: newOpId() });
    assert.equal(again.code, 'duplicate-key');
    assert.equal(tableRows(sb.ws, 'material_links'), rows + 1);
  } finally { sb.cleanup(); }
});

test('addRecord not-for-command: a source enters through the ingest journey, a measurement through addMeasurement', async () => {
  await refusedWith('not-for-command', (ws) => cmd(ws, 'addRecord', { target: { table: 'sources' }, expect: schemaExpect(ws), row: { SourceID: 'X-NEW' } }));
  await refusedWith('not-for-command', (ws) => cmd(ws, 'addRecord', { target: { table: 'measurements' }, expect: schemaExpect(ws), row: { MeasurementID: 'V999999' } }));
});

test('addRecord reference-missing and schema-violation: the database refuses a reference with no parent and a record with no key', async () => {
  await refusedWith('reference-missing', (ws) => cmd(ws, 'addRecord', { target: { table: 'family_members' }, expect: schemaExpect(ws), row: { FamilyMaterialID: 'M999', MemberMaterialID: 'M001' } }));
  await refusedWith('schema-violation', (ws) => cmd(ws, 'addRecord', { target: { table: 'family_members' }, expect: schemaExpect(ws), row: { MemberMaterialID: 'M001' } }));
});

test('addRecord ruling-missing and rule-row-not-alone: a new rule row cites a ruling that exists, and travels alone', async () => {
  await refusedWith('ruling-missing', (ws) => cmd(ws, 'addRecord', { target: { table: 'class_limits' }, expect: schemaExpect(ws), row: { LimitID: 'CL99' } }));
  await refusedWith('ruling-missing', (ws) => cmd(ws, 'addRecord', { target: { table: 'class_limits' }, expect: schemaExpect(ws), rulings: ['R-NO-SUCH'], row: { LimitID: 'CL99' } }));
  const sb = await scratch();
  try {
    // a rule row is pending in the journal (made by hand: an incomplete rule row cannot be applied), so any other new row waits
    sb.ws.db.prepare("INSERT INTO change_log (op_id, change_record_id, status, command_sha256, command_json, record_json, table_name, record_id, kind, applied_at) VALUES (?, ?, 'draft', 'x', '{}', '{}', 'class_limits', 'CL01', 'correctValue', '2026-10-21T00:00:00.000Z')").run(newOpId(), `CR-${newOpId()}`);
    const before = fingerprint(sb.ws);
    const result = sb.ws.apply(cmd(sb.ws, 'addRecord', { target: { table: 'material_links' }, expect: schemaExpect(sb.ws), row: linkRow(sb.ws) }));
    assert.equal(result.code, 'rule-row-not-alone');
    assert.equal(fingerprint(sb.ws), before);
  } finally { sb.cleanup(); }
});

test('addRecord reviewer-missing: a cell that names a reviewer is written only with the reviewer\'s kind beside it (OQ-17 A)', async () => {
  await refusedWith('reviewer-missing', (ws) => {
    const material = ws.db.prepare('SELECT materialid AS m FROM materials WHERE materialid NOT IN (SELECT materialid FROM print_guide_materials) ORDER BY _ord LIMIT 1').get().m;
    return cmd(ws, 'addRecord', { target: { table: 'print_guide_materials' }, expect: schemaExpect(ws), row: { MaterialID: material, PrintGuideID: 'PG016', Reason: 'Same type.', 'Reviewed by': 'An agent, 2026-10-21' } });
  });
});

// ---------------------------------------------------------------- reviewers and tiers (OQ-17 A)

test('reviewedBy: a correction of a "Reviewed by" cell records each reviewer\'s kind, and a human among them makes it Tier 1', async () => {
  const sb = await scratch();
  try {
    const row = sb.ws.db.prepare('SELECT _ord, measurementid AS id FROM impact_test_guesses ORDER BY _ord LIMIT 1').get();
    const current = recordBy(sb.ws, 'impact_test_guesses', 'MeasurementID', row.id).all;
    const base = cmd(sb.ws, 'correctValue', {
      target: { table: 'impact_test_guesses', id: row.id }, expect: { cells: { 'Reviewed by': current['Reviewed by'] } }, set: { 'Reviewed by': 'Reviewed 2026-10-21 by the owner' }, evidence,
    });
    const refused = sb.ws.apply(base);
    assert.equal(refused.code, 'reviewer-missing');
    assert.equal(sb.ws.apply({ ...base, reviewedBy: [{ kind: 'human', name: 'the owner' }] }).status, 'applied');
    const [draft] = sb.ws.drafts();
    assert.deepEqual(draft.record.reviewedBy, [{ kind: 'human', name: 'the owner' }]);
    assert.equal(draft.record.tier, 1, 'a human-review marker makes the change Tier 1');
    assert.deepEqual(draft.command.reviewedBy, [{ kind: 'human', name: 'the owner' }]);
  } finally { sb.cleanup(); }
});

// ---------------------------------------------------------------- retireRecord

const expectStatus = (ws, id) => ({ cells: { Status: recordBy(ws, 'grades', 'GradeID', id).get('Status') } });

test('retireRecord: a grade is retired by its Status alone and stays in the table; nothing is deleted', async () => {
  const sb = await scratch();
  try {
    const rows = tableRows(sb.ws, 'grades');
    const result = sb.ws.apply(cmd(sb.ws, 'retireRecord', { target: { table: 'grades', id: 'G046-01' }, expect: expectStatus(sb.ws, 'G046-01'), retire: { as: 'retired' } }));
    assert.equal(result.status, 'applied', JSON.stringify(result));
    assert.equal(tableRows(sb.ws, 'grades'), rows, 'nothing is deleted');
    assert.equal(recordBy(sb.ws, 'grades', 'GradeID', 'G046-01').get('Status'), 'retired');
    const [draft] = sb.ws.drafts();
    assert.deepEqual(draft.record.before, { Status: 'active' });
    assert.deepEqual(draft.record.after, { Status: 'retired' });
    assert.deepEqual(draft.record.args.retire, { as: 'retired' });
    // the records that still rest on the retired grade are listed, none is moved: the person decides each
    const dependents = draft.record.args.dependents;
    assert.ok(Array.isArray(dependents) && dependents.length > 0, 'the record says what still rests on the grade');
    assert.ok(dependents.every((d) => typeof d.table === 'string' && typeof d.record === 'string' && d.action.length > 20));
    assert.ok(dependents.some((d) => d.table === 'measurements'));
    assert.equal(recordBy(sb.ws, 'measurements', 'GradeID', 'G046-01').get('Data status') !== 'Retired duplicate record', true, 'its measurements are not touched');
  } finally { sb.cleanup(); }
});

test('retireRecord: each table says retired in its own word (a duplicate measurement, a quarantined price, a superseded coverage finding, a superseded source)', async () => {
  const sb = await scratch();
  try {
    const hashOf = (table, column, id) => rowHash(table, recordBy(sb.ws, table, column, id).cells);
    assert.equal(sb.ws.apply(cmd(sb.ws, 'retireRecord', { target: { table: 'measurements', id: 'V000002' }, expect: { rowHash: hashOf('measurements', 'MeasurementID', 'V000002') }, retire: { as: 'retired', successor: 'V000001' } })).status, 'applied');
    assert.equal(recordBy(sb.ws, 'measurements', 'MeasurementID', 'V000002').get('Data status'), 'Retired duplicate record');
    assert.equal(sb.ws.apply(cmd(sb.ws, 'retireRecord', { target: { table: 'prices', id: 'CA0001' }, expect: { rowHash: hashOf('prices', 'PriceID', 'CA0001') }, reason: 'A wrong product page.', retire: { as: 'retired' } })).status, 'applied');
    const price = recordBy(sb.ws, 'prices', 'PriceID', 'CA0001');
    assert.equal(price.get('Quarantined'), 'TRUE');
    assert.equal(price.get('Regular price basis'), 'Quarantined: A wrong product page.', 'the reason is written where the old rule put it');
    assert.equal(sb.ws.apply(cmd(sb.ws, 'retireRecord', { target: { table: 'coverage', id: 'C00002' }, expect: { rowHash: hashOf('coverage', 'CoverageID', 'C00002') }, retire: { as: 'superseded', successor: 'C00045' } })).status, 'applied');
    const finding = recordBy(sb.ws, 'coverage', 'CoverageID', 'C00002');
    assert.equal(finding.get('Status'), 'Superseded');
    assert.match(finding.get('Finding'), /^Superseded by C00045: /, 'the finding starts as AGENTS.md says');
    assert.equal(sb.ws.drafts().length, 3);
    assert.deepEqual(Object.keys(RETIREMENT_COLUMNS).sort(), ['coverage', 'evidence', 'grades', 'measurements', 'prices', 'profiles', 'sources']);
  } finally { sb.cleanup(); }
});

test('retireRecord not-for-command: a table with no retirement convention, and a word the table does not have', async () => {
  const r1 = await refusedWith('not-for-command', (ws) => cmd(ws, 'retireRecord', { target: { table: 'materials', id: 'M001' }, expect: { rowHash: 'a'.repeat(64) }, retire: { as: 'retired' } }));
  assert.match(r1.detail, /Nothing is deleted/);
  await refusedWith('not-for-command', (ws) => cmd(ws, 'retireRecord', { target: { table: 'grades', id: 'G046-01' }, expect: expectStatus(ws, 'G046-01'), retire: { as: 'superseded', successor: 'G046-02' } }));
});

test('retireRecord successor-invalid: a superseded record names the one that replaces it, and it exists, is another record and is not retired itself', async () => {
  const coverage = (ws, successor) => cmd(ws, 'retireRecord', {
    target: { table: 'coverage', id: 'C00002' }, expect: { rowHash: rowHash('coverage', recordBy(ws, 'coverage', 'CoverageID', 'C00002').cells) },
    retire: successor === undefined ? { as: 'superseded' } : { as: 'superseded', successor },
  });
  await refusedWith('successor-invalid', (ws) => coverage(ws, undefined));
  await refusedWith('successor-invalid', (ws) => coverage(ws, 'C00002'));
  await refusedWith('successor-invalid', (ws) => coverage(ws, 'C99999'));
  // a duplicate measurement names the twin that stays (AGENTS.md "Retire a duplicate record")
  await refusedWith('successor-invalid', (ws) => cmd(ws, 'retireRecord', { target: { table: 'measurements', id: 'V000002' }, expect: { rowHash: rowHash('measurements', recordBy(ws, 'measurements', 'MeasurementID', 'V000002').cells) }, retire: { as: 'retired' } }));
  // a successor that is itself superseded
  await refusedWith('successor-invalid', (ws) => coverage(ws, ws.db.prepare("SELECT coverageid AS id FROM coverage WHERE status = 'Superseded' ORDER BY _ord LIMIT 1").get().id));
});

test('retireRecord no-change and stale: a record already retired is not retired again; a status that moved is refused with the status found', async () => {
  const sb = await scratch();
  try {
    const first = cmd(sb.ws, 'retireRecord', { target: { table: 'grades', id: 'G046-01' }, expect: expectStatus(sb.ws, 'G046-01'), retire: { as: 'retired' } });
    assert.equal(sb.ws.apply(first).status, 'applied');
    const again = sb.ws.apply(cmd(sb.ws, 'retireRecord', { target: { table: 'grades', id: 'G046-01' }, expect: { cells: { Status: 'retired' } }, retire: { as: 'retired' } }));
    assert.equal(again.code, 'no-change');
    const stale = sb.ws.apply(cmd(sb.ws, 'retireRecord', { target: { table: 'grades', id: 'G046-01' }, expect: { cells: { Status: 'active' } }, retire: { as: 'retired' } }));
    assert.equal(stale.code, 'stale');
    assert.equal(stale.current.cells.Status, 'retired');
    assert.equal(sb.ws.apply(cmd(sb.ws, 'retireRecord', { target: { table: 'grades', id: 'G046-01' }, expect: {}, retire: { as: 'retired' } })).code, 'expectation-empty');
    assert.equal(sb.ws.apply(cmd(sb.ws, 'retireRecord', { target: { table: 'grades', id: 'G046-01' }, expect: { schemaDigest: schemaExpect(sb.ws).schemaDigest }, retire: { as: 'retired' } })).code, 'expectation-partial');
  } finally { sb.cleanup(); }
});

// ---------------------------------------------------------------- moveGrade

test('moveGrade: a product changes material with every record filed under it, every ID stays, and the re-pointed citation is in the D72 ledger', async () => {
  const sb = await scratch();
  try {
    const before = {
      profiles: ['P0262', 'P1809'], measurements: ['V003326', 'V003327', 'V003328', 'V011859', 'V011860'],
    };
    const rows = Object.fromEntries(['grades', 'measurements', 'profiles', 'material_links'].map((t) => [t, tableRows(sb.ws, t)]));
    const command = cmd(sb.ws, 'moveGrade', { target: { table: 'grades', id: 'G126-01' }, expect: { cells: { MaterialID: 'M126' } }, expectMaterial: 'M126', moveTo: 'M001' });
    const result = sb.ws.apply(command);
    assert.equal(result.status, 'applied', JSON.stringify(result));
    assert.deepEqual(Object.fromEntries(Object.keys(rows).map((t) => [t, tableRows(sb.ws, t)])), rows, 'no row appears or goes');
    assert.equal(recordBy(sb.ws, 'grades', 'GradeID', 'G126-01').get('MaterialID'), 'M001');
    for (const id of before.profiles) assert.equal(recordBy(sb.ws, 'profiles', 'ProfileID', id).get('MaterialID'), 'M001', id);
    for (const id of before.measurements) assert.equal(recordBy(sb.ws, 'measurements', 'MeasurementID', id).get('MaterialID'), 'M001', id);
    const link = sb.ws.db.prepare("SELECT materialid FROM material_links WHERE recordid = 'P0262' AND link = 'printing'").get();
    assert.equal(link.materialid, 'M001', 'the printing citation of a profile that moves goes with it');
    const [draft] = sb.ws.drafts();
    assert.deepEqual(draft.record.before, { MaterialID: 'M126' });
    assert.deepEqual(draft.record.after, { MaterialID: 'M001' });
    assert.equal(draft.record.alsoChanged.length, 2 + 5 + 1, 'two profiles, five measurements and one link');
    assert.deepEqual(draft.record.ledger, [{ Table: 'material_links', Record: 'M126 | printing | P0262', Where: 're-pointed: the same row is now M001 | printing | P0262' }]);
    assert.equal(draft.record.args.expectMaterial, 'M126');
  } finally { sb.cleanup(); }
});

test('moveGrade stale: expectMaterial stops a concurrent move, and says where the grade is now', async () => {
  const sb = await scratch();
  try {
    const first = cmd(sb.ws, 'moveGrade', { target: { table: 'grades', id: 'G126-01' }, expect: { cells: { MaterialID: 'M126' } }, expectMaterial: 'M126', moveTo: 'M001' });
    assert.equal(sb.ws.apply(first).status, 'applied');
    const before = fingerprint(sb.ws);
    const second = sb.ws.apply(cmd(sb.ws, 'moveGrade', { target: { table: 'grades', id: 'G126-01' }, expect: { rowHash: rowHash('grades', recordBy(sb.ws, 'grades', 'GradeID', 'G126-01').cells) }, expectMaterial: 'M126', moveTo: 'M002' }));
    assert.equal(second.code, 'stale');
    assert.equal(second.current.cells.MaterialID, 'M001');
    assert.match(second.detail, /moved since/);
    assert.equal(fingerprint(sb.ws), before);
  } finally { sb.cleanup(); }
});

test('moveGrade reference-missing, no-change, not-for-command, expectation-empty: the destination exists, differs, and the command is about a grade', async () => {
  const move = (ws, over = {}) => cmd(ws, 'moveGrade', { target: { table: 'grades', id: 'G126-01' }, expect: { cells: { MaterialID: 'M126' } }, expectMaterial: 'M126', moveTo: 'M001', ...over });
  await refusedWith('reference-missing', (ws) => move(ws, { moveTo: 'M999' }));
  await refusedWith('no-change', (ws) => move(ws, { moveTo: 'M126' }));
  await refusedWith('not-for-command', (ws) => move(ws, { target: { table: 'materials', id: 'M126' } }));
  await refusedWith('expectation-empty', (ws) => move(ws, { expectMaterial: '' }));
  await refusedWith('unknown-target', (ws) => move(ws, { moveTo: '' }));
});

test('moveGrade not-for-command: a pinned headline value that rests on the grade\'s measurements stops the move, because the pin names the material it is for', async () => {
  const sb = await scratch();
  try {
    // the data holds no pin today (m137 retired them), so one is made in the sandbox: G126-01's measurement V003326 pinned for M126
    const key = sb.ws.db.prepare('SELECT headlinekey AS k FROM headline_definitions ORDER BY _ord LIMIT 1').get().k;
    const storage = storageOf('headlines');
    sb.ws.db.prepare(storage.insertSql).run(...storage.encode(1, ['M126', key, 'V003326', 'A pin for the test.']));
    const pin = { grade: 'G126-01', material: 'M126' };
    const other = 'M001';
    const before = fingerprint(sb.ws);
    const result = sb.ws.apply(cmd(sb.ws, 'moveGrade', { target: { table: 'grades', id: pin.grade }, expect: { cells: { MaterialID: pin.material } }, expectMaterial: pin.material, moveTo: other }));
    assert.equal(result.code, 'not-for-command');
    assert.match(result.detail, /pinned headline/);
    assert.equal(fingerprint(sb.ws), before);
  } finally { sb.cleanup(); }
});

test('moveGrade ownership-mismatch: a record on the grade that is filed under another material is not moved by guesswork (D36)', async () => {
  const sb = await scratch();
  try {
    sb.ws.db.prepare("UPDATE measurements SET materialid = 'M002' WHERE measurementid = 'V003326'").run();
    const before = fingerprint(sb.ws);
    const result = sb.ws.apply(cmd(sb.ws, 'moveGrade', { target: { table: 'grades', id: 'G126-01' }, expect: { cells: { MaterialID: 'M126' } }, expectMaterial: 'M126', moveTo: 'M001' }));
    assert.equal(result.code, 'ownership-mismatch');
    assert.match(result.detail, /V003326/);
    assert.equal(fingerprint(sb.ws), before, 'nothing of the grade moved');
  } finally { sb.cleanup(); }
});

// ---------------------------------------------------------------- reviseProfile

const PROFILE_SHA = 'e71fac75b41e1f756b2827213885bd9f5d606a23b124cdb39f2035d04e049972';
const PROFILE_SOURCE = 'S-POLYCN-PolySonic-PLA-EN-V5-3-TDS';
const PROFILE_QUOTE = 'Recommended nozzle temperature 195-215 °C';
const profileStore = storeOf({ [PROFILE_SHA]: [`Printing. ${PROFILE_QUOTE}. Bed 50 °C.`] });
const profileEvidence = { sourceId: PROFILE_SOURCE, sha256: PROFILE_SHA, page: 1, locator: 'p. 1: printing', quote: PROFILE_QUOTE };
const NOZZLE = { 'Nozzle °C': 'Classic :190-210 °C', 'Nozzle state': 'range', 'Nozzle min °C': '190', 'Nozzle max °C': '210', 'Nozzle requirement': 'required' };
const NOZZLE_NEW = { 'Nozzle °C': 'Recommended nozzle temperature 195-215 °C', 'Nozzle state': 'range', 'Nozzle min °C': '195', 'Nozzle max °C': '215', 'Nozzle requirement': 'required' };
const revise = (ws, over = {}) => cmd(ws, 'reviseProfile', { target: { table: 'profiles', id: 'P0002' }, expect: { cells: NOZZLE }, set: NOZZLE_NEW, evidence: profileEvidence, ...over });

test('reviseProfile: the raw nozzle cell and the typed cells read from it change together, with the evidence of the page', async () => {
  const sb = await scratch({ store: profileStore });
  try {
    assert.equal(sb.ws.apply(revise(sb.ws)).status, 'applied');
    const profile = recordBy(sb.ws, 'profiles', 'ProfileID', 'P0002');
    assert.equal(profile.get('Nozzle min °C'), '195');
    assert.equal(profile.get('Nozzle max °C'), '215');
    const [draft] = sb.ws.drafts();
    assert.equal(draft.record.kind, 'reviseProfile');
    assert.equal(draft.record.quoteCheck.status, 'verified');
    assert.deepEqual(draft.record.before, NOZZLE);
  } finally { sb.cleanup(); }
});

test('reviseProfile cells-not-together: the raw cell without the typed cells read from it is refused unless "apart" says why', async () => {
  const set = { 'Nozzle °C': NOZZLE_NEW['Nozzle °C'] };
  await refusedWith('cells-not-together', (ws) => revise(ws, { set, expect: { cells: { 'Nozzle °C': NOZZLE['Nozzle °C'] } } }), { store: profileStore });
  const sb = await scratch({ store: profileStore });
  try {
    assert.equal(sb.ws.apply(revise(sb.ws, { set, expect: { cells: { 'Nozzle °C': NOZZLE['Nozzle °C'] } }, apart: 'Only the printed wording was misread; the typed range is right.' })).status, 'applied');
    assert.equal(sb.ws.drafts()[0].record.cellsApart, 'Only the printed wording was misread; the typed range is right.');
  } finally { sb.cleanup(); }
});

test('reviseProfile evidence-missing, value-not-printed, not-for-command, delete-refused: the guards of a profile write', async () => {
  await refusedWith('evidence-missing', (ws) => { const { evidence: _e, ...rest } = revise(ws); return rest; }, { store: profileStore });
  await refusedWith('value-not-printed', (ws) => revise(ws, { set: { ...NOZZLE_NEW, 'Nozzle max °C': '260' } }), { store: profileStore });
  await refusedWith('not-for-command', (ws) => revise(ws, { target: { table: 'grades', id: 'G001-01' }, set: { Status: 'retired' } }), { store: profileStore });
  await refusedWith('delete-refused', (ws) => revise(ws, { set: { ProfileID: 'P9998' }, expect: { cells: { ProfileID: 'P0002' } } }), { store: profileStore });
});

// ---------------------------------------------------------------- reclassifyProduct

const reclassify = (ws, id, set, expect, over = {}) => cmd(ws, 'reclassifyProduct', { target: { table: 'grades', id }, expect: { cells: expect }, set, ...over });

test('reclassifyProduct: a classification cell that is not a decision-reading column changes without evidence; the record says it was a reclassification', async () => {
  const sb = await scratch();
  try {
    const result = sb.ws.apply(reclassify(sb.ws, 'G002-01', { Variant: 'declared dense filler' }, { Variant: 'Not applicable' }));
    assert.equal(result.status, 'applied', JSON.stringify(result));
    assert.equal(recordBy(sb.ws, 'grades', 'GradeID', 'G002-01').get('Variant'), 'declared dense filler');
    assert.equal(sb.ws.drafts()[0].record.kind, 'reclassifyProduct');
    assert.equal(sb.ws.drafts()[0].record.evidence, undefined);
  } finally { sb.cleanup(); }
});

test('reclassifyProduct role-id-mismatch, evidence-missing, not-for-command: the Role agrees with the ID, a canonical cell carries evidence, and only classification cells change', async () => {
  await refusedWith('role-id-mismatch', (ws) => reclassify(ws, 'G002-01', { Role: 'study' }, { Role: 'procurement' }, { evidence }));
  await refusedWith('role-id-mismatch', (ws) => reclassify(ws, 'G031-R1', { Role: 'procurement' }, { Role: 'study' }, { evidence }));
  await refusedWith('evidence-missing', (ws) => reclassify(ws, 'G031-R1', { Role: 'reference' }, { Role: 'study' }));
  await refusedWith('not-for-command', (ws) => reclassify(ws, 'G002-01', { Manufacturer: 'Somebody else' }, { Manufacturer: 'Polymaker' }));
  await refusedWith('not-for-command', (ws) => ({ ...reclassify(ws, 'G002-01', { Variant: 'declared dense filler' }, { Variant: 'Not applicable' }), target: { table: 'materials', id: 'M001' } }));
});

// ---------------------------------------------------------------- the proposal commands wait for WP-28

test('unsupported-kind: acceptProposal, rejectProposal and holdProposal are refused until WP-28', async () => {
  for (const kind of ['acceptProposal', 'rejectProposal', 'holdProposal']) {
    const result = await refusedWith('unsupported-kind', (ws) => cmd(ws, kind, { target: { table: 'grades', id: 'G002-01' }, expect: { cells: { Status: 'active' } } }));
    assert.match(result.detail, /WP-28/);
  }
});

// ---------------------------------------------------------------- idempotency and the journal for every kind (DP-9)

test('a retried opId is a duplicate for every kind: no second edit and no second change record', async () => {
  const sb = await scratch();
  try {
    const commands = [
      newMeasurement(sb.ws),
      cmd(sb.ws, 'addRecord', { target: { table: 'material_links' }, expect: schemaExpect(sb.ws), row: linkRow(sb.ws) }),
      cmd(sb.ws, 'retireRecord', { target: { table: 'grades', id: 'G046-01' }, expect: expectStatus(sb.ws, 'G046-01'), retire: { as: 'retired' } }),
      cmd(sb.ws, 'moveGrade', { target: { table: 'grades', id: 'G126-01' }, expect: { cells: { MaterialID: 'M126' } }, expectMaterial: 'M126', moveTo: 'M001' }),
    ];
    for (const command of commands) assert.equal(sb.ws.apply(command).status, 'applied', command.kind);
    const state = fingerprint(sb.ws);
    for (const command of commands) assert.equal(sb.ws.apply(command).status, 'duplicate', command.kind);
    assert.equal(fingerprint(sb.ws), state);
    assert.equal(journalSize(sb.ws), commands.length);
    // the records read back from the journal as the commands that made them
    const journal = sb.ws.journal();
    assert.deepEqual(journal.map((e) => e.record.kind), commands.map((c) => c.kind));
    assert.equal(createHash('sha256').update(JSON.stringify(journal.map((e) => e.command.opId))).digest('hex'), createHash('sha256').update(JSON.stringify(commands.map((c) => c.opId))).digest('hex'));
  } finally { sb.cleanup(); }
});

test('the other kinds replay: a draft of every kind survives the workspace being rebuilt on the same base (drafts:export and drafts:import)', async () => {
  const sb = await scratch();
  try {
    const commands = [
      newMeasurement(sb.ws),
      cmd(sb.ws, 'retireRecord', { target: { table: 'grades', id: 'G046-01' }, expect: expectStatus(sb.ws, 'G046-01'), retire: { as: 'retired' } }),
      cmd(sb.ws, 'moveGrade', { target: { table: 'grades', id: 'G126-01' }, expect: { cells: { MaterialID: 'M126' } }, expectMaterial: 'M126', moveTo: 'M001' }),
    ];
    for (const command of commands) assert.equal(sb.ws.apply(command).status, 'applied');
    const state = fingerprint(sb.ws);
    sb.ws.close();
    const rebuilt = await (await import('../../packages/data/src/workspace.ts')).Workspace.rebuild(sb.options);
    assert.equal(rebuilt.conflicts.length, 0);
    assert.equal(rebuilt.applied, 3);
    const reopened = await sb.open();
    assert.equal(fingerprint(reopened), state, 'the same cells after a rebuild and a replay of the journal');
    reopened.close();
  } finally { sb.cleanup(); }
});
