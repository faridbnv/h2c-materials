// One print recipe read from its columns: a print profile's (profiles.csv) or a printer maker's guide row
// (print_guide.csv, D88), which carries the same columns. The stored typed values decide and the parsers' reading of the
// raw text checks them (typed-values.js); the gates are the recipe against the H2C.

import { parseTemperature, withinH2C, parseAbrasion, parseDrying, parseEnclosure, H2C_BASELINE, PROCESS_STATE, REQUIREMENT } from './normalize/process.js';
import { applyProfileTyped } from './typed-values.js';

// Plausibility windows keep a stray number in a sentence from being read as a temperature.
// An industrial printer's build chamber reaches 250 °C (Kumovis R1 for PEEK: "Build chamber temperature 160 - 230 °C").
export const TEMP_WINDOW = { nozzle: [100, 500], bed: [0, 250], chamber: [0, 250] };

/**
 * A row's recipe: nozzle, bed and chamber windows, enclosure, drying and hardened nozzle, and the gates. `where` names
 * the row in a PARSE-MISMATCH, `unreadWhere` in a PARSE-UNREAD, and `abrasionColumn` is the raw column that says
 * whether a hardened nozzle is needed (a profile's "Abrasion / clogging", a guide's "Nozzle size / material"). `guide`
 * says the row is a printer maker's guide row (D88). A guide row that asks for an enclosure may declare its chamber
 * "enclosed" (D90), and so may a maker's own profile that asks for one and states no chamber temperature (D93); which
 * profiles may, by their material's guide and their product's other profiles, is checked across rows
 * (`checkMakerEnclosed`).
 */
// A profile whose abrasion line is silent may answer the hardened-nozzle question on its nozzle-material or nozzle-size
// line: 3DXTECH prints "Nozzle Specs: No special concerns", BASF "Nozzle Diameter ≥ 0,6 mm, hardened", QIDI "0.4–0.8 mm /
// Hardened steel nozzle or harder" (gap round 2's probe). The abrasion line decides wherever it says anything.
const NOZZLE_LINES = ['Nozzle material', 'Nozzle diameter'];
export function readAbrasion(r, column = 'Abrasion / clogging') {
  const own = parseAbrasion(r[column]);
  if (column !== 'Abrasion / clogging' || own.state !== PROCESS_STATE.UNKNOWN) return own;
  for (const c of NOZZLE_LINES) { const p = parseAbrasion(r[c]); if (p.requiresHardened != null) return { ...p, column: c }; }
  return own;
}

export function readRecipe(r, issues, { where, unreadWhere, abrasionColumn = 'Abrasion / clogging', guide = false }) {
  const rawChamber = parseTemperature(r['Chamber °C'], { plausible: TEMP_WINDOW.chamber });
  const typed = applyProfileTyped(r, {
    nozzle: parseTemperature(r['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }),
    bed: parseTemperature(r['Bed °C'], { plausible: TEMP_WINDOW.bed }),
    chamber: rawChamber,
    enclosure: parseEnclosure(r.Enclosure), drying: parseDrying(r.Drying), abrasion: readAbrasion(r, abrasionColumn),
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
  // "enclosed" says the H2C's heated chamber is the enclosure asked for: a printer maker's guide's, on its own printers
  // (D90), or a filament maker's that states no temperature, for a type that guide asks an enclosure for (D93). Only a
  // chamber may say it, and only where its row asks for an enclosure; a profile only where its sheet prints no chamber
  // temperature either, since a stated temperature decides.
  const noTemperature = rawChamber.state === PROCESS_STATE.UNKNOWN && !rawChamber.unparsed;
  for (const [name, p] of [['Nozzle', nozzle], ['Bed', bed], ['Chamber', chamber]]) {
    if (p.state !== PROCESS_STATE.ENCLOSED || (name === 'Chamber' && enclosure.state === 'recommended' && (guide || noTemperature))) continue;
    issues.push({ level: 'error', code: 'PROCESS-ENCLOSED', where, message: `${name} state is enclosed, which only a chamber may declare, where its row asks for an enclosure and, on a profile, prints no chamber temperature (D90, D93)` });
  }
  return {
    nozzle, bed, chamber,
    gates: {
      nozzle: withinH2C(nozzle, H2C_BASELINE.nozzleC),
      bed: withinH2C(bed, H2C_BASELINE.bedC),
      // A maker's own enclosure is said in its words, a guide's as its printer maker's (D93).
      chamber: withinH2C(chamber, H2C_BASELINE.chamberC, { partialWindow: true, makerEnclosure: guide ? null : r.Enclosure }),
    },
    enclosureState: enclosure.state,
    abrasion: typed.abrasion,
    drying: typed.drying,
  };
}

/**
 * A maker's own profile may declare its chamber "enclosed" (D93) only for a type its material's printer maker's guide
 * asks an enclosure for, which that guide row declares "enclosed" (D90), and only where no other profile of its product
 * states a chamber: a reading, or any words in its chamber row (a temperature the typed columns leave unread among
 * them), decides, as a product's own statement always does. `guideByMaterial` is the guide row each material reads
 * (print-guide.js).
 */
export function checkMakerEnclosed(profiles, guideByMaterial, issues) {
  const byGrade = new Map();
  for (const p of profiles) (byGrade.get(p.gradeId) ?? byGrade.set(p.gradeId, []).get(p.gradeId)).push(p);
  const printed = (c) => !!String(c.text ?? '').trim() && !/^not published$/i.test(String(c.text).trim());
  for (const p of profiles) {
    if (p.chamber.state !== PROCESS_STATE.ENCLOSED) continue;
    const guide = guideByMaterial.get(p.materialId);
    const stated = byGrade.get(p.gradeId).find((q) => q !== p && (printed(q.chamber) || ![PROCESS_STATE.UNKNOWN, PROCESS_STATE.ENCLOSED].includes(q.chamber.state)));
    const problem = guide?.chamber.state !== PROCESS_STATE.ENCLOSED
      ? `its material's printer maker's guide ${guide ? `(${guide.id}) does not ask an enclosure for its type` : 'is not recorded'}`
      : stated ? `${stated.id}, another profile of ${p.gradeId}, states its chamber ("${stated.chamber.text}"), which decides` : null;
    if (problem) issues.push({ level: 'error', code: 'PROCESS-ENCLOSED', where: `profiles ${p.id}`, message: `Chamber state is enclosed, but ${problem} (D93)` });
  }
}
