// Where the import pipeline keeps its live state, in one place (A07, the review of 2026-09-27).
//
// The pipeline grew inside one campaign, and its working files are still where that campaign put them: the ledger,
// the rulings, the readings and the batch folders under docs/audits/2026-09-18-v2-import, the proposals under
// archive/ingest-2026-09-18/proposals (archive.mjs says why they moved), and the documents themselves under .cache/,
// by digest. Those are not history to be left alone: every ingest command reads and writes them. Every script names
// them from here, so the defaults below are the places they have always been, and a later campaign can run under a
// root of its own without touching the one that brought in V2.
//
//   H2C_INGEST_ROOT     the campaign folder: ledger.csv, rulings/, readings/, batches/, census/, the generated reports
//   H2C_PROPOSALS       the proposals folder; under a campaign root of its own, <root>/proposals unless this says
//   H2C_DOCUMENT_CACHE  the document cache: sources/by-sha/<sha>.<ext> (the bytes), sources/<SourceID>.pdf (documents
//                       registered before the pipeline), text/<sha>.json (their text), pages/ and ocr/. The bytes and
//                       their text move together: the text is keyed by the digest of the bytes beside it.
//
// A relative value is read against the project root. The build's own cache (.cache/build, build/src/build-cache.js)
// is not a document cache and does not move with these.

import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const env = (name) => process.env[name]?.trim() || null;
const at = (value) => resolve(projectRoot, value);

/** The campaign folder, absolute. */
export const INGEST_ROOT = at(env('H2C_INGEST_ROOT') ?? 'docs/audits/2026-09-18-v2-import');
/** Where every document stands: one row per document, keyed by doc_key, with its digest and status. */
export const LEDGER = join(INGEST_ROOT, 'ledger.csv');
/** The retrievals of a fetch run that has not finished, one line each, compacted into the ledger when it ends (A06). */
export const FETCH_JOURNAL = join(INGEST_ROOT, 'ledger.fetch-journal.jsonl');
/** The proposals, one folder per batch, one JSON file per document. */
export const PROPOSALS = at(env('H2C_PROPOSALS') ?? (env('H2C_INGEST_ROOT') ? join(INGEST_ROOT, 'proposals') : 'archive/ingest-2026-09-18/proposals'));

/** The document cache, absolute. */
export const DOCUMENT_CACHE = at(env('H2C_DOCUMENT_CACHE') ?? '.cache');
/** Every document the pipeline has read, named by its digest: <sha>.pdf or <sha>.html. */
export const SOURCES_BY_SHA = join(DOCUMENT_CACHE, 'sources/by-sha');
/** Documents registered before the pipeline existed, named by SourceID (npm run audit:sources still writes them there). */
export const SOURCES_BY_ID = join(DOCUMENT_CACHE, 'sources');
/** Each document's text, page by page: <sha>.json. */
export const TEXT_CACHE = join(DOCUMENT_CACHE, 'text');

// The same places relative to the project root, for a caller that joins them to a root of its own (the record tier
// reads a checkout or a copy, `join(root, PROPOSALS_REL)`). A folder outside the project comes out as a path that climbs
// out of it, which still joins correctly to the project root.
export const INGEST_ROOT_REL = relative(projectRoot, INGEST_ROOT);
export const LEDGER_REL = relative(projectRoot, LEDGER);
export const PROPOSALS_REL = relative(projectRoot, PROPOSALS);
