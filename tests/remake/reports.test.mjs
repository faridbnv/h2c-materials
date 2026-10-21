// WP-17 (proof DP-18): the two read-only measurements. The reviewer-kind report classifies today's free-text "Reviewed by" cells (OQ-17 A); the
// change-set coverage measurement expresses main's recent migration commits as commands and reports what does not fit (04 section 11). Both read
// the repository and write one file each. The legacy mode the coverage replay uses is shown to turn off exactly the judgement guards, and to be
// unreachable from the workspace.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { KINDS, classOf, diffTable, diffVocabulary, measureCoverage } from '../../packages/data/src/coverage.ts';
import { csvText } from '../../packages/data/src/csv.ts';
import { snapshotDigestOf, tableDigests, newOpId } from '../../packages/data/src/digest.ts';
import { buildInMemory } from '../../packages/data/src/rebuild.ts';
import { classifyReviewer, renderReviewerKindReport, reviewerKindReport } from '../../packages/data/src/reviewer-kinds.ts';
import { applyCommand, applyLegacyCommand, initWorkspaceTables } from '../../packages/data/src/write.ts';
import { readRow, storageOf } from '../../packages/data/src/storage.ts';
import { editRecords, realData, root } from './data-helpers.mjs';
import { ACTOR, cmd, dropTemplate, fingerprint, scratch } from './write-helpers.mjs';

after(dropTemplate);

// ---------------------------------------------------------------- the reviewer-kind report

test('classifyReviewer: a cell names an agent, a person, both, neither or nothing; a ruling of the owner and a denial of human review are not reviewers', () => {
  const cases = [
    ['Claude Opus 5.5, 2026-10-06, on the cached sheets (m391)', 'agent'],
    ['claude-opus-5.5 (agent reviewer), 2026-09-27', 'agent'],
    ['Read 2026-10-05 by Claude Sonnet readers on the page image', 'agent'],
    ['Codex research agents (AI), research package of 2026-09-26', 'agent'],
    ['Claude Opus (agent), research intake review, 2026-10-19; switched to deciding as the owner ruled on 2026-10-19', 'agent'],
    ['m255: Codex AI injector and independent AI /root/coverage_reviewer; all original source pages reread, no human review', 'agent'],
    ['Reviewed 2026-10-21 by the owner', 'human'],
    ['Checked by hand by a person', 'human'],
    ['Claude Sonnet read it; the owner checked it', 'both'],
    ['2026-10-21', 'unclear'],
    ['Not published', 'not-stated'],
    ['Not applicable', 'not-stated'],
    [null, 'not-stated'],
    ['', 'not-stated'],
  ];
  for (const [text, kind] of cases) assert.equal(classifyReviewer(text), kind, JSON.stringify(text));
});

