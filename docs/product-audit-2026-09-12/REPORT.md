# H2C Material Selector — independent product-owner audit

Date: 12 September 2026. Repository commit reviewed: `cd2eabb365118ea87e5cea86966bb2aa9766e818`. Database snapshot: 10 September 2026; compiled build: 12 September 2026.

**Assessment: useful research and comparison foundation, but not ready to be treated as a dependable first-time-user material recommendation flow.** The largest problems are promises that exceed the filters, misleading recovery and status messages, loss of decision context between views, and evidence that becomes less qualified as it moves toward a buying or printing decision.

This is an audit and recommended backlog. **No application, workbook, or existing documentation was changed.** The earlier `docs/UX-AUDIT.md` is historical input, not proof that an issue is fixed.

## Reading this report

- **U — UI observed:** exercised or inspected in the local distributable in native Chrome, including accessibility-tree observations and screenshots.
- **D — data/engine reproduced:** checked against the compiled database or executed engine functions. All six template result sets were calculated.
- **C — code confirmed:** the event handler or rendering path establishes the behavior; not necessarily exercised through a physical click in every state.
- **H — usability assessment:** a reasoned first-time-user concern, rather than a demonstrated software failure.
- **P1:** materially misleading decision, blocked core task, or serious accessibility/recovery problem. **P2:** substantial friction or inconsistency. **P3:** polish or discoverability.

The control inventory covers the application-owned controls and identifies third-party chart controls. **This is not a claim that every permutation of every control was manually clicked.** Browser coverage was sampled across the principal views; code review covered the remaining application handlers. Saved-file import was attempted, but the native file-picker interaction was interrupted and did not establish successful restoration. Mobile-device, screen-reader, external retailer, complete print-preview, and downloaded-file round-trip verification remain outstanding. Findings explicitly distinguish this from confirmed behavior.

The 62 existing tests passed. A fresh, in-memory extraction and compilation of the workbook exactly matched `dist/db.json`, with zero validation errors and four warnings. This verifies reproducibility, not the truth of every source record or the usability of the product. See [validation evidence](validation-check.json), [data probes](data-probes.json), and [sample CSV](sample-export.csv). The CSV is a deliberately failing synthetic selection used to inspect export behavior; it is not a recommended material list.

## 1. First-time-user scenarios

These cover the practical jobs a printer owner is likely to bring, plus recovery, comparison, accessibility and handoff. They are a bounded scenario catalogue, not a claim to enumerate every possible application of a 3D printer.

| ID | User's job and likely clicks | What the user needs to understand | Current assessment / findings |
|---|---|---|---|
| S01 | Open the app and browse | What it does, which printer it assumes, where to start | Templates help; PASS before testing and six out-of-scope materials undermine the opening state. F05, F51 |
| S02 | Choose an outdoor bracket → Outdoor template → read results | Weather, UV, heat, load, grade limitations | Nine pass the numeric screen; outdoor durability was not checked. F02 |
| S03 | Print a quick cheap prototype → Indoor template | Ordinary build material, low effort, basic setup | 13 pass, including Support for ABS; ordinary PLA Basic is absent. F03 |
| S04 | Choose a drone arm → Lightweight template | Stiffness-to-weight, orientation, actual loads | 19 pass thresholds; no optimization or structural adequacy determination. F04, F13 |
| S05 | Print for a car or motor without chamber heating → Warm template → Printing | No active chamber requirement, usable settings | 14 pass a 65 °C chamber gate, not a no-heating test. F01 |
| S06 | Choose a rigid jig → Fixture template | Deflection depends on shape and load, not modulus alone | 11 pass; heat is merely a preference and does not rank results. F04, F27 |
| S07 | Choose a gasket or strap → Flexible template | Softness, elastic recovery, sealing, repeated flexing | Six pass elongation; spring-back and sealing are untested. F04 |
| S08 | Find something stronger than familiar PLA → baseline → sort Strength | Same endpoint, direction, grade and conditions | PLA baseline lacks a strength headline; related value disappears in Compare. F18, F35 |
| S09 | Find something less bendy than PETG | Modulus versus strength, same geometry | Plain Stiffness label helps; generic versus commercial identities need explanation. F13, F18 |
| S10 | Set a heat threshold for a hot car | HDT is a particular test, not a service guarantee | Strict gate respects unstated load; compact display hides the qualification. F17 |
| S11 | Pick the cheapest qualifying material → Price → sort ascending | CAD/kg versus spool price, snapshot, purchase variant | Six headline/link prices differ; ABS sample contains a PLA-named offer. F11, F12 |
| S12 | Buy only stocked Canadian offers → Cost checkboxes | Sampled stock on a date, not live availability | Correct missing-offer UNKNOWN logic; wording still overpromises. F21, F54 |
| S13 | Search a brand or commercial product | Bambu/Polymaker/product names should be discoverable | Search excludes manufacturer/product strings. F23 |
| S14 | Search a canonical polymer, filler, family or grade ID | Distinguish exact material, relatives and support products | Word-prefix matching works by design; product discoverability remains weak. F23, F51 |
| S15 | Search PLA after imposing high heat | “Exists but excluded” versus “not found” | Excluded group helps; hidden-state wording can misclassify it. F25 |
| S16 | Mistype a name or search something absent | Clear no-match response and one-click clear search | Reproduced misleading hidden-results message and ineffective recovery. F23 |
| S17 | Reset after a fruitless search | Whether reset clears search, shortlist and view | Only constraints/template reset; query survives. F24 |
| S18 | Enter too many requirements → Why excluded → Relax | Why excluded, what changing one requirement accomplishes | Useful recovery calculation; wording conflates removal with relaxation. F26, F52 |
| S19 | Keep incomplete candidates for research | Unknown is not unsuitable; estimate is not measured | Mechanism useful, but STRICT turns unresolved candidates into FAIL. F26 |
| S20 | Turn estimates off and compare the same shortlist | Which values and decisions depended on inference | Toggle exists; cross-view representation and saved-state gaps remain. F35, F42–F43 |
| S21 | State “I have a hardened nozzle” | More hardware should not eliminate otherwise viable options | Checkbox leaves only 27 passing materials in strict mode. F07 |
| S22 | State “I do not have a hardened nozzle” | Exclude abrasive grades explicitly | No negative hardware capability setting in the UI. F07 |
| S23 | Check exact H2C nozzle, bed, chamber capability | All requirements must be met by one actual grade/profile | Gates and summaries aggregate material-level evidence. F06, F14 |
| S24 | Ask which AMS or left/right path to use | Specific allowed/forbidden routes | Overview always says AMS not established, even with explicit incompatibility records. F10 |
| S25 | Find nozzle diameter, plate, drying time and settings | A usable grade-specific preparation recipe | Data is in Printing; union windows and source IDs hinder execution. F14–F15, F22 |
| S26 | Ask whether a dryer/enclosure is needed | Required, recommended, unknown must differ | Published drying schedule becomes “Required”; unknown setup is easy to misread. F15 |
| S27 | Find resistance to a cleaning solvent | Exact chemical, concentration, temperature, exposure | Broad checkbox accepts limited resistance as PASS. F08–F09 |
| S28 | Choose for acids, oils or alkalis | Exposure-specific decision, not category-wide assurance | Same concern as solvents; no exposure input. F09 |
| S29 | Choose for food contact, UV, fatigue, creep or hydrolysis | Whether the database can answer the question at all | Explicit evidence-only gaps help; no guided route to relevant records. F53 |
| S30 | Choose flame-retardant or ESD material | Grade-specific evidence and limits of a material claim | Broad category/filler vocabulary is insufficient for an application conclusion. F09, F53 |
| S31 | Choose soluble support or an interface pair | Supported build material, removal method, routing | Support pairing is buried; build-material templates do not consistently exclude support. F03, F53 |
| S32 | Compare two familiar candidates → stars → Compare | What differs, which requirements pass, where to inspect evidence | Bars draw, but current eligibility and working evidence links are absent. F32, F34 |
| S33 | Compare one candidate against PLA baseline | One candidate plus reference is a valid comparison | Blocked until two candidates are pinned. F33 |
| S34 | Pin six, attempt seventh, remove one, add again | Limit and recovery without losing context | Limit enforced by alert; no capacity display or pin action in drawer. F56 |
| S35 | Change requirements after shortlisting | Keep research history but flag disqualified picks | Compare retains picks without showing their current verdict. F32 |
| S36 | Explore two-property chart → scales → reference | Direction of better, missing points, reference versus candidate | Core chart renders; guidance and advanced semantics have inconsistencies. F47–F49 |
| S37 | Inspect every measurement for one material | A point is a compatible pair, not necessarily one physical test | Cartesian pairing and headline-based index tally need correction. F47–F48 |
| S38 | Drag to zoom, pan, lasso, reset chart | Distinguish viewport changes from candidate filtering | Lasso changes subset; counts/search/share do not fully preserve that context. F43, F49 |
| S39 | Compare many properties in Parallel | Axis meaning, omitted materials, single-material state | Technical labels return; one result is described as none. F46, F51 |
| S40 | Inspect missing evidence → Coverage cell | Land on the selected domain's gap or conflict | Cell opens Overview, not the clicked evidence. F50 |
| S41 | Verify a number → evidence dot → source | Full conditions and clickable original source | Table dot has a route; Compare dots do not; URLs are plain text. F19–F20, F34 |
| S42 | Inspect commercial grades and colours | Actual product identity and available options | Grade names exist, but no grade selection and no colour-range data. F13, F22, F53 |
| S43 | Export current result list to spreadsheet | Actual rows, reasons, units, assumptions and provenance | CSV misses failed reasons and complete scenario context. F55 |
| S44 | Save scenario → change app → load JSON | Restore all saved settings atomically | Handler restores scenario but leaves parallel UI state stale. F42, F45 |
| S45 | Share selection from website or local HTML | Recipient sees same question, view and evidence basis | Hash omits key state; local link construction is defective. F43 |
| S46 | Reload, use Back, open an older link | Predictable navigation and snapshot compatibility | No hash-change listener; hash omits snapshot/version. F43–F44 |
| S47 | Print or save a comparison for a colleague | Requirements, snapshot, grades, qualification and readable pagination | Print button exists, but comparison lacks scenario summary. F37 |
| S48 | Use keyboard only or screen reader | Named controls, focus continuity, operable evidence | Tiny nonfocusable dots, row keyboard bubbling, dialog focus gaps. F39–F41 |
| S49 | Use laptop zoom, narrow window or phone | Filters must not cover all content | Overlaid unclosable rail reproduced at 150% zoom. F38 |
| S50 | Switch theme or use offline/shared-drive copy | Readable state, predictable persistence and source access | Local bundle loads; full cross-browser/offline/network-failure matrix not completed. F54 |

