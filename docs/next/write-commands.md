# The write service: every command

> **In short.** Work package WP-17 gives the write service all its commands except the three that read proposals (WP-28).
> A command is one JSON object: what to change, what the writer expected to find, why, and who is acting. It is checked
> against every guard, written in one database transaction, and recorded as one change record. A refusal changes nothing
> and says why. Bulk work is a generator that lists its commands and says how many; the service refuses it when the
> count is different. Before cutover everything happens in a sandbox: nothing is written under `data/`, `schema/` or any
> other tracked path, and an export goes to `.workspace/export/`. Pack sections: 04 §5 to §7, 02 §9.1.

## The commands

| Command | What it does | Checked in particular |
|---|---|---|
| `correctValue` | Changes cells of one record, with evidence (WP-10) | The value is a number its quoted line prints; raw, numeric and normalized cells change together |
| `addMeasurement` | Appends a measurement at the end of its table | New ID; the same observation (grade, property, source, locator, conditions) is refused unless `duplicateOf` names the twin and says why; evidence always |
| `addRecord` | Appends a row to any other table (not `sources`: a source enters through the ingest journey, WP-28) | New key; evidence when a column the build reads for a decision is written; a rule row cites a ruling and travels alone |
| `retireRecord` | Marks a record retired or superseded; **never deletes** | The table has a retirement convention (grades `retired`; measurements, evidence and profiles `Retired duplicate record`; prices quarantined; coverage and sources superseded); a duplicate, a profile, a coverage finding and a source name the successor that stays, and it exists, is another record and is not retired itself. Retiring a grade moves nothing: the change record lists the measurements, profiles, prices and evidence that still rest on it (`args.dependents`; `change:apply` prints them), for the person to settle |
| `moveGrade` | Moves a product to another material with every record filed under it (measurements, profiles, evidence, prices) and the printing citations of those records; every ID stays (D86) | `expectMaterial` stops a concurrent move; the destination exists; every record on the grade is filed under the material it leaves; a pinned headline value that rests on one of its measurements stops the move (a pin names its material, and no command moves a pin); the re-pointed citations are listed for the D72 ledger |
| `reviseProfile` | Changes a print profile's cells | A raw cell and the cells the build reads from it (nozzle, bed, chamber, enclosure, drying) change together, or `apart` says why |
| `reclassifyProduct` | Changes a product's Role, Variant or Shared formulation key | The Role agrees with the `-R#` of the ID; a canonical cell carries evidence |
| `addVocab` | Adds a word to a vocabulary, at the end or `after` a word | Tier 1. The word is new; the generator accepts the schema it gives |
| `addColumn` | Adds a column, filled with a missing-state word the column declares | Tier 1. The fill is a declared word (or nothing, for an optional column), never an invented value |
| `schemaEdit` | Any other change to a table's schema file, by JSON patch | Tier 1. `expect.schemaDigest`; a column the patch removes needs a ruling that exists; a column it adds needs a declared fill; the data and the views must fit the schema it gives |
| `acceptProposal`, `rejectProposal`, `holdProposal` | Wait for WP-28 | Refused as `unsupported-kind` |

Every command carries `opId` (a ULID; the same one twice is applied once), `reason`, `actor`, the `base` it was written
against and a required `expect`: the values of the cells it replaces, or the row hash, or (for a new record and a schema
command) the schema digest. A command written against old data is refused as stale, with what it expected and what the
record holds now.

## What every command checks

- **Evidence** (rule 2): the source is retrieved and cited, its hash is the recorded one, the quote is on the hash-checked
  page (not run without the private store, and then never shown as verified), and the value is a number the quoted line
  prints in one role (D97).
- **Nothing is deleted, and a key never moves.** A key is the primary key, or, for a table without one, its first unique
  key, as in `table-io`.
- **Notes** carry no change-set or migration ID in new text (OQ-16 A).
- **Rule rows** (class limits, conversions, chamber rows, plausibility windows) cite a ruling in `docs/next/rulings.csv`
  and travel alone (EV-04).
- **Reviewers** (OQ-17 A): a write to a "Reviewed by", "Read by" or "Written by" cell must carry `reviewedBy`, each
  reviewer with their kind. The record keeps them, and a human among them makes the change Tier 1. A schema command,
  and a rule row, are Tier 1 always.
- **Identifiers**: SQL is built only from the generated list of names; every value is a bound parameter.
- **One schema per workspace file.** A session that did not apply a schema edit reads the new schema under the writer lock before it
  writes, so two sessions (the command line while the editor is open) never disagree about the columns. The editor itself
  has no form for a schema change and does not follow one made while it runs: close it first.

### The refusal codes WP-17 adds

