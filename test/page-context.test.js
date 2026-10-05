// What a page states once is inherited by the rows on it that state nothing, and flagged on a row that states the
// opposite (D116, the data audit of 2026-10-01, RC3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { loadSchemas } from '../build/src/schema.js';
import { compile } from '../build/src/compile.js';
import { lintData } from '../build/src/lint-rules.js';
import { pageOf, scopeOf, specimenApplies, indexPageContext, contextFor, inheritPageContext, normTable, tableScoped } from '../build/src/page-context.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = loadTables(join(root, 'data'));
const pageRow = (over) => ({ PageContextID: 'PC99999', 'Applies to': 'all', Table: 'Not applicable', Statement: 'All specimens were annealed at 80 °C for 12 h and tested dry.', 'Specimen type': 'Not published', 'Moisture state': 'not-stated', 'Post-processing state': 'not-stated', 'Anneal °C': 'Not applicable', 'Anneal h': 'Not applicable', Standard: 'Not published', 'Test temperature °C': 'Not published', Locator: 'footnote', 'Reviewed by': 'test', ...over });
const silent = base.Properties.rows.find((r) => /^Published value$/.test(r['Data status']) && r['Moisture state'] === 'not-stated' && r['Post-processing state'] === 'not-stated' && pageOf(r.Locator) != null && /Tensile modulus/.test(r.Property));

test('a row that states nothing inherits what its page states, and says where from', () => {
  assert.ok(silent, 'no silent tensile row to test against');
  const wb = structuredClone(base);
  wb['Page context'].rows.push(pageRow({ SourceID: silent.SourceID, Page: String(pageOf(silent.Locator)), 'Moisture state': 'dry', 'Post-processing state': 'annealed', 'Anneal °C': '80', 'Anneal h': '12' }));
  const { db } = compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test' });
  const m = db.measurements.find((x) => x.id === silent.MeasurementID);
  assert.equal(m.moistureState, 'dry');
  assert.equal(m.postProcessingState, 'annealed');
  assert.deepEqual(m.anneal, { tempC: 80, hours: 12 });
  assert.deepEqual(m.pageContext, { moistureState: 'PC99999', postProcessingState: 'PC99999' });
  // Its own words stay as the sheet printed them.
  assert.equal(m.postProcessing, silent['Post-processing']);
});

test('a statement scoped to impact rows does not reach a tensile row', () => {
  assert.equal(scopeOf('Tensile modulus'), 'tensile');
  assert.equal(scopeOf('Charpy strength'), 'impact');
  const wb = structuredClone(base);
  wb['Page context'].rows.push(pageRow({ SourceID: silent.SourceID, Page: String(pageOf(silent.Locator)), 'Applies to': 'impact', 'Moisture state': 'dry' }));
  const { db } = compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test' });
  assert.equal(db.measurements.find((x) => x.id === silent.MeasurementID).moistureState, 'not-stated');
});

test('a row that states the opposite of its page keeps its words and is flagged', () => {
  const printed = base.Properties.rows.find((r) => /^Published value$/.test(r['Data status']) && r['Post-processing state'] === 'as-printed' && pageOf(r.Locator) != null);
  const tables = Object.fromEntries(Object.entries(structuredClone(base)).map(([k, v]) => [{ 'Properties': 'measurements', 'Page context': 'page_context' }[k] ?? k, v]));
  tables.page_context.rows.push(pageRow({ SourceID: printed.SourceID, Page: String(pageOf(printed.Locator)), 'Post-processing state': 'annealed', 'Anneal °C': 'Not published', 'Anneal h': 'Not published' }));
  const findings = lintData(tables, loadSchemas(join(root, 'schema'))).filter((f) => f.code === 'CONTEXT-ROW-CONTRADICTS-PAGE');
  assert.ok(findings.some((f) => f.record === printed.MeasurementID && f.field === 'Post-processing state'), JSON.stringify(findings.slice(0, 2)));
});

test('a page\'s specimen statement does not speak for a melt flow rate, which is measured on the melt', () => {
  assert.equal(specimenApplies('Melt mass-flow rate'), false);
  assert.equal(specimenApplies('Melt volume-flow rate'), false);
  assert.equal(specimenApplies('Tensile modulus'), true);
  assert.equal(specimenApplies('Density'), true);
});

// ---- a statement that heads one table of a page (Table, D128)
const measurement = (over) => ({ SourceID: 'S-X', Property: 'Tensile modulus', Locator: 'p. 2: Tensile modulus (Mechanical Properties (Dry state); XY)', ...over });
const ctx = (over) => ({ PageContextID: 'PC00001', SourceID: 'S-X', Page: '2', 'Applies to': 'tensile', Table: 'Not applicable', ...over });

