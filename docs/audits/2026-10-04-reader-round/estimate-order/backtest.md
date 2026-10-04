# Estimate order: the floors, back-tested (D126 draft, 2026-10-04)

The change: an estimate is floored by what a product's own measurements prove (an ultimate strength is at least its yield and
break stress, a strain at break at least the strain at yield, HDT at 0.45 MPa at least HDT at 1.8 MPa). A bar whose source
states no specimen now bounds as a printed bar does, in any direction. A moulded bar, a film, a filament strand and a bar
printed off the product's recipe still bound nothing.

- **A grade's range** is floored at the highest floor its own formulation proves (it took none before).
- **A material's range** is the spread of its products, and what physics requires of a spread is that it contain every
  product's proven floor. It reaches the highest product floor from above (its upper ends are raised to it) and is floored
  from below at the lowest product floor, only when every active product has one. This replaces the D78 floor "held at the
  highest own printed limit" for materials. The first version of the change floored a material at the highest of its products'
  floors; the back-test below is why it was not kept.

`meta.estimateModel.properties.*.floors` holds the table and the validation report prints it.

## What was measured

`build/src/estimate/floors.js` hides every measured headline exactly as the calibration does (the typical product's value
of a material that publishes one), predicts it from the rest, and forms the shown range under each set of floors. What may
floor it is what a material with no comparable value has left: its measurements that `assess` (products.js) does not call
comparable for the headline (a yield or break stress where the headline is the ultimate strength, a value of another or no
stated direction, an HDT at 1.8 MPa for a headline at 0.45 MPa).

Calibration itself is unchanged by the floors, so **EST-CALIBRATION still holds, identically**: likely 81.3 / 80.7 / 80.2 %
and plausible 95.3 / 95.2 / 95.1 % for tensileStrengthXY / elongationXY / hdt045. The screening certification
(`build/snapshot/screening.csv`, 30 ends) is identical too: its back-test leaves every own bound out by design.

| Headline | Floors | Hidden | Moved | Likely holds | Plausible holds | Median likely width | Under plausible |
|---|---|---:|---:|---:|---:|---:|---:|
| tensileStrengthXY | none | 64 | 0 | 81.3% | 95.3% | ×1.46 | 3 |
| tensileStrengthXY | printed, highest (before D126) | 64 | 46 | 64.1% | 78.1% | ×1.45 | 14 |
| tensileStrengthXY | printed, XY only | 64 | 7 | 78.1% | 92.2% | ×1.46 | 5 |
| tensileStrengthXY | unstated, highest (rejected for materials) | 64 | 59 | 29.7% | 31.3% | ×1.22 | 44 |
| tensileStrengthXY | **containment (material rule)** | 64 | 12 | **85.9%** | **92.2%** | ×1.73 | 5 |
| tensileStrengthXY | unstated, same source also prints a bar | 64 | 46 | 62.5% | 76.6% | ×1.45 | 15 |
| tensileStrengthXY | unstated, lowest product's floor | 64 | 59 | 79.7% | 85.9% | ×1.45 | 9 |
| tensileStrengthXY | unstated, the product's own (a grade's range) | 64 | 33 | 78.1% | 87.5% | ×1.45 | 8 |
| elongationXY | none | 83 | 0 | 80.7% | 95.2% | ×3.74 | 2 |
| elongationXY | printed, highest (before D126) | 83 | 55 | 53.0% | 67.5% | ×2.86 | 25 |
| elongationXY | printed, XY only | 83 | 14 | 77.1% | 91.6% | ×3.74 | 5 |
| elongationXY | unstated, highest (rejected for materials) | 83 | 70 | 32.5% | 38.6% | ×2.03 | 51 |
| elongationXY | **containment (material rule)** | 83 | 13 | **80.7%** | **89.2%** | ×6.94 | 8 |
| elongationXY | unstated, same source also prints a bar | 83 | 56 | 50.6% | 65.1% | ×2.81 | 27 |
| elongationXY | unstated, lowest product's floor | 83 | 70 | 67.5% | 83.1% | ×3.41 | 13 |
| elongationXY | unstated, the product's own (a grade's range) | 83 | 42 | 69.9% | 84.3% | ×3.18 | 12 |
| hdt045 | none | 81 | 0 | 77.8% | 92.6% | 18.1 °C | 1 |
| hdt045 | printed, highest (before D126) | 81 | 37 | 65.4% | 80.2% | 17.7 °C | 11 |
| hdt045 | unstated, highest (rejected for materials) | 81 | 53 | 54.3% | 69.1% | 13.7 °C | 21 |
| hdt045 | **containment (material rule)** | 81 | 6 | **79.0%** | **92.6%** | 19.5 °C | 1 |
| hdt045 | unstated, same source also prints a bar | 81 | 40 | 63.0% | 77.8% | 16.8 °C | 13 |
| hdt045 | unstated, lowest product's floor | 81 | 47 | 72.8% | 87.7% | 16.4 °C | 6 |
| hdt045 | unstated, the product's own (a grade's range) | 81 | 26 | 77.8% | 93.8% | 18.1 °C | 1 |

Density and tensileModulusXY have no lower-bound properties, so floors change nothing for them. "printed, XY only" does not
apply to hdt045 (it has no direction).

## What it says

1. **For a grade the floor works.** Floored by its own formulation's measurements, a hidden value is held almost as often as
   with no floor (78 / 88 %, 70 / 84 %, 78 / 94 % against 81 / 95, 81 / 95, 78 / 93). A product's ultimate strength is at least
   its own yield and break stress.
2. **Taking the highest product floor as a material's floor fails.** It held the hidden typical product only 31, 39 and 69 %
   (plausible) of the time, against 78, 68 and 80 % even for the printed-bar rule it replaced. A material's range stands for
   any of its products, and a floor at the best one's is true only of that one. The unstated, unstated-direction values of
   other products (Spectrum PA6's 78 and 80 MPa "dry" rows) read like moulded bars (D84) and lifted PA6's tensile estimate
   from a centre of 57 to 91 MPa.
3. **Containment holds.** Requiring only that the range reach every product's floor, and flooring its lower end at the lowest
   product's floor where every product has one, holds the hidden value 92 / 89 / 93 % (plausible) and 86 / 81 / 79 % (likely):
   about as often as with no floor, and above the old printed rule on all three. It moved only 12, 13 and 6 of the cases. Its cost is width: the likely
   range is wider where a high floor raises its upper end (elongation ×3.74 to ×6.94), which is the honest statement of a
   spread that contains a product the model alone would have put outside it.
4. **EST-ORDER is zero.** Before: 39 material estimates and 719 grade estimates (a centre or a range end) were outside what the
   containment and grade rules require (112 grade estimates under the pre-D126 rule); after, none.

## Screening

`build/snapshot/screening.csv` is unchanged. The range an estimate may screen on (`screenRange`) moved on 44 estimates
(19 tensile, 19 elongation, 6 HDT; its upper end is raised to the highest product floor), and one stopped being able to screen
(M139 LCP, hdt045: the single product's floor of 193 °C leaves no bottom end). No row of `templates.csv` changed against the
state before D126.

## Left over

95 products publish a value under another measurement of the same product that bounds it from below: a different source,
direction, specimen or state than the value's own test (PRODUCT-ORDER, informational; 51 tensile, 43 elongation, 1 HDT).
They are two tests that disagree, not one test's endpoints (most are another sheet of the same product; a Z bar that
stretches further than the XY bar of the same sheet is the rest, in elongation), so the product keeps its own measurement.
