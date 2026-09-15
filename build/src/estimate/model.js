// The estimate model's configuration, and the names every part of the estimate stage shares.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';

const here = dirname(fileURLToPath(import.meta.url));

/** Load the configuration and check it against schema/estimate-model.schema.json: a misspelt or missing setting stops here. */
export function loadEstimateModel(path = join(here, '../../mappings/estimate-model.json')) {
  const model = JSON.parse(readFileSync(path, 'utf8'));
  const schema = JSON.parse(readFileSync(join(here, '../../../schema/estimate-model.schema.json'), 'utf8'));
  const check = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true }).compile(schema);
  if (!check(model)) {
    const problems = check.errors.map((e) => `${e.instancePath || '/'} ${e.message}${e.params?.additionalProperty ? ` ("${e.params.additionalProperty}")` : ''}`);
    throw new Error(`build/mappings/estimate-model.json does not match schema/estimate-model.schema.json:\n  ${problems.join('\n  ')}`);
  }
  return model;
}

export const ESTIMATE_MODEL = loadEstimateModel();

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

// A material's chemical identity in the model: materials.csv Estimate identity, a row of data/tables/polymers.csv. A
// material with none is not estimated; validate.js says so.
export const identityOf = (m) => m.estimateIdentity ?? null;

/**
 * The model with the polymer identities of data/tables/polymers.csv (compiled as db.polymers), in the shape the stage
 * reads: group, morphology, tm, fastCrystallising, printsAmorphous (true or 'unfilled'), waterUptake, density [min, max].
 */
export function modelWith(polymers, base = ESTIMATE_MODEL) {
  const identities = Object.fromEntries(polymers.map((p) => [p.id, {
    group: p.group, morphology: p.morphology,
    ...(p.meltingPointC != null ? { tm: p.meltingPointC } : {}),
    ...(p.asPrinted === 'crystallises while printing' ? { fastCrystallising: true } : {}),
    ...(p.asPrinted === 'prints amorphous' ? { printsAmorphous: true } : p.asPrinted === 'prints amorphous unless fibre-filled' ? { printsAmorphous: 'unfilled' } : {}),
    ...(p.waterUptake ? { waterUptake: p.waterUptake } : {}),
    ...(p.neatDensity ? { density: [p.neatDensity.min, p.neatDensity.max] } : {}),
  }]));
  return { ...base, identities };
}

export const transform = (key, model) => (model.properties[key].scale === 'log' ? Math.log : (v) => v);
export const untransform = (key, model) => (model.properties[key].scale === 'log' ? Math.exp : (v) => v);

/** Three significant figures, rounded down (dir < 0), up (dir > 0) or to nearest, so a published range never narrows. */
export const sig3 = (v, dir = 0) => {
  if (v == null || !Number.isFinite(v) || v === 0) return v;
  const p = 10 ** (2 - Math.floor(Math.log10(Math.abs(v))));
  return (dir < 0 ? Math.floor(v * p) : dir > 0 ? Math.ceil(v * p) : Math.round(v * p)) / p;
};
