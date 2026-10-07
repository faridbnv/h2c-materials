# Completeness round, 2026-10-07

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

> **In short.** The owner asked for four open problems together (stale facts in the docs, values the held sheets print
> that the tables lacked, products and sheets counted twice, sources without full text), then the tooling debt, then
> the makers' statements nobody had read. Claude Sonnet agents read the pages; Claude Opus judged each reading and wrote
> the migrations m409 onward (D136). This record is completed as the round closes; PROGRESS.md logs each phase.

## Files

- `targets.mjs`, `TARGETS-1.csv`, `TARGETS-2.csv`, `TARGETS-5.csv`: what was frozen before anything was read.
- `baseline/`: the snapshot and the detectors' output before anything changed; `answers.py` compares against it.
- `read/`: item 1's reading (`DOCS.csv`, `PROMPT-c1.md`, the reconcile and proposals runs, `second/` for the blind
  second reads, `curate.py` and `curation.csv`, `applied/`), item 2's reading (`tasks-2.csv`, `verdicts-2.csv`) and the
  optical-reading document lists.
- `decisions/`: the verdict on each same-grade source pair (`same-grade-pairs.csv`), m409's data changelog, and the
  review of the 28 proposed corrections of held values (`values-set-review.md`).
