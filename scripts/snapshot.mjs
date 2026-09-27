#!/usr/bin/env node
// The review snapshot: what the tables mean downstream, as committed CSV files, so a data or rule change shows its
// effect in the same diff as the change itself.
//
//   build/snapshot/headlines.csv   every material's headline: value, estimate (likely, plausible, the range that
//                                   screens), not applicable or none
//   build/snapshot/gates.csv       every material's process gates
//   build/snapshot/templates.csv   each application template's candidates in Strict, Explore, and Explore with estimates,
//                                   judged by their products as the page judges them (D83): the verdict, how many
//                                   products pass, fail or could not be judged, and the product the reasons come from
//   build/snapshot/warnings.csv    every build warning, one row per record
//   build/snapshot/screening.csv   for every headline, evidence class and end, whether it may screen and where (D59)
//   build/snapshot/grades.csv      every grade's own estimate per headline (D81): strength, precision, the ranges
//   build/snapshot/products.csv    every product's own value per headline, by rule: the measurement, its evidence level,
//                                   what qualifies it, and whether headlines.csv pins it (re-center phase 1)
//   build/snapshot/summaries.csv   every material's spread per headline across its products: n, range, quartiles,
//                                   the typical product, the values published without direction or load, the variants,
//                                   and how many of its values a twin reads from its sibling's sheet (D89)
//   build/snapshot/environment.csv every verdict an environment requirement screens on: a material's own records in a
//                                   filterable category, and the polymer-level ones attached where it has none (D64)
//   build/snapshot/print.csv       every product's print gates as the engine judges them, and which parts of its recipe
//                                   were read from a twin's sheet (D89) or a printer maker's guide (D88), not its own
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
import { productsByMaterial, productGates } from '../app/js/engine/products.js';
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
      Screens: e ? (e.canScreen ? span(e.screenRange) : 'no') : '',
      Strength: e?.strength ?? '', Products: h.spread?.n ?? '', Typical: h.typical?.gradeId ?? '', Measurement: h.typical?.measurementId ?? h.measurementId ?? '',
    });
  }
}

const gate = (g) => (g == null ? '' : typeof g === 'string' ? g : g.verdict ?? JSON.stringify(g));
const gates = db.materials.map((m) => ({ MaterialID: m.id, Material: m.name, ...Object.fromEntries(Object.entries(m.gates).map(([k, g]) => [k, gate(g)])) }));

const group = (list) => { const out = new Map(); for (const x of list) { if (!out.has(x.materialId)) out.set(x.materialId, []); out.get(x.materialId).push(x); } return out; };
const ctx = { db, productsByMaterial: productsByMaterial(db), evidenceByMaterial: group(db.evidence), polymerEvidenceByMaterial: group(db.polymerEvidence ?? []), measurementsByMaterial: group(db.measurements), coverageByMaterial: group(db.coverage) };
const mats = db.materials.filter((m) => !m.familyEntry);
const modes = { Strict: { unknownPolicy: UNKNOWN_POLICY.STRICT }, Explore: { unknownPolicy: UNKNOWN_POLICY.EXPLORATION }, 'Explore with estimates': { unknownPolicy: UNKNOWN_POLICY.EXPLORATION, useEstimates: true } };
const templates = [];
for (const t of TEMPLATES) {
  for (const [mode, c] of Object.entries(modes)) {
    const { evaluations } = runSelection(mats, t.constraints, { ...ctx, ...c });
    for (const e of evaluations.filter((x) => x.eligible || x.screened)) {
      templates.push({ Template: t.name, Mode: mode, MaterialID: e.materialId, Material: db.materials.find((m) => m.id === e.materialId).name,
        Verdict: e.verdict, Share: e.share ?? '', Pass: e.counts?.pass ?? '', Fail: e.counts?.fail ?? '', Untested: e.counts?.untested ?? '',
        Products: e.counts?.products ?? '', Best: e.gradeId ?? '', Candidate: e.eligible ? 'yes' : 'screened', ScreenedBy: e.screenedBy.join('; ') });
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

// Every grade's own estimate (D81), so a range that moves shows in the diff of the change that moved it.
const gradeRows = [];
for (const g of [...db.grades].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))) {
  for (const [key, e] of Object.entries(g.estimate ?? {})) {
    gradeRows.push({ GradeID: g.id, MaterialID: g.materialId, Product: g.product, Headline: key, Strength: e.strength, Precision: e.precision,
      Centre: e.centre, Likely: `${e.lo}-${e.hi}`, Plausible: `${e.plausible.lo}-${e.plausible.hi}`, Unit: e.unit, Own: e.ownShare });
  }
}

// Every product's own values (products.js), so a rule or a data change that moves one shows which.
const productRows = [];
const summaryRows = [];
for (const g of [...db.grades].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))) {
  for (const [key, v] of Object.entries(g.headline ?? {})) {
    productRows.push({ GradeID: g.id, MaterialID: g.materialId, Product: g.product, Headline: key, Value: v.value, Level: v.level,
      Caveat: v.caveat ?? '', Measurement: v.measurementId ?? (v.priceIds ?? []).join('; '),
      Annealed: v.anneal ? `${v.anneal.tempC ?? '?'} °C ${v.anneal.hours ?? '?'} h` : '', Pinned: v.pinned ? 'yes' : '', Variant: g.variant ?? '',
      From: v.from ? `${v.from.origin} ${v.from.gradeId}` : '' });
  }
}
for (const m of db.materials) {
  for (const [key, s] of Object.entries(m.summary ?? {})) {
    summaryRows.push({ MaterialID: m.id, Material: m.name, Headline: key, Products: s.products, Comparable: s.n,
      Min: s.min ?? '', Q1: s.q1 ?? '', Median: s.median ?? '', Q3: s.q3 ?? '', Max: s.max ?? '', Typical: s.typical ?? '',
      AsPublished: s.asPublished ? `${s.asPublished.n}: ${s.asPublished.min}-${s.asPublished.max}` : '',
      Variants: s.variants ? `${s.variants.n}: ${s.variants.min}-${s.variants.max}` : '', Twins: s.twins ?? '' });
  }
}

