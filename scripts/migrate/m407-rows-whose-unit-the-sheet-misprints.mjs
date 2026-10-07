#!/usr/bin/env node
// Migration m407 (2026-10-07): four rows the quality round's readers read on the page image and no record held (item 6;
// D134). Each line is checked on the cached sheet.
//
// Polymaker's PolyFlex TPU95 sheet (V5.5) prints its stress at 400 % strain beside the 100, 200 and 300 % rows the
// reader round recorded (V013494 to V013496): a property of its own, "Tensile stress at 400 % elongation", like its
// siblings not a strength (D122). Two more of its rows print "MPa" where the label says otherwise: "Tensile strain (X-Y)
// … 33.6 ± 0.9 MPa", whose size sits between the 400 % stress and nothing else the sheet prints, and "Elongation at
// break (X-Y) … 551.2 ± 23.5 MPa", which its size makes a percentage (the product page prints 551.2 %, V013526). Eryone's
// PLA Light Weight sheet prints "Elongation at breakX-Y … MPa 3" beside its X-Z elongation in %. Which quantity each of
// these three is cannot be read from the page: they are held as printed with Data status "Unresolved unit / layout",
// which backs nothing, and the note says what the row probably is.
//
// The widened claim search found two values of Fiberlogy's IMPACT PLA page filed on Spectrum PLA Pro (below).
//
// The blind draw that closed the round found the melt volume row of a Raise3D sheet still holding a footnote mark in its
// standard cell, beside its melt flow row that m398 had cleaned; the same shape on 54 more rows is swept here (below).
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m407-rows-whose-unit-the-sheet-misprints.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { addValue } from './source-edits.mjs';
import { readStandards } from '../../build/src/normalize/standards.js';

const MIGRATION = 'm407';
const DATE = '2026-10-07';
const READ = 'Read 2026-10-07 on the page image by a Claude Sonnet reader (quality round, item 6), checked on the cached text, reviewed by Claude Opus.';
const t = openTables();
let changed = 0;

// The property, beside its siblings.
const PROPERTY = 'Tensile stress at 400 % elongation';
if (!t.rows('properties').some((p) => p.Property === PROPERTY)) {
  const sibling = t.rows('properties').find((p) => p.Property === 'Tensile stress at 300 % elongation');
  t.append('properties', { ...sibling, Property: PROPERTY, Description: 'The stress a tensile bar carries at 400 % elongation. Not a strength: no headline reads it (D122).' });
  changed++;
}

