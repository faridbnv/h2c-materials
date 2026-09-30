#!/usr/bin/env node
// GOALS steps 2 and 5, C3/C9/C10: the gap-fill tranche of 2026-09-29 (GOALS, "Decided on 2026-09-29, the gap-fill
// tranche"). The research of 2026-09-28 found published values and drying schedules for exact products, and saved newer
// copies of the pages it read them on. Most of those pages are already registered: the same URL, read on 2026-09-26 or
// 2026-09-28, prints the same fact. So the fact is recorded here from the registered document, re-read on its
// hash-checked text, and the research's newer copy is kept in the research package rather than registered as a second
// revision that says nothing new. The pages the database does not hold enter through the pipeline (m226-batch-b40).
//
// Every value below is bound to its own lines on the page (D97): the lines stand on page 1 in order, and the number is
// one they print, whole. The Nobufil sheet's columns were read on the rendered page image: which of "FDM H" and
// "Injection" each number stands under is what the text alone cannot say. Each row names the research finding it
// closes (docs/audits/2026-09-29-gap-fill-implementation/ADMISSION.csv).
//
// Re-read by Claude (claude-opus-5-5), an agent, on 2026-09-29, after the research's own AI review. No person has
// signed these reads; no print test is implied. A second run changes nothing; a row that moved stops it.
import { readFileSync } from 'node:fs';
import { openTables, nextId } from '../data/table-io.mjs';
import { locate } from '../data/source-store.mjs';
import { cachedText, sha256, valueInEvidence } from '../lib/pdf-text.mjs';
import { correct, withNote } from './source-edits.mjs';
import { profileFor } from '../ingest/propose.mjs';
import { readStandards } from '../../build/src/normalize/standards.js';
import { parseTemperature, parseAbrasion, parseDrying, parseEnclosure } from '../../build/src/normalize/process.js';
import { profileCellsFromParsed } from '../../build/src/typed-values.js';
import { TEMP_WINDOW } from '../../build/src/recipe.js';

const migration = 'm225-gap-fill-registered-sources';
const date = '2026-09-29';
const reader = 'Claude (claude-opus-5-5), an agent';
const NA = 'Not applicable', NP = 'Not published';
const t = openTables();

// The page-1 lines of a registered source, from bytes that still hash to its recorded digest.
const pages = new Map();
function linesOf(sourceId) {
  if (pages.has(sourceId)) return pages.get(sourceId);
  const s = t.get('sources', sourceId);
  const found = locate(s.SHA256, sourceId);
  if (found.bytes !== 'present' || sha256(readFileSync(found.path)) !== s.SHA256) throw new Error(`${migration}: ${sourceId}'s bytes are not in the cache under ${s.SHA256.slice(0, 12)}`);
  const text = cachedText(s.SHA256);
  if (!text) throw new Error(`${migration}: ${sourceId} has no cached text; run ingest:extract`);
  const lines = text.pages.find((p) => p.page === 1).lines.map((l) => (typeof l === 'string' ? l : l.text));
  pages.set(sourceId, lines);
  return lines;
}
// A run of lines, one after another on the page, whitespace as the reader joined it.
const squash = (s) => String(s).replace(/\s+/g, ' ').trim();
// The raw cell is the page's words; where it joins two of the page's rows it puts "; " between them.
const wordsOf = (s) => squash(String(s).replace(/;\s/g, ' '));
const theWords = (raw, run) => wordsOf(run.join(' ')).includes(wordsOf(raw));
function onPage(sourceId, run) {
  const lines = linesOf(sourceId).map(squash);
  const want = run.map(squash);
  if (!lines.some((_, i) => want.every((w, k) => lines[i + k] === w))) throw new Error(`${migration}: "${run.join(' / ')}" is not on page 1 of ${sourceId}`);
  return want.join(' / ');
}

