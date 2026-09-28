// A material answered by its products (re-center phase 2; docs/GOALS.md, D83 and D84).
//
// The build gives every product its own values and print recipe (build/src/products.js). A product view is the
// material with one product's values and recipe in place of the material's own, so every criterion the engine already
// knows (a numeric limit, a print gate, a facet, an environment record) is judged on that product with no second copy
// of the rules. constraints.js runs the views and rolls them up: a material passes when at least one of its products
// meets every requirement at once, and says how many do.
//
// Pure: no DOM, no globals, no imports from ../ui.

/** How a material's products answered: all that could be judged pass, some do, or none does. */
export const SHARE = { ALL: 'all', SOME: 'some', NONE: 'none' };

/**
 * Which values may decide. `comparable` (the default) is a printed or unstated specimen, the headline's direction,
 * dry or unstated, at its load; `as-published` also admits values whose source leaves the direction or the load
 * unstated, which read like moulded bars and flatter a printed part (D84).
 */
export const EVIDENCE = { COMPARABLE: 'comparable', AS_PUBLISHED: 'as-published' };
export const normalizeEvidence = (v) => (v === EVIDENCE.AS_PUBLISHED ? EVIDENCE.AS_PUBLISHED : EVIDENCE.COMPARABLE);

/**
 * A product's decision states (D99): the build gives each product the states its own sheets publish values for, as
 * printed and dry first (build/src/products.js). A state's identifier names its treatment and moisture:
 * "as-printed", "annealed:120:16", "conditioned", "annealed:120:16+conditioned" (x: a part the sheet does not state).
 */
export const stateId = (treatment, moisture) => [treatment ? `annealed:${treatment.tempC ?? 'x'}:${treatment.hours ?? 'x'}` : null,
  moisture === 'conditioned' ? 'conditioned' : null].filter(Boolean).join('+') || 'as-printed';

/** The first state: as printed and dry. A product the build gave no states (an older snapshot, a test) is its headline. */
export const firstState = (grade) => grade.states?.[0] ?? { id: 'as-printed', treatment: null, moisture: 'dry', values: grade.headline ?? {} };

/** What a scenario permits (D99): annealing, and up to which oven temperature, and which service state it asks about. */
export function statePolicy(ctx = {}) {
  return {
    anneal: ctx.anneal === true,
    annealMaxC: Number.isFinite(ctx.annealMaxC) ? ctx.annealMaxC : null,
    moisture: ctx.moisture === 'conditioned' ? 'conditioned' : 'dry',
  };
}

/**
 * The states a scenario may judge a product in (D99), as printed first. A product is used as printed unless the scenario
 * permits annealing, and then only at a schedule its oven reaches; it is judged in the service state the scenario asks
 * about, dry by default. A product with no value in the asked-for moisture state is still judged there, and is unknown
 * on what it does not publish: nothing is inferred from another state.
 */
export function scenarioStates(grade, ctx = {}) {
  const policy = statePolicy(ctx);
  const all = grade.states?.length ? grade.states : [firstState(grade)];
  const out = all.filter((s) => (s.moisture ?? 'dry') === policy.moisture
    && (!s.treatment || (policy.anneal && (policy.annealMaxC == null || s.treatment.tempC == null || s.treatment.tempC <= policy.annealMaxC))));
  if (!out.some((s) => !s.treatment)) out.unshift({ id: stateId(null, policy.moisture), treatment: null, moisture: policy.moisture, values: {} });
  return out;
}

/** A product's state by its identifier, or its first. */
export const stateOf = (grade, id) => (id && grade.states?.find((s) => s.id === id)) || firstState(grade);

/** Each material's products: its active procurement grades, in the material's order. */
export function productsByMaterial(db) {
  const byId = new Map(db.grades.map((g) => [g.id, g]));
  return new Map(db.materials.map((m) => [m.id, (m.gradeIds ?? []).map((id) => byId.get(id)).filter((g) => g && !g.retired)]));
}

/**
 * The value a state holds for a headline (D99). A headline the state's treatment or moisture changes is the state's own
 * value; one it does not change (a density, and a glass transition under annealing) is the product's first state's.
 */
function stateValue(grade, key, state, ctx) {
  const first = firstState(grade);
  if (!state || state === first || state.id === first.id) return first.values?.[key];
  const def = ctx.db?.registry?.headlines?.find((h) => h.key === key);
  // Without a registry (a hand-built material in a test) every headline is taken to change with the state.
  const changes = (state.treatment && (def ? def.changesWithAnnealing : true)) || (state.moisture === 'conditioned' && (def ? def.changesWithMoisture : true));
  return changes ? state.values?.[key] : first.values?.[key];
}

