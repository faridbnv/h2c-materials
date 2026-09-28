# H2C version 2.1 review: architecture, evidence operations, build and documentation

Review date: 2026-09-27. This is an independent review contribution, not an implementation. Inspection used `/private/tmp/h2c-v2.1-review-2026-09-27/repo-copy`. The original repository was not edited. Paths and line numbers below refer to the reviewed repository. The root review coordinates full verification and runtime timing; this contribution did not run broad builds or tests or fetch sources. Its executed probes were read-only imports and in-memory data mutations; one isolated cache probe used a miniature directory outside the repository copy.

## Executive assessment

**Keep the architecture, improve the evidence and operational boundaries.** CSV authoring under declared schemas, a deterministic compiler, a separate estimate overlay, a pure selection engine, and an offline single-file application are suitable for a small engineering team. A database server, a frontend framework rewrite, and a general purpose parsing language would increase operating cost without addressing the most important problems.

The strongest part of this system is its explicit treatment of uncertainty and ownership. Raw and typed conditions, immutable IDs, source hashes, grade/material ownership checks, duplicate retirement, measurement reconciliation, per-product selection, and a declared estimate screening boundary are sound foundations. The documentation explains why many rules exist. The schema and manifest expose a bad edit at a data point rather than allowing silent spreadsheet coercion. The same decision pipeline serving production, trace, audit and tests avoids implementation drift.

The weakest part is the distance between **a consistent computed answer** and **a correctly read, reproducible engineering decision**. A numeric guard checks whether digits occur anywhere on a page, even as part of another number or a standard. A large part of testing compares the application with its own engine and the database with its own compiler. Those checks are valuable, but do not independently prove that the source row was read correctly or that the resulting shortlist fits an engineer's actual part. Shared selections are tied to a date that can remain unchanged while the database changes. Operational convenience views can combine current source tables with stale compiled tables. These are more important than reducing code size for its own sake.

Version 2.1 should strengthen those boundaries first. The order should be: source-grounded decision fixtures and evidence anchors; content-addressed release identity; trustworthy data-point inspection and recoverable writes; measured contributor and engineer workflows; only then targeted ingestion and build changes that improve those workflows.

## Scope and evidence standard

The intended user and workflow are stated in `docs/GOALS.md:7-36`: a small engineering team turns a part's requirements into a material shortlist, then a product choice, then its own print and test. The data tier policy in `docs/GOALS.md:40-55` intentionally allows cheap recording while decision values receive strict checking. The relevant scorecard lines are C3, C6, C9, C11, C13, C14 and C15.

I read GOALS and OPEN-PROBLEMS before examining code. Existing source gaps, unknown conditions and human testing gaps are not reported as newly discovered defects. In particular, GOALS C3 already says no person has measured the error rate, and C7 says ranking is untested with the team. Findings below distinguish a reproduced defect, a code-established design limitation, and a recommendation. No current corpus measurement is declared wrong solely because a guard is weak.

No external engineering standards or supplier documents were re-read in this architecture contribution. Source accuracy findings therefore concern the mechanism and verification coverage, not a new verdict on a commercial filament. Test completion and measured wall-clock timings belong to the root review's retained verification log, not to claims here.

## What version 2.1 should preserve

1. **One authoring format and a visible contract.** Data changes in `data/tables/*.csv`; schemas declare values, missing states and references; generated output remains derived. CSV is reasonable at this scale and for this team. A readable text row and a trace to its source are assets.
2. **Product-level conjunction.** Requirements must pass together on one product. `test/selection-products.test.js:44-50` explicitly protects the stiff-product/hot-product pooling error. Do not return to family medians deciding eligibility.
3. **Inference as an overlay.** `build/src/pipeline.js:27-46` supports `estimates:false`; the core must stand alone. Do not couple source acquisition, estimates and rendering into one indivisible process.
4. **Pure engine and generated labels/registry.** New properties can pass through the pipeline without hand-editing every UI table. The engine is testable without a browser. This is a good expansion seam.
5. **Failing loudly, with an accountable exception.** Reviewed warnings and physics exclusions remain visible. Weakening rules to meet a build budget would make the tool less trustworthy.
6. **Offline delivery.** Keep a single-file distribution unless a demonstrated user workflow cannot fit it. A service backend is not necessary for the stated goal.
7. **Decision diffs.** Preserve the output snapshots and explain which scenario answers move. Extend the scenario corpus with real task fixtures rather than abandoning this discipline.

