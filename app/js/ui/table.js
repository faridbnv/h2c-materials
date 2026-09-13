// Table lens. Hand-built rather than a grid library: at 102 rows the virtues of a data grid do not
// apply, and every cell needs custom rendering anyway for the provenance typography and the
// four-state chips. Sorting, selection and export are a hundred lines here.
//
// Two column sets, because two different questions are asked of the same list. "Properties" answers
// which material is right; "Printing" answers whether the machine can run it and what to set. The
// second used to be unreachable: nozzle and bed temperatures sat one tab deep in the drawer, and
// the 104 purchase links in the data were rendered nowhere at all.

import { renderValue, chip, esc, fmtNumber, wireEvidence } from './format.js';
import { prop, materialName, describeConstraint, CHAMBER_GUIDANCE } from './labels.js';

/** Materials a printer owner already has a feel for, offered as the comparison anchor. */
const BASELINE_NAMES = ['PLA', 'PETG', 'ABS', 'ASA', 'PC'];

const P = (key, over = {}) => ({ key, kind: 'headline', label: prop(key).short, unit: prop(key).unit, title: `${prop(key).technical} — ${prop(key).hint}`, ...over });

export const COLUMN_SETS = {
  properties: {
    label: 'Properties',
    help: 'What the material is like',
    columns: [
      { key: 'name', label: 'Material', kind: 'name', width: '20%' },
      { key: 'verdict', label: 'Result', kind: 'state', width: '11%' },
      P('density', { width: '11%' }),
      P('tensileModulusXY', { width: '11%' }),
      P('tensileStrengthXY', { width: '11%' }),
      P('elongationXY', { width: '11%' }),
      P('hdt045', { width: '11%' }),
      { key: 'priceCADkg', label: 'Price', unit: 'CAD/kg', kind: 'price', width: '12%' },
      { key: 'pin', label: 'Shortlist', kind: 'pin', width: '72px' },
    ],
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

const STATE_ORDER = { PASS: 0, INDETERMINATE: 1, UNKNOWN: 2, FAIL: 3 };

function cellValue(row, col) {
  if (col.kind === 'headline' || col.kind === 'price') {
    const h = row.material.headline[col.key];
    return h?.known ? h.value : null;
  }
  if (col.kind === 'print') return row.material.print?.[col.key]?.max ?? null;
  if (col.kind === 'needs') return (row.material.gates.abrasive === 'requires-hardened' ? 2 : 0)
    + (row.material.gates.drying === 'required' ? 1 : 0);
  if (col.kind === 'state') return STATE_ORDER[row.evaluation.verdict] ?? 9;
  return row.material[col.key] ?? '';
}

/** The rows in the order the table shows them, so an export matches what was on screen. */
export function sortRows(rows, state) {
  const { sort } = state;
  const COLUMNS = COLUMN_SETS[state.columnSet]?.columns ?? COLUMN_SETS.properties.columns;
  const col = COLUMNS.find((c) => c.key === sort.key) ?? COLUMNS[0];
  return [...rows].sort((a, b) => {
    const av = cellValue(a, col), bv = cellValue(b, col);
    // Missing values sort last in both directions rather than reading as zero.
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    const d = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return sort.dir === 'desc' ? -d : d;
  });
}

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
    if (c.kind === 'pin') return `<th>${esc(c.label)}</th>`;
    const active = sort.key === c.key;
    const arrow = active ? (sort.dir === 'asc' ? ' \u25b2' : ' \u25bc') : '';
    const num = c.kind === 'headline' || c.kind === 'price' || c.kind === 'print';
    return `<th data-sort="${c.key}" class="${num ? 'num' : ''}" ${c.title ? `title="${esc(c.title)}"` : ''}
      ${active ? 'aria-sort="' + sort.dir + 'ending"' : ''} tabindex="0">
      ${esc(c.label)}${c.unit ? ` <span class="u">${esc(c.unit)}</span>` : ''}${arrow}</th>`;
  }).join('');

  const cells = (m, e, { ghost = false } = {}) => COLUMNS.map((c) => {
      if (c.kind === 'name') {
        // Family sits under the name rather than in its own column: it repeated the name outright
        // on 34 of 96 rows and cost 13% of the width to do it.
        //
        // "TPC / TPEE" and "PEI / ULTEM" are one material under two names, and reading as two was
        // the whole confusion. The second name moves to the subtitle line.
        const { primary, aka } = materialName(m.name);
        const asm = m.assumptionDependent ? ' <span class="chip chip-UNKNOWN" title="Depends on a scenario assumption">assumed</span>' : '';
        const sub = [aka ? `also called ${aka}` : null,
          m.family && !m.name.startsWith(m.family) ? m.family : null].filter(Boolean).join(' · ');
        return `<td class="name">${esc(primary)}${asm}${sub ? `<span class="row-sub">${esc(sub)}</span>` : ''}</td>`;
      }
      if (c.kind === 'text') return `<td>${esc(m[c.key] ?? '')}</td>`;
      if (c.kind === 'state') {
        return ghost
          ? `<td><span class="chip chip-neutral">baseline</span></td>`
          : tested ? `<td>${chip(e.verdict)}</td>`
          : `<td><span class="chip chip-neutral" title="No requirement is set, so nothing has been tested">not tested</span></td>`;
      }
      if (c.kind === 'pin') {
        if (ghost) return `<td></td>`;
        const pinned = scenario.shortlist.includes(m.id);
        return `<td><button class="btn btn-sm" data-pin="${esc(m.id)}" aria-pressed="${pinned}"
          title="${pinned ? 'Remove from shortlist' : 'Add to shortlist'}" aria-label="${pinned ? 'Remove' : 'Add'} ${esc(m.name)} ${pinned ? 'from' : 'to'} the shortlist">${pinned ? '★' : '☆'}</button></td>`;
      }
      if (c.kind === 'print') {
        const r = m.print?.[c.key];
        // The chamber is often answered in words: "not required", "recommended", or a data sheet's
        // "-". Those are evidence and are shown as words, never as a number. An estimated band, where
        // one exists, is marked the way every other estimate is and only while estimates are on.
        if (!r && c.key === 'chamberC' && (m.print?.chamberGuidance || m.print?.chamberEstimate)) {
          const g = m.print.chamberGuidance && CHAMBER_GUIDANCE[m.print.chamberGuidance.state];
          const e = state.ctx?.useEstimates ? m.print.chamberEstimate : null;
          const word = g ? `<span class="missing" title="${esc(g.title)}">${esc(g.word)}</span>` : '';
          const band = e ? `<span class="est" title="${esc(`Estimated, not published: ${e.basis}. Not a print setting, and it changes no result.`)}">~${fmtNumber(e.lo)}\u2013${fmtNumber(e.hi)}<span class="est-mark">\u2020</span></span>` : '';
          if (word || band) return `<td class="num">${word}${word && band ? '<br>' : ''}${band}</td>`;
        }
        if (!r) return `<td class="num"><span class="missing dash" title="No ${esc(c.label.toLowerCase())} temperature published for this material">\u2014</span></td>`;
        // A range across every recorded profile, not one setting to dial in. The drawer's Printing
        // tab has each profile on its own.
        const t = r.profiles > 1 ? `Range across ${r.profiles} recorded profiles, not one recipe. Open the material's Printing tab for each.` : 'From one recorded profile';
        return `<td class="num" title="${esc(t)}">${printRange(r)}</td>`;
      }
      if (c.kind === 'needs') {
        const bits = [];
        if (m.gates.abrasive === 'requires-hardened') bits.push('<span class="need" title="Carbon or glass filled. A brass nozzle will wear out.">hardened nozzle</span>');
        if (m.gates.drying === 'required') bits.push('<span class="need" title="Drying guidance is published. Open the material for it.">drying guidance</span>');
        if (!bits.length) return `<td><span class="missing" title="No source in the snapshot states a hardened-nozzle or drying requirement. That is not the same as needing nothing.">none recorded</span></td>`;
        return `<td>${bits.join(' ')}</td>`;
      }
      if (c.kind === 'price') {
        const h = m.headline.priceCADkg;
        const inner = renderValue(h, { compact: true, estimates: state.ctx?.useEstimates });
        if (!m.buy) return `<td class="num">${inner}</td>`;
        const t = `${m.buy.retailer}: ${m.buy.variant ?? ''} (${m.buy.stock}, seen ${m.buy.accessDate})`;
        return `<td class="num"><a class="buy" href="${esc(m.buy.url)}" target="_blank" rel="noopener"
          title="${esc(t)}">${inner}<span class="buy-mark" aria-label="opens the retailer page">\u2197</span></a>
          ${m.buy.anyInStock ? '' : '<span class="oos" title="No sampled offer was in stock on the snapshot date">out of stock</span>'}</td>`;
      }
      return `<td class="num">${renderValue(m.headline[c.key], { compact: true, estimates: state.ctx?.useEstimates })}</td>`;
    }).join('');

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

  const anyLoad = COLUMNS.some((c) => c.key === 'hdt045')
    && sorted.some(({ material: m }) => m.headline.hdt045?.known && m.headline.hdt045.loadStated === false);
  const anyRelated = sorted.some(({ material: m }) =>
    COLUMNS.some((c) => c.kind === 'headline' && m.headline[c.key] && !m.headline[c.key].known && m.headline[c.key].related));
  const anyEstimate = state.ctx?.useEstimates && sorted.some(({ material: m }) =>
    COLUMNS.some((c) => c.kind === 'headline' && m.headline[c.key] && !m.headline[c.key].known
      && !m.headline[c.key].related && m.headline[c.key].estimate));

  // The legend sits above the table. Both markers first appear in row one and their explanation
  // used to be after the last row.
  const legend = [
    `<span class="lg"><span class="dash">\u2014</span> not published. Not zero, and not a low value.</span>`,
    anyRelated ? `<span class="lg"><span class="related-mark">*</span> a measurement that was never made the headline. Hover for why.</span>` : '',
    anyEstimate ? `<span class="lg"><span class="est-mark">\u2020</span> an estimate from similar materials, not a measurement.</span>` : '',
    anyLoad ? `<span class="lg"><span class="load-mark">?</span> heat test load not stated, so it cannot pass a heat requirement outright.</span>` : '',
  ].filter(Boolean).join('');

  // Hits the filters removed. A search that finds nothing because the requirements already
  // excluded the match reads as "this material is not in the database", which is false.
  const excluded = state.searchExcluded ?? [];
  const hiddenOnly = excluded.filter(({ evaluation: e }) => !e.failed.length && !e.heldBy.length).length;
  const excludedBlock = excluded.length ? `
    <div class="excluded-group">
      <h3>${excluded.length} more match${excluded.length === 1 ? 'es' : ''} "${esc(state.search)}"
        but ${excluded.length === 1 ? 'is' : 'are'} not in the results${hiddenOnly === excluded.length
          ? ', because the result filters at the bottom hide them'
          : hiddenOnly ? '' : `: ${excluded.length === 1 ? 'it does' : 'they do'} not meet your requirements`}</h3>
      <table class="grid">
        <colgroup><col style="width:26%"><col style="width:14%"><col><col style="width:80px"></colgroup>
        <thead><tr><th>Material</th><th>Result</th><th>What ruled it out</th><th>Shortlist</th></tr></thead>
        <tbody>${excluded.map(({ material: m, evaluation: e }) => {
          const { primary, aka } = materialName(m.name);
          const why = e.failed.length
            ? e.failed.map((r) => `${esc(describeConstraint(r.constraint))} — ${esc(r.reason)}`).join('<br>')
            : e.heldBy.length
              ? `Could not be checked against ${esc(e.unresolved.map((r) => describeConstraint(r.constraint)).join(', '))}.`
                + ' Not a failure: it is left out because missing data is set to "leave it out".'
              : 'Hidden by the result filters at the bottom of the screen.';
          return `<tr data-material="${esc(m.id)}" tabindex="0">
            <td class="name">${esc(primary)}${aka ? `<span class="row-sub">also called ${esc(aka)}</span>` : ''}</td>
            <td>${chip(e.verdict)}</td>
            <td class="why-cell">${why}</td>
            <td><button class="btn btn-sm" data-pin="${esc(m.id)}" aria-label="Shortlist ${esc(m.name)}"
              aria-pressed="${scenario.shortlist.includes(m.id)}">${scenario.shortlist.includes(m.id) ? '★' : '☆'}</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>` : '';

  // Baseline picker: the anchor is offered, never imposed.
  const anchors = BASELINE_NAMES
    .map((n) => state.db.materials.find((m) => m.name === n))
    .filter(Boolean);

  host.innerHTML = `
    <div class="table-bar">
      <div class="segmented" role="group" aria-label="Which columns to show">
        ${Object.entries(COLUMN_SETS).map(([k, v]) => `<button data-colset="${k}" aria-pressed="${k === setKey}"
          title="${esc(v.help)}">${esc(v.label)}</button>`).join('')}
      </div>
      <label class="baseline-pick" title="Adds a reference row so every number has something familiar beside it.">
        Compare against
        <select data-baseline>
          <option value="">nothing</option>
          ${anchors.map((m) => `<option value="${esc(m.id)}" ${state.baseline === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
        </select>
      </label>
      <div class="legend-row">${legend}</div>
    </div>
    ${sorted.length ? `<table class="grid">
      <colgroup>${COLUMNS.map((c) => `<col style="width:${c.width}">`).join('')}</colgroup>
      <thead><tr>${head}</tr></thead><tbody>${baselineRow}${body}</tbody></table>`
      : `<p class="empty-line">Nothing matching "${esc(state.search)}" meets your requirements.</p>`}
    ${excludedBlock}`;

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
  host.querySelectorAll('tr[data-material]').forEach((tr) => {
    const open = () => actions.openMaterial(tr.dataset.material);
    tr.addEventListener('click', (ev) => { if (!ev.target.closest('a, button')) open(); });
    // Only the row itself. Enter on the star or the buy link inside it used to bubble up here and
    // open the drawer as well as doing its own job.
    tr.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target === tr) open(); });
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
    'Density kg/m3', 'Stiffness GPa', 'Strength MPa', 'Stretch %', 'Heat resistance C', 'Price CAD/kg',
    'Value qualifiers', 'Measurement IDs',
    'Nozzle C', 'Bed C', 'Chamber C', 'Hardened nozzle', 'Drying guidance', 'Where to buy',
    ...(useEstimates ? ['Estimated fields', 'Ruled out by estimate'] : [])];
  const q = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const KEYS = ['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY', 'hdt045', 'priceCADkg'];
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
    if (k === 'hdt045' && h.loadStated === false) out.push('hdt045: test load not stated');
    return out;
  }).join(' | ');
  const ids = (m) => KEYS.map((k) => m.headline[k]?.measurementId).filter(Boolean).join(' ');
  const estimated = (m) => [...Object.entries(m.headline)
    .filter(([, h]) => h && !h.known && h.estimate)
    .map(([k, h]) => `${k} ~${h.estimate.lo}-${h.estimate.hi} (${h.estimate.basis}, n=${h.estimate.peerCount})`),
    ...(m.print?.chamberEstimate ? [`chamber ~${m.print.chamberEstimate.lo}-${m.print.chamberEstimate.hi} C (research band: ${m.print.chamberEstimate.basis}; decides nothing)`] : []),
  ].join(' | ');
  const why = (list) => list.map((r) => `${describeConstraint(r.constraint)}: ${r.reason}`).join(' | ');
  const range = (r) => (r ? `${r.min}-${r.max}` : '');

  const header = [
    '# H2C Material Selector export',
    `# database snapshot ${meta.snapshot}, application build ${meta.build}`,
  ];
  if (scenario) {
    header.push(`# missing data: ${scenario.unknownPolicy === 'exploration' ? 'kept, flagged (Explore)' : 'left out (Strict)'}; family estimates ${useEstimates ? 'on' : 'off'}`);
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
      ...(useEstimates ? [estimated(m), e.ruledOutByEstimate ? 'yes' : ''] : []),
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
