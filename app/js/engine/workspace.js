// The Ashby decision workspace (D107, D108): one pure model of a selection exercise, which the chart, its result list,
// the inspector and the exports all read, so no two of them can tell a different story.
//
// The chart used to draw each product at its published values and each material at its typical ones, while the answer it
// illustrated was judged product by product in a state (D99): a conditioned beam drew 247 dry points, and Fiberon
// PET-GF15 sat at its as-printed 81.6 °C while it passed annealed, at 133.7 °C. Here a mark is a pair: one product in the
// state its answer is in, and both of its coordinates, its index and its rank are read from that one state. A value the
// registry declares unchanged by a state (a density) is the product's first state's, and says so; nothing else is
// borrowed from another state, and a product that publishes nothing in the asked-for state is a named gap.
//
// The populations stay apart and are counted apart: product states confirmed for the requirements (the decision set);
// unresolved and failed products (context, never ranked, counted on a line or on a front); confirmed products that cannot
// be drawn on these axes; materials with no product; and estimate context for materials none of whose products publishes
// a value, drawn as ranges and never as a point.
//
// Pure: no DOM, no globals, no imports from ../ui.

import { productView, stateOf, valueStateOf, firstState } from './products.js';
import { indexValue, rankingFor, indexAxes, indexOrientation, COST_AXIS } from './indices.js';
import { paretoFront } from './pareto.js';

export { COST_AXIS };

/** The derived axes the workspace can draw beside the registry's headlines. */
export const DERIVED_AXES = {
  [COST_AXIS]: {
    key: COST_AXIS, unit: 'CAD/m³', better: 'min', derived: true, inputs: ['priceCADkg', 'density'],
    label: 'Material cost per volume', technical: 'Price × density (CAD/kg × kg/m³)',
  },
};

/** What an axis is: a registry headline, or a derived axis. */
export function axisInfo(key, registry) {
  if (DERIVED_AXES[key]) return DERIVED_AXES[key];
  const h = registry?.headlines?.find((x) => x.key === key);
  return h ? { key, unit: h.unit, better: h.better, derived: false, changesWithAnnealing: !!h.changesWithAnnealing, changesWithMoisture: !!h.changesWithMoisture, label: h.labels?.plain ?? key } : null;
}

/** A mark's identity: the material, the product and the state, never a position. */
export const pairKey = (materialId, gradeId, stateId) => `${materialId}|${gradeId}|${stateId}`;

/** The bucket a product's answer puts its mark in. */
const BUCKET = { PASS: 'confirmed', UNKNOWN: 'unresolved', FAIL: 'failed' };

// Every product of the materials on screen in the state its answer is in, with its view in that state. The views are the
// expensive part and depend only on the rows and the context, so they are kept for as long as the rows are the same
// object: a change of axis, scale, layer or line position redraws without judging anything again.
const judgedCache = new WeakMap();

/**
 * Each product of `rows` in its judged state: `{ material, evaluation, grade, entry, state, view, verdict, bucket, key }`.
 * A material that has no product is listed apart (`noProducts`), since it has no product state to draw.
 */
export function judgedProducts(rows, ctx) {
  const hit = judgedCache.get(rows);
  if (hit && hit.ctx === ctx && hit.signature === contextSignature(ctx)) return hit.value;
  const gradeById = ctx.gradeById ?? (ctx.db ? new Map(ctx.db.grades.map((g) => [g.id, g])) : null);
  const products = [];
  const noProducts = [];
  for (const { material, evaluation } of rows) {
    const own = ctx.productsByMaterial?.get(material.id) ?? [];
    if (!own.length || !evaluation?.products?.length) { noProducts.push(material.id); continue; }
    const byId = new Map(own.map((g) => [g.id, g]));
    for (const entry of evaluation.products) {
      const grade = byId.get(entry.gradeId) ?? gradeById?.get(entry.gradeId);
      if (!grade) continue;
      const state = stateOf(grade, entry.state?.id ?? null);
      products.push({
        material, evaluation, grade, entry, state,
        view: productView(material, grade, ctx, state),
        verdict: entry.verdict, bucket: BUCKET[entry.verdict] ?? 'unresolved', screened: !!entry.screened,
        key: pairKey(material.id, grade.id, state.id),
      });
    }
  }
  const value = { products, noProducts };
  judgedCache.set(rows, { ctx, signature: contextSignature(ctx), value });
  return value;
}

