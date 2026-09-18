#!/usr/bin/env node
// Migration m46: sources.csv described how a source was classed and how it was reached in free prose. Source class
// held 21 wordings for about nine real classes — "Manufacturer TDS", "Manufacturer TDS (web)", "Manufacturer TDS
// indexed at authorized distributor" and "Manufacturer TDS hosted by current brand owner" are one class and three
// facts about one document — and Access status held 17 wordings for four real states, with no vocabulary at all, so
// nothing could be counted or filtered and a twelfth spelling of "Retrieved" would have passed the gate.
//
// The class and the state become vocabularies the build can read; the qualifier each wording carried moves, word for
// word, to a note beside it. Nothing is paraphrased: Access note is the original sentence wherever it said more than
// the state, and Not applicable where it said only "Retrieved" or "Read only".
//
// npm run build:diff: sources[].accessStatus removed, sourceNote/accessState/accessNote added on all 300, and
// sourceClass edited on the 44 whose wording carried a qualifier.
import { fileURLToPath } from 'node:url';
import { openTables, projectRoot } from '../data/table-io.mjs';

const NA = 'Not applicable';

// Each of the 21 wordings, as the class it names and the fact it carried. A wording not listed stops the migration.
export const CLASS_MAP = {
  'Manufacturer TDS': ['Manufacturer TDS', null],
  'Manufacturer TDS (web)': ['Manufacturer TDS', 'The publisher serves it as a web page, not a document.'],
  'Manufacturer TDS indexed at authorized distributor': ['Manufacturer TDS', 'Indexed at an authorized distributor.'],
  'Manufacturer TDS hosted by current brand owner': ['Manufacturer TDS', 'Hosted by the current brand owner.'],
  'Manufacturer product / guide': ['Manufacturer product page or guide', null],
  'Official manufacturer product page': ['Manufacturer product page or guide', "The manufacturer's official product page."],
  'Manufacturer comparison guide': ['Manufacturer product page or guide', "Compares the publisher's own products."],
  'Manufacturer description at distributor': ['Manufacturer product page or guide', "The manufacturer's description, carried by a distributor."],
  'Official current manufacturer portfolio': ['Manufacturer product page or guide', "The manufacturer's current portfolio listing."],
  'Official corporate announcement': ['Manufacturer product page or guide', 'A corporate announcement.'],
  'Manufacturer SDS': ['Manufacturer SDS', null],
  'Resin supplier data sheet': ['Resin supplier data sheet', null],
  'Canadian retailer catalogue; pricing only': ['Retailer catalogue', 'Canadian storefront; pricing only.'],
  'Official Canadian storefront catalogue': ['Retailer catalogue', 'Official Canadian storefront catalogue.'],
  'Official printer documentation': ['Printer documentation', null],
  'Peer-reviewed original research': ['Peer-reviewed study', 'Original research.'],
  'Peer-reviewed study (publisher copy)': ['Peer-reviewed study', "The publisher's copy."],
  'Official occupational-safety guidance': ['Safety guidance', 'Official occupational-safety guidance.'],
  'Secondary local reference': ['Reference or register', 'A local reference, kept as provenance.'],
  'Reference datasheet (corroboration only)': ['Reference or register', 'A reference datasheet, kept to corroborate.'],
  'Scope register': ['Reference or register', 'The scope register.'],
};

/**
 * The state a wording names. "the copy the owner supplied" is not "owner-supplied": those four sources say the
 * served revision differs from the owner's copy, so what was read is the served file, and they stay retrieved.
 */
export function accessState(text) {
  const s = String(text ?? '').trim();
  if (/^Not retrieved/.test(s)) return 'not-retrieved';
  if (s === 'Read only') return 'read-only';
  if (/owner-supplied|user-supplied/.test(s)) return 'retrieved-copy';
  if (/^Retrieved/.test(s)) return 'retrieved';
  return null;
}

export function migrate(t) {
  if (t.header('sources').includes('Access state')) return;
  const rows = t.rows('sources');
  const fail = (msg) => { throw new Error(`m46: ${msg}; nothing changed`); };

  const unknownClass = [...new Set(rows.map((r) => r['Source class']))].filter((v) => !CLASS_MAP[v]);
  if (unknownClass.length) fail(`Source class wordings this migration does not know: ${unknownClass.map((v) => JSON.stringify(v)).join(', ')}`);
  const unknownAccess = [...new Set(rows.map((r) => r['Access status']))].filter((v) => !accessState(v));
  if (unknownAccess.length) fail(`Access status wordings no state matches: ${unknownAccess.map((v) => JSON.stringify(v)).join(', ')}`);

  t.addColumn('sources', 'Source note', { after: 'Source class', fill: (r) => CLASS_MAP[r['Source class']][1] ?? NA });
  t.addColumn('sources', 'Access state', { after: 'Applicable grades', fill: (r) => accessState(r['Access status']) });
  // The note keeps the sentence as it was written, so the migration loses no word of it.
  t.addColumn('sources', 'Access note', { after: 'Access state', fill: (r) => (['Retrieved', 'Read only'].includes(r['Access status']) ? NA : r['Access status']) });
  for (const r of rows) t.set('sources', r.SourceID, 'Source class', CLASS_MAP[r['Source class']][0]);
  t.dropColumn('sources', 'Access status');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables(projectRoot);
  migrate(t);
  const log = t.save();
  console.log(`${log.length} change(s)`);
}
