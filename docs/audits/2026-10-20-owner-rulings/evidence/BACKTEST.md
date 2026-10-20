# The owner's rulings' changes to what the estimate stage reads, back-tested

> **Historical record** (2026-10-20): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../OPEN-PROBLEMS.md).

> **In short.** The independent review of T1 (F6) found three changes to the frozen estimate stage's inputs that D172
> made without a back-test row: a printed bar with no stated orientation read flat (Unstated direction `flat if printed`,
> m465), the `echoes` rule in `build/src/estimate/grades.js`, and heat deflection floored by printed bars only (m466,
> measured in the validation report but quoted from an older build). Each is measured here by the stage-4 method
> ([stage-4-backtests.md](../../2026-10-18-screening-build/stage-4-backtests.md)): the build hides values it knows,
> predicts them from everything else, and counts how often the ranges it would show hold them; the likely range (80 %)
> must hold about 80 % and the plausible range (95 %) at least 90 % (EST-CALIBRATION, D167's bar). All three are kept, and
> the review's fourth point, tensile strength floored by every bar where elongation and heat deflection are floored by
> printed bars only, is made consistent (m485) after its own row below.

How it was run: [backtest.mjs](backtest.mjs), one variant per build of the tables as they stood after the second reading
(m483) and m484, each the tables with one change undone or made, its numbers in [backtest/](../PACKETS.md). **Held** is how
many hidden values were predicted, **likely** and **plausible** how often the 80 % and 95 % ranges held them, **width**
the median width of the likely range (a ratio for stiffness, strength and stretch, degrees for heat deflection),
**scales** the factors calibration widened the ranges by. **Grade** is the product-level calibration (D81), each product
predicted with its own published values hidden. The material and product counts say how many show a value of their own.

## 1. A printed bar with no stated orientation is read flat (m465, D172)

**The change.** Seven headlines with a direction read a printed bar whose sheet states no orientation as a flat one
(XY), as makers print their test bars unless they say otherwise; before, it was as published and needed the switch the
ruling retired. **Before** is the tables with Unstated direction back to `as-published`.

| Headline | Held | Likely | Plausible | Width | Scales | Grade held / likely / plausible | Materials with a value | Products with a value |
|---|---:|---:|---:|---:|---|---|---:|---:|
| tensileModulusXY | 74 → 73 | 81.1 → 80.8 % | 95.9 → 95.9 % | ×1.51 → ×1.50 | 1.26/1.31 → same | 296, 79.7 / 95.3 → same | 100 → 104 | 360 → 389 |
| tensileStrengthXY | 59 → 57 | 81.4 → 80.7 % | 96.6 → 96.5 % | ×1.42 → ×1.46 | 1.21/1.37 → 1.30/1.37 | 303, 79.2 / 94.1 → same | 106 → 115 | 458 → 518 |
| elongationXY | 79 → 75 | 81.0 → 80.0 % | 96.2 → 96.0 % | ×4.51 → ×5.18 | 1.09/1.17 → 1.07/1.17 | 334, 79.3 / 94.9 → same | 103 → 106 | 410 → 458 |

Density and heat deflection have no direction and do not move. Fewer materials are hidden because more of them now
have a value of their own (a material shown its products' spread is not a hidden estimate); the ranges widen a little for
strength and stretch, from the cases left. EST-CALIBRATION holds either way; no EST-ORDER, EST-THIN or CONVERSION-DRIFT
finding in either.

**Verdict.** Kept: the ranges hold as before, and 9 materials' strength, 4 materials' stiffness and 3 materials'
elongation are measured where they were estimated.

## 2. A product estimate that would only echo its own set-apart value is not made (`echoes`, grades.js)

**The change.** A product with no comparable value of its own that still holds an observation of the headline's own
kind (a bar set apart, D172; a figure a better document replaces, D171; a ceiling, D166) is not estimated: the estimate,
anchored by its own observation (D167), would be that value again with almost no width (Bambu Lab PETG HF's 69 to
69 °C was the same trap). **Before** is a copy of the build with the rule returning false.

| Headline | Product estimates | Of which under 2 °C or 2 % wide | Grade held / likely / plausible |
|---|---:|---:|---|
| tensileModulusXY | 706 → 689 | 6 → 0 | 296, 79.7 / 95.3 → same |
| tensileStrengthXY | 581 → 573 | 5 → 0 | 303, 79.2 / 94.1 → same |
| elongationXY | 637 → 621 | 9 → 0 | 334, 79.3 / 94.9 → same |
| hdt045 | 640 → 445 | 155 → 0 | 413, 80.1 / 95.2 → same |

The calibration hides comparable values only, so it cannot see the rule; what it changes is which products show an
estimate. Of the 195 heat deflection estimates it withholds, 155 would be under 2 °C wide: the product's own set-apart
value shown again as an estimate that looks certain. The materials' estimates do not move.

**Verdict.** Kept: it shows a set-apart value as what it is, and withholds no estimate the calibration measures.

## 3. A printed part's heat deflection is floored by printed bars only (m466, D172)

**The change.** hdt045's Lower bound specimens `printed`, as elongation's (D161). **Before** is `printed or not
stated`. The material rule's floors (`containment`), measured as the estimate would use them:

| Floors | Hidden | Ranges moved | Likely | Plausible | Hidden values under the plausible range |
|---|---:|---:|---:|---:|---:|
| printed or not stated (before) | 58 | 2 | 81.0 % | 93.1 % | 1 |
| printed (now) | 58 | 2 | 79.3 % | 93.1 % | 1 |

D172 had quoted 80.4 / 92.9 % from the build before the second reading. **Verdict.** Kept: both hold, and printed
floors are the ruling.

## 4. Tensile strength floored by printed bars only too (m485)

**The change.** tensileStrengthXY's Lower bound specimens `printed`, so a yield or break stress on a bar no document
describes as printed (possibly a moulded bar's) no longer floors a printed part's strength, as elongation's (D161) and
heat deflection's (m466) do not. **Before** is `printed or not stated`.

| Floors | Hidden | Ranges moved | Likely | Plausible | Hidden values under the plausible range |
|---|---:|---:|---:|---:|---:|
| printed or not stated (before) | 57 | 10 | 86.0 % | 93.0 % | 4 |
| printed (now) | 57 | 3 | 78.9 % | 94.7 % | 2 |

The plausible range holds more hidden values and fewer fall under it; the likely range holds 78.9 %, a point under
80 % where the wider floors had held 86 % by lifting ranges past values they did not need to (EST-CALIBRATION holds). No
product's or material's value moves, and the grade calibration is unchanged.

**Verdict.** Made (m485): it passes D167's bar, and the ruling is now one rule wherever a value floors another.
