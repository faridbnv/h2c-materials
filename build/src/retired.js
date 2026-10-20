// A material retired from the dataset (Scope Retired, D174): its row and every record filed under it stay in the tables
// as the record of what was read, their sources registered, and the build compiles none of them. No row of the
// selector, search result, drawer, material page, export or count holds it. Nothing is deleted (AGENTS.md): bringing it
// back is its Scope and its grades' Status.
//
// The tables are read through `inDataset` before every stage (pipeline.js), so compile, the chamber stage and validate
// see one dataset. A record leaves with its material by the column that files it there: a table with a MaterialID drops
// the retired material's rows, and a table that names only a grade, a measurement, a profile or a statement drops the
// rows of the retired material's records. Nothing else is dropped: a record of another material that points at a
// retired one's record (a family's member, a pin, a citation) is left in, so the check that resolves it stops the build.

import { issue } from './rules.js';

export const RETIRED_SCOPE = 'Retired';

// The sheets whose rows are a material's records, keyed by the column their own ID is in.
const RECORD_KEYS = [
  ['Grades', 'GradeID'],
  ['Properties', 'MeasurementID'],
  ['Print setup', 'ProfileID'],
  ['Use & durability', 'EvidenceID'],
];
const NOUN = { Grades: 'grade', Properties: 'measurement', 'Print setup': 'print profile', 'Use & durability': 'statement' };
const words = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;

/**
 * The tables without the retired materials and their records, and what was left out. Returns the tables unchanged (the
 * same object) where nothing is retired. `issues`: MATERIAL-RETIRED (info) per retired material, saying what stays
 * out; MATERIAL-RETIRED-ACTIVE (error) where a retired material still has an active grade.
 */
export function inDataset(wb) {
  const issues = [];
  const retired = new Set((wb.Materials?.rows ?? []).filter((r) => r.Scope === RETIRED_SCOPE).map((r) => r.MaterialID));
  if (!retired.size) return { wb, issues, retired: [] };

  // A retired material's own records, by their IDs, for the tables that name a record and no material.
  const ids = { GradeID: new Set(), MeasurementID: new Set(), ProfileID: new Set(), EvidenceID: new Set() };
  const counts = new Map([...retired].map((id) => [id, {}]));
  for (const [sheet, key] of RECORD_KEYS) {
    for (const r of wb[sheet]?.rows ?? []) {
      if (!retired.has(r.MaterialID)) continue;
      ids[key].add(r[key]);
      const c = counts.get(r.MaterialID);
      c[sheet] = (c[sheet] ?? 0) + 1;
    }
  }
  for (const g of wb.Grades?.rows ?? []) {
    if (retired.has(g.MaterialID) && g.Status !== 'retired') {
      issues.push(issue('MATERIAL-RETIRED-ACTIVE', `grades ${g.GradeID}`, `${g.GradeID} is active, and its material ${g.MaterialID} is retired from the dataset: retire the grade (npm run data:retire -- grade ${g.GradeID}), or bring the material back by its Scope`));
    }
  }

  // The column that files a row: a material's, a family's (its members leave with it), or else a record's.
  const fileKey = (header) => (header.includes('MaterialID') ? 'MaterialID' : header.includes('FamilyMaterialID') ? 'FamilyMaterialID'
    : Object.keys(ids).find((k) => header.includes(k)) ?? null);
  const out = {};
  for (const [sheet, table] of Object.entries(wb)) {
    const header = table?.header ?? Object.keys(table?.rows?.[0] ?? {});
    const key = Array.isArray(table?.rows) ? fileKey(header) : null;
    const gone = key === 'MaterialID' || key === 'FamilyMaterialID' ? retired : ids[key];
    out[sheet] = key ? { ...table, rows: table.rows.filter((r) => !gone.has(r[key])) } : table;
  }

  const list = [];
  for (const r of wb.Materials.rows.filter((x) => retired.has(x.MaterialID))) {
    const c = counts.get(r.MaterialID);
    const kept = RECORD_KEYS.map(([sheet]) => (c[sheet] ? words(c[sheet], NOUN[sheet]) : null)).filter(Boolean);
    list.push({ id: r.MaterialID, name: r['Original name'], family: r.Family });
    issues.push(issue('MATERIAL-RETIRED', `materials ${r.MaterialID}`, `${r['Original name']} is retired from the dataset (D174): its row${kept.length ? ` and its ${kept.join(', ')}` : ''} are kept in the tables and left out of the build`));
  }
  return { wb: out, issues, retired: list };
}
