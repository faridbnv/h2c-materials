// b43-lib: the row builders the batch's build script uses. Every typed column is the build's parsers' reading of the
// sheet's own words (measurementRow / profileFor in scripts/ingest/propose.mjs); this file only supplies the words and
// the conditions the page states, and re-derives the typed columns a stated condition changes with the same parsers.
import { openTables } from '../../../../scripts/data/table-io.mjs';
import { measurementRow, profileFor, targetUnit } from '../../../../scripts/ingest/propose.mjs';
import { readStandards } from '../../../../build/src/normalize/standards.js';
import { readPostProcessingState, parseAnnealSchedule } from '../../../../build/src/normalize/specimen.js';
import { readMoistureState } from '../../../../build/src/normalize/moisture.js';
import { parseHdtStandard } from '../../../../build/src/normalize/thermal.js';
import { loadCellFromParsed, testTemperatureCell } from '../../../../build/src/typed-values.js';
import { parseAbrasion } from '../../../../build/src/normalize/process.js';
import { cachedText, numberOnPage, valueInEvidence } from '../../../../scripts/lib/pdf-text.mjs';

export const NP = 'Not published', NA = 'Not applicable';
export const BY = 'Claude Sonnet (gap round 2, b43), checked by Claude Opus';
export const DATE = '2026-10-05';

const t = openTables();
const registry = new Map(t.rows('properties').map((p) => [p.Property, p]));
export const tables = t;

/**
 * One measurement proposal. `o`:
 *  property, label (the row's label as printed), unit (the unit the page prints, or the normalized unit where the page's
 *  unit is the same quantity spelled differently), raw (the value cell as printed), num (the number), line (the page's own
 *  row text the number is read from), page, direction, specimenType, std (the standard / load words), notch, testTemp
 *  (words), post, moisture, params (Specimen / print parameters), op, notes, status, review (Parse review), locator.
 */
export function meas(ctx, o) {
  const target = targetUnit(o.property, o.unit, registry);
  if (!target) throw new Error(`no unit conversion for ${o.property} ${o.unit}`);
  const v = {
    page: o.page, property: o.property, methodNote: null, familyStandards: null, mergedStandards: null,
    label: o.label, condition: '', direction: 'Not applicable', notch: o.notch ?? null,
    read: { raw: o.raw, rawNumber: String(o.num), printedUnit: o.unit, uncertainty: null, upper: null, operator: o.op ?? '=', standards: [], conditions: '', trailing: '', match: { re: /(?!)/ }, ambiguous: null },
    target, line: o.line, footnote: null, printedSpecimens: false, orientation: null, block: '', column: null, specimen: null, parameters: null,
  };
  const row = measurementRow(v, { sourceId: ctx.sourceId, materialId: ctx.materialId ?? '', gradeId: '', window: {} });
  row.GradeID = '';
  row['Raw value'] = o.raw;
  row['Raw numeric'] = o.numText ?? String(o.num);
  row.Operator = o.op ?? '=';
  row['Data status'] = o.status ?? 'Published value';
  row.Direction = o.direction ?? NA;
  row['Specimen type'] = o.specimenType ?? 'Not published (do not assume printed)';
  const std = o.std ?? '';
  row['Standard / load'] = std || NP;
  const stds = readStandards(std);
  row.Standards = stds.length ? stds.join('; ') : NP;
  row['Test load MPa'] = o.property === 'HDT' ? loadCellFromParsed(parseHdtStandard(std)) : NA;
  row.Notch = o.notch ?? NA;
  row['Test temperature'] = o.testTemp ?? NP;
  row['Test temperature °C'] = testTemperatureCell(o.testTemp ?? NP);
  const post = o.post ?? NP;
  const postState = readPostProcessingState(post) ?? 'not-stated';
  row['Post-processing'] = post;
  row['Post-processing state'] = postState;
  const sched = parseAnnealSchedule(post, postState);
  row['Anneal °C'] = postState === 'annealed' ? String(o.annealC ?? sched?.tempC ?? NP) : NA;
  row['Anneal h'] = postState === 'annealed' ? String(o.annealH ?? sched?.hours ?? NP) : NA;
  const moisture = o.moisture ?? NP;
  row['Moisture condition'] = moisture;
  row['Moisture state'] = o.moistureState ?? readMoistureState(moisture) ?? 'not-stated';
  row['Specimen / print parameters'] = o.params ?? NP;
  row.Locator = o.locator ?? `p. ${o.page}: ${o.label}`;
  row.Notes = o.notes ?? NA;
  row['Parse review'] = o.review ?? NA;
  row.MaterialID = ctx.materialId ?? '';
  return { gradeKey: o.gradeKey ?? 'main', row, evidence: { page: o.page, text: o.line }, o };
}

