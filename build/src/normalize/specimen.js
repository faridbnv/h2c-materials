// The specimen form and the post-processing state of a measurement, as the estimate model, the implied bounds and
// the headline check need them. Each value of schema/vocab/specimen-types.csv declares its Form and each value of
// schema/vocab/post-processing.csv its State, so a new wording is either declared or fails the build; nothing is
// inferred from the words themselves (the pattern of normalize/moisture.js).
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../csv.js';

export const SPECIMEN_FORMS = ['printed', 'not-stated', 'moulded', 'film', 'filament'];
export const POST_PROCESSING_STATES = ['as-printed', 'annealed', 'not-stated'];

const here = dirname(fileURLToPath(import.meta.url));
const declared = (file, column, allowed) => {
  const map = new Map(readCsv(join(here, '../../../schema/vocab', file)).records.map((r) => [r.values.Value, r.values[column]]));
  for (const [value, state] of map) {
    if (!allowed.includes(state)) throw new Error(`schema/vocab/${file}: "${value}" has ${column} "${state ?? ''}"; write one of ${allowed.join(', ')}`);
  }
  return (value) => {
    const state = map.get(value);
    if (!state) throw new Error(`"${value}" is not in schema/vocab/${file}`);
    return state;
  };
};

/** The declared form of a Specimen type value: printed, not-stated, moulded (a raw-material value), film or filament. */
export const specimenForm = declared('specimen-types.csv', 'Form', SPECIMEN_FORMS);

/** The declared state of a Post-processing value: as-printed, annealed or not-stated. */
export const postProcessingState = declared('post-processing.csv', 'State', POST_PROCESSING_STATES);

/**
 * The annealing schedule a Post-processing wording states: { tempC, hours }, each a number or null where the wording
 * gives none. It checks the typed columns Anneal °C and Anneal h (typed-values.js, PARSE-MISMATCH); the build decides
 * on those columns, so three spellings of one schedule ("8 h", "8 hours", "8 h ours") are one state.
 */
export function parseAnnealSchedule(text) {
  if (postProcessingState(text ?? 'Not published') !== 'annealed') return null;
  const m = /anneal\w*(?:\s+and\s+dried)?\s+at\s+(\d+(?:\.\d+)?)\s*[°˚]\s*C(?:\s+for\s+(\d+(?:\.\d+)?)\s*(hours?|h\s+ours|h|min)\b)?/i.exec(text ?? '');
  if (!m) return { tempC: null, hours: null };
  const amount = m[2] == null ? null : Number(m[2]);
  return { tempC: Number(m[1]), hours: amount == null ? null : /^min/i.test(m[3]) ? Number((amount / 60).toFixed(4)) : amount };
}

/**
 * Whether a measurement describes a printed part at all. A moulded bar, a drawn film or a filament strand is
 * another specimen: stronger, stiffer or more crystalline than a printed part, so it neither bounds nor stands in
 * for a printed headline without a documented conversion.
 */
export const isPartSpecimen = (specimenType) => ['printed', 'not-stated'].includes(specimenForm(specimenType ?? 'Not published'));

const stateOf = (m) => postProcessingState(m.postProcessing ?? 'Not published');

/**
 * An annealed measurement whose grade also publishes the same property as printed. Annealing crystallises a
 * semicrystalline or filled part and can raise its heat deflection by 50 °C (PET-GF 81.6 and 133.7 °C), so the two
 * are different states of the part, not repeats. Headlines are as printed; the annealed value stays evidence.
 */
export function annealedBesideAsPrinted(m, measurements) {
  return stateOf(m) === 'annealed' && (measurements ?? []).some((x) => x !== m && x.gradeId === m.gradeId
    && x.property === m.property && !x.quarantined && stateOf(x) === 'as-printed');
}
