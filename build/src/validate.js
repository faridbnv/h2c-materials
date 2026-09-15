// Validation. The build fails on any error. Warnings describe what the tool cannot yet see, which
// is why the report is a deliverable in its own right rather than console noise.

import { DIRECTION } from './normalize/direction.js';
import { PROCESS_STATE } from './normalize/process.js';
import { measurementIssues } from './measurement-rules.js';
import { measurementHeadlines, applies } from './registry.js';
import { RETIRED_AVAILABILITY } from './compile.js';
import {
  ENVIRONMENT_CATEGORIES, CLAIMS_EVIDENCE, CLAIMS_ABSENCE, domainData, manufacturerCount, isStudyGrade,
} from './coverage-rules.js';

import { issue } from './rules.js';
import { codeReferenceIssues } from './property-references.js';

const err = (code, where, message, extra) => issue(code, where, message, extra);
const warn = err; // the catalogue (rules.js) decides each code's level

export function validate(db, wb) {
  const issues = measurementIssues(db, wb);
  issues.push(...codeReferenceIssues(db.registry));

  // -- identifiers are unique -------------------------------------------------
  for (const [name, rows] of [
    ['materials', db.materials], ['grades', db.grades], ['measurements', db.measurements],
    ['profiles', db.profiles], ['evidence', db.evidence], ['prices', db.prices],
    ['sources', db.sources], ['coverage', db.coverage],
  ]) {
    const seen = new Set();
    for (const r of rows) {
      if (!r.id) { issues.push(err('ID-MISSING', name, 'Record with no identifier')); continue; }
      if (seen.has(r.id)) issues.push(err('ID-DUPLICATE', `${name} ${r.id}`, 'Duplicate identifier'));
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
      if (!universe.has(v)) issues.push(err('REF-UNKNOWN', `${name} ${r.id}`, `${field} "${v}" is not a known ${universeName}`));
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
    for (const g of m.gradeIds) if (!G.has(g)) issues.push(err('GRADES-LIST', `materials ${m.id}`, `GradeIDs lists unknown grade "${g}"`));
  }

  // -- retirement is finished, not half-done -----------------------------------
  // Status retires a grade. An active grade whose Availability still speaks of retirement, or a
  // retired grade that does not say so, is a retirement someone started and did not finish.
  for (const g of db.grades) {
    if (!g.retired && /retire/i.test(g.availability ?? '')) {
      issues.push(err('GRADE-RETIREMENT-HALF', `grades ${g.id}`, `Availability "${g.availability}" describes a retirement but Status is active`));
    }
    if (g.retired && g.availability !== RETIRED_AVAILABILITY) {
      issues.push(err('GRADE-RETIREMENT-HALF', `grades ${g.id}`, `Status is retired but Availability does not read "${RETIRED_AVAILABILITY}"`));
    }
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
      if (g && g.materialId !== r.materialId) issues.push(err('OWN-GRADE-MATERIAL', `${name} ${r.id}`, `Filed under ${r.materialId} but its grade ${r.gradeId} belongs to ${g.materialId}`));
      if (g?.retired && name !== 'profiles' && !r.quarantined) issues.push(err('OWN-RETIRED-GRADE', `${name} ${r.id}`, `Active record uses retired grade ${r.gradeId}`));
      if (g?.retired && name === 'profiles' && !r.retired) issues.push(err('OWN-RETIRED-GRADE', `${name} ${r.id}`, `Active profile uses retired grade ${r.gradeId}`));
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
      if (!g.retired && !isStudyGrade(g.id) && !mat.gradeIds.includes(g.id)) issues.push(err('GRADES-LIST', where, `Grade ${g.id} belongs to this material but GradeIDs does not list it`));
    }
    for (const id of mat.gradeIds) {
      if (gradeById.get(id)?.retired) issues.push(err('GRADES-LIST', where, `GradeIDs lists retired mapping ${id}`));
      if (gradeById.get(id) && gradeById.get(id).materialId !== mat.id) issues.push(err('GRADES-LIST', where, `GradeIDs lists ${id}, a grade of ${gradeById.get(id).materialId}`));
    }
    const rep = mat.representativeGrade;
    const hasRep = rep && !isMissingText(rep) && !/^insufficient/i.test(rep);
    if (hasRep && !grades.some((g) => g.id === rep)) issues.push(err('REP-GRADE-NOT-OWN', where, `Representative grade ${rep} is not one of its grades`));

    // Headlines. Method, Comparison / Headlines: labelled single-grade observations, which in this
    // database means the representative grade. A headline from another grade would put two
    // formulations' numbers side by side in one row as if they were one product.
    for (const [key, h] of Object.entries(mat.headline)) {
      if (!h?.known || !h.measurementId) continue;
      const m = measurementById.get(h.measurementId);
      if (!m) { issues.push(err('HEADLINE-CITATION', where, `Headline ${key} cites missing measurement ${h.measurementId}`)); continue; }
      if (gradeById.get(m.gradeId)?.retired) issues.push(err('HEADLINE-CITATION', where, `Headline ${key} cites retired grade ${m.gradeId}`));
      if (m.materialId !== mat.id) issues.push(err('HEADLINE-CITATION', where, `Headline ${key} cites ${m.id}, a measurement of ${m.materialId}`));
      else if (hasRep && m.gradeId !== rep) issues.push(err('HEADLINE-CITATION', where, `Headline ${key} cites ${m.id} on grade ${m.gradeId}, not the representative grade ${rep}`));
      citationsChecked++;
    }
    for (const id of [...mat.headlineEvidence.mechanical, ...mat.headlineEvidence.thermal]) {
      const m = measurementById.get(id);
      if (!m) issues.push(err('LINK-CITATION', where, `Headline evidence cites ${id}, which does not exist`));
      else if (m.materialId !== mat.id) issues.push(err('LINK-CITATION', where, `Headline evidence cites ${id}, a measurement of ${m.materialId}`));
    }

    // H2C status is cited to sources.
    for (const id of mat.identity.h2cEvidence) if (!S.has(id)) issues.push(err('LINK-CITATION', where, `H2C status link cites ${id}, which is not a source`));

    // Printing. The guidance quotes the first profile the material cites.
    const cited = mat.printingEvidence.map((id) => profileById.get(id)).filter(Boolean);
    for (const id of mat.printingEvidence) {
      const p = profileById.get(id), e = evidenceById.get(id);
      if (!p && !e) issues.push(err('LINK-CITATION', where, `Printing evidence cites ${id}, which does not exist`));
      else if ((p ?? e).materialId !== mat.id) issues.push(err('LINK-CITATION', where, `Printing evidence cites ${id} of ${(p ?? e).materialId}`));
    }
    if (cited.length) {
      for (const axis of ['nozzle', 'bed', 'chamber']) {
        const g = mat.guidance[axis], t = cited[0][axis].text;
        if (guidanceText(g) !== guidanceText(t) && !(isMissingText(g) && isMissingText(t))) {
          issues.push(err('GUIDANCE-MISMATCH', where, `${axis} guidance "${g}" is not what its printing evidence ${cited[0].id} says ("${t}")`));
        }
      }
    }

    // Use and durability. Use, durability and safety may cite family context from another material;
    // the environmental column may cite only this material's own exposure, solubility and moisture
    // records, because it is the one a reader takes as evidence about this grade.
    for (const [kind, list] of Object.entries(mat.evidenceIds)) {
      for (const id of list) if (!evidenceById.get(id)) issues.push(err('LINK-CITATION', where, `${kind} evidence cites ${id}, which does not exist`));
    }
    const ownEnvironment = db.evidence.filter((e) => e.materialId === mat.id && ENVIRONMENT_CATEGORIES.has(e.category)).map((e) => e.id).sort().join('; ');
    if ([...mat.evidenceIds.environmental].sort().join('; ') !== ownEnvironment) {
      issues.push(err('ENVIRONMENT-NOT-OWN', where, `Environmental evidence cites "${mat.evidenceIds.environmental.join('; ') || 'nothing'}"; its own exposure records are "${ownEnvironment || 'none'}"`));
    }

    // Coverage. Terminal, but it has to be true: no Gap beside data, no claimed evidence without it.
    const data = domainData(db, mat);
    for (const c of db.coverage.filter((x) => x.materialId === mat.id && x.status !== 'Superseded')) {
      if (data[c.domain] !== undefined) {
        const has = data[c.domain].length > 0;
        if (has && CLAIMS_ABSENCE.has(c.status)) issues.push(err('COVERAGE-UNTRUE', `coverage ${c.id}`, `${mat.name} ${c.domain} says "${c.status}" beside ${data[c.domain].length} record(s) of its own, e.g. ${data[c.domain][0]}`));
        if (!has && CLAIMS_EVIDENCE.has(c.status)) issues.push(err('COVERAGE-UNTRUE', `coverage ${c.id}`, `${mat.name} ${c.domain} says "${c.status}" but it has no record of its own in that domain`));
      }
      const n = c.domain === 'Grades' && c.finding?.match(/^(\d+) distinct manufacturer\(s\)/);
      if (n && Number(n[1]) !== manufacturerCount(db, mat)) issues.push(err('COVERAGE-UNTRUE', `coverage ${c.id}`, `${mat.name} Grades quotes ${n[1]} manufacturers; its procurement grades name ${manufacturerCount(db, mat)}`));
    }
  }
  db.meta.consistency = { materials: db.materials.length, headlineCitations: citationsChecked };

  // -- quarantined rows never enter numeric summaries -------------------------
  // Method sheet, Normalization / Uncertainty: values with unresolved units are quarantined and
  // excluded from numeric summaries.
  for (const m of db.measurements) {
    if (m.quarantined && (m.value !== null || m.numeric)) {
      issues.push(err('QUARANTINE-NUMERIC', `measurements ${m.id}`, 'Quarantined measurement carries a numeric value'));
    }
  }
  const quarantinedIds = new Set(db.measurements.filter((m) => m.quarantined).map((m) => m.id));
  for (const mat of db.materials) {
    for (const [key, h] of Object.entries(mat.headline)) {
      if (h?.measurementId && quarantinedIds.has(h.measurementId)) {
        issues.push(err('QUARANTINE-NUMERIC', `materials ${mat.id}`, `Headline ${key} cites quarantined measurement ${h.measurementId}`));
      }
    }
  }

  // -- XY and Z never merge ---------------------------------------------------
  // Method sheet, Comparison / Directions. A headline labelled XY must cite an XY measurement,
  // and "unknown direction is not XY".
  for (const mat of db.materials) {
    for (const key of measurementHeadlines(db.registry).filter((h) => h.direction === DIRECTION.XY).map((h) => h.key)) {
      const h = mat.headline[key];
      if (h?.known && h.verified && h.direction !== DIRECTION.XY) {
        issues.push(err('HEADLINE-DIRECTION', `materials ${mat.id}`, `Headline ${key} cites a measurement whose direction is ${h.direction}`));
      }
    }
  }

  // -- impact units are never silently reconciled -----------------------------
  // Method sheet, Normalization / Units: "No conversion from J/m without specimen geometry."
  const impact = db.measurements.filter((m) => /Charpy|Izod|Impact/i.test(m.property) && m.numeric);
  const impactUnits = new Set(impact.map((m) => m.unit));
  if (impactUnits.has('J/m') && impactUnits.has('kJ/m²')) {
    const n = impact.filter((m) => m.unit === 'J/m').length;
    issues.push(warn('IMPACT-UNITS', 'measurements', `Impact data uses two incompatible units. ${n} rows are J/m (energy per width) and cannot be compared with the kJ/m² rows without specimen geometry. They must not share a chart axis.`, { records: impact.filter((m) => m.unit === 'J/m').map((m) => m.id) }));
  }

  // -- excluded materials stay out of the default candidate set ---------------
  const excluded = db.materials.filter((m) => m.excluded);
  // Exclusion is stated twice, as scope and as H2C status; the two must agree, whatever the count.
  for (const m of db.materials) {
    if (m.excluded !== (m.h2cStatus === 'Excluded')) issues.push(err('EXCLUSION', `materials ${m.id}`, `Scope "${m.scope}" and H2C status "${m.h2cStatus}" disagree about exclusion`));
  }
  for (const m of excluded) {
    if (m.gates.scope !== 'excluded') issues.push(err('EXCLUSION', `materials ${m.id}`, 'Excluded material does not carry the excluded scope gate'));
  }

  // -- HDT load labelling -----------------------------------------------------
  const hdt = db.materials.filter((m) => m.headline.hdt045?.known && m.headline.hdt045.verified);
  const unstated = hdt.filter((m) => !m.headline.hdt045.loadStated);
  const wrongLoad = hdt.filter((m) => m.headline.hdt045.loadStated && m.headline.hdt045.loadMPa !== 0.45);
  for (const m of wrongLoad) {
    issues.push(err('HDT-LOAD-WRONG', `materials ${m.id}`, `Column is HDT at 0.45 MPa but the cited source states ${m.headline.hdt045.loadMPa} MPa`));
  }
  if (unstated.length) {
    issues.push(warn('HDT-LOAD-UNSTATED', 'materials', `${unstated.length} of ${hdt.length} HDT headlines cite a source that names the standard but not the load. They carry loadStated:false and must not be presented as confirmed 0.45 MPa values.`, { records: unstated.map((m) => `${m.id} hdt045`) }));
  }

  // -- unparsed free text -----------------------------------------------------
  const unparsedProcess = [];
  for (const p of db.profiles) {
    for (const axis of ['nozzle', 'bed', 'chamber']) {
      if (p[axis].unparsed) unparsedProcess.push(`${p.id} ${axis}: "${p[axis].text}"`);
    }
  }
  if (unparsedProcess.length) {
    issues.push(warn('PARSE-UNREAD', 'profiles', `${unparsedProcess.length} process temperature cells were not parsed: ${unparsedProcess.slice(0, 10).join(' | ')}`, { records: unparsedProcess.map((u) => u.split(':')[0]) }));
  }
  const unmappedTopics = [...new Set(db.evidence.filter((e) => !e.category).map((e) => e.topic))];
  if (unmappedTopics.length) {
    issues.push(err('TOPIC-UNMAPPED', 'evidence', `Topics with no mapping in schema/vocab/environment-topics.csv: ${unmappedTopics.join(', ')}`));
  }

  // -- materials with nothing to select on ------------------------------------
  const noMeasurements = db.materials.filter((m) => !m.familyEntry && !db.measurements.some((x) => x.materialId === m.id));
  const families = db.materials.filter((m) => m.familyEntry);
  if (families.length) {
    issues.push(warn('FAMILY-ENTRIES', 'materials', `${families.length} canonical names are family entries with no product of their own and are not candidates: ${families.map((m) => `${m.name} (${m.familyEntry.members.map((x) => x.name).join(', ')})`).join('; ')}`, { records: families.map((m) => m.id) }));
  }
  if (noMeasurements.length) {
    issues.push(warn('NO-MEASUREMENTS', 'materials', `${noMeasurements.length} materials have no property measurements at all: ${noMeasurements.map((m) => m.name).join(', ')}`, { records: noMeasurements.map((m) => m.id) }));
  }

  return issues;
}

export function formatReport(db, reference, issues, { snapshot, build, sections = {} }) {
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
  L.push(`What a selection criterion can actually decide, out of ${db.materials.length} canonical materials.`);
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
  L.push('data/tables/chamber_bands.csv; it is shown beside the chamber question and changes no verdict.');
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

  L.push(...(sections.estimates ?? []));

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
    for (const e of errors) L.push(`- \`${e.code}\` **${e.where}** — ${e.message}`);
    L.push('');
  }

  L.push('## Warnings');
  L.push('');
  L.push('These are not defects. They record what the compiled database cannot support, so the');
  L.push('interface can say so rather than implying a certainty it does not have.');
  L.push('');
  for (const w of warnings) L.push(`- \`${w.code}\` **${w.where}** — ${w.message}`);
  L.push('');

  return L.join('\n');
}
