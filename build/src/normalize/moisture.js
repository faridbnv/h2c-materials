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
 * the state of the specimen at test. Since check round 3 (D131) it also reads the wordings the tables hold most, so that
 * their typed column is checked rather than trusted: the specimens' preparation ("All the specimens were annealed and
 * dried at 55 °C for 8 h before testing", "Samples were dried at 80°C vacuum"), a humidity ("conditioned 23°C, 50% RH
 * 72h", "70% RH 23°C"), saturation, and a rest at room temperature that names no humidity, which states no moisture.
 */
export function readMoistureState(text) {
  const s = String(text ?? '').trim();
  if (/^Not published\b/.test(s)) return 'not-stated';
  // Advice on storing or printing the filament says nothing of the specimen at test.
  if (/during printing|printing\/storage|\bkept dry\b|\bkeep (?:vacuum )?sealed\b|newly opened|recommends drying/i.test(s)) return null;
  if (/\bconditioned at room temperature\b/i.test(s) && !/% ?RH|humidity/i.test(s)) return 'not-stated';
  if (/^(?:dry|dried|DAM)\b/i.test(s) || /^(?:all (?:the )?)?(?:samples|specimens) were (?:annealed and )?dried\b/i.test(s) || /^before testing,? all specimens were dried\b/i.test(s)) return 'dry';
  if (/^(?:conditioned|wet\b|saturat|equilibrium)/i.test(s) || /\d\s*% ?(?:RH|relative humidity)\b/i.test(s) || /\bimmer[gs]ed\b/i.test(s)) return 'conditioned';
  return null;
}
