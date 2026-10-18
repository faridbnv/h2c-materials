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
| 1 | The switch reads "Use estimates and resin data"; a property that does not apply hides the material whatever the switch says; a preset keeps your Include choice; plainer words | C02–C04, C07–C10, C20, C39 | Built (awaiting merge): [stage-1.md](stage-1.md) |
| 2a | Data corrections that decide answers (PLA-HP's moulded 135 °C, PBAT's 90 °C, one HDT typed at two loads), new physics checks, the printer guide mapped to more materials | C11, C12, C15, C17 | Planned |
| 2b | Resin and film values re-read; fibre content as a number; Shore hardness selectable | C13, C14, C37, C38 | Planned |
| 3a | A printer window the H2C covers in part passes, flagged; a silent chamber decided by the kind of plastic; a near miss is "on the line" | C21, C33, C34 | Built (awaiting merge): [stage-3a.md](stage-3a.md) |
| 3b | A value measured another way decides in its safe direction (the evidence ledger); a plastic's physics may settle a requirement | C22–C24, C31, C32, C35, C40 | Planned |
| 3c | The list sorted by what would settle each material: one check away, not enough data, unlikely to meet; the deciding product named; Flexible component asks for softness | C05, C06, C18, C19, C25, C30 | Planned |
| 4 | The estimate model reopened: one conversion layer, PLA's class, four corrections, each back-tested | C26–C29, C36, C32 (later rows), C40 (fibre) | Planned |
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
| stage-*.md | Each stage's report: what moved, what did not, and why (added as each stage lands) |
| [stage-1.md](stage-1.md), [stage-1-diff.md](stage-1-diff.md) | Stage 1's report, and the answers it moved, case by case |
| [stage-3a.md](stage-3a.md), [stage-3a-diff.md](stage-3a-diff.md) | Stage 3a's report, and the answers it moved against main, case by case |
