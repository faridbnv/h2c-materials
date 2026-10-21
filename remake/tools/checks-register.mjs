#!/usr/bin/env node
// The check register and the must-not-change map (WP-15; pack 07 section 4, pack 06 section 3).
//
//   npm run checks:register -- --verify       fail on any of the problems listed below (exit 1); exit 0 when there are none
//   npm run checks:register -- --inventory    print the checks the tree holds today, in checks/old-inventory.txt's format
//   npm run checks:register -- --skeleton     print empty register rows for checks the register does not cover yet
//   --root DIR                                 read another checkout (the tests use a scratch copy)
//
// No check disappears without a named successor and proof (ADR-15 point 4). The register is checks/register.csv: one row per
// old check or gate, and one per new check. A check is named by a TOKEN:
//   file:<path>                         a test, a script or a hook (a path in the repository)
//   step:<name>                         a step of scripts/verify.mjs or scripts/verify-fast.mjs
//   npm:<script>                        a package.json script
//   ci:<workflow>/<job>[/<step name>]   a job or a named step of .github/workflows/<workflow>
// checks/old-inventory.txt freezes the old checks (tokens, and for each test file its test count and skip count). It is
// code-owned: changing it needs the owner's review. --verify fails when:
//   1. a register row names a token that no longer exists (unless the row records its deletion in `deleted`, after cutover);
//   2. a token of the frozen inventory has no register row (an old check vanished without a successor row);
//   3. a check the tree holds today has no register row;
//   4. an old test file lost tests or gained a skip or todo marker since the freeze, or a registered new test file is skipped
//      outright (a conditional skip, such as `{ skip: !process.env.X }`, is allowed);
//   5. a row is malformed: unknown status, no successor, no proof, an owner that is not a work package;
//   6. the must-not-change map (docs/next/must-not-change.md) lacks an item, names a test that does not exist or is not
//      registered, claims a parity tier that is not built, or has an item with neither a test nor an UNTESTED mark;
//   7. the map and the register disagree about which check pins which item (`protects`);
//   8. the owner's list (docs/next/untested-rules.md) and the map disagree about which items are not fully tested.
// Nothing here retires a check: a "retire" row takes effect when WP-38 deletes the check and records the date.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from './rulings-check.mjs';
import { csvLine, isMain, loadIndex, repoRoot } from './wp-lib.mjs';

export const REGISTER_PATH = 'checks/register.csv';
export const BASELINE_PATH = 'checks/old-inventory.txt';
export const MAP_PATH = 'docs/next/must-not-change.md';
export const UNTESTED_PATH = 'docs/next/untested-rules.md';

export const COLUMNS = ['id', 'old', 'protected_failure', 'status', 'successor', 'proof', 'owner', 'kind', 'old_refs', 'successor_refs', 'protects', 'deleted'];
export const STATUSES = ['keep', 're-point', 'successor', 'obsolete-at-cutover'];
export const KINDS = ['test', 'gate', 'ci', 'script', 'new'];
export const MAP_STATUSES = ['TESTED', 'PARTIAL', 'UNTESTED'];
// Parity tiers that run today (docs/next/parity-contract.md). The others are named in the map's notes until their package lands.
export const BUILT_TIERS = ['P-engine', 'P-erase'];
// The items of 00-CURRENT-STATE section 11 (14 rows) and the 06 must-not-change list (24 rows).
export const MAP_IDS = [
  ...Array.from({ length: 14 }, (_, i) => `S11-${String(i + 1).padStart(2, '0')}`),
  ...Array.from({ length: 24 }, (_, i) => `S06-${String(i + 1).padStart(2, '0')}`),
];

