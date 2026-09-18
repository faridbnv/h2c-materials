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

## Open: about 90 measurements whose Standard / load carries a neighbouring column

m49 typed the standards each measurement names. 2,307 of 2,645 rows name one. Of the 338 that do not, most say so
truthfully: 76 are Not published, 42 are a fatigue study's own staircase method, and about 80 are a melt-flow or
water-absorption condition the sheet prints where a standard would go ("210 °C, 2.16 kg", "25 °C, 55% RH").

About 90 carry a fragment of the neighbouring column instead, from the original extraction:

    Modulus · Strength · Elongation · Deflection · Temperature · Transition Temperature · (X-Y)
    ter Absorption Rate 25 °C, 55% RH · te 25 °C, 55% RH · ate 25 °C, 55% RH · ption 25 °C, 55% RH
    DSC, · ISO · ISO 179, · ASTM · N/A · Prusa Polymers

Most are Bambu Lab sheets, whose properties table is `Subjects | Testing Methods | Data`: the transcription took the
tail of the Subject and the head of the Testing Method. The cached PDF shows what each row should say — for
"Saturated Water Absorption Rate" the method cell is "25 °C, 55% RH", for "Glass Transition Temperature" it is
"DSC, 10 °C/min".

The fix is to re-read each source and correct the raw text, per D35, matching each measurement to its sheet row by
the Data cell. It is not done here: guessing a standard onto a measurement is the one thing this database must not
do, and the typed column reads them as naming no standard, which is true of the text as it stands. The sources are
cached under `.cache/sources/` and hash-matched, so the re-read needs no new retrieval.

