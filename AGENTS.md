# Working on the data

This file is for anyone changing the H2C material database: the owner and the AI agents alike. It says
where data lives, how to change it without breaking anything, and what the build will refuse. The
reasons behind the rules are in `docs/DECISIONS.md` (D35, D45 to D76). Every column and vocabulary
is listed in `docs/DATA-DICTIONARY.md`; every check the tooling can raise, by code, in `docs/RULES.md`.
Starting from a data sheet, with nothing recorded yet? `docs/WALKTHROUGH-ADD-A-MATERIAL.md` runs it end to end.

**Before you record a defect as new, check `docs/OPEN-PROBLEMS.md`.** It lists what is already known to be wrong or
missing, with the query that re-derives each figure. Add to it when you find something you cannot fix in the same
change, and take the entry out when it is fixed; an item there that no longer occurs is as misleading as a stale
acceptance.

## The one rule

**Data changes happen in `data/tables/*.csv`, and nowhere else.** `dist/` and the review workbook are
generated and never edited, and the retired Excel workbooks are history. Before committing, run:

```bash
npm run verify:fast   # format, schema, lint, generated docs, build and tests: while you work (about 25 s)
npm run verify        # verify:fast, then audit, review snapshot, interface views, 300 rendered scenarios: before a commit
npm run build:diff    # what the change did to the compiled database, against HEAD
```

`verify` fails on a new lint finding, on an unreviewed build finding, on a stale `docs/RULES.md` or
`docs/DATA-DICTIONARY.md`, on a stale `build/snapshot/`, and on any disagreement between the rendered page and the
engine over 300 random scenarios (about 1 minute more than `verify:fast`). CI runs `verify` on every push and 2,000
scenarios on a new seed every night (`npm run ui:fuzz:full` locally). After a data or rule change, run `npm run snapshot`
(and `npm run ui:check -- --write` when a view changed), read the diff, and commit it with the change: it is the change's
downstream effect. A change meant to move nothing (code moved, a table split, a column retyped) shows `0 difference(s)`
in `npm run build:diff`; a change of behaviour shows exactly the paths it meant to move.

## Before any change

- Re-read every value from its source. Nothing enters the data from a report, a summary or memory
  (D35). Record the source in `sources.csv` with its URL, access date and the SHA-256 of the fetched
  file, or "Not recorded" with a reason.
- Know which table owns the fact. `docs/DATA-MODEL.md`, "The source tables", lists them; the schema
  file for each table (`schema/tables/<table>.schema.json`) describes every column.
- If another person or agent is working in the same files, leave their in-progress changes alone and
  work on a branch or a separate worktree.
- Commit and push to `main` only when the owner asks.

## Editing

Edit a CSV directly in a text editor, or with a script through `scripts/data/table-io.mjs`:

```js
import { openTables } from './scripts/data/table-io.mjs';
const t = openTables();
t.set('measurements', 'V000539', 'Normalized value', '4.3', { expect: '4.1' }); // refuses if the data moved
t.append('sources', { SourceID: 'X-NEW-TDS', /* every column */ });
t.save();   // canonical CSV and a fresh data/manifest.json
```

Then:

```bash
npm run data:fmt      # canonical form and manifest (needed after a hand edit)
npm run data:check    # the schema gate; reports file:line, record and field
npm run data:diff     # the record-level changelog of what you changed; paste it into the commit or audit
npm run data:lint     # quality findings the schema cannot express; fix, or accept with a reason
```

Scaffolding:

```bash
npm run data:new -- measurements --like V000384 --set "Raw value=2.1 GPa"   # next ID, every column filled
npm run data:new -- grades --material M020 --set Manufacturer=Polymaker
npm run data:retire -- grade G020-03       # Status and Availability together; lists what still depends on it
npm run audit:sources                     # every PDF source re-read (hash-checked) for values not in the tables
```

A batch of corrections against re-read sources is a migration under `scripts/migrate/` (see m13 to m17): each edit
names the value it replaces through `scripts/migrate/source-edits.mjs`, so a re-run is a no-op and a run after the
data moved stops.

Rules the tooling enforces:

- **Never open a CSV in Excel and save it.** Excel rewrites numbers, dates and quoting. Use
  `npm run data:export-xlsx` to review in Excel; nothing imports that workbook back.
- **Every cell has a value or an explicit missing state.** Write "Not published", "Not applicable" or
  the state the column accepts (its schema lists them); never leave a required cell blank, and never
  write 0 for unknown.
- **IDs are never reused.** Get the next one from `npm run data:new-id -- <table>` (for grades:
  `-- grades M020`, or `-- grades M055 --study` for an `-R#` study or reference grade).
