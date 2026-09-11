// Performance indices for the Ashby workspace.
//
// Derivation and slopes follow Materials Selection in Mechanical Design, section 5.3, via the
// Materials Wiki. The method: write the objective, eliminate the free variable using the
// constraint, and read off the group of material properties to be maximised.
//
// On log-log axes an index of the form  M = P^n / rho  is a straight line. Taking logs:
//     log P = (1/n) log rho + (1/n) log M
// so the selection line has slope 1/n, and moving it up or down changes M without changing slope.
// The wiki states the beam case directly: "A guideline of slope 2 is drawn on the diagram; it
// defines the slope of the grid of lines for values of E^(1/2)/rho."
//
// Two caveats belong on every card and are carried in the data, not left to the UI to remember.

export const STRENGTH_CAVEAT =
  'Derived for the elastic limit. This database records most strength as tensile strength with an '
  + 'unspecified endpoint, so the card names the endpoint actually used.';

export const ANISOTROPY_CAVEAT =
  'Index theory assumes an isotropic material. FDM parts are not isotropic: PA6-CF measures '
  + '4.43 GPa in XY against 2.17 GPa in Z. An index computed from XY headlines is valid only for '
  + 'in-plane loading.';

/**
 * @typedef {object} Index
 * @property {string} id
 * @property {string} designCase   function, objective and constraint, in words
 * @property {string} formula
 * @property {string} numerator    headline key on the Y axis
 * @property {number} exponent     n in P^n / rho
 * @property {boolean} costForm    divide by price x density instead of density
 * @property {number} slope        slope of the selection line on log-log P vs rho axes
 */
export const INDICES = [
  {
    id: 'tie-stiffness',
    designCase: 'Tie, minimum mass, stiffness prescribed',
    formula: 'E / rho', numerator: 'tensileModulusXY', exponent: 1, costForm: false, slope: 1,
    note: 'Specific stiffness. A tie carries axial tension; the section area is free.',
    caveats: [ANISOTROPY_CAVEAT],
  },
  {
    id: 'beam-stiffness',
    designCase: 'Beam, minimum mass, stiffness prescribed',
    formula: 'E^(1/2) / rho', numerator: 'tensileModulusXY', exponent: 0.5, costForm: false, slope: 2,
    note: 'Holds for any cross-section shape so long as the shape is held constant.',
    caveats: [ANISOTROPY_CAVEAT],
  },
  {
    id: 'panel-stiffness',
    designCase: 'Panel, minimum mass, stiffness prescribed',
    formula: 'E^(1/3) / rho', numerator: 'tensileModulusXY', exponent: 1 / 3, costForm: false, slope: 3,
    note: 'A flat slab of specified length and width, loaded in bending, thickness free.',
    caveats: [ANISOTROPY_CAVEAT],
  },
  {
    id: 'tie-strength',
    designCase: 'Tie, minimum mass, strength prescribed',
    formula: 'sigma / rho', numerator: 'tensileStrengthXY', exponent: 1, costForm: false, slope: 1,
    note: 'Specific strength.',
    caveats: [STRENGTH_CAVEAT, ANISOTROPY_CAVEAT],
  },
  {
    id: 'beam-strength',
    designCase: 'Beam, minimum mass, strength prescribed',
    formula: 'sigma^(2/3) / rho', numerator: 'tensileStrengthXY', exponent: 2 / 3, costForm: false, slope: 1.5,
    caveats: [STRENGTH_CAVEAT, ANISOTROPY_CAVEAT],
  },
  {
    id: 'panel-strength',
    designCase: 'Panel, minimum mass, strength prescribed',
    formula: 'sigma^(1/2) / rho', numerator: 'tensileStrengthXY', exponent: 0.5, costForm: false, slope: 2,
    caveats: [STRENGTH_CAVEAT, ANISOTROPY_CAVEAT],
  },
  {
    id: 'beam-stiffness-cost',
    designCase: 'Beam, minimum material cost, stiffness prescribed',
    formula: 'E^(1/2) / (Cm x rho)', numerator: 'tensileModulusXY', exponent: 0.5, costForm: true, slope: 2,
    note: 'Material cost only. Shaping, joining and finishing are not included.',
    caveats: [ANISOTROPY_CAVEAT, 'Price is available for 40 of 102 materials.'],
  },
  {
    id: 'tie-strength-cost',
    designCase: 'Tie, minimum material cost, strength prescribed',
    formula: 'sigma / (Cm x rho)', numerator: 'tensileStrengthXY', exponent: 1, costForm: true, slope: 1,
    caveats: [STRENGTH_CAVEAT, ANISOTROPY_CAVEAT, 'Price is available for 40 of 102 materials.'],
  },
];

export const indexById = (id) => INDICES.find((i) => i.id === id) ?? null;

/** Compute M for one material. Returns null when any needed headline is missing. */
export function indexValue(material, index) {
  const p = material.headline?.[index.numerator];
  const rho = material.headline?.density;
  if (!p?.known || !rho?.known) return null;
  let denominator = rho.value;
  if (index.costForm) {
    const price = material.headline?.priceCADkg;
    if (!price?.known) return null;
    denominator = price.value * rho.value;
  }
  if (!(denominator > 0) || !(p.value > 0)) return null;
  return Math.pow(p.value, index.exponent) / denominator;
}

/**
 * The selection line for a given M, as two points in data space, ready for a log-log plot.
 * Solving M = P^n / rho for P gives  P = (M x rho)^(1/n).
 */
export function selectionLine(index, M, rhoRange) {
  const at = (rho) => Math.pow(M * rho, 1 / index.exponent);
  const [lo, hi] = rhoRange;
  return [{ x: lo, y: at(lo) }, { x: hi, y: at(hi) }];
}

/** How many candidates sit on the better side of the line. */
export function countAbove(materials, index, M) {
  return materials.reduce((n, m) => {
    const v = indexValue(m, index);
    return v !== null && v >= M ? n + 1 : n;
  }, 0);
}

/** Rank candidates by an index, for the card's own shortlist. */
export function rankByIndex(materials, index) {
  return materials
    .map((m) => ({ material: m, value: indexValue(m, index) }))
    .filter((r) => r.value !== null)
    .sort((a, b) => b.value - a.value);
}
