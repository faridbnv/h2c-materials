// A sample "old" module: the shape of a label-only conversion (a gate verdict mapped to a status).
import { tidy } from './tidy.js';

export const GATE_STATUS = { within: 'pass', edge: 'indeterminate', exceeds: 'fail', unknown: 'unknown' };

export function statusOf(verdict, fallback = 'unknown') {
  const key = tidy(verdict);
  if (key in GATE_STATUS) return GATE_STATUS[key];
  return fallback;
}

export async function statuses(verdicts) {
  const found = await Promise.all(verdicts.map((v) => statusOf(v)));
  return found.filter((s) => s !== 'unknown');
}
