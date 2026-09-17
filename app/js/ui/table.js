// Table lens. Hand-built rather than a grid library: at 102 rows the virtues of a data grid do not
// apply, and every cell needs custom rendering anyway for the provenance typography and the
// four-state chips. Sorting, selection and export are a hundred lines here.
//
// Two column sets, because two different questions are asked of the same list. "Properties" answers
// which material is right; "Printing" answers whether the machine can run it and what to set. The
// second used to be unreachable: nozzle and bed temperatures sat one tab deep in the drawer, and
// the 104 purchase links in the data were rendered nowhere at all.

import { renderValue, chip, esc, fmtNumber, fmtRange, wireEvidence, explainButton, scrollTable, markTableOverflow } from './format.js';
import { prop, materialName, describeConstraint, screenedByKind, screenedChip, CHAMBER_GUIDANCE, POLICY_CONTROL, POLICY_LABELS, policyLabel } from './labels.js';
import { exportHeadlines, tableHeadlines } from './registry.js';

/** Materials a printer owner already has a feel for, offered as the comparison anchor. */
const BASELINE_NAMES = ['PLA', 'PETG', 'ABS', 'ASA', 'PC'];

const P = (key, over = {}) => ({ key, kind: 'headline', label: prop(key).short, unit: prop(key).unit, title: `${prop(key).technical} — ${prop(key).hint}`, ...over });

export const COLUMN_SETS = {
  properties: {
    label: 'Properties',
    help: 'What the material is like',
    // Headline columns come from the registry (headline_definitions.csv, Table column). Up to five
    // measured columns keep their 11%; more share the same width. A percentage is the width a column takes where the
    // table has room; the stylesheet gives each kind of column a minimum, below which the table scrolls sideways.
    get columns() {
      const heads = tableHeadlines();
      const measured = heads.filter((h) => h.kind === 'measurement');
      const width = measured.length <= 5 ? '11%' : `${Math.floor((55 / measured.length) * 10) / 10}%`;
      return [
        { key: 'name', label: 'Material', kind: 'name', width: '20%' },
        { key: 'verdict', label: 'Result', kind: 'state', width: '11%' },
        ...heads.map((h) => (h.kind === 'price'
          ? { key: h.key, label: prop(h.key).short, unit: prop(h.key).unit, kind: 'price', width: '12%' }
          : P(h.key, { width }))),
        { key: 'pin', label: 'Shortlist', kind: 'pin', width: '72px' },
      ];
    },
  },
  printing: {
    label: 'Printing',
    help: 'What your machine needs to do',
    columns: [
      { key: 'name', label: 'Material', kind: 'name', width: '22%' },
      { key: 'verdict', label: 'Result', kind: 'state', width: '11%' },
      { key: 'nozzleC', label: 'Nozzle', unit: '°C', kind: 'print', width: '12%' },
      { key: 'bedC', label: 'Bed', unit: '°C', kind: 'print', width: '12%' },
      { key: 'chamberC', label: 'Chamber', unit: '°C', kind: 'print', width: '12%' },
      { key: 'needs', label: 'Also needs', kind: 'needs', width: '19%' },
      { key: 'priceCADkg', label: 'Price', unit: 'CAD/kg', kind: 'price', width: '12%' },
      { key: 'pin', label: 'Shortlist', kind: 'pin', width: '72px' },
    ],
  },
};

/**
 * The sort after switching column sets: kept when the new set shows the sorted column (name, result, price, or a
 * property both sets carry), else by name. It used to reset to name for anything but name, result or price.
 */
export function sortForColumnSet(sort, columnSet) {
  const columns = (COLUMN_SETS[columnSet] ?? COLUMN_SETS.properties).columns;
  return columns.some((c) => c.key === sort.key && c.kind !== 'pin') ? sort : { key: 'name', dir: 'asc' };
}

/** What the reader is told when a column switch had to drop the sort: which column went, and what the order is now. */
export function sortNoticeText(notice) {
  if (!notice) return '';
  const from = COLUMN_SETS[notice.from] ?? COLUMN_SETS.properties;
  const to = COLUMN_SETS[notice.to] ?? COLUMN_SETS.properties;
  const label = from.columns.find((c) => c.key === notice.key)?.label ?? notice.key;
  return `Now sorted by material name: ${label} is not a column in ${to.label}.`;
}

