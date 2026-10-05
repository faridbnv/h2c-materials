# Practical engineering and UX review for H2C v2.1

> **Historical record** (2026-09-27): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

Reviewer: Codex review agent. Date: 2026-09-27 Vancouver. This is an agent/code/browser review, not a human team usability study or a print validation. The original repository was not changed. All probes, copied artifacts, screenshots, downloads and this document are outside it.

## Executive assessment

The right product already exists in outline: a small engineering team can translate limits, screen materials by exact products, inspect uncertainty, compare trade-offs and trace measurements. The strongest feature is the separation of missing evidence from failure. Keeping estimates from passing a requirement, preserving raw test conditions and making source navigation available are unusually good foundations.

The biggest v2.1 opportunity is to complete the decision funnel, not add more visualizations. The engine has moved to product-level decisions, while several user-facing comparisons, search interpretations and saved decisions still operate at material level. As a result, the user can obtain a material PASS, read a different ranking in the chart, see process information aggregated over different products, and leave without a saved exact product and treatment plan. This is a coherent systemic problem: the answer lacks a single visible unit of decision.

Keep the material overview for learning and exploration. Make the transition to a qualifying exact product explicit, and carry that product, the decisive measurement conditions, required treatment and current evidence identity through rank, compare, procurement and confirmation. The material spread is useful context; it should not silently substitute for the product on which the scenario's verdict rests.

The interface is functional and markedly more careful than a generic catalog. It is also too exposition-heavy at the point where a working engineer needs the next answer. At 1024×768 only one warm-template data row initially fits; at 390×844 the first candidate starts at y=1101.66. Even a two-product material places the passing product below the initial drawer viewport. Those are task costs, not visual polish complaints. V2.1 should preserve the explanations while arranging them around the user's current question.

## Evidence and executed coverage

The reviewed, rebuilt single-file HTML was frozen at `evidence/ux/reviewed.html` and `evidence/ux-focused/reviewed.html`. Both probes recorded SHA-256 `16922d66f8ad16ded82f474f83a7616456b54eafdcaae3a9656126184c4080af`. Database snapshot label: 2026-09-21. Application build label: 2026-09-27. Chrome identifies itself in the PDF as HeadlessChrome 154. The page ran from `file://`.

Executed:

- All six application templates under Confirmed only and Include uncertain with estimates enabled; actual rendered text and screenshots.
- Desktop 1440×900, laptop 1024×768, and mobile-emulated 390×844 views, including material overview, products, printing and price.
- Warm-environment table goal rank versus Ashby design guide for the same beam-stiffness index.
- Maker search, no-hit recovery, excluded search results, and product search under a price scenario.
- Exact product values, inherited print guidance, treatment wording, Canadian price observations and source-navigation affordances through the rendered drawers.
- Three-material shortlist and Compare; browser print-to-PDF, with all four rendered pages visually inspected.
- Actual CSV, product CSV and scenario JSON downloads.
- Saved scenario import with a malformed file, a valid file, and an obsolete appBuild; restored URL rank/shortlist/view.
- Negative-density validation and retention of the previously applied requirement; filter/drawer keyboard focus, Escape and modal attributes.
- Runtime exception collection and network request collection: both completed browser probes recorded zero application exceptions. Network requests recorded were the copied local HTML; no runtime HTTP/CDN request was observed.

The first probe attempts could not launch Chrome inside the restricted process sandbox. The bounded external-copy probe was then approved with escalated process permission and completed. This was an environment restriction, not an application defect. One intermediate custom link test captured the hash before the application's debounce completed; the corrected probe waits for the update and passes. Initial exploratory probes accidentally toggled an already-checked estimate switch off; the final retained probe runs correct this and explicitly keep estimates enabled. Final `ux-probe.json` files contain `probeError: null`.

Scenario totals from the rendered strict views:

