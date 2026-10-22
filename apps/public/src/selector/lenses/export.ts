// The exports (WP-27), ported from the old table (app/js/ui/table.js toCSV, productsCSV, download): the rows on screen as CSV in the table's order,
// their products, and the download. The text is the engine's and the facts layer's, worded where the table words it; nothing is recomputed here.
import { boundOf, publishedBound } from '@atlas/engine/port/constraints.ts';
import { indexById, indexValue } from '@atlas/engine/port/indices.ts';
import { productView, stateOf } from '@atlas/engine/port/products.ts';
import { fmtNumber } from '@atlas/pages/facts/format';
import { CHAMBER_GUIDANCE, POLICY_CONTROL, describeConstraint, policyLabel, screenedByKind } from '@atlas/pages/facts/labels';
import { exportHeadlines } from '@atlas/pages/facts/registry';
import type { Loose } from '@atlas/pages/loose';

const DRYING_WORD: Loose = { required: 'published', optional: 'optional', 'not-needed': 'not needed' };

/**
 * Client-side export: no server, and the four states survive into the file.
 *
 * The file has to explain itself to someone who never saw the screen: which question was asked,
 * under which missing-data rule, and for each row why it failed or could not be checked. The first
 * version exported only the unresolved criteria, so every genuine failure had an empty reason.
 */
