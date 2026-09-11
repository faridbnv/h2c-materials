// Table lens. Hand-built rather than a grid library: at 102 rows the virtues of a data grid do not
// apply, and every cell needs custom rendering anyway for the provenance typography and the
// four-state chips. Sorting, selection and export are a hundred lines here.

import { renderValue, chip, esc, fmtNumber } from './format.js';

const COLUMNS = [
  { key: 'name',      label: 'Material',  kind: 'name' },
  { key: 'family',    label: 'Family',    kind: 'text' },
  { key: 'verdict',   label: 'State',     kind: 'state' },
  { key: 'density',           label: 'Density',  unit: 'kg/m³',  kind: 'headline' },
  { key: 'tensileModulusXY',  label: 'Modulus',  unit: 'GPa',    kind: 'headline' },
  { key: 'tensileStrengthXY', label: 'Strength', unit: 'MPa',    kind: 'headline' },
  { key: 'elongationXY',      label: 'Elong.',   unit: '%',      kind: 'headline' },
  { key: 'hdt045',            label: 'HDT',      unit: '°C',     kind: 'headline' },
  { key: 'priceCADkg',        label: 'Price',    unit: 'CAD/kg', kind: 'headline' },
  { key: 'pin',       label: '',          kind: 'pin' },
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
    const arrow = active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
    return `<th data-sort="${c.key}" ${active ? 'aria-sort="' + sort.dir + 'ending"' : ''} tabindex="0">
      ${esc(c.label)}${c.unit ? ` <span class="u">${esc(c.unit)}</span>` : ''}${arrow}</th>`;
  }).join('');

  const body = sorted.map(({ material: m, evaluation: e }) => {
    const pinned = scenario.shortlist.includes(m.id);
    const cells = COLUMNS.map((c) => {
      if (c.kind === 'name') {
        const flag = e.needsVerification ? ' <span class="chip chip-UNKNOWN" style="font-size:10px">Needs verification</span>' : '';
        const asm = m.assumptionDependent ? ' <span class="chip chip-UNKNOWN" style="font-size:10px">Assumption</span>' : '';
        return `<td class="name">${esc(m.name)}${flag}${asm}</td>`;
      }
      if (c.kind === 'text') return `<td>${esc(m[c.key] ?? '')}</td>`;
      if (c.kind === 'state') return `<td>${chip(e.verdict)}</td>`;
      if (c.kind === 'pin') {
        return `<td><button class="btn btn-sm" data-pin="${esc(m.id)}" aria-pressed="${pinned}"
          title="${pinned ? 'Remove from shortlist' : 'Add to shortlist'}">${pinned ? '★' : '☆'}</button></td>`;
      }
      return `<td class="num">${renderValue(m.headline[c.key])}</td>`;
    }).join('');
    return `<tr data-material="${esc(m.id)}" data-selected="${state.selectedMaterialId === m.id}" tabindex="0">${cells}</tr>`;
  }).join('');

  host.innerHTML = `<table class="grid"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;

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
    'HDT load stated', 'Held by'];
  const q = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const val = (m, k) => (m.headline[k]?.known ? m.headline[k].value : m.headline[k]?.missing ?? '');
  const lines = [
    `# H2C Material Selector export`,
    `# database snapshot ${meta.snapshot}, application build ${meta.build}`,
    cols.join(','),
    ...rows.map(({ material: m, evaluation: e }) => [
      m.id, m.name, m.family, m.h2cStatus, e.verdict,
      val(m, 'density'), val(m, 'tensileModulusXY'), val(m, 'tensileStrengthXY'),
      val(m, 'elongationXY'), val(m, 'hdt045'), val(m, 'priceCADkg'),
      m.headline.hdt045?.known ? m.headline.hdt045.loadStated : '',
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
