#!/usr/bin/env node
// Migration m351 (2026-10-04): what purefil's sheets print under a font that maps ligatures to digits (the reader round,
// D125).
//
// purefil's (Fabru's) data sheets set "ti" and "ft" as ligature glyphs that the PDF's text layer maps to digits and
// symbols: "Prin5ng temperature", "Hea5ng bed temperature", "Drying 5me", "SoWening". The importer's reader never matched
// those labels, so their products had no print recipe, and the reader round's own readings of them were held because
// their quotes were not on the cached text. The text is now also read with the ligatures put back
// (scripts/lib/pdf-text.mjs repairLigatures, at read time only; the cached text and the evidence binding are unchanged),
// and the readings that view bears out are applied here from docs/audits/2026-10-04-reader-round/proposals/ligatures/:
// purefil's COC, TPV and TPS print settings among them. Three rows the view also proposed, Fillamentum OBC 905's "Printed
// conditions" (P1269), are the test bars' settings, not guidance (m170); Claude Opus moved them to moved-out/, and
// ingest:read-proposals now holds such rows itself. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m351-what-the-ligatures-hid.mjs [--dry-run]
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { applyProposals } from './read-proposals-apply.mjs';

const MIGRATION = 'm351';
const DIR = join(projectRoot, 'docs/audits/2026-10-04-reader-round/proposals/ligatures');
const READ = 'Read 2026-10-04 by Claude Sonnet readers from the page image (reader round, D125), checked against the cached text with its ligatures put back; applied by Claude Opus';
const t = openTables();
const counts = applyProposals(t, DIR, { migration: MIGRATION, read: READ });
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, ...counts, written: false }, null, 2)); process.exit(0); }
t.save();
console.log(JSON.stringify({ migration: MIGRATION, ...counts }, null, 2));
