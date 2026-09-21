# Batch b30: verdicts by witness, and four small reader rules

Applied 2026-09-21 by `m117-batch-b30`: 67 documents, 685 records: 8 materials (TPU-LW, TPU-GF, PLA-NF, PETG-GR,
PA12-AF, PLA-GR, PA6/66-CF, TPU-EC), 61 grades, 67 sources, 441 measurements, 61 print profiles with 112 notes, 9
headline selections, 6 material links, 8 coverage rows added and 24 recounted. Six byte-identical copies were marked
applied with the documents they copy. The ledger now holds 1,146 applied documents.

## How the documents got here

**Identity verdicts (R089).** The owner delegated identity verdicts to the agent on one condition: a document the
maker published names the product and its polymer. A search agent looked for one for 108 products
(`BRIEF-witness-search.md`; its answer is kept as `readings/witness-search-2026-09-21.csv`, a list of pointers, not
evidence). For 40 of them the maker's page or safety data sheet was fetched and hashed as a witness row in the
ledger, and the line re-read from those bytes. Three pages no longer carried the line the search quoted, and each
ruling quotes a line the bytes do carry. With the 47 yes and 5 no verdicts already given, that wrote R099 to R164.

| Among the verdicts | Witness |
|---|---|
| Facilan C8 is PLA, not PET | 3D4Makers' SDS: "Polylactide resin … 60-70" |
| colorFabb XT, HT, XT-CF20 are the generic copolyester CPE | colorFabb: "Material: colorFabb_XT CO-POLYESTER" |
| FormFutura BioFil Wood is PCL | FormFutura: "a PCL based 3D printer filament" |
| Polymaker PolyCast is PVB, not PE | Polymaker: "PolyCast™ (PVB)" |
| BASF Ultrafuse PA and MakerBot Nylon CF are PA6/66 | BASF: "based on a copolyamide 6/66"; UltiMaker: "Nylon 6/66 Carbon Fiber" |

A name anyone could print ("wood", "flax", "pearl", "biofusion", "plx") is ruled with its maker in front. R105 is
withdrawn: colorFabb's 2015 preliminary sheet "20% milled carbon fibres" names no product, and only 3DJake's link
calls it XT-CF20.

**Reader rules**, each measured over all 1,655 cached documents before and after (an identity census, and the
parity census where values were touched):

| Rule | What it freed |
|---|---|
| R076 built: a support is filed by its chemistry, else by what it says it supports | 25 support readings; Atlas and Helios Support to PVA, Raise3D's industrial supports and PolySupport for PA12 to Support for PA/PET |
| R098: a filament lighter than its polymer is the foam or the softer grade its sheet says it is | PolyWood (three sheets), Pegasus PP, PEBA Air: lightweight additive; COC flex: declared softer grade |
| A condition between a unit and its value ("g/10min 210℃, 2.16Kg 7", "% 23 ℃,24hr 0.15"); "IS0" is ISO | Yousu's three held sheets; QIDI's PC ABS FR density |
| "PESO NETO" is a weight; LumberLay and Eco Coffee are wood-effect PLA | Filament2Print's Eco Coffee; its Flex 77A now asks only for its polymer |

m114 corrected the five Yousu melt-flow rates already recorded as their test temperatures, m115 wrote the two
foamed-grade windows this batch needed (W0109, W0110), and m116 took Yousu's revision dates out of seven grade names
("PLA 3D FILMAENT Revision Date: 18/12/2020" is PLA).

## What the review decided by hand

- **colorFabb copperFill.** The 2023 sheet is the product G001-156 records as "Copper filled PLA" from colorFabb's
  preliminary sheet, so its grade row joins that grade. Its "3D Printed" table and its HDT are new; its "Injection
  Molded*" table reprints the preliminary sheet's values and is rejected, recorded once (R053). That table also swaps
  flexural strength and modulus. NinjaTek's 2017 copy prints nothing the grade lacks and is `registered` to it.
- **Two values physics rules out, kept and flagged (D55).** PolySupport for PA12 prints a heat deflection of 43 °C
  at 0.45 MPa beside 53 °C at 1.8 MPa. Conductive Filaflex prints 50 °C at 1.82 MPa for a Shore 92A elastomer.
- **Rows rejected, the line quoted in each.** Yousu PETG's Vicat, read as 1 from "1KG". PolyCast's "Decompoaition
  temp.", read as a melting point, and its bending strength, paired with the wrong row. Koltron's heat deflection,
  whose load was read as the value.
- **Findings accepted with a reason.** Fillamentum measures its moduli at 50 mm/min, so they read low. Nylon CF15
  prints 103 % elongation beside 500 MPa. PCL melts at 58 to 60 °C. The PVA supports are brittle. COC flex is an
  elastomer. Extrudr labels its strengths inconsistently. PEBA Air's four tables are one per nozzle temperature,
  each row located in its table. PLA-NF is estimated below PLA (EST-FAMILY-ORDER).

## What waits, and on what

| Documents | Why | Next |
|---:|---|---|
| ~40 | the maker names only a family: "polyamide" (colorFabb PA ×4, CreatBot UltraPA, Essentium, Onyx, Fillamentum FX256, Stratasys CF10 and Diran), "TPE" (Nanovia, Flashforge, NinjaTek Chinchilla, eSUN TPE 83A), "polyester" (Electrifi, Istroflex) | owner: `deferred: family only`, or a verdict |
| 7 | Fiberlogy FiberFlex 30D/40D, MattFlex 40D: product pages say TPU, the SDSs name a copolyester elastomer (TPC) | owner |
| 3 | TPS (Ultrafuse TPS 90A, purefil TPS 40D ×2): R056 files them under TPE, whose only material is a family entry | owner |
| 2 | Spectrum PET-G FX120: prints the same eight values as colorFabb's nGen_FLEX (Amphora), a twin across two materials | owner |
| 5 | resin makers' sheets hosted as filament sheets (Amphora AM3300 and HT5300, XT Light Blue, FKuR Fibrolon, NatureWorks 4032D) | owner: scope |
| 5 | a polymer with no row: PEKK (Antero 800NA), PAEK (AM200), PMMA (3Diakon), SBC (Crystal Flex), PI (Zymergen Z2) | a producer reference each (R081) |
| 5 | Prusament: `reader:bracketed-units` (a unit in square brackets, "Horizontal" and "Vertical xz" columns) | reader rule, PLAN-REMAINING 1.7 |
| 4 | contested or weak: GreenTEC and GreenTEC Pro CF (Extrudr's own SDSs disagree), niceBIO, Flexfill TPE (PP + SEBS) | owner |
| 3 | supports that name no chemistry: AquaPrint, AquaSys GP, ABS-R + RapidRinse | owner |
| 1 | Ultrafuse PA: its sheet says "due to its glass reinforcement" and prints an unfilled PA6/66's numbers | owner |
| 1 | colorFabb's 2015 "20% milled carbon fibres": names no product; only a shop's link says XT-CF20 | owner |
| 1 | 3DJake's eSUN ePC: a density of 1.12 g/cm³ below polycarbonate's, and its sheet says neither foam nor softer grade | owner |
