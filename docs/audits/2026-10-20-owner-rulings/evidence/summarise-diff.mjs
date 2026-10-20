#!/usr/bin/env node
// What the owner's rulings track T1 moved, summarised from two decision censuses (decision-census.mjs): material verdicts
// per template and mode, the single-requirement sweeps' moves per property, and every material verdict that moved in a
// template case, with its direction. Writes Markdown to stdout.
//
//   node docs/audits/2026-10-20-owner-rulings/evidence/summarise-diff.mjs <before.json> <after.json>
import { readFileSync } from 'node:fs';
import { generatedMark } from '../../../../scripts/lib/generated-mark.mjs';

const [a, b] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')));
const name = (id) => b.names?.[id] ?? a.names?.[id] ?? id;
const L = ['# What the owner\'s rulings track T1 moved', '', generatedMark('node docs/audits/2026-10-20-owner-rulings/evidence/summarise-diff.mjs <before> <after>', '2026-10-20'), '', `From release ${a.release} (the round\'s baseline) to ${b.release}, over the decision census\'s 138 cases.`, ''];
const sweeps = new Map();
const templates = [];
for (const [c, after] of Object.entries(b.cases)) {
  const before = a.cases[c];
  if (!before) continue;
  const moves = [];
  let products = 0;
  for (const [id, m] of Object.entries(after.materials)) {
    const o = before.materials[id];
    if (!o) continue;
    if (o.v !== m.v) moves.push({ id, from: o.v, to: m.v });
    for (const [g, s] of Object.entries(m.products)) if (o.products[g] !== undefined && o.products[g] !== s) products++;
  }
  if (after.template) templates.push({ c, before: before.counts, after: after.counts, moves, products });
  else {
    const prop = c.split(' ')[0];
    const k = c.includes('/ as-published /') ? `${prop} (audit lens admitting set-apart values)` : prop;
    const s = sweeps.get(k) ?? { cases: 0, verdicts: 0, products: 0, toPass: 0, toFail: 0, toUnknown: 0 };
    s.cases++; s.verdicts += moves.length; s.products += products;
    for (const m of moves) { if (m.to === 'PASS') s.toPass++; else if (m.to === 'FAIL') s.toFail++; else s.toUnknown++; }
    sweeps.set(k, s);
  }
}
L.push('## The six templates', '', '| Case | PASS | UNKNOWN | FAIL | Material verdicts moved | Product answers moved |', '|---|---:|---:|---:|---:|---:|');
for (const t of templates) {
  const cnt = (x) => `${x.pass ?? '?'}`;
  L.push(`| ${t.c} | ${cnt(t.before)} → ${cnt(t.after)} | ${t.before.unknown} → ${t.after.unknown} | ${t.before.fail} → ${t.after.fail} | ${t.moves.length} | ${t.products} |`);
}
L.push('', '## The single-requirement sweeps (120 cases)', '', '| Property | Cases | Material verdicts moved | to PASS | to FAIL | to UNKNOWN | Product answers moved |', '|---|---:|---:|---:|---:|---:|---:|');
for (const [k, s] of [...sweeps].sort()) L.push(`| ${k} | ${s.cases} | ${s.verdicts} | ${s.toPass} | ${s.toFail} | ${s.toUnknown} | ${s.products} |`);
L.push('', '## Every material verdict that moved in a template case', '');
for (const t of templates) {
  if (!t.moves.length) continue;
  L.push(`- **${t.c}**: ${t.moves.map((m) => `${name(m.id)} ${m.from} → ${m.to}`).join('; ')}`);
}
console.log(L.join('\n'));
