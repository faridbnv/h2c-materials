# Screening build: the review's changes, stage by stage

> **Historical record** (2026-10-18): the build of the screening review's approved changes, begun on release 9ca94d31fc5d. Each stage's report says what it moved. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** The owner approved the [screening review](../2026-10-18-screening-review/README.md)'s changes, all but one:
> PA66-CF, PA612 and PA612-GF stay materials, because the owner found them on sale. This round builds the rest in
> stages. Each stage is merged into the live tool only once every check passes. Each new evidence rule first lands
> reporting only, and decides in a commit of its own. Every stage reports which answers it moved, compared with the
> answers before it, each side computed with its own code. The table below says where each stage stands.

## The stages

| Stage | What it changes for a reader | Changes | Status |
|---|---|---|---|
| 0 | Nothing: records the owner's answers, the harness that compares answers, and a wider watch on the frozen estimate model | C01 (in part) | Built |
| 1 | The switch reads "Use estimates and resin data"; a property that does not apply hides the material whatever the switch says; a preset keeps your Include choice; plainer words | C02–C04, C07–C10, C20, C39 | Built, merged ([report](stage-1.md)) |
| 2a | Data corrections that decide answers (PLA-HP's annealed 135 °C, six PLA heat values above their glass transition, PBAT's 90 °C, one HDT at two loads, purefil ABS's modulus, two carbon-fibre PETG densities, CarbonFil's 2024 sheet), four new physics checks; the printer guide needed no new mapping ([report](stage-2a.md), [answers moved](stage-2a-diff.md), [spot-check list](SPOT-CHECK.md)) | C11–C15, C17 | Built, merged ([report](stage-2a.md))|
| 2b | Fibre content as a number: 150 of the 252 fibre-filled products carry the load their sheets state ([report](stage-2b.md), [answers moved: none](stage-2b-diff.md), [spot-check list](SPOT-CHECK.md)); Shore A and Shore D hardness selectable (C13's and C14's re-reads were done in 2a) | C37, C38 | Built, merged ([report](stage-2b.md))|
| 2c | Polymer reference sources recorded (density, water uptake, PLA's melting point), for the physics limits and the lab-humidity rule ([report](stage-2c.md), [answers moved: none](stage-2c-diff.md)) | – | Built, merged ([report](stage-2c.md)) |
| 3a | A printer window the H2C covers in part passes, flagged; a silent chamber decided by the kind of plastic; a near miss is "on the line" | C21, C33, C34 | Built, merged ([report](stage-3a.md))|
| 3b | A value measured another way decides in its safe direction (the evidence ledger): an HDT at 1.8 MPa is a floor, an annealed value or a PLA/PET heat value from an undescribed bar a ceiling, a flexural modulus a band, lab humidity dry for low-water plastics; a rubber is never stiff and an unfilled density is its polymer's ([report](stage-3b.md), [answers moved](stage-3b-diff.md)) | C22–C24, C31, C32, C35, C40 (class part) | Built, merged ([report](stage-3b.md))|
| 3c | The list sorted by what would settle each material: one check away, not enough data, unlikely to meet; the deciding product named; Flexible component asks for softness ([report](stage-3c.md), [answers moved](stage-3c-diff.md)) | C05, C06, C18, C19, C25, C30 | Built, merged ([report](stage-3c.md))|
| 3d | Corrections from the round's review and a second first-time user: a crystallised PLA or PET bar floors nothing, only a point is on the line, a ceiling never holds a material open, the rubber limit reaches TPE, TPS and TPV, and the page says "hidden" for one idea and why each hidden or failing row is there ([report](stage-3d.md), [answers moved](stage-3d-diff.md), [review](REVIEW.md), [trial](FIRST-TIME-USER-2.md)) | R01–R16, the trial's findings | Built, merged ([report](stage-3d.md))|
| 4 | The estimate model reopened: Bambu Lab's PLA values as printed, PLA's class, one conversion layer, five corrections, each back-tested; the later class limits and the 50 % "likely" rule tested and not used ([report](stage-4.md), [back-tests](stage-4-backtests.md), [answers moved](stage-4-diff.md)) | C19, C26–C29, C36, C32 (later rows), C40 (fibre) | Built, merged ([report](stage-4.md))|
| 4b | Corrections from the independent review of stage 4: an annealed value never props up an as-printed estimate, an annealed conversion learns only from several makers, and a product's own values of a property hold its estimate on both sides (or withhold it) and keep it from being tagged likely against its own sheet ([report](stage-4b.md), [answers moved](stage-4b-diff.md), [review](REVIEW-STAGE4.md), [back-tests](stage-4-backtests.md#after-the-review-d167)) | S01–S17 | Built (awaiting merge) |
| 5 | A repeat of the first-time user's trial, an independent review, a sweep for stale claims, the round's close | – | Planned |

The plan, with the design choices and the order, is the owner-approved plan of 2026-10-18; its rulings are logged in
[GOALS-LOG](../../GOALS-LOG.md).

## How each stage is checked

Every stage runs the full `npm run verify` on the latest main before it merges. It also reports:
- **the answers it moved:** [decision-census.mjs](decision-census.mjs) runs the six presets in every mode, and 120
  single-requirement cases, with the code and database before the stage and again after it, and lists every material
  verdict, listing, group and product answer that moved;
- **the database paths it changed** (`npm run build:diff`): until stage 4, nothing the estimate model computes may move;
- **the time `npm run verify:fast` took** (the budget is 90 seconds).

```bash
node docs/audits/2026-10-18-screening-build/decision-census.mjs --root <checkout> --db <its dist/db.json> --out before.json
node docs/audits/2026-10-18-screening-build/decision-census.mjs --diff before.json after.json --md diff.md
```

## Files

| File | What it holds |
|---|---|
| [decision-census.mjs](decision-census.mjs) | The harness that records and compares every scenario's answers |
| stage-*.md | Each stage's report: what moved, what did not, and why (added as each stage lands); stage-*-diff.md, the answers it moved |
| [stage-1.md](stage-1.md), [stage-1-diff.md](stage-1-diff.md) | Stage 1's report, and the answers it moved, case by case |
| [SPOT-CHECK.md](SPOT-CHECK.md) | The owner's list of every value an agent changed or flagged, with the page's words and the reason |
| [ingest/](ingest/) | Stage 2a's import batch b46 (CarbonFil's 2024 sheet): its row builders, its proposal and the packet m442 pins; stage 2c's batch b47 (16 polymer reference documents): its builder, the staged manifest, the round's ledger, its proposals and the packet m445 pins |
| [fibre/](fibre/) | Stage 2b's fibre readings, the tool's check of each, its proposals, the reviewer's decisions (review.csv, review.mjs) and the folder m444 applies |
| [stage-3a.md](stage-3a.md), [stage-3a-diff.md](stage-3a-diff.md) | Stage 3a's report, and the answers it moved against main, case by case |
| [stage-4.md](stage-4.md), [stage-4-backtests.md](stage-4-backtests.md), [stage-4-diff.md](stage-4-diff.md) | Stage 4's report, the back-test of each change to the estimate model, and the answers it moved against main (stage-4-diff-1.md to -7.md: step by step) |
| [class-limits-lomo.mjs](class-limits-lomo.mjs) | Stage 4's test of the later class limits, one maker held out at a time, and of fibre-filled densities |
| [stage-3b.md](stage-3b.md), [stage-3b-diff.md](stage-3b-diff.md) | Stage 3b's report, row by row, and the answers it moved against main, case by case |
| [stage-3c.md](stage-3c.md), [stage-3c-diff.md](stage-3c-diff.md) | Stage 3c's report, and the answers it moved against main after stage 3b, case by case |
| [REVIEW.md](REVIEW.md) | The independent review of stages 0 to 3c (findings R01 to R16, with evidence) |
| [FIRST-TIME-USER-2.md](FIRST-TIME-USER-2.md), [first-time-user-2/](first-time-user-2/) | The second first-time user's trial of the selector, and its five screenshots |
| [stage-3d.md](stage-3d.md), [stage-3d-diff.md](stage-3d-diff.md) | Stage 3d's report, finding by finding, and the answers it moved against main ef96fe00, case by case |
| [REVIEW-STAGE4.md](REVIEW-STAGE4.md) | The independent review of stage 4 (findings S01 to S19, with evidence) |
| [stage-4b.md](stage-4b.md), [stage-4b-diff.md](stage-4b-diff.md) | Stage 4b's report, finding by finding, and the answers it moved against main dd16db5a, the likely tag included |
