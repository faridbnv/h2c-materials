#!/usr/bin/env node
// Stage 2b's review of the fibre-content proposals (C37): the reviewer's decisions (review.csv), applied to what the
// pipeline proposed, into the folder the migration applies (reviewed/).
//
//   node docs/audits/2026-10-18-screening-build/fibre/review.mjs
//
// In:  reconcile/new-values.csv (every reading, classified), proposals/values-add.csv (the pipeline's ready rows) and
//      proposals/held.csv (what it held and why), and review.csv: one decision per reading, by RowID.
//        hold     a ready row is not recorded (Reason says why)
//        note     a ready row is recorded with a note added (a skin-core filament, an approximate figure, a conflict)
//        nominal  a figure only the product's name gives: recorded with the name as its Raw value and Data status
//                 "Nominal from product designation" (never a test result); a held row of that kind is built here
//        keep     a held row is recorded (an approximate composition the pipeline took for a claim)
// Out: reviewed/values-add.csv (gate ready, applyProposals' format, plus data_status), reviewed/held.csv (every reading
//      not recorded, with the pipeline's or the reviewer's reason) and reviewed/summary.md.
//
// A held row is built by the pipeline's own valueProposal, so its unit, conditions and standards are mapped as every
// other row's are; its like-row is chosen as the pipeline chooses one. Nothing here writes data/.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../..');
const { readCsv, csvText } = await import(join(root, 'build/src/csv.js'));
const { valueProposal, tidy } = await import(join(root, 'scripts/ingest/read-proposals.mjs'));

const rows = (file) => readCsv(file).records.map((r) => Object.fromEntries(Object.entries(r.values).map(([k, v]) => [k, v ?? ''])));
const table = (name) => rows(join(root, 'data/tables', `${name}.csv`));
const NA = 'Not applicable';
const NOMINAL = 'Nominal from product designation';
const REVIEWED = 'Reviewed 2026-10-18 by Claude Opus (screening build, stage 2b)';

const readings = new Map(rows(join(here, 'reconcile/new-values.csv')).map((r) => [r.RowID, r]));
const { header: addHeader } = readCsv(join(here, 'proposals/values-add.csv'));
const adds = rows(join(here, 'proposals/values-add.csv'));
const held = rows(join(here, 'proposals/held.csv'));
const decisions = rows(join(here, 'review.csv'));
const byRow = new Map(decisions.map((d) => [d.RowID, d]));
if (byRow.size !== decisions.length) throw new Error('review.csv names a reading twice');

const registry = new Map(table('properties').map((p) => [p.Property, p]));
const grades = new Map(table('grades').map((g) => [g.GradeID, g]));
const measurements = table('measurements');
const published = measurements.filter((m) => /^Published value/.test(m['Data status']) && m['Data status'] !== 'Retired duplicate record');
// The like-row, as the pipeline chooses it: the same source and product, then the product, the source, the material, the maker.
const likeFor = (gradeId, sourceId) => {
  const g = grades.get(gradeId);
  const rank = (m) => (m.SourceID === sourceId && m.GradeID === gradeId ? 0 : m.GradeID === gradeId ? 1 : m.SourceID === sourceId ? 2
    : m.MaterialID === g.MaterialID ? 3 : grades.get(m.GradeID)?.Manufacturer === g.Manufacturer ? 4 : 5);
  return published.reduce((best, m) => (!best || rank(m) < rank(best) ? m : best), null);
};
const locators = new Map();
for (const m of measurements) (locators.get(m.SourceID) ?? locators.set(m.SourceID, new Set()).get(m.SourceID)).add(m.Locator);
for (const a of adds) (locators.get(a.SourceID) ?? locators.set(a.SourceID, new Set()).get(a.SourceID)).add(a.Locator);

const out = [];
const heldOut = [];
const used = new Set();
const withReview = (note, d) => tidy(`${note} ${REVIEWED}: ${d.Note}`);

// The pipeline's ready rows, as the reviewer decided.
for (const a of adds) {
  const d = byRow.get(a.rows);
  if (d) used.add(a.rows);
  if (d?.Decision === 'hold') { heldOut.push({ RowID: a.rows, SourceID: a.SourceID, GradeID: a.GradeID, Raw: a['Raw value'], by: 'reviewer', reason: d.Reason }); continue; }
  if (d && !['note', 'nominal'].includes(d.Decision)) throw new Error(`${a.rows}: decision ${d.Decision} is not one a ready row takes`);
  const row = { ...a, data_status: '' };
  if (d) row.note = withReview(a.note, d);
  if (d?.Decision === 'nominal') { row['Raw value'] = d['Raw value']; row.data_status = NOMINAL; row.cause = 'nominal-name'; }
  out.push(row);
}

