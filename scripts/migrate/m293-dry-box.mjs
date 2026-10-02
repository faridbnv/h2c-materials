#!/usr/bin/env node
// Migration m293 (2026-10-02): a dry box is where the filament is kept while it prints, not a drying schedule.
//
// Spectrum's sheets print "Dry box recommended | No" (or "not necessary", "Yes", "if wet") one row above "Ruby or
// hardened nozzle recommended | No"; FormFutura's print "Drying: Not necessary Drybox: Not necessary". The import read
// neither: on 43 profiles the dry-box row ran into the nozzle row's cell ("Dry box not necessary Ruby or hardened nozzle
// not necessary"), and on the rest the dry-box answer was nowhere. The profile root-cause sweep's readers found 100 of
// them. Where the filament is kept is a profile note, as P0085's "Dry box required" already is (topic Storage humidity);
// the nozzle cell keeps only the nozzle row's words; FormFutura's drying answer is the Drying cell. Each statement is
// checked on the cached sheet.
//
//   node scripts/migrate/m293-dry-box.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';
import { retype } from './m290-profile-settings.mjs';

const MIGRATION = 'm293';
const here = dirname(fileURLToPath(import.meta.url));
const t = openTables();
const live = (id) => t.get('profiles', id).Profile !== 'Retired duplicate record';
const hasNote = (id) => t.rows('profile_notes').some((n) => n.ProfileID === id && n.Topic === 'Storage humidity');
let notes = 0, cells = 0;
const note = (id, text) => {
  if (!live(id) || hasNote(id)) return;
  onSheet(t, t.get('profiles', id).SourceID, text, MIGRATION);
  t.append('profile_notes', { ProfileID: id, Topic: 'Storage humidity', Text: text });
  notes++;
};
const setCell = (id, column, value, quote, expect) => {
  const r = t.get('profiles', id); if (r[column] === value || !live(id)) return;
  onSheet(t, r.SourceID, quote, MIGRATION);
  t.set('profiles', id, column, value, { expect: expect ?? r[column], migration: MIGRATION });
  retype(t, id, [column], MIGRATION);
  cells++;
};

// The nozzle cells the dry-box row ran into.
for (const r of t.rows('profiles')) {
  const m = /^(Dry box .*?)\s+(Ruby or hardened nozzle .*)$/.exec(r['Abrasion / clogging']);
  if (!m || !live(r.ProfileID)) continue;
  const dry = m[1].replace(/\s+temperature range .*$/, '');
  setCell(r.ProfileID, 'Abrasion / clogging', m[2], m[2], r['Abrasion / clogging']);
  note(r.ProfileID, dry);
}
// What the readers found.
for (const e of rowsOf(join(here, `${MIGRATION}-dry-box.csv`))) {
  if (e.kind === 'note') note(e.id, e.value);
  else setCell(e.id, 'Drying', e.value, e.quote, e.expect);
}
t.save();
console.log(`${MIGRATION}: ${notes} dry-box notes, ${cells} cells written`);
