# H2C Material Selector: critical review for version 2.1

> **Historical record** (2026-09-27): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

Reviewed 2026-09-27, America/Vancouver. Baseline commit: `eb695b8328b369986341491d948d793abdfcb995`. Review by an AI team covering software/data operations, materials/mechanical engineering, and rendered product use; synthesis and verification by the lead reviewer. This is a review and proposed plan, not implemented work or human engineering approval.

## 1. Overall judgment

This is a substantial, useful engineering evidence workbench with unusually strong provenance, explicit missing states, repeatable builds, and a defensible separation between source records, compiled data, and an offline interface. Keep that foundation. A wholesale platform rewrite would consume effort without addressing the main problem.

The main problem is that the tool's **decision contract is less complete than its data integrity contract**. It can correctly retain a manufacturer's number, correctly reconcile the CSV and HTML, and still give a misleading product verdict or ranking. The highest-value version 2.1 work is to make every shortlist answer refer to a specific product, compatible material/treatment state, relevant exposure, and feasible manufacturing route. Then make that answer easier to use and independently test.

The tool is suitable now for evidence exploration and preliminary screening by an engineer who reads the product sheets. It is not yet convincing as a completed, reproducible path from part requirements to a product the team can print and test. That distinction follows its own GOALS, not a demand that this become a design-allowables database.

**Recommended direction:** product and state correctness first; scenario coverage second; a shorter route to passing products third; operations and build improvements alongside those changes. Do not begin 2.1 with broad new-document intake, more estimate-model exceptions, a weighted universal score, or a cosmetic reskin.

## 2. What was reviewed and what the evidence can establish

The review began with `docs/GOALS.md`, checked `docs/OPEN-PROBLEMS.md`, and examined the canonical tables, schemas, compiler and estimate stages, import tools, engine, rendered interface, documentation, snapshots, and CI configuration. Commands and browser probes ran in an external copy. Original-repository preservation is checked separately in `evidence/original-preservation.json`.

The evidence package contains full verification logs, targeted engine and coverage probes, source reread records, browser text captures, screenshots, export/import checks, and specialist reports. The reviewed local artifact was rebuilt from the baseline source. The live deployed website was not independently audited.

Verification status and exact timings are in [verification-results.json](evidence/verification-results.json). The first full run stopped when the sandbox prevented Chrome from opening its debug port; this was an execution-environment failure. The browser-enabled full rerun passed in 212.848 seconds, including 318 normal tests, 171 import tests, scale, reproducibility, audit and snapshot checks, 66 matching interface views, and 300 rendered scenarios with 2,570 readings. The retained audit independently reconciled 11,026 raw numeric rows and matched the rebuilt payloads with the HTML. These are strong integrity and consistency results, not proof that every source value or engineering judgment is correct.

Rendered inspection covered all six templates, confidence modes, table/chart ranking, material/product/printing/price drill-down, search and no-hit recovery, compare, local CSV and scenario downloads, scenario import and shared hashes, and desktop/laptop/narrow layouts. Browser use was local `file://`; actual human team task trials, assistive-technology trials, physical H2C printing, and laboratory testing were not performed. Source rereads were focused, hash-checked samples, not a statistical error-rate estimate for all 11,211 measurements. No current manufacturer/retailer-wide refresh was attempted.

## 3. Strengths that version 2.1 should preserve

- Canonical CSV records plus schemas, vocabularies, stable identifiers, retirement, guarded migrations, and record-level diffs make evidence changes reviewable. SQLite is a useful generated query surface; it need not become the authoring source to make the system robust.
- Raw source wording remains beside typed decision fields. Unknown, not applicable, not comparable, and quarantined values remain distinct. This prevents plausible inventions from becoming data.
- Product values are chosen by declared rules; material spreads preserve product diversity. Direction, impact units, bounds, conditioning, and implausible-value exclusions receive serious attention.
- The engine is largely pure and separate from DOM rendering. Core builds can validate without estimates. The estimate model is marked, back-tested, and never directly establishes a pass.
- The single offline HTML artifact, compressed data, source links, source tracing, deterministic outputs, cache integrity checks, rendered fuzzing, and committed decision snapshots are valuable for this audience.
- The documentation admits limits and retains decisions with reasons. The current team-test and human source-error-rate gaps are already acknowledged in GOALS C3/C7. Finding them again does not make them new defects.

## 4. Data breadth is much larger than actionable coverage

