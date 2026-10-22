// How well documented a material is, in words (moved from app/pages/findings.js in the coherence round, 2026-10-18, so
// the drawer's On file line and the material page's evidence line say it from one function, C20): the tier's word
// (well, partly or thinly documented, material-highlights.js evidenceTier), why, and what a key property's figure is,
// said once (keyFiguresBasis, which the drawer's Overview prints under its key properties too, C07). Display only.

import type { Loose } from '../loose.ts';

import { fmtNumber } from './format.ts';
import { plural, cap, andList, inText } from './material-words.ts';
import { countWords } from './print-brief.ts';
import { evidenceTier, productsOf } from './material-highlights.ts';
import { productNameOrId } from './material-facts.ts';
import { say, plain, num, joinSay, andSay, capSay } from './say.ts';

/** A count with its noun, the number in words under eleven: "three products". */
export const nWords = (n: Loose, word: Loose, many = `${word}s`) => `${countWords(n)} ${n === 1 ? word : many}`;

/** The tier's word, as both surfaces print it ahead of the reasons. */
export const EVIDENCE_HEADS: Record<string, Loose> = { well: 'Well documented', partly: 'Partly documented', thinly: 'Thinly documented' };
/** "tensile strength (Z) rests on 3 products". */
const restsOn = (t: Loose): Loose => say`${inText(t.h.labels.plain)} rests on ${num(t.n, { key: t.key, stat: 'n', shown: plural(t.n, 'product') })}`;
const isAre = (xs: Loose): Loose => (xs.length === 1 ? 'is' : 'are');
const names = (ts: Loose) => andList(ts.map((t: Loose) => inText(t.h.labels.plain)));

/**
 * What a key property's figure is, said once on a surface: the median of the products that publish it comparably (a value
 * set apart, D172, is not), beside it their middle half, and which products are kept out of the median. Plain text.
 */
export function keyFiguresBasis(c: Loose) {
  const m = c.m;
  const variants = productsOf(c).some((g: Loose) => g.variant);
  const toughened = !!m.summary?.charpyNotched?.claimed?.setApart;
  const apart = variants && toughened ? 'Products with an added filler or additive, and for notched impact those sold as toughened, are shown but kept out of the medians.'
    : variants ? 'Products with an added filler or additive are shown but kept out of the medians.'
      : toughened ? 'For notched impact, products sold as toughened are shown but kept out of the median.' : '';
  return ['Each figure is the median of the products that publish it comparably, and beside it the middle half of them; a value on a test bar no document describes as printed, or with no stated test load, is set apart, except a heat deflection of a plastic that cannot crystallise, which its glass transition sets, unless its document points to a moulded or resin bar.', apart].filter(Boolean).join(' ');
}

// What sets a key figure's published values apart (D172), from its products' own values as the median reads them (a
// declared variant's apart, unless the material has nothing else): the caveats, and the words for one or several.
const SET_APART: Record<string, string> = { 'not-described': 'on test bars no document describes as printed', 'load-not-stated': 'with no stated test load', 'unstated-direction': 'with no usable orientation stated' };
function caveatsOf(x: Loose, c: Loose): Loose {
  const products = productsOf(c);
  const plainOnes = products.filter((g: Loose) => !g.variant);
  return new Set((plainOnes.length ? plainOnes : products).map((g: Loose) => g.headline?.[x.key]).filter((v: Loose) => v?.level === 'as-published').map((v: Loose) => v.caveat));
}
const setApartPhrase = (xs: Loose, c: Loose) => [...new Set<Loose>(xs.flatMap((x: Loose) => [...caveatsOf(x, c)]))].map((k) => SET_APART[k]).filter(Boolean).join(', or ') || 'set apart';

/**
 * Why the values published cannot be ranked, said once, from what sets them apart: "No document describes its tensile
 * bars as printed, so …", "No sheet states the test load of its HDT at 0.45 MPa, so …".
 */
