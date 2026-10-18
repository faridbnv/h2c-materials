// Decision census for the screening build (2026-10-18): what every scenario answers, run with one checkout's own engine
// and database, so a stage's answers can be compared with the answers before it, each side on its own code.
//
//   node docs/audits/2026-10-18-screening-build/decision-census.mjs --root <checkout> --db <db.json> --out <file.json>
//   node docs/audits/2026-10-18-screening-build/decision-census.mjs --diff <before.json> <after.json> [--md <file.md>]
//
// The cases are the six landing-page templates in each mode the page offers (Leave out; Include; Include with
// estimates), and the 2026-10-08 replay's 120 single-requirement sweeps (five properties, three limits each, comparable
// or as-published evidence, dry or conditioned, annealing allowed or not). For each case it records every material's
// verdict, whether it is listed, its group and the product the row shows, and every product's verdict and group.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);

async function census(rootDir, dbPath) {
  const from = (rel) => import(pathToFileURL(join(resolve(rootDir), rel)).href);
  const { runSelection } = await from('app/js/engine/constraints.js');
  const { pageContext } = await from('scripts/trace.mjs');
  const { TEMPLATES } = await from('app/js/ui/templates.js');
  const db = JSON.parse(readFileSync(dbPath, 'utf8'));
  const mats = db.materials.filter((m) => !m.familyEntry);
  const cases = [];
  for (const t of TEMPLATES) {
    for (const [mode, unknownPolicy, useEstimates] of [['leave out', 'strict', false], ['include', 'exploration', false], ['include + estimates', 'exploration', true]]) {
      cases.push({ name: `${t.name} / ${mode}`, template: t.name, scenario: { constraints: t.constraints, unknownPolicy, useEstimates } });
    }
  }
  const limits = { density: [900, 1250, 1500], tensileModulusXY: [2, 3, 5], tensileStrengthXY: [20, 50, 100], elongationXY: [5, 20, 100], hdt045: [60, 90, 120] };
  for (const [property, values] of Object.entries(limits)) {
    for (const value of values) for (const evidence of ['comparable', 'as-published']) for (const moisture of ['dry', 'conditioned']) for (const anneal of [false, true]) {
      cases.push({ name: `${property} >= ${value} / ${evidence} / ${moisture} / anneal ${anneal ? 'allowed' : 'not allowed'}`,
        scenario: { constraints: [{ kind: 'numeric', property, operator: '>=', value }], unknownPolicy: 'exploration', useEstimates: true, evidence, moisture, anneal } });
    }
  }
  const out = { release: db.meta.release?.id ?? null, root: resolve(rootDir), cases: {} };
  for (const c of cases) {
    const { evaluations, counts } = runSelection(mats, c.scenario.constraints, pageContext(db, c.scenario));
    const materials = {};
    for (const e of evaluations) {
      materials[e.materialId] = {
        v: e.verdict, l: !!e.eligible, s: !!e.screened, g: e.group ?? e.shortlistGroup ?? null, p: e.gradeId ?? null,
        // One string per product: "<verdict>:<group>", so a product's move is one comparison.
        products: Object.fromEntries((e.products ?? []).map((p) => [p.gradeId, `${p.verdict}:${p.group ?? p.shortlistGroup ?? ''}`])),
      };
    }
    out.cases[c.name] = { template: c.template ?? null, counts, materials };
  }
  out.names = Object.fromEntries(mats.map((m) => [m.id, m.name]));
  return out;
}

function diff(a, b) {
  const lines = [];
  const name = (id) => b.names?.[id] ?? a.names?.[id] ?? id;
  let total = { verdict: 0, listed: 0, group: 0, shown: 0, products: 0 };
  const rows = [];
  for (const [caseName, after] of Object.entries(b.cases)) {
    const before = a.cases[caseName];
    if (!before) { rows.push({ caseName, note: 'new case' }); continue; }
    const moves = { verdict: [], listed: [], group: [], shown: [], products: [] };
    for (const [id, m] of Object.entries(after.materials)) {
      const o = before.materials[id];
      if (!o) { moves.verdict.push(`${name(id)}: new material, ${m.v}`); continue; }
      if (o.v !== m.v) moves.verdict.push(`${name(id)}: ${o.v} → ${m.v}`);
      if (o.l !== m.l) moves.listed.push(`${name(id)}: ${o.l ? 'listed' : 'not listed'} → ${m.l ? 'listed' : 'not listed'}${m.s ? ' (hidden as unlikely)' : ''}`);
      if (o.g !== m.g) moves.group.push(`${name(id)}: ${o.g} → ${m.g}`);
      if (o.p !== m.p) moves.shown.push(`${name(id)}: ${o.p} → ${m.p}`);
      for (const [g, s] of Object.entries(m.products)) if (o.products[g] !== undefined && o.products[g] !== s) moves.products.push(`${g} (${name(id)}): ${o.products[g]} → ${s}`);
    }
    for (const k of Object.keys(total)) total[k] += moves[k].length;
    rows.push({ caseName, template: after.template, counts: [before.counts, after.counts], moves });
  }
  lines.push(`# Decision diff: ${a.release} → ${b.release}`, '',
    `Across ${rows.length} cases: ${total.verdict} material verdicts moved, ${total.listed} listings changed, ${total.group} group changes, ${total.shown} rows now shown for another product, ${total.products} product answers moved.`, '');
  const fmtCounts = (c) => `pass ${c.pass}, unknown ${c.unknown} (hidden ${c.screened}), fail ${c.fail}`;
  for (const r of rows) {
    if (r.note) { lines.push(`## ${r.caseName}`, '', r.note, ''); continue; }
    const n = Object.values(r.moves).reduce((s, x) => s + x.length, 0);
    if (!n && !r.template) continue;
    lines.push(`## ${r.caseName}`, '', `Before: ${fmtCounts(r.counts[0])}. After: ${fmtCounts(r.counts[1])}.`, '');
    if (!n) { lines.push('Nothing moved.', ''); continue; }
    for (const [k, title] of [['verdict', 'Material verdicts'], ['listed', 'Listed or not'], ['group', 'Groups'], ['shown', 'Product the row shows'], ['products', 'Product answers']]) {
      const xs = r.moves[k];
      if (!xs.length) continue;
      lines.push(`**${title} (${xs.length}).** ${xs.slice(0, 40).join('; ')}${xs.length > 40 ? `; and ${xs.length - 40} more` : ''}.`, '');
    }
  }
  return { text: `${lines.join('\n')}\n`, total };
}

if (process.argv.includes('--diff')) {
  const i = process.argv.indexOf('--diff');
  const [a, b] = [process.argv[i + 1], process.argv[i + 2]].map((f) => JSON.parse(readFileSync(f, 'utf8')));
  const { text, total } = diff(a, b);
  if (arg('--md')) writeFileSync(arg('--md'), text);
  console.log(JSON.stringify(total));
} else {
  const res = await census(arg('--root') ?? '.', arg('--db') ?? 'dist/db.json');
  writeFileSync(arg('--out') ?? 'census.json', JSON.stringify(res));
  console.log(`release ${res.release}: ${Object.keys(res.cases).length} cases written to ${arg('--out') ?? 'census.json'}`);
}