| Starting scenario | Confirmed materials | More materials that could not be checked | Meaning for practicality |
|---|---:|---:|---|
| Outdoor structural part | 18 | 35 | Useful starting shortlist, with outdoor life still unverified |
| Indoor prototype | 15 | 100 | A sparse sampled-price requirement holds out many plausible printing choices |
| Lightweight structure | 29 | 27 | The goal must still be chosen; thresholds alone do not optimize a part |
| Warm environment | 34 | 63 | Heat and printer gates help; treatment capability is not asked |
| High-stiffness fixture | 19 | 43 | Print orientation and part geometry still need engineering interpretation |
| Flexible component | 16 | 45 | Elongation does not answer hardness, sealing or recovery |

These are observed scenario answers, not measures of real material suitability or human task success.

Not executed: a real engineer/novice team trial, screen-reader testing, Firefox/Safari/Edge, long-duration manual use, native OS file chooser interaction, physical printing, recovery from hardware/printer failure, purchasing, or independent reconstruction of all material-property decisions from original documents. Imports used the application's real change handler with a browser File injected into its generated input; native file-picker affordances were not tested. Root-review checks cover the broad verification suite separately.

## Findings, ordered by decision impact

### U01 — The same design goal produces different rankings in Table and Ashby

**Priority:** P1. **Status:** New confirmed behavior; not listed as a current open problem. **Goal:** Rank/Understand, C7.

Reproduce from a fresh page: choose Warm environment; in Table set Rank by to `Beam, minimum mass, stiffness prescribed`; switch to Ashby and set its design guide to the same beam-stiffness index. Table ranks PPA-CF first, PP-CF second and PA612-CF third. The chart's guide card ranks PP-CF first, PAHT-CF second and PPA-CF third. No requirement changed.

Evidence: [table screenshot](../evidence/ux/03-warm-table-rank.png), [table text](../evidence/ux/03-warm-table-rank.txt), [chart text](../evidence/ux/04-warm-ashby-rank.txt), [guide screenshot](../evidence/ux/05-warm-ashby-index.png). Code: `app/js/engine/indices.js:146–162` computes each passing product's index and takes its median; `app/js/ui/ashby.js:1117–1121` instead ranks material headline medians. The chart openly says “from headline values”, but that phrase does not make two conflicting answers to one selected goal useful.

**Impact:** The highest-leverage decision is inconsistent across the two views expressly intended to help select and understand the same candidates. Marginal property medians can also describe different products. This is a semantic issue, not a formatting discrepancy.

**V2.1 change:** One pure goal-ranking service should return eligible product scores, material rollups, which products can be scored, best product and a reason when ranking is unavailable. Table, chart cards, guide counts, shortlist summaries and exports consume it. Keep an explicitly labeled exploratory material-spread chart if desired; it must not present that aggregation as the scenario's product rank.

**Acceptance:** The warm scenario and at least one scenario where only some products pass yield the same scored material order and best product in every lens/export. No score combines different products' numerator, density or price. Tie handling is stable. Unknown products never gain a score solely from a passing sibling. A rendered regression compares these cross-view semantics, not only table readings against the same engine.

**Dependencies:** Decide the ranking contract and eligible product set before changing chart code. Coordinate with the root architecture/data review; do not solve this by a UI-only label patch.

### U02 — Treatment required for a deciding value is displayed but cannot constrain the selection

**Priority:** P1. **Status:** Confirmed capability gap against GOALS Step 2; not identified as a general current capability in OPEN-PROBLEMS. **Goal:** Screen/Print/Confirm, C6/C9.

Warm environment returns PC FR as PASS. Its passing Bambu product has heat resistance 113 °C **after annealing at 80 °C for 12 h**. The product recipe states the same annealing schedule and drying at 80 °C for 8 h. The tool has no way to say “we will use this as printed” or “we cannot provide that annealing schedule”. Manufacturing offers “Drying guidance published”, which checks publication, not available equipment. The allowed gates are scope, status, abrasive, buyable, dryingKnown, nozzle, bed and chamber.

