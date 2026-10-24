// The evidence ledger's arithmetic and words (D153, D154), shared by the build (build/src/evidence-ledger.js), which
// stores each product's bounds, and the engine (constraints.js), which judges a requirement on them.
//
// A product's values that are not measured the way a headline asks (another load, another state, another bar, a related
// property) and the physics limits of its kind of plastic each bound the headline from below, from above or both: a
// contribution, `{ rule, kind, status, measurementId, lo, hi, openLow, openHigh, level, … }`. The headline lies in the
// intersection of the contributions that may decide: a deciding row's (a reported one is listed, never used), at a level
// the reader admits (a value set apart, D172, is as published, which only the engine's audit lens admits). An empty intersection is
// "sheets disagree": unresolved, never a pass or a fail.
//
// Pure: no DOM, no globals, no imports from ../ui. Arithmetic to twelve significant digits and no exp or log, so the
// build gives one answer on every machine (CI runs on Linux).

import type { ComparisonOperator, EvidenceLevel } from '@atlas/domain';

export interface Contribution {
  /** One contribution to a headline's bounds (the database's ledgerContribution): a rule's, or a class limit's. */
  readonly rule: string;
  readonly kind: 'floor' | 'ceiling' | 'band' | 'equal' | 'demote-to-ceiling' | 'neat-density range';
  readonly status: 'reported' | 'deciding';
  readonly level: EvidenceLevel;
  readonly lo: number | null;
  readonly hi: number | null;
  readonly openLow?: true;
  readonly openHigh?: true;
  readonly measurementId?: string;
  readonly sourceValue?: number;
  readonly factor?: number | null;
  readonly limit?: unknown;
  readonly polymer?: string;
  readonly widened?: boolean;
  readonly from?: { readonly label: string };
  readonly [field: string]: unknown;
}
export interface LedgerInterval {
  /** What ledgerInterval answers: the intersection, the contribution that sets each end, and whether the two ends disagree. */
  readonly lo: number | null;
  readonly hi: number | null;
  readonly openLow: boolean;
  readonly openHigh: boolean;
  readonly loBy: Contribution | null;
  readonly hiBy: Contribution | null;
  readonly disagree: boolean;
}
export interface Requirement {
  readonly operator: ComparisonOperator;
  readonly value: number;
}
export interface LedgerRow {
  readonly id: string;
  readonly words?: string;
  readonly [field: string]: unknown;
}
export interface LedgerDb {
  readonly conversions?: readonly LedgerRow[];
  readonly classLimits?: readonly LedgerRow[];
}

/** Twelve significant digits, so a binary remainder never reaches the database or a reason. */
export const tidy = (x: number): number => Number(x.toPrecision(12));

/** Whether a contribution may decide: a deciding row's, comparable, or as published under the audit lens (D172). */
export const usable = (b: Contribution, evidence: EvidenceLevel = 'comparable'): boolean => b.status === 'deciding' && (b.level === 'comparable' || evidence === 'as-published');

/**
 * The intersection of the contributions that may decide: `{ lo, hi, openLow, openHigh, loBy, hiBy, disagree }`, the
 * contribution that sets each end beside it, or null where none may decide. Ties go to the first in the list, which the
 * build sorts by rule and record.
 */
export function ledgerInterval(by: readonly Contribution[] | null | undefined, { evidence = 'comparable' }: { readonly evidence?: EvidenceLevel } = {}): LedgerInterval | null {
  const list = (by ?? []).filter((b) => usable(b, evidence));
  if (!list.length) return null;
  let lo: number | null = null, hi: number | null = null, loBy: Contribution | null = null, hiBy: Contribution | null = null;
  for (const b of list) {
    if (b.lo != null && (lo == null || b.lo > lo || (b.lo === lo && b.openLow && !loBy!.openLow))) { lo = b.lo; loBy = b; }
    if (b.hi != null && (hi == null || b.hi < hi || (b.hi === hi && b.openHigh && !hiBy!.openHigh))) { hi = b.hi; hiBy = b; }
  }
  const openLow = !!loBy?.openLow;
  const openHigh = !!hiBy?.openHigh;
  const disagree = lo != null && hi != null && (lo > hi || (lo === hi && (openLow || openHigh)));
  return { lo, hi, openLow, openHigh, loBy, hiBy, disagree };
}

