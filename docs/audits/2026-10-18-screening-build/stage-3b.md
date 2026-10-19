# Stage 3b: the evidence ledger, and physics limits per kind of plastic

> **Historical record** (2026-10-18): stage 3b of the screening build, on branch `screening-build/stage-3b` from main 9b37ce5d, with stage 2c (main 4aa1f73b) merged in before the rows that need its sources. It describes the tool as it was then. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** Most data sheets print something other than what a requirement asks: the heat deflection at 1.8 MPa and
> not at 0.45 MPa, a stiffness after annealing, in humid air, pulled across the layers or in bending. Until this stage
> such a value never decided anything. Now each relation is a row of data that says what the other value tells us, and in
> which one direction that is safe; and a kind of plastic's physics (a rubber is never stiff) can settle a product that
> publishes nothing. A product's own value measured the way the requirement asks still always wins. Across the six
> presets, 9 more materials fail the outdoor bracket, 7 more fail the lightweight structure and 6 more the stiffness
> fixture, while PET-CF and PA6-CF now pass the stiffness fixture; every pass lost rests on a PLA or PET heat value that
> is only a ceiling for a print. The decisions are D153 (the evidence ledger) and D154 (the physics limits) in
> [DECISIONS](../../DECISIONS.md).

## What changed for a reader?

- **Another load can meet the requirement.** LEHVOSS LUVOCOM 3F PAHT publishes its heat deflection only at 1.8 MPa,
  80 °C. A bar deflects sooner under the heavier load, so it meets "at least 80 °C at 0.45 MPa": "Meets it on its HDT at
  1.8 MPa, a harsher load: 80 °C". PAHT, PA6-CE and the PPE-PS blend now pass the warm-environment preset.
- **An annealed value is the most a print reaches.** Annealing a print crystallises it and only raises its heat
  deflection. Bambu Lab's PLA sheets print 57 °C after annealing, so the printed part fails a 100 °C bracket: "Its HDT
  after annealing: 57 °C, the most it reaches as printed: fails 100 °C". A stiffness after annealing is read the same
  way, times 1.28, because annealing can lower stiffness too.
- **A PLA or PET heat value from an undescribed bar is only a ceiling.** These plastics print glassy but can crystallise:
  a moulded bar, cooled in a hot tool, is crystalline and a print is not. FormFutura Volcano PLA's 110 °C, on a bar its
  sheet does not describe, still shows on the page and in PLA's spread, but it can no longer pass 80 °C. PLA and the PLA
  blends lose the warm-environment preset. A value measured after annealing is not touched: that part has crystallised.
- **Humid air does not matter for some plastics.** BASF Ultrafuse PET CF15 measured 6.18 GPa on bars held 72 h at 23 °C
  and 50 % humidity. PET takes up almost no water, so that counts as dry, and PET-CF passes the stiffness fixture, as
  the materials scientist's case C-J said it should.
- **A flexural value bounds the tensile one.** SIDDAMENT PA12-CF publishes only a flexural modulus of 1.3 GPa. Every
  product here that publishes both puts the tensile one between 0.46 and 1.93 times the flexural, so it fails 5 GPa: "Its
  flexural modulus: 1.3 GPa, so between 0.598 and 2.895 GPa: fails 5 GPa". SUNLU PA6-CF's 11 GPa flexural modulus puts
  it at 5.06 GPa or more, so PA6-CF passes the stiffness fixture, with a thin margin.
- **A rubber is never stiff.** A TPU or an olefin elastomer with no published modulus now fails any stiffness above
  0.5 GPa: "An unfilled rubber (TPU, PEBA, OBC) is never stiffer than 0.5 GPa: fails 5 GPa". The four TPU classes and OBC
  leave the three stiffness presets.
- **Records that leave no value between them say so.** Fiberlogy's PLA MINERAL prints 50 °C at 1.8 MPa on its 2021 sheet
  and 48 °C at 0.45 MPa on its 2025 revision. The answer is "Its records disagree", unresolved, never a pass or a fail.
