// Typed canonical values beside the raw text they were read from (migration m08).
//
// A print profile's nozzle, bed and chamber windows, its enclosure and drying statements and whether it
// needs a hardened nozzle, and an HDT measurement's test load, decide gates, estimates and screening.
// They used to exist only as the parser's reading of free text on every build, so a parser change could
// move a decision with no data diff, and a mis-read could only be fixed by changing the parser.
//
// Now the reviewed value is stored in typed columns and the build uses it. The parser still runs, and is
// a check: where its reading differs from the stored value, the build stops, unless "Parse review" says
// why the stored value is right (a mis-read the parser cannot handle). Diagnostics the parser adds
// (count, tolerance, text it stripped) stay in the compiled record.

const NA = 'Not applicable';
const NP = 'Not published';

export const TEMPERATURE_AXES = [
  { axis: 'nozzle', label: 'Nozzle', raw: 'Nozzle °C' },
  { axis: 'bed', label: 'Bed', raw: 'Bed °C' },
  { axis: 'chamber', label: 'Chamber', raw: 'Chamber °C' },
];

export const PROFILE_TYPED_COLUMNS = [
  ...TEMPERATURE_AXES.map(({ label, raw }) => ({ after: raw, columns: [`${label} state`, `${label} min °C`, `${label} max °C`, `${label} requirement`] })),
  { after: 'Enclosure', columns: ['Enclosure state'] },
  { after: 'Drying', columns: ['Drying state', 'Drying °C', 'Drying hours'] },
  { after: 'Abrasion / clogging', columns: ['Hardened nozzle'] },
  { after: 'Locator', columns: ['Parse review'] },
];

export const MEASUREMENT_TYPED_COLUMNS = [
  { after: 'Standard / load', columns: ['Test load MPa'] },
  { after: 'Notes', columns: ['Parse review'] },
];

const cell = (v, missing = NA) => (v == null ? missing : String(v));
const value = (c) => (c == null || c === NA || c === NP ? null : Number(c));
const bool = (c) => (c === 'TRUE' ? true : c === 'FALSE' ? false : null);

/** Typed cells for one profile, from the parsers' reading of its raw text. */
export function profileCellsFromParsed({ nozzle, bed, chamber, enclosure, drying, abrasion }) {
  const out = {};
  for (const [{ label }, p] of [[TEMPERATURE_AXES[0], nozzle], [TEMPERATURE_AXES[1], bed], [TEMPERATURE_AXES[2], chamber]]) {
    const range = p.state === 'range';
    out[`${label} state`] = p.state;
    out[`${label} min °C`] = cell(p.min, range ? NP : NA);
    out[`${label} max °C`] = cell(p.max, range ? NP : NA);
    out[`${label} requirement`] = p.requirement;
  }
  out['Enclosure state'] = enclosure.state;
  out['Drying state'] = drying.state;
  out['Drying °C'] = cell(drying.tempC, drying.state === 'stated' ? NP : NA);
  out['Drying hours'] = cell(drying.hours, drying.state === 'stated' ? NP : NA);
  out['Hardened nozzle'] = abrasion.requiresHardened == null ? NP : abrasion.requiresHardened ? 'TRUE' : 'FALSE';
  return out;
}

/** The typed test load of a measurement: a number, Not published (load unstated) or Not applicable. */
export const loadCellFromParsed = (h) => (h ? cell(h.loadMPa, NP) : NA);

const reviewed = (r) => r['Parse review'] != null && r['Parse review'] !== NA;

/**
 * Overlay the stored typed values on the parsers' output for a profile, and report every difference a
 * Parse review does not explain. Key order of the parsed objects is kept, so the compiled record is
 * unchanged wherever the two agree.
 */
export function applyProfileTyped(r, parsed, issues) {
  const where = `profiles ${r.ProfileID}`;
  const mismatch = (field, stored, read) => {
    if (reviewed(r)) return;
    issues.push({ level: 'error', code: 'PARSE-MISMATCH', where, message: `${field} is ${stored ?? 'empty'} but the parser reads the raw text as ${read ?? 'nothing'}; correct the typed value, or explain it in Parse review` });
  };
  const out = {};
  for (const { axis, label } of TEMPERATURE_AXES) {
    const p = parsed[axis];
    const typed = { state: r[`${label} state`], min: value(r[`${label} min °C`]), max: value(r[`${label} max °C`]), requirement: r[`${label} requirement`] };
    for (const k of ['state', 'min', 'max', 'requirement']) if (typed[k] !== p[k]) mismatch(`${label} ${k}`, typed[k], p[k]);
    out[axis] = { ...p, ...typed };
  }
  const e = parsed.enclosure;
  if (r['Enclosure state'] !== e.state) mismatch('Enclosure state', r['Enclosure state'], e.state);
  out.enclosure = { ...e, state: r['Enclosure state'] };

  const d = parsed.drying;
  const drying = { state: r['Drying state'], tempC: value(r['Drying °C']), hours: value(r['Drying hours']) };
  for (const k of ['state', 'tempC', 'hours']) if (drying[k] !== d[k]) mismatch(`Drying ${k}`, drying[k], d[k]);
  out.drying = { ...d, ...drying, required: drying.state === 'stated' ? true : null };

  const a = parsed.abrasion;
  const hardened = bool(r['Hardened nozzle']);
  if (hardened !== a.requiresHardened) mismatch('Hardened nozzle', hardened, a.requiresHardened);
  out.abrasion = { ...a, requiresHardened: hardened, state: hardened == null ? a.state : 'stated' };
  return out;
}

/** Overlay the stored test load on the HDT parser's reading. */
export function applyLoadTyped(r, h, issues) {
  const load = value(r['Test load MPa']);
  if (load !== h.loadMPa && !reviewed(r)) {
    issues.push({ level: 'error', code: 'PARSE-MISMATCH', where: `measurements ${r.MeasurementID}`, message: `Test load MPa is ${load ?? 'Not published'} but the parser reads "${r['Standard / load']}" as ${h.loadMPa ?? 'no stated load'}; correct the typed value, or explain it in Parse review` });
  }
  return load === h.loadMPa ? h : { ...h, loadMPa: load, loadStated: load !== null, label: load === null ? 'load not stated' : `${load} MPa (reviewed)` };
}
