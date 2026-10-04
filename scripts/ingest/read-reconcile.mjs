#!/usr/bin/env node
// The reader round's reconciler: a vision reading (READING-SCHEMA.md) checked against the page's text layer and against
// what the tables already hold, and sorted into what the lead's migrations can use.
//
//   npm run ingest:read-reconcile -- --readings a.csv,b.csv [--second s.csv,t.csv] [--run r1] [--docs <DOCS.csv>] [--out <dir>]
//
// A reading is only a claim until the text layer bears it out. Each row is given three verdicts, none of them by
// trust in the reader:
//
//   presence     are its numbers printed on that page, and its quote? (text layer, reading-order blocks, OCR sidecar;
//                otherwise visual-only, which is not a rejection but a row that needs a second pair of eyes)
//   class        against the rows the tables hold from the source: confirms, mismatch, new, or context / unmapped /
//                identity for what is not a value or a setting
//   second read  every visual-only row, every mismatch and every new decision-field row needs an independent reading
//                of the same page; it is `agreed` when that reading gives the same numbers
//
// Nothing here writes data/. Output goes to docs/audits/2026-10-04-reader-round/reconcile/<run>/.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { csvText, parseCsvText, readCsv } from '../../build/src/csv.js';
import { scopeOf } from '../../build/src/page-context.js';
import { projectRoot } from './context.mjs';
import { machineAgrees } from './read-machine.mjs';
import {
  CONFIDENCE, CONTEXT_SCOPES, DECISION_PROPERTY, DECISION_SETTINGS, HEADER, KINDS, NP, SETTING_FIELDS, VERDICTS,
  heldFor, labelPairedWithNumber, loadDocument, loadTables, missing, numbersIn, pageOf, presence, sameNumber, squash,
} from './read-common.mjs';

const num = (v) => { if (v == null || v === '') return null; const n = Number(String(v).replace(',', '.').replace(/\s/g, '')); return Number.isFinite(n) ? n : null; };
const text = (v) => String(v ?? '').trim();
const OUT = ['RowID', 'Class', 'Kind', 'SourceID', 'Page', 'Grade', 'Product', 'Field', 'Label', 'Raw', 'Lo', 'Hi', 'Unit', 'Operator', 'Direction', 'Specimen', 'Moisture', 'PostProcessing', 'Standard', 'TestConditions', 'TableHeading', 'Quote', 'Presence', 'SecondRead', 'HeldIDs', 'HeldValues', 'Reader', 'Confidence', 'Flags', 'Note'];

// ---- reading the CSV ---------------------------------------------------------------------------------------------

/** A readings CSV as rows keyed by the schema's columns (empty cells are ''), each with the RowID it will carry. */
export function parseReadings(csv, label = 'readings') {
  const { header, records } = parseCsvText(csv, label);
  const absent = HEADER.filter((h) => !header.includes(h));
  if (absent.length) throw new Error(`${label}: missing column(s) ${absent.join(', ')}; the schema is in READING-SCHEMA.md`);
  return records.map((r) => ({ ...Object.fromEntries(HEADER.map((h) => [h, text(r.values[h])])), RowID: `${label}#${r.line}` }));
}

/** A unit as a comparison key: case, spaces, superscript digits and the micro sign do not make another unit. */
export const unitKey = (u) => String(u ?? '').toLowerCase().replace(/\s+/g, '').replace(/²/g, '2').replace(/³/g, '3').replace(/[µμ]/g, 'u').replace(/[·^]/g, '');

/** The units each property is recorded in: its own Units, and the raw and normalized units of its measurements. */
export function propertyUnits(tables) {
  const units = new Map();
  const add = (p, u) => { if (u && !/^Not (published|applicable)/.test(u)) { if (!units.has(p)) units.set(p, new Set()); units.get(p).add(unitKey(u)); } };
  for (const p of tables.properties) String(p.Units ?? '').split(';').forEach((u) => add(p.Property, u.trim()));
  for (const m of tables.measurements) { add(m.Property, m['Raw unit']); add(m.Property, m['Normalized unit']); }
  return units;
}

