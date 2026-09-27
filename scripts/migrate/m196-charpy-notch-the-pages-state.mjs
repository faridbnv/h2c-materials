#!/usr/bin/env node
// Migration m196 (2026-09-27): the notch each Charpy row's page states (phase 6, final round; OPEN-PROBLEMS §18; D92).
//
// The notched Charpy impact strength (D92) takes only a bar stated to be notched. 164 active Charpy rows (75 products
// with no notched value) were recorded with no notch stated, and nine rows labelled notched cite ISO 179/1eU, the
// unnotched method. Each row's heading was re-read on its hash-checked, cached page, with the lines around it. The notch
// is set only where the page states it: in the row's own words ("notched", "unnotched", the Chinese 缺口冲击强度, which is
// "notched impact strength"), in a "(notched)" Bambu Lab prints under the one value of a two-value cell it qualifies, or
// in the method designation ISO 179 eA (notched) or eU (unnotched), as the import's reader reads it (notchOf). Nothing
// is inferred from a value's size, a maker's other sheets or an abbreviation the page does not spell out (colorFabb's
// "Ch-N" stays as it is).
//
//   Notched     Bambu Lab's four newer sheets (PC, PETG Translucent, PLA Basic, PLA Tough): the XY cell prints two values
//               and "(notched)" under the second, which the row recorded; iSANMATE TPU ("Charpy Impact Strength, notched
//               (at 23 C)", no value); BASF's ASA, PET CF15 and PAHT CF15 extended sheets ("(notched)" under the row);
//               Fillamentum ABS Extrafill ("ISO 179 23 °C, notched"); QIDI's Odorless ABS and PLA-CF (缺口冲击强度); the
//               High Gloss PLA sheet ("ISO 179 1eA Charpy").
//   Unnotched   colorFabb PLA-PHA and Spectrum Wood ("ISO 179-1/1 eU" beside their "Notched impact strength ... eA"
//               row); Fillamentum NonOilen, Nylon AF80 and Nylon CF15 ("unnotched"); Nanovia PLA XRS's "Charpy full",
//               which the import recorded notched from its method (ISO 179-1eA): the page swaps the two designations
//               ("Charpy notched 1.8 ... 1eU", "Charpy full 12 ... 1eA"), and its own words for each row are kept, as
//               for its notched row.
//
// Where the same line states more the row had lost, that is set too, and only that: BASF's impact table heads its first
// column "XY-Direction" and says its specimens "are produced with the Fused Filament Fabrication method" (a printed bar,
// in XY), and labels PAHT CF15's row "(notched) conditioned"; QIDI prints "(X-Y)" under each value.
//
// The nine notched rows citing 1eU: every page labels the row notched and prints an unnotched row beside it, several
// times higher (139 NB, 75, 60, 25, 25 and 12 kJ/m² against 6.8, 15, 4, 4, 7.5 and 1.8), so the label stands and the
// method is the sheet's slip. They keep Notched; each gains a note saying so. The rows elsewhere that state no notch
// keep Not published: Bambu Lab's Z values and the first of each XY pair, Polymaker's "(X-Y)" rows beside a separate
// "(X-Y) notched" row, Raise3D, SIRAYA, eryone, CreatBot, IPCON, PROGRAFEN, Braskem and Spectrum's plain "Charpy".
//
// The reader is an AI agent (claude-opus-5.5, agent reviewer), not a person. Each line is checked on its page before
// anything is written. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m196-charpy-notch-the-pages-state.mjs

import { openTables } from '../data/table-io.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { correct, withNote } from './source-edits.mjs';

const migration = 'm196-charpy-notch-the-pages-state';
const date = '2026-09-27';
const READER = 'Re-read by an AI agent (claude-opus-5.5, agent reviewer), not a person.';
const NP = 'Not published';
const t = openTables();

