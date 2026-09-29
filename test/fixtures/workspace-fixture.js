// A small hand-built database for the Ashby workspace's tests (test/workspace.test.js, test/ashby-export.test.js): a
// registry with the state flags of the real one, products with their states, and the question asked as the page asks it.

import { runSelection } from '../../app/js/engine/constraints.js';
import { stateId } from '../../app/js/engine/products.js';

export const REGISTRY = {
  headlines: [
    { key: 'density', unit: 'kg/m³', better: 'min', changesWithAnnealing: false, changesWithMoisture: false, labels: { plain: 'Density' } },
    { key: 'tensileModulusXY', unit: 'GPa', better: 'max', changesWithAnnealing: true, changesWithMoisture: true, labels: { plain: 'Stiffness' } },
    { key: 'tensileStrengthXY', unit: 'MPa', better: 'max', changesWithAnnealing: true, changesWithMoisture: true, labels: { plain: 'Strength' } },
    { key: 'hdt045', unit: '°C', better: 'max', changesWithAnnealing: true, changesWithMoisture: true, labels: { plain: 'Heat resistance' } },
    { key: 'glassTransition', unit: '°C', better: 'max', changesWithAnnealing: false, changesWithMoisture: true, labels: { plain: 'Glass transition' } },
    { key: 'priceCADkg', unit: 'CAD/kg', better: 'min', changesWithAnnealing: false, changesWithMoisture: false, labels: { plain: 'Price' } },
  ],
};
const UNITS = Object.fromEntries(REGISTRY.headlines.map((h) => [h.key, h.unit]));
export const missing = (key) => ({ known: false, missing: 'not-published', unit: UNITS[key] });
const within = { verdict: 'within', reason: 'within the H2C' };
const recipe = { profileIds: ['P1'], nozzle: { ...within, state: 'range', min: 200, max: 230 }, bed: { ...within, state: 'range', min: 50, max: 60 },
  chamber: { ...within, state: 'not-required' }, enclosure: 'unknown', hardenedNozzle: null, drying: null, anneal: [] };

let seq = 0;
export const v = (value, extra = {}) => ({ value, level: 'comparable', measurementId: `V${String(++seq).padStart(6, '0')}`, ...extra });
export const price = (value) => ({ value, level: 'comparable', priceIds: [`CA${String(++seq).padStart(4, '0')}`], observations: 1 });
/** A state: its values, and its treatment and moisture. */
export const st = (values, { treatment = null, moisture = 'dry' } = {}) => ({ id: stateId(treatment, moisture), treatment, moisture, values });
/** A product with its states, as printed and dry first. */
export const product = (id, materialId, states, over = {}) => ({
  id, materialId, manufacturer: 'Maker', product: id, headline: states[0].values, states, print: recipe, ...over,
});
/** A material over its products, its own headline unknown unless given (as the build leaves a material none of whose products publishes). */
export const material = (id, grades, headline = {}) => ({
  id, name: `Material ${id}`, family: 'Family', excluded: false, gradeIds: grades.map((g) => g.id),
  headline: Object.fromEntries(REGISTRY.headlines.map((h) => [h.key, headline[h.key] ?? missing(h.key)])),
  summary: Object.fromEntries(REGISTRY.headlines.map((h) => [h.key, { products: grades.length, n: grades.filter((g) => g.headline[h.key]).length }])),
  gates: { scope: 'within', nozzle: within, bed: within, chamber: within, abrasive: 'unknown', drying: 'unknown' },
  facets: { reinforcement: { value: 'unfilled' } },
  __grades: grades,
});

/** The question asked of fixture materials, as the page asks it: runSelection, then the rows on screen. */
export function ask(materials, constraints, over = {}) {
  const ctx = {
    db: { registry: REGISTRY, meta: { release: { id: over.release ?? 'fixture-1' } }, grades: materials.flatMap((m) => m.__grades), measurements: [] },
    productsByMaterial: new Map(materials.map((m) => [m.id, m.__grades])),
    unknownPolicy: 'strict', evidence: 'comparable', moisture: 'dry', anneal: false, annealMaxC: null, useEstimates: false,
    ...over.ctx,
  };
  const selection = runSelection(materials, constraints, ctx);
  const byId = new Map(materials.map((m) => [m.id, m]));
  const all = selection.evaluations.map((e) => ({ material: byId.get(e.materialId), evaluation: e }));
  const rows = all.filter((r) => r.evaluation.eligible);
  return { ctx, selection, rows, all };
}
export const scope = { kind: 'gate', gate: 'scope' };
export const near = (a, b, rel = 1e-12) => Math.abs(a - b) <= rel * Math.max(Math.abs(a), Math.abs(b));