const EXPONENT = /\^|\d[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/;

/**
 * Why a value row belongs to the record tier and not to a property of the table: its property is not one, its unit is
 * not one the property is recorded in, or it prints a power of ten. These are readings of something real that the
 * tables cannot hold yet, not broken rows; they go to unmapped.csv.
 */
export function unmappedReasons(row, { properties, units }) {
  if (row.kind !== 'value' || /^unmapped:/.test(row.field)) return [];
  const why = [];
  if (!properties.has(row.field)) why.push(`property-unknown:${row.field || 'empty'}`);
  else if (row.unit && !(units.get(row.field) ?? new Set()).has(unitKey(row.unit))) why.push(`unit-not-for-property:${row.unit}`);
  if ([row.raw, row.number_lo, row.number_hi, row.unit].some((c) => EXPONENT.test(c))) why.push('exponent');
  return why;
}

/** What is wrong with a row on its face, before any page is opened: a broken row. Empty when it is well formed. */
export function validate(row, { sources, operators }) {
  const bad = [];
  if (!KINDS.includes(row.kind)) bad.push(`kind:${row.kind || 'empty'}`);
  if (!row.source_id) bad.push('source_id:empty'); else if (sources && !sources.has(row.source_id)) bad.push(`source-unknown:${row.source_id}`);
  if (row.kind !== 'none') {
    if (!/^[1-9]\d*$/.test(row.page)) bad.push(`page:${row.page || 'empty'}`);
    if (row.verdict && !VERDICTS.includes(row.verdict)) bad.push(`verdict:${row.verdict}`);
    if (row.confidence && !CONFIDENCE.includes(row.confidence)) bad.push(`confidence:${row.confidence}`);
    for (const c of ['number_lo', 'number_hi']) if (row[c] && num(row[c]) == null && !EXPONENT.test(row[c])) bad.push(`${c}:${row[c]}`);
    if (row.operator && !operators.has(row.operator)) bad.push(`operator:${row.operator}`);
  }
  if (row.kind === 'setting' && !SETTING_FIELDS.includes(row.field)) bad.push(`setting-field:${row.field || 'empty'}`);
  if (row.kind === 'context' && !CONTEXT_SCOPES.includes(row.field)) bad.push(`context-scope:${row.field || 'empty'}`);
  return bad;
}

/** A product written twice (two readers, or one product on two sheets) is one reading: the first stands. */
export const duplicateKey = (r) => [r.source_id, r.page, r.kind, r.field, r.grade_id || squash(r.product), r.number_lo, r.number_hi, squash(r.direction), squash(r.moisture), squash(r.post_processing), r.kind === 'context' ? squash(r.quote) : ''].join('|');

// ---- comparing with what the tables hold ------------------------------------------------------------------------

const canonDirection = (d) => {
  const s = text(d).toLowerCase();
  if (!s || /^(not published|not applicable|unstated|stated, not)/.test(s)) return null;
  if (/\bxy\b|\bflat\b|\bhorizontal\b|\bxz\b|on.?edge/.test(s)) return 'plane';
  if (/\bzx\b|\bz\b|upright|vertical/.test(s)) return 'z';
  return null;
};
const moistureOf = (t) => {
  const s = text(t).toLowerCase();
  if (!s || /^not published$/.test(s)) return null;
  if (/\bnot (dried|dry)\b|\bconditioned\b|\bwet\b|humid|\d\s?%\s?rh|saturat|immers|water|ambient/.test(s)) return 'conditioned';
  if (/\bdr(y|ied)\b/.test(s)) return 'dry';
  return null;
};
const treatmentOf = (t) => {
  const s = text(t).toLowerCase();
  if (!s) return null;
  if (/not annealed|unannealed|non-?annealed|before anneal\w*|without anneal\w*|as.?printed|no anneal/.test(s)) return 'as-printed';
  if (/anneal/.test(s)) return 'annealed';
  return null;
};

/** Whether the conditions a reader gave could be the conditions of this held row: an unstated side agrees with anything. */
export function conditionsCompatible(row, m) {
  const why = [];
  const dr = canonDirection(row.direction), dm = canonDirection(m.Direction);
  if (dr && dm && dr !== dm) why.push('direction');
  const mr = moistureOf(row.moisture), mm = m['Moisture state'] && m['Moisture state'] !== 'not-stated' ? m['Moisture state'] : null;
  if (mr && mm && mr !== mm) why.push('moisture');
  const tr = treatmentOf(row.post_processing), tm = m['Post-processing state'] && m['Post-processing state'] !== 'not-stated' ? m['Post-processing state'] : null;
  if (tr && tm && tr !== tm) why.push('post-processing');
  return { ok: !why.length, why };
}

/** Do the reader's numbers equal this held measurement's, at the coarser precision, in the unit the sheet prints? */
export function valueAgrees(row, m) {
  const lo = row.number_lo;
  if (lo === '') return false;
  const sameUnit = !row.unit || !m['Raw unit'] || squash(row.unit) === squash(m['Raw unit']);
  const normUnit = row.unit && m['Normalized unit'] && squash(row.unit) === squash(m['Normalized unit']);
  const operatorOk = !row.operator || !m.Operator || row.operator === m.Operator;
  const candidates = [];
  if (sameUnit && !missing(m['Raw numeric'])) candidates.push(m['Raw numeric']);
  if (normUnit && !missing(m['Normalized value'])) candidates.push(m['Normalized value']);
  if (!candidates.length) return false;
  return operatorOk && candidates.some((c) => sameNumber(lo, c));
}

const heldText = (m) => `${m.MeasurementID}: ${m['Raw value'] ?? ''} [${[m.Direction, m['Moisture state'], m['Post-processing state']].filter((x) => x && !/^Not (published|applicable)$/.test(x)).join(', ')}]`;

/** Which of the source's products a row is about: the grade it names, else the one its product name matches, else null. */
export function resolveGrade(row, held) {
  if (row.grade_id) return { id: row.grade_id, held: held.products.some((p) => p.GradeID === row.grade_id) };
  if (row.product) {
    const want = squash(row.product);
    const hits = held.products.filter((p) => { const have = squash(`${p.Manufacturer} ${p['Product name']}`); return want.length > 2 && (have.includes(want) || want.includes(squash(p['Product name']))); });
    if (hits.length === 1) return { id: hits[0].GradeID, held: true };
  }
  return null;
}

function classifyValue(row, held) {
  const flags = [];
  const grade = resolveGrade(row, held);
  if (grade && !grade.held) flags.push(`grade-not-held:${grade.id}`);
  const page = Number(row.page);
  let cands = held.measurements.filter((m) => m.Property === row.field && (!grade || m.GradeID === grade.id) && (m.page == null || m.page === page));
  const explicit = row.held_id ? held.measurements.find((m) => m.MeasurementID === row.held_id) : null;
  if (row.held_id && !explicit) flags.push(`held-id-unknown:${row.held_id}`);
  if (explicit) {
    if (explicit.Property !== row.field) flags.push(`held-id-other-property:${explicit.Property}`);
    else cands = [explicit];
  }
  if (row.verdict === 'not-on-page') return { class: 'not-on-page', held: explicit ? [explicit] : [], flags };
  if (!cands.length) return { class: 'new', held: [], flags };
  const agreeing = cands.filter((m) => valueAgrees(row, m));
  if (agreeing.length) {
    const compat = agreeing.filter((m) => conditionsCompatible(row, m).ok);
    const best = compat.length ? compat : agreeing;
    if (!compat.length) flags.push(`conditions-differ:${conditionsCompatible(row, agreeing[0]).why.join('+')}`);
    if (row.verdict === 'mismatch') flags.push('reader-said-mismatch');
    return { class: 'confirms', held: best, flags };
  }
  const compat = cands.filter((m) => conditionsCompatible(row, m).ok);
  if (explicit || compat.length === 1) return { class: 'mismatch', held: explicit ? [explicit] : compat, flags };
  if (compat.length > 1) { flags.push(`ambiguous-held:${compat.map((m) => m.MeasurementID).join('+')}`); return { class: 'new', held: [], flags }; }
  return { class: 'new', held: [], flags };
}

const SETTING_COLUMNS = {
  nozzle: { lo: 'Nozzle min °C', hi: 'Nozzle max °C', text: 'Nozzle °C', state: 'Nozzle state' },
  bed: { lo: 'Bed min °C', hi: 'Bed max °C', text: 'Bed °C', state: 'Bed state' },
  chamber: { lo: 'Chamber min °C', hi: 'Chamber max °C', text: 'Chamber °C', state: 'Chamber state' },
  drying: { lo: 'Drying °C', hi: 'Drying °C', text: 'Drying', state: 'Drying state', hours: 'Drying hours' },
  enclosure: { text: 'Enclosure', state: 'Enclosure state' },
  hardened_nozzle: { text: 'Hardened nozzle' },
  nozzle_diameter: { text: 'Nozzle diameter' },
  plate: { text: 'Plate' },
};

const hoursOf = (conditions) => { const m = /hours?\s*=\s*([\d.,]+)/i.exec(conditions ?? ''); return m ? num(m[1]) : null; };
const wordsOf = (s) => new Set(String(s ?? '').toLowerCase().match(/[a-z0-9°]+/g) ?? []);
const textAgrees = (a, b) => {
  const x = squash(a), y = squash(b);
  if (!x || !y) return false;
  if (x.includes(y) || y.includes(x)) return true;
  const wa = wordsOf(a), wb = wordsOf(b);
  const shared = [...wa].filter((w) => wb.has(w)).length;
  return shared / Math.max(1, Math.min(wa.size, wb.size)) >= 0.6;
};

function classifySetting(row, held) {
  const flags = [];
  const cols = SETTING_COLUMNS[row.field];
  if (!cols) return { class: 'new', held: [], flags: ['no-table-column'] };
  const grade = resolveGrade(row, held);
  if (grade && !grade.held) flags.push(`grade-not-held:${grade.id}`);
  let profiles = held.profiles.filter((p) => !grade || p.GradeID === grade.id);
  const explicit = row.held_id ? held.profiles.find((p) => p.ProfileID === row.held_id) : null;
  if (row.held_id && !explicit) flags.push(`held-id-unknown:${row.held_id}`);
  if (explicit) profiles = [explicit];
  if (row.verdict === 'not-on-page') return { class: 'not-on-page', held: explicit ? [explicit] : [], flags };
  if (!profiles.length) { flags.push('no-profile'); return { class: 'new', held: [], flags }; }

  const lo = num(row.number_lo), hi = num(row.number_hi) ?? lo;
  const hours = hoursOf(row.test_conditions);
  const info = profiles.map((p) => {
    const heldLo = cols.lo ? num(p[cols.lo]) : null, heldHi = cols.hi ? num(p[cols.hi]) ?? heldLo : null;
    const published = heldLo != null || (!missing(p[cols.text]) && !['unknown'].includes(p[cols.state] ?? ''));
    let agrees = false;
    if (lo != null && heldLo != null) {
      agrees = sameNumber(lo, heldLo) && sameNumber(hi, heldHi);
      if (agrees && cols.hours && hours != null && !missing(p[cols.hours])) agrees = sameNumber(hours, p[cols.hours]);
    } else if (lo != null && cols.lo == null && !missing(p[cols.text])) {
      agrees = numbersIn(p[cols.text]).some((n) => sameNumber(lo, n));
    } else if (lo == null) agrees = published && textAgrees(row.raw || row.label, p[cols.text]);
    return { p, published, agrees };
  });
  const matching = info.filter((i) => i.agrees);
  if (matching.length) return { class: 'confirms', held: matching.map((i) => i.p), flags };
  const publishing = info.filter((i) => i.published);
  if (publishing.length) {
    if (publishing.length > 1) flags.push('multiple-profiles');
    return { class: 'mismatch', held: publishing.map((i) => i.p), flags };
  }
  return { class: 'new', held: [], flags };
}

const heldSettingText = (p, field) => { const c = SETTING_COLUMNS[field]; return c ? `${p.ProfileID}: ${p[c.text] ?? ''}${c.hours ? ` / ${p[c.hours] ?? ''} h` : ''}` : p.ProfileID; };

function classifyContext(row, held) {
  const flags = [];
  const page = Number(row.page);
  const scope = row.field;
  const applies = held.measurements.filter((m) => m.page === page && (scope === 'all' || scopeOf(m.Property) === scope));
  const existing = held.page_context.filter((c) => Number(c.Page) === page && (c['Applies to'] === 'all' || c['Applies to'] === scope));
  const stated = { moisture: moistureOf(row.moisture), treatment: treatmentOf(row.post_processing), specimen: text(row.specimen) };
  const inherits = [];
  for (const m of applies) {
    const gaps = [];
    if (stated.moisture && (!m['Moisture state'] || m['Moisture state'] === 'not-stated')) gaps.push(`moisture=${stated.moisture}`);
    if (stated.treatment && (!m['Post-processing state'] || m['Post-processing state'] === 'not-stated')) gaps.push(`treatment=${stated.treatment}`);
    if (stated.specimen && /^Not published/.test(m['Specimen type'] ?? NP)) gaps.push('specimen');
    if (gaps.length) inherits.push(`${m.MeasurementID}(${gaps.join(',')})`);
    if (stated.moisture && m['Moisture state'] && !['not-stated', stated.moisture].includes(m['Moisture state'])) flags.push(`contradicts:${m.MeasurementID}:moisture`);
    if (stated.treatment && m['Post-processing state'] && !['not-stated', stated.treatment].includes(m['Post-processing state'])) flags.push(`contradicts:${m.MeasurementID}:treatment`);
  }
  if (!applies.length) flags.push('no-held-rows-on-page-in-scope');
  return { class: existing.length ? 'context-held' : 'context', held: [], appliesTo: inherits, existing: existing.map((c) => c.PageContextID), flags };
}

// ---- the whole run -----------------------------------------------------------------------------------------------

const productKey = (r) => r.grade_id || squash(r.product);
const sameNumbers = (a, b) => {
  const eq = (x, y) => (x === '' && y === '') || (x !== '' && y !== '' && sameNumber(x, y));
  return eq(a.number_lo, b.number_lo) && eq(a.number_hi || a.number_lo, b.number_hi || b.number_lo);
};

/** Does a second reading of the same page give this row's numbers? 'agreed', 'disagrees', or 'pending' when nobody has read it. */
export function secondStatus(row, seconds) {
  // A second reader answers a task by its id ("task:<RowID>" in its note), so the answer is matched to the reading it
  // was asked about even where the two readers word the field or the product differently; "not found" is no agreement.
  const named = (s) => (s.note ?? '').split(/[\s,;]+/).some((w) => w.replace(/^task:/, '') === row.RowID && /^task:|^not/.test(w + (s.note ?? '')));
  const answers = row.RowID ? seconds.filter((s) => (s.note ?? '').includes(row.RowID) && named(s)) : [];
  if (answers.length && answers.every((s) => s.kind === 'none')) return 'disagrees';
  const sameSheet = answers.length ? answers.filter((s) => s.kind !== 'none') : seconds.filter((s) => s.kind !== 'none' && s.source_id === row.source_id && s.page === row.page && s.field === row.field
    && (!productKey(s) || !productKey(row) || productKey(s) === productKey(row)));
  if (!sameSheet.length) return 'pending';
  const agree = sameSheet.some((s) => sameNumbers(row, s) && conditionsCompatible(row, { Direction: s.direction, 'Moisture state': moistureOf(s.moisture), 'Post-processing state': treatmentOf(s.post_processing) }).ok);
  return agree ? 'agreed' : 'disagrees';
}

export const needsSecondRead = (row, cls, presenceResult) => {
  if (['confirms', 'identity', 'none', 'not-on-page'].includes(cls)) return false;
  if (presenceResult === 'visual-only') return true;
  if (cls === 'mismatch') return true;
  if (cls === 'new') return row.kind === 'setting' ? DECISION_SETTINGS.includes(row.field) : row.kind === 'value' && DECISION_PROPERTY.test(row.field);
  return false;
};

/**
 * Reconcile readings against the tables and the pages. `documentFor(sourceId)` returns a document as loadDocument
 * does; `tables` is loadTables(); `seconds` are second readings (same schema).
 */
export async function reconcile({ rows, seconds = [], tables, documentFor, machineFor = null, vocab = {} }) {
  const properties = new Set(tables.properties.map((p) => p.Property));
  const units = propertyUnits(tables);
  const sources = new Set(tables.sources.map((s) => s.SourceID));
  const operators = new Set(vocab.operators ?? ['=', '>', '<']);
  const heldCache = new Map();
  const heldOf = (id) => { if (!heldCache.has(id)) heldCache.set(id, heldFor(tables, id)); return heldCache.get(id); };

  const out = [], invalid = [], duplicates = [];
  const firstOf = new Map();
  const touched = new Map();      // sourceId -> Set of held ids a reading named or matched
  const touch = (id, ...ids) => { if (!touched.has(id)) touched.set(id, new Set()); ids.forEach((i) => i && touched.get(id).add(i)); };
  let ignored = 0;

  for (const row of rows) {
    const bad = validate(row, { sources, operators });
    if (bad.length) { invalid.push({ ...row, bad }); continue; }
    const key = duplicateKey(row);
    if (firstOf.has(key)) { duplicates.push({ ...row, of: firstOf.get(key) }); continue; }
    firstOf.set(key, row.RowID);
    if (row.kind === 'none') { ignored++; continue; }
    const unmappedWhy = unmappedReasons(row, { properties, units });
    const held = heldOf(row.source_id);
    const doc = await documentFor(row.source_id);
    const numbers = [row.number_lo, row.number_hi].filter((n) => n !== '' && num(n) != null);
    const verdictNotOnPage = row.verdict === 'not-on-page';
    let result;
    if (row.kind === 'value' && (/^unmapped:/.test(row.field) || unmappedWhy.length)) result = { class: 'unmapped', held: [], flags: unmappedWhy };
    else if (row.kind === 'value') result = classifyValue(row, held);
    else if (row.kind === 'setting') result = classifySetting(row, held);
    else if (row.kind === 'context') result = classifyContext(row, held);
    else result = { class: 'identity', held: [], flags: [] };

    // A held row the reader could not find: look for it on the page ourselves.
    if (result.class === 'not-on-page') {
      const m = result.held[0];
      const own = m?.['Raw numeric'] && !missing(m['Raw numeric']) ? [m['Raw numeric']] : [];
      const found = own.length ? presence(doc, m.page ?? row.page, { numbers: own, quote: '' }).flags.filter((f) => f.startsWith('number-not-on-page')).length === 0 : null;
      if (found) { result.class = 'confirms'; result.flags.push('reader-missed-held-row'); }
      else result.flags.push(found === false ? 'held-value-not-on-page' : 'held-row-unknown');
    }

    const p = verdictNotOnPage && !numbers.length && !row.quote ? { presence: 'visual-only', flags: [] } : presence(doc, row.page, { numbers, quote: row.quote });
    const flags = [...result.flags, ...p.flags];
    if (doc && doc.source === 'none' && doc.kind === 'none') flags.push('no-document-text');
    for (const m of result.held) touch(row.source_id, m.MeasurementID, m.ProfileID);
    if (row.held_id) touch(row.source_id, row.held_id);

    const need = needsSecondRead(row, result.class, p.presence);
    const heldValues = result.held.map((m) => (m.MeasurementID ? heldText(m) : heldSettingText(m, row.field))).join(' | ');
    out.push({
      RowID: row.RowID, Class: result.class, Kind: row.kind, SourceID: row.source_id, Page: row.page, Grade: row.grade_id, Product: row.product,
      Field: row.field, Label: row.label, Raw: row.raw, Lo: row.number_lo, Hi: row.number_hi, Unit: row.unit, Operator: row.operator,
      Direction: row.direction, Specimen: row.specimen, Moisture: row.moisture, PostProcessing: row.post_processing, Standard: row.standard,
      TestConditions: row.test_conditions, TableHeading: row.table_heading, Quote: row.quote, Presence: p.presence,
      SecondRead: need ? 'pending' : 'not-required',
      HeldIDs: [...result.held.map((m) => m.MeasurementID ?? m.ProfileID), ...(result.existing ?? [])].join(' '),
      HeldValues: result.class === 'context' || result.class === 'context-held' ? (result.appliesTo ?? []).join(' ') : heldValues,
      Reader: row.reader, Confidence: row.confidence, Flags: [...new Set(flags)].join(' '), Note: row.note,
      _need: need, _row: row,
    });
  }

  // The second read: a human-eyed reading of the same page if there is one, else the importer's own rule reader.
  const machines = new Map();
  const machineStats = { newDecision: 0, newDecisionAgreed: 0, mismatch: 0, mismatchAgreed: 0, textAgreed: 0, noMachineReading: 0 };
  for (const r of out.filter((x) => x._need)) {
    r.SecondRead = secondStatus(r._row, seconds);
    let agrees = false;
    if (machineFor && !machines.has(r.SourceID)) machines.set(r.SourceID, await machineFor(r.SourceID).catch(() => null));
    const machine = machineFor ? machines.get(r.SourceID) : null;
    if (machineFor && !machine) machineStats.noMachineReading++;
    if (machine) {
      agrees = machineAgrees(machine, r._row, {
        hours: hoursOf(r._row.test_conditions),
        compatible: (direction) => { const a = canonDirection(r._row.direction), b = canonDirection(direction); return !a || !b || a === b; },
        textAgrees,
      });
      if (agrees && r.SecondRead === 'pending') r.SecondRead = 'agreed-reader';
    }
    // A product named on a multi-product sheet with no grade is not one product: the page cannot say whose number it is.
    const ambiguous = r._row.product && !r._row.grade_id && heldOf(r.SourceID).products.length > 1;
    const decisionField = r.Kind === 'setting' ? DECISION_SETTINGS.includes(r.Field) : DECISION_PROPERTY.test(r.Field);
    if (r.SecondRead === 'pending' && r.Class === 'new' && decisionField && r.Presence !== 'visual-only' && !ambiguous && labelPairedWithNumber(await documentFor(r.SourceID), r._row)) { r.SecondRead = 'agreed-text'; machineStats.textAgreed++; }
    if (r.Class === 'new' && decisionField) { machineStats.newDecision++; if (agrees) machineStats.newDecisionAgreed++; }
    if (r.Class === 'mismatch') { machineStats.mismatch++; if (agrees) machineStats.mismatchAgreed++; }
  }

  // Tasks for the second readers: one per distinct place that needs it, with no value.
  const seen = new Map();
  for (const r of out.filter((x) => x._need && x.SecondRead === 'pending')) {
    const key = [r.SourceID, r.Page, r.Field, r.Grade || squash(r.Product), squash(r.Label), r.Lo, r.Hi].join('|');
    if (!seen.has(key)) seen.set(key, { task_id: `S${String(seen.size + 1).padStart(4, '0')}`, source_id: r.SourceID, page: r.Page, kind: r.Kind, field: r.Field, product: r.Grade || r.Product, label: r.Label, locator: r.TableHeading });
  }
  const tasks = [...seen.values()];

  // Held rows of a document that no reading named or matched.
  const unreadHeld = [];
  for (const id of touched.keys()) {
    const held = heldOf(id);
    for (const m of held.measurements) if (!touched.get(id).has(m.MeasurementID)) unreadHeld.push({ SourceID: id, ID: m.MeasurementID, Kind: 'measurement', Grade: m.GradeID, What: `${m.Property} ${m['Raw value'] ?? ''}`, Locator: m.Locator });
    for (const pr of held.profiles) if (!touched.get(id).has(pr.ProfileID)) unreadHeld.push({ SourceID: id, ID: pr.ProfileID, Kind: 'profile', Grade: pr.GradeID, What: `${pr.Profile}`, Locator: pr.Locator });
  }
  const secondNotFound = seconds.filter((s) => s.kind === 'none' && /not found/i.test(s.note)).length;
  return { rows: out.map(({ _need, _row, ...r }) => r), invalid, duplicates, tasks, unreadHeld, ignored, secondNotFound, machineStats };
}

const FILES = {
  'new-settings.csv': (r) => r.Class === 'new' && r.Kind === 'setting',
  'new-values.csv': (r) => r.Class === 'new' && r.Kind === 'value',
  'mismatches.csv': (r) => r.Class === 'mismatch' || r.Class === 'not-on-page',
  'context.csv': (r) => r.Class === 'context' || r.Class === 'context-held',
  'unmapped.csv': (r) => r.Class === 'unmapped',
  'identity.csv': (r) => r.Class === 'identity',
  'confirms.csv': (r) => r.Class === 'confirms',
};

const tally = (rows, key) => { const m = new Map(); for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))); };
const table = (head, rows) => `| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n`;

