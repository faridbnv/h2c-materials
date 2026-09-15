# Workstream D: the five open items of the transfer verification

Baseline `ef26807` (branch data/csv-source), built `dist/db.json` of 2026-09-15. Every source value quoted below was
re-read from the cached PDF in `.cache/sources/`, hash-checked against `sources.csv` (all 131 cached PDFs match) with
`extract-text.mjs` in this folder (the pdfjs approach of `scripts/audit/source-completeness.mjs`). Row-level re-reads
are in `rereads.csv`; findings in `findings.csv`. No data, build or app file was changed.

## 1. Annealed versus as-printed HDT

Scan: every `HDT` row in `measurements.csv`, grouped by grade, with Post-processing, Specimen / print parameters and
Notes searched for annealing wording. Three grades hold HDT values in more than one post-processing state.

| Grade (material) | MeasurementID | Load MPa | Value °C | State as printed in the source (page, quote) | Recorded Post-processing | Verdict |
|---|---|---|---|---|---|---|
| G019-01 Polymaker HT-PLA-GF (M019 PLA-GF) | V000349 | 1.8 | 59.7 | p3 "ISO 75 1.8MPa 59.7°C (as printed)" | Not published | value right, state missing (D-02; lead relabelling in m19) |
| | V000350 | 0.45 | 75.5 | p3 "ISO 75 0.45MPa 75.5°C (as printed)" | Not published | value right, state missing (D-02; m19); **headline** |
| | V000352 | 1.8 | 84 | p3 "ISO 75 1.8MPa 84°C (annealed)" | Annealed (per TDS annealed block) | correct |
| | V000353 | 0.45 | 114.7 | p3 "ISO 75 0.45MPa 114.7°C (annealed)" | Annealed | correct |
| G068-02 Fiberon PET-GF15 (M068 PET-GF) | V001930 | 1.8 | 71.8 | p1 "ISO 75 1.8MPa 71.8 (as printed)" | As printed | correct |
| | V001931 | 0.45 | 81.6 | p1 "ISO 75 0.45MPa 81.6 (as printed)" | As printed | correct; **headline** |
| | V001932 | 1.8 | 87.3 | p1 "ISO 75 1.8MPa 87.3°C (annealed)" | Annealed (schedule not stated beside the HDT row) | correct; the sheet's schedule is 120 °C/16 h (mechanical footnote, print settings) |
| | V001933 | 0.45 | 133.7 | p1 "ISO 75 0.45MPa 133.7°C (annealed)" | Annealed | correct |
| G074-02 Fiberon PPS-GF20 (M074 PPS-GF) | V001392 | 1.8 | 125.8 | p1 "Heat deflection temp. ISO 75 1.8MPa 125.8 °C"; "*The HDT test specimens were annealed by 130°C." | annealed at 130 °C | correct |
| | V002071 | 0.45 | 236.3 | p1 "ISO 75 0.45MPa 236.3 °C" (same footnote) | annealed at 130 °C | correct |
| | V002072 | 0.45 | 248.9 | p1 "If the annealing temperature is increased to 230°C, the HDT (0.45MPa/1.8MPa) is increased to 248.9°C/219.6°C." | annealed at 230 °C | correct |
| | V002073 | 1.8 | 219.6 | same sentence | annealed at 230 °C | correct |

Related rows checked: G074-01 IPCON PPS-GF V001378 241 °C at 0.45 MPa (S-PPSGF-TDS-0 p1, no preparation stated; M074's
headline); I-ESD-ABS-TDS V002188/V002189 "(After Annealing)" with Method A/B paired to the wrong loads (source error,
quarantine is right); I-PPSU-TDS V001674 "Unannealed" held only in Standard / load; I-PEI-9085-TDS V001735-37 unannealed,
one state; R-STRATASYS-FDM-NYLON12-MDS as printed, one state. Bambu sheets' "annealed and dried at 50-80 °C for 8-12 h
before testing" is a drying/conditioning step and applies to every row of those sheets (one state per grade), but it is
recorded inconsistently (D-03).

**How the build uses them.**

- Headline `hdt045`: all three materials cite the as-printed or unstated value (`headlines.csv`: M019 -> V000350 75.5,
  M068 -> V001931 81.6, M074 -> V001378 241). The compiled headline object carries no post-processing field, so the
  drawer cannot say "as printed"; the value chosen is right.
- Estimate model: `rawObservations` groups observations by material | formulation | kind and averages them; `kindOf`
  never reads post-processing. The six groups below are therefore averages of two states, and every one is caught by the
  conflict check (`meta.estimateModel.conflicts`), which inflates their noise 25-fold, i.e. the formulation's own HDT
  evidence is effectively discarded:

