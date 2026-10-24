// How far a test condition may sit from a headline's and still be its test (WP-07 shared core).
//
// Faithful copies; tests/domain/tolerances.test.mjs holds each against every old copy on the real build's values.

/**
 * The standard laboratory atmosphere of ISO 291 and ASTM D618 is 23 ± 2 °C (D92). Copies: build/src/products.js:225
 * (TEST_TEMPERATURE_TOLERANCE_C, used by assess at :290 and by compile.js conditionNote at :332) and the literal 2 in
 * app/js/ui/material-facts.js:523 (refusedBy).
 */
export const TEST_TEMPERATURE_TOLERANCE_C = 2;

/**
 * ASTM D648's low load (66 psi, 0.455 MPa) and ISO 75 method B's 0.45 MPa are one test. Copies: build/src/products.js:222
 * (LOAD_TOLERANCE_MPA, assess at :318) and the literal 0.01 in app/js/ui/material-facts.js:532 (refusedBy). A third,
 * different form is the estimate stage's band, below.
 */
export const LOAD_TOLERANCE_MPA = 0.01;

/**
 * The estimate stage reads 0.44 to 0.46 MPa inclusive as the 0.45 MPa test (build/src/estimate/observations.js:113).
 * Not the same test as `offLoad(load, 0.45)` at its two ends in floating point: docs/next/defects.md WP07-D1.
 */
export const ESTIMATE_LOW_LOAD_BAND_MPA = { lo: 0.44, hi: 0.46 } as const;

/**
 * A window whose bottom the H2C covers by at least this many °C is within, at its low end; by less, on the line (D151).
 * build/src/normalize/process.js:11 H2C_LOW_END_C, the only copy (validate.js imports it).
 */
export const H2C_LOW_END_C = 5;

/** A value struck at `measuredC` is not the headline's test at `headlineC` (assess: why 'cold' or 'hot'). */
export const offTestTemperature = (measuredC: number, headlineC: number): boolean => Math.abs(measuredC - headlineC) > TEST_TEMPERATURE_TOLERANCE_C;

/** A value measured at `measuredMPa` is not the headline's test at `headlineMPa` (assess: why 'load'). */
export const offLoad = (measuredMPa: number, headlineMPa: number): boolean => Math.abs(measuredMPa - headlineMPa) > LOAD_TOLERANCE_MPA;

/** The estimate stage's reading of a stated load as the 0.45 MPa heat deflection test. */
export const inEstimateLowLoadBand = (loadMPa: number): boolean => loadMPa >= ESTIMATE_LOW_LOAD_BAND_MPA.lo && loadMPa <= ESTIMATE_LOW_LOAD_BAND_MPA.hi;
