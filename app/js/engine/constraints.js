// The selection engine. Pure: no DOM, no globals, no imports from ../ui.
//
// Two rules from the brief shape everything here.
//   "Hard constraints determine eligibility. Soft preferences rank eligible candidates."
//   (The second half is not built. A preference is evaluated and reported beside each candidate,
//   but it does not reorder anything, and the interface says so rather than implying a ranking.)
//   Missing data is information: PASS, FAIL, UNKNOWN and INDETERMINATE are four different answers.
//
// INDETERMINATE is not a synonym for UNKNOWN. UNKNOWN means no comparable evidence exists.
// INDETERMINATE means evidence exists and the threshold cuts through it, so the source cannot
// settle the question either way.

import { productView, scenarioStates, SHARE } from './products.js';
import { ledgerInterval, ledgerRow, ledgerReason, disagreeReason, knownNote, requirementWords, fig } from './ledger.js';
import { fillerOf, isNamedFiller } from './filler.js';

export { SHARE };

export const STATUS = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  UNKNOWN: 'UNKNOWN',
  INDETERMINATE: 'INDETERMINATE',
};

/**
 * What a print gate's verdict answers for a requirement: the one mapping, which the page's chips read too (ui/labels.js
 * gateVerdict), in the order a gate across several profiles prefers them (build/src/gates.js GATE_PRECEDENCE). A maker's
 * window says any setting in it works, so one whose bottom the H2C covers by at least 5 °C passes, at its low end, and
 * one it reaches only at the bottom edge is on the line (D151, amending D32). A temperature above what the H2C reaches
 * that a sheet only recommends is not a requirement (D6), so it never removes a candidate on its own. Silence is unknown.
 */
export const GATE_STATUS = {
  within: STATUS.PASS,
  'within-low-end': STATUS.PASS,
  edge: STATUS.INDETERMINATE,
  'exceeds-recommended': STATUS.INDETERMINATE,
  exceeds: STATUS.FAIL,
  unknown: STATUS.UNKNOWN,
};

export const UNKNOWN_POLICY = {
  STRICT: 'strict',            // unknown does not satisfy a mandatory constraint
  EXPLORATION: 'exploration',  // unknown is retained, flagged "needs verification"
};

/**
 * Coerce a policy value to one the engine recognises.
 *
 * Without this, an unrecognised string (a hand-edited or older URL hash, say) made the verdict and
 * the eligibility test disagree: unresolved candidates were marked UNKNOWN, which the status bar
 * reported as Explore, while the eligibility test still held them out as if Strict. Anything that
 * is not explicitly exploration is strict, which is the conservative direction.
 */
export function normalizePolicy(value) {
  return value === UNKNOWN_POLICY.EXPLORATION ? UNKNOWN_POLICY.EXPLORATION : UNKNOWN_POLICY.STRICT;
}

const fmt = (n) => (Number.isFinite(n) ? String(Number(n.toFixed(6))) : String(n));
/**
 * A number in a reason a person reads: fmt's digits, the whole part grouped by thousands from 1,000 ("Published 1,310
 * kg/m³"), as the drawer prints the same value beside it (coherence round, C12). A criterion keeps fmt: it is a key.
 */
const fmtWords = (n) => fmt(n).replace(/^(-?)(\d{4,})/, (all, sign, int) => `${sign}${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`);

/** A range whose ends may be open (null): "40 to 60", "at least 40", "at most 60". */
export const rangeText = (lo, hi, unit = '') => `${lo != null && hi != null ? `${fmt(lo)} to ${fmt(hi)}` : lo != null ? `at least ${fmt(lo)}` : `at most ${fmt(hi)}`}${unit ? ` ${unit}` : ''}`;

/**
 * The one-sided bound an interval states ("> 300 %"), or null for a point, a range and a mean with a band. `sign` is
 * what the sheet prints and what a number cell shows; `words` is the page's wording for the same operator (filters.js,
 * labels.js), for text that has room. A bound limits a value and is never the value, so every place that prints one
 * says so.
 */
export function boundOf(interval) {
  if (!interval) return null;
  const { lo, hi, openLow, openHigh } = interval;
  if (lo != null && hi == null) return openLow ? { sign: '>', words: 'more than' } : { sign: '≥', words: 'at least' };
  if (hi != null && lo == null) return openHigh ? { sign: '<', words: 'less than' } : { sign: '≤', words: 'at most' };
  return null;
}

/**
 * The bound a headline entry shows as its number, as its interval, or null. A product's own value carries its interval;
 * a material's number is its products' median, a bound only where it is the value of a typical product that published one.
 */
export function publishedBound(entry) {
  const iv = entry?.spread ? (entry.typical?.value === entry.value ? entry.typical?.interval : null) : entry?.interval;
  return boundOf(iv) ? iv : null;
}

/**
 * Compare an asserted interval against a threshold.
 * An unbounded end is null. A point value is lo === hi.
 */
export function compareInterval(interval, operator, threshold) {
  if (!interval) return STATUS.UNKNOWN;
  const { lo, hi, openLow, openHigh } = interval;

  switch (operator) {
    case '>=': {
      if (lo !== null && lo >= threshold) return STATUS.PASS;
      if (hi !== null && (hi < threshold || (hi === threshold && openHigh))) return STATUS.FAIL;
      return STATUS.INDETERMINATE;
    }
    case '>': {
      if (lo !== null && (lo > threshold || (lo === threshold && openLow))) return STATUS.PASS;
      if (hi !== null && hi <= threshold) return STATUS.FAIL;
      return STATUS.INDETERMINATE;
    }
    case '<=': {
      if (hi !== null && hi <= threshold) return STATUS.PASS;
      if (lo !== null && (lo > threshold || (lo === threshold && openLow))) return STATUS.FAIL;
      return STATUS.INDETERMINATE;
    }
    case '<': {
      if (hi !== null && (hi < threshold || (hi === threshold && openHigh))) return STATUS.PASS;
      if (lo !== null && lo >= threshold) return STATUS.FAIL;
      return STATUS.INDETERMINATE;
    }
    default:
      throw new Error(`Unsupported operator "${operator}"`);
  }
}

// ---------------------------------------------------------------- numeric headline

