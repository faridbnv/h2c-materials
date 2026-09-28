#!/usr/bin/env node
// Migration m205 (2026-09-27): Raise3D's Industrial PA12 CF+ is a PA612 product of its own, and ELEGOO's PLA has its
// name (GOALS C2 and C3; the research package of 2026-09-26, P1-IDENTITY, ID-KNOWN-RAISE3D and ID-KNOWN-ELEGOO).
//
// Raise3D Industrial PA12 CF+. Raise3D serves two sheets under one file name, "Raise3D-Industrial-PA12-CF_TDS-V3.0":
// the March 2022 one (…-0b3967) is "Raise3D Industrial PA12 CF", "a carbon fiber reinforced composite filament
// material based on Nylon 12 (Polyamide 12)"; the September 2024 one (…-76400e) is "Raise3D Industrial PA12 CF+", "a
// carbon fiber-reinforced composite filament based on Polyamide 612 (PA612, Nylon 612)", which it compares "with
// Raise3D Industrial PA12 CF". The import registered both to G053-09 under PA12-CF (M053), so the product's values mixed
// two polymers. OPEN-PROBLEMS §13 noticed three CF+ statements on it; the research package read both sheets and found
// the whole sheet is another product. It is filed as its sheet says, under PA612-CF (M059), as QIDI's "PA12-CF"
// sheet that names PA612 already is (G059-02): a new grade, G059-03, takes the CF+ sheet's 22 measurements, its print
// profile and its 9 statements, each keeping its ID (D86: a product moves with its records; moveGrade moves a whole
// grade, so this moves the one sheet's). G053-09 keeps its own sheet, and gets the profile that sheet gives: "Dry PA12 CF
// at 80°C for 12 hours before printing" and "Using abrasion resistance nozzle, such as hardened steel and ruby nozzle,
// is highly recommended" (p. 2), where the CF+ sheet's profile spoke for it until now.
//
// ELEGOO's PLA (G001-129). Its sheet prints ELEGOO's logo over a table and no product name (m174 named it Not
// published). 3DJake's listing "Elegoo PLA Sea Green", which links that sheet (TDS_PLA.pdf), was saved by the research
// package and staged by digest; it names the product ELEGOO's PLA ("Product type: PLA Filaments"). Registered as the
// retailer's page that settles the name, never a source of properties.
//
// Every statement is checked on its cached, hash-checked page. The reviewer is an AI agent (claude-opus-5.5, agent
// reviewer), not a person. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m205-raise3d-pa12-cf-plus-is-pa612.mjs

import { existsSync, readFileSync } from 'node:fs';
import { openTables } from '../data/table-io.mjs';
import { cacheDir, cachedText, sha256 } from '../lib/pdf-text.mjs';
import { parseDrying, parseAbrasion } from '../../build/src/normalize/process.js';
import { recountGrades } from '../data/records.mjs';
import { pageReader } from './printed-on.mjs';

const migration = 'm205-raise3d-pa12-cf-plus-is-pa612';
const date = '2026-09-27';
const NA = 'Not applicable';
const NP = 'Not published';
const READER = 'Read by an AI agent (claude-opus-5.5, agent reviewer), not a person.';
const t = openTables();
const printed = pageReader(t, migration);

let changed = 0;
const tally = new Map();
const count = (k, n = 1) => { if (n) { tally.set(k, (tally.get(k) ?? 0) + n); changed += n; } };

// ------------------------------------------------------------------------------ Raise3D Industrial PA12 CF+
const PA12 = 'G053-09';
const PLUS = 'G059-03';
const FROM = 'M053';
const TO = 'M059';
const OWN = 'D-RAISE3D-Raise3D-Industrial-PA12-CF-TDS-V3-0-0b3967';
const CFPLUS = 'D-RAISE3D-Raise3D-Industrial-PA12-CF-TDS-V3-0-76400e';
for (const [source, page, words] of [
  [CFPLUS, 1, 'Raise3D Industrial PA12 CF+ is a carbon fiber-reinforced composite filament based on Polyamide 612 (PA612, Nylon 612)'],
  [CFPLUS, 1, 'Compared with Raise3D Industrial PA12 CF'],
  [OWN, 1, 'Raise3D Industrial PA12 CF Filament is a carbon fiber reinforced composite filament material based on Nylon 12 (Polyamide 12)'],
]) if (!printed(source, page, words, 2)) throw new Error(`${migration}: ${source} p. ${page} no longer prints "${words}"`);

