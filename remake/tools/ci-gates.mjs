#!/usr/bin/env node
// The decisions of next-verify.yml as pure functions, so they are unit tested (tests/remake/ci.test.mjs) and the workflow
// only feeds them data. WP-03; pack 08 section 4.4 (tiers), pack 07 section 8.
//
//   node remake/tools/ci-gates.mjs old-paths      --files changed.txt
//   node remake/tools/ci-gates.mjs review-section --files changed.txt --body-env PR_BODY
//   node remake/tools/ci-gates.mjs tier           --files changed.txt --scopes-dir DIR --pr N --head SHA --owner LOGIN
//                                                 --comments comments.json
// changed.txt: one repository path per line (renames list both names). comments.json: the PR's issue comments as the
// GitHub API returns them (an array of {user:{login}, body}). Exit 0 = gate passes, 1 = gate fails, 2 = bad input.
// Every failure path is loud: an unreadable or empty input fails the gate, it never passes it.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isMain } from './wp-lib.mjs';

// The old code and data: the frozen comparison baseline. Main is frozen (Q2-04 B), so there is no exception.
export const OLD_PATH_PREFIXES = ['data/', 'schema/', 'app/', 'build/', 'scripts/', 'test/', 'archive/'];
export const OLD_PATH_FILES = ['.github/workflows/pages.yml', '.github/workflows/verify.yml'];

// Paths that can change an answer or a ruling. A PR touching one is never Tier 0, whatever a scope file says.
export const SCIENCE_GLOBS = [
  'packages/domain/**', 'packages/engine/**', 'packages/build/**', 'packages/estimate/**', 'packages/constraints/**',
  'packages/rules/**', 'parity/transitions/**', 'parity/corpus/**', 'parity/expectations/**', 'docs/next/rulings.csv',
  'data/**', 'schema/**',
];
// Paths that decide who may merge what. A PR touching one is never Tier 0, so a PR cannot widen its own approval.
export const GOVERNANCE_GLOBS = [
  '.github/**', 'remake/scopes/**', 'remake/tools/**', 'tests/remake/**', '.claude/**',
  'CLAUDE.md', 'AGENTS.md', '.nvmrc', '.npmrc', '.gitmodules', 'package.json', 'package-lock.json',
];
// A PR touching one of these must carry the "Review findings and disposition" section (pack 08 section 3).
export const REVIEW_SECTION_GLOBS = ['packages/parity/**', 'packages/data/**', 'remake/tools/wp-*', '.github/**'];
export const REVIEW_SECTION_TITLE = 'Review findings and disposition';

export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') { re += '.*'; i++; if (glob[i + 1] === '/') i++; } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}
export const matchesAny = (path, globs) => globs.some((g) => globToRegExp(g).test(path));
const cleanPath = (p) => p.trim().replace(/^\.\//, '');
// A path with ".." or a leading "/" is not a repository path; refuse rather than guess what it matches.
// "_base/" is where the workflows put the base checkout; a PR file there could shadow the trusted gate.
const suspicious = (p) => p.startsWith('/') || p.split('/').includes('..') || p.startsWith('_base/') || /[\x00-\x1f]/.test(p);

export function parseChangedFiles(text) {
  const files = text.split(/\r?\n/).map(cleanPath).filter(Boolean);
  if (files.length === 0) throw new Error('the changed-file list is empty: refusing to pass a gate on no data');
  return [...new Set(files)];
}

export function oldPathViolations(paths) {
  return paths.filter((p) => OLD_PATH_PREFIXES.some((x) => p.startsWith(x)) || OLD_PATH_FILES.includes(p));
}

export const needsReviewSection = (paths) => paths.some((p) => matchesAny(p, REVIEW_SECTION_GLOBS));
export const hasReviewSection = (body) => typeof body === 'string' && body.includes(REVIEW_SECTION_TITLE);

// A scope file: {wp, approvedBy:"owner", parity:"none", paths:[globs]}. Only approvedBy === "owner" counts, and the caller
// reads scope files from the BASE branch, so a PR cannot approve its own scope.
export function approvedScopes(scopes) {
  return scopes.filter((s) => s && s.approvedBy === 'owner' && Array.isArray(s.paths) && s.paths.length > 0);
}

export function loadScopes(dir) {
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /^WP-[\w-]+\.json$/.test(f)).map((f) => {
    const s = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    return { ...s, file: f };
  });
}

