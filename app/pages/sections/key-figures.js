// Key figures: one for each key property a reader can filter on (the registry's selectable headlines, price included),
// as the build compiled it: the median of the material's products that publish it comparably, their range, middle half
// and count, the product nearest the median, what the median leaves out, and a strip of every material's median with
// this one marked. A property with no comparable value says why, in the selector's words, and points to an estimate.

import { esc } from '../html.js';
import { fmtNumber, fmtBounded, fmtBoundedKind, publishedBound, relatedNote, missingText, convertedNote, priceSampleWords } from '../../js/ui/format.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { productNameOrId, rankOf } from '../../js/ui/material-facts.js';
import { leftOutWords, toughenedSplit, TOUGHENED_NOTE_SHORT, plural, andList } from '../../js/ui/material-words.js';
import { contextStrip, rankWords } from '../charts/context.js';

/** A range of a spread with a published bound's sign at its end where it is one ("5–650+"), as the selector prints it. */
const spreadRange = (s) => (s.min === s.max && !s.bounds ? esc(fmtNumber(s.min))
  : `${fmtBoundedKind(esc(fmtNumber(s.min)), s.bounds?.min)}–${fmtBoundedKind(esc(fmtNumber(s.max)), s.bounds?.max)}`);

/**
 * Whether a key property's technical name says something its title does not: a test method (a standard, "ISO 179") or a
 * qualifier in brackets ("yield or break"). Spelling the title out ("Heat deflection temperature at 0.45 MPa" under "HDT
 * at 0.45 MPa"), or glossing its orientation ("across the layers"), adds nothing, and the line is left out.
 */
function addsToTitle(h) {
  const plain = h.labels.plain.toLowerCase(), technical = h.labels.technical ?? '';
  const standard = /\b(?:ISO|ASTM|IEC|DIN|UL)\s?\d+/.exec(technical)?.[0];
  if (standard && !plain.includes(standard.toLowerCase())) return true;
  return [...technical.matchAll(/\(([^)]+)\)/g)].map((x) => x[1]).some((q) => !plain.includes(q.toLowerCase()) && !/layers|orientation/i.test(q) && !/^(?:ISO|ASTM)/.test(q));
}

function knownTile(h, c, env) {
  const m = c.m;
  const e = m.headline[h.key];
  const s = m.summary?.[h.key];
  const sp = e.spread ?? { n: 1, min: e.value, max: e.value };
  const value = fmtBounded(e.value, null, publishedBound(e));
  const rank = env.ranks?.[h.key];
  const typical = e.typical?.gradeId ? c.gradeById.get(e.typical.gradeId) : null;
  const stats = [
    ['Products', esc(String(sp.n))],
    sp.n > 1 && (sp.min !== sp.max || sp.bounds) ? ['Range', spreadRange(sp)] : null,
    sp.q1 != null ? ['Middle half', esc(sp.q1 === sp.q3 ? fmtNumber(sp.q1) : `${fmtNumber(sp.q1)}–${fmtNumber(sp.q3)}`)] : null,
  ].filter(Boolean);
  const notes = [
    typical && sp.n > 1 && sp.min === sp.max && !sp.bounds ? `All ${sp.n} give ${fmtBounded(e.value, h.unit, publishedBound(e))}.` : null,
    typical && sp.n > 1 && (sp.min !== sp.max || sp.bounds) ? `Nearest the median: ${productNameOrId(typical)}, ${fmtBounded(e.typical.value, h.unit, e.typical.interval)}.` : null,
    typical && sp.n === 1 ? `One product: ${productNameOrId(typical)}.` : null,
    s ? (() => { const out = leftOutWords(h, s); return out.length ? `Left out of the median: ${andList(out)}.` : null; })() : null,
    s?.claimed && !s.claimed.setApart ? `${toughenedSplit(s, h.unit)} ${TOUGHENED_NOTE_SHORT}` : null,
    s?.claimed?.setApart ? TOUGHENED_NOTE_SHORT : null,
    e.converted ? convertedNote(e.converted) : null,
    h.kind === 'price' ? `Prices from ${priceSampleWords(c.db.meta)}.` : null,
  ].filter(Boolean);
  const r = rank ? rankOf(rank, m.id) : null;
  const method = addsToTitle(h) ? `<p class="kf-method">${esc(h.labels.technical)}</p>` : '';
  return `<div class="kf" data-kf="${esc(h.key)}" data-median="${esc(e.value)}" data-min="${esc(sp.min)}" data-max="${esc(sp.max)}" data-n="${esc(sp.n)}">
<h3 class="kf-name">${esc(h.labels.plain)}</h3>${method}
<p class="kf-value"><span class="kf-num">${esc(value)}</span><span class="kf-unit">${esc(h.unit)}</span></p>
<dl class="kf-stats">${stats.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>
${notes.length ? `<p class="kf-note">${esc(notes.join(' '))}</p>` : ''}
${rank && r.index >= 0 ? `${contextStrip(h.key, rank, m.id, sp, e.value, h.unit)}<p class="kf-rank">${esc(rankWords(r))}</p>` : ''}
</div>`;
}

/** Why a key property has no value on the page: not applicable, a value on file that is not compared, or not published. */
function noneWords(e) {
  if (!e) return missingText(null);
  if (e.notApplicable) return `Not applicable. ${e.notApplicable.reason}`;
  if (e.related) return relatedNote(e);
  return missingText(e);
}

export default {
  id: 'key-figures',
  title: 'Key figures',
  render(c, env) {
    const m = c.m;
    const hs = REGISTRY.headlines;
    const known = hs.filter((h) => m.headline?.[h.key]?.known);
    const none = hs.filter((h) => !m.headline?.[h.key]?.known);
    const grid = known.length ? `<div class="kf-grid">${known.map((h) => knownTile(h, c, env)).join('')}</div>` : '';
    const list = none.length ? `<h3 class="sub-title">${known.length ? 'Not given as a comparable value' : 'No key property has a comparable value'}</h3>
<div class="kf-none">${none.map((h) => {
      const e = m.headline?.[h.key];
      const est = e && !e.known && e.estimate ? ' <a href="#estimates">An estimate is given under Estimated, not measured.</a>' : '';
      return `<div class="kf kf--none" data-kf="${esc(h.key)}"><b>${esc(h.labels.plain)}</b> <span>${esc(noneWords(e))}</span>${est}</div>`;
    }).join('')}</div>` : '';
    const leadText = known.length
      ? `Each figure is the median of the products that publish the property on a comparable basis, with their range: different products, not one product's scatter. The strip under it places the median among every other material's${known.length < hs.length ? `. ${plural(none.length, 'key property', 'key properties')} ${none.length === 1 ? 'has' : 'have'} no comparable value, and ${none.length === 1 ? 'is' : 'are'} listed under the figures` : ''}.`
      : 'None of its products publishes a key property on a comparable basis; each is listed with what is on file.';
    return {
      empty: false,
      html: `<p class="lead">${esc(leadText)}</p>${grid}${list}`,
      stats: { figures: known.length, keyFigures: known.length },
    };
  },
};
