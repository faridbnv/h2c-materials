// The print-profile detectors (scripts/audit/profile-marks-detect.mjs, `npm run audit:profile-marks`) find each kind of
// mark on a small fixture sheet, with no text cache needed: the data audit of 2026-10-01, docs/audits/2026-10-02-profile-root-causes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { detect, clusterTemplates } from '../scripts/audit/profile-marks-detect.mjs';
import { profileMarks, summarize, marksCsv } from '../scripts/audit/profile-marks.mjs';

const NP = 'Not published';
const profile = (id, sid, over = {}) => ({ ProfileID: id, GradeID: 'G001-01', SourceID: sid, Locator: 'p1', 'Nozzle °C': NP, 'Bed °C': NP, 'Chamber °C': NP, Enclosure: NP, Plate: NP, Drying: NP, 'Nozzle material': NP, 'Nozzle diameter': NP, 'Abrasion / clogging': NP, 'Failure modes': NP, 'Support pairing': NP, Profile: 'Manufacturer published guidance', ...over });
const sheets = {
  // omission: 60 is printed on a setting line nobody holds; 210 is held
  'S-UNHELD': [{ page: 1, lines: ['Nozzle temperature 210 °C', 'Bed temperature 60 °C'] }],
  // part-held: one of the line's two numbers is held
  'S-PART': [{ page: 1, lines: ['Nozzle temperature 210 °C / 235 °C'] }],
  // a nozzle statement and an enclosure statement in words, where the profile holds neither
  'S-WORDS': [{ page: 1, lines: ['A hardened steel nozzle is recommended', 'Enclosure: needed for large parts'] }],
  // the cell holds a number the sheet prints with an open end
  'S-SIGN': [{ page: 1, lines: ['Bed temperature > 80 °C'] }],
  // a held cell that is two rows of the sheet run together
  'S-RAW': [{ page: 1, lines: ['Chamber temperature not required', 'Dry the filament before use'] }],
  // a held number found only under a test-specimen heading, and one beside another setting's label
  'S-SPECIMEN': [{ page: 1, lines: ['Printed specimen conditions', 'Nozzle 245 °C', 'Layer height 0.2 mm'] }],
  'S-OTHER': [{ page: 1, lines: ['Nozzle temperature 220 °C', 'Chamber 45 °C'] }],
  // a held number the sheet does not print at all
  'S-GONE': [{ page: 1, lines: ['Nozzle temperature 200 °C'] }],
  // two profiles of one product from one sheet: they conflict on the nozzle, and one holds less on the bed
  'S-DUP': [{ page: 1, lines: ['Nozzle temperature 210 °C', 'Bed temperature 60 °C'] }],
};
const rows = [
  profile('P1', 'S-UNHELD', { 'Nozzle °C': '210 °C' }),
  profile('P2', 'S-PART', { 'Nozzle °C': '210 °C' }),
  profile('P3', 'S-WORDS'),
  profile('P4', 'S-SIGN', { 'Bed °C': '80 °C' }),
  profile('P5', 'S-RAW', { 'Chamber °C': 'Not required (closed chamber: none needed for printing)' }),
  profile('P6', 'S-SPECIMEN', { 'Nozzle °C': '245 °C' }),
  profile('P7', 'S-OTHER', { 'Bed °C': '45 °C' }),
  profile('P8', 'S-GONE', { 'Nozzle °C': '255 °C' }),
  profile('P9', 'S-DUP', { 'Nozzle °C': '210 °C', 'Bed °C': '60 °C' }),
  profile('P10', 'S-DUP', { 'Nozzle °C': '230 °C', 'Bed °C': NP }),
  profile('P11', 'S-NOTGUIDANCE', { Locator: 'p1; not printing guidance' }),
];
const pagesOf = (sid) => sheets[sid] ?? null;

test('every kind of mark is found on a fixture sheet', () => {
  const kinds = new Set(detect(rows, { pagesOf }).map((m) => m.kind));
  for (const kind of ['unheld', 'part-held', 'nozzle-statement', 'word-statement', 'sign-dropped', 'raw-not-verbatim', 'held-from-specimen', 'held-beside-other-label', 'held-not-on-sheet', 'duplicate', 'duplicate-conflict', 'duplicate-holds', 'duplicate-incomplete'])
    assert.ok(kinds.has(kind), `no ${kind} mark; found ${[...kinds].join(', ')}`);
});

test('a mark names its sheet, profile, page and line', () => {
  const marks = detect(rows, { pagesOf });
  const unheld = marks.find((m) => m.kind === 'unheld' && m.sid === 'S-UNHELD');
  assert.equal(unheld.profiles, 'P1');
  assert.equal(unheld.page, 1);
  assert.match(unheld.line, /Bed temperature 60/);
  assert.equal(unheld.missing, '60');
  assert.ok(marks.every((m) => m.sid !== 'S-NOTGUIDANCE'), 'a profile that says it prints no guidance is not read');
});

test('a held setting the sheet prints is not marked', () => {
  const clean = [profile('P1', 'S-CLEAN', { 'Nozzle °C': '210 °C', 'Bed °C': '60 °C' })];
  const sheet = { 'S-CLEAN': [{ page: 1, lines: ['Nozzle temperature 210 °C', 'Bed temperature 60 °C'] }] };
  assert.deepEqual(detect(clean, { pagesOf: (s) => sheet[s] }), []);
});

test('the report groups marks by template, counts unreadable sheets and writes the original columns', () => {
  const sources = Object.keys(sheets).map((id) => ({ SourceID: id, Publisher: 'Maker' }));
  const { marks, guidance, unreadable } = profileMarks(rows, sources, pagesOf);
  assert.equal(guidance, 10);
  assert.equal(unreadable, 0);
  assert.ok(marks.every((m) => /^T\d{3}\|/.test(m.group)));
  const { all, byKind } = summarize(marks);
  assert.equal(all.marks, marks.length);
  assert.ok(byKind.unheld.marks >= 1);
  const csv = marksCsv(marks).split('\n');
  assert.equal(csv[0], 'group,template,publisher,kind,column,sid,profiles,siblings,page,specimen,missing,held,shape,line,prev,next');
  const none = profileMarks(rows, sources, () => null);
  assert.equal(none.unreadable, 10);
  assert.equal(none.unreadableSheets, 9);
  assert.ok(none.marks.every((m) => /^duplicate/.test(m.kind)), 'with no sheet text only the table-only duplicate marks remain');
});

test('sheets of one maker that share their labels share a template', () => {
  const a = [{ page: 1, lines: ['Nozzle temperature 200 °C', 'Bed temperature 60 °C', 'Chamber none'] }];
  const rs = [profile('P1', 'S-A'), profile('P2', 'S-B'), profile('P3', 'S-C')];
  const pages = { 'S-A': a, 'S-B': a, 'S-C': [{ page: 1, lines: ['Retraction 2 mm', 'Brim 5 mm', 'Speed 40 mm/s'] }] };
  const t = clusterTemplates(rs, { pagesOf: (s) => pages[s], publisherOf: () => 'Maker (X)' });
  assert.equal(t.get('S-A'), t.get('S-B'));
  assert.notEqual(t.get('S-A'), t.get('S-C'));
});