- **Nothing is deleted.** Retire instead (see below). The pre-commit hook and CI refuse a commit that
  removes a record. The one exception is a record the build now derives instead: it needs a row in
  `data/review/removed-records.csv` naming the migration and where it went, in the same commit, and
  every other removal still fails (D72).
- **No lists inside cells.** A relationship is a row: `headlines.csv` for headline selections,
  `material_links.csv` for a material's citations.
- **Nothing derivable is stored, and no constant is repeated per row.** Headline values, price medians
  and their basis sentence, per-kg prices, a material's grade list, what its headlines represent,
  environmental evidence and printing guidance are calculated by the build. There is no column for them.
  A sentence that is the same on every row is a rule: it goes in `method.csv` and is shown from there.
- **A new column or vocabulary value is a schema change.** Add it to `schema/tables/<table>.schema.json`
  or `schema/vocab/<name>.csv` in the same commit as the data that uses it. A source's own words are
  never a vocabulary: a new datasheet sentence is written in the raw column and the state it means in
  the typed column beside it (Moisture state, Post-processing state), which is what the build reads.
- **A lint finding is fixed or accepted with a reason.** `npm run data:lint -- --accept CODE "reason"`
  writes `data/review/accepted-findings.csv`; an accepted finding that no longer occurs must be removed.
- **Raw columns keep the source's own text.** Typed columns beside them (Test load MPa, the profile
  windows) carry the value the build uses, and the parser checks they agree (PARSE-MISMATCH); a deliberate
  difference is explained in Parse review.

## Recipes

**Correct a published value.** In `measurements.csv`, fix `Raw value`, `Raw numeric` and
`Normalized value` together. The build reconciles raw value × conversion factor with the normalized
value; a transcription correction uses Data status "Published value (transcription corrected)" and a
note saying what was wrong.

**Add a measurement.** A row in `measurements.csv` for the exact grade that was measured, its source
and locator, the direction, specimen, moisture and standard as published. A sheet that prints two tables
(dry and conditioned, as printed and annealed, two print speeds) must say in each row which table it came
from; MEAS-CONDITIONS-INDISTINCT catches rows that do not. A value marked as injection moulded is Specimen type
"Raw material value"; a film or a filament strand says so too (each Specimen type declares its Form). Post-processing
is copied as printed ("As printed", the sheet's annealing sentence) and Post-processing state beside it says what it
means (as-printed, annealed, not-stated); Moisture condition and Moisture state work the same way. The build reads the
state, and stops if the words plainly say otherwise (PARSE-MISMATCH); an unseen wording is data, not a schema change.
Anneal °C and Anneal h carry the schedule the wording states (Not published when it states none); the parser checks them.
Standard / load is the sheet's own words and Standards beside it lists the standards they name, at family level (Not
published where they name none); the parser checks that too. Never write a standard the sheet does not print. A Fatigue life measurement
also needs its loading row in `fatigue_tests.csv`. A bound ("> 500 %") uses Operator `>`; it limits the estimate, never becomes a point. The property must be in
`properties.csv` and the normalized unit one of its units. It appears in the drawer at once.

**Make a measurement a headline.** A row in `headlines.csv`: MaterialID, HeadlineKey, MeasurementID,
Use `value`. The measurement must be the material's own, on its representative grade, with the
headline's property, unit and direction, a printed or unstated specimen, not conditioned, not flagged implausible,
and not annealed where the grade publishes the as-printed value; the build says which if not. Replace the old value row; do
not add a second one. Use `context` for a measurement cited for a headline that is not its value.

**Add a grade.** A row in `grades.csv` with Role `procurement` (or `study` / `reference` with an `-R#`
ID) and Status `active`. It joins its material's grade list with no other edit. If the product is a variant
its material's Modifier / filler does not describe (a lightweight additive, an undisclosed dense filler), set
Variant and say why in Composition / filler: its values stay its own, and the estimate model keeps them from
pulling the family.

**Add a material.** `npm run data:new-material -- --name "PA11" --polymer PA11 --family "Nylon / Polyamide"
--manufacturer Arkema --product "Rilsan PA11" --source S-...` writes the material and its first grade, refuses to
invent the prose a reader is told (pass each as `--set "Column=..."`), and lists what is still needed: its
measurements, headline selections, profiles, `material_links.csv` citations, and a `coverage.csv` row per gap or
judgement (the build reports the domains its own records prove, D74). To be estimated it names its Estimate identity, a row
of `polymers.csv` (its base polymer, or for a blend its own name); a new polymer is a new row there with its group,
morphology, how it solidifies in a print, water uptake and neat density, and where those come from. A commercial
variant class (silk, particle-filled) goes in Variant class. The build names the fix if either is missing.

