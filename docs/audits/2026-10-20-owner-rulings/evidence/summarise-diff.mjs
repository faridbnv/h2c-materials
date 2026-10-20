#!/usr/bin/env node
// What the owner's rulings track T1 moved, summarised from decision censuses (decision-census.mjs): material verdicts
// per template and mode, the single-requirement sweeps' moves per property, and every material verdict that moved in a
// template case, with its direction. T1's own share is the round branch with tracks T2 to T5 merged against the same
// data with T1 merged on it; the round's baseline against the merged data closes it, the templates only. Writes Markdown
// to stdout.
//
//   node docs/audits/2026-10-20-owner-rulings/evidence/summarise-diff.mjs <baseline.json> <t2-t5.json> <after.json>
import { readFileSync } from 'node:fs';
import { generatedMark } from '../../../../scripts/lib/generated-mark.mjs';

const [base, a, b] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')));
const name = (id) => b.names?.[id] ?? a.names?.[id] ?? base.names?.[id] ?? id;

function compare(a, b) {
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
  return { templates, sweeps };
}
const templateTable = (templates) => [
  '| Case | PASS | UNKNOWN | FAIL | Material verdicts moved | Product answers moved |', '|---|---:|---:|---:|---:|---:|',
  ...templates.map((t) => `| ${t.c} | ${t.before.pass} → ${t.after.pass} | ${t.before.unknown} → ${t.after.unknown} | ${t.before.fail} → ${t.after.fail} | ${t.moves.length} | ${t.products} |`),
];

const own = compare(a, b);
const L = ['# What the owner\'s rulings track T1 moved', '', generatedMark('node docs/audits/2026-10-20-owner-rulings/evidence/summarise-diff.mjs <baseline> <t2-t5> <after>', '2026-10-20'), '',
  `T1's own share: from release ${a.release} (the round branch with tracks T2 to T5 merged) to ${b.release} (the same with T1 merged on it), over the decision census's 138 cases. A material only one side has (a new material, or one that left the dataset) is not counted here. Every case in full: [DECISION-DIFF-T1-on-merged.md](DECISION-DIFF-T1-on-merged.md).`, ''];
L.push('## The six templates', '', ...templateTable(own.templates));
L.push('', '## The single-requirement sweeps (120 cases)', '', '| Property | Cases | Material verdicts moved | to PASS | to FAIL | to UNKNOWN | Product answers moved |', '|---|---:|---:|---:|---:|---:|---:|');
for (const [k, s] of [...own.sweeps].sort()) L.push(`| ${k} | ${s.cases} | ${s.verdicts} | ${s.toPass} | ${s.toFail} | ${s.toUnknown} | ${s.products} |`);
L.push('', '## Every material verdict that moved in a template case', '');
for (const t of own.templates) if (t.moves.length) L.push(`- **${t.c}**: ${t.moves.map((m) => `${name(m.id)} ${m.from} → ${m.to}`).join('; ')}`);
const whole = compare(base, b);
L.push('', '## The whole round so far, against its baseline', '', `From release ${base.release} (the round's baseline) to ${b.release}: every track merged. The full list is [DECISION-DIFF.md](DECISION-DIFF.md); T2 to T5's own is [their diff](../after/DECISION-DIFF-t2-t5.md).`, '', ...templateTable(whole.templates));
console.log(L.join('\n'));
