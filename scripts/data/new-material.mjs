#!/usr/bin/env node
// Scaffold a material and its first grade in one guarded write, and say what else the material needs before it can be
// a candidate. A material is a row in materials.csv plus records in six other tables (AGENTS.md, "Add a material"), so
// the parts that can be written without a judgement are written here and the rest is listed with the command for each.
//
//   npm run data:new-material -- --name "PA11" --polymer PA11 --family "Nylon / Polyamide" \
//     --manufacturer "Arkema" --product "Rilsan PA11" --source S-ARKEMA-PA11-TDS
//
// Scope defaults to H2C-relevant and H2C status to Conditional (schema/vocab/h2c-status.csv); --scope and --h2c-status
// set them, and every other column is --set, because what a reader is told about a material is written, not generated.
//   add --dry-run to print the rows without writing them, and --root <dir> to scaffold in a copy of the tables

import { join } from 'node:path';
import { openTables, projectRoot } from './table-io.mjs';
import { newRecord } from './records.mjs';
import { checkData } from '../../build/src/schema.js';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const name = opt('name');
if (!name) {
  console.error('usage: npm run data:new-material -- --name "PA11" [--polymer PA11] [--family "Nylon / Polyamide"] [--manufacturer X --product Y --source S-ID] [--like M052] [--dry-run]');
  process.exit(2);
}

try {
  const t = openTables(opt('root') ?? projectRoot);
  const like = opt('like');
  const polymer = opt('polymer') ?? name;
  const known = t.rows('polymers').some((p) => p.PolymerID === polymer);
  // A --set goes to whichever of the two tables has that column, so one command fills both rows.
  const set = { materials: {}, grades: {} };
  const has = (table, column) => t.schemas[table].fields.some((f) => f.name === column);
  args.forEach((a, i) => {
    if (a !== '--set') return;
    const [k, ...v] = args[i + 1].split('=');
    const table = has('materials', k) ? 'materials' : has('grades', k) ? 'grades' : null;
    if (!table) throw new Error(`No column "${k}" in materials.csv or grades.csv`);
    set[table][k] = v.join('=');
  });
  const material = newRecord(t, 'materials', {
    like,
    set: {
      ...set.materials,
      'Original name': name, 'Normalized name': name, Abbreviation: opt('abbreviation') ?? name,
      'Full name': opt('full-name') ?? name, Family: opt('family') ?? (like ? t.get('materials', like).Family : undefined),
      'Base polymer': polymer, 'Estimate identity': known ? polymer : 'Not applicable',
      Scope: opt('scope') ?? 'H2C-relevant', 'H2C status': opt('h2c-status') ?? 'Conditional',
    },
  });
  const rows = [['materials', material]];
  const manufacturer = opt('manufacturer');
  let grade = null;
  if (manufacturer) {
    grade = newRecord(t, 'grades', {
      material: material.row.MaterialID,
      set: { ...set.grades, Manufacturer: manufacturer, 'Product name': opt('product') ?? name, SourceID: opt('source'), Role: 'procurement', Status: 'active' },
    });
    rows.push(['grades', grade]);
    material.row['Representative grade'] = grade.row.GradeID;
  }
  if (!known) console.log(`\nNote: "${polymer}" has no row in polymers.csv, so this material is not estimated. Add one (group, morphology, and the rest) to estimate it.`);
  for (const [table, r] of rows) {
    console.log(`${table}: ${JSON.stringify(r.row, null, 2)}`);
    if (r.unset.length) {
      console.error(`\n${table}: these columns carry no value and have no missing state to fall back on. They are what a reader is told about the material, so they are written, not generated. Add them to the command:`);
      for (const column of r.unset) console.error(`  --set "${column}=..."`);
      process.exit(1);
    }
  }
  if (args.includes('--dry-run')) process.exit(0);
  for (const [table, r] of rows) t.append(table, r.row);
  t.save();
  const base = opt('root') ?? projectRoot;
  const issues = checkData(join(base, 'data'), join(base, 'schema')).issues;
  for (const i of issues) console.log(`${i.where}  ${i.message}`);

  const id = material.row.MaterialID;
  console.log(`\n${id}${grade ? ` and ${grade.row.GradeID}` : ''} written. Still needed before it is a candidate:`);
  const todo = [
    !grade && `a grade: npm run data:new -- grades --material ${id} --set Manufacturer=... --set "Product name=..." --set SourceID=...`,
    `its source, if new: npm run data:new -- sources --set SourceID=... --set Publisher=... --set URL=... --set SHA256=...`,
    `measurements, from the source: npm run data:new -- measurements --like <a row of the same source> --set Property=... --set "Raw value=..."`,
    `headline selections: a row in data/tables/headlines.csv per headline the measurements support (MaterialID, HeadlineKey, MeasurementID, Use value)`,
    `a print profile: npm run data:new -- profiles --material ${id} --set GradeID=... --set SourceID=...`,
    `citations: rows in data/tables/material_links.csv (printing, h2c-status, use, durability, safety)`,
    `coverage: a row in data/tables/coverage.csv per domain, saying truthfully what is recorded and what is missing`,
    `then: npm run verify, and read the diff of build/snapshot`,
  ].filter(Boolean);
  for (const line of todo) console.log(`  - ${line}`);
  if (issues.length) process.exitCode = 1;
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
