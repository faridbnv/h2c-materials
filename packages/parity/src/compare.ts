// The comparer: two adapters, one corpus, per-record differences at four tiers, streamed case by case.
import { ABSENT, isNotComputable, show } from './canon.ts';
import { matchTransitions } from './transitions.ts';
import { TIERS } from './types.ts';
import type {
  Adapter, CorpusCase, Difference, NormalizedCase, NotComputableItem, ParityReport, RecordFacts, Status, Tier,
  TransitionFile, Value,
} from './types.ts';

type Computed = Extract<NormalizedCase, { outcome: 'computed' }>;

/** Existence of a record is itself a fact: a material or product that appears or vanishes is a decision change. */
const existenceTier = (record: string): Tier => (/^(case|material|product):/.test(record) || record === 'case' ? 'decision' : 'evidence');

export interface CaseComparison {
  differences: Difference[];
  notComputable: NotComputableItem[];
  records: number;
  blocks: number;
}

function sameValue(a: Value, b: Value): 'same' | 'different' | 'not-computable' {
  if (isNotComputable(a) || isNotComputable(b)) return 'not-computable';
  return Object.is(a, b) ? 'same' : 'different';
}

function compareBlock(
  caseId: string, record: string, tier: Tier,
  a: Record<string, Value> | undefined, b: Record<string, Value> | undefined, out: CaseComparison,
): void {
  const fields = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const field of [...fields].sort()) {
    const has = (o: Record<string, Value> | undefined) => o !== undefined && Object.hasOwn(o, field);
    const av: Value | typeof ABSENT = has(a) ? a![field] : ABSENT;
    const bv: Value | typeof ABSENT = has(b) ? b![field] : ABSENT;
    if (av === ABSENT || bv === ABSENT) {
      out.differences.push({ case: caseId, record, tier, field, before: show(av), after: show(bv) });
      continue;
    }
    const verdict = sameValue(av, bv);
    if (verdict === 'same') continue;
    if (verdict === 'not-computable') {
      const sides = isNotComputable(av) && isNotComputable(bv) ? 'both' : isNotComputable(av) ? 'before' : 'after';
      const why = [av, bv].filter(isNotComputable).map((x) => x.reason).join(' / ');
      out.notComputable.push({ case: caseId, record, tier, field, side: sides, reason: why });
    } else out.differences.push({ case: caseId, record, tier, field, before: show(av), after: show(bv) });
  }
}

/** Compare one case answered by both sides. Never returns "equal" for a case either side could not compute. */
export function compareCase(before: NormalizedCase, after: NormalizedCase): CaseComparison {
  const out: CaseComparison = { differences: [], notComputable: [], records: 0, blocks: 0 };
  if (before.caseId !== after.caseId) throw new Error(`adapters answered different cases: ${before.caseId} vs ${after.caseId}`);
  const caseId = before.caseId;
  const uncomputed = (n: NormalizedCase, side: 'before' | 'after') =>
    (n.outcome === 'not-computable' ? { case: caseId, record: null, tier: null, field: null, side, reason: n.reason } as NotComputableItem : null);
  const nb = uncomputed(before, 'before');
  const na = uncomputed(after, 'after');
  if (nb || na) {
    if (nb && na) out.notComputable.push({ ...nb, side: 'both', reason: `${nb.reason} / ${na.reason}` });
    else out.notComputable.push((nb ?? na)!);
    return out;
  }
  const { records: ra } = before as Computed;
  const { records: rb } = after as Computed;
  if (Object.keys(ra).length === 0 || Object.keys(rb).length === 0) {
    // An adapter that says "computed" and returns nothing must not read as "no differences".
    out.notComputable.push({ case: caseId, record: null, tier: null, field: null, side: Object.keys(ra).length === 0 && Object.keys(rb).length === 0 ? 'both' : Object.keys(ra).length === 0 ? 'before' : 'after', reason: 'adapter returned a computed case with no records' });
    return out;
  }
  for (const record of [...new Set([...Object.keys(ra), ...Object.keys(rb)])].sort()) {
    const fa: RecordFacts | undefined = Object.hasOwn(ra, record) ? ra[record] : undefined;
    const fb: RecordFacts | undefined = Object.hasOwn(rb, record) ? rb[record] : undefined;
    if (!fa || !fb) {
      out.differences.push({ case: caseId, record, tier: existenceTier(record), field: '(record)', before: fa ? '<present>' : '<absent>', after: fb ? '<present>' : '<absent>' });
      continue;
    }
    out.records++;
    for (const tier of TIERS) {
      if (!fa[tier] && !fb[tier]) continue;
      out.blocks++;
      compareBlock(caseId, record, tier, fa[tier], fb[tier], out);
    }
  }
  return out;
}

