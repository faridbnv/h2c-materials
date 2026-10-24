// The corpora WP-05 (b) adds. None of them is a file: parity/corpus/** needs the owner's attest, so these are generated at
// run time, deterministically, from seeds that live in this package, and tests/parity/ pins their digests. A change to a
// seed, to a generator or to a list therefore fails a test instead of silently moving what is asked.
//
//   milestone engine corpus   corpus v0's templates and census, plus 5,000 seeded scenarios (the same LCG as v0's 1,000, so
//                             its first 1,000 are exactly v0's)
//   tie-shuffle sample        ties.ts: a seeded sample of v0, replayed on a db with permuted product orders
//   historic links            historic-links.ts: harvested from the repo's tests and docs
import { randomCases, RANDOM_SEED } from './corpus.ts';
import type { Db } from './old-adapter.ts';
import type { Corpus, CorpusCase } from './types.ts';

/** Replays per code PR (the corpus v0 random group) and at a milestone exit (pack 07 section 5.4). */
export const PR_REPLAYS = 1000;
export const MILESTONE_REPLAYS = 5000;

/** The engine corpus of a run: v0 as it is, or v0's templates and census plus the milestone replays. */
export function engineCorpusCases(v0: Corpus, db: Db, milestone: boolean): CorpusCase[] {
  if (!milestone) return v0.cases;
  return [...v0.cases.filter((c) => c.group !== 'random'), ...randomCases(db, MILESTONE_REPLAYS, RANDOM_SEED)];
}

/**
 * A made-up database with just the fields the random generator reads, so its digest can be pinned without depending on the
 * data (which moves daily). Every number here is arbitrary and nothing but a test reads it.
 */
export function syntheticDb(): Db {
  const properties = ['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY', 'hdt045', 'priceCADkg'];
  const statuses = ['supported', 'untested', 'unsupported'];
  const materials = Array.from({ length: 24 }, (_, i) => {
    const headline: Record<string, unknown> = {};
    properties.forEach((p, k) => {
      const value = 10 * (k + 1) * (1 + ((i * 7 + k * 3) % 11) / 4);
      headline[p] = i % 5 === 0 && k === 2 ? { known: false } : {
        known: true, value, interval: { lo: value * 0.9, hi: value * 1.1, kind: 'range' },
        estimate: i % 3 === 0 ? { plausible: { lo: value * 0.5, hi: value * 1.5 } } : undefined, loadBracket: i % 4 === 0 ? { hi: value * 1.2 } : undefined,
      };
    });
    return { id: `S${String(i + 1).padStart(3, '0')}`, familyEntry: i === 23, h2cStatus: statuses[i % statuses.length], headline };
  });
  return {
    meta: { environmentCategories: { acid: 'Acid', base: 'Base', uv: 'UV light', fuel: 'Fuel' }, release: { id: 'synthetic' }, snapshot: 'synthetic' },
    materials, grades: [], measurements: [], evidence: [], coverage: [],
  };
}

/**
 * The cases the nine-fault self-test replays: every template case, the first 60 of the census and the first 150 random ones.
 * Small enough to run nine times, and every fault in faults.ts shows in it (tests/parity/fault.test.mjs holds that).
 */
export function mutationCases(v0: Corpus): CorpusCase[] {
  return [
    ...v0.cases.filter((c) => c.group === 'template'),
    ...v0.cases.filter((c) => c.group === 'census').slice(0, 60),
    ...v0.cases.filter((c) => c.group === 'random').slice(0, 150),
  ];
}
