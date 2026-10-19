# Stage 3c: the list sorted by what would settle each material

> **Historical record** (2026-10-18): stage 3c of the screening build, on branch `screening-build/stage-3c` from main 4aa1f73b (after stage 2c), with main eee16c21 (after stage 3b) merged in. It describes the tool as it was then. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** With "Include" chosen for the materials that could not be checked, the list used to put most of them
> in one folded heap called "Insufficient evidence". This stage sorts them by what would settle each. "One check away":
> a product waits on one printer setting its sheet does not state, or on one value just short of the limit. "Not enough
> data": everything else, with the ones whose estimate meets every open number tagged "likely" and listed first.
> "Unlikely to meet", folded and counted: a product measured the way you asked misses, and none meets it. Each row now
> names the product that puts it in its group, with that product's own numbers. The sorting moved no material's answer:
> not one verdict, count, listing or exported row. Separately, the "Flexible component" preset now asks for softness
> (tensile modulus at most 0.1 GPa) as well as stretch, so five materials pass it instead of twelve, all of them
> flexible. The decisions are D155 (the groups) and D156 (the preset) in [DECISIONS](../../DECISIONS.md).

## What does a reader see now?

Under "Include", once a requirement is set, the results come in up to six groups, always in this order.

- **Meets every requirement**: the materials that pass (the old "Supported candidates").
- **One check away**: one product needs a single question to its maker or one test. PA12-CF in the outdoor bracket
  reads "One check away on 1 of 15 products: 3DXTECH CarbonX CF PA12, its chamber: a heated chamber is recommended with
  no temperature, so 65 °C is not shown to be enough". ABS-GF reads "3DXTECH FibreX ABS+GF10 Glass Fiber ABS, HDT at
  0.45 MPa 98 °C, on the line for at least 100 °C".
- **Not enough data**: more is open than one question. The ones tagged "likely" come first, then the rest by how close
  their estimate is. PAHT-CF in the outdoor bracket reads "Not enough data, likely: BASF Forward AM Ultrafuse PAHT CF15,
  density estimated 1,030 to 1,170 kg/m³". PLA reads "Not enough data: colorFabb PLA-HP, HDT at 0.45 MPa published only
  in another state" (its 135 °C is an annealed value, which the outdoor bracket does not admit as printed).
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

These are the six presets with "Include" and "Use estimates and resin data" on, on main after stage 3b and before the
Flexible preset changed. Each cell counts materials.

| Preset | One check away | Not enough data (likely) | Unlikely to meet | Meets / hidden / fail |
|---|---:|---:|---:|---|
| Outdoor structural part | 7 | 33 (1) | 42 | 11 / 9 / 50 |
| Indoor prototype | 29 | 3 (0) | 0 | 96 / 0 / 24 |
| Lightweight structure | 16 | 33 (4) | 27 | 19 / 0 / 57 |
| Warm environment | 26 | 27 (0) | 15 | 42 / 16 / 26 |
| High-stiffness fixture | 10 | 27 (0) | 56 | 10 / 1 / 48 |
| Flexible component | 7 | 17 (4) | 75 | 12 / 2 / 39 |
| All six | 95 | 140 (9) | 215 | 190 / 28 / 244 |

Of the 140 "Not enough data" listings, 15 are the three materials with no product. With estimates off, nothing is
tagged likely and nothing is unlikely by its own estimate: the six presets then give 95 one check away, 193 not enough
data and 165 unlikely to meet. After the Flexible preset's change (below), its row reads 2, 14 (2), 85 and 5 / 3 / 43.

An example from each preset:
- **Outdoor structural part**: PA612-CF is one check away on 2 of its 3 products; QIDI PA612-CF's chamber temperature is
  not stated.
- **Indoor prototype**: PPS-ESD is one check away: the H2C reaches only the bottom of 3DXTECH's 120–160 °C bed window.
- **Lightweight structure**: PLA-GF is "likely" on Nobufil PLAx GF, its stiffness estimated 2.56 to 4.17 GPa against
  at least 2.5 GPa.
- **Warm environment**: PCTG is one check away on 4 of its 8 products, 3DXTECH MAXG PCTG publishing 76 °C against
  80 °C.
