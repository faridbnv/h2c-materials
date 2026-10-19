# Stage 4b: what the review of the estimate model corrected

> **Historical record** (2026-10-18): stage 4b of the screening build, written as it was built. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** An independent review of stage 4 ([REVIEW-STAGE4.md](REVIEW-STAGE4.md)) found three answers the evidence
> does not support, and records that claimed more than was tested. One principle corrects all three: what a product's
> own sheet says bounds what its estimate, and its "likely" tag, may claim, in both directions, and a value measured
> after annealing never stands in for the printed part. No material's verdict moved. Against main, 693 product answers
> moved, most from "unlikely to meet" back to "not enough data" where stage 4's stiffness cap had been too sure, and the
> "likely" tag left 203 products and came to 73. The estimates still hold hidden values as often as they claim (decision
> D167; [answers moved](stage-4b-diff.md); [back-tests](stage-4-backtests.md#after-the-review-d167)).

## The principle

A product's own published values set the limits of what its estimate may say. Where a sheet gives a property only
another way (on a moulded bar, without the direction, at another load, after annealing), the tool converts that value to
the printed part's and draws a band around it. The estimate must sit inside that band. If the tool's model of the
product's kind disagrees with the band, the tool shows no estimate for that product and says why. If two of the
product's own sheets disagree beyond what their conversions allow, nothing anchors the product, and it is not tagged
"likely". An annealed value is another state of the part: it is converted, and it never sets a minimum for the printed
part.

## 1. Products known only after annealing were estimated from their annealed values (findings S01, S05)

**What was wrong.** Stage 4 began estimating, as printed, products that publish only annealed values. Their annealed
values still reached that estimate. Bambu Lab's PET-CF publishes its heat deflection only after 12 hours at 80 °C (182 °C
at the heavier load). That value set the least its printed part could be, so the printed estimate read 182 to 182 °C. A
printed PET-CF deflects near 85 °C: Raise3D's Industrial PET CF prints 87 °C as printed and 175 °C annealed.

The annealed value got in two ways. It set a minimum for the as-printed estimate. And an annealed value of a related
kind (the heat deflection at the heavier load) entered the model as if it were printed. A third gap: the estimate
decided what counts as an anneal by each material's own glass transition, while the rest of the tool reads one number
per polymer. So a glassy plastic's annealed heat value entered as the printed one, and eight products showed estimates
of zero width, such as Bambu Lab's PETG HF at 69 (68.9 to 69.1) °C.

**The fix.**
- An annealed value never sets a minimum for a property that changes with annealing.
- Every annealed value the estimate reads, of the property itself or a related one, is converted from the annealed
  state: first to the printed state of its own kind, then by the annealed shift the data teach.
- What counts as an anneal is the polymer table's one threshold, which only PLA has. Everything still annealed after
  it is an anneal.
- A glassy plastic's heat deflection rises a few degrees on annealing, not tens. It now has its own conversion, 5 °C with
  a spread of 8 °C, from this database's own pairs (0 to +20 °C).
- A melting point, a glass transition and a Vicat softening point are read as published. Annealing barely moves them:
  the eight pairs in this database that give both print the same number twice.

**The proof.**

| Product | Before (likely range) | After (likely range) |
|---|---|---|
| Bambu Lab PET-CF | 182 (182 to 182) °C | 87.6 (80 to 94.9) °C |
| Polymaker Fiberon PET-CF17 | 105 (105 to 107) °C | 83.2 (76.9 to 89.4) °C |
| Raise3D Hyper Speed PET CF | 110 (110 to 113) °C | 84.6 (76.7 to 92.2) °C |
| Bambu Lab PETG HF | 69 (68.9 to 69.1) °C | 67.4 (62.9 to 71.8) °C |
| Bambu Lab ABS-GF | 99 (98.9 to 99.1) °C | 94.4 (89.4 to 99.4) °C |

No heat estimate has zero width now (nine before). In the outdoor bracket (heat deflection at least 100 °C), 12 of the 22
products tagged "likely" on a heat estimate rested on their own annealed values; now none of 14 does. In the warm
environment, 21 of 82 did; now none of 76 does. Four and fifteen of those tags rest partly on a melting point or a Vicat
measured on an annealed bar, read as published on purpose (OPEN-PROBLEMS §38.10).

## 2. The annealed heat shift rested on one maker's three products (S11)

**What was wrong.** The shift that converts an annealed heat deflection to the printed one was learned as −77 °C. It
came from three pairs, all from one maker (Siraya Tech's PPA-CF, PPA-CF Core and PPA-GF, +101 to +108 °C), and it was
applied to every crystalline plastic. A nylon or PPS printed hot is already crystalline and gains far less on annealing.

**The fix.** An annealed conversion now learns from the data only once at least 5 pairs from at least 2 makers publish
both states. Until then it keeps its documented value, and the validation report says so. The heat shift is back at the
documented −52 °C. Stiffness, strength and stretch have enough pairs and still learn.

## 3. A product's own moulded stiffness capped its estimate, even where its other sheet disagreed (S02)

**What was wrong.** Stage 4 capped a product's stiffness estimate at 1.16 times the lowest stiffness its own sheets give
on a moulded or undescribed bar. Extrudr's DURAPRO PA6 CF gives 1.1 GPa on a moulded bar and 6 GPa on another, so its
estimate fell from about 5.3 to 1.23 GPa, and it read "unlikely to meet" a 5 GPa requirement against its own 6 GPa.
The cap only bounded from above, which is unsafe for an "at most" limit: Extrudr's FLEX HARD (0.04 GPa moulded, 0.4 GPa
on another bar) was capped at 0.046 GPa and tagged "likely" for a flexible part (at most 0.1 GPa).

**The fix.** The one-sided cap is replaced by a two-sided anchor drawn from all of a product's own values of the property.
Each value, converted, gives a band as wide as its conversion's spread allows. Bands that do not overlap, or a proven
minimum above one of them, mean the product's sheets disagree: nothing anchors it, and it is not tagged "likely".
Otherwise its estimate is held inside the bands. The bands alone held hidden values only 85 to 89 % of the time where
95 % is claimed, so the anchor widens each side until it holds them as often as it claims. Where the model's estimate
lies outside the anchor, the product shows no estimate and its reason says why. The build uses the anchor only where its
back-test holds: for stiffness, strength, stretch and heat deflection, not for density (18 cases).

**The proof.** DURAPRO PA6 CF reads 5.03 (3.45 to 7.35) GPa and is "not enough data" at 5 GPa, no longer "unlikely".
FLEX HARD and FLEX MEDIUM (0.04 GPa moulded, 0.12 GPa on another bar) are no longer "likely" for a flexible part: their
sheets disagree. Fillamentum's Nylon CF15 Carbon (0.5 GPa on an undescribed bar, where its kind predicts about 2.8 GPa)
shows no estimate.

| Property | Hidden products with own values | Held by the anchor | Range shown held, before → after anchoring | Wide range held, before → after |
|---|---:|---:|---|---|
| Stiffness | 153 | 96.7 % | 84.5 → 83.8 % | 97.3 → 96.6 % |
| Strength | 192 | 97.4 % | 81.9 → 81.3 % | 95.1 → 94.5 % |
| Stretch | 174 | 96.0 % | 76.7 → 76.2 % | 94.8 → 92.4 % |
| Heat deflection | 187 | 97.3 % | 82.1 → 82.1 % | 96.1 → 96.1 % |

Where the model and a product's own values disagreed, the hidden truth sided with the product's values 9 times and the
model 14 times in 22 cases. Neither is reliably right there, which is why such a product shows no estimate rather than
either one.

## 4. A product's own heat value was set aside while its estimate was tagged "likely" (S03)

**What was wrong.** Yousu's Modified ABS prints a heat deflection of 65 °C without saying the load. The model flagged
that value as at odds with other ABS products and down-weighted it, then estimated the product at 92.6 to 108 °C and
tagged it "likely" for a warm environment (at least 80 °C). At either load, its own sheet says it misses 80 °C.

**The fix.** The anchor of section 3 applies to every product's own value, whatever the model thinks of it: the flag
speaks of the product's material, not of its own sheet. And no product is tagged "likely" where its own value, converted
through its band, wholly misses the limit, or where its own sheets disagree across the limit.

**The proof.** Yousu Modified ABS shows no estimate: its own value allows 52 to 89 °C, its kind's model says 100 °C. It is
no longer "likely" for 80 °C. Twelve heat estimates (the review counted 13) had a 95 % range that excluded the product's own value. Eight now
show no estimate (Yousu, AzureFilm LumberLay, colorFabb PLA-HP, Nanovia PC CF and PC V0, two Spectrum PLAs and FormFutura's
EasyFil ePLA), and four sit inside their own anchor (Spectrum's HT-PLA and FlameGuard PLA, Raise3D's Hyper Speed ABS, eSUN's
Twinkling).

## 5. The census now records the "likely" tag (S10)

The tool that compares every scenario's answers before and after a change recorded each verdict and group, but not the
"likely" tag. So no earlier diff could show the tag appear or go. It now records it, and the diff counts its moves.

## 6. Records that said more than was tested (S04, S06 to S09, S12 to S18)

- **The 55 °C treatment ages PLA a little.** It crystallises nothing, but held near the glass transition, PLA stiffens
  slightly and stretches less. Two of the passes it moved sit within 1 % of their limit: PLA Metal at 2.01 against 2 GPa,
  PLA Wood at 60 against 60 °C. They read as a thin margin. The values were treated at 55 °C (301) and at 50 °C (60), not
  all at 55 °C. The threshold stays at 55 °C, as the executor asked.
- **Filled PLA's density stratum.** Its miss (12 of 15 where 85 % was asked) comes from a jump in density's fitted
  spreads, not from PET's fills, as the stage's own control showed. Against the 95 % claim that is a chance of about 0.04.
  It is now in OPEN-PROBLEMS.
- **Margins.** Each pass of stage 4 now gives how many more misses it could take. Two are thin: a grade's stretch floors
  (two misses) and the crystalline unfilled heat values after this stage (one miss).
- **The 50 % "likely" test** never had a case between 40 and 60 %, and strength was never tested. After this stage
  stiffness fails two bins too. The rule stays as it is.
- **The heat limit over the glass transition** passed partly by construction: its test leaves out 13 values that the
  same rule had already flagged as impossible.
- **PET's fills** are glassy as printed by their makers' recipe (Raise3D 87, Polymaker 81.6, BASF 74 °C). Flashforge's
  PET-GF at 200 °C, with no treatment stated, is a crystallised bar. Both hold, and the narrow PET-fill heat ranges are
  listed as an open problem.
- The decision numbers are settled, D58 names D160 and D167, D161 quotes the merged figures, and ARCHITECTURE describes
  the one annealing rule.

## What moved

Against main (dd16db5a, every stage merged), over the 138 cases of the census: no material verdict. 17 listings, all of
PA612, which has no product and whose own estimates sit on the edge of 5 GPa and 100 MPa. 85 group changes and 693
product answers: 378 from "unlikely to meet" to "not enough data", nearly all stiffness answers stage 4's cap had made
(92 of 97), and 41 the other way. The "likely" tag came or went 301 times.

| Preset, with estimates | One check away | Not enough data, likely | Not enough data | Unlikely to meet |
|---|---|---|---|---|
| Outdoor structural part | 7 → 7 | 5 → 3 | 18 → 23 | 52 → 49 |
| Lightweight structure | 17 → 17 | 3 → 2 | 25 → 29 | 28 → 25 |
| Warm environment | 26 → 26 | 3 → 3 | 18 → 18 | 21 → 21 |
| High-stiffness fixture | 7 → 7 | 0 → 0 | 20 → 22 | 65 → 62 |
| Flexible component | 2 → 2 | 3 → 1 | 10 → 12 | 86 → 86 |

The indoor prototype did not move. 32 product estimates are withheld (22 heat, 6 strength, 3 stiffness, 1 stretch). The
ranges hold hidden values as often as they claim on every property, for materials and for products.

## What stays open

OPEN-PROBLEMS §38.10 lists what this stage leaves: filled PLA's density stratum; the documented annealed heat shift and
one shift for every crystalline plastic; annealed transitions read as published; PET's mixed fills, where three products
read "unlikely to meet" 100 °C on a glassy class four other PET-fill products do not fit; some stiffness and stretch
estimates still of zero width; and a withheld estimate said only in a requirement's reason. The review's suggestion to
base PLA's threshold on 80 °C was not taken (the executor kept 55 °C), nor its unit test of the cross-product contrast.

## Evidence and where to check

- The change: `build/src/lower-bounds.js` (no annealed minimum), `build/src/estimate/observations.js` (annealed kinds),
  `conversions.js` (composition, several makers), `anchor.js` and `grades.js` (the anchor, its back-test, withholding),
  `app/js/engine/constraints.js` (`ownForbidsLikely`), migration m451 (conversions.csv: CV03, CV04, CV33 and CV39 learn
  `pairs, several makers`; a new row for `HDT 0.45 annealed glassy`), `test/own-anchor.test.js`.
- Products: G067-01, G067-02, G067-07 (PET-CF), G022-01, G028-01, G036-01 (zero width before), G050-05 (DURAPRO),
  G039-16 and G039-17 (FLEX HARD, MEDIUM), G053-14 (Nylon CF15), G027-26 (Yousu).
- The anchor's back-test and the conversions that keep their documented value are printed in
  `build/reports/validation-report.md`, and recorded as `meta.estimateModel.properties.*.gradeCalibration.anchor`.
- The census: `node docs/audits/2026-10-18-screening-build/decision-census.mjs --root . --db dist/db.json --out after.json`,
  then `--diff before.json after.json`.
