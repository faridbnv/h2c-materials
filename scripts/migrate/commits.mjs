// The two commits the migration record is anchored to.
/** main when the migration branched: the last commit whose data was the Excel workbooks. */
export const BASE_COMMIT = '60f7392e2ae3e3c6dce67424a3d05052a1361731';
/** The last migration commit that changed data/tables (m06, the registry). */
export const MIGRATED_COMMIT = '35ba8d2';
/** The conversion from the workbooks: the steps a replay runs. Later mNN scripts change live data. */
export const CONVERSION_STEPS = ['m01-types.mjs', 'm02-headlines.mjs', 'm03-prices.mjs', 'm04-grade-roles.mjs', 'm05-material-links.mjs', 'm06-registry.mjs'];
