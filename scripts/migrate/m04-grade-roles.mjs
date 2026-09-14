#!/usr/bin/env node
// Migration m04: a grade says what it is; a material's grade list follows from its grades.
//
// Before: retirement was the exact Availability phrase "Retired mapping; audit trail only", a study
// or resin-reference grade was recognisable only by an -R# suffix on its ID, and Materials "GradeIDs"
// repeated the procurement grades by hand.
//
// After: Grades carries Role (procurement | study | reference) and Status (active | retired), and a
// material's procurement grades are its active procurement grades in file order. The migration proves
// that list equals every GradeIDs cell before removing the column.

import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';

const RETIRED = 'Retired mapping; audit trail only';
const ids = (cell) => (cell == null ? [] : String(cell).split(/[;,]/).map((s) => s.trim()).filter((s) => s && !/^(not published|not applicable)$/i.test(s)));

export function migrate(t) {
  if (t.header('grades').includes('Role')) return; // already applied
  const role = (g) => {
    if (!/-R\d+$/.test(g.GradeID)) return 'procurement';
    if (/^Research specimen grade/.test(g.Availability)) return 'study';
    if (/^Resin reference only/.test(g.Availability)) return 'reference';
    throw new Error(`grades ${g.GradeID}: an -R grade that is neither a research specimen nor a resin reference`);
  };
  t.addColumn('grades', 'Role', { after: 'MaterialID', fill: role });
  t.addColumn('grades', 'Status', { after: 'Role', fill: (g) => (g.Availability === RETIRED ? 'retired' : 'active') });

  for (const mat of t.rows('materials')) {
    const derived = t.rows('grades').filter((g) => g.MaterialID === mat.MaterialID && g.Role === 'procurement' && g.Status === 'active').map((g) => g.GradeID);
    if (JSON.stringify(derived) !== JSON.stringify(ids(mat.GradeIDs))) throw new Error(`${mat.MaterialID}: GradeIDs "${mat.GradeIDs}" is not its active procurement grades (${derived.join('; ')})`);
  }
  t.dropColumn('materials', 'GradeIDs');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables(undefined, { allowMissing: true });
  migrate(t);
  console.log(`${t.save().length} change(s)`);
}