export function summarize({ rows, invalid, duplicates = [], tasks, unreadHeld, ignored, secondNotFound, machineStats }, { run, files }) {
  const lines = [`# Reconcile ${run}`, '', `${rows.length} reading(s) classified, ${invalid.length} invalid, ${duplicates.length} duplicate(s) dropped, ${ignored} marked none. ${tasks.length} second-read task(s) outstanding${secondNotFound ? `; second readers could not find ${secondNotFound} item(s)` : ''}.`, ''];
  lines.push('## By class', '', table(['class', 'rows'], tally(rows, (r) => r.Class)));
  lines.push('## By presence', '', table(['presence', 'rows'], tally(rows, (r) => r.Presence)));
  lines.push('## Second read', '', table(['status', 'rows'], tally(rows, (r) => r.SecondRead)));
  if (machineStats) {
    const pct = (a, b) => (b ? `${Math.round((100 * a) / b)} %` : 'n/a');
    lines.push('## Machine second read (the importer\'s sheet reader)', '', table(['rows', 'machine agrees', 'share'], [
      ['new decision-field rows', machineStats.newDecisionAgreed, `${machineStats.newDecisionAgreed} of ${machineStats.newDecision} (${pct(machineStats.newDecisionAgreed, machineStats.newDecision)})`],
      ['new decision-field rows the page text pairs with their label (agreed-text, no read)', machineStats.textAgreed, `${machineStats.textAgreed} of ${machineStats.newDecision}`],
      ['mismatches (agrees with the page reading, not the held row)', machineStats.mismatchAgreed, `${machineStats.mismatchAgreed} of ${machineStats.mismatch} (${pct(machineStats.mismatchAgreed, machineStats.mismatch)})`],
    ]), `Documents with no machine reading (no current text cache): ${machineStats.noMachineReading} row(s).`, '');
  }
  lines.push('## Class by kind and field', '', table(['kind', 'field', 'class', 'rows'], tally(rows, (r) => `${r.Kind}\u0000${r.Field}\u0000${r.Class}`).slice(0, 80).map(([k, n]) => [...k.split('\u0000'), n])));
  const docs = new Map();
  for (const r of rows) { const d = docs.get(r.SourceID) ?? { n: 0, new: 0, mismatch: 0, visual: 0 }; d.n++; if (r.Class === 'new') d.new++; if (r.Class === 'mismatch') d.mismatch++; if (r.Presence === 'visual-only') d.visual++; docs.set(r.SourceID, d); }
  lines.push('## By document', '', table(['SourceID', 'rows', 'new', 'mismatch', 'visual-only', 'held rows unread'], [...docs].sort((a, b) => b[1].mismatch - a[1].mismatch || b[1].new - a[1].new).map(([id, d]) => [id, d.n, d.new, d.mismatch, d.visual, unreadHeld.filter((u) => u.SourceID === id).length])));
  if (invalid.length) lines.push('## Invalid rows', '', table(['reason', 'rows'], tally(invalid.flatMap((r) => r.bad.map((b) => ({ b }))), (r) => r.b.split(':')[0])), '');
  lines.push('## Files', '', ...Object.entries(files).map(([f, n]) => `- ${f}: ${n}`), '');
  return lines.join('\n');
}

