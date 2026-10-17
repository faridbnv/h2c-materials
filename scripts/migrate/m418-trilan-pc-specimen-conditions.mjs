#!/usr/bin/env node
// Migration m418 (2026-10-16): the Triton Trilan PC sheet says its bars were printed, once, for every value (D116, D140).
//
// The blind re-read of the flexural round (D140) read Trilan PC's flexural modulus (V010692) as its page prints it, and
// read under the table a block the rows had not taken: "Specimen Conditions / Printer: Fortus® 400mc / Layer Height:
// 0.33mm / Infill Density: Solid / Specimen Orientation: XY Flat" (X-Ecomax-Trilan-PC-TDS-v1, p. 1, SHA-256 in
// sources.csv). Its rows say "Not published (do not assume printed)". A page that states its specimens once is a row of
// page_context.csv, which every row of the page that states no specimen of its own inherits in compile. The orientation
// is on the rows already.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m418-trilan-pc-specimen-conditions.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm418';
const ROW = {
  SourceID: 'X-ECOMAX-Trilan-PC-TDS-v1', Page: '1', 'Applies to': 'all', Table: 'Not applicable', Statement: 'Specimen Conditions',
  'Specimen type': 'Printed specimen', 'Moisture state': 'not-stated', 'Post-processing state': 'not-stated', 'Anneal °C': 'Not applicable',
  'Anneal h': 'Not applicable', Standard: 'Not published', 'Test temperature °C': 'Not published', Direction: 'Not published',
  Locator: 'p. 1: Specimen Conditions (Printer: Fortus® 400mc; Infill Density: Solid; Specimen Orientation: XY Flat)',
  'Reviewed by': 'Read 2026-10-16 by a Claude Sonnet reader from the page image, blind, in the flexural comparison round (D140), checked against the cached text layer; reviewed and applied by Claude Opus (m418)',
};

const t = openTables();
const held = t.rows('page_context').find((r) => r.SourceID === ROW.SourceID && r.Page === ROW.Page && r['Applies to'] === ROW['Applies to'] && r.Table === ROW.Table);
let changed = 0;
if (!held) { t.append('page_context', { PageContextID: t.nextId('page_context'), ...ROW }); changed++; }
else if (Object.entries(ROW).some(([k, v]) => held[k] !== v)) throw new Error(`${MIGRATION}: page_context ${held.PageContextID} is not what this migration wrote; the data moved`);
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} change(s): Trilan PC's specimen conditions, stated once on its page`);
