// The record tier in dist/h2c.sqlite (D85): what the sources publish that the decision tier does not hold, kept so
// the team knows it exists. Nothing here decides anything: the build never reads it, the page never ships it, and
// dist/db.json is the same with or without it.
//
// Three tables, all derived when the SQLite file is written and none stored under data/tables, because each is
// computed from files already committed (or cached) and nothing derivable is stored:
//
//   documents      one row per document the import ledger, a proposal or sources.csv names by its digest: the
//                  ledger key, the source the ledger registered it as (none when it was not; for a copy registered
//                  under another document's source, that source), who published it, and where the import left it
//                  (applied, deferred, held, a copy of another).
//   source_facts   one row per distinct line (document, page, text) the import reader read without it becoming
//                  data, from the committed proposals (docs/audits/2026-09-18-v2-import/proposals/**, where a
//                  document re-read by several batches appears once per batch):
//                    kind 'skipped'    a line a batch made no row of, with that batch's reason. Where the document
//                                      is registered it stays skipped even if another batch made a row of it,
//                                      because a row in a held batch never reached the database;
//                    kind 'unapplied'  a line a batch did make a row of (a measurement, a print setting or profile)
//                                      on a document the database cites no source for: deferred for its identity,
//                                      held, a copy. These are the rows the build never used.
//                  A row a reviewer rejected is left out: a rejection can mean the page does not print what was read.
//                  Each fact carries the document's source and that source's active grades where it is registered,
//                  with no ruling: a fact belongs to its document whether or not the document's product is settled.
//   documents_fts  the cached text of each of those documents, one row per page, in an FTS5 index. Built only when
//                  .cache/text is present, and never committed: the text is the makers', and dist/ is gitignored.
//
// Which known property a fact names is a heuristic, and says which one it used (property_by):
//   'reader'  the reader's own reason names a property of data/tables/properties.csv ("the line names HDT and
//             states no value in a unit the database keeps it in", "the sheet publishes no value for Density"), or
//             the line was read as a measurement of it;
//   'name'    otherwise, a property's name from properties.csv, less any parenthesis ("Tensile strength (endpoint
//             unspecified)" is looked for as "Tensile strength"), appears in the line as whole words, any case; the
//             longest name that does wins. A replaced property is never named.
// It finds what the registry calls by its own name and misses a synonym ("heat deflection" is not "HDT").

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { readCsv } from '../../build/src/csv.js';
import { cacheDir, cachedText } from '../lib/pdf-text.mjs';

export const PROPOSALS = 'docs/audits/2026-09-18-v2-import/proposals';
export const LEDGER = 'docs/audits/2026-09-18-v2-import/ledger.csv';

const rows = (path) => readCsv(path).records.map((r) => r.values);
const present = (v) => (v == null || v === '' ? null : String(v));

/** Every proposal file under the folder, as a path relative to it, in a fixed order. */
export function proposalFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.json')) out.push(relative(dir, p).split(sep).join('/'));
    }
  };
  if (existsSync(dir)) walk(dir);
  return out.sort();
}

// The three ways the reader's reason names the property it recognised on a line.
const READER_NAMES = [/^the line names (.+?) and states\b/, /^the sheet publishes no value for (.+?) in this row\b/, /^the sheet states (.+?) (?:in|as) /];
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A function from (text, reason) to [property, basis], or [null, null] when the line names no known property. */
export function propertyNamer(properties) {
  const known = new Set(properties.filter((p) => !present(p['Replaced by']) || p['Replaced by'] === 'Not applicable').map((p) => p.Property));
  const byName = [...known]
    .map((name) => ({ name, words: name.replace(/\s*\([^)]*\)\s*$/, '').trim() }))
    .sort((a, b) => b.words.length - a.words.length || a.name.localeCompare(b.name))
    .map(({ name, words }) => ({ name, re: new RegExp(`(?<![\\p{L}\\p{N}])${escape(words)}(?![\\p{L}\\p{N}])`, 'iu') }));
  return (text, reason) => {
    for (const re of READER_NAMES) {
      const m = re.exec(reason ?? '');
      if (m && known.has(m[1])) return [m[1], 'reader'];
    }
    for (const { name, re } of byName) if (re.test(text)) return [name, 'name'];
    return [null, null];
  };
}

/**
 * The documents and the facts, from the committed files alone (no cache): { documents: Map sha -> row, facts: [] }.
 */