## Findings and implementation-ready recommendations

Priorities: P1 means a first version 2.1 milestone before confidence or feature expansion; P2 means an operational or usability milestone after the trust boundary is specified; P3 means a bounded follow-up or hardening item. Effort is an engineering estimate, not a commitment: S roughly 1–2 working days, M roughly 3–5, L roughly 1–2 weeks including meaningful verification. Actual implementation should re-estimate from the chosen design.

### A01 — P1 — The import's numeric proof is not bound to the source row

**Status:** reproduced mechanism defect; current corpus impact not established. **Goal:** decision-tier accuracy (Translate/Screen/Drill down; C3, C6, C9). **Effort:** M for token and evidence checks, L for richer table/condition binding.

`numberOnPage` ends with substring matching against a whitespace-free entire page (`scripts/lib/pdf-text.mjs:227-258`). The import guard uses it for numeric fields (`scripts/ingest/apply.mjs:180-183`). It does not compare the proposed value with the proposal's supplied row text, property, column or condition table.

Read-only reproduction, using the existing test fixture proposal and cached text: the fixture evidence is `Tensile strength (X-Y) ISO 527 52 MPa`; replacing Raw value, Raw numeric and Normalized value with `5 MPa`, `5`, `5` produces **zero guard findings**. The unchanged evidence text still says 52. A smaller pure probe on `Tensilestrength52MPaASTMD638` returns true for 2, 5 and 6, though no result with those values is stated. See `probes/import-number-guard.mjs` in the external review package.

This is not evidence that an existing product is wrong. It is evidence that the guard cannot substantiate the documentation's strong promise that every accepted number was printed where its locator says. Hashing proves which document was used; it does not prove which cell its digits belonged to.

**Implementation:** treat whole-page presence as a weak retrieval hint. Decision rows should carry an evidence anchor containing document digest, page, bounded source text or spans, property row, value column and applicable condition/header context. Verify the value token and its unit within that anchor, including inequalities, uncertainty and source-specific decimal/exponent typography. If the extractor cannot establish that association, require an explicit visual review tied to the page image and anchor rather than silently accepting presence anywhere. Preserve the raw source statement. Do not relax the existing source hash, typed/raw or schema checks.

**Acceptance:** the supplied 52→5 corruption is refused; digits inside standard IDs or other numeric tokens cannot satisfy a result; changing a property/column/condition while retaining a numeric value is either refused or marked for explicit visual review; decimal comma, spaced digits, ±, bounds, exponents and genuine multi-column sheets remain supported by focused fixtures. Sample decision values behind changed scenario answers must be checked against source pages by an independent reviewer, with the reviewer identified.

**Dependency:** define a minimal evidence-anchor contract before modifying the reader. The record tier can retain simple page/text statements; strict anchoring is for values that decide.

### A02 — P1 — A snapshot date does not identify the exact shared database

**Status:** code-established release/design defect; no live deployment claim. **Goal:** defensible, repeatable selections and team handoff (Understand/Confirm; C14, C15). **Effort:** M. **Dependency:** release identity design precedes scenario format migration.

`data/tables/method.csv:2` still identifies the snapshot as 2026-09-21 and says there is no ranking, while later work added ranking and new sources. `bundle.js:61` names an artifact only by that snapshot date. README says that address pins a database snapshot (`README.md:53-61`), but Pages assembles the latest file into a new site on each publication. The same filename can therefore represent changed contents.

Scenarios record a date and app build (`app/js/engine/scenario.js:15-20`), but URL hashes transmit only `dbSnapshot` for database identity (`:167-195`). Import warns only when the date differs (`:152-155`). Two builds with the same date but different measurements or decision rules can produce different answers with no snapshot mismatch warning.