// Every verdict an environment requirement can screen on: a material's own records in a filterable category, and the
// polymer-level ones attached where it has none (D64). A test once pinned four of them by name (the recovered Bambu
// chemical records); a change to any of them now shows here, in the diff of the change that made it.
const environmentRows = [
  ...db.evidence.filter((e) => e.filterable).map((e) => ({ MaterialID: e.materialId, Category: e.category, Record: e.id, GradeID: e.gradeId ?? '',
    Level: 'own', Verdict: e.verdict ?? '', Qualified: e.qualified ? 'yes' : '', Screens: '' })),
  ...(db.polymerEvidence ?? []).map((p) => ({ MaterialID: p.materialId, Category: p.category, Record: p.id, GradeID: '',
    Level: 'polymer', Verdict: p.verdict ?? '', Qualified: '', Screens: p.screens ? 'yes' : 'no' })),
].sort((a, b) => a.MaterialID.localeCompare(b.MaterialID, 'en', { numeric: true }) || a.Category.localeCompare(b.Category) || a.Record.localeCompare(b.Record, 'en', { numeric: true }));
// Every product's print gates as the engine judges it (app/js/engine/products.js), so a recipe that moves shows which
// product it moved, and where the part that decided came from when it is not the product's own sheet (D88, D89).
const materialById = new Map(db.materials.map((m) => [m.id, m]));
const printRows = [];
for (const g of [...db.grades].filter((x) => !x.retired && !/-R\d+$/.test(x.id)).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))) {
  const gates = productGates(materialById.get(g.materialId), g);
  const from = Object.entries(g.print?.from ?? {}).map(([axis, f]) => `${axis}: ${f.origin} ${f.origin === 'twin' ? f.gradeId : f.guideId}`).join('; ');
  printRows.push({ GradeID: g.id, MaterialID: g.materialId, Product: g.product, Nozzle: gates.nozzle.verdict, Bed: gates.bed.verdict, Chamber: gates.chamber.verdict,
    Enclosure: g.print?.enclosure ?? 'unknown', Abrasive: gates.abrasive, Drying: gates.drying, From: from });
}

