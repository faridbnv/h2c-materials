#!/usr/bin/env node
// wp:digest  the weekly list (loop L3): what finished in the last 7 days, what moves next, and what waits on the owner.
import { loadIndex, loadAllStatus, dispatchable, waitingOnOwner, days } from './wp-lib.mjs';

const index = loadIndex();
const statuses = loadAllStatus();
const title = (id) => index.packages.find((p) => p.id === id)?.title ?? '';
const all = Object.values(statuses);
const recent = (iso) => iso && days(iso) <= 7;
const section = (head, items) => { console.log(`${head}${items.length ? '' : ' none'}`); for (const i of items) console.log(`  ${i}`); };
console.log(`Weekly digest, ${new Date().toISOString().slice(0, 10)}`);
section('Exit check passed this week:', all.filter((s) => recent(s.lastPass)).map((s) => `${s.id}  ${title(s.id)}`));
section('Approved this week:', all.filter((s) => recent(s.approvedAt)).map((s) => `${s.id}  ${title(s.id)}`));
section('In progress or in review:', all.filter((s) => ['in-progress', 'in-review'].includes(s.status)).map((s) => `${s.id}  ${s.status}${s.pr ? `  PR ${s.pr}` : ''}`));
section('Waiting on the owner:', waitingOnOwner(statuses).map((s) => `${s.id}${s.pr ? `  PR ${s.pr}` : ''}${s.waitingSince ? `  ${days(s.waitingSince).toFixed(1)}d` : ''}`));
const { next, soon } = dispatchable(index, statuses);
section('Next dispatchable:', next.map((id) => `${id}  ${title(id)}`));
if (soon.length) section('Can be prepared once reviews land:', soon.map((id) => `${id}  ${title(id)}`));