**Implementation:** generate a content/release ID over decision tables, schema/rules, engine semantics and relevant printer baseline. Embed it in the HTML, exported results, saved scenarios and share links. Include an app/schema version separately from a human-readable data date. Keep immutable release artifacts accessible for published selections, or explicitly mark a link as a reusable question against the current database and show the result-diff on reload. Record lockfile/dependency/runtime information in the release manifest; `index.js:116-137` currently records commit and major input hashes but not installed dependency/runtime identity and excludes package files from `sourceTreeClean`.

**Acceptance:** two decision-affecting changes on the same date get different release IDs; a saved scenario reopens on its exact supported release or visibly offers a migration; migration lists added/dropped requirements and changed result counts; an exported shortlist includes release ID, product IDs, evidence level and assumptions; an archived release rebuild matches its artifact under the declared toolchain. Historical saved scenarios remain readable and report that their original identity was date-only.

### A03 — P1 — Add an independent engineering acceptance layer to the existing consistency tests

**Status:** known human-review debt plus a test-coverage limitation, not a claim that the suite is ineffective. **Goal:** practical correctness (all selection steps; especially C3, C6, C7). **Effort:** L with engineer participation; M for fixture runner. **Dependency:** A01/A02 enable durable source and release references.

UI fuzz imports `runSelection`, `compareInterval`, product composition and scenario validation from the same app engine (`scripts/ui-fuzz.mjs:50-58`) and calls them as its oracle (`:186-208`). The systematic audit independently rebuilds bytes but uses production `buildDatabase` (`scripts/audit-data.mjs:24-25`). Reproducible-build testing checks another run of the same tree on the same environment (`test/reproducible.check.js:18-30`). These are good consistency, regression and packaging checks. They cannot catch a decision error shared by engine and UI, nor a wrong source interpretation shared by reader and validator.

There are good independent synthetic rule assertions: `selection-products.test.js:33-121` gives explicit expected results for product conjunction, incomplete evidence, printability and ranking. Version 2.1 should extend that pattern to a small set of real source-backed tasks rather than duplicate the entire engine in another implementation.

**Implementation:** establish a reviewed scenario fixture set covering the actual funnel. For each, retain part requirements, expected product-level disposition and explanation, source page anchors, deliberate gaps, a nearest miss, a ranking rationale and an expected confirmation action. Include heat + stiffness on one product; layer strength; moisture/conditioning; chemical agent/concentration; enclosure/chamber ambiguity; drying/treatment; a material with no procurement product; and an uncertain result that must remain uncertain. Two or more mechanical/materials engineers should review the expected conclusions and perform task-based UI sessions. This is a proposal to obtain human validation, not a claim it has happened.

**Acceptance:** every hard requirement has independently reviewed PASS/FAIL/UNKNOWN/INDETERMINATE examples; deliberate wrong-column and wrong-condition corruptions are detected; a shared engine mutation cannot pass by appearing identically in the UI; fixture outcomes and source anchors survive a release migration; task sessions show engineers reach a defensible product choice and its print/test instructions. Report whether a review was by an agent or a person. Do not describe fuzz counts as source accuracy measurements.

### A04 — P2 — Rehearsal is strong, but table writes and ledger updates are not a recoverable transaction

**Status:** code-established failure/concurrency exposure, not reproduced data loss. **Goal:** safe data changes and debugging (C13, C15). **Effort:** M. **Dependency:** choose a transaction/recovery protocol that preserves CSV authoring.

`applyBatch` guards and rehearses before applying (`scripts/ingest/apply.mjs:399-416`), which is good. It then writes several tables, the manifest, and later the import ledger. `openTables.save()` writes dirty CSVs sequentially, then recomputes/writes the manifest (`scripts/data/table-io.mjs:184-197`); files are not staged and atomically promoted as a recoverable set. A process interruption, disk error or failed ledger write can leave a partially applied batch. The API's `expect` compares with the copy read at `openTables`, not with current disk contents at save (`:55-60`). A second writer can therefore overwrite changes after both read the same tables. AGENTS' separate-worktree rule mitigates accidental simultaneous writes, but does not make writes transactional.