## 2. Findings and recommended fixes

### Promises, constraints and recommendation quality

#### F01 · P1 · “No heated chamber” tests the wrong capability — U/D/C

**Reproduce:** choose “Warm environment, no heated chamber,” then Printing. Fourteen materials pass. ABS, ASA, PC and PA6-CF display chamber ranges of 45–60 °C. The template sets the ordinary `chamber` gate, which compares against the H2C's 65 °C baseline.

**Impact:** the named requirement has not been tested. A within-envelope chamber temperature does not establish printing without active heating.

**Recommend / acceptance:** either rename this template to describe the actual 65 °C screen or implement an explicit evidence-backed no-active-heating condition. Each passing result must identify a qualifying profile and distinguish passive enclosure warmth from active heating. Location: `templates.js`, `constraints.js:evaluateGate`.

#### F02 · P1 · Outdoor template implies durability it never evaluates — U/D/C

**Reproduce:** choose Outdoor structural part. Nine materials pass stiffness, density, heat and scope; there is no UV/weathering constraint. The description promises a bracket that lives outside and survives sun. UV/outdoor has six records and no reducible verdict.

**Impact:** a novice reads an application recommendation where only selected mechanical/thermal properties were screened.

**Recommend / acceptance:** label the result “Mechanical/heat shortlist for outdoor investigation; UV/weathering not verified,” directly beside the result count. Add a follow-up evidence step, and do not present an unqualified outdoor PASS. Location: `templates.js`, `start.js`.

#### F03 · P1 · Indoor prototype admits support material and misses obvious beginner choices — D/C

**Reproduce:** Indoor prototype returns 13 candidates including **Support for ABS**, ABS-GF, PLA-CF and PLA Glow. PLA Basic is absent. The template checks scope, chamber evidence and price; it never excludes support/interface materials and does not evaluate printing difficulty.

**Impact:** “cheap, easy to print” is not established, and a support product can be mistaken for the main build material. Missing chamber data can eliminate an otherwise obvious candidate without a novice-friendly explanation.

**Recommend / acceptance:** explicitly screen material role; show printing complexity as unknown where unsupported; explain common omitted materials near the shortlist. Do not invent ease-of-print scores. A build-part template must not recommend an interface-only material. Location: `templates.js`, compiled `facets.supportMaterial`.

#### F04 · P2 · Remaining templates overstate what single-property thresholds establish — D/C/H

**Reproduce:** Flexible checks elongation ≥100%; Lightweight checks density ≤1250 and stiffness ≥2.5; Fixture checks stiffness ≥5 and makes heat a preference. Descriptions promise spring-back, “as light as possible,” and a jig that must not bend.

**Impact:** elongation at break is not elastic recovery; thresholds are not optimization; modulus alone cannot establish part deflection. The data does not encode the user's geometry, loading or required seal behavior.

**Recommend / acceptance:** explain each template as a starting screen and name its untested application requirements. Flexible should surface hardness/recovery evidence where available; structural templates should explain orientation and geometry dependence. Keep the plain language, remove outcome guarantees.

#### F05 · P1 · Initial PASS labels imply a test that never happened — U/C

**Reproduce:** open a clean local URL. Header says “102 materials, no requirements set,” but every table row carries green PASS, including PEEK and other out-of-scope materials. H2C-relevant is unchecked.

**Impact:** the prominent row verdict contradicts the qualified header. A product named H2C Material Selector appears to endorse materials it explicitly categorizes outside the printer envelope.

**Recommend / acceptance:** show “Not evaluated” until a requirement exists; consider H2C scope as the initial default with an explicit browse-all option. Every initial surface, including Scenario and export, should use consistent untested language. Location: `table.js:cells`, `main.js:renderCount`, `newScenario`.

#### F06 · P1 · “Printable on an H2C” is only a scope-list check — U/C

**Reproduce:** enable H2C-relevant only. The active pill says “Printable on an H2C,” but `scope` only checks `material.excluded`. It does not require nozzle/bed/chamber gates, route approval, an appropriate nozzle diameter or one complete compatible profile.

**Impact:** a scope label becomes a compatibility guarantee. Templates can include materials with unknown or problematic print conditions and still use this wording.

**Recommend / acceptance:** say “Within the database's H2C research scope.” Show verified, conditional and unknown grade compatibility separately. Reserve “printable” for an explicitly defined, grade-specific check. Location: `labels.js`, `constraints.js:evaluateGate`.

#### F07 · P1 · Owning a hardened nozzle removes materials; not owning one is unexpressible — D/C

**Reproduce:** with no other criteria, check “I have a hardened nozzle.” Strict selection returns 27 PASS and 75 FAIL, because 75 materials have unknown abrasion guidance. Unchecking removes the gate altogether; it does not mean hardened hardware is unavailable.

**Impact:** a hardware upgrade unexpectedly shrinks the list, while the user with a brass nozzle cannot express the relevant exclusion.

**Recommend / acceptance:** model hardware availability separately from evidence policy. Offer available/unavailable/unspecified; known abrasive materials fail only when the needed hardware is unavailable. Unknown abrasion should remain visibly unresolved under a clearly described policy. Location: `filters.js` and `evaluateGate('abrasive')`.

#### F08 · P1 · “Resists…” silently accepts limited resistance as PASS — D/C

**Reproduce:** Environment checkboxes construct `require: ['resistant','limited']`. PLA Basic, PLA Matte and several other materials receive PASS for organic-solvent resistance with the reason “1 record(s) report limited.”

**Impact:** the green verdict strengthens the underlying evidence. The user did not choose to accept limited or conditional resistance.

**Recommend / acceptance:** make limited evidence conditional/indeterminate by default, or label and expose an explicit “include limited resistance” choice. A plain “Resists” checkbox must not produce an unqualified PASS solely from limited evidence. Location: `filters.js:data-env`, `constraints.js:evaluateEnvironment`.

#### F09 · P1 · Broad environmental categories omit the exposure that makes the verdict meaningful — C/H

**Reproduce:** select solvent, acid, oil or alkali resistance. The reducer matches category verdicts across records/grades; it does not ask which agent, concentration, temperature or duration the user means. Flammability wording similarly compresses qualified evidence.

**Impact:** resistance to one sampled exposure can be read as resistance to the whole category. Mixed records become uncertainty, but nonmatching exposures are still not distinguished.

**Recommend / acceptance:** select the exposure first where data supports it; otherwise present “evidence of resistance to some recorded exposures,” followed by named conditions. Keep certification and application suitability tied to the exact grade and specimen. Location: `evaluateEnvironment`, `detail.js:Environment`.

#### F10 · P1 · AMS overview gives a blanket unknown answer despite specific routing evidence — U/D/C

**Reproduce:** every Overview renders “Not established” and “Bambu has not published AMS compatibility for this material.” Yet TPU 85A, TPU 90A and TPU 95A HF profiles explicitly say “Not compatible” for AMS 2 Pro and “Right only” for routing.

**Impact:** explicit negative evidence is weakened to an unknown, and the user may miss a concrete feeding restriction.

**Recommend / acceptance:** derive the overview from recorded grade/profile evidence, distinguishing incompatible, conditional and unestablished. Phrase absence as “not established in this snapshot,” not a universal claim about what a manufacturer has published. Show route restrictions before the user buys. Location: `detail.js:Overview`; `data-probes.json:ams`.

### Data integrity, meaning and provenance

#### F11 · P1 · ABS price calculation includes a PLA-named product — U/D

**Reproduce:** open ABS → Price. Row **CA0069** is “Absolute Black - Bambu Lab PLA PURE Filament with Spool…” at CAD 33.99/kg and is included in the headline sample. Together with CA0037 at 25.99, it produces the ABS headline median 29.99.

**Impact:** referential integrity and median reconciliation pass, while the commercial identity is inconsistent. A correct formula does not validate its inputs.