**Add a source.** A row in `sources.csv`. Grade IDs mentioned in "Applicable grades" must exist. Citation
role is `cited` unless the source is kept to corroborate, as a register, as provenance, or was not retrieved;
nothing may cite a source that was not retrieved.

**Retire a grade.** `npm run data:retire -- grade <GradeID>` sets Status `retired` and Availability "Retired
mapping; audit trail only" and lists every record still on it, with what must happen to each.

**Retire a duplicate record.** Data status (measurements) or Evidence type (evidence) "Retired
duplicate record", with a note naming the twin that stays. Quarantine a wrong price listing by
setting Quarantined `TRUE` and saying why in its Regular price basis. A coverage finding a later row replaces gets Status
"Superseded" and a Finding that starts "Superseded by C#####".

**Flag a value physics rules out.** When a sheet publishes what cannot be (HDT at 0.45 MPa below HDT at 1.8 MPa, a
modulus its own hardness and elongation contradict), keep the number: Data status "Published value (physically
implausible)" and the reason in Notes, through a migration (m24). It then backs no headline, estimate or bound; move a
headline that selected it to Use `context`. The physics lint (MEAS-PHYSICS-*) finds some of these; accept the rest
with a reason.

**Replace a property name.** When two property names are one test, set "Replaced by" on the one that goes, and move
its rows to the other with a migration (m22). The replaced record stays; the build refuses any use of it.

**Accept a build finding.** Outliers, family-order breaks, unstated loads, materials without measurements and an
estimate left imprecise beside a usable published value are reviewed per record: fix them, or `npm run data:lint --
--accept EST-OUTLIER "reason"`. An estimate that is wide because the material publishes nothing is EST-THIN, which is
informational: more data narrows it, not a reviewer (D73). `npm run
audit:data` (in verify) fails on an unreviewed or stale one.

**Add polymer-level behaviour.** A row in `polymer_environment.csv` per polymer, category and agent, from a resin
producer's or handbook reference that was fetched, hashed and read (a row in `sources.csv` first, Citation role
`cited`): the agent as the reference names it, its conditions, a Verdict from `schema/vocab/polymer-verdicts.csv`, and
the reference's own wording in Finding. The build attaches it to every material of that polymer that has no
`evidence.csv` record in the category, labelled polymer-level; it never passes a requirement, and it screens one only
where the reference finds the polymer resistant to nothing in the class (D64). Record up to four agents per category, a
dilute and a concentrated one among them, and never summarise across agents yourself: the build derives the category
verdict. A grade-level record always wins, so nothing here is a reason to leave a sheet's own statement untranscribed.

**Add a property.** A row in `properties.csv`: its exact name, domain (mechanical, thermal, physical)
and units. If it only means something for some filaments, set "Applies to", for example
`Family: Flexible Elastomers`, and a Not applicable reason. Then add measurements. No code changes.

**Add a selectable headline.** A row in `headline_definitions.csv` (the schema describes every column),
then value rows in `headlines.csv`. The filter rail, charts, table, export and drawer pick it up. Leave
Estimated `FALSE` unless the estimate model has been extended for it; the build refuses otherwise.

## Importing a batch of data sheets

The public corpus is larger than this database, and `docs/audits/2026-09-18-v2-import/` is the record of bringing it
in. A document never enters by hand: it travels the pipeline, and `ingest:apply` refuses a batch that has not.

**Read these three first; all are generated, and between them they say where everything stands.**

```bash
npm run ingest:inventory -- --status   # STATUS.md: the database, the corpus by status, the parity census
npm run ingest:blockers                # BLOCKERS.md: every open document, what it needs, who it waits on
npm run ingest:readings                # READINGS.md: the identity each held sheet gives its product
```

`docs/audits/2026-09-18-v2-import/PLAN-REMAINING.md` is the one written document: what is decided, what is left,
and the reasoning a count cannot carry. Start there, not here.

**Getting the bytes.** Each step writes the ledger and nothing else; `.cache/sources/by-sha/<sha>` is the document.

```bash
npm run ingest:fetch -- --provider "SUNLU"                  # two at a time per host, by digest
npm run ingest:fetch -- --stage <file|folder> --doc <key>   # a document the owner saved from a browser (R084)
npm run ingest:capture -- --provider "BASF Forward AM / Ultrafuse"   # a page whose numbers a script draws
npm run ingest:harvest -- --provider "BASF Forward AM / Ultrafuse"   # a page that is an index of documents
npm run ingest:extract -- --provider "SUNLU"                # the text, cached by digest, and the twins
npm run ingest:ocr -- --all                                 # a scan: an optical reading, and its page images
npm run ingest:witness                                      # the maker's product page, for a sheet naming no polymer
```

