# Repository documentation reconciliation — 2026-10-01

The owner requested current, coherent documentation of completed and remaining work, followed by a push to main. This change improves GOALS steps 2 and 5 and scorecard C13/C15 by making the research backlog reproducible. It refreshes the evidence links for C3/C6/C9/C10/C11 without assigning new scores or claiming human review.

The [current status](STATUS.md) is the entry point: **75 of 136 material assessments and 21 of 1077 joined product passes are complete**. The remaining **61 material and 1056 product targets** are individually listed, with the original questions, prior searches and stopping rules retained. Completed outcomes name their approved AI review packets and implementation commits. Coverage marks, work completed and product suitability are separate concepts.

## Documentation repaired

- Root README, the documentation and audit indexes now point to the current campaign, rather than calling the smaller 2026-09-28 campaign the latest work.
- GOALS records the new publication authority and links current generated screening, printability, know-how and operational evidence. Earlier decisions, scores and timing reports retain their dates.
- AGENTS and IMPORTING state the existing bounded campaign exception and its isolated import ledger. The general import pause remains outside it.
- OPEN-PROBLEMS distinguishes raw coverage rows from the in-scope UI; retains unresolved Insublend, identity, certification, exposure and source-custody handoffs; refreshes the dated local index/custody counts; and lists the unfinished campaign.
- DATA-MODEL documents the already-implemented missing-lower-bound behavior. Historical source packets, rejected/corrected reviews and tranche receipts remain intact.
- The [effort and value estimate](EFFORT-AND-VALUE.md) separates planning judgment from measured results and from permission to change the approved scope.

## Reproducible status and protection

`npm run audit:coverage-status` derives status and pending CSVs from the current build, all 1213 frozen targets, approved committed outcomes and the canonical composite-key table diff. The generated documents include all implementation commits, environmental record presence and current print-gate counts. Private originals and machine-specific source-store paths are excluded from the new worklist inputs.

`verify:fast` runs the checker after building. Its check mode writes nothing and rejects stale generated documents, duplicate or out-of-scope closures, missing commits and packets no longer pinned by an approving review. [Five disposable-copy fixtures](document-status-fixtures.json) exercise the actual checker. Pages checkout retains Git history because the checker reads the frozen baseline and implementation receipts.

The [whole-campaign replays](STATUS.md#changed-answers-across-the-whole-campaign) compare the frozen baseline with completed implementation through 955a51b. Their question sets overlap; answer changes must not be added together. They are historical receipts, not predictions of future yield.

## Verification and limitations

The [machine-readable receipt](documentation-reconciliation.json) records the current release, scope, 34 re-run documented SQL commands, local source/index counts, link checks and final verification results. SQLite was rebuilt to the current release before running those queries. This documentation change admits no new research evidence and changes no compiled tool answers.

Full verification includes import tests, reproducible builds, source-to-page audit, 69 rendered interface views and 300 rendered scenarios. Warm verification remains below 90 seconds. The recorded historical cold overrun, private-cache gaps, human source spot-check and team/physical-test limitations remain open.

The owner authorized publishing the reviewed implementation and these documents on 2026-10-01. Publication does not complete the original campaign: its all-target research, admission, review and backup finish criteria still apply to the 1117 pending targets.