// The order a numeric requirement is answered in (D153): 1, a property that does not apply; 2, the product's own value
// measured the way the requirement asks (or as published, where the reader admits that), which always wins; 3, what the
// evidence ledger bounds it to, from its other records and its kind's physics limits; 4, an estimate, which never
// decides; 5, a value published the other way, in another state, or nothing.
function evaluateNumeric(material, c, ctx = {}) {
  const h0 = material.headline?.[c.property];
  const label = `${c.property} ${c.operator} ${fmt(c.value)}`;
  // A value that is only a ceiling for the printed part (CV05: a PLA or PET HDT from a bar its sheet does not describe)
  // decides where a ceiling can: it fails a minimum it misses and passes a maximum it meets. Where it would pass a
  // minimum it shows nothing, and the ledger is read after it.
  const ceilingOpen = !!h0?.known && !!h0.ceilingOnly && compareInterval({ lo: null, hi: h0.value, kind: 'range' }, c.operator, c.value) === STATUS.INDETERMINATE;
  const h = ceilingOpen ? { known: false, unit: h0.unit, missing: 'not-comparable', ceiling: h0, ...(h0.ledger ? { ledger: h0.ledger } : {}) } : h0;

  if (!h || !h.known) {
    // A property that does not apply (heat deflection of an elastomer, any value of a support
    // product) is a statement, not a gap: a definition, not an inference. It can never pass, and it
    // holds the material out of Include whether estimates are on or off; the SCREENED chip brings it
    // back. It is still UNKNOWN, never FAIL, and Leave out holds it out for missing data as before
    // (D56; D148, which ended its coupling to the estimates switch of D43).
    if (h?.notApplicable) {
      return {
        status: STATUS.UNKNOWN, notApplicable: true, screened: true, vetoedBy: [],
        criterion: label, reason: `Does not apply: ${h.notApplicable.reason}`, missing: h?.missing ?? 'not-published',
      };
    }
    // What the evidence ledger bounds it to (D153, D154): its other records, each in its one safe direction, and its
    // kind's physics limits. A bound that decides names its record; one that leaves the limit on either side is said
    // after whatever answers next, and a reported row is never read here.
    const led = ledgerResult(h, c, ctx, label, material.state, h?.ceiling?.measurementId);
    if (led.result) return led.result;
    const known = led.note ?? '';
    // An estimate is inference, so the verdict stays UNKNOWN whatever it says: the verdict describes
    // the evidence (D26). What an estimate may change is eligibility, and only in one direction. It
    // screens a material out of Include when its plausible (95%) range and the range the build's back-test
    // lets it screen on both wholly fail the requirement, and no measurement of the material bounds the
    // headline from below and meets it (D48). Each end of the screening range is set on its own (D59): an end
    // the back-test cannot set, or that the material's own evidence lies beyond, is open and screens nothing. The
    // likely (80%) range is what the reader sees; the wider ones decide.
    // Which estimate this is depends on the material. A material with products is judged product by product, and each
    // product carries its own prediction (D137), which no back-test yet lets screen: so in this release no estimate of
    // a material with products hides it, and its material estimate is never read here (products.js productHeadline).
    // Only a material with no product (PA66-CF, PA612, PA612-GF) is judged on its own estimate, which may screen it (D148).
    if (ctx.useEstimates && h?.estimate) {
      const est = h.estimate;
      const wide = est.plausible ?? { lo: est.lo, hi: est.hi };
      const plausible = compareInterval({ lo: wide.lo, hi: wide.hi, kind: 'range' }, c.operator, c.value);
      // The build's back-test decides the range that may screen, end by end (D48, D59). An older snapshot without
      // screenRange screens on the plausible range.
      const decides = est.screenRange ?? wide;
      const screenFails = compareInterval({ lo: decides.lo, hi: decides.hi, kind: 'range' }, c.operator, c.value) === STATUS.FAIL;
      const span = `${fmtWords(est.lo)} to ${fmtWords(est.hi)} ${est.unit}`;
      // A measurement of the material that bounds this headline from below and meets the requirement vetoes the
      // screen: the headline is at least that value (headline_definitions.csv Lower bound, D48). Other related values,
      // other endpoints and moulded resin values do not bound it; the estimate already carries them.
      const veto = (h.impliedBounds ?? []).filter((b) => compareInterval({ lo: b.lo, hi: null }, c.operator, c.value) === STATUS.PASS);
      const permission = !est.screening || ctx.completeProductContext === true;
      const screened = plausible === STATUS.FAIL && screenFails && est.canScreen && permission && !veto.length;
      const reason = plausible === STATUS.FAIL
        ? screened
          ? `Not published. Estimated ${span} (plausibly ${fmtWords(wide.lo)} to ${fmtWords(wide.hi)}), which cannot meet this requirement. Hidden; not measured`
          : veto.length
            ? `Not published. Estimated ${span} would fail, but its own ${lowerFirst(veto[0].property)} (${fmtWords(veto[0].lo)} ${veto[0].unit}) bounds it from below and meets the requirement, so it is not hidden`
            : est.canScreen && (c.operator.startsWith('>') ? decides.hi != null : decides.lo != null)
              ? `Not published. Estimated ${span} would fail, but the range it may screen on, ${rangeText(decides.lo, decides.hi, est.unit)}, could still meet it`
              : `Not published. Estimated ${span} would fail, but ${est.screenLimit ?? 'this estimate cannot screen'}`
        : `Not published. Estimated ${span} (plausibly ${fmtWords(wide.lo)} to ${fmtWords(wide.hi)}); ${plausible === STATUS.PASS ? 'plausible' : 'possible'}, but never enough to pass`;
      const disclosure = (h.asPublished ? ` Published ${fmtWords(h.asPublished.value)} ${h.unit}, but its test conditions do not qualify.`
        : h.elsewhere?.length ? ` ${elsewhereReason(h, material.state, c)}.`
          : h.related?.length ? ` Published related values: ${h.related.join('; ')}; no qualifying measurement.` : '')
        // Its own sheets disagree beyond what their conversions allow (D167): nothing anchors the estimate.
        + (est.ownBand?.disagree ? ` Its own sheets disagree on this property (${est.ownBand.bands.map((b) => rangeText(b.lo, b.hi, est.unit)).join(' against ')} once converted), so it is not tagged likely.` : '');
      // Said plainly (stage 3d; the trial read "outside the complete printer context used for screening validation").
      const permissionReason = est.screening && !permission ? ' Its estimate was tested only on products whose own sheets put the nozzle, bed and chamber plainly within the H2C, which this one\'s do not.' : '';
      return {
        status: STATUS.UNKNOWN,
        estimated: true,
        estimate: est,
        plausible,
        screened,
        vetoedBy: veto.map((r) => r.measurementId),
        criterion: label,
        reason: withNote(reason.replace(/^Not published\./, 'No qualifying measurement.') + disclosure + permissionReason + ' Confirm the exact product, property and service state with the maker or a printed-coupon test.', known),
        missing: h?.missing ?? 'not-published',
      };
    }
    // A value that is only a ceiling for the printed part, which would meet a minimum (CV05, D153): said, and open.
    if (h?.ceiling) {
      const v = h.ceiling;
      return {
        status: STATUS.INDETERMINATE, criterion: label, missing: 'not-comparable',
        ceilingOnly: { measurementId: v.measurementId ?? null, value: v.value },
        reason: withNote(`Published ${fmtWords(v.value)} ${h.unit} on a bar its sheet does not describe. For a plastic that prints glassy but can crystallise that is the most a printed part reaches (a moulded bar crystallises, a print does not), so it does not show the printed part meets ${requirementWords(c, h.unit)}; ask the maker how the bar was made, or test a printed coupon`, known),
      };
    }
    // An estimate withheld because the product's own values and its kind's model disagree (D167): said after what follows.
    const withheld = ctx.useEstimates && h?.withheld ? `. Its own values put it at ${rangeText(h.withheld.ownBand?.lo, h.withheld.ownBand?.hi, h.unit)} once converted, where its kind's estimate is ${fmtWords(h.withheld.centre)} ${h.unit}, so no estimate is shown` : '';
    // A product value set apart (D172): from a test bar no document describes as printed, or a heat deflection whose sheet
    // states no load, which bounds the 0.45 MPa value only from below, through the evidence ledger (CV63). Shown, never deciding.
    if (h?.asPublished) {
      const v = `${fmtWords(h.asPublished.value)} ${h.unit}`;
      const why = h.asPublished.caveat === 'not-described'
        ? `Published ${v} on a test bar its document does not describe as printed (nothing on it says, even implicitly, that the bar was printed), so it is set apart and never used to pass${withheld}; the maker's word on how the bar was made, or a printed coupon, settles it`
        : h.asPublished.caveat === 'load-not-stated'
          ? `Published ${v} without the test load, so it is not used at its value: at either load it shows only that the heat deflection at 0.45 MPa is at least ${v}${withheld}`
          : `Published ${v} without a usable specimen orientation, so it is not used${withheld}`;
      return { status: STATUS.UNKNOWN, criterion: label, missing: 'not-comparable', asPublished: h.asPublished, reason: withNote(why, known) };
    }
    // Published in a state this scenario does not judge the product in (D99): said, with what would let it decide.
    if (h?.elsewhere?.length) {
      return { status: STATUS.UNKNOWN, criterion: label, missing: 'other-state', elsewhere: h.elsewhere, reason: withNote(elsewhereReason(h, material.state, c), known) };
    }
    return {
      status: STATUS.UNKNOWN,
      reason: withNote(h?.missing === 'not-available-in-market'
        ? 'No price in the sampled shops'
        : h?.related?.length ? `No qualifying measurement. Published related values: ${h.related.join('; ')}${withheld}. Ask the maker for this property in the required specimen and service state, or test a printed coupon.` : 'Not published in the sampled sources; ask the maker or test a printed coupon', known),
      criterion: label,
      missing: h?.missing ?? 'not-published',
    };
  }

  const interval = h.interval ?? { lo: h.value, hi: h.value, kind: 'point' };
  // A published "mean ± band" is judged on its mean (owner ruling, audit 2026-09-15, C-04; DECISIONS D54). The band is
  // mostly a specimen standard deviation, not a tolerance: read as hard limits, "35 ± 4 MPa" never passed 33 MPa and
  // 128 of 362 headlines could decide nothing near their own value. A threshold inside the band is flagged close to
  // the limit. A published range ("42-52") and a one-sided bound ("> 16.5") are still judged as the interval they are.
  const band = interval.kind === 'uncertainty';
  const judged = compareInterval(band ? { lo: h.value, hi: h.value, kind: 'point' } : interval, c.operator, c.value);
  const closeToLimit = band && interval.lo <= c.value && c.value <= interval.hi;
  const bound = boundOf(interval);
  // On the line (D152, amending D54): a maker's figure moves by about its headline's test scatter between its own bars
  // and sheets, so a value measured the way the requirement asks that misses the limit by less is unresolved, not a
  // failure, and one that meets it by less still passes, with a thin margin. Only a published point or mean: a published
  // range and a one-sided bound keep their own rule, a scenario assumption is the reader's number, and a material's
  // median is no maker's figure. A value that is only a ceiling for the printed part (CV05) is a bound the evidence
  // ledger draws, compared with the limit as it is (stage 3d).
  const margin = !bound && !h.assumption && !h.spread && !h.ceilingOnly && (band || interval.lo === interval.hi) ? scatterMargin(scatterOf(ctx, c.property), c, h.unit) : null;
  const onTheLine = !!margin && judged === STATUS.FAIL && margin.within(h.value);
  const thinMargin = !!margin && judged === STATUS.PASS && margin.within(h.value);
  const status = onTheLine ? STATUS.INDETERMINATE : judged;

  let reason;
  if (judged === STATUS.INDETERMINATE) {
    reason = bound
      ? `Published ${bound.words} ${fmtWords(h.value)} ${h.unit}, a bound that leaves the threshold on either side of the value`
      : `Reported range ${fmtWords(interval.lo)} to ${fmtWords(interval.hi)} ${h.unit} straddles the threshold`;
  } else {
    // A scenario assumption is the reader's own number, never a published one (audit 2026-09-15, A-02).
    reason = h.assumption
      ? `Assumed ${fmtWords(h.value)} ${h.unit} (a scenario assumption, not published)`
      : `Published ${bound ? `${bound.words} ` : ''}${fmtWords(h.value)}${band ? ` ± ${fmtWords(h.uncertainty)}` : ''} ${h.unit}`;
    // A value set apart (a bar no document describes as printed, a load or a usable orientation not stated: D172) decides
    // only under the engine's audit lens (`audit:gaps`); the selector never admits it.
    if (h.caveat) reason += `, ${CAVEAT_WORDS[h.caveat] ?? 'set apart'}`;
    // The orientation and the method it was measured to, in one bracket: a pooled method is not an equal one.
    const paren = [!h.caveat && h.direction && h.direction !== 'not-applicable' ? h.direction : null, ...(h.standards ?? [])].filter(Boolean);
    if (paren.length) reason += ` (${paren.join(', ')})`;
    // The state the value is the product's in (D99).
    if (h.anneal) reason += `, after annealing ${schedule(h.anneal)}`;
    // A twin's value is printed on its sibling's sheet too, and recorded there once (D89).
    if (h.from?.label) reason += `, in the ${h.from.label}`;
    // On the line, said with the limit and the scatter; the band's closeness, where it applies too, in the same sentence.
    if (onTheLine) {
      reason += `, just ${margin.atLeast ? 'under' : 'over'} ${fmtWords(c.value)} ${h.unit}: ${closeToLimit ? 'close to the limit, inside its published scatter and' : 'within'} the test scatter (${margin.words}), so on the line; one test bar or a word with the maker settles it`;
    }
    if (h.caveat) reason += '. Used only because the audit lens admits values the selector sets apart';
    // What the screening policy admitted unstated (GOALS 2026-09-28, decision 5).
    if (h.admitted?.length) reason += `. ${cap(listWords(h.admitted.map((a) => ADMITTED_WORDS[a])))} not stated${h.admitted.includes('direction') ? '; a printed bar is read as a flat one' : ''}${h.admitted.includes('bar') ? '; it counts all the same, since a plastic that cannot crystallise deflects near its glass transition whether its bar was moulded or printed' : ''}`;
    if (thinMargin) {
      reason += closeToLimit
        ? `. Close to the limit, a thin margin: the threshold is inside the published scatter and the test scatter (${margin.words}), so some parts may fall below it`
        : `. A thin margin: within the test scatter (${margin.words}) of ${fmtWords(c.value)} ${h.unit}`;
    } else if (closeToLimit && !onTheLine) {
      reason += `. Close to the limit: the threshold is inside the published scatter, so ${status === STATUS.PASS ? 'some parts may fall below it' : 'some parts may meet it'}`;
    }
  }
  // A value its own records, under a deciding conversion row, or its kind's deciding limit contradict by more than the
  // test scatter (C40, D153, D154): it still decides, and the answer says it is doubtful.
  if (h.doubtful?.length) reason += `. Doubtful: ${h.doubtful.map((d) => doubtWords(d, h.unit, ctx)).join('; ')}; re-read before relying on it`;
  return {
    status, reason, criterion: label, closeToLimit,
    ...(onTheLine ? { onTheLine } : {}), ...(thinMargin ? { thinMargin } : {}),
    ...(h.doubtful?.length ? { doubtful: h.doubtful } : {}),
    observed: h.value, unit: h.unit, interval,
    measurementId: h.measurementId, gradeId: h.gradeId, sourceId: h.sourceId,
    direction: h.direction,
    ...(h.admitted?.length ? { admitted: h.admitted } : {}),
    // A pass on a value set apart, which only the audit lens admits (D172): the result says which caveat it carries.
    ...(h.caveat ? { caveat: h.caveat } : {}),
  };
}