const TPU = 'S-POLYCN-TDS-Polymaker-PolyFlex-TPU95-V5-5-2025-12-29-EN';
const ERYONE = 'R-ERYONE-eryone-pla-light-weight-tds';
const ROWS = [
  { like: 'V013496', source: TPU, line: 'Stress at 400% strain (X-Y) ISO 37, GB/T 528 25.8 ± 0.4 MPa',
    set: { Property: PROPERTY, 'Raw value': '25.8 ± 0.4 MPa', 'Raw numeric': '25.8', 'Raw uncertainty ±': '0.4', 'Normalized value': '25.8', 'Normalized uncertainty ±': '0.4', Direction: 'XY', Locator: 'p. 1: Stress at 400% strain (X-Y)' },
    note: 'p. 1, "Stress at 400% strain (X-Y)": the page prints "25.8 ± 0.4 MPa".' },
  { like: 'V013496', source: TPU, line: 'Tensile strain (X-Y) ISO 37, GB/T 528 33.6 ± 0.9 MPa',
    set: { Property: 'Tensile strength (endpoint unspecified)', 'Data status': 'Unresolved unit / layout', 'Raw value': '33.6 ± 0.9 MPa', 'Raw numeric': '33.6', 'Raw uncertainty ±': '0.9', 'Normalized value': '33.6', 'Normalized uncertainty ±': '0.9', Direction: 'XY', Locator: 'p. 1: Tensile strain (X-Y)' },
    note: 'p. 1, "Tensile strain (X-Y)": the page prints "33.6 ± 0.9 MPa". A strain in megapascals: by its unit and its size above the 400 % stress it is probably the tensile strength, but the label says strain, so it is held unresolved and backs nothing.' },
  { like: 'V013496', source: TPU, line: 'Elongation at break (X-Y) ISO 37, GB/T 528 551.2 ± 23.5 MPa',
    set: { Property: 'Elongation at break', 'Data status': 'Unresolved unit / layout', 'Raw value': '551.2 ± 23.5 MPa', 'Raw unit': 'MPa', 'Raw numeric': '551.2', 'Raw uncertainty ±': '23.5', 'Normalized value': '551.2', 'Normalized uncertainty ±': '23.5', 'Normalized unit': '%', Direction: 'XY', Locator: 'p. 1: Elongation at break (X-Y)' },
    note: 'p. 1, "Elongation at break (X-Y)": the page prints "551.2 ± 23.5 MPa". An elongation in megapascals: by its size a percentage, as the product page prints it (551.2 %, V013526), but the unit cell says otherwise, so it is held unresolved and backs nothing.' },
  { like: 'V004823', source: ERYONE, line: '50mm/min GB/T 1040.4 MPa 3',
    set: { Property: 'Elongation at break', 'Data status': 'Unresolved unit / layout', 'Raw value': 'MPa 3', 'Raw unit': 'MPa', 'Raw numeric': '3', 'Normalized value': '3', 'Normalized unit': '%', Direction: 'XY', 'Standard / load': '50mm/min GB/T 1040.4', Standards: readStandards('50mm/min GB/T 1040.4').join('; '), Locator: 'p. 2: Elongation at breakX-Y 50mm/min GB/T 1040.4 MPa' },
    note: 'p. 2, "Elongation at breakX-Y": the page prints "50mm/min GB/T 1040.4 MPa 3", an elongation in megapascals beside its X-Z elongation in % (1.2 %, V004823); which the 3 is cannot be read, so it is held unresolved and backs nothing.' },
];
for (const r of ROWS) {
  onCachedSheet(t, r.source, r.line, MIGRATION);
  const id = addValue(t, { like: r.like, set: { SourceID: r.source, ...r.set }, migration: MIGRATION, date: DATE, why: 'published in the source, never transcribed.', note: `${r.note} ${READ}` });
  if (id) changed++;
}
// ---- a standard cell that starts with a stray digit -------------------------------------------------------------
// The blind draw read Raise3D's melt flow row right and found its sibling, the melt volume row, still holding the
// footnote mark the m398 fix took off the other ("1 ISO 1133"), and no test temperature. The same shape stands on 54
// more rows: a superscript of the unit above ("2 ISO 180" under "KJ/m2"), a footnote mark ("7 ISO 178" beside "dry7)"),
// the part number of "ISO 527-1,2" moved in front, a method number ("1 ISO 62" for "ISO 62: Method 1"). The typed
// Standards were right; the words were not the page's. Each cell becomes the words the page prints for the row, checked
// on its cached page, and the typed standards are read from them again.
const { readStandards: standardsOf } = await import('../../build/src/normalize/standards.js');
const { cachedText } = await import('../lib/pdf-text.mjs');
const sources = new Map(t.rows('sources').map((s) => [s.SourceID, s]));
const pageLines = (sourceId, page) => (cachedText(sources.get(sourceId)?.SHA256)?.pages?.[page - 1]?.lines ?? []).map((l) => l.text);
let swept = 0;
for (const m of t.rows('measurements').filter((r) => /^\d\s+(?:ISO|ASTM|DIN|GB)/.test(r['Standard / load']) && r['Data status'] !== 'Retired duplicate record')) {
  const page = Number(/^p\. ?(\d+)/.exec(m.Locator)?.[1] ?? 1);
  const lines = pageLines(m.SourceID, page);
  const before = m['Standard / load'];
  const stripped = before.replace(/^\d\s+/, '');
  // The page's own words for the row's standard: the locator's, where it quotes more of it than the cell holds.
  const quoted = /\(((?:ISO|ASTM|DIN)[^)]*)\)/.exec(m.Locator)?.[1] ?? /\b(ISO \d+: Method \d+)\b/.exec(m.Locator)?.[1];
  const words = quoted && quoted.startsWith(stripped.split(/[;,]/)[0]) ? quoted : stripped;
  if (!lines.some((l) => l.includes(words))) { console.warn(`${MIGRATION}: ${m.MeasurementID}: "${words}" is not printed on p. ${page}; left as it is`); continue; }
  t.set('measurements', m.MeasurementID, 'Standard / load', words, { expect: before, migration: MIGRATION });
  const typed = standardsOf(words).join('; ') || 'Not published';
  if (typed !== m.Standards) t.set('measurements', m.MeasurementID, 'Standards', typed, { expect: m.Standards, migration: MIGRATION });
  let note = `Corrected ${DATE} (${MIGRATION}): the standard cell held "${before}", a stray digit before the page's "${words}".`;
  // Raise3D's melt volume row shares its melt flow row's footnote: T = 210 °C, m = 5.0 kg.
  if (m.MeasurementID === 'V007102' && m['Test temperature'] === 'Not published') {
    t.set('measurements', m.MeasurementID, 'Test temperature', '210 °C', { expect: 'Not published', migration: MIGRATION });
    t.set('measurements', m.MeasurementID, 'Test temperature °C', '210', { expect: m['Test temperature °C'], migration: MIGRATION });
    note += ' The table\'s footnote 1 states the melt flow conditions, T = 210 °C and m = 5.0 kg, as V007101 records them.';
  }
  t.set('measurements', m.MeasurementID, 'Notes', `${m.Notes} ${note}`, { expect: m.Notes, migration: MIGRATION });
  swept++;
}
changed += swept;

