// Scenario state: everything that must be recorded for a selection result to be reproducible by
// someone else, and everything that travels in a shared link.
//
// A scenario is the user's question, never the answer and never the data. It holds the constraints,
// the unknown-data policy, the shortlist, the plot settings and any user assumptions. Assumptions
// are scenario data and never database edits: the compiled snapshot is read-only at runtime, so a
// stand-in value lives here and is marked wherever it surfaces.

import { normalizePolicy } from './constraints.js';

export const SCENARIO_VERSION = 1;

export function newScenario(meta) {
  return {
    version: SCENARIO_VERSION,
    dbSnapshot: meta?.snapshot ?? null,
    appBuild: meta?.build ?? null,
    created: new Date().toISOString(),
    constraints: [],
    unknownPolicy: 'strict',
    preferences: [],
    assumptions: [],
    shortlist: [],
    plot: { x: 'density', y: 'tensileModulusXY', xLog: false, yLog: false, index: null, showReference: false, comparability: 'strict', pointLevel: 'headline' },
    lens: 'table',
    openMaterial: null,
    useEstimates: true,
    columnSet: 'properties',
    baseline: null,
    template: null,
  };
}

export function serialize(scenario) {
  return JSON.stringify(scenario, null, 2);
}

const KINDS = new Set(['numeric', 'gate', 'facet', 'environment', 'evidence']);
const OPERATORS = new Set(['>=', '<=', '>', '<']);
const LENSES = new Set(['table', 'ashby', 'parallel', 'coverage', 'compare', 'explain']);
const COLUMN_SETS = new Set(['properties', 'printing']);
export const SHORTLIST_MAX = 6;

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Check a scenario's shape before anything is committed.
 *
 * A saved file or a link is user-editable text. `{"version":1,"constraints":null}` used to load,
 * replace the running session, and then throw during rendering, so a bad file destroyed the work
 * it was meant to restore. Structural problems throw with a message a person can act on; references
 * to materials this snapshot does not hold are dropped with a warning, because the rest of the
 * question is still worth having.
 */
const GATES = new Set(['scope', 'h2cStatus', 'abrasive', 'buyable', 'dryingKnown', 'nozzle', 'bed', 'chamber']);
const FACETS = new Set(['reinforcement', 'esd', 'flexible', 'supportMaterial', 'flameRetardant']);

export function validateScenario(raw, meta, { materialIds = null, headlineKeys = null } = {}) {
  if (!isObject(raw)) throw new Error('The file does not contain a scenario object.');
  if (raw.version !== undefined && raw.version !== SCENARIO_VERSION) {
    throw new Error(`Scenario version ${raw.version} cannot be read by this build.`);
  }
  const warnings = [];
  const base = newScenario(meta);
  const out = { ...base, ...raw, version: SCENARIO_VERSION };

  if (raw.constraints !== undefined && !Array.isArray(raw.constraints)) throw new Error('"constraints" must be a list.');
  out.constraints = (raw.constraints ?? []).map((c, i) => {
    const where = `Requirement ${i + 1}`;
    if (!isObject(c)) throw new Error(`${where} is not an object.`);
    if (!KINDS.has(c.kind)) throw new Error(`${where} has an unknown kind "${c.kind}".`);
    if (c.kind === 'numeric') {
      if (typeof c.property !== 'string') throw new Error(`${where} names no property.`);
      if (!OPERATORS.has(c.operator)) throw new Error(`${where} has an unknown comparison "${c.operator}".`);
      if (typeof c.value !== 'number' || !Number.isFinite(c.value)) throw new Error(`${where} has no numeric value.`);
    }
    if (c.kind === 'gate' && typeof c.gate !== 'string') throw new Error(`${where} names no gate.`);
    if (c.kind === 'facet' && typeof c.facet !== 'string') throw new Error(`${where} names no facet.`);
    if (c.kind === 'environment') {
      if (typeof c.category !== 'string') throw new Error(`${where} names no environment category.`);
      // Older builds wrote require: ['resistant', 'limited'], which let limited resistance pass.
      // The criterion now has one meaning, so the override is not carried forward.
      const { require: _dropped, ...rest } = c;
      return rest;
    }
    return { ...c };
  });

  // A requirement this build cannot evaluate is dropped with a warning, as an unknown shortlisted material is. A typo in
  // a hand-edited link ("notAHeadline", gate "warp") used to read as a data gap on every material, and an empty list as a
  // failure of every material (audit 2026-09-15, A-06).
  const described = (c) => (c.kind === 'numeric' ? `"${c.property}"` : c.kind === 'gate' ? `gate "${c.gate}"` : c.kind === 'facet' ? `"${c.facet}"` : `"${c.category}"`);
  const unusable = (c) => (c.kind === 'numeric' && headlineKeys && !headlineKeys.has(c.property) ? 'names a property this build does not have'
    : c.kind === 'gate' && !GATES.has(c.gate) ? 'names a gate this build does not have'
    : c.kind === 'facet' && !FACETS.has(c.facet) ? 'names a facet this build does not have'
    : c.kind === 'environment' && meta?.environmentCategories && !(c.category in meta.environmentCategories) ? 'names an environment this build does not have'
    : Array.isArray(c.in) && !c.in.length ? 'lists nothing to accept'
    : null);
  out.constraints = out.constraints.filter((c) => {
    const why = unusable(c);
    if (why) warnings.push(`A requirement on ${described(c)} ${why}, so it was left out.`);
    return !why;
  });
  // One requirement per property: the filter rail holds one, so a second from a link or file was invisible there, dropped
  // by editing the first, and missing from the chart (audit 2026-09-15, A-05). The first is kept.
  const seen = new Set();
  out.constraints = out.constraints.filter((c) => {
    if (c.kind !== 'numeric') return true;
    if (!seen.has(c.property)) { seen.add(c.property); return true; }
    warnings.push(`A second requirement on "${c.property}" (${c.operator} ${c.value}) was left out; a selection holds one requirement per property.`);
    return false;
  });

  out.unknownPolicy = normalizePolicy(raw.unknownPolicy);

  const known = (id) => !materialIds || materialIds.has(id);
  if (raw.shortlist !== undefined && !Array.isArray(raw.shortlist)) throw new Error('"shortlist" must be a list.');
  const pins = [...new Set((raw.shortlist ?? []).filter((id) => typeof id === 'string'))];
  const kept = pins.filter(known);
  if (kept.length < pins.length) warnings.push(`${pins.length - kept.length} shortlisted material(s) are not in this database snapshot and were dropped.`);
  if (kept.length > SHORTLIST_MAX) warnings.push(`The shortlist holds at most ${SHORTLIST_MAX}; the first ${SHORTLIST_MAX} were kept.`);
  out.shortlist = kept.slice(0, SHORTLIST_MAX);

  if (raw.assumptions !== undefined && !Array.isArray(raw.assumptions)) throw new Error('"assumptions" must be a list.');
  out.assumptions = (raw.assumptions ?? []).map((a, i) => {
    if (!isObject(a) || typeof a.materialId !== 'string' || typeof a.property !== 'string'
      || typeof a.value !== 'number' || !Number.isFinite(a.value)) {
      throw new Error(`Assumption ${i + 1} needs a material, a property and a numeric value.`);
    }
    return { ...a };
  });

  out.plot = { ...base.plot, ...(isObject(raw.plot) ? raw.plot : {}) };
  if (out.plot.parallelAxes !== undefined && !Array.isArray(out.plot.parallelAxes)) delete out.plot.parallelAxes;
  out.lens = LENSES.has(raw.lens) ? raw.lens : 'table';
  out.columnSet = COLUMN_SETS.has(raw.columnSet) ? raw.columnSet : 'properties';
  out.useEstimates = raw.useEstimates !== false;
  out.template = typeof raw.template === 'string' ? raw.template : null;
  for (const key of ['openMaterial', 'baseline']) {
    const id = raw[key];
    out[key] = typeof id === 'string' && known(id) ? id : null;
  }

  if (meta && raw.dbSnapshot && raw.dbSnapshot !== meta.snapshot) {
    warnings.push(`This selection was made against database snapshot ${raw.dbSnapshot}; this build embeds ${meta.snapshot}. Results may differ.`);
  }
  out.dbSnapshot = raw.dbSnapshot ?? base.dbSnapshot;
  return { scenario: out, warnings };
}