const ADMITTED_WORDS = { direction: 'orientation', specimen: 'specimen type', moisture: 'moisture state', treatment: 'post-processing', bar: 'how the test bar was made' };
// Why a value is set apart (D172), in a reason's words.
const CAVEAT_WORDS = { 'not-described': 'on a test bar not described as printed', 'load-not-stated': 'test load not stated', 'unstated-direction': 'no usable test orientation stated' };

// A headline's test scatter (D152): how far one maker's published figure moves between its own bars and sheets, from the
// registry the context carries (headline_definitions.csv Test scatter), or null where it has none or the context no
// registry. Read once per registry.
const SCATTER = new WeakMap();
function scatterOf(ctx, key) {
  const headlines = ctx?.db?.registry?.headlines;
  if (!headlines) return null;
  if (!SCATTER.has(headlines)) SCATTER.set(headlines, new Map(headlines.filter((x) => x.testScatter).map((x) => [x.key, x.testScatter])));
  return SCATTER.get(headlines).get(key) ?? null;
}
// Twelve significant digits, so a limit times a share lands on its decimal (5 x 0.9 is 4.5) on every machine.
const tidy = (x) => Number(x.toPrecision(12));
/**
 * The band of the test scatter about a requirement's limit L: relative, L·(1 − s) to L·(1 + s); absolute, L − s to L + s.
 * `within(v)` says whether a value lies in it. Read beside the verdict, that is the side that matters: for "at least", a
 * value that fails is on the line down to L·(1 − s), and one that passes has a thin margin up to L·(1 + s); for "at most"
 * the reverse. Arithmetic only, with no exp or log, for one answer on every platform.
 */
function scatterMargin(scatter, c, unit) {
  if (!scatter) return null;
  const L = c.value;
  const lo = scatter.is === 'relative' ? tidy(L * (1 - scatter.value / 100)) : tidy(L - scatter.value);
  const hi = scatter.is === 'relative' ? tidy(L * (1 + scatter.value / 100)) : tidy(L + scatter.value);
  return {
    atLeast: c.operator === '>=' || c.operator === '>', lo, hi,
    words: scatter.is === 'relative' ? `${fmt(scatter.value)} %` : `${fmtWords(scatter.value)} ${unit}`,
    within: (v) => v >= lo && v <= hi,
  };
}
/** A reason with a note after it, in one sentence each. */
const withNote = (text, note) => (!note ? text : `${text}${/[.]$/.test(text) ? '' : '.'}${note}`);

/** A contribution as the answer cites it: its rule, kind and record, and the bound it set. */
const ledgerRef = (b, end) => ({ rule: b.rule, kind: b.kind, ...(b.measurementId ? { measurementId: b.measurementId } : {}), bound: end });

/**
 * A requirement answered by the evidence ledger (D153, D154), or the note a deciding interval that leaves the limit on
 * either side adds to the answer that follows. Only a deciding row's contributions are read, at the level the reader
 * admits (D84). A pass names the floor (or, for a maximum, the ceiling) that meets it; a miss within the test scatter is
 * on the line (D152); two records with no value between them are "sheets disagree", unresolved.
 */
function ledgerResult(h, c, ctx, label, state, own = null) {
  const bounds = h?.ledger;
  if (!bounds) return {};
  const iv = ledgerInterval(bounds.by, { evidence: ctx.evidence === 'as-published' ? 'as-published' : 'comparable' });
  if (!iv) return {};
  const unit = h.unit;
  const wordsOf = (b) => ledgerRow(ctx.db, b.rule)?.words;
  if (iv.disagree) {
    return { result: {
      status: STATUS.INDETERMINATE, criterion: label, missing: h.missing ?? 'not-published',
      sheetsDisagree: { lo: ledgerRef(iv.loBy, iv.lo), hi: ledgerRef(iv.hiBy, iv.hi) },
      reason: disagreeReason(iv.loBy, iv.hiBy, { unit, wordsOf }),
    } };
  }
  const judged = compareInterval({ lo: iv.lo, hi: iv.hi, openLow: iv.openLow, openHigh: iv.openHigh, kind: 'range' }, c.operator, c.value);
  // A note that only repeats the product's own demoted value says nothing more.
  if (judged === STATUS.INDETERMINATE) return [iv.loBy, iv.hiBy].filter(Boolean).every((b) => own && b.measurementId === own) ? {} : { note: knownNote(iv, { unit, c }) };
  const atLeast = c.operator.startsWith('>');
  const pass = judged === STATUS.PASS;
  // The end that decides: a minimum is met by the floor and failed by the ceiling; a maximum the reverse.
  const by = pass === atLeast ? iv.loBy : iv.hiBy;
  const end = pass === atLeast ? iv.lo : iv.hi;
  // The test scatter belongs to a point (D152, amended by stage 3d): an equality (CV02's laboratory humidity counts as dry)
  // is the value itself, so it may be on the line or pass with a thin margin. A band, a floor or a ceiling drawn from
  // another record is compared with the limit as it is: its ends are already the envelope of every measured same-sheet
  // pair, and adding the scatter counted that uncertainty twice (Spectrum PLA Tough's flexural band, 1.15 to 4.81 GPa,
  // read as on the line for 5 GPa). A class limit keeps the scatter D154 adds before it fails anything.
  const point = by.kind === 'equal' || by.limit !== undefined;
  const margin = point ? scatterMargin(scatterOf(ctx, c.property), c, unit) : null;
  const onTheLine = !!margin && !pass && margin.within(end);
  const thinMargin = !!margin && pass && margin.within(end);
  return { result: {
    status: onTheLine ? STATUS.INDETERMINATE : judged, criterion: label,
    reason: ledgerReason(by, { unit, words: wordsOf(by), verdict: pass ? 'pass' : onTheLine ? 'line' : 'fail', c, margin: pass ? (thinMargin ? margin : null) : margin, asPrinted: !state?.treatment }),
    ledger: ledgerRef(by, end),
    ...(by.measurementId ? { measurementId: by.measurementId } : {}),
    ...(onTheLine ? { onTheLine } : {}), ...(thinMargin ? { thinMargin } : {}),
    ...(!pass || onTheLine ? { missing: h.missing ?? 'not-published' } : {}),
  } };
}

/** What makes a value doubtful, in a reason's words: the record and rule that contradict it, and where they put it. */
function doubtWords(d, unit, ctx) {
  const row = ledgerRow(ctx.db, d.rule);
  const what = row?.words ?? d.rule;
  const range = d.lo != null && d.hi != null ? (d.lo === d.hi ? `${fig(d.lo)} ${unit}` : `between ${fig(d.lo)} and ${fig(d.hi)} ${unit}`) : d.lo != null ? `at least ${fig(d.lo)} ${unit}` : `at most ${fig(d.hi)} ${unit}`;
  return `${what} puts it ${range}`;
}

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const listWords = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
/** An annealing schedule in a reader's words, the parts its sheet does not state said so. */
export const schedule = (t) => `at ${t?.tempC != null ? `${fmt(t.tempC)} °C` : 'a temperature its sheet does not state'} for ${t?.hours != null ? `${fmt(t.hours)} h` : 'a time its sheet does not state'}`;
const stateWords = (s) => (s?.treatment ? `after annealing ${schedule(s.treatment)}` : 'as printed') + (s?.moisture === 'conditioned' ? ', conditioned' : '');

/**
 * Why a value the product publishes in another state does not decide in this one, and what would let it (D99). A value
 * that misses the requirement `c` as well says so, and annealing is offered only where an annealed value meets it: Bambu
 * Lab PLA Silk+ was offered annealing for a 100 °C bracket on an annealed 60 °C (the screening review, C09; D148).
 */
function elsewhereReason(h, state, c) {
  const misses = (x) => !!c && compareInterval({ lo: x.value, hi: x.value, kind: 'point' }, c.operator, c.value) === STATUS.FAIL;
  // Judged as printed, the annealed value named is one that meets the requirement, where the sheet publishes one.
  const e = (!state?.treatment && h.elsewhere.find((x) => x.treatment && !misses(x))) || h.elsewhere[0];
  const where = `(${fmtWords(e.value)} ${h.unit})${misses(e) ? ', which also misses it' : ''}`;
  // A value set apart (D172): from a test bar no document describes as printed, which no state's answer reads.
  if (e.setApart) return `Published ${stateWords(e)} ${where}, but on a test bar its document does not describe as printed, so it is set apart and never used to pass`;
  if (e.treatment && !state?.treatment) {
    return misses(e)
      ? `Published only after annealing ${schedule(e.treatment)} ${where}, so annealing would not help`
      : `Published only after annealing ${schedule(e.treatment)} ${where}, and this product is judged as printed. Allow annealing under Part condition to use it`;
  }
  if (e.moisture === 'conditioned' && state?.moisture !== 'conditioned') return `Published only after moisture conditioning ${where}, not for the dry state asked about`;
  if (e.moisture !== 'conditioned' && state?.moisture === 'conditioned') {
    return `Published only dry or with moisture unstated ${where}; the conditioned state is asked about, and no conditioned value is inferred from a dry one`;
  }
  return `Published ${stateWords(e)} ${where}, not ${stateWords(state)}; a value of another state decides here only as a bound the evidence ledger draws from it`;
}

// ---------------------------------------------------------------- treatment

/**
 * The treatment a state needs (D99). A product judged in an annealed state is judged on values reached only after that
 * annealing, which the scenario permits: the verdict says so. An annealing its sheet does not state in full cannot be
 * carried out as tested, so it settles nothing.
 */
