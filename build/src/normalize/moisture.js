// The moisture state at test, as the estimate model needs it: dry, conditioned (humidity or water) or not
// stated. Each value of schema/vocab/moisture-conditions.csv declares its State, so a new wording is either
// declared or fails the build; nothing is inferred from the words themselves.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../csv.js';

export const MOISTURE_STATES = ['dry', 'conditioned', 'not-stated'];

const here = dirname(fileURLToPath(import.meta.url));
const STATE = new Map(readCsv(join(here, '../../../schema/vocab/moisture-conditions.csv')).records.map((r) => [r.values.Value, r.values.State]));
for (const [value, state] of STATE) {
  if (!MOISTURE_STATES.includes(state)) throw new Error(`schema/vocab/moisture-conditions.csv: "${value}" has State "${state ?? ''}"; write one of ${MOISTURE_STATES.join(', ')}`);
}

/** The declared state of a Moisture condition value. */
export function moistureState(value) {
  const state = STATE.get(value);
  if (!state) throw new Error(`Moisture condition "${value}" is not in schema/vocab/moisture-conditions.csv`);
  return state;
}
