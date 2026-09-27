// The interface builds its property definitions from the database's registry. They must reproduce the
// lists that were hardcoded in labels.js, axes.js, filters.js, table.js and detail.js, except for the
// corrections DECISIONS D46 records, and a new registry row must reach every view with no code change.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { useRegistry, numericFilters, nonNegativeKeys, exportHeadlines, propertiesInDomain, propertyApplies, REGISTRY } from '../app/js/ui/registry.js';
import { PROPERTY } from '../app/js/ui/labels.js';
import { AXIS_DEFS } from '../app/js/ui/axes.js';
import { COLUMN_SETS, sortForColumnSet } from '../app/js/ui/table.js';
import { availability } from '../app/js/engine/coverage.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const legacy = JSON.parse(readFileSync(join(root, 'test/fixtures/legacy-constants.json'), 'utf8')).app;
const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));

// The lists were hardcoded for six headlines. A headline added since (D92) is a registry row they never had: it reaches
// every list in registry order, and leaves the six as they were. These compare the six.
const LEGACY = new Set(legacy.CSV_KEYS);
const six = (registry) => ({ ...registry, headlines: registry.headlines.filter((h) => LEGACY.has(h.key)) });

test('labels, axes, filters, table columns and export headers reproduce the hardcoded lists', () => {
  useRegistry(six(db.registry));
  assert.deepEqual(PROPERTY, legacy.PROPERTY);
  assert.deepEqual(AXIS_DEFS, legacy.AXIS_DEFS);
  assert.deepEqual(numericFilters(), legacy.NUMERIC);
  assert.deepEqual([...nonNegativeKeys()], legacy.NON_NEGATIVE);
  assert.deepEqual(COLUMN_SETS.properties.columns.filter((c) => c.kind === 'headline' || c.kind === 'price'), legacy.PROPERTIES_COLUMNS);
  assert.deepEqual(exportHeadlines().map((h) => h.header), legacy.CSV_HEADERS);
  assert.deepEqual(exportHeadlines().map((h) => h.key), legacy.CSV_KEYS);
});

test('every headline the registry holds reaches every list, in registry order, and the six keep their places among them', () => {
  useRegistry(db.registry);
  const keys = db.registry.headlines.map((h) => h.key);
  assert.deepEqual(Object.keys(PROPERTY), keys);
  assert.deepEqual(AXIS_DEFS.map((a) => a.key), keys);
  assert.deepEqual(numericFilters().map((f) => f.key), keys);
  assert.deepEqual(exportHeadlines().map((h) => h.key), keys);
  assert.deepEqual(keys.filter((k) => LEGACY.has(k)), legacy.CSV_KEYS);
  assert.deepEqual(COLUMN_SETS.properties.columns.filter((c) => c.kind === 'headline' || c.kind === 'price').map((c) => c.key),
    db.registry.headlines.filter((h) => h.tableColumn).map((h) => h.key));
  // An axis carries the conditions its headline sets, and no others: a notch and a test temperature only where set.
  for (const h of db.registry.headlines.filter((x) => x.kind === 'measurement')) {
    const m = AXIS_DEFS.find((a) => a.key === h.key).measurement;
    assert.equal(m.notch ?? null, h.notch, h.key);
    assert.equal(m.testTemperatureC ?? null, h.testTemperatureC, h.key);
  }
});

test('the drawer uses the shared labels and the shared property domains (D46 corrections)', () => {
  useRegistry(six(db.registry));
  // Overview key numbers now read the same hint as the filter rail. The drawer had said elongation
  // "high means tough", which the shared label exists to contradict.
  const head = REGISTRY.headlines.map((h) => [h.labels.plain, h.key, h.labels.hint]);
  const changed = head.filter((row, i) => JSON.stringify(row) !== JSON.stringify(legacy.DETAIL_HEAD[i])).map((r) => r[1]);
  assert.deepEqual(changed, ['elongationXY', 'priceCADkg']);
  // The tabs gain the properties coverage already counted as mechanical or thermal and they omitted.
  const gained = (now, before) => now.filter((p) => !before.includes(p));
  assert.deepEqual(legacy.DETAIL_MECHANICAL.filter((p) => !propertiesInDomain('mechanical').includes(p)), []);
  assert.deepEqual(legacy.DETAIL_THERMAL.filter((p) => !propertiesInDomain('thermal').includes(p)), []);
  // What the tabs show is what properties.csv says, property for property: a row added there appears in its tab
  // and nowhere else, which is the whole of "add a property: no code changes". The four the drawer gained at D46
  // (flexural elongation at break, flexural stress at conventional deflection, Izod impact strength, tensile
  // strain at strength) and the one thermal gain (continuous service temperature) were the first of those; the
  // import adds more with every maker whose sheets publish something the database had no row for, and a list
  // here would only record how far the import had got.
  for (const domain of ['mechanical', 'thermal', 'physical']) {
    assert.deepEqual(propertiesInDomain(domain).sort(),
      db.registry.properties.filter((p) => p.domain === domain).map((p) => p.name).sort(), domain);
  }
  assert.ok(gained(propertiesInDomain('mechanical'), legacy.DETAIL_MECHANICAL).includes('Izod impact strength'));
  assert.ok(gained(propertiesInDomain('thermal'), legacy.DETAIL_THERMAL).includes('Continuous service temperature'));
});

test('a scoped property is listed only for the materials it applies to, and counted against them', () => {
  const registry = structuredClone(db.registry);
  registry.properties.find((p) => p.name === 'Hardness').appliesTo = [{ column: 'Family', field: 'family', values: ['Flexible Elastomers'] }];
  useRegistry(registry);
  const tpu = db.materials.find((m) => m.family === 'Flexible Elastomers');
  const pla = db.materials.find((m) => m.name === 'PLA');
  assert.ok(propertyApplies('Hardness', tpu));
  assert.ok(!propertyApplies('Hardness', pla));
  const materials = db.materials.map((m) => (m.family === 'Flexible Elastomers' ? m : { ...m, headline: { ...m.headline, density: { known: false, missing: 'not-applicable', notApplicable: { reason: 'x', rule: 'Family: Flexible Elastomers' } } } }));
  const a = availability(materials, 'density');
  assert.equal(a.total, db.materials.filter((m) => m.family === 'Flexible Elastomers').length);
  assert.equal(a.notApplicable, db.materials.length - a.total);
  useRegistry(db.registry);
});

test('switching column sets keeps a sort the new set can show, and only then', () => {
  useRegistry(JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'dist/db.json'), 'utf8')).registry);
  const price = { key: 'priceCADkg', dir: 'desc' };
  assert.deepEqual(sortForColumnSet(price, 'printing'), price);
  const nozzle = { key: 'nozzleC', dir: 'asc' };
  assert.deepEqual(sortForColumnSet(nozzle, 'printing'), nozzle);
  assert.deepEqual(sortForColumnSet(nozzle, 'properties'), { key: 'name', dir: 'asc' });
  const density = { key: 'density', dir: 'desc' };
  assert.deepEqual(sortForColumnSet(density, 'properties'), density);
  assert.deepEqual(sortForColumnSet({ key: 'pin', dir: 'asc' }, 'printing'), { key: 'name', dir: 'asc' });
});
