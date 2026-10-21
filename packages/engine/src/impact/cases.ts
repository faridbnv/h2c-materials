// The questions the impact preview asks of both sides: the six templates in their modes and the 138-case decision census
// (parity corpus v0, groups `template` and `census`). A question that needs estimates cannot be answered on a core
// compile; it is deferred, and the report says so ("estimates pending", 02 section 11).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EVIDENCE_LEVELS, UNKNOWN_POLICIES } from '@atlas/domain';
import { BoundaryError, isRecord, moistureOf, oneOf } from '../guards.ts';
import { REPO_ROOT } from '../old-engine.ts';
import { isScenarioConstraint } from '../scenario.ts';
import type { Question } from '../scenario.ts';

export interface ImpactCase {
  readonly id: string;
  readonly group: 'template' | 'census';
  readonly name: string;
  readonly question: Question;
}

export const CORPUS_FILE = join(REPO_ROOT, 'parity', 'corpus', 'v0.json');

function questionOf(value: unknown, id: string): Question {
  if (!isRecord(value) || !Array.isArray(value.constraints) || !value.constraints.every(isScenarioConstraint)) throw new BoundaryError(`${id}: no requirements list`);
  const { useEstimates, anneal, annealMaxC } = value;
  if (typeof useEstimates !== 'boolean' || typeof anneal !== 'boolean') throw new BoundaryError(`${id}: useEstimates and anneal must be true or false`);
  if (annealMaxC !== null && typeof annealMaxC !== 'number') throw new BoundaryError(`${id}: annealMaxC must be a number or null`);
  return {
    constraints: value.constraints, unknownPolicy: oneOf(UNKNOWN_POLICIES, value.unknownPolicy, id), useEstimates,
    evidence: oneOf(EVIDENCE_LEVELS, value.evidence, id), moisture: moistureOf(String(value.moisture)), anneal, annealMaxC,
  };
}

/** The template and census cases of a parity corpus file. */
export function loadImpactCases(file: string = CORPUS_FILE): ImpactCase[] {
  const corpus: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!isRecord(corpus) || !Array.isArray(corpus.cases)) throw new BoundaryError(`${file} holds no cases`);
  const out: ImpactCase[] = [];
  const cases: unknown[] = corpus.cases;
  for (const c of cases) {
    if (!isRecord(c) || typeof c.id !== 'string' || typeof c.name !== 'string') throw new BoundaryError(`${file}: a case without an id and a name`);
    if (c.group === 'template' || c.group === 'census') out.push({ id: c.id, group: c.group, name: c.name, question: questionOf(c.scenario, c.id) });
  }
  if (out.length === 0) throw new BoundaryError(`${file} holds no template or census case`);
  return out;
}

/** Whether the question's answer rests on the estimate stage (Explore with estimates on). */
export const needsEstimates = (c: ImpactCase): boolean => c.question.unknownPolicy === 'exploration' && c.question.useEstimates;