export function readRecordTier(root) {
  const ledger = rows(join(root, LEDGER));
  const sources = rows(join(root, 'data/tables/sources.csv'));
  const grades = rows(join(root, 'data/tables/grades.csv'));
  const nameProperty = propertyNamer(rows(join(root, 'data/tables/properties.csv')));

  // A digest can stand on several ledger rows (the same bytes at two addresses). The one registered as a source
  // speaks for it, then the primary one.
  const ledgerBySha = new Map();
  for (const r of ledger) if (r.sha256) (ledgerBySha.get(r.sha256) ?? ledgerBySha.set(r.sha256, []).get(r.sha256)).push(r);
  const ledgerByKey = new Map(ledger.map((r) => [r.doc_key, r]));
  const pick = (list) => list.find((r) => r.registered_source_id) ?? list.find((r) => r.primary === 'TRUE') ?? list[0];
  const sourceBySha = new Map(sources.filter((s) => /^[0-9a-f]{64}$/.test(s.SHA256 ?? '')).map((s) => [s.SHA256, s]));
  const gradesBySource = new Map();
  for (const g of grades) if (g.Status === 'active') (gradesBySource.get(g.SourceID) ?? gradesBySource.set(g.SourceID, []).get(g.SourceID)).push(g.GradeID);

  const documents = new Map();
  const addDocument = (sha, row, fallback = {}) => {
    if (documents.has(sha)) return;
    const source = sourceBySha.get(sha);
    documents.set(sha, {
      sha256: sha,
      doc_key: present(row?.doc_key),
      sourceid: present(row?.registered_source_id) ?? present(source?.SourceID),
      provider: present(row?.provider) ?? present(fallback.provider) ?? present(source?.Publisher),
      manufacturer: present(row?.manufacturer) ?? present(fallback.manufacturer),
      product: present(row?.product_raw),
      url: present(row?.url) ?? present(fallback.url) ?? present(source?.URL),
      status: present(row?.status),
      status_note: present(row?.status_note),
      duplicate_of: present(row?.duplicate_of),
    });
  };
  for (const [sha, list] of ledgerBySha) addDocument(sha, pick(list));
  for (const sha of sourceBySha.keys()) addDocument(sha, null);

  // Every reading of every line, from every batch that read it.
  const dir = join(root, PROPOSALS);
  const readings = new Map();
  const read = (sha, page, text, reading) => {
    if (!sha || !Number.isInteger(page) || !text) return;
    const key = `${sha}\u0000${page}\u0000${text}`;
    (readings.get(key) ?? readings.set(key, { sha, page, text, list: [] }).get(key)).list.push(reading);
  };
  const files = proposalFiles(dir);
  for (const rel of files) {
    const j = JSON.parse(readFileSync(join(dir, rel), 'utf8'));
    const sha = j.document?.sha256;
    if (!sha) continue;
    // A page captured twice has a new digest each time; the proposal's own key still finds its ledger row, which
    // names the document but registers only the digest it was fetched as.
    const byKey = ledgerByKey.get(j.document.docKey);
    addDocument(sha, ledgerBySha.has(sha) ? pick(ledgerBySha.get(sha)) : byKey && { ...byKey, registered_source_id: null }, j.document);
    const at = { rel, date: j.generated?.date ?? '' };
    for (const s of j.skipped ?? []) read(sha, s.page, s.text, { ...at, row: false, rank: 0, reason: s.reason });
    for (const m of j.measurements ?? []) {
      if (m.review?.status === 'rejected') continue;
      const r = m.row ?? {};
      read(sha, m.evidence?.page, m.evidence?.text, { ...at, row: true, rank: 3, property: r.Property,
        reason: `read as a measurement: ${r.Property} ${r['Raw value']} (review: ${m.review?.status ?? 'none'})` });
    }
    for (const s of j.settings ?? []) {
      read(sha, s.page, s.line, { ...at, row: true, rank: 2, reason: `read as the print setting "${s.label}": ${s.raw}` });
    }
    for (const p of j.profiles ?? []) {
      if (p.review?.status === 'rejected') continue;
      read(sha, p.evidence?.page, p.evidence?.text, { ...at, row: true, rank: 1,
        reason: `read as a print profile: ${p.row?.Locator ?? 'no locator'} (review: ${p.review?.status ?? 'none'})` });
    }
  }

  // The reading kept is the latest batch's (its date, then its path), and within one file a measurement before a
  // setting before a profile. A line some batch made a row of is 'unapplied' where the document is not registered,
  // and left to the database where it is, unless another batch skipped it: then it stays a skipped fact, which is
  // what that batch saw.
  const later = (a, b) => (a.date !== b.date ? a.date > b.date : a.rel !== b.rel ? a.rel > b.rel : a.rank > b.rank);
  const latest = (list) => list.reduce((best, r) => (later(r, best) ? r : best));
  const facts = [];
  for (const { sha, page, text, list } of readings.values()) {
    const doc = documents.get(sha);
    const made = list.filter((r) => r.row);
    const skipped = list.filter((r) => !r.row);
    let kind, reading;
    if (made.length && !doc.sourceid) [kind, reading] = ['unapplied', latest(made)];
    else if (skipped.length) [kind, reading] = ['skipped', latest(skipped)];
    else continue;
    const [property, propertyBy] = reading.property ? [reading.property, 'reader'] : nameProperty(text, reading.reason);
    const gradeIds = doc.sourceid ? (gradesBySource.get(doc.sourceid) ?? []).slice().sort() : [];
    facts.push({
      kind, sha256: sha, doc_key: doc.doc_key, sourceid: doc.sourceid, gradeids: gradeIds.length ? gradeIds.join(',') : null,
      page, text, reason: reading.reason, property, property_by: propertyBy,
      batches: new Set(list.map((r) => r.rel)).size, proposal: reading.rel,
    });
  }
  facts.sort((a, b) => (a.sha256 < b.sha256 ? -1 : a.sha256 > b.sha256 ? 1 : a.page - b.page || (a.text < b.text ? -1 : a.text > b.text ? 1 : 0)));
  return { documents, facts, proposals: files.length };
}