function evaluateTreatment(material) {
  const t = material.state?.treatment;
  if (!t) return { status: STATUS.PASS, criterion: 'Treatment', reason: 'Used as printed' };
  if (t.tempC == null || t.hours == null) {
    return { status: STATUS.UNKNOWN, criterion: 'Annealing', treatment: t, reason: `Its values in this state come from bars annealed ${schedule(t)}; a schedule its sheet does not give in full cannot be repeated, so it settles nothing` };
  }
  return { status: STATUS.PASS, criterion: 'Annealing', treatment: t, reason: `Needs annealing ${schedule(t)}, as its sheet states; annealing is allowed under Part condition` };
}
export const TREATMENT = { kind: 'treatment', mandatory: true, __group: 'Manufacturing' };

// ---------------------------------------------------------------- process gates

const GATE_LABEL = { nozzle: 'Nozzle temperature', bed: 'Bed temperature', chamber: 'Chamber temperature' };

/** A product's H2C status (D118): Bambu Lab's own spool is an official Bambu product; another maker's spool of a family
 * Bambu sells is of an officially listed family; every other status is the family's. */
export function h2cStatusOf(material) {
  const p = material.product;
  if (!p) return material.h2cStatus;
  if (/^bambu( lab)?$/i.test(String(p.manufacturer ?? '').trim())) return 'Official Bambu product';
  return material.h2cStatus === 'Official Bambu product' ? 'Officially listed family' : material.h2cStatus;
}

function evaluateGate(material, c) {
  if (c.gate === 'scope') {
    const excluded = material.excluded;
    return {
      status: excluded ? STATUS.FAIL : STATUS.PASS,
      criterion: 'H2C-relevant scope',
      // Scope is the one place exclusion is recorded (m146); the material's Limitations say why it is out (an envelope
      // the H2C cannot reach). The sintering feedstocks, whose part is not the printed polymer, left the dataset (D174).
      reason: excluded
        ? 'Beyond H2C capability: more heat than the H2C gives'
        : 'Within H2C capability',
    };
  }
  if (c.gate === 'h2cStatus') {
    // "Official Bambu product" is a product's, not its family's (D118): Bambu Lab's own spool is one; another maker's
    // spool of a family Bambu sells is of an officially listed family. Judged on a material without a product (a family
    // entry, a material screen with no products), the material's recorded status stands.
    const status = h2cStatusOf(material);
    const ok = (c.in ?? []).includes(status);
    return {
      status: ok ? STATUS.PASS : STATUS.FAIL,
      criterion: `H2C status in ${(c.in ?? []).join(', ')}`,
      reason: material.product && status !== material.h2cStatus
        ? `${material.product.manufacturer} ${material.product.product} is not Bambu Lab's own spool; its family is "${material.h2cStatus}", which makes it "${status}"`
        : `Recorded status is "${status}"`,
    };
  }
  // The nozzle question is about hardware the user lacks, not hardware they have. A hardened
  // nozzle prints abrasive and non-abrasive filament alike, so owning one can never remove a
  // material; the old checkbox did exactly that, holding out the 75 materials with no abrasion
  // guidance. The criterion now screens on a *recorded* requirement: a source that says a hardened
  // nozzle is needed fails it, and a fibre-filled material with no guidance stays unresolved,
  // because the filler is the known cause even where no source wrote it down. That last is the
  // database's rule (method.csv, H2C / Abrasive fillers; D121), said as one, never as a source's.
  if (c.gate === 'abrasive') {
    const criterion = 'No hardened nozzle';
    if (c.hardenedAvailable) {
      return { status: STATUS.PASS, criterion: 'Hardened nozzle available', reason: 'A hardened nozzle prints abrasive and non-abrasive filament' };
    }
    const g = material.gates.abrasive;
    // Read from a twin's sheet or a printer maker's guide where the product's own is silent (D88, D89): said so.
    const from = material.gates.abrasiveFrom ? ` (${material.gates.abrasiveFrom})` : '';
    if (g === 'requires-hardened') return { status: STATUS.FAIL, criterion, reason: `A source states it needs an abrasion-resistant nozzle${from}` };
    if (g === 'no-special-concern') return { status: STATUS.PASS, criterion, reason: `A source states no special nozzle concern${from}` };
    // A maker who asks for a nozzle harder than brass, or warns of wear, requires no hardened nozzle (D168) and does not
    // say brass will do: unresolved for a user with only brass, in the maker's words.
    const advice = material.gates.abrasiveAdvice;
    if (advice) {
      const quoted = `"${String(advice.text).trim().replace(/\s+/g, ' ').slice(0, 140)}"`;
      return { status: STATUS.UNKNOWN, criterion, reason: advice.kind === 'harder-than-brass'
        ? `The maker asks for a nozzle harder than brass, not necessarily a hardened one: ${quoted}`
        : `The maker warns of nozzle wear and asks for no hardened nozzle: ${quoted}` };
    }
    const filler = material.facets?.reinforcement?.value;
    if (material.facets?.fibre?.value || filler === 'carbon-fibre' || filler === 'glass-fibre') {
      return { status: STATUS.UNKNOWN, criterion, reason: 'Fibre-filled, and no source states the nozzle it needs, so it is treated as abrasive until its documents say otherwise' };
    }
    // A filler the materials table names (ceramic, PTFE, metal powder …) is not undisclosed, so it is named (§37.8).
    return {
      status: STATUS.PASS, criterion,
      reason: filler === 'unfilled'
        ? 'No hardened-nozzle requirement recorded'
        : isNamedFiller(fillerOf(material))
          ? `No hardened-nozzle requirement recorded for its ${String(material.modifier).trim().toLowerCase().replace(/\bptfe\b/, 'PTFE')} filler, so check the product: glow, metal, wood and marble fills can wear brass`
          : 'No hardened-nozzle requirement recorded. The filler is not disclosed, so check the product: glow, metal, wood and marble fills can wear brass',
    };
  }

  // "Only show what I can buy." Absence of an offer is not proof a material is unavailable, only
  // that the sampled Canadian retailers did not list it when they were sampled, so it returns
  // UNKNOWN rather than FAIL. An offer that was sampled and is out of stock is positive evidence
  // and does fail. A product is judged on its own offers (D98): another product's stock is not its own. A foreign
  // listing prices a product and lists it in no Canadian shop (D113): `buy` holds Canadian offers only.
  if (c.gate === 'buyable') {
    const buy = material.buy;
    const label = c.inStock ? 'In stock in Canada' : 'Available from a Canadian retailer';
    const what = material.product ? 'this product' : 'this material';
    if (!buy) {
      return {
        status: STATUS.UNKNOWN, criterion: label,
        reason: `No sampled Canadian retailer listed ${what} when sampled`,
      };
    }
    if (c.inStock && !buy.anyInStock) {
      return {
        status: STATUS.FAIL, criterion: label, priceIds: buy.priceIds ?? [],
        reason: `${buy.retailer} lists it, but no sampled offer of ${what} was in stock on ${buy.accessDate}`,
      };
    }
    return {
      status: STATUS.PASS, criterion: label, priceIds: buy.priceIds ?? [],
      reason: `${buy.retailer}${buy.perKg ? `, about ${buy.perKg} CAD/kg` : ''}, seen ${buy.accessDate}`,
    };
  }

  if (c.gate === 'dryingKnown') {
    // A requirement is met by any statement: a schedule the sheet asks for, a drying it advises for a condition, or its
    // word that none is needed (D127). Only silence leaves it unknown.
    const criterion = 'Drying instructions published';
    const from = material.gates.dryingFrom ? ` (${material.gates.dryingFrom})` : '';
    const said = { required: 'Drying schedule published', optional: 'Drying optional', 'not-needed': 'Drying not needed' }[material.gates.drying];
    return said
      ? { status: STATUS.PASS, criterion, reason: `${said}${from}` }
      : { status: STATUS.UNKNOWN, criterion, reason: 'No drying statement in the sampled sources' };
  }

  const g = material.gates[c.gate];
  const label = `${GATE_LABEL[c.gate] ?? c.gate} within H2C baseline`;
  if (!g) return { status: STATUS.UNKNOWN, criterion: label, reason: 'No print profile recorded' };
  // A window the H2C reaches only at its bottom edge is on the line (D151): one test print, or a word with the maker,
  // settles it.
  return { status: GATE_STATUS[g.verdict] ?? STATUS.UNKNOWN, criterion: label, reason: g.reason, ...(g.verdict === 'edge' ? { onTheLine: true } : {}) };
}

// ---------------------------------------------------------------- facets and evidence

function evaluateFacet(material, c) {
  // The filler as a reader files it (filler.js): the reinforcement facet's class, or the filler the materials table
  // names where that facet says undisclosed (§37.8). A requirement on "reinforcement" keeps the facet's own classes.
  if (c.facet === 'filler') {
    const value = fillerOf(material);
    if (value == null) return { status: STATUS.UNKNOWN, criterion: `filler in ${(c.in ?? []).join(', ')}`, reason: 'Facet not recorded' };
    const ok = (c.in ?? []).includes(value);
    return {
      status: ok ? STATUS.PASS : STATUS.FAIL,
      criterion: `filler in ${(c.in ?? []).join(', ')}`,
      reason: `Recorded as ${value}${isNamedFiller(value) ? ', the filler its Modifier / filler names' : ''}`,
    };
  }
  const f = material.facets?.[c.facet];
  if (c.facet === 'supportMaterial' && f) {
    const ok = f.value === c.equals;
    return {
      status: ok ? STATUS.PASS : STATUS.FAIL,
      criterion: c.equals === false ? 'Build material' : 'Support material',
      reason: f.value ? 'A support or interface material' : 'A build material',
    };
  }
  const label = `${c.facet} in ${(c.in ?? [String(c.equals)]).join(', ')}`;
  if (!f) return { status: STATUS.UNKNOWN, criterion: label, reason: 'Facet not recorded' };
  const value = f.value;
  const ok = c.in ? c.in.includes(value) : value === c.equals;
  return {
    status: ok ? STATUS.PASS : STATUS.FAIL,
    criterion: label,
    reason: `Recorded as ${value}${f.origin === 'derived' ? ', derived from ' + f.from : ''}`,
    derived: f.origin === 'derived',
  };
}

/**
 * Environment criteria only work where the category actually carries reducible verdicts.
 * For an indicator category the honest answer is UNKNOWN with a pointer to the narrative,
 * never a manufactured PASS.
 */
/** Verdicts that answer "does it resist" with an unqualified yes. Water solubility says "insoluble". */
export const POSITIVE_VERDICTS = ['resistant', 'insoluble'];

