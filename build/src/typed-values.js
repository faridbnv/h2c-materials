// Typed canonical values beside the raw text they were read from (migration m08).
//
// A print profile's nozzle, bed and chamber windows, its enclosure and drying statements and whether it
// needs a hardened nozzle, and an HDT measurement's test load, decide gates, estimates and screening.
// They used to exist only as the parser's reading of free text on every build, so a parser change could
// move a decision with no data diff, and a mis-read could only be fixed by changing the parser.
//
// Now the reviewed value is stored in typed columns and the build uses it. The parser still runs, and is
// a check: where its reading differs from the stored value, the build stops, unless "Parse review" says
// why the stored value is right (a mis-read the parser cannot handle). Diagnostics the parser adds
// (count, tolerance, text it stripped) stay in the compiled record.

import { readMoistureState } from './normalize/moisture.js';
import { readPostProcessingState } from './normalize/specimen.js';
import { readStandards } from './normalize/standards.js';
import { readTestTemperature } from './normalize/thermal.js';

const NA = 'Not applicable';
const NP = 'Not published';

export const TEMPERATURE_AXES = [
  { axis: 'nozzle', label: 'Nozzle', raw: 'Nozzle °C' },
  { axis: 'bed', label: 'Bed', raw: 'Bed °C' },
  { axis: 'chamber', label: 'Chamber', raw: 'Chamber °C' },
];

export const PROFILE_TYPED_COLUMNS = [
  ...TEMPERATURE_AXES.map(({ label, raw }) => ({ after: raw, columns: [`${label} state`, `${label} min °C`, `${label} max °C`, `${label} requirement`] })),
  { after: 'Enclosure', columns: ['Enclosure state'] },
  { after: 'Drying', columns: ['Drying state', 'Drying need', 'Drying °C', 'Drying hours', 'Drying hours open'] },
  { after: 'Abrasion / clogging', columns: ['Hardened nozzle'] },
  { after: 'Locator', columns: ['Parse review'] },
];

export const MEASUREMENT_TYPED_COLUMNS = [
  { after: 'Moisture condition', columns: ['Moisture state'] },
  { after: 'Post-processing', columns: ['Post-processing state'] },
  { after: 'Test temperature', columns: ['Test temperature °C'] },
  { after: 'Standard / load', columns: ['Standards', 'Test load MPa'] },
  { after: 'Notes', columns: ['Parse review'] },
];

// The two states a datasheet sentence carries, with the reader that says what the sentence plainly means (m43).
export const MEASUREMENT_STATES = [
  { typed: 'Moisture state', raw: 'Moisture condition', read: readMoistureState },
  { typed: 'Post-processing state', raw: 'Post-processing', read: readPostProcessingState },
];

const cell = (v, missing = NA) => (v == null ? missing : String(v));
const value = (c) => (c == null || c === NA || c === NP ? null : Number(c));
const bool = (c) => (c === 'TRUE' ? true : c === 'FALSE' ? false : null);

/** Typed cells for one profile, from the parsers' reading of its raw text. */
export function profileCellsFromParsed({ nozzle, bed, chamber, enclosure, drying, abrasion }) {
  const out = {};
  for (const [{ label }, p] of [[TEMPERATURE_AXES[0], nozzle], [TEMPERATURE_AXES[1], bed], [TEMPERATURE_AXES[2], chamber]]) {
    const range = p.state === 'range';
    out[`${label} state`] = p.state;
    out[`${label} min °C`] = cell(p.min, range ? NP : NA);
    out[`${label} max °C`] = cell(p.max, range ? NP : NA);
    out[`${label} requirement`] = p.requirement;
  }
  out['Enclosure state'] = enclosure.state;
  out['Drying state'] = drying.state;
  out['Drying °C'] = cell(drying.tempC, drying.state === 'stated' ? NP : NA);
  out['Drying hours'] = cell(drying.hours, drying.state === 'stated' ? NP : NA);
  out['Drying need'] = drying.need;
  out['Drying hours open'] = drying.hoursOpen == null ? NA : drying.hoursOpen ? 'TRUE' : 'FALSE';
  out['Hardened nozzle'] = abrasion.requiresHardened == null ? NP : abrasion.requiresHardened ? 'TRUE' : 'FALSE';
  return out;
}

