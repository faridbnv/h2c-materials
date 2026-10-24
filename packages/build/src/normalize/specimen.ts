// The specimen form and the post-processing state of a measurement, as the estimate model, the implied bounds and
// the headline check need them.
//
// Specimen type is a curated list: each value of schema/vocab/specimen-types.csv declares its Form, because its
// wordings are the database's own, not a datasheet's. Post-processing is a datasheet sentence, so its state is a
// typed column on the row (Post-processing state, m43) and readPostProcessingState below reads the sentence only as
// a check (typed-values.js, PARSE-MISMATCH), the pattern of normalize/moisture.js.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../csv.ts';
import type { Dyn } from '../types.ts';

// off-recipe: a bar printed at a setting its sheet prints beside the one the product is meant for (D95: colorFabb's
// lightweight PETs, which foam at 260 °C, printed unfoamed at 210 °C), or below 100 % infill (D130: 3DJake's bars at
// 20 %). A printed bar, but not of the product as it is printed, so it is no part specimen of it, bounds nothing and is
// no estimate observation.
export const SPECIMEN_FORMS = ['printed', 'not-stated', 'moulded', 'film', 'filament', 'off-recipe'];
export const POST_PROCESSING_STATES = ['as-printed', 'annealed', 'not-stated'];

const here = dirname(fileURLToPath(import.meta.url));
const declared = (file: Dyn, column: Dyn, allowed: Dyn) => {
  const map = new Map<Dyn, Dyn>(readCsv(join(here, '../../../../schema/vocab', file)).records.map((r) => [r.values.Value, r.values[column]]));
  for (const [value, state] of map) {
    if (!allowed.includes(state)) throw new Error(`schema/vocab/${file}: "${value}" has ${column} "${state ?? ''}"; write one of ${allowed.join(', ')}`);
  }
  return (value: Dyn) => {
    const state = map.get(value);
    if (!state) throw new Error(`"${value}" is not in schema/vocab/${file}`);
    return state;
  };
};

/** The declared form of a Specimen type value: printed, not-stated, moulded (a raw-material value), film, filament or off-recipe. */
export const specimenForm = declared('specimen-types.csv', 'Form', SPECIMEN_FORMS);

const pointsToMouldingOf = declared('specimen-types.csv', 'Points to moulding', ['TRUE', 'FALSE']);
/**
 * Whether a Specimen type says the value's document points to moulded or resin bars beside it (D172's counter-indications:
 * a mould shrinkage with a value, typical, resin or reference data). Such a bar is set apart like any undescribed one, and
 * never counts where a headline lets an undescribed bar count (headline_definitions.csv Undescribed bar counts for, D177).
 */
export const pointsToMoulding = (specimenType: Dyn) => pointsToMouldingOf(specimenType ?? 'Not published') === 'TRUE';

/**
 * Whether a value from a bar no document describes as printed counts for a headline all the same (D177): the build marks
 * it (products.js markUndescribedCounts, m.countsUndescribed) where the headline's Undescribed bar counts for names its
 * product's kind of plastic. A copy of a set-apart figure on a lower-ranked document (m.setApartBy, D171) never counts.
 * Read wherever a printed bar is asked for: a product's value (assess), a lower bound, an evidence-ledger row.
 */
export const countsUndescribed = (m: Dyn, def: Dyn) => !m.setApartBy && !!m.countsUndescribed?.includes(def.key);

/** Why an off-recipe bar is not the product's value, in words a reader can check against the row (D95, D130). */
export const offRecipeWhy = (specimenType: Dyn, { brief = false }: Dyn = {}) => (specimenType === 'Printed specimen at partial infill'
  ? 'printed below 100 % infill, a part filled that far rather than the material as a solid part (D130)'
  : brief ? 'printed at a setting the product is not meant for (D95)'
    : 'printed at a setting its sheet prints beside the one the product is meant for, not the product as it is printed (D95)');

/** The declared post-processing state of a measurement row's typed column. */
export function postProcessingState(state: Dyn) {
  if (!POST_PROCESSING_STATES.includes(state)) throw new Error(`Post-processing state "${state ?? ''}" is not one of ${POST_PROCESSING_STATES.join(', ')}`);
  return state;
}

/**
 * What a Post-processing wording plainly says, or null where it does not say. "Not annealed" and "unannealed" are
 * read first, so a sentence that denies annealing is never read as annealing; a sentence that only mentions resting
 * at room temperature states no heat treatment either way, and the column decides.
 */
export function readPostProcessingState(text: Dyn) {
  const s = String(text ?? '').trim();
  if (s === 'Not published') return 'not-stated';
  // Raise3D heads its first table "Conditioned, before annealed" and BASF its columns "as printed without annealing" or
  // "non-annealed" (m298): each denies the annealing the next table states. Flashforge's note says "the printed model has
  // not been annealed", which read as annealing (gap round 2's blind draw). DREMC's note says "Test sample is un-annealing".
  if (/not (?:been |be )?annealed|un-?anneal\w*|non-?annealed|before anneal\w*|without anneal\w*|no anneal\w*/i.test(s)) return 'as-printed';
  if (s === 'As printed') return 'as-printed';
  // Polish sheets print "wyżarzone" (annealed) in the row label (quality round 2026-10-07).
  if (/anneal|wyżarz/i.test(s)) return 'annealed';
  return null;
}

/**
 * The annealing schedule a Post-processing wording states: { tempC, hours }, each a number or null where the wording
 * gives none. It checks the typed columns Anneal °C and Anneal h (typed-values.js, PARSE-MISMATCH); the build decides
 * on those columns, so three spellings of one schedule ("8 h", "8 hours", "8 h ours") are one state. `state` is the
 * row's typed Post-processing state: a wording only states a schedule where the row says it was annealed.
 */
