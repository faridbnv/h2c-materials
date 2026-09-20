# Eight polymers with no row in `polymers.csv`

Research record, 2026-09-19. Eight polymers appear in filament data sheets already in the corpus and have no
row in `data/tables/polymers.csv`, so no material can name them as its Estimate identity and their products
are stuck: **PHA**, **SAN**, **TPS**, **COC**, **PBT**, **PVC**, **LCP**, **PBAT**.

Every document below was fetched with the repository's own fetcher, so the bytes are cached under
`.cache/sources/by-sha/<sha>.{pdf,html}`. Access date for all of them: **2026-09-19**.

Nothing here is data yet. No table was edited, no ledger row touched, no migration run. The proposed column
values and `sources.csv` rows are written out so the owner can review them before anything is applied.

The specification each row must meet is `schema/tables/polymers.schema.json`: `Morphology` is one of
*amorphous / semicrystalline / elastomer*; `Melting point °C` is a number or *Not applicable*; `As printed` is
one of *crystallises while printing / prints amorphous / prints amorphous unless fibre-filled / crystallises,
not driven by its melting point*, or *Not applicable*; `Water uptake` is *high* or *low*, or *Not applicable*;
the two density columns are numbers in kg/m³ or *Not recorded*.

---

## Summary

| # | Polymer | Settled? | The one thing an owner must decide |
|---|---|---|---|
| 1 | PHA | **No — the family will not fit one row** | Whether PHA becomes two or more identities (semicrystalline PHA and amorphous PHA at least), or one row for the semicrystalline PHA the filaments actually are |
| 2 | SAN | **Yes** | Whether a min = max density range (1080–1080) is acceptable, since every producer grade publishes 1.08 g/cm³ |
| 3 | TPS | **Yes, but it may not need a row** | Whether "TPS" is its own identity or maps to the existing `TPE` row — **it is *thermoplastic styrene block copolymer*, not thermoplastic starch** |
| 4 | COC | **Yes** | Whether purefil "COC flex" (0.94 g/cm³, Tg < −90 °C) is a COC grade at all, or needs a Variant |
| 5 | PBT | **Yes** | `Water uptake`: *Not applicable* (recommended) or *low* on the PPE-PS precedent |
| 6 | PVC | **No — density is not sourceable, and the product is plasticised** | Whether neat density stays *Not recorded*, and whether plasticised PVC needs a new `grade-variants` value |
| 7 | LCP | **Mostly** | `As printed`: *crystallises, not driven by its melting point* is proposed but no document proves it for a print |
| 8 | PBAT | **Yes** | The single melting point to write for BASF's published 110–120 °C range |

---

## A note that changes one of the eight: TPS is not thermoplastic starch

The brief asked for a Novamont or BioLogiQ reference for TPS as *thermoplastic starch*. The corpus does not
mean that. Both TPS documents already inventoried say so in their own words:

**BASF Forward AM, *Ultrafuse TPS 90A*, v1.1, 30.12.2020** (`f0a4d75b0ff814870ff8938cea14b598a14f369c240c4418b02580ddb0542b2f`, p. 1):

> Components: **Styrene-Ethylene-Butadiene-Styrene (SEBS) based filament** for Fused Filament Fabrication.
> Ultrafuse® TPS 90A is an elastomer based on the raw material SEBS.

**purefil, *material data sheet TPS 40D*** (`816a9fd4471262799ca36c78a629e6e783d48cdb96c56835c7b9777235e99371`, p. 1):

> **Thermoplastic styrene block copolymer elastomer (TPS)** … In FDM 3D printing, TPE-S convinces with its good
> adhesion to other plastics, especially on other styrene-based plastics

This is the ISO 18064 code: TPS = styrenic thermoplastic elastomer. Section 3 below is written for that
polymer. If a thermoplastic-starch product turns up later it is a different identity and needs its own row.

---

## 1. PHA — polyhydroxyalkanoate

### Why it matters

Six products: colorFabb **allPHA** (`9da118e98c85085c…`, maker copy; `6926f7d5a66de49c…`, 3DJake copy), colorFabb
**PLA-PHA** (`d9edb7dbfbf74ffd…`), NinjaTek's colorFabb **PLA/PHA** and **glowFill** sheets
(`d92bf0040ab556fb…`, `a79e85a7e196d2b4…`), and colorFabb's woodFill family, which is a PLA/PHA base.

### Documents fetched

| # | Document | URL | SHA-256 |
|---|---|---|---|
| A | Kaneka, *KANEKA Biodegradable Polymer Green Planet™ — Polymers for a sustainable future* (range brochure, undated) | https://kaneka.be/sites/default/files/uploads/brochures/Green_Planet_Brochure.pdf | `ad71c8846bc8db80d51e628dd388de0806236bfed47153f0bb68a303a6cd197e` |
| B | CJ Biomaterials, *PHACT™ A1000P* technical datasheet, TDS updated 02/2024 | https://cjbiomaterials.com/wp-content/uploads/2024/03/CJBMS-TDS-A1000P.pdf | `ccdaf20622fe2834d71e965bbed4ec1553b321197ec987c40b6946dee240d684` |
| C | CJ Biomaterials, *PHACT™ S1000P* technical datasheet, TDS updated 3/2024 | https://cjbiomaterials.com/wp-content/uploads/2024/03/CJBMS-TDS-S1000P.pdf | `55d91f776dcbc6dd569180cf703a6449b146e3f4df094eb24bc16140e1a6f92d` |
| D | CJ Biomaterials, *TECHNICAL DATASHEET MA1250P* (aPHA/PLA masterbatch) | https://cjbiomaterials.com/wp-content/uploads/2023/10/MA1250P-TDS.pdf | `2f2ca48614329ee03e0a4558c85f0fec18dca80311751c4b59c6615bbe0ec935` |

### Exact quoted lines

**A — Kaneka, p. 2:**

> Green Planet™ is a random copolymer of poly(3-Hydroxybutyrate) (3HB) and 3-Hydroxyhexanoate (3HH). It belongs
> to the versatile class of PHA biopolymers. **By changing the ratio between 3HB and 3HH, the properties of the
> material can be tailored to fit any application.**

**A — p. 5, "Mechanical / Physical / Thermal Properties", column "Typical Values / Behavior\*":**

> **Density ~1.20 g/cm³**
> **Melting point ~ 123–145 °C**
> Elongation at break 10%-300%
> Modulus 500-2500
> Thermal resistance / heat distortion 80-110 °C
> \* Note: The values depend significantly on the grade (rigid vs. flexible), thickness, additives, and other factors.

**B — CJ Biomaterials, PHACT A1000P, p. 1:**

> PHACT A1000P is an environment-friendly **amorphous** biopolymer.
> **Specific Gravity — D792 — 1.23**
> Hardness — Shore A D2240 — Max < 80
> Tensile Strength at Break — MPa D638 — < 2.2
> Elongation at Break — % D638 — 500 <
> **Glass Transition Temperature — ℃ D3418 — −17 ~ −14**

(there is no melting-point row on this sheet at all)

**C — CJ Biomaterials, PHACT S1000P, p. 1:**

> PHACT S1000P is an environment-friendly **semi-crystalline** biopolymer.
> **Specific Gravity — D792 — 1.23**
> Hardness (Max) — Shore D D2240 — < 90
> Heat Deflection Temperature / 0.455 MPa — ℃ D648 — 130 <
> **Melting Point — ℃ D3418 — 150 ~ 170**
> **Glass Transition Temperature — ℃ D3418 — −6 ~ 0**

### Why one row cannot describe PHA

Three documents from two producers, for polymers all correctly called PHA:

