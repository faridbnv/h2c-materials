# Reconcile imp1

> **Historical record** (2026-10-06): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

1265 reading(s) classified, 0 invalid, 49 duplicate(s) dropped, 1 marked none. 1 second-read task(s) outstanding.

## By class

| class | rows |
|---|---|
| new | 624 |
| context | 231 |
| confirms | 191 |
| unmapped | 135 |
| mismatch | 52 |
| context-held | 32 |

## By presence

| presence | rows |
|---|---|
| text | 1139 |
| visual-only | 124 |
| block | 2 |

## Second read

| status | rows |
|---|---|
| not-required | 619 |
| agreed | 485 |
| agreed-reader | 83 |
| agreed-text | 57 |
| disagrees | 20 |
| pending | 1 |

## Machine second read (the importer's sheet reader)

| rows | machine agrees | share |
|---|---|---|
| new decision-field rows | 94 | 94 of 540 (17 %) |
| new decision-field rows the page text pairs with their label (agreed-text, no read) | 57 | 57 of 540 |
| mismatches (agrees with the page reading, not the held row) | 3 | 3 of 52 (6 %) |

Documents with no machine reading (no current text cache): 0 row(s).

## Class by kind and field

| kind | field | class | rows |
|---|---|---|---|
| value | Charpy strength | new | 309 |
| value | Izod impact strength | new | 231 |
| context | impact | context | 156 |
| value | Izod impact strength | confirms | 113 |
| value | Impact strength | new | 84 |
| value | Charpy strength | confirms | 77 |
| context | all | context | 75 |
| value | Izod impact strength | unmapped | 69 |
| value | Charpy strength | mismatch | 36 |
| context | impact | context-held | 26 |
| value | Impact strength | unmapped | 17 |
| value | Izod impact strength | mismatch | 14 |
| value | Charpy strength | unmapped | 12 |
| context | all | context-held | 6 |
| value | unmapped:Multiaxial instrumented impact, peak force (-30°C) | unmapped | 5 |
| value | unmapped:Puncture maximum energy (-30°C) | unmapped | 5 |
| value | unmapped:Puncture Maximum Force | unmapped | 5 |
| value | unmapped:Multiaxial instrumented impact peak force | unmapped | 4 |
| value | unmapped:Puncture Energy | unmapped | 3 |
| value | unmapped:Tensile Notched Impact Strength | unmapped | 3 |
| value | Impact strength | mismatch | 2 |
| value | unmapped:Durchstoß-Arbeit | unmapped | 2 |
| value | unmapped:Durchstoßverhalten - Maximalkraft | unmapped | 2 |
| value | unmapped:Modulus (under Impact Properties: ASTM D256, ASTM D4812) | unmapped | 2 |
| value | unmapped:Peak Strength (under Impact Properties: ASTM D256, ASTM D4812) | unmapped | 2 |
| value | unmapped:Puncture Performance - Maximum Force | unmapped | 2 |
| value | Impact strength | confirms | 1 |
| value | unmapped:Impact energy | unmapped | 1 |
| value | unmapped:Tensile Impact Strength (3.18mm) | unmapped | 1 |

## By document

