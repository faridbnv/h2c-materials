// The colophon at the foot of a material's two pages (the pages reimagined, 2026-10-17; a band since the coherence round,
// C31): what the numbers are and are not (method.csv, Transferable allowables), the same ways out as every page (the way
// back to the selector, the material's other page, every material) and the method page; then who wrote the summary and
// its status in one sentence, the citation with buttons that copy it and print the page; and the closing line every page
// ends with (shell.js signOff). Nothing else: the bar is the way around.

import type { Loose } from '../loose.ts';

import { esc, overviewHref, productsHref } from '../html.ts';
import { fmtNumber } from '../facts/format.ts';
import { stated, isProduct } from '../facts/material-facts.ts';
import { SUMMARY_STATUS } from '../facts/labels.ts';
import { dayWords, daysWords, documentsRead } from '../facts/dates.ts';
import { selectorLink } from './common.ts';
import { BRAND, ICON, returnLink, siteFooter } from '../shell.ts';

/** When a material's documents were read: the span of their access dates, which is what dates its values. */
export function readSpan(c: Loose): Loose {
  const dates = [...c.documents.keys()].map((sid) => c.sourceById.get(sid)?.accessDate).filter(stated).sort();
  return dates.length ? { from: dates[0], to: dates.at(-1) } : null;
}

/**
 * How the summary's review status is said in the colophon (SUMMARY_STATUS keys), in a reader's words; the page checks
 * (test/pages.check.js P12) read the same words.
 */
export const SUMMARY_REVIEW_WORDS: Record<string, Loose> = { draft: 'has not yet been reviewed', 'reviewed by the owner': 'has been reviewed by the owner', revise: 'is marked for revision' };

/**
 * Who wrote a summary, from its Written by ("Claude Opus (agent)", "Claude Sonnet (agent), revised by Claude Opus
 * (agent)"): `{ verb, who }`, "drafted" by "an AI agent (Claude Opus)", "drafted and revised" by "AI agents (Claude
 * Sonnet, then Claude Opus)", or "written" by the names as recorded.
 */
export function summaryAuthors(by: Loose): Loose {
  const names = String(by ?? '').split(/,\s*revised by\s+/i).map((x) => x.trim()).filter(Boolean);
  const agents = names.map((x) => /^(.+?)\s*\(agent\)$/i.exec(x)?.[1] ?? null);
  if (names.length && agents.every(Boolean)) {
    return agents.length === 1 ? { verb: 'drafted', who: `an AI agent (${agents[0]})` } : { verb: 'drafted and revised', who: `AI agents (${agents.join(', then ')})` };
  }
  return { verb: 'written', who: names.join(', revised by ') || 'an author not recorded' };
}

/** The colophon's one sentence on the summary: who wrote it, when (the page's date form) and its review status. */
export function summaryNote(w: Loose) {
  const a = summaryAuthors(w.by);
  return `The summary above was ${a.verb} by ${a.who} on ${dayWords(w.on)} and ${SUMMARY_REVIEW_WORDS[w.status] ?? String((SUMMARY_STATUS as Record<string, Loose>)[w.status] ?? w.status).toLowerCase()}.`;
}

/** The colophon of a material's page; `page` is the page it closes, 'overview' or 'products'. */
export function colophon(c: Loose, env: Loose, page = 'overview') {
  const m = c.m;
  const st = env.stamps;
  const standing = c.db.method?.find((r: Loose) => r.topic === 'Transferable allowables')?.rule;
  const read = readSpan(c);
  const cite = `${m.name}. ${BRAND}, material pages, release ${st.release}${read ? `, documents read ${daysWords(read.from, read.to)}` : ''}.`;
  const w = m.written;
  const byline = w?.parts?.length && page === 'overview' ? summaryNote(w) : null;
  const n = c.grades.filter(isProduct).length;
  const other = page === 'overview'
    ? `<a class="btn" href="${esc(productsHref(m.id))}">Products <span class="n">${esc(fmtNumber(n))}</span></a>`
    : `<a class="btn" href="${esc(overviewHref(m.id))}">${esc(`${m.name} overview`)}</a>`;
  const index = env.links?.index ? `<a class="btn" href="${esc(env.links.index)}">All materials</a>` : '';
  const fine = `<div class="col-fine">
${byline ? `<p class="col-summary" data-written-status="${esc(w.status)}">${esc(byline)}</p>` : ''}
<p class="col-cite"><span>To cite this page: </span><span data-cite>${esc(cite)}</span></p>
<p class="col-acts"><button type="button" class="btn btn-quiet" data-copy hidden>${ICON.copy}<span>Copy the citation</span></button><button type="button" class="btn btn-quiet" data-print hidden>${ICON.print}<span>Print this page</span></button></p>
</div>`;
  return siteFooter({ stamps: st, read: documentsRead(c.db.sources), standing, nav: [returnLink(selectorLink(c, env)), other, index], methodHref: env.methodHref, fine });
}

export default {
  id: 'footer',
  title: null,
  render(c: Loose, env: Loose): Loose {
    return { html: colophon(c, env, 'overview'), empty: false, stats: {} };
  },
};