| Material | Kind | Values averaged | Mean used |
|---|---|---|---|
| M019 PLA-GF | HDT 0.45 | 75.5 (as printed), 114.7 (annealed) | 95.1 |
| M019 PLA-GF | HDT 1.8 amorphous | 59.7, 84 | 71.9 |
| M068 PET-GF | HDT 0.45 | 81.6, 133.7 | 107.7 |
| M068 PET-GF | HDT 1.8 semi-filled | 71.8, 87.3 | 79.6 |
| M074 PPS-GF (G074-02) | HDT 0.45 | 236.3 (130 °C anneal), 248.9 (230 °C anneal) | 242.6 |
| M074 PPS-GF (G074-02) | HDT 1.8 semi-filled | 125.8 (130 °C), 219.6 (230 °C) | 172.7 |

- Load-bracket back-test: the averaged pairs enter `bracketScreening` too. G074-02's cross-state gap (242.6 - 172.7 = 69.9 °C
  against a semi-filled offset of 26.4 ± 6.4) is one of the two high misses that keep the semi-filled bracket uncertified
  (the other is S-FIBER-PA612, 175 - 114 = 61 °C, one state). Paired within a state the gaps are 110.5 (130 °C) and 29.3
  (230 °C); PET-GF15 9.8 (as printed) and 46.4 (annealed); HT-PLA-GF 15.8 and 30.7. M019 is classed amorphous, where the
  1.8 -> 0.45 conversion is 5.2 ± 3.6 °C: annealed PLA-GF behaves as a semicrystalline matrix.

Recommendation (D-01): derive a post-processing state (as printed / crystallising anneal / drying-conditioning / not stated)
and key the model's kinds on it, with the as-printed state as the `hdt045` semantics; fix the state on V000349/V000350
first (D-02) and normalise the Bambu wording (D-03).

## 2. "Izod strength" and "Izod impact strength"

Both are registered in `properties.csv` with units "kJ/m²; J/m" and no description; neither feeds a headline or the
estimate model. The only code that reads them is `validate.js` IMPACT-UNITS, a warning that J/m and kJ/m² rows coexist.
All 21 "Izod strength" rows and 12 of the 13 "Izod impact strength" rows were re-read (R-ESUN-PLA-LITE-PAGE is a web page,
not cached). Every re-read row is a pendulum Izod test: ISO 180 (or its Chinese equivalent GB/T 1843) reported in kJ/m²,
or ASTM D256 reported in J/m. The two names are the same test; the property name tells nothing about notch or unit.