| Code | Means |
|---|---|
| `not-for-command` | The table or column is not one this command changes (a table with no retirement convention, a non-profile for `reviseProfile`, a `sources` row for `addRecord`) |
| `duplicate-key` | The record's key, or the new measurement's natural key, is already there |
| `duplicate-of-invalid` | `duplicateOf` names no record, or gives no reason |
| `successor-invalid` | The replacing record is missing, is the record itself, or is retired too |
| `role-id-mismatch` | A grade's Role disagrees with its ID |
| `reviewer-missing` | A reviewer cell is written with no reviewer kind beside it |
| `schema-patch-invalid` | The patch does not apply, or the schema it gives is not valid (the generator's own message is quoted) |

Each code, and each command that can raise it, has a test (`tests/remake/write-commands.test.mjs`,
`write-schema.test.mjs`); the older codes keep theirs in `write-guards.test.mjs`.

## Changing the schema

A shape change is a command, not a SQL migration (ADR-02, ADR-03). The workspace keeps the edited schema files in its own
file (`_meta.schema_overlay`), rebuilds the 36 tables under the new storage DDL inside the command's transaction, and
loads the rows again. The repository's `schema/` is read, never written.

An export directory is marked (`.atlas-export`) by the first export that writes to it. Later exports remove from it, and report,
the files an earlier export wrote that they no longer write; a directory that has no marker keeps every file it holds (outside
`data/tables`, as in v1).

An export of a schema edit holds the edited schema files, the files the generator makes from them
(`db/generated/*.sql`, `packages/data/src/generated/*.ts`), the CSV of the tables that changed, the manifest and the
change set, which names the schema digest before and after. `npm run change:replay` proves the change set (replay
equality, including the schema files), and the tests prove the rest: a fresh rebuild from the export has the workspace's
tables exactly, and the round trip over the exported tree is byte-identical for all 36 tables under the new schema (and is
refused under the old one, because the schema file and the data travel together).

Not done: creating or dropping a whole table (the 36 tables are the schema owner's), and changing or removing a
vocabulary word that is there. They show up as residue in the coverage report below. A file edited by the service is
written as plain two-space JSON; the first edit of a hand-formatted schema file reformats it, so its diff is larger than
the change.

## Generators

A sweep is a module that is given rows to read (never the database) and returns explicit commands, each with its own
`expect`. It says in advance how many (`expectCount`), and `runSweep` refuses it when it returns another number, before
anything is applied. The commands are applied as one batch: all of them or none. Their opIds follow from the generator,
its arguments and the base, so a retry after a crash is a duplicate, not a second edit. The change set names the
generator, and `change:export --generator` refuses it when its `expectCount` is not the number of records. A sweep is
**never replayed**: replay applies the recorded commands; after a rebase the author runs the sweep again on purpose and
reads the new list.

    npm run change:generate -- path/to/sweep.mjs            # its commands and their count; nothing applied
    npm run change:generate -- path/to/sweep.mjs --apply    # applied as one batch
    npm run change:export -- --generator path/to/sweep.mjs --title "..." --topic words-with-hyphens

`cellSweep` in `packages/data/src/sweep.ts` makes the commonest one ("set this column to that wherever it holds this").

## The two measurements

Both are read only.

**Reviewer kinds** (`docs/next/reviewer-kind-report.md`, `npm run report:reviewers`): the 3,005 free-text cells that
say who reviewed, read or wrote a row, classified as agent, human, both, neither or not stated. All 3,005 name an agent
only, and none names a person. It is a claim, not a proof; the report says so, and lists the wordings so the reading can
be checked.

**Change-set coverage** (`remake/measure/change-set-coverage.json`, `npm run change:coverage`): what share of the changes
the migrations made the commands can make. Main is frozen for data (its last data commit is 2026-10-20 12:08; a later
commit changed only a workflow), so the window is the 14 days before that commit: 107 commits. Each commit's table,
vocabulary and schema diff is split into changes and each is classified as one a command makes, one that waits for WP-28,
or residue. The migration scripts are not run. Then every commit whose changes are all row edits and appends is replayed
through the real pipeline in legacy mode (judgement guards off, structural guards on) onto a rebuild of its parent, and
each changed table is compared byte for byte with the child.

| Result | Number |
|---|---|
| Changes in the window | 10,252 |
| Expressed by a command | 10,032 (97.9%) |
| Wait for WP-28 (new sources, which enter by the ingest journey) | 124 (1.2%) |
| Residue: no command makes them | 96 (0.9%) |
| of which in the tables and their schema | 31 |
| of which files beside the tables | 65 |
| Expressed share, leaving out the files beside the tables | 98.5% |
| Commits in the window | 107 |
| of them, fully expressed | 46 (43.0%) |
| of them, with a change that waits for WP-28 | 4 |
| of them, with residue | 57 (53.3%) |
| of them, with residue in the tables or their schema | 18 (16.8%) |
| Byte replay through the service | 21 commits identical, 0 differ, 23 skipped of 44 eligible |

The residue, by reason:

| Reason | Changes | Commits |
|---|---:|---:|
| Files beside the tables: `data/review/accepted-findings.csv` (the `lint --accept` side door, 28 commits), `schema/db.schema.json` (25), `data/review/context-witness-accepted.csv` (6), `schema/estimate-model.schema.json` (6) | 65 | 54 |
| Rows inserted between rows (`headline_definitions` is ordered on purpose) | 12 | 5 |
| Tables created | 7 | 6 |
| Vocabulary words changed or removed | 6 | 6 |
| New vocabulary files | 4 | 4 |
| Rows removed | 2 | 2 |

The skipped replays are commits whose parent has no `chamber_need` (21) or `class_limits` (2) table yet, so it cannot be
rebuilt under its own schema; they are counted as skipped, not as passed. The schema changes (a column added, dropped or
moved, a schema document, a vocabulary word) are classified from the diff, not replayed commit by commit; their commands are
tested by the round trip above.

How to read it (for Q2-10): by changes, almost everything fits (97.9%, or 98.5% leaving out the files beside the tables),
and what does not is a short list. The files beside the tables matter for the question you are asked: the largest group is
the `lint --accept` side door, which no command in WP-17 replaces. By commits, 16.8% carry residue in the tables or their
schema and 53.3% if the files beside the tables count, both above the 1 in 10 of ADR-03's revisit trigger if every such
commit is counted as a change that needs a hand-written generator. The class of a commit (04 §11) is guessed from the diff,
not from the script, so the per-class figures are a heuristic. Byte identity tests the service's order and canonical bytes;
it cannot show expressiveness, since a diff-derived set of commands can express any cell edit. The residue is the result.
