#!/usr/bin/env node
// wp:note -- M0  prints a milestone note from the status files: what is done, what is open, and the total approval wait
// (sum of approvedAt - waitingSince; packages still waiting are counted separately up to now).
import { loadIndex, loadAllStatus, days } from './wp-lib.mjs';

const milestone = process.argv.slice(2).find((a) => /^M\d$/.test(a));
if (!milestone) { console.error('usage: npm run wp:note -- M0'); process.exit(2); }
const index = loadIndex();
const statuses = loadAllStatus();
const pkgs = index.packages.filter((p) => p.milestones.includes(milestone) && !p.dropped);
const dropped = index.packages.filter((p) => p.milestones.includes(milestone) && p.dropped);
const st = (p) => statuses[p.id] ?? { status: 'todo' };
const done = pkgs.filter((p) => st(p).status === 'done');
let waited = 0, waiting = 0;
const rows = pkgs.map((p) => {
  const s = st(p);
  let wait = '';
  if (s.waitingSince && s.approvedAt) { const d = days(s.waitingSince, Date.parse(s.approvedAt)); waited += d; wait = `waited ${d.toFixed(1)}d`; }
  else if (s.waitingSince) { const d = days(s.waitingSince); waiting += d; wait = `waiting ${d.toFixed(1)}d so far`; }
  return `  ${p.id.padEnd(6)} ${s.status.padEnd(13)} check:${(s.exitCheck ?? 'not-run').padEnd(8)} ${p.title}${wait ? `  [${wait}]` : ''}`;
});
console.log(`Milestone ${milestone} note (${new Date().toISOString().slice(0, 10)})`);
console.log(`${done.length} of ${pkgs.length} packages done`);
console.log(rows.join('\n'));
console.log(`Approval wait, finished: ${waited.toFixed(1)} days; still waiting: ${waiting.toFixed(1)} days`);
if (dropped.length) console.log(`Dropped: ${dropped.map((p) => `${p.id} (${p.droppedReason})`).join('; ')}`);
const unverified = pkgs.filter((p) => st(p).exitCheck !== 'pass');
if (unverified.length) console.log(`Exit check not recorded as pass: ${unverified.map((p) => p.id).join(', ')}`);
