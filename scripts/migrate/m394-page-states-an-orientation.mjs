#!/usr/bin/env node
// Migration m394 (2026-10-07): a page may state once how its test bars were oriented (D135, quality round 2026-10-07,
// item 7).
//
// colorFabb's data sheets print under their table "The specimens have been printed in XY plane, using 0.15 mm layer
// height, 100% infill …", and their impact rows were recorded with no direction, so each product's notched Charpy was
// counted apart as published with no stated orientation. page_context.csv carries what a page states once (D116); it now
// has a Direction column, Not published on every existing row, which a later migration of the round fills where a page
// states it. Nothing a build reads moves here. A re-run is a no-op.
//
//   node scripts/migrate/m394-page-states-an-orientation.mjs
import { openTables } from '../data/table-io.mjs';

const t = openTables();
if (!t.header('page_context').includes('Direction')) {
  t.addColumn('page_context', 'Direction', { after: 'Test temperature °C', fill: () => 'Not published' });
  t.save();
  console.log('m394: page_context has a Direction column, Not published on every row');
} else console.log('m394: nothing to do');
