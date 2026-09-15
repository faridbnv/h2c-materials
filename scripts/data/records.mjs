// Record scaffolding and retirement, built on table-io (every write keeps the tables canonical and the manifest
// current). Used by scripts/data/new.mjs and scripts/data/retire.mjs, and tested in test/data-check.test.js.

import { nextId } from './table-io.mjs';

const NP = 'Not published', NA = 'Not applicable';
export const RETIRED_AVAILABILITY = 'Retired mapping; audit trail only';

/**
 * A complete new row for `table`: the next ID, every column filled from a template row (`like`), then `set`, and
 * any remaining column with its declared missing state (Not published where allowed, else Not applicable).
 * Returns { row, unset }: required columns that have neither a value nor an allowed missing state.
 */
export function newRecord(t, table, { like, material, study = false, set = {} } = {}) {
  const schema = t.schemas[table];
  if (!schema) throw new Error(`No table "${table}"`);
  const pk = schema.primaryKey;
  const base = like ? { ...t.get(table, like) } : {};
  const unknown = Object.keys(set).filter((k) => !schema.fields.some((f) => f.name === k));
  if (unknown.length) throw new Error(`${table}: unknown columns ${unknown.join(', ')}`);
  const row = { ...base, ...set };
  if (pk) {
    const materialId = material ?? row.MaterialID;
    row[pk] = nextId(table, t.rows(table).map((r) => r[pk]), table === 'grades' ? { materialId, study } : {});
    if (table === 'grades' && materialId) row.MaterialID = materialId;
  }
  const unset = [];
  for (const f of schema.fields) {
    if (row[f.name] != null && row[f.name] !== '') continue;
    const missing = f.missing ?? [];
    if (missing.includes(NP)) row[f.name] = NP;
    else if (missing.includes(NA)) row[f.name] = NA;
    else if (missing.length) row[f.name] = missing[0];
    else if (f.constraints?.required) unset.push(f.name);
  }
  return { row, unset };
}

/**
 * Retire a grade: Status and Availability together (a half-finished retirement is GRADE-RETIREMENT-HALF). Returns
 * what still depends on the grade, each with what must happen to it; nothing else is changed, because whether a
 * record is a duplicate to retire, a value to re-file under another grade, or an offer to quarantine is a decision.
 */
export function retireGrade(t, gradeId) {
  const g = t.get('grades', gradeId);
  if (g.Status !== 'retired') t.set('grades', gradeId, 'Status', 'retired', { expect: g.Status });
  if (g.Availability !== RETIRED_AVAILABILITY) t.set('grades', gradeId, 'Availability', RETIRED_AVAILABILITY, { expect: g.Availability });
  const todo = [];
  const onGrade = (table) => t.rows(table).filter((r) => r.GradeID === gradeId);
  const ownMeasurements = onGrade('measurements').filter((r) => !['Retired duplicate record', 'Unresolved unit / layout'].includes(r['Data status']));
  for (const r of ownMeasurements) todo.push({ table: 'measurements', record: r.MeasurementID, action: 'retire as a duplicate (Data status "Retired duplicate record") if its twin exists under the active grade, else re-file it under the grade that is its product' });
  for (const r of onGrade('profiles')) todo.push({ table: 'profiles', record: r.ProfileID, action: 'retire the profile or move it to the active grade (an active profile may not use a retired grade)' });
  for (const r of onGrade('prices').filter((p) => !/^quarantined/i.test(p['Regular price basis'] ?? ''))) todo.push({ table: 'prices', record: r.PriceID, action: 'quarantine the offer (Regular price basis "Quarantined: ...") or move it to the active grade' });
  for (const r of onGrade('evidence')) todo.push({ table: 'evidence', record: r.EvidenceID ?? r[t.schemas.evidence.primaryKey], action: 'move the record to the active grade or quarantine it' });
  const measurementIds = new Set(onGrade('measurements').map((r) => r.MeasurementID));
  for (const h of t.rows('headlines').filter((h) => measurementIds.has(h.MeasurementID))) todo.push({ table: 'headlines', record: `${h.MaterialID} ${h.HeadlineKey}`, action: `select a measurement of the representative grade instead of ${h.MeasurementID}` });
  for (const m of t.rows('materials').filter((m) => m['Representative grade'] === gradeId)) todo.push({ table: 'materials', record: m.MaterialID, action: 'choose another representative grade' });
  for (const s of t.rows('sources').filter((s) => String(s['Applicable grades'] ?? '').includes(gradeId))) todo.push({ table: 'sources', record: s.SourceID, action: `update Applicable grades, which names ${gradeId}` });
  return todo;
}
