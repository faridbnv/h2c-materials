# Batch b07-extrudr

Extrudr's library: 140 links, 33 documents, 24 of them read. Applied 2026-09-19 by `m63-batch-b07-extrudr`.

## What 140 links are

Every sheet is served in English, German, French and Italian, and several are served under more than one product
name. Deciding what is one document came before reading any of them:

| The links | What they are |
|---|---|
| `pla-basic`, `pla-basic-bundle`, `pla-basic-cmyk` (12 links) | one sheet, titled PLA BASIC, dated 16.07.2025 |
| `petg` and `petg-bundle` (9 links) | one sheet, titled PETG: the bundle link serves the 13.03.2025 revision of the 20.06.2024 one |
| `pla-hs` and `pla-high-speed` (8 links) | one sheet, titled PLA HIGH-SPEED, a week apart; the later stays |
| `durapro-abs-cf` in German | the ABS sheet. Extrudr serves the wrong file under that link, and it is not a source for the carbon fibre product |
| `durapro-asa` in Italian, `durapro-asa-cf` in French | older revisions (28.10.2025, 9.10.2025) of sheets read here in English (11.05.2026, 27.03.2026) |
| `xpetg-cf` | a scan with no text layer: `needs-ocr` |

The reader could not see this at first. Extrudr states every result as "Tensile modulus ISO 527-2/5A/500 MPa 40" —
the unit in a column before the value, the specimen and the test speed inside the designation — so the only
numbers a fingerprint could see were the conditions every Extrudr sheet repeats. Flex Hard, Flex Medium, Flex
Semisoft and Flex Hard CF arrived as one sheet served four times. The fingerprint now reads a unit that precedes
its value, reads a decimal comma as a decimal point, and absorbs a designation whole; and a translation must be
the same product, by name or by a link that differs in nothing but its language marker.

## What entered

| Table | Records |
|---|---:|
| sources | 25 |
| grades | 24 |
| measurements | 233 |
| profiles | 24 |

One new material: PC-PBT with carbon fibre, whose unfilled blend the database already held.

## Every value is a raw material value

Extrudr publishes one Additional Information Sheet for the whole range. Section 4 of it says: "The test specimen
are manufactured through injection moulding and are tested afterwards." No individual sheet says so, so no reader
of one sheet could know it. Every accepted row in this batch is therefore Specimen type "Raw material value" with
Direction "Not applicable" (D55), each naming the document in its Notes, and the document is registered as
`R-EXTRUDR-AIS`, as corroboration: nothing is transcribed from it, and it says what the rows that cite the sheets
are. It applies to any Extrudr sheet read later, too.

## Six readings that were wrong

Each was found by reading a row against its page, and each fix is a rule, not a special case:

- **"DIN 53504, S2"** left its specimen outside the designation, and a tensile strength read as 2 MPa where the
  sheet prints 470.
- **"SO 527-2/5A/500"** — extraction dropped the I of ISO on one sheet, and the surviving 500 beside MPa read as a
  modulus of 500 where the sheet prints 42. A number written into a designation's own slashes is not a value.
- **"ISO 306 A50"** puts its method variant a space from its number, and both Vicat points of PLA Tough read as
  50 °C instead of 65 and above 150.
- **"(-30°C)"** lost its minus with its bracket, and a Charpy strength measured at minus thirty was recorded as
  measured at plus thirty.
- **"Tensile Elongation (Indentation Depth) 5 %"** read as an elongation at break, on a sheet that also prints
  "Nominal Elongation at Break > 50 %". A qualifier the lexicon cannot read is not the unqualified label.
- **A treatment named for one row was dropped**, so PLA Tough's sintered Vicat point was the same measurement
  twice with two answers.

Parity on the three makers already transcribed is unchanged by all six: Spectrum 113/113, 3DXTECH 213/214,
Polymaker 223/239.

## What was decided rather than read

**PLA Basic CF** (ruling R045): its sheet of 04.05.2026 reprints the PLA Basic table value for value — modulus,
strength, stress at break, elongation, impact, HDT, melting, shrinkage and density identical, only the
hardened-nozzle recommendation different — while its prose claims significantly higher rigidity. The product and
its sheet are registered and none of its numbers is, with a coverage row saying why. Recording them would have
taught the estimate model that a carbon-fibre PLA measures like an unfilled one.

**Two melt flow index rows** on the PLA High-Speed sheet, 23 and 10 g/10 min, printed under one label and one
method with nothing that distinguishes them. Both are recorded as printed and the finding is accepted with that
reason.

**A tensile strength of 470 MPa** on Flex Medium Matt, printed beside an elongation at break of 6.9 % on a Shore
A95 filament described as extremely extensible. Both are recorded as printed; the pair reads as transposed, and
the physics lint has it.

## What is not here

Eight products whose sheets name no polymer: GreenTEC, GreenTEC Pro, GreenTEC Pro CF, BioFusion, Pearl, Flax, Wood
and XPETG MATT. `research/extrudr-polymers.md` is what Extrudr's own safety sheets and product pages say about
them; five are settled there and wait on a ruling, three are not.
