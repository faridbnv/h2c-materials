#!/usr/bin/env node
// Reading the fetched documents: their text, cached by digest, and which of them are the same sheet twice.
//
// Two documents are the same sheet when they print the same numbers. A retailer's copy of a manufacturer's TDS is
// usually a different file (re-exported, re-compressed, a different revision banner) with an identical table, so
// the digest cannot see it and the words alone are noisy. The numbers are the fingerprint: every "number unit"
// statement on the page, as a sorted multiset. Two documents whose multisets agree, and that print enough numbers
// for the agreement to mean something, are one sheet.
//
//   npm run ingest:extract -- --provider "3D-Fuel"     read every fetched document of a provider
//   npm run ingest:extract -- --batch b06
//   npm run ingest:extract -- --all                    everything fetched and not yet read
//   npm run ingest:extract -- ... --refresh            read again, ignoring the cache
//   npm run ingest:extract -- ... --rescan             decide twins and translations again, from what it reads now
//
// Writes .cache/text/<sha>.json (gitignored) and records twins in the ledger. Nothing here touches data/.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { csvText, readCsv } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';
import { documentText, allLines, joinDigits, statementRe, unitFirstStatementRe, cacheDir, sha256 } from '../lib/pdf-text.mjs';
import { HEADER } from './inventory.mjs';

const LEDGER = join(projectRoot, 'docs/audits/2026-09-18-v2-import/ledger.csv');
const MIN_STATEMENTS = 8;   // below this, two sheets agreeing about their numbers is a coincidence

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : null; };
const flag = (name) => process.argv.includes(`--${name}`);

/**
 * Where a document's bytes are. The store is by digest, but the documents already in the register were cached by
 * SourceID before this pipeline existed (npm run audit:sources still writes them there), so a source that names
 * one is looked up there too, and only accepted if it hashes to what was recorded.
 */
export function documentPath(sha, sourceId = '') {
  const byDigest = ['pdf', 'html'].map((ext) => cacheDir('sources/by-sha', `${sha}.${ext}`)).find(existsSync);
  if (byDigest) return byDigest;
  const byName = sourceId ? cacheDir('sources', `${sourceId}.pdf`) : null;
  if (byName && existsSync(byName) && sha256(readFileSync(byName)) === sha) return byName;
  return null;
}

/** The numbers a document prints, as a sorted multiset: its fingerprint. */
// What language a sheet is written in, from words a data sheet cannot avoid. The property labels are read in
// English only, so a sheet in another language is either a translation of one already read, or a document nobody
// can transcribe yet; both are better said than discovered as an empty proposal.
const LANGUAGES = [
  ['en', /\b(technical data sheet|density|tensile strength|properties|printing)\b/i],
  ['pl', /\b(karta techniczna|właściwości|wytrzymałość|gęstość|ciężar właściwy)\b/i],
  ['de', /\b(technisches datenblatt|eigenschaften|zugfestigkeit|dichte|druck)\b/i],
  ['fr', /\b(fiche technique|propriétés|résistance|masse volumique|densité)\b/i],
  ['es', /\b(ficha técnica|propiedades|resistencia|densidad)\b/i],
  ['it', /\b(scheda tecnica|proprietà|resistenza|densità)\b/i],
  ['cs', /\b(technický list|vlastnosti|pevnost|hustota)\b/i],
];

export const SAFETY_SHEET = /\b(safety data sheet|material safety data sheet|msds|karta charakterystyki|sicherheitsdatenblatt)\b/i;
// A user guide is not a data sheet either: it tells a reader how to print, and its numbers are settings.
export const NOT_A_DATA_SHEET = /\b(user guide|user manual|handbook|instruction manual|quick start)\b/i;

export function languageOf(text) {
  const words = allLines(text).map((l) => l.text).join(' ').slice(0, 6000);
  const scores = LANGUAGES.map(([code, re]) => [code, (words.match(new RegExp(re.source, 'gi')) ?? []).length]);
  const best = scores.sort((a, b) => b[1] - a[1])[0];
  return best[1] ? best[0] : '';
}

/**
 * A language marker in a document's own link, which is how a publisher usually says which it is. Extrudr names
 * the edition at the end ("durapro-pa12-TDS-it.pdf") and again in the folder ("/tds/tds-it/"), so the marker is
 * looked for in the whole path, at either end of a word: a marker seen only as "-it.pdf" was read as no marker
 * at all, and seven Italian, French and German editions queued as documents of their own.
 */
