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
  for (const r of onGrade('prices').filter((p) => p.Quarantined !== 'TRUE')) todo.push({ table: 'prices', record: r.PriceID, action: 'quarantine the offer (Regular price basis "Quarantined: ...") or move it to the active grade' });
  for (const r of onGrade('evidence')) todo.push({ table: 'evidence', record: r.EvidenceID ?? r[t.schemas.evidence.primaryKey], action: 'move the record to the active grade or quarantine it' });
  const measurementIds = new Set(onGrade('measurements').map((r) => r.MeasurementID));
  for (const h of t.rows('headlines').filter((h) => measurementIds.has(h.MeasurementID))) todo.push({ table: 'headlines', record: `${h.MaterialID} ${h.HeadlineKey}`, action: `select a measurement of the representative grade instead of ${h.MeasurementID}` });
  for (const m of t.rows('materials').filter((m) => m['Representative grade'] === gradeId)) todo.push({ table: 'materials', record: m.MaterialID, action: 'choose another representative grade' });
  for (const s of t.rows('sources').filter((s) => String(s['Applicable grades'] ?? '').includes(gradeId))) todo.push({ table: 'sources', record: s.SourceID, action: `update Applicable grades, which names ${gradeId}` });
  return todo;
}

/**
 * Re-file a grade under the material its sheet says it is, the way m25 re-filed HyperLite PP (D72: nothing is
 * deleted, and an ID is never reused). A GradeID carries its material's number, so the grade itself cannot move:
 * the old grade is retired and a copy takes the next ID under the new material; each of its measurements is copied
 * under the new grade and the original retired as a duplicate naming its twin; each of its print profiles and their
 * notes are copied; a source that names the old grade names both. It refuses where a headline or a material's
 * representative grade rests on the grade, because moving those is a decision about the old material, not a copy.
 * A re-run is a no-op: a retired grade has been re-filed already.
 */
export function refileGrade(t, gradeId, materialId, { migration, date, why }) {
  const old = t.get('grades', gradeId);
  if (old.Status === 'retired') return null;
  const measurements = t.rows('measurements').filter((m) => m.GradeID === gradeId && m['Data status'] !== 'Retired duplicate record');
  const ids = new Set(measurements.map((m) => m.MeasurementID));
  const leaning = [
    ...t.rows('headlines').filter((h) => ids.has(h.MeasurementID)).map((h) => `headline ${h.MaterialID} ${h.HeadlineKey}`),
    ...t.rows('materials').filter((m) => m['Representative grade'] === gradeId).map((m) => `representative grade of ${m.MaterialID}`),
    ...t.rows('evidence').filter((e) => e.GradeID === gradeId).map((e) => `evidence ${e.EvidenceID}`),
    ...t.rows('prices').filter((p) => p.GradeID === gradeId).map((p) => `price ${p.PriceID}`),
  ];
  if (leaning.length) throw new Error(`${migration}: ${gradeId} carries ${leaning.join(', ')}; move those by hand before re-filing it`);
  const note = (text, sentence) => (/^(Not applicable|Not published|)$/.test(text ?? '') ? sentence : `${text} ${sentence}`);
  const grade = nextId('grades', t.rows('grades').map((g) => g.GradeID), { materialId });
  t.append('grades', { ...old, GradeID: grade, MaterialID: materialId });
  retireGrade(t, gradeId);
  t.set('grades', gradeId, 'Selected-grade rationale', `Retired ${date} (${migration}): re-filed as ${grade}. ${why}`, { expect: old['Selected-grade rationale'] });
  for (const m of measurements) {
    const id = nextId('measurements', t.rows('measurements').map((x) => x.MeasurementID));
    t.append('measurements', { ...m, MeasurementID: id, MaterialID: materialId, GradeID: grade, Notes: note(m.Notes, `Re-filed ${date} (${migration}) from ${m.MeasurementID}: ${why}`) });
    t.set('measurements', m.MeasurementID, 'Data status', 'Retired duplicate record', { expect: m['Data status'] });
    t.set('measurements', m.MeasurementID, 'Notes', note(m.Notes, `Retired ${date} (${migration}): re-filed under ${grade} as ${id}.`), { expect: m.Notes });
  }
  for (const p of t.rows('profiles').filter((x) => x.GradeID === gradeId)) {
    const id = nextId('profiles', t.rows('profiles').map((x) => x.ProfileID));
    t.append('profiles', { ...p, ProfileID: id, MaterialID: materialId, GradeID: grade });
    for (const n of t.rows('profile_notes').filter((x) => x.ProfileID === p.ProfileID)) t.append('profile_notes', { ...n, ProfileID: id });
  }
  for (const s of t.rows('sources').filter((x) => String(x['Applicable grades'] ?? '').split(/;\s*/).includes(gradeId))) {
    t.set('sources', s.SourceID, 'Applicable grades', `${s['Applicable grades']}; ${grade}`, { expect: s['Applicable grades'] });
  }
  return grade;
}

/**
 * A material's stored Grades coverage row, recounted after its grades changed. The manufacturer count is a column,
 * and a row that no longer states the truth is superseded rather than edited (D72's rule for coverage, the m37
 * pattern); the new row says why it was recounted. Returns the new row's ID, or null where the count still holds.
 */
export function recountGrades(t, materialId, { migration, date, because }) {
  const names = new Set(t.rows('grades').filter((g) => g.MaterialID === materialId && g.Role === 'procurement' && g.Status === 'active').map((g) => g.Manufacturer));
  const count = names.size;
  let made = null;
  for (const old of t.rows('coverage').filter((c) => c.MaterialID === materialId && c.Domain === 'Grades' && c.Status !== 'Superseded')) {
    if (old['Manufacturer count'] === 'Not applicable' || Number(old['Manufacturer count']) === count) continue;
    const newId = nextId('coverage', t.rows('coverage').map((c) => c.CoverageID));
    t.append('coverage', {
      CoverageID: newId, MaterialID: materialId, Domain: 'Grades', Status: count >= 3 ? 'Resolved' : 'Gap',
      'Manufacturer count': String(count),
      Finding: `${count} distinct manufacturer(s) documented against target 3: ${[...names].sort().join(', ')}. Recounted ${date} (${migration}) ${because}.`,
    });
    t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${newId} (${date}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
    t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status });
    t.set('coverage', old.CoverageID, 'Manufacturer count', 'Not applicable', { expect: old['Manufacturer count'] });
    made = newId;
  }
  return made;
}
