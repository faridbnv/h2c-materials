# Batch b20: the rulings that settle their products without asking again

Applied 2026-09-20 by `m91-batch-b20`: 245 records from 27 documents. R078, R079 and R080 are mechanical — the
owner's answer decides every document that says the same thing — and reading them found more wrong than missing.

## R078, narrowed to what the ruling says

> A filament denser than its named polymer reaches → a Variant of the named polymer, with the load in
> Composition / filler (D57).

**Denser**, and only that. The reader's old message carried the light case in the same sentence and the ruling
never did, which matters: Fabru's "Cyclo-Olefin-Copolymer flexibel" publishes 940 kg/m³ against COC's 1010
because it is the soft grade, not because anything was foamed, and declaring a lightweight additive would record
a component that is not in it. The light case is a question again — a foaming agent and a softer grade of the
same polymer read alike, and the sheet says which.

Eighteen grades declare `undisclosed dense filler`, among them colorFabb's bronzeFill and steelFill, Protopasta's
Stainless Steel and Magnetic Iron PLA, and Spectrum's HDPE at 1100 against polyethylene's 980.

**A density no filament reaches declares nothing.** Six sheets in this queue read 11115, 23000 or 923000 kg/m³ —
tungsten-filled PLA, the densest thing in this corpus, is about 4000 — and a Variant for one of those would
record a load that is not there. They stay questions.

## R079, twice over

A product whose identity the database already holds is a grade under that material. `collidesWith` keys on the
three things a material is — its identity, its filler, its commercial variant class — so a collision is the same
material and not a similar one.

And where the database holds no material for the finish but does hold the plain polymer, the product is a grade
of that: a glow or a glitter PETG is a PETG mechanically and the finish is a fact about the grade, which is the
owner's own wording. Twelve such products — PETG Glow, PET-G Glitter, PETG Marble, ABS Wood, ABS Marble, ABS
Rapido Metal, PET-Wood, TPU Silk, BioFil Wood — joined their polymer's material. The same product in PLA never
reaches that second step, because PLA Glow and PLA Sparkle exist and the first step finds them (R039).

## Three materials that would have been created twice

PEI-CF, PEEK-CF and PEKK-CF set their Estimate identity to "Not applicable" because the estimate model excludes
them, and every match in the classifier compared that field to a polymer. So none of the three ever matched
itself, and Nanovia's PEI CF and PEKK-A CF and Ensinger's TECAFIL PEEK EV CF30 would each have made a second one.
**A material the model excludes is still a material**, and both `matchMaterial` and `collidesWith` now read the
base polymer where there is no estimate identity.

## Three reader defects, each putting a wrong identity into the data

| What the page said | What the reader made of it | Documents |
|---|---|---:|
| `… Essentials & Accs SUPPORT BLOG … support@siraya.tech` | Siraya Tech's whole filled range read as support filament: ABS CF, ASA GF, PET CF, PETG CF, TPU GF, PPA, PEBA and four TPUs | 20 |
| `compatible with BVOH, water-soluble support material, and HIPS` | BASF's PAHT CF15 read as a support | 1 |
| a shop's category menu listing every material it sells | thirteen Nanovia products took "hips" from it — among them a silicon-carbide filament and a stainless-steel one, which is how a HIPS came to publish 7190 kg/m³ | 13 |

All three are one mistake in different clothes: **a word near a product is not the product**. The classifier
already had that lesson written down for polymers — "PVA glue" names the glue — and it now holds for supports
and for what a captured shop page says about itself.

Parity over all thirty-eight makers, measured after every one of these changes: **no maker down, two up.**

## And one in the review rather than the reader

`--decide` accepted a row when **any** of its reasons matched the pattern. A row held both for a low confidence
and for a value outside every physics window was accepted on the confidence, carrying the other unread. Every
reason must match now.

Nothing reached the database that way — an audit of b19 found nine such rows and every one was in a document
b19 held — but it would have, and in this batch it did: the metal-filled densities were accepted on their
confidence before the fix, and are decided on their own reason after it.

## What was held after reading, rather than recorded

| Document | Why |
|---|---|
| colorFabb copperFill (two sheets) | the sheet prints two value columns and the reader reads them as one list: a flexural modulus of 3080 MPa and one of 40 MPa, a flexural strength of 29.6 MPa and one of 7000 MPa |
| Nanovia ISTROFLEX | Shore D 44, a tensile modulus of 60 MPa and a stress at break of 11.5 MPa: an elastomer, filed under PLA because its density then reads as a dense filler |
| AzureFilm LumberLay | 0.97 g/cc and melting above 210 °C, filed under PEI, whose density starts at 1270 |
| SUNLU Easy PA, one row | the scale of the hardness is printed "HA/HD", which states neither, and the difference is a soft rubber or a rigid plastic |

## R083 is not mechanical and is not applied here

Twenty-five documents would have created fourteen materials, and the ruling says that list goes to the owner
before any of it is written. A proposal carrying a new material now waits for a verdict in
`readings/readings.csv`, and [READINGS.md](../../READINGS.md) has a section listing what would be made:
PCTG-CF, TPU-GF, TPU-LW, PEBA-CF, PAHT-GF, PAHT-CE, PA12-AF, PA6/66-CF, TPU-EC, PLA-CE and the rest.

## Twenty-four findings accepted, and one check changed

Thirteen are the dense-filler Variants: no plausibility window carries a fill class for a metal or mineral load,
so every window that matches one is drawn for an unfilled polymer. **A fill class per Variant is the durable
fix** and it is not this batch's: widening the class to `any` was tried and measured, and it made two existing
rows worse — the `any` windows assume a possible fibre load and so have a *higher* floor, not a wider range. It
needs its own windows, a DECISIONS entry and a back-test.

Four are Ensinger's TECAFIL PEEK EV CF30, a 30 wt% carbon PEEK reaching 170–200 MPa and 17–20 GPa where the
high-temperature fibre windows top out at 160 MPa and 16 GPa. Those windows were drawn from observation before
such a grade was in the corpus; the window is the thing to widen once a second one arrives.

Two more are values the rule compares across build orientations the sheet states and the rule does not read.

`test/rules.test.js` pinned the exact set of codes a real build raises, and EST-REJECTED now joins it: a
bronze-filled PLA weighs 3.9 g/cm³, which is true of the product and outside anything the model can learn a
PLA's density from. The grade declares the load with the Variant D57 asks for, and the model keeps the value out
rather than learning a PLA that weighs like bronze. `test/database.test.js` asserted that nothing is ever
rejected; it now asserts that a rejection is explained — a value kept out with nothing on its grade to say why
is a value nobody has looked at.

Two acceptances went stale and were removed: EST-OUTLIER on M017's density and on M068's heat deflection, both
of which stopped occurring when this batch's data moved their families.

## The database after this batch

144 materials, 830 grades, 9,311 measurements, 1,092 sources, 906 profiles; **933 of 1,936 documents applied**.
188 wait on an identity, down from 237: 119 on the owner's verdicts, 30 mechanical, and the rest one at a time.
