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

/**
 * A state identifier read back into its parts, as stateId writes them: "annealed:120:16+conditioned" is annealed at
 * 120 °C for 16 h and conditioned. Null for an identifier stateId could not have written.
 */
export function parseStateId(id) {
  if (typeof id !== 'string' || !id) return null;
  let treatment = null, moisture = 'dry';
  for (const part of id.split('+')) {
    if (part === 'as-printed') continue;
    if (part === 'conditioned') { moisture = 'conditioned'; continue; }
    const m = /^annealed:([^:]+):([^:]+)$/.exec(part);
    const n = (v) => (v === 'x' ? null : Number(v));
    if (!m || [m[1], m[2]].some((v) => v !== 'x' && !Number.isFinite(Number(v)))) return null;
    treatment = { tempC: n(m[1]), hours: n(m[2]) };
  }
  return { treatment, moisture };
}

/**
 * A product's state by its identifier (D99, D107). A state the product publishes is that state. A named state it does not
 * publish is that state holding no values, as scenarioStates makes it for the conditioned service state of a product that
 * publishes only dry values: its answer, its rank and its point on a chart are then unknown on everything the state
 * changes, and never read from another state. Only no identifier at all means the product's first state, as printed and
 * dry. Returning the first state for a missing name had ranked 77 materials for a conditioned question on dry stiffness.
 */
export function stateOf(grade, id) {
  if (!id) return firstState(grade);
  const own = grade.states?.find((s) => s.id === id);
  if (own) return own;
  // A product the build gave no states (an older snapshot, a test) is its headline, which is its first state.
  if (!grade.states?.length && id === firstState(grade).id) return firstState(grade);
  const parsed = parseStateId(id);
  return { id, treatment: parsed?.treatment ?? null, moisture: parsed?.moisture ?? 'dry', values: {}, synthetic: true };
}

/**
 * The state whose value a headline of a product in a state is (D99): the state's own where the treatment or moisture
 * changes the headline, and the product's first state's where the registry declares it unchanged (a density). The chart
 * and the inspector say which, so a density read from the as-printed state beside an annealed stiffness is labelled.
 */
export function valueStateOf(grade, key, state, ctx = {}) {
  const first = firstState(grade);
  if (!state || state === first || state.id === first.id) return first;
  const def = ctx.db?.registry?.headlines?.find((h) => h.key === key);
  const changes = (state.treatment && (def ? def.changesWithAnnealing : true)) || (state.moisture === 'conditioned' && (def ? def.changesWithMoisture : true));
  return changes ? state : first;
}

/** Each material's products: its active procurement grades, in the material's order. */
export function productsByMaterial(db) {
  const byId = new Map(db.grades.map((g) => [g.id, g]));
  return new Map(db.materials.map((m) => [m.id, (m.gradeIds ?? []).map((id) => byId.get(id)).filter((g) => g && !g.retired)]));
}

/**
 * The value a state holds for a headline (D99). A headline the state's treatment or moisture changes is the state's own
 * value; one it does not change (a density, and a glass transition under annealing) is the product's first state's.
 */
// Without a registry (a hand-built material in a test) every headline is taken to change with the state (valueStateOf).
const stateValue = (grade, key, state, ctx) => valueStateOf(grade, key, state, ctx).values?.[key];

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
  // The greatest endpoint one test prints, and the endpoints compared (build/src/products.js, D126).
  if (v.endpoints) h.endpoints = v.endpoints;
  if (v.priceIds) Object.assign(h, { priceIds: v.priceIds, observations: v.observations });
  // A twin's value is its sibling's, from the same sheet (D89); the reason says so.
  if (v.from) h.from = v.from;
  return h;
}

/**
 * One headline of a product view. A product value that may decide becomes the headline; otherwise the product has no
 * value here, and says whether it publishes one that is not comparable. The material's estimate stands in only where
 * none of its products publishes a comparable value in older snapshots. D137 reads a product's own prediction
 * in as-printed, dry contexts regardless of sibling coverage, without changing a measured value.
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
  const prediction = grade.estimate?.[key];
  // D137 product predictions are available independently of sibling coverage. Older
  // snapshots keep their D83 material fallback; no saved-scenario fields change.
  if (prediction?.screening && !judged.treatment && judged.moisture === 'dry') {
    entry.estimate = prediction;
    entry.impliedBounds = prediction.impliedBounds ?? [];
  } else if (!(grade.estimateVersion >= 2 || ctx.db?.meta?.estimateModel?.gradeEstimates?.version >= 2) && !prediction?.screening && base.estimate && !(material.summary?.[key]?.n > 0)) {
    entry.estimate = base.estimate;
    entry.impliedBounds = base.impliedBounds ?? [];
  }
  const related = (prediction?.evidence ?? []).flatMap((o) => o.measurementIds ?? [])
    .map((id) => ctx.measurementById?.get(id)).filter((x) => x?.gradeId === grade.id);
  if (related.length) {
    entry.related = related.slice(0, 3).map((x) => `${x.property} ${x.value} ${x.unit} (${x.specimenType ?? 'specimen not stated'}, ${x.direction ?? 'direction not stated'})`);
    if (!v) entry.missing = 'not-comparable';
  }
  return entry;
}

const NO_PROFILE = { verdict: 'unknown', reason: 'No print profile recorded for this product' };

/**
 * A product's print gates, from its own recipe; a product with none is unknown on each, never a pass. Where its own
 * profiles are silent on a part, the build read its twin's (D89) or its material's printer maker's guide (D88); that
 * part decides like the product's own, and its reason and `…From` label say where it came from. Drying is what the
 * sheet asks for (required, optional, not-needed; D127), unknown where nothing is stated.
 */
export function productGates(material, grade) {
  const p = grade.print;
  const axis = (a) => (p?.profileIds.length || p?.from?.[a] ? { verdict: p[a].verdict, reason: p[a].reason } : NO_PROFILE);
  const gates = {
    ...material.gates,
    nozzle: axis('nozzle'), bed: axis('bed'), chamber: axis('chamber'),
    abrasive: p?.hardenedNozzle === true ? 'requires-hardened' : p?.hardenedNozzle === false ? 'no-special-concern' : 'unknown',
    drying: p?.drying?.need ?? 'unknown',
  };
  if (p?.from?.hardenedNozzle && p.hardenedNozzle != null) gates.abrasiveFrom = p.from.hardenedNozzle.label;
  if (p?.from?.drying && p.drying) gates.dryingFrom = p.from.drying.label;
  return gates;
}

/**
 * How many of a material's products state that they need a hardened nozzle, that they do not, or nothing. A material's
 * own gate is the union (any product that needs one), which read as "PLA needs a hardened nozzle" because six
 * metal-filled grades of 250 profiles do (the PM trial of 2026-10-01, PM-03); a reader is told the share instead.
 */
export function hardenedShare(grades) {
  const products = (grades ?? []).filter((g) => !/-R\d+$/.test(g.id) && !g.retired);
  const need = products.filter((g) => g.print?.hardenedNozzle === true);
  return { need: need.length, notNeeded: products.filter((g) => g.print?.hardenedNozzle === false).length, total: products.length, needing: need };
}

/** "6 of 200 products" style words for a hardened-nozzle share, or null where no product states one. */
export function hardenedWords(share) {
  if (!share?.need) return null;
  if (share.need === share.total) return share.total === 1 ? 'its product needs one' : `all ${share.total} products need one`;
  return `${share.need} of ${share.total} products need one`;
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
