// tidy: a computed number rounded to 12 significant figures, so 0.1 + 0.2 reads 0.3 (WP-07 shared core).
//
// One body for the four old copies, each `const tidy = (x) => Number(x.toPrecision(12));`:
//   build/src/products.js:697, app/js/engine/ledger.js:15 (exported; evidence-ledger.js:37 imports it),
//   app/js/engine/constraints.js:335, app/js/ui/print-spread.js:25.
// tests/domain/tidy.test.mjs holds it equal to every copy on every number of a real build.

/** `x` to 12 significant figures. NaN and ±Infinity pass through; -0 becomes 0. */
export const tidy = (x: number): number => Number(x.toPrecision(12));
