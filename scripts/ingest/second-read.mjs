#!/usr/bin/env node
// The second read R085 asks for: a seeded sample of what a batch applied, for a reader who did not decide it.
//
//   npm run ingest:second-read -- --batch b19                       draw the sample
//   npm run ingest:second-read -- --batch b19 --seed 20260921       another draw, recorded
//   npm run ingest:second-read -- --all                             every batch that has none
//   npm run ingest:second-read -- --batch b19 --tally               read the verdicts back and reopen what disagrees
//
// b01 and b02 were read a second time and it found a source collision (m55 repairs it); b03 onward were not,
// which is some three thousand accepted rows. R085: a separate agent re-reads a seeded sample of each batch
// against the page its Locator names, because a reader who already decided a row cannot see it fresh.
//
// The sample is drawn the way b01's was, and the draw is written down rather than remembered: mulberry32 from a
// named seed, rows grouped by `batch|property`, each group shuffled, then taken round-robin across groups until
// max(30, 5%) of the batch's rows. Round-robin across properties is the point — a plain random sample of a
// batch whose commonest property is a third of its rows spends a third of the reader's attention on it.
//
// `--tally` reads the Verdict column back: `agree`, or anything else as a disagreement with the note beside it.
// One disagreement reopens its document — the ledger row goes back to `held: second-read`, and the finding is
// listed for the batch's README — because a reader who finds one wrong row has not established that the rest
// are right (R085).

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { csvText, readCsv } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';
import { cacheDir } from '../lib/pdf-text.mjs';
import { HEADER } from './inventory.mjs';

const AUDIT = join(projectRoot, 'docs/audits/2026-09-18-v2-import');
const LEDGER = join(AUDIT, 'ledger.csv');
const BATCHES = join(AUDIT, 'batches');
const arg = (name, fallback = null) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback; };
const flag = (name) => process.argv.includes(`--${name}`);

/** mulberry32: a small, seedable generator, so a sample is a draw anyone can make again. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shuffled = (list, random) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};

/**
 * The sample: rows grouped by property, each group shuffled, taken round-robin until `want`. A batch whose
 * commonest property is a third of its rows would otherwise spend a third of a reader's attention on it.
 */
export function sample(rows, { seed, want }) {
  const random = mulberry32(seed);
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.batch}|${r.Property}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const queues = shuffled([...groups.keys()].sort(), random).map((k) => shuffled(groups.get(k), random));
  const out = [];
  for (let round = 0; out.length < want && queues.some((q) => q.length > round); round++) {
    for (const q of queues) { if (out.length >= want) break; if (q[round]) out.push(q[round]); }
  }
  return out;
}

/** Which migration applied a batch, from the note every row it wrote carries. */
const APPLIED_BY = /^Added (\d{4}-\d{2}-\d{2}) \((m\d+[^)]*)\)/;
const batchOf = (note) => APPLIED_BY.exec(String(note ?? ''))?.[2]?.replace(/^m\d+-batch-/, '').replace(/^m\d+-/, '') ?? null;

/** Every applied measurement, with the batch that wrote it. */
function appliedRows() {
  const measurements = readCsv(join(projectRoot, 'data/tables/measurements.csv')).records.map((r) => r.values);
  const sources = new Map(readCsv(join(projectRoot, 'data/tables/sources.csv')).records.map((r) => [r.values.SourceID, r.values]));
  const grades = new Map(readCsv(join(projectRoot, 'data/tables/grades.csv')).records.map((r) => [r.values.GradeID, r.values]));
  return measurements.map((m) => {
    const batch = batchOf(m.Notes);
    if (!batch) return null;
    const source = sources.get(m.SourceID);
    const grade = grades.get(m.GradeID);
    return {
      batch, MeasurementID: m.MeasurementID, Property: m.Property,
      Manufacturer: grade?.Manufacturer ?? '', Product: grade?.['Product name'] ?? '',
      'Raw value': m['Raw value'], 'Normalized value': `${m['Normalized value']} ${m['Normalized unit']}`,
      Direction: m.Direction, 'Standard / load': m['Standard / load'], Locator: m.Locator,
      SourceID: m.SourceID, SHA256: source?.SHA256 ?? '', URL: source?.URL ?? '',
    };
  }).filter(Boolean);
}

