# Your untested list: rules the tests do not fully hold

> **In short.** The remake must not change what the tool says about any material. Of the 38 non-negotiable rules in [the must-not-change map](must-not-change.md), 26 had a test that asserts them, **11 had a test for only part of the rule, and 1 (S06-11) had no test at all** when this list was written. Those 12 are listed here in nine questions, because some rules are the same rule seen from two lists. **Since then (PR S1, no answer changed): questions 1 and 2 are closed by a test (S11-07, S06-06 and S11-10 are now fully tested), and questions 3, 4, 6 and 7 have a test for the part they could, with a line under each saying what is still open. Your boxes are untouched: a test that was added is not your answer. Tick A to agree, or say otherwise.** The map now counts 29 fully tested, 9 partly tested, none without a test. For each one, the page says in plain words what is checked, what is not, and what I recommend. Nothing here changes any answer the tool gives. A rule on this list is not broken: it is held by reading and review instead of by a test, and a rewrite is exactly when a rule held by review is easiest to lose.

**How to answer**
1. Put an `x` in exactly one box under each question, like `- [x]`.
2. To add or change anything, type it on the line after the `>` under "Your answer / notes".
3. Save the file. You can stop after group A; the later groups are needed later.
4. When you have read the list, record it in your own terminal (an agent cannot run this): `npm run wp:attest -- untested-list-received`. That is the exit evidence of WP-15.

If you do not answer, the default under each question is applied, and it is logged as "DEFAULT APPLIED, NOT RULED BY THE OWNER". "Yes to all recommendations" is a valid answer.

| Group | Needed by | Questions |
|---|---|---|
| A | Before the engine port starts (WP-18) | 1, 2, 3 |
| B | Before any preview carries real data, and before M3 | 4, 5 |
| C | Any time before cutover | 6, 7, 8, 9 |

---

## Group A: before the engine port starts

#### Question 1. S11-07 and S06-06 — The order of the six print-gate verdicts (test added; awaiting your confirmation)

**Status since this list was written:** `tests/remake/gate-order.test.mjs` states the six-step order as a literal list, written from the rule below, and compares every copy with it (old build, new build, the engine's key order, the page's word list, the shared table); it also checks that, over all 63 sets of verdicts, aggregation picks the best-ranked one. S11-07 and S06-06 are TESTED in the map. This heading is no longer a `###` heading because the check that keeps this page and the map in step lists only the open items.

**The rule.** A print gate's verdict is one of six, ranked: within, within at the low end, edge, exceeds a recommendation, exceeds, unknown. When a material has several profiles, the best-ranked one speaks.

**What is tested.** Each verdict is checked in single cases (a window covered at its low end passes; a chamber recommendation does not fail a candidate; the chamber-by-kind rule counts makers). The old test checks that the build, the engine and the page know the same six words. The new test checks that three copies of the order agree with one shared table.

**What no test checks.** That the order itself is the one written above. Both tests compare copies with each other. If the shared table and every copy were reordered together, no test would fail, and a material could change from "within" to "edge" with nothing red. Parity would catch it on the corpus, not by name.

**Why it matters.** It decides which print verdict you see for every material with more than one profile. It is the rule the current-state report itself calls "partial".

**Recommendation: A.** Add one test that states the six-step order as a literal list, written from this page and not copied from the code. It is small and needs no engine change. It would be part of the first engine port (WP-18).

**Default if unanswered:** A. **Revisit:** when WP-18 starts.

- [ ] A. Add the literal-order test in WP-18 (recommended)
- [ ] B. Leave it to parity (the corpus) and review
- [ ] C. Something else

**Your answer / notes:**
> 

#### Question 2. S11-10 — The engine never imports the interface (test added; awaiting your confirmation)

**Status since this list was written:** `tests/remake/engine-imports.test.mjs` reads every import: the old engine imports only its own siblings, no package imports from `apps/`, and `packages/engine`, `packages/domain` and `packages/data` import nothing from the old interface. One import of the old interface from a package is named and held: `packages/build/src/written.ts` reads `app/js/ui/material-highlights.js` (the build, not the engine). S11-10 is TESTED in the map.

**The rule.** The decision code must not depend on the page code. One name for each thing, one ranking, one workspace model, one facts layer; the pages decide nothing.

**What is tested.** One ranking for every lens, the same gate words in the build, engine and page, and the rendered page matching the engine over 300 random scenarios.

**What no test checks.** That the engine files import nothing from the interface. It is true today because someone looked.

**Why it matters.** The rewrite splits the engine into its own package. If one import creeps in the other way, the engine can no longer be tested without the page, and the "pages decide nothing" rule weakens quietly.

**Recommendation: A.** Add an import-direction check when the engine package is created (WP-18): a test that scans the engine's files, or a lint rule that forbids the import.

**Default if unanswered:** A. **Revisit:** when WP-18 starts.

