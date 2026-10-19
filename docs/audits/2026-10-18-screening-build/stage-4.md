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

## 5. Every product gets its own heat estimate

Heat deflection is the temperature a loaded bar bends at. Among products of one plastic it varies little where the
plastic stays glassy in a print (PETG: about 3 °C between products) and a lot where it crystallises (a glass-filled
nylon or PPS: about 34 °C), because how far a part crystallises depends on how it was printed and treated. The estimate
model used one spread for all, so its heat estimates for single products could not be checked against known values and
none was shown. It now uses a spread per kind of matrix (decision D162), and its product ranges hold 80 % and 95 % of
hidden values in each kind: 466 products now show a heat estimate. Separately, a value measured after annealing used to
enter the model as if it were the printed part's. It is now converted from the annealed state, and a product that
publishes only annealed values is estimated as printed (31 to 34 products per mechanical property).

No material's verdict changed. Many product answers moved, nearly all in the heat requirements
([stage-4-diff-5.md](stage-4-diff-5.md)): a product with no heat value now has its own estimate, and where that estimate
falls wholly short of the requirement the product moves from "not enough data" to "unlikely to meet" (850 such moves, 71
the other way). In the Outdoor and Warm presets, PLA-EC, PVC, PLA-GR, CoPE, nGen and PETG-PTFE move the same way.

## 6. One table for every conversion

The estimate model starts from documented conversions (a flexural modulus is about the tensile one, a value across the
layers is lower), which lived in its configuration file, while the evidence ledger of stage 3b kept its own rows for the
same relations. They are now one table (decision D157): each conversion the model uses is a row of the ledger's table,
and the build stops if what the model learns from the data leaves the band the ledger row states. This was a move:
nothing the tool shows changed, and the build proves it.

## 7. A product's own stiffness caps its estimate

Some products publish their stiffness only on a moulded bar or one their sheet does not describe. Such a bar is stiffer
than a printed part, yet the product's estimate could sit above it: Fillamentum CPE CF112 publishes 2.2 GPa and was
estimated as likely up to 2.71 GPa. A back-test showed that where an estimate crossed the product's own value, the
truth sided with the estimate less than half the time. The product's own value now caps its stiffness estimate at 1.16
times (decision D160): CPE CF112's likely range now ends at 2.44 GPa. The same cap on strength made the ranges miss too
often, so strength is not capped.

## 8. More physics limits were tested, and none decides yet

Four more limits a kind of plastic cannot pass were tested by holding out one maker at a time (decision D163). Two
passed: an unfilled rigid plastic is at most 4.3 GPa stiff, and a glassy bar's heat deflection is at most 15 °C over
its glass transition. Neither decides yet: the first needs a source that states it, the second a kind of limit the
ledger cannot express. A check of fibre-filled densities against their stated fibre content found 8 of 106 outside
what the fibre allows (decision D164); they are listed for a reading.

## 9. "Likely" keeps its rule

A statistician suggested tagging a material "likely" when the chance it meets is at least 50 %, instead of when its whole
80 % range meets. That works only if the model's chances are honest. They are for stiffness and stretch, not for density
or heat deflection, so the rule stays as it is (decision D165).