| MeasurementID | Property | Source, page | Source text (abridged) | Standard | Notch | Unit | Value | Check |
|---|---|---|---|---|---|---|---|---|
| V000418 | Izod strength | I-PETG-TDS p1 | "4.5 kJ/m2 Notched Izod Impact Strength 23 ºC, 50 % RH ISO 180" | ISO 180 | Notched | kJ/m² | 4.5 | correct |
| V000419 | Izod strength | I-PETG-TDS p2 | "Unnotched Izod Impact Strength ... ISO 180 No Break" | ISO 180 | Unnotched | qualitative | NB | correct |
| V000762 | Izod strength | I-TPU-TDS p1 | "19.1kJ/m2 Izod Impact Strength, notched (at 23 C) ASTM D256" | ASTM D256 (recorded Not published) | Notched | kJ/m² | 19.1 | standard missing (D-04); D256 in kJ/m² is unusual |
| V000763 | Izod strength | I-TPU-TDS p1 | "Izod Impact Strength, unnotched (at 23 C) - -" | - | - | - | Not published | correct |
| V001486 | Izod strength | S-SPECTRUM hipsx p1 | "Notched Izod Impact 90J/m D 256" | ASTM D256 | Notched | J/m | 90 | correct |
| V001529 | Izod strength | X-MAXG-PCTG-TDS-v1-0 p1 | "Izod Impact Stregth ISO 180/A kJ/M2 8" | ISO 180/A | recorded Not published; /A is the notched type | kJ/m² | 8 | notch derivable (D-04) |
| V001540 | Izod strength | S-SPECTRUM pctg p1 | "Izod Impact Strength Notched @ 23°C 93°C KJ/m2 ISO 180" | ISO 180 | Notched | °C and kJ/m² | 93 | source error; quarantined |
| V001576 | Izod strength | S-SPECTRUM pc-abs-fr-v0 p1 | "Notched Izod Impact Strength (23°C) 35 kJ/m2 ISO 180/4A" | ISO 180 | Notched | kJ/m² | 35 | correct |
| V001673 | Izod strength | I-PPSU-TDS p1 | "Notched Izod Impact ASTM D256 3.18 mm 690 J/m" | ASTM D256 | Notched | J/m | 690 | correct |
| V001729-31 | Izod strength | I-PEI-9085-TDS p1 | "Izod Impact, notched, 23 °C 104 / 100 / 33 ASTM D256 XY / XZ / ZX J/m" | ASTM D256 | Notched | J/m | 104, 100, 33 | correct |
| V001732-34 | Izod strength | I-PEI-9085-TDS p2 | "Izod Impact, un-notched, 23 °C 763 / 1003 / 131 ... J/m" | ASTM D256 | Unnotched | J/m | 763, 1003, 131 | correct |
| V001745 | Izod strength | I-PEEK-TDS p1 | "Izod Impact Strength Notched, 23 °C 6 kJ/m2 180/A" | ISO 180/A | Notched | kJ/m² | 6 | correct |
| V002055 | Izod strength | I-PP-TDS p1 | "Notched Izod Impact Strength KJ/m2 ISO 179 NB" | ISO 179 (Charpy) printed | Notched | qualitative | NB | source error, already noted in row |
| V002084 | Izod strength | S-SPECTRUM pc-cf p1 | "Izod Impact Strength, Notched @ 23°C 70 kg∙cm/cm D 256" | ASTM D256 | Notched | kg·cm/cm -> J/m | 686.5 | correct (x 9.80665) |
| V002167 | Izod strength | S-PEBA-PEBA90A-TDS-en **p2** | "IZOD Impact Strength (XY-axis) GB/T 1843 NB" | GB/T 1843 | not printed | qualitative | NB | locator says p. 1 (D-04) |
| V002207 | Izod strength | R-FLASHFORGE-ASA-GF10-TDS p1 | "Izod Impact Strength (X-Y) 6.3~6.9 ISO 180 KJ/m2" | ISO 180 | not printed | kJ/m² | 6.3-6.9 | Direction recorded Not applicable, source X-Y (D-04) |
| V002208 | Izod strength | same | "Izod Impact Strength (X-Z) 2.5~3.2" | ISO 180 | not printed | kJ/m² | 2.5-3.2 | correct (direction withheld on purpose) |
| V001856-58 | Izod impact strength | R-BASF-PCGF30-TDS p3 | "Impact Strength Izod (notched) ISO 180 5.6 / 5.4 / 2.1 kJ/m2" (XY / XZ / ZX) | ISO 180 | Notched | kJ/m² | 5.6, 5.4, 2.1 | correct |
| V001859-61 | Izod impact strength | R-BASF-PCGF30-TDS p3 | "Impact Strength Izod (unnotched) ISO 180 13.9 / 17.8 / 3.4 kJ/m2" | ISO 180 | Unnotched | kJ/m² | 13.9, 17.8, 3.4 | correct |
| V001877-79 | Izod impact strength | R-ESSENTIUM-PPSCF-TDS p1 | "Izod Impact Strength, Notched kJ/m2 ISO 180 3.0 (0.7) 2.6 (0.6) 2.2 (0.8)" (XY 45/45 ZX) | ISO 180 | Notched | kJ/m² | 3.0, 2.6, 2.2 | correct |
| V001911-12 | Izod impact strength | R-ESUN-PLA-LITE-PAGE | web page, not cached; not re-read | Not published | Not published | kJ/m² | 4.53, 2.33 | not re-read |
| V001953 | Izod impact strength | R-FILLAMENTUM-CPE-HG100-TDS p1 | "Izod impact strength no break ASTM D256 23 °C, notched" | ASTM D256 | Notched | qualitative | NB | correct |
| V001963 | Izod impact strength | R-COLORFABB-NGEN-TDS-V2 p1 | "Mechanical Properties – Injection Molded * ... Izod Notch, ASTM D256 70 J/m" | ASTM D256 | Notched | J/m | 70 | correct (Raw material value) |

Unit mixing. Numeric J/m rows: Izod strength V001486, V001673, V001729-34, V002084 (9); Izod impact strength V001963
(1). Numeric kJ/m² rows: Izod strength 7 (V000418, V000762, V001529, V001576, V001745, V002207, V002208),
Izod impact strength 11. The unit follows the standard (ISO 180 / GB/T 1843 -> kJ/m²; ASTM D256 -> J/m) except I-TPU-TDS
(ASTM D256 in kJ/m²). J/m cannot be converted to kJ/m² without the specimen thickness (only I-PPSU-TDS prints it, 3.18 mm),
which `validate.js` already respects. Notch mixes too: 6 unnotched numeric rows (V001732-34, V001859-61), 5 numeric rows with notch not stated (V001529, V001911-12, V002207-08).

Recommendation (D-06): merge to one property "Izod impact strength" through a "replaced by" record (the no-deletion
guard), make Notch a required discriminator (Notched / Unnotched / Not published) and never pool J/m with kJ/m², i.e.
treat the standard family (ISO 180 vs ASTM D256) as part of the comparison key; fix the metadata of D-04 in the same
migration.

## 3. Uncertified screening classes

**Current state** (`dist/db.json` `meta.estimateModel`, rule `certifyScreening` in `build/src/estimates.js`, config
`estimate-model.json` screening: minHeldCases 20, maxOneSidedMiss 2.5%, one-sided binomial test at 5%). With p = 2.5%
the misses allowed per side are 2 for 20-34 held cases and 3 for 35-50.

