# Goals for the remake (branch `remake/v3`)

> **In short.** This file records the owner's direction for the remake of Filament Atlas. It lives only on `remake/v3`, as the owner ruled on Q2-09 (B): "Keep all remake direction and operating instructions on `remake/v3`; do not add a pointer to `main`." `docs/GOALS.md` still describes the live tool. That tool stays unchanged on `main` until the owner approves a cutover candidate. The plan of record is revision 2 of the remake pack, held outside the repository (its path is in `CLAUDE.local.md`). Recorded 2026-10-20.

## What stays the same

The goal in [`docs/GOALS.md`](../GOALS.md) still holds: a workbench that turns a part's requirements into a defensible shortlist, first of materials and then of products, that the H2C can print. Every number is traceable, every gap is visible, and the team confirms the pick with its own print. The working rules there still apply to this branch, except where this file changes them.

**Science does not change.** In the owner's words (OQ-03): "The physics of data and material science decision should remain the same but the structure can change, we are keeping the old tool alive until we are satisfied with the new tool."

## The owner's direction (2026-10-20)

| Topic | Ruling | Owner's words |
|---|---|---|
| Plan of record (OQ-21) | The GPT handover's architecture is the backbone, corrected by revision 1's evidence | "GPT plan was closer to what I had in mind, Claud plan was mostly conservative keeping what we have as much as possible. I want base of GPT plan and adjusting base on what you found." |
| Data authority (OQ-01) | SQLite is the working database; the CSV tables stay in Git for tracking | "No, I want SQL to lay more role in the pipeline, the CSV could remain for git being able to track but SQLlite features and powers in GPT plan is prefered." |
| Hosting | GitHub Pages is the only fixed constraint. The single offline HTML file retires at cutover | OQ-04: "I want the old site as is until the new product is final and tested, but after that there is no need for a single page load." |
| Working mode (OQ-02, Q2-03) | Work merges into `remake/v3`, never `main`. Tier 0 auto-merges narrow, low-risk changes; Tier 1 needs the owner's `wp:attest` | Q2-03: "Automatic merging is reasonable for narrowly defined low-risk changes after checks. Passing a sample of old/new comparisons alone must not classify every change as safe. Scientific policy changes and production deployment remain outside automatic approval." |
| Freeze (Q2-04 B, Q2-05) | `main` is frozen completely while the remake runs. There is no sync from `main` | Q2-05: "main will be frozen completely". Q2-21: "Freeze product code, data and scientific rules. Allow a small, separately tested maintenance change to pin the production build environment if needed. This exception does not authorize other changes." |
| Preview (Q2-01, Q2-02) | A public repository, `faridbnv/h2c-material-temp-page`, receives built preview files only | Q2-02: "this should be as easy as possible, the only function of this repo is a temp github that will be removed eventually" |
| Language and UI (OQ-20 C, Q2-06 C, Q2-17 B) | TypeScript and Vue, before cutover, with no framework trial | Q2-17: "Generated types, clearer contracts, distinct IDs, shared rules, reason codes and constraint IDs are useful improvements. Implement incrementally with compatibility checks." |
| Defects found while converting (Q2-19) | The mechanical step preserves behaviour. Defects are logged and fixed separately | "Preserve existing behavior in the mechanical conversion step. Log confirmed defects and fix them in separate tested changes. Changes to scientific policy, evidence eligibility, verdicts or ranking require my explicit review. Ordinary presentation or technical defects may be corrected within the agreed scope, with their effects recorded. A known materially incorrect result must be fixed, withheld or clearly disclosed before cutover." |
| Local editor (OQ-14 B, Q2-07 A, Q2-08 B) | The first version covers the correction journey only, working in a sandbox until cutover | Q2-08: "Sandbox only before cutover. No editor, agent or migration changes production data on `main` during the freeze. Demonstration corrections stay clearly separated from the unchanged comparison baseline. Any factual changes intended for the replacement need an explicit reviewed change record." |
| Material pages (Q2-20) | Redesigned pages and shared components are allowed | "Permit redesigned pages and shared components. Keeping typed string functions is also acceptable where it saves effort. Byte-identical HTML should not decide this." |
| Old conventions (OQ-19 note, Q2-10 A) | Old process conventions retire at cutover, where a replacement keeps their protection | Q2-10: "Approve retirement where a replacement demonstrably preserves its useful protection and history. Do not require every item to disappear merely because it is on the list." |
| Cutover (Q2-12 A, Q2-15 A) | The owner approves a named candidate. During the window only, the agent may set the deploy hold and restore the saved old site | Q2-12: "Approve a named candidate. Permit restoration of the exact preserved old site if serious failures occur. Keep new development and data intact." |

The science rulings (OQ-09 to OQ-11) are in [`rulings.csv`](rulings.csv). The architectural decision that supersedes the offline requirement is in [`decisions/2026-10-20-remake-direction.md`](decisions/2026-10-20-remake-direction.md).

## Working rules added on this branch

1. **Parity before change.** A structural change shows no difference in answers, reasons or evidence against the old engine on the same frozen data. A deliberate change (such as ruling OQ-09 d) lands alone, as a listed transition with its exact effect.
2. **Old paths are read-only here.** `data/`, `schema/`, `app/`, `build/`, `scripts/`, `test/` and `archive/` are the frozen comparison baseline. New work goes in `packages/`, `apps/`, `db/`, `tests/`, `parity/`, `remake/` and `docs/next/`.
3. **Approval is the owner's own record.** Agents use the owner's GitHub account (OQ-19 B), so approval is a `npm run wp:attest` record that the owner runs, or the owner's own click on Merge. It is never a chat message.
