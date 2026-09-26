#!/usr/bin/env node
// Migration m155 (2026-09-25): the test conditions the products' own sheets state (re-center phase 6, lane 4; GOALS
// C3 and C4).
//
// BLOCKING-GAPS listed 124 answers that change when values published without their direction or load are admitted
// (D84). Behind them stand 251 product values on 199 sheets. Each sheet's cached text was re-read, and where the
// document is a web page whose text extraction dropped a sentence, its hash-checked bytes; most say nothing about how
// the bar was made or tested. These do, once for a table or a sheet, in words the import's reader did not know:
//
//   colorFabb     "The specimens have been printed in XY plane, ..." (Notes, p. 2), for the table headed "Mechanical
//                 Properties – 3D Printed". Thirty-one colorFabb sheets print the sentence; it settles every row of
//                 that table, not only the ten sheets behind an answer, because it is one sentence read one way.
//   3D-Fuel       Workday ABS: "All properties, except melt flow rate are measured on injection molded specimens ...".
//   MakerBot      Tough: "All tests were performed following ASTM standard protocol with injection molded specimens
//                 from the same resin used to create MakerBot filaments." The rows had been recorded as printed.
//   eSUN          TPE 83A: "... obtained based on the injection molding spline test." m128 read this sentence on every
//                 eSUN sheet it had; this one entered afterwards (m143, batch b34).
//   Stratasys     ABS-M30i: footnote 1 to "Mechanical Properties", "Build orientation is on side long edge.", and
//                 "Tested parts were built on Fortus 400mc". A bar on its long edge is XZ (ISO/ASTM 52921; the
//                 database's own note on R-STRATASYS-FDM-NYLON12-MDS says the same), which is not the XY headline.
//   Filament2Print BioFil PCL: "Heat deflection temperature 57°C ISO 75 B": method B names the 0.45 MPa load (D65).
//   SIDDAMENT     PA12-CF: "Test Sample Printing Conditions" (p. 2), and p. 3's "Attachment: Test sample dimensions and
//                 printing direction", whose drawing shows the tensile and flexural bars lying flat with the Z axis
//                 through their thickness (read on the page image).
//   Nanovia       Its product pages show the tensile table in three tabs, each with its own sentence ("Test performed
//                 at 1mm/min on 3D printed test specimins at 0°, along with the tension stress.", "... successively at
//                 45° and -45° per layer.", "... at 90°, oposite to the tension stress."). The cached text keeps the
//                 tables and drops the sentences, so they are read from the page's hash-checked bytes. A ±45° raster
//                 is 45/45 (m33); a 0° or 90° raster is a raster the vocabulary has no value for (DSM's "raster
//                 0°-90°", m35). Two rows the reader took stand in the ±45° tab (PLA Flax's modulus, whose 0° row is
//                 spelled "Young modulus’s", and PA Rail's second elongation), and ABS ESD prints no 0° tab; PLA
//                 Flax's 0° modulus, never transcribed, is added.
//
// A statement covers the bars a test is made on, as m128 decided: the mechanical tests and heat deflection and Vicat,
// never density, melt flow or a DSC temperature (GOALS, phase 5 decision 4). A direction is written only for the
// mechanical properties that have one (m129). Nothing is inferred from typical practice or from another product, and a
// sheet that names a standard without saying how its bar was made keeps its state: the other 185 sheets are listed,
// with what would settle them, in docs/audits/2026-09-25-re-center/RESPONSE.md, "Phase 6, lane 4".
//
// Every statement is checked on the page its note names before anything is written. A re-run is a no-op, and a run
// after the data moved stops. The reader of every page is an AI agent (Claude, lane 4), not a person, and each note
// says so.
//
//   node scripts/migrate/m155-the-test-conditions-the-sheets-state.mjs

import { existsSync, readFileSync } from 'node:fs';
import { openTables } from '../data/table-io.mjs';
import { cachedText, cacheDir, sha256 } from '../lib/pdf-text.mjs';
import { correct, addValue } from './source-edits.mjs';

const migration = 'm155-the-test-conditions-the-sheets-state';
const date = '2026-09-25';
const NP = 'Not published';
const NA = 'Not applicable';
const READER = 'Read by an AI agent (Claude, re-center lane 4), not a person.';
const t = openTables();

