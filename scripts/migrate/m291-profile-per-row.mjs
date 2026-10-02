#!/usr/bin/env node
// Migration m291 (2026-10-02): a nozzle temperature printed per print speed or per nozzle size is one profile per row,
// as the import has written it since Spectrum's and Polymaker's standard- and high-speed rows (propose.mjs,
// profilesFor). The profile root-cause sweep found three layouts the import read as one row:
//
//   - SUNLU prints "Nozzle Print Temp." and under it a "Zonal Temperature" table, a window per speed band
//     ("100-200mm/s | 265-280℃"). The profile kept the general window; each band whose window differs is its own profile.
//   - Recreus's Filaflex sheets print a block per nozzle size ("Nozzle 0.6 mm … Temperature 242 °C"), and the profile
//     held no nozzle at all. The profile takes the 0.4 mm block; each size whose temperature differs is its own profile.
//     Recreus's own print guide (P1313) prints the same as table rows.
//   - Polymaker's PolyTerra PLA prints "Classic :190-210 °C" and "High-speed: 210-230 °C" on two lines.
//   - colorFabb's lightweight filaments print an unfoamed and a foamed column ("Nozzle Temp. 210 260 ˚C"); the readers
//     proposed one window spanning both, which neither column states.
//
// A new profile copies its sheet's other settings from the profile beside it (the sheet prints them once for every
// row) and names its row in the Locator. Each row's words are checked on the cached sheet.
//
//   node scripts/migrate/m291-profile-per-row.mjs
import { openTables, nextId } from '../data/table-io.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { onSheet } from './m277-m279-sweep-shared.mjs';
import { retype } from './m290-profile-settings.mjs';

const MIGRATION = 'm291';
const t = openTables();
const pagesOf = (sourceId) => cachedText(t.get('sources', sourceId).SHA256).pages.map((p) => ({ page: p.page, lines: p.lines.map((l) => String(l.text ?? '').replace(/\s+/g, ' ').trim()) }));
let added = 0, set = 0;
const setCell = (id, column, value, expect) => { const r = t.get('profiles', id); if (r[column] === value) return; t.set('profiles', id, column, value, { expect: expect ?? r[column], migration: MIGRATION }); set++; };
/** A new profile for one row of the sheet, unless one already holds it. */
const addRow = (base, { nozzle, diameter, locator, quote }) => {
  if (t.rows('profiles').some((p) => p.GradeID === base.GradeID && p.SourceID === base.SourceID && p.Locator === locator)) return;
  onSheet(t, base.SourceID, quote, MIGRATION);
  const id = nextId('profiles', t.rows('profiles').map((p) => p.ProfileID));
  t.append('profiles', { ...base, ProfileID: id, 'Nozzle °C': nozzle, ...(diameter ? { 'Nozzle diameter': diameter } : {}), Locator: locator, 'Parse review': 'Not applicable' }, { migration: MIGRATION });
  retype(t, id, ['Nozzle °C'], MIGRATION);
  added++;
};

// SUNLU: the speed bands under "Zonal Temperature".
const TEMP = /^(\d+-\s*\d+℃)(?:\s+(\d+-\s*\d+mm\/s))?$/, SPEED = /^(\d+-\s*\d+mm\/s)(?:\s+(\d+-\s*\d+℃))?$/;
for (const id of ['P0763', 'P0764', 'P0767', 'P0769', 'P0771', 'P0777', 'P0784', 'P0788', 'P0790', 'P0791', 'P0792', 'P0794', 'P0804', 'P0805', 'P0811']) {
  const base = t.get('profiles', id);
  for (const { page, lines } of pagesOf(base.SourceID)) {
    const a = lines.findIndex((l) => /^Nozzle Print Temp\.$/.test(l)); if (a < 0) continue;
    const general = lines[a + 1];
    const temps = [], speeds = [];
    for (const l of lines.slice(a + 2, a + 14)) {
      if (/^Print Platform/.test(l)) break;
      let m = TEMP.exec(l); if (m) { temps.push(m[1]); if (m[2]) speeds.push(m[2]); continue; }
      m = SPEED.exec(l); if (m) { speeds.push(m[1]); if (m[2]) temps.push(m[2]); }
    }
    if (temps.length !== speeds.length) throw new Error(`${MIGRATION}: ${id} reads ${temps.length} windows for ${speeds.length} speeds`);
    temps.forEach((temp, i) => {
      if (temp.replace(/\s/g, '') === general.replace(/\s/g, '')) return;
      addRow(base, { nozzle: temp, locator: `p. ${page}: Recommended Printing Parameters: Zonal Temperature, ${speeds[i]}`, quote: `Zonal Temperature | ${speeds[i]} | ${temp}` });
    });
  }
}

