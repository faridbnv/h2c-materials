// The unstated-direction back-test (D159): does an offset learned across products put an unstated-only product where its
// measured siblings are, without spoiling the products that publish both? Two measures, because the two populations
// disagree: a product that publishes an XY value and an unstated one usually prints one number twice, so it says little
// about a product that publishes the unstated value alone.
//
//   target   each product with no comparable value of its own and an unstated-direction value, in a material whose other
//            products measure the headline: the model's centre for it, before the floors its own values set (an
//            unstated break stress floors its own ultimate strength whatever the offset), against its measured siblings'
//            median (the ratio, as a geometric median), and how many centres sit above every measured sibling.
//   guard    each product that publishes the headline and an unstated-direction value that is not the same number: its
//            headline hidden, the conversions refitted without it (holdOut), and its value predicted; the signed median
//            error on the model's scale and how often the grade-calibrated plausible range holds it.
//
// A pure function of the fit that exists (holdOut, the grade calibration's scales, the attached grade estimates).

import { median } from './numerics.js';
import { HEAD } from './model.js';

const r3 = (v) => (v == null || !Number.isFinite(v) ? null : Number(v.toPrecision(3)));

/** The related kinds of a headline that learn across products (estimate-model.json conversions, learns). */
export const acrossKinds = (key, model) => Object.entries(model.conversions[key] ?? {})
  .filter(([, c]) => c.learns === 'pairs, across products, down only').map(([kind]) => kind);

export function directionBackTest({ key, model, S, obs, holdOut, calPlausible, zPlausible }) {
  const kinds = new Set(acrossKinds(key, model));
  if (!kinds.size) return null;
  // ---- guard: products that publish both, the headline hidden
  const byF = new Map();
  obs.forEach((o, i) => {
    if (!o.f) return;
    const g = `${o.m.id}|${o.f}`;
    if (!byF.has(g)) byF.set(g, { m: o.m, f: o.f, gradeId: o.gradeId, head: [], related: [] });
    if (o.kind === HEAD[key]) byF.get(g).head.push(i);
    else if (kinds.has(o.kind)) byF.get(g).related.push(o);
  });
  const guard = [];
  for (const c of byF.values()) {
    if (!c.head.length || !c.related.length) continue;
    const y = c.head.map((i) => obs[i].yRaw);
    // The same number printed twice says nothing of what an unstated direction is.
    if (c.related.every((o) => y.some((v) => Math.abs(v - o.yRaw) < 1e-9))) continue;
    if (!obs.some((o, i) => o.m.id === c.m.id && !c.head.includes(i))) continue;
    const p = holdOut(c.m, c.f, S.grades.get(c.gradeId)?.manufacturer, c.head);
    for (const i of c.head) {
      const err = obs[i].y - p.mu;
      guard.push({ err, held: Math.abs(err) <= zPlausible * Math.sqrt((p.sd * calPlausible) ** 2 + obs[i].noise2) });
    }
  }
  return {
    kinds: [...kinds],
    guard: { cases: guard.length, signedError: r3(median(guard.map((g) => g.err))), plausibleCoverage: guard.length ? r3(guard.filter((g) => g.held).length / guard.length) : null },
  };
}

/**
 * The target measure, once grade estimates are attached: the products with an unstated-direction value and no
 * comparable one, beside measured siblings of their material that are not declared variants. `centreOf(g)` is the
 * model's centre at the product's row, on the headline's scale.
 */
export function directionTarget({ key, model, S, obs, centreOf }) {
  const kinds = new Set(acrossKinds(key, model));
  if (!kinds.size) return null;
  const unstated = new Set(obs.filter((o) => kinds.has(o.kind)).map((o) => o.f));
  const logs = [];
  let above = 0;
  for (const m of S.pool) {
    const grades = (m.gradeIds ?? []).map((id) => S.grades.get(id)).filter((g) => g && !g.retired);
    const measured = grades.filter((g) => !g.variant && g.headline?.[key]?.level === 'comparable' && g.headline[key].value > 0).map((g) => g.headline[key].value);
    if (!measured.length) continue;
    const mid = median(measured), top = Math.max(...measured);
    const seen = new Set();
    for (const g of grades) {
      if (!g.estimate?.[key] || !unstated.has(S.fkey(g.id)) || seen.has(S.fkey(g.id))) continue;
      seen.add(S.fkey(g.id));
      const centre = centreOf(g);
      if (!(centre > 0)) continue;
      logs.push(Math.log(centre / mid));
      if (centre > top) above++;
    }
  }
  return { products: logs.length, ratio: logs.length ? r3(Math.exp(median(logs))) : null, aboveEverySibling: above };
}
