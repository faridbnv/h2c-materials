# PCTG-GF: the page as it would read

> **Current** (2026-10-17). Proposed full text of PCTG-GF's page (M110, 3 products, the thinnest), by the rules in
> PROPOSAL.md, its thin-page rules above all. Every number is taken from the current page (release ee8eb64a0259) or
> `dist/db.json`; comments name the field where it is not obvious.

---

Materials › Copolyesters

# PCTG-GF

*Glycol-Modified Polycyclohexylenedimethylene Terephthalate (Glass fibre)*

Glass-fibre-filled PCTG copolyester · 3 products from 3 makers · **Unlisted, within H2C temperatures**

Not on Bambu Lab's list; its published process temperatures are within the H2C's.

PCTG-GF is a glass-fibre-filled PCTG copolyester. One maker sells it for tooling, equipment and manufacturing aids,
and its makers stress low shrinkage. Its HDT is 78 °C at 0.45 MPa and 68 °C at 1.8 MPa. On the H2C it needs no heated
chamber, but makers call for a ruby or hardened steel nozzle, and the sheets ask for drying before printing.

<sub>Draft summary, not yet reviewed.</sub>
<!-- as written: "{name} is a glass-fibre-filled PCTG copolyester. One maker sells it for tooling, equipment and
manufacturing aids, and its makers stress low shrinkage. Its HDT is {hdt045.median} at 0.45 MPa and {hdt18.median} at
1.8 MPa. On the H2C it needs no heated chamber, but makers call for a ruby or hardened steel nozzle, and the sheets ask
for drying before printing." 62 words. Claims: FormFutura Good for; low shrinkage from all three makers' statements;
chamber not-required on all three; hardened from FormFutura and Spectrum; drying gate "required". -->

| Tensile strength (XY) | Tensile strength (Z) | Tensile modulus (XY) | HDT at 0.45 MPa |
|---|---|---|---|
| *55 MPa* | not published | *3.4 GPa* | **78 °C** |
| as published · orientation not stated · 3 products | | as published · orientation not stated · one product | 3 products · 76–78 |

| HDT at 1.8 MPa | Notched Charpy | Nozzle | Bed |
|---|---|---|---|
| **68 °C** | not published | **250–270 °C** | **90–110 °C** |
| 3 products · 64–68 | unnotched values only | all 3 products | one product; two give at least 50 °C |

**Thinly documented:** three products, with values from two data sheets: Spectrum's, which FormFutura AthenaX GF10
shares, and Fiberlogy's. Neither sheet states how its tensile bars were printed, so tensile values are shown as
published and are not ranked against other materials. Read each figure as one or two sheets' word.
<!-- evidenceTier: products ≤ 3; summary.*.twins; asPublished on the tensile tiles -->

Glass fibre adds little to PCTG's heat resistance: PCTG-GF's HDT at 0.45 MPa is 78 °C against PCTG's 76 °C, level with
PETG-GF.

| Median (products) | PCTG-GF | PCTG | PETG-GF |
|---|---|---|---|
| HDT at 0.45 MPa, °C | 78 (3) | 76 (6) | 78 (2) |
| HDT at 1.8 MPa, °C | 68 (3) | 64 (6) | not published |
| Glass transition, °C | 88 (1) | 84 (7) | 75 (3) |
| Tensile strength (XY), MPa | *55 as published* | 45 (1) | 45 (3) |
| Density, kg/m³ | 1,310 (3) | 1,230 (7) | 1,330 (5) |
| Price, CAD/kg | 165 (1) | 48 (1) | 37 (1) |

<!-- neighboursOf: unfilled base PCTG (M088, paged), then the same filler in the same polymer group (polymers[].group
"copolyester") with the most products, PETG-GF (M025). No ratio is made where a side rests on one product. -->

