# Validation report

Database snapshot 2026-09-16 · build 2026-09-21

**No errors.**

## Contents

| Entity | Records |
|---|---:|
| materials | 149 |
| h2cRelevant | 130 |
| familyEntries | 5 |
| retiredDuplicates | [object Object] |
| excluded | 14 |
| grades | 966 |
| measurements | 9806 |
| numericMeasurements | 9645 |
| quarantined | 4 |
| profiles | 974 |
| evidence | 481 |
| prices | 104 |
| sources | 1240 |
| coverage | 767 |
| polymerEnvironment | 353 |
| polymerEvidence | 313 |
| coverageDerived | 668 |

## Headline coverage

What a selection criterion can actually decide, out of 149 canonical materials.

| Headline | Materials with a value |
|---|---:|
| density | 123 |
| tensileModulusXY | 91 |
| tensileStrengthXY | 77 |
| elongationXY | 91 |
| hdt045 | 89 |
| priceCADkg | 38 |

## H2C envelope gate

Baseline 350 C nozzle, 120 C bed, 65 C chamber.

| Axis | within | partial window | exceeds | exceeds (recommendation only) | unknown |
|---|---:|---:|---:|---:|---:|
| nozzle | 121 | n/a | 14 | 0 | 14 |
| bed | 115 | n/a | 14 | 0 | 20 |
| chamber | 77 | 3 | 11 | 2 | 56 |

A partial window is chamber-only: part of the published window is reachable at 65 C, never all of it.
Nozzle and bed are read by the upper end of the window.

## Chamber evidence

What the 135 in-scope materials publish about the chamber, strongest kind first. A statement
in words is manufacturer evidence but never a temperature. An estimated band is inference from
data/tables/chamber_bands.csv; it is shown beside the chamber question and changes no verdict.

| Kind | Materials |
|---|---:|
| Published temperature window | 63 |
| No heated chamber needed, in words | 23 |
| Chamber recommended, no temperature | 1 |
| Data sheet lists no setpoint | 1 |
| Nothing published | 47 |
| Carrying an estimated band (any of the last three) | 14 |

29 research bands are superseded by evidence and not used: PLA Basic (20-45 °C; publishes 25-45 °C), PLA Matte (20-45 °C; publishes 25-45 °C), PLA Lite (20-45 °C; a source says no heated chamber is needed), PLA Metal (20-45 °C; publishes 25-45 °C), PLA Marble (20-45 °C; publishes 25-45 °C), PLA Sparkle (20-45 °C; publishes 25-45 °C), PLA Galaxy (20-45 °C; publishes 25-45 °C), PLA Silk (20-45 °C; publishes 0-40 °C), Support for PA/PET (20-45 °C; publishes 45-60 °C), PETG Basic (20-50 °C; publishes 35-50 °C), PETG HF (20-50 °C; publishes 35-50 °C), PETG-CF (20-50 °C; publishes 20-50 °C), PETG-GF (20-50 °C; publishes 20-20 °C), PEBA (20-50 °C; a source says no heated chamber is needed), PP (20-50 °C; a source says no heated chamber is needed), CPE (20-50 °C; a source says no heated chamber is needed), CPE-CF (20-50 °C; a source says no heated chamber is needed), CoPE (20-50 °C; a source says no heated chamber is needed), ABS-ESD (45-70 °C; publishes 90-90 °C), ASA-GF (45-70 °C; publishes 25-60 °C), PC FR (45-70 °C; publishes 45-60 °C), PC-CF (45-70 °C; publishes 100-100 °C), PAHT-CF (45-70 °C; publishes 45-60 °C), PA6 (45-70 °C; publishes 20-60 °C), PET (45-70 °C; a source says no heated chamber is needed), PET-GF (45-70 °C; a source says no heated chamber is needed), PPS-CF (60-90 °C; publishes 60-90 °C), PPA-CF (80-120 °C; publishes 50-80 °C), POM / Acetal (45-80 °C; publishes 70-140 °C).

## Environment evidence

A verdict category has findings that reduce to resistant, limited or not resistant, so it
can answer a pass/fail question. An indicator category has records but no reducible verdict
among them, so it can only show evidence and must never be offered as a hard constraint.

