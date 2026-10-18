# Stage 2a: the values that decided wrongly, and four physics checks

> **Historical record** (2026-10-18): stage 2a of the screening build, on branch screening-build/stage-2a, before it merged. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** The screening review found that a few published values decided answers they should not: PLA was offered
> for a 100 °C outdoor bracket on an annealed figure read as printed, a 6 MPa PBAT passed an 80 °C heat test, and
> carbon-fibre PETGs weighed less than plain PETG. This stage re-read every such value on its page, settled each one,
> and added four checks so the next one is caught when it enters. PLA leaves the outdoor bracket's estimated
> candidates, and PLA-CF, PLA-NF and PBAT stop meeting Warm environment, as the review predicted. A few other answers
> moved, each because a value was settled or CarbonFil's newer data sheet entered; they are listed below. The printer
> guide needed no new mapping. Your spot-check list is [SPOT-CHECK.md](SPOT-CHECK.md).

## What changes for a reader

**PLA is no longer offered for the 100 °C outdoor bracket.** colorFabb PLA-HP's 135 °C carries an asterisk on its 2024
sheet: "Optimal temperature resistance is obtained after annealing the sample". It is now recorded as an annealed value.
It no longer decides for a part used as printed, so the bracket no longer lists PLA as an estimated candidate.

**Warm environment passes 36 materials, not 39.** PLA-CF, PLA-NF and PBAT each passed on one heat value their own page
does not bear out. 3DXTECH's CarbonX CF-PLA prints 91 °C beside a glass transition of 60 °C, on bars printed on a 23 °C
bed. Nanovia's PLA Flax prints 80 to 90 °C beside "Max temperature 55 °C". Flashforge's PBAT prints 90 °C beside a
modulus of 6 to 7 MPa. Each is now flagged physically implausible: shown, but deciding nothing. The three materials are
now "can't tell yet" for that preset.

**ABS is no longer an estimated candidate for Lightweight structure.** It rested on purefil ABS's "Tensile modulus
(ASTM D790) 2700 MPa". ASTM D790 is the bending test, the label says tension, and the sheet cannot say which. The value
is held back.

**PLA-CF no longer passes "tensile strength at least 100 MPa"** (with values whose bar is not stated allowed).
iSANMATE PLA CF's 120 MPa is a moulded test bar, like every other row of its table.

**FormFutura CarbonFil now shows its 2024 data sheet.** It says 15 % carbon fibre, 1.32 g/cm³, 45 MPa and 4.9 %, and
asks for an enclosure without giving a chamber temperature. So CarbonFil now fails Lightweight structure (1.32 is not
light), fails "tensile strength at least 50 MPa", and is "can't tell yet" in Indoor prototype: its own sheet's enclosure
request now speaks where the printer guide used to.

**Six products lose a heat value at 1.8 MPa.** Two documents of Fiberlogy FiberWORKS PETG print one 70 °C, one at 1.8 MPa
and one at 0.45 MPa. The same holds for Fiberlogy PP's 51 °C and colorFabb PA Blue Metal Detectable's 90 °C. The 0.45
MPa reading is kept, because it holds whichever label is right; the 1.8 MPa one is held back. FormFutura ApolloX
Kevlar's 95 °C at 1.81 MPa sits above its own 89 °C at 0.45 MPa, and its two twins read it too; it is flagged. No preset
asks for heat at 1.8 MPa, so no preset answer moved from these.

## How each value was settled

Every value was read on its page by Claude Opus 5.5, beside an earlier read by a Claude Sonnet reader. The full list,
with each page's words, is [SPOT-CHECK.md](SPOT-CHECK.md). The rules used:

- **Record what the page states.** PLA-HP's footnote states annealing, so the row says annealed (schedule not stated).
  iSANMATE's Specimen column names ISO 3167 A, the moulded test bar, on every row, so its tensile strength is a moulded
  value like its siblings.
- **Flag what the page cannot mean** (twelve values). A glassy PLA bar softens near its glass transition. Six PLA heat
  values sit 25 to 34 °C above theirs, and no page says those bars were annealed. A bar of 6 or 50 MPa is too soft for
  a heat-deflection test to mean a rigid part's softening point. A carbon-fibre PETG cannot be lighter than plain PETG.
  A heavier load cannot give a higher heat-deflection temperature.
