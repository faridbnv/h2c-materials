// The tables of a material's records page, in the order of the main page's sections. Each is `{ id, title, noun,
// count(c), render(c) → html }` and lists every record of its kind, raw, grouped, with its ID in its own cell. A new
// table is a file here and a line in this list.
//
// Since the pages were reimagined (2026-10-17) the records page is a stub (stub.js) and its finder has gone: a product's
// records are in its card on the Products page (products/card.js), which reuses these tables' helpers (common.js) and
// the measurements' drawn index (measurements.js drawnIndex). The tables stay for whoever wants every record of a type.

import measurements from './measurements.js';
import profiles from './profiles.js';
import statements from './statements.js';
import environment from './environment.js';
import prices from './prices.js';
import documents from './documents.js';
import reviewNotes from './review-notes.js';

const TABLES = [measurements, profiles, statements, environment, prices, documents, reviewNotes];

export const RECORD_SECTIONS = TABLES;
