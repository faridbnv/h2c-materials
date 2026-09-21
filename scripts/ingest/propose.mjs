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
import { readCsv, csvText } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';
import { cachedText, columnPositions, cellsAt, joinDigits, lineCells, spanText } from '../lib/pdf-text.mjs';
import { parseTemperature, parseEnclosure, parseDrying, parseAbrasion } from '../../build/src/normalize/process.js';
import { readStandards } from '../../build/src/normalize/standards.js';
import { readPostProcessingState, parseAnnealSchedule, specimenForm } from '../../build/src/normalize/specimen.js';
import { readMoistureState } from '../../build/src/normalize/moisture.js';
import { parseHdtStandard } from '../../build/src/normalize/thermal.js';
import { profileCellsFromParsed, loadCellFromParsed } from '../../build/src/typed-values.js';
import { normalizedRawValue, rawNumber } from '../../build/src/measurement-rules.js';
import { classifyProduct, collidesWith, plainMaterialFor } from './classify.mjs';

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

// A density no filament reaches, above which a number says the page was misread rather than that the filament is
// heavy. Tungsten-filled PLA, the densest thing in this corpus, is about 4000 kg/m³.
export const IMPLAUSIBLE_DENSITY = 8000;

// A sheet declaring what it is loaded with, in the words the sheets use. It is the sentence that matters and not
// the substance: a substance list would be a vocabulary, and a load the vocabulary already knows never reaches
// here (its modifier is read from the name or the composition row before the density is weighed at all).
// FormFutura writes "a metal‐filled PLA‐based filament with approximately 70% of gravimetric brass filling", Prusament
// names the load and its share in the product's own name ("PETG Tungsten 75%"), and Spectrum's PLA Metal is
// "enriched with copper": each declares the load as plainly as "loaded with copper particles" does.
const METAL = '(?:metal|copper|bronze|brass|steel|iron|tungsten|magnetite)';
export const A_DECLARED_LOAD = new RegExp(String.raw`\b(?:(?:high(?:ly)?[- ])?(?:loaded|filled|reinforced|enriched)\s+with\s+[^.,;]{3,60}|(?:contains|containing)\s+\d{1,2}\s*(?:%|wt%|weight\s*%)[^.,;]{0,40}|\d{1,2}\s*%\s*(?:by\s+weight\s+)?(?:of\s+)?(?:gravimetric\s+|volumetric\s+)?(?:${METAL.slice(3, -1)}|stone|marble|ceramic|wood)\b[^.,;]{0,30}|${METAL}[\s\u2010\u2011-]+filled\b[^.,;]{0,40}|${METAL}\s+\d{1,2}\s*%)`, 'i');

/** The window the build itself would judge this reading by: the most specific one that matches it. */
export function windowFor(property, unit, { matrix = 'any', fill = 'any', condition = 'any' } = {}) {
  const fits = (w, field, want) => w[field] === want || w[field] === 'any';
  const matching = WINDOWS.filter((w) => w.Property === property && w['Normalized unit'] === unit
    && fits(w, 'Matrix class', matrix) && fits(w, 'Fill class', fill) && fits(w, 'Condition', condition));
  const score = (w) => ['Matrix class', 'Fill class', 'Condition'].reduce((a, f) => a + (w[f] === 'any' ? 0 : 1), 0);
  return matching.sort((a, b) => score(b) - score(a))[0] ?? null;
}

