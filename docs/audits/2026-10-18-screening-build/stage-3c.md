# Stage 3c: the list sorted by what would settle each material

> **Historical record** (2026-10-18): stage 3c of the screening build, on branch `screening-build/stage-3c` from main 4aa1f73b (after stage 2c). It describes the tool as it was then. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** With "Include" chosen for the materials that could not be checked, the list used to put most of them
> in one folded heap called "Insufficient evidence". This stage sorts them by what would settle each. "One check away":
> a product waits on one printer setting its sheet does not state, or on one value just short of the limit. "Not enough
> data": everything else, with the ones whose estimate meets every open number tagged "likely" and listed first.
> "Unlikely to meet", folded and counted: a product measured the way you asked misses, and none meets it. Each row now
> names the product that puts it in its group, with that product's own numbers. No material's answer moved: not one
> verdict, count, listing or exported row. The decision is D155 in [DECISIONS](../../DECISIONS.md), numbered as a
> placeholder.

## What does a reader see now?

Under "Include", once a requirement is set, the results come in up to six groups, always in this order.

- **Meets every requirement**: the materials that pass (the old "Supported candidates").
- **One check away**: one product needs a single question to its maker or one test. PA12-CF in the outdoor bracket
  reads "One check away on 1 of 15 products: 3DXTECH CarbonX CF PA12, its chamber: a heated chamber is recommended with
  no temperature, so 65 °C is not shown to be enough". ABS-GF reads "3DXTECH FibreX ABS+GF10 Glass Fiber ABS, HDT at
  0.45 MPa 98 °C, on the line for at least 100 °C".
- **Not enough data**: more is open than one question. The ones tagged "likely" come first, then the rest by how close
  their estimate is. PAHT-CF in the outdoor bracket reads "Not enough data, likely: BASF Forward AM Ultrafuse PAHT CF15,
  density estimated 1,030 to 1,170 kg/m³". PLA reads "Not enough data: FormFutura Volcano PLA 150C, tensile modulus (XY)
  estimated 2.09 to 3.23 GPa".
- **Unlikely to meet**, folded, with its count, "counted and exported": PETG in the outdoor bracket reads "Unlikely to
  meet: every measured product misses HDT at 0.45 MPa at least 100 °C: 45 of 73; the other 28 have no value measured
  that way".
- **Hidden as unlikely** and **Fail** appear only when their chips at the bottom are pressed, as before. A hidden row no
  longer says "Insufficient evidence"; its chip says what hid it.

Three smaller changes go with it:
- In a row that nothing settles, an estimated cell on a required number is now the deciding product's estimate, the one
  its reason names. Before, it was the material's own estimate, which decides nothing for a material with products.
- The drawer says "Shown for one product, X" and why that product, in place of "Shown for its closest product".
- Both spreadsheet exports carry the new group names in "Candidate group" (meets, one-check-away, not-enough-data,
  unlikely-to-meet, hidden, fail) and a new "Likely" column.

The words "Supported candidates", "Estimated candidates to verify", "Insufficient evidence" and "Excluded / screened"
are gone from the page and the living documents. The SCREENED chip keeps its word: renaming it to HIDDEN touches every
test and document that names it, and is left for a later stage.

## How is each group decided?

Each product gets a group from what it leaves open; the material takes its best product's group.

- **One check away**: everything the product leaves open is a printer check (nozzle, bed or chamber temperature), or it
  leaves exactly one requirement open and that value is "on the line" (just short of the limit, within its test's
  scatter) or its own sheets disagree on it.
- **Not enough data, likely**: everything open is a number, and for each the estimate's range shown on the page (80 %)
  meets the limit. Also, no required number may be missed by every product measured on it. The tag only orders the
  list. It never passes anything.
- **Unlikely to meet**: a product's own estimate misses wholly, its wide range (95 %) failing the limit.
- The rest are **not enough data**.

Then one rule works on the whole material. If, on some required number, a product measured the way you asked misses,
and no product meets it or is held open by its own measured value, the material is "unlikely to meet". Most of that
group comes this way. The row counts the measured misses and the products that publish no such value.

The best product is chosen by one order: meets, one check away, likely, not enough data, unlikely, hidden, fail. Among
equals it takes the product with fewer open requirements, then the one whose value or estimate is closest to the limit.
That is the product the row names, the drawer shows and the export's "Best product" column gives.

The three materials with no product on record (PA66-CF, PA612, PA612-GF) are judged on their own estimate as before.
They are hidden where it rules them out, and otherwise read "Not enough data: no product on record", never "likely".

