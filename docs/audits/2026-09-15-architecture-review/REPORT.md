# Architecture review: is the pipeline reliable, scalable and robust? (2026-09-15)

**Branch:** `data/csv-source` at `05dcb6f`, the end of the filtering, estimates and data audit.
**Raised by:** the tool's owner.
**Question:** the whole plan was to revise the pipeline and the database to be more accurate, more robust, easier to
debug and easier to add to. The recent commits look like rules and small adjustments, and the current setup seems to
need many specific fixes to maintain. Judge the architecture, the pipeline and the data model, one at a time and
together, and recommend changes from the architectural down to the minor. The users are scientists and engineers who
want accurate data out of the tool.

## Judgment

**The skeleton is right and was kept.** CSV tables under a declared schema, a deterministic build that refuses a bad
database, a JSON contract checked by JSON Schema, one offline HTML file, an engine that never imports the interface,
nothing derivable stored, every headline a pointer to a measurement with its grade and source, reproducible builds with
a release manifest. The property registry, the rule catalogue, the typed columns whose parsers became checks, the
vocabulary-driven normalizers, the guarded table-edit API and the committed review snapshot are the right ideas.
SQLite was not the answer: the pain was never storage, concurrency or query speed.

**The burden had four sources.**

1. **The estimate model absorbed every data discovery as a code branch.** Eight decision revisions in five days
   (D10, D40, D42, D43, D48, D53, D55, D56). Four of them were forced by data classes nobody had declared: Z results
   coded unknown, annealed twins, moulded resin sheets, conditioned nylons. `buildEstimates` was a 289-line loop body
   with a nested closure; `key === 'hdt045'` appeared about ten times outside `kindOf`; the outlier threshold, the
   noise inflation, the calibration clamps and the certification minimum were literals in code; the compiler read the
   model's configuration to find implied bounds and the validator read it to check headlines. Screening rested on a
   binomial test that could only reject a class with 3 or more misses in 20 cases, so a class missing 4 of 21 held
   cases (19 %) still screened, and certification flipped as rows were added.
2. **Records lived in code, and prose did database work.** Thirty-six polymer identities matched to materials by the
   text of their base polymer, nine grades' Shore hardness keyed by GradeID, and two lists of material names sat in a
   JSON file no schema, diff or source register could see. Meanwhile a manufacturer count was parsed out of a
   sentence's first words (and five findings written "1 distinct manufacturer" escaped it), a price quarantine out of
   the first word of a note, and an annealing schedule was three states when its wording had three spellings. The
   measurement row was 37 columns, 45 % of its cells sentinels, six fatigue columns riding on 2,233 rows for 42 tests.
3. **Overlapping checks and one slow tier.** Two finding shapes, a hand-kept list of reviewable codes, the fuzz
   carrying its own copy of the page's number formatter, and a single verify of 2 min 50 s with no faster loop.
4. **Documentation carried state.** Row counts and material counts in prose that were already wrong (three different
   measurement counts in three files); a 989-line decisions file with no index of what still held.

## What was recommended, and done

In order of weight, each proven with `npm run build:diff` (zero differences for a structural change, or exactly the
paths a behavioural change meant to move) and `npm run verify`:

| | Recommendation | Outcome |
|---|---|---|
| R1 | Isolate the inference layer; a freeze rule for physics branches | Done: `build/src/estimate/`, `pipeline.js`, `--no-estimates` core build tested against the contract; literals moved to configuration; D58 |
| R1c | Resolve screening's weaknesses (the owner chose to keep screening) | Done: tolerance-limit ends set one end at a time from honest hold-outs, never against the material's own evidence; D59 |
| R2 | Reference knowledge as tables with provenance | Done: `polymers.csv`, Variant class, hardness as measurements re-read from hash-matched sources, a schema over the model's configuration; D60 |
| R3 | Typed conditions where they change a decision | Done for the annealing schedule, fatigue loading, manufacturer count and price quarantine (m30 to m32) |
| R4 | One findings pipeline (thin) | Done: one finding shape, reviewed codes flagged in the catalogue |
| R5 | Tests that survive data changes | Partly: the fuzz imports the page's formatter and shares Chrome plumbing; incident tests were kept deliberately (below) |
| R6 | Tiered verification | Done: `verify:fast` about 30 s, `verify` about 1 min, 2,000 scenarios nightly |
| R7 | Documentation without counts; a decision index | Done: counts point at the manifest, the report and the snapshot; the index is generated and checked |
| R8 | Scaffolding | Done: `npm run data:new-material`; the source-ID convention is in the schema |
| R9 | Small debts | Done: one median, one retirement wording, dead imports, the workbook conversion archived |

The response lists each commit, what it moved, and what was deferred and why.
