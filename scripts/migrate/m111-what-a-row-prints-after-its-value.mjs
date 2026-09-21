#!/usr/bin/env node
// Migration m111 (2026-09-21): three conditions the sheets print and the rows did not record.
//
// Batch b28 put two LEHVOSS heat deflections forward as headlines, and reading why showed three reader gaps, each a
// class in the data already recorded. Each was counted across the whole table before this was written, and each is
// closed in the reader in the same change (propose.mjs), so the class cannot re-enter:
//
//   1. **53 moulded bars recorded as an unstated specimen (9 sources).** LEHVOSS names its specimens by the
//      standard that moulds them — "MPTS ISO 3167 A", ISO's injection-moulded multipurpose bar — or says "molded
//      sample". Read as unstated, a moulded LUVOCOM bar stood where a printed part could. They are Raw material
//      values now (D55).
//
//   2. **58 heat deflections whose label names the method (58 sources).** ISO 75 names its methods by their
//      loads — A is 1.80 MPa, B 0.45 — and Spectrum prints "Heat distortion temperature (HDT A)", Extrudr
//      "HDT/B", LEHVOSS "HDT A ISO 75". The letter stayed with the label, so each row stated no load and could
//      screen no heat requirement (D65). The method now carries the letter the sheet prints, and the typed load
//      follows from it.
//
//   3. **38 heat deflections whose load follows the value.** Fillamentum prints "Heat distortion temperature 119
//      °C ISO 75 0.45 MPa", eSUN "Heat distortion Temperature 89 ℃（0.45Mpa）": value, method, condition. The reader
//      kept only what stood before the value. Each row's line is re-read from its cached, hash-checked source
//      (D35), and the load it prints is written into its method and typed.
//
// Two headlines rested on LEHVOSS bars that are both moulded and tested at 1.80 MPa (PAHT's heat deflection and
// density, PAHT-CE's heat deflection). A moulded bar backs no printed headline (D55), so the three rows are cited
// as context and PAHT and PAHT-CE are estimated, as materials whose sheets publish no printed part are.
//
//   node scripts/migrate/m111-what-a-row-prints-after-its-value.mjs

import { openTables } from '../data/table-io.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { parseHdtStandard } from '../../build/src/normalize/thermal.js';

const DATE = '2026-09-21';
const t = openTables();
const measurements = t.rows('measurements');
const sources = new Map(t.rows('sources').map((s) => [s.SourceID, s]));
let changed = 0;
// A note quotes the sheet's words in the table's own typesetting: a full-width bracket is a bracket (TEXT-FULLWIDTH)
// and a run of spaces one space (TEXT-SPACING).
const plain = (s) => String(s ?? '').replace(/[（）：，％]/g, (c) => ({ '（': '(', '）': ')', '：': ':', '，': ',', '％': '%' })[c]).replace(/\s+/g, ' ').trim();
const note = (m, sentence) => plain(/^(Not applicable|Not published|)$/.test(m.Notes ?? '') ? sentence : `${m.Notes} ${sentence}`);
const setNote = (m, sentence) => { const next = note(t.get('measurements', m.MeasurementID), sentence); t.set('measurements', m.MeasurementID, 'Notes', next, { expect: t.get('measurements', m.MeasurementID).Notes }); };

// 1. Moulded bars.
const MOULDED = /\bmou?lded (?:sample|specimen|bar|test)|\bMPTS\b|\bISO\s?3167\b/i;
for (const m of measurements) {
  if (!/^Not published/.test(m['Specimen type'])) continue;
  if (!(MOULDED.test(m.Locator) || MOULDED.test(m['Standard / load']) || /3167/.test(m.Standards))) continue;
  t.set('measurements', m.MeasurementID, 'Specimen type', 'Raw material value', { expect: m['Specimen type'] });
  setNote(m, `Specimen type set to Raw material value (m111): the sheet names the bar "${(MOULDED.exec(m.Locator) ?? MOULDED.exec(m['Standard / load']) ?? ['ISO 3167'])[0]}", ISO's injection-moulded test specimen.`);
  changed++;
}