**Implementation:** keep CSVs but stage intended changes in a transaction directory, record the pre-image hashes and manifest, validate the staged world, and acquire a repository/data write lock before checking pre-images and promoting. Use a journal/recovery marker so a multi-file promotion can be completed or rolled back after interruption. A simple sequence of file renames is not a fully atomic multi-file transaction; document the recovery semantics. Include accepted-findings and import-ledger changes in the same protocol where applicable. Refuse a stale base rather than overwriting it. Prefer this bounded protocol over a new server database.

**Acceptance:** injected failure after any table promotion recovers to either the previous complete manifest or the next complete manifest; two writers from one base cannot silently overwrite; a dry-run changes nothing; a second identical apply is a no-op; divergent reapplication is reported, not silently skipped. The original source evidence and all IDs remain intact.

### A05 — P2 — SQLite inspection can present a mixed or stale world

**Status:** code-established debugger integrity defect. **Goal:** understanding and repairing a data point (C11, C13, C15). **Effort:** S–M. **Dependency:** A02's input digest can serve as freshness identity.

`writeSqlite` reads current CSV tables and then imports compiled headlines/products from any existing `dist/db.json` without checking that its inputs match (`scripts/data/sqlite.mjs:184-188`). After a data edit and before rebuilding HTML, even a freshly generated SQLite file can contain current measurements beside old product values. `npm run sql -- '<query>'` reuses an existing SQLite file unless missing or `--rebuild` is supplied (`:240-250`), so subsequent queries can also silently use stale raw tables. OPEN-PROBLEMS does tell readers to run db:sqlite first; that reduces one stale path but does not prevent the mixed compiled/raw path.

**Implementation:** attach an input/release manifest to SQLite. Ensure compiled and raw views derive from one validated input identity, either building the compiled core directly or refusing stale dist with a clear rebuild instruction. Before a query, validate the SQLite input identity or require an explicit snapshot/query mode. Offer a fast `--current` path and an explicit historical `--snapshot` path. Report whether FTS/text corpus is complete, partial or unavailable rather than only whether a cache directory exists.

**Acceptance:** editing a measurement makes a plain current query refresh or refuse; raw and compiled views share the same release/input ID; a fresh clone without dist can still inspect tables with clearly labelled compiled-view availability; partial source caches cannot imply corpus-complete search. A regression fixture changes one known value and proves its raw and product views agree.

### A06 — P2 — Fetches need bounded execution and durable progress

**Status:** code-established operational limitation; no live supplier outage tested. **Goal:** reliable targeted acquisition (C3, C9, C13). **Effort:** M. **Dependency:** A04's state-write protocol or a smaller journal for acquisition.

The fetcher respects two requests per host and spacing (`scripts/ingest/fetch.mjs:35-37,220-245`), deduplicates by digest and retains retrieval provenance. However `get` has no explicit abort/deadline, consumes the entire response body, and only retries a selected set of HTTP statuses (`:70-76`). Transport failures become status 0 and are not retried by that set. It does not use Retry-After. The ledger is written after the whole run completes (`:322-323`); interruption can leave downloaded immutable blobs whose progress is absent from the ledger. Per-host concurrency is bounded, but the number of concurrently active hosts is not.

**Implementation:** bound request time, body read time and document size; make retries explicit and idempotent with transient network failures and Retry-After handled. Journal each completed digest/retrieval, then compact the ledger deterministically. Introduce a small global concurrency cap and a cancellation path that retains completed work. Make refetch/changed-document semantics explicit: a changed digest is a new revision to review, not an overwrite of the old source. Do not add general crawling or expand import scope without owner direction.

**Acceptance:** stalled connection/body, connection reset, 429 with Retry-After, bad PDF response, oversized document and interrupted batch each leave a recoverable named state; rerunning resumes without re-downloading completed digests; time and size limits appear in a short operator guide; existing source URLs and bytes remain distinguishable from a newly fetched revision.

### A07 — P2 — Promote ingestion from a dated campaign into a small maintained subsystem

