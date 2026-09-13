# Systematic database and HTML data audit

**Date:** 2026-09-13  
**Baseline:** `b616ec1` (clean working tree at start)  
**Disposition:** 11 confirmed defect/control-gap groups corrected locally; evidence limitations remain explicit. No deployment performed.

## Outcome and scope

This review followed the actual source path: the two workbooks → extraction → normalization → compilation → validation → the compressed data embedded in the standalone HTML. The existing test tools were retained and extended, rather than replaced with an independent competing definition of the database.

Every one of the **102 filaments, 19 display families, 144 grade records, 1,966 property records, 167 profiles, 478 use/durability records, 104 price observations, 235 sources and 1,146 coverage records** was included in the record inventory and applicable relational checks. All **1,806 numeric property observations** reconcile against their recorded raw values and unit conversions after correction. The other property records are 155 unpublished, three qualitative and two quarantined; these are not converted to numbers.

**This is exhaustive internal consistency checking of the current snapshot, with targeted source re-reading—not independent re-transcription of all 235 external sources.** Five PDFs were downloaded and their checksums matched the source register; additional web checks are individually labelled in [source-review.json](source-review.json). The 114 generic reference entries were freshly compiled, checked for ordered numeric intervals, and verified against the HTML payload; their underlying values remain uncited context, never filament evidence.

The workbook changed in **27 logged edits to 25 distinct cells across three sheet XML parts**. Cell styles, formulas and every other ZIP part are unchanged. Compiled changes affect 44 material summaries, five measurements, one retired grade, three profiles and one evidence categorization. The measured headline count remains 369. The largest change is removal of unsupported peer estimates: 105 became three contextual spans, none of which decides eligibility.

## How to trace a finding

- [MATRIX.md](MATRIX.md): one row for every filament and every family, with grade IDs, counts and limitations.
- [record-index.csv](record-index.csv): every source-workbook record, sheet, row, material/grade ID, source ID, locator and URL where available.
- [audit.json](audit.json): complete material/grade/source relationships, raw-value reconciliation results, warnings and payload checks.
- [changelog.csv](changelog.csv): the 27 workbook cell edits, before and after.
- [compiled-changes.json](compiled-changes.json): before/after compiled fields, including all removed peer mappings.
- [source-review.json](source-review.json): the exact sources re-read, checksums, checked passages and access limitations.
- [workbook-verification.json](workbook-verification.json): independent ZIP/cell preservation checks.
- [bambu-guide-crosscheck.json](bambu-guide-crosscheck.json): 39 flexural/HDT numerical comparisons across 13 named Bambu filaments.

An ID in the findings below resolves to its workbook row through `record-index.csv`; a measurement or profile then resolves to its grade and source in `audit.json`. Archived records remain visible in the source workbook and audit data but are excluded from active use where stated.

## Findings register

| ID | Priority | Finding | Affected records | Disposition / permanent check |
|---|---|---|---|---|
| SD-01 | High | Decimal commas were truncated | V000539, V000894, V000920, V001349 | Corrected; raw-to-normalized reconciliation stops the build |
| SD-02 | High | Strain at maximum force was called strain at break | V000894, V000920; M047 PA and M049 PA6 | Corrected property and conditions; endpoint mutation test |
| SD-03 | Medium | A qualitative result had numeric status | V000419; M020 PETG | Explicit qualitative status; numeric-status invariant |
| SD-04 | High | Temperature tolerances were parsed as isolated numbers | P0108, P0117; M086 OBC, M093 PVB | Corrected parser; both tolerance endpoints tested |
| SD-05 | Medium | Limonene support guidance was mapped to water | Q00307; M081 HIPS | Organic-solvent category and d-Limonene agent; mapping regression |
| SD-06 | High | A superseded CPE-to-CoPE mapping stayed active | G091-01, P0115, M091 GradeIDs | Explicit retirement; active lists, UI and counts exclude it |
| SD-07 | High | Peer pools transferred properties across polymers/fillers and acted as bounds | 105 pre-audit spans; full list in compiled changes | 102 spans removed; remaining three preserve intervals and never decide eligibility |
| SD-08 | High | Unstated HDT load could still produce a load-specific FAIL | 25 headline HDT observations | Both apparent pass and fail remain indeterminate; regression test |
| SD-09 | High, preventive | Headline matching could accept a coincident value of the wrong property/unit | Compiler and validator | Property, unit, value, direction and owner checked; corruption tests |
| SD-10 | Medium | Open interval boundaries were evaluated incorrectly at equality | Generic comparison routine | Correct strict/inclusive endpoint algebra; eight boundary cases |
| SD-11 | High, preventive | Tests could use stale dist data; no embedded-payload audit command | Test entry point and build artifacts | Fresh rebuild before tests; reusable source-to-HTML parity audit |

