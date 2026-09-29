// Record scaffolding and retirement, built on table-io (every write keeps the tables canonical and the manifest
// current). Used by scripts/data/new.mjs and scripts/data/retire.mjs, and tested in test/data-check.test.js.

import { nextId } from './table-io.mjs';

const NP = 'Not published', NA = 'Not applicable';

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
    try {
      row[pk] = nextId(table, t.rows(table).map((r) => r[pk]), table === 'grades' ? { materialId, study } : {});
    } catch (e) {
      // A table whose IDs are chosen by hand (sources: S-..., R-...) takes the one given, if no record has it yet.
      if (!set[pk]) throw new Error(`${e.message}; pass --set ${pk}=...`);
      if (t.find(table, set[pk])) throw new Error(`${table}: ${set[pk]} already exists`);
      row[pk] = set[pk];
    }
    if (materialId && schema.fields.some((f) => f.name === 'MaterialID')) row.MaterialID = materialId;
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
 * Retire a grade: Status alone, the one place retirement is recorded (m147). Availability keeps what was recorded about
 * the product. Returns what still depends on the grade, each with what must happen to it; nothing else is changed,
 * because whether a record is a duplicate to retire, a value to re-file under another grade, or an offer to quarantine
 * is a decision.
 */
export function retireGrade(t, gradeId) {
  const g = t.get('grades', gradeId);
  if (g.Status !== 'retired') t.set('grades', gradeId, 'Status', 'retired', { expect: g.Status });
  const todo = [];
  const onGrade = (table) => t.rows(table).filter((r) => r.GradeID === gradeId);
  const ownMeasurements = onGrade('measurements').filter((r) => !['Retired duplicate record', 'Unresolved unit / layout'].includes(r['Data status']));
  for (const r of ownMeasurements) todo.push({ table: 'measurements', record: r.MeasurementID, action: 'retire as a duplicate (Data status "Retired duplicate record") if its twin exists under the active grade, else re-file it under the grade that is its product' });
  for (const r of onGrade('profiles')) todo.push({ table: 'profiles', record: r.ProfileID, action: 'retire the profile or move it to the active grade (an active profile may not use a retired grade)' });
  for (const r of onGrade('prices').filter((p) => p.Quarantined !== 'TRUE')) todo.push({ table: 'prices', record: r.PriceID, action: 'quarantine the offer (Regular price basis "Quarantined: ...") or move it to the active grade' });
  for (const r of onGrade('evidence')) todo.push({ table: 'evidence', record: r.EvidenceID ?? r[t.schemas.evidence.primaryKey], action: 'move the record to the active grade or quarantine it' });
  const measurementIds = new Set(onGrade('measurements').map((r) => r.MeasurementID));
  for (const h of t.rows('headlines').filter((h) => measurementIds.has(h.MeasurementID))) todo.push({ table: 'headlines', record: `${h.MaterialID} ${h.HeadlineKey} ${h.MeasurementID}`, action: 'remove the pin, which a retired product no longer needs (D72: a removal names its migration)' });
  for (const s of t.rows('sources').filter((s) => String(s['Applicable grades'] ?? '').includes(gradeId))) todo.push({ table: 'sources', record: s.SourceID, action: `update Applicable grades, which names ${gradeId}` });
  return todo;
}

/**
 * Move a product to another material by its MaterialID (D86): the grade, every record filed under it (measurements,
 * profiles, evidence, prices) and the printing citations of its own profiles and evidence. Every ID stays, so every
 * link, pin and statement still resolves; the GradeID keeps the number of the material it was first filed under.
 * A re-pointed citation's ledger row names `migration` (table-io update). Returns the number of records moved with
 * it, or 0 when it is already there.
 */
export function moveGrade(t, gradeId, materialId, { migration } = {}) {
  const from = t.get('grades', gradeId).MaterialID;
  if (from === materialId) return 0;
  t.get('materials', materialId);
  t.set('grades', gradeId, 'MaterialID', materialId, { expect: from });
  const own = new Set();
  let records = 0;
  for (const table of ['measurements', 'profiles', 'evidence', 'prices']) {
    const pk = t.schemas[table].primaryKey;
    for (const r of t.rows(table).filter((x) => x.GradeID === gradeId)) {
      if (r.MaterialID !== from) throw new Error(`${table} ${r[pk]} is on ${gradeId} but filed under ${r.MaterialID}`);
      t.set(table, r[pk], 'MaterialID', materialId, { expect: from });
      own.add(r[pk]);
      records++;
    }
  }
  for (const l of t.rows('material_links').filter((x) => x.MaterialID === from && x.Link === 'printing' && own.has(x.RecordID))) {
    t.update('material_links', { MaterialID: from, Link: 'printing', RecordID: l.RecordID }, 'MaterialID', materialId, { expect: from, migration });
  }
  return records;
}

/**
 * Re-file a grade under the material its sheet says it is, the way m25 re-filed HyperLite PP (D72: nothing is
 * deleted, and an ID is never reused). Since m141 moveGrade (above) is the lighter way, and the one to use (D86); this
 * copy-and-retire is kept for the migrations that used it. Here the grade is not moved:
 * the old grade is retired and a copy takes the next ID under the new material; each of its measurements is copied
 * under the new grade and the original retired as a duplicate naming its twin; each of its print profiles and their
 * notes are copied; a source that names the old grade names both. It refuses where a pinned headline value rests on
 * the grade, because moving it is a decision about the old material, not a copy.
 * A re-run is a no-op: a retired grade has been re-filed already.
 */
export function refileGrade(t, gradeId, materialId, { migration, date, why }) {
  const old = t.get('grades', gradeId);
  if (old.Status === 'retired') return null;
  const measurements = t.rows('measurements').filter((m) => m.GradeID === gradeId && m['Data status'] !== 'Retired duplicate record');
  const ids = new Set(measurements.map((m) => m.MeasurementID));
  const leaning = [
    ...t.rows('headlines').filter((h) => ids.has(h.MeasurementID)).map((h) => `pinned headline ${h.MaterialID} ${h.HeadlineKey}`),
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
      CoverageID: newId, MaterialID: materialId, GradeID: 'Not applicable', Domain: 'Grades', Status: count >= 3 ? 'Resolved' : 'Gap',
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
