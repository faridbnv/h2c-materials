// Dates as a person reads them, and the one provenance line both surfaces print (coherence round, 2026-10-18, C01-C03):
// "13 Sep 2026" wherever a person reads a date, ISO only where a machine reads one (exports, saved scenarios, file names).

import type { Loose } from '../loose.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** An ISO date as a person reads it: "13 Sep 2026" (anything else is returned as it is). */
export const dayWords = (iso: Loose) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(String(iso ?? '')); return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : String(iso ?? ''); };
/** Two dates as a span: "10 Sep–5 Oct 2026", one date where both are one. */
export function daysWords(a: Loose, b: Loose) {
  if (!a || a === b) return dayWords(a ?? b);
  const [x, y] = [dayWords(a), dayWords(b)];
  return a.slice(0, 4) === b.slice(0, 4) ? `${x.replace(/ \d{4}$/, '')}–${y}` : `${x}–${y}`;
}

/** When the documents behind a set of sources were read: `{ from, to }` over their access dates (ISO), or null. */
export function documentsRead(sources: Loose): Loose {
  const days = (sources ?? []).map((s: Loose) => s?.accessDate).filter((d: Loose) => /^\d{4}-\d\d-\d\d/.test(String(d ?? ''))).map((d: Loose) => String(d).slice(0, 10)).sort();
  return days.length ? { from: days[0], to: days.at(-1) } : null;
}

/**
 * The provenance line, the same words on the selector's status bar and the pages' closing line: "release 3cc2e5f2a439 ·
 * documents read 10 Sep–5 Oct 2026". The selector had printed "data 2026-09-21", a snapshot's name that read as a date
 * of the data older than the documents.
 */
export const provenanceWords = (release: Loose, read: Loose) => [release ? `release ${release}` : null, read ? `documents read ${daysWords(read.from, read.to)}` : null].filter(Boolean).join(' · ');
