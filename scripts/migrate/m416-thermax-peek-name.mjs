#!/usr/bin/env node
// Migration m416 (2026-10-16): 3DXTECH's PEEK is ThermaX PEEK, as its sheet prints it (D63, D139).
//
// The sweep of the new print temperatures heading read "3DXTECH Themax PEEK" beside the same maker's "THERMAX PPSU". The
// sheet (X-Themax-PEEK-TDS-v3, its SHA-256 in sources.csv) heads its first page "Technical Data Sheet: ThermaX™ PEEK 3D
// Printing Filament"; "Themax" is only in the file name 3DXTECH's shop serves it under, which the URL and the source's ID
// keep. The product's name and the source's title are the sheet's. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m416-thermax-peek-name.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm416';
const t = openTables();
let changed = 0;
if (t.set('grades', 'G097-01', 'Product name', 'ThermaX PEEK', { expect: t.get('grades', 'G097-01')['Product name'] === 'ThermaX PEEK' ? 'ThermaX PEEK' : 'Themax PEEK', migration: MIGRATION })) changed++;
if (t.set('sources', 'X-Themax-PEEK-TDS-v3', 'Title', 'ThermaX PEEK', { expect: t.get('sources', 'X-Themax-PEEK-TDS-v3').Title === 'ThermaX PEEK' ? 'ThermaX PEEK' : 'Themax PEEK', migration: MIGRATION })) changed++;
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} change(s): 3DXTECH's PEEK named ThermaX PEEK, as its sheet prints it`);