- **Hold back what the page leaves unclear** (seven values). A label and a standard that name different tests: purefil
  ABS's modulus, and two rows of CarbonFil's 2024 sheet. One number two documents print at two loads: four heat values.
  We never guessed a load. The 0.45 MPa reading stays because it is true under either reading. If the number is the
  1.8 MPa result, the 0.45 MPa one is higher still.
- **Keep what the page supports, and write the reason** (eight findings). Polymaker HT-PLA-GF prints 75.5 °C "(as
  printed)", 15.7 °C above its glass transition. Its sheet shows the grade crystallising: a crystallisation and a
  melting point, and 114.7 °C once annealed. Stratasys PC-ABS is a blend with two glass transitions. colorFabb
  nGen_FLEX's 100 °C is its resin supplier's figure for an elastomer that melts at 205 °C. Two Fiberlogy products have two
  documents that disagree, each in order with itself.
- **Leave alone what the page does not settle.** Yousu PC's 150 %, Fillamentum CPE HG100's 150 %, Spectrum PCTG's 220 %
  and Spectrum PETG Lite's 160 % stretch come from sheets that say nothing about how their bars were made. No specimen
  was invented for them.

**CarbonFil's 2024 sheet entered through the import pipeline** (batch b46). It is a later revision of the sheet already
held, which said 20 % fibre and 1.19 g/cc. A later revision of a maker's sheet speaks for the product, so the product's
own sheet is now the 2024 one. Where both revisions print a property, the 2024 figure is the product's. Where only the
earlier one does, its figure still stands: a tensile modulus of 9495 MPa, for the old 20 % fibre. The earlier sheet's
1.19 is flagged; its other rows stay as they were.

## The four checks, and how the margin was set

| Check | What it catches | Example |
|---|---|---|
| Glassy bar above its glass transition (PR12) | A heat-deflection temperature at 0.45 MPa more than 15 °C above the same sheet's glass transition, for a glassy polymer, on a bar not annealed | CarbonX CF-PLA: 91 °C against 60 °C |
| Too soft for the test (HDT-SOFT) | A heat-deflection temperature for a product whose stiffest modulus is below 225 MPa, where heat deflection applies | PBAT: 90 °C beside 6 MPa |
| Filled but lighter than the resin (FILLED-DENSITY) | A fibre- or particle-filled product more than 2 % lighter than its plain polymer's lowest density | Recreus PET-G CF: 1.1 against 1.22 |
| One heat value at two loads (PR08, widened) | A 1.8 MPa value above a 0.45 MPa value across all of one product's documents and its twins' sheets, not only within one sheet | ApolloX Kevlar 95 °C against its twin's 89 °C |

**How the 15 °C margin was set.** The database holds 98 pairs of a PLA heat-deflection value at 0.45 MPa and a glass
transition from the same sheet, on bars not said to be annealed. Their middle value is 4 °C below the glass transition.
89 of them sit at most 5 °C above it. Above those come Polymaker's HT-PLA grades, which crystallise as they print, at
10 and 16 °C. Then a gap, and six values at 25 to 34 °C. A 15 °C margin clears every glassy pair by 10 °C and catches
the six. HT-PLA-GF, at 15.7 °C, is caught and kept with its reason. The plausibility window W0056 said an amorphous bar
deflects at its glass transition "plus 20 °C"; its description now says what these pairs show.

**Why 225 MPa.** The heat-deflection test waits for a loaded bar to bend a further 0.2 % of its depth. At 0.45 MPa, a bar
below 225 MPa is bent more than that by the load alone. A small loss of stiffness, or creep, then ends the test: the
number is not the softening of a rigid part. Elastomer families already never decide on heat deflection, so the check
looks only where heat deflection applies.

**Why 2 % for density.** Eight carbon-fibre products print 1 to 2 % under their plain polymer's lowest density, among them
four Bambu Lab sheets. That is within a density test's scatter and a filament's few voids, so they are left as published
and named in OPEN-PROBLEMS §17. The two caught were 10 % and 2.5 % under.

## What moved

The decision census ran the six presets in three modes and 120 single-requirement cases, before (stage 0) and after,
each with its own code. Over 138 cases, 47 material verdicts moved, 19 listings, 51 groups and 216 product answers
([the full list](stage-2a-diff.md)). Everything traces to a value above:

| Where | What moved | Because |
|---|---|---|
| Outdoor structural part, with estimates | PLA: estimated candidate → can't tell yet | PLA-HP's 135 °C is annealed |
| Warm environment, every mode | PLA-CF, PLA-NF, PBAT: pass → can't tell yet (39 → 36 pass) | Their heat values are flagged |
| Lightweight structure, with estimates | ABS: estimated candidate → can't tell yet | purefil ABS's modulus is held back |
| Heat at 0.45 MPa (60, 90, 120 °C) | PLA, PLA-CF, PLA-NF, PBAT verdicts; nine products to "can't tell yet" | The flagged and annealed heat values |
| Density (900, 1250, 1500 kg/m³) | CarbonFil now 1.32; Recreus PET-G CF has no density; PETG-CF no longer fails 1.5 g/cm³ outright | CarbonFil 2024; Recreus flagged |
| Tensile strength (20, 50, 100 MPa) | PLA-CF no longer passes 100 MPa; CarbonFil fails 50 MPa | iSANMATE's moulded bar; CarbonFil's 45 MPa |
| Stretch and stiffness with annealing allowed | PLA-HP: fail → can't tell yet | It now has an annealed value, so it is also judged annealed, a state its as-printed numbers do not describe |
| Indoor prototype | CarbonFil: pass → can't tell yet | Its own sheet asks for an enclosure with no temperature |

**Against the review's expectation.** PLA leaving the outdoor estimated candidates, and PLA-CF, PLA-NF and PBAT leaving Warm
environment, came out as predicted. The review expected at most one product to move from the two-load check. In the
census none did, because no case asks for heat at 1.8 MPa. Outside it, six products lost a 1.8 MPa heat value (above).
The other moves come from values the review had queued for stage 2b (purefil ABS, CarbonFil, Recreus, iSANMATE), done
here.

**Counts that moved.** 174 values are flagged physically implausible (162 before) and 43 are held back (36). One more
product, CarbonFil, has no chamber temperature (315). One more material, PBAT, has an estimated heat value: its only
measured one is flagged.

## What the estimate model did

The estimate model's code is unchanged; it is frozen until stage 4. Its inputs changed: 17 values flagged or held back
left its pool, iSANMATE's 120 MPa became a moulded value, and CarbonFil's four usable values joined it. So `npm run build:diff` shows estimate paths moving. In
plain numbers:

- **Product estimates (middle values).** Tensile strength moved on 283 products. Four moved by more than 1 %: iSANMATE PLA
  CF fell from 126 to 52.5 MPa, now that its moulded 120 MPa no longer counts as its own printed value. Stretch moved on
  88, one by more than 1 % (CarbonFil, 4.98 → 6.5 %, its own new value). Stiffness moved on 46, three by more than 1 %
  (Eryone Hyper-Speed ABS 1.08 → 1.24 GPa and purefil ABS 2.59 → 2.37 GPa, whose own odd moduli no longer count).
  Density moved on 9, none by more than 1 %.
- **Material estimates.** 71 estimated cells moved, 68 of them by under 2 % in the middle value and under 5 % at the
  ends. Three moved more. ASA-AF's heat value went from 95–105 to 66–96 °C: ApolloX Kevlar's flagged 95 °C no longer
  sets its floor. PBAT gained an estimated heat value of 52–108 °C. PAHT's middle value moved from 135 to 129 °C.
- **The screening back-test** (`build/snapshot/screening.csv`) moved in its quantiles only. No end changed whether it may
  screen.
- **Path counts in build:diff:** grades' estimates (tensile strength 1,838, stiffness 956, stretch 380, density 303
  paths), materials' heat estimates (227), the model's conflict and outlier lists (617 and 188), its per-property
  summaries (98), and the materials' strength, stiffness, stretch and density estimates (51, 33, 15 and 15).

## The printer guide (change C17)

No new mapping is justified. Of the 77 materials held only by a printer check, 9 are already mapped to a column of Bambu
Lab's guide. Each of the other 68 differs from its nearest column in polymer or filler, or is a blend: carbon-filled ABS
where the guide has only glass-filled ABS, PA12 where it has PA6, plain PPS where it has PPS-CF. Mapping any of them would
put another type's nozzle, bed and enclosure answers on it. The one borderline case, TPUs harder than 95A against the
guide's "TPU 95A HF", is another hardness class and was not mapped. The nine mapped materials stay held because the
guide gives no chamber temperature for any type; a chamber figure, not a mapping, would move them (stage 3a).

## What this stage did not do

- The plan also put four supporting pieces in stage 2a: a derived "Printed state" field, a "negligible" water-uptake
  value, sourced neat densities for the polymers the class limits will use, and PLA's melting point with a source. They
  were not in this stage's brief and are still to be built before stages 3b and 4 need them.