- **A doubtful number is flagged.** Four densities lie outside their plastic's sourced range by more than the test's
  scatter (Spectrum's PET-G HT100 at 1.18 g/cm³, for example). They still decide, and the answer says "Doubtful".

## How does each row decide, and what did it move?

Each relation landed reporting only, then decided in a commit of its own. The band column is what every pair of values
printed on one sheet of one product supports, re-measured at every build. "Moved" counts answers across the 138 cases
of the comparison (six presets in three modes, and 120 single-requirement sweeps).

| Row | What it says | Band on same-sheet pairs | Moved |
|---|---|---|---|
| CV01 | HDT at 1.8 MPa is a floor for HDT at 0.45 MPa | 255 pairs, 206 products: 4 °C below to 119.5 °C above; 2 pairs break it, accepted | 409 unresolved to pass |
| CV03 | An annealed HDT is a ceiling, as printed | 11 pairs: annealed 19 to 107.5 °C higher | 344 unresolved to fail |
| CV04 | An annealed modulus times 1.28 is a ceiling | 13 pairs: printed 0.76 to 1.27 times annealed | 315 unresolved to fail |
| CV05 | A PLA or PET HDT from an undescribed bar is a ceiling | 1 pair (printed 5 °C below) | 107 passes to unresolved, 529 to fail |
| CV06 | A Z modulus times 0.79 is a floor for XY | 208 pairs, 155 products: XY 0.79 to 5.2 times Z | 18 to pass |
| CV09 | A Z strength times 0.86 is a floor for XY | 251 pairs, 192 products: 0.86 to 9.9 | 44 to pass |
| CV07 | A nylon's humid modulus is a floor for dry | 13 pairs, 9 products: dry 1.0 to 3.7 times | 4 to pass |
| CV08 | Tensile is 0.46 to 1.93 times flexural | 290 pairs, 235 products: 0.46 to 1.93 | 242 to fail, 54 to pass |
| CV02 | Lab-humidity stiffness counts as dry (low-water plastics) | no pair on one sheet | 45 to pass |
| CV12 | Lab-humidity strength counts as dry (low-water plastics) | no pair on one sheet | 28 to pass, 16 to fail |
| CL02 | An unfilled product's density is its polymer's | the sourced neat ranges | 336 to pass, 467 to fail |
| CL01 | An unfilled rubber is never stiffer than 0.5 GPa | the Cambridge Materials Data Book | 840 to fail |

Two rows stay reporting only: CV10 and CV11, floors on elongation at break from elongation at yield and from the strain
at the maximum stress. They exist so the frozen estimate model's lower bounds and the ledger name one relation (the
check called LEDGER-LB-DRIFT). Both hold on every pair (12 and 6) and could decide; the brief did not ask for them.

### Where the measured band differs from the experts' figure

- **The flexural band is wider.** The review proposed 0.70 to 1.59, the middle 95 % of the materials scientist's pairs.
  Ten pairs here lie outside it, five above. One is colorFabb XT-CF20 at 5.15 GPa tensile beside 2.7 GPa flexural: the
  narrow band would fail such a product at exactly the 5 GPa fixture. So the band is the full range of solid,
  non-rubbery bars: 0.46 (Creality Hyper-PLA+) to 1.93 (colorFabb PETG Economy, 1.93 against 1.0 GPa). Rubbers and
  foamed filaments are left out; colorFabb's foamed Lightweight PET FLEX prints 1.5 against 0.523 GPa. It fails 25
  products of the stiffness fixture where the review expected about 40.
- **The annealed-stiffness allowance is 1.28, not 1/0.79.** BASF's PAHT CF15 sheet prints 8.386 GPa dry as printed and
  6.588 GPa dry annealed, a ratio of 1.273, just over the review's 1.266. So PA612-ESD and PPS-GF, which the review
  expected to fail, stay open: their annealed 4.29 and 4.55 GPa times 1.28 reach 5.50 and 5.83 GPa.
- **The Z floors are the lowest pair's ratio.** The experts measured Z up to 1.07 times XY for stiffness. The lowest pair
  here is Polymaker PolyMide PA6 GF, conditioned after annealing, at 2.053 GPa flat against 2.593 GPa upright, so the
  floor is 0.79.

### The water-uptake threshold (CV02, CV12)