// ---------------------------------------------------------------------------------------------------------------
// Values never transcribed. Each is its product's own, on the page its Locator names.
const nanovia = { 'Specimen type': 'Not published (do not assume printed)', 'Specimen / print parameters': NP };
const esun = { SourceID: 'S-ESUN-PRINT-20260928-333834d1b9db', 'Specimen type': 'Not published (do not assume printed)', 'Standard / load': NP, 'Specimen / print parameters': NP };
const esunValue = (finding, property, label, value, unit, direction, extra = {}) => ({
  finding, grade: 'G156-01', ...esun, Property: property, 'Raw value': `${value} ${unit}`, 'Raw unit': unit, 'Raw numeric': value, Direction: direction,
  Locator: `p. 1: ${label}`, evidence: [label, value], ...extra,
});
const gpa = (mpa) => ({ 'Conversion factor': '0.001', 'Normalized value': String(Number((Number(mpa) / 1000).toFixed(6))), 'Normalized unit': 'GPa' });
// Nobufil's table heads two value columns, "FDM H" and "Injection"; the sheet does not say what H is (OPEN-PROBLEMS §11).
const nobufil = { grade: 'G144-02', SourceID: 'R-3DJAKE-3DJAKE-PCTG-CF-tech-data' };
const printedH = { 'Specimen type': 'Printed specimen', Direction: 'Stated, not a usable direction', 'Specimen / print parameters': 'Source column: FDM H (the sheet does not say what H is)' };
const moulded = { 'Specimen type': 'Raw material value', Direction: 'Unstated', 'Specimen / print parameters': 'Source column: Injection' };
const nobufilNote = 'The sheet prints this row in two columns, "FDM H" and "Injection" (read on the page image); this is the value in the one Specimen / print parameters names. H is not a build direction the database can use, so the printed value states none it can compare.';

