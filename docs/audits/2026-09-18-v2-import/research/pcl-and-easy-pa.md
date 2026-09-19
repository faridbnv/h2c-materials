# Polycaprolactone, and which polyamide SUNLU's "Easy PA" is

Research record, 2026-09-19. Two questions the import cannot answer from the sheets already in the
corpus: `polymers.csv` has no PCL row, and SUNLU's Easy PA data sheet says only "PA", which names a
family, and a family owns no product (D44).

Every document below was fetched with the repository's own fetcher, so the bytes are cached under
`.cache/sources/by-sha/<sha>.{pdf,html}`. Access date for all of them: **2026-09-19**.

Nothing here is data yet. No table was edited, no ledger row touched, no migration run. The proposed
rows are written out so the owner can paste them after review.

## Summary

| # | Question | Outcome |
|---|---|---|
| 1 | PCL row for `polymers.csv` | **Settled** for group, morphology, melting point and water uptake, from Perstorp's own Capa™ documents. **Neat density stays Not recorded**: no producer publishes a solid-state density; the only figure is 1.1 g/cm³ *at 60 °C*, i.e. at the melt. |
| 2 | SUNLU Easy PA — which polyamide | **Settled: PA6/66.** SUNLU's own store says "our advanced PA6/66 copolymer filament" and "Engineered from PA6/66 copolymer". The TDS melting point of 198 °C agrees; SUNLU's own SDS does not, and is a caveat below. |

---

## 1. Polycaprolactone (PCL)

### Why it matters

SUNLU's REACH declaration lists **PCL** as product 6 of its range (p. 2, `6 PCL`), so the maker sells
a polycaprolactone filament and the database currently cannot file it.

| Document | URL | SHA-256 |
|---|---|---|
| SUNLU REACH declaration (product list) | https://media.sunlu.com/prod/20260617/23443801781661201747.pdf?filename=Reach | `d315cefc8cbab6c27ac0df108a40b5d1fcf32442b1fd454981e57edaba2ebf04` |

### Documents fetched

| # | Document | URL | SHA-256 |
|---|---|---|---|
| A | Perstorp, *Properties & Processing of CAPA® Thermoplastics* (doc code A22H-011), the Capa® 6000 series datasheet | http://www.rapstrap.com/TDS-CAPA6500.pdf | `41850aa330a9dfc862d3c38b9af9a3026756e5c44d0f4e8828a19ca34b4dc03b` |
| B | Perstorp, *Product data sheet Capa™ 6800*, Issue 1, approved 31 Oct 2010, valid from 23 April 2009 | https://www.mouser.com/datasheet/2/737/Perstorp_CAPA_6800_PDS-1915440.pdf | `1ad27ab2c644c8636a35c575b25e0dac1c7e6029d1283d8468d21c90b1e22f17` |
| C | Perstorp UK Ltd, *Safety data sheet according to 1907/2006/EC, Article 31 — Capa™ 6800*, Version 1, revision 30.05.2012 | https://www.farnell.com/datasheets/1955572.pdf | `cb581be67a6c67ecfb7cbfbd7926600067e2915c065c0f0f81867cef1e4abeca` |
| D | Perstorp, *Capa® for spearhead performance* (range brochure, with the product data summary table) | http://www.chemcam.it/Capa.pdf | `a1edc728ea195921ea49685b768527c4762616506e8bc51e5b309161e4d41ec6` |

Documents B and C are Perstorp's own, mirrored by the distributors Mouser and Farnell (the same
arrangement as `R-SABIC-NORYL-731-TDS`, which is SABIC's sheet mirrored by sushengpolymer.com).
Document A carries Perstorp's document code and Perstorp Polyols' Toledo address; document D carries
no date.

**Refused, and why:** Ingevity's own Capa® 6500 page and the tri-iso.com mirrors of Perstorp's
Capa™ 6500 PDS and MSDS all answer HTTP 403 to the fetcher, including through web.archive.org.
Scientific Polymer Products' TDS 342 (`c8c668bf3a13452114441f476ccb3c332c64096eb9f202fd15a58832b84de0f5`,
density 1.08 at 20 °C, melting point 55 °C) was fetched and then **rejected**: it is a
poly(caprolactone) *diol*, Mn 3,000, CAS 36890-68-3 — a polyol, not the thermoplastic homopolymer.
Daicel's PLACCEL H1P sheet (`ace02a2c2bfd617505755a0535b5b76e904c63c23572a51030f58bcb28bc2e67`) is a
scanned image with no text layer.

