// The decision brief (DECISIONS D103; GOALS, 2026-09-28, decision 7): the end of the funnel as a document a team can
// hand on. One chosen product, in the state it was judged in, on the release it was chosen on: what was asked, what it
// passed and on which records, what the screening policy admitted unstated, what is still not settled, how to print and
// treat it, and the test the team will run, with the team's own results beside it.
//
// It is written from the engine's answer for that product (evaluateProducts' products[] entry), never recomputed, so the
// brief and the page cannot disagree. It is plain Markdown, readable anywhere and printable; the saved scenario beside it
// reopens the question on this release or warns on another (D96). A test result a team records is its own evidence, kept
// with the decision: it never enters the database, whose sources are makers' documents.

import { describeConstraint } from './labels.js';
import { headlineDef } from './registry.js';
import { fmtNumber } from './format.js';
import { templateByName } from './templates.js';

const NP = 'not published';
const scheduleWords = (t) => `${t?.tempC != null ? `${fmtNumber(t.tempC)} °C` : 'a temperature its sheet does not state'} for ${t?.hours != null ? `${fmtNumber(t.hours)} h` : 'a time its sheet does not state'}`;
const stateWords = (s) => `${s?.treatment ? `annealed at ${scheduleWords(s.treatment)}` : 'as printed'}, ${s?.moisture === 'conditioned' ? 'conditioned by moisture' : 'dry'}`;
const cell = (t) => String(t ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const requirementOf = (r) => (r.constraint ? describeConstraint(r.constraint) : r.criterion);
const AGAINST_H2C = { within: 'within the H2C', exceeds: 'beyond the H2C', 'exceeds-recommended': 'recommended above the H2C', partial: 'partly within the H2C' };
const against = (a) => (a ? AGAINST_H2C[a.verdict] ?? 'not judged against the H2C' : '');

/** A product as a reader names it: its maker and product, the maker once. */
export function productLabel(g) {
  const product = g?.product && !/^Not /.test(g.product) ? g.product : '';
  const maker = g?.manufacturer && !/^Not /.test(g.manufacturer) ? g.manufacturer : '';
  if (!product) return maker || g?.id || '';
  return maker && !product.toLowerCase().startsWith(maker.toLowerCase()) ? `${maker} ${product}` : product;
}

/** How a print window reads in a brief. */
function windowWords(a) {
  if (!a) return NP;
  if (a.state === 'range') return a.max == null && a.min != null ? `at least ${fmtNumber(a.min)} °C` : `${a.min != null && a.min !== a.max ? `${fmtNumber(a.min)}–` : ''}${fmtNumber(a.max)} °C`;
  if (a.state === 'not-required' || a.state === 'ambient') return 'not required';
  if (a.state === 'enclosed') return 'an enclosure, which the H2C\'s heated chamber is';
  return a.state === 'unknown' ? NP : a.state.replace(/-/g, ' ');
}

/**
 * A suggested confirmation test per requirement, from the value that decided it: the team's own coupon, printed on the
 * product's recipe, in the state the verdict used, to the method its sheet names. A suggestion, not a procedure: the
 * part's own load, direction and exposure decide what to test.
 */
function testFor(r, state, measurementById) {
  const c = r.constraint;
  if (!c || c.mandatory === false) return null;
  // A density is the resin's and a price is a listing's: no coupon of the part tests either.
  const def = c.kind === 'numeric' ? headlineDef(c.property) : null;
  if (def && (def.kind === 'price' || (!def.changesWithAnnealing && !def.changesWithMoisture))) return null;
  const m = r.measurementId ? measurementById.get(r.measurementId) : null;
  const method = m?.standards?.length ? m.standards.join(', ') : 'the method its sheet names';
  const treat = state?.treatment ? `, annealed at ${scheduleWords(state.treatment)} as its sheet states` : '';
  if (c.kind === 'numeric') {
    const dir = m?.direction && !['not-applicable', 'unknown'].includes(m.direction) ? ` in ${m.direction}` : '';
    return `${describeConstraint(c)}: print coupons${dir} on this product's recipe${treat}, test to ${method}, and compare with ${fmtNumber(c.value)}${state?.moisture === 'conditioned' ? ' after conditioning them as the part will be' : ''}.`;
  }
  if (c.kind === 'environment') return `${describeConstraint(c)}: expose coupons to the agent, concentration, temperature and time the part will meet, and compare with unexposed ones; a maker's rating names no such condition.`;
  if (c.kind === 'gate' && ['nozzle', 'bed', 'chamber'].includes(c.gate)) return 'Printable on the H2C: print a first part at the recipe above and record whether it warps, delaminates or strings.';
  return null;
}

/**
 * The brief for one chosen product. `evaluation` is the material's evaluation under the scenario, `entry` the product's
 * own answer in it, `decision` the chosen product as the scenario holds it ({ gradeId, stateId, release, chosenOn, note,
 * tests }).
 */
export function decisionBrief({ db, scenario, material, grade, evaluation, entry, decision }) {
  const measurementById = new Map(db.measurements.map((m) => [m.id, m]));
  const sourceById = new Map(db.sources.map((s) => [s.id, s]));
  const release = db.meta.release?.id ?? 'unidentified';
  const L = [];
  L.push(`# Decision brief: ${productLabel(grade)} (${grade.id})`, '');
  L.push(`${material.name}${material.fullName ? `, ${material.fullName}` : ''}. Chosen ${decision.chosenOn ?? 'on an unrecorded date'} on release ${decision.release ?? 'unidentified'}${decision.release && decision.release !== release ? `; this brief was written on release ${release}, whose answer is below` : ''} (data of ${db.meta.snapshot}).`, '');
  if (decision.note) L.push(`> ${cell(decision.note)}`, '');

  L.push('## The question', '');
  const hard = scenario.constraints.filter((c) => c.mandatory !== false);
  const soft = scenario.constraints.filter((c) => c.mandatory === false);
  if (scenario.template) L.push(`From the ${scenario.template} template.`, '');
  for (const c of hard) L.push(`- Required: ${describeConstraint(c)}`);
  for (const c of soft) L.push(`- Tracked: ${describeConstraint(c)}`);
  L.push(`- Products judged ${scenario.anneal ? `as printed, or annealed at their sheet's schedule${scenario.annealMaxC ? ` up to ${scenario.annealMaxC} °C` : ''}` : 'as printed'}, ${scenario.moisture === 'conditioned' ? 'conditioned by moisture' : 'dry'}; values ${scenario.evidence === 'as-published' ? 'comparable or published without their direction or load' : 'comparable only'}.`);
  L.push('');

  L.push('## The answer', '');
  if (!entry) {
    L.push(`No answer: ${grade.id} is not among ${material.name}'s products judged under this question.`, '');
  } else {
    L.push(`**${entry.verdict}**, judged ${stateWords(entry.state)}.${entry.state?.treatment ? ` It needs annealing at ${scheduleWords(entry.state.treatment)}, as its sheet states.` : ''}`);
    if (entry.admitted?.length) L.push('', `The values it passed on leave these conditions unstated, which the screening policy admits: ${entry.admitted.map((a) => ({ specimen: 'the specimen form', moisture: 'the moisture state', treatment: 'the treatment' }[a])).join(', ')}.`);
    L.push('', '| Requirement | Result | Why | Records |', '|---|---|---|---|');
    for (const r of entry.results ?? []) {
      const ids = [r.measurementId, ...(r.evidenceIds ?? []), ...(r.priceIds ?? [])].filter(Boolean);
      L.push(`| ${cell(requirementOf(r))} | ${r.status} | ${cell(r.reason)} | ${ids.join(' ')} |`);
    }
    L.push('');
    const cited = [...new Set((entry.results ?? []).map((r) => r.measurementId).filter(Boolean))].map((id) => measurementById.get(id)).filter(Boolean);
    if (cited.length) {
      L.push('### Where the numbers are printed', '', '| Measurement | Value as printed | Source | Page | SHA-256 |', '|---|---|---|---|---|');
      for (const m of cited) {
        const s = sourceById.get(m.sourceId);
        L.push(`| ${m.id} | ${cell(m.raw?.value ?? m.value)} | ${cell([s?.publisher, s?.title].filter(Boolean).join(', ') || m.sourceId)} (${m.sourceId}) | ${cell(m.locator)} | ${s?.sha256 ?? 'not recorded'} |`);
      }
      L.push('');
    }
  }

  L.push('## What is not settled', '');
  const open = (entry?.results ?? []).filter((r) => r.status === 'UNKNOWN' || r.status === 'INDETERMINATE');
  if (open.length) for (const r of open) L.push(`- ${requirementOf(r)}: ${r.reason}.`);
  else L.push('- Every requirement asked was settled by the records above. What the question did not ask is below.');
  const notChecked = templateByName(scenario.template)?.notChecked;
  if (notChecked) L.push(`- Not checked by the ${scenario.template} template: ${notChecked}`);
  L.push('- A data sheet is the maker\'s coupon, not this part: geometry, orientation, infill, lot and printer decide the part. The test below decides.', '');

  L.push('## How to print and treat it', '');
  const p = grade.print;
  const from = p?.from ?? {};
  const origin = (k) => (from[k] ? ` (${from[k].label})` : '');
  for (const [label, key] of [['Nozzle', 'nozzle'], ['Bed', 'bed'], ['Chamber', 'chamber']]) L.push(`- ${label}: ${windowWords(p?.[key])}${p?.[key] ? `, ${against(p[key])}` : ''}${origin(key)}`);
  L.push(`- Hardened nozzle: ${p?.hardenedNozzle === true ? 'required' : p?.hardenedNozzle === false ? 'not needed' : NP}${origin('hardenedNozzle')}`);
  L.push(`- Drying: ${p?.drying ? scheduleWords(p.drying) : NP}${origin('drying')}`);
  L.push(`- Annealing: ${entry?.state?.treatment ? `needed for this answer, at ${scheduleWords(entry.state.treatment)}` : (p?.anneal ?? []).length ? `not needed for this answer; its sheet measures some values after ${(p.anneal).map((a) => scheduleWords(a)).join('; ')}` : 'not needed for this answer'}`);
  L.push('');

  L.push('## The confirmation test', '');
  const tests = [...new Set((entry?.results ?? []).map((r) => testFor(r, entry.state, measurementById)).filter(Boolean))];
  if (tests.length) for (const t of tests) L.push(`- ${t}`);
  else L.push('- Print the part, or coupons of it, on the recipe above and test what the part must do.');
  L.push('', '### The team\'s results', '', 'The team\'s own evidence for this product, recorded with the decision and never written to the database.', '');
  L.push('| Date | Operator | Printer and recipe | Orientation | Conditioning | Method | Result | Notes |', '|---|---|---|---|---|---|---|---|');
  for (const t of decision.tests ?? []) L.push(`| ${cell(t.date)} | ${cell(t.operator)} | ${cell(t.recipe)} | ${cell(t.orientation)} | ${cell(t.conditioning)} | ${cell(t.method)} | ${cell(t.result)} | ${cell(t.notes)} |`);
  if (!(decision.tests ?? []).length) L.push('|  |  |  |  |  |  |  |  |');
  L.push('', '---', '', `H2C Material Selector, release ${release}, database snapshot ${db.meta.snapshot}, application build ${db.meta.build}. A screening answer from makers' published data, not a design allowable or a certification. Reopen the saved scenario to see the question on this release; on another release it says so.`, '');
  return L.join('\n');
}