**Running a batch.** `scripts/ingest/batch.mjs` is the program; the steps are in the order they must happen.

```bash
npm run ingest:batch -- --holds                              # why each document waits, written into the ledger
npm run ingest:batch -- --batch bNN --propose --ready        # ... then propose what nothing holds
npm run ingest:batch -- --batch bNN --propose --held ruling  # ... or what a named hold was waiting on (--held any: all)
npm run ingest:batch -- --batch bNN --twins --by "<name>"    # R053: a grade each, the values recorded once
npm run ingest:batch -- --batch bNN --accept --by "<name>"   # every row the reviewer's own rule allows
npm run ingest:review -- --batch bNN --doc <key> --accept m01 --by "<name>" --note "..."   # the rest, one at a time
npm run ingest:batch -- --batch bNN --split                  # aside: optical, twin, held, already registered
npm run ingest:apply -- --batch bNN --dry-run                # then a migration mNN-batch-bNN calls applyBatch
npm run ingest:batch -- --batch bNN --finish                 # generated docs and the snapshot, then verify
```

`npm run ingest:propose -- --compare --all` is the parity census: run it before a batch commits, and before and
after any change to the reader. `npm run ingest:second-read -- --all` draws R085's sample for a reader who did
not decide the rows.

The rules that differ from editing a table by hand:

- **Parity before novelty.** A maker's layout is proved on the sheets somebody already transcribed before any sheet
  of theirs that nobody has. Below about 95% the reader is not ready; what it misses is named per row.
- **A proposal is not data.** Every row carries the page and line it was read from, and a review that records who
  accepted it. `ingest:apply` writes nothing unless every row was accepted or rejected by a named person, every
  document still hashes to what was recorded, and every number is printed on the page its Locator names.
- **A copy is not a source.** A document is its bytes; the same file from a maker and a retailer is one document.
  Where two sheets print the same numbers under different product names, the ledger queues them rather than
  consolidating: that is a reading of the sheet, not a rule.
- **An identity the rule cannot settle is a ruling**, written once in `rulings/rulings.csv` and applied to every
  sheet that says the same thing. "Nylon" names a family, and a family owns no product (D44).
- **A batch is a migration.** `scripts/migrate/mNN-batch-<name>.mjs` pins the proposals and calls `applyBatch`, so
  the migration sequence stays the one history of how the data got here, and a re-run is a no-op.
- **`--holds` before `--propose`.** A hold reason is what the last `--holds` run wrote, so a document whose
  blocker has changed since is one a named reason misses. `--propose --held any` takes every held document.
- **A review names its batch.** A document is proposed again in every batch that re-reads it, and the older
  copies stay in their folders as the record of what that batch saw; `--doc` without `--batch` writes into all of
  them, and it refuses rather than doing so.
- **A reading of a page nobody else has read is signed.** An optically-read row needs `--visual` and a name, or
  `APPLY-OCR-UNVERIFIED` refuses the batch (D35). A row the page image does not print is rejected, never
  corrected: a reading a person edits is a transcription nobody made from a document nobody read.

## Checking your work

```bash
npm run trace -- M020                  # every headline of a material, back to its source
npm run sql -- "select ..."             # ask a question across records (dist/h2c.sqlite, D75)
npm run trace -- V000384               # a measurement, and the headlines that cite it
npm run build && open dist/H2C_Material_Selector_*.html
git diff build/snapshot                  # what the change did to headlines, estimates, gates, templates, warnings
npm run ui:fuzz -- --n 3000 --seed 7     # the rendered page against the engine, more scenarios or another seed
```

Estimates and screening (D43, D48, D58): estimates are a stage of their own (`build/src/estimate/`) applied to a
complete core database; `node build/src/index.js --no-estimates` builds the core alone, and it must validate. **A case
the model cannot express is not a new branch in code.** Make it a not-applicable reason, a declared state or class in
the data (a vocabulary State, a grade Variant, a Data status), or a reviewed finding that says more data is needed. A
new conversion kind or physical rule needs a DECISIONS entry that says why the data cannot carry it, and a back-test
row that shows it helps. The build back-tests which evidence may screen a material out, and
records, end by end, where each class may screen in `meta.estimateModel.properties.*.screening` and
`build/snapshot/screening.csv` (D59). A change that moves an end shows there and in the snapshot's Screens column; `test/screening.test.js` fails if a material stays a candidate for
a requirement its defended range wholly fails.

If `verify` fails, read the first error: it names the file and line, or the material and the rule. Do
not weaken a check to make a commit pass; if a check is wrong, say so and fix the check in its own
commit with a reason.
