# Correctness probe of moved answers (gap round 2, phase 8)

You check whether the build's print-gate answers for 22 products, which this round moved, follow from their sources.
Work in /Users/farid/Documents/h2c-materials-branch. Write ONLY `{OUT}` and scratch files under
`/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/8ceac304-b627-4cec-9ff1-5537e29bbfb5/scratchpad/{ID}/`.
No git changes, no npm scripts, never touch data/. Use Python's csv module to write CSV.

Input: `docs/audits/2026-10-05-gap-round-2/blind-draw/probe-moves.csv` (Probe, GradeID, Product, Why, Before, After).
`After` is the build's answer now (build/snapshot/print.csv): Nozzle, Bed, Chamber against the printer (350 °C nozzle,
120 °C bed, 65 °C active chamber; a window starting at or below a limit and extending above is partial, never within),
Enclosure, Abrasive (hardened nozzle), Drying (required, optional, not-needed, unknown), and From, which names where a
value came from when not the product's own sheet: `twin G…` (a product sharing its formulation key, read only where
the product's own sheets are silent; a twin's hardened-nozzle statement is read only where the product holds no
profile of its own) or `guide PG…` (Bambu Lab's filament guide row in data/tables/print_guide.csv, read only where
the product's own sheet and its twin are silent; its "Dry Out Before Use: Optional" reads optional).

For each product: read its live profiles in data/tables/profiles.csv (GradeID; skip Profile starting "Retired"), the
guide or twin row the From column names, and the source of each (sources.csv → SHA256; text `.cache/text/<SHA256>.json`,
page images `.cache/readings/r1/<SourceID>/p-N.png` or render `.cache/sources/by-sha/<SHA256>.pdf` with
`pdftoppm -r 130 -f N -l N -png`). Judge whether each moved cell of `After` is what the sources say under the rules
above: drying `required` when the sheet gives a drying step to do (or says the filament must be dried), `optional`
when it says optional / only if wet / if moisture was absorbed, `not-needed` when it says drying is not necessary,
`unknown` when the sheet is silent or prints only a dash. A recommendation to store dry is not a drying step. Check
the moved cells first, then glance at the rest.

Write `{OUT}` with columns: Probe, GradeID, Cell, After, Verdict (correct | wrong | unclear), SourceSays (quote with
SourceID and page), Reason. One row per moved cell. When done, reply in at most 80 words: counts per verdict and each
wrong one in one line.