const LANGUAGE_CODES = 'en|pl|de|fr|es|it|cs|cz|nl|pt|ru|jp|zh';
export const languageFromUrl = (url) => {
  const path = String(url ?? '').split('?')[0];
  const file = path.split('/').pop() ?? '';
  const inFile = new RegExp(`(?:^|[_-])(${LANGUAGE_CODES})(?:[_-]|\\.[a-z0-9]+$)`, 'i').exec(file);
  if (inFile) return inFile[1].toLowerCase();
  const inPath = new RegExp(`/(?:tds|docs?|datasheets?|files?)[_-](${LANGUAGE_CODES})/`, 'i').exec(path);
  return inPath ? inPath[1].toLowerCase() : '';
};

/** The same link with its language markers taken out: two editions of one sheet differ by nothing else. */
export const withoutLanguage = (url) => String(url ?? '').split('?')[0].toLowerCase()
  .replace(new RegExp(`/(?:tds|docs?|datasheets?|files?)[_-](?:${LANGUAGE_CODES})/`, 'i'), '/')
  .replace(new RegExp(`[_-](?:${LANGUAGE_CODES})(\\.[a-z0-9]+)$`, 'i'), '$1');

export function fingerprint(text) {
  const statements = [];
  for (const { text: line } of allLines(text)) {
    // A German or Italian edition writes 0,45 where an English one writes 0.45, and a thousands separator goes the
    // other way round; reading either as a decimal point makes both editions of a sheet state the same numbers.
    // A standard's designation is not a result either, and "ISO 527-2/5A/500 MPa 40" states 40, not 500.
    const joined = joinDigits(line).replace(/(\d),(\d)/g, '$1.$2');
    const before = statements.length;
    for (const m of joined.matchAll(statementRe())) statements.push(`${m[1]}${m[3].replace(/\s/g, '')}`);
    // Where the line puts the unit in a column before the value, read it that way round. Extrudr's four Flex
    // grades state every result as "ISO 527-2/5A/500 MPa 40", so the only numbers a value-first fingerprint could
    // see were the test conditions their sheets share, and four different products arrived as one sheet served
    // four times.
    if (statements.length === before) {
      for (const m of joined.matchAll(unitFirstStatementRe())) statements.push(`${m[2]}${m[1].replace(/\s/g, '')}`);
    }
    // A layout may put the value on a line of its own, above the label that names its unit: SUNLU prints "35±5"
    // and then "(X-Y) Tensile Strength ISO 527/2 50 mm/min MPa". Those lines are the sheet's numbers, and without
    // them the only numbers a fingerprint could see were the conditions every SUNLU sheet repeats.
    if (statements.length === before) {
      const bare = /^\s*[≥≤><]?\s*(\d+(?:\.\d+)?)(?:\s*[±]\s*\d+(?:\.\d+)?|\s*[-–]\s*\d+(?:\.\d+)?)?\s*$/.exec(joined);
      if (bare) statements.push(`${bare[1]}#`);
    }
  }
  return statements.sort();
}

/** How much two fingerprints agree, as a share of the smaller one. */
export function agreement(a, b) {
  if (!a.length || !b.length) return 0;
  const counts = new Map();
  for (const v of a) counts.set(v, (counts.get(v) ?? 0) + 1);
  let shared = 0;
  for (const v of b) { const n = counts.get(v) ?? 0; if (n > 0) { counts.set(v, n - 1); shared++; } }
  return shared / Math.min(a.length, b.length);
}