**Status:** maintenance/design limitation, not a parser failure by line count. **Goal:** targeted data expansion that agents can debug (C2, C3, C13, C15). **Effort:** L, staged. **Dependency:** A01 evidence contract, A04 state protocol; do not refactor the reader before a parity baseline is pinned.

Operational files are hardcoded to `docs/audits/2026-09-18-v2-import` across fetch, extract, proposal, apply, witness and batch; live proposals are under `archive/ingest-2026-09-18/proposals` (`scripts/ingest/archive.mjs:1-4`). The record tier also depends on that campaign ledger and proposal archive (`scripts/data/record-tier.mjs:43,86-90,122-155`). These archives are not disposable history: they are active operational and query inputs.

`propose.mjs` is 3,296 lines; it combines lexical extraction, layout heuristics, test conditions, identity, source naming, grade construction, printing settings, maker statements, parity scoring and CLI output. `batch.mjs` adds 893 lines of scheduling, holds and review transformations. The code carries valuable failure explanations; deleting them or splitting functions randomly would harm maintainability. The problem is that a contributor needs campaign history and many implicit module globals to change one interpretation safely.

**Implementation:** define a minimal `IngestContext` (paths, source/text store, tables, lexicons, reader version), immutable proposal format/schema and an explicit state transition contract. Route live operational state through one configured place; retain historical campaign artifacts unchanged with a compatibility reader. Extract seams by responsibility: source/layout read; value and condition extraction; product identity/ruling; recipe/know-how proposals; comparison/parity; CLI orchestration. Prefer a few explicit adapter interfaces for recurring manufacturer layouts over an ever larger catch-all parser or new generic DSL. Record which reader/adapter and version produced each proposal.

**Acceptance:** a fresh isolated context can read one fixture without reaching into the 2026 campaign; a future batch can run under a new operations root; migrating paths changes 0 product values/scenario answers; current proposals remain interpretable; changing one adapter has scoped source fixtures and a measured before/after parity report including independently transcribed rows. Identity uncertainties remain rulings or data states rather than ad hoc automatic guesses.

### A08 — P2 — Evidence replay depends on a local cache with no stated durable recovery contract

**Status:** documented deployment/maintenance limitation; external backups were not inventoried. **Goal:** long-term traceability (C3, C11, C15). **Effort:** M. **Dependency:** source packaging policy and A02 manifest.

Source bytes and extracted text are gitignored (`.gitignore`, `.cache/`), and `documents_fts` is built only from locally cached text (`scripts/data/record-tier.mjs:24-25,194-200,226-238`). Committed proposal facts can be reconstructed without the cache, but complete page text and hash-checked source re-reads cannot. A publisher can remove or replace a URL; a hash can detect a changed response but cannot recreate old bytes. This does not require committing copyrighted PDFs to the public repository, and it is not evidence that the owner lacks a backup. The repository documentation does not establish a durable evidence-store and restore procedure.

**Implementation:** provide a separate evidence bundle/store with immutable digest-addressed bytes, retrieval manifest, parser versions and a documented restore process. It can be private/local and managed separately from code. State which source bytes must be retained for decision replay and which record-tier artifacts are optional. Add a source availability/restore audit that never silently fetches a new revision as if it were old evidence. Distinguish reproducible offline app build from reproducible source re-reading.

**Acceptance:** restoring a review's evidence bundle lets an independent clone verify the source anchors for its decision fixtures without live network dependence; absent bytes are listed by source/digest with a named action; the query tool reports its indexed-page completeness; public release manifests do not expose private filesystem paths.

### A09 — P2 — Make clean-clone setup and mandatory verification an executable contract

**Status:** definite documentation omission plus a gate reporting limitation. **Goal:** ease of use and trustworthy contributor verification (C13, C15). **Effort:** S–M. **Dependency:** none; useful early alongside A01.

README Quick start installs only the build package (`README.md:21-33`). Root `package.json` declares pdfjs-dist, and `scripts/lib/pdf-text.mjs:17` imports it from the root tool tree; installing dependencies only under build does not make it available to scripts. CI correctly runs both `npm ci --prefix build` and `npm ci`; its comments identify the earlier import test failures. The quick start therefore does not specify everything its own verify/SQLite commands require. README also omits the Node >=24 prerequisite that exists in package.json.

