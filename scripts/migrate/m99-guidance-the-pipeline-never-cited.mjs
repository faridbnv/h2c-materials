#!/usr/bin/env node
// Migration m99 (2026-09-21): the printing guidance thirty-six materials have and never showed.
//
// A material's printing guidance is the print profile it cites: the build quotes the first `printing` link in
// material_links.csv and nothing else, so a material that cites none shows "Not published" however many profiles
// its grades carry (compile.js; GUIDANCE-MISMATCH is the check that the quote matches). Every material written by
// hand cites one. Nothing wrote it for a material the import created — apply.mjs writes the grade, the source,
// the measurements and the profile, and never the link — so thirty-six materials with a profile apiece published
// no nozzle, bed or chamber guidance at all.
//
// The link written here is the one the hand-written materials use: the profile of the material's own
// representative grade, which is the grade its headlines and its identity already come from. A material whose
// representative grade has no profile is left alone; it has nothing to quote.
//
// The fix for the next batch is in apply.mjs, which now writes the link with the material.
//
//   node scripts/migrate/m99-guidance-the-pipeline-never-cited.mjs

import { openTables } from '../data/table-io.mjs';

const t = openTables();
const profiles = t.rows('profiles');
const links = t.rows('material_links');
let n = 0;
for (const material of t.rows('materials')) {
  if (links.some((l) => l.MaterialID === material.MaterialID && l.Link === 'printing')) continue;
  const profile = profiles.find((p) => p.GradeID === material['Representative grade']);
  if (!profile) continue;
  t.append('material_links', { MaterialID: material.MaterialID, Link: 'printing', RecordID: profile.ProfileID });
  console.log(`${material.MaterialID} ${material['Original name']} -> ${profile.ProfileID} (${material['Representative grade']})`);
  n++;
}
if (n) t.save();
console.log(`${n} material(s) now cite the profile their guidance quotes`);
