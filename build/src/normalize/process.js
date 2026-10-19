// Print setup temperature columns are free text: 82 distinct spellings for nozzle alone, mixing
// ranges, single values, categorical states and several dash and degree glyphs. They also mix
// kinds: Chamber holds "Not required" and "Room temperature" alongside real numbers.
//
// Method sheet, H2C / Hardware baseline: 350 C nozzle, 120 C bed, 65 C active chamber.

export const H2C_BASELINE = { nozzleC: 350, bedC: 120, chamberC: 65 };
// How much of a maker's window the H2C must cover for the window to be within, at its low end (D151, the owner's
// decision 2 of the screening review, 2026-10-18): a maker's window says any setting in it works, so a nozzle, bed or
// chamber window whose bottom the H2C reaches by at least 5 °C is printable; one it reaches by less is on the line.
export const H2C_LOW_END_C = 5;

export const PROCESS_STATE = {
  RANGE: 'range',
  NOT_REQUIRED: 'not-required',
  RECOMMENDED: 'recommended',
  AMBIENT: 'ambient',
  // A data sheet that prints "-" in the chamber row. It is a statement that no setpoint is given,
  // which is neither zero nor "not required", so it must not read as either.
  NO_SETPOINT: 'no-setpoint',
  // A printer maker's guide that asks for an enclosure on its own enclosed printers and states no temperature: the
  // H2C's heated, enclosed chamber is that enclosure (D90). Declared on a print guide row, and on a maker's own profile
  // that asks for one with no temperature, for a type that guide asks it for (D93); never read from words.
  ENCLOSED: 'enclosed',
  UNKNOWN: 'unknown',
};

const clean = (s) => String(s)
  .replace(/[–—−‒]/g, '-')          // dash variants
  .replace(/[℃]/g, 'C').replace(/[℉]/g, 'F')  // ℃ ℉
  .replace(/[°˚̊＃]/g, '')           // ° ˚ and friends
  .replace(/[，、]/g, ',')
  .replace(/\s+/g, ' ')
  .trim();

// Nominal ambient, used only when a cell says "room temperature" as the LOWER end of a stated
// range. Tagged as derived wherever it reaches the UI; it is our number, not the source's.
export const NOMINAL_AMBIENT_C = 25;

// Text that marks the end of the process requirement and the start of something else entirely.
// "Room Temp. Annealing temp. and time 100 C/16H PolyDissolve S1" is a room-temperature chamber
// plus a post-print anneal. Scraping its 100 C as a chamber requirement would wrongly exclude
// printable materials, so everything from these markers onward is cut before any number is read.
const TAIL_MARKERS = /\b(anneal\w*|polydissolve|polysupport|support\s+for|drying|storage)\b/i;

export const REQUIREMENT = {
  REQUIRED: 'required',       // a bare range reads as the window the material needs
  RECOMMENDED: 'recommended', // "recommended ... if available" is not a hard requirement
  NONE: 'none',               // explicitly not required
  UNKNOWN: 'unknown',
};