Browser checks can report skipped and return 0 without Chrome unless `--require` is set (`scripts/lib/cdp.mjs:17-22`; `scripts/ui-fuzz.mjs:9-11`). Root `verify` invokes the probe/fuzz without that flag. Verify workflow separately requires the probe, but Pages does not explicitly require its browser checks. On the declared ubuntu-latest image Chrome normally exists, so this is a resilience and reporting gap, not evidence that a current published release skipped checks.

**Implementation:** provide one deterministic bootstrap command or npm workspace install, a Node version/tool prerequisite check, and `doctor` output that distinguishes offline build, source import, browser verification and optional desktop review. Document `npm ci` for reproducible installs. Required release verification should fail if a check cannot run; a separate developer convenience command can permit a visible skip. Run the documented clean-clone path in CI with empty generated outputs and caches.

**Acceptance:** a new clone using only README instructions can build and run the intended verification; a missing root dependency names its remedy; a missing browser cannot produce a successful release-verification claim; supported macOS/Linux/Windows paths or explicit support limits are stated. Node/glob/npm behavior is exercised on the declared supported platforms, not assumed from one shell.

### A10 — P2 — Keep current operations short and move history behind them

**Status:** documentation/onboarding design limitation with concrete inconsistencies. **Goal:** data changes and engineering understanding in reasonable time (C13, C15). **Effort:** M. **Dependency:** A07 clarifies live operations; do not discard audit history.

The docs are thoughtful and unusually candid. The generated dictionary, rule catalogue, goals, known-problem queries and source comments are genuine strengths. The current reading burden is nonetheless large: ARCHITECTURE 667 lines, DATA-MODEL 810, INTERFACE 835, DECISIONS 2,925, OPEN-PROBLEMS 748 and HOW-IT-WORKS 442. These counts are descriptive, not proof of poor docs. A newcomer follows several campaign reports to understand today's import state (`docs/IMPORTING.md:19-30`).

There is an operational conflict to resolve. The walkthrough teaches manually adding a fetched source, grade and measurement one record at a time (`docs/WALKTHROUGH-ADD-A-MATERIAL.md:29-67,79-89,133-146`), whereas AGENTS and IMPORTING require a new document to travel the pipeline and presently limit new imports. It is a historical example, but linked from Quick start as the guide when starting from a sheet, without an upfront warning that this is not the permitted new-document route. The method Snapshot row also contains obsolete `no ranking` prose. Generated-doc checks protect catalogues, not the truth of operational instructions and manually maintained dates/prose.

**Implementation:** publish three short routes: engineer's first selection; maintainer's one decision correction from a registered source; and authorized new-document import. Each names inputs, boundaries, expected outputs, error recovery and exact commands. Mark historical walkthroughs as historical and link the applicable current route at their top. Keep the decision index and audit archive for reasoning. Turn examples into runnable dry-run fixtures against an isolated data root; require route docs to pass that smoke test. Generate scope/release/count statements from current metadata, and distinguish agent checks from people testing.

**Acceptance:** a newcomer can identify the correct route in one page; route examples run in an isolated checkout without relying on personal cached files or campaign-specific knowledge; they do not bypass import restrictions; a maintainer can trace and correct one value without reading several audits; documentation states which parts are current policy versus historical reasoning.

### A11 — P2 — Measure and budget the work that contributes to decisions

**Status:** performance/scaling recommendation; current verify timing comes from the root review. **Goal:** efficient build and fast feedback (C13). **Effort:** M. **Dependency:** baseline timings and scenario fixtures from A03; optimize only measured bottlenecks.

The content cache is a reasonable way to avoid recomputing the estimate stage, and its private deserialization, result hashing, corrupt-entry rejection, lock handling and cold audit are careful. `pipeline.js:27-56` already records compile/estimate/validate stage costs. Scale testing bypasses the cache, doubles the corpus and has explicit budgets (`test/scale.check.js:20-71`). Its own comment correctly says the largest chemical group remains cubic (`:63-65`). The core build without estimates is tested against a separate budget.

