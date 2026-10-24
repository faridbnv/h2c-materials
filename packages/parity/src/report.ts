import { TIERS } from './types.ts';
import type { Difference, ParityReport, Status, SurfaceReport } from './types.ts';

const LIMIT = 15;
const clip = (t: string, n = 90) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const describe = (d: Difference): string => `${d.case} ${d.record} ${d.tier}.${d.field}: ${clip(d.before)} -> ${clip(d.after)}`;

/** Milliseconds as seconds with one decimal. */
export const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

/** At most LIMIT lines for `items`, then how many more there are. */
function pushLimited<T>(L: string[], items: readonly T[], line: (item: T) => string): void {
  for (const item of items.slice(0, LIMIT)) L.push(line(item));
  if (items.length > LIMIT) L.push(`  ... and ${items.length - LIMIT} more`);
}

export function formatReport(r: ParityReport): string {
  const L: string[] = [];
  L.push(`parity ${r.corpus}: ${r.before}  vs  ${r.after}`);
  L.push(`cases: ${r.casesCompared} compared of ${r.casesInCorpus} in the corpus, ${r.casesNotComputable} not computable`);
  if (r.partial) L.push(`PARTIAL RUN: ${r.casesSelected} of ${r.casesInCorpus} cases selected; this says nothing about the ${r.casesInCorpus - r.casesSelected} left out`);
  L.push(`records compared: ${r.recordsCompared}; blocks (record x tier): ${r.blocksCompared}`);
  L.push('differences by tier: ' + TIERS.map((t) => `${t} ${r.differencesByTier[t]}`).join(', ') + `  (total ${r.differences.length})`);
  if (r.notComputable.length) {
    L.push(`NOT COMPUTABLE: ${r.notComputable.length} place(s), never counted as equal`);
    pushLimited(L, r.notComputable, (n) => `  ${n.case} ${n.record ?? '(whole case)'}${n.field ? ` ${n.tier}.${n.field}` : ''} [${n.side}]: ${clip(n.reason, 120)}`);
  }
  if (r.movedRecords.length) {
    L.push(`moved records (${r.movedRecords.length}):`);
    pushLimited(L, r.movedRecords, (m) => `  ${m}`);
    L.push('first differences:');
    for (const d of r.differences.slice(0, LIMIT)) L.push(`  ${describe(d)}`);
  }
  if (r.transitions) {
    const t = r.transitions;
    L.push(`transitions [${t.files.join(', ') || 'none'}]: ${t.expected} listed${t.skippedOutOfScope ? ` (${t.skippedOutOfScope} more outside the selected cases, not checked)` : ''}, ${t.unexpected.length} unexpected, ${t.missing.length} missing`);
    for (const d of t.unexpected.slice(0, 5)) L.push(`  UNEXPECTED ${describe(d)}`);
    for (const d of t.missing.slice(0, 5)) L.push(`  MISSING    ${describe(d)}`);
  }
  L.push(`time: total ${seconds(r.timingsMs.total)} (before ${seconds(r.timingsMs.before)}, after ${seconds(r.timingsMs.after)}, compare ${seconds(r.timingsMs.compare)})`);
  L.push(`  -> ${r.status}`);
  return L.join('\n');
}

/** A surface report (links, tie rule, P-build, P-pages, core sufficiency) in the same plain style. */
export function formatSurface(r: SurfaceReport): string {
  const L: string[] = [];
  L.push(`${r.surface}: ${r.before}  vs  ${r.after}`);
  L.push(`${r.unit}s compared: ${r.unitsCompared}; differences: ${r.differenceCount}${r.truncated ? ` (the first ${r.differences.length} are kept)` : ''}`);
  for (const n of r.notes) L.push(`  ${n}`);
  if (r.notComputable.length) {
    L.push(`NOT COMPUTABLE: ${r.notComputable.length} place(s), never counted as equal`);
    pushLimited(L, r.notComputable, (n) => `  ${n.record ?? '(whole check)'} [${n.side}]: ${clip(n.reason, 160)}`);
  }
  if (r.differences.length) {
    L.push('first differences:');
    for (const d of r.differences.slice(0, LIMIT)) L.push(`  ${describe(d)}`);
    if (r.differenceCount > LIMIT) L.push(`  ... and ${r.differenceCount - LIMIT} more`);
  }
  if (r.transitions) {
    const t = r.transitions;
    L.push(`transitions [${t.files.join(', ') || 'none'}]: ${t.expected} listed, ${t.unexpected.length} unexpected, ${t.missing.length} missing`);
    for (const d of t.unexpected.slice(0, 5)) L.push(`  UNEXPECTED ${describe(d)}`);
    for (const d of t.missing.slice(0, 5)) L.push(`  MISSING    ${describe(d)}`);
  }
  L.push(`time: ${seconds(r.timingsMs.total)}`);
  L.push(`  -> ${r.status}`);
  return L.join('\n');
}

/** One word for a whole run: any difference fails it, then any place that could not be answered; zero only when all are zero. */
export function overallStatus(statuses: readonly Status[]): Status {
  if (statuses.length === 0) throw new Error('internal: a run with no checks has no result');
  if (statuses.includes('differs')) return 'differs';
  if (statuses.includes('not-computable')) return 'not-computable';
  return statuses.includes('matches-transition') ? 'matches-transition' : 'zero';
}