### Exact quoted lines

**A — Perstorp, Properties & Processing of CAPA® Thermoplastics, p. 1:**

> Perstorp Caprolactones have produced ε-caprolactone and its polymers at their Warrington plant since
> the mid 1970's.
> The thermoplastic grades, the CAPA® 6000 series, find wide usage in a range of applications.
> These products are … • Fully biodegradable • Low Melting • Non-Toxic • Readily Processable •
> **Semi-Crystalline**

**A — p. 2, "Typical Physical Properties of CAPA® Thermoplastics" (columns: CAPA 6500 | CAPA 6800):**

> Thermal Analysis (DSC)
> **Melting Point, °C — 60-62 | 60-62**
> Heat Of Fusion, ∆Hm, J/g — 76.9 | 76.6
> **Crystallinity, % — 56 | 56**
> Crystallisation Temperature, °C — 25.2 | 27.4
> **Glass Transition Temperature, Tg, °C — -60 | -60**

and, for stiffness at room temperature:

> Flexural Modulus, E, MPa 2mm/min D 790 — 411 | nd
> Hardness D 2240 — Shore A 95 | 94 — Shore D 51 | 50

**B — Perstorp, Product data sheet Capa™ 6800, p. 1:**

> Capa™ 6800 is a high molecular weight **linear polyester derived from caprolactone monomer**.
> Mean molecular weight 80,000
> **Melting point, °C 58-60**
> **Water content, % <1.0**
> CAS no.: 24980-41-4

**C — Perstorp UK Ltd, SDS Capa™ 6800, Section 1 and Section 9 (p. 4):**

> Product name: Capa™ 6800 — 2-oxepanone, homopolymer — Cas No.: 24980-41-4
> Melting point/Melting range: **58-60°C**
> Decomposition temperature: approx 200 °C
> **Density at 60°C: 1.1 g/cm³**
> Solubility in / Miscibility with water: **Insoluble.**

**D — Perstorp, Capa® brochure, p. 6, p. 9 and p. 11:**

> Low temperature activation, **Tm = 60°C**
> **Supercools below melting point, 58°C, and stays workable by hand**

and p. 12, "Product data summary — Capa® Thermoplastic polycaprolactones", the melting-range column
reads **58-60** for every thermoplastic grade from Capa® 6100 (10,000 g/mol) through Capa® 6500
(50,000) to Capa® 6800 (80,000); the film grade Capa® FB100, "Unfilled", is 58-60 as well.

### The proposed `polymers.csv` row

| Column | Value | Where it comes from |
|---|---|---|
| PolymerID | `PCL` | |
| Group | `aliphatic polyester` | B: "linear polyester derived from caprolactone monomer". Worded like the existing `aromatic polyester` (PET) and `polylactide` (PLA) rows — PCL is neither, and an aliphatic polyester is what it is. |
| Morphology | `semicrystalline` | A: "Semi-Crystalline", crystallinity 56 %. |
| Melting point °C | `60` | A: DSC 60-62 °C; B and C: 58-60 °C; D: "Tm = 60°C" on every grade. 60 is the one number all four print. |
| As printed | `crystallises while printing` | See the note below — this one is a judgement, not a quote. |
| Water uptake | `Not applicable` | C: "Insoluble" in water. PCL is not a polyamide and takes no conditioning offset; the column's `high`/`low` states are defined for the polyamides. B's "Water content, % <1.0" is a residual-moisture spec for the pellets, not uptake. |
| Neat density min kg/m³ | `Not recorded` | No producer publishes a solid-state density to ISO 1183. See below. |
| Neat density max kg/m³ | `Not recorded` | ditto (precedent: the `CoPE` and `nGen` rows). |
| SourceID | `R-PERSTORP-CAPA-THERMO-PP` | Document A, which carries the classification, the DSC melting point and the morphology together. |

**Basis sentence**, in the style of the `PPE-PS` row:

