#!/usr/bin/env node
// Migration m435 (2026-10-17): two things the material pages' blind read found the records saying wrongly of
// themselves (D142 round, step 5). Read by Claude Opus against the decisions and the records.
//
// 1. The tensile and flexural comparisons' captions (method.csv, Section Comparison) said "bars labelled XZ or ZX are
//    listed below, not drawn", while D92 (m191) and D123 draw a bar so labelled as Z where its sheet says or shows it
//    stood upright (Stratasys's "Upright (ZX)", Essentium's drawing, AzureFilm's standing bars) or where its maker's
//    template uses the label for its upright bar (Eryone's "X-Z", the owner's ruling of 2026-10-02). Four blind readers
//    of 40 pages took the caption at its word and reported Eryone's, Essentium's, Stratasys's and AzureFilm's Z values
//    as breaking it, on 14 pages. The caption now says the rule as it is applied.
// 2. Twenty-two evidence rows from the first rounds (Q00254 to Q00362) are the project's own words, typed "Manufacturer
//    statement": a researcher's printability rubric ("Researcher classification from published processing cautions:
//    4/5"), paraphrases ("Automotive components ... are manufacturer-proposed applications. No design allowable is
//    supplied."; "Manufacturer describes lower water uptake than PA6") and a note on the H2C ("This entry remains
//    excluded from H2C printing"). The material pages quoted them as statements of "the material in general, maker's
//    product page or guide". Their Evidence type becomes "Selection interpretation", the vocabulary's word for the
//    project's reading of a source; the pages keep them to the records page. No decision reads the type of these
//    domains (product-claims.js reads only the makers' know-how).
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m435-the-z-rule-as-applied-and-the-projects-own-words-as-its-own.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm435';
const t = openTables();
let n = 0;

const OLD = 'bars labelled XZ or ZX are listed below, not drawn.';
const NEW = 'a bar labelled XZ or ZX is drawn as Z only where its sheet says or shows it stood upright, or where its maker uses that label for its upright bar (Eryone\'s "X-Z"); any other is listed below, not drawn.';
for (const topic of ['Tensile tests, XY and Z', 'Flexural tests, XY and Z']) {
  const row = t.get('method', topic);
  const text = row['Definition / rule'];
  if (text.includes(NEW)) continue;
  if (!text.includes(OLD)) throw new Error(`${MIGRATION}: method "${topic}" no longer says "${OLD}"`);
  t.set('method', topic, 'Definition / rule', text.replace(OLD, NEW), { expect: text, migration: MIGRATION });
  n++;
}

// The project's own words: found by their own text, so a row added since is not swept in unread.
const OWN = /^(Researcher classification from published processing cautions|Industrial heat-resistant technical parts; printer and end-use qualification required|Manufacturer describes|.*are manufacturer-proposed applications\. No design allowable is supplied)/;
const rows = t.rows('evidence').filter((r) => OWN.test(r.Finding) && r['Evidence type'] === 'Manufacturer statement' && /^Q00[23]\d\d$/.test(r.EvidenceID));
if (rows.length !== 22 && rows.length !== 0) throw new Error(`${MIGRATION}: ${rows.length} rows match, 22 were read`);
for (const r of rows) {
  t.set('evidence', r.EvidenceID, 'Evidence type', 'Selection interpretation', { expect: 'Manufacturer statement', migration: MIGRATION });
  n++;
}

if (n) t.save();
console.log(`${MIGRATION}: ${n} record(s): the Z rule as applied, the project's own words typed as its own`);