**Recommend / acceptance:** investigate the original listing and workbook mapping; quarantine the observation until its identity is resolved. Recalculate only after source review. Add semantic product/material identity checks to the data acceptance process. This audit establishes the recorded mismatch, not the current retailer listing's true composition. Evidence: `data-probes.json:absPrices`.

#### F12 · P2 · Clickable headline price is not the price of the linked offer — U/D/C

**Reproduce:** ABS shows about CAD 30/kg but links to the sampled CAD 25.99/kg offer. Six materials have this discrepancy: PLA Basic, PLA Matte, PLA Silk+, ABS, TPU for AMS and PAHT-CF.

**Impact:** the visible price and clickable purchase object look like one offer, although one is a median and the other is a selected variant. Spool/refill and package mass add further ambiguity.

**Recommend / acceptance:** separate “sample median” from “sampled offer from CAD X/kg,” name retailer and pack size, and retain exact price precision in details. Every offer link must be labelled with its own observation. Location: `compile.js:buySummary`, `table.js:price`.

#### F13 · P1 · A material-level row can combine evidence from different purchasable grades — D/C/H

**Reproduce:** inspect a generic row such as PA and its Grades/Price records. Selection operates on canonical headlines, print summaries and a separately chosen offer. There is no exact-grade selection tying all requirements to one purchasable formulation. PA and PA6 also share the sampled PA6 Neat purchase link while having different property summaries.

**Impact:** passing the material row does not establish that the linked product has every displayed property or the compatible profile. This is a structural decision-support risk, not a claim that every row is wrong.

**Recommend / acceptance:** add a final grade verification step and show the grade behind each decisive value. Identify whether one actual grade satisfies all hard requirements. Keep canonical screening, but label multi-grade combinations explicitly. Location: `compile.js`, `main.js:recompute`, `detail.js:Grades`.

#### F14 · P1 · Printing windows are unions, not a valid recipe for one grade — D/C

**Reproduce:** `printSummary` takes the lowest minimum and highest maximum across profiles independently per axis. Table and Overview present these as Nozzle/Bed/Chamber windows. PPS-GF can pass the Warm template while the displayed chamber span is 60–120 °C because another profile supplies a within-baseline route.

**Impact:** a novice can combine endpoints or settings that do not belong to one compatible grade/profile; “within” and the displayed upper range can contradict each other.

**Recommend / acceptance:** label the union “range across recorded profiles”; lead with a selected compatible profile, preserving required versus recommended. Do not present aggregate windows as “set to.” Include grade, source and qualifier beside the recipe. Location: `compile.js:printSummary`, `aggregateGates`, `table.js`, `detail.js`.

#### F15 · P2 · Setup guidance loses required/recommended/ambient distinctions — D/C

**Reproduce:** PLA and TPU have compiled chamber ranges beginning at 0 °C; the compact rendering prints that endpoint. A published drying schedule is mapped to `drying: required`, then displayed as Required. A missing needs badge becomes “nothing special published.”

**Impact:** parser representations look like literal machine settings, and a recommendation or available schedule can become a requirement. Unknown setup is easily mistaken for no special preparation.

**Recommend / acceptance:** preserve ambient/no-active-heat and recommendation semantics through compilation and display. Say “drying guidance available” unless the source requires it, and “requirements not established” where guidance is missing. Verify the original wording before changing the dataset.

#### F16 · P2 · Headline displays discard numerical qualifiers used by the engine — C

**Reproduce:** `renderValue` formats `entry.value`; it does not display interval bounds or a greater-than/less-than operator, and does not display uncertainty. Filters evaluate intervals, so a displayed boundary number can appear to satisfy a threshold while the verdict does not.

**Impact:** the number the user sees is less qualified than the number the engine tested. Compare adds some bounds, but the table, chart and CSV are inconsistent.

**Recommend / acceptance:** preserve inequality and uncertainty/range meaning in compact values and export. Provide the exact evaluation interval on demand. A threshold-edge test must be explainable from the visible value. Location: `format.js:renderValue`, `table.js:toCSV`.

#### F17 · P1 · Unstated HDT load is too easy to mistake for confirmed heat resistance — U/D/C

**Reproduce:** 24 of 66 HDT headlines have `loadStated:false`. The Strict engine correctly refuses a load-specific PASS, but table/chart values still occupy the standard Heat/HDT axis with qualification largely in tooltip styling. PLA shows 80 °C; its source locator says “Deflection Temperature at 0.45” while the normalized load is unknown.

**Impact:** visual comparison and filter eligibility communicate different confidence levels. The recorded locator/normalization mismatch also deserves source re-review; it does not prove the missing load can safely be filled.

**Recommend / acceptance:** place “test load not established” next to affected values, distinguish these points on the chart, and review the 28 HDT measurement locators mentioning 0.45 despite unknown normalized load. Do not automatically promote locator text to verified evidence. Evidence: `data-probes.json`; `format.js`, `ashby.js:headlinePoints`.

#### F18 · P2 · Familiar baselines are specific grade observations presented as generic familiarity — U/D/H

**Reproduce:** pick PLA as baseline. The generic PLA headline uses a particular grade and includes 80 °C with an unstated load; other recorded PLA HDT tests are 52 and 53 °C under different loads. The baseline name alone does not disclose this.

**Impact:** “the PLA I know” is not a stable engineering reference; the user's ordinary spool may be very different. Baseline comparisons can create unwarranted confidence.

**Recommend / acceptance:** label the representative grade and test conditions, offer a familiar exact product where available, and explain that a generic family is not a universal benchmark. Keep different test loads separate.

#### F19 · P1 · Evidence details omit conditions already held in the database — D/C

**Reproduce:** `measurementRow` shows direction, specimen, standard, moisture and notch, but omits `postProcessing`, `testTemperature`, `printParameters` and `notes`. The data includes these fields. Compare's conditions row is narrower still.

**Impact:** the user cannot fully verify annealing, test temperature or print conditions through the “evidence” path, although those may determine whether the value applies.

**Recommend / acceptance:** provide an expandable complete measurement record with all qualification fields and source locator. Compare should explicitly flag meaningful mismatches, including unknown conditions, rather than only comparing a short string. Location: `detail.js:measurementRow`, `compare.js:conds`.

#### F20 · P2 · Original-source URLs are plain text rather than usable links — U/C

**Reproduce:** ABS → Evidence. The original PDF URL is rendered as escaped text in a definition list, not an anchor. Mechanical/Thermal records show source IDs without a direct source action.

**Impact:** the promised evidence-navigation workflow ends in copying a long URL manually.

**Recommend / acceptance:** make source titles/URLs clickable, offer copy URL, and link measurement source IDs to the source record. Offline mode should explain that opening the original requires connectivity. Location: `detail.js:Evidence`.

#### F21 · P2 · Price tab lists offers but provides no per-offer purchase links — U/C

**Reproduce:** open ABS → Price. All six offers appear with retailer and variant, but none is a link. Only the single selected offer in the main table is actionable. Individual access dates are also not shown; the panel uses a fixed snapshot note.

**Impact:** the user cannot choose another colour, package or retailer from the place that lists them. A dash can itself be the main table's only buy link when price is absent.

**Recommend / acceptance:** add a labelled retailer link and observed date per offer, retain “price not recorded” separately from buy availability, and expose pack price/mass versus normalized CAD/kg. Location: `detail.js:Price`, `table.js:price`.

#### F22 · P2 · Grade, environment and print evidence has IDs but no connected drill-down — U/C

**Reproduce:** Grades leads with G-identifiers; Printing leads with profile IDs; Environment shows source IDs. These are mostly text, and Evidence lists measurement sources only, so some nonmeasurement sources have no convenient UI route.

**Impact:** the user must mentally join tables intended for the build pipeline. Product names and the practical answer are subordinate to internal identifiers.

**Recommend / acceptance:** lead with manufacturer/product/profile purpose; make IDs secondary. Provide a shared source viewer usable by every evidence type and let the user select a grade across tabs. Location: `detail.js:Grades/Printing/Environment/Evidence`.

### Search, filters and recovery

#### F23 · P1 · Unmatched search produces a false diagnosis and a dead-end recovery — U/C

**Reproduce:** clean start → type `Polymaker`. The count becomes zero; the empty state says “102 materials match, but you have hidden them.” Click “Show everything that matched”: the query remains and the same empty state returns. Bottom status controls are hidden because no requirements exist. Brand/product search is not indexed, although commercial names exist in Grades.

**Impact:** a normal search failure looks like user error and tells the user to operate unavailable controls. The brand-search gap was deferred in the earlier audit; this report records it without assuming approval to implement it.

**Recommend / acceptance:** distinguish no text matches, no eligible matches, hidden verdicts and empty chart subset. Offer Clear search. Index manufacturer/product names with a matched-grade subtitle if the product owner chooses to reopen that deferred feature. Location: `search.js`, `main.js:recompute`, `explain.js:renderNoResults`.

#### F24 · P2 · Reset does not reset the state a novice expects — C

**Reproduce:** type a restrictive query, change view, pin materials, then click either Reset. Both clear constraints/template; search, shortlist, policy, baseline, columns and current lens remain. A user trying to escape the no-match state still sees no matches.

**Impact:** identically labelled reset controls offer no description of what survives. The start panel can return while a restrictive search remains active.

