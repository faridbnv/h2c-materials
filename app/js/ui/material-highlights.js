// What a material page says stands out, as data: how well documented the material is (the evidence tier), which of its
// products publish a value well above the rest of them (standOut), and which product holds the highest or lowest value
// of each property an engineer weighs first (standOutProducts). Display only: every input is a compiled field
// (materials[].summary, materials[].headline, grades[].headline, grades[].print, grades[].claims) or a count of them;
// nothing here chooses a product's value, decides a gate or judges a product. The words are app/pages/findings.js's.

import { REGISTRY } from './registry.js';
import { isProduct, spreadEntries, soldToughened, comparisonsOf, documents, stated } from './material-facts.js';
import { layerPairs, summarise, printWindows, dryingStats } from './material-stats.js';

/** The key figures at the head of a page, in the order the first figure draws them (PLAN.md, "The pages"). */
export const KEY_FIGURES = ['tensileModulusXY', 'tensileStrengthXY', 'tensileStrengthZ', 'charpyNotched', 'hdt045', 'priceCADkg'];

/** A material's products: active, not a study's or a resin's reference specimen. */
export const productsOf = (c) => c.grades.filter((g) => isProduct(g) && !g.retired);

/**
 * How well documented a material is, from its key figures (materials[].summary[key].n and .asPublished), its products
 * and the documents that give it values: `{ tier: 'well' | 'partly' | 'thinly', products, tiles: [{ key, h, n,
 * asPublished }], weak (tiles under five products, fewest first), missing (tiles nothing publishes), openOnly (tiles
 * published only without a stated orientation or load), makers: [{ maker, readers: [product names sharing its sheet] }]
 * (the makers whose documents give a number), documents, publishers, dataSheets }`.
 *
 * Well: every key figure rests on five products or more. Thinly: three products or fewer, or fewer than two key figures
 * ranked. Partly: anything between.
 */
export function evidenceTier(m, c) {
  const products = productsOf(c);
  const tiles = KEY_FIGURES.map((key) => {
    const h = REGISTRY.allHeadlines.find((x) => x.key === key);
    const s = m.summary?.[key];
    return { key, h, n: s?.n ?? 0, asPublished: s?.asPublished?.n ?? 0, notApplicable: !!m.headline?.[key]?.notApplicable };
  }).filter((t) => t.h && !t.notApplicable);
  const ranked = tiles.filter((t) => t.n > 0);
  const weak = ranked.filter((t) => t.n < 5).sort((a, b) => a.n - b.n);
  const missing = tiles.filter((t) => !t.n && !t.asPublished);
  const openOnly = tiles.filter((t) => !t.n && t.asPublished);
  const docs = c.documents ?? documents(c);
  const valued = [...docs].filter(([, d]) => d.ms.some((x) => x.numeric));
  // The makers whose own documents give a number, each with the products that read its sheet (a shared data sheet, D89).
  const byMaker = new Map();
  for (const [sid] of valued) {
    const s = c.sourceById.get(sid);
    const maker = stated(s?.publisher) ? s.publisher : null;
    if (maker && !byMaker.has(maker)) byMaker.set(maker, new Set());
  }
  for (const g of products) {
    const twinOf = Object.values(g.headline ?? {}).find((v) => v?.from?.origin === 'twin')?.from?.gradeId;
    const sibling = twinOf ? c.gradeById.get(twinOf) : null;
    if (sibling && byMaker.has(sibling.manufacturer) && !valued.some(([, d]) => d.ms.some((x) => x.gradeId === g.id && x.numeric))) byMaker.get(sibling.manufacturer).add(g.id);
  }
  const kinds = valued.map(([sid]) => c.sourceById.get(sid)?.sourceClass ?? '');
  const tier = products.length <= 3 || ranked.length < 2 ? 'thinly' : ranked.every((t) => t.n >= 5) && !missing.length && !openOnly.length ? 'well' : 'partly';
  return {
    tier, products: products.length, tiles, ranked, weak, missing, openOnly,
    makers: [...byMaker].map(([maker, readers]) => ({ maker, readers: [...readers].map((id) => c.gradeById.get(id)) })),
    documents: docs.size,
    publishers: new Set([...docs.keys()].map((sid) => c.sourceById.get(sid)?.publisher).filter(stated)).size,
    dataSheets: [...docs.keys()].filter((sid) => /TDS|data sheet/i.test(c.sourceById.get(sid)?.sourceClass ?? '')).length,
    valuedDocuments: valued.length, valuedDataSheets: kinds.filter((k) => /TDS|data sheet/i.test(k)).length,
  };
}

/**
 * The products whose value of `key` lies well above the rest of the material's (above the upper quartile by one and a
 * half times the middle half's width, Tukey's fence, and by 15 % of the median at least), among the values compared (comparable, not a declared variant):
 * `{ fence, list: [{ g, v }] (highest first), annealed (how many of them were measured after annealing) }`, or null
 * where fewer than four products are compared.
 */
