# PLA: the page as it would read

> **Historical record** (2026-10-17). Proposed full text of PLA's page (M001, 195 products), by the rules in PROPOSAL.md. Every
> number is taken from the current page (release ee8eb64a0259) or `dist/db.json`; comments name the field where it is not
> obvious. Figures are slots: `[Figure: what it answers — title — caption]`. Layout and drawing are the other experts'. It describes the tool as it was then; the round's [README](../README.md) says what was built.

---

Materials › PLA family

# PLA

*Polylactic Acid*

Unfilled polylactic acid · 195 products from 40 makers · **Type on Bambu's H2C list**

A material type on Bambu Lab's H2C list, though not every brand of it is.

PLA is polylactic acid. Makers sell it for prototypes and models, and call it easy to print. It is amorphous as
printed, so it softens at its glass transition: its HDT is 55 °C at 0.45 MPa and 55 °C at 1.8 MPa. On the H2C it needs
no heated chamber and, except for a few filled products, no hardened nozzle. Makers' statements on acids and alkalis
mostly say it does not resist them.

<sub>Draft summary, not yet reviewed.</sub>
<!-- the summary as written in material_summaries.csv: "{name} is polylactic acid. Makers sell it for prototypes and
models, and call it easy to print. It is amorphous as printed, so it softens at its glass transition: its HDT is
{hdt045.median} at 0.45 MPa and {hdt18.median} at 1.8 MPa. On the H2C it needs no heated chamber and, except for a few
filled products, no hardened nozzle. Makers' statements on acids and alkalis mostly say it does not resist them."
73 words. -->

| Tensile strength (XY) | Tensile strength (Z) | Tensile modulus (XY) | HDT at 0.45 MPa |
|---|---|---|---|
| **45.5 MPa** | **30.6 MPa** | **2.53 GPa** | **55 °C** |
| 71 products · middle half 40–53 | 39 products · middle half 22.9–34 | 55 products · middle half 1.93–2.87 | 89 products · middle half 53.8–59 |

| HDT at 1.8 MPa | Notched Charpy | Nozzle | Bed |
|---|---|---|---|
| **55 °C** | **6 kJ/m²** | **195–230 °C** | **50–60 °C** |
| 41 products · middle half 54–58 | 14 products · middle half 3.97–7.9 | most products that give one | most products that give one |

**Well documented:** 281 documents from 41 publishers, 240 of them data sheets. Each figure is the median of the
products that publish it with a stated orientation or test load, and beside it the middle half of them. Products with
an added filler or additive, and for notched impact those sold as toughened, are shown but kept out of the medians.

Against PETG, PLA is about 50 % stiffer, with an HDT 15 °C lower. Against ABS, it is stronger flat and 15 % stiffer,
with an HDT 40 °C lower and a notched Charpy 70 % lower.

| Median (products) | PLA | PETG | ABS |
|---|---|---|---|
| Tensile strength (XY), MPa | 45.5 (71) | 47 (29) | 34.5 (18) |
| Tensile strength (Z), MPa | 30.6 (39) | 30.2 (16) | 27.3 (12) |
| Tensile modulus (XY), GPa | 2.53 (55) | 1.68 (23) | 2.2 (13) |
| HDT at 0.45 MPa, °C | 55 (89) | 70 (46) | 95 (23) |
| Notched Charpy, kJ/m² | 6 (14) | 6 (8) | 20 (5) |
| Price, CAD/kg | 33.7 (26) | 26 (12) | 40 (9) |

<!-- neighbours: PLA is a base, so the two landmarks (landmarkMaterials, skipping itself); compareMedians gives the
sentence. ABS and PETG medians from materials[M027|M020].summary. -->

