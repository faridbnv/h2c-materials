# Missing chamber and property research

**Research date:** 2026-09-13  
**Scope:** evidence and implementation recommendations only  
**Evidence status:** RESEARCHED / implementation PROPOSED  
**Database status:** `data/H2C_FDM_Material_Database.xlsx` was not edited  
**Workbook SHA-256 at the start of this research:** `9018c6368a1e8c2184ce74407ded8cd12d237cf6bd90bf74e67d8deaab3a0acf`

## Executive result

The current compiled snapshot has 102 materials, 96 of them H2C-relevant. Among the H2C-relevant materials, 43 have no numeric chamber-temperature profile. Property headline gaps are also substantial: 13 density, 31 XY tensile modulus, 49 XY tensile strength, 29 XY elongation, and 35 HDT-at-0.45-MPa gaps. These counts describe what the HTML tool can actually use, not merely whether some vaguely related number exists in the workbook.

This research recovered three strong product-specific numeric chamber windows: Bambu PC FR at **45–60 °C**, Bambu PAHT-CF at **45–60 °C**, and Bambu PPS-CF at **60–90 °C**.[1][2][3] It also recovered product-specific categorical chamber evidence for several other gaps, including “not needed,” “recommended,” or no setpoint. Categorical guidance is real manufacturer evidence, but it is not a numeric temperature and must remain distinct from one.

The most useful property recoveries are exact printed-product data for eSUN PLA-Lite, Polymaker Panchroma Silk PLA, Polymaker Panchroma CoPE, and Fiberon PET-GF15. colorFabb nGen and Fillamentum CPE HG100 also contribute useful values, but their records need field-level eligibility decisions because some values are supplier/raw-material data or lack printed-specimen orientation. No defensible exact values were found for the database’s generic PA66, PA66-CF, PA612, PA612-GF, and POM identities without first choosing an exact commercial grade.

No researched estimate in this report is suitable for silently filling an exact-data cell. Estimates are proposed only as broad plausibility or pre-screening ranges and must retain the tool’s existing rule: an estimate may rule a material out, but cannot prove it passes.

## How the repository is organized

The repository has a clear source-build-runtime separation:

```text
data/H2C_FDM_Material_Database.xlsx   frozen authoring source
data/Generic_Materials_Reference.xlsx Ashby reference layer, not a candidate set
              |
build/src/                            extract, normalize, compile, estimate, validate
              |
dist/db.json                          compiled runtime database
dist/reference.json                   compiled reference data
dist/H2C_Material_Selector_*.html     self-contained offline tool

app/js/engine/                        pure selection and constraint logic
app/js/ui/                            rendering and interaction
app/js/main.js                        state and wiring
test/                                 build and decision-logic tests
docs/                                 architecture, model, pipeline, audits, research
```

The relevant design rule is in [DATA-MODEL.md](../../DATA-MODEL.md): measured, related, and estimated values are different data types. Only a verified measured headline may satisfy a requirement. The build already treats family estimates as bounds and keeps them out of Strict mode. That is the correct model for integrating the findings below.

The local Materials Wiki was checked before the web search. Its FFF guidance explains why polymer properties cannot be transferred casually across machines and processes: cooling history, porosity, raster layout, and layer interfaces affect stiffness, strength, and anisotropy. Its composite notes also support using mixture models only as bounds unless filler fraction and alignment are known.[18][19][20]

## Evidence classes used here

| Label | Meaning | Can become a measured headline? |
|---|---|---|
| **ACTUAL — exact numeric** | The manufacturer or a test source reports the requested value for the exact commercial grade, with the relevant quantity and units. | Yes, if specimen form, direction, endpoint, load, and conditions satisfy the schema. |
| **ACTUAL — categorical** | The exact product source says chamber required, recommended, optional, or not needed, but gives no temperature. | Yes as categorical process evidence; no as a numeric chamber range. |
| **ACTUAL — related** | A real published value, but it is raw-resin data, an unspecified direction, a different endpoint, flexural rather than tensile modulus, Vicat rather than HDT, or another non-equivalent quantity. | No. Preserve as related evidence. |
| **ESTIMATE** | A range inferred from measured peer grades or a nearby formulation. | No. It may only exclude an implausible candidate. |
| **UNRESOLVED** | No sufficiently specific product identity or comparable source was found. | No. |

