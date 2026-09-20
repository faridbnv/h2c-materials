# Batch b19: the sheets a shop hosts that name no maker of their own

Applied 2026-09-20 by `m90-batch-b19`: 626 records from 75 documents, and the largest single question in the
programme answered. R074 covered 114 documents; all 114 found a maker, 75 entered, and the rest are held for
reasons of their own.

## What the ruling asked for, and how it was read

> The shop is the manufacturer where the product name carries the shop's own brand; otherwise the maker its
> sheet or its URL names, and what neither names stays held.

Four witnesses, in the order of how directly each is the maker speaking, and never a guess from the shop's
catalogue (`makerOfRecord`, `propose.mjs`):

| Witness | Documents |
|---|---:|
| the ledger's brand, where the shop's own product page names it too | 68 |
| the shop's own brand, as the inventory or the URL recorded it | 35 |
| a manufacturer `manufacturers.csv` knows, named in the URL the shop serves the sheet at | 11 |
| a domain the sheet prints | 0 |

The last witness answered nothing in the end: once the makers the URLs name were in the vocabulary, the URL
reached them first. It stays because it is the one that needs no vocabulary — Bedrock, Ensinger, Jamg He and
Xenia were each found by the domain on their sheet before they had a row, and the next shop's sheets will be
too.

The corroboration is what keeps a content-delivery host out: `3d.nice-cdn.com` had put "nice" in one row's brand
column. It turned out to be a brand after all — 3DJake sells a **nice essentials** range — but the rule reached
that through the product page rather than through the hostname, which is the difference that matters.

Eighteen manufacturers enter `schema/vocab/manufacturers.csv` with the data that cites them, three of them the
shops themselves: 3DJake lists its own range as 3DJAKE, MatterHackers as PRO Series and MH Build Series, and
Filament2Print as F2P. That is the ruling's first clause answered by the inventory rather than by a rule.

## What the reader learned, and what it cost

Two name rules, neither of which can move parity — parity compares a property, a value and a unit, never a name:

- **The announcement is not a name whatever printing mark stands behind it.** "Technical Data Sheet Rev. 1",
  "Technical Data Sheet 04.24", "KINGROON Filament Technical Data Sheet V1.0". Nineteen products across three
  makers were called after the front matter of their own sheet.
- **A label with nothing after it is not a name.** Anycubic prints "Product Name:" and the name on the line
  below it; nine products were called the label. The line below is now read.

Four defects that would each have entered as data, found by reviewing rather than by reading:

| What the page printed | What the row recorded | Where it was fixed |
|---|---|---|
| `1,1128 g/cc`, `1836,740 MPa` | nothing — a NaN reached the applier | a thousands group is exactly three digits, and no more than three in front of the first |
| `DIN EN ISO 62 1)` | ISO 621, which is not a standard | a digit a closing bracket follows is a footnote marker |
| `Print temperature 260°C ± 10` | a window from 10 to 260, on fourteen profiles | a tolerance is centred on its nominal setting; the unit may stand between the two |
| `2023/11/3 REV：V1.1 Http://www.jamghe.com` | a certification claim, because "V1.1" read as UL 94 V-1 | a class has nothing behind its digit |

Only the last three were caught by a check. The first was caught by the schema gate, the second by the schema
gate, the third by PARSE-MISMATCH; the certification one by TEXT-FULLWIDTH, which found it for the wrong reason.

Parity over all thirty-eight makers, measured before and after every one of these: **unchanged on every maker**.

## What the review now asks a person about

Two rules were added to `holdsBack`, and both found real defects in this batch:

- **A value outside every physics window its own matrix and fill select.** Until now the windows were consulted
  only to settle a decimal separator; a number with no separator to be ambiguous about was never weighed at all.
  It caught MatterHackers' PLA sheet printing a tensile modulus of 3.6 MPa and a flexural modulus of 3.8 MPa —
  its own slip for GPa — and its PETG sheet with the flexural modulus and strength labels swapped (60 MPa and
  1170 MPa, which are each other's). Those four numbers enter as printed and marked physically implausible
  (D55), so they back no headline, estimate or bound.
- **A unit the page prints longer than the row records.** "Notched Izod Impact 7.6J/M2", where the longest unit
  the lexicon knows inside that string is J/m — and J/m is a thousand times J/m². Neither reading may be
  assumed, so both rows are rejected rather than guessed.

A window that always flags is told apart from a bound the value failed: an HDT on an elastomer means the
property has no meaning for that material (W0059, D56), not that the number is wrong, and a reviewer sent to
check the number would be checking the wrong thing.

## What was held

| Why | Documents |
|---|---:|
| a material the ruling does not create: PEEK-CF, SAN, a metal-filled PLA | 20 |
| its density is above what its named polymer reaches (R078's question) | 9 |
| the page names no product this reader can use | 4 |
| a twin of a source already recorded, queued under R053 | 7 |

The four unnamed are CreatBot's two sheets headed "Pre-printing drying", Elegoo's headed "S.I.", and Xenia's,
whose every line is printed twice over itself — "180180 °C" for a melting point of 180, "3232" for a melt flow
of 32. Four documents is below the twenty the plan sets for building a reader rule, so the gap is named and they
wait.

## Fifteen findings accepted, and one worth writing down

3DJake's ecoPLA range publishes a tensile modulus near 400 MPa, which is a tenth of what a PLA reaches. On every
sheet of the range the printed yield stress divided by the printed yield strain gives the same number:

| Product | printed E | yield | strain | stress ÷ strain |
|---|---:|---:|---:|---:|
| ecoPLA Wood | 370 MPa | 24.6 MPa | 7.08 % | 348 MPa |
| ecoPLA Silk | 412 MPa | 39.9 MPa | 10.17 % | 393 MPa |
| ecoPLA Silk Rainbow | 400 MPa | 47.6 MPa | 10.92 % | 436 MPa |
| magicPLA | 390 MPa | 45.8 MPa | 10.04 % | 457 MPa |
| mysteryPLA | 379 MPa | 44.8 MPa | 10.14 % | 441 MPa |

The sheet is publishing the secant modulus at yield rather than the initial slope. That is a reading of the
sheet, not a repair of it: the numbers are recorded as printed and the finding is accepted per record.

## One check was changed, and here is why

`test/database.test.js` asserted that PET-GF is not an outlier. It is one again, and not for the reason the test
was written for: its as-printed 81.6 °C now sits 3.6 sigma under a family whose centre moved when this batch
added PET and PETG sheets, and each of its HDT groups still holds exactly one measurement. The defect the 2026-
09-15 audit found — an annealed value averaged with its as-printed twin — has not returned.

Pinning "PET-GF has no outlier" pinned the whole database's centre to one material's value, so every batch that
adds a PET moved it. The test now asserts the rule it meant: an outlier on this key may not come from a group
that averaged two states. The finding itself is accepted per record, with what PET-GF publishes and why the
model has no covariate for it.

## The database after this batch

144 materials, 807 grades, 9,144 measurements, 1,065 sources, 880 profiles; 906 of 1,936 documents applied.
237 documents still wait on an identity, down from 337: the largest single question is gone from the queue.
