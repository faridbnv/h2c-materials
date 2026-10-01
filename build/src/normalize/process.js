// Print setup temperature columns are free text: 82 distinct spellings for nozzle alone, mixing
// ranges, single values, categorical states and several dash and degree glyphs. They also mix
// kinds: Chamber holds "Not required" and "Room temperature" alongside real numbers.
//
// Method sheet, H2C / Hardware baseline: 350 C nozzle, 120 C bed, 65 C active chamber.

export const H2C_BASELINE = { nozzleC: 350, bedC: 120, chamberC: 65 };

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
const NOT_REQUIRED_RE = /^(not\s+(required|necessary|needed)|none\s+needed|for printing not necessary)\b/i;
const RECOMMENDED_RE = /^recommended\b/i;
// Polymaker marks the whole window after its numbers: "70 – 80 (recommended) (˚C)", "70-80 (˚C)(Recommended)". A bracket
// holding a number as well ("230~260 ℃ (recommended: 240℃)") recommends a point inside a window, which stays required.
const RECOMMENDED_MARK_RE = /\(\s*recommended\s*\)/i;
const NO_SETPOINT_RE = /^no\s+setpoint\b/i;
// BASF prints a lone dash in its "Build Chamber Temperature" row: no setpoint given, the same statement as NO_SETPOINT.
const DASH_RE = /^-$/;
// CreatBot prints "Chamber temperature OFF": the heater is to be off, so no heated chamber is wanted.
const OFF_RE = /^off$/i;
// Flashforge, SIDDAMENT and LEHVOSS say a filament prints "on non-heated chamber FFF 3D printers" or "in non-heated
// chambers" in their prose. It is read before any number, because "3D" would otherwise be taken for a 3 °C chamber.
const NON_HEATED_RE = /\bnon-?heated\s+chambers?\b/i;
// "65˚C+" (Polymaker ABS Max's chamber), "140 ºC +" and LEHVOSS's "> 120 °C" are at-least values: a lower end, with no
// upper end published.
const AT_LEAST_RE = /^(?:(\d+(?:\.\d+)?)\s*[^\d\s+]{0,3}\s*\+|(?:>|≥|>=)\s*(\d+(?:\.\d+)?)\s*[^\d\s]{0,3})$/;
const AT_LEAST_LEAD_RE = /^(?:>|≥|>=)\s*(\d+(?:\.\d+)?)()\s*[^\d\s]{0,3}\s+[^\d]*$/;
const AMBIENT_RE = /\b(room\s*temp\w*|ambient(\s+temperature)?)\b/i;
const UP_TO_RE = /\bup\s+to\s+(\d+(?:\.\d+)?)/i;

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
  if (NO_SETPOINT_RE.test(s) || DASH_RE.test(s)) {
    return { text, state: PROCESS_STATE.NO_SETPOINT, requirement: REQUIREMENT.UNKNOWN, min: null, max: null };
  }
  if (OFF_RE.test(s) || NON_HEATED_RE.test(s)) {
    return { text, state: PROCESS_STATE.NOT_REQUIRED, requirement: REQUIREMENT.NONE, min: null, max: null };
  }
  // "> 80 °C recommended" and "≥ 90 °C for large parts": an at-least value followed by words, still an open bound.
  const atLeast = s.match(AT_LEAST_RE) ?? s.match(AT_LEAST_LEAD_RE);
  if (atLeast) {
    const [lo, hi] = opts.plausible || [0, 500];
    const min = Number(atLeast[1] ?? atLeast[2]);
    if (min >= lo && min <= hi) return { text, state: PROCESS_STATE.RANGE, requirement: REQUIREMENT.REQUIRED, min, max: null, openHigh: true };
  }

  // Cut trailing clauses that are not about this process parameter.
  let strippedTail = null;
  const tail = s.search(TAIL_MARKERS);
  if (tail > 0) { strippedTail = s.slice(tail).trim(); s = s.slice(0, tail).trim().replace(/[.,;:\-]+$/, ''); }

  let requirement = REQUIREMENT.REQUIRED;
  if (NOT_REQUIRED_RE.test(s)) requirement = REQUIREMENT.NONE;
  else if (RECOMMENDED_RE.test(s) || RECOMMENDED_MARK_RE.test(s)) requirement = REQUIREMENT.RECOMMENDED;

  const ambient = AMBIENT_RE.test(s);
  const [lo, hi] = opts.plausible || [0, 500];

  // A tolerance is centred on the nominal setting; its second number is not an endpoint. The unit may stand
  // between the two: Nobufil prints "Print temperature 260°C ± 10" on fourteen sheets, and without the unit in
  // the pattern that read as a range from 10 to 260 — a window PARSE-MISMATCH refused, which is how it was found.
  // The degree sign is already off by here (`clean`), so it is the letter that has to be allowed for.
  const tolerance = s.match(/(\d+(?:\.\d+)?)\s*[°º˚]?\s*[CF]?\s*(?:±|\+\/-)\s*(\d+(?:\.\d+)?)/);
  if (tolerance) {
    const centre = Number(tolerance[1]), delta = Number(tolerance[2]);
    const min = centre - delta, max = centre + delta;
    if (min < lo || max > hi) return { text, state: PROCESS_STATE.UNKNOWN, requirement, min: null, max: null, unparsed: true };
    return { text, state: PROCESS_STATE.RANGE, requirement, min, max, tolerance: delta };
  }

  // No leading minus in the pattern. These temperatures are never negative, and accepting one
  // makes the range dash in "255-275C" read as the sign of -275, which then fails the plausibility
  // window and silently collapses the range to its lower end.
  const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter((n) => n >= lo && n <= hi);

  const base = { text, requirement, strippedTail: strippedTail || undefined };

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
 * Does this material's stated process window fit inside the H2C envelope?
 * The question the gate asks is whether the material *requires* more than the printer provides,
 * so the upper end of the stated range is what matters.
 *
 * A recommendation is not a requirement. "Recommended 70-140C if possible" exceeds the 65 C
 * chamber but does not make the material unprintable, so it returns a warning the UI can show
 * rather than a verdict that removes the candidate.
 *
 * `partialWindow` is passed for the chamber only. A chamber window of 60-90 C against a 65 C
 * chamber is not a requirement the printer fails: 60-65 C is inside the manufacturer's own window.
 * It is not "within" either, because most of the window cannot be reached, and Bambu says the
 * upper part improves Z strength. So it is its own verdict. Read by the upper end alone it was a
 * hard "exceeds", which failed ABS-CF (50-70 C) outright. Nozzle and bed keep the upper-end rule:
 * there the bottom of a window sits at the hardware's rated maximum, and the six out-of-scope
 * materials trip the gate on exactly those rows (docs/DECISIONS.md, D32).
 */