Evidence: [PC FR products text](../evidence/ux/07-warm-pcfr-products.txt), [overview](../evidence/ux/06-warm-pcfr-overview.txt), `app/js/ui/filters.js:278–330`, `app/js/engine/scenario.js` GATES, and `app/js/engine/products.js` treatment metadata. The data conditions are visibly retained; this finding does not allege that 113 °C is as-printed data.

**Impact:** A user can satisfy the numeric and printer-temperature limits while lacking the process needed to obtain the quoted properties. GOALS explicitly includes treatment in the same product-level screen, so showing it later is not the full intended behavior.

**V2.1 change:** Add a small process-intent/capability contract: as-printed only versus treatment allowed, with available annealing/drying envelope when required. Link each decisive value to its specimen/treatment schedule. Treat unknown schedules as unresolved, not as zero or “not needed”. Avoid estimating a treatment recipe.

**Acceptance:** PC FR's annealed heat value cannot confirm an as-printed-only 80 °C scenario. An allowed and feasible annealing schedule can retain it with an explicit condition on the answer. A product with published as-printed and annealed measurements selects the correct population. Export/print/save preserves that dependency. Scenario migration keeps old files readable with a visible default/review note.

**Dependencies:** Owner policy on admitting treated data; data-model and engine changes before UI. The existing conditioned/as-printed populations must stay distinct. This proposal is a process capability check, not a claim that the manufacturer schedule is a certified allowable.

### U03 — Discovery, comparison and verdict can refer to different product populations

**Priority:** P1. **Status:** New confirmed user-facing ambiguity; some material aggregation is deliberately designed. **Goal:** Understand/Drill down/Practicalities, C5/C8/C9.

Two examples:

1. Choose Indoor prototype and search “Polymaker”. ABS, ASA and PETG appear with PASS. The only passing products in those three material rows are Bambu Lab ABS, ASA and PETG Basic/Translucent. Search matches a Polymaker product, but the shown price verdict belongs to another product. The interface offers no matched-product badge or explanation of that distinction.
2. Compare uses `material.gates` directly (`app/js/ui/compare.js:238–241`). Warm-environment PPA-CF passes through individual products, while its aggregate chamber gate is `partial` for 50–80 °C. PC FR's compared hardened-nozzle requirement is “not recorded”, whereas its passing product's effective guide-derived recipe says “not needed”. Thus the material summary and the scenario's print answer differ in scope.

Evidence: [maker search](../evidence/ux-focused/42-product-search.png), [rendered search text](../evidence/ux-focused/42-product-search.txt), [independent product IDs and aggregate gates](../evidence/ux-focused/45-semantic-probe.json), [PC FR product recipe](../evidence/ux/07-warm-pcfr-products.txt), [Compare text](../evidence/ux-focused/36-compare.txt).

**Impact:** It is easy to read “Polymaker … PASS” as the searched maker's purchasable answer, or a Compare process chip as the same gate that confirmed the candidate. The engine can be correct while the user's interpretation is wrong.

**V2.1 change:** Clearly distinguish discovery matches from product qualification. Show matched product/maker names and their current verdicts; support opening the matching product immediately. If product/maker scope is made a requirement, apply it before material rollup. In Compare, display a count of qualifying products with their effective gates, plus an explicit separate all-recorded-products range. Include inherited guide/twin attribution in both scopes.

**Acceptance:** Search Polymaker in Indoor prototype says that the confirmed low-price products for these rows are Bambu, and no Polymaker price is established. A “this maker only” scenario cannot borrow a competitor's price. PPA-CF Compare explains that some exact products pass the chamber gate while other recorded windows are partial. Product print chips agree with the product's engine result and export.

**Dependencies:** Shared product-population/decision model from U01; independent search affordance can ship first. Do not silently redefine the existing global search as a hard constraint.

### U04 — No saved exact-product decision closes the material-to-purchase funnel

**Priority:** P1 proposal for v2.1, subject to owner scope. **Status:** Known deferral: GOALS Step 7 and C14 explicitly put team records later. **Goal:** Drill down/Practicalities/Confirm, C8/C14.