## 1. Heated-chamber findings

### Product-specific numeric recoveries

| Database material | Exact grade | Evidence | H2C 65 °C implication | Classification |
|---|---|---:|---|---|
| PC FR | Bambu PC FR | 45–60 °C[1] | Fully reachable; H2C exceeds the published upper end by 5 °C, so the profile should recommend staying within 45–60 °C. | **ACTUAL — exact numeric** |
| PAHT-CF | Bambu PAHT-CF | 45–60 °C[2] | Fully reachable; use the product window, not a nylon-family estimate. | **ACTUAL — exact numeric** |
| PPS-CF | Bambu PPS-CF | 60–90 °C[3] | Only the 60–65 °C portion is reachable. This is **partial/conditional**, not full H2C compatibility. Bambu also says higher chamber values can improve Z-direction properties. | **ACTUAL — exact numeric** |

These values can replace chamber `unknown` only for the named grades. They do not justify assigning the same window to every PC-FR, PAHT-CF, or PPS-CF formulation.

### Product-specific categorical recoveries

| Database material | Exact grade/source | Published guidance | Recommended representation |
|---|---|---|---|
| PLA Silk | Polymaker Panchroma Silk PLA | Enclosure not needed.[4] | **ACTUAL — categorical: not required**. Do not manufacture a numeric chamber setpoint. |
| ABS-ESD | 3DXTECH 3DXSTAT ESD ABS | Heated chamber recommended.[5] | **ACTUAL — categorical: recommended; numeric unknown**. |
| PC-CF | 3DXTECH CarbonX PC+CF | Heated chamber recommended.[6] | **ACTUAL — categorical: recommended; numeric unknown**. |
| PVDF | 3DXTECH FluorX PVDF | Heated chamber recommended.[7] | **ACTUAL — categorical: recommended; numeric unknown**. |
| TPC/TPEE | BASF Ultrafuse TPC 45D | TDS lists build chamber as “–”; bed 20–60 °C.[8] | **ACTUAL — categorical/no setpoint**. Treating “–” as 0 °C would be wrong. |
| CPE | Fillamentum CPE HG100 | Heated chamber/enclosure not needed.[9] | **ACTUAL — categorical: not required**. |
| CPE-CF | Fillamentum CPE CF112 Carbon | Heated chamber/enclosure not needed.[10] | **ACTUAL — categorical: not required**. |
| PET-GF | Fiberon PET-GF15, candidate additional grade | Chamber recommended for stable dimensions; small-Z parts may be printed open.[11] | **ACTUAL — categorical: recommended; numeric unknown**. This applies to PET-GF15, not the existing Flashforge PET-GF grade. |

Bambu’s filament guide also provides enclosure required/optional guidance across its filament families, including PLA, PETG HF, ABS, PC, PLA-CF, PETG-CF, PAHT-CF, PPA-CF, and PPS-CF.[12] That guide is useful categorical evidence, but it cannot be converted into degrees Celsius. A closed enclosure also is not equivalent to an actively controlled heated chamber.

### Estimated chamber bands for the remaining gaps

The following are **ESTIMATES**, derived as conservative peer-validation bands from the closest existing product profiles in the compiled database and the product evidence above. They are not print recipes, cannot make a chamber gate pass, and should not overwrite a categorical manufacturer statement.

