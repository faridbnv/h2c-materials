# The V2 import's proposals, 2026-09-18 to 2026-09-25

> **Historical record** (2026-09-18): kept from an earlier stage of the project. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../README.md) and [OPEN-PROBLEMS](../../docs/OPEN-PROBLEMS.md).

One JSON file per document and batch (`proposals/<batch>/<doc_key>.json`): what the sheet reader proposed from each
data sheet, the page and line of every row, the lines it skipped, and the review that accepted or rejected each row.
They lived in `docs/audits/2026-09-18-v2-import/proposals/` until 2026-09-25, when re-center phase 5 moved them here:
77 MB that nobody reads as documentation (`docs/audits/2026-09-25-re-center/REPORT.md`, phase 5).

**They still run.** Each batch migration (`scripts/migrate/mNN-batch-*.mjs`) re-reads its batch's files through
`proposalsOf` in `scripts/ingest/apply.mjs`, so a re-run stays a no-op; the record tier's `source_facts` are the
skipped lines mined from them (`scripts/data/record-tier.mjs`, D85); a new batch writes its proposals here. The path
is one constant, `scripts/ingest/archive.mjs`. Comments in the older migrations and audit narratives name the old
path; they describe where the files were then.
