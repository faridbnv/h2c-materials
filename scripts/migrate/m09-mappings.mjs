#!/usr/bin/env node
// Migration m09: the hand-maintained mappings move from name-keyed JSON under build/mappings/ to tables
// and vocabularies the schema gate checks.
//
//  - family-entries.json   -> data/tables/family_entries.csv (MaterialID, Kind, Why)
//                             data/tables/family_members.csv (FamilyMaterialID, MemberMaterialID), in order
//  - chamber-estimates.json -> data/tables/chamber_bands.csv (MaterialID, Kind band | no-band, Low °C,
//                             High °C, Basis, Caution, Source), one row per material, in band order
//  - environment-topics.json -> schema/vocab/environment-categories.csv and environment-topics.csv, which
//                             evidence.Topic now references
//
// A mapping keyed by a material's name broke when the name changed, and only the build noticed. Keyed by
// MaterialID and declared in a schema, a wrong reference is reported at the gate with its file and line.
// Reads the JSON files as they were before this migration removed them (git show at the given commit).

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { writeCsv } from '../../build/src/csv.js';

const BEFORE = '999474c'; // the last commit with build/mappings/*.json in place
const json = (file) => JSON.parse(execFileSync('git', ['show', `${BEFORE}:build/mappings/${file}`], { cwd: projectRoot, encoding: 'utf8' }));
const NA = 'Not applicable';

export function migrate(t, root = projectRoot) {
  if (t.tables().includes('family_entries')) return; // already applied
  const byName = new Map(t.rows('materials').map((m) => [m['Original name'], m.MaterialID]));
  const id = (name) => { const v = byName.get(name); if (!v) throw new Error(`No material named "${name}"`); return v; };

  const families = json('family-entries.json').families;
  t.createTable('family_entries', ['MaterialID', 'Kind', 'Why'], Object.entries(families).map(([name, f]) => ({ MaterialID: id(name), Kind: f.kind, Why: f.why })));
  t.createTable('family_members', ['FamilyMaterialID', 'MemberMaterialID'], Object.entries(families).flatMap(([name, f]) => f.members.map((member) => ({ FamilyMaterialID: id(name), MemberMaterialID: id(member) }))));

  const chamber = json('chamber-estimates.json');
  t.createTable('chamber_bands', ['MaterialID', 'Kind', 'Low °C', 'High °C', 'Basis', 'Caution', 'Source'], [
    ...chamber.bands.flatMap((b) => b.materials.map((name) => ({
      MaterialID: id(name), Kind: 'band', 'Low °C': b.lo, 'High °C': b.hi, Basis: b.basis, Caution: b.caution ?? NA, Source: chamber.source,
    }))),
    ...Object.entries(chamber.noBand ?? {}).map(([name, why]) => ({
      MaterialID: id(name), Kind: 'no-band', 'Low °C': NA, 'High °C': NA, Basis: why, Caution: NA, Source: chamber.source,
    })),
  ]);

  const env = json('environment-topics.json');
  writeCsv(join(root, 'schema/vocab/environment-categories.csv'), ['Value', 'Meaning', 'Noun', 'Filterable'],
    Object.entries(env.categories).map(([key, c]) => ({ Value: key, Meaning: c.label, Noun: c.noun ?? NA, Filterable: c.filterable ? 'TRUE' : 'FALSE' })));
  writeCsv(join(root, 'schema/vocab/environment-topics.csv'), ['Value', 'Meaning', 'Category', 'Strength', 'Agent'],
    Object.entries(env.topics).map(([topic, e]) => ({ Value: topic, Meaning: null, Category: e.category, Strength: e.strength ?? NA, Agent: e.agent ?? NA })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables(undefined, { allowMissing: true });
  migrate(t);
  console.log(`${t.save().length} change(s)`);
}
