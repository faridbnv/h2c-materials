# Estimates and the evidence behind them

**Date:** 2026-09-13
**Asked by:** the tool's owner, after reading how estimates behaved under D42
**Question:** estimates exist to support engineering judgement. Wrong values, super-wide ranges and
blank cells defeat that. Fill the gaps with research and a mathematical model that holds up across a
family of filaments, not one material at a time.

## What was wrong

Three questions were answered before any change, on the D42 snapshot.

| Question | Finding |
|---|---|
| Does every filament have mechanical values or estimates? | No. 27 of 96 in-scope materials had at least one headline with nothing; six (PA12, PA66, PA66-CF, PA612, PA612-GF, POM) had nothing on all five. 23 estimates covered 137 missing values |
| Does every filament have print settings? | Chamber yes, in a number, words or a band. Nozzle and bed no: seven materials had neither, and nothing estimated them |
| Do estimates show where they matter? | Partly. The filter used all 23, but in the table and Compare 19 were hidden behind a related `*` value, so a material could be screened out by an estimate the reader never saw |

And the estimates themselves failed the owner's three tests:

- **Super-wide.** PA-CF strength 38–204 MPa, TPE elongation 73–4695%, PC-GF density 1013–1339 kg/m³.
  D42 used only measurements with the headline's exact semantics, so PA-CF's own 72 MPa break strength
  counted for nothing, and a single other grade was widened by a conservative spread on both sides.
- **Unrelated across a family.** Each material was estimated alone. Nothing tied PA66-CF to PA66, or
  put PA66's heat resistance above PA12's.
- **Nothing** where a polymer had no product in the database.

Re-reading sources for the gaps found wrong recorded values as well:

| Record | Recorded | The hash-matched source says |
|---|---|---|
| 22 heat deflection values, 3DXTECH | load not stated | "Deflection Temperature at 0.45 MPa (66psi)", split across two lines |
| V001489, Spectrum HIPS | load not stated | ISO 75-2 method B, which is 0.45 MPa |
| V000605, iSANMATE ESD-ABS glass transition | 1135780 °C | "ISO 11357 80°C" |
| V000039, iSANMATE PLA strength | 3 MPa | "110,3 MPa" under ASTM D882, a thin-film test, not a printed bar |
| V000507, iSANMATE PETG-GF Vicat | 120 °C | "Vicat softening point A/120 … 72": method A/120, 72 °C |
| iSANMATE PETG-GF | "no other mechanical value is published" | tensile strength 53 MPa and flexural modulus 1986 MPa are published |
| Spectrum ASA-X GF10 | density only | tensile, modulus and HDT values, footnoted as injection moulded |
| iSANMATE PP, 3DXTECH HyperLite PP and FibreX PP+GF30 | no nozzle window | 240–260 °C recommended; 235 °C and 265 °C printed-specimen settings |

Two measured headlines are far from what every other observation predicts and are listed, not
changed: PP's density of 810 kg/m³ is 3DXTECH HyperLite, a lightweight grade, and PC-ABS's 75%
elongation is 3DXTECH's against Polymaker's 4.2%.

## Research

Every value below was read from the downloaded file, whose SHA-256 is in the Sources sheet.