function evaluateEnvironment(material, c, ctx) {
  const meta = ctx?.db?.meta?.environmentCategories?.[c.category];
  // The display name is compiled from the mapping file and travels in the snapshot, so the engine
  // can name a category without importing anything from the UI.
  const name = meta?.label ?? String(c.category).replace(/-/g, ' ');
  const label = `${name} evidence`;
  if (meta && meta.kind === 'indicator') {
    return {
      status: STATUS.UNKNOWN,
      criterion: label,
      reason: `The ${name.toLowerCase()} records in this snapshot are narrative only; no reducible verdict exists for any material`,
      indicatorOnly: true,
    };
  }
  const all = (ctx?.evidenceByMaterial?.get(material.id) ?? []).filter((e) => e.category === c.category);
  // A product is judged on its own records (D98): its own, else those of a twin that prints the same sheet (D89). A
  // sibling's record, and one filed under the material with no product, are context: shown, never a pass for it.
  const product = material.product;
  let records = all;
  let from = '';
  if (product) {
    const own = all.filter((e) => e.gradeId === product.id);
    const twin = own.length ? null : (product.twins ?? []).map((id) => ({ id, list: all.filter((e) => e.gradeId === id) })).find((t) => t.list.length);
    records = own.length ? own : twin?.list ?? [];
    if (twin) from = `, from the data sheet shared with ${gradeName(ctx, twin.id)}`;
  }
  if (!records.length) {
    // No record of this material. Its base polymer's published behaviour, where the build attached it (D64), is
    // inference about the neat resin, not a test of this grade: it never passes, and where the reference says the
    // polymer is attacked or dissolved it screens the material out under inference, exactly as an estimate does.
    const polymer = (ctx?.polymerEvidenceByMaterial?.get(material.id) ?? []).find((e) => e.category === c.category);
    if (polymer) return evaluatePolymerLevel(polymer, label, ctx);
    if (product && all.length) {
      const others = all.filter((e) => e.verdict !== 'no-data');
      return {
        status: STATUS.UNKNOWN, criterion: label, contextIds: all.map((e) => e.id),
        reason: `No statement of this product's own. ${others.length ? `${others.length} statement(s) about ${others.some((e) => !e.gradeId || /^Not /.test(e.gradeId)) ? 'its material or ' : ''}other products are context, not this product's` : 'Its material has statements, but none gives a verdict'}`,
      };
    }
    return { status: STATUS.UNKNOWN, criterion: label, reason: `No statement for this ${product ? 'product' : 'material'}` };
  }

  // Only an unqualified positive record satisfies "resists". A source that reports *limited*
  // resistance has said something weaker than the checkbox asks, and the old default accepted it
  // as a clean PASS, so PLA passed a solvent screen on one "limited" record. Limited is now
  // unresolved, which Strict leaves out and Explore keeps flagged. So is a record in words the build does not reduce
  // to a verdict, beside a positive one (D98): it may be the limit ("resistant to weak acids, but ..."), and a positive
  // roll-up that set it aside claimed more than the source.
  const accept = c.require ?? POSITIVE_VERDICTS;
  const matching = records.filter((e) => accept.includes(e.verdict));
  const limited = records.filter((e) => e.verdict === 'limited' && !accept.includes('limited'));
  const contrary = records.filter((e) => ['not-resistant', 'soluble', 'flammable'].includes(e.verdict));
  const words = records.filter((e) => e.verdict === 'narrative');
  const ids = (list) => list.map((e) => e.id);
  const quote = (e) => `"${String(e.finding).slice(0, 60)}${String(e.finding).length > 60 ? '...' : ''}"`;
  if (contrary.length && !matching.length) {
    return { status: STATUS.FAIL, criterion: label, reason: `${contrary.length} statement(s) report ${verdictWords(contrary[0].verdict)}${from}`, evidenceIds: ids(contrary) };
  }
  if (matching.length && contrary.length) {
    return { status: STATUS.INDETERMINATE, criterion: label, reason: `Mixed across exposures: ${matching.length} statement(s) report ${verdictWords(matching[0].verdict)}, ${contrary.length} ${verdictWords(contrary[0].verdict)}${from}`, evidenceIds: ids(records) };
  }
  if (matching.length && limited.length) {
    return { status: STATUS.INDETERMINATE, criterion: label, reason: `${matching.length} statement(s) report ${verdictWords(matching[0].verdict)}, ${limited.length} only limited resistance (${limited.map(quote).join('; ')})${from}. Check which exposure matters to you`, evidenceIds: ids(records) };
  }
  if (matching.length && words.length) {
    return { status: STATUS.INDETERMINATE, criterion: label, reason: `${matching.length} statement(s) report ${verdictWords(matching[0].verdict)}, and ${words.length} more give no clear verdict: ${words.map(quote).join('; ')}${from}. Read them before relying on it`, evidenceIds: ids(records) };
  }
  if (matching.length) {
    return { status: STATUS.PASS, criterion: label, reason: `${matching.length} statement(s) report ${verdictWords(matching[0].verdict)}${from}. This covers the exposures stated, not every chemical in the class`, evidenceIds: ids(matching) };
  }
  if (limited.length) {
    return { status: STATUS.INDETERMINATE, criterion: label, reason: `${limited.length} statement(s) report only limited resistance${from}`, evidenceIds: ids(limited) };
  }
  return { status: STATUS.UNKNOWN, criterion: label, reason: `Statements exist, but none gives a verdict${from}`, evidenceIds: ids(records) };
}

/** A product as a reason names it: its maker and product, from the database the context carries. */
function gradeName(ctx, id) {
  const g = ctx?.gradeById?.get(id) ?? ctx?.db?.grades?.find((x) => x.id === id);
  if (!g) return id;
  const product = g.product && !/^Not /.test(g.product) ? g.product : '';
  const maker = g.manufacturer && !/^Not /.test(g.manufacturer) ? g.manufacturer : '';
  return !product ? maker || id : maker && !product.toLowerCase().startsWith(maker.toLowerCase()) ? `${maker} ${product}` : product;
}

/** A polymer-level verdict in words: "not resistant", "soluble". */
const verdictWords = (v) => String(v).replace(/-/g, ' ');

/**
 * A material with no record of its own in the category, judged on its base polymer's published behaviour (D64). The
 * verdict is always UNKNOWN and the reason names the polymer, what the reference says of it and the reference itself.
 * A polymer the reference reports attacked or dissolved screens the material out under inference (`polymerScreen`
 * says so, the way `estimated` marks an estimate), and the SCREENED chip brings it back.
 */
function evaluatePolymerLevel(polymer, label, ctx) {
  const agents = polymer.agents.map((a) => `${verdictWords(a.verdict)} to ${a.agent}`).join(', ');
  const basis = `No statement for this material. Its base polymer ${polymer.polymerId} is published as ${verdictWords(polymer.verdict)} (${agents}) in resin reference data, which is not a test of this product, so never enough to pass`;
  const common = { status: STATUS.UNKNOWN, criterion: label, polymer: true, polymerId: polymer.polymerId, polymerVerdict: polymer.verdict, polymerEvidenceIds: [polymer.id] };
  if (!polymer.screens) return { ...common, reason: basis };
  const screened = !!ctx?.useEstimates;
  return {
    ...common, polymerScreen: true, screened, vetoedBy: [],
    reason: screened ? `${basis}. Hidden; not tested on this product` : `${basis}. It would hide this material with estimates and resin data on`,
  };
}

// ---------------------------------------------------------------- public API

/**
 * Data-quality criteria. These screen on the strength of the evidence rather than on a property,
 * which the brief treats as a first-class selection domain.
 */
function evaluateEvidence(material, c, ctx) {
  const checks = [];
  // A product's own measurement, or its twin's, which is the same sheet (D89, D98); a sibling's is not this product's.
  const product = material.product;
  const measured = (list) => list.filter((m) => m.numeric && m.gradeId && m.gradeId !== 'Not applicable');
  if (c.exactGrade) {
    const all = ctx?.measurementsByMaterial?.get(material.id) ?? [];
    if (product) {
      const own = measured(all.filter((m) => m.gradeId === product.id));
      const twin = own.length ? null : (product.twins ?? []).find((id) => measured(all.filter((m) => m.gradeId === id)).length);
      checks.push({ ok: own.length > 0 || !!twin, label: 'exact-grade measurement',
        detail: own.length ? `${own.length} measurement(s) of this product` : twin ? `measured in the data sheet shared with ${gradeName(ctx, twin)}` : 'No measurement of this product in the sampled sources; its siblings\' are theirs' });
    } else {
      const has = measured(all).length > 0;
      checks.push({ ok: has, label: 'exact-grade measurement', detail: has ? `${all.length} measurements on record` : 'No grade-specific measurement in the sampled sources' });
    }
  }
  if (c.noConflicts) {
    // A finding about one product holds out that product and its twins, never its siblings (D98, m213); one about the
    // material holds out every product of it.
    const cov = ctx?.coverageByMaterial?.get(material.id) ?? [];
    const mine = (r) => !product || !r.gradeId || r.gradeId === product.id || (product.twins ?? []).includes(r.gradeId);
    const bad = cov.filter((r) => (r.status === 'Conflict' || r.status === 'Quarantined') && mine(r));
    checks.push({ ok: bad.length === 0, label: 'no unresolved conflict', detail: bad.length ? `${bad.length} unresolved: ${bad.map((b) => b.domain.toLowerCase()).join(', ')}` : 'No unresolved conflict recorded' });
  }
  if (!checks.length) return { status: STATUS.PASS, criterion: 'Evidence', reason: 'No evidence criterion set' };
  const failed = checks.filter((x) => !x.ok);
  return {
    status: failed.length ? STATUS.FAIL : STATUS.PASS,
    criterion: checks.map((x) => x.label).join(' and '),
    reason: (failed.length ? failed : checks).map((x) => x.detail).join('; '),
  };
}

export function evaluateConstraint(material, constraint, ctx = {}) {
  switch (constraint.kind) {
    case 'numeric': return { ...evaluateNumeric(material, constraint, ctx), constraint };
    case 'gate': return { ...evaluateGate(material, constraint), constraint };
    case 'facet': return { ...evaluateFacet(material, constraint), constraint };
    case 'environment': return { ...evaluateEnvironment(material, constraint, ctx), constraint };
    case 'evidence': return { ...evaluateEvidence(material, constraint, ctx), constraint };
    case 'treatment': return { ...evaluateTreatment(material), constraint };
    default: throw new Error(`Unsupported constraint kind "${constraint.kind}"`);
  }
}

/**
 * Evaluate one material against every constraint.
 * Eligibility, not ranking. A soft constraint never removes a candidate.
 */
