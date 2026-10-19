# The research intake (2026-10-19)

> **Historical record** (2026-10-19): the round that took in the external research package of 2026-10-19. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** An external research agent worked the open problems an agent can close by reading and searching, and
> this round took its results in the repository's way. Corrections went in by guarded migration, 57 new documents through
> the import pipeline (batch b48), page readings through the reading tools with a blind second read of everything that
> decides, and prices through the price pipeline (p06). Four products entered: Filamatrix Nylon Carbon Fiber and Nylon
> Glass Enhanced, Eumakers PA Nylon Glass Fiber, and Polymaker Panchroma Satin PLA. Nylon-GF gained a material page. The
> polyolefins now decide a silent chamber, two build causes were fixed, and twelve FormFutura links no longer ask for a
> sign-in. What the research could not settle is filed in OPEN-PROBLEMS (§39 and dated paragraphs) for the next round.
> Implemented by Claude Opus 5.5 (agent) with Claude Sonnet agents; no person reviewed it.

## What the owner decided

On 2026-10-19 the owner made four calls. Everything else was decided as an engineer in charge would, and the plan lists
those calls.

| Question | Answer |
|---|---|
| Adopt the research's three reading rules for print wordings? | Yes (D168): "not mandatory" or "open-frame" means no enclosure is needed; accepting stainless steel, or only a caution about wear, means no hardened nozzle is required; drying advised "once opened" or "depending on moisture" is optional |
| Switch the polyolefins' chamber row on if Braskem makes ten makers? | Yes: CN17 decides (D151) |
| How far to complete the new products? | The new products only: their sheets, recipes and prices |
| Push when verified? | Yes |

## The stages

