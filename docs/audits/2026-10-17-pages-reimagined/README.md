# Pages reimagined round, 2026-10-17

> **Historical record** (2026-10-17): written for one round. It describes the tool and its data as they were then;
> numbers, rules and file names may have changed since. For where things stand now, read the
> [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** The owner read the first material pages and asked for them to be reimagined, not patched: the text was
> not one account from the first line to the last, the links and the way back were badly designed, the plots dull, the
> index a confusing wiki and the products page buggy. Three expert agents proposed their sides, the executor decided
> where they differed ([plan](PLAN.md)), and the pages were rebuilt as an Overview and a Products page per material,
> an index, one bar with a way back that restores the selection, and five kinds of figure (D145). Three independent
> reviews scored the pages 58, 66 and 72 of 100. What they leave is OPEN-PROBLEMS §37.19.

## Steps

The plan's "Order of work" ([PLAN.md](PLAN.md)); all five are done, on the branch `pages-reimagined`.

| Step | What | State |
|---|---|---|
| 1 | Build: the brief, the three experts' proposals and the plan (95355eff), then the pages in three tracks (the frame and Products page; the words and sections; the figures) (054ec975) | done |
| 2 | Integrate: the seams fixed, the retired modules removed, `pages:check` and the interface probe rewritten for the new structure (11be8317, 3d91ac4d) | done |
| 3 | The 76 summaries rewritten to the new rules (40 to 75 words, no counts, SUMMARY-COUNT), drafted by Claude Sonnet and judged by Claude Opus (55 of 76 changed after drafting), all draft (1f64cfc1) | done |
| 4 | Review by fresh Claude Opus engineers who had seen no earlier version ([REVIEW-BRIEF.md](REVIEW-BRIEF.md)), each followed by a fix pass | done: three reviews, below |
| 5 | Close: INTERFACE, D145, ARCHITECTURE, GOALS-LOG, OPEN-PROBLEMS §37.19, the snapshot and the interface views, the working files to the private store (973ba9a6) | done |

## What the owner said and decided

The owner's critique of the first pages is quoted in the [brief](BRIEF.md), and [the plan](PLAN.md) answers it line by
line. On 2026-10-17 the owner took the plan's three recommendations, "careful that they serve the high level
constraints and goals of the tool":

1. One quiet *Material pages* link in the selector's status bar, carrying the selection like the drawer's *Full page*
   (it amends D142's "only the drawer links to a page").
2. The page rule (three products and twenty measured values) stays as it is.
3. The alternatives each page compares a material with are listed in `build/snapshot/pages.csv` for a read, and are
   never a material beyond the H2C's limits.

Midway the owner asked for the work to go much faster ("much more efficient and faster"). Three review loops had moved
the score 58 to 66 at the cost of hours, so from then on: cut before polishing (PLA's Overview went from 14,250 px to
about 10,900, every value one press away), the executor implements the Overview directly, a fixed definition of done
replaces a full review per round, and one final time-boxed independent review closes it. The plan's "Revised approach"
holds the definition of done.

## The three reviews

Each reviewer read the rendered pages as a mechanical engineer, never the code, and scored ten lines against the
owner's bar, at 1,280 and 390 px, light and dark. The third read the Overviews of PLA, PETG, PCTG-GF and PEI-CF and
PLA's Products page.

| Review | Score | Fixed afterwards |
|---|---:|---|
| [REVIEW.md](review/REVIEW.md), after the build | 58 / 100 | the frame, words and figures, in three tracks (08b142dc, 46e67fcd, 1d2170bf) |
| [REVIEW-2.md](review/REVIEW-2.md) | 66 / 100 | the cut of the Overview's weak last third, the done list, the third pass (77423d9c, fc203347, 15efc14c, d6b0905e) |
| [REVIEW-3.md](review/REVIEW-3.md), the final, time-boxed | 72 / 100 | the truth findings (733b919e); the rest went to OPEN-PROBLEMS §37.19 |

The pages the owner scored before this round, the first version of the material pages, were 65 to 72
([that round](../2026-10-16-material-pages-round/README.md)).

## Where to read

- [BRIEF.md](BRIEF.md): why the round exists and the owner's critique; [PLAN.md](PLAN.md): the decisions where the
  experts differed, the pages, the file ownership, the definition of done.
- The proposals: [UX](ux/PROPOSAL.md), [content](content/PROPOSAL.md) (with the full texts of
  [PLA](content/PLA.md), [PCTG-GF](content/PCTG-GF.md) and the [index](content/HUB.md), and the
  [drafters' brief](content/DRAFTER-BRIEF.md)), [data visualisation](dataviz/PROPOSAL.md).
- The checks: [HOOKS.md](HOOKS.md), the data attributes the markup carries for `pages:check` and the interface probe;
  [checks/NOTES.md](checks/NOTES.md), what failed and whose it was.
- The reviews: [REVIEW-BRIEF.md](REVIEW-BRIEF.md) and the three above. The round's working files and screenshots are
  in the private store ([PACKETS.md](PACKETS.md)).
- What it decided: D145 in [DECISIONS.md](../../DECISIONS.md); the owner's log: [GOALS-LOG](../../GOALS-LOG.md).
