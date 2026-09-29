// Scenario state: everything that must be recorded for a selection result to be reproducible by
// someone else, and everything that travels in a shared link.
//
// A scenario is the user's question, never the answer and never the data. It holds the constraints,
// the unknown-data policy, the shortlist, the plot settings and any user assumptions. Assumptions
// are scenario data and never database edits: the compiled snapshot is read-only at runtime, so a
// stand-in value lives here and is marked wherever it surfaces.

import { normalizePolicy } from './constraints.js';
import { INDICES } from './indices.js';
import { normalizeEvidence } from './products.js';

// Version 2 (D107) adds the decision workspace: one goal where there were two (the table's rankBy and the chart's
// plot.index), and the chart's view and context layers. A version 1 scenario is read without losing its question, and
// says what changed (migrateV1). A version 2 scenario saved while the chart's line could keep products (objective
// stages, removed by D108) is read with its line placed at the cutoff, and says that nothing is set aside any more.
export const SCENARIO_VERSION = 2;
/** The Ashby lens's views: the decision products and the material overview, then the catalogue and evidence views. */
export const WORKSPACE_VIEWS = ['decision', 'overview', 'catalogue', 'measured', 'measured-mixed'];
const LAYERS = ['failed', 'unresolved', 'front'];
const POPULATIONS = new Set(['confirmed', 'judged']);
const FOCUS_MAX = 60;

export function newScenario(meta) {
  return {
    version: SCENARIO_VERSION,
    // The release the answers were computed on (D96): what the scenario's evidence and rules were. The data date beside
    // it is for a reader; it stayed one date while the data changed, so it identifies nothing.
    release: meta?.release?.id ?? null,
    dbSnapshot: meta?.snapshot ?? null,
    appBuild: meta?.build ?? null,
    created: new Date().toISOString(),
    constraints: [],
    unknownPolicy: 'strict',
    preferences: [],
    assumptions: [],
    shortlist: [],
    // The chart (D107): the view, its axes and scales, the goal's line position (indexM), which context layers are drawn,
    // and a deliberate focus. Display only: nothing here changes an answer, a count of candidates or a rank.
    plot: { x: 'density', y: 'tensileModulusXY', xLog: false, yLog: false, view: 'decision', showReference: false, showEstimates: false,
      layers: { failed: false, unresolved: null, front: false }, population: 'confirmed', indexM: null, focus: [] },
    lens: 'table',
    openMaterial: null,
    useEstimates: true,
    columnSet: 'properties',
    baseline: null,
    template: null,
    // The goal the survivors are ranked by: a performance index, computed product by product (D83), or none. Since D107 it
    // is also the chart's goal: its line, its axes and its result list.
    rankBy: null,
    // Which values decide: comparable only, or also those published without their direction or load (D84).
    evidence: 'comparable',
    // The states a product may be judged in (D99): used as printed unless annealing is available (up to an oven
    // temperature, or any), and asked about dry unless the part will live conditioned by the air's moisture.
    anneal: false,
    annealMaxC: null,
    moisture: 'dry',
    // The products the team chose (D103): each exact product, the state its answer was in, the release and the day it was
    // chosen on, a note, and the team's own test results for it. A decision record beside the question, never data.
    decisions: [],
  };
}

/** How many products a scenario holds as chosen. */
export const DECISIONS_MAX = 12;
const TEST_FIELDS = ['date', 'operator', 'recipe', 'orientation', 'conditioning', 'method', 'result', 'notes'];
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 2000) : null);

