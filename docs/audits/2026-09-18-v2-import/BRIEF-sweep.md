# Brief: the sweep, 200 values read once against their sheets (PLAN-REMAINING 2.3)

For a reader who did not record these values. **Read-only: write verdicts into the worklist and nothing else.**

## Why

`sweep/sweep-200.csv` lists the 200 recorded values that sit furthest from their material's other values measured
the same way (same property, unit, direction, conditioning, annealing and specimen form): a robust z-score, the
distance from the group's median in median absolute deviations. A value far out is either a transcription error, a
value the sheet really prints that physics rules out, a product the database files under the wrong material or
should mark as a variant, or simply a real product that differs. Only a reading of the sheet tells which.

## For each row

The sheet is the cached document whose digest is the row's `SHA256`: its text is in `.cache/text/<SHA256>.json`
(pages → lines → text; `node --input-type=module -e 'import { cachedText } from "./scripts/lib/pdf-text.mjs"; ...'`
reads it), and its bytes in `.cache/sources/by-sha/<SHA256>.pdf` or `.html`; page images, where the sheet was
scanned, in `.cache/pages/<SHA256>/p-N.png` (the Read tool shows them). The row's `locator` names the page and the
label. Find the line and read the value, its unit, and every condition the sheet states for it.

Write one of these words in `Verdict`, and in `Note` what the sheet prints (quote the line, under 200 characters):

| Verdict | When |
|---|---|
| `wrong-value` | the sheet prints a different number, or the row joined, split or misplaced one; say what it prints |
| `wrong-unit` | the number is right but the unit is not the sheet's (MPa for GPa, J/m for kJ/m²) |
| `wrong-property` | the value is another property's (a yield strength recorded as the ultimate, flexural as tensile, Tm as Tg) |
| `wrong-condition` | a condition the sheet states for the value is missing or wrong (annealed, conditioned, a direction, a notch, a moulded bar) |
| `implausible` | the sheet prints exactly this and physics rules it out (say why in one sentence) |
| `variant` | the sheet declares a load, a foam or a soft grade that explains the value, and the grade does not say so |
| `real` | the sheet prints exactly this, with these conditions, and it is a credible value for this product (say why) |
| `unreadable` | the line cannot be found or read |

Do not guess and do not use what you know about a product from memory: a verdict rests on the line you read.
Work through all 200 in order.

## When you are done

Report the count per verdict, and for every row that is not `real`, one line: measurementid, verdict, and what the
sheet prints. Do not edit anything except the `Verdict` and `Note` columns of `sweep/sweep-200.csv`.
