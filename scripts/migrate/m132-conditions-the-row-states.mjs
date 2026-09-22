#!/usr/bin/env node
// Migration m132 (2026-09-21): conditions a row's own line states and the record does not (PLAN-REMAINING 2.3).
//
// The sweep's reading found an impact value whose line says "Charpy Notched", two heat deflections whose load stands
// on the line below, impact tests at -30 °C and 25 °C, two melt flow conditions and five water uptakes that are an
// equilibrium at 70 % RH. Counted across the table, from each row's own printed line:
//
//   - notch: 30 impact rows recorded "Not published" whose line says notched or unnotched, in words or by ISO 179's
//     method letter (1eA, 1eU); FormFutura's template prints "ISO 179 Charpy Notched @23° C" on every sheet.
//   - load: 18 heat deflections recorded without one, 17 of them Fabru's purefil sheets, which print the load and the
//     standard on the line below the value ("Heat deflection temperature 115 °C" / "0.45 MPa (ISO 75-2)"), and
//     Raise3D's Premium ABS ("ISO 75 0.45MPa 98").
//   - test temperature: 8 of Fillamentum's impact rows, which print it beside the notch ("23 °C, notched").
//
// The rest are single rows the sweep read: Helios Support's melt flow at 260 °C/5 kg, Eryone's Hyper-Speed PLA melt
// flow printed under two conditions (the row had kept one of them), Filament2Print's PEEK elongation measured on
// printed XY bars, and Polymaker's equilibrium water absorption (the sheet's curve is at 70 % RH and 23 °C, not a
// 24 h immersion).
//
// Standard / load is the sheet's own words; Standards and Test load MPa beside it are what the parsers read from them.
//
//   node scripts/migrate/m132-conditions-the-row-states.mjs

import { openTables } from '../data/table-io.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { correct } from './source-edits.mjs';
import { readStandards } from '../../build/src/normalize/standards.js';
import { parseHdtStandard } from '../../build/src/normalize/thermal.js';

const migration = 'm132-conditions-the-row-states';
const date = '2026-09-21';
const NP = 'Not published';
const t = openTables();
const cache = new Map();
const linesOf = (sid) => {
  if (!cache.has(sid)) {
    const s = t.find('sources', sid);
    let x = null;
    try { x = cachedText(s.SHA256).pages.flatMap((p) => p.lines.map((l) => (typeof l === 'string' ? l : l.text))); } catch {}
    cache.set(sid, x);
  }
  return cache.get(sid);
};
const lineOf = (m) => {
  const ls = linesOf(m.SourceID);
  if (!ls) return [null, -1];
  const label = m.Locator.replace(/^p\. ?\d+: ?/, '').trim().slice(0, 22).toLowerCase();
  const num = String(m['Raw numeric']).replace(/\.0+$/, '');
  return [ls, ls.findIndex((l) => l.toLowerCase().includes(label) && l.includes(num))];
};
const standards = (text) => readStandards(text).join('; ') || NP;
const tally = {};
let changed = 0;
const done = (k, n) => { tally[k] = (tally[k] ?? 0) + n; changed += n; };

for (const m of t.rows('measurements')) {
  if (!/^Published value/.test(m['Data status'])) continue;
  if (/Charpy|Izod|Impact strength/.test(m.Property) && m.Notch === NP) {
    const [ls, i] = lineOf(m);
    if (i >= 0) {
      const l = ls[i];
      const notch = /\bun-?notched\b|\b1eU\b/i.test(l) ? 'Unnotched' : /\bnotched\b|\b1eA\b/i.test(l) ? 'Notched' : null;
      if (notch) done('notch', correct(t, { source: m.SourceID, ids: [m.MeasurementID], migration, date, set: { Notch: [NP, notch] }, note: `the row's own line says it: "${l.trim().slice(0, 120)}".` }));
    }
  }
  if (m.Property === 'HDT' && m['Test load MPa'] === NP) {
    const [ls, i] = lineOf(m);
    if (i >= 0) {
      const own = parseHdtStandard(ls[i]).loadStated ? ls[i] : null;
      // The load line stands one or two lines down: a two-column layout puts the drying time between.
      const below = [ls[i + 1], ls[i + 2]].map((l) => (l ?? '').trim()).find((l) => /^[01][.,]\d+ ?MPa \((?:ISO|ASTM)[^)]*\)$/.test(l));
      const words = own
        ? own.replace(/^.*?(ISO|ASTM)/, '$1').replace(/\s+\d+(?:[.,]\d+)?\s*$/, '').trim()
        : below ?? null;
      const load = words ? parseHdtStandard(words) : null;
      if (load?.loadStated) {
        done('load', correct(t, { source: m.SourceID, ids: [m.MeasurementID], migration, date,
          set: { 'Standard / load': [m['Standard / load'], words], Standards: [m.Standards, standards(words)], 'Test load MPa': [NP, String(load.loadMPa)] },
          note: own ? `the row's own line names the load: "${own.trim()}".` : `the sheet prints the load and the standard on the line below the value: "${ls[i].trim()}" / "${below}".` }));
      }
    }
  }
  if (/Charpy|Izod/.test(m.Property) && m['Test temperature'] === NP) {
    const [ls, i] = lineOf(m);
    if (i >= 0) {
      const l = `${ls[i]} ${ls[i + 1] ?? ''}`;
      const tt = /(-?\d+)\s*°C,\s*(?:un)?notched/i.exec(l);
      if (tt) done('test temperature', correct(t, { source: m.SourceID, ids: [m.MeasurementID], migration, date, set: { 'Test temperature': [NP, `${tt[1]}°C`] }, note: `the row's own line gives the test temperature: "${l.trim().slice(0, 120)}".` }));
    }
  }
}

