# Stage 4: the estimate model's changes, back-tested

> **Historical record** (2026-10-18): the back-test of each change the screening build's stage 4 made to the estimate model, written as each was built. It describes the model and its data as they were then. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** Stage 4 reopened the estimate model, which had been frozen since D138, for the changes the owner approved
> from the screening review. Each change below was measured before it was kept: the build hides values it knows,
> predicts them from everything else, and counts how often the ranges it would show hold them. The likely range (80 %)
> must hold about 80 % of hidden values, and the plausible range (95 %) at least 90 % (the check EST-CALIBRATION). Each
> section gives the rule, what was hidden, the numbers before and after, and the verdict. The numbers are the build's
> own, from `meta.estimateModel` and the validation report, on the branch as each change was committed.

How to read the tables. **Held** is how many hidden values were predicted. **Likely** and **plausible** are how often
the 80 % and 95 % ranges held the hidden value. **Width** is the median width of the likely range: a ratio (×1.46 means
the top is 1.46 times the bottom) for stiffness, strength and stretch, degrees for heat deflection. **Scales** are the
factors calibration widened the ranges by (likely / plausible); the clamp stops them at 2 and 3.

## 1. A heat treatment at or below the glass transition is no annealing (D153)

**The change.** Bambu Lab's 361 PLA values "annealed and dried at 55 °C" (50 °C on two sheets) are judged as printed: at
or below PLA's glass transition nothing crystallises. It is a data rule in the core (polymers.csv Annealing threshold
°C), not an estimate change.

**What the estimate saw.** Nothing new. The fit had always read these values as the headline's own kind: PLA is classed
amorphous until the next change, so the rule that drops a prints-amorphous polymer's annealed heat values did not reach
them, and no product of these 15 publishes an as-printed twin the values could be "beside". The state key that keeps
two treatments apart changed from "annealed 55 °C 8 h" to "as printed" for every value of each product at once, so no
group was split or joined.

| Headline | Held | Likely | Plausible | Width | Grade held | Grade likely / plausible |
|---|---:|---:|---:|---:|---:|---|
| density | 120 → 120 | 80.0 → 80.0 % | 95.0 → 95.0 % | ×1.10 → ×1.10 | 831 → 831 | 79.8 / 94.9 → same |
| tensileModulusXY | 83 → 83 | 80.7 → 80.7 % | 95.2 → 95.2 % | ×1.46 → ×1.46 | 326 → 326 | 79.8 / 94.8 → same |
| tensileStrengthXY | 66 → 66 | 80.3 → 80.3 % | 95.5 → 95.5 % | ×1.40 → ×1.40 | 334 → 334 | 79.3 / 94.3 → same |
| elongationXY | 86 → 86 | 80.2 → 80.2 % | 95.3 → 95.3 % | ×3.59 → ×3.59 | 364 → 364 | 79.9 / 95.1 → same |
| hdt045 | 79 → 79 | 81.0 → 81.0 % | 94.9 → 94.9 % | 21.4 → 21.4 °C | 439 → 439 | 79.0 / 92.3 → same (not shipped) |

No material or grade estimate moved, no floor row moved and `build/snapshot/screening.csv` is unchanged. One
diagnostic moved: the separate exclusion test of D137, which takes its truths from each product's as-printed dry values,
gained the 15 products as truths (stiffness 25/41 → 29/42 calibration/evaluation groups, strength 33/55 → 37/56,
elongation 19/25 → 23/26). Its single-test diagnostic for elongation, too thin to test before, now passes (upper wrong-
exclusion rate 0.085); it stays a diagnostic, deploys nothing, and no answer reads it.

**Verdict.** Kept. EST-CALIBRATION holds unchanged.
