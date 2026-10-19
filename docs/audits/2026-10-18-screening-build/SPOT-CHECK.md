# Spot-check list for the owner

> **Historical record** (2026-10-18): every value the screening build's stage 2a changed, flagged, held back or kept on purpose, for the owner to spot-check against its page.

> **In short.** You ruled that an Opus agent settles each flagged value against its page and that you get a list to
> spot-check. This is that list. Claude Opus 5.5 read every page below on its cached text, and on its rendered image
> where the layout decided (a Claude Sonnet reader had read them first). Each row gives the page's own words, what was
> done and why. "Flagged" means the value is kept and shown but decides nothing (marked physically implausible).
> "Held back" means the same for a value whose meaning the page leaves unclear. Pick any few rows and open the page:
> the record IDs and pages are in the last column of each table. Stage 2b's calls on fibre content are in the last
> section.

## Values changed, flagged or held back

| Product | Value | What the page says | Decision | Why |
|---|---|---|---|---|
| colorFabb PLA HP | HDT 135 °C at 0.45 MPa | "Heat Deflection Temp.\* HDT-B, ISO 75 135" with the footnote "\*Optimal temperature resistance is obtained after annealing the sample"; p. 2: "an average of a batch of 3D specimens" (V005853, 2024 sheet, p. 1) | Recorded as annealed, schedule not stated | The footnote on the value says how the bar was treated. A glassy PLA bar softens near 55 to 60 °C; 135 °C is a crystallised bar. The description's "without having to anneal" contradicts the footnote, and the 2022 sheet calls the same figure injection-moulded |
| 3DXTECH SimuBone | HDT 89 °C | "Glass Transition Temperature ... 55", "Deflection Temperature at 0.45 MPa ... 89", bars printed on a "Bed Temp: 23°C" (V010211, p. 1) | Flagged | 34 °C above its own glass transition on a cold-bed print, with no annealing stated |
| 3DXTECH CarbonX CF-PLA | HDT 91 °C | Glass transition 60 °C, HDT at 0.45 MPa 91 °C, bed 23 °C (V003309, p. 1) | Flagged | 31 °C above its glass transition, same reason |
| 3DXTECH ECOMAX Tough PLA | HDT 80 °C | Glass transition 55 °C, HDT at 0.45 MPa 80 °C, bed 23 °C (V003212, p. 1) | Flagged | 25 °C above its glass transition, same reason |
| Nanovia PLA EF 3D850 | HDT 80 to 90 °C | "Tg 55 – 60 °C", "HDT-B (0,45 MPa) 80 – 90 °C", "Max temperature 55 °C" (V007474, web page) | Flagged | 20 to 35 °C above the glass transition; the page's own maximum temperature is 55 °C |
| Nanovia PLA VX | HDT 80 to 90 °C | "Tg 55 – 60 °C", "HDT at 0,45 MPa 80 – 90 °C", "Max temperature 55 °C" (V007533, web page) | Flagged | Same reason |
| Nanovia PLA Flax | HDT 80 to 90 °C | "Tg 55 – 60 °C", "DTUL 50 °C", "HDT B (0.45 MPa) 80 – 90 °C", "Max temperature 55 °C" (V010287, web page) | Flagged | Same reason; the page also prints a deflection temperature of 50 °C |
| Flashforge "Flexible" (PBAT) | HDT 90 °C | "HDT@ 0.455 MPa (66 psi) ISO 75 ℃ 90" beside "Modulus of Elasticity (X-Y) ... 6~7" MPa (V005369, p. 1) | Flagged | A 6 MPa bar bends 7 % under the test load alone; the test's 0.2 % criterion is met almost at once, so 90 °C cannot be this bar's result |
| purefil COC flex | HDT 60 °C | "Heat deflection temperature 60 °C, 0.45 MPa" beside "Tensile modulus ... 50 MPa", a Shore 89A elastomer (V011485, p. 1) | Flagged | Too soft for the test to mean a rigid part's softening; filed under COC, it would otherwise pass heat questions |
| Eryone Hyper-Speed ABS | Modulus 217 MPa (X-Z) | "Elastic modulus X-Z ... 217.16" beside X-Y "217.08" (V005140, p. 2) | Flagged | The X-Y figure was already flagged; no ABS is that soft in any direction |
| FormFutura ApolloX Kevlar | HDT 95 °C at 1.81 MPa | 89 °C at 0.45 and 95 °C at 1.81 MN/m² (V007527, p. 2); its twin Spectrum ASA Kevlar prints 89 and 79 °C | Flagged | A heavier load cannot give a higher temperature; the twin shows the 95 is the odd one |
| Recreus PET-G CF | Density 1.1 g/cm³ | "Material density 1,1 g/cm3 ISO 1183" for a "carbon fibre-additivated" PETG (V015320, p. 1, read on the image) | Flagged | Plain PETG is 1.22 to 1.30; carbon fibre makes it denser, never lighter |
| FormFutura CarbonFil (earlier sheet) | Density 1.19 g/cc | "Specific gravity 1.19 g/cc" for a PETG "reinforced with 20% ... carbon fibres" (V009831, p. 1) | Flagged | 20 % carbon fibre gives about 1.35; the 2024 sheet prints 1,32 |
| purefil ABS | Tensile modulus 2700 MPa | "Tensile modulus (ASTM D790) 2700 MPa" (V005563, p. 1) | Held back | ASTM D790 is the bending test; the label says tension; the page cannot say which |
| iSANMATE PLA CF | Tensile strength 120 MPa | "Tensile Strength dry, @50mm/min ISO 527 ISO 3167 A MPa 120" in a Specimen column that names ISO 3167 A on every row (V015178, p. 1) | Specimen type set to moulded (raw material) | ISO 3167 A is the injection-moulded test bar; the table's other rows were already recorded so, and the page says nothing of printing |
| Fiberlogy FiberWORKS PETG | HDT 70 °C at 1.8 MPa | Product page "Heat Deflection Temperature @ 1.8 MPa: 70°C"; data sheet "@ 0.45 MPa ... 70" (V013149) | Held back | One number at two loads; the 0.45 MPa reading is safe either way, so it stays |
| Fiberlogy PP | HDT 51 °C at 1.8 MPa | Data sheet "@ 1.8 MPa ... 51"; product page "@ 0.45 MPa: 51°C" (V009228) | Held back | Same reason |
| colorFabb PA Blue Metal Detectable | HDT 90 °C typed at 1.8 MPa | July 2023: "Heat Deflection Temperature (A) 90" beside "(amorphous) 60"; November 2023: "HDT-B 90" from the raw-material supplier (V011126) | Held back | "(A)" is defined nowhere and may mean annealed; the newer sheet calls the same 90 °C method B |
| Spectrum S-Flex Carbon | HDT 134 °C typed at 1.8 MPa | 2025 portfolio "HDT A - 134°C"; its own sheet "0.45mn/m2 134°C", "1.81mn/m2 70°C" (V012429, p. 23) | Held back | The product's own sheet states the loads; the portfolio is a summary (HDT does not apply to this TPU, so nothing moves) |

