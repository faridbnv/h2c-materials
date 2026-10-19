# A first-time user's second trial

> **Historical record** (2026-10-18): a first-time user's trial of the selector after the screening build, done without reading the repository.
>
> **In short.** For every preset, the "Meets every requirement" list made sense to me as an engineer, and I would use it to pick materials to test. Everything below it is harder to trust. Rigid PLA shows up as "One check away" from a 5 GPa modulus, and in "Not enough data" for an 80 °C part, while its own row shows HDT 55. Soft PVC and elastomers turn up under structural presets. The UNKNOWN count lumps "never measured" together with "measured and missed" (104 UNKNOWN for a gasket). The words "on the line", "screened", "Hidden as unlikely" and "bounded … by another record" each needed a tooltip or the drawer before I could guess what they meant. Average clarity across 18 labels and switches: **3.0 of 5**.

How I used it: I opened `selector.html` in headless Chrome at 1400×1000 and clicked by visible text. For each preset I recorded three states: the default, then Include (which turned estimates on by itself), then Include with estimates off. I opened the drawer wherever a row surprised me. Quotes are the page's own words.

## First impressions

The page is dark and dense, and it looks like an engineering tool. That is a good thing. The six preset cards ("Start from a typical part, or set your own requirements in Filters.") were the obvious way in. "A template fills in the controls, each editable, and decides nothing" made it clear that the preset is only a starting point. The left rail ("Compared on printed (or unstated) specimens, in the orientation named, as printed and dry unless Part condition says otherwise.") and the hint "e.g. 3; unfilled PLA is about 2.5" read like a colleague talking, and I liked both.

The top bar puzzled me. "Materials that could not be checked: Leave out | Include" sits next to a greyed-out "Use estimates and resin data". With no requirement set, I could not tell what either would change. The greyed switch explains itself only on hover ("Works only when the materials that could not be checked are included"). The bottom bar's "Show in table" chips (PASS / UNKNOWN / FAIL) appear only after a preset is chosen.

## 1. Outdoor structural part (HDT 0.45 ≥ 100 °C, modulus ≥ 3 GPa, density ≤ 1500)

- **Expected:** glass- or carbon-filled ASA, PC, PA, PET and PPS; no PLA or PETG; plain ASA and ABS just below on modulus.
- **Default:** "11 of the 152 materials meet these requirements", then "Outdoor structural part template · 91 more could not be checked and are left out". The chips read PASS 11, UNKNOWN 91, FAIL 50. The list is ASA-CF, PA6-CF, PA6-GF, PBT-GF, PET-CF, PP-CF, PP-GF, PPA-CF, PPA-GF, PPS-CF and PPS-GF. Each row says "2 of 17 products" and shows "passing: 3.61–4.5" over "all products: 3.91". That is exactly what I wanted, and it shows which products passed. The page warns me twice, and it is right both times: "Not checked by this template: UV and weathering" and "The part is judged dry: nylons lose stiffness in humid air". "Allow annealing: 3 more pass" added PAHT-CF, PA12-CF and PET-GF (14 then pass). A price chip, "Price at most 100 CAD/kg", sits under "Reported, not required", though the preset card never mentions price.
- **Include, estimates on (it switched on by itself):** "93 shown PASS + UNKNOWN". The sections are "Meets every requirement (11)", "One check away (7)", "Not enough data (33)" and a collapsed "Unlikely to meet (42) — counted and exported". The SCREENED chip reads 9, all elastomers ("9 because a required property does not apply to them"). **Estimates off:** One check away 7, Not enough data 38, Unlikely 37. PASS does not move.
- **Understood the sections?** I understood "One check away" from its rows, for example "3DXTECH FibreX ABS+GF10 Glass Fiber ABS, HDT at 0.45 MPa 98 °C, on the line for at least 100 °C". "Not enough data" I did not understand. It holds plain ABS ("tensile modulus (XY) estimated 1.74 to 2.7 GPa"), PC (1.86 to 2.91) and PA6 (1.8 to 2.82). Each of those printed estimates misses 3 GPa, yet none went to "Unlikely to meet". Only later, from "plausibly 1 to 2.37" in other rows, did I learn that a wider hidden range decides.
- **Surprises:** soft PVC ("Polyvinylchlorid weich 94A (PVC-P) … tensile modulus (XY) estimated 0.215 to 8.69 GPa") and FormFutura Crystal Flex sit in "Not enough data" for a structural bracket. PAHT-CF is a Bambu Lab filament with 8.39 GPa and HDT 170, and it is only "Not enough data, likely". The reason: the product it is shown for has no density, and the estimate ("1,030 to 1,170 kg/m³") is lower than the material's own published range (1,060–1,250). FAIL rows give no reason: PBT shows only "FAIL 0 of 1 product". The drawer did explain it well: "Bed ≤ 120 °C. Requires up to 200 °C; the H2C reaches only 120 °C".
- **Could I tell why?** For PASS and One check away, yes. For FAIL and Hidden, only by opening the drawer or hovering. **Trust:** PASS, yes. Not enough data, no.