const STATE_ORDER = { PASS: 0, INDETERMINATE: 1, UNKNOWN: 2, FAIL: 3 };

/**
 * What a row sorts by in a column, and whether that is an estimate. With estimates shown, a row whose cell shows an
 * estimate sorts by it, the headline's estimated centre, where it had always sunk below every measured row: sorted by
 * stiffness, the list put OBC's ~0.009–0.20 GPa after the stiffest carbon-fibre grades. An estimated print window sorts by
 * its top, as a published window does. With estimates hidden nothing estimated counts, as before.
 */
export function sortValue(row, col, showEstimates = false) {
  const m = row.material;
  if (col.kind === 'headline' || col.kind === 'price') {
    const h = m.headline[col.key];
    if (h?.known) return { value: h.value, estimated: false };
    const e = showEstimates ? h?.estimate : null;
    const centre = !e ? null : Number.isFinite(e.centre) ? e.centre
      : Number.isFinite(e.lo) && Number.isFinite(e.hi) ? (e.lo + e.hi) / 2 : null;
    return { value: centre, estimated: centre !== null };
  }
  if (col.kind === 'print') {
    const published = m.print?.[col.key]?.max;
    if (Number.isFinite(published)) return { value: published, estimated: false };
    // The same estimates the cells show: a nozzle or bed window, or a chamber band where no chamber window is published.
    const est = !showEstimates ? null
      : col.key === 'nozzleC' ? m.print?.nozzleEstimate : col.key === 'bedC' ? m.print?.bedEstimate
      : col.key === 'chamberC' ? m.print?.chamberEstimate : null;
    return Number.isFinite(est?.hi) ? { value: est.hi, estimated: true } : { value: null, estimated: false };
  }
  if (col.kind === 'needs') {
    return { value: (m.gates.abrasive === 'requires-hardened' ? 2 : 0) + (m.gates.drying === 'required' ? 1 : 0), estimated: false };
  }
  if (col.kind === 'state') return { value: STATE_ORDER[row.evaluation.verdict] ?? 9, estimated: false };
  return { value: m[col.key] ?? '', estimated: false };
}

/**
 * The rows in the order the table shows them, so an export matches what was on screen. Missing values sort last in both
 * directions rather than reading as zero; a measured value comes before an estimate of the same value in both, because
 * the measurement is the firmer answer.
 */
export function sortRows(rows, state) {
  const { sort } = state;
  const COLUMNS = COLUMN_SETS[state.columnSet]?.columns ?? COLUMN_SETS.properties.columns;
  const col = COLUMNS.find((c) => c.key === sort.key) ?? COLUMNS[0];
  const showEstimates = !!state.ctx?.showEstimates;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, col, showEstimates), bv = sortValue(b, col, showEstimates);
    if (av.value === null && bv.value === null) return 0;
    if (av.value === null) return 1;
    if (bv.value === null) return -1;
    const d = typeof av.value === 'string' ? av.value.localeCompare(bv.value) : av.value - bv.value;
    if (d === 0) return av.estimated === bv.estimated ? 0 : av.estimated ? 1 : -1;
    return sort.dir === 'desc' ? -d : d;
  });
}

/**
 * The class a column's heading and cells carry, which is what the stylesheet sizes by: a minimum width per kind of
 * column (a number, a result, a name) rather than a share of whatever width the screen has.
 */
const columnClass = (c) => (c.kind === 'headline' || c.kind === 'price' || c.kind === 'print' ? 'num'
  : c.kind === 'name' ? 'name' : c.kind === 'state' ? 'state' : c.kind === 'needs' ? 'needs' : '');

/** Display form of a print window. A zero lower bound is how the build records "ambient". */
export const printRange = (r) => (!r ? null
  : r.min === r.max ? fmtNumber(r.max)
  : r.min === 0 ? `up to ${fmtNumber(r.max)}`
  : `${fmtNumber(r.min)}\u2013${fmtNumber(r.max)}`);

