// Sentences with their numbers marked (moved from app/pages/findings.js in the coherence round, 2026-10-18, so the
// drawer can print a sentence the material page prints, from the same function).
//
// A sentence is a Say: `{ text, html, toString() }`, the plain words and the same words as markup, each compiled value
// in it wrapped `<span data-v="<unrounded>" data-key="<headline key>" data-stat="median|q1|q3|min|max|n|product">` so the
// page check can hold it to the facts. Build one with the `say` tag and `num` (or `plain`), join them with `joinSay` and
// `andSay`. The drawer reads `.text`; the pages read `.html`. Nothing here decides anything.

import type { Loose } from '../loose.ts';

import { esc, fmtNumber } from './format.ts';
import { fmtDisplay } from './display-numbers.ts';
import { glue } from './print-brief.ts';
import { cap } from './text.ts';

const SAY = Symbol('say');
const mk = (text: Loose, html: Loose): Loose => ({ [SAY]: true, text: glue(text), html: glue(html), toString() { return glue(text); } });
/** Attributes as markup (app/pages/html.js attrs): null, undefined, false and '' are left out, true is a bare attribute. */
const attrs = (o: Loose = {}) => Object.entries(o).filter(([, v]) => v != null && v !== false && v !== '')
  .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`)).join('');

/** Whether `x` is a Say. */
export const isSay = (x: Loose) => !!x?.[SAY];
/** Plain words as a Say. */
export const plain = (t: Loose): Loose => mk(String(t ?? ''), esc(String(t ?? '')));
/** Raw markup as a Say (a link, an element): its text is its markup's text. */
export const markup = (html: Loose, text: Loose): Loose => mk(text ?? String(html).replace(/<[^>]*>/g, ''), html);

/** A display number: the facts layer's value as the Overview prints it (display-numbers.js fmtDisplay). */
export const fmtD = (v: Loose, unit?: Loose) => (typeof fmtDisplay === 'function'
  ? (unit ? `${fmtDisplay(v, unit)} ${unit}` : fmtDisplay(v))
  : glue(fmtNumber(v, unit)));

/**
 * A compiled value in a sentence: its display form, marked with the unrounded value and the field it states (`key` a
 * headline key, `stat` the summary's field: median, q1, q3, min, max, n; or 'product' with `grade`). Without `key` it is
 * a display statistic (a share, a window, a count of records) and is not marked.
 */
export function num(value: Loose, { key = null, stat = 'median', unit = null, grade = null, shown = null }: Loose = {}): Loose {
  const text = shown ?? fmtD(value, unit);
  if (!key) return plain(text);
  return mk(text, `<span${attrs({ 'data-v': value, 'data-key': key, 'data-stat': stat, 'data-grade': grade })}>${esc(text)}</span>`);
}

/** A sentence from a template: interpolated Says keep their markup, anything else is escaped. */
export function say(strings: Loose, ...vals: Loose[]): Loose {
  let text = '', html = '';
  strings.forEach((s: Loose, i: Loose) => {
    text += s;
    html += esc(s);
    if (i >= vals.length) return;
    const v = vals[i];
    if (isSay(v)) { text += v.text; html += v.html; } else if (v != null && v !== false) { text += String(v); html += esc(String(v)); }
  });
  return mk(text, html);
}
/** Says joined by a separator. */
export const joinSay = (parts: Loose, sep = ' '): Loose => { const xs = parts.filter((p: Loose) => p && (isSay(p) ? p.text : p)).map((p: Loose) => (isSay(p) ? p : plain(p))); return mk(xs.map((p: Loose) => p.text).join(sep), xs.map((p: Loose) => p.html).join(esc(sep))); };
/** Says as a list in prose: "a", "a and b", "a, b and c". */
export function andSay(parts: Loose) {
  const xs = parts.filter(Boolean).map((p: Loose) => (isSay(p) ? p : plain(p)));
  if (xs.length < 2) return xs[0] ?? plain('');
  return joinSay([joinSay(xs.slice(0, -1), ', '), xs.at(-1)], ' and ');
}
/** A Say with its first letter in capitals (where it starts with words, not a number). */
export const capSay = (s: Loose): Loose => (isSay(s) ? mk(cap(s.text), /^</.test(s.html) ? s.html : cap(s.html)) : plain(cap(String(s))));

/** A range of two compiled values of one key, joined so it never breaks at its dash: "40–53 MPa". */
export const spanSay = (lo: Loose, hi: Loose, { key = null, unit = null, stats = ['min', 'max'] }: Loose = {}): Loose => (lo === hi
  ? num(lo, { key, stat: stats[0], unit })
  : say`${num(lo, { key, stat: stats[0] })}⁠–⁠${num(hi, { key, stat: stats[1], unit })}`);
