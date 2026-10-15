# Migrations, m10 onwards

> **Historical record** (2026-10-15): every migration since the workbook conversion, kept as the record of each correction. Each ran once; the data has moved on since. For where things stand now, read the [README](../../README.md) and [OPEN-PROBLEMS](../../docs/OPEN-PROBLEMS.md).

Each file here is one migration: a script that changed `data/tables/*.csv` through guarded edits naming the value
each replaced, with a comment saying what its source page states and why the change was right. They are numbered in
the order they ran, m10 to m413 when this folder was made; m01 to m09, the 2026-09-14 workbook conversion, are in
[`archive/workbook-conversion/`](../workbook-conversion/). The CSV and JSON files beside a migration are the curated
rows it read, named with its number.

**They ran once.** A migration re-run on today's tables finds every edit already made and changes nothing, or stops
because the data has moved since; none is meant to run again. A round writes its migrations in
[`scripts/migrate/`](../../scripts/migrate/README.md), and `npm run round:close -- --archive` moves them here when the
round closes.

**Moved here on 2026-10-15** (maintainability round, D138) from `scripts/migrate/`, where they had sat among the
living tools. Their imports of `scripts/data/`, `scripts/lib/` and `scripts/ingest/` were re-pointed two levels up, and
`npm run round:close` checks that every import still resolves to a file and every imported name is exported. Nothing
else in them changed, except m223, which now finds its data files beside itself. Two consequences:

- The SHA-256 a round's packet or review recorded for a migration file is of its bytes before that move.
- The helpers living code shares moved to `scripts/lib/` the same day: `source-edits.mjs`, `read-proposals-apply.mjs`,
  `coverage-clause.mjs`, `sweep-shared.mjs` (it was `m277-m279-sweep-shared.mjs`) and `profile-settings.mjs` (the
  three exports m290 first wrote). The helpers only migrations used (`printed-on.mjs` and the four packet helpers)
  stay here with them.

Some migrations read a round's packets under `docs/audits/`, and some of those packets were moved to the private
evidence store the same month; `npm run packets -- --restore <round>` brings a round's packets back before a re-run.
