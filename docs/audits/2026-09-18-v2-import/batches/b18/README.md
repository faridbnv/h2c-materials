# Batch b18: Wave D's first half, and a condition the sheet prints on the line below

Applied 2026-09-20 by `m87-batch-b18`: 733 records from 54 documents. The database goes from 720 grades, 8,162
measurement rows and 936 sources to 740, 8,735 and 990.

3DJake's own catalogue, fetched and read for the first time — 319 documents fetched, 215 of them new, 176
readable and the rest duplicates of sheets already registered or scans that wait for a reader. With them, every
document the ledger had no reason to hold.

## What was held

| Held | Documents | Why |
|---|---:|---|
| The shop's own name on the grade | 111 | whether 3DJake is the brand or only the shop is the owner's to say (Wave D) |
| The same numbers under another name | 24 | queued rather than registered twice (R053) |
| Identity unsettled | 45 | a family word, a graphene load no vocabulary holds, a wood filler with no polymer |

The ledger now records **which source** a twin repeats, so the queue answers that without anybody re-deriving it.

## Seventeen findings, one reason

This maker measures its Vicat point at 5 kg — "ASTM D1525 5kg, 50 °C/h", "ISO 306 5kg" — which is the heavy
load, and a needle under 50 N goes into a bar as soon as the polymer softens. A Vicat at or just below the glass
transition is what that load gives; MEAS-PHYSICS-ORDER is drawn from sheets that state the light one. Seventeen
rows across the library, accepted with that written once.

Seventeen more are accepted per record: notched impact strengths that read as unnotched ones, two hardnesses
whose scale the sheet prints as "HA/HD" and so does not state at all, a PP drawing 900 %, a TPU deflecting at
52 °C, and bounds on filled compounds (`> 35 %`). One row is rejected — the low end of a foaming filament's
density range, for the fourth batch running.

## And what the build caught

**A condition may stand on a line of its own under the row it belongs to.** Polymaker's HT-PLA GF sheet prints

```
Vicat softening temp. ISO 306, GB/T 1633 148.9°C
(as printed)
...
Vicat softening temp. ISO 306, GB/T 1633 148.3°C (annealed)
```

— the annealed row saying so on its own line and the as-printed one on the next. Read without the line below,
the 148.9 entered with no state, and the estimate model averaged it with the 148.9 the same product's revision
1.1 publishes as printed into one observation of two states. `test/database.test.js` has guarded exactly that
since September's audit, and it failed.

The reader now takes a line that is nothing but a bracketed phrase as belonging to the row above it, which is the
only thing such a line can belong to. Re-read against every registered document, that rule changes the state of
**exactly one** recorded row, and m89 is it.

**A bed temperature whose dash did not survive the page.** SUNLU's ABS-GF sheet says "Bed temperature 90 - 100 °C"
and the dash is not in the text layer, so the repair that rejoins digits a page has split made it 90100.
PARSE-UNREAD found it; the sheet states the same setting again in its table with its dash, and m88 corrects the
cell to that. The reader is not changed: two numbers with a space between them are a split number as often as a
range whose dash was lost, and one row does not show which rule tells them apart.
