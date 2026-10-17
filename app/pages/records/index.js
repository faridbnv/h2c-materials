// The tables of a material's records page, in the order of the main page's sections. Each is `{ id, title, noun,
// count(c), render(c) → html }` and lists every record of its kind, raw, grouped, with its ID in its own cell. A new
// table is a file here and a line in this list.
//
// The finder (panel.js) comes first in the page's main column, written by the first table's render: render.js joins the
// tables' HTML and nothing else, so the finder travels with them.

import measurements from './measurements.js';
import profiles from './profiles.js';
import statements from './statements.js';
import environment from './environment.js';
import prices from './prices.js';
import documents from './documents.js';
import reviewNotes from './review-notes.js';
import { filterPanel } from './panel.js';

const TABLES = [measurements, profiles, statements, environment, prices, documents, reviewNotes];

export const RECORD_SECTIONS = TABLES.map((s, i) => (i ? s : {
  ...s,
  render: (c) => `${filterPanel(c, TABLES.map((t) => ({ s: t, n: t.count(c) })))}\n${s.render(c)}`,
}));