**Recommend / acceptance:** rename to “Clear requirements,” provide a separate clear-search action, and optionally “Start a new selection” with clearly stated scope. Preserve research pins intentionally, not accidentally. Location: `main.js:reset`, `wireChrome`.

#### F25 · P2 · Verdict visibility controls and recovery labels are inconsistent — C

**Reproduce:** clicking the sole active PASS chip tries to remove it, then immediately adds PASS back. Its tooltip still says “Click to hide them.” “Show everything that matched” enables PASS, UNKNOWN **and FAIL**, rather than only eligible states. Search-excluded headings say results do not meet requirements even when they were merely hidden by verdict controls.

**Impact:** apparent no-op buttons, unexpected failing rows, and false exclusion explanations.

**Recommend / acceptance:** either allow an empty visibility set with a truthful recovery state or disable the last toggle with an explanation. Make recovery enable only relevant eligible states and distinguish hidden from excluded. Location: `main.js:toggleState/showAllStates`, `table.js:excludedBlock`.

#### F26 · P1 · Strict mode conflates “unknown” with “failed” at material level — D/C

**Reproduce:** request a property absent for a material in Leave it out mode. `evaluateMaterial` assigns FAIL to unresolved criteria even when none failed. The UNKNOWN total is therefore zero in Strict, and the FAIL count mixes incompatible materials with unverified ones. INDETERMINATE exists per criterion but not as a separate result-state control.

**Impact:** “not enough evidence” becomes “does not work,” especially when users inspect the FAIL list or export it. The four-state explanation does not match the aggregate UI.

**Recommend / acceptance:** separate evidence verdict from eligibility: PASS/FAIL/UNKNOWN/INDETERMINATE describe evidence; policy controls whether unresolved materials enter the working shortlist. Counts, chips, explanations and CSV must preserve that distinction. Location: `constraints.js:evaluateMaterial`, `main.js:render`.

#### F27 · P2 · “Preference only” does not rank results — C

**Reproduce:** add a price/stiffness preference. It is evaluated but not used by table sorting, automatic ranking or a visible preference summary per candidate. Results remain name-sorted unless manually changed. Repository documentation says soft preferences rank eligible candidates.

**Impact:** users reasonably expect their preference to influence ordering; the application mostly stores a passive condition. Outdoor template's CAD 100 preference neither excludes nor promotes affordable choices.

**Recommend / acceptance:** either implement an explicit, explainable preference ordering with visible contributions, or label it “Track this target without filtering” and remove ranking claims. Do not introduce an unexplained overall quality score. Location: `main.js:sort/recompute`, `table.js`, `constraints.js`.

#### F28 · P2 · Filter rerenders discard disclosure choices and keyboard context — C

**Reproduce:** collapse Mechanical, expand an inactive group, then change a filter or pin a material. `renderFilters` replaces all markup and reconstructs open groups from defaults/active counts; it does not retain disclosure state or focused input.

**Impact:** the rail rearranges during a task; keyboard focus can be lost; repeated edits require reopening or relocating controls. Whole-view rerendering also preserves an unrelated scroll position when switching lenses, observed in Compare opening below its header.

**Recommend / acceptance:** retain disclosure state, focus and selection; update controls without replacing the active element. Restore a per-view scroll position intentionally or start a newly opened view at its header. Location: `filters.js:renderFilters`, `main.js:render/renderLens`.

#### F29 · P2 · Choosing an operator before a number is not retained — C

**Reproduce:** with an empty numeric field, change “at least” to “at most.” The handler calls `upsertNumeric`, finds no value, creates no constraint and rerenders the default operator. User must enter a number first or repeat the comparison choice.

**Impact:** the natural left-to-right input sequence fails silently.

**Recommend / acceptance:** keep draft operator/value state independently of applied constraints. Operator-first and value-first workflows must produce the same result. Location: `filters.js:upsertNumeric`.

#### F30 · P2 · Numeric input has no domain validation or visible apply contract — C/H

**Reproduce:** inputs accept any finite number, with no minimum, maximum or property-specific validation. Changes apply on blur/change or Enter; some other controls apply instantly. Negative density or price is accepted as a real requirement.

**Impact:** accidental inputs silently create impossible selections; the timing of filter application is unclear. Invalid number strings may collapse to an empty field and remove the condition rather than explain the error.

**Recommend / acceptance:** validate units/domains without imposing arbitrary upper limits; explain invalid values inline. Make pending/applied state clear and avoid rerendering away a user's incomplete entry. Test zero, negative, decimal, exponent, empty and pasted invalid input. Location: `filters.js`.

#### F31 · P2 · Applying a template from another lens gives poor feedback — C

**Reproduce:** open Scenario from Compare/Parallel/Ashby and select a template. `applyTemplate` changes constraints and Strict policy but retains the lens, search and shortlist. The new template name and active pills are rendered only in Table.

**Impact:** Compare may appear unchanged because it uses pinned materials; the user cannot see what the template just did. Existing search can also hide its results.

**Recommend / acceptance:** navigate to an explicit results summary or keep a persistent scenario header across every lens. Indicate that prior search/shortlist remain and visibly mark modified templates. Location: `main.js:applyTemplate`, `start.js`, `compare.js`.

### Compare, print and accessibility

#### F32 · P1 · Compare retains disqualified materials without displaying current eligibility — C

**Reproduce:** pin two materials, change requirements so they fail, then open Compare. It reads pins from `db.materials` rather than the current rows and does not show their overall verdict or against-requirements explanation. Header counts still describe the global filtered set.

**Impact:** the user can interpret an old shortlist as the current recommendation. Keeping rejected choices for comparison is useful; omitting their changed status is not.

**Recommend / acceptance:** retain pins but label each Meets/Fails/Unverified against the current question, with reasons. Distinguish “shortlisted” from “eligible.” Show that the lens displays N pins, not the header's candidate count. Location: `compare.js:renderCompare`, `main.js:renderCount`.

#### F33 · P2 · One candidate plus a baseline cannot be compared — C

**Reproduce:** pin one material and choose a familiar baseline in Table. Compare stops at “Pin two to six materials,” because it checks `pinned.length < 2` before considering the anchor.

**Impact:** one of the most natural novice questions—“how does this compare with PLA?”—requires an unnecessary second candidate and workaround.

**Recommend / acceptance:** permit one pin plus a distinct baseline and provide a baseline picker in the empty state. Clearly distinguish comparison references from selected candidates. Location: `compare.js`.

#### F34 · P1 · Compare's evidence dots are dead controls — U/C

**Reproduce:** compare ABS and ABS-GF, then click the dot beside a value. No evidence drawer opens. `renderValue` produces the same evidence-dot markup used in Table, but Compare wires only Print and baseline changes.

**Impact:** the exact moment the user wants to check a difference is where the evidence interaction stops working.

**Recommend / acceptance:** wire the shared evidence action in every renderer using it, and test Table/Overview/Compare consistently. A visible evidence affordance must open the exact measurement. Location: `compare.js`, `format.js:renderValue`.

#### F35 · P2 · Numbers visible in Table disappear as “Not published” in Compare — C

**Reproduce:** shortlist a material with related evidence but no headline, such as generic PLA strength. Table displays the related measurement with `*`; Compare's missing-headline branch handles estimates only and otherwise prints “Not published.” It also simplifies missing-state categories.

**Impact:** changing view seems to lose evidence. The user cannot tell “not comparable as a headline” from “never measured.”

**Recommend / acceptance:** use the shared measured/related/estimated/missing vocabulary everywhere, with clearly distinct encodings and consistent caveats. Location: `compare.js:estimateOf/blocks`, `format.js`.

#### F36 · P2 · Comparison uncertainty bounds can extend beyond their tracks — U/C

**Reproduce:** ABS/ABS-GF comparison shows bound marks past bar ends; the scale maximum uses central values and estimate highs, but not measured interval highs. Bounds are positioned using those larger highs.

**Impact:** uncertainty marks appear detached or out of scale. The meaning of the marks is not explained locally.

**Recommend / acceptance:** size the scale to all displayed interval endpoints, provide a bound legend, and handle unbounded intervals explicitly. Compare should not clip or overflow uncertainty at the largest value. Location: `compare.js:max/bounds`.

#### F37 · P1 · “Print summary” lacks the actual selection context — C

**Reproduce:** Compare → Print summary calls `window.print()`. Compare contains material bars, process and completeness tables, but no full active requirements, template/policy, snapshot, selected-grade justification or decision summary. Print CSS hides the top bar, rail and lens bar.

**Impact:** a detached printout cannot explain the question or reproduce the choice. Documentation's claim of a scenario header is not supported by the Compare markup.

**Recommend / acceptance:** build a print-specific context block including requirements, policy, snapshot/build, grade/source references and unresolved qualifications. Verify multi-page pagination and no clipped content at two and six pins. Physical print preview/PDF pagination was not completed in this audit. Location: `compare.js`, `app.css:@media print`.

#### F38 · P1 · Narrow layout overlays an unclosable filter rail — U/C

**Reproduce:** at 150% Chrome zoom on the observed 1361-pixel-wide window, the layout crosses the 1100 CSS-pixel breakpoint. The rail becomes a fixed overlay covering the left side of results and bottom controls. There is no Filters open/close button or code setting `rail.hidden`.

**Impact:** magnification and smaller screens obscure core content; the user has no in-app recovery. Header controls also crowd/wrap.

