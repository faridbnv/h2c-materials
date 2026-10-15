# Migrations of the open round

A migration is a small script that changes `data/tables/*.csv` through `scripts/data/table-io.mjs`, each edit naming
the value it replaces, so a re-run changes nothing and a run after the data moved stops instead of overwriting
(AGENTS.md, "The one rule"; D35). Write a round's migrations here. When the round closes,
`npm run round:close -- --archive` moves them to [`archive/migrations/`](../../archive/migrations/), where every earlier
one is kept as the record of its correction, and re-points their imports.

## Writing one

1. **Name it** `m<next number>-<what it does, in words>.mjs`. The next number is one more than the highest in
   `archive/migrations/` and here:
   `ls archive/migrations scripts/migrate | grep -oE '^m[0-9]+' | tr -d m | sort -n | tail -1`.
2. **Open with a comment** that says the date, what the source page states, what was wrong, and why the change is
   right. Name the decision it follows (Dnn) and who read the page (a person, or which agent).
3. **Guard every edit.** `t.set(table, id, column, value, { expect, migration })` refuses unless the cell still holds
   `expect`. For a measurement corrected against a re-read source, use `correct` or `addValue` from
   `../lib/source-edits.mjs`. Check a quote is on its cached page with `onSheet` from `../lib/sweep-shared.mjs` (or
   `onCachedSheet` from `../lib/read-proposals-apply.mjs`, which also reads the optical sidecar).
4. **Save once** at the end (`t.save()`), and print how many rows changed.
5. **Run** `node scripts/migrate/<file>.mjs`, then `npm run verify:fast`, `npm run build:diff` and `npm run snapshot`.

The imports a migration here uses:

| Import | For |
|---|---|
| `../data/table-io.mjs` | `openTables`, `nextId`: the guarded table edits |
| `../lib/source-edits.mjs` | `correct`, `addValue`, `withNote`: a measurement corrected against its source |
| `../lib/sweep-shared.mjs` | `onSheet`, `rowsOf`: a quote checked on the cached sheet; a CSV of curated rows |
| `../lib/read-proposals-apply.mjs` | `applyProposals`, `onCachedSheet`: proposals from the page-read path |
| `../lib/profile-settings.mjs` | `retype`, `typedOf`: a profile's typed cells read again from its raw cells |
| `../ingest/apply.mjs` | `applyBatch`: an import batch (IMPORTING.md) |
| `../../build/src/…` | the build's own parsers, so the migration writes what the build reads |

## A short one to copy

`archive/migrations/m413-a-page-statement-says-only-its-standard.mjs` (one cell, one guard). Others the documents
name: m212 (a measurement corrected with `correct`), m342 (proposals applied), m150 (a comparison table read cell by
cell), m141 (a product moved to another material).
