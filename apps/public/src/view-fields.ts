// What the selector's first screen reads beyond what the engine reads (WP-26). The engine's inputs (CORE_FIELDS, @atlas/domain) are what a
// DECISION needs; the table that shows the decisions, and the rail that sets them, also print each material's typical value and range, the
// registry's labels and the counts that sentences quote. None of that decides anything, so it is declared here, apart from the engine's list,
// and the core part carries both (tools/shards.ts merges them). A reader of this file can see what the page costs at first paint.
//
// The headline columns are the table's (the registry's `tableColumn` flag): a test holds this list equal to the registry's, so a column added
// to the table without its fields here is a failed test, not a blank cell. Every other headline's display fields travel in the material's
// detail part, which the drawer loads when it opens.
import type { FieldSpec } from '@atlas/publish/shards';

/** The registry keys the table draws as columns. */
export const TABLE_HEADLINES = ['density', 'tensileModulusXY', 'tensileStrengthXY', 'elongationXY', 'hdt045', 'priceCADkg'] as const;

/**
 * One headline of a material as a table cell prints it: the median and its spread, the interval a bound reads from, the
 * measurement behind it, a converted price's currencies, and the nearest value on file for a headline with none of its own.
 * Not here: the estimate (the estimates part), the missing state's sentence, the lists of every related value, the observations.
 */
const CELL: FieldSpec = {
  assumption: true,
  caveat: true,
  converted: true,
  from: true,
  interval: true,
  loadStated: true,
  measurementId: true,
  origin: true,
  related: { count: true, grades: true, best: { direction: true, implausible: true, interval: true, measurementId: true, property: true, unit: true, value: true, why: true } },
  spread: true,
  typical: { interval: true, measurementId: true, value: true },
  uncertainty: true,
  value: true,
};

/** The declaration, in the shape of the database (merged with CORE_FIELDS by tools/shards.ts). */
export const VIEW_FIELDS: FieldSpec = {
  materials: { headline: Object.fromEntries(TABLE_HEADLINES.map((key) => [key, CELL])) },
  meta: {
    counts: true,
    estimateModel: { levels: true },
    h2cBaseline: true,
    headlineCoverage: true,
    priceSample: true,
    pricesSampled: true,
  },
  // The rail's filters and labels, the table's columns and the units are the registry's headlines: all of each. The rest of the registry (the
  // properties, the comparisons the drawer draws, the relations) is the drawer's, and comes with the shared part.
  registry: { headlines: true },
};
