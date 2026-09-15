// The Standard / load column is free text. Across HDT rows it carries roughly twenty spellings
// for three real states: ISO 75 at 0.45 MPa, ISO 75 at 1.8 MPa, and a bare standard with no load.
// Method sheet, Comparison / Thermal: "Keep HDT load, Tg, Vicat, melting and continuous-service
// ratings distinct." A load that was never stated must stay unstated, never assumed.

const NORMALISE_PUNCT = (s) => String(s)
  .replace(/[，、]/g, ',')   // full-width and ideographic comma
  .replace(/[；]/g, ';')
  .replace(/[–—−]/g, '-')
  .replace(/[℃℉]/g, 'C')   // ℃ ℉ as single glyphs
  .replace(/．/g, '.')
  .replace(/\s+/g, ' ')
  .trim();

// Nominal loads, with the spellings each accepts. 0.455 MPa is ASTM D648's low load and is the
// same test point as ISO's 0.45; 1.80, 1.81, 1.82 and 1.820 are the same high load (MN/m² is MPa).
// A decimal comma is read only beside the unit ("0,45 MPa"), never alone.
// ISO 75-2 names its methods by letter ("ISO 75-2/A", "HDT A"): A is 1.80 MPa, B is 0.45 MPa.
// ASTM D648 states its loads in psi as often as in MPa (66 psi = 0.455 MPa, 264 psi = 1.82 MPa), and older sheets in
// kgf/cm² (4.6 = 0.45 MPa, 18.5 = 1.8 MPa) (audit 2026-09-15, C-08).
const LOAD_CLASSES = [
  { load: 0.45, label: '0.45 MPa', patterns: [/0[.,]45[05]?\s*(?:MPa|MN\s*\/\s*m)/i, /0\.45[05]?(?!\d)/, /ISO\s*75(?:-2)?\s*\/\s*B\b/i, /\bHDT\s*B\b/, /(?<![\d.])66\s*psi/i, /(?<![\d.])4[.,]6\s*kgf/i] },
  { load: 1.8,  label: '1.8 MPa',  patterns: [/1[.,]8(?:[0-2]0?)?\s*(?:MPa|MN\s*\/\s*m)/i, /1\.8(?:[0-2]0?)?(?!\d)/, /ISO\s*75(?:-2)?\s*\/\s*A\b/i, /\bHDT\s*A\b/, /(?<![\d.])264\s*psi/i, /(?<![\d.])18[.,]5\s*kgf/i] },
];

const STANDARDS = [
  { key: 'ISO 75',    re: /ISO\s*75/i },
  { key: 'ASTM D648', re: /ASTM\s*D\s*-?\s*648|D\s*648/i },
];

/**
 * @returns {{standard:string|null, loadMPa:number|null, loadStated:boolean, label:string, text:string}}
 */
export function parseHdtStandard(raw) {
  const text = raw == null ? '' : String(raw).trim();
  const s = NORMALISE_PUNCT(text);
  const standard = STANDARDS.find((x) => x.re.test(s))?.key ?? null;
  // A text naming both loads says which row it belongs to no more than one naming neither: it used to resolve to 0.45.
  const named = LOAD_CLASSES.filter((c) => c.patterns.some((p) => p.test(s)));
  const [c] = named.length === 1 ? named : [];
  return {
    standard,
    loadMPa: c?.load ?? null,
    loadStated: !!c,
    label: c?.label ?? (named.length > 1 ? 'both loads named' : 'load not stated'),
    ambiguous: named.length > 1,
    text,
  };
}
