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
3. **Price tooling** (`npm run ingest:prices`, `scripts/lib/offers.mjs`): shop pages captured and hashed, offers read
   from the bytes alone, and a guarded apply (IMPORTING, "Capturing a price").
4. **Batch p01, Canadian shops in CAD** (m228, below).

## Batch p01: the Canadian shops (2026-09-30)

Twelve Canadian Shopify shops were captured whole on 2026-09-30, each with its own `/meta.json` stating its base
currency (CAD for all twelve): 3D Printing Canada, Filaments.ca, Shop3D.ca, DigitMakers, Voxel Factory, MakerWiz, CAD
MicroSolutions, and the Canadian stores of ELEGOO, Anycubic, ERYONE, QIDI and Flashforge (53 documents, 31,963 listed
variants; `archive/ingest-2026-09-18/prices/p01/captures.csv`). Two shops the research named were not Canadian
listings: ca.polymaker.com and ca.spectrumfilaments.com are priced in USD, and are recorded in USD or not at all.

`match.mjs` offered each product the listings that name its maker and every word of its name; `review-p01.mjs` is the
review. For the 100 materials without a price it was read listing by listing (82 listings accepted, 21 candidates
rejected with why, in [REJECTED-p01.csv](REJECTED-p01.csv): a sibling product, a printer part, a 2.85 mm-only listing,
no printed mass). For the other products of priced materials only a listing whose name, less its maker, colour and
size, is the product's name and nothing more was taken, never a bundle or a spool over 1.1 kg. Per product: one listing
per shop in stock, or one out-of-stock listing where no shop had it in stock.

| | Before | After p01 |
|---|---|---|
| Price listings | 104 | 303 (199 new: 163 in stock, 36 out of stock), from 7 shops |
| Materials in scope with a price | 33 | 66 |
| Products with a price of their own | 38 | 168 |
| Passing products (frozen default questions) with a price | 33 | 128 |
| Canadian-price Gap rows superseded | | 23 (the other 10 newly priced materials had no stored row) |

Every row passed `ingest:prices`' guard (the offer's own price, compare-at price, stock and SKU; the shop's own
currency; a mass printed once in the listing; 1.75 mm by the variant's words, its SKU or the description) and the
rehearsal. The frozen questions' replay (`../2026-09-29-gap-fill-implementation/replay.mjs`, 15 questions, 18,195
evaluations) moved no verdict: price is tracked, never required, in every template. What moved is what a price shows:
the medians, ranges and buy links of materials that were already priced, and the price column of 33 that
were not. The captured documents a row cites are in the private source store (36 documents).

## Batch p02: Amazon.ca, sold by the maker's own store (2026-09-30)

The last Canadian option. Amazon.ca was searched for the unpriced products of every maker with an Amazon.ca store of its
own (SUNLU, ERYONE, iSANMATE, ELEGOO, Kingroon, Creality, Anycubic, Siraya Tech, Polymaker, eSUN); only Siraya Tech's and
Polymaker's were sold there by the maker. Five product pages were drawn by a browser and hashed as drawn
(`archive/ingest-2026-09-18/prices/p02/`); the reader takes the buy box's price to pay, its struck-through List Price,
its stock line and its seller, never a member's price or another offer elsewhere on the page. Two listings name no
diameter; each product's own data sheet, already registered, prints "Diameter (mm) 1.75±0.03" and no other, which the
review cites ([review-p02.mjs](review-p02.mjs)).

| Product | Material | Amazon.ca | Regular / sale |
|---|---|---|---|
| Siraya Tech Rebound PEBA 95A | M045 PEBA | B0FF4RD2D3 | 84.99 CAD / 0.8 kg |
| Siraya Tech Fibreheart PPA | M069 PPA | B0DGQFB1WF | 84.99 / 76.99 CAD / 1 kg |
| Siraya Tech Fibreheart PPA-GF | M071 PPA-GF | B0FL7HN6WJ | 105.93 CAD / 1 kg |
| Polymaker Panchroma CoPE | M091 CoPE | B0D4DSK1RY | 21.59 CAD / 1 kg |
| Siraya Tech Flex TPU Air | M150 TPU-LW | B0DZCD4Z9M | 69.99 / 62.99 CAD / 1 kg |

Materials with a price: 66 → 71; products 168 → 173; passing products 128 → 130. As the owner accepted, an Amazon.ca
price is what the maker's store asks there, which can sit well above its own shop's: Siraya Tech's US shop lists
Fibreheart PPA-GF at 45.59 USD, and ships it only to the US, the EU and Australia.