[Check PCTG-GF's products against your requirements in the selector →]

---

## 1 Among the materials

PCTG-GF has a high density and a high price among the materials: both are in the top quarter of the 147 and 108
materials that publish them. Its HDT and glass transition sit in the middle half.

[Figure 1: where each median sits among every material's — *PCTG-GF among the materials: high density and high price,
mid-range HDT* — Each row places PCTG-GF's products on the spread of every material's median, lowest to highest. PLA,
PETG and ABS are marked for reference. Below the rows: "Not ranked: tensile strength and modulus (orientation not
stated). Not published: tensile strength (Z), notched Charpy and Izod."]

## 2 Mechanical properties

As published, a PCTG-GF bar yields at 55 MPa and breaks at 25 MPa after 8 % elongation; Fiberlogy gives a modulus of
3.4 GPa. Both sheets publish only unnotched impact.

| What each sheet publishes | Spectrum PCTG GF10 (and FormFutura AthenaX GF10) | Fiberlogy PCTG+GF10 |
|---|---|---|
| Tensile strength at yield | 55 MPa | 55 MPa |
| Tensile strength at break | 25 MPa | 25 MPa |
| Tensile modulus | not published | 3.4 GPa |
| Elongation at break | 8 % | 8 % |
| Impact, unnotched, 23 °C | 45 kJ/m², labelled Izod, standard ISO 179-1eU: test unclear | 60 kJ/m², Izod, ISO 180 |
| Conditions | ISO 527; specimen and orientation not stated | ISO 527; specimen and orientation not stated |

<!-- thin rule: no figure under 4 ranked products; productRows + conditionLine; measurements V002928–V002931,
V010859–V010863 -->

## 3 Thermal properties

The two sheets put HDT at 76–78 °C under 0.45 MPa and 64–68 °C under 1.8 MPa, below the 88 °C glass transition
Fiberlogy gives.

| | HDT at 0.45 MPa | HDT at 1.8 MPa | Glass transition | Vicat, as published |
|---|---|---|---|---|
| Spectrum PCTG GF10 (and FormFutura AthenaX GF10) | 78 °C | 68 °C | not published | 77 °C (data sheet); 89 °C (2024 portfolio) |
| Fiberlogy PCTG+GF10 | 76 °C, ISO 75 | 64 °C, ISO 75 | 88 °C, DSC | not published |

## 4 Printing on the H2C

PCTG-GF prints inside every H2C limit and needs no heated chamber, but the glass fibre wears a brass nozzle.
<!-- gates within; gates.abrasive requires-hardened; hardenedFactWords -->

| | Spectrum PCTG GF10 | FormFutura AthenaX GF10 | Fiberlogy PCTG+GF10 |
|---|---|---|---|
| Nozzle | 250–270 °C | *250–270 °C* | 250–270 °C |
| Bed | at least 50 °C | *at least 50 °C* | 90–110 °C |
| Heated chamber | none; no enclosure needed | none; no enclosure or heated chamber needed | none; no enclosure needed |
| Drying | *75 °C for 24 h* | 75 °C for 24 h | 60 °C for 4 h |
| Nozzle type | ruby or hardened | ruby or hardened steel | not stated |
| AMS | not stated | not stated | not stated |

In grey, a setting a product reads from the data sheet the two share.
<!-- ≤ 5 products: a column per product instead of "most products"; grades[].print.*, .from -->

**What makers say about printing it**

- *Moisture sensitivity*: "PCTG is moderately hygroscopic and therefore it is recommended to pre-dry the filament at
  75°C for approximately 24 hours before usage for optimal results." *FormFutura AthenaX GF10, data sheet, p. 2*.
  Spectrum's sheet: "Dry box not necessary." *p. 1*
- *Nozzle wear*: "We recommend to use ruby nozzles or hardened steel nozzles." *FormFutura AthenaX GF10, data sheet,
  p. 1*. "Ruby or hardened nozzle recommended" *Spectrum PCTG GF10, data sheet, p. 1*
- *Adhesion between layers*: "Thanks to its extremely high interlayer adhesion and low shrinkage, it allows even
  intermediate users to execute large prints." *Spectrum PCTG GF10, data sheet, p. 1*
- *Warping and shrinkage*: "Reducing shrinkage / warping" *FormFutura AthenaX GF10, data sheet, p. 1*

## 5 Products

Three products from three makers. FormFutura AthenaX GF10's values are read from the data sheet it shares with
Spectrum PCTG GF10.

**Fiberlogy PCTG+GF10** · 7 of 16 table values · 165 CAD/kg ¤
Tensile yield 55 MPa, break 25 MPa, modulus 3.4 GPa, elongation 8 % · unnotched Izod 60 kJ/m² · HDT 76 °C at
0.45 MPa, 64 °C at 1.8 MPa · Tg 88 °C · density 1,310 kg/m³.
Prints at 250–270 °C on a 90–110 °C bed, no chamber; dry at 60 °C for 4 h.
"it retains its key advantages: chemical resistance, low shrinkage, and ease of printing" *product page*
Price: Texas Filament Supply lists 0.75 kg at 87 USD, converted at the Bank of Canada rate of 29 Sep 2026; no Canadian
shop in the sample sells it. · [Its records →]

**Spectrum PCTG GF10** · 5 of 16 table values
Tensile yield 55 MPa, break 25 MPa, elongation 8 % · unnotched impact 45 kJ/m², test unclear · HDT 78 °C at 0.45 MPa,
68 °C at 1.8 MPa · Vicat 77 °C · density 1,310 kg/m³.
Prints at 250–270 °C on a bed of at least 50 °C, no chamber; ruby or hardened nozzle; dry at 75 °C for 24 h (from the
shared sheet).
"high dimensional accuracy of the printed elements"; "high surface quality after printing" *data sheet, p. 1*
Price: 3D Printing Canada lists it, out of stock when sampled, with no regular price recorded. · [Its records →]

**FormFutura AthenaX GF10** · 5 of 16 table values, from the shared sheet
Values as Spectrum PCTG GF10.
Prints at 250–270 °C on a bed of at least 50 °C (shared sheet); "No enclosure, or heated chamber needed."; ruby or
hardened steel nozzle; dry at 75 °C for 24 h.
"Masking layer lines with a matt surface finish in 3D printed objects" *data sheet, p. 1*
Price: not in the sample. · [Its records →]

<!-- ≤ 5 products: cards, open, in "most published" order; no search, toggles, stand-outs or "Show all" -->

## 6 Uses, limitations and chemicals

**What it is sold for**

- "Making tooling, equipment, and manufacturing aids." *FormFutura AthenaX GF10, data sheet, p. 1*
- "it retains its key advantages: chemical resistance, low shrinkage, and ease of printing" *Fiberlogy PCTG+GF10,
  product page*

No maker of these products states a limitation, and none publishes resistance to a named chemical or to sunlight.

## 7 Price

One product has a sampled price: Fiberlogy PCTG+GF10 at 165 CAD/kg, from Texas Filament Supply's listing in USD,
converted at the Bank of Canada rate of 29 Sep 2026. No Canadian shop in the sample sells it. 3D Printing Canada lists
Spectrum PCTG GF10, out of stock and with no regular price recorded.

Regular prices, never sale prices, sampled from 9 Canadian and 7 foreign shops between 10 Sep and 7 Oct 2026; shipping
and tax are not included.

## 8 Estimated values

No product publishes a tensile value that can be ranked, so the selector estimates them from the products' related
values and similar materials. An estimate is a range, never a product's value, and nothing above rests on it.

| Property | Likely | Plausible | Precision | Beside what is published |
|---|---|---|---|---|
| Tensile strength (XY) | 56–86 MPa | 55–102 MPa | good | the sheets' 55 MPa at yield sits at its low end |
| Elongation at break (XY) | 8–30 % | 8–59 % | fair | the sheets give 8 % |
| Tensile modulus (XY) | 1.6–4.5 GPa | 1.2–6.0 GPa | poor: an order of magnitude only | Fiberlogy gives 3.4 GPa |

<details><summary>What likely and plausible mean</summary>
Tested against known values, a likely range held the true value 8 times in 10 and a plausible range 19 times in 20.
</details>

## 9 Sources

8 documents from 4 publishers (4 data sheets, 3 product pages and portfolios, and Bambu Lab's H2C documentation), read
10 Sep–1 Oct 2026. Every value links to its document and page on the records page.

| Publisher | Documents | Values | Products |
|---|---|---|---|
| Fiberlogy | 3 | 10 | 1 |
| Spectrum | 3 | 10 | 1 |
| FormFutura | 1 | 0 | 1 |
| Bambu Lab | 1 | 0 | 3 |

[Every record behind this page →] · [How the numbers are worked out →]

<!-- No "Known gaps": its gap findings are the seven unpublished properties (shown nowhere, by rule), the Canadian price
(said in Price) and the H2C status's citation (a maintainer's matter, on the records page). No "Other properties":
Vicat is in Thermal and density in the first screen. -->

---

Data-sheet values describe test specimens, not design allowables. Confirm the exact product, its conditioning and your
part's geometry with your own print.

Summary drafted by Claude Sonnet, revised by Claude Opus (AI agents), 17 Oct 2026; not yet reviewed. · Data: release
ee8eb64a0259, documents read 10 Sep–1 Oct 2026. · Cite as: PCTG-GF. Filament Atlas, release ee8eb64a0259.