**Recommend / acceptance:** implement an operable filter drawer with close button, backdrop, focus management and responsive header/nav. Test 320/390/768/1024 CSS-pixel widths and 200% zoom. The actual-device mobile claim remains untested; the zoom failure is observed. Location: `app.css:@media (max-width:1100px)`, `index.html`, `main.js`.

#### F39 · P1 · Tiny evidence dots are neither keyboard controls nor adequate named targets — U/C

**Reproduce:** evidence dots are 5×5-pixel spans with a title and click listener; they have no tabindex, button role or accessible name. Parallel polylines likewise have mouse listeners but no keyboard interaction.

**Impact:** users with motor/vision limitations and keyboard-only users cannot reliably reach the product's evidence path. Hover-only qualifications are also inaccessible on touch.

**Recommend / acceptance:** use actual named buttons with comfortable hit areas and visible focus; supply keyboard alternatives for chart selection. Expose caveats via click/focus, not only native title tooltips. Location: `format.js`, `app.css:.evidence-dot`, `parallel.js`.

#### F40 · P2 · Enter on a nested row control can also activate the row — C

**Reproduce:** table row listens to any bubbling Enter key and opens the material. Star buttons only stop click propagation; the row keydown handler does not check whether the target is an interactive child. Enter on a star/link can therefore open the drawer as well as activating that child.

**Impact:** a keyboard shortlist or purchase action unexpectedly changes context.

**Recommend / acceptance:** row shortcuts must only run when the row itself is focused, or use a dedicated material link. Test Enter and Space on row, star, evidence button and retailer link separately. Location: `table.js:event handlers`.

#### F41 · P1 · Drawers have inconsistent Escape behavior and no managed focus — U/C

**Reproduce:** Escape closes a material drawer; opening Scenario with no selected material and pressing Escape leaves it open. Scenario has independent markup but is not represented by a unified panel state. Neither drawer establishes an initial focus, restores trigger focus, or implements a clear modal/nonmodal keyboard model.

**Impact:** users cannot consistently dismiss or navigate panels; changing underlying state may replace a Scenario panel with a material drawer because selected-material state survives.

**Recommend / acceptance:** one explicit drawer state, consistent Escape, named close action and focus restoration. Choose modal behavior with an appropriate focus boundary or a clearly navigable nonmodal panel. Correct tab semantics and keyboard navigation. Location: `main.js:openScenario/wireChrome`, `detail.js:renderDrawer`.

### Saving, sharing and state recovery

#### F42 · P1 · JSON import does not restore the complete visible state — C

**Reproduce path:** save a scenario with a different lens, baseline, columns, estimate setting and open material; load it into an already-running session. The import handler assigns `state.scenario` and `showStates`, but does not synchronize `state.lens`, `baseline`, `columnSet`, `useEstimates`, or `selectedMaterialId`, unlike startup.

**Impact:** imported settings and screen disagree; calculations may use an old estimate toggle. A subsequent reload can then show a different view from the immediate import result.

**Recommend / acceptance:** use one validated scenario hydration function at startup/import/hash navigation and apply it atomically. Test a full nondefault round trip. This is code-confirmed; the native file-picker trial was interrupted before completing a UI round trip. Location: `main.js:sc-import`, startup.

#### F43 · P1 · Shared links omit decision state and local-file links are malformed — C/D

**Reproduce:** hash serialization omits search, sort, subset, verdict visibility, assumptions, snapshot and version. An assumption-bearing scenario loses assumptions when passed through `toHash/fromHash` (probe confirmed). Evidence-dot navigation does not update `scenario.openMaterial` or selected evidence tab. Copy link constructs `location.origin + location.pathname`; for a file URL the origin is `null` rather than `file://`.

**Impact:** “reopens the same requirements and view” is not true for several common states. A local path would not be portable to a friend even if properly constructed. Snapshot omissions can silently change results after database updates.

**Recommend / acceptance:** define and serialize a complete reproducibility contract, including snapshot/version and assumptions. For local files, offer scenario export or a supported hosted share URL with an explicit portability explanation. Opened evidence should be addressable if sharing promises the current view. Location: `scenario.js`, `main.js:sc-link/openMeasurement`.

#### F44 · P2 · Browser history and hash changes do not act like app navigation — C

**Reproduce:** all state updates use `history.replaceState`; the app only reads the hash during startup and has no hashchange/popstate listener.

**Impact:** Back does not undo a filter or return from a material; changing the fragment without reloading may leave the URL and screen inconsistent. Users have no undo for template replacement or reset.

**Recommend / acceptance:** distinguish navigational actions from transient edits and implement the intended history contract. Provide an undo path for major requirement changes. Reopening an actual history entry must restore its visible state. Location: `main.js:pushHash/start`.

#### F45 · P1 · Scenario deserialization accepts structurally invalid state — D/C

**Reproduce:** `deserialize('{"version":1,"constraints":null}', meta)` succeeds and returns null constraints. Unknown constraint kinds later throw; other arrays, identifiers, plot settings and assumptions receive no complete schema validation. Import changes active state before rendering detects errors.

**Impact:** a corrupted/edited saved file can poison the running session instead of being rejected safely. A malformed hash can similarly start a broken app or be silently replaced with defaults.

**Recommend / acceptance:** validate shape, enums, finite numbers, known IDs and shortlist capacity before committing any state; preserve the current session on error. Provide actionable validation messages and a clean-start recovery. Location: `scenario.js:deserialize/fromHash`, `main.js:sc-import`.

### Charts, coverage and language

#### F46 · P2 · Parallel's empty-axis and single-candidate states are wrong — C

**Reproduce:** uncheck every axis: an empty saved array falls back to the four defaults. With exactly one usable material, `usable.length < 2` renders “No candidate has all … properties,” although one does.

**Impact:** checkboxes seem to reverse themselves, and a narrowed search is falsely described as missing data.

**Recommend / acceptance:** preserve an intentionally empty axis choice and request at least two axes; distinguish zero usable materials from one. A single-material profile can be drawn or explicitly described without claiming none exist. Location: `parallel.js:chosen/usable`.

#### F47 · P2 · “Each dot is one test” overstates measurement-pair semantics — U/C

**Reproduce:** measurement mode reports “18 tests across 11 of 14 candidates” in the inspected case. Implementation pairs compatible X and Y measurements using nested loops within grade. A coordinate is a compatible pair of property records, not necessarily a single physical test or specimen. Strict stiffness mode also requires XY, while help promises differences between print directions.

**Impact:** plotted point count can be mistaken for independent testing; a user expecting Z comparisons in ordinary measurement mode is misled.

**Recommend / acceptance:** say “compatible measurement pairs,” report unique records/grades separately, and explain exactly which mode admits other directions. If paired-test identity is unavailable, do not infer it. Location: `ashby.js:measurementPoints`, `axes.js:measurementMatches`.

#### F48 · P2 · Performance-index tally duplicates materials and advertises nonexistent table ranking — C

**Reproduce:** the index card passes `pts.map(q => q.material)` to `countAbove`; repeated measurement pairs duplicate canonical materials, and index values use their headlines rather than each plotted pair. The cost-index warning says these indices are ranked in the table, but the table has no index-ranking path.

**Impact:** “above the line” can describe neither unique candidates nor the actual displayed measurement dots. A promised ranking cannot be found.

**Recommend / acceptance:** decide whether the index applies to headline candidates or plotted evidence and use that unit consistently, deduplicating as appropriate. Implement a visible ranking or remove the claim. Verify counts in all three Show modes. Location: `ashby.js:renderIndexCard`, `table.js`, `indices.js`.

#### F49 · P2 · Chart guidance and filtering state are not consistently tied to the chosen axes — C

**Reproduce:** the frontier note always says “below and to the right” is worse, although axis choices can require different better directions. Measurement-level Price errors instruct switching “Points back to Headline,” controls which no longer exist under those names. The estimated-material message can say every candidate has measurements whenever the computed estimate list is empty, including measurement mode or cases with no usable estimate. Lasso subsets affect results but are not persisted in links.

**Impact:** generic explanatory text becomes false under legitimate control combinations; users cannot distinguish missing evidence, hidden traces, selected subset and viewport zoom.

**Recommend / acceptance:** generate axis-direction guidance from `better`; use current control names; distinguish measured/estimated/unplottable populations. Display and clear subset/hidden-trace state explicitly. Test Price plus every Show mode, swapped axes, same axes and empty subsets. Location: `ashby.js`, `main.js:subset`.

#### F50 · P2 · Coverage cells open the wrong destination and can show mismatched explanations — U/C

**Reproduce:** click ABS's Mechanical coverage cell: Overview opens, not Mechanical/Coverage. Every cell calls `openMaterial` without domain context. Matrix status chooses the weakest record, while the tooltip finding uses the first record, which need not be the one determining that status.

**Impact:** clicking a specific gap starts another hunt; a tooltip can explain a different record from the displayed state.

**Recommend / acceptance:** route to the clicked domain and highlight the decisive records. Derive tooltip and displayed state from the same evidence set. Explain that recorded coverage is not adequacy or material quality. Location: `heatmap.js`, `coverage.js:coverageMatrix`.

#### F51 · P2 · Plain-language vocabulary is incomplete and sometimes scientifically misleading — U/C/H