- [ ] A. Add an import-direction check in WP-18 (recommended)
- [ ] B. Keep it as a review rule
- [ ] C. Something else

**Your answer / notes:**
> 

### Question 3. S06-11 — The reference layer and the familiar baseline are never candidates (no test)

**The rule.** The generic reference materials (steels, woods, moulded plastics) are drawn only when asked for, and never listed as candidates. A familiar material you pick for comparison is drawn beside the results and never counted among them.

**What is tested.** Nothing for this rule. The neighbouring tests hold other rules: family entries and aliases are never candidates, and a study or reference grade backs no value.

**What no test checks.** That a reference material or the chosen baseline never appears in the count, the table or the shortlist. The rendered-scenario check leaves the baseline row out of its row count, so it would not notice a baseline being counted in some other place.

**Why it matters.** A steel listed as a "candidate" for a printed part would be a wrong answer that looks like a right one. This is the only rule on the list with no test at all.

**Recommendation: A.** Before the engine port, write a characterization test on the old engine: a scenario with the reference layer on and a baseline chosen; the candidate list, count and shortlist must equal the same scenario with both off. It would then run on the old and the new engine.

**Status since this list was written:** `tests/remake/candidates.test.mjs` does this through the typed wrapper over the old engine (three question templates; candidates, counts, rows and rankings equal with the layer on and a baseline chosen as with both off, and with a reference set handed in), and on the built data: no reference material is in the compiled database, and a saved scenario cannot name one as baseline or shortlist entry. S06-11 moves from UNTESTED to PARTIAL: how the page draws and counts its baseline row is still checked only by the rendered-scenario check.

**Default if unanswered:** A. **Revisit:** when WP-18 starts.

- [ ] A. Write the characterization test before the port (recommended)
- [ ] B. Leave it to the rendered-scenario check and review
- [ ] C. Something else

**Your answer / notes:**
> 

---

## Group B: before any preview carries real data

### Question 4. S11-13 and S06-21 — Makers' bytes and text are never public (partly tested)

**The rule.** The documents makers publish, and their text, stay in your private store. A lost file is restored, never fetched again to fill an old decision.

**What is tested.** A restore takes back only bytes that match a registered fingerprint. Exported working packets are not left tracked in the repository.

**What no test checks.** That the published site contains no maker's text or file. The plan has an allow-list test over the built site (WP-25 and WP-32), but it does not exist yet, and a preview site is already public.

**Why it matters.** This is a legal and trust line. It is also the rule most likely to break during a rewrite, because the new site is built from new files in a new way.

**Recommendation: A.** Bring the allow-list test forward: it must pass before any preview carries real data. It searches the built site for private markers and for any file not on a list.

**Status since this list was written:** `remake/tools/private-scan.mjs` exists and `preview-assemble` runs it at the end of `inject` and `stage`, so a preview deploy fails closed (folder or zip; `tests/remake/private-scan.test.mjs`). It fails on `.cache` paths, OCR and text-cache keys, packet names, `H2C_` names, `/Users/` paths, database files, PDFs, saved web pages and any file type off the allow-list. Still open: makers' prose pasted into an allowed file type is recognised only by those markers, because comparing with the private text cache needs your machine. The current preview (commit 804f0a81) scans clean. S11-13 and S06-21 stay PARTIAL.

**Default if unanswered:** A. **Revisit:** at the first preview that carries data.

- [ ] A. Require the allow-list test before any preview carries real data (recommended)
- [ ] B. Keep it where the plan has it (WP-25 and WP-32)
- [ ] C. Something else

**Your answer / notes:**
> 

### Question 5. S11-14 — The seven non-claims and the public address (partly tested)

**The rule.** The tool states its seven non-claims and the printer's envelope. It stays at `pdynamics.ca/h2c-materials/`, with material pages at `materials/<id>.html`, or tested redirects.

**What is tested.** The material pages exist, link to each other and back to the selector, and the print-envelope gate is tested.

**What no test checks.** That the seven non-claims are stated anywhere, and that the public address and its redirects work. The current-state report lists the guard for this row as "n/a".

**Why it matters.** Old links in people's bookmarks and saved scenarios must keep opening. The non-claims are what stops the tool from being read as more than it is.

**Recommendation: A.** Add both to the site test suites (WP-22 and WP-25): a test that the non-claims text is on the front page, and a test that the old addresses open or redirect, under the real base path.

**Default if unanswered:** A. **Revisit:** at WP-22.

- [ ] A. Add both tests in the site suites (recommended)
- [ ] B. Only the address test; the non-claims stay a review item
- [ ] C. Something else

**Your answer / notes:**
> 

---

## Group C: any time before cutover

### Question 6. S11-12 — No check is weakened to pass (partly tested)

**The rule.** When a change moves answers, the build reports it and fails loudly. No check is edited to make a change pass.