/** The typed test load of a measurement: a number, Not published (load unstated) or Not applicable. */
export const loadCellFromParsed = (h) => (h ? cell(h.loadMPa, NP) : NA);

// A Parse review explains the typed columns it names, and only those (D115). It opens with "Fields: Bed min °C, Bed max °C."
// and then says why; "Fields: none." marks a note that silences nothing. A review used to silence every typed check
// of its row, so a note written about one column hid stale values in the others (the data audit of 2026-10-01: a bed
// minimum of 3 °C read from "for 3D printers" and 24 °C from "a shelf life of 24 months" survived that way).
const REVIEW_FIELDS_RE = /^Fields:\s*([^.]*)\.\s*/;
export const PROFILE_REVIEW_COLUMNS = PROFILE_TYPED_COLUMNS.flatMap((g) => g.columns).filter((c) => c !== 'Parse review');
export const MEASUREMENT_REVIEW_COLUMNS = [...MEASUREMENT_TYPED_COLUMNS.flatMap((g) => g.columns).filter((c) => c !== 'Parse review'), 'Anneal °C', 'Anneal h'];

/** The columns a Parse review explains: null when there is no review, undefined when it names none. */
export function reviewFields(r) {
  const t = r['Parse review'];
  if (t == null || t === NA) return null;
  const m = String(t).match(REVIEW_FIELDS_RE);
  if (!m) return undefined;
  return new Set(m[1].split(',').map((x) => x.trim()).filter((x) => x && x.toLowerCase() !== 'none'));
}
const explains = (r, column) => reviewFields(r)?.has(column) ?? false;

// The typed columns of a measurement that differ from the parser's reading, whether or not a review explains them, so
// that a review naming a column that no longer differs can be found (PARSE-REVIEW-STALE). Kept per row object.
const measurementDiffers = new WeakMap();
function differs(r, column) {
  if (!measurementDiffers.has(r)) measurementDiffers.set(r, new Set());
  measurementDiffers.get(r).add(column);
  return explains(r, column);
}

/** A Parse review must name the typed columns it explains, and only columns its row has. */
export function checkReviewScope(r, issues, where, columns) {
  const fields = reviewFields(r);
  if (fields === undefined) {
    issues.push({ level: 'error', code: 'PARSE-REVIEW-SCOPE', where, message: 'Parse review names no columns; open it with "Fields: <the typed columns it explains>." or "Fields: none."' });
    return;
  }
  for (const c of fields ?? []) {
    if (!columns.includes(c)) issues.push({ level: 'error', code: 'PARSE-REVIEW-SCOPE', where, message: `Parse review names "${c}", which is not a typed column of this row (${columns.join(', ')})` });
  }
}

// The numbers a process cell states, and the endpoints its wording implies: the ends of a tolerance ("270 ± 10"), a
// Fahrenheit reading in Celsius, and room temperature where the cell says so.
function statedNumbers(text) {
  // "3D" and "24 months" are words with a number in them, not temperatures the cell states: m08 read a bed minimum of 3
  // from "for 3D printers" and 24 from "a shelf life of 24 months".
  const t = String(text ?? '').replace(/\b\d+\s*(?:D\b|months?\b|mm\b|mm\/s\b|%|h\b|hours?\b|g\b|kg\b)/gi, ' ');
  const out = (t.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  for (const x of [...out]) out.push(Math.round((x - 32) * 5 / 9));
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*[°º˚∞]?\s*[CF℃]?\s*(?:±|\+\/-|\+-)\s*(\d+(?:\.\d+)?)/g)) out.push(Number(m[1]) - Number(m[2]), Number(m[1]) + Number(m[2]));
  if (/room|ambient|\bRT\b/i.test(t)) out.push(20, 23, 25);
  return out;
}

/**
 * Overlay the stored typed values on the parsers' output for a profile, and report every difference a
 * Parse review does not explain. A printer maker's guide row (print_guide.csv, D88) has a profile's columns and is
 * checked the same way, under its own `where`. Key order of the parsed objects is kept, so the compiled record is
 * unchanged wherever the two agree.
 */
