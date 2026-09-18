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
import { cachedText, columnPositions, cellsAt, joinDigits } from '../lib/pdf-text.mjs';
import { readStandards } from '../../build/src/normalize/standards.js';
import { normalizedRawValue, rawNumber } from '../../build/src/measurement-rules.js';
import { classifyProduct } from './classify.mjs';

const AUDIT = join(projectRoot, 'docs/audits/2026-09-18-v2-import');
const lexicon = (name) => readCsv(join(projectRoot, 'scripts/ingest/lexicon', `${name}.csv`)).records.map((r) => r.values);
const table = (name) => readCsv(join(projectRoot, 'data/tables', `${name}.csv`)).records.map((r) => r.values);

const LABELS = lexicon('property-labels').map((r) => ({ ...r, re: new RegExp(r.Label, 'i') }));
const UNITS = lexicon('unit-aliases');
const UNIT_PATTERN = UNITS.map((u) => u.Printed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|');
// A fresh pattern per call: a global regular expression keeps its place between calls, and sharing one made
// every second line read as though it had no value.
const valueRe = () => new RegExp(`(-?\\d+(?:[.,]\\d+)?)\\s*(${UNIT_PATTERN})`, 'gi');

// A section heading tells a value what it is: a printing guide is not a test result, and a storage note is neither.
const SECTIONS = [
  [/print(ing)? (settings|parameters|guide)|guideline for print|recommended settings/i, 'print'],
  [/storage|shelf life|packaging|drying/i, 'storage'],
  [/mechanical|thermal|physical|material propert|properties/i, 'properties'],
];

const STANDARD_RE = /\b(?:ISO|ASTM|GB\/T|DIN|IEC|UL|EN)\s?\d+[\w./-]*(?:\s?\/\s?[\w.-]+)?/gi;

// Extraction separates a superscript from its unit ("g/cm 3", "kJ/m 2") and splits digits ("2 43 3 .4"); both are
// repaired before a line is read. A standard's designation is left exactly as printed: the digits inside it are
// not a number, and joining them was what turned "ISO 527" into a fragment in the label.
const joinLocal = (t) => t.replace(/(\d) (?=\d)/g, '$1').replace(/(\d) ?\. ?(?=\d)/g, '$1.').replace(/\bO\.(?=\d)/g, '0.');
function repair(text) {
  const line = String(text ?? '').replace(/\b(cm|m|mm)\s+([23])\b/g, '$1$2');
  const out = [];
  let last = 0;
  for (const m of line.matchAll(new RegExp(STANDARD_RE.source, 'gi'))) { out.push(joinLocal(line.slice(last, m.index)), m[0]); last = m.index + m[0].length; }
  out.push(joinLocal(line.slice(last)));
  return out.join('');
}

// A rate ("10 °C/min", "2 mm/min") and a humidity ("50% RH") are conditions of a test, not its result.
const RATE_OR_CONDITION = /^\s*(\/\s*(min|h|hr|s)\b|\s*RH\b)/i;

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
    const rockwell = /\brockwell\s*([rm])\b/i.exec(line) ?? /\b([rm])[\s-]?scale\b/i.exec(line);
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
    const value = spread ? spread[1] : candidate[1];
    const uncertainty = spread ? candidate[1] : null;
    if (spread) before = before.slice(0, spread.index);
    return {
      match,
      label: before.replace(/[<>≤≥~@(,\s]+$/, '').trim(),
      conditions: before.trim(),
      uncertainty: uncertainty == null ? null : String(rawNumber(uncertainty)),
      raw: `${value}${uncertainty ? ` ± ${uncertainty}` : ''} ${candidate[2]}`.replace(/\s+/g, ' ').trim(),
      // The build's own reader decides what the digits mean: a decimal comma with one or two places, a thousands
      // comma with three ("13,085 psi" is thirteen thousand, not thirteen).
      rawNumber: String(rawNumber(value)),
      printedUnit: candidate[2], target,
      // A sheet may print the method before the value or after it, so the standards are read from the whole line.
      standards: (line.match(new RegExp(STANDARD_RE.source, 'gi')) ?? []).map((m) => m.replace(/\s+/g, ' ').trim()),
      operator: /[<>≤≥]\s*$/.test(before) ? before.trim().slice(-1).replace('≤', '<').replace('≥', '>') : '=',
      range: /[-–~]\s*$/.test(before),
      // "24.000 kg/cm2" is twenty-four thousand on a European sheet and twenty-four on an American one. Which it
      // is comes from reading the sheet, so the row says it is ambiguous and a person settles it (V000731 is the
      // precedent: the raw value records both the number and what the sheet printed).
      ambiguous: /\d[.,]\d{3}(?!\d)/.test(value) ? `"${value}" may be a thousands separator or a decimal one` : null,
    };
  }
  return null;
}

