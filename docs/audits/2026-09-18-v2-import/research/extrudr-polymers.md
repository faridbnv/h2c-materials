# What eight Extrudr filaments are made of

Research note, 2026-09-19. Eight Extrudr products whose technical data sheet names no base polymer, so the
database cannot file them. The question for seven of them is the base polymer; for XPETG MATT it is the filler
its name does not declare.

The rule applied: only a document **published by Extrudr** counts. A retailer listing, a review or a forum post
does not. Where nothing Extrudr publishes names it, the product stays out.

Nothing in `data/tables/` was changed by this note. No ingest, data or migration command was run, and the ledger
was not touched. Every document below was fetched through the repository's own fetcher and is cached by digest.

## Where the documents are

Extrudr's TDS closes with "Additional info in our regulatory, additional information and chemical resistance data
sheets." Those sheets exist, but not under the names the sentence suggests, and not one per product in every case.
The bucket root refuses a listing (`AccessDenied`), so the file set was recovered from the reseller downloads page,
`https://extrudr.com/de/de/page/downloads-for-resellers/`, which links 401 distinct datasheet PDFs:

| Sheet | Path pattern | Per product? |
| --- | --- | --- |
| Technical data sheet | `…/datasheets/tds/tds-<lang>/<product>-TDS-<lang>.pdf` | yes |
| **Material safety data sheet** | `…/datasheets/msds/msds-<lang>/<product>-MSDS-<lang>.pdf` | yes |
| Regulatory information sheet | `…/datasheets/ris/ris-<lang>/<product>-RIS-<lang>.pdf` | yes |
| Additional information sheet | `…/datasheets/ais/extrudr-AIS-<lang>.pdf` | **no — one for the whole range** |
| Chemical resistance sheet | `…/datasheets/crds/extrudr-CRDS-<lang>.pdf` | **no — one for the whole range** |

There is no `sds/`, `rds/` or per-product `crds/` path; those 404. The **MSDS is the document that answers the
question**: its section 3, COMPOSITION, carries a line headed CHEMICAL CHARACTERISTICS. The RIS names no polymer
for any of the eight (it carries food-contact, REACH and migration-limit text only). The AIS and CRDS are
range-wide matrices and name no polymer either. No MSDS of the eight gives a CAS number for any component.

Product pages are at `https://extrudr.com/en/<country>/products/<product>/` (recovered from
`https://extrudr.com/sitemap.xml`; the `/de/de/produkte/…` forms return a shell page). They add real composition
statements for the filled products and are cited below where they do.

### The German editions disagree with the English, for exactly two products

Every MSDS exists in `de` and `en`. For six of the eight the two editions say the same thing. For two they
contradict each other, and they do so as a matched pair:

| Product | EN edition | DE edition |
| --- | --- | --- |
| GreenTEC | 18.11.2024 — **"based on PLA"** | 14.11.2024 — no PLA named |
| GreenTEC Pro CF | 18.11.2024 — no PLA named | 14.11.2024 — **"auf PLA-Basis"** |

The two DE sheets carry each other's composition line, relative to the EN. Since every other DE sheet in the
family (BioFusion, Pearl, Flax, Wood) says "auf PLA-Basis" in agreement with its EN twin, the most economical
reading is that the two GreenTEC-family DE sheets of 14.11.2024 were swapped, and the EN sheets of 18.11.2024
(four days later) are the corrected pair. That is a reading, not a rule — it is offered as a candidate ruling for
`rulings/rulings.csv`, not asserted as fact.

---

## 1. GreenTEC

- **Document**: MATERIAL SAFETY DATA SHEET, GREENTEC, printed 18. 11. 2024
- **URL**: https://s3.extrudr.com/extrudr-media/datasheets/msds/msds-en/greentec-MSDS-en.pdf
- **SHA-256**: `ed65dcb4013c1c992e3bdd10c3e75f88f9e9e2122aafd33fae67a5667824b546`

> 3. COMPOSITION
> CHEMICAL CHARACTERISTICS Biobased batch based on PLA, contains copolyester and additives.

Section 1 of the same sheet: `USE OF PRODUCT Biodegradable polymer compund, suitable for 3D printing filament`.

