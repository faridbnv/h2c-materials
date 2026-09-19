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
import { cachedText, columnPositions, cellsAt, joinDigits, lineCells } from '../lib/pdf-text.mjs';
import { parseTemperature, parseEnclosure, parseDrying, parseAbrasion } from '../../build/src/normalize/process.js';
import { readStandards } from '../../build/src/normalize/standards.js';
import { readPostProcessingState, parseAnnealSchedule } from '../../build/src/normalize/specimen.js';
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
const valueRe = () => new RegExp(`((?:(?<!\\d\\s{0,3})-)?\\d+(?:[.,]\\d+)?)\\s*(${UNIT_PATTERN})`, 'gi');

// A section heading tells a value what it is: a printing guide is not a test result, and a storage note is neither.
//
// A heading must be the heading, not a line that happens to contain the word. A data sheet prints its marketing
// text in a column beside the table, and extraction interleaves the two, so "es the thermal resistance of the
// filament, further" arrived looking like a Thermal Properties heading and ended a section in the middle of one.
// So: anchored at the start, and short enough to be a heading rather than a sentence.
const SECTIONS = [
  [/^(guideline for )?print(ing)?[\s-]*(settings|parameters|guide)|^recommended (print(ing)? )?settings/i, 'print'],
  [/^(storage|packaging|drying|shelf life)\b/i, 'storage'],
  [/^(material|mechanical|thermal|physical|general|electrical|optical)\s+propert/i, 'properties'],
];
const HEADING_LENGTH = 60;

// ASTM's own sheets print the designation without the body: "D 792", "D638", "D 256", "E 2092". Requiring ASTM
// left every one of those rows with no standard at all, and put the property's label in the column that keeps the
// sheet's words for the method. The lookahead is what keeps a word ending in D from starting a designation.
const STANDARD_RE = /\b(?:ISO|ASTM\s?D?|GB\/T|DIN|IEC|UL|EN|[DE](?=\s?\d{3,4}))\s?\d+[\w./-]*(?:\s?\/\s?[\w.-]+)?/gi;

// Extraction separates a superscript from its unit ("g/cm 3", "kJ/m 2") and splits digits ("2 43 3 .4"); both are
// repaired before a line is read. A standard's designation is left exactly as printed: the digits inside it are
// not a number, and joining them was what turned "ISO 527" into a fragment in the label.
const joinLocal = (t) => t.replace(/(\d) (?=\d)/g, '$1').replace(/(\d) ?\. ?(?=\d)/g, '$1.').replace(/(\d), (?=\d)/g, '$1,').replace(/\bO\.(?=\d)/g, '0.');
// Extraction splits a standard's own number too ("ISO 11 8 3", "ISO 17 9", "D 2 56"), and the designation is
// matched before the digits are joined, so the match stops at the first fragment and the rest is lost. A fragment
// is part of the designation when it is a single digit standing alone and nothing that looks like a value follows:
// a number after a standard carries its unit ("ISO 75 80 °C"), and the suffix of ISO 179/1eU is not digits.
const joinStandardDigits = (line) => line.replace(
  /\b((?:ISO|ASTM\s?D?|DIN|IEC|UL|EN|GB\s?\/\s?T|[DE])\s?\d{1,4})((?:\s\d(?![\d.,]))+)(?![\s]*[°%\w])/g,
  (m, head, frags) => (`${head}${frags}`.match(/\d/g) ?? []).length <= 5 ? head + frags.replace(/\s/g, '') : m);

