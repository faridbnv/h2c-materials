// The evidence ledger's arithmetic and words (D153, D154), shared by the build (build/src/evidence-ledger.js), which
// stores each product's bounds, and the engine (constraints.js), which judges a requirement on them.
//
// A product's values that are not measured the way a headline asks (another load, another state, another bar, a related
// property) and the physics limits of its kind of plastic each bound the headline from below, from above or both: a
// contribution, `{ rule, kind, status, measurementId, lo, hi, openLow, openHigh, level, … }`. The headline lies in the
// intersection of the contributions that may decide: a deciding row's (a reported one is listed, never used), at a level
// the reader admits (a source value that states no direction or load is as published, D84). An empty intersection is
// "sheets disagree": unresolved, never a pass or a fail.
//
// Pure: no DOM, no globals, no imports from ../ui. Arithmetic to twelve significant digits and no exp or log, so the
// build gives one answer on every machine (CI runs on Linux).

/** Twelve significant digits, so a binary remainder never reaches the database or a reason. */
export const tidy = (x) => Number(x.toPrecision(12));

/** Whether a contribution may decide for a reader: a deciding row's, at a level the reader admits (D84). */
export const usable = (b, evidence = 'comparable') => b.status === 'deciding' && (b.level === 'comparable' || evidence === 'as-published');

/**
 * The intersection of the contributions that may decide: `{ lo, hi, openLow, openHigh, loBy, hiBy, disagree }`, the
 * contribution that sets each end beside it, or null where none may decide. Ties go to the first in the list, which the
 * build sorts by rule and record.
 */
export function ledgerInterval(by, { evidence = 'comparable' } = {}) {
  const list = (by ?? []).filter((b) => usable(b, evidence));
  if (!list.length) return null;
  let lo = null, hi = null, loBy = null, hiBy = null;
  for (const b of list) {
    if (b.lo != null && (lo == null || b.lo > lo || (b.lo === lo && b.openLow && !loBy.openLow))) { lo = b.lo; loBy = b; }
    if (b.hi != null && (hi == null || b.hi < hi || (b.hi === hi && b.openHigh && !hiBy.openHigh))) { hi = b.hi; hiBy = b; }
  }
  const openLow = !!loBy?.openLow;
  const openHigh = !!hiBy?.openHigh;
  const disagree = lo != null && hi != null && (lo > hi || (lo === hi && (openLow || openHigh)));
  return { lo, hi, openLow, openHigh, loBy, hiBy, disagree };
}

/** A conversion's or a class limit's row in the database (db.conversions, db.classLimits), by its identifier. */
export function ledgerRow(db, id) {
  if (!db) return null;
  if (!ROWS.has(db)) ROWS.set(db, new Map([...(db.conversions ?? []), ...(db.classLimits ?? [])].map((r) => [r.id, r])));
  return ROWS.get(db).get(id) ?? null;
}
const ROWS = new WeakMap();

const fmt = (n) => (Number.isFinite(n) ? String(Number(n.toFixed(6))) : String(n));
const fmtWords = (n) => fmt(n).replace(/^(-?)(\d{4,})/, (all, sign, int) => `${sign}${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`);
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * One contribution in a reader's words, without a verdict: "its HDT at 1.8 MPa, a harsher load, 80 °C (V001234), so at
 * least 80 °C". `words` is the row's Reason words; a class limit names its limit and, where the kind's own products
 * publish beyond it, the extreme it was widened to.
 */
export function contributionWords(b, unit, words) {
  const what = words ?? b.rule;
  if (b.limit !== undefined) {
    // A class limit (D154): the kind, the limit, and where the kind's own products publish beyond the sourced value, that.
    const at = b.kind === 'neat-density range' ? `lies within ${fmtWords(b.lo)} to ${fmtWords(b.hi)} ${unit}`
      : b.kind === 'floor' ? `is never below ${fmtWords(b.lo)} ${unit}`
        : `is never ${unit === 'GPa' ? 'stiffer than' : 'above'} ${fmtWords(b.hi)} ${unit}`;
    return `${what} ${at}${b.widened ? ', as far as its kind\'s own products publish' : ''}`;
  }
  const source = `${what}: ${fmtWords(b.sourceValue)} ${unit} (${b.measurementId}${b.from ? `, in the ${b.from.label}` : ''})`;
  const span = b.lo != null && b.hi != null
    ? (b.lo === b.hi ? (b.lo === b.sourceValue ? '' : `, so ${fmtWords(b.lo)} ${unit}`) : `, so between ${fmtWords(b.lo)} and ${fmtWords(b.hi)} ${unit}`)
    : b.lo != null ? (b.lo === b.sourceValue ? '' : `, so at least ${fmtWords(b.lo)} ${unit}`)
      : (b.hi === b.sourceValue ? '' : `, so at most ${fmtWords(b.hi)} ${unit}`);
  return `${source}${span}`;
}

