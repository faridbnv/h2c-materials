// Shared helpers for the work-package commands (WP-02): the index, the status files, the dependency check.
// Every command takes its root from H2C_WP_ROOT (tests point it at a scratch tree) or the repository root.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// True when the module is the script being run. Comparing against pathToFileURL keeps this working when the path
// has spaces or other characters that import.meta.url percent-encodes (a plain `file://${argv[1]}` compare silently
// runs nothing there, and a silent exit 0 is the wrong failure for wp:check).
export const isMain = (metaUrl) => Boolean(process.argv[1]) && metaUrl === pathToFileURL(process.argv[1]).href;

export const repoRoot = () => process.env.H2C_WP_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const indexPath = (root = repoRoot()) => join(root, 'remake', 'plan', 'wp-index.json');
export const statusPath = (id, root = repoRoot()) => join(root, 'remake', 'status', `${id}.json`);
export const attestPath = (root = repoRoot()) => join(root, 'remake', 'attest.csv');

export const STATUSES = ['todo', 'in-progress', 'in-review', 'waiting-owner', 'done', 'dropped'];
export const RESULTS = ['pass', 'fail', 'not-run'];
export const ATTEST_HEADER = 'date,key,detail,source';

export const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
export const writeJson = (p, v) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 2) + '\n'); };
export const loadIndex = (root = repoRoot()) => readJson(indexPath(root));

export function loadStatus(id, root = repoRoot()) {
  const p = statusPath(id, root);
  if (!existsSync(p)) throw new Error(`no status file for ${id} (${p})`);
  return readJson(p);
}
export const saveStatus = (s, root = repoRoot()) => writeJson(statusPath(s.id, root), { ...s, updated: new Date().toISOString() });

export function loadAllStatus(root = repoRoot()) {
  const dir = join(root, 'remake', 'status');
  const out = {};
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir).filter((f) => /^WP-.+\.json$/.test(f))) { const s = readJson(join(dir, f)); out[s.id] = s; }
  return out;
}

// Problems with the index: duplicate ids, unknown dependencies, dependencies on a dropped package, cycles.
export function checkDeps(packages) {
  const problems = [];
  const byId = new Map();
  for (const p of packages) {
    if (byId.has(p.id)) problems.push(`duplicate id ${p.id}`);
    byId.set(p.id, p);
  }
  for (const p of packages) {
    for (const d of p.dependsOn ?? []) {
      if (!byId.has(d)) problems.push(`${p.id} depends on unknown ${d}`);
      else if (byId.get(d).dropped && !p.dropped) problems.push(`${p.id} depends on dropped ${d}`);
    }
  }
  const state = new Map(); // 1 = on the current path, 2 = finished
  const walk = (id, path) => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) { problems.push(`cycle: ${[...path.slice(path.indexOf(id)), id].join(' -> ')}`); return; }
    state.set(id, 1);
    for (const d of byId.get(id)?.dependsOn ?? []) if (byId.has(d)) walk(d, [...path, id]);
    state.set(id, 2);
  };
  for (const p of packages) walk(p.id, []);
  return problems;
}

const isDone = (st) => st?.status === 'done' || st?.status === 'dropped';

// next: every dependency done. soon: every dependency done, in review or waiting on the owner (can be prepared, not merged onto).
export function dispatchable(index, statuses) {
  const next = [], soon = [];
  for (const p of index.packages) {
    if (p.dropped || (statuses[p.id]?.status ?? 'todo') !== 'todo') continue;
    const deps = (p.dependsOn ?? []).map((d) => statuses[d]);
    if (deps.every(isDone)) next.push(p.id);
    else if (deps.every((s) => isDone(s) || s?.status === 'in-review' || s?.status === 'waiting-owner')) soon.push(p.id);
  }
  return { next, soon };
}

// Waiting on the owner: the status says so, or the package has waited since a date; either way an approvedAt date ends it.
export const waitingOnOwner = (statuses) =>
  Object.values(statuses).filter((s) => !s.approvedAt && (s.status === 'waiting-owner' || (s.waitingSince && !['dropped', 'done'].includes(s.status))));

// The packages a pull request delivers: every status file that names the PR number (pr, or prs when several PRs built it), plus the one the branch name points
// to (wp-S0-..., wp-07-...). One PR may deliver several packages (#6 delivered WP-01 and WP-S0), and an approval of the
// PR approves them all.
export function deliveredBy(statuses, { pr, branch }) {
  const byBranch = /^wp-(S0|\d\d)/i.exec(branch ?? '');
  const ids = new Set(Object.values(statuses).filter((s) => pr != null && [s.pr, ...(s.prs ?? [])].some((n) => Number(n) === Number(pr))).map((s) => s.id));
  if (byBranch && statuses[`WP-${byBranch[1].toUpperCase()}`]) ids.add(`WP-${byBranch[1].toUpperCase()}`);
  return [...ids].sort();
}

export const days = (from, to = Date.now()) => Math.max(0, (to - Date.parse(from)) / 86_400_000);

// One CSV record, quoting only where needed.
export const csvLine = (fields) => fields.map((f) => (/[",\n]/.test(f) ? `"${String(f).replaceAll('"', '""')}"` : String(f))).join(',');

export function appendAttest(row, root = repoRoot()) {
  const p = attestPath(root);
  if (!existsSync(p)) writeFileSync(p, ATTEST_HEADER + '\n');
  appendFileSync(p, csvLine(row) + '\n');
}

// The keys that have a row in attest.csv.
export function attestedKeys(root = repoRoot()) {
  const p = attestPath(root);
  if (!existsSync(p)) return new Set();
  return new Set(readFileSync(p, 'utf8').split('\n').slice(1).filter(Boolean).map((l) => l.split(',')[1]));
}