Counter-document, the German edition:

- **URL**: https://s3.extrudr.com/extrudr-media/datasheets/msds/msds-de/greentec-MSDS-de.pdf
- **SHA-256**: `06e74cf492a7ecfb1675fbb6000c67b7bb75dbd6c775d59659501f844508b06f`, printed 14. 11. 2024

> CHEMISCHE EIGENSCHAFTEN Biologisch abbaubare Charge, enthält Copolyester und Additive.

("Biodegradable batch, contains copolyester and additives" — no base polymer.)

**Settled — PLA**, on the English sheet, which is the later of the two revisions and names the polymer outright.
The "copolyester" is a second component Extrudr does not name, so this is **not** a blend this database can record
as a blend: it is a PLA base with an undisclosed copolyester modifier. Record the conflict with the German
edition as a note or a ruling; do not record the copolyester as a polymer.

Corroborating, not decisive: the GreenTEC RIS
(`dcb8f9b4874bb0aeab6e5828c493af6c276b060c5b5acb4b1b40a121eec2f797`) lists migration limits for **1,4-butanediol
(SML(T) = 5 mg/kg)**, **tetrahydrofuran (SML = 0,6 mg/kg)** and **butadiene (SML = ND, QM = 1 mg/kg)**. Those are
the residual markers of a butanediol-based aliphatic-aromatic copolyester (the PBAT/PBS family). That is
consistent with "contains copolyester"; it does not name the copolyester, and must not be written into the data
as one.

Also worth recording: the product page states a heat distortion resistance of 115 °C and "100% renewable raw
materials, CO2 neutral, oil-free"; the TDS
(`7f3c349fc7bd46f080cdb8910ec24398939b71b0096c179e6f3ec22b2c6153f2`, printed 20. 06. 2024) prints **density 1.3
g/cm³ (ISO 1183)**, shrinkage 0.5 % (ISO 294-4), and **"biodegradable according to DIN EN ISO 14855"**. The MSDS
gives **melting range 180–200 °C**. Note the MSDS of this product still carries the old company address
(Klosterstrasse 13, Lauterach); every other sheet here carries Glaserweg 24, Lustenau.

## 2. GreenTEC Pro

- **Document**: MATERIAL SAFETY DATA SHEET, GREENTEC PRO, printed 23. 02. 2026
- **URL**: https://s3.extrudr.com/extrudr-media/datasheets/msds/msds-en/greentec-pro-MSDS-en.pdf
- **SHA-256**: `98d910edb9944c04fc492c4b440829a9206b6d6ee4ea416ed3456d88c9651538`

> 3. COMPOSITION
> CHEMICAL CHARACTERISTICS Biobased batch containing bio-copolyester and additives.

The German edition of the same date agrees, which makes this the one product where both editions say the same
thing *and* that thing is not a polymer name:

- **URL**: https://s3.extrudr.com/extrudr-media/datasheets/msds/msds-de/greentec-pro-MSDS-de.pdf
- **SHA-256**: `4f9410024be6bff6742620efcbbcb0e340756e83701f4846da03f470f2d93556`

> CHEMISCHE EIGENSCHAFTEN Biobasiernede Charge, die Bio-Copolyester und Additive enthält.

**Narrowed.** This is the newest sheet of all eight (23.02.2026) and it is the only one in the family whose
composition line omits "based on PLA" in **both** languages. That omission looks deliberate rather than
accidental: its siblings of the same template all carry the PLA phrase in both editions.

- Ruled in: a bio-based copolyester as the base resin.
- Ruled out (weakly): PLA as the declared base. Extrudr names PLA for five of these products and declines to name
  it here.
- Not settled: "bio-copolyester" is a class, not a polymer. It cannot become an Estimate identity or a
  `polymers.csv` row.

Supporting physics, for the reviewer only: TDS `760b35ecc10d26502b3f66588ece95100838495a5e4e07242b25c491ab940c81`
(printed 2. 04. 2024) prints **density 1.35 g/cm³**, shrinkage 0.4 %, and the product page claims **160 °C heat
distortion resistance**. A 160 °C HDT is far above anything neat PLA reaches and is not a PLA behaviour; this
supports Extrudr's own refusal to call it PLA-based. The MSDS gives melting range 190–210 °C and density
1.39 g/cm³ — note that the MSDS density (1.39) and the TDS density (1.35) do not agree.

