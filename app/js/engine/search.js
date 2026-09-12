// Free-text search over the catalogue.
//
// Pure, and its own module, because the obvious implementation is wrong in a way that is very hard
// to see: a bare substring test for "PLA" matches "Thermoplastic Polyurethane", so searching for
// the most common filament on earth returned every TPU and TPE in the database. "pla" sits inside
// "thermoPLAstic", and nothing about the result looks like a bug — it looks like the tool thinks
// TPU is a kind of PLA.
//
// So matching is by word, not by substring. Each field is split into words, and a query term has to
// begin one of them. That keeps every search a person actually types working — "pa6" finds PA6-CF,
// "cf" finds every carbon-filled grade, "95" finds TPU 95A, "support" finds the support materials —
// while a term can no longer surface a material because it happens to sit inside a longer word.

const WORD_RE = /[a-z0-9]+/g;

/** Lowercase word tokens of one value. Punctuation, slashes and dashes are separators. */
export const words = (value) => String(value ?? '').toLowerCase().match(WORD_RE) ?? [];

/**
 * Everything a material can be found by. Identity only: what it is called and what it is made of.
 * Property values are not searchable, because a number reached by typing it is a filter, and the
 * filter rail is where a number belongs.
 */
export function searchableWords(material) {
  const out = [];
  for (const field of [material.name, material.fullName, material.abbreviation,
    material.family, material.basePolymer, material.modifier]) {
    out.push(...words(field));
  }
  for (const id of material.gradeIds ?? []) out.push(...words(id));
  return out;
}

/**
 * Does this material match the query?
 *
 * Every term must match, so adding a word narrows. A term matches when some word of the material
 * begins with it.
 */
export function matchesQuery(material, query) {
  const terms = words(query);
  if (!terms.length) return true;
  const hay = searchableWords(material);
  return terms.every((term) => hay.some((w) => w.startsWith(term)));
}