| Reference | Morphology it declares | Melting point | Tg | Density |
|---|---|---|---|---|
| CJ PHACT A1000P | **amorphous** | none published | −17 to −14 °C | 1.23 |
| Kaneka Green Planet PHBH | (melting point published) | 123–145 °C | — | ~1.20 |
| CJ PHACT S1000P | **semi-crystalline** | 150–170 °C | −6 to 0 °C | 1.23 |

One identity would have to be amorphous and semicrystalline at once, and its `Melting point °C` would have to
be both *Not applicable* and a number. The model reads morphology to decide how reinforcement acts and reads
the melting point to cap heat deflection; a single averaged row would be wrong for every product that used it.

**What the database would need instead.** Two identities, on the producers' own words:

- `PHA-SC` (semi-crystalline PHA) — the one the filaments in this corpus actually are.
- `PHA-A` (amorphous PHA) — CJ's A1000P class, which is an elastomer by every number on its sheet
  (Shore A < 80, elongation > 500 %, no Tm). It would be `Group` *aliphatic polyester*, `Morphology`
  *elastomer*, everything else *Not applicable*, density 1230–1230.

A cheaper alternative, if the owner does not want two rows yet: write **`PHA-SC` only** and leave amorphous PHA
out until a product needs it. Nothing in the corpus is an amorphous PHA today.

