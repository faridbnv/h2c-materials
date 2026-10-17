// In short: the material's written summary (materials[].written, compiled from material_summaries.csv at step 4), its
// every number a placeholder the build filled from the material's compiled values, so it cannot go stale. Its byline
// says who wrote it, when, and whether the owner has reviewed it; it decides nothing. A material with no summary says so.

import { esc } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { SUMMARY_STATUS } from '../../js/ui/labels.js';
import { emptyBody } from './common.js';

/** A filled value: its number as the key figures print it, with its unit and a published bound's sign. */
function filled(p) {
  const sign = typeof p.bound === 'string' ? `${p.bound} ` : p.bound?.sign ? `${p.bound.sign} ` : '';
  const text = `${sign}${fmtNumber(p.value)}${p.unit ? ` ${p.unit}` : ''}`;
  return `<span class="filled" data-field="${esc(p.field)}" data-value="${esc(p.value)}">${esc(text)}</span>`;
}

/** The summary's parts as paragraphs: a blank line inside a text part starts a new one. */
function paragraphs(parts) {
  const out = [[]];
  for (const p of parts ?? []) {
    if (p.field) { out.at(-1).push(filled(p)); continue; }
    const pieces = String(p.text ?? '').split(/\n\s*\n/);
    pieces.forEach((t, i) => { if (i) out.push([]); if (t) out.at(-1).push(esc(t.replace(/\s*\n\s*/g, ' '))); });
  }
  return out.map((x) => x.join('').trim()).filter(Boolean).map((t) => `<p>${t}</p>`).join('');
}

export default {
  id: 'in-short',
  title: 'In short',
  render(c) {
    const w = c.m.written;
    if (!w?.parts?.length) {
      return { empty: true, html: emptyBody(c, 'No summary has been written for this material yet. The sections below are drawn from its records.', { link: 'Every record is on the records page' }), stats: {} };
    }
    const status = SUMMARY_STATUS[w.status] ?? w.status;
    const html = `<div class="summary">${paragraphs(w.parts)}</div>
<p class="byline" data-written-status="${esc(w.status)}">${esc(w.by)}. Written on <time>${esc(w.on)}</time>. ${esc(status)}. Every figure in it is filled from the data when the page is built. It decides nothing.</p>`;
    return { empty: false, html, stats: { filled: w.parts.filter((p) => p.field).length } };
  },
};
