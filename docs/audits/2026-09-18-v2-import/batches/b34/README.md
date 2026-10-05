# Batch b34: the held sheets get a home

> **Historical record** (2026-09-18): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../../README.md) and [OPEN-PROBLEMS](../../../../../docs/OPEN-PROBLEMS.md).

Applied 2026-09-25 by `m143-batch-b34`: 44 documents, 38 products, 381 records (257 measurements, 37 profiles, 44
sources, 38 grades, 4 accepted findings, 1 coverage recount). The owner lifted the import pause for the 74 sheets
deferred for their identity, the 50 that name only a family and the 24 that waited on an owner ruling (docs/GOALS.md,
"Decided on 2026-09-25, for phase 5"). m142 made the homes; R167 to R198 settled the identities (D87).

**Who reviewed.** Every row was read by an agent, named as the reviewer: `claude-opus-5.5 (agent reviewer)`. The
decisions are in [review.mjs](review.mjs), one call of `ingest:review` each, with the reason written on the row. The
optically read sheets (Fiberlogy FiberFlex 30D ×3, 40D ×2, MattFlex 40D ×2, BigRep HI-TEMP CF) were read against their
page images in `.cache/pages` and signed `--visual`. No second reader has sampled this batch (R085).

**How it ran.** `--reopen-gap` put the 74 back under the hold they were deferred with; `--holds`; `--propose --held
ruling` read 105 held documents, of which the 31 not among the 74 are outside the owner's exception and were set
aside, and the 74 were proposed by key (`propose.mjs --doc`). Review, `--split` (33 aside), `ingest:apply --dry-run`,
the migration, `--holds`, and [settle.mjs](settle.mjs) for the 30 that did not enter. Three reviewed documents the split
moved aside went back: colorFabb's two PA Blue Metal Detectable sheets, whose grade carried no MaterialID because R079
filed them after the grade row was written (the reviewer set M164, which the proposal's own identity names), and
NinjaTek Chinchilla, held for "several values" where the two columns are the same value in imperial and metric units.

## Where each of the 74 went

| Outcome | Sheets | Where |
|---|---:|---|
| applied | 44 | 38 products, below |
| registered | 6 | three Eastman Amphora resin sheets to the colorFabb products made of them (R194: AM3300 to nGen G092-01, HT5300 to HT G089-04, AM1800 to XT G089-03); 3DJake's copy of GreenTEC Pro CF (G169-01); Nanovia's French TPE 22D page (G167-01); UltiMaker's Method Nylon comparison page (G164-05, its values rejected: a tensile strength per Method material) |
| not a data sheet | 2 | BASF's debinding guide for Ultrafuse 316L, listed under 17-4 PH; Revopoint's POP 4 scanner brochure |
| deferred | 22 | each with its gap in the ledger (OPEN-PROBLEMS §14) |

**Applied, by material.**

| Material | Products |
|---|---|
| Nylon, polymer not stated (M164) | colorFabb PA NEAT (2018 and 2023 sheets), PA Blue Metal Detectable (two editions), Fillamentum Nylon FX256, CreatBot Ultra PA, MatterHackers PRO Series Nylon, Nanovia PA Food Industry (declared dense filler), Spectrum ThermaTech PA (declared dense filler), MakerBot Specialty Nylon, Yousu Nylon |
| Nylon-CF, polymer not stated (M165) | colorFabb PA-CF low warp |
| Nylon-GF, polymer not stated (M166) | Markforged Onyx GF (every value conditioned, as its footnote says) |
| TPE, polymer not stated (M167) | eSUN TPE 83A, Fillamentum Flexfill TPE 90A and 96A (polymer base polyolefin), Nanovia TPE 22D, Flex, Flex VX, ISTROFLEX and Flex B4C (the last two declared dense fillers), NinjaTek Chinchilla, Fiberlogy FiberFlex 30D (three sheets), FiberFlex 40D (two), MattFlex 40D (two) |
| PLA family, polymer not stated (M168) | Extrudr GreenTEC and GreenTEC Pro, 3DJake niceBIO, Spectrum Greeny Pro, BigRep PRO HT; moved by m142: purefil GreenTEC Pro, Spectrum GreenyHT |
| PLA family-CF, polymer not stated (M169) | Extrudr GreenTEC Pro CF, BigRep HI-TEMP CF |
| TPS (M170) | BASF Ultrafuse TPS 90A, purefil TPS 40D |
| 316L, SiC, alumina sintering filaments (M171 to M173, Excluded) | BASF Ultrafuse 316L (print settings only: every value is the sintered steel's), Nanovia Mt 316L, Nanovia SiC, purefil Kerfil Aluminiumoxid |
| PA6 (M049) | 3DXTECH WearX Wear Resistant PA6 Copolymer (R195) |
| TPU harder than 95A (M162) | Copper3D MD Flex, "a high quality TPU98A" (R197) |

## What the review decided by hand

- **Rows read wrongly, rejected with the line quoted.** "Shore D 15s ... 27" read as 15 Shore D (two FiberFlex
  sheets); a tensile strength at break read as ThermaTech's modulus; Onyx GF's dry XY table read as XZ; purefil TPS
  40D's "Thermal conductivity 23°C" read as a Vicat; four sintering shrinkages (three products) read as mould shrinkage; Nanovia's list
  of its other flexibles read as TPE 22D's hardness; a BASF TPS Charpy whose column is ZX, with no direction on the row.
- **Profiles rejected** where the reader left every printed setting unread or read a garbled text layer (purefil TPS
  40D, Kerfil, BigRep PRO HT). Three partial ones were accepted with the misses named on the row (OPEN-PROBLEMS §14).
- **What the page prints, written with --set:** four compositions the reader missed or garbled (the metal-detectable
  particles, "Polymer base polyolefin", the 10 % carbon fibre, MD Flex's TPU98A and copper), four declared dense
  fillers (R095), Onyx GF's conditioning footnote, a notch its method states, and two drying sentences.
- **Names read from the page** (`--rename`): Onyx GF, Chinchilla, MD Flex, Kerfil Aluminiumoxid (Al2O3), and purefil's
  "Thermoplastic styrene block copolymer elastomer (TPS)". The rename now closes the name-not-a-name gap it answers.
- **Findings accepted with a reason**: two melt flows near 100 g/10 min printed with no condition, a 22 Shore D
  elastomer named for it, and an unnotched Charpy of 218 kJ/m².

The record of what the batch changed is [changelog.csv](changelog.csv) and [build-diff.txt](build-diff.txt).