const values = [
  // Nanovia's own pages (read 2026-09-26). Nanovia prints its table rows as "label  value  unit  standard".
  { finding: 'GF-RB043-0011', grade: 'G164-07', SourceID: 'R-NANOVIA-PA-Food-Industry', ...nanovia, Property: 'Tensile strength (endpoint unspecified)', 'Raw value': '83 MPa', 'Raw unit': 'MPa', 'Raw numeric': '83',
    Direction: 'Unstated', 'Standard / load': 'ISO 527-2/1A', Locator: 'p. 1: Ultimate tensile strength', evidence: ['Ultimate tensile strength  83  MPa  ISO 527-2/1A'] },
  { finding: 'GF-RB043-0012', grade: 'G164-07', SourceID: 'R-NANOVIA-PA-Food-Industry', ...nanovia, Property: 'Tensile strain at strength', 'Raw value': '4,0 %', 'Raw unit': '%', 'Raw numeric': '4',
    Direction: 'Unstated', 'Standard / load': 'ISO 527-2/1A', Locator: 'p. 1: Ultimate tensile strength elongation', evidence: ['Ultimate tensile strength elongation  4,0  %  ISO 527-2/1A'],
    note: 'The strain at the ultimate strength, not an elongation at break (the reading of Nanovia\'s wording owner decision 3 of 2026-09-26 made).' },
  { finding: 'GF-RB043-0006', grade: 'G167-08', SourceID: 'R-NANOVIA-Flex-VX', ...nanovia, Property: 'Glass transition temperature', 'Raw value': '-32 °C', 'Raw unit': '°C', 'Raw numeric': '-32',
    Direction: NA, 'Standard / load': NP, Locator: 'p. 1: Tg', evidence: ['Tg  -32  °C'] },
  { finding: 'GF-RB043-0007', grade: 'G167-09', SourceID: 'R-NANOVIA-Flex', ...nanovia, Property: 'Hardness', 'Raw value': '40 Shore D', 'Raw unit': 'Shore D', 'Raw numeric': '40',
    Direction: NA, 'Standard / load': NP, Locator: 'p. 1: Hardness (Shore D)', evidence: ['Hardness  90    Shore A', '40    Shore D'],
    note: 'The sheet\'s hardness row prints two scales, 90 Shore A (V011295) and, on the line below, 40 Shore D.' },
  { finding: 'GF-RB043-0009', grade: 'G167-12', SourceID: 'R-NANOVIA-ISTROFLEX', ...nanovia, Property: 'Elongation at break', 'Raw value': '> 300 %', 'Raw unit': '%', 'Raw numeric': '300', Operator: '>',
    Direction: 'Unstated', 'Standard / load': 'ISO 527', Locator: 'p. 1: Elong. at break', evidence: ['Elong. at break  > 300  %  ISO 527'],
    note: 'A lower bound: it limits the estimate and is never a point.' },
  { finding: 'GF-RB043-0010', grade: 'G167-12', SourceID: 'R-NANOVIA-ISTROFLEX', ...nanovia, Property: 'Hardness', 'Raw value': '93 Shore A', 'Raw unit': 'Shore A', 'Raw numeric': '93',
    Direction: NA, 'Standard / load': NP, Locator: 'p. 1: Hardness (Shore A)', evidence: ['Hardness  44  Shore D', '93  Shore A'],
    note: 'The sheet\'s hardness row prints two scales, 44 Shore D (V011324) and, on the line below, 93 Shore A.' },
  { finding: 'GF-PL001-0021', grade: 'G167-01', SourceID: 'R-NANOVIA-TPE-22D', ...nanovia, Property: 'Tensile modulus', 'Raw value': '12 MPa', 'Raw unit': 'MPa', 'Raw numeric': '12', ...gpa(12),
    Direction: 'Unstated', 'Standard / load': 'ISO 527-1', Locator: 'p. 1: Traction modulus', evidence: ['Traction modulus  12  MPa  ISO 527-1'],
    note: 'The page\'s "Traction modulus" to ISO 527-1 is the tensile modulus.' },

  // eSUN's PA-CF page (S-ESUN-PRINT-20260928-333834d1b9db, the exact product's page b39 registered for its chamber
  // words). Each label stands on its own line and its value on the next. The page names a direction and nothing else:
  // no standard, specimen, moisture or treatment; the sheet's injection-moulded values (V010360 on) are another test.
  esunValue('GF-PL001-0001', 'Tensile strength (endpoint unspecified)', 'Tensile Strength (XY) (MPa)', '84.05', 'MPa', 'XY'),
  esunValue('GF-PL001-0002', 'Tensile strength (endpoint unspecified)', 'Tensile Strength (Z) (MPa)', '50.34', 'MPa', 'Z'),
  esunValue('GF-PL001-0003', 'Elongation at break', 'Elongation at Break (XY) (%)', '7.42', '%', 'XY'),
  esunValue('GF-PL001-0004', 'Elongation at break', 'Elongation at Break (Z) (%)', '11.5', '%', 'Z'),
  esunValue('GF-PL001-0005', 'Flexural strength', 'Flexural Strength (XY) (MPa)', '127.5', 'MPa', 'XY'),
  esunValue('GF-PL001-0006', 'Flexural strength', 'Flexural Strength (Z) (MPa)', '54.9', 'MPa', 'Z'),
  esunValue('GF-PL001-0007', 'Flexural modulus', 'Flexural Modulus (XY) (MPa)', '6455.44', 'MPa', 'XY', gpa(6455.44)),
  esunValue('GF-PL001-0008', 'Flexural modulus', 'Flexural Modulus (Z) (MPa)', '1657.25', 'MPa', 'Z', gpa(1657.25)),
  esunValue('GF-PL001-0009', 'Izod impact strength', 'IZOD Impact Strength (XY) (kJ/m²)', '9.85', 'kJ/m²', 'XY', { Notch: NP }),
  esunValue('GF-PL001-0010', 'Izod impact strength', 'IZOD Impact Strength (Z) (kJ/m²)', '2.15', 'kJ/m²', 'Z', { Notch: NP }),

  // Nobufil PCTG CF (the 3DJake copy of Nobufil's sheet, version 24.08): the rows that carry both columns.
  { finding: 'GF-PL001-0012', ...nobufil, ...printedH, Property: 'Tensile strength (endpoint unspecified)', 'Raw value': '39 MPa', 'Raw unit': 'MPa', 'Raw numeric': '39', 'Standard / load': 'ISO 527', Locator: 'p. 1: Tensile strength (FDM H)', evidence: ['Tensile strength 39 60 MPa ISO 527'], note: nobufilNote },
  { finding: 'GF-PL001-0013', ...nobufil, ...moulded, Property: 'Tensile strength (endpoint unspecified)', 'Raw value': '60 MPa', 'Raw unit': 'MPa', 'Raw numeric': '60', 'Standard / load': 'ISO 527', Locator: 'p. 1: Tensile strength (Injection)', evidence: ['Tensile strength 39 60 MPa ISO 527'], note: nobufilNote },
  { finding: 'GF-PL001-0014', ...nobufil, ...printedH, Property: 'Elongation at break', 'Raw value': '9 %', 'Raw unit': '%', 'Raw numeric': '9', 'Standard / load': 'ISO 527', Locator: 'p. 1: Elongation at break (FDM H)', evidence: ['Elongation at break 9 7 % ISO 527'], note: nobufilNote },
  { finding: 'GF-PL001-0015', ...nobufil, ...moulded, Property: 'Elongation at break', 'Raw value': '7 %', 'Raw unit': '%', 'Raw numeric': '7', 'Standard / load': 'ISO 527', Locator: 'p. 1: Elongation at break (Injection)', evidence: ['Elongation at break 9 7 % ISO 527'], note: nobufilNote },
  { finding: 'GF-PL001-0016', ...nobufil, ...printedH, Property: 'Izod impact strength', 'Raw value': '0,7 kJ/m²', 'Raw unit': 'kJ/m²', 'Raw numeric': '0.7', 'Standard / load': 'ISO 180', Notch: 'Notched', Locator: 'p. 1: Izod Impact strength notched (FDM H)', evidence: ['Izod Impact strength notched 0,7 1,3 kJ/m² ISO 180'], note: nobufilNote },
  { finding: 'GF-PL001-0017', ...nobufil, ...moulded, Property: 'Izod impact strength', 'Raw value': '1,3 kJ/m²', 'Raw unit': 'kJ/m²', 'Raw numeric': '1.3', 'Standard / load': 'ISO 180', Notch: 'Notched', Locator: 'p. 1: Izod Impact strength notched (Injection)', evidence: ['Izod Impact strength notched 0,7 1,3 kJ/m² ISO 180'], note: nobufilNote },
  { finding: 'GF-PL001-0018', ...nobufil, ...printedH, Property: 'Izod impact strength', 'Raw value': '26 kJ/m²', 'Raw unit': 'kJ/m²', 'Raw numeric': '26', 'Standard / load': 'ISO 180', Notch: 'Unnotched', Locator: 'p. 1: Izod Impact strength unnotched (FDM H)', evidence: ['Izod Impact strength unnotched 26 33 kJ/m² ISO 180'], note: nobufilNote },
  { finding: 'GF-PL001-0019', ...nobufil, ...moulded, Property: 'Izod impact strength', 'Raw value': '33 kJ/m²', 'Raw unit': 'kJ/m²', 'Raw numeric': '33', 'Standard / load': 'ISO 180', Notch: 'Unnotched', Locator: 'p. 1: Izod Impact strength unnotched (Injection)', evidence: ['Izod Impact strength unnotched 26 33 kJ/m² ISO 180'], note: nobufilNote },
];