However `verify:fast` has a target in GOALS, not a command-level automatic 90-second budget; the scale gate budgets a doubled compiler rather than the complete working loop. Every npm test rebuilds/bundles before running tests (`scripts/ensure-db.mjs:9-11`), even for changes to isolated engine behavior. Distribution includes full Plotly; ARCHITECTURE says roughly 4.3 MB of 6.8 MB is plotting. Those are places to measure, not reasons for a rewrite.

**Implementation:** retain a complete release gate, but add explicit fast feedback routes with freshness guarantees: table/schema/lint; pure engine tests; core decision compile; estimate recalibration; bundle/browser checks. Measure cold, warm and one-row decision-edit paths with a declared machine/runtime baseline and percentile/budget policy. Add realistic growth cases: more PLA products in the largest chemical group, more sources/record text, and more products per material, not just uniform duplication. Only if measurements justify it, cache invariant intermediate work or optimize the model's sparse/dense operations; preserve exact decision semantics with decision diffs. Evaluate a reduced Plotly bundle or runtime-data projection against actual browser startup and interaction measurements while retaining deep evidence on demand in the offline artifact.

**Acceptance:** complete verify:fast meets the agreed <=90-second budget on the named baseline and CI tracks drift; no subset check can be mistaken for the release gate; an engine-only edit does not rerun unrelated source imports or recalibration; core/estimate output identity and scenario outcomes are retained; slow-machine browser tasks and growing dense chemical groups have explicit budgets. Do not buy performance by dropping evidence conditions or validation.

### A12 — P3 — Narrow and test the cache's stated guarantee for long-lived or modified installations

**Status:** isolated metadata probe reproduced; no current wrong product result established. **Goal:** precise architecture guarantees (C13, C15). **Effort:** S. **Dependency:** do this if adopting a watch/daemon process or broadening cache reuse.

`processCode` memoizes its digest after the first computation (`build/src/build-cache.js:126-138`). An isolated copy of this module shows that changing a schema file after the first `cacheKey` call leaves a subsequent key unchanged. The write path recomputes code hashes (`:204-207`), but the read path can hit before that. Many actual runtime constants are loaded at module import, so this metadata result does not by itself prove a semantic stale hit in today's one-shot CLI. The implementation also hashes lockfiles, not bytes of every installed dependency, despite describing an installed dependency tree (`:8-9,34-35,103-116`). Normal `npm ci` mitigates that dependency case.

**Implementation:** state the exact contract: a process uses immutable loaded code/configuration under a controlled installation, or revalidates the necessary file identities before cache hits and shuts down/reloads after a code change. Prefer the simple one-shot/immutable process model unless a watch service is needed. Add a focused changed-config/live-process test and a cache miss/invalidation explanation in diagnostic output. Avoid promising a stale hit is impossible under every local mutation.

**Acceptance:** documented supported cache use has a direct test; changing supported dynamically read inputs cannot reuse an old entry; unsupported modified installations produce a clear bypass; cold/cached bytes remain equivalent. This is lower priority than A01–A11.

## Proposed version 2.1 architecture direction

Use the existing layers, with three small explicit contracts added:

- **Decision evidence contract:** a measurement/recipe has a source digest plus row/column/condition anchor and an identified review. Raw records remain cheap and do not need the full decision contract.
- **Release contract:** a content-based database/rules release ID travels with scenarios, compiled views and exports. A date is display metadata. An exact-release handoff and a current-database question are distinguishable workflows.
- **Operations contract:** one staged transaction with pre-image checks and recovery state is the way scripted edits become CSVs. Acquisition has bounded, journalled progress. Generated inspection views report their input identity.

The estimate stage remains optional; product selection remains pure; the offline HTML remains the distributable. A server database is not justified by the current need. A future team layer should store scenarios, approved products and local tests as separate team-owned evidence with permission and audit rules; it must not overwrite manufacturer statements. Do not implement a large team backend as a prerequisite for fixing these current boundaries.