// 2. A method letter in the label.
const LETTER = /\bHDT\s*[/-]?\s*\(?\s*([AB])\b(?![/.])/;
const LOAD = { A: '1.8', B: '0.45' };
for (const m of measurements) {
  if (m.Property !== 'HDT' || m['Test load MPa'] !== 'Not published') continue;
  const letter = LETTER.exec(m.Locator)?.[1];
  if (!letter) continue;
  const was = t.get('measurements', m.MeasurementID)['Standard / load'];
  const method = /^Not published$/.test(was) ? `HDT ${letter}` : `HDT ${letter} ${was}`;
  t.set('measurements', m.MeasurementID, 'Standard / load', method, { expect: was });
  t.set('measurements', m.MeasurementID, 'Test load MPa', LOAD[letter], { expect: 'Not published' });
  setNote(m, `Method and load from the label (m111): the sheet prints "HDT ${letter}", which ISO 75 defines as ${LOAD[letter]} MPa (D65).`);
  changed++;
}

// 3. A load printed after the value, re-read from the source.
const A_LOAD = /[（(]?\s*(\d+(?:[.,]\d+)?)\s*(?:MPa|MN\s?\/\s?m\s?2|N\s?\/\s?mm\s?2)\s*[)）]?/i;
for (const m of measurements) {
  const row = t.get('measurements', m.MeasurementID);
  if (row.Property !== 'HDT' || row['Test load MPa'] !== 'Not published') continue;
  const source = sources.get(row.SourceID);
  const text = source && /^[0-9a-f]{64}$/.test(source.SHA256) ? cachedText(source.SHA256) : null;
  if (!text) continue;
  const page = Number(/^p\. (\d+)/.exec(row.Locator)?.[1]);
  const label = row.Locator.replace(/^p\. \d+:\s*/, '');
  const number = String(row['Raw numeric']).replace(/\.0$/, '');
  const line = (text.pages.find((p) => p.page === page)?.lines ?? []).map((l) => String(l.text ?? '')).find((l) => l.includes(label) && l.includes(number));
  if (!line) continue;
  const after = line.slice(line.indexOf(number, line.indexOf(label) + label.length) + number.length);
  const load = A_LOAD.exec(after);
  if (!load) continue;
  const printed = load[0].replace(/^[\s（(]+|[\s)）]+$/g, '');
  const was = row['Standard / load'];
  const method = /^Not published$/.test(was) ? printed : `${was} ${printed}`;
  // The typed load is the load class the build's own parser reads from those words: ASTM D648's 1.82 MPa is the
  // 1.8 MPa class every other row of it records (PARSE-MISMATCH).
  const parsed = parseHdtStandard(method);
  if (!parsed.loadStated) continue;
  const value = String(parsed.loadMPa);
  t.set('measurements', row.MeasurementID, 'Standard / load', method, { expect: was });
  t.set('measurements', row.MeasurementID, 'Test load MPa', value, { expect: 'Not published' });
  setNote(row, `Load re-read from the source (m111): the line prints "${line.trim().slice(0, 90)}", the load after the value.`);
  changed++;
}

// 4. A moulded bar at 1.80 MPa backs no printed headline.
for (const [material, key, id] of [['M147', 'density', 'V009643'], ['M147', 'hdt045', 'V009650'], ['M148', 'hdt045', 'V009734']]) {
  const h = t.rows('headlines').find((x) => x.MaterialID === material && x.HeadlineKey === key && x.MeasurementID === id);
  if (!h || h.Use === 'context') continue;
  if (t.update('headlines', { MaterialID: material, HeadlineKey: key, MeasurementID: id }, 'Use', 'context', { expect: 'value' })) changed++;
}

// A load an earlier run of this migration typed as printed rather than as the parser's class.
for (const m of measurements) {
  if (m.Property !== 'HDT' || !/\(m111\)/.test(m.Notes ?? '') || m['Test load MPa'] === 'Not published') continue;
  const parsed = parseHdtStandard(m['Standard / load']);
  if (!parsed.loadStated || String(parsed.loadMPa) === m['Test load MPa']) continue;
  t.set('measurements', m.MeasurementID, 'Test load MPa', String(parsed.loadMPa), { expect: m['Test load MPa'] });
  changed++;
}

// A note an earlier run of this migration wrote before it quoted in the table's own typesetting.
for (const m of measurements) {
  if (!/\(m111\)/.test(m.Notes ?? '') || plain(m.Notes) === m.Notes) continue;
  t.set('measurements', m.MeasurementID, 'Notes', plain(m.Notes), { expect: m.Notes });
  changed++;
}

if (changed) t.save();
console.log(`m111: ${changed} change(s) (${DATE})`);
