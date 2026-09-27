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
 * whether a hardened nozzle is needed (a profile's "Abrasion / clogging", a guide's "Nozzle size / material"). `guide`
 * says the row is a printer maker's guide row (D88), the one kind that may declare its chamber "enclosed" (D90).
 */
export function readRecipe(r, issues, { where, unreadWhere, abrasionColumn = 'Abrasion / clogging', guide = false }) {
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
  // "enclosed" says the H2C's heated chamber is the enclosure a printer maker's guide asks for on its own printers
  // (D90). Only such a row may say it, of its chamber, and only where it asks for an enclosure: a maker's own sheet
  // that asks for one has not said 65 °C is enough.
  for (const [name, p] of [['Nozzle', nozzle], ['Bed', bed], ['Chamber', chamber]]) {
    if (p.state !== PROCESS_STATE.ENCLOSED || (guide && name === 'Chamber' && enclosure.state === 'recommended')) continue;
    issues.push({ level: 'error', code: 'PROCESS-ENCLOSED', where, message: `${name} state is enclosed, which only a print guide row's chamber may declare, where the row asks for an enclosure (D90)` });
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