**What would settle it**: a CAS number, a resin trade name, or a revised MSDS section 3 naming the polymer.
None of the five Extrudr document types carries one today. Until then this product stays out.

## 3. GreenTEC Pro CF

- **Document**: MATERIAL SAFETY DATA SHEET, GREENTEC PRO CF, printed 18. 11. 2024
- **URL**: https://s3.extrudr.com/extrudr-media/datasheets/msds/msds-en/greentec-pro-cf-MSDS-en.pdf
- **SHA-256**: `3dcbe2d33fc1228b8a9c39133c6968851febb5ce119e2e3b04ad2a4175b48431`

> 3. COMPOSITION
> CHEMICAL CHARACTERISTICS Biodegradable batch, contains copolyester and additives.

The German edition contradicts it:

- **URL**: https://s3.extrudr.com/extrudr-media/datasheets/msds/msds-de/greentec-pro-cf-MSDS-de.pdf
- **SHA-256**: `eb639dda22f61cd06ca8a108f1297c6f6e6d1b46d156ed524bfbe5be8da9529f`, printed 14. 11. 2024

> CHEMISCHE EIGENSCHAFTEN Biobasiernede Charge auf PLA-Basis, enthält Copolyester und Additive.

**Narrowed, and contested.** Two Extrudr editions of the same sheet disagree about whether this product is
PLA-based. The English says no polymer; the German says PLA.

Two things argue against taking the German at face value:

1. It is the older of the two (14.11.2024 against 18.11.2024).
2. The product is, by Extrudr's own description, GreenTEC Pro plus carbon fibre — and GreenTEC Pro's **newest**
   sheet in both languages declines to call itself PLA-based. A carbon-filled grade of a non-PLA resin should not
   itself be PLA.

The swapped-pair hypothesis above explains the contradiction economically, but it is a reading. **Recommendation:
this product stays out** until Extrudr is asked, or until a revised sheet settles it. Filing it as PLA on the
strength of the older German edition alone would contradict its own parent product.

Worth recording regardless — the **filler percentage is declared** in the TDS
(`648dbe95c949cc3f698fe263f19e64f6b8c888aa338f79b794a17c841280bb12`, printed **27. 03. 2026**, the second-newest
document here):

> The composite material contains 10% carbon fibre, resulting in increased rigidity and heat distortion
> resistance.

