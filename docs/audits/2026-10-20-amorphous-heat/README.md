# An undescribed heat deflection of an amorphous plastic (2026-10-20)

> **Historical record** (2026-10-20): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** After the owner's rulings (D172) set apart every heat deflection whose test bar no document describes,
> the executor suggested that an amorphous plastic's might count, since its glass transition governs it however the bar
> was made. The owner asked a materials scientist to advise and then build it. Advised yes for heat deflection of a
> plastic that cannot crystallise, unfoamed, unless its table points to moulding; no for every other headline. Built as
> data (D177, m487) by Claude Opus 5.5, the round's only track.

| What | Where |
|---|---|
| The advice: physics, literature, our data, the rule | [ADVICE.md](ADVICE.md), re-derived by [empirical.mjs](empirical.mjs) |
| The back-test of the frozen tables' change | [BACKTEST.md](BACKTEST.md), by [backtest.mjs](backtest.mjs) |
| Every answer that moved, over the 138 census cases | [DECISION-DIFF.md](DECISION-DIFF.md), from [census-before.json](PACKETS.md) (main, release 5a7ec4ca599d) and [census-after.json](PACKETS.md) |
| The decision | D177 in [DECISIONS](../../DECISIONS.md), amending D172 |
| The migration | m487 (polymers.csv Can crystallise, headline_definitions.csv Undescribed bar counts for, the counter-indications' Specimen type, three loads and two physics flags, two outliers accepted) |

**What moved.** 131 heat deflections of 88 products count; products with a comparable heat deflection at 0.45 MPa
312 → 356 and at 1.8 MPa 137 → 182; materials with a value of their own 82 → 89 and 51 → 57. The templates under Leave
out (pass, unknown, fail): Warm environment 31, 98, 23 → 34, 95, 23 (PETG, CPE and COC pass); Outdoor structural part 10,
92, 50 → 10, 91, 51 (ABS-AF fails on its maker's annealed 88 °C, the most a print of it reaches); the four others do not
move. Across the 138 cases 42 material verdicts moved, all in the Warm, Outdoor and heat deflection cases. No pass rests
on an undescribed bar of a plastic that can crystallise. Left: OPEN-PROBLEMS §15.
