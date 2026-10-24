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
/** The same, when the page itself is older than the data on the server (a part of its release is gone): the page reloads once, or says so and offers it. */
export const exportStale = (what: string, reloading: boolean): string => (reloading
  ? `Nothing was written: ${what} could not be made because a newer version was published. Reloading; your selection is kept in the address. Then try again.`
  : `Nothing was written: ${what} could not be made because this page is older than the data on the server. Reload the page to get the current version, then try again. Your selection is kept in the address.`);
