// Census for the screening review (2026-10-18): the six landing-page templates run as the page runs them, with
// "Materials that could not be checked: Include" and "Let estimates rule out materials" on, and every material sorted
// into the group the page shows it in. Build first (npm run build).
//
//   node docs/audits/2026-10-18-screening-review/census.mjs              CENSUS.md and scenarios/*.json beside this file
//   node docs/audits/2026-10-18-screening-review/census.mjs --full <f>   also every product's answer, requirement by requirement, as JSON
//
// A scenario file in scenarios/ is one the page could have saved: `npm run trace -- --scenario <file> --product <GradeID>`
// gives one product's decision record by record.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pageContext } from '../../../scripts/trace.mjs';
import { runSelection, compareInterval } from '../../../app/js/engine/constraints.js';
import { newScenario, serialize } from '../../../app/js/engine/scenario.js';
import { TEMPLATES } from '../../../app/js/ui/templates.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const db = JSON.parse(fs.readFileSync(join(root, 'dist/db.json'), 'utf8'));
const fullAt = process.argv.includes('--full') ? process.argv[process.argv.indexOf('--full') + 1] : null;
const mats = db.materials.filter((m) => !m.familyEntry);
const grades = new Map(db.grades.map((g) => [g.id, g]));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const clean = (cs) => cs.map((c) => Object.fromEntries(Object.entries(c).filter(([k]) => !k.startsWith('__'))));

const NAMES = { hdt045: 'HDT at 0.45 MPa', tensileModulusXY: 'tensile modulus (XY)', density: 'density', elongationXY: 'elongation at break (XY)', priceCADkg: 'price' };
const UNITS = { hdt045: '°C', tensileModulusXY: 'GPa', density: 'kg/m³', elongationXY: '%', priceCADkg: 'CAD/kg' };
const OPS = { '>=': 'at least', '<=': 'at most', '>': 'more than', '<': 'less than' };
const GATES = { nozzle: 'nozzle temperature', bed: 'bed temperature', chamber: 'chamber temperature', scope: 'in scope for the H2C' };
const ask = (c) => (c.kind === 'numeric' ? `${NAMES[c.property] ?? c.property} ${OPS[c.operator]} ${c.value} ${UNITS[c.property] ?? ''}`.trim()
  : c.kind === 'gate' ? GATES[c.gate] ?? c.gate : c.kind === 'facet' ? 'a build material, not a support' : c.kind);
const product = (id) => (id ? `${grades.get(id)?.manufacturer ?? ''} ${grades.get(id)?.product ?? ''}`.trim() : '');
const firstSentence = (t) => (t ?? '').split(/(?<=[.;])\s/)[0].replace(/\|/g, '/');
const fmt = (n) => (Math.abs(n) >= 100 ? Math.round(n) : Number(n.toPrecision(3))).toLocaleString('en-US');

/** The group the page lists a material in (app/js/ui/table.js). */
const groupOf = (e) => (e.verdict === 'PASS' ? 'supported' : e.verdict === 'FAIL' ? 'fail' : e.screened ? 'screened' : e.shortlistGroup);
const required = (r) => r.constraint?.mandatory !== false;

/**
 * Why a material the page calls "Insufficient evidence" is there, in the order an engineer would act on it:
 * a product meets every required number and only a printer check is open; or the evidence points to a miss (on some
 * required number every product with a value misses, or every open product's own estimate wholly misses); or there is
 * no product to buy; or nothing usable is known.
 */
