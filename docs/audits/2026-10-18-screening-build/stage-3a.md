# Stage 3a: the printer check, and "on the line"

> **Historical record** (2026-10-18): stage 3a of the screening build, on branch `screening-build/stage-3a` from main 50e5525d (release 60252f8fcd02). It describes the tool as it was then. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** This stage changes three answers the selector gives. A maker's nozzle, bed or chamber window that the
> H2C reaches the bottom of now passes when the H2C covers at least 5 °C of it, and is "on the line" when it reaches
> only the bottom edge. A product whose sheets say nothing at all about a heated chamber is now read as within when the
> makers of its kind of plastic support it: PLA, PETG, the flexible elastomers and ABS. And a published value just
> short of a limit, within its test's usual scatter, is on the line rather than failed. Across the six presets 28 more
> materials pass under Leave out, 127 more products pass the indoor prototype, and no pass was lost. The decisions are
> D151 (the printer check) and D152 (on the line) in [DECISIONS](../../DECISIONS.md), numbered as placeholders.

## What changed for a reader?

- **A window the H2C covers at its low end passes.** Spectrum's PC 275 asks for a 90–130 °C bed. The H2C reaches
  120 °C, 30 °C into that window, so the bed now reads "Within, at the low end of the maker's window (it asks
  90–130 °C; the H2C reaches 120 °C)". It used to fail, because the bed was read by its upper end. Bambu Lab's PPS-CF
  asks a 60–90 °C chamber; it passes the same way, and PPS-CF now passes the warm-environment preset.
- **A window the H2C touches only at its edge is on the line.** LCP's bed is 120–150 °C. The H2C's 120 °C is the
  window's bottom edge, so the check reads "On the line: the H2C reaches only the bottom of the maker's window (120 °C
  of 120–150 °C)". It is unresolved, not failed. LCP and 3DXTECH's PPS-ESD (120–160 °C) leave the failures in every
  preset.
- **The excluded plastics stay excluded.** PEKK's nozzle (340–380 °C on two of its sheets) now passes at the low end,
  and one PEKK product passes nozzle and bed alike. PEKK still fails, on its scope: the industrial high-temperature
  plastics are out of the H2C's scope whatever their windows say.
- **A silent chamber can be read from the kind of plastic.** QIDI's PEBA 95A stretches 1,107 % and its sheet never
  mentions a chamber. Of the 18 makers of flexible elastomers who state one on their own sheets, none asks above the
  H2C's 65 °C, so its chamber now reads "No chamber stated; of the 18 makers of Flexible Elastomers who state one, none
  asks above 65 °C". PEBA, TPC, TPU-LW and the hardest TPUs pass the flexible-component preset.
- **A chamber "recommended" with no temperature still waits.** That is a statement, not silence, and the owner ruled on
  5 October that it stays unknown. So does a sheet's "-" and an enclosure asked for with no temperature.
- **A value just short of a limit is on the line.** 3DXTECH's CarbonX CF-PLA publishes 4.95 GPa against a 5 GPa
  requirement. Its reason now reads "Published 4.95 GPa, just under 5 GPa: within the test scatter (10 %), so on the
  line; one test bar or a word with the maker settles it". A value just over a limit still passes, and its reason adds
  "a thin margin". The scatter is 10 % for stiffness and strength, 5 °C for heat deflection, 20 % for elongation and
  2 % for density.

## Which kinds of plastic decide a silent chamber?

A kind decides only where at least ten makers state a chamber on their own sheets (or a sheet a twin prints), and at
most one in ten of them asks above 65 °C. Bambu Lab's guide answers many products too, but it is not a maker's
statement, so it is not counted. Every row was reviewed by Claude Opus; no family was split, because no part of one
showed a different need.

