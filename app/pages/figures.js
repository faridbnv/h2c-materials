// The scatters a material page draws, product by product: one line each. `x` and `y` are registry headline keys (each
// product's own value, grades[].headline, as the build chose it); `section` is the section it is drawn in. A scatter is
// drawn where two products or more have both values; a new one is a line here and nothing else.
//
// Z against XY needs no line: every comparison whose rows are one property in two orientations (comparisonsOf().pairs)
// draws its own, on one shared scale with the diagonal.

export const FIGURE_PAIRS = [
  { x: 'tensileModulusXY', y: 'tensileStrengthXY', section: 'mechanical' },
  { x: 'priceCADkg', y: 'tensileStrengthXY', section: 'price' },
];