export function couldBe(property, unit, value, of = {}) {
  if (!Number.isFinite(value)) return true;
  const window = windowFor(property, unit, of);
  if (!window) return true;
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
// A number may be written without its leading zero: a maker prints ".13 %" for a water absorption, and read as
// 13 it is that figure a hundred times over.
// A power of ten is one number, and the reader writes the raised part with a caret when it joins it to its ten.
// It comes first, so "10^12" is read whole rather than as the 10 in front of it.
const NUMBER_PATTERN = '(?:(?:\\d+(?:[.,]\\d+)?\\s*[×x*·]\\s*)?10\\s*\\^\\s*[-+]?\\d+)|(?:(?<!\\d\\s{0,3})-)?(?:\\d+(?:[.,]\\d+)?|[.,]\\d+)';
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
// A condition between the unit and the value is a number with its own unit: "kJ/m2 2.75J 2.83". Yousu sets it
// apart and ends it with a comma, "g/10min 210℃, 2.16Kg 7" and "g/cm 23 ℃ 1.20", and read without that every one
// of its melt-flow rates was the test temperature (210, 190, 230 g/10 min) and three densities 23 g/cm³. Set
// apart, the unit must be one a test condition is stated in, or "% 6 at 23 °C" would make "6 at" a condition.
const CONDITION_UNIT = `\\d+(?:[.,]\\d+)?(?:[A-Za-zµ°℃%][\\w/°²³]*|\\s(?:℃|°\\s?[CF]|[Kk]g|N|J|mm\\/min)(?=[\\s,]))(?:\\s?,)?`;
const unitFirstRe = () => new RegExp(
  `(?:^|\\s)(?<unit>${UNIT_PATTERN})(?<lead>\\s+(?:${CONDITION_UNIT}(?:\\s+|(?<=,)))*(?:[${BOUNDS}]\\s*)?)(?<value>${NUMBER_PATTERN})(?![\\d.,])`
  + `(?:\\s*(?:±|\\+\\/-)\\s*(?<spread>\\d+(?:[.,]\\d+)?)|\\s*[-–~]\\s*(?<upper>\\d+(?:[.,]\\d+)?))?`, 'gi');

/**
 * A line that is nothing but standard designations, and the designations it holds. This is a merged Testing
 * Method cell: the makers who draw one across a property's two direction rows leave its text on a line of its
 * own between them. A line that says anything else — a label, a value, a condition — is a row, not a cell.
 */
export function standardsOnly(text) {
  const line = String(text ?? '').trim();
  if (!line) return null;
  const named = line.match(new RegExp(STANDARD_RE.source, 'gi')) ?? [];
  if (!named.length) return null;
  const rest = line.replace(new RegExp(STANDARD_RE.source, 'gi'), ' ').replace(/[\s,;/&+·]|\band\b/gi, '');
  return rest ? null : named.map((m) => m.replace(/\s+/g, ' ').trim()).join(', ');
}

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
// How far from the rows it heads a block heading may stand: a heading is in the table's column, and a fragment
// of another column is not a heading however it reads.
const BLOCK_COLUMN = 24;
// How many ordinary words a setting's value may be before it is a sentence: "Closed chamber not necessary" is
// four, and a maker's advice about its nozzle is longer than that.
const SETTING_WORDS = 6;
const SETTING_LENGTH = 40;
// A verb saying what the sheet advises: what a name never has, and what a setting's value never has either.
const SAYS_SOMETHING = /\b(is|are|was|were|has|have|can|will|may|should|offers?|provides?|combines?|delivers?|makes?|gives?|ist|sind|est|sont)\b/i;
// How long a heading that names a specimen may be: "TYPICAL MATERIAL PROPERTIES - Injection molded" is 46.
const SPECIMEN_HEADING = 60;
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
const STANDARD_RE = /\b(?:ISO|ASTM\s?D?[-\u2010\u2011]?|GB\/T|DIN|IEC|UL|EN|[DE](?=\s?[-\u2010\u2011]?\s?\d{3,4}))\s?[-\u2010\u2011]?\s?\d+[\w./\u2010\u2011-]*(?:\s?,\s?(?:-\d+[\w.-]*|[A-Za-z]\d{1,2}\b|method\s+[A-Za-z]\b))*(?:\s?\/\s?[\w.-]+)?(?:\s[A-Z]\d{1,3}\b)?(?::\s?\d{4})?/gi;

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
// A fragment a slash follows is not a split digit: "ISO 527 1/2" names parts 1 and 2 of ISO 527, and joined it
// became ISO 5271, which is not a standard and which the schema gate refused a whole batch over.
// A digit a closing bracket follows is a footnote marker, not part of the designation. Ensinger prints
// "Moisture absorption 0,6 % DIN EN ISO 62 1) (1) (*2)", where the 1) refers to the note under the table;
// joined, it made ISO 621, which is not a standard and which the schema gate refused the batch over.
const joinStandardDigits = (line) => line.replace(
  /\b((?:ISO|ASTM\s?D?|DIN|IEC|UL|EN|GB\s?\/\s?T|[DE])\s?\d{1,4})((?:\s\d(?![\d.,)]))+)(?![\s]*[°%\w/])/g,
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
  // A text layer may set ISO with a zero ("IS0 1183 1.19g/cm³", QIDI), and a designation the reader does not see
  // as one gives up its number as the value: a density of 1,183 g/cm³.
  const line = joinStandardDigits(String(text ?? '').replace(/\b(cm|m|mm)\s+([23])\b/g, '$1$2').replace(/\bIS0(?=\s?\d)/g, 'ISO'))
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
// The exponent's sign may be left out where it is positive ("10E13", "1E1"), so it is optional here too; the
// digit in front of the E is what makes it a number and not the tail of a designation.
// A superscript exponent is an exponent: a sheet that prints ">10\u00b9\u00b2 \u03a9" states a resistivity of a million
// million ohms, and a reader that sees only the ten records ten, which is a conductor where the sheet says an
// insulator. `rawNumber` has read the superscript form since the build was written; the reader must see it too,
// or it never offers it the whole number.
const SUPERSCRIPTS = '\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079\u207a\u207b';
const POWER_RE = new RegExp(`\\d+(?:[.,]\\d+)?\\s*[\u00d7x*\u00b7]\\s*10\\s*\\^\\s*[-+]?\\d+`
  + `|(?<![\\d.,])10\\s*\\^\\s*[-+]?\\d+`
  + `|(?<![\\d.,])10\\s*[${SUPERSCRIPTS}]+`
  + `|\\d+(?:[.,]\\d+)?\\s*[Ee]\\s*[-+]?\\d{1,3}(?![\\d.,])`, 'g');

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
// A page may set the superscripts of several units on one raised baseline: BASF prints "1176 kg/m³ / 73.4 lb/ft³"
// and the two threes arrive as a line of their own, "3 3", one standing against each unit. Read as a line it is
// neither a value nor a unit, so it stayed where it fell and both units lost their power — a density in kg/m is
// in no unit this database keeps, and the row went unread with it. A run of them is only ever read as pieces
// where every one of them stands against the end of a piece of the row it would join (pageRows below): that is
// what a superscript does and what a column of values never does.
const isRaisedRun = (line) => { const cells = lineCells(line); return cells.length > 1 && cells.length <= 3 && cells.every((c) => /^\d{1,2}$/.test(c.text.trim())); };

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
// A bound stands in front of a power of ten as readily as a space does: Polymaker's Fiberon ESD sheets print
// "Surface Resistivity (Ω) ANSI ESD S11.11 OL, >10¹² Ω", and a ten the reader would not take as a host left its
// raised 12 to be read as digits, making a surface resistivity of 1012 Ω out of one above a million million.
const POWER_HOST = new RegExp(`(?:^|[\\s(${BOUNDS}])(?:\\d+(?:[.,]\\d+)?\\s*[×x*·]\\s*)?10\\s*$`);

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
 * The page beside the table.
 *
 * A maker may set a column of prose next to its property table — a description, a paragraph of marketing — and
 * the extractor groups spans by baseline, so the two arrive as one line. Fillamentum's hardness row reads
 * "example for parts of ski boots. Hardness 42 Shore D ASTM D2240" and its tensile row "Polyamide content
 * ensures very high 9 MPa ASTM D638 at 50% elongation": a reader that looks for a property at the start of a
 * line finds a sentence on both, and the sheet's own hardness and tensile strength go unread.
 *
 * The gutter between the two blocks is the page's own answer, and it is measured rather than guessed: a band of
 * the page that no piece of text anywhere on it crosses, with ink on both sides of it on enough lines to be a
 * column rather than a coincidence.
 *
 * Only prose is taken off, and only where the page leaves no doubt. One side must read as a sentence — several
 * ordinary words together, naming no property this database keeps and stating no number — and the other must
 * state something a table states. Where both sides state something the gutter runs between two columns of one
 * table, and the line is left exactly as it was: on every sheet that prints a label column beside a value
 * column, the label and its value sit either side of such a gutter.
 */
const GUTTER_LINES = 3;
const GUTTER_CROSSING = 0.2;
const PROSE_WORDS = 4;
const isProse = (text) => {
  const t = repair(String(text ?? '')).trim();
  if (!t || labelFor(t) || /\d/.test(t)) return false;
  return (withoutMethodsAndUnits(t).match(/[A-Za-z]{2,}/g) ?? []).length >= PROSE_WORDS;
};
export function pageGutters(lines) {
  const all = lines.map(inked).filter((s) => s.length);
  if (all.length < GUTTER_LINES) return [];
  const from = Math.min(...all.flat().map((s) => s.x)), to = Math.max(...all.flat().map(spanRight));
  // A page always has lines that run its whole width — a header, a footer, the paragraph of small print every
  // maker ends with — so a gutter is not a band nothing crosses. It is a band few of the page's lines cross
  // while enough of them have text on both sides of it to be two blocks rather than a coincidence.
  const counts = [];
  for (let x = Math.ceil(from); x <= to; x++) {
    let crossing = 0, straddling = 0;
    for (const spans of all) {
      if (spans.some((s) => s.x < x && spanRight(s) > x)) { crossing++; continue; }
      if (spans.some((s) => spanRight(s) <= x) && spans.some((s) => s.x >= x)) straddling++;
    }
    counts.push({ x, crossing, straddling });
  }
  const crossable = Math.max(1, Math.floor(all.length * GUTTER_CROSSING));
  const open = counts.filter((c) => c.straddling >= GUTTER_LINES && c.crossing <= crossable);
  // One gutter per run of positions that qualify, taken where most lines straddle it.
  const gutters = [];
  for (const c of open) {
    const last = gutters.at(-1);
    if (last && c.x - last.x <= 1) { if (c.straddling > last.straddling) gutters[gutters.length - 1] = c; continue; }
    gutters.push(c);
  }
  return gutters.map((g) => g.x);
}

/** Which of the page's blocks a piece of text stands in: how many gutters are to its left. */
const blockOf = (cuts, x) => cuts.filter((at) => x > at).length;

export function splitAtGutters(lines, cuts = pageGutters(lines)) {
  if (!cuts.length) return lines;
  const rebuild = (line, spans) => ({
    ...line, x0: Math.min(...spans.map((s) => s.x)), x1: Math.max(...spans.map(spanRight)),
    text: spanText([...spans].sort((a, b) => a.x - b.x)), spans,
  });
  // The line is cut at every gutter at once and each piece judged on its own. Judging a side of one gutter
  // instead read "example for parts of ski boots. Hardness" as the sentence it mostly is, and took the row's
  // own label away with the page beside it.
  return lines.map((line) => {
    const spans = inked(line);
    if (spans.length < 2) return line;
    const segments = [];
    for (const s of spans) { const i = blockOf(cuts, (s.x + spanRight(s)) / 2); (segments[i] ??= []).push(s); }
    const parts = segments.filter((p) => p?.length);
    if (parts.length < 2) return line;
    const prose = parts.filter((p) => isProse(spanText(p)));
    const rest = parts.filter((p) => !isProse(spanText(p)));
    if (!prose.length || !rest.length || !rest.some((p) => /\d/.test(spanText(p)) || labelFor(repair(spanText(p)).trim()))) return line;
    return rebuild(line, rest.flat());
  });
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
export function pageRows(allLines, registry = null) {
  const cuts = pageGutters(allLines);
  const lines = splitAtGutters(allLines, cuts);
  const anchors = lines.map((l, i) => [l, i]).filter(([l]) => !isFragment(l));
  const attached = new Map();
  const claimed = new Set();
  for (const [piece, i] of lines.map((l, i) => [l, i]).filter(([l]) => isFragment(l) || isRaisedRun(l))) {
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
    // A run of raised digits joins a row only where every one of them stands against the end of one of its
    // pieces. A value column shares a band and stands right of the row's start too; what it never does is set
    // each of its numbers hard against the last letter of a unit.
    const run = isRaisedRun(piece) && !isFragment(piece);
    const allAgainst = (row) => inked(piece).every((r) => inked(row).some((s) => Math.abs(spanRight(s) - r.x) <= AGAINST));
    const fits = anchors.filter(([row]) => inBandOf(row, piece) && rightOf(row) && (!run || allAgainst(row)))
      .sort((a, b) => (against(b[0]) ? 1 : 0) - (against(a[0]) ? 1 : 0) || Math.abs(a[0].y - piece.y) - Math.abs(b[0].y - piece.y));
    const to = fits.find(([row, at]) => !overlapsAcross([...inked(row), ...(attached.get(at) ?? []).flatMap(inked)], inked(piece)));
    if (!to) continue;
    if (!attached.has(to[1])) attached.set(to[1], []);
    attached.get(to[1]).push(piece);
    claimed.add(i);
  }
  return shareMergedLabels(shareMergedCells(gatherLabelled(lines.map((line, i) => (attached.has(i) ? joinRow([line, ...attached.get(i)]) : line))
    .filter((_, i) => !claimed.has(i)), registry)), registry);
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

/**
 * The label of two rows, printed once in a cell the table merged across both.
 *
 * The mirror of shareMergedCells above. Fillamentum sets "Tensile strength" between the row it measured at 50%
 * elongation and the row it measured at break, and "Tear resistance" between its notched and its unnotched
 * value: the label is one cell, centred on the pair of rows it heads. Read a line at a time the label states no
 * value and each value names no property, so four numbers the sheet publishes belong to nothing.
 *
 * A shared label is a line that names a property and states no value of its own. It is shared only where the
 * lines above and below it both state a value and name no property of their own: a row that names its own
 * property is complete, and a label standing between two complete rows is a row of its own that happens to be
 * empty. The two rows it makes are two measurements, never one — what separates them is the condition each
 * states, which is what the table merged the cell across in the first place.
 */
export function shareMergedLabels(lines, registry = null) {
  const names = (line) => Boolean(labelFor(repair(String(line.text ?? '')).trim()));
  // Whether the line states a number in a unit at all, which is what a value cell does. The label is judged by
  // whether a whole row can be read from it, because a condition and a designation both carry digits of their
  // own; a value cell names no property, so there is no row to read from it and only its number to go by.
  const statesANumber = (line) => {
    const t = repair(String(line.text ?? '')).replace(new RegExp(STANDARD_RE.source, 'gi'), ' ');
    return valueRe().test(t) || unitFirstRe().test(t);
  };
  const statesAValue = (line) => (registry ? Boolean(readRow(line.text, registry)) : statesANumber(line));
  // A row of a table, not a sentence that happens to carry a number: Spectrum prints "• 10% lighter than PA6
  // CF15" beside its deflection block, and a label that took the nearest line either side took two of those.
  // What a row states is a method, a unit, a condition and a number, and a phrase is what none of those is —
  // so the conditions come out first, as the designations and the units already do. "52,4 MPa ISO 527 at
  // yield, 50 mm/min" is the cell that tells a tensile strength at yield from one at break, and "at yield"
  // read as two ordinary words beside each other left both of Fillamentum's tensile rows unlabelled.
  const readsAsACell = (line) => isRowPiece({ ...line, text: String(line.text ?? '').replace(CONDITION_WORDS, ' ') });
  const waiting = lines.map((l, i) => [l, i]).filter(([l]) => !names(l) && statesANumber(l) && readsAsACell(l));
  const shared = new Map();
  for (let i = 0; i < lines.length; i++) {
    const label = lines[i];
    if (!names(label) || statesAValue(label)) continue;
    const reach = SHARED_REACH * lineHeight(label);
    // The rows either side of the label, not the lines either side of it: a maker that sets a column of prose
    // beside its table leaves a sentence between the label and the value it heads, and the page's own paragraph
    // is not what the cell was merged across.
    // A merged cell stands beside its rows, in a column of its own: they begin past where it ends. A label whose
    // rows begin where it begins is standing above them and is a block heading, which the reader already carries
    // down the block it heads. Spectrum sets "Temperature of deflection under load" above its 0.45 and 1.8 MPa
    // rows in their own column and prints its marketing bullets in the block beside, and a rule that took the
    // nearest row either side gave that heading two bullets and lost the sheet's 150 °C.
    const startsAt = (l) => Math.min(...inked(l).map((sp) => sp.x));
    const ends = Math.max(...inked(label).map(spanRight));
    const within = ([l]) => Math.abs(l.y - label.y) <= reach;
    if (waiting.some((w) => within(w) && Math.abs(startsAt(w[0]) - startsAt(label)) <= AGAINST)) continue;
    const near = (sign) => waiting.filter((w) => sign * (w[0].y - label.y) > 0 && within(w) && startsAt(w[0]) >= ends)
      .sort((a, b) => Math.abs(a[0].y - label.y) - Math.abs(b[0].y - label.y))[0];
    const above = near(1), below = near(-1);
    // Two rows of one table begin in the same column; two lines that happen to stand either side of a label do not.
    if (!above || !below || Math.abs(startsAt(above[0]) - startsAt(below[0])) > AGAINST) continue;
    // A label reaching a row that another label is nearer to would be taking that row from it.
    if (lines.some((l, j) => j !== i && names(l) && !statesAValue(l) && Math.abs(l.y - label.y) <= reach)) continue;
    shared.set(above[1], label);
    shared.set(below[1], label);
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
// The words a row states about how it was measured rather than about what it measured. They are ordinary words
// standing beside ordinary words, which is what a sentence is made of, so a rule that reads a line as prose has
// to take them out first — as it already takes out the designations and the units.
const CONDITION_WORDS = /\b(at\s+(yield|break|max(imum)?)|un-?notched|notched|dry|dried|conditioned|flatwise|edgewise|upright|on\s+its\s+edge|as\s+printed|annealed|parallel|perpendicular)\b/gi;
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
export const RATE_OR_CONDITION = /^\s*(\/\s*(min|h|hr|s)\b|\s*(RH|r\.?\s?h\.?|relative humidity)\b)/i;

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
  // A power of ten is one number, and no piece of it is a value of its own: "6.75×10^14" is not 6.75 and not 10.
  // Where it starts is where the number starts, though, so a candidate may begin there and take the whole of it.
  const powers = [...line.matchAll(POWER_RE)].map((m) => [m.index, m.index + m[0].length]);
  const inPower = (at) => powers.some(([from, to]) => at > from && at < to);
  // What a sheet prints inside brackets is what it measured the row under, not what it measured: eSUN heads its
  // rows "Vicat Softening Point（120℃，10N） GB/T 1633 110 ℃" and "Melt Flow Index（190℃，2.16kg） ... 10~16
  // g/10min", and read left to right the softening point was 120 °C. The brackets are the maker's own and a
  // Chinese sheet sets them at full width, which is the same bracket. A bracketed candidate is only set aside
  // where the line offers one outside the brackets, because a row that prints its only value that way — a
  // hardness written "(95A)", a sheet that brackets the figure itself — still states it.
  const brackets = [...line.matchAll(/[(（[［][^)）\]］]*[)）\]］]/g)].map((m) => [m.index, m.index + m[0].length]);
  const inBracket = (at) => brackets.some(([from, to]) => at >= from && at < to);
  // A standard's digits are blanked before the values are matched, so they cannot be read as a value and cannot
  // reach into what follows them: "Glass Transition Temp. DSC, ISO 11357 -55 °C" had the minus taken for a
  // range dash, because the rule that reads "55-60" as a window saw 11357 in front of it.
  // A digit written hard against the end of a word is a footnote mark, not a value: SIDDAMENT heads its rows
  // "Heat distortion temperature3 (°C) ISO 75 @0.45 MPa 251" and the 3 is what the sheet points at the note
  // with. Read as the value it gave five sheets a heat deflection of 3 °C. A value is written apart from the
  // word before it, always.
  const footnoted = line.replace(/([A-Za-z]{3,})(\d)(?![\d.,])/g, (m, word) => `${word} `);
  const masked = footnoted.replace(new RegExp(STANDARD_RE.source, 'gi'), (m) => ' '.repeat(m.length));
  const candidates = [...masked.matchAll(valueRe())].filter((m) => !inDesignation(m.index) && !afterSlash(m.index) && !inPower(m.index));
  // The table may have put the unit in a column before the value, and a row that does may still carry a "number
  // unit" pair that is not its result: "Notched impact strength ASTM D256 kj/m² 100 @ 23°C" states the test
  // temperature that way. Offering only the temperature lost every impact row of that layout, so both readings
  // are candidates and the one that counts is still the first in a unit the property is kept in.
  {
    for (const m of footnoted.matchAll(unitFirstRe())) {
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
  // A power of ten whose exponent did not survive the extraction. Stratasys prints "3.9 ×10¹³ Ω·cm" and the
  // text layer keeps "3.9", "10" and "Ω": read as digits that is 3.910 Ω, which is not a resistivity any
  // material has. A resistivity is always a power of ten, so a mantissa standing against a bare ten is a number
  // this sheet did not give up, and the row is left for a person rather than recorded as its pieces.
  if (/resistivity|resistance/i.test(match.Property) && /\d(?:[.,]\d+)?\s*(?:[x×*·]\s*)?10\s*(?![\d.,^])/.test(line)
    && !/10\s*\^/.test(line)) return null;
  const outside = candidates.filter((c) => !inBracket(c.index));
  for (const candidate of (outside.length ? outside : candidates)) {
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
    // A power of ten is one number wherever it stands. Two places in a row kept reading a piece of one:
    // a window's low end may be the tail of a power ("10^7 - 10^9 Ω" read 7 as the low end of a range ending at
    // a billion), and a candidate may begin where a power begins and take only its ten (">10¹² Ω" read 10).
    // Either way the sheet says an insulator and the row said a conductor.
    const wholePower = (at) => powers.find(([from]) => from === at);
    const powerAround = (at) => powers.find(([from, to]) => at >= from && at <= to);
    const asWritten = (piece, at) => { const p = powerAround(at); return p ? line.slice(p[0], p[1]) : piece; };
    const value = spread ? spread[1]
      : window ? asWritten(window[1], window.index + (window[0].length - window[0].replace(/^\s+/, '').length))
      : wholePower(candidate.index) ? line.slice(candidate.index, wholePower(candidate.index)[1]) : candidate[1];
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
      // What the line prints after the value, which is where a table with a Test Condition column puts the load
      // and the method: Fillamentum's "Heat distortion temperature 119 °C ISO 75 0.45 MPa".
      trailing: line.slice(candidate.index + candidate[0].length).trim(),
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
  /**
   * A label that carries its own unit, and a bare number where the value belongs. Raise3D heads its rows
   * "Density (g/cm³) ISO 1183, GB/T 1033 1.34" and Siraya Tech "Tensile strength (MPa) ASTM D638 52": the unit
   * is stated once, in the label, and the value column holds a number and nothing else. Thirty-one held
   * documents across seven makers print at least one row that way, and the reader read none of them.
   *
   * This is the hardness fallback generalised — a hardness has always stated its scale in the label and printed
   * a bare number — and it is tried last for the same reason: every other layout states the unit beside the
   * value, so a row that offers a "number unit" pair has already been read by the time this is reached.
   */
  const asLabelUnit = () => {
    // The unit the label states, in its own brackets, and nothing else in them: "(g/cm³)", "(MPa)", "(%)".
    // A bracket holding a condition ("(120℃, 10N)") or a direction ("(X-Y)") states no unit and is passed over.
    const stated = [...line.matchAll(/[(（[［]\s*([^)）\]］,;]{1,12}?)\s*[)）\]］]/g)]
      .map((m) => ({ unit: m[1].trim(), at: m.index }))
      .find((c) => c.unit && !/\d/.test(c.unit) && targetUnit(match.Property, c.unit, registry));
    if (!stated) return null;
    const target = targetUnit(match.Property, stated.unit, registry);
    // Everything that is not the value comes off first: the designations, the label with its bracket, and any
    // condition the row states in a unit of its own ("70% RH, 30 days"). What is left at the end of the line is
    // the value, and it is only read where exactly one number is left — a row offering two is a row that needs
    // its columns read by position, which is a different gap.
    const tail = line.slice(stated.at + 1).replace(new RegExp(STANDARD_RE.source, 'gi'), ' ')
      .replace(/^[^)）\]］]*[)）\]］]/, ' ')
      .replace(/-?\d+(?:[.,]\d+)?\s*(?:[°º˚]\s?[CF]\b|℃|℉|%|h\b|hr\b|days?\b|min\b|s\b|kg\b|N\b|mm\b|rh\b)/gi, ' ');
    const numbers = [...tail.matchAll(/(?<![\w.,])(-?\d+(?:[.,]\d+)?)(?![\w.,])/g)];
    if (numbers.length !== 1 || !target) return null;
    const value = numbers[0][1];
    return { match, label: line.slice(0, stated.at).trim(), conditions: line.slice(0, stated.at).trim(),
      raw: value, rawNumber: rawNumber(value) == null ? value : String(rawNumber(value)), printedUnit: stated.unit,
      uncertainty: null, upper: null, target,
      standards: (line.match(STANDARD_RE) ?? []).map((m) => m.replace(/\s+/g, ' ').trim()), operator: '=', range: false };
  };
  /**
   * A row whose unit column stands between its label and its method: iSANMATE prints "Tensile Strength MPa ASTM
   * D-638 51", "Density g/cm3 ASTM D-792 1.10-1.13" and "Melting point ℃ DSC 180-200" on every one of its thirty
   * sheets, and a reader that looks for a number with its unit after it finds "D-638 51" instead. The unit is the
   * first word after the label and a unit of the row's property; the method comes off; what is left must be one
   * number or one range, or the row is not this layout.
   */
  const asUnitBeforeMethod = () => {
    const label = match.re ? new RegExp(match.re.source, 'i').exec(line) : null;
    if (!label) return null;
    // Vicat's method may stand between the label and the unit: "Vicat softening point A/120 ℃ ASTM D-648 88".
    const vicat = /^\s*([AB]\s?\/\s?\d{2,3})\b/.exec(line.slice(label.index + label[0].length));
    // And a test condition in its own brackets: "Melt Index（170℃, 2160g） g/10min ASTM D-1238 10".
    // An axis in brackets is the row's direction, which is read from the label: "Elastic modulus(XY) MPa ISO 527".
    const axisBracket = /^\s*([(（]\s*(?:X-?Y|Z|X-?Z|Z-?X|XY|XZ|ZX)\s*[)）])/i.exec(line.slice(label.index + label[0].length + (vicat ? vicat[0].length : 0)));
    const after = line.slice(label.index + label[0].length + (vicat ? vicat[0].length : 0) + (axisBracket ? axisBracket[0].length : 0));
    const bracket = /^\s*([(（][^)）]{2,30}[)）])/.exec(after);
    const rest = bracket && /\d/.test(bracket[1]) ? after.slice(bracket[0].length) : after;
    const unit = /^\s*[(（]?\s*([A-Za-z%°℃µμΩ][A-Za-z0-9%°℃/·²³.\s]{0,11}?)\s*[)）]?(?=\s+(?:ISO|ASTM|DIN|GB|DSC|TGA|IEC|UL|EN|D\s?-?\d)|\s+[<>≤≥]?\d)/.exec(rest);
    if (!unit) return null;
    // The unit is kept as printed, but with its exponent on the line: "KJ/m²" is the "KJ/M2" the other layouts
    // already read, and a raised digit is typesetting, not a different unit.
    const printedUnit = unit[1].replace(/\s+/g, '').replace(/[³]/g, '3').replace(/[²]/g, '2');
    const target = targetUnit(match.Property, printedUnit, registry);
    if (!target) return null;
    const tail = rest.slice(unit.index + unit[0].length)
      .replace(new RegExp(STANDARD_RE.source, 'gi'), ' ').replace(/\b(?:DSC|TGA|DMA|TMA)\b/gi, ' ')
      .replace(/[(（][^)）]*[)）]/g, ' ')
      // What separated two methods ("ISO 527,GB/T 1040") is left behind them; a comma inside a number is not.
      .replace(/(?<!\d)[,;]|[,;](?!\d)/g, ' ').trim();
    const window = /^([<>≤≥]?)\s*(\d+(?:[.,]\d+)?)\s*(?:[-~–]{1,2}\s*(\d+(?:[.,]\d+)?))?$/.exec(tail);
    if (!window) return null;
    const [, operator, value, upper] = window;
    const labelText = `${line.slice(0, label.index + label[0].length).trim()}${axisBracket ? ` ${axisBracket[1].trim()}` : ''}`;
    return { match, label: labelText, conditions: `${labelText}${vicat ? ` ${vicat[1]}` : ''}${bracket && /\d/.test(bracket[1]) ? ` ${bracket[1]}` : ''}`,
      raw: `${upper ? `${value}-${upper}` : `${operator}${value}`} ${printedUnit}`, rawNumber: String(rawNumber(value)), printedUnit,
      uncertainty: null, upper: upper ? String(rawNumber(upper)) : null, target, trailing: '',
      // A thermal method is a method here as it is in every other layout (readStandards records DSC).
      standards: [...(line.match(new RegExp(STANDARD_RE.source, 'gi')) ?? []), ...(line.match(/\b(?:DSC|TGA|DMA|TMA)\b/g) ?? [])].map((m) => m.replace(/\s+/g, ' ').trim()),
      // A window's low end is the value and its high end the upper bound, as the other layouts read one.
      operator: operator === '<' || operator === '≤' ? '<' : operator === '>' || operator === '≥' ? '>' : '=', range: false };
  };
  /** A value line under a label that stated its unit beside it (`heldUnit`, set by readSheet): method and value. */
  const asHeldUnit = () => {
    if (!held?.heldUnit || labelFor(line)) return null;
    const target = targetUnit(match.Property, held.heldUnit, registry);
    if (!target) return null;
    const tail = line.replace(new RegExp(STANDARD_RE.source, 'gi'), ' ').replace(/\b(?:DSC|TGA|DMA|TMA)\b/gi, ' ')
      .replace(/[(（][^)）]*[)）]/g, ' ').replace(/(?<!\d)[,;]|[,;](?!\d)/g, ' ').trim();
    const window = /^([<>≤≥]?)\s*(\d+(?:[.,]\d+)?)\s*(?:[-~–]{1,2}\s*(\d+(?:[.,]\d+)?))?$/.exec(tail);
    if (!window) return null;
    const [, operator, value, upper] = window;
    return { match, label: '', conditions: '', raw: `${upper ? `${value}-${upper}` : `${operator}${value}`} ${held.heldUnit}`,
      rawNumber: String(rawNumber(value)), printedUnit: held.heldUnit, uncertainty: null, upper: upper ? String(rawNumber(upper)) : null,
      target, trailing: '',
      standards: [...(line.match(new RegExp(STANDARD_RE.source, 'gi')) ?? []), ...(line.match(/\b(?:DSC|TGA|DMA|TMA)\b/g) ?? [])].map((m) => m.replace(/\s+/g, ' ').trim()),
      operator: operator === '<' || operator === '≤' ? '<' : operator === '>' || operator === '≥' ? '>' : '=', range: false };
  };
  return asHardness() ?? asLabelUnit() ?? asUnitBeforeMethod() ?? asHeldUnit();
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
    // A setting is a value, not a sentence. Raise3D wraps "A wear-resistant nozzle, such as hardened steel and
    // ruby nozzle, is highly recommended." so that the word nozzle begins a line, and the rest of the sentence
    // was recorded as a nozzle temperature; 3D4Makers runs a paragraph together with no spaces at all and its
    // tail became an enclosure. What a value never has is a verb saying what the sheet advises, and what it
    // never is, is a run of words with no number in it.
    if (SAYS_SOMETHING.test(raw)) return null;
    // A setting never cites a standard. A temperature, a speed or a state is what a printing table holds; a
    // designation belongs to a test. Stratasys describes its UV ageing "in a chamber per ASTM G154 (Standard
    // Practice for Operating Fluorescent UV Light Apparatus …)", and the digits of the designation were what
    // let a sentence past the guard that stops a run of words with no number in it.
    // STANDARD_RE knows the designations a property row cites; a setting is refused on any body's name with a
    // number after it, because "ASTM G154" is one the property reader never had to know.
    if (/\b(?:ISO|ASTM|DIN|IEC|UL|GB\/T)\s?[A-Z]?\s?-?\d{2,}\b/i.test(raw)) return null;
    if (!/\d/.test(raw) && (raw.match(/[A-Za-z]{2,}/g) ?? []).length >= SETTING_WORDS) return null;
    // A paragraph the page ran together has no spaces to count, so it is measured instead: a setting that
    // states no number and none of the words a state is written in says nothing in eighty characters that it
    // could not say in twenty.
    if (!/\d/.test(raw) && raw.length > SETTING_LENGTH && !STATE.test(raw)) return null;
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
  {
    const text = repair(String(line.text ?? line ?? '')).trim();
    const named = labelFor(text);
    if (named && /resistivity|resistance/i.test(named.Property) && /\d(?:[.,]\d+)?\s*(?:[x×*·]\s*)?10\s*(?![\d.,^])/.test(text) && !/10\s*\^/.test(text)) {
      return `the sheet states ${named.Property} as a power of ten whose exponent did not survive the extraction ("${text.slice(0, 60)}")`;
    }
  }
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
// ---------------------------------------------------------------------------------------------------------
// A table with a value column per build orientation.
//
// BASF heads its mechanical table "Print direction | Standard | XY | XZ | ZX" and prints three values on every
// row; Fillamentum's OBC 905 heads its "XY-axis | Z-axis | Test Method | Test Condition" and prints two. Read as
// one line, the first value is taken, the rest of the row is dropped, and the one value that is kept is recorded
// with no direction at all — which is worse than losing it, because a strength with no direction cannot be told
// from a strength measured flat.
//
// The header row is the page saying where its columns are, so it is read rather than guessed at: its cells are
// the column boundaries, and the cells that name an orientation are the value columns. Everything outside them —
// the label on the left, the method and the conditions on the right — is the row's context, and belongs to every
// value on the row. One synthetic line per orientation is then read by the ordinary row reader, so the units,
// the designations, the conditions and the bounds are all read exactly as they are anywhere else.
// ---------------------------------------------------------------------------------------------------------

