#!/usr/bin/env node
// The census behind REPORT.md: every count it states, computed from the tables and the committed snapshot so the
// report can be re-checked, and so it stops being true out loud when the data moves.
//
//   node docs/audits/2026-09-17-data-gaps/ledgers/gap-census.mjs
//
// Writes gap-census.csv (Section, Measure, Value, Of, Source) and prints it.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText, parseCsvText } from '../../../../build/src/csv.js';
import { openTables } from '../../../../scripts/data/table-io.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
const read = (p, label) => parseCsvText(readFileSync(p, 'utf8'), label).records.map((r) => r.values);

const t = openTables();
const rows = (n) => t.rows(n);
const out = [];
const add = (Section, Measure, Value, Of, Source) => out.push({ Section, Measure, Value: String(Value), Of: String(Of ?? ''), Source });

const materials = rows('materials');
const live = rows('measurements').filter((r) => r['Data status'] !== 'Retired duplicate record');
const grades = rows('grades');
const sources = new Map(rows('sources').map((r) => [r.SourceID, r]));
const evidence = rows('evidence');
const profiles = rows('profiles');
const prices = rows('prices');
const coverage = rows('coverage');
const nM = materials.length;

// ---------------------------------------------------------------- what the tool can and cannot answer
const templates = read(join(root, 'build/snapshot/templates.csv'), 'templates.csv');
add('Answerability', 'Template verdicts UNKNOWN', templates.filter((r) => r.Verdict === 'UNKNOWN').length, templates.length, 'build/snapshot/templates.csv');
add('Answerability', 'Template verdicts PASS', templates.filter((r) => r.Verdict === 'PASS').length, templates.length, 'build/snapshot/templates.csv');

const snapHeadlines = read(join(root, 'build/snapshot/headlines.csv'), 'headlines.csv');
for (const kind of ['value', 'estimate', 'none', 'not applicable']) {
  add('Headlines', `Headlines that are "${kind}"`, snapHeadlines.filter((r) => r.Kind === kind).length, snapHeadlines.length, 'build/snapshot/headlines.csv');
}
for (const key of [...new Set(snapHeadlines.map((r) => r.Headline))].sort()) {
  const sub = snapHeadlines.filter((r) => r.Headline === key);
  add('Headlines', `${key}: measured`, sub.filter((r) => r.Kind === 'value').length, sub.length, 'build/snapshot/headlines.csv');
  add('Headlines', `${key}: no value at all`, sub.filter((r) => r.Kind === 'none').length, sub.length, 'build/snapshot/headlines.csv');
}

// ---------------------------------------------------------------- screening certification
const screening = read(join(root, 'build/snapshot/screening.csv'), 'screening.csv');
for (const r of screening.filter((x) => x.End === 'top' && x.Class === 'this-material'))
  add('Screening', `${r.Headline} this-material back-test cases`, r.Held, 22, 'build/snapshot/screening.csv');
add('Screening', 'Classes that cannot screen', screening.filter((r) => r.Screens === 'no').length, screening.length, 'build/snapshot/screening.csv');

// ---------------------------------------------------------------- properties: what is published at all
const registered = rows('properties');
const byProperty = new Map();
for (const r of live) {
  if (!byProperty.has(r.Property)) byProperty.set(r.Property, new Set());
  byProperty.get(r.Property).add(r.MaterialID);
}
for (const p of registered) {
  if (p['Replaced by']) continue;
  add('Properties', `${p.Property}: materials with any value`, byProperty.get(p.Property)?.size ?? 0, nM, 'data/tables/measurements.csv');
}

// ---------------------------------------------------------------- test conditions
const share = (label, predicate) => add('Conditions', label, live.filter(predicate).length, live.length, 'data/tables/measurements.csv');
share('Rows whose moisture condition is Not published', (r) => r['Moisture condition'] === 'Not published');
share('Rows whose post-processing is Not published', (r) => r['Post-processing'] === 'Not published');
share('Rows whose specimen type starts "Not published"', (r) => r['Specimen type'].startsWith('Not published'));
share('Rows whose direction is Not published', (r) => r.Direction === 'Not published');
share('Rows whose test temperature is Not published', (r) => r['Test temperature'] === 'Not published');
add('Conditions', 'Materials with a Comparability "Limited comparability" row',
  new Set(coverage.filter((r) => r.Domain === 'Comparability' && r.Status === 'Limited comparability').map((r) => r.MaterialID)).size, nM, 'data/tables/coverage.csv');

