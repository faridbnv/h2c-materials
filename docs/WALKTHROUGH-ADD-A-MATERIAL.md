# Walkthrough: adding a material, end to end

> **Read this as history, not as the route for a new document.** It shows, with a product added on 2026-09-16, how the
> records of a material fit together. A new data sheet today enters only through the import pipeline
> ([IMPORTING.md](IMPORTING.md)), which binds every value to its line of the hash-checked page (D97), and imports are
> paused by the owner except within the exceptions [GOALS.md](GOALS.md) lists. To correct one value of a source already
> registered, use a migration as AGENTS.md's "Correct a published value" recipe says (m212 is a short example).

Every recipe in [AGENTS.md](../AGENTS.md) is one task. This chains them once, with a real product, so you can see
where a material comes from and what each step is for. Read AGENTS.md first; this does not repeat its rules.

The example is **FormFutura STYX PA6**, added to PA6 (M049) as grade G049-02 on 2026-09-16 by migration
`scripts/migrate/m37-styx-pa6.mjs`, from source `R-FORMFUTURA-STYX-PA6-TDS` (measurements V002336 to V002348). The
migration wrote its rows in one guarded script; the steps below write the same rows one at a time, with the values
those rows hold, so `npm run trace -- V002341` shows what they made. STYX PA6 joined a material that already existed,
and it has no print profile and no pin. Where a step needs a record it lacks, the step says so and names the record it
shows instead.

Budget about an hour for a material with one data sheet. Most of it is reading the sheet.

---

## 0. Before you touch anything

```bash
git switch -c add-styx-pa6        # a branch; the owner asks before anything reaches main
npm run verify                    # start from green, so anything that breaks is yours
```

Have the data sheet open, as a file, from the manufacturer. Not a summary, not a retailer's table, not a chat
answer. Everything below is read off that document (D35).

---

## 1. The source comes first

Nothing can cite a source that is not registered, so the source row is step one. A SourceID is chosen by hand, so
`npm run data:new` does not make one (it stops with "IDs are chosen by hand"). Write the row in a text editor and run
`npm run data:fmt`, or append it through the table API, as m37 did:

```bash
shasum -a 256 ~/Downloads/STYX-PA6-TDS.pdf     # the hash goes in the row
```

```js
import { openTables } from './scripts/data/table-io.mjs';
const t = openTables();
t.append('sources', {
  SourceID: 'R-FORMFUTURA-STYX-PA6-TDS', Publisher: 'FormFutura', Title: 'Technical Data Sheet STYX PA6',
  Revision: 'Version: 1.0; print date 28-02-2023', 'Publication date': '2023-02-28', 'Access date': '2026-09-16',
  'Source class': 'Manufacturer TDS', 'Source note': 'Not applicable', 'Citation role': 'cited',
  URL: 'https://www.formfutura.com/web/content/281451?download=true',
  Locator: 'p. 1: Material properties, Mechanical properties, Thermal properties (typical value and test method; '
    + 'no specimen, direction or print settings stated); Storage and handling; p. 2: Disclaimer',
  'Applicable grades': 'G049-02', 'Access state': 'retrieved', 'Access note': 'Not applicable',
  SHA256: '5202ff7a803935abd6b61daa5b25dfa389515abd1a1ff0e1944fad91068b381c',
});
t.save();   // canonical CSV and a fresh data/manifest.json
```

What matters here:

- **Title is what the publisher printed** at the head of the document, not a filename and not your description of it
  (D63). `SOURCE-TITLE-NOT-TITLE` catches the obvious cases; it cannot catch a plausible invention.
- **Source class** is one of nine, and anything particular about this document goes in **Source note** (D71).
- **Access state** is how you reached it: `retrieved`, `retrieved-copy`, `read-only`, `not-retrieved`. Anything more
  goes in Access note, in your own words. Nothing may cite a source recorded as `not-retrieved`.
- **Applicable grades** names the grade step 2 writes. Until that grade exists, `npm run data:check` reports the
  reference (`SCHEMA-REFERENCE`); m37 wrote both in one save.
- **The hash is the point.** It is what makes "re-read from the source" checkable a year from now, and what
  `npm run audit:sources` uses.

Put the document in `.cache/sources/<SourceID>.pdf` so the re-read needs no new retrieval.

---

## 2. The product, and its material if it is new

A product is a grade of a material. Look for the material first:

```bash
npm run sql -- "select materialid, original_name, scope from materials where base_polymer = 'PA6'"
```

PA6 is M049, so STYX PA6 is a new grade of it:

```bash
npm run data:new -- grades --material M049 --set Manufacturer=FormFutura --set "Product name=STYX PA6" \
  --set Role=procurement --set Status=active --set SourceID=R-FORMFUTURA-STYX-PA6-TDS \
  --set "Shared formulation key=R-FORMFUTURA-STYX-PA6-TDS" --set "Source locator=Version 1.0, p. 1"
```

