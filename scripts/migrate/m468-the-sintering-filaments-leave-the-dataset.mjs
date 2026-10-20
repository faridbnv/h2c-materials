#!/usr/bin/env node
// Migration m468 (2026-10-20): the metal and ceramic sintering filaments leave the dataset (the owner's rulings,
// GOALS-LOG "Decided on 2026-10-20", item 5; D174).
//
// Since D87 (2026-09-25) the three sintering materials, 316L stainless steel (M171), silicon carbide (M172) and alumina
// (M173), with four products between them, were recorded and never a candidate: Scope Excluded, shown in the selector
// only to say why they are out. The owner ruled them out of the selector entirely, "from the dataset if need be": the
// printed part is a green part that is debinded and sintered elsewhere, so nothing the tool judges describes it, and the
// cold table opened on the 316L one. Nothing is deleted (AGENTS.md): each material's Scope becomes Retired, which the
// build reads as out of the dataset (build/src/retired.js), and each of its products is retired the one way a product
// is (retireGrade, as npm run data:retire does). Every record filed under them stays in the tables, and their five
// sources stay registered with their hashes; the build compiles none of it.
//
// Two rows spoke for these materials alone, and would name a material the dataset no longer holds:
//  - CN09, the chamber-need row for the Metal and Ceramic Sintering family (reported, deciding nothing), is retired;
//  - CV08, the flexural-to-tensile modulus band, lists "Metal powder" among the fillers it holds for, a modifier only
//    316L has; the value leaves its Applies to, which moves no answer (no material in the dataset has it).
//
// Written by Claude Opus 5.5 (an agent), track T3 of the owner's rulings round. A re-run is a no-op; a run after the data
// moved stops.
//
//   node scripts/migrate/m468-the-sintering-filaments-leave-the-dataset.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { retireGrade } from '../../scripts/data/records.mjs';

const MIGRATION = 'm468';
const RETIRED = ['M171', 'M172', 'M173'];
const FAMILY = 'Metal and Ceramic Sintering';
const NOTE = ' Retired from the dataset on 2026-10-20 (m468) by the owner\'s ruling (GOALS-LOG, "Decided on 2026-10-20", item 5; D174): its row, its products and their records stay in the tables and their sources registered, and the build compiles none of them.';

const t = openTables();
let n = 0;

for (const id of RETIRED) {
  const m = t.get('materials', id);
  if (m.Family !== FAMILY) throw new Error(`${MIGRATION}: ${id} is not a ${FAMILY} material (${m.Family})`);
  for (const g of t.rows('grades').filter((x) => x.MaterialID === id && x.Status !== 'retired')) {
    retireGrade(t, g.GradeID);
    n++;
  }
  if (m.Scope !== 'Retired') {
    t.set('materials', id, 'Scope', 'Retired', { expect: 'Excluded' });
    t.set('materials', id, 'Identity notes', `${m['Identity notes']}${NOTE}`, { expect: m['Identity notes'] });
    n++;
  }
}

const cn = t.get('chamber_need', 'CN09');
if (cn['Applies to'] !== `Family: ${FAMILY}`) throw new Error(`${MIGRATION}: CN09 is not the ${FAMILY} row it was`);
if (cn.Status !== 'retired') {
  t.set('chamber_need', 'CN09', 'Status', 'retired', { expect: 'reported' });
  t.set('chamber_need', 'CN09', 'Reason', `${cn.Reason} Retired on 2026-10-20 (m468, D174): the family's materials left the dataset.`, { expect: cn.Reason });
  n++;
}

const cv = t.get('conversions', 'CV08');
const was = cv['Applies to'];
if (/\bMetal powder \| /.test(was)) {
  t.set('conversions', 'CV08', 'Applies to', was.replace('Metal powder | ', ''), { expect: was });
  n++;
}

if (n) t.save();
console.log(`${MIGRATION}: ${n} change(s): the sintering filaments retired from the dataset, CN09 retired, CV08 without "Metal powder"`);