## CarbonFil's 2024 sheet, entered as a new source

FormFutura's sheet "Date of update: 23-8-2024" (3DJake's copy, a scan) entered through the import pipeline as
R-FORMFUTURA-SB-20261018-7b525961687e. It is now the product's own sheet; the earlier sheet's rows stay.

| Value | What the page says | Decision |
|---|---|---|
| Fibre content | "CarbonFil is a 15% carbon fiber reinforced PETG" | In the product's composition, beside the earlier sheet's 20 % |
| Density 1.32 g/cm³ | "Specific gravity 1,32 g/cm3 ISO 1183" | Entered (V015425); now the product's density |
| Tensile strength at break 45 MPa | "Tensile strenght at break 45 MPa ISO 527-1" | Entered (V015427); now the product's (was 92) |
| Elongation at break 4.9 % | "Elongation at break 4,9 % ISO 527-1" | Entered (V015428) |
| Vicat 80 °C | "Vicat softening temperature 80 °C ISO 306" | Entered (V015430) |
| Flexural modulus 4250 MPa | "Flexural modulus 4250 MPa ISO 527-1" | Entered, held back (V015429): the label says bending, the standard says tension, and the tensile modulus row is empty |
| Charpy 5.4 kJ/m² | "Impact strenght 5.4 kJ/m2 ISO 179-1eU Charpy notched 23°C" | Entered, held back (V015426): "eU" is the unnotched bar, the condition says notched |
| Print settings | Nozzle 230 - 275 °C, bed 80 - 90 °C, "Print with Enclosure Yes", drying 40 - 60 °C, 12 h | One print profile (P1916): the product now asks for an enclosure with no temperature, so its chamber is unknown |

## Kept on purpose, with the reason written down

