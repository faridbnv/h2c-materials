// Table lens. Hand-built rather than a grid library: at 102 rows the virtues of a data grid do not
// apply, and every cell needs custom rendering anyway for the provenance typography and the
// four-state chips. Sorting, selection and export are a hundred lines here.

import { renderValue, chip, esc, fmtNumber } from './format.js';

// Widths are declared, not left to the browser. Auto layout stretched the numeric columns across
// the full width, which put each heading at the far left of its column and its value at the far
// right, so no number lined up with the thing it was under.
const COLUMNS = [
  { key: 'name',      label: 'Material',  kind: 'name',  width: '16%' },
  { key: 'family',    label: 'Family',    kind: 'text',  width: '13%' },
  { key: 'verdict',   label: 'State',     kind: 'state', width: '11%' },
  { key: 'density',           label: 'Density',  unit: 'kg/m³',  kind: 'headline', width: '10%' },
  { key: 'tensileModulusXY',  label: 'Modulus',  unit: 'GPa',    kind: 'headline', width: '9.5%' },
  { key: 'tensileStrengthXY', label: 'Strength', unit: 'MPa',    kind: 'headline', width: '9.5%' },
  { key: 'elongationXY',      label: 'Elong.',   unit: '%',      kind: 'headline', width: '9%' },
  { key: 'hdt045',            label: 'HDT',      unit: '°C',     kind: 'headline', width: '9%' },
  { key: 'priceCADkg',        label: 'Price',    unit: 'CAD/kg', kind: 'headline', width: '9%' },
  { key: 'pin',       label: '',          kind: 'pin',   width: '44px' },
];

const STATE_ORDER = { PASS: 0, INDETERMINATE: 1, UNKNOWN: 2, FAIL: 3 };

function cellValue(row, col) {
  if (col.kind === 'headline') {
    const h = row.material.headline[col.key];
    return h?.known ? h.value : null;
  }
  if (col.kind === 'state') return STATE_ORDER[row.evaluation.verdict] ?? 9;
  return row.material[col.key] ?? '';
}

