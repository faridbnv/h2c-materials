import { TIERS } from './types.ts';
import type { ParityReport } from './types.ts';

const LIMIT = 15;
const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function formatReport(r: ParityReport): string {
  const L: string[] = [];
  L.push(`parity ${r.corpus}: ${r.before}  vs  ${r.after}`);
  L.push(`cases: ${r.casesCompared} compared of ${r.casesInCorpus} in the corpus, ${r.casesNotComputable} not computable`);
  L.push(`records compared: ${r.recordsCompared}; blocks (record x tier): ${r.blocksCompared}`);
  L.push('differences by tier: ' + TIERS.map((t) => `${t} ${r.differencesByTier[t]}`).join(', ') + `  (total ${r.differences.length})`);
  if (r.notComputable.length) {
    L.push(`NOT COMPUTABLE: ${r.notComputable.length} place(s), never counted as equal`);
    for (const n of r.notComputable.slice(0, LIMIT)) L.push(`  ${n.case} ${n.record ?? '(whole case)'}${n.field ? ` ${n.tier}.${n.field}` : ''} [${n.side}]: ${clip(n.reason, 120)}`);
    if (r.notComputable.length > LIMIT) L.push(`  ... and ${r.notComputable.length - LIMIT} more`);
  }
  if (r.movedRecords.length) {
    L.push(`moved records (${r.movedRecords.length}):`);
    for (const m of r.movedRecords.slice(0, LIMIT)) L.push(`  ${m}`);
    if (r.movedRecords.length > LIMIT) L.push(`  ... and ${r.movedRecords.length - LIMIT} more`);
    L.push('first differences:');
    for (const d of r.differences.slice(0, LIMIT)) L.push(`  ${d.case} ${d.record} ${d.tier}.${d.field}: ${clip(d.before)} -> ${clip(d.after)}`);
  }
  if (r.transitions) {
    const t = r.transitions;
    L.push(`transitions [${t.files.join(', ') || 'none'}]: ${t.expected} listed, ${t.unexpected.length} unexpected, ${t.missing.length} missing`);
    for (const d of t.unexpected.slice(0, 5)) L.push(`  UNEXPECTED ${d.case} ${d.record} ${d.tier}.${d.field}: ${clip(d.before)} -> ${clip(d.after)}`);
    for (const d of t.missing.slice(0, 5)) L.push(`  MISSING    ${d.case} ${d.record} ${d.tier}.${d.field}: ${clip(d.before)} -> ${clip(d.after)}`);
  }
  const s = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
  L.push(`time: total ${s(r.timingsMs.total)} (before ${s(r.timingsMs.before)}, after ${s(r.timingsMs.after)}, compare ${s(r.timingsMs.compare)})`);
  L.push(`RESULT: ${r.status}`);
  return L.join('\n');
}