| Category | Kind | Records | With a verdict | Materials | From the base polymer |
|---|---|---:|---:|---:|---:|
| alkali | verdict | 63 | 61 | 50 | 47 |
| acid | verdict | 67 | 59 | 51 | 47 |
| organic-solvent | verdict | 63 | 45 | 53 | 50 |
| oil-grease | verdict | 57 | 45 | 52 | 45 |
| water-solubility | verdict | 42 | 41 | 41 | 32 |
| flammability | verdict | 42 | 36 | 41 | 12 |
| food-contact | indicator | 2 | 0 | 2 | 0 |
| uv-outdoor | verdict | 7 | 0 | 6 | 19 |
| moisture | verdict | 12 | 0 | 10 | 23 |
| creep | indicator | 2 | 0 | 2 | 0 |
| fatigue | indicator | 5 | 0 | 5 | 0 |
| hydrolysis | verdict | 4 | 0 | 4 | 38 |

## Polymer-level behaviour

353 rows of published base-polymer behaviour, attached as 313 inferred records to 84 materials
with no grade-level record in the category (D64). A record is shown in the drawer, counted apart in the filter rail, may screen a
material out under inference where the polymer is attacked or dissolved, and never passes a requirement.

| Category | Polymers | Agent rows | Materials covered | Of which may screen |
|---|---:|---:|---:|---:|
| acid | 21 | 94 | 47 | 12 |
| alkali | 20 | 43 | 47 | 10 |
| flammability | 4 | 4 | 12 | 10 |
| hydrolysis | 12 | 19 | 38 | 10 |
| moisture | 2 | 2 | 23 | 0 |
| oil-grease | 20 | 78 | 45 | 0 |
| organic-solvent | 23 | 87 | 50 | 14 |
| uv-outdoor | 8 | 8 | 19 | 1 |
| water-solubility | 15 | 18 | 32 | 1 |

## Estimates

A missing headline carries an estimate from one Gaussian model per property that takes every observation
in the snapshot, each converted to the headline's semantics (build/mappings/estimate-model.json, DECISIONS
D43). The likely range is 80% and the plausible range 95%. Both are calibrated by hiding each measured
headline and predicting it from everything else; the build fails if that coverage drifts. An estimate never
passes a material; in Explore it may screen one out only when its plausible range wholly fails.

| Headline | Observations | Hidden headlines | Likely range holds | Plausible range holds | Median likely width | Spread between products |
|---|---:|---:|---:|---:|---:|---:|
| density | 788 | 108 | 80% | 95% | ×1.12 | 0.0251 (13152 pairs) |
| tensileModulusXY | 1042 | 77 | 81% | 96% | ×1.52 | 0.33 (752 pairs) |
| tensileStrengthXY | 1288 | 56 | 80% | 96% | ×1.59 | 0.234 (1648 pairs) |
| elongationXY | 836 | 77 | 81% | 96% | ×3.08 | 0.727 (1646 pairs) |
| hdt045 | 961 | 70 | 80% | 96% | 18.7 °C | 4.66 (3087 pairs) |

| Headline | Missing | From its own grade | From its other grades | Family model only | Not applicable | None | May screen |
|---|---:|---:|---:|---:|---:|---:|---:|
| density | 21 | 13 | 3 | 5 | 0 | 0 | 21 |
| tensileModulusXY | 52 | 34 | 8 | 6 | 4 | 0 | 48 |
| tensileStrengthXY | 66 | 53 | 5 | 4 | 4 | 0 | 50 |
| elongationXY | 52 | 32 | 8 | 8 | 4 | 0 | 47 |
| hdt045 | 53 | 26 | 7 | 6 | 14 | 0 | 35 |

Which estimates may screen, end by end (DECISIONS D59). Each end of an evidence class's screening range is set where a new true value lies beyond it at most 10% of the time with 90% confidence, from where the honestly predicted true values of the class fell; never inside the plausible range. A class with too few cases cannot set an end and screens only where the family model agrees.

| Headline | Class | Held | Top: beyond plausible | Top taken at | Bottom: beyond plausible | Bottom taken at |
|---|---|---:|---:|---:|---:|---:|
| density | this-grade | 1 | 0 | cannot screen | 0 | cannot screen |
| density | this-material | 68 | 2 | 97.5% point | 2 | 2.5% point |
| density | family | 108 | 3 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-grade | 72 | 2 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-material | 51 | 0 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | family | 77 | 2 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | this-grade | 54 | 2 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | this-material | 37 | 0 | 97.5% point | 0 | 2.5% point |
| tensileStrengthXY | family | 56 | 0 | 97.5% point | 0 | 2.5% point |
| elongationXY | this-grade | 51 | 0 | 97.5% point | 0 | 2.5% point |
| elongationXY | this-material | 51 | 1 | 97.5% point | 3 | 2.14% point |
| elongationXY | family | 77 | 0 | 97.5% point | 3 | 2.5% point |
| hdt045 | this-grade | 56 | 2 | 97.5% point | 0 | 2.5% point |
| hdt045 | this-material | 44 | 2 | 97.55% point | 0 | 2.5% point |
| hdt045 | family | 70 | 5 | 98.76% point | 0 | 2.5% point |

