# Reconcile final-3

37679 reading(s) classified, 56 invalid, 1186 duplicate(s) dropped, 585 marked none. 1792 second-read task(s) outstanding; second readers could not find 34 item(s).

## By class

| class | rows |
|---|---|
| confirms | 15003 |
| new | 10041 |
| unmapped | 4605 |
| identity | 3716 |
| mismatch | 2162 |
| context | 1921 |
| context-held | 212 |
| not-on-page | 19 |

## By presence

| presence | rows |
|---|---|
| text | 32777 |
| visual-only | 4608 |
| block | 217 |
| ocr | 56 |
| repaired | 21 |

## Second read

| status | rows |
|---|---|
| not-required | 30842 |
| agreed | 2647 |
| agreed-reader | 1813 |
| pending | 1806 |
| agreed-text | 357 |
| disagrees | 214 |

## Machine second read (the importer's sheet reader)

| rows | machine agrees | share |
|---|---|---|
| new decision-field rows | 832 | 832 of 2661 (31 %) |
| new decision-field rows the page text pairs with their label (agreed-text, no read) | 357 | 357 of 2661 |
| mismatches (agrees with the page reading, not the held row) | 929 | 929 of 2162 (43 %) |

Documents with no machine reading (no current text cache): 0 row(s).

## Class by kind and field

| kind | field | class | rows |
|---|---|---|---|
| setting | other | new | 3006 |
| setting | print_speed | new | 1335 |
| setting | nozzle | confirms | 1189 |
| setting | bed | confirms | 1132 |
| value | Elongation at break | confirms | 1099 |
| context | all | context | 1044 |
| identity | polymer | identity | 1016 |
| setting | fan | new | 972 |
| value | HDT | confirms | 903 |
| value | Tensile modulus | confirms | 862 |
| identity | other | identity | 806 |
| value | Tensile strength (endpoint unspecified) | confirms | 795 |
| value | Flexural modulus | confirms | 734 |
| value | Density | confirms | 707 |
| value | Flexural strength | confirms | 696 |
| identity | grade | identity | 678 |
| identity | diameter | identity | 628 |
| setting | drying | confirms | 595 |
| setting | plate | confirms | 580 |
| value | Charpy strength | confirms | 556 |
| value | Izod impact strength | confirms | 518 |
| setting | nozzle_diameter | confirms | 483 |
| setting | hardened_nozzle | mismatch | 457 |
| value | Melt mass-flow rate | confirms | 444 |
| value | Density | new | 394 |
| setting | enclosure | confirms | 387 |
| value | Tensile yield strength | confirms | 385 |
| value | Vicat softening temperature | confirms | 367 |
| identity | filler | identity | 346 |
| setting | drying | mismatch | 339 |
| context | tensile | context | 327 |
| value | HDT | new | 324 |
| value | Tensile break strength | confirms | 321 |
| value | Glass transition temperature | confirms | 308 |
| value | Density | mismatch | 284 |
| setting | nozzle | mismatch | 282 |
| value | Melting temperature | confirms | 273 |
| value | Flexural strength | new | 268 |
| value | Tensile modulus | new | 254 |
| value | Water absorption | confirms | 254 |
| setting | chamber | confirms | 247 |
| identity | colour | identity | 242 |
| value | Elongation at yield | confirms | 226 |
| value | Flexural modulus | new | 219 |
| setting | bed | mismatch | 215 |
| value | Vicat softening temperature | new | 208 |
| context | impact | context | 206 |
| value | Hardness | confirms | 205 |
| value | Elongation at break | new | 194 |
| value | Charpy strength | new | 189 |
| context | flexural | context | 179 |
| value | Izod impact strength | new | 178 |
| value | Melt mass-flow rate | new | 160 |
| setting | nozzle | new | 158 |
| value | Tensile strength (endpoint unspecified) | new | 157 |
| value | Coefficient of thermal expansion | unmapped | 155 |
| setting | bed | new | 153 |
| value | Volume resistivity | unmapped | 135 |
| context | thermal | context | 132 |
| setting | nozzle_diameter | new | 131 |
| value | Glass transition temperature | new | 123 |
| setting | enclosure | new | 122 |
| value | Surface resistivity | unmapped | 122 |
| value | Tensile yield strength | new | 122 |
| value | Hardness | unmapped | 114 |
| value | Mould shrinkage | confirms | 114 |
| value | Mould shrinkage | new | 102 |
| value | Relative permittivity | new | 102 |
| value | HDT | unmapped | 95 |
| value | Elongation at yield | new | 94 |
| setting | plate | new | 92 |
| value | Continuous service temperature | new | 88 |
| value | Tensile break strength | new | 86 |
| value | Melting temperature | new | 85 |
| setting | drying | new | 84 |
| context | all | context-held | 75 |
| setting | hardened_nozzle | new | 74 |
| value | Glass transition temperature | unmapped | 73 |
| value | HDT | mismatch | 73 |
| value | Tensile strain at strength | confirms | 72 |

## By document