| Material | Source | What it adds | Role |
|---|---|---|---|
| PETG-GF | Eryone PETG-GF TDS v1.0 | Printed X-Y density 1.33, stiffness 2.33 GPa, strength 53.6 MPa, elongation 1.9%; nozzle 250–280 °C, bed 60–70 °C | New representative grade (iSANMATE publishes no direction) |
| ASA-GF | IPCON ASA GF TDS v1.0 | Printed XY and Z tensile and flexural values; HDT 98 °C at 0.45 MPa; nozzle 265–290 °C | New representative grade (Spectrum's values are moulded) |
| ASA-GF | Flashforge ASAGF10 TDS | Printed X-Y strength and elongation; HDT 88 °C at 0.455 MPa. Its flexural labels are swapped and were not entered | Additional grade |
| POM | Grupa Azoty Tarfuse POM preliminary TDS v1.1 | Printed XY strength 50 MPa, stiffness 1.87 GPa, elongation 11%; density 1.42; nozzle 210–240, bed 100–130, chamber 70–140 °C | New representative grade (purefil publishes print settings only) |
| PA12 | Stratasys FDM Nylon 12 data sheet | On-edge and upright tensile and flexural values; HDT 94.7 °C at 66 psi; specific gravity 1.01 | The study grade G052-R1 already holds this product |
| PA66 | Zytel 101L NC010 (Celanese database print) | Moulded, dry: 3.1 GPa, 82 MPa yield, 45% break, HDT 190 °C at 0.45 MPa, Tm 262 °C | Resin reference G055-R1 |
| PA612 | DuPont Zytel product guide, 151L | Moulded: 2.4 GPa, 62 MPa yield, 100% break, HDT 135 °C, Tm 218 °C | Resin reference G058-R1 |
| POM | DuPont Delrin 100P NC010 | Moulded: 2.9 GPa, 70 MPa yield, 65% break, HDT 160 °C, Tm 178 °C | Resin reference G087-R1 |

Searches for a printed PA66, PA66-CF, unfilled PA612 or PA612-GF filament data sheet found none, as
the earlier missing-data research also concluded. Those identities are anchored by resin references
and the family model, not by invented products.

## The model

DECISIONS D43 records the design; `docs/DATA-MODEL.md` under "Estimates" explains it. In short: one
Gaussian model per headline over every observation, each converted to the headline's semantics, with
polymer, reinforcement-by-matrix and melting-point structure shared across a family; the spread
between products measured directly; the rest estimated from the data above documented floors; and
both ranges calibrated by hiding each measured headline and predicting it back.

Five designs were tried on the snapshot before this one and rejected for a reason visible in the
numbers:

| Tried | What went wrong |
|---|---|
| Family structure alone | Calibrated, but stiffness ×4 and elongation ×20 wide at 95% |
| Every related kind stacked on a product | 3DXTECH's flexural and break strengths disagree with Bambu's ratio; the spread between products fitted at 0.36 instead of the 0.16 the direct evidence shows |
| Heat deflection with a free melting-point slope | Too few unfilled nylons: the slope fitted negative and put PA66 at 15–91 °C |
| Shared reinforcement effect for all matrices | Glass fibre's large lift in nylons leaked into PETG-GF, whose estimate rose above its glass transition |
| Hard caps at Tg and Tm | Piled a range against the cap: PETG-GF read 94.7–96.9 °C |

## Result

| | D42 | Now |
|---|---:|---:|
| In-scope headlines with nothing | 114 | 0 |
| Estimates | 23 | 98 (31 good, 52 fair, 15 poor) |
| Not applicable, with a reason | 0 | 28 |
| Measured density / stiffness / strength / elongation / HDT | 88 / 69 / 52 / 70 / 64 | 89 / 72 / 55 / 73 / 65 |
| HDT headlines with a stated 0.45 MPa load | 42 of 66 | 64 of 70 |
| In-scope materials with a nozzle / bed window | 89 / 90 | 92 / 92, and 4 estimated |
| Verified headline citations | 369 | 380 |
| PA-CF strength | 38–204 MPa | 71–93 MPa likely, 66–103 plausible |

Calibration on hidden measured headlines, the figure every range rests on:

| Headline | Hidden | Likely (80%) holds | Plausible (95%) holds | Median likely width |
|---|---:|---:|---:|---:|
| Density | 84 | 81% | 95% | ×1.14 |
| Stiffness | 68 | 79% | 96% | ×1.52 |
| Strength | 52 | 81% | 96% | ×1.53 |
| Elongation | 70 | 80% | 96% | ×2.40 |
| Heat deflection | 61 | 80% | 95% | 15 °C |

The polyamides now read together. Heat resistance: PA66 106–160 °C, PA612 79–123, PA12 73–116,
PA66-CF 208–256, PA612-GF 151–199. Stiffness: PA66 1.6–2.7 GPa, PA66-CF 3.8–7.0, PA612 1.5–2.6,
PA612-GF 3.1–5.7.

## What it still cannot do

- **15 estimates are imprecise.** Most are elastomer stiffness (TPE, TPC 45D, OBC), which data sheets
  define inconsistently: Bambu reports 5–10 MPa for 85–95A TPUs and 1190 MPa for its 68D TPU for AMS.
  The rest are POM's heat deflection, which rests on resin data alone, and a few elongations.
- **PA66-CF and PA612-GF have no product at all.** Their estimates are family-only and cannot screen.
- **Estimates stay hidden in Strict**, as the owner asked, and never pass a material anywhere.
- The model is refit on every build (about two seconds). A materially different snapshot can change
  its spreads; the calibration check stops the build if that breaks the coverage it states.
