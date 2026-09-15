// Compile: turn the data tables into the normalized runtime database.
//
// The one rule that shapes this file: a headline is a measurement selected in headlines.csv, never a
// number typed a second time. Its value is read from that measurement, and the selection is checked:
// the measurement must be the material's own, on its representative grade, with the headline's
// property, unit and direction. A selection that fails any of these is a build error.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseValue, parseOperator, parseBoolean, toInterval, MISSING, DATA_STATUS } from './normalize/values.js';
import { normalizeDirection, DIRECTION } from './normalize/direction.js';
import { parseHdtStandard } from './normalize/thermal.js';
import {
  parseTemperature, withinH2C, parseNozzleDiameters, parseAbrasion, parseDrying, parseEnclosure,
  H2C_BASELINE, PROCESS_STATE, REQUIREMENT,
} from './normalize/process.js';
import { classifyTopic, classifyFinding, countUsableByCategory } from './normalize/chemical.js';
import { ENVIRONMENT_CATEGORIES } from './coverage-rules.js';
import { compileRegistry, measurementHeadlines, applies } from './registry.js';
import { ORIGIN } from './normalize/provenance.js';
import { applyProfileTyped, applyLoadTyped } from './typed-values.js';
import { buildEstimates, summariseEstimates } from './estimates.js';
import { attachPrintEstimates } from './print-estimates.js';
import { attachChamberEstimates, chamberBandsFromTables } from './chamber-estimates.js';

// Method, Identity / Retired mappings: a retired grade (Grades Status) is an audit record, never an
// active grade. Its Availability conventionally reads this phrase; the validator flags any active
// grade whose Availability still talks about retirement, because that is a half-finished retirement.
export const RETIRED_AVAILABILITY = 'Retired mapping; audit trail only';

const num = (cell) => { const p = parseValue(cell); return p.known ? p.value : null; };
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Plausibility windows keep a stray number in a sentence from being read as a temperature.
export const TEMP_WINDOW = { nozzle: [100, 500], bed: [0, 250], chamber: [0, 200] };

// ---------------------------------------------------------------------------- measurements