// Held rows the reviewer records.
for (const h of held) {
  const d = byRow.get(h.RowID);
  if (!d) { heldOut.push({ RowID: h.RowID, SourceID: h.SourceID, GradeID: h.Grade, Raw: h.Raw, by: 'pipeline', reason: `${h.reason}${h.Detail ? ` (${h.Detail})` : ''}` }); continue; }
  used.add(h.RowID);
  if (!['keep', 'nominal'].includes(d.Decision)) throw new Error(`${h.RowID}: decision ${d.Decision} is not one a held row takes`);
  const r = readings.get(h.RowID);
  if (!r) throw new Error(`${h.RowID}: not in the reconciled readings`);
  if (out.some((o) => o.GradeID === r.Grade)) throw new Error(`${h.RowID}: ${r.Grade} already has a row; a kept reading would be a second one`);
  // The pipeline holds an "approximately" sentence as a claim before it maps the row, and a name whose number does not begin
  // the cell before it reads it: both are mapped here from the reading's own number, every other step the pipeline's.
  const lead = d.Decision === 'nominal' ? r.Lo : r.Raw;
  const p = valueProposal({ ...r, Raw: lead, Quote: '' }, { registry, grade: r.Grade });
  if (p.error) throw new Error(`${h.RowID}: ${p.error}`);
  const { facts, bound, decision, ...value } = p;
  void facts; void bound; void decision;
  let locator = tidy(`p. ${r.Page}: ${r.Label || r.Field}`);
  if (locators.get(r.SourceID)?.has(locator)) locator = `${locator} [${r.Grade}]`;
  (locators.get(r.SourceID) ?? locators.set(r.SourceID, new Set()).get(r.SourceID)).add(locator);
  const like = likeFor(r.Grade, r.SourceID);
  const note = `p. ${r.Page}${r.Label ? `, "${r.Label}"` : ''}: the page prints "${r.Raw}"; read by ${r.Reader}, ${r.Presence}.`;
  out.push({
    gate: 'ready', task: 'reader-round', like: like.MeasurementID, SourceID: r.SourceID, GradeID: r.Grade, MaterialID: grades.get(r.Grade).MaterialID,
    ...value, 'Raw value': d.Decision === 'nominal' ? d['Raw value'] : (/^\s*\d/.test(r.Raw) ? r.Raw : value['Raw value']), Locator: locator, quote: r.Quote,
    note: withReview(note, d), cause: d.Decision === 'nominal' ? 'nominal-name' : 'reviewer-kept', sign_view: '', presence: r.Presence, second_read: r.SecondRead,
    quote_view: '', grade_from: 'reader', reader: r.Reader, rows: h.RowID, data_status: d.Decision === 'nominal' ? NOMINAL : '',
  });
}
for (const d of decisions) if (!used.has(d.RowID)) throw new Error(`review.csv: ${d.RowID} is neither proposed nor held`);
// A kept approximate figure keeps the page's number as its cell begins: "approximately 15%" is recorded from its number.
for (const o of out) if (o.data_status !== NOMINAL && !/^\s*[<>≤≥]?\s*\d/.test(o['Raw value'])) throw new Error(`${o.rows}: Raw value "${o['Raw value']}" does not begin with its number`);

mkdirSync(join(here, 'reviewed'), { recursive: true });
const header = [...addHeader, 'data_status'];
writeFileSync(join(here, 'reviewed/values-add.csv'), csvText(header, out));
writeFileSync(join(here, 'reviewed/held.csv'), csvText(['RowID', 'SourceID', 'GradeID', 'Raw', 'by', 'reason'], heldOut));

const productsWith = new Set(out.map((o) => o.GradeID));
const count = (xs, f) => xs.filter(f).length;
const all = [1, 2, 3].flatMap((i) => readFileSync(join(here, `readings/products-part-${i}.tsv`), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t')[0]));
const formulation = (id) => { const k = grades.get(id)?.['Shared formulation key']; return k && !/^Not (published|applicable)/.test(k) ? [...grades.values()].filter((g) => g['Shared formulation key'] === k).map((g) => g.GradeID) : [id]; };
const viaTwin = all.filter((id) => !productsWith.has(id) && formulation(id).some((g) => productsWith.has(g)));
const none = all.filter((id) => !productsWith.has(id) && !viaTwin.includes(id));
writeFileSync(join(here, 'reviewed/summary.md'), `# Fibre content, reviewed

> **Historical record** (2026-10-18): what the stage 2b review recorded from the fibre readings. Written by review.mjs.

- ${out.length} values to record for ${productsWith.size} products: ${count(out, (o) => !o.data_status)} as published, ${count(out, (o) => o.data_status === NOMINAL)} read from the product's name (Data status "${NOMINAL}").
- ${count(out, (o) => o.cause === 'reviewer-kept')} held by the pipeline and kept by the reviewer; ${count(heldOut, (h) => h.by === 'reviewer')} proposed by the pipeline and held by the reviewer.
- ${viaTwin.length} more products read a twin's value (a shared formulation key, D89): ${viaTwin.join(', ') || 'none'}.
- ${none.length} of the ${all.length} fibre-filled products state no fibre content on any registered sheet that was read.
- ${heldOut.length} readings not recorded (held.csv), most because the product's figure is already recorded from another sheet.
`);
console.log(JSON.stringify({ values: out.length, products: productsWith.size, nominal: count(out, (o) => o.data_status === NOMINAL), kept: count(out, (o) => o.cause === 'reviewer-kept'), reviewerHolds: count(heldOut, (h) => h.by === 'reviewer'), held: heldOut.length, viaTwin: viaTwin.length, none: none.length, of: all.length }));
