// Shared rendering. Every displayed value carries its origin in its typography, so a published
// number never looks like one a regular expression recovered out of free text.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function fmtNumber(v, unit) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  let s;
  if (abs >= 1000) s = v.toLocaleString('en-CA', { maximumFractionDigits: 0 });
  else if (abs >= 100) s = v.toFixed(0);
  else if (abs >= 10) s = v.toFixed(1);
  else if (abs >= 1) s = v.toFixed(2);
  else s = v.toPrecision(3);
  s = s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  return unit ? `${s} ${unit}` : s;
}

// Wording for the four missing states. They are different engineering answers and stay different.
// The long form, used wherever there is room and in every tooltip.
const MISSING_FULL = {
  'not-published': 'Not published in the sampled sources. Not zero, and not a low value.',
  'insufficient-comparable': 'Evidence exists but cannot support this comparison.',
  'not-applicable': 'This property does not apply to this material.',
  'quarantined': 'Quarantined: an unresolved unit or layout problem in the source.',
  'not-available-in-market': 'No Canadian price observation in the sampled market.',
};

const MISSING_LABEL = {
  'not-published': 'Not published',
  'insufficient-comparable': 'Not comparable',
  'not-applicable': 'Not applicable',
  'quarantined': 'Quarantined',
  'not-available-in-market': 'No CA price',
};

/**
 * Render a headline entry with its provenance and an evidence affordance.
 *
 * Where there is no headline but related measurements exist, show them. 30 materials have a
 * tensile-strength measurement that never became the headline because the source stated no
 * direction or a different endpoint. A blank cell hid that and implied nothing was known.
 */
export function renderValue(entry, { showUnit = false, compact = false, estimates = false } = {}) {
  if (!entry) return `<span class="missing">—</span>`;
  if (!entry.known) {
    const label = esc(MISSING_LABEL[entry.missing] ?? 'Not published');
    const r = entry.related;

    // Precedence: a real measurement of this property beats a bound drawn from relatives.
    if (!r && estimates && entry.estimate) {
      const e = entry.estimate;
      const span = `${fmtNumber(e.lo)}–${fmtNumber(e.hi)}${showUnit ? ' ' + esc(e.unit) : ''}`;
      const title = `Estimated, not measured. This material has no ${''}published value. The `
        + `${e.peerCount} measured peers in ${e.basis} fall between ${fmtNumber(e.lo)} and ${fmtNumber(e.hi)} ${e.unit}`
        + `${e.sharedSourceDropped ? ` (${e.sharedSourceDropped} further entries share one commercial source and were counted once)` : ''}.`
        + ' Used only to rule a material out, never to confirm one in.';
      return `<span class="est" title="${esc(title)}">~${span}<span class="est-mark">†</span></span>`;
    }
    // In the table a dash, because "Not published" does not fit a numeric column and was being
    // clipped to "Not publis...". The wording survives in the tooltip, the detail drawer, the
    // comparison view and every export, so the four missing states stay distinct.
    if (!r) {
      return compact
        ? `<span class="missing dash" title="${esc(MISSING_FULL[entry.missing] ?? 'Not published in the sampled sources')}">—</span>`
        : `<span class="missing" title="${esc(entry.text ?? '')}">${label}</span>`;
    }
    const b = r.best;
    const dir = b.direction && b.direction !== 'not-applicable' && b.direction !== 'unknown' ? b.direction : null;
    const more = r.count - 1;
    // Quiet by design: a value plus one marker. The earlier version stacked shouty uppercase tags
    // like "XY +1" and "NO DIRECTION" into the cell, which made the column unscannable.
    const title = `Not published as a headline. Nearest measurement on record: ${fmtNumber(b.value)} ${b.unit}`
      + ` \u2014 ${b.property}, grade ${b.gradeId}${dir ? ', ' + dir + ' direction' : ', direction not stated'}.`
      + ` Reason it is not the headline: ${b.why}.`
      + `${more ? ` ${more} further measurement${more === 1 ? '' : 's'} across ${r.grades} grade${r.grades === 1 ? '' : 's'}.` : ''}`
      + ' Not used by any filter.';
    return `<span class="related" title="${esc(title)}">`
      + `<span class="rv">${fmtNumber(b.value)}${showUnit ? ' ' + esc(b.unit) : ''}</span>`
      + `<span class="related-mark">*</span></span>`;
      + `${more ? `<span class="tag">+${more}</span>` : ''}</span>`;
  }
  const text = fmtNumber(entry.value, showUnit ? entry.unit : null);
  let cls = '';
  let title = '';
  if (entry.assumption) {
    cls = 'v-assumed';
    title = `Scenario assumption, not observed data${entry.note ? '. ' + entry.note : ''}`;
  } else if (entry.origin === 'parsed' || entry.caveat) {
    cls = 'v-parsed';
    title = entry.caveat === 'load-not-stated' || entry.loadStated === false
      ? 'The source states the standard but not the load. Recovered from free text.'
      : 'Recovered from free text by the build.';
  } else if (entry.origin === 'derived') {
    cls = 'v-derived';
    title = `Derived${entry.from ? ' from ' + entry.from : ''}`;
  }
  const dot = entry.measurementId
    ? `<span class="evidence-dot" data-measurement="${esc(entry.measurementId)}" title="Open the measurement behind this value"></span>`
    : '';
  return `<span class="${cls}"${title ? ` title="${esc(title)}"` : ''}>${text}</span>${dot}`;
}

export const chip = (status, label) =>
  `<span class="chip chip-${esc(status)}">${esc(label ?? status)}</span>`;

export const FAMILY_LABEL = (f) => (f ?? '').replace(' - Outside H2C Practical Envelope', '');

/** Marker shapes by filler class: colour is never the only channel. */
export const FILLER_SYMBOL = {
  'carbon-fibre': 'diamond',
  'glass-fibre': 'square',
  'unfilled': 'circle',
  'esd': 'triangle-up',
  'foaming': 'star',
  'undisclosed': 'circle-open',
};

export const FILLER_LABEL = {
  'carbon-fibre': 'Carbon fibre', 'glass-fibre': 'Glass fibre', 'unfilled': 'Unfilled',
  'esd': 'ESD', 'foaming': 'Foaming', 'undisclosed': 'Undisclosed variant',
};

/**
 * Colour by family. There are 19 families, past what a categorical palette can separate, so the
 * eight largest get their own hue and the tail groups into "Other". The legend can promote any
 * family out of Other.
 */
const PALETTE = ['#3a7ca5', '#c1622f', '#4a8f5b', '#9b4f8e', '#a8902a', '#5c6bc0', '#b5533f', '#2f8f8a'];
const OTHER_COLOR = '#8d8d84';

export function buildFamilyColors(materials, promoted = []) {
  const counts = new Map();
  for (const m of materials) counts.set(m.family, (counts.get(m.family) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f);
  const named = [...new Set([...promoted, ...ranked])].slice(0, PALETTE.length);
  const map = new Map();
  named.forEach((f, i) => map.set(f, PALETTE[i]));
  return {
    color: (family) => map.get(family) ?? OTHER_COLOR,
    isOther: (family) => !map.has(family),
    named,
    other: ranked.filter((f) => !map.has(f)),
  };
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
