// Screening (DECISIONS D48): which evidence may screen a material out, decided every build by a back-test that hides
// what each evidence class lacks from every measured headline and predicts it with the production ranges; and the
// unstated-load bracket of a heat deflection headline, certified per matrix the same way.

import { binomialTail } from './numerics.js';
import { HEAD, sig3 } from './model.js';
import { predict } from './gaussian.js';

/**
 * Whether an evidence class may screen (DECISIONS D48). cases: [{ y, lo, hi }] in the headline's units, the true
 * value and the plausible range predicted with the class's information hidden. Certified when there are at
 * least minHeldCases and neither side misses significantly more often than maxOneSidedMiss.
 */
export function certifyScreening(cases, { maxOneSidedMiss, testLevel, minHeldCases }) {
  const n = cases.length;
  const high = cases.filter((c) => c.y > c.hi).length, low = cases.filter((c) => c.y < c.lo).length;
  const pHigh = binomialTail(n, maxOneSidedMiss, high), pLow = binomialTail(n, maxOneSidedMiss, low);
  const enough = n >= minHeldCases;
  const certified = enough && pHigh >= testLevel && pLow >= testLevel;
  const r = (x) => Math.round(x * 1000) / 1000;
  return {
    held: n, missHigh: high, missLow: low, missHighRate: n ? r(high / n) : null, missLowRate: n ? r(low / n) : null, pHigh: r(pHigh), pLow: r(pLow), certified,
    why: !enough ? `only ${n} held cases (${minHeldCases} needed)`
      : certified ? `ranges hold on both sides (${high} above, ${low} below of ${n})`
      : `plausible ranges are too narrow: ${pHigh < testLevel ? `${high} of ${n} true values above the range` : `${low} of ${n} below it`} (${Math.round(maxOneSidedMiss * 1000) / 10}% per side allowed)`,
  };
}

/**
 * A heat deflection value whose load the source never stated was measured at 0.45 MPa or at 1.8 MPa.
 * At 0.45 MPa it is the value; at 1.8 MPa the 0.45 MPa value lies above it by the gap this matrix
 * shows between the two loads. So the 0.45 MPa value is bracketed, not merely bounded below: PLA
 * Lite's 53 °C means 53 to about 63 °C, not "53 or anything above". Treated as unbounded, it kept a
 * PLA among candidates for "heat resistance at least 100 °C".
 *
 * Attaches loadBracket to every unstated-load heat deflection headline and returns the per-matrix certification.
 */
export function attachLoadBrackets({ raw, conv, S, model, zPlausible }) {
  const { plausible } = model.levels;
  // Back-test the bracket on every formulation publishing both loads: read the 1.8 MPa value as if its load were
  // unstated, and check the 0.45 MPa value lies under the bracket's top (it lies above its bottom by physics).
  const byF = new Map();
  for (const o of raw) { if (!byF.has(o.f)) byF.set(o.f, { m: o.m, kinds: new Map() }); byF.get(o.f).kinds.set(o.kind, o.yRaw); }
  // The gap between the loads depends on the matrix (an amorphous bar a few degrees, an unfilled semicrystalline
  // one up to 120 °C), so each matrix class is certified on its own pairs.
  const bracketCases = new Map();
  for (const { m, kinds } of byF.values()) {
    const matrix = S.matrix(m);
    const y = kinds.get('HDT 0.45'), v = kinds.get(`HDT 1.8 ${matrix}`), c = conv[`HDT 1.8 ${matrix}`];
    if (y == null || v == null || !c) continue;
    if (!bracketCases.has(matrix)) bracketCases.set(matrix, []);
    bracketCases.get(matrix).push({ materialId: m.id, y, lo: v, hi: v + c.offset + zPlausible * c.sd });
  }
  const bracketScreening = Object.fromEntries(['amorphous', 'semi-unfilled', 'semi-filled', 'elastomer']
    .map((matrix) => [matrix, certifyScreening(bracketCases.get(matrix) ?? [], model.screening)]));
  for (const m of S.pool) {
    const h = m.headline.hdt045;
    const c = conv[`HDT 1.8 ${S.matrix(m)}`];
    if (!h?.known || h.loadStated !== false || !c) continue;
    h.loadBracket = {
      lo: h.value, hi: sig3(h.value + c.offset + zPlausible * c.sd, 1), unit: h.unit,
      why: `at 0.45 MPa the value itself; at 1.8 MPa up to ${sig3(c.offset + zPlausible * c.sd, 1)} °C lower than the 0.45 MPa value, the ${Math.round(plausible * 100)}% gap ${c.pairs} ${S.matrix(m)} grades publishing both loads show`,
      canScreen: bracketScreening[S.matrix(m)].certified,
      screenLimit: bracketScreening[S.matrix(m)].certified ? null : `the unstated-load bracket for ${S.matrix(m)} matrices is not certified to screen: ${bracketScreening[S.matrix(m)].why}`,
    };
  }
  return bracketScreening;
}

