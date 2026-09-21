# Batch b25: what four polymer rows and four rulings let in

Applied 2026-09-21 by `m100-batch-b25`: 40 records from 4 documents, out of 187 proposed from every document the
ledger held for a ruling. This is phase D of the completion plan, and nothing in it is a reader rule. What let
these documents in is data: four rows of `polymers.csv`, each read from a producer's own document, and the
rulings that say what to do with what those rows identify.

## The polymer rows (m98)

R081 asked for PA11 and SEBS; PCL's row was written under R052, and R082's blends needed rows of their own. Each
figure below was read from the producer's document, fetched and hashed for the purpose, and checked on its page.

| Row | From | Why it was needed |
|---|---|---|
| **PA11** | Arkema Rilsan BESNO TL (1.02 g/cm³, 186 °C), the PA11 brochure (semi-crystalline, 180–189 °C, lowest moisture pick-up of the performance polyamides) | Prusament PA11 and PA11 Carbon Fiber |
| **SEBS** | Kraton G1650 M (specific gravity 0.91, 30 % polystyrene), the Kraton product guide's seven SEBS grades (0.90–0.91) | Recreus Filaflex SEBS |
| **PLA-PHA** | colorFabb's own sheets and family page: a PLA blend, less brittle, HDT-B 51 °C | colorFabb PLA/PHA, NinjaTek's copy |
| **PLA-PHB** | Panara's NonOilen TF 3066-8 sheet (1.2 g/cm³, DSC melting point 184 °C, crystallisation 110 °C, HDT-B 107 °C); Fillamentum's own information sheet for the polymer base | Fillamentum NonOilen |

The two blends are two rows and not one, which R082 itself says why: colorFabb's deflects at 51 °C and
Fillamentum's at 119 °C as printed, and one row cannot be amorphous and crystallising at once.

## The rulings this batch applied

- **R086** (identity, Siraya Tech Fibreheart PAHT CF (PPA based)): the name says one polymer twice. PAHT is the
  trade descriptor — polyamide, high temperature — and PPA the polymer the sheet's own head says it is based on.
  Not a blend, so R082 does not reach it; the product joins the PPA-CF material that already exists.
- **R087** (new material, PLA-PHA) and **R088** (new material, PLA-PHB): the permission `apply.mjs` asks for
  before it creates a material, given by R082 rather than by a second verdict. M145 PLA-PHA is created here;
  PLA-PHB waits for its sheet, which is held below.

## What entered