// Pack 08 section 4.4. Tier 0 needs: no suspicious path, no science path, no governance path, and every changed path inside
// ONE approved scope. The parity condition ("exactly zero, or no parity surface") cannot be measured yet (no parity driver
// on this branch): until it can, a scope must declare parity "none"; anything else is Tier 1 with that reason.
export function classifyTier(paths, scopes) {
  const reasons = [];
  const bad = paths.filter(suspicious);
  if (bad.length) reasons.push(`not repository paths: ${bad.join(', ')}`);
  const science = paths.filter((p) => matchesAny(p, SCIENCE_GLOBS));
  if (science.length) reasons.push(`science path touched: ${science.slice(0, 5).join(', ')}${science.length > 5 ? ', ...' : ''}`);
  const governance = paths.filter((p) => matchesAny(p, GOVERNANCE_GLOBS));
  if (governance.length) reasons.push(`governance path touched (workflows, scopes, gate code, agent rules, Node pin): ${governance.slice(0, 5).join(', ')}${governance.length > 5 ? ', ...' : ''}`);
  const approved = approvedScopes(scopes);
  if (approved.length === 0) reasons.push('no approved scope file (remake/scopes/WP-NN.json with "approvedBy":"owner") on the base branch');
  let scope = null;
  if (approved.length && !bad.length) {
    scope = approved.find((s) => paths.every((p) => matchesAny(p, s.paths))) ?? null;
    if (!scope) {
      const best = approved.map((s) => ({ s, out: paths.filter((p) => !matchesAny(p, s.paths)) })).sort((a, b) => a.out.length - b.out.length)[0];
      reasons.push(`not every changed path is inside one approved scope; outside ${best.s.file ?? best.s.wp}: ${best.out.slice(0, 5).join(', ')}${best.out.length > 5 ? ', ...' : ''}`);
    } else if (scope.parity !== 'none') {
      reasons.push(`scope ${scope.file ?? scope.wp} declares parity "${scope.parity ?? 'unset'}": the parity-zero condition is not measurable on this branch yet (parity: not run)`);
      scope = null;
    }
  }
  return reasons.length === 0 && scope
    ? { tier: 0, scope: scope.file ?? scope.wp, reasons: [`every changed path is inside approved scope ${scope.file ?? scope.wp}; no science or governance path; parity: not applicable (scope declares none)`] }
    : { tier: 1, scope: null, reasons };
}

// The exact comment wp-attest.mjs posts: `wp:attest approve <PR> <headSHA>`, from the repository owner's account.
export function attestText(pr, headSha) { return `wp:attest approve ${pr} ${headSha}`; }
export function findAttest(comments, { owner, pr, headSha }) {
  if (!/^[0-9a-f]{40}$/i.test(headSha ?? '')) throw new Error(`head SHA is not 40 hex characters: "${headSha}"`);
  if (!/^\d+$/.test(String(pr))) throw new Error(`PR number is not a number: "${pr}"`);
  if (!owner) throw new Error('repository owner login missing');
  const want = attestText(pr, headSha.toLowerCase());
  return comments.find((c) => c?.user?.login?.toLowerCase() === owner.toLowerCase()
    && typeof c.body === 'string' && c.body.trim().toLowerCase() === want) ?? null;
}
// A comment naming another SHA from the owner: used only to give a precise failure message ("stale attest").
export function findStaleAttest(comments, { owner, pr }) {
  const re = new RegExp(`^wp:attest approve ${pr} [0-9a-f]{40}$`, 'i');
  return comments.filter((c) => c?.user?.login?.toLowerCase() === owner.toLowerCase() && re.test((c.body ?? '').trim()));
}