**Reproduce:** main table says Stiffness, but Parallel axis checkboxes read “Tensile modulus XY,” “Elongation at break XY” and “HDT at 0.45 MPa.” Compare prints `requires-hardened` and `unknown`. “Ashby,” “Parallel,” “Scenario,” “reinforcement,” and GPa/MPa require prior knowledge. Stretch help says “high means tough and bendy,” conflating different behaviors.

**Impact:** the novice must learn internal terminology to complete ordinary tasks; simplified copy can introduce a false physical equivalence.

**Recommend / acceptance:** apply shared labels to every control and fallback state; add short task descriptions to chart tabs and name Scenario “Save / share selection.” Explain stiffness, strength, stretch and toughness separately without requiring a materials-science lesson. Location: `axes.js`, `parallel.js`, `compare.js`, `labels.js`.

#### F52 · P3 · Redundancies and historical “fixed” claims obscure the remaining work — U/C/H

**Reproduce:** six templates appear both on the start panel and in Scenario; Reset exists in rail and active header; Why excluded tab and “Why the rest were excluded” button do the same action; shortlist names repeat in tray and Compare header. “Relax” removes an entire criterion rather than changing its threshold. The earlier audit says one vocabulary and working evidence navigation are fixed, but Parallel labels and Compare dots contradict that.

**Impact:** repeated controls are not automatically bad, but inconsistent labels and unclear scope make users infer different functions. Historical completion claims can hide regressions from maintainers.

**Recommend / acceptance:** retain duplicates only where they provide useful local access, use identical labels/semantics, and label removal “Remove requirement.” Replace blanket “fixed” status with versioned acceptance evidence. Do not delete useful contextual actions merely to reduce control count.

### Missing workflows and handoff fidelity

#### F53 · P2 · Common printer decisions have evidence but no guided user path — C/H

**Reproduce:** look for support pairing, hardness, interlayer strength, print orientation, warping, surface finish, colour availability, food-contact suitability, fatigue or outdoor lifetime. Some are sparse evidence in detail tabs; others are absent. The home limitations disclosure is useful but disappears once requirements are active.

**Impact:** users either abandon the app or substitute a nearby but inappropriate metric (stretch for toughness, HDT for long-term service temperature, material role for support compatibility).

**Recommend / acceptance:** provide persistent “Can this tool answer my question?” guidance and task-oriented routes to existing evidence. Explicitly say when the dataset cannot answer. Prioritize support pairing, print setup and grade verification before adding more chart modes; collect new evidence only where needed.

#### F54 · P2 · Snapshot, offline and market scope need clearer action-level messaging — U/C/H

**Reproduce:** the local bundle opens successfully and shows a data date. “Only show what I can buy” sounds current, though data is three sampled Canadian retailers from one date. Sources and shops need network access, while copied local selections are not portable. Several UI counts/dates are hardcoded.

**Impact:** users can overread sampled availability as current availability or assume a local share link works elsewhere. Hardcoded metadata may drift after a data update.

**Recommend / acceptance:** use “Listed in the Canadian snapshot” and “In stock when sampled”; derive counts/dates from data. Explain network requirements at outbound actions and provide portable scenario files. Live stock, external-link health and other browsers were not verified here.

#### F55 · P1 · CSV export loses failure reasons and decision provenance — D/C

**Reproduce:** the retained sample export uses an impossible density constraint to generate FAIL rows. “Held by” is empty for genuine failures because it exports only `e.heldBy`, not failed criteria/reasons. Rows carry central headline numbers without complete intervals, grade/measurement/source identities or the actual scenario requirements. Estimated fields export even when estimates are not being used.

**Impact:** “CSV, with the four states and what held each one out” overpromises. A colleague cannot reconstruct why rows failed or distinguish inactive estimate metadata from decision inputs. Export order also follows state rows, not the user's table sort.

**Recommend / acceptance:** export evidence verdict, eligibility, each criterion/result/reason, active policy/estimates, source IDs and numeric bounds; preserve visible ordering or state the export contract. Include a scenario sidecar if needed. Handle scenario assumptions explicitly rather than exporting them as ordinary measured numbers. Location: `table.js:toCSV`, `main.js:sc-csv`.

#### F56 · P2 · Shortlisting is incomplete outside the table and its capacity is poorly signposted — U/C

**Reproduce:** stars add/remove pins and a seventh pin produces an alert. Compare tells users to click an Ashby point “and pin it,” but clicking a point only opens a material drawer, which has no pin button. The drawer also provides no immediate “compare this” action. Shortlist column headers are sortable despite having no meaningful sort value.

**Impact:** discovery through charts ends without the promised next action; users must return to Table and relocate the material. Capacity is only explained after exceeding it.

**Recommend / acceptance:** add a consistent Add/Remove shortlist control to detail and useful chart context; show N/6 and a clear replace/remove path. Make the shortlist heading nonsortable or implement a meaningful pinned-first sort. Location: `main.js:togglePin`, `detail.js`, `compare.js:empty`, `table.js:head/cellValue`.

## 3. Control-by-control inventory

**Evidence column:** U means the control/surface was observed or exercised in Chrome; C means the application handler/rendering was reviewed; D means data/engine behavior was reproduced. U does not mean every row of a repeated control, every option, or every boundary case was clicked. “Pending” identifies runtime checks not completed. Controls with a shared handler are grouped, with all variants named.