// A page's lines as a reader sees them: full-width punctuation and ㎡ in their plain forms, spaces collapsed.
const norm = (s) => String(s).normalize('NFKC').replace(/\s+/g, ' ').trim();
const pageLines = (sourceId, page) => {
  const s = t.get('sources', sourceId);
  const text = cachedText(s.SHA256);
  if (!text) throw new Error(`${migration}: ${sourceId} has no cached text for ${s.SHA256}; fetch and extract it first`);
  const p = text.pages.find((x) => x.page === page);
  if (!p) throw new Error(`${migration}: ${sourceId} has no page ${page}`);
  return p.lines.map((l) => norm(typeof l === 'string' ? l : l.text));
};
// The lines stand on the page in order, each within `gap` lines of the one before (a side column can fall between).
function printed(sourceId, page, want, gap = 4) {
  const lines = pageLines(sourceId, page);
  const w = want.map(norm);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== w[0]) continue;
    let at = i, ok = true;
    for (const x of w.slice(1)) {
      const k = lines.findIndex((l, j) => j > at && j <= at + gap && l === x);
      if (k < 0) { ok = false; break; }
      at = k;
    }
    if (ok) return true;
  }
  throw new Error(`${migration}: ${sourceId} p. ${page} does not print, in order: ${w.map((x) => `"${x}"`).join(', ')}`);
}
const saysOnPage = (sourceId, page, words) => {
  const joined = pageLines(sourceId, page).join(' ');
  for (const w of words) if (!joined.includes(w)) throw new Error(`${migration}: ${sourceId} p. ${page} does not say "${w}"`);
};

const quote = (lines) => lines.map((l) => `"${norm(l)}"`).join(' / ');
const FFF = ['specimens are produced', 'with the Fused Filament', 'Fabrication method.'];
const EDITS = [
  // Bambu Lab: a two-value XY cell, "(notched)" under the value the row holds.
  { id: 'V007849', source: 'B-PC-Bambu-PC-Technical-Data-Sheet', page: 2, lines: ['Impact Strength (X-Y) ISO 179, GB/T 1043', '7.5 ± 1.3 kJ/m²', '(notched)'], notch: 'Notched' },
  { id: 'V007795', source: 'B-PC-Bambu-PETG-Translucent-Technical-Data-Sheet', page: 2, lines: ['Impact Strength (X-Y) ISO 179, GB/T 1043 8.6 ± 2.1 kJ/m²', '(notched)'], notch: 'Notched' },
  { id: 'V007573', source: 'B-PC-Bambu-PLA-Basic-Technical-Data-Sheet', page: 2, lines: ['Impact Strength (X-Y) ISO 179, GB/T 1043 7.9 ± 1.2 kJ/m²', '(notched)'], notch: 'Notched' },
  { id: 'V007755', source: 'B-PC-new-Bambu-PLA-Tough-Technical-Data-Sheet', page: 2, lines: ['Impact Strength (X-Y) ISO 179, GB/T 1043 72.3 ± 6.1 kJ/m²', '(notched)'], notch: 'Notched' },
  // A row that publishes no value, but names its notch.
  { id: 'V000764', source: 'I-TPU-TDS', page: 1, lines: ['Charpy Impact Strength, notched (at 23 C)', '- -'], notch: 'Notched' },
  // BASF's extended sheets: a row per notch, three direction columns, and specimens made by FFF.
  { id: 'V007801', source: 'R-BASF-ExtendedTDS-Ultrafuse-ASA-V2-1', page: 5, lines: ['XY-Direction XZ-Direction ZX-Direction tions in the listed stand-', 'ards. The used speci-', '2 2 mens are produced', 'Impact Strength Charpy ISO 179-2 8.6 kJ/m 7.8 kJ/m -', 'with the Fused Filament', '(notched)'],
    notch: 'Notched', direction: 'XY', printed: ['mens are produced', 'with the Fused Filament', 'Fabrication method.'] },
  { id: 'V007696', source: 'R-BASF-ExtendedTDS-Ultrafuse-PET-CF15-V1-4', page: 5, lines: ['XY- XZ- ZX-', 'of the many', 'Direction Direction Direction factors that may affect', 'processing and', '2 2 2', 'application of our product,', 'Impact Strength Charpy ISO 179-2 5.4 kJ/m 4.8 kJ/m 0.5 kJ/m', 'these data do not relieve', '(notched)'],
    notch: 'Notched', direction: 'XY', printed: FFF },
  { id: 'V007632', source: 'R-BASF-ExtendedTDS-Ultrafuse-PAHT-CF15-V1-5', page: 6, lines: ['XY- XZ- ZX-', 'existing laws and', 'Direction Direction Direction', 'legislation are observed.', 'Values in this document', '2 2 2', 'Impact Strength Charpy ISO 179-2 5.1 kJ/m 5.3 kJ/m 1.6 kJ/m', 'are average values,', '6)', 'measured and calculated', '(notched) conditioned'],
    notch: 'Notched', direction: 'XY', printed: FFF, conditioned: 'Conditioned (the row\'s own label, "(notched) conditioned", footnote 6)',
    parseReview: ['The sheet prints three values on this row and names no column; the recorded number is the one its line kept. Which specimen and which build direction it belongs to is not settled by this sheet.', 'Not applicable'] },
  { id: 'V006086', source: 'R-FILLAMENTUM-Technical-Data-Sheet-ABS-Extrafill-03012019-1', page: 1, lines: ['25 kJ/m ISO 179 23 °C, notched', 'Fillamentum guarantees high precision of', 'Charpy impact strength'], notch: 'Notched' },
  { id: 'V008063', source: 'R-QIDI-ODORLESS-ABS', page: 3, lines: ['缺口冲击强度', '20.03±1.32 KJ/m2', 'Charpy impact strength ISO 179', '(X-Y)'], notch: 'Notched', direction: 'XY' },
  { id: 'V008122', source: 'R-QIDI-PLA-CF', page: 2, lines: ['缺口冲击强度 (X-Y)', '6.65±0.38 KJ/m2', 'Charpy impact strengthISO 179', '(X-Y)'], notch: 'Notched', direction: 'XY' },
  { id: 'V009518', source: 'S-PET-TDS-High-Gloss-PLA', page: 1, lines: ['Impact strength 2,6 KJ/m² ISO 179 1eA Charpy @23° C (73° F)'], notch: 'Notched' },
  // Unnotched, in the row's own words or its method's.
  { id: 'V009454', source: 'R-COLORFABB-colorFabb-PLA-PHA-Printing-Filament-TDS', page: 1, lines: ['Notched impact strength (Charpy), RT kJ/m² 2,8 ISO 179-1/1 eA', 'Impact strength (Charpy), RT kJ/m² 30,8 ISO 179-1/1 eU'], notch: 'Unnotched' },
  { id: 'V004043', source: 'S-SPECTRUM-en-tds-spectrum-wood', page: 1, lines: ['Notched impact strength (Charpy), RT 4.4 kJ/m2 ISO 179-1/1 eA', '• made of biodegradable raw materials', 'Impact Strength (Charpy), RT 21 kJ/m2 ISO 179-1/1 eU'], notch: 'Unnotched' },
  { id: 'V009502', source: 'R-FILLAMENTUM-Technical-Data-Sheet-NonOilen-EN-03082020-FfN', page: 1, lines: ['25.6 kJ/m ISO 179 23 °C, unnotched', 'Charpy impact strength'], notch: 'Unnotched' },
  { id: 'V010335', source: 'R-FILLAMENTUM-Technical-Data-Sheet-Nylon-AF80-Aramid', page: 1, lines: ['53,2 kJ/m ISO 179 20 °C, unnotched', 'Charpy impact resistance'], notch: 'Unnotched' },
  { id: 'V010097', source: 'R-FILLAMENTUM-Technical-Data-Sheet-Nylon-CF15-Carbon-03012019', page: 1, lines: ['Charpy impact resistance 86,2 kJ/m ISO 179 25 °C, unnotched'], notch: 'Unnotched' },
  { id: 'V009221', source: 'R-NANOVIA-PLA-XRS', page: 1, lines: ['Charpy notched 1.8 kJ/m 2 ISO 179-1eU at 23 °C', 'Charpy full 12 kJ/m 2 ISO 179-1eA at 23 °C'], notch: 'Unnotched', from: 'Notched',
    why: 'the page labels this row "Charpy full", a bar without a notch, and prints 12 kJ/m² against 1.8 for its "Charpy notched" row; the two method designations are swapped on the page, and the row keeps its own word, as V009220 does' },
];

