#!/usr/bin/env node
// Migration m140 (2026-09-25): makers' know-how, from the documents already cached (re-center phase 6, lane 3; GOALS
// step 5, scorecard C10).
//
// Makers write more about a product than its numbers: what it is good for, what it does well and what to watch for,
// how it warps, how precise and smooth it prints, how it bonds between layers, how it takes up moisture, whether it
// wears a nozzle, how it smells, how its supports come off, and advice for printing it. This records those statements
// in evidence.csv in the maker's own words (Domain "Makers' know-how", a know-how topic), from every cached document
// of every active product, and the makers' own product pages already fetched as witnesses, labelled by their Source
// class as the maker's product page. The build keeps them out of everything that screens (build/src/know-how.js) and
// the product panel shows them. They are the record tier (D85): no ruling, no per-row review, a sampled read.
//
// How they were found: every page of each document was taken apart into sentences and table rows (the PDF text in
// reading order, rebuilt from the bytes, and the cached lines), a broad filter kept the candidates that could be
// know-how, and agents (Claude Opus 5.5) read the candidates maker by maker and kept the statements, verbatim or cut to
// an exact part; the rest of the lane's report (docs/audits/2026-09-25-re-center/RESPONSE.md, lane 3) says what was
// left out and why. No person has reviewed them.
//
// Pinned beside this file, so the history does not depend on a later reader:
//   m140-makers-know-how.csv          the statements: product, source, page, topic, the maker's words
//   m140-makers-know-how-reads.csv    the sources read for know-how, and when: the one fact the build cannot derive
//   m140-makers-know-how-sources.csv  the makers' product pages registered as sources, with their digests
//
// A statement is the page's own characters: spaces are normalised and full-width punctuation is written in ASCII (the
// lint's TEXT-FULLWIDTH, as m136 did), and nothing else changes. Every statement is checked on the page its Locator
// names before anything is written: its characters, spaces aside, stand in that page's text in reading order, or it
// stands in one line of the page as laid out. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m140-makers-know-how.mjs

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { openTables } from '../data/table-io.mjs';
import { cachedText } from '../lib/pdf-text.mjs';

const migration = 'm140-makers-know-how';
const here = dirname(fileURLToPath(import.meta.url));
const pinned = (suffix) => readCsv(join(here, `${migration}${suffix}.csv`)).records.map((r) => r.values);
const statements = pinned('');
const reads = pinned('-reads');
const pages = pinned('-sources');
const DOMAIN = "Makers' know-how";
const READ_BY = 'Claude Opus 5.5 (agent), m140';
const NA = 'Not applicable';

const t = openTables();
let changed = 0;
const tally = {};
const count = (what) => { tally[what] = (tally[what] ?? 0) + 1; changed++; };

// --------------------------------------------------------------------------- the makers' product pages, as sources
for (const s of pages) {
  const existing = t.rows('sources').find((x) => x.SourceID === s.SourceID);
  if (existing) {
    if (existing.SHA256 !== s.SHA256) throw new Error(`${migration}: ${s.SourceID} is registered with digest ${existing.SHA256}, pinned ${s.SHA256}; the data moved`);
    continue;
  }
  if (!cachedText(s.SHA256)) throw new Error(`${migration}: ${s.SourceID} has no cached text for ${s.SHA256}; fetch it first (npm run ingest:witness)`);
  t.append('sources', s);
  count('product pages registered');
}

// ----------------------------------------------------------------------------------------- the page says it
// Full-width punctuation is written in its ASCII form (TEXT-FULLWIDTH), as m136 did; spaces aside, that is the only
// difference between a statement and the page it stands on.
const ascii = (s) => String(s).replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/、/g, ',').replace(/。/g, '.');
const pageText = new Map();
function onPage(sourceId, page, text) {
  const key = `${sourceId}|${page}`;
  if (!pageText.has(key)) {
    const s = t.get('sources', sourceId);
    const cached = cachedText(s.SHA256);
    if (!cached) throw new Error(`${migration}: ${sourceId} has no cached text for ${s.SHA256}; fetch and extract it first`);
    const p = cached.pages.find((x) => x.page === Number(page));
    if (!p) throw new Error(`${migration}: ${sourceId} has no page ${page}`);
    pageText.set(key, { squeezed: ascii(p.squeezed), lines: p.lines.map((l) => ascii(typeof l === 'string' ? l : l.text).replace(/\s+/g, ' ').trim()) });
  }
  const p = pageText.get(key);
  return p.squeezed.includes(text.replace(/\s+/g, '')) || p.lines.some((l) => l.includes(text));
}

for (const s of statements) {
  const g = t.get('grades', s.GradeID);
  if (g.Status !== 'active') throw new Error(`${migration}: ${s.GradeID} is ${g.Status}`);
  if (!onPage(s.SourceID, s.Page, s.Finding)) throw new Error(`${migration}: "${s.Finding}" is not printed on p. ${s.Page} of ${s.SourceID}`);
}

// ------------------------------------------------------------------------------------------- the statements
const recorded = new Set(t.rows('evidence').filter((e) => e.Domain === DOMAIN).map((e) => `${e.GradeID}|${e.SourceID}|${e.Topic}|${e.Finding}`));
for (const s of statements) {
  if (recorded.has(`${s.GradeID}|${s.SourceID}|${s.Topic}|${s.Finding}`)) continue;
  t.append('evidence', {
    EvidenceID: t.nextId('evidence'), MaterialID: t.get('grades', s.GradeID).MaterialID, GradeID: s.GradeID,
    Domain: DOMAIN, Topic: s.Topic, Finding: s.Finding, 'Exposure / conditions': NA,
    'Rating 1–5': 'Not published', RubricID: NA, 'Evidence type': 'Manufacturer statement', SourceID: s.SourceID, Locator: `p. ${s.Page}`,
  });
  count('statements');
}

// ------------------------------------------------------------------------------ which sources were read, when
const read = new Set(t.rows('know_how_reads').map((r) => `${r.SourceID}|${r.Scope}`));
for (const r of reads) {
  if (!t.rows('sources').some((s) => s.SourceID === r.SourceID)) throw new Error(`${migration}: ${r.SourceID} is not a source`);
  if (read.has(`${r.SourceID}|document`)) continue;
  t.append('know_how_reads', { SourceID: r.SourceID, Scope: 'document', 'Read on': r['Read on'], 'Read by': READ_BY });
  count('sources read');
}

if (changed) t.save();
for (const [k, v] of Object.entries(tally)) console.log(`  ${v}\t${k}`);
console.log(`${migration}: ${changed} row(s) written`);
