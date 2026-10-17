// The tables of a material's records page, in the order of the main page's sections. Each is `{ id, title, noun,
// count(c), render(c) → html }` and lists every record of its kind, raw, with its ID in its own cell. A new table is a
// file here and a line in this list.

import measurements from './measurements.js';
import profiles from './profiles.js';
import statements from './statements.js';
import environment from './environment.js';
import prices from './prices.js';
import documents from './documents.js';
import reviewNotes from './review-notes.js';

export const RECORD_SECTIONS = [measurements, profiles, statements, environment, prices, documents, reviewNotes];