- nGen_FLEX is filed under an amorphous copolyester but is a copolyester elastomer (OPEN-PROBLEMS §38.1). Re-filing it
  would move the frozen estimate model, so it waits for stage 4.
- Which revision speaks for Fiberlogy PLA MINERAL, and which R PP Fiberlogy sells now, wait for a ruling or the maker
  (OPEN-PROBLEMS §37.3).

## Checks run

`data:fmt`, `data:check` (0 issues) and `data:lint` (380 findings, all accepted with a reason, none stale). The six
migrations replay on the stage-0 tables to the same bytes. The new lint tests pass. `npm run verify:fast` took 60.0 s
right after the data change and 38.3 s once the build cache held it, within the 90 s budget; its one failing step is
the decisions index, which finds no D148 because stage 1 adds it on its own branch. The full `npm run verify` ran 22
steps in 442 s: the 300 rendered scenarios, the context audit (no new finding, so CarbonFil's new rows and profile hold
on their page), the material pages, the import tests, the scale and the reproducible-build checks all passed. Besides
the decisions index, the interface views differed from their snapshot because the data changed (Warm environment's 39
became 36, PLA's and ABS's estimated rows went, PBAT's flagged 90 °C shows its marker); they were rewritten with
`ui:check -- --write`, read, and show no layout failure. The data snapshot was rewritten and its diff read.

## Evidence and where to check

- Migrations: `scripts/migrate/m438-physics-checks-as-data.mjs` (PR08, PR12, W0056),
  `m439-pla-heat-values-their-pages-do-not-bear-out.mjs` (C11), `m440-heat-deflection-of-soft-bars.mjs` (C12),
  `m441-one-hdt-at-two-loads.mjs` (C15), `m442-batch-b46-carbonfil-2024.mjs` (C14, the import) and
  `m443-densities-and-a-modulus-label.mjs` (C13, C14). Batch b46's builder, proposal and packet are in [ingest/](ingest/).
- Checks: `build/src/physical-relations.js` (the formulation key, the Annealed exemption), `build/src/lint-rules.js`
  (MEAS-PHYSICS-HDT-TG, -HDT-SOFT, -FILLED-DENSITY), `test/lint.test.js` (four new tests). Decision D149.
- The re-read dossier and the guide candidates the stage started from are in the private cache
  (`.cache/screening-build/rereads/DOSSIER.md`, `GUIDE-CANDIDATES.md`).
- Decision diff: `node docs/audits/2026-10-18-screening-build/decision-census.mjs --diff <stage-0 base.json> <s2a.json>`.

The record-level change list (`npm run data:diff`; a Notes edit appends the reason the spot-check list gives):

| Table | Record | Change |
|---|---|---|
| grades | G024-21 | SourceID: S-PET-TDS-CarbonFil → R-FORMFUTURA-SB-20261018-7b525961687e; Composition / filler: the 2024 sheet's 15 % beside the earlier 20 % |
| measurements | V003212, V003309, V007474, V007533, V010211, V010287 | Data status → physically implausible (PLA heat values) |
| measurements | V005369, V011485, V005140, V007527, V009831, V015320 | Data status → physically implausible (PBAT, COC flex, Eryone modulus, ApolloX Kevlar, two densities) |
| measurements | V005563, V009228, V011126, V012429, V013149 | Data status → Unresolved unit / layout |
| measurements | V005853 | Post-processing → "Optimal temperature resistance is obtained after annealing the sample"; state annealed; Anneal °C and h → Not published |
| measurements | V015178 | Specimen type → Raw material value |
| measurements | V015425 to V015430 | Added (CarbonFil 2024; V015426 and V015429 held back) |
| physical_relations | PR08 | Same test → formulation; moisture condition; post-processing; Basis reworded |
| physical_relations | PR12 | Added |
| plausibility_windows | W0056 | Basis reworded |
| profiles, profile_notes | P1916 (Speed, Cooling, Storage humidity) | Added |
| sources | R-FORMFUTURA-SB-20261018-7b525961687e | Added |
| review | accepted-findings.csv | 8 acceptances added, 3 that no longer occur removed |

## Words used here

- **Flagged (physically implausible):** kept and shown, but deciding nothing, because the number cannot be what its label says.
- **Held back:** kept and shown, deciding nothing, because the page does not say what the number is.
- **Estimated candidate:** a material listed because the estimate's middle value (a 50/50 guess) meets the requirement.
- **Glass transition:** the temperature at which a glassy plastic turns rubbery; a printed PLA part softens there.
