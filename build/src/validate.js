// Validation. The build fails on any error. Warnings describe what the tool cannot yet see, which
// is why the report is a deliverable in its own right rather than console noise.

import { DIRECTION } from './normalize/direction.js';
import { PROCESS_STATE } from './normalize/process.js';

const err = (where, message) => ({ level: 'error', where, message });
const warn = (where, message) => ({ level: 'warn', where, message });

export function validate(db, wb) {
  const issues = [];

  // -- identifiers are unique -------------------------------------------------
  for (const [name, rows] of [
    ['materials', db.materials], ['grades', db.grades], ['measurements', db.measurements],
    ['profiles', db.profiles], ['evidence', db.evidence], ['prices', db.prices],
    ['sources', db.sources], ['coverage', db.coverage],
  ]) {
    const seen = new Set();
    for (const r of rows) {
      if (!r.id) { issues.push(err(name, 'Record with no identifier')); continue; }
      if (seen.has(r.id)) issues.push(err(`${name} ${r.id}`, 'Duplicate identifier'));
      seen.add(r.id);
    }
  }

  // -- referential integrity --------------------------------------------------
  const M = new Set(db.materials.map((m) => m.id));
  const G = new Set(db.grades.map((g) => g.id));
  const S = new Set(db.sources.map((s) => s.id));
  const ref = (rows, name, field, universe, universeName) => {
    for (const r of rows) {
      const v = r[field];
      if (!v || v === 'Not applicable' || v === 'Not published') continue;
      if (!universe.has(v)) issues.push(err(`${name} ${r.id}`, `${field} "${v}" is not a known ${universeName}`));
    }
  };
  for (const [rows, name] of [[db.grades, 'grades'], [db.profiles, 'profiles'], [db.measurements, 'measurements'], [db.evidence, 'evidence'], [db.prices, 'prices'], [db.coverage, 'coverage']]) {
    ref(rows, name, 'materialId', M, 'MaterialID');
  }
  for (const [rows, name] of [[db.profiles, 'profiles'], [db.measurements, 'measurements'], [db.evidence, 'evidence'], [db.prices, 'prices']]) {
    ref(rows, name, 'gradeId', G, 'GradeID');
  }
  for (const [rows, name] of [[db.grades, 'grades'], [db.profiles, 'profiles'], [db.measurements, 'measurements'], [db.evidence, 'evidence'], [db.prices, 'prices']]) {
    ref(rows, name, 'sourceId', S, 'SourceID');
  }
  for (const m of db.materials) {
    for (const g of m.gradeIds) if (!G.has(g)) issues.push(err(`materials ${m.id}`, `GradeIDs lists unknown grade "${g}"`));
  }

  // -- quarantined rows never enter numeric summaries -------------------------
  // Method sheet, Normalization / Uncertainty: values with unresolved units are quarantined and
  // excluded from numeric summaries.
  for (const m of db.measurements) {
    if (m.quarantined && (m.value !== null || m.numeric)) {
      issues.push(err(`measurements ${m.id}`, 'Quarantined measurement carries a numeric value'));
    }
  }
  const quarantinedIds = new Set(db.measurements.filter((m) => m.quarantined).map((m) => m.id));
  for (const mat of db.materials) {
    for (const [key, h] of Object.entries(mat.headline)) {
      if (h?.measurementId && quarantinedIds.has(h.measurementId)) {
        issues.push(err(`materials ${mat.id}`, `Headline ${key} cites quarantined measurement ${h.measurementId}`));
      }
    }
  }

  // -- XY and Z never merge ---------------------------------------------------
  // Method sheet, Comparison / Directions. A headline labelled XY must cite an XY measurement,
  // and "unknown direction is not XY".
  for (const mat of db.materials) {
    for (const key of ['tensileModulusXY', 'tensileStrengthXY', 'elongationXY']) {
      const h = mat.headline[key];
      if (h?.known && h.verified && h.direction !== DIRECTION.XY) {
        issues.push(err(`materials ${mat.id}`, `Headline ${key} cites a measurement whose direction is ${h.direction}`));
      }
    }
  }

  // -- impact units are never silently reconciled -----------------------------
  // Method sheet, Normalization / Units: "No conversion from J/m without specimen geometry."
  const impact = db.measurements.filter((m) => /Charpy|Izod|Impact/i.test(m.property) && m.numeric);
  const impactUnits = new Set(impact.map((m) => m.unit));
  if (impactUnits.has('J/m') && impactUnits.has('kJ/m²')) {
    const n = impact.filter((m) => m.unit === 'J/m').length;
    issues.push(warn('measurements', `Impact data uses two incompatible units. ${n} rows are J/m (energy per width) and cannot be compared with the kJ/m² rows without specimen geometry. They must not share a chart axis.`));
  }

  // -- excluded materials stay out of the default candidate set ---------------
  const excluded = db.materials.filter((m) => m.excluded);
  if (excluded.length !== 6) issues.push(err('materials', `Expected 6 excluded materials, found ${excluded.length}`));
  for (const m of excluded) {
    if (m.gates.scope !== 'excluded') issues.push(err(`materials ${m.id}`, 'Excluded material does not carry the excluded scope gate'));
  }

  // -- HDT load labelling -----------------------------------------------------
  const hdt = db.materials.filter((m) => m.headline.hdt045?.known && m.headline.hdt045.verified);
  const unstated = hdt.filter((m) => !m.headline.hdt045.loadStated);
  const wrongLoad = hdt.filter((m) => m.headline.hdt045.loadStated && m.headline.hdt045.loadMPa !== 0.45);
  for (const m of wrongLoad) {
    issues.push(err(`materials ${m.id}`, `Column is HDT at 0.45 MPa but the cited source states ${m.headline.hdt045.loadMPa} MPa`));
  }
  if (unstated.length) {
    issues.push(warn('materials', `${unstated.length} of ${hdt.length} HDT headlines cite a source that names the standard but not the load. They carry loadStated:false and must not be presented as confirmed 0.45 MPa values.`));
  }

  // -- family estimates --------------------------------------------------------
  // These are inference, not evidence, so the rules that keep them separable are checked here.
  let estimates = 0;
  for (const mat of db.materials) {
    for (const [key, h] of Object.entries(mat.headline)) {
      if (!h?.estimate) continue;
      estimates++;
      const e = h.estimate;
      if (h.known) issues.push(err(`materials ${mat.id}`, `Headline ${key} has a measured value AND a family estimate`));
      if (mat.excluded) issues.push(err(`materials ${mat.id}`, `Excluded material carries a family estimate for ${key}`));
      if (!e.peers?.length || e.peerCount < 2) issues.push(err(`materials ${mat.id}`, `Estimate for ${key} cites fewer than two independent peers`));
      if (e.lo === e.hi) issues.push(err(`materials ${mat.id}`, `Estimate for ${key} is a single value, not a range`));
      if (!e.basis) issues.push(err(`materials ${mat.id}`, `Estimate for ${key} does not say where it came from`));
      if (e.peers?.some((p) => p.id === mat.id)) issues.push(err(`materials ${mat.id}`, `Estimate for ${key} includes the material itself`));
    }
  }
  if (estimates) {
    issues.push(warn('materials', `${estimates} family estimates were derived for headlines with no measurement. They are inference, not evidence: Strict mode never sees them, and in Explore they can only rule a material out of a requirement it clearly cannot meet.`));
  }

  // -- unparsed free text -----------------------------------------------------
  const unparsedProcess = [];
  for (const p of db.profiles) {
    for (const axis of ['nozzle', 'bed', 'chamber']) {
      if (p[axis].unparsed) unparsedProcess.push(`${p.id} ${axis}: "${p[axis].text}"`);
    }
  }
  if (unparsedProcess.length) {
    issues.push(warn('profiles', `${unparsedProcess.length} process temperature cells were not parsed: ${unparsedProcess.slice(0, 10).join(' | ')}`));
  }
  const unmappedTopics = [...new Set(db.evidence.filter((e) => !e.category).map((e) => e.topic))];
  if (unmappedTopics.length) {
    issues.push(err('evidence', `Topics with no mapping in build/mappings/environment-topics.json: ${unmappedTopics.join(', ')}`));
  }

  // -- materials with nothing to select on ------------------------------------
  const noMeasurements = db.materials.filter((m) => !db.measurements.some((x) => x.materialId === m.id));
  if (noMeasurements.length) {
    issues.push(warn('materials', `${noMeasurements.length} materials have no property measurements at all: ${noMeasurements.map((m) => m.name).join(', ')}`));
  }

  return issues;
}

