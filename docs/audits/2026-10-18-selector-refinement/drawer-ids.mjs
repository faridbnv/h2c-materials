#!/usr/bin/env node
// Every record a material's drawer reaches, before and after the round's change (guardrail 3, done-list item 3): a
// reorganised drawer moves every render's bytes, so the golden digests cannot show that nothing became unreachable.
// This lists, per material, the IDs of its own records (products, measurements, profiles, statements, prices, coverage
// rows and the documents they cite) that appear anywhere in its drawer, over every tab key, under Confirmed only and
// under the Indoor prototype template with Include uncertain.
//
//   node docs/audits/2026-10-18-selector-refinement/drawer-ids.mjs > before.txt
//   (change the code; npm run build)
//   node docs/audits/2026-10-18-selector-refinement/drawer-ids.mjs > after.txt && diff before.txt after.txt
//
// Each line: "<material> <reached>/<on file> <sha256 of the reached IDs>", then "MISSING <material> <ids…>" for any
// record on file the drawer never shows; the last line is "TOTAL <reached>/<on file>".
import { createHash } from 'node:crypto';
import { db, TABS, situation, drawerHtml } from './lib.mjs';

const sits = [situation(), situation({ template: 1, policy: 'exploration' })];
const own = new Map();
const add = (mid, id) => { if (!mid || !id) return; if (!own.has(mid)) own.set(mid, new Set()); own.get(mid).add(String(id)); };
for (const g of db.grades) { add(g.materialId, g.id); add(g.materialId, g.sourceId); }
for (const t of ['measurements', 'profiles', 'evidence', 'prices', 'coverage', 'knowHow']) {
  for (const r of db[t] ?? []) { add(r.materialId, r.id); add(r.materialId, r.sourceId); }
}

let reached = 0, total = 0;
const out = [];
for (const m of db.materials) {
  const ids = own.get(m.id) ?? new Set();
  const tokens = new Set();
  for (const sit of sits) for (const tab of TABS) {
    for (const t of drawerHtml(sit, m.id, tab).split(/[^A-Za-z0-9_.\-]+/)) tokens.add(t.replace(/\.+$/, ''));
  }
  const hit = [...ids].filter((id) => tokens.has(id)).sort();
  const miss = [...ids].filter((id) => !tokens.has(id)).sort();
  reached += hit.length; total += ids.size;
  out.push(`${m.id} ${hit.length}/${ids.size} ${createHash('sha256').update(hit.join(' ')).digest('hex').slice(0, 16)}`);
  if (miss.length) out.push(`MISSING ${m.id} ${miss.join(' ')}`);
}
out.push(`TOTAL ${reached}/${total}`);
process.stdout.write(out.join('\n') + '\n');