export function standOut(m, c, key) {
  const s = m.summary?.[key];
  if (!s?.n || s.q1 == null || s.q3 == null) return null;
  const fence = s.q3 + 1.5 * (s.q3 - s.q1);
  // Well above: past the fence, and by at least 15 % of the median, so a tight spread's ordinary product is not named.
  const list = spreadEntries(m, c, key).filter((e) => e.v.level === 'comparable' && !e.variant && e.v.value > fence && e.v.value >= s.median * 1.15)
    .sort((a, b) => b.v.value - a.v.value || a.g.id.localeCompare(b.g.id)).map((e) => ({ g: e.g, v: e.v }));
  return { fence, list, annealed: list.filter((e) => e.v.anneal).length };
}

/** The products of a material that publish a value of `key` it compares (comparable, not a declared variant). */
const compared = (m, c, key) => spreadEntries(m, c, key).filter((e) => e.v.level === 'comparable' && !e.variant && Number.isFinite(e.v.value));

/** Of entries tied on value, the one whose own sheet gives it first, then by name: a shared sheet's reader names its source. */
const firstOf = (list) => [...list].sort((a, b) => (a.v.from?.origin === 'twin') - (b.v.from?.origin === 'twin') || a.g.id.localeCompare(b.g.id))[0];

/** The other products that read the same value from `e`'s sheet (a data sheet shared with it, D89). */
const readersOf = (list, e) => list.filter((x) => x !== e && x.v.value === e.v.value && x.v.from?.origin === 'twin' && x.v.from.gradeId === e.g.id).map((x) => x.g);

/**
 * The products that stand out, one fact each, for a material with six products or more: the most documented, the
 * highest tensile strength flat and across the layers, the one that keeps the most across the layers, the highest HDT
 * at 0.45 MPa and notched Charpy, and the lowest price. `[{ kind, key, label, g, v (its headline value, or for 'layers'
 * { value: share }), readers (products reading the same sheet), also (another kind the same product holds), toughened,
 * share? }]`; [] under six products, where every product is shown.
 */
export function standOutProducts(c) {
  const m = c.m;
  const products = productsOf(c);
  if (products.length < 6) return [];
  const out = [];
  // Most documented: the most key properties published, by a product's own sheet or one it shares; ties to a product
  // with a Canadian price, then Bambu Lab's own, then by name.
  const count = (g) => REGISTRY.allHeadlines.filter((h) => g.headline?.[h.key]).length;
  const most = Math.max(...products.map(count));
  const top = products.filter((g) => count(g) === most && !g.variant);
  const canadian = (g) => !!g.headline?.priceCADkg && !g.headline.priceCADkg.converted;
  top.sort((a, b) => canadian(b) - canadian(a) || (b.manufacturer === 'Bambu Lab') - (a.manufacturer === 'Bambu Lab') || a.id.localeCompare(b.id));
  if (top.length) out.push({ kind: 'documented', key: null, label: 'Most documented', g: top[0], v: null, others: top.length - 1, values: most });
  const high = (key, label, kind = 'high') => {
    const list = compared(m, c, key);
    if (list.length < 3) return null;
    const best = Math.max(...list.map((e) => e.v.value));
    const e = firstOf(list.filter((x) => x.v.value === best));
    return { kind, key, label, g: e.g, v: e.v, readers: readersOf(list, e), toughened: soldToughened(e.g, e.v, c) };
  };
  const low = (key, label) => {
    const list = compared(m, c, key);
    if (list.length < 3) return null;
    const best = Math.min(...list.map((e) => e.v.value));
    const e = firstOf(list.filter((x) => x.v.value === best));
    return { kind: 'low', key, label, g: e.g, v: e.v, readers: readersOf(list, e), toughened: false };
  };
  const strengthXY = high('tensileStrengthXY', 'Highest tensile strength (XY)');
  const strengthZ = high('tensileStrengthZ', 'Highest tensile strength (Z)');
  // Keeps the most across the layers: the highest share of flat tensile strength, of three products or more, below 100 %
  // (a Z value above XY is unusual for a printed part and says more about the sheet than the product).
  let layers = null;
  const tensile = comparisonsOf(m, c, 'Mechanical').find((f) => f.hs.some((h) => h.key === 'tensileStrengthXY') && f.hs.some((h) => h.key === 'tensileStrengthZ'));
  if (tensile) {
    const xy = tensile.hs.find((h) => h.key === 'tensileStrengthXY'), z = tensile.hs.find((h) => h.key === 'tensileStrengthZ');
    const pairs = layerPairs(xy, z, tensile.byKey, c).filter((p) => p.ratio < 1);
    if (pairs.length >= 3) {
      const best = pairs.reduce((a, b) => (b.ratio > a.ratio ? b : a));
      layers = { kind: 'layers', key: 'tensileStrengthZ', label: 'Keeps the most strength across the layers', g: best.g, v: { value: best.ratio }, share: best.ratio, median: summarise(pairs.map((p) => p.ratio)).median, readers: [] };
    }
  }
  for (const x of [strengthXY]) if (x) out.push(x);
  if (strengthZ) {
    if (layers && layers.g.id === strengthZ.g.id) { strengthZ.also = layers; layers = null; }
    out.push(strengthZ);
  }
  if (layers) out.push(layers);
  for (const x of [high('hdt045', 'Highest HDT at 0.45 MPa'), high('charpyNotched', 'Highest notched Charpy impact'), low('priceCADkg', 'Lowest price')]) if (x) out.push(x);
  return out;
}