function compileMeasurements(rows, issues) {
  return rows.map((r) => {
    const status = DATA_STATUS[r['Data status']] ?? null;
    if (!status) issues.push({ level: 'error', code: 'DATA-STATUS-UNKNOWN', where: `Properties row ${r.__row}`, message: `Unknown Data status "${r['Data status']}"` });

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
      const h = applyLoadTyped(r, parseHdtStandard(r['Standard / load']), issues);
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
    // The stored typed values decide; the parsers' reading of the raw text checks them (typed-values.js).
    const typed = applyProfileTyped(r, {
      nozzle: parseTemperature(r['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }),
      bed: parseTemperature(r['Bed °C'], { plausible: TEMP_WINDOW.bed }),
      chamber: parseTemperature(r['Chamber °C'], { plausible: TEMP_WINDOW.chamber }),
      enclosure: parseEnclosure(r.Enclosure), drying: parseDrying(r.Drying), abrasion: parseAbrasion(r['Abrasion / clogging']),
    }, issues);
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
      if (p.unparsed) issues.push({ level: 'warn', code: 'PARSE-UNREAD', where: `Print setup row ${r.__row}`, message: `${name} text not parsed: "${p.text}"` });
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
      abrasion: typed.abrasion,
      drying: typed.drying,
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

const NOT_PUBLISHED = parseValue('Not published');
const NOT_APPLICABLE = parseValue('Not applicable');

function compileHeadlines(mat, selections, registry, measurementsById, measurementsByMaterial, issues) {
  const headline = {};
  const where = `headlines ${mat.MaterialID} (${mat['Original name']})`;
  const defs = measurementHeadlines(registry);
  for (const s of selections) {
    if (!defs.some((d) => d.key === s.HeadlineKey)) issues.push({ level: 'error', code: 'HEADLINE-KEY-UNKNOWN', where, message: `Headline key "${s.HeadlineKey}" is not a measurement headline in headline_definitions.csv` });
  }
  for (const def of defs) {
    const { key, unit, direction } = def;
    const values = selections.filter((s) => s.HeadlineKey === key && s.Use === 'value');
    if (values.length > 1) issues.push({ level: 'error', code: 'HEADLINE-SELECTION-MULTIPLE', where, message: `${key} selects ${values.length} values (${values.map((s) => s.MeasurementID).join(', ')}); a headline shows one measurement` });

    // A headline limited to some materials does not apply to the rest: not a gap, a statement.
    if (!applies(def.appliesTo, mat)) {
      if (values.length) issues.push({ level: 'error', code: 'HEADLINE-NOT-APPLICABLE', where, message: `${key} does not apply to this material (${def.appliesToText}) but selects ${values[0].MeasurementID}` });
      headline[key] = { known: false, missing: NOT_APPLICABLE.missing, text: NOT_APPLICABLE.text, unit, notApplicable: { reason: def.notApplicableReason, rule: def.appliesToText } };
      continue;
    }

    if (!values.length) {
      headline[key] = {
        known: false, missing: NOT_PUBLISHED.missing, text: NOT_PUBLISHED.text, unit,
        related: relatedEvidence(mat, def, measurementsByMaterial),
      };
      continue;
    }

    const id = values[0].MeasurementID;
    const m = measurementsById.get(id);
    const problem = !m ? `${id} is not an active measurement (missing or a retired duplicate)`
      : !m.numeric ? `${id} has no usable numeric value (${m.dataStatus})`
      : m.materialId !== mat.MaterialID ? `${id} is a measurement of ${m.materialId}`
      : m.gradeId !== mat['Representative grade'] ? `${id} is on grade ${m.gradeId}, not the representative grade ${mat['Representative grade']}`
      : !def.valueProperties.includes(m.property) ? `${id} measures ${m.property}`
      : m.unit !== unit ? `${id} is in ${m.unit}, not ${unit}`
      : direction && m.direction !== direction ? `${id} is a ${m.direction} measurement but the headline is ${direction}`
      : null;
    if (problem) {
      issues.push({ level: 'error', code: 'HEADLINE-SELECTION-INVALID', where, message: `Headline ${key} cannot show ${problem}` });
      headline[key] = { known: true, value: m?.value ?? null, unit, origin: ORIGIN.SOURCE, verified: false };
      continue;
    }

    const entry = {
      known: true,
      value: m.value,
      unit,
      origin: ORIGIN.SOURCE,
      verified: true,
      measurementId: m.id,
      gradeId: m.gradeId,
      sourceId: m.sourceId,
      direction: m.direction,
      specimenType: m.specimenType,
      moisture: m.moisture,
      interval: m.interval,
      uncertainty: m.uncertainty,
    };
    // A headline defined at a test load (HDT at 0.45 MPa). Where the cited source never stated a
    // load, say so rather than letting the label assert it.
    if (def.loadMPa != null) {
      entry.loadStated = m.thermal?.loadStated ?? false;
      entry.loadMPa = m.thermal?.loadMPa ?? null;
      entry.standard = m.thermal?.standard ?? null;
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

/** Every measurement a material cites for its headlines, values and context, grouped as the app shows them. */
function headlineEvidence(selections, registry) {
  const group = Object.fromEntries(measurementHeadlines(registry).map((d) => [d.key, d.evidenceGroup]));
  return {
    mechanical: selections.filter((s) => group[s.HeadlineKey] === 'mechanical').map((s) => s.MeasurementID),
    thermal: selections.filter((s) => group[s.HeadlineKey] === 'thermal').map((s) => s.MeasurementID),
  };
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
function relatedEvidence(mat, def, measurementsByMaterial) {
  const props = def.relatedProperties;
  if (!props.length) return null;
  const materialId = mat.MaterialID;
  const representative = mat['Representative grade'];

  const items = (measurementsByMaterial.get(materialId) ?? [])
    .filter((m) => m.numeric && !m.quarantined && props.includes(m.property))
    .map((m) => ({
      measurementId: m.id, gradeId: m.gradeId, sourceId: m.sourceId, interval: m.interval,
      property: m.property, value: m.value, unit: m.unit,
      direction: m.direction, specimenType: m.specimenType, standard: m.standardText,
      loadMPa: m.thermal?.loadMPa ?? null,
      printed: !!m.specimenType && m.specimenType.startsWith('Printed specimen'),
      why: (m.specimenType?.startsWith('Raw material') ? 'raw-material supplier value, not a printed or product specimen' : null)
        || DIRECTION_NOTE[m.direction]
        || (def.loadMPa != null && m.thermal && m.thermal.loadMPa !== def.loadMPa
            ? (m.thermal.loadStated ? `measured at ${m.thermal.loadMPa} MPa, not ${def.loadMPa} MPa` : 'load not stated by the source')
            : null)
        || (def.endpointNote && m.property !== props[0]
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
    // Every related interval, not only the ten listed. An estimate may not screen a material out of a
    // requirement that any of its own measurements of this property could meet (engine, D42).
    // A resin supplier's moulded value is not a measurement of this material's filament, so it vetoes
    // nothing; the estimate already carries it through the moulded conversion. Zytel 101L's 3.1 GPa
    // once kept PA66 among candidates for "stiffness at least 3 GPa".
    intervals: sorted.filter((i) => !i.specimenType?.startsWith('Raw material'))
      .map((i) => ({ measurementId: i.measurementId, lo: i.interval?.lo ?? null, hi: i.interval?.hi ?? null })),
    grades: new Set(items.map((i) => i.gradeId)).size,
    unit: best.unit,
    items: sorted.slice(0, 10),
  };
}

// Half up to the cent, on the decimal value: 124.485 is 124.49, not binary floating point's 124.48.
const cents = (x) => Math.round(Number((x * 100).toPrecision(12))) / 100;
const NOT_IN_MARKET = parseValue('Not available in sampled Canadian market');

/**
 * Method, Pricing / Calculations: the headline is the median regular CAD/kg of the material's
 * headline-sample observations, to the cent. It is calculated here, never typed, so it cannot
 * disagree with its observations; a material with no sample has no price in the sampled market.
 */
function compilePriceHeadline(mat, pricesByMaterial) {
  const sample = (pricesByMaterial.get(mat.MaterialID) || []).filter((p) => p.headlineSample && p.regularPerKg !== null);
  if (!sample.length) return { known: false, missing: NOT_IN_MARKET.missing, text: NOT_IN_MARKET.text, unit: 'CAD/kg' };
  return {
    known: true, value: cents(median(sample.map((p) => p.regularPerKg))), unit: 'CAD/kg', origin: ORIGIN.SOURCE, verified: true,
    priceIds: sample.map((p) => p.id), observations: sample.length, basis: mat['Price basis'],
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

// ---------------------------------------------------------------------------- family entries

const FAMILY_ENTRY = 'Family entry';

/** Family entries by name, from family_entries.csv and family_members.csv (members in table order). */
function familyEntriesFromTables(wb) {
  const nameOf = new Map(wb.Materials.rows.map((m) => [m.MaterialID, m['Original name']]));
  const out = {};
  for (const r of wb['Family entries'].rows) out[nameOf.get(r.MaterialID)] = { kind: r.Kind, why: r.Why, members: [] };
  for (const r of wb['Family members'].rows) out[nameOf.get(r.FamilyMaterialID)]?.members.push(nameOf.get(r.MemberMaterialID));
  return out;
}

function familyEntryFor(FAMILY_ENTRIES, name) {
  const f = FAMILY_ENTRIES[name];
  return { kind: f?.kind ?? null, why: f?.why ?? null, members: (f?.members ?? []).map((n) => ({ name: n, id: null })) };
}

/**
 * Resolve each family entry's member names to materials, and refuse any disagreement: a family entry
 * the mapping does not describe, a mapping entry the materials table does not mark, a member that is not an
 * in-scope material, or a family entry that still owns an active grade (the duplication this replaced).
 */
function resolveFamilyEntries(FAMILY_ENTRIES, materials, grades, issues) {
  const byName = new Map(materials.map((m) => [m.name, m]));
  const where = 'family_entries.csv';
  for (const m of materials.filter((x) => x.familyEntry)) {
    if (!FAMILY_ENTRIES[m.name]) issues.push({ level: 'error', code: 'FAMILY-ENTRY-MAPPING', where, message: `${m.name} is a family entry in materials.csv but has no row in family_entries.csv` });
    for (const member of m.familyEntry.members) {
      const target = byName.get(member.name);
      if (!target || target.excluded || target.familyEntry) issues.push({ level: 'error', code: 'FAMILY-ENTRY-MAPPING', where, message: `${m.name} lists "${member.name}", which is not an in-scope material` });
      else member.id = target.id;
    }
    const owned = grades.filter((g) => g.materialId === m.id && !g.retired);
    if (owned.length) issues.push({ level: 'error', code: 'FAMILY-ENTRY-OWNS', where: `materials ${m.id}`, message: `Family entry ${m.name} owns active grade${owned.length === 1 ? '' : 's'} ${owned.map((g) => g.id).join(', ')}; a product belongs to the material it is` });
  }
  for (const name of Object.keys(FAMILY_ENTRIES)) {
    if (!byName.get(name)?.familyEntry) issues.push({ level: 'error', code: 'FAMILY-ENTRY-MAPPING', where, message: `${name} has a row in family_entries.csv but materials.csv does not mark it a family entry` });
  }
}

// ---------------------------------------------------------------------------- main

export function compile(wb, { snapshot, build }) {
  const issues = [];
  const registry = compileRegistry(wb, issues);
  const familyEntries = familyEntriesFromTables(wb);

  const sources = wb.Sources.rows.map((r) => ({
    id: r.SourceID, publisher: r.Publisher, title: r.Title, revision: r.Revision,
    publicationDate: r['Publication date'], accessDate: r['Access date'], sourceClass: r['Source class'], citationRole: r['Citation role'],
    url: r.URL, locator: r.Locator, applicableGrades: r['Applicable grades'],
    accessStatus: r['Access status'], sha256: r.SHA256,
  }));

  const grades = wb.Grades.rows.map((r) => ({
    id: r.GradeID, materialId: r.MaterialID, manufacturer: r.Manufacturer, product: r['Product name'],
    formulationKey: r['Shared formulation key'], composition: r['Composition / filler'],
    variant: r.Variant && r.Variant !== 'Not applicable' ? r.Variant : null,
    colourCaveat: r['Colour caveat'], availability: r.Availability, certifications: r['Certification claims'],
    rationale: r['Selected-grade rationale'], sourceId: r.SourceID, locator: r['Source locator'],
    diameters: r['Diameter compatibility'],
    retired: r.Status === 'retired',
  }));
  // A material's procurement grades are its active procurement grades, in file order.
  const procurementGrades = new Map();
  for (const r of wb.Grades.rows) {
    if (r.Role !== 'procurement' || r.Status !== 'active') continue;
    if (!procurementGrades.has(r.MaterialID)) procurementGrades.set(r.MaterialID, []);
    procurementGrades.get(r.MaterialID).push(r.GradeID);
  }
  for (const r of wb.Grades.rows) {
    // Code that only sees compiled grades recognises study and reference grades by their -R# suffix,
    // so the suffix and the role must agree.
    if ((r.Role !== 'procurement') !== /-R\d+$/.test(r.GradeID)) {
      issues.push({ level: 'error', code: 'GRADE-ROLE-ID', where: `grades ${r.GradeID}`, message: `Role ${r.Role} disagrees with the ID: study and reference grades, and only they, end in -R#` });
    }
  }

  // A retired duplicate stays in the tables as an audit trail and never reaches the database: its
  // identical twin under the grade that keeps the product is the record (Method, Identity / Family entries).
  const isRetiredDuplicate = (status) => !!DATA_STATUS[status]?.retiredDuplicate;
  const retiredDuplicates = {
    measurements: wb.Properties.rows.filter((r) => isRetiredDuplicate(r['Data status'])).length,
    evidence: wb['Use & durability'].rows.filter((r) => isRetiredDuplicate(r['Evidence type'])).length,
  };
  const measurements = compileMeasurements(wb.Properties.rows.filter((r) => !isRetiredDuplicate(r['Data status'])), issues);
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

  const prices = wb['Prices CA'].rows.map((r) => {
    const eligibleForMedian = parseBoolean(r['Eligible for median']);
    const listPrice = num(r['List price CAD']), netMassKg = num(r['Net mass kg']);
    // Regular CAD/kg is list price / net mass to the cent, and exists only where a median may use it.
    if (eligibleForMedian && (listPrice === null || !netMassKg)) {
      issues.push({ level: 'error', code: 'PRICE-INCOMPLETE', where: `prices ${r.PriceID}`, message: 'Eligible for median without a list price and net mass to calculate CAD/kg from' });
    }
    return {
    id: r.PriceID, materialId: r.MaterialID, gradeId: r.GradeID, retailer: r.Retailer,
    variant: r['Variant / SKU'], packaging: r.Packaging, netMassKg,
    listPrice, salePrice: num(r['Sale price CAD']),
    regularPerKg: eligibleForMedian && listPrice !== null && netMassKg ? cents(listPrice / netMassKg) : null, stock: r.Stock,
    eligibleForMedian,
    headlineSample: parseBoolean(r['Headline sample']),
    displayedPrice: num(r['Displayed price CAD']), currency: r.Currency, market: r.Market,
    taxShipping: r['Tax / shipping'], basis: r['Regular price basis'], url: r.URL,
    sourceId: r.SourceID, accessDate: r['Access date'], notes: r.Notes,
    // The data marks a wrong-product listing by writing "Quarantined" into its price basis
    // (CA0069, a PLA Pure spool filed under ABS). It stays as an audit trail and nothing else.
    quarantined: /^quarantined\b/i.test(String(r['Regular price basis'] ?? '')),
    };
  });
  const pricesByMaterial = new Map();
  for (const p of prices) {
    if (!pricesByMaterial.has(p.materialId)) pricesByMaterial.set(p.materialId, []);
    pricesByMaterial.get(p.materialId).push(p);
  }

  const evidenceRows = wb['Use & durability'].rows.filter((r) => !isRetiredDuplicate(r['Evidence type']));
  const evidence = evidenceRows.map((r) => {
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

  const links = new Map();
  for (const r of wb['Material links'].rows) {
    const key = `${r.MaterialID}\u0000${r.Link}`;
    if (!links.has(key)) links.set(key, []);
    links.get(key).push(r.RecordID);
  }
  const linked = (materialId, link) => links.get(`${materialId}\u0000${link}`) ?? [];
  const profilesById = new Map(profiles.map((p) => [p.id, p]));
  // A material's environmental evidence is exactly its own exposure, solubility and moisture records.
  const environmentalByMaterial = new Map();
  for (const e of evidence) {
    if (!ENVIRONMENT_CATEGORIES.has(e.category)) continue;
    if (!environmentalByMaterial.has(e.materialId)) environmentalByMaterial.set(e.materialId, []);
    environmentalByMaterial.get(e.materialId).push(e.id);
  }

  const headlineSelections = new Map();
  for (const r of wb.Headlines.rows) {
    if (!headlineSelections.has(r.MaterialID)) headlineSelections.set(r.MaterialID, []);
    headlineSelections.get(r.MaterialID).push(r);
  }

  const measurementsByMaterial = new Map();
  for (const m of measurements) {
    if (!measurementsByMaterial.has(m.materialId)) measurementsByMaterial.set(m.materialId, []);
    measurementsByMaterial.get(m.materialId).push(m);
  }

  const materials = wb.Materials.rows.map((mat) => {
    const mProfiles = profilesByMaterial.get(mat.MaterialID) || [];
    const selections = headlineSelections.get(mat.MaterialID) || [];
    const printingEvidence = linked(mat.MaterialID, 'printing');
    // The guidance quotes the first print profile the material cites.
    const guideProfile = printingEvidence.map((id) => profilesById.get(id)).find(Boolean);
    const guide = (axis) => guideProfile?.[axis].text ?? 'Not published';
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
      // A family or an alias, not a material: it owns no product, carries no value and is never a
      // candidate. Its members come from data/tables/family_members.csv.
      familyEntry: mat.Scope === FAMILY_ENTRY ? familyEntryFor(familyEntries, mat['Original name']) : null,
      representativeGrade: mat['Representative grade'],
      gradeIds: procurementGrades.get(mat.MaterialID) ?? [],
      headline: { ...compileHeadlines(mat, selections, registry, measurementsById, measurementsByMaterial, issues), priceCADkg: compilePriceHeadline(mat, pricesByMaterial) },
      headlineBasis: mat['Headline basis'],
      measurementConditions: mat['Measurement conditions'],
      facets: deriveFacets(mat),
      guidance: { nozzle: guide('nozzle'), bed: guide('bed'), chamber: guide('chamber') },
      print: printSummary(mProfiles),
      buy: buySummary(mat.MaterialID, prices),
      gates: {
        scope: mat.Scope === 'H2C-relevant' ? 'within' : mat.Scope === FAMILY_ENTRY ? 'family' : 'excluded',
        nozzle: aggregateGate(mProfiles, 'nozzle'),
        bed: aggregateGate(mProfiles, 'bed'),
        chamber: aggregateGate(mProfiles, 'chamber'),
        abrasive: mProfiles.some((p) => p.abrasion.requiresHardened) ? 'requires-hardened'
          : mProfiles.some((p) => p.abrasion.requiresHardened === false) ? 'no-special-concern' : 'unknown',
        drying: mProfiles.some((p) => p.drying.required) ? 'required' : 'unknown',
      },
      profileIds: mProfiles.map((p) => p.id),
      printingEvidence,
      // Everything headlines.csv cites for this material, kept so the validator can check that every
      // citation exists and belongs to it, not only the ones selected as values.
      headlineEvidence: headlineEvidence(selections, registry),
      bestUses: mat['Best uses'],
      limitations: mat.Limitations,
      impactNote: mat['Impact / toughness'],
      fatigueCreep: mat['Fatigue / creep'],
      printability: { rating: num(mat['Printability rating 1–5']), rubric: mat['Printability rubric'] },
      identity: { source: mat['Identity source'], notes: mat['Identity notes'], h2cEvidence: linked(mat.MaterialID, 'h2c-status') },
      evidenceIds: {
        use: linked(mat.MaterialID, 'use'), environmental: environmentalByMaterial.get(mat.MaterialID) ?? [],
        durability: linked(mat.MaterialID, 'durability'), safety: linked(mat.MaterialID, 'safety'),
      },
    };
  });

  resolveFamilyEntries(familyEntries, materials, grades, issues);

  // Estimates are attached last, once every headline is known, and only to headlines that have no
  // value of their own. The model's calibration and diagnostics travel in meta (DECISIONS D43).
  const estimateModel = buildEstimates(materials, { grades, measurements, registry });
  const chamberEstimates = attachChamberEstimates(materials, chamberBandsFromTables(wb));
  issues.push(...chamberEstimates.issues);
  const printEstimates = attachPrintEstimates(materials);

  const environmentCategories = countUsableByCategory(evidenceRows);

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
          h2cRelevant: materials.filter((m) => !m.excluded && !m.familyEntry).length,
          familyEntries: materials.filter((m) => m.familyEntry).length,
          retiredDuplicates,
          excluded: materials.filter((m) => m.excluded).length,
          grades: grades.length, measurements: measurements.length,
          numericMeasurements: measurements.filter((m) => m.numeric).length,
          quarantined: measurements.filter((m) => m.quarantined).length,
          profiles: profiles.length, evidence: evidence.length, prices: prices.length,
          sources: sources.length, coverage: coverage.length,
        },
        environmentCategories,
        estimateCoverage: summariseEstimates(materials, registry),
        estimateModel,
        chamberEstimates: { applied: chamberEstimates.applied.length, superseded: chamberEstimates.superseded },
        printEstimates,
        headlineCoverage: Object.fromEntries(
          registry.headlines.map((h) => [h.key, materials.filter((m) => m.headline[h.key]?.known).length]),
        ),
      },
      materials, grades, measurements, profiles, evidence, prices, sources, coverage, method,
      // What every property and headline means. The app builds its labels, filters, axes, table and
      // export from this, so a registry row reaches the interface with no code change.
      registry,
    },
    issues,
  };
}