const pa12 = t.get('grades', PA12);
if (pa12.MaterialID !== FROM || pa12.SourceID !== OWN) throw new Error(`${migration}: ${PA12} is ${pa12.MaterialID} citing ${pa12.SourceID}; the data moved`);
if (!t.find('grades', PLUS)) {
  const next = t.nextId('grades', { materialId: TO });
  if (next !== PLUS) throw new Error(`${migration}: the next grade under ${TO} is ${next}, not ${PLUS}`);
  t.append('grades', {
    ...pa12, GradeID: PLUS, MaterialID: TO, 'Product name': 'Industrial PA12 CF+', 'Shared formulation key': CFPLUS,
    'Composition / filler': 'Raise3D Industrial PA12 CF+ is a carbon fiber-reinforced composite filament based on Polyamide 612 (PA612, Nylon 612) (p. 1, as the sheet states it)',
    'Selected-grade rationale': `Documented commercial formulation; traceable manufacturer evidence. Filed ${date} (${migration}): the sheet registered to ${PA12} under this name is another product, based on PA612.`,
    SourceID: CFPLUS,
  });
  count('Industrial PA12 CF+ filed under PA612-CF');
}
// The CF+ sheet's records move to the new grade, keeping their IDs.
for (const table of ['measurements', 'profiles', 'evidence']) {
  const pk = t.schemas[table].primaryKey;
  for (const r of t.rows(table).filter((x) => x.SourceID === CFPLUS && x.GradeID === PA12)) {
    if (r.MaterialID !== FROM) throw new Error(`${migration}: ${table} ${r[pk]} is on ${PA12} but filed under ${r.MaterialID}`);
    t.set(table, r[pk], 'GradeID', PLUS, { expect: PA12 });
    t.set(table, r[pk], 'MaterialID', TO, { expect: FROM });
    if (table === 'measurements') {
      const note = `Moved ${date} (${migration}) from ${PA12} to ${PLUS}: this sheet is Raise3D Industrial PA12 CF+, "based on Polyamide 612", not the PA12 CF product.`;
      t.set(table, r[pk], 'Notes', r.Notes === NA || r.Notes === NP ? note : `${r.Notes} ${note}`, { expect: r.Notes });
    }
    count(`${table} moved to ${PLUS}`);
  }
}
for (const l of t.rows('material_links').filter((x) => x.MaterialID === FROM && x.Link === 'printing' && t.rows('profiles').some((p) => p.ProfileID === x.RecordID && p.GradeID === PLUS))) {
  t.update('material_links', { MaterialID: FROM, Link: 'printing', RecordID: l.RecordID }, 'MaterialID', TO, { expect: FROM, migration });
  count('printing citations moved');
}
const plusSource = t.get('sources', CFPLUS);
if (plusSource['Applicable grades'] !== PLUS) { t.set('sources', CFPLUS, 'Applicable grades', PLUS, { expect: plusSource['Applicable grades'] }); count('the CF+ sheet names its product'); }
if (plusSource.Title !== 'Raise3D Industrial PA12 CF+ Technical Data Sheet') throw new Error(`${migration}: ${CFPLUS} is titled "${plusSource.Title}"`);