// A heading names the orientation and then says so: "XY", "Z-axis", "XZ Orientation", "ZX Orientation1" — the
// trailing digit is a footnote mark, which Stratasys puts on every one of its column headings.
// "XZ/ZX" is one cell Stratasys heads a column with, meaning the one value stands for both orientations. It is
// kept as the sheet prints it and becomes a direction the database cannot use as a build direction, with a note.
const AXIS_CELL = /^\(?\s*(X\s?[-‑–]?\s?Y|Y\s?[-‑–]?\s?X|X\s?[-‑–]?\s?Z|Z\s?[-‑–]?\s?X|XZ\s?\/\s?ZX|XY|XZ|ZX|Z)\s*\)?(?:[\s-]*(?:axis|axes|direction|orientation|richtung)\s*\d?)?\s*$/i;
// A heading cell may name a condition instead of an orientation, or in front of one: QIDI heads its columns
// "Method | Molded | X-Y Axis | Z Axis" and "3D Printed X-Y | 3D Printed Z", Siraya Tech "Unannealed | Annealed
// | Method", Stratasys "Non-Annealed | Annealed". Each column then states what every value under it was measured
// as, as plainly as an orientation heading states a direction, and the row builder reads the word the way it
// reads the same word in a row's own label.
const CONDITION_WORD = /^(un-?annealed|non-?annealed|not annealed|as[- ]printed|annealed|injection[- ]mou?lded|compression[- ]mou?lded|mou?lded|3d[- ]?printed|printed|dry|conditioned|typical values?)\b/i;
const conditionOf = (word) => {
  const w = String(word ?? '').toLowerCase().replace(/[\s-]+/g, ' ');
  if (/^(un ?annealed|non ?annealed|not annealed|as printed)$/.test(w)) return 'as printed';
  if (w === 'annealed') return 'annealed';
  if (/mou?lded$/.test(w)) return 'moulded';
  if (/printed$/.test(w)) return 'printed';
  if (w === 'dry' || w === 'conditioned') return w;
  return null;                                   // "typical values" heads the block and states nothing
};
const cellOf = (text) => {
  const t = String(text ?? '').trim().replace(/^\(|\)$/g, '').trim();
  const lead = CONDITION_WORD.exec(t);
  const rest = lead ? t.slice(lead[0].length).replace(/^[\s:,-]+/, '') : t;
  const axis = rest ? axisOf(rest) : null;
  if (lead && rest && !axis) return { axis: null, condition: null };   // a sentence that starts with the word
  return { axis, condition: lead ? conditionOf(lead[1]) : null, named: Boolean(axis || (lead && !rest)) };
};
const axisOf = (text) => {
  const m = AXIS_CELL.exec(String(text ?? '').trim());
  return m ? m[1].replace(/[\s‑–-]/g, '').toUpperCase() : null;
};

/**
 * The orientation columns a page's header row declares: one per cell that names an axis, with the x it starts at
 * and the x the next cell starts at. A header needs two of them — one column is an ordinary table, and a single
 * cell that happens to read "Z" is a letter.
 */
export function axisColumns(line) {
  const cells = lineCells(line);
  // Three cells is a heading row with a label column and its orientations. Two is one too, where both of them
  // name an orientation and nothing else does: Stratasys sets its tables' headings on three lines — "Typical
  // Values", then "Property Test Method", then "XY ZX" — and the line that names the columns names only them.
  // Requiring a third cell lost every Stratasys table, which is 24 documents and 400 values.
  const allNamed = cells.length === 2 && cells.every((c) => cellOf(c.text).named && !/\d/.test(c.text));
  if (cells.length < 3 && !allNamed) return null;
  // Where one column ends and the next begins is halfway between where the heading before it ends and where it
  // starts, because a maker centres a value under its heading as often as it aligns it: BASF's XY heading
  // stands at 381 and its values start at 354, while Fillamentum sets both at 162. Measuring from the previous
  // heading's start instead puts the boundary a column too far left: Stratasys heads its label column
  // "0.25 mm (0.010 in.) Layer Height" and its unit column not at all, and halfway from that heading's start
  // swallowed the unit into the first orientation, leaving the second with a number and no unit at all. The
  // first heading needs a floor of its own, mirrored from the gap on its other side, or the label column —
  // which OBC 905 gives no heading at all — falls inside it.
  const spans = inked(line);
  const ends = cells.map((c, i) => {
    const next = cells[i + 1]?.x ?? Infinity;
    const own = spans.filter((sp) => sp.x >= c.x - 1 && sp.x < next);
    return own.length ? Math.max(...own.map(spanRight)) : c.x;
  });
  const edge = cells.map((c, i) => (i ? (Math.min(ends[i - 1], c.x) + c.x) / 2 : null));
  const bounds = cells.map((c, i) => ({
    ...c,
    ...cellOf(c.text),
    from: edge[i] ?? c.x - ((edge[i + 1] ?? c.x + 1) - c.x),
    to: edge[i + 1] ?? Infinity,
  }));
  // Two named columns make a heading: two orientations, an orientation and a condition, or two conditions that
  // differ ("Unannealed | Annealed"). Two cells that both say "Annealed" are one condition, not two columns.
  const axes = bounds.filter((c) => c.named);
  if (axes.length < 2) return null;
  if (!axes.some((c) => c.axis) && new Set(axes.map((c) => c.condition)).size < 2) return null;
  // What the heading says before it names its columns is the condition the whole table was measured under:
  // Stratasys prints a table per layer height and heads each "0.25 mm (0.010 in.) Layer Height | XZ
  // Orientation1 | ZX Orientation1". Without it the three tables are one grade's elongation four times over,
  // which is what MEAS-CONDITIONS-INDISTINCT is for.
  const heading = bounds.filter((c) => !c.axis && c.x < axes[0].x).map((c) => c.text.trim()).join(' ').trim();
  return { from: Math.min(...axes.map((a) => a.from)), axes, heading: heading || null };
}

// A table's own heading row, which ends whatever table came before it. A heading states no number — every row of
// a property table does — and names the table rather than a value, which is what keeps BASF's second heading row
// ("Flat | On its edge | Upright", how each orientation lies) from being read as the start of a new table.
const TABLE_HEADING = /typical value|test method|test condition|propert|unit|standard|method/i;
const endsTheTable = (line) => {
  const cells = lineCells(line);
  return cells.length >= 3 && !cells.some((c) => /\d/.test(c.text)) && TABLE_HEADING.test(line.text);
};

/**
 * A page's rows with every row of an orientation table split into one row per orientation, each carrying the
 * direction its column is headed with. A page with no such table comes back exactly as it went in.
 */
// A table's own caption, within a few lines above its heading: "Table 4: ABS-M30 Black Mechanical Properties -
// F770 - T14 Standard Head". Stratasys prints one table per printer and per layer height, and without the caption
// the three are one grade's elongation four times over with nothing on the row saying which table each came
// from — which is what MEAS-CONDITIONS-INDISTINCT refused, twenty-four times, in b22.
const A_CAPTION = /^(?:table|tabelle|tableau|tabla)\s+\d+\s*[:.]\s*\S/i;
const captionAbove = (lines, at) => {
  for (let i = at - 1; i >= Math.max(0, at - 6); i--) {
    const text = String(lines[i]?.text ?? '').trim();
    if (A_CAPTION.test(text)) return text.replace(/\s+/g, ' ');
  }
  return null;
};

export function splitAtAxisColumns(lines) {
  let axes = null;
  const out = [];
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const header = axisColumns(line);
    if (header) { axes = { ...header, caption: captionAbove(lines, li) }; out.push(line); continue; }
    if (endsTheTable(line)) { axes = null; out.push(line); continue; }
    const parts = axes ? axisRows(line, axes) : [];
    if (parts.length > 1) {
      const parameters = [axes.caption, axes.heading].filter(Boolean).join(' \u00b7 ') || null;
      for (const part of parts) out.push({ ...part.line, column: part.axis, condition: part.condition, parameters });
      continue;
    }
    out.push(line);
  }
  return out;
}

