#!/usr/bin/env node
// The reader round's proposals: what the reconciler sorted as new or contradicting (read-reconcile.mjs), turned into the
// files a migration applies (scripts/migrate/read-proposals-apply.mjs), and into the list of what is held back and why.
//
//   npm run ingest:read-proposals -- --run docs/audits/2026-10-04-reader-round/reconcile/<run> [--out <dir>]
//
// Output, in docs/audits/2026-10-04-reader-round/proposals/<run>/ (nothing here writes data/):
//
//   profiles-add.csv        one profile per (product, source) whose print settings the tables lack
//   profiles-set.csv        cells of a held profile that is Not published (or that the page contradicts)
//   values-add.csv          values the page prints and no row holds, in m298's add format
//   values-set.csv          values a held row has wrong, one cell per row, in m298's set format
//   page-context-add.csv    headings and footnotes that state conditions for the values beneath them
//   held.csv                every reading not proposed, with every reason
//   duplicates.csv          readings that repeat another by (source, page, product, field, numbers, conditions)
//   summary.md              counts by file, gate and field, and the reasons readings were held
//
// A row is `ready` when the page's text layer, reading order or OCR bears it out (Presence text, block or ocr), or an
// independent second reading agrees (SecondRead agreed). A low-confidence row, and a row a second reading disagrees
// with, is always held. The migration-ready files hold ready rows only. Every file carries its `gate` column, and
// the apply helper stops on a row that is not `ready`.
//
// Nothing is guessed. A reader's word that maps to no vocabulary value, a unit with no conversion, a number the raw
// text does not begin with, a quote the cached sheet does not print: the reading is held with that reason. Typed
// profile cells are the parsers' reading of the raw cell (typedOf); a profile whose parsed numbers disagree with the
// reader's is flagged `parsed_vs_read` and held.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { csvText, readCsv } from '../../build/src/csv.js';
import { projectRoot } from './context.mjs';
import { NP, numbersIn, ocrSidecar, readTable, sameNumber, squash } from './read-common.mjs';
import { notchOf, targetUnit } from './propose.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { rawNumber, unitKey } from '../../build/src/measurement-rules.js';
import { readStandards } from '../../build/src/normalize/standards.js';
import { parseHdtStandard, readTestTemperature } from '../../build/src/normalize/thermal.js';
import { readMoistureState } from '../../build/src/normalize/moisture.js';
import { parseAnnealSchedule, readPostProcessingState } from '../../build/src/normalize/specimen.js';
import { loadCellFromParsed, testTemperatureCell } from '../../build/src/typed-values.js';
import { TYPED, typedOf } from '../migrate/m290-profile-settings.mjs';

const NA = 'Not applicable';
/** Reasons are joined with this in held.csv: a reason may hold spaces and colons. */
export const REASON_SEP = ' || ';
const text = (v) => String(v ?? '').trim();
const num = (v) => { if (v == null || v === '') return null; const n = Number(String(v).replace(',', '.').replace(/\s/g, '')); return Number.isFinite(n) ? n : null; };
/** The migration's number format (m298): twelve significant digits, so 5.731 is 5.731 and not 5.731000000000001. */
export const NUM = (x) => String(Number(Number(x).toPrecision(12)));
const isMissing = (v) => v == null || v === '' || /^Not (published|applicable)/i.test(String(v));

// ---- the gate ---------------------------------------------------------------------------------------------------

export const READY_PRESENCE = ['text', 'block', 'ocr'];
export const AGREED = ['agreed', 'agreed-reader'];

/** `ready`, or `held` with why: low confidence and a disagreeing second reading always hold; otherwise a page that bears the row out, or a second reading that agrees, passes. */
export function gateOf(row) {
  if (row.Confidence === 'low') return { gate: 'held', reason: 'gate:low-confidence' };
  if (row.SecondRead === 'disagrees') return { gate: 'held', reason: 'gate:second-read-disagrees' };
  if (READY_PRESENCE.includes(row.Presence) || AGREED.includes(row.SecondRead)) return { gate: 'ready' };
  return { gate: 'held', reason: row.SecondRead === 'pending' ? 'gate:visual-only-awaiting-second-read' : 'gate:visual-only' };
}

// ---- the sheet guard, as the migrations apply it ----------------------------------------------------------------

const sheetTexts = new Map();
/** Is every piece of the quote (split on " | ") on the cached sheet, or on its OCR sidecar, as onSheet reads it? null when no text is cached. */
export function quoteOnCachedSheet(sha, quote) {
  if (!sha) return null;
  if (!sheetTexts.has(sha)) {
    const c = cachedText(sha);
    const ocr = ocrSidecar(sha);
    sheetTexts.set(sha, {
      cache: c ? squash(c.pages.map((p) => p.lines.map((l) => l.text).join(' ')).join(' ')) : null,
      ocr: ocr ? squash([...ocr.values()].map((lines) => lines.join(' ')).join(' ')) : null,
    });
  }
  const { cache, ocr } = sheetTexts.get(sha);
  if (cache == null && ocr == null) return null;
  const pieces = String(quote ?? '').split(' | ');
  return pieces.every((q) => (cache != null && cache.includes(squash(q))) || (ocr != null && ocr.includes(squash(q))));
}

// ---- mapping the reader's words to the vocabularies --------------------------------------------------------------

const SPECIMEN_FILM = 'Film specimen (ASTM D882); not a printed or moulded bar';

/** Specimen type from the reader's word, else from the table heading it sat under, else the unstated value the import writes. */
export function specimenOf(row, property) {
  const said = text(row.Specimen).toLowerCase();
  const heading = text(row.TableHeading);
  if (said) {
    if (/print/.test(said)) return { value: 'Printed specimen' };
    if (/inject|mou?ld/.test(said)) return { value: 'Raw material value' };
    if (/film/.test(said)) return { value: SPECIMEN_FILM };
    if (/filament|strand/.test(said)) return { value: 'Filament' };
    return { error: `specimen-unmapped:${row.Specimen}` };
  }
  if (/injection mou?ld/i.test(heading)) return { value: 'Raw material value' };
  if (/\b3d[- ]?print|printed/i.test(heading)) return { value: 'Printed specimen' };
  return { value: property === 'Density' ? 'Not published (density specimen form not explicitly established)' : 'Not published (do not assume printed)' };
}

const DIRECTION_BEARING = /^(Tensile|Elongation|Flexural|Charpy|Izod|Impact|Compression strength|Interlayer|Fatigue|Tear|Mould shrinkage)/;
const TENSILE_LIKE = /^(Tensile|Elongation|Interlayer)/;

/** Direction from the reader's words; empty words give Unstated where the property has a direction, Not applicable where it has none. */
export function directionOf(words, property, specimenValue) {
  const w = text(words).toLowerCase().replace(/[–—]/g, '-');
  if (!w) {
    if (specimenValue === 'Raw material value') return { value: NA };
    return { value: DIRECTION_BEARING.test(property) ? 'Unstated' : NA };
  }
  if (/vertical\s*xz/.test(w)) return { value: 'Vertical XZ (source label)' };
  if (/^x\s*-?\s*y\b|^xy\b|\bflat\b/.test(w)) return { value: 'XY' };
  if (/^x\s*-?\s*z\b|^xz\b/.test(w)) return { value: 'XZ' };
  if (/^z\s*-?\s*x\b|^zx\b/.test(w)) return { value: 'ZX' };
  if (/^z(?![a-z])|\bz[- ]?axis\b/.test(w)) return { value: 'Z' };
  if (/\bupright\b|\bstanding\b/.test(w)) return { value: TENSILE_LIKE.test(property) ? 'Z' : 'ZX' };
  if (/parallel|in flow direction|along (the )?flow/.test(w) && !/perpendicular|normal/.test(w)) return { value: 'Along flow' };
  if (/normal|perpendicular|transverse|across (the )?flow/.test(w)) return { value: 'Stated, not a usable direction' };
  if (/\bhorizontal\b/.test(w)) return { value: 'Horizontal (source label)' };
  return { error: `direction-unmapped:${words}` };
}

