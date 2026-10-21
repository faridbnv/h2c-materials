# Rule-to-test map for the selection engine (constraints.js)

> **Summary.** 222 rules in app/js/engine/constraints.js (1,246 lines, frozen).
> **Covered by a unit test:** 120. **Reached, not asserted:** 86 reached by the parity corpus (engine surface), 5 reached only by a unit run or by no corpus case.
> **UNTESTED:** 11 (neither a test nor the corpus reaches the branch, or no test would fail if it changed identity or the input could not occur today).

## How this was derived

Date 2026-10-21. All line numbers are of the frozen app/js/engine/constraints.js (1,246 lines) in the wp-19 worktree. I read the file in full and wrote each rule from the code, then checked each range against the lines. Evidence came from V8 coverage, not from guessing: (1) each of the 26 test files that import an engine module (`grep -l "engine/" test/*.test.js`) was run alone under `NODE_V8_COVERAGE`, and (2) one run of `node packages/parity/src/cli.ts --noop --surface engine` (old engine twice; result "zero" differences) was recorded the same way, with the three loaded copies of constraints.js merged. A rule counts as reached when the expression that holds it ran at least once, checked at the position of the branch, not only the line. "Covered" is stricter: I opened the named test and found an assertion that would fail if the rule changed; where a test only runs the branch, the row says "reached, not asserted" in the test cell and its status is "reached". The corpus compares every record of the answer between old and new, so a reached line there means a change would be seen as a difference, but the corpus asserts nothing specific, so I use "reached". Not done: the parity `ties`, `links`, `build` and `pages` surfaces were not run; test files that do not import an engine module were not run (they could reach the engine through the interface code); the corpus size (1,306 questions) is the plan's figure, not recounted. Test tags: CT test/constraints.test.js; SP selection-products; PS product-screening; SC screening; MM metamorphic; EL evidence-ledger; PE polymer-environment; GV gate-verdicts; BD bounds; OA own-anchor; SN scenario; AC acceptance (all `test/<name>.test.js`); `:N` is the line of the `test(` call or, where said, of the assertion.

Two findings first. The corpus's engine surface never calls `explainExclusions` (lines 1204-1245) or `publishedBound` (87-90), nor the filler facet (593-601), the unsupported-kind and unsupported-operator errors, or the "sheets disagree" answer of the ledger (373-377); those rely on unit tests alone, and for the filler facet there are none.

## 1. STATUS, GATE_STATUS and the unknown-data policy (lines 19-65)

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-01 | A requirement's answer is one of four words: PASS, FAIL, UNKNOWN, INDETERMINATE. | constraints.js:19-24 | Tests compare against the constant `STATUS`, so a changed word would not fail them | reached (every record carries the words) | reached |
| CR-02 | A print-gate verdict maps to an answer: within and within-low-end pass; edge and exceeds-recommended are indeterminate; exceeds fails; unknown is unknown. | constraints.js:33-40 | GV:14 "build, engine, page and contract know the same gate verdicts" (key order); GV:32 "a chip is coloured by the engine's own answer" (lines 34-38 assert five of six literally); CT:80, CT:89 | reached | covered |
| CR-03 | The two policy words are `strict` and `exploration`. | constraints.js:42-45 | Tests use the constant; SN:46 round-trips a link | reached | reached |
| CR-04 | Anything that is not exactly `exploration` counts as `strict` (hand-edited or old links). | constraints.js:55-57 | CT:147 "an unrecognised unknown-data policy falls back to strict" (six bogus values) | reached | covered |
| CR-05 | A number in a criterion or reason is shown to at most six decimals with trailing zeros dropped; a non-finite value is printed as is. | constraints.js:59 | Reasons asserted at CT:435 ("4.95 GPa") and CT:472 ("4.8 ± 0.3") show the plain case; six-decimal rounding and the non-finite branch are not asserted | reached | reached |
| CR-06 | In a reason read by a person, the whole part is grouped by thousands from 1,000 ("1,260"). | constraints.js:60-64 | CT:435 line 447 asserts "Published 1,260 kg/m³"; negative numbers not asserted | reached | covered |
| CR-07 | A range with open ends reads "a to b", "at least a" or "at most b", with the unit after. | constraints.js:66-67 | none asserts the words ("at least/at most" branches run only inside SC:24 random scenarios) | "a to b" reached; the open-end words not reached | reached |
| CR-08 | A lower-only interval is a bound: "more than" (>) if its end is open, "at least" (≥) if closed; a point, a range or a mean with a band is no bound. | constraints.js:69-80 | BD:73 asserts "more than 300 %" (open lower); BD:40 asserts the glyph with a loose pattern (≥, ≤ or >) | reached (open lower, open upper) | covered |
| CR-09 | An upper-only interval is a bound: "less than" (<) if open, "at most" (≤) if closed. | constraints.js:79 | The closed form (≤) is reached by no test and no corpus case | closed form not reached | UNTESTED |
| CR-10 | A headline entry shows a bound only when its own interval is one; a material's median counts only if it is the typical product's value. | constraints.js:83-90 | BD:40 "every bound in the release is drawn as one" (through the page code) | not reached (the engine surface never calls it) | covered |

## 2. compareInterval (lines 92-124)

Open ends are `null`. A point value has `lo === hi`. `openLow` and `openHigh` mean the end itself is not included.

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-11 | No interval at all gives UNKNOWN. | constraints.js:97 | none; the numeric path always builds an interval first, so only a direct call reaches it | not reached | UNTESTED |
| CR-12 | Operator at-least (>=): passes if the low end is at or above the threshold; fails if the high end is below it, or equals it and is open; otherwise indeterminate. | constraints.js:101-105 | CT:20 "pass, fail, indeterminate"; CT:26 point; CT:33 (open upper at 1 fails); CT:414 line 419 (open high end equal to the threshold fails) | reached | covered |
| CR-13 | Operator more-than (>): passes if the low end is above the threshold, or equals it and is open; fails if the high end is at or below it. | constraints.js:106-108 | CT:26 line 28 (point fails); CT:414 line 416 (open low end at 650 passes) | reached | covered |
| CR-14 | Operator more-than (>) with the threshold inside the interval is indeterminate. | constraints.js:109 | none asserts it (CT:435 line 449 gives a point, which fails then goes on the line) | reached | reached |
| CR-15 | Operator at-most (<=): passes if the high end is at or below the threshold; fails if the low end is above it, or equals it and is open; otherwise indeterminate. | constraints.js:111-115 | CT:26 line 29; CT:33 lines 36, 38, 39; CT:414 line 417 | reached | covered |
| CR-16 | Operator less-than (<): passes if the high end is below the threshold, or equals it and is open; fails if the low end is at or above it. | constraints.js:116-118 | CT:26 line 30 (point fails); CT:414 line 418 (open high end at 0.8 passes) | reached | covered |
| CR-17 | Operator less-than (<) with the threshold inside the interval is indeterminate. | constraints.js:119 | none asserts it | reached | reached |
| CR-18 | Any other operator throws "Unsupported operator". | constraints.js:121-122 | none; SN:60 tests that a scenario drops such a requirement before it gets here | not reached | UNTESTED |
| CR-19 | An open end (null) never decides by itself; only the closed end is compared. | constraints.js:102-119 (the `!== null` tests) | CT:33 "bounded measurements"; CT:414 | reached | covered |
| CR-20 | A point value is compared at both ends; at the threshold, >= and <= pass and > and < fail. | constraints.js:100-120 | CT:26 "a threshold exactly on a boundary" | reached | covered |

## 3. evaluateNumeric: the order of evidence (lines 126-318)

