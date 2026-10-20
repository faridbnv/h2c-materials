# The owner's rulings (2026-10-20)

> **Historical record** (2026-10-20): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

> **In short.** The owner ruled on the decisions OPEN-PROBLEMS held for them (GOALS-LOG, "Decided on 2026-10-20"), and
> asked for each ruling to be built and merged to main, with every document current at the end. Five tracks built them
> in parallel, each by a Claude Opus agent in its own worktree with Claude Sonnet agents for reading and checking; the
> executor merged them, two independent reviews (one of T2 to T5, one of T1) found what to fix, and six Sonnet readers
> re-derived about 1,000 claims of the living documents, which two Opus agents corrected. Decisions D171 to D176,
> migrations m462 to m486 (m469 unused), import batches b49 and b49-2.

## The rulings and what was built

| Ruling (GOALS-LOG item) | Built | Decision, migrations | Track |
|---|---|---|---|
| 1. Two documents of one product that disagree | A data sheet speaks before a product page, a newer edition before an older one, figure by figure; the other shown small as not used in deciding | D171; m464, m482, m484 | T1 |
| 2, 3. A test bar no document describes | Kept and deciding where anything indicates, even implicitly, it is the printed filament's; otherwise set apart for good, with a small note | D172; m462, m463, m465 to m467, m481, m483, m485, m486; m480 (the executor's call on a prose figure) | T1 |
| 4. The material summaries | Stay drafts, and an open problem (§37.19) | — | — |
| 5. The selector's first screen | No Result column before a requirement; the sintering filaments retired from the dataset (Scope Retired); the drawer's first screen redesigned; one shape change on the Ashby ranges view | D173 (drawer), D174; m468 | T2, T3 |
| 6, 9 to 11. Fibre-filled PET, the held sheets' homes, the plasticised PVC, the heat-resistant PETG (a materials scientist decides) | PET fills stay glassy as printed (two crystallised bars flagged); Electrifi as PCL-EC (M176), Diran 410MF07 as Nylon-CE (M177), Onyx ESD under PA-ESD, SBC estimated (a polymers.csv row, back-tested); PVC-P a material of its own (M178) with its own stiffness limit CL03; Spectrum PET-G HT100 filed under CPE | D176; m473 to m479; b49, b49-2 | T5 |
| 7. A variant for looks | "cosmetic dense filler" reads its type's printer guide in full (11 products) | D175; m470 | T4 |
| 8. Found only in 2.85 mm | Kept, with a warning; grades gain a typed Diameter (12 BigRep products) | D175; m471 | T4 |
| 14. A drying range | Shown as the range; profiles gain the lower ends | D175; m472 | T4 |

Items 12, 13 and 15 to 19 of the list the owner was given were not ruled on; they stay in OPEN-PROBLEMS as they were.
Each track's record is its folder: [drawer/](drawer/README.md), [selector/](selector/SHAPES.md), [small-rules/](small-rules/README.md),
[science/](science/DECISIONS-MEMO.md), [evidence/](evidence/DECISION-SUMMARY.md).

## What moved

[The decision diff](after/DECISION-DIFF.md) of the whole round against its [baseline](baseline/census-before.json), over
the 138 census cases. The templates under Leave out (pass, unknown, fail, before → after): Outdoor structural part 11, 89,
52 → 10, 92, 50; Indoor prototype 98, 30, 24 → 98, 33, 21; Lightweight structure 19, 73, 60 → 19, 72, 61; Warm environment
43, 83, 26 → 31, 98, 23; High-stiffness fixture 10, 93, 49 → 10, 95, 47; Flexible component 5, 104, 43 → 5, 106, 41.
The largest move is Warm environment's: twelve materials passed only on a heat deflection whose bar no document
describes as printed, and now read unknown (D172). The three sintering filaments left every case (D174) and three
materials entered (D176). Products with a comparable heat deflection at 0.45 MPa went from 523 to 312; materials with a
measured tensile strength from 106 to 115, as printed bars that state no orientation are read flat.

## Track T1 in detail: rulings 1 to 3, which document and which value speak (D171, D172)

Built by Claude Opus 5.5, with eleven Claude Sonnet readers for the pages and one for the editions, and twenty more for the
second reading the independent review of T1 asked for (`review/REVIEW-T1.md`, findings F1 to F9).