// What a product view depends on besides the rows: the release and the context's judging settings.
const contextSignature = (ctx) => [ctx.db?.meta?.release?.id ?? '', ctx.evidence ?? '', ctx.moisture ?? '', ctx.anneal ?? '', ctx.annealMaxC ?? '', ctx.unknownPolicy ?? '', ctx.useEstimates ?? ''].join('|');

/**
 * One coordinate of a product in a state: its value with where it came from, or why there is none. A derived cost axis is
 * the product's own price times its own density, both from the same view.
 */
export function axisValue(j, key, ctx) {
  const { view, grade, state } = j;
  if (key === COST_AXIS) {
    const price = view.headline?.priceCADkg, rho = view.headline?.density;
    if (!price?.known || !rho?.known) {
      return { value: null, missing: !price?.known ? 'unpriced' : rho?.missing ?? 'not-published', missingInput: !price?.known ? 'priceCADkg' : 'density', unit: DERIVED_AXES[COST_AXIS].unit };
    }
    return {
      value: price.value * rho.value, unit: DERIVED_AXES[COST_AXIS].unit, origin: 'derived', derived: true,
      price: { value: price.value, unit: price.unit, priceIds: price.priceIds ?? [], observations: price.observations ?? null },
      density: { value: rho.value, unit: rho.unit, measurementId: rho.measurementId ?? null },
      measurementId: rho.measurementId ?? null, priceIds: price.priceIds ?? [],
      sourceStateId: valueStateOf(grade, 'density', state, ctx).id, stateInvariantByRegistry: valueStateOf(grade, 'density', state, ctx).id !== state.id,
      assumed: !!(price.assumption || rho.assumption), interval: null, uncertainty: null, admitted: rho.admitted ?? [],
    };
  }
  const h = view.headline?.[key];
  if (!h) return { value: null, missing: 'no-headline' };
  if (h.notApplicable) return { value: null, missing: 'not-applicable', unit: h.unit };
  if (!h.known) {
    return { value: null, unit: h.unit, missing: h.elsewhere?.length ? 'other-state' : h.missing ?? 'not-published', elsewhere: h.elsewhere ?? null, asPublished: h.asPublished ?? null, estimate: h.estimate ?? null };
  }
  if (h.assumption) {
    return { value: h.value, unit: h.unit, origin: 'assumption', assumed: true, measurementId: null, sourceStateId: null, stateInvariantByRegistry: false, interval: h.interval ?? null, uncertainty: null, admitted: [] };
  }
  const from = valueStateOf(grade, key, state, ctx);
  return {
    value: h.value, unit: h.unit, origin: 'source', measurementId: h.measurementId ?? null, sourceId: h.sourceId ?? null,
    sourceStateId: from.id, stateInvariantByRegistry: from.id !== state.id,
    interval: h.interval ?? null, uncertainty: h.uncertainty ?? null, from: h.from ?? null, admitted: h.admitted ?? [],
    direction: h.direction ?? null, anneal: h.anneal ?? null, level: h.level ?? null, priceIds: h.priceIds ?? [], assumed: false,
  };
}

/** Quartiles from this many products, as the build's material spread has them (build/src/products.js, D83). */
export const QUARTILES_FROM = 4;
/** The build's quantile: linear between the two nearest of the sorted values. */
function quantile(sorted, p) {
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  return sorted[lo] + (h - lo) * ((sorted[lo + 1] ?? sorted[lo]) - sorted[lo]);
}

/**
 * One material's products on one axis, as the rest of the page summarises a material (D83, D108): the full range
 * (`lo`, `hi`), the median, and the middle half (`q1`, `q3`) from four products up; with fewer, the middle half is the
 * range. Marginal: the corners of two such ranges are not products (a low density and a high stiffness may belong to two
 * different products); the paired marks are.
 */
function marginal(list, axis) {
  const vs = list.map((p) => p[axis]?.value).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!vs.length) return null;
  const quartiles = vs.length >= QUARTILES_FROM;
  return { lo: vs[0], hi: vs.at(-1), n: vs.length, median: quantile(vs, 0.5),
    q1: quartiles ? quantile(vs, 0.25) : vs[0], q3: quartiles ? quantile(vs, 0.75) : vs.at(-1), quartiles };
}