The saved shortlist contains material IDs, not selected procurement grade IDs. Compare is material-to-material. Products have no product shortlist/select action. The download exports every product of the materials on screen; it does not express “we chose G036-01, subject to this annealing and validation plan”. The user can study an exact product but must record the actionable decision elsewhere.

**Impact:** Handoffs and future rechecks lose the most consequential choice and its conditions. The well-developed evidence store stops one stage before a team can approve an actual purchase/print trial.

**V2.1 change:** Start with a lightweight exact-product decision brief, not a collaborative platform. Save selected GradeID, scenario/evidence identity, decisive measurement IDs, treatment and print dependencies, missing checks, source references and a short user validation note. Allow comparison of two products of the same material. Keep approval state separate from database truth; do not convert an engineer's approval into a published measurement.

**Acceptance:** A reviewer can load the decision and identify exact maker/product, what passed, what remains unverified, required print/treatment settings and the original question without searching the material's full record. Changes to evidence warn and show what affected the saved decision. Material-only legacy scenarios still load. No database CSV is edited by the offline page.

**Dependencies:** U02/U05, and an owner decision that a small local decision brief belongs in v2.1. A shared test registry or live-price service can remain later.

### U05 — Scenario provenance identifies a date, not the compiled decision evidence

**Priority:** P1. **Status:** Confirmed provenance limitation; coordinate with root report. **Goal:** Confirm/team reproducibility, C14/C15.

Current updated data still ships under database snapshot 2026-09-21, with build 2026-09-27. The share hash carries the snapshot date, but not a digest of the compiled data/rules. A saved JSON with `appBuild: "2025-01-01"` and the same snapshot imports with no warning. `validateScenario` warns only when `dbSnapshot` differs. The probe establishes the missing check; it does not establish that the injected old build actually held different data.

Evidence: [no warning on obsolete metadata](../evidence/ux-focused/41-build-mismatch-no-warning.txt), `app/js/engine/scenario.js:152–155`, hash serialization around line 166 onward, exported scenario under `evidence/ux/downloads/`.

**Impact:** Two builds can be presented as the same scenario evidence identity even if decision data/rules changed under the retained date. A team cannot know which claim was reviewed from the date alone.

**V2.1 change:** Record a stable content digest and semantic schema/rule version in scenario exports and decision briefs. Display human dates as dates, not as the identity guarantee. On mismatch, load the question but clearly mark that its results were recomputed against different evidence, with a focused decision diff when available.

**Acceptance:** Two builds with different deciding data but the same snapshot label are detected. Identical data/rules built at different times do not raise a false difference. Hash, JSON, printed brief and CSV carry the same identity. Older scenarios get an “identity unavailable” note rather than being rejected.

**Dependencies:** Build/contract work; ensure the digest excludes nondeterministic build timestamps. No live backend is required.

### U06 — Exposition precedes the next useful answer and obscures even a small product list

**Priority:** P2. **Status:** Confirmed layout measurements; usability impact is an agent design judgment pending team trial. **Goal:** Read candidates/Drill down, C7/C8.

Warm environment at 390×844 has its first material row at y=1101.66. It fits within the width, but one must pass the top bar, view strip, result prose, caution, five vertically stacked requirement pills, limitations disclosure and table controls before reading a candidate. At 1024×768 the first row starts near the bottom of the viewport. Ranked long product names further enlarge desktop rows.

PC FR has just two products. Its Products tab first renders a ten-property spread table, a twelve-topic maker-coverage overview and caveats; the passing-product section begins at y=1343.27 on a 900px-high desktop. The visible drawer body is 622px high and its scroll height is 2398px. The passing-product group is structurally “first” only after the aggregate exposition.

Evidence: [laptop](../evidence/ux/14-laptop-warm.png), [phone](../evidence/ux/19-phone-warm.png), [product tab](../evidence/ux/07-warm-pcfr-products.png), [phone metrics](../evidence/ux-focused/43-phone-scroll-burden.txt), [drawer metrics](../evidence/ux-focused/44-product-scroll-burden.txt), `app/js/ui/detail.js:1141–1145`.

