#!/usr/bin/env node
// Reading a data sheet into candidate rows: what it publishes, where on the page, and in the columns the database
// keeps. Nothing here writes data. It writes a proposal, which a person accepts, edits or rejects, and which
// scripts/ingest/apply.mjs then refuses unless every number is on the page its locator names.
//
// A sheet's property table is a label, a value with its unit, and the method it was tested to. Which of those is
// in which column differs by maker, so the table is read by the columns the page itself leaves (pdf-text.mjs) and
// the pieces are picked out of the cells by what they look like: a label the lexicon knows, a number with a unit
// the lexicon knows, and a standard designation. Everything else on the page is listed in `skipped` with a reason,
// so ingest:audit can close the loop: every number a sheet prints is either a row or a reasoned omission.
//
// What it will not do is decide. A direction the sheet does not state stays "Unstated"; a specimen it does not
// describe stays "Not published (do not assume printed)"; a standard it does not print is not written (D76). The
// build's own parsers fill the typed columns, so PARSE-MISMATCH still means something.
//
//   npm run ingest:propose -- --provider Spectrum --batch b01-spectrum
//   npm run ingest:propose -- --doc <doc_key>
//   npm run ingest:propose -- --provider Spectrum --compare     read the sheets already transcribed and score
//
// Writes docs/audits/2026-09-18-v2-import/proposals/<batch>/<doc_key>.json

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readCsv } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';
import { cachedText, columnPositions, cellsAt, joinDigits, lineCells, spanText } from '../lib/pdf-text.mjs';
import { parseTemperature, parseEnclosure, parseDrying, parseAbrasion } from '../../build/src/normalize/process.js';
import { readStandards } from '../../build/src/normalize/standards.js';
import { readPostProcessingState, parseAnnealSchedule, specimenForm } from '../../build/src/normalize/specimen.js';
import { readMoistureState } from '../../build/src/normalize/moisture.js';
import { parseHdtStandard } from '../../build/src/normalize/thermal.js';
import { profileCellsFromParsed, loadCellFromParsed } from '../../build/src/typed-values.js';
import { normalizedRawValue, rawNumber } from '../../build/src/measurement-rules.js';
import { classifyProduct, collidesWith } from './classify.mjs';

const AUDIT = join(projectRoot, 'docs/audits/2026-09-18-v2-import');
const lexicon = (name) => readCsv(join(projectRoot, 'scripts/ingest/lexicon', `${name}.csv`)).records.map((r) => r.values);
const table = (name) => readCsv(join(projectRoot, 'data/tables', `${name}.csv`)).records.map((r) => r.values);

const LABELS = lexicon('property-labels').map((r) => ({ ...r, re: new RegExp(r.Label, 'i') }));
const SETTINGS = lexicon('setting-labels').map((r) => ({ ...r, re: new RegExp(r.Label, 'i') }));
const MODIFIERS = readCsv(join(projectRoot, 'schema/vocab/modifiers.csv')).records.map((r) => r.values);
const WINDOWS = readCsv(join(projectRoot, 'data/tables/plausibility_windows.csv')).records.map((r) => r.values);

/**
 * Whether a value could be this property of this material at all: inside the hard ends of the window the build
 * itself would judge it by (lint-rules.js), which is the most specific one matching how the polymer solidifies,
 * whether it is reinforced and, for an impact result, its notch.
 */
/**
 * Whether a property may take a negative value at all. A dash between two numbers, a footnote marker before one
 * and a designation's own hyphen all read as a minus sign, and a density of -1.24 g/cm3 or a specific gravity of
 * -2240 is not a value a sheet printed. A glass transition may be negative and says so in its own window.
 */
export function mayBeNegative(property, unit) {
  const windows = WINDOWS.filter((w) => w.Property === property && w['Normalized unit'] === unit);
  return !windows.length || windows.some((w) => Number(w['Hard low']) < 0);
}