| Class | Held cases | Misses above / below | Certified | Why |
|---|---|---|---|---|
| tensileStrengthXY, this-material | 10 | 0 / 0 | no | only 10 held cases (20 needed) |
| hdt045, this-material | 18 | 1 / 1 | no | only 18 held cases (20 needed) |
| HDT load bracket, semi-filled | 12 | 2 / 0 | no | only 12 (and pHigh 0.035) |
| HDT load bracket, semi-unfilled | 3 | 0 / 0 | no | only 3 |
| HDT load bracket, elastomer | 1 | 0 / 0 | no | only 1 |
| (for reference) density this-grade | 0 | - | no | only 0 |

All other classes are certified. I reproduced every count above independently from `dist/db.json` with the build's own
`kindOf` (script in the scratch folder), so the case lists below are the ones the build uses.

**What a case is.**

- *this-material* (per property): a pooled material whose headline is measured on its representative formulation
  (for `hdt045`, at a stated 0.45 MPa) **and** that has at least one usable observation of a related kind on a
  *different formulation of the same material* (another active grade). For strength the related kinds are any tensile
  strength endpoint or flexural strength, any direction; for HDT they are HDT at any load, Vicat (not elastomers), Tg
  (amorphous only), Tm (semi-filled only). The back-test hides the whole headline grade and predicts from the other grade.
- *load bracket* (per matrix class): one formulation publishing HDT at both 0.45 and 1.8 MPa; it holds when the 0.45 MPa
  value is at most 1.8-value + offset + 1.96 sd of that class's conversion (semi-filled 26.4 ± 6.43 °C, i.e. +39 °C).

Current this-material cases. Strength (10): M019, M025, M034, M038, M050, M051, M057, M073, M074, M087. HDT (18): M001,
M020, M026, M029, M030, M034, M037, M050, M051, M053, M057, M072, M073, M074, M081, M082, M088, M094. Bracket semi-filled
(12): B-paht-cf, B-pa6-cf, B-pa6-gf, PolyMide PA6-GF, PolyMide PA12-CF, Spectrum PA12-CF15, S-FIBER-PA612 (gap 61, miss),
B-pet-cf, Fiberon PET-GF15 (states averaged, D-01), B-ppa-cf, B-pps-cf, Fiberon PPS-GF20 (gap 69.9 across two anneals, miss).

**What would certify each.**

| Class | Additional cases needed | Kind of measurement that adds one | Note |
|---|---|---|---|
| strength, this-material | at least 10, with at most 2 misses per side overall | a second grade (different product) of a material whose headline strength is measured, with a published tensile or flexural strength | 43 materials have a measured headline and no second-formulation strength; most are single-grade |
| HDT, this-material | 2, with no new miss | a second grade with HDT (any load), Vicat, Tg (amorphous) or Tm (semi-filled) for a material whose 0.45 MPa headline is measured | smallest gap of all; 43 candidate materials |
| bracket, semi-filled | at least 8, with no new miss above (n 20-34 allows 2) | a filled semicrystalline formulation publishing HDT at 0.45 and 1.8 MPa in one state | new pairs also refine the conversion (median/MAD), so the class may widen rather than certify; the candidates found have gaps of 42.5 and 53 °C, above today's +39 °C |
| bracket, semi-unfilled | at least 17 | an unfilled semicrystalline formulation with both loads | few filament sheets publish both; the six unfilled formulations in the data that print only 0.45 MPa (AmideX PA6 copolymer, 3DXSTAT ESD PA12, S-PPA, ThermaX PPS, HyperLite PP, FluorX PVDF) do not print 1.8 MPa |
| bracket, elastomer | at least 19 | an elastomer formulation with both loads | not realistic: elastomer sheets rarely publish HDT; certify never, or drop the class |

**Current effect.** `this-material` estimates screen only where the certified family range fails too: strength for M039
TPU, M052 PA12, M055 PA66, M058 PA612; HDT for M039, M052, M055, M058, M087 POM, M090 CPE-CF. The uncertified brackets
apply to nothing today: the only unstated-load `hdt045` headline in the pool is M004 PLA Lite (amorphous, certified).
Certifying the semicrystalline brackets therefore changes no current screen; it matters only for future data.

**Candidate public sources** (fetched 2026-09-15 into the scratch folder, text read, not added to the data). SHA-256
prefixes given so a later import can confirm the same file.