export function toCSV(rows: Loose, meta: Loose, { scenario, useEstimates = false, ranking = null, productsByMaterial = null }: Loose = {}) {
  // Ranked by a goal (D102): the table's ranking, the one the chart's guide shows, with its value and the product it rests on.
  const index = ranking && scenario?.rankBy ? indexById(scenario.rankBy) : null;
  const cols = ['MaterialID', 'Material', 'Family', 'H2C status', 'State', 'In results',
    'Failed', 'Could not be checked', 'Best product', 'Judged as',
    ...(index ? ['Rank', `Goal ${index.formula}`, 'Ranked on product', 'Passing products ranked'] : []),
    ...exportHeadlines().map((h: Loose) => h.header),
    'Value qualifiers', 'Measurement IDs',
    'Nozzle C', 'Bed C', 'Chamber C', 'Hardened nozzle', 'Drying guidance', 'Where to buy',
    'Hidden: does not apply', ...(useEstimates ? ['Estimated fields', 'Hidden by an estimate', 'Hidden by resin reference data'] : []), 'Candidate group', 'Likely'];
  const q = (v: Loose) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const KEYS = exportHeadlines().map((h: Loose) => h.key);
  // An exported number is always a measurement or an observed price. An estimated bound travels in
  // its own column so a spreadsheet can never mistake inference for evidence, and a scenario
  // assumption is named rather than exported as if it were measured.
  const val = (m: Loose, k: Loose) => {
    const h = m.headline[k];
    if (h?.assumption) return '';
    return h?.known ? h.value : h?.missing ?? '';
  };
  const qualifiers = (m: Loose) => KEYS.flatMap((k: Loose) => {
    const h = m.headline[k];
    if (!h?.known) return [];
    const out: Loose[] = [];
    if (h.assumption) out.push(`${k}: scenario assumption ${h.value}`);
    out.push(...boundQualifier(k, h));
    const i = h.interval;
    if (i && i.kind !== 'point' && !boundOf(i)) {
      out.push(`${k}: ${i.lo ?? 'unbounded'} to ${i.hi ?? 'unbounded'}${h.uncertainty ? ` (± ${h.uncertainty})` : ''}`);
    }
    if (h.loadStated === false) out.push(`${k}: test load not stated`);
    return out;
  }).join(' | ');
  const ids = (m: Loose) => KEYS.map((k: Loose) => m.headline[k]?.measurementId).filter(Boolean).join(' ');
  // Only the export's own keys: a drawer-only headline (D139) is computed per product but is no column here. A material's
  // estimate is read for a requirement only where the material has no product on record; any other's is context (D148).
  const productless = (m: Loose) => !(productsByMaterial ? productsByMaterial.get(m.id) : m.gradeIds)?.length;
  const estimated = (m: Loose) => [...Object.entries(m.headline)
    .filter(([k, h]: Loose) => KEYS.includes(k) && h && !h.known && (h.estimate || h.notApplicable))
    .map(([k, h]: Loose) => (h.notApplicable ? `${k} not applicable`
      : `${k} ~${h.estimate.lo}-${h.estimate.hi} ${h.estimate.unit} likely, ${h.estimate.plausible.lo}-${h.estimate.plausible.hi} plausible (${h.estimate.strength}; precision ${h.estimate.precision}; ${productless(m) && h.estimate.canScreen ? 'can hide this material, which has no product' : 'context only'})`)),
    ...(m.print?.nozzleEstimate ? [`nozzle ~${m.print.nozzleEstimate.lo}-${m.print.nozzleEstimate.hi} C (${m.print.nozzleEstimate.basis}; decides nothing)`] : []),
    ...(m.print?.bedEstimate ? [`bed ~${m.print.bedEstimate.lo}-${m.print.bedEstimate.hi} C (${m.print.bedEstimate.basis}; decides nothing)`] : []),
    ...(m.print?.chamberEstimate ? [`chamber ~${m.print.chamberEstimate.lo}-${m.print.chamberEstimate.hi} C (research band: ${m.print.chamberEstimate.basis}; decides nothing)`] : []),
  ].join(' | ');
  const why = (list: Loose) => list.map((r: Loose) => `${describeConstraint(r.constraint)}: ${r.reason}${recordIds(r)}`).join(' | ');
  const range = (r: Loose) => (r ? r.max === null ? `at least ${fmtNumber(r.min)}` : r.min === null ? `upper bound ${fmtNumber(r.max)}` : `${r.min}-${r.max}` : '');

  const header = [
    '# H2C Material Selector export',
    `# release ${meta.release?.id ?? 'unidentified'} (database snapshot ${meta.snapshot}, application build ${meta.build})`,
  ];
  if (scenario) {
    header.push(`# ${POLICY_CONTROL.toLowerCase()}: ${policyLabel(scenario.unknownPolicy).toLowerCase()}; estimates and resin data ${useEstimates ? 'on (never pass; resin data and the estimate of a material with no product may hide one)' : 'off'}`);
    if (scenario.unknownPolicy === 'exploration') header.push('# a material a required property does not apply to is hidden, whatever the estimates switch says (D148)');
    header.push(`# products judged ${stateWords(scenario)} (D99)`);
    if (scenario.template) header.push(`# template: ${scenario.template}`);
    if (index) header.push(`# ranked by ${index.designCase} (${index.formula}), each material by the median over its passing products, the table's and the chart's one ranking (D102, D107)`);
    if (!scenario.constraints.length) header.push('# no requirements set, so the result columns are empty');
    for (const c of scenario.constraints) header.push(`# ${c.mandatory === false ? 'tracked' : 'required'}: ${describeConstraint(c)}`);
    for (const a of scenario.assumptions ?? []) header.push(`# assumption: ${a.materialId} ${a.property} = ${a.value} ${a.unit ?? ''}`.trim());
  }
  const tested = !scenario || scenario.constraints.length > 0;

  const lines = [
    ...header,
    cols.join(','),
    ...rows.map(({ material: m, evaluation: e }: Loose) => [
      m.id, m.name, m.family, m.h2cStatus, tested ? e.verdict : '', e.eligible ? 'yes' : 'no',
      why(e.failed), why(e.unresolved),
      tested ? e.gradeId ?? '' : '', tested && e.state ? judgedAs(e.state) : '',
      ...(index ? (() => { const r = ranking.get(m.id); return r ? [r.place, Number(r.value.toPrecision(6)), r.best?.gradeId ?? '', r.products] : ['', '', '', '']; })() : []),
      ...KEYS.map((k: Loose) => val(m, k)),
      qualifiers(m), ids(m),
      range(m.print?.nozzleC), range(m.print?.bedC), range(m.print?.chamberC) || (m.print?.chamberGuidance ? (CHAMBER_GUIDANCE as Loose)[m.print.chamberGuidance.state]?.word ?? '' : ''),
      m.gates.abrasive === 'requires-hardened' ? 'required' : m.gates.abrasive === 'no-special-concern' ? 'not needed' : 'not recorded',
      DRYING_WORD[m.gates.drying] ?? 'not recorded',
      m.buy?.url ?? '',
      // A hide by a property that does not apply, by an estimate and by the base polymer's published behaviour each travel
      // in their own column (D64, D148).
      e.screened ? screenedByKind(e).notApplicable.join('; ') : '',
      ...(useEstimates ? [estimated(m), e.screened ? screenedByKind(e).estimate.join('; ') : '', e.screened ? screenedByKind(e).polymer.join('; ') : ''] : []),
      // The group the list sorts it into (D155), and whether it is tagged likely: presentation, never a verdict.
      tested ? e.group ?? '' : '', tested && e.likely ? 'yes' : '',
    ].map(q).join(',')),
  ];
  return lines.join('\n');
}

