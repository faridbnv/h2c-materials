// Shared by m277–m279, the error-class sweep of 2026-10-01: the agent-read corrections, each checked again here
// against its cached, hash-checked sheet before it is written (D35). An agent proposed each from the sheet text; a guard
// (PM-TRIAL-2026-10-01/data-audit/apply-fixes.mjs) kept a proposal only when its quote was on the sheet, its value in
// the column's vocabulary, the record unchanged, and the edited row passed the typed-value checks.
import { readCsv } from '../../build/src/csv.js';
import { cachedText } from '../lib/pdf-text.mjs';

export const READ = 'Re-read 2026-10-01 by an agent (Claude Sonnet) against the cached sheet, guard-checked by Claude Opus; error-class sweep';
export const rowsOf = (path) => readCsv(path).records.map((r) => r.values);

const squash = (s) => String(s ?? '').toLowerCase().replace(/℃/g, '°c').replace(/[˚º]/g, '°').replace(/[^a-z0-9°%.,<>≤≥+\-]/g, '');
const texts = new Map();
/** Stop unless every quote (split on " | ") is on the source's cached sheet. */
export function onSheet(t, sourceId, quote, migration) {
  const sha = t.get('sources', sourceId)?.SHA256;
  if (!texts.has(sourceId)) { const c = sha ? cachedText(sha) : null; texts.set(sourceId, c ? squash(c.pages.map((p) => p.lines.map((l) => l.text).join(' ')).join(' ')) : null); }
  const text = texts.get(sourceId);
  if (!text) throw new Error(`${migration}: no cached text for ${sourceId}; run where the source cache is`);
  for (const q of String(quote).split(' | ')) if (!text.includes(squash(q))) throw new Error(`${migration}: "${q}" is not on ${sourceId}`);
}
