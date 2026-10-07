#!/usr/bin/env node
// The plain-language status in README.md ("Where things stand"), written for the owner, who does not hold the project's
// codes and numbers in mind. Its sentences are hand-written; its numbers were too, and went stale within a day (the
// page listed 153 materials after a migration made one an alias). The block between the markers below is now generated:
// the counts from the compiled database (dist/db.json) through scripts/lib/status-counts.mjs, the accuracy sentence from
// the newest blind-draw verdicts file under docs/audits/. Nothing here reads build/snapshot/counts.md, which only the
// full verify refreshes and so can lag the database.
//
// The numbers are rounded, because a plain summary that says 14,403 is wrong by the next import: a count of 1,000 or
// more to the nearest 100, one from 100 to 999 to the nearest 50, one below 100 exact. Exact counts are in
// build/snapshot/counts.md.
//
// The database must be the one the tables make now, so run this after the build (npm run build, as verify:fast does).
// A missing dist/db.json is built first.
//
//   npm run docs:status            rewrite the block
//   npm run docs:status -- --check exit 1 if it is out of date (run by npm run verify:fast)

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsvText } from '../build/src/csv.js';
import { statusCounts } from './lib/status-counts.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const START = '<!-- status:begin -->';
export const END = '<!-- status:end -->';

const capital = (s) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const grouped = (n) => n.toLocaleString('en-US');

/**
 * A count as a plain summary states it: below 100 exact, from 100 to 999 to the nearest 50, from 1,000 up to the nearest
 * 100. Fifty and not ten, because "about 310" reads as a measurement and "about 300" as the round figure it is.
 */
export function roundCount(n) {
  if (n < 100) return { value: n, exact: true };
  return { value: Math.round(n / (n < 1000 ? 50 : 100)) * (n < 1000 ? 50 : 100), exact: false };
}
export const figure = (n) => grouped(roundCount(n).value);
export const about = (n) => (roundCount(n).exact ? '' : 'about ') + figure(n);

// The date the section speaks for: the newest round's folder under docs/audits/ (2026-10-05-check-round-3 -> 2026-10-05).
// Not the database's snapshot date, which is the Method table's hand-set data date and reads older than the text, and
// not today's, which would make --check fail on the next day's commit that leaves the README alone.
export function latestRound(auditDir = join(root, 'docs/audits')) {
  return readdirSync(auditDir).map((name) => /^(\d{4}-\d{2}-\d{2})-/.exec(name)?.[1]).filter(Boolean).sort().at(-1) ?? null;
}

// docs/audits/<round>/blind-draw/verdicts-<stamp>.csv, oldest first. The stamp is the draw's seed date, and a later draw
// has a later one, so the stamp orders them across rounds.
export function verdictFiles(auditDir = join(root, 'docs/audits'), name = /^verdicts-(\d+)\.csv$/) {
  const files = [];
  for (const round of readdirSync(auditDir, { withFileTypes: true })) {
    const dir = join(auditDir, round.name, 'blind-draw');
    if (!round.isDirectory() || !existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const stamp = name.exec(f)?.[1];
      if (stamp) files.push({ stamp, path: join(dir, f) });
    }
  }
  return files.sort((a, b) => a.stamp.localeCompare(b.stamp));
}

/**
 * How many records of a draw were wrong. "Verdict" is the first reader's call and "Decided" the final one after the
 * page was read again (a first "wrong" can be overturned), so the final one counts; an older file with no Decided column
 * falls back to Verdict. A record is wrong when that call starts with "wrong": "partly wrong (not deciding)" is a
 * different grade and is reported as partly.
 */
export function drawResult(csv, label = 'verdicts file') {
  const { header, records } = parseCsvText(csv, label);
  if (!header.includes('Verdict')) throw new Error(`${label}: no Verdict column`);
  const call = (r) => (r.values.Decided ?? r.values.Verdict ?? '').toLowerCase();
  // A partly wrong record has a wrong cell too: the README counts both, as the rounds' own reports do. A sealed sample's
  // file marks which wrong cells could change an answer (Deciding yes).
  return { sample: records.length, wrong: records.filter((r) => /^(?:wrong|partly)\b/.test(call(r))).length, partly: records.filter((r) => /^partly\b/.test(call(r))).length,
    deciding: header.includes('Deciding') ? records.filter((r) => r.values.Deciding === 'yes').length : null };
}

/** The accuracy figures for the README: the newest draw, and the range of the earlier ones. */
export function accuracy(files = verdictFiles()) {
  if (!files.length) throw new Error('docs/audits has no blind-draw/verdicts-*.csv file; the accuracy sentence has no source');
  const results = files.map((f) => ({ ...f, ...drawResult(readFileSync(f.path, 'utf8'), relative(root, f.path)) }));
  const latest = results[results.length - 1];
  const earlier = results.slice(0, -1).map((r) => r.wrong);
  // A sealed draw of what decides (blind-draw/draw-b-verdicts-<stamp>.csv) is reported on its own: it is not a sample of
  // a round's changes, so it is not one of the draws above.
  const sealedFile = verdictFiles(undefined, /^draw-b-verdicts-(\d+)\.csv$/).at(-1);
  const sealed = sealedFile ? { ...sealedFile, ...drawResult(readFileSync(sealedFile.path, 'utf8'), relative(root, sealedFile.path)) } : null;
  return { latest, earlier: earlier.length ? { min: Math.min(...earlier), max: Math.max(...earlier) } : null, sealed };
}

