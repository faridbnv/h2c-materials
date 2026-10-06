#!/usr/bin/env node
// Check round 3's ground truth for the OCR comparison (2026-10-05): records whose page reading is already settled, in
// TARGETS.csv's columns plus Expected and Origin, so compare.mjs is judged before its outcome decides anything.
//
// - confirmed: every measurement and profile the four blind draws (reader round, gap round 2) found correct on its
//   page image and that has not changed since; Expected pairing-confirmed.
// - known-wrong: every held number a correction replaced in the reader round and gap round 2 (m343, m345, m353, m354,
//   m359, m365 and m368, among the commits named below), as it was held before, at the locator it was held at: Expected
//   not-confirmed, because the page does not print it there. The value that replaced it, where it still stands, is
//   Expected pairing-confirmed.
// - mis-pairings made on purpose: 30 confirmed values given another row's number from the same page, and 15 X-Y values
//   said to be Z (with the same values as held beside them), Expected not-confirmed: the error the reads found most.
// - the positive control: Bambu PLA Pure's text layer prints "55 - 69" where the page image shows 35-65; the held
//   value is the image's.
// Read-only: the tables, git history and the verdict files; writes ground-truth.csv beside this file.
//
//   node docs/audits/2026-10-05-check-round-3/ocr/ground-truth.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../../../../build/node_modules/csv-parse/lib/sync.js';
import { csvText } from '../../../../build/src/csv.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
const parseCsv = (text) => parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true });
const table = (name, ref) => parseCsv(ref ? execFileSync('git', ['show', `${ref}:data/tables/${name}.csv`], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 }) : readFileSync(join(root, 'data/tables', `${name}.csv`), 'utf8'));
const byId = (rows, key) => new Map(rows.map((r) => [r[key], r]));

const M = byId(table('measurements'), 'MeasurementID');
const P = byId(table('profiles'), 'ProfileID');
const targets = byId(parseCsv(readFileSync(join(here, '../TARGETS.csv'), 'utf8')), 'Record');
const GATE = ['Nozzle °C', 'Bed °C', 'Chamber °C', 'Drying', 'Enclosure', 'Abrasion / clogging'];
const out = [];
const add = (row) => out.push({ FixtureID: '', ...row });
const measurementRow = (m, extra) => ({ Kind: 'value', Record: m.MeasurementID, Field: m.Property, GradeID: m.GradeID, MaterialID: m.MaterialID, SourceID: m.SourceID, Locator: m.Locator, Value: m['Raw value'], Direction: m.Direction, SheetType: targets.get(m.MeasurementID)?.SheetType ?? '', ...extra });
const profileRow = (p, column, extra) => ({ Kind: 'gate', Record: p.ProfileID, Field: column, GradeID: p.GradeID, MaterialID: p.MaterialID, SourceID: p.SourceID, Locator: p.Locator, Value: p[column], Direction: '', SheetType: targets.get(p.ProfileID)?.SheetType ?? '', ...extra });

// Confirmed by a blind draw, and unchanged since its sample was written.
const draws = [['2026-10-04-reader-round', 'verdicts-20261005.csv'], ['2026-10-04-reader-round', 'verdicts-20261006.csv'], ['2026-10-05-gap-round-2', 'verdicts-20261007.csv'], ['2026-10-05-gap-round-2', 'verdicts-20261008.csv']];
for (const [packet, file] of draws) {
  const dir = join(root, 'docs/audits', packet, 'blind-draw');
  const sample = byId(parseCsv(readFileSync(join(dir, file.replace('verdicts', 'sample')), 'utf8')), 'Record');
  for (const v of parseCsv(readFileSync(join(dir, file), 'utf8'))) {
    if ((v.Decided || v.Verdict) !== 'correct') continue;
    const s = sample.get(v.Record);
    if (v.Table === 'measurements' && M.has(v.Record)) {
      const m = M.get(v.Record);
      if (s && !s.Fact.includes(m['Raw value'])) continue;
      add(measurementRow(m, { Expected: 'pairing-confirmed', Origin: `${packet} ${file}` }));
    } else if (v.Table === 'profiles' && P.has(v.Record)) {
      const p = P.get(v.Record);
      for (const c of ['Nozzle °C', 'Bed °C', 'Chamber °C']) if (/\d/.test(p[c]) && (!s || s.Fact.includes(p[c]))) add(profileRow(p, c, { Expected: 'pairing-confirmed', Origin: `${packet} ${file}` }));
    }
  }
}