The comment at lines 128-131 names the order: not applicable; the product's own value; the evidence ledger; an estimate (never decides); a value published another way or nothing. The code reads it in this order: ceiling-only check, not applicable, ledger, estimate, ceiling, asPublished, elsewhere, nothing, then the decided case.

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-21 | A value that is only a ceiling for the printed part, and whose ceiling leaves the comparison undecided (a minimum it would meet), is read as "not known", with the ceiling and any ledger kept. | constraints.js:136-139 | EL:127 "a PLA HDT from an undescribed bar stays its value but only as a ceiling" (status INDETERMINATE, `ceilingOnly.measurementId`, reason text) | reached | covered |
| CR-22 | A ceiling-only value is compared as it is when that decides: it fails a minimum it misses and passes a maximum it meets. | constraints.js:138, 249-267 | EL:127 lines 136-137 (>= 120 fails, <= 120 passes) | reached | covered |
| CR-23 | A property that does not apply gives UNKNOWN, `notApplicable`, `screened: true`, reason "Does not apply: ...", whatever the estimates switch says. | constraints.js:141-152 | CT:256 "not applicable holds a material out of Include with estimates on or off" | reached | covered |
| CR-24 | Before anything else, the evidence ledger is asked; a deciding answer is returned as is, and a straddling one only adds a note after whatever answer follows. | constraints.js:153-158 | EL:71, EL:196, EL:302 (see the ledgerResult rows) | reached | covered |
| CR-25 | An estimate is read only if `useEstimates` is on and the headline has one. | constraints.js:170 | CT:226 "estimates are invisible unless enabled, and never screen in Strict" | reached | covered |
| CR-26 | An estimate never passes or fails: the status is UNKNOWN, `estimated: true`, and `plausible` records what its wide range would say. | constraints.js:171-173, 201-211 | CT:190 "an estimate never passes a requirement, even when its whole range meets it" | reached | covered |
| CR-27 | Screening uses the range the build allows (`screenRange`); an older snapshot without it uses the plausible range. | constraints.js:174-177 | CT:179, CT:243 test the fallback (no `screenRange` in the fixture); the `screenRange` side is reached by SP:91 and PS but its fixtures give it the same numbers as `plausible`, so a wrong choice would not show | reached | reached |
| CR-28 | A measurement of the material that bounds the headline from below and meets the requirement vetoes the screen; a failing one, or an upper requirement, does not. | constraints.js:179-182 | CT:212 "a measurement that bounds the headline from below and meets the requirement vetoes a screen" | reached | covered |
| CR-29 | An estimate that carries a screening certificate may screen only in a complete product context (dry, as printed, all three print gates plainly within on the product's own sheets); one with no certificate has no such condition. | constraints.js:183, 200 | PS:62 "uncertified bounds and incompatible printing/service states have no exclusion permission" (nozzle unknown, conditioned, annealed all stop the screen); PS:51 | reached | covered |
| CR-30 | An estimate screens only when its plausible range fails, the screening range fails, the estimate may screen, there is permission and no veto. | constraints.js:177, 184 | CT:179 (all true), CT:203 (cannot screen), CT:212 (veto), CT:243 (plausible straddles), PS:51 | reached | covered |
| CR-31 | If the screening range could still meet the requirement (wider than the plausible one's failure), the estimate would fail but does not screen. | constraints.js:177, 190-191 | none asserts the sentence ("could still meet it") or that case alone | reached | reached |
| CR-32 | The estimate's reason says: hidden and not measured (screened); would fail but cannot screen, with the screen limit's words; possible but never enough to pass, with the likely and plausible ranges. | constraints.js:185-188, 190, 192-193 | "Hidden; not measured": CT:179 line 185; screen limit's words: CT:203 line 207; "Estimated 20 to 40 %, plausibly 12 to 60": CT:243 line 249 | reached | covered |
| CR-33 | When an own measurement vetoes a screen the reason says the estimate would fail but its own value bounds it from below and meets the requirement. | constraints.js:188-189 | CT:212 runs the case and asserts `vetoedBy` and `screened`, not the sentence | not reached (line 189) | reached |
| CR-34 | When an estimate has no screen limit text, the reason falls back to "this estimate cannot screen". | constraints.js:192 | none (every fixture sets a limit) | not reached | UNTESTED |
| CR-35 | After an estimate, the reason also says why the value is unusable: a value published on a bar that does not qualify, or in another state, or related values only, and when its own sheets disagree. | constraints.js:194-198 | none asserts these sentences; OA:56 checks only the "likely" tag | reached | reached |
| CR-36 | When the certificate exists but permission is missing, the reason says it was tested only on products whose sheets put nozzle, bed and chamber plainly within the H2C. | constraints.js:200 | none asserts the sentence (PS:62 asserts the effect) | reached | reached |
| CR-37 | The estimate's reason ends "Confirm the exact product, property and service state ..." and the reason starts "No qualifying measurement." instead of "Not published." | constraints.js:209 | CT:226 line 229 asserts "Not published" for the estimates-off case only; the replacement is not asserted | reached | reached |
| CR-38 | A value that is only a ceiling and would meet a minimum gives INDETERMINATE, `missing: not-comparable`, and `ceilingOnly` with its record. | constraints.js:213-221 | EL:127 (status, id, reason start); EL:156 | reached | covered |
| CR-39 | When estimates are on and an estimate was withheld because the product's own values disagree with its kind's model, a sentence says so after the reason. | constraints.js:222-223 | none | the line runs; the withheld branch has no test text | UNTESTED |
| CR-40 | A value on a bar its document does not describe as printed is set apart, never used to pass, with its own sentence. | constraints.js:226-229, 233 | none asserts the sentence (SP:71 asserts a different caveat) | reached | reached |
| CR-41 | A heat deflection published without its test load is not used at its value; it shows only "at least" for the 0.45 MPa value. | constraints.js:226-227, 230-231, 233 | none asserts the sentence (CT:70 tests the admitted route, which decides) | reached | reached |
| CR-42 | A value without a usable specimen orientation is not used, with its own sentence. | constraints.js:226-227, 232-233 | SP:71 "a value published without a usable direction is set apart" (matches /without a usable specimen orientation/) | reached | covered |
| CR-43 | A value published in a state this scenario does not judge (annealed, conditioned) gives UNKNOWN, `missing: other-state`, and says what would let it decide. | constraints.js:235-238 | CT:278 "a value published only after annealing that also misses the requirement offers no annealing" | reached | covered |
| CR-44 | With nothing published and `missing` equal to not-available-in-market, the reason is "No price in the sampled shops". | constraints.js:241-242 | none | reached | reached |
| CR-45 | With nothing published but related values, the reason lists them and says to ask the maker or test a coupon. | constraints.js:243 (second branch) | none | reached | reached |
| CR-46 | With nothing at all, the reason is "Not published in the sampled sources; ask the maker or test a printed coupon", UNKNOWN, with `missing`. | constraints.js:239-246 | CT:63 "missing data is UNKNOWN and never zero" (no value invented); the sentence at EL:71 and CT:226 | reached | covered |
| CR-47 | A decided value uses its interval, or a point made of the value when it has none. | constraints.js:249 | none builds a known value without an interval | reached | reached |
| CR-48 | A published "mean ± band" is judged on its mean as a point; the band only flags the limit as close. | constraints.js:250-256 | CT:43 "a mean ± band is judged on its mean, and a threshold inside the band is flagged close to the limit" | reached | covered |
| CR-49 | A one-sided bound is judged as the interval it is; an undecided bound reads "Published more than 300 ..., a bound that leaves the threshold on either side". | constraints.js:257, 270-272 | BD:73 "the verdict reason says a value is a bound" | reached | covered |
| CR-50 | A published range that straddles the threshold is INDETERMINATE ("Reported range a to b straddles the threshold"). | constraints.js:270, 273 | CT:43 line 59-60 (INDETERMINATE and /straddles/) | reached | covered |
| CR-51 | A point or mean (not a range, bound, assumption, median or ceiling-only value) that misses by less than its headline's test scatter is INDETERMINATE and `onTheLine`; the edge is included, one step beyond fails. | constraints.js:258-267 | CT:435 (relative, absolute, "at most", strict ">"; 4.5 and 4.49); CT:461 (range, bound, assumption, median, no scatter, no registry keep the old rule); CT:482 sweep | reached | covered |
| CR-52 | A point or mean that meets the limit within the scatter passes with `thinMargin`, and never loses the pass. | constraints.js:266, 296-299 | CT:452 "a value that meets the limit within the scatter passes with a thin margin"; CT:482 | reached | covered |
| CR-53 | A mean with a band on the line says so once, with the band's closeness; a thin pass says both. | constraints.js:289-292, 297-298 | CT:472 (exact sentences) | reached | covered |
| CR-54 | A scenario assumption is the reader's number: the reason says "Assumed ... (a scenario assumption, not published)", and it gets no scatter. | constraints.js:259-264, 275-278 | SN:76 line 85 and SP:207 line 218 assert the sentence; CT:461 line 466 asserts no scatter | reached only by units; the corpus never reaches line 277 | covered |
| CR-55 | A decided value that carries a caveat names it (test bar not described, test load not stated, no usable orientation) and, in the audit lens, says it was used only because that lens admits it. | constraints.js:279-281, 293, 316 | CT:70 "a value published without its load decides only as published" (reason start); SP:71 (decides only under the audit lens); the "audit lens admits" sentence (line 293) is not asserted | reached | covered |
| CR-56 | The orientation (unless a caveat is named) and the standards come in one bracket after the value. | constraints.js:282-284 | none asserts the bracket | reached | reached |
| CR-57 | A value from an annealed state says "after annealing at ... for ...". | constraints.js:285-286 | none asserts it in a numeric reason | reached | reached |
| CR-58 | A twin's value says "in the data sheet shared with ...". | constraints.js:287-288 | SP:159 line 177 asserts the twin label | reached | covered |
| CR-59 | What the screening policy admitted unstated (orientation, specimen type, moisture state, post-processing, how the bar was made) is named in the reason and kept on the result; a printed bar is read as flat, and an undescribed bar counts all the same. | constraints.js:294-295, 314, 320 | AC:158 per-product tests (line 63 asserts the product says what the policy admitted); the reason sentences are not asserted | reached | covered |
| CR-60 | A threshold inside a band, when not on the line, adds "Close to the limit: ... some parts may fall below it / may meet it". | constraints.js:300-302 | CT:43 line 51 asserts /Close to the limit/ | reached | covered |
| CR-61 | A value that the product's own records or its kind's limit contradict beyond the scatter still decides, with ". Doubtful: ...; re-read before relying on it". | constraints.js:304-306, 310 | EL:97 "a comparable value always wins over the ledger, and is doubtful ..." (exact tail) | reached | covered |
| CR-62 | A decided result carries: status, reason, criterion, `closeToLimit`, `observed`, `unit`, `interval`, `measurementId`, `gradeId`, `sourceId`, `direction`, and (only when present) `onTheLine`, `thinMargin`, `doubtful`, `admitted`, `caveat`. | constraints.js:307-317 | spread over the tests above; `gradeId`, `sourceId`, `direction` are asserted by none | reached (the corpus compares every record) | reached |
| CR-63 | The test scatter of a property comes from the registry the context carries; none means no scatter. Read once per registry (weak map). | constraints.js:324-333 | CT:461 line 469 (no registry); CT:435 (registry) | reached | covered |
| CR-64 | The scatter band edges are rounded to twelve significant digits so that 5 x 0.9 is exactly 4.5 everywhere. | constraints.js:334-335, 345-346 | CT:435 ("5 x 0.9 is the edge, and on the line") | reached | covered |
| CR-65 | The scatter is worded "10 %" (relative) or "5 °C" (absolute); `atLeast` says which side "just under / just over". | constraints.js:342-351 | CT:435 lines 438, 444, 447 | reached | covered |
| CR-66 | A note is added after a reason in its own sentence, with a full stop inserted if missing. | constraints.js:353-354 | EL:71 (note after the answer); CT:226 | reached | reached |
| CR-67 | The wording tables for admitted conditions and caveats. | constraints.js:320-322 | none asserts the table (loose matches only) | reached | reached |

## 4. ledgerResult, doubtWords, elsewhereReason, schedule (lines 356-442)

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-68 | No ledger bounds, or none usable at the reader's level, gives no answer (empty). | constraints.js:365-369 | EL:97 (no bounds where a value decides); EL:336, EL:346 | reached | covered |
| CR-69 | The ledger is read at the "as-published" level only when the reader asked for it; otherwise at the "comparable" level. | constraints.js:368 | EL:235 (the audit lens); EL:302 "the intersection takes the tightest deciding end at the levels the reader admits" | reached | covered |
| CR-70 | Two records with no value between them are INDETERMINATE with `sheetsDisagree` (both ends cited) and the disagreement sentence. | constraints.js:372-378 | EL:223 "two records with no value between them are 'sheets disagree'" | not reached (lines 373-377 are not run by the corpus) | covered |
| CR-71 | A deciding interval that leaves the limit on either side adds a note after the next answer and gives no answer, unless it only repeats the product's own demoted value. | constraints.js:379-381 | none asserts the note | reached | reached |
| CR-72 | A deciding end is the floor for a passing minimum or a failing maximum, and the ceiling otherwise; the answer names the record (`ledger`, `measurementId`). | constraints.js:382-386, 396-401 | EL:71 "a deciding floor passes a minimum on the record it reads and names it"; EL:113 | reached | covered |
| CR-73 | The test scatter applies only to a point: an equality or a class limit; a band, floor or ceiling is compared as it is. | constraints.js:387-395 | EL:196 "the test scatter belongs to a point" | reached | covered |
| CR-74 | A failing or on-the-line ledger answer keeps `missing`; a passing one does not. | constraints.js:402 | none asserts `missing` | reached | reached |
| CR-75 | The ledger's reason is built by the shared wording with pass/line/fail, the margin and "as printed". | constraints.js:398 | EL:113 line 117 (exact fail sentence); EL:71 | reached | covered |
| CR-76 | A doubtful note names the rule's words and where it puts the value: exactly, between, at least, at most. | constraints.js:406-412 | EL:97 (the "at least 80 °C" form only) | reached | reached |
| CR-77 | An annealing schedule is "at T °C for H h", with "a temperature its sheet does not state" when missing. | constraints.js:416-417 | CT:278 (full schedule only) | reached | reached |
| CR-78 | A state is "as printed" or "after annealing ...", plus ", conditioned" when conditioned. | constraints.js:418 | none directly; through CT:278's text only | reached | reached |
| CR-79 | In "elsewhere", when judged as printed the annealed value named is one that meets the requirement, if the sheet has one; otherwise the first listed. First match wins. | constraints.js:425-428 | CT:278 (one value only, so the choice among several is not tested) | reached | reached |
| CR-80 | A value in another state that also misses the requirement says "which also misses it", and annealing is not offered. | constraints.js:426, 429, 433-434 | CT:278 line 284 (exact sentence) | reached | covered |
| CR-81 | An annealed value that meets the requirement offers "Allow annealing under Part condition". | constraints.js:432-435 | CT:278 line 287 | reached | covered |
| CR-82 | A value set apart (bar not described as printed) says so, whatever the state. | constraints.js:430-431 | none | reached | reached |
| CR-83 | Moisture: a conditioned-only value for a dry question, and a dry value for a conditioned question, each with its own sentence. | constraints.js:437-440 | none asserts either sentence (reached by AC:158 portfolio) | reached (the dry-for-conditioned sentence, line 439, is not) | reached |
| CR-84 | Otherwise: "Published <state> (value), not <state asked>; a value of another state decides here only as a bound the ledger draws". | constraints.js:441 | none | reached | reached |

## 5. evaluateTreatment (lines 444-459)

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-85 | A state with no treatment passes "Used as printed". | constraints.js:452-453 | none; the engine adds the treatment requirement only for annealed states, so only a direct call reaches it | not reached | UNTESTED |
| CR-86 | An annealing schedule missing its temperature or its time gives UNKNOWN: it cannot be repeated, so it settles nothing. | constraints.js:454-456 | none asserts it; reached by AC and MM runs | reached | reached |
| CR-87 | A complete schedule passes "Needs annealing ... as its sheet states; annealing is allowed under Part condition". | constraints.js:457 | MM:86 "forbidding a treatment never creates a pass; permitting one never removes one" (effect on passes, not the sentence) | reached | reached |
| CR-88 | The TREATMENT requirement is mandatory, in the Manufacturing group. | constraints.js:459 | none directly | reached | reached |

## 6. evaluateGate (lines 461-586)

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-89 | The scope gate fails a material marked excluded ("Beyond H2C capability") and passes the rest. | constraints.js:475-486 | none asserts the gate itself (scope is only a field in fixtures); SC:24 can generate it | reached | reached |
| CR-90 | A product's H2C status: Bambu Lab's own spool is "Official Bambu product"; another maker's spool of an official family is "Officially listed family"; otherwise the family's. No product: the material's. | constraints.js:465-472 | none | reached | reached |
| CR-91 | The h2cStatus gate passes if the status is in the list and fails otherwise; the reason explains a product that is not Bambu's own spool. | constraints.js:487-500 | none asserts the gate (SC:24 generates it) | reached (including the not-Bambu-spool sentence) | reached |
| CR-92 | With a hardened nozzle available, the abrasive gate always passes. | constraints.js:508-512 | CT:351 "owning a hardened nozzle never removes a material" | reached | covered |
| CR-93 | A source that states a hardened nozzle is needed fails the gate (with the "from" note for a twin or a guide). | constraints.js:513-516 | CT:358 line 360; SP:159 line 175 (the guide note) | reached | covered |
| CR-94 | A source that states no special nozzle concern passes. | constraints.js:517 | none asserts it (reached by CT and SC) | reached | reached |
| CR-95 | A maker who asks for a nozzle harder than brass leaves it UNKNOWN, in the maker's quoted words (140 characters, spaces collapsed). | constraints.js:518-524 | CT:371 line 375-376 | reached | covered |
| CR-96 | A maker who warns of nozzle wear and asks for no hardened nozzle leaves it UNKNOWN, quoted. | constraints.js:518-519, 525 | CT:371 lines 377-379 | reached | covered |
| CR-97 | A fibre-filled material (fibre facet, carbon fibre or glass fibre) with no source is UNKNOWN: treated as abrasive until documents say otherwise. | constraints.js:527-530 | CT:358 line 361 | reached | covered |
| CR-98 | An unfilled material with no recorded requirement passes: "No hardened-nozzle requirement recorded". | constraints.js:532-535 | CT:358 line 362 | reached | covered |
| CR-99 | A named filler (ceramic, PTFE, metal powder ...) passes, naming the filler and warning that glow, metal, wood and marble fills can wear brass. | constraints.js:536-537 | none (only SC:24 random scenarios reach it) | reached | reached |
| CR-100 | An undisclosed filler passes, saying so and asking to check the product. | constraints.js:538 | CT:358 lines 363-365 | reached | covered |
| CR-101 | The buyable gate: no sampled Canadian offer is UNKNOWN; an offer that is sampled but out of stock fails when "in stock" is asked; otherwise it passes, naming the retailer, per-kg price and date. | constraints.js:542-567 | CT:313 "availability distinguishes 'nobody sampled it' from 'it was out of stock'" (all six status cases); the reasons are not asserted | reached | covered |
| CR-102 | The dryingKnown gate passes on any drying statement (required, optional, not needed), with the "from" note; only silence is UNKNOWN. | constraints.js:569-578 | none | reached | reached |
| CR-103 | A print gate (nozzle, bed, chamber) with no recorded profile is UNKNOWN with the reason "No print profile recorded". | constraints.js:580-582 | SP:79 "a product ... without a profile is unknown, never a pass" (asserts the verdict `unknown` and the count; the wording is not asserted) | reached | reached |
| CR-104 | Otherwise the answer is the GATE_STATUS of the verdict (an unrecognised verdict is UNKNOWN), with the gate's own reason and the label "Nozzle/Bed/Chamber temperature within H2C baseline". | constraints.js:463, 580-585 | CT:80 (exceeds fails, recommended is indeterminate); CT:89 (low end passes with the sheet's reason); GV:32; the label words and the unrecognised-verdict fallback are not asserted | reached | covered |
| CR-105 | The verdict `edge` (and only it) sets `onTheLine: true`. | constraints.js:583-585 | CT:89 (edge is true; low-end is undefined) | reached | covered |

## 7. evaluateFacet (lines 588-622)

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-106 | The filler facet with no filler on record is UNKNOWN, "Facet not recorded". | constraints.js:593-595 | none | not reached | UNTESTED |
| CR-107 | The filler facet passes if the material's filler (as filed by filler.js, including the filler the materials table names) is in the list, else fails; the reason notes a named filler. | constraints.js:593-601 | none (CT:358 tests `abrasive`, which reads the filler elsewhere) | not reached | UNTESTED |
| CR-108 | The supportMaterial facet passes when its value equals the asked value; the criterion reads "Build material" or "Support material" and the reason says which it is. | constraints.js:603-611 | CT:407 "a build-material screen removes support materials" | reached | covered |
| CR-109 | Any other facet that is not recorded is UNKNOWN, "Facet not recorded". | constraints.js:612-613 | none | reached | reached |
| CR-110 | Any other facet passes if its value is in the list (or equals the asked value), else fails; the reason says "derived from ..." for a derived facet and `derived` is kept. | constraints.js:612-621 | none asserts it (SC:24 generates facets) | reached | reached |

## 8. evaluateEnvironment and evaluatePolymerLevel (lines 624-736)

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-111 | A category's name comes from the snapshot's meta (so the engine imports nothing from the interface); without it, the key with hyphens as spaces. | constraints.js:632-637 | CT:393 and CT:402 use the labelled form; the unlabelled fallback is not asserted | reached | reached |
| CR-112 | An indicator category (narrative only) is always UNKNOWN with `indicatorOnly`, never a pass. | constraints.js:638-645 | CT:100 "an indicator environment category never manufactures a PASS" | reached | covered |
| CR-113 | A product is judged on its own records, else those of its twin (with ", from the data sheet shared with ..."); a sibling's records and the material's are context only. | constraints.js:646-657 | MM:52 "a sibling's positive record cannot confirm a product that has none"; MM:60 "a product's own contrary record is not hidden"; the twin branch (line 656) is not asserted | reached (the twin sentence reached by the corpus only) | covered |
| CR-114 | With no record of its own, the base polymer's reference is used (see the polymer-level rows). | constraints.js:658-663 | PE:199, PE:215, PE:245 | reached | covered |
| CR-115 | A product with no record of its own, beside statements about the material or other products, is UNKNOWN: "No statement of this product's own ... are context". | constraints.js:664-670 | MM:52 (the verdict; the wording is not asserted) | reached | reached |
| CR-116 | No record at all is UNKNOWN, "No statement for this product/material". | constraints.js:671 | none asserts the wording | reached | reached |
| CR-117 | Only an unqualified positive (`resistant`, `insoluble`, or the requirement's own `require` list) satisfies a requirement; `limited` does not. | constraints.js:629-630, 674-682 | CT:392 "limited resistance does not pass a resistance requirement"; CT:402 "an insoluble record satisfies the water criterion" | reached | covered |
| CR-118 | Contrary records (not-resistant, soluble, flammable) with no positive one fail. | constraints.js:683, 687-689 | CT:392 line 398 | reached | covered |
| CR-119 | A positive and a contrary record together are INDETERMINATE ("Mixed across exposures"). | constraints.js:690-692 | none (the status is not asserted) | reached | reached |
| CR-120 | A positive and a `limited` record together are INDETERMINATE, quoting the limited ones (60 characters). | constraints.js:693-695 | CT:392 line 396 | reached | covered |
| CR-121 | A positive record with a narrative record (no clear verdict) is INDETERMINATE, quoting them. | constraints.js:696-698 | none | reached | reached |
| CR-122 | A positive record alone passes, with "covers the exposures stated, not every chemical in the class". | constraints.js:699-701 | CT:392 line 397; CT:402 | reached | covered |
| CR-123 | `limited` alone is INDETERMINATE. | constraints.js:702-704 | CT:392 line 395 | reached | covered |
| CR-124 | Records that give no verdict at all are UNKNOWN ("Statements exist, but none gives a verdict"). | constraints.js:705 | PE:245 line "narrative" (status UNKNOWN) | reached | covered |
| CR-125 | A product is named in a reason by maker and product, without repeating the maker, and without "Not ..." placeholders; falls back to the id. | constraints.js:708-715 | none asserts the name (SP:207 and PS use ids) | reached | reached |
| CR-126 | A verdict is worded with spaces for hyphens. | constraints.js:717-718 | PE:199 ("not resistant to acetone") | reached | covered |
| CR-127 | A polymer-level result is always UNKNOWN, `polymer: true`, with the polymer, its verdict and the reference; it never passes. | constraints.js:720-729 | PE:199 "a polymer-level 'resistant' leaves the material UNKNOWN" | reached | covered |
| CR-128 | A polymer whose reference does not find "resistant to nothing in the class" is only a note. | constraints.js:730 | PE:199 | reached | covered |
| CR-129 | A polymer attacked or dissolved screens the material out only when estimates and resin data are on; off, it says it would hide it. | constraints.js:731-735 | PE:215 "a polymer-level 'not-resistant' screens under Include uncertain with inference on, and only then" | reached | covered |

## 9. evaluateEvidence (lines 738-776)

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-130 | exactGrade, judged on a product: passes with the product's own numeric measurement, or its twin's ("measured in the data sheet shared with ..."); otherwise fails, saying siblings' are theirs. | constraints.js:746-755 | none (SC:24 generates `evidence` criteria and checks only invariants) | reached | reached |
| CR-131 | exactGrade, judged on a material with no product: passes if any grade-specific numeric measurement exists. | constraints.js:756-759 | none asserts it | reached | reached |
| CR-132 | noConflicts: a Conflict or Quarantined coverage finding about the product (or its twins, or the material) fails it; a finding about a sibling does not. | constraints.js:761-768 | none asserts it | reached | reached |
| CR-133 | With neither check set, it passes "No evidence criterion set". | constraints.js:769 | none | reached | reached |
| CR-134 | The answer fails if any check fails; the criterion joins the check labels with "and"; the reason lists the failures, else all details. | constraints.js:770-775 | none | reached | reached |

## 10. evaluateConstraint dispatch (lines 778-788)

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-135 | Six kinds are evaluated (numeric, gate, facet, environment, evidence, treatment); each answer gets the constraint object attached as `constraint`. | constraints.js:778-785 | CT (numeric, gate, facet, environment), MM:86 (treatment); `evidence` only inside SC:24 | reached | covered |
| CR-136 | Any other kind throws "Unsupported constraint kind". | constraints.js:786 | none; SN:60 tests that a scenario drops such a requirement earlier | not reached | UNTESTED |

## 11. evaluateMaterial (lines 790-841)

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-137 | Only requirements with `mandatory !== false` count; a missing flag means mandatory. A soft preference reports its own answer but never changes the verdict. | constraints.js:796-797 | CT:120 "a soft preference never removes a candidate"; PS:45 (a preference does not exclude); most tests leave the flag off and are judged as mandatory (CT:107) | reached | covered |
| CR-138 | The verdict is FAIL if any mandatory requirement fails; else PASS if none is unresolved; else UNKNOWN. Unresolved means UNKNOWN or INDETERMINATE. | constraints.js:799-808 | CT:333 "strict mode reports unchecked materials as UNKNOWN, not FAIL"; CT:107; SP:54; MM:38 | reached | covered |
| CR-139 | Strict leaves unresolved materials ineligible; exploration keeps them, flagged "needs verification". Eligible means PASS, or (exploration, UNKNOWN, not screened). | constraints.js:795, 821-822 | CT:107 "strict mode holds unknowns out, exploration keeps them flagged"; CT:147; SP:54 | reached | covered |
| CR-140 | In exploration, an UNKNOWN material is screened when any of its unresolved requirements is screened (not applicable, estimate, or polymer). Strict never screens. | constraints.js:810, 830-831 | CT:179, CT:226, CT:256, PE:215 | reached | covered |
| CR-141 | `screenedBy` names the criteria of the screened unresolved requirements, and is empty when not screened. | constraints.js:831 | CT:179 (deepEqual); PE:215 (deepEqual) | reached | covered |
| CR-142 | In strict mode with no failure, `heldBy` names the unresolved criteria; otherwise it is empty. | constraints.js:836 | CT:107 line 112; CT:147; PE:215 | reached | covered |
| CR-143 | `failedBy` names the failed mandatory criteria. | constraints.js:839 | CT:333 lines 341-342 | reached | covered |
| CR-144 | `usesEstimate` is true when any result is an estimate; `usesPolymer` when any is a base-polymer stand-in. | constraints.js:823-826 | `usesPolymer` true: PE:199 line 209. `usesEstimate` false: CT:235 line 240. `usesEstimate` true is asserted by none | reached | covered |
| CR-145 | `shortfall` is the unresolved requirements' distance (see shortfallOf) when the verdict is UNKNOWN, else 0. | constraints.js:820 | none asserts the value | reached | reached |
| CR-146 | The result keeps `results`, `failed` (mandatory failures) and `unresolved` (mandatory unresolved), and `materialId`. | constraints.js:814-840 | CT:107 (`failed.length`); CT:256 (`results[0]`); PE:215 | reached | covered |

## 12. Groups (D155): groupOf, ownForbidsLikely, shortfallOf, compareGroups (lines 843-923)

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-147 | The six groups are `meets`, `one-check-away`, `not-enough-data`, `unlikely-to-meet`, `hidden`, `fail`, in that order. | constraints.js:857-858 | SC:198 "grouping never changes a verdict, a count or an eligibility" (group words as strings) | reached | covered |
| CR-148 | PASS is `meets`, FAIL is `fail`, a screened material is `hidden`, none of them likely. | constraints.js:869-871 | SC:198 (expected group per verdict, hidden when screened) | reached | covered |
| CR-149 | A material with an unresolved estimate whose plausible range fails (and not vetoed by an own measurement) is `unlikely-to-meet`, never hidden. | constraints.js:872-875 | PS:85 lines 102-104 (unlikely, not screened, still eligible); the veto exception (`!r.vetoedBy?.length`) is not asserted | reached | covered |
| CR-150 | A printer check is a nozzle, bed or chamber gate, and no other gate. | constraints.js:859-860 | PS:107 (chamber, nozzle, bed together); other gates not asserted as non-printer | reached | covered |
| CR-151 | When every unresolved requirement is a printer check, the group is `one-check-away`. | constraints.js:876-877 | PS:107 line 112 "G1 ... its chamber temperature is not stated" | reached | covered |
| CR-152 | When exactly one requirement is unresolved and it is on the line, or its sheets disagree, the group is `one-check-away`. | constraints.js:876-877 | none asserts it (EL:386 asserts a band does not hold PLA one check from 5 GPa, the opposite case) | reached | reached |
| CR-153 | Otherwise `not-enough-data`, tagged likely only when every unresolved requirement is an estimate whose likely (80 %) range wholly meets the limit and whose own sheets do not forbid it; a centre that meets is not enough; a second open number with nothing to go on is not likely. | constraints.js:861, 879-880 | PS:85 "a likely estimate is UNKNOWN, orders 'Not enough data' and never creates a PASS" (likely, crossing, two requirements, strict) | reached | covered |
| CR-154 | A likely tag is forbidden when one of the product's own converted bands wholly misses the limit, or its sheets disagree beyond the bands and not every band meets it. | constraints.js:883-893 | OA:56 "no product is tagged likely against its own value, or where its own sheets disagree" (compiled data); OA:41 | reached | covered |
| CR-155 | Shortfall is the worst, over numeric requirements, of the gap to the limit relative to the limit's size (the size of the limit (or 1 for a limit of zero)); the value used is the observed one, else the ledger bound, else the estimate's centre. | constraints.js:895-909 | none asserts a computed shortfall (PS:190 gives sortRows hand-made shortfalls) | reached | reached |
| CR-156 | A printer check, or a requirement that is not a number, adds 0; a number with nothing to go on adds infinity. | constraints.js:903-906 | none | reached | reached |
| CR-157 | The gap is plain floating-point arithmetic with no rounding: (limit - value) divided by the size of the limit. Tiny differences in the last digits can change the order of two close products. | constraints.js:906 | none (see Hazards) | reached | reached |
| CR-158 | The order is meets, one check away, not enough data (likely first, then the rest), unlikely, hidden, fail; an unknown group ranks as fail. Ranks are 0, 1, 2, 3 (not enough, not likely), 4, 5, 6. | constraints.js:911-913 | PS:118 line 129 asserts that a one-check product represents the material over an unlikely one; the other pairs are not asserted | reached | reached |
| CR-159 | Among UNKNOWN verdicts of the same rank, fewer unresolved requirements first, then the smaller shortfall. Non-UNKNOWN verdicts compare by rank only. | constraints.js:919-923 | none asserts it (PS:190 tests the page's own sort, not this function) | reached | reached |
| CR-160 | A full tie returns 0; the caller decides (first wins). | constraints.js:915-922 | none | reached | reached |

## 13. openOne and openWords: the reason text of a group (lines 925-982)

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-161 | Words for a property come from the registry's plain label with its first letter lowered (unless it starts with an acronym); without a registry, the key. Limits use "at least / at most / more than / less than". Numbers shown to three significant digits (four for an observed value). | constraints.js:925-942 | PS:118 and PS:135 assert wording with the key form ("hdt045 at least 90 °C"); the registry label form is not asserted | reached | reached |
| CR-162 | A printer check whose reason text starts with "No print profile recorded" is worded "no print recipe on record". The engine reads English that a different part of the code produced (see Hazards). | constraints.js:948 | SP:159 holds a reason of this text in its fixture, but asks no printer-check group, so the wording is not asserted | reached | reached |
| CR-163 | A printer check whose reason starts with "No temperature published" is worded "its <gate> temperature is not stated". Same hazard. | constraints.js:949 | PS:107 line 113 (exact string "its chamber temperature is not stated") | reached | covered |
| CR-164 | Any other printer check reads "its <gate>[ is on the line]: <first sentence of its reason, first letter lowered>". | constraints.js:950 | none | reached | reached |
| CR-165 | A number on the line with an observed value: "<property> <value> <unit>, on the line for <limit>". | constraints.js:955 | none asserts the wording | reached | reached |
| CR-166 | A number on the line from the ledger: a class limit reads "at least/at most N for its kind of plastic"; an equality "N on another of its records that counts as this one". | constraints.js:956-961 | none | reached | reached |
| CR-167 | "its sheets disagree on <property>". | constraints.js:963 | none | reached | reached |
| CR-168 | "<property> published N <unit> only on a bar its sheet does not describe". | constraints.js:964 | none | reached | reached |
| CR-169 | An estimate: "<property> estimated lo to hi <unit>", with ", plausibly lo to hi, against <limit>" only when the plausible range fails. | constraints.js:965-969 | PS:85 line 93 ("estimated 5.5 to 8 GPa"); the plausible clause is not asserted | reached | reached |
| CR-170 | A value present: "<property>: <first sentence of its reason>". | constraints.js:970 | none | reached | reached |
| CR-171 | No price in the shops; set-apart value (three wordings); published only in another state; else "<property> not published". | constraints.js:971-974 | none | reached | reached |
| CR-172 | A non-number requirement: "<criterion>: <first sentence of its reason>". | constraints.js:976 | none | reached | reached |
| CR-173 | Distinct sentences only; at most three are named, then "; and N more". | constraints.js:978-982 | none asserts the cut or the "more" tail | reached | reached |

## 14. holdsOpen, measuredFail, measuredMiss, everyMeasuredMisses (lines 984-1029)

These four match a requirement to its answer by object identity: `x.e.results.find((y) => y.constraint === c)` (lines 1010 and 1025). Two requirements that look equal but are different objects are different here, and a copy of the requirements list finds nothing: the product is then skipped silently.

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-174 | An answer holds a material open if it passes, or is indeterminate and (its sheets disagree, or it has its own observed value and no ledger, or it is on the line on a ledger equality). | constraints.js:992-993 | PS:118 (a product meeting the number stops the "unlikely"); PS:135 last assertion (a value on the line holds it open); the ledger-equality branch is not asserted | reached | covered |
| CR-175 | A measured fail is a FAIL on the product's own finite observed value with no ledger. | constraints.js:995 | PS:118, PS:135 | reached | covered |
| CR-176 | For each mandatory numeric requirement (skipping soft ones), no product holding it open, and at least one measured miss: report the first such requirement with counts of misses, ledger-bound fails, class-limit fails (rule starts with CL) and ceiling-only values, and the unit of the first result that has one. | constraints.js:1005-1018 | PS:118 line 124; PS:135 lines 141 and 148 (ceilings, limited, bounded counts) | reached | covered |
| CR-177 | The match to a requirement is by object identity (`y.constraint === c`); a result with no match is skipped. | constraints.js:1010, 1025 | no test passes copies of the requirements; the tests only pass the same objects | reached (always the same objects) | UNTESTED |
| CR-178 | On some mandatory numeric requirement: at least one product has its own measured value (no ledger), every such product fails or is on the line, and no product passes. This suppresses the likely tag. | constraints.js:1021-1029 | SC:126 "on the page's path, nothing is one check away or likely for a requirement its own defended range wholly misses" (compiled data) | reached | covered |

## 15. judgeProduct (lines 1031-1054)

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-179 | A product is judged in each state the scenario permits, as printed first. | constraints.js:1036-1038 | MM:86 "forbidding a treatment never creates a pass; permitting one never removes one" | reached | covered |
| CR-180 | In an annealed state the TREATMENT requirement is added to the list. | constraints.js:1040 | MM:86 (effect on passes); no test asserts the added result | reached | reached |
| CR-181 | `completeProductContext` is true only when the state is untreated and dry and nozzle, bed and chamber are all `within` and none was read from the family. | constraints.js:1041-1049 | PS:62 (nozzle unknown, conditioned and annealed each remove permission); the family-origin condition is not asserted | reached | covered |
| CR-182 | The state that answers for the product is the best by the group order; on a full tie the first (as printed) wins. | constraints.js:1051-1053 | MM:86 (a better state wins); the tie rule is asserted by none | reached | reached |

## 16. evaluateProducts (lines 1056-1114)

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-183 | A material with no product is judged on its own headline; the answer has `share: null`, `counts: null`, `products: []`. | constraints.js:1070-1077 | SP:104 "a material with no product is judged on its own headline" | reached | covered |
| CR-184 | In that case an UNKNOWN material that is not hidden becomes `not-enough-data`, never likely, with the reason "Not enough data: no product on record". | constraints.js:1074-1076 | PS:214 "the estimate of a material with products is described as never hiding it; one with no product keeps its screen" (screen only); the group and reason are not asserted | reached | reached |
| CR-185 | The verdict is PASS if any product passes; else UNKNOWN if any product is unresolved; else FAIL if any fails. One failure beside an unmeasured product is unresolved (D100). | constraints.js:1079-1083 | SP:54; MM:38 "a failing product cannot remove a material whose other product is unresolved"; MM:47; SC:198 (independent expectation) | reached | covered |
| CR-186 | `counts` has products, pass, fail, untested and screened (the unresolved that are screened). | constraints.js:1105 | SP:33 line 38; SP:79 line 86; MM:38 | reached | covered |
| CR-187 | `share` is SOME (some pass, some fail), ALL (pass, none fail), NONE (none pass, some fail), null (no pass, no fail). Untested products do not stop ALL. | constraints.js:1084 | SP:33 (SOME, ALL); SP:44 (NONE); null not asserted | reached | covered |
| CR-188 | In exploration, a material is screened only when its verdict is UNKNOWN and every unresolved product is screened; a measured failure cannot keep a candidate alive. | constraints.js:1085-1086, 1098 | PS:51 "all unresolved products must be screened"; SP:91 | reached | covered |
| CR-189 | Eligible and needs-verification follow the same policy rule as for a material. | constraints.js:1078, 1096-1097 | SP:54 (explore keeps, strict does not) | reached | covered |
| CR-190 | The product that represents the material is the best by the group order; on a full tie the first in the material's product order wins. Its answer supplies the row's reasons and group. | constraints.js:1087-1089, 1092 | SP:33 line 39 (the first passing one); SC:198 flips the product order but checks the group, verdict and counts, not which product represents; the corpus's tie-shuffle surface (packages/parity/src/ties.ts) asserts the first-wins rule, and was not run for this map | reached | reached |
| CR-191 | A screened material's `screenedBy` is the distinct criteria across its unresolved products. | constraints.js:1099 | none | reached | reached |
| CR-192 | A screened material lists each screened product's screened requirements with the reason prefixed by the product's maker and name (never its ID); otherwise the best product's unresolved. | constraints.js:1100-1101 | none asserts the prefix | reached | reached |
| CR-193 | `heldBy` is the best product's only in strict and UNKNOWN; `failedBy` is the best product's only when the material fails. | constraints.js:1102-1103 | none asserts these two for a material with products (CT:107 and CT:333 are for a single material) | reached | reached |
| CR-194 | When the verdict is UNKNOWN and some product fails, `someFail: true`. | constraints.js:1106-1107 | SP:54 line 60 | reached | covered |
| CR-195 | `products` has one entry per product; `gradeId` and `state` are the best product's. | constraints.js:1108-1112 | MM:52, MM:60 (find by gradeId); SP:33 line 39 | reached | covered |

## 17. materialGroup (lines 1116-1150)

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-196 | PASS is `meets`, FAIL is `fail`, screened is `hidden`, each with an empty reason. | constraints.js:1125-1127 | SC:198 | reached | covered |
| CR-197 | If a required number is missed by a measured product while no product holds it open: `unlikely-to-meet`, not likely, `measuredMisses`, with "Unlikely to meet: every measured product misses <limit>: k of n". | constraints.js:1128-1131, 1140-1141 | PS:118 line 124 (exact text); PS:135 | reached | covered |
| CR-198 | The sentence adds, in this order: "N more fail(s) on a limit of its/their kind of plastic", "N more fail(s) on a bound from another of its/their records", "N publish(es) only a moulded or undescribed bar's value, the most a print reaches", and "the other one has / the other N have no value measured that way". | constraints.js:1132-1138 | PS:135 lines 141 and 148 assert singular forms of all four; the plural forms ("fail", "their", "publish", "the other N have") are not asserted | reached | covered |
| CR-199 | If the best product is `one-check-away`: "One check away on <k> of <n> product(s): <name>, <its reason>", counting products in that group. | constraints.js:1144-1146 | PS:107 line 113 (exact text, "1 of 1 product") | reached | covered |
| CR-200 | If the best product is `unlikely-to-meet` (by estimate): "Unlikely to meet: the estimate of every open product misses; the nearest, <name>: <reason>". | constraints.js:1147 | PS:85 asserts the group, not the sentence | reached | reached |
| CR-201 | Otherwise `not-enough-data`; likely only when the best product is likely and no required number is missed by every product measured on it; "Not enough data[, likely]: <name>, <reason>". | constraints.js:1148-1149 | PS:85 line 93 (exact text); SC:126 | reached | covered |

## 18. productEntry and productResult (lines 1152-1174)

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-202 | A product entry has `gradeId`, `verdict`, `group`, `likely`, `screened`, `failedBy`, `state` (id, treatment, moisture) and `results`; `groupReason` only when non-empty. | constraints.js:1152-1157 | MM:52 and MM:60 (verdict by gradeId); SP:33; the other fields not asserted | reached | covered |
| CR-203 | A product's `likely` is switched off when the material is judged to have measured misses. | constraints.js:1155 | none | reached | reached |
| CR-204 | `admitted` is the union of conditions admitted by the product's passing results only. | constraints.js:1153, 1158 | AC:158 per-product tests (line 63 requires the product to list each admitted condition) | reached | covered |
| CR-205 | A declared variant is named on the entry. | constraints.js:1159-1160 | none | reached | reached |
| CR-206 | When a product was judged in more than one state, `states` lists each with its verdict. | constraints.js:1161 | none (MM:86 sees only passes) | reached | reached |
| CR-207 | A product's result copies only 22 named fields (and only if defined): measurementId, evidenceIds, priceIds, contextIds, observed, unit, closeToLimit, onTheLine, thinMargin, ledger, sheetsDisagree, doubtful, ceilingOnly, estimated, screened, polymer, admitted, treatment, elsewhere, missing, asPublished, caveat; beside criterion, status, reason, constraint. Anything else the numeric result had is dropped here (interval, direction, gradeId, sourceId, plausible, vetoedBy, notApplicable, polymerScreen, polymerId, estimate). | constraints.js:1166-1168 | none (BD:73 builds product results by hand and so does not prove the list) | reached (the corpus compares every record) | reached |
| CR-208 | If the estimate carries a screening certificate, the result adds `prediction` with centre, plausible, screenRange, canScreen, scope (the certificate's context) and limitation (the screen limit). | constraints.js:1169-1172 | none asserts the object | reached | reached |

## 19. evaluateOne and runSelection (lines 1176-1197)

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-209 | `SHARE` is re-exported from products.js. | constraints.js:13, 17 | SP:33 imports it from here | reached | covered |
| CR-210 | A material is judged by its products when the context carries a product map (a material missing from it counts as having none); otherwise on its own headline. | constraints.js:1176-1181 | CT:127 (no map); SP:33 (map) | reached | covered |
| CR-211 | `runSelection` builds `measurementById` and `gradeById` only when a product map and a database are present and the maps are not already given; it works on a copy of the context. | constraints.js:1184-1187 | none asserts it | reached | reached |
| CR-212 | `counts` has pass, unknown (UNKNOWN), fail (anything else), screened (additionally), total. | constraints.js:1188-1195 | CT:179 line 187; CT:333 line 338; PE:215 | reached | covered |
| CR-213 | `candidates` are the eligible evaluations, in input order. | constraints.js:1196 | CT:127 line 141; CT:333 | reached | covered |

## 20. explainExclusions (lines 1199-1246)

The corpus's engine surface does not call this function at all (no line of 1204-1245 is reached), so every row here depends on unit tests alone.

| ID | Rule | Old lines | Unit test(s) | Parity corpus | Status |
|---|---|---|---|---|---|
| CR-214 | For each requirement, `recovered` is how many more candidates there are when that requirement is left out. | constraints.js:1205-1209 | CT:127 (the ranking depends on it) | not reached | covered |
| CR-215 | `removed` counts materials where the requirement fails in the best case: a product meets it in the state that suits it best, else one unresolved holds it, else it fails; a material is removed only when every product fails it. | constraints.js:1226-1238 | CT:127 line 140 (removed 3); SP:111 "why excluded counts a material removed only when none of its products meets the requirement" | not reached | covered |
| CR-216 | `held` counts materials where the best answer is unresolved. | constraints.js:1239 | none asserts it | not reached | reached |
| CR-217 | `productsRemoved` counts products failing in their best state, and the field exists only when there is a product map. | constraints.js:1235, 1244 | SP:111 line 117 (2) | not reached | covered |
| CR-218 | A product is judged in the best state the scenario permits: the first passing state, else the first not failing, else the first. | constraints.js:1230-1233, 1237 | none (the tests only have one state per product) | not reached | reached |
| CR-219 | `screened` counts a hide only for a material that is screened as a whole, only for a mandatory requirement, and only when one of its screened unresolved results is for this requirement. | constraints.js:1215-1224 | CT:293 "why excluded counts a hide only for a material the whole question hides, and never for a reported requirement" (1; 0 when soft; B fails density and is not counted) | not reached | covered |
| CR-220 | That match is by object identity (`r.constraint === c`). | constraints.js:1219 | CT:293 passes the same object; a copy is never tried | not reached | UNTESTED |
| CR-221 | The hide is told apart by its cause: a property that does not apply; else the base polymer's behaviour; the rest are estimates. | constraints.js:1222-1223, 1241-1244 | CT:293 (`screenedNotApplicable` 1, `screenedByPolymer` 0); PE:215 (`screenedByPolymer` 1) | not reached | covered |
| CR-222 | The list is sorted by `recovered` (most first), then `removed` (most first). Equal entries keep the order of the requirements. | constraints.js:1245 | CT:127 asserts the first entry only; the tie order is not asserted | not reached | reached |

## Hazards the plan names

Each hazard lists the lines and the rows that cover it. "Covers" is as honest as the status of those rows: none of the five is asserted by a test that would fail if the rule changed, except where said.

| Hazard | Where (constraints.js) | What happens | Rows | Honest state |
|---|---|---|---|---|
| First wins on a tie: best state | 1052 | `reduce` keeps the earlier state unless the later one is strictly better, so as printed wins a tie. | CR-182 | reached, not asserted |
| First wins on a tie: best product | 1089 | Same for products; the first product in the material's order represents the material. | CR-190, CR-160 | reached; the parity ties surface (packages/parity/src/ties.ts) asserts it and was not run here; SC:198 reverses product order but does not look at which product represents |
| First wins on a tie: ledger | ledger.js 30-31 (read through line 368 here) | The tightest end is kept only when strictly tighter (an open end beats a closed one at the same value); the first of equal records is named. That file is outside this map, but its answer decides CR-72. | CR-72, CR-69 | nearest test EL:302 "the intersection takes the tightest deciding end"; the equal-value tie is not asserted |
| First wins on a tie: elsewhere | 428 | `find` takes the first annealed value that does not miss the requirement; otherwise the first listed. | CR-79 | reached, not asserted (CT:278 has one value) |
| Tidy placement | 335, 345-346 | The scatter band edges go through `toPrecision(12)` so 5 x 0.9 is exactly 4.5; the comparison is then with `>=` and `<=`, so the edge is inside. | CR-64, CR-51, CR-73 | covered by CT:435 (the 4.5 edge) |
| Untidied shortfall arithmetic | 906 | The gap is (limit - value) divided by the size of the limit with no rounding. Two products whose gaps differ in the last digits can swap order, and the sort in CR-159 compares those raw numbers. | CR-157, CR-155, CR-159 | untested |
| Prose parsed as data | 948-949 | The group sentence tests the English start of a print gate's reason ("No print profile recorded", "No temperature published"). Change the build's wording and the group sentence changes with no error. | CR-162, CR-163, CR-103 | 949 asserted exactly by PS:107; 948 reached, not asserted |
| Prose parsed as data: others | 354, 668, 712-713, 960, 1014, 470 | A full stop at the end of a reason (354); a grade id that starts with "Not " means "no grade" (668, 712-713); a ledger rule id that starts with "CL" means a class limit (960, 1014); a manufacturer name matched as "bambu" or "bambu lab" (470). | CR-66, CR-115, CR-125, CR-166, CR-176, CR-90 | reached; the "Not " and "CL" conventions are not asserted by a test of their own |
| Object identity | 1010, 1025, 1219 | `y.constraint === c` finds a requirement's answer. A cloned list of requirements finds nothing; the product is skipped without a message. (Two weak maps, 327 and 926, also key on the registry object, which is harmless but the same habit.) | CR-177, CR-220, CR-176, CR-219 | untested for the failing direction |

## The UNTESTED rules and the cheapest test for each

- CR-09 (79): one call: a headline whose interval is `{lo: null, hi: 5}` closed, asked "<= 3", assert the reason says "at most" (and `boundOf` returns the closed upper form).
- CR-11 (97): `assert.equal(compareInterval(null, ">=", 1), STATUS.UNKNOWN)`.
- CR-18 (121-122): `assert.throws(() => compareInterval(point(1), "==", 1), /Unsupported operator/)`.
- CR-34 (192): copy the estimate fixture at CT:168 with `canScreen: false` and no `screenLimit`; assert the reason contains "this estimate cannot screen".
- CR-39 (222-223): a fixture with `useEstimates: true` and `h.withheld = {ownBand: {lo, hi}, centre}` and an `asPublished` value; assert the "so no estimate is shown" sentence.
- CR-85 (452-453): `evaluateConstraint({state: {treatment: null}}, TREATMENT)` returns PASS "Used as printed". (Nothing in the engine can reach it today; decide whether the new code keeps it.)
- CR-106 (593-595): a material for which `fillerOf` returns null, constraint `{kind:"facet", facet:"filler", in:["glass-fibre"]}`; assert UNKNOWN and "Facet not recorded".
- CR-107 (593-601): two materials (a glass-fibre one and an unfilled one) and the same constraint; assert PASS, FAIL and the named-filler suffix of the reason.
- CR-136 (786): `assert.throws(() => evaluateConstraint(m, {kind: "other"}), /Unsupported constraint kind/)`.
- CR-177 (1010, 1025): run `runSelection` with a products map and a deep copy (`structuredClone`) of the requirement list passed to the second call only; assert the group text of PS:118 is the same or, if the old code skips, record that it differs.
- CR-220 (1219): in CT:293 call `explainExclusions` with the `hdt` requirement cloned after `runSelection` ran; record whether `screened` stays 1.
