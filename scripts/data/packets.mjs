#!/usr/bin/env node
// A round's packets, kept in the private evidence store rather than the working tree (maintainability round,
// 2026-10-15; D138).
//
// A round of work leaves two kinds of file in its audit folder: its reports (Markdown), which say what it found and
// keep every number they quote, and its packets: the targets, readings, proposals, held rows, render dumps and logs it
// worked through. The packets are provenance, and they were 150 MB of a 260 MB tree that every clone, search and reader
// had to carry. This moves them to the store that already keeps the source documents ($H2C_SOURCE_BACKUP), leaves in the
// round folder a PACKETS.md that says what they were and how to bring them back, and a PACKETS.csv with each file's
// size and SHA-256, so the store's copy can be checked against the repository's own record. Git history keeps every
// byte as well: `git show <commit>:<path>` with the commit PACKETS.md names.
//
// What stays in the tree, whatever its round: every report, script and image (.md, .mjs, .py, .sh, .png); the whole of
// 2026-09-18-v2-import, which is the import pipeline's live state; the frozen lists a round was judged against and the
// verdicts the README counts (TARGETS*.csv, DOCS*.csv, BASELINE*.json, baseline/, blind-draw/*verdicts-*.csv); the
// coverage campaign's inputs and outputs, which its status check reads; every file a living document, script, test or
// table names by path, or a regenerated (Current or Generated) document links; and what docs/audits/keep-list.csv lists. `--manifest` prints each kept file's reason.
//
//   npm run packets -- --manifest <round>            what would move, and why each kept file stays
//   npm run packets -- --export <round> [--remove]   copy the packets to the store, checked byte for byte, and write
//                                                    PACKETS.md and PACKETS.csv; a Markdown link that led to a packet
//                                                    now leads to PACKETS.md; --remove then takes them out of git
//   npm run packets -- --verify <round>              hash every packet in the store against PACKETS.csv
//   npm run packets -- --restore <round> [--to <dir>]  copy a round's packets back, to their own places by default
//   npm run packets -- --check                       every round's packets are in the store, and none is still tracked;
//                                                    without the store (CI) only the second, and it says so
//
// A round is a folder name under docs/audits/, or `ingest-2026-09-18`: the 2026-09-18 import's proposals, which leave
// archive/ingest-2026-09-18/proposals/ the same way and are restored to the import's proposals folder (.cache/proposals).

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText, readCsv } from '../../build/src/csv.js';
import { PROPOSALS, projectRoot as root } from '../ingest/context.mjs';
import { generatedMark } from '../lib/generated-mark.mjs';
import { linkTargets, rewriteLinks } from '../docs-links.mjs';

const AUDITS = 'docs/audits';
const PROPOSALS_ROUND = 'ingest-2026-09-18';
// Commit is the last commit that holds the file, so `git show <Commit>:<path>` reads it from history.
const COLUMNS = ['Path', 'Bytes', 'SHA256', 'Commit'];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const tracked = (dir) => git('ls-files', '--', dir).split('\n').filter(Boolean);

/** Every file under a folder on disk, as paths relative to it, in a fixed order. */
function filesUnder(dir) {
  const out = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const f = join(d, e.name); if (e.isDirectory()) walk(f); else out.push(relative(dir, f).split(sep).join('/')); } };
  if (existsSync(dir)) walk(dir);
  return out.sort();
}

/**
 * Where a round's packets are (`dir`, tracked in git, or for the import's proposals a private folder on disk), where
 * its record of them goes, and where a restore puts them by default.
 */
export function roundOf(name) {
  if (name === PROPOSALS_ROUND) {
    // The import pipeline's proposals: those of the 2026-09-18 import's batches, which left the repository on
    // 2026-10-15, and every later batch's, which are written to the private proposals folder and exported from there.
    return { name, dir: 'archive/ingest-2026-09-18/proposals', record: 'archive/ingest-2026-09-18', restoreTo: PROPOSALS, private: PROPOSALS,
      what: 'The import pipeline\'s proposals: one file per document and batch, with the page and line of every row the sheet\nreader proposed, the lines it skipped and the review of each row. The batch migrations re-read them and the record\ntier mines them' };
  }
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9.-]+$/.test(name) || !existsSync(join(root, AUDITS, name))) throw new Error(`no round ${name} under ${AUDITS}/`);
  const dir = `${AUDITS}/${name}`;
  return { name, dir, record: dir, restoreTo: join(root, dir),
    what: 'This round\'s working files: what it read, proposed, held and logged, as distinct from the reports beside this file,\nwhich say what it found and keep every number they quote' };
}