| Estimate band | Materials currently lacking numeric chamber data | Basis and cautions |
|---:|---|---|
| 20–45 °C | PLA Basic, PLA Matte, PLA Lite, PLA Metal, PLA Marble, PLA Sparkle, PLA Galaxy, PLA Silk; BVOH; Support PA/PET | Low-temperature/open-printer peers. Use “not required/optional” where the exact source says so. Support products are not structural peers. |
| 20–50 °C | PETG Basic, PETG HF, PETG-CF, PETG-GF; PEBA; TPC/TPEE; PP, PP-GF, PE, OBC; CPE, CPE-CF, CoPE, nGen, PVB | Broad low-warping peer envelope. Flexible materials and polyolefins must not be pooled mechanically; this band is chamber-only. |
| 45–70 °C | ABS-ESD, ASA-GF, PC FR, PC-CF, PAHT-CF, PA6, PET, PET-GF | Engineering-polymer/enclosure peers. Where exact numeric data exist, use them instead. |
| 40–70 °C | PA66, PA66-CF, PA612, PA612-GF | Nylon-family plausibility band. These rows have no exact commercial grade, so this is especially weak. |
| 60–90 °C | PPS-CF | Superseded by the exact Bambu window for that grade.[3] |
| 80–120 °C | PPA, PPA-CF, PPA-GF | High-temperature aromatic nylon plausibility band. A reseller reproduces 100–120 °C for Bambu PPA-CF, but the accessible official TDS did not state a chamber range; retain as **secondary/unconfirmed**, not exact manufacturer evidence.[26][27] |
| 45–80 °C | POM / Acetal | Family estimate only. The exact purefil product page specifies a 120–150 °C bed but no chamber temperature.[13] Do not infer chamber temperature from bed temperature. |
| No defensible band | PVDF | The exact product says chamber recommended but supplies no numeric window.[7] PVDF processing cannot safely inherit a generic rigid-polymer estimate. |

This grouping covers all 43 H2C-relevant materials whose compiled chamber gate is currently unknown. The estimates deliberately stay coarse. Translating “enclosure recommended” into a number would create false precision.

### H2C chamber decisions

The H2C baseline is 65 °C:

- **PC FR and PAHT-CF:** the complete published chamber window is reachable.
- **PPS-CF:** only part of the 60–90 °C window is reachable. The tool should show “partial published window available,” not `within`.
- **PPA family:** likely beyond the H2C chamber for the most demanding grades, but exact-grade primary evidence is still required before a hard fail is issued.
- **Categorical-only grades:** H2C has a heated chamber, but numeric compatibility remains unknown. “Recommended” is not evidence that 65 °C is enough.
- **No-enclosure grades:** these can clear a chamber-availability requirement categorically, but should not receive an invented 0–25 °C numeric profile.

## 2. Thermal and mechanical property findings

### Exact printed-product candidates

These are the strongest additions found. “Candidate” means they are suitable for structured review and possible future workbook implementation; this report does not implement them.

| Database target | Exact product | Density | XY tensile modulus | XY tensile strength | XY elongation at break | HDT at 0.45 MPa | Evidence decision |
|---|---|---:|---:|---:|---:|---:|---|
| PLA Lite | eSUN PLA-Lite | 1.23 g/cm³ | Not published; 3114.92 MPa is **flexural** modulus | 53.05 MPa | 3.89% | 53 °C | Density, XY strength, XY elongation, and HDT are **ACTUAL — exact numeric**. Keep flexural modulus related, not tensile.[14] |
| PLA Silk | Polymaker Panchroma Silk PLA | 1.24 g/cm³ | 2403 MPa | 41.1 MPa | Not published | Not published; Vicat 64.7 °C exists | Density, XY modulus, and XY strength are **ACTUAL — exact numeric**. Vicat is **ACTUAL — related**, not HDT.[4][15] |
| CoPE | Polymaker Panchroma CoPE | 1.296 g/cm³ | 2514.6 ± 71.1 MPa | 51.6 ± 0.3 MPa | 10.5 ± 3.8% | Not published; Vicat 66 °C exists | Printed XY mechanical values are **ACTUAL — exact numeric**. Vicat remains related.[16] |
| PET-GF | Fiberon PET-GF15, proposed additional grade | 1.43 g/cm³ | 4144.2 ± 133.3 MPa | 59.9 ± 0.8 MPa | 4.0 ± 0.5% | 81.6 °C as printed; 133.7 °C annealed | All are **ACTUAL — exact numeric for PET-GF15**. They cannot be attached to the existing Flashforge PET-GF grade. Annealed and as-printed HDT must be separate conditioned measurements.[11][17] |

The Fiberon PET-GF15 product page highlights 133.7 °C, but the TDS shows that this is the **annealed** HDT at 0.45 MPa; the as-printed result is 81.6 °C.[17] The tool should never select the larger number without carrying the annealing condition.

### Useful actual data that need eligibility limits