function insufficientKind(e, constraints) {
  if (!e.products?.length) return 'no product to buy';
  const numeric = constraints.filter((c) => c.kind === 'numeric' && c.mandatory !== false);
  const statusOf = (p, c) => p.results.find((r) => r.constraint === c)?.status;
  const gateOnly = e.products.some((p) => p.verdict === 'UNKNOWN'
    && numeric.every((c) => statusOf(p, c) === 'PASS')
    && p.results.filter((r) => required(r) && r.status !== 'PASS').every((r) => r.constraint.kind === 'gate'));
  if (gateOnly) return 'only a printer check is open';
  const measuredMiss = numeric.some((c) => e.products.some((p) => statusOf(p, c) === 'FAIL') && !e.products.some((p) => statusOf(p, c) === 'PASS'));
  const open = e.products.filter((p) => p.verdict === 'UNKNOWN');
  const predictedMiss = open.length > 0 && open.every((p) => p.results.some((r) => required(r) && r.prediction?.plausible
    && compareInterval({ lo: r.prediction.plausible.lo, hi: r.prediction.plausible.hi }, r.constraint.operator, r.constraint.value) === 'FAIL'));
  if (measuredMiss || predictedMiss) return 'the evidence points to a miss';
  return 'open: too little usable data';
}

/** What keeps the representing product open, in a line: each open required requirement and its first sentence. */
function why(e, group) {
  const rs = (e.unresolved ?? []).filter(required);
  if (group === 'estimated') {
    const p = e.products?.find((x) => x.gradeId === e.gradeId);
    const est = (p?.results ?? []).filter((r) => r.prediction && required(r) && r.status !== 'PASS')
      .map((r) => `${ask(r.constraint)}: estimated middle value ${fmt(r.prediction.centre)}, wide range ${fmt(r.prediction.plausible.lo)} to ${fmt(r.prediction.plausible.hi)}`);
    return est.length ? est.join('; ') : rs.map((r) => `${ask(r.constraint)}: ${firstSentence(r.reason)}`).join('; ');
  }
  if (group === 'screened') {
    const kinds = new Set(rs.map((r) => (/^(G\S+: )?Not applicable/.test(r.reason) ? 'does not apply to this kind of material' : 'its estimate wholly misses')));
    return `${[...new Set(rs.map((r) => ask(r.constraint)))].join(', ')}: ${[...kinds].join(' / ')}`;
  }
  return [...new Map(rs.map((r) => [ask(r.constraint), firstSentence(r.reason.replace(/^G\S+: /, ''))])).entries()].map(([k, v]) => `${k}: ${v}`).join('; ');
}

const out = [];
const full = {};
out.push('# Census: every material in the six presets, with the uncertain ones included', '',
  `> **Historical record** (2026-10-18): generated by [census.mjs](census.mjs) on release ${db.meta.release?.id}. Re-run it for current figures.`, '',
  '> **In short.** This page lists, for each of the six presets on the landing page, where every material lands when the',
  '> reader includes the materials that could not be checked and lets estimates rule materials out. It is the evidence the',
  '> review counts from. Each preset says what it asks, how many materials land in each group, and, group by group, each',
  '> material with the reason the tool gives for its first open product. Read the [review](README.md) first.', '',
  '## How to read it', '',
  '- **Meet every requirement** ("Supported candidates" on the page): at least one product passes every required check on published values.',
  '- **Estimated candidates to verify**: no product passes, but one product\'s only gaps are numbers the model estimates, and each estimate\'s middle value meets the limit.',
  '- **Insufficient evidence**: every other material that is neither passed nor failed. The page folds it away. Here it is split by what the evidence says: a product meets every number and only a printer check (nozzle, bed or chamber temperature) is open; the evidence points to a miss; there is no product to buy; or too little usable data.',
  '- **Hidden as unlikely** ("screened"): the tool holds the material out because a required property does not apply to it, or its estimate wholly misses. It is still "unknown", not a fail.',
  '- **Fail**: every product fails a required check. Not listed below; counted only.',
  '- **Products: pass / fail / open / hidden** counts the material\'s products. **Shown for** is the product whose reasons the page shows for the material.', '');