export function renderTable(host, state, actions) {
  const { rows, sort, scenario } = state;

  const sorted = [...rows].sort((a, b) => {
    const col = COLUMNS.find((c) => c.key === sort.key) ?? COLUMNS[0];
    const av = cellValue(a, col), bv = cellValue(b, col);
    // Missing values sort last in both directions rather than reading as zero.
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    const d = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return sort.dir === 'desc' ? -d : d;
  });

  const head = COLUMNS.map((c) => {
    const active = sort.key === c.key;
    const arrow = active ? (sort.dir === 'asc' ? ' \u25b2' : ' \u25bc') : '';
    const num = c.kind === 'headline';
    return `<th data-sort="${c.key}" class="${num ? 'num' : ''}" ${active ? 'aria-sort="' + sort.dir + 'ending"' : ''} tabindex="0">
      ${esc(c.label)}${c.unit ? ` <span class="u">${esc(c.unit)}</span>` : ''}${arrow}</th>`;
  }).join('');

  const body = sorted.map(({ material: m, evaluation: e }) => {
    const pinned = scenario.shortlist.includes(m.id);
    const cells = COLUMNS.map((c) => {
      if (c.kind === 'name') {
        // No "needs verification" badge here: the State column already says UNKNOWN, and repeating
        // it under every name doubled the row height for no information.
        const asm = m.assumptionDependent ? ' <span class="chip chip-UNKNOWN" title="Depends on a scenario assumption">assumed</span>' : '';
        return `<td class="name">${esc(m.name)}${asm}</td>`;
      }
      if (c.kind === 'text') return `<td>${esc(m[c.key] ?? '')}</td>`;
      if (c.kind === 'state') return `<td>${chip(e.verdict)}</td>`;
      if (c.kind === 'pin') {
        return `<td><button class="btn btn-sm" data-pin="${esc(m.id)}" aria-pressed="${pinned}"
          title="${pinned ? 'Remove from shortlist' : 'Add to shortlist'}">${pinned ? '★' : '☆'}</button></td>`;
      }
      return `<td class="num">${renderValue(m.headline[c.key], { compact: true, estimates: state.ctx?.useEstimates })}</td>`;
    }).join('');
    return `<tr data-material="${esc(m.id)}" data-selected="${state.selectedMaterialId === m.id}" tabindex="0">${cells}</tr>`;
  }).join('');

  const anyRelated = sorted.some(({ material: m }) =>
    COLUMNS.some((c) => c.kind === 'headline' && m.headline[c.key] && !m.headline[c.key].known && m.headline[c.key].related));
  const anyEstimate = state.ctx?.useEstimates && sorted.some(({ material: m }) =>
    COLUMNS.some((c) => c.kind === 'headline' && m.headline[c.key] && !m.headline[c.key].known
      && !m.headline[c.key].related && m.headline[c.key].estimate));

  host.innerHTML = `<table class="grid">
      <colgroup>${COLUMNS.map((c) => `<col style="width:${c.width}">`).join('')}</colgroup>
      <thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    <p class="table-note"><span class="dash">\u2014</span> means the property was not published in
      the sampled sources. It is not zero, and not a low value. Hover any dash for which kind of
      absence it is, or open the material.</p>
    ${anyEstimate ? `<p class="table-note"><span class="est-mark" style="color:var(--unknown)">\u2020</span>
      an <b>estimate</b>, not a measurement: the range its closest measured relatives fall in. It rules a
      material out of a search it clearly cannot meet, and never counts as meeting one. Hover it for
      which relatives, or turn estimates off in the top bar.</p>` : ''}
    ${anyRelated ? `<p class="table-note"><span class="related-mark">*</span> the nearest measurement on
      record for that property, which was never promoted to a headline value. Hover it for the reason,
      or open the material for the full record. It is not used by any filter.</p>` : ''}`;

  host.querySelectorAll('th[data-sort]').forEach((th) => {
    const go = () => actions.sort(th.dataset.sort);
    th.addEventListener('click', go);
    th.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
  });
  host.querySelectorAll('[data-pin]').forEach((b) => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    actions.togglePin(b.dataset.pin);
  }));
  host.querySelectorAll('[data-measurement]').forEach((d) => d.addEventListener('click', (ev) => {
    ev.stopPropagation();
    actions.openMeasurement(d.dataset.measurement);
  }));
  host.querySelectorAll('tr[data-material]').forEach((tr) => {
    const open = () => actions.openMaterial(tr.dataset.material);
    tr.addEventListener('click', open);
    tr.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') open(); });
  });
}

/** Client-side export. No server, and the four states survive into the file. */
export function toCSV(rows, meta) {
  const cols = ['MaterialID', 'Material', 'Family', 'H2C status', 'State',
    'Density kg/m3', 'Modulus GPa', 'Strength MPa', 'Elongation %', 'HDT C', 'Price CAD/kg',
    'HDT load stated', 'Estimated fields', 'Ruled out by estimate', 'Held by'];
  const q = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // An exported number is always a measurement. An estimated bound travels in its own column so a
  // spreadsheet can never mistake inference for evidence.
  const val = (m, k) => (m.headline[k]?.known ? m.headline[k].value : m.headline[k]?.missing ?? '');
  const estimated = (m) => Object.entries(m.headline)
    .filter(([, h]) => h && !h.known && h.estimate)
    .map(([k, h]) => `${k} ~${h.estimate.lo}-${h.estimate.hi} (${h.estimate.basis}, n=${h.estimate.peerCount})`)
    .join(' | ');
  const lines = [
    `# H2C Material Selector export`,
    `# database snapshot ${meta.snapshot}, application build ${meta.build}`,
    cols.join(','),
    ...rows.map(({ material: m, evaluation: e }) => [
      m.id, m.name, m.family, m.h2cStatus, e.verdict,
      val(m, 'density'), val(m, 'tensileModulusXY'), val(m, 'tensileStrengthXY'),
      val(m, 'elongationXY'), val(m, 'hdt045'), val(m, 'priceCADkg'),
      m.headline.hdt045?.known ? m.headline.hdt045.loadStated : '',
      estimated(m),
      e.ruledOutByEstimate ? 'yes' : '',
      e.heldBy.join(' | '),
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
