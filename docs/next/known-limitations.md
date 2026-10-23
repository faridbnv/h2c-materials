# Known limitations of the candidate

> **In short.** What the candidate does not do, does not prove, or does differently on purpose, in one list. `npm run
> candidate:receipt` copies these lines into the receipt (`remake/candidates/<sha>.json`, field `limitations`), together with the
> defects in [defects.md](defects.md) that are kept as known limitations. A line leaves this list only when its cause is fixed or
> the owner rules on it. Format: `- **L-NN.** text`.

- **L-01.** The browser checks run in Chromium only. Firefox is not checked, and Safari is checked by the owner by hand (the `safari-check` row), not by a test.
- **L-02.** The preview rehearsal cannot prove the live deploy path. The preview deploys by pushing to a repository, the live site by `actions/deploy-pages`; the first proof of the live path is the cutover deploy itself (pack 07 section 13.3).
- **L-03.** `next-main.yml` has not run on `main`. Its dry run deploys to the preview repository; the live jobs, the release job and the live restore are exercised for the first time at the cutover, and the actions they use (`upload-pages-artifact`, `deploy-pages`) are pinned by commit SHA written without a network check.
- **L-04.** Approvals of pull requests into `remake/v3` were posted by agents under ruling R-ATTEST-AGENT (2026-10-22), not by the owner. The owner reviews them at each milestone close. Pull requests into `main` and the cutover are the owner's.
- **L-05.** The team trial (WP-33) has not run. The decision on simplifying the estimate model that waits for it (OQ-08 A) is therefore still open.
- **L-06.** The ingest journey (WP-28) and the second copy of the source store (WP-29) were deferred. The old ingest tools are kept and their behaviour has not changed; the new site has no ingest of its own.
- **L-07.** Estimates depend on the runtime (DT-2, postponed by OQ-07 A). Node is pinned and recorded in each release, but a build on a different ICU can give other estimate leaves; six tensile leaves already differ between the Mac and CI (gap-1). The artifact digest in a receipt equals the deployed one only when both are built on the same platform and Node.
- **L-08.** The size budgets have no headroom. Measured 2026-10-23 on the candidate: strict boot 894.4 of 900 KB gzip, site 99.18 of 100 MB. Any data batch that adds a material or a source will cross a line, and the build then fails its budget gate. M5 must decide before the next data batch: shrink (more compact detail parts, a smaller view) or relax a line. Relaxing one is the owner's decision.
- **L-09.** After the cutover the engine is compared with the previous release's engine only by hand. The post-cutover parity mode (a commit's engine against the last release's engine on the same data) is not automated; the release's decision diff says so.
- **L-10.** Five rows of the check register are owned by deferred packages (WP-28, WP-29) or by the clean-up after the cutover (WP-38); `checks:register -- --cutover-ready` lists every row that is not yet proved or approved for retirement.
