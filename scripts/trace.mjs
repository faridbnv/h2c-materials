#!/usr/bin/env node
// Trace a displayed value back to its source, from the current tables (compiled in memory, so it
// never reads a stale dist/).
//
//   npm run trace -- M020                    every headline of a material
//   npm run trace -- PETG tensileModulusXY   one headline; a material name works too
//   npm run trace -- V000384                 one measurement, and the headlines that cite it
//
// Chain: headline -> measurement (raw, unit, factor, normalized, status, conditions)
//        -> grade (owner, availability) -> source (URL, locator, access, SHA-256).

import { resolve } from 'node:path';
import { readSource } from '../build/src/source.js';
import { snapshotDate } from '../build/src/load.js';
import { compile } from '../build/src/compile.js';

const [query, key] = process.argv.slice(2);
if (!query) {
  console.error('usage: npm run trace -- <MaterialID | material name | MeasurementID> [headlineKey]');
  process.exit(2);
}

const root = resolve('.');
const { wb } = readSource(root);
const { db } = compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'trace' });
const byId = (rows, field) => new Map(rows.map((r) => [r[field], r]));
const measurementRows = byId(wb.Properties.rows, 'MeasurementID');
const gradeRows = byId(wb.Grades.rows, 'GradeID');
const sourceRows = byId(wb.Sources.rows, 'SourceID');
const at = (r) => `${r.__file}:${r.__row}`;

const out = [];
const line = (depth, text) => out.push(`${'  '.repeat(depth)}${text}`);

function source(depth, id) {
  const s = sourceRows.get(id);
  if (!s) return line(depth, `source ${id}: NOT FOUND`);
  line(depth, `source ${id}  (${at(s)})`);
  line(depth + 1, `${s.Publisher} — ${s.Title}${s.Revision !== 'Not published' ? `, ${s.Revision}` : ''}`);
  line(depth + 1, `${s.URL}`);
  line(depth + 1, `accessed ${s['Access date']} · ${s['Access status']} · sha256 ${s.SHA256}`);
}

function grade(depth, id) {
  const g = gradeRows.get(id);
  if (!g) return line(depth, `grade ${id}: NOT FOUND`);
  const compiled = db.grades.find((x) => x.id === id);
  line(depth, `grade ${id}  (${at(g)})  ${g.Manufacturer} ${g['Product name']} · material ${g.MaterialID}${compiled?.retired ? ' · RETIRED' : ''}`);
}

function measurement(depth, id) {
  const r = measurementRows.get(id);
  if (!r) return line(depth, `measurement ${id}: NOT FOUND`);
  line(depth, `measurement ${id}  (${at(r)})  ${r.Property}`);
  line(depth + 1, `raw "${r['Raw value']}" [${r['Raw unit']}] -> numeric ${r['Raw numeric']} × factor ${r['Conversion factor']} = ${r['Normalized value']} ${r['Normalized unit']}`);
  line(depth + 1, `status ${r['Data status']} · operator ${r.Operator} · direction ${r.Direction} · specimen ${r['Specimen type']}`);
  line(depth + 1, `moisture ${r['Moisture condition']} · standard/load ${r['Standard / load']} · locator ${r.Locator}`);
  if (r.Notes !== 'Not applicable') line(depth + 1, `notes: ${r.Notes}`);
  grade(depth + 1, r.GradeID);
  source(depth + 1, r.SourceID);
}

function headline(depth, m, k) {
  const h = m.headline[k];
  if (!h) return line(depth, `${k}: no such headline (${Object.keys(m.headline).join(', ')})`);
  if (h.known) {
    line(depth, `${k} = ${h.value} ${h.unit}  [${h.origin}${h.verified === false ? ', NOT VERIFIED' : ''}]`);
    if (h.priceIds) {
      line(depth + 1, `median of ${h.observations} headline-sample observation(s) · ${h.basis ?? ''}`);
      for (const id of h.priceIds) {
        const p = db.prices.find((x) => x.id === id);
        const row = wb['Prices CA'].rows.find((r) => r.PriceID === id);
        line(depth + 2, `${id}  (${at(row)})  ${p.retailer} · ${p.variant} · ${p.listPrice} CAD / ${p.netMassKg} kg = ${p.regularPerKg} CAD/kg · ${p.stock} · accessed ${p.accessDate}`);
        line(depth + 3, p.url);
      }
    } else {
      if (h.loadStated === false) line(depth + 1, 'test load not stated by the source');
      measurement(depth + 1, h.measurementId);
    }
  } else {
    line(depth, `${k}: ${h.text} (${h.missing})`);
    if (h.notApplicable) line(depth + 1, `not applicable: ${h.notApplicable.reason}`);
    if (h.estimate) line(depth + 1, `estimate ${h.estimate.lo}–${h.estimate.hi} ${h.estimate.unit} (likely), plausible ${h.estimate.plausible?.lo}–${h.estimate.plausible?.hi}; ${h.estimate.strength}, precision ${h.estimate.precision}`);
    if (h.related?.count) line(depth + 1, `related evidence: ${h.related.items.map((i) => i.measurementId).join(', ')}`);
  }
}

const material = db.materials.find((m) => m.id === query || m.name.toLowerCase() === query.toLowerCase() || m.abbreviation?.toLowerCase() === query.toLowerCase());
if (material) {
  const row = wb.Materials.rows.find((r) => r.MaterialID === material.id);
  line(0, `${material.id} ${material.name}  (${at(row)})  scope ${material.scope} · family ${material.family} · representative grade ${material.representativeGrade ?? 'none'}`);
  for (const k of key ? [key] : Object.keys(material.headline)) headline(1, material, k);
} else if (measurementRows.has(query)) {
  measurement(0, query);
  const citing = db.materials.filter((m) => Object.values(m.headline).some((h) => h.measurementId === query));
  line(0, citing.length ? `cited as headline by: ${citing.map((m) => `${m.id} ${m.name} (${Object.entries(m.headline).filter(([, h]) => h.measurementId === query).map(([k]) => k).join(', ')})`).join('; ')}` : 'not cited by any headline');
} else {
  console.error(`"${query}" is not a MaterialID, material name, abbreviation or MeasurementID`);
  process.exit(2);
}
console.log(out.join('\n'));
