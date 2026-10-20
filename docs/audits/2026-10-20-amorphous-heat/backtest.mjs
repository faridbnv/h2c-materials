#!/usr/bin/env node
// The back-test of D177 by the stage-4 method (docs/audits/2026-10-18-screening-build/stage-4-backtests.md): the build
// hides values it knows, predicts them from everything else, and counts how often the ranges it would show hold them. One
// variant per run, its numbers as JSON on stdout; BACKTEST.md reads them.
//
//   node docs/audits/2026-10-20-amorphous-heat/backtest.mjs <variant> > <variant>.json
//
// Variants, each the tables as they are after m487 with one change undone:
//   current    nothing changed: an undescribed heat deflection of a plastic that cannot crystallise counts (D177)
//   rule-off   headline_definitions.csv Undescribed bar counts for back to Not applicable on every headline: every such bar
//              set apart again, as D172 had it, on the same records (m487's loads, flags and Specimen types kept)
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [variant = 'current'] = process.argv.slice(2);
const root = resolve('.');
const from = (rel) => import(pathToFileURL(join(root, rel)).href);
const { loadTables, snapshotDate } = await from('build/src/load.js');
const { buildDatabase } = await from('build/src/pipeline.js');
const wb = loadTables(join(root, 'data'));
const defs = wb['Headline definitions'].rows;
const edit = {
  current: () => {},
  'rule-off': () => { for (const r of defs) r['Undescribed bar counts for'] = 'Not applicable'; },
}[variant];
if (!edit) throw new Error(`no variant ${variant}`);
edit();
const { db, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: `backtest-${variant}`, estimates: true, cache: false });
const r3 = (v) => (v == null ? null : Number(Number(v).toPrecision(3)));
const out = { variant, headlines: {} };
for (const key of ['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY', 'hdt045']) {
  const p = db.meta.estimateModel.properties[key];
  const c = p?.calibration ?? {};
  const g = p?.gradeCalibration ?? {};
  out.headlines[key] = {
    held: c.held, likely: r3(c.likelyCoverage), plausible: r3(c.plausibleCoverage), width: r3(c.medianLikelyWidth), scales: [r3(c.likelyScale), r3(c.plausibleScale)],
    byStratum: Object.fromEntries(Object.entries(c.byStratum ?? {}).map(([s, v]) => [s, { held: v.held, likely: r3(v.likelyCoverage), plausible: r3(v.plausibleCoverage), signedError: r3(v.signedError) }])),
    gradeHeld: g.held, gradeLikely: r3(g.likelyCoverage), gradePlausible: r3(g.plausibleCoverage), gradeScales: [r3(g.likelyScale), r3(g.plausibleScale)],
    gradeByMatrix: Object.fromEntries(Object.entries(g.byMatrix ?? {}).map(([s, v]) => [s, { held: v.held, likely: r3(v.likelyCoverage), plausible: r3(v.plausibleCoverage) }])),
    containment: p?.floors?.containment ? { held: p.floors.containment.held, moved: p.floors.containment.moved, likely: r3(p.floors.containment.likelyCoverage), plausible: r3(p.floors.containment.plausibleCoverage), under: p.floors.containment.underPlausible } : null,
    materialsKnown: db.materials.filter((m) => !m.familyEntry && m.headline?.[key]?.known).length,
    productsComparable: db.grades.filter((x) => !x.retired && x.headline?.[key]?.level === 'comparable').length,
    gradeEstimates: db.grades.filter((x) => x.estimate?.[key]).length,
  };
}
out.hdt18 = {
  materialsKnown: db.materials.filter((m) => !m.familyEntry && m.headline?.hdt18?.known).length,
  productsComparable: db.grades.filter((x) => !x.retired && x.headline?.hdt18?.level === 'comparable').length,
};
out.issues = Object.fromEntries(['EST-CALIBRATION', 'EST-ORDER', 'EST-THIN', 'CONVERSION-DRIFT', 'LEDGER-CONTRADICTS-VALUE', 'LEDGER-DISAGREE'].map((code) => [code, issues.filter((i) => i.code === code && i.level !== 'info').length]));
console.log(JSON.stringify(out, null, 1));
