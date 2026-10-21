// A material answered by its products (re-center phase 2; docs/GOALS.md, D83 and D84).
//
// The build gives every product its own values and print recipe (build/src/products.js). A product view is the
// material with one product's values and recipe in place of the material's own, so every criterion the engine already
// knows (a numeric limit, a print gate, a facet, an environment record) is judged on that product with no second copy
// of the rules. constraints.js runs the views and rolls them up: a material passes when at least one of its products
// meets every requirement at once, and says how many do.
//
// Pure: no DOM, no globals, no imports from ../ui.

import type { EngineMissing, EvidenceLevel, GateVerdict, ServiceMoisture } from '@atlas/domain';
import type { Contribution, LedgerDb } from './ledger.ts';

export interface Treatment {
  readonly tempC: number | null;
  readonly hours: number | null;
}
export type Moisture = ServiceMoisture;
export type Admitted =
  /** What a value's reader admitted unstated (GOALS 2026-09-28, decision 5). */ 'direction' | 'specimen' | 'moisture' | 'treatment' | 'bar';
export type Caveat =
  /** Why a value is set apart (D172). */ 'not-described' | 'unstated-direction' | 'load-not-stated';
export type Interval =
  /** The range a value stands for: a point, a mean with a band, a range, or a one-sided bound. */
  | { readonly lo: number; readonly hi: number; readonly kind: 'point' | 'uncertainty' | 'range'; readonly openLow?: boolean; readonly openHigh?: boolean }
  | { readonly lo: number; readonly hi: null; readonly openLow: boolean; readonly kind?: undefined; readonly openHigh?: undefined }
  | { readonly lo: null; readonly hi: number; readonly openHigh: boolean; readonly kind?: undefined; readonly openLow?: undefined };
