// Checks on the estimate stage's output, and its section of the validation report. Inference, not evidence, so
// everything that keeps an estimate honest is checked: that no headline is left with nothing, that ranges nest and
// cite real evidence, that the model still delivers the coverage it states when measured headlines are hidden
// (DECISIONS D43), and that every material, grade and property the model's configuration names exists (D51).

import { issue } from '../rules.js';
import { ESTIMATE_MODEL, estimateKeys, identityOf } from './model.js';

const err = (code, where, message, extra) => issue(code, where, message, extra);
const warn = err; // the catalogue (rules.js) decides each code's level

/** Names the estimate model's configuration uses for materials, grades and properties, checked against the data. */
export function modelReferenceIssues({ registry, materials, grades, model = ESTIMATE_MODEL }) {
  const issues = [];
  const properties = new Set(registry.properties.map((p) => p.name));
  const names = new Set(materials.map((m) => m.name));
  for (const [tag, list] of Object.entries(model.variants ?? {})) {
    if (tag.startsWith('_')) continue;
    for (const n of list) if (!names.has(n)) issues.push(issue('EST-MODEL-REFERENCE', 'build/mappings/estimate-model.json', `variants.${tag} names "${n}", which is not a material`));
  }
  for (const [key, rel] of Object.entries(model.impliedBounds ?? {})) {
    if (key.startsWith('_')) continue;
    for (const { property } of rel.lowerFrom ?? []) if (!properties.has(property)) issues.push(issue('EST-MODEL-REFERENCE', 'build/mappings/estimate-model.json', `impliedBounds.${key} names property "${property}", which is not in properties.csv`));
  }
  const gradeIds = new Set(grades.map((g) => g.id));
  for (const id of Object.keys(model.hardness ?? {})) {
    if (!id.startsWith('_') && !gradeIds.has(id)) issues.push(issue('EST-MODEL-REFERENCE', 'build/mappings/estimate-model.json', `hardness names grade "${id}", which does not exist`));
  }
  return issues;
}