> Perstorp Capa® thermoplastic polycaprolactone, the neat homopolymer (CAS 24980-41-4):
> "Semi-Crystalline", DSC melting point 60-62 °C, crystallinity 56 % and glass transition -60 °C
> (Properties & Processing of CAPA® Thermoplastics, p. 2), and 58-60 °C on Perstorp's Capa™ 6800
> product data sheet and on every thermoplastic grade in the range brochure's product data summary.
> Insoluble in water (SDS, Section 9). That sheet publishes a density of 1.1 g/cm³ at 60 °C only, at
> the melt and not to ISO 1183, so the neat density range is Not recorded.

### Two things the owner has to decide

**1. "As printed."** PCL is the first polymer in this database whose melting point (60 °C) is near
room temperature and whose glass transition (-60 °C) is far below it: a PCL part is stiff at 23 °C
only because it is crystalline (flexural modulus 411 MPa, Shore D 51, crystallinity 56 %), so its
heat deflection is capped by its melting point and nothing else. That is exactly what
`crystallises while printing` means in the schema, and is what I propose. The counter-quote is
document D's "Supercools below melting point, 58 °C, and stays workable by hand" and document A's
crystallisation temperature of 25.2 °C — PCL crystallises slowly and at a low temperature. It does
not print amorphous in the sense PET and PVA do (they deflect near a glass transition well above room
temperature; PCL has none to fall back on). If the owner wants this recorded rather than argued, it
belongs in DECISIONS beside D56, not in a new code branch.

**2. Neat density.** Only one producer figure exists in anything I could fetch: **1.1 g/cm³ at 60 °C**
(document C), which is the density at the melting point, not the solid density at 23 °C. Setting the
range to 1100/1100 from it would record a melt density as a solid one. The widely repeated
1.145 g/cm³ for PCL is not in any producer document I could fetch and is not written here.
`Not recorded` on both columns is what the evidence supports; if a bound is wanted later, the
remaining route is a paper handbook entry.

### The `sources.csv` rows the references need

```csv
R-PERSTORP-CAPA-THERMO-PP,Perstorp,Properties & Processing of CAPA Thermoplastics,A22H-011,Not published,2026-09-19,Resin supplier data sheet,Perstorp datasheet for the CAPA 6000 thermoplastic series; document mirrored by rapstrap.com.,cited,http://www.rapstrap.com/TDS-CAPA6500.pdf,"p. 1: product description; p. 2: Typical Physical Properties of CAPA Thermoplastics",Polymer identity of polycaprolactone (polymers.csv),retrieved,Not applicable,41850aa330a9dfc862d3c38b9af9a3026756e5c44d0f4e8828a19ca34b4dc03b
R-PERSTORP-CAPA-6800-PDS,Perstorp,Product data sheet Capa 6800,Issue 1,2010-10-31,2026-09-19,Resin supplier data sheet,Document mirrored by Mouser Electronics.,cited,https://www.mouser.com/datasheet/2/737/Perstorp_CAPA_6800_PDS-1915440.pdf,p. 1: Typical properties,Polymer identity of polycaprolactone (polymers.csv),retrieved,Not applicable,1ad27ab2c644c8636a35c575b25e0dac1c7e6029d1283d8468d21c90b1e22f17
R-PERSTORP-CAPA-6800-SDS,Perstorp UK Ltd,Safety data sheet according to 1907/2006/EC Article 31 — Capa 6800,Version 1,2012-05-30,2026-09-19,Manufacturer SDS,Document mirrored by Farnell.,cited,https://www.farnell.com/datasheets/1955572.pdf,"p. 1: Section 1; p. 4: Section 9",Polymer identity of polycaprolactone (polymers.csv),retrieved,Not applicable,cb581be67a6c67ecfb7cbfbd7926600067e2915c065c0f0f81867cef1e4abeca
R-PERSTORP-CAPA-BROCHURE,Perstorp,Capa for spearhead performance,Not published,Not published,2026-09-19,Manufacturer product page or guide,Range brochure; document mirrored by chemcam.it.,corroboration,http://www.chemcam.it/Capa.pdf,"p. 6; p. 9; p. 12: Product data summary",Polymer identity of polycaprolactone (polymers.csv),retrieved,Not applicable,a1edc728ea195921ea49685b768527c4762616506e8bc51e5b309161e4d41ec6
```

