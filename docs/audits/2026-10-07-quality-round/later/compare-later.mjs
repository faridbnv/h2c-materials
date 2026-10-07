#!/usr/bin/env node
// Item 3: is each record that cites a source the round of 2026-10-05 fetched again, and found changed, still printed on
// the later copy? A measurement is confirmed when its raw number is on a line of the copy's text with a word of its
// property or label; a profile cell when each of its numbers is. What is not confirmed goes to a reader.
//
//   node docs/audits/2026-10-07-quality-round/later/compare-later.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../../../build/src/csv.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../..');
const rows = (p) => readCsv(join(ROOT, p)).records.map((r) => r.values);
const q = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const later = rows('docs/audits/2026-10-05-check-round-3/refetch/refetched.csv').filter((r) => r.Matches === 'no');
const meas = rows('data/tables/measurements.csv').filter((m) => !/^Retired/.test(m['Data status']));
const profs = rows('data/tables/profiles.csv').filter((p) => !/Retired/.test(p.Profile ?? ''));
const guide = existsSync(join(ROOT, 'data/tables/print_guide.csv')) ? rows('data/tables/print_guide.csv') : [];
// A range's dash is no minus sign; a thousands comma ("123,460") is part of the number; a decimal comma ("1,25") is a point.
const nums = (s) => [...String(s ?? '').replace(/(\d)\s*[-–~]\s*(\d)/g, '$1 $2').replace(/(\d),(\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d)/g, '$1.$2').matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
const out = [];
for (const s of later) {
  const tf = join(ROOT, `.cache/text/${s.FetchedSHA256}.json`);
  if (!existsSync(tf)) { out.push({ SourceID: s.SourceID, Record: '', status: 'no-text' }); continue; }
  const lines = JSON.parse(readFileSync(tf, 'utf8')).pages.flatMap((p) => p.lines.map((l) => l.text));
  const lineNums = lines.map((l) => [l, nums(l)]);
  const has = (n, words) => lineNums.some(([l, ns]) => ns.includes(n) && (!words.length || words.some((w) => l.toLowerCase().includes(w))));
  const word = (label) => String(label ?? '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3).slice(0, 4);
  for (const m of meas.filter((x) => x.SourceID === s.SourceID)) {
    const n = Number(m['Raw numeric']);
    const ok = Number.isFinite(n) && (has(n, word(m.Property)) || has(n, word(m.Locator)) || has(n, []));
    out.push({ SourceID: s.SourceID, Record: m.MeasurementID, Table: 'measurements', Field: m.Property, Held: m['Raw value'], status: ok ? 'confirmed' : 'unconfirmed', copy: s.FetchedSHA256, deciding: s.DecidingTargets });
  }
  for (const p of profs.filter((x) => x.SourceID === s.SourceID)) {
    for (const f of ['Nozzle °C', 'Bed °C', 'Chamber °C', 'Drying']) {
      const cell = p[f];
      if (!cell || /^Not /.test(cell)) continue;
      const ns = nums(cell);
      // A cell in words ("Recommended") is confirmed by a line that prints the word beside the field's own word.
      const fieldWord = { 'Nozzle °C': 'nozzle', 'Bed °C': 'bed', 'Chamber °C': 'chamber', Drying: 'dry' }[f];
      const ok = ns.length ? ns.every((n) => has(n, [])) : lines.some((l) => l.toLowerCase().includes(cell.toLowerCase().split(/[^a-z]+/)[0]) && (l.toLowerCase().includes(fieldWord) || /enclos/i.test(l)));
      out.push({ SourceID: s.SourceID, Record: p.ProfileID, Table: 'profiles', Field: f, Held: cell, status: ok ? 'confirmed' : 'unconfirmed', copy: s.FetchedSHA256, deciding: s.DecidingTargets });
    }
  }
  for (const g of guide.filter((x) => x.SourceID === s.SourceID)) out.push({ SourceID: s.SourceID, Record: g.PrintGuideID, Table: 'print_guide', status: 'unconfirmed', copy: s.FetchedSHA256 });
}
const cols = ['SourceID', 'Record', 'Table', 'Field', 'Held', 'status', 'copy', 'deciding'];
writeFileSync(join(HERE, 'compare.csv'), [cols.join(','), ...out.map((r) => cols.map((c) => q(r[c])).join(','))].join('\n') + '\n');
const c = {}; for (const r of out) c[r.status] = (c[r.status] ?? 0) + 1;
console.log(`${later.length} later copies; ${out.length} records/cells:`, c, `; sources with an unconfirmed record: ${new Set(out.filter((r) => r.status === 'unconfirmed').map((r) => r.SourceID)).size}`);
