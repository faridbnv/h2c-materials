# Model freeze, 2026-09-17

The structural pass that cleaned the periphery of the model before more materials were added: constants and
summaries out of `materials.csv`, the wide tables split, datasheet sentences out of the vocabularies, source
metadata typed, two lint suppressions turned into states, and the coverage rows the build can prove derived.
Decisions D67 to D74; migrations m42 to m48.

## coverage-evidence-recorded.csv

The 541 templated "Evidence recorded" rows m48 moved out of `data/tables/coverage.csv`, exactly as they stood, with
their CoverageIDs. Each said in one of eight repeated sentences that a material had records of a kind, which the
build can see for itself, so the build now reports those pairs from the material's own records and names what proves
them. `data/review/removed-records.csv` lists every one of these rows and points here.

Nothing here is data. It is the audit trail those rows became, kept so the wording and the IDs can still be looked
up. The rows that stayed in `coverage.csv` are the gaps, conflicts, quarantines, limited-comparability notes and the
38 "Evidence recorded" findings that say something particular about their material.
