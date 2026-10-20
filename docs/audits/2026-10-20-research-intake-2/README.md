# Research intake 2 (2026-10-20)

> **Historical record** (2026-10-20): the round that took in the second external research package. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** The second research package was worked from round 1's leftovers:
> - 872 findings;
> - 1,054 page readings;
> - 220 saved files.
>
> It was researched against `53f266ec`. Main has moved 60 commits since, so every proposal was checked against the live
> record before anything entered (the package's EXECUTION-WARNINGS.md).
>
> What entered:
> - six products, admitted with their documents (batch b50), giving five materials a page of their own;
> - two products re-filed where their makers' own documents put them;
> - recipes and fibre loads the makers state;
> - ASA's chamber row, switched to deciding;
> - two prices.
>
> The new data tripped the estimate model's per-matrix calibration check. The owner ruled for D178: each matrix keeps
> its own range width where the shared one is too narrow for it. The importer was judged on the owner's request and
> left unchanged (OPEN-PROBLEMS §40.2).
>
> Implemented by Claude Opus 5.5 (agent), with Claude Sonnet agents for the blind second reads, the price search and
> the page summaries. No person reviewed it.

## What the owner decided

| Question | Answer |
|---|---|
| Switch ASA's chamber row (CN02) to deciding if the recount confirms 20 makers, 2 above 65 °C? | Yes. It was confirmed and switched in its own commit (m493) |
| The new data stops the build at EST-CALIBRATION (heat deflection, unfilled crystalline products). How should it be resolved? | A per-matrix scale (D178), with a back-test |
| Push when verified? | Yes |

Everything else was decided as an engineer in charge would, under the owner's standing rule that Claude judges filings.

## The stages

| Stage | What it changes for a reader | Where |
|---|---|---|
| 0, 1 | Nothing: the baseline, and the triage of every finding against the live tables. The package's readings were cleaned (`ingest/intake.mjs`), and every finding was given a fate (`archive/research-2026-10-20/disposition.csv`) | `baseline/`, `ingest/` |
| 2 | Batch b50 admits 18 documents and six products: Kexcelled THE K8 OBC, Filamentive Hemp PLA, QIDI PPS-GF20, Forward AM Ultrafuse PP GF30, Sakata 3D PA-NT and PA-CF15 | m488 |
| 3 | The readings (below) | m489, m491, m492 |
| 4 | Two products re-filed: Extrudr DURAPRO PC FR V0 to PC FR, and Essentium PA-CF to PA6/66-CF (its SDS names "Polyamide (PA 6/66)"). PolyTerra PLA's later name, Panchroma Matte PLA, is recorded | m490 |
| D178 | Heat deflection's product ranges take their matrix's own width where the shared one is too narrow ([back-test](BACKTEST-D178.md)) | `build/src/estimate/` |
| 5 | ASA's chamber row decides: 20 makers, 2 above 65 °C ([diff](stage-5-diff.md)) | m493 |
| 6 | Two prices: QIDI PPS-GF20 from QIDI's Canadian store (CAD), purefil PC GF10 from purefil's shop ([review](prices/review-p07.mjs)) | m494 |
| 7 | Draft summaries for the five new pages ([summaries.csv](PACKETS.md)) | `material_summaries.csv` |
| 8 | The record, OPEN-PROBLEMS §40, the review's fixes (R01 to R10), the close | m495 |

Stage 3, the readings:
- 150 values and 14 profiles. Every deciding or image-only reading was read blind a second time by three Claude Sonnet
  readers (`second/`). Six disagreements were settled on the page.
- Kexcelled's three columns typed by the bar each drawing shows: X,Y flat, X,Z on edge, Z,X upright.
- The specimen each document indicates (D172):
  - Forward AM gives its test bars' print settings;
  - QIDI's rows name X-Y;
  - Raise3D's and Polymaker's columns are "As Printed" and annealed;
  - Filamentive's D882 is a film test.
- Cells no parser reads were typed by hand, each with its Parse review:
  - LEHVOSS's German "needs no temperature-controlled build chamber";
  - Raise3D's PA12 CF printed "without the heating chamber" on its RMF 500;
  - AzureFilm's "can be printed without an enclosed printer";
  - Prusa's enclosure, read as D93 reads one;
  - Sakata's "ºC".
- Fibre loads: Eryone PLA-CF 15 %, eSUN ePLA-CF 15-20 %, MatterHackers PRO Series PA CF 20 %, and the new products' own.
- Held sheets: COC flex's nozzle window and thermal conductivity, Conductive PLA's three volume resistivities, Nanovia
  PC-PTFE's tensile strength, and Braskem FL900PP-CF's "no drying needed".
- PolyMide PA12-CF's drying "if the filament has absorbed moisture", typed as optional, and its 25-50 °C chamber.

## What the build's checks found, and what was done

- **QIDI PPS-GF20 reprints Fiberon PPS-GF20's table.**
  - Its figures match Fiberon's to the decimal, and Fiberon's sheet says those bars were annealed at 130 °C for 10 h.
  - Recorded as QIDI's own, the figures read as "not stated". They then passed as-printed questions for Fiberon,
    through the twin rule.
  - QIDI joins Fiberon's Shared formulation key, and its copies are retired as duplicates (R053, m491). It reads
    Fiberon's figures with their condition, and its own recipe stands.
  - PPS-GF's third product is this twin.
- **Raise3D's data sheet prints its PA12 CF heat deflections (131 and 105 °C) with no condition.**
  - Its white paper prints the same two figures as the 100 °C-annealed bars', beside 90 °C as printed.
  - Read as possibly as printed, the unlabelled copies made the product's as-printed heat deflection anywhere from 90 to
    131 °C.
  - They are retired beside the white paper's rows (m491).
- **EST-CALIBRATION, heat deflection, unfilled crystalline products: 63 to 67 % against 80 % claimed.**
  - None of their 27 hidden values changed. The new, well-predicted products narrowed the width scale all products
    share.
  - D178, ruled by the owner, gives each matrix its own width where it needs more. On main's tables alone it moves no
    answer ([back-test](BACKTEST-D178.md)).
- **Flagged, kept as printed:**
  - Filamentive's flexural modulus "3.8 MPa", beside its 3.5 GPa tensile modulus;
  - Forward AM's unnotched Izod on its XZ bar (2.4 kJ/m²), below its own notched value.
- **Accepted, each with its reason:**
  - physics windows the new values meet (Kexcelled's stiff OBC, Sakata's immersion water uptake, Raise3D's ductile
    as-printed nylon, Fiberlogy's 40 °C);
  - the moved Essentium's moduli;
  - tables makers reprint across materials (Sakata's PA6 tables, Filamentive's PLA resin figures);
  - AzureFilm's heat deflection outside its printed table.

## What moved

The whole round against main ([decision diff](after/DECISION-DIFF.md), 138 cases): 90 material verdicts in 8 materials.

| Material | Move | Cases | Why |
|---|---|---:|---|
| PC FR | fail → unknown | 37 | Extrudr DURAPRO PC FR V0 joins it with no value comparable for those questions (its sheet's bars are injection-moulded, raw material values), so its products no longer all fail: the three stiffness templates, density, tensile modulus and heat deflection at 120 °C |
| PP-GF | fail → unknown | 16 | Forward AM's density is the filament's (1036 kg/m³), not a printed part's, so the material is no longer known to fail a density limit |
| PP-GF | unknown → pass | 8 | Forward AM's printed XY bars, conditioned: 2.6 GPa and 41.7 MPa pass tensile modulus ≥ 2 GPa and strength ≥ 20 MPa where conditioned or as-published values are allowed |
| PA6/66-CF | fail → unknown | 12 | Essentium PA-CF joins it (density ≥ 1500, elongation ≥ 20 %) |
| Nylon-CF (undisclosed) | unknown → fail | 8 | Essentium PA-CF leaves it: every product left fails density ≥ 1500 |
| PLA-NF | fail → unknown | 6 | Filamentive Hemp PLA joins it, its tensile values on film, so not comparable |
| PA12-CF | unknown → pass | 2 | Raise3D's as-printed 34 % elongation passes ≥ 20 % |
| PC-PTFE | unknown → fail | 1 | Nanovia PC-PTFE's 38 MPa joins the other product's failure at 100 MPa |

Each template's counts under Leave out:

| Template | Change |
|---|---|
| Outdoor structural part | one fewer fail, one more unknown |
| Lightweight structure | one fewer fail, one more unknown |
| High-stiffness fixture | one fewer fail, one more unknown |
| Indoor prototype | no material moves; ASA Aero and ASA-GF products pass on ASA's chamber row |
| Warm environment | unchanged |
| Flexible component | unchanged |

Stage by stage: [stages 2 to 4](stage-2-4-diff.md) (with D178), [stage 5](stage-5-diff.md), and D178 alone on main's
tables ([d178-alone-diff.md](d178-alone-diff.md), nothing moved).

| | Before (main) | After |
|---|---:|---:|
| Products | 1,108 | 1,114 |
| Material pages | 77 | 82 (PC FR, OBC, PLA-NF, PPS-GF, PP-GF) |
| Chamber check unanswered | 210 | 210 (ASA's row fills 2; Forward AM's "-", once filled, is not since the review) |
| No nozzle / no bed / no drying | 34 / 34 / 144 | 34 / 34 / 144 |
| Fibre-filled products with their own load | 174 of 255 | 179 of 259 |
| Priced products / materials | 228 / 113 | 230 / 114 |
| Sources / measurements / profiles | 2,107 / 15,096 / 1,902 | 2,127 / 15,235 / 1,916 |

From [counts.mjs](counts.mjs) ([before](baseline/counts-before.json), [after](PACKETS.md)) and
[pages-list.mjs](pages-list.mjs) ([before](baseline/pages-before.csv), [after](after/pages-after.csv)).

Correction to a figure given to the owner: the question about ASA's chamber said about 30 products would read within.
The switch filled 2. ASA's other silent products were answered already by the printer maker's guide (D90).

## What did not enter, and why

- **The document copies (task T10).**
  - No copy hashes to a recorded digest, so no original was recovered.
  - Copies whose bytes differ are not registered (D131), and no sign-in link is repointed (OPEN-PROBLEMS §34.6, §37.12).
- **Products held:**
  - Smart Materials INNOVATEFIL PP GF: its page needs capturing;
  - INTAMSYS PPS: its exact variant is not on sale;
  - Sakata PA-GF20-FR and IIIDMAX PA6/66-CF15: stock unknown;
  - LEHVOSS 9936 BK/L and AzureFilm ABS+: their identity is not settled.
- **Readings dropped by the triage (each with its reason in `ingest/readings/r2-dropped.csv`):**
  - documents not entered;
  - figures another document of the product already holds from its data sheet;
  - a "0.0" yield for a bar that never yielded;
  - cells that print no figure;
  - the 2024 eSUN catalogue, whose drying column prints only dashes.
- **The polymer leads** (nGen AM3300's density, the BVOH SDS): polymers.csv is frozen (§38.4, §38.5).
- **Owner calls left open:**
  - the PLA-Pro merge (§31.12);
  - the High-Performance Engineering chamber row, which meets the counts against PPA's bands (§40.4);
  - nylon's "Up to 120C" (§40.4).
- **Questions for makers:** the 25 handoffs, unsent (§31.15).
- **Prices not taken:** listed in §22.
- **Every finding's fate:** in [disposition.csv](../../../archive/research-2026-10-20/disposition.csv):
  - 26 applied;
  - 17 already in the data;
  - 2 superseded;
  - 827 left with their reason.

## The importer, judged

On the owner's request the importer was judged, not changed. The judgement and six options, best first, are
OPEN-PROBLEMS §40.2.

This round paid the costs it describes:
- a per-round adapter (`ingest/intake.mjs`), a batch builder (`ingest/build-b50.mjs`) and a review script
  (`ingest/review-r2.mjs`);
- two migrations for one set of documents (m488, m489);
- source rows the builder had to be taught the new Superseded by column for.

## Checks

- Every quote is checked on its cached, hash-checked page by the migrations. Forward AM's and Fiberlogy's image-only
  pages were checked through their optical reading (`ingest:ocr-pass`).
- Every deciding or image-only reading was read blind a second time, and six disagreements were settled on the page.
- `verify:fast` passed at each commit, and `npm run verify` before the push.
- One independent review closed the round (below).

## Review

One independent review (Claude Opus, an agent) checked:
- the decision diff's surprising moves against the records;
- about 120 of the new rows against their pages, images included;
- every new profile, the hand-typed cells, the moves and retirements;
- D178's code;
- the summaries;
- the record's figures.

It found ten things. All were fixed in the round (m495, the code, the summaries and these documents) or filed:

| ID | What was wrong | Fix |
|---|---|---|
| R01 | PolyMide PA12-CF's data sheet heat deflections (105 and 131 °C) read as not stated, though its information sheet prints the 105 °C as "80 °C Annealed" and Raise3D's white paper prints the same table as annealed. PolyMide was PA12-CF's as-printed heat deflection in Warm environment | m495: the information sheet's annealed row recorded and the data sheet's copy retired; the 131 °C typed annealed, its schedule stated two ways, with its Parse review. Keying the PA12 CF trio as twins waits on §37.4 |
| R02 | Forward AM's recommended chamber prints "-", and the polyolefins' row filled it | m495: "-" typed, no set point, never filled |
| R03 | Heat deflections and reference figures whose own table points to resin or reference values were typed "do not assume printed". AzureFilm's 86 °C (a "Typical properties" table beside ISO 294) passed Warm environment for its ASA | m495: AzureFilm's, Filamentive's four and Fiberlogy's 40 °C typed "its document points to moulded or resin bars"; the context acceptance says so |
| R04 | Forward AM's flexural rows missed footnote 5 (conditioned 23 °C, 50 % RH, 72 h) | m495: conditioned |
| R05 | D178's per-matrix scale is set from the matrix's own hidden values, so the in-sample check could no longer fail for it, and D81's stop rule read only the shared scales | A matrix with its own scales is judged out of fold (each fold of materials by scales set from the others), and the clamp reads every scale; D178 and the back-test say so |
| R06 | PPS-GF's summary gave an annealed bar's figure as its heat deflection | Summary revised. The twin rule counts Fiberon's annealed table twice in PPS-GF's medians: a D89 consequence, noted for the owner in §37.4 |
| R07 | Two summary sentences went beyond their pages: PLA-NF's colour and surface (two makers, not one), and PC FR's "flammability rating" | Summaries revised |
| R08 | This record said Extrudr's PC FR bars are undescribed; they are injection-moulded. A moulded or filament density caps a printed part's, but no row says so, so PC FR and PP-GF lose a provable density fail | Corrected; the gap is OPEN-PROBLEMS §40.5 |
| R09 | Sakata's "Moisture absorption" (ISO 62) was filed as moisture content | m495: Water absorption |
| R10 | CN07's eleventh maker, QIDI, is Polymaker's statement read through the twin; Prusa's article prints a nozzle and bed the round did not record (its data sheet's profile holds them) | §40.4 says so; the article was read for its enclosure only |
