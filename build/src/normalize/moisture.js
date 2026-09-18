// The moisture state at test, as the estimate model needs it: dry, conditioned (humidity or water) or not stated.
//
// It is a typed column on the measurement (Moisture state, m43), not a property of the wording. The source's own
// words stay beside it in Moisture condition, and readMoistureState below reads them as a check: where the words say
// plainly what the state is and the column disagrees, the build stops (typed-values.js, PARSE-MISMATCH). A wording
// that does not say plainly — storage advice, a drying recommendation — gets no opinion, and the column decides.
export const MOISTURE_STATES = ['dry', 'conditioned', 'not-stated'];

/** The declared moisture state of a measurement row's typed column. */
export function moistureState(state) {
  if (!MOISTURE_STATES.includes(state)) throw new Error(`Moisture state "${state ?? ''}" is not one of ${MOISTURE_STATES.join(', ')}`);
  return state;
}

/**
 * What the source's wording plainly says, or null where it does not say. Anchored at the start of the wording: a
 * sentence that merely mentions drying ("Kept dry; TDS recommends drying before printing") describes storage, not
 * the state of the specimen at test.
 */
export function readMoistureState(text) {
  const s = String(text ?? '').trim();
  if (s === 'Not published') return 'not-stated';
  if (/^(Dry|Dried)\b/.test(s)) return 'dry';
  if (/^(Conditioned|Wet\b|50% RH)/.test(s)) return 'conditioned';
  return null;
}
