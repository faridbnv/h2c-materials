// Screening (DECISIONS D48, D59): when an estimate may remove a material from Explore.
//
// A screen removes a material whose range wholly fails a requirement. It is wrong only when the true value lies beyond
// the end of the range the requirement tests: above the top for a minimum ("at least 3 GPa"), below the bottom for a
// maximum. So each end is set, and judged, on its own:
//
//   Every build hides every measured headline as far as an evidence class requires (this grade, this material, the
//   family model), predicts it honestly (calibration.js makeHoldOut), and records where the true value fell in the
//   prediction. Each end of the class's screening ranges is placed at a distribution-free tolerance limit of those
//   positions: the r-th most extreme, with r the largest count for which a new true value lies beyond the end at most
//   screening.maxWrongRate of the time with screening.confidence (Wilks). The end is never inside the plausible range
//   the reader sees, and moves outwards only where the back-test shows the model's tail is too thin. A class with too few
//   cases to show it (22 at 10% and 90%) cannot screen on its own.
//   An end its class cannot set screens only where the family model's end agrees: their union.
//   An end the material's own evidence lies beyond never screens: the model may not overrule the material's own sheet.
//
// The unstated-load bracket of a heat deflection headline is set the same way, from the gaps between the two loads
// grades publishing both show; its lower end is the published value itself, which physics guarantees.
//
// What the guarantee assumes: a material whose headline is missing is like the measured ones its class was back-tested on
// (exchangeable), and the positions come from calibrated hold-out ranges without the material's own published bounds,
// while an estimate's own range uses them. It holds per end at 90% confidence, so of the thirty or so ends a build sets,
// about three may be expected to exceed 10%.

import { binomialTail } from './numerics.js';
import { HEAD, sig3 } from './model.js';

const pct = (x) => `${Math.round(x * 1000) / 10}%`;
const ordinal = (r) => ['largest', 'second largest', 'third largest'][r - 1] ?? `${r}th largest`;
const SIDES = { above: { end: 'hi', noun: 'top', requirement: 'a minimum requirement' }, below: { end: 'lo', noun: 'bottom', requirement: 'a maximum requirement' } };

/**
 * The tolerance limit of n scores (larger is more extreme): the r-th largest, with r the largest count such that at
 * least r of n draws beyond the limit's content has probability at least `confidence`. Null when n is too small for
 * any r. Distribution-free for exchangeable scores: P(content >= 1 - maxWrongRate) = P(Binomial(n, maxWrongRate) >= r).
 */
export function toleranceRank(n, { maxWrongRate, confidence }) {
  let r = 0;
  while (r < n && binomialTail(n, maxWrongRate, r + 1) >= confidence) r++;
  return r || null;
}

/** The fewest cases that can set a tolerance limit at all: 1 - (1 - maxWrongRate)^n >= confidence. */
export const minimumCases = ({ maxWrongRate, confidence }) => Math.ceil(Math.log(1 - confidence) / Math.log(1 - maxWrongRate));

/**
 * One end of a class's screening ranges. cases: [{ u, beyond: { above, below } }], where u is where the true value fell in
 * its prediction (0 to 1) and beyond says whether it lay outside the plausible range on each side. nominal: the
 * plausible range's upper probability (0.975). Returns the probability at which the end is taken (`quantile`: for the
 * top, the upper probability; for the bottom, the lower one) or certified: false.
 */
export function toleranceSide(cases, side, cfg, nominal) {
  const n = cases.length;
  const beyond = cases.filter((c) => c.beyond[side]).length;
  const conf = Math.round(cfg.confidence * 100);
  const r = toleranceRank(n, cfg);
  const base = { held: n, beyondPlausible: beyond };
  if (!r) return { ...base, rank: null, quantile: null, certified: false, why: `only ${n} back-tested cases; ${minimumCases(cfg)} are needed to show at ${conf}% confidence that at most ${pct(cfg.maxWrongRate)} of true values lie ${side} an end` };
  const scores = cases.map((c) => (side === 'above' ? c.u : 1 - c.u)).sort((a, b) => b - a);
  const t = scores[r - 1];
  if (t >= 1 - 1e-6) return { ...base, rank: r, quantile: null, certified: false, why: `${beyond} of ${n} true values lay ${side} the plausible range, some beyond anything the model reaches` };
  const upper = Math.max(nominal, t);
  const quantile = Number((side === 'above' ? upper : 1 - upper).toPrecision(6));
  const widened = t > nominal;
  return {
    ...base, rank: r, quantile, certified: true,
    why: `${beyond} of ${n} true values lay ${side} the plausible range; its ${SIDES[side].noun} is taken at the ${Math.round(quantile * 10000) / 100}% point${widened ? ', wider than the plausible range,' : ''} so that at ${conf}% confidence at most ${pct(cfg.maxWrongRate)} of true values lie ${side} it`,
  };
}

