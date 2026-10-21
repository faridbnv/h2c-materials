// The sentences of this view that are not the engine's. New copy goes here, never into a component template (interface rule:
// one vocabulary). Written for one reader, an engineer: the answer first, data-sheet terms, no record identifiers in a sentence.
import type { Counts, GroupCount, ProductCounts, Verdict } from './model.ts';
import { GROUP_WORD } from './words.ts';

export const SITE = 'Filament Atlas';
export const SKIP = 'Skip to results';
export const BACK = 'Back to the results';
export const MATERIAL_PAGE = 'Open the full page for this material';

export const headline = (pass: number, total: number): string =>
  `${pass} of ${total} ${total === 1 ? 'material' : 'materials'} ${pass === 1 ? 'meets' : 'meet'} every requirement`;

export const STRICT = 'Strict: a requirement with no data is never counted as met.';

/** The words after each count in the legend under the proportion bar, and the bar's spoken form. */
export const COUNT_WORD: Readonly<Record<Verdict, string>> = { PASS: 'meet every requirement', UNKNOWN: 'could not be settled', FAIL: 'fail a requirement' };
export const barLabel = (c: Counts): string => `${c.pass} ${COUNT_WORD.PASS}, ${c.unknown} ${COUNT_WORD.UNKNOWN}, ${c.fail} fail`;

export const unsettledLine = (count: number, groups: readonly GroupCount[]): string =>
  `Of the ${count} that could not be settled: ${groups.map((g) => `${g.count} ${GROUP_WORD[g.group].toLowerCase()}`).join(', ')}.`;

/** Headings, labels and column heads. */
export const UI = {
  release: 'Release', unknownRelease: 'unknown', dataOf: 'Data of', asks: 'What this template asks', notChecked: 'Not checked.', materials: 'Materials', products: 'Products', requirements: 'Requirements',
  tableCaption: 'Every material, grouped by how far it meets the template, nearest first',
  columns: { material: 'Material', verdict: 'Verdict', products: 'Products that meet every requirement', best: 'Best product', requirement: 'Requirement', result: 'Result', why: 'Why' },
} as const;
export const requirementsFor = (product: string): string => `Requirements for ${product}`;

export const REQUIRED = 'required';
export const REPORTED = 'reported, not required';

/** "2 of 17": the products of a material that meet every requirement. */
export const productsMeeting = (c: ProductCounts): string => `${c.pass} of ${c.products}`;
export const productsWithoutData = (c: ProductCounts): string => `${c.untested} without data`;
export const NO_PRODUCTS = 'No product on record; judged on the material\'s own figures';

export const productsSentence = (c: ProductCounts): string =>
  `${c.pass} of ${c.products} products meet every requirement, ${c.fail} fail one and ${c.untested} could not be settled.`;

export const READING = {
  heading: 'How to read this',
  verdicts: 'A material is judged by its products. It meets every requirement only if the evidence on record settles each requirement in its favour. A requirement the sheets do not answer is not assumed to be met: the material is listed as one that could not be settled, and says what is missing.',
  release: 'The release identifier is a digest of the data, the rules and the engine that produced this page. Two pages with the same release give the same answers; a saved link or file from another release may not.',
  firstSlice: 'This is a first slice of the rebuilt site: one template, one result list and an explanation for each material. The selector and the material pages stay where they are.',
} as const;

export const STALE = {
  heading: 'A newer version was published',
  body: 'This page is older than the data on the server, so it will not show a result that might not match. Reload to get the current version.',
} as const;

export const FAILED = {
  heading: 'The results could not be loaded',
  body: 'Nothing is shown rather than part of an answer. Check the connection and reload.',
} as const;

export const RELOAD = 'Reload';
export const LOADING = 'Loading the results';
export const unexpectedStop = (why: string): string => `Something unexpected stopped the page: ${why}`;
export const NO_MATERIAL = 'This release has no material at that address. Go back to the results and pick one from the list.';
