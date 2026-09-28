#!/usr/bin/env node
// Migration m209 (2026-09-27): the Filament Guide Bambu Lab links today is the one the build reads (D88, amended; D90,
// extended; the owner's answer of 2026-09-27).
//
// Bambu Lab's Filament Guide is registered twice. m150 took R-BAMBU-GUIDE-202609 (15 columns, fetched 2026-09-13 from a
// token URL) for the current revision and B-GUIDE (18 columns, the ".../250123/..." file) for its January 2025
// revision; neither PDF prints a date. The research package of 2026-09-26 reported that the guide's page links the
// 250123 file. The owner asked for that to be checked before the build changed: Bambu Lab's page
// (https://bambulab.com/en-ca/filament/guide, which the English address redirects to) was loaded in headless Chrome on
// 2026-09-27, as the page refuses a plain fetch. Its only link to a filament guide PDF is
// "https://portal.bblmw.com/filament/filament-guide/250123/filament-guide-en.pdf", and those bytes hash to the digest
// B-GUIDE records (ea799364…). The page is in the ledger as a witness for B-GUIDE and is registered here
// (B-FILAMENT-GUIDE-PAGE). So B-GUIDE is the guide Bambu Lab publishes, and the build reads it:
//
// - Its eighteen columns become print_guide rows PG016 to PG033, each cell pinned in m209-the-guide-bambu-links.csv as
//   the page prints it (full-width brackets written in ASCII) and checked on the hash-checked page
//   (scripts/lib/comparison-table.mjs). B-GUIDE prints "Print with Enclosure" in words, Required or Optional, where the
//   other copy draws a tick or a cross; the typed columns are the build's parsers' reading.
// - The fifteen materials m150 mapped read the same type's row of B-GUIDE. ASA-CF (M033) and PC FR (M036), which only
//   B-GUIDE heads, are mapped to theirs. TPU for AMS is not mapped: M040 is an alias, and the TPU classes are not one
//   Bambu product.
// - D90 reads the guide's enclosure as within the H2C's chamber for the types it asks one for. B-GUIDE asks for ASA-CF
//   and PC FR too, and the owner's answer of 2026-09-27 extends the reading to them. So eleven rows declare their
//   chamber "enclosed", with the Parse review m165 wrote.
// - What changes on the fifteen shared types is B-GUIDE's own figures:
//   - PLA's drying oven is 50 °C instead of 55;
//   - PC's nozzle is 260-280 °C and its bed 90-110 °C;
//   - SuperTack plate windows are added for PLA, PETG HF, PLA-CF, PETG-CF and PET-CF.
//   None of these crosses an H2C limit.
// - R-BAMBU-GUIDE-202609 stays registered and cited. Its rows PG001 to PG015 stay as the record of that copy, and no
//   material reads them.
//
// The reviewer is an AI agent (claude-opus-5.5, agent reviewer), not a person. A re-run is a no-op, and a run after
// the data moved stops.
//
//   node scripts/migrate/m209-the-guide-bambu-links.mjs

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { openTables } from '../data/table-io.mjs';
import { cacheDir, cachedText, sha256 } from '../lib/pdf-text.mjs';
import { tableLayout, cellText, sameText } from '../lib/comparison-table.mjs';
import { parseTemperature, parseEnclosure, parseDrying, parseAbrasion } from '../../build/src/normalize/process.js';
import { profileCellsFromParsed } from '../../build/src/typed-values.js';
import { TEMP_WINDOW } from '../../build/src/recipe.js';

const migration = 'm209-the-guide-bambu-links';
const date = '2026-09-27';
const here = dirname(fileURLToPath(import.meta.url));
const pins = readCsv(join(here, `${migration}.csv`)).records.map((r) => r.values);
const mapping = readCsv(join(here, `${migration}-materials.csv`)).records.map((r) => r.values);
const REVIEWER = `claude-opus-5.5 (agent reviewer), ${date}`;
const GUIDE = 'B-GUIDE';
const OTHER = 'R-BAMBU-GUIDE-202609';
const LINK = 'https://portal.bblmw.com/filament/filament-guide/250123/filament-guide-en.pdf';
const ROW = ['Nozzle Temperature', 'Build Plate & Bed Temperature', 'Print with Enclosure', 'Nozzle Size/Material', 'Dry Out Before Use', 'Drying Condition'];
// D90's nine types, and the two B-GUIDE heads that the owner's answer of 2026-09-27 adds.
const ENCLOSED = ['ABS', 'ABS-GF', 'ASA', 'ASA-CF', 'PC', 'PC FR', 'PAHT-CF', 'PA6-CF', 'PA6-GF', 'PPA-CF', 'PPS-CF'];
const D90 = 'Chamber state enclosed and requirement required are the owner\'s ruling of 2026-09-26 (D90, m165), not a '
  + 'reading of a chamber row, which the guide does not print: it asks to print with an enclosure (it prints Required) '
  + 'on Bambu Lab\'s own enclosed printers (its drying rows name the X1 Series), and the H2C\'s heated chamber, to 65 °C, '
  + 'is that enclosure. The other typed columns are the parsers\' reading.';