**Which one allPHA is.** colorFabb's allPHA sheet (`9da118e98c85085c…`, p. 1) publishes `Heat Deflection Temp.
HDT-B, ISO 75 — 130 ˚C` and leaves Density, Glass Transition Temp. and Melting Temp. as `N/A`. CJ's S1000P
publishes `Heat Deflection Temperature / 0.455 MPa — 130 <`. That is the semicrystalline class, and not the
amorphous one, whose Tg is below room temperature. This is corroboration for the classification, not a
transcribed value.

### Proposed row — `PHA-SC` (semi-crystalline PHA)

| Column | Value |
|---|---|
| PolymerID | `PHA-SC` |
| Group | `aliphatic polyester` |
| Morphology | `semicrystalline` |
| Melting point °C | `160` |
| As printed | `crystallises while printing` |
| Water uptake | `Not applicable` |
| Neat density min kg/m³ | `1200` |
| Neat density max kg/m³ | `1230` |
| SourceID | `R-CJBIO-PHACT-S1000P-TDS` |
| Basis | see below |

**Basis sentence:**

> CJ Biomaterials PHACT™ S1000P, the neat semi-crystalline PHA resin: "an environment-friendly semi-crystalline
> biopolymer" with a DSC melting point of 150–170 °C, a glass transition of −6 to 0 °C, a specific gravity of
> 1.23 (ASTM D792) and a heat deflection temperature above 130 °C at 0.455 MPa (TDS updated 3/2024, p. 1). The
> melting point recorded is the midpoint of that range. The low end of the density range is Kaneka's Green
> Planet™ PHBH brochure, which gives ~1.20 g/cm³ and a melting point of ~123–145 °C for its 3HB/3HH copolymer
> and says plainly that "the values depend significantly on the grade" (p. 5). PHA is a family of copolymers,
> not one polymer: CJ's PHACT™ A1000P, the same producer's amorphous grade, publishes no melting point at all
> and a glass transition of −17 to −14 °C, and is a separate identity. Water uptake is Not applicable: no PHA
> reference here publishes a conditioned-against-dry pair, so a conditioned value would read as dry. It
> crystallises while printing on the strength of colorFabb's allPHA sheet, whose printed HDT-B of 130 °C matches
> S1000P's moulded 130 °C at 0.455 MPa; no document states this for a print, and a printed-against-annealed pair
> for a PHA filament would settle it.

**"As printed" is not proved.** `crystallises while printing` is the proposal, and the reason is the HDT match
above, not a resin statement. The alternative is `prints amorphous`; what would settle it is one PHA filament
publishing an as-printed and an annealed HDT, the way D56 settled PET and PPA.

### `sources.csv` rows

```csv
R-CJBIO-PHACT-S1000P-TDS,CJ Biomaterials Inc.,PHACT™ S1000P,TDS updated 3/2024,Not published,2026-09-19,Resin supplier data sheet,"CJ Biomaterials' own data sheet for its neat semi-crystalline PHA resin.",cited,https://cjbiomaterials.com/wp-content/uploads/2024/03/CJBMS-TDS-S1000P.pdf,p. 1: PROPERTIES OF PHACT S1000P,Polymer identity of semi-crystalline PHA (polymers.csv),retrieved,Not applicable,55d91f776dcbc6dd569180cf703a6449b146e3f4df094eb24bc16140e1a6f92d
R-CJBIO-PHACT-A1000P-TDS,CJ Biomaterials Inc.,PHACT™ A1000P,TDS updated 02/2024,Not published,2026-09-19,Resin supplier data sheet,"The same producer's amorphous PHA grade; it publishes no melting point, which is why PHA cannot be one polymer row.",corroboration,https://cjbiomaterials.com/wp-content/uploads/2024/03/CJBMS-TDS-A1000P.pdf,p. 1: PROPERTIES OF PHACT A1000P,Not applicable,retrieved,Not applicable,ccdaf20622fe2834d71e965bbed4ec1553b321197ec987c40b6946dee240d684
R-KANEKA-GREEN-PLANET-BROCHURE,Kaneka Corporation,Kaneka Biodegradable Polymer Green Planet™ — Polymers for a sustainable future,Not published,Not published,2026-09-19,Manufacturer product page or guide,"Range brochure for Kaneka's PHBH; gives the low end of the neat density range and the PHBH melting range, and says the values depend on the grade.",cited,https://kaneka.be/sites/default/files/uploads/brochures/Green_Planet_Brochure.pdf,"p. 2: structure; p. 5: Mechanical / Physical / Thermal Properties",Polymer identity of semi-crystalline PHA (polymers.csv),retrieved,"Kaneka Europe Holding Company NV copy, hashed as fetched; the brochure carries no date or revision.",ad71c8846bc8db80d51e628dd388de0806236bfed47153f0bb68a303a6cd197e
```

---

## 2. SAN — styrene-acrylonitrile

### Why it matters

purefil **SAN filament**, EN and DE editions (`b51d5846db4b3396…`, `7670355855de3fea…`).

### Documents fetched

| # | Document | URL | SHA-256 |
|---|---|---|---|
| A | Trinseo, *Technical Information — TYRIL™ 790 SAN Resin*, Form No. 500-00031941en | https://alpha-plast.com.ua/wp-content/docs/Trinseo-Styron/TDS_Tyril%20790.pdf | `ebfe1ec3e1d0ba5b723908ec1a5ff55ad54527d56216a680c2b3fa4773fc13c5` |
| B | INEOS Styrolution Group GmbH, *Luran® 368R — Styrene Acrylonitrile*, Form No. TDS-14144-en | https://upmold.com/wp-content/uploads/data-sheet/SAN-Luran-368R.pdf | `38cc1e16e22ab4a3f38f65f63174a4bf2a574a80e3b190bdcca2b4ed12983e9a` |
| C | INEOS Styrolution, *LUSTRAN® SAN Product Guide*, 3/16/2023 | https://s3.amazonaws.com/static.entecpolymers.com/v3/uploads/content/INEOS-Styrolution-Lustran-SAN-Product-Guide_2023-03-17-131856_xiaa.pdf | `547b22e5b5a1d46ddc6173bb1e0310dfed575c2b314373e732f71fcabbbd9621` |

### Exact quoted lines

**A — Trinseo, TYRIL 790, p. 1:**

> TYRIL\* styrene-acrylonitrile (SAN) resins are designed by Styron to offer superior chemical resistance,
> strength, hardness and dimensional stability in a broad range of product applications.
> **Density — 1.08 g/cm³ — ASTM D792 / ISO 1183/B**
> Tensile Modulus — 3800 MPa — ASTM D638 / ISO 527-2
> Deflection Temperature Under Load, 264 psi (1.8 MPa), Annealed — **101 °C** — ASTM D648 / ISO 75-2/A
> Vicat Softening Temperature — **101 °C** — ASTM D1525

**B — INEOS Styrolution, Luran 368R, pp. 1–2:**

> Luran® 368R is a general purpose grade of SAN with well-balanced properties, suitable for injection molding
> and extrusion.
> **Density — 1.08 g/cm³ — ISO 1183**
> **Water Absorption — ISO 62 — Equilibrium, 73°F (23°C), 50% RH — 0.20 %**
> Heat Deflection Temperature — 264 psi (1.8 MPa), Annealed — **88.0 °C** — ISO 75-2/A
> Vicat Softening Temperature — **106 °C** — ISO 306/B50

**C — INEOS Styrolution, Lustran SAN Product Guide, p. 3** (ten grades side by side: 29, 31, 51, SPARKLE, DN20, DN50, DN59, DN77, DN79, DN88):

> **Density — ASTM D 792 — g/cm³ — 1.08 1.08 1.08 1.08 1.08 1.08 1.08 1.08 1.08 1.08**

### Proposed row

| Column | Value |
|---|---|
| PolymerID | `SAN` |
| Group | `styrenic` |
| Morphology | `amorphous` |
| Melting point °C | `Not applicable` |
| As printed | `Not applicable` |
| Water uptake | `Not applicable` |
| Neat density min kg/m³ | `1080` |
| Neat density max kg/m³ | `1080` |
| SourceID | `R-TRINSEO-TYRIL-790-TI` |

**Basis sentence:**

> Trinseo TYRIL™ 790, an unfilled SAN resin: density 1.08 g/cm³ (ASTM D792, ISO 1183/B), a deflection
> temperature of 101 °C at 1.8 MPa annealed and a Vicat of 101 °C, with no melting point published, which is
> what an amorphous polymer has (Technical Information, Form No. 500-00031941en, p. 1). INEOS Styrolution's
> Luran® 368R gives the same 1.08 g/cm³ to ISO 1183 with a Vicat of 106 °C, and its Lustran® SAN Product Guide
> prints 1.08 g/cm³ for all ten grades it lists, so the range has no width to give: every producer grade
> publishes one figure. Melting point and As printed are Not applicable because SAN is amorphous. Water uptake
> is Not applicable: Luran 368R's 0.20 % equilibrium uptake at 23 °C / 50 % RH is published without a
> conditioned-against-dry modulus pair, so nothing supports a conversion class, and a conditioned value reads as
> dry.

**Grade, not polymer.** All three references are unfilled general-purpose grades, so nothing here is borrowed
from a filled or impact-modified sheet. Note that impact-modified SAN is ABS and already has its own row.

**The min = max question.** 1080–1080 is honest and is what every producer publishes; the existing `ABS` row
(1000–1110) got its width from handbooks, which is the practice D35 is meant to stop. purefil's own SAN
filament gives 1.08 g/cm³ (ISO 1183) too. If the owner wants width from evidence rather than from a handbook,
the PPE-PS precedent allows taking the upper end from a filament maker — but here the filament agrees exactly,
so there is nothing to take.

### `sources.csv` rows

```csv
R-TRINSEO-TYRIL-790-TI,Trinseo,Technical Information TYRIL™ 790 SAN Resin,Form No. 500-00031941en,Not published,2026-09-19,Resin supplier data sheet,Trinseo's own technical information sheet for an unfilled general-purpose SAN resin.,cited,https://alpha-plast.com.ua/wp-content/docs/Trinseo-Styron/TDS_Tyril%20790.pdf,p. 1: Physical / Thermal,Polymer identity of SAN (polymers.csv),retrieved,Manufacturer copy not reachable; document mirrored by alpha-plast.com.ua and hashed as fetched.,ebfe1ec3e1d0ba5b723908ec1a5ff55ad54527d56216a680c2b3fa4773fc13c5
R-INEOS-LURAN-368R-TDS,INEOS Styrolution Group GmbH,Luran® 368R — Styrene Acrylonitrile,Form No. TDS-14144-en,Not published,2026-09-19,Resin supplier data sheet,"Confirms the 1.08 g/cm³ density to ISO 1183 and gives the equilibrium water uptake; no value is transcribed from it.",corroboration,https://upmold.com/wp-content/uploads/data-sheet/SAN-Luran-368R.pdf,"p. 1: Physical; p. 2: Thermal",Not applicable,retrieved,"Manufacturer copy not reachable; the sheet is the producer's data served through UL Prospector and mirrored by upmold.com, hashed as fetched.",38cc1e16e22ab4a3f38f65f63174a4bf2a574a80e3b190bdcca2b4ed12983e9a
R-INEOS-LUSTRAN-SAN-GUIDE,INEOS Styrolution,INEOS Styrolution | LUSTRAN® SAN Product Guide,Not published,2023-03-16,2026-09-19,Manufacturer product page or guide,"Ten SAN grades side by side, all at 1.08 g/cm³, which is why the density range has no width; no value is transcribed from it.",corroboration,https://s3.amazonaws.com/static.entecpolymers.com/v3/uploads/content/INEOS-Styrolution-Lustran-SAN-Product-Guide_2023-03-17-131856_xiaa.pdf,p. 3: property table,Not applicable,retrieved,Manufacturer copy not reachable; document mirrored by Entec Polymers and hashed as fetched.,547b22e5b5a1d46ddc6173bb1e0310dfed575c2b314373e732f71fcabbbd9621
```

---

## 3. TPS — thermoplastic styrene block copolymer elastomer

### Why it matters

BASF Forward AM **Ultrafuse TPS 90A** (`f0a4d75b0ff81487…`) and purefil **TPS 40D** (`816a9fd447126279…`, plus a
second purefil listing whose document is a TPV 98A sheet, `0d7409be7fc659cf` / `35d64426d3c54f2f…` — a ledger
mismatch, not this file's business).

**Read the note above first: TPS here is a styrenic TPE, not thermoplastic starch.** Novamont and BioLogiQ are
the wrong producers for this row.

### Documents fetched

| # | Document | URL | SHA-256 |
|---|---|---|---|
| A | Kraton Polymers LLC, *KRATON® G-1657* data sheet, dated Tuesday, July 15, 2008 | https://www.talasonline.com/images/PDF/ProductDataSheet/Kraton_G1657_datasheet.pdf | `1b7c1e7435bf53a404b48fa72d2491011ed744f3383c4560f17dee5ac39b07ee` |
| B | Avient, *Technical Data Sheet — Versaflex™ HC 2110-57B Thermoplastic Elastomer* | https://protoshopinc.com/wp-content/uploads/Avient-Versaflex-TPE-HC-2110-57B.pdf | `95e4820feead1953ed5d1da47a479d1a765c0f88fc92e96f29a3763a40ae2a1f` |

### Exact quoted lines

**A — Kraton G-1657, p. 1:**

> Kraton Polymers LLC - **Styrene Ethylene Butylene Styrene Block Copolymer**
> KRATON® G1657 is a clear, linear triblock copolymer based on styrene and ethylene/butylene, with a
> polystyrene content of 13%. … It can also be used as a major formulating ingredient in **elastomeric
> compounds** or as an impact modifier in various plastics and polyolefins.
> **Specific Gravity — 0.890 (English) / 0.888 (SI) — ASTM D792**
> Durometer Hardness (Shore A) — 47 — ASTM D2240
> Elongation at Yield — 750 % — ASTM D412

(no melting point and no glass transition are published; a block copolymer TPE has neither as a single figure)

**B — Avient Versaflex HC 2110-57B, p. 1:**

> Versaflex™ HC 2110-57B is a TPE designed for use in the healthcare industry…
> **Density / Specific Gravity — 1.01 — ASTM D792**

**What the filaments themselves publish**, for the range: Ultrafuse TPS 90A **1044 kg/m³** printed part density
(ISO 1183-1) with a glass transition of −59 °C and a "Melting Temperature" of 242–249 °C (ISO 11357-3, which
for an SEBS compound is the polystyrene-domain / processing endotherm, not a crystalline melt); purefil TPS 40D
**1.22 g/cm³** (ISO 1183 1A).

### Proposed row — and the prior question

**Does TPS need a row at all?** `polymers.csv` already carries `TPE` (elastomer / elastomer / Not applicable ×3
/ 850–1250 kg/m³), which covers both filaments exactly. A `TPS` row would differ from it in nothing the schema
can express: same group, same morphology, no melting point, no water uptake, and a density range inside TPE's.
The honest recommendation is **map both products to `TPE`** and write no new row.

If the owner wants TPS separate anyway — because "TPS" is a maker's own word and a separate identity keeps the
estimate model's styrenic-TPE offset from being pulled by polyester and polyether TPEs — then:

| Column | Value |
|---|---|
| PolymerID | `TPS` |
| Group | `elastomer` |
| Morphology | `elastomer` |
| Melting point °C | `Not applicable` |
| As printed | `Not applicable` |
| Water uptake | `Not applicable` |
| Neat density min kg/m³ | `890` |
| Neat density max kg/m³ | `1010` |
| SourceID | `R-KRATON-G1657-TDS` |

**Basis sentence:**

> Kraton® G1657, the neat styrene-ethylene-butylene-styrene block copolymer: "a clear, linear triblock copolymer
> based on styrene and ethylene/butylene, with a polystyrene content of 13%", used "as a major formulating
> ingredient in elastomeric compounds", specific gravity 0.890 (ASTM D792), Shore A 47, elongation at yield
> 750 % (data sheet of 15 July 2008, p. 1). It publishes no melting point and no glass transition, which is what
> a block-copolymer elastomer has, so Melting point and As printed are Not applicable; Water uptake is Not
> applicable because no reference publishes a conditioned-against-dry pair, and BASF's own Ultrafuse TPS 90A
> sheet says the material "shows a reduced moisture uptake, which allows for printing without pre-drying". The
> upper end of the density range is Avient's Versaflex™ HC 2110-57B, a compounded SEBS-family TPE at 1.01 g/cm³
> (ASTM D792). **A commercial TPS filament is a compound, not the neat block copolymer**: purefil's TPS 40D
> publishes 1.22 g/cm³ and BASF's Ultrafuse TPS 90A a printed 1044 kg/m³, both above this range because oil and
> filler are in them, so either product would need a grade Variant. This is why the existing TPE row, whose
> 850–1250 kg/m³ range already spans compounded elastomers, may be the better home for both products.

**A caveat on the references.** Kraton's sheet is the producer's data served through IDES/UL and mirrored by
talasonline.com; Avient's sheet is Avient's own, mirrored by protoshopinc.com. Neither says "TPS" or the
ISO 18064 code; both describe the chemistry (SEBS, TPE) that the filament sheets name. Avient's sheet does not
say SEBS on its face, so it corroborates the compound density only.

### `sources.csv` rows

```csv
R-KRATON-G1657-TDS,Kraton Polymers LLC,KRATON® G-1657,Not published,2008-07-15,2026-09-19,Resin supplier data sheet,"Kraton's own data for the neat SEBS block copolymer that the TPS filaments are compounded from.",cited,https://www.talasonline.com/images/PDF/ProductDataSheet/Kraton_G1657_datasheet.pdf,p. 1: ASTM and ISO Properties,Polymer identity of the styrenic thermoplastic elastomer (polymers.csv),retrieved,"Manufacturer copy not reachable; the producer's data served through IDES and mirrored by talasonline.com, hashed as fetched.",1b7c1e7435bf53a404b48fa72d2491011ed744f3383c4560f17dee5ac39b07ee
R-AVIENT-VERSAFLEX-HC2110-TDS,Avient Corporation,Technical Data Sheet Versaflex™ HC 2110-57B Thermoplastic Elastomer,Not published,Not published,2026-09-19,Resin supplier data sheet,"A compounded styrenic-family TPE, giving the upper end of the density range; the sheet does not itself name SEBS.",cited,https://protoshopinc.com/wp-content/uploads/Avient-Versaflex-TPE-HC-2110-57B.pdf,p. 1: Physical,Polymer identity of the styrenic thermoplastic elastomer (polymers.csv),retrieved,Manufacturer copy not reachable; document mirrored by protoshopinc.com and hashed as fetched.,95e4820feead1953ed5d1da47a479d1a765c0f88fc92e96f29a3763a40ae2a1f
```

---

## 4. COC — cyclic olefin copolymer

### Why it matters

purefil **COC tough** (`bf6b8ec56488b835…`) and purefil **COC flex** (`ee41623d140aaa06…`, DE twin `02d328353dbdc01f…`).

### Documents fetched

| # | Document | URL | SHA-256 |
|---|---|---|---|
| A | TOPAS Advanced Polymers GmbH, *TECHNICAL DATA SHEET — TOPAS® 8007S-04 Cyclic Olefin Copolymer (COC)*, Rev.: 01.07.2019 | https://topas.com/wp-content/uploads/2023/05/TDS_8007S_04_e.pdf | `d889dd84b1c70dd8b6929a983c2932c7e3b0f1b5ecbac163bc870d7ddce5881d` |
| B | TOPAS Advanced Polymers GmbH, *TOPAS® COC Cyclic Olefin Copolymer* (range brochure), published September 2019 | https://topas.com/wp-content/uploads/2023/05/TOPAS_Product-Brochure.pdf | `f60c785c6629ce832a2e40d1ebe0f60724ec694f4e232e506d1a82c6de64c884` |

### Exact quoted lines

**A — TOPAS 8007S-04 TDS, p. 1:**

> Injection molding grade with high moisture barrier specially manufactured for healthcare applications and
> pharmaceutical packaging
> **Density — 1010 — kg/m³ — ISO 1183**
> **Water absorption (23°C-sat) — 0,01 — % — ISO 62**
> **Glass transition temperature (10°C/min) — 78 — °C — ISO 11357-1,-2,-3**
> DTUL @ 0.45 MPa — 75 °C — ISO 75-1, -2
> Vicat softening temperature B50 (50°C/h 50N) — 80 °C — ISO 306

(no melting point row exists on the sheet)

**B — TOPAS brochure, p. 4:**

> TOPAS® COC is the trade name for Topas Advanced Polymers' cyclic olefin copolymers (COC). The TOPAS® COC
> family, **in contrast to the partially crystalline polyolefins PE and PP, consists of amorphous, transparent
> copolymers** based on cyclic olefins and linear olefins.

**B — p. 5:**

> Currently available basic grades differ primarily in their heat deflection temperature HDT/B. **The heat
> deflection temperature is determined by the ratio of the comonomers.** TOPAS® COC grades with higher
> cyclo-olefin content have higher heat resistance.

**B — p. 7, Table 1 "Physical properties of TOPAS® COC" (columns 8007 | 6013 | 6015 | 5013 | 6017):**

> **Density — g/cm³ — ISO 1183 — 1.02 1.02 1.02 1.02 1.02**
> Water absorption (24 h immersion in water at 23 °C) — % — ISO 62 — < 0.01 < 0.01 < 0.01 < 0.01 < 0.01
> Heat deflection temperature HDT/B (0.45 MPa) — °C — ISO 75 parts 1 and 2 — 75 130 150 130 170

### Proposed row

| Column | Value |
|---|---|
| PolymerID | `COC` |
| Group | `cyclic polyolefin` |
| Morphology | `amorphous` |
| Melting point °C | `Not applicable` |
| As printed | `Not applicable` |
| Water uptake | `Not applicable` |
| Neat density min kg/m³ | `1010` |
| Neat density max kg/m³ | `1020` |
| SourceID | `R-TOPAS-COC-BROCHURE` |

**Basis sentence:**

> TOPAS® COC, the unreinforced cyclic olefin copolymer: "in contrast to the partially crystalline polyolefins PE
> and PP, consists of amorphous, transparent copolymers based on cyclic olefins and linear olefins" (range
> brochure, published September 2019, p. 4), and p. 7's Table 1 gives 1.02 g/cm³ to ISO 1183 for all five basic
> grades, 8007, 6013, 6015, 5013 and 6017, with water absorption below 0.01 % after 24 h at 23 °C. The low end
> of the density range is TOPAS's own 8007S-04 data sheet, which prints 1010 kg/m³ to ISO 1183, a glass
> transition of 78 °C and a water absorption at saturation of 0.01 %, with no melting point published (Rev.
> 01.07.2019, p. 1). Melting point, As printed and Water uptake are all Not applicable: an amorphous polymer has
> no melting point to cap or drive heat deflection, and 0.01 % saturation uptake is nothing to convert. What the
> grades differ in is heat resistance, not density — the brochure says the HDT "is determined by the ratio of
> the comonomers", from 75 °C for 8007 to 170 °C for 6017 — so a COC product's own HDT is data and never an
> estimate from this row.

**`Group`.** There is no existing group for this. `cyclic polyolefin` is proposed; `polyolefin` (which PP and
PE use) would pull COC's effect towards two semicrystalline polymers with half its density, which is exactly
what the Group column is for. This is a new vocabulary value in the same commit as the row.

**A grade that is not the polymer.** purefil's **COC tough** publishes 1.02 g/cm³ (ISO 1183), inside the range,
and calls itself "impact-modified" — that is a modifier the material's Modifier / filler can describe. purefil's
**COC flex** publishes **0.94 g/cm³** and a glass transition "below −90 °C" with Shore 89A: that is below every
COC grade TOPAS makes and is an elastomer, not a COC. It needs a grade `Variant` (and the honest value is
`lightweight additive` only if a lighter component is declared; nothing on the sheet declares one), or it is a
different identity altogether. It should not be allowed to pull the COC family.

**Water uptake and the PPE-PS precedent.** The `PPE-PS` row records `low` on 0.23 % saturation uptake. COC at
0.01 % is two orders below that; `Not applicable` is the right reading and is what is proposed.

### `sources.csv` rows

```csv
R-TOPAS-COC-BROCHURE,TOPAS Advanced Polymers GmbH,TOPAS® COC Cyclic Olefin Copolymer,Not published,2019-09,2026-09-19,Manufacturer product page or guide,"TOPAS's range brochure: the statement that COC is amorphous, and the density of all five basic grades.",cited,https://topas.com/wp-content/uploads/2023/05/TOPAS_Product-Brochure.pdf,"p. 4: introduction; p. 5: grades; p. 7: Table 1 Physical properties",Polymer identity of COC (polymers.csv),retrieved,Not applicable,f60c785c6629ce832a2e40d1ebe0f60724ec694f4e232e506d1a82c6de64c884
R-TOPAS-8007S04-TDS,TOPAS Advanced Polymers GmbH,TECHNICAL DATA SHEET TOPAS® 8007S-04 Cyclic Olefin Copolymer (COC),Rev.: 01.07.2019,Not published,2026-09-19,Resin supplier data sheet,"An unfilled injection-moulding COC grade; gives the low end of the neat density range and the saturation water uptake.",cited,https://topas.com/wp-content/uploads/2023/05/TDS_8007S_04_e.pdf,"p. 1: Physical Properties, Thermal Properties",Polymer identity of COC (polymers.csv),retrieved,Not applicable,d889dd84b1c70dd8b6929a983c2932c7e3b0f1b5ecbac163bc870d7ddce5881d
```

---

## 5. PBT — polybutylene terephthalate

### Why it matters

purefil **PBT filament** (`f525fe2f087d8dba…` and its EN/FR/IT twins) and Flashforge **PBT GF**
(`6e235a5785518977…`). The PC-PBT blends (Extrudr durapro, Polymaker, INTAMSYS) already resolve to the existing
`PC-PBT` row.

### Documents fetched

| # | Document | URL | SHA-256 |
|---|---|---|---|
| A | BASF SE, *Product Information Ultradur® B 4500* (PBT), 02/2026 | https://download.basf.com/p1/8a8081c57fd4b609017fd66449853d71/en/ULTRADUR%C2%AE_B4500 | `13b47eeed941ea4a960b93608df75f09fcf180d2e0513baf98f13008b4719194` |
| B | Celanese, *Crastin® FG6130 NC010 THERMOPLASTIC POLYESTER RESIN* | https://hongrunplastics.com/public/uploads/images/20250611/Celanese%20PBT%20Crastin%20FG6130%20NC010.pdf | `5cfa1dd05657bb3eedf99738bf8ba2ea5fb741c4470e206649e68c9e241ec6fa` |

### Exact quoted lines

**A — BASF Ultradur® B 4500, p. 1** (an **uncoloured, unreinforced** grade):

> **Density — ISO 1183 — kg/m³ — 1300**
> **Water absorption, equilibrium in water at 23°C — similar to ISO 62 — % — 0.5**
> **Moisture absorption, equilibrium 23°C/50% r.h. — similar to ISO 62 — % — 0.25**
> Melt volume-flow rate MVR at 250 °C and 2.16 kg — ISO 1133 — cm³/10min — 19
> **Melting temperature, DSC — ISO 11357-1/-3 — °C — 223**
> Melt temperature, Injection moulding/Extrusion — °C — 250 - 275

**B — Celanese Crastin® FG6130 NC010** (an unreinforced grade):

> **Melting temperature, 10°C/min — 225 °C — ISO 11357-1/-3**
> **Glass transition temperature, 10°C/min — 55 °C — ISO 11357-1/-3**
> **Density — 1300 kg/m³ — ISO 1183**
> Humidity absorption, 2mm — 0.2 % — Sim. to ISO 62
> Water absorption, 2mm — 0.4 % — Sim. to ISO 62

### Proposed row

| Column | Value |
|---|---|
| PolymerID | `PBT` |
| Group | `aromatic polyester` |
| Morphology | `semicrystalline` |
| Melting point °C | `223` |
| As printed | `crystallises while printing` |
| Water uptake | `Not applicable` |
| Neat density min kg/m³ | `1300` |
| Neat density max kg/m³ | `1310` |
| SourceID | `R-BASF-ULTRADUR-B4500-PI` |

**Basis sentence:**

> BASF Ultradur® B 4500, the unreinforced, uncoloured PBT: density 1300 kg/m³ (ISO 1183), a DSC melting
> temperature of 223 °C (ISO 11357-1/-3), water absorption at equilibrium in water of 0.5 % and moisture
> absorption at 23 °C / 50 % r.h. of 0.25 % (Product Information 02/2026, p. 1). Celanese's Crastin® FG6130
> NC010, also unreinforced, agrees: 1300 kg/m³ to ISO 1183, a melting temperature of 225 °C and a glass
> transition of 55 °C to the same standard. The upper end of the density range is purefil's own PBT filament at
> 1.31 g/cm³ (ASTM D792). It crystallises while printing: purefil's printed PBT reaches a heat deflection
> temperature of 180 °C at 0.45 MPa and Flashforge's PBT GF 175 °C at 0.455 MPa, both far above PBT's 55 °C
> glass transition and close to what the moulded resin reaches, so the print does not stay amorphous (D56).
> Water uptake is Not applicable: both producers publish an uptake figure but neither publishes a
> conditioned-against-dry modulus pair, so there is no offset to convert with and a conditioned value reads as
> dry.

**`Group`.** `aromatic polyester`, the same group as `PET`. PET's row uses it and PBT is its next homologue.

**Water uptake — the one thing to decide.** The `PPE-PS` row records `low` on a 0.23 % saturation uptake;
PBT's 0.25 % at 23 °C / 50 % r.h. is the same order. Recording `low` would be consistent with that precedent.
The argument against is that the column exists to convert a *conditioned* measurement to dry with that class's
offset, and no PBT reference publishes the conditioned/dry pair that would justify an offset — which is why
`Not applicable` is proposed. Either is defensible; nothing in the corpus publishes a conditioned PBT value, so
the choice moves nothing today.

### `sources.csv` rows

```csv
R-BASF-ULTRADUR-B4500-PI,BASF SE,Product Information Ultradur® B 4500,02/2026,Not published,2026-09-19,Resin supplier data sheet,"BASF's own product information for the unreinforced, uncoloured PBT grade.",cited,https://download.basf.com/p1/8a8081c57fd4b609017fd66449853d71/en/ULTRADUR%C2%AE_B4500,p. 1: property table,Polymer identity of PBT (polymers.csv),retrieved,Not applicable,13b47eeed941ea4a960b93608df75f09fcf180d2e0513baf98f13008b4719194
R-CELANESE-CRASTIN-FG6130-TDS,Celanese,Crastin® FG6130 NC010 THERMOPLASTIC POLYESTER RESIN,Not published,Not published,2026-09-19,Resin supplier data sheet,"A second unreinforced PBT, agreeing at 1300 kg/m³ and 225 °C; no value is transcribed from it.",corroboration,https://hongrunplastics.com/public/uploads/images/20250611/Celanese%20PBT%20Crastin%20FG6130%20NC010.pdf,p. 1: Thermal / Physical,Not applicable,retrieved,Manufacturer copy not reachable; document mirrored by hongrunplastics.com and hashed as fetched.,5cfa1dd05657bb3eedf99738bf8ba2ea5fb741c4470e206649e68c9e241ec6fa
```

---

## 6. PVC — polyvinyl chloride

### Why it matters

purefil **PVC P filament** (`662ed5ad5edc8820…`), whose own sheet is headed *"Polyvinylchlorid weich 94A
(PVC-P)"* — **plasticised** PVC, Shore 94A, `Dichte (ISO 1183-1) 1.269 g/cm³`.

### Documents fetched

| # | Document | URL | SHA-256 | Outcome |
|---|---|---|---|---|
| A | SCG Chemicals / Thai Plastic and Chemicals PCL, *SAFETY DATA SHEET — SCGC PVC*, Rev.9, effective 13 February 2023 | https://www.scgchemicals.com/uploads/Safety_Data_Sheet_of_PVC_Resin_RY-S-QA-T003_09_(EN)2.pdf | `1d3c74f255e847fc0fa34b2dcc6594fcf3b994d94a89dcb869a9a83fb9324ed3` | The only producer document found that states a figure |
| B | Vynova, *VYNOVA S5702 Technical Data Sheet* | https://www.vynova-group.com/hubfs/01_Global_Assets/TDS/tds_vynova_s5702.pdf | `bdb6840b29e2188e3ab62e3b51df94edc2aac2b5975ecb0ab35cb1449c313cfb` | Bulk density only |
| C | Occidental Chemical Corporation, *Vinyl Handbook* | https://www.oxychem.com/siteassets/documents/vinyl/vinyl-handbook.pdf | `dc5c70b9fae6e050da9310a9f99f8b13662386f6b83fc1c662eb73b1dcde497b` | Apparent bulk density only; no polymer density anywhere in it |
| D | Formosa Plastics Corporation USA, *Safety Data Sheet* (PVC resin), 502-SDS-V10-EU-EN | https://www.fpcusa.com/content/uploads/2023/02/502-SDS-V10-EU-EN.pdf | `f4f06abf53e8e84cd6bd380a71f5388b85c7a65ec4e68e8ccd2a1427597feb50` | "Density: Not determined." |
| E | CSI / PVC Homopolymer Resin SDS (2018) | https://csi.us.com/wp-content/uploads/2018/05/PVC-Homopolymer-Resin-2018-1.pdf | `63726be062553c3e12ff2d7e124c006943044c57bf1e1cbda61cf47bd0bdb04d` | "Density: Not determined." |
| F | Benvic, *Consumer products — PVC compounds* | https://www.benvic.com/.servlets/downloadDocument?uuid=5c020b13-a5c1-4b54-b0a5-ebb111783b82 | `82f6eecef5278c42f263d4cb7232cfd03e11e4350c8ead062e500bdc91f8980a` | Grade list only, no property table |

**Refused, and why:** westlake.com answers HTTP 403 to the fetcher (both the 1230S product bulletin and the PVC
Product Stewardship Summary); inovyn.com answers HTTP 520; fpc.com.tw fails TLS verification in the fetcher's
Node runtime.

### Exact quoted lines

**A — SCG, SDS, p. 4, Section 9:**

> • Physical state and appearance: White powder
> • Odor: Odorless
> • Flash point: 391 °C
> • **Specific Gravity: 1.4**
> • Solubility: Insoluble

**B — Vynova S5702 TDS:**

> **Density — 570 kg/m³**

(that is the resin powder's bulk density, which is what a suspension-PVC data sheet publishes)

**C — OxyChem Vinyl Handbook, p. 9:**

> **Apparent Bulk Density (ABD)** — Apparent bulk density is the amount a given volume of resin will weigh
> without compaction…

### Why this one is not settled

Two separate problems.

**1. No PVC resin producer publishes the polymer's density.** PVC is sold as a powder and compounded by the
converter, so the producer's data sheet publishes bulk density (570 kg/m³), K value, particle size and
volatiles — never a solid-state density to ISO 1183. Three US and European producers' safety data sheets say
"Density: Not determined." The one figure found is SCG's SDS line "Specific Gravity: 1.4", with no test method
and no range. That is thinner than the PCL row's rejected melt density, and it is the same kind of problem:
**the number exists in the world but no producer document carries it in a form this database accepts.**

**2. The product is plasticised, and a plasticiser is not a filler.** purefil's PVC-P filament publishes
**1.269 g/cm³**. If the row records a neat range of 1380–1400, the build reads an unfilled product 110 kg/m³
*below* its base polymer — the situation `grade-variants.csv` exists for, except that neither of its two values
fits: "lightweight additive" means a declared additive (hollow microspheres, a foaming agent), and a
plasticiser is neither, nor is it an "undisclosed dense filler". **A new `grade-variants` value would be needed
in the same commit**, something like `plasticised`: a declared plasticiser lowers the density and the stiffness
together, and the product's values stay its own.

### Proposed row

| Column | Value |
|---|---|
| PolymerID | `PVC` |
| Group | `vinyl chloride` |
| Morphology | `amorphous` |
| Melting point °C | `Not applicable` |
| As printed | `Not applicable` |
| Water uptake | `Not applicable` |
| Neat density min kg/m³ | `Not recorded` |
| Neat density max kg/m³ | `Not recorded` |
| SourceID | `R-SCG-PVC-RESIN-SDS` |

**Basis sentence:**

> SCG Chemicals' safety data sheet for SCGC PVC resin, a suspension PVC homopolymer: a white powder, insoluble,
> specific gravity 1.4 (Rev.9, effective 13 February 2023, Section 9, p. 4). **The neat density range is Not
> recorded**: no PVC resin producer publishes a solid-state density to ISO 1183, because PVC is sold as a powder
> and compounded by the converter — Vynova's S5702 data sheet publishes a bulk density of 570 kg/m³, OxyChem's
> Vinyl Handbook discusses only apparent bulk density, and the Formosa Plastics and CSI safety data sheets both
> say "Density: Not determined." SCG's 1.4 carries no test method and no range, which is not enough to bound an
> estimate. PVC is classed amorphous and publishes no melting point, only a softening range, so Melting point
> and As printed are Not applicable; Water uptake is Not applicable, no reference publishing a
> conditioned-against-dry pair. The one product this identity serves, purefil's PVC-P filament, is plasticised
> (its sheet is headed "Polyvinylchlorid weich 94A (PVC-P)" and publishes 1.269 g/cm³ to ISO 1183-1) and so is
> lighter and far softer than the neat polymer; it needs a grade Variant, and `grade-variants.csv` has no value
> that describes a plasticiser.

**The alternative, if the owner prefers a bound to none:** record `1380`–`1400` from SCG's 1.4 ± the usual
spread, cite the SDS, and say in the Basis that the figure has no test method. That is a handbook value wearing
an SDS's clothes and I do not recommend it under D35.

**What would settle it:** a compound producer's rigid PVC-U data sheet with a density to ISO 1183 (Benvic,
Vestolit or Nakan all make them; none is served as an open PDF that the fetcher could reach), or an owner
ruling of the same kind as R052, which let the PCL row stand with `Not recorded`.

### `sources.csv` rows

```csv
R-SCG-PVC-RESIN-SDS,Thai Plastic and Chemicals Public Company Limited,SAFETY DATA SHEET SCGC PVC — PVC Resin,Rev.9,2023-02-13,2026-09-19,Manufacturer SDS,"The only producer document found that states a specific gravity for PVC; it gives no test method, which is why the neat density range is Not recorded.",cited,https://www.scgchemicals.com/uploads/Safety_Data_Sheet_of_PVC_Resin_RY-S-QA-T003_09_(EN)2.pdf,p. 4: Section 9,Polymer identity of PVC (polymers.csv),retrieved,Not applicable,1d3c74f255e847fc0fa34b2dcc6594fcf3b994d94a89dcb869a9a83fb9324ed3
R-VYNOVA-S5702-TDS,Vynova,VYNOVA S5702 Technical Data Sheet,Not published,Not published,2026-09-19,Resin supplier data sheet,"A suspension PVC resin sheet that publishes bulk density (570 kg/m³) and no polymer density; kept to show why the PVC row records none.",corroboration,https://www.vynova-group.com/hubfs/01_Global_Assets/TDS/tds_vynova_s5702.pdf,p. 1: Density,Not applicable,retrieved,Not applicable,bdb6840b29e2188e3ab62e3b51df94edc2aac2b5975ecb0ab35cb1449c313cfb
R-OXYCHEM-VINYL-HANDBOOK,Occidental Chemical Corporation,Vinyl Handbook,Not published,Not published,2026-09-19,Reference or register,"A PVC producer's own handbook; it covers apparent bulk density only and publishes no polymer density, which is why the PVC row records none.",corroboration,https://www.oxychem.com/siteassets/documents/vinyl/vinyl-handbook.pdf,p. 9: Apparent Bulk Density (ABD),Not applicable,retrieved,Not applicable,dc5c70b9fae6e050da9310a9f99f8b13662386f6b83fc1c662eb73b1dcde497b
```

---

## 7. LCP — liquid crystal polymer

### Why it matters

purefil **LCP filament** (`f3499bee1ec12f91…`).

### Documents fetched

| # | Document | URL | SHA-256 |
|---|---|---|---|
| A | Celanese, *Vectra® liquid crystal polymers (LCP) — short term properties guide*, doc code VC-4R3_LCP-019_VectraLCPShortTermPropGuideBro_AM_0613, printed 19 September 2013 | https://www.celanese.com/-/media/Engineered%20Materials/Files/Product%20Technical%20Guides/LCP-026_VectraLCPShortTermPropGuideTG_AM_0613.pdf | `ece5f2704e4f85161b9e08142d33633d1730337d92019b88e1413059e053305f` |

### Exact quoted lines

**A — Celanese, p. 2:**

> Vectra is the tradename of a range of **thermotropic, i.e. melt processable, liquid crystal polymers (LCP)**
> with very good heat resistance. A characteristic feature of liquid crystal polymers is their molecular
> structure. These polymers consist of rigid, rod-like macromolecules. If a liquid crystal polymer melt is
> subjected to shear or stretching flow, as is the case in all thermoplastic processing operations, then **the
> rigid macromolecules order themselves into fibers and fibrils which are frozen-in when the melt cools. This is
> how the specific morphology of liquid crystal polymers in the solid state is formed.** … These polymers are
> therefore also described as self reinforcing.

and, in the same feature list:

> **very low heat of fusion (very fast cycling possible)**, very low melt viscosity, … **very low water absorption.**

**A — p. 3, Table 1 "Vectra grades – Survey":**

> **Extrudable (unfilled) — A950 — V400P**

**A — p. 11, the property table's extrudable columns (V143LC | A950 | V400P), read against p. 6's label column:**

> Filler/Reinforcement — weight % ISO 3451 — 40 | **unfilled** | **unfilled**
> **Density — g/cm³ ISO 1183 — 1.67 | 1.40 | 1.40**
> Moisture Absorption (23°C, 50% RH) saturation — % ISO 62-4 — – | **0.03** | 0.04
> Tensile Strength — MPa ISO 527-1,-2 — 145 | 182 | 180
> Tensile Modulus — MPa ISO 527-1,-2 — 16000 | 10600 | 13200
> DTUL (HDT-A) 1.8 MPa — °C ISO 75-1,-2 — 265 | **187** | 108
> Vicat Softening Temperature VST/B/50 — °C ISO 306 — – | **145** | –
> **Melting Point — °C ISO 11357 — 335 | 280 | 212**

### Proposed row

| Column | Value |
|---|---|
| PolymerID | `LCP` |
| Group | `liquid crystal polyester` |
| Morphology | `semicrystalline` |
| Melting point °C | `280` |
| As printed | `crystallises, not driven by its melting point` |
| Water uptake | `Not applicable` |
| Neat density min kg/m³ | `1400` |
| Neat density max kg/m³ | `1400` |
| SourceID | `R-CELANESE-VECTRA-LCP-GUIDE` |

**Basis sentence:**

> Celanese Vectra® A950, the unfilled, extrudable liquid crystal polymer: density 1.40 g/cm³ (ISO 1183), a
> melting point of 280 °C (ISO 11357), a deflection temperature of 187 °C at 1.8 MPa, a Vicat of 145 °C and a
> moisture absorption at saturation of 0.03 % (short term properties guide, printed 19 September 2013, pp. 3
> and 11, read against the label column on p. 6). V400P, the guide's other unfilled grade, gives the same
> 1.40 g/cm³, so the neat density range has no width to give; every other Vectra grade in the guide is filled or
> reinforced and its density, from 1.50 to 1.81 g/cm³, is the filler's. Its heat deflection is not modelled on
> its melting point: the guide describes a solid-state morphology formed when "the rigid macromolecules order
> themselves into fibers and fibrils which are frozen-in when the melt cools" and notes a "very low heat of
> fusion", and A950 deflects at 187 °C against a 280 °C melting point, so the row is marked the way PPS is
> (D56). Water uptake is Not applicable at 0.03 % saturation. **The melting point is the A-series figure, not the
> family's**: the same guide prints 335 °C for the E, S and V143 grades and 212 °C for V400P, so an LCP product
> that publishes its own melting point must keep it. purefil's LCP filament, the one product this identity
> serves, publishes 1.40 g/cm³ (ISO 1183), a heat deflection temperature of 193 °C at 1.8 MPa and a Vicat B50 of
> 145 °C — A950's numbers, which is corroboration that the filament is an unfilled A-type LCP.

**"As printed" is a judgement I am not able to prove.** No document states how an LCP filament solidifies in a
print. `crystallises, not driven by its melting point` is proposed because it is the only enum value that says
what the Celanese guide says: the solid structure is orientation frozen in from the melt, the heat of fusion is
very low, and the deflection temperature sits ~90 K below the melting point. The competing reading is
`crystallises while printing`, which would let the model drive heat deflection from 280 °C and badly overstate
it. **What would settle it:** a printed-against-annealed heat deflection pair for an LCP filament, the way D56
settled PET, PPA and PPS. Until one exists, the value is a classification, not a measurement, and the Basis
says so.

**Morphology.** `semicrystalline` is the closest of the three allowed values: the polymer has a DSC melting
point to ISO 11357 and an ordered solid. It is not strictly right — a thermotropic LCP's order is nematic, not
lamellar-crystalline — and if the owner wants that distinction it is a fourth `Morphology` value and a
DECISIONS entry, not a quiet reuse of this one.

### `sources.csv` row

```csv
R-CELANESE-VECTRA-LCP-GUIDE,Celanese,Vectra® liquid crystal polymers (LCP) — short term properties guide,VC-4R3_LCP-019_VectraLCPShortTermPropGuideBro_AM_0613,2013-09-19,2026-09-19,Resin supplier data sheet,"Celanese's own grade guide; A950 and V400P are its two unfilled grades, and every other grade in it is filled.",cited,https://www.celanese.com/-/media/Engineered%20Materials/Files/Product%20Technical%20Guides/LCP-026_VectraLCPShortTermPropGuideTG_AM_0613.pdf,"p. 2: introduction; p. 3: Table 1 grades survey; p. 6: property label column; p. 11: extrudable grades A950 and V400P",Polymer identity of LCP (polymers.csv),retrieved,"The file is served under the name LCP-026; the document's own printed code is VC-4R3_LCP-019, recorded as its revision.",ece5f2704e4f85161b9e08142d33633d1730337d92019b88e1413059e053305f
```

---

## 8. PBAT — polybutylene adipate terephthalate

### Why it matters

Flashforge **PBAT** / "Flexible Filament" (`c4f8d32c696861bb…`).

### Documents fetched

| # | Document | URL | SHA-256 |
|---|---|---|---|
| A | BASF SE, *Product Information — ecoflex® F Blend C1200: Certified compostable polyester for compostable film*, Version 3.0, November 2025 | https://download.basf.com/p1/8a8082587fd4b608017fd63230bf39c4/en/ecoflex%3Csup%3E%C2%AE%3Csup%3E_F_Blend_C1200_Product_Data_Sheet_English.pdf | `ba9199bcb77b71f3438d7cf22214ec3f216bbfddd0a19c64a21655661a3f68e7` |

### Exact quoted lines

**A — BASF, p. 1:**

> ecoflex® F Blend C1200 is our biodegradable, statistical, **aliphatic-aromatic copolyester**. ecoflex® F Blend
> C1200 will biodegrade to carbon dioxide, water and biomass when metabolized by microorganisms in the soil or
> compost under standard conditions. … ecoflex® F Blend C1200 has **properties similar to PE-LD** because of its
> high molecular weight and its long chain branched molecular structure.

**A — p. 3, "Typical basic material properties of ecoflex® F Blend C1200":**

> **Mass Density — g/cm³ — ISO 1183 — 1.25 – 1.27**
> Melt Flow Rate MFR 190 °C, 2.16 kg — g/10 min — ISO 1133 — 2.7 - 4.9
> **Melting Point — °C — DSC — 110 - 120**
> **Shore D Hardness — – — ISO 868 — 32**
> **Vicat VST A/50 — °C — ISO 306 — 91**

### Proposed row

| Column | Value |
|---|---|
| PolymerID | `PBAT` |
| Group | `aliphatic-aromatic copolyester` |
| Morphology | `semicrystalline` |
| Melting point °C | `115` |
| As printed | `crystallises while printing` |
| Water uptake | `Not applicable` |
| Neat density min kg/m³ | `1250` |
| Neat density max kg/m³ | `1270` |

SourceID: `R-BASF-ECOFLEX-C1200-PI`.

**Basis sentence:**

> BASF ecoflex® F Blend C1200, the unfilled PBAT resin: "our biodegradable, statistical, aliphatic-aromatic
> copolyester" with "properties similar to PE-LD", a mass density of 1.25–1.27 g/cm³ (ISO 1183), a DSC melting
> point of 110–120 °C, Shore D 32 and a Vicat A/50 of 91 °C (Product Information Version 3.0, November 2025,
> pp. 1 and 3). The melting point recorded is the midpoint of BASF's published range. It is semicrystalline, not
> an elastomer: the producer publishes a DSC melting point and compares it to LDPE, which this database already
> files as semicrystalline. It crystallises while printing on the same reading as PE and PP: Flashforge's PBAT
> filament, printed at 230 °C onto a 40 °C bed, publishes a printed heat deflection temperature of 90 °C at
> 0.455 MPa, essentially BASF's Vicat A/50, and a density of 1.25–1.26 g/cm³, which is BASF's range for the
> resin. Water uptake is Not applicable: no reference publishes a conditioned-against-dry pair and Flashforge's
> own sheet gives water absorption below 0.5 % at 23 °C / 24 h.

**The one thing to decide:** the single melting point. The column wants a number and BASF publishes 110–120 °C.
`115` is the midpoint; `110` would follow the PCL row's habit of taking the low end of the producer's range.
The choice matters because the melting point caps heat deflection and, for a polymer marked "crystallises while
printing", drives it.

**"As printed" is a judgement.** No document states it. `crystallises while printing` is proposed because the
printed HDT (90 °C) sits at the resin's Vicat and far above its glass transition, and because PBAT is a
polyolefin-like fast crystalliser. A printed-against-annealed pair would settle it.

**`Group`.** `aliphatic-aromatic copolyester` is BASF's own phrase and a new vocabulary value; it is genuinely
neither the `copolyester` group (PETG, PCTG, CPE — all amorphous glycol-modified PET) nor `aromatic polyester`
(PET, PBT) nor `aliphatic polyester` (PCL). If the owner would rather not add a group, `aliphatic polyester`
is the nearer of the three, since PBAT's flexibility comes from its adipate blocks.

### `sources.csv` row

```csv
R-BASF-ECOFLEX-C1200-PI,BASF SE,ecoflex® F Blend C1200 — Certified compostable polyester for compostable film,Version 3.0,2025-11,2026-09-19,Resin supplier data sheet,BASF's own product information for the unfilled PBAT resin.,cited,https://download.basf.com/p1/8a8082587fd4b608017fd63230bf39c4/en/ecoflex%3Csup%3E%C2%AE%3Csup%3E_F_Blend_C1200_Product_Data_Sheet_English.pdf,"p. 1: Product description; p. 3: Typical basic material properties",Polymer identity of PBAT (polymers.csv),retrieved,Not applicable,ba9199bcb77b71f3438d7cf22214ec3f216bbfddd0a19c64a21655661a3f68e7
```

---

## What is still open, in one place

1. **PHA is not one polymer.** Two identities at least, or one for the semicrystalline class the filaments are.
2. **TPS is not thermoplastic starch**, and may not need a row at all: the existing `TPE` row fits both products.
3. **PVC's neat density is not sourceable** from a producer document, and its only product is plasticised, which
   `grade-variants.csv` cannot describe.
4. **Five new `Group` values** would be introduced by these rows: `cyclic polyolefin` (COC), `vinyl chloride`
   (PVC), `liquid crystal polyester` (LCP), `aliphatic-aromatic copolyester` (PBAT), and `elastomer` reused for
   TPS. Each is a schema change in the same commit as the row that uses it.
5. **Three `As printed` values are judgements, not measurements** — PHA, LCP, PBAT. Each says so in its Basis
   and each names the evidence that would settle it: a printed-against-annealed heat deflection pair.
6. **Two products would need a grade Variant** if their identities are created: purefil COC flex (0.94 g/cm³,
   below every COC grade) and purefil PVC-P (plasticised).
