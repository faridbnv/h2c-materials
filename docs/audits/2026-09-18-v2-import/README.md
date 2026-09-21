# Version 2: importing the public filament data sheet corpus

**Date:** 2026-09-18 onwards
**Asked by:** the tool's owner
**Question:** the public corpus holds far more filament data sheets than this database does. Import all of them,
correctly categorised, with duplicates and near-duplicates found rather than merged by accident, so that later
features can be built on the data rather than around it.

The research that started it is in [research/](research/): an inventory of 1,868 preferred data sheet links from 43
providers (2,200 with the language and revision variants behind them), checked 2026-09-17, and the source register
as it stood at commit 46d9a83.

This folder is the working record, not a report written afterwards:

**Start with [PLAN-REMAINING.md](PLAN-REMAINING.md).** It is the one document here written by hand rather than
generated: what is decided, what is left, who each part of it waits on, and the reasoning a count cannot carry.
Everything countable is generated, so no figure can go stale without the command that made it saying so.

| | |
|---|---|
| [PLAN-REMAINING.md](PLAN-REMAINING.md) | What is left, and the reasoning behind it. Written. Read this first. |
| [STATUS.md](STATUS.md) | The database, the corpus by status, the parity census. `npm run ingest:inventory -- --status` |
| [BLOCKERS.md](BLOCKERS.md) | Every open document, what it needs, who it waits on, what is uncertain. `npm run ingest:blockers` |
| [READINGS.md](READINGS.md) | The identity each held sheet gives its product, for the owner's verdict. `npm run ingest:readings` |
| [RESPONSE.md](RESPONSE.md) | What was done, kept current as batches land. |
| [ledger.csv](ledger.csv) | One row per document and what has happened to it. `npm run ingest:inventory` never loses a status. |
| [rulings/rulings.csv](rulings/rulings.csv) | What was decided, by whom, with the reason and the date. |
| [census/](census/) | The parity census, the blocker census, and what the corpus publishes that the registry has no home for. |
| [batches/](batches/) | One folder per batch: its README, its changelog, what the build did, and its second-read sample. |
| [BRIEF-optical-review.md](BRIEF-optical-review.md), [BRIEF-second-read.md](BRIEF-second-read.md) | What a reader who did not decide these rows may and may not do. |

`rulings/pending.csv` is empty and stays that way: what waits on the owner is a document's own ledger row now, so
BLOCKERS.md lists it and READINGS.md holds the verdicts. A question recorded in two places is a question that
gets answered in one of them.

## How a document travels

```
inventoried ─ fetch ─→ fetched ─ extract ─→ extracted ─ propose ─→ proposed ─ review ─→ reviewed ─ apply ─→ applied
      │                    │                    │                      │
      │                    │                    ├→ needs-ocr ─ ocr ─→ extracted (every row then signed against its page image)
      │                    │                    ├→ duplicate-of        twin-check        not-a-data-sheet
      │                    │                    └→ held: a reason on the row saying who can free it
      │                    └→ unreadable ─ capture ─→ fetched-page, or harvest ─→ a ledger row per document it lists
      └→ unreachable (dated)   gated / needs-staging (the owner's, R084)   safety-data-sheet   skipped
```

`registered` is terminal and means the product is in the database under another document. A status is never
guessed at: every terminal one carries what was checked on its row.

Nothing reaches `data/tables` except through `scripts/ingest/apply.mjs`, which refuses a batch unless every
document's digest matches what was recorded, every number appears on the page its Locator names, and every row a
person accepted or rejected by name. That is D35 made mechanical: at 2,000 documents, re-reading each one by hand is
not a discipline anybody keeps.

## The rules this import works under

The owner's rulings of 2026-09-18 are in [rulings/rulings.csv](rulings/rulings.csv). In short: a product that matches
an existing material becomes a grade under it, not a new material; everything a sheet publishes is transcribed;
batches land against the core build while the estimate model is scaled in parallel (DECISIONS D77); and retailer
copies, web sheets and scanned sheets are all in scope, each with its own way of being read.