function writeAll(result, dir, run) {
  mkdirSync(join(dir, 'second-read'), { recursive: true });
  const files = {};
  for (const [name, pick] of Object.entries(FILES)) {
    const rows = result.rows.filter(pick);
    files[name] = rows.length;
    // Confirmations are mostly noise once there are thousands: keep the count, and the rows only when few.
    if (name === 'confirms.csv' && rows.length > 2000) { writeFileSync(join(dir, name), csvText(OUT, rows.filter((r) => r.Flags))); continue; }
    writeFileSync(join(dir, name), csvText(OUT, rows));
  }
  writeFileSync(join(dir, 'invalid.csv'), csvText([...HEADER, 'RowID', 'bad'], result.invalid.map((r) => ({ ...r, bad: r.bad.join(' ') })))); files['invalid.csv'] = result.invalid.length;
  writeFileSync(join(dir, 'duplicates.csv'), csvText([...HEADER, 'RowID', 'of'], result.duplicates)); files['duplicates.csv'] = result.duplicates.length;
  writeFileSync(join(dir, 'unread-held.csv'), csvText(['SourceID', 'ID', 'Kind', 'Grade', 'What', 'Locator'], result.unreadHeld)); files['unread-held.csv'] = result.unreadHeld.length;
  writeFileSync(join(dir, 'second-read', 'tasks.csv'), csvText(['task_id', 'source_id', 'page', 'kind', 'field', 'product', 'label', 'locator'], result.tasks)); files['second-read/tasks.csv'] = result.tasks.length;
  writeFileSync(join(dir, 'summary.md'), summarize(result, { run, files }));
  return files;
}

