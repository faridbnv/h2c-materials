// The sentences of the lenses of part 2 and of the exports that are not the engine's (new copy goes here, never into a component template).
/** The chart lenses fetch their library (and the Ashby reference set) when first opened; the Table still works meanwhile. */
export const CHART_LOADING = 'Loading chart';
export const LENS_LOADING = 'Loading this view';
export const CHART_FAILED = {
  heading: 'The chart could not be loaded',
  body: 'The table and the other views still work. Check the connection and try again.',
} as const;
export const RETRY = 'Try again';
/** An export or a brief that could not be written: it waits for the records it cites and writes nothing without them (D103). */
export const exportBlocked = (what: string, why: string): string => `Nothing was written: ${what} cites records that could not all be loaded. ${why} Check the connection and try again.`;
