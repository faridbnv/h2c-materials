# Estimate order: the floors, back-tested (D126 draft, 2026-10-04)

The change: an estimate is floored by what the product's or material's own measurements prove (an ultimate strength is at
least its yield and break stress, a strain at break at least the strain at yield, HDT at 0.45 MPa at least HDT at 1.8 MPa),
and a bar whose source states no specimen now bounds as a printed bar does, in any direction. A moulded bar, a film, a
filament strand and a bar printed off the product's recipe still bound nothing. Grade estimates take the floors of their own
formulation, which they did not take at all. Where `npm run build` reports it, `meta.estimateModel.properties.*.floors`
holds the table below, and the validation report prints it.

## What was measured

`build/src/estimate/floors.js` hides every measured headline exactly as the calibration does (the typical product's value
of a material that publishes one), predicts it from the rest, and forms the shown range under each set of floors. What may
floor it is what a material with no comparable value has left: its measurements that `assess` (products.js) does not call
comparable for the headline (a yield or break stress where the headline is the ultimate strength, a value of another or no
stated direction, an HDT at 1.8 MPa for a headline at 0.45 MPa). A comparable value of any product would make the
material's headline a published one, and a product's own would be shown in place of its estimate.

Calibration itself is unchanged by the floors, so **EST-CALIBRATION still holds, identically**: likely 81.3 / 80.7 / 80.2 %
and plausible 95.3 / 95.2 / 95.1 % for tensileStrengthXY / elongationXY / hdt045, as before. The screening certification
(`build/snapshot/screening.csv`, 30 ends) is identical too: its back-test leaves every own bound out by design (screening.js),
so no screening end moved. What moved is each estimate's own range and, with it, the range an estimate may screen on.

The rows, per headline (hidden = measured headlines predicted; moved = ranges the floors changed against no floor; "under" =
hidden values that fell below the plausible range):

| Headline | Floors | Hidden | Moved | Likely holds | Plausible holds | Median likely width | Under plausible |
|---|---|---:|---:|---:|---:|---:|---:|
| tensileStrengthXY | none | 64 | 0 | 81.3% | 95.3% | ×1.46 | 3 |
| tensileStrengthXY | printed (before) | 64 | 46 | 64.1% | 78.1% | ×1.45 | 14 |
| tensileStrengthXY | printed, XY only | 64 | 7 | 78.1% | 92.2% | ×1.46 | 5 |
| tensileStrengthXY | **unstated (now)** | 64 | 59 | **29.7%** | **31.3%** | ×1.22 | 44 |
| tensileStrengthXY | unstated, same source also prints a bar | 64 | 46 | 62.5% | 76.6% | ×1.45 | 15 |
| tensileStrengthXY | unstated, lowest product's floor | 64 | 59 | 79.7% | 85.9% | ×1.45 | 9 |
| tensileStrengthXY | unstated, the product's own (a grade's range) | 64 | 33 | 78.1% | 87.5% | ×1.45 | 8 |
| elongationXY | none | 83 | 0 | 80.7% | 95.2% | ×3.74 | 2 |
| elongationXY | printed (before) | 83 | 55 | 53.0% | 67.5% | ×2.86 | 25 |
| elongationXY | printed, XY only | 83 | 14 | 77.1% | 91.6% | ×3.74 | 5 |
| elongationXY | **unstated (now)** | 83 | 70 | **32.5%** | **38.6%** | ×2.03 | 51 |
| elongationXY | unstated, same source also prints a bar | 83 | 56 | 50.6% | 65.1% | ×2.81 | 27 |
| elongationXY | unstated, lowest product's floor | 83 | 70 | 67.5% | 83.1% | ×3.41 | 13 |
| elongationXY | unstated, the product's own (a grade's range) | 83 | 42 | 69.9% | 84.3% | ×3.18 | 12 |
| hdt045 | none | 81 | 0 | 77.8% | 92.6% | 18.1 °C | 1 |
| hdt045 | printed (before) | 81 | 37 | 65.4% | 80.2% | 17.7 °C | 11 |
| hdt045 | **unstated (now)** | 81 | 53 | **54.3%** | **69.1%** | 13.7 °C | 21 |
| hdt045 | unstated, same source also prints a bar | 81 | 40 | 63.0% | 77.8% | 16.8 °C | 13 |
| hdt045 | unstated, lowest product's floor | 81 | 47 | 72.8% | 87.7% | 16.4 °C | 6 |
| hdt045 | unstated, the product's own (a grade's range) | 81 | 26 | 77.8% | 93.8% | 18.1 °C | 1 |

