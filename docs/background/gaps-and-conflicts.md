# H2C FDM Material Database — Gaps & Conflicts, Prioritised

**Workbook:** `H2C_FDM_Material_Database.xlsx` · **DB snapshot:** 2026-09-10 · **Audit passes:** 2026-09-11 (two rounds)
**Backup of the pre-audit file:** `H2C_FDM_Material_Database_BACKUP_2026-09-11.xlsx`

The prioritisation below is driven by one question: **does the missing item change which
material you would choose for a part you can actually print on an H2C?** The H2C hardware
baseline is **350 °C nozzle / 120 °C bed / 65 °C chamber** (Method sheet, H2C row; confirmed
against Bambu's published H2C specifications). A gap on a material that cannot clear that
envelope cannot change a decision, so it ranks last regardless of how large it looks.

Price is treated as low priority throughout, per your instruction.

---

## 0. What changed in the workbook (both rounds)

| Coverage status | Before any audit | After round 1 | After round 2 (current) |
|---|---|---|---|
| Quarantined measurements | 15 | 6 | **1** |
| Conflicts | 10 open | 2 closed / 6 partial / 2 open | **3 closed / 6 partial / 1 open** |

**Round 1** (document re-reads via web fetch): repaired 9 quarantined measurements, closed 2
conflicts, advanced 6 others.

**Round 2** (you supplied 4 PDFs directly — the ones the automated fetch couldn't reach):
repaired **4 more** quarantined measurements, added **1 new measurement row** (PET hardness),
narrowed **1** further (scale still unconfirmed), and closed **1 more conflict**. Detail in §4 and §5.

Every repaired row carries the reasoning in its `Notes` field and the status
`Published value (transcription corrected)`, defined on the Method sheet. Formulas were
recalculated after each round so cached values are current, and every cell change was diffed
against the pre-audit backup and confirmed intentional.

---

## 1. Priority 1 — Blocks a real selection decision

These affect materials the H2C can print today (Official Bambu product or Officially listed family).
A gap here can silently change a shortlist.

### 1.1 Composition is unresolved on a printable reinforced grade — still open
| ID | Material | Issue |
|---|---|---|
| C00003 | **PLA-GF** (M019) | The iSANMATE grade's own document says *glass fibre* in the heading and *carbon fibre* in the description. **Still open** — see §4.3. The four PDFs supplied in round 2 (PETG, CF-ABS, TPU, PET) are unrelated products and don't bear on this. |

This remains the single highest-value unresolved item. Fibre identity changes abrasion route,
nozzle choice, stiffness and cost simultaneously, and PLA-GF is an officially listed family. The
other grade under M019 (Polymaker HT-PLA-GF) is unaffected and its Charpy data was repaired in round 1.

**Action:** the iSANMATE PLA-GF technical document itself (not the PETG/CF-ABS/TPU/PET sheets
already supplied) is what would resolve this — worth locating if you have it, or requesting a
composition declaration from iSANMATE directly.

### 1.2 Mechanical data absent on printable structural candidates
| Material | H2C status | Why it matters |
|---|---|---|
| **PETG-GF** (M025) | Officially listed family | Reinforced grade with no grade-specific mechanical evidence — cannot be compared against PETG-CF or PET-GF |
| **PET-GF** (M068) | Officially listed family | Same; also missing thermal and moisture |
| PVA (M075), Support for PLA/PETG (M078), Support for ABS (M079), Support for PA/PET (M080) | Official Bambu product | Low impact — these are supports; mechanical properties rarely drive their selection |

**Action:** request grade-specific TDS data (XY and Z separated) from the PETG-GF and PET-GF
manufacturers.

### 1.3 Print-setup data absent on printable reinforced grades
| Material | H2C status |
|---|---|
| **PC-GF** (M038) | Officially listed family |
| **PETG-GF** (M025) | Officially listed family |

**Action:** these are the two printable families where you have no published profile at all.
Either obtain manufacturer profiles or make them the first two entries in the H2C print-validation
campaign.

### 1.4 Grade-count shortfall on printable families
Twelve officially listed families are documented against fewer than the target 3 independent
manufacturers.

| Material | Manufacturers documented |
|---|---|
| **PETG-GF** (M025), **PC-GF** (M038), **PET** (M066), **PET-GF** (M068), **PPA-GF** (M071), **BVOH** (M076) | 1 of 3 |
| **PLA-GF** (M019), **ABS-CF** (M029), **ASA-GF** (M034), **TPU** (M039), **PA-GF** (M063), **PPS** (M072), **PPS-GF** (M074) | 2 of 3 |

A single-manufacturer family is a single data point wearing a family's name. Treat the 1-of-3 rows
as provisional until a second independent formulation is documented. (Note: round 2 re-read the
*same* iSANMATE and FormFutura documents already on file for PETG, ABS-CF, TPU and PET — it did not
add a second manufacturer to any of these families, only repaired misread values from the existing one.)

### 1.5 Moisture / environmental gaps on printable engineering grades
**ABS-CF** (M029), **ASA-GF** (M034), **PET** (M066), **PET-GF** (M068), **PPS** (M072), **BVOH** (M076).

Relevant if any candidate part sees outdoor exposure, washdown, or humid service. For an outdoor
enclosure case this promotes ASA-GF and PET-GF sharply.

---

## 2. Priority 2 — Conditional materials that could still qualify

Materials the H2C may handle subject to route/nozzle verification. Each of these has **no exact-grade
technical profile at all**, which is a harder problem than a missing property.

| Material | Missing |
|---|---|
| **PA66** (M055) | Grades, Mechanical, Thermal, Print setup, Moisture, Post-processing — everything |
| **PA66-CF** (M056) | Same — everything |
| **PA612** (M058) | Same — everything |
| **PA612-GF** (M060) | Same — everything |
| **POM / Acetal** (M087) | Grades, Mechanical, Thermal |
| **PE** (M085) | Grades, Thermal, Moisture, Post-processing |
| **PVDF** (M096) | Grades, Moisture, Post-processing |
| **PPA** (M069) | Grades (1 of 3) — AMS conflict closed round 1, see §4.1 |

**Action for the four nylons:** these are the "written manufacturer response" cases. Ask for the
retired or unpublished TDS/SDS with the exact product name, SKU, region, colour and approximate
purchase date. **Do not substitute PA6/66 for PA66.**

---

## 3. Priority 3 and below

**P3 — Theoretical materials (30 entries).** Gaps here are expected and mostly benign. The
exceptions are the three legacy identity cases, worth resolving because they are *retired products
you may already own*: **PLA Lite** (M004), **PLA Silk** original (M008), **Support for PLA** (M077)
— no exact technical profile obtained for any. Do not substitute PLA Pure for PLA Lite or Silk+ for
original Silk.

**P4 — Excluded materials (6 entries).** PEEK, PEKK, PEI/ULTEM, PSU, PESU/PES, PPSU. Every published
processing range for these exceeds 350 °C / 120 °C. Their gaps and unit conflicts cannot change any
H2C decision.

**P5 — Canadian prices (62 of 102 missing).** A procurement-data problem, not an evidence problem.
Five of the 62 are **Official Bambu products** — ASA-CF (M033), PETG HF (M022), PLA Basic Gradient
(M005), Support for PA/PET (M080), TPU 85A (M043) — cheapest to close via a single pass over the
Bambu Lab Canada storefront.

---

## 4. Conflicts — resolution detail

### 4.1 Closed (3)

**C00059 — PPA, AMS compatibility.** *Resolved round 1.* The IPCON PPA TDS at revision 2025-11 no
longer contradicts itself. Official H2C routing is still governed by `H2C-WIKI` / `H2C-MANUAL`,
unchanged — the H2C routing was **not** upgraded on the strength of this TDS.

**C00060 — PEEK, two printing-temperature ranges.** *Resolved round 1 as non-blocking.* All three
candidate ranges exceed the H2C baseline, so the conflict cannot change the exclusion.

**C00058 — PET hardness labelled Rockwell but reported as Shore D.** *Resolved round 2.* You supplied
the FormFutura High Precision PET TDS directly (it is an image-only PDF with no extractable text
layer, so it needed a visual read rather than automated extraction — confirmed by SHA256 to be the
exact document already cited in the workbook as `S-PET-TDS`). The document **itself** mislabels the
row: the row heading reads "Rockwell hardness" but the value cell reads "75,3 Shore D". This is a
genuine defect in the manufacturer's own document, not a transcription error. Value now recorded —
**Shore D 75.3** — as a new measurement row (`V001807`); no test method is stated for this specific
row in the source. All other PET (M066) properties already in the workbook were checked against this
same document and matched exactly; no other issues found on that sheet.

### 4.2 Partially resolved (6) — unchanged by round 2

**C00061–C00064 — ASA / PC / PA12 / PC-ABS fatigue study.** *Defect confirmed by arithmetic in round 1.*
Recomputing the paper's stated percentages against its own stated ultimate strengths shows they don't
match for ASA, PC or PC-ABS (only PA12 is internally consistent). Your existing conservative handling
is vindicated: retain measured stress and cycle observations only, reject the percentage-derived
limits and any "infinite life" language.

**C00056 — PEI 9085 CTE, `pm/(m·°C)`.** *Unit reading supported, not applied.* "pm" is almost
certainly a corrupted "µm" (corroborated against the Stratasys ULTEM 9085 datasheet, 31–52 µm/[m·°C]
for the same resin), but the 629.9 cross-flow ZX outlier remains unreconciled, so no CTE is
normalised. Low priority — PEI is outside the H2C envelope.

**C00057 — PEEK thermal conductivity, `0.29` with the W missing.** *Plausible, not applied.*
0.29 W/(m·K) is within the published range for unfilled PEEK, but that's literature corroboration,
not the source itself, so no value is normalised. Low priority — PEEK is outside the envelope.

### 4.3 Still open (1)

**C00003 — PLA-GF glass vs carbon fibre.** The iSANMATE source remains inaccessible (robots-disallowed
to automated fetch), and none of the four documents you supplied in round 2 relate to this product.
*Action: locate the iSANMATE PLA-GF TDS itself, or request a composition declaration from iSANMATE,
or settle it by ash/TGA on purchased filament.* This is the P1 item from §1.1.

---

## 5. Quarantined measurements — what was repaired and what remains

### 5.1 Repaired round 1 (9) — back in numeric summaries

| ID | Material | Was | Now |
|---|---|---|---|
| V000375 | PLA-GF | `4.92±0.5 MPa` | 4.92 ± 0.5 kJ/m², XY, annealed (Polymaker source unit typo) |
| V000376 | PLA-GF | `4.37±0.27 MPa` | 4.37 ± 0.27 kJ/m², Z, annealed |
| V000730 | PC-CF | `920`, unit unresolved | 90.2 MPa (kg/cm² unit recovered) |
| V000731 | PC-CF | `24`, unit unresolved | 2.354 GPa (European decimal separator, kg/cm²) |
| V000543 | PETG-ESD | `108`, no scale | Rockwell R 108 |
| V000847 | PEBA | `43`, no scale | Shore D 43 |
| V000848 | PEBA | `92`, no scale | Shore A 92 |
| V001487 | HIPS | `55`, no scale | Rockwell R 55 |
| V001529 | PCTG | `2 kJ/M` | 8 kJ/m² (column-split error) |

### 5.2 Repaired round 2 (4) — from the PDFs you supplied, SHA256-confirmed identical to the sources already on file

| ID | Material | Was | Now | Basis |
|---|---|---|---|---|
| V000765 | TPU (iSANMATE) | HDT row held the test load `0.455 MPa` | **74 °C** at 0.455 MPa load (ASTM D648) | Re-read `TPU_TDS.pdf` |
| V000766 | TPU (iSANMATE) | HDT row held the test load `1.82 MPa` | **49 °C** at 1.82 MPa load (ASTM D648) | Re-read `TPU_TDS.pdf` |
| V000595 | ABS-CF (iSANMATE) | Elongation `527`, unit `ISO` | **3 %** (ISO 527) | Re-read `CF-ABS_TDS.pdf` — "527" was the standard number, not the value |
| V000419 | PETG (iSANMATE) | Unnotched Izod `50 %` | **Qualitative "No Break"** (23 °C, 50 % RH, ISO 180) | Re-read `PETG_TDS.pdf` — "50" was the RH test condition, not a value. Genuine non-numeric result: the specimen didn't fracture. Nothing to normalise. |

Plus one new row added: **V001807 — PET (M066), Hardness — Shore D 75.3** (§4.1, `S-PET-TDS`).

### 5.3 Narrowed but still open (1)

| ID | Material | Status | Detail |
|---|---|---|---|
| V000420 | PETG (iSANMATE) | Partially resolved | Re-read of `PETG_TDS.pdf` confirms this is a **Shore-family** hardness per ASTM D2240 (rules out Rockwell), value 70 — but the source row itself just says "Shore Hardness ... 70" without stating A or D. Shore A 70 and Shore D 70 are very different hardnesses for a rigid material like PETG, so the scale can't be assumed. **This is now the only remaining hardness-scale ambiguity in the workbook.** Needs a manufacturer reply to close. |

### 5.4 Still quarantined (1) — genuine source defect, not a transcription error

| ID | Material | Problem | Status |
|---|---|---|---|
| V001540 | PCTG (Spectrum) | Notched Izod prints `93 °C KJ/m2` | Verified verbatim in the current Spectrum TDS in round 1 — a real defect in the source. 93 kJ/m² is not credible for a notched PCTG specimen (typical 5–10). Manufacturer clarification required; do not infer a value. |

---

## 6. Structural gaps that no amount of document recovery will close

Unchanged by either round — these are absent for essentially every entry because manufacturers
don't publish them:

| Property | Entries missing |
|---|---|
| Thermal conductivity | 102 / 102 |
| Fracture toughness | 102 / 102 |
| Fatigue life | 102 / 102 |
| Creep compliance | 102 / 102 |
| Coefficient of friction | 102 / 102 |
| Compression strength | 101 / 102 |
| Coefficient of thermal expansion | 101 / 102 |

The argument for the staged approach stands: screen by application first, cut to 10–20 candidates,
then commission testing only on the survivors.

---

## 7. Recommended order of work (updated)

1. ~~Open the five iSANMATE PDFs and the FormFutura PDF by hand~~ — **done, round 2.** Recovered 4
   measurements, added 1 new one, closed 1 conflict, narrowed 1 more to a single open question
   (Shore A vs D on PETG hardness).
2. **Locate or request the iSANMATE PLA-GF technical document specifically** (not the four already
   supplied — they're a different products) to close the last open conflict, C00003.
3. **Write to the four nylon manufacturers** (PA66, PA66-CF, PA612, PA612-GF) — long lead time,
   start early.
4. **Chase PETG-GF and PC-GF** grade documentation — the two printable families with neither
   mechanical nor print-setup evidence.
5. **Run the H2C print-validation campaign** on the surviving candidates. Record lot, moisture
   history, drying, firmware, slicer version, nozzle route/material/diameter, plate and adhesive;
   measure after printing and again at 24–72 h.
6. **Commission laboratory testing** on the 10–20 survivors only.
7. **Canadian prices**, starting with the five Bambu storefront items in §P5.

For every manufacturer reply, save the original email as a new `Sources` row with date, responder,
product identifier and the exact question answered.

---

## 8. Provenance

**Round 1** added 4 corroborating sources: `R-POLYMAKER-WIKI-HTPLAGF`, `R-STRATASYS-ULTEM9085`,
`R-H2C-SPECS`, `R-MDPI-FATIGUE`.

**Round 2** used four files you supplied directly in the connected Research folder:
`PETG_TDS.pdf`, `CF-ABS_TDS.pdf`, `TPU_TDS.pdf` (all iSANMATE), and
`formfutura-tds-highprecisionpet.pdf`. Each was hashed (SHA256) and confirmed byte-identical to the
source already cited in the workbook (`I-PETG-TDS`, `I-CF-ABS-TDS`, `I-TPU-TDS`, `S-PET-TDS`
respectively) — so these are the same documents the original research used, and the fixes are
genuine re-reads correcting parsing errors, not new evidence from a different revision. The
`formfutura` file has no extractable text layer and was read visually. The `Sources` sheet's Access
status field was updated on all four rows to record the re-verification.

All cell changes in both rounds were diffed against the pre-audit backup and confirmed intentional;
formulas were recalculated (LibreOffice headless) after each round so cached values are current.
