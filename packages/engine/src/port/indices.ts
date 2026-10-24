// Performance indices for the Ashby workspace.
//
// Derivation and slopes follow Materials Selection in Mechanical Design, section 5.3, via the
// Materials Wiki. The method: write the objective, eliminate the free variable using the
// constraint, and read off the group of material properties to be maximised.
//
// On log-log axes an index of the form  M = P^n / rho  is a straight line. Taking logs:
//     log P = (1/n) log rho + (1/n) log M
// so the selection line has slope 1/n, and moving it up or down changes M without changing slope.
// The wiki states the beam case directly: "A guideline of slope 2 is drawn on the diagram; it
// defines the slope of the grid of lines for values of E^(1/2)/rho."
//
// Two caveats belong on every card and are carried in the data, not left to the UI to remember.

import { productView, stateOf } from './products.ts';
import type { ProductContext, ProductGrade, ProductMaterial } from './products.ts';

export interface Index {
  /** A performance index of the Ashby workspace (the JSDoc typedef below describes the first seven fields). */
  readonly id: string;
  readonly designCase: string;
  readonly formula: string;
  readonly numerator: string;
  readonly exponent: number;
  readonly costForm: boolean;
  readonly slope: number;
  readonly note?: string;
  readonly caveats: readonly string[];
  readonly geometry: ReturnType<typeof geometry>;
  readonly strengthProxy?: boolean;
}
export interface RankedMaterial extends ProductMaterial {
  readonly id: string;
}
export interface EvaluatedProducts {
  /** What rankMaterials reads of runSelection's evaluation: its material and the verdicts of its products. */
  readonly materialId: string;
  readonly verdict?: string;
  readonly products?: readonly { readonly verdict: string; readonly gradeId: string; readonly state?: { readonly id: string } | null }[];
}
export type ViewOf = (material: RankedMaterial, grade: ProductGrade, stateId: string | null | undefined) => ProductMaterial;

export const STRENGTH_CAVEAT =
  'Derived for the elastic limit. This database records most strength as tensile strength with an '
  + 'unspecified endpoint, so the card names the endpoint actually used.';

export const ANISOTROPY_CAVEAT =
  'Index theory assumes an isotropic material. FDM parts are not isotropic: PA6-CF measures '
  + '4.43 GPa in XY against 2.17 GPa in Z. An index computed from XY headlines is valid only for '
  + 'in-plane loading.';

/**
 * @typedef {object} Index
 * @property {string} id
 * @property {string} designCase   function, objective and constraint, in words
 * @property {string} formula
 * @property {string} numerator    headline key on the Y axis
 * @property {number} exponent     n in P^n / rho
 * @property {boolean} costForm    divide by price x density instead of density
 * @property {number} slope        slope of the selection line on log-log P vs rho axes
 */
// The price caveat counts the materials it is shown for: it once read "40 of 102" from the day it was written.
export const PRICE_CAVEAT = 'Price is available for {n} of {total} materials.';
export const priceCaveat = (materials: readonly ProductMaterial[]): string => PRICE_CAVEAT
  .replace('{n}', String(materials.filter((m) => m.headline?.priceCADkg?.known).length))
  .replace('{total}', String(materials.length));

// Each index also says what it models, for the workspace's first step (D107): the member (a tie, a beam, a panel), the
// geometry left free, the constraint in one sentence, and whether its strength is a proxy. The free-geometry forms hold
// only where that geometry is free; a part whose dimensions are fixed compares properties instead.
const MEMBER = {
  tie: { free: 'Cross-section area free; length fixed', load: 'carries axial tension' },
  beam: { free: 'Cross-section area free, its proportions fixed; length fixed', load: 'is loaded in bending' },
  panel: { free: 'Thickness free; length and width fixed', load: 'is a flat slab loaded in bending' },
};
const geometry = (member: keyof typeof MEMBER, constraint: string, objective: string) => ({
  member, constraint, objective, free: MEMBER[member].free,
  sentence: `A ${member} that ${MEMBER[member].load}, ${constraint === 'stiffness' ? 'its stiffness prescribed' : 'its strength prescribed'}, at the ${objective === 'cost' ? 'lowest material cost' : 'lowest mass'}.`,
});

