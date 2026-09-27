#!/usr/bin/env node
// Migration m168 (2026-09-26): a tensile value labelled only by a ±45° raster is an XY value (D91; the owner's decision
// 4 of 2026-09-26, docs/GOALS.md).
//
// Makers commonly print their flat XY test bars with an alternating ±45° raster (3DXTECH's "Infill: 100%, +/- 45°"
// beside "Specimen Orientation: XY", QIDI's ±45° infill angle beside its XY and Z columns). A sheet that labels a tensile
// value only by that raster was read as no direction at all (m33: Direction 45/45, its own value), so the value was no
// product value. The owner ruled that it counts as XY. Every row the database holds whose only orientation is a ±45°
// raster was found (Direction, Locator, Specimen / print parameters and Notes searched for a ±45° wording, and every
// cached page for one: docs/audits/2026-09-25-re-center/RESPONSE.md, "Phase 6: the owner's rulings of 2026-09-26"):
//
//   DSM Arnitel ID 2045  "The mechanical data is tested on printed tensile bars, printed in two directions: 0°-90° and
//                        45°-45°" (p. 1). Its 45°-45° strength, modulus and elongation are XY; its 0°-90° ones stay
//                        "Stated, not a usable direction". The sheet was re-fetched from its recorded URL on 2026-09-26
//                        and matched its SHA-256; this machine's cache does not hold it, so pass its folder with --cache.
//   Nanovia              Each product page prints a tensile tab per raster: 0° (along the load), ±45° and 90° (across).
//                        The ±45° tab is the product's XY value, the usual flat-bar test: four rows stood in it (ABS ESD's
//                        modulus and strain at strength, PA Rail's strain, PLA Flax's modulus) and become XY. The import
//                        took the first tab only, so the ±45° tab's modulus and strain at the ultimate strength, where
//                        a page prints them and the database holds none, are added as XY (20 values on 12 pages); the
//                        0° rows stay recorded with their raster stated and are not XY. PETG's page repeats the 0°
//                        sentence under all three tabs and says nothing, as m155 found; it is left.
//   Essentium PPS-CF     prints "Print Orientation XY / 45/45 / ZX" columns. Its 45/45 bar is labelled beside the sheet's
//                        own XY bar, so it is not the XY value and keeps Direction 45/45, as its flexural and Izod rows do.
//
// "Ultimate strength", the tensile strength each Nanovia tab prints, was never read on any tab (the reader has no
// property for the words); it waits in the record tier (OPEN-PROBLEMS §15). Every value is checked on its page's
// hash-checked bytes before anything is written. The reader is an AI agent (claude-opus-5.5, agent reviewer), not a
// person. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m168-a-45-raster-is-xy.mjs [--cache <folder holding <sha256>.pdf>]

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openTables } from '../data/table-io.mjs';
import { cacheDir, sha256, pdfPages, pageLines } from '../lib/pdf-text.mjs';
import { nanoviaPage, tensileTabs, tabsAgree, printedNumber, RASTER } from '../lib/nanovia-tabs.mjs';
import { readStandards } from '../../build/src/normalize/standards.js';
import { correct, addValue } from './source-edits.mjs';

const migration = 'm168-a-45-raster-is-xy';
const date = '2026-09-26';
const READER = 'Re-read by an AI agent (claude-opus-5.5, agent reviewer), not a person.';
const RULING = 'a tensile value labelled only by a ±45° raster counts as XY (D91, the owner\'s ruling of 2026-09-26)';
const TENSILE = new Set(['Tensile modulus', 'Tensile strength (endpoint unspecified)', 'Tensile yield strength', 'Tensile break strength',
  'Elongation at break', 'Elongation at yield', 'Tensile strain at strength']);
// The rows recorded as 45/45 that become XY, and those that stay beside their sheet's own XY bar.
const TO_XY = ['V002303', 'V002305', 'V002307', 'V007514', 'V007515', 'V009264', 'V010286'];
const STAYS = ['V001863', 'V001866', 'V001869', 'V001872', 'V001875', 'V001878'];
const extra = process.argv.includes('--cache') ? process.argv[process.argv.indexOf('--cache') + 1] : null;

const t = openTables();
const rows = t.rows('measurements').filter((m) => m['Data status'] !== 'Retired duplicate record');