| Database target | Source result | Correct interpretation |
|---|---|---|
| CPE | Fillamentum CPE HG100: density 1.25 g/cm³; tensile yield 47 MPa; tensile break 48 MPa; elongation 150%; flexural modulus 1860 MPa; HDT 80 °C at 0.455 MPa.[21] | **ACTUAL — exact formulation**, but the accessible TDS does not establish printed XY orientation for the mechanical values. Density and properly loaded HDT may be usable; tensile values should remain related until specimen form/orientation is confirmed. Flexural modulus is not tensile modulus. |
| nGen / Amphora | colorFabb nGen printed XY: Young’s modulus 1700 MPa, tensile strength 54 MPa, elongation 11%. Supplier data: density 1.20 g/cm³ and HDT 71 °C at 0.455 MPa.[22] | Printed XY mechanical values are **ACTUAL — exact numeric**. Density/HDT are **ACTUAL — related supplier/raw-material values** unless the source provenance model explicitly allows them as formulation-level physical data. |
| PEBA | eSUN PEBA90A: density 1.01 g/cm³; XY tensile strength >16.5 MPa; XY elongation >520%; Z strength 7.5 MPa; Z elongation 150%; Vicat 110 °C.[23] | Density and XY mechanical values are **ACTUAL — exact numeric/inequality**. Vicat is related, not HDT. No tensile modulus or numeric chamber value was found. |
| TPC/TPEE | BASF Ultrafuse TPC 45D: density 1.15 g/cm³; Tg −35 °C; melting point 180 °C.[8] | **ACTUAL — exact physical/thermal properties**, but Tg and melting point do not fill HDT. No suitable tensile headline was found in this TDS. |

### Identity problems that must be fixed before importing data

1. **CoPE currently duplicates CPE HG100 evidence.** In the compiled database, the CoPE row points to the same Fillamentum CPE HG100 grade used by CPE. That is not an exact CoPE identity. The clean repair is to add or substitute the actual Polymaker Panchroma CoPE grade, then attach only its own evidence.[16]
2. **PET-GF needs grade separation.** Fiberon PET-GF15 is an excellent exact source, but it is a different formulation from the database’s Flashforge PET-GF. Add a new grade or change the representative-grade policy explicitly; do not overwrite Flashforge values.
3. **Generic nylon rows are not products.** PA66, PA66-CF, PA612, and PA612-GF currently have no exact grade. A Stratasys PA6/66-GF30-FR or a Polymaker PA612-CF15 result is not interchangeable with those generic identities.[24][25]
4. **POM remains unresolved.** The purefil page confirms an exact POM product and demanding bed temperature, but not the requested mechanical/HDT/chamber values.[13]

### Existing estimates for materials with no property measurements

The build already derives the following family bounds. They are reproduced here so that future work does not confuse them with the new exact findings. Units are kg/m³, GPa, MPa, %, and °C respectively.

| Material | Density | XY tensile modulus | XY tensile strength | XY elongation | HDT 0.45 MPa | Status after this research |
|---|---:|---:|---:|---:|---:|---|
| PLA Lite | 1190–1320 | 1.54–2.88 | 26–55.4 | 2.8–15.3 | 53–80 | Replace eligible fields with exact eSUN grade data; modulus remains estimated. |
| PLA Silk | 1190–1320 | 1.54–2.88 | 26–55.4 | 2.8–15.3 | 53–80 | Replace density/modulus/strength with exact Panchroma Silk data; elongation/HDT remain unresolved or estimated. |
| PA66 | 1120–1250 | 2.223–8 | 66.2–102 | 2.1–9.9 | 110.5–194 | **ESTIMATE only**; choose an exact grade first. |
| PA66-CF | 1030–1160 | 3.86–8 | 91.9–102 | 2.1–8.4 | 150–194 | **ESTIMATE only**; choose an exact grade first. |
| PA612 | 1120–1250 | 2.223–8 | 66.2–102 | 2.1–9.9 | 110.5–194 | **ESTIMATE only**; do not borrow PA612-CF values. |
| PA612-GF | 1140–1350 | 2.85–7.8 | 66.2–102 | 3.9–6 | 150–186 | **ESTIMATE only**; choose an exact grade first. |
| PET-GF | 1290–1340 | 2.85–7.8 | 36–106 | 1.2–9.5 | 75.5–241 | Add Fiberon PET-GF15 as a separate exact grade; keep Flashforge unresolved. |
| POM / Acetal | 810–1710 | 1.35–2.88 | 26–76 | 2.4–75 | 53–158 | **ESTIMATE only**; the band is too broad for selection confirmation. |
| CPE | 1160–1230 | 1.35–2.88 | 26–76 | 2.4–75 | 53–158 | Fillamentum TDS supplies actual formulation data, but mechanical eligibility needs orientation/specimen review. |
| CoPE | 1160–1230 | 1.35–2.88 | 26–76 | 2.4–75 | 53–158 | Replace the mistaken CPE identity with exact Panchroma CoPE evidence. |
| nGen / Amphora | 1160–1230 | 1.35–2.88 | 26–76 | 2.4–75 | 53–158 | Replace mechanical estimates with exact printed XY nGen data; preserve raw/supplier density and HDT as related. |