/** Every round that has a PACKETS.csv. */
const exportedRounds = () => git('ls-files', '--', `${AUDITS}/*/PACKETS.csv`, 'archive/*/PACKETS.csv').split('\n').filter(Boolean)
  .map((f) => (f.startsWith('archive/') ? PROPOSALS_ROUND : f.split('/')[2]));

// ------------------------------------------------------------------ what stays

const ALWAYS = /\.(md|mjs|py|sh|png)$/i;
const LIVE_ROUNDS = new Set(['2026-09-18-v2-import']);
const FROZEN = [/(^|\/)blind-draw\/(draw-b-)?verdicts-[^/]+\.csv$/, /(^|\/)TARGETS[^/]*\.csv$/, /(^|\/)DOCS[^/]*\.csv$/, /(^|\/)BASELINE[^/]*\.json$/, /^baseline\//];
const CAMPAIGN = '2026-09-30-coverage-expansion';
const CAMPAIGN_FILES = ['frozen-targets.json', 'completed-outcomes.json', 'resume-scope.json', 'STATUS.md', 'STATUS.json', 'task-status.csv', 'remaining-targets.csv', 'table-delta.json'];
// The living files whose words can name an audit file: the documents, the tables and the code, never the records.
const LIVING = ['README.md', 'AGENTS.md', 'CLAUDE.md', 'package.json', 'docs/*.md', 'data', 'schema', 'scripts', 'build', 'test', 'app', '.github'];
const CITED = /audits\/(\d{4}-\d{2}-\d{2}-[a-z0-9.-]+)\/([^\s'"`)\]>,;|*{}]+)/g;

let living = null;
/** Each audit path a living file names: { files: Set of round/path, folders: Map of round/folder to who names it }. */
function livingCitations() {
  if (living) return living;
  const auditFiles = new Set(tracked(AUDITS).map((f) => f.slice(AUDITS.length + 1)));
  const files = new Set(), folders = new Map();
  for (const f of git('ls-files', '--', ...LIVING).split('\n').filter(Boolean)) {
    // A pathspec's * crosses folders, so docs/*.md also lists the records; they are not living files.
    if (f.startsWith('scripts/migrate/') || f.startsWith(`${AUDITS}/`) || f.startsWith('archive/')) continue;
    let text;
    try { text = readFileSync(join(root, f), 'utf8'); } catch { continue; }
    if (!text.includes('audits/')) continue;
    for (const m of text.matchAll(CITED)) {
      const path = `${m[1]}/${m[2].replace(/[.:]+$/, '').replace(/\/$/, '')}`;
      if (auditFiles.has(path)) files.add(path);
      else if ([...auditFiles].some((a) => a.startsWith(`${path}/`))) folders.set(path, [...new Set([...(folders.get(path) ?? []), f])]);
    }
  }
  living = { files, folders };
  return living;
}

const regenerated = new Map();
/**
 * The files a round's regenerated documents link: a document that opens with the Current or Generated mark is written
 * again by its command, links and all, so what it links must stay (the campaign's STATUS.md links its receipts).
 */
function linkedFromRegenerated(round) {
  if (regenerated.has(round)) return regenerated.get(round);
  const dir = `${AUDITS}/${round}`;
  const linked = new Set();
  for (const md of tracked(dir).filter((f) => f.endsWith('.md') && !f.endsWith('/PACKETS.md'))) {
    const text = readFileSync(join(root, md), 'utf8');
    if (!/^> \*\*(Current|Generated)\*\*/m.test(text.split('\n').slice(0, 12).join('\n'))) continue;
    for (const target of linkTargets(text)) {
      try { linked.add(normalize(join(dirname(md), decodeURIComponent(target.split('#')[0]))).slice(dir.length + 1)); } catch { /* not a path */ }
    }
  }
  regenerated.set(round, linked);
  return linked;
}

/** docs/audits/keep-list.csv: a file or a folder (ending in /) under docs/audits that stays, and why. */
function keepList() {
  const path = join(root, AUDITS, 'keep-list.csv');
  if (!existsSync(path)) return [];
  return readCsv(path).records.map((r) => ({ path: r.values.Path, reason: r.values.Reason }));
}

let campaignPackets = null;
const campaignNeeds = (rel) => {
  campaignPackets ??= new Set(JSON.parse(readFileSync(join(root, AUDITS, CAMPAIGN, 'completed-outcomes.json'), 'utf8')).Outcomes
    .flatMap((o) => [`${o.Packet}-packet.json`, `${o.Packet}-review.json`]));
  return CAMPAIGN_FILES.includes(rel) || campaignPackets.has(rel);
};

/** Why a file of a round stays in the tree, or null when it is a packet that may move. */
export function keepReason(round, rel) {
  if (round === PROPOSALS_ROUND) return null;
  if (/^PACKETS\.(md|csv)$/.test(rel)) return 'the round\'s record of its packets';
  if (ALWAYS.test(rel)) return 'a report, script or image';
  if (LIVE_ROUNDS.has(round)) return 'the import pipeline\'s live state';
  if (FROZEN.some((re) => re.test(rel))) return 'a frozen list, baseline or counted verdict';
  if (round === CAMPAIGN && campaignNeeds(rel)) return 'read or written by the campaign status check';
  if (livingCitations().files.has(`${round}/${rel}`)) return 'named by a living document, script, test or table';
  if (linkedFromRegenerated(round).has(rel)) return 'linked from a document its command regenerates';
  const listed = keepList().find((k) => `${round}/${rel}` === k.path || (k.path.endsWith('/') && `${round}/${rel}`.startsWith(k.path)));
  return listed ? `keep-list: ${listed.reason}` : null;
}

/**
 * A round's files, split into what stays (with why) and what moves, each with the folder it is read from. For the
 * import's proposals that is also every file of the private proposals folder the record does not hold as it is now
 * (a new batch's, or one reviewed again since it was exported).
 */
export function sortRound(name) {
  const round = roundOf(name);
  const kept = [], moving = [];
  for (const f of tracked(round.dir)) {
    const rel = f.slice(round.dir.length + 1);
    const reason = keepReason(name, rel);
    if (reason) kept.push({ rel, reason }); else moving.push({ rel, from: join(root, round.dir, rel), tracked: true });
  }
  if (round.private) {
    const recorded = new Map(recordOf(round).map((r) => [r.path, r]));
    const inTree = new Set(moving.map((m) => m.rel));
    for (const rel of filesUnder(round.private)) {
      if (inTree.has(rel)) continue;
      const from = join(round.private, rel);
      const r = recorded.get(rel);
      if (r && r.bytes === statSync(from).size && r.sha === sha256(readFileSync(from))) continue;
      moving.push({ rel, from, tracked: false });
    }
  }
  return { round, kept, moving };
}

// ------------------------------------------------------------------ the store

/** The store's packets folder, which must be outside the repository: the store is private, the repository is not. */
function store() {
  const base = process.env.H2C_SOURCE_BACKUP?.trim();
  if (!base) return null;
  if (!existsSync(base)) throw new Error(`H2C_SOURCE_BACKUP (${base}) does not exist`);
  const physical = realpathSync(base);
  if (physical === root || physical.startsWith(root + sep)) throw new Error('H2C_SOURCE_BACKUP is inside the repository; packets are kept outside it');
  return join(physical, 'packets');
}
const needStore = () => store() ?? (() => { throw new Error('H2C_SOURCE_BACKUP is not set; the packets live in the private store it names'); })();

/** Copy aside and rename into place, so an interrupted copy is never found under the packet's name. */
function copyWhole(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  const aside = `${to}.${process.pid}.tmp`;
  copyFileSync(from, aside);
  renameSync(aside, to);
}

const recordOf = (round) => {
  const path = join(root, round.record, 'PACKETS.csv');
  return existsSync(path) ? readCsv(path).records.map((r) => ({ path: r.values.Path, bytes: Number(r.values.Bytes), sha: r.values.SHA256, commit: r.values.Commit })) : [];
};

function writeRecord(round, rows) {
  rows.sort((a, b) => a.path.localeCompare(b.path));
  writeFileSync(join(root, round.record, 'PACKETS.csv'), csvText(COLUMNS, rows.map((r) => ({ Path: r.path, Bytes: String(r.bytes), SHA256: r.sha, Commit: r.commit }))));
  const commits = [...new Set(rows.map((r) => r.commit).filter(Boolean))];
  const total = rows.reduce((s, r) => s + r.bytes, 0);
  const byFolder = new Map();
  for (const r of rows) {
    const folder = r.path.includes('/') ? r.path.slice(0, r.path.lastIndexOf('/')) : '(this folder)';
    const f = byFolder.get(folder) ?? { files: 0, bytes: 0 };
    f.files++; f.bytes += r.bytes; byFolder.set(folder, f);
  }
  const mb = (b) => (b / 1048576).toFixed(b < 1048576 ? 2 : 1);
  const lines = [
    `# Packets of ${round.name}`,
    '',
    generatedMark(`npm run packets -- --export ${round.name}`),
    '',
    `${round.what}.`,
    '',
    `These ${rows.length.toLocaleString('en-US')} files (${mb(total)} MB) left the working tree for the private evidence store that also keeps the`,
    `source documents (\`$H2C_SOURCE_BACKUP/packets/${round.name}/\`), so that a clone carries the record and not its working`,
    'files (D138). [PACKETS.csv](PACKETS.csv) lists each one with its size, its SHA-256, which proves a copy is the file that',
    'was used, and the last commit that holds it.',
    '',
    ...(commits.length ? [`- **Read one from git history:** \`git show ${commits.length === 1 ? commits[0] : '<Commit>'}:${round.dir}/<path>\`${commits.length === 1 ? '' : ' (each file\'s Commit is in PACKETS.csv; a file with none was never committed)'}.`] : []),
    `- **Bring them back to rerun the round's scripts:** \`npm run packets -- --restore ${round.name}\` (needs \`$H2C_SOURCE_BACKUP\`).`,
    `- **Check the store's copies:** \`npm run packets -- --verify ${round.name}\`.`,
    '',
    '| Folder | Files | MB |',
    '|---|---:|---:|',
    ...[...byFolder].sort(([a], [b]) => a.localeCompare(b)).map(([folder, f]) => `| \`${folder}\` | ${f.files} | ${mb(f.bytes)} |`),
    '',
  ];
  writeFileSync(join(root, round.record, 'PACKETS.md'), lines.join('\n'));
}

/**
 * Every tracked Markdown file's links to a packet that moved, or to a folder that held only packets, now lead to its
 * round's PACKETS.md, which names each with its digest; the link keeps its words. Returns how many files changed.
 */
function relink(round, moved) {
  const gone = new Set(moved.map((rel) => `${round.dir}/${rel}`));
  const stays = tracked(round.dir).filter((f) => !gone.has(f));
  for (const f of gone) {
    for (let d = dirname(f); d.length > round.dir.length; d = dirname(d)) {
      if (!stays.some((k) => k.startsWith(`${d}/`))) gone.add(d);
    }
  }
  const record = `${round.record}/PACKETS.md`;
  let changed = 0;
  for (const md of git('ls-files', '--', '*.md').split('\n').filter(Boolean)) {
    const text = readFileSync(join(root, md), 'utf8');
    const next = rewriteLinks(text, (target) => {
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) return null;
      let path;
      try { path = normalize(join(dirname(md), decodeURIComponent(target.split('#')[0]))).replace(/\/$/, ''); } catch { return null; }
      return gone.has(path) ? relative(dirname(md), record) || 'PACKETS.md' : null;
    });
    if (next !== text) { writeFileSync(join(root, md), next); changed++; }
  }
  return changed;
}

/** Copy a round's packets to the store, read each copy back, and write the round's record of them. */
export function exportRound(name, { remove = false } = {}) {
  const { round, moving } = sortRound(name);
  const base = join(needStore(), name);
  const head = git('rev-parse', '--short=12', 'HEAD').trim();
  const rows = new Map(recordOf(round).map((r) => [r.path, r]));
  for (const { rel, from, tracked: inGit } of moving) {
    const to = join(base, rel);
    const bytes = readFileSync(from);
    const sha = sha256(bytes);
    if (!(existsSync(to) && statSync(to).size === bytes.length && sha256(readFileSync(to)) === sha)) copyWhole(from, to);
    if (sha256(readFileSync(to)) !== sha) throw new Error(`${name}/${rel}: the store's copy does not hash to the file`);
    // A file never committed (a later batch's proposal) has no commit to read it back from.
    rows.set(rel, { path: rel, bytes: bytes.length, sha, commit: inGit ? head : '' });
  }
  writeRecord(round, [...rows.values()]);
  copyWhole(join(root, round.record, 'PACKETS.csv'), join(base, 'packets-index.csv'));
  const inGit = moving.filter((m) => m.tracked).map((m) => m.rel);
  const relinked = inGit.length ? relink(round, inGit) : 0;
  if (remove && inGit.length) {
    for (let i = 0; i < inGit.length; i += 300) git('rm', '-q', '--', ...inGit.slice(i, i + 300).map((rel) => `${round.dir}/${rel}`));
  }
  return { exported: moving.length, bytes: moving.reduce((s, m) => s + (rows.get(m.rel)?.bytes ?? 0), 0), removed: remove ? inGit.length : 0, relinked };
}

/** Every packet of the round, hashed in the store against the round's record. Returns the problems. */
export function verifyRound(name) {
  const round = roundOf(name);
  const base = join(needStore(), name);
  const problems = [];
  for (const r of recordOf(round)) {
    const at = join(base, r.path);
    if (!existsSync(at)) problems.push(`${name}/${r.path}: not in the store`);
    else if (sha256(readFileSync(at)) !== r.sha) problems.push(`${name}/${r.path}: the store's copy does not hash to the record`);
  }
  return problems;
}

/** Copy a round's packets back from the store, each checked against the record. */
export function restoreRound(name, to = null) {
  const round = roundOf(name);
  const base = join(needStore(), name);
  const target = resolve(to ?? round.restoreTo);
  let n = 0;
  for (const r of recordOf(round)) {
    const from = join(base, r.path), dest = join(target, r.path);
    if (existsSync(dest) && sha256(readFileSync(dest)) === r.sha) continue;
    if (sha256(readFileSync(from)) !== r.sha) throw new Error(`${name}/${r.path}: the store's copy does not hash to the record`);
    copyWhole(from, dest);
    n++;
  }
  return { restored: n, to: relative(root, target) || '.' };
}

/**
 * The quick check `verify` runs: no packet a record lists is still tracked, and where the store is reachable each is
 * there at its recorded size (sizes only: hashing every packet, or reading a file a sync client keeps online, is the
 * slow --verify).
 */
export function checkAll() {
  const base = store();
  const problems = [];
  let packets = 0;
  for (const name of exportedRounds()) {
    const round = roundOf(name);
    const still = new Set(tracked(round.dir));
    for (const r of recordOf(round)) {
      packets++;
      if (still.has(`${round.dir}/${r.path}`)) problems.push(`${name}/${r.path}: exported but still tracked (npm run packets -- --export ${name} --remove)`);
      if (base) {
        const at = join(base, name, r.path);
        if (!existsSync(at)) problems.push(`${name}/${r.path}: not in the store`);
        else if (statSync(at).size !== r.bytes) problems.push(`${name}/${r.path}: the store's copy is ${statSync(at).size} bytes, the record says ${r.bytes}`);
      }
    }
  }
  return { problems, packets, rounds: exportedRounds().length, store: !!base };
}

// ------------------------------------------------------------------ command line

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const value = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const mb = (b) => `${(b / 1048576).toFixed(1)} MB`;
  try {
    if (args.includes('--check')) {
      const { problems, packets, rounds, store: reached } = checkAll();
      for (const p of problems) console.error(`  ${p}`);
      if (problems.length) { console.error(`packets: ${problems.length} problem(s)`); process.exit(1); }
      console.log(`packets: ${packets} packets of ${rounds} round(s), none still tracked${reached ? ', every one in the store at its recorded size' : '; the store was not checked (SKIPPED: H2C_SOURCE_BACKUP is not set here)'}`);
    } else if (value('--manifest')) {
      const name = value('--manifest');
      const { kept, moving } = sortRound(name);
      const reasons = new Map();
      for (const k of kept) reasons.set(k.reason, (reasons.get(k.reason) ?? 0) + 1);
      console.log(`${name}: ${moving.length} file(s), ${mb(moving.reduce((s, m) => s + statSync(m.from).size, 0))}, would move; ${kept.length} stay`);
      for (const [reason, n] of reasons) console.log(`  stays (${n}): ${reason}`);
      for (const k of kept.filter((x) => !/report, script or image|record of its packets/.test(x.reason))) console.log(`    ${k.rel}: ${k.reason}`);
      const folders = [...livingCitations().folders].filter(([path]) => path === name || path.startsWith(`${name}/`));
      for (const [path, by] of folders) console.log(`  a folder a living file names (not kept unless keep-list.csv lists it): ${path} (${by.join(', ')})`);
      if (args.includes('--list')) for (const m of moving) console.log(`    moves: ${m.rel}`);
    } else if (value('--export')) {
      const { exported, bytes, removed, relinked } = exportRound(value('--export'), { remove: args.includes('--remove') });
      console.log(`packets: ${exported} file(s), ${mb(bytes)}, in the store and checked${removed ? `, ${removed} removed from git` : ''}${relinked ? `; links re-pointed in ${relinked} document(s)` : ''}`);
    } else if (value('--verify')) {
      const problems = verifyRound(value('--verify'));
      for (const p of problems) console.error(`  ${p}`);
      if (problems.length) process.exit(1);
      console.log(`packets: every packet of ${value('--verify')} is in the store and hashes to its record`);
    } else if (value('--restore')) {
      const { restored, to } = restoreRound(value('--restore'), value('--to'));
      console.log(`packets: ${restored} file(s) restored to ${to}`);
    } else {
      console.error('usage: npm run packets -- --manifest|--export|--verify|--restore <round> | --check');
      process.exit(2);
    }
  } catch (e) {
    console.error(`packets: ${e.message}`);
    process.exit(1);
  }
}
