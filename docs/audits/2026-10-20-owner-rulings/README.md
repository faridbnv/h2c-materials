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
  indicated values printed (144 with the three m473 typed); the rest are set apart for good, Spectrum PET-G HT100's
  Tritan resin figures among them.
- **Migrations.** m462 (a heat deflection above its melting point, flagged), m463 (bars the documents say or imply were
  printed), m464 (newer editions), m465 (a printed bar with no stated orientation read flat), m466 (heat deflection floored
  by printed bars only; CV63 reported), m467 (CV63 deciding, its own [decision diff](evidence/DECISION-DIFF-CV63.md)).
- **What moved.** [evidence/DECISION-SUMMARY.md](evidence/DECISION-SUMMARY.md): T1's own share, measured on tracks T2 to T5
  merged ([in full](evidence/DECISION-DIFF-T1-on-merged.md)), and the [decision diff](evidence/DECISION-DIFF.md) of the
  whole round against its baseline; `npm run audit:gaps` before and after:
  [evidence/gaps-before.md](evidence/gaps-before.md), [evidence/gaps-after.md](evidence/gaps-after.md) (it now writes to
  build/reports/ unless `--out` names a file).
- **Merged with tracks T2 to T5** (the round branch at cd1977a8): m462 to m464 ran again on the merged
  tables (m465 to m467 merged without conflict). m473 had typed Raise3D Industrial PET GF's three description and heat values printed and annealed; m463 keeps
  that typing (the classification records it as stated) for the two heat values. The description's modulus, "over 4.1 GPa"
  (V013950), is set apart by m480, the executor's call, as Industrial PET CF's "over 6 GPa" is (V007190): one reading for
  both, and the table's own annealed modulus (V006923) still speaks for the product.
