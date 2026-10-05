# The coverage check (2026-09-30)

> **Historical record** (2026-09-30): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

The owner asked, after the price pass: "Check the coverage page of the UI, is it correct?"

## How it was checked

The Data coverage lens was rendered from the built page in a headless browser, every cell of all 153 candidates read
back with its tooltip, and each compared with what the material's own records hold, by the rule the build's validator
already applies (`build/src/coverage-rules.js`, D74). [`check.mjs`](check.mjs) repeats the comparison from `dist/db.json`
without a browser; it exits 1 on a mismatch.

## What was found

**No cell was false.** No cell claimed evidence a material does not have, and none showed a gap beside records it has.
COVERAGE-UNTRUE had held that since 2026-09-13.

**The page said one thing several ways.** On release a7f6cf7c06e7:

1. **The same absence read "–" or blank.** D74 derived a row where the records prove evidence, and kept stored rows only
   for judgements; but the "Gap" rows of the first workbook stayed, 63 of them the one templated sentence
   "Insufficient grade-specific evidence in sampled sources. Shared family notes may be available; no numerical
   substitution." Materials added since had none. So neither PC-GF nor PC-ASA has a price, and PC-GF's cell read "–" and
   PC-ASA's blank. 221 cells were blank this way (environment 67, H2C status 61, price 57, print setup 22, thermal 11,
   mechanical 3), beside Application's 71, and the legend had no word for a blank.
2. **A converted price read as no price.** The price pass priced 30 materials only from foreign listings (D113). The
   column counts Canadian listings, so those 30 read "–" (11, the templated row) or blank (19), the same as a material
   with no price at all.
3. **ABS's price showed a conflict it no longer had.** C01110, the 2026-09-13 quarantine of CA0069, a Bambu Lab PLA Pure
   listing filed under ABS, still showed ✕ in ABS's price cell beside ABS's own listings. The price pass had since
   priced PLA Pure (G001-183) from the same shop.
4. **Six conflicts were invisible.** The legend promises ✕ for a conflict, but six recorded conflicts sit in domains the
   grid has no column for (a composition, a source contradicting itself, a measurement that could not be parsed: PCTG,
   PLA-CF, PLA-GF, PLA Silk, TPU harder than 95A, PAHT-CE). Only the drawer showed them.
5. **The rarely published properties' lists were stale.** One templated list stood on 82 materials and none on the rest,
   and on five it named six properties their own products publish, measured since: the fatigue life of ASA, PC, PA12
   and PC-ABS, the thermal conductivity of PC and PC-PBT.

## What changed (D114, m233)

- **The build derives absence as it derives evidence** (`coverage-rules.js`). Where no stored row speaks and the records
  show nothing, a derived Gap says what is missing: in H2C status, print setup, mechanical, thermal, environmental
  (saying where the base polymer's published behaviour is shown instead) and price (naming any listing that is out of
  stock). A stored row still wins, and a family entry gets none.
  Application stays a reviewer's column (D74): its blank now has a legend entry, "Not assessed", and is the only blank.
- **A converted price is "Limited comparability"** (◐), naming the currency and the Bank of Canada rate date. A Canadian
  listing is ✓, no price is –.
- **The rarely published properties are derived from each material's measurements**, as a Gap naming what its products
  do not publish, or a recorded row where they publish them all.
- **145 templated rows left through the removal ledger** (D72): 63 Gaps in derived domains
  ([removed-templated-gaps.csv](removed-templated-gaps.csv)) and 82 rarely-published lists
  ([removed-sparse-gaps.csv](removed-sparse-gaps.csv)), each kept verbatim. The build's derived row gives each pair the
  same status, or ◐ where the price is converted.
- **CA0069 is filed under PLA Pure** (G001-183), not quarantined, and outside the price sample: the same shop's
  2026-09-30 listing, CA0294, is in it. C01110 is superseded by C01491, which says so, and ABS's price cell reads ✓.
- **Conflicts outside the grid are named under it**, each opening the material's Coverage tab (`app/js/ui/heatmap.js`).

## Before and after

| Cells of the grid (153 candidates) | Before | After |
|---|---|---|
| Blank | 292 (Application 71, the other domains 221) | 71, all Application ("Not assessed") |
| Price: ✓ Canadian listing, or a closed conflict | 70 | 71 |
| Price: ◐ converted | 0 | 30 |
| Price: – no price | 25 | 52 |
| Price: ✕ | 1 | 0 |
| Conflicts shown | 2 in the grid, one of them C01110 | 1 in the grid, 6 named under it |

The recorded counts on the cards did not move: evidence was already derived. Nothing a scenario decides reads
coverage: `build:diff` moved only coverage rows, CA0069 and the offer lists of M001 and G001-183 (CA0069 is an offer,
outside the sample, so no price moved), and the frozen replay (`../2026-09-29-gap-fill-implementation/replay.mjs`,
15 questions, 18,195 evaluations, [frozen-replay.json](frozen-replay.json)) moved no verdict.

What is here: [check.mjs](check.mjs), the comparison; [changelog.csv](changelog.csv), `npm run data:diff` of m233; the two
archives of the removed rows.

## Left open

- Application: 71 materials are not assessed. It is a judgement about finishing and use, which no record restates.
- The seven conflicts: [OPEN-PROBLEMS §4](../../OPEN-PROBLEMS.md).