export function validateEstimates(db) {
  const issues = modelReferenceIssues({ registry: db.registry, materials: db.materials, grades: db.grades });
  const gradeById = new Map(db.grades.map((g) => [g.id, g]));
  const measurementById = new Map(db.measurements.map((m) => [m.id, m]));

  // -- estimates ---------------------------------------------------------------
  // Inference, not evidence, so everything that keeps an estimate honest is checked here: that no
  // headline is left with nothing, that ranges nest and cite real evidence, and that the model still
  // delivers the coverage it states when measured headlines are hidden (DECISIONS D43).
  const LEVELS = ESTIMATE_MODEL.levels;
  const tally = { 'this-grade': 0, 'this-material': 0, family: 0, notApplicable: 0, screen: 0, poor: 0 };
  for (const mat of db.materials) {
    for (const key of estimateKeys(db.registry)) {
      const h = mat.headline[key];
      if (!h) continue;
      const where = `materials ${mat.id} ${key}`;
      if (!mat.excluded && !mat.familyEntry && !h.known && !h.estimate && !h.notApplicable) {
        const identity = identityOf(mat);
        issues.push(err('HEADLINE-BLANK', where, ESTIMATE_MODEL.identities[identity]
          ? `${mat.name} has no value, no estimate and no not-applicable statement`
          : `${mat.name} has no value, and cannot be estimated: its identity "${identity}" (${mat.family === 'Polymer Blends' ? 'a blend is identified by its name' : 'base polymer'}) has no entry in build/mappings/estimate-model.json identities. Add one (group and morphology), or record a value`));
      }
      if (h.notApplicable) {
        tally.notApplicable++;
        if (h.known || h.estimate) issues.push(err('NA-INVALID', where, 'Not applicable beside a value or an estimate'));
        if (!h.notApplicable.reason) issues.push(err('NA-INVALID', where, 'Not applicable without a reason'));
      }
      const e = h.estimate;
      if (!e) continue;
      tally[e.strength] = (tally[e.strength] ?? 0) + 1;
      if (e.canScreen) tally.screen++;
      if (e.precision === 'poor') tally.poor++;
      if (h.known) issues.push(err('EST-INVALID', where, 'A measured headline also carries an estimate'));
      if (mat.excluded || mat.familyEntry) issues.push(err('EST-INVALID', where, 'An out-of-scope material or a family entry carries an estimate'));
      if (e.kind !== 'model') issues.push(err('EST-INVALID', where, `Unknown estimate kind "${e.kind}"`));
      if (!['this-grade', 'this-material', 'family'].includes(e.strength)) issues.push(err('EST-INVALID', where, `Unknown evidence strength "${e.strength}"`));
      if (!['good', 'fair', 'poor'].includes(e.precision)) issues.push(err('EST-INVALID', where, `Unknown precision "${e.precision}"`));
      if (!e.basis || !e.method) issues.push(err('EST-INVALID', where, 'Does not say what it was built from'));
      if (!(e.lo <= e.centre && e.centre <= e.hi)) issues.push(err('EST-INVALID', where, `Centre ${e.centre} lies outside the likely range ${e.lo}-${e.hi}`));
      if (!(e.plausible.lo <= e.lo && e.hi <= e.plausible.hi)) issues.push(err('EST-INVALID', where, `The likely range ${e.lo}-${e.hi} is not inside the plausible range ${e.plausible.lo}-${e.plausible.hi}`));
      if (e.strength === 'family' && e.evidence.length) issues.push(err('EST-INVALID', where, 'A family-only estimate lists evidence of its own'));
      if (e.strength !== 'family' && !e.evidence.length) issues.push(err('EST-INVALID', where, 'Claims evidence of its own but lists none'));
      const repF = gradeById.get(mat.representativeGrade)?.formulationKey ?? mat.representativeGrade;
      for (const ev of e.evidence) {
        for (const item of ev.items) {
          if (!item.measurementId) continue;
          const x = measurementById.get(item.measurementId);
          const f = x && (gradeById.get(x.gradeId)?.formulationKey ?? x.gradeId);
          if (!x) issues.push(err('EST-INVALID', where, `Cites ${item.measurementId}, which does not exist`));
          else if (x.materialId !== mat.id && f !== repF) issues.push(err('EST-INVALID', where, `Cites ${item.measurementId}, which is neither this material's nor its representative product's`));
        }
      }
    }
  }
  const model = db.meta.estimateModel ?? { properties: {}, rejected: [], conflicts: [], outliers: [] };
  for (const [key, p] of Object.entries(model.properties)) {
    const c = p.calibration;
    if (c.held < 20) { issues.push(warn('EST-CALIBRATION-FEW', `estimate model ${key}`, `Only ${c.held} measured headlines to calibrate against; the ranges use a default scale`)); continue; }
    const tolerance = 0.1;
    if (Math.abs(c.likelyCoverage - LEVELS.likely) > tolerance) issues.push(err('EST-CALIBRATION', `estimate model ${key}`, `The likely range contains ${Math.round(c.likelyCoverage * 100)}% of hidden headlines, not ${Math.round(LEVELS.likely * 100)}%`));
    if (c.plausibleCoverage < LEVELS.plausible - 0.05) issues.push(err('EST-CALIBRATION', `estimate model ${key}`, `The plausible range contains ${Math.round(c.plausibleCoverage * 100)}% of hidden headlines, not ${Math.round(LEVELS.plausible * 100)}%`));
  }
  db.meta.estimateTally = tally;
  issues.push(warn('EST-SUMMARY', 'materials', `Missing headlines: ${tally['this-grade']} estimated from the grade's own related measurements, ${tally['this-material']} from the material's other grades, ${tally.family} from the family model alone (${tally.poor} of all estimates imprecise), ${tally.notApplicable} not applicable. ${tally.screen} estimates may screen a material out in Explore; none can pass one.`));
  if (model.rejected.length) {
    issues.push(warn('EST-REJECTED', 'measurements', `${model.rejected.length} values are physically impossible for their property and were kept out of the estimate model: ${model.rejected.map((r) => `${r.measurementId} ${r.material} ${r.property} ${r.value} ${r.unit}`).join('; ')}`, { records: model.rejected.map((r) => r.measurementId) }));
  }
  if (model.outliers.length) {
    issues.push(warn('EST-OUTLIER', 'materials', `${model.outliers.length} measured headlines sit far outside what every other observation predicts; check the source and the grade: ${model.outliers.map((o) => `${o.material} ${o.key} ${o.measured} (expected about ${o.expected})`).join('; ')}`, { records: model.outliers.map((o) => `${o.materialId} ${o.key}`) }));
  }

  // -- estimates a reader should not lean on, and family order ---------------------------------------------
  // Each is listed by record so an accepted case can be baselined and a new one noticed.
  const wide = [];
  for (const mat of db.materials) for (const key of estimateKeys(db.registry)) {
    const e = mat.headline[key]?.estimate;
    if (e?.precision === 'poor') wide.push({ record: `${mat.id} ${key}`, text: `${mat.name} ${key} ${e.lo}-${e.hi} ${e.unit} (plausible ${e.plausible.lo}-${e.plausible.hi}, ${e.strength})` });
  }
  if (wide.length) issues.push(warn('EST-WIDE', 'materials', `${wide.length} estimates are too imprecise to guide a choice: ${wide.map((w) => w.text).join('; ')}`, { records: wide.map((w) => w.record) }));

  const valueOf = (m, key) => (m.headline[key]?.known ? m.headline[key].value : m.headline[key]?.estimate?.centre ?? null);
  const morphologyOf = (m) => ESTIMATE_MODEL.identities[identityOf(m)]?.morphology;
  const order = [];
  const inScope = db.materials.filter((m) => !m.excluded && !m.familyEntry);
  for (const r of inScope.filter((m) => /fibre/i.test(m.modifier))) {
    for (const u of inScope.filter((m) => m.basePolymer === r.basePolymer && m.modifier === 'Unfilled / unspecified' && m.id !== r.id)) {
      for (const key of ['tensileModulusXY', 'hdt045']) {
        if (key === 'hdt045' && morphologyOf(r) !== 'semicrystalline') continue;
        const vr = valueOf(r, key), vu = u.headline[key]?.known ? u.headline[key].value : null;
        if (vr != null && vu != null && vr < vu) order.push({ record: `${r.id} ${key}`, text: `${r.name} ${key} ${vr}${r.headline[key].known ? '' : ' (estimate)'} < ${u.name} ${vu}` });
      }
    }
  }
  if (order.length) issues.push(warn('EST-FAMILY-ORDER', 'materials', `${order.length} reinforced materials sit below their unfilled sibling: ${order.map((o) => o.text).join('; ')}`, { records: order.map((o) => o.record) }));

  return issues;
}

