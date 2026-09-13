# H2C FDM material database — manufacturer evidence audit

**Audit date:** 2026-09-13  
**Status:** RESEARCHED; workbook updated. The material-selection application was not changed.  
**Database:** `H2C_FDM_Material_Database.xlsx`

## Executive result

The workbook was updated in place and a verified delivery copy was exported under `outputs/h2c-manufacturer-audit-2026-09-13/`.

- Four exact commercial grades were added: Bambu Lab Support for PLA (New Version), BASF Forward AM Ultrafuse PC GF30, Kimya PEBA-S, and Essentium PPS-CF.
- Four grade-specific print profiles, 92 property records, 18 use/durability records, 10 source records, and 10 audit/coverage records were added.
- Three definite Bambu TDS metadata defects were corrected: `V000342` notch state, `V000343` unsupported notch state, and `V000717` locator wording.
- Canadian price row `CA0069` was quarantined because its retailer title identifies Bambu PLA Pure while the row was attached to ABS. It is no longer eligible for medians or headline pricing.
- Existing target-manufacturer source files were checked for staleness and numeric transcription: 84 recorded hashes matched the fetched files, two source rows had no hash to compare, and 1,333 numeric property rows had zero missing numeric tokens in the extracted current PDF text.
- Final workbook checks found no duplicate identifiers, broken material/grade/source references, or spreadsheet formula errors.

This is an evidence audit, not a claim that every manufacturer publishes every property. “Not published” remains a valid result, and manufacturer-specific test conditions remain attached to each row.

## Scope and method

The repeated brand list in the request was deduplicated to Bambu Lab, eSUN, Fillamentum, BASF Forward AM, Stratasys, 3DXTECH, Markforged, Essentium/Nexa3D, Polymaker, Prusa Research, and Kimya/Airtech.

The audit followed this hierarchy:

1. Exact manufacturer TDS/SDS or official printer documentation.
2. Official manufacturer product/catalog pages for current identity and availability.
3. Retailer evidence only for price or, in the Kimya case, an indexed copy of the current manufacturer-authored TDS when the distributor site blocked direct PDF retrieval.

No property was transferred between adjacent grades. No generic family range was substituted for an exact grade. Published `N/A` entries were recorded as missing—not converted to zero. Printed-part, feedstock, raw-resin, orientation, conditioning, annealing, load, and notch distinctions were retained.

## Bambu Lab review