export function couldBe(property, unit, value, { matrix = 'any', fill = 'any', condition = 'any' } = {}) {
  if (!Number.isFinite(value)) return true;
  const fits = (w, field, want) => w[field] === want || w[field] === 'any';
  const matching = WINDOWS.filter((w) => w.Property === property && w['Normalized unit'] === unit
    && fits(w, 'Matrix class', matrix) && fits(w, 'Fill class', fill) && fits(w, 'Condition', condition));
  if (!matching.length) return true;
  const score = (w) => ['Matrix class', 'Fill class', 'Condition'].reduce((a, f) => a + (w[f] === 'any' ? 0 : 1), 0);
  const window = matching.sort((a, b) => score(b) - score(a))[0];
  return value >= Number(window['Hard low']) && value <= Number(window['Hard high']);
}
const UNITS = lexicon('unit-aliases');
const UNIT_PATTERN = UNITS.map((u) => u.Printed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|');
// A fresh pattern per call: a global regular expression keeps its place between calls, and sharing one made
// every second line read as though it had no value.
// The minus sign is a sign only where a number does not come before it: "55-60°C" is a window whose dash the
// number swallowed, which read a PLA's glass transition as -60 °C.
// A bound may be printed in the maker's own typography: a Chinese sheet writes "＞950" with the fullwidth
// sign, and a reader that knows only the ASCII one read the row as stating no value at all.
const BOUNDS = '<>≤≥＜＞≦≧';
/** The operator a bound's sign states, in the two the database keeps. */
export const boundOperator = (sign) => (/[<≤＜≦]/.test(String(sign).trim().slice(-1)) ? '<' : '>');
const NUMBER_PATTERN = '(?:(?<!\\d\\s{0,3})-)?\\d+(?:[.,]\\d+)?';
const valueRe = () => new RegExp(`(${NUMBER_PATTERN})\\s*\\(?\\s*(${UNIT_PATTERN})`, 'gi');
// A table may print its unit in a column of its own, before the value: 3DXTECH's sheets are
// "Tensile Strength, Break | ISO 527 | MPa | 62.8", and every one of their 214 recorded values was invisible to
// a reader that only knows "number unit". The match is shaped like the other one, value first, so the rest of
// the reading does not care which way round the page put them.
//
// What a value carries comes after it when the unit came before it, and it is the same statement either way
// round: a bound the sheet states in front of the number ("% > 50"), a spread behind it ("% 3,5 ± 0,1") and a
// window behind it ("°C 190-210"). Reading only the number recorded a melting temperature of 190 for a sheet
// that prints 190 to 210, and lost every bound Extrudr prints in this layout.
//
// Between the unit and the value a row may state a condition of the test, and a condition carries a unit of its
// own, written hard against its number: Eryone prints "Charpy Impact strenght GB/T 1043.1-2008 kJ/m2 2.75J 2.83",
// where 2.75 J is the pendulum and 2.83 kJ/m² is the answer. Read as the first number after the unit, the hammer
// became the impact strength on every one of that sheet's impact rows. A condition is glued to its own unit, so
// a word standing apart from the number in front of it is the column beside the table, not a condition: Extrudr's
// "MPa 40 Nozzle 230-260°C" still states a modulus of 40, not one of 230.
const CONDITION_UNIT = `\\d+(?:[.,]\\d+)?[A-Za-zµ°℃%][\\w/°²³]*`;
const unitFirstRe = () => new RegExp(
  `(?:^|\\s)(?<unit>${UNIT_PATTERN})(?<lead>\\s+(?:${CONDITION_UNIT}\\s+)*(?:[${BOUNDS}]\\s*)?)(?<value>${NUMBER_PATTERN})(?![\\d.,])`
  + `(?:\\s*(?:±|\\+\\/-)\\s*(?<spread>\\d+(?:[.,]\\d+)?)|\\s*[-–~]\\s*(?<upper>\\d+(?:[.,]\\d+)?))?`, 'gi');

// A section heading tells a value what it is: a printing guide is not a test result, and a storage note is neither.
//
// A heading must be the heading, not a line that happens to contain the word. A data sheet prints its marketing
// text in a column beside the table, and extraction interleaves the two, so "es the thermal resistance of the
// filament, further" arrived looking like a Thermal Properties heading and ended a section in the middle of one.
// So: anchored at the start, and short enough to be a heading rather than a sentence.
const SECTIONS = [
  [/^(guideline for )?print(ing)?[\s-]*(settings|parameters|guide)|^recommended (print(ing)? )?(settings|parameters)/i, 'print'],
  [/^(storage|packaging|drying|shelf life)\b/i, 'storage'],
  [/^(material|mechanical|thermal|physical|general|electrical|optical)\s+propert/i, 'properties'],
];
const HEADING_LENGTH = 60;
// What a wrapped table row looks like when it continues on the next line: a standard, a method or a unit first.
const CONTINUES_ROW = new RegExp(`^\\s*(?:ISO|ASTM|DIN|IEC|UL|EN|GB\\s?/\\s?T|DSC|TGA|TMA|[DE]\\s?\\d{3,4}|${UNIT_PATTERN})\\b`, 'i');

/** The methods a line names, at family level: "ISO 527-1" and "ISO 527-2" are one method, "ISO 6721" another. */
const methodsOf = (line) => [...new Set((String(line).match(new RegExp(STANDARD_RE.source, 'gi')) ?? [])
  .map((m) => m.replace(/\s+/g, '').toUpperCase().match(/^[A-Z/]+\d+/)?.[0]).filter(Boolean))];

// ASTM's own sheets print the designation without the body: "D 792", "D638", "D 256", "E 2092". Requiring ASTM
// left every one of those rows with no standard at all, and put the property's label in the column that keeps the
// sheet's words for the method. The lookahead is what keeps a word ending in D from starting a designation.
//
// A designation may cite several parts of one standard at once: "ISO 527-1,-2" is one method, not a method and a
// number. Left out of the designation, that ",-2" is a minus sign in front of a 2, and a yield strength printed
// as "ISO 527-1,-2 MPa 70,2" read as -2 MPa. Only a comma that introduces another part is taken, so "ISO 527,
// 23°C" keeps its condition. The letter and the number may be joined by a hyphen ("ASTM D-2240"), and read as a
// value that was a specific gravity of minus two thousand two hundred and forty.
// A comma may also introduce the specimen the method was run on ("DIN 53504, S2",
// "ISO 815-1, method A"); left out, the S2 put a 2 in front of the unit and a tensile strength read as 2 MPa.
// A method variant may also stand apart from the number it belongs to ("ISO 306 A50", "ISO 306/B50"): Extrudr's
// PLA Tough prints "Vicat softening temp. ISO 306 A50 °C 65", and the A50 read as a Vicat point of 50 °C.
const STANDARD_RE = /\b(?:ISO|ASTM\s?D?-?|GB\/T|DIN|IEC|UL|EN|[DE](?=\s?-?\s?\d{3,4}))\s?-?\s?\d+[\w./-]*(?:\s?,\s?(?:-\d+[\w.-]*|[A-Za-z]\d{1,2}\b|method\s+[A-Za-z]\b))*(?:\s?\/\s?[\w.-]+)?(?:\s[A-Z]\d{1,3}\b)?(?::\s?\d{4})?/gi;

// Extraction separates a superscript from its unit ("g/cm 3", "kJ/m 2") and splits digits ("2 43 3 .4"); both are
// repaired before a line is read. A standard's designation is left exactly as printed: the digits inside it are
// not a number, and joining them was what turned "ISO 527" into a fragment in the label.
// A unit can end in a digit, and that digit belongs to the unit: "kJ/m2 19" joined into "kJ/m219" and the
// impact rows of every sheet that prints its unit in a column of its own were invisible. The same guard is in
// pdf-text.mjs's joinDigits; this reader has its own because it joins around the designations it found itself.
// A split digit group is a fragment: extraction breaks "2 433 .4" and "1 05", never a four-figure number in
// half. Two runs of three figures or more standing side by side are two numbers, and joining them wrote a
// tensile modulus of 22 901 290 MPa from a colorFabb row whose two value columns print 2290 and 1290.
const joinLocal = (t) => t.replace(/(?<![A-Za-z°²³]\d*)(?<!\d{3})(\d) (?=\d+(?![\d.,]))|(?<![A-Za-z°²³]\d*)(\d) (?=\d{1,2}(?![\d.,]))/g, '$1$2').replace(/(\d) ?\. ?(?=\d)/g, '$1.').replace(/(\d), (?=\d)/g, '$1,').replace(/\bO\.(?=\d)/g, '0.');
// Extraction splits a standard's own number too ("ISO 11 8 3", "ISO 17 9", "D 2 56"), and the designation is
// matched before the digits are joined, so the match stops at the first fragment and the rest is lost. A fragment
// is part of the designation when it is a single digit standing alone and nothing that looks like a value follows:
// a number after a standard carries its unit ("ISO 75 80 °C"), and the suffix of ISO 179/1eU is not digits.
const joinStandardDigits = (line) => line.replace(
  /\b((?:ISO|ASTM\s?D?|DIN|IEC|UL|EN|GB\s?\/\s?T|[DE])\s?\d{1,4})((?:\s\d(?![\d.,]))+)(?![\s]*[°%\w])/g,
  (m, head, frags) => (`${head}${frags}`.match(/\d/g) ?? []).length <= 5 ? head + frags.replace(/\s/g, '') : m);

function repair(text) {
  // A superscript the extractor dropped rather than separated: Polymaker's sheets come out as "1.25 g/cm" and
  // "2.6 kJ/m". A density is per cubic centimetre and an impact strength is per square metre; there is no other
  // reading, and without the exponent the unit is not one the property is kept in and the row is lost.
  // The degree sign a maker typed instead of the degree sign: colorFabb's sheets set every temperature with a
  // ring above (˚C) and some with a masculine ordinal (ºC), neither of which is the degree sign the database and
  // the build's own converter keep the unit in, so 74 glass transitions, 43 heat distortion temperatures and
  // every melting point on that maker read as a row stating no value in any unit at all. The three glyphs are one
  // unit — the rest of this file already matches them together — and only in front of a C or an F is one a degree.
  // A scanned sheet has no superscript to separate: the reader that turned the page into text wrote a question
  // mark where the ² and the ³ were printed ("g/cm?", "kJ/m?"). A question mark is neither part of a unit nor
  // part of a number, so it is dropped where it stands against one of those two units and the rules below name
  // the unit as the database keeps it. Without this, Fiberlogy's 33 scans stated every density and every impact
  // strength in a unit nothing is kept in.
  const line = joinStandardDigits(String(text ?? '').replace(/\b(cm|m|mm)\s+([23])\b/g, '$1$2'))
    .replace(/\b(g\s?\/\s?cm|kJ\s?\/\s?m)\s*\?/gi, '$1')
    .replace(/[˚º](?=\s?[CF]\b)/g, '°')
    .replace(/\bg\/cm(?![\d²³])/g, 'g/cm3')
    .replace(/\bkJ\/m(?![\d²³])/g, 'kJ/m2');
  const out = [];
  let last = 0;
  for (const m of line.matchAll(new RegExp(STANDARD_RE.source, 'gi'))) { out.push(joinLocal(line.slice(last, m.index)), m[0]); last = m.index + m[0].length; }
  out.push(joinLocal(line.slice(last)));
  return out.join('');
}

// A power of ten is one number. "6.75×10" and a raised "14" run together read as 1014, and neither 6.75 nor 10
// is a value the sheet printed; the same is true of "2.90E+15". Written "6.75×10^14" by the row pass below, such
// a value is one token here, and none of its pieces is ever offered as a result.
const POWER_RE = /\d+(?:[.,]\d+)?\s*[×x*·]\s*10\s*\^\s*[-+]?\d+|(?<![\d.,])10\s*\^\s*[-+]?\d+|\d+(?:[.,]\d+)?[Ee][-+]\d+/g;

// ---------------------------------------------------------------------------------------------------------
// The rows a page prints.
//
// The extractor groups spans by their baseline, so a line is a baseline and not a row. A table whose value
// column is set on a baseline of its own therefore arrives as two lines that are one row: SUNLU prints "35±5" a
// point above "(X-Y) Tensile Strength ISO 527/2 50 mm/min MPa", and a reader that takes a line for a row saw a
// label with no value and a number with no label on every row of all 53 of their sheets.
//
// What makes a piece part of a row is the page itself, in three things it shows: the piece stands in the band
// the row's own text occupies (whatever baseline it was set on), it stands clear of that text across the page
// (two cells of one row do; two lines of a paragraph never do), and it is a piece rather than a sentence — one
// short run stating a number, a bound or the dash a maker prints where a row has no value. All three are needed:
// the label of the row below stands clear horizontally too, and the column of marketing text beside the table
// shares the band of whatever row it happens to fall beside.
// ---------------------------------------------------------------------------------------------------------

const spanRight = (s) => s.x + (s.w ?? 0);
const inked = (line) => (line.spans ?? []).filter((s) => s.str?.trim());

/**
 * How tall the text on a line is, in the page's own units: a proportional font's average character is about half
 * its size, and the extractor reports the width of every piece it read. The blanks are left out because their
 * reported width measures nothing — SUNLU's sheets report a single space as 2 189 units wide.
 */
export function lineHeight(line) {
  const spans = inked(line);
  const chars = spans.reduce((a, s) => a + s.str.trim().length, 0);
  const width = spans.reduce((a, s) => a + (s.w ?? 0), 0);
  return chars > 0 && width > 0 ? (width / chars) * 2 : 10;
}

/**
 * Whether a piece belongs to this row: its baseline stands inside the band the row's own text occupies. The band
 * is measured from the row, never from the piece: a piece is one or two glyphs, and a glyph measured alone is no
 * measurement of anything ("≥" read as twenty units tall and "/" as six). A superscript sits high in the band and
 * a value sits on its floor, so the band reaches further up than down; the next row is a whole line away.
 */
const inBandOf = (row, piece) => {
  const h = lineHeight(row);
  return piece.y >= row.y - 0.3 * h && piece.y <= row.y + 0.7 * h;
};

/** Whether two pieces of text stand over each other across the page, which two cells of one row never do. */
const overlapsAcross = (a, b) => a.some((s) => b.some((t) => Math.min(spanRight(s), spanRight(t)) - Math.max(s.x, t.x) > 1));

// What a piece of a row looks like: one short run of text with no gap in it, stating a number, a bound, or the
// dash a maker prints where a row has no value. A sentence is not one, and neither is a word: that is what keeps
// the column beside the table out. Spectrum prints its marketing text three points off the table's baselines, and
// a row that took whatever shared its band read "Charpy impact strength* ness, making printed parts resistant to
// loads and" and lost three of the sheet's own values.
const FRAGMENT = 16;
const STATES_A_VALUE = new RegExp(`^[${BOUNDS}~+-]?\\s*[.,]?\\d`);
const NO_VALUE = /^[/–—-]$|^n\.?\/?a\.?$/i;
// The same statement with the column's unit still printed beside it: purefil prints "- °C", "- %" and
// "- W/(K*m)" where it publishes nothing, and colorFabb prints "NA ˚C". The row states no value, which is a
// statement about the maker's measurement and not about the database's units.
const NO_VALUE_CELL = () => new RegExp(`^(?:[/–—-]|n\\.?/?a\\.?)\\s*(?:${UNIT_PATTERN})?$`, 'i');
// A unit standing alone is a piece of a row too. Eryone sets the unit column of its property table a few points
// below the rest of the row, so "℃" arrives as a line of its own and the row above it states a Vicat point, a heat
// distortion temperature and a glass transition with no unit at all. A unit the lexicon knows is as much a piece as
// the superscript of one; it is never a sentence, and it is never the row's own value.
const BARE_UNIT = () => new RegExp(`^(?:${UNIT_PATTERN})$`, 'i');
export function isFragment(line) {
  const cells = lineCells(line);
  if (cells.length !== 1) return false;
  const text = cells[0].text.trim();
  return text.length <= FRAGMENT && (STATES_A_VALUE.test(text) || NO_VALUE_CELL().test(text)
    || new RegExp(`^[${BOUNDS}]$`).test(text) || BARE_UNIT().test(text));
}

// Where a raised piece belongs: a superscript is printed hard against the piece it raises, so it starts where
// that piece ends. The 2 of "kJ/m²", the 3 of "g/cm³" and the 14 of "6.75×10¹⁴" all do; a value stands in the
// value column, a wide gap away from anything. The tolerance is a fraction of a character: SUNLU's exponents
// start 0.4 units before their ten ends, and its unit superscripts exactly where the unit ends.
const AGAINST = 1.5;
// What a raised number is the power of: a ten standing on its own, or one a mantissa is multiplied by.
const POWER_HOST = /(?:^|[\s(])(?:\d+(?:[.,]\d+)?\s*[×x*·]\s*)?10\s*$/;

/**
 * A row's pieces as one line, with anything it set above its own baseline joined to what it raises.
 *
 * A unit's superscript is joined to the unit, because that is what the unit is called ("kJ/m2", "g/cm3"), and
 * spanText already writes it that way: the page leaves no gap between them. An exponent is written "^14"
 * instead, because "6.75×10" and "14" run together read as 1014. A power of ten is one number or it is not read.
 */
function joinRow(lines) {
  const base = lines[0];
  const spans = lines.flatMap((line) => (line.spans ?? []).map((s) => ({ ...s, y: line.y })));
  for (const line of lines.slice(1)) {
    const own = inked(line);
    // A raised piece is a short number of its own: a superscript or an exponent, never a row's value.
    if (own.length !== 1 || !/^[-+]?\d{1,3}$/.test(own[0].str.trim())) continue;
    const host = spans.filter((s) => s.y < line.y && s.str.trim() && Math.abs(spanRight(s) - own[0].x) <= AGAINST)
      .sort((a, b) => spanRight(b) - spanRight(a))[0];
    if (!host) continue;
    const upTo = spans.filter((s) => s.y === host.y && s.x <= host.x).sort((a, b) => a.x - b.x).map((s) => s.str).join('');
    if (!POWER_HOST.test(upTo)) continue;
    const raised = spans.find((s) => s.y === line.y && s.x === own[0].x && s.str === own[0].str);
    raised.str = `^${own[0].str.trim()}`;
  }
  // The blanks are dropped, because their reported width measures nothing and a row built from two baselines is
  // measured by what is inked on it: one Flashforge row reports a single space as 5 432 units wide, and a
  // character width taken from that made every real gap on the row too small to be a gap, so its unit and its
  // value ran together as "Mpa1960~2000". Every piece carries its own x, so the page's own spacing survives.
  const sorted = spans.filter((s) => s.str?.trim()).sort((a, b) => a.x - b.x);
  return {
    y: base.y,
    x0: Math.min(...lines.map((l) => l.x0 ?? Infinity)),
    x1: Math.max(...lines.map((l) => l.x1 ?? 0)),
    text: spanText(sorted),
    spans: sorted.map(({ x, w, str }) => ({ x, w, str })),
  };
}

/**
 * The page's lines as the page's rows.
 *
 * A row is a line that states something and the pieces standing in its band: the value column's number, the sign
 * in front of it, the superscript of its unit. A piece belongs to the row whose band holds it and whose text it
 * does not stand over; a piece that belongs to no row is left exactly as it was, and so is every line that is a
 * row on its own.
 *
 * Then the rows whose label the page set on a baseline of its own are put back together (gatherLabelled below).
 */
export function pageRows(lines, registry = null) {
  const anchors = lines.map((l, i) => [l, i]).filter(([l]) => !isFragment(l));
  const attached = new Map();
  const claimed = new Set();
  for (const [piece, i] of lines.map((l, i) => [l, i]).filter(([l]) => isFragment(l))) {
    // A piece printed hard against a row belongs to that row, whatever else shares its band: the 2 of "kJ/m²"
    // stands where the unit ends, and a tall label above it was claiming those superscripts and leaving the
    // impact rows of the sheet in a unit the database does not keep them in.
    const from = Math.min(...inked(piece).map((s) => s.x));
    const against = (row) => inked(row).some((s) => Math.abs(spanRight(s) - from) <= AGAINST);
    // A row begins with its label, so its own pieces stand to the right of where it begins. The page beside it
    // does not: purefil sets a printing table and a property table side by side, one row apart, and the printing
    // table's values ("190-230 °C", "60 °C") were read as pieces of whichever property row shared their band —
    // which put a temperature at the head of the row and lost the property, the method and the value with it.
    const rightOf = (row) => from >= Math.min(...inked(row).map((s) => s.x));
    const fits = anchors.filter(([row]) => inBandOf(row, piece) && rightOf(row))
      .sort((a, b) => (against(b[0]) ? 1 : 0) - (against(a[0]) ? 1 : 0) || Math.abs(a[0].y - piece.y) - Math.abs(b[0].y - piece.y));
    const to = fits.find(([row, at]) => !overlapsAcross([...inked(row), ...(attached.get(at) ?? []).flatMap(inked)], inked(piece)));
    if (!to) continue;
    if (!attached.has(to[1])) attached.set(to[1], []);
    attached.get(to[1]).push(piece);
    claimed.add(i);
  }
  return shareMergedCells(gatherLabelled(lines.map((line, i) => (attached.has(i) ? joinRow([line, ...attached.get(i)]) : line))
    .filter((_, i) => !claimed.has(i)), registry));
}

/**
 * The method and the unit of two rows, printed once in a cell the table merged across both.
 *
 * Flashforge prints "Bending Modulus (X-Y) 2100~2400", then "ISO 178 Mpa" on a baseline of its own, then
 * "Bending Modulus (X-Z) 1960~2000": the two rows are tested to one method in one unit, and the sheet says so
 * once, in a cell set between them. Read as three lines, the table gives two rows that name a property and a
 * number in no unit at all and one line that is a method and a unit belonging to nothing, which is every bending
 * and every impact row of that maker.
 *
 * A shared cell is a line that is nothing but a method and a unit: no property, no number of its own. It is
 * shared only where the rows above and below it are both waiting for one — each names a property, states a
 * number, and prints no unit anywhere on its line. A row that prints its own unit is complete and is left alone,
 * which is what keeps this from touching the makers whose method column simply stands between two finished rows.
 */
const METHOD_AND_UNIT_ONLY = (text) => {
  const t = repair(String(text ?? '')).trim();
  if (!t || !new RegExp(STANDARD_RE.source, 'i').test(t) && !BARE_UNIT().test(t)) return false;
  return !withoutMethodsAndUnits(t).replace(/[\s.,;:()/-]/g, '');
};
const statesANumberInNoUnit = (line) => {
  const t = repair(String(line.text ?? '')).replace(new RegExp(STANDARD_RE.source, 'gi'), ' ');
  return /\d/.test(t) && !new RegExp(`(?:${UNIT_PATTERN})`, 'i').test(t) && Boolean(labelFor(repair(String(line.text ?? '')).trim()));
};
const SHARED_REACH = 2;
export function shareMergedCells(lines) {
  const shared = new Map();
  for (let i = 0; i < lines.length; i++) {
    if (!METHOD_AND_UNIT_ONLY(lines[i].text)) continue;
    const reach = SHARED_REACH * lineHeight(lines[i]);
    const above = lines[i - 1], below = lines[i + 1];
    if (!above || !below) continue;
    if (Math.abs(above.y - lines[i].y) > reach || Math.abs(lines[i].y - below.y) > reach) continue;
    if (!statesANumberInNoUnit(above) || !statesANumberInNoUnit(below)) continue;
    shared.set(i - 1, lines[i]);
    shared.set(i + 1, lines[i]);
    shared.set(i, null);
  }
  if (!shared.size) return lines;
  return lines.map((line, i) => (shared.get(i) ? joinRow([line, shared.get(i)]) : line))
    .filter((_, i) => !shared.has(i) || shared.get(i));
}

// Where a row's label ends and the rest of the row begins, when the page set them on baselines of their own.
//
// Eryone prints "ASTM D792 (ISO 1183, GB/T 1033) g/cm³ 1.32" and, two points lower, "Density(g/cm³ at 21.5 ° C）";
// Flashforge prints "ISO 1133 g/10min 6~10" and, a point lower, "Melt Flow Rate (MFR) (220℃/5Kg)". Neither line is
// a fragment — each is several cells wide — so the pass above leaves them apart, and the sheet reads as a label
// with no value and a value with no property, which is the whole of both makers' property tables.
//
// What makes the other line part of the label's row, rather than the next row or the page beside it, is the same
// three things a piece is judged by: its baseline is a fraction of a line from the label's (the next row is a
// whole line away, and a paragraph's lines are too), it stands clear of the label across the page, and it begins
// to the label's right, where the rest of a row stands. And it must name no property of its own: two labels are
// two rows, however the page set their baselines.
//
// And it must read as cells of a table rather than as a sentence. A line the page itself split into cells is one
// however long it is; a line the page left whole is one only where it is short and states a number or a unit,
// which is what a value column or a unit column set on its own baseline looks like. Spectrum sets its marketing
// text three points off the table's baselines, and a rule that gathered whatever stood beside a label read
// "Izod Impact Strenght to classic PCTG. The use of carbon fibres increas-" as one row and lost eleven values.
const SAME_ROW = 0.5;
// Two ordinary words in a row are a phrase, and a phrase is prose: what a row states between its label and its
// value is a method, a unit, a condition and a number, and none of those is a word next to a word. So the
// designations and the units are taken out first, because a method's body reads as a word beside another one:
// "50mm/min GB/T 1040.4 MPa 55.2" is a value column, and "min GB" is not two words of prose.
const PHRASE = /\b[A-Za-z]{2,}\s+[A-Za-z]{2,}\b/;
const withoutMethodsAndUnits = (text) => String(text)
  .replace(new RegExp(STANDARD_RE.source, 'gi'), ' ')
  .replace(new RegExp(`(?:${UNIT_PATTERN})`, 'gi'), ' ');
const isRowPiece = (line) => {
  const text = repair(String(line.text ?? '')).trim();
  if (!text || PHRASE.test(withoutMethodsAndUnits(text))) return false;
  return /\d/.test(text) || BARE_UNIT().test(text) || NO_VALUE_CELL().test(text);
};
export function gatherLabelled(lines, registry = null) {
  // What makes a line a label is that no row can be read from it, which is the reader's own answer and not a
  // guess at one: a designation's digits are not a value (a Charpy row citing GB/T 1043.1-2008 beside its unit
  // read as a line that already states one) and neither is a condition (Flashforge heads its melt flow row
  // "Melt Flow Rate (MFR) (220℃/5Kg)", where 220 ℃ is the test and the value is on the baseline above).
  const statesAValue = (line) => {
    if (registry) return Boolean(readRow(line.text, registry));
    const t = repair(String(line.text ?? '')).replace(new RegExp(STANDARD_RE.source, 'gi'), ' ');
    return valueRe().test(t) || unitFirstRe().test(t);
  };
  const labelled = lines.map((l, i) => [l, i])
    .filter(([l]) => labelFor(repair(String(l.text ?? '')).trim()) && !statesAValue(l));
  const taken = new Set(), gathered = new Map();
  for (const [label, i] of labelled) {
    const h = lineHeight(label);
    const from = Math.min(...inked(label).map((s) => s.x));
    const rest = lines.map((l, j) => [l, j]).filter(([piece, j]) => j !== i && !taken.has(j) && !gathered.has(j)
      && inked(piece).length && Math.abs(piece.y - label.y) <= SAME_ROW * h
      && Math.min(...inked(piece).map((s) => s.x)) > from
      && isRowPiece(piece) && !labelFor(repair(String(piece.text ?? '')).trim())
      && !overlapsAcross(inked(label), inked(piece)));
    if (!rest.length) continue;
    gathered.set(i, rest.map(([piece]) => piece));
    for (const [, j] of rest) taken.add(j);
  }
  if (!taken.size) return lines;
  return lines.map((line, i) => (gathered.has(i) ? joinRow([line, ...gathered.get(i)]) : line))
    .filter((_, i) => !taken.has(i));
}

// A label may be preceded by something that is not part of the property's name: the axis the bars were printed
// on ("(X-Y) Tensile Strength"), or the same label in the maker's own language first ("拉伸强度(X-Y) Tensile
// Strength"). Neither changes what the row states, and the axis has a column of its own. A label is still read
// from the start of what is left, so a property named in the middle of a sentence is still not its subject.
const AXIS_PREFIX = /^[（(]?\s*(?:X\s?[-‑–]?\s?Y|Y\s?[-‑–]?\s?X|Z\s?[-‑–]?\s?X|X\s?[-‑–]?\s?Z|Z)\s*[)）]\s*/i;
// A maker may set its own language one character to a space ("悬 臂 梁 缺 口 冲 击 强 度 (X-Y) Izod Impact"),
// so the prefix is a run of such characters however it is spaced.
const OTHER_SCRIPT = /^(?:[⺀-鿿　-〿＀-￯]+\s*)+/;

/** The names a line offers the lexicon: what it says, and what it says once such a prefix is off the front. */
export function labelHeads(text) {
  const heads = [String(text ?? '').trim()];
  for (let i = 0; i < 4; i++) {
    const cut = heads.at(-1).replace(OTHER_SCRIPT, '').replace(AXIS_PREFIX, '').trim();
    if (cut === heads.at(-1)) break;
    heads.push(cut);
  }
  return heads;
}

/** The property a line names, if the lexicon knows one. */
export const labelFor = (text) => { const heads = labelHeads(text); return LABELS.find((l) => heads.some((h) => l.re.test(h))); };

// A rate ("10 °C/min", "2 mm/min") and a humidity ("50% RH", "50% r.h.") are conditions of a test, not its
// result. Spectrum's PA6 Low Warp prints "Moisture absorption, 23°C/ 50% r.h. 3,00%", where 50 is the humidity
// the test was run at and 3.00 is the answer.
const RATE_OR_CONDITION = /^\s*(\/\s*(min|h|hr|s)\b|\s*(RH|r\.?\s?h\.?|relative humidity)\b)/i;

/**
 * The unit the database keeps this property in, and the factor from the printed one. The conversion table is the
 * build's own (measurement-rules.js), so a value proposed here converts exactly as the build will check it.
 */
export function targetUnit(property, printedUnit, registry) {
  const units = String(registry.get(property)?.Units ?? '').split(';').map((u) => u.trim()).filter(Boolean);
  for (const unit of units) {
    const converted = normalizedRawValue({ 'Raw value': '1', 'Raw unit': printedUnit, 'Normalized unit': unit });
    if (converted != null) return { unit, factor: converted };
  }
  return null;
}

/**
 * What a line publishes: the property it names, the value in the unit that property is kept in, and the standard
 * behind it.
 *
 * The label is read first and the value second, because a row's conditions carry units of their own: "Water
 * absorption, 23°C/24h <0.3%" and "Heat Distortion Temperature @ 0.455MPa 78°C" both begin with a number and a
 * unit that is not the result. So every number on the line is a candidate, and the one that counts is the first
 * whose unit is one the named property is kept in. Reading left to right instead recorded a water absorption of
 * 23 °C.
 *
 * A sheet may lay its table out in columns or run the row together on one line, and the same maker does both on
 * different sheets, so this reads the line as text either way.
 */
export function readRow(text, registry, held = null) {
  const line = repair(text);
  const match = labelFor(line) ?? held;
  if (!match) return null;
  // A standard's designation is not a value, and on a table that prints its unit in a column the two sit next to
  // each other: "Density ISO 1183 g/cc 1.35" offers "1183 g/cc" to a reader that does not know that.
  const designations = [...line.matchAll(new RegExp(STANDARD_RE.source, 'gi'))].map((m) => [m.index, m.index + m[0].length]);
  const inDesignation = (at) => designations.some(([from, to]) => at >= from && at < to);
  // A number written into a designation's own slashes is not a value either, whatever is left of the designation:
  // extraction dropped the I of "ISO 527-2/5A/500" on one sheet, and the 500 that survived next to "MPa" was read
  // as a modulus of 500 where the sheet prints 42.
  const afterSlash = (at) => /\/$/.test(line.slice(0, at));
  // A power of ten is one number, and neither of its pieces is a value: "6.75×10^14" is not 6.75 and not 10.
  const powers = [...line.matchAll(POWER_RE)].map((m) => [m.index, m.index + m[0].length]);
  const inPower = (at) => powers.some(([from, to]) => at >= from && at < to);
  // A standard's digits are blanked before the values are matched, so they cannot be read as a value and cannot
  // reach into what follows them: "Glass Transition Temp. DSC, ISO 11357 -55 °C" had the minus taken for a
  // range dash, because the rule that reads "55-60" as a window saw 11357 in front of it.
  const masked = line.replace(new RegExp(STANDARD_RE.source, 'gi'), (m) => ' '.repeat(m.length));
  const candidates = [...masked.matchAll(valueRe())].filter((m) => !inDesignation(m.index) && !afterSlash(m.index) && !inPower(m.index));
  // The table may have put the unit in a column before the value, and a row that does may still carry a "number
  // unit" pair that is not its result: "Notched impact strength ASTM D256 kj/m² 100 @ 23°C" states the test
  // temperature that way. Offering only the temperature lost every impact row of that layout, so both readings
  // are candidates and the one that counts is still the first in a unit the property is kept in.
  {
    for (const m of line.matchAll(unitFirstRe())) {
      const { unit, lead, value, spread, upper } = m.groups;
      const reordered = [m[0], value, unit];
      // The value stands past the unit and past whatever condition the row states between them, which is what
      // the match itself measures: a unit may end in a digit ("kJ/m2 11" placed the value at the 2 of the unit)
      // and a condition carries digits of its own ("kJ/m2 2.75J 2.83").
      reordered.index = m.index + m[0].indexOf(unit) + unit.length + lead.length;
      reordered.end = m.index + m[0].length;
      reordered.input = m.input;
      // Where the unit came first, what qualifies the value comes after it, not before it.
      reordered.unitFirst = true;
      reordered.spread = spread ?? null;
      reordered.upper = upper ?? null;
      if (!inDesignation(reordered.index) && !inPower(reordered.index)) candidates.push(reordered);
    }
  }
  // A hardness states its scale in the label and prints a bare number ("Rockwell Hardness (R-Scale) 55"), because
  // the scale is the unit. Every other property prints its unit beside the value; a hardness row that carries a
  // "number unit" pair carries a condition ("ISO 868, 23℃"), so this is tried when nothing else read the row
  // rather than only when the line offered no pair at all.
  const asHardness = () => {
    if (match.Property !== 'Hardness') return null;
    // The scale is the unit: Shore A, Shore D, Rockwell R or Rockwell M, however the sheet writes it
    // ("R-Scale", "R Scale", "Rockwell R"). Taking the last letter of the match read "R-Scale" as scale E.
    // A sheet may put the scale after the word it qualifies ("Shore hardness D") as well as before it.
    const shore = /\bshore\s*(?:hardness\s*)?([ad])\b/i.exec(line);
    // A sheet states the scale in the label ("Rockwell Hardness, R Scale"), or in the unit beside the number
    // ("80 HRM"), which is the same statement written the other way round.
    // A maker may print the scale in its own language: Extrudr's English sheets carry "R-Skala".
    const rockwell = /\brockwell\s*([rm])\b/i.exec(line) ?? /\b([rm])[\s-]?(?:scale|skala)\b/i.exec(line) ?? /\bHR([RM])\b/i.exec(line);
    // A shore hardness may carry its scale on the number instead of in the label: "Shore hardness ... 95A".
    // A shore hardness may carry its scale on the number, behind it ("95A") or in front of it ("A95").
    const suffix = /\bshore\b/i.test(line) ? (/\b\d{2,3}\s?([ad])\b/i.exec(line) ?? /\b([ad])\s?\d{2,3}\b/i.exec(line)) : null;
    // A unit column that names both durometer scales ("HA/HD", ISO 868) states the family and settles nothing,
    // and the database keeps that reading in its own words (V000420, V002456). It is the scale that is missing,
    // not the value: a Shore A 85 and a Shore D 85 are different hardnesses and neither may be assumed.
    const family = /\bH\s?A\s?\/\s?H\s?D\b|\bshore\s?A\s?\/\s?D\b/i.test(line) ? 'Shore (scale not specified by source)' : null;
    const scale = shore ?? rockwell ?? suffix;
    // The standard is stripped first, or "ISO 2039-2" gives the hardness a value of 2. So is every condition the
    // row states: a hardness row prints the temperature it was measured at ("ISO 868, 23℃, HA/HD, 85"), and the
    // first number on the line was read as a hardness of 23.
    const plain = line.replace(STANDARD_RE, ' ').replace(/\(.*?\)/g, ' ')
      .replace(/-?\d+(?:[.,]\d+)?\s*(?:[°º˚]\s?[CF]\b|℃|℉|%|s\b|sec\b|min\b|h\b|hr\b|kg\b|N\b|mm\b)/gi, ' ');
    const bare = /(-?\d+(?:[.,]\d+)?)\s*[AD]?\s*(?:(?:±|\+\/-)\s*(\d+(?:[.,]\d+)?))?/i.exec(plain.slice(plain.search(/\d/)));
    if ((scale || family) && bare) {
      const unit = shore || suffix ? `Shore ${(shore ?? suffix)[1].toUpperCase()}`
        : rockwell ? `Rockwell ${rockwell[1].toUpperCase()}` : family;
      const target = targetUnit('Hardness', unit, registry);
      if (target) return { match, label: line.slice(0, line.indexOf(bare[1])).trim(), conditions: line.slice(0, line.indexOf(bare[1])).trim(),
        raw: bare[1], rawNumber: rawNumber(bare[1]) == null ? bare[1] : String(rawNumber(bare[1])), printedUnit: unit,
        uncertainty: bare[2] == null ? null : String(rawNumber(bare[2])), upper: null,
        target, standards: (line.match(STANDARD_RE) ?? []).map((m) => m.replace(/\s+/g, ' ').trim()), operator: '=', range: false };
    }
    return null;
  };
  for (const candidate of candidates) {
    // The factor is from the unit the sheet printed, not from what that unit is called here: reading it from the
    // normalized name converted kg/m³ to kg/m³ and recorded every density as 1.33.
    const target = targetUnit(match.Property, candidate[2], registry);
    if (!target) continue;
    let before = line.slice(0, candidate.index);
    const after = line.slice(candidate.end ?? (candidate.index + candidate[0].length));
    if (RATE_OR_CONDITION.test(after)) continue;
    // Where the unit came first, what qualifies the value is behind it and the regular expression already has it.
    // Looking in front of such a value instead reads the unit's own digit as a number: "g/cm3 1.14" offered the 3
    // of the unit as the value and its 1.14 as the spread, and every density printed that way became 3000 kg/m³.
    // A published spread shares its value's unit ("2433.4 ± 79.4 kJ/m2"), so the number beside the unit is the
    // spread and the one before the sign is the value. Reading left to right recorded the spread as the result.
    let spread = candidate.unitFirst ? null : /(-?\d+(?:[.,]\d+)?)\s*(?:±|\+\/-|\+)\s*$/.exec(before);
    // The sign itself may be lost: Polymaker's sheets come out as "Elongation at break (X-Y) 2.77 0.45%", where
    // 0.45 is the spread of 2.77 and the glyph between them did not survive. A number standing alone before the
    // value, with the value a fraction of it, is that.
    if (!spread && !candidate.unitFirst) {
      const bare = /(-?\d+(?:[.,]\d+)?)\s+$/.exec(before);
      const of = (x) => Math.abs(Number(String(x).replace(',', '.')));
      if (bare && !inDesignation(bare.index) && of(candidate[1]) > 0 && of(candidate[1]) <= 0.5 * of(bare[1])) spread = bare;
    }
    // A published window is one statement, not two: "Glass Transition Temperature 55-60°C" is a range whose low
    // end carries no unit of its own. Reading the number beside the unit alone made it a point, and reading the
    // dash as a sign made it -60 °C. The database keeps the pair (Raw upper bound), so the row is read as one.
    const window = spread || candidate.unitFirst ? null : /(-?\d+(?:[.,]\d+)?)\s*[-–~]\s*$/.exec(before);
    const value = spread ? spread[1] : window ? window[1] : candidate[1];
    const uncertainty = spread ? candidate[1] : candidate.spread ?? null;
    const upper = window ? candidate[1] : candidate.upper ?? null;
    // A minus sign in front of a value a property cannot take is not a minus sign: it is the dash of a window
    // whose low end wandered, a footnote marker, or what is left of a designation. A specific gravity of -2240
    // and a density of -1.24 g/cm³ both came from lines that print neither.
    if (Number(String(value).replace(',', '.')) < 0 && !mayBeNegative(match.Property, target.unit)) continue;
    if (spread) before = before.slice(0, spread.index);
    if (window) before = before.slice(0, window.index);
    return {
      match,
      label: before.replace(new RegExp(`[${BOUNDS}~@(,\\s]+$`), '').trim(),
      conditions: before.trim(),
      uncertainty: uncertainty == null ? null : String(rawNumber(uncertainty)),
      upper: upper == null ? null : String(rawNumber(upper)),
      raw: upper != null
        ? `${value}-${upper} ${candidate[2]}`.replace(/\s+/g, ' ').trim()
        : `${value}${uncertainty ? ` ± ${uncertainty}` : ''} ${candidate[2]}`.replace(/\s+/g, ' ').trim(),
      // The build's own reader decides what the digits mean: a decimal comma with one or two places, a thousands
      // comma with three ("13,085 psi" is thirteen thousand, not thirteen).
      rawNumber: String(rawNumber(value)),
      printedUnit: candidate[2], target,
      // A sheet may print the method before the value or after it, so the standards are read from the whole line.
      standards: (line.match(new RegExp(STANDARD_RE.source, 'gi')) ?? []).map((m) => m.replace(/\s+/g, ' ').trim()),
      // "from 200 °C" and "min. 5 %" are bounds the sheet states in words, and a bound limits an estimate where a
      // point would move it.
      operator: new RegExp(`[${BOUNDS}]\\s*$`).test(before) ? boundOperator(before)
        : /(?:^|[^/\w])(from|minimum|at least|>=)\s*$/i.test(before) ? '>'
        : /(?:^|[^/\w])(up to|maximum|<=)\s*$/i.test(before) ? '<' : '=',
      range: !window && /[-–~]\s*$/.test(before),
      // "24.000 kg/cm2" is twenty-four thousand on a European sheet and twenty-four on an American one. Which it
      // is comes from reading the sheet, so the row says it is ambiguous and a person settles it (V000731 is the
      // precedent: the raw value records both the number and what the sheet printed).
      ambiguous: /^(?!0[.,])\d{1,3}[.,]\d{3}(?!\d)$/.test(value) ? `"${value}" may be a thousands separator or a decimal one` : null,
    };
  }
  return asHardness();
}

// A printing setting is read by its own label, wherever on the page it sits. Reading it by the section it falls
// under does not survive a two-column sheet: extraction interleaves the printing table with the storage paragraph
// beside it, so "Bed temperature 60-80°C" arrived under a Storage heading and was thrown away, while
// "Nozzle temperature 230-260°C STORAGE AND SHELF LIFE" kept the neighbouring column's heading in its cell.
//
// The value is taken from the label's own cell (the page's own column gaps, pdf-text.mjs), and what follows a
// complete value is the next column's text, not part of the setting.
// A range may be written with a tilde, which is how Flashforge and every sheet typeset in China write one
// ("240~270°C", "0~40%", "0.12~0.3mm"). Cut at the dash alone, such a setting kept its first number and
// lost the window, and a nozzle row that no longer stated a temperature was thrown away altogether.
const VALUE_HEAD = /^\s*(?:[<>≥≤~]\s*)?(?:\d+(?:[.,]\d+)?\s*(?:°\s?C|℃|%|mm)?\s*(?:[-–—~～]|to)\s*)?\d+(?:[.,]\d+)?\s*(?:°\s?C|°C|℃|C\b|%|mm[³3]\/s|mm\/s|mm\/min|mm|m\/s)?/i;
const CONTINUES = /^(\(|up to\b|max\b|min\b|or\b|and\b|±)/i;
// Where a neighbouring column's sentence begins: a run of capitals, or a sentence's subject and verb.
const FOREIGN = /\s(?=[A-Z]{2,}(?:\s+[A-Z&]{2,})+)|\s(?=[A-Z][a-z]+\s+(?:should|is|are|has|have|may|shall|can|will|must)\b)/;

export function settingValue(text) {
  // The punctuation between a label and its value is not part of the value. A full stop is, where it is the
  // start of a number (".5 mm"), and only there: SUNLU abbreviates its labels ("Drying Temp."), and the stop
  // left behind by the match was kept as the first character of every setting on the sheet.
  const value = String(text ?? '').replace(/^(?:[\s:=*•–—-]+|\.(?!\d))+/, '').trim();
  const head = VALUE_HEAD.exec(value);
  if (head && head[0].trim()) {
    const rest = value.slice(head[0].length).trim();
    return CONTINUES.test(rest) && rest.length <= 24 ? value : head[0].trim();
  }
  const cut = value.search(FOREIGN);
  return (cut > 0 ? value.slice(0, cut) : value).trim().slice(0, 80);
}

/**
 * A page that prints its property table and its print-settings table side by side runs the two together on one
 * line, because extraction reads a page by rows: Extrudr's sheets come out as "Tensile modulus ISO 527-2/5A/500
 * MPa 40 Nozzle 230-260°C". Both halves are the sheet's own statements and both belong in the proposal, so the
 * line is cut where the second table's first cell names a setting: what is left of the cut is the row, what is
 * right of it is the setting.
 *
 * Read whole instead, such a line offered the row a temperature from the column beside it, which is the candidate
 * the property's own unit never matched and the reason a modulus printed as "MPa 40" was never read; and because
 * a line that names a property is never taken for a setting, the nozzle, the bed, the enclosure and the maximum
 * volumetric speed were never read either.
 */
export function splitAtNeighbour(line) {
  const cells = lineCells(line);
  for (let i = 1; i < cells.length; i++) {
    if (!SETTINGS.some((s) => s.re.test(repair(cells[i].text).trim()))) continue;
    const spans = line.spans ?? [];
    const left = spans.filter((s) => s.x < cells[i].x), right = spans.filter((s) => s.x >= cells[i].x);
    if (!left.length || !right.length) continue;
    // A cut is only a cut where the half that stays still states something of its own.
    const rowText = spanText(left);
    if (!/\d/.test(rowText)) continue;
    return [{ ...line, text: rowText, spans: left }, { ...line, text: spanText(right), spans: right, x0: cells[i].x }];
  }
  return [line, null];
}

// A word of advice in front of a setting's name, which the lexicon's own labels do not carry: colorFabb prints
// "Advised 3D printing temperature" and "Advised 3D printing speed". The words the lexicon already reads where
// they matter ("Recommended layer height") are left to it, so nothing that reads today reads differently.
const ADVICE_PREFIX = /^(advised|advisable|suggested)\s+(3d\s+)?/i;
// A printing table's unit column, which is not the same list as a measurement's: a speed in mm/s and a layer
// height in mm are settings the register keeps in the maker's own words, and no property is kept in either.
const SETTING_UNIT = /^(?:[°º˚]\s?C|℃|%|mm|cm|mm\s?\/\s?s|mm\s?\/\s?min|mm[³3]\s?\/\s?s|m\s?\/\s?s|sec|min|hrs?|[shg]|kg)$/i;
const isUnitColumn = (cell) => BARE_UNIT().test(cell) || SETTING_UNIT.test(cell);
/**
 * What a line says about how to print, if it says anything: the setting it names and the sheet's own words for it.
 *
 * `below` is the line under this one, where the page set the value there rather than beside the label: purefil
 * prints "Printing Temperature:" and "190-230 °C" one under the other, and every profile of its 39 sheets was
 * empty because the label's own line states nothing. It is used only when the label's line offers no value at all,
 * and the caller has already made sure the line below names no setting and no property of its own.
 */
export function readSetting(line, page = 1, below = '') {
  const cells = lineCells(line).map((c) => repair(c.text).trim()).filter(Boolean);
  const source = cells.length ? cells : [repair(line.text).trim()];
  for (let i = 0; i < source.length; i++) {
    // A maker may put a word of advice in front of the setting's name: colorFabb prints "Advised 3D printing
    // temperature 240 - 260 ºC" and "Advised 3D printing speed 40 - 100 mm/sec". The word is advice about the
    // setting and not another setting, so the name is read from the start of what is left, as a property's is.
    const named = [source[i], source[i].replace(ADVICE_PREFIX, '')].filter((t, k) => k === 0 || t !== source[i]);
    const head = named.find((t) => SETTINGS.some((sl) => sl.re.test(t)));
    if (!head) continue;
    const match = SETTINGS.find((sl) => sl.re.test(head));
    const m = match.re.exec(head);
    const tail = head.slice(m.index + m[0].length);
    // A printing table may stand its unit in a column of its own, as a property table does: colorFabb prints
    // "Nozzle Temp. | ˚C | 240-260", "Print Speed | mm/s | 40-100" and "Active cooling fan | % | 100". A reader
    // that took the cell after the label read the unit as the setting and threw the row away for stating no
    // number; and a nozzle row whose value column holds "240-260" alone states no temperature until its own unit
    // column is put back beside it, which is the sheet's statement either way round.
    const beside = source.slice(i + 1).filter((c) => !isUnitColumn(c));
    const column = source.slice(i + 1).find(isUnitColumn) ?? '';
    // "Closed chamber for printing not necessary" is printed across two cells, and the half that says what it is
    // ("not necessary") is in the second. A tail that states neither a number nor a state is only the start of the
    // sentence, so the next cell finishes it.
    const STATE = /\d|\b(not|no|yes|necessary|required|recommended|needed|advised|optional)\b/i;
    // A bare yes or no in the next cell is the answer to the statement in this one. Spectrum prints "Ruby or
    // hardened nozzle recommended" in one cell and "No" in the next, and reading only the first cell turned a
    // sheet that says a hardened nozzle is not needed into one that recommends it.
    const answer = /^(yes|no)$/i.test(beside[0] ?? '');
    const joined = answer || (!STATE.test(tail) && beside[0] && STATE.test(beside[0]) && `${tail} ${beside[0]}`.length <= 60)
      ? `${tail} ${beside[0]}` : tail;
    // The line below is read only where this line says nothing at all, and only where it states something: a
    // paragraph under a heading is not the heading's value.
    const under = below && below.length <= 40 && STATE.test(below) ? settingValue(below) : '';
    const own = settingValue(joined) || settingValue(beside[0] ?? '');
    const rejoined = own && column && !/[a-z°º˚℃%]/i.test(own) ? `${own} ${column}` : own;
    const raw = rejoined || under;
    if (!raw || !/[a-z0-9]/i.test(raw)) return null;
    // A note has to state something. "exceptional print quality at a speed of up to 600" wraps so that a line
    // begins with the word speed, and read as guidance it put a marketing sentence in the print setup.
    if (match.Field === 'note' && !/\d|\b(not|no|yes|necessary|required|recommended|needed)\b/i.test(raw)) return null;
    // A temperature setting states a temperature. A table whose cells the page ran together offered
    // "Nozzle temperature 50-300mm/s", which is the print speed from the column beside it.
    if (['nozzle', 'bed', 'chamber'].includes(match.Field) && !/[°º˚]\s?[cf]|℃|℉|\d\s?c\b|\b(not|no|yes|necessary|required|recommended|needed|ambient|room)\b/i.test(raw)) return null;
    return { page, field: match.Field, topic: match.Topic || '', label: m[0].trim(), raw, fromBelow: !rejoined,
      line: `${String(line.text ?? '')}${own ? '' : ` ${below}`}`.slice(0, 200) };
  }
  return null;
}

// A footnote is the rest of a row's sentence. A sheet marks a value with an asterisk and says at the bottom of
// the page what the mark means: "*injection moulding", "*dry", "* 3D printed at 100% infill and annealed at
// 110°C/20 min, XY axis". Read without them, 83 rows of the first two batches said a printed specimen where their
// own sheet says a moulded bar, which is the difference D55 exists for.
const FOOTNOTE_MATTERS = /injection mou?ld|^dry\b|\bdry\b|conditioned|anneal|3d print|printed|xy|z axis|speed \d/i;

export function footnotesOf(page) {
  const marks = new Map();
  for (const line of page.lines ?? []) {
    const text = String(line.text ?? '').trim();
    if (!/^\*/.test(text)) continue;
    for (const m of text.matchAll(/(\*{1,4})\s*([^*]+)/g)) {
      const marker = m[1];
      const said = m[2].trim().replace(/\s+/g, ' ');
      if (!said) continue;
      if (!marks.has(marker)) marks.set(marker, []);
      marks.get(marker).push(said);
    }
  }
  // Where one marker carries two footnotes on a page (a print-settings note and a specimen note), the one that
  // says something about the specimen is the one a value's row is asking about.
  const chosen = new Map();
  for (const [marker, said] of marks) chosen.set(marker, said.find((x) => FOOTNOTE_MATTERS.test(x)) ?? said[0]);
  return chosen;
}

/** The footnote a value's own label points at, if it points at one. */
export function footnoteFor(label, footnotes) {
  const marker = /(\*{1,4})/.exec(String(label ?? ''))?.[1];
  if (!marker) return '';
  const said = footnotes.get(marker) ?? '';
  return FOOTNOTE_MATTERS.test(said) ? said : '';
}

/**
 * The unit a row prints beside its value, in the sheet's own characters, or null where it prints none. A unit is
 * short and is not an ordinary word: "mm³", "kN/m", "mg" and "Shore" are units; "Hencky" is the man the ratio is
 * named after.
 */
function printedUnitOf(plain) {
  const tokens = plain.replace(new RegExp(STANDARD_RE.source, 'gi'), ' ').split(/\s+/).filter(Boolean);
  // The value is the last thing a row states, and the unit stands beside it. Taking the first number instead
  // found the rate a thermal row was run at ("@5%Decomposition Temp. ISO 11358 20 ℃/min ℃ ≥415") and called the
  // label beside it the unit; taking any other number found the test speed of a row that states no value at all
  // ("Elongation at break ISO 527/2 50 mm/min %") and called the word "break" one.
  const last = tokens.length - 1;
  const at = new RegExp(`^[${BOUNDS}]?-?\\d+(?:[.,]\\d+)?$`).test(tokens[last] ?? '') ? last : -1;
  const before = at > 0 ? tokens[at - 1] : null;
  // A flammability rating ("V-2", "HB 1,5 mm") stands where a unit stands and is not one.
  const looksLikeAUnit = before && /[a-zµ°%²³]/i.test(before) && !/^[A-Za-z]{1,2}-?\d/.test(before)
    && (before.length <= 5 || /[/°%²³·\d]/.test(before)) && before.length <= 12;
  return looksLikeAUnit ? before : null;
}

/**
 * Why a line that is plainly a row of a property table was not read. The audit closes the loop on these, and
 * "no property and value this line states together" does not tell the owner whether what is missing is a label
 * the lexicon does not know, a unit the property is not kept in, or a property properties.csv does not carry.
 *
 * It names what is missing and proposes nothing: a property, a unit and a vocabulary value are the owner's, and
 * adding one is a change to data/ and schema/ in its own commit.
 */
export function unreadRowReason(line, registry, held = null) {
  const plain = repair(String(line.text ?? '')).trim();
  if (!/\d/.test(plain)) return null;
  // A bullet is not a label, and the sentence beside it is not a row. The value column is read before that rule,
  // because a dash there is the sheet saying it publishes nothing, which is a statement and not a bullet.
  const printedCells = lineCells(line).map((c) => repair(c.text).trim()).filter(Boolean);
  const cells = printedCells.filter((t) => !/^[•–—*-]+$/.test(t));
  // The label is what the row is called, which ends where the method column begins whether or not the page
  // left a gap there.
  const label = (cells[0] ?? '').split(new RegExp(STANDARD_RE.source, 'i'))[0].replace(/\s+/g, ' ').trim();
  // A row whose label is the line above it is not a nameless row: the sheet prints "Izod Impact Strength of
  // Notched Specimen" once and a row per axis under it, and a reason that named no property left the owner to
  // work out which row of the table it was about.
  if (!held && (!/[A-Za-z]{2}/.test(label) || label.split(/\s+/).length > 6)) return null;
  // A row of a table, rather than a sentence that happens to hold a number: it names a method, or it reads as a
  // label, a method and a value in cells of its own.
  // A row whose value column says the sheet publishes nothing is as plainly a row as one that states a number,
  // whether or not it names its method on this line: colorFabb wraps "ISO 1133-A" onto the line below and prints
  // "Melt Flow Index | MFI, (210˚C/2.16 kg), | NA | g/10min" on this one.
  const shaped = new RegExp(STANDARD_RE.source, 'i').test(plain)
    || (cells.length >= 3 && /^[<>≤≥]?-?\d+(?:[.,]\d+)?$/.test(cells.at(-1)) && label.length <= 40 && !/\d/.test(label))
    || (cells.length >= 2 && printedCells.slice(-2).some((c) => NO_VALUE_CELL().test(c)) && label.length <= 40);
  if (!shaped) return null;
  // A sentence about how the bars were made is not a row of the property table, whatever property its first word
  // names: Flashforge lists "Tensile testing specimen; ASTM D638 (ISO 527, GB/T 1040)" under its table, and read
  // as a row it said the sheet states an impact strength in a unit the database does not keep it in.
  if (/\b(test(ing)? specimens?|specimens? were|test bars?)\b/i.test(plain)) {
    return `a description of the specimen the tests were run on, not a result: "${label || plain.slice(0, 60)}"`;
  }
  const printed = printedUnitOf(plain);
  const known = labelFor(plain) ?? held;
  const named = known ? known.Property : `"${label}"`;
  // A row whose value column holds a dash or a slash publishes no value at all. Saying that the line states none
  // in a unit the database keeps is true and useless: the sheet states none in any unit, and nothing is missing
  // here but the maker's measurement.
  // The value column is the last cell, or the one before it where the page stands the unit in a column of its
  // own: colorFabb prints "Melt Flow Index | MFI, (210˚C/2.16 kg), ISO 1133-A | NA | g/10min".
  const none = printedCells.slice(-2).find((c) => NO_VALUE_CELL().test(c));
  if (none) {
    return `the sheet publishes no value for ${named} in this row: its value column prints "${none}"`;
  }
  // A power of ten is one number. Recording 6.75 or 10 from "6.75×10^14" would be a value the sheet never
  // printed, so the row waits for the property and the unit that could carry it.
  const power = new RegExp(POWER_RE.source).exec(plain);
  const asPower = power ? `; its value is a power of ten ("${power[0]}"), which is one number and is never read as either of its parts` : '';
  if (known) {
    const units = String(registry.get(known.Property)?.Units ?? '').trim() || 'nothing';
    return (printed
      ? `the sheet states ${known.Property} in ${printed}, and the database keeps it in ${units}`
      : `the line names ${known.Property} and states no value in a unit the database keeps it in (${units})`) + asPower;
  }
  if (!label) return null;
  return (printed
    ? `properties.csv carries no property for "${label}" (${printed})`
    : `properties.csv carries no property for "${label}"`) + asPower;
}

/** Every value a sheet publishes, with the page and the line it was read from. */
export function readSheet(text, registry) {
  const values = [], settings = [], skipped = [];
  // A sheet that prints the conditions its specimens were made under is describing printed bars, and says so once
  // for the whole table: 3DXTECH heads a block "Printed Specimen Conditions" and lists the printer, the nozzle,
  // the layer height and the orientation under it.
  const printedSpecimens = text.pages.some((p) => (p.lines ?? []).some((l) => /printed specimen conditions|specimen (preparation|conditions)[:\s]|test specimens?( were)? (3d )?printed/i.test(l.text)));
  // A sheet that says how its specimens were laid on the plate has stated the direction its values are in:
  // "Specimen Orientation: XY Flat". A headline in a direction cannot cite a row that does not state one.
  const orientation = text.pages.flatMap((p) => p.lines ?? [])
    .map((l) => /specimen orientation\s*:?\s*(XY|XZ|ZX|Z)\b/i.exec(l.text)?.[1])
    .find(Boolean);
  for (const page of text.pages) {
    const footnotes = footnotesOf(page);
    // A heading governs the column it stands in and no other. Extrudr prints "Recommended settings for printers
    // with a 0.4mm Nozzle." in the print-settings column, halfway down the property table; a section that took
    // the whole page from there explained every row below it as printing guidance, including the four the sheet
    // prints under the heading it was still in.
    let section = 'properties', sectionX = null;
    let held = null, heldLabel = '', heldFor = 0, heldX = 0, heldMethods = [], prefix = '', prefixX = 0;
    // A line that names a property but states no value the property is kept in becomes the label of the rows
    // under it, and until now it left the page without a word either way: Extrudr's "Tensile modulus ISO
    // 527-2/5A/500 MPa 40 Nozzle 230-260°C" simply vanished. A number the sheet prints is a row or a reasoned
    // omission, so the line is remembered and written down if the label is dropped without a row having claimed it.
    let pendingHeld = null;
    const dropHeld = () => {
      if (pendingHeld) skipped.push({ page: pendingHeld.page, text: pendingHeld.text, reason: pendingHeld.reason });
      pendingHeld = null;
    };
    // A sheet may print its table twice, once as printed and once annealed, and say which above each block. A row
    // that does not carry the words itself takes them from the block it is in (MEAS-CONDITIONS-INDISTINCT).
    let block = '';
    // The page's rows, not the extractor's baselines: a value set a point above its label is part of that label's
    // row, and reading the two apart left a number with no property and a property with no number.
    const lines = pageRows(page.lines, registry);
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      const blockHeading = /^\s*\(?(as[- ]printed|annealed|after annealing|not annealed|un-?annealed)\)?\s*$/i.exec(line.text.trim());
      if (blockHeading) { block = blockHeading[1].toLowerCase().replace('after annealing', 'annealed'); continue; }
      // A heading names a section; a row states a value. SUNLU's printing table prints "Drying Temp. 80℃", which
      // begins with the word a storage section begins with, and read as a heading it took the drying temperature
      // off the page and explained everything under it as a storage note.
      const heading = line.text.trim().length <= HEADING_LENGTH && !readSetting(line, page.page)
        ? SECTIONS.find(([re]) => re.test(line.text.trim())) : null;
      if (heading) { section = heading[1]; sectionX = line.x0 ?? 0; dropHeld(); held = null; continue; }
      // Both tables of a two-column page arrive on one line. The row is what is left of the neighbour's first
      // cell, the setting is what is right of it, and the sheet states both.
      const [rowLine, neighbour] = splitAtNeighbour(line);
      if (neighbour) { const beside = readSetting(neighbour, page.page); if (beside) settings.push(beside); }
      const plain = repair(rowLine.text).trim();
      const inSection = sectionX == null || Math.abs((line.x0 ?? 0) - sectionX) <= 24 ? section : 'properties';

      // A stress the sheet states at an elongation is not the strength at break its label names: Extrudr prints
      // "Stress at break ISO 527-2/5A/500 MPa 16 (50%)" and then two more rows, 16 at 100 % and 29 at 300 %, and
      // the label is written once for all three. properties.csv carries no property for a stress at a stated
      // elongation and no vocabulary states the condition, so the row is left for the owner rather than recorded
      // against a property it does not belong to.
      const atElongation = /\d(?:[.,]\d+)?\s*\(\s*(\d{1,4})\s*%\s*\)/.exec(plain);
      if (atElongation && /MPa|N\s?\/\s?mm/i.test(plain)) {
        skipped.push({ page: page.page, text: line.text.slice(0, 160),
          reason: `a stress at ${atElongation[1]} % elongation, which properties.csv carries no property for; the row is not the strength at break the label above it names` });
        continue;
      }

      // A label with no value of its own holds for the next line, which is how a sheet prints a heat deflection
      // temperature and then a row per load. It holds for one line only: a label that survived a row it did not
      // belong to once read a tensile elongation as a Charpy strength.
      // A label with nothing else on the line holds for the next one. It must have no digits at all: a hardness
      // states its value with no unit ("Shore D Hardness 43"), and testing for a unit instead threw those rows away.
      // A printing setting is read wherever it is named, before the section decides what a line is: the sections
      // themselves are unreliable on a two-column page, and a setting names itself. A line that names a property
      // is never a setting, so a property the lexicon knows is never taken for one.
      // A sentence about how the test bars were made is not the printing guidance a reader should follow:
      // "All testing specimens were printed under the following conditions: nozzle temperature = 205 °C".
      const aboutSpecimens = /\b(test(ing)? specimens?|specimens? were|test bars?)\b/i.test(plain);
      if (!aboutSpecimens && !labelFor(plain)) {
        // A table may set the value under the label rather than beside it. The line below is offered only when it
        // is the value and nothing else: it stands in the label's own column, names no method (a row of a
        // property table cites one, and Spectrum wraps "without a heated chamber" so that the word chamber lands
        // above a heat deflection row), names no setting of its own, no property, and no section.
        const under = lines[li + 1];
        const underText = under ? repair(under.text).trim() : '';
        const offered = under && Math.abs((under.x0 ?? 0) - (rowLine.x0 ?? 0)) <= 4
          && !new RegExp(STANDARD_RE.source, 'i').test(underText)
          && !labelFor(underText) && !readSetting(under, page.page)
          && !SECTIONS.some(([re]) => re.test(underText)) ? underText : '';
        const setting = readSetting(rowLine, page.page, offered);
        if (setting) {
          if (setting.fromBelow) li += 1;
          // A statement can run onto the next line: extraction breaks "Closed chamber for printing not necessary"
          // after "printing", and the half that says what it is is on the line below. A value that states neither
          // a number nor a state is unfinished, and the next short line finishes it.
          const next = lines[li + 1];
          if (!/\d|\b(not|no|yes|necessary|required|recommended|needed)\b/i.test(setting.raw) && next) {
            const tail = repair(next.text).trim();
            if (tail.length <= 30 && /\b(not|no|yes|necessary|required|recommended|needed)\b/i.test(tail) && !readSetting(next, page.page) && !labelFor(tail)) {
              setting.raw = `${setting.raw} ${tail}`.replace(/\s+/g, ' ').trim();
              setting.line = `${setting.line} ${tail}`.slice(0, 200);
              li += 1;
            }
          }
          settings.push(setting); dropHeld(); held = null; continue;
        }
      }

      // A line with no number of its own heads the rows under it. It becomes a held label when it names a
      // property the lexicon knows, and a prefix either way: "Tensile Elongation*" names no property until the
      // row below says "At yield". A heading is a few words, so a sentence from the column beside the table
      // ("Filament should be stored in a dry room at room") does not displace one.
      const bare = labelFor(plain);
      // How long a heading is, is measured on the name it gives the rows, not on the maker's own language in
      // front of it: SUNLU's Chinese sheets print "悬 臂 梁 缺 口 冲 击 强 度 (X-Y) Izod Impact" with a space
      // between every character, and counted whole it was eleven words and never held anything.
      const naming = labelHeads(plain).at(-1);
      const headsRows = !/\d/.test(plain) && naming.length <= HEADING_LENGTH && naming.split(/\s+/).length <= 6;
      if (headsRows) { prefix = plain; prefixX = line.x0 ?? 0; }
      // A label line with a number in it but no value of its own still heads the rows under it: 3DXTECH prints
      // "Deflection Temperature at 0.45" and then "ISO 75 °C 172" and then "MPa (66psi)", and the 0.45 is the load,
      // not the result.
      // A heading is a heading, not a paragraph that begins with the word. Extrudr footnotes its table with
      // "HDT B, 0.45MPa flatwise. HDT depends on processing conditions. For crystaline resins, formulation
      // included 3-7% nucleating agent", and held as a label it gave the storage paragraph's "18-27°C" and the
      // tool temperature of the footnote itself to the heat deflection temperature.
      const headsRowsBelow = naming.length <= HEADING_LENGTH && naming.split(/\s+/).length <= 8;
      if (bare && headsRowsBelow && (!/\d/.test(plain) || !readRow(rowLine.text, registry))) {
        // A label line that holds a number of its own and never gives it to a row below is a number the sheet
        // prints and the proposal lost. It is written down when the label is dropped, not here, because until
        // then the row under it may still be the one that states it.
        dropHeld();
        if (/\d/.test(plain)) {
          pendingHeld = { page: page.page, text: line.text.slice(0, 160),
            reason: unreadRowReason(rowLine, registry) ?? 'a label the lexicon knows, with a number its property is not kept in and no row below that stated one' };
        }
        held = bare; heldLabel = plain; heldFor = 0; heldX = line.x0 ?? 0; heldMethods = methodsOf(plain);
        if (!/\d/.test(plain)) { prefix = plain; prefixX = line.x0 ?? 0; }
        continue;
      }

      // A held label carries to the rows under it that state a value but name no property of their own: a sheet
      // prints "Temperature of deflection under load" and then a row per load, or "Izod Impact Strenght" and then
      // a row per notch. Three things keep it from drifting down the page and claiming a value that is not its:
      // it stops at the next row that names a property, it stops after three rows, and the value it takes must be
      // in a unit the held property is kept in, so a tensile elongation in per cent can never become an impact
      // strength in kJ/m². Without the last of those, a held Charpy label once claimed a tensile elongation.
      const own = labelFor(plain);
      // A held label carries down its own column and no other. A sheet prints its marketing bullets beside the
      // table, extraction interleaves the two by line, and a label that carried across the page read "• 10% glass
      // fiber" as a tensile elongation of 10%. A row of the same table starts where its label starts.
      // A row the table wrapped continues where its label ended, in another column: "Glass Transition Temperature"
      // at the label's x and "DSC °C 187" at the value column's. Prose never begins with a standard or a unit, so
      // a line that does is the rest of the row above it wherever the page put it.
      const continuation = CONTINUES_ROW.test(plain);
      // A row that names a method of its own is a row of its own. A wrapped row carries the method of the row it
      // belongs to or names none at all, so a held "Flexural modulus ISO 178 MPa -", whose value the sheet left
      // as a dash, may not claim the tensile storage modulus printed under it to ISO 6721.
      const methods = methodsOf(plain);
      const sameMethod = !heldMethods.length || !methods.length || methods.some((m) => heldMethods.includes(m));
      const under = !own && held && sameMethod && (continuation || Math.abs((line.x0 ?? 0) - heldX) <= 24) && heldFor < 3;
      // A heading and the row under it may name a property that neither names alone.
      const together = !own && prefix && (continuation || Math.abs((line.x0 ?? 0) - prefixX) <= 24)
        ? labelFor(`${prefix} ${plain}`.replace(/\s+/g, ' ').trim()) : null;
      const carried0 = under ? together ?? held : together;
      const heading0 = carried0 === together ? prefix : heldLabel;
      const carry = Boolean(carried0);
      // A printing guide names settings, not properties, so its rows are read without a property label: what a
      // sheet calls its nozzle temperature is its own words, and the profile parsers read those.
      // A property row is read wherever it stands on the page. Suppressing them by section lost the second
      // density of the PET-G ESD sheet, which is printed under the printing guide; a section is unreliable on a
      // two-column page, and what makes a line a result is that it names a property and a value in that
      // property's own unit. The section only decides how a line that is not a result is explained.
      const read = readRow(rowLine.text, registry, carry ? carried0 : null);
      if (!read && inSection !== 'properties') {
        const storage = /\bstor|shelf|humid|moisture|dry room|keep out|desiccan|seal|vacuum|packag/i.test(plain);
        // A row of the property table standing inside another section is still a row, and what it is missing is
        // what the reason should say.
        const unread = unreadRowReason(rowLine, registry);
        if (/\d/.test(plain)) skipped.push({ page: page.page, text: line.text.slice(0, 160), reason: unread ?? (inSection === 'print' ? 'in the printing guide, naming no setting the lexicon knows'
          : storage ? 'a storage or shelf-life note, not a test result' : 'in the column beside the storage note, naming no property and value together') });
        continue;
      }
      // A chart's axis is a number and a unit alone: "100MPa" on the comparison page of a Polymaker sheet was
      // claimed by the bending-strength label four pages earlier. A row of a table says something else too.
      const letters = plain.replace(/[\d\s.,±+/()°º˚%-]/g, '');
      const unitLetters = String(read?.printedUnit ?? '').replace(/[^a-z]/gi, '');
      const bareNumber = Boolean(read) && letters.toLowerCase() === unitLetters.toLowerCase();
      const carried = Boolean(carry && read && !bareNumber);
      // The row below claimed the held label, so the label's own line is accounted for.
      if (carried) { heldFor += 1; pendingHeld = null; }
      if (own || (read && !carried)) { dropHeld(); held = null; heldFor = 0; }
      if (read && carry && bareNumber) { skipped.push({ page: page.page, text: line.text.slice(0, 160), reason: 'a number and its unit alone, with no row of its own: a chart or a comparison, not a result' }); continue; }
      if (!read) { if (/\d/.test(line.text)) skipped.push({ page: page.page, text: line.text.slice(0, 160), reason: unreadRowReason(rowLine, registry, carry ? carried0 : null) ?? 'no property and value this line states together' }); continue; }
      if (read.range) { skipped.push({ page: page.page, text: line.text.slice(0, 160), reason: 'the upper end of a range: a window, not a result' }); continue; }

      // What the row is called is the held label and the row's own words together: a sheet prints "Izod Impact
      // Strenght" once and then a row per notch, and neither line says the whole thing on its own.
      // A label may also wrap around its own row, because the value was set on a baseline between its two
      // halves: SUNLU prints "Izod Impact", then the row, then "Strength of Notched Specimen", and read without
      // the second half three of its impact rows said unnotched where the sheet says notched. The line under a
      // carried row is the rest of its label when it states no number, names no property of its own and stands
      // in the label's column; anything else is the next row and is left alone.
      const below = carried ? lines[li + 1] : null;
      const rest = below && !/\d/.test(repair(below.text)) && repair(below.text).trim().length <= HEADING_LENGTH
        && !labelFor(repair(below.text).trim()) && Math.abs((below.x0 ?? 0) - heldX) <= 24 ? repair(below.text).trim() : '';
      // A full-width bracket is a bracket. A sheet typeset in Chinese prints "（X-Y)", and the axis a row states
      // that way went unread, leaving a stray ")" in the locator and the direction unrecorded (D49's typed column
      // and MEAS-LOCATOR-DIRECTION both saw it). The ideographs stay as the sheet prints them.
      const fullLabel = asciiPunctuation(carried ? `${heading0} ${read.conditions} ${rest}`.replace(/\s+/g, ' ').trim() : read.label);
      // Neither line names the whole property on its own: "Tensile Strength*" heads the block and "At break 55
      // MPa" is the row, and only the two together say which tensile strength it is. So the label is matched
      // again against both, and the more specific answer wins.
      const refined = carried ? labelFor(fullLabel) : null;
      if (refined) read.match = refined;
      const standardText = [read.conditions, ...read.standards].join(' ');
      const method = impactMethod(read.match.Property, fullLabel, standardText);
      // The notch is what the row says, then what the method implies, then what the label's kind usually means.
      const notch = /\bun-?notched\b/i.test(fullLabel) ? 'Unnotched'
        : /\bnotched\b/i.test(fullLabel) ? 'Notched'
        : notchOf(standardText) ?? read.match.Notch;
      // A foaming filament's sheet prints two densities: the filament's, and the one the print reaches when the
      // foaming is active. The second is what the process achieves at a temperature, not a property of the
      // material, and feeding it to the density model taught it that every foaming material weighs 0.37 g/cm³.
      // A sheet may print the two as one window rather than as two rows: a retailer's copy of the same sheet
      // states "Density 0.40 - 1.24 g/cm3" under the headings "@ 210°C; 100% Flow" and "@ 255°C; 60% Flow". The
      // low end of that window is still the foamed print, so a density window on a sheet that names its foaming
      // is left for a reader. A single density on the same sheet is the filament's own and is read as ever.
      // A row with two value columns states two results, and which is the material's own is a question about the
      // sheet's headings, not about this row: colorFabb's lightweight sheets print "Tensile modulus | Tensile,
      // ISO 527-1A | 2290 | 1290 | MPa" under "Value unfoamed @ 210 °C, flow: 100%" and "Value foamed @ 260 °C,
      // flow: 60%". Read as one row, the second column became the first one's spread. Both numbers are the
      // sheet's, so the row waits for a reader rather than losing one of them.
      const columns = lineCells(line).map((c) => repair(c.text).trim())
        .filter((t) => new RegExp(`^[${BOUNDS}~]?-?\\d+(?:[.,]\\d+)?$`).test(t));
      if (columns.length >= 2) {
        skipped.push({ page: page.page, text: line.text.slice(0, 160),
          reason: `the row states ${columns.length} values in columns of its own (${columns.join(', ')}) and the sheet says in its heading what each column is; which of them is this material's is a ruling, not a reading` });
        continue;
      }
      if (read.match.Property === 'Density' && (/foam/i.test(fullLabel) || (read.upper != null && /foam/i.test(line.text)))) {
        skipped.push({ page: page.page, text: line.text.slice(0, 160), reason: 'the density the print reaches with foaming active, which is what the process does and not what the material is' });
        continue;
      }
      values.push({
        page: page.page, property: method?.property ?? read.match.Property, methodNote: method?.note ?? null,
        label: fullLabel, condition: carried ? fullLabel : read.conditions,
        direction: read.match.Direction, notch, read, target: read.target, line: line.text,
        footnote: footnoteFor(`${fullLabel} ${line.text}`, footnotes),
        printedSpecimens, orientation, block,
      });
    }
    dropHeld();
  }
  return { values, settings, skipped };
}

// An impact result is named by its method, not by the word above it. ISO 180, ASTM D256 and GB/T 1843 are Izod;
// ISO 179 and GB/T 1043 are Charpy. Some sheets head a row "Izod" and then cite ISO 179, and the database records
// exactly that case under the generic property with the contradiction in its note (V002092, V002093, V002328):
// naming a test the sheet's own standard denies would be inventing a method. So where the label and the standard
// disagree, the property is the generic one and the row says why.
const IZOD = /ISO\s?180|ASTM\s?D\s?256|GB\/T\s?1843/i;
const CHARPY = /ISO\s?179|GB\/T\s?1043/i;
const NOTCHED_BY_METHOD = [[/ISO\s?179[-\/\s]?1eA|ISO\s?180[-\/\s]?1A|ASTM\s?D\s?256/i, 'Notched'], [/ISO\s?179[-\/\s]?1eU/i, 'Unnotched']];

export function impactMethod(property, label, standardText) {
  if (!['Izod impact strength', 'Charpy strength', 'Impact strength'].includes(property)) return null;
  const saysIzod = /izod/i.test(label), saysCharpy = /charpy/i.test(label);
  const byMethod = IZOD.test(standardText) ? 'Izod impact strength' : CHARPY.test(standardText) ? 'Charpy strength' : null;
  if (!byMethod) return { property, note: null };
  if ((saysIzod && byMethod === 'Charpy strength') || (saysCharpy && byMethod === 'Izod impact strength')) {
    return { property: 'Impact strength', note: `the row is headed "${label.trim()}" and cites ${standardText.trim()}, which is the other test; recorded as unspecified` };
  }
  return { property: byMethod, note: null };
}

/** The notch a method states, for a row whose label does not say. */
export const notchOf = (standardText) => NOTCHED_BY_METHOD.find(([re]) => re.test(standardText))?.[1] ?? null;

/** What a sheet says its product is made of, where it says a fraction: "15% carbon fibers", "30 % glass fibre". */
// What a sheet says is in the product. The load may come before its fraction ("Aramid fibers reinforced (10%)")
// or after it ("10% PTFE content"), and a sheet may name the load without any fraction at all ("enriched with
// carbon nanotubes"). All three are the maker's own statement of the composition, which is what this column keeps.
const FILLER_NAMED = /\b(carbon|glass|aramid|kevlar|basalt|wood|metal|mineral|graphene|nanotubes?|cnt|ptfe|teflon|ceramic|chalk|calcium|talc|bronze|copper|brass|steel|iron|tungsten|cork|bamboo)\b/i;
const FILLER_FRACTION = /\d{1,2}(?:[.,]\d)?\s?(?:wt\.?\s?%|%|percent)/i;
const FILLER_VERB = /\b(reinforced|filled|enriched|loaded|addition of|content|composite)\b/i;
// A load named in full is a statement of what is in the product even where the sentence around it is not.
const FILLER_PHRASE = /\b(carbon nanotubes?|(carbon|glass|aramid|basalt) fib(?:re|er)s?|glass (spheres|beads|bubbles)|metal powder)\b/i;

export function composition(text) {
  const said = (line, page) => `${String(line.text).trim().slice(0, 160)} (p. ${page.page}, as the sheet states it)`;
  let named = null;
  for (const page of text.pages) {
    for (const line of page.lines) {
      const words = String(line.text ?? '');
      if (!FILLER_NAMED.test(words)) continue;
      // A glass transition temperature is not a glass load, and a carbon footprint is not a carbon load.
      if (/glass transition|carbon footprint|carbon neutral|carbon dioxide/i.test(words)) continue;
      // A line that states how much is better than one that only says there is some.
      if (FILLER_FRACTION.test(words)) return said(line, page);
      if (!named && (FILLER_VERB.test(words) || FILLER_PHRASE.test(words))) named = said(line, page);
    }
  }
  return named;
}

/** A certification the sheet claims, as printed. */
export function certification(text) {
  for (const page of text.pages) {
    for (const line of page.lines) {
      if (/\bUL\s?-?94\b|\bV-?[012]\b|\bHB\b|food contact|REACH|RoHS/i.test(line.text) && /\d|HB|V-?[012]/i.test(line.text)) {
        return `${line.text.trim().slice(0, 160)} (p. ${page.page}, as printed; a typical value, not a certificate: verify grade, thickness and certificate)`;
      }
    }
  }
  return null;
}

const NUMBER = (s) => Number(String(s).replace(',', '.'));
const round = (x) => Number(Number(x).toPrecision(10));
const NA = 'Not applicable';
const NP = 'Not published';

// What the register writes on every row rather than per product: the H2C columns are a judgement about our own
// printers that a maker's sheet cannot make, so an imported profile carries the same reservation as the 145 rows
// already there, and the H2C wiki is its source.
const H2C_CELLS = {
  'H2C left': 'Verify exact grade/nozzle; no blanket approval',
  'H2C right': 'Verify exact grade/nozzle; no blanket approval',
  'AMS 2 Pro': 'Not verified for every grade',
  'AMS HT': 'Not verified for every grade',
  'AMS published': NP, 'Support pairing': NP, 'Failure modes': NP,
};

// A fibre-filled filament wears a brass nozzle out whatever its sheet says about it, and every fibre row in the
// register carries this sentence. It is the register's own words, not the sheet's, so the proposal says so and a
// reviewer sees it beside the rows that were read from the page.
const ABRASIVE = 'Use abrasion-resistant nozzle; verify minimum orifice. Fibre concentration and length are grade-specific.';
const FIBRE = /fibre|fiber/i;

/**
 * The print setup a sheet publishes, as the profile row the database keeps and the notes beside it. The raw cells
 * are the sheet's own words; the typed cells are what the build's own parsers read from them, so a proposal cannot
 * disagree with the build about what it says (D49).
 */
export function profilesFor(settings, opts) {
  const nozzles = settings.filter((x) => x.field === 'nozzle');
  if (nozzles.length <= 1) { const one = profileFor(settings, opts); return one ? [one] : []; }
  // A sheet that prints a nozzle temperature per print speed publishes two setups, not one. Keeping only the
  // first loses the other; merging them invents a window neither row states. So each is its own profile, and its
  // Locator names the row of the sheet it came from, the way a measurement's Locator names its table.
  return nozzles
    .map((n) => profileFor(settings.filter((x) => x.field !== 'nozzle' || x === n), { ...opts, locator: `Recommended printing settings: ${n.label}` }))
    .filter(Boolean);
}

export function profileFor(settings, { sourceId, materialId, modifier, locator = 'Recommended printing settings', page = 1 }) {
  const named = settings.filter((s) => s.field !== 'note');
  const notes = settings.filter((s) => s.field === 'note' && s.topic);
  if (!named.length && !notes.length) return null;
  const of = (field) => named.find((s) => s.field === field)?.raw ?? NP;
  const abrasive = FIBRE.test(modifier ?? '');
  // A sheet that says a hardened or ruby nozzle is needed says so in its own words, and those words are what the
  // abrasion column keeps. A sheet that says one is not needed leaves the column unpublished rather than being
  // paraphrased into a claim it did not make; its statement stays in Nozzle material, as the register writes it.
  const hardened = named.find((x) => x.field === 'nozzle-material');
  const affirms = hardened && /\b(yes|recommended|required|necessary|advised)\b/i.test(hardened.raw) && !/\b(not|no)\b/i.test(hardened.raw);
  const raw = {
    'Nozzle °C': of('nozzle'), 'Bed °C': of('bed'), 'Chamber °C': of('chamber'),
    Enclosure: of('enclosure'), Plate: of('plate'), Drying: of('drying'),
    'Nozzle material': of('nozzle-material'), 'Nozzle diameter': of('nozzle-diameter'),
    'Abrasion / clogging': affirms ? `${hardened.label} ${hardened.raw}`.replace(/\s+/g, ' ').trim() : abrasive ? ABRASIVE : NP,
  };
  const parsed = {
    nozzle: parseTemperature(raw['Nozzle °C']), bed: parseTemperature(raw['Bed °C']), chamber: parseTemperature(raw['Chamber °C']),
    enclosure: parseEnclosure(raw.Enclosure), drying: parseDrying(raw.Drying), abrasion: parseAbrasion(raw['Abrasion / clogging']),
  };
  const typed = profileCellsFromParsed(parsed);
  const row = {
    MaterialID: materialId ?? '', GradeID: '', Profile: 'Manufacturer published guidance',
    'Nozzle °C': raw['Nozzle °C'], 'Nozzle state': typed['Nozzle state'], 'Nozzle min °C': typed['Nozzle min °C'], 'Nozzle max °C': typed['Nozzle max °C'], 'Nozzle requirement': typed['Nozzle requirement'],
    'Bed °C': raw['Bed °C'], 'Bed state': typed['Bed state'], 'Bed min °C': typed['Bed min °C'], 'Bed max °C': typed['Bed max °C'], 'Bed requirement': typed['Bed requirement'],
    'Chamber °C': raw['Chamber °C'], 'Chamber state': typed['Chamber state'], 'Chamber min °C': typed['Chamber min °C'], 'Chamber max °C': typed['Chamber max °C'], 'Chamber requirement': typed['Chamber requirement'],
    Enclosure: raw.Enclosure, 'Enclosure state': typed['Enclosure state'], Plate: raw.Plate,
    Drying: raw.Drying, 'Drying state': typed['Drying state'], 'Drying °C': typed['Drying °C'], 'Drying hours': typed['Drying hours'],
    'Nozzle material': raw['Nozzle material'], 'Nozzle diameter': raw['Nozzle diameter'],
    'Abrasion / clogging': raw['Abrasion / clogging'], 'Hardened nozzle': typed['Hardened nozzle'],
    ...H2C_CELLS,
    SourceID: sourceId, 'H2C SourceID': 'H2C-WIKI', Locator: `p. ${(named[0] ?? notes[0]).page}: ${locator}`, 'Parse review': NA,
  };
  return {
    gradeKey: 'main', row,
    notes: notes.map((n) => ({ Topic: n.topic, Text: n.raw })),
    editorial: abrasive && !affirms ? ['Abrasion / clogging'] : [],
    evidence: { page: (named[0] ?? notes[0]).page, text: (named[0] ?? notes[0]).line.slice(0, 200) },
    review: { status: 'proposed' },
  };
}

/** One measurement row, filled the way the schema requires: raw text as printed, typed columns beside it. */
function measurementRow(v, { sourceId, materialId, gradeId, window = {} }) {
  // The sheet's own words for the method: the condition the row states and the standards it names, and not the
  // other column of the page, which the line may run into.
  // The property's own name is not the method: "Specific Gravity" belongs in the Property column and in the
  // Locator, and this column keeps what the row says about how it was measured. Leaving the label here is the
  // transcription damage OPEN-PROBLEMS §1 records, and writing it again would be repeating it.
  // Where the property's own name ends and what the row says about the measurement begins. A sheet writes the
  // condition after a comma, a bracket, an @ or a number, and the name before it; the label regex is not enough,
  // because "Izod" matches and "Izod Impact Strength, Notched @ 23°C" is what the row prints.
  // A condition may follow its value as well as precede it: "156.2°C (as printed)" and "155.2°C (annealed)" are
  // two rows of one sheet, and without the words after the number they say the same thing.
  const after = /\(([^)]{2,40})\)\s*$/.exec(String(v.line ?? '').trim())?.[1] ?? '';
  const printed = [String(v.condition ?? ''), /anneal|as printed|dry|conditioned|moist|wet|flat|edge|upright/i.test(after) ? after : '', v.block ?? ''].filter(Boolean).join(' ');
  // A designation's own digits do not begin the condition. A table that prints its method before its unit runs
  // them together — "Flexural modulus (E-Modulus) ASTM D790 MPa" — and a cut at the first digit made the
  // condition "790 MPa", which the load pattern then read as a test load of 790 MPa the sheet never printed.
  // The axis the row states, and the label in the maker's own language before it, are not the condition either:
  // they stand in front of the property's own name, so a cut at the first bracket of "(X-Y) Tensile Strength ISO
  // 527/2 50 mm/min" made the whole row its own condition and wrote the property's name into the method column.
  // The axis has a column of its own (Direction), which is read from the label.
  const withoutAxis = labelHeads(printed).at(-1);
  const spans = [...withoutAxis.matchAll(new RegExp(STANDARD_RE.source, 'gi'))].map((m) => [m.index, m.index + m[0].length]);
  const at0 = [...withoutAxis.matchAll(/[,(@]|\d/g)].map((m) => m.index)
    .find((i) => !spans.some(([from, to]) => i >= from && i < to)) ?? -1;
  const condition = (at0 > 0 ? withoutAxis.slice(at0) : withoutAxis.replace(v.read.match.re, ' '))
    // The opening bracket and the punctuation before a condition are not part of it; a minus sign in front of a
    // number is. Stripping it turned "Charpy Notched Impact Strength (-30°C)" into a test run at +30 °C.
    .replace(/^[\s,;:@(]+/, '').replace(/^-(?!\s?\d)/, '').replace(/\s+/g, ' ').trim();
  // A rate is a condition of the test, not a temperature it was run at: "VICAT, 50 N (heating rate 50°C/h)".
  const withoutRate = condition
    .replace(/\([^)]*(?:rate|\/\s?(?:h|hr|min))[^)]*\)/gi, ' ')
    // A rate outside its brackets is still a rate: "Melting temperature (DSC), 10°C/min 185°C" recorded 10 °C as
    // the temperature the test was run at.
    // A degree may be one character of its own ("10 ℃/min"), and a rate written that way is still a rate: read as
    // a temperature it gave every SUNLU thermal row a test temperature of 10 °C the sheet never states.
    .replace(/-?\d+(?:[.,]\d+)?\s*(?:[°º˚]\s?C|℃)\s*\/\s*(?:min|h|hr)\b/gi, ' ');
  // A load is printed in MPa, in MN/m² or in N/mm², which are the same unit under three names. It is looked for
  // with the designations out of the way: "ASTM D790 MPa" is a method beside a unit column, and read whole it
  // gave every row of that layout a test load of 790 MPa.
  const withoutStandard = withoutRate.replace(new RegExp(STANDARD_RE.source, 'gi'), ' ');
  const load = /([<>≤≥]?\s*\d+(?:[.,]\d+)?\s*(?:MPa|MN\s?\/\s?m\s?2|N\s?\/\s?mm\s?2))/i.exec(withoutStandard);
  // What the row says about how it was measured: the standard it names and the load it was tested under. The
  // notch, the test temperature and the property's own name have columns of their own, so repeating them here
  // would be the label in the method column again. A row that names neither keeps whatever words are left.
  const rest = withoutRate
    .replace(new RegExp(STANDARD_RE.source, 'gi'), ' ')
    .replace(/([<>≤≥]?\s*\d+(?:[.,]\d+)?\s*(?:MPa|MN\s?\/\s?m\s?2|N\s?\/\s?mm\s?2))/gi, ' ')
    .replace(/\b(un-?notched|notched)\b/gi, ' ').replace(/\b3d\s*print\w*\b/gi, ' ')
    // The unit column has a column of its own too. A table that prints its unit before its value leaves it at the
    // end of the row's words ("23℃ g/cm3"), and keeping it wrote the unit twice.
    .replace(new RegExp(`${String(v.read.printedUnit ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[${BOUNDS}]?\\s*$`), ' ')
    .replace(/[,@()*<>≤≥]/g, ' ').replace(/\s+/g, ' ').trim();
  // What is left of the row's words once the standard, the load and the notch are in their own columns is either
  // a condition of the test or a piece of the property's own name that the label pattern did not reach
  // ("Temperature" from Glass Transition Temperature, ". force" from Tensile Strength at Max. force). A condition
  // states a number or names one of the things that can be done to a specimen; anything else is the name.
  const CONDITION_WORD = /\d|\b(anneal\w*|as printed|dry|dried|conditioned|wet|method|saturation|equilibrium|specimen|injection|mou?ld\w*|printed|film|strand|parallel|perpendicular|flat|edge|upright|foam\w*|dsc|tga|tma|dmta?)\b/i;
  // A remnant that is made of the property's own vocabulary is the name, whatever else it contains: "strength -
  // charpy method" is what the sheet calls the test, and the Property column already says it.
  const LABEL_WORD = /\b(charpy|izod|impact|strength|stress|modulus|elongation|strain|temperature|softening|deflection|distortion|transition|density|gravity|hardness|absorption|content|shrinkage|resistance|conductivity|flexural|tensile|bending|melt|flow|index|rate|point|force|vicat|hdt|mfr|mvr)\b/i;
  const leftover = CONDITION_WORD.test(rest) && (/\d/.test(rest) || !LABEL_WORD.test(rest)) ? rest : '';
  const named = [...new Set([load ? load[1].replace(/\s+/g, ' ').trim() : null, leftover || null, ...v.read.standards].filter(Boolean))];
  const standardText = named.join(' ').trim();
  const standards = readStandards(standardText);
  // What the row says was done to the specimen before it was tested, and how wet it was, in the sheet's own
  // words; the state beside each is what the build's own reader makes of those words (D49). A sheet that says
  // "HDT 0.45 MN/m2, annealed" publishes an annealed value, and a row that does not say so reads as as-printed.
  // What the row says about the specimen is its own words and the footnote its mark points at, together.
  const says = [printed, v.label ?? '', v.footnote ?? ''].filter(Boolean).join(' ');
  // A sheet may write the axis with the plane's letters apart ("(Z-X)"), as it writes "(X-Y)"; the database keeps
  // ZX and XZ, so a row that states one must not be read as stating none.
  // The bracket may have lost its opening: one SUNLU sheet's text layer begins a row "X-Y) Heat Distortion",
  // and a direction the row plainly states went unrecorded (MEAS-LOCATOR-DIRECTION found it).
  const AXIS = String.raw`(X\s?[-‑–]?\s?Y|XY|Z\s?[-‑–]?\s?X|X\s?[-‑–]?\s?Z|XZ|ZX|Z)`;
  const said = `${v.label ?? ''} ${printed}`;
  // A sheet may print the plane with no bracket at all, after the property's name: Eryone heads its rows
  // "Tensile strength X-Y", "Tensile modulus X-Z", and (where the space did not survive) "Elongation at breakX-Z".
  // Only the two-letter planes are read that way, and only where the sheet joined their letters with a dash: a
  // bare Z is a letter that turns up in a designation, and a direction is never guessed from one.
  const axis = new RegExp(`[（(]\\s*${AXIS}\\s*[)）]`, 'i').exec(said)?.[1]
    ?? new RegExp(`^\\s*${AXIS}\\s*[)）]`, 'i').exec(said)?.[1]
    ?? new RegExp(String.raw`(X\s?[-‑–]\s?[YZ]|Z\s?[-‑–]\s?X)\b`, 'i').exec(said)?.[1];
  const stated = axis ? axis.replace(/[\s-‑–]/g, '').toUpperCase() : null;
  // A treatment the sheet names for one row is that row's own words, whatever the build's reader makes of them:
  // Extrudr prints a Vicat point of 65 °C and a second, "(*sintered)", above 150 °C, and a row that recorded
  // neither word was the same measurement twice with two answers.
  const annealWords = /\b(not annealed|unannealed|annealed|as printed|sintered|heat[- ]treated|tempered)\b/i.exec(says);
  const post = annealWords ? annealWords[1].replace(/^as printed$/i, 'As printed') : NP;
  const postState = readPostProcessingState(post);
  const schedule = parseAnnealSchedule(`${printed} ${v.line ?? ''}`, postState ?? 'not-stated');
  const moistureWords = /\b(dry|dried|conditioned|wet)\b/i.exec(`${withoutRate} ${v.footnote ?? ''}`);
  const moisture = moistureWords ? moistureWords[1].replace(/^./, (c) => c.toUpperCase()) : NP;
  const moistureState = readMoistureState(moisture);
  // A row whose own word and whose designation disagree about the notch is the sheet contradicting itself
  // (ISO 179/1eU is the unnotched designation). The row's own word is kept and the disagreement is written down,
  // which is what holds the row back for a person to read.
  const designation = notchOf([...v.read.standards, v.read.conditions].join(' '));
  const notchNote = v.notch && designation && v.notch !== designation
    ? `the row says ${v.notch.toLowerCase()} and the standard it names is the ${designation.toLowerCase()} designation; the sheet's own word for the row is kept`
    : null;
  // A test temperature the row states is a condition, not a result: "Izod Impact Strength, Notched @ -40°C" and
  // "@ 23°C" are two different tests of one property, and a row that does not say which is indistinguishable from
  // its twin (MEAS-CONDITIONS-INDISTINCT).
  const at = /(-?\d+(?:[.,]\d+)?)\s*(?:[°º˚]\s*C|℃)/i.exec(withoutRate.replace(new RegExp(STANDARD_RE.source, 'gi'), ' '));
  let rawNumeric = v.read.rawNumber;
  let raw = v.read.raw;
  let normalized = round(NUMBER(rawNumeric) * v.target.factor);
  // "24.000 kg/cm2" is twenty-four thousand on a European sheet and twenty-four on an American one. Where one
  // reading is a value this property could have and the other is not, the sheet has answered: a flexural modulus
  // of 24 kg/cm² is 2.4 MPa, which no solid polymer reaches, and 24,000 kg/cm² is 2,353 MPa, which is a
  // polycarbonate's. Where both readings are possible, it stays a question for a person.
  let ambiguity = v.read.ambiguous;
  if (ambiguity) {
    const other = round(NUMBER(rawNumeric) * 1000 * v.target.factor);
    const of = { ...window, condition: ['Notched', 'Unnotched'].includes(v.notch) ? v.notch : 'any' };
    const mineOk = couldBe(v.property, v.target.unit, normalized, of);
    const otherOk = couldBe(v.property, v.target.unit, other, of);
    v.ambiguityResolved = (mineOk && !otherOk) || (!mineOk && otherOk);
    if (!mineOk && otherOk) {
      const was = round(NUMBER(v.read.rawNumber) * v.target.factor);
      rawNumeric = String(NUMBER(rawNumeric) * 1000);
      normalized = other;
      // The raw cell records the number and what the sheet printed, which is the register's own convention for
      // this reading (V000731, the same product's flexural modulus).
      const printed = /^[-\d.,\s]+/.exec(v.read.raw)?.[0]?.trim() ?? v.read.rawNumber;
      raw = `${Number(rawNumeric).toLocaleString('en-CA').replace(/,/g, ' ')} ${v.read.printedUnit} (TDS prints "${printed}" with European decimal separator)`;
      ambiguity = `${ambiguity}; read as ${rawNumeric} because ${was} ${v.target.unit} is outside anything this property reaches`;
    } else if (mineOk && !otherOk) {
      ambiguity = `${ambiguity}; read as ${rawNumeric} because the other reading is outside anything this property reaches`;
    }
  }
  return {
    MaterialID: materialId, GradeID: gradeId, Property: v.property,
    'Raw value': raw, 'Raw unit': v.read.printedUnit, 'Raw numeric': rawNumeric,
    'Raw uncertainty ±': v.read.uncertainty ?? NA, 'Raw upper bound': v.read.upper ?? NA, Operator: v.read.operator, 'Conversion factor': String(v.target.factor),
    'Normalized value': String(normalized),
    'Normalized uncertainty ±': v.read.uncertainty == null ? NA : String(round(NUMBER(v.read.uncertainty) * v.target.factor)),
    'Normalized upper bound': v.read.upper == null ? NA : String(round(NUMBER(v.read.upper) * v.target.factor)),
    'Normalized unit': v.target.unit, 'Data status': 'Published value',
    // A sheet that says its bars were injection moulded is not describing a printed part (D55), and one that says
    // they were printed is. Where it says neither, nothing is assumed.
    'Specimen type': /injection mou?ld/i.test(says) ? 'Raw material value'
      : /\b3d print|printed (specimen|bar|part)/i.test(says) || v.printedSpecimens ? 'Printed specimen'
      : v.property === 'Density' ? 'Not published (density specimen form not explicitly established)' : 'Not published (do not assume printed)',
    // A row may name its own direction, and then it is the row's whatever the property usually is: Polymaker
    // prints "Tensile strength (X-Y)" and "Tensile strength (Z)" as two rows of one table.
    Direction: stated ?? v.direction ?? (/\bxy\b/i.test(says) ? 'XY' : /\bz[ -]?axis\b/i.test(says) ? 'Z' : v.orientation ? v.orientation.toUpperCase() : 'Unstated'),
    'Moisture condition': moisture, 'Moisture state': moistureState ?? 'not-stated',
    'Post-processing': post, 'Post-processing state': postState ?? 'not-stated',
    'Anneal °C': postState === 'annealed' ? (schedule?.tempC == null ? NP : String(schedule.tempC)) : NA,
    'Anneal h': postState === 'annealed' ? (schedule?.hours == null ? NP : String(schedule.hours)) : NA,
    'Test temperature': at ? `${at[1].replace(',', '.')}°C` : NP,
    'Standard / load': asciiPunctuation(standardText) || NP, Standards: standards.length ? standards.join('; ') : NP,
    'Test load MPa': v.property === 'HDT' ? loadCellFromParsed(parseHdtStandard(standardText)) : NA,
    Notch: v.notch || NA, 'Specimen / print parameters': NP,
    SourceID: sourceId, Locator: `p. ${v.page}: ${v.label}`, Notes: [v.methodNote, notchNote, ambiguity].filter(Boolean).join('; ') || NA, 'Parse review': NA,
  };
}

/**
 * A source identifier in the register's own convention. A publisher that already has sources keeps its prefix
 * rather than gaining a second one (sources.schema.json says so), and the rest of the identifier is the
 * document's own file name, which is what the existing Spectrum and Polymaker identifiers are.
 */
export function sourceIdFor(row, sources) {
  const mine = sources.filter((s) => s.Publisher === row.manufacturer || s.Publisher === row.provider);
  const maker = (row.manufacturer || row.provider || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const prefix = mine.map((s) => /^([A-Z0-9]+-[A-Z0-9]+-)/.exec(s.SourceID)?.[1]).find(Boolean) ?? `R-${maker}-`;
  const url = row.url || '';
  const plain = decodeURIComponent(url.split('?')[0].split('/').pop() ?? '')
    .replace(/\.(pdf|html?)$/i, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // A maker may serve every sheet from one script: Polymaker's older library is all index.php?...id_attachment=236,
  // so the file name names nothing. What tells those apart is the query, and failing that the digest.
  // A name that describes the server rather than the document: an index, a download endpoint, a file manager.
  const generic = /^(index|download|file|attachment|view|get|dl)(-php|-aspx?)?$/i.test(plain)
    || /\b(file-manager|download|attachment|getfile|viewfile)\b/i.test(plain) || plain.length < 4;
  const query = decodeURIComponent(url.split('?')[1] ?? '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const file = generic ? [plain, query || String(row.sha256 ?? '').slice(0, 8)].filter(Boolean).join('-').slice(0, 60) : plain;
  const name = file || (row.product_raw || '').replace(/[^A-Za-z0-9]+/g, '-');
  const id = `${prefix}${name}`.slice(0, 90);
  // A maker may publish two documents under one file name: Spectrum's PP sheet is at .../2022/05/en_tds_spectrum_pp.pdf
  // and again at .../2025/11/en_tds_spectrum_pp.pdf, and both derive the same identifier. The second one took the
  // first one's identifier, so nine of its values were recorded against a page that does not print them. A
  // document is its bytes, so where the name is taken by another document the digest tells them apart.
  const taken = sources.find((x) => x.SourceID === id);
  return taken && taken.SHA256 !== row.sha256 ? `${id}-${String(row.sha256 ?? '').slice(0, 6)}`.slice(0, 96) : id;
}

/**
 * A product's name as the sheet prints it, without the words every one of a maker's products carries. "3DXMAX®
 * ABS 3D Printing Filament" is the ABS; the tail is a category, and keeping it would make the next revision of
 * the same sheet look like a second product.
 */
/** Full-width punctuation written as the ASCII character it stands for; CJK ideographs are left alone. */
const FULLWIDTH = { '（': '(', '）': ')', '［': '[', '］': ']', '：': ':', '；': ';', '，': ',', '％': '%', '－': '-', '＋': '+', '／': '/' };
export const asciiPunctuation = (text) => String(text ?? '').replace(/[（）［］：；，％－＋／]/g, (c) => FULLWIDTH[c] ?? c);

// A maker's own name, as a scan may have rendered it. A word of six letters or more is still that word with one
// letter wrong: Fiberlogy's OCR'd sheets print "Fioerlogy" at the head of every page, and a reader that matched
// the maker exactly left the maker's name standing as thirteen products' names.
function nearWord(word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (word.length < 6) return escaped;
  const wrong = [...word].map((_, i) => `${word.slice(0, i).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.${word.slice(i + 1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  return `(?:${[escaped, ...wrong].join('|')})`;
}

/** The words that name the maker rather than the product, from whatever the ledger calls them. */
const makerWords = (maker) => String(maker ?? '').split(/[^A-Za-z0-9]+/).filter((w) => w.length >= 3);

export function productName(printed, maker = '') {
  let name = String(printed ?? '')
    .replace(/[™®©]/g, '')
    // A trademark sign the extractor rendered as letters, hard against the word it marks: "FABRIALTM-R" is
    // Fabrial R. Only after a word of four letters or more, and only where the name goes on without them.
    .replace(/(?<=[A-Za-z]{4})TM\b/g, '')
    .replace(/\s*\[[^\]]*\]\s*/g, ' ')
    .replace(/\b3d\s*(print(ing|er)?\s*)?filament\b/gi, '')
    .replace(/\b3d\s*$/i, '')
    .replace(/\bfilament\b\s*$/i, '')
    // The extractor may leave the category word hard against the name ("ABSESDFilament", "PEKK-AFilament").
    .replace(/(?<=[A-Za-z0-9])filaments?\s*$/i, '');
  // The maker's name in front of its product is the maker's, not the product's. Fiberlogy labels every sheet
  // "TRADE NAME: Fiberlogy FiberSilk", and colorFabb prints "colorFabb woodFill" on one sheet and "woodFill" on
  // the next, which filed one product under two names. It comes off either end, with whatever joined it on:
  // "colorFabb_XT" is the XT. A name that is the maker's name and nothing else reduces to nothing, and the
  // caller then looks further down the page rather than filing a product called after its maker.
  // A whole word, never the front of one: Prusament begins with Prusa, and a reader that took five letters off
  // the front of it proposed a product called "ment PETG by Prusa Polymers".
  for (const word of makerWords(maker)) {
    const near = nearWord(word);
    name = name.replace(new RegExp(`^\\s*${near}(?![A-Za-z0-9])[\\s_\\-–—:.]*`, 'i'), '')
      .replace(new RegExp(`(?<![A-Za-z0-9])[\\s_\\-–—:.]*${near}\\s*$`, 'i'), '');
  }
  return name
    // "Fishy Filaments' Porthcurno by Fillamentum" says whose product it is at the end; with the maker's name
    // off, the word that attributed it has nothing left to attribute.
    .replace(/\s+(by|von|par|da)\s*$/i, '')
    .replace(/\s*[-–—:,_]\s*$/, '')
    .replace(/^[\s_\-–—:,]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// A title line that did not survive the scan. A product's name is letters, digits and the punctuation a name
// carries; a page whose text layer is damage brings pipes and brackets that never opened, and three letters at
// the front of "San ieA3D 7) Y2— RABE LOARY—(IPE)714a xv bk" are not a name either.
const NAME_ALPHABET = /^[\p{L}\p{M}\p{N}\s\-–—_/+()\[\].,&%'’®™°#:@]+$/u;
export function looksDamaged(line) {
  const text = String(line ?? '').trim();
  if (!text) return true;
  if (!NAME_ALPHABET.test(text)) return true;
  const NAME_LENGTH = 24;
  return text.length > NAME_LENGTH && (text.match(/\(/g) ?? []).length !== (text.match(/\)/g) ?? []).length;
}

// A line that is a table's column headings, a revision marker, a section name or the name of a standards body
// is not a product's name. SUNLU heads its sheets "TECHNICAL DATA SHEET ISO", and read as a name that made
// forty-two products called ISO.
// A word about the sheet is not the name of a product either: a sheet may call itself a draft, and a section
// heading under the title is the sheet's own structure. purefil heads every sheet with its product and then the
// word "General" ("Allgemein", "Generale"), and a reader that took the line under the title called thirty-eight
// products General.
const NOT_A_PRODUCT = /propert|standard\s+unit|typical value|^rev(ision)?\b|^version\b|^page\b|data ?sheet$|^(iso|astm|din|iec|en|ul|gb\s?\/?\s?t)$/i;
// A version, a date, a trademark sign left on a line of its own or half of the words that announce the sheet
// is not a name either. Polymaker sets "TECHNICAL" and "DATA SHEET" on two lines with "V6.0" under them.
const NOT_A_PRODUCT_EITHER = /^(draft|preliminary|provisional|confidential|general|generale|allgemein|description|beschreibung|descrizione)(\s+(information(en)?|informazioni))?$|^(general information|allgemeine informationen|informazioni generali)$|^v?\d+(?:[.,]\d+)*$|^version\s*\d|^(tm|r|technical|technisch|data)$|^\(?(tds|pds|sds|msds|tdb)\)?$|^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$|^technical specifications?$|^\d{1,2}[.)]\s|@|^\+?\d[\d\s()\/-]{6,}$|\bcall us\b|^(back|home|menu|cart|search|store|shop|boutique|login|account|contact|next|previous|skip to content)$/i;
// A sheet that labels its product says so plainly, and that beats any guess from where a line sits. The label
// may stand after the same label in the maker's own language ("产品名称 Product Name:PLA+丝绸 2.0"), and a
// maker may call it the trade name: Fiberlogy prints "TRADE NAME: Fiberlogy FiberSilk" on all forty of its
// sheets, which is the name, while the line above it is the maker's own heading in capitals.
const PRODUCT_LABEL = /(?:product\s*name|trade\s*name|produkt(?:name)?|handelsname|产品名称|nom\s+du\s+produit|nome\s+commerciale)\s*[:：]\s*(.+)$/i;

/**
 * The name a sheet gives in two languages at once. "PLA+丝绸 2.0 (PLA+ Silk 2.0)" names one product twice, and
 * the database keeps product names in the script its other names are in; where the bracket holds the Latin
 * reading of what precedes it, that is the name. A bracket that opened on another line leaves its close behind.
 */
const latinName = (printed) => {
  const text = String(printed ?? '').trim();
  const bracket = /\(([^()]*[A-Za-z][^()]*)\)\s*$/.exec(text);
  if (bracket && /[^\u0000-\u024F]/.test(text.slice(0, bracket.index))) return bracket[1].trim();
  return text.replace(/^\s*\)|\(\s*$/g, '').replace(/\)\s*$/, (m, at) => (text.slice(0, at).includes('(') ? m : '')).trim();
};

// What a sheet calls itself when it announces what it is. A maker may qualify the words ("Preliminary Data
// Sheet", "Technical datasheet DRAFT"); the qualifier is about the sheet, not about the product.
const ANNOUNCES = /(?:preliminary|provisional|draft)?\s*(?:tech(?:nical)? |product )?data\s?sheet|technisches datenblatt|datenblatt/i;

/**
 * The document's own title, as its head prints it, and the product name under it (D63).
 *
 * The maker is passed in because its own name is not its product's: a line that is the maker's name and nothing
 * else names no product, and the page goes on to say what the product is on the line after it.
 */
export function printedTitle(text, maker = '') {
  const lines = (text.pages[0]?.lines ?? []).map((l) => l.text.trim()).filter(Boolean);
  // How long a name is, is measured on the name: 3DXTECH announces "Technical Data Sheet: CarbonX™ Carbon Fiber
  // ezPC Polycarbonate 3D Printing Filament", which is eighty-three characters of which the name is thirty-nine.
  const NAME_LENGTH = 60;
  const named = (line) => {
    if (NOT_A_PRODUCT.test(line) || NOT_A_PRODUCT_EITHER.test(line) || looksDamaged(line)) return false;
    const name = productName(line, maker);
    return Boolean(name) && name.length < NAME_LENGTH;
  };
  const labelled = lines.slice(0, 14).map((l) => PRODUCT_LABEL.exec(l)?.[1]).map((v) => (v ? latinName(v) : v)).find((v) => v && named(v));
  const head = lines.slice(0, 6);
  const at = head.findIndex((l) => ANNOUNCES.test(l));
  // A sheet that announces nothing prints its product first: purefil heads its sheets "Polyethylenterephthalat
  // Typ G (PETG)" and then "Allgemein". Taking the second line instead made General the name of a product.
  if (at < 0) {
    // The line under the title is still where most makers put the name, and the title above it is where purefil
    // puts it; a sheet that announces itself in a language this reader does not read ("KARTA TECHNICZNA",
    // "SCHEDA TECNICA") announces itself on that first line, so it is tried second and not first.
    const order = [head[1], head[0], ...head.slice(2)].filter(Boolean);
    return { title: head[0] ?? '', product: labelled || order.find(named) || '' };
  }
  // The name may be on the same line as the words that announce it ("Technical Data Sheet: AmideX PA6-GF30"),
  // or on the line below ("TECHNICAL DATA SHEET" / "PET-G Premium"). Both makers are in this corpus.
  const sameLine = head[at].replace(new RegExp(`^.*?(?:${ANNOUNCES.source})\\s*[:\\-–—]?\\s*`, 'i'), '').trim();
  const below = head.slice(at + 1).find(named) ?? '';
  // "Nov. 2018 Technical Data Sheet Version 4.0" carries a version where another maker carries the name.
  const product = labelled || (sameLine && named(sameLine) ? sameLine : '') || below;
  return { title: [head[at], product === sameLine ? '' : product].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(), product };
}

/**
 * A material the database does not hold yet: a polymer, a filler and a variant class it has no row for. The
 * identity is computed; the prose a reader is shown is not invented here. What the sheet says about the product
 * goes into Identity notes with the page it was read from, and Best uses and Limitations stay unpublished until
 * somebody writes them from a source (D70). A new material never enters without a ruling (apply.mjs).
 */
export function newMaterialFor(identity, world, { sourceId, page = 1 }) {
  if (!identity.polymer || !identity.modifier || identity.needsRuling) return null;
  const materials = world.materials ?? [];
  const abbreviation = MODIFIERS.find((m) => m.Value === identity.modifier)?.Abbreviation ?? '';
  const name = abbreviation ? `${identity.polymer}-${abbreviation}` : identity.polymer;
  // The family, the scope and the polymer's own full name are the ones its siblings already carry: a new filler
  // does not make a new family, and reading them from a sibling keeps one polymer's rows saying one thing.
  const siblings = materials.filter((m) => m['Estimate identity'] === identity.polymer && m.Scope !== 'Family entry');
  const plain = siblings.find((m) => m['Modifier / filler'] === 'Unfilled / unspecified') ?? siblings[0];
  // A polymer no material stands for yet takes what the lexicon knows: its family, and no estimate identity,
  // because the model identifies a material by a row of polymers.csv and there is none. Its own published values
  // are all it will show until somebody writes that row from a reference (the six high-temperature materials are
  // the precedent, and they have stood like this since the database was built).
  if (!plain) {
    if (!identity.family) return null;
    // A polymer the database knows can be estimated even where no material stands for it yet: the model needs a
    // row of polymers.csv, not a sibling.
    const known = (world.polymers ?? []).some((p) => p.PolymerID === identity.polymer);
    const excluded = /High-Temperature/i.test(identity.family);
    return {
      'Original name': name,
      Family: identity.family,
      'H2C status': excluded ? 'Excluded' : 'Theoretical',
      'Representative grade': '${grade:main}',
      'Best uses': NP,
      Limitations: NP,
      'Full name': name,
      Scope: excluded ? 'Excluded' : 'H2C-relevant',
      Abbreviation: name,
      'Base polymer': identity.polymer,
      'Estimate identity': known ? identity.polymer : NA,
      'Modifier / filler': identity.modifier,
      'Variant class': identity.variantClass || NA,
      Role: 'Structural / functional / appearance',
      'Identity notes': `Identity read from ${sourceId} (p. ${page}): ${identity.signals.join('; ')}.${known ? '' : ' No row in polymers.csv, so the estimate model does not identify it and it shows only what its sheets publish.'}`,
    };
  }
  return {
    'Original name': name,
    Family: plain.Family,
    'H2C status': 'Theoretical',
    'Representative grade': '${grade:main}',
    'Best uses': NP,
    Limitations: NP,
    'Full name': `${plain['Full name']} (${identity.modifier})`,
    Scope: plain.Scope,
    Abbreviation: name,
    'Base polymer': identity.polymer,
    'Estimate identity': identity.polymer,
    'Modifier / filler': identity.modifier,
    'Variant class': identity.variantClass || NA,
    Role: plain.Role,
    // What the sheet says about the product is the grade's Composition / filler, read from the page. This column
    // says how the identity was settled, which is the reader's own account and not the sheet's words.
    'Identity notes': `Identity read from ${sourceId} (p. ${page}): ${identity.signals.join('; ')}.`,
  };
}

/**
 * The headline selections a material that the database does not hold yet needs. A material with no selection and
 * no estimate identity shows nothing at all (HEADLINE-BLANK), and a material that publishes its own value should
 * show it rather than an estimate. One `value` row per key, from the material's own measurements: the property
 * the key names, in the unit it is kept in, in its direction, on a printed or unstated specimen, not conditioned,
 * not annealed, and a point rather than a bound.
 */
export function headlinesFor(measurements, definitions) {
  const chosen = [];
  for (const key of definitions.filter((d) => d.Kind === 'measurement')) {
    const properties = String(key['Value properties'] ?? '').split(';').map((x) => x.trim()).filter(Boolean);
    const wanted = (m) => properties.includes(m.row.Property)
      && m.row['Normalized unit'] === key.Unit
      && m.row.Operator === '='
      && m.row['Data status'] === 'Published value'
      && ['printed', 'not-stated'].includes(specimenForm(m.row['Specimen type']))
      && m.row['Moisture state'] !== 'conditioned'
      && m.row['Post-processing state'] !== 'annealed'
      && (key.Direction === 'Not applicable' || m.row.Direction === key.Direction)
      // A heat deflection headline is the 0.45 MPa one; the 1.8 MPa value is a different test and bounds it.
      && (key.HeadlineKey !== 'hdt045' || ['0.45', 'Not published'].includes(m.row['Test load MPa']));
    // The property the key names first wins, so a stated endpoint is preferred to an unspecified one.
    const found = properties.map((property) => measurements.find((m) => m.row.Property === property && wanted(m))).find(Boolean);
    if (found) chosen.push({ HeadlineKey: key.HeadlineKey, measurement: found.id, Use: 'value', review: { status: 'proposed' } });
  }
  return chosen;
}

/** A document as a proposal: the source, its grade, its values, and everything left out with the reason. */
export function propose(row, text, world) {
  // The sheet says what the name often does not: which polymer, and what is in it. The first page's words are
  // enough, and they are the maker's own description rather than a catalogue title.
  const body = (text.pages[0]?.lines ?? []).map((l) => l.text).join(' ').slice(0, 2000);
  // Whose sheet it is, in the ledger's own words: the manufacturer where the ledger knows one, and the provider
  // where a retailer is all it has. The maker's own name is not its product's, here or in the title.
  const maker = row.manufacturer || row.provider || '';
  const head = printedTitle(text, maker);
  // The name the sheet prints is the product's own; the catalogue name a link carries is a copy of it, and the
  // two disagree ("paht" for a sheet whose own title says CarbonX Carbon Fiber High Temp Nylon). Two revisions of
  // one sheet must classify alike, so the sheet's own name is what is read, and the catalogue's is kept beside it.
  const named = productName(head.product && !NOT_A_PRODUCT.test(head.product) ? head.product : row.product_raw, maker);
  const identity = classifyProduct(named || row.product_raw, { manufacturer: row.manufacturer, title: [head.title, row.product_raw].filter(Boolean).join(' '), body }, world);
  // What the page says about its own name, where what it says is not a product's name. Neither is decided here:
  // a name is the reader's to read and a ruling is the owner's to make, so each says what the page shows.
  //
  // A sheet whose subject is a polymer, a resin, a compound or a grade is describing what the filament is made
  // from: colorFabb redistributes Eastman's "Amphora™ 3D Polymer HT5300" and FKuR's "Fibrolon V 135002 (trial
  // grade)", and neither is colorFabb's own product. Whether such a name may stand for the product is a ruling.
  // The word has to designate the stock, not name the polymer: purefil heads a sheet "Liquid Crystal Polymer
  // (LCP)", which is what the polymer is called, while Eastman calls its grade a 3D Polymer and FKuR calls
  // its a trial grade.
  const NAMES_THE_STOCK = /\b(3d polymer|resins?|compounds?|granulate|pellets?|masterbatch|trial grade|base grade)\b/i;
  // "Prusament PETG by Prusa Polymers" says who made it, not what it is made of; the attribution is not the
  // subject's own designation and is taken off before the question is asked.
  if (named && NAMES_THE_STOCK.test(named.replace(/\s+(by|von|par|da)\s+.*$/i, ''))) {
    identity.reasons.push(`the sheet's own title is "${named}", which names the polymer the filament is made from rather than ${maker || 'the maker'}'s product; the product's own name is not printed on the sheet`);
    identity.needsRuling = true;
  }
  // And a sheet that prints no name this reader can make out says that, rather than offering three letters of a
  // title line that did not survive the scan.
  // Where the ledger carries the catalogue's name, that name still stands and there is nothing to report.
  if (!named && !row.product_raw) {
    const title = (text.pages[0]?.lines ?? [])[0]?.text?.trim() ?? '';
    identity.reasons.push(title && looksDamaged(title)
      ? `no product name could be read: the head of the page is "${title.slice(0, 60)}", which did not survive the scan`
      : 'no product name could be read: the sheet prints none this reader recognises, and the ledger carries none either');
    identity.needsRuling = true;
  }
  const registry = new Map((world.properties ?? []).map((p) => [p.Property, p]));
  // How this polymer solidifies and whether it is reinforced: the two things the build's own physics windows are
  // keyed on, so a reading judged here is judged the way the build will judge it.
  const morphology = (world.polymers ?? []).find((p) => p.PolymerID === identity.polymer)?.Morphology;
  const window = {
    matrix: morphology ?? 'high-temp',
    fill: ['Carbon fibre', 'Glass fibre', 'Aramid fibre'].includes(identity.modifier) ? 'fibre'
      : identity.modifier === 'Unfilled / unspecified' ? 'unfilled' : 'any',
  };
  const sheet = readSheet(text, registry);
  const sourceId = row.registered_source_id || sourceIdFor(row, world.sources ?? []);
  const { title, product } = head;
  const measurements = sheet.values.map((v, i) => ({
    id: `m${String(i + 1).padStart(2, '0')}`, gradeKey: 'main',
    row: measurementRow(v, { sourceId, materialId: identity.materialId ?? '', gradeId: '', window }),
    evidence: { page: v.page, text: v.line.slice(0, 200) },
    ...(v.read.ambiguous && !v.ambiguityResolved ? { ambiguous: v.read.ambiguous } : {}),
    confidence: identity.confidence,
    review: { status: 'proposed' },
  }));
  // The grade's prose follows the register's own conventions, which are the same sentence on every row of a maker
  // and are therefore a rule rather than something a person writes per product (D70). What the sheet itself says
  // about the product is read from the sheet; what it does not say is the explicit missing state.
  const grade = {
    key: 'main', review: { status: 'proposed' },
    row: {
      MaterialID: identity.materialId ?? '', Role: 'procurement', Status: 'active',
      Manufacturer: row.manufacturer || row.provider,
      // The name the sheet prints, unless what it prints there is not a name at all.
      'Product name': named || productName(product, maker),
      'Shared formulation key': sourceId, 'Composition / filler': composition(text) ?? NP,
      Variant: NA, 'Colour caveat': 'Properties may vary by colour; use TDS scope',
      Availability: NP, 'Certification claims': certification(text) ?? NP,
      'Selected-grade rationale': 'Documented commercial formulation; traceable manufacturer evidence',
      SourceID: sourceId, 'Source locator': 'TDS / official product page',
      'Diameter compatibility': 'Check 1.75 mm variant; diameter is not part tolerance',
    },
    evidence: { page: 1, text: title },
  };

  // What the sheet's own density says about what is in the product. A grade whose density sits outside the neat
  // polymer's range is carrying something its name does not declare, which is how Spectrum's PA6 Neat was found to
  // hold an undisclosed dense filler (m26). The classifier reads words; this reads the number beside them.
  // A sentence the sheet uses to say what the product is, kept for a material the database has to create.
  let newMaterial = identity.materialId ? null : newMaterialFor(identity, world, { sourceId, page: 1 });
  // A new material that duplicates one is the failure D44 was written about. Two ways it can: by the identity it
  // stands for, and by the name it would carry. A particle-filled PLA finds neither a material it may file under
  // (the six finish materials are Bambu's own products) nor a name of its own, so it is a question, not a row.
  if (newMaterial) {
    const twin = collidesWith(identity, world.materials ?? []);
    const sameName = (world.materials ?? []).find((m) => m['Original name'] === newMaterial['Original name']);
    if (twin || sameName) {
      const other = twin ?? sameName;
      identity.reasons.push(`a new material for this identity would be a second ${other['Original name']} (${other.MaterialID}): ${identity.polymer} / ${identity.modifier}${identity.variantClass ? ` / ${identity.variantClass}` : ''}`);
      identity.needsRuling = true;
      newMaterial = null;
    }
  }
  const profiles = profilesFor(sheet.settings, { sourceId, materialId: identity.materialId ?? '', modifier: identity.modifier });

  const polymer = (world.polymers ?? []).find((p) => p.PolymerID === identity.polymer);
  const density = measurements.find((m) => m.row.Property === 'Density');
  const neat = [Number(polymer?.['Neat density min kg/m³']), Number(polymer?.['Neat density max kg/m³'])];
  if (density && identity.modifier === 'Unfilled / unspecified' && !identity.variantClass && Number.isFinite(neat[0]) && Number.isFinite(neat[1])) {
    const value = Number(density.row['Normalized value']);
    if (value > neat[1] * 1.05) identity.reasons.push(`its density of ${value} kg/m³ is above what neat ${identity.polymer} reaches (${neat[1]}), so the product carries a filler its name does not declare`);
    if (value < neat[0] * 0.95) identity.reasons.push(`its density of ${value} kg/m³ is below what neat ${identity.polymer} reaches (${neat[0]}), so the product is foamed or carries a lightweight additive`);
    identity.needsRuling = identity.needsRuling || identity.reasons.length > 0;
  }

  return {
    version: 1,
    generated: { tool: 'propose.mjs', date: new Date().toISOString().slice(0, 10) },
    document: { sha256: row.sha256, url: row.url, pages: text.pages.length, provider: row.provider, manufacturer: row.manufacturer, docKey: row.doc_key },
    identity,
    ...(newMaterial ? { newMaterial } : {}),
    source: {
      row: {
        SourceID: sourceId, Publisher: row.manufacturer || row.provider, Title: title || row.product_raw,
        Revision: NP, 'Publication date': NP, 'Access date': row.updated || new Date().toISOString().slice(0, 10),
        'Source class': 'Manufacturer TDS', 'Source note': NA, 'Citation role': 'cited', URL: row.url,
        Locator: 'Document / product page', 'Applicable grades': '${grade:main}',
        'Access state': 'retrieved', 'Access note': NA, SHA256: row.sha256,
      },
      evidence: { page: 1, text: title },
      review: { status: 'proposed' },
    },
    grades: [grade], measurements, profiles, evidence: [],
    // A material the database already holds keeps the headlines it has; the pipeline never moves one.
    headlines: newMaterial ? headlinesFor(measurements, world.headlineDefinitions ?? []) : [],
    coverage: [],
    settings: sheet.settings, skipped: sheet.skipped,
    review: { status: 'proposed' },
  };
}

/**
 * Parity: read a sheet the database already holds and compare. A maker's layout is proved on the sheets somebody
 * transcribed by hand before any sheet of theirs that nobody has.
 */
export function compare(proposal, recorded) {
  const key = (r) => `${r.Property}|${String(r['Normalized value'])}|${r['Normalized unit']}`;
  const mine = new Map(proposal.measurements.map((m) => [key(m.row), m.row]));
  const theirs = new Map(recorded.map((r) => [key(r), r]));
  const found = [...theirs.keys()].filter((k) => mine.has(k));
  return {
    recorded: theirs.size, proposed: mine.size, found: found.length,
    missed: [...theirs.entries()].filter(([k]) => !mine.has(k)).map(([, r]) => `${r.Property} ${r['Normalized value']} ${r['Normalized unit']} (${r.Locator})`),
    extra: [...mine.entries()].filter(([k]) => !theirs.has(k)).map(([, r]) => `${r.Property} ${r['Normalized value']} ${r['Normalized unit']} (${r.Locator})`),
  };
}

if (process.argv[1]?.endsWith('propose.mjs')) {
  const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : null; };
  const provider = arg('provider'), batch = arg('batch'), doc = arg('doc');
  const world = { materials: table('materials'), polymers: table('polymers'), grades: table('grades'), properties: table('properties'), sources: table('sources'), headlineDefinitions: table('headline_definitions'), rulings: readCsv(join(AUDIT, 'rulings/rulings.csv')).records.map((r) => r.values) };
  // A batch is the documents that are a sheet in their own right: not a copy of one already read, not one the
  // register already holds, and not one still waiting on a question about whether it is a copy at all.
  const SKIP = new Set(['duplicate-of', 'twin-check', 'registered', 'applied', 'unreachable', 'needs-ocr', 'gated', 'safety-data-sheet', 'not-a-data-sheet', 'skipped', 'rejected']);
  const rows = readCsv(join(AUDIT, 'ledger.csv')).records.map((r) => r.values)
    .filter((r) => (doc ? r.doc_key === doc : true) && (provider ? r.provider === provider || r.manufacturer === provider : true))
    .filter((r) => r.sha256 && cachedText(r.sha256))
    // --compare reads the sheets the database already holds, which is exactly what a batch run leaves out.
    .filter((r) => doc || (process.argv.includes('--compare') ? r.registered_source_id : !SKIP.has(r.status) && !r.registered_source_id));
  if (!rows.length) { console.error('nothing read to propose from'); process.exit(2); }

  if (process.argv.includes('--compare')) {
    const measurements = table('measurements');
    const scored = rows.filter((r) => r.registered_source_id);
    let recorded = 0, found = 0;
    for (const r of scored) {
      const p = propose(r, cachedText(r.sha256), world);
      const mine = measurements.filter((m) => m.SourceID === r.registered_source_id && /^Published value/.test(m['Data status']));
      const c = compare(p, mine);
      recorded += c.recorded; found += c.found;
      console.log(`${String(c.found).padStart(3)} of ${String(c.recorded).padStart(3)}  ${r.registered_source_id}${c.missed.length ? `\n      missed: ${c.missed.slice(0, 6).join('; ')}` : ''}`);
    }
    console.log(`\nparity ${recorded ? ((found / recorded) * 100).toFixed(0) : 0}%: ${found} of ${recorded} recorded values on ${scored.length} sheet(s)`);
    process.exit(0);
  }

  const dir = join(AUDIT, 'proposals', batch ?? 'unsorted');
  mkdirSync(dir, { recursive: true });
  let values = 0;
  const made = rows.map((r) => ({ row: r, proposal: propose(r, cachedText(r.sha256), world) }));
  // A maker who serves every sheet from one endpoint gives every sheet the same identifier. The name is left
  // alone where it is already the document's own, and where two documents ask for one identifier each takes its
  // own digest: a document is its bytes, and the second run of a batch writes the same identifiers again.
  const byId = new Map();
  for (const m of made) {
    const id = m.proposal.source?.row?.SourceID;
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(m);
  }
  for (const [id, sharing] of byId) {
    if (sharing.length < 2) continue;
    for (const m of sharing) {
      const digest = String(m.row.sha256 ?? '').slice(0, 6);
      m.proposal.source.row.SourceID = `${id}-${digest}`.slice(0, 96);
      for (const key of ['grades', 'measurements', 'profiles', 'evidence']) {
        for (const r of m.proposal[key] ?? []) {
          if (r.row?.SourceID === id) r.row.SourceID = m.proposal.source.row.SourceID;
          // The formulation key is the sheet's identifier too: left behind, one key stood on eleven materials.
          if (r.row?.['Shared formulation key'] === id) r.row['Shared formulation key'] = m.proposal.source.row.SourceID;
        }
      }
    }
  }
  for (const { row: r, proposal: p } of made) {
    // A document the research had no identifier for is keyed by its URL, which is not a file name. Its digest is.
    const name = /^[A-Za-z0-9._-]{1,64}$/.test(r.doc_key ?? '') ? r.doc_key : String(r.sha256 ?? '').slice(0, 16);
    writeFileSync(join(dir, `${name}.json`), `${JSON.stringify(p, null, 2)}\n`);
    values += p.measurements.length;
  }
  console.log(`${rows.length} proposal(s), ${values} candidate value(s) -> ${dir.replace(projectRoot + '/', '')}`);
}