Publication dates: only document B prints one ("Approved: 31 Oct 2010", "Valid from: April 23, 2009")
and only document C prints a revision ("Revision: 30.05.2012"). A and D print none, so both read
"Not published". If the owner would rather cite one document only, it is
`R-PERSTORP-CAPA-THERMO-PP`; the other three are what the Basis sentence names.

---

## 2. SUNLU "Easy PA" — **Settled: PA6/66**

### Documents fetched

| # | Document | URL | SHA-256 |
|---|---|---|---|
| E | SUNLU store, Easy Nylon (PA) product page | https://store.sunlu.com/products/moq-6-easy-nylone-pa-3d-printer-filament-1kg | `79b4bc06ea24db213e3874df457e92a94da5866cea8bd2b42008f2d1817ef624` |
| F | SUNLU store, "SUNLU Easy Nylon (E-PA) 3D Printer Filament" collection | https://store.sunlu.com/collections/easy-nylone-pa | `d47259f4d5980d7c14cb1d6efaee7cab3988e8ed90335949b2f7db778e4c8a0f` |
| G | SUNLU, Easy PA product page (corporate site) | https://www.sunlu.com/products/easy-pa-nylon-filament | `3e3366aa7f5de0d51319706599d81f727198b32f82c7735b77cc1abbaa19a975` |
| H | SUNLU, Safety Data Sheet — Easy PA filament, SDS No. SLFDM2105025, Version 5.2, revised 2023-10-19 | https://media.sunlu.com/prod/20260330/e6a9b485-59c5-48d8-a54d-cf1530dcdb58.pdf?filename=SDS | `df4de9b7f6f3d8751052554c304a1c0524e90fa15898e3789bfbf44e662f6ec1` |
| — | SUNLU, TECHNICAL DATA SHEET ISO Easy PA (already in the ledger, doc key `dfc4e8b55e12ca56`) | https://media.sunlu.com/prod/20260330/a5909dda-0573-4f11-a34a-00d495b1ea09.pdf?filename=TDS | `dfc4e8b55e12ca56866c37b5b957fc83fd64ceb88fbd926a10f291b82e609988` |

`store.sunlu.com` is SUNLU's own storefront (it is the store linked from `www.sunlu.com`, on the same
domain); documents E, F and G are all SUNLU's. The SDS (H) is linked from G's own downloads block,
beside the TDS that is already in the ledger, so it is the SDS for this product.

### The line that settles it

**E — SUNLU store, Easy Nylon (PA) product page, body text:**

> SUNLU Easy PA (E-PA) Filament … We specifically developed Easy PA, **our advanced PA6/66 copolymer
> filament**, to tackle these exact problems head-on.

and, further down the same page:

> [Unbeatable Toughness & Impact Resistance] Craft exceptionally strong, durable parts with SUNLU Easy
> PA filament. **Engineered from PA6/66 copolymer**, it delivers outstanding mechanical strength and
> superior impact resistance …

**F — the collection page's own title and description:**

> SUNLU Easy Nylon (E-PA) 3D Printer Filament | Impact Resistant
> Shop SUNLU Easy PA Nylon Filament. **This 6/66 copolymer** offers high impact resistance and strength
> for smooth, crack-free, and warp-free 3D prints.

and its range navigation, which labels each engineering filament with its polymer:

> PA6-CF — Nylon 6 Carbon Fiber · PA6-GF — Nylon 6 Glass Fiber · PA12-CF — Nylon 12 Carbon Fiber ·
> **EPA, PA6/66 — Easy Nylon** · PP · PC

The same navigation block appears on G, SUNLU's corporate product page, so the two sites agree.

### The maker's own data sheet agrees

The Easy PA TDS prints, on p. 1:

> Glass Transition (Tg) ISO 11357-2 10 ℃/min ℃ **65**
> Melting Temperature ISO 11357-3 10 ℃/min ℃ **198**
> Density ISO 1183 23℃ g/cm³ **1.10**

198 °C is a copolyamide melting point. It is 24 °C below the PA6 row of `polymers.csv` (222) and 64 °C
below the PA66 row (262), and it sits on the existing `PA6/66` row's melting point (200). Nothing
about the sheet contradicts PA6/66.

### One caveat, and why it does not overturn the finding

SUNLU's SDS (H), Section 3, p. 2, reads:

> Ingredient Name | CAS No. | EC No. | Content (%)
> **PA | 32131-17-2 | -- | 99**
> Additives | -- | -- | 1