The baseline has 174 material records, 136 in-scope material candidates, 1,128 active procurement products overall, 11,211 measurements, 1,282 profiles, 4,659 maker statements, and 1,648 registered sources. There are **1,077 active procurement products belonging to in-scope candidate materials**. Use the latter denominator when discussing usable product coverage; studies, reference grades, aliases, and excluded materials must not inflate it.

Comparable headline coverage for those 1,077 products is:

| Decision input | Products with a comparable value | Share |
|---|---:|---:|
| Density | 884 | 82.1% |
| XY tensile modulus | 281 | 26.1% |
| XY tensile strength | 366 | 34.0% |
| Z tensile strength | 149 | 13.8% |
| Elongation at break | 345 | 32.0% |
| Notched Charpy | 77 | 7.1% |
| Notched Izod | 45 | 4.2% |
| HDT at 0.45 MPa | 412 | 38.3% |
| Glass transition | 305 | 28.3% |
| Sampled Canadian price | 38 | 3.5% |

Source: [decision-coverage.json](evidence/decision-coverage.json). These counts show a product has that input, not that it has a complete decision bundle. They include inherited twin values where the established rule allows them. Some comparable values deliberately have unstated specimen or moisture details; 'comparable' is the project's screening policy, not equivalent laboratory conditions.

For the six existing templates, confirmed material counts are 18 outdoor structural, 15 indoor prototype, 29 lightweight structure, 34 warm environment, 19 high-stiffness fixture, and 16 flexible component. These are current engine answers, before the proposed corrections. Do not interpret them as independently approved recommendations. The price-led prototype leaves 100 of 136 in-scope materials unknown. That is a poor entry route to an otherwise practical prototype decision.

The coverage program should count **scenario decisions settled and exact products made actionable**, not additional documents or headline cells. Broad material-level coverage can hide sparse product-level bundles. The record tier remains useful even when it moves no decision; it simply needs a different success measure.

## 5. The important findings, in decision order

### F01 — Product verdicts inherit evidence and purchasing facts from other products. P1.

Numerical properties and print recipes are evaluated per product, but environment and evidence-quality checks still use material-wide maps, and buyability uses the material's purchase aggregate. A product view does not scope those records to its grade. This mixes old material-level behavior (explicitly established by D38) with D83's product-level promise.

The full-corpus probe reproduced 995 positive product/category results across 702 in-scope products without that product's own positive evidence record, and 685 in-stock product passes without an own in-stock sampled offer. Examples: ECOMAX PLA can inherit Bambu PLA water-solubility evidence and Bambu Canada buyability; 3DXSTAT ESD PETG acid evidence cites another product's Q00107. These counts describe scope transfer, not 995 proven physically false claims; some evidence may legitimately apply more broadly if that scope is established. It is currently not established per product by the evaluation.

**2.1:** declare evidence scope explicitly: exact product, established formulation/twin, defined material-wide applicability, polymer context, or general narrative. Only defensible applicable records may support a product pass. Purchase offers remain exact-product/variant observations. Unscoped material context stays visible without becoming product confirmation. Apply the same rule to 'exact-grade evidence'. See [DATA-ENGINEERING.md](reviews/DATA-ENGINEERING.md) and `evidence/data-engineering/product-scope-results.json`.

Exposure matching also matters within one exact product. The re-read PolyMax PETG-ESD sheet rates weak acids Good and strong acids Fair-Poor. The former becomes a positive verdict; the latter remains narrative. The acid evaluator can pass on the positive while leaving the limiting statement out of its verdict. Typed exposure conditions and a specific scenario target are needed; a favorable record for one agent cannot establish resistance to an unspecified class.

### F02 — A product is not yet a compatible tested state. P1.

Per-headline selection can combine different treatment states. Annealed values are allowed when no as-printed value for that property wins. The numerical evaluator carries the anneal metadata but does not use it to require the treatment or state it in the pass reason.

Hash-checked rereads confirmed Spectrum PLA Matt's 116 °C HDT requires four hours at 90 °C. Fiberon PET-GF15's selected modulus is measured after 16 hours at 120 °C, while its selected 81.6 °C HDT is as printed. A single scenario can use both without identifying a compatible produced state. These examples are substantially accurate source transcriptions; the decision assembled from them is the problem. Fifty-five in-scope products have selected annealed headline values.

The focused source check also found two condition-role transcription errors: V002780/V002781 store 90 °C as a test temperature where the sheet supplies it as the annealing temperature. This currently moves no HDT screening result, but shows why a parser agreeing with its typed output does not prove a source role was read correctly.

