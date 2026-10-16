// Print temperatures across a material's products (D139): each product's lowest and highest nozzle, bed and heated-
// chamber setting, and its drying temperature, as its print gate reads them (grades[].print, build/src/products.js): from
// its own data sheet, from a sheet it shares (D89), or from its material's row of Bambu Lab's Filament Guide (D88).
//
// Display only. The medians and middle halves are worked out here as the build summarises a headline (products.js
// summarise: the median, and the quartiles from four values, linear between the nearest two), over the products whose
// own sheet or shared sheet gives the setting, special formulations left out (D57). A value read from the guide is drawn
// and never counted: one row speaks for every product that reads it. Nothing here is stored, and nothing decides.

/** The settings drawn, in the order a print is set up. The chamber is drawn where a sheet gives it a temperature. */
export const PRINT_AXES = [
  { axis: 'nozzle', label: 'Nozzle', limit: true },
  { axis: 'bed', label: 'Bed', limit: true },
  { axis: 'chamber', label: 'Heated chamber', limit: true },
  { axis: 'drying', label: 'Drying', limit: false },
];
/** Why a product's chamber is not drawn: its state, in the words of the Printing tab. */
export const CHAMBER_STATES = ['not-required', 'enclosed', 'recommended', 'ambient', 'no-setpoint', 'unknown'];
/** A print gate verdict that puts a product outside the H2C's limits (build/src/gates.js). */
export const OUTSIDE = ['exceeds', 'exceeds-recommended', 'partial'];

const QUARTILES_FROM = 4;
const tidy = (x) => Number(x.toPrecision(12));
function quantile(sorted, p) {
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  return tidy(sorted[lo] + (h - lo) * ((sorted[lo + 1] ?? sorted[lo]) - sorted[lo]));
}
const span = (list) => (list.length ? { n: list.length, min: Math.min(...list.map((e) => e.value)), max: Math.max(...list.map((e) => e.value)) } : null);

/** One row's spread: the compared values' median, middle half and range, and the values drawn apart, by why. */
export function rowSummary(entries) {
  const compared = entries.filter((e) => !e.variant && e.origin !== 'guide');
  const out = { n: compared.length };
  if (compared.length) {
    const sorted = compared.map((e) => e.value).sort((a, b) => a - b);
    const k = sorted.length >> 1;
    Object.assign(out, { min: sorted[0], max: sorted.at(-1), median: tidy(sorted.length % 2 ? sorted[k] : (sorted[k - 1] + sorted[k]) / 2) });
    if (sorted.length >= QUARTILES_FROM) Object.assign(out, { q1: quantile(sorted, 0.25), q3: quantile(sorted, 0.75) });
  }
  const guide = span(entries.filter((e) => !e.variant && e.origin === 'guide'));
  const variants = span(entries.filter((e) => e.variant));
  if (guide) out.guide = guide;
  if (variants) out.variants = variants;
  return out;
}

/**
 * A material's products on each setting: rows of entries `{ g, value, origin: 'own' | 'twin' | 'guide', label,
 * profileId, variant }` (a temperature setting a lowest and a highest row, drying one), each row's summary, the
 * products outside the H2C's limits by the build's own gate verdict, why the others are not drawn, and how many windows
 * give only one end (drawn on that end's row alone).
 * `products` are the material's active products; a material whose every product is a variant sets none apart.
 */
export function printSpread(products) {
  const variantOnly = products.length > 0 && products.every((g) => g.variant);
  const variantOf = (g) => !variantOnly && !!g.variant;
  return PRINT_AXES.map(({ axis, label, limit }) => {
    const rows = axis === 'drying' ? [{ key: 'drying', label: 'Drying', entries: [] }]
      : [{ key: `${axis}Low`, label: `${label}, lowest`, entries: [] }, { key: `${axis}High`, label: `${label}, highest`, entries: [] }];
    const notDrawn = new Map();
    const count = (why) => notDrawn.set(why, (notDrawn.get(why) ?? 0) + 1);
    const outside = [];
    const oneEnd = { low: 0, high: 0 };
    for (const g of products) {
      const v = g.print?.[axis];
      const from = g.print?.from?.[axis];
      const base = { g, origin: from?.origin ?? 'own', label: from?.label ?? null, variant: variantOf(g) };
      if (axis === 'drying') {
        if (v?.tempC != null && v.need !== 'not-needed') rows[0].entries.push({ ...base, value: v.tempC, profileId: v.profileId ?? null });
        else count(!v ? 'unknown' : v.need === 'not-needed' ? 'not-needed' : 'no-temperature');
        continue;
      }
      if (OUTSIDE.includes(v?.verdict)) outside.push({ g, verdict: v.verdict, min: v.min, max: v.max, origin: base.origin });
      if (v?.state !== 'range') { count(v?.state ?? 'unknown'); continue; }
      const entry = { ...base, profileId: v.profileId ?? null };
      if (v.min != null) rows[0].entries.push({ ...entry, value: v.min }); else oneEnd.high++;
      if (v.max != null) rows[1].entries.push({ ...entry, value: v.max }); else oneEnd.low++;
    }
    for (const r of rows) r.summary = rowSummary(r.entries);
    return { axis, label, limit, rows, outside, notDrawn, oneEnd };
  });
}