// The single rows the sweep read.
done('melt flow', correct(t, { source: 'S-PET-TDS-Helios-Support', ids: ['V010019'], migration, date,
  set: { 'Standard / load': ['ISO 1133', 'ISO 1133 260° C/5Kg'], 'Test temperature': [NP, '260°C'] },
  note: 'the line prints "Melt flow rate 58 g/10min ISO 1133 260° C/5Kg": the condition explains the high flow.' }));
done('melt flow', correct(t, { source: 'R-ERYONE-eryone-hs-pla-tds', ids: ['V004935'], migration, date,
  set: { 'Test temperature': ['220°C', NP] },
  note: 'the line prints "Melt Index(g/10 min) 220 ° C, 10kg 240 ° C, 2.16 kg g/10min 42±4": one value under two conditions, and the sheet does not say which it was measured at; the row had kept the first.' }));
done('printed XY', correct(t, { source: 'R-FILAMENT2PRINT-PEEK-EV-Nat', ids: ['V008881'], migration, date,
  set: { Direction: ['Unstated', 'XY'], 'Standard / load': [NP, '5mm/min, Orientation XY DIN EN ISO 527-2'], Standards: [NP, 'ISO 527'] },
  note: 'the line prints "Elongation at break (tensile test) 5mm/min, Orientation XY 119,5 % DIN EN ISO 527-2".' }));
for (const [source, id] of [
  ['S-POLYCN-TDS-Polymaker-PolyMax-PETG-V5-5-2026-01-06-EN', 'V004012'],
  ['S-POLYCN-TDS-Polymaker-PolyLite-PETG-V6-0-2026-06-09-EN', 'V003403'],
  ['S-POLYCN-PolyLite-PETG-TDS-V5-2', 'V003982'],
  ['S-POLYCN-TDS-Polymaker-PolyMax-PC-FR-V5-5-2026-01-06-EN', 'V003882'],
]) {
  done('water uptake', correct(t, { source, ids: [id], migration, date,
    set: { 'Standard / load': [NP, 'Equilibrium water absorption'] },
    note: 'the sheet prints the value as its equilibrium water absorption, read from its moisture absorption curve at 70%RH - 23°C, as the other Polymaker rows of this property record it.' }));
}

// A heat deflection at 0.45 MPa headline that selected a row now known to be at 1.8 MPa keeps it as context.
const at18 = new Set(t.rows('measurements').filter((m) => m.Property === 'HDT' && m['Test load MPa'] === '1.8').map((m) => m.MeasurementID));
for (const h of t.rows('headlines').filter((h) => h.HeadlineKey === 'hdt045' && h.Use === 'value' && at18.has(h.MeasurementID))) {
  t.update('headlines', { MaterialID: h.MaterialID, HeadlineKey: h.HeadlineKey, MeasurementID: h.MeasurementID }, 'Use', 'context', { expect: 'value' });
  console.log(`  ${h.MaterialID} hdt045: ${h.MeasurementID} is at 1.8 MPa; now context`);
  changed++;
}

if (changed) t.save();
for (const [k, v] of Object.entries(tally)) console.log(`  ${v}\t${k}`);
console.log(`${migration}: ${changed} row(s) given the conditions their lines state`);
