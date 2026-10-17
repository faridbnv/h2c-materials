> **Historical record** (2026-10-17): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../OPEN-PROBLEMS.md).

You are proofreading the living documents of the Filament Atlas repository (/Users/farid/Documents/h2c-materials-branch, branch material-pages-summaries) for what the material pages round changed. The round built a static page per well-documented material (D142): a build stage that renders them (app/pages/), a shared facts layer with the drawer (app/js/ui/material-facts.js, material-words.js, material-stats.js, page-rule.js), records pages, an index, the drawer's Full page link, the release zip, the page checks (test/pages.check.js, `npm run pages:check`) and the interface probe's page views, the written summaries (data/tables/material_summaries.csv, build/src/written.js, SUMMARY-PLACEHOLDER and SUMMARY-NUMBER, the tools `npm run pages:fields`, `pages:text`, `pages:add-summaries`), and on 2026-10-17 a wording pass (labels.js PRINT_NOT_DRAWN "say nothing", namedFiller, findings.js acceptSubject, common.js shownGap).

Read these, and check every claim they make about the material pages, the summaries and their checks against the code and the built pages. The built pages of this tree are frozen at `/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/9fce9350-145b-4738-8aa8-79b23e9dc465/scratchpad/blind/site/materials/` (read them there, as text with `node /private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/9fce9350-145b-4738-8aa8-79b23e9dc465/scratchpad/blind/text.mjs <file.html>`); dist/ may be rebuilt under you by another agent, so do not rely on it, and do not run `npm run build`, `pages:check`, `verify` or any command that writes. Reading code, the schema, the tables and `git log`/`git show` is fine:

1. docs/ARCHITECTURE.md (the parts on the pages, stage 8, the facts layer, the written summaries, the build cache's page entry, the release zip)
2. docs/INTERFACE.md (the material pages, the drawer's Full page link, the Words table where the pages are named)
3. docs/OPERATING.md (anything on the pages, the summaries, verify's page steps)
4. AGENTS.md: the recipe "Write or revise a material's summary" and any other line about the pages or pages:check
5. docs/DATA-MODEL.md (material_summaries, materials[].written, the pages)
6. docs/DECISIONS.md: D142 in full (and its index row), and D144 where it names the pages' checks
7. README.md: the status block and any line on the material pages
8. docs/DATA-DICTIONARY.md and docs/RULES.md: the material_summaries table and SUMMARY-* rules (these are generated; say only whether they agree with the schema and rules.js)

For each claim that is wrong, stale, or says something the code or the pages do not do (a wrong file name, a count that is not the current one, a check described that does not exist, a step order that differs, a word the pages no longer use such as "state none" or "filler not disclosed" for a named filler, a tool option that does not exist), write one row. Also note a claim that is true but would mislead a maintainer. Do not report style preferences.

Write `/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/9fce9350-145b-4738-8aa8-79b23e9dc465/scratchpad/blind/PROOF.csv`, header `Document,Line,Claim,Finding,Evidence,Fix`: the document and line number, the claim quoted, what is wrong, the evidence (file:line of the code, or the page and what it shows, or the command and its output), and the corrected wording. Quote every field.

Do not edit any file in the repository and do not commit. Report back the count of findings per document and the five that matter most.
