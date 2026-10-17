// Uses, limitations and chemicals: what makers sell the material for and what they warn about, in their own words
// (db.knowHow, by topic), its finish and accuracy (closed), and how it takes chemicals, water, sunlight and fire: one row
// per exposure with the verdict most of its makers state (evidence[].verdict, findings.js verdictWords), the statements
// about the material in general quoted in full, and the resin's reference data apart, never these products' (D64).
// Printing's own statements (print quality, post-processing, moisture) are said in Printing on the H2C.

import { esc, tableBox } from '../html.js';
import { indexDb, environmentMatrix, stated } from '../../js/ui/material-facts.js';
import { verdictWords as polymerVerdict, andList } from '../../js/ui/material-words.js';
import { quoteOrder, verdictWords, glue } from '../findings.js';
import { subhead, quote, quotes, readerText } from './common.js';

/** A label's first letter in lower case inside a sentence, an abbreviation kept ("UV and outdoor" stays). */
const lowerFirst = (t) => (/^[A-Z][a-z]/.test(String(t ?? '')) ? String(t).charAt(0).toLowerCase() + String(t).slice(1) : String(t ?? ''));
import { PRINT_CATEGORIES, makersOwn, general } from './printing.js';

/** Material-level statements of these categories are uses and limits: said in the first two lists. */
const USE_CATEGORIES = new Set(['application']);
const LIMIT_CATEGORIES = new Set(['limitations']);

/** Up to `n` statements of a topic, by the quoting rule, at most one per product and one per maker where there are more. */
function pick(c, list, n) {
  const ordered = quoteOrder(list, c);
  const out = [], makers = new Set();
  for (const k of ordered) {
    const maker = c.gradeById.get(k.gradeId)?.manufacturer;
    if (makers.has(maker) && ordered.length > n) continue;
    makers.add(maker);
    out.push(k);
    if (out.length === n) break;
  }
  return out;
}