| Control / location | Actual action and placement assessment | States and edge cases to cover | Evidence / outcome |
|---|---|---|---|
| Search / header | Filters by word-prefix tokens; good global placement, narrow placeholder truncates | Empty, case, punctuation, canonical name, grade ID, brand, typo, filtered match, lasso subset | U/C; no-match recovery broken, F23; product names not indexed |
| `/` shortcut | Focuses search unless target tag is INPUT | Select, textarea, dialog, ordinary page focus | C; should be scoped to avoid stealing input from future editable controls |
| Leave it out / header | Sets Strict and resets visible verdicts to PASS | No requirements, only unknown evidence, existing pins, existing FAIL visibility | C/D; F26, policy-versus-verdict confusion |
| Keep it, flagged / header | Sets Explore and shows PASS + UNKNOWN | Mixed failures/unknowns; estimates on/off | C/D; mechanism sound in engine tests, needs clearer aggregate semantics |
| Estimates checkbox / header | Only appears in Explore; changes engine inference use | No inferable data, estimated exclusions, switching policy, loaded scenario | C/D; F42–F43, F49, F55 |
| Scenario / header | Replaces drawer host with save/share/template panel | From each lens; material already open; zero requirements | U/C; name conceals main save/share functions; F31, F41 |
| Theme / header | Toggles light/dark, writes local preference, rerenders lens | System preference, localStorage unavailable, active plot zoom, open drawer | C; two labelled states; full theme/persistence visual matrix pending |
| Data date / header | Noninteractive metadata; tooltip says open Scenario | Narrow header, snapshot update | U/C; not a button; F54 |
| H2C-relevant only / top rail | Adds/removes scope gate | Clean start, six excluded materials, other printer gates | U/C/D; label/pill overclaim, F05–F06 |
| Rail Reset | Clears constraints and template | Active search, pins, Explore, non-Table lens | C; F24 |
| Mechanical disclosure | Expands density/stiffness/strength/stretch | Manual collapse, then any full rerender | U/C; F28 |
| Thermal disclosure | Expands heat threshold | Active/inactive, rerender | U/C; F28 |
| Cost disclosure | Expands price, preference, availability | Active template price; manually opened inactive group | U/C; F28 |
| Environment disclosure | Expands six verdict checkboxes and limitation note | Multiple exposures, mixed records, unsupported categories | C/D; F08–F09 |
| Manufacturing disclosure | Expands filler classes and drying schedule | Multiple OR selections, no data | C; F15, F51 |
| Evidence disclosure | Expands exact-grade/no-conflict controls | Empty measurement set; quarantined/non-numeric evidence | C; definitions need to match user's selected properties/grade, not merely any measurement |
| Compatibility disclosure | Expands status, thermal gates and hardware checkbox | Scope alone opens this group; narrow rail scrolling | U/C; F06–F07, F28 |
| Density operator + value | Sets mass-density requirement in kg/m³ | All four operators; blank→operator first; zero/negative/decimal; boundary interval | C/D; F16, F29–F30 |
| Stiffness operator + value | Sets XY modulus requirement in GPa | Same shared input cases; related value but absent headline | C/D; F29–F30, F35 |
| Strength operator + value | Sets XY headline strength in MPa | Yield/break/unspecified endpoint; unknown direction | C/D; missing comparable evidence must not be read as weak material |
| Stretch operator + value | Sets elongation-at-break threshold in % | Very high flexible values; uncertainty; >/< bounds | C/D; F04, F16, F51 |
| Heat operator + value | Sets HDT 0.45 MPa threshold | Unstated load; same displayed rounded number at boundary | U/C/D; F17 |
| Price operator + value | Sets sampled median CAD/kg threshold | Missing prices, pack versus kg, bad sample identity, decimals | C/D; F11–F12 |
| Six numeric × buttons | Remove that numeric criterion | Last criterion, focused input, preference on | C; accessible label should name the property rather than just Clear |
| Six Preference only checkboxes | Make each numeric requirement nonmandatory | Toggle hard→soft→hard; no other hard criteria | C; does not rank, F27 |
| Only show what I can buy | Adds offer-exists gate | No sampled listing versus out of stock; Explore unknowns | C/D; underlying distinction correct; misleading present-tense wording, F54 |
| And it was in stock | Adds in-stock requirement; disabled until offer filter on | Parent off/on, old stock, unknown price | C/D; sample-day semantics must stay explicit |
| Acid / alkali / solvent / oil-grease / flammability / water-solubility checkboxes | Add category requirements accepting resistant or limited | Limited-only, contrary-only, mixed, no verdict, different exposure/grade | C/D; F08–F09 |
| Carbon fibre / glass fibre / unfilled / ESD / foaming / undisclosed | OR choices within reinforcement facet | Select none, several, all; class labels versus actual filler | C; ESD/foaming are not ordinary reinforcement classes; F51 |
| Drying schedule published | Keeps materials whose compiled drying gate is required | Recommended schedule, no schedule, different grades | C; F15 |
| Exact-grade measurement exists | Checks whether any numeric grade-linked measurement exists | Property needed by scenario absent; source quarantined; exact grade not selected | C; label should explain “any property on any recorded grade” unless strengthened |
| Exclude unresolved conflicts | Rejects material with Conflict/Quarantined coverage records | Conflict in irrelevant domain, missing coverage, measurement quarantine | C; displayed hardcoded conflict/quarantine counts require reconciliation with the two quarantined measurements in validation |
| Official Bambu product / officially listed family / conditional / theoretical | OR choices for recorded H2C status | None/all, imported unknown status, scope gate combined | C; explain status definitions and snapshot basis |
| Nozzle ≤350 / bed ≤120 / chamber ≤65 baseline | Adds each independently summarized temperature gate | Multiple profiles, known exceeds plus unknown, recommendation, no profile | U/C/D; F06, F14 |
| I have a hardened nozzle | Adds abrasion gate with `hardenedAvailable:true` | Owns/doesn't own/unknown hardware | U/C/D; F07 |
| Six home template cards | Replace requirements, set Strict, retain other state | First use, edited filters, search, pins, nondefault columns | U/C/D; all six engine outputs recorded; F01–F04, F31 |
| What this database does not cover | Expands home gap guidance | Before/after first criterion; touch/keyboard | U/C; useful content, persist route after start panel disappears, F53 |
| Requirement pills × / Table header | Remove complete criterion | Last hard constraint, soft-only state, edited template | U/C; scope wording and removal semantics, F06, F52 |
| Table-header Reset | Same requirement reset as rail | Same cross-state cases | U/C; duplicate can be useful if named Clear requirements, F24 |
| Why the rest were excluded | Opens Why excluded lens | Search/subset active, no actual failed criteria | U/C; terminology and context, F25–F26 |
| Table tab | Renders active/start header and rows | Empty search, empty eligibility, hidden states, pins | U/C; F23–F25 |
| Ashby tab | Renders paired-property plot | Empty, one point, many, mixed states, missing axes | U/C; F47–F49 |
| Parallel tab | Renders multiaxis SVG | Zero/one/all axes; zero/one/many complete candidates | U/C; F46 |
| Coverage tab | Renders filtered-set completeness | Search/subset, no rows, mixed records | U/C; F50 |
| Compare tab | Renders pinned materials, independently of result membership | Zero/one/two/six pins, one+baseline, disqualified pins | U/C; F32–F35 |
| Why excluded tab | Ranks each criterion's removal/recovery impact | Strict/Explore, preference-only, unknown-only, zero recovery | C/D; useful counterfactual calculation; wording doesn't adapt enough |
| Properties / Printing segment | Changes table columns; keeps candidate set | Sort key no longer present, loaded column set | U/C; F14–F15, F42 |
| Compare against / Table | Adds familiar ghost row | Same material also candidate, missing values, empty results | U/C; reference qualification, F18 |
| Material / Result / property / print / price headers | Sort table; missing values last | Asc/desc, keyboard, tied values, related values, export ordering | C; sortable header treatment useful; F55–F56 |
| Shortlist header | Currently sortable too, but no meaningful underlying pin value | Asc/desc after pinning | C; remove false sorting affordance or sort pinned first, F56 |
| Material row | Opens Overview by click or row Enter | Click nested star/link/evidence, baseline row | U/C; F40 |
| Star / table row | Adds/removes pin up to six | Keyboard Enter/Space; seventh item; excluded result | U/C; two pins exercised; capacity boundary code-reviewed, F56 |
| Evidence dot / Table | Opens exact measurement and highlights it | Multiple sources/measurements; keyboard; share afterward | C; functional route exists; tiny target and incomplete URL state, F39, F43 |
| Price link / Table | Opens selected retailer URL in new tab | Missing numeric price, out of stock, variant mismatch | U/C/D; link target inspected; external navigation/stock not verified, F11–F12, F21 |
| PASS / UNKNOWN / FAIL footer chips | Toggle displayed verdicts; disabled at zero | Last active chip, strict unknowns, search counts | U/C; F25–F26 |
| Clear selected region / count | Clears lasso subset | Search + subset, filters changed, shared link | C; important recovery but subset not serialized, F43, F49 |
| Shortlist chip × | Removes one pin | Last item, Compare becomes empty, drawer open | U/C; handler reviewed; restore sensible focus |
| Clear all / shortlist tray | Empties shortlist, leaves filters | Compare active, last item, mistaken click | U/C; predictable scope; optional undo would reduce recovery effort |
| X / Y axis dropdowns | Choose one of six headline properties | Same property both axes, missing values, Price in measurement mode | U/C; F49 |
| Linear / Log for each axis | Changes plotting scale | Nonpositive values, index line, switching axes | U/C; both Log states exercised; broader numerical viewport tests pending |
| Show: one dot / every measurement / mixed conditions | Changes point construction | Price axis, XY/Z, absent matching pairs, uncertain values | U/C; ordinary measurement mode exercised; F47, F49 |
| Best for a given weight | Selects named index case | Compatible axes, cost forms, missing prices, measurement mode | C; F48 |
| Move the line slider | Updates index threshold and plot | Min/max, zero evaluable values, repeated point IDs | C; unique-count and basis issue, F48; runtime drag pending |
| Estimated materials / chart | Draws inference envelopes when available | Explore on/off, no peers, measurement mode, same axes | C; misleading absent-envelope message, F49 |
| Compare against / chart | Adds reference cross | Missing baseline axis, already eligible/pinned, index tally | C; chart reference should remain visibly separate and qualified |
| Also steel, aluminium, wood | Adds generic envelopes | Log scale, all axis pairs, missing reference property | U/C; exercised; caveat appears and candidate count is unchanged |
| Chart point | Opens material Overview | Repeated measurements, baseline point, missing customdata | C; no drawer pin action and no direct clicked-measurement context, F56 |
| Chart legend entries | Plotly trace hide/show | All hidden, frontier still visible, counts not reflecting hidden traces | C; library interaction runtime matrix pending; explicit hidden state needed |
| Chart Zoom / Pan | Plotly gesture modes | Accidental drag, touch, switching lens | U (visible)/C; not every gesture exercised |
| Chart Lasso Select | Changes app candidate subset | Empty lasso, duplicates, reference-only selection, clear subset | C; runtime gesture not completed; F43, F49 |
| Zoom in / Zoom out / Autoscale / Reset axes | Plotly viewport operations | Custom zoom then change filter/theme; log/reference mode | U (visible)/C; reset naming should distinguish view reset from requirements |
| Download plot as PNG | Plotly image export | Legibility, filename, clipped legend, missing scenario caption | U (visible); downloaded output not verified |
| Share chart… | Third-party Plotly toolbar affordance | Offline copy, destination and data content, distinction from app share | U (visible); action not executed; remove or clarify unless deliberately supported |
| Six Parallel axis checkboxes | Set chosen property set | Uncheck all, exactly one, one usable material | U/C; F46, F51 |
| Parallel line hover/click | Highlights line; opens Overview | Dense overlap, keyboard, only one material | C; F39, F46 |
| Coverage material name | Opens Overview | Filtered-out pinned material, keyboard | U/C; appropriate for name, unlike cell-specific action |
| Coverage domain cells | Opens Overview, regardless of domain | Gap/conflict/partial/no-record, multiple underlying records | U/C; F50 |
| Compare baseline picker | Adds reference if not already pinned | Same as pinned, no value, one pin | U/C; F33 |
| Compare Print summary | Calls browser print | Two/six pins, long labels, full context, page breaks | U (visible)/C; output pagination pending, F37 |
| Compare evidence dots | Rendered without click handlers | Any known measurement | U/C; F34 |
| Drawer Close × | Clears material drawer and updates scenario | Evidence jump versus normal open, keyboard focus | U/C; F41, F43 |
| Overview tab | Summaries, key values, requirements | Unknown, excluded, assumed material, explicit AMS negative | U/C; F10, F13–F19 |
| Mechanical tab | All mechanical measurement rows and missing topics | Many records, quarantine, conditions, source navigation | C; F19–F20 |
| Thermal tab | Thermal records and missing topics | HDT load, annealing, test temperature, unknown | C; F17, F19 |
| Printing tab | Profile text, setup, routing and source IDs | Multiple grades, ambient, required/recommended, no profile | U/C; F14–F15, F22 |
| Environment tab | Grouped narrative evidence | Badge count counts filterable evidence, body also includes other evidence | C; badge can understate available narrative content; F22, F53 |
| Grades tab | Manufacturer/product/composition/colour caveat | Multiple grades, no colour range, certifications, source IDs | C; F13, F22 |
| Price tab | Offer table | No prices, missing kg/price, stock, six ABS rows | U/C/D; F11–F12, F21 |
| Evidence tab | Measurements grouped by source | No measurements but other evidence exists, source links, long list | U/C; F19–F22 |
| Coverage tab / drawer | Coverage records and findings | Conflicts, long text, no record | C; useful full record, no crosslink from matrix cell |
| Evidence dot / Overview | Opens Evidence and highlights target | Multiple targets, keyboard, context qualification | C; F19, F39, F43 |
| Scenario Close × | Only empties drawer host | A material was selected earlier; Escape | U/C; F41 |
| Export candidates / Scenario | Downloads CSV of `state.rows` | Sort, search, failing rows, no rows, assumptions, estimates | C/D; sample generated through export function; browser download not verified, F55 |
| Copy link / Scenario | Clipboard write, prompt fallback | Local file, denied clipboard, snapshot changes, subset, assumptions | C/D; F43 |
| Save scenario / Scenario | Downloads serialized JSON | All nondefault state, Unicode, assumptions, file naming | C; file payload path reviewed; full browser round trip pending |
| Load scenario / Scenario | File picker, deserialize, replace scenario | Cancel, malformed shape/version, unknown IDs, different snapshot | C/D; UI attempt interrupted; F42, F45 |
| Six Scenario template buttons | Same six templates as home | Different active lens/search/pins; panel closure | C/D; F31, F52 |
| Escape / global | Closes material only if selectedMaterialId exists | Scenario-only, stacked context, focus restoration | U/C; F41 |