| SourceID | rows | new | mismatch | visual-only | held rows unread |
|---|---|---|---|---|---|
| R-COVERAGE-20261001-28aad1fe7597 | 1462 | 531 | 135 | 982 | 0 |
| R-QIDI-FILAMENT-GUIDE | 488 | 278 | 87 | 0 | 0 |
| R-SPECTRUM-PORTFOLIO-2024 | 757 | 325 | 80 | 0 | 0 |
| B-support-for-abs-TDS | 51 | 9 | 17 | 2 | 0 |
| R-BAMBU-SUPPORT-PLA-NEW-TDS | 50 | 8 | 17 | 1 | 1 |
| B-pva-TDS | 52 | 11 | 16 | 2 | 0 |
| B-support-for-pla-petg-TDS | 50 | 10 | 15 | 2 | 0 |
| B-support-for-pa-pet-TDS | 36 | 8 | 15 | 1 | 0 |
| R-YOUSU-PRINT-20260928-1a7852d7c84a | 22 | 7 | 12 | 0 | 0 |
| B-tpu-95a-hf-TDS | 57 | 10 | 11 | 22 | 0 |
| R-FILLAMENTUM-PRIORITY-20261003-3f22b7dd7442 | 33 | 1 | 11 | 7 | 0 |
| R-COLORFABB-TDS-E-colorFabb-PLA-Regrind | 37 | 2 | 10 | 4 | 0 |
| B-TPU-SOFT-TDS-4 | 58 | 13 | 9 | 21 | 0 |
| R-BASF-ExtendedTDS-Ultrafuse-ASA-V2-1 | 73 | 16 | 8 | 21 | 0 |
| R-FORWARDAM-PAHT-CF15-TDS-v4-0 | 108 | 14 | 8 | 13 | 0 |
| S-PVB-PVB-Prusament-TDS-2021-10-EN | 41 | 4 | 8 | 6 | 0 |
| D-RECREUS-FILAFLEX-95-FOAMY-PAGE | 49 | 30 | 7 | 0 | 0 |
| B-TPU-SOFT-TDS-5 | 60 | 14 | 7 | 0 | 0 |
| R-COLORFABB-TDS-varioShore-TPU-95A | 39 | 14 | 7 | 2 | 0 |
| S-PVB-269cd3c8-prusament-pla-hs-technical-datasheet | 44 | 14 | 7 | 16 | 0 |
| B-tpu-for-ams-TDS | 43 | 13 | 7 | 0 | 0 |
| D-RAISE3D-P-filament-721-Technical-Data-Sheet-eng-04-20-2021 | 38 | 12 | 7 | 12 | 0 |
| R-FLASHFORGE-ASA-GF10-TDS | 39 | 12 | 7 | 5 | 0 |
| R-BASF-Ultrafuse-TPS-90A-TDS-EN-v1-1 | 48 | 11 | 7 | 10 | 0 |
| R-COLORFABB-Files-colorFabb | 33 | 9 | 7 | 15 | 0 |
| S-PVB-512923fd-tds-pp-glass-fiber-en | 44 | 9 | 7 | 18 | 0 |
| R-RECREUS-FILAFLEX-FOAMY-TECHNICAL-DATA-SHEET-TDS-2023 | 22 | 8 | 7 | 3 | 0 |
| R-RECREUS-FILAFLEX-95A-FOAMY-TECHNICAL-DATA-SHEET-TDS-2024 | 26 | 6 | 7 | 0 | 0 |
| R-COLORFABB-TDS-PLA-PHA | 37 | 5 | 7 | 3 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-SteelFill | 32 | 4 | 7 | 3 | 0 |
| I-TPU-TDS | 32 | 3 | 7 | 6 | 0 |
| R-BASF-Ultrafuse-HiPS-TDS-EN-v2-2 | 46 | 2 | 7 | 1 | 0 |
| R-DUPONT-ZYTEL-GUIDE | 103 | 32 | 6 | 93 | 0 |
| S-PVB-e032493a-tds-pc-space-grade-en | 53 | 18 | 6 | 21 | 0 |
| R-QIDI-PA12-CF | 55 | 13 | 6 | 9 | 0 |
| S-PVB-PCBlend-Prusament-TDS-2022-16-EN | 45 | 12 | 6 | 19 | 0 |
| S-POLYCN-TDS-Polymaker-PolySonic-PLA-Pro-6-0-2026-06-08-EN | 60 | 9 | 6 | 0 | 0 |
| R-COLORFABB-TDS-E-colorFabb-PA-NEAT | 41 | 7 | 6 | 3 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-nGen-FLEX | 38 | 4 | 6 | 2 | 1 |
| R-3D-FUEL-TDS-3DFuel-PETG | 27 | 3 | 6 | 3 | 0 |
| R-COLORFABB-TDS-colorFabb-PLA-High-Speed-PRO | 32 | 3 | 6 | 3 | 0 |
| R-3DJAKE-3DJAKE-c9047f-230cb5f262c040bb8f570d174a23b353 | 24 | 2 | 6 | 0 | 0 |
| D-RECREUS-PLA-PAGE | 50 | 36 | 5 | 0 | 0 |
| S-PVB-Prusament-PC-Space-Grade-Black | 53 | 27 | 5 | 21 | 0 |
| D-SIRAYA-TECH-PRINT-20260928-ecad245ccb7b | 40 | 25 | 5 | 0 | 0 |
| S-POLYCN-PolyMide-PA6-GF-TDS-V5-1 | 75 | 19 | 5 | 11 | 0 |
| S-POLYCN-PolyMide-PA12-CF-TDS-V5-1-1 | 72 | 18 | 5 | 12 | 0 |
| R-FORWARDAM-ULTRAFUSE-BVOH-EXTENDED-TDS | 48 | 15 | 5 | 18 | 0 |
| S-PVB-b4ef2bf6-technical-data-sheet-1 | 45 | 14 | 5 | 18 | 0 |
| R-QIDI-PET-GF | 47 | 13 | 5 | 6 | 0 |
| B-asa-aero-TDS | 60 | 11 | 5 | 24 | 0 |
| R-SUNLU-TDS-High-speed-PLA-marble | 49 | 11 | 5 | 3 | 0 |
| R-COLORFABB-TDS-E-PA-Blue-Metal-Detectable | 32 | 8 | 5 | 3 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-CopperFill | 35 | 7 | 5 | 3 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-XT-2 | 31 | 6 | 5 | 2 | 0 |
| R-COLORFABB-TDS-colorFabb-TPU85A | 36 | 5 | 5 | 3 | 0 |
| R-COLORFABB-TDS-colorFabb-TPU95A | 36 | 5 | 5 | 3 | 0 |
| R-COLORFABB-TDS-colorFabb-XT-CF20 | 34 | 5 | 5 | 3 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-ASA | 35 | 5 | 5 | 2 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-BronzeFill | 35 | 5 | 5 | 3 | 0 |
| R-ESSENTIUM-PPSCF-TDS | 40 | 5 | 5 | 0 | 1 |
| R-NANOVIA-PLA-Flax | 29 | 3 | 5 | 0 | 0 |
| R-NANOVIA-PA-6-CF | 32 | 3 | 5 | 0 | 0 |
| R-BASF-PCGF30-TDS | 50 | 2 | 5 | 7 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-HIPS-Extrafill-03012019 | 30 | 2 | 5 | 1 | 0 |
| R-ULTIMAKER-MAKERBOT-Tough-One-Sheet | 25 | 0 | 5 | 8 | 0 |
| R-CELANESE-ZYTEL-101L | 121 | 54 | 4 | 3 | 0 |
| R-STRATASYS-mds-fdm-pc-abs-0823a | 100 | 50 | 4 | 75 | 0 |
| R-RECREUS-FILAFLEX-Filaflex-70A | 68 | 41 | 4 | 2 | 0 |
| B-PC-PLA-Pure-TDS | 63 | 34 | 4 | 40 | 0 |
| S-PVB-8-PETG-RECYCLED-Prusament-TDS-2022 | 41 | 28 | 4 | 16 | 14 |
| B-PC-uVYGQd | 63 | 26 | 4 | 41 | 0 |
| S-POLYCN-TDS-Polymaker-HT-PLA-GF-V1-2-2025-12-09-EN | 67 | 25 | 4 | 21 | 0 |
| R-BASF-ExtendedTDS-Ultrafuse-PAHT-CF15-V1-5 | 117 | 25 | 4 | 72 | 0 |
| R-POLYMAKER-PRIORITY-20261002-29b58f0eea90 | 34 | 22 | 4 | 0 | 0 |
| R-SUNLU-COVERAGE-20261001-816dc4c0cc18 | 46 | 21 | 4 | 7 | 0 |
| S-PVB-9f8d2165-tds-prusament-petg-n-en | 41 | 21 | 4 | 16 | 0 |
| R-SUNLU-e8b9c06a-4b93-46cb-9532-d9deb185a7c8 | 46 | 17 | 4 | 1 | 0 |
| S-PVB-prusament-petg-v0-technical-data-sheet | 44 | 15 | 4 | 16 | 0 |
| S-PVB-prusament-pla-technical-data-sheet | 42 | 15 | 4 | 18 | 0 |
| R-SUNLU-6f3c0e89-fa56-46b2-ab3d-601ee6b70cf9 | 47 | 15 | 4 | 5 | 0 |
| S-PEBA-eSUN-eFlex-Filament-TDS-V4-0 | 32 | 14 | 4 | 4 | 0 |
| S-PEBA-ABS-TDS-EN-docx | 43 | 12 | 4 | 0 | 0 |
| S-PEBA-eSUN-ePLA-LW-Filament-TDS-V4-0 | 33 | 12 | 4 | 5 | 0 |
| B-PC-Bambu-PC-Technical-Data-Sheet | 59 | 11 | 4 | 24 | 0 |
| R-BASF-ExtendedTDS-Ultrafuse-PET-CF15-V1-4 | 64 | 11 | 4 | 16 | 0 |
| S-PVB-bc8551ef-tds-prusament-asa-2024-en | 42 | 11 | 4 | 17 | 0 |
| R-SUNLU-19364171789540194308 | 44 | 11 | 4 | 8 | 0 |
| R-EXTRUDR-PRINT-20260928-83ec5c0b3125 | 53 | 10 | 4 | 0 | 0 |
| D-LEHVOSS-LUVOCOM-3F-PAHT-KK-50056-BK-FR | 26 | 10 | 4 | 14 | 0 |
| R-SUNLU-56889371789540318047 | 56 | 10 | 4 | 19 | 0 |
| R-ERYONE-PRINT-20260928-9e82297a5891 | 27 | 10 | 4 | 0 | 0 |
| S-PEBA-eSUN-eABS-Max-Filament-TDS-V4-0 | 31 | 10 | 4 | 5 | 0 |
| S-PVB-80316f6d-tds-prusament-tpu-95a-en-1 | 43 | 10 | 4 | 0 | 0 |
| R-EXTRUDR-PRIORITY-20261003-ce91065b0c8a | 39 | 9 | 4 | 0 | 0 |
| D-SIRAYA-flex-tpu-64d-filament-tds | 34 | 9 | 4 | 0 | 0 |
| S-PEBA-eSUN-ePA-Filament-TDS-V4-02 | 30 | 9 | 4 | 1 | 0 |
| R-QIDI-PEBA-95A | 41 | 9 | 4 | 8 | 0 |
| R-SUNLU-a47cd225-7892-4788-9c73-bd27bfd791f5 | 46 | 9 | 4 | 2 | 0 |
| R-EXTRUDR-pla-hs-TDS-en | 28 | 7 | 4 | 2 | 0 |
| R-EXTRUDR-pla-hs-TDS-en-8f08c1 | 28 | 7 | 4 | 2 | 0 |
| D-FLASH-TPU-64D-TDS-EN | 24 | 5 | 4 | 1 | 0 |
| R-3D4MAKERS-TDS-LUVOCOM-3F-PAHT-KK-50056-BK-FR-Filament-3D4Makers | 27 | 5 | 4 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-pa6-neat-bk | 39 | 5 | 4 | 2 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-PETG-Economy | 34 | 5 | 4 | 2 | 0 |
| R-EXTRUDR-pla-high-speed-TDS-en | 28 | 5 | 4 | 2 | 0 |
| S-SPECTRUM-en-tds-spectrum-pc-cf | 29 | 5 | 4 | 0 | 0 |
| R-3D-FUEL-TDS-3DFuel-Workday-ABS | 36 | 3 | 4 | 6 | 0 |
| R-GRUPA-AZOTY-TARFUSE-POM-TDS | 25 | 3 | 4 | 0 | 0 |
| R-3DJAKE-3DJAKE-c9047f-1e9c2a0b33dd4d3eb764ce6233abe759 | 24 | 2 | 4 | 0 | 0 |
| R-3DJAKE-3DJAKE-PCTG-CF-tech-data | 24 | 2 | 4 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-PLAx-CF-25-02 | 22 | 2 | 4 | 0 | 0 |
| S-BVOH-ULTRAFUSE-TDS-v1-3 | 34 | 2 | 4 | 6 | 0 |
| R-NANOVIA-PA-Rail-ac7021 | 32 | 2 | 4 | 1 | 0 |
| R-3DJAKE-3DJAKE-ASAx-CF-Technical-Data | 22 | 2 | 4 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-PETG-CF-23-12 | 24 | 2 | 4 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-PETG-GF-26-04 | 24 | 2 | 4 | 0 | 0 |
| R-3DJAKE-3DJAKE-Technische-daten-PLAx | 22 | 2 | 4 | 0 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-Color-on-Demand | 32 | 2 | 4 | 6 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-Economy-PLA | 33 | 2 | 4 | 6 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-ABS-Extrafill-03012019-1 | 21 | 2 | 4 | 8 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-NonOilen-EN-03082020-FfN | 18 | 1 | 4 | 2 | 0 |
| R-RECREUS-FILAFLEX-Filaflex-60A | 66 | 42 | 3 | 0 | 0 |
| R-EXTRUDR-PRIORITY-20261003-70456e37bf44 | 53 | 29 | 3 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261002-e2d172d8d9f3 | 35 | 23 | 3 | 0 | 0 |
| R-3DJAKE-KINGROON-TPU-95A-Technical-Data-Sheet-V1-0 | 58 | 19 | 3 | 1 | 0 |
| D-SIRAYA-TECH-PRINT-20260928-2a59ac01371f | 36 | 19 | 3 | 0 | 0 |
| S-PVB-7-PLA-Recycled-Prusament-TDS-2021-V4 | 40 | 17 | 3 | 18 | 0 |
| R-SUNLU-9c709eea-12c7-4a05-b5cd-227c63c700b8 | 47 | 16 | 3 | 7 | 0 |
| R-3DJAKE-3DJAKE-ANYCUBIC-TDS-TPU-V3-0 | 39 | 16 | 3 | 1 | 0 |
| S-PEBA-eSUN-ePA-Filament-TDS-V4-0 | 30 | 16 | 3 | 5 | 4 |
| D-SUNLU-TPU-TDS-2024-06 | 48 | 16 | 3 | 6 | 0 |
| R-3DJAKE-3DJAKE-ANYCUBIC-TDS-ABS-V3-0 | 41 | 15 | 3 | 0 | 0 |
| R-3DJAKE-3DJAKE-ANYCUBIC-TDS-ASA-V3-0 | 40 | 15 | 3 | 0 | 0 |
| R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PETG-V3-0 | 39 | 14 | 3 | 0 | 0 |
| R-COLORFABB-TDS-varioShore-PEBA40D | 39 | 14 | 3 | 7 | 0 |
| S-PCGF-PA12-CF-TDS-EN-1 | 48 | 14 | 3 | 4 | 0 |
| R-SUNLU-48f9a499-b97a-4844-be4b-35ca349b5b64 | 48 | 14 | 3 | 4 | 0 |
| S-PEBA-TPU-LW-TDS-V1 | 34 | 13 | 3 | 3 | 0 |
| R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-Metal-V3-0 | 40 | 13 | 3 | 0 | 0 |
| R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-V3-0 | 39 | 13 | 3 | 0 | 0 |
| S-PVB-0eaa8597-prusament-rpla-natural-pigments-technical-data-sheet | 43 | 13 | 3 | 14 | 0 |
| R-SUNLU-225ab1bc-a40a-435b-8d20-a2745303674b | 48 | 13 | 3 | 3 | 0 |
| D-DSM-ARNITEL-ID2045-PRINT-GUIDELINE | 21 | 12 | 3 | 1 | 0 |
| R-SUNLU-75a39c51-7d4c-40c4-839d-58f88cbbbf94 | 52 | 12 | 3 | 11 | 0 |
| S-PEBA-ABS-HT-TDS-V1-2024-07-02 | 32 | 12 | 3 | 1 | 0 |
| R-SUNLU-042608c3-25e5-4515-a83e-f2220185296c | 47 | 12 | 3 | 8 | 0 |
| S-PET-TDS-LUVOCOM-3F-PAHT-9825-NT-Injection-molded-specimen | 38 | 11 | 3 | 16 | 0 |
| R-COLORFABB-TDS-varioShore-TPU85A | 33 | 11 | 3 | 4 | 0 |
| S-PEBA-PEBA90A-TDS-en | 37 | 11 | 3 | 3 | 0 |
| R-SUNLU-02f59eef-2adc-4bae-8b08-bfd1a8a278fe | 47 | 11 | 3 | 8 | 0 |
| R-SUNLU-ABS-FR-TDS-0 | 46 | 11 | 3 | 1 | 0 |
| R-SUNLU-ef443c43-b15b-4242-8884-dcce385e8f02 | 46 | 11 | 3 | 2 | 0 |
| R-SUNLU-PVB-TDS | 47 | 11 | 3 | 1 | 0 |
| R-EXTRUDR-PRINT-20260929-463457967aab | 43 | 10 | 3 | 0 | 0 |
| B-PC-TDS | 57 | 10 | 3 | 11 | 0 |
| S-PEBA-eStars-PLA | 29 | 10 | 3 | 5 | 0 |
| S-PEBA-eSUN-ePLA-ST-Filament-TDS-V4-0 | 29 | 10 | 3 | 5 | 0 |
| R-SUNLU-High-Speed-ABS-TDS | 46 | 10 | 3 | 2 | 0 |
| R-SUNLU-PA12-CF-TDS | 45 | 10 | 3 | 2 | 0 |
| R-SUNLU-PA6-CF-TDS | 45 | 10 | 3 | 2 | 0 |
| R-EXTRUDR-durapro-pc-pbt-TDS-en | 50 | 9 | 3 | 2 | 0 |
| R-EXTRUDR-PRIORITY-20261003-49ca17b00573 | 40 | 9 | 3 | 0 | 0 |
| D-FLASH-PET-GF-TDS-EN | 38 | 9 | 3 | 5 | 0 |
| D-RAISE3D-Raise3D-Premium-ABS-TDS-V7-2 | 38 | 9 | 3 | 2 | 0 |
| R-SUNLU-bbd3e778-b424-49b7-b203-058327f2f6fc | 46 | 9 | 3 | 2 | 0 |
| R-QIDI-ASA-AERO | 33 | 8 | 3 | 6 | 0 |
| D-RAISE3D-Raise3D-Industrial-PET-CF-TDS-V4-0 | 51 | 8 | 3 | 10 | 2 |
| D-SIRAYA-siraya-tech-fibreheart-flex-tpu-85a-tds | 37 | 8 | 3 | 0 | 0 |
| D-SIRAYA-siraya-tech-fibreheart-flex-tpu-95a-tds | 39 | 8 | 3 | 0 | 0 |
| R-3D4MAKERS-TDS-pps-cf-9938-bk-filament-en-iso | 35 | 7 | 3 | 0 | 0 |
| R-EXTRUDR-durapro-pa12-cf-TDS-en | 35 | 7 | 3 | 1 | 0 |
| R-EXTRUDR-durapro-pa12-cf-TDS-en-11cea4 | 35 | 7 | 3 | 1 | 0 |
| R-EXTRUDR-PRINT-20260928-526b472f69cc | 45 | 7 | 3 | 0 | 0 |
| D-RAISE3D-Raise3D-Industrial-PET-CF-TDS-V2-8c9901cf-e1d5-4e11-b9e2-cd245c298c4f | 31 | 7 | 3 | 0 | 1 |
| D-SIRAYA-rebound-peba-85a-filament-tds | 31 | 7 | 3 | 0 | 0 |
| R-SIRAYA-COVERAGE-20260930-c2563ad36bc5 | 18 | 7 | 3 | 0 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-nGen | 35 | 6 | 3 | 5 | 0 |
| S-PEBA-eSUN-ePA-CF-Filament-TDS-V4-0 | 30 | 6 | 3 | 0 | 0 |
| R-EXTRUDR-durapro-pc-pbt-cf-TDS-en | 52 | 6 | 3 | 2 | 0 |
| R-EXTRUDR-flex-medium-matt-TDS-en | 30 | 6 | 3 | 1 | 0 |
| R-EXTRUDR-PRINT-20260929-af22746e0274 | 44 | 6 | 3 | 0 | 0 |
| S-PET-TDS-LUVOCOM-3F-PAHT-9936-BK | 31 | 6 | 3 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-pa6-low-warp | 31 | 6 | 3 | 0 | 0 |
| R-BRASKEM-Braskem-3D-Printing-Data-Sheet-FL900PP-CF | 23 | 6 | 3 | 1 | 0 |
| R-ERYONE-PETG-GF-TDS | 33 | 6 | 3 | 4 | 0 |
| S-SPECTRUM-en-tds-spectrum-pc-275 | 29 | 6 | 3 | 0 | 0 |
| R-EXTRUDR-durapro-pc-pbt-cf-TDS-en-3a6807 | 52 | 5 | 3 | 2 | 0 |
| S-SPECTRUM-en-tds-spectrum-pa6-gk10 | 29 | 5 | 3 | 1 | 0 |
| S-SPECTRUM-en-tds-spectrum-pctg | 24 | 5 | 3 | 1 | 0 |
| S-SPECTRUM-en-tds-spectrum-petg-ptfe | 24 | 5 | 3 | 0 | 0 |
| R-EXTRUDR-PRIORITY-20261003-967a9be07d31 | 40 | 5 | 3 | 0 | 0 |
| R-FIBERLOGY-FiberWORKS-PLA-TDS | 28 | 5 | 3 | 2 | 0 |
| S-SPECTRUM-en-tds-spectrum-lw-asa-ultrafoam | 29 | 5 | 3 | 0 | 0 |
| R-3DJAKE-3DJAKE-PCTG-TECHNISCHES-DATENBLATT | 23 | 4 | 3 | 0 | 0 |
| R-NANOVIA-ABS-AF | 28 | 4 | 3 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-pla-conductive | 30 | 4 | 3 | 1 | 0 |
| R-3D4MAKERS-LUVOCOM-3F-PAHT-CF-9742-BK-EN-TDS | 30 | 4 | 3 | 8 | 0 |
| R-3DJAKE-3DJAKE-c9047f-87fad94441284d8b9a04976ae0a5e874 | 22 | 4 | 3 | 0 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-PC-ABS | 24 | 4 | 3 | 2 | 1 |
| R-NANOVIA-ABS-CF | 29 | 4 | 3 | 0 | 0 |
| R-NANOVIA-PETG-CF | 30 | 4 | 3 | 0 | 0 |
| S-SPECTRUM-EN-TDS-The-Filament-PLA-HS | 21 | 4 | 3 | 3 | 0 |
| S-SPECTRUM-EN-TDS-Spectrum-PA12-CF15 | 27 | 4 | 3 | 1 | 0 |
| S-SPECTRUM-en-tds-spectrum-pa12-cf15 | 27 | 4 | 3 | 1 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-Nylon-FX256 | 23 | 3 | 3 | 2 | 0 |
| S-PET-TDS | 22 | 3 | 3 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-ABSx-23-12 | 23 | 3 | 3 | 12 | 0 |
| R-3DJAKE-3DJAKE-TDS-ASA-23-12 | 23 | 3 | 3 | 12 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-Nylon-CF15-Carbon-03012019 | 21 | 3 | 3 | 3 | 0 |
| R-NANOVIA-PETG-GF-UV | 26 | 3 | 3 | 0 | 0 |
| S-SPECTRUM-en-tds-the-filament-asa | 22 | 3 | 3 | 1 | 0 |
| S-SPECTRUM-EN-TDS-The-Filament-PETG | 21 | 3 | 3 | 2 | 0 |
| S-SPECTRUM-EN-TDS-The-Filament-PLA | 21 | 3 | 3 | 2 | 0 |
| S-SPECTRUM-eng-tds-the-filament-petg | 19 | 3 | 3 | 2 | 0 |
| S-SPECTRUM-eng-tds-the-filament-pla | 19 | 3 | 3 | 2 | 0 |
| S-SPECTRUM-EN-TDS-Spectrum-PETG-ESD | 24 | 3 | 3 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-petg-esd | 24 | 3 | 3 | 0 | 0 |
| R-FABRU-PUREFIL-3514-Material-data-sheet-PA12-purefil | 16 | 2 | 3 | 1 | 0 |
| I-PLA-PLA-Silk-Dual-Color-TDS | 23 | 2 | 3 | 12 | 0 |
| R-NOBUFIL-PRINT-20260928-87da1d4c6163 | 11 | 2 | 3 | 0 | 0 |
| S-PCGF-TDS-1 | 26 | 2 | 3 | 10 | 0 |
| R-3DJAKE-3DJAKE-TDS-PETG-23-12 | 22 | 2 | 3 | 0 | 0 |
| R-NANOVIA-ABS-ESD | 28 | 2 | 3 | 0 | 0 |
| S-PRUSA-RESEARCH-PRINT-20260928-190a89598392 | 11 | 2 | 3 | 0 | 0 |
| S-SIDDAMENT-PRINT-20260928-6200f886fd3f | 13 | 2 | 3 | 0 | 0 |
| S-SPECTRUM-ENG-TDS-The-Filament-PETG-CF | 20 | 2 | 3 | 1 | 0 |
| S-SPECTRUM-eng-tds-the-filament-petg-cf | 20 | 2 | 3 | 1 | 0 |
| R-NANOVIA-Flex-B4C | 16 | 1 | 3 | 0 | 0 |
| R-3D4MAKERS-TDS-PLA-Filament | 22 | 1 | 3 | 1 | 0 |
| R-MATTERHACKERS-PRO-SERIES-XKjoeP | 21 | 1 | 3 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-XNT7Rt | 19 | 1 | 3 | 0 | 0 |
| R-ULTIMAKER-MAKERBOT-MakerBot-Precision-ASA-3-092020 | 22 | 1 | 3 | 6 | 0 |
| R-COLORFABB-TDS-E-colorFabbPABlueMetalDetectable | 20 | 0 | 3 | 1 | 0 |
| R-STRATASYS-mds-fdm-pc-0426a | 125 | 59 | 2 | 73 | 0 |
| R-RECREUS-FILAFLEX-Filaflex-82A | 73 | 42 | 2 | 3 | 0 |
| R-RECREUS-PRINT-20260929-5fe4f7191bfc | 55 | 39 | 2 | 0 | 0 |
| R-POLYMAKER-PANCHROMA-TDS-V2-1 | 45 | 29 | 2 | 5 | 0 |
| D-SIRAYA-TECH-PRINT-20260928-fc27f63b931a | 33 | 20 | 2 | 0 | 0 |
| R-EXTRUDR-durapro-pc-pbt-cf-TDS-it | 52 | 18 | 2 | 2 | 0 |
| R-NANOVIA-COVERAGE-20261001-19c4810bdc29 | 108 | 18 | 2 | 9 | 0 |
| S-PEBA-eSUN-Wood-Filament-TDS-V4-0 | 33 | 18 | 2 | 0 | 0 |
| R-RECREUS-PETG-CF | 26 | 17 | 2 | 15 | 0 |
| R-SUNLU-c7dd1bd8-a2c5-4908-bc1c-479ca23cbd3b | 44 | 17 | 2 | 1 | 0 |
| R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-HS-V3-0 | 43 | 16 | 2 | 0 | 0 |
| S-PEBA-eSUN-eMarble-Filament-TDS-V4-0 | 29 | 16 | 2 | 4 | 0 |
| S-PEBA-eSUN-TPU-95A-Filament-TDS-V4-0 | 32 | 16 | 2 | 0 | 0 |
| R-EXTRUDR-PRINT-20260928-8ac1c5367674 | 44 | 16 | 2 | 0 | 0 |
| S-ESUN-PRINT-20260928-c1f77dd37a8b | 26 | 15 | 2 | 0 | 0 |
| R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-silk-V3-0 | 39 | 14 | 2 | 1 | 0 |
| B-pla-cf-TDS | 47 | 14 | 2 | 1 | 0 |
| B-pla-silk-dual-color-TDS | 47 | 14 | 2 | 1 | 0 |
| R-ESUN-PRIORITY-20261003-be26800125b2 | 21 | 14 | 2 | 1 | 0 |
| S-ESUN-PRINT-20260928-76aac354f18d | 21 | 14 | 2 | 1 | 0 |
| R-SIRAYA-COVERAGE-20261001-8af0c76b9d9c | 25 | 14 | 2 | 0 | 0 |
| R-COLORFABB-TDS-varioShore-PEBA45D | 39 | 14 | 2 | 7 | 0 |
| R-ESSENTIUM-TDS-Essentium-TPU-80A-Z | 39 | 14 | 2 | 0 | 0 |
| R-ESSENTIUM-TDS-Essentium-TPU-95A-Z | 39 | 14 | 2 | 0 | 0 |
| S-PEBA-eSUN-PVA-Filament-TDS-V4-0 | 29 | 14 | 2 | 4 | 0 |
| R-3DJAKE-KINGROON-PETG-Basic-Technical-Data-Sheet-V1-0 | 59 | 14 | 2 | 1 | 0 |
| S-PEBA-eSUN-eTwinkling-Filament-TDS-V4-0 | 30 | 13 | 2 | 5 | 0 |
| R-3DJAKE-KINGROON-PLA-Basic-Technical-Data-Sheet-V1-0 | 60 | 13 | 2 | 6 | 0 |
| R-SUNLU-d7bcafe0-f102-4dcb-a87a-59f458f0358d | 45 | 13 | 2 | 1 | 0 |
| R-SUNLU-PC-ABS-TDS | 44 | 13 | 2 | 0 | 0 |
| R-SUNLU-PC-TDS | 44 | 13 | 2 | 0 | 0 |
| R-SUNLU-SUNLU-TPU-95A-Gray | 45 | 13 | 2 | 3 | 0 |
| R-SUNLU-25182761789529093884 | 48 | 12 | 2 | 10 | 0 |
| S-PEBA-ASA-TDS-V1-1 | 31 | 12 | 2 | 1 | 0 |
| S-PEBA-eSUN-ABS-Filament-TDS-V4-0 | 31 | 12 | 2 | 5 | 0 |
| S-PEBA-eSUN-HIPS-Filament-TDS-V4-0-1 | 30 | 12 | 2 | 5 | 0 |
| S-PEBA-eSUN-PETG-Filament-TDS-1 | 43 | 12 | 2 | 2 | 0 |
| S-PEBA-eSUN-PLA-Filament-TDS-V4-0 | 30 | 12 | 2 | 5 | 0 |
| S-PEBA-PLA-Basic-TDS-EN-2026-6-5 | 41 | 12 | 2 | 4 | 1 |
| S-POLYCN-TDS-Polymaker-PolyMax-PC-V5-5-2026-01-05-EN | 49 | 12 | 2 | 0 | 1 |
| D-RAISE3D-Raise3D-Hyper-Core-PPA-GF25-TDS-V1-1 | 46 | 12 | 2 | 2 | 1 |
| D-RAISE3D-Raise3D-Hyper-Speed-PLA-Pro-TDS-V1-0-1 | 44 | 12 | 2 | 2 | 0 |
| R-SUNLU-81b1d361-0bd9-4783-ba0f-283a311c6870 | 47 | 12 | 2 | 4 | 0 |
| S-PEBA-ABS-ESD-TDS-EN | 40 | 11 | 2 | 1 | 1 |
| S-PEBA-eSUN-ePLA-Matte-Filament-TDS-V4-0 | 30 | 11 | 2 | 4 | 0 |
| S-PEBA-eSUN-eSilk-PLA-Filament-TDS-V4-0 | 29 | 11 | 2 | 5 | 0 |
| S-PEBA-eSUN-PETG-Filament-TDS-V4-0 | 30 | 11 | 2 | 5 | 0 |
| S-PEBA-eSUN-PETG-HS-Filament-TDS-V1-0-1 | 29 | 11 | 2 | 2 | 0 |
| S-PEBA-eSUN-PLA-Rock-FilamentTDS | 29 | 11 | 2 | 8 | 0 |
| S-POLYMAKER-ABS-MAX-PAGE | 22 | 11 | 2 | 0 | 0 |
| R-SUNLU-68c0ccf4-9059-4b50-ad40-95ba3634f0ae | 45 | 11 | 2 | 4 | 0 |
| R-SUNLU-93d827f4-50e9-45b4-8b24-bf5ddaf8273f | 46 | 11 | 2 | 5 | 0 |
| R-SUNLU-ccf53a55-5b58-49fa-b1d9-08f94c0a4b28 | 44 | 11 | 2 | 0 | 0 |
| R-SUNLU-e5f16b43-cef6-4f3e-ad93-3cc86f93f7e4 | 44 | 11 | 2 | 0 | 0 |
| R-SUNLU-PLA-Galaxy-TDS | 44 | 11 | 2 | 1 | 0 |
| R-3DJAKE-SILK-TDS-4 | 24 | 10 | 2 | 10 | 0 |
| D-BIGREP-HI-TEMP-CF-PAGE | 18 | 10 | 2 | 0 | 0 |
| S-PEBA-eSUN-TPE-83A-Filament-TDS-V4-0 | 28 | 10 | 2 | 0 | 0 |
| R-EXTRUDR-PRIORITY-20261003-cafa71249318 | 46 | 10 | 2 | 0 | 0 |
| D-SIRAYA-siraya-tech-flex-tpu-air-tds | 54 | 10 | 2 | 0 | 0 |
| R-SUNLU-Silk-PLA-Four-Color-TDS-fc0f1921-f20b-4dee-8742-08d11bddaea8 | 48 | 10 | 2 | 6 | 0 |
| S-PEBA-59754c44 | 29 | 10 | 2 | 1 | 0 |
| S-PEBA-a2d5f9c0 | 29 | 10 | 2 | 0 | 0 |
| S-PEBA-eABS-HS-TDS | 29 | 10 | 2 | 2 | 0 |
| S-PEBA-ePLA-HS-Filament-TDS | 28 | 10 | 2 | 1 | 0 |
| S-PEBA-eSUN-Luminous-PLA-Rainbow-Filament-TDS-V4-01 | 29 | 10 | 2 | 5 | 0 |
| S-PEBA-eSUN-PLA-Luminous-Filament-TDS-V4-01 | 29 | 10 | 2 | 5 | 0 |
| D-RAISE3D-Raise3D-Premium-ASA-TDS-v6-0 | 39 | 10 | 2 | 1 | 0 |
| D-SIRAYA-Fibreheart-PPA-TDS | 40 | 10 | 2 | 1 | 0 |
| R-SUNLU-PA6-GF-TDS | 44 | 10 | 2 | 0 | 0 |
| R-3D4MAKERS-TDS-Facilan-PCL100-filament-V1-4 | 23 | 9 | 2 | 1 | 0 |
| S-POLYCN-TDS-Polymaker-PolySupport-PA12-v5-5-2026-01-14-EN | 34 | 9 | 2 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261002-8c3c83807f63 | 34 | 9 | 2 | 3 | 0 |
| R-POLYMAKER-PRIORITY-20261002-bc61cf2013c2 | 19 | 9 | 2 | 0 | 0 |
| D-RAISE3D-Raise3D-Industrial-PET-GF-TDS-V1 | 34 | 9 | 2 | 1 | 0 |
| R-SUNLU-581a2c53-a377-4a1a-8fa4-f864aa683bd2 | 47 | 9 | 2 | 5 | 0 |
| R-SUNLU-7d61617c-7540-4ae2-88d3-a0d206e5d801 | 48 | 9 | 2 | 4 | 0 |
| S-SPECTRUM-en-tds-spectrum-sflex-98a | 27 | 9 | 2 | 1 | 0 |
| R-FILLAMENTUM-TDS-OBC-905-EN-07102022-FI | 36 | 8 | 2 | 1 | 0 |
| S-SPECTRUM-PRINT-20260928-fbfcc181ccf7 | 33 | 8 | 2 | 1 | 0 |
| R-3DJAKE-ABS-P-TDS-1 | 24 | 8 | 2 | 2 | 0 |
| R-EXTRUDR-PRIORITY-20261003-8f1f07e586ce | 46 | 8 | 2 | 0 | 0 |
| R-FABRU-2187-Material-data-sheet-PETG-purefil | 16 | 8 | 2 | 0 | 0 |
| R-FABRU-3491-Material-data-sheet-ABS-GF10-purefil | 19 | 8 | 2 | 0 | 0 |
| R-FABRU-3495-Material-data-sheet-PA12-CF15-purefil | 18 | 8 | 2 | 0 | 0 |
| R-NANOVIA-PETG | 24 | 8 | 2 | 0 | 0 |
| S-POLYCN-TDS-Polymaker-PolyLite-CosPLA-Version-A-V5-5-2025-12-30-EN | 45 | 8 | 2 | 0 | 1 |
| D-SIRAYA-siraya-tech-fibreheart-paht-cf-ppa-based-tds | 45 | 8 | 2 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-petg-fx120 | 24 | 8 | 2 | 0 | 0 |
| R-QIDI-PLA-CF | 32 | 7 | 2 | 4 | 0 |
| R-3DJAKE-3DJAKE-15-TDS-Hyper-RFID-PLA-EN | 31 | 7 | 2 | 7 | 0 |
| R-3DJAKE-3DJAKE-ASA-TDS-1 | 23 | 7 | 2 | 0 | 0 |
| R-EXTRUDR-durapro-pc-fr-v0-TDS-en | 61 | 7 | 2 | 7 | 0 |
| R-COLORFABB-NGEN-TDS-V2 | 31 | 6 | 2 | 5 | 0 |
| S-PEBA-eSUN-ePA12-Filament-TDS-V4-0 | 28 | 6 | 2 | 1 | 0 |
| R-COVERAGE-20261001-941cb5b0f2b9 | 17 | 6 | 2 | 1 | 0 |
| S-SPECTRUM-en-tds-spectrum-sflex-carbon | 27 | 6 | 2 | 2 | 0 |
| R-3DJAKE-3DJAKE-13-TDS-hyper-PLA-EN | 29 | 6 | 2 | 10 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-HT | 34 | 6 | 2 | 5 | 0 |
| R-EXTRUDR-petg-TDS-en | 29 | 6 | 2 | 0 | 0 |
| R-EXTRUDR-PRIORITY-20261003-88316f653878 | 43 | 6 | 2 | 0 | 0 |
| S-PET-TDS-ReForm-rTPU-85A | 23 | 6 | 2 | 1 | 0 |
| S-PET-TDS-ReForm-rTPU-90A | 23 | 6 | 2 | 1 | 0 |
| I-PLA-Light-Weight-PLA-TDS | 34 | 6 | 2 | 0 | 0 |
| R-3DJAKE-TDS-Stainless-Steel-PLA-1-0-1 | 22 | 6 | 2 | 0 | 0 |
| S-PVB-prusament-rpla-natural-pigments-technical-data-sheet | 40 | 6 | 2 | 2 | 0 |
| D-RAISE3D-Raise3D-Hyper-Core-ABS-CF15-TDS-V1-0 | 33 | 6 | 2 | 9 | 0 |
| D-RAISE3D-Raise3D-Hyper-Core-PPA-CF25-TDS-V2-0 | 42 | 6 | 2 | 9 | 0 |
| S-PCGF-PETG-Carbon-Fiber-TDS-Siddament | 22 | 6 | 2 | 1 | 0 |
| S-SPECTRUM-en-tds-spectrum-pc-abs-fr-v0 | 34 | 6 | 2 | 0 | 1 |
| S-SPECTRUM-en-tds-spectrum-pla-metal-copper | 21 | 6 | 2 | 2 | 0 |
| R-3DJAKE-3DJAKE-TDS-Original-CarbonFiber-PLA-1-0-1 | 18 | 5 | 2 | 0 | 0 |
| R-BRASKEM-FL300PE-PDS | 19 | 5 | 2 | 0 | 0 |
| S-ESUN-PRINT-20260928-c7b961702f53 | 15 | 5 | 2 | 0 | 0 |
| D-EXTRUDR-FLEX-MEDIUM-MATT-PAGE | 38 | 5 | 2 | 0 | 0 |
| R-FABRU-PUREFIL-241-Material-data-sheet-TPU-53D-purefil | 16 | 5 | 2 | 0 | 0 |
| S-SPECTRUM-en-tds-pa6-neat-nt | 29 | 5 | 2 | 1 | 0 |
| S-SPECTRUM-en-tds-spectrum-abs-kevlar | 25 | 5 | 2 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-asa-kevlar | 27 | 5 | 2 | 2 | 0 |
| S-SPECTRUM-EN-TDS-Spectrum-ecoPET-9021 | 25 | 5 | 2 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-greeny-pro | 23 | 5 | 2 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-greenyht | 20 | 5 | 2 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-pa6-cs20-frv0 | 27 | 5 | 2 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-pctg-gf10 | 21 | 5 | 2 | 1 | 0 |
| S-SPECTRUM-en-tds-spectrum-pla-magic-silk | 23 | 5 | 2 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-pp | 30 | 5 | 2 | 2 | 0 |
| S-SPECTRUM-en-tds-spectrum-pc-ptfe | 34 | 5 | 2 | 4 | 0 |
| R-EXTRUDR-petg-bundle-TDS-en | 29 | 5 | 2 | 0 | 0 |
| R-EXTRUDR-pla-nx2-matt-TDS-en | 26 | 5 | 2 | 0 | 0 |
| R-EXTRUDR-PRIORITY-20261003-e49b91234afa | 41 | 5 | 2 | 0 | 0 |
| R-FIBERLOGY-FiberWORKS-PETG-TDS | 28 | 5 | 2 | 3 | 0 |
| S-PET-TDS-ReForm-rTPU-95A | 23 | 5 | 2 | 1 | 0 |
| S-PET-TDS-LUVOCOM-3F-PAHT-CF-9891-BK | 31 | 5 | 2 | 0 | 0 |
| R-NANOVIA-PC-ABS | 21 | 5 | 2 | 0 | 0 |
| S-POLYCN-TDS-Polymaker-HT-PLA-Pro-V1-4-2026-7-17-EN | 65 | 5 | 2 | 2 | 1 |
| S-SPECTRUM-en-tds-spectrum-pa6-cf15 | 32 | 5 | 2 | 0 | 0 |
| S-SPECTRUM-EN-TDS-Spectrum-PC-CF-3 | 24 | 5 | 2 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-pps-am230 | 25 | 5 | 2 | 2 | 0 |
| S-SPECTRUM-en-tds-spectrum-wood | 24 | 5 | 2 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-pla-metal-brass | 21 | 5 | 2 | 2 | 0 |
| S-SPECTRUM-en-tds-spectrum-pla-metal-bronze | 21 | 5 | 2 | 2 | 0 |
| R-COLORFABB-colorFabb-PA-CF-Low-Warp-TDS | 17 | 4 | 2 | 0 | 0 |
| S-ESUN-PRINT-20260928-333834d1b9db | 27 | 4 | 2 | 1 | 0 |
| R-KIMYA-TPC-91A-TDS | 24 | 4 | 2 | 3 | 0 |
| S-SPECTRUM-en-tds-spectrum-asa-conductive | 31 | 4 | 2 | 0 | 0 |
| R-COLORFABB-TDS-E-colorFabb-PLA-Chameleon | 40 | 4 | 2 | 0 | 0 |
| S-ESUN-PRINT-20260928-84a9e8286c29 | 27 | 4 | 2 | 1 | 0 |
| S-PEBA-PLA-HF-TDS-2026-2-2 | 30 | 4 | 2 | 3 | 1 |
| S-PEBA-PLA-TDS-en | 30 | 4 | 2 | 2 | 1 |
| R-FABRU-PUREFIL-804-Materialdatenblatt-PA12-CF15-purefil | 16 | 4 | 2 | 1 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-Flexfill-TPU-92A-26082019 | 21 | 4 | 2 | 5 | 0 |
| R-NANOVIA-ABS-EF | 29 | 4 | 2 | 0 | 0 |
| S-PVB-TDS-Prusament-PCCF-2023-EN | 41 | 4 | 2 | 4 | 0 |
| R-QIDI-PRINT-20260928-2c4a151ce07e | 20 | 4 | 2 | 0 | 0 |
| D-RAISE3D-Raise3D-Industrial-PPA-GF-TDS-v2-1 | 24 | 4 | 2 | 2 | 0 |
| S-SPECTRUM-en-tds-the-filament-tpu-82a | 19 | 4 | 2 | 2 | 0 |
| S-SPECTRUM-en-tds-the-filament-tpu-87a | 19 | 4 | 2 | 2 | 0 |
| S-SPECTRUM-eng-tds-the-filament-pla-hs | 20 | 4 | 2 | 3 | 0 |
| S-SPECTRUM-en-tds-spectrum-pla-esd | 23 | 4 | 2 | 0 | 1 |
| S-SPECTRUM-EN-TDS-Spectrum-PLA-Metal-Brass | 21 | 4 | 2 | 2 | 0 |
| S-SPECTRUM-EN-TDS-Spectrum-PLA-Metal-Bronze | 21 | 4 | 2 | 2 | 0 |
| S-SPECTRUM-EN-TDS-Spectrum-PLA-Metal-Copper | 21 | 4 | 2 | 2 | 0 |
| S-SPECTRUM-EN-TDS-Spectrum-SFLEX-98A | 27 | 4 | 2 | 1 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-PA-neat | 22 | 4 | 2 | 2 | 0 |
| R-3D4MAKERS-TDS-ABS-Kevlar-filament-3D4Makers-V1 | 17 | 3 | 2 | 2 | 0 |
| S-TPC | 23 | 3 | 2 | 4 | 0 |
| R-FILAMENT2PRINT-CreatBot-PLA | 29 | 3 | 2 | 4 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-Flexfill-TPU-98A-26082019 | 19 | 3 | 2 | 1 | 0 |
| R-COLORFABB-TDS-LUVOCOM-3F-Filaments-9825-NT | 47 | 3 | 2 | 27 | 5 |
| R-NINJATEK-TDS-EEL-Revision1-26-06-V1 | 21 | 3 | 2 | 3 | 0 |
| S-SPECTRUM-en-tds-spectrum-pp-42aa71 | 22 | 3 | 2 | 0 | 0 |
| S-SPECTRUM-eng-tds-the-filament-pla-cf | 18 | 3 | 2 | 3 | 0 |
| R-3DJAKE-EN-TDS-LumberLay-pptx | 35 | 3 | 2 | 0 | 0 |
| R-FABRU-PUREFIL-43-material-data-sheet-wood-filament-purefil | 15 | 3 | 2 | 1 | 0 |
| R-FABRU-PUREFIL-58-Korkfilament-purefil-Material-Data-en | 15 | 3 | 2 | 1 | 0 |
| R-FABRU-PUREFIL-680-Materialdatenblatt-ABS-GF10-purefil | 17 | 3 | 2 | 1 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-PLA-Crystal-Clear-03012019 | 18 | 3 | 2 | 3 | 0 |
| R-FILLAMENTUM-FLEXFILL-PEBA-90A-TDS | 24 | 3 | 2 | 4 | 0 |
| R-NANOVIA-PC-CF | 23 | 3 | 2 | 0 | 0 |
| R-NANOVIA-PETG-ESD | 27 | 3 | 2 | 0 | 0 |
| S-SPECTRUM-en-tds-the-filament-asa-cf | 22 | 3 | 2 | 1 | 0 |
| S-SPECTRUM-en-tds-the-filament-ht-pla | 22 | 3 | 2 | 1 | 0 |
| S-SPECTRUM-en-tds-the-filament-petg-lite | 18 | 3 | 2 | 1 | 0 |
| S-SPECTRUM-en-tds-the-filament-pla-lite | 18 | 3 | 2 | 1 | 0 |
| S-SPECTRUM-en-tds-the-filament-pla-matte | 19 | 3 | 2 | 1 | 0 |
| S-SPECTRUM-en-tds-the-filament-tpu-95a | 17 | 3 | 2 | 1 | 0 |
| S-SPECTRUM-EN-TDS-Spectrum-HDPE | 20 | 3 | 2 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-hdpe | 20 | 3 | 2 | 0 | 0 |
| S-SPECTRUM-EN-TDS-Spectrum-PEBA | 21 | 3 | 2 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-peba | 21 | 3 | 2 | 0 | 0 |
| S-SPECTRUM-EN-TDS-Spectrum-PLA-ESD | 23 | 3 | 2 | 0 | 1 |
| R-COLORFABB-PRINT-20260928-25ef08309fc5 | 12 | 2 | 2 | 0 | 0 |
| R-FABRU-PUREFIL-656-Materialdatenblatt-PBT-purefil | 15 | 2 | 2 | 1 | 0 |
| R-FABRU-PUREFIL-787-Materialdatenblatt-SAN-purefil | 15 | 2 | 2 | 0 | 0 |
| R-FILLAMENTUM-TDS-Vinyl-303-FI | 12 | 2 | 2 | 1 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-Flexfill-TPE-90A | 14 | 2 | 2 | 3 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-Flexfill-TPE-96A | 14 | 2 | 2 | 3 | 0 |
| D-RAISE3D-Raise3D-Industrial-PET-Support-TDS-V1 | 14 | 2 | 2 | 1 | 0 |
| R-3D-FUEL-3D-Fuel-Pro-PETG-9-22-25 | 32 | 2 | 2 | 6 | 0 |
| XP-carbonx-petg-cf-1 | 10 | 2 | 2 | 0 | 0 |
| R-FABRU-PUREFIL-8503-Material-data-sheet-PLA-purefil | 15 | 2 | 2 | 1 | 0 |
| R-NINJATEK-Cheetah-TDS | 32 | 2 | 2 | 0 | 0 |
| PR-prusament-pla-high-speed | 19 | 2 | 2 | 0 | 0 |
| D-RAISE3D-Industrial-PPA-CF-TDS-V2-0 | 25 | 2 | 2 | 2 | 0 |
| D-3D4MAKERS-ABS-KEVLAR-PAGE | 18 | 1 | 2 | 0 | 0 |
| XP-carbonx-pla-cf-1 | 12 | 1 | 2 | 0 | 0 |
| R-BIGREP-EZBYxVrNV7NGt4xXE3UWWuwBPYBbMpjmGobs-fcxZTeadg | 17 | 1 | 2 | 0 | 0 |
| R-FABRU-PUREFIL-4706-material-data-sheet-LCP-purefil | 16 | 1 | 2 | 0 | 0 |
| S-PET-formfutura-tds-athenaxcf10 | 14 | 1 | 2 | 0 | 0 |
| R-NINJATEK-Armadillo-TDS | 25 | 1 | 2 | 2 | 0 |
| XP-3dxmax-r-pc | 10 | 1 | 2 | 0 | 0 |
| R-BIGREP-ETc3xC8Tf1xLsCQNb96LTKcBFORK1-vyseiwkW-aUdjaJw | 15 | 1 | 2 | 0 | 0 |
| R-FABRU-PUREFIL-17-Materialdatenblatt-ASA-purefil | 16 | 1 | 2 | 1 | 0 |
| R-FABRU-PUREFIL-3-material-data-sheet-ABS-purefil | 19 | 1 | 2 | 1 | 0 |
| R-FABRU-PUREFIL-88-material-data-sheet-MABS-purefil | 15 | 1 | 2 | 1 | 0 |
| R-FILLAMENTUM-CPE-HG100-TDS | 22 | 1 | 2 | 3 | 0 |
| D-MATTERHACKERS-MH-BUILD-PLA-PAGE | 8 | 1 | 2 | 0 | 0 |
| R-NINJATEK-NinjaFlex-TDS | 31 | 1 | 2 | 2 | 0 |
| R-ULTIMAKER-MakerBot-Nylon-092020 | 22 | 1 | 2 | 6 | 0 |
| R-FIBERLOGY-FIBERLOGY-FIBERFLEX-CF-TDS | 17 | 0 | 2 | 1 | 0 |
| R-FIBERLOGY-FIBERLOGY-FIBERFLEXCF-TDS | 17 | 0 | 2 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-PP-TDS | 14 | 0 | 2 | 4 | 0 |
| R-FABRU-16-material-datat-sheet-ASA-purefil | 16 | 0 | 2 | 0 | 0 |
| R-FABRU-PUREFIL-3512-material-data-sheet-PC-purefil | 16 | 0 | 2 | 1 | 0 |
| R-FABRU-PUREFIL-3519-Material-data-sheet-POM-purefil | 17 | 0 | 2 | 1 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-ASA-Extrafill-03012019 | 18 | 0 | 2 | 2 | 0 |
| D-MATTERHACKERS-MH-BUILD-PETG-2-85MM-PAGE | 8 | 0 | 2 | 0 | 0 |
| D-MATTERHACKERS-MH-BUILD-TPU-PAGE | 9 | 0 | 2 | 0 | 0 |
| R-STRATASYS-mds-fdm-asa-0826a | 158 | 50 | 1 | 33 | 0 |
| R-RECREUS-Conductive-Filaflex | 66 | 45 | 1 | 4 | 0 |
| R-EXTRUDR-PRIORITY-20261003-4eb5a75440e8 | 45 | 25 | 1 | 0 | 0 |
| R-SUNLU-5156fe91-c7a8-48bd-9d1a-e753bf9c53a1 | 49 | 23 | 1 | 11 | 0 |
| R-SUNLU-5644650b-5633-42fb-b06a-6d1e125c9114 | 49 | 23 | 1 | 10 | 0 |
| R-SUNLU-63d55fe5-d33b-47f2-8930-520f193ade51 | 49 | 23 | 1 | 10 | 0 |
| R-SUNLU-91c03fbc-a5c0-4711-b3ae-10d0efd19f27 | 49 | 23 | 1 | 11 | 0 |
| R-EXTRUDR-PRIORITY-20261003-1d34d7823a2a | 37 | 21 | 1 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261002-1b7d35606338 | 31 | 21 | 1 | 0 | 0 |
| D-CREATBOT-PLA-CF-PAGE | 32 | 20 | 1 | 0 | 0 |
| R-EXTRUDR-PRIORITY-20261003-b3aff68293fc | 38 | 20 | 1 | 0 | 0 |
| S-PEBA-eSUN-PLA-Clear-Filament-TDS-V4-0 | 30 | 19 | 1 | 5 | 4 |
| S-PEBA-eSUN-TPU-HS-Filament-TDS | 32 | 19 | 1 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261003-56f939384206 | 30 | 19 | 1 | 0 | 0 |
| S-POLYCN-Polylite-PLA-Pro-EN-V5-1-3-6 | 57 | 19 | 1 | 5 | 0 |
| S-PEBA-TPU-64D-TDS | 41 | 17 | 1 | 1 | 1 |
| R-EXTRUDR-pla-basic-cf-TDS-en | 26 | 17 | 1 | 2 | 0 |
| S-POLYCN-TDS-Polymaker-Polylite-PLA-CF-V6-0-2026-06-09-EN | 50 | 17 | 1 | 5 | 0 |
| S-PEBA-PETG-Basic-TDS | 45 | 17 | 1 | 3 | 1 |
| R-BIGREP-EbCK6vuDEMZAre3SgyY8Y2IBbx5LFjMs5Zw5lH43SKl3iw | 22 | 16 | 1 | 18 | 0 |
| R-ERYONE-eryone-silk-pla-dual-color-tds | 26 | 16 | 1 | 0 | 4 |
| R-ERYONE-eryone-hyper-speed-triple-color-silk-pla-tds | 26 | 16 | 1 | 1 | 3 |
| R-ERYONE-eryone-silk-pla-tri-color-tds | 28 | 16 | 1 | 3 | 2 |
| S-SPECTRUM-en-tds-spectrum-pla-silk-93646a | 23 | 16 | 1 | 0 | 1 |
| D-ESUN-EPLA-LITE-PRODUCT-PAGE | 23 | 16 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-safeguard-pla | 24 | 15 | 1 | 0 | 1 |
| R-STRATASYS-mds-fdm-pa6-66-gf30-fr-0726a | 90 | 15 | 1 | 17 | 0 |
| B-pla-silk-upgrade-TDS | 46 | 14 | 1 | 1 | 0 |
| R-3DJAKE-3DJAKE-TDS-PLA | 26 | 14 | 1 | 13 | 0 |
| S-PEBA-PC-HT-TDS | 43 | 14 | 1 | 1 | 0 |
| S-PEBA-PETG-CF-TDS-V1-2024-07-02 | 32 | 14 | 1 | 2 | 0 |
| S-SPECTRUM-en-tds-spectrum-pla-thermoactive | 25 | 14 | 1 | 1 | 0 |
| R-3D4MAKERS-PRINT-20260928-8d7352c2d77f | 23 | 13 | 1 | 0 | 0 |
| R-SUNLU-fbfe6e74-b29f-4f0f-a9b3-84aaa6b2fc85 | 46 | 13 | 1 | 9 | 0 |
| R-3DJAKE-3DJAKE-TDS-ASA-Prime-pptx | 34 | 13 | 1 | 18 | 0 |
| S-PEBA-eSUN-Twinkling-Filament-TDS-V4-0 | 30 | 13 | 1 | 1 | 0 |
| S-PEBA-PETG-TDS-en | 41 | 13 | 1 | 5 | 1 |
| S-PEBA-PLA-Basic-TDS-V1-2024-08-07 | 32 | 13 | 1 | 2 | 0 |
| S-PEBA-PLA-CMYK-TDS-2024-06-30 | 31 | 13 | 1 | 2 | 0 |
| R-EXTRUDR-durapro-pa12-cf-TDS-it | 35 | 13 | 1 | 3 | 0 |
| R-EXTRUDR-durapro-pc-fr-v0-TDS-de | 61 | 13 | 1 | 6 | 0 |
| D-FLASH-TPU-TDS-EN | 34 | 13 | 1 | 1 | 0 |
| S-SPECTRUM-pl-tds-spectrum-high-speed | 21 | 13 | 1 | 2 | 0 |
| R-SUNLU-46dca9d5-d877-4a9d-b416-3ad38450204a | 45 | 13 | 1 | 4 | 0 |
| R-SUNLU-PLA-Classic-TDS | 48 | 13 | 1 | 0 | 0 |
| S-PEBA-PLA-Cast-TDS-EN-2025-8-27 | 41 | 12 | 1 | 3 | 1 |
| D-RAISE3D-Raise3D-Industrial-PPS-CF-TDS-V1-1 | 57 | 12 | 1 | 22 | 0 |
| D-SIRAYA-siraya-tech-fibreheart-abs-cf-core-tds | 29 | 12 | 1 | 0 | 0 |
| R-SUNLU-High-Speed-Matte-PETG-TDS | 48 | 12 | 1 | 3 | 0 |
| R-3DJAKE-EN-TDS-The-Filament-HT-PLA | 20 | 12 | 1 | 1 | 1 |
| D-FLASH-PLA-CF-TDS-EN | 29 | 11 | 1 | 0 | 0 |
| R-SUNLU-27be2474-b2dd-45b3-8a14-5f742b314e33 | 49 | 11 | 1 | 10 | 0 |
| S-PEBA-ABS-CF-TDS-V1-2024-07-02 | 29 | 11 | 1 | 1 | 0 |
| S-PEBA-ABS-GF-TDS-V1-2024-07-02 | 29 | 11 | 1 | 1 | 0 |
| S-PCGF-PET-CF-TDS | 25 | 11 | 1 | 12 | 0 |
| S-SPECTRUM-pl-tds-spectrum-petg-carbon | 22 | 11 | 1 | 2 | 0 |
| R-SUNLU-bbf6d99b-179f-4eee-a7d6-505d125658cd | 44 | 11 | 1 | 0 | 0 |
| R-SUNLU-cc96ba09-b739-4afb-851f-bcdd5f02dc2b | 44 | 11 | 1 | 1 | 0 |
| R-SUNLU-PLA-Glow-in-the-Dark | 44 | 11 | 1 | 0 | 0 |
| R-3D4MAKERS-TDS-Facilan-HT-ElogioAM-v1-4 | 25 | 10 | 1 | 2 | 0 |
| D-FIBERLOGY-FIBERFLEXCF-FILAMENT-S2-PAGE | 23 | 10 | 1 | 0 | 0 |
| D-FLASH-PLA-Silk-TDS-EN | 27 | 10 | 1 | 0 | 0 |
| S-PET-TDS-AthenaX-GF10 | 16 | 10 | 1 | 1 | 0 |
| D-BIGREP-PLX-PAGE | 17 | 10 | 1 | 0 | 0 |
| S-PEBA-ePLA-HS | 27 | 10 | 1 | 1 | 0 |
| R-EXTRUDR-durapro-asa-gf-TDS-en-458d69 | 29 | 10 | 1 | 1 | 0 |
| R-EXTRUDR-flex-semisoft-TDS-en | 34 | 10 | 1 | 0 | 0 |
| D-FLASH-PA6-GF-TDS-EN | 36 | 10 | 1 | 4 | 0 |
| S-POLYFLEX-TPU95-PAGE | 21 | 10 | 1 | 0 | 0 |
| R-QIDI-PRINT-20260928-1988d9088956 | 20 | 10 | 1 | 0 | 0 |
| R-3DJAKE-EN-TDS-The-Filament-ASA | 20 | 10 | 1 | 1 | 0 |
| R-3DJAKE-EN-TDS-The-Filament-ASA-CF | 20 | 10 | 1 | 1 | 1 |
| R-EXTRUDR-flex-hard-cf-TDS-en | 32 | 9 | 1 | 1 | 0 |
| R-FABRU-3542-Material-data-sheet-SAN-purefil | 15 | 9 | 1 | 0 | 0 |
| R-3D4MAKERS-TDS-Facilan-C8-Filament-v1-4 | 23 | 9 | 1 | 2 | 0 |
| D-BIGREP-RPLA-PAGE | 16 | 9 | 1 | 0 | 0 |
| R-EXTRUDR-pla-nx2-matt-TDS-it | 26 | 9 | 1 | 0 | 0 |
| R-EXTRUDR-PRIORITY-20261003-4f4b613ed9d4 | 38 | 9 | 1 | 0 | 0 |
| R-FIBERLOGY-PRINT-20260928-78dc0a4f3640 | 25 | 9 | 1 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261002-bd52e168c6e3 | 19 | 9 | 1 | 0 | 0 |
| S-POLYCN-TDS-Polymaker-PolyLite-PLA-Pro-V5-6-2026-01-05-EN | 44 | 9 | 1 | 0 | 1 |
| R-QIDI-PETG-TOUGH | 40 | 9 | 1 | 5 | 0 |
| R-QIDI-TPU95A-HF | 29 | 9 | 1 | 0 | 0 |
| D-SIRAYA-TECH-PRINT-20260928-9c9cd82ced8e | 31 | 9 | 1 | 0 | 0 |
| D-SUNLU-TPU-95A-PAGE | 22 | 9 | 1 | 0 | 0 |
| R-3DJAKE-EN-TDS-The-Filament-PLA-Matte | 17 | 9 | 1 | 1 | 1 |
| D-ESUN-EPLA-SILK-RAINBOW-PRODUCT-PAGE | 20 | 8 | 1 | 0 | 0 |
| R-EXTRUDR-flex-hard-TDS-en-cbd667 | 33 | 8 | 1 | 1 | 1 |
| R-EXTRUDR-flex-medium-esd-TDS-en | 28 | 8 | 1 | 1 | 0 |
| R-EXTRUDR-flex-medium-TDS-en-d2c5e4 | 33 | 8 | 1 | 1 | 0 |
| R-EXTRUDR-pctg-TDS-en | 30 | 8 | 1 | 2 | 0 |
| R-EXTRUDR-PRINT-20260929-245381f760f8 | 38 | 8 | 1 | 0 | 0 |
| R-EXTRUDR-PRINT-20260929-ca0239ac2a92 | 38 | 8 | 1 | 0 | 0 |
| R-EXTRUDR-PRINT-20260929-2cccd500d85c | 42 | 8 | 1 | 0 | 0 |
| R-EXTRUDR-PRINT-20260929-3793d04515ce | 37 | 8 | 1 | 0 | 0 |
| R-FABRU-652-Fiche-technique-du-mat-riau-PBT-purefil | 16 | 8 | 1 | 1 | 0 |
| R-FABRU-PUREFIL-7782-Materialdatenblatt-PVC-P-purefil | 17 | 8 | 1 | 0 | 0 |
| S-SPECTRUM-PRINT-20260928-e6a9efb89400 | 16 | 8 | 1 | 0 | 0 |
| R-COVERAGE-20261001-3c9c76d4bb7c | 21 | 8 | 1 | 0 | 0 |
| R-SUNLU-COVERAGE-20261001-5b7089593d2d | 19 | 8 | 1 | 0 | 0 |
| R-ESUN-PRIORITY-20261003-e4a67e70f66b | 26 | 8 | 1 | 0 | 0 |
| R-EXTRUDR-flex-semisoft-TDS-en-f4e958 | 32 | 8 | 1 | 0 | 0 |
| R-EXTRUDR-pla-nx2-TDS-en | 26 | 8 | 1 | 0 | 0 |
| R-EXTRUDR-PRINT-20260929-c415150859a4 | 30 | 8 | 1 | 0 | 0 |
| R-FABRU-PUREFIL-82-material-data-sheet-LW-PLA-purefil | 22 | 8 | 1 | 1 | 0 |
| D-FIBERLOGY-PLA-IMPACT-FILAMENT-PAGE | 15 | 8 | 1 | 0 | 3 |
| D-FLASH-PC-CF-TDS-EN | 36 | 8 | 1 | 4 | 0 |
| S-PET-formfutura-tds-apollox2024 | 21 | 8 | 1 | 3 | 1 |
| S-PET-formfutura-tds-easyfilabs-glowinthedark | 23 | 8 | 1 | 0 | 0 |
| S-PET-formfutura-tds-reformrapollo | 21 | 8 | 1 | 4 | 1 |
| S-POLYCN-TDS-Polymaker-ABS-Max-V1-1-2026-06-01-EN | 44 | 8 | 1 | 4 | 1 |
| S-POLYCN-TDS-Polymaker-PolyMax-PLA-V5-5-2026-01-06-EN | 46 | 8 | 1 | 0 | 1 |
| D-SIRAYA-fibreheart-tpu-gf-filament-tds | 34 | 8 | 1 | 0 | 0 |
| S-SPECTRUM-EN-TDS-Spectrum-PLA-Glow-in-the-Dark-0 | 25 | 8 | 1 | 3 | 0 |
| S-SPECTRUM-en-tds-spectrum-smart-abs | 27 | 8 | 1 | 0 | 0 |
| R-SUNLU-9ecc53a5-f50a-4687-97fc-fab43b1db35b | 44 | 8 | 1 | 2 | 0 |
| R-3DJAKE-EN-TDS-The-Filament-PETG-Lite | 16 | 8 | 1 | 1 | 0 |
| R-3DJAKE-EN-TDS-The-Filament-PLA-Lite | 16 | 8 | 1 | 1 | 0 |
| S-PEBA-ePLA-CF-TDS | 28 | 7 | 1 | 0 | 0 |
| S-PEBA-eSUN-PLA-GF-Filament-TDS-V1-0-1 | 28 | 7 | 1 | 1 | 0 |
| R-EXTRUDR-flex-hard-cf-TDS-en-7bbe64 | 32 | 7 | 1 | 1 | 0 |
| R-EXTRUDR-flex-hard-TDS-en | 34 | 7 | 1 | 1 | 1 |
| R-EXTRUDR-flex-medium-TDS-en | 34 | 7 | 1 | 1 | 0 |
| R-EXTRUDR-greentec-pro-cf-TDS-en | 28 | 7 | 1 | 2 | 0 |
| R-EXTRUDR-greentec-pro-TDS-en | 28 | 7 | 1 | 1 | 0 |
| R-EXTRUDR-greentec-TDS-en | 28 | 7 | 1 | 1 | 0 |
| D-FIBERLOGY-PETGPTFE-FILAMENT-PAGE | 18 | 7 | 1 | 0 | 0 |
| S-POLYCN-Polymaker-HT-PLA-GF-TDS-EN-V1-1 | 67 | 7 | 1 | 4 | 0 |
| S-PCGF-PA-TDS-Siddament | 22 | 7 | 1 | 0 | 0 |
| S-PCGF-PLA-Carbon-Fiber-TDS-Siddament | 22 | 7 | 1 | 0 | 0 |
| S-PCGF-PLA-Silk-TDS-Siddament | 22 | 7 | 1 | 0 | 0 |
| S-SPECTRUM-PRINT-20260928-fd0f508a9a5c | 18 | 7 | 1 | 1 | 0 |
| R-3D4MAKERS-TDS-ABS-ESD-3D4Makers | 20 | 7 | 1 | 4 | 1 |
| R-3D4MAKERS-TDS-PETG-Carbon-Filament-3D4Makers | 18 | 7 | 1 | 3 | 1 |
| R-3DJAKE-3DJAKE-Technical-Data-Sheet-nice-essentials-PLA-Basic-V1-0 | 22 | 7 | 1 | 0 | 0 |
| R-EXTRUDR-durapro-asa-cf-TDS-en-533984 | 27 | 7 | 1 | 1 | 0 |
| R-FABRU-220-Material-data-sheet-PVA-purefil | 15 | 7 | 1 | 2 | 0 |
| D-FIBERLOGY-PETGCF-FILAMENT-PAGE | 19 | 7 | 1 | 0 | 0 |
| D-FLASH-ABS-GF-TDS-EN | 35 | 7 | 1 | 3 | 0 |
| S-POLYCN-TDS-Polymaker-PolyFlex-TPU90-V5-6-2025-12-11-EN | 32 | 7 | 1 | 0 | 1 |
| S-POLYCN-TDS-Polymaker-PolyMax-PETG-V5-5-2026-01-06-EN | 44 | 7 | 1 | 0 | 1 |
| D-RAISE3D-Raise3D-Hyper-Speed-PETG-CF-TDS-V1-0 | 37 | 7 | 1 | 5 | 0 |
| S-PCGF-ABS-Carbon-Fiber-TDS-Siddament | 25 | 7 | 1 | 2 | 0 |
| S-PCGF-ABS-TDS-Siddament | 25 | 7 | 1 | 2 | 0 |
| S-PCGF-ASA-Carbon-Fiber-TDS-Siddament | 25 | 7 | 1 | 2 | 0 |
| S-PCGF-ASA-TDS-Siddament | 25 | 7 | 1 | 2 | 0 |
| S-PCGF-PC-Carbon-Fiber-TDS-Siddament | 25 | 7 | 1 | 2 | 0 |
| S-PCGF-PC-TDS-Siddament | 25 | 7 | 1 | 2 | 0 |
| S-PCGF-TPU-95A-TDS-Siddament | 21 | 7 | 1 | 1 | 0 |
| D-SIRAYA-fibreheart-petg-cf-pro-filament-technical-data-tds | 32 | 7 | 1 | 0 | 0 |
| D-SIRAYA-siraya-tech-rebound-peba-95a-tds | 30 | 7 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-petg-ht100 | 23 | 7 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-sflex-90a | 20 | 7 | 1 | 0 | 0 |
| D-3D4MAKERS-FACILAN-PCL-100-FILAMENT-PAGE | 23 | 6 | 1 | 0 | 0 |
| R-BIGREP-Ec5wx9MmYX1KseTcD5XV1IABzL0ure69YNjObGyOPwDL-w | 18 | 6 | 1 | 10 | 0 |
| D-COLORFABB-HOW-TO-PRINT-WITH-NGEN-PAGE | 14 | 6 | 1 | 0 | 0 |
| S-PET-TDS-MDflex | 21 | 6 | 1 | 8 | 0 |
| S-PEBA-79f73c22-1 | 26 | 6 | 1 | 0 | 0 |
| R-EXTRUDR-durapro-pa12-TDS-en | 35 | 6 | 1 | 2 | 0 |
| R-EXTRUDR-flex-medium-esd-TDS-en-eb4012 | 29 | 6 | 1 | 1 | 0 |
| R-NANOVIA-Insublend | 57 | 6 | 1 | 0 | 0 |
| R-NANOVIA-PC-PTFE | 25 | 6 | 1 | 0 | 0 |
| R-EXTRUDR-biofusion-TDS-en | 23 | 6 | 1 | 1 | 0 |
| R-EXTRUDR-durapro-abs-cf-TDS-en | 27 | 6 | 1 | 1 | 0 |
| R-EXTRUDR-durapro-abs-TDS-en | 27 | 6 | 1 | 1 | 0 |
| R-EXTRUDR-durapro-asa-cf-TDS-en | 27 | 6 | 1 | 1 | 0 |
| R-EXTRUDR-durapro-asa-gf-TDS-en | 25 | 6 | 1 | 1 | 0 |
| R-EXTRUDR-pla-basic-TDS-en | 24 | 6 | 1 | 0 | 0 |
| R-EXTRUDR-pla-tough-TDS-en | 25 | 6 | 1 | 0 | 0 |
| R-FABRU-PUREFIL-2186-Materialdatenblatt-PETG-purefil | 16 | 6 | 1 | 4 | 1 |
| D-FIBERLOGY-NYLON-PA12GF-FILAMENT-PAGE | 21 | 6 | 1 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-R-PLA-TDS-0 | 21 | 6 | 1 | 5 | 0 |
| R-FILAMENT2PRINT-Eco-Coffee | 30 | 6 | 1 | 2 | 0 |
| S-PET-formfutura-tds-titanx | 18 | 6 | 1 | 6 | 0 |
| R-YOUSU-YOUSUPCTDS-535a | 28 | 6 | 1 | 6 | 1 |
| R-NANOVIA-PC | 33 | 6 | 1 | 0 | 0 |
| S-POLYCN-PolyFlex-TPU90-PIS-EN-V1-2 | 27 | 6 | 1 | 0 | 0 |
| D-RAISE3D-Raise3D-Premium-PLA-TDS-V6-0-EN | 30 | 6 | 1 | 0 | 1 |
| D-RAISE3D-Raise3D-Premium-PVA-TDS-V2-1-2021-06 | 17 | 6 | 1 | 3 | 0 |
| S-PCGF-PETG-Matte-TDS-Siddament | 21 | 6 | 1 | 1 | 0 |
| S-PCGF-PETG-TDS-Siddament | 21 | 6 | 1 | 1 | 0 |
| S-PCGF-PLA-Glow-in-the-Dark-TDS-Siddament | 21 | 6 | 1 | 1 | 0 |
| S-PCGF-PLA-Marble-TDS-Siddament | 21 | 6 | 1 | 1 | 0 |
| S-PCGF-PLA-Matte-TDS-Siddament | 21 | 6 | 1 | 1 | 0 |
| S-PCGF-PLA-TDS-Siddament | 21 | 6 | 1 | 1 | 0 |
| S-PCGF-PLA-Wood-TDS-Siddament | 21 | 6 | 1 | 1 | 0 |
| S-SPECTRUM-en-tds-petg-frv0 | 30 | 6 | 1 | 1 | 0 |
| S-SPECTRUM-en-tds-spectrum-pctg-cf10 | 22 | 6 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-pet-cf15 | 24 | 6 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-petg-carbon | 19 | 6 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-petg-premium | 24 | 6 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-pla-crystal | 19 | 6 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-pla-glitter | 26 | 6 | 1 | 1 | 0 |
| S-SPECTRUM-en-tds-spectrum-pla-huracan | 23 | 6 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-pla-pastello | 20 | 6 | 1 | 2 | 0 |
| S-SPECTRUM-en-tds-spectrum-pla-pro | 26 | 6 | 1 | 0 | 0 |
| S-SPECTRUM-EN-TDS-Spectrum-PLA-Pro-2 | 26 | 6 | 1 | 0 | 0 |
| R-FILLAMENTUM-PRINT-20260928-5f11a7e57e06 | 11 | 5 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-pla-carbon | 23 | 5 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-thermatech-pa | 23 | 5 | 1 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-hyper-ABS-EN | 25 | 5 | 1 | 12 | 0 |
| R-3DJAKE-3DJAKE-TDS-PLA-MATTE | 35 | 5 | 1 | 1 | 0 |
| R-BIGREP-EajSvqXsqMZDmdON2v3rhnQBDgGH-1IuRzfjv5WgPXKsQA | 16 | 5 | 1 | 8 | 0 |
| S-PEBA-PLA-Matte-Dual-Filament-TDS-V4-0 | 23 | 5 | 1 | 1 | 0 |
| S-PEBA-PLA-UV-Color-Change-FilamentTDS | 23 | 5 | 1 | 1 | 0 |
| R-EXTRUDR-durapro-asa-TDS-en | 29 | 5 | 1 | 1 | 0 |
| R-EXTRUDR-durapro-pa6-cf-TDS-en | 28 | 5 | 1 | 2 | 0 |
| R-EXTRUDR-durapro-pa6-gf-TDS-en | 28 | 5 | 1 | 2 | 0 |
| R-EXTRUDR-pla-basic-cmyk-TDS-en | 24 | 5 | 1 | 0 | 0 |
| R-EXTRUDR-PRINT-20260929-5f1378a7bff2 | 37 | 5 | 1 | 0 | 0 |
| R-EXTRUDR-xpetg-cf-TDS-en | 25 | 5 | 1 | 0 | 0 |
| R-EXTRUDR-xpetg-matt-TDS-en | 26 | 5 | 1 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-EASY-PLA-TDS-1 | 18 | 5 | 1 | 3 | 0 |
| R-NANOVIA-PLA-EF-3D850 | 27 | 5 | 1 | 0 | 0 |
| S-POLYCN-TDS-Polymaker-PolySupport-v5-5-2026-01-14-EN | 23 | 5 | 1 | 0 | 0 |
| R-3DJAKE-TDS-Iron-PLA-1-0-1 | 23 | 5 | 1 | 1 | 0 |
| D-SIRAYA-siraya-tech-rebound-peba-air-70a-95a-tds | 38 | 5 | 1 | 0 | 1 |
| S-SPECTRUM-en-tds-petg-matt | 26 | 5 | 1 | 1 | 0 |
| S-SPECTRUM-en-tds-spectrum-abs-gp450 | 26 | 5 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-asa-275 | 31 | 5 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-asax-cf10 | 27 | 5 | 1 | 3 | 0 |
| S-SPECTRUM-en-tds-spectrum-asax-x-gf10 | 26 | 5 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-flameguard-asa-275 | 32 | 5 | 1 | 0 | 1 |
| S-SPECTRUM-en-tds-spectrum-high-speed | 23 | 5 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-hipsx | 29 | 5 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-medical | 26 | 5 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-pla-matt | 22 | 5 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-pla-premium | 24 | 5 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-pla-tough | 28 | 5 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-rpetg | 23 | 5 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-rpla | 23 | 5 | 1 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-sflex-85a | 25 | 5 | 1 | 1 | 0 |
| S-SPECTRUM-EN-TDS-Spectrum-SFLEX-90A-4 | 20 | 5 | 1 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-ecoPLA-Silk-Rainbow-v1-1 | 16 | 4 | 1 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-ecoPLA-Silk-v1-1 | 18 | 4 | 1 | 0 | 0 |
| R-EXTRUDR-flax-TDS-en | 21 | 4 | 1 | 2 | 0 |
| R-FABRU-10204-material-data-sheet-TPS-40D-purefil | 16 | 4 | 1 | 1 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-Fluorodur-EN-09122020-FI | 16 | 4 | 1 | 3 | 0 |
| S-SPECTRUM-PRINT-20260928-8e41085d4373 | 12 | 4 | 1 | 0 | 0 |
| R-COLORFABB-PRINT-20260928-66635037e973 | 11 | 4 | 1 | 0 | 0 |
| R-COLORFABB-PRINT-20260928-7293b4d77f79 | 11 | 4 | 1 | 0 | 0 |
| R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--25961c | 26 | 4 | 1 | 3 | 0 |
| R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--6b5ac4 | 24 | 4 | 1 | 3 | 0 |
| R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--fbbd78 | 22 | 4 | 1 | 2 | 0 |
| R-EXTRUDR-pearl-TDS-en | 23 | 4 | 1 | 0 | 0 |
| R-EXTRUDR-wood-TDS-en | 20 | 4 | 1 | 0 | 0 |
| R-FABRU-PUREFIL-749-Materialdatenblatt-PLA-purefil | 16 | 4 | 1 | 1 | 0 |
| S-PET-formfutura-tds-pythonflex90a | 11 | 4 | 1 | 1 | 0 |
| I-PLA-ABS-TDS | 26 | 4 | 1 | 6 | 0 |
| I-PLA-PLA-Wood-TDS | 16 | 4 | 1 | 1 | 0 |
| S-POLYCN-TDS-Polymaker-ABS-Pro-V1-1-2026-06-01-EN | 41 | 4 | 1 | 5 | 1 |
| S-POLYCN-TDS-Polymaker-PETG-V2-0-2025-11-17 | 44 | 4 | 1 | 13 | 1 |
| S-POLYCN-TDS-Polymaker-PLA-Pro-v6-0-2026-01-30-EN | 45 | 4 | 1 | 0 | 1 |
| S-POLYCN-TDS-Polymaker-PolyFlex-TPU95-HF-V5-5-2025-12-29-EN | 32 | 4 | 1 | 0 | 1 |
| S-POLYCN-TDS-Polymaker-PolyFlex-TPU95-V5-5-2025-12-29-EN | 32 | 4 | 1 | 0 | 1 |
| S-SPECTRUM-en-tds-spectrum-flameguard-pla | 24 | 4 | 1 | 0 | 0 |
| R-BASF-FORWARD-AM-PRINT-20260928-cacfb4f14e40 | 18 | 3 | 1 | 0 | 0 |
| S-BVOH | 21 | 3 | 1 | 7 | 0 |
| X-EVOLV3D-OBC-TDS | 31 | 3 | 1 | 1 | 1 |
| R-FABRU-PUREFIL-233-Material-data-sheet-TPC-purefil | 15 | 3 | 1 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-FIBERFLEX30D-TDS | 14 | 3 | 1 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-FIBERFLEX40D-TDS | 84 | 3 | 1 | 53 | 0 |
| R-FIBERLOGY-FIBERLOGY-MATTFLEX-40D-TDS-1 | 16 | 3 | 1 | 1 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-Nylon-AF80-Aramid | 16 | 3 | 1 | 3 | 0 |
| D-SPECTRUM-PLA-SILK-RAINBOW-PAGE | 11 | 3 | 1 | 0 | 0 |
| S-SPECTRUM-PRINT-20260928-3741c527491c | 16 | 3 | 1 | 0 | 0 |
| R-3DJAKE-EN-TDS-PETG-Graphene-Light | 15 | 3 | 1 | 5 | 0 |
| R-COVERAGE-20261001-0b9610f07886 | 12 | 3 | 1 | 0 | 0 |
| R-COVERAGE-20261001-bc88189b518f | 14 | 3 | 1 | 0 | 0 |
| D-3D4MAKERS-PETG-CARBON-PAGE | 15 | 3 | 1 | 0 | 0 |
| R-3DJAKE-3DJAKE-EN-TDS-The-Filament-TPU-82A | 17 | 3 | 1 | 0 | 0 |
| R-3DJAKE-3DJAKE-EN-TDS-The-Filament-TPU-87A | 17 | 3 | 1 | 0 | 0 |
| R-3DJAKE-3DJAKE-EN-TDS-The-Filament-TPU-95A | 17 | 3 | 1 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-magicPLA | 16 | 3 | 1 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-mysteryPLA-v1-1 | 16 | 3 | 1 | 0 | 0 |
| R-ERYONE-eryone-glow-in-the-dark-pla-tds | 24 | 3 | 1 | 6 | 0 |
| R-ERYONE-eryone-standard-pla-tds | 26 | 3 | 1 | 4 | 0 |
| R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--1d9fed | 27 | 3 | 1 | 5 | 0 |
| R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--41b571 | 28 | 3 | 1 | 3 | 0 |
| R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--92f474 | 28 | 3 | 1 | 5 | 0 |
| R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--9a96a3 | 27 | 3 | 1 | 4 | 0 |
| R-ERYONE-PRINT-20260928-3266824b2135 | 10 | 3 | 1 | 0 | 0 |
| R-FABRU-4691-material-data-sheet-PLA-purefil | 17 | 3 | 1 | 0 | 0 |
| R-FILLAMENTUM-Fillamentum-ASA-CF10-Carbon | 24 | 3 | 1 | 3 | 0 |
| S-CPECF | 21 | 3 | 1 | 5 | 0 |
| I-PETG-TDS | 32 | 3 | 1 | 8 | 0 |
| R-NANOVIA-HIPS | 24 | 3 | 1 | 0 | 0 |
| R-NANOVIA-PC-ABS-Rail | 23 | 3 | 1 | 0 | 0 |
| S-PVB-technisches-datenblatt-3 | 24 | 3 | 1 | 1 | 0 |
| D-RAISE3D-Raise3D-Industrial-PA12-CF-TDS-V3-0-0b3967 | 34 | 3 | 1 | 2 | 0 |
| R-RECREUS-RECIFLEX-TECHNICAL-DATA-SHEET-TDS-2021 | 10 | 3 | 1 | 0 | 0 |
| D-SPECTRUM-PLA-NATURE-PAGE | 12 | 3 | 1 | 0 | 0 |
| R-3DJAKE-EN-TDS-PLA-Graphene-LIGHT | 16 | 2 | 1 | 5 | 0 |
| R-3DJAKE-Technical-Data-Sheet-niceBIO-V2 | 20 | 2 | 1 | 0 | 0 |
| R-3DJAKE-Technical-Data-Sheet-PCTG-V2 | 18 | 2 | 1 | 2 | 0 |
| X-3DXTECH-PRINT-20260928-4c7905791366 | 11 | 2 | 1 | 0 | 0 |
| XP-3dxstat-esd-pc-1 | 13 | 2 | 1 | 0 | 0 |
| R-COLORFABB-colorFabb-nGen-Flex-Filament-TDS | 19 | 2 | 1 | 0 | 0 |
| R-ERYONE-eryone-silk-pla-tds | 25 | 2 | 1 | 0 | 0 |
| R-ERYONE-eryone-pla-cf-tds | 26 | 2 | 1 | 0 | 0 |
| R-ERYONE-eryone-hyper-speed-dual-color-silk-pla-tds | 26 | 2 | 1 | 1 | 0 |
| R-ERYONE-eryone-silk-rainbow-pla-tds | 28 | 2 | 1 | 3 | 0 |
| D-FABRU-PUREFIL-PUREFIL-PVC-P-FILAMENT-997-9569-PAGE | 11 | 2 | 1 | 0 | 0 |
| R-FABRU-10255-Material-data-sheet-TPV-98A-purefil | 17 | 2 | 1 | 1 | 0 |
| R-FABRU-10857-Material-datasheet-COC-flex-purefil-EN | 18 | 2 | 1 | 5 | 0 |
| R-FABRU-PUREFIL-1639-material-data-sheet-PLA-Silk-purefil | 15 | 2 | 1 | 0 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-PP-2320 | 14 | 2 | 1 | 4 | 0 |
| R-NANOVIA-TPE-22D | 14 | 2 | 1 | 0 | 0 |
| R-3DJAKE-EN-TDS-PETG-Graphene-Strong | 15 | 2 | 1 | 4 | 0 |
| D-3D4MAKERS-ABS-ESD-PAGE | 16 | 2 | 1 | 1 | 0 |
| R-3D4MAKERS-TDS-PETG-Filament | 28 | 2 | 1 | 2 | 0 |
| R-3DJAKE-TDS-3DJAKE-ABS-CF | 20 | 2 | 1 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-ecoPLA-v1-4 | 16 | 2 | 1 | 0 | 0 |
| XP-carbonx-asa-cf-1 | 12 | 2 | 1 | 0 | 0 |
| XP-carbonx-ezpc-cf-1 | 11 | 2 | 1 | 0 | 0 |
| XP-carbonx-pc-cf-1-2 | 10 | 2 | 1 | 0 | 0 |
| XP-ezpc-polycarbonate-1 | 10 | 2 | 1 | 0 | 0 |
| R-COLORFABB-colorFabb-XT-Filament-TDS | 20 | 2 | 1 | 0 | 0 |
| R-ERYONE-eryone-wood-pla-tds | 27 | 2 | 1 | 3 | 0 |
| R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--881af5 | 27 | 2 | 1 | 4 | 0 |
| R-FABRU-7738-Fiche-technique-du-mat-riau-ASA-CF10-purefil | 17 | 2 | 1 | 0 | 0 |
| R-FABRU-PUREFIL-35-material-data-sheet-HIPS-purefil | 17 | 2 | 1 | 1 | 0 |
| D-FIBERLOGY-CPE-HT-S2-FILAMENT-PAGE | 18 | 2 | 1 | 0 | 0 |
| R-FILLAMENTUM-TDS-Fishy-filament-OrCA-EN-20072023 | 28 | 2 | 1 | 4 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-PLA-Extrafill-03012019 | 19 | 2 | 1 | 1 | 0 |
| S-PET-formfutura-tds-apolloxcf10 | 16 | 2 | 1 | 2 | 0 |
| I-PLA-TDS | 26 | 2 | 1 | 3 | 0 |
| R-NANOVIA-PP-CF | 20 | 2 | 1 | 1 | 0 |
| D-RAISE3D-Raise3D-Industrial-PA12-CF-TDS-V3-0-76400e | 56 | 2 | 1 | 1 | 0 |
| R-RECREUS-FILAFLEX-Reciflex | 9 | 2 | 1 | 1 | 0 |
| D-SPECTRUM-PLA-STONE-PAGE | 12 | 2 | 1 | 0 | 0 |
| S-SPECTRUM-PLA-Special-Glow-in-the-Dark | 12 | 2 | 1 | 1 | 0 |
| D-3DJAKE-NICEBIO-BLACK-PAGE | 7 | 1 | 1 | 0 | 0 |
| R-3DJAKE-EN-TDS-PLA-Graphene-STRONG | 19 | 1 | 1 | 4 | 0 |
| R-FABRU-4701-material-data-sheet-GreenTEC-Pro-purefil | 15 | 1 | 1 | 0 | 0 |
| R-FABRU-PUREFIL-12071-Material-data-sheet-PP-purefil | 15 | 1 | 1 | 0 | 0 |
| R-FABRU-PUREFIL-3493-Materialdatenblatt-HDPE-GF20-purefil | 15 | 1 | 1 | 0 | 0 |
| D-FIBERLOGY-ASAAF-FILAMENT-PAGE | 8 | 1 | 1 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-FIBERFLEX-40D-TDS | 83 | 1 | 1 | 33 | 0 |
| R-FIBERLOGY-FIBERLOGY-MATTFLEX-40D-TDS | 84 | 1 | 1 | 32 | 0 |
| R-FIBERLOGY-FIBERLOGY-PETG-PTFE-TDS | 11 | 1 | 1 | 1 | 0 |
| R-FIBERLOGY-FIBERLOGY-PETGPTFE-TDS | 13 | 1 | 1 | 1 | 0 |
| R-FILAMENT2PRINT-BioFil-PCL | 14 | 1 | 1 | 0 | 0 |
| R-FILLAMENTUM-TDS-Fishy-filament-Porthcurno-EN-06042023 | 26 | 1 | 1 | 0 | 0 |
| S-PET-TDS-ApolloX-Kevlar | 17 | 1 | 1 | 4 | 0 |
| R-NANOVIA-Flex-VX | 19 | 1 | 1 | 0 | 0 |
| R-3D4MAKERS-TDS-PLLA-Filament | 19 | 1 | 1 | 2 | 0 |
| X-3DXTECH-PRINT-20260928-46680bcd53a9 | 10 | 1 | 1 | 0 | 0 |
| X-3DXTECH-PRINT-20260928-7b969da511c0 | 9 | 1 | 1 | 0 | 0 |
| XP-3dxmax-r-asa | 10 | 1 | 1 | 0 | 0 |
| XP-3dxstat-esd-abs-1-2 | 10 | 1 | 1 | 0 | 0 |
| XP-carbonx-abs-cf-1-2 | 11 | 1 | 1 | 0 | 0 |
| XP-carbonx-htn-cf | 13 | 1 | 1 | 1 | 0 |
| XP-carbonx-nylon-6-cf-1 | 9 | 1 | 1 | 0 | 0 |
| XP-ecomax-r-pla-2 | 8 | 1 | 1 | 0 | 0 |
| XP-ecomax-r-tough-pla | 8 | 1 | 1 | 0 | 0 |
| XP-simubone-r | 7 | 1 | 1 | 0 | 0 |
| XP-triton-abs | 5 | 1 | 1 | 0 | 0 |
| R-BIGREP-EamZRWAunoxKoIYZCacNr0YBllxjtWjQ2wi-t2bk8dMrZQ | 15 | 1 | 1 | 0 | 0 |
| R-BIGREP-EU3iphIQD9hGhUQXiWWOXbYBhjDcb7BNHD3k8dPwoQCsQg | 15 | 1 | 1 | 0 | 0 |
| R-BIGREP-EVMGxLYZZHtFnUXJyVdjMDkBNtXAN2Bj7nRmZ37F91wPdQ | 16 | 1 | 1 | 0 | 0 |
| R-BIGREP-EWGmERRaxthJq-JOsmzhLY0BOTiqFYed5n0DaVMe-iZ1cQ | 16 | 1 | 1 | 0 | 0 |
| R-BIGREP-EWhVOcddlrlPg7E8EnfbuAEBF9-1smBh1nDh-WKBmBCTmA | 16 | 1 | 1 | 0 | 0 |
| R-3DJAKE-FIBERLOGY-PCABS-TDS | 15 | 1 | 1 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-MATTEPETG-TDS | 12 | 1 | 1 | 1 | 0 |
| R-FILLAMENTUM-Technical-Data-Sheet-Timberfill-03012019 | 18 | 1 | 1 | 1 | 0 |
| S-PET-TDS-Galaxy-PLA | 14 | 1 | 1 | 0 | 0 |
| I-PLA-PAHT-CF-TDS | 16 | 1 | 1 | 1 | 0 |
| D-MATTERHACKERS-NYLONG-PAGE | 10 | 1 | 1 | 0 | 0 |
| R-MATTERHACKERS-PRINT-20260928-287fb08e4373 | 10 | 1 | 1 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-BBz11b | 16 | 1 | 1 | 0 | 0 |
| R-NANOVIA-PA-Food-Industry | 19 | 1 | 1 | 0 | 0 |
| S-POLYCN-Polymaker-PC-Max-TDS-v1-0 | 18 | 1 | 1 | 9 | 1 |
| D-PUREFIL-TPU-53D-PAGE | 9 | 0 | 1 | 0 | 0 |
| R-FABRU-3492-Material-data-sheet-HDPE-GF20-purefil | 15 | 0 | 1 | 0 | 0 |
| R-FABRU-PUREFIL-10802-Material-datasheet-COC-tough-purefil-EN | 16 | 0 | 1 | 0 | 0 |
| R-FABRU-PUREFIL-109-material-data-sheet-PC-GF10-purefil | 17 | 0 | 1 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-FIBERFLEX-30D-TDS | 83 | 0 | 1 | 32 | 0 |
| R-FIBERLOGY-FIBERLOGY-FIBERFLEX-AERO-TDS-1 | 17 | 0 | 1 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-RNYLON-TDS | 16 | 0 | 1 | 2 | 0 |
| D-3DJAKE-ABS-CF-BLACK-1-PAGE | 11 | 0 | 1 | 0 | 0 |
| D-3DJAKE-EASYPETG-BLACK-PAGE | 7 | 0 | 1 | 0 | 0 |
| R-3DJAKE-PRINT-20260928-e2f72ffa8080 | 11 | 0 | 1 | 0 | 0 |
| D-FABRU-PUREFIL-PUREFIL-ABS-GF10-FILAMENT-291-7091-PAGE | 7 | 0 | 1 | 0 | 0 |
| D-FABRU-PUREFIL-PUREFIL-PA12-CF15-FILAMENT-310-7552-PAGE | 7 | 0 | 1 | 0 | 0 |
| D-FABRU-PUREFIL-PUREFIL-PETG-FILAMENT-750-8958-PAGE | 7 | 0 | 1 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-ABS-ESD-TDS | 12 | 0 | 1 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-ABSGF-TDS | 14 | 0 | 1 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-FIBERSATIN-TDS | 12 | 0 | 1 | 3 | 0 |
| R-FIBERLOGY-FIBERLOGY-FIBERSILK-TDS-201a07 | 12 | 0 | 1 | 3 | 0 |
| R-FIBERLOGY-FIBERLOGY-FIBERSMOOTH-TDS | 15 | 0 | 1 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-FIBERWOOD-TDS | 12 | 0 | 1 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-IMPACT-PLA-TDS | 16 | 0 | 1 | 3 | 0 |
| R-FIBERLOGY-FIBERLOGY-VELVET-PLA-TDS-1-3 | 14 | 0 | 1 | 2 | 0 |
| S-PET-TDS-Helios-Support | 6 | 0 | 1 | 0 | 0 |
| R-RECREUS-Filaflex-95-Foamy | 71 | 51 | 0 | 1 | 0 |
| R-RECREUS-Filaflex-Foamy | 71 | 51 | 0 | 1 | 0 |
| R-RECREUS-FILAFLEX-Filaflex-95A | 65 | 43 | 0 | 0 | 0 |
| R-STRATASYS-mds-fdm-absesd7-0222a | 77 | 27 | 0 | 41 | 0 |
| R-COLORFABB-TDS-varioShore-Prosthetic-TPU | 40 | 25 | 0 | 2 | 14 |
| R-QIDI-PETG-GF | 46 | 25 | 0 | 27 | 0 |
| R-QIDI-PETG-RAPIDO | 45 | 25 | 0 | 26 | 0 |
| R-NANOVIA-COVERAGE-20261001-1d6a8af9c7d8 | 105 | 24 | 0 | 57 | 0 |
| R-COLORFABB-TDS-E-colorFabb-PLA-Vertigo | 35 | 22 | 0 | 12 | 3 |
| R-SUNLU-689d1925-acad-4de8-9079-c8eee9c3081e | 44 | 22 | 0 | 3 | 0 |
| S-POLYCN-PolyLite-PLA-TDS-V5-1-7 | 58 | 21 | 0 | 8 | 0 |
| S-SPECTRUM-pl-tds-spectrum-pla-silk-rainbow | 25 | 18 | 0 | 0 | 0 |
| R-EXTRUDR-durapro-abs-TDS-fr | 27 | 18 | 0 | 0 | 0 |
| R-STRATASYS-FDM-NYLON12-MDS | 67 | 17 | 0 | 2 | 0 |
| S-SPECTRUM-pl-tds-spectrum-pla-nature | 25 | 17 | 0 | 1 | 0 |
| S-SPECTRUM-pl-tds-spectrum-abs-kevlar | 27 | 16 | 0 | 0 | 0 |
| S-PEBA-PETG-ESD-TDS-EN | 44 | 16 | 0 | 4 | 1 |
| S-POLYCN-PolyFlex-TPU95-TDS-V5-1 | 38 | 16 | 0 | 4 | 0 |
| S-SPECTRUM-pl-tds-spectrum-rpla | 24 | 16 | 0 | 1 | 0 |
| R-STRATASYS-mds-fdm-abs-m30-0826a | 56 | 16 | 0 | 24 | 0 |
| R-BASF-FORWARD-AM-PRINT-20260928-0270c48dc78a | 26 | 14 | 0 | 0 | 0 |
| R-EXTRUDR-flex-medium-esd-TDS-de | 28 | 14 | 0 | 1 | 0 |
| R-3DJAKE-3DJAKE-TDS-ABS-Prime-pptx | 34 | 14 | 0 | 18 | 0 |
| X-CarbonX-CF-PA12-TDS-v1 | 36 | 14 | 0 | 2 | 2 |
| R-QIDI-PETG-CF | 43 | 14 | 0 | 18 | 0 |
| R-EXTRUDR-flex-hard-cf-TDS-de | 32 | 13 | 0 | 0 | 0 |
| D-BIGREP-ABS-PAGE | 23 | 13 | 0 | 8 | 0 |
| D-FIBERLOGY-RPETG-FILAMENT-S2-PAGE | 21 | 13 | 0 | 0 | 0 |
| D-RAISE3D-Raise3d-Premium-PC-Transparent-TDS-V4 | 27 | 13 | 0 | 4 | 0 |
| S-POLYCN-PolyLite-PLA-CF-TDS-US-5-1 | 48 | 12 | 0 | 2 | 0 |
| R-SUNLU-PP-TDS-7b4ac3a3-751e-42d8-9b0b-bff0d1fc0a3b | 47 | 12 | 0 | 5 | 0 |
| S-PEBA-PETG-Matte-TDS | 40 | 12 | 0 | 2 | 1 |
| S-PEBA-PLA-Basic-TDS-EN | 41 | 12 | 0 | 1 | 1 |
| R-EXTRUDR-durapro-pc-pbt-TDS-de | 52 | 12 | 0 | 2 | 0 |
| R-EXTRUDR-flex-semisoft-TDS-de | 34 | 12 | 0 | 0 | 0 |
| D-FIBERLOGY-PETG-FR-V0-FILAMENT-PAGE | 22 | 12 | 0 | 0 | 1 |
| D-FLASH-PLA-Matte-TDS-EN | 33 | 12 | 0 | 0 | 0 |
| D-FLASH-PLA-Multicolor-TDS-EN | 34 | 12 | 0 | 0 | 0 |
| D-FLASH-PLA-Pro-TDS-EN | 33 | 12 | 0 | 0 | 0 |
| D-FLASH-PLA-TDS-EN | 33 | 12 | 0 | 0 | 0 |
| D-FLASH-PLA-Wood-TDS-EN | 34 | 12 | 0 | 0 | 0 |
| D-FLASH-PVA-TDS-EN | 35 | 12 | 0 | 0 | 0 |
| S-PET-formfutura-tds-kratospc | 16 | 12 | 0 | 2 | 1 |
| S-PET-TDS-LimoSolve | 15 | 12 | 0 | 0 | 2 |
| S-SPECTRUM-pl-tds-spectrum-petg-frv0 | 30 | 12 | 0 | 3 | 0 |
| R-STRATASYS-mds-fdm-hips-0823a | 53 | 12 | 0 | 5 | 0 |
| R-FIBERLOGY-FIBERLOGY-ASA-AF-TDS | 17 | 11 | 0 | 0 | 2 |
| D-FIBERLOGY-EASY-PETG-FILAMENT-PAGE | 19 | 11 | 0 | 0 | 0 |
| D-FIBERLOGY-RPLA-FILAMENT-PAGE | 18 | 11 | 0 | 0 | 0 |
| S-PCGF-PA6CF | 33 | 11 | 0 | 17 | 0 |
| R-SUNLU-433432a8-dfcb-485e-bd8e-a7be94dda4ce | 45 | 11 | 0 | 5 | 0 |
| R-FABRU-1636-Fiche-technique-du-mat-riau-PLA-Silk-purefil | 15 | 10 | 0 | 1 | 0 |
| D-FIBERLOGY-PCTG-FILAMENT-PAGE | 21 | 10 | 0 | 0 | 0 |
| D-FIBERLOGY-RNYLON-FILAMENT-PAGE | 18 | 10 | 0 | 0 | 1 |
| R-FIBERLOGY-PRINT-20260928-715fa20ea047 | 19 | 10 | 0 | 0 | 0 |
| R-FIBERLOGY-PRINT-20260928-dff2ce2ac494 | 18 | 10 | 0 | 0 | 0 |
| S-PET-TDS-FlexiFil-TPC-40D | 13 | 10 | 0 | 4 | 1 |
| R-ERYONE-eryone-standard-tpu-tds | 22 | 10 | 0 | 3 | 3 |
| R-EXTRUDR-durapro-asa-gf-TDS-fr | 24 | 10 | 0 | 0 | 0 |
| D-FIBERLOGY-FIBERSMOOTH-PAGE | 18 | 10 | 0 | 0 | 0 |
| D-FIBERLOGY-FIBERWOOD-S2-PAGE | 17 | 10 | 0 | 0 | 0 |
| S-PET-TDS-MagicFil-Thermo-PLA | 16 | 10 | 0 | 0 | 1 |
| S-PET-TDS-ReForm-rPLA | 16 | 10 | 0 | 0 | 0 |
| D-RAISE3D-Raise3D-Hyper-Speed-PLA-Filament-TDS-V4-0-EN | 36 | 10 | 0 | 1 | 0 |
| X-RECREUS-PET-G-TDS-2023 | 22 | 10 | 0 | 4 | 0 |
| S-SPECTRUM-de-tds-spectrum-pla-stone-age | 24 | 10 | 0 | 1 | 0 |
| R-EXTRUDR-pctg-TDS-de | 30 | 9 | 0 | 3 | 0 |
| R-EXTRUDR-pla-basic-cf-TDS-de-3 | 26 | 9 | 0 | 2 | 0 |
| D-FIBERLOGY-PA12-NYLON-FILAMENT-PAGE | 20 | 9 | 0 | 0 | 0 |
| R-FIBERLOGY-PRINT-20260928-7bb43c8e086b | 17 | 9 | 0 | 0 | 0 |
| I-PLA-PLA-Silk-TDS | 26 | 9 | 0 | 11 | 0 |
| R-COLORFABB-TDS-ColorFabb-StoneFill | 33 | 9 | 0 | 0 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-LW-PLA | 39 | 9 | 0 | 13 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-LW-PLA-HT | 39 | 9 | 0 | 16 | 0 |
| R-ERYONE-eryone-tpu-hs-tds | 27 | 9 | 0 | 3 | 0 |
| S-PEBA-ePLA-Metal-TDS | 26 | 9 | 0 | 1 | 0 |
| R-FABRU-PUREFIL-7739-Scheda-tecnica-del-materiale-ASA-CF10-purefil | 15 | 9 | 0 | 3 | 0 |
| D-FIBERLOGY-ABSGF-FILAMENT-PAGE | 17 | 9 | 0 | 0 | 0 |
| D-FIBERLOGY-FIBERWOOD-PAGE | 17 | 9 | 0 | 0 | 0 |
| D-FIBERLOGY-RABS-FILAMENT-S2-PAGE | 17 | 9 | 0 | 0 | 0 |
| D-FLASH-PLA-LW-TDS-EN | 35 | 9 | 0 | 4 | 0 |
| S-POLYCN-index-php-controller-attachment-id-attachment-167 | 29 | 9 | 0 | 1 | 1 |
| D-RAISE3D-Raise3D-Hyper-Speed-PET-CF-TDS-V1-0 | 54 | 9 | 0 | 4 | 0 |
| D-RAISE3D-Raise3d-Premium-PC-Transparent-TDS-V6 | 30 | 9 | 0 | 3 | 1 |
| D-RAISE3D-Raise3d-Premium-PETG-TDS-V3 | 26 | 9 | 0 | 4 | 0 |
| R-RECREUS-PLA | 16 | 9 | 0 | 7 | 0 |
| S-PCGF-ASA-TDS | 26 | 9 | 0 | 10 | 0 |
| S-PCGF-PC-ABS-TDS | 25 | 9 | 0 | 9 | 0 |
| R-STRATASYS-mds-fdm-pciso-0820a | 28 | 9 | 0 | 4 | 0 |
| R-3DJAKE-3DJAKE-TDS-CarbonFiber-HTPLA-1-0-1 | 22 | 8 | 0 | 0 | 0 |
| R-FIBERLOGY-PRINT-20260928-8542185b8c6b | 16 | 8 | 0 | 0 | 0 |
| S-SILK-PLA-PAGE | 21 | 8 | 0 | 0 | 0 |
| R-SUNLU-PLA-Carbon-Fiber | 46 | 8 | 0 | 6 | 0 |
| R-SUNLU-SILK-PLA | 46 | 8 | 0 | 2 | 0 |
| R-3DJAKE-3DJAKE-PETG-TDS-10-1 | 23 | 8 | 0 | 9 | 0 |
| R-3DJAKE-3DJAKE-TDS-HTPLA-v3-Opaque-1-0-0 | 19 | 8 | 0 | 1 | 0 |
| R-3DJAKE-3DJAKE-TDS-Translucent-Sparkly-HTPLA-1-0-0-1-7 | 21 | 8 | 0 | 1 | 0 |
| R-3DJAKE-PLA-TDS-7 | 16 | 8 | 0 | 1 | 0 |
| R-COLORFABB-TDS-E-colorFabb-LW-ASA | 37 | 8 | 0 | 11 | 0 |
| R-EXTRUDR-xpetg-cf-TDS-fr | 25 | 8 | 0 | 0 | 0 |
| D-FIBERLOGY-ASA-FILAMENT-PAGE | 16 | 8 | 0 | 0 | 0 |
| D-FIBERLOGY-ASA-MATTE-FILAMENT-PAGE | 16 | 8 | 0 | 0 | 0 |
| D-FIBERLOGY-EASY-PLA-FILAMENT-PAGE | 12 | 8 | 0 | 0 | 0 |
| D-FIBERLOGY-FIBERSATIN-PAGE | 16 | 8 | 0 | 0 | 0 |
| D-FIBERLOGY-FIBERSILK-PAGE | 16 | 8 | 0 | 0 | 0 |
| D-FIBERLOGY-PETG-MATTE-FILAMENT-PAGE | 17 | 8 | 0 | 0 | 0 |
| D-FIBERLOGY-PLA-VELVET-FILAMENT-S2-PAGE | 19 | 8 | 0 | 0 | 0 |
| I-PLA-ABS-GF-TDS | 20 | 8 | 0 | 3 | 0 |
| I-PLA-HS-PLA-TDS | 19 | 8 | 0 | 10 | 0 |
| S-POLYCN-PolyFlex-TPU90-TDS-V5-1 | 31 | 8 | 0 | 7 | 0 |
| S-POLYCN-PolyLite-PLA-TDS-V3 | 32 | 8 | 0 | 1 | 1 |
| S-POLYCN-PolyMax-PETG-TDS-V4 | 33 | 8 | 0 | 1 | 1 |
| R-3DJAKE-TDS-BrassBronzeCopper-HTPLA-1-0-0 | 22 | 8 | 0 | 1 | 0 |
| D-RAISE3D-Raise3d-Premium-PC-Black-White-TDS-V6 | 30 | 8 | 0 | 1 | 1 |
| X-ECOMAX-3DXSTAT-ESD-TPU-90A-TDS-v1-1 | 15 | 7 | 0 | 2 | 0 |
| X-Hyperlite-PP-TDS-v1 | 24 | 7 | 0 | 3 | 0 |
| S-ESUN-PLA-Silk-TDS-2025-06-19 | 37 | 7 | 0 | 2 | 0 |
| S-PEBA-eSUN-ePLA-Silk-Magic-Filament-TDS-V4-02 | 27 | 7 | 0 | 0 | 0 |
| S-PEBA-eSUN-ePLA-Silk-Mystic-Filament-TDS-V4-0 | 27 | 7 | 0 | 0 | 0 |
| D-FIBERLOGY-BVOH-FILAMENT-PAGE | 17 | 7 | 0 | 0 | 0 |
| D-FIBERLOGY-PCTGGF-FILAMENT-PAGE | 18 | 7 | 0 | 0 | 0 |
| D-FIBERLOGY-PLA-MINERAL-FILAMENT-PAGE | 18 | 7 | 0 | 0 | 0 |
| D-FIBERLOGY-PP-FILAMENT-PAGE | 17 | 7 | 0 | 0 | 0 |
| R-3D-FUEL-TDS-3DFuel-Pro-PLA | 31 | 7 | 0 | 22 | 0 |
| D-3D4MAKERS-PETG-FILAMENT-PAGE | 15 | 7 | 0 | 0 | 6 |
| R-3DJAKE-3DJAKE-14-TDS-hyper-PLA-CF-EN | 29 | 7 | 0 | 10 | 0 |
| R-3DJAKE-3DJAKE-23-TDS-HYPER-PETG-EN | 28 | 7 | 0 | 8 | 0 |
| R-3DJAKE-3DJAKE-TDS-PETG | 35 | 7 | 0 | 1 | 0 |
| X-3DXPRO-LG-PETG-TDS-v3 | 18 | 7 | 0 | 1 | 1 |
| X-3DXSTAT-ESD-ABS-TDS-v3 | 18 | 7 | 0 | 1 | 1 |
| X-AMIDEX-Nylon-GF30-TDS-v1 | 18 | 7 | 0 | 1 | 1 |
| X-CarbonX-CF-ABS-TDS-v3 | 18 | 7 | 0 | 1 | 1 |
| X-CarbonX-CF-ASA-TDS-v1 | 18 | 7 | 0 | 3 | 0 |
| X-CarbonX-CF-PC-TDSv3 | 18 | 7 | 0 | 0 | 1 |
| X-ECOMAX-3DXMAX-ABS-TDS-v3 | 18 | 7 | 0 | 0 | 1 |
| X-ECOMAX-3DXMAX-ASA-TDS-v3 | 18 | 7 | 0 | 0 | 1 |
| X-ECOMAX-3DXMAX-PC-TDS-v3 | 18 | 7 | 0 | 0 | 1 |
| X-ECOMAX-3DXMAX-PETG-TDS | 18 | 7 | 0 | 0 | 1 |
| X-ECOMAX-CarbonX-CF-ezPC-TDSv1 | 18 | 7 | 0 | 0 | 1 |
| X-ECOMAX-CarbonX-CF-HTN-TDS-v2 | 19 | 7 | 0 | 1 | 1 |
| X-ECOMAX-CarbonX-CF-PETG-TDS-v3 | 18 | 7 | 0 | 0 | 1 |
| X-ECOMAX-CarbonX-PA6-G3-TDS-v3-0 | 18 | 7 | 0 | 0 | 1 |
| X-ECOMAX-CF-HTN-v1 | 18 | 7 | 0 | 1 | 1 |
| X-ECOMAX-ECOMAX-Tough-PLA-TDS-v1 | 18 | 7 | 0 | 1 | 1 |
| X-ECOMAX-ezPC-TDS-v01 | 18 | 7 | 0 | 1 | 1 |
| X-ECOMAX-FIBREX-GF-ABS-TDS-v1 | 18 | 7 | 0 | 1 | 1 |
| X-ECOMAX-PLA-TDS-v3 | 18 | 7 | 0 | 0 | 1 |
| X-ECOMAX-SimuBone-TDS-v1 | 18 | 7 | 0 | 2 | 1 |
| R-COLORFABB-TDS-copperFill-en-0 | 26 | 7 | 0 | 5 | 0 |
| D-FIBERLOGY-HIPS-FILAMENT-PAGE | 18 | 7 | 0 | 0 | 0 |
| D-FIBERLOGY-HS-PLA-CLEAR-FILAMENT-S2-PAGE | 16 | 7 | 0 | 0 | 0 |
| D-FIBERLOGY-PC-ABS-FILAMENT-PAGE | 19 | 7 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-NYLON-PA12GF15-TDS | 18 | 7 | 0 | 4 | 0 |
| D-FLASH-ABS-Matte-TDS-EN | 32 | 7 | 0 | 4 | 0 |
| D-FLASH-PETG-HS-TDS-EN | 29 | 7 | 0 | 0 | 0 |
| D-FLASH-PLA-Crystal-TDS-EN | 30 | 7 | 0 | 7 | 0 |
| S-PET-TDS-LUVOCOM-3F-PP-CF-9928-BK | 30 | 7 | 0 | 0 | 0 |
| S-POLYCN-PolyFlex-TPU95-TDS-V4 | 22 | 7 | 0 | 0 | 1 |
| D-RAISE3D-Raise3D-Premium-TPU95A-TDS-V2-2 | 23 | 7 | 0 | 3 | 1 |
| R-STRATASYS-mds-fdm-absm30i-0621a | 26 | 7 | 0 | 5 | 0 |
| X-ECOMAX-3DXMAX-PCASA-TDS-v3 | 17 | 6 | 0 | 2 | 0 |
| X-ECOMAX-3DXSTAT-ESD-PC-v3-TDS | 17 | 6 | 0 | 2 | 0 |
| X-ECOMAX-3DXSTAT-ESD-PPS-v3-TDS | 17 | 6 | 0 | 2 | 0 |
| X-ECOMAX-3DXSTAT-ESD-PVDF-v3-TDS | 17 | 6 | 0 | 2 | 0 |
| X-ECOMAX-CarbonX-CF-PC-ABS-TDS-v1-1 | 17 | 6 | 0 | 3 | 0 |
| X-ECOMAX-CarbonX-CF-PLA-TDS-v3 | 17 | 6 | 0 | 2 | 0 |
| X-ECOMAX-ESD-TPC-92A-v3 | 17 | 6 | 0 | 2 | 0 |
| X-ECOMAX-THERMAX-PPE-PS-TDS-v1 | 17 | 6 | 0 | 3 | 0 |
| X-FLUORX-PVDF-TDS-v3 | 17 | 6 | 0 | 1 | 0 |
| X-MAXG-PCTG-TDS-v1-0 | 18 | 6 | 0 | 3 | 0 |
| R-COLORFABB-TDS-E-colorFabb-nGen-CF10 | 23 | 6 | 0 | 0 | 0 |
| R-COLORFABB-TDS-nGen-CF10 | 27 | 6 | 0 | 1 | 0 |
| R-COLORFABB-TDS-PET-FLEX-MAX | 24 | 6 | 0 | 2 | 0 |
| D-FIBERLOGY-FIBERFLEX-AERO-FILAMENT-PAGE | 15 | 6 | 0 | 0 | 0 |
| D-FIBERLOGY-PCTGCF-FILAMENT-PAGE | 17 | 6 | 0 | 0 | 0 |
| R-FIBERLOGY-PRINT-20260928-8d6a2f7e6751 | 13 | 6 | 0 | 0 | 0 |
| S-PET-formfutura-tds-pythonflex | 19 | 6 | 0 | 0 | 0 |
| S-PANCHROMA-TM-COPE-PAGE | 15 | 6 | 0 | 0 | 0 |
| X-FIBREX-GF-PP-TDS-v1 | 16 | 6 | 0 | 1 | 0 |
| D-FIBERLOGY-ABS-FILAMENT-PAGE | 17 | 6 | 0 | 0 | 0 |
| D-FIBERLOGY-ABS-PLUS-FILAMENT-PAGE | 17 | 6 | 0 | 0 | 0 |
| D-FIBERLOGY-EASY-ABS-FILAMENT-PAGE | 14 | 6 | 0 | 0 | 0 |
| D-FIBERLOGY-ESD-PETG-FILAMENT-PAGE | 17 | 6 | 0 | 0 | 0 |
| D-FIBERLOGY-PA12CF-NYLON-FILAMENT-PAGE | 18 | 6 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-NYLON-PA12CF15-TDS | 19 | 6 | 0 | 3 | 0 |
| R-POLYMAKER-WIKI-POLYDISSOLVE-S1 | 12 | 6 | 0 | 0 | 0 |
| S-POLYCN-PolyDissolve-S1-PIS-EN | 22 | 6 | 0 | 1 | 0 |
| S-POLYCN-PolyFlex-TPU90-TDS-V4-2 | 20 | 6 | 0 | 0 | 1 |
| S-POLYCN-PolyFlex-TPU95-HF-TDS-V4-2 | 20 | 6 | 0 | 0 | 1 |
| D-RAISE3D-Raise3D-Hyper-Speed-ABS-Filament-TDS-V2-0 | 23 | 6 | 0 | 2 | 0 |
| R-3DJAKE-3DJAKE-TDS-Conductive-PLA-1-0-1 | 21 | 5 | 0 | 0 | 0 |
| X-ECOMAX-TriStat-ESD-PC-TDS-v1 | 14 | 5 | 0 | 11 | 0 |
| R-BAMBU-PRIORITY-20261003-693bcb42a47c | 12 | 5 | 0 | 2 | 0 |
| D-COLORFABB-LW-PET-NATURAL-PAGE | 11 | 5 | 0 | 0 | 0 |
| R-COLORFABB-PRINT-20260928-b1b495644f1d | 11 | 5 | 0 | 0 | 0 |
| R-COLORFABB-PRINT-20260928-f89c55192e87 | 11 | 5 | 0 | 0 | 0 |
| R-COLORFABB-TDS-LW-PET | 31 | 5 | 0 | 20 | 0 |
| R-COLORFABB-TDS-LW-PET-FLEX | 31 | 5 | 0 | 20 | 0 |
| R-COLORFABB-TDS-PET-ULTRA-HIGH-SPEED | 24 | 5 | 0 | 1 | 0 |
| D-FIBERLOGY-FIBERFLEX-40D-MSDS-2023 | 12 | 5 | 0 | 11 | 0 |
| D-FIBERLOGY-MATTFLEX-40D-PAGE | 14 | 5 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-PLA-MINERAL-TDS | 20 | 5 | 0 | 2 | 0 |
| D-NINJATEK-ARMADILLO-PAGE | 13 | 5 | 0 | 0 | 0 |
| R-SUNLU-PRINT-20260928-41d3588b228c | 19 | 5 | 0 | 0 | 0 |
| R-3DJAKE-3DJAKE-3DJake-ABS | 16 | 5 | 0 | 0 | 2 |
| R-BAMBU-PRIORITY-20261003-1a684f125817 | 11 | 5 | 0 | 1 | 0 |
| R-BAMBU-PRIORITY-20261003-f50ef28e766c | 48 | 5 | 0 | 0 | 0 |
| R-COLORFABB-colorFabb-LW-ASA-TDS | 12 | 5 | 0 | 0 | 0 |
| R-COLORFABB-colorFabb-LW-PLA-TDS | 12 | 5 | 0 | 0 | 1 |
| R-COLORFABB-PRINT-20260928-889899362b76 | 11 | 5 | 0 | 0 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-LW-PLA-1 | 12 | 5 | 0 | 0 | 0 |
| D-FIBERLOGY-ESD-ABS-FILAMENT-PAGE | 16 | 5 | 0 | 0 | 0 |
| D-FIBERLOGY-FIBERWORKS-PETG-FILAMENT-PAGE | 14 | 5 | 0 | 0 | 0 |
| D-FIBERLOGY-FIBERWORKS-PLA-FILAMENT-PAGE | 14 | 5 | 0 | 0 | 0 |
| R-FILAMENT2PRINT-F2P-PETG-EN | 25 | 5 | 0 | 4 | 0 |
| I-ESD-ABS-TDS | 23 | 5 | 0 | 2 | 1 |
| R-MATTERHACKERS-PRO-SERIES-AfgVfK | 16 | 5 | 0 | 0 | 0 |
| PR-prusament-petg | 14 | 5 | 0 | 0 | 0 |
| PR-prusament-petg-recycled | 15 | 5 | 0 | 0 | 0 |
| PR-prusament-petg-v0 | 17 | 5 | 0 | 0 | 0 |
| D-RAISE3D-Industrial-PPA-CF-SDS-V1-2 | 13 | 5 | 0 | 4 | 0 |
| R-RECREUS-PET-G-TECHNICAL-DATA-SHEET-TDS-2020-0 | 15 | 5 | 0 | 3 | 0 |
| R-RECREUS-PLA-LW | 8 | 5 | 0 | 1 | 0 |
| R-RECREUS-PLA-Purifier | 17 | 5 | 0 | 4 | 0 |
| D-COLORFABB-PET-FLEX-MAX-CLEAR-PAGE | 9 | 4 | 0 | 0 | 0 |
| R-COLORFABB-PRINT-20260928-8152c1c7f9f8 | 9 | 4 | 0 | 0 | 0 |
| R-COLORFABB-TDS-PET-HIGH-SPEED-PRO | 24 | 4 | 0 | 1 | 0 |
| R-COVERAGE-20261001-fabd692704e9 | 13 | 4 | 0 | 0 | 0 |
| D-FIBERLOGY-FIBERFLEX-30D-SDS-EN | 12 | 4 | 0 | 2 | 0 |
| D-FORMFUTURA-HIGH-PRECISION-PET-PAGE | 13 | 4 | 0 | 1 | 0 |
| R-SUNLU-PRINT-20260928-3f8a4687e9e2 | 20 | 4 | 0 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-ecoPLA-Sparkling-0 | 16 | 4 | 0 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-ecoPLA-Wood-v1-1 | 16 | 4 | 0 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-QD-HTPLA | 16 | 4 | 0 | 1 | 0 |
| X-ECOMAX-Triton-ABS-TDS-v1 | 11 | 4 | 0 | 8 | 0 |
| R-COLORFABB-colorFabb-VarioShore-TPU-TDS | 16 | 4 | 0 | 1 | 1 |
| R-COLORFABB-TDS-E-ColorFabb-PLA-HP-5210c3 | 25 | 4 | 0 | 0 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-varioShore-TPU | 15 | 4 | 0 | 0 | 1 |
| S-PEBA-PLA-HS-TDS | 30 | 4 | 0 | 2 | 1 |
| S-PEBA-PLA-Matte-TDS-2025-06-19-1 | 30 | 4 | 0 | 2 | 1 |
| D-FIBERLOGY-MATTE-PLA-FILAMENT-PAGE | 15 | 4 | 0 | 0 | 0 |
| R-3DJAKE-FIBERLOGY-HIPS-TDS | 19 | 4 | 0 | 0 | 0 |
| R-FILAMENT2PRINT-F2P-ASA-EN | 24 | 4 | 0 | 3 | 0 |
| D-FORMFUTURA-REFORM-RPET-PAGE | 14 | 4 | 0 | 0 | 0 |
| D-FORMFUTURA-REFORM-RTITAN-PAGE | 13 | 4 | 0 | 0 | 0 |
| S-PET-TDS-Bulk-PETG | 21 | 4 | 0 | 1 | 0 |
| S-PET-TDS-Bulk-PLA | 17 | 4 | 0 | 0 | 0 |
| R-MATTERHACKERS-5lDr5K | 16 | 4 | 0 | 0 | 0 |
| D-NOBUFIL-PETG-FILAMENT-PAGE | 7 | 4 | 0 | 0 | 0 |
| S-POLYCN-PolyMax-PLA-TDS-v1 | 18 | 4 | 0 | 9 | 1 |
| PR-prusament-rpla | 10 | 4 | 0 | 0 | 0 |
| S-PVB-technisches-datenblatt-2 | 27 | 4 | 0 | 3 | 0 |
| XP-fluorx-pvdf-1-2 | 11 | 3 | 0 | 0 | 0 |
| D-COLORFABB-LW-PET-FLEX-NATURAL-PAGE | 9 | 3 | 0 | 0 | 0 |
| D-COLORFABB-PET-HIGH-SPEED-PRO-CLEAR-PAGE | 8 | 3 | 0 | 0 | 0 |
| R-COLORFABB-colorFabb-nGen-Filament-TDS | 20 | 3 | 0 | 0 | 0 |
| R-COLORFABB-colorFabb-PLA-PHA-Printing-Filament-TDS | 19 | 3 | 0 | 0 | 0 |
| R-COLORFABB-PRINT-20260928-1ff56da73c86 | 9 | 3 | 0 | 0 | 0 |
| D-EXTRUDR-GREENTEC-MSDS-EN | 9 | 3 | 0 | 0 | 0 |
| D-EXTRUDR-GREENTEC-PRO-MSDS-EN-2019 | 9 | 3 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-BVOH-TDS | 15 | 3 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-NYLON-PA12-TDS | 20 | 3 | 0 | 2 | 0 |
| R-FIBERLOGY-FIBERLOGY-R-PP-TDS | 21 | 3 | 0 | 3 | 0 |
| D-FILLAMENTUM-NYLON-FX256-GUIDE | 9 | 3 | 0 | 0 | 0 |
| R-NANOVIA-PA-6 | 28 | 3 | 0 | 0 | 0 |
| R-NANOVIA-PRIORITY-20261002-b7299118da3a | 8 | 3 | 0 | 2 | 0 |
| R-NANOVIA-PRIORITY-20261002-ca0099a2626e | 9 | 3 | 0 | 0 | 0 |
| R-NANOVIA-TPU-70D | 19 | 3 | 0 | 0 | 0 |
| D-YOUSU-NYLON-MSDS | 11 | 3 | 0 | 2 | 0 |
| R-3DJAKE-3DJake-easyPETG | 13 | 3 | 0 | 0 | 0 |
| R-3DJAKE-3DJake-mattePLA | 14 | 3 | 0 | 0 | 0 |
| X-ECOMAX-TriStat-ESD-ABS-TDS-v1 | 11 | 3 | 0 | 6 | 0 |
| X-ECOMAX-Triton-ASA-TDS-v1 | 11 | 3 | 0 | 7 | 0 |
| D-COLORFABB-STONEFILL-PAGE | 10 | 3 | 0 | 0 | 0 |
| R-COLORFABB-colorFabb-ASA-TDS | 21 | 3 | 0 | 0 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-PETG-Economy-0 | 33 | 3 | 0 | 0 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-PLA-HP-7a500b | 22 | 3 | 0 | 1 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-Vibers-PLA | 17 | 3 | 0 | 1 | 0 |
| S-PET-TDS-PLACTIVE | 23 | 3 | 0 | 2 | 0 |
| R-ERYONE-eryone-tpu-90a-tds | 23 | 3 | 0 | 3 | 0 |
| R-FIBERLOGY-FIBERLOGY-CPE-HT-TDS-0 | 18 | 3 | 0 | 2 | 0 |
| R-FIBERLOGY-FIBERLOGY-MATTEPLA-TDS | 10 | 3 | 0 | 2 | 0 |
| R-FIBERLOGY-FIBERLOGY-PCABS-TDS | 15 | 3 | 0 | 2 | 0 |
| R-FIBERLOGY-fiberlogypetgesdtds | 19 | 3 | 0 | 4 | 0 |
| R-FILAMENT2PRINT-Jamg-He-PLA | 22 | 3 | 0 | 3 | 0 |
| S-PET-TDS-ReForm-rTitan | 19 | 3 | 0 | 0 | 0 |
| I-PLA-PA12-CF-TDS | 30 | 3 | 0 | 7 | 1 |
| R-MATTERHACKERS-eZ4iY1 | 24 | 3 | 0 | 1 | 0 |
| R-MATTERHACKERS-RczMCr | 19 | 3 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-8AWUF9 | 18 | 3 | 0 | 0 | 0 |
| R-NANOVIA-Flex | 19 | 3 | 0 | 1 | 0 |
| R-NANOVIA-PRIORITY-20261002-5ccaab255778 | 5 | 3 | 0 | 0 | 0 |
| R-NANOVIA-PRIORITY-20261002-74e5ecc55050 | 6 | 3 | 0 | 0 | 0 |
| R-NANOVIA-PRIORITY-20261002-838a7a341ee2 | 6 | 3 | 0 | 0 | 0 |
| R-NANOVIA-PRIORITY-20261002-fb9f5651287f | 5 | 3 | 0 | 0 | 0 |
| PR-pla-2 | 15 | 3 | 0 | 0 | 0 |
| PR-prusament-pla-recycled | 16 | 3 | 0 | 0 | 0 |
| PR-prusament-pvb | 17 | 3 | 0 | 0 | 0 |
| S-PVB-technisches-datenblatt | 18 | 3 | 0 | 0 | 0 |
| D-RAISE3D-Raise3D-Industrial-PETG-ESD-TDS-V3 | 27 | 3 | 0 | 4 | 0 |
| R-SUNLU-COVERAGE-20261001-73edc6fa27c1 | 20 | 3 | 0 | 0 | 0 |
| R-3D-FUEL-3D-Fuel-Pro-PCTG-TDS-9-2-25 | 35 | 2 | 0 | 8 | 0 |
| D-3D4MAKERS-FACILAN-HT-FILAMENT-PAGE | 16 | 2 | 0 | 0 | 0 |
| R-3DJAKE-TDS-3DJAKE-ecoPLA-CF | 15 | 2 | 0 | 0 | 0 |
| X-ECOMAX-wearx-tds-FW-PA6-Copolymer-v1-0 | 20 | 2 | 0 | 10 | 0 |
| XP-amidex-e2-84-a2-nylon-12 | 10 | 2 | 0 | 0 | 0 |
| XP-max-g-pctg-1-2 | 10 | 2 | 0 | 0 | 0 |
| XP-thermax-ppe-ps-1 | 12 | 2 | 0 | 0 | 0 |
| D-BIGREP-PRO-HT-MSDS | 7 | 2 | 0 | 1 | 0 |
| D-ESUN-TPE-83A-MSDS | 8 | 2 | 0 | 2 | 0 |
| R-3DJAKE-FIBERLOGY-PCTGCF-TDS | 14 | 2 | 0 | 1 | 0 |
| R-FIBERLOGY-FIBERLOGY-PCTG-TDS-0 | 20 | 2 | 0 | 1 | 0 |
| R-FIBERLOGY-TDS-FiberFlex-30D | 17 | 2 | 0 | 2 | 0 |
| S-PET-formfutura-tds-athenax | 14 | 2 | 0 | 0 | 0 |
| S-PET-TDS-FlexiFil | 14 | 2 | 0 | 0 | 0 |
| S-PET-TDS-FlexiFil-TPC-30D-0 | 13 | 2 | 0 | 4 | 0 |
| I-PLA-PCL-TDS | 10 | 2 | 0 | 1 | 0 |
| I-PLA-PLA-CF-TDS | 13 | 2 | 0 | 5 | 0 |
| R-NANOVIA-INSUBLEND-SDS-202309-afadf4eb9e7c | 20 | 2 | 0 | 2 | 0 |
| R-NANOVIA-ISTROFLEX | 19 | 2 | 0 | 0 | 0 |
| R-NANOVIA-PRIORITY-20261002-55b9aab526e7 | 9 | 2 | 0 | 2 | 0 |
| D-NINJATEK-CHINCHILLA-SDS-US | 10 | 2 | 0 | 1 | 0 |
| D-3D4MAKERS-FACILAN-C8-FILAMENT-PAGE | 14 | 2 | 0 | 0 | 0 |
| D-3D4MAKERS-PLA-FILAMENT-PAGE | 17 | 2 | 0 | 0 | 0 |
| R-3D4MAKERS-TDS-ABS-Filament | 27 | 2 | 0 | 2 | 0 |
| R-3DJAKE-TDS-3DJAKE-ASA-CF | 17 | 2 | 0 | 0 | 0 |
| R-3DJAKE-Technical-Data-Sheet-ASA-V2 | 14 | 2 | 0 | 0 | 0 |
| R-3DJAKE-Technical-Data-Sheet-TPU-A95-V2 | 16 | 2 | 0 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-3DJAKE-PETG-CF | 23 | 2 | 0 | 0 | 1 |
| X-ECOMAX-Trilan-PC-TDS-v1 | 11 | 2 | 0 | 6 | 0 |
| X-ECOMAX-TriMax-CF-ABS-TDS-v1 | 11 | 2 | 0 | 5 | 0 |
| D-COLORFABB-XT-PAGE | 8 | 2 | 0 | 0 | 0 |
| R-COLORFABB-colorFabb-BronzeFill-TDS | 15 | 2 | 0 | 1 | 0 |
| R-COLORFABB-colorFabb-Economy-PLA-TDS | 15 | 2 | 0 | 1 | 0 |
| R-COLORFABB-colorFabb-PETG-Economy-TDS | 14 | 2 | 0 | 0 | 0 |
| R-COLORFABB-colorFabb-SteelFill-TDS | 15 | 2 | 0 | 1 | 0 |
| R-ERYONE-eryone-petg-tds | 26 | 2 | 0 | 10 | 0 |
| R-ERYONE-eryone-pla-light-weight-tds | 24 | 2 | 0 | 6 | 0 |
| R-ESUN-PRIORITY-20261003-0da78e0ff9ef | 5 | 2 | 0 | 0 | 0 |
| R-3DJAKE-FIBERLOGY-ASA-TDS | 19 | 2 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-ABS-TDS | 13 | 2 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-ABS-TDS-4 | 19 | 2 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-ABSPLUS-TDS | 13 | 2 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-EASY-PET-G-TDS-5 | 18 | 2 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-HSPLACLEAR-TDS | 10 | 2 | 0 | 2 | 0 |
| R-FIBERLOGY-FIBERLOGY-R-ABS-TDS-0 | 21 | 2 | 0 | 1 | 0 |
| R-FIBERLOGY-FIBERLOGY-R-PET-G-TDS-0 | 20 | 2 | 0 | 2 | 0 |
| R-FIBERLOGY-FIBERLOGY-RABS-TDS | 15 | 2 | 0 | 2 | 0 |
| D-FILLAMENTUM-NYLON-CF15-PAGE | 18 | 2 | 0 | 0 | 0 |
| S-PET-formfutura-tds-carbonfilcf03 | 12 | 2 | 0 | 1 | 0 |
| S-PET-TDS-ApolloX | 11 | 2 | 0 | 0 | 2 |
| R-YOUSU-YOUSUPVBTDS-9c2c | 15 | 2 | 0 | 2 | 1 |
| I-CF-ABS-TDS | 17 | 2 | 0 | 5 | 0 |
| I-PLA-HS-PLA-Matte-TDS | 12 | 2 | 0 | 7 | 0 |
| R-MARKFORGED-Precise-PLA-TDS-REV-3-11-22 | 16 | 2 | 0 | 2 | 0 |
| R-MATTERHACKERS-PRINT-20260928-9046b58e8a43 | 8 | 2 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-4b8JqK | 17 | 2 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-d0cX8m | 16 | 2 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-HQsnRp | 16 | 2 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-PjYTX0 | 19 | 2 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-xomIDF | 16 | 2 | 0 | 0 | 0 |
| D-NANOVIA-FLEX-V0-MSDS | 7 | 2 | 0 | 0 | 0 |
| R-NANOVIA-ASA | 18 | 2 | 0 | 0 | 0 |
| R-NANOVIA-PLA-XRS | 16 | 2 | 0 | 0 | 0 |
| R-NANOVIA-PRIORITY-20261002-1ac5d2cab49d | 7 | 2 | 0 | 0 | 0 |
| R-NANOVIA-PRIORITY-20261002-7672b9b52cb5 | 7 | 2 | 0 | 0 | 0 |
| R-RECREUS-PET-G-CF-TECHNICAL-DATA-SHEET-TDS-2022 | 10 | 2 | 0 | 3 | 0 |
| D-YOUSU-PC-PAGE | 6 | 2 | 0 | 0 | 0 |
| X-3DXSTAT-ESD-PA12-TDS-v1 | 15 | 1 | 0 | 3 | 0 |
| X-3DXTECH-PRINT-20260928-55ca40b64fa1 | 2 | 1 | 0 | 0 | 0 |
| D-COLORFABB-NGEN-PAGE | 3 | 1 | 0 | 0 | 0 |
| D-EXTRUDR-GREENTEC-PRO-CF-MSDS-DE | 9 | 1 | 0 | 0 | 0 |
| D-EXTRUDR-GREENTEC-PRO-MSDS-EN | 9 | 1 | 0 | 0 | 0 |
| D-FIBERLOGY-FIBERFLEX-40D-SDS-EN | 10 | 1 | 0 | 1 | 0 |
| D-FIBERLOGY-RPP-FILAMENT-PAGE | 14 | 1 | 0 | 0 | 0 |
| D-FIBERLOGY-MATTFLEX-40D-SDS-EN | 10 | 1 | 0 | 1 | 0 |
| R-FIBERLOGY-FIBERLOGY-NYLONPA12-TDS | 15 | 1 | 0 | 2 | 0 |
| R-FIBERLOGY-FIBERLOGY-PCTG-TDS | 15 | 1 | 0 | 1 | 0 |
| R-FIBERLOGY-FIBERLOGY-PCTGCF-TDS | 13 | 1 | 0 | 3 | 0 |
| R-FIBERLOGY-FIBERLOGY-PCTGGF-TDS | 13 | 1 | 0 | 2 | 0 |
| R-FIBERLOGY-FIBERLOGY-PCTGGF-TDS-1 | 13 | 1 | 0 | 1 | 0 |
| R-FIBERLOGY-FIBERLOGY-PLAMINERAL-TDS | 13 | 1 | 0 | 2 | 0 |
| R-FILAMENT2PRINT-AddNorth-Koltron-KG1 | 10 | 1 | 0 | 0 | 0 |
| D-FILLAMENTUM-FLEXFILL-TPE-90A-SDS | 7 | 1 | 0 | 1 | 0 |
| D-FILLAMENTUM-FLEXFILL-TPE-96A-SDS | 7 | 1 | 0 | 1 | 0 |
| D-FILLAMENTUM-NYLON-FX256-SDS | 6 | 1 | 0 | 0 | 0 |
| R-FORMFUTURA-STYX-PA6-TDS | 16 | 1 | 0 | 0 | 0 |
| S-PET-TDS-EasyFil-PET | 12 | 1 | 0 | 1 | 1 |
| R-YOUSU-YOUSU3DPPTDS-4872 | 11 | 1 | 0 | 5 | 0 |
| R-YOUSU-YOUSUNylonTDS-38ef | 13 | 1 | 0 | 3 | 0 |
| R-YOUSU-YOUSUSILKPLATDS-81c3 | 13 | 1 | 0 | 2 | 0 |
| I-PLA-Glass-Fiber-Technical-Data-Sheet | 9 | 1 | 0 | 5 | 0 |
| I-PLA-HDPE-GF-TDS | 11 | 1 | 0 | 5 | 0 |
| I-PP-TDS | 13 | 1 | 0 | 6 | 0 |
| R-MARKFORGED-Onyx-GF-Material-Datasheet | 51 | 1 | 0 | 24 | 0 |
| R-NANOVIA-PRIORITY-20261002-a570add2d2c7 | 8 | 1 | 0 | 5 | 0 |
| D-SPECTRUM-THERMATECH-PA-SDS | 7 | 1 | 0 | 1 | 0 |
| D-YOUSU-PP-PAGE | 10 | 1 | 0 | 1 | 0 |
| R-3D4MAKERS-TDS-ASA-Filament | 20 | 1 | 0 | 1 | 0 |
| X-3DXTECH-PRINT-20260928-5a8d5a8251f9 | 11 | 1 | 0 | 0 | 0 |
| X-ECOMAX-Triton-PC-ABS-TDS-v1 | 11 | 1 | 0 | 6 | 0 |
| XP-carbonx-nylon-12-cf-1-2 | 9 | 1 | 0 | 0 | 0 |
| R-3DJAKE-PLA-TDS | 16 | 1 | 0 | 1 | 1 |
| R-BAMBU-PRIORITY-20261003-b02fd3e64625 | 6 | 1 | 0 | 0 | 0 |
| R-3DJAKE-FIBERLOGY-ABS-TDS | 19 | 1 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-ABS-PLUS-TDS | 19 | 1 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-ASA-TDS | 12 | 1 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-EASY-PET-G-TDS | 18 | 1 | 0 | 1 | 0 |
| R-FIBERLOGY-FIBERLOGY-EASYABS-TDS | 10 | 1 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-EASYPETG-TDS | 15 | 1 | 0 | 1 | 0 |
| R-FIBERLOGY-FIBERLOGY-EASYPLA-TDS | 14 | 1 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-HIPS-TDS | 13 | 1 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-HS-PLA-CLEAR-TDS | 9 | 1 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-MATTE-PET-G-TDS | 11 | 1 | 0 | 1 | 0 |
| R-FIBERLOGY-FIBERLOGY-MATTEASA-TDS | 12 | 1 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-NYLONPA12CF15-TDS | 12 | 1 | 0 | 1 | 0 |
| R-FIBERLOGY-FIBERLOGY-NYLONPA12GF15-TDS | 14 | 1 | 0 | 3 | 0 |
| R-FIBERLOGY-FIBERLOGY-PETGCF-TDS | 14 | 1 | 0 | 3 | 0 |
| R-FIBERLOGY-FIBERLOGY-PETGV0-TDS | 15 | 1 | 0 | 2 | 0 |
| R-FIBERLOGY-FIBERLOGY-RPETG-TDS | 17 | 1 | 0 | 1 | 0 |
| R-FIBERLOGY-FIBERLOGY-RPLA-TDS | 17 | 1 | 0 | 1 | 0 |
| S-PET-formfutura-tds-highprecisionpla | 18 | 1 | 0 | 1 | 1 |
| S-PET-tds-aquasolve-pva | 11 | 1 | 0 | 0 | 0 |
| S-PET-TDS-EasyCork | 12 | 1 | 0 | 0 | 0 |
| S-PET-TDS-ReForm-rPET | 16 | 1 | 0 | 0 | 0 |
| R-YOUSU-POM-TDS | 19 | 1 | 0 | 4 | 0 |
| R-YOUSU-YOUSUPETGTDS-8fb4 | 22 | 1 | 0 | 1 | 0 |
| R-YOUSU-YOUSUPLATDS-8e09 | 13 | 1 | 0 | 1 | 0 |
| R-YOUSU-YOUSUWOODTDS-eb4e | 12 | 1 | 0 | 1 | 0 |
| I-ASA-Glass-Fiber-Technical-Data-Sheet | 12 | 1 | 0 | 2 | 0 |
| I-PA6-CF-TDS | 13 | 1 | 0 | 7 | 0 |
| I-PC-CF-TDS | 12 | 1 | 0 | 6 | 0 |
| I-PETG-Glass-Fiber-Technical-Data-Sheet | 11 | 1 | 0 | 1 | 0 |
| I-PLA-ABS-Glass-Fiber-Technical-Data-Sheet | 11 | 1 | 0 | 2 | 0 |
| I-PLA-PDS-TDS | 13 | 1 | 0 | 0 | 0 |
| I-PLA-PLA-i5-TDS | 9 | 1 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-8ufmBp | 12 | 1 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-eSeA4O | 12 | 1 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-ETCZbl | 12 | 1 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-eTmXdZ | 12 | 1 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-vQ0bKO | 15 | 1 | 0 | 0 | 0 |
| R-NANOVIA-COVERAGE-20261001-bb1289b8f753 | 3 | 1 | 0 | 0 | 0 |
| R-NANOVIA-PLA-VX | 21 | 1 | 0 | 0 | 0 |
| R-NANOVIA-PLA-Wood | 13 | 1 | 0 | 0 | 0 |
| R-NANOVIA-PRIORITY-20261002-5ed344eda07d | 6 | 1 | 0 | 0 | 0 |
| R-NANOVIA-PRIORITY-20261002-c23075f2d0a8 | 4 | 1 | 0 | 0 | 0 |
| S-PVB-technisches-datenblatt-1 | 16 | 1 | 0 | 0 | 0 |
| S-PCGF-PETG-CF-v2 | 9 | 1 | 0 | 0 | 0 |
| R-ULTIMAKER-Method-Filament-PETG | 12 | 1 | 0 | 0 | 0 |
| D-3DJAKE-ECOPLA-CF-DARK-GREY-PAGE | 6 | 0 | 0 | 0 | 0 |
| D-3DJAKE-PCTG-BLACK-1-PAGE | 5 | 0 | 0 | 0 | 0 |
| R-COLORFABB-PRINT-20260928-e02f420a2e56 | 4 | 0 | 0 | 4 | 0 |
| R-EXTRUDR-AIS | 8 | 0 | 0 | 1 | 0 |
| D-FABRU-PUREFIL-PLA-SILK-FILAMENT-991-9549-PAGE | 7 | 0 | 0 | 1 | 0 |
| D-FABRU-PUREFIL-HDPE-GF20-FILAMENT-169-1313-PAGE | 9 | 0 | 0 | 1 | 0 |
| D-FABRU-PUREFIL-PUREFIL-PBT-FILAMENT-285-7080-PAGE | 9 | 0 | 0 | 0 | 0 |
| D-FABRU-PUREFIL-PUREFIL-SAN-FILAMENT-309-7549-PAGE | 8 | 0 | 0 | 0 | 0 |
| R-FILLAMENTUM-PRIORITY-20261003-8404042c1271 | 50 | 0 | 0 | 1 | 0 |
| S-PET-TDS-BVOH | 8 | 0 | 0 | 0 | 0 |
| S-PET-TDS-Centaur-PP | 11 | 0 | 0 | 0 | 1 |
| S-PET-TDS-Crystal-Flex | 15 | 0 | 0 | 0 | 0 |
| S-PET-TDS-Pegasus-PP-GF | 10 | 0 | 0 | 0 | 0 |
| S-PET-TDS-Silk-Gloss-PLA | 8 | 0 | 0 | 0 | 0 |
| S-PET-TDS-STYX-12 | 11 | 0 | 0 | 0 | 0 |
| I-ISANMATE-FORMNEXT-BLOG-PAGE | 2 | 0 | 0 | 0 | 0 |
| D-KIMYA-FILAMENT-PAGE | 2 | 0 | 0 | 0 | 0 |
| R-COVERAGE-20261001-14396b9c74a0 | 7 | 0 | 0 | 0 | 0 |
| R-NINJATEK-Chinchilla-TDS | 12 | 0 | 0 | 0 | 0 |
| D-SPECTRUM-PLA-BIO-CATEGORY | 4 | 0 | 0 | 0 | 0 |
| D-YOUSU-SILK-PLA-PAGE | 4 | 0 | 0 | 0 | 0 |
| D-3DJAKE-ASA-BLACK-PAGE | 6 | 0 | 0 | 0 | 0 |
| D-3DJAKE-ASA-CF-BLACK-2-PAGE | 7 | 0 | 0 | 0 | 0 |
| D-3DJAKE-EASYPETG-CF-PAGE | 4 | 0 | 0 | 0 | 0 |
| D-3DJAKE-MATTEPLA-BLACK-PAGE | 6 | 0 | 0 | 0 | 0 |
| XP-triton-asa | 1 | 0 | 0 | 0 | 0 |
| D-FABRU-PUREFIL-ASA-FILAMENT-152-1155-PAGE | 6 | 0 | 0 | 0 | 0 |
| D-FABRU-PUREFIL-PUREFIL-ASA-CF10-FILAMENT-996-9565-PAGE | 5 | 0 | 0 | 0 | 0 |
| D-FABRU-PUREFIL-PUREFIL-PLA-FILAMENT-329-7710-PAGE | 6 | 0 | 0 | 0 | 0 |
| D-FLASH-PLA-HS-TDS-EN | 21 | 0 | 0 | 0 | 1 |
| S-PET-TDS-ABSpro | 16 | 0 | 0 | 0 | 0 |
| S-PET-TDS-ABSpro-Flame-Retardant | 10 | 0 | 0 | 0 | 0 |
| S-PET-TDS-Atlas-Support | 9 | 0 | 0 | 0 | 0 |
| S-PET-TDS-CarbonFil | 12 | 0 | 0 | 0 | 0 |
| S-PET-TDS-ClearScent-ABS | 15 | 0 | 0 | 0 | 0 |
| S-PET-TDS-EasyFil-ABS | 16 | 0 | 0 | 0 | 0 |
| S-PET-TDS-EasyFil-HIPS | 15 | 0 | 0 | 0 | 0 |
| S-PET-TDS-EasyFil-PLA | 15 | 0 | 0 | 0 | 0 |
| S-PET-TDS-EasyWood | 14 | 0 | 0 | 0 | 0 |
| S-PET-TDS-ePETG | 9 | 0 | 0 | 2 | 0 |
| S-PET-TDS-ePLA | 12 | 0 | 0 | 1 | 0 |
| S-PET-tds-hdglass | 15 | 0 | 0 | 0 | 0 |
| S-PET-TDS-High-Gloss-PLA | 10 | 0 | 0 | 0 | 0 |
| S-PET-TDS-Matt-PLA | 9 | 0 | 0 | 0 | 0 |
| S-PET-TDS-MetalFil-Ancient-Bronze | 11 | 0 | 0 | 0 | 0 |
| S-PET-TDS-MetalFil-Brass | 8 | 0 | 0 | 0 | 0 |
| S-PET-TDS-MetalFil-Classic-Copper | 12 | 0 | 0 | 0 | 0 |
| S-PET-TDS-Premium-ABS | 17 | 0 | 0 | 0 | 0 |
| S-PET-TDS-Premium-PLA | 16 | 0 | 0 | 0 | 0 |
| S-PET-TDS-ReFill-PETG | 8 | 0 | 0 | 2 | 0 |
| S-PET-TDS-ReFill-PLA | 8 | 0 | 0 | 1 | 0 |
| S-PET-TDS-StoneFil | 13 | 0 | 0 | 0 | 0 |
| S-PET-TDS-Tough-PLA | 10 | 0 | 0 | 0 | 0 |
| S-PET-TDS-Volcano-PLA | 13 | 0 | 0 | 0 | 0 |
| R-YOUSU-YOUSUABSTDS-cc2f | 9 | 0 | 0 | 1 | 0 |
| R-YOUSU-YOUSUPLATDS-081b | 13 | 0 | 0 | 2 | 0 |
| R-YOUSU-YOUSUPVATDS-6752 | 12 | 0 | 0 | 1 | 0 |
| I-PLA-ASA-TDS | 12 | 0 | 0 | 5 | 0 |
| I-PLA-PETG-CF-TDS | 14 | 0 | 0 | 5 | 0 |
| R-MATTERHACKERS-PRO-SERIES-iagZgf | 10 | 0 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-ri8LR8 | 12 | 0 | 0 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261003-c606d37e008e | 3 | 0 | 0 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261003-edf1439487e0 | 3 | 0 | 0 | 0 | 0 |
| R-SIRAYA-COVERAGE-20260930-73328d4145ba | 2 | 0 | 0 | 0 | 0 |
| R-SUNLU-COVERAGE-20261001-6bdcca0ceec2 | 10 | 0 | 0 | 8 | 0 |
| D-YOUSU-PETG-PAGE | 6 | 0 | 0 | 0 | 0 |

## Invalid rows

| reason | rows |
|---|---|
| number_lo | 36 |
| confidence | 16 |
| operator | 4 |
| context-scope | 1 |
| number_hi | 1 |
| verdict | 1 |


## Files

- new-settings.csv: 6156
- new-values.csv: 3885
- mismatches.csv: 2181
- context.csv: 2133
- unmapped.csv: 4605
- identity.csv: 3716
- confirms.csv: 15003
- invalid.csv: 56
- duplicates.csv: 1186
- unread-held.csv: 176
- second-read/tasks.csv: 1792
