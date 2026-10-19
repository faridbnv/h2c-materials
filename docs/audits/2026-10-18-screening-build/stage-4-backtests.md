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

## 1. A heat treatment at or below the glass transition is no annealing (D158)

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

## 2. PLA classed as it prints (D158, the review's C36)

**The change.** PLA's row says semicrystalline, prints amorphous, melting point 165 °C. Consequences in the model:
PLA's annealed heat values leave its as-printed fit (19 values of 13 grades, 1222 → 1215 heat observations); a PLA
heat estimate is held under its melting point; the filler column reads the matrix as printed, so PLA's fills keep the
amorphous column and PET-CF, PET-GF and the foaming PET join it; five crystallising grades take their own variant column.

**Hidden cases.** The calibration's (each material's typical product hidden in turn, predicted with refitted spreads and
conversions), now also reported by stratum (`calibration.byStratum`, printed in the validation report). The "before"
column is a build of the starting point with the stratum diagnostic added and nothing else.

| Headline | Held | Likely | Plausible | Width | Scales | Grade likely / plausible |
|---|---:|---:|---:|---:|---|---|
| density | 120 → 120 | 80.0 → 80.0 % | 95.0 → 95.0 % | ×1.10 → ×1.10 | 1.15/1.94 → 1.14/1.48 | 79.8/94.9 → 79.9/95.1 |
| tensileModulusXY | 83 → 82 | 80.7 → 80.5 % | 95.2 → 95.1 % | ×1.46 → ×1.46 | 1.10/1.14 → same | 79.8/94.8 → 79.4/94.8 |
| tensileStrengthXY | 66 → 65 | 80.3 → 80.0 % | 95.5 → 95.4 % | ×1.40 → ×1.40 | 1.11/1.11 → same | 79.3/94.3 → 79.0/94.3 |
| elongationXY | 86 → 85 | 80.2 → 80.0 % | 95.3 → 95.3 % | ×3.59 → ×3.59 | 1.06/1.16 → 1.05/1.17 | 79.9/95.1 → 79.7/94.8 |
| hdt045 | 79 → 78 | 81.0 → 80.8 % | 94.9 → 94.9 % | 21.4 → 19.4 °C | 1.94/3 → 1.78/3 | 79.0/92.3 → 79.1/92.6 (not shipped) |

One case leaves each headline but density: PLA-GF's typical product was Polymaker HT-PLA-GF, now a variant, and no
other PLA-GF product publishes the value.

| Headline | Stratum | Held | Likely | Plausible | Signed error |
|---|---|---:|---|---|---|
| hdt045 | PLA filled | 13 → 12 | 92.3 → 100 % | 100 → 100 % | −0.14 → −0.27 °C |
| hdt045 | semicrystalline filled | 14 → 14 | 64.3 → 64.3 % | 92.9 → 92.9 % | −2.29 → −1.74 °C |
| hdt045 | other | 51 → 51 | 82.4 → 80.4 % | 94.1 → 94.1 % | +2.42 → +2.42 °C |
| tensileModulusXY | PLA filled | 12 → 11 | 91.7 → 90.9 % | 91.7 → 90.9 % | −0.087 → −0.092 |
| tensileModulusXY | semicrystalline filled | 13 → 13 | 53.8 → 53.8 % | 100 → 100 % | +0.183 → +0.183 |
| tensileStrengthXY | PLA filled | 11 → 10 | 72.7 → 70.0 % | 90.9 → 90.0 % | −0.124 → −0.135 |
| tensileStrengthXY | semicrystalline filled | 11 → 11 | 100 → 100 % | 100 → 100 % | +0.029 → +0.031 |
| elongationXY | PLA filled | 11 → 10 | 90.9 → 90.0 % | 100 → 100 % | +0.182 → +0.177 |
| elongationXY | semicrystalline filled | 14 → 14 | 85.7 → 85.7 % | 92.9 → 92.9 % | −0.127 → −0.124 |
| density | PLA filled | 15 → 15 | 66.7 → 60.0 % | 86.7 → 80.0 % | −0.0064 → −0.0064 |
| density | semicrystalline filled | 15 → 15 | 93.3 → 86.7 % | 100 → 100 % | −0.0012 → −0.0007 |
| density | other | 89 → 89 | 79.8 → 82.0 % | 95.5 → 96.6 % | −0.0054 → −0.0037 |

(PLA unfilled holds one case per headline: PLA itself, whose typical product is hidden. Errors are on the model's scale:
ln for density, stiffness, strength and stretch, °C for heat deflection.)

**Floors** (D126's table, `floors`): every row moves by at most the one lost case; the rule in force, containment for a
material and formulation for a grade, keeps its coverage (strength 86.4/93.9 → 86.2/93.8 %, elongation 79.1/88.4 →
78.8/88.2 %, heat deflection 78.5/93.7 → 79.5/93.6 %). **Screening ends** (`build/snapshot/screening.csv`): each class
loses the one case, and three ends move a little (heat deflection's top end for a material's own evidence 0.986 → 0.989
quantile); every end still screens, and only the three materials with no product read them.

**Against the pass rule.** EST-CALIBRATION holds on every headline, material and grade. EST-ORDER is 0. The
semicrystalline-filled heat error shrinks (2.29 → 1.74 °C). One stratum misses the rule by one case: density, PLA filled,
plausible 13 → 12 of 15 (80 %, under the rule's 85 %). It is not PLA's class that moves it but the filler column: PET's
three filled materials moving to the glassy column put density's spreads on another grid point (filler-by-matrix 0.20 →
0.02, a material's own deviation 0.048 → 0.096), which tightens density's plausible scale from 1.94 to 1.48 while overall
coverage stays at 95 %. Keying the column on the polymer instead (which moves PLA's fills and leaves PET's) showed the
same miss, and a build that moved neither showed none; the five new variants change nothing here. A density estimate
decides no verdict: it moves only the "an estimate suggests it meets" tag of three PLA products in the census (density
at least 1250 kg/m³). So the change is kept and the stratum reported.

**Verdict.** Kept, with the density stratum noted above.