// ------------------------------------------------------------------------------ which 45/45 rows are the XY value
// A tensile row the sheet labels only by its ±45° raster is XY; one the sheet labels beside its own XY bar for the same
// product and property is not.
const sheetXY = (m) => rows.some((r) => r !== m && r.SourceID === m.SourceID && r.GradeID === m.GradeID && r.Property === m.Property && r.Direction === 'XY');
const raster = rows.filter((m) => m.Direction === '45/45');
const stays = raster.filter((m) => !TENSILE.has(m.Property) || sheetXY(m)).map((m) => m.MeasurementID).sort();
const moves = raster.filter((m) => TENSILE.has(m.Property) && !sheetXY(m)).map((m) => m.MeasurementID).sort();
if (stays.join() !== STAYS.join()) throw new Error(`${migration}: the 45/45 rows beside their sheet's own XY are ${stays.join(', ')}, not the six this was written for`);
if (moves.some((id) => !TO_XY.includes(id))) throw new Error(`${migration}: ${moves.filter((id) => !TO_XY.includes(id)).join(', ')} is labelled only by a ±45° raster and was not read for this ruling`);

// A document's own bytes, checked against the digest sources.csv records: the shared cache, or --cache.
function bytesOf(sourceId, ext) {
  const s = t.get('sources', sourceId);
  const paths = [cacheDir('sources/by-sha', `${s.SHA256}.${ext}`), cacheDir('sources', `${sourceId}.${ext}`), extra && join(extra, `${s.SHA256}.${ext}`)].filter(Boolean);
  const path = paths.find(existsSync);
  if (!path) throw new Error(`${migration}: ${sourceId} is not cached; fetch ${s.URL}, check it hashes to ${s.SHA256}, and pass its folder with --cache`);
  const bytes = readFileSync(path);
  if (sha256(bytes) !== s.SHA256) throw new Error(`${migration}: ${path} does not hash to ${s.SHA256}`);
  return bytes;
}

let changed = 0;
const tally = new Map();
const count = (k, n) => { if (n) { tally.set(k, (tally.get(k) ?? 0) + n); changed += n; } };

// DSM Arnitel ID 2045: two rasters, each named on its row.
const DSM = 'R-DSM-ARNITEL-ID2045-TDS';
const dsmRows = moves.map((id) => t.get('measurements', id)).filter((m) => m.SourceID === DSM);
if (dsmRows.length) {
  const lines = (await pdfPages(bytesOf(DSM, 'pdf'))).flatMap((p) => pageLines(p.spans).map((l) => ({ page: p.page, text: l.text.replace(/\s+/g, ' ') })));
  const statement = 'The mechanical data is tested on printed tensile bars, printed in two directions: 0°-90° and 45°-45°';
  if (!lines.some((l) => l.page === 1 && l.text === statement)) throw new Error(`${migration}: ${DSM} p. 1 no longer prints "${statement}"`);
  for (const m of dsmRows) {
    const label = m.Locator.replace(/^p\. 1: /, '');
    const line = lines.find((l) => l.page === 1 && l.text.startsWith(`${label} `));
    if (!label.endsWith('45°-45°') || !line || !line.text.includes(` ${m['Raw numeric']} `)) throw new Error(`${migration}: ${m.MeasurementID} "${label} ${m['Raw value']}" is not on ${DSM} p. 1`);
    count('DSM Arnitel ID 2045: 45°-45° to XY', correct(t, { source: DSM, ids: [m.MeasurementID], migration, date, set: { Direction: ['45/45', 'XY'] },
      note: `p. 1: "${statement}"; this row's line, "${line.text}", is the 45°-45° bar, and ${RULING}. The 0°-90° bar's row stays Stated, not a usable direction. The sheet was re-fetched from its recorded URL on ${date} and matched its SHA-256. ${READER}` }));
  }
}

