# Small rulings: a filler for looks, a 2.85 mm product, a drying range (track T4)

> **Historical record** (2026-10-20): track T4 of the owner's rulings round, a filler for looks, a 2.85 mm product and a drying range (D175). It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../OPEN-PROBLEMS.md).

> **In short.** Three of the owner's rulings of 2026-10-20 (GOALS-LOG items 7, 8 and 14), built as D175 by Claude Opus
> 5.5: a product whose filler is only for looks reads its type's printer guide in full (m470), a product found only in
> 2.85 mm stays with a warning (m471), and a drying schedule printed as a range is shown as the range (m472). No material
> verdict, listing or group moved over the 138 cases of the decision census; four products now pass the indoor-prototype
> template, and sixteen product answers in the property sweeps moved by the estimate model's refit, each explained below.

## What is here

| File | What it holds |
|---|---|
| [COSMETIC-FILLERS.md](COSMETIC-FILLERS.md) | The 28 products filed "undisclosed dense filler", read on their documents: the eleven re-filed and why, the seventeen left and why |
| `diameter-scan.mjs`, `diameter-scan.csv` | Every grade's documents read for the diameters they print (the reader is `scripts/lib/diameters.mjs`, shared with m471 and the import) |
| `drying-ranges.mjs`, `drying-ranges.csv` | Each product whose drying now reads as a printed range, and each material whose typical drying span moved, before and after |
| [DECISION-DIFF.md](DECISION-DIFF.md) | The decision census against the round's baseline (`../baseline/census-before.json`) |

## Every answer the decision diff moved

- **Indoor prototype, in each of its three modes (12 product answers).** FormFutura Matt PLA, AzureFilm PLA Matte (HS),
  eSUN eTwinkling and eSUN PETG-Matte went from one check away to pass: their sheets are silent on the chamber and the
  hardened nozzle, and as cosmetic dense fillers they now read their type's guide row (Bambu Lab's PLA or PETG HF column:
  enclosure optional, so no chamber needed; no hardened nozzle). That is the ruling's intended effect.
- **Density at least 1500 kg/m³ (4).** eSUN eTwinkling, not enough data to unlikely to meet: its own 1.41 g/cm³ is from an
  injection-moulded bar, so its printed density is an estimate, and its plausible top fell from 1500 to 1480 kg/m³ once it
  left the metal fills' variant term for its own.
- **Tensile strength at least 50 MPa (2).** FormFutura ClearScent ABS, not enough data to unlikely to meet: its plausible
  top fell from 50.0 to 49.9 MPa.
- **Tensile modulus at least 2 GPa (2).** Extrudr PETG lost its "likely" tag: its likely range's bottom fell from 2.00 to
  1.99 GPa.
- **Elongation at least 5 % (8).** Spectrum's and The Filament's ASA CF, not enough data to unlikely to meet (plausible top
  5.01 to 4.99 %); Spectrum PA6 neat lost its "likely" tag (comparable and as published), its estimate now learned with the
  undisclosed dense fillers that remain (metal fills and functional loads) rather than with the matte products.
- **The product a row shows (22)** changed among a material's undecided products where their estimates moved by a hair.

The last three groups are the estimate model's refit: each Variant has its own term (`v:grade:<Variant>`), so moving
eleven products to a new one moved the shared hyperparameters a little. 607 of 2,581 product estimates moved, by a median of
0.2 %; the largest, 13.5 %, is a re-filed product's own elongation (`build/snapshot/grades.csv`). The estimate stage's code
is unchanged.
