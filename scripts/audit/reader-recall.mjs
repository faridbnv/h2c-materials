#!/usr/bin/env node
// What reading each cached sheet in reading order (scripts/lib/pdf-layout.mjs) adds to what the sheet reader finds, and
// how much of it the tables already hold. For every source with a SHA-256 whose text is cached, the reader runs with the
// layout off and on; the report counts, per print setting and per property, the items each finds, the held cells
// (profiles.csv, measurements.csv rows citing the source) each reading matches, and the candidates no table holds.
// Not a gate: it measures, so that turning the layout on is a decision made on numbers. It reads the text cache
// (.cache/text), which a contributor's checkout has and CI does not.
//
//   npm run audit:reader-recall                  writes docs/audits/2026-10-04-reader-round/reader-recall/
//   npm run audit:reader-recall -- --out <dir>   writes elsewhere
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, csvText } from '../../build/src/csv.js';
import { cacheDir, cachedText } from '../lib/pdf-text.mjs';
import { readSheet } from '../ingest/propose.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const OUT = resolve(outAt >= 0 ? args[outAt + 1] : join(root, 'docs/audits/2026-10-04-reader-round/reader-recall'));
if (!existsSync(cacheDir('text'))) { console.log('audit:reader-recall skipped: no text cache (.cache/text) in this checkout'); process.exit(0); }

const table = (name) => readCsv(join(root, 'data/tables', `${name}.csv`)).records.map((r) => r.values);
const registry = new Map(table('properties').map((p) => [p.Property, p]));
const sources = table('sources').filter((s) => /^[0-9a-f]{64}$/.test(s.SHA256 ?? ''));
const profilesBySource = new Map(), measurementsBySource = new Map();
const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
for (const p of table('profiles')) push(profilesBySource, p.SourceID, p);
for (const m of table('measurements')) if (/^Published value/.test(m['Data status'])) push(measurementsBySource, m.SourceID, m);

// The profile cells a setting field is held in.
const COLUMNS = { nozzle: ['Nozzle °C'], bed: ['Bed °C'], chamber: ['Chamber °C'], enclosure: ['Enclosure'], drying: ['Drying'], 'nozzle-material': ['Abrasion / clogging', 'Nozzle material'] };
const NOT_HELD = /^(not published|not applicable|unknown|)$/i;
const numbers = (v) => (String(v).replace(/\s+/g, ' ').match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(',', '.')));
const words = (v) => new Set((String(v).toLowerCase().match(/[a-z]{4,}/g) ?? []));
const squash = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, '');

/** Whether a held cell states what the reader read: every number it read, or (no numbers) a word of it. */
function states(held, raw) {
  const want = numbers(raw);
  if (want.length) { const have = numbers(held); return want.every((n) => have.includes(n)); }
  const w = words(raw), h = words(held);
  return [...w].some((x) => h.has(x)) || squash(held).includes(squash(raw).slice(0, 12));
}
const heldCells = (sourceId, field) => (profilesBySource.get(sourceId) ?? []).flatMap((p) => (COLUMNS[field] ?? []).map((c) => p[c]).filter((v) => v != null && !NOT_HELD.test(v)));

const same = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
const normalized = (v) => { const n = Number(v.read?.rawNumber) * Number(v.target?.factor ?? 1); return Number.isFinite(n) ? n : null; };
/** The measurement rows of the source a value matches: the same property, and the same normalized value. */
function heldValue(sourceId, v) {
  const n = normalized(v); if (n == null) return null;
  const rows = measurementsBySource.get(sourceId) ?? [];
  const byValue = rows.filter((m) => same(Number(m['Normalized value']), n) && (!v.target?.unit || m['Normalized unit'] === v.target.unit));
  return { property: byValue.some((m) => m.Property === v.property), value: byValue.length > 0 };
}

const bySetting = new Map(), byProperty = new Map();
const count = (m, k) => { if (!m.has(k)) m.set(k, { off: 0, on: 0, viaLayout: 0, heldOff: 0, heldOn: 0, recovered: 0, candidates: 0, candidatesLayout: 0 }); return m.get(k); };
const candidates = [];
const sheetsChanged = new Set();
let sheets = 0, failed = 0, noHeld = 0;
const memo = new Map();