export interface RunOptions {
  corpusName: string;
  cases: CorpusCase[];
  /** All case ids of the full corpus; a transition naming any other case is an error. Defaults to `cases`. */
  knownCaseIds?: ReadonlySet<string>;
  before: Adapter;
  after: Adapter;
  transitions?: TransitionFile[];
  onProgress?: (done: number, total: number) => void;
}

const emptyByTier = (): Record<Tier, number> => ({ decision: 0, presentation: 0, evidence: 0, wording: 0 });
const sortKey = (d: Difference) => [d.case, d.record, d.tier, d.field].join('\u0000');

export async function runParity(opts: RunOptions): Promise<ParityReport> {
  const { cases, before, after } = opts;
  if (cases.length === 0) throw new Error('the corpus selection is empty: nothing was compared, which is not "zero differences"');
  const differences: Difference[] = [];
  const notComputable: NotComputableItem[] = [];
  const notComputableCases = new Set<string>();
  let casesCompared = 0, records = 0, blocks = 0, tBefore = 0, tAfter = 0, tCompare = 0;
  const t0 = performance.now();
  for (const [i, c] of cases.entries()) {
    let s = performance.now();
    const nb = await before.evaluate(c);
    tBefore += performance.now() - s;
    s = performance.now();
    const na = await after.evaluate(c);
    tAfter += performance.now() - s;
    s = performance.now();
    if (nb.caseId !== c.id || na.caseId !== c.id) throw new Error(`adapter answered another case than ${c.id}: ${nb.caseId} / ${na.caseId}`);
    const cmp = compareCase(nb, na);
    tCompare += performance.now() - s;
    differences.push(...cmp.differences);
    notComputable.push(...cmp.notComputable);
    if (cmp.notComputable.length) notComputableCases.add(c.id);
    if (!notComputableCases.has(c.id)) casesCompared++;
    records += cmp.records;
    blocks += cmp.blocks;
    opts.onProgress?.(i + 1, cases.length);
  }
  differences.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));
  const byTier = emptyByTier();
  for (const d of differences) byTier[d.tier]++;
  const moved = new Map<string, Set<string>>();
  for (const d of differences) (moved.get(d.record) ?? moved.set(d.record, new Set()).get(d.record)!).add(d.case);
  const movedRecords = [...moved].map(([r, cs]) => `${r} (${cs.size} case${cs.size === 1 ? '' : 's'})`).sort();

  const scope = new Set(cases.map((c) => c.id));
  const transitions = opts.transitions ? matchTransitions(differences, opts.transitions, scope, opts.knownCaseIds ?? scope) : null;
  let status: Status;
  if (transitions ? transitions.unexpected.length || transitions.missing.length : differences.length) status = 'differs';
  else if (notComputable.length) status = 'not-computable';
  else if (differences.length) status = 'matches-transition';
  else status = 'zero';
  if (status === 'zero' && (casesCompared !== cases.length || blocks === 0)) {
    throw new Error(`internal: zero differences reported with ${casesCompared}/${cases.length} cases compared and ${blocks} blocks`);
  }
  return {
    corpus: opts.corpusName, before: before.name, after: after.name,
    casesInCorpus: cases.length, casesCompared, casesNotComputable: notComputableCases.size,
    recordsCompared: records, blocksCompared: blocks,
    differences, differencesByTier: byTier, movedRecords, notComputable, transitions, status,
    timingsMs: { before: Math.round(tBefore), after: Math.round(tAfter), compare: Math.round(tCompare), total: Math.round(performance.now() - t0) },
  };
}

export const exitCode = (status: Status): number => (status === 'zero' || status === 'matches-transition' ? 0 : status === 'differs' ? 1 : 2);
