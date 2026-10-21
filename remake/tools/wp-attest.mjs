#!/usr/bin/env node
// wp:attest -- <key>  records the owner's approval. It REFUSES unless stdin and stdout are both interactive terminals,
// so a pipe, a script or an agent shell cannot run it. This is a convenience against mistakes, not proof of identity
// (pack 08 section 4.4); the docs call the result "agent-attested".
//   wp:attest -- approve <PR>   posts the PR comment `wp:attest approve <PR> <headSHA>` through gh
//   wp:attest -- <key> [detail] appends a dated row to remake/attest.csv
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { appendAttest, loadAllStatus, saveStatus, repoRoot } from './wp-lib.mjs';

const gh = (...a) => {
  const r = spawnSync('gh', a, { encoding: 'utf8', cwd: repoRoot() });
  if (r.status !== 0) throw new Error(`gh ${a.slice(0, 3).join(' ')} failed: ${(r.stderr || r.error?.message || '').trim()}`);
  return r.stdout.trim();
};

async function main(argv) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error('wp:attest refused: stdin and stdout must both be interactive terminals. Run it yourself in your own terminal.');
    return 1;
  }
  const [key, ...rest] = argv;
  if (!key) { console.error('usage: npm run wp:attest -- approve <PR>  |  npm run wp:attest -- <key> [detail]'); return 2; }
  let action, post;
  if (key === 'approve') {
    const pr = rest[0];
    if (!/^\d+$/.test(pr ?? '')) { console.error('usage: npm run wp:attest -- approve <PR number>'); return 2; }
    const info = JSON.parse(gh('pr', 'view', pr, '--json', 'headRefOid,headRefName,title,state'));
    if (info.state !== 'OPEN') { console.error(`PR ${pr} is ${info.state}, not OPEN`); return 1; }
    action = `post the comment "wp:attest approve ${pr} ${info.headRefOid}" on PR ${pr} (${info.title}, branch ${info.headRefName})`;
    post = () => {
      gh('pr', 'comment', pr, '--body', `wp:attest approve ${pr} ${info.headRefOid}`);
      const wp = /^wp-(S0|\d\d)/i.exec(info.headRefName);
      const st = wp && loadAllStatus()[`WP-${wp[1].toUpperCase()}`];
      if (st) saveStatus({ ...st, approvedAt: new Date().toISOString() });
      console.log(`posted. ${st ? `approvedAt recorded for ${st.id}.` : 'no status file matched the branch name; none updated.'}`);
    };
  } else {
    const detail = rest.join(' ');
    action = `append a row to remake/attest.csv: key "${key}"${detail ? `, detail "${detail}"` : ''}`;
    post = () => { appendAttest([new Date().toISOString().slice(0, 10), key, detail, 'wp:attest'], repoRoot()); console.log('row appended to remake/attest.csv. Commit it.'); };
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`About to ${action}.\nType "yes" to confirm: `)).trim().toLowerCase();
  rl.close();
  if (answer !== 'yes') { console.error('not confirmed; nothing recorded.'); return 1; }
  post();
  return 0;
}

try { process.exitCode = await main(process.argv.slice(2)); } catch (e) { console.error(`wp:attest failed: ${e.message}`); process.exitCode = 1; }
