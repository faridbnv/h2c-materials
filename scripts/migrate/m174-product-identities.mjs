#!/usr/bin/env node
// Migration m174 (2026-09-26): product identities the lanes found wrong (phase 6, lane 2, finished; GOALS step 5, C2
// and C8; docs/OPEN-PROBLEMS.md §16 and §17).
//
// 1. Anycubic PLA+ was filed as Anycubic PLA. R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-V3-0 prints "Product Name: Anycubic
//    PLA+", and its eight values, its profile and its note sat on G001-116 (Anycubic PLA) beside the two PLA sheets'
//    own. PLA+ gets a grade of its own under PLA, and every record citing its sheet moves there with its ID kept (D86).
// 2. ELEGOO's PLA grade was named "S.I.", the unit column's heading. Its sheet (hosted by 3DJake, R-3DJAKE-3DJAKE-TDS-PLA)
//    prints no product name: page 1, rendered, is ELEGOO's logo over a table of typical values, and the footer names
//    the company (Shenzhen Zhinengpai Technology). No other cached document names the product; the retailer's page that
//    linked the sheet (3djake.com/elegoo/pla-sea-green) is not cached. The name is Not published, and the grade says why.
// 3. Four Prusa Research grades are Buddy3D's product cards. Each card prints the Buddy3D logo over "Product card" and
//    the material, and the PET-G and ABS ESD cards name "Buddy3D PET-G" and "Buddy3D ABS ESD" in their text; the PLA and
//    ABS cards carry the logo alone (read on the rendered page). Each product is named as its card names it. The
//    Manufacturer stays as the retailer lists it (3DJake files the cards under Prusa); the cards do not name a maker.
// 4. Five products sat on two grades each, one per revision of their sheet. In each pair the newer sheet continues the
//    older's version number and prints the same product's name and description: PolyLite PETG V3, V5.2 and V5.3 (G020-02)
//    and V6.0 (G020-13); PolySonic PLA V5.3 (G001-02) and V6.0 (G001-25); PolyLite ABS V5.6 (G027-10) and Polymaker ABS
//    v6.0 (G027-09), which renames it and prints the same description and the same numbers to the decimal; Raise3D
//    Premium PC V4.0 of 2018 (G035-22) and V6.0 of 2024 (G035-16), word for word the same description; PolyMax PLA v1
//    (G001-26) and V5.5 (G001-24). The older grade retires in favour of the newer, its records move there with their IDs,
//    and a source that named the older names the newer. Each product then counts once in its material's spread. Where the
//    kept grade's name carried the maker's name the import put before it ("Polymaker PolyLite PETG"), it takes the name
//    its sheets print ("PolyLite PETG").
//
// The reviewer is an agent (Claude Opus 5.5), reading both sheets of each pair on their cached pages; no person has
// reviewed them. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m174-product-identities.mjs

import { openTables, nextId } from '../data/table-io.mjs';
import { pageReader } from './printed-on.mjs';

const migration = 'm174-product-identities';
const date = '2026-09-26';
const NA = 'Not applicable';
const t = openTables();
const printed = pageReader(t, migration);
let changed = 0;
const tally = {};
const count = (k, n = 1) => { tally[k] = (tally[k] ?? 0) + n; changed += n; };
const note = (before, text) => (before.includes(text) ? before : `${before} ${text}`);

/** Every record citing `sourceId` (or all, without it) on grade `from` moves to grade `to`, IDs kept. */
function moveRecords(from, to, sourceId) {
  const a = t.get('grades', from), b = t.get('grades', to);
  if (a.MaterialID !== b.MaterialID) throw new Error(`${migration}: ${from} and ${to} are different materials`);
  let n = 0;
  for (const table of ['measurements', 'profiles', 'evidence', 'prices']) {
    const pk = t.schemas[table].primaryKey;
    for (const r of t.rows(table).filter((x) => x.GradeID === from && (!sourceId || x.SourceID === sourceId))) {
      t.set(table, r[pk], 'GradeID', to, { expect: from });
      n++;
    }
  }
  for (const s of t.rows('sources').filter((x) => (!sourceId || x.SourceID === sourceId) && String(x['Applicable grades'] ?? '').split(/;\s*/).includes(from))) {
    const list = s['Applicable grades'].split(/;\s*/).map((g) => (g === from ? to : g));
    t.set('sources', s.SourceID, 'Applicable grades', [...new Set(list)].join('; '), { expect: s['Applicable grades'] });
  }
  return n;
}

// ------------------------------------------------------------------------------------------ 1. Anycubic PLA+
{
  const sheet = 'R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-V3-0';
  if (!printed(sheet, 1, 'Product Name: Anycubic PLA+')) throw new Error(`${migration}: ${sheet} does not print "Anycubic PLA+"`);
  let plus = t.rows('grades').find((g) => g.Manufacturer === 'Anycubic' && g['Product name'] === 'PLA+');
  if (!plus) {
    const old = t.get('grades', 'G001-116');
    const id = nextId('grades', t.rows('grades').map((g) => g.GradeID), { materialId: old.MaterialID });
    plus = t.append('grades', {
      ...old, GradeID: id, 'Product name': 'PLA+', 'Shared formulation key': sheet, SourceID: sheet,
      'Selected-grade rationale': `${old['Selected-grade rationale']}. A grade of its own since ${date} (${migration}): its sheet ("Product Name: Anycubic PLA+") was filed on G001-116, Anycubic PLA.`,
    });
    count('grade added (Anycubic PLA+)');
  }
  const n = moveRecords('G001-116', plus.GradeID, sheet);
  if (n) count('records moved to Anycubic PLA+', n);
}

