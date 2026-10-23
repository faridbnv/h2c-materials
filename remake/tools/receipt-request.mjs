#!/usr/bin/env node
// What candidate-receipt.yml may do with a push (M4 close). The candidate receipt must be made on CI (linux-x64, the .nvmrc Node): a receipt made
// on the owner's Mac fails parity and tests-parity by the known host difference (L-07). A branch-only workflow cannot be dispatched (GitHub
// dispatches only workflows on the default branch, which is frozen), so a receipt is requested the way a restore is: by committing a file.
//
//   remake/control/receipt.json   {"schema": 1, "sha": "<40 hex>"}   make the receipt of that commit
//                                 {"schema": 1, "sha": null}         no request
//
// The workflow's plan job runs `node remake/tools/receipt-request.mjs plan` (Node built-ins only; environment PUSH_SHA). The commit must be an
// ancestor of the pushed commit, which is on remake/v3: a receipt is never made for a commit outside the integration branch. The file is NOT a
// restore request: cutover.mjs does not read it as a control change (isRestoreControl).
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMain, repoRoot } from './wp-lib.mjs';

export const RECEIPT_REQUEST_PATH = 'remake/control/receipt.json';
const SHA = /^[0-9a-f]{40}$/;

/** The commit a parsed request names, or null for no request. Throws a sentence for anything else. */
export function validateReceiptRequest(json) {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) throw new Error(`${RECEIPT_REQUEST_PATH} must be a JSON object`);
  const extra = Object.keys(json).filter((k) => !['schema', 'sha', '$comment'].includes(k));
  if (extra.length) throw new Error(`${RECEIPT_REQUEST_PATH}: unknown field(s): ${extra.join(', ')}`);
  if (json.schema !== 1) throw new Error(`${RECEIPT_REQUEST_PATH}: schema must be 1`);
  if (json.sha === null) return null;
  if (typeof json.sha !== 'string' || !SHA.test(json.sha)) throw new Error(`${RECEIPT_REQUEST_PATH}: sha must be null or a 40-character lowercase commit id`);
  return json.sha;
}

/**
 * @param {{ text: string|null, isAncestor: (sha: string) => boolean }} input  `text` is the file's contents (null when it is missing)
 * @returns {{ run: boolean, sha: string|null, refused: boolean, reason: string }}
 */
export function planReceipt({ text, isAncestor }) {
  const out = (o) => ({ run: false, sha: null, refused: false, ...o });
  if (text === null) return out({ refused: true, reason: `${RECEIPT_REQUEST_PATH} is missing` });
  let sha;
  try { sha = validateReceiptRequest(JSON.parse(text)); } catch (e) { return out({ refused: true, reason: e.message }); }
  if (sha === null) return out({ reason: 'no receipt requested (sha is null)' });
  if (!isAncestor(sha)) return out({ refused: true, reason: `${sha.slice(0, 8)} is not an ancestor of the pushed commit, so it is not on remake/v3: no receipt is made for it` });
  return out({ run: true, sha, reason: `make the receipt of ${sha.slice(0, 8)}` });
}

function cli() {
  const env = process.env;
  const root = repoRoot();
  const push = env.PUSH_SHA ?? '';
  if (!SHA.test(push)) throw new Error(`PUSH_SHA is not a 40-character commit: "${push}"`);
  const file = join(root, RECEIPT_REQUEST_PATH);
  const plan = planReceipt({
    text: existsSync(file) ? readFileSync(file, 'utf8') : null,
    isAncestor: (sha) => spawnSync('git', ['merge-base', '--is-ancestor', sha, push], { cwd: root }).status === 0,
  });
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `run=${plan.run}\nsha=${plan.sha ?? ''}\n`);
  const summary = `candidate-receipt plan: ${plan.refused ? 'REFUSED' : plan.run ? 'run' : 'nothing to do'}. ${plan.reason}`;
  console.log(summary);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  if (plan.refused) console.error(`::error::${plan.reason}`);
  return plan.refused ? 1 : 0;
}

if (isMain(import.meta.url)) {
  try {
    if (process.argv[2] !== 'plan') throw new Error('usage: receipt-request.mjs plan (reads PUSH_SHA)');
    process.exitCode = cli();
  } catch (e) { console.error(`receipt-request failed: ${e.message}`); process.exitCode = 1; }
}