/** Moisture condition (the words as printed) and Moisture state, checked against the parser that guards the pair. */
export function moistureOf(words) {
  const w = text(words);
  if (!w) return { condition: NP, state: 'not-stated' };
  const lower = w.toLowerCase();
  const dry = /^(dry|dried)\b|\bdam\b|dry as mou?lded|(^|\s)0\s?%\s?r\.?h|oven.?dried/.test(lower);
  const wet = /conditioned|\d+\s*%\s*r\.?\s?h|\bwet\b|saturat|immers|humid|equilibr|ambient/.test(lower);
  if (dry && wet) return { error: `moisture-ambiguous:${words}` };
  if (!dry && !wet) return { error: `moisture-unmapped:${words}` };
  const state = dry ? 'dry' : 'conditioned';
  const parsed = readMoistureState(w);
  if (parsed != null && parsed !== state) return { error: `moisture-contradicts-parser:${words}` };
  return { condition: w, state };
}

/** Post-processing words, its state, and the anneal schedule the words state (the parser's, which the build checks). */
export function postProcessingOf(words) {
  const w = text(words);
  if (!w) return { text: NP, state: 'not-stated', tempC: NA, hours: NA };
  let state = readPostProcessingState(w);
  if (state == null && /as.?printed|no (post|anneal)|without (post|anneal)/i.test(w)) state = 'as-printed';
  if (state == null) return { error: `post-processing-unmapped:${words}` };
  if (state !== 'annealed') return { text: w, state, tempC: NA, hours: NA };
  const schedule = parseAnnealSchedule(w, 'annealed');
  return { text: w, state, tempC: schedule?.tempC != null ? String(schedule.tempC) : NP, hours: schedule?.hours != null ? String(schedule.hours) : NP };
}

/** The reader's `key=value; key=value` conditions: temperatures, loads, and the rest in the order printed. */
export function conditionsOf(conditions) {
  const out = { temp: [], load: [], notch: [], other: [] };
  for (const piece of text(conditions).split(';').map((p) => p.trim()).filter(Boolean)) {
    const m = /^([A-Za-z][\w ]*?)\s*=\s*(.+)$/.exec(piece);
    if (!m) { out.other.push(piece); continue; }
    const key = m[1].toLowerCase();
    if (key === 'temp' || key === 'temperature') out.temp.push(m[2].trim());
    else if (key === 'load') out.load.push(m[2].trim());
    else if (key === 'notch') out.notch.push(m[2].trim());
    else out.other.push(`${m[1].trim()}=${m[2].trim()}`);
  }
  return out;
}

const IMPACT = new Set(['Charpy strength', 'Izod impact strength', 'Izod strength', 'Impact strength']);

/** Notch for an impact property: the row's own word, then the label, then the method's designation; Not published when none says. */
export function notchFor(property, row, conditions) {
  if (!IMPACT.has(property)) return { value: NA };
  const word = (s) => { const t = text(s).toLowerCase(); return /un-?notched/.test(t) ? 'Unnotched' : /notched/.test(t) ? 'Notched' : null; };
  const own = word(conditions.notch[0]) ?? word(row.Label);
  const method = notchOf([row.Standard, row.TestConditions].join(' '));
  if (own && method && own !== method) return { error: `notch-contradicts:${own}/${method}` };
  return { value: own ?? method ?? NP };
}

/** The unit of a hardness value the reader printed without one: the scale in the value ("90A") or the conditions (scale=R). */
function hardnessUnit(row, conditions) {
  const m = /^\s*[<>]?\s*\d+(?:[.,]\d+)?\s*(?:Shore\s*)?([AD])\b/i.exec(row.Raw) ?? /\bShore\s*([AD])\b/i.exec(`${row.Label} ${row.Unit}`);
  if (m) return `Shore ${m[1].toUpperCase()}`;
  const scale = /^scale=([RM])\b/i.exec(conditions.other.find((o) => /^scale=/i.test(o)) ?? '');
  return scale ? `Rockwell ${scale[1].toUpperCase()}` : null;
}

const cleanUnit = (u) => text(u).replace(/[˚º]/g, '°').replace(/\s+/g, ' ').replace(/^(?:deg ?)?C$/i, '°C');

// ---- values ------------------------------------------------------------------------------------------------------

export const HEADLINE_PROPERTY = /^(Density|Tensile modulus|Tensile strength \(endpoint unspecified\)|Tensile yield strength|Tensile break strength|Elongation at break|HDT|Glass transition temperature)$/;

/** Is this value one a headline reads: the listed properties, and Charpy or Izod only where notched? */
export const isHeadline = (property, notch) => HEADLINE_PROPERTY.test(property) || (/^(Charpy|Izod)/.test(property) && notch === 'Notched');

/** The unit pair and factor for a printed unit, by the conversion table the import uses. */
function unitFor(row, property, registry, conditions) {
  let printed = cleanUnit(row.Unit);
  const units = text(registry.get(property)?.Units).split(';').map((u) => u.trim());
  if (!printed) {
    if (property === 'Hardness') printed = hardnessUnit(row, conditions) ?? '';
    else if (units.includes('Dimensionless')) return { rawUnit: NP, unit: 'Dimensionless', factor: 1 };
    if (!printed) return { error: 'unit-missing' };
  }
  const target = targetUnit(property, printed, registry);
  if (!target) return { error: `unit-unconvertible:${printed}` };
  return { rawUnit: printed, unit: target.unit, factor: target.factor };
}

