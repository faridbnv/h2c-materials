#!/usr/bin/env node
// Migration m353 (2026-10-04): what the context guard found after the reader round (D125).
//
// audit:context runs the importer's own sheet reader over every profile and value and their cached sheets. After m342 to
// m344 it raised 222 new findings. A Claude Sonnet verifier decided each on its page, and Claude Opus checked the
// classes (docs/audits/2026-10-04-reader-round/proposals/corrections/context-verdicts.csv):
//   - fix: a profile cell the page states otherwise, or one that holds the settings the test bars were printed at
//     (Raise3D's "All testing specimens were printed under the following conditions": not guidance, m170, so the cell
//     returns to Not published); a drying schedule a comparison column prints beside its "Required"; a value's
//     condition the page states once;
//   - add-profile: a product's own sheet prints a print-settings block that no profile holds (CONTEXT-PROFILE-UNRECORDED);
//     the profile is built from the sheet's own words and typed by the parsers;
//   - accept: the guard read another product's column, a test-bar setting, or a standard the vocabulary lacks; the
//     reason is in data/review/context-witness-accepted.csv.
//   - a selling point held as a temperature (SUNLU's "超低熔点，低打印温度…", P1613) goes back to Not published;
// Every quote is checked on the cached sheet (line view, reading-order view, ligature-repaired view or optical sidecar),
// except on two pages whose text layer maps digits to other glyphs, read on the page image as m343 read P1101 and P0619:
// Bambu PLA Pure's (P1650: the text layer prints its bed "35 - 65 °C" as "55 - 69°C" and its chamber "25 - 40 °C" as
// "29- 40°C") and BigRep PRO HT's ("Recommended Printing 3onditions", "50 TS for 4 - 6 âours"); their quotes are the
// image's. Each edit names the value it replaces. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m353-what-the-guard-found.mjs
import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { openTables, projectRoot, nextId } from '../data/table-io.mjs';
import { rowsOf } from './m277-m279-sweep-shared.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { typedOf, TYPED } from './m290-profile-settings.mjs';
import { reviewFields } from '../../build/src/typed-values.js';
import { readStandards } from '../../build/src/normalize/standards.js';
import { withNote } from './source-edits.mjs';
import { tidy } from '../ingest/read-proposals.mjs';