// Yousu and 3D-Fuel print the bed as "None needed (or 50-70°C if applicable)": not required, with the window if one is used.
// SUNLU's Chinese sheets say "该材料无需热床即可成功打印" (the material prints without a heated bed; reader round, 2026-10-04).
// iSANMATE's PLA Wood page answers its heated-chamber row "unnecessary" (the research intake, D168).
// Eumakers prints "20° C (Not Necessary)": a bed it does not require, with the temperature it would use (the research intake).
const NOT_REQUIRED_RE = /^(not\s+(required|necessary|needed)|none\s+needed|for printing not necessary|unnecessary)\b|无需(?:热床|加热)|\(\s*not\s+(?:necessary|needed|required)\s*\)/i;
// "It is recommended to print using a heated chamber." recommends one without a temperature (the profile root-cause
// sweep of 2026-10-02).
// Fiberlogy's "enclosed and heated chamber recommended" does the same (reader round, 2026-10-04), and so does "it is
// recommended to use a 3D printer with an enclosed and heated chamber" (P1303; the parser sweep of 2026-10-17, D141).
const RECOMMENDED_RE = /^recommended\b|(?<!\bnot\s)\brecommended\s+to\s+(?:print|use)\b[^.;]*\bheated\s+chamber\b|\bheated\s+chambers?\s+(?:is\s+)?recommended\b/i;
// Polymaker marks the whole window after its numbers: "70 – 80 (recommended) (˚C)", "70-80 (˚C)(Recommended)". A bracket
// holding a number as well ("230~260 ℃ (recommended: 240℃)") recommends a point inside a window, which stays required.
const RECOMMENDED_MARK_RE = /\(\s*recommended\s*\)/i;
// 3DJake's sheets say a filament "can also be printed without a heated bed. If you have a heated bed the recommended
// temperature is ± 35-60˚C": a window for a printer that has one, not one the filament needs. Recreus prints "Small parts
// Room temperature (no heating); Large parts 50–55 °C": a window for large parts only (the control draw of 2026-10-02).
// Check round 3 (D131) found the same hedge in other words: "not absolutely necessary, recommended 60-90°C", "Nicht
// benötigt, 50 °C empfohlen" (not needed, 50 °C recommended), "40–60 °C Heated Bed Optional", and Recreus's "Small
// parts: No heating (room temperature); Large parts: 50-55°C".
const RECOMMENDED_IF_RE = /\bif you have a heated bed\b|\brecommended temperature is\b|\bsmall\s+parts:?\s+(?:room\s+temp\w*\s*\(no\s+heating\)|no\s+heating\b)|\bnot\s+absolutely\s+necessary\b|\bnicht\s+(?:benötigt|erforderlich|notwendig)\b[^.]*\bempfohlen\b|\bheated\s+bed\s+optional\b/i;
const NO_SETPOINT_RE = /^no\s+setpoint\b/i;
// BASF prints a lone dash in its "Build Chamber Temperature" row: no setpoint given, the same statement as NO_SETPOINT. SUNLU
// prints a lone slash in its bed row (reader round, 2026-10-04).
const DASH_RE = /^[-/]$/;
// CreatBot prints "Chamber temperature OFF": the heater is to be off, so no heated chamber is wanted.
const OFF_RE = /^off$/i;
// Flashforge, SIDDAMENT and LEHVOSS say a filament prints "on non-heated chamber FFF 3D printers" or "in non-heated
// chambers" in their prose. It is read before any number, because "3D" would otherwise be taken for a 3 °C chamber.
// Siraya Tech's "no need of temperature chamber" and IPCON's "no heating chamber are required during the printing
// process" say the same in other words (the profile root-cause sweep of 2026-10-02).
// Raise3D's PPS-CF sheet prints "non-heated printing camber"; BASF's Ultrafuse ASA asks for "At least closed chamber,
// passively heated", which is a closed printer with no heater set (reader round, 2026-10-04).
// Braskem's FL300PE: "Heated chamber not required" (the research intake, D168).
const NON_HEATED_RE = /\bnon-?heated\s+(?:printing\s+)?ch?ambers?\b|\bpassively\s+heated\b|\b(?:does\s+not|doesn['’]t)\s+require\s+an?\s+heated\s+(?:building\s+|build\s+|print\s+)?chambers?\b|\bno\s+need\s+(?:of|for)\s+(?:an?\s+)?(?:temperature|heated|heating)\s+chambers?\b|\bno\s+(?:heated|heating)\s+chambers?\s+(?:is|are)\s+(?:required|needed|necessary)\b|\bheated\s+chambers?\s+(?:is\s+)?not\s+(?:required|needed|necessary)\b/i;
// "65˚C+" (Polymaker ABS Max's chamber), "140 ºC +" and LEHVOSS's "> 120 °C" are at-least values: a lower end, with no
// upper end published.
// Fillamentum prints the plus before the unit: "Hot pad 100+ °C".
// "Minimum 70˚C chamber temp highly recommended." (Flashforge's ASA-CF, P1752) says the same with a word; read as numbers it
// was the single point 70 (2026-10-17, D141).
const AT_LEAST_WORD = '(?:>|≥|>=|minimum|min\\.?|at least|mindestens)';
const AT_LEAST_RE = new RegExp(`^(?:(\\d+(?:\\.\\d+)?)\\s*[^\\d\\s+]{0,3}\\s*\\+|${AT_LEAST_WORD}\\s*(\\d+(?:\\.\\d+)?)\\s*[^\\d\\s]{0,3}|(\\d+(?:\\.\\d+)?)\\s*\\+\\s*[^\\d\\s]{1,3})$`, 'i');
const AT_LEAST_LEAD_RE = new RegExp(`^${AT_LEAST_WORD}\\s*(\\d+(?:\\.\\d+)?)()\\s*[^\\d\\s]{0,3}\\s+[^\\d]*$`, 'i');
// "< 80°C" (Spectrum's PA6 Low Warp GF30 bed) and "≤ 60 °C" are at-most values: an upper end, with no lower end
// published. Read as a number, "< 80°C" was the single point 80 (the control re-read of 2026-10-01).
const AT_MOST_RE = /^(?:<|≤|<=|＜)\s*(\d+(?:\.\d+)?)\s*[^\d\s]{0,3}(?:\s+[^\d]*)?$/;
// SUNLU answers its "Room Temp." row "Normal temperature", "Normal" or 常温 (normal temperature) on other sheets.
// 室温 (room temperature) on SUNLU's TPU sheet (reader round, 2026-10-04).
const AMBIENT_RE = /\b(room\s*temp\w*|ambient(\s+temperature)?|normal\s+temp\w*)\b|常温|室温|^normal$/i;
// A ceiling in words is an upper end too: Raise3D's "Do not print PVA+ in an enclosed chamber with a chamber temperature of
// above 50°C" read as a 50 °C minimum (the research intake).
const UP_TO_RE = /\b(?:up\s+to|(?:do\s+not|don['’]t|never)\b[^.;]{0,80}?\babove|(?:must\s+)?not\s+exceed\w*)\s+(\d+(?:\.\d+)?)/i;

// Numbers a process cell states that are not temperatures: a nozzle size or layer height ("0.4mm nozzle"), a speed
// ("50-80 mm/s", "≤30mm/s"), a flow ("4.0 mm³/s"), a share, hours or months, a mass, and a word with a number in it
// ("3D printers", "3M adhesive", "3DLac"). Read as temperatures they shifted a window: the data audit of 2026-10-01 found
// a bed minimum of 3 °C from "for 3D printers" and 24 °C from "a shelf life of 24 months", and 2026-10-17 one of 3 °C
// from "3M adhesive" (D141). A number followed by C or F is a temperature and stays. Shared with the typed-value check
// (typed-values.js, PARSE-TEXT-BOUNDS), so the two read one set of numbers.
export const stripNonTemperatures = (s) => String(s ?? '')
  .replace(/\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?\s*(?:mm[³3]?\/s|mm\/s|mm\b|%|h\b|hours?\b|months?\b|g\b|kg\b)/gi, ' ')
  .replace(/\b\d+(?:\.\d+)?[A-BD-EG-Za-bd-eg-z][A-Za-z]*\b/g, ' ');

// The numbers a cell states, in reading order, and those outside the axis's plausible window. The window is a check,
// never a filter: a stated number outside it is still the cell's own endpoint (D115), and the reading says so
// (`implausible`) so that PROCESS-WINDOW-IMPLAUSIBLE can show it. Filtered out, the number vanished and the window
// collapsed onto what was left: "450 - 520 °C" became the single point 450 and "75-85℃" (a polycaprolactone's nozzle)
// nothing at all, and the typed columns written from the parser (m08) carried the collapse where PARSE-MISMATCH could
// not see it (D141).
function statedTemperatures(s, [lo, hi]) {
  const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  const implausible = nums.filter((n) => n < lo || n > hi);
  return { nums, implausible: implausible.length ? implausible : undefined };
}

/**
 * Parse a process temperature cell into a range, a categorical state, or unknown, together with
 * whether the material *requires* that window or merely benefits from it.
 * @param {string|null} raw
 * @param {{plausible?:[number,number]}} opts sanity window; values outside are not treated as temps
 */
export function parseTemperature(raw, opts = {}) {
  const text = raw == null ? '' : String(raw).trim();
  if (!text) return { text, state: PROCESS_STATE.UNKNOWN, requirement: REQUIREMENT.UNKNOWN, min: null, max: null };

  let s = clean(text);
  if (/^not published$/i.test(s)) {
    return { text, state: PROCESS_STATE.UNKNOWN, requirement: REQUIREMENT.UNKNOWN, min: null, max: null };
  }
  // A window printed in both scales, "220 - 245°C / 428 - 473°F" or "25-60°C (77-140°F)": the Fahrenheit window is the
  // same setting, and its numbers are not degrees Celsius. Read whole, the cell gave 220 to 473 °C (DSM's Arnitel guide,
  // check round 3's sealed draw). It is set aside where a Celsius number stays to read.
  const celsiusOnly = s.replace(/[(/]?\s*\d+(?:\.\d+)?\s*(?:-\s*\d+(?:\.\d+)?\s*)?F\b\s*\)?/g, ' ').replace(/\s+/g, ' ').trim();
  if (celsiusOnly !== s && /\d\s*C\b/.test(celsiusOnly)) s = celsiusOnly;
  s = stripNonTemperatures(s).replace(/\s+/g, ' ').trim();
  if (NO_SETPOINT_RE.test(s) || DASH_RE.test(s)) {
    return { text, state: PROCESS_STATE.NO_SETPOINT, requirement: REQUIREMENT.UNKNOWN, min: null, max: null };
  }
  if (OFF_RE.test(s) || NON_HEATED_RE.test(s)) {
    return { text, state: PROCESS_STATE.NOT_REQUIRED, requirement: REQUIREMENT.NONE, min: null, max: null };
  }
  // "> 80 °C recommended" and "≥ 90 °C for large parts": an at-least value followed by words, still an open bound.
  const window = opts.plausible || [0, 500];
  const atLeast = s.match(AT_LEAST_RE) ?? s.match(AT_LEAST_LEAD_RE);
  if (atLeast) {
    const min = Number(atLeast[1] ?? atLeast[2] ?? atLeast[3]);
    return { text, state: PROCESS_STATE.RANGE, requirement: REQUIREMENT.REQUIRED, min, max: null, openHigh: true, implausible: statedTemperatures(String(min), window).implausible };
  }

  const atMost = s.match(AT_MOST_RE);
  if (atMost) {
    const max = Number(atMost[1]);
    return { text, state: PROCESS_STATE.RANGE, requirement: REQUIREMENT.REQUIRED, min: null, max, openLow: true, implausible: statedTemperatures(String(max), window).implausible };
  }

  // Cut trailing clauses that are not about this process parameter.
  let strippedTail = null;
  const tail = s.search(TAIL_MARKERS);
  if (tail > 0) { strippedTail = s.slice(tail).trim(); s = s.slice(0, tail).trim().replace(/[.,;:\-]+$/, ''); }

  let requirement = REQUIREMENT.REQUIRED;
  if (NOT_REQUIRED_RE.test(s)) requirement = REQUIREMENT.NONE;
  else if (RECOMMENDED_RE.test(s) || RECOMMENDED_MARK_RE.test(s) || RECOMMENDED_IF_RE.test(s)) requirement = REQUIREMENT.RECOMMENDED;

  const ambient = AMBIENT_RE.test(s);

  // A tolerance is centred on the nominal setting; its second number is not an endpoint. The unit may stand
  // between the two: Nobufil prints "Print temperature 260°C ± 10" on fourteen sheets, and without the unit in
  // the pattern that read as a range from 10 to 260 — a window PARSE-MISMATCH refused, which is how it was found.
  // The degree sign is already off by here (`clean`), so it is the letter that has to be allowed for.
  const tolerance = s.match(/(\d+(?:\.\d+)?)\s*[°º˚]?\s*[CF]?\s*(?:±|\+\/-)\s*(\d+(?:\.\d+)?)/);
  if (tolerance) {
    const centre = Number(tolerance[1]), delta = Number(tolerance[2]);
    const min = centre - delta, max = centre + delta;
    return { text, state: PROCESS_STATE.RANGE, requirement, min, max, tolerance: delta, implausible: statedTemperatures(`${min} ${max}`, window).implausible };
  }

  // A point the maker recommends inside a window is not one of its ends: Flashforge prints "Room temperature~60℃ (40℃
  // recommended)", and read as numbers the window became 40–60 (the control re-read of 2026-10-01).
  s = s.replace(/\(\s*(?:recommended\s*:?\s*)?\d+(?:\.\d+)?\s*[°º˚]?\s*C?\s*(?:recommended)?\s*\)/gi, (m) => (/recommended/i.test(m) ? ' ' : m));

  // No leading minus in the pattern. These temperatures are never negative, and accepting one
  // makes the range dash in "255-275C" read as the sign of -275, which then failed the plausibility
  // window and silently collapsed the range to its lower end.
  const { nums, implausible } = statedTemperatures(s, window);

  const base = { text, requirement, strippedTail: strippedTail || undefined, implausible };

  if (nums.length === 0) {
    if (requirement === REQUIREMENT.NONE) return { ...base, state: PROCESS_STATE.NOT_REQUIRED, min: null, max: null };
    if (ambient) return { ...base, state: PROCESS_STATE.AMBIENT, min: null, max: null };
    if (requirement === REQUIREMENT.RECOMMENDED) return { ...base, state: PROCESS_STATE.RECOMMENDED, min: null, max: null };
    return { ...base, state: PROCESS_STATE.UNKNOWN, min: null, max: null, unparsed: true };
  }

  const upTo = s.match(UP_TO_RE);
  if (upTo && nums.length === 1) {
    return { ...base, state: PROCESS_STATE.RANGE, min: null, max: Number(upTo[1]), openLow: true };
  }

  let min = Math.min(...nums);
  const max = Math.max(...nums);
  let ambientFloor = false;
  // "Room temperature - 50 C": ambient is the lower end of a real range.
  if (ambient && nums.length === 1) { min = NOMINAL_AMBIENT_C; ambientFloor = true; }

  return { ...base, state: PROCESS_STATE.RANGE, min, max, ambientFloor: ambientFloor || undefined, count: nums.length };
}

/**
 * A window whose bottom the H2C reaches and whose top it does not (D151): within at its low end where the H2C covers at
 * least H2C_LOW_END_C of it, else on the line. `window` is the maker's window in words, `over` how far its top is beyond
 * the H2C (null for an open window). `overlap` is how much of it the H2C covers, which a gate across several profiles
 * ranks by (gates.js).
 */
function lowEnd(parsed, limitC, window, over) {
  const overlap = limitC - parsed.min;
  const asks = parsed.requirement === REQUIREMENT.RECOMMENDED ? 'recommends' : 'asks';
  const base = { reachable: { min: parsed.min, max: limitC }, overlap, over };
  if (overlap >= H2C_LOW_END_C) {
    return { verdict: 'within-low-end', reason: `At the low end of the maker's window (it ${asks} ${window}; the H2C reaches ${limitC} °C)`, ...base };
  }
  const reach = parsed.min === limitC ? `${limitC} °C` : `${parsed.min}–${limitC} °C`;
  const of = parsed.max == null ? `${parsed.min} °C and above` : window;
  return { verdict: 'edge', reason: `The H2C reaches only the bottom of the maker's window (${reach} of ${of})`, ...base };
}

/**
 * Does this material's stated process window fit inside the H2C envelope?
 * A window the H2C covers whole is within. One whose upper end is beyond the H2C is read by how much of it the H2C
 * covers (D151, amending D32): a maker's window says any setting in it works, so where the H2C reaches at least
 * H2C_LOW_END_C of it, from its bottom, the window is within at its low end (`within-low-end`, a pass, flagged); where it
 * reaches less, only the window's bottom edge, it is on the line (`edge`, unresolved); where it reaches none of it, the
 * window is beyond the H2C. This holds for the nozzle, the bed and the chamber alike: Bambu's PPS-CF chamber of 60–90 °C
 * is within at its low end, LCP's bed of 120–150 °C on the line, PEKK's nozzle of 345–375 °C within at its low end
 * (PEKK stays out of scope, which is decided apart). Until D151 only the chamber had such a verdict ("partial", always
 * unresolved), and the nozzle and bed were read by their upper end.
 *
 * A recommendation is not a requirement. "Recommended 70-140C if possible" exceeds the 65 C
 * chamber but does not make the material unprintable, so it returns a warning the UI can show
 * rather than a verdict that removes the candidate (D6). The overlap is read first: a recommended window the H2C covers
 * the bottom of is within at its low end, or on the line, as a required one is.
 *
 * An at-least window ("65˚C+") has no upper end. A nozzle or bed one the H2C reaches is within; a chamber one is read by
 * the overlap too (`atLeastOverlap`): the H2C's 65 °C covers 65 − X of a window that starts at X.
 */
export function withinH2C(parsed, limitC, { atLeastOverlap = false, makerEnclosure = null } = {}) {
  if (!parsed) return { verdict: 'unknown', reason: 'No requirement published' };

  if (parsed.state === PROCESS_STATE.NOT_REQUIRED || parsed.state === PROCESS_STATE.AMBIENT) {
    return { verdict: 'within', reason: parsed.fromEnclosure
      ? 'The source says no enclosure is needed, so no heated chamber is needed'
      : 'No heated chamber needed' };
  }
  if (parsed.state === PROCESS_STATE.ENCLOSED) {
    // A filament maker's own words (D93), or its printer maker's guide's (D90).
    return { verdict: 'within', reason: makerEnclosure
      ? `Its maker asks for an enclosure ("${makerEnclosure}") and gives no temperature. The H2C's heated chamber (${limitC} °C) counts as that enclosure`
      : `An enclosure is asked for, with no temperature. The H2C's heated chamber (${limitC} °C) counts as that enclosure` };
  }
  if (parsed.state === PROCESS_STATE.NO_SETPOINT) {
    return { verdict: 'unknown', categorical: true, reason: 'The source prints "-" for the chamber: no setpoint, which is not the same as "not needed"' };
  }
  if (parsed.state === PROCESS_STATE.RECOMMENDED) {
    return { verdict: 'unknown', categorical: true, reason: 'A heated chamber is recommended with no temperature, so 65 \u00b0C is not shown to be enough' };
  }
  if (parsed.state !== PROCESS_STATE.RANGE) {
    return { verdict: 'unknown', reason: 'No temperature published' };
  }
  // An at-least value ("65˚C+") has no upper end, so it is never within by its upper end: the printer reaches it if it
  // reaches the lower end. A nozzle or bed is then within; a chamber is read by how much of the open window it covers.
  if (parsed.openHigh && parsed.max == null) {
    const over = parsed.min - limitC;
    if (over > 0) {
      return parsed.requirement === REQUIREMENT.RECOMMENDED
        ? { verdict: 'exceeds-recommended', reason: `Recommends at least ${parsed.min} °C, above the H2C's ${limitC} °C, but does not require it`, over }
        : { verdict: 'exceeds', reason: `Requires at least ${parsed.min} °C; the H2C reaches only ${limitC} °C`, over };
    }
    if (atLeastOverlap) return lowEnd(parsed, limitC, `at least ${parsed.min} °C`, null);
    return { verdict: 'within', reason: `Needs at least ${parsed.min} °C; the H2C reaches ${limitC} °C` };
  }
  if (parsed.max <= limitC) {
    return { verdict: 'within', reason: `Needs up to ${parsed.max} \u00b0C; the H2C reaches ${limitC} \u00b0C` };
  }
  // A closed window the H2C reaches the bottom of: within at its low end, or on the line (D151).
  if (parsed.min !== null && parsed.min <= limitC) return lowEnd(parsed, limitC, `${parsed.min}–${parsed.max} °C`, parsed.max - limitC);
  if (parsed.requirement === REQUIREMENT.RECOMMENDED) {
    return {
      verdict: 'exceeds-recommended',
      reason: `Recommends up to ${parsed.max} \u00b0C, above the H2C's ${limitC} \u00b0C, but does not require it`,
      over: parsed.max - limitC,
    };
  }
  return {
    verdict: 'exceeds',
    reason: `Requires up to ${parsed.max} \u00b0C; the H2C reaches only ${limitC} \u00b0C`,
    over: parsed.max - limitC,
  };
}

/**
 * The Enclosure column: whether a source says the part needs to be enclosed.
 *
 * An enclosure is not an actively heated chamber, so "recommended" says nothing about 65 C and
 * stays unknown. "Not necessary" is different: a material that does not need to be enclosed does
 * not need a heated chamber, which is the only thing the chamber gate asks.
 */
export function parseEnclosure(raw) {
  const text = raw == null ? '' : String(raw).trim();
  if (!text || /^not published$/i.test(text)) return { text, state: 'unknown' };
  // A table with a column headed "Enclosed Space" answers it in one word, and "no" is the whole answer. Polymaker's
  // "Closure chamber" row answers "No Needed" on some sheets, and PEBA's prose says a filament "does not require sealed
  // printing", and 3D-Fuel's that its Pro PCTG "typically doesn’t require an enclosure".
  // A question the row answers: Extrudr's product pages print "Enclosed chamber required No" (or "Yes").
  const answer = text.match(/\b(?:required|recommended|needed|necessary)\s*[:?]?\s*(yes|no)\s*$/i);
  if (answer) return { text, state: /^no$/i.test(answer[1]) ? 'not-needed' : 'recommended' };
  // 3DXTECH's product page: "Ideal for printing without a heated bed, no enclosure required".
  // "Enclosure is not recommended for PLA" discourages one: it was read as recommending one (check round 3).
  // eSUN's PLA Clear sheet says it "does not need to close the cavity", and Spectrum's Polish sheets "Komora zamknięta:
  // niewymagane" (closed chamber: not required; check round 3).
  // Siraya Tech's "Not mandatory, but it is recommended": an enclosure its maker does not require is not needed, and the
  // recommendation stays in the raw column (D168, the owner's ruling of 2026-10-19; reviewers had typed it so under D33).
  if (/\bnot\s+(necessary|needed|required|recommended|mandatory)\b|\bdoes\s+not\s+need\s+to\s+close\b|\bniewymagan[ea]\b|^no\s+(enclosure|needed)\b|\bno\s+enclosure\s+(?:is\s+)?(?:required|needed|necessary)\b|^(no|none)$|\bdoes\s+not\s+require\b|\bdoesn[’']t\s+require\b/i.test(text)) return { text, state: 'not-needed' };
  // Eryone's "Sealed printing" row says whether the filament prints open: "Supports open/closed printing", "Open
  // printing", "enclosed printing/open printing", "supports open printing, and the sealing effect is better if it is
  // sealed". A filament its maker prints open needs no enclosure; that an enclosure improves it is a preference the
  // raw column keeps, and the H2C is enclosed anyway. The same row answers "Closed printing" or "Box Sealing Print"
  // for the filaments that need one (below).
  if (/^open\s+print|\bsupport(s|ing)?\s+open\b|\bopen\s+print\w*\s*\/\s*(closed|enclosed)\s+print|\b(closed|enclosed)\s+print\w*\s*\/\s*open\s+print/i.test(text)) return { text, state: 'not-needed' };
  if (/^(closed|enclosed)\s+print|^box\s+sealing\s+print/i.test(text)) return { text, state: 'recommended' };
  // Polymaker's "Closure chamber | Needed", with or without the temperatures it wants in brackets (read as the chamber).
  if (/^needed\b/i.test(text)) return { text, state: 'recommended' };
  // A sentence that recommends printing in a closed printer: eSUN's "we highly recommend printing PC-HT material within
  // a closed chamber printer", or "print in a printer with a closed chamber".
  if (/\brecommend\w*\b[^.]*\b(closed|enclosed)(\s+or\s+semi-enclosed)?\s+(print(ing)?\s+)?(chamber|printer)|\brecommend\w*\b[^.]*\bprinter\s+with\s+an?\s+enclosure\b|\bprint\w*\s+in\s+a\s+printer\s+with\s+(a\s+)?closed\s+chamber/i.test(text)) return { text, state: 'recommended' };
  // A sentence that says the filament prints best enclosed: 3D-Fuel's "works best with an enclosed print area", SUNLU's
  // "Printing in an enclosed printer", BASF's "At least closed chamber" (the profile root-cause sweep of 2026-10-02).
  // A cell that names the printing it is for ("enclosed-chamber printing"); a filament "ideal for use in open desktop 3D
  // printers" needs none. ("Enclosed-frame (rec.), open-frame" stays a reviewer's reading: it allows both.)
  // A filament printable without one says it needs none: "printable without an enclosure", "Can be printed without a
  // heated enclosure", "doesn't require a 3D printer with a closed/heated enclosure" (the delta re-read of 2026-10-02).
  if (/\b(printable|printed|print)\s+without\s+an?\s+(heated\s+)?enclosure\b|\b(does\s+not|doesn[’']t)\s+require\s+a\s+(3d\s+)?printer\s+with\s+a\s+closed/i.test(text)) return { text, state: 'not-needed' };
  if (/^enclosed[- ]chamber\s+printing\b|\bkeep\s+the\s+(?:printer(?:'s)?\s+)?(?:chamber|enclosure|door)\s+closed\b|^enclosed[- ]frame$|\ban?\s+enclosed\s+printer\s+is\s+recommended\b|\bneeds\s+a\s+warm\s+room\b|\bclosed\s+pressure\s+room\b/i.test(text)) return { text, state: 'recommended' };
  // SIDDAMENT's "Seal the Box: No" (or "Yes"): whether the printer must be closed.
  // "Yes/No" leaves it to the printer: optional, which needs none (D88's "Optional").
  const sealed = /\bseal\s+the\s+box\s*[:：]?\s*(yes\s*\/\s*no|yes|no)\b/i.exec(text);
  if (sealed) return { text, state: /^yes$/i.test(sealed[1]) ? 'recommended' : 'not-needed' };
  // A printer type a table answers with ("Compatible Printer Type | Open-frame").
  if (/^open[- ]frame$/i.test(text)) return { text, state: 'not-needed' };
  // A cell that lists open-frame printers among those the filament prints on ("Enclosed-frame (recommended), open-frame",
  // "Enclosed frame recommended; open frame compatible") allows printing open: the enclosure is a preference, which the raw
  // column keeps (D168; reviewers had typed these not-needed under D33, and this reader read them as recommended).
  if (/\bopen[- ]frame\b/i.test(text) && !/\b(?:not|avoid\w*|never)\b[^.;]{0,30}\bopen[- ]frame\b|\bopen[- ]frame\b[^.;]{0,30}\b(?:not|unsuitable)\b/i.test(text)) return { text, state: 'not-needed' };
  if (/\bideal\s+for\s+use\s+in\s+open\b/i.test(text)) return { text, state: 'not-needed' };
  if (/\b(best|better)\s+with\s+an?\s+enclosed\s+(print\s+area|printer|build\s+(area|volume|space))\b|^print(ing)?\s+in\s+an?\s+(enclosed|closed)\s+printer\b|^at\s+least\s+(a\s+)?closed\s+chamber\b/i.test(text)) return { text, state: 'recommended' };
  // Advice to use one, with no temperature: Siraya Tech's "Use an enclosure to maintain consistent temperature and reduce
  // potential warping, especially for larger prints."
  if (/^use\s+an?\s+(enclosure|enclosed\s+printer)\b/i.test(text)) return { text, state: 'recommended' };
  // eSUN's ePLA-Silk Rainbow page: "We recommend keeping the printer enclosure open during printing to lower the chamber
  // temperature": a filament whose maker asks for the enclosure to be opened needs none (the research intake, D168).
  if (/\bkeep\w*\s+the\s+(?:printer(?:'s)?\s+)?(?:enclosure|door|lid|cover)\s+open\b/i.test(text)) return { text, state: 'not-needed' };
  // Siraya Tech's "An enclosure is crucial for maintaining consistent printing temperatures" (the research intake, D168).
  if (/\ban?\s+enclosure\s+is\s+(?:crucial|essential|necessary|required|needed|important)\b/i.test(text)) return { text, state: 'recommended' };
  // A comparison table may answer the row with a mark instead of a word: one copy of Bambu Lab's filament guide draws a
  // tick or a cross in its "Print with Enclosure" row, where the revision its page links prints "Required" and
  // "Optional" (D88, m209).
  if (/^[✗✘]$/.test(text)) return { text, state: 'not-needed' };
  // The guide's revision that prints the row in words says "Optional" where the other draws the cross (m150 checked each
  // type both carry): an enclosure the maker calls optional is not needed.
  if (/^optional$/i.test(text)) return { text, state: 'not-needed' };
  if (/^[✓✔]$/.test(text)) return { text, state: 'recommended' };
  // "for larger components" is the same statement as "recommended for larger prints", which this already reads:
  // a condition on when an enclosure helps, not a refusal. The raw column keeps the condition.
  if (/\b(recommended|yes|active\s+heated|required)\b/i.test(text) || /^for\s+(larger|large|big)\b/i.test(text)) return { text, state: 'recommended' };
  return { text, state: 'unknown', unparsed: true };
}

/**
 * Nozzle diameters: "0.4, 0.6, 0.8 mm", "0.2, 0.4,0.6, 0.8mm", ">=0.4 mm". A comma decimal ("0,4 mm", 101 cells), a
 * leading dot (".4mm"), a slicer version ("Simplify 3D v.4.1.2", "Orcaslicer2.10") and a size the cell rules out ("0.2 mm
 * Nozzle NOT Compatible") were read as numbers alone: "≥ 0,2 mm" gave a minimum of 2 mm (the parser sweep of 2026-10-17,
 * D141). An at-least in words ("at least 0.6 mm", "minimum", "or larger") is one too. No typed column reads this: the
 * drawer shows the cell's words, and the compiled list is for the audit.
 */
const NOT_A_DIAMETER_RE = /\bv\.?\s*\d+(?:\.\d+)+|[A-Za-z]+\d+(?:\.\d+)*[A-Za-z]*|\d+(?:[.,]\d+)?\s*mm\s+(?:nozzles?\s+)?not\s+(?:compatible|supported|recommended)\b|\bnot\s+(?:compatible|supported)\s+(?:with\s+)?\d+(?:[.,]\d+)?\s*mm\b/gi;
export function parseNozzleDiameters(raw) {
  const text = raw == null ? '' : String(raw).trim();
  if (!text || /^not published$/i.test(text)) return { text, diameters: [], minimum: null, state: PROCESS_STATE.UNKNOWN };
  const s = clean(text).replace(/[≥]/g, '>=').replace(NOT_A_DIAMETER_RE, ' ').replace(/(\d),(\d)/g, '$1.$2').replace(/(^|[^\d])\.(\d)/g, '$10.$2');
  const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter((n) => n >= 0.1 && n <= 2);
  const atLeast = />=?\s*\d/.test(s) || /\b(?:at\s+least|minimum|min\.?|larger|bigger|above|or\s+(?:more|up|greater))\b/i.test(s);
  return {
    text,
    diameters: atLeast ? [] : [...new Set(nums)].sort((a, b) => a - b),
    minimum: nums.length ? Math.min(...nums) : null,
    atLeast,
    state: nums.length ? PROCESS_STATE.RANGE : PROCESS_STATE.UNKNOWN,
  };
}

const WEAR_CAUTION_RE = /\bmay\s+require\s+nozzle\s+replacements?\b|\bbe\s+prepared\s+to\s+replace\b|\bbrass\b[^.;]*\blife\b[^.;]*\breduced\b|\baccelerated\s+brass\s+wear\b|\bminimi[sz]e\w*\s+(?:the\s+)?(?:increased\s+)?wear\b|\bcan\s+be\s+minimi[sz]ed\s+by\b/i;
const ASKS_FOR_NOZZLE_RE = /\brecommend\w*\b|\badvis\w*\b|\brequired?\b(?!\s+nozzle\s+replacements?)|\brequirement\b|\bmust\s+(?:use|be\s+printed)\b|\bneeds?\s+(?:an?\s+)?(?:hardened|wear|steel|ruby)/i;

/** Abrasion column: does this material demand a hardened or abrasion-resistant nozzle? */
export function parseAbrasion(raw) {
  const text = raw == null ? '' : String(raw).trim();
  if (!text || /^not published$/i.test(text)) return { text, requiresHardened: null, state: PROCESS_STATE.UNKNOWN };
  if (/no special concerns/i.test(text)) return { text, requiresHardened: false, state: 'stated' };
  // Bambu Lab's filament guide answers "Nozzle Size/Material" per filament (D88). "All Size/Material" is any nozzle,
  // brass included. A list that allows stainless steel beside hardened steel (its TPU) names the nozzles it prints on,
  // not an abrasion requirement, and says nothing either way about brass: stated, and no reading.
  if (/^all\s+size\s*\/\s*material$/i.test(text)) return { text, requiresHardened: false, state: 'stated' };
  // QIDI's guide answers the same question per size: "0.2-0.8 mm / All Material" is any nozzle material, brass included.
  if (/\/\s*all\s+materials?$/i.test(text)) return { text, requiresHardened: false, state: 'stated' };
  if (/hardened\s+steel\s*\/\s*stainless\s+steel|stainless\s+steel\s*\/\s*hardened\s+steel/i.test(text)) return { text, requiresHardened: null, state: 'stated' };
  // A sheet that asks the question and answers it is answering it: Spectrum prints "Ruby or hardened nozzle
  // recommended | No" for its unfilled filaments and "| Yes" for its carbon-filled ones, one row of a table
  // whose label is the question. Read by its words alone, the "No" row says hardened — which is the opposite of
  // what the sheet says, and would put twenty ordinary PLAs and PETGs behind a hardened nozzle.
  // A statement that one is not needed says so whatever word it ends on: nice's "Hardened nozzle not required",
  // Recreus's "No hardened nozzle required", Siraya Tech's "harden steel nozzle is not needed". Read by its last word
  // alone, "required" said the opposite.
  // A filled filament its maker says is not abrasive: FormFutura's Galaxy PLA, "Even though its high
  // silver-aluminium-flaked content Galaxy PLA is not abrasive to the nozzle of your 3D printer."
  // FormFutura's later page opens the cell with it: "Not abrasive to the nozzle of 3D printers" (the research intake).
  if (/\b(is|are)\s+not\s+abrasive\b|^not\s+abrasive\b|\bnon-?abrasive\b/i.test(text)) return { text, requiresHardened: false, state: 'stated' };
  if (/(harden\w*|ruby|abrasi\w*)[^.;]*\bnot\s+(needed|required|necessary)\b|\bno\s+(harden\w*|ruby|abrasi\w*)\b[^.;]*\b(required|needed|necessary)\b/i.test(text)) return { text, requiresHardened: false, state: 'stated' };
  // A maker who says the filament has no abrasive filler, or that a standard (brass) nozzle suffices, is saying none is
  // needed; read by the word "abrasive" alone these said the opposite (Polymaker's "No. ABS Pro contains no abrasive
  // fillers and prints well with standard nozzles", Fabru's "nicht abrasiv; Messingdüse ausreichend"; reader round, m345).
  if (/\b(?:contains?|has|have|with)\s+no\s+abrasive\b|\bnicht\s+abrasiv\b|\bprints?\s+(?:well\s+)?(?:with|on)\s+(?:a\s+)?(?:standard|regular|normal)\s+nozzles?\b|\bMessingd[üu]se\s+ausreichend\b/i.test(text)) return { text, requiresHardened: false, state: 'stated' };
  // A sheet that says brass will do, with hardened steel as an alternative, needs none: MatterHackers' "Minimum 0.4 mm
  // diameter; brass or hardened steel compatible" (reader round, m353).
  if (/\bbrass\s+(?:or|and|\/)\s+(?:hardened\s+)?steel\s+(?:nozzles?\s+)?(?:are\s+|is\s+)?(?:compatible|fine|ok|suitable)\b/i.test(text)) return { text, requiresHardened: false, state: 'stated' };
  // A sheet that asks for stainless steel or another hardened alloy names a nozzle harder than brass and does not require a
  // hardened one: Fillamentum's "We recommend using nozzles from stainless steel or other hardened alloys", "a stainless steel
  // nozzle or nozzles made with hardened copper alloys". Stated, and no reading, as the guide's "Hardened Steel / Stainless
  // Steel" list is (D168, the owner's ruling of 2026-10-19).
  // Eumakers' "stainless brass or resistant copper alloy nozzles" is the same advice (the research intake).
  if (/\bstainless(?:\s+steel)?\b[^.;]*\bor\b[^.;]*\b(?:harden\w*|resistant)\s+(?:\w+\s+)?alloys?\b|\bstainless\s+steel\s+nozzles?\s+or\b/i.test(text)) return { text, requiresHardened: null, state: 'stated' };
  // A caution about wear, with no hardened nozzle asked for, is not a requirement: "may require nozzle replacements", "be
  // prepared to replace your nozzle … or upgrade", "brass nozzle … life may be reduced", "hardened steel nozzles minimise
  // increased wear" (D168). It says nothing either way, so a nozzle line that asks for one still decides (readAbrasion).
  if (WEAR_CAUTION_RE.test(text) && !ASKS_FOR_NOZZLE_RE.test(text)) return { text, requiresHardened: null, state: 'stated', caution: true };
  // A German sheet answers "Hardened Nozzle nein" (or "ja"), or "Gehärtete Nozzle ja" in its own words; Extrudr follows the
  // answer with its reason, "Gehärtete Nozzle ja; wird die Verwendung einer gehärteten Düse empfohlen".
  // Spectrum's Polish sheets answer "Dysza rubinowa lub hartowana: niewymagane" (ruby or hardened nozzle: not required) or
  // "zalecane" (recommended; check round 3).
  const answer = /\b(yes|ja|no|nein|not necessary|none|required|recommended|niewymagane|zalecane|wymagane)\s*[.:]?$/i.exec(text) ?? /^gehärtete\s+(?:nozzle|düse)\s+(ja|nein)\b/i.exec(text);
  if (answer && /abrasi|hardened|gehärtet|hartowan|carbide|diamond|ruby|rubinow/i.test(text)) {
    const says = answer[1].toLowerCase();
    if (says === 'no' || says === 'nein' || says === 'not necessary' || says === 'none' || says === 'niewymagane') return { text, requiresHardened: false, state: 'stated' };
    return { text, requiresHardened: true, state: 'stated' };
  }
  // A sheet that names the nozzles it prints on: IPCON's "Compatible Nozzle Material Any common material" and BASF's "use
  // of brass nozzle" allow brass; "recommended to use steel or ruby nozzles" (Fiberlogy, QIDI) does not (the profile
  // root-cause sweep of 2026-10-02).
  // A sentence that warns against brass ("do not recommend … brass nozzle") says the opposite, and "no need to use a steel
  // nozzle" allows brass; a stainless or "brass or steel" nozzle is not a hardened one (the independent review).
  const against = /\b(do\s+not|don[’']t|not)\s+(recommend\w*|use)\b[^.;]*\bbrass\b/i.test(text);
  if (/\bno\s+need\s+(?:to\s+use\s+|for\s+)?(?:an?\s+)?(?:hardened\s+|stainless\s+)?(?:steel|ruby|hardened)\b/i.test(text)) return { text, requiresHardened: false, state: 'stated' };
  if (!against && /\bany\s+common\s+(nozzle\s+)?material\b|\buse\s+of\s+(an?\s+)?brass\s+nozzles?\b|\bbrass\b[^.;]{0,40}\b(will\s+work|works|is\s+fine|is\s+sufficient|is\s+suitable)\b/i.test(text)) return { text, requiresHardened: false, state: 'stated' };
  if (against || /\b(use|using|recommend\w*)\b[^.;]*\b(hardened\s+steel|steel\s+or\s+(?:a\s+)?ruby|ruby)\b[^.;]*\bnozzles?\b/i.test(text)) return { text, requiresHardened: true, state: 'stated' };
  // Polymaker asks for "a wear resistant nozzle" where others say hardened; Raise3D writes "hardening steel".
  if (/abb?rasi|harden|carbide|diamond|wear[- ]resist\w*\s+nozzle/i.test(text)) return { text, requiresHardened: true, state: 'stated' };
  return { text, requiresHardened: null, state: PROCESS_STATE.UNKNOWN, unparsed: true };
}


// What a sheet says about whether to dry (D127). The words decide the need; a schedule printed beside them is a separate
// fact, and a cell that states a schedule and nothing else asks for it. Vocabulary: schema/vocab/drying-needs.csv.
//
// Fillamentum prints a scale beside its schedule, "the need to dry 5 (1 – not necessary to dry, 5 – always needed)": the
// legend is not a statement that drying is unnecessary, and the number is the sheet's own answer (1 and 2: optional).
const NEED_SCALE_RE = /\bthe\s+need\s+to\s+dry\s*(\d)\s*\(\s*1\b[^)]*\)/i;
// Drying advised for a condition, whatever the schedule: Bambu Lab's guide "Optional", "if wet", "only if the material has
// absorbed moisture", "In case the filament has become wet", Polymaker's "after prolonged exposure to humidity".
const OPTIONAL_NEED_RE = new RegExp([
  String.raw`\boptional(?:ly)?\b`,
  String.raw`\bif\s+(?:the\s+(?:filament|material)\s+(?:is|gets|becomes|has\s+become)\s+)?(?:wet|damp|moist\w*|needed|necessary|moisture)\b`,
  String.raw`\bonly\s+(?:\w+\s+){0,2}(?:if|when)\b`,
  String.raw`\bwhen\s+(?:the\s+(?:filament|material)\s+(?:is|gets)\s+)?(?:too\s+)?(?:wet|damp|moist)`,
  String.raw`\b(?:if|when)\s+the\s+(?:filament|material)\s+has\s+absorbed\s+(?:moisture|water)`,
  String.raw`\bin\s+case\b`,
  String.raw`\brecommended\s+if\b`,
  String.raw`\bafter\s+(?:prolonged\s+)?exposure\s+to\s+(?:humidity|moisture)`,
  // Nanovia's "dehydrate ... at 60°c for 4 hours or longer, when the spools has been exposed to moisture for an extended
  // period" (check round 3: the cell had dropped the condition and read as required).
  String.raw`\b(?:if|when)\s+the\s+(?:spools?|filament|material)\s+(?:has|have)\s+been\s+exposed\s+to\s+(?:moisture|humidity)`,
  // colorFabb's "If absorbed moisture levels are too high ... Drying is advised" (check round 3's sealed sample).
  String.raw`\bif\s+absorbed\s+moisture\b`,
  // Kimya's "if the material absorbs more than 500ppm moisture" (the parser sweep of 2026-10-17, D141).
  String.raw`\bif\s+the\s+(?:filament|material)\s+absorbs\b`,
  // QIDI's "If the filament has been opened for a long time and problems such as air bubbles ... appear, please dry",
  // "If you find the printing quality decreases after ASA has been exposed in the air", "After the material is damp,
  // ... Please dry the filament in an oven", and DuPont's "If excessive moisture absorption has occurred, then the resin
  // must be dried" (quality round 2026-10-07: the cells had dropped the condition and read as required).
  String.raw`\bif\s+the\s+(?:filament|material)\s+has\s+been\s+(?:opened|exposed)\b`,
  String.raw`\bif\s+you\s+find\s+the\s+print(?:ing)?\s+quality\s+(?:decreases|drops|declines)\b`,
  String.raw`\bafter\s+the\s+(?:filament|material)\s+is\s+(?:damp|wet|moist)`,
  String.raw`\bif\s+excessive\s+moisture\b`,
  // FormFutura's "Once BVOH has been used or opened from its original vacuum-sealed packaging for a while it is advised to
  // dry", and Prusament's "Maximum 60°C for 4-8h depending on moisture" (D168, the owner's ruling of 2026-10-19).
  String.raw`\bonce\s+[^.;]{0,80}?\b(?:opened|used)\b`,
  String.raw`\bdepending\s+on\s+(?:the\s+)?(?:moisture|humidity|how\s+(?:wet|moist|damp))`,
  // Spectrum's drying guide answers its need column "In justified cases" (the research intake, D168).
  String.raw`\bin\s+justified\s+cases\b`,
].join('|'), 'i');
// A sentence that says "not necessary" and then asks for drying in some cases: "(not necessary but recommended)",
// "may require drying before use, although usually it is not necessary".
const OPTIONAL_FIRST_RE = /\bnot\s+(?:necessary|needed|required)\s+but\s+recommended\b|\bmay\s+require\b|\balthough\s+usually\b/i;
// Drying the sheet says is not needed: "Not necessary", "No drying needed!", "Nicht notwendig", "niewymagane", the bare "No"
// of a yes/no row, "We do not recommend drying our PLA-based materials", "printing without pre-drying".
const NOT_NEEDED_RE = new RegExp([
  String.raw`\bnot\s+(?:be\s+)?(?:necessary|needed|required)\b`,
  String.raw`\bno\s+(?:pre-?\s*)?drying\b`,
  String.raw`\bno\s+need\s+to\s+(?:pre-?\s*)?dry\b`,
  String.raw`\b(?:do|does)\s+not\s+(?:recommend|require|need)\s+(?:any\s+)?(?:pre-?\s*)?dry`,
  String.raw`\bwithout\s+pre-?\s*drying\b`,
  String.raw`\bnicht\s+(?:erforderlich|notwendig)\b|\bniewymagane\b`,
  String.raw`^no[.!]?$`,
].join('|'), 'i');

/** Does the sheet ask for drying? 'required', 'optional' or 'not-needed' (a cell with no statement is 'unknown' before this runs). */
// A drying time that starts at nothing, Extrudr's "Drying time 0–4 h", is a step the maker lets the reader skip.
const ZERO_HOURS_RE = /(?<![\d.,])0\s*[-–~]\s*\d+(?:[.,]\d+)?\s*(?:h|hours?|hrs?)\b/i;
function dryingNeed(s) {
  const scale = NEED_SCALE_RE.exec(s);
  const body = scale ? s.replace(scale[0], ' ') : s;
  if (OPTIONAL_FIRST_RE.test(body)) return 'optional';
  if (!NOT_NEEDED_RE.test(body) && ZERO_HOURS_RE.test(body)) return 'optional';
  if (NOT_NEEDED_RE.test(body)) return 'not-needed';
  if (OPTIONAL_NEED_RE.test(body)) return 'optional';
  if (scale) return Number(scale[1]) <= 2 ? 'optional' : 'required';
  return 'required';
}

// Hours with no upper end: "6+ hours", "> 5 h", "at least 8 hours", "minimum drying time 3 h", "more than 4 hours", "4 hours or
// longer". The number is the lower bound. A window ("at least 4 to 16 hours", "4-6 h") is hours stated, not an open end.
// "8-12hr" (Fiberlogy, P1914) spells the hour "hr" (the parser sweep of 2026-10-17, D141).
const DRYING_HOURS_RE = /(\d+(?:\.\d+)?)\s*\+?\s*(?:h|hour|hours|hrs?)\b/i;
// FormFutura writes the open end before the number: "Drying: +4 hours at max.110°C" (the research intake).
const OPEN_BEFORE_RE = /\b(?:at\s+least|minimum|minimal|more\s+than|longer\s+than|over)\b[^;,.]*$|[>＞≥]\s*$|(?:^|[\s:])\+\s*$/i;
const OPEN_AFTER_RE = /^\s*(?:h|hours?|hrs?)\b\s*(?:\+|or\s+(?:longer|more))/i;
function hoursAreOpen(source, m) {
  const before = source.slice(0, m.index);
  if (/\d\s*(?:to|-|~)\s*$/i.test(before)) return false;
  return /\+/.test(m[0]) || OPEN_BEFORE_RE.test(before.slice(-30)) || OPEN_AFTER_RE.test(source.slice(m.index + m[1].length));
}

// Hours a maker writes in words, Filamatrix's "dry six to twelve hours at 75° C" (the research intake): read as numbers,
// and only before "hours".
const HOUR_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four'];
const HOUR_WORD = `(?:${[...HOUR_WORDS].reverse().join('|')})`;
const HOUR_WORDS_RE = new RegExp(`\\b(${HOUR_WORD})\\b(?=(?:\\s*(?:to|-|or)\\s*${HOUR_WORD})?\\s*hours?\\b)`, 'gi');

/** Drying: "Blast Drying Oven: 55 C, 8 h", "120C for 4 hours", "6+ hours", "Not necessary", "Optional". */
export function parseDrying(raw) {
  const text = raw == null ? '' : String(raw).trim();
  // A lone "/" is a cell with nothing in it, as a lone dash is in a chamber row.
  if (!text || /^not published$/i.test(text) || /^[/\-–—\s]*$/.test(text)) return { text, state: PROCESS_STATE.UNKNOWN, need: 'unknown', tempC: null, hours: null, hoursOpen: null, required: false };
  const s = clean(text).replace(HOUR_WORDS_RE, (w) => String(HOUR_WORDS.indexOf(w.toLowerCase())));
  // A window is read at its upper end, however its unit is printed: "70-80℃" gave 80 but "90℃-100℃" gave 90 and
  // "8h-12h" gave 8 (the fourth control draw of the profile root-cause sweep, 2026-10-02).
  // A cell that joins two methods ("Blast drying oven 55 °C, 8 h; X1 heatbed 65-75 °C, 12 h") is read by its first.
  const first = /\d/.test(s.split(/;\s*/)[0]) ? s.split(/;\s*/)[0] : s;
  // Eryone prints the unit on the lower end only: "75℃-85, 6h" is 75 to 85 °C (P0445).
  const tempRange = first.match(/(\d{2,3})\s*C?\s*[-–~]\s*(\d{2,3})\s*\(?\s*C/i) ?? first.match(/(\d{2,3})\s*C\s*[-–~]\s*(\d{2,3})\b(?![.,]?\d|\s*(?:h|hours?|hrs?|min)\b)/i);
  const hourRange = first.match(/(\d+(?:\.\d+)?)\s*(?:h|hours?|hrs?)?\s*[-–~]\s*(\d+(?:\.\d+)?)\s*(?:h|hour|hours|hrs?)\b/i);
  // The first schedule the cell states decides: Bambu Lab's guide prints "Blast Drying Oven: 55 °C, 8 h X1 Series
  // Heatbed: 65 - 75 °C, 12 h", and a window further on is the other method's.
  // Polymaker brackets the unit, "65 (˚C)" (P0030): the number before a bracketed C is the temperature (D141).
  const single = first.match(/(\d{2,3})\s*\(?\s*C/i), singleHours = first.match(DRYING_HOURS_RE);
  const tempMatch = tempRange && (!single || tempRange.index <= single.index + single[0].length) ? [null, tempRange[2]] : single || first.match(/:\s*(\d{2,3})/) || s.match(/(\d{2,3})\s*\(?\s*C/i);
  const windowFirst = hourRange && (!singleHours || hourRange.index <= singleHours.index + singleHours[0].length);
  const hourMatch = windowFirst ? [null, hourRange[2]] : singleHours || s.match(DRYING_HOURS_RE);
  // The open end is read from the text around the number that decides; a window never has one.
  const hoursOpen = !hourMatch ? null : windowFirst ? false : hoursAreOpen(singleHours ? first : s, hourMatch);
  const need = dryingNeed(s);
  // A schedule printed in Fahrenheit alone, MatterHackers' "180°F for 4-6 hours", is converted to the nearest degree Celsius
  // (82 °C; the research intake, D168).
  const fahrenheit = !tempMatch && /(\d{2,3})\s*[°˚º]?\s*F\b|(\d{2,3})\s*℉/.exec(s);
  return {
    text,
    state: 'stated',
    need,
    tempC: tempMatch ? Number(tempMatch[1]) : fahrenheit ? Math.round((Number(fahrenheit[1] ?? fahrenheit[2]) - 32) * 5 / 9) : null,
    hours: hourMatch ? Number(hourMatch[1]) : null,
    hoursOpen,
    required: need === 'required',
  };
}
