// Validation. The build fails on any error. Warnings describe what the tool cannot yet see, which
// is why the report is a deliverable in its own right rather than console noise.

import { DIRECTION } from './normalize/direction.js';
import { PROCESS_STATE } from './normalize/process.js';
import {
  ENVIRONMENT_CATEGORIES, CLAIMS_EVIDENCE, CLAIMS_ABSENCE, domainData, manufacturerCount, isStudyGrade,
} from './coverage-rules.js';

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

  // -- every record points at the right material --------------------------------
  // Referential integrity above proves an identifier exists. It does not prove it is the right one:
  // a measurement filed under one material against another material's grade, or a headline citing a
  // measurement of a different material, passes every existence check and shows wrong data.
  const gradeById = new Map(db.grades.map((g) => [g.id, g]));
  const measurementById = new Map(db.measurements.map((m) => [m.id, m]));
  const profileById = new Map(db.profiles.map((p) => [p.id, p]));
  const evidenceById = new Map(db.evidence.map((e) => [e.id, e]));
  for (const [rows, name] of [[db.measurements, 'measurements'], [db.profiles, 'profiles'], [db.prices, 'prices'], [db.evidence, 'evidence']]) {
    for (const r of rows) {
      const g = gradeById.get(r.gradeId);
      if (g && g.materialId !== r.materialId) issues.push(err(`${name} ${r.id}`, `Filed under ${r.materialId} but its grade ${r.gradeId} belongs to ${g.materialId}`));
    }
  }

  const guidanceText = (t) => String(t ?? '').replace(/\s+/g, '').replace(/[–—]/g, '-').toLowerCase();
  const isMissingText = (t) => /^(not published|not applicable)$/i.test(String(t ?? '').trim());
  let citationsChecked = 0;
  for (const mat of db.materials) {
    const where = `materials ${mat.id} (${mat.name})`;
    const grades = db.grades.filter((g) => g.materialId === mat.id);

    // Grades. Study grades (an R suffix) are not procurement grades and are not listed.
    for (const g of grades) {
      if (!isStudyGrade(g.id) && !mat.gradeIds.includes(g.id)) issues.push(err(where, `Grade ${g.id} belongs to this material but GradeIDs does not list it`));
    }
    for (const id of mat.gradeIds) {
      if (gradeById.get(id) && gradeById.get(id).materialId !== mat.id) issues.push(err(where, `GradeIDs lists ${id}, a grade of ${gradeById.get(id).materialId}`));
    }
    const rep = mat.representativeGrade;
    const hasRep = rep && !isMissingText(rep) && !/^insufficient/i.test(rep);
    if (hasRep && !grades.some((g) => g.id === rep)) issues.push(err(where, `Representative grade ${rep} is not one of its grades`));

    // Headlines. Method, Comparison / Headlines: labelled single-grade observations, which in this
    // workbook means the representative grade. A headline from another grade would put two
    // formulations' numbers side by side in one row as if they were one product.
    for (const [key, h] of Object.entries(mat.headline)) {
      if (!h?.known || !h.measurementId) continue;
      const m = measurementById.get(h.measurementId);
      if (m.materialId !== mat.id) issues.push(err(where, `Headline ${key} cites ${m.id}, a measurement of ${m.materialId}`));
      else if (hasRep && m.gradeId !== rep) issues.push(err(where, `Headline ${key} cites ${m.id} on grade ${m.gradeId}, not the representative grade ${rep}`));
      citationsChecked++;
    }
    for (const id of [...mat.headlineEvidence.mechanical, ...mat.headlineEvidence.thermal]) {
      const m = measurementById.get(id);
      if (!m) issues.push(err(where, `Headline evidence cites ${id}, which does not exist`));
      else if (m.materialId !== mat.id) issues.push(err(where, `Headline evidence cites ${id}, a measurement of ${m.materialId}`));
    }

    // Printing. The guidance cells quote the first profile the row cites.
    const cited = mat.printingEvidence.map((id) => profileById.get(id)).filter(Boolean);
    for (const id of mat.printingEvidence) {
      const p = profileById.get(id), e = evidenceById.get(id);
      if (!p && !e) issues.push(err(where, `Printing evidence cites ${id}, which does not exist`));
      else if ((p ?? e).materialId !== mat.id) issues.push(err(where, `Printing evidence cites ${id} of ${(p ?? e).materialId}`));
    }
    if (cited.length) {
      for (const axis of ['nozzle', 'bed', 'chamber']) {
        const g = mat.guidance[axis], t = cited[0][axis].text;
        if (guidanceText(g) !== guidanceText(t) && !(isMissingText(g) && isMissingText(t))) {
          issues.push(err(where, `${axis} guidance "${g}" is not what its printing evidence ${cited[0].id} says ("${t}")`));
        }
      }
    }

    // Use and durability. Use, durability and safety may cite family context from another material;
    // the environmental column may cite only this material's own exposure, solubility and moisture
    // records, because it is the one a reader takes as evidence about this grade.
    for (const [kind, list] of Object.entries(mat.evidenceIds)) {
      for (const id of list) if (!evidenceById.get(id)) issues.push(err(where, `${kind} evidence cites ${id}, which does not exist`));
    }
    const ownEnvironment = db.evidence.filter((e) => e.materialId === mat.id && ENVIRONMENT_CATEGORIES.has(e.category)).map((e) => e.id).sort().join('; ');
    if ([...mat.evidenceIds.environmental].sort().join('; ') !== ownEnvironment) {
      issues.push(err(where, `Environmental evidence cites "${mat.evidenceIds.environmental.join('; ') || 'nothing'}"; its own exposure records are "${ownEnvironment || 'none'}"`));
    }

    // Coverage. Terminal, but it has to be true: no Gap beside data, no claimed evidence without it.
    const data = domainData(db, mat);
    for (const c of db.coverage.filter((x) => x.materialId === mat.id)) {
      if (data[c.domain] !== undefined) {
        const has = data[c.domain].length > 0;
        if (has && CLAIMS_ABSENCE.has(c.status)) issues.push(err(`coverage ${c.id}`, `${mat.name} ${c.domain} says "${c.status}" beside ${data[c.domain].length} record(s) of its own, e.g. ${data[c.domain][0]}`));
        if (!has && CLAIMS_EVIDENCE.has(c.status)) issues.push(err(`coverage ${c.id}`, `${mat.name} ${c.domain} says "${c.status}" but it has no record of its own in that domain`));
      }
      const n = c.domain === 'Grades' && c.finding?.match(/^(\d+) distinct manufacturer\(s\)/);
      if (n && Number(n[1]) !== manufacturerCount(db, mat)) issues.push(err(`coverage ${c.id}`, `${mat.name} Grades quotes ${n[1]} manufacturers; its procurement grades name ${manufacturerCount(db, mat)}`));
    }
  }
  db.meta.consistency = { materials: db.materials.length, headlineCitations: citationsChecked };

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

  L.push('## Consistency');
  L.push('');
  L.push(`Every one of the ${db.materials.length} materials was checked, and any failure below stops the build:`);
  L.push('');
  L.push('- each measurement, profile, price and use record sits under the material its grade belongs to;');
  L.push('- GradeIDs lists every procurement grade, and the representative grade is one of them;');
  L.push(`- every headline cites a measurement of its own material and of the representative grade (${db.meta.consistency?.headlineCitations ?? 0} checked);`);
  L.push('- every cited measurement, profile and use record exists and belongs to that material, except use, durability and safety notes, which may cite family context;');
  L.push('- nozzle, bed and chamber guidance quote the profile the row cites;');
  L.push('- Environmental evidence cites exactly the material\'s own exposure, solubility and moisture records;');
  L.push('- no coverage row says Gap beside the material\'s own data or claims evidence it does not have, for mechanical, thermal, print setup, environmental and price, and a Grades row quotes the true manufacturer count.');
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
