# Maintainability round, 2026-10-15

> **Historical record** (2026-10-15): written for one round. It describes the tool and its records as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

**Asked by:** the owner, on 2026-10-15: carry out the eight recommendations of the
[architecture review](../2026-10-14-architecture-maintainability/README.md), keeping the code clean and readable,
everything working and the documents useful; name the risks and their workarounds; Claude Opus as the brain and
Claude Sonnet agents for labour; push at the end.

**The owner's answers before the work began:** packets and the 2026-09-18 import proposals go to the private store
that already holds the source documents (`$H2C_SOURCE_BACKUP`); the two failures of the weekly CI run of 2026-10-11 are
fixed in this round; OPEN-PROBLEMS is reorganised by subject with its section numbers kept as stable IDs.

**What may not change:** no verdict, number or page behaviour. Each commit shows `0 difference(s)` in
`npm run build:diff`, except the two this record names where they happen.

## Baseline

Taken on branch `maintainability-2026-10-15` from `main` at `17808341`, after the review was committed (`f5d8bcaa`).

| | |
|---|---|
| Release | `0cf8d040210f` (data snapshot 2026-09-21) |
| `dist/db.json` | `4896c07df845255379e4fbe26b99b7d43283ca5c1ef4c8a373ae4bca55fb9917` |
| `dist/reference.json` | `4f346e3816e9e3dc22ac2ec0846ea6815b2cfed4f38f483162b3d15e8ccaaf84` |
| Page | `4c73aa14b8f3f4c32333409224ae4909285880df8a88aeede5b19b4c2722210b` |
| Tracked files | 6,323 |
| Tracked bytes | 259.3 MB |

## What was done

Filled in as each part closes.
