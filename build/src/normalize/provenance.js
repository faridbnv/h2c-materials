// Every value the app displays carries where it came from, so the UI can render a published
// number differently from one a regular expression recovered out of free text.
export const ORIGIN = {
  SOURCE: 'source',   // taken verbatim from a workbook cell
  PARSED: 'parsed',   // recovered from free text by a parser in this directory
  DERIVED: 'derived', // computed from other fields
};

export const tag = (origin, value, extra = {}) => (value == null ? null : { origin, ...extra, value });
export const fromSource = (value, extra) => tag(ORIGIN.SOURCE, value, extra);
export const fromParse = (value, extra) => tag(ORIGIN.PARSED, value, extra);
export const derived = (value, extra) => tag(ORIGIN.DERIVED, value, extra);