if (process.argv[1]?.endsWith('extract.mjs')) {
  const rows = readCsv(LEDGER).records.map((r) => r.values);
  const provider = arg('provider'), batch = arg('batch');
  if (!provider && !batch && !flag('all')) { console.error('name what to read: --provider, --batch or --all'); process.exit(2); }
  const wanted = rows.filter((r) => r.sha256 && documentPath(r.sha256, r.registered_source_id)
    && (provider ? r.provider === provider || r.manufacturer === provider : true)
    && (batch ? r.batch === batch : true));
  if (!wanted.length) { console.log('nothing fetched to read'); process.exit(0); }

  // Twin and translation findings are a reading of the numbers, so a reader that has learned to see more of them
  // has to be allowed to say so again. --rescan puts the documents this run covers back to `extracted` and lets
  // the clustering below decide afresh; a document already registered or applied keeps its status.
  if (flag('rescan')) {
    let reset = 0;
    for (const row of wanted) {
      if (!['duplicate-of', 'twin-check'].includes(row.status)) continue;
      row.duplicate_of = '';
      row.duplicate_kind = '';
      row.status = 'extracted';
      row.status_note = '';
      reset++;
    }
    if (reset) console.log(`${reset} earlier twin or translation finding(s) reopened`);
  }

  // A document that has entered the database is never reclassified by a later pass: its values are recorded
  // against it, and a pass that decided it was a copy of something would leave the ledger saying the database
  // holds values from a document it never registered.
  const entered = (r) => ['applied', 'registered'].includes(r.status);

  const prints = new Map();
  let read = 0, failed = 0;
  for (const row of wanted) {
    const path = documentPath(row.sha256, row.registered_source_id);
    try {
      const text = await documentText(readFileSync(path), { sha: row.sha256, refresh: flag('refresh') });
      const print = fingerprint(text);
      row.language = languageOf(text) || languageFromUrl(row.url) || row.language;
      // A safety data sheet is not a technical one: it publishes hazards, not properties, and a batch that
      // registered one would hold a source with no values and no reason for being there.
      const head = allLines(text).slice(0, 12).map((l) => l.text).join(' ');
      const file = (row.url ?? '').split('/').pop() ?? '';
      if (entered(row)) {
        // Already in the database: what it is was settled when it entered.
      } else if (SAFETY_SHEET.test(head) || /msds|sds/i.test(file)) {
        row.status = 'safety-data-sheet';
        row.status_note = 'a safety data sheet: hazards and handling, not properties';
      } else if (NOT_A_DATA_SHEET.test(head) || NOT_A_DATA_SHEET.test(file.replace(/[-_]/g, ' '))) {
        row.status = 'not-a-data-sheet';
        row.status_note = 'a user guide: how to print the material, not what it is';
      }
      prints.set(row.doc_key, { row, print, pages: text.pages.length });
      // A document that could not be read before and reads now says so: the HTML reader arriving is exactly that.
      if (['fetched', 'fetched-page', 'unreadable'].includes(row.status)) {
        // A PDF with no numbers is a scan and optical character recognition is the next step. A web page with
        // none is not: its table is drawn by script, or the page is not a data sheet, and no OCR will help.
        row.status = print.length ? 'extracted' : text.html ? 'unreadable' : 'needs-ocr';
        row.status_note = print.length ? ''
          : text.html ? 'a page with no table of values: its numbers are drawn by script, or it is not a data sheet'
          : `${text.pages.length} page(s) with no readable text: a scan`;
      }
      read++;
    } catch (e) {
      row.status = 'unreadable';
      row.status_note = e.message.slice(0, 120);
      failed++;
    }
    process.stdout.write(`\r${read + failed} of ${wanted.length} read`);
  }
  process.stdout.write('\n');

  // Twins, against everything already read rather than only this run. A document that has entered the database
  // is not one of them: its values are recorded against it, and a later pass that decided it was a copy of
  // something would leave the ledger saying the database holds values from a document it never registered.
  const all = [...prints.values()].filter((p) => p.print.length >= MIN_STATEMENTS && !entered(p.row));
  const byKey = new Map(rows.map((r) => [r.doc_key, r]));
  const named = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Documents that print the same numbers, gathered into clusters rather than paired off. Pairing left a copy
  // pointing at another copy, because whether a document is the one that stays is only known once the whole
  // cluster is known.
  const head = new Map();
  const find = (k) => { while (head.get(k) && head.get(k) !== k) k = head.get(k); return k; };
  const union = (a, b) => { const x = find(a), y = find(b); if (x !== y) head.set(x, y); };
  for (const p of all) head.set(p.row.doc_key, p.row.doc_key);
  for (const r of rows) if (r.duplicate_kind === 'text-twin' && head.has(r.doc_key) && head.has(r.duplicate_of)) union(r.doc_key, r.duplicate_of);
  // Nor is an applied document a translation of anything, for the same reason.
  for (const p of prints.values()) if (entered(p.row)) p.entered = true;
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (agreement(all[i].print, all[j].print) >= 0.9) union(all[i].row.doc_key, all[j].row.doc_key);
    }
  }
  const clusters = new Map();
  for (const p of all) {
    const k = find(p.row.doc_key);
    if (!clusters.has(k)) clusters.set(k, []);
    clusters.get(k).push(p.row);
  }

  // A translation is the same sheet in another language: the same publisher, a language marker in the file name,
  // and numbers that agree. The threshold is lower than for a twin, because extraction reads a two-column page
  // differently in each language and a few numbers pick up the other column: the Polish and English ASA-X GF10
  // agree on 12 of 14 rather than all of them, which is not two products.
  let translations = 0;
  const readable = [...prints.values()];
  for (const a of readable) {
    for (const b of readable) {
      if (a === b || a.row.duplicate_of || b.row.duplicate_of || a.entered) continue;
      if ((a.row.manufacturer || a.row.provider) !== (b.row.manufacturer || b.row.provider)) continue;
      const [la, lb] = [languageFromUrl(a.row.url) || a.row.language, languageFromUrl(b.row.url) || b.row.language];
      if (!la || !lb || la === lb || lb !== 'en') continue;
      // The same sheet, not merely a sheet whose numbers look alike: one link but for the language marker, or one
      // product name. Extrudr's PLA Basic Bundle prints seven numbers, all of them conditions every one of its
      // sheets repeats, and on the numbers alone its German and Italian editions matched a document of another
      // product entirely.
      if (named(a.row.product_raw) !== named(b.row.product_raw)
        && withoutLanguage(a.row.url) !== withoutLanguage(b.row.url)) continue;
      if (agreement(a.print, b.print) < 0.75) continue;
      a.row.duplicate_of = b.row.doc_key;
      a.row.duplicate_kind = 'translation';
      a.row.status = 'duplicate-of';
      a.row.status_note = `the ${la} edition of ${b.row.doc_key}, whose numbers it repeats`;
      translations++;
      break;
    }
  }

  let twins = 0, checks = 0;
  for (const members of clusters.values()) {
    if (members.length < 2) continue;
    // The sheet that stays is the maker's own, and the one the inventory listed as the preferred link; between two
    // of a kind, the first by document key. Everything else in the cluster is that sheet again.
    const rank = (r) => (r.provider_kind === 'manufacturer' ? 0 : 1) * 10 + (r.primary === 'TRUE' ? 0 : 1);
    const keep = [...members].sort((a, b) => rank(a) - rank(b) || a.doc_key.localeCompare(b.doc_key))[0];
    keep.duplicate_of = '';
    keep.duplicate_kind = '';
    if (keep.status === 'duplicate-of') keep.status = 'extracted';
    for (const copy of members) {
      if (copy === keep) continue;
      copy.duplicate_of = keep.doc_key;
      // Two products whose sheets print the same numbers are usually one sheet served twice. Where the names
      // differ they may instead be two products a maker tests once and sells twice, and that is a reading of the
      // sheet, not a rule: it is queued rather than consolidated, so nothing is dropped in silence.
      if (named(copy.product_raw) === named(keep.product_raw)) {
        copy.duplicate_kind = 'text-twin';
        copy.status = 'duplicate-of';
        copy.status_note = `the same sheet as ${keep.doc_key} (${keep.provider})`;
        twins++;
      } else {
        copy.duplicate_kind = 'same-numbers';
        copy.status = 'twin-check';
        copy.status_note = `prints the same numbers as ${keep.doc_key} (${keep.provider}, "${keep.product_raw}"), under another name: one sheet served twice, or two products tested once?`;
        checks++;
      }
    }
  }
  writeFileSync(LEDGER, csvText(HEADER, rows));
  const counts = new Map();
  for (const r of wanted) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  console.log([...counts].sort((a, b) => b[1] - a[1]).map(([s, n]) => `  ${String(n).padStart(4)}  ${s}`).join('\n'));
  if (twins) console.log(`  ${twins} document(s) are a sheet already read, by the numbers they print`);
  if (checks) console.log(`  ${checks} print the same numbers under another product name, queued as twin-check`);
  if (translations) console.log(`  ${translations} are another language's edition of a sheet already read`);
}