/**
 * The index sensitivity of an estimate context over its marginal rectangle, for M = P^n / D with positive closed
 * intervals: M_low = P_lo^n / D_hi and M_high = P_hi^n / D_lo. It bounds M over the rectangle of two independent
 * marginal intervals; it is not a confidence interval, a probability of being best or a rank. Null where an end is
 * open, non-positive or undefined.
 */
export function indexSensitivity(index, orientation, x, y) {
  if (!index || !orientation) return null;
  const [P, D] = orientation === 'direct' ? [y, x] : [x, y];
  if (![P?.lo, P?.hi, D?.lo, D?.hi].every((v) => Number.isFinite(v) && v > 0)) return null;
  return { lo: Math.pow(P.lo, index.exponent) / D.hi, hi: Math.pow(P.hi, index.exponent) / D.lo };
}

/**
 * A material's own span on an axis for estimate context: its estimated likely interval where none of its products
 * publishes the value, or where they do, the declared span of those products (never frozen at the median).
 */
function contextSpan(material, key, registry) {
  const h = material.headline?.[key];
  if (!h) return null;
  if (h.known) {
    if (h.assumption) return null;
    const s = h.spread;
    return s && Number.isFinite(s.min) && Number.isFinite(s.max) && s.min !== s.max
      ? { lo: s.min, hi: s.max, measured: true, products: s.n ?? null, kind: 'product-span' }
      : { lo: h.value, hi: h.value, measured: true, products: s?.n ?? 1, kind: 'product-value' };
  }
  const e = h.estimate;
  if (!e) return null;
  return {
    lo: e.lo ?? null, hi: e.hi ?? null, measured: false, kind: 'estimate',
    plausible: e.plausible ?? null, screenRange: e.screenRange ?? null, canScreen: !!e.canScreen,
    precision: e.precision ?? null, strength: e.strength ?? null, basis: e.basis ?? null, method: e.method ?? null,
    levels: e.levels ?? null, centre: e.centre ?? null, evidence: e.evidence ?? [], unit: e.unit ?? axisInfo(key, registry)?.unit,
  };
}

/**
 * Estimate context: materials with an estimate on at least one axis and a span on the other, drawn as a shaded range
 * (never a point), counted apart from every product, never ranked, never on a front, and never a confirmed pass. It follows
 * the display switch only; whether the engine uses estimates is its own setting. Unavailable, with the reason, where it
 * cannot describe the question: an estimate describes dry products as printed, so a conditioned question does not get
 * one; an open end cannot be drawn; a range reaching zero has no place on a Log axis; a cost per volume is a product's
 * own and has no material estimate.
 */
export function estimateContext(rows, ctx, { xKey, yKey, xLog, yLog, index, orientation }) {
  const registry = ctx.db?.registry;
  const out = [], unavailable = [];
  for (const { material, evaluation } of rows) {
    const hx = material.headline?.[xKey], hy = material.headline?.[yKey];
    const xEst = !!(hx && !hx.known && hx.estimate), yEst = !!(hy && !hy.known && hy.estimate);
    if (!xEst && !yEst) continue;
    const base = { materialId: material.id, name: material.name, family: material.family, filler: material.facets?.reinforcement?.value ?? null, verdict: evaluation?.verdict ?? null };
    if (xKey === COST_AXIS || yKey === COST_AXIS) { unavailable.push({ ...base, reason: 'cost-axis' }); continue; }
    const x = contextSpan(material, xKey, registry), y = contextSpan(material, yKey, registry);
    if (!x || !y) { unavailable.push({ ...base, reason: 'other-axis-missing' }); continue; }
    const moistureBound = ctx.moisture === 'conditioned'
      && [[xKey, x], [yKey, y]].some(([k]) => axisInfo(k, registry)?.changesWithMoisture);
    if (moistureBound) { unavailable.push({ ...base, reason: 'conditioned' }); continue; }
    if (![x.lo, x.hi, y.lo, y.hi].every(Number.isFinite)) { unavailable.push({ ...base, reason: 'open-ended' }); continue; }
    if ((xLog && !(x.lo > 0)) || (yLog && !(y.lo > 0))) { unavailable.push({ ...base, reason: 'off-log' }); continue; }
    out.push({ ...base, key: `estimate|${material.id}`, x, y, sensitivity: indexSensitivity(index, orientation, x, y), state: 'as-printed, dry' });
  }
  return { ranges: out, unavailable };
}