test('the reviewer-kind report counts every reviewer cell of the data, reads nothing it does not count, and the committed file is the current one', () => {
  const report = reviewerKindReport(realData);
  assert.equal(report.rows, 3005);
  assert.equal(Object.values(report.totals).reduce((a, b) => a + b, 0), report.rows, 'every cell is read as exactly one kind');
  for (const column of report.columns) assert.equal(Object.values(column.counts).reduce((a, b) => a + b, 0), column.rows, `${column.table}.${column.column}`);
  assert.deepEqual(report.columns.map((c) => `${c.table}.${c.column}`), [
    'chamber_need.Reviewed by', 'impact_test_guesses.Reviewed by', 'know_how_reads.Read by', 'material_summaries.Written by', 'page_context.Reviewed by',
    'print_guide_materials.Reviewed by', 'product_claims.Reviewed by',
  ]);
  const text = renderReviewerKindReport(report);
  assert.equal(readFileSync(join(root, 'docs/next/reviewer-kind-report.md'), 'utf8'), text, 'docs/next/reviewer-kind-report.md is the current report: run npm run report:reviewers');
  assert.match(text, /A claim, not a proof/);
  assert.match(text, /Read only/);
  // read only: the command writes the report file and nothing under data/
  const run = spawnSync(process.execPath, ['packages/data/src/cli.ts', 'reviewers', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const stale = mkdtempSync(join(tmpdir(), 'atlas-reviewers-'));
  try {
    writeFileSync(join(stale, 'report.md'), 'old');
    const bad = spawnSync(process.execPath, ['packages/data/src/cli.ts', 'reviewers', '--check', '--out', join(stale, 'report.md')], { cwd: root, encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /stale/);
  } finally { rmSync(stale, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- the diff of one table: what each change is, and whether a command makes it

const HEADER = ['Section', 'Topic', 'Definition / rule'];
const rows = (...r) => csvText(HEADER, r);
const A = ['Scope', 'Alpha', 'a'];
const B = ['Scope', 'Beta', 'b'];
const C = ['Scope', 'Gamma', 'c'];
const D = ['Scope', 'Delta', 'd'];
const kinds = (diff) => diff.units.map((u) => `${u.kind}:${u.count}`).sort();

test('diffTable: a cell edit and an append are expressed; the ops carry what a command needs', () => {
  const diff = diffTable('method', rows(A, B), rows(A, ['Scope', 'Beta', 'b2'], C));
  assert.deepEqual(kinds(diff), ['append-rows:1', 'edit-cells:1']);
  assert.deepEqual(diff.ops, [
    { type: 'append', table: 'method', row: { Section: 'Scope', Topic: 'Gamma', 'Definition / rule': 'c' } },
    { type: 'edit', table: 'method', id: 'Beta', expect: { 'Definition / rule': 'b' }, set: { 'Definition / rule': 'b2' } },
  ]);
  assert.ok(diff.units.every((u) => KINDS[u.kind].status === 'expressed'));
});

test('diffTable residue: a row removed, a row inserted between rows, rows reordered, a table created or dropped, rows with no key, a file that is not CSV', () => {
  assert.deepEqual(kinds(diffTable('method', rows(A, B, C), rows(A, C))), ['remove-rows:1']);
  assert.deepEqual(kinds(diffTable('method', rows(A, C), rows(A, B, C))), ['insert-mid-table:1']);
  assert.deepEqual(kinds(diffTable('method', rows(A, B, C), rows(C, A, B))), ['reorder-rows:3']);
  assert.deepEqual(kinds(diffTable('method', null, rows(A))), ['create-table:1']);
  assert.deepEqual(kinds(diffTable('method', rows(A), null)), ['drop-table:1']);
  assert.deepEqual(kinds(diffTable('method', rows(A, B), 'Section,Topic\n"unclosed')), ['unreadable-table:1']);
  assert.deepEqual(kinds(diffTable('no_such_table', 'X,Y\n1,2\n', 'X,Y\n1,3\n')), ['ambiguous-rows:1']);
  for (const kind of ['remove-rows', 'insert-mid-table', 'reorder-rows', 'create-table', 'drop-table', 'unreadable-table', 'ambiguous-rows']) assert.equal(KINDS[kind].status, 'residue', kind);
});

test('diffTable columns: a column added, dropped or moved is a schema change a command makes; a value that is not the common one is a cell edit', () => {
  const wide = csvText([...HEADER, 'Checked on'], [[...A, 'Not published'], [...B, 'Not published'], [...C, '2026-10-21']]);
  assert.deepEqual(kinds(diffTable('method', rows(A, B, C), wide)), ['add-column:1', 'edit-cells:1']);
  assert.deepEqual(kinds(diffTable('method', wide, rows(A, B, C))), ['drop-column:1']);
  const moved = csvText(['Topic', 'Section', 'Definition / rule'], [['Alpha', 'Scope', 'a'], ['Beta', 'Scope', 'b']]);
  assert.deepEqual(kinds(diffTable('method', rows(A, B), moved)), ['reorder-columns:1']);
  assert.equal(diffTable('method', rows(A), rows(A)).units.length, 0, 'no change is no unit');
  assert.ok(['add-column', 'drop-column', 'reorder-columns'].every((k) => KINDS[k].status === 'expressed'));
});

test('diffVocabulary: a word added anywhere is addVocab; a word removed, changed or moved is not', () => {
  const v = (...words) => csvText(['Value', 'Meaning'], words.map((w) => [w, `${w} means`]));
  assert.deepEqual(diffVocabulary('x', v('a', 'b'), v('a', 'b', 'c')).map((u) => `${u.kind}:${u.count}`), ['vocab-add:1']);
  assert.deepEqual(diffVocabulary('x', v('a', 'c'), v('a', 'b', 'c')).map((u) => `${u.kind}:${u.count}`), ['vocab-add:1'], 'in the middle of an ordered vocabulary too (addVocab has "after")');
  assert.deepEqual(diffVocabulary('x', v('a', 'b'), v('a')).map((u) => u.kind), ['vocab-change']);
  assert.deepEqual(diffVocabulary('x', v('a', 'b'), v('b', 'a')).map((u) => u.kind), ['vocab-change']);
  assert.deepEqual(diffVocabulary('x', v('a', 'b'), csvText(['Value', 'Meaning'], [['a', 'a means'], ['b', 'now means more']])).map((u) => u.kind), ['vocab-change']);
  assert.deepEqual(diffVocabulary('x', null, v('a')).map((u) => u.kind), ['vocab-new-file']);
  assert.equal(diffVocabulary('x', v('a'), v('a')).length, 0);
});

test('classOf: the pack\'s classes, guessed from what a commit changed', () => {
  const u = (kind, table, count = 1) => ({ kind, table, count, detail: '' });
  assert.equal(classOf([u('add-column', 'grades'), u('edit-cells', 'grades', 400)]), '2 Schema or model change plus backfill');
  assert.equal(classOf([u('append-rows', 'measurements', 80)]), '1 Bulk import or pipeline batch');
  assert.equal(classOf([u('edit-cells', 'measurements', 3)]), '3 Correction of observational data');
  assert.equal(classOf([u('edit-cells', 'grades', 3)]), '4 Reference, identity, classification');
  assert.equal(classOf([u('edit-cells', 'grades'), u('edit-cells', 'measurements')]), '5 Mixed or editorial');
  assert.equal(classOf([]), '6 Unclassified');
});

// ---------------------------------------------------------------- legacy mode: the judgement guards off, the structural guards on, unreachable from the workspace

/** A rebuilt snapshot in memory, with the workspace tables, and a context to run commands in. */
function memoryContext() {
  const { db } = buildInMemory(realData);
  initWorkspaceTables(db, snapshotDigestOf(tableDigests(db).digests));
  const stamp = db.prepare("SELECT value FROM _meta WHERE key = 'snapshot_digest'").get().value;
  const schema = db.prepare("SELECT value FROM _meta WHERE key = 'schema_sha256'").get().value;
  return { db, ctx: { db, store: null, rulings: new Set(['R-OQ09a']), mergedOps: new Map(), now: () => new Date(0) }, base: { snapshotDigest: stamp, commit: 'test' }, schema };
}

test('legacy mode turns off the judgement guards for the same command that normal mode refuses, and keeps the structural ones', () => {
  const { db, ctx, base, schema } = memoryContext();
  try {
    const legacyEvidence = { sourceId: 'LEGACY-REPLAY', sha256: '0'.repeat(64), page: 1, locator: 'legacy replay', quote: 'legacy replay' };
    const common = () => ({ opId: newOpId(), reason: 'A legacy replay.', actor: ACTOR, base });
    const both = (name, command, normalCode) => {
      const normal = applyCommand(ctx, { ...command, opId: newOpId() }, { rebase: true });
      assert.equal(normal.status, 'refused', `${name}: normal mode refuses`);
      assert.equal(normal.code, normalCode, `${name}: ${normal.detail}`);
      const legacy = applyLegacyCommand(ctx, { ...command, opId: newOpId() }, { rebase: true });
      assert.equal(legacy.status, 'applied', `${name}: legacy mode applies it (${JSON.stringify(legacy)})`);
    };
    // the evidence guards: a source the database does not list, and a Notes cell that names a migration
    both('evidence', { ...common(), kind: 'correctValue', target: { table: 'measurements', id: 'V000001' }, expect: { cells: { 'Data status': 'Published value' } }, set: { 'Data status': 'Published value (transcription corrected)' }, evidence: legacyEvidence }, 'source-not-retrieved');
    const notes = db.prepare('SELECT notes AS n FROM measurements WHERE measurementid = ?').get('V000002').n;
    both('notes', { ...common(), kind: 'correctValue', target: { table: 'measurements', id: 'V000002' }, expect: { cells: { Notes: notes } }, set: { Notes: `${notes} Corrected by m501-a-new-migration.` }, evidence: legacyEvidence }, 'notes-id-token');
    // a reviewer cell without the reviewer's kind
    const guess = db.prepare('SELECT measurementid AS id, reviewed_by AS r FROM impact_test_guesses ORDER BY _ord LIMIT 1').get();
    both('reviewer', { ...common(), kind: 'correctValue', target: { table: 'impact_test_guesses', id: guess.id }, expect: { cells: { 'Reviewed by': guess.r } }, set: { 'Reviewed by': 'Somebody, 2026-10-21' }, evidence: legacyEvidence }, 'reviewer-missing');
    // the natural key of a new measurement
    const header = storageOf('measurements').header;
    const original = readRow(db, 'measurements', db.prepare('SELECT _ord FROM measurements WHERE measurementid = ?').get('V000003')._ord);
    const twin = { ...Object.fromEntries(header.map((name, k) => [name, original[k]])), MeasurementID: 'V990001' };
    both('natural key', { ...common(), kind: 'addMeasurement', target: { table: 'measurements' }, expect: { schemaDigest: schema }, row: twin, evidence: legacyEvidence }, 'duplicate-key');
    // a rule row with no ruling (last: once a rule row is pending, every other write waits)
    both('rule row', { ...common(), kind: 'correctValue', target: { table: 'class_limits', id: 'CL01' }, expect: { cells: { 'Reason words': db.prepare('SELECT reason_words AS r FROM class_limits WHERE limitid = ?').get('CL01').r } }, set: { 'Reason words': 'Reworded.' }, evidence: legacyEvidence }, 'ruling-missing');
    // the structural guards still fire in legacy mode: a moved expectation, a reference with no parent, a column that is not there
    const stale = applyLegacyCommand(ctx, { ...common(), kind: 'correctValue', target: { table: 'measurements', id: 'V000004' }, expect: { cells: { Notes: 'Not what it holds' } }, set: { Notes: 'x' }, evidence: legacyEvidence }, { rebase: true });
    assert.equal(stale.code, 'stale');
    const dangling = applyLegacyCommand(ctx, { ...common(), kind: 'addRecord', target: { table: 'family_members' }, expect: { schemaDigest: schema }, row: { FamilyMaterialID: 'M999', MemberMaterialID: 'M001' } }, { rebase: true });
    assert.equal(dangling.code, 'reference-missing');
    const unknown = applyLegacyCommand(ctx, { ...common(), kind: 'correctValue', target: { table: 'measurements', id: 'V000004' }, expect: { cells: { 'No such': null } }, set: { 'No such': 'x' }, evidence: legacyEvidence }, { rebase: true });
    assert.equal(unknown.code, 'unknown-target');
  } finally { db.close(); }
});

test('legacy mode cannot be asked for through the workspace: a command with bad evidence is still refused whatever the options say', async () => {
  const sb = await scratch();
  try {
    const bad = cmd(sb.ws, 'correctValue', {
      target: { table: 'measurements', id: 'V000001' }, expect: { cells: { 'Data status': 'Published value' } }, set: { 'Data status': 'Published value (transcription corrected)' },
      evidence: { sourceId: 'LEGACY-REPLAY', sha256: '0'.repeat(64), page: 1, locator: 'x', quote: 'x' },
    });
    const before = fingerprint(sb.ws);
    const result = sb.ws.apply(bad, { legacy: true });
    assert.equal(result.code, 'source-not-retrieved');
    assert.equal(fingerprint(sb.ws), before);
  } finally { sb.cleanup(); }
});

// ---------------------------------------------------------------- the measurement over a history

const git = (dir, ...args) => execFileSync('git', ['-c', 'user.name=coverage-test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: dir, encoding: 'utf8' });

/** A small repository whose history is made to show each kind of change; the first commit is the real snapshot. */
function historyRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-coverage-repo-'));
  git(dir, 'init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'data'), { recursive: true });
  cpSync(join(realData, 'tables'), join(dir, 'data', 'tables'), { recursive: true });
  cpSync(join(realData, 'manifest.json'), join(dir, 'data', 'manifest.json'));
  cpSync(join(root, 'schema'), join(dir, 'schema'), { recursive: true });
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'the snapshot');
  const first = git(dir, 'rev-parse', 'HEAD').trim();
  const data = join(dir, 'data');
  // 2: a cell edit in measurements and a new row at the end of method: both expressed
  editRecords(data, 'measurements', (rowsOf, header) => { rowsOf[0][header.indexOf('Data status')] = 'Published value (transcription corrected)'; });
  editRecords(data, 'method', (rowsOf, header) => { rowsOf.push(header.map((name) => (name === 'Topic' ? 'A new topic' : name === 'Section' ? rowsOf[0][0] : 'A new rule.'))); });
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'm900-an-edit-and-an-append');
  // 3: a row removed from method, and a word added to a vocabulary: the removal is residue, the word is expressed
  editRecords(data, 'method', (rowsOf) => { rowsOf.splice(1, 1); });
  const vocab = join(dir, 'schema', 'vocab', 'coverage-status.csv');
  writeFileSync(vocab, `${readFileSync(vocab, 'utf8')}Under review,A finding someone is checking now.\n`);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'm901-a-removal');
  // 4: a row inserted between rows of method: residue
  editRecords(data, 'method', (rowsOf, header) => { rowsOf.splice(1, 0, header.map((name) => (name === 'Topic' ? 'Inserted' : name === 'Section' ? rowsOf[0][0] : 'x'))); });
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'm902-an-insert');
  return { dir, first, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('measureCoverage: each commit of a history is split into changes, classified, and the fully expressed ones are replayed through the service byte for byte', () => {
  const repo = historyRepo();
  try {
    const report = measureCoverage({ repo: repo.dir, ref: 'main', range: `${repo.first}..main` });
    assert.equal(report.status, 'measured');
    assert.equal(report.window.commits, 3);
    const [edit, removal, insert] = report.perCommit;
    assert.equal(edit.status, 'all-expressed');
    assert.deepEqual(edit.units.map((u) => `${u.kind}:${u.table}:${u.count}`).sort(), ['append-rows:method:1', 'edit-cells:measurements:1']);
    assert.deepEqual(edit.migrations, [], 'a commit that adds no migration script names none');
    assert.equal(edit.replay.status, 'identical', edit.replay.detail);
    assert.match(edit.replay.detail, /2 command\(s\)/);
    assert.equal(removal.status, 'has-residue');
    assert.deepEqual(removal.units.map((u) => u.kind).sort(), ['remove-rows', 'vocab-add']);
    assert.equal(removal.replay, null, 'a commit with residue is not replayed');
    assert.equal(insert.status, 'has-residue');
    assert.deepEqual(insert.units.map((u) => u.kind), ['insert-mid-table']);
    // the share: 1 + 1 + 1 expressed of 5 changes; 2 of 3 commits carry residue, so the ADR-03 trigger (1 in 10) fires
    assert.deepEqual({ total: report.units.total, expressed: report.units.expressed, residue: report.units.residue }, { total: 5, expressed: 3, residue: 2 });
    assert.equal(report.units.expressedShare, 0.6);
    assert.equal(report.commits.withResidue, 2);
    assert.equal(report.commits.adrRevisitTrigger.fired, true);
    assert.deepEqual(report.residue.map((r) => [r.kind, r.count]), [['insert-mid-table', 1], ['remove-rows', 1]]);
    assert.deepEqual({ attempted: report.byteReplay.attempted, identical: report.byteReplay.identical, differs: report.byteReplay.differs }, { attempted: 1, identical: 1, differs: 0 });
    assert.ok(Object.keys(report.byClass).length >= 1);
    // --no-replay measures expressiveness alone
    assert.equal(measureCoverage({ repo: repo.dir, ref: 'main', range: `${repo.first}..main`, replay: false }).byteReplay.attempted, 0);
  } finally { repo.cleanup(); }
});

test('the committed coverage report is a measurement of main\'s history: its window, its counts and its byte replay add up', () => {
  const path = join(root, 'remake/measure/change-set-coverage.json');
  assert.ok(existsSync(path), 'remake/measure/change-set-coverage.json exists: run npm run change:coverage');
  const report = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(report.status, 'measured');
  assert.equal(report.window.days, 14);
  assert.equal(report.window.commits, report.perCommit.length);
  const total = report.perCommit.flatMap((c) => c.units).reduce((n, u) => n + u.count, 0);
  assert.equal(report.units.total, total);
  assert.equal(report.units.expressed + report.units.later + report.units.residue, total);
  assert.equal(report.units.expressedShare, Math.round((report.units.expressed / total) * 1000) / 1000);
  assert.equal(report.commits.total, report.perCommit.length);
  assert.equal(report.byteReplay.differs, 0, 'every replayed commit came out byte for byte: a difference is a bug in the service');
  assert.equal(report.byteReplay.attempted, report.byteReplay.identical + report.byteReplay.differs + report.byteReplay.skipped);
  for (const kind of Object.keys(report.byKind)) assert.ok(kind in KINDS, kind);
  for (const row of report.residue) assert.ok(row.examples.length > 0 && row.why.length > 10, row.kind);
  assert.equal(typeof report.commits.adrRevisitTrigger.fired, 'boolean');
});