/**
 * A value a source published as a bound travels as its number in the value column and as "key: > 300" here, with the sign
 * the sheet prints, so a spreadsheet never reads a limit as a measurement. A material's median says how many of its
 * products' values were bounds.
 */
function boundQualifier(key: Loose, h: Loose) {
  const b = boundOf(publishedBound(h));
  return [...(b ? [`${key}: ${b.sign} ${h.value}`] : []),
    ...(h?.spread?.bounds ? [`${key}: ${h.spread.bounds.n} of ${h.spread.n} product values are published bounds, counted as their numbers`] : [])];
}

/**
 * Every product of the materials on screen, one row each (D83): the end of the funnel, where a material becomes a spool.
 * Its own values with their level, its print recipe, and its verdict under the scenario's requirements, so the file
 * says which product to buy and why without the screen.
 */
export function productsCSV(rows: Loose, db: Loose, { scenario, productsByMaterial, ctx = null }: Loose = {}) {
  // The goal's index of each product in the state its answer is in (D107).
  const goal = scenario?.rankBy ? indexById(scenario.rankBy) : null;
  const KEYS = exportHeadlines().map((h: Loose) => h.key);
  const q = (v: Loose) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const win = (a: Loose) => (!a ? '' : a.state === 'range' ? `${a.min ?? ''}-${a.max ?? ''}` : a.state);
  // Where a value or a part of the recipe is not the product's own sheet's: a twin's (D89) or a printer maker's guide's
  // (D88), named in the columns that say so.
  const readFrom = (entries: Loose) => entries.filter(([, f]: Loose) => f).map(([what, f]: Loose) => `${what}: ${f.label}`).join('; ');
  const cols = ['MaterialID', 'Material', 'GradeID', 'Maker', 'Product', 'Variant', 'Meets the requirements', 'Judged as', 'Not settled by',
    ...(goal && ctx ? [`Goal ${goal.formula} in the state judged`] : []),
    ...KEYS.flatMap((k: Loose) => [k, `${k} level`, `${k} measurement`]), 'Value qualifiers', 'Values read from',
    'Nozzle C', 'Bed C', 'Chamber C', 'Enclosure', 'Hardened nozzle', 'Drying', 'Annealing', 'Recipe read from', 'Source', 'Candidate group', 'Likely'];
  const header = [
    '# H2C Material Selector: products of the materials on screen',
    `# release ${db.meta.release?.id ?? 'unidentified'} (database snapshot ${db.meta.snapshot}, application build ${db.meta.build})`,
    '# a value is comparable (a printed bar, said or implied, read flat where it states no orientation, or for heat deflection an undescribed bar of a plastic that cannot crystallise, D177; dry or unstated; at the load) or as-published (set apart: a bar no document describes as printed, or no stated load)',
    ...(scenario?.constraints ?? []).map((c: Loose) => `# ${c.mandatory === false ? 'tracked' : 'required'}: ${describeConstraint(c)}`),
    ...(scenario ? [`# products judged ${stateWords(scenario)} (D99)`] : []),
  ];
  const lines: Loose[] = [];
  for (const { material: m, evaluation: e } of rows) {
    const judged = new Map<Loose, Loose>((e?.products ?? []).map((x: Loose) => [x.gradeId, x]));
    for (const g of productsByMaterial?.get(m.id) ?? []) {
      const p = g.print;
      lines.push([m.id, m.name, g.id, g.manufacturer, g.product, g.variant ?? '',
        scenario?.constraints?.length ? judged.get(g.id)?.verdict ?? '' : '',
        scenario?.constraints?.length && judged.get(g.id)?.state ? judgedAs(judged.get(g.id).state) : '',
        (judged.get(g.id)?.results ?? []).filter((r: Loose) => r.status === 'UNKNOWN' || r.status === 'INDETERMINATE').map((r: Loose) => `${r.constraint ? describeConstraint(r.constraint) : r.criterion}: ${r.reason}${recordIds(r)}`).join(' | '),
        ...(goal && ctx ? [(() => { const j = judged.get(g.id); const v = j ? indexValue(productView(m, g, ctx, stateOf(g, j.state?.id ?? null)), goal) : null; return v === null ? '' : Number(v.toPrecision(6)); })()] : []),
        ...KEYS.flatMap((k: Loose) => { const v = g.headline?.[k]; return [v?.value ?? '', v?.level ?? '', v?.measurementId ?? (v?.priceIds ?? []).join(' ')]; }),
        KEYS.flatMap((k: Loose) => boundQualifier(k, g.headline?.[k])).join(' | '),
        readFrom(KEYS.map((k: Loose) => [k, g.headline?.[k]?.from])),
        ...['nozzle', 'bed', 'chamber'].map((a: Loose) => (p?.profileIds.length || p?.from?.[a] ? win(p[a]) : '')),
        p?.enclosure ?? '', p?.hardenedNozzle === true ? 'required' : p?.hardenedNozzle === false ? 'not needed' : '',
        // A schedule printed as a range keeps its lower ends: "required; 80-100 C 6-12 h" (D175).
        p?.drying ? `${p.drying.need}; ${p.drying.tempMinC != null ? `${p.drying.tempMinC}-` : ''}${p.drying.tempC ?? ''} C ${p.drying.hoursOpen ? '>= ' : ''}${p.drying.hoursMin != null ? `${p.drying.hoursMin}-` : ''}${p.drying.hours ?? ''} h` : '',
        (p?.anneal ?? []).map((x: Loose) => `${x.tempC ?? '?'} C ${x.hours ?? '?'} h`).join('; '), readFrom(Object.entries(p?.from ?? {})), g.sourceId, judged.get(g.id)?.group ?? '', judged.get(g.id)?.likely ? 'yes' : '',
      ].map(q).join(','));
    }
  }
  return [...header, cols.join(','), ...lines].join('\n');
}