// The nine notched rows whose sheets cite the unnotched method: the label stands.
const NINE = [
  { id: 'V002346', source: 'R-FORMFUTURA-STYX-PA6-TDS', page: 1, lines: ['Charpy unnotched impact strength, 23°C 139 NB kJ/m', 'ISO 179/1eU', '2', 'Charpy notched impact strength, 23°C 6,8 kJ/m', 'ISO 179/1eU'], pair: '139 NB (no break)' },
  { id: 'V002992', source: 'S-SPECTRUM-en-tds-spectrum-pa6-low-warp', page: 1, lines: ['Charpy unnotched impact strength, 23°C 139 NB kJ/m2 ISO 179/1eU', '• wide variety of applications', 'Charpy notched impact strength, 23°C 6,8 kJ/m2 ISO 179/1eU'], pair: '139 NB (no break)' },
  { id: 'V006515', source: 'S-SPECTRUM-EN-TDS-Spectrum-PA12-CF15', page: 1, lines: ['Charpy Impact Strength 75 kJ/m2 ISO 179/1eU', 'FEAUTURES', 'Charpy Notched Impact Strength 15 kJ/m2 ISO 179/1eU'], pair: '75 kJ/m²' },
  { id: 'V001006', source: 'S-SPECTRUM-en-tds-spectrum-pa12-cf15', page: 1, lines: ['Charpy Impact Strength 75 kJ/m2 ISO 179/1eU', 'FEAUTURES', 'Charpy Notched Impact Strength 15 kJ/m2 ISO 179/1eU'], pair: '75 kJ/m²' },
  { id: 'V002730', source: 'S-SPECTRUM-en-tds-spectrum-pa6-low-warp-cf15s', page: 1, lines: ['Unnotched @ 23°C 60 kJ/m2 ISO 179/1eU', 'non-modified polyamid', 'Notched @ 23°C 4 kJ/m2 ISO 179/1eU'], pair: '60 kJ/m²' },
  { id: 'V002719', source: 'S-SPECTRUM-en-tds-spectrum-pa6-low-warp-gf30', page: 1, lines: ['Unnotched @ 23°C 25 kJ/m2 ISO 179/1eU', 'resistance', '• excellent chemical resistance', 'Notched @ 23°C 4 kJ/m2 ISO 179/1eU'], pair: '25 kJ/m²' },
  { id: 'V007524', source: 'S-PET-TDS-ApolloX-Kevlar', page: 1, lines: ['Charpy unnotched impact strength, 23°C 25 KJ/m ISO 179/1eU', '2', 'Charpy notched impact strength, 23°C 7,5 KJ/m ISO 179/1eU'], pair: '25 kJ/m²' },
  { id: 'V007532', source: 'R-NANOVIA-PLA-VX', page: 1, lines: ['Charpy notched 1.8 kJ/m 2 ISO 179-1eU'], pair: null },
  { id: 'V009220', source: 'R-NANOVIA-PLA-XRS', page: 1, lines: ['Charpy notched 1.8 kJ/m 2 ISO 179-1eU at 23 °C', 'Charpy full 12 kJ/m 2 ISO 179-1eA at 23 °C'], pair: '12 kJ/m² ("Charpy full")' },
];