// The numbers the docs would otherwise repeat and let go stale (re-center phase 5; GOALS rule 9, "counts are
// generated"): what the database holds, counted from the build the snapshot compares. Docs link here.
// Products are the active procurement grades; a study or reference grade (-R#) is not one.
const products = db.grades.filter((g) => !g.retired && !/-R\d+$/.test(g.id));
const inScope = db.materials.filter((m) => !m.excluded && !m.familyEntry);
const measured = (m) => Object.entries(m.headline).filter(([k, h]) => k !== 'priceCADkg' && h.known).length;
const countRows = [
  ['Materials', db.materials.length, 'rows of materials.csv'],
  ['… in scope for the H2C', inScope.length, 'candidates the templates judge'],
  ['… family entries and aliases', db.materials.filter((m) => m.familyEntry).length, 'names that own no product (D44, D86)'],
  ['… out of scope', db.materials.filter((m) => m.excluded).length, 'recorded, never a candidate'],
  ['Products', products.length, 'active procurement grades'],
  ['… with a comparable value for at least one property', products.filter((g) => Object.entries(g.headline ?? {}).some(([k, v]) => k !== 'priceCADkg' && v.level === 'comparable')).length, 'D84'],
  ['… with a print profile of their own', products.filter((g) => g.print?.profileIds?.length).length, ''],
  ['… reading values from a twin\'s sheet', products.filter((g) => Object.values(g.headline ?? {}).some((v) => v.from?.origin === 'twin')).length, 'the same table, recorded once (D89)'],
  ['… reading part of the print gate from a printer maker\'s guide', products.filter((g) => Object.values(g.print?.from ?? {}).some((f) => f.origin === 'guide')).length, `where their own sheet is silent (D88); ${(db.printGuide ?? []).length} guide rows`],
  ['… with a maker\'s know-how statement', products.filter((g) => g.knowHow?.state === 'collected').length, 'lane 3'],
  ['Measurements', db.measurements.length, 'active rows'],
  ['… with a usable number', db.measurements.filter((m) => m.numeric).length, ''],
  ['Product values', productRows.length, 'one per product and headline, chosen by rule (D83)'],
  ['Material values from products', inScope.reduce((n, m) => n + measured(m), 0), 'headline cells of in-scope materials'],
  ['Material values estimated', inScope.reduce((n, m) => n + Object.values(m.headline).filter((h) => !h.known && h.estimate).length, 0), 'where no product publishes (D43)'],
  ['Print profiles', db.profiles.length, ''],
  ['Evidence records', db.evidence.length, 'exposure, flammability, post-processing and the rest'],
  ['Know-how statements', (db.knowHow ?? []).length, 'the makers\' words, shown in the panel only (D85)'],
  ['Price observations', db.prices.length, `sampled ${db.meta.pricesSampled ?? 'on no date'}`],
  ['Sources', db.sources.length, ''],
];
const counts = ['# What the database holds', '', 'Generated by `npm run snapshot` from the build it compares; `npm run verify` fails when it is stale. Link here', 'rather than repeat a number.', '', '| | Count | |', '|---|---:|---|',
  ...countRows.map(([what, n, note]) => `| ${what} | ${n.toLocaleString('en-US')} | ${note} |`), ''].join('\n');

const files = {
  'counts.md': counts,
  'headlines.csv': csvText(Object.keys(headlines[0]), headlines),
  'gates.csv': csvText([...new Set(gates.flatMap((g) => Object.keys(g)))], gates),
  'templates.csv': csvText(Object.keys(templates[0]), templates),
  'warnings.csv': csvText(['Code', 'Record'], warnings),
  'screening.csv': csvText(Object.keys(screening[0]), screening),
  'grades.csv': csvText(['GradeID', 'MaterialID', 'Product', 'Headline', 'Strength', 'Precision', 'Centre', 'Likely', 'Plausible', 'Unit', 'Own'], gradeRows),
  'products.csv': csvText(Object.keys(productRows[0]), productRows),
  'summaries.csv': csvText(Object.keys(summaryRows[0]), summaryRows),
  'environment.csv': csvText(['MaterialID', 'Category', 'Record', 'GradeID', 'Level', 'Verdict', 'Qualified', 'Screens'], environmentRows),
  'print.csv': csvText(Object.keys(printRows[0]), printRows),
};

if (process.argv.includes('--check')) {
  const stale = Object.entries(files).filter(([f, text]) => !existsSync(join(dir, f)) || readFileSync(join(dir, f), 'utf8') !== text).map(([f]) => f);
  if (stale.length) { console.error(`build/snapshot is out of date (${stale.join(', ')}); run npm run snapshot and review the diff`); process.exit(1); }
  console.log('build/snapshot is current');
} else {
  mkdirSync(dir, { recursive: true });
  for (const [f, text] of Object.entries(files)) writeFileSync(join(dir, f), text);
  console.log(`build/snapshot: ${headlines.length} headlines, ${gates.length} gate rows, ${templates.length} template rows, ${warnings.length} warnings, ${screening.length} screening ends, ${gradeRows.length} grade estimates, ${productRows.length} product values, ${summaryRows.length} material summaries, ${printRows.length} product print gates`);
}
