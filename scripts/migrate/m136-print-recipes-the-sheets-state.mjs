#!/usr/bin/env node
// Migration m136 (2026-09-25): the print recipes the products' own sheets state (re-center lane 2; GOALS C9).
//
// Since D83 each product's own profiles screen it, and a product whose profile is silent on the chamber, or that has
// none, is unknown on that gate. Of 1,098 active products, 140 recorded a chamber state, 135 an enclosure and 181 a
// drying schedule. The sheets already fetched, hashed and cached say more: the import read their recommended-settings
// tables for nozzle and bed and left the rows it did not know (Flashforge's "Ambient Temperature for Printing",
// Polymaker's "Closure chamber" and "Drying temp. and time" in the right-hand column, Spectrum's "Drying (if wet)" and
// its footnote), and the notes in prose (Nanovia's "Dehydrate for 4h at 60°C prior to printing", SIDDAMENT's "If
// damp, dry at 80°C for 2-4 hours.").
//
// Each fill is a statement on the product's own document, as printed, pinned in m136-print-recipes-the-sheets-state.csv
// with its page and the label of its row, so the history does not depend on what a later reader reads. Only a document
// linked to this product alone counts: never a sibling's, a retailer's page or a family-level guide (D35). Products
// whose sheet the import recorded once for several products (R053 twins, R166 reprints) have no values of their own
// and are left to a ruling. What was left, and why, is in docs/audits/2026-09-25-re-center/RESPONSE.md, "Lane 2".
//
// The raw column is the sheet's words; the typed columns beside it are what the build's own parsers read from them
// (PARSE-MISMATCH), except where Parse review says why not: a window marked "(Recommended)" after its numbers, and a
// drying temperature printed without its unit or with a degree glyph the parser does not know. A statement goes on the
// product's lowest-numbered profile citing that document, and the Locator gains its page and label; a product with no
// profile gets one, citing the document, with every axis the document does not state left Not published.
//
// Every value is checked on the page its Locator names before anything is written: the statement's words must stand on
// that page in order. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m136-print-recipes-the-sheets-state.mjs

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { openTables } from '../data/table-io.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { parseTemperature, parseEnclosure, parseDrying } from '../../build/src/normalize/process.js';

const migration = 'm136-print-recipes-the-sheets-state';
const here = dirname(fileURLToPath(import.meta.url));
const fills = readCsv(join(here, `${migration}.csv`)).records.map((r) => r.values);
const NA = 'Not applicable';
const NP = 'Not published';
// The build's plausibility windows (build/src/compile.js, TEMP_WINDOW).
const WINDOW = { nozzle: [100, 500], bed: [0, 250], chamber: [0, 200] };
const COLUMN = { nozzle: 'Nozzle', bed: 'Bed', chamber: 'Chamber' };

const t = openTables();

// ---------------------------------------------------------------------------------------------- the page says it
// Fullwidth punctuation is written in its ASCII form (TEXT-FULLWIDTH); everything else is the page's own text.
const plain = (s) => String(s).replace(/[\uff01-\uff5e]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/\s+/g, ' ').trim();
// A statement taken from inside a sentence ends where the sentence goes on, so a word's closing punctuation is not
// part of what is compared.
// A comma the layout left without its space ("For best results,It is recommended") divides two words all the same.
const words = (s) => plain(s).replace(/,(?=\S)/g, ', ').split(' ').map((w) => w.replace(/[.,;:]+$/, '')).filter(Boolean);
const pages = new Map();
function pageTokens(sourceId, page) {
  const key = `${sourceId}|${page}`;
  if (!pages.has(key)) {
    const s = t.get('sources', sourceId);
    const text = cachedText(s.SHA256);
    if (!text) throw new Error(`${migration}: ${sourceId} has no cached text for ${s.SHA256}; fetch and extract it first`);
    const p = text.pages.find((x) => x.page === Number(page));
    if (!p) throw new Error(`${migration}: ${sourceId} has no page ${page}`);
    pages.set(key, words(p.lines.map((l) => (typeof l === 'string' ? l : l.text)).join(' ')));
  }
  return pages.get(key);
}
// The statement's words stand on the page in order. A table cell can sit beside its label or wrap around it, so a few
// words of the page may fall between two of the statement's, never more.
function printedOn(tokens, raw, gap = 6) {
  const want = words(raw);
  for (let start = 0; start < tokens.length; start++) {
    if (tokens[start] !== want[0]) continue;
    let at = start, ok = true;
    for (const w of want.slice(1)) {
      let k = at + 1;
      while (k < tokens.length && k - at <= gap + 1 && tokens[k] !== w) k++;
      if (k >= tokens.length || tokens[k] !== w) { ok = false; break; }
      at = k;
    }
    if (ok) return true;
  }
  return false;
}

