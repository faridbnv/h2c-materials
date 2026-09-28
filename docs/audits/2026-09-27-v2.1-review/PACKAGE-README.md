# H2C version 2.1 review and planning handoff

Prepared 2026-09-27 in Vancouver for Farid. Reviewed source commit: `eb695b8328b369986341491d948d793abdfcb995` in `/Users/farid/Documents/h2c-materials-branch`.

**Start with [REVIEW.md](REVIEW.md), then [V2.1-PLAN.md](V2.1-PLAN.md).** The first is the coherent critical assessment; the second is the proposed architecture, decisions, phased implementation, scenario portfolio and release gates. [BACKLOG.json](BACKLOG.json) has 17 work packages with priority, dependencies, implementation anchors, evidence, acceptance criteria and estimated effort bands.

The main conclusion is that the evidence and build foundation should be retained, while version 2.1 completes the exact-product/state decision contract. Critical examples include inherited product proof/offers, incompatible treatment states, missing H2C template gates, deliberately overstrong material failure rollup, conflicting rankings, weak source-cell witnessing, and date-only replay identity. The plan addresses these before broader intake and interface refinements.

## Specialist evidence

- [Data and engineering dossier](reviews/DATA-ENGINEERING.md): nine findings, coverage denominators, source conditions, exposure applicability, treatment and practical engineering limits. Its structured companion is [data-engineering-findings.json](reviews/data-engineering-findings.json).
- [Architecture and operations dossier](reviews/ARCHITECTURE-OPERATIONS.md): twelve findings, import witness reproduction, authoring/recovery, query freshness, cache/build boundaries and documentation. Its structured companion is [ARCHITECTURE-FINDINGS.json](reviews/ARCHITECTURE-FINDINGS.json). A12 is a lower-priority isolated cache caveat, deliberately omitted from the core work-package priorities.
- [Practical interface dossier](reviews/PRACTICAL-UX.md): nine findings, rendered flows, cross-view consistency, focus behavior, search/compare context, layout measurements and tested/unexecuted coverage.

Specialist IDs Dxx/Axx/Uxx describe evidence within each lane. Consolidated F01–F17 are the planning work packages, not a claim that the lanes discovered 47 independent problems. Several lane findings are manifestations of one decision-contract problem.

## What passed, and what remains unverified

The browser-enabled complete `npm run verify` passed in 212.848 seconds. It included 318 normal tests, 171 import tests, 2× scale, reproducibility, source-to-HTML audit, snapshot checks, 66 UI views and 300 rendered scenarios/2,570 readings. Fast verification was 66.124 seconds cold and 24.563 seconds warm. Environment: macOS workspace, Node v26.9.0 / npm 11.19.1; CI's Node 24 was inspected but not executed in this review.

The initial full run failed because Chrome could not launch within the process sandbox. The approved external-copy rerun passed. Logs preserve both. Custom local browser probes completed with zero application exceptions; no runtime HTTP/CDN request was observed. Exports, import recovery and reopened scenarios worked within the tested Chrome path.

Four focused cached primary documents were hash-checked and visually reread. Numbers central to the reported examples matched; two anneal-temperature tokens had been assigned to the test-temperature field. This targeted AI sample is not a statistical measurement error rate. Human source audit, actual team usability study, alternative browsers/assistive technologies, H2C printing and lab testing remain unexecuted and are explicit future gates.

See [verification-results.json](evidence/verification-results.json), [full successful verification log](evidence/verify-full-browser-enabled.log), [source-reread record](evidence/data-engineering/SOURCE-REREAD.md), [UI probe](evidence/ux/ux-probe.json) and [focused UI probe](evidence/ux-focused/ux-probe.json).

## Repository preservation and reproducibility

[original-preservation.json](evidence/original-preservation.json) records:

- All 3,918 Git-tracked files retain their SHA-256.
- The entire folder inventory remains 14,947 files, with no added, removed, size-changed or mtime-changed file.
- HEAD remains the reviewed commit and the working tree remains clean.

Tests, generated builds, browser profiles and all review outputs were written outside the original repository. This deliverable includes reports, logs, frozen reviewed HTML, screenshots, focused PDF renders, downloads and reproduction scripts; it excludes the approximately 4.4 GB test repository copy and disposable Chrome profiles. The original external test copy was `/private/tmp/h2c-v2.1-review-2026-09-27/repo-copy`.

[REPRODUCE.md](REPRODUCE.md) provides parameterized read-only probes and an isolated-copy verification recipe. Evidence scripts kept under their original names retain exact review-run paths; use `replay/` versions to rerun against another reviewed checkout without editing those historical scripts.

No fixes, imports, supplier messages, commits, pushes or deployments were performed. This package proposes work; it does not authorize changes to the original repository.

[PACKAGE-MANIFEST.json](PACKAGE-MANIFEST.json) inventories the delivered files with SHA-256 and byte size. The manifest excludes itself.