It takes the material's next GradeID (G049-02 then) and refuses until every required column has a value:
Composition / filler, Colour caveat, Availability, Certification claims, Selected-grade rationale and Diameter
compatibility, each another `--set`. STYX PA6's Composition / filler, for example, says its sheet discloses no filler
and its 1.15 g/cm³ and 2.9 GPa are within neat PA6. The Manufacturer is one spelling from
`schema/vocab/manufacturers.csv`.

If the product is a variant its material's Modifier / filler does not describe, set **Variant** on the grade and say
why in Composition / filler, so its values stay its own and do not pull the family (D53). STYX PA6 is not one. PA6's
first product, Spectrum PA6 Neat (G049-01), is: its 1.25 g/cm³ and 3.4 GPa show an undisclosed dense filler.

### A material that is not there yet

STYX PA6 did not need this, so the example is illustrative: no PA11 material exists yet.

```bash
npm run data:new-material -- --name "PA11" --polymer PA11 --family "Nylon / Polyamide" \
  --manufacturer <the maker> --product "<the product name>" --source <its SourceID>
```

It will **refuse**, and list the columns it will not invent:

```
materials: these columns carry no value and have no missing state to fall back on. They are what a
reader is told about the material, so they are written, not generated. Add them to the command:
  --set "Best uses=..."
  --set "Modifier / filler=..."
  --set "Role=..."
  --set "Identity notes=..."
```

That refusal is the design. Prose a reader is shown is written by a person who read the sheet; the scaffold writes
the identifiers and the structure. Re-run with each `--set` filled from what you actually know.

Two things decide whether the material can be estimated:

- **Estimate identity** names the row of `polymers.csv` the model treats the material as: its base polymer, or for a
  blend its own name. The scaffold sets it to `--polymer` when that polymer has a row, and to `Not applicable`, with a
  note saying so, when it has none.
- **A polymer with no row** needs one before its material is estimated: its group, morphology, melting point, how it
  solidifies in a print, water uptake and neat density, with the source they come from. PA11 has one.

---

## 3. The measurements

One row per published number. Copy an existing row of the same source with `--like`, then change what differs.
STYX PA6's tensile strength, V002341, is its tensile modulus row, V002340, with these changed:

```bash
npm run data:new -- measurements --like V002340 \
  --set Property="Tensile strength (endpoint unspecified)" \
  --set "Raw value=50 MPa" --set "Raw unit=MPa" --set "Raw numeric=50" --set "Conversion factor=1" \
  --set "Normalized value=50" --set "Normalized unit=MPa" \
  --set "Standard / load=ISO 527-1/-2; 23 °C, 50 mm/min" \
  --set Locator="p. 1: Tensile strength (23°C, 50mm/min)"
```

What the copy keeps is what the sheet says of both rows: tested at 23 °C to ISO 527, and no specimen, build
direction or moisture state stated. The first row of a new source has no row of its own to copy: copy one from a
sheet laid out like it, and change every column that differs.

The columns people get wrong, and why they matter:

| Column | What it is for |
|---|---|
| `Raw value`, `Raw unit` | Exactly what the sheet prints. The build reconciles raw × conversion factor against the normalized value. |
| `Direction` | `XY`, `Z`, … or, where the sheet states none and you have checked, `Unstated`. `Not published` means nobody has looked yet (D73); STYX PA6's rows were written the day before `Unstated` existed, and still say `Not published`. |
| `Specimen type` | A moulded bar, film or filament strand is not a printed part and never backs a printed headline (D55). |
| `Moisture condition` / `Moisture state` | The sheet's words, and the state the build reads (dry, conditioned, not-stated). |
| `Post-processing` / `Post-processing state` | The sheet's annealing sentence, and what it means. A new sentence is fine; it is data, not a schema change (D68). |
| `Standard / load` / `Standards` | The sheet's words, and the standards they name. Never write a standard the sheet does not print (D76). |
| `Locator` | Where on the sheet. This is what a re-read follows. |

A sheet that prints two tables, dry and conditioned or as-printed and annealed, must say in **each** row which table
it came from, or `npm run data:lint` reports `MEAS-CONDITIONS-INDISTINCT` and `verify` stops. That check exists
because two rows with identical conditions and different values are unreadable a month later.

Run `npm run data:check` as you go: it names the file, line, record and field.

---

## 4. The product's values, and the material's

Nothing to write. A measurement appears in the drawer as soon as it exists, and the build chooses each product's value
per headline from its own measurements by rule: comparable before as published, a printed specimen before an unstated
one, as printed before annealed, dry before unstated, the product's own data sheet first (`build/src/products.js`). A
product that publishes nothing for a headline reads its twin's value, a sibling whose sheet prints the same table,
labelled "same sheet as …" (D89). The material then shows its products' spread: the median of their comparable
values, their range, and the typical product.

