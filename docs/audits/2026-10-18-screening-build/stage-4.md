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
polymer table (decision D153). The answers moved are in [stage-4-diff-1.md](stage-4-diff-1.md), and the products in the
[spot-check list](SPOT-CHECK.md).