## 4. Data coverage and what the numbers do not prove

| Evidence domain | Confirmed snapshot state | Product implication |
|---|---|---|
| Canonical materials | 102; 96 in H2C research scope, six excluded | Scope must not be labelled blanket printability |
| Commercial grades | 136 | A canonical material can represent multiple products; final grade binding is missing |
| Measurements | 1,807; 1,668 numeric; two quarantined | Record volume is not independent test count or completeness for the selected question |
| Headline density / stiffness / strength / elongation / HDT / price | 88 / 70 / 52 / 72 / 66 / 40 materials | Missing comparable headlines must be distinguished from no evidence |
| HDT load qualification | 24 of 66 headlines have unstated load | Compact visual comparison must preserve this qualification |
| Printing profiles | 156 | Aggregated windows must not be presented as one recipe |
| Canadian offers | 104 observations; 48 materials have an offer; 42 had any stock | Median price, selected offer, live availability and purchasability are separate questions |
| Source register | 214 | Sources should be actionable from every evidence type, not just property measurements |
| Coverage records | 1,106 | “Evidence recorded” is not proof that a user's requirement can be decided |
| UV/outdoor; food contact; creep; fatigue | 6; 2; 2; 5 narrative records, respectively; no reducible verdicts | Do not imply these application questions were tested by a template |
| Family estimates | 126 | Keep inference separate; estimates may exclude only under the stated policy, never certify a match |
| Materials with no property measurements | 12 | A visible unknown can be useful; do not relabel it unsuitable merely because evidence is absent |

The fresh compile matched the existing compiled database exactly. The source workbook and application logic are therefore consistent at this snapshot, including the problems above. **Source correctness requires semantic review beyond the current validator.** In particular, CA0069's product identity and the HDT locator/load discrepancies need source checking before any data correction. No live manufacturer or retailer claim was independently recertified in this audit.

## 5. Recommended implementation order — not implemented

1. **Prevent misleading choices:** F01–F03, F05–F11, F13–F14, F17, F26 and F32. Start with the wrongly named chamber template, support-role leakage, scope wording, limited-resistance PASS, AMS negative evidence and ABS price identity.
2. **Restore the decision and evidence paths:** F19–F23, F34, F38–F43, F45 and F55. A user must recover from search, read the real evidence, use the app at zoom, and preserve a selection without changing its meaning.
3. **Make ordinary editing predictable:** F24–F31, F33, F35–F37, F46 and F56. Clarify reset, drafts, preferences, shortlist, comparison and print behavior.
4. **Finish chart semantics and product language:** F04, F12, F15–F18, F44, F47–F54. Reconcile point/index units, copy, reference qualifications and missing-workflow guidance.

Several findings span more than one phase; the ordering is a risk-based backlog, not a dependency graph. Do not “fix” sparse data by inventing values, broadening pass criteria, or silently dropping qualifications.

## 6. Acceptance checks before calling the final product tested

| Test group | Concrete acceptance condition | Current evidence |
|---|---|---|
| Six templates | Every name matches actual gates; untested application requirements appear beside results; no support-only product in build-part shortlist | All six engine outputs checked; several fail semantic assessment |
| First-run states | No PASS without testing; H2C scope explained consistently in rows/pills/counts | UI failure reproduced |
| Search/recovery | Empty/typo/brand/excluded/hidden/subset states have different explanations and working recovery actions | No-match failure reproduced |
| Filters | Operator-first works; invalid input explained; focus/disclosures retained; hard and soft effects visible | Code findings; full keyboard edit sequence pending |
| Evidence semantics | Unknown, failed and indeterminate remain distinct through all views and exports | Engine/material aggregate inconsistency confirmed |
| Shortlist/Compare | 0/1/1+baseline/2/6/7 attempts; current verdict shown; sources clickable; no unintended row opening | Two-pin UI checked; remaining boundaries code-reviewed |
| Saved selection | Full nondefault JSON and URL round trips restore all committed state; malformed input leaves previous state intact | Serialization defects reproduced; native import round trip pending |
| Charts | All six axes × three Show modes; swapped directions; unique index counts; no false empty-state copy | Main chart and measurement mode inspected; full combination matrix pending |
| Output | CSV reasons/provenance/order correct; PNG readable; printed two/six-pin summary carries question and qualifications | CSV function output inspected; browser download/print rendering pending |
| Accessibility | Keyboard path through search/filter/pin/compare/evidence/close; named targets; focus restored; 200% zoom usable | AX/code issues and 150% zoom failure confirmed; screen-reader audit pending |
| Portability | Local-file share handled explicitly; offline launch; readable external-source failure; tested Chrome/Firefox/Safari | Local Chrome launch confirmed; remaining browser/offline matrix pending |
| Data integrity | Semantic offer/material mapping checked; one qualifying grade/profile identified; HDT qualifiers reviewed from source | Fresh compile matches; semantic issues found; primary-source adjudication pending |

## 7. Strengths to preserve

The self-contained local file opens without an installation flow. The start cards provide an entry point. Headline reconciliation and quarantine tests are valuable, as are the engine's interval handling and refusal to invent an HDT load. Missing-offer logic correctly avoids claiming that absence from three retailers means market unavailability. Separate measured/related/estimated representations, reference-only baseline intent, counterfactual exclusion recovery counts and the detailed source/grade database provide a strong foundation.

The next pass should make those distinctions survive every click, comparison and export. The main issue is not a lack of charts; it is whether the user can act on the final screen without drawing a stronger conclusion than the evidence supports.

## 8. Source map and audit artifacts

Paths below are relative to this report. Finding locations use function/section names so they remain useful if line numbers move.

| Area | Source |
|---|---|
| State, actions, import, share, chrome | [main.js](../../app/js/main.js) |
| Shell and persistent controls | [index.html](../../app/index.html) |
| Templates and active query | [templates.js](../../app/js/ui/templates.js), [start.js](../../app/js/ui/start.js) |
| Filter rendering and handlers | [filters.js](../../app/js/ui/filters.js) |
| Table, sorting and export | [table.js](../../app/js/ui/table.js) |
| Shared numbers and labels | [format.js](../../app/js/ui/format.js), [labels.js](../../app/js/ui/labels.js) |
| Detail tabs and evidence | [detail.js](../../app/js/ui/detail.js) |
| Compare | [compare.js](../../app/js/ui/compare.js) |
| Ashby, axis matching and Parallel | [ashby.js](../../app/js/ui/ashby.js), [axes.js](../../app/js/ui/axes.js), [parallel.js](../../app/js/ui/parallel.js) |
| Coverage and exclusion UI | [heatmap.js](../../app/js/ui/heatmap.js), [explain.js](../../app/js/ui/explain.js) |
| Evaluation and scenario serialization | [constraints.js](../../app/js/engine/constraints.js), [scenario.js](../../app/js/engine/scenario.js) |
| Index and coverage calculations | [indices.js](../../app/js/engine/indices.js), [coverage.js](../../app/js/engine/coverage.js) |
| Data compilation | [compile.js](../../build/src/compile.js) |
| Responsive layout and print rules | [app.css](../../app/css/app.css) |
| Historical audit, independently rechecked | [earlier audit](../UX-AUDIT.md) |
| Template candidate sets and suspicious records | [data-probes.json](data-probes.json) |
| Fresh in-memory compilation check | [validation-check.json](validation-check.json) |
| Synthetic failure export for inspection | [sample-export.csv](sample-export.csv) |

**Change boundary:** only this audit directory was added. No fixes, dependency changes, database edits, commits or publication were performed. UI screenshots were inspected during the session; no screenshot files are claimed as retained artifacts. Findings based on those observations are labelled U, and their code/data support is recorded above.
