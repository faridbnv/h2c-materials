# Working on the data

This file is for anyone changing the H2C material database: the owner and the AI agents alike. It says
where data lives, how to change it without breaking anything, and what the build will refuse. The
reasons behind the rules are in `docs/DECISIONS.md` (D35, D45, D46, D47, D48). Every column and vocabulary
is listed in `docs/DATA-DICTIONARY.md`; every check the tooling can raise, by code, in `docs/RULES.md`.

## The one rule

**Data changes happen in `data/tables/*.csv`, and nowhere else.** `dist/` and the review workbook are
generated and never edited, and the retired Excel workbooks are history. Before committing, run:

```bash
npm run verify        # format, schema, lint, docs, tests, audit, review snapshot, interface views: 0 errors, 0 failures
```

`verify` fails on a new lint finding, on a stale `docs/RULES.md` or `docs/DATA-DICTIONARY.md`, and on a
stale `build/snapshot/`. After a data or rule change, run `npm run snapshot` (and `npm run ui:check -- --write`
when a view changed), read the diff, and commit it with the change: it is the change's downstream effect.

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
  removes a record.
- **No lists inside cells.** A relationship is a row: `headlines.csv` for headline selections,
  `material_links.csv` for a material's citations.
- **Nothing derivable is stored.** Headline values, price medians, per-kg prices, a material's grade
  list, environmental evidence and printing guidance are calculated by the build. There is no column
  for them.
- **A new column or vocabulary value is a schema change.** Add it to `schema/tables/<table>.schema.json`
  or `schema/vocab/<name>.csv` in the same commit as the data that uses it. Some vocabularies carry a
  column the build reads: a new Moisture condition wording declares its State (dry, conditioned,
  not-stated), or the build stops.
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
"Raw material value". A bound ("> 500 %") uses Operator `>`; it limits the estimate, never becomes a point. The property must be in
`properties.csv` and the normalized unit one of its units. It appears in the drawer at once.

**Make a measurement a headline.** A row in `headlines.csv`: MaterialID, HeadlineKey, MeasurementID,
Use `value`. The measurement must be the material's own, on its representative grade, with the
headline's property, unit and direction; the build says which if not. Replace the old value row; do
not add a second one. Use `context` for a measurement cited for a headline that is not its value.

**Add a grade.** A row in `grades.csv` with Role `procurement` (or `study` / `reference` with an `-R#`
ID) and Status `active`. It joins its material's grade list with no other edit. If the product is a variant
its material's Modifier / filler does not describe (a lightweight additive, an undisclosed dense filler), set
Variant and say why in Composition / filler: its values stay its own, and the estimate model keeps them from
pulling the family.

**Add a material.** A row in `materials.csv`, its grades, measurements, headline selections, profiles
and `material_links.csv` citations, and its `coverage.csv` rows. If it is a new blend, or a new base
polymer, and should be estimated, it needs an identity in `build/mappings/estimate-model.json`; the
build names that fix if it is missing.

**Add a source.** A row in `sources.csv`. Grade IDs mentioned in "Applicable grades" must exist. Citation
role is `cited` unless the source is kept to corroborate, as a register, as provenance, or was not retrieved;
nothing may cite a source that was not retrieved.

**Retire a grade.** `npm run data:retire -- grade <GradeID>` sets Status `retired` and Availability "Retired
mapping; audit trail only" and lists every record still on it, with what must happen to each.

**Retire a duplicate record.** Data status (measurements) or Evidence type (evidence) "Retired
duplicate record", with a note naming the twin that stays. Quarantine a wrong price listing by
starting its Regular price basis with "Quarantined". A coverage finding a later row replaces gets Status
"Superseded" and a Finding that starts "Superseded by C#####".

**Add a property.** A row in `properties.csv`: its exact name, domain (mechanical, thermal, physical)
and units. If it only means something for some filaments, set "Applies to", for example
`Family: Flexible Elastomers`, and a Not applicable reason. Then add measurements. No code changes.

**Add a selectable headline.** A row in `headline_definitions.csv` (the schema describes every column),
then value rows in `headlines.csv`. The filter rail, charts, table, export and drawer pick it up. Leave
Estimated `FALSE` unless the estimate model has been extended for it; the build refuses otherwise.

## Checking your work

```bash
npm run trace -- M020                  # every headline of a material, back to its source
npm run trace -- V000384               # a measurement, and the headlines that cite it
npm run build && open dist/H2C_Material_Selector_*.html
git diff build/snapshot                  # what the change did to headlines, estimates, gates, templates, warnings
```

Estimates and screening (D43, D48): the build back-tests which evidence may screen a material out, and
records the result in `meta.estimateModel.properties.*.screening`. A change that makes a class uncertified
shows in the snapshot's Screens column; `test/screening.test.js` fails if a material stays a candidate for
a requirement its defended range wholly fails.

If `verify` fails, read the first error: it names the file and line, or the material and the rule. Do
not weaken a check to make a commit pass; if a check is wrong, say so and fix the check in its own
commit with a reason.