function repair(text) {
  const line = joinStandardDigits(String(text ?? '').replace(/\b(cm|m|mm)\s+([23])\b/g, '$1$2'));
  const out = [];
  let last = 0;
  for (const m of line.matchAll(new RegExp(STANDARD_RE.source, 'gi'))) { out.push(joinLocal(line.slice(last, m.index)), m[0]); last = m.index + m[0].length; }
  out.push(joinLocal(line.slice(last)));
  return out.join('');
}

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
  const match = LABELS.find((l) => l.re.test(line.trim())) ?? held;
  if (!match) return null;
  const candidates = [...line.matchAll(valueRe())];
  // A hardness states its scale in the label and prints a bare number ("Rockwell Hardness (R-Scale) 55"), because
  // the scale is the unit. Every other property prints its unit beside the value.
  if (!candidates.length && match.Property === 'Hardness') {
    // The scale is the unit: Shore A, Shore D, Rockwell R or Rockwell M, however the sheet writes it
    // ("R-Scale", "R Scale", "Rockwell R"). Taking the last letter of the match read "R-Scale" as scale E.
    const shore = /\bshore\s*([ad])\b/i.exec(line);
    // A sheet states the scale in the label ("Rockwell Hardness, R Scale"), or in the unit beside the number
    // ("80 HRM"), which is the same statement written the other way round.
    const rockwell = /\brockwell\s*([rm])\b/i.exec(line) ?? /\b([rm])[\s-]?scale\b/i.exec(line) ?? /\bHR([RM])\b/i.exec(line);
    const scale = shore ?? rockwell;
    // The standard is stripped first, or "ISO 2039-2" gives the hardness a value of 2.
    const plain = line.replace(STANDARD_RE, ' ').replace(/\(.*?\)/g, ' ');
    const bare = /(-?\d+(?:[.,]\d+)?)/.exec(plain.slice(scale ? plain.search(/\d/) : 0));
    if (scale && bare) {
      const unit = shore ? `Shore ${shore[1].toUpperCase()}` : `Rockwell ${rockwell[1].toUpperCase()}`;
      const target = targetUnit('Hardness', unit, registry);
      if (target) return { match, label: line.slice(0, line.indexOf(bare[1])).trim(), conditions: line.slice(0, line.indexOf(bare[1])).trim(),
        raw: bare[1], rawNumber: rawNumber(bare[1]) == null ? bare[1] : String(rawNumber(bare[1])), printedUnit: unit,
        target, standards: (line.match(STANDARD_RE) ?? []).map((m) => m.replace(/\s+/g, ' ').trim()), operator: '=', range: false };
    }
  }
  if (!candidates.length) return null;
  for (const candidate of candidates) {
    // The factor is from the unit the sheet printed, not from what that unit is called here: reading it from the
    // normalized name converted kg/m³ to kg/m³ and recorded every density as 1.33.
    const target = targetUnit(match.Property, candidate[2], registry);
    if (!target) continue;
    let before = line.slice(0, candidate.index);
    const after = line.slice(candidate.index + candidate[0].length);
    if (RATE_OR_CONDITION.test(after)) continue;
    // A published spread shares its value's unit ("2433.4 ± 79.4 kJ/m2"), so the number beside the unit is the
    // spread and the one before the sign is the value. Reading left to right recorded the spread as the result.
    const spread = /(-?\d+(?:[.,]\d+)?)\s*(?:±|\+\/-)\s*$/.exec(before);
    // A published window is one statement, not two: "Glass Transition Temperature 55-60°C" is a range whose low
    // end carries no unit of its own. Reading the number beside the unit alone made it a point, and reading the
    // dash as a sign made it -60 °C. The database keeps the pair (Raw upper bound), so the row is read as one.
    const window = spread ? null : /(-?\d+(?:[.,]\d+)?)\s*[-–~]\s*$/.exec(before);
    const value = spread ? spread[1] : window ? window[1] : candidate[1];
    const uncertainty = spread ? candidate[1] : null;
    const upper = window ? candidate[1] : null;
    if (spread) before = before.slice(0, spread.index);
    if (window) before = before.slice(0, window.index);
    return {
      match,
      label: before.replace(/[<>≤≥~@(,\s]+$/, '').trim(),
      conditions: before.trim(),
      uncertainty: uncertainty == null ? null : String(rawNumber(uncertainty)),
      upper: upper == null ? null : String(rawNumber(upper)),
      raw: window
        ? `${value}-${upper} ${candidate[2]}`.replace(/\s+/g, ' ').trim()
        : `${value}${uncertainty ? ` ± ${uncertainty}` : ''} ${candidate[2]}`.replace(/\s+/g, ' ').trim(),
      // The build's own reader decides what the digits mean: a decimal comma with one or two places, a thousands
      // comma with three ("13,085 psi" is thirteen thousand, not thirteen).
      rawNumber: String(rawNumber(value)),
      printedUnit: candidate[2], target,
      // A sheet may print the method before the value or after it, so the standards are read from the whole line.
      standards: (line.match(new RegExp(STANDARD_RE.source, 'gi')) ?? []).map((m) => m.replace(/\s+/g, ' ').trim()),
      operator: /[<>≤≥]\s*$/.test(before) ? before.trim().slice(-1).replace('≤', '<').replace('≥', '>') : '=',
      range: !window && /[-–~]\s*$/.test(before),
      // "24.000 kg/cm2" is twenty-four thousand on a European sheet and twenty-four on an American one. Which it
      // is comes from reading the sheet, so the row says it is ambiguous and a person settles it (V000731 is the
      // precedent: the raw value records both the number and what the sheet printed).
      ambiguous: /\d[.,]\d{3}(?!\d)/.test(value) ? `"${value}" may be a thousands separator or a decimal one` : null,
    };
  }
  return null;
}

