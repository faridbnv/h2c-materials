#!/usr/bin/env node
// wp:check -- WP-NN  runs the package's exit commands from the index and records the result in its status file.
// Tri-state: pass | fail | not-run. A command that cannot run, prints SKIPPED, or an exit line that only a person can
// confirm (a manual line or an attest key without a row in remake/attest.csv) makes the result not-run, never pass.
// The overall result is fail if any command failed, else not-run if anything was not run or unconfirmed, else pass.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadIndex, loadStatus, saveStatus, readJson, repoRoot, attestedKeys, isMain } from './wp-lib.mjs';

// Upper-case SKIPPED (the old tool's own word), "not run:", node:test's "# SKIP" and a non-zero "skipped N" summary.
// A "skipped 0" summary line is not a skip.
const SKIP_WORDS = /\bSKIPPED\b|\bnot run:|\bNOT RUN\b|# SKIP\b|\bskipped [1-9]/;

// Why a command cannot run here, or null when it can be tried.
export function unrunnable(cmd, root) {
  const t = cmd.trim().split(/\s+/);
  if (t[0] === 'npm' && (t[1] === 'run' || t[1] === 'run-script')) {
    const name = t.slice(2).find((x) => !x.startsWith('-'));
    const pkgPath = join(root, 'package.json');
    const scripts = existsSync(pkgPath) ? readJson(pkgPath).scripts ?? {} : {};
    return name in scripts ? null : `no npm script "${name}" in package.json`;
  }
  if (t[0] === 'npx') {
    const bin = t.slice(1).find((x) => !x.startsWith('-'));
    if (!bin) return 'npx names no tool';
    return existsSync(join(root, 'node_modules', '.bin', bin)) ? null : `${bin} is not installed (node_modules/.bin)`;
  }
  if (t[0] === 'node') {
    const file = t.slice(1).find((x) => !x.startsWith('-'));
    if (file && !file.includes('*') && !existsSync(join(root, file))) return `file ${file} does not exist`;
  }
  return null;
}

export function runCommand(cmd, root) {
  const why = unrunnable(cmd, root);
  if (why) return { cmd, result: 'not-run', note: why };
  const r = spawnSync(cmd, { cwd: root, shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const tail = out.trim().split('\n').slice(-6).join('\n').slice(-600);
  if (r.error) return { cmd, result: 'not-run', note: `could not start: ${r.error.message}` };
  if (r.status === 127) return { cmd, result: 'not-run', note: 'command not found', tail };
  if (r.status !== 0) return { cmd, result: 'fail', code: r.status, tail };
  if (SKIP_WORDS.test(out)) return { cmd, result: 'not-run', code: 0, note: 'exit 0 but the output says it skipped; a skip is not a pass', tail };
  return { cmd, result: 'pass', code: 0 };
}

// fail beats not-run beats pass; anything that is not a plain pass can never yield pass.
function overallResult(details) {
  if (details.some((d) => d.result === 'fail')) return 'fail';
  if (details.some((d) => d.result !== 'pass')) return 'not-run';
  return 'pass';
}

export function checkPackage(id, root = repoRoot()) {
  const pkg = loadIndex(root).packages.find((p) => p.id === id);
  if (!pkg) throw new Error(`unknown work package ${id}`);
  const status = loadStatus(id, root);
  const at = new Date().toISOString();
  let result, details;
  if (pkg.dropped) {
    result = 'not-run';
    details = [{ cmd: '(package)', result: 'not-run', note: pkg.droppedReason }];
  } else {
    const have = attestedKeys(root);
    details = [
      ...pkg.exit.commands.map((c) => runCommand(c, root)),
      ...pkg.exit.attest.map((k) => ({ cmd: `attest ${k}`, result: have.has(k) ? 'pass' : 'not-run', note: have.has(k) ? 'row in remake/attest.csv' : 'no row in remake/attest.csv' })),
      ...pkg.exit.manual.map((m) => ({ cmd: `manual: ${m}`, result: 'not-run', note: 'no command checks this yet' })),
    ];
    if (!details.length) details = [{ cmd: '(none)', result: 'not-run', note: 'the index lists no exit command' }];
    result = overallResult(details);
  }
  const next = { ...status, exitCheck: result, lastRun: at, lastPass: result === 'pass' ? at : status.lastPass ?? null, evidence: details };
  saveStatus(next, root);
  return { id, result, details };
}

if (isMain(import.meta.url)) {
  const id = process.argv.slice(2).find((a) => /^WP-/.test(a));
  if (!id) { console.error('usage: npm run wp:check -- WP-NN'); process.exit(2); }
  try {
    const { result, details } = checkPackage(id);
    for (const d of details) console.log(`  ${d.result.padEnd(7)} ${d.cmd}${d.note ? `  (${d.note})` : ''}`);
    console.log(`${id}: ${result}`);
    process.exitCode = result === 'pass' ? 0 : result === 'fail' ? 1 : 3; // not-run is never a zero exit
  } catch (e) { console.error(`wp:check failed: ${e.message}`); process.exitCode = 2; }
}