| Kind of plastic | Makers stating | Asking above 65 °C | Reads silence as | Chambers filled |
|---|---:|---:|---|---:|
| PLA | 25 | 0 | within (deciding) | 39 |
| PETG | 21 | 0 | within (deciding) | 5 |
| Flexible elastomers | 18 | 0 | within (deciding) | 43 |
| ABS | 22 | 2 (Nanovia at 90 °C; Polymaker ABS Max "65˚C+", on the line) | within (deciding) | 7 |
| ASA | 18 | 2 (UltiMaker at 100 °C, Nanovia at 90 °C) | unknown | 0 |
| Nylon / polyamide | 17 | 2 (3DXTECH's "Up to 120C", UltiMaker at 100 °C) | unknown | 0 |
| Polycarbonate | 11 | 3 (Polymaker, Raise3D, Nanovia: 70 to 100 °C) | unknown | 0 |
| Industrial high-temperature | 11 | 9 | unknown | 0 |
| Copolyesters, high-performance engineering, polyolefins | 9 each | 0 | unknown: fewer than ten | 0 |
| PET engineering, polymer blends, PVB and specialty, soluble supports | 6 or 7 each | 0 to 3 | unknown | 0 |
| Styrenics, interface supports, fluoropolymers, acetals, sintering | 1 to 4 each | 0 or 1 | unknown | 0 |

Two of the unknown rows sit close to the line. ASA needs two more makers stating 65 °C or less. The nylons' second
maker above is 3DXTECH's "Up to 120C" for FIBREX PA12 GF30: a window open at its bottom, which this stage still reads
by its upper end. Read as "at most 120 °C", it would ask nothing above 65 °C and the nylons would be within. That
reading is the owner's to make.

After the four rows decide, 220 products' chamber checks stay unanswered, down from 314. Of those, 96 are silent
products of kinds that do not decide, 24 are declared variants, 31 recommend a chamber with no temperature, 46 ask for
an enclosure with no temperature, 6 print "-", 4 read a twin's enclosure request and 13 have no print recipe at all
(OPEN-PROBLEMS §30.3).

## What moved?

The comparison runs every preset in each mode, and 120 single-requirement sweeps, each side on its own code. Against
main (release 60252f8fcd02), 287 material verdicts moved in the 138 cases, 214 listings changed and 3,706 product
answers moved; no product or material lost a pass. The full list is in [stage-3a-diff.md](stage-3a-diff.md).

The six presets under Leave out:

| Preset | Materials passing | Materials failing | Products passing |
|---|---|---|---|
| Outdoor structural part | 7 → 11 | 44 → 42 | 11 → 21 |
| Indoor prototype | 87 → 96 | 26 → 24 | 686 → 813 |
| Lightweight structure | 15 → 18 | 55 → 50 | 36 → 41 |
| Warm environment | 39 → 44 | 29 → 25 | 118 → 144 |
| High-stiffness fixture | 5 → 8 | 43 → 42 | 6 → 16 |
| Flexible component | 8 → 12 | 42 → 39 | 22 → 34 |

Each change, in the order it was committed:
- **The low end and the edge** (D151, first part): PPA-CF, PPS-CF, PPS-GF and PBT-GF pass the outdoor bracket; ABS-CF,
  PPS, PPE-PS, PBT-GF, COC, TPS and TPV pass the indoor prototype; PPS-CF passes the warm part. LCP and PPS-ESD move from
  failed to unresolved. Product answers across the 18 preset cases: 213 unresolved to pass, 33 failed to pass, 153
  failed to unresolved.
- **The silent chamber, every row reported**: nothing moved. The build only counted.
- **The four rows deciding**: 94 chambers filled, 324 product answers unresolved to pass across the 18 preset cases. PEBA,
  TPC, TPU-LW and the hardest TPUs pass the flexible preset; TPU-LW and TPU-EC pass the indoor prototype; PLA Wood and
  ABS-CF pass the lightweight structure.
- **On the line** (D152): 348 product answers failed to unresolved across the 18 preset cases (per mode: Outdoor 22,
  Lightweight 58, Warm 29, High-stiffness 5, Flexible 2). PPA (outdoor); PET, PC-ESD, PPE-PS and PVC (lightweight);
  PCTG-GF and nGen-CF (warm) and TPU-GF (flexible) move from failed to unresolved. No pass was made or lost.

## How does that compare with the review's estimate?

- **LCP and PPS-ESD on the line, PEBA, TPC and the hardest TPUs passing the flexible preset, PPS-CF passing the warm
  part, PEKK passing its nozzle and still failing scope**: all as the review expected.
- **About 48 more passing listings, and the indoor prototype at about 106.** This stage gives 28 more, and 96. The review's
  simulation counted the makers that Bambu Lab's guide answers for as stating a chamber (it put PLA at 41 makers, this
  stage's own-sheet count at 25), and asked only three makers stating, where the brief asks ten. On those terms ASA,
  the nylons, the copolyesters, the polyolefins and PET would decide too. This stage follows the brief: only a maker's
  own statement counts, and ten are needed.
- **About 177 product answers moving from fail to on the line.** One mode of the six presets has 193 requirement results
  on the line (Outdoor 53, Lightweight 83, Warm 29, High-stiffness 25, Flexible 3), close to the review's count. Only 116
  products move per mode, because a product moves only where every requirement it fails is on the line; many also fail
  another requirement.

## What did not move?

- **No estimate.** The frozen estimate stage's output is identical: `build:diff` shows gates, print verdicts and
  reasons, the chamber rows and the scatter columns, and no estimate path. The chamber rule runs after the estimate
  stage, so the stage's product-screening validation set is the products whose own sheets, twins or guide settle all
  three printer checks, as before.
- **No pass was lost**, in any case. A metamorphic test runs the six presets with and without the scatter over the
  compiled database and finds the passing products to be one set.

## Which test fixtures changed?

The acceptance fixtures are protected; each change is annotated in the fixture with D151.
- `test/acceptance/portfolio.json` S01.4: Bambu Lab PPA-CF (G070-01), UNKNOWN to PASS: its 50–80 °C chamber is covered
  by 15 °C.
- S02.2 and S02.3: Spectrum PC 275 (G035-03) and FormFutura Kratos PC (G035-21), FAIL on the bed to PASS: their 90–130 °C
  bed passes at the low end. Each now also checks that nothing holds it on the bed.
- `test/acceptance/ashby-workspace.json` T09: the H2C beam's pass set, 10 to 11 (PPA-CF, D151's low end) and then 13
  (PLA Wood's COFFEE and Raise3D's Hyper Core ABS CF15, their chambers read from their kinds).