| Material (current grade) | Candidate source | URL | What it publishes (quoted) | Adds |
|---|---|---|---|---|
| M027 ABS (Bambu) | Polymaker PolyLite ABS TDS V5.3 (sha 3471ec2c…) | https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyLite_ABS_TDS_V5.3.pdf | p3 "Heat deflection temperature ISO 75 1.8MPa 98.2 °C", "0.45MPa 99.6 °C", "Glass transition temperature DSC 101.1 °C"; p4 "Bending strength (X-Y) 56.2 ± 0.3 MPa" | HDT and strength this-material; amorphous bracket |
| M031 ASA (Bambu) | Polymaker PolyLite ASA TDS V5.3 (f51a4df9…) | https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyLite_ASA_TDS_V5.3.pdf | p3 HDT 1.8MPa 100.2 °C, 0.45MPa 102.6 °C, Tg 97.8 °C; p4 "Bending strength (X-Y) 60.9 ± 0.9 MPa" | HDT, strength |
| M035 PC (Bambu) | Polymaker PolyLite PC TDS V5.3 (89097c63…) | https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyLite_PC_TDS_V5.3.pdf | p3 HDT 1.8MPa 106.6 °C, 0.45MPa 111.2 °C, Tg 113.4 °C; p4 "Bending strength (X-Y) 106.1 ± 1.6 MPa" | HDT, strength |
| M035 PC (alternative) | Polymaker PolyMax PC TDS V5.3 (8f62ebe0…) | https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyMax_PC_TDS_V5.3.pdf | p3 HDT 1.8MPa 99.3 °C, 0.45MPa 114.1 °C, Tg 113 °C; p4 bending strength (X-Y) 81.29 ± 1.53 MPa | as above; its 14.8 °C gap would be an amorphous bracket miss (limit ≈ 12.3 °C) |
| M036 PC FR (Bambu) | Polymaker PolyMax PC-FR TDS V5.1 (2a0902b5…) | https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyMax_PC_FR_TDS_V5.1.pdf | p3 HDT 1.8MPa 107 °C, 0.45MPa 110 °C, Tg 115 °C; p4 "Bending strength (X-Y) 96.6 ± 1.3 MPa" | HDT, strength |
| M067 PET-CF (Bambu) | Polymaker Fiberon PET-CF17 TDS V1.0 (640a5ed4…) | https://polymaker.com/wp-content/uploads/lana-downloads/TDS_FIBERON-PET-CF17_V1.0_EN.pdf | p1 "Heat deflection temp. ISO 75 1.8MPa 105 °C", "0.45MPa 147.5 °C", Tm 241.3 °C, "Tensile strength (X-Y) 65.9 ± 1.0 MPa" | HDT, strength, semi-filled bracket (gap 42.5, likely a miss) |
| M024 PETG-CF (Bambu) | Polymaker Fiberon PETG-rCF08 TDS (39068040…) | https://polymaker.com/wp-content/uploads/lana-downloads/TDS_FIBERON-PETG-rCF08_V1.0_EN.pdf | p1 HDT 1.8MPa 65.7 °C, 0.45MPa 68.6 °C, Tg 69.7 °C, "Tensile strength (X-Y) 59.8 ± 0.3 MPa" | HDT, strength, amorphous bracket (recycled fibre: consider Variant) |
| M048 PAHT-CF (Bambu) | BASF/Forward AM Ultrafuse PAHT CF15 TDS v3.5 (29bce0ad…) | https://forward-am.com/wp-content/uploads/2024/10/Ultrafuse_PAHT_CF15_TDS_EN_v3.5-1.pdf | p3 "HDT at 1.8 MPa (dry) 92 °C", "HDT at 0.45 MPa (dry) 145 °C" (and conditioned 91 / 128 °C); p4 "Tensile strength ISO 527 103.2 MPa ... 18.2 MPa", flexural 160.7 / 171.8 / 50.8 MPa | HDT, strength, semi-filled bracket (dry gap 53, likely a miss); check whether p3 bars are printed |
| M053 PA12-CF or M050 PA6-CF | Stratasys FDM Nylon-CF10 MDS 0724a (ccf8e468…) | https://www.stratasys.com/contentassets/c96fea7533204a7bbfa25e9ee19f9eb6/mds_fdm_nylon-cf10_0724a.pdf | p4 "HDT @ 66 psi 58 °C / 77 °C", "HDT @ 264 psi 52 °C / 62 °C" (two orientations), moulded 109 / 105 °C | semi-filled bracket; base is "a blended nylon", so identity must be decided first |
| M068 PET-GF (G068-01 Flashforge, already a grade) | D-FLASH-PETGF product page (cited) | https://www.flashforge.com/products/pet-gf | not re-read here; G068-01 has no HDT or strength rows | one case for each property if the page publishes them |
| M019 PLA-GF (G019-02 iSANMATE, already a grade) | I-PLA-Glass-Fiber-Technical-Data-Sheet (cached) | https://www.isanmate.com/wp-content/uploads/2025/08/PLA-Glass-Fiber-Technical-Data-Sheet.pdf | "Tensile Streng MPa ISO 46-56" untranscribed (D-05); no thermal row | already a strength case; no HDT case possible |

