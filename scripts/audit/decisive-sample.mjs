#!/usr/bin/env node
// The values the answers rest on, sampled for a person to check against their pages (version 2.1, F15; GOALS C3).
//
// The re-center's spot-check (docs/audits/2026-09-25-re-center/SPOT-CHECK.md) samples what the page shows. This samples
// what decides: the measurements the passing products' verdicts cite, in the six templates and the acceptance portfolio's
// questions, Confirmed only, each in the state it permits (D99). They are stratified by headline, drawn with a fixed
// seed, and each row asks the roles a verdict turns on (the review of 2026-09-27, D07): the product, the value and unit,
// the specimen, the direction, the moisture, the treatment, the test temperature, load or notch. The reviewer writes
// their name, the date and what they found in the last columns; a row that disagrees opens an investigation of its class,
// never a silent fix. A sample estimates an error rate; it never proves the rest right.
//
//   node scripts/audit/decisive-sample.mjs [--per 8] [--seed N]   writes docs/audits/2026-09-27-v2.1-review/SPOT-CHECK-DECISIVE.md

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';
import { releaseIdentity } from '../../build/src/release.js';
import { runSelection, UNKNOWN_POLICY } from '../../app/js/engine/constraints.js';
import { productsByMaterial } from '../../app/js/engine/products.js';
import { TEMPLATES } from '../../app/js/ui/templates.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const out = join(root, 'docs/audits/2026-09-27-v2.1-review/SPOT-CHECK-DECISIVE.md');
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? Number(process.argv[i + 1]) : def; };
const PER = arg('per', 8);
const SEED = arg('seed', 20260928);

const wb = loadTables(join(root, 'data'));
const { db } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'audit' });
db.meta.release = releaseIdentity(root);
const group = (list) => { const m = new Map(); for (const x of list) { if (!m.has(x.materialId)) m.set(x.materialId, []); m.get(x.materialId).push(x); } return m; };
const ctx = { db, productsByMaterial: productsByMaterial(db), evidenceByMaterial: group(db.evidence), coverageByMaterial: group(db.coverage),
  measurementsByMaterial: group(db.measurements), unknownPolicy: UNKNOWN_POLICY.STRICT };
const mats = db.materials.filter((m) => !m.familyEntry && !m.excluded);
const portfolio = JSON.parse(readFileSync(join(root, 'test/acceptance/portfolio.json'), 'utf8'));
const questions = [
  ...TEMPLATES.map((t) => ({ name: t.name, constraints: t.constraints, policy: {} })),
  ...TEMPLATES.map((t) => ({ name: `${t.name}, annealing permitted`, constraints: t.constraints, policy: { anneal: true } })),
  ...portfolio.cases.filter((c) => c.constraints).map((c) => ({ name: c.id, constraints: c.constraints, policy: { anneal: c.policy?.anneal, moisture: c.policy?.moisture } })),
];

// Every measurement a passing product's verdict cites, with the questions that rest on it.
const cited = new Map();
for (const q of questions) {
  for (const e of runSelection(mats, q.constraints, { ...ctx, ...q.policy }).evaluations) {
    for (const p of e.products ?? []) {
      if (p.verdict !== 'PASS') continue;
      for (const r of p.results ?? []) {
        if (!r.measurementId || !r.constraint?.property) continue;
        const c = cited.get(r.measurementId) ?? { key: r.constraint.property, questions: new Set() };
        c.questions.add(q.name);
        cited.set(r.measurementId, c);
      }
    }
  }
}

// mulberry32, then a Fisher-Yates shuffle of each headline's measurements in ID order: the same data gives the same sample.
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(SEED);
const byKey = new Map();
for (const [id, c] of [...cited].sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }))) (byKey.get(c.key) ?? byKey.set(c.key, []).get(c.key)).push(id);
const measurementById = new Map(db.measurements.map((m) => [m.id, m]));
const sourceById = new Map(db.sources.map((s) => [s.id, s]));
const gradeById = new Map(db.grades.map((g) => [g.id, g]));
const rows = [];
for (const [key, ids] of [...byKey].sort()) {
  const list = [...ids];
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  for (const id of list.slice(0, PER)) rows.push({ key, m: measurementById.get(id), questions: cited.get(id).questions });
}

const cell = (t) => String(t ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const L = [
  '# The values the answers rest on: a sample for a person',
  '',
  '<!-- Generated by node scripts/audit/decisive-sample.mjs. The reviewer columns are filled by hand, by a person. -->',
  '',
  `Release ${db.meta.release.id}, data of ${db.meta.snapshot}, seed ${SEED}, ${PER} per headline. ${cited.size} measurements back a passing product's`,
  `verdict in the ${questions.length} questions (the six templates, as printed and with annealing, and the acceptance portfolio's);`,
  `${rows.length} are drawn here. For each, open the source at its page (the SHA-256 identifies the bytes) and check every role:`,
  'is it this product, this value and unit, this specimen, direction, moisture and treatment, and this test temperature, load',
  'or notch? Write your name, the date, and "agrees" or what differs. **No row has been checked by a person yet.**',
  '',
  '| Headline | Measurement | Product | Value as printed | Specimen / direction / moisture / treatment / test | Source (SHA-256) | Page | Questions | Checked by | Date | Finding |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(({ key, m, questions: qs }) => {
    const s = sourceById.get(m.sourceId);
    const g = gradeById.get(m.gradeId);
    const cond = [m.specimenForm, m.direction, m.moistureState, m.postProcessingState + (m.anneal ? ` ${m.anneal.tempC ?? '?'} °C ${m.anneal.hours ?? '?'} h` : ''),
      [m.testTemperatureC != null ? `${m.testTemperatureC} °C` : null, m.thermal?.loadStated ? `${m.thermal.loadMPa} MPa` : null, m.notch !== 'Not applicable' ? m.notch : null].filter(Boolean).join(', ') || 'none stated'].join(' / ');
    return `| ${key} | ${m.id} | ${cell(`${g?.manufacturer} ${g?.product}`)} (${m.gradeId}) | ${cell(m.raw?.value ?? m.value)} | ${cell(cond)} | ${cell(m.sourceId)} (${s?.sha256?.slice(0, 12) ?? 'none'}...) | ${cell(m.locator)} | ${qs.size} |  |  |  |`;
  }),
  '',
];
writeFileSync(out, L.join('\n'));
console.log(`decisive-sample: ${cited.size} deciding measurements, ${rows.length} drawn; wrote ${out.replace(`${root}/`, '')}`);
