// Plottable axes. Only normalized numeric headline properties appear here, so the picker cannot
// offer a nonsensical pair. "better" drives the Pareto direction.
export const AXIS_DEFS = [
  { key: 'density',           label: 'Density',             unit: 'kg/m³',  better: 'min' },
  { key: 'tensileModulusXY',  label: 'Tensile modulus XY',  unit: 'GPa',    better: 'max' },
  { key: 'tensileStrengthXY', label: 'Tensile strength XY', unit: 'MPa',    better: 'max' },
  { key: 'elongationXY',      label: 'Elongation at break XY', unit: '%',   better: 'max' },
  { key: 'hdt045',            label: 'HDT at 0.45 MPa',     unit: '°C',     better: 'max' },
  { key: 'priceCADkg',        label: 'Price',               unit: 'CAD/kg', better: 'min' },
];
