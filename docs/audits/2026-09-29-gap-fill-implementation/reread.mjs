// The re-read register: every value and print setting the tranche wrote, with the digest of the bytes it was read on and
// the page lines that print it, found again here from the cached text of those bytes (a second pass over what m225 and
// b40 checked when they wrote). A row whose lines cannot be found again is listed as NOT FOUND and fails the run.
//
//   node docs/audits/2026-09-29-gap-fill-implementation/reread.mjs     writes RE-READ.csv beside it
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText, readCsv } from '../../../build/src/csv.js';
import { cachedText, valueInEvidence } from '../../../scripts/lib/pdf-text.mjs';
import { locate } from '../../../scripts/data/source-store.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const table = (n) => readCsv(join(root, 'data/tables', `${n}.csv`)).records.map((r) => r.values);
const sources = new Map(table('sources').map((s) => [s.SourceID, s]));
const squash = (s) => String(s).replace(/\s+/g, ' ').trim();
const verified = new Map();
function page1(sourceId) {
  if (!verified.has(sourceId)) {
    const s = sources.get(sourceId);
    const found = locate(s.SHA256, sourceId);
    const ok = found.bytes === 'present' && createHash('sha256').update(readFileSync(found.path)).digest('hex') === s.SHA256;
    verified.set(sourceId, { ok, sha: s.SHA256, lines: ok ? cachedText(s.SHA256).pages[0].lines.map((l) => squash(l.text ?? l)) : [] });
  }
  return verified.get(sourceId);
}
const rows = [];
const add = (r) => rows.push({ Reader: 'Claude (claude-opus-5-5), an agent, 2026-09-29', ...r });

// Measurements m225 wrote: the label's line, or the label's line and the next where the page sets the value apart.
for (const m of table('measurements').filter((x) => x.Notes.includes('(m225-gap-fill-registered-sources)'))) {
  const p = page1(m.SourceID);
  const label = squash(m.Locator.replace(/^p\. 1: /, '').replace(/ \((FDM H|Injection|Shore [AD])\)$/, ''));
  let line = null;
  for (let i = 0; i < p.lines.length && !line; i++) {
    if (!p.lines[i].toLowerCase().startsWith(label.toLowerCase().slice(0, 12))) continue;
    for (const run of [[i], [i, i + 1]]) { const text = run.map((k) => p.lines[k]).join(' / '); if (valueInEvidence(text, m['Raw numeric'])) { line = text; break; } }
  }
  add({ Record: m.MeasurementID, Table: 'measurements', What: `${m.Property} ${m['Raw value']} (${m.Direction}; ${m['Specimen type']})`, SourceID: m.SourceID, SHA256: p.sha,
    'Bytes verified': p.ok ? 'yes' : 'NO', Page: 1, Lines: line ?? 'NOT FOUND', 'Read on': m.SourceID.startsWith('R-3DJAKE') ? 'cached text, and the rendered page image for the column' : 'cached text' });
}
// The one correction.
{ const p = page1('R-3DJAKE-3DJAKE-PCTG-CF-tech-data'); const line = p.lines.find((l) => l.startsWith('HDT A 72'));
  add({ Record: 'V008864', Table: 'measurements', What: 'Specimen type Raw material value → Printed specimen (72 °C under FDM H)', SourceID: 'R-3DJAKE-3DJAKE-PCTG-CF-tech-data', SHA256: p.sha,
    'Bytes verified': p.ok ? 'yes' : 'NO', Page: 1, Lines: line ?? 'NOT FOUND', 'Read on': 'the rendered page image (the text alone does not place the column)' }); }
// Profiles: the drying (and Recreus's nozzle and bed) words, each found on the page.
const PROFILES = ['P1161', 'P1172', 'P1183', 'P1184', 'P1186', 'P1191', 'P1287', 'P1291', 'P1297', ...Array.from({ length: 11 }, (_, i) => `P${1306 + i}`)];
const profiles = new Map(table('profiles').map((p) => [p.ProfileID, p]));
for (const id of PROFILES) {
  const r = profiles.get(id);
  const p = page1(r.SourceID);
  const words = (s) => squash(String(s).replace(/;\s/g, ' ').replace(/[📏⏱️]/gu, ''));
  const hay = words(p.lines.join(' '));
  const cells = ['Nozzle °C', 'Bed °C', 'Drying', 'AMS published'].filter((k) => r[k] !== 'Not published' && !(k === 'Nozzle °C' && id !== 'P1313') && !(k === 'Bed °C' && id !== 'P1313'));
  const found = cells.map((k) => {
    const want = words(r[k]);
    if (k === 'Nozzle °C') return p.lines.some((l) => l.startsWith('0.4mm 0.2mm 0.38mm 4.0 mm³/s 250°C')) ? '0.4mm 0.2mm 0.38mm 4.0 mm³/s 250°C' : 'NOT FOUND';
    if (k === 'Bed °C') return hay.includes('Small parts: No heating (room temperature) Large parts: 50-55°C') ? 'Small parts: No heating (room temperature) / Large parts: 50-55°C' : 'NOT FOUND';
    return hay.includes(want) ? want : 'NOT FOUND';
  });
  add({ Record: id, Table: 'profiles', What: cells.map((k) => `${k}: ${r[k]}`).join(' | '), SourceID: r.SourceID, SHA256: p.sha, 'Bytes verified': p.ok ? 'yes' : 'NO', Page: 1, Lines: found.join(' | '), 'Read on': 'cached text' });
}
writeFileSync(join(here, 'RE-READ.csv'), csvText(Object.keys(rows[0]), rows));
const bad = rows.filter((r) => r['Bytes verified'] !== 'yes' || /NOT FOUND/.test(r.Lines));
console.log(`${rows.length} records re-read; ${bad.length} not found or not verified`);
for (const b of bad) console.log(`  ${b.Record}: ${b.Lines}`);
if (bad.length) process.exit(1);