## 2. Indoor prototype (any build material; price ≤ 45 CAD/kg reported)

- **Expected:** PLA and PETG first, an easy shortlist.
- **Default:** "96 of the 152 materials meet these requirements · 32 more could not be checked and are left out". The chips read PASS 96, UNKNOWN 32, FAIL 24. The list is alphabetical. It mixes PLA with PPS-CF, PPA-CF, PEBA, PVDF-ESD and every TPU class, and nothing ranks them for the job. The page is honest about it: "Not checked by this template: Ease of printing. No source rates it."
- **Include (estimates on or off, identical):** "One check away (29)", "Not enough data (3)", no Unlikely section. Almost every one-check-away row is a chamber question, for example "colorFabb nGen, its chamber temperature is not stated". All three not-enough-data rows say "Not enough data: no product on record" (PA612, PA612-GF, PA66-CF).
- **Surprises:** "no product on record" left me asking what a material with no product is doing in a buying list. colorFabb nGen is an easy copolyester, yet it is held back because its sheet names no chamber temperature.
- **Trust:** the list is correct but useless for "hold it in your hand tomorrow". I would sort by price myself.

## 3. Lightweight structure (density ≤ 1250, modulus ≥ 2.5 GPa)

- **Expected:** CF-filled nylons and PP, CF-PLA, perhaps some stiff PLAs.
- **Default:** "19 of the 152 … 76 more could not be checked and are left out". The chips read PASS 19, UNKNOWN 76, FAIL 57. The list includes "PLA: PASS 16 of 195 products", "PETG: PASS 1 of 73 products" and "PLA Wood: PASS 1 of 20 products". "Allow annealing: 4 more pass."
- **Include, estimates on:** One check away 16, Not enough data 33 (4 "likely"), Unlikely 27. **Estimates off:** 16 / 40 / 20.
- **Surprises:** a PETG passing a 2.5 GPa modulus made me check twice. The "1 of 73" saved it: I could see it is one product, not the material. TPE ("Nanovia TPE 22D") and TPV sit in "Not enough data" for a drone arm. Spectrum S-Flex Carbon is a TPU-CF, yet it shows "tensile modulus (XY) estimated 1.34 to 2.37 GPa", which no TPU reaches. "Not checked by this template: Which material is lightest overall … Rank by a performance index" was the right warning.
- **Trust:** PASS, yes, read product by product. The rest I would skim.

## 4. Warm environment (HDT 0.45 ≥ 80 °C)