let added = 0;
for (const v of values) {
  const { finding, grade, evidence, note, ...cells } = v;
  const line = onPage(cells.SourceID, evidence);
  if (!valueInEvidence(line, cells['Raw numeric'])) throw new Error(`${migration}: ${finding}: ${cells['Raw numeric']} is not a number its lines print: "${line}"`);
  const g = t.get('grades', grade);
  if (g.Status !== 'active') throw new Error(`${migration}: ${grade} is not active`);
  if (t.rows('measurements').some((m) => m.SourceID === cells.SourceID && m.Locator === cells.Locator)) continue;
  const row = Object.fromEntries(t.header('measurements').map((k) => [k, NA]));
  Object.assign(row, {
    Operator: '=', 'Conversion factor': '1', 'Normalized value': cells['Raw numeric'], 'Normalized unit': cells['Raw unit'], 'Data status': 'Published value',
    'Moisture condition': NP, 'Moisture state': 'not-stated', 'Post-processing': NP, 'Post-processing state': 'not-stated',
    'Test temperature': NP, 'Test temperature °C': NP, 'Standard / load': NP, Notch: NA, 'Parse review': NA,
  }, cells);
  row.Standards = readStandards(row['Standard / load']).join('; ') || NP;
  row.MeasurementID = nextId('measurements', t.rows('measurements').map((m) => m.MeasurementID));
  row.MaterialID = g.MaterialID;
  row.GradeID = grade;
  row.Notes = `Added ${date} (${migration}): published in the source, never transcribed; re-read on its hash-checked page (${finding}, the gap-fill research of 2026-09-28).${note ? ` ${note}` : ''}`;
  t.append('measurements', row);
  added++;
}

