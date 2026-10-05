# Data and engineering review for H2C v2.1

> **Historical record** (2026-09-27): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

Review date: 2026-09-27 local time. Reviewer: an independent AI review lane, not a human materials certification. Original repository was not modified. Code, tables, and generated database were inspected in the external review copy. This document is implementation input, not authorization to import data or change an owner decision.

## Overall judgment

The repository is much better at preserving and explaining evidence than a typical filament comparison catalogue. It has a clear, appropriate ambition: a small team's defensible shortlist for one printer, followed by an exact product and a real print. Its strongest decisions should survive v2.1: immutable record identity, source hashes and locators, raw text beside typed conditions, explicit missing states, separate material and product entities, unconverted impact tests, estimates that never become a measured PASS, and a cheap record tier separate from decision values.

The central weakness is that the engine's proof is narrower than the goal's promise. Product-level mechanical values and recipes exist, but some decisive criteria still read an entire material's records, most application templates do not require printer compatibility, and a product's property set can combine different treatment states. Consequently a source can be transcribed correctly and the final PASS still fail to describe one purchaseable product in one realizable state. More documents will not solve that. v2.1 should first make the object being judged explicit: **this product, this print/treatment route, this expected service state, this evidence policy, and this scenario**.

Broad catalogue coverage is already sufficient to work on this problem. The remaining bottleneck is decision coverage and usability of evidence, rather than total rows. Several missing directions/loads need a manufacturer or a team test; repeatedly searching the same silent sheets is unlikely to close them. Engineering validation of selection meaning should take priority over another broad import wave.

## Evidence and limits

Read `docs/GOALS.md` first, then `docs/OPEN-PROBLEMS.md`, and checked D38, D83, D84, D88-D95 in `docs/DECISIONS.md`. Counts below were regenerated from the copied `dist/db.json` using the actual engine. This lane did not run a new full build; the parent review owns build/verification freshness and repository-integrity checks.

Two deterministic probes are retained outside the repo:

- `evidence/data-engineering/product-scope-probe.mjs` and `product-scope-results.json`: real-database environment, sourcing, and evidence scope.
- `evidence/data-engineering/coverage-probe.mjs` and `coverage-results.json`: active in-scope product coverage, selected treatment state, and template PASS products' print gates.

Re-run them with `node /private/tmp/h2c-v2.1-review-2026-09-27/evidence/data-engineering/<probe>.mjs`. They read the external repo copy and write results only in the evidence directory.

The denominator for product decision coverage is **1,077 active procurement products listed in the 136 in-scope, non-family materials' `gradeIds`**. The global catalogue contains 1,128 active procurement products; excluded materials are part of that larger population. Seven nonretired study/reference grades attached to in-scope materials are deliberately excluded from the 1,077. Four in-scope material names have no procurement product. Do not mix these denominators.

Four cached sources were hash-checked against `sources.csv`, relevant complete pages rendered, and rows/footnotes read visually: Spectrum PLA Matt; Fiberon PET-GF15; Spectrum PETG ESD; PolyMax PETG-ESD. `source-reread-manifest.json` holds digests, URLs, paths, and purpose. Rendered pages and layout text sit beside it. This was a targeted sample to verify the reported examples. It is **not a random audit, an error-rate estimate, or certification of 11,211 measurements**. The sample confirmed the key decision numbers and revealed two misassigned condition cells described in D07.