export default {
  id: 'uses',
  title: 'Uses, limitations and chemicals',
  render(c, env = {}) {
    const m = c.m;
    const byGrade = (env.index ?? indexDb(c.db)).knowHowByGrade;
    const statements = c.grades.flatMap((g) => byGrade.get(g.id) ?? []);
    const of = (topic) => statements.filter((k) => k.topic === topic);
    const own = c.ev.filter(makersOwn);
    const gen = (cats) => own.filter((e) => general(e) && cats.has(e.category));
    const parts = [];

    // What it is sold for: makers' uses and benefits, and what guides say of the material in general.
    const goodFor = pick(c, of('Good for'), 3);
    const uses = goodFor.length >= 2 ? goodFor : [...goodFor, ...pick(c, of('Benefits'), 3 - goodFor.length)];
    const useGen = gen(USE_CATEGORIES);
    if (uses.length || useGen.length) parts.push(subhead('What it is sold for') + quotes([...uses.map((k) => quote(c, k)), ...useGen.map((e) => quote(c, e, { text: e.finding, rec: true }))]));

    // What makers warn about.
    const warn = pick(c, of('Pitfalls and limitations'), 5);
    const warnGen = gen(LIMIT_CATEGORIES);
    const warnProduct = own.filter((e) => !general(e) && LIMIT_CATEGORIES.has(e.category) && readerText(e.finding)).slice(0, Math.max(0, 5 - warn.length));
    if (warn.length || warnGen.length || warnProduct.length) {
      parts.push(subhead('What makers warn about') + quotes([...warn.map((k) => quote(c, k)), ...warnProduct.map((e) => quote(c, e, { text: e.finding })), ...warnGen.map((e) => quote(c, e, { text: e.finding, rec: true }))]));
    }

    // Finish and accuracy, closed.
    const finish = [...pick(c, of('Surface finish'), 2), ...pick(c, of('Precision and tolerance'), 2)];
    if (finish.length) parts.push(`<details class="more"><summary>${esc('Finish and accuracy')}</summary>${quotes(finish.map((k) => quote(c, k)))}</details>`);

    // Chemicals and environment: a row per exposure, its makers' verdict; then what is said of the material in general.
    const env2 = own.filter((e) => !PRINT_CATEGORIES.has(e.category) && !USE_CATEGORIES.has(e.category) && !LIMIT_CATEGORIES.has(e.category) && e.category !== 'specimen-prep');
    const f = environmentMatrix({ ...c, ev: env2 });
    const makerOf = (e) => { const g = stated(e.gradeId) ? c.gradeById.get(e.gradeId) : null; return (stated(g?.manufacturer) ? g.manufacturer : null) ?? c.sourceById.get(e.sourceId)?.publisher ?? null; };
    // The exposures a requirement can be set on are a table row each; the rest (food contact, disposal, safety) are said
    // in their own words below, with the statements about the material in general.
    const rows = f.rows.filter((r) => r.records.length && r.filterable);
    const chem = [];
    if (rows.length) {
      chem.push(tableBox(`<table class="grid chem"><thead><tr><th scope="col">Exposure</th><th scope="col">What makers say</th><th scope="col" class="num">Statements</th></tr></thead><tbody>${rows.map((r) => `<tr><th scope="row" class="prop">${esc(r.label)}</th><td data-label="What makers say">${esc(verdictWords(r.records))}</td><td class="num" data-label="Statements">${r.total}</td></tr>`).join('')}</tbody></table>`));
    }
    // Food contact, disposal, safety and the like, as the products' makers state them (each product's are on its card).
    const other = pick(c, f.rows.filter((r) => !r.filterable).flatMap((r) => r.records).filter((e) => !general(e) && readerText(e.finding)).map((e) => ({ ...e, text: e.finding })), 4);
    if (other.length) chem.push(`<p class="sec-p">${esc('On food contact, disposal and safety, as makers state them:')}</p>${quotes(other.map((e) => quote(c, e, { text: e.finding, extra: e.categoryLabel ?? '' })))}`);
    // What guides and references say of the material in general: this page's records, every one.
    const generalSaid = env2.filter(general);
    if (generalSaid.length) chem.push(`<p class="sec-p">${esc(`Of ${m.name} in general:`)}</p>${quotes(generalSaid.map((e) => quote(c, e, { text: e.finding, rec: true, extra: e.categoryLabel ?? '' })))}`);
    if (rows.length) chem.push(`<p class="sec-note">${esc('Makers rarely give the concentration, temperature or duration, so these are indications, not design data. Each product\'s statements are on its card.')}</p>`);
    const poly = c.poly ?? [];
    if (poly.length === 1) {
      // One row of reference data is a sentence, not a table.
      const p0 = poly[0];
      const agents = andList((p0.agents ?? []).map((a) => `${lowerFirst(a.agent)}, ${polymerVerdict(a.verdict)}`));
      chem.push(`<p class="sec-p" data-rec="${esc(p0.id)}">${esc(`Reference data for plain ${p0.polymerId} resin, where no maker of these products speaks: ${lowerFirst(p0.categoryLabel)}, ${polymerVerdict(p0.verdict)}${agents ? ` (${agents})` : ''}. Fillers, pigments and printing change it, so it never stands for these products.`)}</p>`);
    } else if (poly.length) {
      const polymer = poly[0]?.polymerId ?? 'the base polymer';
      chem.push(`<p class="sec-p">${esc(`Where no maker of these products speaks to an exposure, reference data for plain ${polymer} resin is shown. Fillers, pigments and printing change it, so it never stands for these products.`)}</p>`
        + tableBox(`<table class="grid resin"><thead><tr><th scope="col">${esc(`${polymer} resin`)}</th><th scope="col">Verdict</th><th scope="col">Agents</th></tr></thead><tbody>${poly.map((p) => `<tr data-rec="${esc(p.id)}"><th scope="row" class="prop">${esc(p.categoryLabel)}</th><td data-label="Verdict">${esc(polymerVerdict(p.verdict))}</td><td data-label="Agents">${esc(andList((p.agents ?? []).map((a) => `${a.agent} (${polymerVerdict(a.verdict)})`)))}</td></tr>`).join('')}</tbody></table>`));
    }
    if (chem.length) parts.push(subhead('Chemicals and environment') + chem.join(''));
    else if (parts.length) parts.push(subhead('Chemicals and environment') + `<p class="sec-p">${esc('No maker of these products publishes resistance to a named chemical, to water or to sunlight.')}</p>`);
    if (!parts.length) return { empty: true, html: '', stats: {} };
    return { empty: false, html: glue(parts.join('\n')), stats: {} };
  },
};
