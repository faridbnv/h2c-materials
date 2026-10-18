# Selector refinement round, 2026-10-18

> **Historical record** (2026-10-18): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

> **In short.** After the material pages were reimagined (D145), the owner asked for the same method on the selector
> itself, its main page and its material drawer, with **subtle** changes: the tool is good as it is. The aim is a
> calmer, more coherent first impression, and a drawer that reads better (eye flow, reading flow, terms, graphs), while
> everything good is recorded first and kept. A baseline engineer review, four expert agents, one owner gate, a build by
> surface, a fixed done-list and one final review. Priorities: keep what works (a gate), the two landing screens, the
> drawer's reading flow, coherence with the material pages, then the rest of the main page.

## Steps

| Step | What | State |
|---|---|---|
| 0 | Prepare: worktree on `selector-refinement` from main 3de5db23; [shots.mjs](shots.mjs) and the baseline set; [measure.mjs](measure.mjs) and the baseline in [TRACKER.md](TRACKER.md); [drawer-ids.mjs](drawer-ids.mjs) (every record each drawer reaches) | done |
| 1 | Baseline review ([REVIEW-0](review/REVIEW-0.md), 62/100, by a fresh Claude Opus reviewer); the four experts' inventories; [KEEP.md](KEEP.md) at 45 items | done |
| 2 | Four proposals by Claude Opus experts: UI and visual ([ux](ux/PROPOSAL.md)), words ([words](words/PROPOSAL.md)), graphs ([graphs](graphs/PROPOSAL.md)), first impression and coherence ([coherence](coherence/PROPOSAL.md)) | done |
| 3 | The executor's decisions: [PLAN.md](PLAN.md) | done |
| 4 | The owner's gate: before and after pairs on a private page; all four recommendations taken (the step line folded, the page's form for the key figures, the missing-data choice renamed, the six keep items reproduced) | done |
| 5 | Build by surface: the main page (UI expert, branch `selector-main`), the drawer's graphs (graphs expert, `selector-graphs`), the drawer (the executor), merged on `selector-refinement` | done |
| 6 | Done-check: TRACKER after the build | done |
| 7 | Final review ([REVIEW-1](review/REVIEW-1.md), 70/100); its truth findings fixed (5a24452e), the rest in OPEN-PROBLEMS §37.20 | done |
| 8 | Close: INTERFACE, ARCHITECTURE, D146, GOALS-LOG, OPEN-PROBLEMS, the snapshot's views, the campaign status, the working files to the private store, a pull request | done |

## What it achieved, measured

- **No answer moved**: `build:diff` 0 differences against 3de5db23; every record each drawer reached, it still reaches.
- **The drawer and the material page agree**: 389 of 389 key-figure cells (127 differed by the same measure at the start),
  one window per print setting, one block on printing instead of two that disagreed.
- **The drawer's words**: the tally, "n counts", "Also drawn", "comparable basis", "Not used as a filter", the grammar of
  one and a record's codes in what a reader reads fell to 0 or near it (TRACKER M4).
- **Contrast**: no small text under 4.5:1 in either theme (405 elements at the start).
- **The cold page**: the table's bar on the first screen at 1280 and 1180 px (three rows, the target, not reached).
- **The keep register**: 45 of 45 kept or reproduced, none lost.
- **The engineer reviews**: 62, then 70 of 100; of the baseline's ten costliest findings 2 resolved, 7 partly, 1 not
  (the missing-data choice stays in the top bar: moving a control was outside the owner's polish rule).

## What the owner decided (2026-10-17)

- Main page: polish only (no lens, rail group, control, template or column added or removed). The drawer may be
  reorganised.
- The status bar's *Material pages* link and the drawer's *Full page* stay exactly as built.
- A new release ID is allowed once, at the end, for approved wording in release inputs (template text, requirement
  reasons, comparison headings, property names), with no answer moved.
- Four experts plus one reviewer; the keep register compiled by them, edited by the owner at the gate.
