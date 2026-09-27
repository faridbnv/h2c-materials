// One print recipe read from its columns: a print profile's (profiles.csv) or a printer maker's guide row
// (print_guide.csv, D88), which carries the same columns. The stored typed values decide and the parsers' reading of the
// raw text checks them (typed-values.js); the gates are the recipe against the H2C.

import { parseTemperature, withinH2C, parseAbrasion, parseDrying, parseEnclosure, H2C_BASELINE, PROCESS_STATE, REQUIREMENT } from './normalize/process.js';
import { applyProfileTyped } from './typed-values.js';

// Plausibility windows keep a stray number in a sentence from being read as a temperature.
export const TEMP_WINDOW = { nozzle: [100, 500], bed: [0, 250], chamber: [0, 200] };

/**
 * A row's recipe: nozzle, bed and chamber windows, enclosure, drying and hardened nozzle, and the gates. `where` names
 * the row in a PARSE-MISMATCH, `unreadWhere` in a PARSE-UNREAD, and `abrasionColumn` is the raw column that says
 * whether a hardened nozzle is needed (a profile's "Abrasion / clogging", a guide's "Nozzle size / material").
 */
export function readRecipe(r, issues, { where, unreadWhere, abrasionColumn = 'Abrasion / clogging' }) {
  const typed = applyProfileTyped(r, {
    nozzle: parseTemperature(r['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }),
    bed: parseTemperature(r['Bed °C'], { plausible: TEMP_WINDOW.bed }),
    chamber: parseTemperature(r['Chamber °C'], { plausible: TEMP_WINDOW.chamber }),
    enclosure: parseEnclosure(r.Enclosure), drying: parseDrying(r.Drying), abrasion: parseAbrasion(r[abrasionColumn]),
  }, issues, where);
  const { nozzle, bed, enclosure } = typed;
  let { chamber } = typed;
  // Five Spectrum data sheets say only that a closed chamber is "not necessary". A material that
  // does not need enclosing does not need a heated chamber, so that clears the chamber question
  // without inventing a temperature. The reverse does not hold: an enclosure being recommended
  // says nothing about whether 65 C is enough, so it leaves the chamber unknown.
  if (chamber.state === PROCESS_STATE.UNKNOWN && !chamber.unparsed && enclosure.state === 'not-needed') {
    chamber = { ...chamber, state: PROCESS_STATE.NOT_REQUIRED, requirement: REQUIREMENT.NONE, fromEnclosure: true };
  }
  for (const [name, p] of [['Nozzle', nozzle], ['Bed', bed], ['Chamber', chamber], ['Enclosure', enclosure]]) {
    if (p.unparsed) issues.push({ level: 'warn', code: 'PARSE-UNREAD', where: unreadWhere, message: `${name} text not parsed: "${p.text}"` });
  }
  return {
    nozzle, bed, chamber,
    gates: {
      nozzle: withinH2C(nozzle, H2C_BASELINE.nozzleC),
      bed: withinH2C(bed, H2C_BASELINE.bedC),
      chamber: withinH2C(chamber, H2C_BASELINE.chamberC, { partialWindow: true }),
    },
    enclosureState: enclosure.state,
    abrasion: typed.abrasion,
    drying: typed.drying,
  };
}
