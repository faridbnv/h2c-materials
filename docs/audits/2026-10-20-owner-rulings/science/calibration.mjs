#!/usr/bin/env node
// The estimate model's calibration, read from a compiled database, for a before/after back-test (stage 4's method,
// docs/audits/2026-10-18-screening-build/stage-4-backtests.md): per headline, how many hidden values were predicted and
// how often the likely (80 %) and plausible (95 %) ranges held them, for materials (by stratum) and for products (by
// matrix as printed). With --grades, the estimates of the products named.
//
//   node docs/audits/2026-10-20-owner-rulings/science/calibration.mjs --db dist/db.json [--grades G067-02,G068-01] [--json out.json]
import { readFileSync, writeFileSync } from 'node:fs';

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : null; };
const db = JSON.parse(readFileSync(arg('db') ?? 'dist/db.json', 'utf8'));
const em = db.meta.estimateModel;
const pct = (x) => (x == null ? '–' : `${(100 * x).toFixed(1)} %`);
const out = { release: db.meta.release ?? db.meta.build ?? null, headlines: {} };

for (const [key, p] of Object.entries(em.properties)) {
  const c = p.calibration ?? {}, g = p.gradeCalibration ?? {};
  out.headlines[key] = {
    material: { held: c.held, likely: c.likelyCoverage, plausible: c.plausibleCoverage, scales: [c.likelyScale, c.plausibleScale], width: c.medianLikelyWidth, byStratum: c.byStratum },
    grade: { held: g.held, likely: g.likelyCoverage, plausible: g.plausibleCoverage, scales: [g.likelyScale, g.plausibleScale], byMatrix: g.byMatrix },
  };
  console.log(`${key}: materials ${c.held} held, likely ${pct(c.likelyCoverage)}, plausible ${pct(c.plausibleCoverage)}, scales ${c.likelyScale}/${c.plausibleScale}, width ${c.medianLikelyWidth}`);
  for (const [s, v] of Object.entries(c.byStratum ?? {})) console.log(`    ${s}: ${v.held} held, ${pct(v.likelyCoverage)} / ${pct(v.plausibleCoverage)}, signed error ${v.signedError}`);
  console.log(`  products ${g.held ?? '–'} held, likely ${pct(g.likelyCoverage)}, plausible ${pct(g.plausibleCoverage)}, scales ${g.likelyScale}/${g.plausibleScale}`);
  for (const [s, v] of Object.entries(g.byMatrix ?? {})) console.log(`    ${s}: ${v.held} held, ${pct(v.likelyCoverage)} / ${pct(v.plausibleCoverage)}`);
}

const ids = (arg('grades') ?? '').split(',').filter(Boolean);
if (ids.length) {
  out.grades = {};
  for (const id of ids) {
    const g = db.grades.find((x) => x.id === id);
    if (!g) { console.log(`${id}: no such product`); continue; }
    out.grades[id] = {};
    for (const key of Object.keys(em.properties)) {
      const e = g.estimate?.[key], h = g.headline?.[key];
      out.grades[id][key] = { own: h?.value ?? null, estimate: e ? { centre: e.centre, lo: e.lo, hi: e.hi, plausible: e.plausible, withheld: e.withheld ?? null } : null };
      if (e || h?.value != null) console.log(`${id} ${g.manufacturer} ${g.product} ${key}: own ${h?.value ?? '–'}; estimate ${e ? `${e.centre} (${e.lo}–${e.hi}; plausible ${e.plausible?.lo}–${e.plausible?.hi})` : '–'}`);
    }
  }
}
if (arg('json')) writeFileSync(arg('json'), `${JSON.stringify(out, null, 1)}\n`);