const D90_EXTENDED = `${D90} ASA-CF and PC FR, which only this revision heads, were added by the owner's answer of ${date} (m209).`;
const NA = 'Not applicable';
const NP = 'Not published';
const t = openTables();

let changed = 0;
const tally = new Map();
const count = (k, n = 1) => { if (n) { tally.set(k, (tally.get(k) ?? 0) + n); changed += n; } };

// ------------------------------------------------------------------------------ the page that links the guide
const PAGE = {
  SourceID: 'B-FILAMENT-GUIDE-PAGE', Publisher: 'Bambu Lab', Title: '3D Printer Filament Comparison Guide', Revision: NP, 'Publication date': NP,
  'Access date': date, 'Source class': 'Manufacturer product page or guide',
  'Source note': `Bambu Lab's Filament Guide page, loaded in headless Chrome (it refuses a plain fetch); its only link to a filament guide PDF is ${LINK}, the bytes B-GUIDE holds. Kept for the link that says which copy of the guide Bambu Lab publishes (m209).`,
  'Citation role': 'corroboration', URL: 'https://bambulab.com/en-ca/filament/guide', Locator: 'Download PDF link', 'Applicable grades': 'Bambu Lab catalogue cross-check',
  'Access state': 'retrieved', 'Access note': `Loaded ${date} with headless Chrome by an agent (claude-opus-5.5); the rendered page was staged by digest (ingest:witness --from, a witness for B-GUIDE).`,
  SHA256: '1417cf94831915a234ca761ea64f5f5e3a1266bb997097d5b30d799ec406ed93',
};
const pagePath = cacheDir('sources/by-sha', `${PAGE.SHA256}.html`);
if (!existsSync(pagePath) || sha256(readFileSync(pagePath)) !== PAGE.SHA256) throw new Error(`${migration}: the guide page is not staged at ${PAGE.SHA256}`);
const links = [...new Set(readFileSync(pagePath, 'utf8').match(/https?:\/\/[^"'\s<>]+filament-guide[^"'\s<>]*\.pdf/gi) ?? [])];
if (links.length !== 1 || links[0] !== LINK) throw new Error(`${migration}: the guide page links ${links.join(', ') || 'no guide PDF'}, not ${LINK}`);
if (!t.find('sources', PAGE.SourceID)) { t.append('sources', PAGE); count('the guide page registered'); }

// ------------------------------------------------------------------------------ the guide, hash-checked
const guide = t.get('sources', GUIDE);
if (!guide.URL.endsWith('/250123/filament-guide-en.pdf')) throw new Error(`${migration}: ${GUIDE} is recorded at ${guide.URL}`);
const pdf = cacheDir('sources/by-sha', `${guide.SHA256}.pdf`);
if (!existsSync(pdf) || sha256(readFileSync(pdf)) !== guide.SHA256) throw new Error(`${migration}: ${GUIDE} is not cached at ${guide.SHA256}`);
const page = cachedText(guide.SHA256).pages[0];
const layout = tableLayout(page, ['PLA', 'PPS-CF']);
if (layout.columns.map((c) => c.name).join('|') !== pins.map((p) => p['Guide type']).join('|')) throw new Error(`${migration}: ${GUIDE} heads ${layout.columns.map((c) => c.name).join(', ')}`);
const ascii = (s) => String(s).replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
for (const p of pins) for (const r of ROW) {
  const printed = ascii(cellText(page, layout, p['Guide type'], r));
  if (!sameText(printed, p[r])) throw new Error(`${migration}: ${GUIDE} ${p['Guide type']} "${r}" prints "${printed}", pinned "${p[r]}"`);
}

// ------------------------------------------------------------------------------------------- the rows to write
function guideRow(p) {
  const raw = {
    'Nozzle °C': p['Nozzle Temperature'], 'Bed °C': p['Build Plate & Bed Temperature'], 'Chamber °C': NP, Enclosure: p['Print with Enclosure'],
    Drying: `Dry Out Before Use: ${p['Dry Out Before Use']}. Drying Condition: ${p['Drying Condition']}`, 'Nozzle size / material': p['Nozzle Size/Material'],
  };
  const typed = profileCellsFromParsed({
    nozzle: parseTemperature(raw['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }),
    bed: parseTemperature(raw['Bed °C'], { plausible: TEMP_WINDOW.bed }),
    chamber: parseTemperature(raw['Chamber °C'], { plausible: TEMP_WINDOW.chamber }),
    enclosure: parseEnclosure(raw.Enclosure), drying: parseDrying(raw.Drying), abrasion: parseAbrasion(raw['Nozzle size / material']),
  });
  for (const axis of ['Nozzle', 'Bed']) if (typed[`${axis} state`] !== 'range') throw new Error(`${migration}: ${p['Guide type']} ${axis} "${raw[`${axis} °C`]}" is not read as a window`);
  const asks = typed['Enclosure state'] === 'recommended';
  if (asks !== ENCLOSED.includes(p['Guide type'])) throw new Error(`${migration}: ${p['Guide type']} enclosure "${raw.Enclosure}" reads ${typed['Enclosure state']}`);
  const row = { PrintGuideID: p.PrintGuideID, SourceID: GUIDE, 'Guide type': p['Guide type'] };
  for (const column of t.header('print_guide')) {
    if (column in row) continue;
    if (column in raw) row[column] = raw[column];
    else if (column in typed) row[column] = typed[column];
  }
  if (asks) Object.assign(row, { 'Chamber state': 'enclosed', 'Chamber requirement': 'required' });
  row.Locator = `p. 1, the column headed ${p['Guide type']}: ${ROW.join('; ')}`;
  row['Parse review'] = asks ? (['ASA-CF', 'PC FR'].includes(p['Guide type']) ? D90_EXTENDED : D90) : NA;
  return row;
}
for (const p of pins) {
  const row = guideRow(p);
  const existing = t.find('print_guide', p.PrintGuideID);
  if (existing) {
    const moved = Object.entries(row).filter(([k, v]) => existing[k] !== v).map(([k]) => k);
    if (moved.length) throw new Error(`${migration}: print_guide ${p.PrintGuideID} differs in ${moved.join(', ')}; the data moved`);
    continue;
  }
  t.append('print_guide', row);
  count('guide rows from the linked revision');
}

// ------------------------------------------------------------------------------------------- which material reads which
const ours = new Set(pins.map((p) => p.PrintGuideID));
for (const m of mapping) {
  if (!ours.has(m.PrintGuideID)) throw new Error(`${migration}: ${m.MaterialID} maps to ${m.PrintGuideID}, not a row of ${GUIDE}`);
  const material = t.get('materials', m.MaterialID);
  if (material.Scope === 'Family entry') throw new Error(`${migration}: ${m.MaterialID} is a family entry`);
  const existing = t.find('print_guide_materials', m.MaterialID);
  if (!existing) { t.append('print_guide_materials', { MaterialID: m.MaterialID, PrintGuideID: m.PrintGuideID, Reason: m.Reason, 'Reviewed by': REVIEWER }); count('materials mapped to a type only this revision heads'); continue; }
  if (existing.PrintGuideID === m.PrintGuideID && existing.Reason === m.Reason) continue;
  const was = t.get('print_guide', existing.PrintGuideID);
  if (was.SourceID !== OTHER) throw new Error(`${migration}: ${m.MaterialID} reads ${existing.PrintGuideID} of ${was.SourceID}; the data moved`);
  t.set('print_guide_materials', m.MaterialID, 'PrintGuideID', m.PrintGuideID, { expect: existing.PrintGuideID });
  t.set('print_guide_materials', m.MaterialID, 'Reason', m.Reason, { expect: existing.Reason });
  t.set('print_guide_materials', m.MaterialID, 'Reviewed by', REVIEWER, { expect: existing['Reviewed by'] });
  count('materials moved to the linked revision');
}

// ------------------------------------------------------------------------------------------- the two copies
const NOTES = {
  [GUIDE]: { role: 'cited', note: `Retrieved; re-fetched ${date} from the link Bambu Lab's Filament Guide page gives (${LINK}; B-FILAMENT-GUIDE-PAGE), SHA-256 unchanged since the 2026-09-10 reading: the revision Bambu Lab publishes, which print_guide rows PG016 to PG033 read (m209)` },
  [OTHER]: { role: 'cited', note: `Retrieved; re-fetched 2026-09-25, SHA-256 unchanged since the 2026-09-13 reading. Bambu Lab still serves this 15-column copy at its token URL, but its Filament Guide page links the 250123 revision (B-GUIDE, m209); rows PG001 to PG015 keep what it prints, and no material reads them` },
};
for (const [id, { role, note }] of Object.entries(NOTES)) {
  const s = t.get('sources', id);
  if (s['Citation role'] !== role) { t.set('sources', id, 'Citation role', role, { expect: s['Citation role'] }); count('citation roles'); }
  if (s['Access note'] !== note) { t.set('sources', id, 'Access note', note, { expect: s['Access note'] }); count('access notes'); }
}

if (changed) t.save();
for (const [k, n] of [...tally].sort()) console.log(`  ${n}\t${k}`);
console.log(`${migration}: ${changed} change(s)`);