/** A row read at those columns: the context spans, and one synthetic line per orientation that states a value. */
export function axisRows(line, columns) {
  const spans = inked(line);
  const inAxis = (s) => columns.axes.find((a) => s.x >= a.from && s.x < a.to);
  const context = spans.filter((s) => !inAxis(s));
  const out = [];
  for (const a of columns.axes) {
    const own = spans.filter((s) => inAxis(s) === a);
    if (!own.length) continue;
    const together = [...context, ...own].sort((x, y) => x.x - y.x);
    out.push({ axis: a.axis, condition: a.condition, line: { ...line, spans: together, text: spanText(together), x0: together[0].x, x1: spanRight(together.at(-1)) } });
  }
  return out;
}

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
    // The family a block heading puts its rows in, and the standard it names for them. Stratasys heads a block
    // "Flexural Properties: ASTM D790, Procedure A" and prints "Strength at Break", "Strain at Break" and
    // "Modulus" under it with no other word: read by their own labels those were a tensile break strength, a
    // tensile elongation and a tensile modulus, and a flexural strain of 3.7 % beside a tensile elongation at
    // yield of 4.4 % was the sheet contradicting itself (MEAS-PHYSICS-ORDER). The heading is the sheet saying
    // what the rows are, as a column heading says what direction they are in, and it governs them until the
    // next block heading.
    let family = null;
    // Which specimen the rows under a heading were cut from, until another heading says otherwise.
    let specimenBlock = null;
    // The page's rows, not the extractor's baselines: a value set a point above its label is part of that label's
    // row, and reading the two apart left a number with no property and a property with no number.
    const lines = splitAtAxisColumns(pageRows(page.lines, registry));
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      // A block heading stands in the table's own column. Polymaker's Fiberon PET-GF15 sheet sets "(annealed)"
      // beside two of its heat deflection rows, a hundred points left of where its table begins, and those two
      // rows say the word themselves; read as a heading it governed every row after it, so a glass transition
      // and a melting point measured on an ordinary bar were recorded as annealed.
      const headingWord = /^\s*\(?(as[- ]printed|annealed|after annealing|not annealed|un-?annealed)\)?\s*$/i.exec(line.text.trim());
      const nextRow = lines.slice(li + 1).find((l) => readRow(l.text, registry));
      const blockHeading = headingWord && (!nextRow || Math.abs((line.x0 ?? 0) - (nextRow.x0 ?? 0)) <= BLOCK_COLUMN) ? headingWord : null;
      if (blockHeading) { block = blockHeading[1].toLowerCase().replace('after annealing', 'annealed'); continue; }
      const familyHeading = line.text.trim().length <= 80 && !readRow(line.text, registry)
        ? /^(tensile|flexural|compressive|impact|thermal|physical|mechanical|electrical)\s+properties\s*(?::\s*(.+))?$/i.exec(line.text.trim()) : null;
      if (familyHeading) {
        const name = familyHeading[1].toLowerCase();
        family = ['tensile', 'flexural', 'compressive'].includes(name)
          ? { name, standards: (familyHeading[2] ?? '').replace(/\s+/g, ' ').trim() || null }
          : null;                                   // "Mechanical Properties" heads the table and names no family
        continue;
      }
      // A sheet may publish one table of printed bars and another of moulded ones, and say which above each:
      // colorFabb heads them "TYPICAL MATERIAL PROPERTIES - 3D Printed" and "- Injection molded". Read without
      // the heading, a moulded modulus of 3400 MPa and a printed one of 3286 are one grade contradicting itself,
      // and the moulded values are recorded as the printed bars the headline rules may cite.
      const specimenHeading = line.text.trim().length <= SPECIMEN_HEADING
        && /\b(3d[- ]?printed|injection[- ]mou?lded|compression[- ]mou?lded)\b/i.test(line.text) && !readRow(line.text, registry)
        ? (/injection|compression/i.test(line.text) ? 'moulded' : 'printed') : null;
      if (specimenHeading) { specimenBlock = specimenHeading; continue; }
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
      // A row that publishes no number publishes that. Bambu prints "Crystallization Temperature DSC, 10 C/min
      // N/A", which is the sheet answering for the row and not a label waiting for the row below to answer for
      // it; held as a label it took the Vicat point printed under it and called 94 C a crystallization
      // temperature. The dash a sheet leaves in a value column says the same thing.
      const STATES_NOTHING = /(?:^|[\s:])(n\s*\/\s*a|n\.\s?a\.|not applicable|not measured|not detected|none|[-–—])\s*$/i;
      // Only where the line states no value of its own: a sheet leaves the method column empty as often as the
      // value column, and "Heat deflection temperature (HDT) 125-140 C —" and "VICAT softening point 60C N/A"
      // both publish their result and say nothing about how it was measured.
      if (bare && STATES_NOTHING.test(plain) && !readRow(rowLine.text, registry)) { dropHeld(); held = null; heldFor = 0; prefix = null; continue; }
      if (bare && headsRowsBelow && (!/\d/.test(plain) || !readRow(rowLine.text, registry))) {
        // A label line that holds a number of its own and never gives it to a row below is a number the sheet
        // prints and the proposal lost. It is written down when the label is dropped, not here, because until
        // then the row under it may still be the one that states it.
        dropHeld();
        if (/\d/.test(plain)) {
          pendingHeld = { page: page.page, text: line.text.slice(0, 160),
            reason: unreadRowReason(rowLine, registry) ?? 'a label the lexicon knows, with a number its property is not kept in and no row below that stated one' };
        }
        // A label that prints its unit beside it and its value on the line below carries the unit down with it:
        // iSANMATE sets "Tensile strength MPa" on one line and "ISO 527 43.8" under it.
        const heldUnit = (() => {
          const at = new RegExp(bare.re.source, 'i').exec(plain);
          const rest = at ? plain.slice(at.index + at[0].length).trim() : '';
          const unit = rest.replace(/\s+/g, '').replace(/[³]/g, '3').replace(/[²]/g, '2');
          return unit && !/\d{2}/.test(unit) && targetUnit(bare.Property, unit, registry) ? unit : null;
        })();
        held = heldUnit ? { ...bare, heldUnit } : bare; heldLabel = plain; heldFor = 0; heldX = line.x0 ?? 0; heldMethods = methodsOf(plain);
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
      // A bilingual sheet prints its label twice, around the row rather than above it: QIDI sets the Chinese
      // name on one baseline, the standard and the value on the next, and the English name on the one after.
      // Read without the line below, "ISO 1183 1.07g/cm3" names no property and every such row was lost.
      //
      // A label standing under the line beats one carried down to it, because it is the nearer of the two and a
      // carried label is a guess about how far a heading reaches. QIDI's "ISO 527 2317±246.0 MPa" begins with a
      // standard, which is what a wrapped row looks like, so the label held three rows above claimed it and a
      // Young's modulus of 2317 MPa was recorded as a tensile yield strength.
      const nextLine = lines[li + 1];
      const belowText = nextLine ? repair(String(nextLine.text ?? '')).trim() : '';
      const belowLabel = belowText && !/\d/.test(belowText) && belowText.length <= HEADING_LENGTH
        && Math.abs((nextLine.x0 ?? 0) - (line.x0 ?? 0)) > 24 ? labelFor(belowText) : null;
      // A label may also stand on both sides of its row, and then neither half names the property alone: Yousu
      // prints "Notched IZOD" above the line and "Impact" below it, and the lower half alone is an impact
      // strength of no stated test. Taken together they are the notched Izod the sheet means.
      const prevText = li > 0 ? repair(String(lines[li - 1].text ?? '')).trim() : '';
      const aboveText = prevText && !/\d/.test(prevText) && prevText.length <= HEADING_LENGTH ? prevText : '';
      // Both halves have to be halves of a label: a line that states a number is the next row, not the rest of
      // this one's name, and read as one "IMPACT" above and "Charpy Notched Impact Strength 20 kJ/m2" below
      // made an impact strength of no stated test out of a row that names Izod itself.
      const aroundLabel = aboveText && belowText && !/\d/.test(belowText) && belowText.length <= HEADING_LENGTH
        ? labelFor(`${aboveText} ${belowText}`.replace(/\s+/g, ' ').trim()) : null;
      // The nearer label beats one carried down to the row, because a carried label is a guess about how far a
      // heading reaches. QIDI's "ISO 527 2317±246.0 MPa" begins with a standard, which is what a wrapped row
      // looks like, so a label held three rows above claimed it and a Young's modulus was recorded as a yield
      // strength.
      const nearLabel = aroundLabel ?? belowLabel;
      const read = readRow(rowLine.text, registry, nearLabel ?? (carry ? carried0 : null));
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
      const fullLabel = asciiPunctuation(nearLabel ? `${aboveText} ${read.label} ${belowText}`.replace(/\s+/g, ' ').trim()
        : carried ? `${heading0} ${read.conditions} ${rest}`.replace(/\s+/g, ' ').trim() : read.label);
      // Neither line names the whole property on its own: "Tensile Strength*" heads the block and "At break 55
      // MPa" is the row, and only the two together say which tensile strength it is. So the label is matched
      // again against both, and the more specific answer wins.
      //
      // A row may say which one it is in its condition column instead of in its label, on the far side of the
      // value: Fillamentum prints "Tensile strength | 52,4 MPa | ISO 527 | at yield, 50 mm/min" above
      // "Tensile strength | 37,7 MPa | ISO 527 | at break, 50 mm/min", and the endpoint is the only thing
      // between the two. Read from the label alone both are the tensile strength of no stated endpoint, which
      // is a third property and neither of the two the sheet publishes.
      const endpoint = carried ? '' : (/\bat\s+(?:yield|break)\b/i.exec(repair(String(line.text ?? ''))) ?? [''])[0];
      const refined = labelFor(carried ? fullLabel : `${read.label} ${endpoint}`.replace(/\s+/g, ' ').trim());
      if (refined) read.match = refined;
      const standardText = [read.conditions, ...read.standards].join(' ');
      const method = impactMethod(read.match.Property, fullLabel, standardText);
      // The notch is what the row says, then what the method implies, then what the label's kind usually means.
      // colorFabb names the test in its method column, "Izod Notch" and "Charpy Notch", and a notch the row names
      // anywhere on it is the row's (the second read, R085).
      const onRow = `${fullLabel} ${read.conditions ?? ''}`;
      // A sheet may say it in its own language: QIDI's 缺口冲击强度 is the notched impact strength (无缺口, without a
      // notch), Extrudr's Kerbschlagzähigkeit the notched one (Schlagzähigkeit alone is not).
      const notch = /\bun-?notch(?:ed)?\b|\bizod-un\b|无缺口/i.test(onRow) ? 'Unnotched'
        : /\bnotch(?:ed)?\b|缺口|kerbschlag/i.test(onRow) ? 'Notched'
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
      // A row that repeats the row above it, label for label, and states its value in another unit is that row
      // said twice: Stratasys prints "Tensile Modulus ... ASTM D638 2,400 MPa" and then the same label again
      // with "(350,000 psi)" under it, and read as two rows a grade has two moduli. The metric one is kept
      // because it is the one the sheet leads with, and the imperial one is written down as the repeat it is —
      // with both figures, because where they disagree it is the sheet that does.
      const previous = values.at(-1);
      if (previous && previous.property === (method?.property ?? read.match.Property)
        && previous.label === fullLabel && previous.read.printedUnit !== read.printedUnit) {
        const first = Number(previous.read.rawNumber) * previous.target.factor;
        const again = Number(read.rawNumber) * read.target.factor;
        const apart = first && Number.isFinite(again) ? Math.abs(again - first) / Math.abs(first) : null;
        skipped.push({ page: page.page, text: line.text.slice(0, 160),
          reason: apart != null && apart > 0.02
            ? `the same row again in ${read.printedUnit}, and the two do not agree: ${previous.read.raw} is ${first.toPrecision(4)} ${previous.target.unit} and ${read.raw} is ${again.toPrecision(4)}`
            : `the same row again in ${read.printedUnit} (${read.raw}), which is one measurement stated twice` });
        continue;
      }

      // A sentence that says how the specimens were printed is not a result. QIDI closes each table with
      // "Specimens printed under the following conditions: Nozzle size 0.4mm, Nozzle temperature 210°C, ...
      // infill 100%", and the reader took the infill for an elongation at break of 100 %. The same sentence is
      // already what tells this reader the sheet's bars were printed; it is a statement about specimens either
      // way, and never about a property.
      const SPECIMEN_SENTENCE = /printed specimen conditions|specimens? (?:were )?printed under|specimen (?:preparation|conditions)[:\s]|test specimens?(?: were)? (?:3d )?printed|\u8bd5\u6837\u6253\u5370\u53c2\u6570/i;
      if (SPECIMEN_SENTENCE.test(String(line.text ?? ''))) {
        skipped.push({ page: page.page, text: line.text.slice(0, 160), reason: 'a sentence stating how the specimens were printed, not a result' });
        continue;
      }

      // A merged cell says the same thing twice. Polymaker, QIDI and Fiberon print the Testing Method column as
      // one cell spanning a property's two direction rows, and extraction lands its text on a line of its own
      // between them — "Young's modulus (X-Y) 2116.8 ± 68.1 MPa", then "ISO 527, GB/T 1040", then "Young's
      // modulus (Z) 1898.7 ± 98.5 MPa". Read row by row, only one of the two names a standard, and 491 of
      // Polymaker's 1,092 rows say the sheet named none while 288 carry the designation from those very cells.
      //
      // A line that is nothing but standard designations is that cell. It belongs to the row above it and the
      // row below it, and to nothing further: a cell spans the rows it is drawn across, and reaching past them
      // would be a guess about a table this reader cannot see the rules of.
      const mergedStandards = read.standards.length ? null
        : [lines[li - 1], lines[li + 1]].map((l) => standardsOnly(l ? repair(String(l.text ?? '')) : '')).find(Boolean) ?? null;

      values.push({
        page: page.page, property: method?.property ?? familyProperty(read.match.Property, family?.name), methodNote: method?.note ?? null,
        familyStandards: family?.standards ?? null, mergedStandards,
        // The column's own condition joins the row's: a value under an "Annealed" heading was annealed as surely
        // as one whose label says so, and the state readers below read the word either way.
        label: fullLabel, condition: [carried ? fullLabel : read.conditions, line.condition ?? ''].filter(Boolean).join(' '),
        // A condition may stand on a line of its own under the row it belongs to. Polymaker's HT-PLA sheets
        // print "Vicat softening temp. ISO 306, GB/T 1633 148.9°C" and then "(as printed)" underneath, and the
        // annealed value with "(annealed)" on the same line as itself; read without the line below, the
        // as-printed row said nothing about its state and was averaged with the annealed one.
        // A line that is nothing but a bracketed phrase belongs to the row above it: it has no value of its own
        // and nothing else to belong to.
        direction: read.match.Direction, notch, read, target: read.target,
        line: `${line.text}${/^\s*\([^)]{2,40}\)\s*$/.test(String(lines[li + 1]?.text ?? '')) ? ` ${String(lines[li + 1].text).trim()}` : ''}`,
        footnote: footnoteFor(`${fullLabel} ${line.text}`, footnotes),
        printedSpecimens, orientation, block, column: line.column ?? null,
        specimen: line.condition === 'moulded' || line.condition === 'printed' ? line.condition : specimenBlock,
        parameters: line.parameters ?? null,
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
const NOTCHED_BY_METHOD = [[/ISO\s?179[-\/\s]?1eA|ISO\s?180[-\/\s]?1?A\b|ASTM\s?D\s?256/i, 'Notched'], [/ISO\s?179[-\/\s]?1eU|ISO\s?180[-\/\s]?1?U\b/i, 'Unnotched']];

/**
 * The property a generic label names under a family heading. "Strain at Break" under "Flexural Properties" is the
 * flexural elongation at break, which properties.csv keeps as its own row; "Strength at Break" and "Modulus"
 * under it are the flexural strength and modulus. Under a tensile heading the generic labels already read as
 * tensile, so nothing moves; a label that names its own family ("Flexural strength") is left alone whatever
 * block it stands in, because the row's own word beats the heading's.
 */
const FAMILY_PROPERTY = {
  flexural: {
    'Elongation at break': 'Flexural elongation at break',
    'Tensile break strength': 'Flexural strength',
    'Tensile strength (endpoint unspecified)': 'Flexural strength',
    'Tensile modulus': 'Flexural modulus',
  },
};
export const familyProperty = (property, family) => FAMILY_PROPERTY[family ?? '']?.[property] ?? property;

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
// A captured web page's navigation path says where the page sits in a shop, not what the product is made of:
// "Home / 3D printing filament / Reinforced / Carbon fibre / Nanovia ABS CF : Carbon fiber reinforced" names a
// carbon load and a reinforcement and is a menu. It is not the product's own statement about itself.
const A_NAVIGATION_PATH = /^\s*(?:home|accueil|start(?:seite)?|inicio)\s*(?:\/|\u203a|>|\u00bb)/i;
const FILLER_NAMED = /\b(carbon|glass|aramid|kevlar|basalt|wood|metal|mineral|graphene|nanotubes?|cnt|ptfe|teflon|ceramic|chalk|calcium|talc|bronze|copper|brass|steel|iron|tungsten|cork|bamboo)\b/i;
const FILLER_FRACTION = /\d{1,2}(?:[.,]\d)?\s?(?:wt\.?\s?%|%|percent)/i;
const FILLER_VERB = /\b(reinforced|filled|enriched|loaded|addition of|content|composite)\b/i;
// A load named in full is a statement of what is in the product even where the sentence around it is not.
const FILLER_PHRASE = /\b(carbon nanotubes?|(carbon|glass|aramid|basalt) fib(?:re|er)s?|glass (spheres|beads|bubbles)|metal powder)\b/i;

export function composition(text) {
  // The sheet's own words, with the page's own spacing collapsed: a captured page pads its columns with runs of
  // spaces, and a run of spaces is layout rather than anything the maker wrote (TEXT-SPACING).
  const said = (line, page) => `${String(line.text).replace(/\s+/g, ' ').trim().slice(0, 160)} (p. ${page.page}, as the sheet states it)`;
  let named = null;
  for (const page of text.pages) {
    for (const line of page.lines) {
      const words = String(line.text ?? '');
      if (!FILLER_NAMED.test(words) || A_NAVIGATION_PATH.test(words)) continue;
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
// A version marker is not a flammability class. Jamg He footers its sheet "2023/11/3 REV：V1.1
// Http://www.jamghe.com", and "V1.1" read as UL 94 V-1 put that footer in the grade's Certification claims.
// A class is V-0, V-1 or V-2 and nothing follows the digit; a version has a point and another number behind it,
// and the word that introduces it in front.
const A_VERSION_OR_LINK = /\b(rev(ision)?|ver(sion)?)\b|https?:\/\/|www\./i;

export function certification(text) {
  for (const page of text.pages) {
    for (const line of page.lines) {
      if (A_VERSION_OR_LINK.test(line.text) && !/\bUL\s?-?94\b|food contact|REACH|RoHS/i.test(line.text)) continue;
      if (/\bUL\s?-?94\b|\bV-?[012]\b(?![.\d])|\bHB\b|food contact|REACH|RoHS/i.test(line.text) && /\d|HB|V-?[012]/i.test(line.text)) {
        return `${line.text.replace(/\s+/g, ' ').trim().slice(0, 160)} (p. ${page.page}, as printed; a typical value, not a certificate: verify grade, thickness and certificate)`;
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
  // A cell that is only its own unit states no setting. Siraya Tech's Flex TPU Air prints "(°C)" where the
  // nozzle temperature belongs, and recorded as the raw text it reached the build as a temperature the parser
  // could not read (PARSE-UNREAD). Only the unit is dropped: "Room temperature", "Recommended" and "not
  // required" are settings a sheet states in words, and thirty-one profiles already carry them.
  const ONLY_ITS_UNIT = /^[\s()\[\]{}:°º˚CF/-]*$/i;
  const named = settings.filter((s) => s.field !== 'note' && !ONLY_ITS_UNIT.test(String(s.raw ?? '')));
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
    // A note keeps the sheet's own words, and a full-width glyph is a spelling of an ASCII one rather than a
    // word: "＜300mm/s" is "<300mm/s", and TEXT-FULLWIDTH refuses the first.
    notes: notes.map((n) => ({ Topic: n.topic, Text: asciiPunctuation(n.raw) })),
    editorial: abrasive && !affirms ? ['Abrasion / clogging'] : [],
    evidence: { page: (named[0] ?? notes[0]).page, text: (named[0] ?? notes[0]).line.slice(0, 200) },
    review: { status: 'proposed' },
  };
}

/** One measurement row, filled the way the schema requires: raw text as printed, typed columns beside it. */
export function measurementRow(v, { sourceId, materialId, gradeId, window = {} }) {
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
  // A load in brackets behind the value is a condition of the test as much as a word is: QIDI prints
  // "热变形温度 ISO 75:Method A 83°C (1.8MPa)" and "Determination of temperature 93°C (0.45MPa)", and without
  // the bracket both heat deflections stated no load at all and could screen no heat requirement (D65).
  const A_LOAD = /\d+(?:[.,]\d+)?\s*(?:MPa|MN\s?\/\s?m|N\s?\/\s?mm|psi|kgf?\s?\/\s?cm)/i;
  // What follows the value is the test's condition where it states a load or names a method: without it NonOilen's
  // heat deflection "119 °C ISO 75 0.45 MPa" stated no load, and its Vicat "150 °C ISO 306 method A, 10 N" no method.
  const trailing = String(v.read?.trailing ?? '');
  const tail = A_LOAD.test(trailing) || /\bmethod\s+[A-C]\d{0,3}\b/i.test(trailing) ? trailing : '';
  const printed = [String(v.condition ?? ''), /anneal|as printed|dry|conditioned|moist|wet|flat|edge|upright/i.test(after) || A_LOAD.test(after) ? after : '', tail, v.block ?? ''].filter(Boolean).join(' ');
  // A designation's own digits do not begin the condition. A table that prints its method before its unit runs
  // them together — "Flexural modulus (E-Modulus) ASTM D790 MPa" — and a cut at the first digit made the
  // condition "790 MPa", which the load pattern then read as a test load of 790 MPa the sheet never printed.
  // The axis the row states, and the label in the maker's own language before it, are not the condition either:
  // they stand in front of the property's own name, so a cut at the first bracket of "(X-Y) Tensile Strength ISO
  // 527/2 50 mm/min" made the whole row its own condition and wrote the property's name into the method column.
  // The axis has a column of its own (Direction), which is read from the label.
  const withoutAxis = labelHeads(printed).at(-1);
  // A unit's own exponent is not a condition. A table that prints its unit before its value leaves "g/cm3" in
  // the row's words, and the 3 of it was the first digit outside a standard's span, so sixty density rows took
  // "3" for the condition they were measured under and recorded "3 ISO 1183" as their method. The unit is known:
  // it is masked with the standards, and what follows it is read as before.
  const unit = String(v.read.printedUnit ?? '').trim();
  const unitSpans = unit ? [...withoutAxis.matchAll(new RegExp(unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'))].map((m) => [m.index, m.index + m[0].length]) : [];
  const spans = [...[...withoutAxis.matchAll(new RegExp(STANDARD_RE.source, 'gi'))].map((m) => [m.index, m.index + m[0].length]), ...unitSpans];
  // A thermal method is where the method column begins. "Melting temperature DSC, 10°C/min 150 °C" was cut at
  // the comma after DSC, so the method the sheet names was left behind with the label and the row recorded no
  // method at all — thirty-seven rows of Polymaker's and 3DXTECH's thermal tables, on sheets that name DSC or
  // TGA and nothing else. `readStandards` has recorded DSC as a method since the build was written; the reader
  // has to hand it the word.
  const method = /\b(?:DSC|TGA|DMTA|DMA|TMA)\b/i.exec(withoutAxis);
  const firstNumber = [...withoutAxis.matchAll(/[,(@]|\d/g)].map((m) => m.index)
    .find((i) => !spans.some(([from, to]) => i >= from && i < to)) ?? -1;
  const at0 = method && (firstNumber < 0 || method.index < firstNumber) ? method.index : firstNumber;
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
    // The unit column has a column of its own too. A table that prints its unit before its value leaves it among
    // the row's words — at the end ("23℃ g/cm3"), or between the method and a label fragment ("DSC °C Tg") —
    // and keeping it wrote the unit twice.
    .replace(new RegExp(`\\s*${String(v.read.printedUnit ?? '\u0000').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[${BOUNDS}]?`, 'g'), ' ')
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
  // A row that names no standard of its own takes the one its block heading names: "Flexural Properties: ASTM
  // D790, Procedure A" is the sheet stating the method for every row under it.
  // ISO 75 names its methods by the load: HDT A is 1.80 MPa, B 0.45, C 8.0 (D65). A sheet that prints the letter in
  // the property's own label — Spectrum's "Heat distortion temperature (HDT A)", LEHVOSS's "HDT A ISO 75", Extrudr's
  // "HDT/B" — has stated the load, and the letter goes with the method, where the load parser reads it.
  const hdtMethod = v.property === 'HDT' && !load ? /\bHDT\s*[/-]?\s*\(?\s*([ABC])\b(?![/.])/.exec(String(v.label ?? '') + ' ' + String(v.line ?? '')) : null;
  const named = [...new Set([load ? load[1].replace(/\s+/g, ' ').trim() : null, hdtMethod ? `HDT ${hdtMethod[1]}` : null, leftover || null,
    ...(v.read.standards.length ? v.read.standards
      : v.mergedStandards ? [v.mergedStandards]
        : (v.familyStandards ? [v.familyStandards] : []))].filter(Boolean))];
  const standardText = named.join(' ').trim();
  const standards = readStandards(standardText);
  // What the row says was done to the specimen before it was tested, and how wet it was, in the sheet's own
  // words; the state beside each is what the build's own reader makes of those words (D49). A sheet that says
  // "HDT 0.45 MN/m2, annealed" publishes an annealed value, and a row that does not say so reads as as-printed.
  // What the row says about the specimen is its own words and the footnote its mark points at, together.
  const says = [printed, v.label ?? '', v.footnote ?? ''].filter(Boolean).join(' ');
  // The axis may also stand in brackets after the property: iSANMATE's CF PEEK prints "Flexural Strength [Z]".
  const labelAxis = /\bxy\b/i.test(says) ? 'XY' : /\bz[ -]?axis\b|\b(?:strength|modulus|break|yield|elongation)\s*[[(（]?\s*z\s*[\])）]?(?![a-z])/i.test(says) ? 'Z' : null;
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
  // Where the sheet names the schedule beside the word, the schedule is part of what that row says was done to
  // the specimen, and the raw column keeps the row's own words: Spectrum prints "annealed (4h @ 90°C)", and a
  // row that kept only "annealed" left Anneal °C and Anneal h with nothing to be read from.
  const SCHEDULE = String.raw`\s*\(?\s*\d+(?:[.,]\d+)?\s*h(?:ours?)?\s*@\s*\d+(?:[.,]\d+)?\s*[°º˚]?\s*C\s*\)?`;
  const annealWords = new RegExp(String.raw`\b(not annealed|unannealed|annealed(?:${SCHEDULE})?|as printed|sintered|heat[- ]treated|tempered)`, 'i').exec(says);
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
  // A number the row has already recorded as its test load is not also its test temperature. 3DXTECH splits the
  // label across two lines — "Deflection Temperature at 0.45" above "ISO 75 °C 185" — and the °C of the unit
  // column stood next to the load, so thirty heat deflections were recorded as tested at 0.45 °C, which is a
  // laboratory nobody has.
  const asTemperature = /(-?\d+(?:[.,]\d+)?)\s*(?:[°º˚]\s*C|℃)/i.exec(withoutRate.replace(new RegExp(STANDARD_RE.source, 'gi'), ' '));
  // The load the row is judged to have been tested under is the one the typed column keeps, whether the sheet
  // wrote its unit or left it to the heading; the same number cannot also be a temperature.
  const hdtLoad = v.property === 'HDT' ? loadCellFromParsed(parseHdtStandard(asciiPunctuation(standardText))) : null;
  const at = asTemperature && hdtLoad && NUMBER(asTemperature[1]) === NUMBER(hdtLoad) ? null : asTemperature;
  let rawNumeric = v.read.rawNumber;
  let raw = v.read.raw;
  let normalized = round(NUMBER(rawNumeric) * v.target.factor);
  // "24.000 kg/cm2" is twenty-four thousand on a European sheet and twenty-four on an American one. Where one
  // reading is a value this property could have and the other is not, the sheet has answered: a flexural modulus
  // of 24 kg/cm² is 2.4 MPa, which no solid polymer reaches, and 24,000 kg/cm² is 2,353 MPa, which is a
  // polycarbonate's. Where both readings are possible, it stays a question for a person.
  let ambiguity = v.read.ambiguous;
  if (ambiguity) {
    // "24.000" is twenty-four thousand on a European sheet and twenty-four on an American one, and "1,320" is
    // one and a third on the first and one thousand three hundred and twenty on the second. Which way the
    // reading is out depends on which way the build's own reader took the separator, so both are tried: the
    // thousand above and the thousand below. Extrudr prints "Material density 1,320 g/cm3", which is 1320
    // kg/m³ and not 1 320 000.
    const of = { ...window, condition: ['Notched', 'Unnotched'].includes(v.notch) ? v.notch : 'any' };
    const mineOk = couldBe(v.property, v.target.unit, normalized, of);
    const scaled = [1000, 0.001].map((by) => ({ by, value: round(NUMBER(rawNumeric) * by * v.target.factor) }))
      .find(({ value }) => couldBe(v.property, v.target.unit, value, of));
    const other = scaled?.value ?? round(NUMBER(rawNumeric) * 1000 * v.target.factor);
    const otherOk = Boolean(scaled);
    v.ambiguityResolved = (mineOk && !otherOk) || (!mineOk && otherOk);
    if (!mineOk && otherOk) {
      const was = round(NUMBER(v.read.rawNumber) * v.target.factor);
      // The raw cell records the number and what the sheet printed, which is the register's own convention for
      // this reading (V000731, the same product's flexural modulus).
      const printed = /^[-\d.,\s]+/.exec(v.read.raw)?.[0]?.trim() ?? v.read.rawNumber;
      // The other reading is the same digits with the separator read the other way, so it is taken from the
      // token the sheet printed rather than by multiplying: "52,977" read as a decimal comma is 52.977, and
      // 52977 x 0.001 is 52.977000000000004, which is not a number printed on any page and the applier says so.
      const other0 = scaled.by === 0.001 ? printed.replace(/\s/g, '').replace(/[.,](?=\d+$)/, '.')
        : scaled.by === 1000 ? printed.replace(/[.,\s]/g, '') : null;
      rawNumeric = other0 != null && Number.isFinite(Number(other0)) ? other0 : String(NUMBER(rawNumeric) * scaled.by);
      normalized = other;
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
    // ASTM D882 is the tensile test for thin plastic sheeting, and a value measured by it is a film's: FormFutura
    // prints NatureWorks' resin data, "Tensile strength 110 Mpa (MD) ASTM D882", machine direction and all. Read as
    // an unstated specimen it is a PLA bar at 110 MPa; 81 tensile rows from 25 sources entered that way (m109).
    'Specimen type': /\bD\s?-?\s?882\b/i.test(standardText) && /^(Tensile|Elongation)/.test(v.property) ? 'Film specimen (ASTM D882); not a printed or moulded bar'
      // LEHVOSS names its bars by the standard that moulds them: "MPTS ISO 3167 A" is ISO's injection-moulded
      // multipurpose test specimen, and "molded sample" says the same in words.
      : /injection mou?ld|\bmou?lded (?:sample|specimen|bar|test)|\bMPTS\b|\bISO\s?3167\b/i.test(says) ? 'Raw material value'
      : /\b3d print|printed (specimen|bar|part)/i.test(says) ? 'Printed specimen'
      // The block the row stands in, before anything the sheet says about its specimens as a whole: a sheet that
      // heads one table "3D Printed" and the next "Injection molded" has said which bars each table describes.
      : v.specimen === 'moulded' ? 'Raw material value'
      : v.specimen === 'printed' || v.printedSpecimens ? 'Printed specimen'
      : v.property === 'Density' ? 'Not published (density specimen form not explicitly established)' : 'Not published (do not assume printed)',
    // A row may name its own direction, and then it is the row's whatever the property usually is: Polymaker
    // prints "Tensile strength (X-Y)" and "Tensile strength (Z)" as two rows of one table.
    // A table that heads a value column with an orientation has stated the direction of every value in it, as
    // plainly as a row that prints the axis in its own label; what it cannot state is a direction for a property
    // that has none, so a density or a heat deflection under such a header keeps its Not applicable.
    // CreatBot prints the axis as the label's last word — "Tensile strength XY", "Tensile strength Z", "Impact
    // strength Z" — and a Z that stands alone after the property is as plain as "Z axis". An impact bar printed
    // flat or on edge has a direction too, and the label that states it outranks the lexicon's default for the
    // property (Not applicable), which is for a sheet that says nothing.
    Direction: stated ?? (v.column && v.direction !== 'Not applicable' ? (/\//.test(v.column) ? 'Stated, not a usable direction' : v.column) : null)
      ?? (labelAxis && v.direction === 'Not applicable' && /impact|charpy|izod/i.test(v.property) ? labelAxis : null)
      ?? v.direction ?? labelAxis ?? (v.orientation ? v.orientation.toUpperCase() : 'Unstated'),
    'Moisture condition': moisture, 'Moisture state': moistureState ?? 'not-stated',
    'Post-processing': post, 'Post-processing state': postState ?? 'not-stated',
    'Anneal °C': postState === 'annealed' ? (schedule?.tempC == null ? NP : String(schedule.tempC)) : NA,
    'Anneal h': postState === 'annealed' ? (schedule?.hours == null ? NP : String(schedule.hours)) : NA,
    'Test temperature': at ? `${at[1].replace(',', '.')}°C` : NP,
    'Standard / load': asciiPunctuation(standardText) || NP, Standards: standards.length ? standards.join('; ') : NP,
    'Test load MPa': v.property === 'HDT' ? loadCellFromParsed(parseHdtStandard(standardText)) : NA,
    Notch: v.notch || NA,
    // The conditions the table this row stands in was measured under, where its heading names them.
    // A property that has no direction may still be printed per orientation column: Stratasys measures HDT on
    // bars printed flat and on edge and heads the two columns XY and XZ. The row cannot take a direction (the
    // property has none), so the column it came from goes into the parameters instead, which is what keeps the
    // two rows apart (MEAS-CONDITIONS-INDISTINCT) without giving a heat deflection a direction it cannot have.
    'Specimen / print parameters': [v.parameters ? asciiPunctuation(v.parameters) : null,
      v.column && v.direction === 'Not applicable' ? `${v.column} column` : null].filter(Boolean).join(' \u00b7 ') || NP,
    SourceID: sourceId, Locator: `p. ${v.page}: ${String(v.label).replace(/\s+/g, ' ').trim()}`,
    Notes: [v.methodNote, notchNote, ambiguity, v.column && /\//.test(v.column) ? `the sheet heads this column ${v.column}: one value for both orientations` : null].filter(Boolean).join('; ') || NA, 'Parse review': NA,
  };
}

/**
 * A source identifier in the register's own convention. A publisher that already has sources keeps its prefix
 * rather than gaining a second one (sources.schema.json says so), and the rest of the identifier is the
 * document's own file name, which is what the existing Spectrum and Polymaker identifiers are.
 */
/**
 * A maker's name as schema/vocab/manufacturers.csv spells it. The ledger keeps the name the research workbook
 * gave, which is a brand line as often as a maker ("Polymaker (Fiberon)"), and the vocabulary's Aliases column is
 * where the two are reconciled (m50). A grade whose Manufacturer is an alias is refused at the gate.
 */
export function canonicalManufacturer(name, world = {}) {
  const wanted = String(name ?? '').trim().toLowerCase();
  if (!wanted) return name;
  for (const row of world.manufacturers ?? []) {
    if (String(row.Value).toLowerCase() === wanted) return row.Value;
    if (String(row.Aliases ?? '').split(';').some((a) => a.trim().toLowerCase() === wanted)) return row.Value;
  }
  return name;
}

/**
 * Who made a filament a shop sells (R074).
 *
 * The owner's ruling: the shop is the manufacturer where the product name carries the shop's own brand, and
 * otherwise it is the maker the sheet or the URL names; what neither names stays held. So this never guesses
 * from the shop's name, which is what made it a ruling — a grade whose Manufacturer is the shop says the shop
 * made the filament, and 3DJake hosts Anycubic's and Nobufil's sheets beside its own 3DJAKE range.
 *
 * Three witnesses, in the order of how directly each is the maker speaking:
 *
 *   1. the ledger's own brand, where the inventory recorded one and the URL or the sheet corroborates it
 *   2. a domain the sheet prints — bedrock3d.com on Bedrock's sheet, ensingerplastics.com on Ensinger's; a
 *      technical data sheet printing a domain is the maker naming itself, and it is the same witness whichever
 *      shop is hosting it
 *   3. nothing, and the document stays held, which is the third thing the ruling says to do
 *
 * A shop's own brand answers at step 1 like any other: `manufacturers.csv` lists 3DJAKE under 3DJake and PRO
 * Series under MatterHackers, so a sheet the inventory marked with the shop's brand resolves to the shop.
 */
// A domain a sheet prints that names nobody: the standards bodies it cites, the platforms it is shared on, the
// slicers its printing table names. Left in, Prusa's sheets would be made by printables.com. A shop's own domain
// is not here, because a shop that prints its domain on its own brand's sheet is a maker like any other.
const NOT_A_MAKER = /^(iso|astm|din|en-standard|amazon|ebay|aliexpress|youtube|facebook|instagram|linkedin|twitter|google|shopify|wordpress|adobe|microsoft|apple|github|prusaprinters|printables|thingiverse|simplify3d|cura|orcaslicer)\./i;

/**
 * A domain the sheet prints, as the maker naming itself. A technical data sheet carries its maker's site in the
 * header or the footer and usually in both, so the most-printed domain is the one making the claim; a domain
 * that appears once is as likely to be a sentence the extractor ran together ("conditions. Der" reads as
 * conditions.de) and only wins where nothing else is there.
 *
 * The trailing boundary a domain would normally need is not required, because some sheets arrive with every
 * line printed twice over itself — "xeniamaterials.comxeniamaterials.com" is one line of one — and requiring it
 * threw the maker away on exactly the sheets that name it six times.
 */
export function makerFromSheet(text) {
  const seen = new Map();
  for (const page of text?.pages ?? []) {
    for (const line of page.lines ?? []) {
      for (const [, domain] of String(line.text ?? '').matchAll(/(?:^|[\s(:/])(?:www\.)?([a-z0-9][a-z0-9-]{2,}\.(?:com|net|org|eu|de|nl|it|es|fr|pl|cz|co\.uk|tech|io|cn))/gi)) {
        const clean = String(domain).toLowerCase();
        if (NOT_A_MAKER.test(clean)) continue;
        seen.set(clean, (seen.get(clean) ?? 0) + 1);
      }
    }
  }
  if (!seen.size) return null;
  const [domain] = [...seen].sort((a, b) => b[1] - a[1])[0];
  return { name: domain.replace(/\.(co\.uk|[a-z]+)$/i, ''), domain };
}

/** A name a squashed comparison can use: lower case, letters and digits only. "3DJake / 3DJAKE" -> "3djake3djake". */
const squash = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/** The path of a document's own URL and of the page that linked to it, squashed: the shop's claim about it. */
const urlPath = (row) => [row.source_page_url, row.url].filter(Boolean)
  .map((u) => { try { return squash(new URL(u).pathname); } catch { return ''; } }).join(' ');

/**
 * Who made a filament a shop sells (R074).
 *
 * The owner's ruling: the shop is the manufacturer where the product name carries the shop's own brand, and
 * otherwise it is the maker the sheet or the URL names; what neither names stays held. So this never guesses
 * from the shop's name, which is what made it a ruling — a grade whose Manufacturer is the shop says the shop
 * made the filament, and 3DJake hosts Anycubic's and Nobufil's sheets beside its own 3DJAKE range.
 *
 * Four witnesses, in the order of how directly each is the maker speaking. Each is a thing a page says, never a
 * thing the pipeline infers from a shop's catalogue:
 *
 *   1. the ledger's own brand, where the URL or the sheet corroborates it. The corroboration is what keeps a CDN
 *      out: "3d.nice-cdn.com" put "nice" in one row's brand column, and it names no maker
 *   2. a manufacturer `manufacturers.csv` already knows, named in the URL the shop serves the sheet at —
 *      "/4734-biofil-pcl-formfutura.html" is Filament2Print saying whose filament it is
 *   3. a domain the sheet prints
 *   4. nothing, and the document stays held, which is the third thing the ruling says to do
 *
 * A shop answers at any of these like any other maker: `manufacturers.csv` lists 3DJAKE under 3DJake and F2P
 * under Filament2Print, so a sheet whose brand or URL is the shop's own resolves to the shop, which is the
 * ruling's first clause.
 */
export function makerOfRecord(row, text, world = {}) {
  if (row.manufacturer) return { maker: canonicalManufacturer(row.manufacturer, world), why: 'the inventory recorded the maker' };
  if (row.provider_kind !== 'retailer') return { maker: canonicalManufacturer(row.provider, world), why: "the sheet is the maker's own" };

  const shop = canonicalManufacturer(row.provider, world);
  const said = (maker, why) => ({ maker, why: squash(maker) === squash(shop) ? `the product is ${shop}'s own brand: ${why}` : why });
  const path = urlPath(row);

  const brand = canonicalManufacturer(row.brand, world);
  if (brand && squash(brand).length > 2) {
    if (squash(brand) === squash(shop)) return said(shop, 'the inventory recorded it');
    if (path.includes(squash(brand))) return said(brand, `${brand} is the maker the product's own page names`);
    const printed = squash((text?.pages ?? []).flatMap((p) => (p.lines ?? []).map((l) => l.text)).join(' '));
    if (printed.includes(squash(brand))) return said(brand, `${brand} is the maker the sheet names`);
  }

  // The longest manufacturer the URL names, so "Filament2Print" is not read as "F2P" where both would match.
  const named = (world.manufacturers ?? [])
    .flatMap((m) => [m.Value, ...String(m.Aliases ?? '').split(';')].filter(Boolean).map((a) => ({ value: m.Value, key: squash(a) })))
    .filter((m) => m.key.length > 3 && path.includes(m.key))
    .sort((a, b) => b.key.length - a.key.length)[0];
  if (named) return said(named.value, `${named.value} is the maker the URL names`);

  const fromSheet = makerFromSheet(text);
  if (fromSheet) return said(canonicalManufacturer(fromSheet.name, world), `the sheet prints ${fromSheet.domain}, which is the maker naming itself`);
  return null;
}

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
  // Where the file name names nothing, the product does: a retailer serving Fillamentum's ASA CF10 Carbon sheet
  // through a script gave the identifier R-FILLAMENTUM-index-php-controller-attachment-id-attachment-3120,
  // which says what the server does and nothing about the document. An identifier is never reused and never
  // changed, so it is worth deriving from the one thing on the page that is about the sheet. The query and the
  // digest stay the fallback for a document that arrives without a product name.
  const fromProduct = (row.product_raw || '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const file = generic ? (fromProduct || [plain, query || String(row.sha256 ?? '').slice(0, 8)].filter(Boolean).join('-')).slice(0, 60) : plain;
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
const FULLWIDTH = { '（': '(', '）': ')', '［': '[', '］': ']', '：': ':', '；': ';', '，': ',', '％': '%', '－': '-', '＋': '+', '／': '/', '＜': '<', '＞': '>', '≦': '\u2264', '≧': '\u2265', '　': ' ' };
export const asciiPunctuation = (text) => String(text ?? '').replace(/[（）［］：；，％－＋／＜＞≦≧　]/g, (c) => FULLWIDTH[c] ?? c);

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

// A sheet that puts its product and the words that announce the sheet on one line has still named its product:
// SIDDAMENT heads twenty-one of its sheets "ABS Carbon Fiber - Technical Datasheet", and a rule that rejected
// any line ending in "datasheet" rejected all twenty-one, leaving the reader to take a sentence out of the
// Precautions paragraph below. The announcement comes off; what is left is the name, or nothing.
export const withoutAnnouncement = (line) => String(line ?? '')
  .replace(new RegExp(`[\\s\u2013\u2014\\-\u2010:|/]*\\(?(?:${ANNOUNCES.source}|tds|pds)\\)?\\s*$`, 'i'), '')
  .trim();

export function productName(printed, maker = '') {
  let name = withoutAnnouncement(printed)
    .replace(/[™®©]/g, '')
    // A trademark sign the extractor rendered as letters, hard against the word it marks: "FABRIALTM-R" is
    // Fabrial R. Only after a word of four letters or more, and only where the name goes on without them.
    .replace(/(?<=[A-Za-z]{4})TM\b/g, '')
    .replace(/\s*\[[^\]]*\]\s*/g, ' ')
    // A revision is the document's, not the product's: Yousu heads every sheet "PLA 3D FILMAENT Revision Date:
    // 18/12/2020", and six grades carried the date in their name.
    .replace(/\s*\b(?:latest\s+)?(?:revision|update[ds]?|issue|release)(?:\s*date)?\s*[:：].*$/i, '')
    // Yousu spells the category word "FILMAENT", which is the category word all the same.
    .replace(/\b3d\s*(print(ing|er)?\s*)?fil(?:a?ment|maent)\b/gi, '')
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
  // A title set letter by letter is not a name. Polymaker's Fiberon library prints "T E C H N I C A L  D A T A
  // S H E E T" across the head of every sheet, and the words that announce a data sheet are not read through the
  // spacing, so eight of its products were called "D A T A S H E E T". What a maker calls the product is in the
  // ledger the document arrived in, which is where the name comes from when the page gives none.
  if (/(?:\b[A-Za-z]\s+){4,}[A-Za-z]\b/.test(text)) return true;
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
// The heading of a column of the property table is not a name. Fillamentum sets "Physical properties | Typical
// Value | Test Method | Test Condition" across the head of each of its tables, and its NonOilen and PETG sheets
// were proposed as products called "Test Condition" — a heading that stands alone once the page beside the table
// is off, and that sits higher than the product's own name does.
const NOT_A_PRODUCT = /propert|standard\s+unit|typical value|test\s+(condition|method)|^description\b|^rev(ision)?\b|^version\b|^page\b|data ?sheet$|^(iso|astm|din|iec|en|ul|gb\s?\/?\s?t)$/i;
// The words that announce a sheet are not a name whatever is stuck to the end of them, and what a maker sticks
// there is which printing of the sheet this is: "Technical Data Sheet Rev. 1", "Technical Data Sheet 04.24",
// "Filament Technical Data Sheet V1.0". Read as names, those made twenty-three products across four makers —
// nine of Protopasta's called after a revision number, four of Kingroon's after a version.
//
// `data ?sheet$` above catches the announcement on its own; this catches it with the printing's mark behind it,
// and only where nothing else is left. A sheet that announces itself and then names its product on the same
// line ("Technical Data Sheet: CarbonX Carbon Fiber ezPC") keeps the name, which is what withoutAnnouncement is
// for and why this asks what remains rather than what the line starts with.
const A_PRINTING_OF_THE_SHEET = /[\s\u2013\u2014\-\u2010:|/.,()]*(?:rev(?:ision)?\.?\s*\.?\s*\d|v(?:er(?:sion)?)?\.?\s*\d|\d{1,2}[./-]\d{2,4}|\d{4})[\s\d.,v]*$/i;
// A version, a date, a trademark sign left on a line of its own or half of the words that announce the sheet
// is not a name either. Polymaker sets "TECHNICAL" and "DATA SHEET" on two lines with "V6.0" under them.
const NOT_A_PRODUCT_EITHER = /^date\b|^[\d\s.,]+$|^(draft|preliminary|provisional|confidential|general|g(é|e)n(é|e)ral|generale|allgemein|description|beschreibung|descrizione)(\s+(information(en)?|informazioni))?$|^(g(é|e)n(é|e)ralit(é|e)s|generalit(à|a)|generalidades)$|^(general information|allgemeine informationen|informazioni generali)$|^v?\d+(?:[.,]\d+)*$|^version\s*\d|^(tm|r|technical|technisch|data|material|materials|fdm|fff|sla|3d|p)$|^\d{2,3}\s?[ad]$|^\(?(tds|pds|sds|msds|tdb)\)?$|^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$|^technical specifications?$|^(product|trade|article|item)\s*(name|designation)\s*[:：]?$|^produkt(name)?$|^handelsname$|^\u4ea7\u54c1\u540d\u79f0$|^\d{1,2}[.)]\s|@|^\+?\d[\d\s()\/-]{6,}$|\bcall us\b|^(back|home|menu|cart|search|store|shop|boutique|login|account|contact|next|previous|skip to content)$/i;
// A sheet that labels its product says so plainly, and that beats any guess from where a line sits. The label
// may stand after the same label in the maker's own language ("产品名称 Product Name:PLA+丝绸 2.0"), and a
// maker may call it the trade name: Fiberlogy prints "TRADE NAME: Fiberlogy FiberSilk" on all forty of its
// sheets, which is the name, while the line above it is the maker's own heading in capitals.
const PRODUCT_LABEL = /(?:product\s*name|trade\s*name|produkt(?:name)?|handelsname|产品名称|nom\s+du\s+produit|nome\s+commerciale)\s*[:：]\s*(.+)$/i;
/** The same label with nothing after it: the name is on the next line. */
const A_BARE_LABEL = new RegExp(PRODUCT_LABEL.source.replace(/\\s\*\[:：\]\\s\*\(\.\+\)\$$/, '\\s*[:：]?\\s*$'), 'i');

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
 * A line that names no product: the announcement, a heading, a label with nothing after it, a printing's mark.
 *
 * The maker's name comes off before what is left is weighed, because a maker puts its own name in front of the
 * announcement as readily as in front of a product: "KINGROON Filament Technical Data Sheet V1.0" is the sheet
 * announcing itself and nothing else, and four Kingroon products were called it.
 */
export const notAProduct = (line, maker = '') => {
  const text = String(line ?? '').trim();
  if (NOT_A_PRODUCT.test(text) || NOT_A_PRODUCT_EITHER.test(text)) return true;
  const rest = withoutAnnouncement(text.replace(A_PRINTING_OF_THE_SHEET, ''));
  if (rest === text) return false;
  return !productName(rest, maker).replace(/^(3d\s*print(ing|er)?|filament|technical|material)\b/i, '').trim();
};

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
  // A row of the table is not a name. Three Fillamentum sheets print no product name at the head of the page at
  // all — the name is in the prose beside the table ("Filament made of NonOilen® material") — and with the
  // column headings ruled out the reader took the first row under them: products called "Test Condition" and
  // then "Material density 1.27 g/cm ASTM D792". A sheet that does not print its product's name is a sheet the
  // name has to be settled for, which is a ruling; it is not a reason to read a measurement as one.
  // Three tests, and each of them is a thing a name is not. A name states no measurement, in whatever unit; it
  // names no property the lexicon knows; and it cites no standard, because a designation belongs to a test and
  // not to a product. The superscript of a unit is joined to it in the page's rows and not in its raw lines, so
  // "1.20 g/cm³ ISO 1183" arrives here as "1.20 g/cm" and it is the designation beside it that gives it away.
  const STATES_A_MEASUREMENT = new RegExp(`\\d\\s*(?:${UNIT_PATTERN})(?:\\b|$)`, 'i');
  // And a name is not a sentence. Fillamentum's Fluorodur sheet prints no name at the head of the page and its
  // description begins "Fluorodur is made of a very durable"; Polymaker's Fiberon sheets set their title letter
  // by letter and follow it with "PPS-CF10 is a carbon fiber reinforced PPS". What a name never has is a verb
  // saying what the product does, and that is the test, because counting words cannot tell either of those from
  // "CarbonX Carbon Fiber High Temp Nylon (HTN)", which is a name of seven. The word count stays as a backstop
  // for a sentence with no verb in it, and it is set where no product name reaches.
  const SENTENCE_WORDS = 10;
  // A full stop between two words is a sentence boundary, and a product name has none. Filament2Print heads its
  // sheets with the shop's own copy — "Our Hardest Flexible Filament. Rigid and Flexible.", "Flexible. Fast &
  // Easy Printing. Get started with" — which has no verb this reader knows and fewer words than a sentence is
  // counted at, and so arrived as three products. A full stop inside a name is inside a number or a version
  // ("1.75 mm", "V5.1"), never between two words.
  const SEVERAL_SENTENCES = /[a-z][.!?]\s+[A-Z]/;
  // A sheet's own sections are not its product: Nanovia heads every one of its twenty-three with "Distribution"
  // and Filament2Print prints "Print parameters" above its table. And a revision line is not a name however it
  // begins: QIDI prints "Data / Revised: 01.2024 Version No: 5.1" where its product's name should be.
  const A_SECTION_OF_A_SHEET = /^(distribution|vertrieb|precautions?|print(ing)? parameters?|material status( mass production)?|mass production|thermoplastic specialties|specialties|properties|applications?|typical applications?|product description|features|packaging|storage|news|nouveaut(e|\u00e9)s|profile|colou?rs?|panier|project data|technical data|shop all\s.*|all filaments)\b[\s:.]*$/i;
  // A captured web page begins with the shop's navigation, which is a column of one-word links and not the page's
  // subject: Nanovia's twenty-three pages open "Store / Distribution / News / Contact / Profile / Cart", and read
  // from the head of the page all twenty-three were products called Distribution, then News. What such a page
  // does say plainly is its breadcrumb, and the last step of a breadcrumb is the page itself.
  const BREADCRUMB = /^\s*(?:home|accueil|start(?:seite)?|inicio)\s*(?:\/|\u203a|>|\u00bb)\s*(.+)$/i;
  const breadcrumb = (line) => {
    const trail = BREADCRUMB.exec(String(line))?.[1];
    if (!trail) return null;
    // The page's own step is the last, and what follows a colon in it is the maker's description of the product
    // ("Nanovia ABS AF : Aramid fiber reinforced"), not part of its name.
    const last = trail.split(/\s*(?:\/|\u203a|>|\u00bb)\s*/).filter(Boolean).at(-1) ?? '';
    return last.split(/\s*[:\u2013\u2014|]\s*/)[0].trim();
  };
  // Kingroon prints "Update Date: 2025/12/1" between its announcement and its name, and four products were called
  // it. Only a line that begins with the date is the date: Yousu runs its revision date onto its product's own line
  // ("PLA 3D FILMAENT Revision Date: 18/12/2020"), and that line is still the name.
  const A_REVISION_LINE = /\brevised\s*[:.]|\bversion\s*(no|nr|number)\b|^\s*(update[ds]?|revision|issue|release)\s*date\s*[:：]/i;
  // A page that sets its head letter by letter leaves fragments of it behind: the Fiberon sheets print "T M"
  // under their letter-spaced title, which is the trademark sign. What a word is, is what its letters spell.
  const named = (raw) => {
    // The words that announce the sheet are not part of what they announce, and every test below is about what
    // the line names rather than about what it calls itself.
    const line = withoutAnnouncement(raw);
    if (!line) return false;
    const letters = String(line).replace(/\s+/g, '');
    if (notAProduct(line, maker) || NOT_A_PRODUCT_EITHER.test(letters) || looksDamaged(line)) return false;
    if (STATES_A_MEASUREMENT.test(line) || labelFor(String(line).trim())) return false;
    if (new RegExp(STANDARD_RE.source, 'i').test(String(line))) return false;
    if (SAYS_SOMETHING.test(String(line)) || SEVERAL_SENTENCES.test(String(line))) return false;
    if (A_SECTION_OF_A_SHEET.test(String(line).trim()) || A_REVISION_LINE.test(String(line))) return false;
    // A name does not end in a sentence's full stop: SIDDAMENT's page leaves "chopped fibers." where a title
    // should be, and a maker's abbreviation ("Co.", "Ltd.", "No.") is not a lowercase word of four letters.
    if (/[a-z]{4,}\.\s*$/.test(String(line))) return false;
    // A single letter and a space is what is left of a word the page cut: "s (TDS) on product pages".
    if (/^[a-z]\s/.test(String(line))) return false;
    // A web address is where the sheet came from, not what it is: eight QIDI sheets print "www.qidi3d.com"
    // where a title would be, and eight products were called that.
    if (/^(?:https?:\/\/|www\.)|^[a-z0-9-]+\.(?:com|net|org|tech|de|fr|cn|eu|ca|io)\b/i.test(String(line).trim())) return false;
    // A title the page printed twice, overlapped: "XECARBXECARB PA12-CF-STPA12-CF-ST" is one title whose every
    // word arrived doubled, and what the sheet calls the product is not a word repeated to itself.
    if (/\b(\w{3,})\1\b/i.test(String(line).replace(/\s+/g, ' '))) return false;
    if (!/\d/.test(String(line)) && (String(line).match(/[A-Za-z]{2,}/g) ?? []).length >= SENTENCE_WORDS) return false;
    const name = productName(line, maker);
    return Boolean(name) && name.length < NAME_LENGTH;
  };
  // A label whose value is on the line below it, which is where Anycubic puts it: "Product Name:" and then
  // "Anycubic ABS" under it. The label is read wherever its value stands, because a label with nothing after it
  // is not a name — read as one it called nine products "Product Name:".
  const labelled = lines.slice(0, 14)
    .map((l, i) => {
      const said = PRODUCT_LABEL.exec(l)?.[1];
      if (said) return said;
      return A_BARE_LABEL.test(l) ? lines[i + 1] : breadcrumb(l);
    })
    .map((v) => (v ? latinName(v) : v)).find((v) => v && named(v));
  const head = lines.slice(0, 6);
  const at = head.findIndex((l) => ANNOUNCES.test(l));
  // A sheet that announces nothing prints its product first: purefil heads its sheets "Polyethylenterephthalat
  // Typ G (PETG)" and then "Allgemein". Taking the second line instead made General the name of a product.
  if (at < 0) {
    // The line under the title is still where most makers put the name, and the title above it is where purefil
    // puts it; a sheet that announces itself in a language this reader does not read ("KARTA TECHNICZNA",
    // "SCHEDA TECNICA") announces itself on that first line, so it is tried second and not first.
    const order = [head[1], head[0], ...head.slice(2)].filter(Boolean);
    // Unless the title already is the name, more fully: iSANMATE heads a sheet "iSANMATE PLA CF" and prints "PLA"
    // under it, and read from the second line a carbon-fibre PLA was an ordinary one. Where the first line's words
    // include every word of the second's and more, the first is the product.
    const words = (x) => productName(x ?? '', maker).toLowerCase().split(/[^a-z0-9+]+/).filter(Boolean);
    const fuller = head[0] && head[1] && named(head[0]) && named(head[1])
      && words(head[1]).length && words(head[1]).every((w) => words(head[0]).includes(w)) && words(head[0]).length > words(head[1]).length;
    return { title: head[0] ?? '', product: labelled || (fuller ? head[0] : order.find(named)) || '' };
  }
  // The name may be on the same line as the words that announce it ("Technical Data Sheet: AmideX PA6-GF30"),
  // or on the line below ("TECHNICAL DATA SHEET" / "PET-G Premium"). Both makers are in this corpus.
  // CreatBot's sheets write the colon full-width ("Technical Data Sheet：CreatBot PLA-CF"), and a separator the
  // reader did not know left the whole line unread and the name taken from the table below it.
  const sameLine = head[at].replace(new RegExp(`^.*?(?:${ANNOUNCES.source})\\s*[:：\\-–—]?\\s*`, 'i'), '').trim();
  // Or in front of them. SIDDAMENT heads twenty-one sheets "ABS Carbon Fiber - Technical Datasheet", and a
  // reader that looked only after the announcement and then below it took a sentence out of the Precautions
  // paragraph: "unused filament properly after use". What stands before the words is tried before what stands
  // under them, because a maker who names its product on the announcing line has named it there.
  const beforeLine = withoutAnnouncement(head[at]);
  const below = head.slice(at + 1).find(named) ?? '';
  // "Nov. 2018 Technical Data Sheet Version 4.0" carries a version where another maker carries the name; the
  // announcement is in the middle of that line, so nothing is left in front of it and the line below is used.
  const product = labelled || (sameLine && named(sameLine) ? sameLine : '')
    || (beforeLine && named(beforeLine) ? beforeLine : '') || below;
  const onTheLine = product === sameLine || product === beforeLine;
  return { title: [head[at], onTheLine ? '' : product].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(), product };
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
    // Only an unfilled sibling's full name is the polymer's own. PAHT's one material is PAHT-CF, "Carbon-Fiber-
    // Reinforced High-Temperature Polyamide", and borrowed for Lehvoss's unfilled and mineral-filled grades it
    // named both of them carbon-fibre reinforced. Where no unfilled sibling exists the name is the abbreviation,
    // as it is for a polymer no material stands for yet.
    'Full name': plain['Modifier / filler'] === 'Unfilled / unspecified' ? `${plain['Full name']} (${identity.modifier})` : name,
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
/**
 * A name the page gives that is the page's furniture rather than its product's name.
 *
 * The title reader takes the likeliest line at the head of a page, and on some pages that line is a logo or a
 * sponsor: 3DJake's scans of FormFutura sheets read "UTURA", the tail of the maker's logo, eighteen times; Copper3D
 * heads its sheets "supported by / DISCOVER"; a Lehvoss sheet's first word is the "HT" of its logo. Such a name
 * says nothing about a filament — no polymer, filler, finish or support — and shares no word with the name the
 * document is listed under. Where both are true, the page is asked for a line that carries the listed name, and
 * what that line names is the product: the name is still what the page prints, never the listing's. Where no line
 * carries it, the name stands and the document says so (`reader:name-not-a-name`), because a name is not a
 * thing to guess at. A name that says what the filament is, however unlike the listing, is left alone: the
 * catalogue's "paht" is weaker evidence than a sheet titled "CarbonX Carbon Fiber High Temp Nylon".
 */
export function pageFurniture(name, row, text, world, makers = []) {
  const squash = (w) => String(w ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const makerNames = new Set([...makers, row.provider, row.manufacturer, row.brand,
    ...(world.manufacturers ?? []).flatMap((m) => [m.Value, ...String(m.Aliases ?? '').split(';')])]
    .flatMap((n) => [squash(n), ...String(n ?? '').split(/[^A-Za-z0-9]+/).map(squash)]).filter((w) => w.length >= 3));
  // A short number is a version or a count; a long one is a product's code ("Fibrolon V 135002"), and says which.
  const GENERIC = /^(v?\d{1,3}|tds|pds|sds|msds|extendedtds|technical|data|datasheet|sheet|filament|filaments|pdf|en|de|fr|es|it|jp|the|and|for|of|view|index|php)$/;
  const words = (s) => String(s ?? '').normalize('NFKC').split(/[^A-Za-z0-9]+/).map(squash)
    .filter((w) => w.length >= 2 && !GENERIC.test(w) && !makerNames.has(w));
  const fileName = (() => { try { return decodeURIComponent(new URL(row.url).pathname.split('/').pop() ?? '').replace(/\.pdf$/i, ''); } catch { return ''; } })();
  const listed = [...new Set([...words(row.product_raw), ...words(fileName)])];
  // A listed word stands in the name whole, or inside a word the name runs together: "ToughPETG-HF" carries the
  // listing's "tough" and "petg", and "Ultra PA" is the listing's "UltraPA". Only that way round: a fragment of
  // a listed word is exactly what a cut-off logo is ("UTURA" out of "FormFutura").
  const carries = (candidate, w) => words(candidate).includes(w) || (w.length >= 4 && squash(candidate).includes(w));
  if (!name || !listed.length || listed.some((w) => carries(name, w))) return { name };
  // Only a name that looks like the page's furniture is questioned: one word, words of a letter or two, or words
  // that are a date, a revision, an address or the sheet announcing itself. Any other name stands, because a
  // product's own name need not be the catalogue's ("Formi 3D Nordic Birch" is listed as KCL's PLA10).
  const FURNITURE = /\b(run by|supported by|update[ds]?|revised|revision|revisi[oó]n|actualizaci[oó]n|version|date|information|drying|family of)\b|data\s*sheet|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\+\d{2}\s?\d/i;
  const tokens = String(name).match(/[A-Za-z0-9]+/g) ?? [];
  if (!(tokens.length <= 1 || tokens.every((t) => t.length <= 2) || FURNITURE.test(name))) return { name };
  const says = classifyProduct(name, {}, world);
  if (says.polymer || says.family || says.variantClass || says.finish || says.support || (says.modifier && says.modifier !== 'Unfilled / unspecified')) return { name };
  // The page's own line for the listed product: a short line at the head of the page that is mostly the listed
  // name, with the announcement and a section number taken off its front. A sentence, a measurement or a line in
  // another script is not a name, whatever words it shares with one.
  const need = Math.max(1, Math.ceil(words(row.product_raw).length / 2));
  const lines = (text.pages?.[0]?.lines ?? []).slice(0, 30).map((l) => String(l.text ?? '').trim()).filter(Boolean);
  for (const line of lines) {
    const bare = line.replace(new RegExp(`^.*?(?:${ANNOUNCES.source})\\s*[:：\\-–—]?\\s*`, 'i'), '').replace(/^\d+(?:\.\d+)*[.)]?\s+/, '').trim();
    if (!bare || (bare.match(/[A-Za-z]{2,}/g) ?? []).length > 6) continue;
    if (/[^\u0000-\u024F\u2010-\u2122]/.test(bare) || /[a-z]\.\s|[.;]\s*$/.test(bare)) continue;
    if (/^(?:https?:\/\/|www\.)|\.(?:com|net|org|de|eu|fr|es|it|pl|cn)\b/i.test(bare)) continue;
    if (/\d\s*(?:\u2103|°|º|%|kg\b|g\/|mpa|gpa|mm\b|kj)/i.test(bare) || labelFor(bare) || new RegExp(STANDARD_RE.source, 'i').test(bare)) continue;
    const own = words(bare);
    const hits = listed.filter((w) => carries(bare, w));
    if (hits.length < need || hits.length * 2 < own.length) continue;
    const product = makers.reduce((n, who) => productName(n, who), bare);
    if (product && product.length < 60 && !notAProduct(product, makers.join(' '))) return { name: product, from: line };
  }
  // Nothing on the page carries the listed name, and the name the page gave looks like its furniture: it stands,
  // and the document says so.
  return { name, unsupported: { read: name, listed: row.product_raw } };
}

export function propose(row, text, world) {
  // The sheet says what the name often does not: which polymer, and what is in it. The first page's words are
  // enough, and they are the maker's own description rather than a catalogue title.
  // A captured shop page opens with the shop's own furniture — a breadcrumb, a menu of every material it sells,
  // a price, a SKU, a category list — and none of it is about the product on the page. Read as the sheet's own
  // words it named the polymer: thirteen Nanovia products took "hips" from a category menu, among them a
  // silicon-carbide filament and a stainless-steel one, and a HIPS at 7190 kg/m³ is what that produced.
  //
  // The test is the line's own shape, not the maker's, because the next shop that does this will be somebody
  // else's. A line that is a breadcrumb, a price, a stock code or a list of categories is the site talking about
  // itself; every line about the filament survives.
  const A_SHOPS_OWN_FURNITURE = /(?:^|\s)(?:home|accueil|start(?:seite)?|inicio)\s*[/\u203a>\u00bb]|\bcategor(?:y|ies|ías|ie[ns]?)\s*:|\bSKU\b|\bstarting at\b|\b(?:add to|view)\s+(?:cart|basket)\b|\bmy account\b|\b(?:quantity|menge|quantité)\s*$|[\u20ac\u00a3\u00a5]\s*\d|\b\d+[.,]\d{2}\s*(?:\u20ac|EUR|USD|GBP)\b/i;
  // A maker's site lists its whole range in its navigation, and a captured page carries it on every product:
  // Siraya Tech's "Fibreheart Family PET-CF PET-GF PETG-CF Pro PPA PPA-CF …" made its unfilled Rebound PEBA a
  // carbon-fibre one. A line that names a family and then several filled grades is the menu, not the product.
  const A_RANGE_MENU = /\bfamily\b(?:.*?\b[A-Z]{2,5}[- ](?:CF|GF|AF)\b){2,}/i;
  // A company's register line is not prose about the product: FormFutura's footer "Formfutura VOF CoC: 55502105"
  // is its Chamber of Commerce number, and read as prose it filed ReForm rTitan, an ABS, under COC.
  const A_COMPANY_REGISTER = /\b(?:CoC|KvK|VAT|IBAN|BIC|Chamber of Commerce)\b\s*(?:nr\.?|no\.?|number)?\s*[:：]/;
  const body = (text.pages[0]?.lines ?? []).map((l) => String(l.text ?? ''))
    .filter((line) => !A_SHOPS_OWN_FURNITURE.test(line) && !A_RANGE_MENU.test(line) && !A_COMPANY_REGISTER.test(line)).join(' ').slice(0, 2000);
  // What the sheet says its product is made of, in its own row. Fillamentum's Chemical properties table heads
  // its first row "Polymer base" and prints the polymer in words; a statement there is the sheet answering for
  // itself, which is worth more than the same word found somewhere in its prose.
  const COMPOSITION = /^(polymer base|base polymer|material base|composition|chemical base)\b\s*[:：]?\s*(.+)$/i;
  // A sheet also says it in a sentence about itself: FormFutura's "MetalFil ‐ Brass is a metal‐filled PLA‐based
  // filament", Lehvoss's line "Polyamide based material". Read word by word, the same page's "can be printed on
  // full metal, PEEK, and PFTE hotends" made the brass-filled PLA a PEEK. What the product is said to be based on,
  // in a sentence whose subject is the product or on a line of its own, is the composition row's statement.
  const BASED_ON = /\b(?:is|are)\s+(?:a|an)\b[^.;:]{0,80}?\b([A-Za-z][A-Za-z0-9/]{1,14})\s?[-\u2010\u2011]\s?based\b|^([A-Za-z][A-Za-z0-9/]{1,14}(?:\s[A-Za-z0-9]{1,6})?)\s+based\s+(?:material|compound|filament)\b/i;
  const basedOn = (text.pages?.[0]?.lines ?? []).map((l) => BASED_ON.exec(repair(String(l.text ?? '')).trim()))
    .filter(Boolean).map((m) => m[1] ?? m[2]);
  const compositionRow = [...(text.pages ?? []).flatMap((p) => p.lines ?? [])
    .map((l) => COMPOSITION.exec(repair(String(l.text ?? '')).trim())?.[2]).filter(Boolean), ...new Set(basedOn)].join('; ');
  // Whose sheet it is, in the ledger's own words: the manufacturer where the ledger knows one, and the provider
  // where a retailer is all it has. The maker's own name is not its product's, here or in the title.
  // Who made it, by R074 where a shop is hosting the sheet: the shop's own brand is the shop's, and anything
  // else is the maker the sheet or the URL names. `null` means neither did, and the ruling holds the document.
  const made = makerOfRecord(row, text, world);
  // Two names for one maker, and they are not interchangeable. The canonical one is what a grade records, so
  // that one maker is one value; the names as written are what comes off a product's own name, because a sheet
  // heads itself "BASF Forward AM / Ultrafuse PAHT CF15" and the canonical "BASF Forward AM" leaves the slash
  // and the brand behind. A shop's sheet has both to take off: the shop serving it and the maker of it.
  const maker = made?.maker || row.manufacturer || row.provider || '';
  // Only where the ledger recorded no maker does the resolved one join them, which is R074's case exactly: a
  // document the inventory already named is stripped the way it always was, so no applied name can move.
  const asWritten = [...new Set([row.manufacturer || row.provider || '',
    ...(!row.manufacturer && made?.maker ? [made.maker] : [])].filter(Boolean))];
  // Both names go to the reader of the page: a shop-hosted sheet has the shop's name on it and the maker's, and
  // a title is not a product's name for carrying either. makerWords takes the words apart, so one string of
  // them is one list.
  const head = printedTitle(text, asWritten.join(' '));
  // The name the sheet prints is the product's own; the catalogue name a link carries is a copy of it, and the
  // two disagree ("paht" for a sheet whose own title says CarbonX Carbon Fiber High Temp Nylon). Two revisions of
  // one sheet must classify alike, so the sheet's own name is what is read, and the catalogue's is kept beside it.
  const read = asWritten.reduce((name, who) => productName(name, who),
    head.product && !notAProduct(head.product, asWritten.join(' ')) ? head.product : row.product_raw);
  const furniture = pageFurniture(read, row, text, world, asWritten);
  const named = furniture.name;
  const identity = classifyProduct(named || row.product_raw, { manufacturer: made?.maker ?? row.manufacturer, catalogue: row.product_raw, title: [head.title, row.product_raw].filter(Boolean).join(' '), body, composition: compositionRow }, world);
  // A ruling that names this product by name has answered for it: the owner's verdict on the reading says what
  // the product is, and with it that the name it was read under stands for the product (R075, R077).
  const ruledByName = (identity.signals ?? []).some((s) => /^ruling R\d+/.test(s));
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
  if (named && !ruledByName && NAMES_THE_STOCK.test(named.replace(/\s+(by|von|par|da)\s+.*$/i, ''))) {
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
  // A retailer is not a manufacturer, and R074 says what one is instead: the shop where the product name carries
  // the shop's own brand, otherwise the maker the sheet or the URL names, and held where neither does. That is
  // `makerOfRecord` above; what is left here is the third of those three, because a grade whose Manufacturer is
  // the shop says the shop made the filament, and "Filament2Print BEDROCK 3D PPSU" would say it wrongly.
  if (row.provider_kind === 'retailer' && !made && !ruledByName) {
    identity.reasons.push(`the sheet is hosted by ${row.provider} and names no maker of its own, and neither does its URL: R074 holds it until one of them does`);
    identity.needsRuling = true;
  }
  const registry = new Map((world.properties ?? []).map((p) => [p.Property, p]));
  // How this polymer solidifies and whether it is reinforced: the two things the build's own physics windows are
  // keyed on, so a reading judged here is judged the way the build will judge it.
  const morphology = (world.polymers ?? []).find((p) => p.PolymerID === identity.polymer)?.Morphology;
  const window = {
    matrix: morphology ?? 'high-temp',
    fill: ['Carbon fibre', 'Glass fibre', 'Aramid fibre'].includes(identity.modifier) ? 'fibre'
      : identity.modifier === 'Foaming' ? 'light'
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
      Manufacturer: maker,
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
    if (twin) {
      // R079: a product whose identity the database already holds is a grade under that material, not a second
      // one of it. R039 settled the first such case by hand and the ruling generalised it. `collidesWith` keys
      // on the three things a material is — its estimate identity, its filler and its commercial variant class
      // — so a collision here is the same material and not merely a similar one.
      identity.materialId = twin.MaterialID;
      identity.materialName = twin['Original name'];
      identity.signals.push(`filed under ${twin['Original name']} (${twin.MaterialID}) by R079: ${identity.polymer} / ${identity.modifier}${identity.variantClass ? ` / ${identity.variantClass}` : ''} is the identity it already holds`);
      newMaterial = null;
    } else if (sameName) {
      const plain = plainMaterialFor(identity, world.materials ?? []);
      if (plain) {
        // R079 again, one step further out: the database holds no material for this finish and does hold the
        // plain polymer. A glow or a glitter PETG is a PETG mechanically and the finish is a grade-level fact,
        // which is the owner's own wording. The same product in PLA never reaches here — PLA Glow and PLA
        // Sparkle exist, and `collidesWith` finds them.
        identity.materialId = plain.MaterialID;
        identity.materialName = plain['Original name'];
        identity.signals.push(`filed under ${plain['Original name']} (${plain.MaterialID}) by R079: the database holds no ${identity.polymer} ${identity.finish || identity.variantClass} material, and the finish is a fact about this grade`);
        grade.row['Composition / filler'] = grade.row['Composition / filler'] === NP
          ? `A ${identity.finish || identity.variantClass} finish of ${plain['Original name']}; the sheet declares no filler (R079).`
          : grade.row['Composition / filler'];
      } else if (sameName.Scope === 'Family entry') {
        // A family owns no product (D44), and a name that collides with a family entry is saying so.
        identity.reasons.push(`"${identity.polymer}" names a family, not a polymer: ${sameName.MaterialID} is a Family entry and owns no product (D44). Which elastomer it is comes from the sheet`);
        identity.needsRuling = true;
      } else {
        // A name two materials share is not an identity two materials share. Filing a product under a material
        // because their names match is how a PVB became a polycarbonate.
        identity.reasons.push(`a new material would carry the name ${sameName['Original name']} (${sameName.MaterialID}) already has, for a different identity: ${identity.polymer} / ${identity.modifier}${identity.variantClass ? ` / ${identity.variantClass}` : ''}`);
        identity.needsRuling = true;
      }
      newMaterial = null;
    }
  }
  const profiles = profilesFor(sheet.settings, { sourceId, materialId: identity.materialId ?? '', modifier: identity.modifier });

  const polymer = (world.polymers ?? []).find((p) => p.PolymerID === identity.polymer);
  const density = measurements.find((m) => m.row.Property === 'Density');
  const neat = [Number(polymer?.['Neat density min kg/m³']), Number(polymer?.['Neat density max kg/m³'])];
  // A finish material (PLA Metal, PLA Wood) says particle-filled and no more: Bambu's PLA Metal weighs 1.25 and
  // Spectrum's 2.36, so the grade that weighs what its metal makes it weigh says so itself, as any other does.
  const finish = identity.variantClass === 'particle-filled';
  if (density && identity.modifier === 'Unfilled / unspecified' && (!identity.variantClass || finish) && Number.isFinite(neat[0]) && Number.isFinite(neat[1])) {
    const value = Number(density.row['Normalized value']);
    // R078 and D57: a filament denser than its own polymer can be carries a load its maker does not declare, and
    // a lighter one is foamed. Neither is a new material — the polymer is the one the name states — and neither
    // may be filed as an ordinary grade of it, because its values are not the family's. It is a Variant, which
    // says so on the grade and keeps the estimate model from letting a bronze-filled PLA pull ordinary PLA.
    //
    // A density no filament reaches is none of that. Tungsten-filled PLA, the densest thing in this corpus, is
    // about 4000 kg/m³; six sheets in this queue read 11115, 23000 or 923000, which is the page misread and not
    // a heavy filler. Declaring a Variant for one would record a load that is not there, so it stays a question.
    const declare = (variant, why, composition) => {
      grade.row.Variant = variant;
      grade.row['Composition / filler'] = composition ?? `${why} Not declared on the sheet; recorded as a Variant under D57 (R078).`;
      identity.signals.push(`${variant} by R078: ${why}`);
      // A grade that declares a filler is not an unfilled material, and the windows a reviewer weighs its rows
      // against must stop saying it is. Without this, the very density that declared the Variant is then held
      // back for being outside what an unfilled polymer reaches — which is what it was read to mean. The class
      // is the one the lint will judge it by, so the reader and the build weigh the row against one window (D80).
      window.fill = /dense filler$/.test(variant) ? 'dense' : variant === 'lightweight additive' ? 'light' : window.fill;
    };
    if (value >= IMPLAUSIBLE_DENSITY) {
      identity.reasons.push(`its density reads ${value} kg/m³, which no filament reaches: the page is misread, and a load that is not there may not be declared`);
      identity.needsRuling = true;
    } else if (value > neat[1] * 1.05) {
      // R078 is for the load a maker does not declare. A maker who does declare one — colorFabb's copperFill is
      // "a high quality PLA 3D printing filament, loaded with copper particles" — has said what the load is, and
      // "Not declared on the sheet" would put a false sentence in the data. R095: it is the same kind of product
      // as the undisclosed one, a dense powder in the named polymer, so it is the same kind of record — a Variant
      // of the polymer's material, declared, with the sheet's words in Composition — and not a material per
      // metal: a copper-filled PETG is a PETG with a load, which is what D57 made Variant for.
      const declared = A_DECLARED_LOAD.exec(`${row.product_raw ?? ''} ${named ?? ''} ${text.pages[0]?.lines?.map((l) => String(l.text ?? '')).join(' ') ?? ''}`);
      if (declared) {
        // A metal the lexicon knows as a load with no modifier value ("tungsten", "magnetite") asked this question;
        // the sheet's density and its own words answer it (R095), and only here: without a density it stays asked.
        const asked = identity.reasons.findIndex((r) => /^"(?:magnetite|tungsten|aluminium)" has no value in schema\/vocab\/modifiers\.csv/.test(r));
        if (asked >= 0) { identity.reasons.splice(asked, 1); identity.needsRuling = identity.reasons.length > 0; }
        const said = declared[0].trim().slice(0, 80);
        declare('declared dense filler', `Its density of ${value} kg/m³ is above what neat ${identity.polymer} reaches (${neat[1]}), and the sheet declares the load: "${said}".`,
          `The sheet declares the load: "${said}". Its density of ${value} kg/m³ is above what neat ${identity.polymer} reaches (${neat[1]}); recorded as a Variant under D57 (R095).`);
      } else if (!finish) {
        declare('undisclosed dense filler', `Its density of ${value} kg/m³ is above what neat ${identity.polymer} reaches (${neat[1]}), so the product carries a filler its name does not declare.`);
      }
    } else if (value < neat[0] * 0.95 && !finish) {
      // R078 answers the heavy case and only that one: "a filament denser than its named polymer reaches". A
      // lighter one has two explanations and the sheet has to say which. Fabru's "Cyclo-Olefin-Copolymer
      // flexibel" is 940 against COC's 1010 because it is the soft grade, not because anything was foamed, and
      // calling it a lightweight additive would record a component that is not in it.
      // R098: where the sheet does say which, that is the answer, in its own words. Polymaker's PolyWood is "made
      // entirely with PLA using a special foaming technology", FormFutura's Pegasus PP "an ultralight ...
      // compound", Siraya's PEBA Air an "active foaming" material: a lightweight additive. Fabru's COC flex is "a
      // ... thermoplastic elastomer based on cyclic olefin copolymers" and Spectrum's PET-G FX120 "a flexible
      // material": a softer grade of the polymer, which foams nothing. A sheet that says both, or neither, stays a
      // question. The words are read on a line about this product, not on the maker's menu of every other.
      // Page one first, where a sheet says what its product is; then the rest, where a printing guide does
      // (Polymaker's PolyWood guide says it on its second page). A page's lines are joined before its sentences
      // are found, because a sentence wraps: "PolyWood™ is made entirely with PLA using a special" / "foaming
      // technology". A sentence ends at a stop before a capital, never at a decimal point; a run of spaces is a
      // column gap, and a contents line ("4.6 Stabilized Foaming™ 11") is not a sentence at all.
      const keep = (l) => !A_RANGE_MENU.test(l) && !/\bexclusive for\b|^\s*(?:\S+\s+){0,3}family\b/i.test(l) && !/^\s*\d+(?:\.\d+)*\s.*\s\d+\s*$/.test(l);
      // A line runs on into the next only where the next goes on in lower case; a heading ends where it ends.
      const sentences = text.pages.flatMap((pg) => (pg.lines ?? []).map((l) => String(l.text ?? '')).filter(keep)
        .reduce((out, l, i, all) => `${out}${l}${/^\s*[a-z(]/.test(all[i + 1] ?? '') && !/[.!?:]\s*$/.test(l) ? ' ' : '\u0000'}`, '')
        .split(/\u0000|(?<=[.!?])\s+(?=[A-Z])|\s{2,}/));
      const find = (re) => {
        const sentence = sentences.find((x) => re.test(x));
        if (!sentence) return null;
        const at = sentence.search(re);
        const cut = sentence.length <= 120 ? sentence
          : `… ${sentence.slice(Math.max(0, at - 50), at + 70).replace(/^\S*\s/, '').replace(/\s\S*$/, '')} …`;
        return cut.trim().replace(/[.,;:!]$/, '');
      };
      const light = find(/\b(?:foam(?:ed|ing)?|ultra[- ]?light(?:weight)?|light[- ]?weight|lightest filament|hollow (?:glass )?(?:micro)?spheres?|glass bubbles)\b/i);
      const soft = find(/\bthermoplas\S*\s+elastomer|\belastomer(?:ic)? (?:grade|version|based)|\bis an? (?:highly )?flexible (?:material|grade|filament)\b/i);
      if (light && !soft) {
        declare('lightweight additive', `Its density of ${value} kg/m³ is below what neat ${identity.polymer} reaches (${neat[0]}), and the sheet says why: "${light}".`,
          `The sheet declares it: "${light}". Its density of ${value} kg/m³ is below what neat ${identity.polymer} reaches (${neat[0]}); recorded as a Variant under D57 (R098).`);
      } else if (soft && !light) {
        declare('declared softer grade', `Its density of ${value} kg/m³ is below what neat ${identity.polymer} reaches (${neat[0]}), and the sheet says why: "${soft}".`,
          `The sheet declares a softer grade: "${soft}". Its density of ${value} kg/m³ is below what neat ${identity.polymer} reaches (${neat[0]}); recorded as a Variant under D57 (R098).`);
      } else {
        identity.reasons.push(`its density of ${value} kg/m³ is below what neat ${identity.polymer} reaches (${neat[0]}): a foaming agent and a softer grade of the same polymer both read like this, and the sheet says which`);
        identity.needsRuling = true;
      }
    }
  }

  return {
    version: 1,
    generated: { tool: 'propose.mjs', date: new Date().toISOString().slice(0, 10) },
    document: { sha256: row.sha256, url: row.url, pages: text.pages.length, provider: row.provider, manufacturer: row.manufacturer, docKey: row.doc_key },
    ...(furniture.unsupported ? { nameUnsupported: furniture.unsupported } : {}),
    identity,
    // The physics window this reading was judged against, carried so a reviewer is judged against the same one.
    // Without it every row would be weighed at "any", which is the widest window there is and catches nothing.
    window,
    ...(newMaterial ? { newMaterial } : {}),
    source: {
      row: {
        // A title keeps the publisher's words and not its typesetting: CreatBot's full-width colon is a colon (TEXT-FULLWIDTH).
        SourceID: sourceId, Publisher: row.manufacturer || row.provider, Title: asciiPunctuation(title || row.product_raw),
        Revision: NP, 'Publication date': NP, 'Access date': row.updated || new Date().toISOString().slice(0, 10),
        // A copy is not a source, but where a retailer's is the only copy it is the one that was read. The
        // publisher stays the maker, whose sheet it is, and the note says where the bytes came from, because
        // that is what a reader needs to go back to them. What it does not say is why the maker's own library
        // does not carry it: this reads one document and knows nothing about the rest of a maker's library.
        'Source class': 'Manufacturer TDS',
        'Source note': row.manufacturer && row.provider && row.provider !== row.manufacturer
          ? `Hosted by ${row.provider}; the sheet is ${row.manufacturer}'s.` : NA,
        'Citation role': 'cited', URL: row.url,
        Locator: 'Document / product page', 'Applicable grades': '${grade:main}',
        // A copy the owner staged (ingest:fetch --stage, R084) is read exactly as a fetched one, and says so.
        'Access state': /staged copy: /.test(row.status_note ?? '') ? 'retrieved-copy' : 'retrieved',
        'Access note': /staged copy: /.test(row.status_note ?? '')
          ? `Owner-supplied copy (${/staged copy: [^;]+/.exec(row.status_note)[0]}); the pipeline hashed the file it was given and read every value from that file (R084).` : NA,
        SHA256: row.sha256,
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
  const world = { materials: table('materials'), polymers: table('polymers'), grades: table('grades'), properties: table('properties'), sources: table('sources'), headlineDefinitions: table('headline_definitions'), manufacturers: readCsv(join(projectRoot, 'schema/vocab/manufacturers.csv')).records.map((r) => r.values), rulings: readCsv(join(AUDIT, 'rulings/rulings.csv')).records.map((r) => r.values) };
  // A batch is the documents that are a sheet in their own right: not a copy of one already read, not one the
  // register already holds, and not one still waiting on a question about whether it is a copy at all.
  const SKIP = new Set(['duplicate-of', 'twin-check', 'registered', 'applied', 'unreachable', 'needs-ocr', 'gated', 'safety-data-sheet', 'not-a-data-sheet', 'skipped', 'rejected', 'deferred']);
  // A batch is chosen by what the ledger says about a document, not by the maker who published it: --ready takes
  // every document nothing is holding, and --held <reason> takes the ones a named hold was waiting on, which is
  // how a ruling the owner has answered or a reader rule just built gets its documents back (ingest:batch --holds).
  const held = arg('held');
  const rows = readCsv(join(AUDIT, 'ledger.csv')).records.map((r) => r.values)
    .filter((r) => (doc ? r.doc_key === doc : true) && (provider ? r.provider === provider || r.manufacturer === provider : true))
    .filter((r) => (process.argv.includes('--ready') ? r.status === 'extracted' : true))
    // --held <reason> takes what that reason was waiting on; --held any takes every held document whatever its
    // reason. A reason is what the last --holds run wrote, so a document whose reason has changed since then is
    // one a named reason misses — NonOilen was held as a reader gap, freed by a polymer row, and sat out two
    // batches because the note still said the old thing. Proposing reads and writes nothing, so "any" is the
    // safe选择 when a batch has moved several kinds of blocker at once.
    .filter((r) => (held ? (held === 'any' ? /^held: /.test(r.status_note ?? '') : (r.status_note ?? '').startsWith(`held: ${held}`)) : true))
    .filter((r) => r.sha256 && cachedText(r.sha256))
    // --compare reads the sheets the database already holds, which is exactly what a batch run leaves out.
    // --compare scores a sheet somebody transcribed by hand against what this reader reads off the same bytes.
    // A document registered because its product already has a grade (registered_by "product") points at a
    // source that was read from other bytes — the English edition, the maker's own copy — and scoring it counts
    // that source's values as ones this sheet was expected to yield. It put Spectrum's Polish editions against
    // its English sources, and the census fell from 96.6 to 90.8 while no maker read a value fewer.
    .filter((r) => doc || held || (process.argv.includes('--compare')
      ? r.registered_source_id && r.registered_by !== 'product'
      : !SKIP.has(r.status) && !r.registered_source_id));
  if (!rows.length) { console.error('nothing read to propose from'); process.exit(2); }

  if (process.argv.includes('--compare')) {
    const measurements = table('measurements');
    // --all scores every maker whose sheets somebody transcribed by hand, in one run, and writes the table down.
    // Run one maker at a time, the makers nobody asked about are the ones that quietly stop being checked: Bambu
    // and iSANMATE were both below the gate for two days and nothing said so.
    const all = process.argv.includes('--all');
    const providers = all
      ? [...new Set(rows.filter((r) => r.registered_source_id).map((r) => r.provider))].sort()
      : [null];
    const table2 = [];
    for (const only of providers) {
      const scored = rows.filter((r) => r.registered_source_id && (only == null || r.provider === only));
      let recorded = 0, found = 0;
      const missedAll = [];
      for (const r of scored) {
        const p = propose(r, cachedText(r.sha256), world);
        const mine = measurements.filter((m) => m.SourceID === r.registered_source_id && /^Published value/.test(m['Data status']));
        const c = compare(p, mine);
        recorded += c.recorded; found += c.found;
        missedAll.push(...c.missed.map((m) => `${r.registered_source_id}: ${m}`));
        if (!all) console.log(`${String(c.found).padStart(3)} of ${String(c.recorded).padStart(3)}  ${r.registered_source_id}${c.missed.length ? `\n      missed: ${c.missed.slice(0, 6).join('; ')}` : ''}`);
      }
      const pct = recorded ? (found / recorded) * 100 : 0;
      if (all) console.log(`${pct.toFixed(0).padStart(3)}%  ${String(found).padStart(4)} of ${String(recorded).padStart(4)}  ${String(scored.length).padStart(3)} sheet(s)  ${only}`);
      else console.log(`\nparity ${pct.toFixed(0)}%: ${found} of ${recorded} recorded values on ${scored.length} sheet(s)`);
      table2.push({ Provider: only ?? 'all', Sheets: scored.length, Recorded: recorded, Found: found, Parity: pct.toFixed(0), Missed: missedAll.join(' | ') });
    }
    if (all) {
      mkdirSync(join(AUDIT, 'census'), { recursive: true });
      writeFileSync(join(AUDIT, 'census/parity.csv'), csvText(['Provider', 'Sheets', 'Recorded', 'Found', 'Parity', 'Missed'], table2.sort((a, b) => b.Sheets - a.Sheets)));
      const below = table2.filter((t) => Number(t.Parity) < 95);
      console.log(`\n${table2.length} maker(s) -> census/parity.csv${below.length ? `\n${below.length} below the 95% gate: ${below.map((t) => `${t.Provider} ${t.Parity}%`).join(', ')}` : ''}`);
    }
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