/**
 * Write documents, source_facts and (when the text cache is present) documents_fts into an open database.
 * Returns what it wrote, for the command line and the tests.
 */
export function writeRecordTier(db, root) {
  const started = Date.now();
  const { documents, facts, proposals } = readRecordTier(root);

  // The cached text, read the way the import pipeline reads it, from its cache (a reading by another extractor
  // version is not used).
  const cached = existsSync(cacheDir('text'));
  const texts = new Map();
  if (cached) {
    for (const sha of [...documents.keys()].sort()) {
      const t = cachedText(sha);
      if (t) texts.set(sha, t);
    }
  }

  db.exec(`CREATE TABLE documents (sha256 TEXT PRIMARY KEY, doc_key TEXT, sourceid TEXT, provider TEXT, manufacturer TEXT,
    product TEXT, url TEXT, status TEXT, status_note TEXT, duplicate_of TEXT, text_pages INTEGER, optical INTEGER)`);
  const insDoc = db.prepare('INSERT INTO documents VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  db.exec('BEGIN');
  for (const d of [...documents.values()].sort((a, b) => (a.sha256 < b.sha256 ? -1 : 1))) {
    const t = texts.get(d.sha256);
    insDoc.run(d.sha256, d.doc_key, d.sourceid, d.provider, d.manufacturer, d.product, d.url, d.status, d.status_note,
      d.duplicate_of, t ? t.pages.length : null, t ? (t.ocr ? 1 : 0) : null);
  }
  db.exec('COMMIT');
  db.exec('CREATE INDEX ix_documents_sourceid ON documents (sourceid)');

  db.exec(`CREATE TABLE source_facts (fact_id INTEGER PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('skipped', 'unapplied')),
    sha256 TEXT NOT NULL REFERENCES documents (sha256), doc_key TEXT, sourceid TEXT, gradeids TEXT,
    page INTEGER NOT NULL, text TEXT NOT NULL, reason TEXT NOT NULL, property TEXT, property_by TEXT,
    batches INTEGER NOT NULL, proposal TEXT NOT NULL, UNIQUE (sha256, page, text))`);
  const insFact = db.prepare('INSERT INTO source_facts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
  db.exec('BEGIN');
  facts.forEach((f, i) => insFact.run(i + 1, f.kind, f.sha256, f.doc_key, f.sourceid, f.gradeids, f.page, f.text, f.reason,
    f.property, f.property_by, f.batches, f.proposal));
  db.exec('COMMIT');
  for (const column of ['sourceid', 'property', 'doc_key']) db.exec(`CREATE INDEX ix_source_facts_${column} ON source_facts (${column})`);

  let fulltext = null;
  if (cached) {
    // Words as printed: unicode61 folds case and accents and stems nothing, so 'anneal*' is how to ask for every form.
    db.exec(`CREATE VIRTUAL TABLE documents_fts USING fts5(text, sha256 UNINDEXED, doc_key UNINDEXED, sourceid UNINDEXED,
      page UNINDEXED, tokenize = 'unicode61 remove_diacritics 2')`);
    const insText = db.prepare('INSERT INTO documents_fts (text, sha256, doc_key, sourceid, page) VALUES (?,?,?,?,?)');
    let pages = 0;
    db.exec('BEGIN');
    for (const [sha, t] of texts) {
      const d = documents.get(sha);
      for (const p of t.pages) {
        insText.run(p.lines.map((l) => l.text).join('\n'), sha, d.doc_key, d.sourceid, p.page);
        pages++;
      }
    }
    db.exec('COMMIT');
    db.exec("INSERT INTO documents_fts (documents_fts) VALUES ('optimize')");
    fulltext = { documents: texts.size, pages };
  }

  const kinds = {};
  for (const f of facts) kinds[f.kind] = (kinds[f.kind] ?? 0) + 1;
  return {
    proposals, documents: documents.size, facts: facts.length, kinds,
    factDocuments: new Set(facts.map((f) => f.sha256)).size,
    factSources: new Set(facts.map((f) => f.sourceid).filter(Boolean)).size,
    factGrades: new Set(facts.flatMap((f) => (f.gradeids ? f.gradeids.split(',') : []))).size,
    fulltext, ms: Date.now() - started,
  };
}
