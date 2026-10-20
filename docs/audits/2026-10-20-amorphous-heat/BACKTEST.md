# D177 back-tested: an undescribed heat deflection of a plastic that cannot crystallise counts

> **Historical record** (2026-10-20): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** D177 changes what the frozen estimate stage reads (two frozen tables gain a column: polymers.csv Can
> crystallise, headline_definitions.csv Undescribed bar counts for), so it was measured as stage 4 measured its changes
> ([stage-4-backtests.md](../2026-10-18-screening-build/stage-4-backtests.md)): the build hides values it knows, predicts
> them from everything else, and counts how often the likely (80 %) and plausible (95 %) ranges hold them. EST-CALIBRATION
> holds with the rule and without it. Only heat deflection moves: seven more materials have a value of their own and are
> hidden, the materials' ranges narrow (median likely width 13.3 → 12.5 °C), and the products' calibration, the
> stiffness, strength, stretch and density models do not move. Kept.

How it was run: [backtest.mjs](backtest.mjs), one build per variant of the tables as m487 leaves them: **with** the
rule (`current`) and **without** it (`rule-off`: Undescribed bar counts for back to Not applicable on every headline, so
the same records, loads, flags and Specimen types, every undescribed bar set apart as D172 had it). **Held** is how many
hidden values were predicted; **likely** and **plausible** how often the 80 % and 95 % ranges held them; **width** the
median width of the likely range in °C; **scales** the factors calibration widened the ranges by.

## Heat deflection at 0.45 MPa, the one headline that moves

| | Without the rule | With the rule |
|---|---|---|
| Materials hidden and predicted | 59 | 66 |
| Likely / plausible coverage | 81.4 / 96.6 % | 80.3 / 95.5 % |
| Scales (likely / plausible) | 1.27 / 1.71 | 1.27 / 1.21 |
| Median likely width | 13.3 °C | 12.5 °C |
| By stratum: other materials (held, likely / plausible) | 39, 74.4 / 94.9 % | 46, 73.9 / 95.7 % |
| By stratum: crystalline filled | 9, 88.9 / 100 % | 9, 88.9 / 88.9 % |
| By stratum: PLA filled, PLA unfilled | 10, 100 / 100 %; 1, 100 / 100 % | the same |
| Products hidden and predicted (grade calibration) | 414, 80.2 / 95.2 % | the same |
| Products by matrix as printed (D162's bar): glassy, crystalline filled, crystalline unfilled | 336, 81.0 / 95.2 %; 51, 80.4 / 92.2 %; 27, 70.4 / 100 % | the same |
| Floors, the material rule (containment): held, likely / plausible, under the plausible range | 59, 79.7 / 93.2 %, 1 | 66, 80.3 / 90.9 %, 2 |
| Materials with a value of their own | 82 | 89 |
| Products with a comparable value | 312 | 356 |
| Products with a comparable value at 1.8 MPa (drawn in the drawer) | 137 | 182 |
| Product estimates | 446 | 446 |
| EST-CALIBRATION, EST-ORDER, EST-THIN, CONVERSION-DRIFT findings | 0, 0, 0, 0 | 0, 0, 0, 0 |

Density, tensile modulus, tensile strength and elongation read the same to the last digit either way (their calibration,
their materials and products with a value, their estimates), as D177 changes nothing they read. Main's release
(5a7ec4ca599d, before m487) reads as the build without the rule does, but for the products' heat deflection calibration,
which holds one hidden value more after m487 (413 → 414, 80.1 / 95.2 → 80.2 / 95.2 %): m487's records (three loads read,
the 1.8 MPa line Nanovia's records lacked, two values flagged, the counter-indications' Specimen type) move nothing else
the back-test measures.

**What moved, and why.** The seven materials newly hidden are glassy ones that publish a counted value (ABS-AF, COC,
CPE-CF, PC-PTFE, PCTG-CF, PCTG-GF, PETG-GF), whose heat deflection the model predicts well from their glass transition; with
them the calibration needed less widening, and the plausible scale fell from 1.71 to 1.21. The crystalline filled
materials, which share that scale, then hold 8 of their 9 hidden values in the plausible range (88.9 %), against stage
4's rule of 85 % for a stratum; and the narrower ranges flag two crystallisable materials' own printed values as
outliers (PET-CF 100 °C against an expected 78, PPS-ESD 93 °C against 193), each accepted with its reason in m487. The
floors hold 90.9 % of hidden values in the plausible range (one more under it), at D167's bar. The products' calibration,
which hides every published value of a product whatever its bar, cannot see the rule and does not move.

**Verdict.** Kept: EST-CALIBRATION holds on every headline and matrix with the rule, the material ranges for heat
deflection are narrower and still hold 95.5 %, and the strata stay above stage 4's rule. The one stratum to watch is the
crystalline filled materials' (9 held, 88.9 %): listed in OPEN-PROBLEMS §15.
