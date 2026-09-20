# Batch b10: Fillamentum

Sixteen of the maker's twenty-four documents. Applied 2026-09-19 by `m76-batch-b10`: 179 records, of which 131
measurements, 16 grades, 16 sources and 12 print profiles. The database goes from 494 grades, 6,009 measurement
rows and 665 sources to 509, 6,140 and 681; no material was created.

## What the reader had to learn

Fillamentum's layout defeated the reader four ways, and each of them was a rule rather than a special case.
Parity on its three hand-transcribed sheets went from 11 of 23 to 22 of 23 — past the gate — and no maker
already proved moved: Spectrum 656 of 656, 3DXTECH 472 of 473, Polymaker 770 of 810, eSUN 21 of 23.

- **The page beside the table.** A column of description runs down the left of every sheet, and the extractor
  groups spans by baseline, so "Hardness 42 Shore D ASTM D2240" arrives inside "example for parts of ski
  boots.". The gutter between the two blocks is the page's own answer: a band few of its lines cross while
  enough have text on both sides of it. The line is cut at every gutter at once and each piece judged alone,
  because judging one side of one gutter read "example for parts of ski boots. Hardness" as the sentence it
  mostly is and took the row's own label away with the prose.
- **A label the table merges across two rows.** "Tensile strength" is one cell centred on the row measured at
  50% elongation and the row measured at break; "Tear resistance" on the notched and the unnotched value. It is
  the mirror of the merged method-and-unit cell the reader already shares.
- **The endpoint in the condition column.** The same property twice, and the only thing between the two rows
  printed on the far side of the value: "Tensile strength | 52,4 MPa | ISO 527 | at yield, 50 mm/min".
- **A page that prints no product name.** Three sheets name nothing at their head — the column headings of the
  property table come first — and read down the page the products were called "Test Condition", then "1.20
  g/cm ISO 1183", then "Fluorodur is made of a very durable". A name states no measurement, names no property,
  cites no standard and is not a sentence; with those four the reader says the sheet names none, which is true,
  and the name comes from the ledger the document arrived in.

## What the sheets answered for themselves

Fillamentum's newer sheets carry a Chemical properties table whose first row is "Polymer base", and it answers
what the product name leaves open. "Nylon AF80 Aramid" says only that it is a nylon — a family, which owns no
product (D44) — and its own table says "polyamide 12"; "Fishy Filaments' 0rCA" says "Polyamide 6 + carbon
fibres", which names the filler in the same sentence. Both are read from the sheet, and the lexicon now knows a
polymer spelled out as well as abbreviated.

Two ways of being fooled by a sheet's own printing table were closed to get there, and an identity sweep over
all 452 applied documents is what found them: "Bed adhesive Magigoo PA, PVA glue" is the glue, and read word by
word the aramid nylon named two polymers and became a blend; "Build surface treatment PC and Texture PEI" is
the build plate, and Polymaker's PolySmooth — a PVB — was confidently a polycarbonate. The sweep reads 422 of
452 the way the database does, where it read 420 before.

## What was reviewed rather than accepted

Seven rows the pipeline held back, read against their page and accepted with the reason recorded:

- **Six PVC rows.** The Vinyl 303 sheet has no composition row; its description says "This filament is made of
  PVC" in its own words.
- **One impact row.** Fishy Filaments' Porthcurno heads a row "Charpy impact strength" and names ISO 180 beside
  it, which is the Izod test. Both are transcribed as printed, the property stays the unspecified impact
  strength, and no test is inferred from a label the method contradicts.

## What is held, and why

Eight documents, with their proposals beside the applied ones in `proposals/b10-held/`.

Seven are an identity nobody has settled, and each needs a ruling rather than a guess:

| Product | What its sheet says |
|---|---|
| NonOilen | "Polymer base polylactic acid and polyhydroxy butyrate compound" — two polymers, so a blend, and a blend is identified by its own name |
| Nylon AF80 Aramid | "Polymer base polyamide 12", with an aramid filler: a combination no material holds |
| Nylon CF15 Carbon | "is a Nylon based" and nothing more specific |
| Nylon FX256 | the same, with no composition row at all |
| Flexfill TPE 90A | "Polymer base polyolefin" — which polyolefin elastomer is a ruling |
| Flexfill TPE 96A | the same sheet, a harder grade |
| Timberfill | "natural fibres obtained from wood", in a polymer it never names |

The eighth, **OBC 905**, is held for a reason about the reader and not the sheet. Its table prints a value
column per build orientation under the header "XY-axis Z-axis Test Method Test Condition":

```
Tensile strength at yield   14 MPa   11 MPa    ASTM D1708
Elongation at break        700 %    480 %      ASTM D1708
Flexural modulus           244 MPa  217 MPa    ASTM D790  1% strain
```

Read as one column, the Z value of every row is dropped and the X-Y value recorded with no direction at all —
seven rows of a thirteen-row sheet. On the same sheet the Vicat row prints "-" and its label was carried to the
line below, turning a "Temperature resistance" of 100 °C into a Vicat softening point. Neither is a thing to
review around; both are the same piece of work, a table read by its columns, which `PLAN-REMAINING.md` names as
what is left of BASF's layout too, and of `docs/OPEN-PROBLEMS.md` §1 and §9.

## Two standards, and what they cost

`ISO 34` (the tear strength of an elastomer) and `IEC 243` (what some sheets still call IEC 60243) enter
`schema/vocab/standards.csv` with the data that cites them.

The estimate stage reads 34.4 s on this data, against 33.4 s before the batch; `npm run scale` and the block
solve it is the alarm for are in `batches/b09/README.md`, "What it costs".