for (const t of TEMPLATES) {
  const scenario = { ...newScenario(db.meta), created: '2026-10-18T00:00:00.000Z', template: t.name, constraints: t.constraints, unknownPolicy: 'exploration', useEstimates: true };
  fs.mkdirSync(join(here, 'scenarios'), { recursive: true });
  fs.writeFileSync(join(here, 'scenarios', `${slug(t.name)}.json`), `${serialize({ ...scenario, constraints: clean(t.constraints) })}\n`);
  const ctx = pageContext(db, scenario);
  const { evaluations, counts } = runSelection(mats, t.constraints, ctx);
  const byGroup = {};
  for (const e of evaluations) (byGroup[groupOf(e)] ??= []).push(e);
  const n = (g) => byGroup[g]?.length ?? 0;
  const numeric = t.constraints.filter((c) => c.kind === 'numeric');
  out.push(`## ${t.name}`, '',
    `**Asks:** ${numeric.filter((c) => c.mandatory !== false).map(ask).join(', ') || 'nothing numeric'}${numeric.some((c) => c.mandatory === false) ? ` (reported, not required: ${numeric.filter((c) => c.mandatory === false).map(ask).join(', ')})` : ''}; printable on the H2C (nozzle, bed and chamber temperatures); a build material, not a support.`, '',
    `**Result,** of ${counts.total} materials: meet every requirement ${n('supported')}, estimated candidates ${n('estimated')}, insufficient evidence ${n('insufficient')}, hidden as unlikely ${n('screened')}, fail ${n('fail')}.`, '');
  full[t.name] = {};
  const sections = [['supported', 'Meet every requirement'], ['estimated', 'Estimated candidates to verify'], ['screened', 'Hidden as unlikely ("screened")'], ['insufficient', 'Insufficient evidence']];
  for (const [group, title] of sections) {
    const rows = byGroup[group] ?? [];
    if (!rows.length) continue;
    out.push(`### ${title} (${rows.length})`, '');
    const line = (e) => {
      const m = mats.find((x) => x.id === e.materialId);
      const c = e.counts;
      return `| ${m.name} (${m.id}) | ${c ? `${c.pass} / ${c.fail} / ${c.untested - c.screened} / ${c.screened}` : 'no products'} | ${product(e.gradeId) || '–'} | ${group === 'supported' ? '' : why(e, group)} |`;
    };
    const head = ['| Material | Products: pass / fail / open / hidden | Shown for | Why it is here |', '|---|---|---|---|'];
    if (group === 'insufficient') {
      const kinds = {};
      for (const e of rows) (kinds[insufficientKind(e, t.constraints)] ??= []).push(e);
      out.push(`Split by what the evidence says: ${Object.entries(kinds).map(([k, v]) => `${k} ${v.length}`).join(', ')}.`, '');
      for (const k of ['only a printer check is open', 'the evidence points to a miss', 'no product to buy', 'open: too little usable data']) {
        if (!kinds[k]) continue;
        out.push(`#### ${k.charAt(0).toUpperCase() + k.slice(1)} (${kinds[k].length})`, '', ...head, ...kinds[k].map(line), '');
      }
    } else out.push(...head, ...rows.map(line), '');
  }
  for (const e of evaluations) {
    full[t.name][e.materialId] = {
      name: mats.find((x) => x.id === e.materialId).name, group: groupOf(e), verdict: e.verdict, counts: e.counts, screenedBy: e.screenedBy, representedBy: e.gradeId,
      ...(groupOf(e) === 'insufficient' ? { kind: insufficientKind(e, t.constraints) } : {}),
      products: (e.products ?? []).map((p) => ({
        gradeId: p.gradeId, product: product(p.gradeId), variant: p.variant, verdict: p.verdict, group: p.shortlistGroup, screened: p.screened, state: p.state?.id,
        results: p.results.filter((r) => r.status !== 'PASS').map((r) => ({ criterion: r.criterion, status: r.status, reason: r.reason, ...(r.prediction ? { prediction: r.prediction } : {}), ...(r.estimated ? { estimated: true } : {}), ...(r.screened ? { screened: true } : {}) })),
      })),
    };
  }
}
fs.writeFileSync(join(here, 'CENSUS.md'), `${out.join('\n')}\n`);
if (fullAt) fs.writeFileSync(fullAt, JSON.stringify(full, null, 1));
console.log(`release ${db.meta.release?.id}: CENSUS.md written${fullAt ? `, full answers in ${fullAt}` : ''}`);