CAS 32131-17-2 is the registry number suppliers use for **nylon 66** (poly(hexamethylene adipamide)),
not for a 6/66 copolymer. Three reasons not to read it as a contradiction of PA6/66, and one
consequence:

1. A copolyamide has no single clean CAS, and naming one homopolymer's number for "PA" at 99 % is the
   usual shortcut in this kind of GHS sheet; it does not name PA66 as the product.
2. The SDS is older than the sheet it sits beside: "Revision Date: 2023.10.19, Initial date: 2023.7.1,
   Version: 5.2", against a 2026 TDS.
3. Its own numbers disagree with the TDS: the SDS prints "Density(g/cm) **1.12**" and
   "Melt Flow Index（g/10min） **5**（230℃/2.16kg）", where the TDS prints 1.10 g/cm³ (ISO 1183, 23 °C)
   and 19 ± 2 g/10 min (ISO 1133, 250 °C/2.16 kg). It reads as a generic SUNLU polyamide SDS, not as a
   characterisation of this formulation.
   **Consequence: transcribe no property value from the SDS.** It settles nothing and contradicts the
   sheet; the TDS is the source for every number.

If CAS 32131-17-2 were taken at face value the product would be PA66, whose melting point is 262 °C —
64 °C above what SUNLU's own sheet measures by DSC. The store's two independent statements plus the
TDS's 198 °C agree; the SDS's CAS stands alone and against the physics.

### What this unblocks

The proposal `docs/audits/2026-09-18-v2-import/proposals/b08-sunlu-held/dfc4e8b55e12ca56.json` carries
`identity.needsRuling: true` with the reason `"pa" names a family, not a polymer`. With E and F the
identity is a maker's statement, not a ruling: **Estimate identity `PA6/66`**, which already has a
row in `polymers.csv` (aliphatic polyamide, semicrystalline, 200 °C, crystallises while printing,
high water uptake, 1100-1160 kg/m³). No new polymer row is needed, and no `rulings.csv` entry either
— a ruling settles what the rule cannot, and here the maker says it outright.

### The `sources.csv` row for the store page

```csv
R-SUNLU-EASY-PA-STORE,SUNLU,Easy Nylon(PA) 3D Printer Filament Bundle Buying - SUNLU Online Store,Not published,Not published,2026-09-19,Manufacturer product page or guide,SUNLU's own storefront; names the base polymer the TDS does not.,cited,https://store.sunlu.com/products/moq-6-easy-nylone-pa-3d-printer-filament-1kg,Document / product page: "our advanced PA6/66 copolymer filament",Base polymer of SUNLU Easy PA,retrieved,Not applicable,79b4bc06ea24db213e3874df457e92a94da5866cea8bd2b42008f2d1817ef624
```

The collection page (F, `d47259f4d5980d7c14cb1d6efaee7cab3988e8ed90335949b2f7db778e4c8a0f`) says the
same thing and can be added with Citation role `corroboration` if the owner wants the second
statement on the record. The SDS (H) is worth a row of its own with Citation role `corroboration` and
a Source note saying that its CAS and its density disagree with the TDS, so that the next reader does
not rediscover it as a defect.

---

## What was looked at and rejected

- **Retailer descriptions of Easy PA** (Amazon's "Nylon 6+66" listing, 3DJake, smith3d,
  spoolscout): a retailer's description is not a maker document. Not fetched, not relied on, noted
  here only so the next reader knows they were seen and set aside.
- **SUNLU's RoHS report** (`809e7523df34c025f7119d28b8fd9cbaa926dbeac9166a9c5e48bce781b59693`) and
  **REACH declaration** (`d315cefc8cbab6c27ac0df108a40b5d1fcf32442b1fd454981e57edaba2ebf04`): both list
  "Easy PA" as a product line among PA6-CF, PA6-GF and PA12-CF, and neither names its polymer. The
  REACH list is where the PCL product shows up.
- **Ingevity's Capa pages and the tri-iso.com Perstorp mirrors**: HTTP 403 to the fetcher, directly and
  through web.archive.org. Nothing from them is quoted here.
- **Scientific Polymer Products TDS 342** and **Daicel PLACCEL H1P**: fetched, then rejected (a polyol,
  and a scan with no text layer). SHA-256 for both are in the PCL section above.
