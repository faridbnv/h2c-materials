// A sample "old" module: the shape of a label-only conversion (a gate verdict mapped to a status).
import { tidy } from './tidy.ts';

export type GateVerdict = 'within' | 'edge' | 'exceeds' | 'unknown';
export type Status = 'pass' | 'indeterminate' | 'fail' | 'unknown';

export const GATE_STATUS: Record<GateVerdict, Status> = { within: 'pass', edge: 'fail', exceeds: 'fail', unknown: 'unknown' };

export function statusOf(verdict: string, fallback: Status = 'unknown'): Status {
  const key = tidy(verdict);
  if (key in GATE_STATUS) return GATE_STATUS[key as GateVerdict];
  return fallback;
}

export async function statuses(verdicts: readonly string[]): Promise<Status[]> {
  const found = await Promise.all(verdicts.map((v) => statusOf(v)));
  return found.filter((s) => s !== 'unknown');
}
