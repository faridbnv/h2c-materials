# Batch b14: the documents nothing was holding

Applied 2026-09-20 by `m83-batch-b14`: 550 records from 51 documents. The database goes from 143 materials,
643 grades, 7,461 measurement rows, 848 sources and 709 profiles to 144, 684, 7,850, 899 and 751.

**The first batch chosen by what the ledger says about a document rather than by who published it.** Every row
the queue said was read and unheld, in one run: `ingest:batch --propose --ready`. Before this the queue was a set
of folder names and batch READMEs, and a document held for a ruling last week came back this week to be held
again.

| | Documents |
|---|---:|
| Applied | 51 |
| Held, with the reason in the ledger | 150 |

3DJake's mirrors of FormFutura, Spectrum, colorFabb and Bambu are 23 of the 51 and Nanovia's own pages are 22.

## What the reader had to learn, and what each thing cost before it learned it

**A section of a sheet is not its product.** Nanovia publishes each grade as a web page, and every one of its
twenty-three begins with the shop's navigation — Store, Distribution, News, Contact, Profile, Cart. Read from the
head of the page, all twenty-three were products called Distribution; told that Distribution is a section, all
twenty-three became News. What such a page does say plainly is its breadcrumb, and the last step of a breadcrumb
is the page itself: ABS AF, PETG CF, PA-6 CF, PC-ABS Rail.

The same rule covers QIDI's sheets titled "Data / Revised: 01.2024 Version No: 5.1", Filament2Print's titled with
the shop's own copy ("Our Hardest Flexible Filament. Rigid and Flexible."), a page that prints its title twice
overlapped ("XECARBXECARB PA12-CF-STPA12-CF-ST"), and eight QIDI sheets whose title line is "www.qidi3d.com". A
full stop between two words is a sentence boundary and a name has none; a name is not a web address; and a word
repeated to itself is a page that printed its title twice.

**A retailer is not a manufacturer.** A sheet a shop hosts that names no maker of its own gave its grade the
shop's name, so "Filament2Print BEDROCK 3D PPSU" and "3DJake PLA Basic" said the shop made what it sells. Some of
those are the shop's own brand and some are another maker's sheet under the shop's roof — TECAFIL is Ensinger's —
and which is which is the owner's to say. Thirty-five wait for that (Wave D). The sheets a shop hosts that do name
their maker are unaffected, which is why 3DJake's mirrors are the largest part of this batch.

**A number written with an E is a power of ten.** "Surface Resistivity IEC 60093 > 1.0E+15 ohms" read as 1 and
Nanovia's "10E13" as 13, which is an insulator recorded as a conductor — the same defect m79 corrected for the
raised powers, in the notation the corpus uses 125 times over. The exponent's sign is left out where it is
positive, so "1E1" and "10E13" are read too.

**A designation's hyphen may not be a hyphen.** "ISO 7619‐1" typeset with a non-breaking hyphen left the `-1`
outside the designation, and a Shore hardness the sheet prints as 98A was read as 1.

**A label may stand under its row.** A bilingual sheet prints the maker's own language above the line that carries
the standard and the value, and English under it; read without the line below, "ISO 1183 1.07g/cm³" names no
property at all.

**A breadcrumb is not a composition.** "Home / 3D printing filament / Reinforced / Carbon fibre / Nanovia ABS CF :
Carbon fiber reinforced" names a carbon load and a reinforcement, and is a menu.

**A captured page's spacing is layout.** A web capture pads its columns with runs of spaces, which arrived in the
grade's own columns as text (TEXT-SPACING); a run of spaces is not something a maker wrote.

## What was held, and why

| Held | Documents | Why |
|---|---:|---|
| The shop's own name on the grade | 35 | whether the shop is the brand or only the shop is the owner's to say (Wave D) |
| QIDI, entire | 27 | a bilingual table on four baselines the page orders by height rather than by row |
| Identity unsettled | 43 | a family word, a support product, a polymer with no row |
| The same numbers under another name | 27 | queued rather than registered twice (R053) |
| The rest | 18 | a page that names no product, a product already recorded, a sheet with no values |

**QIDI is the one worth explaining.** Its sheets print the property in Chinese on one baseline, the standard and
the value on the next, and the English name on the one after. The label under a value line is read now, which
recovers its density, its melt index and its flexural modulus — but where a label lands between two values it
takes the wrong one's, and a tensile modulus of 2,317 MPa was recorded as a yield strength. That needs the columns
read by position, and twenty-seven documents wait for it rather than enter wrong.

## What was decided rather than accepted

One row is rejected as a misreading: the low end of colorFabb's LW-ASA density range, which is what the filament
reaches when its foaming is active — what the process does and not what the material weighs. b09 and b11 rejected
the same row on the same maker's sheets.

Two heat deflections are recorded as printed and marked physically implausible, so they back no headline, estimate
or bound (D55): FormFutura's ApolloX Kevlar prints 89 °C at 0.45 MN/m² and 95 °C at 1.81, and Bambu's PC prints
112 °C at 0.45 MPa and 117 °C at 1.8. A lighter load cannot deflect a bar at a lower temperature.

Thirteen findings are accepted with a reason apiece: a notched PVA support below a window drawn from structural
semicrystallines, an olefin block copolymer stiffer than the elastomers its window is drawn from, a 30D copolyester
deflecting at 50 °C, a carbon-filled PETG whose own sheet prints a bending modulus two orders below what its
strength requires and an elongation of 102 % beside it, two Z impacts above their X-Y, a strain below what its own
stress and modulus imply, and a polycarbonate whose Vicat sits below its glass transition. Three acceptances were
removed because they no longer occur.

## Two vocabulary rows and two standards

Nanovia and QIDI enter `schema/vocab/manufacturers.csv` with the data that cites them; ASTM D149 and IEC 60243,
both dielectric-strength tests, enter `schema/vocab/standards.csv`.