/** A chosen product as a file or a link holds it, checked: its fields are strings, its tests rows of strings. */
function decisionOf(d) {
  return {
    gradeId: d.gradeId, stateId: str(d.stateId), release: str(d.release), chosenOn: str(d.chosenOn), note: str(d.note),
    tests: (Array.isArray(d.tests) ? d.tests : []).filter(isObject).slice(0, 50)
      .map((t) => Object.fromEntries(TEST_FIELDS.map((k) => [k, str(t[k])]))),
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
const FACETS = new Set(['reinforcement', 'esd', 'flexible', 'supportMaterial', 'flameRetardant', 'family', 'polymer']);

export function validateScenario(raw, meta, { materialIds = null, headlineKeys = null, gradeIds = null } = {}) {
  if (!isObject(raw)) throw new Error('The file does not contain a scenario object.');
  if (raw.version !== undefined && raw.version !== 1 && raw.version !== SCENARIO_VERSION) {
    throw new Error(`Scenario version ${raw.version} cannot be read by this build.`);
  }
  const warnings = [];
  const base = newScenario(meta);
  const legacy = raw.version === 1 || raw.version === undefined;
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
  // Unsettled products are null until the reader sets them: then they follow the Candidate confidence (D109).
  out.plot.layers = Object.fromEntries(LAYERS.map((k) => {
    const v = isObject(out.plot.layers) ? out.plot.layers[k] : undefined;
    return [k, k === 'unresolved' && typeof v !== 'boolean' ? null : v === true];
  }));
  out.plot.population = POPULATIONS.has(out.plot.population) ? out.plot.population : 'confirmed';
  out.plot.showEstimates = out.plot.showEstimates === true;
  out.plot.showReference = out.plot.showReference === true;
  out.plot.indexM = typeof out.plot.indexM === 'number' && Number.isFinite(out.plot.indexM) && out.plot.indexM > 0 ? out.plot.indexM : null;
  out.plot.focus = (Array.isArray(out.plot.focus) ? out.plot.focus : []).filter((id) => typeof id === 'string' && (!materialIds || materialIds.has(id))).slice(0, FOCUS_MAX);
  out.lens = LENSES.has(raw.lens) ? raw.lens : 'table';
  out.columnSet = COLUMN_SETS.has(raw.columnSet) ? raw.columnSet : 'properties';
  out.useEstimates = raw.useEstimates !== false;
  out.template = typeof raw.template === 'string' ? raw.template : null;
  out.rankBy = INDICES.some((i) => i.id === raw.rankBy) ? raw.rankBy : null;
  if (legacy) warnings.push(...migrateV1(raw, out));
  else out.plot.view = WORKSPACE_VIEWS.includes(out.plot.view) ? out.plot.view : 'decision';
  delete out.plot.index;
  delete out.plot.indexSlider;
  // Objective stages (D107) kept the products at or above a goal's line; D108 removed them, since the requirements are
  // the one filter. A saved stage is not dropped silently: the line is placed at its cutoff and the reader is told.
  const stages = Array.isArray(raw.stages) ? raw.stages.filter((st) => isObject(st) && typeof st.cutoff === 'number' && Number.isFinite(st.cutoff) && st.cutoff > 0) : [];
  if (stages.length) {
    const own = stages.filter((st) => st.index === out.rankBy).at(-1);
    if (own && out.plot.indexM === null) out.plot.indexM = own.cutoff;
    warnings.push(`This selection was saved with ${stages.length === 1 ? 'a step' : `${stages.length} steps`} that kept only the products above the goal's line. The chart no longer filters by its line, so nothing is set aside: the requirements alone decide what is shown${own ? ', and the line is placed where that step cut' : ''}.`);
  }
  delete out.stages;
  out.evidence = normalizeEvidence(raw.evidence);
  out.anneal = raw.anneal === true;
  out.annealMaxC = out.anneal && typeof raw.annealMaxC === 'number' && Number.isFinite(raw.annealMaxC) && raw.annealMaxC > 0 ? raw.annealMaxC : null;
  out.moisture = raw.moisture === 'conditioned' ? 'conditioned' : 'dry';
  if (raw.decisions !== undefined && !Array.isArray(raw.decisions)) throw new Error('"decisions" must be a list.');
  const chosen = (raw.decisions ?? []).filter((d) => isObject(d) && typeof d.gradeId === 'string');
  const knownGrade = chosen.filter((d) => !gradeIds || gradeIds.has(d.gradeId));
  if (knownGrade.length < chosen.length) warnings.push(`${chosen.length - knownGrade.length} chosen product(s) are not in this database and were dropped.`);
  out.decisions = [...new Map(knownGrade.map((d) => [d.gradeId, decisionOf(d)])).values()].slice(0, DECISIONS_MAX);
  for (const key of ['openMaterial', 'baseline']) {
    const id = raw[key];
    out[key] = typeof id === 'string' && known(id) ? id : null;
  }

  const release = releaseNote(raw, meta);
  if (release) warnings.push(release);
  // Reopened, the question is asked of this page's release, and saving it again records that release, so a second
  // opening does not warn about a difference already said.
  out.release = base.release ?? (typeof raw.release === 'string' ? raw.release : null);
  out.dbSnapshot = base.dbSnapshot ?? raw.dbSnapshot ?? null;
  return { scenario: out, warnings };
}

/**
 * Read a version 1 scenario into version 2 (D107), keeping its question: requirements, assumptions, service state,
 * annealing, shortlist, chosen products and release are carried as they were. What changes is said:
 *
 * - One goal. Version 1 had two: the table's rankBy and the chart's guide line (plot.index). The table's wins, since it
 *   ordered the answers and the export; a guide line alone becomes the goal. Where they differed, the reader is told.
 * - The chart's view. A version 1 chart drew published values, state-independent, as its catalogue or evidence views
 *   still do. A scenario that was on the chart, or had chosen what its points show, opens in that view, marked as such,
 *   with the decision workspace one press away; it is never silently turned into an exact-state decision picture. One
 *   that never used the chart opens in the decision workspace, having nothing to preserve.
 */
function migrateV1(raw, out) {
  const notes = [];
  const plot = isObject(raw.plot) ? raw.plot : {};
  const guide = INDICES.some((i) => i.id === plot.index) ? plot.index : null;
  if (!out.rankBy && guide) out.rankBy = guide;
  else if (out.rankBy && guide && guide !== out.rankBy) {
    const name = (id) => INDICES.find((i) => i.id === id)?.designCase ?? id;
    notes.push(`This selection ranked by "${name(out.rankBy)}" and drew the chart's guide line for "${name(guide)}". The workspace now has one goal for the table, the chart and the export: "${name(out.rankBy)}", the ranking the table and export used.`);
  }
  if (out.plot.indexM !== null && guide !== out.rankBy) out.plot.indexM = null;
  const level = plot.detail ?? (plot.pointLevel === 'measurements' ? (plot.comparability === 'broad' ? 'measured-mixed' : 'measured') : null);
  const used = raw.lens === 'ashby' || level !== null || !!guide;
  const legacyView = { material: 'catalogue', products: 'catalogue', measured: 'measured', 'measured-mixed': 'measured-mixed' }[level ?? 'material'];
  out.plot.view = used ? legacyView : 'decision';
  if (used) {
    notes.push(`This selection was saved before the decision workspace (scenario version 1), when the Ashby chart drew published values that do not depend on the state a product is judged in. Its chart opens on the published data it was saved with (${legacyView === 'catalogue' ? 'typical published values' : 'test pairs'}). Choose "Products" to draw each product in the state its answer is in, with its rank and line; its requirements and answers are the same either way.`);
  }
  return notes;
}

/**
 * What a reader must be told when a scenario is reopened on another release (D96): its answers were computed on other
 * evidence or rules, and are computed again here. The same data date is no reassurance, because data changed under one
 * date for a week. A scenario from before releases carried only a date, and says that its identity cannot be checked.
 * Null when there is nothing to say.
 */
function releaseNote(raw, meta) {
  const current = meta?.release?.id ?? null;
  const saved = typeof raw.release === 'string' && raw.release ? raw.release : null;
  const date = (d) => (d ? ` (data of ${d})` : '');
  if (current && saved && saved !== current) {
    return `This selection was saved on release ${saved}${date(raw.dbSnapshot)}; this page is release ${current}${date(meta.snapshot)}. `
      + `Its requirements are asked again of this release's evidence and rules, so its answers may differ. The page of release ${saved} `
      + `is kept as the project's release h2c-${saved}, and opens the answers it was saved with.`;
  }
  if (current && !saved && raw.dbSnapshot) {
    return `This selection was saved before pages carried a release${date(raw.dbSnapshot)}, so whether its evidence has changed cannot be checked. `
      + `Its requirements are asked of this page's release ${current}${date(meta.snapshot)}.`;
  }
  // Neither side identified: the date is all there is to compare, as before releases.
  if (!current && meta && raw.dbSnapshot && raw.dbSnapshot !== meta.snapshot) {
    return `This selection was made against database snapshot ${raw.dbSnapshot}; this build embeds ${meta.snapshot}. Results may differ.`;
  }
  return null;
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
    // The scenario version (D107): a link without it is version 1, and is migrated as a saved file is.
    x: SCENARIO_VERSION,
    c: scenario.constraints, u: scenario.unknownPolicy, s: scenario.shortlist,
    p: scenario.plot, t: scenario.template, l: scenario.lens, m: scenario.openMaterial ?? null, e: scenario.useEstimates !== false, k: scenario.columnSet ?? 'properties', b: scenario.baseline ?? null,
    // The assumptions and the snapshot are part of the question. A link without them reproduced a
    // different result, silently, after a database update or whenever an assumption was in play.
    a: scenario.assumptions?.length ? scenario.assumptions : undefined,
    d: scenario.dbSnapshot ?? undefined,
    // The release the link's answers were computed on (D96).
    i: scenario.release ?? undefined,
    // Only when set, so a link without them reads as it always did.
    r: scenario.rankBy ?? undefined,
    v: scenario.evidence === 'as-published' ? 'as-published' : undefined,
    // Annealing permitted (true, or the oven's highest temperature) and a conditioned service state (D99).
    n: scenario.anneal ? (scenario.annealMaxC ?? true) : undefined,
    w: scenario.moisture === 'conditioned' ? 'conditioned' : undefined,
    // The chosen products, without their notes and tests, which travel in the saved file (D103).
    h: scenario.decisions?.length ? scenario.decisions.map((d) => [d.gradeId, d.stateId ?? null, d.release ?? null, d.chosenOn ?? null]) : undefined,
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
    version: c.x === SCENARIO_VERSION ? SCENARIO_VERSION : 1, constraints: c.c, unknownPolicy: c.u, shortlist: c.s, plot: c.p,
    template: c.t, lens: c.l, openMaterial: c.m, useEstimates: c.e, columnSet: c.k, baseline: c.b,
    assumptions: c.a, dbSnapshot: c.d, release: c.i, rankBy: c.r, evidence: c.v,
    anneal: c.n === true || typeof c.n === 'number', annealMaxC: typeof c.n === 'number' ? c.n : null, moisture: c.w,
    decisions: Array.isArray(c.h) ? c.h.filter(Array.isArray).map(([gradeId, stateId, release, chosenOn]) => ({ gradeId, stateId, release, chosenOn })) : undefined,
    // Objective stages, as links carried them before D108 (read to say what became of them).
    stages: Array.isArray(c.g) ? c.g.filter(Array.isArray).map(([index, cutoff]) => ({ index, cutoff })) : undefined,
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
