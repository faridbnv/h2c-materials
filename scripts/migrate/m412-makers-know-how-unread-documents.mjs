#!/usr/bin/env node
// Migration m412 (2026-10-07): the makers' statements in the documents nobody had read for them (completeness round,
// item 4; D136), as m140 recorded the first 4,502.
//
// 41 products held no statement because none of their documents had been read (state no-document-read), most of them
// entered by batches after lane 3 read; and 206 products already collected held a document, cached and unread, that might
// state their chamber or drying. Twelve Claude Sonnet readers read those 208 documents in full and copied every sentence
// in which the maker says what the product is for, does well or badly, how it warps, prints, takes up moisture, wears a
// nozzle, smells or comes off its supports, verbatim with its page and topic (knowhow/PROMPT.md). Claude Opus reviewed
// them by m140's rules (knowhow/curate.mjs, curation.csv): a statement is on its page as written (the quote check below),
// once per product, never a template sentence of the maker's whole range, and one a product already holds is not taken
// twice. Every document read is recorded as read (know_how_reads, Scope "document"), so a product whose documents say
// nothing is "sheet silent", not "never read". Six products whose own documents meet the claim rule
// (schema/vocab/product-claims.csv) are marked, each judged against the rule and agreed by a blind second reader
// (knowhow/claims-second.csv); YOUSU PC's "Unique recipe – Make the filament less brittle", on which the second reader
// found no comparison, is not. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m412-makers-know-how-unread-documents.mjs [--dry-run]
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { rowsOf } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm412';
const DATE = '2026-10-07';
const DIR = join(projectRoot, 'docs/audits/2026-10-07-completeness-round/knowhow/applied');
const READ_BY = 'Claude Sonnet readers, judged by Claude Opus 5.5 (completeness round, m412)';
const CLAIM = 'Toughened or impact-modified';
// The product, the start of its statement that meets the rule, and why.
const CLAIMS = [
  ['G081-08', 'It also has a higher impact resistance than regular HIPS filaments.', 'more impact resistance than the regular form of its polymer: "a higher impact resistance than regular HIPS filaments".'],
  ['G169-02', 'HI-TEMP CF is stronger and more durable than PLA and can better withstand impacts without breaking.', 'more impact resistance than the standard form of its base polymer: "stronger and more durable than PLA and can better withstand impacts without breaking" (as m408 judged BigRep PLX).'],
  ['G066-05', 'While conventional rigid materials may crack or break under excessive deformation or sudden impact, PET FLEX MAX is designed to bend and absorb the applied energy.', 'designed for impact: "PET FLEX MAX is designed to bend and absorb the applied energy" where "conventional rigid materials may crack or break under ... sudden impact".'],
  ['G018-19', 'Tougher and less brittle than conventional PLA', 'tougher than the conventional form of its polymer: "Tougher and less brittle than conventional PLA".'],
  ['G113-03', 'The addition of aramid fibers increases the mechanical strength of prints, improves their durability, and reduces the risk of parts crumbling or cracking under load.', 'names what toughens it: "The addition of aramid fibers ... reduces the risk of parts crumbling or cracking under load", and "even greater resistance to wear and mechanical damage" than classic ASA.'],
  ['G155-01', 'extremely high impact resistance as compared to classic materials based on PLA', 'more impact resistance than the classic form of its polymer: "extremely high impact resistance as compared to classic materials based on PLA".'],
];
const t = openTables();
let statements = 0, reads = 0, claims = 0;

const held = new Set(t.rows('evidence').map((e) => `${e.GradeID}\u0000${e.SourceID}\u0000${e.Finding}`));
for (const s of rowsOf(join(DIR, 'statements.csv'))) {
  if (held.has(`${s.GradeID}\u0000${s.SourceID}\u0000${s.Finding}`)) continue;
  const view = onCachedSheet(t, s.SourceID, s.Finding, MIGRATION);
  const id = t.nextId('evidence');
  t.append('evidence', {
    EvidenceID: id, MaterialID: t.get('grades', s.GradeID).MaterialID, GradeID: s.GradeID, Domain: "Makers' know-how", Topic: s.Topic, Finding: s.Finding,
    'Exposure / conditions': `Read ${DATE} in the maker's document by the completeness round and checked on the cached page${typeof view === 'string' && view && view !== 'line' ? ` (${view} view)` : ''} (${MIGRATION}).`,
    'Rating 1–5': 'Not published', RubricID: 'Not applicable', 'Evidence type': 'Manufacturer statement', SourceID: s.SourceID, Locator: `p. ${s.Page || 1}`,
  });
  held.add(`${s.GradeID}\u0000${s.SourceID}\u0000${s.Finding}`);
  statements++;
}

const readKeys = new Set(t.rows('know_how_reads').map((r) => `${r.SourceID}\u0000${r.Scope}`));
for (const { SourceID } of rowsOf(join(DIR, 'reads.csv'))) {
  if (readKeys.has(`${SourceID}\u0000document`)) continue;
  t.append('know_how_reads', { SourceID, Scope: 'document', 'Read on': DATE, 'Read by': READ_BY });
  reads++;
}

for (const [grade, start, reason] of CLAIMS) {
  const statement = t.rows('evidence').find((e) => e.GradeID === grade && e['Evidence type'] === 'Manufacturer statement' && e.Domain === "Makers' know-how" && e.Finding.startsWith(start));
  if (!statement) throw new Error(`${MIGRATION}: ${grade} holds no statement starting "${start}"`);
  const has = t.rows('product_claims').find((c) => c.GradeID === grade && c.Claim === CLAIM);
  if (has) { if (has.EvidenceID !== statement.EvidenceID) throw new Error(`${MIGRATION}: ${grade}'s claim points at ${has.EvidenceID}; the data moved`); continue; }
  t.append('product_claims', { GradeID: grade, Claim: CLAIM, EvidenceID: statement.EvidenceID, Reason: reason, 'Reviewed by': `Claude Opus 5.5, ${DATE}, on the statement's words, checked by a blind second reader (${MIGRATION})` });
  claims++;
}
if (process.argv.includes('--dry-run')) { console.log(`${MIGRATION}: ${statements} statement(s), ${reads} read(s), ${claims} claim(s) (dry run)`); process.exit(0); }
if (statements || reads || claims) t.save();
console.log(`${MIGRATION}: ${statements} statement(s), ${reads} document read(s), ${claims} claim(s)`);