## How many land in each group?

These are the six presets with "Include" and "Use estimates and resin data" on. Each cell counts materials.

| Preset | One check away | Not enough data (likely) | Unlikely to meet | Meets / hidden / fail |
|---|---:|---:|---:|---|
| Outdoor structural part | 7 | 32 (1) | 47 | 11 / 14 / 41 |
| Indoor prototype | 29 | 3 (0) | 0 | 96 / 0 / 24 |
| Lightweight structure | 15 | 35 (4) | 34 | 18 / 0 / 50 |
| Warm environment | 23 | 32 (0) | 15 | 41 / 16 / 25 |
| High-stiffness fixture | 8 | 26 (0) | 67 | 8 / 1 / 42 |
| Flexible component | 7 | 17 (4) | 75 | 12 / 2 / 39 |
| All six | 89 | 145 (9) | 238 | 186 / 33 / 221 |

Of the 145 "Not enough data" listings, 15 are the three materials with no product. With estimates off, nothing is
tagged likely and nothing is unlikely by its own estimate: the six presets then give 89 one check away, 202 not enough
data and 184 unlikely to meet.

An example from each preset:
- **Outdoor structural part**: PA612-CF is one check away on QIDI PA612-CF, whose chamber temperature is not stated.
- **Indoor prototype**: PPS-ESD is one check away: the H2C reaches only the bottom of 3DXTECH's 120–160 °C bed window.
- **Lightweight structure**: PLA-GF is "likely" on Nobufil PLAx GF, its stiffness estimated 2.56 to 4.17 GPa against
  at least 2.5 GPa.
- **Warm environment**: PCTG is one check away on 4 of its 8 products, 3DXTECH MAXG PCTG publishing 76 °C against
  80 °C.
- **High-stiffness fixture**: 67 materials are unlikely to meet 5 GPa, PEBA among them: one product measured, and it
  misses.
- **Flexible component**: TPU-GF is one check away: Siraya Tech's Fibreheart TPU GF stretches 80 % against 100 %.

## How does that compare with the review's estimate?

The review simulated about 128 one check away, 87 not enough data and 249 unlikely to meet, plus 15 with no product.
This stage gives 89, 130 and 238, plus the same 15.

- **Fewer one check away, more not enough data.** The review also counted a product as one check away when it meets the
  number only on a value measured another way that no measured product contradicts. That needs stage 3b's evidence
  ledger, which is built on another branch and not yet merged. Until it lands, those products sit under "not enough
  data".
- **Slightly fewer unlikely to meet.** Stage 3a, merged after the review's run, put values just short of a limit on the
  line. A material with such a product is no longer "every measured product misses".
- **Fewer likely tags.** The review expected about 19 of 43 estimated candidates to keep the tag, fewer once the others
  moved to "one check away". This stage tags 9.

## What did not move?

The comparison runs every preset in each mode, and 120 single-requirement cases, each side on its own code. Against
main after stage 3a, across 138 cases: 0 material verdicts moved and 0 listings changed. Every group name changed, as
it was meant to, and 1,053 rows now name another product, the one that decides their group. The full list is in
[stage-3c-diff.md](stage-3c-diff.md).

- A test (in `test/screening.test.js`) runs the six presets and random questions in every mode. It checks that each
  material's answer is still the rule over its products' answers, that "Include" lists exactly the four listed groups,
  and that judging the products in reverse order moves no answer, count or group.
- The guard test now runs the page's own path, product by product. No material is "one check away" or "likely" for a
  requirement its deciding product's own range wholly misses, nor while every measured product misses it.

## How was it checked?

<!-- filled at the end of the stage -->

## Evidence and where to check

- The groups: `app/js/engine/constraints.js` (`GROUP`, `groupOf`, `compareGroups`, `materialGroup`, `measuredMiss`,
  `openWords`); the page: `app/js/ui/table.js` (`sortRows`, `unknownMark`, the group tables, both CSVs),
  `app/js/ui/explain.js` (`chosenBecause`), `app/index.html` (the switch's help).
- The tests: `test/screening.test.js` (the guard on the page's path, the metamorphic test),
  `test/product-screening.test.js` (the rules on hand-built products); `scripts/ui-fuzz.mjs` (I1-group,
  I1-group-reason), `scripts/ui-probe.mjs` (the fold and the groups' order); `build/snapshot/templates.csv` (Group).
- The comparison: `node decision-census.mjs --root . --db dist/db.json --out s3c.json`, then `--diff` against the
  census of main after stage 3a, written to [stage-3c-diff.md](stage-3c-diff.md).