- **High-stiffness fixture**: PLA is one check away on 1 of its 195 products. Spectrum PLA Tough's stiffness is bounded
  at 4.81 GPa by another of its records (stage 3b's evidence ledger), on the line for 5 GPa. PEBA is unlikely to meet:
  its one measured product misses.
- **Flexible component** (after its change): PEBA is one check away on Siraya Tech Rebound PEBA 85A, whose chamber
  temperature is not stated. TPU-LW is "likely": Siraya Tech Flex TPU Air's stiffness is estimated 0.005 to 0.07 GPa.

## How does that compare with the review's estimate?

The review simulated about 128 one check away, 87 not enough data and 249 unlikely to meet, plus 15 with no product.
This stage gives 95, 125 and 215, plus the same 15.

- **Fewer one check away.** The review also counted a product as one check away when it meets the number only on a
  value measured another way. Stage 3b's evidence ledger now decides those outright: such a value passes or fails in
  its one safe direction, so most of those products left the unresolved groups altogether.
- **More not enough data.** The review moved more products into "one check away" than the ledger leaves there, and a
  ledger answer that leaves a number open keeps its product here.
- **Fewer unlikely to meet.** Stage 3a, merged after the review's run, put values just short of a limit on the line,
  and stage 3b turned some measured misses into failures of every product. A material with a product on the line is no
  longer "every measured product misses", and one whose every product now fails is under "Fail".
- **Fewer likely tags.** The review expected about 19 of 43 estimated candidates to keep the tag, fewer once the others
  moved to "one check away". This stage tags 9.

## What changed in the Flexible component preset?

The preset (a gasket, strap or phone case) asked only that a filament stretch at least 100 % before it breaks. A stiff
plastic that stretches far, such as a nylon blend at about 2 GPa or polypropylene, passed as a gasket material. It now
also asks for a tensile modulus of at most 0.1 GPa, the owner's number. Its "not checked" line reads "Recovery and
sealing; Shore hardness (Mechanical tab, or ask Shore A at most 95 as a requirement)".

- **Under Leave out**, 12 materials passed and 5 pass now: TPC, PBAT and the TPU 85A, 90A and 95A classes. Products
  passing fell from 34 to 15.
- **No longer passing, but not failed** (their passing products publish no modulus): PEBA, the lightweight TPUs (TPU-LW),
  the TPUs harder than 95A, OBC, PCL, polypropylene (PP) and the PA6/66 blend.
- **Now failing** on a measured modulus: glass-filled polypropylene (PP-GF), nGen FLEX, PAHT and TPU-GF.
- **Under Include with estimates**: 2 one check away, 14 not enough data (2 likely), 85 unlikely to meet and 3 hidden.
  PETG is unlikely to meet: 20 of its 73 products are measured stiffer than 0.1 GPa. PP, OBC and PCL are unlikely on
  their own estimates.

The review expected the nylon blend and polypropylene to leave, PETG, PC, PCTG and CPE to miss, and the elastomers to
stay. All but the last held: PEBA, TPU-LW and the hardest TPUs lose their pass for want of a published modulus, not
because one misses. The other five presets did not move.

## What did not move?

The comparison runs every preset in each mode, and 120 single-requirement cases, each side on its own code. The sorting
alone, against main after stage 3b, over 138 cases: 0 material verdicts moved and 0 listings changed. Every group name
changed, as it was meant to, and 959 rows now name another product, the one that decides their group. The whole stage,
the Flexible preset included, moved 33 material verdicts and 16 listings, all in the three Flexible component cases.
The full list is in [stage-3c-diff.md](stage-3c-diff.md).

- A test (in `test/screening.test.js`) runs the six presets and random questions in every mode. It checks that each
  material's answer is still the rule over its products' answers, that "Include" lists exactly the four listed groups,
  and that judging the products in reverse order moves no answer, count or group.
- The guard test now runs the page's own path, product by product. No material is "one check away" or "likely" for a
  requirement its deciding product's own range wholly misses, nor while every measured product misses it. A material
  with no product on record keeps the old guard.

## How was it checked?

- Tests: 751, all passing, on the code merged with stage 3b. New: the guard on the page's path and the metamorphic test
  above, and hand-built cases for each group, the likely tag, the measured-miss rule and the table's order.
- `npm run pages:check`: 16 of 16. `ui:check` written: the six presets' Include views show the groups and the fold, the
  Flexible preset's views moved, and no layout failed. The Flexible card's first wording, which ended "(soft)", pushed
  the table's bar 15 px below the fold of the laptop's cold page; the description is one clause shorter.
- `ui:fuzz` on 300 scenarios, seed 19, which now checks each row's group and its reason against the engine's: no
  violation in 798,171 checks before the merge with stage 3b and 801,253 after it.
- `verify:fast`: 68.1 s with the build cached (the budget is 90 s).

## What is left for later stages?

- The SCREENED chip still says SCREENED; "Hidden as unlikely" is the group's name on the list.
- The likely tag is to be revisited once stage 4 lets an estimate rest on other makers' printed values (C19).
- "Unlikely to meet" takes one measured miss, with no product meeting the number, as enough. It is folded and counted,
  never hidden, because a few failing products cannot rule out the rest.
- A chamber "recommended" with no temperature, an enclosure asked for with none, and a sheet's "-" keep a product one
  check away until its maker answers.

## Evidence and where to check

- The groups: `app/js/engine/constraints.js` (`GROUP`, `groupOf`, `compareGroups`, `materialGroup`, `measuredMiss`,
  `openWords`); the page: `app/js/ui/table.js` (`sortRows`, `unknownMark`, the group tables, both CSVs),
  `app/js/ui/explain.js` (`chosenBecause`), `app/index.html` (the switch's help).
- The Flexible component preset: `app/js/ui/templates.js`; its answers in `build/snapshot/templates.csv` and the
  `10-flexible-component-strict` and `11-flexible-component-explore-estimates` views.
- The tests: `test/screening.test.js` (the guard on the page's path, the metamorphic test),
  `test/product-screening.test.js` (the rules on hand-built products); `scripts/ui-fuzz.mjs` (I1-group,
  I1-group-reason), `scripts/ui-probe.mjs` (the fold and the groups' order); `build/snapshot/templates.csv` (Group).
- The comparison: `node decision-census.mjs --root . --db dist/db.json --out s3c.json`, then `--diff` against the
  census of main after stage 3a, written to [stage-3c-diff.md](stage-3c-diff.md).
