// Shared rendering. Every displayed value carries its origin in its typography, so a published
// number never looks like one a regular expression recovered out of free text.

import { estimateTitle, fillerName } from './labels.js';
import { boundOf, publishedBound } from '../engine/constraints.js';
import { dayWords, daysWords } from './dates.js';

export { publishedBound };

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function fmtNumber(v, unit) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  let s;
  if (abs >= 1000) s = v.toLocaleString('en-CA', { maximumFractionDigits: 0 });
  else if (abs >= 100) s = v.toFixed(0);
  else if (abs >= 10) s = v.toFixed(1);
  else if (abs >= 1) s = v.toFixed(2);
  else s = v.toPrecision(3);
  s = s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  return unit ? `${s} ${unit}` : s;
}

/**
 * What a sheet says about drying (D127), as a reader says it: "70 °C for 6 h", "55 °C for ≥ 1 h" (a time with no upper
 * end is a lower bound), "80–100 °C for 6–12 h" (a schedule printed as a range is shown as one, D175), "optional: 60 °C
 * for 4 h" (advised for a condition), "not needed". A statement without a schedule says so rather than inventing one.
 */
export function dryingWords(d) {
  if (!d || d.need === 'unknown') return 'not published';
  if (d.need === 'not-needed') return 'not needed';
  const temp = d.tempC != null ? `${dryingSpan(d.tempMinC, d.tempC)} °C` : null;
  const hours = d.hours != null ? `${d.hoursOpen ? '≥ ' : ''}${dryingSpan(d.hoursMin, d.hours)} h` : null;
  const schedule = temp && hours ? `${temp} for ${hours}` : temp ?? hours ?? '';
  if (d.need === 'optional') return schedule ? `optional: ${schedule}` : 'optional';
  return schedule || 'required, schedule not stated';
}

/**
 * A product found only in a filament diameter the H2C does not take (grades[].diameter, D175, the owner's ruling of
 * 2026-10-20): the warning its detail in the drawer and its card on the material's page give, or null. It decides nothing:
 * the product stays counted.
 */
export const diameterWarning = (g) => (g?.diameter && g.diameter.fits === false ? `Only ${g.diameter.found.replace(/ only$/, '')} filament was found; the H2C takes 1.75 mm.` : null);

/** A drying temperature or time as its sheet printed it: one number, or the range from its lower end ("80–100"). */
export const dryingSpan = (low, high) => (low != null && high != null && low < high ? `${fmtNumber(low)}–${fmtNumber(high)}` : fmtNumber(high));

/**
 * A number a source published as a bound ("> 300 %"), read as one wherever a value is shown: the sign in front, as the
 * sheet and the measurement list print it. An interval with no open end (a point, a range, a mean with a band) is
 * the number alone. A bound limits a value and is never the value, so a bare "300" in a column would be a claim the
 * source did not make.
 */
export function fmtBounded(v, unit, interval) {
  const b = boundOf(interval);
  const s = fmtNumber(v, unit);
  return b && s !== '—' ? `${b.sign} ${s}` : s;
}

/**
 * A published bound's sign before a material's or a product's number, with its space ("> "), or '' for a point value: the
 * key properties print "> 200 °C", and since the coherence round (C14) so does every table and figure that prints the same
 * median. `entry` is a headline entry (materials[].headline[key], grades[].headline[key]).
 */
export const boundSign = (entry) => { const b = boundOf(publishedBound(entry)); return b ? `${b.sign} ` : ''; };
/**
 * The sign before a material's median of `key` (materials[].summary[key].median, or `median`), where that median is its
 * headline's number and a published bound: PEI-CF's HDT at 0.45 MPa is "> 200" in every place that prints it.
 */
export const medianSign = (m, key, median = m?.summary?.[key]?.median) => (median != null && m?.headline?.[key]?.known && m.headline[key].value === median ? boundSign(m.headline[key]) : '');

/** What a bound says in a sentence, for a hover or a popover: the sheet's own words, and that the value is not the number. */
export function boundNote(interval, value, unit) {
  const b = boundOf(interval);
  if (!b) return '';
  const side = b.sign === '>' || b.sign === '≥' ? 'lower' : 'upper';
  return `Published as a bound: the source prints "${b.words} ${fmtNumber(value, unit)}", a ${side} limit of the value and not the value itself.`;
}

/** A bound as a short line for a chart's hover, which cannot wrap: "Elongation is a published bound (more than 300 %)". */
export function boundLine(label, interval, value, unit) {
  const b = boundOf(interval);
  return b ? `${label} is a published bound (${b.words} ${fmtNumber(value, unit)})` : '';
}

/**
 * A number that may be a published bound, as markup: alone it is "> 1,000" or "< 0.8" with the sign in front; as one end
 * of a range, where that would read as a second range, "1,000+" or "<0.8" (`lone` false). `kind` is 'lower', 'upper'
 * or none.
 */