export interface Doubt {
  /** A record that contradicts a value, with where it puts it (C40, D153). */
  readonly rule: string;
  readonly lo: number | null;
  readonly hi: number | null;
  readonly measurementId?: string;
}
export interface TwinOrigin {
  /** A sibling's sheet a value was read from (D89). */
  readonly origin: 'twin';
  readonly gradeId: string;
  readonly label: string;
}
export interface ProductValue {
  /** A value a state holds for a headline (the build's productValue), with the records that back it. */
  readonly value: number;
  readonly measurementId?: string | null;
  readonly interval?: Interval;
  readonly uncertainty?: number;
  readonly level: EvidenceLevel;
  readonly direction?: string;
  readonly caveat?: Caveat;
  readonly anneal?: Treatment;
  readonly admitted?: readonly Admitted[];
  readonly standards?: readonly string[];
  readonly endpoints?: readonly { readonly measurementId: string; readonly property: string; readonly value: number }[];
  readonly priceIds?: readonly string[];
  readonly observations?: number;
  readonly from?: TwinOrigin;
  readonly ceilingOnly?: true;
  readonly doubtful?: readonly Doubt[];
}
export interface ProductState {
  /** One of a product's decision states (D99): as printed, annealed at a schedule, conditioned. */
  readonly id: string;
  readonly treatment: Treatment | null;
  readonly moisture?: Moisture;
  readonly values: Readonly<Record<string, ProductValue>>;
  readonly bounds?: Readonly<Record<string, LedgerBounds>>;
  readonly synthetic?: true;
}
export interface LedgerBounds {
  readonly lo: number | null;
  readonly hi: number | null;
  readonly openLow: boolean;
  readonly openHigh: boolean;
  readonly by: readonly Contribution[];
  readonly disagree?: true;
}
export interface PrintAxis {
  readonly verdict: GateVerdict;
  readonly reason: string;
}
export interface ProductPrint {
  /** A product's print recipe (the build's productPrint), as far as the engine reads it. */
  readonly profileIds: readonly string[];
  readonly nozzle: PrintAxis;
  readonly bed: PrintAxis;
  readonly chamber: PrintAxis;
  readonly hardenedNozzle?: boolean | null;
  readonly drying?: { readonly need: 'required' | 'optional' | 'not-needed' } | null;
  readonly nozzleAdvice?: NozzleAdvice;
  readonly from?: { readonly [part: string]: { readonly label: string; readonly origin?: string } | undefined };
}
export interface NozzleAdvice {
  /** A maker's note that a nozzle harder than brass, or wear, is a concern (the build's nozzleAdvice, D168). */
  readonly kind: 'harder-than-brass' | 'wear-caution';
  readonly text: string;
}
export interface Band {
  /** An end of a range, open where null. */
  readonly lo: number | null;
  readonly hi: number | null;
}
export interface OwnBand {
  /** What the estimate stage says of one headline (D43, D48, D59, D137, D167). */
  readonly disagree: boolean;
  readonly bands: readonly { readonly lo: number | null; readonly hi: number | null; readonly measurementIds?: readonly string[] }[];
  readonly lo?: number;
  readonly hi?: number;
}
export interface Prediction {
  /** The estimate stage's value for one headline of one product. */
  readonly lo: number;
  readonly hi: number;
  readonly unit: string;
  readonly centre?: number;
  readonly plausible?: { readonly lo: number; readonly hi: number };
  readonly screenRange?: Band | null;
  readonly canScreen?: boolean;
  readonly screenLimit?: string;
  readonly screening?: { readonly context?: unknown };
  readonly impliedBounds?: readonly unknown[];
  readonly ownBand?: OwnBand;
  readonly evidence?: readonly { readonly measurementIds?: readonly string[] }[];
  readonly [field: string]: unknown;
}
export interface ImpliedBound {
  /** A measurement of the material that bounds a headline from below (headline_definitions.csv Lower bound). */
  readonly lo: number;
  readonly property: string;
  readonly unit: string;
  readonly measurementId: string;
}
export interface Withheld {
  readonly centre?: number;
  readonly ownBand?: OwnBand;
}
export interface ProductGrade {
  readonly id: string;
  readonly manufacturer?: string;
  readonly product?: string;
  readonly twins?: readonly string[];
  readonly variant?: string | null;
  readonly claims?: readonly { readonly claim: string }[];
  readonly retired?: unknown;
  readonly states?: readonly ProductState[];
  readonly headline?: Readonly<Record<string, ProductValue>>;
  readonly buy?: unknown;
  readonly estimate?: Readonly<Record<string, Prediction | undefined>>;
  readonly estimateVersion?: number;
  readonly estimateWithheld?: Readonly<Record<string, Withheld | undefined>>;
  readonly print?: ProductPrint | null;
}
export interface MeasurementRecord {
  readonly id: string;
  readonly gradeId?: string;
  readonly sourceId?: string;
  readonly property?: string;
  readonly value?: unknown;
  readonly unit?: string;
  readonly specimenType?: string;
  readonly direction?: string;
}
export interface Elsewhere {
  /** A value the product publishes in a state this scenario does not judge it in (D99). */
  readonly stateId: string;
  readonly treatment: Treatment | null;
  readonly moisture?: Moisture | undefined;
  readonly value: number;
  readonly measurementId: string | null;
  readonly setApart?: boolean;
}
export interface HeadlineCommon {
  /** What a known and a missing headline share: the database's, or a product view's, which carries more (ledger, elsewhere, related ...). */
  unit: string;
  missing?: EngineMissing;
  notApplicable?: { readonly reason: string };
  assumption?: unknown;
  estimate?: Prediction;
  impliedBounds?: readonly unknown[];
  /** A product view's: the values set apart, the ledger's bounds, the value in another state, a ceiling, an estimate withheld. */
  asPublished?: { readonly value: number; readonly caveat?: Caveat | undefined; readonly measurementId?: string | null | undefined };
  elsewhere?: readonly Elsewhere[];
  ceiling?: KnownHeadline;
  ledger?: LedgerBounds;
  withheld?: Withheld;
  /** A list of sentences on a product view's headline; an object on the database's own (defect WP18-D2). */
  related?: readonly string[];
  interval?: Interval;
  uncertainty?: number | null;
  caveat?: Caveat;
  direction?: string;
  standards?: readonly string[];
  anneal?: Treatment;
  admitted?: readonly Admitted[];
  from?: TwinOrigin;
  doubtful?: readonly Doubt[];
  priceIds?: readonly string[];
  observations?: number;
  endpoints?: ProductValue['endpoints'];
  level?: EvidenceLevel;
  ceilingOnly?: boolean;
  measurementId?: string | null;
  gradeId?: string;
  sourceId?: string | null;
  spread?: { readonly n?: number; readonly min?: number; readonly max?: number };
  typical?: { readonly value?: number; readonly interval?: Interval };
  [field: string]: unknown;
}
export interface KnownHeadline extends HeadlineCommon {
  /** A headline with a value. */
  known: true;
  value: number;
}
export interface MissingHeadline extends HeadlineCommon {
  /** A headline with none: the reason is in `missing`. */
  known?: false;
  value?: undefined;
}
export type HeadlineBag = KnownHeadline | MissingHeadline;
export interface RegistryHeadline {
  /** A headline definition, as far as the engine reads it (headline_definitions.csv). */
  readonly key: string;
  readonly unit?: string;
  readonly better?: 'min' | 'max';
  readonly changesWithAnnealing?: boolean;
  readonly changesWithMoisture?: boolean;
  readonly testScatter?: { readonly value: number; readonly is: 'relative' | 'absolute' } | null;
  readonly labels?: { readonly plain?: string };
  readonly toughened?: string | null;
}
export interface ProductContext {
  /** What the engine reads of its context (main.js buildContext): the scenario's service state, and lookups. */
  readonly anneal?: boolean;
  readonly annealMaxC?: number | null;
  readonly moisture?: string;
  readonly evidence?: unknown;
  readonly measurementById?: ReadonlyMap<string, MeasurementRecord>;
  readonly db?: LedgerDb & {
    readonly registry?: { readonly headlines?: readonly RegistryHeadline[] };
    readonly meta?: {
      readonly estimateModel?: { readonly gradeEstimates?: { readonly version?: number } };
      readonly environmentCategories?: { readonly [category: string]: { readonly label?: string; readonly kind?: string } | undefined };
      readonly release?: { readonly id?: string };
    };
    readonly grades: readonly ProductGrade[];
    readonly measurements: readonly MeasurementRecord[];
  };
}
export type Gates = {
  /** A material's print gates, and a product view's: the nozzle, bed and chamber verdicts, and what the sheets say of abrasion and drying. */
  nozzle?: PrintAxis;
  bed?: PrintAxis;
  chamber?: PrintAxis;
  abrasive?: 'requires-hardened' | 'no-special-concern' | 'unknown';
  abrasiveFrom?: string;
  abrasiveAdvice?: NozzleAdvice;
  drying?: 'required' | 'optional' | 'not-needed' | 'unknown';
  dryingFrom?: string;
  [gate: string]: unknown;
};
export interface ProductMaterial {
  readonly id?: string;
  readonly headline?: Readonly<Record<string, HeadlineBag | undefined>>;
  readonly gates?: Gates;
  readonly summary?: Readonly<Record<string, { readonly n?: number } | undefined>>;
  readonly [field: string]: unknown;
}