const RUNNERS = ['scripts/verify.mjs', 'scripts/verify-fast.mjs'];
const FIXED_FILES = [...RUNNERS, '.githooks/pre-commit'];
const WORKFLOW_DIR = '.github/workflows';
const OLD_WORKFLOWS = ['verify.yml', 'pages.yml'];
const SETUP_STEP = /^(Install|Start from)\b|\$\{\{/;
const CHECK_SCRIPT = /^(verify|verify:fast|test|test:ingest|snapshot|build:diff|pages:check|scale|scale:budget|reproducible|data:check|data:lint|data:fmt|bench|trace|packets|round:close|doctor|ui:.+|audit:.+|docs:.+)$/;
const TEST_FILE = /^test\/[^/]+\.(test|check)\.js$/;
const TOKEN = /^(file|step|npm|ci):\S.*$/;
const STEP_RE = /^\s*\['([a-z][a-z ]*)',\s*(?:'npm'|\.\.\.node\()/gm;

const read = (root, path) => readFileSync(join(root, path), 'utf8');
const present = (root, path) => existsSync(join(root, path));
function walk(root, dir) {
  if (!present(root, dir)) return [];
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${dir}/${e.name}`) : [`${dir}/${e.name}`]));
}

const splitToken = (token) => {
  const colon = token.indexOf(':');
  return [token.slice(0, colon), token.slice(colon + 1)];
};
const filePath = (token) => token.slice('file:'.length);
const splitList = (cell, separator = ';') => cell.split(separator).map((s) => s.trim()).filter(Boolean);

export const testCount = (src) => (src.match(/^\s*(?:test|it)(?:\.\w+)?\(/gm) ?? []).length;
export const skipCount = (src) => (src.match(/[{,]\s*(?:skip|todo)\s*:|\.(?:skip|todo)\(/g) ?? []).length;
// For a test file the freeze never saw: a skip that always applies. `{ skip: !process.env.X }` is a condition, not a skip.
export const standingSkipCount = (src) => (src.match(/\.(?:skip|todo)\(|[{,]\s*(?:skip|todo)\s*:\s*(?:true\b|['"`])/g) ?? []).length;
const testStats = (src) => ({ tests: testCount(src), skips: skipCount(src) });

function parseWorkflow(text) {
  const jobs = new Map();
  let inJobs = false, job = null;
  for (const line of text.split(/\r?\n/)) {
    if (/^jobs:\s*$/.test(line)) { inJobs = true; continue; }
    if (!inJobs || line.startsWith('#') || line.trim() === '') continue;
    if (/^\S/.test(line)) { inJobs = false; continue; }
    const jobMatch = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (jobMatch) { job = jobMatch[1]; jobs.set(job, new Set()); continue; }
    const stepMatch = line.match(/^ {6}- name:\s*(.+?)\s*$/);
    if (stepMatch && job) jobs.get(job).add(stepMatch[1].replace(/^(['"])(.*)\1$/, '$2'));
  }
  return jobs;
}

/** Every token that exists in the tree now, mapped to its attributes: { tests, skips } for a test file. */
export function allTokens(root) {
  const tokens = new Map();
  for (const f of walk(root, 'test')) tokens.set(`file:${f}`, TEST_FILE.test(f) ? testStats(read(root, f)) : {});
  for (const f of FIXED_FILES) if (present(root, f)) tokens.set(`file:${f}`, {});
  for (const f of RUNNERS) {
    if (present(root, f)) for (const m of read(root, f).matchAll(STEP_RE)) tokens.set(`step:${m[1]}`, {});
  }
  const scripts = present(root, 'package.json') ? JSON.parse(read(root, 'package.json')).scripts ?? {} : {};
  for (const name of Object.keys(scripts)) tokens.set(`npm:${name}`, {});
  const workflows = present(root, WORKFLOW_DIR) ? readdirSync(join(root, WORKFLOW_DIR)).filter((f) => /\.ya?ml$/.test(f)) : [];
  for (const wf of workflows) {
    for (const [job, steps] of parseWorkflow(read(root, `${WORKFLOW_DIR}/${wf}`))) {
      tokens.set(`ci:${wf}/${job}`, {});
      for (const step of steps) tokens.set(`ci:${wf}/${job}/${step}`, {});
    }
  }
  return tokens;
}

function isOldCheck(token) {
  const [kind, value] = splitToken(token);
  switch (kind) {
    case 'file': return value.startsWith('test/') || FIXED_FILES.includes(value);
    case 'step': return true;
    case 'npm': return CHECK_SCRIPT.test(value);
    case 'ci': return OLD_WORKFLOWS.some((w) => value.startsWith(`${w}/`)) && !SETUP_STEP.test(value.split('/').slice(2).join('/'));
    default: return false;
  }
}

/** The old checks the tree holds today: the tokens an old-check row must cover. */
export function liveInventory(root, tokens = allTokens(root)) {
  return new Map([...tokens].filter(([token]) => isOldCheck(token)).sort(([a], [b]) => (a < b ? -1 : 1)));
}

export const formatBaseline = (inventory) => [
  '# The old checks, frozen. One token per line; a test file also records its test count and skip count (checks:register).',
  '# Code-owned: a change here needs the owner\'s review. Regenerate only to add checks: npm run checks:register -- --inventory',
  ...[...inventory].map(([token, a]) => (a.tests === undefined ? token : `${token} tests=${a.tests} skips=${a.skips}`)),
].join('\n') + '\n';

export function parseBaseline(text) {
  const baseline = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    const m = line.match(/^(\S.*?)(?: tests=(\d+) skips=(\d+))?$/);
    baseline.set(m[1], m[2] === undefined ? {} : { tests: Number(m[2]), skips: Number(m[3]) });
  }
  return baseline;
}

const tokenOfMapRef = (ref) => (/^P-[a-z]+$/i.test(ref) || TOKEN.test(ref) ? ref : `file:${ref}`);
const mapRefs = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => tokenOfMapRef(m[1].trim()));

function loadRows(root, add) {
  if (!present(root, REGISTER_PATH)) { add(`${REGISTER_PATH} does not exist`); return []; }
  const [header, ...raw] = parseCsv(read(root, REGISTER_PATH));
  if (header?.join(',') !== COLUMNS.join(',')) { add(`${REGISTER_PATH}: header must be ${COLUMNS.join(',')}`); return []; }
  const wps = new Set(loadIndex(root).packages.map((p) => p.id));
  const seen = new Set();
  return raw.map((fields, i) => {
    const line = i + 2;
    if (fields.length !== COLUMNS.length) { add(`${REGISTER_PATH} line ${line}: ${fields.length} fields, expected ${COLUMNS.length}`); return null; }
    const row = Object.fromEntries(COLUMNS.map((c, j) => [c, fields[j].trim()]));
    const oldRefs = splitList(row.old_refs);
    const successorRefs = splitList(row.successor_refs);
    const protectsIds = splitList(row.protects);
    const at = `register row ${row.id || `at line ${line}`}`;
    if (!row.id) add(`${at}: empty id`);
    if (seen.has(row.id)) add(`${at}: duplicate id`);
    seen.add(row.id);
    if (!STATUSES.includes(row.status)) add(`${at}: status "${row.status}" is not one of ${STATUSES.join(', ')}`);
    if (!KINDS.includes(row.kind)) add(`${at}: kind "${row.kind}" is not one of ${KINDS.join(', ')}`);
    for (const c of ['old', 'protected_failure', 'successor', 'proof', 'owner', 'old_refs']) if (!row[c]) add(`${at}: ${c} is empty (no check goes without a named successor and proof)`);
    for (const w of splitList(row.owner, /[;,]/)) if (!wps.has(w)) add(`${at}: owner "${w}" is not a work package in remake/plan/wp-index.json`);
    for (const t of [...oldRefs, ...successorRefs]) if (!TOKEN.test(t)) add(`${at}: "${t}" is not a token (file:, step:, npm:, ci:)`);
    for (const p of protectsIds) if (!MAP_IDS.includes(p)) add(`${at}: protects "${p}", which is not an item of the must-not-change map`);
    if (row.deleted && !/^\d{4}-\d{2}-\d{2}$/.test(row.deleted)) add(`${at}: deleted must be a date (YYYY-MM-DD)`);
    if (row.deleted && !['successor', 'obsolete-at-cutover'].includes(row.status)) add(`${at}: a deleted check is a successor or obsolete-at-cutover row, not ${row.status}`);
    return { ...row, oldRefs, successorRefs, protectsIds };
  }).filter(Boolean);
}

/** Whether a token names something that exists: a listed token, or any file in the checkout. */
const existsIn = (root, now) => (t) => now.has(t) || (t.startsWith('file:') && present(root, filePath(t)));

function checkTokens(rows, exists, add) {
  for (const row of rows) {
    for (const t of row.oldRefs) {
      if (row.deleted && exists(t)) add(`register row ${row.id}: marked deleted on ${row.deleted}, but ${t} still exists`);
      if (!row.deleted && !exists(t)) add(`register row ${row.id}: names ${t}, which no longer exists (a deleted check keeps its row, with a successor and a deleted date)`);
    }
    for (const t of row.successorRefs) if (!exists(t)) add(`register row ${row.id}: its successor ${t} does not exist`);
  }
}

function checkCoverage(root, rows, now, exists, live, baseline, add) {
  const registered = new Set(rows.flatMap((r) => r.oldRefs));
  for (const t of baseline.keys()) if (!registered.has(t)) add(`an old check vanished without a register row: ${t} (it is in ${BASELINE_PATH}, so it needs a row with a successor and proof)`);
  for (const t of live.keys()) if (!registered.has(t)) add(`no register row for ${t} (npm run checks:register -- --skeleton prints one)`);
  const deleted = new Set(rows.filter((r) => r.deleted).flatMap((r) => r.oldRefs));
  for (const [t, was] of baseline) {
    if (was.tests === undefined || deleted.has(t) || !now.has(t)) continue;
    const is = now.get(t);
    if (is.tests < was.tests) add(`${t} lost tests: ${was.tests} at the freeze, ${is.tests} now`);
    if (is.skips > was.skips) add(`${t} gained skip or todo markers: ${was.skips} at the freeze, ${is.skips} now`);
  }
  for (const row of rows) for (const t of row.oldRefs) {
    if (row.kind === 'new' && exists(t) && /^file:tests?\/.+\.test\.mjs$/.test(t) && standingSkipCount(read(root, filePath(t))) > 0) add(`${t} (register row ${row.id}) is skipped: it has a skip or todo marker that always applies`);
  }
}

function parseMap(root, add) {
  if (!present(root, MAP_PATH)) { add(`${MAP_PATH} does not exist`); return []; }
  const items = [];
  for (const line of read(root, MAP_PATH).split(/\r?\n/)) {
    if (!line.startsWith('| S')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    const [id, rule, decisions, oldSuite, newSuite, status, note] = cells;
    if (!/^S(11|06)-\d\d$/.test(id)) continue;
    if (cells.length !== 7) { add(`${MAP_PATH}: ${id} has ${cells.length} cells, expected 7 (id, rule, decisions, old suite, new suite and parity, status, gap or note)`); continue; }
    items.push({ id, rule, decisions, status, note, refs: [...mapRefs(oldSuite), ...mapRefs(newSuite)] });
  }
  return items;
}

function checkMap(items, rows, exists, add) {
  const ids = items.map((i) => i.id);
  for (const id of MAP_IDS) if (!ids.includes(id)) add(`${MAP_PATH}: item ${id} is missing`);
  for (const id of new Set(ids)) if (ids.filter((x) => x === id).length > 1) add(`${MAP_PATH}: item ${id} appears twice`);
  for (const item of items) {
    const at = `${MAP_PATH} ${item.id}`;
    if (!item.rule || !item.decisions) add(`${at}: rule or decisions is empty`);
    if (!MAP_STATUSES.includes(item.status)) { add(`${at}: status "${item.status}" is not one of ${MAP_STATUSES.join(', ')}`); continue; }
    for (const ref of item.refs) {
      if (/^P-/i.test(ref)) { if (!BUILT_TIERS.includes(ref)) add(`${at}: parity tier ${ref} is not built yet (built: ${BUILT_TIERS.join(', ')}); name a tier that is not built in the note, without backticks`); continue; }
      if (!exists(ref)) { add(`${at}: names ${ref}, which does not exist`); continue; }
      const holders = rows.filter((r) => r.oldRefs.includes(ref));
      if (!holders.length) add(`${at}: ${ref} is not in the check register`);
      else if (!holders.some((r) => r.protectsIds.includes(item.id))) add(`${at}: ${ref} is in the register (${holders.map((r) => r.id).join(', ')}) without ${item.id} in its protects column`);
    }
    if (item.status === 'UNTESTED' && item.refs.length) add(`${at}: marked UNTESTED but names ${item.refs.join(', ')}`);
    if (item.status !== 'UNTESTED' && !item.refs.length) add(`${at}: marked ${item.status} but names no test or parity tier (mark it UNTESTED, explicitly)`);
    if (item.status !== 'TESTED' && !item.note) add(`${at}: marked ${item.status} without saying what is not covered`);
  }
  for (const row of rows) for (const id of row.protectsIds) {
    const item = items.find((i) => i.id === id);
    if (item && !item.refs.some((ref) => row.oldRefs.includes(ref))) add(`register row ${row.id} says it protects ${id}, but the map does not name it`);
  }
}

function checkUntestedList(root, items, add) {
  if (!present(root, UNTESTED_PATH)) { add(`${UNTESTED_PATH} does not exist`); return; }
  const listed = read(root, UNTESTED_PATH).split(/\r?\n/).filter((l) => l.startsWith('### ')).flatMap((l) => l.match(/S(?:11|06)-\d\d/g) ?? []);
  const open = items.filter((i) => i.status !== 'TESTED').map((i) => i.id);
  for (const id of open) if (!listed.includes(id)) add(`${UNTESTED_PATH}: ${id} is ${items.find((i) => i.id === id).status} in the map but not on the owner's list`);
  for (const id of listed) if (!open.includes(id)) add(`${UNTESTED_PATH}: lists ${id}, which the map does not mark PARTIAL or UNTESTED`);
}

/** Every problem with the register, the baseline, the map and the owner's list; an empty array when there are none. */
export function verifyRegister(root = repoRoot()) {
  const problems = [];
  const add = (m) => problems.push(m);
  const now = allTokens(root);
  const live = liveInventory(root, now);
  const exists = existsIn(root, now);
  const rows = loadRows(root, add);
  checkTokens(rows, exists, add);
  if (!present(root, BASELINE_PATH)) add(`${BASELINE_PATH} does not exist`);
  else checkCoverage(root, rows, now, exists, live, parseBaseline(read(root, BASELINE_PATH)), add);
  const items = parseMap(root, add);
  checkMap(items, rows, exists, add);
  checkUntestedList(root, items, add);
  const counts = Object.fromEntries(MAP_STATUSES.map((s) => [s, items.filter((i) => i.status === s).length]));
  return { problems, rows: rows.length, tokens: live.size, items: items.length, counts };
}

const SKELETON_ID = { file: 'T', step: 'S', npm: 'A', ci: 'J' };
export function skeleton(root) {
  const registerRows = present(root, REGISTER_PATH) ? parseCsv(read(root, REGISTER_PATH)).slice(1) : [];
  const registered = new Set(registerRows.flatMap((fields) => splitList(fields[COLUMNS.indexOf('old_refs')] ?? '')));
  const lines = [];
  for (const token of liveInventory(root).keys()) {
    if (registered.has(token)) continue;
    const [kind, value] = splitToken(token);
    const name = value.replace(/^test\//, '').replace(/\.(test|check)\.js$/, '').replace(/[^A-Za-z0-9]+/g, '-');
    lines.push(csvLine([`${SKELETON_ID[kind]}-${name}`, value, '', '', '', '', '', kind === 'file' && value.startsWith('test/') ? 'test' : 'gate', token, '', '', '']));
  }
  return lines;
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--root');
  const root = at >= 0 ? args[at + 1] : repoRoot();
  const mode = args.filter((a) => a !== '--root' && a !== root);
  if (mode.length !== 1 || !['--verify', '--inventory', '--skeleton'].includes(mode[0])) {
    console.error('usage: checks-register.mjs --verify | --inventory | --skeleton [--root DIR]');
    process.exit(2);
  }
  if (mode[0] === '--inventory') process.stdout.write(formatBaseline(liveInventory(root)));
  else if (mode[0] === '--skeleton') for (const l of skeleton(root)) console.log(l);
  else {
    const { problems, rows, tokens, items, counts } = verifyRegister(root);
    for (const p of problems) console.error(`checks:register: ${p}`);
    if (problems.length) { console.error(`checks:register: ${problems.length} problem(s)`); process.exit(1); }
    console.log(`checks:register: OK. ${rows} register rows cover ${tokens} old checks; ${items} must-not-change items: ${counts.TESTED} TESTED, ${counts.PARTIAL} PARTIAL, ${counts.UNTESTED} UNTESTED.`);
  }
}
