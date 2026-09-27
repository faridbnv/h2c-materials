#!/usr/bin/env node
// A seeded sample of the rows the phase 6 final round wrote (m196 to m199), each checked again on its cached page by a
// reading independent of the migration that wrote it: the row's number must stand on the page its Locator names (the
// whitespace-free page, as numberOnPage reads it), and a notch m196 set must be named on that page. Prints a Markdown
// table for docs/audits/2026-09-25-re-center/RESPONSE.md.
//
//   node scripts/audit/final-round-sample.mjs [--n 30] [--seed 2027]

import { openTables } from '../data/table-io.mjs';
import { cachedText, numberOnPage } from '../lib/pdf-text.mjs';
import { nanoviaPage, tensileTabs } from '../lib/nanovia-tabs.mjs';

const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? Number(process.argv[i + 1]) : def; };
const N = arg('n', 30);
const SEED = arg('seed', 2027);
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(SEED);

const t = openTables();
const mine = t.rows('measurements').filter((m) => /\((m19[6-9])-/.test(m.Notes)).sort((a, b) => (a.MeasurementID < b.MeasurementID ? -1 : 1));
const pool = [...mine];
const sample = [];
while (sample.length < N && pool.length) sample.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
sample.sort((a, b) => (a.MeasurementID < b.MeasurementID ? -1 : 1));

const NOTCH = { Notched: /notched|缺口|1eA|\beA\b/i, Unnotched: /unnotched|\beU\b|1eU|Charpyfull|full/i };
console.log(`| Row | By | Source | Property | Raw value | Page | Number on the page | Notch on the page |`);
console.log('|---|---|---|---|---|---|---|---|');
let ok = 0;
for (const m of sample) {
  const by = /\((m19[6-9])-/.exec(m.Notes)[1];
  const s = t.get('sources', m.SourceID);
  const page = Number((/^p\. ?(\d+)/.exec(m.Locator) ?? [])[1] ?? 1);
  let number = 'no text', notch = '—';
  const text = cachedText(s.SHA256);
  if (text) {
    const found = numberOnPage(text, page, m['Raw numeric']) || numberOnPage(text, page, String(m['Raw numeric']).replace('.', ','));
    number = found ? 'yes' : 'NO';
    if (by === 'm196') {
      const p = text.pages.find((x) => x.page === page);
      notch = NOTCH[m.Notch]?.test(p.squeezed) ? `${m.Notch}: yes` : `${m.Notch}: NO`;
    }
  } else if (s.SourceID.startsWith('R-NANOVIA-')) {
    const tab = tensileTabs(nanoviaPage(s)).find((x) => x.angle === 45);
    number = tab?.rows.some((r) => Number(String(r[1]).replace(',', '.')) === Number(m['Raw numeric'])) ? 'yes (±45° tab)' : 'NO';
  }
  if (number.startsWith('yes') && !notch.endsWith('NO')) ok++;
  console.log(`| ${m.MeasurementID} | ${by} | ${m.SourceID} | ${m.Property} | ${m['Raw value']} | ${page} | ${number} | ${notch} |`);
}
console.log(`\n${ok} of ${sample.length} confirmed (seed ${SEED}, from ${mine.length} rows m196 to m199 wrote).`);
