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

const NOT_REQUIRED_RE = /^(not\s+(required|necessary|needed)|for printing not necessary)\b/i;
const RECOMMENDED_RE = /^recommended\b/i;
const NO_SETPOINT_RE = /^no\s+setpoint\b/i;
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
  if (NO_SETPOINT_RE.test(s)) {
    return { text, state: PROCESS_STATE.NO_SETPOINT, requirement: REQUIREMENT.UNKNOWN, min: null, max: null };
  }

  // Cut trailing clauses that are not about this process parameter.
  let strippedTail = null;
  const tail = s.search(TAIL_MARKERS);
  if (tail > 0) { strippedTail = s.slice(tail).trim(); s = s.slice(0, tail).trim().replace(/[.,;:\-]+$/, ''); }

  let requirement = REQUIREMENT.REQUIRED;
  if (NOT_REQUIRED_RE.test(s)) requirement = REQUIREMENT.NONE;
  else if (RECOMMENDED_RE.test(s)) requirement = REQUIREMENT.RECOMMENDED;

  const ambient = AMBIENT_RE.test(s);
  const [lo, hi] = opts.plausible || [0, 500];

  // A tolerance is centred on the nominal setting; its second number is not an endpoint.
  const tolerance = s.match(/(\d+(?:\.\d+)?)\s*(?:±|\+\/-)\s*(\d+(?:\.\d+)?)/);
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
export function withinH2C(parsed, limitC, { partialWindow = false } = {}) {
  if (!parsed) return { verdict: 'unknown', reason: 'No requirement published' };

  if (parsed.state === PROCESS_STATE.NOT_REQUIRED || parsed.state === PROCESS_STATE.AMBIENT) {
    return { verdict: 'within', reason: parsed.fromEnclosure
      ? 'The source says an enclosure is not needed, so no heated chamber is required'
      : 'No heated requirement stated' };
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
  // A table with a column headed "Enclosed Space" answers it in one word, and "no" is the whole answer.
  if (/\bnot\s+(necessary|needed|required)\b|^no\s+enclosure\b|^(no|none)$/i.test(text)) return { text, state: 'not-needed' };
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
  if (/abrasi|hardened|carbide|diamond/i.test(text)) return { text, requiresHardened: true, state: 'stated' };
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