Also found but not usable: Polymaker Fiberon PA6-CF20 / PA6-GF25 / PA12-CF10 PDFs return HTTP 403 from the CDN (the
library pages exist at polymaker.com/library-upload/...); Stratasys Nylon 6 sheet 1117a prints HDT only at 264 psi
(93 °C); Stratasys Antero 800NA (PEKK) MDS returned HTTP 500 and PEKK has no model identity.

With the six rows ABS, ASA, PC, PET-CF, PETG-CF, PAHT-CF, HDT this-material would reach 24 cases, enough to
certify if no more than one new miss per side appears; strength would reach 16, so four more second-grade sources are
still needed (PC FR above, PET-GF via G068-01, and two of PLA-CF, ASA-CF, ABS-GF, PPA-CF, PPA-GF, PA612-CF, CoPE, PC-PBT).

## 4. HyperLite PP: its own material or PP's representative variant?

**What the product is.** 3DXTECH HyperLite PP. Its TDS (X-Hyperlite-PP-TDS-v1, Rev 1.0, hash-ok) gives printed XY-flat
values only; the manufacturer's description (R-TRINITY3DS-HYPERLITE-PP, re-fetched 2026-09-15) says: "HyperLite™ PP HGB1
is made using a specialty formulated polypropylene ... with a specialty additive which enables ultra low density",
"0.75g/cc", a 500 g reel holding "the same amount of filament that would typically be found on a 750g reel of ABS", for
"light-weight parts for medical, drones, watercraft, automotive". The additive is not disclosed.

**How it is modelled now.** M082 PP (Family Polyolefins, Base polymer PP, Modifier "Unfilled / unspecified", H2C status
Theoretical) has two grades: G082-01 HyperLite PP (representative, Variant "lightweight additive") and G082-02 iSANMATE
PP. Every measured PP headline comes from HyperLite, and the compiled reinforcement facet says `unfilled`. The variant
covariate (D53, `gradeVariants` spread 4) keeps HyperLite's offset out of the family model. PLA Aero (M017) and ASA Aero
(M032) are instead their own materials: one Bambu grade each, same Family and Base polymer as their parent, Modifier
"Foaming" (facet `foaming`), Full name "Lightweight / Foaming ...", Variant "Not applicable".

**The two PP grades side by side** (all re-read from the cached PDFs).

| Property | HyperLite PP (G082-01) | iSANMATE PP (G082-02) | Compiled M082 headline |
|---|---|---|---|
| Density | TDS p1 "Density ISO 1183 g/cc 0.81" (V001490); description 0.75 g/cc (V002052) | "Density g/cm3 ISO1183 O.89" (V002053) | 810 kg/m³ (V001490) |
| Tensile strength | "Tensile Strength, Break ISO 527 MPa 38" (V001491) | "Tensile Strength MPa ISO 527 13.9" (V002054) | estimate 34.1-46.8 MPa (this-grade) |
| Tensile modulus | "Tensile Modulus ISO 527 MPa 1650" (V001492) | not published | 1.65 GPa |
| Elongation at break | "Tensile Elongation, Break ISO 527 % 13" (V001493) | "Elongation At Break % ISO527 460" | 13 % |
| Flexural strength / modulus | 41 / 1532 MPa | 13.9 / 390 MPa | - |
| HDT | "Deflection Temperature at 0.45 MPa (66psi) ISO 75 °C 94" (V001496) | "Heat Deflection Temperature ℃ ISO 75 92", load not printed | 94 °C at 0.45 MPa |
| Specimens | printed, XY flat, 100% infill, 235 °C | not stated | |

**For a separate material.**

1. It is not polypropylene as a selector user understands it. Its density (0.75-0.81 g/cc) is below any unfilled PP
   (iSANMATE 0.89); it is 4x stiffer in flexure than the other PP grade (1532 vs 390 MPa) and breaks at 13 % against 460 %.
   These are the signature of a rigid additive, not of a PP grade spread.
2. The PP row misleads today. A user comparing families sees "PP: 810 kg/m³, 1.65 GPa, 13 % elongation, unfilled" and
   would conclude PP is light, stiff and brittle; the facet `unfilled` contradicts the grade's own Composition note
   ("A lightweight variant, not unfilled PP").
3. Precedent: the database already splits lightweight products (PLA Aero, ASA Aero) into their own materials with a
   modifier, although their mechanism (foaming) differs; `grade-variants.csv` already describes "lightweight additive"
   as hollow microspheres or a foaming agent, i.e. the same class.
4. The variant covariate protects the estimate model but not the headline, the facets or the family comparison.

**Against.**

1. PP would lose its only complete, printed, direction-stated data. The remaining iSANMATE sheet is thin and partly
   doubtful: tensile and flexural strength both printed 13.9 MPa, HDT without a load, and an "Izod" row citing ISO 179
   (V002055, source error). Its HDT 92 °C would become PP's `hdt045` headline with an unstated load, so the
   **uncertified semi-unfilled load bracket (item 3, 3 held cases) would start to govern a real material**: PP could not
   be screened on heat resistance except where the family model agrees.
