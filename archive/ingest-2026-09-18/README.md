# The V2 import's proposals, 2026-09-18 to 2026-09-25

> **Historical record** (2026-09-18): kept from an earlier stage of the project. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../README.md) and [OPEN-PROBLEMS](../../docs/OPEN-PROBLEMS.md).

One JSON file per document and batch (`proposals/<batch>/<doc_key>.json`): what the sheet reader proposed from each
data sheet, the page and line of every row, the lines it skipped, and the review that accepted or rejected each row.
They lived in `docs/audits/2026-09-18-v2-import/proposals/` until 2026-09-25, when re-center phase 5 moved them here:
77 MB that nobody reads as documentation (`docs/audits/2026-09-25-re-center/REPORT.md`, phase 5).

**Since 2026-10-15 they are in the private evidence store, not here** (D138): 73 MB of working files the repository
carried for every clone. [PACKETS.md](PACKETS.md) says how to read one from git history or bring them all back
(`npm run packets -- --restore ingest-2026-09-18` puts them in `.cache/proposals/`, the import pipeline's proposals
folder), and [PACKETS.csv](PACKETS.csv) holds each file's size and SHA-256. Where they are restored, the batch
migrations (`archive/migrations/mNN-batch-*.mjs`) re-read them through `proposalsOf` in `scripts/ingest/apply.mjs`,
and the record tier's `source_facts` are the skipped lines mined from them (`scripts/data/record-tier.mjs`, D85);
without them `source_facts` is empty and the SQLite file says so. A new batch writes its proposals to
`.cache/proposals/` too (`scripts/ingest/context.mjs`). `prices/` stays here: the price batches read it.
