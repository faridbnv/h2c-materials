// The specimen form and the post-processing state of a measurement, as the estimate model, the implied bounds and
// the headline check need them.
//
// Specimen type is a curated list: each value of schema/vocab/specimen-types.csv declares its Form, because the ten
// wordings are the database's own, not a datasheet's. Post-processing is a datasheet sentence, so its state is a
// typed column on the row (Post-processing state, m43) and readPostProcessingState below reads the sentence only as
// a check (typed-values.js, PARSE-MISMATCH), the pattern of normalize/moisture.js.
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

/** The declared post-processing state of a measurement row's typed column. */
export function postProcessingState(state) {
  if (!POST_PROCESSING_STATES.includes(state)) throw new Error(`Post-processing state "${state ?? ''}" is not one of ${POST_PROCESSING_STATES.join(', ')}`);
  return state;
}

/**
 * What a Post-processing wording plainly says, or null where it does not say. "Not annealed" and "unannealed" are
 * read first, so a sentence that denies annealing is never read as annealing; a sentence that only mentions resting
 * at room temperature states no heat treatment either way, and the column decides.
 */
export function readPostProcessingState(text) {
  const s = String(text ?? '').trim();
  if (s === 'Not published') return 'not-stated';
  if (/not annealed|unannealed/i.test(s)) return 'as-printed';
  if (s === 'As printed') return 'as-printed';
  if (/anneal/i.test(s)) return 'annealed';
  return null;
}

/**
 * The annealing schedule a Post-processing wording states: { tempC, hours }, each a number or null where the wording
 * gives none. It checks the typed columns Anneal °C and Anneal h (typed-values.js, PARSE-MISMATCH); the build decides
 * on those columns, so three spellings of one schedule ("8 h", "8 hours", "8 h ours") are one state. `state` is the
 * row's typed Post-processing state: a wording only states a schedule where the row says it was annealed.
 */
export function parseAnnealSchedule(text, state) {
  if (postProcessingState(state) !== 'annealed') return null;
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

const stateOf = (m) => postProcessingState(m.postProcessingState);

/**
 * An annealed measurement whose grade also publishes the same property as printed. Annealing crystallises a
 * semicrystalline or filled part and can raise its heat deflection by 50 °C (PET-GF 81.6 and 133.7 °C), so the two
 * are different states of the part, not repeats. Headlines are as printed; the annealed value stays evidence.
 */
export function annealedBesideAsPrinted(m, measurements) {
  return stateOf(m) === 'annealed' && (measurements ?? []).some((x) => x !== m && x.gradeId === m.gradeId
    && x.property === m.property && !x.quarantined && stateOf(x) === 'as-printed');
}

/**
 * The same, for water. A sheet that publishes a property dry and conditioned publishes two states of one part,
 * and a headline describes the dry one. Averaged they became one figure neither test gives: Siraya's Fibreheart
 * PPA prints a heat deflection of 81 °C dry and 61 °C conditioned, and the pair read as one 71 °C bar.
 */
export function conditionedBesideDry(m, measurements) {
  return m?.moistureState === 'conditioned' && (measurements ?? []).some((x) => x !== m && x.gradeId === m.gradeId
    && x.property === m.property && !x.quarantined && x.moistureState !== 'conditioned'
    && (x.thermal?.loadMPa ?? null) === (m.thermal?.loadMPa ?? null));
}