async function main() {
  const arg = (name, fallback = null) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback; };
  const list = (name) => (arg(name) ?? '').split(',').filter(Boolean);
  const run = arg('run', 'r1');
  const out = resolve(projectRoot, arg('out', `docs/audits/2026-10-04-reader-round/reconcile/${run}`));
  const files = list('readings');
  if (!files.length) { console.error('usage: read-reconcile --readings a.csv[,b.csv] [--second s.csv] [--run r1] [--docs DOCS.csv] [--out dir]'); process.exit(2); }
  const tables = loadTables();
  const docsPath = arg('docs');
  const digests = new Map(docsPath ? readCsv(resolve(projectRoot, docsPath)).records.map((r) => [r.values.SourceID, r.values.SHA256]) : []);
  const shaOf = (id) => tables.sources.find((s) => s.SourceID === id)?.SHA256 ?? digests.get(id) ?? null;
  const documents = new Map();
  const documentFor = (id) => { if (!documents.has(id)) documents.set(id, loadDocument({ sha: shaOf(id), sourceId: id })); return documents.get(id); };
  let machineFor = null;
  if (!process.argv.includes('--no-machine')) {
    const { cachedText } = await import('../lib/pdf-text.mjs');
    const { machineReading } = await import('./read-machine.mjs');
    machineFor = async (id) => { const sha = shaOf(id); const text = sha ? cachedText(sha) : null; return text ? machineReading(text) : null; };
  }
  // A file that is not a readings CSV (a row with an unquoted comma, a missing column) is skipped whole and named: it is
  // the reader's to redo, and one broken batch must not stop the others.
  const skippedFiles = [];
  const readAll = (list) => list.flatMap((f) => { try { return parseReadings(readFileSync(f, 'utf8'), f.split('/').pop()); } catch (e) { skippedFiles.push(`${f}: ${String(e.message).split('\n')[0]}`); return []; } });
  const rows = readAll(files);
  const seconds = readAll(list('second'));
  const vocabOf = (name, col) => readCsv(join(projectRoot, 'schema/vocab', name)).records.map((r) => r.values[col]);
  const result = await reconcile({ rows, seconds, tables, documentFor, machineFor, vocab: { units: vocabOf('units.csv', 'Value'), operators: vocabOf('operators.csv', 'Value') } });
  mkdirSync(out, { recursive: true });
  const written = writeAll(result, out, run);
  if (skippedFiles.length) { writeFileSync(join(out, 'skipped-files.txt'), `${skippedFiles.join('\n')}\n`); console.log(`skipped ${skippedFiles.length} unreadable file(s):\n${skippedFiles.join('\n')}`); }
  console.log(`${result.rows.length} classified, ${result.invalid.length} invalid, ${result.duplicates.length} duplicate(s), ${result.tasks.length} second-read task(s) -> ${out}`);
  console.log(JSON.stringify(written));
}

if (process.argv[1]?.endsWith('read-reconcile.mjs')) await main();