export function evaluateMaterial(material, constraints, ctx = {}) {
  const policy = normalizePolicy(ctx.unknownPolicy);
  const results = constraints.map((c) => evaluateConstraint(material, c, ctx));
  const mandatory = results.filter((r) => r.constraint.mandatory !== false);

  const failed = mandatory.filter((r) => r.status === STATUS.FAIL);
  const unresolved = mandatory.filter((r) => r.status === STATUS.UNKNOWN || r.status === STATUS.INDETERMINATE);

  // The verdict describes the evidence and the policy decides eligibility. They used to be merged:
  // Strict turned "could not be checked" into FAIL, so the FAIL count mixed materials that failed a
  // test with materials nobody had measured, and an export read "does not work" for both.
  let verdict;
  if (failed.length) verdict = STATUS.FAIL;
  else if (!unresolved.length) verdict = STATUS.PASS;
  else verdict = STATUS.UNKNOWN;

  const screened = policy === UNKNOWN_POLICY.EXPLORATION && verdict === STATUS.UNKNOWN && unresolved.some((r) => r.screened);
  // What would settle it (D155): a presentation of the verdict, never a change to it or to eligibility.
  const grouping = groupOf(verdict, screened, unresolved);

  return {
    materialId: material.id,
    verdict,
    group: grouping.group,
    likely: grouping.likely,
    groupReason: grouping.open ? openWords(grouping.open, ctx) : '',
    shortfall: verdict === STATUS.UNKNOWN ? shortfallOf(unresolved) : 0,
    eligible: verdict === STATUS.PASS || (policy === UNKNOWN_POLICY.EXPLORATION && verdict === STATUS.UNKNOWN && !screened),
    needsVerification: verdict === STATUS.UNKNOWN && policy === UNKNOWN_POLICY.EXPLORATION && !screened,
    // The UI must show when an estimate was involved rather than let the reader assume a measurement.
    usesEstimate: results.some((r) => r.estimated),
    // Likewise when a base polymer's published behaviour stood in for a record of the material (D64).
    usesPolymer: results.some((r) => r.polymer),
    // Held out of Include by inference or by definition, not by a failure: a property that does not apply, an
    // estimate, or the base polymer's published behaviour. Its verdict is still UNKNOWN, so it is counted there and
    // never in FAIL; the status bar can bring it back.
    screened,
    screenedBy: screened ? unresolved.filter((r) => r.screened).map((r) => r.criterion) : [],
    results,
    failed,
    unresolved,
    // Why a strict-mode candidate disappeared: the reason is the unresolved criteria, not a failure.
    heldBy: policy === UNKNOWN_POLICY.STRICT && !failed.length ? unresolved.map((r) => r.criterion) : [],
    // Why a material failed, for the export and the excluded list. heldBy only ever named the
    // unresolved criteria, so a genuine failure exported with an empty reason.
    failedBy: failed.map((r) => r.criterion),
  };
}

// ---------------------------------------------------------------- groups (D155)

/**
 * The groups the list sorts materials into by what would settle each (D155, amending D137's grouping). They present a
 * verdict and never change it, nor a count, nor whether a material is listed:
 *  - meets every requirement (PASS);
 *  - one check away: a product waits only on a printer check (nozzle, bed, chamber), or on one requirement that is on
 *    the line or that its sheets disagree on, so one question to the maker or one test settles it;
 *  - not enough data: anything else unresolved, tagged likely where every open number's estimate, in the range the page
 *    shows (80 %), meets the limit; an estimate orders and tags, and never passes (D43);
 *  - unlikely to meet: on a required number a product measured the way it asks misses and none meets it or is on the
 *    line, or every open product's own estimate wholly misses (its plausible, 95 %, range fails);
 *  - hidden as unlikely (the material is screened: D56, D64, D148) and fail (every product fails, D100).
 */
export const GROUP = { MEETS: 'meets', ONE_CHECK: 'one-check-away', NOT_ENOUGH: 'not-enough-data', UNLIKELY: 'unlikely-to-meet', HIDDEN: 'hidden', FAIL: 'fail' };
export const GROUP_ORDER = [GROUP.MEETS, GROUP.ONE_CHECK, GROUP.NOT_ENOUGH, GROUP.UNLIKELY, GROUP.HIDDEN, GROUP.FAIL];
const PRINTER_CHECKS = ['nozzle', 'bed', 'chamber'];
const isPrinterCheck = (r) => r.constraint?.kind === 'gate' && PRINTER_CHECKS.includes(r.constraint.gate);
const meetsLimit = (lo, hi, c) => Number.isFinite(lo) && Number.isFinite(hi) && compareInterval({ lo, hi, kind: 'range' }, c.operator, c.value) === STATUS.PASS;

/**
 * One product's (or one product-less material's) group, from its verdict and the requirements it leaves open. The
 * likely range is the one the page shows. The evidence ledger (D153) needs no intersection here: where its interval
 * decides, there is no estimate, and where it straddles the limit it cannot move a range's answer about that limit.
 */
function groupOf(verdict, screened, unresolved) {
  if (verdict === STATUS.PASS) return { group: GROUP.MEETS, likely: false };
  if (verdict === STATUS.FAIL) return { group: GROUP.FAIL, likely: false };
  if (screened) return { group: GROUP.HIDDEN, likely: false };
  // Its own estimate wholly misses: unlikely, never hidden, since no product estimate is back-tested to hide (D137, D148).
  // An estimate its own measurement bounds from below and meets (D48) does not count.
  const misses = unresolved.filter((r) => r.estimated && r.plausible === STATUS.FAIL && !r.vetoedBy?.length);
  if (misses.length) return { group: GROUP.UNLIKELY, likely: false, open: misses };
  if (unresolved.every(isPrinterCheck) || (unresolved.length === 1 && (unresolved[0].onTheLine || unresolved[0].sheetsDisagree))) {
    return { group: GROUP.ONE_CHECK, likely: false, open: unresolved };
  }
  const likely = unresolved.length > 0 && unresolved.every((r) => r.estimated && meetsLimit(r.estimate?.lo, r.estimate?.hi, r.constraint) && !ownForbidsLikely(r));
  return { group: GROUP.NOT_ENOUGH, likely, open: unresolved };
}

/**
 * Whether a product's own values of the asked property, measured another way, forbid the likely tag (D167): one of them,
 * converted through its kind's band, wholly misses the limit, or its own sheets disagree beyond those bands and not every
 * one meets it. An estimate never claims more than the product's own sheet allows.
 */
function ownForbidsLikely(r) {
  const own = r.estimate?.ownBand;
  if (!own?.bands?.length) return false;
  const judged = own.bands.map((b) => compareInterval({ lo: b.lo, hi: b.hi, kind: 'range' }, r.constraint.operator, r.constraint.value));
  return judged.includes(STATUS.FAIL) || (own.disagree && judged.some((s) => s !== STATUS.PASS));
}

/**
 * How far an unresolved product is from meeting its open numbers, relative to each limit, at its worst: a published value
 * on the line or a range that straddles by its value, an estimate by its centre. A printer check or a requirement that is
 * not a number has no distance (0); a number with nothing to go on is furthest (Infinity).
 */
function shortfallOf(unresolved) {
  let worst = 0;
  for (const r of unresolved) {
    const c = r.constraint;
    if (c?.kind !== 'numeric' || !Number.isFinite(c.value)) continue;
    const v = Number.isFinite(r.observed) ? r.observed : Number.isFinite(r.ledger?.bound) ? r.ledger.bound : Number.isFinite(r.estimate?.centre) ? r.estimate.centre : null;
    const gap = v === null ? Infinity : Math.max(0, (c.operator.startsWith('>') ? c.value - v : v - c.value) / (Math.abs(c.value) || 1));
    worst = Math.max(worst, gap);
  }
  return worst;
}

const GROUP_RANK = { [GROUP.MEETS]: 0, [GROUP.ONE_CHECK]: 1, [GROUP.NOT_ENOUGH]: 2, [GROUP.UNLIKELY]: 4, [GROUP.HIDDEN]: 5, [GROUP.FAIL]: 6 };
const rankOfGroup = (e) => (GROUP_RANK[e.group] ?? 6) + (e.group === GROUP.NOT_ENOUGH && !e.likely ? 1 : 0);
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
/**
 * The one order of the groups (D155): meets, one check away, not enough data (likely first), unlikely, hidden, fail. Among
 * unresolved ones, fewer open requirements first, then the smaller shortfall; the caller breaks a tie by its own order.
 */
export function compareGroups(a, b) {
  const byRank = rankOfGroup(a) - rankOfGroup(b);
  if (byRank || a.verdict !== STATUS.UNKNOWN) return byRank;
  return cmp(a.unresolved?.length ?? 0, b.unresolved?.length ?? 0) || cmp(a.shortfall ?? 0, b.shortfall ?? 0);
}

/** A property as a reason names it mid-sentence: its plain label from the registry the database carries. */
const LABELS = new WeakMap();
function propertyWords(ctx, key) {
  const headlines = ctx?.db?.registry?.headlines;
  if (!headlines) return key;
  if (!LABELS.has(headlines)) LABELS.set(headlines, new Map(headlines.map((x) => [x.key, x.labels?.plain ?? x.key])));
  const plain = LABELS.get(headlines).get(key) ?? key;
  return lowerFirst(plain);
}
const OPERATOR_WORDS = { '>=': 'at least', '<=': 'at most', '>': 'more than', '<': 'less than' };
const unitOf = (r, ctx) => r.unit ?? r.estimate?.unit ?? ctx?.db?.registry?.headlines?.find((x) => x.key === r.constraint?.property)?.unit ?? '';
/** A requirement in words: "HDT at 0.45 MPa at least 100 °C". */
function limitWords(c, ctx, unit = '') {
  return `${propertyWords(ctx, c.property)} ${OPERATOR_WORDS[c.operator] ?? c.operator} ${fmtWords(c.value)}${unit ? ` ${unit}` : ''}`;
}
const lowerFirst = (t) => (/^[A-Z](?![A-Z0-9])/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t);
const firstSentence = (t) => String(t ?? '').split(/\.\s/)[0].replace(/\.$/, '');
const sig = (v, digits = 3) => fmtWords(Number(Number(v).toPrecision(digits)));

