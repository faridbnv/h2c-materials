// Scaling by properties: a new property that applies to only some filaments is added with data rows
// alone. This test writes nothing but CSV rows (into a copy of data/), changes no source file, and
// follows the property through the schema gate, compile, validate, and every interface definition.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../scripts/data/table-io.mjs';
import { checkData } from '../build/src/schema.js';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';
import { useRegistry, numericFilters, exportHeadlines, propertiesInDomain, propertyApplies } from '../app/js/ui/registry.js';
import { PROPERTY } from '../app/js/ui/labels.js';
import { AXIS_DEFS } from '../app/js/ui/axes.js';
import { availability } from '../app/js/engine/coverage.js';
import { toCSV } from '../app/js/ui/table.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const NA = 'Not applicable';

function withShoreA({ misfile = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-newprop-'));
  cpSync(join(root, 'data'), join(dir, 'data'), { recursive: true });
  cpSync(join(root, 'schema'), join(dir, 'schema'), { recursive: true });
  const t = openTables(dir);

  // 1. Register the property, limited to elastomers.
  t.append('properties', {
    Property: 'Shore A hardness', Domain: 'mechanical', Units: 'Shore A',
    'Applies to': 'Family: Flexible Elastomers', 'Not applicable reason': 'Shore A hardness describes elastomers; rigid filaments use Shore D or Rockwell scales',
    Description: 'Indentation hardness on the Shore A scale (ISO 868 / ASTM D2240).',
  });
  // 2. Define a headline for it.
  t.append('headline_definitions', {
    HeadlineKey: 'shoreA', Kind: 'measurement', Unit: 'Shore A', 'Value properties': 'Shore A hardness', 'Related properties': 'Shore A hardness',
    'Lower bound properties': NA, 'Lower bound load MPa': NA, 'Lower bound excludes': NA, 'Lower bound basis': NA,
    Direction: NA, 'Load MPa': NA, 'Evidence group': 'mechanical', 'Endpoint note': 'FALSE',
    Short: 'Softness', Plain: 'Shore A hardness', Technical: 'Shore A hardness', Hint: 'how soft a flexible part feels; lower is softer',
    'Axis label': 'Shore A hardness', 'Export header': 'Shore A', Better: 'min', 'Filter group': 'Mechanical', 'Filter operator': '<=',
    'Filter example': 'e.g. 90 for a soft grip', 'Non-negative': 'TRUE', 'Table column': 'FALSE', Estimated: 'FALSE', 'Reference property': NA,
    'Applies to': 'Family: Flexible Elastomers', 'Not applicable reason': 'Shore A hardness describes elastomers',
  });
  // 3. Record a measurement for an elastomer's representative grade, and select it.
  const elastomer = t.rows('materials').find((m) => m.Family === 'Flexible Elastomers' && /^G\d/.test(m['Representative grade']));
  const template = t.rows('measurements').find((r) => r.GradeID === elastomer['Representative grade']);
  const id = t.nextId('measurements');
  t.append('measurements', {
    ...template, MeasurementID: id, Property: 'Shore A hardness', 'Raw value': '95A', 'Raw unit': 'Shore A', 'Raw numeric': '95',
    'Raw uncertainty ±': NA, 'Raw upper bound': NA, Operator: '=', 'Conversion factor': '1', 'Normalized value': '95',
    'Normalized uncertainty ±': NA, 'Normalized upper bound': NA, 'Normalized unit': 'Shore A', 'Data status': 'Published value',
    Direction: NA, Notch: NA, 'Standard / load': 'ISO 868', Locator: 'test fixture', Notes: NA,
  });
  t.append('headlines', { MaterialID: elastomer.MaterialID, HeadlineKey: 'shoreA', MeasurementID: id, Use: 'value' });
  let misfiledId = null;
  if (misfile) {
    const pla = t.rows('materials').find((m) => m['Original name'] === 'PLA');
    const plaRow = t.rows('measurements').find((r) => r.GradeID === pla['Representative grade']);
    misfiledId = t.nextId('measurements');
    t.append('measurements', { ...t.find('measurements', id), MeasurementID: misfiledId, MaterialID: pla.MaterialID, GradeID: plaRow.GradeID, SourceID: plaRow.SourceID });
  }
  t.save();
  return { dir, elastomerId: elastomer.MaterialID, measurementId: id, misfiledId };
}

function compiled(dir) {
  const schemaIssues = checkData(join(dir, 'data'), join(dir, 'schema')).issues;
  const wb = loadTables(join(dir, 'data'));
  const { db, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test' });
  return { db, schemaIssues, errors: issues.filter((i) => i.level === 'error') };
}

test('a property for elastomers only is added with data rows alone and reaches every view', () => {
  const { dir, elastomerId, measurementId } = withShoreA();
  try {
    const { db, schemaIssues, errors } = compiled(dir);
    assert.deepEqual(schemaIssues, []);
    assert.deepEqual(errors, []);

    const elastomer = db.materials.find((m) => m.id === elastomerId);
    const pla = db.materials.find((m) => m.name === 'PLA');
    assert.equal(elastomer.headline.shoreA.value, 95);
    assert.equal(elastomer.headline.shoreA.measurementId, measurementId);
    assert.equal(pla.headline.shoreA.missing, 'not-applicable');
    assert.match(pla.headline.shoreA.notApplicable.reason, /describes elastomers/);
    assert.equal(db.meta.headlineCoverage.shoreA, 1);

    useRegistry(db.registry);
    assert.equal(PROPERTY.shoreA.plain, 'Shore A hardness');
    assert.ok(numericFilters().some((f) => f.key === 'shoreA' && f.group === 'Mechanical'), 'filter rail');
    assert.deepEqual(AXIS_DEFS.find((a) => a.key === 'shoreA').measurement, { properties: ['Shore A hardness'], direction: null }, 'chart axis');
    assert.ok(exportHeadlines().some((h) => h.header === 'Shore A'), 'export');
    assert.ok(propertiesInDomain('mechanical').includes('Shore A hardness'), 'Mechanical tab');
    assert.ok(propertyApplies('Shore A hardness', elastomer) && !propertyApplies('Shore A hardness', pla), 'listed only where it applies');

    const a = availability(db.materials, 'shoreA');
    assert.equal(a.withData, 1);
    assert.equal(a.total, db.materials.filter((m) => m.family === 'Flexible Elastomers').length, 'counted against elastomers, not every material');

    const csv = toCSV([elastomer, pla].map((m) => ({ material: m, evaluation: { verdict: 'PASS', eligible: true, failed: [], unresolved: [] } })), db.meta);
    const [header, first, second] = csv.split('\n').filter((l) => !l.startsWith('#'));
    const col = header.split(',').indexOf('Shore A');
    assert.ok(col > 0);
    assert.equal(first.split(',')[col], '95');
    assert.equal(second.split(',')[col], 'not-applicable');
  } finally {
    rmSync(dir, { recursive: true, force: true });
    useRegistry(null); // leave no test registry behind for other tests in this process
  }
});

test('the same property recorded against a rigid filament stops the build', () => {
  const { dir, misfiledId } = withShoreA({ misfile: true });
  try {
    const { errors } = compiled(dir);
    assert.ok(errors.some((e) => e.where === `measurements ${misfiledId}` && /Shore A hardness does not apply to PLA/.test(e.message)), errors.map((e) => e.message).join(' | '));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