| Product | Value | Why it stays |
|---|---|---|
| Polymaker HT-PLA-GF (two sheets) | HDT 75.5 °C "(as printed)", 15.7 °C above its glass transition | The sheet shows the grade crystallising (a crystallisation and a melting point, 114.7 °C once annealed) and it holds 12 % glass fibre |
| Stratasys PC-ABS | HDT 126.1 °C (printed) and 125.0 °C (moulded) beside a glass transition of 105.3 °C | A blend has two glass transitions; the printed one is the ABS phase's, and the PC phase carries the bar above it |
| colorFabb nGen_FLEX | HDT 100 °C beside a glass transition of -40 °C and moduli of 130 to 170 MPa | A copolyester elastomer that melts at 205 °C; the value is the resin supplier's, already recorded as moulded, and decides nothing for a printed part |
| Fiberlogy PLA MINERAL | 2025 sheet's 48 °C at 0.45 MPa, below the 2021 sheet's 50 °C at 1.8 MPa | Two revisions, each in order with itself; the 2021 sheet is still the product's own |
| Fiberlogy R PP | Product page's 40 °C at 0.45 MPa, below the 2022 sheet's 65 °C at 1.8 MPa | The two documents disagree throughout; the sheet is the product's own |
| Prusament rPLA Natural Pigments (Wine) | 59 °C at 0.45 MPa and 60 °C at 1.8 MPa | Already accepted: a one-degree inversion is within the test's repeatability |
| colorFabb ASA | 2023 sheet's "HDT-B 87" beside the 2020 sheet's 96 and 87 °C | The 2020 sheet orders its loads; the 2023 figure is the resin supplier's and never decides for a printed part |

## Looked at and left as they are

These resin-like sheets say nothing about how their bars were made, so no specimen was invented: Yousu PC's 150 %
stretch (a stray "after printed as a part." on p. 2 belongs to no row), Fillamentum CPE HG100's 150 %, Spectrum PCTG's
220 %, and Spectrum PETG Lite's 160 % (its strength row cites D 882, the film test, and is already recorded as a film;
its stretch row cites ASTM D638). iSANMATE PLA CF's 25 GPa modulus was already a moulded-bar value.

## Stage 2b: the fibre loads the reviewer judged

Three Claude Sonnet readers read every fibre-filled product's sheets for a stated fibre load. Claude Opus 5.5 judged their
hard cases and read the sheets their packets left out. Only those calls are below; the other values are as their page
prints them, each with its words and page. Every decision and its reason is in [fibre/review.csv](fibre/review.csv).

**Skin-core filaments: whose figure is it?**

| Product | What the page says | Decision |
|---|---|---|
| QIDI NexABS-GF25 | "The inner core is ABS reinforced with 25% chopped glass fiber, and the outer shell is unfilled ABS resin" (V015478, p. 2) | Kept, noted as the core's content; the p. 1 line with the same 25 % not recorded twice |
| QIDI ASA-CF20 Core | "The inner core is ASA reinforced with 20% chopped carbon fiber, and the outer shell is" pure ASA (V015488, p. 2) | Kept, noted as the core's content; the p. 1 line not recorded twice |
| Raise3D Hyper Core ABS CF15, PPA CF25, PPA GF25 | "a fiber-rich inner core where most of the carbon fiber (25 wt.%) are well-aligned" (V015481, V015534, V015539, p. 1) | Kept as the filament's load, most of it in the core, as the names say |
| Siraya Tech Fibreheart PPA-CF Core | "Higher fiber content (25%)"; its safety data sheet: "Carbon Fiber 7440-44-0 20-25" (V015529, p. 1) | Kept as the filament's load: the safety data sheet covers the filament as sold |
| Siraya Tech Fibreheart ABS-CF Core | "20% core-concentrated carbon fiber" (V015480, p. 1) | Kept as the filament's load, read as its PPA-CF Core sibling's |

**A figure only the name gives** (recorded as a rating, never a test result):