- **Expected:** ABS, ASA, PC, nylons and filled PETG in; PLA, PETG and TPU out.
- **Default:** "42 of the 152 … 84 more could not be checked and are left out". The chips read PASS 42, UNKNOWN 84, FAIL 26. ABS ("28 of 55 products"), ASA, PC and the nylons pass, as expected. "PETG: PASS 1 of 73 products via a declared variant (undisclosed dense filler)" is clear once read.
- **Include (estimates on or off, identical):** One check away 26, Not enough data 27, Unlikely 15, SCREENED 16. The heading reads "126 shown PASS + UNKNOWN + SCREENED · 110 candidates, 16 screened out". The one-check-away rows are fair, for example "3DXTECH MAXG PCTG, HDT at 0.45 MPa 76 °C, on the line for at least 80 °C".
- **Biggest surprise:** **PLA** sits in "Not enough data: 3DXTECH ECOMAX PLA, HDT at 0.45 MPa not published", while the same row's HDT column shows 55 (50–135 · 86). PLA Silk, PLA-CF, PLA Wood and the others are correctly under "Unlikely to meet". Plain PLA, the one material I know fails this, is the one the page will not call unlikely. The drawer did not tell me why.
- **Hidden:** "Hidden as unlikely (16)" lists OBC, PEBA, TPC, TPS and every TPU, each marked only "UNKNOWN screened none judged". They are not unlikely. HDT does not apply to them, and only the chip's tooltip says so.
- **Trust:** PASS, yes. I would not use "Not enough data" to find hidden candidates.

## 5. High-stiffness fixture (modulus ≥ 5 GPa; HDT ≥ 90 °C reported)

- **Expected:** CF-filled PA, PPA, PPS, PET and PP only.
- **Default:** "10 of the 152 … 94 more could not be checked and are left out". The chips read PASS 10, UNKNOWN 94, FAIL 48. The list is PA6-CF, PAHT-CF, PET-CF, PETG-CF (1 of 24), PP-CF, PP-GF, PPA-CF, PPA-GF, PPS-CF and PPS-GF, which is right. "Not checked by this template: Deflection of the part" is a good note.
- **Include, estimates on:** One check away 10, Not enough data 27, Unlikely 56, SCREENED 1, plus a small "1 screened" badge under the estimates switch. **Estimates off:** 10 / 45 / 39, SCREENED 0.
- **Surprises (serious):** "PLA: One check away on 1 of 195 products: Spectrum PLA Tough, tensile modulus (XY) bounded at 4.811 GPa by another record, on the line for at least 5 GPa". PLA Silk and PC got the same treatment, and PETG appears in "Not enough data … bounded at 4.642 GPa". The drawer explains: "Its flexural modulus: 2.493 GPa (V002691), so between 1.14678 and 4.81149 GPa: just under 5 GPa, within the test scatter (10 %), so on the line". A PLA with a 2.5 GPa flexural modulus is not "on the line" for 5 GPa. The top of a wide inferred band is not a value near the limit. TPE, TPV and SBC (Crystal Flex) sit in "Not enough data" for a stiff jig.
- **Trust:** PASS, yes. "One check away" here is misleading.

## 6. Flexible component (elongation ≥ 100 %, modulus ≤ 0.1 GPa)

- **Expected:** TPU classes, TPC, PEBA, TPS and soft TPEs.
- **Default:** "5 of the 152 … 104 more could not be checked and are left out". The chips read PASS 5, UNKNOWN 104, FAIL 43. The list is PBAT, TPC, "TPU 85A class and softer", "TPU 90A class" and "TPU 95A class". It is sensible, and "Not checked by this template: Recovery and sealing; Shore hardness" is exactly the caveat I would add.
- **Include, estimates on:** One check away 2 (PEBA and TPS, both on chamber), Not enough data 14 (2 "likely": COC flex, TPU-LW), Unlikely 85, SCREENED 3 (PA612, PA612-GF, PA66-CF). **Estimates off:** 2 / 42 / 60, SCREENED 0.
- **Surprises:** "UNKNOWN 104" for a gasket, when 85 of those are ABS, ASA, nylons and PLA that were measured and missed. "Unlikely to meet: every measured product misses elongation at break (XY) at least 100 %: 16 of 55; the other 39 have no value measured that way" is honest, but rigid ABS is not unknown for a gasket. PVC-P again shows "estimated 0.215 to 8.69 GPa", a 40-fold band. PLA blend and PA612-ESD sit in "Not enough data" for a gasket.
- **Trust:** PASS, yes. The counts, no.