| Stage | What it changes for a reader | Status |
|---|---|---|
| 0, 1 | Nothing: the baseline, and the triage of the package (its errors fixed or dropped, `ingest/intake.mjs`). Sonnet agents completed the new products' documents and re-checked the price leads, outside the repository | Done |
| 2 | 34 corrections the research found on held sheets (ranges, ±, standards, °F temperatures, annealing states, bracket standard deviations on 12 sheets), 14 acceptance reasons rewritten, Koltron's modulus flagged; D168's three wordings ([diff](stage-2-diff.md)) | m452, 5815246e |
| 3, 4 | Batch b48: 57 documents, four products, PolyTerra PLA+'s sheet moved to Panchroma Satin PLA, four polymer references. The readings: 73 values (34 fibre loads), 69 profiles (makers' drying guides, the new products' recipes, Braskem FL300PE's chamber, Raise3D PVA+'s 50 °C chamber ceiling, Braskem FL900PP-CF's alternate bed) and 5 held cells typed by hand ([diff](stage-34-diff.md), [review](proposals/r1-reviewed/summary.md)) | m453, m454, 71137cf6 |
| 5b | Polyolefins decide a silent chamber: 8 products read within, PE-GF passes two presets ([diff](stage-5b-diff.md)) | ee10d9e4 |
| 6 | Nine prices: purefil's own shop for six materials, 3DXTECH's PC/ASA and ESD-PPS out of stock, Panchroma Satin PLA on Amazon.ca ([review](prices/review-p06.mjs)) | m455, 4789e5c1 |
| 7 | A flagged value no longer stands in for a material in the table; a material's print gate names the product it was read from (the research's F-0187, F-0188) | f5d0f99a |
| 8 | 97 later copies of held sheets compared with their records ([compare](later/compare.csv), [reader](later/read-results.csv)); twelve FormFutura sheets point to their public address | m456 |
| 9 | The settings the new pages print beside the one the research read (Extrudr, Spectrum, SUNLU, 3D4Makers, Polymaker, FormFutura PPSU's 360-400 °C and 90 °C chamber, MatterHackers, eSUN), found by the context audit; Nylon-GF's page summary | m457 |
| 10 | The build, the views, the documents, this record, the archive | The close |

## What it moved

The whole round against main before it ([decision diff](after/DECISION-DIFF.md)): 91 material verdicts in 138 cases,
from four causes.
- **Nylon-GF** (the maker-undisclosed glass-filled nylons) has three products instead of one. Filamatrix's printed heat
  deflection (152 °C at 0.45 MPa) passes 60 to 120 °C, and the new products' undirected or resin-only values leave
  other answers unknown where Onyx GF alone failed them.
- **HIPS and PCTG** fail a density of 1250 kg/m³ or more, on their resin densities, which now cite a producer's sheet.
- **PE, PP, PP-CF and PE-GF** pass where only the chamber was unanswered. FL300PE's own statement does it for PE, and
  the polyolefins row for the rest.
- **Stage 2's corrections** moved PET-GF's QIDI product (annealed, as its page says) and PVDF's as-published stiffness.

| | Before (main) | After |
|---|---:|---:|
| Products | 1,105 | 1,109 |
| No nozzle / no bed temperature | 35 / 34 | 32 / 33 |
| Chamber check unanswered | 221 | 213 |
| No drying statement | 205 | 145 |
| Fibre-filled products with their own load | 141 of 252 | 174 of 255 |
| Priced materials / products | 108 / 221 | 113 / 228 |
| Material pages | 76 | 77 (Nylon-GF) |
| Sources / measurements / profiles | 2,033 / 14,974 / 1,836 | 2,100 / 15,047 / 1,906 |

The counts come from [counts.mjs](counts.mjs) ([before](baseline/counts-before.json), [after](after/counts-after.json)), and the pages
from [pages-list.mjs](pages-list.mjs) ([before](baseline/pages-before.csv), [after](after/pages-after.csv)).

## What did not enter, and why

- **The package's errors**:
  - invalid vocabulary;
  - fibre loads written into grades' composition (they became measurements, D150);
  - plain schedules called "optional";
  - "new" pages the repository already held;
  - four false RECORD-WRONG findings;
  - over-precise °F conversions;
  - duplicate and mislabelled documents;
  - wrong price URLs.

  Each was fixed or dropped in the triage.
- **Readings made on later copies** were kept only where the registered sheet prints the same line.
- **The later copies themselves** were not registered (D131). FormFutura's 17 changed sheets are its 2024 template,
  with other numbers and one block repeated across products. Fiberlogy's R PP sheet of May 2025 is the first to register
  next round (OPEN-PROBLEMS §39.1).
- **The PolySonic rename page** names the rename but not which of two differing sheets is the product's, so both grades
  stay (§31.12). iSANMATE's glass statement was already in C01409.
- **The held sheets** (Diran, Electrifi, Fibrolon, Onyx ESD) still wait on the owner's ruling on their homes; the new
  evidence is in §14.
- **No new polymer rows and no numeric polymers.csv change**: the estimate model stays frozen. The annealed
  heat-deflection conversion still learns from one maker's pairs and keeps its documented offset.
- **Prices** not taken: §22 and the p06 review give each reason.
- **The rest**: [disposition.csv](../../../archive/research-2026-10-19/disposition.csv) gives every finding's fate.

## Checks

- Every quote is checked on its cached, hash-checked page by the migrations.
- Every deciding or image-only reading was read blind a second time; all agree.
- `verify:fast` passed at each commit, and `npm run verify` before the push.
- The interface views were rewritten with no layout failure.
- One independent review closed the round.

## Left

OPEN-PROBLEMS now holds what is left:
- §39.1: later copies that differ from the held sheets.
- §39.2: sixteen materials one product short of a page.
- §39.3: the package's untouched tasks (P2.7, P2.9, P2.10) and its scoped negatives (146 recipes, 128 chambers, 67
  fibre loads).
- §39.4: Eumakers' two densities.
- §39.5: readings the tables cannot hold yet.
- Dated paragraphs in the items the round touched.

The research brief's target lists are regenerated from this state for the next round.
