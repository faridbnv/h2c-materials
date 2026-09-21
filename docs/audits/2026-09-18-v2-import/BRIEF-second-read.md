# Brief: the second read of batches b03 to b26 (R085)

For a reader who did not decide these rows. **Read-only: nothing is changed, and nothing is fixed.**

## Why

b01 and b02 were read a second time and it found a source collision — nine rows citing a sheet that does not
print them — which `m55` repairs. b03 onward were not, which is some three thousand accepted rows. R085: a
separate agent re-reads a seeded sample of each batch against the page its Locator names, *because a reader who
already decided a row cannot see it fresh.*

## The samples

`npm run ingest:second-read -- --all` has drawn them: **564 rows across 19 batches**, in
`docs/audits/2026-09-18-v2-import/batches/<batch>/second-read-sample.csv`. Each is max(30, 5 %) of that batch's
applied rows, drawn with mulberry32 from seed 20260921, grouped by property and taken round-robin across the
groups so no single property eats the sample. Every row carries what it needs:

| Column | What it is |
|---|---|
| `Verdict`, `Note`, `By` | **empty, for you to fill** |
| `MeasurementID` | the row in `data/tables/measurements.csv` |
| `Manufacturer`, `Product`, `Property`, `Direction` | what the row says it is |
| `Raw value`, `Normalized value`, `Standard / load` | what the row holds |
| `Locator` | where on the document the row says it read it |
| `SourceID`, `URL` | the source the row cites |
| `Document` | the cached document, by its digest: read this, not the URL |
| `Page images` | rendered pages, where the document was read optically |

## What to do with each row

Read the document at `Document` (`npm run sql`, `scripts/lib/pdf-text.mjs`'s `cachedText`, or the page images),
find the line the `Locator` names, and answer:

- **`agree`** — the document prints that value, that unit, that direction and that standard, on that page.
- **anything else** — a disagreement. Put what the document actually prints in `Note`, quoting the line.

Put your name in `By`. Write the file back as CSV with the same columns.

The four things to check, in the order they go wrong:

1. **Does the cited document print this value at all?** The b01/b02 read found nine rows whose values were on a
   *different revision* of the same sheet. Check the digest, not the file name.
2. **Is the number right?** Including its decimal separator and its unit.
3. **Is the condition right?** A value the sheet prints for a dry specimen, an annealed one, a direction or a
   test load, recorded without that condition, is a disagreement: it says something the sheet does not.
4. **Is the standard right?** `Standard / load` holds the sheet's own words and `Standards` the standards they
   name. A standard the sheet does not print is a disagreement.

## What happens next, and why one row matters

`npm run ingest:second-read -- --batch <b> --tally` reads your verdicts back, counts the rate, and **reopens
every document with a disagreement** — its ledger row goes back to `held: second-read` with your note on it.
One disagreement reopens the document, as R085 says: a reader who finds one wrong row has not established that
the rest of that document is right.

So: a disagreement is not a small thing to record, and a doubt is a disagreement. If you cannot find the line
the Locator names, say so — that is what finding 1 of the b01/b02 read looked like.

## When you are done

Report per batch: rows read, rows that disagree, and the *kinds* of disagreement with the MeasurementIDs of
each. Do not run `--tally` yourself and do not edit `data/tables/`; the tally and whatever follows from it belong
to whoever is running the import.