const range = ({ min, max }) => (min === max ? `${min}` : `${min} to ${max}`);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const day = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
/** When the prices in use were read, from their listings' access dates: never refreshed, so the dates are the claim. */
export function pricesSampled(dates) {
  if (!dates.length) return 'no price has been sampled';
  if (dates.length === 1) return `prices were sampled once (${day(dates[0])})`;
  return `prices were sampled on ${WORDS[dates.length] ?? dates.length} days, from ${day(dates[0])} to ${day(dates.at(-1))}, and not refreshed since`;
}

/** The block, markers included. `counts` is statusCounts(db), `acc` is accuracy(), `date` the newest round's date (latestRound). */
/** Wrap a bullet to the README's 120 columns, its continuation lines indented under the dash. */
export function wrap(text, width = 120, indent = '  ') {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > width) { out.push(line); line = indent + word; } else line = line ? `${line} ${word}` : word;
  }
  return [...out, line].join('\n');
}

export function renderStatus(counts, acc, date) {
  const { materials: m, unknown: u } = counts;
  if (m.judged + m.excluded !== m.listed) throw new Error('the judged and excluded materials do not add up to the listed ones');
  const none = acc.latest.wrong === 0;
  const latest = none ? 'none with a wrong cell' : `${acc.latest.wrong} with a wrong cell`;
  const earlier = acc.earlier ? `; earlier samples found ${range(acc.earlier)}` : '';
  // The sealed sample of the records answers rest on (check round 3's Draw B), where one has been read.
  const sealed = acc.sealed ? ` A sealed sample of ${acc.sealed.sample} of the records the answers rest on, drawn before a round read anything and read after its corrections, found ${acc.sealed.wrong === 0 ? 'none' : acc.sealed.wrong} with a wrong cell${acc.sealed.deciding != null ? `, ${acc.sealed.deciding === 0 ? 'none' : acc.sealed.deciding} of them in a cell that can change an answer` : ''}.` : '';
  const edge = figure(u.nozzle) === figure(u.bed) && roundCount(u.nozzle).exact === roundCount(u.bed).exact
    ? `${figure(u.nozzle)} each` : `${about(u.nozzle)} for the nozzle and ${about(u.bed)} for the bed`;
  return [
    START,
    `<!-- Generated by npm run docs:status from dist/db.json and ${relative(root, acc.latest.path)}${acc.sealed ? ` and ${relative(root, acc.sealed.path)}` : ''}; edit scripts/docs-status.mjs, not this block. -->`,
    `## Where things stand (${date})`,
    '',
    'Exact, current counts are in [build/snapshot/counts.md](build/snapshot/counts.md), written by every build.',
    '',
    wrap(`- **What it holds.** ${capital(about(counts.products))} products, ${figure(counts.measurements)} measured values and ${figure(counts.sources)} source documents. The page lists ${m.listed} materials: the ${m.judged} the H2C can print, which the tool judges, and ${m.excluded} it shows only to say why they are out (high-temperature plastics such as PEEK and PEI that need a hotter printer, and metal or ceramic sintering filaments).`),
    wrap(`- **How accurate it is.** Records are checked by random samples read against their source pages. The latest, of ${acc.latest.sample} records, found ${latest}${earlier}, and each cause was fixed everywhere it occurred.${sealed} Every check so far was done by an AI; a person's spot-check is still to come.`),
    wrap(`- **What is still missing.** Makers rarely publish a heated-chamber temperature (unknown for ${about(u.chamber)} products), drying (${about(u.drying)}), or, for some products, the nozzle or bed temperature (${edge}). Several hundred products publish no strength, stiffness or heat-resistance value. Reading the documents already held again will not close these: they need documents that print the values, or the makers.`),
    wrap('- **What needs people, not code.** A person checking the values that decide answers, a trial with the team, and test prints.'),
    wrap(`- **What is limited on purpose.** New documents enter through the import pipeline (open again since 5 October 2026, when the owner lifted the pause of September); ${pricesSampled(counts.priceDates ?? [])}; team features (shared searches, an approved list, the team's own test results) come later.`),
    END,
  ].join('\n');
}

/** README text with its block replaced by `block`. */
export function replaceBlock(text, block) {
  const a = text.indexOf(START);
  const b = text.indexOf(END);
  if (a < 0 || b < a) throw new Error(`README.md has no ${START} ... ${END} pair`);
  return text.slice(0, a) + block + text.slice(b + END.length);
}

function loadDatabase() {
  const path = join(root, 'dist/db.json');
  if (!existsSync(path)) {
    console.log('dist/db.json is missing; building it first (npm run build).');
    const r = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
    if (r.status !== 0 || !existsSync(path)) { console.error('The build failed, so there is no database to count; fix it (npm run build) and run this again.'); process.exit(1); }
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const readme = join(root, 'README.md');
  const text = readFileSync(readme, 'utf8');
  const db = loadDatabase();
  const next = replaceBlock(text, renderStatus(statusCounts(db), accuracy(), latestRound()));
  if (process.argv.includes('--check')) {
    if (next !== text) { console.error('README.md "Where things stand" is out of date; run npm run docs:status'); process.exit(1); }
    console.log('README.md "Where things stand" is current');
  } else {
    writeFileSync(readme, next);
    console.log('README.md: "Where things stand" rewritten');
  }
}