// What a correction replaced: the held value before (not on its line) and after (on it). Every edit of a held number in
// the reader round's and gap round 2's commits was a correction against the page; an edit that only rewrote the number's
// form ("85" -> "85A - 88A") is not a wrong value and is left out.
const corrections = ['8f9ef98e', 'fb5fc5fd', '4bfa0d9b', '3f79af50', '126894fd', 'fa940d82', '0e06a53b', '778cd040', '4c99cf34'];
const nums = (s) => (String(s).match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => Number(x.replace(',', '.')));
const sameNumbers = (a, b) => { const x = nums(a), y = nums(b); return x.every((n) => y.includes(n)) || y.every((n) => x.includes(n)); };
for (const commit of corrections) {
  const subject = execFileSync('git', ['log', '-1', '--format=%s', commit], { cwd: root, encoding: 'utf8' }).trim().slice(0, 60);
  const before = byId(table('measurements', `${commit}^`), 'MeasurementID');
  for (const m of table('measurements', commit)) {
    const o = before.get(m.MeasurementID);
    if (!o || o['Raw value'] === m['Raw value'] || !nums(o['Raw value']).length || !nums(m['Raw value']).length || sameNumbers(o['Raw value'], m['Raw value'])) continue;
    add(measurementRow(o, { Expected: 'not-confirmed', Origin: `${commit} replaced it with ${m['Raw value']} (${subject})` }));
    const now = M.get(m.MeasurementID);
    if (now && now['Raw value'] === m['Raw value']) add(measurementRow(now, { Expected: 'pairing-confirmed', Origin: `${commit} correction` }));
  }
  const pBefore = byId(table('profiles', `${commit}^`), 'ProfileID');
  for (const p of table('profiles', commit)) {
    const o = pBefore.get(p.ProfileID);
    if (!o) continue;
    for (const c of GATE.slice(0, 3)) {
      if (o[c] === p[c] || !nums(o[c]).length || !nums(p[c]).length || sameNumbers(o[c], p[c])) continue;
      add(profileRow(o, c, { Expected: 'not-confirmed', Origin: `${commit} replaced it with ${p[c]} (${subject})` }));
      const now = P.get(p.ProfileID);
      if (now && now[c] === p[c]) add(profileRow(now, c, { Expected: 'pairing-confirmed', Origin: `${commit} correction` }));
    }
  }
}

// The positive control: the page image's range, which the text layer misprints.
for (const p of P.values()) if (p.GradeID === 'G001-183' && /35\s*[-–]\s*65/.test(p['Bed °C'])) add(profileRow(p, 'Bed °C', { Expected: 'pairing-confirmed', Origin: 'positive control: the text layer prints 55 - 69' }));

// Mis-pairings made on purpose, the error the reads found most: a confirmed value given another row's number from the
// same page (the number is on the page, in the wrong row), and a confirmed X-Y value said to be the Z one. Seeded, so
// the fixture is the same on every run.
let seed = 20261005;
const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const confirmed = out.filter((r) => r.Expected === 'pairing-confirmed' && r.Kind === 'value');
const page = (locator) => String(locator).match(/p\.\s*(\d+)/)?.[1];
const swaps = [];
for (const r of confirmed) {
  const others = [...M.values()].filter((m) => m.SourceID === r.SourceID && m.MeasurementID !== r.Record && page(m.Locator) === page(r.Locator)
    && m.Property !== r.Field && nums(m['Raw value']).length && !sameNumbers(m['Raw value'], r.Value) && !m['Data status'].startsWith('Retired'));
  if (others.length) swaps.push([r, others[Math.floor(random() * others.length)]]);
}
for (const [r, other] of swaps.slice(0, 30)) add({ ...r, FixtureID: undefined, Value: other['Raw value'], Expected: 'not-confirmed', Origin: `mis-pairing made on purpose: ${other.MeasurementID}'s value (${other.Property}) at ${r.Record}'s row` });
const xy = [...M.values()].filter((m) => /^X-?Y$/i.test(m.Direction) && targets.get(m.MeasurementID)?.SheetType === 'x-y-z'
  && [...M.values()].some((z) => z.SourceID === m.SourceID && z.Property === m.Property && /^Z$/i.test(z.Direction) && !sameNumbers(z['Raw value'], m['Raw value'])));
for (let i = 0; i < 15 && xy.length; i++) {
  const m = xy.splice(Math.floor(random() * xy.length), 1)[0];
  add(measurementRow(m, { Direction: 'Z', Expected: 'not-confirmed', Origin: 'mis-pairing made on purpose: an X-Y value said to be the Z one' }));
  add(measurementRow(m, { Expected: 'pairing-confirmed', Origin: 'the same X-Y value, as held' }));
}
for (const [i, r] of out.entries()) r.FixtureID = `F${String(i + 1).padStart(4, '0')}`;

const header = ['FixtureID', 'Kind', 'Record', 'Field', 'GradeID', 'MaterialID', 'SourceID', 'Locator', 'Value', 'Direction', 'SheetType', 'Expected', 'Origin'];
writeFileSync(join(here, 'ground-truth.csv'), csvText(header, out));
const n = (e) => out.filter((r) => r.Expected === e).length;
console.log(`${out.length} fixtures: ${n('pairing-confirmed')} pairing-confirmed, ${n('not-confirmed')} not-confirmed; ${out.filter((r) => /positive control/.test(r.Origin)).length} positive control(s); ${new Set(out.map((r) => r.SourceID)).size} sources`);