const MECHANICAL = new Set(t.rows('properties').filter((p) => p.Domain === 'mechanical' && p.Property !== 'Tear strength').map((p) => p.Property));
const BARS = new Set([...MECHANICAL, 'HDT', 'Vicat softening temperature']);
const DIRECTIONAL = new Set([...MECHANICAL].filter((p) => !/impact|Charpy|Izod|Hardness/i.test(p)));
const published = (m) => /^Published value/.test(m['Data status']);
const unstatedSpecimen = (m) => /^Not published( \(do not assume printed\))?$/.test(m['Specimen type']);
const unstatedDirection = (m) => m.Direction === 'Unstated' || m.Direction === NP;

const bySource = new Map();
for (const m of t.rows('measurements')) (bySource.get(m.SourceID) ?? bySource.set(m.SourceID, []).get(m.SourceID)).push(m);
const rowsOf = (sourceId) => bySource.get(sourceId) ?? [];

// ------------------------------------------------------------------------------------------------ the page says it
// As m136: full-width punctuation is compared in its ASCII form, and a statement's words must stand on the page in
// order, with no more than a few of the page's words between two of them (a table cell beside its label).
const plain = (s) => String(s).replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/\s+/g, ' ').trim();
const words = (s) => plain(s).replace(/,(?=\S)/g, ', ').split(' ').map((w) => w.replace(/[.,;:]+$/, '')).filter(Boolean);
const linesOf = (sourceId) => {
  const s = t.get('sources', sourceId);
  const text = /^[0-9a-f]{64}$/.test(s.SHA256 ?? '') ? cachedText(s.SHA256) : null;
  if (!text) throw new Error(`${migration}: ${sourceId} has no cached text for ${s.SHA256}; fetch and extract it first`);
  return text.pages.map((p) => ({ page: p.page, lines: p.lines.map((l) => (typeof l === 'string' ? l : l.text)) }));
};
function printedOn(tokens, raw, gap = 6) {
  const want = words(raw);
  for (let start = 0; start < tokens.length; start++) {
    if (tokens[start] !== want[0]) continue;
    let at = start, ok = true;
    for (const w of want.slice(1)) {
      let k = at + 1;
      while (k < tokens.length && k - at <= gap + 1 && tokens[k] !== w) k++;
      if (k >= tokens.length || tokens[k] !== w) { ok = false; break; }
      at = k;
    }
    if (ok) return true;
  }
  return false;
}
function onPage(sourceId, page, statement) {
  const p = linesOf(sourceId).find((x) => x.page === page);
  if (!p || !printedOn(words(p.lines.join(' ')), statement)) throw new Error(`${migration}: "${statement}" is not printed on p. ${page} of ${sourceId}`);
}
// A web page's own bytes, checked against the digest sources.csv records, as text: tags out, entities decoded.
const decode = (s) => s.replace(/&#8217;/g, '’').replace(/&#8211;/g, '–').replace(/&#038;|&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&euro;/g, '€');
function pageBytes(sourceId) {
  const s = t.get('sources', sourceId);
  const path = cacheDir('sources/by-sha', `${s.SHA256}.html`);
  if (!existsSync(path)) throw new Error(`${migration}: ${sourceId} has no cached page ${s.SHA256}.html; fetch it first`);
  const bytes = readFileSync(path);
  if (sha256(bytes) !== s.SHA256) throw new Error(`${migration}: ${sourceId}'s cached page does not hash to ${s.SHA256}`);
  return bytes.toString('utf8');
}

let changed = 0;
const tally = new Map();
const count = (k, n) => { if (n) { tally.set(k, (tally.get(k) ?? 0) + n); changed += n; } };
const left = [];
const edit = (m, set, note, key) => count(key, correct(t, { source: m.SourceID, ids: [m.MeasurementID], migration, date, set, note: `${note} ${READER}` }));

// ----------------------------------------------------------------------------- colorFabb: "printed in XY plane"
// The sentence runs on to the next line unless that line starts a new one.
const XY_SENTENCE = /^The specimens have been printed in XY plane/;
const PRINTED_TABLE = /^Mechanical Properties\s*[–-]\s*3D Printed(?:\s*[–-]\s*ISO\s?37)?$/;
const HEADING = /^(Mechanical Properties|Thermal Properties|Filament Specifications|Typical Properties|Guideline for print settings|Notes)\b/i;
// The number stands on the line as a word of its own ("2 %", "7,0 %", "3290 MPa"), not inside another ("527-1A").
const printsNumber = (line, m) => line.split(/\s+/).map((w) => w.replace(/%$/, ''))
  .some((w) => /^\d+(?:[.,]\d+)?$/.test(w) && Number(w.replace(',', '.')) === Number(m['Raw numeric']));
for (const s of t.rows('sources').filter((x) => x.Publisher === 'colorFabb' && bySource.has(x.SourceID) && /^[0-9a-f]{64}$/.test(x.SHA256 ?? ''))) {
  if (!cachedText(s.SHA256)) continue;
  const pages = linesOf(s.SourceID);
  const at = pages.flatMap((p) => p.lines.map((l, i) => ({ page: p.page, i, l }))).find((x) => XY_SENTENCE.test(x.l));
  if (!at) continue;
  const lines = pages.find((p) => p.page === at.page).lines;
  const next = lines[at.i + 1] ?? '';
  const sentence = plain(/^[^A-Z*]/.test(next) ? `${at.l} ${next}` : at.l);
  if (!/\.$/.test(sentence)) throw new Error(`${migration}: ${s.SourceID}'s sentence does not end where expected: "${sentence}"`);
  onPage(s.SourceID, at.page, sentence);
  for (const m of rowsOf(s.SourceID)) {
    if (!published(m) || !DIRECTIONAL.has(m.Property) || m['Specimen type'] !== 'Printed specimen' || !unstatedDirection(m)) continue;
    // The row's own line, inside a table the sentence speaks for: a heading "Mechanical Properties – 3D Printed" of
    // this product, never the injection-moulded table beside it or another product's table on the same sheet.
    const page = Number((m.Locator.match(/^p\. ?(\d+)/) ?? [])[1]);
    const p = pages.find((x) => x.page === page);
    const label = m.Locator.replace(/^p\. ?\d+: ?/, '').trim().slice(0, 24).toLowerCase();
    const hits = [];
    let heading = null;
    (p?.lines ?? []).forEach((l, i) => {
      if (HEADING.test(l.trim())) heading = l.trim();
      if (heading && PRINTED_TABLE.test(heading) && l.toLowerCase().includes(label) && printsNumber(l, m)) hits.push({ i, heading });
    });
    if (hits.length !== 1) { left.push(`${m.MeasurementID} (colorFabb, its line found ${hits.length} times in a 3D Printed table)`); continue; }
    const set = { Direction: [m.Direction, 'XY'] };
    if (m['Specimen / print parameters'] === NP) set['Specimen / print parameters'] = [NP, sentence];
    edit(m, set, `p. ${at.page} prints, under Notes, "${sentence}"; this row stands in the table headed "${hits[0].heading}" (p. ${page}), so its bars were printed in the XY plane.`, 'colorFabb: printed in XY plane');
  }
}

// ------------------------------------------------------------------------- a sheet that says its bars were moulded
const MOULDED = [
  { source: 'R-3D-FUEL-TDS-3DFuel-Workday-ABS', page: 1, from: unstatedSpecimen,
    words: 'All properties, except melt flow rate are measured on injection molded specimens and after 48 hours storage at 23°C, 50% relative humidity.' },
  { source: 'R-ULTIMAKER-MAKERBOT-Tough-One-Sheet', page: 2, from: (m) => m['Specimen type'] === 'Printed specimen',
    words: 'All tests were performed following ASTM standard protocol with injection molded specimens from the same resin used to create MakerBot filaments.' },
  { source: 'S-PEBA-eSUN-TPE-83A-Filament-TDS-V4-0', page: 2, from: unstatedSpecimen,
    words: 'The physical properties, mechanical properties, thermal properties, and electrical properties of the filament are obtained based on the injection molding spline test.' },
];
for (const st of MOULDED) {
  onPage(st.source, st.page, st.words);
  for (const m of rowsOf(st.source).filter((x) => published(x) && BARS.has(x.Property) && st.from(x))) {
    edit(m, { 'Specimen type': [m['Specimen type'], 'Raw material value'] },
      `p. ${st.page} states once for the sheet: "${st.words}" This row's bar was injection moulded, so it stands for the resin, not a printed part.`, `${st.source}: injection moulded`);
  }
}

// ------------------------------------------------------------------ Stratasys ABS-M30i: on its side, long edge
{
  const source = 'R-STRATASYS-mds-fdm-absm30i-0621a';
  const footnote = 'Build orientation is on side long edge.';
  const built = 'Tested parts were built on Fortus 400mc™ @ 0.010” (0.254 mm) slice.';
  onPage(source, 2, footnote);
  onPage(source, 2, built);
  onPage(source, 1, '1 Mechanical Properties Test Method Value');
  for (const m of rowsOf(source).filter((x) => published(x) && DIRECTIONAL.has(x.Property) && unstatedSpecimen(x) && unstatedDirection(x))) {
    edit(m, { 'Specimen type': [m['Specimen type'], 'Printed specimen'], Direction: [m.Direction, 'XZ'], 'Specimen / print parameters': [NP, `${footnote} ${built}`] },
      `p. 1 heads the mechanical table "Mechanical Properties" with footnote 1, and p. 2 prints it: "${footnote}"; p. 2 also says "${built}" A bar built on its long edge is XZ (ISO/ASTM 52921), not the XY headline.`, 'Stratasys ABS-M30i: XZ');
  }
}

// ---------------------------------------------------------------- Filament2Print BioFil PCL: ISO 75 method B
{
  const source = 'R-FILAMENT2PRINT-BioFil-PCL';
  const line = 'Heat deflection temperature 57°C ISO 75 B';
  onPage(source, 1, line);
  const m = t.get('measurements', 'V010322');
  edit(m, { 'Standard / load': ['ISO 75', 'ISO 75 B'], 'Test load MPa': [NP, '0.45'],
    'Parse review': [NA, 'The raw text states "ISO 75 B", the method and not the load, so the parser reads no stated load; the typed 0.45 MPa is the load ISO 75-2 method B defines (D65). Read on p. 1 by an AI agent (m155).'] },
  `p. 1 prints "${line}": method B of ISO 75-2 is the 0.45 MPa load (D65); the Standard / load cell had dropped the letter.`, 'Filament2Print PCL: ISO 75 B');
}

// ------------------------------------------------------------------------------ SIDDAMENT PA12-CF: printed flat
{
  const source = 'S-PCGF-PA12-CF-TDS-EN-1';
  const conditions = 'Test Sample Printing Conditions: 3D Printer Guider IIS (Flashforge) Nozzle Diameter 0.6mm Nozzle Temperature 275 °C Printing Speed 50mm/s Layer 1.8mm Infill 100% Standard Printed Sample See blew attachment';
  // The page prints a full-width colon with no space after it; the note gives it in ASCII.
  const printed = 'Attachment：Test sample dimensions and printing direction';
  const attachment = plain(printed);
  onPage(source, 2, conditions);
  onPage(source, 3, printed);
  for (const m of rowsOf(source).filter((x) => published(x) && BARS.has(x.Property) && unstatedSpecimen(x))) {
    const set = { 'Specimen type': [m['Specimen type'], 'Printed specimen'], 'Specimen / print parameters': [NP, conditions] };
    let why = `p. 2 prints "${conditions}": the test bars were printed.`;
    if (DIRECTIONAL.has(m.Property) && unstatedDirection(m)) {
      set.Direction = [m.Direction, 'XY'];
      why += ` p. 3, "${attachment}", draws the tensile and flexural bars lying flat with the Z axis through their 4 mm thickness (read on the page image): XY.`;
    }
    edit(m, set, why, 'SIDDAMENT PA12-CF: printed, flat');
  }
}

// --------------------------------------------------------------------- Nanovia: the tab each tensile row stands in
// Each tab: its id (0, 45, 90), its sentence, and its rows as printed [label, value, unit, standard]. A malformed cell
// ("Elongation ultimate strength/td>" on PA Rail's ±45° tab) is read as the page prints it.
function tabs(html) {
  const out = [];
  for (const m of html.matchAll(/<div class="tensile-data" id="tensile-data-(\d+)"[^>]*>([\s\S]*?)<\/div>/g)) {
    const sentence = plain(decode((m[2].match(/<span>([\s\S]*?)<\/span>/) ?? [])[1] ?? ''));
    const rows = [...m[2].matchAll(/<tr><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)]
      .map((r) => r.slice(1).map((c) => plain(decode(c.replace(/<[^>]*>/g, '')))));
    for (const r of m[2].matchAll(/<tr><td>([^<]*?)\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)) rows.push(r.slice(1).map((c) => plain(decode(c))));
    out.push({ angle: Number(m[1]), sentence, rows });
  }
  return out;
}
const RASTER = {
  0: { re: /^Test performed at 1mm\/min on 3D printed test specimins at 0°, along with the tension stress\.$/, direction: 'Stated, not a usable direction', what: 'a 0° raster, along the load' },
  45: { re: /^Test performed at 1mm\/min on 3D printed test specimins successively at 45° and -45° per layer\.$/, direction: '45/45', what: 'an alternating ±45° raster' },
  90: { re: /^Test performed at 1mm\/min on 3D printed test specimins at 90°, oposite to the tension stress\.$/, direction: 'Stated, not a usable direction', what: 'a 90° raster, across the load' },
};
const TENSILE = new Set(['Tensile modulus', 'Elongation at break', 'Tensile strength (endpoint unspecified)', 'Tensile break strength', 'Tensile yield strength']);
const TAB_NAME = { 0: '0°', 45: '+45° / -45°', 90: '90°' };
for (const s of t.rows('sources').filter((x) => x.SourceID.startsWith('R-NANOVIA-') && bySource.has(x.SourceID))) {
  if (!existsSync(cacheDir('sources/by-sha', `${s.SHA256}.html`))) continue;
  const tb = tabs(pageBytes(s.SourceID));
  // Only a page whose every tab says what its id says: R-NANOVIA-PETG repeats the 0° sentence under all three.
  if (!tb.length || tb.some((x) => !RASTER[x.angle]?.re.test(x.sentence))) { if (tb.length) left.push(`${s.SourceID} (its tabs' sentences do not match their angles)`); continue; }
  for (const m of rowsOf(s.SourceID).filter((x) => published(x) && TENSILE.has(x.Property))) {
    const n = String(m['Raw numeric']);
    const label = m.Locator.replace(/^p\. ?\d+: ?/, '').trim();
    // The first tab, in page order, that prints this row's label and number: the reader's own order.
    const tab = tb.find((x) => x.rows.some((r) => r[1].replace(',', '.') === n && (r[0] === label || `${r[0]}/td` === label)));
    if (!tab) { left.push(`${m.MeasurementID} (${s.SourceID}: its label and number stand in no tab)`); continue; }
    const r = RASTER[tab.angle];
    if (m.Direction === r.direction) continue;
    if (!unstatedDirection(m) || !unstatedSpecimen(m)) { left.push(`${m.MeasurementID} (already ${m.Direction}, ${m['Specimen type']})`); continue; }
    const also = tb.filter((x) => x !== tab && x.rows.some((q) => q[1].replace(',', '.') === n && q[0] === label)).map((x) => TAB_NAME[x.angle]);
    edit(m, { 'Specimen type': [m['Specimen type'], 'Printed specimen'], Direction: [m.Direction, r.direction], 'Specimen / print parameters': [NP, tab.sentence] },
      `p. 1 (the product page) prints its tensile table in three tabs; this row's "${label} ${m['Raw value']}" stands in the ${TAB_NAME[tab.angle]} tab${also.length ? ` (the ${also.join(' and ')} tab prints the same figure)` : ''}, under "${tab.sentence}": ${r.what}, read from the page's hash-checked bytes, whose cached text drops the sentence.`,
      `Nanovia: ${r.direction}`);
  }
}
// PLA Flax's 0° modulus, spelled "Young modulus’s" on its page, was never transcribed; its modulus row is the ±45° tab's.
{
  const source = 'R-NANOVIA-PLA-Flax';
  const tb = tabs(pageBytes(source));
  const zero = tb.find((x) => x.angle === 0);
  if (!zero?.rows.some((r) => r[0] === 'Young modulus’s' && r[1] === '3100' && r[2] === 'MPa' && r[3] === 'ISO 527-2/1A')) throw new Error(`${migration}: ${source}'s 0° tab no longer prints "Young modulus’s 3100 MPa ISO 527-2/1A"`);
  const id = addValue(t, { like: 'V010286', migration, date,
    why: 'published in the source, never transcribed: the reader did not know the 0° tab\'s spelling "Young modulus’s", and took the ±45° tab\'s "Young’s modulus" instead (V010286).',
    note: `p. 1 (the product page), the 0° tab under "${zero.sentence}": a 0° raster, along the load, read from the page's hash-checked bytes. ${READER}`,
    set: { 'Raw value': '3100 MPa', 'Raw numeric': '3100', 'Conversion factor': '0.001', 'Normalized value': '3.1', 'Specimen type': 'Printed specimen', Direction: 'Stated, not a usable direction',
      'Specimen / print parameters': zero.sentence, Locator: 'p. 1: Young modulus’s (0° tab)', 'Standard / load': 'ISO 527-2/1A', Standards: 'ISO 527' } });
  if (id) count('Nanovia PLA Flax: the 0° modulus, added', 1);
}

if (changed) t.save();
for (const [k, v] of [...tally].sort()) console.log(`  ${v}\t${k}`);
if (left.length) console.log(`  left as they were:\n    ${left.join('\n    ')}`);
console.log(`${migration}: ${changed} row(s) given the conditions their sheet states`);