| Document | What it wrote |
|---|---|
| Siraya Tech Fibreheart PAHT CF (PPA based) | grade G070-09 under PPA-CF, its density, its profile |
| colorFabb LW-ASA (NinjaTek's copy) | grade G032-05 under ASA Aero, its density, its profile |
| colorFabb PLA/PHA (2023 revision) | **material M145 PLA-PHA**, grade G145-01, 11 values, the headline, the profile |
| colorFabb PLA/PHA (NinjaTek's copy) | 11 more values on the same grade, citing its own sheet |

One grade cites two sources, which is what two revisions of one product are.

## Three rows a reader decided, each against the page

- **colorFabb LW-ASA, density 0.40 – 1,07 g/cm³.** The sheet publishes a range because a foaming filament's
  density is set by how much the printer foams it, and both ends are recorded. The low end is below what the
  physics windows allow an amorphous compound (W0002 bounds it at 700 kg/m³), and the acceptance on that row
  says why: the windows have no class for a foamed grade, which is a fix this programme has named and not made
  (`PLAN-REMAINING.md`, the durable fixes). The grade's Foaming modifier already says what it is.
- **Eryone Hyper Speed TPU, Charpy 120 kJ/m².** Page 2 prints "Charpy Impact strenght GB/T 1843 kJ/m2" and in
  the value column under it "2.75J 120". The 2.75 J is the pendulum the test used; the result is 120 kJ/m².
  The pendulum standing in the value column is what read it into the label.
- **AzureFilm ABS, tensile modulus 1,0 MPa.** Read against the page image: the sheet really prints 1,0 under a
  `[MPa]` header, two rows above a flexural modulus of 1,6 `[GPa]`. A tensile modulus of 1 MPa is impossible
  beside a tensile strength of 24.2 MPa. The number is kept as published and flagged **Published value
  (physically implausible)** with the reason in its Notes (D55): it backs no headline, estimate or bound.

## What was held, and why it is the right hold

- **colorFabb CopperFill (2017) and copperFill (2023).** Both were going to enter with the grade Variant
  "undisclosed dense filler" and a Composition sentence reading "Not declared on the sheet" — over a sheet whose
  first line is "a high quality PLA 3D printing filament, loaded with copper particles". R078 is for a load a
  maker does **not** declare. A load a maker does declare, and that no value of `schema/vocab/modifiers.csv`
  covers, is the question R080 answered for graphene and natural fibre: a modifier value enters with the data
  that cites it. The reader now says so, and both sheets wait with the rest of that class — Prusament's
  magnetite and tungsten, bronzeFill — for one ruling about metal and stone loads.
- **Fillamentum NonOilen.** Its identity is settled (PLA-PHB) and it reads thirteen values, but its sheet prints
  two densities — 1.20 g/cm³ to ISO 1183 and 1,05 g/cm³ to ISO 1133 — and the reader takes the first. It is in
  the `reader:several-values` pool with 43 others.
- **Eryone Hyper Speed TPU and AzureFilm ABS P** are twins of sheets already recorded: the product has a grade,
  so the ledger records which source each repeats and nothing is written twice (R053).

## Reader changes, and what they cost

Four, each measured over every maker with hand-transcribed sheets (`census/parity.csv`, before and after): **no
maker down**, colorFabb 225→236 of 241, NinjaTek 90→102, Siraya Tech 20→21, all three because their sheets are
now recorded rather than because the reader read them differently.

- **A blend the database holds a row for is that blend.** "PLA/PHA" in a name, or "polylactic acid and
  polyhydroxy butyrate" in a composition row, names both parts of a blend `polymers.csv` has a row for, and the
  row is what settles it. Where there is no such row, two polymers are still a question for the sheet (D12, R082).
- **A ruling that names a product answers for its name.** Asking again of a product the register answers for
  held Siraya's sheet forever; and a ruling now reaches the product by the name the catalogue lists it under as
  well as by the sheet's own.
- **A polymer the sheet names for something else is not the filament**, in two shapes neither guard caught: a
  bed the sheet punctuates its own way ("Bed surface / Textured PEI" made AzureFilm's wood-filled LumberLay a
  PEI), and another of the maker's own products in a photo caption ("3D printed flexible support made using
  Nanovia PLA Flax" made a Shore D 44 elastomer at 1550 kg/m³ a PLA). The guard never reaches a product whose
  own name carries the polymer.
- **A load the maker declares is a ruling, not an undisclosed filler**, as above.

## Two traps in the tooling, closed

- **A hold that is gone releases the document.** `--holds` wrote why a document waits and never said when it had
  stopped waiting, so three documents sat "held" with the note of a ruling that had answered them. Nine were
  released the first time it was asked.
- **A review names its batch.** A document is proposed again in every batch that re-reads it, and the older
  copies stay in their folders as the record of what that batch saw. `--doc <key> --accept m01` wrote one
  decision into ten batches' worth of history, eight of them long applied; it now refuses and names them.
- **`--propose --held any`** takes every held document whatever its reason, because a reason is what the last
  `--holds` run wrote and a document whose blocker has changed is one a named reason misses. NonOilen sat out
  two batches that way.

## Beside the batch

**m99** wrote the printing links 34 materials never had. A material's guidance is the print profile it cites —
the build quotes the first `printing` link in `material_links.csv` and nothing else — and nothing wrote that link
for a material the pipeline created, so 34 materials with a profile apiece published no nozzle or bed guidance at
all. `apply.mjs` now writes it with the material, which is why M145 has one.