/**
 * The workspace for one question and one pair of axes.
 *
 * - `rows`: the materials on screen, with their evaluations (the decision population).
 * - `contextRows`: every material the question examined that matches the search (for the unresolved and failed layers,
 *   and estimate context, which may come from materials Confirmed only leaves out); defaults to `rows`.
 * - `xKey`, `yKey`, `xLog`, `yLog`: the axes; `index` the goal (an INDICES entry or null); `lineM` the line's position.
 * - `population` for material ranges: 'confirmed' or 'judged'.
 */
export function buildWorkspace({ rows, contextRows = rows, ctx, xKey, yKey, xLog = false, yLog = false, index = null, lineM = null, population = 'confirmed', tested = true }) {
  const registry = ctx.db?.registry;
  const x = axisInfo(xKey, registry), y = axisInfo(yKey, registry);
  const orientation = indexOrientation(index, xKey, yKey);
  const drawable = !!orientation && xLog && yLog;
  const onScreen = new Set(rows.map((r) => r.material.id));
  const { products, noProducts } = judgedProducts(rows, ctx);
  const context = contextRows === rows ? products : judgedProducts(contextRows, ctx).products.filter((j) => !onScreen.has(j.material.id));

  const pairOf = (j, inResults) => {
    const xv = axisValue(j, xKey, ctx), yv = axisValue(j, yKey, ctx);
    const known = xv.value !== null && yv.value !== null;
    const offLog = known && ((xLog && !(xv.value > 0)) || (yLog && !(yv.value > 0)));
    return {
      key: j.key, materialId: j.material.id, gradeId: j.grade.id, stateId: j.state.id,
      name: j.material.name, family: j.material.family, filler: j.material.facets?.reinforcement?.value ?? null,
      product: `${j.grade.manufacturer} ${j.grade.product}`, manufacturer: j.grade.manufacturer, productName: j.grade.product,
      // A declared variant (a lightweight additive, a dense filler) describes the product, not its polymer (D57): it is
      // drawn, and kept out of its material's range as the build keeps it out of the material's spread.
      variant: j.grade.variant ?? null,
      state: { id: j.state.id, treatment: j.state.treatment ?? null, moisture: j.state.moisture ?? 'dry', synthetic: !!j.state.synthetic },
      verdict: j.verdict, bucket: j.bucket, screened: j.screened, inResults,
      x: xv, y: yv, known, offLog, plottable: known && !offLog,
      assumed: !!(xv.assumed || yv.assumed),
      twin: xv.from?.label ?? yv.from?.label ?? null,
      M: index ? indexValue(j.view, index) : null,
    };
  };
  const pairs = products.map((j) => pairOf(j, true));
  const contextPairs = context === products ? [] : context.map((j) => pairOf(j, false));

  // The decision set: confirmed product states that can be drawn.
  const confirmedAll = pairs.filter((p) => p.bucket === 'confirmed');
  const confirmed = confirmedAll.filter((p) => p.plottable);
  const primary = confirmed;
  const unresolved = [...pairs, ...contextPairs].filter((p) => p.bucket === 'unresolved' && p.plottable);
  const failed = [...pairs, ...contextPairs].filter((p) => p.bucket === 'failed' && p.plottable);
  // Confirmed products that cannot be drawn on these axes, named with the axis and the reason.
  const gaps = confirmedAll.filter((p) => !p.plottable).map((p) => ({
    key: p.key, materialId: p.materialId, gradeId: p.gradeId, stateId: p.stateId, product: p.product, name: p.name,
    missing: [p.x.value === null ? { axis: 'x', key: xKey, reason: p.x.missing, elsewhere: p.x.elsewhere ?? null, input: p.x.missingInput ?? null } : null,
      p.y.value === null ? { axis: 'y', key: yKey, reason: p.y.missing, elsewhere: p.y.elsewhere ?? null, input: p.y.missingInput ?? null } : null].filter(Boolean),
    offLog: p.offLog,
  }));

  // One ranking (D102): the table, the list, the line and the export read this same result.
  const ranking = index ? rankingFor(rows, ctx, index) : null;
  const defaultM = (() => {
    const vals = (ranking?.order ?? []).map((r) => r.value).sort((a, b) => b - a);
    return vals.length ? vals[Math.min(4, vals.length - 1)] : null;
  })();
  const M = Number.isFinite(lineM) && lineM > 0 ? lineM : defaultM;
  // The line acts on the product states it is drawn over: a count of those at or above it (equality included), and of
  // their materials. The material ranking is a separate summary (the median of each material's passing products).
  const withM = primary.filter((p) => p.M !== null);
  const above = M !== null ? withM.filter((p) => p.M >= M) : [];
  const line = index ? {
    M, defaultM, orientation, drawable,
    above: { pairs: above.length, materials: new Set(above.map((p) => p.materialId)).size, keys: above.map((p) => p.key) },
    of: { pairs: withM.length, materials: new Set(withM.map((p) => p.materialId)).size },
    rankedAbove: M !== null ? (ranking?.order ?? []).filter((r) => r.value >= M).length : 0,
    range: withM.length ? { lo: Math.min(...withM.map((p) => p.M)), hi: Math.max(...withM.map((p) => p.M)) } : null,
  } : null;

  // The front: exact confirmed product states only, by their recorded point values, in the axes' better directions.
  const frontPts = primary.filter((p) => !p.assumed).map((p) => ({ key: p.key, x: p.x.value, y: p.y.value }));
  const frontier = x && y ? paretoFront(frontPts, x.better, y.better).map((p) => p.key) : [];

  // Marginal ranges per material, for the overview: from the confirmed product states, or from every product in the
  // state it is judged in (context), as the caller asks, and said which.
  const source = population === 'confirmed' && tested ? confirmed : pairs.filter((p) => p.known);
  const byMaterial = new Map();
  for (const p of source) { if (!byMaterial.has(p.materialId)) byMaterial.set(p.materialId, []); byMaterial.get(p.materialId).push(p); }
  const materialSummaries = [...byMaterial.entries()].map(([materialId, list]) => {
    const loggable = list.filter((p) => !p.offLog);
    // The range is the material's own products; a declared variant is drawn beside it as its own mark (D57, D108).
    const own = loggable.filter((p) => !p.variant);
    return {
      materialId, name: list[0].name, family: list[0].family, filler: list[0].filler,
      x: marginal(own, 'x'), y: marginal(own, 'y'), paired: loggable.map((p) => p.key), inRange: own.map((p) => p.key),
      variants: loggable.filter((p) => p.variant).map((p) => p.key), products: new Set(list.map((p) => p.gradeId)).size,
      population: population === 'confirmed' && tested ? 'confirmed' : 'judged',
    };
  });

  const materialsOf = (list) => new Set(list.map((p) => p.materialId)).size;
  // Twins share one sheet's values (D89): count the evidence behind the confirmed marks apart from the products.
  const evidence = new Set(confirmed.map((p) => `${p.x.measurementId ?? p.x.value}|${p.y.measurementId ?? p.y.value}|${p.x.priceIds?.join(',') ?? ''}`)).size;
  const counts = {
    materials: rows.length, materialsWithoutProducts: noProducts.length, products: products.length,
    confirmed: { products: confirmedAll.length, pairs: confirmed.length, materials: materialsOf(confirmed), evidence },
    decision: { pairs: primary.length, materials: materialsOf(primary) },
    unresolved: { pairs: unresolved.length, materials: materialsOf(unresolved), products: [...pairs, ...contextPairs].filter((p) => p.bucket === 'unresolved').length },
    failed: { pairs: failed.length, materials: materialsOf(failed), products: [...pairs, ...contextPairs].filter((p) => p.bucket === 'failed').length },
    gaps: { products: gaps.length, materials: new Set(gaps.map((g) => g.materialId)).size, unpriced: gaps.filter((g) => g.missing.some((m) => m.reason === 'unpriced')).length },
    offLog: pairs.filter((p) => p.bucket === 'confirmed' && p.offLog).length,
    contextMaterials: new Set(contextPairs.map((p) => p.materialId)).size,
  };

  return {
    releaseId: ctx.db?.meta?.release?.id ?? null,
    axes: { x: { ...x, key: xKey, log: !!xLog }, y: { ...y, key: yKey, log: !!yLog } },
    objective: { indexId: index?.id ?? null, index, orientation, drawable },
    pairs, contextPairs, decision: primary, confirmed, unresolved, failed, gaps,
    noProducts, materialSummaries, ranking, line, frontier, counts,
  };
}

/** The axes and scales a goal prepares (D107): its property up, density or cost per volume across, both on Log. */
export function goalAxes(index) {
  const a = indexAxes(index);
  return { x: a.x, y: a.y, xLog: true, yLog: true };
}

export { indexAxes, indexOrientation, firstState };
