// Missing data is information. The Method sheet (Evidence / Missing data) distinguishes four
// states and forbids substituting zero for any of them. Everything downstream depends on these
// staying distinct, so this is the only place raw cell text becomes a value.

export const MISSING = {
  NOT_PUBLISHED: 'not-published',            // absent from the sampled evidence, not proven absent
  NOT_COMPARABLE: 'insufficient-comparable', // evidence exists but cannot support the comparison
  NOT_APPLICABLE: 'not-applicable',          // the field does not apply to this record
  QUARANTINED: 'quarantined',                // unresolved unit/layout; excluded from numeric summaries
  NOT_AVAILABLE_MARKET: 'not-available-in-market',
};

const MISSING_TEXT = new Map([
  ['not published', MISSING.NOT_PUBLISHED],
  ['not published (do not assume printed)', MISSING.NOT_PUBLISHED],
  ['not applicable', MISSING.NOT_APPLICABLE],
  ['insufficient comparable data', MISSING.NOT_COMPARABLE],
  ['not available in sampled canadian market', MISSING.NOT_AVAILABLE_MARKET],
  ['unresolved unit / layout', MISSING.QUARANTINED],
]);

// Data status values seen in the Properties sheet, mapped to whether the row may be used numerically.
// "Published value (transcription corrected)" re-enters numeric summaries per the Method sheet;
// "Unresolved unit / layout" stays quarantined.
export const DATA_STATUS = {
  'Published value': { numeric: true, corrected: false },
  'Published value (transcription corrected)': { numeric: true, corrected: true },
  // A number the source really publishes that physics rules out: PC's HDT at 0.45 MPa below its HDT at 1.8 MPa, a
  // 1.19 GPa modulus on a 68D elastomer. It stays evidence, flagged, and decides nothing (audit 2026-09-15, B-09, B-10).
  'Published value (physically implausible)': { numeric: true, corrected: false, implausible: true },
  'Not published': { numeric: false, missing: MISSING.NOT_PUBLISHED },
  'Unresolved unit / layout': { numeric: false, missing: MISSING.QUARANTINED, quarantined: true },
  // A result the source states in words, such as "No break" for a Charpy test on PEBA-S. It is
  // evidence, and it is not a number: it never becomes zero, a headline or a chart point.
  'Published qualitative result': { numeric: false, missing: MISSING.NOT_COMPARABLE, qualitative: true },
  // A record of a product that was also filed under another material, kept in the tables as an audit
  // trail after its identical twin was proven to exist (docs/audits/2026-09-13-duplicate-products/).
  // The build leaves it out of the database entirely.
  'Retired duplicate record': { numeric: false, missing: MISSING.QUARANTINED, quarantined: true, retiredDuplicate: true },
};

const NUMERIC_RE = /^-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/;

/**
 * Turn a raw cell into either a number or an explicit missing state. Never returns 0 for absence.
 * @returns {{known:true,value:number}|{known:false,missing:string,text:string|null}}
 */
export function parseValue(raw) {
  if (raw == null || raw === '') return { known: false, missing: MISSING.NOT_PUBLISHED, text: null };
  const text = String(raw).trim();
  if (NUMERIC_RE.test(text)) return { known: true, value: Number(text) };
  const mapped = MISSING_TEXT.get(text.toLowerCase());
  if (mapped) return { known: false, missing: mapped, text };
  // Unrecognised non-numeric text is reported by the validator rather than silently coerced.
  return { known: false, missing: MISSING.NOT_PUBLISHED, text, unrecognised: true };
}

/** Operators carried by the Properties sheet. '>' and '<' make a value a bound, not a point. */
export function parseOperator(raw) {
  const t = raw == null ? '' : String(raw).trim();
  if (t === '=' ) return '=';
  if (t === '>' ) return '>';
  if (t === '<' ) return '<';
  if (t === '>=') return '>=';
  if (t === '<=') return '<=';
  return null; // "Not applicable" and anything else
}

/**
 * Build the interval a measurement actually asserts, from value, uncertainty, upper bound and
 * operator. Constraint evaluation works on intervals so that a range straddling a threshold
 * returns INDETERMINATE instead of a false PASS or FAIL.
 *
 * An unbounded end is `null`, not Infinity, because this structure is serialised to JSON and
 * JSON.stringify turns Infinity into null anyway. Making it explicit keeps the engine honest.
 */
export function toInterval({ value, uncertainty, upperBound, operator }) {
  if (!Number.isFinite(value)) return null;
  if (operator === '>' || operator === '>=') return { lo: value, hi: null, openLow: operator === '>' };
  if (operator === '<' || operator === '<=') return { lo: null, hi: value, openHigh: operator === '<' };
  if (Number.isFinite(upperBound) && upperBound > value) return { lo: value, hi: upperBound, kind: 'range' };
  if (Number.isFinite(uncertainty) && uncertainty > 0) {
    return { lo: value - uncertainty, hi: value + uncertainty, kind: 'uncertainty' };
  }
  return { lo: value, hi: value, kind: 'point' };
}

/** True when the interval asserts exactly one value. */
export const isPoint = (iv) => !!iv && iv.lo !== null && iv.hi !== null && iv.lo === iv.hi;

/**
 * Excel boolean cells. The stored XML holds 1/0 but SheetJS renders them as TRUE/FALSE, so accept
 * both rather than depending on which layer did the reading.
 * @returns {boolean|null} null when the cell says neither
 */
export function parseBoolean(raw) {
  if (raw == null || raw === '') return null;
  const t = String(raw).trim().toLowerCase();
  if (t === 'true' || t === '1' || t === 'yes') return true;
  if (t === 'false' || t === '0' || t === 'no') return false;
  return null;
}