// ------------------------------------------------------------------------------------------ the typed reading
function typedCells(f) {
  const reviewed = f['Parse review'] !== NA;
  if (f.Axis === 'enclosure') {
    const p = parseEnclosure(f.Raw);
    if (p.state !== f.State) throw new Error(`${migration}: ${f.Fill} enclosure reads as ${p.state}, pinned ${f.State}`);
    return { Enclosure: f.Raw, 'Enclosure state': f.State };
  }
  if (f.Axis === 'drying') {
    const p = parseDrying(f.Raw);
    const read = { 'Drying °C': p.tempC == null ? NP : String(p.tempC), 'Drying hours': p.hours == null ? NP : String(p.hours) };
    for (const k of ['Drying °C', 'Drying hours']) {
      if (read[k] !== f[k] && !reviewed) throw new Error(`${migration}: ${f.Fill} ${k} reads as ${read[k]}, pinned ${f[k]}, and no Parse review says why`);
    }
    return { Drying: f.Raw, 'Drying state': 'stated', 'Drying °C': f['Drying °C'], 'Drying hours': f['Drying hours'] };
  }
  const label = COLUMN[f.Axis];
  const p = parseTemperature(f.Raw, { plausible: WINDOW[f.Axis] });
  if (p.unparsed) throw new Error(`${migration}: ${f.Fill} ${label} "${f.Raw}" is text the parser cannot read`);
  const range = p.state === 'range';
  const read = { state: p.state, min: range ? String(p.min ?? NP) : NA, max: range ? String(p.max ?? NP) : NA, requirement: p.requirement };
  const pinned = { state: f.State, min: f.Min, max: f.Max, requirement: f.Requirement };
  for (const k of Object.keys(read)) {
    if (read[k] !== pinned[k] && !reviewed) throw new Error(`${migration}: ${f.Fill} ${label} ${k} reads as ${read[k]}, pinned ${pinned[k]}, and no Parse review says why`);
  }
  return { [`${label} °C`]: f.Raw, [`${label} state`]: f.State, [`${label} min °C`]: f.Min, [`${label} max °C`]: f.Max, [`${label} requirement`]: f.Requirement };
}

const where = (f) => `p. ${f.Page}: ${f.Label}`;
for (const f of fills) {
  const g = t.get('grades', f.GradeID);
  if (g.Status !== 'active') throw new Error(`${migration}: ${f.Fill} ${f.GradeID} is ${g.Status}`);
  if (!printedOn(pageTokens(f.SourceID, f.Page), f.Raw)) throw new Error(`${migration}: ${f.Fill} "${f.Raw}" is not printed on p. ${f.Page} of ${f.SourceID}`);
  f.cells = typedCells(f);
}

let changed = 0;
const tally = {};
const count = (axis) => { tally[axis] = (tally[axis] ?? 0) + 1; changed++; };
const addReview = (before, text) => (before == null || before === NA ? text : before.includes(text) ? before : `${before} ${text}`);

// ------------------------------------------------------------------------------ the product's own profile
for (const f of fills.filter((x) => x.Target !== 'new')) {
  const p = t.get('profiles', f.Target);
  if (p.GradeID !== f.GradeID || p.SourceID !== f.SourceID) throw new Error(`${migration}: ${f.Fill} ${f.Target} is ${p.GradeID} citing ${p.SourceID}`);
  const rawColumn = Object.keys(f.cells)[0];
  if (p[rawColumn] === f.Raw) continue; // already written
  if (p[rawColumn] !== NP) throw new Error(`${migration}: ${f.Fill} ${f.Target} ${rawColumn} reads "${p[rawColumn]}"; the data moved since this fill was pinned`);
  for (const [column, value] of Object.entries(f.cells)) t.set('profiles', f.Target, column, value, { expect: p[column] });
  if (!p.Locator.includes(where(f))) t.set('profiles', f.Target, 'Locator', `${p.Locator}; ${where(f)}`, { expect: p.Locator });
  if (f['Parse review'] !== NA) t.set('profiles', f.Target, 'Parse review', addReview(p['Parse review'], f['Parse review']), { expect: p['Parse review'] });
  count(f.Axis);
}

