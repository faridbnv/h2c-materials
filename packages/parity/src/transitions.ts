// Transition files: parity/transitions/<date>-<topic>.json. A deliberate change is listed with its exact differences;
// the run passes only when the observed differences equal the listed ones, no more and no fewer.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canon } from './canon.ts';
import { TIERS } from './types.ts';
import type { Difference, TransitionFile, TransitionMatch } from './types.ts';
import { compareStrings } from './util.ts';

const KINDS = ['science', 'determinism', 'display', 'wording'] as const;
const tuple = (d: Difference) => canon([d.case, d.record, d.tier, d.field, d.before, d.after]);

export const sortDifferences = (ds: readonly Difference[]): Difference[] =>
  [...ds].sort((a, b) => compareStrings(tuple(a), tuple(b)));

/** sha256 over the sorted tuple list: editing a listed difference without re-deriving the digest is caught on load. */
export const digestOf = (ds: readonly Difference[]): string =>
  `sha256:${createHash('sha256').update(sortDifferences(ds).map(tuple).join('\n')).digest('hex')}`;

export const sealOf = (t: Pick<TransitionFile, 'id' | 'kind' | 'ruling' | 'corpus' | 'digest'>): string =>
  `sha256:${createHash('sha256').update(canon([t.id, t.kind, t.ruling, t.corpus, t.digest])).digest('hex')}`;

export function buildTransition(t: Omit<TransitionFile, 'digest' | 'seal'>): TransitionFile {
  const digest = digestOf(t.differences);
  return { ...t, differences: sortDifferences(t.differences), digest, seal: sealOf({ ...t, digest }) };
}

/** Throws a readable error for anything a transition file must not be. */
export function validateTransition(t: unknown, where: string): TransitionFile {
  const bad = (why: string): never => { throw new Error(`transition ${where}: ${why}`); };
  if (typeof t !== 'object' || t === null) return bad('not an object');
  const f = t as Partial<TransitionFile>;
  for (const k of ['id', 'description', 'ruling', 'corpus', 'digest'] as const) {
    if (typeof f[k] !== 'string' || !f[k]!.trim()) bad(`"${k}" must be a non-empty string`);
  }
  if (!KINDS.includes(f.kind as never)) bad(`"kind" must be one of ${KINDS.join(', ')}`);
  if (!Array.isArray(f.differences)) bad('"differences" must be a list');
  for (const d of f.differences!) {
    const ok = d && typeof d === 'object' && ['case', 'record', 'field', 'before', 'after'].every((k) => typeof (d as never)[k] === 'string')
      && TIERS.includes((d as Difference).tier);
    if (!ok) bad(`a difference is malformed: ${JSON.stringify(d)}`);
  }
  // Pack 07 section 5.3: a decision or evidence difference is science (or a determinism fix) and needs a cited ruling.
  for (const d of f.differences!) {
    if ((d.tier === 'decision' || d.tier === 'evidence') && f.kind !== 'science' && f.kind !== 'determinism') {
      bad(`a ${d.tier} difference (${d.record}) needs kind "science" or "determinism", not "${f.kind}"`);
    }
  }
  if (f.digest !== digestOf(f.differences!)) bad('digest does not match the listed differences (was the list edited by hand?)');
  if (f.seal !== sealOf(f as TransitionFile)) bad('seal does not match id, kind, ruling, corpus and digest (was the file edited by hand?)');
  return f as TransitionFile;
}

export function loadTransitions(dir: string): TransitionFile[] {
  let names: string[];
  try {
    names = readdirSync(dir).filter((n) => n.endsWith('.json')).sort();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
  return names.map((n) => {
    const f = validateTransition(JSON.parse(readFileSync(join(dir, n), 'utf8')), n);
    return Object.assign(f, { __file: n });
  }) as TransitionFile[];
}

/**
 * Observed differences against listed ones. `scope` is the set of cases this run evaluated; a listed difference for
 * a case outside it is skipped (a partial run), but one naming a case the whole corpus does not hold is an error.
 */
export function matchTransitions(
  observed: readonly Difference[], files: readonly TransitionFile[], scope: ReadonlySet<string>, known: ReadonlySet<string>,
  corpusName?: string,
): TransitionMatch {
  for (const f of files) {
    if (corpusName !== undefined && f.corpus !== corpusName) throw new Error(`transition ${f.id} is for corpus ${f.corpus}, not ${corpusName}`);
  }
  const listed = new Map<string, Difference>();
  for (const f of files) {
    for (const d of f.differences) {
      if (!known.has(d.case)) throw new Error(`transition ${f.id} names case ${d.case}, which is not in the corpus`);
      const k = tuple(d);
      if (listed.has(k)) throw new Error(`transition ${f.id} lists a difference another transition already lists: ${k}`);
      listed.set(k, d);
    }
  }
  const inScope = [...listed].filter(([, d]) => scope.has(d.case));
  const seen = new Set(observed.map(tuple));
  const expectedKeys = new Set(inScope.map(([k]) => k));
  return {
    files: files.map((f) => f.id),
    expected: inScope.length,
    skippedOutOfScope: listed.size - inScope.length,
    unexpected: sortDifferences(observed.filter((d) => !expectedKeys.has(tuple(d)))),
    missing: sortDifferences(inScope.filter(([k]) => !seen.has(k)).map(([, d]) => d)),
  };
}
