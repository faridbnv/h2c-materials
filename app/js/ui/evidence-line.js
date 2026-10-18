// How well documented a material is, in words (moved from app/pages/findings.js in the coherence round, 2026-10-18, so
// the drawer's On file line and the material page's evidence line say it from one function, C20): the tier's word
// (well, partly or thinly documented, material-highlights.js evidenceTier), why, and what a key property's figure is,
// said once (keyFiguresBasis, which the drawer's Overview prints under its key properties too, C07). Display only.

import { fmtNumber } from './format.js';
import { plural, cap, andList, inText } from './material-words.js';
import { countWords } from './print-brief.js';
import { evidenceTier, productsOf } from './material-highlights.js';
import { productNameOrId } from './material-facts.js';
import { say, plain, num, joinSay, andSay, capSay } from './say.js';

/** A count with its noun, the number in words under eleven: "three products". */
export const nWords = (n, word, many = `${word}s`) => `${countWords(n)} ${n === 1 ? word : many}`;

/** The tier's word, as both surfaces print it ahead of the reasons. */
export const EVIDENCE_HEADS = { well: 'Well documented', partly: 'Partly documented', thinly: 'Thinly documented' };
/** "tensile strength (Z) rests on 3 products". */
const restsOn = (t) => say`${inText(t.h.labels.plain)} rests on ${num(t.n, { key: t.key, stat: 'n', shown: plural(t.n, 'product') })}`;
const isAre = (xs) => (xs.length === 1 ? 'is' : 'are');
const names = (ts) => andList(ts.map((t) => inText(t.h.labels.plain)));

/**
 * What a key property's figure is, said once on a surface: the median of the products that publish it with a stated
 * orientation or test load, beside it their middle half, and which products are kept out of the median. Plain text.
 */
export function keyFiguresBasis(c) {
  const m = c.m;
  const variants = productsOf(c).some((g) => g.variant);
  const toughened = !!m.summary?.charpyNotched?.claimed?.setApart;
  const apart = variants && toughened ? 'Products with an added filler or additive, and for notched impact those sold as toughened, are shown but kept out of the medians.'
    : variants ? 'Products with an added filler or additive are shown but kept out of the medians.'
      : toughened ? 'For notched impact, products sold as toughened are shown but kept out of the median.' : '';
  return ['Each figure is the median of the products that publish it with a stated orientation or test load, and beside it the middle half of them.', apart].filter(Boolean).join(' ');
}

/** Why the values published cannot be ranked, said once: "No sheet states how its tensile bars were printed, so …". */
function openReason(t) {
  if (!t.openOnly.length) return null;
  const dir = t.openOnly.filter((x) => x.h.direction), load = t.openOnly.filter((x) => !x.h.direction);
  const tests = [...new Set(dir.map((x) => (/tensile|elongation/i.test(x.h.labels.plain) ? 'tensile' : /flexural/i.test(x.h.labels.plain) ? 'flexural' : 'test')))];
  const parts = [];
  if (dir.length) parts.push(`No sheet states how its ${andList(tests)} bars were printed, so ${names(dir)} ${isAre(dir)} shown as published and not ranked against other materials.`);
  if (load.length) parts.push(`No sheet states the test load of its ${names(load)}, so ${load.length === 1 ? 'it is' : 'they are'} shown as published and not ranked against other materials.`);
  return parts.join(' ');
}

/** The makers whose documents give the values: "two makers' documents: Spectrum's, which FormFutura AthenaX GF10 shares, and Fiberlogy's". */
function makersWords(t) {
  const ms = t.makers;
  if (!ms.length) return 'no document with a number';
  const one = ({ maker, readers }) => (readers.length ? `${maker}'s, which ${andList(readers.map(productNameOrId))} ${readers.length === 1 ? 'shares' : 'share'}` : `${maker}'s`);
  if (ms.length > 3) return `${fmtNumber(ms.length)} makers' documents`;
  const list = ms.length === 1 ? one(ms[0]) : `${ms.slice(0, -1).map(one).join(', ')}${ms.some((x) => x.readers.length) ? ',' : ''} and ${one(ms.at(-1))}`;
  return `${ms.length === 1 ? 'one maker\'s documents' : `${countWords(ms.length)} makers' documents`}: ${list}`;
}

/**
 * The evidence line: how well documented the material is, why where it matters, and what a key figure is, said once on
 * the page. `{ tier, head ('Well documented'…), text, html, toString() }`; the head is not in the text.
 */
export function evidenceLine(c) {
  const t = evidenceTier(c.m, c);
  let body;
  if (t.tier === 'well') {
    body = joinSay([`${fmtNumber(t.documents)} documents from ${plural(t.publishers, 'publisher')}${t.dataSheets ? `, ${t.dataSheets === t.documents ? 'all' : fmtNumber(t.dataSheets)} of them data sheets` : ''}.`, keyFiguresBasis(c)]);
  } else if (t.tier === 'partly') {
    const byN = [...new Set(t.weak.map((x) => x.n))].map((n) => t.weak.filter((x) => x.n === n));
    const restsOnAll = byN.map((g, i) => (g.length === 1 ? (i ? say`${inText(g[0].h.labels.plain)} on ${plural(g[0].n, 'product')}` : restsOn(g[0]))
      : say`${names(g)} ${i ? 'on' : 'rest on'} ${plural(g[0].n, 'product')} each`));
    const parts = [...restsOnAll, t.missing.length ? plain(`${names(t.missing)} ${isAre(t.missing)} not published`) : null,
      t.openOnly.length ? plain(`${names(t.openOnly)} ${t.openOnly.length === 1 ? 'is' : 'are'} published only without a stated orientation or test load`) : null].filter(Boolean);
    body = joinSay([say`${capSay(andSay(parts))}.`, keyFiguresBasis(c)]);
  } else {
    const word = t.makers.length <= 1 ? 'one sheet\'s word' : t.makers.length === 2 ? 'one or two sheets\' word' : 'a few sheets\' word';
    body = joinSay([`${cap(nWords(t.products, 'product'))}, with values from ${makersWords(t)}.`, openReason(t), t.ranked.length ? `Read each figure as ${word}.` : null]);
  }
  return { ...body, tier: t.tier, head: EVIDENCE_HEADS[t.tier], facts: t, toString() { return `${EVIDENCE_HEADS[t.tier]}: ${body.text}`; } };
}