TDS density **1.2 g/cm³**, shrinkage 0.2 %. The product page adds that a hardened nozzle is required and that
"Carbon fiber reinforced filaments, including GreenTEC Pro CF, are not certified for food contact" — which is a
direct contradiction of the food-contact status its siblings claim, and is worth a `coverage.csv` row if this
product is ever filed. MSDS melting range 190–210 °C, density 1.39 g/cm³ (again disagreeing with the TDS's 1.2).

## 4. BioFusion

- **Document**: MATERIAL SAFETY DATA SHEET, BIOFUSION, printed 18. 11. 2024
- **URL**: https://s3.extrudr.com/extrudr-media/datasheets/msds/msds-en/biofusion-MSDS-en.pdf
- **SHA-256**: `05f4be63e9e09136f770e028f0a628792eb2f4c54e426d1cfc04e80f63df1452`

> 3. COMPOSITION
> CHEMICAL CHARACTERISTICS Biobased batch based on PLA, contains copolyester and additives.

Section 1 of the same sheet is more specific than its siblings:

> USE OF PRODUCT Biobased copolymer, suitable for 3D printing filament

The German edition agrees (`bb0c563635a71e32ea3083d8b3bb396fe463f58a675362566bc43b8ce0c86bbb`, 14. 11. 2024):
"Biobasiernede Charge auf PLA-Basis, enthält Copolyester und Additive." The RIS
(`08140dba9d123d15cda17da9ffb678020b655b0d17dfd8b4aa24cc466013548f`) repeats "Biobased copolymer".

**Settled — PLA.** Both language editions agree, and the RIS corroborates. The copolyester is again unnamed, so
record PLA as the base with an undisclosed copolyester modifier, not a blend.

Other things the maker states that the database would want: the TDS
(`23ced32eb8b80681944ca2a100edbeec286850eb62383c398d3691a6be5d05e4`, printed 2. 04. 2024) prints its mechanical
values against **ASTM methods, not ISO** — breaking stress ASTM D882, shrinking ASTM D955 (0.3 %), **density ASTM
D792, 1.25 g/cm³**. ASTM D882 is a *thin-film* tensile method; a value taken under it is a film measurement, and
under this database's rules the Specimen type must say so. The MSDS gives melting range 190–230 °C. The product
page adds: "BioFusion has a lower melt flow rate than standard PLA, so it should be printed at reduced speeds and
cooling settings" (recommended 20–40 mm/s, 10–30 % cooling), and that it is **not** recommended for outdoor use.
Unlike its siblings, BioFusion's sheets claim no ISO 14855 biodegradability.

## 5. Pearl

- **Document**: MATERIAL SAFETY DATA SHEET, PEARL, printed 18.11.2024
- **URL**: https://s3.extrudr.com/extrudr-media/datasheets/msds/msds-en/pearl-MSDS-en.pdf
- **SHA-256**: `51dbbb8352bbd9597ce356c7133fd768542dd1e39c43df8333074ef5872a4a39`

> 3. COMPOSITION
> CHEMICAL CHARACTERISTICS Biodegradable batch based on PLA, contains copolyester and additives.

German edition agrees (`62933aa42f9674bdcde61f68bb8ff7db31ec2ef721afbdbfb3a2fe6a7736c8d4`, 14.11.2024):
"Biobasiernede Charge auf PLA-Basis, enthält Copolyester und Additive."

**Settled — PLA.**

The filler is named on Extrudr's own product page, https://extrudr.com/en/at/products/pearl/ :

> PEARL is made from lignin and biopolymer, giving every print a uniquely silky-smooth surface and a distinctive
> pearly finish that catches the light with subtle reflections.

"Biopolymer" names nothing, but **lignin** is a declared filler, and it comes from the maker. The same page states
"It shares good mechanical properties with standard PLA, but with genuinely improved elongation at break and
higher impact resistance" — the maker itself positioning the product against PLA, which supports the MSDS line.

Other maker statements: TDS (`45c135a5a81cea17869cf5e673ba00a13f8f3455f73bf8fe60f96c5b2e92794c`, printed
2. 04. 2024) prints **density 1.25 g/cm³ by ISO 2781**, elongation at break 6.9 % (ISO 527), shrinkage 0.67 %,
and **"Biodegradable (DIN EN ISO 14855)"**. ISO 2781 is a *rubber* density method — an odd choice for a rigid
filament, shared by Flax and Wood, and worth a note wherever the density is transcribed. MSDS melting range
160–200 °C. No heated bed required; not recommended for outdoor use.

## 6. Flax

- **Document**: MATERIAL SAFETY DATA SHEET, FLAX, printed 18.11.2024
- **URL**: https://s3.extrudr.com/extrudr-media/datasheets/msds/msds-en/flax-MSDS-en.pdf
- **SHA-256**: `f5f592695d85a6f30438ce5084e627756769cfffd6f973ace743da1dee1572be`

> 3. COMPOSITION
> CHEMICAL CHARACTERISTICS Biobased batch based on PLA, contains copolyester and additives.

German edition agrees (`4a5d24c1aa058450db44819930eaa943d314553f0e9abcc6445df2bef4333ed2`, 14.11.2024):
"Biobasiernede Charge auf PLA-Basis, enthält Copolyester und Additive."

**Settled — PLA.**

**Correction to the premise: FLAX is not flax-fibre filled.** The name is a surface description, not a
composition. Extrudr's own TDS (`9369384413f53d7b7b03f0ecd3c603bf828b66c446ebd2286214371438ccd1ca`, printed
2. 04. 2024) says:

> FLAX comes from our BIO design range and is made from renewable raw materials. Thanks to the added mineral
> filler, fast […]