export const fmtBoundedKind = (text, kind, lone = false) => (kind === 'lower' ? (lone ? `&gt; ${text}` : `${text}+`)
  : kind === 'upper' ? `&lt;${lone ? ' ' : ''}${text}` : text);

const SIDE = { '>=': (a, b) => a >= b, '>': (a, b) => a > b, '<=': (a, b) => a <= b, '<': (a, b) => a < b };

/**
 * A number shown beside requirements on its property, never rounded across one of them. PC's price of 50.99 read
 * "51" while passing "price < 51" (audit 2026-09-15, A-01): where rounding would put the shown number on the other
 * side of a threshold than the value is, it gets the digits that keep it on its own side.
 */
export function fmtAgainst(v, thresholds = [], unit) {
  let s = fmtNumber(v, null);
  const crosses = (text) => thresholds.some(({ operator, value }) => SIDE[operator]
    && SIDE[operator](Number(text.replace(/,/g, '')), value) !== SIDE[operator](v, value));
  for (let digits = 3; Number.isFinite(v) && crosses(s) && digits <= 12; digits++) s = String(Number(v.toPrecision(digits)));
  return unit ? `${s} ${unit}` : s;
}

/**
 * The step both ends of an estimated range are rounded to. Formatted one at a time, each end took three significant
 * digits of its own magnitude, so OBC's stiffness read "0.00896–0.203" GPa and its stretch "731–1,390" %: digits
 * nobody can read off a model whose range is that wide. Together they share one step, the coarser of
 *  - a tenth of the range's width, to a power of ten, so a range is drawn in 10 to 100 steps and a rough (wide)
 *    estimate shows fewer digits than a narrow one: the width is where an estimate's precision shows. Not a fifth: the
 *    ends are rounded outward, and on a step of a fifth an end could move by up to a fifth of the width, so PA6's
 *    strength of 49.5–107 printed "40–110" and TPC's stretch of 197–1,030 printed "100–1,100", wider than the estimate
 *    by enough to change a reader's judgement. On a tenth no end moves by more than a tenth of the width; and
 *  - three significant digits of the larger end, the precision a single number is shown with, so a narrow range never
 *    gains digits over its own ends.
 */
export function rangeStep(lo, hi) {
  const top = Math.max(Math.abs(lo), Math.abs(hi));
  if (!(top > 0)) return 1;
  const width = Math.abs(hi - lo);
  const byMagnitude = 10 ** (Math.floor(Math.log10(top)) - 2);
  const byWidth = width > 0 ? 10 ** Math.floor(Math.log10(width / 10)) : 0;
  // Three digits of the larger end is a floor on the precision, not a licence to move an end. Where a range is
  // narrow beside its own magnitude, that step can be coarser than a tenth of the width, and then rounding
  // outward on it moves an end further than the tenth this promises: PA12's density of 989-1060 kg/m³ printed
  // "980-1,060", and 980 is nine of the range's seventy-one below its own low end. What matters is how far an
  // end actually moves, not how coarse the step looks: 100-102 on a step of 1 moves neither end.
  const moves = (step) => Math.max(lo - Math.floor(lo / step) * step, Math.ceil(hi / step) * step - hi);
  if (byWidth > 0 && byMagnitude > byWidth && moves(byMagnitude) > width / 10) return byWidth;
  return Math.max(byMagnitude, byWidth);
}

/**
 * How each kind of number on a range is rounded. A lower end goes down and an upper end up, so the printed range always
 * contains the range it stands for; a value inside it, such as a centre, goes to the nearest. Rounded to the nearest,
 * 46.9–57.5 printed "47–58", narrower than the range at its bottom, and a low end of 55.1 on a step of 10 printed "60":
 * a range could look clear of a requirement it was not clear of.
 */
const ROUND = { down: Math.floor, up: Math.ceil, nearest: Math.round };

/**
 * One value on a range's step, with the step's decimals and trailing zeros kept, so both ends read to the same place
 * ("2.4–7.0", not "2.4–6.98"). A value smaller than the step keeps one significant digit of its own rather than
 * rounding to zero or to the step, in the same direction: 0.00896 on a step of 0.01 is "0.008" as a lower end and
 * "0.009" as an upper end, never "0.01" or "0.00".
 */