**2.1:** define a scenario's permitted state: as printed, selected anneal schedule, dry/conditioned/service state, and direction. Evaluate a compatible state bundle, allow an explicitly unresolved bundle, and identify every required treatment. Keep unknown conditions admissible only under a stated screening policy. Do not invent generic moisture correction factors or infer post-treatment values from another state. See the source manifest and rendered pages in `evidence/data-engineering/`.

### F03 — Template PASS is not consistently H2C-feasible. P1.

All templates except Warm environment omit nozzle/bed/chamber gates; Warm omits bed. Research scope is a classification, not a product's actual printability. This is explained in the filter UI, but conflicts with GOALS step 2's funnel.

Pure 'exceeds' recipe results occur among passing products: two outdoor structural, four lightweight, two warm (bed), and three high-stiffness. For example, PA12-GF FIBREX PA12 GF30 passes structural thresholds with a chamber the H2C cannot reach; two passing warm PC products exceed the bed limit. Partial and recommended-higher windows add further unresolved cases; they must not be treated as hard failures indiscriminately.

**2.1:** start an H2C selection with an explicit machine/route feasibility policy, applied to the same product/state as the properties. Permit a separately labeled material-research mode. Include treatment equipment and source guidance rather than pretending temperatures alone guarantee printing success. The retained H2C temperature baseline matches [Bambu's official specifications](https://blog.bambulab.com/bambu-lab-h2c-where-multi-material-vortek-system-meets-engineering-precision/).

### F04 — One failing product can suppress unresolved alternatives. P1 decision-policy review.

D83 explicitly makes a material FAIL when no product passes and any product fails, even if other products remain unknown. This is deliberate, tested behavior, not an accidental implementation regression. It does not match the ordinary meaning of 'none pass' or the promise that Include uncertain keeps potentially suitable alternatives.

For the outdoor scenario, 59 material failures also contain at least one unscreened unknown product; for lightweight, 51. This is not evidence those products would pass. It is evidence they have not been ruled out, despite the material failing. A newly measured failing grade can therefore remove a material whose other products remain unresolved.

**Recommended 2.1 policy:** PASS if any product/state demonstrably passes; UNKNOWN if none passes and a viable product/state remains unresolved; FAIL only when every applicable active product/state fails. Show 'no demonstrated pass', 'all tested products fail', and untested counts distinctly. Supersede the relevant D83 clause intentionally, with a scenario diff; do not silently change a pinned test.

### F05 — Ranking differs across lenses. P1 confirmed defect.

The table's `rankMaterials` computes indices per passing product and takes their median. The Ashby index card's `rankByIndex` computes an index from independent material headline medians. These are different mathematical objects and can include property contributions from nonpassing products. The central product decision requirement is lost in the second path.

Rendered Warm environment with beam stiffness gives table #1 PPA-CF, #2 PP-CF, #3 PA612-CF; the same chart guide gives #1 PP-CF, #2 PAHT-CF, #3 PPA-CF. The root engine probe independently reproduced that mismatch. Full product-spread chart bubbles can remain useful context, but cannot be silently substituted for the ranked passing product set.

**2.1:** one ranking result carrying eligible product/state IDs, numerator/denominator measurement IDs, score basis, and unresolved-input status drives table, chart guide, comparison and export. Label material-wide context separately. Evidence: [selection-probe-results.json](evidence/selection-probe-results.json), screenshots `03-warm-table-rank.png` and `05-warm-ashby-index.png`.

### F06 — Import witnesses do not bind a value tightly enough to its source cell. P1.

The apply guard verifies source bytes and review metadata, but numerical presence is a page-wide squeezed substring test. In the repository's own fixture proposal, changing a 52 MPa result to 5 MPa while keeping line evidence that says 52 produced no guard problems. Digit fragments in another number or a standard can satisfy the witness. This is an adversarial reproduction, not a claim that this mutation exists in production.

**2.1:** require a decision record to bind its numeric token, unit, property, row/column, direction and condition role to a source witness. Use explicit reviewed exceptions for layouts a reader cannot bind; human review remains meaningful and attributed. Keep record-tier capture cheap. The actual anneal/test-temperature mistake reinforces the need for role binding. See [ARCHITECTURE-OPERATIONS.md](reviews/ARCHITECTURE-OPERATIONS.md).

### F07 — Date-based releases and scenarios do not pin their evidence. P1.

New data changes retain the Method snapshot date 2026-09-21. The generated HTML name and scenario mismatch check use that date; build identity is also only a day. The manifest contains useful hashes, but these do not travel as the scenario's operative data/engine identity. Publishing overwrites artifacts under the same date-based name, despite README calling that URL pinned.

**2.1:** use a deterministic content/release ID derived from data, decision rules, registry and relevant app contract. Carry it in the embedded payload, scenario, exports and handoff. Retain immutable release artifacts. A different release must warn before recomputing an old question, even on the same date. Human source-access and price-observation dates remain separate.

### F08 — The next data program should close decision gaps, including service-state limitations. P1 planning gap.

Do not mistake 11,211 measurements for complete engineering coverage. Layer strength, notched impact, moisture-sensitive service states, creep/duration, dimensional stability, process route, and exact-product availability are thin or largely narrative. Existing unknown states and maker notes are useful; they should generate a specific next question or coupon task.

HDT should be labeled as a specified comparative test rather than promised service temperature. [ASTM's D648 public abstract](https://store.astm.org/d0648-18.html) limits inference to comparable loading/time conditions and notes technical differences from ISO 75. Approximate cross-standard screening is a reasonable policy choice; it must be visible and cannot be called equivalence. [Polymaker's moisture guidance](https://wiki.polymaker.com/printing-tips/post-processing/moisture-conditioning) explains why dry nylon data may not represent a humid service state. No numerical correction is justified by those general pages.

**2.1:** maintain a small engineer-reviewed scenario portfolio, rank missing evidence by whether it settles a shortlist, search targeted exact products, and record 'not published after search' when true. Keep no-data families visible as research gaps. Do not spend the initial phase filling low-value material cells for completeness.

## 6. Practical experience and the final selection steps

The interface has coherent views, explicit criteria, informative caveats, source navigation and working local exports. It is visually consistent and contains recovery paths. Its main weakness is **information order**: the engineer repeatedly reads methodological exposition and material summaries before reaching the product that meets the question.

On 1440×900, the ranked Warm view shows about two result rows above the footer. At 1024×768 the first result begins around 640 px. At 390×844 the warm view shows no product/material row in the initial viewport. Scrolling is expected, particularly on phones; the problem is the desktop decision workspace also prioritizes general explanation over results. The Products tab for PC FR begins with a ten-property material aggregate, postponing the actual passing product and its recipe below the first screen even though only two products exist.

**F09, P2:** reorganize around the active question and its actionable products. A compact requirement summary, result count and goal belong above the list. Put passing product cards first in the Products tab, including state, failing/unresolved gates, print recipe origin and the next verification task. Move full distributions and general method explanations into expandable context. Keep advanced charts and coverage views as secondary workspaces. Compare should distinguish a candidate product's recipe from material-wide ranges: Warm PPA-CF passes while Compare shows the material's partial chamber aggregate. Searching for a maker currently discovers materials, so a Polymaker search can show a PASS supported only by Bambu products; state that context and offer exact-product/maker filtering. This is workflow design, not a request to delete caveats.

Empty-state recovery also needs to distinguish an impossible question from absent evidence. With sunlight/weather as a strict requirement, the rendered view has zero passes, zero failures and 153 unknowns, yet says nothing meets everything asked. Say that current records cannot confirm any material for this requirement, preserve the real requirement, and offer an evidence/test next step. The UV coverage limit is already known; the issue is how its consequence is presented.

**F10, P2:** on narrow layouts, Filters opens as an overlay without the modal focus/inert behavior used by the material drawer. Shift+Tab can reach background controls while the rail remains open. Share a tested overlay manager, preserve Escape and return focus, and test keyboard-only task paths. The full report distinguishes confirmed defects from layout judgments and tests not performed: [PRACTICAL-UX.md](reviews/PRACTICAL-UX.md).

**F11, P2:** the saved shortlist is material-oriented; the funnel needs a small product/state decision record and an explicit print/test handoff. GOALS already puts the broader team layer later. Start with exportable local records of chosen product, requirements, basis, recipe, treatment, gaps and coupon/test plan, plus operator observations. Do not build accounts, a backend approval service or collaboration infrastructure before this workflow works for the team.

**F12, P2:** keep price late. The existing price sample covers only 38 in-scope products. Correct product scope immediately under F01; then refresh shortlist offers by exact SKU/variant, mass, currency, stock and observation date. Separate filament price from landed cost and process cost when those are actually supplied. Avoid using price absence as the default gate for a beginner's general prototype template.

## 7. Architecture, pipeline and data-point debugging

The present three-layer structure is appropriate: author reviewable facts; compile validated decision data; present a read-only offline workbench. Keep it. The next simplification should be a common **decision result** and explicit evidence scope/state, not a database/framework migration.

**F13, P2:** the SQLite query surface can combine fresh raw CSVs with old compiled `dist/db.json`; later SQL reuses an existing database without proving freshness. This can mislead a developer precisely when debugging a changed data point. Stamp table digests, compiled digest and release/rules identity; refuse mixed input generations. A trace command should follow one requirement to evaluated state, records, parser fields, selection rule, source page/hash and reviewed exceptions.

**F14, P2:** rehearsal before apply is good, but saves across multiple CSVs/manifest/review/ledger are not a transaction with crash recovery. Guarded cell edits do not fully protect an append against concurrent writers. Import paths also depend on a historical audit directory, and the proposal reader remains large and manufacturer-specific. Fetch operations lack explicit bounded time/size handling and durable checkpoints for every item. Separate stable import storage/run metadata from audit presentation, add a manifest-level optimistic lock and journal/staging publish, and refactor readers behind focused adapters only after witness behavior has regression tests. Define a private digest-addressed source-byte backup/restore contract: a hash and a URL cannot restore a vanished source, and ignored caches should not be the only documented replay route. Existing external backups were not inventoried. These are failure-mode risks; no production crash-loss incident was reproduced.

**F15, P1:** current testing is broad but not an independent engineering acceptance oracle. UI fuzzing deliberately calls the same engine as the page; the fresh-compile audit uses the production compiler. Both can agree on the wrong scope, state, aggregation or ranking semantics. Add a small source-grounded scenario suite with independently enumerated product/state answers and reasons. Include counterexamples, human source spot checks and team task trials. More random scenarios alone would not have found the deliberate aggregation policy or provided source-condition truth.

## 8. Build efficiency and documentation

The measured fast loop already meets the budget: 66.124 seconds cold and 24.563 seconds warm on this machine, Node v26.9.0. The cold production estimate stage took about 15.8 seconds against roughly 0.27 seconds compile and 0.07 seconds validate. The 2× scale check used 327 materials/22,899 measurements, with compile-plus-validation including estimates about 63 seconds in the first run, under its 150-second budget. These are single-machine runs, not performance guarantees for CI or all contributors; CI specifies Node 24.

**F16, P2:** keep the content-addressed cache and core/estimate separation. Add stage/RSS/size/cache-hit benchmarks and a dominant-chemical-group growth case, not only balanced duplication. Consolidate duplicate verification/deployment work where it preserves the publishing gate. Investigate selective payloads/Plotly traces only after browser load, memory and rendering are measured on supported devices. An approximate or distributed estimate rewrite has not earned priority here. The frozen local HTML is about 6.53 MB and the compiled JSON about 23.28 MB; offline use remains viable in the tested Chrome environment.

**F17, P2:** documentation has good substance but increasing navigation cost. README Quick start installs only `build` dependencies, while the full verification includes root-package import tests needing pdfjs-dist. CI already installs both. Correct and exercise a clean-clone setup path. Split current user task guidance, data steward recipes, developer change map and historical rationale. Avoid making readers infer current behavior from several superseded audits. Generate recurring counts/policies; test example commands and maintain a brief error-to-next-action guide. Claims such as a pinned date URL or 'no ranking' in Method need alignment with implemented behavior, without rewriting historical records to pretend they were always current.

## 9. What version 2.1 should mean

Release 2.1 when the team can enter a realistic part question, distinguish evidence-confirmed from unresolved alternatives, select a specific printable product/state, inspect why it passes, obtain the recipe and remaining verification tasks, and reopen/export that decision against the exact release used.

The release should visibly improve GOALS steps 1–7, with primary emphasis on C3/C4/C6/C8/C9/C13/C15 and a small deliberate C14 handoff. Measure a fixed before/after portfolio: material and product/state answers moved, wrong-scope supports removed, state conflicts exposed, actionable product bundles added, task-completion time, and verification time. A result count going down after false confirmations are removed is an improvement, not a regression to conceal.

The proposed sequence, concrete work packages, data/contracts sketch, decision questions with recommendations, tests and release gates are in [V2.1-PLAN.md](V2.1-PLAN.md). [BACKLOG.json](BACKLOG.json) is the structured execution backlog. The package is ready for another agent to plan or implement after the owner authorizes repository changes; this review itself authorizes none.
