#!/usr/bin/env node
// Migration m51 (2026-09-18): one company, one manufacturer value (owner ruling, 2026-09-18).
//
// grades.Manufacturer became a vocabulary in the Version 2 hardening, with today's thirty spellings kept as they
// were. Five of them name one company twice: a brand line (Polymaker's Fiberon), a company under two names (Kimya
// and Airtech Europe, Fabru and purefil, Essentium and Nexa3D), or a legal name where the trading name is used
// everywhere else (Guangzhou Yousu 3D Technology). Each becomes the company, and the brand line stays in the
// product's name, where it belongs.
//
// This is not cosmetic. The estimate model reads Manufacturer as the test house: grades sharing a maker share a
// systematic offset for that laboratory's way of testing. Merging asserts that Fiberon's three filled-fibre
// products were tested as Polymaker's other twenty-one were, which is what one company with one laboratory means.
// The estimates that lean on either move, and the snapshot diff is the record of it.
//
// DuPont / Celanese is left alone: that value records one sheet whose product passed between two companies, and
// merging it into either would assert a laboratory that the sheet does not.
//
// No material holds two of the merged spellings among its active procurement grades, so no Grades coverage row's
// manufacturer count changes.
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm51';

export const MERGES = {
  'Polymaker (Fiberon)': 'Polymaker',
  'Kimya / Airtech Europe': 'Kimya',
  'Fabru / purefil': 'Fabru',
  'Guangzhou Yousu 3D Technology': 'Yousu',
  'Essentium / Nexa3D': 'Essentium',
};

export function migrate(t) {
  for (const grade of t.rows('grades')) {
    const merged = MERGES[grade.Manufacturer];
    if (merged) t.set('grades', grade.GradeID, 'Manufacturer', merged, { expect: grade.Manufacturer });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record} ${c.field}: ${c.before} -> ${c.after}`);
}
