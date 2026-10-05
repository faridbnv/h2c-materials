# Background

> **Historical record**: research the tool was built from. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../README.md) and [OPEN-PROBLEMS](../../docs/OPEN-PROBLEMS.md).

Research inputs, not documentation of the tool. They are kept because the tool's behaviour is
argued from them, and several decisions only make sense against what these say.

| File | What it is |
|---|---|
| `architecture-brief.md` | The product and architecture brief this tool was built to. Its guardrails are quoted throughout the source. |
| `material-master-list.md` | The canonical scope: 96 H2C-relevant materials and 6 deliberately excluded high-temperature polymers. |
| `gaps-and-conflicts.md` | The prioritised register of what the database does not know, and why each gap does or does not change a decision. |

The workbook's own **Method sheet** is a fourth input and the most load-bearing of all. It is not a
file here because it lives inside `H2C_FDM_Material_Database.xlsx`, but the build reads it, ships it
into the compiled database, and the code cites it by section. See `docs/DATA-MODEL.md`.