| SourceID | rows | new | mismatch | visual-only | held rows unread |
|---|---|---|---|---|---|
| R-DUPONT-ZYTEL-GUIDE | 183 | 160 | 5 | 9 | 13 |
| R-EXTRUDR-PRIORITY-20261003-ce91065b0c8a | 4 | 1 | 2 | 0 | 12 |
| B-PC-Bambu-PLA-Matte-Technical-Data-Sheet | 4 | 0 | 2 | 2 | 18 |
| B-pva-TDS | 2 | 0 | 2 | 0 | 13 |
| R-EXTRUDR-durapro-pc-pbt-cf-TDS-en | 6 | 0 | 2 | 0 | 17 |
| R-EXTRUDR-durapro-pc-pbt-cf-TDS-en-3a6807 | 6 | 0 | 2 | 0 | 18 |
| R-EXTRUDR-durapro-pc-pbt-cf-TDS-it | 6 | 0 | 2 | 0 | 10 |
| R-EXTRUDR-durapro-pc-pbt-TDS-de | 6 | 0 | 2 | 0 | 16 |
| R-EXTRUDR-durapro-pc-pbt-TDS-en | 6 | 0 | 2 | 0 | 16 |
| R-BASF-Ultrafuse-TPS-90A-TDS-EN-v1-1 | 7 | 2 | 1 | 0 | 16 |
| D-FIBERLOGY-PCTG-FILAMENT-PAGE | 3 | 1 | 1 | 0 | 2 |
| R-NINJATEK-TDS-EEL-Revision1-26-06-V1 | 4 | 1 | 1 | 0 | 9 |
| R-3D4MAKERS-TDS-PETG-Filament | 2 | 0 | 1 | 1 | 13 |
| R-COLORFABB-Files-colorFabb | 3 | 0 | 1 | 2 | 8 |
| R-COLORFABB-TDS-E-colorFabb-PLA-Chameleon | 5 | 0 | 1 | 0 | 17 |
| R-EXTRUDR-pla-nx2-matt-TDS-en | 2 | 0 | 1 | 0 | 12 |
| R-EXTRUDR-pla-nx2-TDS-en | 2 | 0 | 1 | 0 | 11 |
| D-FIBERLOGY-PETGPTFE-FILAMENT-PAGE | 2 | 0 | 1 | 0 | 2 |
| R-FIBERLOGY-FIBERLOGY-PETG-PTFE-TDS | 2 | 0 | 1 | 0 | 4 |
| R-FIBERLOGY-FIBERLOGY-PETGPTFE-TDS | 2 | 0 | 1 | 0 | 6 |
| S-POLYCN-index-php-controller-attachment-id-attachment-3937 | 3 | 0 | 1 | 0 | 16 |
| S-POLYCN-TDS-Polymaker-PolyLite-CosPLA-Version-A-V5-5-2025-12-30-EN | 3 | 0 | 1 | 0 | 18 |
| S-POLYCN-TDS-Polymaker-PolyMax-PC-V5-5-2026-01-05-EN | 3 | 0 | 1 | 0 | 18 |
| R-3D4MAKERS-TDS-PEI-ULTEM-1010 | 2 | 0 | 1 | 0 | 16 |
| R-3D4MAKERS-TDS-PEI-ULTEM-9085 | 3 | 0 | 1 | 0 | 14 |
| R-3DJAKE-TDS-3DJAKE-ABS-CF | 4 | 0 | 1 | 0 | 11 |
| R-COLORFABB-colorFabb-PA-CF-Low-Warp-TDS | 2 | 0 | 1 | 0 | 6 |
| R-COLORFABB-colorFabb-XT-Filament-TDS | 2 | 0 | 1 | 0 | 11 |
| R-COLORFABB-TDS-E-colorFabb-PA-NEAT | 4 | 0 | 1 | 0 | 7 |
| R-COLORFABB-TDS-E-PA-Blue-Metal-Detectable | 4 | 0 | 1 | 1 | 7 |
| R-EXTRUDR-durapro-pa6-cf-TDS-en | 3 | 0 | 1 | 0 | 12 |
| R-EXTRUDR-durapro-pa6-gf-TDS-en | 3 | 0 | 1 | 0 | 12 |
| D-FIBERLOGY-FIBERFLEXCF-FILAMENT-S2-PAGE | 2 | 0 | 1 | 0 | 1 |
| R-FIBERLOGY-FIBERLOGY-FIBERFLEX-CF-TDS | 2 | 0 | 1 | 0 | 10 |
| R-FIBERLOGY-FIBERLOGY-FIBERFLEXCF-TDS | 2 | 0 | 1 | 0 | 10 |
| R-MARKFORGED-Onyx-GF-Material-Datasheet | 3 | 0 | 1 | 0 | 35 |
| R-NANOVIA-PC-ABS | 3 | 0 | 1 | 0 | 3 |
| S-SPECTRUM-en-tds-spectrum-pa6-low-warp | 3 | 0 | 1 | 0 | 11 |
| S-SPECTRUM-en-tds-spectrum-pla-conductive | 3 | 0 | 1 | 0 | 7 |
| S-SPECTRUM-en-tds-spectrum-wood | 2 | 0 | 1 | 0 | 8 |
| R-CELANESE-ZYTEL-101L | 16 | 15 | 0 | 0 | 0 |
| B-PC-PLA-Pure-TDS | 15 | 14 | 0 | 14 | 0 |
| B-PC-uVYGQd | 15 | 13 | 0 | 14 | 7 |
| R-STRATASYS-mds-fdm-asa-0826a | 27 | 12 | 0 | 0 | 0 |
| R-BAMBU-PRIORITY-20261003-0419c91c3241 | 9 | 9 | 0 | 0 | 0 |
| R-BAMBU-PRIORITY-20261003-0edbf0fe469b | 9 | 9 | 0 | 0 | 0 |
| R-STRATASYS-mds-fdm-absesd7-0222a | 18 | 8 | 0 | 0 | 0 |
| R-STRATASYS-mds-fdm-hips-0823a | 17 | 8 | 0 | 0 | 0 |
| R-STRATASYS-mds-fdm-pa6-66-gf30-fr-0726a | 17 | 8 | 0 | 0 | 0 |
| R-STRATASYS-mds-fdm-ultem-1010-resin-0626a | 18 | 8 | 0 | 0 | 0 |
| R-BAMBU-PLA-TOUGH-20261005 | 6 | 6 | 0 | 0 | 0 |
| R-BAMBU-PRIORITY-20261003-4c2eebbe6cf6 | 6 | 6 | 0 | 0 | 0 |
| R-QIDI-PETG-RAPIDO | 7 | 6 | 0 | 1 | 0 |
| R-BAMBU-PRIORITY-20261003-a8afbb5aeeaf | 6 | 6 | 0 | 0 | 0 |
| R-BASF-FORWARD-AM-PRINT-20260928-0270c48dc78a | 6 | 6 | 0 | 0 | 0 |
| R-QIDI-PETG-GF | 6 | 6 | 0 | 0 | 0 |
| R-FILLAMENTUM-READER-20261004-9dd673e2310b | 5 | 5 | 0 | 0 | 0 |
| R-COLORFABB-TDS-E-colorFabb-PLA-Vertigo | 5 | 4 | 0 | 0 | 0 |
| R-EXTRUDR-GAP2-20261005-8a59c7615526 | 4 | 4 | 0 | 0 | 0 |
| S-PVB-7-PLA-Recycled-Prusament-TDS-2021-V4 | 7 | 4 | 0 | 0 | 0 |
| S-PVB-prusament-pla-technical-data-sheet | 7 | 4 | 0 | 0 | 0 |
| R-STRATASYS-mds-fdm-abs-m30-0826a | 15 | 4 | 0 | 10 | 0 |
| R-STRATASYS-mds-fdm-absm30i-0621a | 4 | 4 | 0 | 0 | 0 |
| R-ULTIMAKER-MAKERBOT-Tough-One-Sheet | 7 | 4 | 0 | 2 | 8 |
| R-BAMBU-PRIORITY-20261003-94bc784d0793 | 4 | 4 | 0 | 0 | 0 |
| R-DUPONT-DELRIN-100P | 6 | 4 | 0 | 5 | 0 |
| R-EXTRUDR-PRIORITY-20261003-4eb5a75440e8 | 6 | 4 | 0 | 0 | 0 |
| R-EXTRUDR-PRIORITY-20261003-70456e37bf44 | 6 | 4 | 0 | 0 | 0 |
| S-PVB-53ee8f5e-tds-prusament-pei-1010-en | 5 | 4 | 0 | 2 | 2 |
| S-PVB-e032493a-tds-pc-space-grade-en | 5 | 4 | 0 | 4 | 12 |
| S-PVB-Prusament-PC-Space-Grade-Black | 5 | 4 | 0 | 4 | 3 |
| S-PVB-PCBlend-Prusament-TDS-2022-16-EN | 5 | 4 | 0 | 4 | 16 |
| R-STRATASYS-FDM-NYLON12-MDS | 9 | 4 | 0 | 0 | 0 |
| R-STRATASYS-mds-fdm-pc-0426a | 9 | 4 | 0 | 0 | 0 |
| R-STRATASYS-mds-fdm-pc-abs-0823a | 9 | 4 | 0 | 0 | 0 |
| R-STRATASYS-mds-fdm-pciso-0820a | 4 | 4 | 0 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-ABS-Prime-pptx | 4 | 3 | 0 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-ASA-Prime-pptx | 4 | 3 | 0 | 0 | 0 |
| R-BAMBU-PRIORITY-20261003-6e425b0d7ce7 | 3 | 3 | 0 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261002-29b58f0eea90 | 4 | 3 | 0 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261002-e2d172d8d9f3 | 4 | 3 | 0 | 0 | 0 |
| R-RECREUS-PLA | 3 | 3 | 0 | 3 | 0 |
| R-CREATBOT-PRINT-20260928-3148a159f1e5 | 3 | 3 | 0 | 0 | 0 |
| S-PET-TDS-PEI-ULTEM-9085 | 3 | 3 | 0 | 2 | 0 |
| R-POLYMAKER-PRIORITY-20261003-67deefea2e32 | 4 | 3 | 0 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261003-749f634c9bfa | 4 | 3 | 0 | 0 | 0 |
| R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-V3-0-0 | 3 | 2 | 0 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-PLA | 3 | 2 | 0 | 2 | 0 |
| R-COLORFABB-TDS-ColorFabb-StoneFill | 3 | 2 | 0 | 1 | 0 |
| D-CREATBOT-ASA-PAGE | 3 | 2 | 0 | 0 | 0 |
| D-ESUN-EPLA-LITE-PRODUCT-PAGE | 2 | 2 | 0 | 0 | 0 |
| R-EXTRUDR-durapro-abs-TDS-fr | 2 | 2 | 0 | 0 | 0 |
| R-FIBERLOGY-PRINT-20260928-78dc0a4f3640 | 2 | 2 | 0 | 0 | 0 |
| R-FIBERLOGY-PRINT-20260928-7bb43c8e086b | 2 | 2 | 0 | 0 | 0 |
| I-PLA-ABS-TDS | 2 | 2 | 0 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261002-06bd5efb417b | 3 | 2 | 0 | 0 | 0 |
| S-POLYCN-PolyMax-PETG-TDS-V4 | 3 | 2 | 0 | 0 | 14 |
| S-POLYCN-PolyTerra-PLA-TDS-V5-11 | 2 | 2 | 0 | 0 | 0 |
| S-POLYCN-TDS-Polymaker-PolyLite-CosPLA-Version-B-V5-5-2025-12-30-EN | 3 | 2 | 0 | 0 | 0 |
| S-POLYCN-TDS-Polymaker-PolyLite-PETG-V6-0-2026-06-09-EN | 3 | 2 | 0 | 0 | 0 |
| S-PVB-technisches-datenblatt-2 | 3 | 2 | 0 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-smart-abs | 2 | 2 | 0 | 0 | 0 |
| R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-silk-V3-0 | 3 | 2 | 0 | 0 | 0 |
| CA-AMAZONCA-20260930-48eda39b257e | 2 | 2 | 0 | 0 | 0 |
| B-support-for-pa-pet-TDS | 3 | 2 | 0 | 0 | 13 |
| B-support-for-pla-petg-TDS | 2 | 2 | 0 | 0 | 13 |
| R-BAMBU-PRIORITY-20261003-a100c1bb3a92 | 2 | 2 | 0 | 0 | 0 |
| D-CREATBOT-PLA-CF-PAGE | 2 | 2 | 0 | 0 | 0 |
| S-PEBA-TPU-64D-TDS | 4 | 2 | 0 | 0 | 0 |
| R-EXTRUDR-GAP2-20261005-020a6507944e | 2 | 2 | 0 | 0 | 0 |
| D-FIBERLOGY-PEI-9085-FILAMENT-2-PAGE | 2 | 2 | 0 | 0 | 0 |
| R-FILAMENT2PRINT-Eco-Coffee | 3 | 2 | 0 | 0 | 0 |
| S-PET-formfutura-tds-styxpacf15 | 2 | 2 | 0 | 2 | 0 |
| S-PET-formfutura-tds-styxpagf30 | 2 | 2 | 0 | 2 | 0 |
| R-POLYMAKER-PRIORITY-20261003-02efe50f9eac | 3 | 2 | 0 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261003-540bc284ede5 | 3 | 2 | 0 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261003-aa05f44c1437 | 3 | 2 | 0 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261003-d06cdcda8dca | 3 | 2 | 0 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261003-effcc17a7754 | 3 | 2 | 0 | 0 | 0 |
| S-POLYCN-index-php-controller-attachment-id-attachment-236 | 4 | 2 | 0 | 0 | 12 |
| R-FILAMENT2PRINT-Smartfil-FLEX-77A | 3 | 2 | 0 | 0 | 0 |
| S-SPECTRUM-en-tds-spectrum-asax-cf10 | 3 | 2 | 0 | 0 | 0 |
| R-3D4MAKERS-TDS-Facilan-C8-Filament-v1-4 | 1 | 1 | 0 | 1 | 0 |
| R-3DJAKE-3DJAKE-23-TDS-HYPER-PETG-EN | 2 | 1 | 0 | 1 | 0 |
| R-3DJAKE-3DJAKE-TDS-ecoPLA-Sparkling-0 | 2 | 1 | 0 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-magicPLA | 2 | 1 | 0 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-mysteryPLA-v1-1 | 2 | 1 | 0 | 0 | 0 |
| R-3DJAKE-PLA-TDS-7 | 2 | 1 | 0 | 1 | 0 |
| D-BIGREP-PLX-PAGE | 2 | 1 | 0 | 0 | 2 |
| R-BIGREP-READER-20261004-3dad37a3417f | 1 | 1 | 0 | 0 | 0 |
| R-COLORFABB-TDS-E-ColorFabb-CopperFill | 3 | 1 | 0 | 0 | 7 |
| S-PET-TDS-PLACTIVE | 2 | 1 | 0 | 0 | 0 |
| R-FILAMENT2PRINT-CreatBot-ASA | 2 | 1 | 0 | 0 | 11 |
| S-PEBA-eSUN-eMarble-Filament-TDS-V4-0 | 3 | 1 | 0 | 0 | 0 |
| S-PEBA-eSUN-eTwinkling-Filament-TDS-V4-0 | 3 | 1 | 0 | 0 | 0 |
| S-PEBA-eSUN-PLA-Clear-Filament-TDS-V4-0 | 3 | 1 | 0 | 0 | 0 |
| S-PEBA-eSUN-PLA-Filament-TDS-V4-0 | 3 | 1 | 0 | 0 | 0 |
| R-EXTRUDR-PRIORITY-20261003-49ca17b00573 | 4 | 1 | 0 | 0 | 15 |
| R-EXTRUDR-PRIORITY-20261003-4f4b613ed9d4 | 3 | 1 | 0 | 0 | 12 |
| D-FIBERLOGY-RABS-FILAMENT-S2-PAGE | 1 | 1 | 0 | 0 | 0 |
| D-FIBERLOGY-RPETG-FILAMENT-S2-PAGE | 1 | 1 | 0 | 0 | 0 |
| D-FIBERLOGY-RPLA-FILAMENT-PAGE | 1 | 1 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-EASY-PLA-TDS-1 | 1 | 1 | 0 | 1 | 0 |
| R-FIBERLOGY-FIBERLOGY-NYLON-PA12CF15-TDS | 1 | 1 | 0 | 1 | 0 |
| R-FIBERLOGY-FIBERLOGY-NYLON-PA12GF15-TDS | 1 | 1 | 0 | 1 | 0 |
| R-FIBERLOGY-FIBERLOGY-R-PLA-TDS-0 | 1 | 1 | 0 | 1 | 0 |
| S-PET-formfutura-tds-apollox2024 | 1 | 1 | 0 | 0 | 0 |
| S-PET-formfutura-tds-easyfilabs-glowinthedark | 1 | 1 | 0 | 0 | 0 |
| S-PET-formfutura-tds-titanx | 1 | 1 | 0 | 0 | 0 |
| S-PET-TDS-ReForm-rPLA | 1 | 1 | 0 | 0 | 0 |
| I-PLA-PDS-TDS | 1 | 1 | 0 | 0 | 0 |
| I-PLA-PLA-i5-TDS | 1 | 1 | 0 | 0 | 0 |
| I-PLA-PLA-i6-TDS | 1 | 1 | 0 | 0 | 0 |
| R-3DJAKE-KINGROON-ABS-Technical-Data-Sheet-V1-0 | 4 | 1 | 0 | 0 | 17 |
| R-MATTERHACKERS-PRO-SERIES-8ufmBp | 1 | 1 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-eSeA4O | 1 | 1 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-ETCZbl | 1 | 1 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-eTmXdZ | 1 | 1 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-8AWUF9 | 1 | 1 | 0 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261002-1b7d35606338 | 2 | 1 | 0 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261002-419d1e9d4bcd | 2 | 1 | 0 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261002-a01e6574d210 | 2 | 1 | 0 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261003-56f939384206 | 2 | 1 | 0 | 0 | 0 |
| S-POLYCN-index-php-controller-attachment-id-attachment-167 | 2 | 1 | 0 | 0 | 11 |
| S-POLYCN-PolyLite-PETG-TDS-V3 | 2 | 1 | 0 | 0 | 11 |
| S-POLYCN-PolyLite-PLA-TDS-V3 | 2 | 1 | 0 | 0 | 11 |
| S-POLYCN-Polymaker-PC-Max-TDS-v1-0 | 2 | 1 | 0 | 0 | 0 |
| S-POLYCN-PolyMax-PLA-TDS-v1 | 2 | 1 | 0 | 0 | 0 |
| D-RAISE3D-Raise3d-Premium-PETG-TDS-V3 | 3 | 1 | 0 | 0 | 0 |
| R-RECREUS-PLA-Purifier | 3 | 1 | 0 | 0 | 7 |
| D-SIRAYA-fibreheart-petg-cf-pro-filament-technical-data-tds | 2 | 1 | 0 | 0 | 0 |
| S-SPECTRUM-pl-tds-spectrum-high-speed | 1 | 1 | 0 | 0 | 0 |
| S-SPECTRUM-pl-tds-spectrum-petg-frv0 | 2 | 1 | 0 | 0 | 0 |
| S-SPECTRUM-pl-tds-spectrum-pla-nature | 1 | 1 | 0 | 0 | 0 |
| R-SUNLU-High-Speed-ABS-TDS | 2 | 1 | 0 | 0 | 14 |
| R-SUNLU-Silk-PLA-Four-Color-TDS-fc0f1921-f20b-4dee-8742-08d11bddaea8 | 2 | 1 | 0 | 0 | 13 |
| D-3D4MAKERS-PEI-FILAMENT-PAGE | 1 | 1 | 0 | 0 | 0 |
| D-3D4MAKERS-PEI-ULTEM-9085-FILAMENT-PAGE | 1 | 1 | 0 | 0 | 0 |
| D-3D4MAKERS-R-PEEK-FILAMENT-PAGE | 1 | 1 | 0 | 0 | 0 |
| R-3D4MAKERS-PRINT-20260928-8d7352c2d77f | 1 | 1 | 0 | 0 | 0 |
| R-3D4MAKERS-TDS-Facilan-HT-ElogioAM-v1-4 | 1 | 1 | 0 | 1 | 0 |
| R-3D4MAKERS-TDS-Facilan-PCL100-filament-V1-4 | 1 | 1 | 0 | 1 | 0 |
| R-3D4MAKERS-TDS-LUVOCOM-3F-PEKK-50082-Filament | 1 | 1 | 0 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-ecoPLA-Silk-Rainbow-v1-1 | 2 | 1 | 0 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-ecoPLA-Silk-v1-1 | 2 | 1 | 0 | 0 | 0 |
| R-3DJAKE-3DJAKE-TDS-ecoPLA-Wood-v1-1 | 2 | 1 | 0 | 0 | 0 |
| R-3DJAKE-SILK-TDS-4 | 1 | 1 | 0 | 0 | 0 |
| R-COLORFABB-colorFabb-nGen-Filament-TDS | 3 | 1 | 0 | 0 | 11 |
| R-FILAMENT2PRINT-CreatBot-UltraPA | 2 | 1 | 0 | 0 | 11 |
| R-ERYONE-eryone-hyper-speed-triple-color-silk-pla-tds | 3 | 1 | 0 | 0 | 0 |
| R-ERYONE-PRINT-20260928-9e82297a5891 | 3 | 1 | 0 | 0 | 0 |
| S-PEBA-eSUN-eFlex-Filament-TDS-V4-0 | 3 | 1 | 0 | 0 | 0 |
| S-PEBA-eSUN-ePA-Filament-TDS-V4-0 | 3 | 1 | 0 | 0 | 0 |
| S-PEBA-eSUN-PVA-Filament-TDS-V4-0 | 3 | 1 | 0 | 0 | 0 |
| S-PEBA-eSUN-TPE-83A-Filament-TDS-V4-0 | 3 | 1 | 0 | 0 | 0 |
| S-PEBA-eSUN-TPU-95A-Filament-TDS-V4-0 | 3 | 1 | 0 | 1 | 0 |
| S-PEBA-eSUN-TPU-HS-Filament-TDS | 3 | 1 | 0 | 1 | 0 |
| S-PEBA-eSUN-Wood-Filament-TDS-V4-0 | 3 | 1 | 0 | 1 | 0 |
| D-EXTRUDR-FLEX-MEDIUM-MATT-PAGE | 1 | 1 | 0 | 0 | 0 |
| R-EXTRUDR-durapro-pa12-cf-TDS-en | 5 | 1 | 0 | 0 | 11 |
| R-EXTRUDR-durapro-pa12-cf-TDS-en-11cea4 | 5 | 1 | 0 | 0 | 11 |
| R-EXTRUDR-durapro-pa12-cf-TDS-it | 5 | 1 | 0 | 0 | 8 |
| R-EXTRUDR-durapro-pa12-TDS-en | 5 | 1 | 0 | 0 | 11 |
| R-EXTRUDR-durapro-pc-fr-v0-TDS-de | 3 | 1 | 0 | 0 | 12 |
| R-EXTRUDR-durapro-pc-fr-v0-TDS-en | 3 | 1 | 0 | 0 | 16 |
| R-EXTRUDR-pla-basic-cf-TDS-en | 1 | 1 | 0 | 0 | 0 |
| R-EXTRUDR-pla-basic-cf-TDS-de-3 | 1 | 1 | 0 | 0 | 0 |
| D-FIBERLOGY-CPE-HTAG-ANTIBAC-FILAMENT-PAGE | 1 | 1 | 0 | 0 | 0 |
| R-EXTRUDR-PRINT-20260928-8ac1c5367674 | 5 | 1 | 0 | 0 | 10 |
| R-EXTRUDR-PRINT-20260929-245381f760f8 | 1 | 1 | 0 | 0 | 0 |
| R-EXTRUDR-PRINT-20260929-3793d04515ce | 1 | 1 | 0 | 0 | 0 |
| R-EXTRUDR-PRINT-20260929-c415150859a4 | 1 | 1 | 0 | 0 | 0 |
| R-EXTRUDR-PRINT-20260929-ca0239ac2a92 | 1 | 1 | 0 | 0 | 0 |
| R-EXTRUDR-PRIORITY-20261003-1d34d7823a2a | 1 | 1 | 0 | 0 | 0 |
| R-EXTRUDR-PRIORITY-20261003-8f1f07e586ce | 6 | 1 | 0 | 0 | 16 |
| R-EXTRUDR-PRIORITY-20261003-b3aff68293fc | 1 | 1 | 0 | 0 | 0 |
| R-EXTRUDR-PRIORITY-20261003-cafa71249318 | 5 | 1 | 0 | 0 | 17 |
| D-FIBERLOGY-FIBERWOOD-S2-PAGE | 1 | 1 | 0 | 0 | 0 |
| R-FIBERLOGY-PRINT-20260928-715fa20ea047 | 1 | 1 | 0 | 0 | 0 |
| R-FIBERLOGY-PRINT-20260928-8542185b8c6b | 1 | 1 | 0 | 0 | 0 |
| R-FIBERLOGY-PRINT-20260928-dff2ce2ac494 | 1 | 1 | 0 | 0 | 0 |
| R-FIBERLOGY-FIBERLOGY-CPE-HT-TDS-0 | 1 | 1 | 0 | 1 | 0 |
| R-FIBERLOGY-fiberlogypetgesdtds | 1 | 1 | 0 | 1 | 0 |
| D-FLASH-PBAT-TDS-EN | 2 | 1 | 0 | 0 | 0 |
| D-FLASH-TPU-TDS-EN | 2 | 1 | 0 | 0 | 0 |
| S-PET-formfutura-tds-athenax | 1 | 1 | 0 | 0 | 0 |
| S-PET-formfutura-tds-pythonflex | 1 | 1 | 0 | 0 | 0 |
| S-PET-TDS-AthenaX-GF10 | 1 | 1 | 0 | 1 | 0 |
| S-PET-TDS-FlexiFil | 1 | 1 | 0 | 0 | 0 |
| S-PET-TDS-FlexiFil-TPC-30D-0 | 1 | 1 | 0 | 0 | 0 |
| S-PET-TDS-FlexiFil-TPC-40D | 1 | 1 | 0 | 0 | 0 |
| D-IPCON-PRINT-20260928-01990cc2eb5c | 9 | 1 | 0 | 0 | 0 |
| S-IPCON-PRINT-20260928-2dbb3874b5e9 | 9 | 1 | 0 | 0 | 0 |
| R-LEHVOSS-READER-20261004-ca1190972e2a | 2 | 1 | 0 | 0 | 0 |
| S-PET-TDS-LUVOCOM-3F-PAHT-9825-NT-Injection-molded-specimen | 2 | 1 | 0 | 0 | 0 |
| R-NANOVIA-PEI-Ultem-1010 | 1 | 1 | 0 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261003-46df2b78af77 | 2 | 1 | 0 | 0 | 0 |
| R-POLYMAKER-PRIORITY-20261003-eb1e58e6f967 | 2 | 1 | 0 | 0 | 0 |
| R-QIDI-PEBA-95A | 2 | 1 | 0 | 0 | 0 |
| D-RAISE3D-Raise3d-Premium-PC-Transparent-TDS-V4 | 3 | 1 | 0 | 0 | 0 |
| R-RECREUS-PET-G-CF-TECHNICAL-DATA-SHEET-TDS-2022 | 1 | 1 | 0 | 1 | 0 |
| R-RECREUS-PETG-CF | 1 | 1 | 0 | 1 | 0 |
| R-ERYONE-PETG-GF-TDS | 2 | 1 | 0 | 0 | 0 |
| S-PCGF-ASA-TDS | 2 | 1 | 0 | 0 | 8 |
| S-PCGF-PA6CF | 2 | 1 | 0 | 1 | 0 |
| S-PCGF-PC-ABS-TDS | 2 | 1 | 0 | 1 | 0 |
| S-PCGF-PET-CF-TDS | 2 | 1 | 0 | 1 | 0 |
| S-PCGF-TPU-95A-TDS-Siddament | 1 | 1 | 0 | 0 | 0 |
| S-SPECTRUM-de-tds-spectrum-pla-stone-age | 1 | 1 | 0 | 0 | 0 |
| S-SPECTRUM-EN-TDS-Spectrum-PLA-Glow-in-the-Dark-0 | 1 | 1 | 0 | 0 | 0 |
| S-SPECTRUM-pl-tds-spectrum-pla-silk-rainbow | 1 | 1 | 0 | 0 | 0 |
| R-3DJAKE-EN-TDS-PETG-Graphene-Light | 1 | 1 | 0 | 0 | 0 |
| R-SUNLU-COVERAGE-20261001-5b7089593d2d | 1 | 1 | 0 | 0 | 0 |
| R-SUNLU-PC-ABS-TDS | 3 | 1 | 0 | 0 | 10 |
| R-SUNLU-PP-TDS-7b4ac3a3-751e-42d8-9b0b-bff0d1fc0a3b | 3 | 1 | 0 | 2 | 10 |
| R-SUNLU-PVB-TDS | 3 | 1 | 0 | 0 | 12 |
| R-SUNLU-PRINT-20260928-5943a10e6bbb | 1 | 1 | 0 | 0 | 0 |
| R-SUNLU-SUNLU-TPU-95A-Gray | 1 | 1 | 0 | 1 | 0 |
| R-3D4MAKERS-TDS-ASA-Filament | 1 | 0 | 0 | 0 | 0 |
| S-PEBA-59754c44 | 3 | 0 | 0 | 0 | 7 |
| S-PEBA-a2d5f9c0 | 3 | 0 | 0 | 0 | 7 |
| S-PEBA-ABS-TDS-EN-docx | 4 | 0 | 0 | 0 | 14 |
| S-PEBA-eABS-HS-TDS | 3 | 0 | 0 | 1 | 7 |
| S-PEBA-ePLA-HS | 3 | 0 | 0 | 1 | 7 |
| S-PEBA-ePLA-HS-Filament-TDS | 3 | 0 | 0 | 1 | 7 |
| S-PEBA-eStars-PLA | 3 | 0 | 0 | 1 | 7 |
| S-PEBA-eSUN-ABS-Filament-TDS-V4-0 | 3 | 0 | 0 | 0 | 7 |
| S-PEBA-eSUN-eABS-Max-Filament-TDS-V4-0 | 3 | 0 | 0 | 1 | 6 |
| S-PEBA-eSUN-ePLA-ST-Filament-TDS-V4-0 | 3 | 0 | 0 | 0 | 7 |
| S-PEBA-eSUN-PETG-Filament-TDS-V4-0 | 3 | 0 | 0 | 0 | 7 |
| S-PEBA-eSUN-PETG-HS-Filament-TDS-V1-0-1 | 3 | 0 | 0 | 0 | 7 |
| S-PEBA-PLA-CMYK-TDS-2024-06-30 | 3 | 0 | 0 | 0 | 7 |
| S-PEBA-eSUN-PETG-Filament-TDS-1 | 4 | 0 | 0 | 0 | 12 |
| S-PEBA-PETG-Basic-TDS | 4 | 0 | 0 | 0 | 11 |
| S-PEBA-PETG-Matte-TDS | 4 | 0 | 0 | 0 | 12 |
| S-PEBA-PETG-TDS-en | 4 | 0 | 0 | 0 | 12 |
| S-PEBA-PLA-Basic-TDS-EN | 4 | 0 | 0 | 1 | 12 |
| S-PEBA-PLA-Basic-TDS-EN-2026-6-5 | 4 | 0 | 0 | 0 | 12 |
| S-PEBA-PLA-Cast-TDS-EN-2025-8-27 | 4 | 0 | 0 | 0 | 12 |
| S-PEBA-PLA-HF-TDS-2026-2-2 | 4 | 0 | 0 | 0 | 12 |
| S-PEBA-PLA-HS-TDS | 3 | 0 | 0 | 0 | 12 |
| S-PEBA-PLA-Matte-TDS-2025-06-19-1 | 3 | 0 | 0 | 0 | 12 |
| S-PEBA-PLA-TDS-en | 3 | 0 | 0 | 0 | 12 |
| R-FILAMENT2PRINT-Jamg-He-PLA | 1 | 0 | 0 | 0 | 0 |
| D-FLASH-ASA-TDS-EN | 2 | 0 | 0 | 0 | 9 |
| D-FLASH-PETG-HS-TDS-EN | 2 | 0 | 0 | 0 | 10 |
| D-FLASH-PETG-TDS-EN | 2 | 0 | 0 | 0 | 10 |
| D-FLASH-PLA-HS-TDS-EN | 2 | 0 | 0 | 0 | 13 |
| D-FLASH-PLA-Matte-TDS-EN | 2 | 0 | 0 | 0 | 10 |
| D-FLASH-PLA-Multicolor-TDS-EN | 2 | 0 | 0 | 0 | 10 |
| D-FLASH-PLA-Pro-TDS-EN | 2 | 0 | 0 | 0 | 10 |
| D-FLASH-PLA-TDS-EN | 2 | 0 | 0 | 0 | 10 |
| R-MATTERHACKERS-RczMCr | 1 | 0 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-4b8JqK | 1 | 0 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-xomIDF | 1 | 0 | 0 | 0 | 0 |
| R-MATTERHACKERS-PRO-SERIES-HQsnRp | 1 | 0 | 0 | 0 | 0 |
| S-POLYMAKER-ABS-MAX-PAGE | 1 | 0 | 0 | 0 | 3 |
| S-SPECTRUM-en-tds-spectrum-pla-tough | 3 | 0 | 0 | 0 | 0 |
| R-3D4MAKERS-TDS-LUVOCOM-3F-PEEK-9581-Filament | 1 | 0 | 0 | 0 | 0 |
| R-3D4MAKERS-TDS-PEEK-Filament-1 | 2 | 0 | 0 | 0 | 0 |
| R-3D4MAKERS-TDS-PEKK-A-Filament-3D4Makers | 2 | 0 | 0 | 1 | 2 |
| R-COLORFABB-TDS-E-colorFabb-LW-ASA | 4 | 0 | 0 | 0 | 11 |
| S-ESUN-PLA-Silk-TDS-2025-06-19 | 4 | 0 | 0 | 0 | 12 |
| S-PEBA-ABS-ESD-TDS-EN | 3 | 0 | 0 | 0 | 13 |
| S-PEBA-79f73c22-1 | 3 | 0 | 0 | 0 | 7 |
| S-PEBA-ePLA-CF-TDS | 3 | 0 | 0 | 0 | 7 |
| S-PEBA-ePLA-Metal-TDS | 3 | 0 | 0 | 0 | 7 |
| S-PEBA-eSUN-ePLA-Silk-Magic-Filament-TDS-V4-02 | 3 | 0 | 0 | 0 | 7 |
| S-PEBA-eSUN-ePLA-Silk-Mystic-Filament-TDS-V4-0 | 3 | 0 | 0 | 0 | 7 |
| S-PEBA-eSUN-eSilk-PLA-Filament-TDS-V4-0 | 3 | 0 | 0 | 0 | 7 |
| S-PEBA-eSUN-HIPS-Filament-TDS-V4-0-1 | 3 | 0 | 0 | 0 | 6 |
| S-PEBA-eSUN-Luminous-PLA-Rainbow-Filament-TDS-V4-01 | 3 | 0 | 0 | 0 | 7 |
| S-PEBA-eSUN-PLA-GF-Filament-TDS-V1-0-1 | 3 | 0 | 0 | 0 | 7 |
| S-PEBA-eSUN-PLA-Luminous-Filament-TDS-V4-01 | 3 | 0 | 0 | 0 | 7 |
| S-PEBA-eSUN-Twinkling-Filament-TDS-V4-0 | 3 | 0 | 0 | 0 | 6 |
| S-PEBA-PC-HT-TDS | 4 | 0 | 0 | 0 | 12 |
| S-PEBA-PETG-ESD-TDS-EN | 4 | 0 | 0 | 0 | 13 |
| R-EXTRUDR-durapro-asa-cf-TDS-en-533984 | 2 | 0 | 0 | 0 | 10 |
| D-FLASH-ABS-ESD-TDS-EN | 2 | 0 | 0 | 0 | 10 |
| D-FLASH-ASA-CF-TDS-EN | 2 | 0 | 0 | 0 | 10 |
| D-FLASH-PA6-CF-TDS-EN | 3 | 0 | 0 | 0 | 10 |
| D-FLASH-PBT-GF-TDS-EN | 2 | 0 | 0 | 0 | 9 |
| D-FLASH-PC-ABS-TDS-EN | 2 | 0 | 0 | 0 | 10 |
| D-FLASH-PC-TDS-EN | 2 | 0 | 0 | 0 | 10 |
| D-FLASH-PET-CF-TDS-EN | 3 | 0 | 0 | 0 | 8 |
| D-FLASH-PETG-CF-TDS-EN | 3 | 0 | 0 | 0 | 10 |
| D-FLASH-PETG-ESD-TDS-EN | 2 | 0 | 0 | 0 | 10 |
| D-FLASH-PLA-CF-TDS-EN | 3 | 0 | 0 | 0 | 10 |
| D-FLASH-PLA-Silk-TDS-EN | 2 | 0 | 0 | 0 | 10 |
| D-FLASH-PLA-Wood-TDS-EN | 2 | 0 | 0 | 0 | 10 |
| D-FLASH-PVA-TDS-EN | 2 | 0 | 0 | 0 | 9 |
| S-PET-TDS-EasyCork | 1 | 0 | 0 | 0 | 0 |
| S-PET-TDS-PPSU | 2 | 0 | 0 | 1 | 13 |
| R-NINJATEK-Armadillo-TDS | 3 | 0 | 0 | 3 | 10 |
| R-NINJATEK-NinjaFlex-TDS | 3 | 0 | 0 | 3 | 11 |
| R-POLYMAKER-FIBERON-TDS-FIBERON-PET-GF15-v2-0-2026-02-02 | 4 | 0 | 0 | 0 | 21 |
| S-PVB-technisches-datenblatt-1 | 3 | 0 | 0 | 0 | 0 |
| D-RAISE3D-Raise3d-Premium-PC-Black-White-TDS-V6 | 2 | 0 | 0 | 0 | 15 |
| D-RAISE3D-Raise3d-Premium-PC-Transparent-TDS-V6 | 3 | 0 | 0 | 0 | 14 |
| D-SIRAYA-fibreheart-tpu-gf-filament-tds | 1 | 0 | 0 | 0 | 0 |
| D-SIRAYA-TECH-PRINT-20260928-fc27f63b931a | 1 | 0 | 0 | 0 | 0 |
| D-SIRAYA-siraya-tech-fibreheart-abs-cf-core-tds | 1 | 0 | 0 | 0 | 0 |
| D-SIRAYA-siraya-tech-fibreheart-paht-cf-ppa-based-tds | 2 | 0 | 0 | 0 | 0 |
| D-SIRAYA-TECH-PRINT-20260928-2a59ac01371f | 1 | 0 | 0 | 0 | 0 |
| S-SPECTRUM-ENG-TDS-The-Filament-PETG-CF | 1 | 0 | 0 | 0 | 5 |

## Files

- new-settings.csv: 0
- new-values.csv: 624
- mismatches.csv: 52
- context.csv: 263
- unmapped.csv: 135
- identity.csv: 0
- confirms.csv: 191
- invalid.csv: 0
- duplicates.csv: 49
- unread-held.csv: 1547
- second-read/tasks.csv: 1