// The one value the research found filed under the wrong column: Nobufil's "HDT A 72 °C" stands under "FDM H" on the
// page image, not under "Injection" as m128 read it. It is the only one of the thirteen Nobufil sheets whose single-value
// HDT row is printed; the other twelve stand under Injection, as m128 has them.
onPage('R-3DJAKE-3DJAKE-PCTG-CF-tech-data', ['HDT A 72 °C ISO 75']);
const corrected = correct(t, {
  source: 'R-3DJAKE-3DJAKE-PCTG-CF-tech-data', ids: ['V008864'], migration, date,
  set: { 'Specimen type': ['Raw material value', 'Printed specimen'], 'Specimen / print parameters': [NP, 'Source column: FDM H (the sheet does not say what H is)'] },
  note: 'the page image prints 72 under "FDM H", not under "Injection" as m128 read it (GF-PL001-0020). The load stays 1.8 MPa, from the label "HDT A" (D65).',
});

// ---------------------------------------------------------------------------------------------------------------
// Drying schedules on profiles that cite the very page that prints them, and said Not published.
const typedDrying = (raw) => { const c = profileCellsFromParsed({ nozzle: parseTemperature(NP), bed: parseTemperature(NP), chamber: parseTemperature(NP), enclosure: parseEnclosure(NP), drying: parseDrying(raw), abrasion: parseAbrasion(NP) }); return { 'Drying state': c['Drying state'], 'Drying °C': c['Drying °C'], 'Drying hours': c['Drying hours'] }; };
const fills = [
  { finding: 'GF-RB043-0001', id: 'P1172', grade: 'G164-07', source: 'R-NANOVIA-PA-Food-Industry', raw: 'Dehydrate for 6 h at 100 °C prior to printing.', evidence: ['Dehydrate for 6 h at 100 °C prior to printing.'], where: 'Application recommendations (drying)' },
  { finding: 'GF-RB043-0002', id: 'P1183', grade: 'G167-07', source: 'R-NANOVIA-Flex-B4C', raw: 'Dehydrate for 4h at 60°C prior to printing after prolonged exposure to humidity.', evidence: ['Dehydrate for 4h at 60°C prior to printing after prolonged exposure to humidity.'], where: 'Application recommendations (drying)' },
  { finding: 'GF-RB043-0003', id: 'P1184', grade: 'G167-08', source: 'R-NANOVIA-Flex-VX', raw: 'Dehydrate for 4h at 60°C prior to printing after prolonged exposure to humidity.', evidence: ['Dehydrate for 4h at 60°C prior to printing after prolonged exposure to humidity.'], where: 'Application recommendations (drying)' },
  // 100 °C for a flexible filament is what the page prints (the same sentence as Nanovia's PA pages); recorded as printed.
  { finding: 'GF-RB043-0004', id: 'P1186', grade: 'G167-09', source: 'R-NANOVIA-Flex', raw: 'Dehydrate for 6 h at 100 °C prior to printing after prolonged exposure to humidity.', evidence: ['Dehydrate for 6 h at 100 °C prior to printing after prolonged exposure to humidity.'], where: 'Application recommendations (drying)' },
  { finding: 'GF-RB043-0005', id: 'P1191', grade: 'G167-12', source: 'R-NANOVIA-ISTROFLEX', raw: 'Dehydrate for 4h at 60°C prior to printing after prolonged exposure to humidity.', evidence: ['Dehydrate for 4h at 60°C prior to printing after prolonged exposure to humidity.'], where: 'Application recommendations (drying)' },
  { finding: 'GF-PL001-0022', id: 'P1161', grade: 'G167-01', source: 'R-NANOVIA-TPE-22D', raw: 'Dehydrate for 4h at 50°C prior to printing after prolonged exposure to humidity.', evidence: ['Dehydrate for 4h at 50°C prior to printing after prolonged exposure to humidity.'], where: 'Application recommendations (drying)' },
  { finding: 'GF-RB036-0003', id: 'P1291', grade: 'G029-03', source: 'R-EXTRUDR-PRINT-20260928-526b472f69cc', raw: 'Drying temperature 60 °C; Drying time 10 h', evidence: ['Drying temperature 60 °C', 'Drying time 10 h'], where: 'Print Settings, Drying' },
  { finding: 'GF-PL001-0024', id: 'P1297', grade: 'G131-01', source: 'R-EXTRUDR-PRINT-20260928-83ec5c0b3125', raw: 'Drying temperature 65 °C; Drying time 8–12 h', evidence: ['Drying temperature 65 °C', 'Drying time 8–12 h'], where: 'Print Settings, Drying' },
  // Not a research finding: the same line of eSUN's page that b39 read the enclosure from also states the drying.
  { finding: 'none (found on re-reading P1287\'s line)', id: 'P1287', grade: 'G156-01', source: 'S-ESUN-PRINT-20260928-333834d1b9db', raw: 'Dry at70℃/>12h', evidence: ['Dry at70℃/>12h，use a hardened steel nozzle，enclosed-chamber printing'], where: 'Printing Recommendation (drying)' },
];
let filled = 0;
for (const f of fills) {
  onPage(f.source, f.evidence);
  if (!theWords(f.raw, f.evidence)) throw new Error(`${migration}: ${f.id}: "${f.raw}" is not the page's wording`);
  const p = t.get('profiles', f.id);
  if (p.GradeID !== f.grade || p.SourceID !== f.source) throw new Error(`${migration}: ${f.id} no longer belongs to ${f.grade} and ${f.source}`);
  const cells = { Drying: f.raw, ...typedDrying(f.raw) };
  if (Object.entries(cells).every(([k, v]) => p[k] === v)) continue;
  for (const [k, from] of [['Drying', NP], ['Drying state', 'unknown'], ['Drying °C', NA], ['Drying hours', NA]]) t.set('profiles', f.id, k, cells[k], { expect: from });
  t.set('profiles', f.id, 'Locator', `${p.Locator}; p. 1: ${f.where}`, { expect: p.Locator });
  filled++;
}