2. D53 already records the owner's current position: a headline is a single-grade observation, so a variant may
   represent its material.
3. A new material needs a Modifier value (a "Lightweight additive" row in `schema/vocab/modifiers.csv` plus the facet
   mapping in `build/src/compile.js:493`, which today knows only Foaming), `coverage.csv` rows, headline selections and
   `material_links.csv` citations; the undisclosed additive leaves the identity (glass bubbles vs foaming) unknown.

**Recommendation.** Split it, as "PP Lightweight" (or "HyperLite PP"), Family Polyolefins, Base polymer PP, a new Modifier
"Lightweight additive", moving HyperLite to it (whether G082-01 can change MaterialID under the no-deletion guard, or must be retired
and re-created under a new grade ID with its measurements, is for the migration author to settle). Keep M082 PP on G082-02, and accept that PP's HDT becomes an unstated-load value until a second PP source
with a stated load is added (the HyperLite TDS itself shows printed PP-based filament reaching 94 °C at 0.45 MPa). If the
owner prefers not to split, the minimum fix is to stop the facet saying `unfilled` for a material whose representative
grade declares a lightweight additive (D-10). This is an owner scope decision.

## 5. Kimya PEBA-S (R-KIMYA-PEBA-S-TDS)

**Record.** `sources.csv`: URL `https://www.samaro.fr/app/uploads/2026/04/ba38...3287_Kimya_PEBA_S_3D_Filament_EN-1.pdf`,
Revision "Updated 2025-12-22", Access date 2026-09-13, Access status "Indexed content retrieved; direct PDF blocked by
site", **SHA256 "Not recorded"**. The transfer report's phrase "its recorded hash is the only copy" is therefore wrong:
no hash was ever recorded and no copy was ever cached; the 13 values (V001887-V001899, G045-03) rest on indexed text.
The recorded URL still returns HTTP 404 (re-tried 2026-09-15).

**Live copy found.** Samaro's product page (`https://www.samaro.fr/en/product/airtech-kimya-3d-filaments-peba-s/`) now links
`https://www.samaro.fr/app/uploads/2026/09/ba38ba38d87e28552202938c4c1cc670d8ef6fea3287_Kimya_PEBA_S_3D_Filament_EN.pdf`
(same hash-named stem, 2026/09 folder, no "-1"): HTTP 200, 69 945 bytes, 1 page, Airtech Europe "Fiche Technique",
"Dernière mise à jour : 2025-12-22", i.e. the recorded revision. SHA-256
`66c7b5b1e19bf57ba52811611ef420b1d4d409ad9e043b389b164e45da1c9ce3`. There is no recorded hash to compare, so the text was
compared value by value. A copy is kept at `.cache/sources/R-KIMYA-PEBA-S-TDS.2025-12-22-samaro.pdf` (gitignored; named so
`audit:sources` does not pick it up).

| MeasurementID | Property | Recorded (raw; standard) | 2025-12-22 Airtech sheet, p1 | Match |
|---|---|---|---|---|
| V001887 | Density | 1.013 g/cm³; ISO 1183-1 | "Density 1.013 g/cm³ (0.036 lb/in³) ISO 1183-1" | yes |
| V001888 | Moisture content | <1%; ISO 6711 | "Moisture Rate < 1 % ISO-6711" | yes |
| V001889 | Melt mass-flow rate | 13.6 g/10 min; ISO 1133-1; 190 °C, 2.16 kg | "Melt flow index (MFI) 13.6 g/10 min ISO 1133-1(@190°C-2.16kg)" | yes |
| V001890 | Melting temperature | 149 °C; ISO 11357-1 DSC, 10 °C/min | "Melting Temperature (Tm) 149°C (300°F) ISO 11357-1 DSC (10°C/min- -90-190°C)" | yes |
| V001891 | Tensile modulus | 63 MPa; ISO 37/2/500 | "Tensile Modulus 63 MPa (9.1 ksi) ISO 37/2/500" | yes |
| V001892 | Tensile strength (endpoint unspecified) | 32.8 MPa | "Tensile Strength 32.8 MPa (4.76 ksi) ISO 37/2/500" | yes |
| V001893 | Tensile strain at strength | >550% | "Tensile Strain at Strength > 550 %" | yes |
| V001894 | Tensile break strength | 32.3 MPa | "Tensile Stress at Break 32.3 MPa (4.68 ksi)" | yes |
| V001895 | Elongation at break | >550% | "Tensile Strain at Break (type A) > 550 %" | yes |
| V001896 | Flexural modulus | 70 MPa; ISO 178 | "Flexural Modulus 70 MPa (10 ksi) ISO 178" | yes |
| V001897 | Flexural stress at conventional deflection | 2.4 MPa; ISO 178; 3.5% strain | "Flexural Stress at Conventional Deflection (3.5% Strain)* 2.4 MPa (0.35 ksi) ISO 178" | yes |
| V001898 | Hardness | 93 Shore A; ISO 868 | "Shore Hardness 93 A ISO 868" | yes |
| V001899 | Charpy strength | No break; ISO 179-1/1eA | "Charpy Impact Resistance No Break ISO 179-1/1eA" | yes |