[Check PLA's products against your requirements in the selector →]

---

## 1 Among the materials

PLA has a low HDT and a low price among the materials: both are in the lowest quarter of the 99 and 108 materials that
publish them. Everything else sits in the middle half.

[Figure 1: where each of PLA's medians sits among every material's — *PLA among the materials: low HDT and low price,
mid-range otherwise* — Each row places PLA's products (band: middle half; tick: median) on the spread of every
material's median, lowest to highest. PETG, ABS and ASA are marked for reference.]

<details><summary>How this is counted</summary>
Left out of PLA's medians: products whose sheets state no orientation or test load (for example 56 of tensile strength
XY), and products with an added filler or additive. Each row's exclusions are listed in the records. *How the numbers
are worked out →* (the shared method page). [The figure's data table.]
</details>

## 2 Mechanical properties

Printed flat (XY), PLA typically reaches a tensile strength of 45.5 MPa at a modulus of 2.53 GPa, and breaks at
7.23 % elongation. In bending it gives 76 MPa and 2.87 GPa. <!-- summary.elongationXY, flexuralStrengthXY,
flexuralModulusXY medians -->

[Figure 2: where PLA's products sit in strength and stiffness among the materials — *Most PLA products: 40–53 MPa at
1.93–2.87 GPa, among ASA-GF, PETG-GF and PLA-CF* — Each grey point is another material's medians; the blue marks are
PLA's products, the box their middle half.]

[Figure 3: what a part loses across the layers — *Across the layers (Z), PLA keeps 62 % of its flat strength and 89 %
of its stiffness* — One row per product that publishes both from one sheet: flat (XY) in grey, across the layers (Z) in
blue. Elongation keeps 59 %. Three products report a Z value above their XY value, unusual for a printed part: check
those sheets.] <!-- the * rows: PolyLite PLA PRO Army Beige, Bambu Lab PLA Tough+, Raise3D Premium PLA -->

[Figure 4: how tough, and which products are tougher — *Notched Charpy is typically 6 kJ/m²; the seven products sold as
toughened publish 5.76 to 72.3 kJ/m²* — One dot per product. Filled: bar orientation stated, in the median; hollow: not
stated. Products sold as toughened (the maker's claim) and modified products are marked and kept out of the median.
Notched Izod, a different test, has its own row: 5 kJ/m² across 6 products.]

<details><summary>How this is counted</summary>
Left out of the Charpy median: 17 products with no stated orientation (1.8–29.8 kJ/m²), 7 modified (1.8–7) and 7 sold
as toughened (5.76–72.3). Z as a share of XY: 38 products publish both orientations of tensile strength from one sheet,
28 of modulus, 35 of elongation. *How XY and Z, Charpy and Izod, flexural and tensile differ →* [Data tables.]
</details>

## 3 Thermal properties

PLA is amorphous as printed, so it softens at its glass transition, typically 58.9 °C: its HDT is 55 °C under both
0.45 and 1.8 MPa. Nine products publish 75 to 135 °C at 0.45 MPa, three of them after annealing. The highest are
colorFabb PLA-HP (135 °C), Spectrum PLA Matt (116 °C, annealed at 90 °C for 4 h) and FormFutura Volcano PLA 150C
(110 °C). As published, Vicat softening is typically 60 °C and melting 163 °C.
<!-- standOut(hdt045): comparable, non-modified values above q3 + 1.5 × IQR (59 + 7.8); anneal from
grades[].headline.hdt045.anneal -->

[Figure 5: where PLA softens, under each load — *PLA softens at its glass transition: HDT 55 °C at both loads, Tg
58.9 °C* — Each rung is one property: the tick its median, the band the middle half of its products, the line lowest to
highest. Vicat and melting are as published, each under its sheet's method. Dashed: the H2C's chamber, at most 65 °C.]

## 4 Printing on the H2C

PLA prints well inside every H2C limit, with no heated chamber and a standard nozzle for all but six products.

| | Most PLA products | Bambu Lab Filament Guide, PLA |
|---|---|---|
| Nozzle | 195–230 °C | 190–230 °C |
| Bed | 50–60 °C | Cool Plate 35–55 °C · Smooth PEI 55–65 °C · Textured PEI 55–65 °C · Cool Plate SuperTack 30–45 °C |
| Heated chamber | none; sheets that give one say 25–40 °C | enclosure not needed |
| Drying | 50 °C for 6 h; most advise it only for wet filament | optional: 55 °C for 8 h in an oven |
| Nozzle type | standard | any size or material |
| AMS | Bambu Lab PLA Tough+: "AMS, AMS 2PRO, AMS HT, AMS Lite" | not stated |

Where a product's own sheet is silent, its setting comes from a sheet it shares or from Bambu Lab's guide; the
products table shows those in grey.

**Hardened nozzle.** Six products need one: eSUN eStars-PLA, Nobufil PLAx, Protopasta Stainless Steel PLA, Protopasta
Magnetic Iron PLA, colorFabb steelFill and Raise3D Hyper Speed PLA Pro.

**After printing.** Fifteen products publish values measured after annealing, on schedules from 50 °C for 8 h to
110 °C for 15–20 minutes. <!-- grades[].print.anneal -->

- "Prior to printing, HTPLA parts should be scaled in the slicer to compensate for shrinkage when heat treating." Scale
  values x/y 102.2 %, z 99 %. *Protopasta Translucent / Sparkly (HTPLA), data sheet, p. 1*
- "Typical time to anneal parts with wall-thickness of 0.125 in (~3.18 mm) is around 20 minutes, but this time is
  dependent on wall thickness." *MatterHackers Tough PLA, data sheet, p. 1*

[Figure 7: what nozzle and bed temperatures products agree on, against the H2C's limits — *Most PLA products print at
195–230 °C on a 50–60 °C bed, well inside the H2C's 350 °C and 120 °C* — A bar per product, its lowest to highest
setting; above them, how many products accept each temperature. Grey bars come from Bambu Lab's guide or a modified
product and are not counted.]

**What makers say about printing it**

- *Warping and shrinkage* (22 makers): "Shrinking ISO 294-4 % 0.3" *Extrudr PLA NX2 MATT, data sheet, p. 1*
- *Printing advice* (19): "Remote printing needs to reduce the printing speed (≤40mm/s) to prevent potential feeding
  issue" *eSUN ePLA ST, data sheet, p. 2*
- *Moisture sensitivity* (13): "Drying can help reduce stringing." *SUNLU PLA Rainbow, data sheet, p. 1*
- More from makers: odour and emissions (16), adhesion between layers (12), nozzle wear (10), supports and removal (8)
  ▸ <!-- closed; e.g. supports: "Recommended support material PolySupport™ and PolyDissolve™ S1", Polymaker PolySonic
  PLA, data sheet, p. 4 -->

## 5 Products

195 products from 40 makers. Sorted by how much each publishes; select a column to sort, a product to see its values,
print settings and documents.

**Products that stand out**

- Most published values: Bambu Lab PLA Basic and seven others, 15 of the table's 16.
- Highest tensile strength (XY): colorFabb PLA Chameleon, 70.9 MPa; PLA Vertigo prints the same sheet.
- Highest tensile strength (Z): Polymaker PolyLite PLA, 43.5 MPa, which also keeps the most across the layers, 93 % of
  its flat strength.
- Highest HDT at 0.45 MPa: colorFabb PLA-HP, 135 °C.
- Highest notched Charpy: Bambu Lab PLA Tough+, 72.3 kJ/m², sold as toughened, measured after annealing at 50 °C for 8 h.
- Lowest price: eSUN PLA HF, 18 CAD/kg.

These are published values, not recommendations: the selector judges each product against your requirements.

*Publishes Z values (42)* · *Has its own data sheet (178)* · *Priced in Canada (28)* · [Find a product or maker]

| Product | Values published | Tensile strength XY / Z, MPa | Modulus XY / Z, GPa | Notched Charpy, kJ/m² | HDT 0.45 / 1.8 MPa, °C | Price, CAD/kg | Nozzle, °C | Bed, °C | Chamber | Drying |
|---|---|---|---|---|---|---|---|---|---|---|
| Bambu Lab PLA Basic | 15 of 16 | 35 / 31 | 2.58 / 2.06 | 7.9 | 57 / 54 | 28 | 190–230 | 35–45 | 25–45 °C | 50 °C · 8 h |
| Polymaker HT PLA | 15 of 16 | 42.9 / 20.8 | 2.95 / 2.6 | 4.94 | 61.4 / 58.6 | 28 | 210–230 | 25–60 | none | 60 °C · 6 h |
| SUNLU PLA | 9 of 16 | 40 / | 3.5 / | 5 Izod | 55 / | | 200–240 | 60–70 | none | 50 °C |
| … 22 more, then **Show all 195 products** | | | | | | | | | | |

Key: *grey italic* as published, orientation or load not stated · ■ measured after annealing · *Izod* notched Izod, no
Charpy published · ⧉ shares its data sheet with another product · T sold as toughened (the maker's claim) · ◆ modified:
a filler or additive the name does not say, kept out of the medians · ⬢ hardened nozzle needed · ¤ converted from a
foreign price · blank: not published.

Values are for the colour each sheet tested; pigment can change them.

## 6 Uses, limitations and chemicals

**What it is sold for**

- "Great for prototypes and batch production, keeping costs low." *eSUN PLA-Lite, product page*
- "Detailed display models and early prototypes; low-load indoor parts." *Prusa Knowledge Base, PLA* <!-- m.bestUses, PR-pla -->
- "educational projects" *Spectrum PLA Nature, product page*

**What makers warn about**

- "PLA and HTPLA as printed, though both adequate performers in an office environment, have poor temperature
  stability, loosing significant stiffness at temperatures not much above 50C." *Protopasta Opaque HTPLA (v3), data
  sheet, p. 1*
- "Repeated impact, outdoor exposure or elevated service temperature governs." (when to avoid it) *Prusa Knowledge Base, PLA*
- "low temperature and chemical resistance" *Prusa Research Buddy3D PLA, data sheet, p. 1*
- "In filament form, Stainless Steel PLA is slightly more brittle than standard PLA and requires extra care when
  handling." *Protopasta Stainless Steel PLA, data sheet, p. 1*

Finish and accuracy ▸ (surface finish, 27 makers; precision and tolerance, 10)

**Chemicals and environment**

| Exposure | What makers say | Statements |
|---|---|---|
| Acids | mostly not resistant (25 of 35 statements; 7 resistant) | 35 |
| Alkalis | not resistant (2 of 3 makers) | 9 |
| Organic solvents | limited | 6 |
| Oils and greases | limited; Bambu Lab: "Resistant to most kinds of oil and grease" | 7 |
| Water | insoluble | 5 |
| Flammability | flammable | 5 |
| UV and outdoor | "UV exposure and heat can degrade performance; unmodified PLA is not a weathering-grade default." | 6 |
| Food contact | "Polymer-level food-contact statements do not certify a printed article or its cleanability." | 1 |

Makers rarely give concentration, temperature or duration. Resin reference data for plain PLA, where no product speaks:
moisture before melt processing, limited (it absorbs water).

## 7 Price

PLA typically costs 33.7 CAD/kg, the middle half 28–40 CAD/kg, across the 26 products with a regular price in the
sample; the lowest is eSUN PLA HF at 18 CAD/kg.

[Figure 8: what it costs and how much products differ — *Most PLA costs 28–40 CAD/kg* — One dot per product: the median
of its regular prices per kilogram, Canadian where it has any. Diamonds are modified products, kept out of the median.]

[Figure 9: whether paying more buys strength — *No clear link between price and tensile strength across 21 PLA
products* — A mark per product with both values, as published.] <!-- Spearman ρ = −0.04 over the 21 drawn -->

Regular prices, never sale prices, sampled from 9 Canadian and 7 foreign shops between 10 Sep and 7 Oct 2026; shipping
and tax are not included.

## 8 Other properties, as published

Each value under its own sheet's test conditions, so they are listed, not ranked.

| Property | Products | Lowest–highest |
|---|---|---|
| Melt mass-flow rate | 107 | 2.13–70 g/10 min |
| Water absorption | 37 | 0.13–1.8 % |
| Mould shrinkage | 18 | 0.1–0.67 % |
| Decomposition temperature | 16 | 250–375 °C |
| Hardness | 15 | 72–87 Shore D; 80–86.5 Shore, scale not stated |
| Crystallization temperature | 12 | 77.2–130 °C |
| Continuous service temperature | 6 | 45–50 °C |
| Interlayer adhesion strength | 4 | 17–41 MPa |
| Melt volume-flow rate | 4 | 8–27 cm³/10 min |
| Moisture content | 4 | 0.1–0.26 % |

## 9 Sources

281 documents from 41 publishers (240 data sheets, 35 product pages and guides, 2 safety data sheets and 4 others),
read 10 Sep–5 Oct 2026. Every value links to its document and page on the records page.

| Publisher | Documents | Values | Products |
|---|---|---|---|
| Spectrum | 30 | 146 | 22 |
| eSUN | 25 | 202 | 21 |
| Polymaker | 22 | 371 | 13 |
| … and 38 more | | | |

[Every record behind this page →] · [How the numbers are worked out →]

---

Data-sheet values describe test specimens, not design allowables. Confirm the exact product, its conditioning and your
part's geometry with your own print.

Summary drafted by Claude Sonnet, revised by Claude Opus (AI agents), 17 Oct 2026; not yet reviewed. · Data: release
ee8eb64a0259, documents read 10 Sep–5 Oct 2026. · Cite as: PLA. Filament Atlas, release ee8eb64a0259.

<!-- No section 9 Estimated values: every tile is ranked. -->