- Unstated-load bracket, amorphous: top at the published value + 15 °C (93 grades publish both loads; at 90% confidence at most 10% of grades show a gap larger than 15 °C, the 6th largest gap observed).
- Unstated-load bracket, semi-unfilled: its top cannot screen (only 5 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).
- Unstated-load bracket, semi-filled: top at the published value + 126 °C (26 grades publish both loads; at 90% confidence at most 10% of grades show a gap larger than 126 °C, the largest gap observed).
- Unstated-load bracket, elastomer: its top cannot screen (only 0 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).

Evidence that contradicts everything else and was down-weighted:

- PLA, density: density 1360 (V004368)
- PLA, density: density 1390 (V006192)
- PLA, density: density 1380 (V007667)
- PLA, density: density 1365 (V008599)
- PLA, density: density 1240 (V008736)
- PLA, density: density 1240 (V009024)
- PLA, density: density 1200 (V009118)
- PLA, density: density 2300 (V009181)
- PLA, density: density 2300 (V009282)
- PLA, density: density 1400 (V009298)
- PLA Metal, density: density 1250 (V000184)
- PLA Metal, density: density 2360, 2360 (V004044, V004066)
- PLA Metal, density: density 2330, 2330 (V004048, V004062)
- PLA Metal, density: density 2280, 2280 (V004058, V004070)
- PLA Metal, density: density 1225 (V007387)
- PLA Metal, density: density 1200 (V009065)
- PLA Sparkle, density: density 1410 (V009182)
- PLA Wood, density: density 1210 (V000244)
- PLA Wood, density: density 1020 (V005557)
- PLA Wood, density: density 1254 (V006967)
- PLA Wood, density: density 1230 (V008019)
- PLA Wood, density: density 1250 (V008254)
- PLA Wood, density: density 700 (V009165)
- PLA Aero, density: density 1210 (V000303)
- PLA Aero, density: density 1240 (V002975)
- PLA Aero, density: density 900 (V003554)
- PLA Aero, density: density 900 (V003652)
- PLA Aero, density: density 840 (V004522)
- PLA Aero, density: density 1210 (V004816)
- PLA Aero, density: density 1200 (V005770)
- PLA Aero, density: density 1200 (V005973)
- PLA Aero, density: density 1200 (V006763)
- PLA-CF, density: density 1420 (V009909)
- PETG, density: density 1180 (V002844)
- PETG, density: density 1350 (V007369)
- PETG, density: density 1410 (V009154)
- PA6, density: density 1250 (V000917)
- PA12-CF, density: density 1230 (V006956)
- PP, density: density 1010 (V004428)
- PP-CF, density: density 1100 (V001502)
- PP-CF, density: density 910 (V006381)
- PE, density: density 1100, 1100 (V001516, V009268)
- POM / Acetal, density: density 1140 (V002322)
- PLA-EC, density: density 1350 (V003052)
- PLA-EC, density: density 1240 (V009037)
- COC, density: density 1020 (V005676)
- COC, density: density 1100 (V009211)
- PAHT-CE, density: density 1250 (V009726)
- PAHT-CE, density: density 1490 (V009738)
- PLA Silk, tensileModulusXY: tensile XY 0.597 (V004369)
- PLA Silk, tensileModulusXY: tensile Z 0.363 (V004370)
- PLA Silk, tensileModulusXY: flexural XY 2.473 (V004375)
- PLA Aero, tensileModulusXY: tensile Z 0.254 (V009907)
- PETG, tensileModulusXY: tensile XY 0.5 (V004389)
- PETG, tensileModulusXY: tensile Z 0.3 (V004390)
- PETG, tensileModulusXY: flexural XY 1.9 (V004395)
- PETG-CF, tensileModulusXY: flexural unk 0.065 (V007718)
- ABS, tensileModulusXY: tensile XY 0.21708, 0.21716 (V005137, V005140)
- PAHT-CF, tensileModulusXY: tensile Z 2.75 (V009943)
- PA6-CF, tensileModulusXY: tensile unk 1.1 (V004325)
- PA6-GF, tensileModulusXY: flexural XY 0.2, 0.0575 (V005395, V005396)
- PA12-CF, tensileModulusXY: tensile XY 0.495 (V004845)
- PA12-CF, tensileModulusXY: flexural XY 3.193 (V004848)
- PET, tensileModulusXY: tensile unk 0.442 (V005812)
- PPA-CF, tensileModulusXY: tensile Z 4.3 (V001311)
- PPS-CF, tensileModulusXY: tensile Z 2.85 (V001362)
- PPS-CF, tensileModulusXY: tensile Z 2.72 (V001867)
- HIPS, tensileModulusXY: tensile unk 0.067 (V007544)
- PLA, tensileStrengthXY: ultimate XY 32.7, 8.7 (V005060, V005063)
- PLA, tensileStrengthXY: ultimate XY 28.004 (V008589)
- PLA, tensileStrengthXY: flexural XY 85.809 (V008591)
- PLA Silk, tensileStrengthXY: ultimate unk 11.1 (V007105)
- ABS, tensileStrengthXY: ultimate XY 27 (V008933)
- ABS, tensileStrengthXY: flexural XY 92.38 (V008936)
- TPU, tensileStrengthXY: ultimate XY 27 (V005374)
- TPU, tensileStrengthXY: flexural XY 7 (V005377)
- TPU, tensileStrengthXY: ultimate unk 30, 50 (V005838, V005844)
- TPU, tensileStrengthXY: flexural unk 1.55 (V005841)
- TPU, tensileStrengthXY: ultimate unk 17, 32 (V005940, V005946)
- TPU, tensileStrengthXY: flexural unk 2.9 (V005943)
- TPU, tensileStrengthXY: ultimate unk 34.4 (V007895)
- TPU, tensileStrengthXY: flexural unk 4.26 (V007898)
- TPU, tensileStrengthXY: ultimate unk 21.7 (V008723)
- TPU, tensileStrengthXY: flexural unk 4.26 (V008726)
- PEBA, tensileStrengthXY: break XY 32.58 (V008144)
- PEBA, tensileStrengthXY: ultimate XY 9.17, 8.98, 9.69 (V008146, V008147, V008148)
- TPC / TPEE, tensileStrengthXY: flexural unk 1.96133 (V007467)
- PA6-CF, tensileStrengthXY: ultimate XY 53, 47 (V005126, V005127)
- PA6-CF, tensileStrengthXY: flexural XY 140 (V005130)
- PA12, tensileStrengthXY: yield XY 49.3 (V002006)
- PA12, tensileStrengthXY: break XY 33.4 (V002010)
- PA12-CF, tensileStrengthXY: ultimate XY 58, 14 (V004843, V004844)
- PA12-CF, tensileStrengthXY: flexural XY 96 (V004847)
- OBC, tensileStrengthXY: break XY 14 (V007765)
- OBC, tensileStrengthXY: flexural XY 7.8 (V007768)
- TPC-ESD, tensileStrengthXY: break XY 70 (V003135)
- TPC-ESD, tensileStrengthXY: flexural XY 50 (V003137)
- PBAT, tensileStrengthXY: ultimate XY 27 (V005365)
- PBAT, tensileStrengthXY: flexural XY 7 (V005368)
- CPE-LW, tensileStrengthXY: break unk 28 (V005545)
- CPE-LW, tensileStrengthXY: ultimate unk 2, 4 (V005546, V005547)
- nGen FLEX, tensileStrengthXY: flexural unk 8.9 (V005863)
- PLA, elongationXY: break XY 34.5, 27.8 (V003649, V003863)
- PLA, elongationXY: break Z 0.9 (V003864)
- PLA-CF, elongationXY: break XY 13.2 (V003424)
- PETG, elongationXY: break XY 5.15 (V007048)
- PETG, elongationXY: break unk 83 (V007974)
- ABS, elongationXY: break unk 30 (V006691)
- ABS, elongationXY: break XY 3.9 (V007089)
- TPU, elongationXY: break moulded 6.9 (V004124)
- TPU for AMS, elongationXY: break Z 31 (V000780)
- PET, elongationXY: break unk 418 (V005814)
- BVOH, elongationXY: break XY 14.8 (V002264)
- BVOH, elongationXY: break Z 0.6 (V002265)
- TPU-CF, elongationXY: break moulded 15 (V004076)
- PLA, hdt045: HDT 0.45 116 (V002780)
- PLA, hdt045: HDT 1.8 amorphous 66 (V002781)
- PLA, hdt045: Vicat amorphous 140 (V002877)
- PLA, hdt045: Tg amorphous 55 (V003211)
- PLA, hdt045: HDT 0.45 80 (V003212)
- PLA, hdt045: Tg amorphous 59.15 (V003899)
- PLA, hdt045: Vicat amorphous 148.3 (V003900)
- PLA, hdt045: HDT 0.45 57 (V004933)
- PLA, hdt045: Tg amorphous 160 (V004934)
- PLA, hdt045: HDT 0.45 135 (V005853)
- PLA, hdt045: Vicat amorphous 160 (V006191)
- PLA, hdt045: HDT 0.45 80 (V007474)
- PLA, hdt045: HDT 0.45 80 (V007533)
- PLA, hdt045: HDT 0.45 110 (V007602)
- PLA, hdt045: Vicat amorphous 140 (V007603)
- PLA, hdt045: HDT 0.45 moulded amorphous 50 (V009246)
- PLA, hdt045: HDT 0.45 moulded amorphous 48 (V009255)
- PLA Aero, hdt045: HDT 0.45 135 (V005974)
- PLA-CF, hdt045: Tg amorphous 60 (V003308)
- PLA-CF, hdt045: HDT 0.45 91 (V003309)
- PETG, hdt045: HDT 0.45 65 (V005882)
- PETG-CF, hdt045: HDT 1.8 amorphous 93 (V009087)
- ABS, hdt045: HDT 0.45 90 (V006761)
- ABS-GF, hdt045: HDT 0.45 97 (V002535)
- ABS-GF, hdt045: Tg amorphous 135, 135 (V004463, V008549)
- ABS-GF, hdt045: HDT 0.45 82 (V005111)
- ABS-GF, hdt045: HDT 0.45 88 (V005448)
- ABS-CF, hdt045: HDT 0.45 76 (V000594)
- ASA, hdt045: HDT 0.45 82 (V004829)
- ASA, hdt045: HDT 0.45 94 (V006745)
- ASA, hdt045: Vicat amorphous 105 (V008262)
- ASA-CF, hdt045: Tg amorphous 65 (V006028)
- PC, hdt045: HDT 0.45 101, 101 (V004707, V008720)
- PC, hdt045: HDT unstated 144 (V007724)
- PC, hdt045: Tg amorphous 161 (V009442)
- PAHT-CF, hdt045: HDT 0.45 145 (V002464)
- PA6, hdt045: HDT unstated 60 (V002348)
- PA6, hdt045: HDT unstated 60 (V002994)
- PA6, hdt045: HDT 0.45 140 (V007666)
- PA6, hdt045: HDT unstated 186 (V007868)
- PA6-CF, hdt045: HDT 0.45 203, 209 (V004530, V008619)
- PA6-CF, hdt045: HDT 0.45 200 (V005171)
- PA6-CF, hdt045: HDT 0.45 147 (V006453)
- PA6-CF, hdt045: HDT 0.45 215 (V006543)
- PA6-CF, hdt045: HDT 0.45 140 (V007553)
- PA6-GF, hdt045: HDT 0.45 205.2, 205 (V004592, V008235)
- PA6-GF, hdt045: HDT 0.45 161 (V009369)
- PA12-CF, hdt045: HDT 0.45 170, 170 (V002094, V006516)
- PA12-CF, hdt045: HDT 0.45 175, 176 (V004504, V008197)
- PA12-CF, hdt045: HDT 0.45 185 (V004841)
- PA12-CF, hdt045: HDT 0.45 90 (V006964)
- PA12-CF, hdt045: HDT 0.45 48 (V007204)
- PA12-CF, hdt045: Tm semi-filled 170 (V007206)
- PA6/66, hdt045: HDT 0.45 110.5 (V001021)
- PA6/66, hdt045: HDT unstated 50 (V006803)
- PET-GF, hdt045: HDT 0.45 81.6 (V001931)
- PET-GF, hdt045: HDT 0.45 200 (V005260)
- PET-GF, hdt045: HDT 1.8 amorphous 99.1 (V008153)
- PPA, hdt045: HDT 0.45 103 (V002224)
- PPA, hdt045: HDT 0.45 81 (V002549)
- PPA-CF, hdt045: HDT 0.45 227 (V001308)
- PPA-CF, hdt045: Tm semi-filled 232 (V002570)
- PPA-CF, hdt045: HDT 0.45 84.5 (V002574)
- PPA-CF, hdt045: Tm semi-filled 239 (V002596)
- PPA-CF, hdt045: HDT 0.45 97 (V002600)
- PPA-CF, hdt045: HDT 0.45 240, 240 (V003220, V003236)
- PPA-CF, hdt045: HDT 0.45 220 (V005246)
- PPA-GF, hdt045: HDT 0.45 227 (V001326)
- PPA-GF, hdt045: Tm semi-filled 232 (V002625)
- PPA-GF, hdt045: HDT 0.45 84 (V002629)
- PPA-GF, hdt045: HDT 0.45 220 (V005306)
- PP-CF, hdt045: HDT 0.45 88 (V007762)
- PC-ABS, hdt045: HDT 1.8 amorphous 90 (V002097)
- PC-PBT-CF, hdt045: HDT 1.8 amorphous 89 (V008289)
- PC-PBT-CF, hdt045: HDT 0.45 115 (V008290)
- PE-GF, hdt045: HDT unstated 85 (V008436)
- PE-GF, hdt045: Tm semi-filled 170 (V009860)
- nGen FLEX, hdt045: Tg amorphous -40 (V005868)
- nGen FLEX, hdt045: HDT 0.45 100 (V005870)
- nGen FLEX, hdt045: Vicat amorphous 170 (V006009)