All 13 values, units, operators and standards match. One condition does not: every mechanical row records Direction
"Not published" and Specimen type "Not published (do not assume printed)", while the sheet prints "PROCESSING: Printing
Direction XY, Printing Speed 44 mm/s" and every earlier Armor/Kimya edition states the specimens were printed:
"PRINT PARAMETERS AND SPECIMENS DIMENSIONS ... PRINTING DIRECTION XY ... PRINTED SPECIMENS PROPERTIES" (3dee.at copy,
revised 16/06/2022; hubspot copy with specimen type ISO 527-5A, 45x45x4 / 75x12.5x2 / 80x10x4 mm). With Direction XY
the model would read V001891/V001892 as `tensile XY` / `ultimate XY` instead of `unk` (D-07).

Other copies located (all older Armor editions, none is the recorded revision; hashes in the scratch folder only):

| Copy | Revision printed | MFI condition | Notes |
|---|---|---|---|
| https://www.farnell.com/datasheets/3227597.pdf | not printed | @220 °C, 10 kg | strains printed "<550 %" (source error) |
| https://docs.rs-online.com/26ca/A700000009257860.pdf | revised 17/01/2022 | @220 °C, 10 kg | strains printed "0 %" (source error) |
| https://3dee.at/wp-content/uploads/2023/05/kimya-peba-s-filament-tds.pdf | revised 16/06/2022 | @220 °C, 10 kg | values as recorded |
| https://www.dim3nsions.ch/files/Kimya/kimya_fiche_PEBA-S_en_GB.pdf | revised 24/07/2020 | @220 °C, 10 kg | "32,8" decimal comma |
| https://f.hubspotusercontent20.net/hubfs/7196278/Datasheets/Kimya/Kimya_PEBA-S_Technical_Data_Sheet.pdf | not printed | @220 °C, 10 kg | specimen dimensions printed |
| Wayback 20240630042846 of https://www.kimya.fr/pdf/kimya-peba-s-3d-filament-pebax_en.pdf | revised 16/06/2022 | @190 °C, 2.16 kg | as recorded |
| Wayback 20250110112412 of kimya.fr .../kimya_TDS_PEBA-S_de_DE.pdf | German edition | @220 °C, 10 kg | |

The MFI condition differs between editions (220 °C/10 kg vs 190 °C/2.16 kg for the same 13.6 g/10 min); the recorded
row follows the cited 2025 edition, so it is correct for its source. kimya.fr itself resets connections from here.

Suggested source-record update (owner action, not made): URL to the 2026/09 path, Access date 2026-09-15, Access status
Retrieved, SHA256 `66c7b5b1…9ce3`; Direction XY and Specimen type "Printed specimen" on V001891-V001899, citing the
processing block and the 2022 edition.

## Re-reads requested by the lead (batch 1, from workstream C)

Recorded row by row in `rereads.csv` (notes tagged "Batch 1"); summary in D-08. Every value matched its source.

| Rows | Outcome |
|---|---|
| V002203, V002204, V002207 | mislabelled condition: the sheet prints "(X-Y)", so Direction should be XY |
| V002078, V002170-73, V002182-83, V002190-91, V002219-21 | mislabelled condition: the sheet prints no direction, so Direction should be Not published |
| V002085 (marked "*injection moulding"), V002179-81 (ASTM D882 film, TD) | correct but unusual: Not applicable can be defended |
| V002155, V002156, V002159 | mislabelled condition: the "annealed ... dried for 48h" sentence is printed on p4 under the mechanical table, not beside the p2 equilibrium water absorption. Post-processing should be Not published. C-15's proposal to set "Dried before testing" would be wrong |
| V000894, V000920, V002078 moisture | correct: "Mechanical Properties at 23°C / 50% rh" is the test atmosphere; each row says "(dry, ...)" |
| V002055 | source error: the row is named Izod but cites ISO 179 (Charpy), and the sheet cannot tell us which test was run |
| V001700 | correct but unusual: "Tensile Yield Strength for Filament [MPa] 57 ± 1" is a strand test (printed bars: 50 ± 5 / 49 ± 5 MPa) and should not enter printed estimates |
| V001683, V001310, V001550 | correct but unusual: 0.905 g/cc, 11800 ± 670 MPa XY not annealed, and 75 % XY printed all match the source. Accept the EST-OUTLIER findings with the quote |