// ---- a maker page's values on another maker's product ---------------------------------------------------------------
// The widened claim search read Fiberlogy's IMPACT PLA page under Spectrum PLA Pro (G001-16): the reader round (m342) had
// filed two of its values there. They are IMPACT PLA's (G001-55), and its data sheet holds the same two numbers
// (V005535, V005537), measured on annealed bars as the sheet says; the page repeats them without the state. They move to
// their product and are held once, as copies; the page's scope no longer names Spectrum PLA Pro.
const PAGE = 'D-FIBERLOGY-PLA-IMPACT-FILAMENT-PAGE';
for (const [copy, stays] of [['V013176', 'V005535'], ['V013178', 'V005537']]) {
  const m = t.get('measurements', copy);
  if (m.GradeID === 'G001-55' && m['Data status'] === 'Retired duplicate record') continue;
  const kept = t.get('measurements', stays);
  if (m.SourceID !== PAGE || m.GradeID !== 'G001-16' || kept.GradeID !== 'G001-55' || Number(kept['Normalized value']) !== Number(m['Normalized value'])) throw new Error(`${MIGRATION}: ${copy} or ${stays} moved`);
  t.set('measurements', copy, 'GradeID', 'G001-55', { expect: 'G001-16', migration: MIGRATION });
  t.set('measurements', copy, 'Data status', 'Retired duplicate record', { expect: m['Data status'], migration: MIGRATION });
  t.set('measurements', copy, 'Notes', `${m.Notes} Moved ${DATE} (${MIGRATION}) from Spectrum PLA Pro (G001-16) to Fiberlogy IMPACT PLA (G001-55), the product the page is, and retired: the page repeats its data sheet's ${m['Raw value']}, held as ${stays}, whose bars the sheet says were annealed.`, { expect: m.Notes, migration: MIGRATION });
  changed++;
}
const page = t.get('sources', PAGE);
if (/G001-16/.test(page['Applicable grades'])) {
  t.set('sources', PAGE, 'Applicable grades', 'M001 / G001-55', { expect: page['Applicable grades'], migration: MIGRATION });
  changed++;
}
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} change(s) (${swept} standard cell(s))`);
