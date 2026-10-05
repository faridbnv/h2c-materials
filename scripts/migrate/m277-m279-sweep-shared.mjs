// Shared by m277–m279, the error-class sweep of 2026-10-01: the agent-read corrections, each checked again here
// against its cached, hash-checked sheet before it is written (D35). An agent proposed each from the sheet text; a guard
// (PM-TRIAL-2026-10-01/data-audit/apply-fixes.mjs) kept a proposal only when its quote was on the sheet, its value in
// the column's vocabulary, the record unchanged, and the edited row passed the typed-value checks.
import { readCsv } from '../../build/src/csv.js';
import { cachedText, repairLigatures } from '../lib/pdf-text.mjs';

export const READ = 'Re-read 2026-10-01 by an agent (Claude Sonnet) against the cached sheet, guard-checked by Claude Opus; error-class sweep';
export const rowsOf = (path) => readCsv(path).records.map((r) => r.values);

const squash = (s) => String(s ?? '').toLowerCase().replace(/℃/g, '°c').replace(/[˚º]/g, '°').replace(/[^a-z0-9°%.,<>≤≥+\-]/g, '');
const texts = new Map();
/**
 * Stop unless every quote (split on " | ") is on the source's cached sheet: in the lines as the extractor grouped them, or, failing
 * that, in the same lines with their ligatures put back (`repaired`: "Prin5ng" is "Printing", pdf-text.mjs repairLigatures). Returns
 * 'line' or 'repaired', the view that bore the quote out.
 */
export function onSheet(t, sourceId, quote, migration) {
  const sha = t.get('sources', sourceId)?.SHA256;
  if (!texts.has(sourceId)) {
    const c = sha ? cachedText(sha) : null;
    const flat = (fix) => squash(c.pages.map((p) => p.lines.map((l) => fix(l.text)).join(' ')).join(' '));
    texts.set(sourceId, c ? { line: flat((x) => x), repaired: flat(repairLigatures) } : null);
  }
  const text = texts.get(sourceId);
  if (!text) throw new Error(`${migration}: no cached text for ${sourceId}; run where the source cache is`);
  let view = 'line';
  for (const q of String(quote).split(' | ')) {
    if (text.line.includes(squash(q))) continue;
    if (text.repaired.includes(squash(q))) { view = 'repaired'; continue; }
    throw new Error(`${migration}: "${q}" is not on ${sourceId}`);
  }
  return view;
}
