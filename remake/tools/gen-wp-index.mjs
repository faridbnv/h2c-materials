#!/usr/bin/env node
// One-off generator (WP-02): copies the work-package index from the pack's 08-ROADMAP-AND-WORK-PACKAGES.md section 3
// into remake/plan/wp-index.json and seeds one remake/status/WP-NN.json per package.
// Usage: node remake/tools/gen-wp-index.mjs <path to 08-ROADMAP-AND-WORK-PACKAGES.md> [--seed-status]
// Re-running without --seed-status rewrites only the index. Seeding never overwrites an existing status file.
import { readFileSync, existsSync } from 'node:fs';
import { writeJson, statusPath, indexPath, checkDeps, isMain } from './wp-lib.mjs';

// Owner answers that change the recipe (2026-10-21).
const DROPPED = {
  'WP-04': { reason: 'dropped: main frozen, Q2-04 B', replacement: null },
  'WP-12': { reason: 'dropped: Q2-06 C', replacement: 'WP-11' }, // framework is Vue, no trial; dependents wait on WP-11 instead
};

// What `npm run wp:check -- WP-NN` runs (commands), and the owner records it needs (attest keys, in remake/attest.csv).
// `manual` lines are exit evidence that no command checks yet; they are listed, and a package with any manual line
// or missing attest key can never record a pass.
const EXIT = {
  'WP-S0': { commands: ['npm run test:claude', 'gh api repos/faridbnv/h2c-materials/branches/remake/v3/protection --silent'], manual: ['14 section E checks'] },
  'WP-01': { commands: ['npm run rulings:check'], manual: ['GOALS-NEXT has the owner\'s dated words (the Q2-09 pointer PR is not made: Q2-09 B)'] },
  'WP-02': { commands: ['npm run -s wp:deps', 'node --test tests/remake/*.test.mjs tests/claude/hooks.test.mjs'], manual: ['a setup-script worktree passes npm run doctor'] },
  'WP-03': { commands: [], manual: ['preview smoke green', 'preview.json names the commit', 'scratch PR on app/ fails', 'PR jobs cannot read the deploy key'] },
  'WP-05': { commands: ['npm run parity -- --noop'], manual: ['a seeded fault is named', '(b) parity:mutate 9/9, P-build and P-pages no-op = 0'] },
  'WP-06': { commands: ['npm run types:check', 'npx tsc --noEmit'], manual: ['generated columns equal schema columns for 36 tables', 'workspace-link test passes'] },
  'WP-07': { commands: ['npx tsc --noEmit'], manual: ['copies-agree tests pass on current data', 'type-design findings dispositioned in the PR'] },
  'WP-08': { commands: [], manual: ['contract suite passes on Node 26.9 and the pinned CI Node', 'only driver.ts imports node:sqlite'] },
  'WP-09': { commands: ['npm run db:roundtrip'], manual: ['reconstruction <= 5 s recorded', '"4.30" and missing-word tests pass'] },
  'WP-10': { commands: ['npm run change:replay'], manual: ['one test per guard and refusal', 'interrupted export leaves the tree unchanged', 'stale command refused'] },
  // The pack writes `parity -- --new adapter`; the CLI's flag is `--new` (the wrapped engine is the new side, WP-11), on the surfaces it can answer: the engine and the first-wins ties (links, build and pages wait for WP-17, WP-20, WP-24). The fixture
  // correction and the recorded impact time are checked by tests/remake/impact.test.mjs.
  'WP-11': { commands: ['npm run parity -- --new --surface engine,ties', 'node --test tests/remake/engine-wrapper.test.mjs tests/remake/impact.test.mjs'], manual: [] },
  'WP-13': { commands: ['npm run test:e2e'], manual: ['token, Host, Origin and bind-address tests pass', 'ready <= 3 s'] },
  'WP-14': { commands: ['npm run release:id'], manual: ['ID stable across two checkout paths and changed by one data cell', '/v3/ counts equal the engine\'s'] },
  'WP-15': { commands: ['npm run checks:register -- --verify'], attest: ['untested-list-received'], manual: ['a scratch PR deleting a test fails', 'map covers every row of 00-CURRENT-STATE section 11'] },
  'WP-16': { commands: [], attest: ['owner-correction'], manual: ['clean rebuild diff = 0', 're-estimate written', 'Q2-08 answered or defaulted'] },
  'WP-17': { commands: [], manual: ['one test per command and refusal', 'coverage report', 'reviewer-kind report', 'schemaEdit round-trips'] },
  'WP-18': { commands: ['npm run parity -- --milestone'], manual: ['per PR: P-erase = 0 for label steps, P-engine = 0 all tiers; ratchet not raised'] },
  'WP-19': { commands: [], manual: ['rule cards mapped to tests', 'P-engine = 0 plus metamorphic, census, 5,000 replays', 'one verdict table in new code'] },
  'WP-20': { commands: ['npm run parity:host'], manual: ['P-build = 0', 'reproducible on one machine', 'cold build <= 26.4 s'] },
  'WP-21': { commands: [], manual: ['explore with estimates parity = 0', 'stale-key test forces recompute', 'estimates.json byte-identical after the TypeScript step'] },
  'WP-22': { commands: ['npm run test:e2e'], manual: ['old-adapter run equals the old CDP harness on one build', '3 green runs with retries 0', 'axe report per lens'] },
  'WP-23': { commands: ['npm run parity -- --milestone'], attest: ['reprint-transition-approved'], manual: ['transition digest = measured diff'] },
  'WP-24': { commands: [], manual: ['P-pages byte-identical apart from registered display transitions', 'page script <= 30 KB'] },
  'WP-25': { commands: [], manual: ['core sufficiency = 0', 'stale-shell, mismatch and 404 tests pass', 'size report in budget'] },
  'WP-26': { commands: [], manual: ['P-ui passes on the new adapter', 'keyboard script passes', 'historic links open'] },
  'WP-27': { commands: [], manual: ['chart traces identical', 'Plotly absent from first load', 'first chart <= 1.2 s', 'brief and export equal on 12 scenarios'] },
  'WP-28': { commands: [], manual: ['adversarial tests fail closed', 'two commit-pinned scans with zero High', 'one document through proposal, review, accept and export'] },
  'WP-29': { commands: ['npm run doctor:next'], manual: ['CI prints "not run: store absent"', 'manifests of the two copies equal'] },
  'WP-30': { commands: [], manual: ['smoke green at the preview root', 'task suite green under both base paths', 'budget report in range'] },
  'WP-31': { commands: [], manual: ['journey test per command', 'usage gate recorded'] },
  'WP-32': { commands: ['npm run checks:register -- --cutover-ready'], manual: ['dry-run against the preview deploys the candidate and smoke passes', 'CI minutes within budget'] },
  'WP-33': { commands: [], manual: ['findings file with every finding routed'] },
  'WP-34': { commands: ['npm run candidate:check'], attest: ['safari-check'], manual: [] },
  'WP-35': { commands: [], attest: ['bus-factor-rollback'], manual: ['rehearsal log under 15 min', 'legacy zip digest in the receipt'] },
  'WP-36': { commands: [], attest: ['cutover-approved'], manual: ['the SHA in the row equals the receipt\'s'] },
  'WP-37': { commands: [], manual: ['live smoke green', 'live release.json names the release', 'h2c-<id> release has its zip', 'data pause lifted'] },
  'WP-38': { commands: [], manual: ['register row per deletion', 'offline-prose grep returns only allow-listed lines', 'AGENTS.md <= 8 KB', 'audit manifest matches the store'] },
  'WP-39': { commands: [], attest: ['portfolio-review-recorded'], manual: ['reviewer entries recorded within 14 days', 'label removed for each reviewed expectation'] },
};

