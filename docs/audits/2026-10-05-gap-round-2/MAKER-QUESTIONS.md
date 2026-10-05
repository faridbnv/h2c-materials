# Questions for filament makers

A deduplicated list of the questions only a filament maker can answer, built on 2026-10-05 for the owner. **Nothing has been sent to anyone.** Sending is outward-facing and the owner's call (OPEN-PROBLEMS s29). The same list, with the evidence behind each question, is `MAKER-QUESTIONS.csv` beside this file.

Sources: the 255 vendor handoffs of `archive/research-2026-09-26/owner-handoffs.csv` (kept only where the record they name is still unsettled in `data/tables/`), the contradictions and maker questions of OPEN-PROBLEMS s4, s15, s21, s23 to s26, s28, s29 and s30, and the 28 products of `docs/audits/2026-10-04-reader-round/STILL-MISSING.csv` that held no nozzle or bed in `profiles.csv`. The print-setting questions of the 12 of them, and of 3DXPRO LG PETG, that batch b44's makers' pages gave a nozzle and a bed (`build/snapshot/print.csv`, 2026-10-05) were dropped. Where one question applies to several of a maker's products it is one numbered item with the products listed under it.

Priority: **high** = the answer changes a selection answer or a print gate; **medium** = a property or a test condition; **low** = wording or a claim with no test behind it.

**125 questions to 36 makers**: 52 high, 59 medium, 14 low.

Left out on purpose: the four BASF Styrolux rows (SBC-4 to SBC-7: they ask the owner to decide `polymers.csv`, not a maker); handoff rows whose record now states its condition or load (4 values), whose grade is retired (5 handoffs), or whose gap a printed value now fills (1); owner-ruling rows (127) and not-retrieved rows (9) of the handoff file, which are not maker questions. Six products in the print-guidance block also have a product page or archive lead in `site-leads.csv` (gap round 2, not yet applied): they are marked, and the question stands until the lead is applied.

## Counts by maker

| Maker | High | Medium | Low | Total |
|---|---:|---:|---:|---:|
| 3D-Fuel | 1 | 0 | 0 | 1 |
| 3D4Makers | 1 | 0 | 0 | 1 |
| 3DJake | 1 | 2 | 1 | 4 |
| 3DXTECH | 4 | 2 | 0 | 6 |
| Bambu Lab | 0 | 2 | 2 | 4 |
| BigRep | 1 | 0 | 0 | 1 |
| Braskem | 0 | 1 | 0 | 1 |
| colorFabb | 2 | 5 | 1 | 8 |
| CreatBot | 0 | 1 | 0 | 1 |
| Dow | 0 | 1 | 0 | 1 |
| Eryone | 0 | 1 | 0 | 1 |
| eSUN | 2 | 3 | 1 | 6 |
| Extrudr | 2 | 4 | 1 | 7 |
| Fiberlogy | 4 | 2 | 0 | 6 |
| Filament2Print | 2 | 2 | 0 | 4 |
| Fillamentum | 2 | 2 | 1 | 5 |
| FormFutura | 2 | 1 | 1 | 4 |
| iSANMATE | 4 | 1 | 0 | 5 |
| LEHVOSS | 0 | 3 | 0 | 3 |
| Markforged | 1 | 0 | 0 | 1 |
| MatterHackers | 1 | 0 | 0 | 1 |
| Nanovia | 3 | 3 | 1 | 7 |
| NinjaTek | 1 | 0 | 0 | 1 |
| Polymaker | 1 | 5 | 2 | 8 |
| Protopasta | 0 | 1 | 0 | 1 |
| Prusa Research | 1 | 0 | 0 | 1 |
| purefil (Fabru) | 2 | 1 | 1 | 4 |
| Raise3D | 1 | 2 | 0 | 3 |
| Recreus | 1 | 1 | 0 | 2 |
| SIDDAMENT | 2 | 0 | 0 | 2 |
| Siraya Tech | 1 | 3 | 0 | 4 |
| Spectrum | 4 | 4 | 0 | 8 |
| Stratasys | 1 | 2 | 0 | 3 |
| SUNLU | 2 | 2 | 1 | 5 |
| UltiMaker | 1 | 1 | 1 | 3 |
| Yousu | 1 | 1 | 0 | 2 |
| **All** | 52 | 59 | 14 | 125 |

## Questions by maker

### 3D-Fuel

Contact hint: not in sources.csv (sheets on cdn.shopify.com)

1. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - PETG (G020-31): Elongation at break 30 %
    - Pro PETG (G020-36): Elongation at break 250 %
    - Pro PCTG (G088-04): Elongation at break 340 %
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer. For Pro PCTG the sheet says 'measurements from injection molded and 3D printed parts' without saying which (R-3D-FUEL-3D-Fuel-Pro-PCTG-TDS-9-2-25).

### 3D4Makers

Contact hint: 3d4makers.com

1. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - PETG (G020-34): Elongation at break 31 %
    - ABS (G027-28): Tensile modulus 2280 MPa
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.

### 3DJake

Contact hint: 3djake.com

1. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - ecoPLA CF (G018-19): Tensile modulus 4300 MPa
    - easyPETG (G020-66): Elongation at break 31 %
    - PCTG (G088-08): Elongation at break 220 %
    - PET-G PROGRAFEN GRAPHENE LIGHT (G153-02): Tensile modulus 2.4 GPa; Elongation at break 4.57 %
    - PLA PROGRAFEN GRAPHENE LIGHT (G155-01): Tensile modulus 3.6 GPa; Elongation at break 4.19 %
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.
2. **[medium]** Does the product below need a heated chamber or enclosure (and at what temperature), and what drying schedule do you recommend? Your sheet or page gives the nozzle and bed only.
    - ABS (G027-34): not stated chamber, drying
    - Why we ask: The chamber and drying are the print-guidance fields the maker's site did not state, so the chamber gate and the drying need stay unknown.
3. **[medium]** For the products below, do you hold values for the listed properties measured on 3D-printed specimens (with the build orientation, nozzle temperature and, for HDT, the load)? If your sheet's figure comes from an injection-moulded or unspecified bar, please say so.
    - PROGRAFEN PET-G GRAPHENE STRONG (G153-01): density, heat deflection temperature (HDT)
    - PET-G PROGRAFEN GRAPHENE LIGHT (G153-02): density, heat deflection temperature (HDT)
    - PLA PROGRAFEN GRAPHENE LIGHT (G155-01): density, heat deflection temperature (HDT)
    - PLA PROGRAFEN GRAPHENE STRONG (G155-02): density, heat deflection temperature (HDT)
    - Why we ask: The sheet prints no value for the property, or one whose bar is not described, so the product has no comparable printed figure for it.
4. **[low]** Who manufactures PROGRAFEN today (the portfolio names Spectrum after February 2024) and which grade carries the semi-transparent application, given the portfolio lists Deep black? Which revision and specimen does the older AGP2023XY table belong to?
    - Product: PROGRAFEN PET-G GRAPHENE STRONG (G153-01); PET-G PROGRAFEN GRAPHENE LIGHT (G153-02); PLA PROGRAFEN GRAPHENE LIGHT (G155-01); PLA PROGRAFEN GRAPHENE STRONG (G155-02)
    - Why we ask: The grade's recorded manufacturer, its colour caveat and the specimen custody of the older table are unsettled.

### 3DXTECH

Contact hint: 3dxtech.com

1. **[high]** Is CarbonX Carbon Fiber High Temp Nylon (HTN) 106 MPa tensile and 200 C HDT (benefits list) or 87 MPa and 240 C (description and datasheet)?
    - Product: CarbonX Carbon Fiber High Temp Nylon (HTN) (G070-05)
    - Why we ask: One page prints two sets of strength and heat deflection values.
