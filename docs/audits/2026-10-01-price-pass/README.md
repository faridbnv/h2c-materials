# The price pass (2026-09-30 onwards)

GOALS step 6, as the owner decided on 2026-09-30 ([GOALS, "Decided on 2026-09-30, the price pass"](../../GOALS.md)):
a price for each material, and for each product where that is possible; CAD from a Canadian shop first, then an
Amazon.ca listing sold by the maker's own store, then USD, then EUR with the VAT the page states taken off.

## Where it started

`targets.mjs` writes [TARGETS.csv](TARGETS.csv) from the build: every material in scope, its active procurement products
in the order the pass tries them (a product that passes one of the frozen default questions first, then plain products,
then declared variants), and whether each is priced. On release 26424edd53e5:

| | Count |
|---|---|
| Materials in scope | 136 |
| … with a price | 33 |
| … without one | 103, of which 3 have no procurement product (M056 PA66-CF, M058 PA612, M060 PA612-GF) |
| Products (active, procurement) | 1,077 |
| … with a price of their own | 38 |
| Products that pass at least one frozen default question | 732 |
| … with a price of their own | 33 |

All 104 listings were CAD, read on 2026-09-10 from three Canadian shops (Bambu Lab Canada, 3D Printing Canada,
Shop3D.ca), and `prices.csv` could hold no other currency.

## The steps

1. **The decision and the worklist** (this folder, GOALS, AGENTS).
2. **Prices in any currency** (m227, D113): the table made currency-neutral, `fx_rates.csv`, the build's conversion
   and the page's wording, with no value moved.
