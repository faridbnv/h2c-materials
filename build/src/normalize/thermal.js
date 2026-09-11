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
// same test point as ISO's 0.45; 1.80 and 1.82 are the same high load.
const LOAD_CLASSES = [
  { load: 0.45, label: '0.45 MPa', patterns: [/0\.455?\s*MPa/i, /0\.455?(?!\d)/] },
  { load: 1.8,  label: '1.8 MPa',  patterns: [/1\.8[02]?\s*MPa/i, /1\.8[02]?(?!\d)/] },
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
  let loadMPa = null, label = null;
  for (const c of LOAD_CLASSES) {
    if (c.patterns.some((p) => p.test(s))) { loadMPa = c.load; label = c.label; break; }
  }
  return {
    standard,
    loadMPa,
    loadStated: loadMPa !== null,
    label: label ?? 'load not stated',
    text,
  };
}

// Thermal properties that must never be collapsed into one another.
export const THERMAL_PROPERTIES = [
  'HDT', 'Glass transition temperature', 'Vicat softening temperature',
  'Melting temperature', 'Crystallization temperature',
];
