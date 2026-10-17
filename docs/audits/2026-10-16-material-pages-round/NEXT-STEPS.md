> **Current** (2026-10-17), working notes: the coordinator's plan for what follows step 3 and the parallel data round, written so a restart loses nothing. The round README records what was done.

# What comes after step 3 and the data round (coordinator's notes, 2026-10-17)

## A. Integration order (each step fetches main as it stands at that moment)

1. Step 3 reports. Verify independently: `npm run build`; `node docs/audits/2026-10-16-material-pages-round/drawer-golden.mjs`
   against the golden baseline recorded on the merged tree (TOTAL 11900 25398b25…; kept in the coordinator's scratchpad): the only differences are the 76 page materials' headers gaining the
   Full page link (diff one rendered header; the 99 others byte-identical); `npm run build:diff` 0 differences;
   `npm run verify` (all groups) green; page probe time on CI estimated. Commit step 3 on material-pages.
2. The data round reports (branch data-review-fixes, worktree ../h2c-materials-data). Verify there: verify green,
   snapshot and ui diffs explained, blind read 19/20 then m432, round:close clean. It stays a branch of its own.
3. `git fetch origin`; merge origin/main into material-pages if it moved; then merge data-review-fixes into
   material-pages. Expected conflicts: docs/DECISIONS.md (D142 here, D143 there: keep both in order), GOALS-LOG
   (both appended: date order), OPEN-PROBLEMS, ARCHITECTURE (different sections), README status block and the
   campaign status page (regenerate), build/reports/validation-report.md (rebuild). Migration numbers: the data
   round used m422 to m432; step 4 starts at m433.
4. On the merged tree: rebuild; record a new drawer baseline (data moved: m422–m432); `npm run snapshot`,
   `npm run ui:check -- --write` and read the diffs (pages.csv and the 50-page views move with the data); full verify;
   `npm run pages:check`. Then steps 4 and 5 on that tree.
5. The owner decides the pushes: data-review-fixes alone to main first, or both together after step 5.

## B. Step 4 brief (the written summaries) — Opus implements, Sonnet drafts and tests, Opus judges

Read PLAN.md "The summaries table" and the round README (the owner's rules; what the reviews taught). Implement:
- `schema/tables/material_summaries.schema.json` (MaterialID key → materials; Summary; Written by; Written on (date);
  Review status from `schema/vocab/summary-status.csv` = draft | reviewed by the owner | revise; Notes), the empty
  table, registration (TABLES in load.js, TABLE_ORDER after coverage, TEXT_TABLES, synthesize.mjs clone, data:fmt),
  `db.schema.json` `$defs.material.written`.
- `build/src/written.js` `attachWritten(...)` after attachProducts' headlineBasis loop: the placeholder fill with the
  same field semantics the dev renderer's `--sample-summaries` uses today (read scripts/pages/render.mjs; one
  implementation afterwards: the dev flag reads the compiled field or is removed), refusals as SUMMARY-PLACEHOLDER
  (rules.js, error); lint SUMMARY-NUMBER in lintData (a number outside a placeholder; standards like ISO 527, UL 94,
  ASTM D638 and names like PA6, H2C exempt). `npm run docs:rules`, `docs:dictionary`.
- The In short section reads `m.written` (it already renders the shape); the byline quiet, as now.
- `scripts/pages/fields.mjs <id>` (fillable fields with values), `scripts/pages/page-text.mjs <id>` (the page's text),
  `scripts/pages/add-summaries.mjs <file.csv>` (appends through table-io, refuses a material without a page or a row
  that fails the lint) — or a migration m433 that applies a reviewed CSV, if that is the repo's better record.
- AGENTS.md recipe "Write or revise a material's summary".
Sonnet: `test/summaries.test.js` (every field kind, every refusal, the lint's regex cases). Then 8 Sonnet drafters
× ~10 materials, inputs the page text and the fields only. Checklist (from the reviews): 60–100 words; characterise,
do not recite (at most two numbers, as placeholders); what it is, what makers sell it for, how it prints and behaves
in service, what is thinly published; never narrate the page's sections; no comparison with other materials (the
first screen does that from the data); no superlative or verdict word; family guidance as the family's; D124 terms;
the repository's spelling; Written by "Claude Sonnet (agent)"; status draft; Notes list the sections each claim rests
on. Opus judges 40 (10 largest, 20 middle, 10 smallest) on their pages → summaries/JUDGED.csv; more than 4 false
claims → a second pass with the fault class added. Release ID changes with the table (each later owner review too:
review in batches).

## C. Step 5 brief (blind read and close) — Sonnet reads, Opus fixes and closes

- 4 Sonnet readers × 10 pages (seeded draw across the 76; each gets a page, its records page and the drawer's text
  for the material, never the code): masthead counts vs the drawer; first-screen numbers and comparison lines vs the
  At a glance table; each figure's caption vs its marks (counts add up); each empty or thin section gives its reason;
  the summary's claims trace to sections; no coinage, no record ID in prose; every internal link and three external
  ones opened; the page on a phone width; five random records traced to their documents → blind-read/VERDICTS.csv.
- 1 Sonnet proofreader for the living documents this round touched (ARCHITECTURE, INTERFACE, OPERATING, AGENTS
  recipe, D142, README status) against the code and the built pages.
- Opus: fix each fault class at its cause with a guard; D142 final; GOALS-LOG entry for what was built; the round
  README's closing table; OPEN-PROBLEMS: this round's three data findings went to the data round, add what is left
  (the estimates' disagreement, the cold verify:fast run, anything the blind read leaves); `npm run docs:decisions`,
  `docs:status`, `docs:open-problems`, `docs:links --check`; `npm run round:close -- --archive`;
  `npm run packets -- --export 2026-10-16-material-pages-round --remove`; `npm run round:close`.
- Then fetch main once more, merge if it moved, full verify, and ask the owner to push.