2. **[high]** Which nozzle temperature, bed temperature, chamber/enclosure temperature and drying schedule do you recommend for the product(s) below? Your data sheet prints no print settings.
    - Triton PC/ABS Model Material (G094-12): missing nozzle, bed
    - 3DXSTAT ESD-TPC (90A) (G114-01): missing nozzle, bed, chamber, drying
    - TriStat ESD-PC Model Material (G116-02): missing nozzle, bed, chamber, drying
    - 3DXSTAT ESD-PEKK (G115-01): missing nozzle, bed, chamber, drying
    - ThermaX TPI (G121-01): missing nozzle, bed, chamber, drying
    - Why we ask: Without a nozzle and bed window the print gate for the product reads unknown, so it can neither pass nor fail a printer requirement.
3. **[high]** Where your page or sheet says a heated chamber or enclosure is recommended, what chamber temperature (or range) do you recommend for each product below?
    - Triton ABS Model Material (G027-57): profile P1648
    - CarbonX CF ABS (G029-01): profile P0135, P1289, P1636
    - 3DXSTAT ESD ABS (G030-01): profile P0136, P1635
    - 3DXMAX ASA (G031-05): profile P1633
    - CarbonX CF ASA (G033-02): profile P1637
    - ezPC Polycarbonate (G035-04): profile P1646
    - 3DXMAX Polycarbonate (G035-05): profile P1634
    - CarbonX CF PC (G037-01): profile P0137, P1295, P1642
    - CarbonX Carbon Fiber ezPC Polycarbonate (G037-04): profile P1638
    - CarbonX CF PA12 (G053-01): profile P0140, P1292, P1640
    - 3DXSTAT ESD PA12 (G064-01): profile P1395
    - CarbonX Carbon Fiber High Temp Nylon (HTN) (G070-05): profile P1639
    - Triton PC/ABS Model Material (G094-12): profile P1819
    - FLUORX PVDF (G096-01): profile P0150, P1290, P1416
    - THERMAX PEI 1010 (G099-01): profile P0153
    - THERMAX PSU (G100-01): profile P0154
    - THERMAX PES (G101-01): profile P0155
    - THERMAX PPSU (G102-01): profile P0156
    - 3DXSTAT ESD-PC (G116-01): profile P1413
    - CarbonX Carbon Fiber Ultem 9085 (G118-02): profile P1859
    - 3DXSTAT ESD-Ultem 1010 (G123-01): profile P1858
    - CarbonX Carbon Fiber PC/ABS (G128-01): profile P1399
    - Why we ask: 'Recommended' with no temperature cannot be checked against the H2C's 65 C chamber, so the chamber gate reads unknown (owner decision of 2026-10-05: it waits for the maker to print one).
4. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - WearX Wear Resistant PA6 Copolymer (G049-09): Tensile modulus 2458 MPa; Elongation at break 18 %
    - 3DXSTAT ESD PA12 (G064-01): Tensile modulus 6900; Elongation at break 3.8
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.
5. **[medium]** Does the product below need a heated chamber or enclosure (and at what temperature), and what drying schedule do you recommend? Your sheet or page gives the nozzle and bed only.
    - 3DXMAX PC/ASA (G119-01): not stated chamber, drying
    - Why we ask: The chamber and drying are the print-guidance fields the maker's site did not state, so the chamber gate and the drying need stay unknown.
6. **[medium]** For the products below, do you hold values for the listed properties measured on 3D-printed specimens (with the build orientation, nozzle temperature and, for HDT, the load)? If your sheet's figure comes from an injection-moulded or unspecified bar, please say so.
    - 3DXSTAT ESD-TPU (90A) (G126-01): tensile modulus
    - Why we ask: The sheet prints no value for the property, or one whose bar is not described, so the product has no comparable printed figure for it.

### Bambu Lab

Contact hint: bambulab.com

1. **[medium]** For ASA Aero, the TDS specimens were printed at 225 C, below the 240-280 C recommended nozzle window. Which foaming state are the specimens in, what density does each print setting give, and do the annealing instructions for ASA apply to ASA Aero?
    - Product: ASA Aero (G032-01)
    - Why we ask: The specimens are off-recipe and the foam state is unstated, so the values cannot be tied to a print recipe.
2. **[medium]** On the PLA-CF data sheet, the third impact row repeats the XY label and gives no notch. Is it Z, XY, notched or unnotched?
    - Product: PLA-CF (G018-01)
    - Why we ask: The row cannot be placed in a direction or notch class.
3. **[low]** Your PA6-GF page says drying 5-12 h while the TDS says 6-12 h; and your PAHT-CF and TPU 95A HF pages contain wood-fibre wording. Which is correct?
    - Product: PA6-GF (G051-01); PAHT-CF (G048-01); TPU 95A HF (G041-01)
    - Why we ask: Page and TDS disagree; copied wording is an attribution problem.
4. **[low]** What are the report identification and print settings behind the PC FR UL94 result; what certificate stands behind the PETG Basic GREENGUARD badge; and at what load and duration is PPA-CF rated '227 C' prolonged use and underwater use?
    - Product: PC FR (G036-01); PETG Basic (G021-01); PPA-CF (G070-01)
    - Why we ask: The claims name no printed-part test, certificate or service load, so none can be used for selection.

### BigRep

Contact hint: bigrep.com

1. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - ABS (G027-23): Tensile modulus 1400 MPa
    - PRO HT (G168-01): Tensile modulus 3100 MPa
    - HI-TEMP CF (G169-02): Tensile modulus 7000 MPa
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.

### Braskem

Contact hint: braskem.com

1. **[medium]** For FL900PP-CF, which bed temperature applies to a plain build plate: 80 C with PP adhesive or 20-40 C with spray? Are both recommended?
    - Product: FL900PP-CF (G083-02)
    - Why we ask: The sheet prints a recommended and an alternate bed; the profile holds the first as required.

### colorFabb

Contact hint: colorfabb.com

1. **[high]** Were the mechanical values on the data sheet for the product below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - PA-CF low warp (G165-01): Elongation at break 2,0 %
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.
2. **[high]** In your Print Support tables, which nozzle-and-speed values are right where the duplicate tables disagree (speed and volumetric flow), what is the PA-CF Low Warp bed temperature (the cell is malformed), and what is nGen Flex's print speed (the cell is malformed)?
    - Product: PA-CF low warp (G165-01); nGen_FLEX (G143-01)
    - Why we ask: The cells are unreadable, so a bed window for PA-CF Low Warp cannot be recorded.
3. **[medium]** For the products below, do you hold values for the listed properties measured on 3D-printed specimens (with the build orientation, nozzle temperature and, for HDT, the load)? If your sheet's figure comes from an injection-moulded or unspecified bar, please say so.
    - Lightweight PET (G141-01): heat deflection temperature (HDT)
    - Lightweight PET FLEX (G141-02): heat deflection temperature (HDT)
    - PA-CF low warp (G165-01): heat deflection temperature (HDT), tensile modulus
    - Why we ask: The sheet prints no value for the property, or one whose bar is not described, so the product has no comparable printed figure for it.
4. **[medium]** Does the product below need a heated chamber or enclosure (and at what temperature), and what drying schedule do you recommend? Your sheet or page gives the nozzle and bed only.
    - PET ULTRA HIGH SPEED (G066-04): not stated chamber, drying
    - Why we ask: The chamber and drying are the print-guidance fields the maker's site did not state, so the chamber gate and the drying need stay unknown.
5. **[medium]** For the mechanical and thermal figures in your Print Support document, what were the specimen form (moulded or printed), build direction, conditioning, test standards, and the load for the combined HDT/Vicat?
    - Product: PLA/PHA (G145-01); nGen CF10 (G142-01); nGen_FLEX (G143-01); PA-CF low warp (G165-01)
    - Why we ask: None of these is printed there, so no figure can be admitted as a comparable measurement.
6. **[medium]** Which base polymer is colorFabb Woodfill Fine made from? Is it the FKuR PLA/wood-fibre trial grade that matched the description on the retrieved sheet?
    - Product: Woodfill Fine (not yet in the database)
    - Why we ask: No filing as a PLA blend can be made without a maker statement; the FKuR sheet is resin evidence, not filament data.