## How was it checked?

- Tests: 728, of which 727 pass and 1 is skipped. New: `chamber-need.test.js` (the rule on a hand-built database, and
  over the compiled one), the 5 °C boundaries for nozzle, bed and chamber with open and closed windows, on the line at
  the scatter's edge for modulus, heat deflection and density, and the metamorphic tests.
- `npm run pages:check`: 16 of 16. `ui:check` written: the status counts and the drawer's printer chips moved, with no
  layout failure. `ui:fuzz` on 300 scenarios, seed 13: no violation in 631,090 checks.
- `verify:fast`: 58.9 s and 63.8 s after a data change, 39.5 s with the build cached (the budget is 90 s). Its one
  failure is the decisions index: this stage's D151 and D152 are placeholders, and D149 and D150 belong to stages 2a
  and 2b on other branches. The index is otherwise current; the executor renumbers at merge.

## What is left for later stages?

- Products on the line, and those waiting only on a printer check, still sit with every other unresolved product.
  Stage 3c sorts them by what would settle each.
- A window open at its bottom ("Up to 120C") is still read by its upper end. One nylon row turns on it.
- The kinds with fewer than ten makers stating a chamber wait for more statements.

## Evidence and where to check

- The printer check: `build/src/normalize/process.js` (`withinH2C`, `H2C_LOW_END_C`), `build/src/gates.js`
  (`GATE_PRECEDENCE`), `app/js/engine/constraints.js` (`GATE_STATUS`), `app/js/ui/labels.js` (`GATE_VERDICT`),
  `app/js/ui/print-spread.js` (`OUTSIDE`, `lowEnd`).
- The silent chamber: `data/tables/chamber_need.csv`, `build/src/chamber-need.js`, `build/src/pipeline.js`; the counts
  with `node scripts/audit/chamber-need.mjs`; `db.chamberNeed` and the validation report's "Chamber need" section.
- On the line: `data/tables/headline_definitions.csv` (Test scatter), `build/src/registry.js`,
  `app/js/engine/constraints.js` (`evaluateNumeric`, `scatterMargin`).
- Records named above: LCP G139-01 (P1467), PPS-ESD G124-01 (P1400), PPS-CF G073-01, PEKK G098-04, QIDI PEBA 95A in M045,
  CarbonX CF-PLA V003304.
- The comparison: `node decision-census.mjs --root . --db dist/db.json --out after.json`, then `--diff` against a census
  of main, written to [stage-3a-diff.md](stage-3a-diff.md).
