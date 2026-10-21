#!/usr/bin/env node
// wp:status  - the next dispatchable packages and the waiting-on-owner list. Fails on a bad index (cycle, unknown dependency).
// wp:status -- --brief  - three lines or fewer for the SessionStart hook; never fails the session.
// wp:deps (--deps)  - only the dependency check.
import { loadIndex, loadAllStatus, checkDeps, dispatchable, waitingOnOwner, days } from './wp-lib.mjs';

const args = process.argv.slice(2);
const brief = args.includes('--brief');

function main() {
  const index = loadIndex();
  const problems = checkDeps(index.packages);
  if (args.includes('--deps')) {
    if (problems.length) { console.error(problems.join('\n')); return 1; }
    console.log(`dependency check: ${index.packages.length} packages, no cycle, no unknown or dropped dependency`);
    return 0;
  }
  const statuses = loadAllStatus();
  const { next, soon } = dispatchable(index, statuses);
  const live = index.packages.filter((p) => !p.dropped);
  const done = live.filter((p) => statuses[p.id]?.status === 'done').length;
  const waiting = waitingOnOwner(statuses);
  const wait = (s) => `${s.id}${s.pr ? ` (PR ${s.pr})` : ''}${s.waitingSince ? ` ${days(s.waitingSince).toFixed(1)}d` : ''}`;
  const lines = [
    `wp: ${done}/${live.length} done; next: ${next.join(', ') || 'none'}${soon.length ? `; after review: ${soon.join(', ')}` : ''}`,
    `wp: waiting on owner: ${waiting.map(wait).join(', ') || 'none'}`,
  ];
  if (problems.length) lines.push(`wp: INDEX PROBLEM: ${problems.join(' | ')}`);
  if (brief) { console.log(lines.join('\n')); return 0; }
  const inProgress = Object.values(statuses).filter((s) => s.status === 'in-progress' || s.status === 'in-review');
  const title = (id) => index.packages.find((p) => p.id === id)?.title ?? '';
  console.log('Next dispatchable packages (every dependency done):');
  for (const id of next) console.log(`  ${id}  ${title(id)}`);
  if (!next.length) console.log('  none');
  if (soon.length) { console.log('Can be prepared while their dependencies are in review:'); for (const id of soon) console.log(`  ${id}  ${title(id)}`); }
  console.log('In progress or in review:');
  for (const s of inProgress) console.log(`  ${s.id}  ${s.status}${s.branch ? `  ${s.branch}` : ''}${s.pr ? `  PR ${s.pr}` : ''}`);
  console.log('Waiting on the owner:');
  for (const s of waiting) console.log(`  ${wait(s)}`);
  if (!waiting.length) console.log('  none');
  const dropped = index.packages.filter((p) => p.dropped);
  if (dropped.length) console.log(`Dropped: ${dropped.map((p) => `${p.id} (${p.droppedReason})`).join('; ')}`);
  if (problems.length) { console.error(problems.join('\n')); return 1; }
  return 0;
}

try { process.exitCode = main(); } catch (e) {
  if (brief) console.log(`wp: status unavailable (${e.message})`); else { console.error(`wp:status failed: ${e.message}`); process.exitCode = 1; }
}