export const INDICES: readonly Index[] = [
  {
    id: 'tie-stiffness',
    designCase: 'Tie, minimum mass, stiffness prescribed',
    formula: 'E / rho', numerator: 'tensileModulusXY', exponent: 1, costForm: false, slope: 1,
    note: 'Specific stiffness. A tie carries axial tension; the section area is free.',
    caveats: [ANISOTROPY_CAVEAT],
    geometry: geometry('tie', 'stiffness', 'mass'),
  },
  {
    id: 'beam-stiffness',
    designCase: 'Beam, minimum mass, stiffness prescribed',
    formula: 'E^(1/2) / rho', numerator: 'tensileModulusXY', exponent: 0.5, costForm: false, slope: 2,
    note: 'Holds for any cross-section shape so long as the shape is held constant.',
    caveats: [ANISOTROPY_CAVEAT],
    geometry: geometry('beam', 'stiffness', 'mass'),
  },
  {
    id: 'panel-stiffness',
    designCase: 'Panel, minimum mass, stiffness prescribed',
    formula: 'E^(1/3) / rho', numerator: 'tensileModulusXY', exponent: 1 / 3, costForm: false, slope: 3,
    note: 'A flat slab of specified length and width, loaded in bending, thickness free.',
    caveats: [ANISOTROPY_CAVEAT],
    geometry: geometry('panel', 'stiffness', 'mass'),
  },
  {
    id: 'tie-strength',
    designCase: 'Tie, minimum mass, strength prescribed',
    formula: 'sigma / rho', numerator: 'tensileStrengthXY', exponent: 1, costForm: false, slope: 1,
    note: 'Specific strength.',
    caveats: [STRENGTH_CAVEAT, ANISOTROPY_CAVEAT],
    geometry: geometry('tie', 'strength', 'mass'), strengthProxy: true,
  },
  {
    id: 'beam-strength',
    designCase: 'Beam, minimum mass, strength prescribed',
    formula: 'sigma^(2/3) / rho', numerator: 'tensileStrengthXY', exponent: 2 / 3, costForm: false, slope: 1.5,
    caveats: [STRENGTH_CAVEAT, ANISOTROPY_CAVEAT],
    geometry: geometry('beam', 'strength', 'mass'), strengthProxy: true,
  },
  {
    id: 'panel-strength',
    designCase: 'Panel, minimum mass, strength prescribed',
    formula: 'sigma^(1/2) / rho', numerator: 'tensileStrengthXY', exponent: 0.5, costForm: false, slope: 2,
    caveats: [STRENGTH_CAVEAT, ANISOTROPY_CAVEAT],
    geometry: geometry('panel', 'strength', 'mass'), strengthProxy: true,
  },
  {
    id: 'beam-stiffness-cost',
    designCase: 'Beam, minimum material cost, stiffness prescribed',
    formula: 'E^(1/2) / (Cm x rho)', numerator: 'tensileModulusXY', exponent: 0.5, costForm: true, slope: 2,
    note: 'Material cost only. Shaping, joining and finishing are not included.',
    caveats: [ANISOTROPY_CAVEAT, PRICE_CAVEAT],
    geometry: geometry('beam', 'stiffness', 'cost'),
  },
  {
    id: 'tie-strength-cost',
    designCase: 'Tie, minimum material cost, strength prescribed',
    formula: 'sigma / (Cm x rho)', numerator: 'tensileStrengthXY', exponent: 1, costForm: true, slope: 1,
    caveats: [STRENGTH_CAVEAT, ANISOTROPY_CAVEAT, PRICE_CAVEAT],
    geometry: geometry('tie', 'strength', 'cost'), strengthProxy: true,
  },
];

/**
 * The derived horizontal axis of a cost index (D107): a product's material cost per unit volume, its own price per kilogram
 * times its own density. Both inputs are the one product's, in the state it is judged in; a twin's price is never read
 * (D89), and a product without a price has no value here, which is listed, never drawn as zero.
 */
export const COST_AXIS = 'materialCostPerVolume';