// Recreus: a block per nozzle size.
for (const id of ['P0612', 'P0684', 'P0686', 'P0692', 'P0981', 'P0999', 'P1032']) {
  const blocks = [];
  for (const { page, lines } of pagesOf(t.get('profiles', id).SourceID)) lines.forEach((l, i) => {
    let m = /^Nozzle (\d\.\d) mm$/.exec(l); if (m) blocks.push({ page, diameter: `${m[1]} mm` });
    m = /^Temperature (\d{3}) °C$/.exec(l); if (m && blocks.length && !blocks.at(-1).temp) blocks.at(-1).temp = `${m[1]} °C`;
  });
  if (blocks[0]?.diameter !== '0.4 mm' || blocks.some((b) => !b.temp)) throw new Error(`${MIGRATION}: ${id} blocks ${JSON.stringify(blocks)}`);
  const [first, ...rest] = blocks;
  onSheet(t, t.get('profiles', id).SourceID, `Nozzle 0.4 mm | Temperature ${first.temp}`, MIGRATION);
  setCell(id, 'Nozzle °C', first.temp, 'Not published'); setCell(id, 'Nozzle diameter', first.diameter, 'Not published');
  if (!/Nozzle 0\.4 mm/.test(t.get('profiles', id).Locator)) setCell(id, 'Locator', `${t.get('profiles', id).Locator}; p. ${first.page}: Nozzle 0.4 mm`);
  retype(t, id, ['Nozzle °C'], MIGRATION);
  const base = t.get('profiles', id);
  for (const b of rest) if (b.temp !== first.temp) addRow(base, { nozzle: b.temp, diameter: b.diameter, locator: `p. ${b.page}: Recommended printing settings: Nozzle ${b.diameter}`, quote: `Nozzle ${b.diameter} | Temperature ${b.temp}` });
}
// Recreus's print guide prints the sizes as table rows ("0.8mm 0.4mm 0.78mm 16.0 mm³/s 252°C").
{
  const base = t.get('profiles', 'P1313');
  for (const [diameter, row, temp] of [['0.8mm', '0.8mm 0.4mm 0.78mm 16.0 mm³/s 252°C', '252°C'], ['1.0mm', '1.0mm 0.5mm 0.98mm 25.0 mm³/s 255°C', '255°C']]) {
    addRow(base, { nozzle: temp, diameter, locator: `p. 1: Complete Technical Printing Guide: nozzle ${diameter} row`, quote: row });
  }
}

// Polymaker PolyTerra PLA: the high-speed line.
addRow(t.get('profiles', 'P0002'), { nozzle: 'High-speed: 210-230 °C', locator: 'Recommended printing settings: Nozzle temperature, High-speed', quote: 'Nozzle temperature Classic :190-210 °C | High-speed: 210-230 °C' });

// colorFabb's lightweight filaments print a column per state under "Guideline for print settings": "Value unfoamed @ 210 |
// Value foamed @ 260", "Nozzle Temp. 210 260 ˚C". The product is meant to foam (D95), and each column is a setup; the
// profile kept the unfoamed one and says so, and the foamed one is its own.
for (const id of ['P0495', 'P0498', 'P0508', 'P0511']) {
  const base = t.get('profiles', id);
  const lines = pagesOf(base.SourceID).flatMap((p) => p.lines.map((l) => ({ page: p.page, l })));
  const head = lines.find((x) => /^Value unfoamed @ (\d{3}) Value foamed @ (\d{3}) Unit$/.test(x.l));
  const row = lines.find((x) => /^Nozzle Temp\. (\d{3}) (\d{3}) ˚C$/.test(x.l));
  if (!head || !row) throw new Error(`${MIGRATION}: ${id} does not print the two columns`);
  const [, unfoamed, foamed] = /^Nozzle Temp\. (\d{3}) (\d{3}) ˚C$/.exec(row.l);
  if (base['Nozzle °C'] !== `${unfoamed} °C`) throw new Error(`${MIGRATION}: ${id} holds ${base['Nozzle °C']}`);
  const named = `p. ${row.page}: Guideline for print settings: Nozzle Temp., unfoamed column (Value unfoamed @ ${unfoamed})`;
  if (base.Locator !== named) setCell(id, 'Locator', named);
  addRow(t.get('profiles', id), { nozzle: `${foamed} ˚C`, locator: `p. ${row.page}: Guideline for print settings: Nozzle Temp., foamed column (Value foamed @ ${foamed})`, quote: `Value foamed @ ${foamed} | Nozzle Temp. ${unfoamed} ${foamed} ˚C` });
}

t.save();
console.log(`${MIGRATION}: ${added} profiles added, ${set} cells written`);