// G053-09's own sheet gives its recipe.
const DRY = 'Dry PA12 CF at 80°C for 12 hours before printing, moisture content is crucial for final printed part quality.';
const ABRASION = 'Using abrasion resistance nozzle, such as hardened steel and ruby nozzle, is highly recommended.';
for (const words of [DRY, ABRASION]) if (!printed(OWN, 2, words, 2)) throw new Error(`${migration}: ${OWN} p. 2 no longer prints "${words}"`);
if (parseAbrasion(ABRASION).requiresHardened !== true) throw new Error(`${migration}: the parser no longer reads "${ABRASION}" as a hardened nozzle`);
const dryRead = parseDrying(DRY);
if (!t.rows('profiles').some((p) => p.GradeID === PA12 && p.SourceID === OWN)) {
  t.append('profiles', {
    ProfileID: t.nextId('profiles'), MaterialID: FROM, GradeID: PA12, Profile: 'Manufacturer published guidance',
    'Nozzle °C': NP, 'Nozzle state': 'unknown', 'Nozzle min °C': NA, 'Nozzle max °C': NA, 'Nozzle requirement': 'unknown',
    'Bed °C': NP, 'Bed state': 'unknown', 'Bed min °C': NA, 'Bed max °C': NA, 'Bed requirement': 'unknown',
    'Chamber °C': NP, 'Chamber state': 'unknown', 'Chamber min °C': NA, 'Chamber max °C': NA, 'Chamber requirement': 'unknown',
    Enclosure: NP, 'Enclosure state': 'unknown', Plate: NP, Drying: DRY, 'Drying state': 'stated', 'Drying °C': '80', 'Drying hours': '12',
    'Nozzle material': NP, 'Nozzle diameter': NP, 'Abrasion / clogging': ABRASION, 'Hardened nozzle': 'TRUE',
    'H2C left': 'Verify exact grade/nozzle; no blanket approval', 'H2C right': 'Verify exact grade/nozzle; no blanket approval',
    'AMS 2 Pro': 'Not verified for every grade', 'AMS HT': 'Not verified for every grade', 'AMS published': NP,
    'Support pairing': NP, 'Failure modes': NP, SourceID: OWN, 'H2C SourceID': 'H2C-WIKI', Locator: 'p. 2: Notes 1 and 3',
    'Parse review': `${migration}: the parser takes "12" from the product's name ("PA12 CF") for the drying temperature (it reads ${dryRead.tempC} °C); the sheet says 80 °C for 12 hours.`,
  });
  count(`${PA12}: a profile from its own sheet`);
}
for (const m of [TO, FROM]) if (recountGrades(t, m, { migration, date, because: `after Raise3D Industrial PA12 CF+ was filed under PA612-CF as ${PLUS}` })) count(`${m}: grades recounted`);

// ------------------------------------------------------------------------------ ELEGOO's PLA, by the page that links it
const ELEGOO = 'G001-129';
const PAGE = {
  SourceID: 'D-3DJAKE-ELEGOO-PLA-SEA-GREEN-PAGE', Publisher: '3DJake / 3DJAKE', Title: 'Elegoo PLA Sea Green', Revision: NP, 'Publication date': NP,
  'Access date': '2026-09-26', 'Source class': 'Retailer catalogue',
  'Source note': "3DJake's listing of ELEGOO's PLA in sea green, which links the ELEGOO sheet G001-129 was read from (TDS_PLA.pdf, a sheet that prints no product name); kept for the product name it gives, never for properties.",
  'Citation role': 'corroboration', URL: 'https://www.3djake.com/elegoo/pla-sea-green', Locator: 'Product page', 'Applicable grades': ELEGOO, 'Access state': 'retrieved',
  'Access note': 'Fetched from its URL on 2026-09-26 by the Codex research agents (research package of 2026-09-26) and staged from their saved copy by digest (ingest:witness --from); not fetched again.',
  SHA256: 'cc1ccc86341493acb6b906c915ebcfba9040b6e406a8c2a67443a0994550b1db',
};
const bytes = cacheDir('sources/by-sha', `${PAGE.SHA256}.html`);
if (!existsSync(bytes) || sha256(readFileSync(bytes)) !== PAGE.SHA256) throw new Error(`${migration}: the ELEGOO page is not cached at ${PAGE.SHA256}; stage it first`);
if (!readFileSync(bytes, 'utf8').includes('TDS_PLA.pdf')) throw new Error(`${migration}: the ELEGOO page no longer links TDS_PLA.pdf`);
if (!t.find('sources', PAGE.SourceID)) { t.append('sources', PAGE); count('the ELEGOO listing registered'); }
for (const words of ['Elegoo PLA Sea Green', 'Manufacturer: Elegoo Diameter: 1,75 mm Product type: PLA Filaments']) if (!printed(PAGE.SourceID, 1, words, 2)) throw new Error(`${migration}: the ELEGOO page no longer prints "${words}"`);
const elegoo = t.get('grades', ELEGOO);
if (elegoo['Product name'] !== 'PLA') {
  t.set('grades', ELEGOO, 'Product name', 'PLA', { expect: NP });
  t.set('grades', ELEGOO, 'Colour caveat', 'Properties may vary by colour; use TDS scope. The sheet was linked from the Sea Green listing.', { expect: elegoo['Colour caveat'] });
  t.set('grades', ELEGOO, 'Selected-grade rationale', `${elegoo['Selected-grade rationale']} Named ${date} (${migration}) from 3DJake's listing that links the sheet (${PAGE.SourceID}): "Elegoo PLA Sea Green", "Product type: PLA Filaments". ${READER}`, { expect: elegoo['Selected-grade rationale'] });
  count('ELEGOO PLA named');
}

if (changed) t.save();
for (const [k, n] of [...tally].sort()) console.log(`  ${n}\t${k}`);
console.log(`${migration}: ${changed} change(s)`);