/** The axes an index's line is drawn on: its property up, and density (or material cost per volume) across. */
export const indexAxes = (index: Index): { x: string; y: string } => ({ x: index.costForm ? COST_AXIS : 'density', y: index.numerator });

/**
 * How an index's line sits on two axes: 'direct' with its property up and its denominator across, 'swapped' with the two
 * exchanged, or null where these axes cannot show it. On swapped axes the line is the same set of products: the
 * denominator D = P^n / M, of slope n on log-log axes, and the better side is below it rather than above.
 */
export function indexOrientation(index: Index | null | undefined, xKey: string, yKey: string): 'direct' | 'swapped' | null {
  if (!index) return null;
  const a = indexAxes(index);
  if (xKey === a.x && yKey === a.y) return 'direct';
  if (xKey === a.y && yKey === a.x) return 'swapped';
  return null;
}

/**
 * M in the units an Ashby-trained engineer checks by hand (the PM trial of 2026-10-01, PM-13). The index is computed
 * from the headline units (E in GPa, σ in MPa, ρ in kg/m³, Cm in CAD/kg), which put E/ρ near 0.003; a mass index is
 * shown per Mg/m³ (×1000), so E/ρ reads in MJ/kg and σ/ρ in kJ/kg, as the textbooks print them.
 */
export const INDEX_UNITS: Readonly<Record<string, { readonly scale: number; readonly unit: string }>> = {
  'tie-stiffness': { scale: 1000, unit: 'MJ/kg' },
  'beam-stiffness': { scale: 1000, unit: 'GPa^½/(Mg/m³)' },
  'panel-stiffness': { scale: 1000, unit: 'GPa^⅓/(Mg/m³)' },
  'tie-strength': { scale: 1000, unit: 'kJ/kg' },
  'beam-strength': { scale: 1000, unit: 'MPa^⅔/(Mg/m³)' },
  'panel-strength': { scale: 1000, unit: 'MPa^½/(Mg/m³)' },
  'beam-stiffness-cost': { scale: 1, unit: 'GPa^½·m³/CAD' },
  'tie-strength-cost': { scale: 1, unit: 'MPa·m³/CAD' },
};
/** An index value in its display units: { value, unit }. */
export const indexDisplay = (index: Index | null | undefined, value: number | null | undefined) => { const u = INDEX_UNITS[index?.id!] ?? { scale: 1, unit: '' }; return { value: value == null ? null : value * u.scale, unit: u.unit }; };

export const indexById = (id: unknown): Index | null => INDICES.find((i) => i.id === id) ?? null;


/** Compute M for one material, or one product's view of it. Returns null when any needed headline is missing. */
export function indexValue(material: ProductMaterial, index: Index): number | null {
  const p = material.headline?.[index.numerator];
  const rho = material.headline?.density;
  if (!p?.known || !rho?.known) return null;
  let denominator = rho.value!;
  if (index.costForm) {
    const price = material.headline?.priceCADkg;
    if (!price?.known) return null;
    denominator = price.value! * rho.value!;
  }
  if (!(denominator > 0) || !(p.value! > 0)) return null;
  return Math.pow(p.value!, index.exponent) / denominator;
}

/**
 * The selection line for a given M, as two points in data space, ready for a log-log plot.
 * Solving M = P^n / rho for P gives  P = (M x rho)^(1/n). On swapped axes (P across, rho up) the same line is
 * rho = P^n / M, and `range` is then a range of P.
 */
export function selectionLine(index: Index, M: number, range: readonly [number, number], orientation: 'direct' | 'swapped' = 'direct'): [{ x: number; y: number }, { x: number; y: number }] {
  const at = orientation === 'swapped' ? (p: number) => Math.pow(p, index.exponent) / M : (rho: number) => Math.pow(M * rho, 1 / index.exponent);
  const [lo, hi] = range;
  return [{ x: lo, y: at(lo) }, { x: hi, y: at(hi) }];
}

/** How many candidates sit on the better side of the line. */
export function countAbove(materials: readonly ProductMaterial[], index: Index, M: number): number {
  return materials.reduce((n, m) => {
    const v = indexValue(m, index);
    return v !== null && v >= M ? n + 1 : n;
  }, 0);
}

