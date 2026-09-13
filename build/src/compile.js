// Compile: turn extracted rows into the normalized runtime database.
//
// The one rule that shapes this file: headline values are VERIFIED against the measurements the
// workbook already cites, never recomputed. The Materials sheet carries MeasurementIDs in
// "Mechanical evidence" and "Thermal evidence", PriceIDs in "Price evidence" and a ProfileID in
// "Printing evidence". A headline that does not match its own citation is a build error.

import { parseValue, parseOperator, parseBoolean, toInterval, MISSING, DATA_STATUS } from './normalize/values.js';
import { normalizeDirection, DIRECTION } from './normalize/direction.js';
import { parseHdtStandard } from './normalize/thermal.js';
import {
  parseTemperature, withinH2C, parseNozzleDiameters, parseAbrasion, parseDrying, parseEnclosure,
  H2C_BASELINE, PROCESS_STATE, REQUIREMENT,
} from './normalize/process.js';
import { classifyTopic, classifyFinding, countUsableByCategory } from './normalize/chemical.js';
import { ORIGIN } from './normalize/provenance.js';
import { buildEstimates, summariseEstimates } from './estimates.js';
import { attachChamberEstimates } from './chamber-estimates.js';

// Identifier lists are semicolon separated. Seven materials have no grades at all and say so in
// words, so an explicit missing state must not become an identifier.
const MISSING_TEXT_RE = /^(not published|not applicable|none|n\/a|insufficient comparable data)$/i;
const ids = (cell) => (cell == null ? [] : String(cell)
  .split(/[;,]/)
  .map((s) => s.trim())
  .filter((s) => s && !MISSING_TEXT_RE.test(s)));
const num = (cell) => { const p = parseValue(cell); return p.known ? p.value : null; };
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Plausibility windows keep a stray number in a sentence from being read as a temperature.
const TEMP_WINDOW = { nozzle: [100, 500], bed: [0, 250], chamber: [0, 200] };

// ---------------------------------------------------------------------------- measurements

function compileMeasurements(rows, issues) {
  return rows.map((r) => {
    const status = DATA_STATUS[r['Data status']] ?? null;
    if (!status) issues.push({ level: 'error', where: `Properties row ${r.__row}`, message: `Unknown Data status "${r['Data status']}"` });

    const value = num(r['Normalized value']);
    const uncertainty = num(r['Normalized uncertainty ±']);
    const upperBound = num(r['Normalized upper bound']);
    const operator = parseOperator(r.Operator);
    const direction = normalizeDirection(r.Direction);
    const quarantined = !!status?.quarantined;
    const numeric = !!status?.numeric && value !== null && !quarantined;

    const m = {
      id: r.MeasurementID,
      materialId: r.MaterialID,
      gradeId: r.GradeID,
      property: r.Property,
      value: numeric ? value : null,
      unit: r['Normalized unit'],
      interval: numeric ? toInterval({ value, uncertainty, upperBound, operator }) : null,
      uncertainty: numeric && uncertainty !== null ? uncertainty : null,
      operator,
      dataStatus: r['Data status'],
      corrected: !!status?.corrected,
      qualitative: !!status?.qualitative,
      quarantined,
      numeric,
      specimenType: r['Specimen type'],
      direction: direction.canonical,
      directionText: direction.text,
      moisture: r['Moisture condition'],
      postProcessing: r['Post-processing'],
      testTemperature: r['Test temperature'],
      standardText: r['Standard / load'],
      notch: r.Notch,
      printParameters: r['Specimen / print parameters'],
      sourceId: r.SourceID,
      locator: r.Locator,
      notes: r.Notes,
      raw: { value: r['Raw value'], unit: r['Raw unit'] },
    };

    if (r.Property === 'HDT') {
      const h = parseHdtStandard(r['Standard / load']);
      m.thermal = { standard: h.standard, loadMPa: h.loadMPa, loadStated: h.loadStated, label: h.label, origin: ORIGIN.PARSED };
    }
    if (r.Property === 'Fatigue life') {
      m.fatigue = {
        stressMax: num(r['Stress max MPa']), stressMin: num(r['Stress min MPa']),
        amplitude: num(r['Stress amplitude MPa']), frequencyHz: num(r['Frequency Hz']),
        loadRatioR: num(r['Load ratio R']), runOut: r['Run-out'],
      };
    }
    return m;
  });
}

