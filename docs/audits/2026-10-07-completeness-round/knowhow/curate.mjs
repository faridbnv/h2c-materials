#!/usr/bin/env node
// Completeness round 2026-10-07, item 4: Claude Opus's review of the makers' statements twelve Claude Sonnet readers
// copied from 208 cached documents (knowhow/PROMPT.md, out-*.csv). Writes applied/statements.csv and applied/reads.csv
// (what m412 applies) and curation.csv (the decision on every reading, with its reason). Nothing in data/ changes here.
//
//   node docs/audits/2026-10-07-completeness-round/knowhow/curate.mjs
//
// The rules, in the order they are tried (m140's, D136):
//   - a "none" row is a document read and found silent: no statement, but the document is read (reads.csv);
//   - the topic is one of the twelve know-how topics, and the product one the document is linked to;
//   - a row of a print-settings table ("Fan speed: 0-70%") is a print setting, not a statement;
//   - the statement is on its page, as the migration will check it (onCachedSheet: the line, reading-order,
//     ligature-repaired or optical view of the cached sheet); a sentence a reader joined across interleaved columns that
//     no view prints is not taken;
//   - a statement the product already holds is not taken twice, and one statement is one row per product (its first
//     topic);
//   - a guide's general text is dropped: one document giving the same sentence to four materials or more;
//   - a template sentence is dropped: the same words on at least four of a maker's materials and on at least half of the
//     materials it makes (Spectrum's "Adhesives" footnote under its portfolio's table; m140 dropped Raise3D's and
//     Nanovia's the same way).
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, csvText } from '../../../../build/src/csv.js';
import { openTables } from '../../../../scripts/data/table-io.mjs';
import { onCachedSheet } from '../../../../scripts/migrate/read-proposals-apply.mjs';
import { tidy } from '../../../../scripts/ingest/read-proposals.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const t = openTables();
const csv = (f) => readCsv(f).records.map((r) => r.values);
const docs = new Map(csv(join(HERE, 'DOCS.csv')).map((d) => [d.SourceID, d]));
const topics = new Set(csv(join(HERE, '../../../../schema/vocab/environment-topics.csv')).filter((r) => r.Category === 'know-how').map((r) => r.Value));
const grades = new Map(t.rows('grades').map((g) => [g.GradeID, g]));
const held = new Set(t.rows('evidence').map((e) => `${e.GradeID}\u0000${tidy(e.Finding)}`));

const SETTING_ROW = /^\s*(max(imum)?\s+recommended\s+)?(print(ing)?\s+speed|fan(\s+speed)?|cooling(\s+fan)?|optimierte k\S+hlung|retraction|nozzle\s+(size|diameter|temp\w*)|layer\s+(height|thickness)|bed\s+temp\w*|heat\s*bed|build\s+plate\s+temp\w*|print(ing)?\s+temp\w*|extrusion\s+temp\w*|infill(\s+speeds?)?|flow(\s+rate)?|wall|enclosure(\s+needed)?|chamber\s+temp\w*)\b[^.]{0,30}:\s*\S/i;
const readings = readdirSync(HERE).filter((f) => /^out-\d+\.csv$/.test(f)).sort().flatMap((f) => csv(join(HERE, f)).map((r) => ({ ...r, file: f })));
const decided = [];
const keep = [];
const seen = new Set();
const viewOf = new Map();
for (const r of readings) {
  const finding = tidy(String(r.Finding ?? ''));
  const say = (decision, reason) => decided.push({ file: r.file, SourceID: r.SourceID, Page: r.Page, GradeID: r.GradeID, Topic: r.Topic, Claim: r.Claim, Finding: finding, decision, reason });
  if (r.Topic === 'none') { say('read', 'the document was read and holds no statement of these kinds'); continue; }
  const doc = docs.get(r.SourceID);
  if (!doc) { say('hold', 'not one of the documents the round read'); continue; }
  if (!topics.has(r.Topic)) { say('hold', `"${r.Topic}" is not a know-how topic`); continue; }
  if (!doc.Grades.split(' ').includes(r.GradeID) || grades.get(r.GradeID)?.Status !== 'active') { say('hold', `${r.GradeID} is not an active product this document is linked to`); continue; }
  if (finding.length < 12) { say('hold', 'too short to be a statement'); continue; }
  // A row of a print-settings table is a print setting, a profile's (m140 took none): "Fan speed: 0-70%", "Print
  // Speed: 50 mm/s", "Nozzle size: ≥ 0.4mm", "Enclosure needed: No". The closing blind draw found one (B30).
  if (SETTING_ROW.test(finding) && finding.length < 90) { say('hold', 'a row of a print-settings table, not a statement: it belongs to the product\'s print profile'); continue; }
  const k = `${r.GradeID}\u0000${finding}`;
  if (held.has(k)) { say('skip', 'the product holds this statement already'); continue; }
  if (seen.has(k)) { say('skip', 'the same statement for the same product under a second topic: one row, its first topic'); continue; }
  let view;
  try { view = onCachedSheet(t, r.SourceID, finding, 'm412'); } catch { say('hold', 'not on its page as written: no view of the cached sheet prints these words in one run (a sentence joined across columns, or not copied exactly)'); continue; }
  seen.add(k);
  viewOf.set(k, typeof view === 'string' && view ? view : 'line');
  keep.push({ ...r, Finding: finding, k });
}

