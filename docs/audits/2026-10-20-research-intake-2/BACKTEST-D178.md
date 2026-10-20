# Back-test of D178: heat deflection's grade ranges take their matrix's own scales

> **Historical record** (2026-10-20): the back-test of one change to the estimate model, made in research intake 2. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

**What happened.** The round's new data stopped the build at EST-CALIBRATION ("hdt045 grades semi-unfilled"). The data were:
- Forward AM Ultrafuse PP GF30's heat deflections;
- Raise3D PA12 CF's as printed;
- Essentium PA-CF filed under PA6/66-CF.

**Why the model failed.** The model predicts these products well, which narrowed the single scale that every product's heat range shares. The 27 hidden values of unfilled crystalline products, which no change in the round touched, then fell inside their 80 % range 63 to 67 % of the time, under the 70 % floor. On main they were at 70.4 %, at the edge of that floor.

**The owner's ruling (2026-10-20).** Heat deflection's grade ranges take their matrix's own scales wherever those are wider than the shared ones (D178).

**How it is measured.** Each grade that publishes the headline has its own values hidden in turn and predicted from the rest (`build/src/estimate/grades.js`). The table gives:
- the share of hidden values inside the likely (80 %) and plausible (95 %) ranges, overall and by matrix as printed;
- the scale each range is shown with.

Main's figures come from the committed `build/reports/validation-report.md` at `8cbda32c`. The "D178 alone" column is main's tables built with the D178 code (a scratch build of `git archive HEAD data`). The "this round" columns are the round's tables.

## Results

| | Main (8cbda32c) | D178 alone, main's tables | This round without D178 | This round with D178 |
|---|---|---|---|---|
| Shared scales (likely / plausible) | 1.24 / 1.54 | 1.24 / 1.54 | about 1.16 / 1.52 | 1.16 / 1.52 |
| Semi-unfilled's scales | shared | 1.32 / 1.54 | shared | 1.32 / 1.52 |
| Semi-filled's scales | shared | 1.24 / 1.64 | shared | 1.16 / 1.67 |
| All 414 / 416 hidden: likely / plausible | 80.2 / 95.2 % | 80.9 / 95.7 % | n/a (build stopped) | 80.8 / 95.7 % |
| Glassy (amorphous), 336 | 81.0 / 95.2 % | 81.0 / 95.2 % | n/a | 80.4 / 95.2 % |
| Crystalline filled, 51 / 53 | 80.4 / 92.2 % | 80.4 / 96.1 % | n/a | 83.0 / 96.2 % |
| Crystalline unfilled, 27 | 70.4 / 100 % | 81.5 / 100 % | 63 to 67 / 100 % | 81.5 / 100 % |
| Median plausible width | 21.3 °C | 21.3 °C | n/a | 21 °C |
| Decision census, 138 cases | baseline | **0** answers moved | n/a | see the round's diff |

## After the review (R05): judged out of fold

The independent review found a flaw in the check:
- A matrix's own scale is set from its own hidden values, so in sample it holds them by construction.
- The per-matrix check could therefore no longer fail for such a matrix.
- D81's stop rule read only the shared scales.

Now a matrix with its own scales is judged out of fold: each fold of materials by scales set from the other four. The
clamp reads every scale. The round's final tables include the review's fixes (m495).

| Out of fold, likely / plausible | Main's tables with D178 | The round's final tables |
|---|---|---|
| Crystalline unfilled (27) | 74.1 / 100 % (passes; the floor is 70 %) | 81.5 / 100 % |
| Crystalline filled (51 / 52) | 80.4 / 92.2 % | 82.7 / 92.3 % |
| Shared scales | 1.24 / 1.54 | 1.22 / 1.55 |
| Matrix scales (unfilled; filled) | 1.32 / 1.54; 1.24 / 1.64 | 1.38 / 1.55; 1.24 / 1.72 |

## What the table shows

- **Only two ranges widen.**
  - Crystalline unfilled products (the nylons, PP, PPS, PBT and others printed without a filler) widen their likely heat range by about 14 %.
  - Crystalline filled products widen their plausible range by about 9 %.
  - The 336 glassy products keep the shared scales.
- **Every matrix with 20 hidden values or more holds its claim, judged out of fold where it has scales of its own.** On main the filled crystalline products' plausible range held 92.2 %, under its 95 % claim but within the check's allowance, and it still does out of fold.
- **No answer moves on main's tables.** A grade range is a product's estimate, which never passes a requirement (D81), and no likely tag moved in the 138 cases.

## What would break if reversed

On the round's tables the build stops again: unfilled crystalline products' heat ranges would claim 80 % and hold two thirds.
