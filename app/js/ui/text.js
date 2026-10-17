// Plain-text helpers that every sentence on the page is put together with: a count with its noun, a list in prose, a
// word's first letter in a sentence, and whether a stored cell states anything at all. No vocabulary lives here
// (labels.js holds it) and nothing is escaped (the renderer escapes). They are a module of their own so that labels.js,
// material-words.js and material-facts.js can all use them without importing each other.

/** Whether a stored cell states something: not empty, and not one of the database's missing states ("Not published"). */
export const stated = (v) => v && !/^(not published|not applicable|not stated|not recorded|n\/a)\b/i.test(String(v).trim());

/** A count with its noun: "1 product", "3 products", or the plural given ("2 data sheets"). */
export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

/** The first letter in lower case, inside a sentence; an abbreviation (HDT, PLA) keeps its capitals. */
export const lower = (t) => (/^[A-Z][A-Z]/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));

/** The first letter in upper case, at the start of a sentence. */
export const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/** A list in prose: "a", "a and b", "a, b and c". */
export const andList = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

/** A property name inside a sentence: "glass transition temperature", but "HDT" stays as it is. */
export const inSentence = (name) => (/^[A-Z][a-z]/.test(name) ? name.charAt(0).toLowerCase() + name.slice(1) : name);