/** One value the page prints, as a values-add row; or { error } saying why it cannot be proposed. */
export function valueProposal(row, { registry, grade }) {
  const property = row.Field;
  const prop = registry.get(property);
  if (!prop) return { error: `property-unknown:${property}` };
  if (!isMissing(prop['Replaced by'])) return { error: `property-replaced:${prop['Replaced by']}` };
  if (!['', '=', '<', '>'].includes(row.Operator)) return { error: `operator-unmapped:${row.Operator}` };
  const lo = num(row.Lo), hi = num(row.Hi);
  if (lo == null) return { error: 'no-number' };
  let raw = text(row.Raw);
  if (!raw) return { error: 'no-raw-text' };
  // A value cell that leads with words ("Tg of 147C") is recorded from its number, the part the sheet prints as the value.
  if (rawNumber(raw) !== lo) {
    const at = new RegExp(`(?<![\\d.,])${String(row.Lo).replace('.', '[.,]')}(?![\\d])`).exec(raw);
    const trimmed = at ? raw.slice(at.index) : null;
    if (trimmed && rawNumber(trimmed) === lo) raw = trimmed;
    else return { error: `raw-numeric-disagrees:${rawNumber(raw)}/${lo}` };
  }
  const conditions = conditionsOf(row.TestConditions);
  const u = unitFor(row, property, registry, conditions);
  if (u.error) return u;
  const specimen = specimenOf(row, property);
  if (specimen.error) return specimen;
  const direction = directionOf(row.Direction, property, specimen.value);
  if (direction.error) return direction;
  const notch = notchFor(property, row, conditions);
  if (notch.error) return notch;
  const moisture = moistureOf(row.Moisture);
  if (moisture.error) return moisture;
  const post = postProcessingOf(row.PostProcessing);
  if (post.error) return post;
  if (conditions.temp.length > 1) return { error: `conditions-ambiguous:temp=${conditions.temp.join(',')}` };
  if (conditions.load.length > 1 && property !== 'Melt mass-flow rate') return { error: `conditions-ambiguous:load=${conditions.load.join(',')}` };

  const operator = row.Operator || (/^\s*>/.test(raw) ? '>' : /^\s*</.test(raw) ? '<' : '=');
  const normalized = NUM(lo * u.factor);
  const out = {
    Property: property, 'Raw value': raw, 'Raw unit': u.rawUnit, 'Raw numeric': NUM(lo), 'Conversion factor': NUM(u.factor), 'Normalized value': normalized,
    'Normalized unit': u.unit, Operator: operator, 'Specimen type': specimen.value, Direction: direction.value, Notch: notch.value,
    'Moisture condition': moisture.condition, 'Moisture state': moisture.state, 'Post-processing': post.text, 'Post-processing state': post.state,
    'Anneal °C': post.tempC, 'Anneal h': post.hours, 'Raw upper bound': NA, 'Normalized upper bound': NA, 'Raw uncertainty ±': NA, 'Normalized uncertainty ±': NA,
  };
  if (hi != null && hi !== lo) { out['Raw upper bound'] = NUM(hi); out['Normalized upper bound'] = NUM(hi * u.factor); }
  const pm = /(?:±|\+\/-)\s*(\d+(?:[.,]\d+)?)/.exec(raw);
  if (pm) { const spread = Number(pm[1].replace(',', '.')); out['Raw uncertainty ±'] = NUM(spread); out['Normalized uncertainty ±'] = NUM(spread * u.factor); }

  // The test temperature the row names, and the rest of its test conditions, which are part of the method it states.
  out['Test temperature'] = conditions.temp[0] ?? NP;
  const standard = [text(row.Standard), ...conditions.load.map((l) => (squash(row.Standard).includes(squash(l)) ? '' : l)), ...conditions.other.filter((o) => !/^scale=/i.test(o) || property !== 'Hardness')].filter(Boolean);
  out['Standard / load'] = standard.join('; ') || NP;
  out['Test temperature °C'] = testTemperatureCell(out['Test temperature']);
  if (out['Test temperature'] !== NP && readTestTemperature(out['Test temperature']) == null) out['Test temperature °C'] = NP;
  out.Standards = readStandards(out['Standard / load']).join('; ') || NP;
  out['Test load MPa'] = NA;
  if (property === 'HDT') {
    const h = parseHdtStandard(out['Standard / load']);
    out['Test load MPa'] = loadCellFromParsed(h);
    const said = conditions.load.map((l) => num((/([\d.,]+)\s*MPa/i.exec(l) ?? [])[1])).find((n) => n != null);
    if (said != null && h.loadMPa !== said && !(h.loadMPa != null && sameNumber(h.loadMPa, said))) return { error: `load-unparsed:${said} MPa read as ${h.loadMPa ?? 'none'}` };
  }
  out['Specimen / print parameters'] = NP;
  out.decision = isHeadline(property, notch.value) ? 'headline' : '';
  out.facts = { grade, direction: row.Direction, moisture: text(row.Moisture), post: text(row.PostProcessing), temp: conditions.temp[0] ?? '', notch: conditions.notch[0] ?? '', heading: text(row.TableHeading), standard: text(row.Standard) };
  return out;
}

// ---- profile settings --------------------------------------------------------------------------------------------

export const SETTING_COLUMN = {
  nozzle: 'Nozzle °C', bed: 'Bed °C', chamber: 'Chamber °C', enclosure: 'Enclosure', drying: 'Drying',
  nozzle_diameter: 'Nozzle diameter', plate: 'Plate', hardened_nozzle: 'Abrasion / clogging',
};
/** Settings that belong to the product, not to one print recipe of its sheet. */
const GATE_FIELDS = ['nozzle', 'bed', 'chamber', 'enclosure', 'drying', 'hardened_nozzle'];
const PRODUCT_WIDE = ['drying', 'enclosure', 'plate', 'nozzle_diameter', 'hardened_nozzle'];
const CJK = /[぀-ヿ㐀-鿿]/;
const NO_VALUE = /^[\s\-–—*]*$|^n\/?a\.?$/i;

/** The raw cell a setting row gives a profile: the reader's text as printed (full-width punctuation plain outside Chinese), a drying row with its hours. */
export function cellOf(row) {
  let raw = text(row.Raw);
  if (!CJK.test(raw)) raw = raw.replace(/，/g, ',').replace(/；/g, ';').replace(/：/g, ':').replace(/（/g, '(').replace(/）/g, ')');
  if (row.Field === 'drying') {
    const hours = /hours?\s*=\s*([\d.,\- –]+)/i.exec(text(row.TestConditions));
    if (hours && raw && !/\b\d+(?:[.,]\d+)?\s*(?:h|hr|hrs|hours?)\b/i.test(raw)) raw = `${raw}, ${hours[1].trim()} h`;
  }
  return raw;
}

const hoursNumbers = (conditions) => { const m = /hours?\s*=\s*([\d.,\- –]+)/i.exec(text(conditions)); return m ? numbersIn(m[1]) : []; };

/** Do the parsers' numbers for a raw cell agree with the ones the reader gave? 'agrees', or why not. */
export function parsedVsRead(field, row, typed, raw) {
  const lo = num(row.Lo), hi = num(row.Hi) ?? lo;
  const cellNum = (c) => (c == null || /^Not /.test(String(c)) ? null : Number(c));
  if (['nozzle', 'bed', 'chamber'].includes(field)) {
    const label = { nozzle: 'Nozzle', bed: 'Bed', chamber: 'Chamber' }[field];
    const min = cellNum(typed[`${label} min °C`]), max = cellNum(typed[`${label} max °C`]);
    if (lo == null) return min == null && max == null ? 'agrees' : `disagrees: parser reads ${min}-${max}, reader read no number`;
    return min === lo && max === hi ? 'agrees' : `disagrees: parser reads ${min}-${max}, reader read ${lo}-${hi}`;
  }
  if (field === 'drying') {
    const temp = cellNum(typed['Drying °C']), hours = cellNum(typed['Drying hours']);
    const reader = [lo, hi].filter((n) => n != null);
    if (!reader.length) { if (temp != null) return `disagrees: parser reads ${temp} °C, reader read no temperature`; }
    else if (temp == null || !reader.includes(temp)) return `disagrees: parser reads ${temp} °C, reader read ${reader.join('-')}`;
    const rh = hoursNumbers(row.TestConditions);
    if (rh.length) { if (hours == null || !rh.includes(hours)) return `disagrees: parser reads ${hours} h, reader read ${rh.join('-')}`; }
    else if (hours != null) return `disagrees: parser reads ${hours} h, reader read none`;
    return 'agrees';
  }
  if (field === 'enclosure') return typed['Enclosure state'] === 'unknown' ? 'disagrees: parser reads no enclosure statement' : 'agrees';
  if (field === 'hardened_nozzle' && /copper|stainless|brass/i.test(raw)) return 'disagrees: names a softer nozzle metal beside the hardened one; the parser cannot tell which is advised';
  if (field === 'hardened_nozzle') return typed['Hardened nozzle'] === NP ? 'disagrees: parser reads no statement on the nozzle' : 'agrees';
  if (field === 'nozzle_diameter') return lo != null && numbersIn(raw).some((n) => sameNumber(n, lo)) ? 'agrees' : 'disagrees: no diameter number';
  return 'agrees';
}