let changed = 0;
const tally = new Map();
const count = (k, n) => { if (n) { tally.set(k, (tally.get(k) ?? 0) + n); changed += n; } };

for (const e of EDITS) {
  const row = t.get('measurements', e.id);
  if (row.Property !== 'Charpy strength') throw new Error(`${migration}: ${e.id} is ${row.Property}`);
  printed(e.source, e.page, e.lines);
  if (e.printed) saysOnPage(e.source, e.page, e.printed);
  const set = { Notch: [e.from ?? NP, e.notch] };
  const also = [];
  if (e.direction) { set.Direction = [/^(Not applicable|Not published)$/, e.direction]; also.push(`Direction ${e.direction}, as the page heads the column or prints under the value`); }
  if (e.printed) { set['Specimen type'] = ['Not published (do not assume printed)', 'Printed specimen']; also.push('a printed specimen: the page says its specimens "are produced with the Fused Filament Fabrication method"'); }
  if (e.conditioned) { set['Moisture condition'] = [NP, e.conditioned]; set['Moisture state'] = ['not-stated', 'conditioned']; also.push('conditioned, as its row label says'); }
  if (e.parseReview) set['Parse review'] = e.parseReview;
  const note = `p. ${e.page}: ${quote(e.lines)}. ${e.why ?? `The page states the bar ${e.notch.toLowerCase()} for this value`}${also.length ? `; and ${also.join('; ')}` : ''}. ${READER}`;
  count(`Charpy: notch set to ${e.notch}`, correct(t, { source: e.source, ids: [e.id], set, note, migration, date }));
}

for (const e of NINE) {
  const row = t.get('measurements', e.id);
  if (row.SourceID !== e.source || row.Notch !== 'Notched' || !/1eU/.test(row['Standard / load'])) throw new Error(`${migration}: ${e.id} is not a notched row of ${e.source} citing 1eU`);
  printed(e.source, e.page, e.lines);
  const text = `Re-read ${date} (${migration}), p. ${e.page}: ${quote(e.lines)}. The row's own label says notched and its method designation (1eU) says unnotched; the label is kept, because ${e.pair ? `the page prints the unnotched bar beside it at ${e.pair}, several times this value, as an unnotched bar gives` : 'a notched bar is what the label names, and the method column is the sheet\'s slip'}. ${READER}`;
  const notes = withNote(row.Notes, text);
  if (notes !== row.Notes) { t.set('measurements', e.id, 'Notes', notes, { expect: row.Notes }); count('Charpy: a notched row citing 1eU, re-read and kept', 1); }
}

if (changed) t.save();
for (const [k, v] of [...tally].sort()) console.log(`  ${v}\t${k}`);
console.log(`${migration}: ${changed} row(s) changed`);