const MIGRATION = 'm353';
const FILE = join(projectRoot, 'docs/audits/2026-10-04-reader-round/proposals/corrections/context-verdicts.csv');
const TYPED_COLUMNS = new Set(Object.values(TYPED).flat());
const NP = 'Not published';
const H2C_DEFAULTS = { 'H2C left': 'Verify exact grade/nozzle; no blanket approval', 'H2C right': 'Verify exact grade/nozzle; no blanket approval', 'AMS 2 Pro': 'Not verified for every grade', 'AMS HT': 'Not verified for every grade' };
// m345 already took the test-bar settings off these profiles and rewrote their Locator; the verdicts' Locator for them stands
// down, and the sentence m345 appended is given its full stop.
const SETTLED_BY_M345 = new Set(['P0618', 'P0633', 'P0656', 'P0673', 'P0907', 'P0912', 'P0919', 'P1263']);
const READ_ON_IMAGE = new Set(['P1650', 'R-BIGREP-Ec5wx9MmYX1KseTcD5XV1IABzL0ure69YNjObGyOPwDL-w']);
const t = openTables();
const verdicts = rowsOf(FILE);
let cells = 0, added = 0;
const touched = new Set();
for (const v of verdicts.filter((x) => x.decision === 'fix' && x.table && x.id && x.column)) {
  if (v.table === 'profiles' && TYPED_COLUMNS.has(v.column)) continue;
  if (v.table === 'profiles' && v.column === 'Locator' && SETTLED_BY_M345.has(v.id)) continue;
  const r = t.get(v.table, v.id);
  const value = tidy(v.value ?? '');
  if ((r[v.column] ?? '') === value) continue;
  if (v.quote && !READ_ON_IMAGE.has(v.id)) onCachedSheet(t, r.SourceID, v.quote, MIGRATION);
  t.set(v.table, v.id, v.column, value, { expect: v.expect, migration: MIGRATION });
  if (v.table === 'measurements' && v.column === 'Standard / load') {
    const standards = readStandards(value).join('; ') || NP;
    if (t.get('measurements', v.id).Standards !== standards) t.set('measurements', v.id, 'Standards', standards, { expect: t.get('measurements', v.id).Standards, migration: MIGRATION });
  }
  if (v.table === 'measurements') {
    const after = t.get('measurements', v.id); const note = `Corrected ${MIGRATION} (2026-10-04): ${v.column} as its page states it${v.reason ? `; ${v.reason}` : v.quote ? ` ("${v.quote}")` : ''}.`.replace(/\.\.$/, '.');
    if (!String(after.Notes ?? '').includes(`Corrected ${MIGRATION}`)) t.set('measurements', v.id, 'Notes', withNote(after.Notes, note), { expect: after.Notes, migration: MIGRATION });
  }
  if (v.table === 'profiles') touched.add(v.id);
  cells++;
}
for (const p of t.rows('profiles')) {
  const fixed = p.Locator.replace(/([^.;\s]) (Its nozzle and bed temperatures are the specimens' print conditions)/, '$1. $2');
  if (fixed !== p.Locator) { t.set('profiles', p.ProfileID, 'Locator', fixed, { expect: p.Locator, migration: MIGRATION }); cells++; }
}
// A product's own sheet that prints a print-settings block no profile holds: a profile of its own.
const addRows = new Map();
for (const v of verdicts.filter((x) => x.decision === 'add-profile' && x.GradeID && x.SourceID && x.NozzleC !== undefined)) {
  const k = `${v.GradeID}|${v.SourceID}`; if (!addRows.has(k)) addRows.set(k, v);
}
for (const [, v] of addRows) {
  if (t.rows('profiles').some((p) => p.GradeID === v.GradeID && p.SourceID === v.SourceID && p.Profile !== 'Retired duplicate record')) continue;
  if (!READ_ON_IMAGE.has(v.SourceID)) onCachedSheet(t, v.SourceID, v.quote, MIGRATION);
  const grade = t.get('grades', v.GradeID);
  const like = t.rows('profiles').find((p) => p.GradeID === v.GradeID && p.Profile !== 'Retired duplicate record') ?? t.rows('profiles').find((p) => p.MaterialID === grade.MaterialID && p.Profile !== 'Retired duplicate record');
  const id = nextId('profiles', t.rows('profiles').map((p) => p.ProfileID));
  const raw = Object.fromEntries(Object.entries({
    'Nozzle °C': v.NozzleC, 'Bed °C': v.BedC, 'Chamber °C': v.ChamberC, Enclosure: v.Enclosure, Drying: v.Drying,
    Plate: v.Plate, 'Nozzle diameter': v.NozzleDiameter, 'Abrasion / clogging': v.Abrasion,
  }).map(([c, x]) => [c, tidy(x || NP)]));
  // The H2C assessment cells come from a profile of the same product or material, as applyProposals takes them; a product
  // with none gets the unverified defaults and the H2C guide as their source.
  const h2c = like ? {} : { ...H2C_DEFAULTS, 'H2C SourceID': 'H2C-WIKI' };
  const row = { ...like, ...h2c, ProfileID: id, MaterialID: grade.MaterialID, GradeID: v.GradeID, Profile: 'Manufacturer published guidance', SourceID: v.SourceID, Locator: tidy(v.Locator), 'Parse review': 'Not applicable', 'Nozzle material': NP, 'AMS published': NP, 'Failure modes': NP, 'Support pairing': NP, ...raw };
  t.append('profiles', { ...row, ...typedOf(row) }, { migration: MIGRATION });
  added++;
}
// A corrected profile is typed again by the parsers, except in a column its Parse review explains (D115).
let retyped = 0;
for (const id of touched) {
  const r = t.get('profiles', id); const reviewed = reviewFields(r) ?? new Set(); const typed = typedOf(r);
  for (const c of TYPED_COLUMNS) { if (reviewed.has(c) || r[c] === typed[c]) continue; t.set('profiles', id, c, typed[c], { expect: r[c], migration: MIGRATION }); retyped++; }
}
if (cells || added || retyped) t.save();

// The findings the guard raises where it reads another column or a test-bar block: accepted with the verifier's reason.
const BASE = join(projectRoot, 'data/review/context-witness-accepted.csv');
const text = existsSync(BASE) ? readFileSync(BASE, 'utf8') : 'Code,Record,Field,Reason,Accepted\n';
const have = new Set(text.trim().split('\n').slice(1).map((l) => l.split(',').slice(0, 3).join(',')));
const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
const lines = [];
for (const v of verdicts.filter((x) => x.decision === 'accept' && x.code)) {
  const field = (v.field ?? '').replace(/^\[|\]$/g, '');
  const k = [v.code, v.record, field].join(',');
  if (have.has(k)) continue; have.add(k);
  lines.push([v.code, v.record, field, q(`${v.reason} (reader round, ${MIGRATION}, 2026-10-04)`), '2026-10-04'].join(','));
}
if (lines.length) writeFileSync(BASE, text.replace(/\n?$/, '\n') + lines.join('\n') + '\n');
console.log(`${MIGRATION}: ${cells} cell(s) fixed, ${added} profile(s) added, ${retyped} typed cell(s) read again, ${lines.length} finding(s) accepted`);