// Where the seeded status files start: the M0 packages are delivered (merged PRs #6 to #13, 2026-10-21); the rest are todo.
const DELIVERED = { status: 'done', doneAt: '2026-10-21' };
const SEED = {
  'WP-S0': { ...DELIVERED, branch: 'wp-S0-claude-setup', pr: 6, prs: [6] },
  'WP-01': { ...DELIVERED, branch: 'wp-S0-claude-setup', pr: 6, prs: [6] },
  'WP-02': { ...DELIVERED, branch: 'wp-02-scaffold', pr: 7, prs: [7] },
  'WP-03': { ...DELIVERED, branch: 'wp-03-ci-preview', pr: 10, prs: [10, 12, 13] },
  'WP-05': { ...DELIVERED, branch: 'wp-05-parity', pr: 9, prs: [9] },
  'WP-06': { ...DELIVERED, branch: 'wp-06-typescript', pr: 8, prs: [8] },
  'WP-07': { ...DELIVERED, branch: 'wp-07-contracts', pr: 11, prs: [11] },
};

function parseDepends(raw) {
  const text = raw.replace(/WP-(\d\d) to WP-(\d\d)/g, (_, a, b) =>
    Array.from({ length: +b - +a + 1 }, (_, i) => `WP-${String(+a + i).padStart(2, '0')}`).join(' '));
  const ids = [...new Set([...text.matchAll(/WP-(?:S0|\d\d)/g)].map((m) => m[0]))];
  const gates = [...new Set([...text.matchAll(/Q2-\d\d/g)].map((m) => m[0]))];
  return { ids, gates };
}

