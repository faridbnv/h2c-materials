# Walkthrough: adding a material, end to end

Every recipe in [AGENTS.md](../AGENTS.md) is one task. This chains them once, with a real product, so you can see
where a material comes from and what each step is for. Read AGENTS.md first; this does not repeat its rules.

The example is **FormFutura STYX PA6**, added on 2026-09-16 by migration `m37-styx-pa6.mjs`. Every command below is
real, and the record IDs are the ones in the tables now, so you can run `npm run trace -- M049` and see the result.

Budget about an hour for a material with one data sheet. Most of it is reading the sheet.

---

## 0. Before you touch anything

```bash
git switch -c add-pa11            # a branch; the owner asks before anything reaches main
npm run verify                    # start from green, so anything that breaks is yours
```

Have the data sheet open, as a file, from the manufacturer. Not a summary, not a retailer's table, not a chat
answer. Everything below is read off that document (D35).

---

## 1. The source comes first

Nothing can cite a source that is not registered, so the source row is step one.

```bash
shasum -a 256 ~/Downloads/STYX-PA6-TDS.pdf     # the hash goes in the row
npm run data:new -- sources \
  --set SourceID=S-FORMFUTURA-STYX-PA6-TDS \
  --set Publisher="FormFutura" \
  --set Title="STYX PA6 Technical Data Sheet" \
  --set URL="https://www.formfutura.com/..." \
  --set "Access date=2026-09-16" \
  --set "Source class=Manufacturer TDS" \
  --set "Access state=retrieved" \
  --set SHA256=<the hash>
```

What matters here:

- **Title is what the publisher printed** at the head of the document, not a filename and not your description of it
  (D63). `SOURCE-TITLE-NOT-TITLE` catches the obvious cases; it cannot catch a plausible invention.
- **Source class** is one of nine, and anything particular about this document goes in **Source note** (D71).
- **Access state** is how you reached it: `retrieved`, `retrieved-copy`, `read-only`, `not-retrieved`. Anything more
  goes in Access note, in your own words. Nothing may cite a source recorded as `not-retrieved`.
- **The hash is the point.** It is what makes "re-read from the source" checkable a year from now, and what
  `npm run audit:sources` uses.

Put the document in `.cache/sources/<SourceID>.pdf` so the re-read needs no new retrieval.

---

## 2. The material and its first grade

```bash
npm run data:new-material -- --name "PA6" --polymer PA6 --family "Nylon / Polyamide" \
  --manufacturer FormFutura --product "STYX PA6" --source S-FORMFUTURA-STYX-PA6-TDS
```

It will **refuse**, and list the columns it will not invent:

```
materials: these columns carry no value and have no missing state to fall back on. They are what a
reader is told about the material, so they are written, not generated. Add them to the command:
  --set "Best uses=..."
  --set "Modifier / filler=..."
  ...
```

That refusal is the design. Prose a reader is shown is written by a person who read the sheet; the scaffold writes
the identifiers and the structure. Re-run with each `--set` filled from what you actually know.

Two things decide whether the material can be estimated:

- **Base polymer** must be a row of `polymers.csv`, or say so. If PA11 has no row, add one (group, morphology, how
  it solidifies in a print, water uptake, neat density) with where each came from.
- **Estimate identity** names that row. The scaffold sets it to the polymer when it knows it, `Not applicable` when
  it does not, and the build tells you which.

If the product is a variant its material's Modifier / filler does not describe, set **Variant** on the grade and say
why in Composition / filler, so its values stay its own and do not pull the family (D53).

---

## 3. The measurements

One row per published number. Copy an existing row of the same source with `--like`, then change what differs:

```bash
npm run data:new -- measurements --like V002270 \
  --set Property="Tensile strength (endpoint unspecified)" \
  --set "Raw value=72" --set "Raw unit=MPa" --set "Raw numeric=72" \
  --set "Normalized value=72" --set "Normalized unit=MPa" \
  --set Direction=XY --set "Specimen type=Printed specimen" \
  --set "Standard / load=ISO 527" --set Standards="ISO 527" \
  --set Locator="p. 2: Tensile strength, XY"
```

The columns people get wrong, and why they matter:

| Column | What it is for |
|---|---|
| `Raw value`, `Raw unit` | Exactly what the sheet prints. The build reconciles raw × conversion factor against the normalized value. |
| `Direction` | `XY`, `Z`, … or, where the sheet states none and you have checked, `Unstated`. `Not published` means nobody has looked yet (D73). |
| `Specimen type` | A moulded bar, film or filament strand is not a printed part and never backs a printed headline (D55). |
| `Moisture condition` / `Moisture state` | The sheet's words, and the state the build reads (dry, conditioned, not-stated). |
| `Post-processing` / `Post-processing state` | The sheet's annealing sentence, and what it means. A new sentence is fine; it is data, not a schema change (D68). |
| `Standard / load` / `Standards` | The sheet's words, and the standards they name. Never write a standard the sheet does not print (D76). |
| `Locator` | Where on the sheet. This is what a re-read follows. |

A sheet that prints two tables, dry and conditioned or as-printed and annealed, must say in **each** row which table
it came from, or `MEAS-CONDITIONS-INDISTINCT` will stop the build. That check exists because two rows with identical
conditions and different values are unreadable a month later.

Run `npm run data:check` as you go: it names the file, line, record and field.

---

## 4. The headline selections

A measurement appears in the drawer as soon as it exists. Being a **headline** is a separate, editorial choice: a
row in `headlines.csv` saying which measurement each headline shows.

```csv
MaterialID,HeadlineKey,MeasurementID,Use
M049,tensileStrengthXY,V002271,value
```

The build refuses a selection that is not the material's own, not on its representative grade, the wrong property,
unit or direction, a moulded or film specimen, conditioned, physically implausible, or annealed where the grade
publishes the as-printed value. It names which. Use `context` for a measurement worth citing that is not the value.

---

## 5. The print profile, and what a source says about printing

```bash
npm run data:new -- profiles --material M049 --set GradeID=G049-02 --set SourceID=S-FORMFUTURA-STYX-PA6-TDS
```

Each temperature axis has the sheet's own words and the typed window the build decides on, and the parser checks
the two agree. Qualitative guidance is not a column: it is a row of `profile_notes.csv` per topic (D69).

```csv
ProfileID,Topic,Text
P0172,Cooling,Fan off for the first layers
P0172,Storage humidity,< 15% RH sealed with desiccant
```

---

## 6. Citations, and what is still missing

`material_links.csv` records what the material cites, in order: printing, h2c-status, use, durability, safety.

Then `coverage.csv`, but **only for what a reader could not work out**: a gap, a conflict, a comparability
limitation, a judgement. The build reports the domains the material's own records prove, and says what proves them
(D74). Do not write a row saying the material has measurements; it has them or it does not.

---

## 7. Check it, and see what it moved

```bash
npm run verify                    # the one gate: format, schema, lint, docs, build, tests, snapshot, views, fuzz
npm run build:diff                # exactly the paths your change meant to move
git diff build/snapshot           # what it did to headlines, estimates, gates, templates, warnings
npm run trace -- M049             # every headline back to its source
npm run sql -- "select property, value, unit, standard from v_measurements where materialid='M049'"
npm run build && open dist/H2C_Material_Selector_*.html
```

Read the snapshot diff. A new material moves rows it is not obviously related to: it is a new observation in the
estimate model, so other materials' estimates can narrow or widen. That is the model working, and it is the part
worth a minute of attention before committing.

Then commit the data, the snapshot and the changelog together:

```bash
npm run data:diff -- HEAD --out /tmp/changelog.csv
git add -A && git commit
```

---

## What stops you, and what it means

| It says | It means |
|---|---|
| `SCHEMA-REQUIRED` | A cell is empty. Write the value or the missing state the column accepts; never 0 for unknown. |
| `SCHEMA-VOCABULARY` | The value is not in its vocabulary. Use an existing one, or add one deliberately, in the same commit. |
| `PARSE-MISMATCH` | A typed value disagrees with the raw text beside it. Fix the typed value, or explain it in Parse review. |
| `HEADLINE-SELECTION-INVALID` | The measurement cannot be that headline. The message says which of the reasons it is. |
| `COVERAGE-UNTRUE` | A coverage row contradicts the records. Fix the row, or the records. |
| `ID-DUPLICATE` | An ID is reused. IDs are never reused; get the next with `npm run data:new-id`. |
| `n record(s) deleted` | Something was removed. Records are retired, never deleted (D72). |

Every code is in [RULES.md](RULES.md) with its meaning and its fix. If a check looks wrong, say so and fix the check
in its own commit with a reason. Do not weaken one to make a commit pass.