function openReason(t: Loose, c: Loose): Loose {
  if (!t.openOnly.length) return null;
  const why = (x: Loose): Loose => { const cs = caveatsOf(x, c); return cs.size === 1 ? [...cs][0] : 'mixed'; };
  const test = (x: Loose): Loose => {
    const l = x.h.labels.plain;
    return /tensile|elongation/i.test(l) ? 'tensile' : /flexural/i.test(l) ? 'flexural' : /impact/i.test(l) ? 'impact' : /HDT|heat/i.test(l) ? 'heat deflection' : 'test';
  };
  const bars = (xs: Loose) => andList([...new Set(xs.map(test))]);
  const shown = (xs: Loose) => `${xs.length === 1 ? 'it is' : 'they are'} shown as published and not ranked against other materials.`;
  const groups = new Map<Loose, Loose>();
  for (const x of t.openOnly) groups.set(why(x), [...(groups.get(why(x)) ?? []), x]);
  return [...groups].map(([kind, xs]) => (({
    'not-described': `No document describes its ${bars(xs)} bars as printed, so ${names(xs)} ${isAre(xs)} shown as published and not ranked against other materials.`,
    'load-not-stated': `No sheet states the test load of its ${names(xs)}, so ${shown(xs)}`,
    'unstated-direction': `No sheet states a usable orientation for its ${bars(xs)} bars, so ${names(xs)} ${isAre(xs)} shown as published and not ranked against other materials.`,
  } as Record<string, Loose>)[kind] ?? `${cap(names(xs))} ${isAre(xs)} published only ${setApartPhrase(xs, c)}, so ${shown(xs)}`)).join(' ');
}

/** The makers whose documents give the values: "two makers' documents: Spectrum's, which FormFutura AthenaX GF10 shares, and Fiberlogy's". */
function makersWords(t: Loose) {
  const ms = t.makers;
  if (!ms.length) return 'no document with a number';
  const one = ({ maker, readers }: Loose) => (readers.length ? `${maker}'s, which ${andList(readers.map(productNameOrId))} ${readers.length === 1 ? 'shares' : 'share'}` : `${maker}'s`);
  if (ms.length > 3) return `${fmtNumber(ms.length)} makers' documents`;
  const list = ms.length === 1 ? one(ms[0]) : `${ms.slice(0, -1).map(one).join(', ')}${ms.some((x: Loose) => x.readers.length) ? ',' : ''} and ${one(ms.at(-1))}`;
  return `${ms.length === 1 ? 'one maker\'s documents' : `${countWords(ms.length)} makers' documents`}: ${list}`;
}

/**
 * The evidence line: how well documented the material is, why where it matters, and what a key figure is, said once on
 * the page. `{ tier, head ('Well documented'…), text, html, toString() }`; the head is not in the text.
 */
export function evidenceLine(c: Loose) {
  const t = evidenceTier(c.m, c);
  let body: Loose;
  if (t.tier === 'well') {
    body = joinSay([`${fmtNumber(t.documents)} documents from ${plural(t.publishers, 'publisher')}${t.dataSheets ? `, ${t.dataSheets === t.documents ? 'all' : fmtNumber(t.dataSheets)} of them data sheets` : ''}.`, keyFiguresBasis(c)]);
  } else if (t.tier === 'partly') {
    const byN = [...new Set(t.weak.map((x: Loose) => x.n))].map((n) => t.weak.filter((x: Loose) => x.n === n));
    const restsOnAll = byN.map((g, i) => (g.length === 1 ? (i ? say`${inText(g[0].h.labels.plain)} on ${plural(g[0].n, 'product')}` : restsOn(g[0]))
      : say`${names(g)} ${i ? 'on' : 'rest on'} ${plural(g[0].n, 'product')} each`));
    const parts = [...restsOnAll, t.missing.length ? plain(`${names(t.missing)} ${isAre(t.missing)} not published`) : null,
      t.openOnly.length ? plain(`${names(t.openOnly)} ${t.openOnly.length === 1 ? 'is' : 'are'} published only ${setApartPhrase(t.openOnly, c)}`) : null].filter(Boolean);
    body = joinSay([say`${capSay(andSay(parts))}.`, keyFiguresBasis(c)]);
  } else {
    const word = t.makers.length <= 1 ? 'one sheet\'s word' : t.makers.length === 2 ? 'one or two sheets\' word' : 'a few sheets\' word';
    body = joinSay([`${cap(nWords(t.products, 'product'))}, with values from ${makersWords(t)}.`, openReason(t, c), t.ranked.length ? `Read each figure as ${word}.` : null]);
  }
  return { ...body, tier: t.tier, head: EVIDENCE_HEADS[t.tier], facts: t, toString() { return `${EVIDENCE_HEADS[t.tier]}: ${body.text}`; } };
}