- **Two documents of one product (ruling 1, D171).** A data sheet speaks before a product page, and a newer edition of a
  sheet before an older one, property by property and for each part of the print recipe; the replaced figure is shown
  small as not used in deciding. The editions a reader ordered from what each document prints are
  [evidence/editions.csv](PACKETS.md); m464 writes them as sources.csv's new column Superseded by. After the review,
  a figure a better document sets apart (D172) sets apart the same figure on a lower one (F3), and a document that prints a
  property at several print settings replaces nothing (F8).
- **What indicates a value is the filament's (rulings 2 and 3, D172).** One classification, applied to every tensile,
  flexural, impact and heat deflection value whose bar its document does not describe: the readers' instructions and
  results are in [evidence/reading/](evidence/reading/INSTRUCTIONS.md), the second pass and the rules it applied in
  [evidence/classify.mjs](evidence/classify.mjs), the outcome per value in `evidence/classification.csv`. The first
  reading leaned stricter than the owner's even (its readers chose nothing when in doubt and stopped at a melt flow
  rate); the second ([evidence/reading/round-2/](evidence/reading/round-2/INSTRUCTIONS.md)) read again every value the
  first left set apart and every page it never read. 374 values of 165 products are printed bars their documents say or
  imply (m463 the first reading's, m483 the second's); 2,788 are set apart for good, Spectrum PET-G HT100's Tritan resin
  figures among them. Every judgement call, with the decision taken, is in [evidence/DOUBTFUL.md](evidence/DOUBTFUL.md)
  for the owner.
- **Migrations.** m462 (a heat deflection above its melting point, flagged), m463 (bars the documents say or imply were
  printed), m464 (newer editions), m465 (a printed bar with no stated orientation read flat), m466 (heat deflection floored
  by printed bars only; CV63 reported), m467 (CV63 deciding, its own [decision diff](evidence/DECISION-DIFF-CV63.md)).
  After the review: m481 (Spectrum PLA Carbon's 12.5 GPa flagged physically implausible, F2), m482 (two Revision cells
  that held a web address, F9), m483 (the second reading's printed bars, F1), m484 (Prusament PLA High Speed's data sheet
  heat deflection at 0.45 MPa, never transcribed, F3), m485 (tensile strength floored by printed bars only, F6), m486
  (two Spectrum rows typed from a neighbour's label set back: Spectrum labels its rows one by one, F2). The back-tests of
  the changes to what the estimate stage reads are in [evidence/BACKTEST.md](evidence/BACKTEST.md) (F6).
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

## Reviews and the documents pass

- **The review of T2 to T5** ([review/REVIEW-T2-T5.md](review/REVIEW-T2-T5.md)) found one wrong answer, fixed: purefil
  PVC-P passed the indoor prototype on its kind's chamber reading though its sheet asks for an enclosed printer (m478).
  Its other findings were fixed (CL03 cites a flexible-PVC reference, b49-2; the back-tests of the cosmetic variant and
  SBC; the decisions' back-references; the census naming a material that left the dataset) or recorded.
- **The review of T1** ([review/REVIEW-T1.md](review/REVIEW-T1.md)) found the first reading stricter than the owner's
  "even" and two wrong answers (PLA-CF's pass on an implausible 12.5 GPa; a set-apart figure deciding through its copy);
  T1 read again and fixed each (m481 to m486).
- **The documents pass.** Six Claude Sonnet readers re-derived about 1,000 claims of README, AGENTS, GOALS, GOALS-LOG,
  OPERATING, IMPORTING, OPEN-PROBLEMS, INTERFACE, DATA-MODEL, ARCHITECTURE, HOW-IT-WORKS and D168 to D176 against the data
  and the code; two Claude Opus agents checked and fixed about 150 findings, among them five interface strings that still
  said an undescribed bar's heat deflection is accepted as a printed bar's.

## Left, for the owner

- The second reading's judgement calls, 1,041 values each with the decision taken ([evidence/DOUBTFUL.md](evidence/DOUBTFUL.md)),
  and the executor's reading of "set apart for good": never used to pass, still able to show a print cannot reach a value
  (CV05; D172).
- Whether the elastomers' chamber row (CN05) should name its kinds by base polymer rather than family (§38.9).
- The rest stays in OPEN-PROBLEMS under its subject, each with a dated paragraph from this round.

## Checks