/** How a material's products answered: all that could be judged pass, some do, or none does. */
export const SHARE = { ALL: 'all', SOME: 'some', NONE: 'none' };

/**
 * Which values may decide. `comparable` (the selector's, always) is a printed bar, said or implied by its document and
 * read flat where it states no orientation (an unstated specimen for a property that is not a bar's), the headline's
 * direction, dry or unstated, at its load (D172, D177); `as-published` is the engine's audit lens (`audit:gaps`), which
 * also admits the values set apart: a bar no document describes as printed, or no stated load (D84, D172).
 */
export const EVIDENCE = { COMPARABLE: 'comparable', AS_PUBLISHED: 'as-published' };
export const normalizeEvidence = (v: unknown) => (v === EVIDENCE.AS_PUBLISHED ? EVIDENCE.AS_PUBLISHED : EVIDENCE.COMPARABLE);

/**
 * A product's decision states (D99): the build gives each product the states its own sheets publish values for, as
 * printed and dry first (build/src/products.js). A state's identifier names its treatment and moisture:
 * "as-printed", "annealed:120:16", "conditioned", "annealed:120:16+conditioned" (x: a part the sheet does not state).
 */
export const stateId = (treatment: Treatment | null | undefined, moisture: string | undefined): string => [treatment ? `annealed:${treatment.tempC ?? 'x'}:${treatment.hours ?? 'x'}` : null,
  moisture === 'conditioned' ? 'conditioned' : null].filter(Boolean).join('+') || 'as-printed';

