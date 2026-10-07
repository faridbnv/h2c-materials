# Toughened PLAs the database lacks: what their makers publish (impact round, 2026-10-06)

> **Current** (2026-10-06): the research for the round's bounded fetch, and why it waits for a batch of its own.

A Claude Sonnet researcher looked for the makers' own documents of well-known toughened or "PLA+" products the database
does not hold, and quoted what each prints about impact. Nothing here entered the data: a new document enters only through
the import pipeline ([IMPORTING.md](../../IMPORTING.md)), and these need a batch of their own (b45):

- **Overture** is a maker the database has never read. The pipeline proves a maker's layout on sheets somebody already
  transcribed before it reads one nobody has ("parity before novelty"), so its three sheets need a person or a reader
  round's page reading as the first transcription.
- **BASF Ultrafuse PLA Tough and PLA PRO1** are in the import ledger, deferred: their extended sheets print several
  values per row in XY / XZ / ZX columns, a layout the reader does not take yet (`ledger.csv`: "several values per row",
  "BASF extended layout, scanned"). The German PLA Tough TDS (v2.1) found here is text and could be the way in.
- **Inland PLA+** publishes only a safety data sheet, and Micro Center's site refuses ordinary clients; not pursued.

| Product | Maker's document | Impact results it prints (quoted) | What the maker says |
|---|---|---|---|
| Overture PLA+ | TDS v5.2 (Jan 2026): https://overture3d.com/cdn/shop/files/OVERTURE_PLA___TDS_EN_5.2.1.pdf | "Charpy impact strength (X-Y) ISO 179, GB/T 1043 20.1 ± 1.6 (kJ/㎡)"; "Notched Charpy impact strength (X-Y) … 3.7± 0.6"; "Charpy impact strength (Z) … 15.4± 1.7"; specimens 240 °C, 100 % infill, conditioned 24 h at room temperature | "PLA+ with balanced stiffness, layer bonding, and toughness"; page title "High Toughness" |
| Overture Super PLA+ | TDS v5.1 (Jul 2024): https://overture3d.com/cdn/shop/files/OVERTURE_SUPER_PLA__TDS_EN_V5.1_fff22cb0-35bb-4889-9e0a-f8bbb914a865.pdf | "Notched Charpy impact strength (X-Y) ISO 179, GB/T 1043 36.6 ± 2.1 (kJ/㎡)" | "greatly improves impact resistance … than ordinary PLA" |
| Overture PLA Professional | TDS v5.1: https://overture3d.com/cdn/shop/files/OVERTURE_PLA_PROFESSIONAL_TDS_EN_V5.1_b6097b34-61cd-4f4c-9f6e-260f44e22ebe.pdf | "Notched Charpy impact strength (X-Y) … 12.8 ± 1.3 (kJ/㎡)" | "dramatically improved fracture toughness"; page: "up to 5× the impact toughness of standard PLA" |
| Prusament PLA Blend | TDS v1.0 (27-07-2022): https://www.prusa3d.com/file/938568/prusament-pla-blend-technical-data-sheet.pdf | "Impact Strength Charpy [kJ/m2](4) 13 ± 1 (Horizontal) 15 ± 1 (Vertical xz) ISO 179-1" (unnotched, footnote 4); notched "not applicable" | none |
| Elegoo PLA+ | product page (no TDS found): https://us.elegoo.com/products/elegoo-pla-plus-3d-printer-filament-1-75mm-colored-1kg | "Impact Strength (X-Y) 65.5 ± 3.6 kJ/m²"; "Impact Strength (Z) 7.6 ± 1.1 kJ/m²" (no test, notch or standard) | "even higher impact strength and less brittleness & deformation than usual PLA" |
| BASF Ultrafuse PLA Tough | DE TDS v2.1 (20.10.2023): https://move.forward-am.com/hubfs/AES%20Documentation/Engineering%20Filaments/PLA%20Tough/TDS/Ultrafuse_PLA_Tough_TDS_DE.pdf | Charpy notched ISO 179-2: 18 (XY) / 8.6 (XZ, annealed) / 2.5 (ZX); Izod notched ISO 180: 18 / 7.1 / 2.4; conditioned 23 °C, 50 % RH, 72 h | "an impressive impact strength – 720% higher than standard PLA" (product page) |
| BASF Ultrafuse PLA PRO1 | TDS v3.3: https://move.forward-am.com/hubfs/AES%20Documentation/Engineering%20Filaments/PLA%20PRO1/TDS/Ultrafuse_PLA_PRO1_TDS_EN_v3.3.pdf | Charpy unnotched ISO 179-2: 20.4 (XY), 18.8 (XZ); no notched value | "tough biobased PLA filament made for professionals" |

What they would show: Overture's own PLA+ publishes a notched Charpy of 3.7 kJ/m², the same as plain PLA, and its
Super PLA+ 36.6: the name "PLA+" says nothing about the number, which is what the drawer's "sold as toughened" mark and
its split are for.
