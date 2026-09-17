#!/usr/bin/env node
// The review snapshot: what the tables mean downstream, as committed CSV files, so a data or rule change shows its
// effect in the same diff as the change itself.
//
//   build/snapshot/headlines.csv   every material's headline: value, estimate (likely, plausible, the range that
//                                   screens), not applicable or none
//   build/snapshot/gates.csv       every material's process gates
//   build/snapshot/templates.csv   each application template's candidates in Strict, Explore, and Explore with estimates
//   build/snapshot/warnings.csv    every build warning, one row per record
//   build/snapshot/screening.csv   for every headline, evidence class and end, whether it may screen and where (D59)
//
//   npm run snapshot            rewrite the files
//   npm run snapshot -- --check exit 1 if they are out of date (run by npm run verify)

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText } from '../build/src/csv.js';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';
import { runSelection, UNKNOWN_POLICY } from '../app/js/engine/constraints.js';
import { TEMPLATES } from '../app/js/ui/templates.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'build/snapshot');

const wb = loadTables(join(root, 'data'));
const { db, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'snapshot' });
const errors = issues.filter((i) => i.level === 'error');
if (errors.length) { console.error(`${errors.length} build error(s); fix them before the snapshot (npm run build)`); process.exit(1); }

// An end of a screening range may be open: it screens nothing on that side.
const span = (r) => `${r.lo ?? 'open'}-${r.hi ?? 'open'}`;
const headlines = [];
for (const m of db.materials) {
  for (const [key, h] of Object.entries(m.headline)) {
    const e = h.estimate;
    headlines.push({
      MaterialID: m.id, Material: m.name, Headline: key,
      Kind: h.known ? 'value' : h.notApplicable ? 'not applicable' : e ? 'estimate' : 'none',
      Value: h.known ? h.value : e?.centre ?? '', Unit: h.unit ?? '',
      Likely: e ? `${e.lo}-${e.hi}` : '', Plausible: e ? `${e.plausible.lo}-${e.plausible.hi}` : '',
      Screens: e ? (e.canScreen ? span(e.screenRange) : 'no') : h.loadBracket ? (h.loadBracket.screenRange ? `bracket ${span(h.loadBracket.screenRange)}` : 'no') : '',
      Strength: e?.strength ?? '', Measurement: h.measurementId ?? '', LoadStated: h.loadStated === false ? 'no' : '',
    });
  }
}

const gate = (g) => (g == null ? '' : typeof g === 'string' ? g : g.verdict ?? JSON.stringify(g));
const gates = db.materials.map((m) => ({ MaterialID: m.id, Material: m.name, ...Object.fromEntries(Object.entries(m.gates).map(([k, g]) => [k, gate(g)])) }));

const group = (list) => { const out = new Map(); for (const x of list) { if (!out.has(x.materialId)) out.set(x.materialId, []); out.get(x.materialId).push(x); } return out; };
const ctx = { db, evidenceByMaterial: group(db.evidence), polymerEvidenceByMaterial: group(db.polymerEvidence ?? []), measurementsByMaterial: group(db.measurements), coverageByMaterial: group(db.coverage) };
const mats = db.materials.filter((m) => !m.familyEntry);
const modes = { Strict: { unknownPolicy: UNKNOWN_POLICY.STRICT }, Explore: { unknownPolicy: UNKNOWN_POLICY.EXPLORATION }, 'Explore with estimates': { unknownPolicy: UNKNOWN_POLICY.EXPLORATION, useEstimates: true } };
const templates = [];
for (const t of TEMPLATES) {
  for (const [mode, c] of Object.entries(modes)) {
    const { evaluations } = runSelection(mats, t.constraints, { ...ctx, ...c });
    for (const e of evaluations.filter((x) => x.eligible || x.screened)) {
      templates.push({ Template: t.name, Mode: mode, MaterialID: e.materialId, Material: db.materials.find((m) => m.id === e.materialId).name,
        Verdict: e.verdict, Candidate: e.eligible ? 'yes' : 'screened', ScreenedBy: e.screenedBy.join('; ') });
    }
  }
}

// Sorted by code and record, so moving a rule between modules never reads as a change in what it finds.
const warnings = issues.filter((i) => i.level === 'warn').flatMap((i) => (i.records?.length ? i.records : [i.where]).map((r) => ({ Code: i.code, Record: r })))
  .sort((a, b) => a.Code.localeCompare(b.Code) || a.Record.localeCompare(b.Record, 'en', { numeric: true }));

const screening = [];
for (const [key, p] of Object.entries(db.meta.estimateModel.properties)) {
  for (const [cls, c] of Object.entries(p.screening)) {
    for (const [side, s] of Object.entries({ top: c.above, bottom: c.below })) {
      screening.push({ Headline: key, Class: cls, End: side, Held: s.held, BeyondPlausible: s.beyondPlausible, Rank: s.rank ?? '', Quantile: s.quantile ?? '', Screens: s.certified ? 'yes' : 'no' });
    }
  }
}
for (const [matrix, s] of Object.entries(db.meta.estimateModel.bracketScreening)) {
  screening.push({ Headline: 'hdt045 unstated-load bracket', Class: matrix, End: 'top', Held: s.held, BeyondPlausible: '', Rank: s.rank ?? '', Quantile: s.topGap == null ? '' : `gap ${s.topGap}`, Screens: s.certified ? 'yes' : 'no' });
}

const files = {
  'headlines.csv': csvText(Object.keys(headlines[0]), headlines),
  'gates.csv': csvText([...new Set(gates.flatMap((g) => Object.keys(g)))], gates),
  'templates.csv': csvText(Object.keys(templates[0]), templates),
  'warnings.csv': csvText(['Code', 'Record'], warnings),
  'screening.csv': csvText(Object.keys(screening[0]), screening),
};

if (process.argv.includes('--check')) {
  const stale = Object.entries(files).filter(([f, text]) => !existsSync(join(dir, f)) || readFileSync(join(dir, f), 'utf8') !== text).map(([f]) => f);
  if (stale.length) { console.error(`build/snapshot is out of date (${stale.join(', ')}); run npm run snapshot and review the diff`); process.exit(1); }
  console.log('build/snapshot is current');
} else {
  mkdirSync(dir, { recursive: true });
  for (const [f, text] of Object.entries(files)) writeFileSync(join(dir, f), text);
  console.log(`build/snapshot: ${headlines.length} headlines, ${gates.length} gate rows, ${templates.length} template rows, ${warnings.length} warnings, ${screening.length} screening ends`);
}