| Product | The name on the page | Record |
|---|---|---|
| Polymaker Fiberon PETG-rCF08 | "Fiberon™ PETG-rCF08" | V015569 |
| 3DXTECH FibreX ABS+GF10 | "FibreX™ ABS+GF10 Glass Fiber ABS" | V015475 |
| Fillamentum ASA CF10 Carbon | "ASA CF10 Carbon" | V015486 |
| 3DXTECH AmideX PA6-GF30 | "AmideX™ PA6-GF30 Glass Fiber Nylon" | V015572 |
| Polymaker Fiberon PA12-CF10 | "Fiberon™ PA12-CF10 is carbon fiber reinforced" | V015510 |
| 3DXTECH FibreX PA12+GF30 | "[PA12+GF30]" | V015574 |
| Polymaker Fiberon PET-CF17 | "Fiberon™ PET-CF17 is a carbon fiber reinforced PET" | V015518 |
| BASF Ultrafuse PET CF15 | "Ultrafuse® PET CF15" (a reader's quoted sentence is on no page) | V015568 |
| Polymaker Fiberon PPS-CF10 | "Fiberon™ PPS-CF10 is a carbon fiber reinforced PPS" | V015542 |
| 3DXTECH ThermaX PEI GF30 | "ThermaX™ PEI GF30 [Made using ULTEM™ PEI]" | V015575 |
| 3DXTECH ThermaX PEEK GF20 | "ThermaX™ PEEK GF20" | V015576 |
| colorFabb nGen CF10 | "Technical datasheet nGen CF10" | V015559 |

**Other calls**

| Product | What the page says | Decision |
|---|---|---|
| Extrudr DuraPro ASA CF | "Carbon fiber content ASTM D785 %vol 12" | Not recorded: by volume (about 19 % by weight), and ASTM D785 is a hardness test; its composition keeps the words |
| FormFutura CarbonFil | Undated sheet "reinforced with 20% ... carbon fibres" (V015470); sheet of 23-8-2024 "a 15% carbon fiber reinforced PETG" (V015442) | A row each; a reader had filed the 15 % under the undated sheet |
| Flashforge PET-GF | Data sheet "containing 15% glass fiber" (V015523); its description (no readable text) says 30 % | 15 % recorded; the conflict is in OPEN-PROBLEMS §4 |
| Eryone PETG-CF, PA6-CF, PA12-CF | "The carbon fiber content is approximately 15%" (and 20 %, 20 %) (V015570, V015571, V015573) | Kept, "approximately" in the note; the tool had held them as marketing claims |
| FormFutura CarbonFil CF03, iSANMATE HDPE Glass Fiber | "circa 3%" (V015466), "about 25%" (V015558) | Kept, the word in the note |
| Spectrum ABS Kevlar | 2025 portfolio row "ABS Kevlar 10% Aramid fiber reinforced" (V015443, p. 21) | Recorded from the 2025 portfolio; the 2024 portfolio's line, read at low confidence, not used |
| Siraya Tech Fibreheart ABS-GF | Safety data sheet "Glass Fiber 65997-17-3 18-22", column "Approx. Weight (%)" (V015440, p. 2) | Recorded as the range; the readers had not been given this sheet |
| 3DXTECH CarbonX CF ASA | Safety data sheet "Carbon Fiber 308063-67-4 <15" (V015441, p. 1) | Recorded as a bound, under 15 % |

**Sheets the readers were not given, read by the reviewer.** 3DJake ecoPLA CF 5 % (V015431), easyPETG CF 10 % (V015432),
ABS CF 12 % (V015435), ASA CF 12 % (V015436); iSANMATE PETG Glass Fiber 20 %, the caption of its "Reinforced
Composition" picture (V015433); SIDDAMENT ABS Carbon Fiber 15 % by weight (V015434); Fillamentum CPE CF112 Carbon
12.5 % (V015437) and Nylon AF80 Aramid 8 % (V015439); 3DXTECH CarbonX PEI 9085 15 % (V015438). And plain statements
that replace a name's figure: Spectrum PA6 CF15 and PET CF15 from the 2025 portfolio (V015445, V015444), Eryone ABS-CF's
product page (V015446), Polymaker's pages for PA6-CF20, PA6-GF25 and PA612-CF15 (V015447 to V015449), 3DXTECH's pages
for FibreX PP+GF30 and CarbonX PEKK-A CF15 (V015450, V015451).

## Stage 4: values a sheet calls annealed, judged as printed

Fifteen Bambu Lab PLA sheets print one line over every value: "All the specimens were annealed and dried at 55 °C for 8 h
before testing" (50 °C on two of them). PLA's glass transition is 55 to 60 °C, and nothing crystallises at or below it,
so these are values of the part as printed (decision D153). Nothing in the rows was changed: their words and their typed
state still say annealed. The build now reads a heat treatment at or below the polymer's glass transition as no
annealing, and only for a polymer that crystallises when annealed; ABS, ASA, PC and PETG keep Bambu Lab's 65 to 80 °C
schedules as annealings. To check one, open the sheet and look for the line above the property table.

| Maker | Products (grade, material) | Values | Schedule |
|---|---|---:|---|
| Bambu Lab | PLA Basic (G002-01, PLA), PLA Matte (G003-01, PLA), PLA Basic Gradient (G005-01, PLA), PLA Silk+ (G009-01) and PLA Silk Dual Color (G010-01, PLA Silk), PLA Metal (G011-01), PLA Marble (G012-01), PLA Sparkle (G013-01), PLA Wood (G014-01), PLA Galaxy (G015-01), PLA Glow (G016-01), PLA Aero (G017-01), PLA-CF (G018-01) | 301 | 55 °C for 8 h |
| Bambu Lab | PLA Tough+ (G006-01, PLA), PLA Translucent (G007-01, PLA) | 60 | 50 °C for 8 h |

The values are V000042 to V000343 (all 302), V002104, V002105, V002110, V007488 to V007505, V007555, V007557 to V007574,
V007737 and V007739 to V007756 (the sheets B-pla-…-TDS and B-PC-Bambu-PLA-…-Technical-Data-Sheet); in the built database each
carries `heatTreatment`, and `npm run trace -- V000042` shows one.