/** A conversion's or a class limit's row in the database (db.conversions, db.classLimits), by its identifier. */
export function ledgerRow(db: LedgerDb | null | undefined, id: string): LedgerRow | null {
  if (!db) return null;
  if (!ROWS.has(db)) ROWS.set(db, new Map([...(db.conversions ?? []), ...(db.classLimits ?? [])].map((r) => [r.id, r])));
  return ROWS.get(db)!.get(id) ?? null;
}
const ROWS = new WeakMap<LedgerDb, Map<string, LedgerRow>>();

const fmt = (n: number): string => (Number.isFinite(n) ? String(Number(n.toFixed(6))) : String(n));
const group = (s: string): string => s.replace(/^(-?)(\d{4,})/, (all, sign, int) => `${sign}${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`);
/** A requirement's own number, exact, its thousands grouped: it is the reader's, never rounded. */
const fmtWords = (n: number): string => group(fmt(n));
/**
 * A number the ledger read or worked out, as the page prints every other (format.js fmtNumber): about three significant
 * figures, the thousands grouped. "Between 1.15 and 4.81 GPa", never "between 1.14678 and 4.81149 GPa" (stage 3d, R16).
 * Arithmetic only, so every platform prints one string.
 */
export const fig = (n: number): string => {
  if (!Number.isFinite(n)) return String(n);
  const a = Math.abs(n);
  const s = a >= 100 ? String(Math.round(n)) : a >= 10 ? n.toFixed(1) : a >= 1 ? n.toFixed(2) : String(Number(n.toPrecision(3)));
  return group(s.includes('.') && !/e/.test(s) ? s.replace(/\.?0+$/, '') : s);
};
const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * One contribution in a reader's words, without a verdict: "its HDT at 1.8 MPa, a harsher load, 80 °C (V001234), so at
 * least 80 °C". `words` is the row's Reason words; a class limit names its limit and, where the kind's own products
 * publish beyond it, the extreme it was widened to.
 */
export function contributionWords(b: Contribution, unit: string, words?: string | null): string {
  const what = words ?? b.rule;
  if (b.limit !== undefined) {
    // A class limit (D154): the kind, the limit, and where the kind's own products publish beyond the sourced value, that.
    const at = b.kind === 'neat-density range' ? `lies within ${fig(b.lo!)} to ${fig(b.hi!)} ${unit}`
      : b.kind === 'floor' ? `is never below ${fig(b.lo!)} ${unit}`
        : `is never ${unit === 'GPa' ? 'stiffer than' : 'above'} ${fig(b.hi!)} ${unit}`;
    return `${what}${b.polymer ? ` (${b.polymer})` : ''} ${at}${b.widened ? ', as far as its kind\'s own products publish' : ''}`;
  }
  // The record is the product's own sheet, or its twin's, named in words; its ID is in the trace, the export and the
  // drawer's source link, never in the sentence (stage 3d).
  const source = `${what}: ${fig(b.sourceValue!)} ${unit}${b.from ? ` (in the ${b.from.label})` : ''}`;
  const span = b.lo != null && b.hi != null
    ? (b.lo === b.hi ? (b.lo === b.sourceValue ? '' : `, so ${fig(b.lo)} ${unit}`) : `, so between ${fig(b.lo)} and ${fig(b.hi)} ${unit}`)
    : b.lo != null ? (b.lo === b.sourceValue ? '' : `, so at least ${fig(b.lo)} ${unit}`)
      : (b.hi === b.sourceValue ? '' : `, so at most ${fig(b.hi!)} ${unit}`);
  return `${source}${span}`;
}

/** The same, at the head of a sentence. */
export const contributionSentence = (b: Contribution, unit: string, words?: string | null): string => cap(contributionWords(b, unit, words));