## Counts at a glance

The default view uses Leave out. The other two columns use Include, giving One check away / Not enough data / Unlikely to meet, then SCREENED.

| Preset | Default: PASS · UNKNOWN · FAIL | Include, estimates on | Include, estimates off |
| --- | --- | --- | --- |
| Outdoor structural part | 11 · 91 · 50 | 7 / 33 / 42, screened 9 | 7 / 38 / 37, screened 9 |
| Indoor prototype | 96 · 32 · 24 | 29 / 3 / none, screened 0 | 29 / 3 / none, screened 0 |
| Lightweight structure | 19 · 76 · 57 | 16 / 33 / 27, screened 0 | 16 / 40 / 20, screened 0 |
| Warm environment | 42 · 84 · 26 | 26 / 27 / 15, screened 16 | 26 / 27 / 15, screened 16 |
| High-stiffness fixture | 10 · 94 · 48 | 10 / 27 / 56, screened 1 | 10 / 45 / 39, screened 0 |
| Flexible component | 5 · 104 · 43 | 2 / 14 / 85, screened 3 | 2 / 42 / 60, screened 0 |

## What worked

- PASS lists are short, defensible and product-aware ("2 of 17 products", "passing: 3.61–4.5" over "all products: 3.91").
- "Not checked by this template" names what a filter cannot judge (UV, ease of printing, deflection, recovery) and says why.
- "Allow annealing: N more pass" names the materials it would add ("Would pass with annealing: PAHT-CF, PA12-CF, PET-GF").
- The drawer's "Your requirements" block gives PASS, FAIL or UNKNOWN for each requirement, with the published value and the standard behind it. It is the clearest part of the tool.

## The labels and switches