const TYPED_COLUMNS = Object.values(TYPED).flat();
const CELL_COLUMNS = Object.values(SETTING_COLUMN);

/** The typed cells of a profile with only these raw cells, by the parsers the build uses. */
export function typedFor(cells) {
  const base = Object.fromEntries(CELL_COLUMNS.map((c) => [c, NP]));
  return typedOf({ ...base, ...cells });
}

// ---- the build ---------------------------------------------------------------------------------------------------

const PRESENCE_RANK = { text: 0, block: 1, ocr: 2, 'visual-only': 3 };
const dedupeKey = (r) => [r.SourceID, r.Page, r.Grade || squash(r.Product), r.Field, r.Lo, r.Hi, squash(r.Direction), squash(r.Moisture), squash(r.PostProcessing), r.Lo === '' ? squash(r.Raw) : ''].join('\u0001');
const rank = (r) => [gateOf(r).gate === 'ready' ? 0 : 1, PRESENCE_RANK[r.Presence] ?? 4, r.Confidence === 'high' ? 0 : 1];
const byRank = (a, b) => { const x = rank(a), y = rank(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return String(a.RowID).localeCompare(String(b.RowID), 'en', { numeric: true }); };

const gradeIdsOf = (source) => new Set(String(source?.['Applicable grades'] ?? '').match(/G\d{3}-(?:R)?\d+/g) ?? []);

/**
 * Build every proposal from reconciled rows. `ctx.quoteOnSheet(sourceId, quote)` returns true, false, or null (no text cached);
 * `ctx.numberOnPage(sourceId, page, number)` the same for a number printed on a page.
 */
export function buildProposals({ rows, tables, ctx = {}, today = new Date().toISOString().slice(0, 10) }) {
  const grades = new Map(tables.grades.map((g) => [g.GradeID, g]));
  const sources = new Map(tables.sources.map((s) => [s.SourceID, s]));
  const registry = new Map(tables.properties.map((p) => [p.Property, p]));
  const numberOnPage = ctx.numberOnPage ?? (() => null);
  const live = (p) => p.Profile !== 'Retired duplicate record';
  const profilesBySource = new Map();
  for (const p of tables.profiles.filter(live)) { if (!profilesBySource.has(p.SourceID)) profilesBySource.set(p.SourceID, []); profilesBySource.get(p.SourceID).push(p); }
  const formulation = (gradeId) => {
    const key = grades.get(gradeId)?.['Shared formulation key'];
    return key && !isMissing(key) ? [...grades.values()].filter((g) => g['Shared formulation key'] === key).map((g) => g.GradeID) : [gradeId];
  };

  const out = { profilesAdd: [], profilesSet: [], valuesAdd: [], valuesSet: [], pageContextAdd: [], held: [], duplicates: [] };
  const locatorAdds = new Map();
  const noteWhere = (profile, proposal) => {
    if (!locatorAdds.has(profile.ProfileID)) locatorAdds.set(profile.ProfileID, { profile, wheres: new Set(), base: proposal.base });
    locatorAdds.get(profile.ProfileID).wheres.add(proposal.where);
  };
  const hold = (row, reasons, stage, detail = '') => out.held.push({ gate: 'held', reason: [].concat(reasons).join(REASON_SEP), stage, RowID: row.RowID, SourceID: row.SourceID, Page: row.Page, Grade: row.Grade, Product: row.Product, Field: row.Field, Label: row.Label, Raw: row.Raw, Presence: row.Presence, SecondRead: row.SecondRead, Confidence: row.Confidence, Reader: row.Reader, Detail: detail });

  // -- 0. one reading of each thing: the same place, number and conditions read twice is read once
  const seen = new Map();
  const considered = [];
  for (const r of [...rows].sort(byRank)) {
    const key = dedupeKey(r);
    if (seen.has(key)) { out.duplicates.push({ RowID: r.RowID, KeptRowID: seen.get(key), SourceID: r.SourceID, Page: r.Page, Grade: r.Grade || r.Product, Field: r.Field, Raw: r.Raw, Reader: r.Reader }); continue; }
    seen.set(key, r.RowID);
    considered.push(r);
  }
  considered.sort((a, b) => String(a.RowID).localeCompare(String(b.RowID), 'en', { numeric: true }));

  const soleGrade = (sourceId) => {
    const ids = gradeIdsOf(sources.get(sourceId));
    for (const g of grades.values()) if (g.SourceID === sourceId) ids.add(g.GradeID);
    return ids.size === 1 ? [...ids][0] : null;
  };
  const gradeOf = (r) => {
    const id = r.Grade || soleGrade(r.SourceID);
    if (!id) return { error: 'no-grade' };
    if (!grades.has(id)) return { error: `grade-unknown:${id}` };
    return { id };
  };
  const reasonsFor = (r, ...extra) => [gateOf(r).reason, ...extra].filter(Boolean);
  /** Why a ready reading's quote cannot be applied: not on the cached sheet, or no sheet cached. Only a ready reading is asked. */
  const quoteReason = (r) => {
    if (!ctx.quoteOnSheet || gateOf(r).gate !== 'ready') return null;
    const on = ctx.quoteOnSheet(r.SourceID, r.Quote);
    return on === true ? null : on === false ? 'quote-not-on-cached-text' : 'no-cached-text';
  };

  // -- 1. print settings
  const settingRows = considered.filter((r) => r.Kind === 'setting' && r.Class === 'new');
  const groups = new Map();
  for (const r of settingRows) {
    const reasons = [];
    const column = SETTING_COLUMN[r.Field];
    if (!column) reasons.push('no-table-column');
    if (/specimen conditions?|not a (print )?recommendation/i.test(`${r.TableHeading} ${r.Note}`)) reasons.push('specimen-condition-not-guidance');
    const grade = gradeOf(r);
    if (grade.error) reasons.push(grade.error);
    const cell = column ? cellOf(r) : '';
    if (column && NO_VALUE.test(cell)) reasons.push('no-value-printed');
    if (r.Field === 'nozzle_diameter' && num(r.Lo) == null) reasons.push('nozzle-diameter-has-no-number');
    if (!reasons.length && quoteReason(r)) reasons.push(quoteReason(r));
    const gate = gateOf(r);
    if (reasons.length || gate.gate !== 'ready') { hold(r, reasonsFor(r, ...reasons), 'profiles'); continue; }
    const key = `${grade.id}\u0001${r.SourceID}`;
    if (!groups.has(key)) groups.set(key, { gradeId: grade.id, sourceId: r.SourceID, cells: new Map() });
    const g = groups.get(key);
    const have = g.cells.get(r.Field);
    if (have) {
      if (squash(have.cell) === squash(cell)) out.duplicates.push({ RowID: r.RowID, KeptRowID: have.row.RowID, SourceID: r.SourceID, Page: r.Page, Grade: grade.id, Field: r.Field, Raw: r.Raw, Reader: r.Reader });
      else hold(r, 'conflicting-setting', 'profiles', `kept ${have.row.RowID}: ${have.cell}`);
      continue;
    }
    g.cells.set(r.Field, { cell, row: r });
  }

  const likeProfile = (gradeId) => {
    const grade = grades.get(gradeId);
    const candidates = tables.profiles.filter(live);
    const rankOf = (p) => (p.GradeID === gradeId ? 0 : p.MaterialID === grade.MaterialID ? 1 : grades.get(p.GradeID)?.Manufacturer === grade.Manufacturer ? 2 : 3);
    return candidates.map((p) => [rankOf(p), p]).sort((a, b) => a[0] - b[0] || String(a[1].ProfileID).localeCompare(String(b[1].ProfileID)))[0]?.[1] ?? null;
  };

  for (const g of groups.values()) {
    const inFormulation = formulation(g.gradeId);
    const existing = (profilesBySource.get(g.sourceId) ?? []).filter((p) => inFormulation.includes(p.GradeID));
    const entries = [...g.cells.entries()];
    if (existing.length) {
      // The formulation has a profile from this sheet: a cell it left Not published is filled in, one it holds is left to the mismatch path.
      const own = existing.filter((p) => p.GradeID === g.gradeId);
      const targets = own.length ? own : existing;
      for (const [field, { cell, row }] of entries) {
        // Several profiles of one sheet differ by print recipe: a setting of the recipe (temperatures) cannot be told apart
        // between them, but the product's drying, enclosure, plate, nozzle diameter and nozzle hardness hold for each.
        if (targets.length !== 1 && !PRODUCT_WIDE.includes(field)) { hold(row, 'multiple-profiles', 'profiles', targets.map((p) => p.ProfileID).join(' ')); continue; }
        const proposals = targets.map((target) => setCell(target, field, cell, row, { mismatch: false }));
        const done = proposals.filter((x) => !x.error);
        for (const x of done) { out.profilesSet.push(...x.rows); noteWhere(targets[proposals.indexOf(x)], x); }
        if (!done.length) hold(row, proposals[0].error, 'profiles', proposals.map((x) => x.detail ?? '').join(' ; '));
      }
      continue;
    }
    const cells = Object.fromEntries(entries.map(([field, { cell }]) => [SETTING_COLUMN[field], cell]));
    const typed = typedFor(cells);
    const verdicts = entries.map(([field, { cell, row }]) => [field, parsedVsRead(field, row, typed, cell), row]);
    const disagree = verdicts.filter(([, v]) => v !== 'agrees');
    for (const [field, v, row] of disagree) hold(row, 'parsed-vs-read', 'profiles', `${field}: ${v}`);
    if (disagree.length) {
      // The profile is proposed from the cells that agree; the typed cells are the parsers' reading of those alone.
      for (const [field] of disagree) delete cells[SETTING_COLUMN[field]];
      for (const [field] of disagree) g.cells.delete(field);
    }
    if (!Object.keys(cells).length) continue;
    if (!entries.some(([field]) => g.cells.has(field) && GATE_FIELDS.includes(field))) {
      for (const [, { row }] of g.cells) hold(row, 'profile-without-gate-setting', 'profiles', 'a new profile needs a nozzle, bed, chamber, enclosure, drying or nozzle-hardness statement');
      continue;
    }
    const like = likeProfile(g.gradeId);
    const keptEntries = [...g.cells.entries()];
    if (!like) { for (const [, { row }] of keptEntries) hold(row, 'no-like-profile', 'profiles'); continue; }
    const typedKept = typedFor(cells);
    const grade = grades.get(g.gradeId);
    const rowsUsed = keptEntries.map(([, { row }]) => row);
    out.profilesAdd.push({
      gate: 'ready', SourceID: g.sourceId, GradeID: g.gradeId, MaterialID: grade.MaterialID, like: like.ProfileID,
      Profile: /^XP-/.test(g.sourceId) ? 'Current manufacturer product guidance' : 'Manufacturer published guidance',
      ...Object.fromEntries(CELL_COLUMNS.map((c) => [c, cells[c] ?? NP])),
      Locator: rowsUsed.map((r) => `p. ${r.Page}: ${text(r.Label) || r.Field}`).join('; '),
      quote: [...new Set(rowsUsed.flatMap((r) => text(r.Quote).split(' | ')))].join(' | '),
      ...Object.fromEntries(TYPED_COLUMNS.map((c) => [c, typedKept[c]])),
      parsed_vs_read: 'agrees', reader: [...new Set(rowsUsed.map((r) => r.Reader))].join(' '), rows: rowsUsed.map((r) => r.RowID).join(' '),
      note: `${rowsUsed.length} setting(s) read from ${[...new Set(rowsUsed.map((r) => `p. ${r.Page}`))].join(', ')}.`,
    });
  }

  // A cell of a held profile set to the page's raw text: the typed cells follow (retype), and the page is named in the Locator.
  function setCell(profile, field, cell, row, { mismatch }) {
    const column = SETTING_COLUMN[field];
    const current = profile[column];
    if (!mismatch && !isMissing(current)) return { error: 'cell-already-published', detail: `${profile.ProfileID} ${column}: ${current}` };
    if (mismatch && squash(current) === squash(cell)) return { error: 'same-text', detail: `${profile.ProfileID} ${column}` };
    const after = { ...profile, [column]: cell };
    const typedAfter = typedOf(after), typedBefore = typedOf(profile);
    const verdict = parsedVsRead(field, row, typedAfter, cell);
    if (verdict !== 'agrees') return { error: 'parsed-vs-read', detail: `${profile.ProfileID} ${column}: ${verdict}` };
    if (mismatch && TYPED[column] && TYPED[column].every((c) => typedAfter[c] === profile[c])) return { error: 'same-reading', detail: `${profile.ProfileID} ${column}: "${current}" reads as "${cell}"` };
    if (mismatch && !TYPED[column]) {
      // a nozzle diameter or plate has no typed twin: a differing text alone is not a contradiction
      if (field === 'nozzle_diameter' && numbersIn(current).some((n) => sameNumber(n, num(row.Lo)))) return { error: 'same-reading', detail: `${profile.ProfileID} ${column}: "${current}" reads as "${cell}"` };
    }
    void typedBefore;
    const base = { gate: 'ready', table: 'profiles', id: profile.ProfileID, source: row.SourceID, quote: text(row.Quote), parsed_vs_read: verdict, reader: row.Reader, rows: row.RowID, GradeID: profile.GradeID };
    const note = `p. ${row.Page}, "${text(row.Label) || field}": the page prints "${text(row.Raw)}" (reader ${row.Reader}, ${row.Presence}).`;
    const rows = [{ ...base, column, expect: current ?? '', value: cell, note }];
    return { rows, where: `p. ${row.Page}: ${text(row.Label) || field}`, base };
  }

  // -- 2. print settings the page contradicts
  for (const r of considered.filter((x) => x.Kind === 'setting' && x.Class === 'mismatch')) {
    const reasons = [];
    const column = SETTING_COLUMN[r.Field];
    if (!column) reasons.push('no-table-column');
    const ids = String(r.HeldIDs).split(/\s+/).filter(Boolean);
    if (ids.length !== 1) reasons.push('multiple-profiles');
    const profile = tables.profiles.find((p) => p.ProfileID === ids[0]);
    if (ids.length === 1 && (!profile || !live(profile))) reasons.push('held-profile-not-live');
    if (/specimen conditions?|not a (print )?recommendation/i.test(`${r.TableHeading} ${r.Note}`)) reasons.push('specimen-condition-not-guidance');
    const cell = column ? cellOf(r) : '';
    if (column && NO_VALUE.test(cell)) reasons.push('no-value-printed');
    if (profile && column && !reasons.length && squash(profile[column]) === squash(cell)) reasons.push('same-text');
    if (profile && column && !reasons.length) {
      // The held number also on the page means the reader and the held row may be reading two different things.
      const heldNumbers = numbersIn(profile[column]).filter((n) => !sameNumber(n, num(r.Lo)));
      if (heldNumbers.some((n) => numberOnPage(r.SourceID, r.Page, n) === true)) reasons.push('held-number-also-on-page');
    }
    if (!reasons.length && quoteReason(r)) reasons.push(quoteReason(r));
    if (reasons.length) { hold(r, reasonsFor(r, ...reasons), 'profiles'); continue; }
    const gate = gateOf(r);
    if (gate.gate !== 'ready') { hold(r, [gate.reason], 'profiles'); continue; }
    const proposal = setCell(profile, r.Field, cell, r, { mismatch: true });
    if (proposal.error) hold(r, proposal.error, 'profiles', proposal.detail ?? '');
    else { out.profilesSet.push(...proposal.rows); noteWhere(profile, proposal); }
  }
  // One Locator edit per profile, naming every row of the page now read, so the edits chain from the Locator the table holds.
  for (const [id, { profile, wheres, base }] of locatorAdds) {
    const add = [...wheres].filter((w) => !String(profile.Locator ?? '').includes(w));
    if (add.length) out.profilesSet.push({ ...base, column: 'Locator', expect: profile.Locator ?? '', value: `${profile.Locator}; ${add.join('; ')}`, note: 'Locator names the rows now read.', id });
  }

  // -- 3. values
  const existingLocators = new Map();
  for (const m of tables.measurements) { const k = m.SourceID; if (!existingLocators.has(k)) existingLocators.set(k, new Set()); existingLocators.get(k).add(m.Locator); }
  // Every column of an added row is set from the page, so the like-row only has to be a published row; the nearest is the same
  // source and product, then the same product, the same source, the same material, the same maker, then the first there is.
  const publishedRows = tables.measurements.filter((m) => /^Published value/.test(m['Data status'] ?? '') && m['Data status'] !== 'Retired duplicate record');
  const likeFor = (gradeId, sourceId) => {
    const grade = grades.get(gradeId);
    const near = (m) => (m.SourceID === sourceId && m.GradeID === gradeId ? 0 : m.GradeID === gradeId ? 1 : m.SourceID === sourceId ? 2 : m.MaterialID === grade.MaterialID ? 3 : grades.get(m.GradeID)?.Manufacturer === grade.Manufacturer ? 4 : 5);
    let best = null, bestRank = 9;
    for (const m of publishedRows) { const k = near(m); if (k < bestRank) { best = m; bestRank = k; if (k === 0) break; } }
    return best;
  };
  const valueCandidates = [];
  for (const r of considered.filter((x) => x.Kind === 'value' && x.Class === 'new')) {
    const reasons = [];
    const grade = gradeOf(r);
    if (grade.error) reasons.push(grade.error);
    const p = grade.error ? { error: null } : valueProposal(r, { registry, grade: grade.id });
    if (p.error) reasons.push(p.error);
    let like = null;
    if (!grade.error) { like = likeFor(grade.id, r.SourceID); if (!like) reasons.push('no-like-row'); }
    if (!reasons.length && quoteReason(r)) reasons.push(quoteReason(r));
    const gate = gateOf(r);
    if (reasons.length || gate.gate !== 'ready') { hold(r, reasonsFor(r, ...reasons), 'values'); continue; }
    valueCandidates.push({ row: r, grade: grade.id, p, like });
  }
  // Locators: "p. N: label", with what tells two rows of one label apart, so no two rows of a source share one.
  const byBase = new Map();
  for (const c of valueCandidates) {
    c.base = `p. ${c.row.Page}: ${text(c.row.Label) || c.row.Field}`;
    const k = `${c.row.SourceID}\u0001${c.base}`;
    if (!byBase.has(k)) byBase.set(k, []);
    byBase.get(k).push(c);
  }
  const FACTS = [['grade', (c) => c.grade], ['direction', (c) => c.p.Direction === 'Unstated' || c.p.Direction === NA ? '' : c.p.Direction], ['moisture', (c) => c.p['Moisture state'] === 'not-stated' ? '' : c.row.Moisture],
    ['post', (c) => c.p['Post-processing state'] === 'not-stated' ? '' : c.row.PostProcessing], ['temp', (c) => c.p.facts.temp], ['notch', (c) => c.p.facts.notch], ['standard', (c) => c.p.facts.standard],
    ['heading', (c) => c.p.facts.heading], ['value', (c) => c.p['Raw value']]];
  for (const group of byBase.values()) {
    const collides = (c) => group.length > 1 || existingLocators.get(c.row.SourceID)?.has(c.base);
    if (!group.some(collides)) { for (const c of group) c.locator = c.base; continue; }
    // Add what tells the rows apart, one fact at a time, until no two of the group (or the source's held rows) share a locator.
    const varying = FACTS.filter(([, f]) => new Set(group.map(f)).size > 1);
    const name = (c, used) => { const parts = used.map(([, f]) => f(c)).filter(Boolean); return parts.length ? `${c.base} (${parts.join('; ')})` : c.base; };
    let used = [];
    const clash = () => { const names = group.map((c) => name(c, used)); return names.some((x, i) => names.indexOf(x) !== i) || group.some((c) => existingLocators.get(c.row.SourceID)?.has(name(c, used))); };
    for (const fact of varying) { if (!clash()) break; used = [...used, fact]; }
    for (const c of group) {
      c.locator = name(c, used);
      if (existingLocators.get(c.row.SourceID)?.has(c.locator)) c.locator = `${c.locator} [${c.grade}]`;
    }
  }
  const taken = new Map();
  for (const c of valueCandidates) {
    const key = `${c.row.SourceID}\u0001${c.locator}`;
    if (taken.has(key) || existingLocators.get(c.row.SourceID)?.has(c.locator)) { hold(c.row, 'locator-collision', 'values', c.locator); continue; }
    taken.set(key, c.row.RowID);
    const { facts, ...p } = c.p;
    void facts;
    out.valuesAdd.push({
      gate: 'ready', task: 'reader-round', like: c.like.MeasurementID, SourceID: c.row.SourceID, GradeID: c.grade, MaterialID: grades.get(c.grade).MaterialID,
      ...p, Locator: c.locator, quote: text(c.row.Quote),
      note: `p. ${c.row.Page}, "${text(c.row.Label)}"${text(c.row.TableHeading) ? ` under "${text(c.row.TableHeading)}"` : ''}: the page prints "${text(c.row.Raw)}"${text(c.row.TestConditions) ? ` (${text(c.row.TestConditions)})` : ''}; read by ${c.row.Reader}, ${c.row.Presence}${AGREED.includes(c.row.SecondRead) ? ', second reading agrees' : ''}.`,
      presence: c.row.Presence, second_read: c.row.SecondRead, reader: c.row.Reader, rows: c.row.RowID,
    });
  }

  // -- 4. values a held row has wrong
  const measurementsById = new Map(tables.measurements.map((m) => [m.MeasurementID, m]));
  for (const r of considered.filter((x) => x.Kind === 'value' && (x.Class === 'mismatch' || x.Class === 'not-on-page'))) {
    const reasons = [];
    if (r.Class === 'not-on-page') { hold(r, reasonsFor(r, 'held-row-not-on-page'), 'values'); continue; }
    const ids = String(r.HeldIDs).split(/\s+/).filter(Boolean);
    const held = ids.length === 1 ? measurementsById.get(ids[0]) : null;
    if (!held) reasons.push(ids.length === 1 ? 'held-row-unknown' : 'ambiguous-held-rows');
    let p = null;
    if (held) {
      p = valueProposal(r, { registry, grade: held.GradeID });
      if (p.error) reasons.push(p.error);
      else {
        if (unitKey(p['Raw unit']) !== unitKey(held['Raw unit'])) reasons.push(`unit-differs:${p['Raw unit']}/${held['Raw unit']}`);
        if (p.Operator !== held.Operator) reasons.push(`operator-differs:${p.Operator}/${held.Operator}`);
        const heldUncertain = !isMissing(held['Raw uncertainty ±']);
        if (heldUncertain && p['Raw uncertainty ±'] === NA) reasons.push('uncertainty-differs');
        if (!isMissing(held['Raw upper bound']) !== (p['Raw upper bound'] !== NA)) reasons.push('range-differs');
        if (!reasons.length && numberOnPage(r.SourceID, r.Page, held['Raw numeric']) === true) reasons.push('held-number-also-on-page');
        if (!reasons.length && num(held['Raw numeric']) === num(p['Raw numeric']) && held['Normalized value'] === p['Normalized value']) reasons.push('same-number');
      }
    }
    if (!reasons.length && quoteReason(r)) reasons.push(quoteReason(r));
    if (reasons.length) { hold(r, reasonsFor(r, ...reasons), 'values'); continue; }
    const gate = gateOf(r);
    if (gate.gate !== 'ready') { hold(r, [gate.reason], 'values'); continue; }
    const base = { gate: 'ready', task: 'reader-round', table: 'measurements', id: held.MeasurementID, source: r.SourceID, quote: text(r.Quote), reader: r.Reader, rows: r.RowID,
      note: `p. ${r.Page}, "${text(r.Label)}": the page prints "${text(r.Raw)}"; the record held ${held['Raw value']} (reader ${r.Reader}, ${r.Presence}).` };
    for (const [column, value] of [['Raw value', p['Raw value']], ['Raw numeric', p['Raw numeric']], ['Normalized value', p['Normalized value']],
      ['Raw uncertainty ±', p['Raw uncertainty ±']], ['Normalized uncertainty ±', p['Normalized uncertainty ±']]]) {
      if ((held[column] ?? '') !== value && !(column.includes('uncertainty') && p['Raw uncertainty ±'] === NA)) out.valuesSet.push({ ...base, column, expect: held[column] ?? '', value });
    }
    if (held['Data status'] === 'Published value') out.valuesSet.push({ ...base, column: 'Data status', expect: 'Published value', value: 'Published value (transcription corrected)' });
  }

  // -- 5. what a page states once for the values beneath it
  const contextExists = new Set(tables.page_context.map((c) => `${c.SourceID}\u0001${c.Page}\u0001${c['Applies to']}`));
  for (const r of considered.filter((x) => x.Kind === 'context')) {
    if (r.Class === 'context-held') { hold(r, 'context-held-already', 'page-context'); continue; }
    const reasons = [];
    if (!r.HeldValues) reasons.push('changes-no-held-row');
    if (/(^|\s)contradicts:/.test(r.Flags)) reasons.push('contradicts-held-rows');
    if (contextExists.has(`${r.SourceID}\u0001${r.Page}\u0001${r.Field}`)) reasons.push('page-context-exists');
    const specimen = text(r.Specimen) ? specimenOf(r, 'context') : { value: NP };
    if (specimen.error) reasons.push(specimen.error);
    const moisture = moistureOf(r.Moisture);
    if (moisture.error) reasons.push(moisture.error);
    const post = postProcessingOf(r.PostProcessing);
    if (post.error) reasons.push(post.error);
    const conditions = conditionsOf(r.TestConditions);
    if (conditions.temp.length > 1) reasons.push('conditions-ambiguous:temp');
    const specimenValue = /^Not published/.test(specimen.value ?? NP) ? NP : specimen.value;
    const testTemp = conditions.temp.length === 1 && readTestTemperature(conditions.temp[0]) != null ? String(readTestTemperature(conditions.temp[0])) : NP;
    const standard = readStandards(r.Standard).join('; ') || NP;
    if (!reasons.length && specimenValue === NP && moisture.state === 'not-stated' && post.state === 'not-stated' && standard === NP && testTemp === NP) reasons.push('states-nothing');
    if (!reasons.length && quoteReason(r)) reasons.push(quoteReason(r));
    const gate = gateOf(r);
    if (reasons.length || gate.gate !== 'ready') { hold(r, reasonsFor(r, ...reasons), 'page-context'); continue; }
    const statement = text(r.Raw) || text(r.TableHeading) || text(r.Label);
    out.pageContextAdd.push({
      gate: 'ready', SourceID: r.SourceID, Page: r.Page, 'Applies to': r.Field, Statement: statement, 'Specimen type': specimenValue, 'Moisture state': moisture.state,
      'Post-processing state': post.state, 'Anneal °C': post.state === 'annealed' ? post.tempC : NA, 'Anneal h': post.state === 'annealed' ? post.hours : NA,
      Standard: standard, 'Test temperature °C': testTemp, Locator: `p. ${r.Page}: ${text(r.TableHeading) || text(r.Label) || statement}`, quote: text(r.Quote),
      moisture_words: text(r.Moisture), post_processing_words: text(r.PostProcessing), inherits: r.HeldValues, reader: r.Reader, rows: r.RowID,
    });
  }

  // -- 6. what the reconciler classed as neither: not proposed, and said so
  for (const r of considered.filter((x) => !['setting', 'value', 'context'].includes(x.Kind) || (x.Kind === 'value' && /^unmapped:/.test(x.Field)))) {
    hold(r, [r.Kind === 'value' ? 'unmapped-property' : `${r.Kind}-not-proposed`], r.Kind);
  }
  void today;
  return out;
}

// ---- files -------------------------------------------------------------------------------------------------------

const PROFILE_ADD_HEADER = ['gate', 'SourceID', 'GradeID', 'MaterialID', 'like', 'Profile', ...CELL_COLUMNS, 'Locator', 'quote', ...TYPED_COLUMNS, 'parsed_vs_read', 'reader', 'rows', 'note'];
const SET_HEADER = ['gate', 'table', 'id', 'column', 'expect', 'value', 'source', 'quote', 'note', 'parsed_vs_read', 'reader', 'rows', 'GradeID'];
const VALUE_ADD_HEADER = ['gate', 'task', 'like', 'SourceID', 'GradeID', 'MaterialID', 'Property', 'Raw value', 'Raw unit', 'Raw numeric', 'Raw uncertainty ±', 'Raw upper bound', 'Conversion factor', 'Normalized value',
  'Normalized uncertainty ±', 'Normalized upper bound', 'Normalized unit', 'Operator', 'Specimen type', 'Direction', 'Notch', 'Moisture condition', 'Moisture state', 'Post-processing', 'Post-processing state',
  'Anneal °C', 'Anneal h', 'Test temperature', 'Test temperature °C', 'Standard / load', 'Standards', 'Test load MPa', 'Specimen / print parameters', 'Locator', 'quote', 'note', 'decision', 'presence', 'second_read', 'reader', 'rows'];
const VALUE_SET_HEADER = ['gate', 'task', 'table', 'id', 'column', 'expect', 'value', 'source', 'quote', 'note', 'reader', 'rows'];
const CONTEXT_HEADER = ['gate', 'SourceID', 'Page', 'Applies to', 'Statement', 'Specimen type', 'Moisture state', 'Post-processing state', 'Anneal °C', 'Anneal h', 'Standard', 'Test temperature °C', 'Locator', 'quote',
  'moisture_words', 'post_processing_words', 'inherits', 'reader', 'rows'];
const HELD_HEADER = ['gate', 'reason', 'stage', 'RowID', 'SourceID', 'Page', 'Grade', 'Product', 'Field', 'Label', 'Raw', 'Presence', 'SecondRead', 'Confidence', 'Reader', 'Detail'];
const DUP_HEADER = ['RowID', 'KeptRowID', 'SourceID', 'Page', 'Grade', 'Field', 'Raw', 'Reader'];

const tally = (rows, key) => { const m = new Map(); for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))); };
const table = (head, rows) => `| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n`;