/** Both ends of a class. `certified` is true when either end may screen. */
export function certifyScreening(cases, cfg, nominal) {
  const above = toleranceSide(cases, 'above', cfg, nominal), below = toleranceSide(cases, 'below', cfg, nominal);
  return { held: cases.length, above, below, certified: above.certified || below.certified };
}

/**
 * A heat deflection value whose load the source never stated was measured at 0.45 MPa or at 1.8 MPa. At 0.45 MPa it is
 * the value; at 1.8 MPa the 0.45 MPa value lies above it by the gap this matrix shows between the two loads. So the
 * 0.45 MPa value is bracketed, not merely bounded below: PLA Lite's 53 °C means 53 to about 63 °C, not "53 or anything
 * above". Treated as unbounded, it kept a PLA among candidates for "heat resistance at least 100 °C".
 *
 * Attaches loadBracket to every unstated-load heat deflection headline and returns the per-matrix tolerance of the gap.
 */
export function attachLoadBrackets({ raw, conv, S, model, zPlausible }) {
  const { plausible } = model.levels;
  const cfg = model.screening;
  // The gaps between the two loads, on every formulation publishing both, per matrix: an amorphous bar a few degrees,
  // an unfilled semicrystalline one up to 120 °C.
  const byF = new Map();
  for (const o of raw) { if (!byF.has(o.f)) byF.set(o.f, { m: o.m, kinds: new Map() }); byF.get(o.f).kinds.set(o.kind, o.yRaw); }
  const gaps = new Map();
  for (const { m, kinds } of byF.values()) {
    const matrix = S.matrix(m);
    const y = kinds.get('HDT 0.45'), v = kinds.get(`HDT 1.8 ${matrix}`);
    if (y == null || v == null || !conv[`HDT 1.8 ${matrix}`]) continue;
    if (!gaps.has(matrix)) gaps.set(matrix, []);
    gaps.get(matrix).push(y - v);
  }
  const bracketScreening = Object.fromEntries(['amorphous', 'semi-unfilled', 'semi-filled', 'elastomer'].map((matrix) => {
    const g = [...(gaps.get(matrix) ?? [])].sort((a, b) => b - a), n = g.length, c = conv[`HDT 1.8 ${matrix}`];
    const plausibleGap = c ? c.offset + zPlausible * c.sd : null;
    const r = toleranceRank(n, cfg);
    const conf = Math.round(cfg.confidence * 100);
    if (!r || plausibleGap == null) return [matrix, { held: n, rank: null, topGap: null, certified: false, why: `only ${n} grades publish both loads; ${minimumCases(cfg)} are needed to show at ${conf}% confidence that at most ${pct(cfg.maxWrongRate)} of gaps are larger` }];
    const topGap = Math.max(plausibleGap, g[r - 1]);
    return [matrix, { held: n, rank: r, topGap: sig3(topGap, 1), certified: true, why: `${n} grades publish both loads; at ${conf}% confidence at most ${pct(cfg.maxWrongRate)} of grades show a gap larger than ${sig3(topGap, 1)} °C, the ${g[r - 1] >= plausibleGap ? `${ordinal(r)} gap observed` : `${Math.round(plausible * 100)}% gap, which is larger than the ${ordinal(r)} observed`}` }];
  }));
  for (const m of S.pool) {
    const h = m.headline.hdt045;
    const c = conv[`HDT 1.8 ${S.matrix(m)}`];
    if (!h?.known || h.loadStated !== false || !c) continue;
    const top = bracketScreening[S.matrix(m)];
    h.loadBracket = {
      lo: h.value, hi: sig3(h.value + c.offset + zPlausible * c.sd, 1), unit: h.unit,
      why: `at 0.45 MPa the value itself; at 1.8 MPa up to ${sig3(c.offset + zPlausible * c.sd, 1)} °C lower than the 0.45 MPa value, the ${Math.round(plausible * 100)}% gap ${c.pairs} ${S.matrix(m)} grades publishing both loads show`,
      // The bottom is the published value, which bounds the 0.45 MPa value by physics; the top screens only where the
      // gaps grades publish show how far above it the 0.45 MPa value can lie.
      screenRange: { lo: h.value, hi: top.certified ? sig3(h.value + top.topGap, 1) : null },
      canScreen: true,
      screenLimit: top.certified ? null : `the top of the unstated-load bracket for ${S.matrix(m)} matrices cannot screen a minimum requirement: ${top.why}`,
    };
  }
  return bracketScreening;
}