/** Review stamp, and whether the number binds to its evidence line and the page (else the row is read on the image). */
export function stamp(m, text, extra = {}) {
  const num = m.row['Raw numeric'];
  const onPage = numberOnPage(text, m.evidence.page, num);
  if (!onPage) throw new Error(`${m.row.Locator}: ${num} is not on page ${m.evidence.page} of the cached text`);
  for (const f of ['Anneal °C', 'Anneal h', 'Test temperature °C']) {
    if (/^\d/.test(m.row[f]) && !numberOnPage(text, m.evidence.page, m.row[f])) throw new Error(`${m.row.Locator}: ${f} ${m.row[f]} is not on page ${m.evidence.page}`);
  }
  const bound = valueInEvidence(m.evidence.text, num);
  const visual = extra.visual ?? (text.ocr ? true : !bound);
  return {
    gradeKey: m.gradeKey, row: m.row, evidence: m.evidence, confidence: 1,
    review: { status: 'accepted', by: BY, date: DATE, visual, note: `Read on the page image (150 dpi) against the cached ${text.ocr ? 'optical ' : ''}text${bound ? ' and bound to its evidence line' : '; the layout does not put the label and the value on one line, so the row is read on the page image'}.${extra.visualNote ? ` ${extra.visualNote}` : ''}` },
  };
}

/** A profile proposal from the sheet's own words per column; the typed columns are the parsers' reading. */
export function profile(ctx, p) {
  const settings = [];
  const push = (field, raw, line, label) => settings.push({ page: p.page, field, topic: '', label, raw, fromBelow: false, line });
  const c = p.cells;
  if (c.nozzle) push('nozzle', c.nozzle, p.lines.nozzle, 'Nozzle temperature');
  if (c.bed) push('bed', c.bed, p.lines.bed, 'Bed temperature');
  if (c.chamber) push('chamber', c.chamber, p.lines.chamber, 'Heated chamber');
  if (c.enclosure) push('enclosure', c.enclosure, p.lines.enclosure ?? c.enclosure, 'Enclosure');
  if (c.plate) push('plate', c.plate, p.lines.plate ?? c.plate, 'Build surface');
  if (c.drying) push('drying', c.drying, p.lines.drying ?? c.drying, 'Drying');
  if (c.nozzleMaterial) push('nozzle-material', c.nozzleMaterial, p.lines.nozzleMaterial, 'Nozzle specs');
  if (c.diameter) push('nozzle-diameter', c.diameter, p.lines.diameter, 'Nozzle diameter');
  for (const [topic, text] of p.notes ?? []) settings.push({ page: p.page, field: 'note', topic, label: topic, raw: text, fromBelow: false, line: text });
  const made = profileFor(settings, { sourceId: ctx.sourceId, materialId: ctx.materialId, locator: p.locator, page: p.page });
  if (!made) throw new Error('no profile');
  const row = made.row;
  if (c.abrasion) {
    const read = parseAbrasion(c.abrasion);
    if (read.requiresHardened == null) throw new Error(`the abrasion words do not parse: ${c.abrasion}`);
    row['Abrasion / clogging'] = c.abrasion;
    row['Hardened nozzle'] = read.requiresHardened ? 'TRUE' : 'FALSE';
  }
  if (p.support) row['Support pairing'] = p.support;
  if (p.chamberNote) row['Parse review'] = p.chamberNote;
  row.Profile = p.kind ?? 'Manufacturer published guidance';
  row.GradeID = ''; row.MaterialID = ctx.materialId;
  row.Locator = `p. ${p.page}: ${p.locator}`;
  return {
    gradeKey: p.gradeKey ?? 'main', row, notes: made.notes,
    evidence: { page: p.page, text: p.evidence },
    review: { status: 'accepted', by: BY, date: DATE, visual: true, note: "Read on the page image against the cached text; every cell is the page's own words and the typed columns are the parsers' reading." },
  };
}

export { cachedText };

export const num = (s) => Number(String(s).replace(/,/g, '').match(/^-?[\d.]+/)[0]);
export const ACCESSED = '2026-09-17';
export const FETCHED = (who) => `Fetched ${ACCESSED} by the V2 import (ledger.csv, doc_key below), hash-checked; read page by page on its page images and admitted in batch b43 (2026-10-05, ${who}).`;
