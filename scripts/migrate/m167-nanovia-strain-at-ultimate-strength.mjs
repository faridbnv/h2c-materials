#!/usr/bin/env node
// Migration m167 (2026-09-26): Nanovia's "Elongation ultimate strength" is the strain at the ultimate strength (the
// owner's decision 3 of 2026-09-26, docs/GOALS.md).
//
// Nanovia's product pages print each tensile tab as "Young's modulus", "Ultimate strength" and "Elongation ultimate
// strength": the strain at the maximum stress, the pair ISO 527 calls the tensile strength and the strain at tensile
// strength. The import filed fourteen of them, on thirteen products, as an elongation at break, which fills the
// elongation headline; lane 4 (m155) found them. The owner ruled that they are the strain at strength. Each is refiled
// to the existing property "Tensile strain at strength", shown and kept, a lower bound of the elongation and never its
// value (headline_definitions.csv).
//
// Every row is re-read on its product page's hash-checked bytes before anything is written: its label and number must
// stand in the tab its own "Specimen / print parameters" sentence names, beside that tab's "Ultimate strength". The
// endpoint rule (MEAS-ENDPOINT-LOCATOR) now names "ultimate strength", so an elongation at break filed from such a label
// stops the build. The reader is an AI agent (claude-opus-5.5, agent reviewer), not a person. A re-run is a no-op, and a
// run after the data moved stops.
//
//   node scripts/migrate/m167-nanovia-strain-at-ultimate-strength.mjs

import { openTables } from '../data/table-io.mjs';
import { correct } from './source-edits.mjs';
import { nanoviaPage, tensileTabs, tabsAgree, printedNumber, RASTER } from '../lib/nanovia-tabs.mjs';

const migration = 'm167-nanovia-strain-at-ultimate-strength';
const date = '2026-09-26';
const FROM = 'Elongation at break';
const TO = 'Tensile strain at strength';
const READER = 'Re-read by an AI agent (claude-opus-5.5, agent reviewer), not a person.';
// The fourteen rows lane 4 named (OPEN-PROBLEMS §15), by the label they were read under.
const IDS = ['V007472', 'V007515', 'V007548', 'V007608', 'V007620', 'V007683', 'V007734', 'V007760', 'V007804', 'V007819',
  'V009263', 'V009264', 'V010161', 'V010285'];
const LABEL = /^p\. 1: (Elongation ultimate strength(?:\/td)?)$/;

const t = openTables();

// Every Nanovia row read from that label is one of the fourteen: a fifteenth is a row this ruling did not see.
const found = t.rows('measurements').filter((m) => m.SourceID.startsWith('R-NANOVIA-') && LABEL.test(m.Locator) && m['Data status'] !== 'Retired duplicate record');
if (found.map((m) => m.MeasurementID).sort().join() !== IDS.join()) throw new Error(`${migration}: the rows read from "Elongation ultimate strength" are ${found.map((m) => m.MeasurementID).join(', ')}, not the fourteen this was written for`);

let n = 0;
const products = new Set();
for (const id of IDS) {
  const m = t.get('measurements', id);
  products.add(m.GradeID);
  if (m.Property === TO) continue;
  const label = LABEL.exec(m.Locator)[1];
  const html = nanoviaPage(t.get('sources', m.SourceID));
  if (!html) throw new Error(`${migration}: ${m.SourceID} has no cached page ${t.get('sources', m.SourceID).SHA256}.html; fetch it and check its digest first`);
  const tabs = tensileTabs(html);
  if (!tabsAgree(tabs)) throw new Error(`${migration}: ${m.SourceID}'s tabs do not say what their ids say`);
  const tab = tabs.find((x) => x.sentence === m['Specimen / print parameters']);
  if (!tab) throw new Error(`${migration}: ${id}'s sentence "${m['Specimen / print parameters']}" heads no tab of ${m.SourceID}`);
  const row = tab.rows.find((r) => r[0] === label);
  if (!row || printedNumber(row[1]) !== Number(m['Raw numeric']) || row[2] !== '%') throw new Error(`${migration}: ${id} "${label} ${m['Raw value']}" is not what the ${RASTER[tab.angle].tab} tab prints (${row?.join(' ') ?? 'no such row'})`);
  const strength = tab.rows.find((r) => r[0] === 'Ultimate strength');
  if (!strength) throw new Error(`${migration}: the ${RASTER[tab.angle].tab} tab of ${m.SourceID} prints no "Ultimate strength" beside ${id}`);
  n += correct(t, { source: m.SourceID, ids: [id], migration, date, set: { Property: [FROM, TO] },
    note: `p. 1 (the product page), the ${RASTER[tab.angle].tab} tab under "${tab.sentence}": "${label} ${row[1]} ${row[2]}" is the strain at the "Ultimate strength" printed above it (${strength[1]} ${strength[2]}), the maximum stress, not an elongation at break; refiled as the strain at strength by the owner's ruling of 2026-09-26, from the page's hash-checked bytes. ${READER}` });
}

if (n) t.save();
console.log(`${migration}: ${n} row(s) refiled as ${TO} (${IDS.length} rows on ${products.size} products)`);