## Work sequence suitable for a planning agent

### Milestone 0 — Freeze the review baseline and acceptance charter

Retain repository commit/working-tree identity, test logs, cold/warm timings and this review's repro artifacts. Define six to twelve real engineering tasks with expected outcomes and named owners. Agree how PASS and incomplete product data should be worded. Choose supported toolchain/browser targets. Implementation requires owner approval to change the repository; this review itself grants none.

Exit: a compact version 2.1 charter maps each work item to GOALS and the scenario-answer metric. Existing unknowns and defects have owners and evidence status.

### Milestone 1 — Trustworthy decision replay

Implement A01's minimum evidence binding and A02's release identity. Add A03's independent expected fixtures and corruption checks. Re-read sources for every decision-changing fixture. Avoid broad new imports while these contracts settle.

Exit: an independently reviewed source-backed decision can be reproduced on an exact offline release; intentional source association errors fail; changed same-date databases cannot silently masquerade as one snapshot.

### Milestone 2 — Safe, understandable data-point operations

Implement A05 freshness first; then A04 recoverable writes and A06 fetch recovery; write A09 clean-clone setup and A10 short routes as these operations stabilize. Validate a one-value correction and an authorized one-product import from an empty worktree. A08 defines a private evidence restore bundle alongside this work.

Exit: maintainers can add/correct one decision without mixed-state diagnostics or partial writes, and another agent can follow the current documentation with declared inputs and no hidden personal cache assumptions.

### Milestone 3 — Reduce maintenance and build cost from measured bottlenecks

With preserved parity fixtures, do A07's bounded context/modularization and A11's measured fast routes. No behavior changes should accompany extraction/refactoring. Include A12 only if long-lived processes or broader cache assumptions are introduced.

Exit: structure-only changes show 0 decision differences; a data change has a specific scenario diff; working-loop and browser budgets remain within the agreed baseline. The reader's independence/accuracy evidence is reported separately from its parity.

### Milestone 4 — Engineer task evaluation and targeted data closure

Run the planned task sessions with actual engineers. Address funnel-blocking gaps prioritized by scenario answer movement and product viability. The root UI/data reviews should supply the detailed UX and coverage backlog. Record which changes were driven by people, agents, fixtures or suppliers. Re-score GOALS C3/C7/C13/C15 using that evidence.

Exit: the team can reach and communicate a specific product, its meaningful limitations, print recipe/treatment and confirmation test. A longer feature list is not the acceptance condition.

## Reproducible evidence commands used in this contribution

All run against the repository copy, except the explicitly isolated cache probe:

```sh
cat docs/GOALS.md
cat docs/OPEN-PROBLEMS.md
cat README.md docs/README.md docs/IMPORTING.md
cat docs/ARCHITECTURE.md docs/DATA-MODEL.md
nl -ba scripts/lib/pdf-text.mjs
nl -ba scripts/ingest/apply.mjs
nl -ba scripts/data/table-io.mjs
nl -ba scripts/data/sqlite.mjs
nl -ba build/src/pipeline.js
nl -ba build/src/build-cache.js
nl -ba app/js/engine/scenario.js
nl -ba scripts/ui-fuzz.mjs
nl -ba test/selection-products.test.js
nl -ba test/scale.check.js
nl -ba test/reproducible.check.js
node /private/tmp/h2c-v2.1-review-2026-09-27/probes/import-number-guard.mjs /private/tmp/h2c-v2.1-review-2026-09-27/repo-copy
node /private/tmp/h2c-v2.1-review-2026-09-27/probes/cache-key/probe.mjs
```

A01 retained result: `fixtureTextCached:true`, evidence `...52 MPa`, claimed value `5`, `guardFindings:[]`. A12 retained result: both keys available, `keyChanged:false`, `staleKeyPossible:true` for an isolated file-byte mutation. A12 does not claim an end-to-end wrong decision.

No supplier communication, external writes, repository fixes, commit or push were performed. No repository production source values were changed. Other review contributions and full test outcomes should be reconciled before the planning agent finalizes scope.
