// The generic reference envelopes' properties: key and unit (data/tables/reference.csv has a min and max
// column for each), and the column offset the retired reference workbook used (legacy extractor only).
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