**What is tested.** The decision snapshot and the build diff are gates. The old tests cannot lose a test or gain a skip: the register now freezes their counts, and the old paths are locked on this branch.

**What no test checks.** A ported test whose assertions are edited. Once tests are copied into the new packages, an edit that makes a failing test pass looks like any other edit.

**Why it matters.** It is the commonest way a rewrite changes behaviour while looking green. The plan already says ported tests change only in import suffixes and labels. That sentence can be checked by a script.

**Recommendation: A.** In WP-18, add a check that compares each ported test's assertion lines with the old file's, and fails on any difference other than import paths and labels.

**Status since this list was written:** `checks/test-floor.txt` now records, for every registered test file (old and new), the fewest tests and assertion calls it may hold, and `npm run checks:register -- --verify` fails when either drops or when a registered file has no floor. That catches a test or an assertion deleted to make a change pass. It does not catch an edited expected value or a weaker assertion of the same kind: the assertion-line comparison with the old file, as recommended here, is still to be built in WP-18. S11-12 stays PARTIAL.

**Default if unanswered:** A. **Revisit:** when WP-18 ports the first test.

- [ ] A. Add the assertion-line comparison in WP-18 (recommended)
- [ ] B. Rely on review
- [ ] C. Something else

**Your answer / notes:**
> 

### Question 7. S11-08 — A new conversion or limit starts as "reported" and becomes "deciding" in its own commit (partly tested)

**The rule.** A new evidence-ledger row (a conversion or a class limit) lands as "reported", which decides nothing. It switches to "deciding" in a commit of its own, with its decision diff.

**What is tested.** The ledger works only in its safe direction, and a reported row never decides on the compiled data.

**What no test checks.** The commit rule. It is a procedure, and nothing looks at history.

**Why it matters.** It keeps a science change visible on its own, so you can see exactly which answers moved.

**Recommendation: A.** The plan's write service already makes a rule-row change travel alone in its change set (WP-17). Add the test for "a rule-row change set holds nothing else" there. No separate work.

**Status since this list was written:** WP-17's tests of that refusal (`rule-row-not-alone` in `tests/remake/write-guards.test.mjs`, `write-export.test.mjs` and `write-commands.test.mjs`) are now registered and named in the map, so the "alone" half is held. The other half, that a new rule row lands as `reported` and switches to `deciding` in a later change set with its decision diff, cannot be a test today: nothing in the write service refuses a rule row added as `deciding`, and no check reads history (and `main` is frozen, so no commit can break it meanwhile). Refusing `deciding` on an added rule row would be a change to the write service; it is yours to rule on. S11-08 stays PARTIAL.

**Default if unanswered:** A. **Revisit:** at WP-17.

- [ ] A. Cover it with the WP-17 rule-row test (recommended)
- [ ] B. Keep it as a procedure
- [ ] C. Something else

**Your answer / notes:**
> 

### Question 8. S11-01 and S06-18 — Every value comes from its own line of the source (partly tested)

**The rule.** A shown number is a recorded measurement, traced to the source's fingerprint, page, locator and the maker's own words. It is read from the sheet, never from memory or a summary. A deciding value is a number its own evidence line prints, with one role.

**What is tested.** On import, a value its own line does not print stops the batch, and a number has one role. The acceptance cases cite the records their answers rest on.

**What no test checks in CI.** Rows already in the data are re-checked against their evidence line only by the context audit and the spot-check, which need your private text cache. In CI the context audit prints SKIPPED and passes. An earlier check round found 29 of 540 records had words in the wrong place.

**Why it matters.** It is the basis of every number. The risk is not the rewrite but the habit of assuming a green CI run checked the sources.

**Recommendation: A.** Source custody's honest private checks (WP-29) make "not run" a visible result. Confirm that the context audit and spot-check are named there as required on your machine before cutover.

**Default if unanswered:** A. **Revisit:** at WP-29.

- [ ] A. Name both checks as required on your machine in WP-29 (recommended)
- [ ] B. Keep them optional
- [ ] C. Something else

**Your answer / notes:**
> 

### Question 9. S06-16 — What can be calculated is not stored (partly tested)

**The rule.** Anything the build can compute from the records (medians, per-kilogram prices, grade lists) is computed and never stored beside them.

**What is tested.** Single cases: a written summary types no number by hand, a headline pin exists only where the rule chooses wrongly, a derived coverage row speaks only where no stored row does.

**What no test checks.** A new column that stores something the build could compute. There is no way to test that in general.

**Why it matters.** A stored copy goes stale and disagrees with the records.

**Recommendation: B.** Keep it as a review rule, as it is. The write service (WP-10) will refuse values for columns the schema marks as derived, which is the practical guard.

**Default if unanswered:** B. **Revisit:** at WP-10.

- [ ] A. Try to write a general test
- [ ] B. Keep it as a review rule (recommended)
- [ ] C. Something else

**Your answer / notes:**
> 