// ---------------------------------------------------------------------------------------------------------------
// Two pages the database holds as corroboration print a product's drying (and, for eSUN TPU-LW, its AMS advice) and
// no profile cites them. A row now takes its value from each, so each is cited (citation-roles.csv).
const newProfiles = [
  { finding: 'GF-PL001-0025', grade: 'G150-02', source: 'S-ESUN-PRINT-20260928-c7b961702f53',
    settings: [{ field: 'drying', raw: 'The recommended drying conditions are 55°C for more than 4 hours', evidence: ['TPU filament absorbs moisture easily; we recommend drying it before printing. The recommended drying conditions are 55°C for more than 4 hours .'] }],
    ams: { raw: 'We do not recommend using the AMS with this flexible, lightweight material.', evidence: ['We do not recommend using the AMS with this flexible, lightweight material. We suggest using an external spool setup, placing the filament in a dry box during printing, and minimizing the length of the guide tube to ensure smooth feeding.'] },
    locator: 'Printing Recommendation notes: drying conditions; AMS (drying and AMS only; the page\'s extruder and bed rows are the sheet\'s P0991)' },
  { finding: 'GF-RB036-0004', grade: 'G039-14', source: 'D-EXTRUDR-FLEX-MEDIUM-MATT-PAGE',
    settings: [{ field: 'drying', raw: 'Drying temperature 60 °C; Drying time 12 h', evidence: ['Drying temperature 60 °C', 'Drying time 12 h'] }],
    locator: 'Print Settings, Drying (drying only; the page\'s nozzle and build plate rows agree with P0375, from the sheet)' },
];
let appended = 0, cited = 0;
for (const n of newProfiles) {
  for (const s of n.settings) { onPage(n.source, s.evidence); if (!theWords(s.raw, s.evidence)) throw new Error(`${migration}: ${n.grade}: "${s.raw}" is not the page's wording`); }
  if (n.ams) { onPage(n.source, n.ams.evidence); if (!theWords(n.ams.raw, n.ams.evidence)) throw new Error(`${migration}: ${n.grade}: AMS words moved`); }
  const g = t.get('grades', n.grade);
  const source = t.get('sources', n.source);
  if (!String(source['Applicable grades']).split(';').map((x) => x.trim()).includes(n.grade)) throw new Error(`${migration}: ${n.source} does not speak for ${n.grade}`);
  const profile = profileFor(n.settings.map((s) => ({ field: s.field, raw: s.raw, page: 1, line: s.evidence.join(' / ') })), { sourceId: n.source, materialId: g.MaterialID, modifier: '', locator: n.locator });
  const r = profile.row;
  Object.assign(r, profileCellsFromParsed({
    nozzle: parseTemperature(r['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }), bed: parseTemperature(r['Bed °C'], { plausible: TEMP_WINDOW.bed }),
    chamber: parseTemperature(r['Chamber °C'], { plausible: TEMP_WINDOW.chamber }), enclosure: parseEnclosure(r.Enclosure), drying: parseDrying(r.Drying), abrasion: parseAbrasion(r['Abrasion / clogging']),
  }));
  if (n.ams) r['AMS published'] = n.ams.raw;
  if (!t.rows('profiles').some((x) => x.SourceID === n.source && x.Locator === r.Locator)) {
    const row = Object.fromEntries(t.header('profiles').map((k) => [k, r[k] ?? NA]));
    row.ProfileID = nextId('profiles', t.rows('profiles').map((x) => x.ProfileID));
    row.GradeID = n.grade;
    row.MaterialID = g.MaterialID;
    t.append('profiles', row);
    appended++;
  }
  if (source['Citation role'] === 'corroboration') {
    t.set('sources', n.source, 'Citation role', 'cited', { expect: 'corroboration' });
    t.set('sources', n.source, 'Source note', withNote(source['Source note'], `Cited from ${date} (${migration}): a profile of ${n.grade} takes its drying${n.ams ? ' and AMS advice' : ''} from this page (${n.finding}).`), { expect: source['Source note'] });
    cited++;
  }
}

if (added || corrected || filled || appended || cited) t.save();
console.log(`${migration}: ${added} value(s) added, ${corrected} corrected, ${filled} drying schedule(s) filled, ${appended} profile(s) added, ${cited} source(s) now cited`);