export function renderTable(host, state, actions) {
  const { rows, sort, scenario } = state;
  const setKey = COLUMN_SETS[state.columnSet] ? state.columnSet : 'properties';
  const COLUMNS = COLUMN_SETS[setKey].columns;
  // Nothing has been asked, so nothing has passed. A green PASS on every row of a blank screen
  // asserted a test that never ran, including on the materials outside the printer's scope.
  const tested = scenario.constraints.length > 0;

  const sorted = sortRows(rows, state);

  const head = COLUMNS.map((c) => {
    // The shortlist column has nothing meaningful to sort by, so it does not pretend to.
    if (c.kind === 'pin') return `<th class="pin-col">${esc(c.label)}</th>`;
    const active = sort.key === c.key;
    const arrow = active ? (sort.dir === 'asc' ? ' \u25b2' : ' \u25bc') : '';
    return `<th data-sort="${c.key}" class="${columnClass(c)}" ${c.title ? `title="${esc(c.title)}"` : ''}
      ${active ? 'aria-sort="' + sort.dir + 'ending"' : ''} tabindex="0">
      ${esc(c.label)}${c.unit ? ` <span class="u">${esc(c.unit)}</span>` : ''}${arrow}</th>`;
  }).join('');

  const cells = (m, e, { ghost = false } = {}) => {
    // This row's results on one property: the thresholds its number must not be rounded across, and whether it is close.
    const on = (key) => (e?.results ?? []).filter((r) => r.constraint?.kind === 'numeric' && r.constraint.property === key);
    return COLUMNS.map((c) => {
      if (c.kind === 'name') {
        // Family sits under the name rather than in its own column: it repeated the name outright
        // on 34 of 96 rows and cost 13% of the width to do it.
        //
        // "TPC / TPEE" and "PEI / ULTEM" are one material under two names, and reading as two was
        // the whole confusion. The second name moves to the subtitle line.
        const { primary, aka } = materialName(m.name);
        const asm = m.assumptionDependent ? ` ${explainButton('assumed', 'Depends on a scenario assumption: a value you supplied stands in for a missing one, and it is not observed data.',
          { cls: 'chip chip-UNKNOWN', head: 'Scenario assumption' })}` : '';
        const sub = [aka ? `also called ${aka}` : null,
          m.family && !m.name.startsWith(m.family) ? m.family : null].filter(Boolean).join(' · ');
        return `<td class="name">${esc(primary)}${asm}${sub ? `<span class="row-sub">${esc(sub)}</span>` : ''}</td>`;
      }
      if (c.kind === 'text') return `<td>${esc(m[c.key] ?? '')}</td>`;
      if (c.kind === 'state') {
        // The screened chip names the requirement and what held the row out, an estimate or the base polymer's published
        // behaviour (D64), and opens it: the estimate on the Overview, the polymer's rows on the Environment tab.
        const scr = e?.screened ? screenedChip(e) : null;
        return ghost
          ? `<td class="state">${explainButton('baseline', 'Reference only. Not a candidate and not counted.', { cls: 'chip chip-neutral', head: 'Reference row' })}</td>`
          : tested ? `<td class="state">${chip(e.verdict)}${scr ? ` ${explainButton('screened', scr.text, { cls: 'chip chip-screened', head: scr.head, action: scr.action, id: m.id })}` : ''}</td>`
          : `<td class="state"><span class="chip chip-neutral" title="No requirement is set, so nothing has been tested">not tested</span></td>`;
      }
      if (c.kind === 'pin') {
        if (ghost) return `<td class="pin-col"></td>`;
        // A toggle keeps one name, and says whether it is on by aria-pressed and a filled, highlighted star.
        const pinned = scenario.shortlist.includes(m.id);
        return `<td class="pin-col"><button type="button" class="btn btn-sm shortlist-btn" data-pin="${esc(m.id)}" aria-pressed="${pinned}"
          title="${pinned ? 'On the shortlist. Press to remove it.' : 'Add to the shortlist'}" aria-label="Shortlist ${esc(m.name)}">${pinned ? '★' : '☆'}</button></td>`;
      }
      if (c.kind === 'print') {
        const r = m.print?.[c.key];
        // The chamber is often answered in words: "not required", "recommended", or a data sheet's
        // "-". Those are evidence and are shown as words, never as a number. An estimated band, where
        // one exists, is marked the way every other estimate is and only while estimates are on.
        if (!r && c.key === 'chamberC' && (m.print?.chamberGuidance || m.print?.chamberEstimate)) {
          const g = m.print.chamberGuidance && CHAMBER_GUIDANCE[m.print.chamberGuidance.state];
          const e = state.ctx?.showEstimates ? m.print.chamberEstimate : null;
          const word = g ? explainButton(esc(g.word), g.title, { cls: 'missing', head: 'Chamber, in words' }) : '';
          const band = e ? explainButton(`~${fmtRange(e.lo, e.hi)}<span class="est-mark">\u2020</span>`,
            `Estimated, not published: ${e.basis}. Not a print setting, and it changes no result.`,
            { cls: 'est', head: 'Estimated chamber band', action: 'estimate', id: m.id }) : '';
          if (word || band) return `<td class="num">${word}${word && band ? '<br>' : ''}${band}</td>`;
        }
        const windowEst = !r && state.ctx?.showEstimates && (c.key === 'nozzleC' ? m.print?.nozzleEstimate : c.key === 'bedC' ? m.print?.bedEstimate : null);
        if (windowEst) {
          return `<td class="num">${explainButton(`~${fmtRange(windowEst.lo, windowEst.hi)}<span class="est-mark">\u2020</span>`,
            `Estimated, not published: ${windowEst.basis}. A starting point to verify; it changes no result.`,
            { cls: 'est', head: `Estimated ${c.label.toLowerCase()} window`, action: 'estimate', id: m.id })}</td>`;
        }
        if (!r) {
          return `<td class="num">${explainButton('\u2014', `No ${c.label.toLowerCase()} temperature published for this material`,
            { cls: 'missing dash', head: 'Not published', label: 'Not published' })}</td>`;
        }
        // A range across every recorded profile, not one setting to dial in. The drawer's Printing
        // tab has each profile on its own.
        const t = r.profiles > 1 ? `Range across ${r.profiles} recorded profiles, not one recipe. The material's Printing tab has each.` : 'From one recorded profile. The material\'s Printing tab has it.';
        return `<td class="num">${explainButton(printRange(r), t, { cls: 'print-window', head: `${c.label} temperature`, action: 'printing', id: m.id })}</td>`;
      }
      if (c.kind === 'needs') {
        const bits = [];
        if (m.gates.abrasive === 'requires-hardened') {
          bits.push(explainButton('hardened nozzle', 'Carbon or glass filled. A brass nozzle will wear out.', { cls: 'need', head: 'Hardened nozzle', action: 'printing', id: m.id }));
        }
        if (m.gates.drying === 'required') {
          bits.push(explainButton('drying guidance', 'A source gives a drying schedule. The Printing tab has its wording, and whether it is a requirement or a recommendation.',
            { cls: 'need', head: 'Drying guidance', action: 'printing', id: m.id }));
        }
        if (!bits.length) {
          return `<td class="needs">${explainButton('none recorded', 'No source in the snapshot states a hardened-nozzle or drying requirement. That is not the same as needing nothing.',
            { cls: 'missing', head: 'Nothing recorded' })}</td>`;
        }
        return `<td class="needs">${bits.join(' ')}</td>`;
      }
      if (c.kind === 'price') {
        const h = m.headline.priceCADkg;
        const inner = renderValue(h, { compact: true, estimates: state.ctx?.showEstimates, results: on('priceCADkg'), materialId: m.id });
        if (!m.buy) return `<td class="num">${inner}</td>`;
        const t = `${m.buy.retailer}: ${m.buy.variant ?? ''} (${m.buy.stock}, seen ${m.buy.accessDate})`;
        const notStocked = 'No sampled offer was in stock on the snapshot date. Prices and stock were sampled once; they are not live.';
        const link = (content, cls = '') => `<a class="buy${cls}" href="${esc(m.buy.url)}" target="_blank" rel="noopener"
          title="${esc(t)}">${content}<span class="buy-mark" aria-label="opens the retailer page">\u2197</span></a>`;
        // A listing with no usable price says so in words, on one line: "listed, no price" and "out of stock" wrapped to
        // three lines in a desktop column and doubled the row. Who lists it, when, and whether it was in stock are one
        // press away on the words; the arrow beside them opens the listing. A dash with a link arrow had read as nothing
        // to buy.
        if (!h?.known) {
          const why = `${m.buy.retailer} lists it (seen ${m.buy.accessDate}), but the listing has no usable Canadian price.`
            + `${m.buy.anyInStock ? '' : ` ${notStocked}`} The arrow opens the listing.`;
          return `<td class="num"><span class="unpriced">${explainButton('no price', why, { cls: 'no-price', head: 'Listed, no price' })}${link('', ' buy-arrow')}</span></td>`;
        }
        // A link cannot hold a button, so a price carrying a mark of its own keeps it outside the link. Stock is a small
        // second line, and only here, under a price it qualifies.
        const nested = inner.includes('<button');
        const oos = m.buy.anyInStock ? '' : explainButton('out of stock', notStocked, { cls: 'oos', head: 'Out of stock' });
        return `<td class="num">${nested ? inner : ''}${nested ? link('', ' buy-arrow') : link(inner)}${oos}</td>`;
      }
      return `<td class="num">${renderValue(m.headline[c.key], { compact: true, estimates: state.ctx?.showEstimates, results: on(c.key), materialId: m.id })}</td>`;
    }).join('');
  };

  const body = sorted.map(({ material: m, evaluation: e }) =>
    `<tr data-material="${esc(m.id)}" data-selected="${state.selectedMaterialId === m.id}" tabindex="0">${cells(m, e)}</tr>`
  ).join('');

  // The familiar anchor. 4.43 GPa is not a number anyone has a feel for; "about half again as stiff
  // as PLA" is. The baseline sits at the top of its own column values, in every column, and is
  // never a candidate: it has no verdict, no star, and does not count towards anything.
  const baseline = state.baseline ? state.db.materials.find((m) => m.id === state.baseline) : null;
  const baselineRow = baseline
    ? `<tr class="baseline-row" data-material="${esc(baseline.id)}" tabindex="0"
        title="Reference only. Not a candidate and not counted.">${cells(baseline, null, { ghost: true })}</tr>`
    : '';

  // One line of marks above the table, always the same entries in the same order, each a button that opens its
  // definition. It used to be a paragraph whose entries came and went with the rows, told the reader to hover, and had no
  // entry for the estimated windows the Printing columns show. The estimate entry shows whenever estimates do, in both
  // column sets.
  const likely = Math.round((state.db.meta.estimateModel?.levels?.likely ?? 0.8) * 100);
  const legend = [
    explainButton('<span class="dash">\u2014</span> not published',
      'Not published in the sampled sources. Not zero, and not a low value. Select a dash in the table for which kind of absence it is.',
      { cls: 'lg', head: 'Not published' }),
    explainButton('<span class="related-mark">*</span> measured, not the headline',
      'A real measurement of this material that was never made the headline, for example because its source states no direction or measures another endpoint. It is not used by any filter. Select a starred value for the measurement and the reason.',
      { cls: 'lg', head: 'Measured, but not the headline' }),
    state.ctx?.showEstimates ? explainButton('<span class="lg-est">~a\u2013b<span class="est-mark">\u2020</span></span> estimate, <i>italic</i> = rough',
      `An estimate, not a measurement: the likely (${likely}%) range of a calibrated model built from the material's own related measurements and its polymer family. It never passes a requirement, and with Use estimates on it can screen a material out. In italic, its precision is poor: an order of magnitude only. A nozzle, bed or chamber window marked this way is an estimated starting point and changes no result. Select an estimate for what it rests on.`,
      { cls: 'lg', head: 'Estimate, not a measurement' }) : '',
    explainButton('<span class="load-mark">?</span> heat load not stated',
      'The source states the heat test standard but not the load, so the value never passes a heat requirement outright. With estimates on, a requirement far above it screens the material out.',
      { cls: 'lg', head: 'Heat test load not stated' }),
    explainButton('<span class="load-mark">\u2248</span> close to the limit',
      'A published mean with a spread, where a requirement\'s threshold lies inside the spread. The result is judged on the mean. Select the mark for the published spread.',
      { cls: 'lg', head: 'Close to the limit' }),
    explainButton('<span class="na">n/a</span> not applicable',
      'The property does not apply to this material, such as heat deflection of an elastomer. Not a gap in the data.',
      { cls: 'lg', head: 'Not applicable' }),
  ].filter(Boolean).join('');

  // Hits the filters removed. A search that finds nothing because the requirements already
  // excluded the match reads as "this material is not in the database", which is false.
  const excluded = state.searchExcluded ?? [];
  const hiddenOnly = excluded.filter(({ evaluation: e }) => !e.failed.length && !e.heldBy.length && !e.screened).length;
  // Three cases, each with its reason. When some were ruled out and the rest merely hidden, the heading used to end
  // at "not in the results" and give no reason at all.
  const ruledOut = excluded.length - hiddenOnly;
  const excludedReason = hiddenOnly === excluded.length
    ? ', because the result filters at the bottom hide them'
    : !hiddenOnly ? `: ${excluded.length === 1 ? 'it does' : 'they do'} not meet your requirements`
    : `: ${ruledOut} ${ruledOut === 1 ? 'is' : 'are'} ruled out by your requirements, and the result filters at the bottom hide the other ${hiddenOnly}`;
  const excludedBlock = excluded.length ? `
    <div class="excluded-group">
      <h3>${excluded.length} more match${excluded.length === 1 ? 'es' : ''} "${esc(state.search)}"
        but ${excluded.length === 1 ? 'is' : 'are'} not in the results${excludedReason}</h3>
      ${scrollTable(`<table class="grid">
        <colgroup><col style="width:26%"><col style="width:14%"><col><col style="width:80px"></colgroup>
        <thead><tr><th class="name">Material</th><th class="state">Result</th><th class="why-col">What ruled it out</th><th class="pin-col">Shortlist</th></tr></thead>
        <tbody>${excluded.map(({ material: m, evaluation: e }) => {
          const { primary, aka } = materialName(m.name);
          const why = e.failed.length
            ? e.failed.map((r) => `${esc(describeConstraint(r.constraint))} — ${esc(r.reason)}`).join('<br>')
            : e.screened
              ? e.unresolved.filter((r) => r.screened).map((r) => `${esc(describeConstraint(r.constraint))} — ${esc(r.reason)}`).join('<br>')
                + '<br>Not a failure. The SCREENED chip at the bottom of the screen shows these.'
            : e.heldBy.length
              ? `Could not be checked against ${esc(e.unresolved.map((r) => describeConstraint(r.constraint)).join(', '))}.`
                + ` Not a failure: it is left out because ${POLICY_CONTROL} is set to "${POLICY_LABELS.strict}".`
              : 'Hidden by the result filters at the bottom of the screen.';
          return `<tr data-material="${esc(m.id)}" tabindex="0">
            <td class="name">${esc(primary)}${aka ? `<span class="row-sub">also called ${esc(aka)}</span>` : ''}</td>
            <td class="state">${chip(e.verdict)}</td>
            <td class="why-cell">${why}</td>
            <td class="pin-col"><button type="button" class="btn btn-sm shortlist-btn" data-pin="${esc(m.id)}" aria-label="Shortlist ${esc(m.name)}"
              title="${scenario.shortlist.includes(m.id) ? 'On the shortlist. Press to remove it.' : 'Add to the shortlist'}"
              aria-pressed="${scenario.shortlist.includes(m.id)}">${scenario.shortlist.includes(m.id) ? '★' : '☆'}</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table>`)}
    </div>` : '';

  // A family's name in the search: say what it is and name its members, which the table then lists.
  const families = state.searchFamilies ?? [];
  // The family's own name opens its entry, which says what it is and why it has no tabs of its own.
  const familyBlock = families.length ? `<div class="family-note">${families.map((f) => `<p><button class="link-btn family-name" data-open-member="${esc(f.id)}" title="Opens what ${esc(f.name)} is in this database"><b>${esc(f.name)}</b></button>
      ${f.familyEntry.kind === 'alias' ? 'is another name for' : 'is a family in this database, not one material. Its members are'}
      ${f.familyEntry.members.map((x) => `<button class="link-btn" data-open-member="${esc(x.id)}">${esc(x.name)}</button>`).join(', ')}.
      <span class="fine">${esc(f.familyEntry.why)}</span></p>`).join('')}</div>` : '';

  // Baseline picker: the anchor is offered, never imposed.
  const anchors = BASELINE_NAMES
    .map((n) => state.db.materials.find((m) => m.name === n))
    .filter(Boolean);

  host.innerHTML = `
    <div class="table-bar">
      <div class="colset-pick">
        <div class="segmented" role="group" aria-label="Which columns to show" aria-describedby="colset-help">
          ${Object.entries(COLUMN_SETS).map(([k, v]) => `<button data-colset="${k}" aria-pressed="${k === setKey}"
            title="${esc(v.help)}">${esc(v.label)}</button>`).join('')}
        </div>
        <span class="colset-help" id="colset-help">${esc(COLUMN_SETS[setKey].help)}</span>
      </div>
      <label class="baseline-pick" title="Adds a reference row so every number has something familiar beside it.">
        Compare against
        <select data-baseline>
          <option value="">no reference</option>
          ${anchors.map((m) => `<option value="${esc(m.id)}" ${state.baseline === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
        </select>
      </label>
      <div class="legend-row" role="group" aria-label="What the marks in the table mean">${legend}</div>
      ${state.sortNotice ? `<p class="sort-note" role="status">${esc(sortNoticeText(state.sortNotice))}</p>` : ''}
    </div>
    ${familyBlock}
    ${sorted.length ? scrollTable(`<table class="grid">
      <colgroup>${COLUMNS.map((c) => `<col style="width:${c.width}">`).join('')}</colgroup>
      <thead><tr>${head}</tr></thead><tbody>${baselineRow}${body}</tbody></table>`)
      : `<p class="empty-line">Nothing matching "${esc(state.search)}" meets your requirements.</p>`}
    ${excludedBlock}`;

  markTableOverflow(host);
  host.querySelectorAll('[data-colset]').forEach((b) => b.addEventListener('click', () => actions.setColumns(b.dataset.colset)));
  host.querySelector('[data-baseline]')?.addEventListener('change', (e) => actions.setBaseline(e.target.value));

  host.querySelectorAll('th[data-sort]').forEach((th) => {
    const go = () => actions.sort(th.dataset.sort);
    th.addEventListener('click', go);
    th.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
  });
  host.querySelectorAll('[data-pin]').forEach((b) => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    actions.togglePin(b.dataset.pin);
  }));
  wireEvidence(host, actions);
  host.querySelectorAll('[data-open-member]').forEach((b) => b.addEventListener('click', () => actions.openMaterial(b.dataset.openMember)));
  host.querySelectorAll('tr[data-material]').forEach((tr) => {
    const open = () => actions.openMaterial(tr.dataset.material);
    tr.addEventListener('click', (ev) => { if (!ev.target.closest('a, button')) open(); });
    // Only the row itself. Enter on the star or the buy link inside it used to bubble up here and
    // open the drawer as well as doing its own job. The key is consumed: the drawer takes focus on its close button while
    // this keydown runs, and the same Enter's keypress then pressed that button, so the drawer shut as it opened.
    tr.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target === tr) { ev.preventDefault(); open(); } });
  });
}