### Other headline gaps are often semantic, not research blanks

Eighteen materials lack an XY tensile-strength headline even though some strength evidence may already exist: PLA, PETG, PETG-ESD, ABS-CF, ABS-ESD, PC-CF, PA12-CF, PA12-GF, PA-CF, PA-GF, PPS, HIPS, PP, PP-CF, PP-GF, PCTG, PC-ABS, and PVDF. For many of these, the problem is direction, specimen type, or tensile endpoint—not total absence of data. A yield-strength, break-strength, Z-direction, molded, or orientation-unspecified result must not be relabelled as the XY tensile-strength headline.

The same caution applies to thermal quantities:

- Vicat softening temperature, glass transition, melting point, and continuous-use temperature are useful but do not equal HDT.
- The current validator warns that 24 of 66 HDT headlines cite a source that names the standard but not the load. Those values should not be presented as confirmed 0.45 MPa measurements until the load is verified.
- HDT is not always an appropriate target for elastomers and soluble support materials. “Not applicable” may be more accurate than an estimated rigid-plastic HDT.

## Recommended implementation order — not implemented

1. Add the three exact numeric chamber records: PC FR 45–60 °C, PAHT-CF 45–60 °C, PPS-CF 60–90 °C. Give PPS-CF a partial-H2C result.
2. Add exact categorical chamber states separately from numeric ranges. Preserve `recommended`, `not required`, and `no setpoint` without coercion.
3. Resolve the CoPE/CPE identity duplication before adding more properties.
4. Add exact grades for eSUN PLA-Lite, Panchroma Silk PLA, Panchroma CoPE, and Fiberon PET-GF15. Retain source test conditions and grade IDs on every measurement.
5. Promote only matching quantities: tensile modulus is not flexural modulus; HDT is not Vicat; XY is not Z; annealed is not as printed.
6. Keep all family and chamber estimates in an inference layer. They may exclude but never confirm compatibility.
7. Re-run the deterministic build and inspect the coverage delta only after a reviewed workbook change. This research intentionally stops before that step.

## Coverage outcome if the high-confidence candidates are later implemented

The strongest candidates can eliminate most of the “no property measurements at all” status for PLA Lite, PLA Silk, CoPE, PET-GF, CPE, and nGen. They do **not** eliminate all headline gaps because modulus, elongation, HDT, orientation, or exact-grade issues remain for several materials. PA66, PA66-CF, PA612, PA612-GF, and POM remain the highest-value unresolved identities.

For chamber data, the three numeric recoveries materially improve the H2C gate. The categorical findings improve transparency but should not be counted as numeric coverage. A future UI should report these states separately so “manufacturer recommends a chamber” is visible even when no setpoint exists.

## Sources