STYX PA6's sheet states no test direction, so its 50 MPa (V002341) is its strength as published, not comparable: it
is counted apart and decides only when the reader asks (D84). Its density (V002336) has no direction to state, so it
is comparable and counts in PA6's density range. It has no twin: no other PA6 product shares its sheet.

Only where the rule chooses the wrong measurement for one product, pin it with a row in `headlines.csv` and say why.
STYX PA6 needs none, since its sheet prints one value for each headline, and `headlines.csv` held no pin when this was
written (2026-09-27). The row below shows the form only; its IDs are placeholders:

```csv
MaterialID,HeadlineKey,MeasurementID,Reason
M###,tensileStrengthXY,V######,"The sheet's first table is the dry, as-printed one; the rule took the second"
```

The build refuses a pin that is not that product's own, the wrong property or unit, another direction or load, a
moulded or film specimen, conditioned, physically implausible, or annealed where the product publishes the as-printed
value. It names which.

---

## 5. The print profile, and what a source says about printing

STYX PA6 has no print profile. Its sheet prints no print settings, only how to store the filament and that it should
be dried and printed from a dry box. It has no twin, and Bambu Lab's guide (D88) does not speak for PA6, so its print
gate is unknown on every part (`build/snapshot/print.csv`). The profile shown here is another PA6 product's: Spectrum
PA6 Neat (G049-01), P0064. A new one copies a profile of the same material and changes what differs:

```bash
npm run data:new -- profiles --like P0064 --set GradeID=<the product> --set SourceID=<its sheet> \
  --set Locator="<page: section>" --set "Nozzle °C=<as printed>" ...
```

Every column the copy brings is Spectrum's until you set it from your sheet, with `Not published` and state `unknown`
where your sheet is silent. (`--material` names a grade's material only; a profile takes its MaterialID from the copy
or from `--set`.) Each temperature axis has the sheet's own words and the typed window the build decides on: P0064's
nozzle is `250-280°C` in its words and `range`, 250 to 280, in its window, and the parser checks the two agree.
Qualitative guidance is not a column: it is a row of `profile_notes.csv` per topic (D69). P0064 has two:

```csv
ProfileID,Topic,Text
P0064,Cooling,0 - 10%
P0064,Speed,** 30-70 mm/s
```

What a maker says about its product in words (good for, benefits, warping) is makers' know-how, shown in the panel in
the maker's words (D85). STYX PA6 has thirteen such statements, Q03433 to Q03445, read from its sheet in m140.

---

## 6. Citations, and what is still missing

`material_links.csv` records what the material cites, in order: printing, h2c-status, use, durability, safety.
STYX PA6 added none: it joined a material that had its citations, and it has no profile of its own.

Then `coverage.csv`, but **only for what a reader could not work out**: a gap, a conflict, a comparability
limitation, a judgement. The build reports the domains the material's own records prove, and says what proves them
(D74). Do not write a row saying the material has measurements; it has them or it does not.

---

## 7. Check it, and see what it moved

```bash
npm run verify                    # the one gate: format, schema, lint, docs, build, tests, audit, snapshot, views, fuzz
npm run build:diff                # exactly the paths your change meant to move
git diff build/snapshot           # what it did to headlines, estimates, gates, templates, warnings
npm run trace -- M049             # every headline back to its source
npm run sql -- "select measurementid, property, value, unit, standard from v_measurements where gradeid='G049-02'"
npm run build && open dist/H2C_Material_Selector_*.html
```

Read the snapshot diff. A new product moves rows it is not obviously related to: it is a new observation in the
estimate model, so other materials' estimates can narrow or widen. That is the model working, and it is the part
worth a minute of attention before committing.

Then commit the data and the snapshot together, with the changelog in the commit message:

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
| `SCHEMA-REFERENCE` | A cell names an ID that does not exist, such as a grade in Applicable grades before step 2 writes it. |
| `PARSE-MISMATCH` | A typed value disagrees with the raw text beside it. Fix the typed value, or explain it in Parse review. |
| `HEADLINE-SELECTION-INVALID` | The measurement cannot be that headline. The message says which of the reasons it is. |
| `COVERAGE-UNTRUE` | A coverage row contradicts the records. Fix the row, or the records. |
| `ID-DUPLICATE` | An ID is reused. IDs are never reused; get the next with `npm run data:new-id`. |
| `n record(s) deleted` | Something was removed. Records are retired, never deleted (D72). |

Every code is in [RULES.md](RULES.md) with its meaning and its fix. If a check looks wrong, say so and fix the check
in its own commit with a reason. Do not weaken one to make a commit pass.