test('a row that heads a table reaches only the measurements whose Locator names it', () => {
  const index = indexPageContext([ctx({ Table: 'Mechanical properties (dry state)' })]);
  assert.equal(contextFor(index, measurement({})).length, 1);
  assert.equal(contextFor(index, measurement({ Locator: 'p. 2: Tensile modulus (Mechanical Properties (Conditioned); XY)' })).length, 0);
  assert.equal(contextFor(index, measurement({ Locator: 'p. 2: Tensile modulus' })).length, 0);
});

test('a table is matched without regard to case, spacing, punctuation, degree glyphs or dashes', () => {
  assert.equal(normTable('Annealed at 125 ºC –  16h'), normTable('annealed at 125 ˚C - 16h'));
  assert.equal(normTable('annealed at 125 °C'), normTable('Annealed  at 125 ˚C'));
  assert.equal(normTable('annealed at 125°C'), normTable('annealed at 125 ºC'));
  assert.equal(normTable('Mechanical   Properties, (Dry State)'), normTable('mechanical properties (dry state)'));
  const index = indexPageContext([ctx({ Table: 'annealed at 125 ºC for 16h' })]);
  assert.equal(contextFor(index, measurement({ Locator: 'p. 2: Tensile modulus (XY; Annealed at 125 °C for 16h)' })).length, 1);
});

test('a row that speaks for its whole page behaves as it did, with Not applicable or no Table at all', () => {
  const rows = [ctx({ Table: 'Not applicable' }), ctx({ PageContextID: 'PC00002', 'Applies to': 'all', Table: undefined }), ctx({ PageContextID: 'PC00003', 'Applies to': 'impact' })];
  const got = contextFor(indexPageContext(rows), measurement({}));
  assert.deepEqual(got.map((c) => c.PageContextID), ['PC00001', 'PC00002']);
  assert.equal(tableScoped(rows[0]), false);
  assert.equal(tableScoped(rows[1]), false);
});

test('a table\'s own row is read before a scope\'s, and a scope\'s before the page\'s', () => {
  const rows = [
    ctx({ PageContextID: 'PC00001', 'Applies to': 'all', 'Moisture state': 'conditioned' }),
    ctx({ PageContextID: 'PC00002', 'Applies to': 'tensile', 'Moisture state': 'wet' }),
    ctx({ PageContextID: 'PC00003', 'Applies to': 'all', Table: 'Dry state', 'Moisture state': 'dry' }),
  ];
  const index = indexPageContext(rows);
  const m = measurement({});
  assert.deepEqual(contextFor(index, m).map((c) => c.PageContextID), ['PC00003', 'PC00002', 'PC00001']);
  const target = {};
  const own = { ...m, 'Moisture state': 'not-stated', 'Post-processing state': 'not-stated', 'Specimen type': 'Not published', Standards: 'Not published', 'Test temperature °C': 'Not published' };
  const inherited = inheritPageContext(target, own, contextFor(index, m));
  assert.equal(target.moistureState, 'dry');
  assert.equal(inherited.moistureState, 'PC00003');
  // The other table of the page falls back to the scope's row.
  const other = measurement({ Locator: 'p. 2: Tensile modulus (Wet state)' });
  assert.deepEqual(contextFor(index, other).map((c) => c.PageContextID), ['PC00002', 'PC00001']);
});

test('a statement scoped to one table contradicts only the rows of that table', () => {
  const printed = base.Properties.rows.find((r) => /^Published value$/.test(r['Data status']) && r['Post-processing state'] === 'as-printed' && pageOf(r.Locator) != null);
  const tables = Object.fromEntries(Object.entries(structuredClone(base)).map(([k, v]) => [{ 'Properties': 'measurements', 'Page context': 'page_context' }[k] ?? k, v]));
  const schemas = loadSchemas(join(root, 'schema'));
  const flagged = (table) => {
    const copy = structuredClone(tables);
    copy.page_context.rows.push(pageRow({ SourceID: printed.SourceID, Page: String(pageOf(printed.Locator)), 'Post-processing state': 'annealed', 'Anneal °C': 'Not published', 'Anneal h': 'Not published', Table: table }));
    return lintData(copy, schemas).some((f) => f.code === 'CONTEXT-ROW-CONTRADICTS-PAGE' && f.record === printed.MeasurementID);
  };
  assert.equal(flagged('Not applicable'), true);
  assert.equal(flagged('a table this row does not belong to'), false);
});