1. [Bambu PC FR Technical Data Sheet](https://store.bblcdn.com/s6/default/280fecd3890948588fb95ac91013b7ba/Bambu_PC_FR_Technical_Data_Sheet.pdf)
2. [Bambu PAHT-CF Technical Data Sheet, manufacturer document mirror hosted by the University of Waterloo](https://uwaterloo.ca/rapid-prototyping-centre/sites/default/files/uploads/documents/bambu_paht-cf_technical_data_sheet_v2.pdf)
3. [Bambu Lab Canada — PPS-CF](https://ca.store.bambulab.com/collections/pps/products/pps-cf)
4. [Polymaker — Panchroma Silk PLA](https://shop.polymaker.com/products/silk-pla)
5. [3DXTECH — 3DXSTAT ESD ABS](https://www.3dxtech.com/products/3dxstat-esd-abs-1)
6. [3DXTECH — CarbonX PC+CF](https://www.3dxtech.com/products/carbonx-pc-cf-1)
7. [3DXTECH — FluorX PVDF](https://www.3dxtech.com/products/fluorx-pvdf-1)
8. [BASF Forward AM — Ultrafuse TPC 45D Technical Data Sheet](https://forward-am.com/wp-content/uploads/2021/07/Ultrafuse_TPC_45D_TDS_EN_v2.3.pdf)
9. [Fillamentum — CPE HG100 Printing Guide](https://fillamentum.com/wp-content/uploads/2021/02/Fillamentum_Printing_Guide_CPE-HG100.pdf)
10. [Fillamentum — CPE CF112 Carbon Printing Guide](https://fillamentum.com/wp-content/uploads/2020/10/FI_Printing_Guide_CPE-CF112-Carbon.pdf)
11. [Fiberon by Polymaker — PET-GF15 product page](https://fiberon.polymaker.com/product/pet-gf15/)
12. [Bambu Lab — Filament Guide](https://cdn1.bambulab.com/filament/filament-guide/241213/filament-guide-us.pdf)
13. [purefil — POM filament](https://www.purefil.de/purefil-pom-filament_186_2176/)
14. [eSUN — PLA-Lite](https://www.esun3d.com/epla-lite-product)
15. [Polymaker — Panchroma Technical Data Sheet](https://polymaker.com/wp-content/uploads/Panchroma_TDS_V2.1.pdf)
16. [Polymaker — Panchroma CoPE Technical Data Sheet](https://polymaker.com/wp-content/uploads/lana-downloads/Panchroma-CoPE_TDS_EN_V5.4.pdf)
17. [Fiberon by Polymaker — PET-GF15 Technical Data Sheet](https://fiberon.polymaker.com/wp-content/uploads/TDS_FIBERON-PET-GF15_V1.0_EN.pdf)
18. [Local Materials Wiki — Additive manufacturing](</Users/farid/Documents/farid first Obsidian/Materials Wiki/wiki/mespd/mat-mespd-c-additive-manufacturing.md>)
19. [Local Materials Wiki — Additive manufacturing techniques](</Users/farid/Documents/farid first Obsidian/Materials Wiki/wiki/pe4/mat-pe4-c-additive-manufacturing-techniques.md>)
20. [Local Materials Wiki — Composites](</Users/farid/Documents/farid first Obsidian/Materials Wiki/wiki/em1/mat-em1-c-composites.md>)
21. [Fillamentum — CPE HG100 Technical Data Sheet](https://fillamentum.com/wp-content/uploads/2020/10/Technical-Data-Sheet_CPE-HG100_03012019.pdf)
22. [colorFabb — nGen Technical Data Sheet](https://mcstaging.colorfabb.com/media/datasheets/tds/colorfabb/TDS_E_ColorFabb_nGen.pdf)
23. [eSUN — PEBA90A](https://www.esun3d.com/peba-product)
24. [Stratasys — FDM PA6/66 GF30 FR](https://www.stratasys.com/en/materials/materials-catalog/fdm-materials/fdm-pa666-gf30-fr/)
25. [Fiberon by Polymaker — PA612-CF15](https://fiberon.polymaker.com/product/pa612-cf15/)
26. [Bambu PPA-CF Technical Data Sheet](https://store.bblcdn.eu/s8/default/f592e57fe69c40289897513bdd2b61bc/Bambus_PPA-CF_Technical_Data_Sheet_2ab26420-79f5-4692-888e-090006814050.pdf)
27. [3D-Printerstore — Bambu PPA-CF listing, secondary source](https://www.3d-printerstore.ch/Bambu-Lab-Filament-PPA-CF-black-075kg_2)

## Research limitations

- This was a manufacturer-first search. Independent laboratory data were not promoted over exact product datasheets when test conditions were not comparable.
- Some manufacturer pages change without versioned archives. The future source register should preserve access date, file hash, and a local permitted copy or extracted evidence note.
- Search visibility is uneven. “Not found” means absent from the reviewed official pages and PDFs, not proven nonexistent.
- Mechanical values are formulation- and process-specific. They should remain attached to grade, direction, specimen form, moisture conditioning, annealing, and test method.
- No XLSX, compiled JSON, HTML bundle, build source, or UI code was changed for this research.
