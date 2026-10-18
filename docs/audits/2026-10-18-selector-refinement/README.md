# Selector refinement round, 2026-10-18

> **In short.** After the material pages were reimagined (D145), the owner asked for the same method on the selector
> itself, its main page and its material drawer, with **subtle** changes: the tool is good as it is. The aim is a
> calmer, more coherent first impression, and a drawer that reads better (eye flow, reading flow, terms, graphs), while
> everything good is recorded first and kept. A baseline engineer review, four expert agents, one owner gate, a build by
> surface, a fixed done-list and one final review. Priorities: keep what works (a gate), the two landing screens, the
> drawer's reading flow, coherence with the material pages, then the rest of the main page.

## Steps

| Step | What | State |
|---|---|---|
| 0 | Prepare: worktree on `selector-refinement` from main 3de5db23; [shots.mjs](shots.mjs) and the baseline set (`shots/base/`); [measure.mjs](measure.mjs) and the baseline in [TRACKER.md](TRACKER.md); [drawer-ids.mjs](drawer-ids.mjs) (records reached); the drawer's golden digests and the pages' digest (scratchpad) | done |
| 1 | Baseline review ([REVIEW-BRIEF.md](REVIEW-BRIEF.md)); the experts' inventories and keep candidates ([BRIEF.md](BRIEF.md)); [KEEP.md](KEEP.md) compiled | running |
| 2 | Four proposals: UI and visual (`ux/`), words (`words/`), graphs (`graphs/`), first impression and coherence (`coherence/`) | |
| 3 | The executor's decisions: PLAN.md | |
| 4 | The owner's gate: the plan as before/after pairs, the keep register to edit | |
| 5 | Build by surface: the main page (UI expert, own worktree), the drawer (executor) | |
| 6 | Done-check: TRACKER after the build, the done-list | |
| 7 | Final review | |
| 8 | Close: INTERFACE, D146, GOALS-LOG, OPEN-PROBLEMS, snapshots, verify, round:close, a PR | |

## What the owner decided (2026-10-17)

- Main page: polish only (no lens, rail group, control, template or column added or removed). The drawer may be
  reorganised.
- The status bar's *Material pages* link and the drawer's *Full page* stay exactly as built.
- A new release ID is allowed once, at the end, for approved wording in release inputs (template text, requirement
  reasons, comparison headings, property names), with no answer moved.
- Four experts plus one reviewer; the keep register compiled by them, edited by the owner at the gate.
