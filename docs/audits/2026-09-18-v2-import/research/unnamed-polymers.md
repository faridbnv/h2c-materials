# Nine products whose data sheet never names the base polymer

Research record, 2026-09-18. The owner's ruling: for each product, find a document **published by the
same maker** that names the polymer, fetch it so it is hashed, and quote the line. Where nothing names
it, the product stays out.

Every document below was fetched with the repository's own fetcher, so the bytes are cached under
`.cache/sources/by-sha/<sha>.{pdf,html}`. Access date for all of them: 2026-09-18.

Nothing in this file is data yet. No table was edited. A product marked **Settled** still needs its
`sources.csv` row and its `material_links.csv` citation before the polymer enters the database.

## Summary

| # | Product | Maker | Outcome | Polymer |
|---|---|---|---|---|
| 1 | Greeny Pro | Spectrum | Nothing found | — |
| 2 | GreenyHT | Spectrum | Nothing found | — |
| 3 | ThermaTech PA | Spectrum | Narrowed | a polyamide; which one is not published |
| 4 | PET-G FX120 | Spectrum | Narrowed | a modified polyester; PET-G vs. copolyester elastomer unresolved |
| 5 | AquaPrint | Spectrum | Nothing found | — |
| 6 | Obsidian Carbon Fiber Nylon | 3DXTECH | Settled | PA6 + carbon fibre |
| 7 | CarbonX Carbon Fiber Nylon (Gen3) | 3DXTECH | Settled | PA6 copolymer + carbon fibre |
| 8 | SimuBone | 3DXTECH | Settled | PLA |
| 9 | WearX Wear Resistant PA6 Copolymer | 3DXTECH | Narrowed | PA6-based copolyamide; comonomer not named |

---

## 1. Spectrum "Greeny Pro" — Nothing found

**Documents fetched**

