// The generic reference workbook's properties: key, unit, and the column offset from its Name column
// (the offset is used only by the legacy workbook extractor).
export const REFERENCE_PROPERTIES = [
  { key: 'density',            unit: 'kg/m3',     offset: 1 },
  { key: 'tensileModulus',     unit: 'GPa',       offset: 3 },
  { key: 'yieldStrength',      unit: 'MPa',       offset: 5 },
  { key: 'tensileStrength',    unit: 'MPa',       offset: 7 },
  { key: 'compressiveStrength',unit: 'MPa',       offset: 9 },
  { key: 'elongation',         unit: '%',         offset: 11 },
  { key: 'fractureToughness',  unit: 'MPa.m^0.5', offset: 13 },
  { key: 'thermalExpansion',   unit: 'um/m/K',    offset: 15 },
];