/**
 * The screening back-test (D48): hide what each evidence class lacks from every measured headline, predict it with
 * the production ranges, and certify the class only if those ranges are honest on both sides.
 */
export function backTest({ key, model, S, obs, P, hp, tmMean, rangeFor }) {
  const classCases = { 'this-grade': [], 'this-material': [], family: [] };
  for (const m of S.pool) {
    const h = m.headline[key];
    if (!h?.known || (key === 'hdt045' && !(h.loadStated && h.loadMPa === 0.45))) continue;
    const f = S.fkey(h.gradeId);
    const headline = obs.map((o, i) => (o.m.id === m.id && o.f === f && o.kind === HEAD[key] ? i : -1)).filter((i) => i >= 0);
    if (!headline.length) continue;
    const rest = obs.map((o, i) => ((o.m.id === m.id || o.f === f) && !headline.includes(i) ? i : -1)).filter((i) => i >= 0);
    const manufacturer = S.grades.get(h.gradeId)?.manufacturer;
    const held = (hide) => {
      const p = predict(P, hp, m, f, manufacturer, hide);
      p.mu += tmMean(m);
      // Own published bounds are left out: in the back-test they would be the hidden evidence itself.
      const { wide } = rangeFor(m, m, p, h.unit, { ownBounds: false });
      return { materialId: m.id, y: h.value, lo: wide[0], hi: wide[1] };
    };
    // This grade: its other published kinds remain. This material: the whole grade is hidden, its other grades
    // remain. Family: everything of the material and its product is hidden.
    const sameGrade = rest.filter((i) => obs[i].f === f), otherGrades = rest.filter((i) => obs[i].f !== f);
    if (sameGrade.length) classCases['this-grade'].push(held(headline));
    if (otherGrades.length) classCases['this-material'].push(held([...headline, ...sameGrade]));
    classCases.family.push(held([...headline, ...rest]));
  }
  return Object.fromEntries(Object.entries(classCases).map(([c, cases]) => [c, certifyScreening(cases, model.screening)]));
}

/**
 * The range that decides a screen (D48). A certified class screens on its own plausible range. A class the
 * back-test could not certify screens only where the certified family model agrees: on the union of its own
 * range and the family-only range (the material's own evidence hidden), which is never narrower than a
 * certified family screen. familyWide() is called only when that union is needed.
 */
export function screenDecision({ strength, certification, wide, familyWide, unit }) {
  let screenRange = null, screenBasis = null;
  if (certification[strength].certified) {
    screenRange = { lo: wide[0], hi: wide[1] };
    screenBasis = `${strength} estimates are certified to screen: ${certification[strength].why}`;
  } else if (strength !== 'family' && certification.family.certified) {
    const fw = familyWide();
    screenRange = { lo: Math.min(wide[0], fw[0]), hi: Math.max(wide[1], fw[1]) };
    screenBasis = `${strength} estimates are not certified (${certification[strength].why}); screens only where the certified family-only range, ${sig3(fw[0], -1)} to ${sig3(fw[1], 1)} ${unit}, fails too`;
  }
  const canScreen = !!screenRange;
  return {
    canScreen,
    screenRange: screenRange && { lo: sig3(screenRange.lo, -1), hi: sig3(screenRange.hi, 1) },
    screenBasis,
    screenLimit: canScreen ? null : `${strength === 'family' ? 'family-model' : strength} estimates of this property are not certified to screen: ${certification[strength].why}`,
  };
}