/** Rank candidates by an index, for the card's own shortlist. */
export function rankByIndex<M extends ProductMaterial>(materials: readonly M[], index: Index) {
  return materials
    .map((m) => ({ material: m, value: indexValue(m, index) }))
    .filter((r): r is { material: M; value: number } => r.value !== null)
    .sort((a, b) => b.value - a.value);
}

/**
 * Rank materials by an index computed product by product (D83): each passing product's own M from its own density,
 * stiffness or strength and price, in the state it passes in (D99), never from medians of different products. A material
 * ranks by the median M of its passing products and names its best one. `evaluations` are runSelection's with products
 * (their `products[]` verdicts and states); a material without products ranks on its own headline, as rankByIndex does.
 * `viewOf(material, grade, stateId)` gives the product in that state.
 */
export function rankMaterials(evaluations: readonly EvaluatedProducts[], materials: readonly RankedMaterial[], productsByMaterial: ReadonlyMap<string, readonly ProductGrade[]>, index: Index, viewOf: ViewOf) {
  const byId = new Map(materials.map((m) => [m.id, m]));
  const out = [];
  for (const e of evaluations) {
    const material = byId.get(e.materialId);
    if (!material) continue;
    const passing = new Map((e.products ?? []).filter((p) => p.verdict === 'PASS').map((p): [string, string | null] => [p.gradeId, p.state?.id ?? null]));
    const products = (productsByMaterial.get(material.id) ?? []).filter((g) => passing.has(g.id));
    const values = products.length
      ? products.map((g) => ({ gradeId: g.id, stateId: passing.get(g.id), value: indexValue(viewOf(material, g, passing.get(g.id)), index) })).filter((x): x is { gradeId: string; stateId: string | null | undefined; value: number } => x.value !== null)
      : e.products?.length ? [] : [{ gradeId: null, stateId: null, value: indexValue(material, index) }].filter((x): x is { gradeId: null; stateId: null; value: number } => x.value !== null);
    if (!values.length) continue;
    const sorted = [...values].sort((a, b) => a.value - b.value || (a.gradeId ?? '').localeCompare(b.gradeId ?? ''));
    const mid = sorted.length % 2 ? sorted[(sorted.length - 1) / 2]!.value : (sorted[sorted.length / 2 - 1]!.value + sorted[sorted.length / 2]!.value) / 2;
    out.push({ materialId: material.id, value: mid, best: sorted.at(-1), products: values.length });
  }
  return out.sort((a, b) => b.value - a.value || a.materialId.localeCompare(b.materialId));
}

/**
 * The ranking of the rows on screen by a goal (D102): one result, which the table's order, the ranking beside the chart,
 * the line's place in it and the export all read, so no two lenses can rank one question differently. A candidate ranks by its passing
 * products' own index, in the states they pass in; one whose passing products do not publish what the index needs is
 * unranked, and says why. Material medians, which describe different products, never rank anything.
 */
export interface RankingRow {
  readonly material: RankedMaterial;
  readonly evaluation: EvaluatedProducts;
}
export interface RankingContext extends ProductContext {
  readonly productsByMaterial?: ReadonlyMap<string, readonly ProductGrade[]>;
}
export function rankingFor(rows: readonly RankingRow[], ctx: RankingContext | null | undefined, index: Index | null | undefined, viewOf: ViewOf = (m, g, stateId) => productView(m, g, ctx!, stateOf(g, stateId))) {
  if (!index || !ctx?.productsByMaterial) return null;
  const order = rankMaterials(rows.map((r) => r.evaluation), rows.map((r) => r.material), ctx.productsByMaterial, index, viewOf);
  const byMaterial = new Map(order.map((r, i) => [r.materialId, { ...r, place: i + 1 }]));
  const needs = [index.numerator, 'density', ...(index.costForm ? ['priceCADkg'] : [])];
  const unranked = rows.filter((r) => r.evaluation?.verdict === 'PASS' && !byMaterial.has(r.material.id))
    .map((r) => ({ materialId: r.material.id, reason: `No product that passes publishes ${needs.join(', ')} in the state it passes in` }));
  return { index, order: [...byMaterial.values()], byMaterial, unranked };
}