export function applyProfileTyped(r, parsed, issues, where = `profiles ${r.ProfileID}`) {
  checkReviewScope(r, issues, where, PROFILE_REVIEW_COLUMNS);
  const differs = new Set();
  const mismatch = (column, stored, read) => {
    differs.add(column);
    if (explains(r, column)) return;
    issues.push({ level: 'error', code: 'PARSE-MISMATCH', where, message: `${column} is ${stored ?? 'empty'} but the parser reads the raw text as ${read ?? 'nothing'}; correct the typed value, or explain it in Parse review` });
  };
  const COLUMN = { state: 'state', min: 'min °C', max: 'max °C', requirement: 'requirement' };
  const out = {};
  for (const { axis, label, raw } of TEMPERATURE_AXES) {
    const p = parsed[axis];
    const typed = { state: r[`${label} state`], min: value(r[`${label} min °C`]), max: value(r[`${label} max °C`]), requirement: r[`${label} requirement`] };
    for (const k of ['state', 'min', 'max', 'requirement']) if (typed[k] !== p[k]) mismatch(`${label} ${COLUMN[k]}`, typed[k], p[k]);
    // A typed endpoint is a number its own cell states, whatever a review says (D115).
    const stated = statedNumbers(r[raw]);
    for (const k of ['min', 'max']) {
      if (typed[k] != null && !stated.some((x) => Math.abs(x - typed[k]) < 0.5)) issues.push({ level: 'error', code: 'PARSE-TEXT-BOUNDS', where, message: `${label} ${COLUMN[k]} is ${typed[k]}, a number "${r[raw]}" does not state` });
    }
    // An open bound keeps its other end open: "> 80 °C" is at least 80, not 80 exactly.
    if ((p.openHigh && typed.max != null && typed.max === typed.min) || (p.openLow && typed.min != null && typed.min === typed.max)) {
      issues.push({ level: 'error', code: 'OPEN-BOUND-WINDOW', where, message: `${label} "${r[raw]}" is an open bound, but its typed window is the single point ${typed.min}` });
    }
    out[axis] = { ...p, ...typed };
  }
  const e = parsed.enclosure;
  if (r['Enclosure state'] !== e.state) mismatch('Enclosure state', r['Enclosure state'], e.state);
  out.enclosure = { ...e, state: r['Enclosure state'] };

  const d = parsed.drying;
  const drying = { state: r['Drying state'], need: r['Drying need'], tempC: value(r['Drying °C']), hours: value(r['Drying hours']), hoursOpen: bool(r['Drying hours open']) };
  for (const [k, column] of [['state', 'Drying state'], ['need', 'Drying need'], ['tempC', 'Drying °C'], ['hours', 'Drying hours'], ['hoursOpen', 'Drying hours open']]) if (drying[k] !== d[k]) mismatch(column, drying[k], d[k]);
  out.drying = { ...d, ...drying, required: drying.need === 'required' };

  const a = parsed.abrasion;
  const hardened = bool(r['Hardened nozzle']);
  if (hardened !== a.requiresHardened) mismatch('Hardened nozzle', hardened, a.requiresHardened);
  out.abrasion = { ...a, requiresHardened: hardened, state: hardened == null ? a.state : 'stated' };
  // A review that explains a difference the parser no longer makes would silence the next one (a parser that learns a
  // spelling, or an edit to the cell, leaves it behind).
  for (const c of reviewFields(r) ?? []) {
    if (PROFILE_REVIEW_COLUMNS.includes(c) && !differs.has(c)) issues.push({ level: 'error', code: 'PARSE-REVIEW-STALE', where, message: `Parse review explains ${c}, which agrees with the parser's reading; take it out of the review's Fields` });
  }
  return out;
}

/**
 * The typed annealing schedule of a measurement (Anneal °C, Anneal h), checked against its Post-processing wording: a
 * number, Not published (annealed, schedule not stated) or Not applicable (not annealed).
 */
export function applyAnnealTyped(r, parsed, issues) {
  const typed = { tempC: value(r['Anneal °C']), hours: value(r['Anneal h']) };
  const read = parsed ?? { tempC: null, hours: null };
  const stateCell = (v, annealed) => (v != null ? String(v) : annealed ? NP : NA);
  for (const [k, column] of [['tempC', 'Anneal °C'], ['hours', 'Anneal h']]) {
    const expected = stateCell(read[k], !!parsed);
    if (r[column] !== expected && typed[k] !== read[k] && !differs(r, column)) {
      issues.push({ level: 'error', code: 'PARSE-MISMATCH', where: `measurements ${r.MeasurementID}`, message: `${column} is ${r[column] ?? 'empty'} but the parser reads "${r['Post-processing']}" as ${expected}; correct the typed value, or explain it in Parse review` });
    }
  }
  return parsed ? typed : null;
}