The executor ruled on 2026-10-18 that a plastic takes up negligible water when its registered source prints a saturated
uptake of at most 0.5 % (ISO 62), or, where it prints only a 24-hour figure, at most 0.15 % in 24 h. From the figures
stage 2c recorded, that is PE, PP, PPS, PVDF, PC, PET, PETG and PC-PBT. PET's source prints 0.50 % to ISO 62 and 0.9 % to
ASTM D570, a different, longer immersion. ABS (1 %), ASA, PC-ABS (0.7 %), POM, the rubbers and every nylon are left out.
For the nylons the humid value is a floor for the dry one instead (CV07).

### Why PLA-PHB is not demoted

The review expected PLA-PHB to lose the warm-environment preset with PLA. Its polymer row, sourced from Panara and
Fillamentum, records that it crystallises while printing: NonOilen's own sheet gives 119 °C at 0.45 MPa as printed, with
"no need for annealing". A plastic that crystallises as it prints keeps the acceptance of undescribed bars, as the nylons
and PP do, which is the review's own rule for those. So CV05 names PLA, the PLA blends, PLA-PHA and PET, and not PLA-PHB.

### The rubber limit's source

The Cambridge Materials Data Book (registered by stage 2c) prints a table of Young's modulus (section II.3, page 11 of the
book). Read on the page image: every elastomer class it lists lies between 0.0007 and 0.04 GPa, polyurethane elastomers
at 0.002 to 0.003 GPa. It lists rigid thermoplastic polyurethanes separately, at 1.31 to 2.07 GPa; those are not
rubbers, and no product of the rubber kinds here is one. The limit stays at the experts' 0.5 GPa, well above the book's
rubbers and above the hardest unfilled rubber filaments here (Shore D TPUs at 0.39 to 0.40 GPa). It applies to unfilled
rubbers only, never a declared variant or a material of undisclosed commercial variants, so TPC/TPEE and the conductive,
filled and foamed rubbers are left out.

## What moved in the presets?

Leave out mode, before and after this stage (the other two modes move the same way):

| Preset | Materials passing | Materials failing | Products passing |
|---|---|---|---|
| Outdoor structural part | 11 → 11 | 41 → 50 | 21 → 22 |
| Indoor prototype | 96 → 96 | 24 → 24 | 812 → 812 |
| Lightweight structure | 18 → 19 | 50 → 57 | 41 → 43 |
| Warm environment | 41 → 42 | 25 → 26 | 136 → 156 |
| High-stiffness fixture | 8 → 10 | 42 → 48 | 16 → 20 |
| Flexible component | 12 → 12 | 39 → 39 | 34 → 34 |

- **Outdoor structural part:** PLA Metal, PC FR, ABS-AF, PLA-PHA, OBC and the four TPU classes fail. SUNLU PA6-CF passes.
- **Lightweight structure:** PA12-CF passes on a 6.0 GPa flexural modulus. PET, PC FR, OBC and the four TPU classes fail.
- **Warm environment:** PA6-CE, PAHT and PPE-PS pass (CV01). PLA and the PLA blends lose their pass (CV05): purefil
  PLA+ (90 °C), FormFutura Volcano PLA (110 °C), Fabru GreenTEC Pro (115 °C), Spectrum GreenyHT (87 °C) and Greeny Pro
  (84 °C), every one on an undescribed bar. PLA-PHA fails at 51 °C.
- **High-stiffness fixture:** PET-CF (CV02) and PA6-CF (CV08) pass. PC FR, OBC and the four TPU classes fail.

**No other pass was lost.** Every product whose pass went away has a PLA or PET heat value marked as only a ceiling, 27
products across the comparison. The full list, case by case, is in [stage-3b-diff.md](stage-3b-diff.md).

## What did not move?

- **No estimate.** The frozen estimate model reads products' values and their implied lower bounds, never the ledger.
  The database diff against main shows only the bounds, the demoted and doubtful marks, the two new tables and three
  method captions. A demoted value keeps its level, so the estimate's inputs and every material's spread are unchanged.
- **The indoor prototype and the flexible component:** nothing.
- **A product's own value measured the way asked** decides as before. A test runs the compiled database with and without
  the ledger and finds every such answer the same.