export function summarize(out, { run, files, readRows }) {
  const lines = [`# Proposals ${run}`, '', `${readRows} reading(s) considered; ${out.duplicates.length} repeat another reading; ${out.held.length} held.`, ''];
  lines.push('## Files', '', table(['file', 'gate', 'rows'], Object.entries(files).map(([f, n]) => [f, f === 'held.csv' ? 'held' : f === 'duplicates.csv' ? '-' : 'ready', n])));
  const reasonRows = out.held.flatMap((h) => h.reason.split(REASON_SEP).map((reason) => ({ reason: reason.replace(/:.*$/, ''), stage: h.stage, field: h.Field })));
  lines.push('## Top held reasons', '', table(['reason', 'readings'], tally(reasonRows, (r) => r.reason).slice(0, 25).map(([k, n]) => [k, n])));
  lines.push('## Held by gate', '', table(['gate reason', 'readings'], tally(out.held.filter((h) => h.reason.includes('gate:')), (h) => h.reason.split(REASON_SEP).find((x) => x.startsWith('gate:'))).map(([k, n]) => [k, n])));
  const proposed = [
    ...out.profilesAdd.flatMap((p) => p.rows.split(' ').map(() => ({ file: 'profiles-add', field: 'setting' }))),
    ...out.profilesSet.filter((p) => p.column !== 'Locator').map((p) => ({ file: 'profiles-set', field: p.column })),
    ...out.valuesAdd.map((v) => ({ file: 'values-add', field: v.Property })),
    ...out.valuesSet.filter((v) => v.column === 'Raw value').map((v) => ({ file: 'values-set', field: out.valuesSet.find((x) => x.id === v.id && x.column === 'Raw value') ? 'value' : '' })),
    ...out.pageContextAdd.map((c) => ({ file: 'page-context-add', field: c['Applies to'] })),
  ];
  lines.push('## Ready by file and field', '', table(['file', 'field', 'rows'], tally(proposed, (p) => `${p.file}\u0000${p.field}`).map(([k, n]) => [...k.split('\u0000'), n])));
  lines.push('## Held by stage and field', '', table(['stage', 'field', 'readings'], tally(out.held, (h) => `${h.stage}\u0000${h.Field}`).slice(0, 40).map(([k, n]) => [...k.split('\u0000'), n])));
  const headline = out.valuesAdd.filter((v) => v.decision);
  lines.push('## Headline values among the new ones', '', `${headline.length} of ${out.valuesAdd.length} values-add rows are properties a headline reads.`, '');
  return lines.join('\n');
}