Measured headlines far outside their prediction (worth a second look at the source and the grade):

- PLA Metal, density: 1250 kg/m³, expected about 1740
- PBAT, tensileModulusXY: 0.006 GPa, expected about 1.03
- TPU, elongationXY: 330.1 %, expected about 490

## Consistency

Every one of the 149 materials was checked, and any failure below stops the build:

- each measurement, profile, price and use record sits under the material its grade belongs to;
- GradeIDs lists every procurement grade, and the representative grade is one of them;
- every headline cites a measurement of its own material and of the representative grade (471 checked);
- every cited measurement, profile and use record exists and belongs to that material, except use, durability and safety notes, which may cite family context;
- nozzle, bed and chamber guidance quote the profile the row cites;
- Environmental evidence cites exactly the material's own exposure, solubility and moisture records;
- a polymer-level record (D64) is attached only where the material has no record of its own in the category, and names its own Estimate identity;
- no coverage row says Gap beside the material's own data or claims evidence it does not have, for mechanical, thermal, print setup, environmental and price, and a Grades row quotes the true manufacturer count.

## Reference layer

114 generic entries, 10 shown by default. Never part of the candidate set.

## Warnings

These are not defects. They record what the compiled database cannot support, so the
interface can say so rather than implying a certainty it does not have.