/** The Estimates section of the validation report. */
export function estimateReportLines(db) {
  const L = [];
  L.push('## Estimates');
  L.push('');
  L.push('A missing headline carries an estimate from one Gaussian model per property that takes every observation');
  L.push('in the snapshot, each converted to the headline\'s semantics (build/mappings/estimate-model.json, DECISIONS');
  L.push(`D43). The likely range is ${Math.round(ESTIMATE_MODEL.levels.likely * 100)}% and the plausible range ${Math.round(ESTIMATE_MODEL.levels.plausible * 100)}%. Both are calibrated by hiding each measured`);
  L.push('headline and predicting it from everything else; the build fails if that coverage drifts. An estimate never');
  L.push('passes a material; in Explore it may screen one out only when its plausible range wholly fails.');
  L.push('');
  L.push('| Headline | Observations | Hidden headlines | Likely range holds | Plausible range holds | Median likely width | Spread between products |');
  L.push('|---|---:|---:|---:|---:|---:|---:|');
  const mdl = db.meta.estimateModel ?? { properties: {} };
  for (const [k, v] of Object.entries(mdl.properties)) {
    const c = v.calibration;
    const width = ESTIMATE_MODEL.properties[k].scale === 'log' ? `×${c.medianLikelyWidth}` : `${c.medianLikelyWidth} °C`;
    const between = v.betweenProduct.estimated ? `${v.betweenProduct.used} (estimated)` : `${v.betweenProduct.used} (${v.betweenProduct.pairs} pairs)`;
    L.push(`| ${k} | ${v.observations} | ${c.held} | ${Math.round((c.likelyCoverage ?? 0) * 100)}% | ${Math.round((c.plausibleCoverage ?? 0) * 100)}% | ${width} | ${between} |`);
  }
  L.push('');
  L.push('| Headline | Missing | From its own grade | From its other grades | Family model only | Not applicable | None | May screen |');
  L.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const [k, v] of Object.entries(db.meta.estimateCoverage ?? {})) {
    L.push(`| ${k} | ${v.missing} | ${v['this-grade']} | ${v['this-material']} | ${v.family} | ${v.notApplicable} | ${v.none} | ${v.canScreen} |`);
  }
  L.push('');
  if (mdl.conflicts?.length) {
    L.push('Evidence that contradicts everything else and was down-weighted:');
    L.push('');
    for (const c of mdl.conflicts) L.push(`- ${c.material}, ${c.key}: ${c.kind} ${c.values.join(', ')} (${c.measurementIds.join(', ') || 'hardness'})`);
    L.push('');
  }
  if (mdl.outliers?.length) {
    L.push('Measured headlines far outside their prediction (worth a second look at the source and the grade):');
    L.push('');
    for (const o of mdl.outliers) L.push(`- ${o.material}, ${o.key}: ${o.measured} ${o.unit}, expected about ${o.expected}`);
    L.push('');
  }
  return L;
}
