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

## 3. A value with no stated direction is converted as products show it

Many sheets give a stiffness or a strength without saying which way the bar was printed. The estimate model converts
such a value to the flat (XY) value by an offset it learns. It learned that offset only from products that publish
both, and those mostly print the same number twice, so it said the two are equal. Comparing products shows otherwise:
in 53 materials, the products that publish a flat modulus sit about 21 % below those that publish only an undirected
one, which read like moulded bars. The offset now uses both (decision D159). A product that publishes only an undirected
value is now estimated at its material's measured level: its stiffness estimate was 10 % above its measured siblings'
median and is now 1 % below.

The estimates shown for about 600 products per property moved; nine in ten fell, by a median of 7 % for stiffness, 2 %
for strength and 4 % for elongation. No material's verdict changed. 424 product answers moved
([stage-4-diff-3.md](stage-4-diff-3.md)), most from "an estimate suggests it meets" to "not enough data" (351 such moves against 29 the other way): PA66's
products no longer look like 5 GPa parts on their estimates alone. PA612, which has no product, is now listed for a
100 MPa strength, since its own estimate reaches 102 MPa.

## 4. A printed part's stretch is no longer floored by an undescribed bar

When a sheet does not say how its test bar was made, the tool treated it as a printed bar, so its numbers set the least
the estimate of that product could be. For stiffness, strength and heat this holds up. For stretch it did not: a bar the
sheet does not describe stretches like a moulded bar, far more than a printed part. 428 products' stretch estimates were
held at such a floor. Hidden values fell inside the estimate's wide range only 82 % of the time, where 95 % is claimed.
Now only a printed bar floors a stretch estimate (decision D161), and the ranges hold 92 %.

No verdict changed. 61 product answers moved from "not enough data" to "unlikely to meet" for parts that must stretch at
least 20 % ([stage-4-diff-4.md](stage-4-diff-4.md)): their estimates are no longer held up by a bar nobody described.