export function writeProposals(out, dir, { run, readRows }) {
  mkdirSync(dir, { recursive: true });
  const files = {};
  const put = (name, header, rows) => { writeFileSync(join(dir, name), csvText(header, rows)); files[name] = rows.length; };
  put('profiles-add.csv', PROFILE_ADD_HEADER, out.profilesAdd);
  put('profiles-set.csv', SET_HEADER, out.profilesSet);
  put('values-add.csv', VALUE_ADD_HEADER, out.valuesAdd);
  put('values-set.csv', VALUE_SET_HEADER, out.valuesSet);
  put('page-context-add.csv', CONTEXT_HEADER, out.pageContextAdd);
  put('held.csv', HELD_HEADER, out.held);
  put('duplicates.csv', DUP_HEADER, out.duplicates);
  writeFileSync(join(dir, 'summary.md'), summarize(out, { run, files, readRows }));
  return files;
}

/** The reconcile run's rows that can become proposals, from its CSVs. */
export function readRunRows(runDir) {
  const names = ['new-settings.csv', 'new-values.csv', 'mismatches.csv', 'context.csv'];
  const rows = [];
  for (const name of names) {
    const path = join(runDir, name);
    if (!existsSync(path)) continue;
    for (const r of readCsv(path).records) rows.push(Object.fromEntries(Object.entries(r.values).map(([k, v]) => [k, v ?? ''])));
  }
  return rows;
}

