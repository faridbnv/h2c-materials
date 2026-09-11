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
  parseTemperature, withinH2C, parseNozzleDiameters, parseAbrasion, parseDrying,
  H2C_BASELINE, PROCESS_STATE, REQUIREMENT,
} from './normalize/process.js';
import { classifyTopic, classifyFinding, countUsableByCategory } from './normalize/chemical.js';
import { ORIGIN } from './normalize/provenance.js';

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
    const chamber = parseTemperature(r['Chamber °C'], { plausible: TEMP_WINDOW.chamber });
    for (const [name, p] of [['Nozzle', nozzle], ['Bed', bed], ['Chamber', chamber]]) {
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
        chamber: withinH2C(chamber, H2C_BASELINE.chamberC),
      },
      enclosure: r.Enclosure,
      plate: r.Plate,
      nozzleMaterial: r['Nozzle material'],
      nozzleDiameter: parseNozzleDiameters(r['Nozzle diameter']),
      abrasion: parseAbrasion(r['Abrasion / clogging']),
      drying: parseDrying(r.Drying),
      storageHumidity: r['Storage humidity'],
      // Routing and AMS fields are carried verbatim. 133 of 156 say "Verify exact grade", so they
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
 * Precedence: within > exceeds-recommended > exceeds > unknown.
 *
 * "within" wins because a printable grade existing is what the question asks. The part that needs
 * care is that a known exceedance must outrank an unknown: PEEK carries two profiles demanding a
 * 390-430 and a 400-480 C nozzle against the H2C's 350 C, plus one profile that publishes nothing.
 * Letting the silent profile decide would report PEEK as "unknown" and throw away the evidence that
 * it is out of envelope. Silence is not counter-evidence.
 */
const GATE_PRECEDENCE = ['within', 'exceeds-recommended', 'exceeds', 'unknown'];

function aggregateGate(profiles, axis) {
  if (!profiles.length) return { verdict: 'unknown', reason: 'No print profile recorded' };
  const vs = profiles.map((p) => p.gates[axis]);

  for (const verdict of GATE_PRECEDENCE) {
    const matches = vs.filter((v) => v.verdict === verdict);
    if (!matches.length) continue;
    // Among several exceedances, report the smallest overshoot: it is the closest to printable.
    const chosen = verdict === 'exceeds'
      ? matches.reduce((a, b) => ((a.over ?? Infinity) <= (b.over ?? Infinity) ? a : b))
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

// ---------------------------------------------------------------------------- headlines

// headline key -> [Materials column, unit, evidence column, expected property, expected direction]
const HEADLINES = [
  ['density',          'Density kg/m³',            'kg/m³', 'Mechanical evidence', 'Density',            null],
  ['tensileModulusXY', 'Tensile modulus XY GPa',   'GPa',   'Mechanical evidence', 'Tensile modulus',    DIRECTION.XY],
  ['tensileStrengthXY','Tensile strength XY MPa',  'MPa',   'Mechanical evidence', null,                 DIRECTION.XY],
  ['elongationXY',     'Elongation at break XY %', '%',     'Mechanical evidence', 'Elongation at break',DIRECTION.XY],
  ['hdt045',           'HDT 0.45 MPa °C',          '°C',    'Thermal evidence',    'HDT',                null],
];

function compileHeadlines(mat, measurementsById, issues) {
  const headline = {};
  for (const [key, column, unit, evidenceColumn, property, direction] of HEADLINES) {
    const parsed = parseValue(mat[column]);
    const cited = ids(mat[evidenceColumn]).map((id) => measurementsById.get(id)).filter(Boolean);

    if (!parsed.known) {
      headline[key] = { known: false, missing: parsed.missing, text: parsed.text, unit };
      continue;
    }

    const match = cited.find((m) => m.value === parsed.value && (!property || m.property === property));
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
      if (!entry.loadStated) entry.caveat = 'Source states the standard but not the load';
    }
    headline[key] = entry;
  }
  return headline;
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
  return {
    known: true, value: parsed.value, unit: 'CAD/kg', origin: ORIGIN.SOURCE, verified: agrees,
    priceIds: cited.map((p) => p.id), observations: sample.length, basis: mat['Price basis'],
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
  }));

  const measurements = compileMeasurements(wb.Properties.rows, issues);
  const measurementsById = new Map(measurements.map((m) => [m.id, m]));

  const profiles = compileProfiles(wb['Print setup'].rows, issues);
  const profilesByMaterial = new Map();
  for (const p of profiles) {
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
      headline: { ...compileHeadlines(mat, measurementsById, issues), priceCADkg: compilePriceHeadline(mat, pricesById, pricesByMaterial, issues) },
      headlineBasis: mat['Headline basis'],
      measurementConditions: mat['Measurement conditions'],
      facets: deriveFacets(mat),
      guidance: { nozzle: mat['Nozzle guidance'], bed: mat['Bed guidance'], chamber: mat['Chamber guidance'] },
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

  const environmentCategories = countUsableByCategory(wb['Use & durability'].rows);

  return {
    db: {
      meta: {
        snapshot, build,
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
        headlineCoverage: Object.fromEntries(
          [...HEADLINES.map(([k]) => k), 'priceCADkg'].map((k) => [k, materials.filter((m) => m.headline[k]?.known).length]),
        ),
      },
      materials, grades, measurements, profiles, evidence, prices, sources, coverage, method,
    },
    issues,
  };
}