// ------------------------------------------------------------------ a profile for a product that had none
const fresh = new Map();
for (const f of fills.filter((x) => x.Target === 'new')) (fresh.get(`${f.GradeID}|${f.SourceID}`) ?? fresh.set(`${f.GradeID}|${f.SourceID}`, []).get(`${f.GradeID}|${f.SourceID}`)).push(f);
for (const [key, list] of [...fresh].sort(([a], [b]) => (a < b ? -1 : 1))) {
  const [gradeId, sourceId] = key.split('|');
  const g = t.get('grades', gradeId);
  const byPage = new Map();
  for (const f of [...list].sort((a, b) => Number(a.Page) - Number(b.Page))) (byPage.get(f.Page) ?? byPage.set(f.Page, []).get(f.Page)).push(f.Label);
  const locator = [...byPage].map(([page, labels]) => `p. ${page}: ${[...new Set(labels)].join(', ')}`).join('; ');
  const existing = t.rows('profiles').find((p) => p.GradeID === gradeId && p.SourceID === sourceId && p.Locator === locator);
  if (existing) continue; // already written
  const row = {
    ProfileID: t.nextId('profiles'), MaterialID: g.MaterialID, GradeID: gradeId, Profile: 'Manufacturer published guidance',
    'Nozzle °C': NP, 'Nozzle state': 'unknown', 'Nozzle min °C': NA, 'Nozzle max °C': NA, 'Nozzle requirement': 'unknown',
    'Bed °C': NP, 'Bed state': 'unknown', 'Bed min °C': NA, 'Bed max °C': NA, 'Bed requirement': 'unknown',
    'Chamber °C': NP, 'Chamber state': 'unknown', 'Chamber min °C': NA, 'Chamber max °C': NA, 'Chamber requirement': 'unknown',
    Enclosure: NP, 'Enclosure state': 'unknown', Plate: NP, Drying: NP, 'Drying state': 'unknown', 'Drying °C': NA, 'Drying hours': NA,
    'Nozzle material': NP, 'Nozzle diameter': NP, 'Abrasion / clogging': NP, 'Hardened nozzle': NP,
    'H2C left': 'Verify exact grade/nozzle; no blanket approval', 'H2C right': 'Verify exact grade/nozzle; no blanket approval',
    'AMS 2 Pro': 'Not verified for every grade', 'AMS HT': 'Not verified for every grade', 'AMS published': NP,
    'Support pairing': NP, 'Failure modes': NP, SourceID: sourceId, 'H2C SourceID': 'H2C-WIKI', Locator: locator, 'Parse review': NA,
  };
  for (const f of list) {
    Object.assign(row, f.cells);
    if (f['Parse review'] !== NA) row['Parse review'] = addReview(row['Parse review'], f['Parse review']);
    count(f.Axis);
  }
  t.append('profiles', row);
  tally['new profiles'] = (tally['new profiles'] ?? 0) + 1;
}

// ---------------------------------------------------------------- annealing the part: a treatment, not a setting
// A sheet that tells the reader to anneal the printed part states a treatment. It is recorded as the maker's statement
// under Post-processing, the schedule in its own words, one per product (its own document first); the annealing that
// test bars went through stays on their measurements (m129), where the product's recipe already reads it.
const annealing = readCsv(join(here, `${migration}-annealing.csv`)).records.map((r) => r.values);
for (const a of annealing) {
  if (!printedOn(pageTokens(a.SourceID, a.Page), a.Finding)) throw new Error(`${migration}: the annealing statement for ${a.GradeID} is not printed on p. ${a.Page} of ${a.SourceID}`);
  if (t.rows('evidence').some((e) => e.GradeID === a.GradeID && e.SourceID === a.SourceID && e.Domain === 'Post-processing' && e.Finding === a.Finding)) continue;
  const discouraged = /not recommended to anneal/.test(a.Finding);
  t.append('evidence', {
    EvidenceID: t.nextId('evidence'), MaterialID: t.get('grades', a.GradeID).MaterialID, GradeID: a.GradeID,
    Domain: 'Post-processing', Topic: 'Post-processing', Finding: a.Finding,
    'Exposure / conditions': `Annealing the printed part${discouraged ? ', which the sheet does not recommend' : ''}: ${a.Exposure}`,
    'Rating 1–5': NP, RubricID: NA, 'Evidence type': 'Manufacturer statement', SourceID: a.SourceID, Locator: `p. ${a.Page}: ${a.Label}`,
  });
  count('annealing (evidence)');
}

if (changed) t.save();
for (const [k, v] of Object.entries(tally)) console.log(`  ${v}\t${k}`);
console.log(`${migration}: ${changed} statement(s) written from the products' own sheets`);
