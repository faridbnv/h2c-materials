#!/usr/bin/env node
// Back-tests of the owner's rulings' changes to the estimate stage's inputs (D172; the independent review of T1, F6), by
// the stage-4 method (docs/audits/2026-10-18-screening-build/stage-4-backtests.md): the build hides values it knows,
// predicts them from everything else, and counts how often the ranges it would show hold them. One variant per run, its
// numbers as JSON on stdout; BACKTEST.md reads them.
//
//   node docs/audits/2026-10-20-owner-rulings/evidence/backtest.mjs <variant> [<repository root>] > <variant>.json
//
// Variants, each the tables as they are with one change undone or made:
//   current           nothing changed
//   no-read-flat      headline_definitions.csv Unstated direction back to as-published where it is "flat if printed" (m465)
//   tensile-printed   tensileStrengthXY's Lower bound specimens "printed", as elongation's (D161) and hdt045's (m466) are
//   hdt-unstated      hdt045's Lower bound specimens back to "printed or not stated" (m466 undone)
// The `echoes` rule of build/src/estimate/grades.js is undone by running `current` against a copy of the build whose rule
// returns false (the repository root argument).
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [variant = 'current', rootArg = '.'] = process.argv.slice(2);
const root = resolve(rootArg);
const tablesRoot = resolve('.');
const from = (rel) => import(pathToFileURL(join(root, rel)).href);
const { loadTables, snapshotDate } = await from('build/src/load.js');
const { buildDatabase } = await from('build/src/pipeline.js');
const wb = loadTables(join(tablesRoot, 'data'));
const defs = wb['Headline definitions'].rows;
const edit = {
  current: () => {},
  'no-read-flat': () => { for (const r of defs) if (r['Unstated direction'] === 'flat if printed') r['Unstated direction'] = 'as-published'; },
  'tensile-printed': () => { defs.find((r) => r.HeadlineKey === 'tensileStrengthXY')['Lower bound specimens'] = 'printed'; },
  'hdt-unstated': () => { defs.find((r) => r.HeadlineKey === 'hdt045')['Lower bound specimens'] = 'printed or not stated'; },
}[variant];
if (!edit) throw new Error(`no variant ${variant}`);
edit();
const { db, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: `backtest-${variant}`, estimates: true, cache: false });
const r3 = (v) => (v == null ? null : Number(Number(v).toPrecision(3)));
const KEYS = ['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY', 'hdt045'];
const out = { variant, root: rootArg, headlines: {} };
for (const key of KEYS) {
  const p = db.meta.estimateModel.properties[key];
  const c = p?.calibration ?? {};
  const g = p?.gradeCalibration ?? {};
  out.headlines[key] = {
    held: c.held, likely: r3(c.likelyCoverage), plausible: r3(c.plausibleCoverage), width: r3(c.medianLikelyWidth),
    scales: [r3(c.likelyScale), r3(c.plausibleScale)],
    gradeHeld: g.held, gradeLikely: r3(g.likelyCoverage), gradePlausible: r3(g.plausibleCoverage),
    containment: p?.floors?.containment ? { held: p.floors.containment.held, moved: p.floors.containment.moved, likely: r3(p.floors.containment.likelyCoverage), plausible: r3(p.floors.containment.plausibleCoverage), under: p.floors.containment.underPlausible } : null,
    containmentUnstated: p?.floors?.containmentUnstated ? { likely: r3(p.floors.containmentUnstated.likelyCoverage), plausible: r3(p.floors.containmentUnstated.plausibleCoverage) } : null,
    materialsKnown: db.materials.filter((m) => !m.familyEntry && m.headline?.[key]?.known).length,
    materialsEstimated: db.materials.filter((m) => !m.familyEntry && !m.headline?.[key]?.known && m.headline?.[key]?.estimate).length,
    productsComparable: db.grades.filter((x) => x.headline?.[key]?.level === 'comparable').length,
    gradeEstimates: db.grades.filter((x) => x.estimate?.[key]).length,
    gradeEstimatesNarrow: db.grades.filter((x) => { const e = x.estimate?.[key]; return e && (key === 'hdt045' ? e.plausible.hi - e.plausible.lo < 2 : e.plausible.hi / e.plausible.lo < 1.02); }).length,
  };
}
out.issues = Object.fromEntries(['EST-CALIBRATION', 'EST-ORDER', 'EST-THIN', 'CONVERSION-DRIFT'].map((code) => [code, issues.filter((i) => i.code === code && i.level !== 'info').length]));
console.log(JSON.stringify(out, null, 1));