/** Every value a sheet publishes, with the page and the line it was read from. */
export function readSheet(text, registry) {
  const values = [], settings = [], skipped = [];
  for (const page of text.pages) {
    let section = 'properties';
    let held = null, heldLabel = '';
    for (const line of page.lines) {
      const heading = SECTIONS.find(([re]) => re.test(line.text) && !/\d/.test(line.text));
      if (heading) { section = heading[1]; held = null; continue; }
      const plain = repair(line.text).trim();

      // A label with no value of its own holds for the next line, which is how a sheet prints a heat deflection
      // temperature and then a row per load. It holds for one line only: a label that survived a row it did not
      // belong to once read a tensile elongation as a Charpy strength.
      // A label with nothing else on the line holds for the next one. It must have no digits at all: a hardness
      // states its value with no unit ("Shore D Hardness 43"), and testing for a unit instead threw those rows away.
      const bare = LABELS.find((l) => l.re.test(plain));
      if (bare && !/\d/.test(plain)) { held = bare; heldLabel = plain; continue; }

      // A held label carries only to a row that states a condition rather than a property of its own: a sheet
      // prints "Temperature of deflection under load" and then a row per load. It stops at the next row that
      // names something, so a label cannot drift down the page and claim a value that is not its.
      const own = LABELS.find((l) => l.re.test(plain));
      const condition = /^\s*[<>≤≥~@(]*\s*\d+(?:[.,]\d+)?\s*(MPa|N\/mm2|mn\/m2|psi|N\b)/i.test(plain);
      const carry = Boolean(held && !own && condition);
      // A printing guide names settings, not properties, so its rows are read without a property label: what a
      // sheet calls its nozzle temperature is its own words, and the profile parsers read those.
      if (section === 'print') {
        const at = plain.search(/-?\d/);
        if (at > 0 && valueRe().test(plain)) settings.push({ page: page.page, label: plain.slice(0, at).replace(/[:\s-]+$/, '').trim(), raw: plain.slice(at).trim(), line: line.text });
        else if (/\d/.test(plain)) skipped.push({ page: page.page, text: line.text.slice(0, 160), reason: 'in the printing guide, with no setting this line states' });
        continue;
      }
      if (section === 'storage') { skipped.push({ page: page.page, text: line.text.slice(0, 160), reason: 'a storage or shelf-life note, not a test result' }); continue; }

      const read = readRow(line.text, registry, carry ? held : null);
      const carried = Boolean(carry && read);
      if (own || (read && !carried)) held = null;
      if (!read) { if (/\d/.test(line.text)) skipped.push({ page: page.page, text: line.text.slice(0, 160), reason: 'no property and value this line states together' }); continue; }
      if (read.range) { skipped.push({ page: page.page, text: line.text.slice(0, 160), reason: 'the upper end of a range: a window, not a result' }); continue; }

      values.push({
        page: page.page, property: read.match.Property,
        label: carried ? `${heldLabel} ${read.conditions}`.replace(/\s+/g, ' ').trim() : read.label,
        condition: carried ? `${heldLabel} ${read.conditions}`.replace(/\s+/g, ' ').trim() : read.conditions,
        direction: read.match.Direction, notch: read.match.Notch, read, target: read.target, line: line.text,
      });
    }
  }
  return { values, settings, skipped };
}

const NUMBER = (s) => Number(String(s).replace(',', '.'));
const round = (x) => Number(Number(x).toPrecision(10));
const NA = 'Not applicable';
const NP = 'Not published';

/** One measurement row, filled the way the schema requires: raw text as printed, typed columns beside it. */
function measurementRow(v, { sourceId, materialId, gradeId }) {
  // The sheet's own words for the method: the condition the row states and the standards it names, and not the
  // other column of the page, which the line may run into.
  const standardText = [v.condition, ...v.read.standards].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const standards = readStandards(standardText);
  const load = /(\d+(?:[.,]\d+)?)\s*MPa/i.exec(v.condition);
  const normalized = round(NUMBER(v.read.rawNumber) * v.target.factor);
  return {
    MaterialID: materialId, GradeID: gradeId, Property: v.property,
    'Raw value': v.read.raw, 'Raw unit': v.read.printedUnit, 'Raw numeric': v.read.rawNumber,
    'Raw uncertainty ±': v.read.uncertainty ?? NA, 'Raw upper bound': NA, Operator: v.read.operator, 'Conversion factor': String(v.target.factor),
    'Normalized value': String(normalized),
    'Normalized uncertainty ±': v.read.uncertainty == null ? NA : String(round(NUMBER(v.read.uncertainty) * v.target.factor)),
    'Normalized upper bound': NA,
    'Normalized unit': v.target.unit, 'Data status': 'Published value',
    'Specimen type': v.property === 'Density' ? 'Not published (density specimen form not explicitly established)' : 'Not published (do not assume printed)',
    Direction: v.direction || 'Unstated',
    'Moisture condition': NP, 'Moisture state': 'not-stated', 'Post-processing': NP, 'Post-processing state': 'not-stated',
    'Anneal °C': NA, 'Anneal h': NA, 'Test temperature': NP,
    'Standard / load': standardText || NP, Standards: standards.length ? standards.join('; ') : NP,
    'Test load MPa': v.property === 'HDT' ? (load ? load[1].replace(',', '.') : NP) : NA,
    Notch: v.notch || NA, 'Specimen / print parameters': NP,
    SourceID: sourceId, Locator: `p. ${v.page}: ${v.label}`, Notes: NA, 'Parse review': NA,
  };
}

/** A document as a proposal: the source, its grade, its values, and everything left out with the reason. */
export function propose(row, text, world) {
  const identity = classifyProduct(row.product_raw, { manufacturer: row.manufacturer }, world);
  const registry = new Map((world.properties ?? []).map((p) => [p.Property, p]));
  const sheet = readSheet(text, registry);
  const sourceId = row.registered_source_id || `R-${(row.manufacturer || row.provider).toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-${row.product_raw.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 40)}-TDS`;
  const measurements = sheet.values.map((v, i) => ({
    id: `m${String(i + 1).padStart(2, '0')}`, gradeKey: 'main',
    row: measurementRow(v, { sourceId, materialId: identity.materialId ?? '', gradeId: '' }),
    evidence: { page: v.page, text: v.line.slice(0, 200) },
    confidence: identity.confidence,
    review: { status: 'proposed' },
  }));
  return {
    version: 1,
    generated: { tool: 'propose.mjs', date: new Date().toISOString().slice(0, 10) },
    document: { sha256: row.sha256, url: row.url, pages: text.pages.length, provider: row.provider, manufacturer: row.manufacturer, docKey: row.doc_key },
    identity,
    source: { row: null, review: { status: 'proposed' } },
    grades: [], measurements, profiles: [], evidence: [], headlines: [], coverage: [],
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
  const world = { materials: table('materials'), polymers: table('polymers'), grades: table('grades'), properties: table('properties') };
  const rows = readCsv(join(AUDIT, 'ledger.csv')).records.map((r) => r.values)
    .filter((r) => (doc ? r.doc_key === doc : true) && (provider ? r.provider === provider || r.manufacturer === provider : true))
    .filter((r) => r.sha256 && cachedText(r.sha256));
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