const scheduleWords = (t: Loose) => `${t?.tempC ?? '?'} C for ${t?.hours ?? '?'} h`;
/**
 * The records an answer the evidence ledger gave rests on, for an export (stage 3d): the page's sentence names them in
 * words, and the file keeps their IDs, " [records V002691]". Only where the ledger, a ceiling or a doubt decided.
 */
const recordIds = (r: Loose) => {
  if (!r.ledger && !r.sheetsDisagree && !r.ceilingOnly && !r.doubtful) return '';
  const ids = [...new Set([r.ledger?.measurementId, r.sheetsDisagree?.lo?.measurementId, r.sheetsDisagree?.hi?.measurementId, r.ceilingOnly?.measurementId,
    ...(r.doubtful ?? []).map((d: Loose) => d.measurementId)].filter(Boolean))];
  return ids.length ? ` [records ${ids.join(' ')}]` : '';
};
/** The state a verdict is in (D99), as an export column says it. */
const judgedAs = (s: Loose) => `${s.treatment ? `annealed ${scheduleWords(s.treatment)}` : 'as printed'}${s.moisture === 'conditioned' ? ', conditioned' : ', dry'}`;
/** What the scenario permits, as the export's header says it. */
const stateWords = (scenario: Loose) => `${scenario.anneal ? `as printed, or annealed at the schedule each sheet states${scenario.annealMaxC ? ` up to ${scenario.annealMaxC} C` : ''}` : 'as printed'}, ${scenario.moisture === 'conditioned' ? 'conditioned' : 'dry'}`;

export function download(filename: Loose, text: Loose, type: Loose = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}