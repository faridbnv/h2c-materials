// Shared by the parity tests: the corpus, a db, adapters, and a small subset that every fault can be caught in.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mutationCases } from '../../packages/parity/src/corpora.ts';
import { loadCorpus } from '../../packages/parity/src/corpus.ts';
import { readDb } from '../../packages/parity/src/old-adapter.ts';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const cli = join(root, 'packages', 'parity', 'src', 'cli.ts');
export const corpus = loadCorpus();
export const db = readDb();

/** All template cases, the first 60 census cases, the first 150 random ones: fast, and every fault is visible in it. */
export const subset = mutationCases(corpus);
export const small = subset.filter((c) => c.group === 'template').slice(0, 8);

export const sha = (rel) => createHash('sha256').update(readFileSync(join(root, rel))).digest('hex');
export const engineFiles = ['constraints', 'products', 'ledger', 'scenario', 'indices', 'workspace', 'coverage', 'search', 'filler', 'pareto'].map((n) => `app/js/engine/${n}.js`);
