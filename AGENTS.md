# Working on the data

This file is for anyone changing the H2C material database: the owner and the AI agents alike. It says
where data lives, how to change it without breaking anything, and what the build will refuse. The
reasons behind the rules are in `docs/DECISIONS.md` (D35, D45, D46, D47).

## The one rule

**Data changes happen in `data/tables/*.csv`, and nowhere else.** `dist/` and the review workbook are
generated and never edited, and the retired Excel workbooks are history. Before committing, run:

```bash
npm run verify        # format, schema, build, tests, audit: must end with 0 errors and 0 failures
```

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
```

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
  or `schema/vocab/<name>.csv` in the same commit as the data that uses it.

## Recipes

**Correct a published value.** In `measurements.csv`, fix `Raw value`, `Raw numeric` and
`Normalized value` together. The build reconciles raw value × conversion factor with the normalized
value; a transcription correction uses Data status "Published value (transcription corrected)" and a
note saying what was wrong.

**Add a measurement.** A row in `measurements.csv` for the exact grade that was measured, its source
and locator, the direction, specimen, moisture and standard as published. The property must be in
`properties.csv` and the normalized unit one of its units. It appears in the drawer at once.

**Make a measurement a headline.** A row in `headlines.csv`: MaterialID, HeadlineKey, MeasurementID,
Use `value`. The measurement must be the material's own, on its representative grade, with the
headline's property, unit and direction; the build says which if not. Replace the old value row; do
not add a second one. Use `context` for a measurement cited for a headline that is not its value.

**Add a grade.** A row in `grades.csv` with Role `procurement` (or `study` / `reference` with an `-R#`
ID) and Status `active`. It joins its material's grade list with no other edit.

**Add a material.** A row in `materials.csv`, its grades, measurements, headline selections, profiles
and `material_links.csv` citations, and its `coverage.csv` rows. If it is a new blend, or a new base
polymer, and should be estimated, it needs an identity in `build/mappings/estimate-model.json`; the
build names that fix if it is missing.

**Add a source.** A row in `sources.csv`. Grade IDs mentioned in "Applicable grades" must exist.

**Retire a grade.** Set Status `retired` and Availability "Retired mapping; audit trail only". Then deal
with its records: the build lists every active measurement, price or evidence record still on it.

**Retire a duplicate record.** Data status (measurements) or Evidence type (evidence) "Retired
duplicate record", with a note naming the twin that stays. Quarantine a wrong price listing by
starting its Regular price basis with "Quarantined".

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
```

If `verify` fails, read the first error: it names the file and line, or the material and the rule. Do
not weaken a check to make a commit pass; if a check is wrong, say so and fix the check in its own
commit with a reason.