/** One open requirement of the deciding product in words, its own numbers in them (C05). */
function openOne(r, ctx) {
  const c = r.constraint;
  if (isPrinterCheck(r)) {
    if (/^No print profile recorded/.test(r.reason ?? '')) return 'no print recipe on record';
    if (/^No temperature published/.test(r.reason ?? '')) return `its ${c.gate} temperature is not stated`;
    return `its ${c.gate}${r.onTheLine ? ' is on the line' : ''}: ${lowerFirst(firstSentence(r.reason))}`;
  }
  if (c?.kind === 'numeric') {
    const prop = propertyWords(ctx, c.property);
    const unit = unitOf(r, ctx);
    if (r.onTheLine && Number.isFinite(r.observed)) return `${prop} ${sig(r.observed, 4)} ${unit}, on the line for ${OPERATOR_WORDS[c.operator] ?? c.operator} ${fmtWords(c.value)} ${unit}`;
    // What the evidence ledger reads on the line (D153, D152 as stage 3d amended it): an equality is the value another of
    // its records gives, a class limit the most or least its kind of plastic reaches. A band, floor or ceiling is never on
    // the line.
    if (r.onTheLine && Number.isFinite(r.ledger?.bound)) {
      const what = /^CL/.test(r.ledger.rule) ? `${r.ledger.kind === 'floor' ? 'at least' : 'at most'} ${sig(r.ledger.bound, 3)} ${unit} for its kind of plastic` : `${sig(r.ledger.bound, 3)} ${unit} on another of its records that counts as this one`;
      return `${prop} ${what}, on the line for ${OPERATOR_WORDS[c.operator] ?? c.operator} ${fmtWords(c.value)} ${unit}`;
    }
    if (r.sheetsDisagree) return `its sheets disagree on ${prop}`;
    if (r.ceilingOnly) return `${prop} published ${sig(r.ceilingOnly.value, 4)} ${unit} only on a bar its sheet does not describe`;
    if (r.estimated && Number.isFinite(r.estimate?.lo) && Number.isFinite(r.estimate?.hi)) {
      const e = r.estimate;
      const plausible = r.plausible === STATUS.FAIL && e.plausible ? `, plausibly ${sig(e.plausible.lo)} to ${sig(e.plausible.hi)}, against ${OPERATOR_WORDS[c.operator] ?? c.operator} ${fmtWords(c.value)}` : '';
      return `${prop} estimated ${sig(e.lo)} to ${sig(e.hi)} ${unit}${plausible}`;
    }
    if (Number.isFinite(r.observed)) return `${prop}: ${lowerFirst(firstSentence(r.reason))}`;
    if (r.missing === 'not-available-in-market') return 'no price in the sampled shops';
    if (r.asPublished) return `${prop} published ${r.asPublished.caveat === 'not-described' ? 'only on a test bar not described as printed' : `without ${r.asPublished.caveat === 'load-not-stated' ? 'its test load' : 'a usable test orientation'}`}`;
    if (r.elsewhere?.length) return `${prop} published only in another state`;
    return `${prop} not published`;
  }
  return `${lowerFirst(String(r.criterion ?? ''))}: ${lowerFirst(firstSentence(r.reason))}`;
}
/** The open requirements in words, at most three named. */
function openWords(open, ctx) {
  const words = [...new Set(open.map((r) => openOne(r, ctx)))];
  return words.length > 3 ? `${words.slice(0, 3).join('; ')}; and ${words.length - 3} more` : words.join('; ');
}

/**
 * Whether a product's answer on a number holds its material open against the products measured to miss it (D155, amended
 * by stage 3d): a pass; a value measured the way asked that is on the line, or a published range or bound across the
 * limit; an equality the evidence ledger reads as that value (CV02), on the line; or records that disagree. A value that
 * is only a ceiling for the printed part (CV05) can only fail a minimum, and a band, floor or ceiling drawn from another
 * record is not a measured value, so neither holds the material open: plain PLA is unlikely to meet 80 °C, although two
 * of its products print an undescribed bar's 90 and 110 °C.
 */
const holdsOpen = (r) => r.status === STATUS.PASS || (r.status === STATUS.INDETERMINATE && (!!r.sheetsDisagree
  || (Number.isFinite(r.observed) && !r.ledger) || (!!r.onTheLine && r.ledger?.kind === 'equal')));
/** A product measured the way the requirement asks that misses it, on its own value. */
const measuredFail = (r) => r.status === STATUS.FAIL && Number.isFinite(r.observed) && !r.ledger;

/**
 * On a required number, a product measured the way it asks that misses it, while no product holds it open (holdsOpen):
 * the material is unlikely to meet it, whatever its open products' estimates say (D155). A value the evidence ledger
 * reads from another kind of record (D153) is not measured the way asked. Beside the measured misses it counts the
 * products that fail on a bound from another of their records or a limit of their kind (R06 of the round's review: PEBA's
 * eight rubbers that fail the stiffness fixture on CL01 had been counted as having no value), and the products whose only
 * value is a ceiling for the printed part, apart from the products with no value measured that way.
 */
function measuredMiss(judged, constraints) {
  for (const c of constraints) {
    if (c.kind !== 'numeric' || c.mandatory === false) continue;
    let misses = 0, bounded = 0, limited = 0, ceilings = 0, blocked = false;
    for (const x of judged) {
      const r = x.e.results.find((y) => y.constraint === c);
      if (!r) continue;
      if (holdsOpen(r)) { blocked = true; break; }
      if (measuredFail(r)) misses++;
      else if (r.status === STATUS.FAIL && r.ledger) { if (/^CL/.test(r.ledger.rule)) limited++; else bounded++; }
      else if (r.ceilingOnly) ceilings++;
    }
    if (!blocked && misses) return { constraint: c, misses, bounded, limited, ceilings, unit: judged.map((x) => x.e.results.find((y) => y.constraint === c)).find((r) => r?.unit)?.unit ?? '' };
  }
  return null;
}
/** Whether, on some required number, every product measured the way it asks misses it or is only on the line (C19). */
function everyMeasuredMisses(judged, constraints) {
  return constraints.some((c) => {
    if (c.kind !== 'numeric' || c.mandatory === false) return false;
    const rs = judged.map((x) => x.e.results.find((y) => y.constraint === c)).filter(Boolean);
    const measured = rs.filter((r) => Number.isFinite(r.observed) && !r.ledger);
    return measured.length > 0 && measured.every((r) => r.status === STATUS.FAIL || r.onTheLine) && !rs.some((r) => r.status === STATUS.PASS);
  });
}

/**
 * A product judged in each state the scenario may make it in (D99), as printed first, and answered by the best: a state
 * that passes, else one that is unresolved (unscreened before screened, by group, D155), else a failure. A product used in an annealed
 * state carries the treatment it needs as a requirement of its own, so the verdict and every export name it.
 */
function judgeProduct(material, grade, constraints, ctx) {
  const states = scenarioStates(grade, ctx);
  const views = states.map((state) => ({ state, view: productView(material, grade, ctx, state) }));
  const tries = views.map(({ state, view }) => {
    const cs = state.treatment ? [...constraints, TREATMENT] : constraints;
    // Budgets are reserved across all numerical predicates at build time. Extra
    // AND requirements cannot undo an existing exclusion; untreated dry is the
    // only inferred route, so other alternatives must still fail on their evidence.
    // The context is the one the frozen estimate stage validated (build/src/estimate/product-screening.js): all three
    // gates plainly within, on the product's own sheets, its twin's or its guide, so a window at its low end and a
    // chamber read from its kind of plastic (D151, which the build reads after that stage) are not in it.
    const completeProductContext = !state.treatment && state.moisture === 'dry'
      && ['nozzle', 'bed', 'chamber'].every((a) => grade.print?.[a]?.verdict === 'within' && grade.print.from?.[a]?.origin !== 'family');
    return { state, e: evaluateMaterial(view, cs, { ...ctx, completeProductContext }) };
  });
  // The best state by the one order of the groups (D155): its verdict is the best the scenario permits, as before.
  const best = tries.reduce((a, b) => (compareGroups(b.e, a.e) < 0 ? b : a));
  return { grade, e: best.e, state: best.state, tries };
}

/** A state as an answer names it: its identifier, treatment and moisture, never its values. */
const stateRef = (s) => ({ id: s.id, treatment: s.treatment ?? null, moisture: s.moisture ?? 'dry' });

/**
 * A material answered by its products (D83): each product is judged on every constraint at once, through a view of the
 * material with that product's values and print recipe (products.js), in the states the scenario permits (D99). The
 * material passes when at least one product passes, and says whether all the products that could be judged pass or only
 * some. It is unknown while any product is unresolved and none passes, and fails only when every product fails (D100):
 * one measured failure does not remove a material whose other products nobody has measured. The counts of products
 * passing, failing and untested stay beside every verdict. The evaluation's reasons are its best product's: the first that
 * passes, else the first unresolved one (unscreened before screened), else the first that fails. A material with no
 * product is judged as it always was, on its own headline.
 */
export function evaluateProducts(material, products, constraints, ctx = {}) {
  if (!products?.length) {
    // No product on record (PA66-CF, PA612, PA612-GF): judged on its own headline as before, hidden where its own estimate
    // screens, and otherwise not enough data, never likely (D155).
    const e = evaluateMaterial(material, constraints, ctx);
    const open = e.verdict === STATUS.UNKNOWN && e.group !== GROUP.HIDDEN;
    return { ...e, ...(open ? { group: GROUP.NOT_ENOUGH, likely: false, groupReason: 'Not enough data: no product on record' } : { groupReason: '' }),
      share: null, counts: null, products: [] };
  }
  const policy = normalizePolicy(ctx.unknownPolicy);
  const judged = products.map((g) => judgeProduct(material, g, constraints, ctx));
  const pass = judged.filter((x) => x.e.verdict === STATUS.PASS);
  const fail = judged.filter((x) => x.e.verdict === STATUS.FAIL);
  const unknown = judged.filter((x) => x.e.verdict === STATUS.UNKNOWN);
  const verdict = pass.length ? STATUS.PASS : unknown.length ? STATUS.UNKNOWN : fail.length ? STATUS.FAIL : STATUS.UNKNOWN;
  const share = pass.length ? (fail.length ? SHARE.SOME : SHARE.ALL) : fail.length ? SHARE.NONE : null;
  // D137: every unresolved product must be screened; measured failures cannot keep a candidate alive.
  const screened = policy === UNKNOWN_POLICY.EXPLORATION && verdict === STATUS.UNKNOWN && unknown.every((x) => x.e.screened);
  // The product that represents the material, by the one order of the groups (D155): the first that passes, else the
  // unresolved one nearest to being settled, else the first that fails. Its group is the material's, its reasons the row's.
  const best = judged.reduce((a, b) => (compareGroups(b.e, a.e) < 0 ? b : a));
  const { measuredMisses, ...grouping } = materialGroup(verdict, screened, best, judged, constraints, ctx);
  return {
    ...best.e,
    materialId: material.id,
    verdict,
    ...grouping,
    eligible: verdict === STATUS.PASS || (policy === UNKNOWN_POLICY.EXPLORATION && verdict === STATUS.UNKNOWN && !screened),
    needsVerification: verdict === STATUS.UNKNOWN && policy === UNKNOWN_POLICY.EXPLORATION && !screened,
    screened,
    screenedBy: screened ? [...new Set(unknown.flatMap((x) => x.e.screenedBy))] : [],
    // A hidden material's reasons name each product by its maker and name, never its ID (stage 3d).
    unresolved: screened ? unknown.flatMap((x) => x.e.unresolved.filter((r) => r.screened).map((r) => ({ ...r, reason: `${gradeName(ctx, x.grade.id)}: ${r.reason}` }))) : best.e.unresolved,
    heldBy: policy === UNKNOWN_POLICY.STRICT && verdict === STATUS.UNKNOWN ? best.e.heldBy : [],
    failedBy: verdict === STATUS.FAIL ? best.e.failedBy : [],
    share,
    counts: { products: products.length, pass: pass.length, fail: fail.length, untested: unknown.length, screened: unknown.filter((x) => x.e.screened).length },
    // No product demonstrates a pass, and some that were judged fail: said apart from "every product fails" (D100).
    ...(verdict === STATUS.UNKNOWN && fail.length ? { someFail: true } : {}),
    // Each product's own answer, the state it was judged in, and the records it rests on (D98, D99): the product cards,
    // the decision brief and the acceptance portfolio read a product's reasons, not its material's best product's.
    products: judged.map((x) => productEntry(x, measuredMisses)),
    gradeId: best.grade.id,
    state: stateRef(best.state),
  };
}

