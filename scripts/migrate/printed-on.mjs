// Is a statement printed on the page a migration cites? The check m136 made before writing each print recipe, shared by
// the migrations that finish its lane (m170 to m174), so every one of them proves its words on the cached, hash-checked
// page the same way.
//
// A page is its cached text's words; a statement is printed there when its words stand on the page in order. A table
// cell can sit beside its label or wrap around it, so a few words of the page may fall between two of the statement's,
// never more. Fullwidth punctuation is compared in its ASCII form (the tables write it so, TEXT-FULLWIDTH), and a word's
// closing punctuation is not part of it, because a statement taken from inside a sentence ends where the sentence goes on.

import { cachedText } from '../lib/pdf-text.mjs';

export const plain = (s) => String(s).replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/\s+/g, ' ').trim();
// A comma the layout left without its space ("For best results,It is recommended") divides two words all the same.
export const words = (s) => plain(s).replace(/,(?=\S)/g, ', ').split(' ').map((w) => w.replace(/[.,;:]+$/, '')).filter(Boolean);

/**
 * A reader of pages for one set of tables: `printed(sourceId, page, statement)` is true when the page prints it.
 * `texts` holds, by SHA-256, the text of documents this machine's cache does not (read from bytes whose digest the
 * caller has checked, as `documentText` would read them).
 */
export function pageReader(t, migration, { texts = new Map() } = {}) {
  const pages = new Map();
  function tokens(sourceId, page) {
    const key = `${sourceId}|${page}`;
    if (!pages.has(key)) {
      const s = t.get('sources', sourceId);
      const text = cachedText(s.SHA256) ?? texts.get(s.SHA256);
      if (!text) throw new Error(`${migration}: ${sourceId} has no cached text for ${s.SHA256}; fetch and extract it first`);
      const p = text.pages.find((x) => x.page === Number(page));
      if (!p) throw new Error(`${migration}: ${sourceId} has no page ${page}`);
      pages.set(key, words(p.lines.map((l) => (typeof l === 'string' ? l : l.text)).join(' ')));
    }
    return pages.get(key);
  }
  return function printed(sourceId, page, statement, gap = 6) {
    const have = tokens(sourceId, page);
    const want = words(statement);
    for (let start = 0; start < have.length; start++) {
      if (have[start] !== want[0]) continue;
      let at = start, ok = true;
      for (const w of want.slice(1)) {
        let k = at + 1;
        while (k < have.length && k - at <= gap + 1 && have[k] !== w) k++;
        if (k >= have.length || have[k] !== w) { ok = false; break; }
        at = k;
      }
      if (ok) return true;
    }
    return false;
  };
}
