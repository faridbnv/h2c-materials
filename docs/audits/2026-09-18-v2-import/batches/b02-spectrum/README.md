# Batch b02-spectrum

Fifty-three Spectrum data sheets, the rest of that maker's range except what is still a question. Applied
2026-09-18 by `m54-batch-b02-spectrum`.

## What entered

| Table | Records |
|---|---:|
| sources | 52 |
| grades | 51 |
| materials | 10 |
| measurements | 401 |
| profiles | 54 |
| profile_notes | 189 |
| coverage | 2 added, 6 edited |

The ten new materials are the polymer-and-filler combinations this maker's range needed and no material held:
ABS-AF and ASA-AF (aramid), PLA-EC and ASA-EC (electrically conductive), PETG-PTFE and PC-PTFE, PA6-CE (ceramic),
PA6-GS (hollow glass spheres), PLA-ESD and PCTG-GF. Each has a ruling in `../../rulings/rulings.csv` (R005 to
R013, R015) saying what the sheet states and why no existing material holds it. `schema/vocab/modifiers.csv` gains
five values with them, each with the abbreviation a material's name uses.

## The gate

The reader reproduces **113 of 113** values (100%) on the twelve Spectrum sheets transcribed by hand before this
programme, on property, value, unit, direction, load and notch. It was 22% when the reader was written, 93% when
the first batch was proposed and 98% when it was applied. The last two came from this batch's own sheets: a
flexural modulus printed "24.000 kg/cm2", which is ambiguous between twenty-four and twenty-four thousand, and an
Izod strength in kg·cm/cm, a unit spelled with a dot operator the conversion table did not hold.

## What the reader learned from these sheets

- **A physics window can settle a separator.** "24.000 kg/cm2" is twenty-four thousand, because 24 kg/cm² is
  2.4 MPa and no solid polymer has a flexural modulus that low. The raw cell records the number and what the sheet
  printed, which is the convention V000731 set for the same product by hand.
- **A polymer named only to be contrasted with is not the product.** ecoPET 9021 says "Unlike the more widely used
  PETG in 3D printing, it is based on a non-glycol-modified variant of PET". It was being filed under PETG.
- **A support product says so in its own words.** AquaPrint names no support token in its title.
- **A percentage near a word is not a filler word.** "Tensile Strain at Break 10% lower carbon footprint" put a
  percentage twelve characters before the word carbon and read a flame-retardant PLA as carbon-filled.
- **A hollow glass sphere is not a reinforcing fibre.** PA6 GK10 says it is "filled with hollow glass spheres".
- **A relative humidity is a condition.** "Moisture absorption, 23°C/ 50% r.h. 3,00%" was read as 50%.
- **A second sheet for one product is a revision, not a second grade.** Spectrum publishes LW-PLA UltraFoam twice,
  one sheet with five values and one with ten; both are sources and the rows go on one grade.
- **A foamed density is what the process reaches, not what the material is.** The two UltraFoam sheets print the
  filament's density and, beside it, "Density (foamed) 0,37 g/cm3". Recorded as densities, those two rows taught
  the estimate model that a foaming material weighs 370 kg/m³, and it began to expect 716 for PLA Aero and 656
  for ASA Aero, both of which publish their filament's density. They are listed as reasoned omissions instead.

## What was decided rather than read

Twelve findings were read against the page and accepted with the sheet's own words in the reason, recorded in
`data/review/accepted-findings.csv` through the batch:

- Two flexural moduli the sheets print in MPa where every other modulus on the same page is in GPa (PLA ESD 3.8,
  LW-PLA UltraFoam 3.6). The number is kept as printed, flagged `Published value (physically implausible)`, and
  backs no headline, estimate or bound.
- Four notched impact values outside their window: 860 J/m for PET-G HT100, 686 J/m for PC 275 (ordinary for a
  polycarbonate, and the window was drawn from a database that held none), 6 J/m for PLA Magic SILK and 8.3 J/m
  for FlameGuard PLA.
- A 400% elongation measured to ASTM D882, a thin-film test.
- A tensile strength at break of 14.2 MPa beside a yield of 57.5 MPa on a carbon-filled PLA.
- A yield above an unspecified tensile stress on a polypropylene, which necks.
- Two Charpy rows whose own word and whose designation disagree about the notch.

## What is not here

Fourteen documents wait on the owner, in `../../proposals/held-spectrum/` and in `../../rulings/pending.csv`:

- **Nine particle-filled PLA variants** (metal copper, brass and bronze, glitter, wood, glow). Question Q004: the
  database already holds PLA Metal, PLA Wood, PLA Glow and their siblings as materials named after Bambu products,
  and two of those already carry other makers' grades. Filing Spectrum's under them, or creating class materials
  beside them, is the owner's call, and doing it wrongly splits one identity in two (D44).
- **Four sheets that name no polymer a material can be filed under**: Greeny Pro, GreenyHT, ThermaTech PA and
  PET-G FX120 (Q005).
- **S-Flex Carbon** (Q003), whose sheet calls it a flexible filament with 20% carbon fibre but publishes a
  modulus of 2.2 GPa, a break strength of 61 MPa and a heat deflection of 134 °C. Its own numbers rule out the
  elastomer its product line is.

Two further documents are recorded in the ledger as the same sheet served under a second file name.