| Document | URL | SHA-256 |
|---|---|---|
| Safety data sheet, Filament Spectrum GreenyPro, 06.10.2023 v1.0/EN | https://spectrumfilaments.com/wp-content/uploads/2023/11/en_msds_greenypro.pdf | `900b73f17b28d2f9ece1828753a742cceae7f83eff36cdfd8a2f7dcdbfc087ca` |
| Product page (EN) | https://spectrumfilaments.com/en/filament/greenypro/ | `7c72b40aa96b68d3f5e063349839bb2fb873bf1deb71d8e9a7629be052cf7041` |
| Product page (PL) | https://spectrumfilaments.com/filament/greenypro/ | `ea2085598f949b85cec6f407baf25dc8e1ff5ec9cc2fc44e17a3b7e8ab05f7b8` |
| Download index (the maker's full document list) | https://spectrumfilaments.com/en/download/ | `42dce1779efc830a264a3910a2db5b762e1dd57ef9318853c059a22aefc07387` |

**The nearest the SDS comes** (Section 3.2 Mixtures, p. 1):

> "Product based on biopolymers with the addition of coloring agent, functional and filling agents.
> Product does not contain components which are classified as hazardous. Product does not contain
> components with European Union level exposure limit in the workplace."

No CAS number is given for any polymer. No ingredient is named.

**What the product page says instead** (p. `en/filament/greenypro/`):

> "GreenyPro is characterized by much higher impact resistance compared to standard PLA filaments"

and

> "GreenyPro is also distinguished by other features, such as excellent plasticity (vs. classic PLA)
> and minimal warping during printing"

Both sentences *compare* the product to PLA. Neither says it is PLA. The page's breadcrumb rail reads
"PLA / Bio-performance", but the maker's own shop navigation files GreenyPro under "Bio-performance",
not under "PLA" (see `508257f4…`, the shop nav). A navigation label that the maker itself does not use
consistently is not a composition statement.

**Where I looked:** spectrumfilaments.com download index (169 PDFs, only a TDS and an MSDS for this
product — no declaration of conformity, no food-contact declaration, no compostability certificate),
the EN and PL product pages, and shop.spectrumfilaments.com. Nothing from Spectrum names the polymer.

**Conclusion: Nothing found.** The product stays out.
*What would settle it:* a Spectrum declaration of conformity for food contact, a DIN CERTCO / TÜV
compostability certificate naming the resin, or an SDS revision that gives a CAS number in Section 3.

---

## 2. Spectrum "GreenyHT" — Nothing found

**Documents fetched**

| Document | URL | SHA-256 |
|---|---|---|
| Safety data sheet, Filament Spectrum GreenyHT, 03.10.2022 v1.0/EN | https://spectrumfilaments.com/wp-content/uploads/2022/10/en_msds_spectrum_greenyht.pdf | `290effe42b5da4a2cd9ab1215e9979726a3a01b921e0c45725571d3c565fb9d0` |
| Product page (EN) | https://spectrumfilaments.com/en/filament/greenyht/ | `aecc1d5d6d327a7600c8699552bb0b8a2ed7c1f45f2f172ae5cce606ac8b175e` |

**The nearest the SDS comes** (Section 3.2 Mixtures, p. 1):

> "Product based on biodegradable polymer resin with with the addition of coloring agent. Product does
> not contain components which are classified as hazardous."

(The doubled "with with" is the source's own typo.) No CAS number, no ingredient named.

**What the product page says instead:**

> "As a result of months of implementation testing, we have developed a new Spectrum GreenyHT™ filament
> based on high-performance biopolymer with a softening temperature (VICAT) of up to 100°C and thermal
> resistance (HDT B) of up to 90°C."

and

> "Furthermore, in terms of rigidity and hardness, it significantly outperforms classic PLA grades"

Again a comparison against PLA, not a claim to be PLA. The sheet's 1.54 g/cm³ density is far above neat
PLA's ~1.24, so the product is heavily filled or compounded either way, and "biopolymer" alone does not
say which base resin was filled.

**Where I looked:** the same Spectrum download index, both product pages, the shop. Retailers
(solidprint3d, filament2print, 3dprintingusa, majkl3d) sell it as "PLA GreenyHT", but a retailer's
shelf label is not a maker document and does not meet the ruling.

**Conclusion: Nothing found.** The product stays out.

---

## 3. Spectrum "ThermaTech PA" — Narrowed

**Documents fetched**

| Document | URL | SHA-256 |
|---|---|---|
| Safety data sheet, Filament Spectrum ThermaTech PA, 20.09.2024 v1.0/EN | https://spectrumfilaments.com/wp-content/uploads/2024/11/en_msds_spectrum_thermatech_pa.pdf | `3f0d497e74c9b6eeb61df4c9c1d1d10b8621e6241f8b02beaa4fe33b343e1233` |
| Product page (EN) | https://spectrumfilaments.com/en/filament/thermatech-pa/ | `b3c85e150ef5fbd02f8e15556dec51de03884fbc0eef93ecea1036e1de1ce34d` |
| Shop page, ThermaTech PA 1.75 mm Black 0.75 kg | https://shop.spectrumfilaments.com/product-eng-2584-Filament-Spectrum-ThermaTech-PA-1-75mm-Black-0-75kg.html | `508257f455ac7d93f94233934fe98d91a9766902390f220f61a16b883a25dd07` |

**The SDS names nothing at all** (Section 3.2 Mixtures, p. 1):

> "Product does not contain components which are classified as hazardous. Product does not contain
> components with European Union level exposure limit in the workplace."

**What the maker does say.** The product page names the *filler*, not the matrix:

> "By incorporating a special ceramic filler, ThermaTech PA offers high thermal conductivity while
> providing excellent electrical insulation"

and

> "…1.97 W/mK in the longitudinal direction, thanks to the alignment of boron nitride particles along
> the printing axis"

The maker's own shop taxonomy files the product under **Materials → PA → Spectrum → ThermaTech PA**,
alongside PA6 Low Warp, PA6 Neat NT/BK, PA6 CF15, PA6 GK10, PA6 CS20 FR V0 and PA12 CF15
(`508257f4…`, the shop nav). So Spectrum itself places it in the polyamide family.

**Ruled in:** a polyamide, filled with boron nitride.
**Ruled out:** nothing within the polyamide family. Spectrum sells both PA6 and PA12 grades and the
product name gives only "PA". The 1.30 g/cm³ density is a compound density and cannot separate a
PA6 matrix from a PA12 one once boron nitride is loaded in.

**Conclusion: Narrowed.** Family Nylon / Polyamide is supported by the maker's own classification; the
specific polyamide is not published.
*What would settle it:* an SDS revision with a CAS number, or a Spectrum RoHS/REACH declaration naming
the resin. Until then the product cannot name an Estimate identity in `polymers.csv`.

---

## 4. Spectrum "PET-G FX120" — Narrowed

**Documents fetched**

| Document | URL | SHA-256 |
|---|---|---|
| Safety data sheet, Filament Spectrum Industrial PET-G FX120 | https://spectrumfilaments.com/wp-content/uploads/2021/09/en_msds_spectrum_petg_fx120.pdf | `aa3c066efaad500674ce4c48d55015ae6c424b70b3813389c507b430931c3444` |
| Product page (EN) | https://spectrumfilaments.com/en/filament/pet-g-fx120/ | `d05319102616e0f3bc7865a114cd0c978e220f4305ab7a382af22a4299514c73` |

**The line that names a family** (Section 3.2 Mixtures, p. 1):

> "Product based on a modified polyester with addition of coloring agents. Product does not contain
> components which are classified as hazardous."

**Ruled in:** a polyester. **Ruled out:** polyurethane — so whatever the product's 400 % elongation and
14 MPa yield stress mean, this is not a TPU masquerading under a PET-G name. The maker's own shop
breadcrumb for this product reads "Industrial \ Co(Polyester) \ PET-G FX120", which agrees.

**Not ruled:** whether the base is actually PET-G. The product page says

> "Spectrum PET-G FX120™ belongs to the group of rigid elastomers"

and

> "Spectrum PET-G FX120™ can be printed with increased operating speeds, as compared to other elastomers"

A specific gravity of 1.13, a yield stress of 14 MPa and 400 % elongation are not PET-G behaviour; they
read as a thermoplastic copolyester elastomer (TPC-ET class). "Modified polyester" is exactly the phrase
that does **not** separate PET-G from PCTG from a copolyester elastomer — the same trap as an SDS that
says "polyester" for a PET/PETG question. The product's own name is the only thing asserting PET-G, and
the sheet's numbers argue against reading that name as a composition statement.

**Conclusion: Narrowed.** Polyester, not polyurethane; PET-G is asserted by the product name alone and
is contradicted by the published mechanical profile. Filing it as PET-G would put an elastomer into the
PET-G family and pull the family estimate.
*What would settle it:* a Spectrum SDS revision with a CAS or a named copolyester, or a Spectrum
technical note describing the FX120 base resin.

---

## 5. Spectrum "AquaPrint" — Nothing found

**Documents fetched**

| Document | URL | SHA-256 |
|---|---|---|
| Safety data sheet, Filament Spectrum AquaPrint, 20.03.2024 v1.0/EN | https://spectrumfilaments.com/wp-content/uploads/2023/11/en_msds_spectrum_aquaprint.pdf | `13eb1254e60345ad12f17926f71c42b24fe2382f55bea816b9ca36ed2b14742f` |
| Product page (EN) | https://spectrumfilaments.com/en/filament/aquaprint/ | `6ff5f38dd7485dc71013c98566e399ea8655ea879221e65b2d168b68e4b887d3` |
| Product page (PL) | https://spectrumfilaments.com/filament/aquaprint/ | `677c7b0af0db7d4196c7fdc3bf4795140e3a53eef52453b90e2633e72053a8d4` |

This is the one Spectrum SDS in the set that lists named ingredients — and neither of them is the
polymer (Section 3.2 Mixtures, p. 2):

> "CAS number: 67-56-1 … methanol … EC number: 200-659-6 … < 1 %"

> "CAS number: 36443-68-2 … ethylenebis(oxyethylene) bis[3-(5-tert-butyl-4-hydroxy-m-tolyl)propionate]
> … EC number: 253-039-2 … 0,2 %"

Those are a residual solvent and a hindered-phenol antioxidant. The matrix resin is not listed at all,
because it is not classified as hazardous and so need not be declared.

**What the product page says instead:**

> "AquaPrint boasts a flow rate almost four times higher in comparison to PVA based support filaments
> and reduces dissolving time in water by half"

> "AquaPrint stands out with its greater structural rigidity compared to other support filaments,
> notably PVA"

Every Spectrum sentence about the chemistry is a comparison *against* PVA, which if anything argues
the product is not PVA — but arguing from a comparison is exactly the kind of inference the ruling
forbids. The residual methanol is suggestive of a vinyl-alcohol chemistry and the 180–190 °C melting
point is not PVOH's, but neither observation is a maker statement and I will not record either as one.

**Where I looked:** the Spectrum download index (only TDS and MSDS exist for this product), both
product pages, the shop page (`f6f8a00d…`). Nothing from Spectrum names the polymer.

**Conclusion: Nothing found.** The product stays out.

---

## 6. 3DXTECH "Obsidian Carbon Fiber Nylon" — Settled: PA6 + carbon fibre

**Documents fetched**

| Document | URL | SHA-256 |
|---|---|---|
| Safety data sheet, Obsidian™ PA6+CF 3D Printing Filament, v1.1, 08/01/2022 | https://cdn.shopify.com/s/files/1/0625/4185/6821/files/Obsidian-PA6CF-SDS-v1.1.pdf?v=1721633173 | `f4a22aa89edd27ac1db788cfc229550de81672ef0dad9581a06b5068e8e2d516` |
| Technical data sheet, Obsidian™ Carbon Fiber Nylon 3D Filament, Rev 1.0 | https://cdn.shopify.com/s/files/1/0625/4185/6821/files/Obsidian-PA6CF-TDS_v1.pdf?v=1721633159 | `17c3b388f98175d84c9870d72473a47002b62ea71f9b7f513147bc62cf72ca05` |
| 3DXTECH data-sheet index (where both are linked) | https://www.3dxtech.com/pages/tech-data-sheets-safety-data-sheets | `058bf2caf742f0351dea3049f276f6e7867a52bd8e8d35c40b2ef10f80e52c4b` |

The SDS is linked from 3DXTECH's own data-sheet index and served from 3DXTECH's own Shopify CDN
(shop id `0625/4185/6821`, the same store that serves every other 3DXTECH sheet). Its title line and
Section 1, p. 1:

> "SAFETY DATA SHEET
> Obsidian™ PA6+CF 3D Printing Filament"

> "Product Name: Obsidian™ PA6+Carbon Fiber (CF)
> Chemical Name: Polyamide (PA)"

Section 3, p. 1:

> "Polyamide Resin   Withheld as trade secret   >80
> Carbon Fiber   308063-67-4   <20"

The "Chemical Name: Polyamide (PA)" line on its own would only be a family. The product name in the
same section — **PA6**+Carbon Fiber — is what settles it, and it is the maker's own wording in the
document's title, its filename and its product identifier. 3DXTECH also sells the successor as
"OBSIDIAN™ NYLON 6+CF V2" (product page `0fc454705d05d8c2276b941827945d8da554aa0a38c21b1ca3a8bf9f0ce7463b`,
https://www.3dxtech.com/products/obsidian-nylon-6-cf-v2), which corroborates the family line.

**Conclusion: Settled — PA6, reinforced with carbon fibre (<20 %, CAS 308063-67-4).**

### Two corrections to what the data sheet was read as saying

Both come from the TDS itself (`17c3b388…`, p. 1), and both should be fixed before this material's
measurements are trusted:

1. **The two numbers are not two directions.** The table's header is
   `Physical Properties | Standard | Unit | Obsidian™ | Onyx™` — the second column is **Markforged's
   Onyx, the competitor**, not the Z direction. So "tensile strength at break 44 MPa (XY) and 37 (Z)"
   is a misreading: 44 MPa is Obsidian, 37 MPa is Onyx. The same applies to tensile modulus
   (3.5 GPa Obsidian vs. 2.4 GPa Onyx), elongation (11 % vs. 25 %), flexural strength (75 vs. 71 MPa)
   and flexural modulus (3.8 vs. 3.0 GPa). Only the first column is this product's data.
2. **Density is stated.** `Density  ASTM D792  g/cc  1.2  1.2` — 1.2 g/cc for Obsidian (and the same
   for Onyx). The note "density not stated on the page read" is wrong.

The sheet's own strapline, for the record:

> "Obsidian™ was developed for use in all Markforged printers as an alternative to Onyx™"

---

## 7. 3DXTECH "CarbonX Carbon Fiber Nylon (Gen3)" — Settled: PA6 copolymer + carbon fibre

**Documents fetched**

| Document | URL | SHA-256 |
|---|---|---|
| Safety data sheet, CarbonX™ Carbon Fiber Nylon, v1.1, 08/01/2022 (filed by 3DXTECH as `CarbonX_PA6_G3_SDS_v1.1.pdf`) | https://cdn.shopify.com/s/files/1/0625/4185/6821/files/CarbonX_PA6_G3_SDS_v1.1.pdf?v=1723942766 | `ac9d03b7d41a433dc5285b2c36ac0d1dd11b85747a4bb9b3ea1b49e4245d4fc7` |
| Technical data sheet, CarbonX™ Carbon Fiber Nylon (Gen3), Rev 3.0 | https://cdn.shopify.com/s/files/1/0625/4185/6821/files/CarbonX_PA6_G3_TDS_v3.0.pdf?v=1723942765 | `8e42abe0a565061393e17c14d3fa4d719ea1cea502b9f70b5facfab2619a498e` |
| Product page, CARBONX™ NYLON 6+CF | https://www.3dxtech.com/products/carbonx-nylon-6-cf-1 | `90ea17ea087063179b13a0d9c0d5fa5ba53e5f34fb8c69d5a2c91593e1cbafac` |

**The line that names it**, from the product page (`90ea17ea…`, the product description):

> "CarbonX PA6+CF filament is formulated using a PA6 copolymer reinforced with high-modulus carbon fiber"

The same page is titled **"CARBONX™ NYLON 6+CF"** and says

> "Gen3 has higher HDT than our previous grades (147C at …)"

which ties it to the Gen3 TDS, whose deflection temperature at 0.45 MPa is 147 °C.

**The SDS corroborates by CAS** (Section 3, p. 1):

> "Product Name: CarbonX™ CF-Nylon
> Chemical Name: Polyamide (PA)"

> "Polyamide Resin   25038-54-4   >80
> Carbon Fiber   308063-67-4   <20"

CAS 25038-54-4 is the number 3DXTECH itself uses for the resin in **"AmideX™ PA6 Nylon Copolymer"**
(https://cdn.shopify.com/s/files/1/0625/4185/6821/files/AmideX_Nylon_SDS_v1.0.pdf?v=1723942765,
SHA-256 `1bb7e136742a18e6a71289945a48e414e2cfef9c590407ca664608acfb43556c`, Section 3:
"Polyamide Resin  25038-54-4  98-99"). Their PA12 product uses a different entry entirely
("Chemical Name: Polyamide 12 [PA12]", "PA12 Resin  Confidential", SHA-256
`60cf96b3651f28d08ec93e4e0d8ba4173af4139da46a340a4ee97466dfe9f21c`). So within 3DXTECH's own
documents the CAS on this SDS is their PA6 resin, not their PA12.

**Conclusion: Settled — PA6 copolymer, reinforced with carbon fibre (<20 %, CAS 308063-67-4).**
The maker names it three ways that agree: product title "NYLON 6+CF", description "a PA6 copolymer",
and its own filename for the sheet.

---

## 8. 3DXTECH "SimuBone Bone Simulation Filament" — Settled: PLA

**Document fetched**

| Document | URL | SHA-256 |
|---|---|---|
| Safety data sheet, SimuBone™ Bone Simulation Modeling Filament, v1.1, 08/01/2022 | https://cdn.shopify.com/s/files/1/0625/4185/6821/files/SimuBone_SDS_v1.1.pdf?v=1723942766 | `9265f373c914341d6d6c18207f0f65b6424bd6ed5f85c4bb024517e8038721d6` |

Section 1, p. 1:

> "Product Name: SimuBone™
> Chemical Name: Polylactic Acid (PLA)"

Section 3, p. 1:

> "PLA Resin   9051-89-02   >85%
> Remainder of formulation has been withheld as a trade secret."

This settles it twice over: a chemical name and a resin line at >85 %. (The CAS is printed
`9051-89-02`; the conventional form is 9051-89-2, and the sheet's extra zero is a typographic slip in
the source, not a different substance. Transcribe it as printed and note the slip if it is ever
recorded.)

The trade-secret remainder (<15 %) is the bone-look filler and the radio-opaque additive; it is not
needed to file the base polymer.

**Conclusion: Settled — PLA, >85 %, plus an undisclosed filler package.** Note for `grades.csv`: the
filler is undisclosed and heavy enough to lift the modulus to 3.41 GPa, so this is a case for
**Variant** with the reason in Composition / filler, so its values stay its own and do not pull the
PLA family.

---

## 9. 3DXTECH "WearX Wear Resistant PA6 Copolymer" — Narrowed

**Documents fetched**

| Document | URL | SHA-256 |
|---|---|---|
| Safety data sheet, WearX™ Wear Resistant PA6 Nylon Copolymer, v1.0, 01/01/2023 | https://cdn.shopify.com/s/files/1/0625/4185/6821/files/wearx_sds_WearX_Nylon_SDS_v1.0.pdf?v=1728481557 | `f71ec130495f5da5fd9e9b85605bd65dce8d8317d57e602d3ab5355e9a02c0bd` |
| Technical data sheet, WearX™ Wear Resistant PA6 Copolymer 3D Filament, Rev 1.0 | https://cdn.shopify.com/s/files/1/0625/4185/6821/files/wearx_tds_FW_PA6_Copolymer_v1.0.pdf?v=1728481558 | `523f50519a241fc4ad95a89520f2fb3f60e2fbc227fee5c28548c43610f9f579` |

Section 1, p. 1:

> "Product Name: WearX™ PA6 Nylon Copolymer
> Chemical Name: Polyamide (PA)"

Section 3, p. 1:

> "CoPolyamide Resin   25038-54-4   >95%
> Friction & Wear Additive   Proprietary   <5%"

**Ruled in:** a PA6-based copolyamide. The CAS on the resin line, 25038-54-4, is the same number
3DXTECH prints for the resin in "AmideX™ PA6 Nylon Copolymer" (`1bb7e136…`) and in CarbonX CF-Nylon
(`ac9d03b7…`), and it is not the entry they use for PA12 (`60cf96b3…`, "Chemical Name: Polyamide 12
[PA12]"). Within the maker's own document set, that CAS means their PA6.

**Ruled out:** a PA66-based or PA12-based copolyamide, on the same CAS evidence — 3DXTECH gives those
their own identifiers.

**Not ruled:** the comonomer. The maker says "copolymer" in the product name, the SDS title, the SDS
product identifier and the TDS title, but declares a single homopolymer CAS at >95 % and never names
a second monomer. So "PA6/66", "PA6/12" or another copolyamide cannot be chosen between from anything
3DXTECH publishes. The TDS's own numbers — Tm 198 °C, Tg 76 °C, density 1.18 g/cc — are consistent
with a lightly modified PA6 and do not separate the candidates either.

**Conclusion: Narrowed.** Base polymer PA6 is supported by the maker's own naming and its own CAS
usage; the copolyamide's second monomer is not published and must not be guessed. Record the Estimate
identity as PA6 and say in Composition / filler that the maker calls it a copolymer without naming the
comonomer, or leave it out — the owner's call.
*What would settle it:* an SDS revision listing a second monomer or a second CAS, or a 3DXTECH
technical note on the WearX base resin.

---

## What the Spectrum result means

Four of the five Spectrum products cannot be filed, and the reason is structural, not an oversight in
searching. Spectrum's download index (`42dce177…`) holds 169 PDFs and, for these products, exactly two
document kinds: a TDS and an MSDS. Spectrum's MSDS house style declares only classified substances in
Section 3, and none of these polymers is classified, so the matrix resin is never named — the AquaPrint
sheet declares a residual solvent and an antioxidant while leaving the polymer itself unlisted. There
are no declarations of conformity, no food-contact declarations and no compostability certificates on
the maker's site to fall back on. Until Spectrum publishes one of those, or revises an SDS to carry a
CAS, Greeny Pro, GreenyHT and AquaPrint have no maker document that names what they are, and ThermaTech
PA and PET-G FX120 have only a family.
