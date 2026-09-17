#!/usr/bin/env node
// Which materials give the screening back-test a case, for every headline and evidence class, and what a material
// that gives none would need (DECISIONS D48, D59; build/src/estimate/screening.js).
//
// A class may screen only once the back-test has enough honest cases: at maxWrongRate 0.1 and confidence 0.9 that is
// 22 (screening.js minimumCases). `this-material` is the class short of them, and a case there needs a SECOND
// FORMULATION of the material — another Shared formulation key with an observation of a related kind — beside the
// grade whose headline is measured. This ledger names, per material, whether it is a case today and which kind of
// measurement on a second product would make it one.
//
//   node docs/audits/2026-09-17-data-gaps/ledgers/certification-cases.mjs
//
// It reproduces the stages of build/src/estimate/index.js up to `obs`, so its counts are the build's own, and it
// exits 1 if they disagree with build/snapshot/screening.csv.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText, parseCsvText } from '../../../../build/src/csv.js';
import { loadTables, snapshotDate } from '../../../../build/src/load.js';
import { buildDatabase } from '../../../../build/src/pipeline.js';
import { normalQuantile } from '../../../../build/src/estimate/numerics.js';
import { HEAD, estimateKeys, modelWith } from '../../../../build/src/estimate/model.js';
import { snapshot, rawObservations, kindOf } from '../../../../build/src/estimate/observations.js';
import { conversions, convert, betweenProductSpread } from '../../../../build/src/estimate/conversions.js';
import { meltingPoint, hyperparameters, spreadObservations } from '../../../../build/src/estimate/gaussian.js';
import { fitWithConflicts } from '../../../../build/src/estimate/calibration.js';
import { minimumCases } from '../../../../build/src/estimate/screening.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const here = dirname(fileURLToPath(import.meta.url));

const wb = loadTables(join(root, 'data'));
const { db, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'ledger' });
const errors = issues.filter((i) => i.level === 'error');
if (errors.length) { console.error(`${errors.length} build error(s); fix them first (npm run build)`); process.exit(1); }

const model = modelWith(db.polymers);
const S = snapshot(db.materials, db.grades, db.measurements, model);
const need = minimumCases(model.screening);

// What a second formulation must publish for this headline to add a this-material case, in the reader's words.
const WANTED = {
  density: 'a density of a second product',
  tensileModulusXY: 'a tensile or flexural modulus of a second product',
  tensileStrengthXY: 'a tensile strength (any endpoint) or flexural strength of a second product, any direction',
  elongationXY: 'an elongation at break, elongation at yield or tensile strain at strength of a second product',
  hdt045: 'an HDT at any load, Vicat, Tg (amorphous matrix) or Tm (filled semicrystalline matrix) of a second product',
};

const rows = [];
const counted = {};

for (const key of estimateKeys(db.registry, model)) {
  const { raw } = rawObservations(key, S, model);
  const conv = conversions(key, raw, model);
  const converted = convert(key, raw, conv, S, model);
  const between = betweenProductSpread(key, raw, S);
  const floors = model.properties[key].floors;
  const fixedW = between.pairs >= model.fitting.minBetweenProductPairs ? Math.max(between.sd, floors.w) : null;
  const hp = hyperparameters(key, spreadObservations(key, converted), S, model, fixedW);
  const { obs } = fitWithConflicts(key, converted, S, model, hp);

  counted[key] = { 'this-grade': 0, 'this-material': 0, family: 0 };

  for (const m of S.pool) {
    const h = m.headline[key];
    // The back-test's own entry condition: a measured headline, and for hdt045 a stated 0.45 MPa load.
    const measured = !!h?.known && !(key === 'hdt045' && !(h.loadStated && h.loadMPa === 0.45));
    if (!measured) continue;
    const f = S.fkey(h.gradeId);
    const headline = obs.map((o, i) => (o.m.id === m.id && o.f === f && o.kind === HEAD[key] ? i : -1)).filter((i) => i >= 0);
    if (!headline.length) continue;
    const rest = obs.map((o, i) => ((o.m.id === m.id || o.f === f) && !headline.includes(i) ? i : -1)).filter((i) => i >= 0);
    const sameGrade = rest.filter((i) => obs[i].f === f);
    const otherGrades = rest.filter((i) => obs[i].f !== f);
    if (sameGrade.length) counted[key]['this-grade']++;
    if (otherGrades.length) counted[key]['this-material']++;
    counted[key].family++;

    // Every active procurement formulation of the material other than the headline's, and whether it is usable here.
    // The compiled grade carries no Role; a study or reference grade is the one whose ID ends in -R# (GRADE-ROLE-ID).
    const others = new Set(db.grades
      .filter((g) => g.materialId === m.id && !g.retired && !/-R\d+$/.test(g.id) && S.fkey(g.id) !== f)
      .map((g) => S.fkey(g.id)));
    const otherKinds = new Set(obs.filter((o, i) => otherGrades.includes(i)).map((o) => o.kind));

    rows.push({
      Headline: key,
      MaterialID: m.id,
      Material: m.name,
      Status: m.h2cStatus,
      'Headline grade': h.gradeId,
      'Formulation key': f,
      'Other active formulations': others.size,
      'This-material case': otherGrades.length ? 'yes' : 'no',
      'Kinds from a second formulation': otherKinds.size ? [...otherKinds].sort().join(' | ') : 'Not applicable',
      'What would add a case': otherGrades.length ? 'Not applicable'
        : others.size ? `its ${others.size} other formulation(s) publish nothing usable here; needs ${WANTED[key]}`
        : `single formulation; needs ${WANTED[key]}`,
    });
  }
}

rows.sort((a, b) => a.Headline.localeCompare(b.Headline) || a.MaterialID.localeCompare(b.MaterialID));
const header = ['Headline', 'MaterialID', 'Material', 'Status', 'Headline grade', 'Formulation key',
  'Other active formulations', 'This-material case', 'Kinds from a second formulation', 'What would add a case'];
writeFileSync(join(here, 'certification-cases.csv'), csvText(header, rows));

// The counts must be the build's own: compare with the committed snapshot.
const snap = parseCsvText(readFileSync(join(root, 'build/snapshot/screening.csv'), 'utf8'), 'screening.csv').records.map((r) => r.values);
let bad = 0;
for (const [key, c] of Object.entries(counted)) {
  for (const cls of Object.keys(c)) {
    const row = snap.find((r) => r.Headline === key && r.Class === cls && r.End === 'top');
    if (!row) continue;
    if (Number(row.Held) !== c[cls]) { console.error(`${key} ${cls}: ledger ${c[cls]} cases, snapshot ${row.Held}`); bad++; }
  }
}
if (bad) { console.error('The ledger disagrees with build/snapshot/screening.csv; do not trust it.'); process.exit(1); }

console.log(`certification-cases.csv: ${rows.length} rows. A class may screen at ${need} cases (maxWrongRate ${model.screening.maxWrongRate}, confidence ${model.screening.confidence}).`);
for (const [key, c] of Object.entries(counted)) {
  const short = Object.entries(c).filter(([, n]) => n < need).map(([cls, n]) => `${cls} ${n}/${need}`);
  console.log(`  ${key.padEnd(18)} this-grade ${String(c['this-grade']).padStart(3)}  this-material ${String(c['this-material']).padStart(3)}  family ${String(c.family).padStart(3)}${short.length ? `   short: ${short.join(', ')}` : ''}`);
}