7. **[medium]** Is nGen made from Eastman Amphora AM3300 (as your nGen page and printing guide say) or HT3300 (as your TDS v2.0 says)?
    - Product: nGen (G092-02)
    - Why we ask: Two maker documents name different resins, so the polymer identity and its thermal values are unsettled.
8. **[low]** Is the 121 C steam-sterilisation claim and the FDA food-contact footer for nGen Flex backed by a certificate or a test of printed parts, and for which cycle and wall thickness?
    - Product: nGen_FLEX (G143-01)
    - Why we ask: A resin-level claim does not establish printed-part sterilisation or food contact.

### CreatBot

Contact hint: creatbot.com

1. **[medium]** For UltraPA, which nozzle, bed and drying windows are right where your table and your FAQ disagree? Which notch does the 9.74 Charpy value refer to? And what duration, method and specimen stand behind the 2.595 % water absorption at 25 C / 55 % RH?
    - Product: Ultra PA (G164-09)
    - Why we ask: The table and FAQ disagree on the print and drying windows, and the Charpy and water-absorption figures lack their conditions.

### Dow

Contact hint: not in sources.csv (sheet on cdn.shopify.com)

1. **[medium]** For the products below, do you hold values for the listed properties measured on 3D-printed specimens (with the build orientation, nozzle temperature and, for HDT, the load)? If your sheet's figure comes from an injection-moulded or unspecified bar, please say so.
    - EVOLV3D OBC (G086-01): tensile modulus
    - Why we ask: The sheet prints no value for the property, or one whose bar is not described, so the product has no comparable printed figure for it.

### Eryone

Contact hint: eryone.com

1. **[medium]** On the Light Weight PLA sheet, is the X-Z elongation unit printed as 'MPa' a typing error for '%'?
    - Product: Light Weight PLA (G017-06)
    - Why we ask: The unit and the quantity disagree, so the figure cannot be trusted as an elongation.

### eSUN

Contact hint: esun3d.com

1. **[high]** Your ABS+ notice of 2026-06-15 describes a 2025 formulation change (89 C / 33 MPa), your product page prints 73 C / 40.12 MPa XY / 14.94 MPa Z, and the download still serves the November 2021 V4.0 injection-moulded sheet. Which formulation, batch, specimen and sheet revision does each figure belong to?
    - Product: ABS+ (G027-22)
    - Why we ask: Three documents give three sets of values for the same product name, and the heat deflection drives the warm-environment answer.
2. **[high]** Does PLA Clear need a hardened nozzle? The database inherited that statement from eStars-PLA's sheet (luminous pigment), but PLA Clear's own recipe names no nozzle.
    - Product: PLA Clear (G001-146)
    - Why we ask: A hardened-nozzle requirement changes the nozzle gate for a clear PLA; the owner's rule is to read a sibling only where the product holds no profile of its own.
3. **[medium]** For the products below, do you hold values for the listed properties measured on 3D-printed specimens (with the build orientation, nozzle temperature and, for HDT, the load)? If your sheet's figure comes from an injection-moulded or unspecified bar, please say so.
    - TPU LW (G150-02): tensile modulus
    - ePA CF (G156-01): tensile modulus
    - Why we ask: The sheet prints no value for the property, or one whose bar is not described, so the product has no comparable printed figure for it.
4. **[medium]** For TPU-64D, which drying do you recommend: 80 C for 4-8 h (old), 55 C for more than 4 h (current) or 60 C for more than 8 h (generic)? And what duration, method and specimen stand behind the '<60 C water environment' wording?
    - Product: TPU-64D (G039-44)
    - Why we ask: Three schedules are on record and the water wording has no test conditions, so neither drying nor a hydrolysis limit can be settled.
5. **[medium]** Were the tensile and flexural figures printed on the ePLA-Silk Rainbow data sheet measured on injection-moulded bars, or on printed bars in the Z and XY orientations your product page labels them with?
    - Product: ePLA-Silk Rainbow (G008-12)
    - Why we ask: The sheet shows moulded-bar figures and the page labels the same numbers Z and XY; an 11.1 MPa tensile value is flagged because it would only be credible for a Z bar.
6. **[low]** What are the correct units of PETG-ESD surface resistance on your sheet and page (ohm per square, ohm, or ohm per metre)?
    - Product: PETG-ESD (G026-07)
    - Why we ask: The sheet prints 'ohm/m' and 'ohm' for the same quantity.

### Extrudr

Contact hint: extrudr.com

1. **[high]** On the FLEX MEDIUM MATT page, elongation at break prints 420 % and tensile strength at yield 34 MPa, while the data sheet prints 6.9 % and 470 N/mm2. Which figures are the product's?
    - Product: FLEX MEDIUM MATT (G039-14)
    - Why we ask: The sheet's values are flagged physically implausible and back nothing; without the maker's word the TPU has no elongation or strength and cannot answer Flexible component.
2. **[high]** At which load (0.45 MPa or 1.8 MPa; ISO 75 method B or A) and on what kind of bar was the heat deflection temperature printed for the product below?
    - PLA BASIC CF (G018-07): HDT 55 °C
    - Why we ask: The sheet prints a heat deflection temperature without its load, so it cannot be compared with a warm-environment requirement, which is set at a stated load.
3. **[medium]** Your DuraPro ABS CF and DuraPro PC/PBT CF product pages print property tables that differ from the data sheets (for example ABS CF tensile modulus 4000 MPa on the page, 2850 MPa on the sheet). Is the page a newer formulation or a newer test method, and from which revision?
    - Product: DURAPRO ABS CF (G029-03); DURAPRO PC-PBT CF (G131-01)
    - Why we ask: Neither table can be recorded or discarded without knowing whether they describe the same product.
4. **[medium]** What drying do you recommend for FLEX HARD CF: 6 h at 60 C (your FAQ and catalogue) or 12 h (the settings table on the page)?
    - Product: FLEX HARD CF (G129-02)
    - Why we ask: The page disagrees with itself; nothing is averaged.
5. **[medium]** For the products below, do you hold values for the listed properties measured on 3D-printed specimens (with the build orientation, nozzle temperature and, for HDT, the load)? If your sheet's figure comes from an injection-moulded or unspecified bar, please say so.
    - FLEX MEDIUM ESD (G126-02): tensile modulus
    - Why we ask: The sheet prints no value for the property, or one whose bar is not described, so the product has no comparable printed figure for it.
6. **[medium]** For PETG, is the 60 C, 0 to 6 h drying a requirement or optional, and when is each needed?
    - Product: PETG (G020-17)
    - Why we ask: The schedule is held because the compiled drying fields mean 'required'; optional guidance cannot be shown faithfully without the maker's reading.
7. **[low]** What is the minimum nozzle diameter you recommend for DuraPro ASA CF, ASA GF, ABS CF and PA6 CF: the generic 0.4 mm of the recipe heading, or the 0.5 mm / 0.6 mm of the reinforced-product advice?
    - Product: DURAPRO ASA CF (G033-05); DURAPRO ASA GF (G034-05); DURAPRO ABS CF (G029-03); DURAPRO PA6 CF (G050-05)
    - Why we ask: The heading and the advice name different nozzle sizes.

### Fiberlogy

Contact hint: fiberlogy.com

1. **[high]** Which polymer is FiberFlex Aero: the 'CPE ANTIBAC' your sheet's boilerplate names, or the copolyester elastomer (TPC/TPEE) of FiberFlex 40D, whose table the sheet reprints? What are the values for the foamed product?
    - Product: FiberFlex Aero (G134-01)
    - Why we ask: The sheet's table equals FiberFlex 40D's value for value and says 'for the unfoamed material', so the product's polymer, and the material it belongs to, cannot be settled from any document.
2. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - FiberWood (G014-20): Tensile modulus 3600 MPa
    - PET-G VO (G020-67): Elongation at break 40 %
    - EASY PET-G (G020-68): Elongation at break 29 %
    - R PET-G (G020-71): Elongation at break 29 %
    - PETG+CF (G024-23): Tensile modulus 9000 MPa
    - R ABS (G027-52): Tensile modulus 1750 MPa
    - ABS (G027-53): Tensile modulus 2300 MPa
    - ABS PLUS (G027-54): Tensile modulus 1720 MPa
    - Nylon PA12 (G052-06): Tensile modulus 1400 MPa; Elongation at break 50 %
    - R Nylon (G052-07): Tensile modulus 1400 MPa; Elongation at break 50 %
    - Nylon PA12+CF15 (G053-16): Elongation at break 5 %
    - PP (G082-10): Tensile modulus 700 MPa
    - R PP (G082-13): Tensile modulus 1100 MPa
    - PCTG (G088-07): Elongation at break 220 %
    - CPE ANTIBAC (G089-02): Elongation at break 185 %
    - CPE HT (G089-05): Elongation at break 200 %
    - FiberSmooth (G093-06): Tensile modulus 3050 MPa
    - PC/ABS (G094-11): Tensile modulus 2000 MPa
    - PETG+PTFE (G109-02): Tensile modulus 1850 MPa; Elongation at break 100 %
    - PCTG+GF10 (G110-03): Tensile modulus 3400 MPa; Elongation at break 8 %
    - FiberFlex CF (G129-07): Tensile modulus 200 MPa; Elongation at break 15 %
    - FiberFlex Aero (G134-01): Elongation at break 700 %
    - PCTG+CF10 (G144-03): Elongation at break 5.0 %
    - PLA MINERAL (G158-01): Tensile modulus 3500 MPa; Elongation at break 23 %
    - FiberFlex 30D (G167-03): Elongation at break 870 %
    - MattFlex 40D (G167-04): Elongation at break 600 %
    - FiberFlex 40D (G167-06): Elongation at break 700 %
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.
3. **[high]** Where your page or sheet says a heated chamber or enclosure is recommended, what chamber temperature (or range) do you recommend for each product below?
    - Nylon PA12 (G052-06): profile P1303, P1475
    - Why we ask: 'Recommended' with no temperature cannot be checked against the H2C's 65 C chamber, so the chamber gate reads unknown (owner decision of 2026-10-05: it waits for the maker to print one).
4. **[high]** Does Nylon PA12+CF15 need an enclosed, heated chamber (your page prose recommends one) or not (your table says enclosure not required)?
    - Product: Nylon PA12+CF15 (G053-16)
    - Why we ask: The table and the prose disagree, so the chamber gate cannot be settled.
5. **[medium]** For the products below, do you hold values for the listed properties measured on 3D-printed specimens (with the build orientation, nozzle temperature and, for HDT, the load)? If your sheet's figure comes from an injection-moulded or unspecified bar, please say so.
    - PETG+PTFE (G109-02): heat deflection temperature (HDT)
    - ASA+AF (G113-03): heat deflection temperature (HDT)
    - FiberFlex Aero (G134-01): tensile modulus
    - Why we ask: The sheet prints no value for the property, or one whose bar is not described, so the product has no comparable printed figure for it.
6. **[medium]** Was the polypropylene heat deflection temperature measured at 1.8 MPa (as your data sheet prints) or at 0.45 MPa (as your product page prints)?
    - Product: PP (G082-10)
    - Why we ask: The sheet and the page print the same 51 C at two different loads.

### Filament2Print

Contact hint: filament2print.com

1. **[high]** Which nozzle temperature, bed temperature, chamber/enclosure temperature and drying schedule do you recommend for the product(s) below? Your data sheet prints no print settings.
    - KOLTRON (G096-03): missing nozzle, bed, chamber, drying
    - Why we ask: Without a nozzle and bed window the print gate for the product reads unknown, so it can neither pass nor fail a printer requirement.
2. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - PETG (G020-63): Elongation at break 18.268 % (TDS prints "18,268" with European decimal separator)
    - BioFil - PCL (G149-04): Tensile modulus 350 MPa
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.
3. **[medium]** Which polymer is the binder in Nuterials Jecto, and is a 1.75 mm filament (not only pellets) available?
    - Product: Nuterials Jecto (not yet in the database)
    - Why we ask: Walnut-shell and natural-binder words do not identify a polymer family, so the product cannot be filed.
4. **[medium]** Which base polymer is the iglidur A350 3D-printing filament (the sheet and igus material page name none)?
    - Product: iglidur A350 (igus 3D filament) (not yet in the database)
    - Why we ask: The product cannot be filed under a polymer without one, so it cannot enter any material.

### Fillamentum

Contact hint: fillamentum.com

1. **[high]** Where your page or sheet says a heated chamber or enclosure is recommended, what chamber temperature (or range) do you recommend for each product below?
    - Nylon AF80 Aramid (G154-01): profile P1394
    - Why we ask: 'Recommended' with no temperature cannot be checked against the H2C's 65 C chamber, so the chamber gate reads unknown (owner decision of 2026-10-05: it waits for the maker to print one).
2. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - PETG (G020-28): Elongation at break 120 %
    - Fishy Filaments’ Porthcurno (G049-05): Tensile modulus 2200 MPa; Elongation at break 51 %
    - Nylon CF15 Carbon (G053-14): Elongation at break 103 %
    - PP 2320 (G082-07): Tensile modulus 1400 MPa
    - CPE HG100 (G089-01): Elongation at break 150 %
    - PC/ABS (G094-06): Tensile modulus 2000 MPa
    - Vinyl 303 (G135-02): Elongation at break 13,1 %
    - NonOilen (G146-01): Tensile modulus 1900 MPa; Elongation at break 7.7 %
    - Nylon AF80 Aramid (G154-01): Tensile modulus 510 MPa; Elongation at break 5,8 %
    - Flexfill TPE 90A (G167-02): Elongation at break 250 %
    - Flexfill TPE 96A (G167-11): Elongation at break 150 %
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.
3. **[medium]** What drying temperature and time do you recommend: for Porthcurno ('more than 5 h at 80 C', is 5 h a minimum and what is typical?), and for CPE HG100 (guide 75 C, minimum 5 h, against older 3 h and 4 h schedules)?
    - Product: Fishy Filaments’ Porthcurno (G049-05); CPE HG100 (G089-01)
    - Why we ask: The drying schedule cannot be typed as one temperature and duration while the sheets state a bound or disagree.
4. **[medium]** For the products below, do you hold values for the listed properties measured on 3D-printed specimens (with the build orientation, nozzle temperature and, for HDT, the load)? If your sheet's figure comes from an injection-moulded or unspecified bar, please say so.
    - Vinyl 303 (G135-02): heat deflection temperature (HDT), tensile modulus
    - Why we ask: The sheet prints no value for the property, or one whose bar is not described, so the product has no comparable printed figure for it.
5. **[low]** For the Flexfill TPU chemical-resistance ratings: at what exposure time, concentration and specimen were they rated, and what does 'water: BAD' mean for hydrolysis? What does the '12-16 HOUR' helpdesk badge on your pages mean?
    - Product: Flexfill TPU 98A (G039-29); Flexfill TPU 92A (G039-30)
    - Why we ask: The ratings give general 25 C groups without duration, concentration or specimen, so no resistance can be tied to a use case; the badge is not a test duration.

### FormFutura

Contact hint: formfutura.com

1. **[high]** At which load (0.45 MPa or 1.8 MPa; ISO 75 method B or A) and on what kind of bar was the heat deflection temperature printed for the product below?
    - STYX PA6 (G049-02): HDT 60°C
    - Why we ask: The sheet prints a heat deflection temperature without its load, so it cannot be compared with a warm-environment requirement, which is set at a stated load.
2. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - Silk Gloss PLA (G008-28): Tensile modulus 2580 Mpa
    - EasyCork (G014-13): Tensile modulus 1050 Mpa
    - Galaxy PLA (G015-04): Tensile modulus 3120 Mpa
    - Bulk PETG (G020-40): Elongation at break 160 %
    - HDglass (G020-41): Elongation at break 120 %
    - ReForm - rPET (G020-62): Elongation at break 120 %
    - CarbonFil CF03 (G024-13): Tensile modulus 3515 MPa
    - CarbonFil (G024-21): Tensile modulus 9495 Mpa
    - ABSpro (G027-45): Tensile modulus 2100 Mpa
    - EasyFil ABS (G027-46): Tensile modulus 1900 Mpa
    - ClearScent ABS (G027-48): Tensile modulus 1900 Mpa
    - Premium ABS (G027-49): Tensile modulus 1860 Mpa
    - ReForm - rTitan (G027-51): Tensile modulus 2030 Mpa
    - Python Flex (G039-47): Tensile modulus 150 Mpa
    - STYX PA6 (G049-02): Tensile modulus 2900 MPa; Elongation at break 1,9%
    - STYX-12 (G052-05): Tensile modulus 1400 Mpa; Elongation at break 150 %
    - Pegasus PP (G082-12): Tensile modulus 605 Mpa
    - AthenaX (G088-05): Elongation at break 220 %
    - ABSpro - Flame Retardant (G094-10): Tensile modulus 2440 Mpa
    - ApolloX Kevlar (G113-02): Elongation at break 6 %
    - AthenaX CF10 (G144-01): Elongation at break 5 %
    - Crystal Flex (G174-01): Elongation at break 230 %
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.
3. **[medium]** For the products below, do you hold values for the listed properties measured on 3D-printed specimens (with the build orientation, nozzle temperature and, for HDT, the load)? If your sheet's figure comes from an injection-moulded or unspecified bar, please say so.
    - ApolloX Kevlar (G113-02): heat deflection temperature (HDT)
    - Crystal Flex (G174-01): tensile modulus
    - Why we ask: The sheet prints no value for the property, or one whose bar is not described, so the product has no comparable printed figure for it.
4. **[low]** Are HDglass and ReForm rPET one formulation (they print one table), and is the table measured on each?
    - Product: HDglass (G020-41); ReForm - rPET (G020-62)
    - Why we ask: One table for two PETG products is recorded once under a shared key; it is accepted but unconfirmed.

### iSANMATE

Contact hint: isanmate.com

1. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - PETG (G020-03): Elongation at break 31 %
    - ABS (G027-50): Tensile modulus 2270 MPa
    - HDPE Glass Fiber (G138-03): Elongation at break 35 %
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.
2. **[high]** Is iSANMATE PLA Glass Fiber filled with glass fibre (your heading and Formnext announcement) or carbon fibre (your sheet's prose), and at what loading?
    - Product: PLA Glass Fiber (G019-02)
    - Why we ask: The sheet contradicts itself on the filler, so the product's material, and every stiffness value, depends on it.
3. **[high]** Which nozzle temperature, bed temperature, chamber/enclosure temperature and drying schedule do you recommend for the product(s) below? Your data sheet prints no print settings.
    - PLA Glass Fiber (G019-02): missing nozzle, bed, chamber, drying
    - ESD ABS (G030-02): missing nozzle, bed, chamber, drying
    - PA12CF (G053-13): missing nozzle, bed, chamber, drying
    - HDPE Glass Fiber (G138-03): missing nozzle, bed, chamber, drying
    - Capa 6500 Polycaprolactone (G149-01): missing nozzle, bed, chamber, drying
    - Why we ask: Without a nozzle and bed window the print gate for the product reads unknown, so it can neither pass nor fail a printer requirement.
4. **[high]** At which load (0.45 MPa or 1.8 MPa; ISO 75 method B or A) and on what kind of bar was the heat deflection temperature printed for the product below?
    - PP (G082-02): HDT 92
    - Why we ask: The sheet prints a heat deflection temperature without its load, so it cannot be compared with a warm-environment requirement, which is set at a stated load.
5. **[medium]** For PLA Wood, is the bed temperature 35-60 C (parameter table) or 45-60 C (second block)?
    - Product: PLA Wood (G014-15)
    - Why we ask: The page prints both.

### LEHVOSS

Contact hint: lehvoss.de

1. **[medium]** For LUVOCOM 3F PAHT 9825: is the nozzle window 250-280 C (2019 FFF guide) or 270-290 C, and are '100 C with 50 % retention' and the older '120 C UL746B' the same tested service limit?
    - Product: LUVOCOM 3F PAHT 9825 NT (G147-01)
    - Why we ask: Two own sources give different nozzle windows and service limits; the build keeps both and selects by rule, not by recency.
2. **[medium]** For the products below, do you hold values for the listed properties measured on 3D-printed specimens (with the build orientation, nozzle temperature and, for HDT, the load)? If your sheet's figure comes from an injection-moulded or unspecified bar, please say so.
    - LUVOCOM 3F PAHT 9936 BK (G148-01): heat deflection temperature (HDT), tensile modulus
    - LUVOCOM 3F PAHT KK 50056 BK (G148-02): heat deflection temperature (HDT), tensile modulus
    - Why we ask: The sheet prints no value for the property, or one whose bar is not described, so the product has no comparable printed figure for it.
3. **[medium]** For LUVOCOM 3F PAHT KK 50056 BK as filament, which figures apply: the compound sheet's 5.5 GPa and 1.40 g/cm3 or the 3D4Makers filament sheet's 6 GPa and 1.49 g/cm3? Are the filament and the compound the same material?
    - Product: LUVOCOM 3F PAHT KK 50056 BK (G148-02)
    - Why we ask: Two documents for one product name disagree on modulus and density.

### Markforged

Contact hint: markforged.com

1. **[high]** Which nozzle temperature, bed temperature, chamber temperature and drying schedule do you recommend for printing the product(s) below on a third-party printer such as the Bambu Lab H2C (bed up to 120 C, chamber up to 65 C), or is it for your own printers only?
    - Onyx GF (G166-01): missing nozzle, bed, chamber, drying
    - Why we ask: Without a nozzle and bed window the print gate for the product reads unknown, so it can neither pass nor fail a printer requirement.

### MatterHackers

Contact hint: matterhackers.com

1. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - RYNO (G020-49): Elongation at break 10 %
    - Build Series PETG (G020-50): Elongation at break 280 %
    - PETG (G020-52): Elongation at break 5 %
    - MH Build Series PETG (G020-55): Elongation at break 280 %
    - Carbon Fiber Nylon (G053-15): Elongation at break 8.1
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.

### Nanovia

Contact hint: nanovia.tech

1. **[high]** For Insublend, is the print bed 100-140 C (your legacy sheet's application paragraph) or 130-150 C (the same sheet's table), and is the drying 60 C for 4 h or longer or 80 C for 4 h?
    - Product: Insublend (G081-06)
    - Why we ask: The bed range straddles the H2C's 120 C limit and the sheets disagree; no intersection is applied.
2. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - PA-6 (G049-06): Tensile modulus 2100 MPa
    - Flex (G167-09): Elongation at break 524 %
    - ISTROFLEX (G167-12): Tensile modulus 60 MPa
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.
3. **[high]** For PC, PC-ABS, PC-ABS Rail, PC-CF, PC-PTFE and PP-CF, your pages print only a 0 degree raster tab. What are the tensile modulus, strength and elongation of the +/-45 degree tab (which the database reads as the product's XY value), and how do the raster angles relate to the build orientation of the bar?
    - Product: PC V0 (G035-19); PC-ABS V0 (G094-08); PC-ABS Rail (G094-07); PC CF (G037-07); PC-PTFE (G112-02); PP CF (G083-04)
    - Why we ask: These six products have no XY tensile value, so they cannot answer a stiffness or strength requirement.
4. **[medium]** Does your Insublend SDS allow food contact? Section 1.2 prohibits food and drinking-fluid contact and section 7.2 says the product is approved for food contact (English and French). Which certificate and test scope apply?
    - Product: Insublend (G081-06)
    - Why we ask: The SDS contradicts itself, so no food suitability can be recorded.
5. **[medium]** What is the correct Insublend tensile modulus? The value recorded (V007544) is physically implausible.
    - Product: Insublend (G081-06)
    - Why we ask: The implausible value backs no product value or estimate, so the stiffness of the product is unknown.
6. **[medium]** PETG repeats the 0 degree sentence under all three tabs, PA Food Industry states only 'ISO 3167 A test specimens', and Flex prints no specimen sentence. How were these bars made (printed or moulded) and at which raster or build orientation?
    - Product: PETG (G020-39); PA Food Industry (G164-07); Flex (G167-09)
    - Why we ask: A shape or a repeated sentence does not state how the bar was made.
7. **[low]** For the Insublend chemical-resistance table: at what temperature (the table is headed 20 C but includes boiling water), for how long and on which specimen were the ratings made; what rating does the 'Phosphate' cell for tributyl phosphate mean; is kerosene 'Moderate' or 'Weak' and tributyl phosphate 'Poor' or 'Weak'; and is the elongation row ISO 178 and the resistivity '10.10^15 Ohms' 10^15 ohm and which kind?
    - Product: Insublend (G081-06)
    - Why we ask: Exposure conditions, one rating and two test labels are missing or contradictory across the sheets.

### NinjaTek

Contact hint: ninjatek.com

1. **[high]** Were the mechanical values on the data sheet for the product below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - Chinchilla (G167-05): Tensile modulus 4,995 psi; Elongation at break 600 %
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.

### Polymaker

Contact hint: polymaker.com

1. **[high]** Does PolyMide CoPA need an enclosure? Your specifications say 'Enclosure Recommended' and the printing requirements say it does not require one.
    - Product: Polymaker PolyMide CoPA (G057-03)
    - Why we ask: The page contradicts itself, which decides the chamber gate for the nylon.
2. **[medium]** Your pages for Fiberon PA6-CF20, PA6-GF25 and PA12-CF10 repeat a 2.57 % water uptake, while your TDS values are 5.30 %, 4.57 % and 2.92 %. Which is right for each product?
    - Product: FIBERON PA6 CF20 (G050-11); FIBERON PA6 GF25 (G051-09); FIBERON PA12 CF10 (G053-08)
    - Why we ask: A repeated FAQ sentence disagrees with the tested table.
3. **[medium]** Your PC Max data sheet gives 25.1 +/- 1.9 kJ/m2 impact strength beside both ASTM D256 and ISO 179. Which method was used?
    - Product: Polymaker PC Max (G035-09)
    - Why we ask: The method decides whether the value is an Izod or a Charpy figure.
4. **[medium]** Is Polymaker PLA Pro V6.0 the same product as PolyLite PLA Pro V5.6 (rewritten description, new values)?
    - Product: Polymaker PLA Pro (G001-30); Polymaker PolyLite PLA Pro (G001-27)
    - Why we ask: If they are one product the records merge; if not, they stay two.
5. **[medium]** Your PolyFlex TPU90 V5.6 sheet is headed TPU90, carries a PC-ABS Black PD02001 footer and prints MPa as the elongation unit, and the file name says V5.4 while the heading says V5.5. Which revision is it and which rows are valid?
    - Product: Polymaker PolyFlex TPU90 (G039-11)
    - Why we ask: The new numeric rows are held until the sheet's identity is clear.
6. **[medium]** Which drying schedules are current: PolyLite PC (75 C/12 h on the page, 75 C/6 h and 80 C/8 h in the TDS and PIS, and 100 C/8 h against 75 C/6 h on one page), CoPA (80 C/10 h page, 100 C/8 h TDS, 80 C/12 h older PIS), TPU90 and TPU95-HF (50 C/6 h summary against 70 C/8 h detail), PolyMax PETG (65 C/4 h against 6 h), legacy ESD (70 C/8 h against 65 C/6 h) and ASA (70 C/6 h against 7 h)?
    - Product: Polymaker PolyLite PC Transparent (G035-10); Polymaker PolyMide CoPA (G057-03); Polymaker PolyFlex TPU90 (G039-11); Polymaker PolyFlex TPU95 HF (G039-12); Polymaker PolyMax PETG (G020-16); PolyMax PETG ESD (G026-02); Polymaker ASA (G031-06)
    - Why we ask: Each source-specific schedule is kept; the maker has to say which revision and use is intended.
7. **[low]** What wear protocol or lifetime model stands behind Fiberon PETG-ESD's wear and conductivity claim and the '1-2 year' abrasion/environment warning?
    - Product: PETG ESD (G026-05)
    - Why we ask: The claim has no stated protocol, so it cannot be used for selection.
8. **[low]** Your ABS V5.6 page 1 recommends the PolyBox/PolyDryer for 'HT-PLA-GF'. Is that sentence meant for ABS?
    - Product: Polymaker ABS (G027-09)
    - Why we ask: The sentence is in the wrong product's guidance; it is kept as an attribution problem, not as ABS moisture advice.

### Protopasta

Contact hint: not in sources.csv (3d.nice-cdn.com mirror only)

1. **[medium]** For the products below, do you hold values for the listed properties measured on 3D-printed specimens (with the build orientation, nozzle temperature and, for HDT, the load)? If your sheet's figure comes from an injection-moulded or unspecified bar, please say so.
    - Conductive PLA (G111-02): heat deflection temperature (HDT), tensile modulus
    - Why we ask: The sheet prints no value for the property, or one whose bar is not described, so the product has no comparable printed figure for it.

### Prusa Research

Contact hint: prusa3d.com

1. **[high]** Were the mechanical values on the data sheet for the product below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - Buddy3D PET-G (G020-46): Elongation at break 138 %
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.

### purefil (Fabru)

Contact hint: purefil.de

1. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - GreenTEC Pro (G001-66): Tensile modulus 4400 MPa; Elongation at break 3.4 %
    - PLA with Cork Fibers (Cork Filament) (G014-05): Tensile modulus 2150 MPa
    - PLA with wood fibers (wood filament) (G014-06): Tensile modulus 2900 MPa
    - Acrylnitrilbutadienstyrol (ABS) (G027-17): Tensile modulus 2700 MPa
    - Methylmethacrylat-Acrylnitrilbutadienstyrol (MABS) (G027-18): Tensile modulus 2540 MPa
    - Polycarbonat (PC) (G035-14): Elongation at break 150 %
    - Polyamide 12 (PA12) (G052-03): Tensile modulus 1500 MPa; Elongation at break 50 %
    - Polypropylene (PP) (G082-06): Tensile modulus 1200 MPa
    - Polyvinylchlorid weich 94A (PVC-P) (G135-01): Elongation at break 366 %
    - Cyclo-olefin copolymer impact-modified (COC tough) (G137-01): Tensile modulus 1900 MPa
    - Cyclo-Olefin-Copolymer flexibel (COC flex) (G137-03): Tensile modulus 50 MPa
    - Polyethylen high density glass fiber 20% (HDPE GF20) (G138-02): Tensile modulus 2600 MPa; Elongation at break 9 %
    - Liquid Crystal Polymer (LCP) (G139-01): Tensile modulus 11700 MPa; Elongation at break 3.1 %
    - Polybutylenterephthalat (PBT) (G140-01): Tensile modulus 2600 MPa; Elongation at break 30 %
    - Thermoplastic vulcanizate (TPV) (G167-13): Tensile modulus 13.9 MPa
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.
2. **[high]** For PA6 GF10, your sheet prints two bed temperatures, 'Heizbett Temperatur 120-140 C' and 'Heated bed temperature 80 C', and no drying row. Which is the bed temperature and what are the drying temperature and time?
    - Product: Polyamid 6 glass fiber 10% (PA6 GF10) (G051-08)
    - Why we ask: The profile holds 120-140 C, above the H2C's 120 C limit, so the bed gate reads 'exceeds'; the second row sits where purefil's other sheets print drying.
3. **[medium]** For the products below, do you hold values for the listed properties measured on 3D-printed specimens (with the build orientation, nozzle temperature and, for HDT, the load)? If your sheet's figure comes from an injection-moulded or unspecified bar, please say so.
    - Polyvinylchlorid weich 94A (PVC-P) (G135-01): heat deflection temperature (HDT), tensile modulus
    - Styrol-Acrylnitril (SAN) (G136-02): tensile modulus
    - Liquid Crystal Polymer (LCP) (G139-01): heat deflection temperature (HDT)
    - Why we ask: The sheet prints no value for the property, or one whose bar is not described, so the product has no comparable printed figure for it.
4. **[low]** Are your two POM data sheets (S-POM and the 3519 sheet) for one product or two?
    - Product: purefil POM (G087-01); Polyoxymethylen (POM) (G087-04)
    - Why we ask: One of the sheets has no cached text, so the two grades cannot be merged or kept apart.

### Raise3D

Contact hint: raise3d.com

1. **[high]** Which nozzle temperature, bed temperature, chamber/enclosure temperature and drying schedule do you recommend for the product(s) below? Your data sheet prints only the conditions the test bars were printed at.
    - Industrial PA12 CF (G053-09): missing nozzle, bed, chamber
    - Premium PVA+ (G075-09): missing nozzle, bed, chamber
    - Why we ask: Without a nozzle and bed window the print gate for the product reads unknown, so it can neither pass nor fail a printer requirement.
2. **[medium]** Does the Hyper Core PPA CF25 data sheet reprint the Industrial PET CF V4.0 table, or are its values from its own tests?
    - Product: Hyper Core PPA CF25 (G070-08)
    - Why we ask: The grade carries the PET CF sheet as its formulation key, which may mean its table is a reprint.
3. **[medium]** Are your Premium PETG and Premium PC the same formulations as Polymaker's PolyLite PETG and PC, and were your data-sheet tables measured by you?
    - Product: Premium PETG (G020-58); Premium PC (G035-16); Premium PC Black White (G035-18)
    - Why we ask: The sheets print the same numbers as Polymaker's; the database keeps each product's values until a maker says otherwise.

### Recreus

Contact hint: recreus.com

1. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - PET-G CF (G024-24): Tensile modulus 9000 MPa
    - FILAFLEX FOAMY (G150-01): Elongation at break 400 %
    - FILAFLEX 95 FOAMY (G150-03): Elongation at break 650 %
    - CONDUCTIVE FILAFLEX (G157-01): Tensile modulus 100 MPa
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.
2. **[medium]** For the products below, do you hold values for the listed properties measured on 3D-printed specimens (with the build orientation, nozzle temperature and, for HDT, the load)? If your sheet's figure comes from an injection-moulded or unspecified bar, please say so.
    - FILAFLEX FOAMY (G150-01): tensile modulus
    - FILAFLEX 95 FOAMY (G150-03): tensile modulus
    - Why we ask: The sheet prints no value for the property, or one whose bar is not described, so the product has no comparable printed figure for it.

### SIDDAMENT

Contact hint: siddament.com.au

1. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - PETG (G020-42): Elongation at break 17.3 %
    - PETG Matte (G020-43): Elongation at break 19 %
    - PC (G035-20): Elongation at break 3.8 %
    - PA (G049-07): Elongation at break 10 %
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.
2. **[high]** At which load (0.45 MPa or 1.8 MPa; ISO 75 method B or A) and on what kind of bar was the heat deflection temperature printed for the products below?
    - PLA Carbon Fiber (G018-12): HDT 53 °C
    - PA (G049-07): HDT 186 °C
    - Why we ask: The sheet prints a heat deflection temperature without its load, so it cannot be compared with a warm-environment requirement, which is set at a stated load.

### Siraya Tech

Contact hint: siraya.tech

1. **[high]** For Fibreheart TPU GF: is the nozzle range 220-250 C (Specifications) or 240-270 C (Printing Recommendations), and is AMS2 (AMS / AMS Lite) excluded or compatible?
    - Product: Fibreheart TPU GF (G151-01)
    - Why we ask: The guide contradicts itself on the nozzle window and on AMS compatibility, which sets the AMS 2 Pro / AMS HT verdict.
2. **[medium]** What single drying temperature and time do you recommend for Fibreheart TPU GF (the guide says 50-60 C for 6+ hours)?
    - Product: Fibreheart TPU GF (G151-01)
    - Why we ask: A range and a lower-bound time cannot be typed as one schedule without inventing one.
3. **[medium]** For Flex TPU Air: should wet filament be dried in a dedicated filament dryer (your TDS) or in a convection oven at 70-80 C for 4-6 h (your manual, which excludes a dryer)? And which density, hardness, heat and strength values belong to each of the four foaming temperatures (240, 250, 260, 270 C)?
    - Product: Flex TPU Air (G039-69)
    - Why we ask: The two documents disagree on the dryer, and the coupled foam-state table cannot be flattened without mixing favourable values from different print temperatures.
4. **[medium]** Your Rebound PEBA 85A table prints 'Tensile stress at 100 %' three times (6.7, 7.6, 8.5 MPa). What do the three rows represent (direction, print temperature, batch)?
    - Product: Rebound PEBA 85A (G045-10)
    - Why we ask: Nothing on the page tells the rows apart, so no value can be chosen as the product's.

### Spectrum

Contact hint: spectrumfilaments.com

1. **[high]** Is Spectrum GreenyHT a PLA blend, or the 'Bio-Based Copolyester (PLA-Free)' your current shop data describes, and which datasheet revision matches the filament sold today?
    - Product: GreenyHT (G001-134)
    - Why we ask: The product is filed as a PLA blend on the strength of a category page; the shop data and the SKU contradict that, so its whole property set may belong to another material.
2. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - GreenyHT (G001-134): Tensile modulus 900 MPa
    - PLA Magic SILK (G008-03): Tensile modulus 2700 MPa
    - WOOD (G014-02): Tensile modulus 2900 MPa
    - PLA Carbon (G018-03): Tensile modulus 12500 MPa
    - PET-G Premium (G020-04): Elongation at break 58,00 %
    - THE FILAMENT PETG Lite (G020-06): Elongation at break 160 %
    - PET-G Premium High Speed (G020-07): Elongation at break 10,00 %
    - PET-G HT100 (G020-08): Elongation at break 210,00 %
    - ABS GP450 (G027-03): Tensile modulus 2100 MPa
    - ABS Medical (G027-04): Tensile modulus 2450 MPa
    - PC 275 (G035-03): Elongation at break 100 %
    - pa6 neat bk (G049-01): Tensile modulus 3.4 GPa
    - PA6 Low Warp (G049-03): Tensile modulus 2900 MPa; Elongation at break 1,9 %
    - PA6 Neat NT (G049-04): Tensile modulus 3.3 GPa
    - pa12 cf15 (G053-03): Elongation at break 5%
    - hdpe (G085-01): Tensile modulus 3.5 GPa
    - pctg (G088-02): Elongation at break 220%
    - pc abs fr v0 (G094-03): Tensile modulus 2850 MPa
    - PA6 CS20 FR V0 (G104-01): Tensile modulus 6 GPa
    - ABS Kevlar (G106-01): Tensile modulus 2350 MPa; Elongation at break 6,00 %
    - PA6 GK10 (G108-01): Tensile modulus 4.2 GPa
    - PCTG GF10 (G110-01): Elongation at break 8,00 %
    - PC/PTFE (G112-01): Tensile modulus 2200 MPa; Elongation at break 8.0 %
    - Greeny Pro (G168-05): Tensile modulus 5100 MPa; Elongation at break 2.2 %
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.
3. **[high]** Where your page or sheet says a heated chamber or enclosure is recommended, what chamber temperature (or range) do you recommend for each product below?
    - PET-G HT100 (G020-08): profile P1537
    - PET-G FX120 (G020-74): profile P1538
    - ecoPET 9021 (G066-02): profile P1540
    - ABS Kevlar (G106-01): profile P1543
    - PA6 GK10 (G108-01): profile P1535
    - PC/PTFE (G112-01): profile P1305
    - ASA Kevlar (G113-01): profile P1544
    - Why we ask: 'Recommended' with no temperature cannot be checked against the H2C's 65 C chamber, so the chamber gate reads unknown (owner decision of 2026-10-05: it waits for the maker to print one).
4. **[high]** At which load (0.45 MPa or 1.8 MPa; ISO 75 method B or A) and on what kind of bar was the heat deflection temperature printed for the product below?
    - THE FILAMENT PLA CF (G018-02): HDT 55 °C
    - Why we ask: The sheet prints a heat deflection temperature without its load, so it cannot be compared with a warm-environment requirement, which is set at a stated load.
5. **[medium]** For the products below, do you hold values for the listed properties measured on 3D-printed specimens (with the build orientation, nozzle temperature and, for HDT, the load)? If your sheet's figure comes from an injection-moulded or unspecified bar, please say so.
    - ASA Conductive (G105-01): heat deflection temperature (HDT), tensile modulus
    - PETG/PTFE (G109-01): heat deflection temperature (HDT)
    - PLA Conductive (G111-01): heat deflection temperature (HDT), tensile modulus
    - ASA Kevlar (G113-01): heat deflection temperature (HDT), tensile modulus
    - Why we ask: The sheet prints no value for the property, or one whose bar is not described, so the product has no comparable printed figure for it.
6. **[medium]** Your PA6 CS20 FR V0 product page gives nozzle, print speed, cooling and enclosure guidance that differs from the data sheet. Which is current?
    - Product: PA6 CS20 FR V0 (G104-01)
    - Why we ask: Two own documents disagree on the print recipe, so the replacement profile is held and the nozzle/enclosure gate keeps the older sheet's window.
7. **[medium]** Do the PA6 CS20 FR V0 and pa6 neat bk data sheets reprint LEHVOSS's LUVOCOM 3F PAHT tables? Is each filament a PAHT compound (high-temperature PA6 copolymer) or a plain PA6?
    - Product: PA6 CS20 FR V0 (G104-01); pa6 neat bk (G049-01)
    - Why we ask: The sheets print LUVOCOM 3F PAHT values value for value but the products are filed under PA6-CE and PA6, while the LUVOCOM grades sit under PAHT-CE.
8. **[medium]** Your PCTG data sheet prints notched Izod impact as '93 C KJ/m2'. What are the correct value and unit (kJ/m2) and the test standard and notch?
    - Product: pctg (G088-02)
    - Why we ask: 93 kJ/m2 is not credible for a notched PCTG bar, so the value is quarantined and the product has no impact figure.

### Stratasys

Contact hint: stratasys.com

1. **[high]** Which nozzle temperature, bed temperature, chamber temperature and drying schedule do you recommend for printing the product(s) below on a third-party printer such as the Bambu Lab H2C (bed up to 120 C, chamber up to 65 C), or is it for your own printers only?
    - FDM HIPS (G081-07): missing nozzle, bed, chamber, drying
    - PC-ABS (G094-09): missing nozzle, bed, chamber, drying
    - Why we ask: Without a nozzle and bed window the print gate for the product reads unknown, so it can neither pass nor fail a printer requirement.
2. **[medium]** Which base polymer is ST-130 sacrificial tooling model material?
    - Product: Composite Molding Material (ST-130) (not yet in the database)
    - Why we ask: The sheet does not name the polymer, so the product cannot be filed.
3. **[medium]** On the PA6/66-GF30-FR sheet, the XY heat deflection prints 35 C at 264 psi beside 161 C at 66 psi (XZ: 153 C at 264 psi). Is 35 C a misprint, and what are the values in Tables 4 and 5 (tensile, flexural, compression, impact; XZ and ZX)?
    - Product: PA6/66-GF30-FR (G051-11)
    - Why we ask: 35 C at 1.8 MPa is not credible beside 153 C XZ, so the XY HDT cannot be trusted.

### SUNLU

Contact hint: sunlu.com

1. **[high]** Which nozzle temperature, bed temperature, chamber/enclosure temperature and drying schedule do you recommend for the product(s) below? Your data sheet prints no print settings.
    - PCL (G149-03): missing nozzle
    - Why we ask: Without a nozzle and bed window the print gate for the product reads unknown, so it can neither pass nor fail a printer requirement.
2. **[high]** Were the mechanical values on the data sheets for the products below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - PLA+ (Silk PLA+) (G008-15): Tensile modulus 2760 MPa
    - PLA Wood (G014-10): Tensile modulus 3240 MPa
    - PLA Carbon Fiber (G018-08): Tensile modulus 3530 MPa
    - ABS (G027-13): Tensile modulus 2270 MPa
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.
3. **[medium]** For SUNLU PCL: which print recipe were the specimens printed with (the English original says 260 C / 150 mm/s, your product recipe says 75-85 C) and what are the nozzle and bed recommendations?
    - Product: PCL (G149-03)
    - Why we ask: The 800 % elongation is off-recipe and cannot back a headline; the sheet prints '/' for bed.
4. **[medium]** Your Japanese TPU 90A page prints hardness 80 and elongation 10 +/- 5, while the linked TDS prints 90A +/- 2 and 1000 % or more. Which table and specimen is the intended one?
    - Product: TPU 90A (G039-18)
    - Why we ask: The page and the sheet contradict each other on hardness and elongation.
5. **[low]** Does the Waltek antibacterial report cover the TPU 90A filament as sold (manufacturer, lot, specimen form, print recipe), and can you supply the controlling Chinese report?
    - Product: TPU 90A (G039-18)
    - Why we ask: The report identifies a TPU 90A sample only, and the controlling report was not retrieved.

### UltiMaker

Contact hint: ultimaker.com

1. **[high]** Which nozzle temperature, bed temperature, chamber temperature and drying schedule do you recommend for printing the product(s) below on a third-party printer such as the Bambu Lab H2C (bed up to 120 C, chamber up to 65 C), or is it for your own printers only?
    - MAKERBOT SPECIALTY NYLON (G164-05): missing nozzle, bed, drying
    - Why we ask: Without a nozzle and bed window the print gate for the product reads unknown, so it can neither pass nor fail a printer requirement.
2. **[medium]** On the Precision ASA sheet, is the tensile modulus 2,167 MPa (page 1) or 2,100 MPa (page 2, 310,000 psi)?
    - Product: Precision ASA (G031-21)
    - Why we ask: The two pages print different values for the same property.
3. **[low]** On the MakerBot Tough sheet, the metric column holds '63.3 MPa' where the test method belongs; which standard (the sheet says 'ASTM D628', sic) was used for the tensile test?
    - Product: TOUGH (G027-21)
    - Why we ask: The method cell is misprinted; the values are moulded and decide nothing.

### Yousu

Contact hint: ysfilament.com

1. **[high]** Were the mechanical values on the data sheet for the product below measured on injection-moulded bars or on 3D-printed bars, and if printed, in which build orientation (flat XY, on edge XZ, upright Z), at which nozzle temperature and layer height, and were they annealed or conditioned?
    - PVB (G093-05): Tensile modulus 2310 MPa
    - Why we ask: The sheet prints only a test standard (for example ISO 527) and nothing on how the bar was made, so the value stays 'as published' and cannot back a comparable selection answer.
2. **[medium]** Does the product below need a heated chamber or enclosure (and at what temperature), and what drying schedule do you recommend? Your sheet or page gives the nozzle and bed only.
    - PLA (G001-72): not stated chamber, drying
    - WOOD (G014-07): not stated chamber, drying
    - Modified ABS (G027-26): not stated chamber, drying
    - PVA (G075-03): not stated chamber, drying
    - Why we ask: The chamber and drying are the print-guidance fields the maker's site did not state, so the chamber gate and the drying need stay unknown.