and the product page, https://extrudr.com/en/at/products/flax/ , is explicit:

> FLAX is a filament from Extrudr's BIO design range, made from 100% renewable raw materials with added mineral
> fillers.

The same page twice more calls the content mineral ("Despite its mineral filler content…", "Stretches further
before failing than typical mineral-filled materials"). No Extrudr document mentions flax fibre in this product.
The filler is therefore **an unnamed mineral**, and the **percentage is nowhere declared**. That the filler is
mineral is consistent with the TDS **density of 1.45 g/cm³** — the highest of the eight, and well above neat PLA.

The product page also declares a **different compostability standard from the TDS**: the page says "the material
is biodegradable (EN 13432)" and carries a "BIODEGRADABLE (EN 13432)" highlight, while the TDS says
"Biodegradable (DIN EN ISO 14855)". Both are Extrudr's own words; they are different standards and should not be
collapsed into one. Also from the TDS: elongation at break **22.3 %** (ISO 527), density by ISO 2781, no heated
bed required. MSDS melting range 160–200 °C, MSDS density 1.45 g/cm³ (this one agrees with the TDS).

## 7. Wood

- **Document**: MATERIAL SAFETY DATA SHEET, WOOD, printed 18. 11. 2024
- **URL**: https://s3.extrudr.com/extrudr-media/datasheets/msds/msds-en/wood-MSDS-en.pdf
- **SHA-256**: `4ef617c8bebb4afeebae30535f9a5cac1ab643dc87817e02f00ea8ac8602639b`

> 3. COMPOSITION
> CHEMICAL CHARACTERISTICS Biodegradable batch based on PLA, contains copolyester and additives.

German edition agrees (`81db0d4888eeb24c4e5ab4cc7de6f4758f0675b0dadbecaef8ab7d7b3eb9bcb5`, 14. 11. 2024):
"Biobasiernede Charge auf PLA-Basis, enthält Copolyester und Additive."

**Settled — PLA.**

**A defect in the source document that a transcriber must not copy.** The page header, all four page footers and
the filename say WOOD, but section 1 of the English MSDS says:

> TRADE NAME Extrudr BIOFUSION

This is a copy-paste slip in Extrudr's own sheet. It is resolved against the WOOD RIS
(`99377fedd390f22853db6384339a0ef803bcdb4469b0e34f8db8d53752963c03`), whose section 1 reads `TRADE NAME Extrudr
WOOD`, and against the sheet's own header and footers. The document is the WOOD sheet; the trade-name field is
wrong. Anyone transcribing from this MSDS should record the slip rather than the field.

The filler is named by the maker in two places. TDS
(`bc15704f890912ba68877502d6c656a2d7a39f69cbbdd3555df55a95eb5bd3ab`, printed 2. 04. 2024):

> WOOD comes from our BIO design range and consists of renewable raw materials such as lignin and other
> biopolymers. This wood-fibre-reinforced plastic is characterised by exceptional processing properties.

Product page, https://extrudr.com/en/at/products/wood/ , names the species:

> Reinforced with real spruce fiber, it creates a unique, natural wood-like appearance, texture, and even scent,
> not just a printed effect, but a filament with genuine wood content.

So: PLA base, **spruce fibre** reinforcement, plus lignin. The **percentage is nowhere declared**. The page also
distinguishes the mechanism — "Made with real wood fiber, not foaming agents" — which matters for anyone
interpreting the low density. Other maker statements: TDS **density 1.23 g/cm³ (ISO 2781)**, shrinkage not
printed, "Biodegradable (DIN EN ISO 14855)" on the TDS but **"BIODEGRADABLE (EN 13432)"** on the product page —
the same two-standard disagreement as Flax. MSDS melting range **150–270 °C**, by far the widest of the eight.

## 8. XPETG MATT

The base polymer is not in doubt; the filler is the question, and **no Extrudr document answers it**.

**Base polymer — settled, PETG.** MSDS
(https://s3.extrudr.com/extrudr-media/datasheets/msds/msds-en/xpetg-matt-MSDS-en.pdf, SHA-256
`a600925d8e503b4204356369ffaaf8a1b7b3f888f9cfd38b7d0c9bdf3c25d654`, printed 21. 11. 2024), section 1:

> USE OF PRODUCT PETG Copolyester, suitable for 3D printing filament

RIS (`5d5f0cac79cb72b72e8fba13dfe039632884dfec0a51de29d25e38bd2b5db4a3`, printed 28. 08. 2025) spells it out:

> USE OF PRODUCT Polyethylene terephthalate glycol-modified, suitable for 3D printing filament.

**Filler — Nothing found.** The MSDS composition section declares no filler at all:

> 3. COMPOSITION
> CHEMICAL CHARACTERISTICS The polymer contains minor additives such as stabilizers and catalysts. These
> additives are immobilized by the polymer and are not released with normal use.

The German MSDS (`8e32f193f90c4c3857c76a7fd262055f9c20a6dfb9ea339ef051cb43ecdc8157`, 14. 11. 2024) says the same
and no more: "Das Polymer enthält geringfügige Zusätze wie Stabilisatoren und Katalysatoren." Stabilisers and
catalysts are trace additives; they cannot account for a density 0.11–0.14 g/cm³ above neat PETG.

Where I looked, and what each said:

| Document | SHA-256 | On the filler |
| --- | --- | --- |
| TDS, printed 20. 06. 2024 | `011b26032f639cce5969262a139ca5cea7e9b03e12daab9b5b905f1ca0d84cb3` | nothing; "Matte surface", "100% recyclable" |
| MSDS en, 21. 11. 2024 | `a600925d8e503b4204356369ffaaf8a1b7b3f888f9cfd38b7d0c9bdf3c25d654` | stabilizers and catalysts only; no CAS |
| MSDS de, 14. 11. 2024 | `8e32f193f90c4c3857c76a7fd262055f9c20a6dfb9ea339ef051cb43ecdc8157` | as above |
| RIS, 28. 08. 2025 | `5d5f0cac79cb72b72e8fba13dfe039632884dfec0a51de29d25e38bd2b5db4a3` | names the base polymer; no filler |
| AIS (range-wide), 04. 09. 2024 | `624c091354123f45fef74b52e18ee77542e17f061f6e17b8fb305c4f6fcb2085` | colour/FDA matrix; no composition |
| CRDS (range-wide) | `ae987ed7eaa553db13483197049df52cc5721582b1da4e6b4b0f201fdb3262fa` | resistance matrix; no composition |
| Product page | https://extrudr.com/en/at/products/xpetg-matt/ | "adds a refined matte surface finish"; no filler |

No CAS number appears in any of them. The product page's positioning — "XPETG MATT takes standard PETG's balance
of mechanical and optical properties and adds a refined matte surface finish" and "100% Recyclable" — describes
the effect and never the cause.

**A contradiction between two Extrudr documents that must be recorded.** The premise of this investigation was the
published density of 1.41 g/cm³. That figure is real, and it is the TDS's:

> Density ISO 1183-1/A g/cm³ 1,41

But the MSDS of the same product prints:

> DENSITY 1.30g/cm³

1.30 g/cm³ is within neat PETG's range and implies no filler; 1.41 g/cm³ is above it and implies one. **The
evidence that the product carries an undeclared filler rests entirely on one of two disagreeing Extrudr
documents.** Before any filler is inferred, this disagreement should be resolved or recorded — a
`coverage.csv` row, or a question to the maker. Note the MSDS is the later document (21. 11. 2024 against the
TDS's 20. 06. 2024).

**Conclusion: Nothing found** on the filler. XPETG MATT can be filed as PETG on the strength of the MSDS and RIS,
but nothing Extrudr publishes declares a filler, and the density evidence that one exists is itself contested.
**What would settle it**: a revised MSDS section 3 with a CAS number, or the maker answering directly.

Other maker values from the TDS worth having: **Shore hardness ISO 868/D, 76 Shore D**; HDT/B (ISO 15075) 67 °C;
VICAT A (ISO 306) 85 °C; flammability UL 94 V-2 at 3,2 mm; tensile modulus 3100 ± 46 MPa; notched impact (ISO 180)
1,7 ± 0,4 kJ/m²; shelf life 2 years. The product page claims it holds shape "at temperatures up to 85–95 °C",
which is the VICAT figure, not the HDT — the TDS's own HDT is 67 °C. Do not let the page's claim displace the
sheet's number.

---

## Findings that apply to the whole Extrudr corpus, not just these eight

**1. Every Extrudr TDS value is an injection-moulded specimen.** The range-wide Additional Information Sheet
(https://s3.extrudr.com/extrudr-media/datasheets/ais/extrudr-AIS-en.pdf, SHA-256
`624c091354123f45fef74b52e18ee77542e17f061f6e17b8fb305c4f6fcb2085`, printed 04. 09. 2024), section 4, states:

> To determine a specific value for the technical data sheets, standardized test specimen are being used. These
> are designed and manufactured according to the specific regulation (e.g. ISO 527 oder ISO 179). The test
> specimen are manufactured through **injection moulding** and are tested afterwards. The analysis is conducted by
> an external entity.

Under this repository's rules, a value taken on an injection-moulded specimen is Specimen type **"Raw material
value"**, not a printed value. This sentence is the maker's own blanket statement covering every product in the
range, so it applies to every Extrudr measurement already in the database, not only to these eight. **This is
worth checking against what has already been transcribed in batch b07 and earlier Extrudr batches.** The same
section adds that the values "are for comparison purposes only" and that "Product properties are subject to
change without prior announcement".

**2. The compostability standard differs between the TDS and the product page.** Flax and Wood are declared
"Biodegradable (DIN EN ISO 14855)" on their TDS and "BIODEGRADABLE (EN 13432)" on their product page. These are
different standards — ISO 14855 is a test method for aerobic biodegradation, EN 13432 a compostability
specification. Both are maker statements. Record whichever document the value is taken from; do not merge them.
The range-wide AIS states only the ISO 14855 form.

**3. MSDS and TDS densities disagree for several products.** GreenTEC Pro (MSDS 1.39 vs TDS 1.35), GreenTEC Pro CF
(MSDS 1.39 vs TDS 1.2 — the MSDS appears to carry GreenTEC Pro's figure) and XPETG MATT (MSDS 1.30 vs TDS 1.41).
The TDS is the document with a named test method and should normally win, but the XPETG MATT case matters because
the whole filler question turns on it.

**4. Pearl, Flax and Wood print density by ISO 2781**, a rubber test method, rather than the ISO 1183 used for
GreenTEC and XPETG MATT. Worth a note wherever those densities are transcribed.

**5. The MSDS is the only Extrudr document type that states composition.** If further products in the corpus
cannot be filed for want of a base polymer, the MSDS at
`…/datasheets/msds/msds-en/<product>-MSDS-en.pdf` is where to look first, and the German edition at
`msds-de/<product>-MSDS-de.pdf` is worth reading beside it — as GreenTEC and GreenTEC Pro CF show, the two do not
always agree.

## Summary

| # | Product | Outcome | Base polymer | Filler / notes |
| --- | --- | --- | --- | --- |
| 1 | GreenTEC | **Settled** | PLA (EN MSDS) | unnamed copolyester; DE edition omits PLA |
| 2 | GreenTEC Pro | **Narrowed** | not named — "bio-copolyester" | both editions agree on the non-answer; 160 °C HDT argues against PLA |
| 3 | GreenTEC Pro CF | **Narrowed, contested** | EN names none, DE says PLA | 10 % carbon fibre declared; stays out |
| 4 | BioFusion | **Settled** | PLA (both editions) | ASTM/film test methods; no ISO 14855 claim |
| 5 | Pearl | **Settled** | PLA (both editions) | lignin, no percentage |
| 6 | Flax | **Settled** | PLA (both editions) | **mineral** filler, not flax fibre; no percentage |
| 7 | Wood | **Settled** | PLA (both editions) | spruce fibre + lignin, no percentage; MSDS trade-name slip |
| 8 | XPETG MATT | **Settled** (base) / **Nothing found** (filler) | PETG | no filler declared anywhere; TDS 1.41 vs MSDS 1.30 g/cm³ |
