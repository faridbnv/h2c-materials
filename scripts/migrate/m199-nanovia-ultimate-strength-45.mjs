#!/usr/bin/env node
// Migration m199 (2026-09-27): the ultimate strength of Nanovia's ±45° tab, the XY tensile strength of the twelve
// products m168 gave an XY stiffness (D91; OPEN-PROBLEMS §15).
//
// Nanovia's product pages print a tensile tab per raster: 0°, ±45° and 90°. By the owner's ruling of 2026-09-26 (D91)
// the ±45° tab is the product's XY value, and m168 recorded its modulus and its strain at the ultimate strength. Each
// tab also prints "Ultimate strength" (PA 6-CF's reads "Ultimate tensile strength"), the maximum stress, which the
// import never read on any tab: the registry holds it as Tensile strength (endpoint unspecified). For each product whose
// ±45° modulus is recorded XY, the ±45° tab's ultimate strength is added as its XY tensile strength, read from the page's
// hash-checked bytes as m168 read the modulus. The 0° and 90° tabs' strengths stay in the record tier, as their other
// rows do (m168).
//
// The reader is an AI agent (claude-opus-5.5, agent reviewer), not a person. A re-run is a no-op, and a run after the
// data moved stops.
//
//   node scripts/migrate/m199-nanovia-ultimate-strength-45.mjs

import { openTables } from '../data/table-io.mjs';
import { nanoviaPage, tensileTabs, tabsAgree, printedNumber, RASTER } from '../lib/nanovia-tabs.mjs';
import { readStandards } from '../../build/src/normalize/standards.js';
import { addValue } from './source-edits.mjs';

const migration = 'm199-nanovia-ultimate-strength-45';
const date = '2026-09-27';
const READER = 'Read by an AI agent (claude-opus-5.5, agent reviewer), not a person.';
const RULING = 'a tensile value labelled only by a ±45° raster counts as XY (D91, the owner\'s ruling of 2026-09-26)';
const PRODUCTS = 12;
const t = openTables();

const live = (m) => m['Data status'] !== 'Retired duplicate record';
let added = 0;
let products = 0;
for (const s of t.rows('sources').filter((x) => x.SourceID.startsWith('R-NANOVIA-'))) {
  const own = t.rows('measurements').filter((m) => m.SourceID === s.SourceID && live(m));
  const html = own.length ? nanoviaPage(s) : null;
  if (!html) continue;
  const tabs = tensileTabs(html);
  if (!tabsAgree(tabs)) continue;
  const tab = tabs.find((x) => x.angle === 45);
  // The products m168 read: a ±45° modulus, recorded XY, under the tab's own sentence.
  const modulus = tab && own.find((m) => m.Property === 'Tensile modulus' && m.Direction === 'XY' && m['Specimen / print parameters'] === tab.sentence);
  if (!modulus) continue;
  products++;
  const printed = tab.rows.find((r) => /^Ultimate (tensile )?strength$/.test(r[0]));
  if (!printed) throw new Error(`${migration}: ${s.SourceID}'s ±45° tab prints no ultimate strength`);
  if (printed[2] !== 'MPa') throw new Error(`${migration}: ${s.SourceID}'s ±45° "${printed[0]}" is in ${printed[2]}, not MPa`);
  const value = printedNumber(printed[1]);
  if (!Number.isFinite(value)) throw new Error(`${migration}: ${s.SourceID}'s ±45° "${printed[0]}" prints "${printed[1]}"`);
  const recorded = own.filter((m) => m.Property === 'Tensile strength (endpoint unspecified)' && m.Direction === 'XY' && m['Specimen / print parameters'] === tab.sentence);
  if (recorded.length) {
    if (recorded.length > 1 || Number(recorded[0]['Raw numeric']) !== value) throw new Error(`${migration}: ${s.SourceID} records its ±45° strength as ${recorded.map((m) => m['Raw value']).join(', ')}, the tab prints ${printed[1]}`);
    continue;
  }
  const id = addValue(t, { like: modulus.MeasurementID, migration, date,
    why: 'published in the source, never transcribed: the import read no tab\'s "Ultimate strength" (OPEN-PROBLEMS §15).',
    note: `p. 1 (the product page), the ${RASTER[45].tab} tab under "${tab.sentence}": "${printed.join(' ')}", the maximum stress, and ${RULING}: the product's XY tensile strength, read from the page's hash-checked bytes beside the modulus m168 read there (${modulus.MeasurementID}). ${READER}`,
    set: { Property: 'Tensile strength (endpoint unspecified)', 'Raw value': `${printed[1]} MPa`, 'Raw unit': 'MPa', 'Raw numeric': String(value),
      'Conversion factor': '1', 'Normalized value': String(value), 'Normalized unit': 'MPa',
      'Specimen type': 'Printed specimen', Direction: 'XY', 'Specimen / print parameters': tab.sentence,
      'Moisture condition': 'Not published', 'Moisture state': 'not-stated', 'Post-processing': 'Not published', 'Post-processing state': 'not-stated',
      'Test temperature': 'Not published', 'Standard / load': printed[3], Standards: readStandards(printed[3]).join('; ') || 'Not published',
      Locator: `p. 1: ${printed[0]} (${RASTER[45].tab} tab)` } });
  if (id) { added++; console.log(`  ${id}  ${s.SourceID}  ${printed[0]} ${printed[1]} MPa`); }
}
if (products !== PRODUCTS) throw new Error(`${migration}: ${products} products have a ±45° XY modulus, not the ${PRODUCTS} m168 recorded`);

if (added) t.save();
console.log(`${migration}: ${added} ultimate strength(s) added as XY tensile strength`);