// ---------------------------------------------------------------- sources
const byPublisher = new Map(); const byClass = new Map();
for (const r of live) {
  const s = sources.get(r.SourceID);
  byPublisher.set(s?.Publisher ?? '?', (byPublisher.get(s?.Publisher ?? '?') ?? 0) + 1);
  byClass.set(s?.['Source class'] ?? '?', (byClass.get(s?.['Source class'] ?? '?') ?? 0) + 1);
}
add('Sources', 'Sources on record', sources.size, '', 'data/tables/sources.csv');
add('Sources', 'Distinct publishers on record', new Set([...sources.values()].map((s) => s.Publisher)).size, '', 'data/tables/sources.csv');
add('Sources', 'Sources with a recorded SHA-256', [...sources.values()].filter((s) => /^[a-f0-9]{64}$/.test(s.SHA256)).length, sources.size, 'data/tables/sources.csv');
add('Sources', 'Sources with no publication date', [...sources.values()].filter((s) => s['Publication date'] === 'Not published').length, sources.size, 'data/tables/sources.csv');
add('Sources', 'Sources that are safety data sheets', [...sources.values()].filter((s) => /safety data|\bSDS\b/i.test(`${s.Title} ${s['Source class']}`)).length, sources.size, 'data/tables/sources.csv');
for (const [k, v] of [...byClass].sort((a, b) => b[1] - a[1]).slice(0, 4)) add('Sources', `Measurement rows from source class "${k}"`, v, live.length, 'data/tables/measurements.csv');
for (const [k, v] of [...byPublisher].sort((a, b) => b[1] - a[1]).slice(0, 5)) add('Sources', `Measurement rows published by ${k}`, v, live.length, 'data/tables/measurements.csv');

// ---------------------------------------------------------------- materials
const has = (set) => (id) => set.has(id);
const withMeasurements = new Set(live.map((r) => r.MaterialID));
const withEvidence = new Set(evidence.map((r) => r.MaterialID));
const withPrice = new Set(prices.map((r) => r.MaterialID));
const withProfile = new Set(profiles.map((r) => r.MaterialID));
add('Materials', 'Materials on record', nM, '', 'data/tables/materials.csv');
add('Materials', 'Materials with no measurement', materials.filter((m) => !has(withMeasurements)(m.MaterialID)).length, nM, 'data/tables/measurements.csv');
add('Materials', 'Materials with no evidence record', materials.filter((m) => !has(withEvidence)(m.MaterialID)).length, nM, 'data/tables/evidence.csv');
add('Materials', 'Materials with no price row', materials.filter((m) => !has(withPrice)(m.MaterialID)).length, nM, 'data/tables/prices.csv');
add('Materials', 'Materials with no profile', materials.filter((m) => !has(withProfile)(m.MaterialID)).length, nM, 'data/tables/profiles.csv');
const manufacturers = new Map();
for (const g of grades) {
  if (g.Status !== 'active' || g.Role !== 'procurement') continue;
  if (!manufacturers.has(g.MaterialID)) manufacturers.set(g.MaterialID, new Set());
  manufacturers.get(g.MaterialID).add(g.Manufacturer);
}
add('Materials', 'Materials resting on a single manufacturer', [...manufacturers.values()].filter((s) => s.size === 1).length, manufacturers.size, 'data/tables/grades.csv');

// ---------------------------------------------------------------- process guidance
const stated = (col) => profiles.filter((r) => r[col] && !/^(not published|not applicable|not stated|unknown)/i.test(r[col])).length;
for (const col of ['Nozzle °C', 'Bed °C', 'Chamber °C', 'Volumetric limit', 'Speed', 'Warping / shrinkage', 'Stringing', 'Layer adhesion', 'Difficulty', 'Failure modes'])
  add('Printing', `Profiles stating ${col}`, stated(col), profiles.length, 'data/tables/profiles.csv');

// ---------------------------------------------------------------- coverage register
for (const status of [...new Set(coverage.map((r) => r.Status))].sort())
  add('Coverage register', `Rows with status "${status}"`, coverage.filter((r) => r.Status === status).length, coverage.length, 'data/tables/coverage.csv');
add('Coverage register', 'Distinct findings among the Gap rows', new Set(coverage.filter((r) => r.Status === 'Gap').map((r) => r.Finding)).size, coverage.filter((r) => r.Status === 'Gap').length, 'data/tables/coverage.csv');

writeFileSync(join(here, 'gap-census.csv'), csvText(['Section', 'Measure', 'Value', 'Of', 'Source'], out));
let section = '';
for (const r of out) {
  if (r.Section !== section) { section = r.Section; console.log(`\n## ${section}`); }
  console.log(`  ${r.Measure.padEnd(58)} ${r.Value.padStart(5)}${r.Of ? ` of ${r.Of}` : ''}`);
}
