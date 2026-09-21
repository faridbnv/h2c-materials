// The test standards a measurement's "Standard / load" text names.
//
// That column is the source's own words and holds 301 spellings across this snapshot: "ISO 527, GB/T 1040",
// "ISO527,GB/T1040", "ISO 527-2/50", "D 638", "ISO 179-1/1eA:2010". They are the same handful of tests, so a
// question like "which Charpy values are comparable" could not be asked of the column, and the only typed thing
// read out of it was the HDT load (D49). Standards is the typed list beside it, checked against this reader on
// every build (PARSE-MISMATCH), the pattern every other decided value follows.
//
// A standard is read at family level: ISO 527-2/50 and ISO 527-1 are both ISO 527, because the part and the
// specimen speed are conditions of one test, and the row's own columns carry the conditions. Nothing is inferred:
// a text that names no standard reads as none, which is what a melt-flow condition ("210 °C, 2.16 kg") or a
// study's own method does.

// The spellings that are one standard family. A bare "D 638" is ASTM's, which is how several sheets print it.
const BODIES = [
  { body: 'ISO', re: /\bISO\s*-?\s*(\d+)/gi },
  { body: 'ASTM', re: /\bASTM\s*-?\s*([A-Z])\s*-?\s*(\d+)/gi },
  { body: 'GB/T', re: /\bGB\s*\/?\s*T\s*-?\s*(\d+(?:\.\d+)?)/gi },
  { body: 'IEC', re: /\bIEC\s*-?\s*(\d+)/gi },
  // ASTM's designations printed without the body, as "D 638" or "D638" at a word boundary.
  { body: 'ASTM', re: /(?:^|[^A-Za-z0-9/])([DE])\s*-?\s*(\d{3,4})\b/g, bare: true },
];

// GB/T sub-parts that are the same test as their parent: GB/T 1040.4 is GB/T 1040. Kept explicit rather than
// stripping every decimal, because GB/T 531.1 is the designation the sources print, and its parent is not in use.
const GB_PARENT = new Set(['1040.1', '1040.4', '3682.1']);

const NORMALISE = (s) => String(s ?? '')
  .replace(/[，、]/g, ',').replace(/[；]/g, ';').replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim();

/**
 * Every standard the text names, in the vocabulary's spelling, deduplicated and in the order they appear.
 * A text naming none returns [].
 */
export function readStandards(raw) {
  const text = NORMALISE(raw);
  if (!text || text === 'Not published') return [];
  const found = [];
  const at = new Map();
  for (const { body, re, bare } of BODIES) {
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      // A bare "D 638" inside "ASTM D638" is the same match; the ASTM pattern already took it.
      if (bare && /ASTM\s*-?\s*$/i.test(text.slice(0, m.index + m[0].indexOf(m[1])))) continue;
      let number = body === 'ASTM' ? `${m[1].toUpperCase()}${m[2]}` : m[1];
      if (body === 'GB/T' && GB_PARENT.has(number)) number = number.split('.')[0];
      const name = `${body} ${number}`;
      if (!at.has(name)) { at.set(name, m.index); found.push(name); }
    }
  }
  // DSC and TGA are methods, not standards, and several sheets name one where a standard would go: a melting
  // point "DSC, 10 °C/min" and a decomposition temperature "TGA, 20 °C/min". Each is recorded only where no
  // standard is named beside it — ISO 11357 and ASTM D3418 are DSC, and saying both adds nothing.
  if (!found.length && /\bDSC\b/i.test(text)) found.push('DSC');
  if (!found.length && /\bTGA\b/i.test(text)) found.push('TGA');
  return found.sort((a, b) => at.get(a) - at.get(b) || a.localeCompare(b));
}