export function tierGate({ paths, scopes, comments, owner, pr, headSha }) {
  const t = classifyTier(paths, scopes);
  if (t.tier === 0) return { pass: true, tier: 0, lines: [`Tier 0: ${t.reasons[0]}`] };
  // Owner ruling 2026-10-21: no manual PR approval except changes that move a science answer or a ruling (Q2-19).
  const OWNER_GLOBS = ['parity/transitions/**', 'parity/expectations/**', 'docs/next/rulings.csv', 'data/**', 'schema/**'];
  if (!paths.some((p) => matchesAny(p, OWNER_GLOBS))) return { pass: true, tier: 1, lines: [`Tier 1: ${t.reasons.join('; ')}`, 'no answer-moving path: merges on green checks (owner ruling 2026-10-21)'] };
  const lines = [`Tier 1 (owner review): ${t.reasons.join('; ')}`];
  const hit = findAttest(comments, { owner, pr, headSha });
  if (hit) return { pass: true, tier: 1, lines: [...lines, `owner attest found for ${headSha}`] };
  const stale = findStaleAttest(comments, { owner, pr });
  lines.push(stale.length
    ? `FAIL: the owner's attest comment(s) name an older commit (${stale.map((c) => c.body.trim().split(' ').pop().slice(0, 8)).join(', ')}), not the current head ${headSha.slice(0, 8)}. Run npm run wp:attest -- approve ${pr} again, then re-run this check.`
    : `FAIL: no owner comment "${attestText(pr, headSha)}". The owner runs npm run wp:attest -- approve ${pr} in their own terminal, then re-runs this check.`);
  return { pass: false, tier: 1, lines };
}

const argValue = (argv, name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const need = (v, name) => { if (!v) throw new Error(`missing ${name}`); return v; };

export function cli(argv, env = process.env) {
  const [cmd] = argv;
  const paths = parseChangedFiles(readFileSync(need(argValue(argv, '--files'), '--files'), 'utf8'));
  if (cmd === 'old-paths') {
    const v = oldPathViolations(paths);
    if (v.length) { console.log(`FAIL: this PR changes the frozen old paths (main is frozen; the old code and data are the comparison baseline):\n${v.map((p) => `  ${p}`).join('\n')}`); return 1; }
    console.log(`old-paths: ${paths.length} changed path(s), none in data/ schema/ app/ build/ scripts/ test/ archive/ or the old workflows.`);
    return 0;
  }
  if (cmd === 'review-section') {
    const body = env[need(argValue(argv, '--body-env'), '--body-env')] ?? '';
    if (!needsReviewSection(paths)) { console.log('review-section: not required (no packages/parity, packages/data, remake/tools/wp-* or .github path changed).'); return 0; }
    if (hasReviewSection(body)) { console.log(`review-section: present ("${REVIEW_SECTION_TITLE}").`); return 0; }
    console.log(`FAIL: this PR touches a path that needs a "${REVIEW_SECTION_TITLE}" section in its description (pack 08 section 3), and it has none.`);
    return 1;
  }
  if (cmd === 'tier') {
    const comments = JSON.parse(readFileSync(need(argValue(argv, '--comments'), '--comments'), 'utf8'));
    if (!Array.isArray(comments)) throw new Error('comments.json is not an array');
    const r = tierGate({
      paths, comments, scopes: loadScopes(argValue(argv, '--scopes-dir')),
      owner: need(argValue(argv, '--owner'), '--owner'), pr: need(argValue(argv, '--pr'), '--pr'), headSha: need(argValue(argv, '--head'), '--head'),
    });
    r.lines.forEach((l) => console.log(l));
    console.log('parity: not run (no parity driver on this branch yet)');
    return r.pass ? 0 : 1;
  }
  throw new Error(`unknown command "${cmd}" (old-paths | review-section | tier)`);
}

if (isMain(import.meta.url)) {
  try { process.exitCode = cli(process.argv.slice(2)); } catch (e) { console.error(`ci-gates failed: ${e.message}`); process.exitCode = 2; }
}