/**
 * Client-side export. No server, and the four states survive into the file.
 *
 * The file has to explain itself to someone who never saw the screen: which question was asked,
 * under which missing-data rule, and for each row why it failed or could not be checked. The first
 * version exported only the unresolved criteria, so every genuine failure had an empty reason.
 */
export function toCSV(rows, meta, { scenario, useEstimates = false } = {}) {
  const cols = ['MaterialID', 'Material', 'Family', 'H2C status', 'State', 'In results',
    'Failed', 'Could not be checked',
    ...exportHeadlines().map((h) => h.header),
    'Value qualifiers', 'Measurement IDs',
    'Nozzle C', 'Bed C', 'Chamber C', 'Hardened nozzle', 'Drying guidance', 'Where to buy',
    ...(useEstimates ? ['Estimated fields', 'Screened by estimate', 'Screened by base polymer'] : [])];
  const q = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const KEYS = exportHeadlines().map((h) => h.key);
  // An exported number is always a measurement or an observed price. An estimated bound travels in
  // its own column so a spreadsheet can never mistake inference for evidence, and a scenario
  // assumption is named rather than exported as if it were measured.
  const val = (m, k) => {
    const h = m.headline[k];
    if (h?.assumption) return '';
    return h?.known ? h.value : h?.missing ?? '';
  };
  const qualifiers = (m) => KEYS.flatMap((k) => {
    const h = m.headline[k];
    if (!h?.known) return [];
    const out = [];
    if (h.assumption) out.push(`${k}: scenario assumption ${h.value}`);
    const i = h.interval;
    if (i && i.kind !== 'point') {
      out.push(`${k}: ${i.lo ?? 'unbounded'} to ${i.hi ?? 'unbounded'}${h.uncertainty ? ` (± ${h.uncertainty})` : ''}`);
    }
    if (h.loadStated === false) out.push(`${k}: test load not stated`);
    return out;
  }).join(' | ');
  const ids = (m) => KEYS.map((k) => m.headline[k]?.measurementId).filter(Boolean).join(' ');
  const estimated = (m) => [...Object.entries(m.headline)
    .filter(([, h]) => h && !h.known && (h.estimate || h.notApplicable))
    .map(([k, h]) => (h.notApplicable ? `${k} not applicable`
      : `${k} ~${h.estimate.lo}-${h.estimate.hi} ${h.estimate.unit} likely, ${h.estimate.plausible.lo}-${h.estimate.plausible.hi} plausible (${h.estimate.strength}; precision ${h.estimate.precision}; ${h.estimate.canScreen ? 'can screen' : 'context only'})`)),
    ...(m.print?.nozzleEstimate ? [`nozzle ~${m.print.nozzleEstimate.lo}-${m.print.nozzleEstimate.hi} C (${m.print.nozzleEstimate.basis}; decides nothing)`] : []),
    ...(m.print?.bedEstimate ? [`bed ~${m.print.bedEstimate.lo}-${m.print.bedEstimate.hi} C (${m.print.bedEstimate.basis}; decides nothing)`] : []),
    ...(m.print?.chamberEstimate ? [`chamber ~${m.print.chamberEstimate.lo}-${m.print.chamberEstimate.hi} C (research band: ${m.print.chamberEstimate.basis}; decides nothing)`] : []),
  ].join(' | ');
  const why = (list) => list.map((r) => `${describeConstraint(r.constraint)}: ${r.reason}`).join(' | ');
  const range = (r) => (r ? `${r.min}-${r.max}` : '');

  const header = [
    '# H2C Material Selector export',
    `# database snapshot ${meta.snapshot}, application build ${meta.build}`,
  ];
  if (scenario) {
    header.push(`# ${POLICY_CONTROL.toLowerCase()}: ${policyLabel(scenario.unknownPolicy).toLowerCase()}; estimates and polymer data ${useEstimates ? 'on (never pass; may screen out)' : 'off'}`);
    if (scenario.template) header.push(`# template: ${scenario.template}`);
    if (!scenario.constraints.length) header.push('# no requirements set: nothing was tested');
    for (const c of scenario.constraints) header.push(`# ${c.mandatory === false ? 'tracked' : 'required'}: ${describeConstraint(c)}`);
    for (const a of scenario.assumptions ?? []) header.push(`# assumption: ${a.materialId} ${a.property} = ${a.value} ${a.unit ?? ''}`.trim());
  }
  const tested = !scenario || scenario.constraints.length > 0;

  const lines = [
    ...header,
    cols.join(','),
    ...rows.map(({ material: m, evaluation: e }) => [
      m.id, m.name, m.family, m.h2cStatus, tested ? e.verdict : 'NOT TESTED', e.eligible ? 'yes' : 'no',
      why(e.failed), why(e.unresolved),
      ...KEYS.map((k) => val(m, k)),
      qualifiers(m), ids(m),
      range(m.print?.nozzleC), range(m.print?.bedC), range(m.print?.chamberC) || (m.print?.chamberGuidance ? CHAMBER_GUIDANCE[m.print.chamberGuidance.state]?.word ?? '' : ''),
      m.gates.abrasive === 'requires-hardened' ? 'required' : m.gates.abrasive === 'no-special-concern' ? 'not needed' : 'not recorded',
      m.gates.drying === 'required' ? 'published' : 'not recorded',
      m.buy?.url ?? '',
      // A screen by an estimate and one by the base polymer's published behaviour travel in their own columns (D64).
      ...(useEstimates ? [estimated(m), e.screened ? screenedByKind(e).estimate.join('; ') : '', e.screened ? screenedByKind(e).polymer.join('; ') : ''] : []),
    ].map(q).join(',')),
  ];
  return lines.join('\n');
}

export function download(filename, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
