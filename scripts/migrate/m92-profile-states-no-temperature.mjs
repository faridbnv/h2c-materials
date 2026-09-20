#!/usr/bin/env node
// Migration m92 (2026-09-20): a print setup whose nozzle cell is only its own unit.
//
// Siraya Tech's Flex TPU Air sheet prints "(°C)" where the nozzle temperature belongs, and b20 recorded it as
// the cell's raw text. The build could make nothing of it (PARSE-UNREAD), which is right: a cell that says only
// what unit it would be in states no setting. The row's other settings are the sheet's and stay.
//
// The reader no longer proposes such a cell, and it drops only the bare unit: "Room temperature", "Recommended"
// and "not required" are settings a sheet states in words, and thirty-one profiles already carry them.
//
//   node scripts/migrate/m92-profile-states-no-temperature.mjs

import { openTables } from '../data/table-io.mjs';

const t = openTables();
const before = t.rows('profiles').find((p) => p.ProfileID === 'P0906');
if (!before) { console.log('P0906 is not in profiles.csv; nothing to do'); process.exit(0); }
if (!['(°C)', 'Not published'].includes(before['Nozzle °C'])) { console.log(`P0906 already reads ${JSON.stringify(before['Nozzle °C'])}; nothing to do`); process.exit(0); }
// The typed columns beside the raw one say what the build reads, and a cell that publishes nothing requires
// nothing: a requirement of "required" beside "Not published" is what PARSE-MISMATCH refuses, and rightly.
if (before['Nozzle °C'] === '(°C)') t.set('profiles', 'P0906', 'Nozzle °C', 'Not published', { expect: '(°C)' });
if (before['Nozzle requirement'] === 'required') t.set('profiles', 'P0906', 'Nozzle requirement', 'unknown', { expect: 'required' });
t.save();
console.log('P0906 nozzle: the cell publishes nothing, and now requires nothing');