// The template rule, per maker: the same words on at least four of its materials and half of the materials it makes.
const makerOf = (g) => grades.get(g)?.Manufacturer ?? '';
const materialsOfMaker = new Map();
for (const g of grades.values()) if (g.Status === 'active') (materialsOfMaker.get(g.Manufacturer) ?? materialsOfMaker.set(g.Manufacturer, new Set()).get(g.Manufacturer)).add(g.MaterialID);
const spread = new Map();
for (const r of keep) {
  const key = `${makerOf(r.GradeID)}\u0000${r.Finding}`;
  (spread.get(key) ?? spread.set(key, new Set()).get(key)).add(grades.get(r.GradeID).MaterialID);
}
// A guide's general text: one document giving the same sentence to four materials or more speaks of none of them in
// particular (Fillamentum's drying guide, linked to eight products).
const fromOne = new Map();
for (const r of keep) {
  const key = `${r.SourceID}\u0000${r.Finding}`;
  (fromOne.get(key) ?? fromOne.set(key, new Set()).get(key)).add(grades.get(r.GradeID).MaterialID);
}
const statements = [];
for (const r of keep) {
  const maker = makerOf(r.GradeID);
  const on = spread.get(`${maker}\u0000${r.Finding}`).size;
  const range = materialsOfMaker.get(maker)?.size ?? 0;
  const general = fromOne.get(`${r.SourceID}\u0000${r.Finding}`).size;
  if (general >= 4) {
    decided.push({ file: r.file, SourceID: r.SourceID, Page: r.Page, GradeID: r.GradeID, Topic: r.Topic, Claim: r.Claim, Finding: r.Finding, decision: 'skip', reason: `a guide's general text: one document gives it to ${general} materials` });
    continue;
  }
  if (on >= 4 && on * 2 >= range) {
    decided.push({ file: r.file, SourceID: r.SourceID, Page: r.Page, GradeID: r.GradeID, Topic: r.Topic, Claim: r.Claim, Finding: r.Finding, decision: 'skip', reason: `a template sentence: on ${on} of ${maker}'s ${range} materials` });
    continue;
  }
  decided.push({ file: r.file, SourceID: r.SourceID, Page: r.Page, GradeID: r.GradeID, Topic: r.Topic, Claim: r.Claim, Finding: r.Finding, decision: 'apply', reason: `on the cached page (${viewOf.get(r.k)} view)` });
  statements.push({ GradeID: r.GradeID, SourceID: r.SourceID, Page: r.Page, Topic: r.Topic, Finding: r.Finding, Claim: r.Claim ?? '', View: viewOf.get(r.k) });
}

mkdirSync(join(HERE, 'applied'), { recursive: true });
writeFileSync(join(HERE, 'applied/statements.csv'), csvText(['GradeID', 'SourceID', 'Page', 'Topic', 'Finding', 'Claim', 'View'], statements));
writeFileSync(join(HERE, 'applied/reads.csv'), csvText(['SourceID'], [...docs.keys()].sort().map((SourceID) => ({ SourceID }))));
writeFileSync(join(HERE, 'curation.csv'), csvText(['file', 'SourceID', 'Page', 'GradeID', 'Topic', 'Claim', 'Finding', 'decision', 'reason'], decided));
const count = {};
for (const d of decided) count[`${d.decision}: ${d.reason.replace(/\d+/g, 'N').slice(0, 60)}`] = (count[`${d.decision}: ${d.reason.replace(/\d+/g, 'N').slice(0, 60)}`] ?? 0) + 1;
console.log(statements.length, 'statements on', new Set(statements.map((s) => s.GradeID)).size, 'products;', docs.size, 'documents read');
console.log(Object.entries(count).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${String(v).padStart(5)}  ${k}`).join('\n'));