/** The first state: as printed and dry. A product the build gave no states (an older snapshot, a test) is its headline. */
export const firstState = (grade: ProductGrade): ProductState => grade.states?.[0] ?? { id: 'as-printed', treatment: null, moisture: 'dry', values: grade.headline ?? {} };

/** What a scenario permits (D99): annealing, and up to which oven temperature, and which service state it asks about. */
export function statePolicy(ctx: ProductContext = {}): { anneal: boolean; annealMaxC: number | null | undefined; moisture: Moisture } {
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
 * on what it does not publish: no value is filled from another state (the evidence ledger may bound it, D153).
 */
export function scenarioStates(grade: ProductGrade, ctx: ProductContext = {}): ProductState[] {
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
export function parseStateId(id: unknown): { treatment: Treatment | null; moisture: Moisture } | null {
  if (typeof id !== 'string' || !id) return null;
  let treatment: Treatment | null = null, moisture: Moisture = 'dry';
  for (const part of id.split('+')) {
    if (part === 'as-printed') continue;
    if (part === 'conditioned') { moisture = 'conditioned'; continue; }
    const m = /^annealed:([^:]+):([^:]+)$/.exec(part);
    const n = (v: string | undefined): number | null => (v === 'x' ? null : Number(v));
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
export function stateOf(grade: ProductGrade, id?: string | null): ProductState {
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
export function valueStateOf(grade: ProductGrade, key: string, state?: ProductState | null, ctx: ProductContext = {}): ProductState {
  const first = firstState(grade);
  if (!state || state === first || state.id === first.id) return first;
  const def = ctx.db?.registry?.headlines?.find((h) => h.key === key);
  const changes = (state.treatment && (def ? def.changesWithAnnealing : true)) || (state.moisture === 'conditioned' && (def ? def.changesWithMoisture : true));
  return changes ? state : first;
}

/** Each material's products: its active procurement grades, in the material's order. */
export function productsByMaterial(db: { readonly grades: readonly ProductGrade[]; readonly materials: readonly { readonly id: string; readonly gradeIds?: readonly string[] }[] }): Map<string, ProductGrade[]> {
  const byId = new Map(db.grades.map((g): [string, ProductGrade] => [g.id, g]));
  return new Map(db.materials.map((m): [string, ProductGrade[]] => [m.id, (m.gradeIds ?? []).map((id) => byId.get(id)).filter((g) => g && !g.retired) as ProductGrade[]]));
}

/**
 * The value a state holds for a headline (D99). A headline the state's treatment or moisture changes is the state's own
 * value; one it does not change (a density, and a glass transition under annealing) is the product's first state's.
 */
// Without a registry (a hand-built material in a test) every headline is taken to change with the state (valueStateOf).
const stateValue = (grade: ProductGrade, key: string, state: ProductState | null | undefined, ctx: ProductContext): ProductValue | undefined => valueStateOf(grade, key, state, ctx).values?.[key];
/**
 * What the evidence ledger bounds a headline to in a state (D153, D154): the build's bounds where the state holds no
 * deciding value, read from the state that holds the headline as its value is (valueStateOf). Null where none.
 */
export const stateBounds = (grade: ProductGrade, key: string, state: ProductState | null | undefined, ctx: ProductContext): LedgerBounds | null => valueStateOf(grade, key, state, ctx).bounds?.[key] ?? null;

function productValueHeadline(base: HeadlineBag, grade: ProductGrade, v: ProductValue, measurementById: ProductContext['measurementById']): KnownHeadline {
  const h: HeadlineBag = {
    known: true, value: v.value, unit: base.unit, origin: 'source', verified: true,
    measurementId: v.measurementId ?? null, gradeId: grade.id,
    sourceId: measurementById?.get(v.measurementId!)?.sourceId ?? null,
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
  // A value that is only a ceiling for the printed part (CV05), and one its own records or its kind's limit contradict
  // (C40): the engine reads both (D153, D154).
  if (v.ceilingOnly) h.ceilingOnly = true;
  if (v.doubtful) h.doubtful = v.doubtful;
  return h;
}

/**
 * One headline of a product view. A product value that may decide becomes the headline; otherwise the product has no
 * value here, and says whether it publishes one that is not comparable. The material's estimate stands in only where
 * none of its products publishes a comparable value in older snapshots. D137 reads a product's own prediction
 * in as-printed, dry contexts regardless of sibling coverage, without changing a measured value.
 */
export function productHeadline(material: ProductMaterial, grade: ProductGrade, key: string, ctx: ProductContext = {}, state: ProductState | null = null): HeadlineBag | undefined {
  const base = material.headline?.[key];
  if (!base || base.notApplicable) return base;
  const v = stateValue(grade, key, state, ctx);
  const evidence = normalizeEvidence(ctx.evidence);
  const decides = v && (v.level === 'comparable' || evidence === EVIDENCE.AS_PUBLISHED);
  // A scenario assumption is the reader's own number for a material's missing value; it stands in for a product that
  // publishes nothing that may decide, and never over a value that does.
  if (!decides && base.assumption) return base;
  // What the evidence ledger bounds it to where the state holds no deciding value (D153): the engine reads it after a
  // comparable value, which always wins, and before an estimate.
  const bounds = stateBounds(grade, key, state, ctx);
  if (decides) {
    const h = productValueHeadline(base, grade, v, ctx.measurementById);
    if (bounds) h.ledger = bounds;
    return h;
  }
  const entry: HeadlineBag = {
    known: false, unit: base.unit,
    missing: v ? 'not-comparable' : key === 'priceCADkg' ? 'not-available-in-market' : 'not-published',
  };
  if (bounds) entry.ledger = bounds;
  if (v) entry.asPublished = { value: v.value, caveat: v.caveat, measurementId: v.measurementId };
  // A PLA or PET heat deflection from a bar no document describes as printed is set apart (D172) and still the most a
  // printed part reaches (CV05, D166): it is read as the ceiling it is, as it was before it was set apart.
  if (v?.ceilingOnly) entry.ceiling = productValueHeadline(base, grade, v, ctx.measurementById);
  // A value this product publishes in another state: the reason names it, and what would let it decide (D99).
  const judged = state ?? firstState(grade);
  // A value set apart (D172) decides in no state: it is named as such, so the reason never offers it.
  const elsewhere = (grade.states ?? []).filter((s) => s.id !== judged.id && s.values?.[key] && stateValue(grade, key, s, ctx) === s.values[key])
    .map((s) => ({ stateId: s.id, treatment: s.treatment, moisture: s.moisture, value: s.values[key]!.value, measurementId: s.values[key]!.measurementId ?? null,
      ...(s.values[key]!.level !== 'comparable' && evidence !== EVIDENCE.AS_PUBLISHED ? { setApart: true } : {}) }));
  if (!v && elsewhere.length) entry.elsewhere = elsewhere;
  const prediction = grade.estimate?.[key];
  // D137 product predictions are available independently of sibling coverage. Older
  // snapshots keep their D83 material fallback; no saved-scenario fields change.
  if (prediction?.screening && !judged.treatment && judged.moisture === 'dry') {
    entry.estimate = prediction;
    entry.impliedBounds = prediction.impliedBounds ?? [];
  } else if (!(grade.estimateVersion! >= 2 || ctx.db?.meta?.estimateModel?.gradeEstimates?.version! >= 2) && !prediction?.screening && base.estimate && !(material.summary?.[key]?.n! > 0)) {
    entry.estimate = base.estimate;
    entry.impliedBounds = base.impliedBounds ?? [];
  }
  // An estimate withheld because the product's own values and its kind's model disagree (D167): said, with those values.
  const withheld = !entry.estimate && !judged.treatment && judged.moisture === 'dry' ? grade.estimateWithheld?.[key] : null;
  if (withheld) entry.withheld = withheld;
  const related = (prediction?.evidence ?? withheld?.ownBand?.bands ?? []).flatMap((o) => o.measurementIds ?? [])
    .map((id) => ctx.measurementById?.get(id)).filter((x): x is MeasurementRecord => x?.gradeId === grade.id);
  if (related.length) {
    entry.related = related.slice(0, 3).map((x) => `${x.property} ${x.value} ${x.unit} (${x.specimenType ?? 'specimen not stated'}, ${x.direction ?? 'direction not stated'})`);
    if (!v) entry.missing = 'not-comparable';
  }
  return entry;
}

const NO_PROFILE: PrintAxis = { verdict: 'unknown', reason: 'No print profile recorded for this product' };

/**
 * A product's print gates, from its own recipe; a product with none is unknown on each, never a pass. Where its own
 * profiles are silent on a part, the build read its twin's (D89) or its material's printer maker's guide (D88); that
 * part decides like the product's own, and its reason and `…From` label say where it came from. Drying is what the
 * sheet asks for (required, optional, not-needed; D127), unknown where nothing is stated.
 */
export function productGates(material: ProductMaterial, grade: ProductGrade): Gates {
  const p = grade.print;
  const axis = (a: 'nozzle' | 'bed' | 'chamber'): PrintAxis => (p?.profileIds.length || p?.from?.[a] ? { verdict: p[a].verdict, reason: p[a].reason } : NO_PROFILE);
  const gates: Gates = {
    ...material.gates,
    nozzle: axis('nozzle'), bed: axis('bed'), chamber: axis('chamber'),
    abrasive: p?.hardenedNozzle === true ? 'requires-hardened' : p?.hardenedNozzle === false ? 'no-special-concern' : 'unknown',
    drying: p?.drying?.need ?? 'unknown',
  };
  if (p?.from?.hardenedNozzle && p.hardenedNozzle != null) gates.abrasiveFrom = p.from.hardenedNozzle.label;
  if (p?.hardenedNozzle == null && p?.nozzleAdvice) gates.abrasiveAdvice = p.nozzleAdvice;
  if (p?.from?.drying && p.drying) gates.dryingFrom = p.from.drying.label;
  return gates;
}

/**
 * How many of a material's products state that they need a hardened nozzle, that they do not, or nothing. A material's
 * own gate is the union (any product that needs one), which read as "PLA needs a hardened nozzle" because six
 * metal-filled grades of 250 profiles do (the PM trial of 2026-10-01, PM-03); a reader is told the share instead.
 */
export function hardenedShare(grades?: readonly ProductGrade[] | null) {
  const products = (grades ?? []).filter((g) => !/-R\d+$/.test(g.id) && !g.retired);
  const need = products.filter((g) => g.print?.hardenedNozzle === true);
  return { need: need.length, notNeeded: products.filter((g) => g.print?.hardenedNozzle === false).length, total: products.length, needing: need };
}

/** "6 of 200 products" style words for a hardened-nozzle share, or null where no product states one. */
export function hardenedWords(share?: { readonly need: number; readonly total: number } | null): string | null {
  if (!share?.need) return null;
  if (share.need === share.total) return share.total === 1 ? 'its product needs one' : `all ${share.total} products need one`;
  return `${share.need} of ${share.total} products need one`;
}

/**
 * The material with one product's values, recipe and offers. It keeps the material's ID, facets and scope, which are
 * the material's; a criterion that reads records (environment, offers, conflicts, exact-grade evidence) reads the
 * product's own through `product`, never its siblings' (D98).
 */
export function productView<M extends ProductMaterial>(material: M, grade: ProductGrade, ctx: ProductContext = {}, state: ProductState | null = null) {
  const headline: Record<string, HeadlineBag | undefined> = {};
  for (const key of Object.keys(material.headline ?? {})) headline[key] = productHeadline(material, grade, key, ctx, state);
  return { ...material, headline, gates: productGates(material, grade), buy: grade.buy ?? null, product: grade, state: state ?? firstState(grade) };
}