Density and tensileModulusXY have no lower-bound properties (headline_definitions.csv), so floors change nothing for them:
their rows are the calibration's (density 80.5 / 95.8 %, tensileModulusXY 80.7 / 95.2 %). "printed, XY only" does not apply to
hdt045 (it has no direction: every row there is the same as "none" by construction).

## What it says, plainly

1. **For a grade, the rule works.** Floored by its own formulation's measurements (the last row of each block), a hidden
   value is held about as often as the unfloored model holds it: tensile 78 / 88 %, elongation 70 / 84 %, HDT 78 / 94 %
   (against 81 / 95, 81 / 95, 78 / 93 with no floor). A product's ultimate strength is at least its own yield and break
   stress; that is physics and the data agree. The grade estimates take it (382 tensile and 379 elongation grade estimates moved).
2. **For a material, the rule as decided worsens coverage materially.** The material's range is floored by the highest
   floor among all its products. That was already so before D126 and already cost coverage (tensile plausible 95 to 78 %,
   elongation 95 to 68 %, HDT 93 to 80 %); admitting the unstated specimen takes it to **31 %, 39 %, 69 %**, and the
   hidden value falls under the plausible range in 44 of 64 tensile cases. The reason is not the specimen alone: with only
   printed bars in the headline's own direction ("printed, XY only") the plausible range holds 92 / 92 / 93 %, nearly as
   before. It is the unstated, unstated-direction values of other products (Spectrum PA6's 78 and 80 MPa "dry" rows; the
   floor of PA6's tensile estimate went from none to 80 MPa and its centre from 57 to 91 MPa; PE-GF's elongation floor is a
   35 % from one sheet) which read like moulded bars (D84) and sit above the typical printed product.
3. **Why the fallback the brief names is not enough.** Admitting an unstated specimen only where its source also prints a
   bar ("same source") recovers little: 77 / 65 / 78 %. The lowest of the products' floors ("lowest product") recovers more
   (86 / 83 / 88 %), because a material's range stands for any of its products and only the lowest floor is true of all of them.
   Neither reaches the unfloored 95 %.
4. **What the rule does well.** It removes every shown number below a floor, which is what the owner asked: before, 55 material
   estimates and 719 grade estimates (centre or range end) were under a floor the new rule admits (112 grade estimates under
   the old rule); after, none. EST-ORDER counts zero.

## Recommendation

Keep the grade rule as built. For the **material** estimate, replace "the highest floor among its products" with "the lowest
floor among its products that have one", or admit an unstated specimen only in the headline's own direction: either brings the
plausible coverage back to 83 to 92 % in the back-test, and floors every material estimate by what is true of every one of
its products. This is a one-line change in `build/src/estimate/bounds.js` (the list `m.headline[key].impliedBounds`) and
`build/src/compile.js` (`impliedBounds`); it was not made because the owner's decision named the rule.
The estimates moved by the rule as built are the material rows in `build/snapshot/headlines.csv` (58 rows) and the grade
rows in `grades.csv` (761); PA6, PE-GF, PET and the LCP are the visible ones.

## Screening

`build/snapshot/screening.csv` is unchanged: its 30 ends do not read the floors. The range an estimate may screen on
(`screenRange`) moved on 57 estimates (27 tensile, 23 elongation, 7 HDT), and one stopped being able to screen at all
(M139 LCP, hdt045: its floor of 193 °C leaves no bottom end below it). Two rows of `templates.csv` changed: PET (M066) is no
longer screened out of "Warm environment" by hdt045 >= 80 (its own HDT at 1.8 MPa is 65.7 °C, which the veto reads), and PE-GF
(M138) is no longer screened out of "Flexible component" by elongationXY >= 100.

## Left over

95 products publish a value under another measurement of the same product that bounds it from below: a different source,
direction, specimen or state than the value's own test (PRODUCT-ORDER, informational; 51 tensile, 43 elongation, 1 HDT).
They are two tests that disagree (most are another sheet of the same product; a Z bar that stretches further than the XY bar of the same sheet is
the rest, in elongation), not one test's endpoints, so the product keeps its own measurement. Where both are the product's, a reviewer
decides which is wrong.
