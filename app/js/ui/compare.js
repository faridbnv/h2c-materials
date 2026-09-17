// Compare workspace: aligned bars with bounds, two to six materials.
//
// No radar charts of raw engineering properties. A condition row sits under every property block,
// because a comparison of numbers measured differently is not a comparison.

import { AXIS_DEFS } from './axes.js';
import { renderValue, esc, fmtNumber, estimateDisplay, chip, wireEvidence, explainButton, missingText, missingLabel, scrollTable, markTableOverflow } from './format.js';
import { prop, describeConstraint, gateVerdict, estimateTitle, POLICY_CONTROL, policyLabel } from './labels.js';

const BASELINE_NAMES = ['PLA', 'PETG', 'ABS', 'ASA', 'PC'];
/** A track is drawn on a log scale when its candidates' largest value is more than this many times their smallest. */
const LOG_TRACK_RATIO = 100;

export function renderCompare(host, state, actions) {
  const { db, scenario } = state;
  const pinned = scenario.shortlist.map((id) => db.materials.find((m) => m.id === id)).filter(Boolean);

  // The baseline joins the comparison as an extra bar, marked as a reference rather than a
  // shortlisted candidate. Without it the bars are only relative to each other, which tells you
  // which of three unfamiliar materials is stiffest and nothing about whether any of them is stiff.
  const anchor = state.baseline && !scenario.shortlist.includes(state.baseline)
    ? db.materials.find((m) => m.id === state.baseline) : null;
  const picked = anchor ? [...pinned, anchor] : pinned;
  const isAnchor = (m) => anchor && m.id === anchor.id;

  // One candidate against a familiar baseline is a comparison, and the most natural first one:
  // "how does this compare with PLA?" It used to demand a second pin before drawing anything.
  if (pinned.length === 0 || (pinned.length === 1 && !anchor)) {
    host.innerHTML = `<div class="empty">
      <h3>${pinned.length ? 'Add a second material, or compare against one you know' : 'Shortlist materials to compare them'}</h3>
      <p>Use the star in the results table, or open any material and press <b>Shortlist</b>.
      ${pinned.length === 1 ? `<strong>${esc(pinned[0].name)}</strong> is shortlisted so far.` : ''}</p>
      ${pinned.length === 1 ? `<label class="baseline-pick">Compare it against
        <select data-baseline><option value="">choose a material</option>
        ${BASELINE_NAMES.map((n) => db.materials.find((m) => m.name === n)).filter((m) => m && m.id !== pinned[0].id)
          .map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}</select></label>` : ''}</div>`;
    host.querySelector('[data-baseline]')?.addEventListener('change', (e) => actions.setBaseline(e.target.value));
    return;
  }

  // A shortlist is research history, and keeping a material after the requirements change is
  // useful. Showing it without its current result is not: an old pick read as a current answer.
  const tested = scenario.constraints.length > 0;
  const evalOf = (m) => state.selection.evaluations.find((e) => e.materialId === m.id);
  const resultChip = (m) => {
    if (!tested) return '<span class="chip chip-neutral" title="No requirement is set">not tested</span>';
    const e = evalOf(m);
    if (!e) return '';
    // Why it failed or could not be checked, one press away rather than in a title.
    const why = [...e.failed, ...e.unresolved].map((r) => `${describeConstraint(r.constraint)}: ${r.reason}`).join('\n');
    return explainButton(esc(e.verdict), why || 'Meets every requirement', { cls: `chip chip-${e.verdict}`, head: `${m.name}: ${e.verdict}` });
  };

  // Estimates belong here too. Compare used to print "Not published" for a material whose family
  // bound was the very thing that decided whether it stayed in the results, so the reader saw a
  // blank where the tool had an opinion.
  const useEstimates = state.ctx?.showEstimates;
  const estimateOf = (m, key) => {
    const h = m.headline[key];
    return !h?.known && useEstimates && h?.estimate ? h.estimate : null;
  };

  // The scale each property's track is drawn on: every candidate material in the database, not the shortlist. Scaled to
  // the shortlist's own maximum, densities of 1,050, 1,110 and 1,090 kg/m³ drew three nearly full bars that said nothing;
  // against the database's range they say where each material sits among everything the tool could have offered. The
  // range is the measured headlines with their published ranges, and each estimate's plausible range while estimates are
  // shown, since that is what Compare draws for it.
  const candidates = db.materials.filter((m) => !m.familyEntry);
  const databaseRange = (key) => {
    const vs = [];
    for (const m of candidates) {
      const h = m.headline[key];
      if (h?.known) vs.push(h.value, h.interval?.lo, h.interval?.hi);
      else if (useEstimates && h?.estimate) vs.push(h.estimate.lo, h.estimate.hi, h.estimate.plausible?.lo, h.estimate.plausible?.hi);
    }
    const finite = vs.filter(Number.isFinite);
    return finite.length ? { lo: Math.min(...finite), hi: Math.max(...finite) } : null;
  };

  const logTracks = [];
  const blocks = AXIS_DEFS.map((a) => {
    const vals = picked.map((m) => m.headline[a.key]);
    const known = vals.filter((v) => v?.known).map((v) => v.value);
    const estimated = picked.map((m) => estimateOf(m, a.key)).filter(Boolean);
    const related = vals.filter((v) => v && !v.known && v.related);
    if (!known.length && !estimated.length && !related.length) {
      return `<div class="cmp-prop"><h4>${esc(prop(a.key).plain)} <span class="unit">${esc(a.unit)}</span></h4>
        <div class="gap">Not published for any shortlisted material.</div></div>`;
    }
    // A requirement on this property is drawn across every track, so a bar is read against the line it has to clear.
    const requirements = scenario.constraints.filter((c) => c.kind === 'numeric' && c.property === a.key && Number.isFinite(c.value));
    const base = databaseRange(a.key);
    // The track also holds anything drawn on it that lies outside the candidates' range, a related measurement or a
    // requirement a little past every candidate, rather than pinning it to an end where it would read as that value. A
    // requirement further out than the candidates' own spread would crush every bar to a sliver; it is drawn at the end
    // it lies beyond, marked as past it, and the note under the track says so.
    //
    // A property that spans more than a hundredfold across the candidates is drawn on a log track. On a linear one,
    // stiffness from 0.0046 to 12.5 GPa and stretch from 0.8 to 1,740 % left nearly every material a sliver at the left
    // end, and the elastomers that set the range were the only bars that read. A log track needs every value on it to be
    // positive: the candidates' range, the shortlist's values, ranges and estimates, and the requirements.
    const onTrack = [base?.lo, base?.hi, ...known, ...related.map((v) => v.related.best.value), ...requirements.map((c) => c.value),
      ...vals.flatMap((v) => (v?.known ? [v.interval?.lo, v.interval?.hi] : [])),
      ...estimated.flatMap((e) => [e.lo, e.hi, e.centre, e.plausible?.lo, e.plausible?.hi])].filter(Number.isFinite);
    const log = !!base && base.lo > 0 && base.hi / base.lo > LOG_TRACK_RATIO && onTrack.every((v) => v > 0);
    // Positions are worked out in the track's own terms, tens on a log track, so "near" and "past the end" mean the
    // same on either kind.
    const t = log ? Math.log10 : (v) => v;
    const baseSpan = base ? t(base.hi) - t(base.lo) : 0;
    const near = (v) => !base || (t(v) >= t(base.lo) - baseSpan && t(v) <= t(base.hi) + baseSpan);
    const drawn = [...related.map((v) => v.related.best.value), ...requirements.map((c) => c.value).filter(near)];
    const lo = Math.min(base?.lo ?? Infinity, ...known, ...drawn);
    const hi = Math.max(base?.hi ?? -Infinity, ...known, ...drawn);
    const widened = base && (lo < base.lo || hi > base.hi);
    const beyond = requirements.some((c) => c.value < lo || c.value > hi);
    const span = t(hi) - t(lo) || Math.abs(t(hi)) || 1;
    const pct = (v) => (log && !(v > 0) ? 0 : Math.max(0, Math.min(100, ((t(v) - t(lo)) / span) * 100)));
    const lines = requirements.map((c) => `<span class="cmp-threshold${c.mandatory === false ? ' tracked' : ''}${c.value < lo || c.value > hi ? ' beyond' : ''}" style="left:${pct(c.value)}%"></span>`).join('');

    const conds = picked.map((m) => {
      const h = m.headline[a.key];
      if (!h?.known) return null;
      return [h.direction && h.direction !== 'not-applicable' ? h.direction : null,
        h.specimenType?.startsWith('Not published') ? 'specimen not stated' : h.specimenType,
        h.loadStated === false ? 'load not stated' : null].filter(Boolean).join(' · ');
    });
    const differ = new Set(conds.filter(Boolean)).size > 1;

    if (log) logTracks.push(prop(a.key).plain.toLowerCase());
    return `<div class="cmp-prop${log ? ' log-track' : ''}">
      <h4 title="${esc(prop(a.key).technical)}">${esc(prop(a.key).plain)} <span class="unit">${esc(a.unit)}</span>${requirements.length
        ? `<span class="cmp-req">${requirements.map((c) => `<span class="cmp-req-item"><i class="cmp-req-mark${c.mandatory === false ? ' tracked' : ''}" aria-hidden="true"></i>${esc(describeConstraint(c))}${c.mandatory === false ? ' (tracked)' : ''}</span>`).join(' ')}</span>` : ''}</h4>
      ${picked.map((m) => {
        const h = m.headline[a.key];
        const who = `${esc(m.name)}${isAnchor(m) ? ' <span class="anchor-tag">baseline</span>' : ''}`;
        if (!h?.known) {
          const e = estimateOf(m, a.key);
          if (h?.notApplicable) {
            return `<div class="cmp-bar${isAnchor(m) ? ' anchor' : ''}"><span>${who}</span>
              <span>${explainButton('not applicable', `Not applicable. ${h.notApplicable.reason}`, { cls: 'missing', head: 'Not applicable' })}</span><span></span></div>`;
          }
          // A measurement that never became the headline is still a measurement. The table shows
          // it with an asterisk; Compare used to print "Not published" for the same material. With
          // estimates on, the estimate already carries it, converted, so the estimate is shown.
          if (h?.related && !e) {
            const b = h.related.best;
            return `<div class="cmp-bar cmp-related${isAnchor(m) ? ' anchor' : ''}">
              <span>${who}</span>
              <span class="track">${lines}<span class="related-tick" style="left:${pct(b.value)}%"></span></span>
              <span class="val">${renderValue(h)}</span></div>`;
          }
          if (!e) {
            return `<div class="cmp-bar${isAnchor(m) ? ' anchor' : ''}"><span>${who}</span>
              <span>${explainButton(esc(missingLabel(h)), missingText(h), { cls: 'missing', head: missingLabel(h) })}</span><span></span></div>`;
          }
          // A span, not a bar: the likely range, with the plausible range behind it and a tick at the
          // centre. There is no measured value to fill to. Its ends are printed on one step, in the heading's unit.
          const left = pct(e.lo);
          const w = Math.max(pct(e.hi) - left, 1.5);
          const wide = e.plausible ? `<span class="est-wide" style="left:${pct(e.plausible.lo)}%;width:${Math.max(pct(e.plausible.hi) - pct(e.plausible.lo), 1.5)}%"></span>` : '';
          const title = estimateTitle(e, estimateDisplay(e, { ownUnit: true }));
          const d = estimateDisplay(e);
          return `<div class="cmp-bar estimated${isAnchor(m) ? ' anchor' : ''}" title="${esc(title)}">
            <span>${who}</span>
            <span class="track">${wide}<span class="est-span" style="left:${left}%;width:${w}%"></span><span class="est-centre" style="left:${pct(e.centre)}%"></span>${lines}</span>
            <span class="val">${explainButton(`~${d.lo}–${d.hi}<span class="est-mark">†</span>`, title,
              { cls: `est est-${e.precision}`, head: 'Estimate, not a measurement', action: 'estimate', id: m.id })}</span></div>`;
        }
        // The bar fills from the track's low end, the lowest candidate, so its length is the material's place in the
        // database's range; the end labels under the bars say what that range is.
        const bounds = h.interval && h.interval.lo !== h.interval.hi && h.interval.lo !== null && h.interval.hi !== null
          ? `<span class="bounds" style="left:${pct(h.interval.lo)}%;width:${pct(h.interval.hi) - pct(h.interval.lo)}%"></span>` : '';
        return `<div class="cmp-bar${isAnchor(m) ? ' anchor' : ''}">
          <span>${who}</span>
          <span class="track"><span class="fill" style="width:${pct(h.value)}%"></span>${bounds}${lines}</span>
          <span class="val">${renderValue(h)}</span></div>`;
      }).join('')}
      <div class="cmp-bar cmp-axis">
        <span></span>
        <span class="cmp-scale${log ? ' log' : ''}"><span>${esc(fmtNumber(lo))}</span>${log ? '<span class="cmp-scale-kind">log scale</span>' : ''}<span>${esc(fmtNumber(hi))}</span></span>
        <span class="cmp-scale-note">${beyond ? 'requirement past the end'
          : !widened ? `all ${candidates.length} candidates`
          : requirements.some((c) => c.value < base.lo || c.value > base.hi) ? 'widened to the requirement' : 'widened to a value shown'}</span>
      </div>
      <div class="cmp-cond">${conds.map((c, i) => c ? `${esc(picked[i].name)}: ${esc(c)}` : '').filter(Boolean).join(' | ')}
        ${differ ? '<span class="differ"> — conditions differ across columns</span>' : ''}</div>
    </div>`;
  }).join('');

  const anyRelated = picked.some((m) => AXIS_DEFS.some((a) => !m.headline[a.key]?.known && m.headline[a.key]?.related));
  const anyBounds = picked.some((m) => AXIS_DEFS.some((a) => {
    const i = m.headline[a.key]?.interval;
    return m.headline[a.key]?.known && i && i.lo !== i.hi;
  }));

  // What was asked, on screen and on paper. A printed comparison used to carry the bars and nothing
  // that said which question they answered, under which rule, from which snapshot.
  const hard = scenario.constraints.filter((c) => c.mandatory !== false);
  const soft = scenario.constraints.filter((c) => c.mandatory === false);
  const context = `<div class="cmp-context">
      <div><b>Requirements:</b> ${hard.length ? hard.map((c) => esc(describeConstraint(c))).join('; ') : 'none set, so nothing has been tested'}${soft.length ? `. <b>Tracked only:</b> ${soft.map((c) => esc(describeConstraint(c))).join('; ')}` : ''}.</div>
      <div class="fine">${scenario.template ? `Template: ${esc(scenario.template)}. ` : ''}${POLICY_CONTROL}: ${policyLabel(scenario.unknownPolicy)}${useEstimates ? ', estimates and polymer data on (they never pass a material and may screen one out)' : ''}.
        Database snapshot ${esc(db.meta.snapshot)}, build ${esc(db.meta.build)}. Values are recorded for each material and may come from
        different grades; check the exact grade before you buy or print.</div>
    </div>`;

  host.innerHTML = `
    ${context}
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
      <span class="fine">Shortlisted ${pinned.length}, with each one's result against the requirements above:</span>
      ${pinned.map((m) => `<span class="pin">${esc(m.name)} ${resultChip(m)}</span>`).join('')}
      ${anchor ? `<span class="pin anchor">${esc(anchor.name)} · baseline</span>` : ''}
      <label class="baseline-pick" title="Adds a familiar material as a reference bar.">
        Compare against
        <select data-baseline>
          <option value="">no reference</option>
          ${BASELINE_NAMES.map((n) => db.materials.find((m) => m.name === n)).filter(Boolean)
            .map((m) => `<option value="${esc(m.id)}" ${state.baseline === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
        </select>
      </label>
      <div class="spacer" style="flex:1"></div>
      <button class="btn btn-sm" id="cmp-print">Print summary</button>
    </div>
    <p class="fine cmp-intro">Each track spans all ${candidates.length} candidate materials in the database${useEstimates ? ', their estimated ranges included' : ''}:
      the numbers under it are the lowest and highest, so a bar's length is where a material sits among them.${logTracks.length
        ? ` Where the candidates span more than a hundredfold (here ${logTracks.join(' and ')}) the track is marked log scale: each tenfold step takes the same length, so a bar reads as a place among the orders of magnitude.` : ''}${scenario.constraints.some((c) => c.kind === 'numeric')
        ? ' An upright line is a requirement, named beside the property, dashed if it is only tracked; a track widens past the candidates to show one, or marks one far past them at its end, and says so.' : ''}
      ${anyBounds ? 'The <b>|—|</b> marks on a bar are the range or uncertainty the source reported. ' : ''}${anyRelated ? 'A <b>*</b> value is a measurement that was never made the headline, drawn as a tick, not a bar; select it for why.' : ''}</p>
    ${blocks}
    <h3 class="sec">Process requirements</h3>
    ${scrollTable(`<table class="grid"><thead><tr><th class="name">Material</th><th>Nozzle within H2C</th><th>Bed within H2C</th><th>Chamber within H2C</th><th>Hardened nozzle</th><th>Drying</th></tr></thead>
      <tbody>${picked.map((m) => `<tr><td class="name">${esc(m.name)}</td>
        ${['nozzle', 'bed', 'chamber'].map((g) => `<td>${verdictChip(m.gates[g], g)}</td>`).join('')}
        <td>${esc(ABRASION_WORD[m.gates.abrasive] ?? 'not recorded')}</td><td>${esc(m.gates.drying === 'required' ? 'guidance published' : 'not recorded')}</td></tr>`).join('')}</tbody></table>`)}

    <h3 class="sec">Evidence completeness</h3>
    ${scrollTable(`<table class="grid"><thead><tr><th class="name">Material</th><th>Measured</th><th>Estimated</th><th>Grades</th><th>Measurements</th></tr></thead>
      <tbody>${picked.map((m) => {
        const have = AXIS_DEFS.filter((a) => m.headline[a.key]?.known).length;
        const est = AXIS_DEFS.filter((a) => estimateOf(m, a.key)).length;
        return `<tr><td class="name">${esc(m.name)}</td>
          <td>${have} of ${AXIS_DEFS.length}</td>
          <td>${est ? `<span class="est">${est}<span class="est-mark">\u2020</span></span>` : '\u2014'}</td>
          <td>${m.gradeIds.length}</td>
          <td>${state.ctx.measurementsByMaterial.get(m.id)?.length ?? 0}</td></tr>`;
      }).join('')}</tbody></table>`)}
    ${picked.some((m) => AXIS_DEFS.some((a) => estimateOf(m, a.key)))
      ? `<p class="fine">A \u2020 span is an estimate, not a measurement: the likely range (${Math.round((db.meta.estimateModel?.levels?.likely ?? 0.8) * 100)}%), with the
         plausible range behind it and a tick at its centre. It is built from the material's own related
         measurements where it has any, and from its polymer family. It never passes a requirement; select
         it for what it rests on and whether it can screen.</p>`
      : ''}`;

  markTableOverflow(host);
  host.querySelector('#cmp-print')?.addEventListener('click', () => window.print());
  wireEvidence(host, actions);
  host.querySelector('[data-baseline]')?.addEventListener('change', (e) => actions.setBaseline(e.target.value));
}

const ABRASION_WORD = { 'requires-hardened': 'required', 'no-special-concern': 'not needed', unknown: 'not recorded' };

// A gate's verdict with its reason one press away. The reason used to be the cell's title.
const verdictChip = (g, what) => {
  if (!g?.verdict) return '';
  const v = gateVerdict(g.verdict);
  return g.reason
    ? explainButton(esc(v.short), g.reason, { cls: `chip chip-${v.state}`, head: `${what.charAt(0).toUpperCase()}${what.slice(1)} within the H2C limit: ${v.word}` })
    : chip(v.state, v.short);
};
