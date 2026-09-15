#!/usr/bin/env node
// Migration m05: no identifier lists inside Materials cells.
//
// Before: Materials held six ;-separated ID lists (Printing, H2C, Use, Environmental, Durability and
// Safety evidence) and quoted its nozzle, bed and chamber guidance from the first cited profile.
//
// After:
//  - data/tables/material_links.csv holds the editorial citations, one row each: MaterialID, Link
//    (printing | h2c-status | use | durability | safety), RecordID, in the order they were cited.
//  - Environmental evidence is derived: exactly the material's own exposure, solubility and moisture
//    records, which the build already required it to be.
//  - Nozzle, bed and chamber guidance are derived: the first cited profile's text, or Not published.
// The migration proves both derivations against every cell before removing the columns.

import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { classifyTopic } from '../../build/src/normalize/chemical.js';
import { DATA_STATUS } from '../../build/src/normalize/values.js';
import { ENVIRONMENT_CATEGORIES } from '../../build/src/coverage-rules.js';

const ids = (cell) => (cell == null ? [] : String(cell).split(/[;,]/).map((s) => s.trim()).filter((s) => s && !/^(not published|not applicable)$/i.test(s)));
const LINKS = [['Printing evidence', 'printing'], ['H2C evidence', 'h2c-status'], ['Use evidence', 'use'], ['Durability evidence', 'durability'], ['Safety evidence', 'safety']];
const GUIDANCE = [['Nozzle guidance', 'Nozzle °C'], ['Bed guidance', 'Bed °C'], ['Chamber guidance', 'Chamber °C']];

export function migrate(t) {
  if (!t.header('materials').includes('Printing evidence')) return; // already applied
  const profiles = new Map(t.rows('profiles').map((p) => [p.ProfileID, p]));
  const rows = [];

  for (const mat of t.rows('materials')) {
    for (const [column, link] of LINKS) for (const id of ids(mat[column])) rows.push({ MaterialID: mat.MaterialID, Link: link, RecordID: id });

    const first = ids(mat['Printing evidence']).map((id) => profiles.get(id)).find(Boolean);
    for (const [column, profileColumn] of GUIDANCE) {
      const derived = first ? first[profileColumn] : 'Not published';
      if (derived !== mat[column]) throw new Error(`${mat.MaterialID} ${column} "${mat[column]}" is not its first cited profile's "${derived}"`);
    }

    const own = t.rows('evidence').filter((e) => e.MaterialID === mat.MaterialID && !DATA_STATUS[e['Evidence type']]?.retiredDuplicate
      && ENVIRONMENT_CATEGORIES.has(classifyTopic(e.Topic).category)).map((e) => e.EvidenceID);
    if ([...own].sort().join() !== ids(mat['Environmental evidence']).sort().join()) throw new Error(`${mat.MaterialID}: Environmental evidence is not its own environmental records`);
  }

  t.createTable('material_links', ['MaterialID', 'Link', 'RecordID'], rows);
  for (const [column] of [...LINKS, ...GUIDANCE, ['Environmental evidence']]) t.dropColumn('materials', column);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables(undefined, { allowMissing: true });
  migrate(t);
  console.log(`${t.save().length} change(s)`);
}