// Nanovia: the ±45° tab is the product's XY value.
const nanovia = t.rows('sources').filter((s) => s.SourceID.startsWith('R-NANOVIA-'));
const MEASURED = [
  { property: 'Tensile modulus', label: /^Young’s modulus$/, unit: 'MPa', normalizedUnit: 'GPa', factor: 0.001 },
  { property: 'Tensile strain at strength', label: /^(Elongation ultimate strength|Ultimate (tensile )?strength elongation)(\/td)?$/, unit: '%', normalizedUnit: '%', factor: 1 },
];
const tidy = (x) => String(Number(x.toPrecision(12)));
for (const s of nanovia) {
  const own = rows.filter((m) => m.SourceID === s.SourceID && TENSILE.has(m.Property));
  if (!own.length) continue;
  const html = nanoviaPage(s);
  if (!html) throw new Error(`${migration}: ${s.SourceID} has no cached page ${s.SHA256}.html; fetch it and check its digest first`);
  const tabs = tensileTabs(html);
  if (!tabsAgree(tabs)) continue;
  const tab = tabs.find((x) => x.angle === 45);
  if (!tab) continue;
  if (new Set(own.map((m) => m.GradeID)).size !== 1) throw new Error(`${migration}: ${s.SourceID}'s rows stand on more than one product`);
  for (const want of MEASURED) {
    const printed = tab.rows.find((r) => want.label.test(r[0]));
    if (!printed) continue;
    if (printed[2] !== want.unit) throw new Error(`${migration}: ${s.SourceID}'s ±45° "${printed[0]}" is in ${printed[2]}, not ${want.unit}`);
    const recorded = own.filter((m) => m.Property === want.property && m['Specimen / print parameters'] === tab.sentence);
    if (recorded.length > 1) throw new Error(`${migration}: ${s.SourceID} records its ±45° ${want.property} twice`);
    const [m] = recorded;
    if (m) {
      // A row the reader took from the ±45° tab: the page's number, and now XY.
      if (printedNumber(printed[1]) !== Number(m['Raw numeric'])) throw new Error(`${migration}: ${m.MeasurementID} is ${m['Raw value']}, the ±45° tab prints ${printed[1]} ${printed[2]}`);
      if (m.Direction === 'XY') continue;
      count('Nanovia: a ±45° row to XY', correct(t, { source: s.SourceID, ids: [m.MeasurementID], migration, date, set: { Direction: ['45/45', 'XY'] },
        note: `p. 1 (the product page), the ${RASTER[45].tab} tab under "${tab.sentence}": "${printed.join(' ')}", and ${RULING}: the product's XY value, read from the page's hash-checked bytes. Its 0° and 90° tabs stay rasters, not XY. ${READER}` }));
      continue;
    }
    const like = own.find((r) => r.Property === want.property) ?? own.find((r) => r.Property === 'Tensile modulus');
    const value = printedNumber(printed[1]);
    const label = printed[0].replace(/\/td$/, '');
    const id = addValue(t, { like: like.MeasurementID, migration, date,
      why: 'published in the source, never transcribed: the import read the first of the page\'s tensile tabs only.',
      note: `p. 1 (the product page), the ${RASTER[45].tab} tab under "${tab.sentence}": "${printed.join(' ')}", and ${RULING}: the product's XY value, read from the page's hash-checked bytes. ${READER}`,
      set: { Property: want.property, 'Raw value': `${printed[1]} ${want.unit}`, 'Raw unit': want.unit, 'Raw numeric': String(value),
        'Conversion factor': String(want.factor), 'Normalized value': tidy(value * want.factor), 'Normalized unit': want.normalizedUnit,
        'Specimen type': 'Printed specimen', Direction: 'XY', 'Specimen / print parameters': tab.sentence,
        'Moisture condition': 'Not published', 'Moisture state': 'not-stated', 'Post-processing': 'Not published', 'Post-processing state': 'not-stated',
        'Test temperature': 'Not published', 'Standard / load': printed[3], Standards: readStandards(printed[3]).join('; ') || 'Not published',
        Locator: `p. 1: ${label} (${RASTER[45].tab} tab)` } });
    if (id) count(`Nanovia: the ±45° tab's ${want.property}, added as XY`, 1);
  }
}

// Every row the ruling named is XY now, and a 45/45 row stands only beside its sheet's own XY bar.
for (const id of TO_XY) if (t.get('measurements', id).Direction !== 'XY') throw new Error(`${migration}: ${id} is still ${t.get('measurements', id).Direction}`);
const left = t.rows('measurements').filter((m) => m.Direction === '45/45' && m['Data status'] !== 'Retired duplicate record').map((m) => m.MeasurementID).sort();
if (left.join() !== STAYS.join()) throw new Error(`${migration}: ${left.join(', ')} still read 45/45`);

if (changed) t.save();
for (const [k, v] of [...tally].sort()) console.log(`  ${v}\t${k}`);
console.log(`${migration}: ${changed} row(s) changed or added`);