Three primary references were checked live for engineering interpretation: [ASTM D648-18 public abstract](https://store.astm.org/d0648-18.html), [ASTM E2092-23 public abstract](https://store.astm.org/e2092-23.html), and [Polymaker's moisture-conditioning explanation](https://wiki.polymaker.com/printing-tips/post-processing/moisture-conditioning). No new source was imported into the repo.

## Decision coverage, rather than volume

All product counts below use 1,077 as denominator. `Comparable` here is the repository's D84 policy, not a claim of identical specimen preparation, laboratory, or design allowable.

| Selected headline | Products with a default-comparable value | Additional products with only an as-published selected value |
|---|---:|---:|
| Density | 884 (82.1%) | 0 |
| Tensile modulus XY | 281 (26.1%) | 269 |
| Tensile strength XY | 366 (34.0%) | 372 |
| Tensile strength Z | 149 (13.8%) | 0 |
| Elongation at break XY | 345 (32.0%) | 333 |
| Notched Charpy | 77 (7.1%) | 114 |
| Notched Izod | 45 (4.2%) | 68 |
| HDT at nominal low load | 412 (38.3%) | 77 |
| Glass transition | 305 (28.3%) | 0 |

Those 2,864 default-comparable selected cells still include 1,472 with specimen form unstated and 2,611 with moisture state unstated; 796 of the unstated specimen cells are density. Missing conditions are not automatically wrong values. D84 intentionally permits many of them for screening. The consequence is that the word *comparable* needs visible dimensions and a scenario-specific meaning, rather than functioning as one broad assurance.

Examples of state uncertainty: 243 of the 281 comparable modulus cells have unstated moisture; 222 have unstated post-processing. For HDT, 222 of 412 have unstated specimen form. Among the 412 comparable HDTs, 297 cite ISO 75, 67 ASTM D648, 15 GB/T 1634, 13 ASTM E2092, and 20 no standard. Those are a useful approximate screening pool, but not an identical-method population.

The six supplied templates yield the following strict material verdicts. Their adequacy is discussed in D02; these are the present engine's results, not an independent recommendation:

| Template | Material PASS / FAIL / UNKNOWN | Product PASS | PASS products with a known non-within print axis | PASS products with an unknown print axis and no known non-within axis |
|---|---:|---:|---:|---:|
| Outdoor structural part | 18 / 83 / 35 | 39 | 10 | 6 |
| Indoor prototype | 15 / 21 / 100 | 20 | 0 | 1 |
| Lightweight structure | 29 / 80 / 27 | 67 | 7 | 15 |
| Warm environment | 34 / 39 / 63 | 123 | 2 | 0 |
| High-stiffness fixture | 19 / 74 / 43 | 31 | 11 | 8 |
| Flexible component | 16 / 75 / 45 | 36 | 0 | 19 |

`Known non-within` includes `exceeds`, `partial`, and `exceeds-recommended`; it does **not** mean all are conclusively unprintable. A partial recommended window is unresolved. These counts intentionally differ from a pure `exceeds` count. They show that the existing PASS does not necessarily prove compatibility.

## Findings ordered by their effect on decisions

### D01 - A product can inherit another product's environmental proof, offer, or exact-grade evidence

**Severity:** P1, decision correctness. **Classification:** new reproduced consequence of the D83 product transition, rooted in a known D38 material-level policy; amend the policy explicitly rather than treating it as a typographical bug. **Steps/scorecard:** Screen, Drill down, Practicalities; C3, C6, C8.

`productView()` replaces numeric headlines and process gates, then spreads the original material object (`app/js/engine/products.js:96-103`). Environment evaluation filters `evidenceByMaterial` only by category (`constraints.js:334`), buyable reads `material.buy` (`constraints.js:245-263`), and exactGrade checks any numeric measurement in `measurementsByMaterial` (`constraints.js:399-404`). The records already carry grade IDs, but those criteria do not use the selected grade.

The real database produces 995 positive product/category results across 702 products and 35 materials without the product's own positive record: 669 water-solubility, 145 acid, 136 alkali, 39 oil/grease, and 6 organic solvent. This count identifies transferred proof, not 995 physically incorrect material claims. Some same-sheet twins may be transferable with an explicit declaration; ordinary sibling products are not.

A concrete example is **3DXTECH 3DXSTAT ESD PETG (G026-01)**. Its acid PASS cites **Q00107**, an observation on **Polymaker PolyMax PETG-ESD (G026-02)**. `data/tables/grades.csv:30-31` gives different source/formulation keys; `evidence.csv:108` correctly assigns Q00107 to G026-02. Re-reading Polymaker's hash-checked page 2 confirmed the maker and weak-acid rating. The source is correct; the verdict's scope is not. Likewise ECOMAX PLA's water-insolubility PASS cites five Bambu PLA products.

685 products across 32 materials receive in-stock-Canada PASS without an own in-stock sampled offer. ECOMAX PLA (G001-01) returns Bambu Lab Canada's C$25.99 offer although it has no sampled offer of its own. Another 72 products receive exactGrade PASS without an own numeric measurement; assess declared twins separately before determining how many need UNKNOWN.

Conflict screening has the reverse problem. C01409 describes an iSANMATE PLA-GF identity conflict, but `noConflicts` reads material-level coverage and can reject Polymaker/eSUN/Nobufil PLA-GF too. `coverage.csv` has no typed GradeID or MeasurementID scope, so prose names the affected product while the engine cannot.

**Recommendation:** Build a product evaluation context with explicitly scoped measurements, evidence, offers, and findings. An exact product fact may decide only for that product, a declared shared formulation where the source explicitly applies, or a separately labelled family/polymer inference that never supplies a positive proof. Material summaries should aggregate product results. Keep a family observation for context without making it proof for every grade. Add typed scope to coverage findings before enforcing product-level conflicts. Update D38 and the explanation of D83 in the same behavior change.

**Acceptance:** G026-01 acid becomes UNKNOWN absent its own/declaratively shared evidence; G026-02 remains evaluated from its own weak/strong ratings. ECOMAX PLA buyable is UNKNOWN; the recorded Bambu product uses the Bambu offer. One grade's conflict does not reject unimplicated siblings. A declared twin can share only the fact kinds expressly permitted; prices never share. Add two-product fixtures with conflicting evidence, one offer, and one material-context record; changing a sibling must not alter an unrelated product's proof.

**Dependencies:** explicit fact scope and product identity; D05 exposure semantics. Parent architecture work should own one implementation rather than several patches to these three functions.

### D02 - Printer compatibility is not consistently part of the default application verdict

**Severity:** P1. **Classification:** new reproduced contract gap; templates deliberately test only their written criteria, but this falls short of `GOALS.md:24` saying a product must meet its H2C print requirements. **Steps/scorecard:** Screen, Practicalities; C6, C9.

In `app/js/ui/templates.js`, only Warm environment includes any temperature gate, and it includes nozzle/chamber but no bed. Outdoor, Lightweight, High-stiffness, Indoor, and Flexible omit all three. The coverage probe above therefore finds passing products with exceeded or unresolved print axes. The parent's pure-exceedance probe can further separate failures from partial windows.

**Recommendation:** Establish a single H2C manufacturing baseline, enforced before application requirements, with nozzle, bed, chamber and equipment capability. Keep compatibility result separate from property adequacy so a useful material with missing recipes can be explored honestly. A requirement such as “high modulus” should not become an H2C-compatible recommendation by omitting a gate. Guide fallback may remain, but its origin should remain visible and it must not be counted as a maker-specific validated recipe. D88-D93 are sensible scoped fallbacks; their distinction from actual H2C testing matters.

**Acceptance:** Every template has the same baseline, and each PASS product has every mandatory baseline axis PASS. Unknown recipe is UNKNOWN, not measured failure. A material may still appear in Explore via an unresolved product. Warm environment catches an unreachable bed. Test this with one small independent fixture plus the saved real-database scenarios, then report material and product decision diffs. Do not silently tighten data interpretations while adding the baseline.

**Dependencies:** owner-approved alignment of templates with the goal; product-state work D03; engine roll-up work in parent review.

### D03 - The evidence must describe one consistent printed/treatment state

**Severity:** P1. **Classification:** known policy permits annealed-only values; newly reproduced decision/label inconsistency across properties. **Steps/scorecard:** Screen, Drill down, Confirm; C3, C4, C6, C9.

`build/src/products.js:140-150` chooses one measurement independently per property. Annealed candidates are excluded only when an as-printed measurement of the same property exists; otherwise they are allowed and carry `anneal` (`:123-131`). `app/js/engine/products.js:39` preserves it. `constraints.js:156-185` neither checks treatment capability nor mentions the schedule in its reason.

55 active in-scope products have at least one selected annealed value. Nine have a selected annealed engineering property alongside a non-density/non-Tg property with a different processing state; an unstated state is not proven incompatible, but cannot establish equivalence. **Fiberon PET-GF15 (G068-02)** is conclusive: selected modulus 4.1442 GPa is annealed at 120°C for 16 h (`measurements.csv:1935`), selected HDT 81.6°C is explicitly as printed (`:1932`). The engine passes modulus >=4 and HDT >=80 together. The source also publishes annealed HDT 133.7°C; it is not the chosen HDT because the as-printed value wins. This currently describes a synthetic set rather than proving one state meets both limits.

**Spectrum PLA Matt (G001-06)** receives `hdt045 >=100` PASS with reason “Published 116 °C”, though its only qualifying number requires annealing at 90°C for 4 h (`measurements.csv:2781`). Hash-checked visual rereads confirmed both examples. Nothing here alleges wrong numerical transcription.

**Recommendation:** Introduce a small product-state identity: as printed or a named anneal schedule, plus moisture condition and print-route linkage when known. Pick decision values within that state. Users should be able to choose as printed, annealing available, or unspecified exploration. An unknown annealing schedule cannot be presented as an executable treatment. A state transition should show dimensional/process implications without inventing a universal shrinkage correction. Support unknown state explicitly; do not infer one from a nearby number.

**Acceptance:** As-printed PET-GF15 has HDT81.6 but no unverified as-printed mechanical modulus; its annealed120°C16h state uses the matching133.7 HDT and annealed mechanics. With annealing unavailable, PLA Matt's116 cannot produce an unconditional heat PASS. With annealing permitted, every decision/export reason names required treatment and its source. Two properties under different anneal schedules cannot be joined unless a reviewed relationship says they are equivalent. Measurement IDs and raw records remain intact.

**Dependencies:** product evaluation contract, scenario schema, treatment UI. Do this before adding further advanced state filters.

### D04 - Comparable means a screening policy, not identical tests or expected service condition

**Severity:** P1 for misleading decision semantics, P2 for the additional controls. **Classification:** declared D84 tradeoff, with quantified limits and a newly identified cross-method overstatement. **Steps/scorecard:** Translate, Screen, Understand; C1, C3, C4.

The default D84 rule accepts printed or unstated specimen form, dry or unstated moisture, and the specified direction/load. It deliberately excludes conditioned values (`build/src/products.js:62`). That is a defensible dry-coupon screen, but most real fixtures/drone arms/weathered parts are not maintained in that coupon state. 149 numeric measurements in the full catalogue are explicitly conditioned and excluded from default headlines. Their existence matters to nylon selection. Polymaker explains that final prints absorb moisture, reducing rigidity/strength while increasing impact resistance and elongation; drying filament before printing does not establish the finished part's service state. [Primary explanation](https://wiki.polymaker.com/printing-tips/post-processing/moisture-conditioning).

The HDT pool also calls ASTM D648's0.455MPa and ISO75B's0.45MPa “one test” (`build/src/products.js:42-44`). Equal nominal stress is insufficient to establish full test equivalence. ASTM's own abstract says D648/ISO75 differ and should not be compared as test results, and limits HDT's use for service/endurance prediction. E2092 is a smaller-specimen thermomechanical method with only limited demonstrated equivalence. [D648](https://store.astm.org/d0648-18.html), [E2092](https://store.astm.org/e2092-23.html). This does not require discarding approximate screening pools; it requires showing the approximation and allowing a named-method requirement to remain strict.

**Recommendation:** Replace one assurance flag with visible compatibility dimensions: form, orientation/raster, moisture, treatment, temperature, endpoint, method and load. Keep a convenient default *screening policy*; offer a stricter user policy where the scenario requires it. Distinguish dry-coupon adequacy, service-state evidence, and team-confirmed performance. Avoid creating general wet/dry or method conversion factors without paired evidence and back-tests. Present HDT as its test property rather than a continuous use temperature.

**Acceptance:** A requirement explicitly naming ISO75 cannot silently use D648/E2092; the default approximate screen can include them with a method caveat. A humid-service scenario can select published conditioned product values without estimating them into dry points. Missing service-state evidence is visible UNKNOWN. A drying recipe cannot satisfy service moisture compatibility. All comparisons and exports preserve policy/state; thresholds near differing methods are visibly provisional.

**Dependencies:** D03 state identities; scenario schema and evidence explanation. Amendment to D84, not weakening the missing-state rules.

### D05 - Environmental screening should answer the exposure the user actually means

**Severity:** P1. **Classification:** known category-level design limitation plus a new reproduced parser/aggregation consequence. **Steps/scorecard:** Translate, Screen, Drill down; C1, C3, C6.

An environment constraint currently contains a category and accepted verdicts but no agent, concentration, duration, temperature, or stress context. Evidence stores most exposure detail as a prose cell and the category roll-up ignores those conditions. A positive weak-acid claim can answer “acid” for the material even if a different exposure is relevant. The reason includes a helpful disclaimer, but a disclaimer does not make the question and evidence match.

In the hash-checked PolyMax PETG-ESD source, weak acids are rated Good, strong acids Fair-Poor. `build/src/normalize/chemical.js` maps Good to `resistant` but Fair-Poor to `narrative`; `constraints.js:348-364` returns PASS once a positive exists and silently ignores that limiting narrative. Q00107/Q00108 demonstrate it. Two short ratings in the corpus are unmapped this way (Fair; Fair-Poor); the concern is the rule, not just those two words. A new narrative wording should not quietly increase confidence.

**Recommendation:** For a broad category keep an evidence-presence screen, accurately named. For a positive suitability result require a matched exposure target or a scope-limited statement the user explicitly accepts. Put interpretation in typed fields beside the maker's exact wording, including ambiguous/limited state; do not proliferate ad hoc regular expressions for prose. Preserve polymer-level guidance as a useful negative/contextual hint, never product proof. Unknown concentration/duration remains unknown; no fill-in defaults.

**Acceptance:** Own-grade weak-acid Good can support a weak-acid evidence query; broad “resists acids” with strong-acid Fair-Poor cannot become unconditional PASS. A requested acetone exposure cannot pass on oils/grease or an unspecified solvent claim. An unmapped limiting statement makes a relevant decision unresolved rather than being discarded in a positive roll-up. The source wording and interpretation are both visible.

**Dependencies:** D01 product scope; exposure mapping and a small typed verdict field. Detailed chemical compatibility database expansion is not necessary for the first fix.

### D06 - Collect decision-complete shortlists before increasing catalogue breadth

**Severity:** P2, practical usefulness. **Classification:** known coverage gaps, quantified again; not a collection of newly discovered data defects. **Steps/scorecard:** Screen, Rank, Practicalities; C2-C9.

The catalogue spans 1,077 selectable products, but only 26.1% have a default-comparable modulus,13.8% a layer-strength value,7.1% a notched Charpy value, and 4.2% a notched Izod value. These percentages do not mean the other products are bad. They mean those scenarios often cannot reach a defendable exact product from recorded evidence. Four material-only placeholders (PA66, PA66-CF, PA612, PA612-GF) have no procurement grade; `OPEN-PROBLEMS.md:161-173` already says so. The implicit breadth of a material list therefore exceeds its procurement depth.

**Recommendation:** Define a small benchmark portfolio with the team: indoor prototype; humid structural part; stiff fixture; warm motor bracket; flexible seal/strap; exposed outdoor bracket. For each, select a few traceable H2C products to make decision-complete where makers publish the necessary evidence. Rank collection by how many requested answers a fact settles. Separate “source silent”, “condition unresolved”, “product identity unresolved”, “needs manufacturer”, and “needs team test”. Material-only research homes should be clearly nonprocurement exploration entries. Do not invent products to remove unknowns.

**Acceptance:** The next data backlog is a generated scenario-to-gap worklist with source, expected decision changes, acquisition route, and stop condition. Each new collection change reports product answers and material answers moved, not just new rows. Vendor handoffs already in `archive/research-2026-09-26/owner-handoffs.csv` are reused rather than re-searching them. The no-product materials never present a buyable final shortlist product. Retain coverage reports by scenario and by product, using explicit denominators.

**Dependencies:** D01-D05 meaning fixes first; then benchmark scenarios. New imports remain subject to the owner's pause/exception process.

### D07 - Numerical/source witnesses cannot certify the semantic role of a condition

**Severity:** P2 for validation design; P3 for the two currently affected cells. **Classification:** known absence of a human source error-rate audit, plus two new source-verified condition defects. **Steps/scorecard:** Screen, Confirm; C3, C15.

The source-hash, independent raw-to-normalized check, typed/raw parser agreement, and source reread practices are real strengths. They prove byte identity and much arithmetic. They do not prove that a parsed token was the intended condition, nor that the source itself describes a representative H2C printed coupon. Tests comparing UI to engine also cannot catch a common semantic error.

The targeted sample found V002780/V002781 storing Test temperature 90°C in addition to Anneal°C90, although the Spectrum page gives90 only as the 4 h anneal schedule. `measurements.csv:2781-2782`; `scripts/ingest/propose.mjs:2145-2149` takes a temperature token after excluding standards/rates/load, without excluding the anneal role. Both raw/typed fields agree and the numeric token exists on the page. The HDT headline has no fixed test-temperature filter, so these cells do not move a current scenario verdict. They should still be corrected through the normal source-checked migration when implementation starts.

`docs/audits/2026-09-25-re-center/SPOT-CHECK.md` explicitly says all existing row reviews were AI, and leaves human reviewer/result fields blank. The present targeted review is another AI check; its four chosen sources cannot estimate a corpus error rate.

**Recommendation:** Keep automated reconciliation, but add a small independent stratified source audit focused on decisive roles and borderline verdicts: identity, value/unit, specimen, direction/raster, moisture, treatment, test temperature/load/notch, and scope. Store checker identity/date and the conclusion. Use independent synthetic PDF/table fixtures with different role temperatures, not tests copied from current outputs. The owner or domain reviewer should sample the final proof, especially acceptances marked “physically implausible” versus “unusual but retained”. Distinguish an empirical plausibility window from a hard contradiction.

**Acceptance:** A fixture “HDT 116°C after 4 h@ 90°C” produces anneal90/4 and no constant test-temperature 90. An impact row “notched@-40°C” still produces test-temperature -40; a nozzle/preparation temperature cannot enter either field. Retained audit results identify reviewer and whether values *and conditions* matched. Failures open class-level investigations; a sample never claims universal truth.

**Dependencies:** pipeline truth fixtures and source review manifest format; no broad re-extraction is needed for the immediate two-row repair.

### D08 - Product identity and document revision must remain separate entities

**Severity:** P2, ranking/coverage bias and procurement traceability. **Classification:** known in OPEN-PROBLEMS16, not a new duplicate discovery. **Steps/scorecard:** Screen, Rank, Drill down; C2, C3, C5.

The re-center has correctly merged multiple product-line materials and seven revision duplicates. The open register still lists PolyLite ABS V5.3 beside Polymaker ABS and generic title/name extraction problems; e.g. 3D-Fuel Pro PCTG is named “3D” (`OPEN-PROBLEMS.md:642-650`). Active grade identity is partly coupled to source/formulation keys and name heuristics. A document revision can therefore become another product, and a product's ordinary plus sign can be lost by a duplicate key. Product medians/counts make duplicate identity affect both coverage and ranking.

**Recommendation:** Preserve stable procurement ProductID/GradeID. Attach explicit document revisions and measurement-set provenance, with supersedes/current-selection relationships and product aliases. Do not merge on identical numbers alone or on a normalized product-name string. The shared-formulation relationship is a separate, source-supported claim and should continue to be distinct from a document copy or product rename. Resolve known items before expanding the identity heuristics.

**Acceptance:** A new revision of a known product creates a new source/measurement set without increasing product counts; a materially distinct PLA+ remains separate. A retired revision remains traceable and cannot win an active decision by a smaller MeasurementID unless explicitly chosen. Ambiguous composition/name remains an unresolved identity, not a guessed grade. Snapshot product counts and medians show only intended changes.

**Dependencies:** source revision relationships; product-scoped findings from D01. Owner/manufacturer identity rulings remain authoritative.

### D09 - The final shortlist needs a compact engineering confirmation brief

**Severity:** P2, usefulness for the intended team. **Classification:** explicitly deferred team layer (GOALS C14), proposed narrow v2.1 improvement rather than a missing implemented requirement. **Steps/scorecard:** Translate, Confirm; C1, C7, C14.

Templates are honest about several things they do not check. But “motor/car” plus an HDT threshold does not establish time-dependent stiffness, a high-elongation material is not automatically a sealing elastomer, and an XY performance index is not a demonstration of an FDM part's multidirectional response. Among 366 comparable XY strength values,309 have unspecified endpoint, 49 are break, and 8 yield; the index's existing caveat is appropriate and should remain visible. These limitations call for a repeatable final confirmation route, not guessed fatigue/creep or part-level numerical predictions.

**Recommendation:** Export a small confirmation brief with scenario intent, exact shortlisted product/state, source IDs, passed requirements, unresolved limits, assumed facts, achievable route, and a suggested experiment *defined by the team's application*. Include load direction, exposure, time/temperature, thickness/tolerance, and repeatability questions when they govern. This can be a local scenario artifact and a manually entered test reference; a large shared team database and FE solver are unnecessary for v2.1. Prioritize a usable decision record over an unvalidated universal easy-to-print score.

**Acceptance:** A warm loaded-bracket brief identifies HDT as a coupon screen and leaves sustained load/service endurance for confirmation. A flexible-seal brief names recovery/compression set and geometry as unresolved if the maker does not publish them. The team can reopen a saved scenario and find exact product/state and source witnesses. If a future own-test row decides, its print route, batch, condition, method and reviewer are recorded, and datasheets remain accessible beside it.

**Dependencies:** stable scenario serialization, D01/D03 provenance, a team pilot. A fuller tested-result tier should remain a separately approved later increment if the owner keeps C14 deferred.

## Suggested execution order for the planning agent

1. **Define the proof contract.** Write an amendment to the goals/decisions only after owner direction for the reviewed contract is settled: product-scoped proof, a printer baseline, a consistent treatment/service state, and a named screening policy. Preserve existing record IDs and immutable source provenance.
2. **Fix the decisive logic.** D01, D02, D03; run the retained real-database probes and independent multi-product/state fixtures. Produce material and product decision diffs, then update UI/results/export explanations.
3. **Make evidence policy visible.** D04 and D05: keep approximate screening convenient, but let strict method/exposure/state requirements stay strict. Label unknowns with the next action.
4. **Validate source roles and identity.** D07's two-row source-checked correction and independent fixtures; D08'sknown duplicates/name issues with documented identity evidence. Independent human sample remains a release evidence limitation until actually completed.
5. **Close scenario bottlenecks.** D06, then D09'scompact confirmation brief and team pilot. Collect only facts that close a demonstrated answer; keep pauses and vendor-dependent cases explicit.

The first release gate should be “every passing product has one source-backed and capability-compatible proof set”, not “every material has a number”. The second should be “a team member can choose, buy, print and explain one of the shortlisted products without reverse-engineering the data model”.
