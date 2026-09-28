#!/usr/bin/env node
// Migration m206 (2026-09-27): makers' know-how from their own sites, for the products whose sheets said nothing
// (GOALS step 5, C10; the research package of 2026-09-26, P1-KNOWHOW).
//
// Lane 3 (m140) read every cached document for what makers say beyond the numbers and left 198 products "sheet silent,
// maker site not yet searched" (docs/audits/2026-09-25-re-center/KNOW-HOW-WORKLIST.md). The research package of
// 2026-09-26 searched those makers' own sites product by product, saved each page it read with its digest, and quoted
// one statement per product, which a second agent re-read on the saved page. The pages were staged into the pipeline
// from those copies (ingest:witness --from, the ledger's witness rows), and this records, from them:
//
//   m206-makers-sites-know-how-sources.csv  the maker pages, registered as sources of the products they speak for
//   m206-makers-sites-know-how.csv          one statement per product: its topic and the maker's words, with the
//                                            research finding it came from
//   m206-makers-sites-know-how-reads.csv    each page as a read of the maker's site (Scope "maker site"), dated
//
// Left out: the research's statements that wait on a ruling (a renamed product line, a 60D sheet on a 90A product,
// pages that name another product) and those it handed to the makers, and one it found that m140 holds already (Q00773).
// The statements are the record tier (D85): the maker's words, shown in the panel, never a verdict.
//
// A statement is the page's own characters, spaces normalised and full-width punctuation written in ASCII, as m140
// did. Every statement is checked on its page before anything is written: on a web page, its characters stand in the
// page's visible text (the bytes, hash-checked, without scripts, styles and markup; the cached text keeps a page's
// tables and misses its prose); on a PDF, in the cached text of the page its Locator names. The reviewer is an AI agent
// (claude-opus-5.5, agent reviewer), not a person. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m206-makers-sites-know-how.mjs

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { openTables } from '../data/table-io.mjs';
import { cacheDir, cachedText, sha256 } from '../lib/pdf-text.mjs';

const migration = 'm206-makers-sites-know-how';
const here = dirname(fileURLToPath(import.meta.url));
const pinned = (suffix) => readCsv(join(here, `${migration}${suffix}.csv`)).records.map((r) => r.values);
const statements = pinned('');
const reads = pinned('-reads');
const pages = pinned('-sources');
const DOMAIN = "Makers' know-how";
const READ_BY = 'Codex research agents (AI), research package of 2026-09-26; each statement re-checked on its staged page by Claude Opus 5.5 (agent), m206';
const NA = 'Not applicable';

const t = openTables();
let changed = 0;
const tally = {};
const count = (what) => { tally[what] = (tally[what] ?? 0) + 1; changed++; };

// --------------------------------------------------------------------------- the makers' pages, as sources
const kind = new Map();
for (const s of pages) {
  const pdf = cacheDir('sources/by-sha', `${s.SHA256}.pdf`), html = cacheDir('sources/by-sha', `${s.SHA256}.html`);
  const path = existsSync(html) ? html : existsSync(pdf) ? pdf : null;
  if (!path || sha256(readFileSync(path)) !== s.SHA256) throw new Error(`${migration}: ${s.SourceID} is not cached at ${s.SHA256}; stage it first (npm run ingest:witness -- --from ...)`);
  kind.set(s.SourceID, { path, html: path === html });
  const existing = t.find('sources', s.SourceID);
  if (existing) {
    if (existing.SHA256 !== s.SHA256) throw new Error(`${migration}: ${s.SourceID} is registered with digest ${existing.SHA256}, pinned ${s.SHA256}; the data moved`);
    continue;
  }
  if (!cachedText(s.SHA256)) throw new Error(`${migration}: ${s.SourceID} has no cached text for ${s.SHA256}; stage it first`);
  t.append('sources', s);
  count('maker pages registered');
}

// ----------------------------------------------------------------------------------------- the page says it
const ascii = (s) => String(s).replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/、/g, ',').replace(/。/g, '.');
const squeeze = (s) => ascii(s).replace(/[’‘]/g, "'").replace(/[\s ]+/g, '');
const ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', trade: '™', reg: '®', deg: '°', hellip: '…' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITY[e.toLowerCase()] ?? m));
/** What a web page shows: its markup, scripts and styles taken away. */
const visible = (html) => decode(html.replace(/<(script|style|template|svg)\b[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' '));
const pageText = new Map();
function onPage(sourceId, page, text) {
  const key = `${sourceId}|${page}`;
  if (!pageText.has(key)) {
    const k = kind.get(sourceId);
    if (k?.html) pageText.set(key, squeeze(visible(readFileSync(k.path, 'utf8'))));
    else {
      const cached = cachedText(t.get('sources', sourceId).SHA256);
      const p = cached?.pages.find((x) => x.page === Number(page));
      if (!p) throw new Error(`${migration}: ${sourceId} has no page ${page} in its cached text`);
      pageText.set(key, squeeze(p.lines.map((l) => (typeof l === 'string' ? l : l.text)).join(' ')));
    }
  }
  return pageText.get(key).includes(squeeze(text));
}

for (const s of statements) {
  const g = t.get('grades', s.GradeID);
  if (g.Status !== 'active') throw new Error(`${migration}: ${s.GradeID} is ${g.Status}`);
  if (!String(t.get('sources', s.SourceID)['Applicable grades']).split(/;\s*/).includes(s.GradeID)) throw new Error(`${migration}: ${s.SourceID} does not name ${s.GradeID}`);
  if (!onPage(s.SourceID, s.Page, s.Finding)) throw new Error(`${migration}: ${s.FindingID} "${s.Finding}" is not printed on p. ${s.Page} of ${s.SourceID}`);
}

// ------------------------------------------------------------------------------------------- the statements
const recorded = new Set(t.rows('evidence').filter((e) => e.Domain === DOMAIN).map((e) => `${e.GradeID}|${e.SourceID}|${e.Topic}|${e.Finding}`));
for (const s of statements) {
  const finding = ascii(s.Finding).replace(/\s+/g, ' ').trim();
  if (recorded.has(`${s.GradeID}|${s.SourceID}|${s.Topic}|${finding}`)) continue;
  t.append('evidence', {
    EvidenceID: t.nextId('evidence'), MaterialID: t.get('grades', s.GradeID).MaterialID, GradeID: s.GradeID,
    Domain: DOMAIN, Topic: s.Topic, Finding: finding, 'Exposure / conditions': NA,
    'Rating 1–5': 'Not published', RubricID: NA, 'Evidence type': 'Manufacturer statement', SourceID: s.SourceID, Locator: `p. ${s.Page}`,
  });
  count('statements');
}

// ------------------------------------------------------------------------------ which sites were searched, when
const read = new Set(t.rows('know_how_reads').map((r) => `${r.SourceID}|${r.Scope}`));
for (const r of reads) {
  if (!t.find('sources', r.SourceID)) throw new Error(`${migration}: ${r.SourceID} is not a source`);
  if (read.has(`${r.SourceID}|maker site`)) continue;
  t.append('know_how_reads', { SourceID: r.SourceID, Scope: 'maker site', 'Read on': r['Read on'], 'Read by': READ_BY });
  count('maker sites searched');
}

if (changed) t.save();
for (const [k, v] of Object.entries(tally)) console.log(`  ${v}\t${k}`);
console.log(`${migration}: ${changed} row(s) written`);
