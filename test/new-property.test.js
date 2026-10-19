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

function withRebound({ misfile = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-newprop-'));
  cpSync(join(root, 'data'), join(dir, 'data'), { recursive: true });
  cpSync(join(root, 'schema'), join(dir, 'schema'), { recursive: true });
  const t = openTables(dir);

  // 1. Register the property, limited to elastomers.
  t.append('properties', {
    Property: 'Rebound resilience', Domain: 'mechanical', Units: '%',
    'Applies to': 'Family: Flexible Elastomers', 'Not applicable reason': 'Rebound resilience describes elastomers; a rigid filament does not spring back',
    Description: 'The share of an impact\'s energy an elastomer gives back (ISO 4662).',
  });
  // 2. Define a headline for it.
  t.append('headline_definitions', {
    HeadlineKey: 'reboundResilience', Kind: 'measurement', Unit: '%', 'Value properties': 'Rebound resilience', 'Related properties': 'Rebound resilience',
    'Lower bound properties': NA, 'Lower bound load MPa': NA, 'Lower bound excludes': NA, 'Lower bound specimens': NA, 'Lower bound basis': NA,
    Direction: NA, 'Unstated direction': NA, 'Load MPa': NA, 'Unstated load': NA, Notch: NA, 'Test temperature °C': NA, Standard: NA, 'Test scatter': NA, 'Test scatter is': NA, 'Changes with annealing': 'FALSE', 'Changes with moisture': 'FALSE', 'Evidence group': 'mechanical', 'Endpoint note': 'FALSE', 'Comparison note': NA, 'Drawer comparison': NA, 'Drawer only': 'FALSE', 'Sold as toughened': NA,
    Short: 'Rebound', Plain: 'Rebound resilience', Technical: 'Rebound resilience (ISO 4662)', Hint: 'how much of a knock a flexible part gives back',
    'Axis label': 'Rebound resilience', 'Export header': 'Rebound resilience', Better: 'max', 'Filter group': 'Mechanical', 'Filter operator': '>=',
    'Filter example': 'e.g. 40 for a lively grip', 'Non-negative': 'TRUE', 'Table column': 'FALSE', Estimated: 'FALSE', 'Reference property': NA,
    'Applies to': 'Family: Flexible Elastomers', 'Not applicable reason': 'Rebound resilience describes elastomers',
  });
  // 3. Record a measurement for the one product of an elastomer that has one. Nothing selects it: the product's value is
  // chosen by rule, and the material's headline is its products' spread (D83).
  const products = (materialId) => t.rows('grades').filter((g) => g.MaterialID === materialId && g.Role === 'procurement' && g.Status === 'active');
  const elastomer = t.rows('materials').find((m) => m.Family === 'Flexible Elastomers' && products(m.MaterialID).length === 1
    && t.rows('measurements').some((r) => r.GradeID === products(m.MaterialID)[0].GradeID));
  const template = t.rows('measurements').find((r) => r.GradeID === products(elastomer.MaterialID)[0].GradeID);
  const id = t.nextId('measurements');
  t.append('measurements', {
    ...template, MeasurementID: id, Property: 'Rebound resilience', 'Raw value': '45 %', 'Raw unit': '%', 'Raw numeric': '45',
    'Raw uncertainty ±': NA, 'Raw upper bound': NA, Operator: '=', 'Conversion factor': '1', 'Normalized value': '45',
    'Normalized uncertainty ±': NA, 'Normalized upper bound': NA, 'Normalized unit': '%', 'Data status': 'Published value',
    Direction: NA, Notch: NA, 'Standard / load': 'Not published', Standards: 'Not published', Locator: 'test fixture', Notes: NA,
  });
  let misfiledId = null;
  if (misfile) {
    const pla = t.rows('materials').find((m) => m['Original name'] === 'PLA');
    const plaRow = t.rows('measurements').find((r) => r.GradeID === products(pla.MaterialID)[0].GradeID);
    misfiledId = t.nextId('measurements');
    t.append('measurements', { ...t.find('measurements', id), MeasurementID: misfiledId, MaterialID: pla.MaterialID, GradeID: plaRow.GradeID, SourceID: plaRow.SourceID });
  }
  t.save();
  return { dir, elastomerId: elastomer.MaterialID, measurementId: id, misfiledId };
}

function compiled(dir, { estimates = true } = {}) {
  const schemaIssues = checkData(join(dir, 'data'), join(dir, 'schema')).issues;
  const wb = loadTables(join(dir, 'data'));
  const { db, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test', estimates });
  return { db, schemaIssues, errors: issues.filter((i) => i.level === 'error') };
}

test('a property for elastomers only is added with data rows alone and reaches every view', () => {
  const { dir, elastomerId, measurementId } = withRebound();
  try {
    // The core database: every view below reads the compiled headline, and rebound resilience is not estimated, so the
    // estimate stage would add nothing here but twenty seconds (completeness round, D136).
    const { db, schemaIssues, errors } = compiled(dir, { estimates: false });
    assert.deepEqual(schemaIssues, []);
    assert.deepEqual(errors, []);

    const elastomer = db.materials.find((m) => m.id === elastomerId);
    const pla = db.materials.find((m) => m.name === 'PLA');
    assert.equal(elastomer.headline.reboundResilience.value, 45);
    assert.equal(elastomer.headline.reboundResilience.measurementId, measurementId);
    assert.equal(pla.headline.reboundResilience.missing, 'not-applicable');
    assert.match(pla.headline.reboundResilience.notApplicable.reason, /describes elastomers/);
    assert.equal(db.meta.headlineCoverage.reboundResilience, 1);

    useRegistry(db.registry);
    assert.equal(PROPERTY.reboundResilience.plain, 'Rebound resilience');
    assert.ok(numericFilters().some((f) => f.key === 'reboundResilience' && f.group === 'Mechanical'), 'filter rail');
    assert.deepEqual(AXIS_DEFS.find((a) => a.key === 'reboundResilience').measurement, { properties: ['Rebound resilience'], direction: null }, 'chart axis');
    assert.ok(exportHeadlines().some((h) => h.header === 'Rebound resilience'), 'export');
    assert.ok(propertiesInDomain('mechanical').includes('Rebound resilience'), 'Mechanical tab');
    assert.ok(propertyApplies('Rebound resilience', elastomer) && !propertyApplies('Rebound resilience', pla), 'listed only where it applies');

    const a = availability(db.materials, 'reboundResilience');
    assert.equal(a.withData, 1);
    assert.equal(a.total, db.materials.filter((m) => m.family === 'Flexible Elastomers').length, 'counted against elastomers, not every material');

    const csv = toCSV([elastomer, pla].map((m) => ({ material: m, evaluation: { verdict: 'PASS', eligible: true, failed: [], unresolved: [] } })), db.meta);
    const [header, first, second] = csv.split('\n').filter((l) => !l.startsWith('#'));
    const col = header.split(',').indexOf('Rebound resilience');
    assert.ok(col > 0);
    assert.equal(first.split(',')[col], '45');
    assert.equal(second.split(',')[col], 'not-applicable');
  } finally {
    rmSync(dir, { recursive: true, force: true });
    useRegistry(null); // leave no test registry behind for other tests in this process
  }
});

test('the same property recorded against a rigid filament stops the build', () => {
  const { dir, misfiledId } = withRebound({ misfile: true });
  try {
    // The core database: the error is the compiler's, which the estimate stage cannot remove.
    const { errors } = compiled(dir, { estimates: false });
    assert.ok(errors.some((e) => e.where === `measurements ${misfiledId}` && /Rebound resilience does not apply to PLA/.test(e.message)), errors.map((e) => e.message).join(' | '));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