function atStep(v, step, round = 'nearest') {
  const own = v === 0 ? step : 10 ** Math.floor(Math.log10(Math.abs(v)));
  const s = Math.min(step, own);
  const decimals = Math.max(0, Math.round(-Math.log10(s)));
  // Through toPrecision, so 0.29 / 0.01 counts as 29 and not as 28.999999999999996, which would floor to 28.
  const r = ROUND[round](Number((v / s).toPrecision(12))) * s + 0;
  return r.toLocaleString('en-CA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/**
 * A single number in fmtNumber's digits, rounded down or up rather than to the nearest: the end of a range that has
 * no other end to share a step with (an open or a zero-width range) still contains what it stands for.
 */
function fmtNumberToward(v, round) {
  if (!Number.isFinite(v) || round === 'nearest') return fmtNumber(v);
  const abs = Math.abs(v);
  const step = abs >= 100 ? 1 : abs >= 10 ? 0.1 : abs >= 1 ? 0.01 : 10 ** (Math.floor(Math.log10(abs || 1)) - 2);
  return fmtNumber(Number((ROUND[round](Number((v / step).toPrecision(12))) * step).toPrecision(12)));
}

/**
 * Formatters for the numbers on one range, on its step (rangeStep): `down` for a lower end, `up` for an upper end and
 * `nearest` for a value inside. A second range drawn with the first, such as an estimate's plausible range around its
 * likely one, uses the same formatters so both read to the same place.
 */
export function rangeFormat(lo, hi) {
  // An open end, or two equal ends, leave nothing to share: each number keeps its ordinary digits.
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) {
    return { down: (v) => fmtNumberToward(v, 'down'), up: (v) => fmtNumberToward(v, 'up'), nearest: (v) => fmtNumber(v) };
  }
  const step = rangeStep(lo, hi);
  const at = (round) => (v) => (Number.isFinite(v) ? atStep(v, step, round) : fmtNumber(v));
  return { down: at('down'), up: at('up'), nearest: at('nearest') };
}

/**
 * A range's ends, rounded outward, and any value inside it (an estimate's centre), rounded to the nearest, formatted
 * together on the range's step. An open end is a dash, as a single missing number is.
 */
export function fmtRangeParts(lo, hi, ...inside) {
  const f = rangeFormat(lo, hi);
  return [f.down(lo), f.up(hi), ...inside.map((v) => f.nearest(v))];
}

/** A range as "lo–hi", both ends on one step (rangeStep). Measured single values keep fmtNumber and fmtAgainst. */
export function fmtRange(lo, hi, sep = '–') {
  const [a, b] = fmtRangeParts(lo, hi);
  return `${a}${sep}${b}`;
}

/**
 * A unit prefix that reads, for a range printed with its own unit. An elastomer's stiffness of "0.009–0.20 GPa" is
 * 9 to 200 MPa, which is how anyone would say it. Only where the unit is printed beside the numbers (the drawer, the
 * popover); a table column and a Compare heading keep the unit they are headed with, since two units in one column
 * cannot be compared down it.
 */
const READABLE_UNIT = { GPa: { below: 1, unit: 'MPa', factor: 1000 } };
export function readableUnit(unit, hi) {
  const r = READABLE_UNIT[unit];
  return r && Number.isFinite(hi) && Math.abs(hi) < r.below ? { unit: r.unit, factor: r.factor } : { unit, factor: 1 };
}

/**
 * What an estimate's numbers read, in one place for every view: its likely range, centre and plausible range on one
 * step, and a formatter for a single number in the same unit. `ownUnit` is for text that prints the unit beside the
 * numbers and may rescale it (readableUnit); `inColumn` then gives the likely range in the unit of its column, which the
 * text says whenever the two differ.
 */
export function estimateDisplay(e, { ownUnit = false } = {}) {
  const { unit, factor } = ownUnit ? readableUnit(e.unit, e.hi) : { unit: e.unit, factor: 1 };
  const k = (v) => (Number.isFinite(v) ? v * factor : v);
  // The plausible range on the likely range's step, not its own coarser one: on its own step PA66-CF's plausible
  // stiffness read "4–9" beside a likely "3.9–7.9", as if the wider range started above the narrower one. Its ends are
  // rounded outward too, so it contains both the likely range as printed and its own true ends.
  const f = rangeFormat(k(e.lo), k(e.hi));
  const [lo, hi, centre] = [f.down(k(e.lo)), f.up(k(e.hi)), f.nearest(k(e.centre))];
  const plausible = e.plausible ? [f.down(k(e.plausible.lo)), f.up(k(e.plausible.hi))] : null;
  return {
    lo, hi, centre, plausible, unit,
    num: (v) => fmtNumber(k(v)),
    rescaled: unit !== e.unit,
    factor,
    columnUnit: e.unit,
    inColumn: unit !== e.unit ? fmtRangeParts(e.lo, e.hi) : null,
  };
}

// Wording for the four missing states. They are different engineering answers and stay different.
// The long form, used wherever there is room and in every explanation.
const MISSING_FULL = {
  'not-published': 'Not published by any source on file. A gap, not a zero or a low value.',
  'insufficient-comparable': 'Published, but not on a basis that can be compared.',
  'not-applicable': 'This property does not apply to this material.',
  'quarantined': 'Held back: the source has an unresolved unit or layout problem here.',
  'not-available-in-market': 'No sampled shop listed this product.',
};

const MISSING_LABEL = {
  'not-published': 'Not published',
  'insufficient-comparable': 'Not comparable',
  'not-applicable': 'Not applicable',
  'quarantined': 'Held back',
  'not-available-in-market': 'No price',
};

/**
 * A mark whose meaning is more than its glyph, as a real button that opens the explanation popover (popover.js). A
 * title alone was invisible on a touch screen and unreachable from the keyboard; the title stays, so a mouse still gets
 * it on hover, but it repeats the popover and is never the only place the meaning is said (DECISIONS D61).
 *
 * `inner` is markup the caller has escaped. `head` is the popover's heading, `action` and `id` its one next step
 * ("estimate" or "printing" with a material ID, "measurement" with a measurement ID), and `label` an accessible name
 * for a glyph that has none of its own, such as a dash.
 */
export function explainButton(inner, text, { cls = '', head = '', action = '', id = '', label = '' } = {}) {
  return `<button type="button" class="mark${cls ? ` ${esc(cls)}` : ''}" title="${esc(text)}" data-explain="${esc(text)}"`
    + `${head ? ` data-explain-head="${esc(head)}"` : ''}`
    + `${action && id ? ` data-explain-action="${esc(action)}" data-explain-id="${esc(id)}"` : ''}`
    + `${label ? ` aria-label="${esc(label)}"` : ''} aria-haspopup="dialog" aria-expanded="false">${inner}</button>`;
}

/** The wording of a missing state, long and short, for the other views that name one (Compare). */
export const missingText = (entry) => MISSING_FULL[entry?.missing] ?? MISSING_FULL['not-published'];
export const missingLabel = (entry) => MISSING_LABEL[entry?.missing] ?? MISSING_LABEL['not-published'];

/**
 * What a headline with no comparable value says of the nearest value on file (entry.related, compiled by the build):
 * the value, its property and orientation, why it is not compared, how many more there are, and that a requirement reads
 * it only through a conversion row of the evidence ledger (D153), which its answer then names (stage 3d: it had said that
 * no filter uses it, while PA6-CE passed the warm-environment preset on such a value).
 * The explanation of the related mark wherever renderValue draws one; the material pages say it too.
 */
export function relatedNote(entry) {
  const r = entry.related;
  const b = r.best;
  const dir = b.direction && b.direction !== 'not-applicable' && b.direction !== 'unknown' ? b.direction : null;
  const more = r.count - 1;
  const shown = fmtBounded(b.value, null, b.interval);
  return `No product publishes a comparable value (a printed bar, at the column's orientation, test load and endpoint). Nearest value on file: ${shown} ${b.unit}`
    // A property with no direction (a glass transition, a density) is never said to lack one.
    + ` (${b.property}${dir ? `, ${dir}` : b.direction === 'not-applicable' ? '' : ', orientation not stated'}).`
    + ` Not compared: ${b.why}.`
    + `${more ? ` ${more} more value${more === 1 ? '' : 's'} on file, ${r.grades === 1 ? 'of the same product' : `of ${r.grades} products in all`}.` : ''}`
    + `${boundOf(b.interval) ? ` ${boundNote(b.interval, b.value, b.unit)}` : ''}`
    + ' A requirement reads it only through a conversion row of the evidence ledger, in that row\'s one safe direction, and its answer then names the row.';
}

/**
 * Render a headline entry with its provenance and an evidence affordance.
 *
 * Where there is no headline but related measurements exist, show them. 31 materials have a
 * tensile-strength measurement that never became the headline because the source stated no
 * direction or a different endpoint. A blank cell hid that and implied nothing was known.
 *
 * `materialId` gives an estimate its next step, the material's Overview, where its card is. The drawer leaves it out:
 * the card is already on the page. `productless` says the material has no product on record, the one case its estimate
 * is read for a requirement (D148).
 */
export function renderValue(entry, { showUnit = false, compact = false, estimates = false, results = [], materialId = null, productless = false, product = null, products = null } = {}) {
  if (!entry) return explainButton('—', MISSING_FULL['not-published'], { cls: 'missing dash', head: 'Not published', label: 'Not published' });
  if (!entry.known) {
    const label = MISSING_LABEL[entry.missing] ?? 'Not published';
    const r = entry.related;

    // Not applicable is a statement about the property, not a gap, so it shows whatever the toggle.
    if (entry.notApplicable) {
      return explainButton('n/a', `Not applicable. ${entry.notApplicable.reason}`, { cls: 'na', head: 'Not applicable', label: 'Not applicable' });
    }
    // An estimate already contains this material's related measurements, converted to the headline,
    // so while estimates are on it takes precedence over the raw related value. With them off, the
    // related value is shown on its own, as before.
    if (estimates && entry.estimate) {
      const e = entry.estimate;
      // Both ends on one step (rangeStep). In a column the unit is the column's; printed with its own unit (the drawer)
      // it may read in a smaller one, 9–200 MPa rather than 0.009–0.20 GPa. The popover says both.
      const d = estimateDisplay(e, { ownUnit: showUnit });
      const span = `${d.lo}–${d.hi}${showUnit ? ' ' + esc(d.unit) : ''}`;
      return explainButton(`~${span}<span class="est-mark">†</span>`, estimateTitle(e, estimateDisplay(e, { ownUnit: true }), { productless, product }),
        { cls: `est est-${e.precision}`, head: 'Estimate, not a measurement', action: 'estimate', id: materialId });
    }
    // In the table a dash, because "Not published" does not fit a numeric column and was being
    // clipped to "Not publis...". The wording is one press away in the popover, and in the detail drawer,
    // the comparison view and every export, so the four missing states stay distinct.
    if (!r) {
      const text = MISSING_FULL[entry.missing] ?? 'Not published in the sampled sources';
      return compact
        ? explainButton('—', text, { cls: 'missing dash', head: label, label })
        : explainButton(esc(label), text, { cls: 'missing', head: label });
    }
    const b = r.best;
    // Quiet by design: a value plus one marker. The earlier version stacked shouty uppercase tags
    // like "XY +1" and "NO DIRECTION" into the cell, which made the column unscannable.
    const shown = fmtBounded(b.value, null, b.interval);
    const title = relatedNote(entry);
    // The build puts a value flagged physically implausible after every other, so it is shown only where nothing else is
    // on file, and then it says so first (the research review's F-0187).
    return explainButton(`<span class="rv">${esc(shown)}${showUnit ? ' ' + esc(b.unit) : ''}</span>`
      + `<span class="related-mark">*</span>`, title,
    { cls: 'related', head: b.implausible ? 'Published, flagged physically implausible' : 'Published, not comparable', action: 'measurement', id: b.measurementId });
  }
  const thresholds = results.map((r) => r.constraint).filter((c) => c && Number.isFinite(c.value));
  if (entry.spread && entry.spread.n > 1) return renderSpread(entry, thresholds, { showUnit, compact, materialId, products });
  const plain = fmtAgainst(entry.value, thresholds, showUnit ? entry.unit : null);
  const bound = boundOf(publishedBound(entry));
  const text = bound ? `${esc(bound.sign)} ${plain}` : plain;
  let cls = '';
  let title = '';
  let head = '';
  if (entry.assumption) {
    cls = 'v-assumed';
    head = 'Scenario assumption';
    title = `Scenario assumption, not observed data${entry.note ? '. ' + entry.note : ''}`;
  } else if (entry.origin === 'parsed' || entry.caveat) {
    cls = 'v-parsed';
    title = entry.caveat === 'load-not-stated' || entry.loadStated === false
      ? 'The source states the standard but not the load. Read from free text.'
      : 'Read from free text in the source.';
  } else if (entry.origin === 'derived') {
    cls = 'v-derived';
    head = 'Derived';
    title = `Derived${entry.from ? ' from ' + entry.from : ''}`;
  }
  if (bound) {
    const note = boundNote(publishedBound(entry), entry.value, entry.unit);
    title = title ? `${title.replace(/\.$/, '')}. ${note}` : note;
    head = head || 'Published as a bound';
  }
  // The number itself is the button that opens the measurement behind it, with the dot as its marker. The dot alone
  // was a six-pixel mark in an eighteen-pixel button, and "click any number" was true of none of them.
  let value;
  if (entry.measurementId) {
    value = `<button type="button" class="evidence-value" data-measurement="${esc(entry.measurementId)}"
        title="${esc(title ? `${title.replace(/\.$/, '')}. Opens the measurement in Sources.` : 'Opens the measurement in Sources')}"
        aria-label="${esc(bound ? `${bound.words} ${plain}` : plain)}, open the measurement in Sources"><span class="${cls}">${text}</span><span class="evidence-dot" aria-hidden="true"></span></button>`;
  } else if (title) {
    value = explainButton(text, title, { cls, head: head || 'About this value' });
  } else {
    value = `<span>${text}</span>`;
  }
  // The qualification has to sit beside the number, not only in a hover: a heat value whose test
  // load was never stated looks exactly like one that was, and can neither pass nor fail a heat requirement.
  const load = entry.loadStated === false
    ? explainButton('?', `The source states the test standard but not the load, so this value cannot pass or fail an HDT requirement on its own.${entry.origin === 'parsed' || entry.caveat ? ' Read from free text.' : ''}`,
      { cls: 'load-mark', head: 'Heat test load not stated', label: 'Heat test load not stated' })
    : '';
  // A published mean whose spread contains a requirement's threshold decides on its mean (D54) and says it is close.
  const close = results.find((r) => r.closeToLimit);
  const near = close
    ? explainButton('≈', `Close to the limit: published ${fmtNumber(entry.value)} ± ${fmtNumber(entry.uncertainty)} ${entry.unit}, and the threshold is inside that scatter. Judged on the mean.`,
      { cls: 'load-mark', head: 'Close to the limit', label: 'Close to the limit' })
    : '';
  return `${value}${load}${near}${convertedMark(entry.converted)}`;
}

/**
 * A material's value as the spread of its products (D83): their typical value (the median) first, and under it the
 * range and how many products it rests on. The range is products that differ, not uncertainty about one; the popover
 * says so, names the product nearest the median, and counts the values set apart (published without the direction or
 * load, and declared variants such as a metal-filled PLA).
 *
 * The table keeps the range (D83), since a screen asks what any product reaches, where the drawer's key properties and
 * the material pages give the middle half under the same median ("middle half 1.93–2.87"); a bare "0.95–4.24 · 55" read
 * as the same spread (OPEN-PROBLEMS §37.20). A table column says it once, under its heading ("median · range"), since
 * the word in every cell widened the Properties table past a 1440 px screen; outside a table (Compare) the line says
 * "range" and its count takes its noun, "13 products" (C49). `products` is how many products the material has, the
 * drawer head's count, which the explanation counts against.
 */
function renderSpread(entry, thresholds, { showUnit, compact, materialId, products = null }) {
  const s = entry.spread;
  const unit = showUnit ? entry.unit : null;
  const medianBound = boundOf(publishedBound(entry));
  const median = `${medianBound ? `${esc(medianBound.sign)} ` : ''}${fmtAgainst(entry.value, thresholds, unit)}`;
  const lo = fmtBoundedKind(fmtAgainst(s.min, thresholds, null), s.bounds?.min), hi = fmtBoundedKind(fmtAgainst(s.max, thresholds, null), s.bounds?.max) + (unit ? ` ${unit}` : '');
  const title = spreadNote(entry, products);
  const main = explainButton(`<span class="sv">${median}</span>`, title, { cls: 'spread-value', head: `Median of ${s.n} products`, action: 'products', id: materialId });
  // Products that all publish one value show it once ("88 · 2"), not as a range of one number ("88–88 · 2"); in the table the
  // value says it, and a line under it would only repeat it (the 1024 x 768 layout guard, reader round). The count is in
  // the value's explanation.
  const same = s.min === s.max && !s.bounds;
  if (compact && same) return `${main}${convertedMark(entry.converted)}`;
  const count = compact ? ` · ${s.n}` : ` · ${s.n} products`;
  const range = `<span class="spread" data-lo="${s.min}" data-hi="${s.max}" data-n="${s.n}">${same ? hi : `${compact ? '' : 'range '}${lo}–${hi}`}<span class="spread-n">${count}</span></span>`;
  // A converted price's mark sits on the median's line, before the range, so a narrow price column keeps two lines.
  return compact ? `${main}${convertedMark(entry.converted)}${range}` : `${main} ${range}${convertedMark(entry.converted)}`;
}

/**
 * What a material's value as its products' spread rests on (entry.spread, D83), in words: how many products, their
 * range and middle half, the twins counted as products, the bounds, the products that do not report it, the values set
 * apart and why, and the products sold as toughened. The explanation of the median wherever renderValue draws a spread;
 * the material pages say it too.
 */
export function spreadNote(entry, products = null) {
  const s = entry.spread;
  const apart = [
    s.asPublished ? `${s.asPublished.n} set apart, their test bar not described as printed or their load not stated (${s.asPublished.min === s.asPublished.max ? fmtNumber(s.asPublished.min) : `${fmtNumber(s.asPublished.min)} to ${fmtNumber(s.asPublished.max)}`})` : null,
    s.variants ? `${s.variants.n} with an added filler or additive, such as foamed or metal-filled (${fmtNumber(s.variants.min)} to ${fmtNumber(s.variants.max)})` : null,
    // Products their makers sell as toughened, where the headline sets them apart (D133).
    s.claimed?.setApart ? `${s.claimed.n} sold as toughened or impact-modified by ${s.claimed.n === 1 ? 'its maker' : 'their makers'} (${s.claimed.min === s.claimed.max ? fmtNumber(s.claimed.min) : `${fmtNumber(s.claimed.min)} to ${fmtNumber(s.claimed.max)}`})` : null,
  ].filter(Boolean);
  // Counted against all the material's products, the drawer head's count, so the parts add up to it: those in the median,
  // those set apart by why, and those that publish none. "121 of its 176 products do not report it" had counted the
  // products that are not variants, beside a head that said 195 (OPEN-PROBLEMS §37.20).
  const setApart = (s.asPublished?.n ?? 0) + (s.variants?.n ?? 0) + (s.claimed?.setApart ? s.claimed.n : 0);
  const silent = products != null ? products - s.n - setApart : null;
  const of = products != null && silent >= 0 ? ` of its ${products}` : '';
  return `Median of ${s.n}${of} products${s.asPublished ? ', those whose test bar is described as printed' : ''}. Range ${fmtNumber(s.min)} to ${fmtNumber(s.max)} ${entry.unit}`
    + `${s.q1 != null ? `, middle half ${fmtNumber(s.q1)} to ${fmtNumber(s.q3)}` : ''}.`
    // The table gives the range, the drawer's key properties and the material pages the middle half.
    + `${s.q1 != null ? ' The table gives the range; the drawer and the material page give the middle half.' : ''}`
    // A twin is a product of its own whose sheet prints its sibling's table (D89); it counts as the product it is.
    + `${s.twins ? ` ${s.twins === 1 ? 'One of them shares' : `${s.twins} of them share`} a data sheet with another product and ${s.twins === 1 ? 'counts as a product' : 'count as products'} of ${s.twins === 1 ? 'its' : 'their'} own.` : ''}`
    // A bound is counted as its number; the marks say where that number is one, so no end reads as a measurement.
    + `${s.bounds ? ` ${s.bounds.n} ${s.bounds.n === 1 ? 'is' : 'are'} published as a bound ("more than 650") and counted as that number, marked "+" or with a sign.` : ''}`
    + `${apart.length ? ` Kept out of the median: ${apart.join('; ')}.` : ''}`
    + `${of ? (silent ? ` ${silent === 1 ? 'One publishes' : `The other ${silent} publish`} no value on file.` : '')
      : s.products > s.n ? ` ${s.products - s.n} of its ${s.products} products ${s.products - s.n === 1 ? 'does' : 'do'} not report it on that basis.` : ''}`
    // Products their makers sell as toughened stay in the median; the popover says how many, and what the others give (D133).
    + `${s.claimed && !s.claimed.setApart ? ` Included: ${s.claimed.n} ${s.claimed.n === 1 ? 'product its maker sells' : 'products their makers sell'} as toughened or impact-modified (${s.claimed.min === s.claimed.max ? fmtNumber(s.claimed.min) : `${fmtNumber(s.claimed.min)} to ${fmtNumber(s.claimed.max)}`}).${
      s.claimed.others ? ` Without them the median is ${fmtNumber(s.claimed.others.median)} (${s.claimed.others.min === s.claimed.others.max ? fmtNumber(s.claimed.others.min) : `${fmtNumber(s.claimed.others.min)} to ${fmtNumber(s.claimed.others.max)}`}, ${s.claimed.others.n} product${s.claimed.others.n === 1 ? '' : 's'}).` : ''}` : ''}`;
}

/**
 * The price sample in words, counted from the build (D113): "3 Canadian shops, sampled 10 Sep 2026", or with foreign
 * shops and a span of dates where it has them ("9 Canadian shops and 7 foreign shops, sampled 10 Sep–7 Oct 2026"). It
 * said "three Canadian retailers" in five places, and would have gone on saying it; the material pages say "shops".
 */
export function priceSampleWords(meta, { canadianOnly = false } = {}) {
  const s = meta.priceSample;
  if (!s) return `sampled ${dayWords(meta.pricesSampled ?? meta.snapshot)}`;
  const shops = (n, where) => `${n} ${where} shop${n === 1 ? '' : 's'}`;
  const foreign = !canadianOnly && s.foreignSellers ? ` and ${shops(s.foreignSellers, 'foreign')}` : '';
  return `${shops(s.canadianRetailers, 'Canadian')}${foreign}, sampled ${daysWords(s.from, s.to)}`;
}

/**
 * The price sample said once, in the one sentence the drawer's Price tab and the material page's price section print
 * (C16): "Regular prices, never sale prices, from 9 Canadian shops and 7 foreign shops, sampled 10 Sep–7 Oct 2026, not
 * live; shipping and tax are not included."
 */
export const priceSampleSentence = (meta) => `Regular prices, never sale prices, ${meta.priceSample ? 'from ' : ''}${priceSampleWords(meta)}, not live; shipping and tax are not included.`;

/**
 * A price read from a foreign listing says so beside the number (D113): converted to CAD at the Bank of Canada's rate,
 * with the VAT the page stated taken off, and no claim that a Canadian shop sells the product or that it ships here.
 * A material's says how many of the products its median is of were converted.
 */
export function convertedMark(converted) {
  if (!converted) return '';
  const from = converted.currencies.join(' and ');
  // The currency it came from, not a ¤ few readers could name at 10 px (REVIEW-0 F10, 2026-10-18); the rate is in the note.
  return explainButton(esc(converted.currencies.join('/')), convertedNote(converted), { cls: 'fx-mark', head: `Converted from ${from}`, label: `Converted from ${from}` });
}

/** What convertedMark explains, in words: which prices came from a foreign listing, from which currency, at what rate. */
export function convertedNote(converted) {
  const from = converted.currencies.join(' and ');
  const which = converted.products
    ? `${converted.products === 1 ? 'One of the prices is' : `${converted.products} of the prices are`} from a foreign listing`
    : 'A foreign listing\'s price';
  return `${which}, converted from ${from} at the Bank of Canada rate of ${dayWords(converted.rateDate)}, before VAT. No Canadian shop in the sample `
    + `sells ${converted.products > 1 ? 'those products' : converted.products === 1 ? 'that product' : 'this product'}. Shipping and duty are not included.`;
}

/** Every renderer that draws renderValue must wire its evidence buttons, or they are dead. */
export function wireEvidence(host, actions) {
  host.querySelectorAll('[data-measurement]').forEach((d) => d.addEventListener('click', (ev) => {
    ev.stopPropagation();
    actions.openMeasurement(d.dataset.measurement);
  }));
}

/**
 * A data table inside its own sideways scroll box. Squeezed into the width of a phone or a tablet, a fixed-layout table
 * overprinted its own cells: estimate ranges ran into the next column and names broke a letter per line (46 of 207
 * cells at 820 px, 132 at 390 px). Each column now keeps a minimum width and the table scrolls sideways inside this
 * box, with the material's name held at the left edge.
 */
export const scrollTable = (tableHtml) => `<div class="table-scroll">${tableHtml}</div>`;

/**
 * Mark which scroll boxes actually overflow. A box only scrolls when its table is wider than it is: a box that can
 * scroll sideways is also a vertical scroll container, and that would have taken the column headings' stickiness away
 * on a wide screen where the table fits. Called after drawing and on resize (main.js); measuring does not change the
 * table's width, so it cannot flip back and forth.
 */
export function markTableOverflow(root = document) {
  for (const box of root.querySelectorAll('.table-scroll')) {
    const table = box.firstElementChild;
    const over = !!table && table.getBoundingClientRect().width > box.clientWidth + 1;
    if (box.dataset.overflow !== String(over)) box.dataset.overflow = String(over);
  }
}

/**
 * Bring one item of a sideways-scrolling strip into sight, centred where it can be, without scrolling anything else:
 * scrollIntoView would also move the page or the drawer vertically. Tabs redrawn on every change otherwise came back
 * scrolled to the start, with the active one off screen.
 */
export function keepInView(strip, item) {
  if (!strip || !item || strip.scrollWidth <= strip.clientWidth + 1) return;
  const s = strip.getBoundingClientRect(), r = item.getBoundingClientRect();
  strip.scrollLeft += (r.left - s.left) - (s.width - r.width) / 2;
}

export const chip = (status, label) =>
  `<span class="chip chip-${esc(status)}">${esc(label ?? status)}</span>`;

/** Marker shapes by filler class: colour is never the only channel. */
export const FILLER_SYMBOL = {
  'carbon-fibre': 'diamond',
  'glass-fibre': 'square',
  'unfilled': 'circle',
  'esd': 'triangle-up',
  'foaming': 'star',
  // Its own shape, filled: a hollow mark means "could not be settled" on the Ashby chart (D110).
  'undisclosed': 'hexagon',
};

export const FILLER_LABEL = {
  'carbon-fibre': 'Carbon fibre', 'glass-fibre': 'Glass fibre', 'unfilled': 'Unfilled',
  'esd': 'ESD', 'foaming': 'Foaming', 'undisclosed': 'Undisclosed variant',
};
/**
 * A filler the materials table names (aramid fibre, ceramic, PTFE …; engine/filler.js) takes one shape of its own, and
 * its name where a point is named: the charts had drawn those 18 materials as "Undisclosed variant" (OPEN-PROBLEMS §37.8).
 * Eight more shapes, one per filler of one to five materials, would be eight more to learn.
 */
export const NAMED_FILLER_SYMBOL = 'triangle-down';
export const NAMED_FILLER_KEY = 'Other filler, as named';
export const fillerSymbol = (f) => FILLER_SYMBOL[f] ?? (f ? NAMED_FILLER_SYMBOL : 'circle');
export const fillerLabel = (f) => FILLER_LABEL[f] ?? fillerName(f);

/**
 * Colour by family. There are 19 families, past what a categorical palette can separate, so the
 * eight largest get their own hue and the tail groups into "Other". The legend can promote any
 * family out of Other.
 *
 * One meaning per colour (C51): the accent blue means "this material" in the drawer, on the pages and in Compare, so no
 * family takes a blue (Nylon's and Polymer Blends' had), and PLA and PETG, the two a reader compares most, sit on
 * opposite sides of the wheel (an orange and a teal) instead of two near oranges. The palette is changed here and nowhere
 * else: every chart that colours families reads buildFamilyColors. The rose is the last slot, a small family's, because a
 * red also means a requirement or a fail.
 */
const PALETTE = ['#9b4f8e', '#c1622f', '#4a8f5b', '#8a5a2f', '#a8902a', '#7da83a', '#2f8f8a', '#c4506e'];
const OTHER_COLOR = '#8d8d84';

export function buildFamilyColors(materials, promoted = []) {
  const counts = new Map();
  for (const m of materials) counts.set(m.family, (counts.get(m.family) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f);
  const named = [...new Set([...promoted, ...ranked])].slice(0, PALETTE.length);
  const map = new Map();
  named.forEach((f, i) => map.set(f, PALETTE[i]));
  return {
    color: (family) => map.get(family) ?? OTHER_COLOR,
    isOther: (family) => !map.has(family),
    named,
    other: ranked.filter((f) => !map.has(f)),
  };
}

/**
 * The family colours a chart draws, by one call for every chart (C43): the families a reader asked for take the first
 * colours, so a family filtered for is never the grey "other", then any the legend promoted. A family is one colour in the
 * Ashby chart, the decision view and Parallel lines alike.
 */
export function familyColors({ db, scenario }) {
  const asked = scenario.constraints.find((c) => c.kind === 'facet' && c.facet === 'family')?.in ?? [];
  return buildFamilyColors(db.materials, [...asked, ...(scenario.plot.promotedFamilies ?? [])]);
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
