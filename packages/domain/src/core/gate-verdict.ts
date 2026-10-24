// The gate-verdict table: one row per print gate verdict, one column per job a copy of it does today (WP-07 shared
// core; research gap-5 section 3 hazard 2). Nothing here is new: each column is read from the old copy named beside it,
// and tests/domain/gate-verdict.test.mjs holds the table equal to every copy, on every gate of a real build.

import type { GateVerdict, Status } from '../contracts/vocab.ts';

/**
 * Best first. build/src/gates.js:19 GATE_PRECEDENCE; also the key order of app/js/engine/constraints.js GATE_STATUS,
 * which app/js/ui/material-facts.js:26 reads as GATE_ORDER and ranks by (printCounts). The order is load-bearing.
 */
export const GATE_PRECEDENCE = ['within', 'within-low-end', 'edge', 'exceeds-recommended', 'exceeds', 'unknown'] as const;

export type GateRow = {
  /** What a requirement on the gate answers: constraints.js:33-40 GATE_STATUS. */
  readonly status: Status;
  /** The H2C reaches only the bottom of the window: constraints.js:585 sets onTheLine; filters.js:229 counts them. */
  readonly onTheLine: boolean;
  /** Counted as within the H2C: material-facts.js:731 printCounts (`within`). */
  readonly within: boolean;
  /** Within, at the low end of the window (D151): material-facts.js:732 (`lowEnd`), print-spread.js:78. */
  readonly lowEnd: boolean;
  /**
   * Outside the H2C's limits, required or recommended, or reached only at the edge: print-spread.js:22 OUTSIDE,
   * labels.js:541 OUTSIDE_WORDS keys, build/src/chamber-need.js:40 ABOVE, and material-facts.js:731 (`over`: neither
   * within nor unknown).
   */
  readonly outside: boolean;
};

/** The table. Key order is GATE_PRECEDENCE. */
export const GATE_TABLE = {
  within: { status: 'PASS', onTheLine: false, within: true, lowEnd: false, outside: false },
  'within-low-end': { status: 'PASS', onTheLine: false, within: true, lowEnd: true, outside: false },
  edge: { status: 'INDETERMINATE', onTheLine: true, within: false, lowEnd: false, outside: true },
  'exceeds-recommended': { status: 'INDETERMINATE', onTheLine: false, within: false, lowEnd: false, outside: true },
  exceeds: { status: 'FAIL', onTheLine: false, within: false, lowEnd: false, outside: true },
  unknown: { status: 'UNKNOWN', onTheLine: false, within: false, lowEnd: false, outside: false },
} as const satisfies Record<GateVerdict, GateRow>;

/** The status column alone, in precedence order: the shape of constraints.js GATE_STATUS. */
export const GATE_STATUS = {
  within: GATE_TABLE.within.status,
  'within-low-end': GATE_TABLE['within-low-end'].status,
  edge: GATE_TABLE.edge.status,
  'exceeds-recommended': GATE_TABLE['exceeds-recommended'].status,
  exceeds: GATE_TABLE.exceeds.status,
  unknown: GATE_TABLE.unknown.status,
} as const satisfies Record<GateVerdict, Status>;

const KNOWN: ReadonlySet<string> = new Set(GATE_PRECEDENCE);

/** Whether `v` is one of the six verdicts. */
export const isGateVerdict = (v: unknown): v is GateVerdict => typeof v === 'string' && KNOWN.has(v);

/** A verdict's row; a word nobody wrote reads as unknown, as labels.js gateVerdict and constraints.js:585 read it. */
export const gateRow = (v: unknown): GateRow => GATE_TABLE[isGateVerdict(v) ? v : 'unknown'];

/** What a requirement on the gate answers: constraints.js:585 `GATE_STATUS[g.verdict] ?? STATUS.UNKNOWN`. */
export const gateStatus = (v: unknown): Status => gateRow(v).status;

/**
 * The verdict a gate across several profiles takes: the first in precedence that any profile holds, else unknown
 * (build/src/gates.js aggregateGate, its verdict only; which profile supplies the reason is not decided here).
 */
export function strongestVerdict(verdicts: readonly unknown[]): GateVerdict {
  for (const v of GATE_PRECEDENCE) if (verdicts.includes(v)) return v;
  return 'unknown';
}