export function parseAnnealSchedule(text: Dyn, state: Dyn) {
  if (postProcessingState(state) !== 'annealed') return null;
  // A sheet may state the schedule the short way round, the time first and the temperature after an at sign:
  // Spectrum prints "annealed (4h @ 90°C)" beside its heat deflection rows. It is the same schedule, and reading
  // it left to right made the temperature 4.
  const brief = /anneal\w*\s*\(?\s*(\d+(?:[.,]\d+)?)\s*(hours?|h|min)\s*@\s*(\d+(?:[.,]\d+)?)\s*[°º˚]?\s*C/i.exec(text ?? '');
  if (brief) {
    const amount = Number(String(brief[1]).replace(',', '.'));
    return { tempC: Number(String(brief[3]).replace(',', '.')), hours: /^min/i.test(brief[2]!) ? Number((amount / 60).toFixed(4)) : amount };
  }
  // QIDI prints the temperature first and the time after the word: "Post-processing: 100°C Annealing 8 hours",
  // "100℃ Annealing 8hours" (the research intake of 2026-10-19, D168).
  const lead = /(\d+(?:[.,]\d+)?)\s*(?:[°º˚]?\s*C|℃)\s+anneal\w*\s+(\d+(?:[.,]\d+)?)\s*(hours?|h|min)\b/i.exec(text ?? '');
  if (lead) {
    const amount = Number(String(lead[2]).replace(',', '.'));
    return { tempC: Number(String(lead[1]).replace(',', '.')), hours: /^min/i.test(lead[3]!) ? Number((amount / 60).toFixed(4)) : amount };
  }
  // Spectrum prints the schedule with a slash ("annealed at 110°C/20 min"), Raise3D a masculine ordinal ("100 ºC"), and
  // 3D-Fuel no degree sign at all ("annealed at 110 C / 20 min", reader round).
  const m = /anneal\w*(?:\s+and\s+dried)?\s+at\s+(\d+(?:\.\d+)?)\s*[°º˚]?\s*C\b(?:(?:\s+for\s+|\s*\/\s*)(\d+(?:\.\d+)?)\s*(hours?|h\s+ours|h|min)\b)?/i.exec(text ?? '');
  if (!m) return { tempC: null, hours: null };
  const amount = m[2] == null ? null : Number(m[2]);
  return { tempC: Number(m[1]), hours: amount == null ? null : /^min/i.test(m[3]!) ? Number((amount / 60).toFixed(4)) : amount };
}

/**
 * Whether a measurement describes a printed part at all. A moulded bar, a drawn film or a filament strand is
 * another specimen: stronger, stiffer or more crystalline than a printed part, so it neither bounds nor stands in
 * for a printed headline without a documented conversion.
 */
export const isPartSpecimen = (specimenType: Dyn) => ['printed', 'not-stated'].includes(specimenForm(specimenType ?? 'Not published'));

/**
 * A heat treatment at or below its polymer's annealing threshold (polymers.csv Annealing threshold °C: the glass
 * transition of a polymer that crystallises when annealed) crystallises nothing, so the value is the as-printed part's
 * (D158). Bambu Lab's PLA sheets print "annealed and dried at 55 °C for 8 h" over every value; PLA's glass transition is
 * 55-60 °C. The row keeps its words and its typed state; the compiled measurement is judged as printed and says what was
 * done to it (`heatTreatment`). A treatment of unstated temperature, and any treatment of a polymer with no threshold (an
 * amorphous one, whose anneal below its glass transition relieves stress), stays an annealing. Applied in place, once,
 * after a row has inherited its page's statements; returns how many it judged as printed.
 */
export function judgeHeatTreatments(measurements: Dyn, thresholdOf: Dyn) {
  let judged = 0;
  for (const m of measurements) {
    const threshold = thresholdOf(m.materialId);
    if (m.postProcessingState !== 'annealed' || threshold == null || m.anneal?.tempC == null || m.anneal.tempC > threshold) continue;
    m.heatTreatment = { tempC: m.anneal.tempC, hours: m.anneal.hours, thresholdC: threshold, recorded: 'annealed' };
    m.postProcessingState = 'as-printed';
    m.anneal = null;
    judged++;
  }
  return judged;
}

const stateOf = (m: Dyn) => postProcessingState(m.postProcessingState);

/**
 * An annealed measurement whose grade also publishes the same property as printed. Annealing crystallises a
 * semicrystalline or filled part and can raise its heat deflection by 50 °C (PET-GF 81.6 and 133.7 °C), so the two
 * are different states of the part, not repeats. Headlines are as printed; the annealed value stays evidence.
 */
export function annealedBesideAsPrinted(m: Dyn, measurements: Dyn) {
  return stateOf(m) === 'annealed' && (measurements ?? []).some((x: Dyn) => x !== m && x.gradeId === m.gradeId
    && x.property === m.property && !x.quarantined && stateOf(x) === 'as-printed');
}

/**
 * The same, for water. A sheet that publishes a property dry and conditioned publishes two states of one part,
 * and a headline describes the dry one. Averaged they became one figure neither test gives: Siraya's Fibreheart
 * PPA prints a heat deflection of 81 °C dry and 61 °C conditioned, and the pair read as one 71 °C bar.
 */
export function conditionedBesideDry(m: Dyn, measurements: Dyn) {
  return m?.moistureState === 'conditioned' && (measurements ?? []).some((x: Dyn) => x !== m && x.gradeId === m.gradeId
    && x.property === m.property && !x.quarantined && x.moistureState !== 'conditioned'
    && (x.thermal?.loadMPa ?? null) === (m.thermal?.loadMPa ?? null));
}