export function formatReport(db, reference, issues, { snapshot, build }) {
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warn');
  const c = db.meta.counts;
  const L = [];

  L.push('# Validation report');
  L.push('');
  L.push(`Database snapshot ${snapshot} · build ${build}`);
  L.push('');
  L.push(errors.length ? `**${errors.length} errors.** The build did not produce a database.` : '**No errors.**');
  L.push('');

  L.push('## Contents');
  L.push('');
  L.push('| Entity | Records |');
  L.push('|---|---:|');
  for (const [k, v] of Object.entries(c)) L.push(`| ${k} | ${v} |`);
  L.push('');

  L.push('## Headline coverage');
  L.push('');
  L.push('What a selection criterion can actually decide, out of 102 canonical materials.');
  L.push('');
  L.push('| Headline | Materials with a value |');
  L.push('|---|---:|');
  for (const [k, v] of Object.entries(db.meta.headlineCoverage)) L.push(`| ${k} | ${v} |`);
  L.push('');

  L.push('## H2C envelope gate');
  L.push('');
  L.push(`Baseline ${db.meta.h2cBaseline.nozzleC} C nozzle, ${db.meta.h2cBaseline.bedC} C bed, ${db.meta.h2cBaseline.chamberC} C chamber.`);
  L.push('');
  L.push('| Axis | within | partial window | exceeds | exceeds (recommendation only) | unknown |');
  L.push('|---|---:|---:|---:|---:|---:|');
  for (const axis of ['nozzle', 'bed', 'chamber']) {
    const t = { within: 0, partial: 0, exceeds: 0, 'exceeds-recommended': 0, unknown: 0 };
    for (const m of db.materials) t[m.gates[axis].verdict] = (t[m.gates[axis].verdict] ?? 0) + 1;
    L.push(`| ${axis} | ${t.within} | ${axis === 'chamber' ? t.partial : 'n/a'} | ${t.exceeds} | ${t['exceeds-recommended']} | ${t.unknown} |`);
  }
  L.push('');
  L.push('A partial window is chamber-only: part of the published window is reachable at 65 C, never all of it.');
  L.push('Nozzle and bed are read by the upper end of the window.');
  L.push('');

  // What the chamber evidence is made of. A temperature, a statement in words and an estimate are
  // three different kinds of answer, and a count that mixed them would overstate what is known.
  const inScope = db.materials.filter((m) => !m.excluded);
  const kinds = { numeric: 0, 'not-required': 0, recommended: 0, 'no-setpoint': 0, nothing: 0 };
  let withEstimate = 0;
  for (const m of inScope) {
    const g = m.print?.chamberGuidance?.state;
    if (m.print?.chamberC) kinds.numeric++;
    else if (g) kinds[g]++;
    else kinds.nothing++;
    if (m.print?.chamberEstimate) withEstimate++;
  }
  L.push('## Chamber evidence');
  L.push('');
  L.push(`What the ${inScope.length} in-scope materials publish about the chamber, strongest kind first. A statement`);
  L.push('in words is manufacturer evidence but never a temperature. An estimated band is inference from');
  L.push('build/mappings/chamber-estimates.json; it is shown beside the chamber question and changes no verdict.');
  L.push('');
  L.push('| Kind | Materials |');
  L.push('|---|---:|');
  L.push(`| Published temperature window | ${kinds.numeric} |`);
  L.push(`| No heated chamber needed, in words | ${kinds['not-required']} |`);
  L.push(`| Chamber recommended, no temperature | ${kinds.recommended} |`);
  L.push(`| Data sheet lists no setpoint | ${kinds['no-setpoint']} |`);
  L.push(`| Nothing published | ${kinds.nothing} |`);
  L.push(`| Carrying an estimated band (any of the last three) | ${withEstimate} |`);
  L.push('');
  const sup = db.meta.chamberEstimates?.superseded ?? [];
  if (sup.length) {
    L.push(`${sup.length} research bands are superseded by evidence and not used: `
      + sup.map((x) => `${x.material} (${x.band}; ${x.reason})`).join(', ') + '.');
    L.push('');
  }

  L.push('## Environment evidence');
  L.push('');
  L.push('A verdict category has findings that reduce to resistant, limited or not resistant, so it');
  L.push('can answer a pass/fail question. An indicator category has records but no reducible verdict');
  L.push('among them, so it can only show evidence and must never be offered as a hard constraint.');
  L.push('');
  L.push('| Category | Kind | Records | With a verdict | Materials |');
  L.push('|---|---|---:|---:|---:|');
  for (const [k, v] of Object.entries(db.meta.environmentCategories).sort((a, b) => b[1].usable - a[1].usable)) {
    L.push(`| ${k} | ${v.kind} | ${v.records} | ${v.usable} | ${v.materials} |`);
  }
  L.push('');

  L.push('## Family estimates');
  L.push('');
  L.push('Where a material has no measurement of its own, the span of its closest measured relatives');
  L.push('is recorded as a bound. Peers sharing one commercial source count once. These never appear');
  L.push('in Strict mode, and can only exclude, never confirm.');
  L.push('');
  L.push('| Headline | Missing | From family and filler | From family | From behaviour and filler | No peers |');
  L.push('|---|---:|---:|---:|---:|---:|');
  for (const [k, v] of Object.entries(db.meta.estimateCoverage ?? {})) {
    L.push(`| ${k} | ${v.missing} | ${v['family+filler'] ?? 0} | ${v.family ?? 0} | ${v.filler ?? 0} | ${v.none ?? 0} |`);
  }
  L.push('');

  L.push('## Reference layer');
  L.push('');
  L.push(`${reference.meta.count} generic entries, ${reference.meta.defaultSelection.length} shown by default. Never part of the candidate set.`);
  L.push('');

  if (errors.length) {
    L.push('## Errors');
    L.push('');
    for (const e of errors) L.push(`- **${e.where}** — ${e.message}`);
    L.push('');
  }

  L.push('## Warnings');
  L.push('');
  L.push('These are not defects. They record what the compiled database cannot support, so the');
  L.push('interface can say so rather than implying a certainty it does not have.');
  L.push('');
  for (const w of warnings) L.push(`- **${w.where}** — ${w.message}`);
  L.push('');

  return L.join('\n');
}
