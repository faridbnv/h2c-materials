#!/usr/bin/env node
// Where a print-profile error could hide, marked on each profile's cached sheet (the data audit of 2026-10-01; the
// causes found are in docs/audits/2026-10-02-profile-root-causes). `npm run audit:context` keeps each known cause out; a
// layout neither it nor the import's reader has seen is found only by reading, and this says where to read: a
// setting-like number or statement no profile of the sheet holds, a held number found only under a test-specimen heading
// or beside another setting's label, a cell not printed as one run of words, two profiles of one product that disagree.
// It marks, it does not judge: most marks are a sheet's own storage, property or test lines. Marks are grouped by
// template (sheets of one maker that share their labels), kind and line shape, so one reading settles a group.
//
//   npm run audit:profile-marks                          marks to build/reports/profile-marks/marks.csv, a summary here
//   npm run audit:profile-marks -- --out marks.csv       marks to another file
//
// Not in verify: it needs the text cache (.cache/text), which a contributor's checkout has and CI does not, and it is
// a reading aid, not a gate. The detectors are in scripts/audit/profile-marks-detect.mjs.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { cacheDir, cachedText } from '../lib/pdf-text.mjs';
import { detect, clusterTemplates } from './profile-marks-detect.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const COLUMNS = ['group', 'template', 'publisher', 'kind', 'column', 'sid', 'profiles', 'siblings', 'page', 'specimen', 'missing', 'held', 'shape', 'line', 'prev', 'next'];
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** The marks on a set of profile rows, each with its template, publisher and group; `unreadable` counts the profiles whose sheet has no cached text. */
export function profileMarks(profileRows, sources, pagesOf) {
  const publisher = new Map(sources.map((s) => [s.SourceID, s.Publisher ?? '']));
  const template = clusterTemplates(profileRows, { pagesOf, publisherOf: (sid) => publisher.get(sid) });
  const marks = detect(profileRows, { pagesOf });
  for (const m of marks) {
    m.template = template.get(m.sid) ?? 'T?';
    m.publisher = publisher.get(m.sid) ?? '';
    m.group = `${m.template}|${m.kind}|${m.column ?? m.shape}`;
  }
  const guidance = profileRows.filter((r) => !/not printing guidance/.test(r.Locator));
  const unreadable = guidance.filter((r) => !pagesOf(r.SourceID));
  return { marks, guidance: guidance.length, unreadable: unreadable.length, unreadableSheets: new Set(unreadable.map((r) => r.SourceID)).size };
}

/** Marks, sheets and profiles by kind, and in all. */
export function summarize(marks) {
  const byKind = {};
  for (const m of marks) {
    const k = (byKind[m.kind] ??= { marks: 0, groups: new Set(), sheets: new Set(), profiles: new Set() });
    k.marks++; k.groups.add(m.group); k.sheets.add(m.sid); String(m.profiles).split(' ').forEach((p) => k.profiles.add(p));
  }
  const all = { marks: marks.length, groups: new Set(marks.map((m) => m.group)).size, sheets: new Set(marks.map((m) => m.sid)).size, profiles: new Set(marks.flatMap((m) => String(m.profiles).split(' '))).size };
  return { byKind: Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, { marks: v.marks, groups: v.groups.size, sheets: v.sheets.size, profiles: v.profiles.size }])), all };
}

export const marksCsv = (marks) => [COLUMNS.join(','), ...marks.map((m) => COLUMNS.map((c) => csvCell(m[c])).join(','))].join('\n') + '\n';

function main() {
  const args = process.argv.slice(2);
  const at = args.indexOf('--out');
  const out = resolve(at >= 0 ? args[at + 1] ?? '' : join(root, 'build/reports/profile-marks/marks.csv'));
  if (at >= 0 && !args[at + 1]) { console.error('audit:profile-marks: --out needs a path'); process.exit(2); }
  if (!existsSync(cacheDir('text'))) { console.log('audit:profile-marks skipped: no text cache (.cache/text) in this checkout'); return; }
  const t = openTables();
  const sha = new Map(t.rows('sources').map((s) => [s.SourceID, s.SHA256]));
  const cache = new Map();
  const pagesOf = (sourceId) => {
    const h = sha.get(sourceId); if (!h || !/^[0-9a-f]{64}$/.test(h)) return null;
    if (!cache.has(h)) { const c = cachedText(h); cache.set(h, c ? c.pages.map((p) => ({ page: p.page, lines: p.lines.map((l) => l.text ?? '') })) : null); }
    return cache.get(h);
  };
  const profiles = t.rows('profiles');
  if (!profiles.some((r) => pagesOf(r.SourceID))) { console.log('audit:profile-marks skipped: the text cache (.cache/text) holds none of the profiles\' sheets in this checkout'); return; }
  const { marks, guidance, unreadable, unreadableSheets } = profileMarks(profiles, t.rows('sources'), pagesOf);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, marksCsv(marks));
  const { byKind, all } = summarize(marks);
  console.log(`audit:profile-marks: ${all.marks} marks on ${all.sheets} sheets, ${all.profiles} profiles, in ${all.groups} groups -> ${out}`);
  for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1].marks - a[1].marks)) console.log(`  ${k.padEnd(24)} ${String(v.marks).padStart(5)} marks  ${String(v.sheets).padStart(4)} sheets  ${String(v.profiles).padStart(4)} profiles  ${String(v.groups).padStart(4)} groups`);
  console.log(unreadable ? `  ${unreadable} of ${guidance} guidance profiles (${unreadableSheets} sheets) have no cached text here and were not read; the marks are partial` : `  all ${guidance} guidance profiles' sheets were read`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