**V2.1 change:** A compact query/result strip should lead with confirmed/unresolved counts and one next action, with requirements expandable. Products should lead with passing exact products and a compact decision matrix; aggregate spread and maker-topic coverage become disclosures. Offer a focused shortlist view on narrow screens. Retain prominent limitations where they affect the specific answer, rather than repeating broad caveats before every next step.

**Acceptance:** At 1024×768 a chosen scenario exposes multiple material rows without scrolling through explanatory sections. Opening PC FR Products shows its passing product and treatment requirement in the initial viewport. The phone offers a clear “Read candidates” action with an appropriate scroll/focus target. Details remain available by keyboard and in exports. Establish precise density/scroll thresholds with the team trial rather than permanently encoding the reviewer's preferred pixel count.

**Dependencies:** U03/U04 product information hierarchy. Do not remove evidence status, missing-data counts or treatment warnings just to improve density.

### U07 — Filters is a visually modal narrow-screen overlay without modal keyboard behavior

**Priority:** P2. **Status:** New confirmed keyboard/accessibility defect. **Goal:** Ease of use, C15.

At 1024×768, open Filters. Its close button receives focus. Press Shift+Tab twice. Focus moves to the background theme button while the filter overlay and backdrop remain open. The rail has no dialog role/aria-modal and the background is not inert. The material drawer at the same width correctly has aria-modal, inert background and focus cycling.

Evidence: [focus escape JSON](../evidence/ux-focused/30-filter-focus-escape.txt), [screenshot](../evidence/ux-focused/30-filter-focus-escape.png), `app/js/main.js:598–609,646–665`, `app/css/app.css:662–668`. Escape closes Filters and correctly returns focus to the opener; preserve that behavior.

**V2.1 change:** One overlay/focus manager for the filter rail, material drawer, save/share drawer and explanation popovers, with deliberately different desktop behavior. Give the narrow filter overlay a named modal/dialog contract, hide or inert the background, and cycle focus. Use the same accessible return-focus path already implemented for material drawers.

**Acceptance:** Forward/reverse Tab remains inside the open narrow rail; Escape, close button and backdrop return focus to Filters; hidden background controls are not operable/announced as active. Test resize across 1100px, high zoom, a rail input with inline errors, and a material drawer opened from a rail-related action. Add a real screen-reader pass before claiming accessible end-to-end operation.

**Dependencies:** Shared overlay manager; avoid marking the entire `.app` inert because the rail itself lives inside it.

### U08 — A valid-looking requirement can have no possibility of confirmation

**Priority:** P2. **Status:** Known data limit, new recovery/translation recommendation. **Goal:** Translate/Screen, C1/C6.

Selecting “Resists sunlight and weather” under Confirmed only gives zero candidates, zero failed and 153 unknown. The empty view says “No material meets all of these requirements” and “nothing in the database does everything you asked”, then recommends dropping the costly requirement. The rail states zero records provide a verdict, so the necessary facts are present; the final recovery message does not foreground that this category cannot confirm any material in this build. Include uncertain with polymer data provides exploration/screens, not confirmed outdoor-life evidence.

Evidence: [strict sunlight result](../evidence/ux-focused/34-sunlight-strict.txt), [exploration screenshot](../evidence/ux-focused/35-sunlight-explore.png). GOALS/INTERFACE already document this limitation; do not log it as newly discovered missing UV data.

**V2.1 change:** Different empty states for contradiction, all-missing evidence and an unsupported confirmation question. Before applying a zero-confirmation criterion, show “this can only explore or screen; no product is confirmable here” and an evidence/research next step. For engineering translation, tie a qualitative requirement to the exposure/agent/conditions it actually needs; a broad chemical class should not imply tested resistance to every agent.