function productValueHeadline(base, grade, v, measurementById) {
  const h = {
    known: true, value: v.value, unit: base.unit, origin: 'source', verified: true,
    measurementId: v.measurementId ?? null, gradeId: grade.id,
    sourceId: measurementById?.get(v.measurementId)?.sourceId ?? null,
    interval: v.interval ?? { lo: v.value, hi: v.value, kind: 'point' },
    uncertainty: v.uncertainty ?? null,
    level: v.level,
  };
  if (v.direction) h.direction = v.direction;
  if (v.caveat) h.caveat = v.caveat;
  if (v.anneal) h.anneal = v.anneal;
  if (v.admitted) h.admitted = v.admitted;
  if (v.standards) h.standards = v.standards;
  if (v.priceIds) Object.assign(h, { priceIds: v.priceIds, observations: v.observations });
  // A twin's value is its sibling's, from the same sheet (D89); the reason says so.
  if (v.from) h.from = v.from;
  return h;
}

/**
 * One headline of a product view. A product value that may decide becomes the headline; otherwise the product has no
 * value here, and says whether it publishes one that is not comparable. The material's estimate stands in only where
 * none of its products publishes a comparable value, which is where it was built to (D43, D83): a product that is
 * silent beside siblings that publish is untested, not estimated.
 */
export function productHeadline(material, grade, key, ctx = {}, state = null) {
  const base = material.headline?.[key];
  if (!base || base.notApplicable) return base;
  const v = stateValue(grade, key, state, ctx);
  const evidence = normalizeEvidence(ctx.evidence);
  const decides = v && (v.level === 'comparable' || evidence === EVIDENCE.AS_PUBLISHED);
  // A scenario assumption is the reader's own number for a material's missing value; it stands in for a product that
  // publishes nothing that may decide, and never over a value that does.
  if (!decides && base.assumption) return base;
  if (decides) return productValueHeadline(base, grade, v, ctx.measurementById);
  const entry = {
    known: false, unit: base.unit,
    missing: v ? 'not-comparable' : key === 'priceCADkg' ? 'not-available-in-market' : 'not-published',
  };
  if (v) entry.asPublished = { value: v.value, caveat: v.caveat, measurementId: v.measurementId };
  // A value this product publishes in another state: the reason names it, and what would let it decide (D99).
  const judged = state ?? firstState(grade);
  const elsewhere = (grade.states ?? []).filter((s) => s.id !== judged.id && s.values?.[key] && stateValue(grade, key, s, ctx) === s.values[key])
    .map((s) => ({ stateId: s.id, treatment: s.treatment, moisture: s.moisture, value: s.values[key].value, measurementId: s.values[key].measurementId ?? null }));
  if (!v && elsewhere.length) entry.elsewhere = elsewhere;
  const summary = material.summary?.[key];
  if (base.estimate && !(summary?.n > 0)) {
    entry.estimate = base.estimate;
    entry.impliedBounds = base.impliedBounds ?? [];
  }
  return entry;
}

const NO_PROFILE = { verdict: 'unknown', reason: 'No print profile recorded for this product' };

/**
 * A product's print gates, from its own recipe; a product with none is unknown on each, never a pass. Where its own
 * profiles are silent on a part, the build read its twin's (D89) or its material's printer maker's guide (D88); that
 * part decides like the product's own, and its reason and `…From` label say where it came from.
 */
export function productGates(material, grade) {
  const p = grade.print;
  const axis = (a) => (p?.profileIds.length || p?.from?.[a] ? { verdict: p[a].verdict, reason: p[a].reason } : NO_PROFILE);
  const gates = {
    ...material.gates,
    nozzle: axis('nozzle'), bed: axis('bed'), chamber: axis('chamber'),
    abrasive: p?.hardenedNozzle === true ? 'requires-hardened' : p?.hardenedNozzle === false ? 'no-special-concern' : 'unknown',
    drying: p?.drying ? 'required' : 'unknown',
  };
  if (p?.from?.hardenedNozzle && p.hardenedNozzle != null) gates.abrasiveFrom = p.from.hardenedNozzle.label;
  if (p?.from?.drying && p.drying) gates.dryingFrom = p.from.drying.label;
  return gates;
}

/**
 * The material with one product's values, recipe and offers. It keeps the material's ID, facets and scope, which are
 * the material's; a criterion that reads records (environment, offers, conflicts, exact-grade evidence) reads the
 * product's own through `product`, never its siblings' (D98).
 */
export function productView(material, grade, ctx = {}, state = null) {
  const headline = {};
  for (const key of Object.keys(material.headline ?? {})) headline[key] = productHeadline(material, grade, key, ctx, state);
  return { ...material, headline, gates: productGates(material, grade), buy: grade.buy ?? null, product: grade, state: state ?? firstState(grade) };
}