- `HDT-LOAD-UNSTATED` **materials** — 8 of 89 HDT headlines cite a source that names the standard but not the load. They carry loadStated:false and must not be presented as confirmed 0.45 MPa values.
- `NO-MEASUREMENTS` **materials** — 2 materials have no property measurements at all: PA66-CF, PA612-GF
- `EST-REJECTED` **measurements** — 8 values are physically impossible for their property and were kept out of the estimate model: V009231 PLA Density 3900 kg/m³; V009245 PLA Density 3130 kg/m³; V009254 PLA Density 3900 kg/m³; V009275 PLA Density 3130 kg/m³; V009486 PLA Density 4000 kg/m³; V009522 PLA Metal Density 2780 kg/m³; V009638 PLA Metal Density 3400 kg/m³; V009775 PLA Metal Density 3500 kg/m³
- `EST-OUTLIER` **materials** — 3 measured headlines sit far outside what every other observation predicts; check the source and the grade: PLA Metal density 1250 (expected about 1740); PBAT tensileModulusXY 0.006 (expected about 1.03); TPU elongationXY 330.1 (expected about 490)
- `EST-FAMILY-ORDER` **materials** — 2 reinforced materials sit below their unfilled sibling: PLA-CF tensileModulusXY 2.79 < PLA 2.865; ASA-AF tensileModulusXY 2.01 (estimate) < ASA 2.45