/**
 * Where a material's median of `key` falls among every material's (`ranks`, material-facts.js rankTable): `{ pct (the
 * share of the other materials' medians below it, a tie counting half), of (materials that publish it) }`, or null.
 */
export function standing(m, ranks, key) {
  const rank = ranks?.[key];
  const e = m.headline?.[key];
  if (!rank || !e?.known || !Number.isFinite(e.value)) return null;
  const others = rank.entries.filter((x) => x.id !== m.id);
  if (!others.length) return null;
  const below = others.filter((x) => x.value < e.value).length;
  const level = others.filter((x) => x.value === e.value).length;
  return { pct: ((below + level / 2) / others.length) * 100, of: others.length + 1 };
}

// ------------------------------------------------------------------ what a written summary may name (build/src/written.js)

/**
 * The window of one print setting most of a material's products give, as the page's *On the H2C* plate says it
 * (material-stats.js printWindows): the one counted window where there is one, the span all accept, the span more than
 * half accept, or the span the most accept; a lowest setting alone where only "at least" is given. `{ from, to }` (`to`
 * null for "at least"), or null where no product gives one.
 */
export function settingWindow(products, axis) {
  const pw = printWindows(products, axis);
  if (!pw.n) {
    const lows = pw.ends.filter((e) => e.min != null && e.max == null);
    return lows.length ? { from: Math.min(...lows.map((e) => e.min)), to: null } : null;
  }
  if (pw.n === 1) { const w = pw.windows.find((x) => x.counted); return { from: w.min, to: w.max }; }
  const s = pw.every ?? pw.most ?? pw.peak;
  return { from: s.from, to: s.to };
}

/** The typical drying schedule of the products whose own or shared sheet gives one (material-stats.js dryingStats): `{ tempC, hours }` or null. */
export function dryingSchedule(products) {
  const d = dryingStats(products);
  return d.temps.n ? { tempC: d.temps.median, hours: d.hours.n ? d.hours.median : null } : null;
}

/** The XY and Z headlines of each property a summary may give the across-the-layers share of. */
export const ZSHARE_PAIRS = {
  tensileStrength: ['tensileStrengthXY', 'tensileStrengthZ'], tensileModulus: ['tensileModulusXY', 'tensileModulusZ'], elongation: ['elongationXY', 'elongationZ'],
  flexuralStrength: ['flexuralStrengthXY', 'flexuralStrengthZ'], flexuralModulus: ['flexuralModulusXY', 'flexuralModulusZ'],
};

/**
 * How much of its flat (XY) value a material's products keep across the layers (Z), by the rule of material-stats.js
 * layerPairs and material-facts.js shareOf: each product whose two values are both compared, neither a declared variant
 * (nor read from a variant's sheet), of one property, from one document, in one annealing state. `{ median, n, min, max }`
 * of the shares, or null. `msById` maps measurement IDs to measurements, `gradeById` grade IDs to grades.
 */
export function zShare(products, xyKey, zKey, msById, gradeById) {
  const variantOnly = products.length > 0 && products.every((g) => g.variant);
  const variant = (g, v) => !variantOnly && (!!g.variant || (v?.from?.origin === 'twin' && !!gradeById.get(v.from.gradeId)?.variant));
  const schedule = (v) => (v.anneal ? `${v.anneal.tempC}:${v.anneal.hours}` : null);
  const ratios = [];
  for (const g of products) {
    const a = g.headline?.[xyKey], b = g.headline?.[zKey];
    if (!a || !b || a.level !== 'comparable' || b.level !== 'comparable' || variant(g, a) || variant(g, b) || !(a.value > 0)) continue;
    const xa = msById.get(a.measurementId), xb = msById.get(b.measurementId);
    if (!xa || !xb || xa.property !== xb.property || xa.sourceId !== xb.sourceId || schedule(a) !== schedule(b)) continue;
    ratios.push(b.value / a.value);
  }
  return ratios.length ? { ...summarise(ratios), n: ratios.length } : null;
}
