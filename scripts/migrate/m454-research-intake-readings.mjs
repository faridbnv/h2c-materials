#!/usr/bin/env node
// Migration m454 (2026-10-19): what the research package's pages print, read into the records (the research intake,
// stage 4; docs/audits/2026-10-19-research-intake/).
//
// The research agent of 2026-10-19 read the pages of the sheets the catalogue holds and of the documents batch b48
// registered (m453), in the reading schema; the intake's completion agent (Claude Sonnet) read the four new products'
// documents. Claude Opus 5.5 triaged the readings (ingest/intake.mjs: a later copy's reading kept only where the
// registered sheet prints the same line, fibre loads typed as Fibre content (D150), drying need by the vocabulary, the
// package's invalid values set aside). `npm run ingest:read-reconcile` checked every reading against the page's text in
// every view; Claude Sonnet readers read blind a second time every value or setting that decides, or that only the page
// image bore out (second/out/), and every second reading agreed. `npm run ingest:read-proposals` mapped what the pages
// bore out (proposals/r1/), and the executor's review (ingest/review-r1.mjs) corrected what it mapped wrongly, recorded
// what it held for want of a unit spelling or a label, and typed by hand the settings the triage set aside
// (proposals/r1-reviewed/, summary.md lists every decision). This migration applies that folder:
// - drying from makers' guides: Spectrum's (20 products, "In justified cases" read as optional, D168), Fillamentum's
//   scale, colorFabb's print-support page, 3DXTECH, Extrudr, SUNLU, AzureFilm, MatterHackers, Prusa and others;
// - 34 fibre loads from makers' safety data sheets (D150), a band's upper end as its bound;
// - the four new products' values and print recipes, Braskem FL300PE's "Heated chamber not required", Raise3D PVA+'s
//   chamber ceiling of 50 °C, and QIDI PA612-CF's heat deflection at 0.45 MPa and annealed at both loads;
// - five cells of held profiles: 3DJake's and Raise3D's tolerance windows, Raise3D's bed bound, Siraya Tech's brass nozzle.
// The sources read for more products than they were registered for name them all (Applicable grades), and Nylon-GF's
// order below the unfilled maker-undisclosed home is accepted with its reason. And, by hand here, Braskem FL900PP-CF's alternate bed (20-40 °C on adhesive spray), a row of its sheet: a profile of its
// own (D120), since applyProposals adds no second profile from one sheet; the held profile's Locator stops naming it.
//
// applyProposals checks every quote on the cached, hash-checked sheet (with its OCR sidecar as a second view), every raw ×
// factor, and the parsers' reading of every profile. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m454-research-intake-readings.mjs [--dry-run]
import { join } from 'node:path';
import { openTables, projectRoot, nextId } from '../data/table-io.mjs';
import { applyProposals, onCachedSheet } from '../lib/read-proposals-apply.mjs';
import { typedOf } from '../lib/profile-settings.mjs';
import { settleFindings } from '../lib/source-edits.mjs';

const MIGRATION = 'm454';
const DIR = join(projectRoot, 'docs/audits/2026-10-19-research-intake/proposals/r1-reviewed');
const READ = 'Read 2026-10-19 by the research agent of 2026-10-19 (Codex) and the intake\'s Claude Sonnet readers, every deciding or image-only reading read blind a second time and agreed, every quote checked on the cached sheet; reviewed and applied by Claude Opus (the research intake, stage 4)';
const t = openTables();

const counts = applyProposals(t, DIR, { migration: MIGRATION, read: READ, date: '2026-10-19' });

// Braskem FL900PP-CF's alternate bed: the sheet's second bed row, a profile of its own (D120).
const BRASKEM = 'R-BRASKEM-Braskem-3D-Printing-Data-Sheet-FL900PP-CF';
const ALTERNATE = 'p. 1: Recommended printing settings: Nozzle Size (Material); p. 1: Alternate Bed Temperature / Substrate';
let alternate = 0;
if (!t.rows('profiles').some((p) => p.SourceID === BRASKEM && p.Locator === ALTERNATE)) {
  onCachedSheet(t, BRASKEM, 'Alternate Bed Temperature / Substrate ℃ / Type 20-40 / Multi-purpose adhesive spray', MIGRATION);
  const held = t.get('profiles', 'P0560');
  const before = 'p. 1: Recommended printing settings: Nozzle Size (Material); p. 1: Recommended Bed Temperature / Substrate; p. 1: Alternate Bed Temperature / Substrate';
  t.set('profiles', 'P0560', 'Locator', 'p. 1: Recommended printing settings: Nozzle Size (Material); p. 1: Recommended Bed Temperature / Substrate', { expect: before, migration: MIGRATION });
  const row = { ...held, ProfileID: nextId('profiles', t.rows('profiles').map((p) => p.ProfileID)), 'Bed °C': '20-40', Plate: 'Multi-purpose adhesive spray', Locator: ALTERNATE };
  t.append('profiles', { ...row, ...typedOf(row) });
  alternate = 1;
}

// A source names every product its records speak for (AUDIT-SOURCE-SCOPE): the guides and pages read here speak for more
// products than they were registered for.
let scoped = 0;
const GRADE = /G\d{3}-(?:\d+|R\d+)/g;
const speaksFor = new Map();
for (const table of ['measurements', 'profiles', 'evidence']) for (const r of t.rows(table)) {
  if (!/^G\d{3}-/.test(r.GradeID ?? '')) continue;
  (speaksFor.get(r.SourceID) ?? speaksFor.set(r.SourceID, new Set()).get(r.SourceID)).add(r.GradeID);
}
for (const s of t.rows('sources')) {
  const listed = s['Applicable grades'] ?? '';
  if (!/G\d{3}-/.test(listed)) continue;
  const missing = [...(speaksFor.get(s.SourceID) ?? [])].filter((g) => !(listed.match(GRADE) ?? []).includes(g)).sort();
  if (!missing.length) continue;
  t.set('sources', s.SourceID, 'Applicable grades', `${listed}; ${missing.join('; ')}`, { expect: listed, migration: MIGRATION });
  scoped++;
}

// Nylon-GF's products, one of them new here, against the unfilled maker-undisclosed home.
const accepted = settleFindings(t, { date: '2026-10-19', accept: [{ Code: 'EST-FAMILY-ORDER', Table: 'materials', Record: 'M166 tensileModulusXY', Field: '', Reason: 'Nylon-GF, maker-undisclosed polyamide (M166) holds Markforged Onyx GF (3.1 GPa, XY) and since m454 Eumakers PA Nylon Glass Fiber (2.534 GPa on a printed XY bar; its maker\'s melting point of 178-190 °C says a long-chain polyamide), whose median is 2.817; the unfilled maker-undisclosed home (M164) holds other polyamides at 3 GPa. Two homes of undisclosed polyamides are not one resin with and without glass, so the order says nothing a sheet would settle.' }] });

if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, ...counts, alternate, scoped, accepted, written: false }, null, 2)); process.exit(0); }
t.save();
console.log(JSON.stringify({ migration: MIGRATION, ...counts, alternate, scoped, accepted }, null, 2));