export function deserialize(text, meta, options) {
  let raw;
  try { raw = JSON.parse(text); } catch { throw new Error('The file is not valid JSON.'); }
  if (isObject(raw) && raw.version === undefined) throw new Error('The file has no scenario version.');
  return validateScenario(raw, meta, options);
}

/** URL hash serialization, for sharing a filter state. */
export function toHash(scenario) {
  const compact = {
    c: scenario.constraints, u: scenario.unknownPolicy, s: scenario.shortlist,
    p: scenario.plot, t: scenario.template, l: scenario.lens, m: scenario.openMaterial ?? null, e: scenario.useEstimates !== false, k: scenario.columnSet ?? 'properties', b: scenario.baseline ?? null,
    // The assumptions and the snapshot are part of the question. A link without them reproduced a
    // different result, silently, after a database update or whenever an assumption was in play.
    a: scenario.assumptions?.length ? scenario.assumptions : undefined,
    d: scenario.dbSnapshot ?? undefined,
  };
  return encodeURIComponent(JSON.stringify(compact));
}

/**
 * Read a hash. Returns null for no hash; throws for one that cannot be read, so the caller can say
 * so instead of quietly starting from defaults.
 */
export function fromHash(hash, meta, options) {
  if (!hash) return null;
  let c;
  try { c = JSON.parse(decodeURIComponent(hash)); } catch { throw new Error('The link is damaged or incomplete.'); }
  if (!isObject(c)) throw new Error('The link does not describe a selection.');
  return validateScenario({
    version: SCENARIO_VERSION, constraints: c.c, unknownPolicy: c.u, shortlist: c.s, plot: c.p,
    template: c.t, lens: c.l, openMaterial: c.m, useEstimates: c.e, columnSet: c.k, baseline: c.b,
    assumptions: c.a, dbSnapshot: c.d,
  }, meta, options);
}

/**
 * A user assumption stands in for a missing value inside one scenario only. It must be visible
 * everywhere the candidate appears and must never be written back to the database.
 */
export function applyAssumptions(material, assumptions, units = {}) {
  const mine = assumptions.filter((a) => a.materialId === material.id || a.materialId === '*');
  if (!mine.length) return { material, assumed: [] };
  const headline = { ...material.headline };
  const assumed = [];
  for (const a of mine) {
    if (headline[a.property]?.known) continue; // never overwrite observed data
    // Nor a statement that the property does not apply: a "*" assumption once gave an elastomer a heat deflection that
    // passed Strict (audit 2026-09-15, A-03). An assumption without a unit takes the headline's own.
    if (headline[a.property]?.notApplicable) continue;
    headline[a.property] = {
      known: true, value: a.value, unit: a.unit ?? headline[a.property]?.unit ?? units[a.property] ?? '', origin: 'assumption',
      interval: { lo: a.value, hi: a.value, kind: 'point' }, assumption: true, note: a.note ?? null,
    };
    assumed.push(a.property);
  }
  return { material: { ...material, headline, assumptionDependent: assumed.length > 0 }, assumed };
}
