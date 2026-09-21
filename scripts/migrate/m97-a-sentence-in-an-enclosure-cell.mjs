#!/usr/bin/env node
// Migration m97 (2026-09-21): a sentence recorded as an enclosure setting.
//
// b24 recorded, for Stratasys's PC-ABS (P0921), an Enclosure of "per ASTM G154 (Standard Practice for Operating
// Fluorescent UV Light Apparatus …)": the sheet's UV-ageing paragraph wraps so that a line begins with the word
// chamber, and the digits of the designation let the sentence past the guard that stops a run of words with no
// number in it. The build could make nothing of it (PARSE-UNREAD). The reader now refuses a setting that cites a
// standard; this puts the cell back to what the sheet states about its enclosure, which is nothing.
//
//   node scripts/migrate/m97-a-sentence-in-an-enclosure-cell.mjs

import { openTables } from '../data/table-io.mjs';

const t = openTables();
const row = t.rows('profiles').find((p) => p.ProfileID === 'P0921');
if (!row) { console.log('P0921 is not in profiles.csv; nothing to do'); process.exit(0); }
if (!/ASTM G154/.test(row.Enclosure ?? '')) { console.log(`P0921 already reads ${JSON.stringify(row.Enclosure)}; nothing to do`); process.exit(0); }
t.set('profiles', 'P0921', 'Enclosure', 'Not published', { expect: row.Enclosure });
if (row['Enclosure state'] !== 'unknown') t.set('profiles', 'P0921', 'Enclosure state', 'unknown', { expect: row['Enclosure state'] });
t.save();
console.log('P0921 Enclosure: a UV-ageing sentence -> Not published');
