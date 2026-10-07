#!/usr/bin/env node
// Migration m401 (2026-10-07): the mechanical tables six registered sheets print and the tables held only in part
// (quality round 2026-10-07, read9; D134).
//
// Reading the impact columns again (m399) showed Stratasys's ULTEM 1010 sheet held five of its values, and its PC, PC-ABS
// and ABS-M30 sheets and QIDI's PETG Rapido and PETG-GF sheets held one table of several (QIDI's tensile table not at all).
// A Claude Sonnet reader read every cell of those tables from the page images (docs/audits/2026-10-07-quality-round/read9/
// PROMPT.md); `ingest:read-reconcile` checked each against the text layer and the held rows, now telling a notched from an
// unnotched cell of one orientation, a second, blind reader read again every value that decides and every mismatch, and
// `ingest:read-proposals` mapped what passed. Claude Opus reviewed every ready row (read9/curate.py, curation.csv): QIDI's
// impact columns, headed by drawings, and PC-ABS's UV-exposure table stay held. ULTEM 1010's first table prints its
// flexural modulus as "MPa 2.91 (0.049)", a value of gigapascal size under a megapascal label (its second table prints
// 3.26 GPa): the number is kept as printed and flagged, so it backs nothing (AGENTS: flag a value physics rules out).
// Reading a registered, hash-checked sheet again is not an import (D123).
//
// applyProposals checks every quote on the cached sheet before it writes. A re-run is a no-op, and a run after the data
// moved stops.
//
//   node scripts/migrate/m401-mechanical-tables-held-in-part.mjs [--dry-run]
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { applyProposals } from './read-proposals-apply.mjs';

const MIGRATION = 'm401';
const DIR = join(projectRoot, 'docs/audits/2026-10-07-quality-round/read9/applied');
const READ = 'Read 2026-10-07 by a Claude Sonnet reader from the page image (quality round, read9), checked against the cached text layer, and where it decides, read again blind; reviewed and applied by Claude Opus';
const t = openTables();

const counts = applyProposals(t, DIR, { migration: MIGRATION, read: READ, date: '2026-10-07' });

// The megapascal label beside a gigapascal number: kept as printed, flagged.
const ULTEM = 'R-STRATASYS-mds-fdm-ultem-1010-resin-0626a';
const FLAG = 'Published value (physically implausible)';
let flagged = 0;
for (const m of t.rows('measurements').filter((r) => r.SourceID === ULTEM && r.Property === 'Flexural modulus' && r['Raw unit'] === 'MPa' && /^p\. 7:/.test(r.Locator))) {
  if (m['Data status'] === FLAG) continue;
  t.set('measurements', m.MeasurementID, 'Data status', FLAG, { expect: 'Published value', migration: MIGRATION });
  t.set('measurements', m.MeasurementID, 'Notes', `${m.Notes} Flagged ${'2026-10-07'} (${MIGRATION}): the page prints "MPa" beside ${m['Raw numeric']}, a flexural modulus of gigapascal size (the sheet's F3300 table on p. 8 prints 3.26 and 2.33 GPa); 0.003 GPa is not a modulus ULTEM 1010 can have, so the value backs nothing.`, { expect: m.Notes, migration: MIGRATION });
  flagged++;
}
// Stratasys's F900 PC White table prints a tensile yield of 93.9 (2.15) MPa and 13,600 (310) psi, which agree with each
// other; its three other PC tables print 62 to 65 MPa in the same orientation, and a moulded polycarbonate bar yields near
// 60 to 65 MPa. A printed bar cannot yield half as high again as its moulded resin: kept as printed, flagged.
const PC = 'R-STRATASYS-mds-fdm-pc-0426a';
for (const m of t.rows('measurements').filter((r) => r.SourceID === PC && r.Property === 'Tensile yield strength' && r['Raw numeric'] === '93.9' && r.Direction === 'XZ')) {
  if (m['Data status'] === FLAG) continue;
  t.set('measurements', m.MeasurementID, 'Data status', FLAG, { expect: 'Published value', migration: MIGRATION });
  t.set('measurements', m.MeasurementID, 'Notes', `${m.Notes} Flagged 2026-10-07 (${MIGRATION}): the page prints 93.9 (2.15) MPa and 13,600 (310) psi, which agree, but the sheet's Fortus 450mc and F900 Red tables print 62.3 to 64.6 MPa XZ and moulded polycarbonate yields near 60 to 65 MPa; a printed bar does not yield half as high again as its resin, so the value backs nothing.`, { expect: m.Notes, migration: MIGRATION });
  flagged++;
}
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, ...counts, flagged, written: false }, null, 2)); process.exit(0); }
t.save();
console.log(JSON.stringify({ migration: MIGRATION, ...counts, flagged }, null, 2));