// A printing setting is read by its own label, wherever on the page it sits. Reading it by the section it falls
// under does not survive a two-column sheet: extraction interleaves the printing table with the storage paragraph
// beside it, so "Bed temperature 60-80°C" arrived under a Storage heading and was thrown away, while
// "Nozzle temperature 230-260°C STORAGE AND SHELF LIFE" kept the neighbouring column's heading in its cell.
//
// The value is taken from the label's own cell (the page's own column gaps, pdf-text.mjs), and what follows a
// complete value is the next column's text, not part of the setting.
const VALUE_HEAD = /^\s*(?:[<>≥≤~]\s*)?(?:\d+(?:[.,]\d+)?\s*(?:[-–—]|to)\s*)?\d+(?:[.,]\d+)?\s*(?:°\s?C|°C|C\b|%|mm\/s|mm\/min|mm|m\/s)?/i;
const CONTINUES = /^(\(|up to\b|max\b|min\b|or\b|and\b|±)/i;
// Where a neighbouring column's sentence begins: a run of capitals, or a sentence's subject and verb.
const FOREIGN = /\s(?=[A-Z]{2,}(?:\s+[A-Z&]{2,})+)|\s(?=[A-Z][a-z]+\s+(?:should|is|are|has|have|may|shall|can|will|must)\b)/;

export function settingValue(text) {
  const value = String(text ?? '').replace(/^[\s:*•–—-]+/, '').trim();
  const head = VALUE_HEAD.exec(value);
  if (head && head[0].trim()) {
    const rest = value.slice(head[0].length).trim();
    return CONTINUES.test(rest) && rest.length <= 24 ? value : head[0].trim();
  }
  const cut = value.search(FOREIGN);
  return (cut > 0 ? value.slice(0, cut) : value).trim().slice(0, 80);
}

/** What a line says about how to print, if it says anything: the setting it names and the sheet's own words for it. */
export function readSetting(line, page = 1) {
  const cells = lineCells(line).map((c) => repair(c.text).trim()).filter(Boolean);
  const source = cells.length ? cells : [repair(line.text).trim()];
  for (let i = 0; i < source.length; i++) {
    const match = SETTINGS.find((sl) => sl.re.test(source[i]));
    if (!match) continue;
    const m = match.re.exec(source[i]);
    const tail = source[i].slice(m.index + m[0].length);
    // "Closed chamber for printing not necessary" is printed across two cells, and the half that says what it is
    // ("not necessary") is in the second. A tail that states neither a number nor a state is only the start of the
    // sentence, so the next cell finishes it.
    const STATE = /\d|\b(not|no|yes|necessary|required|recommended|needed|advised|optional)\b/i;
    // A bare yes or no in the next cell is the answer to the statement in this one. Spectrum prints "Ruby or
    // hardened nozzle recommended" in one cell and "No" in the next, and reading only the first cell turned a
    // sheet that says a hardened nozzle is not needed into one that recommends it.
    const answer = /^(yes|no)$/i.test(source[i + 1] ?? '');
    const joined = answer || (!STATE.test(tail) && source[i + 1] && STATE.test(source[i + 1]) && `${tail} ${source[i + 1]}`.length <= 60)
      ? `${tail} ${source[i + 1]}` : tail;
    const raw = settingValue(joined) || settingValue(source[i + 1] ?? '');
    if (!raw || !/[a-z0-9]/i.test(raw)) return null;
    // A note has to state something. "exceptional print quality at a speed of up to 600" wraps so that a line
    // begins with the word speed, and read as guidance it put a marketing sentence in the print setup.
    if (match.Field === 'note' && !/\d|\b(not|no|yes|necessary|required|recommended|needed)\b/i.test(raw)) return null;
    return { page, field: match.Field, topic: match.Topic || '', label: m[0].trim(), raw, line: String(line.text ?? '').slice(0, 200) };
  }
  return null;
}

/** Every value a sheet publishes, with the page and the line it was read from. */
export function readSheet(text, registry) {
  const values = [], settings = [], skipped = [];
  for (const page of text.pages) {
    let section = 'properties';
    let held = null, heldLabel = '', heldFor = 0, heldX = 0, prefix = '', prefixX = 0;
    for (let li = 0; li < page.lines.length; li++) {
      const line = page.lines[li];
      const heading = line.text.trim().length <= HEADING_LENGTH ? SECTIONS.find(([re]) => re.test(line.text.trim())) : null;
      if (heading) { section = heading[1]; held = null; continue; }
      const plain = repair(line.text).trim();

      // A label with no value of its own holds for the next line, which is how a sheet prints a heat deflection
      // temperature and then a row per load. It holds for one line only: a label that survived a row it did not
      // belong to once read a tensile elongation as a Charpy strength.
      // A label with nothing else on the line holds for the next one. It must have no digits at all: a hardness
      // states its value with no unit ("Shore D Hardness 43"), and testing for a unit instead threw those rows away.
      // A printing setting is read wherever it is named, before the section decides what a line is: the sections
      // themselves are unreliable on a two-column page, and a setting names itself. A line that names a property
      // is never a setting, so a property the lexicon knows is never taken for one.
      if (!LABELS.some((l) => l.re.test(plain))) {
        const setting = readSetting(line, page.page);
        if (setting) {
          // A statement can run onto the next line: extraction breaks "Closed chamber for printing not necessary"
          // after "printing", and the half that says what it is is on the line below. A value that states neither
          // a number nor a state is unfinished, and the next short line finishes it.
          const next = page.lines[li + 1];
          if (!/\d|\b(not|no|yes|necessary|required|recommended|needed)\b/i.test(setting.raw) && next) {
            const tail = repair(next.text).trim();
            if (tail.length <= 30 && /\b(not|no|yes|necessary|required|recommended|needed)\b/i.test(tail) && !readSetting(next, page.page) && !LABELS.some((l) => l.re.test(tail))) {
              setting.raw = `${setting.raw} ${tail}`.replace(/\s+/g, ' ').trim();
              setting.line = `${setting.line} ${tail}`.slice(0, 200);
              li += 1;
            }
          }
          settings.push(setting); held = null; continue;
        }
      }

      // A line with no number of its own heads the rows under it. It becomes a held label when it names a
      // property the lexicon knows, and a prefix either way: "Tensile Elongation*" names no property until the
      // row below says "At yield". A heading is a few words, so a sentence from the column beside the table
      // ("Filament should be stored in a dry room at room") does not displace one.
      const bare = LABELS.find((l) => l.re.test(plain));
      const headsRows = !/\d/.test(plain) && plain.length <= HEADING_LENGTH && plain.split(/\s+/).length <= 6;
      if (headsRows) { prefix = plain; prefixX = line.x0 ?? 0; }
      if (bare && !/\d/.test(plain)) { held = bare; heldLabel = plain; heldFor = 0; heldX = line.x0 ?? 0; continue; }

      // A held label carries to the rows under it that state a value but name no property of their own: a sheet
      // prints "Temperature of deflection under load" and then a row per load, or "Izod Impact Strenght" and then
      // a row per notch. Three things keep it from drifting down the page and claiming a value that is not its:
      // it stops at the next row that names a property, it stops after three rows, and the value it takes must be
      // in a unit the held property is kept in, so a tensile elongation in per cent can never become an impact
      // strength in kJ/m². Without the last of those, a held Charpy label once claimed a tensile elongation.
      const own = LABELS.find((l) => l.re.test(plain));
      // A held label carries down its own column and no other. A sheet prints its marketing bullets beside the
      // table, extraction interleaves the two by line, and a label that carried across the page read "• 10% glass
      // fiber" as a tensile elongation of 10%. A row of the same table starts where its label starts.
      const under = !own && held && Math.abs((line.x0 ?? 0) - heldX) <= 24 && heldFor < 3;
      // A heading and the row under it may name a property that neither names alone.
      const together = !own && prefix && Math.abs((line.x0 ?? 0) - prefixX) <= 24
        ? LABELS.find((l) => l.re.test(`${prefix} ${plain}`.replace(/\s+/g, ' ').trim())) : null;
      const carried0 = under ? together ?? held : together;
      const heading0 = carried0 === together ? prefix : heldLabel;
      const carry = Boolean(carried0);
      // A printing guide names settings, not properties, so its rows are read without a property label: what a
      // sheet calls its nozzle temperature is its own words, and the profile parsers read those.
      // A property row is read wherever it stands on the page. Suppressing them by section lost the second
      // density of the PET-G ESD sheet, which is printed under the printing guide; a section is unreliable on a
      // two-column page, and what makes a line a result is that it names a property and a value in that
      // property's own unit. The section only decides how a line that is not a result is explained.
      const read = readRow(line.text, registry, carry ? carried0 : null);
      if (!read && section !== 'properties') {
        const storage = /\bstor|shelf|humid|moisture|dry room|keep out|desiccan|seal|vacuum|packag/i.test(plain);
        if (/\d/.test(plain)) skipped.push({ page: page.page, text: line.text.slice(0, 160), reason: section === 'print' ? 'in the printing guide, naming no setting the lexicon knows'
          : storage ? 'a storage or shelf-life note, not a test result' : 'in the column beside the storage note, naming no property and value together' });
        continue;
      }
      const carried = Boolean(carry && read);
      if (carried) heldFor += 1;
      if (own || (read && !carried)) { held = null; heldFor = 0; }
      if (!read) { if (/\d/.test(line.text)) skipped.push({ page: page.page, text: line.text.slice(0, 160), reason: 'no property and value this line states together' }); continue; }
      if (read.range) { skipped.push({ page: page.page, text: line.text.slice(0, 160), reason: 'the upper end of a range: a window, not a result' }); continue; }

      // What the row is called is the held label and the row's own words together: a sheet prints "Izod Impact
      // Strenght" once and then a row per notch, and neither line says the whole thing on its own.
      const fullLabel = carried ? `${heading0} ${read.conditions}`.replace(/\s+/g, ' ').trim() : read.label;
      // Neither line names the whole property on its own: "Tensile Strength*" heads the block and "At break 55
      // MPa" is the row, and only the two together say which tensile strength it is. So the label is matched
      // again against both, and the more specific answer wins.
      const refined = carried ? LABELS.find((l) => l.re.test(fullLabel)) : null;
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
      if (read.match.Property === 'Density' && /foam/i.test(fullLabel)) {
        skipped.push({ page: page.page, text: line.text.slice(0, 160), reason: 'the density the print reaches with foaming active, which is what the process does and not what the material is' });
        continue;
      }
      values.push({
        page: page.page, property: method?.property ?? read.match.Property, methodNote: method?.note ?? null,
        label: fullLabel, condition: carried ? fullLabel : read.conditions,
        direction: read.match.Direction, notch, read, target: read.target, line: line.text,
      });
    }
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
export function composition(text) {
  for (const page of text.pages) {
    for (const line of page.lines) {
      const m = /(\d{1,2}(?:[.,]\d)?)\s?(?:wt\.?%|%|percent)\s*(?:of\s*)?(carbon|glass|aramid|kevlar|basalt|wood|metal|mineral|graphene)\s*(fib(?:re|er)s?|powder|filler|flour)?/i.exec(line.text);
      if (m) return `${line.text.trim().slice(0, 160)} (p. ${page.page}, as the sheet states it)`;
    }
  }
  return null;
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
  const printed = String(v.condition ?? '');
  const at0 = printed.search(/[,(@]|\d/);
  const condition = (at0 > 0 ? printed.slice(at0) : printed.replace(v.read.match.re, ' '))
    .replace(/^[\s,;:@(-]+/, '').replace(/\s+/g, ' ').trim();
  // A rate is a condition of the test, not a temperature it was run at: "VICAT, 50 N (heating rate 50°C/h)".
  const withoutRate = condition.replace(/\([^)]*(?:rate|\/\s?(?:h|hr|min))[^)]*\)/gi, ' ');
  // A load is printed in MPa, in MN/m² or in N/mm², which are the same unit under three names.
  const load = /([<>≤≥]?\s*\d+(?:[.,]\d+)?\s*(?:MPa|MN\s?\/\s?m\s?2|N\s?\/\s?mm\s?2))/i.exec(withoutRate);
  // What the row says about how it was measured: the standard it names and the load it was tested under. The
  // notch, the test temperature and the property's own name have columns of their own, so repeating them here
  // would be the label in the method column again. A row that names neither keeps whatever words are left.
  const rest = withoutRate
    .replace(new RegExp(STANDARD_RE.source, 'gi'), ' ')
    .replace(/([<>≤≥]?\s*\d+(?:[.,]\d+)?\s*(?:MPa|MN\s?\/\s?m\s?2|N\s?\/\s?mm\s?2))/gi, ' ')
    .replace(/\b(un-?notched|notched)\b/gi, ' ').replace(/\b3d\s*print\w*\b/gi, ' ')
    .replace(/[,@()*<>≤≥]/g, ' ').replace(/\s+/g, ' ').trim();
  // What is left of the row's words once the standard, the load and the notch are in their own columns is either
  // a condition of the test or a piece of the property's own name that the label pattern did not reach
  // ("Temperature" from Glass Transition Temperature, ". force" from Tensile Strength at Max. force). A condition
  // states a number or names one of the things that can be done to a specimen; anything else is the name.
  const CONDITION_WORD = /\d|\b(anneal\w*|as printed|dry|dried|conditioned|wet|method|saturation|equilibrium|specimen|injection|mou?ld\w*|printed|film|strand|parallel|perpendicular|flat|edge|upright|foam\w*)\b/i;
  // A remnant that is made of the property's own vocabulary is the name, whatever else it contains: "strength -
  // charpy method" is what the sheet calls the test, and the Property column already says it.
  const LABEL_WORD = /\b(charpy|izod|impact|strength|stress|modulus|elongation|strain|temperature|softening|deflection|distortion|transition|density|gravity|hardness|absorption|content|shrinkage|resistance|conductivity|flexural|tensile|bending|melt|flow|index|rate|point|force|vicat|hdt|mfr|mvr)\b/i;
  const leftover = CONDITION_WORD.test(rest) && (/\d/.test(rest) || !LABEL_WORD.test(rest)) ? rest : '';
  const named = [...new Set([load ? load[1].replace(/\s+/g, ' ').trim() : null, leftover || null, ...v.read.standards].filter(Boolean))];
  const standardText = named.join(' ').trim();
  const standards = readStandards([condition, ...v.read.standards].join(' '));
  // What the row says was done to the specimen before it was tested, and how wet it was, in the sheet's own
  // words; the state beside each is what the build's own reader makes of those words (D49). A sheet that says
  // "HDT 0.45 MN/m2, annealed" publishes an annealed value, and a row that does not say so reads as as-printed.
  const annealWords = /\b(not annealed|unannealed|annealed|as printed)\b/i.exec(`${printed} ${v.label ?? ''}`);
  const post = annealWords ? annealWords[1].replace(/^as printed$/i, 'As printed') : NP;
  const postState = readPostProcessingState(post);
  const schedule = parseAnnealSchedule(`${printed} ${v.line ?? ''}`, postState);
  const moistureWords = /\b(dry|dried|conditioned|wet)\b/i.exec(withoutRate);
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
  const at = /(-?\d+(?:[.,]\d+)?)\s*°\s*C/i.exec(withoutRate.replace(new RegExp(STANDARD_RE.source, 'gi'), ' '));
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
    'Specimen type': v.property === 'Density' ? 'Not published (density specimen form not explicitly established)' : 'Not published (do not assume printed)',
    Direction: v.direction || 'Unstated',
    'Moisture condition': moisture, 'Moisture state': moistureState ?? 'not-stated',
    'Post-processing': post, 'Post-processing state': postState ?? 'not-stated',
    'Anneal °C': postState === 'annealed' ? (schedule?.tempC == null ? NP : String(schedule.tempC)) : NA,
    'Anneal h': postState === 'annealed' ? (schedule?.hours == null ? NP : String(schedule.hours)) : NA,
    'Test temperature': at ? `${at[1].replace(',', '.')}°C` : NP,
    'Standard / load': standardText || NP, Standards: standards.length ? standards.join('; ') : NP,
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
  const file = decodeURIComponent((row.url || '').split('?')[0].split('/').pop() ?? '')
    .replace(/\.(pdf|html?)$/i, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const name = file || (row.product_raw || '').replace(/[^A-Za-z0-9]+/g, '-');
  return `${prefix}${name}`.slice(0, 90);
}

/** The document's own title, as its head prints it, and the product name under it (D63). */
export function printedTitle(text) {
  const head = (text.pages[0]?.lines ?? []).slice(0, 6).map((l) => l.text.trim()).filter(Boolean);
  const at = head.findIndex((l) => /technical data sheet|technisches datenblatt|product data sheet|datasheet/i.test(l));
  if (at < 0) return { title: head[0] ?? '', product: head[1] ?? '' };
  const product = head.slice(at + 1).find((l) => l.length < 60 && /[A-Za-z]/.test(l)) ?? '';
  return { title: [head[at], product].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(), product };
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
  if (!plain) return null;
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

/** A document as a proposal: the source, its grade, its values, and everything left out with the reason. */
export function propose(row, text, world) {
  // The sheet says what the name often does not: which polymer, and what is in it. The first page's words are
  // enough, and they are the maker's own description rather than a catalogue title.
  const body = (text.pages[0]?.lines ?? []).map((l) => l.text).join(' ').slice(0, 2000);
  const head = printedTitle(text);
  const identity = classifyProduct(row.product_raw, { manufacturer: row.manufacturer, title: head.title, body }, world);
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
    ...(v.read.ambiguous ? { ambiguous: v.read.ambiguous } : {}),
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
      Manufacturer: row.manufacturer || row.provider, 'Product name': product || row.product_raw,
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
  if (density && identity.modifier === 'Unfilled / unspecified' && Number.isFinite(neat[0]) && Number.isFinite(neat[1])) {
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
    grades: [grade], measurements, profiles, evidence: [], headlines: [], coverage: [],
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
  const world = { materials: table('materials'), polymers: table('polymers'), grades: table('grades'), properties: table('properties'), sources: table('sources') };
  // A batch is the documents that are a sheet in their own right: not a copy of one already read, not one the
  // register already holds, and not one still waiting on a question about whether it is a copy at all.
  const SKIP = new Set(['duplicate-of', 'twin-check', 'registered', 'applied', 'unreachable', 'needs-ocr', 'gated', 'safety-data-sheet']);
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
  for (const r of rows) {
    const p = propose(r, cachedText(r.sha256), world);
    writeFileSync(join(dir, `${r.doc_key}.json`), `${JSON.stringify(p, null, 2)}\n`);
    values += p.measurements.length;
  }
  console.log(`${rows.length} proposal(s), ${values} candidate value(s) -> ${dir.replace(projectRoot + '/', '')}`);
}