/**
 * The material's group (D155): its verdict's where that decides (meets, hidden, fail), else its best product's, made
 * "unlikely to meet" where a measured product misses a required number and none meets it; tagged likely only where the
 * best product's estimates meet every open number and no required number is missed by every product measured on it. The
 * reason names the deciding product and its own numbers (C05).
 */
function materialGroup(verdict, screened, best, judged, constraints, ctx) {
  const n = judged.length;
  const products = (k) => `${k} product${k === 1 ? '' : 's'}`;
  if (verdict === STATUS.PASS) return { group: GROUP.MEETS, likely: false, groupReason: '' };
  if (verdict === STATUS.FAIL) return { group: GROUP.FAIL, likely: false, groupReason: '' };
  if (screened) return { group: GROUP.HIDDEN, likely: false, groupReason: '' };
  const misses = everyMeasuredMisses(judged, constraints);
  const miss = measuredMiss(judged, constraints);
  const name = gradeName(ctx, best.grade.id);
  if (miss) {
    const other = n - miss.misses - miss.bounded - miss.limited - miss.ceilings;
    const more = [
      miss.limited ? `${miss.limited} more fail${miss.limited === 1 ? 's' : ''} on a limit of ${miss.limited === 1 ? 'its' : 'their'} kind of plastic` : null,
      miss.bounded ? `${miss.bounded} more fail${miss.bounded === 1 ? 's' : ''} on a bound from another of ${miss.bounded === 1 ? 'its' : 'their'} records` : null,
      miss.ceilings ? `${miss.ceilings} publish${miss.ceilings === 1 ? 'es' : ''} only a moulded or undescribed bar's value, the most a print reaches` : null,
      other === 1 ? `the other one has no value measured that way` : other ? `the other ${other} have no value measured that way` : null,
    ].filter(Boolean);
    return {
      group: GROUP.UNLIKELY, likely: false, measuredMisses: true,
      groupReason: `Unlikely to meet: every measured product misses ${limitWords(miss.constraint, ctx, miss.unit)}: ${miss.misses} of ${n}${more.map((t) => `; ${t}`).join('')}`,
    };
  }
  const g = best.e.group;
  const like = judged.filter((x) => x.e.group === g).length;
  if (g === GROUP.ONE_CHECK) return { group: g, likely: false, groupReason: `One check away on ${like} of ${products(n)}: ${name}, ${best.e.groupReason}` };
  if (g === GROUP.UNLIKELY) return { group: g, likely: false, groupReason: `Unlikely to meet: the estimate of every open product misses; the nearest, ${name}: ${best.e.groupReason}` };
  const likely = !!best.e.likely && !misses;
  return { group: GROUP.NOT_ENOUGH, likely, measuredMisses: misses, groupReason: `Not enough data${likely ? ', likely' : ''}: ${name}, ${best.e.groupReason}` };
}

function productEntry(x, measuredMisses = false) {
  const admitted = [...new Set(x.e.results.flatMap((r) => (r.status === STATUS.PASS ? r.admitted ?? [] : [])))];
  return {
    gradeId: x.grade.id, verdict: x.e.verdict, group: x.e.group, likely: !!x.e.likely && !measuredMisses,
    ...(x.e.groupReason ? { groupReason: x.e.groupReason } : {}), screened: x.e.screened, failedBy: x.e.failedBy,
    state: stateRef(x.state), results: x.e.results.map(productResult),
    ...(admitted.length ? { admitted } : {}),
    // A declared variant (a foamed or densely filled grade, D57) is named, so a pass it alone carries can say so.
    ...(x.grade.variant ? { variant: x.grade.variant } : {}),
    ...(x.tries.length > 1 ? { states: x.tries.map((t) => ({ ...stateRef(t.state), verdict: t.e.verdict })) } : {}),
  };
}

/** One requirement's answer for one product, with the records it cites and nothing the material's rows repeat. */
const productResult = (r) => {
  const out = { criterion: r.criterion, status: r.status, reason: r.reason, constraint: r.constraint };
  for (const k of ['measurementId', 'evidenceIds', 'priceIds', 'contextIds', 'observed', 'unit', 'closeToLimit', 'onTheLine', 'thinMargin', 'ledger', 'sheetsDisagree', 'doubtful', 'ceilingOnly', 'estimated', 'screened', 'polymer', 'admitted', 'treatment', 'elsewhere', 'missing', 'asPublished', 'caveat']) if (r[k] !== undefined) out[k] = r[k];
  if (r.estimate?.screening) out.prediction = {
    centre: r.estimate.centre, plausible: r.estimate.plausible, screenRange: r.estimate.screenRange,
    canScreen: r.estimate.canScreen, scope: r.estimate.screening.context, limitation: r.estimate.screenLimit,
  };
  return out;
};

/** Evaluate one material: by its products when the context carries them (D83), else on its own headline. */
function evaluateOne(material, constraints, ctx) {
  return ctx.productsByMaterial
    ? evaluateProducts(material, ctx.productsByMaterial.get(material.id) ?? [], constraints, ctx)
    : evaluateMaterial(material, constraints, ctx);
}

/** Run the whole set. Returns evaluations plus the counts the status bar needs. */
export function runSelection(materials, constraints, ctx = {}) {
  // A product value cites its measurement; the reason names that measurement's source, and a twin's record names it.
  if (ctx.productsByMaterial && !ctx.measurementById && ctx.db) ctx = { ...ctx, measurementById: new Map(ctx.db.measurements.map((m) => [m.id, m])) };
  if (ctx.productsByMaterial && !ctx.gradeById && ctx.db) ctx = { ...ctx, gradeById: new Map(ctx.db.grades.map((g) => [g.id, g])) };
  const evaluations = materials.map((m) => evaluateOne(m, constraints, ctx));
  const counts = { pass: 0, fail: 0, unknown: 0, screened: 0, total: evaluations.length };
  for (const e of evaluations) {
    if (e.verdict === STATUS.PASS) counts.pass++;
    else if (e.verdict === STATUS.UNKNOWN) counts.unknown++;
    else counts.fail++;
    if (e.screened) counts.screened++;
  }
  return { evaluations, counts, candidates: evaluations.filter((e) => e.eligible) };
}

/**
 * Rank criteria by how many candidates each one removed, which is what the "why is my list empty"
 * panel needs. Computed by removing one constraint at a time, so the attribution is real rather
 * than an order-of-evaluation artefact.
 */
export function explainExclusions(materials, constraints, ctx = {}) {
  const all = runSelection(materials, constraints, ctx);
  const base = all.candidates.length;
  return constraints.map((c, i) => {
    const without = constraints.filter((_, j) => j !== i);
    const recovered = runSelection(materials, without, ctx).candidates.length - base;
    let removed = 0, held = 0, productsRemoved = 0;
    // A hide is counted as the page shows it (the screening review, C07; D148): a material the whole question holds out
    // as unlikely, whose own hide names this requirement, never one that fails another requirement, and never for a
    // requirement that is only reported. Each hide is said by what made it: a property that does not apply, the base
    // polymer's published behaviour (D64), or an estimate.
    let screened = 0, screenedByPolymer = 0, screenedNotApplicable = 0;
    if (c.mandatory !== false) {
      for (const e of all.evaluations) {
        if (!e.screened) continue;
        const mine = e.unresolved.filter((r) => r.screened && r.constraint === c);
        if (!mine.length) continue;
        screened++;
        if (mine.some((r) => r.notApplicable)) screenedNotApplicable++;
        else if (mine.some((r) => r.polymerScreen)) screenedByPolymer++;
      }
    }
    for (const m of materials) {
      // Judged by its products, a requirement removes a material when no product meets it and one fails it; a product
      // meets it in the best state the scenario permits (D99).
      const products = ctx.productsByMaterial?.get(m.id);
      const inBestState = (g) => {
        const rs = scenarioStates(g, ctx).map((st) => evaluateConstraint(productView(m, g, ctx, st), c, ctx));
        return rs.find((x) => x.status === STATUS.PASS) ?? rs.find((x) => x.status !== STATUS.FAIL) ?? rs[0];
      };
      const rs = products?.length ? products.map(inBestState) : [evaluateConstraint(m, c, ctx)];
      if (products?.length) productsRemoved += rs.filter((r) => r.status === STATUS.FAIL).length;
      // Removed only where every product fails it (D100); one unresolved product holds the material.
      const r = rs.find((x) => x.status === STATUS.PASS) ?? rs.find((x) => x.status !== STATUS.FAIL) ?? rs[0];
      if (r.status === STATUS.FAIL) removed++;
      else if (r.status === STATUS.UNKNOWN || r.status === STATUS.INDETERMINATE) held++;
    }
    // `screened` counts every hide; `screenedNotApplicable` the part of it that rests on a property that does not apply,
    // and `screenedByPolymer` the part that rests on the base polymer's published behaviour, so the panel can say which;
    // the rest is an estimate's. `productsRemoved` counts products, where the selection is by product.
    return { constraint: c, removed, held, screened, screenedNotApplicable, screenedByPolymer, recovered, ...(ctx.productsByMaterial ? { productsRemoved } : {}) };
  }).sort((a, b) => b.recovered - a.recovered || b.removed - a.removed);
}