The 40 existing Bambu grade records were cross-checked against the [Bambu Lab Canada filament collection](https://ca.store.bambulab.com/collections/bambu-lab-3d-printer-filament), the current [Bambu Filament Guide](https://cdn1.bambulab.com/filament/filament-guide/wksdyyzd8n9/filament-guide-en.pdf), and their recorded product TDS files. The current workbook now contains 41 Bambu grades after adding the exact [Support for PLA technical data sheet](https://store.bblcdn.com/s2/default/200ef29f5cd04b20ba6c2c86f0cc3ec0/Bambus_Support_for_PLA_Technical_Data_Sheet.pdf).

The new support grade records the full published profile: 220–230 °C nozzle, 35–45 °C bed, 25–45 °C chamber, 55 °C/8 h drying, under 20% RH storage/printing, under 200 mm/s, 55° maximum overhang, and 30 mm maximum bridge. It also records density 1.33 g/cm³, melt index 13.6 ± 1.2 g/10 min, melting temperature 190 °C, and water absorption 0.43%. All mechanical fields are explicitly `N/A` in the TDS and remain missing in the workbook.

The [official current product page](https://bambu-lab-jp.myshopify.com/en/products/support-for-pla-new) describes this as a 0.5 kg support-interface product and says it is AMS/AMS lite compatible. The workbook does not convert that statement into a specific H2C left/right or AMS-module route; those fields still require H2C-specific guide confirmation.

### Corrected Bambu records

| Record | Before | After | Evidence basis |
|---|---|---|---|
| `V000342`, PLA-CF impact | Unnotched | Notched | Raw TDS line explicitly includes “notched.” |
| `V000343`, PLA-CF impact | Notched | Not published | The TDS repeats the XY label and provides no notch qualifier; neither Z nor notch state was inferred. |
| `V000717`, PC FR impact locator | “notch unspecified” | “notched” | TDS explicitly labels the value notched; numeric value was unchanged. |
| `CA0069`, ABS price | Eligible ABS price | Quarantined | Retailer title/URL identify PLA Pure, not ABS. |

## Added exact grades

### BASF Forward AM Ultrafuse PC GF30 (`G038-02`)

The current [official product page](https://forward-am.com/material-portfolio/ultrafuse-filaments-for-fused-filaments-fabrication-fff/reinforced-filaments/ultrafuse-pc-gf30/) and [TDS v1.2](https://forward-am.com/wp-content/uploads/2021/12/Ultrafuse_PC_GF30_TDS_EN_v1.2.pdf) establish a 30% glass-fibre PC filament in 1.75 and 2.85 mm. The workbook now records 33 exact property rows across XY, XZ, and ZX, including printed-part density, HDT at both loads, Tg, melting temperature, melt-volume rate, tensile/flexural data, and notched/unnotched Charpy and Izod results.

The published 280–330 °C nozzle and 80–100 °C bed ranges are within the H2C thermal envelope, but this is not treated as H2C approval. A ≥0.6 mm hardened-steel nozzle is recorded because the TDS warns about glass-fibre abrasion.

### Kimya PEBA-S (`G045-03`)

Kimya’s assets are now carried by Airtech; the [current Airtech Kimya filament portfolio](https://www.airtech3d.com/filament) lists PEBA-S, and Airtech’s [acquisition announcement](https://www.airtech3d.com/airtech-acquires-kimya-assets-extend-additive-manufacturing-filament-capabilities-and-solutions) documents the provenance change. The exact manufacturer-authored [PEBA-S TDS indexed by Samaro](https://www.samaro.fr/app/uploads/2026/04/ba38ba38d87e28552202938c4c1cc670d8ef6fea3287_Kimya_PEBA_S_3D_Filament_EN-1.pdf) supplies 13 property rows and a 235–245 °C nozzle / 80–90 °C bed profile.

Direct retrieval of the Samaro PDF returned a site block page, so its source row says “indexed content retrieved; direct PDF blocked” and carries no SHA-256. The data were not promoted to the family headline because the existing eSUN representative remains the selected grade.

### Essentium PPS-CF (`G073-02`)

The official Nexa3D-hosted [Essentium PPS-CF TDS](https://nexa3d.com/wp-content/uploads/2024/07/TDS-Essentium-PPS-CF.pdf) identifies 15% carbon-fibre PPS and publishes XY, 45/45, and ZX results with standard deviations. Twenty-five property records were added, including the explicit raw-material qualifications on density, water absorption, flammability, and the 20,000-hour continuous-service temperature.

Its 330–400 °C nozzle range exceeds the H2C’s 350 °C maximum, so this grade is evidence for PPS-CF comparison, not an H2C-compatible profile. The workbook records that limit explicitly.

## Requested-manufacturer coverage

| Manufacturer | Exact grades now in workbook | Audit result |
|---|---:|---|
| Bambu Lab | 41 | Current catalog/guide/TDS cross-check; one grade added and three metadata corrections made. |
| eSUN | 1 | Existing exact PEBA90A evidence retained; official [TDS download index](https://www.esun3d.com/zldownload_catalog/tds/page/3/) checked. No adjacent-current product values substituted. |
| Fillamentum | 3 | Existing exact-grade PDFs refetched and hash/token checked; representative official [PLA Extrafill TDS](https://fillamentum.com/wp-content/uploads/2020/10/Technical-Data-Sheet_PLA-Extrafill_03012019.pdf). No correction triggered. |
| BASF Forward AM | 3 | Ultrafuse PC GF30 added; existing BASF evidence retained. |
| Stratasys | 4 | Current [FDM material catalog](https://www.stratasys.com/en/materials/materials-catalog/fdm-materials/) checked. Existing research-grade records retained; no extra closed-system grade added beyond the sample rule. |
| 3DXTECH | 30 | Broadest supplemental set; official [TDS/SDS library](https://www.3dxtech.com/pages/tech-data-sheets-safety-data-sheets) checked and existing files passed hash/token verification. |
| Markforged | 0 | [Onyx/composites data](https://web-objects.markforged.com/craft/materials/CompositesV5.2.pdf) reviewed but not inserted: Onyx maps only to the already-full generic PA-CF sample and is tied to the Markforged process ecosystem. Continuous-fibre values were not treated as ordinary chopped-fibre filament properties. |
| Essentium / Nexa3D | 1 | PPS-CF added with explicit over-temperature H2C gate. |
| Polymaker | 18 | Existing exact-grade set retained; current manufacturer TDS records were hash/token checked. No correction triggered. |
| Prusa Research | 1 | Existing exact grade and the current [Prusa Filament Material Guide](https://help.prusa3d.com/filament-material-guide) retained; generic guide values were not copied into commercial-grade rows. |
| Kimya / Airtech Europe | 1 | PEBA-S added with source-access limitation recorded. |

## Deliberate non-insertions

- Markforged continuous-fibre properties are reinforcement-system results, not direct substitutes for chopped-fibre FFF filament.
- Stratasys Nylon 12CF was not added because the PA12-CF sample already contains three independent procurement grades; the [Stratasys catalog](https://www.stratasys.com/en/materials/materials-catalog/fdm-materials/) remains useful as closed-platform reference evidence.
- Current catalog variants were not added solely to increase counts. A new row required an exact canonical mapping, a traceable source, and a gap that the row genuinely closed or materially improved.
- No new Canadian prices were created when a current grade-matched offer could not be verified.

## Validation and handoff

The final workbook contains:

| Table | Rows |
|---|---:|
| Materials | 102 |
| Grades | 140 |
| Print setup | 160 |
| Properties | 1,899 |
| Use & durability | 380 |
| Prices CA | 104 |
| Sources | 224 |
| Coverage | 1,116 |
| Method | 42 |

Structural validation covered unique identifiers, material/grade/source foreign keys, `Materials.GradeIDs`, expanded Excel-table references, the price quarantine, the corrected Bambu-guide hash, and cell error values. The source workbook and delivery copy have identical worksheet data. The existing application/build code was intentionally left unchanged, so its frozen expected-row counts will need a separate, explicitly authorized implementation pass before rebuilding the application.

The machine-readable audit summary is in [audit-evidence.json](audit-evidence.json); the implementation-oriented change ledger is in [changelog.csv](changelog.csv). How each change reached the selector is in [RESPONSE.md](RESPONSE.md).