// ---------------------------------------------------------------------------- profiles

function compileProfiles(rows, issues) {
  return rows.map((r) => {
    const nozzle = parseTemperature(r['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle });
    const bed = parseTemperature(r['Bed °C'], { plausible: TEMP_WINDOW.bed });
    const enclosure = parseEnclosure(r.Enclosure);
    let chamber = parseTemperature(r['Chamber °C'], { plausible: TEMP_WINDOW.chamber });
    // Five Spectrum data sheets say only that a closed chamber is "not necessary". A material that
    // does not need enclosing does not need a heated chamber, so that clears the chamber question
    // without inventing a temperature. The reverse does not hold: an enclosure being recommended
    // says nothing about whether 65 C is enough, so it leaves the chamber unknown.
    if (chamber.state === PROCESS_STATE.UNKNOWN && !chamber.unparsed && enclosure.state === 'not-needed') {
      chamber = { ...chamber, state: PROCESS_STATE.NOT_REQUIRED, requirement: REQUIREMENT.NONE, fromEnclosure: true };
    }
    for (const [name, p] of [['Nozzle', nozzle], ['Bed', bed], ['Chamber', chamber], ['Enclosure', enclosure]]) {
      if (p.unparsed) issues.push({ level: 'warn', where: `Print setup row ${r.__row}`, message: `${name} text not parsed: "${p.text}"` });
    }
    return {
      id: r.ProfileID,
      materialId: r.MaterialID,
      gradeId: r.GradeID,
      profile: r.Profile,
      nozzle, bed, chamber,
      gates: {
        nozzle: withinH2C(nozzle, H2C_BASELINE.nozzleC),
        bed: withinH2C(bed, H2C_BASELINE.bedC),
        chamber: withinH2C(chamber, H2C_BASELINE.chamberC, { partialWindow: true }),
      },
      enclosure: r.Enclosure,
      enclosureState: enclosure.state,
      plate: r.Plate,
      nozzleMaterial: r['Nozzle material'],
      nozzleDiameter: parseNozzleDiameters(r['Nozzle diameter']),
      abrasion: parseAbrasion(r['Abrasion / clogging']),
      drying: parseDrying(r.Drying),
      storageHumidity: r['Storage humidity'],
      // Routing and AMS fields are carried verbatim. 133 of 160 say "Verify exact grade", so they
      // are evidence chips in the detail view, never filters. See the plan, section 5.4.
      routing: { left: r['H2C left'], right: r['H2C right'], ams2Pro: r['AMS 2 Pro'], amsHT: r['AMS HT'], amsPublished: r['AMS published'] },
      supportPairing: r['Support pairing'],
      failureModes: r['Failure modes'],
      sourceId: r.SourceID,
      h2cSourceId: r['H2C SourceID'],
      locator: r.Locator,
    };
  });
}

/**
 * Material-level gate across a material's print profiles.
 *
 * Precedence: within > partial > exceeds-recommended > exceeds > unknown.
 *
 * "within" wins because a printable grade existing is what the question asks. The part that needs
 * care is that a known exceedance must outrank an unknown: PEEK carries two profiles demanding a
 * 390-430 and a 400-480 C nozzle against the H2C's 350 C, plus one profile that publishes nothing.
 * Letting the silent profile decide would report PEEK as "unknown" and throw away the evidence that
 * it is out of envelope. Silence is not counter-evidence.
 *
 * "partial" (chamber only) sits just below "within": part of a published window is reachable,
 * which is better than a window the printer misses entirely.
 */
const GATE_PRECEDENCE = ['within', 'partial', 'exceeds-recommended', 'exceeds', 'unknown'];

function aggregateGate(profiles, axis) {
  if (!profiles.length) return { verdict: 'unknown', reason: 'No print profile recorded' };
  const vs = profiles.map((p) => p.gates[axis]);

  for (const verdict of GATE_PRECEDENCE) {
    const matches = vs.filter((v) => v.verdict === verdict);
    if (!matches.length) continue;
    // Among several exceedances, report the smallest overshoot: it is the closest to printable.
    // Among unknowns, a source that said something in words ("recommended", "-") explains more
    // than one that said nothing, so it supplies the reason.
    const chosen = verdict === 'exceeds' || verdict === 'partial'
      ? matches.reduce((a, b) => ((a.over ?? Infinity) <= (b.over ?? Infinity) ? a : b))
      : verdict === 'unknown' ? (matches.find((v) => v.categorical) ?? matches[0])
      : matches[0];
    const silent = vs.filter((v) => v.verdict === 'unknown').length;
    return {
      ...chosen,
      profiles: vs.length,
      ...(vs.length > 1 ? { basis: `${matches.length} of ${vs.length} profiles` } : {}),
      ...(silent && verdict !== 'unknown' ? { unpublishedProfiles: silent } : {}),
    };
  }
  return { verdict: 'unknown', reason: 'No print profile recorded' };
}

/**
 * What a printer owner needs before anything else: what to set the machine to, and where to buy it.
 *
 * Both already existed in the compiled data and neither reached the interface. The temperatures sat
 * inside individual print profiles, one tab deep in the material drawer. The purchase links sat on
 * 104 price observations and were never rendered anywhere at all, so a user who decided on a
 * material had no route to buying it.
 */
function printSummary(profiles) {
  const pick = (axis) => {
    const ranges = profiles.map((p) => p[axis]).filter((t) => t.state === 'range' && t.max !== null);
    if (!ranges.length) return null;
    // The widest published window across this material's grades, so the table never implies a
    // tighter requirement than the sources support.
    const min = Math.min(...ranges.map((r) => r.min ?? r.max));
    const max = Math.max(...ranges.map((r) => r.max));
    return { min, max, profiles: ranges.length };
  };
  return { nozzleC: pick('nozzle'), bedC: pick('bed'), chamberC: pick('chamber'), chamberGuidance: chamberGuidance(profiles) };
}

/**
 * What the sources say about the chamber when they say it in words.
 *
 * "Recommended", "not required" and a data sheet's "-" are manufacturer evidence and deserve to be
 * seen, but none is a temperature, and none may become one. This keeps the strongest statement
 * across a material's profiles: a source saying no heated chamber is needed outranks one
 * recommending a chamber without a number, which outranks one listing no setpoint.
 */
const GUIDANCE_ORDER = ['not-required', 'recommended', 'no-setpoint'];
function chamberGuidance(profiles) {
  const found = profiles.map((p) => p.chamber).map((c) => {
    if (c.state === PROCESS_STATE.NOT_REQUIRED || c.state === PROCESS_STATE.AMBIENT) {
      return { state: 'not-required', label: c.state === PROCESS_STATE.AMBIENT ? 'Room temperature' : 'Not required', fromEnclosure: !!c.fromEnclosure };
    }
    if (c.state === PROCESS_STATE.RECOMMENDED) return { state: 'recommended', label: 'Recommended' };
    if (c.state === PROCESS_STATE.NO_SETPOINT) return { state: 'no-setpoint', label: 'No setpoint' };
    return null;
  }).filter(Boolean);
  if (!found.length) return null;
  for (const state of GUIDANCE_ORDER) {
    const hits = found.filter((f) => f.state === state);
    if (hits.length) return { ...hits.find((h) => !h.fromEnclosure) ?? hits[0], profiles: hits.length };
  }
  return null;
}

function buySummary(materialId, prices) {
  // A quarantined observation is a different product. It can be neither the buy link nor the
  // evidence that a material is in stock.
  const mine = prices.filter((p) => p.materialId === materialId && p.url && !p.quarantined);
  if (!mine.length) return null;
  // Prefer something you can actually buy today at a price the headline was built from.
  const rank = (p) => (p.stock === 'In stock' ? 4 : 0) + (p.headlineSample ? 2 : 0) + (p.regularPerKg !== null ? 1 : 0);
  const best = [...mine].sort((a, b) => rank(b) - rank(a) || (a.regularPerKg ?? 1e9) - (b.regularPerKg ?? 1e9))[0];
  return {
    url: best.url, retailer: best.retailer, variant: best.variant, packaging: best.packaging,
    netMassKg: best.netMassKg, perKg: best.regularPerKg, stock: best.stock, accessDate: best.accessDate,
    offers: mine.length,
    anyInStock: mine.some((p) => p.stock === 'In stock'),
  };
}

// ---------------------------------------------------------------------------- headlines

// headline key -> [Materials column, unit, evidence column, expected property, expected direction]
const HEADLINES = [
  ['density',          'Density kg/m³',            'kg/m³', 'Mechanical evidence', 'Density',            null],
  ['tensileModulusXY', 'Tensile modulus XY GPa',   'GPa',   'Mechanical evidence', 'Tensile modulus',    DIRECTION.XY],
  ['tensileStrengthXY','Tensile strength XY MPa',  'MPa',   'Mechanical evidence', null,                 DIRECTION.XY],
  ['elongationXY',     'Elongation at break XY %', '%',     'Mechanical evidence', 'Elongation at break',DIRECTION.XY],
  ['hdt045',           'HDT 0.45 MPa °C',          '°C',    'Thermal evidence',    'HDT',                null],
];

function compileHeadlines(mat, measurementsById, measurementsByMaterial, issues) {
  const headline = {};
  for (const [key, column, unit, evidenceColumn, property, direction] of HEADLINES) {
    const parsed = parseValue(mat[column]);
    const cited = ids(mat[evidenceColumn]).map((id) => measurementsById.get(id)).filter(Boolean);

    if (!parsed.known) {
      headline[key] = {
        known: false, missing: parsed.missing, text: parsed.text, unit,
        related: relatedEvidence(mat, key, measurementsByMaterial),
      };
      continue;
    }

    const match = cited.find((m) => m.value === parsed.value && m.unit === unit
      && m.materialId === mat.MaterialID && m.gradeId === mat['Representative grade']
      && (property ? m.property === property : RELATED.tensileStrengthXY.includes(m.property))
      && (!direction || m.direction === direction));
    if (!match) {
      issues.push({
        level: 'error',
        where: `Materials ${mat.MaterialID} (${mat['Original name']})`,
        message: `Headline ${key} = ${parsed.value} is not equal to any measurement cited in "${evidenceColumn}"`,
      });
      headline[key] = { known: true, value: parsed.value, unit, origin: ORIGIN.SOURCE, verified: false };
      continue;
    }

    const entry = {
      known: true,
      value: parsed.value,
      unit,
      origin: ORIGIN.SOURCE,
      verified: true,
      measurementId: match.id,
      gradeId: match.gradeId,
      sourceId: match.sourceId,
      direction: match.direction,
      specimenType: match.specimenType,
      moisture: match.moisture,
      interval: match.interval,
      uncertainty: match.uncertainty,
    };
    if (direction && match.direction !== direction) {
      issues.push({ level: 'error', where: `Materials ${mat.MaterialID}`, message: `Headline ${key} cites a ${match.direction} measurement but the column is ${direction}` });
    }
    // The column is labelled 0.45 MPa. Where the cited source never stated a load, say so rather
    // than letting the column heading assert it.
    if (key === 'hdt045') {
      entry.loadStated = match.thermal?.loadStated ?? false;
      entry.loadMPa = match.thermal?.loadMPa ?? null;
      entry.standard = match.thermal?.standard ?? null;
      // A stable code, not prose. The engine branches on this, and the UI supplies the wording.
      if (!entry.loadStated) {
        entry.caveat = 'load-not-stated';
        entry.caveatText = 'Source states the standard but not the load';
      }
    }
    headline[key] = entry;
  }
  return headline;
}

/**
 * Related evidence for a headline that has no value.
 *
 * 45 materials have no tensile-strength XY headline, yet 31 of them do have a tensile-strength
 * measurement on record. It was not promoted to the headline because the source never stated a
 * direction, or because it measures a different endpoint. Showing a blank cell hides real evidence
 * and invites the reader to assume nothing is known.
 *
 * This never becomes the headline and never satisfies a constraint. It is labelled with exactly
 * why it is not the headline, so the engineer can judge it.
 */
const RELATED = {
  density:           ['Density'],
  tensileModulusXY:  ['Tensile modulus'],
  tensileStrengthXY: ['Tensile strength (endpoint unspecified)', 'Tensile yield strength', 'Tensile break strength'],
  elongationXY:      ['Elongation at break', 'Elongation at yield'],
  hdt045:            ['HDT'],
};

// There is deliberately NO cross-property fallback.
//
// An earlier version fell back to Vicat and glass transition when a material had no HDT. For TPE
// that surfaced its glass transition of -35 C in a column headed "HDT at 0.45 MPa", which is a
// different physical quantity and would mislead anyone screening for heat resistance. The Method
// sheet is explicit: keep HDT load, Tg, Vicat, melting and continuous-service ratings distinct,
// and flexural strength is not tensile strength. Those other properties are in the material's own
// Thermal and Mechanical tabs, correctly labelled.

const DIRECTION_NOTE = {
  XY: null,
  Z: 'Z direction, the weak axis for a printed part',
  XZ: 'XZ orientation',
  ZX: 'ZX orientation',
  'horizontal-source-label': 'source says "horizontal" without defining the build orientation',
  'vertical-xz-source-label': 'source says "vertical XZ" without defining the build orientation',
  'along-flow': 'measured along flow',
  'not-applicable': null,
  unknown: 'direction not stated by the source, so it cannot be read as XY',
};

/**
 * Related evidence for a headline that has no value.
 *
 * 31 materials have a tensile-strength measurement on record that never became the headline,
 * because the source stated no direction or measured a different endpoint. A blank cell hid that
 * and implied nothing was known.
 *
 * It reports ONE measurement, never a range across grades. The Method sheet's Comparison / Headlines
 * rule is that the Materials sheet shows labelled single-grade observations and not cross-grade
 * family ranges; a range would assert exactly the comparability the database refuses to assert.
 * PEBA is the case that matters: its three grades run 7.5, 25 and 30 MPa, and "7.5 to 30" reads as
 * one material's uncertainty rather than three different products.
 *
 * This never becomes the headline and never satisfies a constraint.
 */
function relatedEvidence(mat, key, measurementsByMaterial) {
  const props = RELATED[key];
  if (!props) return null;
  const materialId = mat.MaterialID;
  const representative = mat['Representative grade'];

  const items = (measurementsByMaterial.get(materialId) ?? [])
    .filter((m) => m.numeric && !m.quarantined && props.includes(m.property))
    .map((m) => ({
      measurementId: m.id, gradeId: m.gradeId, sourceId: m.sourceId,
      property: m.property, value: m.value, unit: m.unit,
      direction: m.direction, specimenType: m.specimenType, standard: m.standardText,
      loadMPa: m.thermal?.loadMPa ?? null,
      printed: !!m.specimenType && m.specimenType.startsWith('Printed specimen'),
      why: (m.specimenType?.startsWith('Raw material') ? 'raw-material supplier value, not a printed or product specimen' : null)
        || DIRECTION_NOTE[m.direction]
        || (key === 'hdt045' && m.thermal && m.thermal.loadMPa !== 0.45
            ? (m.thermal.loadStated ? `measured at ${m.thermal.loadMPa} MPa, not 0.45 MPa` : 'load not stated by the source')
            : null)
        || (key === 'tensileStrengthXY' && m.property !== props[0]
            ? `${m.property.replace('Tensile ', '')} endpoint, not the headline endpoint` : null)
        || 'on record but not selected as the headline observation',
    }));
  if (!items.length) return null;

  // Closest to what the headline would have been: XY, printed, the representative grade.
  const score = (i) =>
    (i.direction === 'XY' ? 8 : i.direction === 'not-applicable' ? 6 : 0)
    + (i.printed ? 4 : 0)
    + (i.gradeId === representative ? 2 : 0)
    + (i.property === props[0] ? 1 : 0);
  const sorted = [...items].sort((a, b) => score(b) - score(a));
  const best = sorted[0];

  return {
    count: items.length,
    best,
    grades: new Set(items.map((i) => i.gradeId)).size,
    unit: best.unit,
    items: sorted.slice(0, 10),
  };
}

function compilePriceHeadline(mat, pricesById, pricesByMaterial, issues) {
  const parsed = parseValue(mat['Price CAD/kg']);
  const cited = ids(mat['Price evidence']).map((id) => pricesById.get(id)).filter(Boolean);
  if (!parsed.known) return { known: false, missing: parsed.missing, text: parsed.text, unit: 'CAD/kg' };

  // Method sheet, Pricing / Calculations: headline is the median of eligible flagged observations.
  const sample = (pricesByMaterial.get(mat.MaterialID) || []).filter((p) => p.headlineSample && p.regularPerKg !== null);
  const expected = median(sample.map((p) => p.regularPerKg));
  const agrees = expected !== null && Math.abs(expected - parsed.value) < 0.005;
  if (!agrees) {
    issues.push({
      level: 'error',
      where: `Materials ${mat.MaterialID}`,
      message: `Price headline ${parsed.value} does not equal the median of its headline-sample observations (${expected})`,
    });
  }
  // A headline may only cite observations it was built from. When CA0069 was quarantined (a PLA Pure
  // listing filed under ABS) the median moved, but the Materials row still cited it and still said
  // "2 observations", and nothing noticed because only the value was checked.
  const stray = cited.filter((p) => !p.headlineSample || p.regularPerKg === null);
  if (stray.length) {
    issues.push({
      level: 'error',
      where: `Materials ${mat.MaterialID}`,
      message: `Price headline cites ${stray.map((p) => p.id).join(', ')}, which ${stray.length === 1 ? 'is' : 'are'} not in the headline sample`,
    });
  }
  return {
    known: true, value: parsed.value, unit: 'CAD/kg', origin: ORIGIN.SOURCE, verified: agrees && !stray.length,
    priceIds: cited.filter((p) => !stray.includes(p)).map((p) => p.id), observations: sample.length, basis: mat['Price basis'],
  };
}

// ---------------------------------------------------------------------------- facets

/** Facets the Materials sheet does not carry directly. Every one is tagged derived. */
function deriveFacets(mat) {
  const name = `${mat['Normalized name'] ?? ''} ${mat['Original name'] ?? ''}`;
  const modifier = mat['Modifier / filler'] ?? '';
  const reinforcement =
    modifier === 'Carbon fibre' ? 'carbon-fibre' :
    modifier === 'Glass fibre' ? 'glass-fibre' :
    modifier === 'Unfilled / unspecified' ? 'unfilled' :
    modifier === 'ESD formulation' ? 'esd' :
    modifier === 'Foaming' ? 'foaming' : 'undisclosed';
  return {
    reinforcement: { value: reinforcement, origin: ORIGIN.SOURCE },
    esd: { value: modifier === 'ESD formulation' || /\bESD\b/.test(name), origin: ORIGIN.DERIVED, from: 'Modifier / filler and name' },
    flexible: { value: mat.Family === 'Flexible Elastomers', origin: ORIGIN.DERIVED, from: 'Family' },
    supportMaterial: { value: mat.Role === 'Support/interface', origin: ORIGIN.SOURCE },
    flameRetardant: { value: /\bFR\b/.test(name), origin: ORIGIN.DERIVED, from: 'name only; no flame-retardancy field exists' },
  };
}

// ---------------------------------------------------------------------------- main

export function compile(wb, { snapshot, build }) {
  const issues = [];

  const sources = wb.Sources.rows.map((r) => ({
    id: r.SourceID, publisher: r.Publisher, title: r.Title, revision: r.Revision,
    publicationDate: r['Publication date'], accessDate: r['Access date'], sourceClass: r['Source class'],
    url: r.URL, locator: r.Locator, applicableGrades: r['Applicable grades'],
    accessStatus: r['Access status'], sha256: r.SHA256,
  }));

  const grades = wb.Grades.rows.map((r) => ({
    id: r.GradeID, materialId: r.MaterialID, manufacturer: r.Manufacturer, product: r['Product name'],
    formulationKey: r['Shared formulation key'], composition: r['Composition / filler'],
    colourCaveat: r['Colour caveat'], availability: r.Availability, certifications: r['Certification claims'],
    rationale: r['Selected-grade rationale'], sourceId: r.SourceID, locator: r['Source locator'],
    diameters: r['Diameter compatibility'],
    retired: r.Availability === 'Retired mapping; audit trail only',
  }));

  const measurements = compileMeasurements(wb.Properties.rows, issues);
  const measurementsById = new Map(measurements.map((m) => [m.id, m]));

  const profiles = compileProfiles(wb['Print setup'].rows, issues);
  const retiredGrades = new Set(grades.filter((g) => g.retired).map((g) => g.id));
  for (const p of profiles) p.retired = retiredGrades.has(p.gradeId);
  const profilesByMaterial = new Map();
  for (const p of profiles) {
    if (p.retired) continue;
    if (!profilesByMaterial.has(p.materialId)) profilesByMaterial.set(p.materialId, []);
    profilesByMaterial.get(p.materialId).push(p);
  }

  const prices = wb['Prices CA'].rows.map((r) => ({
    id: r.PriceID, materialId: r.MaterialID, gradeId: r.GradeID, retailer: r.Retailer,
    variant: r['Variant / SKU'], packaging: r.Packaging, netMassKg: num(r['Net mass kg']),
    listPrice: num(r['List price CAD']), salePrice: num(r['Sale price CAD']),
    regularPerKg: num(r['Regular CAD/kg']), stock: r.Stock,
    eligibleForMedian: parseBoolean(r['Eligible for median']),
    headlineSample: parseBoolean(r['Headline sample']),
    displayedPrice: num(r['Displayed price CAD']), currency: r.Currency, market: r.Market,
    taxShipping: r['Tax / shipping'], basis: r['Regular price basis'], url: r.URL,
    sourceId: r.SourceID, accessDate: r['Access date'], notes: r.Notes,
    // The workbook marks a wrong-product listing by writing "Quarantined" into its price basis
    // (CA0069, a PLA Pure spool filed under ABS). It stays as an audit trail and nothing else.
    quarantined: /^quarantined\b/i.test(String(r['Regular price basis'] ?? '')),
  }));
  const pricesById = new Map(prices.map((p) => [p.id, p]));
  const pricesByMaterial = new Map();
  for (const p of prices) {
    if (!pricesByMaterial.has(p.materialId)) pricesByMaterial.set(p.materialId, []);
    pricesByMaterial.get(p.materialId).push(p);
  }

  const evidence = wb['Use & durability'].rows.map((r) => {
    const topic = classifyTopic(r.Topic);
    const finding = classifyFinding(r.Finding);
    return {
      id: r.EvidenceID, materialId: r.MaterialID, gradeId: r.GradeID, domain: r.Domain,
      topic: r.Topic, category: topic.category, categoryLabel: topic.label,
      filterable: topic.filterable, strength: topic.strength ?? null, agent: topic.agent ?? null,
      verdict: finding.verdict, finding: r.Finding, qualified: !!finding.qualified, vague: !!finding.vague,
      exposure: r['Exposure / conditions'], rating: num(r['Rating 1–5']), rubricId: r.RubricID,
      evidenceType: r['Evidence type'], sourceId: r.SourceID, locator: r.Locator,
    };
  });

  const coverage = wb.Coverage.rows.map((r) => ({
    id: r.CoverageID, materialId: r.MaterialID, domain: r.Domain, status: r.Status, finding: r.Finding,
  }));

  const method = wb.Method.rows.map((r) => ({ section: r.Section, topic: r.Topic, rule: r['Definition / rule'] }));

  const measurementsByMaterial = new Map();
  for (const m of measurements) {
    if (!measurementsByMaterial.has(m.materialId)) measurementsByMaterial.set(m.materialId, []);
    measurementsByMaterial.get(m.materialId).push(m);
  }

  const materials = wb.Materials.rows.map((mat) => {
    const mProfiles = profilesByMaterial.get(mat.MaterialID) || [];
    return {
      id: mat.MaterialID,
      name: mat['Original name'],
      normalizedName: mat['Normalized name'],
      abbreviation: mat.Abbreviation,
      fullName: mat['Full name'],
      family: mat.Family,
      basePolymer: mat['Base polymer'],
      modifier: mat['Modifier / filler'],
      role: mat.Role,
      scope: mat.Scope,
      h2cStatus: mat['H2C status'],
      excluded: mat.Scope === 'Excluded',
      representativeGrade: mat['Representative grade'],
      gradeIds: ids(mat.GradeIDs),
      headline: { ...compileHeadlines(mat, measurementsById, measurementsByMaterial, issues), priceCADkg: compilePriceHeadline(mat, pricesById, pricesByMaterial, issues) },
      headlineBasis: mat['Headline basis'],
      measurementConditions: mat['Measurement conditions'],
      facets: deriveFacets(mat),
      guidance: { nozzle: mat['Nozzle guidance'], bed: mat['Bed guidance'], chamber: mat['Chamber guidance'] },
      print: printSummary(mProfiles),
      buy: buySummary(mat.MaterialID, prices),
      gates: {
        scope: mat.Scope === 'H2C-relevant' ? 'within' : 'excluded',
        nozzle: aggregateGate(mProfiles, 'nozzle'),
        bed: aggregateGate(mProfiles, 'bed'),
        chamber: aggregateGate(mProfiles, 'chamber'),
        abrasive: mProfiles.some((p) => p.abrasion.requiresHardened) ? 'requires-hardened'
          : mProfiles.some((p) => p.abrasion.requiresHardened === false) ? 'no-special-concern' : 'unknown',
        drying: mProfiles.some((p) => p.drying.required) ? 'required' : 'unknown',
      },
      profileIds: mProfiles.map((p) => p.id),
      printingEvidence: ids(mat['Printing evidence']),
      // What the Materials row cites for its headlines, kept so the validator can check that every
      // citation exists and belongs to this material, not only the ones a headline value matched.
      headlineEvidence: { mechanical: ids(mat['Mechanical evidence']), thermal: ids(mat['Thermal evidence']) },
      bestUses: mat['Best uses'],
      limitations: mat.Limitations,
      impactNote: mat['Impact / toughness'],
      fatigueCreep: mat['Fatigue / creep'],
      printability: { rating: num(mat['Printability rating 1–5']), rubric: mat['Printability rubric'] },
      identity: { source: mat['Identity source'], notes: mat['Identity notes'], h2cEvidence: ids(mat['H2C evidence']) },
      evidenceIds: {
        use: ids(mat['Use evidence']), environmental: ids(mat['Environmental evidence']),
        durability: ids(mat['Durability evidence']), safety: ids(mat['Safety evidence']),
      },
    };
  });

  // Family estimates are attached last, once every headline is known, and only to headlines that
  // have no value of their own.
  buildEstimates(materials, grades);
  const chamberEstimates = attachChamberEstimates(materials);
  issues.push(...chamberEstimates.issues);

  const environmentCategories = countUsableByCategory(wb['Use & durability'].rows);

  return {
    db: {
      meta: {
        snapshot, build,
        // Prices are sampled on their own date, which need not be the database snapshot: the
        // 2026-09-13 manufacturer audit moved the snapshot and re-sampled no prices.
        pricesSampled: prices.map((p) => p.accessDate).filter(Boolean).sort().at(-1) ?? null,
        h2cBaseline: H2C_BASELINE,
        counts: {
          materials: materials.length,
          h2cRelevant: materials.filter((m) => !m.excluded).length,
          excluded: materials.filter((m) => m.excluded).length,
          grades: grades.length, measurements: measurements.length,
          numericMeasurements: measurements.filter((m) => m.numeric).length,
          quarantined: measurements.filter((m) => m.quarantined).length,
          profiles: profiles.length, evidence: evidence.length, prices: prices.length,
          sources: sources.length, coverage: coverage.length,
        },
        environmentCategories,
        estimateCoverage: summariseEstimates(materials),
        chamberEstimates: { applied: chamberEstimates.applied.length, superseded: chamberEstimates.superseded },
        headlineCoverage: Object.fromEntries(
          [...HEADLINES.map(([k]) => k), 'priceCADkg'].map((k) => [k, materials.filter((m) => m.headline[k]?.known).length]),
        ),
      },
      materials, grades, measurements, profiles, evidence, prices, sources, coverage, method,
    },
    issues,
  };
}