/**
 * Check a measurement's typed states against the source's own words. The column decides, always: a wording is a
 * sentence from a datasheet, and a new one must never stop the build (that was the cost of declaring the state in a
 * vocabulary, m43). Where the words say plainly what the state is and the column says otherwise, the build stops
 * unless Parse review explains it.
 */
export function applyStateTyped(r, issues) {
  checkReviewScope(r, issues, `measurements ${r.MeasurementID}`, MEASUREMENT_REVIEW_COLUMNS);
  for (const { typed, raw, read } of MEASUREMENT_STATES) {
    const expected = read(r[raw]);
    if (expected != null && r[typed] !== expected && !differs(r, typed)) {
      issues.push({ level: 'error', code: 'PARSE-MISMATCH', where: `measurements ${r.MeasurementID}`, message: `${typed} is ${r[typed] ?? 'empty'} but the source's words "${r[raw]}" read as ${expected}; correct the typed value, or explain it in Parse review` });
    }
  }
}

/**
 * The standards a measurement names, from its typed list, checked against the reader's view of the raw text. The
 * stored list decides, so a reader that learns a new spelling shows its effect as a diff rather than moving a value.
 */
export function applyStandardsTyped(r, issues) {
  const stored = r.Standards === NP ? [] : String(r.Standards ?? '').split(';').map((x) => x.trim()).filter(Boolean);
  const read = readStandards(r['Standard / load']);
  if (stored.join('; ') !== read.join('; ') && !differs(r, 'Standards')) {
    issues.push({ level: 'error', code: 'PARSE-MISMATCH', where: `measurements ${r.MeasurementID}`, message: `Standards is ${stored.join('; ') || NP} but the parser reads "${r['Standard / load']}" as ${read.join('; ') || 'no standard'}; correct the typed value, or explain it in Parse review` });
  }
  return stored;
}

/** Overlay the stored test load on the HDT parser's reading. */
export function applyLoadTyped(r, h, issues) {
  const load = value(r['Test load MPa']);
  if (load !== h.loadMPa && !differs(r, 'Test load MPa')) {
    issues.push({ level: 'error', code: 'PARSE-MISMATCH', where: `measurements ${r.MeasurementID}`, message: `Test load MPa is ${load ?? 'Not published'} but the parser reads "${r['Standard / load']}" as ${h.loadMPa ?? 'no stated load'}; correct the typed value, or explain it in Parse review` });
  }
  return load === h.loadMPa ? h : { ...h, loadMPa: load, loadStated: load !== null, label: load === null ? 'load not stated' : `${load} MPa (reviewed)` };
}

/** The typed cell for a Test temperature wording: the number it states, else Not published (m175). */
export const testTemperatureCell = (text) => cell(readTestTemperature(text), NP);

/**
 * The stored test temperature of a measurement in °C, or null where the source states none as a number (m175, D92),
 * checked against the Test temperature wording. The column decides; the reader is the check.
 */
export function applyTestTemperatureTyped(r, issues) {
  const stored = value(r['Test temperature °C']);
  const read = readTestTemperature(r['Test temperature']);
  if (stored !== read && !differs(r, 'Test temperature °C')) {
    issues.push({ level: 'error', code: 'PARSE-MISMATCH', where: `measurements ${r.MeasurementID}`, message: `Test temperature °C is ${r['Test temperature °C'] ?? 'empty'} but the parser reads "${r['Test temperature']}" as ${read ?? NP}; correct the typed value, or explain it in Parse review` });
  }
  return stored;
}

/**
 * A measurement's Parse review that names a column which agrees with the parser's reading explains a difference that is
 * gone, and would silence the next one (D115, as for a print profile). Called once every typed check of the row has run.
 */
export function checkMeasurementReviewStale(r, issues) {
  const seen = measurementDiffers.get(r) ?? new Set();
  for (const c of reviewFields(r) ?? []) {
    if (MEASUREMENT_REVIEW_COLUMNS.includes(c) && !seen.has(c)) issues.push({ level: 'error', code: 'PARSE-REVIEW-STALE', where: `measurements ${r.MeasurementID}`, message: `Parse review explains ${c}, which agrees with the parser's reading; take it out of the review's Fields` });
  }
}