/** The same, at the head of a sentence. */
export const contributionSentence = (b, unit, words) => cap(contributionWords(b, unit, words));

/** A requirement in a reason's words: "100 °C", "at most 1,500 kg/m³". */
export const requirementWords = (c, unit) => `${{ '>': 'more than ', '<': 'less than ', '<=': 'at most ' }[c.operator] ?? ''}${fmtWords(c.value)} ${unit}`;

/**
 * The reason a ledger answer gives (D153, D154), naming the record and the rule's words. `verdict` is pass, fail or
 * line (a miss within the test scatter); `end` the bound that decides; `asPrinted` whether the state judged is as printed,
 * which an annealed or demoted ceiling names.
 */
export function ledgerReason(b, { unit, words, verdict, c, margin, asPrinted = true }) {
  const req = requirementWords(c, unit);
  const atLeast = c.operator.startsWith('>');
  const sentence = contributionSentence(b, unit, words);
  const isLimit = b.limit !== undefined;
  const plain = !isLimit && (b.factor == null || b.factor === 1) && b.kind !== 'band' && b.kind !== 'equal';
  // A ceiling or a floor read at its own value says which end it is; a scaled one already says "so at most".
  const end = plain && (b.kind === 'ceiling' || b.kind === 'demote-to-ceiling') ? `, the most it reaches${asPrinted ? ' as printed' : ''}`
    : plain && b.kind === 'floor' && !atLeast && verdict !== 'pass' ? ', the least it reaches' : '';
  const level = b.level === 'as-published' ? '. Its record states no orientation or test load; used because Data quality includes such values' : '';
  if (verdict === 'pass') {
    const thin = margin ? `. A thin margin: within the test scatter (${margin.words}) of ${fmtWords(c.value)} ${unit}` : '';
    return `${isLimit ? `${sentence}: meets ${req}` : `Meets it on ${contributionWords(b, unit, words)}${end}`}${thin}${level}`;
  }
  if (verdict === 'line') {
    return `${sentence}${end}: just ${atLeast ? 'under' : 'over'} ${req}, within the test scatter (${margin.words}), so on the line; one test bar or a word with the maker settles it${level}`;
  }
  return `${sentence}${end}: fails ${req}${level}`;
}

/** Two records with no value between them, in a reason's words: the sheets disagree. */
export function disagreeReason(loBy, hiBy, { unit, wordsOf }) {
  return `Its records disagree: ${contributionWords(loBy, unit, wordsOf(loBy))} puts it at least ${fmtWords(loBy.lo)} ${unit}, and ${contributionWords(hiBy, unit, wordsOf(hiBy))} at most ${fmtWords(hiBy.hi)} ${unit}. One of them is misread or misfiled, so this stays open until a sheet is re-read`;
}

/** What a deciding interval that leaves the limit on either side still says, appended to the reason that follows. */
export function knownNote(iv, { unit, c }) {
  const ids = [...new Set([iv.loBy, iv.hiBy].filter(Boolean).map((b) => b.measurementId ?? b.rule))];
  const range = iv.lo != null && iv.hi != null ? `between ${fmtWords(iv.lo)} and ${fmtWords(iv.hi)} ${unit}` : iv.lo != null ? `at least ${fmtWords(iv.lo)} ${unit}` : `at most ${fmtWords(iv.hi)} ${unit}`;
  return ` Its other records put it ${range} (${ids.join(', ')}), which leaves ${fmtWords(c.value)} ${unit} on either side`;
}
