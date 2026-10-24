// The engine's word lists as values, in the old code's order, so each contract union is derived from one list and
// tests/domain/vocab.test.mjs can hold every list equal to the old code it is copied from (WP-07 type review, finding 3).
// The gate verdicts have their own table (gate-verdict.ts); the six missing-value words are generated (packages/data).

/** A requirement's status: app/js/engine/constraints.js STATUS, its values in key order. */
export const STATUSES = ['PASS', 'FAIL', 'UNKNOWN', 'INDETERMINATE'] as const;

/** The groups a result is listed in, in listing order (D155): constraints.js GROUP_ORDER. */
export const GROUP_ORDER = ['meets', 'one-check-away', 'not-enough-data', 'unlikely-to-meet', 'hidden', 'fail'] as const;

/** How many of a material's judged products pass: products.js SHARE values, in key order. */
export const PRODUCT_SHARES = ['all', 'some', 'none'] as const;

/** The unknown policy: constraints.js UNKNOWN_POLICY values. */
export const UNKNOWN_POLICIES = ['strict', 'exploration'] as const;

/** Which values decide: app/js/engine/products.js EVIDENCE values. */
export const EVIDENCE_LEVELS = ['comparable', 'as-published'] as const;

/** The requirement kinds a scenario may hold: app/js/engine/scenario.js KINDS (validateScenario refuses any other). */
export const SCENARIO_KINDS = ['numeric', 'gate', 'facet', 'environment', 'evidence'] as const;

/** The kinds the engine evaluates: constraints.js evaluateConstraint. 'treatment' is the engine's own, never a scenario's. */
export const CONSTRAINT_KINDS = [...SCENARIO_KINDS, 'treatment'] as const;

/** A numeric requirement's comparison: scenario.js OPERATORS, constraints.js compareInterval. */
export const OPERATORS = ['>=', '<=', '>', '<'] as const;

/** The result views a scenario may open: scenario.js LENSES. */
export const LENSES = ['table', 'ashby', 'parallel', 'coverage', 'compare', 'explain'] as const;

/** The table's column sets: scenario.js COLUMN_SETS. */
export const COLUMN_SETS = ['properties', 'printing'] as const;

/** The chart's views: scenario.js WORKSPACE_VIEWS. */
export const PLOT_VIEWS = ['decision', 'overview', 'catalogue', 'measured', 'measured-mixed'] as const;

/**
 * Why the engine has no value (a result's or a headline's `missing`). Not the six cell words of the schema: the build
 * reads those into build/src/normalize/values.js MISSING (the first five, in its order), and the engine adds its own
 * (constraints.js 'not-comparable', 'other-state'; workspace.js 'no-headline'). A headline's word passes through a
 * result unchanged (`h?.missing ?? 'not-published'`).
 */
export const ENGINE_MISSING = [
  'not-published', 'insufficient-comparable', 'not-applicable', 'quarantined', 'not-available-in-market',
  'not-comparable', 'other-state', 'no-headline',
] as const;
