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
import { pageOf, scopeOf, specimenApplies } from '../build/src/page-context.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = loadTables(join(root, 'data'));
const pageRow = (over) => ({ PageContextID: 'PC99999', 'Applies to': 'all', Statement: 'All specimens were annealed at 80 °C for 12 h and tested dry.', 'Specimen type': 'Not published', 'Moisture state': 'not-stated', 'Post-processing state': 'not-stated', 'Anneal °C': 'Not applicable', 'Anneal h': 'Not applicable', Standard: 'Not published', 'Test temperature °C': 'Not published', Locator: 'footnote', 'Reviewed by': 'test', ...over });
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