/**
 * The screening back-test: hide what each evidence class lacks from every measured headline, predict it honestly, and
 * set each end of the class's screening ranges from where the true values fell.
 */
export function backTest({ key, model, S, obs, tmMean, rangeFor, holdOut }) {
  const nominal = 0.5 + model.levels.plausible / 2;
  const classCases = { 'this-grade': [], 'this-material': [], family: [] };
  for (const m of S.pool) {
    const h = m.headline[key];
    if (!h?.known || (key === 'hdt045' && !(h.loadStated && h.loadMPa === 0.45))) continue;
    const f = S.fkey(h.gradeId);
    const headline = obs.map((o, i) => (o.m.id === m.id && o.f === f && o.kind === HEAD[key] ? i : -1)).filter((i) => i >= 0);
    if (!headline.length) continue;
    const rest = obs.map((o, i) => ((o.m.id === m.id || o.f === f) && !headline.includes(i) ? i : -1)).filter((i) => i >= 0);
    const manufacturer = S.grades.get(h.gradeId)?.manufacturer;
    const held = (hide, wholeMaterial = false) => {
      const p = holdOut(m, f, manufacturer, hide, { wholeMaterial });
      p.mu += tmMean(m);
      // Own published bounds are left out: in the back-test they would be the hidden evidence itself.
      const { wide, cdf } = rangeFor(m, m, p, h.unit, { ownBounds: false });
      return { materialId: m.id, u: cdf(h.value), beyond: { above: h.value > wide[1], below: h.value < wide[0] } };
    };
    // This grade: its other published kinds remain. This material: the whole grade is hidden, its other grades
    // remain. Family: everything of the material and its product is hidden.
    const sameGrade = rest.filter((i) => obs[i].f === f), otherGrades = rest.filter((i) => obs[i].f !== f);
    if (sameGrade.length) classCases['this-grade'].push(held(headline));
    if (otherGrades.length) classCases['this-material'].push(held([...headline, ...sameGrade]));
    classCases.family.push(held([...headline, ...rest], true));
  }
  return Object.fromEntries(Object.entries(classCases).map(([c, cases]) => [c, certifyScreening(cases, model.screening, nominal)]));
}

/**
 * The range that decides a screen, end by end. at(q): the estimate's quantile q; familyAt(q): the family-only
 * prediction's quantile q, the material's own evidence hidden, computed only when needed; own: the material's own
 * observations converted to the headline, [{ value, bound: 'lower' | 'upper' | undefined, measurementId }].
 */
export function screenDecision({ strength, certification, at, familyAt, own, unit }) {
  const ends = {}, basis = [], limits = [];
  for (const [side, { end, noun, requirement }] of Object.entries(SIDES)) {
    const mine = certification[strength][side], fam = certification.family[side];
    let value = null, why = null;
    if (mine.certified) {
      value = at(mine.quantile);
      why = `its ${noun} screens ${requirement}: ${strength} estimates, ${mine.why}`;
    } else if (strength !== 'family' && fam.certified) {
      const familyEnd = familyAt(fam.quantile);
      value = end === 'lo' ? Math.min(at(fam.quantile), familyEnd) : Math.max(at(fam.quantile), familyEnd);
      why = `its ${noun} screens ${requirement} only where the family model's ${noun} (${sig3(familyEnd, end === 'lo' ? -1 : 1)} ${unit}) agrees: ${strength} estimates cannot set it (${mine.why}); family estimates, ${fam.why}`;
    } else {
      limits.push(`it cannot screen ${requirement}: ${strength === 'family' ? 'family-model estimates' : `neither ${strength} nor family-model estimates`} of this property can set its ${noun} (${(strength === 'family' ? fam : mine).why})`);
    }
    // The material's own evidence beyond the end: the model may not screen against the material's own sheet.
    if (value != null) {
      const beyond = own.find((o) => (side === 'above' ? o.value > value && o.bound !== 'upper' : o.value < value && o.bound !== 'lower'));
      if (beyond) {
        limits.push(`it cannot screen ${requirement}: its own ${beyond.measurementId ?? 'nominal hardness'} (${sig3(beyond.value)} ${unit}, converted to this headline) lies ${side} the range the model would screen on`);
        value = null;
      } else basis.push(why);
    }
    ends[end] = value == null ? null : sig3(value, end === 'lo' ? -1 : 1);
  }
  const canScreen = ends.lo != null || ends.hi != null;
  return {
    canScreen,
    screenRange: canScreen ? { lo: ends.lo, hi: ends.hi } : null,
    screenBasis: basis.length ? `${basis.join('; ')}.` : null,
    screenLimit: limits.length ? `${limits.join('; ')}.` : null,
  };
}
