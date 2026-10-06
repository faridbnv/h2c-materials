# Verification receipt — 6 October 2026

> **Historical record**: final checks for release `3d10601675b8`, with the restored source cache and frozen implementation. These are AI review and automated checks, not physical tests or human validation.

`npm run verify` exited **0** in **392.1 seconds**. All 18 steps passed, with no skipped steps. Its fast subset took **39.9 seconds**, inside the 90-second budget. The sanitized full output is in verify-output.txt.

| Step | Seconds |
|---|---:|
| Format | 0.8 |
| Schema | 0.7 |
| Lint | 0.7 |
| Rules document | 0.1 |
| Dictionary document | 0.1 |
| Decisions document | 0.1 |
| Build and core tests | 33.3 |
| Campaign documents | 4.0 |
| Status document | 0.2 |
| Import tests | 7.4 |
| Data audit | 18.7 |
| Source-context audit | 109.2 |
| Snapshot | 1.1 |
| Interface views | 52.0 |
| Rendered scenarios | 56.1 |
| Scale | 86.5 |
| Reproducibility | 21.3 |
| Scale budget | 0.1 |

The core suite passed 550 tests and the import suite 287; each had zero failures and zero skipped tests. The restored-cache context audit found 126 accepted findings, zero new findings and zero stale acceptances. These accepted findings remain reviewed limitations, not corrected source data.

All 69 interface views matched their snapshots, with no laptop/tablet/phone layout failures. The rendered check passed 300 scenarios and 2,588 readings. The scale test passed with 327 materials and 29,391 measurements; gate 1,103 ms, compile 75,408 ms and no-estimates core 1,435 ms were within their budgets. Two independent builds produced identical bytes. Scale and reproducibility each passed their test with no skips.

Additional retained checks:

- 40 targeted source-grounded/product/know-how tests passed in 2.588 seconds.
- Eight actual offline Chrome cases passed: PLA/PETG Mechanical and Products, annealing unavailable/available, 1,180/390 px widths, source navigation and current-state exclusion. Zero remote runtime requests and browser errors; browser-checks.json holds the cases.
- 92 explicit impact/template questions, 101,200 product/question answers, zero changed answers. All material headline/summary and product headline/state/print fields matched the archived baseline; answer-parity.json holds the comparison.
- `npm run build:diff` exited 0: 61 differences limited to know-how/topic counts and the new source. Numerical snapshots remained unchanged; only counts and three existing interface snapshots changed. `npm run data:diff` records eleven retopics, four new claims and one new source, with no changed measurements.
- Migration m383 rerun exited 0 with zero changed rows. In an isolated copy, an unexpected Q00990 quote was refused with `Q00990 Finding moved`; every data file remained byte-identical after refusal. migration-refusal.json retains the expected nonzero exit. The first isolated setup lacked the build dependency link and was corrected; that setup failure was not counted as a guard pass.
- Source export exited 0: 2,572 verified originals, one copied, 2,571 retained, 15,830 derivatives. The 96 missing originals remain explicit gaps. No private originals or backup path are included in this packet.

Earlier failed attempts and their causes are retained in status.json. They are not reported as passes. The complete successful run covered the final application, data, tests and snapshots; final receipt wording and artifact hashes were finished afterwards, then documentation markers/status and whitespace were checked before the local checkpoint. No application or deciding data changed after that successful run.

## Documentation and main-publication checkpoint

On 6 October 2026 the owner authorized updating the documents and pushing the completed implementation to main.
The documentation update changed no application, table, schema or selection input. `npm run build:diff` exited 0:
release `3d10601675b8` unchanged, **0 differences** against implementation commit `f57dffda`. `npm run data:diff`
exited 0 with no changed records. The regenerated validation report changed only its build date to 6 October.

A fresh `npm run verify` exited **0** in **418.0 seconds**, all 18 steps passed and no step skipped. Its fast subset
was **63.2 seconds**, within 90 seconds. It passed 550 core and 287 import tests (no failures/skips), restored-cache
context audit (126 accepted, zero new/stale), 69 interface views, 300 rendered scenarios/2,588 readings, the doubled
327-material/29,391-measurement scale check and reproducible builds. The exact timings and complete sanitized output
are in publication-verify-output.txt. Documentation history/status checks, local file links, artifact digests and
whitespace also passed. Git remote publication and the website deployment are verified separately from these local
checks; RESUME.md records the commands and the exact implementation checkpoint.