/** Where a reader finds the page: the cached document, and the page images where a scan was read optically. */
function pagesOf(sha) {
  if (!sha || /^Not /.test(sha)) return { document: '', images: '' };
  const pdf = cacheDir('sources/by-sha', `${sha}.pdf`);
  const html = cacheDir('sources/by-sha', `${sha}.html`);
  const dir = cacheDir('pages', sha);
  return {
    document: (existsSync(pdf) ? pdf : existsSync(html) ? html : '').replace(`${projectRoot}/`, ''),
    images: existsSync(dir) ? dir.replace(`${projectRoot}/`, '') : '',
  };
}

const FIELDS = ['Verdict', 'Note', 'By', 'MeasurementID', 'batch', 'Manufacturer', 'Product', 'Property', 'Direction',
  'Raw value', 'Normalized value', 'Standard / load', 'Locator', 'SourceID', 'URL', 'Document', 'Page images'];

if (process.argv[1]?.endsWith('second-read.mjs')) {
  const rows = appliedRows();
  // --all means every import batch, which is what R085 asks a second reader for. A hand migration that
  // corrected or added a value is not a batch: its rows were read by a person in the first place, and m13 to
  // m17 name the value each one replaces. Naming one with --batch still draws it.
  const batches = flag('all') ? [...new Set(rows.map((r) => r.batch))].filter((b) => /^b\d/.test(b)).sort() : [arg('batch')].filter(Boolean);
  if (!batches.length) { console.error('name a batch: --batch b19, or --all'); process.exit(2); }
  const seed = Number(arg('seed', '20260921'));

  if (flag('tally')) {
    const ledger = readCsv(LEDGER).records.map((r) => r.values);
    const bySource = new Map();
    for (const l of ledger) if (l.registered_source_id) bySource.set(l.registered_source_id, l);
    let read = 0, disagreed = 0, reopened = 0;
    for (const batch of batches) {
      const path = join(BATCHES, batch, 'second-read-sample.csv');
      if (!existsSync(path)) continue;
      const sampled = readCsv(path).records.map((r) => r.values);
      const answered = sampled.filter((r) => String(r.Verdict ?? '').trim());
      const wrong = answered.filter((r) => !/^agrees?$/i.test(String(r.Verdict).trim()));
      read += answered.length; disagreed += wrong.length;
      for (const w of wrong) {
        const row = bySource.get(w.SourceID);
        if (!row || /^held: second-read/.test(row.status_note ?? '')) continue;
        row.status = 'held';
        row.status_note = `held: second-read — ${w.MeasurementID} ${w.Property}: ${String(w.Note || w.Verdict).slice(0, 260)}`;
        row.updated = new Date().toISOString().slice(0, 10);
        reopened++;
      }
      console.log(`  ${batch}: ${answered.length} of ${sampled.length} read, ${wrong.length} disagree`);
    }
    if (reopened) writeFileSync(LEDGER, csvText(HEADER, ledger));
    console.log(`${read} row(s) read a second time, ${disagreed} disagree, ${reopened} document(s) reopened`);
    process.exit(0);
  }

  for (const batch of batches) {
    const mine = rows.filter((r) => r.batch === batch);
    if (!mine.length) { console.log(`  ${batch}: no applied rows`); continue; }
    const dir = join(BATCHES, batch);
    const path = join(dir, 'second-read-sample.csv');
    if (existsSync(path) && !flag('redraw')) { console.log(`  ${batch}: already drawn (${readCsv(path).records.length} rows); --redraw to draw again`); continue; }
    const want = Math.min(mine.length, Math.max(30, Math.ceil(mine.length * 0.05)));
    const drawn = sample(mine, { seed, want });
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, csvText(FIELDS, drawn.map((r) => {
      const where = pagesOf(r.SHA256);
      return { Verdict: '', Note: '', By: '', ...r, Document: where.document, 'Page images': where.images };
    })));
    console.log(`  ${batch}: ${drawn.length} of ${mine.length} row(s) drawn (seed ${seed}) -> ${path.replace(`${projectRoot}/`, '')}`);
  }
}