**Acceptance:** This scenario says “No materials can be confirmed from the current records; all 153 are unresolved”, not a general suitability claim. It offers inspection/research/uncertain exploration without encouraging the user to silently abandon the real outdoor requirement. Failing evidence and absent evidence remain different in text, export and print.

**Dependencies:** Capability/coverage summary from the existing registry and data. Avoid adding fabricated UV ratings merely to make the filter return passes.

### U09 — Translation support and onboarding should be grounded in actual team tasks

**Priority:** P2, before adding more templates. **Status:** Known partial implementation (GOALS C1: new properties have no templates; C7: untested with team). **Goal:** Translate/Understand/Confirm, C1/C7/C15.

The six templates are transparent and editable, and each says what it cannot check. That is a strength. They are still analyst-written numerical starting screens. A gasket begins from elongation, an outdoor bracket from heat/stiffness, and a fixture from XY modulus. Users must independently know when layer direction, notch method, treatment, sustained load or an exact exposure is decisive. The important caveats currently appear as prose after a ready-made threshold question.

**V2.1 change:** A short task-oriented onboarding path: part function → main load/direction → service temperature/exposure → printer/treatment capability → goal. It should explain which questions the database can answer and which require a print or external data. Keep the existing expert filters and editable templates. A short practical guide should demonstrate one successful shortlist, one unknown-only case and one rejected exact product, using actual current records and screenshots generated from the same build.

**Acceptance:** Run a team trial with an engineer, a technician and a less experienced reader. Each must complete a bounded bracket/fixture/flexible-part task, identify the exact chosen product, explain one decisive test condition, recognize one unresolved requirement, and save a reviewable brief. Record task completion, interpretation errors and assistance needed. Acceptance is demonstrated comprehension, not merely a number of clicks or a screenshot diff.

**Dependencies:** U01–U06 should settle decision semantics first. Do not build a general FEA/material-design calculator into this screening-grade tool without a separate scope decision.

## Recommended v2.1 implementation sequence

1. **Freeze and test a decision-answer contract.** Define candidate products, evidence population, score, effective gates/treatment dependencies, and immutable evidence identity. Cover U01/U02/U03/U05 with fixture scenarios that deliberately make different products supply different marginal properties. Make independent expected answers explicit.
2. **Make exact products usable.** Show passing products first, provide matched-product navigation and optional maker/product scope, allow exact product comparison/selection, and introduce a local decision brief. U03/U04/U06. Keep material spreads as clearly scoped context.
3. **Compress the working surface.** Compact query strip, predictable progressive disclosure, practical narrow-screen path, and shared accessible overlay behavior. U06/U07. Keep the current single-file/offline behavior.
4. **Improve translation and missing-answer recovery.** Capability-aware qualitative questions and evidence-specific next actions; task-oriented guide and team trial. U08/U09. Use the trial to prioritize data gaps that actually prevent a decision.

Suggested handoff work items should each include: GOALS step and scorecard line; exact files/contract affected; data/source prerequisites; expected scenario answer changes; independent fixture acceptance; rendered task acceptance; migration/backward compatibility; and build/verify budget effect. A usability change intended to alter only presentation should show zero decision diff. A treatment or product-scope change should name which scenario answers change and why.

## What should be preserved

- One offline HTML, working from a local file, with no observed runtime HTTP dependency.
- Pure selection logic, typed source conditions, explicit unknown/indeterminate states and source traceability.
- Estimates never satisfying a requirement; the default strict evidence policy.
- Material ranges representing product diversity, rather than a hand-picked representative number.
- Editable templates with explicit omissions, maker/twin/guide attribution, and dated sampled Canadian prices.
- Keyboard-accessible number explanations, correctly modal material drawers, safe scenario validation and actual CSV/JSON export.

Do not spend v2.1 primarily on another chart, a universal score, larger unaimed import volume, or cosmetic refinement. The existing visual and data machinery is already strong enough to support a more coherent practical decision process. The release should prove that a user can move from a defensible material shortlist to one exact, condition-aware product decision that another team member can understand and recheck.