/** A requirement in a reason's words: "100 °C", "at most 1,500 kg/m³". */
// The words before a limit; '>=' has none, which is as the build always read it.
const OPERATOR_PREFIX: Readonly<Record<string, string | undefined>> = { '>': 'more than ', '<': 'less than ', '<=': 'at most ' };
export const requirementWords = (c: Requirement, unit: string): string => `${OPERATOR_PREFIX[c.operator] ?? ''}${fmtWords(c.value)} ${unit}`;

/**
 * The reason a ledger answer gives (D153, D154), naming the record and the rule's words. `verdict` is pass, fail or
 * line (a miss within the test scatter); `end` the bound that decides; `asPrinted` whether the state judged is as printed,
 * which an annealed or demoted ceiling names.
 */
export type ReasonOptions = {
  readonly unit: string;
  readonly words?: string | null | undefined;
  readonly c: Requirement;
  readonly asPrinted?: boolean;
  readonly verdict: 'pass' | 'fail' | 'line';
  readonly margin?: { readonly words: string } | null;
};
export function ledgerReason(b: Contribution, { unit, words, verdict, c, margin, asPrinted = true }: ReasonOptions): string {
  const req = requirementWords(c, unit);
  const atLeast = c.operator.startsWith('>');
  const sentence = contributionSentence(b, unit, words);
  const isLimit = b.limit !== undefined;
  const plain = !isLimit && (b.factor == null || b.factor === 1) && b.kind !== 'band' && b.kind !== 'equal';
  // A ceiling or a floor read at its own value says which end it is; a scaled one already says "so at most".
  const end = plain && (b.kind === 'ceiling' || b.kind === 'demote-to-ceiling') ? `, the most it reaches${asPrinted ? ' as printed' : ''}`
    : plain && b.kind === 'floor' && !atLeast && verdict !== 'pass' ? ', the least it reaches' : '';
  const level = b.level === 'as-published' ? '. Its record is set apart (a test bar not described as printed, or no stated orientation or test load); used only because the audit lens admits such values' : '';
  if (verdict === 'pass') {
    const thin = margin ? `. A thin margin: within the test scatter (${margin!.words}) of ${fmtWords(c.value)} ${unit}` : '';
    return `${isLimit ? `${sentence}: meets ${req}` : `Meets it on ${contributionWords(b, unit, words)}${end}`}${thin}${level}`;
  }
  if (verdict === 'line') {
    return `${sentence}${end}: just ${atLeast ? 'under' : 'over'} ${req}, within the test scatter (${margin!.words}), so on the line; one test bar or a word with the maker settles it${level}`;
  }
  return `${sentence}${end}: fails ${req}${level}`;
}

/** Two records with no value between them, in a reason's words: the sheets disagree. */
export function disagreeReason(loBy: Contribution, hiBy: Contribution, { unit, wordsOf }: { readonly unit: string; readonly wordsOf: (b: Contribution) => string | undefined }): string {
  return `Its records disagree: ${contributionWords(loBy, unit, wordsOf(loBy))} puts it at least ${fig(loBy.lo!)} ${unit}, and ${contributionWords(hiBy, unit, wordsOf(hiBy))} at most ${fig(hiBy.hi!)} ${unit}. One of them is misread or misfiled, so this stays open until a sheet is re-read`;
}

/** What a deciding interval that leaves the limit on either side still says, appended to the reason that follows. */
export function knownNote(iv: LedgerInterval, { unit, c }: { readonly unit: string; readonly c: { readonly value: number } }): string {
  const range = iv.lo != null && iv.hi != null ? `between ${fig(iv.lo)} and ${fig(iv.hi)} ${unit}` : iv.lo != null ? `at least ${fig(iv.lo)} ${unit}` : `at most ${fig(iv.hi!)} ${unit}`;
  const what = [iv.loBy, iv.hiBy].filter(Boolean).every((b) => b!.limit !== undefined) ? 'Its kind of plastic puts it' : 'Its other records put it';
  return ` ${what} ${range}, which leaves ${fmtWords(c.value)} ${unit} on either side`;
}
