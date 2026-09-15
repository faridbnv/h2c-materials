// The estimate model's configuration, and the names every part of the estimate stage shares.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const ESTIMATE_MODEL = JSON.parse(readFileSync(join(here, '../../mappings/estimate-model.json'), 'utf8'));

/** The headline's own semantics, as a conversion kind. A headline the model estimates needs one. */
export const HEAD = { density: 'density', tensileModulusXY: 'tensile XY', tensileStrengthXY: 'ultimate XY', elongationXY: 'break XY', hdt045: 'HDT 0.45' };

/**
 * The headlines the registry marks Estimated. Estimating a headline needs a model of it: a
 * conversion kind here and a properties entry in estimate-model.json. A registry row cannot switch
 * estimation on without one, because the model would have nothing to predict from.
 */
export function estimateKeys(registry, model = ESTIMATE_MODEL) {
  const keys = registry.headlines.filter((h) => h.estimated).map((h) => h.key);
  const unmodelled = keys.filter((k) => !HEAD[k] || !model.properties[k]);
  if (unmodelled.length) throw new Error(`headline_definitions.csv marks ${unmodelled.join(', ')} Estimated, but the estimate model has no entry for ${unmodelled.length === 1 ? 'it' : 'them'} (build/src/estimate/model.js HEAD and build/mappings/estimate-model.json properties)`);
  return keys;
}

// A material's chemical identity in the model: its base polymer, or for a blend its own name. A material
// whose identity has no entry in estimate-model.json identities cannot be estimated; validate.js says so.
export const identityOf = (m) => (m.family === 'Polymer Blends' ? m.normalizedName : m.basePolymer);

export const transform = (key, model) => (model.properties[key].scale === 'log' ? Math.log : (v) => v);
export const untransform = (key, model) => (model.properties[key].scale === 'log' ? Math.exp : (v) => v);

/** Three significant figures, rounded down (dir < 0), up (dir > 0) or to nearest, so a published range never narrows. */
export const sig3 = (v, dir = 0) => {
  if (v == null || !Number.isFinite(v) || v === 0) return v;
  const p = 10 ** (2 - Math.floor(Math.log10(Math.abs(v))));
  return (dir < 0 ? Math.floor(v * p) : dir > 0 ? Math.ceil(v * p) : Math.round(v * p)) / p;
};