## What was accepted, and what is left open?

- **Two pairs break CV01**, both already accepted as heat-deflection order findings: Prusament rPLA's 1 °C inversion
  within the test's repeatability, and Stratasys Nylon-CF10's XY and XZ/ZX columns read across.
- **Two products' records disagree** (Prusament rPLA, Fiberlogy PLA MINERAL); both stay unresolved, accepted with their
  reasons.
- **Five doubtful values** are listed in [OPEN-PROBLEMS §38.6](../../OPEN-PROBLEMS.md): Raise3D Industrial PET CF's
  87 °C beside its other sheet's 112 °C at 1.8 MPa, and four densities outside their polymer's sourced range.
- **Groups** (one check away, on the line, sheets disagree as a group) are stage 3c's.

## Which test fixtures changed?

None. The acceptance portfolio and the Ashby workspace pass unchanged at every step. One expectation shaped the code:
acceptance S04.2 (Spectrum PLA Matt passes 100 °C after annealing at 90 °C for 4 h) failed when CV05 first demoted
annealed values too, and the demotion was limited to the part as printed.

## How was it checked?

- **Tests:** `npm test` runs 747 tests, all passing. New: `test/evidence-ledger.test.js` (13 tests: floors, ceilings, demotion, disagreement, bands and the
  evidence level, class limits, the row and drift checks, the pairs check, and three invariants over the compiled
  database: a reported row never decides, the ledger never overrides a comparable value, and allowing annealing never
  removes a pass while adding a requirement never adds a candidate), and a trace test that follows a ledger answer to its
  row and record.
- **The comparison:** the mechanism commit moved no answer against main. Each row's own diff is in its commit message.
- **Interface:** `ui:check` rewrote 21 views (the preset counts, rows and product counts above), with no layout failure.
  The probe's chosen-product view now masks its date in the day-month form too, which had made it change with the day.
  `ui:fuzz` on 300 scenarios, seed 17: no disagreement between the page and the engine (one run hit a page-render
  timeout in the harness, and a second run had none). `pages:check`: 16 of 16.
- **Speed:** the ledger adds about 14 ms to the compile stage (248 ms against 234 ms without its rows). `verify:fast`
  took 103.2 s after a data change and 95.8 s with the build cached, over the 90 s budget, on a machine other agents
  were loading (a load average of 12 to 19 on 10 cores): its slowest tests rebuild altered tables through the estimate
  stage, one of them 55 s on its own. Stages 2c and 3a measured 61.5 and 42.6 s on a quieter machine; the executor should
  time it again before the merge.

## Evidence and where to check

- The rows: `data/tables/conversions.csv`, `data/tables/class_limits.csv`; their bands and counts in
  `build/snapshot/ledger.csv` and the validation report's "Evidence ledger" section.
- The build: `build/src/evidence-ledger.js` (`attachLedger`, `measurePairs`), called at the end of `attachProducts` in
  `build/src/products.js`. The engine: `app/js/engine/ledger.js`, `app/js/engine/constraints.js` (`evaluateNumeric`,
  `ledgerResult`). The drawer: `app/js/ui/detail.js` (`ledgerLines`). The trace: `scripts/trace.mjs` (`ledgerRecord`).
- Records named above: LUVOCOM PAHT G147-01 (V011437), Bambu Lab PLA Basic G002-01 (V000048), FormFutura Volcano PLA
  G001-101 (V007602), BASF Ultrafuse PET CF15 G067-06 (V007692), SIDDAMENT PA12-CF G053-10 (V006961), SUNLU PA6-CF G050-06
  (V008616), colorFabb XT-CF20 G090-03 (V010336, V010339), BASF PAHT CF15 G048-02 (V007626, V011737), Fiberlogy PLA
  MINERAL G158-01, NonOilen G146-01, the Cambridge Materials Data Book R-CUED-MATERIALS-DATA-BOOK-2003 (PDF p. 13).
- The comparison: `node decision-census.mjs --root . --db dist/db.json --out after.json`, then `--diff` against a census of
  main, written to [stage-3b-diff.md](stage-3b-diff.md).