| Label | What I thought it meant | What it seemed to do | Clarity |
| --- | --- | --- | --- |
| "Materials that could not be checked: Leave out / Include" | Hide or show materials with gaps | Exactly that, with sections when included. The first Include also turned estimates on unasked | 4 |
| "Use estimates and resin data" | Fill gaps in the table with estimates | Greyed out under Leave out, with the reason only on hover. Never changed PASS. Moved materials between Not enough data and Unlikely, and moved nothing at all in Indoor and Warm. "Resin data" did nothing I could see | 2 |
| "Meets every requirement (N)" | Passed on published values | Same, with "N of M products" and "passing:" values | 5 |
| "One check away (N)" | One requirement short by a little | Mostly "its chamber temperature is not stated". It also listed PLA for 5 GPa | 3 |
| "Not enough data (N)" | Data missing, no contrary evidence | Also holds plain PLA for 80 °C, plain ABS and PC with estimates below the limit, and soft PVC for structural parts | 3 |
| "Unlikely to meet (N) — counted and exported" | Estimated to miss | Measured products miss, or every estimate misses. Collapsed by default. "Counted and exported" made no sense to me | 3 |
| "Hidden as unlikely (N)" (SCREENED section) | Estimated to miss badly, so removed | Mostly "does not apply" (elastomers' HDT) or "no product on record". The rows carry no reason | 2 |
| "Fail (N)" | A published value misses | Yes, but the row never says which requirement. The drawer does | 3 |
| "on the line" | Within test scatter of the limit | True for 98 °C against 100. Also used for the top of an inferred band (2.49 GPa flexural treated as on the line for 5 GPa tensile) | 2 |
| "likely" | Probably passes | The estimate meets the open limits. It is plain text inside the row, not a tag, and is easy to miss | 3 |
| SCREENED chip / "N screened" badge | Removed by a screen | Shows the hidden rows. With nothing hidden its tooltip reads "0 UNKNOWN materials are hidden as unlikely: . None failed a measured value." | 2 |
| Status counts PASS / UNKNOWN / FAIL | Passed, missing data, failed | UNKNOWN's tooltip says "could not be checked for missing data", but the count includes everything under "Unlikely to meet" | 2 |
| "0 of 11 products" / "none judged" | Products passing | Clear on hover ("None passes, but not every product fails, so the material is unresolved, not failed") | 3 |
| "Values judged: as printed, dry. Allow annealing: 3 more pass" | Which state is compared | Exactly that. One click re-judges and names what changes | 5 |
| "Reported, not required" | Shown, not a filter | Same ("Shown for each material; does not filter or reorder") | 4 |
| "Not checked by this template: …" | What the preset ignores | Same, with a reason a colleague would give | 5 |
| "Not enough data: no product on record" | Unclear | A material with no product shown in a buying list | 2 |
| "bounded at 4.811 GPa by another record" | Nothing | Inferred from another property (the drawer shows flexural modulus) | 1 |

Average over the 18 rows: 54 / 18 = **3.0**.

## Top confusions

1. **"One check away" for impossible candidates.** "PLA … Spectrum PLA Tough, tensile modulus (XY) bounded at 4.811 GPa by another record, on the line for at least 5 GPa". The drawer says "between 1.14678 and 4.81149 GPa … so on the line". To an engineer, "on the line" means the measured value is near the limit, not that the top of a wide band reaches it. Screenshot 3.
2. **The UNKNOWN count mixes "never measured" with "measured and missed".** The UNKNOWN chip promises "could not be checked for missing data", yet "UNKNOWN 104" for the Flexible preset includes 85 rigid materials under "Unlikely to meet". The "Why excluded" tab counts the same thing differently ("Tensile modulus (XY) at least 3 GPa — failed 20 · could not check 92").
3. **Plain PLA is "Not enough data" for an 80 °C part** ("3DXTECH ECOMAX PLA, HDT at 0.45 MPa not published"), while its HDT column shows 55 and PLA Silk and PLA-CF are "Unlikely to meet". Screenshot 4.
4. **The estimates switch is hard to follow.** It is greyed out until Include, turns itself on at the first Include, and never changes PASS. The "Not enough data" description still says "Ordered by how close the estimate is" with estimates off. Rows print an estimate that misses ("estimated 1.74 to 2.7 GPa" against 3) but are not called unlikely, because a "plausibly" range nobody showed me is what decides.
5. **One idea, four names, and the wrong reason:** the "SCREENED" chip, the "Hidden as unlikely" heading, "16 screened out" in the header and a "1 screened" badge under the switch. In Warm, the 16 hidden materials are elastomers whose HDT does not apply, which is not "unlikely". The rows give no reason at all. Screenshot 5.
6. **FAIL rows never say what failed.** PBT shows "FAIL 0 of 1 product". Only the drawer says "Bed ≤ 120 °C. Requires up to 200 °C". Screenshot 2.
7. **Odd materials in structural lists:** soft PVC ("estimated 0.215 to 8.69 GPa"), FormFutura Crystal Flex, TPE and TPV under Outdoor, Lightweight and Stiffness. A TPU-CF has "tensile modulus (XY) estimated 1.34 to 2.37 GPa".
8. **Internal leftovers in the copy:** "(D155)" in an estimate tooltip; "(V002691)" and five-decimal bounds in the drawer; "This product is outside the complete printer context used for screening validation"; "counted and exported".
9. **A good candidate held back on a technicality:** PAHT-CF (8.39 GPa, HDT 170, a Bambu Lab filament) is UNKNOWN for Outdoor because one product lacks a density. Its estimate (1,030–1,170) sits below the material's own published range.

## Screenshots

In `.cache/screening-build/trial2-shots/`:

1. `1-outdoor-include-sections.jpg`: Outdoor with Include. The estimates switch is on, though I never clicked it.
2. `2-fail-row-no-reason-drawer.jpg`: FAIL rows with no reason; the PBT drawer explains the bed limit.
3. `3-stiffness-pla-one-check-away.jpg`: PLA and PLA Silk "One check away" from 5 GPa.
4. `4-warm-pla-not-enough-data.jpg`: PLA "Not enough data" for 80 °C beside an HDT of 55.
5. `5-warm-hidden-as-unlikely.jpg`: elastomers "Hidden as unlikely", each with no reason.