// ------------------------------------------------------------------------------------------ 2. ELEGOO's PLA
{
  const g = t.get('grades', 'G001-129');
  if (g['Product name'] === 'S.I.') {
    if (!printed('R-3DJAKE-3DJAKE-TDS-PLA', 1, 'S.I.')) throw new Error(`${migration}: the ELEGOO sheet does not print "S.I."`);
    t.set('grades', 'G001-129', 'Product name', 'Not published', { expect: 'S.I.' });
    t.set('grades', 'G001-129', 'Selected-grade rationale', note(g['Selected-grade rationale'], `Its sheet prints no product name, only ELEGOO's logo over a table of typical values; the name "S.I." was the unit column's heading, and no cached document names the product (${migration}, ${date}).`), { expect: g['Selected-grade rationale'] });
    count('product name (ELEGOO)');
  }
}

// ---------------------------------------------------------------------------------------------- 3. Buddy3D
for (const [gradeId, from, to, sheet, words] of [
  ['G020-46', 'PET-G', 'Buddy3D PET-G', 'S-PVB-technisches-datenblatt-3', 'Buddy3D PET-G'],
  ['G030-08', 'ABS-ESD VE', 'Buddy3D ABS-ESD VE', 'S-PVB-technisches-datenblatt-1', 'Buddy3D ABS ESD'],
  ['G001-108', 'PLA', 'Buddy3D PLA', 'S-PVB-technisches-datenblatt', 'Product card PLA'],
  ['G027-33', 'ABS', 'Buddy3D ABS', 'S-PVB-technisches-datenblatt-2', 'Product card ABS'],
]) {
  const g = t.get('grades', gradeId);
  if (g['Product name'] === to) continue;
  if (g.SourceID !== sheet || !printed(sheet, 1, words)) throw new Error(`${migration}: ${gradeId}'s card does not print "${words}"`);
  t.set('grades', gradeId, 'Product name', to, { expect: from });
  t.set('grades', gradeId, 'Selected-grade rationale', note(g['Selected-grade rationale'], `Named as its card names it since ${date} (${migration}): the card is Buddy3D's (its logo heads the page); the Manufacturer is as the retailer lists it, since the card names none.`), { expect: g['Selected-grade rationale'] });
  const s = t.get('sources', sheet);
  if (s.Title === 'Product card') t.set('sources', sheet, 'Title', `Buddy3D Product card ${from}`, { expect: 'Product card' });
  count('product name (Buddy3D)');
}

// ------------------------------------------------------------------------------------ 4. revisions of one sheet
const PAIRS = [
  ['G020-02', 'G020-13', 'PolyLite PETG: its V3, V5.2 and V5.3 sheets and the V6.0 sheet print the same product and description; V6.0 continues their numbering', ['Polymaker PolyLite PETG', 'PolyLite PETG', 'S-POLYCN-TDS-Polymaker-PolyLite-PETG-V6-0-2026-06-09-EN']],
  ['G001-02', 'G001-25', 'PolySonic PLA: the V5.3 sheet and the V6.0 sheet print the same product and description; V6.0 continues its numbering'],
  ['G027-10', 'G027-09', 'Polymaker ABS v6.0 renames PolyLite ABS V5.6: the same description and the same numbers to the decimal, the numbering continued'],
  ['G035-22', 'G035-16', 'Raise3D Premium PC: the V4.0 sheet of 2018 and the V6.0 sheet of 2024 print the same product and description'],
  ['G001-26', 'G001-24', 'PolyMax PLA: the v1 sheet and the V5.5 sheet print the same product', ['Polymaker PolyMax PLA', 'PolyMax PLA', 'S-POLYCN-PolyMax-PLA-TDS-v1']],
];
for (const [old, keep, why, rename] of PAIRS) {
  // The grade that keeps the product carries the name its sheets print, without the maker's name the import put before it.
  if (rename) {
    const [from, to, sheet] = rename;
    if (t.get('grades', keep)['Product name'] === from) {
      if (!printed(sheet, 1, to)) throw new Error(`${migration}: ${sheet} does not print "${to}"`);
      t.set('grades', keep, 'Product name', to, { expect: from });
      count('product name (the kept revision)');
    }
  }
  const g = t.get('grades', old);
  const moved = moveRecords(old, keep);
  if (moved) count('records moved to the newer revision\'s grade', moved);
  if (g.Status !== 'retired') {
    t.set('grades', old, 'Status', 'retired', { expect: 'active' });
    t.set('grades', old, 'Selected-grade rationale', `Retired ${date} (${migration}) in favour of ${keep}, the same product's newer sheet, and its records moved there: ${why}.`, { expect: g['Selected-grade rationale'] });
    count('grade retired');
  }
}

if (changed) t.save();
for (const [k, v] of Object.entries(tally)) console.log(`  ${v}\t${k}`);
console.log(`${migration}: ${changed} change(s)`);
