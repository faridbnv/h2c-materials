#!/usr/bin/env node
// Migration m395 (2026-10-07): what colorFabb's and one Spectrum data sheet state once about how their test bars lay on
// the plate (D135, quality round 2026-10-07, item 7).
//
// Twenty-seven colorFabb data sheets print under their table "The specimens have been printed in XY plane, using … layer
// height, 100% infill …", and Spectrum's PLA Tough sheet footnotes its mechanical table "*3D printed horizontal (XY
// axis), at 100% infill". Their impact rows, and some tensile and flexural rows, were recorded with no direction, so
// each product's value was counted apart as published with no stated orientation and never entered its material's
// median. Each page now has a page_context row stating Direction XY; the build gives it to the tensile, flexural and
// impact rows of the page that state no direction and are printed or unstated bars, never to a moulded bar (colorFabb's
// nGen sheet also prints an injection-moulded table), a density or a heat deflection (page-context.js). Specimen type
// and every other column state nothing here: the rows keep what they hold.
//
// Each statement is checked on its cached sheet; it is recorded on page 1, the page whose values it speaks for, with
// its own page in the Locator. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m395-bars-printed-in-the-xy-plane.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';

const MIGRATION = 'm395';
const NP = 'Not published';
const NA = 'Not applicable';
// [source, the page that prints the statement, the statement as printed]
const STATEMENTS = [
  ['R-COLORFABB-NGEN-TDS-V2', 2, "The specimens have been printed in XY plane, using 0.15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['S-SPECTRUM-en-tds-spectrum-pla-tough', 1, "*3D printed horizontal (XY axis), at 100% infill"],
  ['R-COLORFABB-TDS-PET-HIGH-SPEED-PRO', 2, "The specimens have been printed in XY plane, using 0,2 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-E-colorFabb-LW-ASA', 2, "The specimens have been printed in XY plane, using 0.15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-varioShore-PEBA45D', 2, "The specimens have been printed in XY plane, using 0.2 mm layer height, 100% infill, 0.4 mm nozzle,"],
  ['R-COLORFABB-TDS-nGen-CF10', 2, "The specimens have been printed in XY plane, using 0.15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-E-ColorFabb-LW-PLA', 2, "The specimens have been printed in XY plane, using 0.15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-varioShore-TPU-95A', 2, "The specimens have been printed in XY plane, using 0.15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-colorFabb-TPU85A', 2, "The specimens have been printed in XY plane, using 0,2mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-E-ColorFabb-PLA-HP-7a500b', 2, "The specimens have been printed in XY plane, using 0,15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-varioShore-PEBA40D', 2, "The specimens have been printed in XY plane, using 0.2 mm layer height, 100% infill, 0.4 mm nozzle,"],
  ['R-COLORFABB-TDS-E-ColorFabb-nGen-FLEX', 2, "The specimens have been printed in XY plane, using … mm layer height, 100% infill, 0,4 mm nozzle, …."],
  ['R-COLORFABB-TDS-E-ColorFabb-PETG-Economy', 2, "The specimens have been printed in XY plane, using 0.15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-E-ColorFabb-nGen', 2, "The specimens have been printed in XY plane, using 0.15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-E-colorFabb-PLA-Regrind', 2, "The specimens have been printed in XY plane, using 0,15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-E-ColorFabb-ASA', 2, "The specimens have been printed in XY plane, using 0.15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-colorFabb-TPU95A', 2, "The specimens have been printed in XY plane, using 0,2mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-varioShore-TPU85A', 2, "The specimens have been printed in XY plane, using 0.2 mm layer height, 100% infill, 0.4 mm nozzle, 250"],
  ['R-COLORFABB-TDS-E-ColorFabb-LW-PLA-HT', 2, "The specimens have been printed in XY plane, using 0.2 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-colorFabb-PLA-High-Speed-PRO', 2, "The specimens have been printed in XY plane, using 0.2 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-E-ColorFabb-Vibers-PLA', 1, "The specimens have been printed in XY plane, using 0,15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-varioShore-Prosthetic-TPU', 2, "The specimens have been printed in XY plane, using 0.15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-PLA-PHA', 2, "The specimens have been printed in XY plane, using 0.15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-E-ColorFabb-XT-2', 2, "The specimens have been printed in XY plane, using 0.15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-colorFabb-XT-CF20', 2, "The specimens have been printed in XY plane, using 0.15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-E-ColorFabb-HT', 2, "The specimens have been printed in XY plane, using 0.15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-E-colorFabb-PA-NEAT', 2, "The specimens have been printed in XY plane, using 0.15 mm layer height, 100% infill, 0,4 mm nozzle,"],
  ['R-COLORFABB-TDS-E-PA-Blue-Metal-Detectable', 2, "The specimens have been printed in XY plane, using … mm layer height, 100% infill, 0,4 mm nozzle, …."],
];
const t = openTables();
let added = 0;
for (const [sourceId, page, statement] of STATEMENTS) {
  const held = t.rows('page_context').find((c) => c.SourceID === sourceId && String(c.Page) === '1' && c['Applies to'] === 'all' && c.Table === NA);
  if (held) {
    if (held.Direction === 'XY') continue;
    throw new Error(`${MIGRATION}: ${sourceId} p. 1 already has an all-scope row (${held.PageContextID}); merge by hand`);
  }
  const view = onCachedSheet(t, sourceId, statement, MIGRATION);
  t.append('page_context', {
    PageContextID: t.nextId('page_context'), SourceID: sourceId, Page: '1', 'Applies to': 'all', Table: NA, Statement: statement,
    'Specimen type': NP, 'Moisture state': 'not-stated', 'Post-processing state': 'not-stated', 'Anneal °C': NA, 'Anneal h': NA,
    Standard: NP, 'Test temperature °C': NP, Direction: 'XY', Locator: `p. ${page}: ${statement}`,
    'Reviewed by': `Claude Opus 5.5, 2026-10-07, on the cached sheet (${MIGRATION}; quality round item 7)${view && view !== 'line' ? `, read in its ${view} view` : ''}`,
  });
  added++;
}
if (added) t.save();
console.log(`${MIGRATION}: ${added} page statement(s) of bars printed in the XY plane`);