export function loadFullTables(root = projectRoot) {
  return Object.fromEntries(['measurements', 'profiles', 'page_context', 'grades', 'sources', 'properties'].map((n) => [n, readTable(n, root)]));
}

async function main() {
  const arg = (name, fallback = null) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback; };
  const runArg = arg('run');
  if (!runArg) { console.error('usage: read-proposals --run <reconcile run dir> [--out <dir>]'); process.exit(2); }
  const runDir = resolve(projectRoot, runArg);
  const run = basename(runDir);
  const dir = resolve(projectRoot, arg('out', `docs/audits/2026-10-04-reader-round/proposals/${run}`));
  const tables = loadFullTables();
  const shaOf = new Map(tables.sources.map((s) => [s.SourceID, s.SHA256]));
  const pageCache = new Map();
  const pagesOf = (sourceId) => {
    if (!pageCache.has(sourceId)) {
      const c = shaOf.get(sourceId) ? cachedText(shaOf.get(sourceId)) : null;
      pageCache.set(sourceId, c ? new Map(c.pages.map((p) => [Number(p.page), p.lines.map((l) => l.text).join(' ')])) : null);
    }
    return pageCache.get(sourceId);
  };
  const ctx = {
    quoteOnSheet: (sourceId, quote) => quoteOnCachedSheet(shaOf.get(sourceId), quote),
    numberOnPage: (sourceId, page, number) => {
      const pages = pagesOf(sourceId);
      const pageText = pages?.get(Number(page));
      if (pageText == null) return null;
      return numbersIn(pageText).some((n) => sameNumber(n, number));
    },
  };
  const rows = readRunRows(runDir);
  const out = buildProposals({ rows, tables, ctx });
  const files = writeProposals(out, dir, { run, readRows: rows.length });
  console.log(`${rows.length} reading(s) considered -> ${dir}`);
  console.log(JSON.stringify(files));
}

if (process.argv[1]?.endsWith('read-proposals.mjs')) await main();
