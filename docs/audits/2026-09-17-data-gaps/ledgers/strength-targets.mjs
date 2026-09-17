#!/usr/bin/env node
// Where the next tensileStrengthXY this-material back-test cases can come from.
//
// The class holds 12 of the 22 cases a screening limit needs. The import backlog supplies at most 8 more
// (import-backlog.csv), so a handful of further second products are needed. A case needs a SECOND FORMULATION of a
// material whose headline strength is already measured, publishing any tensile strength endpoint or a flexural
// strength, in any direction (build/src/estimate/observations.js kindOf).
//
//   node docs/audits/2026-09-17-data-gaps/ledgers/strength-targets.mjs
//
// The "publishers to ask" column is not a recommendation to buy or a claim that a product exists. It lists the
// publishers this register already holds a document from, whose recorded product titles name this material's own
// name or its family. Whether such a product exists, and what it publishes, is decided by fetching and reading its
// data sheet (D35) - not here.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText, parseCsvText } from '../../../../build/src/csv.js';
import { openTables } from '../../../../scripts/data/table-io.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
const read = (p, label) => parseCsvText(readFileSync(p, 'utf8'), label).records.map((r) => r.values);

const cases = read(join(here, 'certification-cases.csv'), 'certification-cases.csv');
const backlog = read(join(here, 'import-backlog.csv'), 'import-backlog.csv');
const templates = read(join(root, 'build/snapshot/templates.csv'), 'templates.csv');

const t = openTables();
const materials = new Map(t.rows('materials').map((r) => [r.MaterialID, r]));
const sources = t.rows('sources');
const gradesByMaterial = new Map();
for (const g of t.rows('grades')) {
  if (!gradesByMaterial.has(g.MaterialID)) gradesByMaterial.set(g.MaterialID, []);
  gradesByMaterial.get(g.MaterialID).push(g);
}

// A material's own manufacturers today: nothing is gained by a product from one of them under the same formulation.
const ownManufacturers = (id) => new Set((gradesByMaterial.get(id) ?? [])
  .filter((g) => g.Status === 'active' && g.Role === 'procurement').map((g) => g.Manufacturer));

// Publishers to ask: the ones this register already holds a grade from for another material of the same family, and
// that do not already make this material. It says who is reachable and in the family, never that a product exists.
const familyOf = (id) => materials.get(id)?.Family;
const publishersInFamily = new Map();
for (const g of t.rows('grades')) {
  if (g.Status !== 'active' || g.Role !== 'procurement') continue;
  const fam = familyOf(g.MaterialID);
  if (!fam) continue;
  if (!publishersInFamily.has(fam)) publishersInFamily.set(fam, new Set());
  publishersInFamily.get(fam).add(g.Manufacturer);
}

const inBacklog = new Set(backlog.filter((b) => b.Ready.startsWith('yes') && b['Classes it feeds'].includes('tensileStrengthXY')).map((b) => b.MaterialID));

// How much a certified strength screen could matter for a material: how many template verdicts it is still UNKNOWN in.
const unknowns = new Map();
for (const r of templates) if (r.Verdict === 'UNKNOWN') unknowns.set(r.MaterialID, (unknowns.get(r.MaterialID) ?? 0) + 1);

const STATUS_RANK = { 'Official Bambu product': 0, 'Officially listed family': 1, Conditional: 2, Theoretical: 3, Excluded: 4 };

const rows = cases
  .filter((c) => c.Headline === 'tensileStrengthXY' && c['This-material case'] === 'no')
  .map((c) => {
    const m = materials.get(c.MaterialID);
    const own = ownManufacturers(c.MaterialID);
    const ask = [...(publishersInFamily.get(m.Family) ?? [])].filter((p) => !own.has(p)).sort();
    return {
      MaterialID: c.MaterialID, Material: m['Original name'], Family: m.Family, 'H2C status': m['H2C status'],
      'Headline grade': c['Headline grade'], 'Manufacturers today': [...own].sort().join('; ') || 'Not applicable',
      'Other formulations today': c['Other active formulations'],
      'In the import backlog': inBacklog.has(c.MaterialID) ? 'yes' : 'no',
      'Template verdicts still UNKNOWN': String(unknowns.get(c.MaterialID) ?? 0),
      'Publishers in this register making this family': ask.join('; ') || 'none recorded',
      'What a second product must publish': 'a tensile strength (any endpoint) or a flexural strength, any direction',
    };
  })
  .sort((a, b) => (a['In the import backlog'] === b['In the import backlog'] ? 0 : a['In the import backlog'] === 'yes' ? -1 : 1)
    || (STATUS_RANK[a['H2C status']] ?? 9) - (STATUS_RANK[b['H2C status']] ?? 9)
    || Number(b['Template verdicts still UNKNOWN']) - Number(a['Template verdicts still UNKNOWN'])
    || a.MaterialID.localeCompare(b.MaterialID));

writeFileSync(join(here, 'strength-targets.csv'), csvText(Object.keys(rows[0]), rows));

const have = cases.filter((c) => c.Headline === 'tensileStrengthXY' && c['This-material case'] === 'yes').length;
const fromBacklog = rows.filter((r) => r['In the import backlog'] === 'yes').length;
console.log(`strength-targets.csv: ${rows.length} materials with a measured strength headline and no second formulation.`);
console.log(`  cases today ${have}; the backlog can add ${fromBacklog} (to ${have + fromBacklog}); 22 are needed, so ${Math.max(0, 22 - have - fromBacklog)} more are wanted.`);
console.log('  Best of the rest, by status then by how many template verdicts they are still UNKNOWN in:');
for (const r of rows.filter((x) => x['In the import backlog'] === 'no').slice(0, 12))
  console.log(`    ${r.MaterialID} ${r.Material.padEnd(20)} ${r['H2C status'].padEnd(24)} UNKNOWN ${r['Template verdicts still UNKNOWN'].padStart(2)}  ask: ${r['Publishers in this register making this family']}`);