for (const s of sources) {
  const text = cachedText(s.SHA256);
  if (!text) continue;
  sheets++;
  if (!memo.has(s.SHA256)) {
    try { memo.set(s.SHA256, { off: readSheet(text, registry, { layout: false }), on: readSheet(text, registry, { layout: true }) }); }
    catch { memo.set(s.SHA256, null); }
  }
  const read = memo.get(s.SHA256);
  if (!read) { failed++; continue; }
  const { off, on } = read;
  if (on.settings.some((x) => x.viaLayout) || on.values.some((x) => x.viaLayout)) sheetsChanged.add(s.SourceID);

  // ---- print settings
  const fields = new Set([...off.settings, ...on.settings].map((x) => x.field));
  for (const field of fields) {
    const c = count(bySetting, field);
    const offItems = off.settings.filter((x) => x.field === field), onItems = on.settings.filter((x) => x.field === field);
    c.off += offItems.length; c.on += onItems.length; c.viaLayout += onItems.filter((x) => x.viaLayout).length;
    const held = heldCells(s.SourceID, field);
    // A held cell is recovered when the layout reading states it and the plain reading does not.
    for (const cell of held) {
      const hit = (items) => items.some((x) => states(cell, x.raw));
      if (hit(offItems)) c.heldOff++;
      if (hit(onItems)) c.heldOn++;
      if (hit(onItems) && !hit(offItems)) c.recovered++;
    }
    for (const x of onItems) {
      if (held.some((cell) => states(cell, x.raw))) continue;
      c.candidates++;
      if (x.viaLayout) c.candidatesLayout++;
      candidates.push({ source_id: s.SourceID, sha: s.SHA256, page: x.page, kind: 'setting', 'field/property': field, 'raw value': x.raw, 'evidence line': String(x.line ?? '').replace(/\s+/g, ' ').slice(0, 200), via_layout: Boolean(x.viaLayout), held: held.length ? 'other cell' : (profilesBySource.has(s.SourceID) ? 'profile silent' : 'no profile') });
    }
  }

  // ---- property values
  const properties = new Set([...off.values, ...on.values].map((x) => x.property));
  for (const property of properties) {
    const c = count(byProperty, property);
    const offItems = off.values.filter((x) => x.property === property), onItems = on.values.filter((x) => x.property === property);
    c.off += offItems.length; c.on += onItems.length; c.viaLayout += onItems.filter((x) => x.viaLayout).length;
    const heldOf = (items) => items.filter((x) => heldValue(s.SourceID, x)?.value).length;
    c.heldOff += heldOf(offItems); c.heldOn += heldOf(onItems);
    c.recovered += heldOf(onItems.filter((x) => x.viaLayout));
    for (const x of onItems) {
      if (heldValue(s.SourceID, x)?.value) continue;
      c.candidates++;
      if (x.viaLayout) c.candidatesLayout++;
      candidates.push({ source_id: s.SourceID, sha: s.SHA256, page: x.page, kind: 'value', 'field/property': property, 'raw value': x.read?.raw ?? '', 'evidence line': String(x.line ?? '').replace(/\s+/g, ' ').slice(0, 200), via_layout: Boolean(x.viaLayout), held: (measurementsBySource.get(s.SourceID) ?? []).length ? 'source has other rows' : 'no rows' });
    }
  }
}

const sum = (m, k) => [...m.values()].reduce((a, c) => a + c[k], 0);
const rowOf = (name, c) => `| ${name} | ${c.off} | ${c.on} | ${c.viaLayout} | ${c.heldOff} | ${c.heldOn} | ${c.recovered} | ${c.candidatesLayout} |`;
const tableOf = (title, m, sorter) => [
  `| ${title} | items off | items on | only via layout | held matched off | held matched on | held recovered | new candidates via layout |`,
  '|---|---:|---:|---:|---:|---:|---:|---:|',
  ...[...m].sort(sorter).map(([k, c]) => rowOf(k, c)),
  rowOf('**all**', Object.fromEntries(['off', 'on', 'viaLayout', 'heldOff', 'heldOn', 'recovered', 'candidatesLayout'].map((k) => [k, sum(m, k)]))),
].join('\n');
const layoutFirst = ([a, x], [b, y]) => y.viaLayout - x.viaLayout || a.localeCompare(b);
const newOnly = candidates.filter((c) => c.via_layout);
const summary = `# Reader recall, layout off against on

Generated by \`npm run audit:reader-recall\`; not a gate. ${sheets} sheet(s) with cached text read (${failed} failed), ${sheetsChanged.size} of them gain an item with the layout on.
"Held" is a cell of profiles.csv (settings) or a row of measurements.csv (values) that cites the source. A held cell is
*recovered* when the layout reading states it and the plain reading does not. A *new candidate* is an item only the
layout reading finds that no cell or row of the source holds; each is in candidates.csv and needs a reader before it
becomes data.

## Print settings

${tableOf('field', bySetting, layoutFirst)}

## Property values

${tableOf('property', byProperty, layoutFirst).split('\n').slice(0, 40).join('\n')}

## Candidates

${candidates.length} item(s) read from a source that no table holds (${newOnly.length} found only with the layout on) are listed in candidates.csv.
`;
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'summary.md'), summary);
const columns = ['source_id', 'sha', 'page', 'kind', 'field/property', 'raw value', 'evidence line', 'via_layout', 'held'];
writeFileSync(join(OUT, 'candidates.csv'), csvText(columns, candidates.sort((a, b) => Number(b.via_layout) - Number(a.via_layout) || a.source_id.localeCompare(b.source_id) || a.page - b.page)));
console.log(summary);
console.log(`-> ${OUT}`);