### SD-01 — Four numerical transcription corrections

| Measurement | Material / grade | Recorded raw text | Before | Corrected |
|---|---|---|---:|---:|
| V000539 | PETG-ESD / G026-03 | 4,30% | 4% | 4.3% |
| V000894 | PA / G047-03 | 4,40% | 4% | 4.4% |
| V000920 | PA6 / G049-01 | 4,40% | 4% | 4.4% |
| V001349 | PPS / G072-02 | 1,3 kJ/m2 | 1 kJ/m² | 1.3 kJ/m² |

The [Spectrum PETG ESD TDS](https://spectrumfilaments.com/wp-content/uploads/2025/11/en_tds_spectrum_petg_esd.pdf), [PA6 Neat BK TDS](https://spectrumfilaments.com/wp-content/uploads/2022/05/en_tds_spectrum_pa6_neat_bk.pdf) and [PPS AM230 TDS](https://spectrumfilaments.com/wp-content/uploads/2022/10/en_tds_spectrum_pps_am230.pdf) confirm the values on page 1. All three downloaded checksums match Sources. No measured headline changes were needed; these observations were not the affected materials' selected numerical headlines.

The new raw check distinguishes decimal commas from grouped integers such as fatigue cycles `123,460`. It also checks MPa→GPa, density units and the existing kg/cm² conversions. It also checks Raw numeric × the native, unrounded conversion factor against each cached normalized result. The four corrections change Raw numeric and refresh the existing formula caches; they do not replace formulas with constants. It never rewrites data during a build.

### SD-02 — Maximum-force strain is a different endpoint

Both PA6 Neat BK observations say “Elongation at max. force” in their source locators. Their property was incorrectly `Elongation at break`. They now use the existing vocabulary `Tensile strain at strength`, preserving the dry condition, 50 mm/min locator and 23°C table heading. They no longer appear as related evidence in the break-elongation column. The duplicate observations under generic PA and PA6 remain intentional aliases of the same formulation, not independent tests.

### SD-03 — No Break is not missing data

The [iSANMATE PETG TDS](https://www.isanmate.com/wp-content/uploads/2025/08/PETG_TDS.pdf), page 2, reports a qualitative unnotched Izod result under ISO 180 at 23°C / 50% RH. V000419 already retained this correct raw outcome after an earlier audit, but its status still compiled to neither numeric nor qualitative evidence. `Published qualitative result` fixes that omission without inventing an impact number. The downloaded PDF checksum matches the recorded source.

### SD-04 — Correct process windows

| Profile / axis | Source text | Before compiled range | After |
|---|---|---|---|
| P0108 nozzle | 180 ±20°C | 180–180°C | 160–200°C |
| P0117 nozzle | 215 ±10°C | 215–215°C | 205–225°C |
| P0117 bed | 75 ±5°C | 5–75°C | 70–80°C |

The source strings were correct. Only their interpretation was wrong. The [Prusament PVB TDS](https://prusament.com/wp-content/uploads/2022/10/PVB_Prusament_TDS_2021_10_EN.pdf), page 1, confirms both PVB tolerances. Dow's manufacturer-authored EVOLV3D OBC TDS, available through [MatterHackers](https://www.matterhackers.com/r/40oXzl), corroborates the OBC setting; this audit does not claim a checksum match for that mirror. The corrected ranges remain within the H2C temperature envelope.

### SD-05 — Solvent identity survives categorization

[Prusa's HIPS guidance](https://help.prusa3d.com/article/hips_167118) describes removal with d-limonene and warns about effects on other polymers. `Limonene support` now maps to `organic-solvent` with a specific agent. The record stays narrative and family-level; it does not become a measured resistance verdict. Its inclusion in environmental coverage remains valid because both solvent and solubility topics belong in that coverage domain.

### SD-06 — Retirement must change behavior

The previous audit correctly described G091-01 as a duplicate of Fillamentum CPE HG100, but prose in `Selected-grade rationale` did not deactivate it. It still contributed an active grade and P0115 still contributed a profile under CoPE.

The workbook now marks its availability `Retired mapping; audit trail only` and removes it from M091's active GradeIDs. Compilation flags the grade and dependent profile as retired. They remain archival records, but the material's active grade list, profile summary/gates, drawer and procurement count use only actual CoPE data. The active CoPE identity is G091-02, Panchroma CoPE. No remaining measurement or price uses G091-01.

### SD-07 — Display families are not interchangeable polymers

The prior fallback tiers pooled whole display families and, eventually, all materials of a broad filler class. OBC illustrates the error: its missing XY elongation was assigned a 1.5–13% span from PP, PP-CF and PP-GF, while its own recorded >700% break result has unstated direction. The latter must not become an XY headline, but the former is not a defensible bound on OBC either.

The same risk applies to Nylon / Polyamide, High-Performance Engineering, Copolyesters and Flexible Elastomers. Their names organize navigation; they do not establish equal compositions or test conditions. The new peer key requires the same family, base polymer, exact modifier category and role; blends additionally retain their normalized identity. Unknown commercial modifiers are not renamed unreinforced. HDT peers need an explicitly stated 0.45 MPa load, and finite interval endpoints are preserved.

Most importantly, the observed extrema of even a correctly grouped sample do not bound an unmeasured formulation. All peer-derived criteria therefore remain UNKNOWN, whether the sample seems to pass or fail. Strict holds the missing material out; Explore keeps it flagged. This supersedes the earlier intentional “estimate may exclude” rule and is documented as D40.

Only three peer spans remain: PLA Lite tensile modulus, PLA Silk elongation, and PLA Silk HDT. They are context, not replacements for missing measurements. The complete removed-peer lists and new intervals are in `compiled-changes.json`.

### SD-08 to SD-11 — Strengthen the evidence path

An HDT result with unknown load cannot establish a failure at 0.45 MPa any more than a pass. The engine now reports INDETERMINATE in either case. No load was inferred from a separate guide.

Headline verification no longer relies on numeric equality alone. A tensile-strength field cannot match a flexural value or a different unit simply because the number coincides. Missing citations also produce diagnostic errors instead of crashing validation. Existing good headlines still reconcile.

Open measurement bounds now obey the expected comparisons: a value strictly greater than 650 satisfies both `>650` and `>=650`; a value strictly below 0.8 fails both `>=0.8` and `>0.8`. Eight endpoint cases cover the symmetric behaviors.

Finally, `npm test` rebuilds even when `dist/db.json` exists. `npm run audit:data` independently regenerates the data, decodes the HTML payload, and compares both filament and reference databases. A stale JSON file can no longer make the standard test command pass without checking changed inputs. The Pages workflow now runs the data audit after the tests, before site assembly.

## Bambu references supplied during the audit

The [filament wiki index](https://wiki.bambulab.com/en/filament-acc) was retrieved. It separates usage guides, drying, compatibility and model-specific instructions; that supports keeping these domains distinct rather than treating a family label as printer/AMS approval.

The supplied [interactive guide](https://bambulab.com/en-us/filament/guide) returned HTTP 403 to a direct fetch (the web reader returned 402). Separately, the [guide PDF already registered as R-BAMBU-GUIDE-202609](https://cdn1.bambulab.com/filament/filament-guide/wksdyyzd8n9/filament-guide-en.pdf) downloaded successfully and matched its recorded SHA256. This is verification of that edition, not a claim that it is the current interactive page's revision.

All 39 checked flexural-strength, flexural-modulus and HDT values across 13 specifically named Bambu materials numerically agree with their representative-grade observations. See `bambu-guide-crosscheck.json`. Generic “PLA” was not silently mapped to every PLA variant, and the guide's bending properties were not substituted for tensile properties. Numeric agreement alone does not reconcile differing preparation, moisture conditions or an unstated TDS test load.

## Existing tools: adequacy and consolidation

| Existing tool | Assessment | Action |
|---|---|---|
| Extractor and compiler | Suitable source-of-truth path; headline type matching incomplete | Reused; strengthened matching and retirement |
| Validator and coverage rules | Strong ownership/coverage checks; insufficient raw numerical semantics | Reused; added measurement-rules.js and peer-group checks |
| 103 existing tests | Valuable but did not detect the confirmed defects | Retained; old expectations updated for corrected policy/retirement, nine focused tests added |
| ensure-db.mjs | Only built when data absent | Always builds current inputs |
| workbook_xml.py | Appropriate for exact cell edits with styles/formulas preserved | Reused; independent ZIP and cell verification |
| Historical audit scripts | Good immutable records, not a repeatable whole-data audit entry point | Preserved; added one reusable audit-data.mjs orchestrator |

## Remaining limitations and follow-up priority

1. **Source truth beyond targeted re-reading:** all records were structurally and numerically checked, but not every external claim was re-read. Thirteen source-register entries lack a recorded SHA256, including two explicitly unretrieved sources. The audit lists them; absence of a hash is not proof their data is wrong. A follow-up source-refresh pass should start with active records referencing these entries and newly changed vendor documents.
2. **Grade aggregation:** 32 materials contain multiple active procurement grades. Their temperature summaries and prices may describe a different grade from the mechanical headline; the existing application is a material screen, not a selected-grade qualification engine. Check the cited grade/profile before procurement. Printing headers now expose GradeID; environment rows expose EvidenceID, GradeID and the source locator. No current all-axis within verdict was found that required combining different profiles to manufacture a complete within profile, but per-axis aggregation remains a design limitation.
3. **Measurement conditions and missing information:** five materials have no property observations; 25 headline HDTs have unstated loads; nine numeric impact values use J/m and remain incomparable to kJ/m². Many directions, specimen forms and chemical exposure conditions are unpublished. These remain visible rather than being inferred or deleted. Retained aliases and shared source/formulation keys do not represent independent corroboration.
4. **Scope and qualification:** the 102-entry canonical list is not a promise to include every current catalog variant. The 114 generic reference materials are uncited scale references. No physical printing, current price/stock refresh, complete browser/mobile audit or external-source archive recreation was performed. Internal consistency and source agreement are not certified design allowables.

## Verification and reproduction

Baseline build: zero errors, four standing warnings, 103/103 tests. Corrected build: zero errors, four explicit evidence warnings, **112/112 tests**. Raw numerical reconciliation: **1,806/1,806**. All 102 materials and 19 families are listed in MATRIX.md. Fresh compiled data equals dist JSON; decoded HTML data equals that JSON for both payloads. No external script or stylesheet URL is present; this static check is not a network-trace test.

```sh
npm test
npm run audit:data
# Archive a named review instead of using build/reports/data-audit:
npm run audit:data -- docs/audits/2026-09-13-systematic-data
```

`apply-workbook-changes.py` is a one-time, input-hash-guarded migration. Do not re-run it on the corrected workbook. The optional third argument to `scripts/audit-data.mjs` is a prior compiled JSON for field-level changes; the captured before/after changes are already saved evidence in this audit folder.

Input workbook SHA256: `9267c9a3b6197ab9a374f6e2b052b810bf3f352e5e5dd23faf502af58078363f`  
Corrected workbook SHA256: `e8532eda180f008afa2960c78cf0b5b2eb911afe2d95a1f8ed388ebcf4cd1175`
