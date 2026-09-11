import { normalizePolicy } from './constraints.js';
// Scenario state: what must be recorded for a selection result to be reproducible.
// Architecture brief section 18. Assumptions are scenario data and never database edits.

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
    template: null,
  };
}

export function serialize(scenario) {
  return JSON.stringify(scenario, null, 2);
}

export function deserialize(text, meta) {
  const s = JSON.parse(text);
  if (s.version !== SCENARIO_VERSION) throw new Error(`Scenario version ${s.version} cannot be read by this build`);
  s.unknownPolicy = normalizePolicy(s.unknownPolicy);
  const warnings = [];
  if (meta && s.dbSnapshot && s.dbSnapshot !== meta.snapshot) {
    warnings.push(`Scenario was built against database snapshot ${s.dbSnapshot}; this build embeds ${meta.snapshot}. Results may differ.`);
  }
  return { scenario: { ...newScenario(meta), ...s }, warnings };
}

/** URL hash serialization, for sharing a filter state. */
export function toHash(scenario) {
  const compact = {
    c: scenario.constraints, u: scenario.unknownPolicy, s: scenario.shortlist,
    p: scenario.plot, t: scenario.template, l: scenario.lens,
  };
  return encodeURIComponent(JSON.stringify(compact));
}

export function fromHash(hash, meta) {
  if (!hash) return null;
  try {
    const c = JSON.parse(decodeURIComponent(hash));
    return { ...newScenario(meta), constraints: c.c ?? [], unknownPolicy: normalizePolicy(c.u), shortlist: c.s ?? [], plot: { ...newScenario(meta).plot, ...(c.p ?? {}) }, template: c.t ?? null, lens: c.l ?? 'table' };
  } catch { return null; }
}

/**
 * A user assumption stands in for a missing value inside one scenario only. It must be visible
 * everywhere the candidate appears and must never be written back to the database.
 */
export function applyAssumptions(material, assumptions) {
  const mine = assumptions.filter((a) => a.materialId === material.id || a.materialId === '*');
  if (!mine.length) return { material, assumed: [] };
  const headline = { ...material.headline };
  const assumed = [];
  for (const a of mine) {
    if (headline[a.property]?.known) continue; // never overwrite observed data
    headline[a.property] = {
      known: true, value: a.value, unit: a.unit, origin: 'assumption',
      interval: { lo: a.value, hi: a.value, kind: 'point' }, assumption: true, note: a.note ?? null,
    };
    assumed.push(a.property);
  }
  return { material: { ...material, headline, assumptionDependent: assumed.length > 0 }, assumed };
}
