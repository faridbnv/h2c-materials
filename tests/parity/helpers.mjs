// Shared by the parity tests: the corpus, a db, adapters, and a small subset that every fault can be caught in.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mutationCases } from '../../packages/parity/src/corpora.ts';
import { loadCorpus } from '../../packages/parity/src/corpus.ts';
import { createOld, readDb } from '../../packages/parity/src/old-adapter.ts';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const cli = join(root, 'packages', 'parity', 'src', 'cli.ts');
export const corpus = loadCorpus();
export const db = readDb();

/** All template cases, the first 60 census cases, the first 150 random ones: fast, and every fault is visible in it. */
export const subset = mutationCases(corpus);
export const small = subset.filter((c) => c.group === 'template').slice(0, 8);

export const sha = (rel) => createHash('sha256').update(readFileSync(join(root, rel))).digest('hex');
export const engineFiles = ['constraints', 'products', 'ledger', 'scenario', 'indices', 'workspace', 'coverage', 'search', 'filler', 'pareto'].map((n) => `app/js/engine/${n}.js`);

/**
 * What the CLI tests select (--only is a prefix of the case id): the five cases of one template question, in place of all 30 templates.
 * The CLI tests hold exit codes, flags and report text, none of which depends on how many cases are replayed, and an evaluation costs
 * about 0.25 s a side; the whole corpus (1,306 cases) still runs in CI's `npm run parity -- --noop` step, on every pull request.
 */
export const CLI_ONLY = 'template/outdoor-structural-part/';
export const CLI_SMALL = ['--only', CLI_ONLY, '--allow-partial'];

let sharedOldAdapter;
/**
 * The old engine as the `before` side, made once per test file and remembering its answer to each case object it is asked.
 * Evaluating a case is pure, so asking again gives the same answer; a test that compares many engines against old (the nine
 * faults, the transitions) then evaluates the old side once instead of once per comparison. The answers are shared, so a test
 * that edits an answer must use createOld(readDb()) for its own copy. The side being tested is never remembered.
 */
export async function sharedOld() {
  if (sharedOldAdapter) return sharedOldAdapter;
  const old = await createOld(readDb());
  const answers = new WeakMap();
  sharedOldAdapter = {
    get name() { return old.name; },
    evaluate(c) {
      if (!answers.has(c)) answers.set(c, old.evaluate(c));
      return answers.get(c);
    },
  };
  return sharedOldAdapter;
}
