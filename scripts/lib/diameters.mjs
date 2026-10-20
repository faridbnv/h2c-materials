// The filament diameters a product's documents print (D175, the owner's ruling of 2026-10-20): the H2C takes 1.75 mm, and
// a product found only in 2.85 mm stays, with a warning. One reader for the round's scan, its migration (m471) and the
// import (scripts/ingest/apply.mjs), so a grade's Diameter is what its cached documents say, read the same way each time.
//
// A diameter is a number with mm after it, or one a diameter label or sign heads: "1.75 mm", "1,75 ± 0.05mm", "Ø1.75",
// "Diameter 2.85", "1.75 / 2.85 mm". A density of 1.75 g/cm³ or a 1.75 ratio is none.
import { cachedText } from './pdf-text.mjs';

const D175 = /(?<![\d.,])1[.,]75(?!\d)\s*(?:(?:±|\+\/-)\s*[\d.,]+\s*)?(?:mm|㎜)|(?<![\d.,])1[.,]75(?!\d)\s*(?:mm\s*)?(?:\/|and|or|&|,)\s*(?:2[.,]85|3[.,]00?)|[øØ⌀]\s*1[.,]75|diam\w*[^.\n]{0,60}?(?<![\d.,])1[.,]75(?!\d)/i;
const D285 = /(?<![\d.,])2[.,]85(?!\d)\s*(?:(?:±|\+\/-)\s*[\d.,]+\s*)?(?:mm|㎜)|(?<![\d.,])1[.,]75(?!\d)\s*(?:mm\s*)?(?:\/|and|or|&|,)\s*2[.,]85|[øØ⌀]\s*2[.,]85|diam\w*[^.\n]{0,60}?(?<![\d.,])2[.,]85(?!\d)/i;
const D300 = /[øØ⌀]\s*3(?:[.,]00?)?\s*mm|diam\w*[^.\n]{0,40}?(?<![\d.,])3(?:[.,]00?)?\s*mm/i;

/** The page text of a cached document (pdf-text.mjs cachedText), its lines joined. */
export const documentLines = (cached) => cached.pages.map((p) => p.lines.map((l) => l.text).join('\n')).join('\n');

/** The diameters a document's text prints: { mm175, mm285, mm300 }, each the words around the first, or null. */
export function diametersIn(text) {
  const around = (re) => {
    const m = re.exec(text);
    return m ? text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 20).replace(/\s+/g, ' ').trim() : null;
  };
  return { mm175: around(D175), mm285: around(D285), mm300: around(D300) };
}

/**
 * A grade's Diameter (schema/vocab/diameters.csv) from what its documents print and whether a listing prices it (a
 * listing is the 1.75 mm filament by rule, AGENTS.md "Add a price"): "1.75 mm" where any of them gives 1.75 mm, "2.85 mm
 * only" where they give 2.85 mm and none gives 1.75 mm, "3 mm only" where they give 3 mm alone, else "Not published".
 * `found` is diametersIn's reading of each document.
 */
export function diameterCell(found, { priced = false } = {}) {
  if (priced || found.some((f) => f.mm175)) return '1.75 mm';
  if (found.some((f) => f.mm285)) return '2.85 mm only';
  if (found.some((f) => f.mm300)) return '3 mm only';
  return 'Not published';
}

/**
 * Each grade's documents (the sources its grade, measurements, profiles, notes, evidence, claims and listings cite, and
 * those that name it among their Applicable grades), read from the cache, and whether a listing prices it. `table(name)`
 * gives a table's rows. Returns gradeId => { ids, read: [{ id, mm175, mm285, mm300 }], priced }.
 */
export function gradeDocuments(table) {
  const sources = new Map(table('sources').map((s) => [s.SourceID, s]));
  const bySource = new Map();
  const add = (g, s) => {
    if (!g || !s || /^Not /.test(s)) return;
    if (!bySource.has(g)) bySource.set(g, new Set());
    bySource.get(g).add(s);
  };
  for (const g of table('grades')) add(g.GradeID, g.SourceID);
  for (const t of ['measurements', 'profiles', 'profile_notes', 'evidence', 'product_claims', 'prices']) for (const r of table(t)) add(r.GradeID, r.SourceID);
  for (const s of sources.values()) for (const id of String(s['Applicable grades'] ?? '').split(/[;,\s]+/)) if (/^G\d/.test(id)) add(id, s.SourceID);
  const priced = new Set(table('prices').filter((p) => p.Quarantined !== 'TRUE').map((p) => p.GradeID));
  const texts = new Map();
  const textOf = (id) => {
    if (!texts.has(id)) {
      const sha = sources.get(id)?.SHA256;
      const cached = sha && /^[0-9a-f]{64}$/.test(sha) ? cachedText(sha) : null;
      texts.set(id, cached ? documentLines(cached) : null);
    }
    return texts.get(id);
  };
  return (gradeId) => {
    const ids = [...(bySource.get(gradeId) ?? [])].sort();
    const read = ids.map((id) => ({ id, text: textOf(id) })).filter((d) => d.text != null);
    return { ids, read: read.map((d) => ({ id: d.id, ...diametersIn(d.text) })), priced: priced.has(gradeId) };
  };
}