export function withinH2C(parsed, limitC, { partialWindow = false, makerEnclosure = null } = {}) {
  if (!parsed) return { verdict: 'unknown', reason: 'No requirement published' };

  if (parsed.state === PROCESS_STATE.NOT_REQUIRED || parsed.state === PROCESS_STATE.AMBIENT) {
    return { verdict: 'within', reason: parsed.fromEnclosure
      ? 'The source says an enclosure is not needed, so no heated chamber is required'
      : 'No heated requirement stated' };
  }
  if (parsed.state === PROCESS_STATE.ENCLOSED) {
    // A filament maker's own words (D93), or its printer maker's guide's (D90).
    return { verdict: 'within', reason: makerEnclosure
      ? `Its maker asks for an enclosure, in its words "${makerEnclosure}", and states no temperature; for a type the printer maker's guide asks an enclosure for, the H2C's heated, enclosed chamber (${limitC} °C) is that enclosure`
      : `Asks for its printer maker's enclosure and states no temperature; the H2C's heated, enclosed chamber (${limitC} °C) is that enclosure` };
  }
  if (parsed.state === PROCESS_STATE.NO_SETPOINT) {
    return { verdict: 'unknown', categorical: true, reason: 'The source lists no setpoint ("-"), which is not the same as not required' };
  }
  if (parsed.state === PROCESS_STATE.RECOMMENDED) {
    return { verdict: 'unknown', categorical: true, reason: 'Recommended, but no temperature published. A heated chamber is not proof that 65 \u00b0C is enough' };
  }
  if (parsed.state !== PROCESS_STATE.RANGE) {
    return { verdict: 'unknown', reason: 'No numeric requirement published' };
  }
  // An at-least value ("65˚C+") has no upper end, so it is never within by its upper end: the printer reaches it if it
  // reaches the lower end, and for the chamber that is the bottom of an open window, which is partial.
  if (parsed.openHigh && parsed.max == null) {
    const over = parsed.min - limitC;
    if (over > 0) {
      return parsed.requirement === REQUIREMENT.RECOMMENDED
        ? { verdict: 'exceeds-recommended', reason: `Recommends at least ${parsed.min} °C, above the H2C's ${limitC} °C, but does not require it`, over }
        : { verdict: 'exceeds', reason: `Requires at least ${parsed.min} °C, the H2C provides ${limitC} °C`, over };
    }
    if (partialWindow) {
      return { verdict: 'partial', reason: `Publishes at least ${parsed.min} °C, with no upper end; the H2C reaches only ${parsed.min}–${limitC} °C of that`, reachable: { min: parsed.min, max: limitC }, over: null };
    }
    return { verdict: 'within', reason: `Needs at least ${parsed.min} °C, which the H2C's ${limitC} °C reaches` };
  }
  if (parsed.max <= limitC) {
    return { verdict: 'within', reason: `Needs up to ${parsed.max} \u00b0C, within the H2C's ${limitC} \u00b0C` };
  }
  if (partialWindow && parsed.min !== null && parsed.min <= limitC) {
    const verb = parsed.requirement === REQUIREMENT.RECOMMENDED ? 'Recommends' : 'Publishes';
    return {
      verdict: 'partial',
      reason: `${verb} ${parsed.min}\u2013${parsed.max} \u00b0C; the H2C reaches only ${parsed.min}\u2013${limitC} \u00b0C of that window`,
      reachable: { min: parsed.min, max: limitC },
      over: parsed.max - limitC,
    };
  }
  if (parsed.requirement === REQUIREMENT.RECOMMENDED) {
    return {
      verdict: 'exceeds-recommended',
      reason: `Recommends up to ${parsed.max} \u00b0C, above the H2C's ${limitC} \u00b0C, but does not require it`,
      over: parsed.max - limitC,
    };
  }
  return {
    verdict: 'exceeds',
    reason: `Requires up to ${parsed.max} \u00b0C, the H2C provides ${limitC} \u00b0C`,
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
  if (/\bnot\s+(necessary|needed|required)\b|^no\s+(enclosure|needed)\b|^(no|none)$|\bdoes\s+not\s+require\b|\bdoesn[’']t\s+require\b/i.test(text)) return { text, state: 'not-needed' };
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
  if (/\brecommend\w*\b[^.]*\b(closed|enclosed)\s+(chamber|printer)|\bprint\w*\s+in\s+a\s+printer\s+with\s+(a\s+)?closed\s+chamber/i.test(text)) return { text, state: 'recommended' };
  // Advice to use one, with no temperature: Siraya Tech's "Use an enclosure to maintain consistent temperature and reduce
  // potential warping, especially for larger prints."
  if (/^use\s+an?\s+(enclosure|enclosed\s+printer)\b/i.test(text)) return { text, state: 'recommended' };
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

/** Nozzle diameters: "0.4, 0.6, 0.8 mm", "0.2, 0.4,0.6, 0.8mm", ">=0.4 mm". */
export function parseNozzleDiameters(raw) {
  const text = raw == null ? '' : String(raw).trim();
  if (!text || /^not published$/i.test(text)) return { text, diameters: [], minimum: null, state: PROCESS_STATE.UNKNOWN };
  const s = clean(text).replace(/[≥]/g, '>=');
  const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter((n) => n >= 0.1 && n <= 2);
  const atLeast = />=\s*\d/.test(s);
  return {
    text,
    diameters: atLeast ? [] : [...new Set(nums)].sort((a, b) => a - b),
    minimum: nums.length ? Math.min(...nums) : null,
    atLeast,
    state: nums.length ? PROCESS_STATE.RANGE : PROCESS_STATE.UNKNOWN,
  };
}

/** Abrasion column: does this material demand a hardened or abrasion-resistant nozzle? */
export function parseAbrasion(raw) {
  const text = raw == null ? '' : String(raw).trim();
  if (!text || /^not published$/i.test(text)) return { text, requiresHardened: null, state: PROCESS_STATE.UNKNOWN };
  if (/no special concerns/i.test(text)) return { text, requiresHardened: false, state: 'stated' };
  // Bambu Lab's filament guide answers "Nozzle Size/Material" per filament (D88). "All Size/Material" is any nozzle,
  // brass included. A list that allows stainless steel beside hardened steel (its TPU) names the nozzles it prints on,
  // not an abrasion requirement, and says nothing either way about brass: stated, and no reading.
  if (/^all\s+size\s*\/\s*material$/i.test(text)) return { text, requiresHardened: false, state: 'stated' };
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
  if (/\b(is|are)\s+not\s+abrasive\b|\bnon-?abrasive\b/i.test(text)) return { text, requiresHardened: false, state: 'stated' };
  if (/(harden\w*|ruby|abrasi\w*)[^.;]*\bnot\s+(needed|required|necessary)\b|\bno\s+(harden\w*|ruby|abrasi\w*)\b[^.;]*\b(required|needed|necessary)\b/i.test(text)) return { text, requiresHardened: false, state: 'stated' };
  const answer = /\b(yes|no|not necessary|none|required|recommended)\s*[.:]?$/i.exec(text);
  if (answer && /abrasi|hardened|carbide|diamond|ruby/i.test(text)) {
    const says = answer[1].toLowerCase();
    if (says === 'no' || says === 'not necessary' || says === 'none') return { text, requiresHardened: false, state: 'stated' };
    return { text, requiresHardened: true, state: 'stated' };
  }
  // Polymaker asks for "a wear resistant nozzle" where others say hardened; Raise3D writes "hardening steel".
  if (/abb?rasi|harden|carbide|diamond|wear[- ]resist\w*\s+nozzle/i.test(text)) return { text, requiresHardened: true, state: 'stated' };
  return { text, requiresHardened: null, state: PROCESS_STATE.UNKNOWN, unparsed: true };
}

/** Drying: "Blast Drying Oven: 55 C, 8 h", "120C for 4 hours". */
export function parseDrying(raw) {
  const text = raw == null ? '' : String(raw).trim();
  if (!text || /^not published$/i.test(text)) return { text, required: null, tempC: null, hours: null, state: PROCESS_STATE.UNKNOWN };
  const s = clean(text);
  const tempMatch = s.match(/(\d{2,3})\s*C/i) || s.match(/:\s*(\d{2,3})/);
  const hourMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:h|hour|hours|hrs)\b/i);
  return {
    text,
    required: true,
    tempC: tempMatch ? Number(tempMatch[1]) : null,
    hours: hourMatch ? Number(hourMatch[1]) : null,
    state: 'stated',
  };
}
