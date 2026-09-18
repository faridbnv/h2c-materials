// Checks on the estimate stage's output, and its section of the validation report. Inference, not evidence, so
// everything that keeps an estimate honest is checked: that no headline is left with nothing, that ranges nest and
// cite real evidence, that the model still delivers the coverage it states when measured headlines are hidden
// (DECISIONS D43). The model's configuration names no material, grade or polymer: those are tables (m28, m29; DECISIONS D60).

import { issue } from '../rules.js';
import { ESTIMATE_MODEL, estimateKeys, identityOf } from './model.js';

const err = (code, where, message, extra) => issue(code, where, message, extra);
const warn = err; // the catalogue (rules.js) decides each code's level

export function validateEstimates(db) {
  const issues = [];
  const polymers = new Map((db.polymers ?? []).map((p) => [p.id, p]));
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
        issues.push(err('HEADLINE-BLANK', where, identity && polymers.has(identity)
          ? `${mat.name} has no value, no estimate and no not-applicable statement`
          : `${mat.name} has no value, and cannot be estimated: it has no Estimate identity in materials.csv, or its identity has no row in data/tables/polymers.csv. Name one (a polymers.csv row with its group and morphology), or record a value`));
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
    const cal = ESTIMATE_MODEL.calibration;
    if (c.held < cal.minHeld) { issues.push(warn('EST-CALIBRATION-FEW', `estimate model ${key}`, `Only ${c.held} measured headlines to calibrate against; the ranges use a default scale`)); continue; }
    if (Math.abs(c.likelyCoverage - LEVELS.likely) > cal.likelyTolerance) issues.push(err('EST-CALIBRATION', `estimate model ${key}`, `The likely range contains ${Math.round(c.likelyCoverage * 100)}% of hidden headlines, not ${Math.round(LEVELS.likely * 100)}%`));
    if (c.plausibleCoverage < LEVELS.plausible - cal.plausibleShortfall) issues.push(err('EST-CALIBRATION', `estimate model ${key}`, `The plausible range contains ${Math.round(c.plausibleCoverage * 100)}% of hidden headlines, not ${Math.round(LEVELS.plausible * 100)}%`));
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
  // An imprecise estimate is two different things, and only one of them is a defect. Where the material publishes a
  // value the headline could have used, the model is ignoring evidence it has, and a reviewer must say why
  // (EST-WIDE). Where it publishes nothing, the range is wide because the evidence is thin, which is the honest
  // answer and not something a reviewer can fix by reviewing it (EST-THIN). Before m47 both were EST-WIDE, so all
  // thirteen records had to be accepted by hand, and a real defect would have arrived among them unnoticed.
  const headlineDefs = new Map(db.registry.headlines.map((h) => [h.key, h]));
  const byMaterial = new Map();
  for (const m of db.measurements) {
    if (!byMaterial.has(m.materialId)) byMaterial.set(m.materialId, []);
    byMaterial.get(m.materialId).push(m);
  }
  /** A published value of this material that the headline could have shown: its own representative grade, the
   * headline's property, direction, a printed or unstated specimen, unconditioned, and a usable number. */
  const publishesUsableValue = (mat, key) => {
    const def = headlineDefs.get(key);
    if (!def) return false;
    return (byMaterial.get(mat.id) ?? []).some((x) => x.gradeId === mat.representativeGrade
      && def.valueProperties.includes(x.property) && x.numeric && !x.quarantined && !x.implausible
      && ['printed', 'not-stated'].includes(x.specimenForm) && x.moistureState !== 'conditioned'
      && (def.direction === 'Not applicable' ? x.direction === 'not-applicable' : x.direction === def.direction));
  };
  const wide = [];
  const thin = [];
  for (const mat of db.materials) for (const key of estimateKeys(db.registry)) {
    const e = mat.headline[key]?.estimate;
    if (e?.precision !== 'poor') continue;
    const entry = { record: `${mat.id} ${key}`, text: `${mat.name} ${key} ${e.lo}-${e.hi} ${e.unit} (plausible ${e.plausible.lo}-${e.plausible.hi}, ${e.strength})` };
    (publishesUsableValue(mat, key) ? wide : thin).push(entry);
  }
  if (wide.length) issues.push(warn('EST-WIDE', 'materials', `${wide.length} estimates are imprecise although the material publishes a usable value for the headline: ${wide.map((w) => w.text).join('; ')}`, { records: wide.map((w) => w.record) }));
  if (thin.length) issues.push(warn('EST-THIN', 'materials', `${thin.length} estimates are too imprecise to guide a choice, on materials that publish nothing for the headline: ${thin.map((w) => w.text).join('; ')}`, { records: thin.map((w) => w.record) }));

  const valueOf = (m, key) => (m.headline[key]?.known ? m.headline[key].value : m.headline[key]?.estimate?.centre ?? null);
  const morphologyOf = (m) => polymers.get(identityOf(m))?.morphology;
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
  const screeningLines = () => {
    const S = ESTIMATE_MODEL.screening;
    L.push(`Which estimates may screen, end by end (DECISIONS D59). Each end of an evidence class's screening range is set where a new true value lies beyond it at most ${Math.round(S.maxWrongRate * 100)}% of the time with ${Math.round(S.confidence * 100)}% confidence, from where the honestly predicted true values of the class fell; never inside the plausible range. A class with too few cases cannot set an end and screens only where the family model agrees.`);
    L.push('');
    L.push('| Headline | Class | Held | Top: beyond plausible | Top taken at | Bottom: beyond plausible | Bottom taken at |');
    L.push('|---|---|---:|---:|---:|---:|---:|');
    const at = (s) => (s.certified ? `${Math.round(s.quantile * 10000) / 100}% point` : 'cannot screen');
    for (const [k, p] of Object.entries(db.meta.estimateModel?.properties ?? {})) {
      for (const [cls, c] of Object.entries(p.screening ?? {})) L.push(`| ${k} | ${cls} | ${c.held} | ${c.above.beyondPlausible} | ${at(c.above)} | ${c.below.beyondPlausible} | ${at(c.below)} |`);
    }
    L.push('');
    for (const [matrix, s] of Object.entries(db.meta.estimateModel?.bracketScreening ?? {})) L.push(`- Unstated-load bracket, ${matrix}: ${s.certified ? `top at the published value + ${s.topGap} °C` : 'its top cannot screen'} (${s.why}).`);
    L.push('');
  };
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
  screeningLines();
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
