# The owner's rulings (2026-10-20)

> **Historical record** (2026-10-20): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

> **In short.** The owner ruled on the decisions OPEN-PROBLEMS held for them (GOALS-LOG, "Decided on 2026-10-20"). This
> round builds each ruling: being built.

## Track T1: rulings 1 to 3, which document and which value speak (D171, D172)

Built by Claude Opus 5.5, with eleven Claude Sonnet readers for the pages and one for the editions.

- **Two documents of one product (ruling 1, D171).** A data sheet speaks before a product page, and a newer edition of a
  sheet before an older one, property by property and for each part of the print recipe; the replaced figure is shown
  small as not used in deciding. The editions a reader ordered from what each document prints are
  [evidence/editions.csv](evidence/editions.csv); m464 writes them as sources.csv's new column Superseded by.
- **What indicates a value is the filament's (rulings 2 and 3, D172).** One classification, applied to every tensile,
  flexural, impact and heat deflection value whose bar its document does not describe: the readers' instructions and
  results are in [evidence/reading/](evidence/reading/INSTRUCTIONS.md), the second pass and the rules it applied in
  [evidence/classify.mjs](evidence/classify.mjs), the outcome per value in `evidence/classification.csv`. m463 types the
  143 indicated values printed; the rest are set apart for good.
- **Migrations.** m462 (a heat deflection above its melting point, flagged), m463 (bars the documents say or imply were
  printed), m464 (newer editions), m465 (a printed bar with no stated orientation read flat), m466 (heat deflection floored
  by printed bars only; CV63 reported), m467 (CV63 deciding, its own [decision diff](evidence/DECISION-DIFF-CV63.md)).
- **What moved.** [evidence/DECISION-SUMMARY.md](evidence/DECISION-SUMMARY.md) and the full
  [decision diff](evidence/DECISION-DIFF.md) against the round's baseline; `npm run audit:gaps` before and after:
  [evidence/gaps-before.md](evidence/gaps-before.md), [evidence/gaps-after.md](evidence/gaps-after.md) (it now writes to
  build/reports/ unless `--out` names a file).
