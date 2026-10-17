// The tables' script as page.js carries it (render.js buildAssets): app/pages/assets/tables.src.js without its comment
// lines and indentation (the page script has a size budget, budget.js), with format.js's fmtNumber in place of its
// marker, so a number the script writes (a group's median as a filter changes it) reads as every number the build wrote.
// The source has no template literal and no string or regular expression that spans a line or starts one with //, so
// dropping whole comment lines and leading spaces leaves its code as it was.

import { fmtNumber } from '../js/ui/format.js';

const MARKER = '/* fmtNumber */ null';

/** The script from its source text; throws where the source lacks the marker, so the page never ships without numbers. */
export function tablesScript(src) {
  if (!src) return '';
  if (!src.includes(MARKER)) throw new Error('tables.src.js: the fmtNumber marker is missing');
  const head = src.match(/^\/\*[\s\S]*?\*\/\n/)?.[0] ?? '';
  const code = src.slice(head.length).replace(MARKER, () => String(fmtNumber));
  return `/* app/pages/assets/tables.src.js */\n${code.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).join('\n')}\n`;
}
