// The lists' script as page.js carries it (render.js buildAssets): app/pages/assets/products.src.js (the Products page's
// search and sort, the index's search) without its comment lines and indentation (the page script has a size budget,
// budget.js), with format.js's fmtNumber in place of its marker where the source has one, so a number the script writes
// reads as every number the build wrote. The source has no template literal and no string or regular expression that
// spans a line or starts one with //, so dropping whole comment lines and leading spaces leaves its code as it was.

import { fmtNumber } from '../js/ui/format.js';

const MARKER = '/* fmtNumber */ null';

/** The script from its source text ('' where there is none). */
export function productsScript(src) {
  if (!src) return '';
  const head = src.match(/^\/\*[\s\S]*?\*\/\n/)?.[0] ?? '';
  const code = src.slice(head.length).replace(MARKER, () => String(fmtNumber));
  return `/* app/pages/assets/products.src.js */\n${code.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).join('\n')}\n`;
}

/**
 * The frame's script as page.js carries it: app/pages/assets/page.js with its opening comment kept and, after it, its
 * comment lines and indentation dropped, as the lists' script is (the coherence round's footer and way back took the
 * file over its budget). The source holds no template literal and no string or regular expression that spans a line
 * or starts one with //.
 */
export function pageScript(src) {
  if (!src) return '';
  const head = src.match(/^\/\*[\s\S]*?\*\/\n/)?.[0] ?? '';
  return `${head}${src.slice(head.length).split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).join('\n')}\n`;
}

/** The old name, for a caller not yet moved. */
export const tablesScript = productsScript;