export function parseTable(markdown) {
  const start = markdown.indexOf('## 3. Work-package index');
  const end = markdown.indexOf('**Standing loops**', start);
  if (start < 0 || end < 0) throw new Error('section 3 table not found');
  const rows = markdown.slice(start, end).split('\n').filter((l) => /^\| WP-/.test(l));
  return rows.map((line) => {
    const c = line.replace(/^\||\|\s*$/g, '').split(' | ').map((s) => s.trim());
    if (c.length !== 7) throw new Error(`row has ${c.length} cells: ${line.slice(0, 60)}`);
    const [id, title, milestone, depends, canStart, size, exit] = c;
    return { id, title, milestone, depends, canStart, size, exit };
  });
}

export function buildIndex(rows) {
  const packages = rows.map((r) => {
    const { ids, gates } = parseDepends(r.depends);
    const notes = [];
    let dependsOn = [];
    let outGates = gates;
    for (const d of ids) {
      const drop = DROPPED[d];
      if (!drop) { dependsOn.push(d); continue; }
      if (drop.replacement) { dependsOn.push(drop.replacement); notes.push(`${d} is ${drop.reason}; depends on ${drop.replacement} instead`); }
      else notes.push(`${d} is ${drop.reason}; nothing depends on it`);
      if (d === 'WP-12') outGates = outGates.filter((g) => g !== 'Q2-13'); // the framework tick is moot: Vue, no trial
    }
    dependsOn = [...new Set(dependsOn)].filter((d) => d !== r.id);
    const drop = DROPPED[r.id];
    const exit = EXIT[r.id] ?? { commands: [], manual: [] };
    if (r.id === 'WP-01') notes.push('Q2-09 B: no pointer PR to main');
    return {
      id: r.id, title: r.title, milestone: r.milestone,
      milestones: [...r.milestone.matchAll(/M\d/g)].map((m) => m[0]),
      dependsOn, gates: outGates, dependsRaw: r.depends, canStart: r.canStart, size: r.size,
      exitEvidence: r.exit,
      exit: drop ? { commands: [], attest: [], manual: [] } : { commands: exit.commands, attest: exit.attest ?? [], manual: exit.manual },
      dropped: Boolean(drop), ...(drop ? { droppedReason: drop.reason } : {}), ...(notes.length ? { notes } : {}),
    };
  });
  return { schema: 1, source: 'pack 08-ROADMAP-AND-WORK-PACKAGES.md section 3, with the owner answers of 2026-10-21 applied', packages };
}

export function seedStatus(pkg) {
  return {
    id: pkg.id, status: pkg.dropped ? 'dropped' : 'todo', slice: null, branch: null, pr: null,
    exitCheck: 'not-run', lastRun: null, lastPass: null, evidence: [], waitingSince: null, approvedAt: null,
    ...(pkg.dropped ? { note: pkg.droppedReason } : {}), ...(SEED[pkg.id] ?? {}),
  };
}

if (isMain(import.meta.url)) {
  const [src, flag] = process.argv.slice(2);
  if (!src) { console.error('usage: gen-wp-index.mjs <08-ROADMAP-AND-WORK-PACKAGES.md> [--seed-status]'); process.exit(2); }
  const index = buildIndex(parseTable(readFileSync(src, 'utf8')));
  const problems = checkDeps(index.packages);
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  writeJson(indexPath(), index);
  console.log(`wrote ${index.packages.length} packages to ${indexPath()}`);
  if (flag === '--seed-status') {
    let made = 0;
    for (const p of index.packages) if (!existsSync(statusPath(p.id))) { writeJson(statusPath(p.id), seedStatus(p)); made++; }
    console.log(`seeded ${made} status files`);
  }
}
