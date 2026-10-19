# Stage 4: the estimate model reopened

> **Historical record** (2026-10-18): stage 4 of the screening build, written as it was built. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** Being written. Each change's back-test is in [stage-4-backtests.md](stage-4-backtests.md), and the
> answers each moved in its own diff file.

## 1. Bambu Lab's PLA values are as printed

Fifteen Bambu Lab PLA sheets print "all the specimens were annealed and dried at 55 °C for 8 h before testing" above
every value. PLA softens at its glass transition, 55 to 60 °C, and only crystallises when heated above it (NatureWorks,
which makes PLA resin, anneals at 80 to 130 °C). So these 361 values describe the part as printed. The tool used to read
them as annealed, which meant none of those 15 products could answer an as-printed question: each waited on an annealing
step that changes nothing. They now answer as printed. The rows themselves are unchanged; the rule is a number in the
polymer table (decision D158). The answers moved are in [stage-4-diff-1.md](stage-4-diff-1.md), and the products in the
[spot-check list](SPOT-CHECK.md).

## 2. PLA is classed as it prints

PLA can crystallise (its resin melts at 165 to 180 °C) but does not in a print, so a printed PLA part is glassy, like
PET's. The polymer table called PLA amorphous, so the estimates never held a PLA heat value under its melting point and
read annealed PLA heat values, up to 135 °C, as if they were the printed part's. PLA is now classed as PET is (decision
D158). Five PLA grades that are made to crystallise in the print, such as FormFutura's Volcano PLA 150C, are marked as a
variant: their values stand apart from plain PLA's, but they still read PLA's printer guide, so no print answer moved.

No material's verdict changed. 37 product answers moved between "an estimate suggests it meets" and "not enough data",
because estimates moved ([stage-4-diff-2.md](stage-4-diff-2.md)). The heat-deflection estimates got narrower (the
median range shown fell from 21.4 to 19.4 °C) and still hold 81 % and 95 % of hidden values. One side effect is reported
in the back-test: the density estimates of filled PLAs hold their hidden value a little less often than before.
