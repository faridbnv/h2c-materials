# Four material questions, decided

> **Historical record** (2026-10-20): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../OPEN-PROBLEMS.md).

> **In short.** You asked a materials scientist to research four open questions and decide. Each is decided and built:
> fibre-filled PET prints glassy (no change to the model; two bars that cannot be as-printed now back nothing); the held
> sheets each have a home or a reason to stay out; purefil's soft PVC is a rubber of its own; and Spectrum's "PET-G HT100"
> is a different copolyester, filed under CPE. Researched with Claude Sonnet readers, decided and built by Claude Opus 5.5
> (the round's materials-science track, T5). The rule is [D176](../../../DECISIONS.md); the numbers are in
> [BACKTEST.md](BACKTEST.md) and [DECISION-DIFF.md](DECISION-DIFF.md).

## The decisions

| # | The question | The decision | What it changed |
|---|---|---|---|
| 1 | Does a carbon- or glass-filled PET crystallise as it prints, so that it holds 100 °C or more without annealing? | **No. PET's fills print glassy, as the tool already assumed.** The model is kept. One annealed bar is now recorded as annealed; two bars that state no treatment and read 190 to 200 °C are set aside as not the printed part's. | PET-GF no longer "passes" 90 or 120 °C as printed. Three products stay "unlikely to meet 100 °C", which is right as printed. |
| 2 | Where do the held sheets belong? | **Electrifi:** a new material, PCL-EC (a conductive polycaprolactone, inferred). **Diran 410MF07:** a new home for mineral-filled nylons whose polyamide is not named. **Onyx ESD:** PA-ESD. **ISTROFLEX:** stays an undisclosed rubber. **SBC:** a stiff clear styrenic, now estimated. **FKuR Fibrolon, Nuterials JECTO, ST-130:** stay out, each with its reason. | Three products enter with 42 values; SBC is estimated; nothing else moves. |
| 3 | Is purefil's Shore 94A PVC a rubber? | **Yes. A material of its own, PVC-P, under Flexible Elastomers, with a rubber limit of its own that cites a flexible-PVC reference.** | It fails the stiffness questions on its kind's limit instead of sitting in "not enough data" with an estimate of 0.2 to 8.7 GPa, and its maker's enclosure advice keeps it one check away for an indoor part. Rigid PVC keeps only the rigid product. |
| 4 | Does Spectrum PET-G HT100 need a Variant class? | **No: it is not a PETG. It is a Tritan-type copolyester, filed under CPE** beside colorFabb HT and Fiberlogy CPE HT. | PETG no longer passes 90 °C on it. |

Nothing in the estimate model's code or settings changed. One frozen table changed (polymers.csv gains SBC), with its
back-test. The migrations are m473 to m477 and the import batch b49.

## 1. Fibre-filled PET as printed

**The physics.** PET crystallises slowly: even at its fastest, near 170 °C, it takes about a minute. A printed road cools
from the nozzle through that window in seconds and lands on a bed and in a chamber below PET's glass transition (75 to
80 °C; the H2C's chamber reaches 65 °C). Carbon and glass fibres give crystals places to start, but not the minutes they
need to grow. So a printed PET-CF or PET-GF part is mostly glass: under 0.45 MPa it softens a little above its glass
transition, the fibre network carrying it 10 to 25 °C further. Hold it for hours above about 80 to 100 °C (annealing) and
it crystallises, and then it holds 120 to 200 °C. PPA is different: its glass transition is far higher and it crystallises
fast, so its fibre-filled grades crystallise as they print.

**What the makers say, read on their sheets.**

| Product | As printed (0.45 MPa) | After annealing | Where |
|---|---|---|---|
| Polymaker Fiberon PET-GF15 | 81.6 °C | 133.7 °C (16 h at 120 °C) | R-FIBERON-PETGF15-TDS |
| Raise3D Industrial PET CF | 87 °C | 175 °C (8 h at 100 °C) | D-RAISE3D-…-PET-CF-TDS-V4-0, p. 2 |
| Flashforge PET-CF | 100 °C, "not annealed" | none printed | D-FLASH-PET-CF-TDS-EN, p. 1 |
| BASF Ultrafuse PET CF15 | 74 °C | none printed | R-BASF-ExtendedTDS-…-PET-CF15, p. 5 |
| Raise3D Industrial PET GF | none printed | 120 °C ("All specimens were annealed at 100˚C for 8h") | D-RAISE3D-…-PET-GF-TDS-V1, pp. 1-2 |
| QIDI PET-GF | none printed | 120.3 °C (100 °C, 8 h) | R-QIDI-PET-GF, pp. 2-3 |
| Bambu Lab PET-CF | none printed | 205 °C (80 °C, 12 h) | B-pet-cf-TDS, p. 2 |

LEHVOSS, who compounds the LUVOCOM 3F PET CF that Flashforge, Spectrum and SIDDAMENT print, says annealing is needed "to
relieve stress and ensure the full crystallinity, high strength and temperature resistance" (its filament sheet, fetched
2026-10-19, SHA-256 348b4363…). UltiMaker says the same of its PET CF: "Temperature resistance increases from HDT of
~ 80 °C to a HDT of ~ 180 °C. Annealing basically transforms your PET CF to a fully semicrystalline state" (support
article 000002925, SHA-256 df43b5c1…). Neither is registered: they confirm the physics, and no value rests on them.

**The four bars OPEN-PROBLEMS named, read again.**
- Raise3D Industrial PET GF, 120 °C: its sheet says on p. 2 that every test specimen was annealed at 100 °C for 8 h. The
  heat rows had been recorded without it; now they are recorded annealed (m473).
- QIDI PET-GF: already recorded as annealed.
- Flashforge PET-CF, 100 °C: stated "not annealed". 100 °C is 20 °C above PET's glass transition, what a fibre network
  carries a glassy bar to. It is as printed and stands.
- Flashforge PET-GF, 200 °C: printed bars, no treatment stated, and the same sheet advises drying the part "in the oven at
  120-130°C for 6-8 hours to increase the strength". No glassy 15 % glass-fibre PET bar holds 0.45 MPa at 200 °C; every
  annealed one in the data reads 120 to 134 °C. A crystallised bar, annealed or printed hot. Flagged physically implausible
  as the as-printed value, as the tool already does for PLA (m473). SIDDAMENT PET CF prints the same kind of 190 °C (never
  recorded before) with the same oven advice; recorded and flagged likewise.

**The alternative you named, tested.** PET as "prints amorphous unless fibre-filled" was built and measured
([BACKTEST.md](BACKTEST.md), section 2). The model's calibration still held, but only because it gave a PET fill a range
about 106 °C wide, centred 40 to 90 °C above every as-printed bar the makers state, and it put Bambu Lab PET-CF back at
177 °C as printed (the error D167 removed). A "PET-fill stratum" would only have widened ranges around those two
undescribed bars. Rejected.

**What it moves.** PET-GF stops passing 90 and 120 °C as printed: its only pass was Flashforge PET-GF's 200 °C. With
annealing allowed, Raise3D Industrial PET GF passes 120 °C on its annealed bar. Polymaker PET-CF17, Raise3D Hyper Speed PET
CF and SIDDAMENT PET CF stay "unlikely to meet 100 °C" as printed (estimates near 84 to 86 °C), which is what their makers'
siblings print as printed; annealed, each is far above it.

## 2. The held sheets' homes

| Product | What its maker's documents say | Home | Why |
|---|---|---|---|
| Multi3D Electrifi | "copper-filled thermoplastic"; safety data sheet: "biodegradable polyester", melting point "Approximately 60 °C"; nozzle 140-160 °C | **PCL-EC (new, M176)**, inferred | The one biodegradable polyester that melts near 60 °C is polycaprolactone (PCL); PBS and PBAT melt near 115 °C, PLA from 150 °C. Not estimated: the polymer is inferred and its 2 to 4 g/cm³ copper load fits no model here. |
| Stratasys Diran 410MF07 | "a nylon-based thermoplastic FDM material, mineral-filled 7% by weight"; no polyamide or mineral named in its sheet, guide or safety data sheet | **Nylon-CE, maker-undisclosed polyamide (new, M177)** | The tool's homes for nylons whose polyamide is not named exist for unfilled, carbon- and glass-fibre grades; a mineral load is the Ceramic modifier, as PA6-CE's is. Not estimated. Its two tables enter (27 values). |
| Markforged Onyx ESD | "a static dissipative safe variant of Onyx", a "micro carbon fiber filled nylon"; surface resistance 10^5 to 10^7 Ω; safety data sheet: carbon and carbon black, no polymer | **PA-ESD (M064)** | Where someone asking for an ESD-safe nylon looks. Its column of the Composites sheet enters (ten values). |
| Nanovia ISTROFLEX | "Modified Polyester alloy and oyster shell powder", glass transition -32 °C, compostable, Shore 93A / 44D, Vicat 91 °C, 60 MPa | **stays in TPE, maker-undisclosed elastomer** | Its figures are PBAT's kind (BASF's ecoflex also softens at 91 °C), but PBAT sits among the rigid specialty polymers here, where it would be given a heat-deflection estimate (about 66 °C) a 60 MPa rubber cannot have. It is a rubber of undisclosed polymer, and answered as one; its safety data sheet is now recorded. |
| FormFutura Crystal Flex (SBC) | Shore D 63, flexural modulus 1.8 GPa, clear: K-Resin KR03's figures | **SBC, now estimated** | A stiff, glassy, styrene-rich block copolymer, not an elastomer (an elastomeric SBC, INEOS Styroflex, is Shore 86A and 70 MPa, a TPS). INEOS Styrolution's Styrolux 656C sheet and K-Resin KR03 page give polymers.csv its row; back-tested. |
| FKuR Fibrolon V 135002 | a PLA/wood compound "suitable for the production of 3D printing filaments", measured on moulded bars | **stays out** | colorFabb's woodFill sheets print its figures and colorFabb names FKuR its compounding partner, but the catalogue holds no colorFabb woodFill. It belongs as that product's resin reference once woodFill is imported from colorFabb's own sheet. |
| Nuterials JECTO | pellets; its walnut filament "is currently under development and undergoing testing" | **stays out** | Not a filament one can buy. |
| Stratasys ST-130 | sacrificial tooling, dissolved after curing; no polymer or family named anywhere | **stays out** | No home can hold it without a family; sold in canisters for Fortus 450mc and 900mc. |

## 3. purefil's soft PVC (PVC-P)

purefil's "Polyvinylchlorid weich 94A" says it is flexible with "rubber-like properties", Shore 94A, 366 % elongation.
A plasticiser lowers PVC's glass transition below room temperature, and PVC's small crystallites then hold the chains the
way a thermoplastic elastomer's hard blocks do: at Shore 94A it is a rubber of about 0.04 GPa, where rigid PVC (Fillamentum
Vinyl 303, Shore 78D) is a 2 to 4 GPa glass. Engineers and ISO 1043 name them apart (PVC-P and PVC-U). So it is a material
of its own, PVC-P, under Flexible Elastomers, not estimated (its plasticiser content sets its figures, and no reference
gives them). The rubber limit (at most 0.5 GPa) holds for it: m477 named it in the elastomers' row (CL01, from the
Cambridge Materials Data Book), and after the round's review, since that book prints no PVC, it has a row of its own (CL03,
m478 and m479) citing Fainplast's table of flexible PVC compounds (Shore A 45 to 94, the harder grades "Semi rigid" from
96A), registered as batch b49-2. It fails the 2, 3 and 5 GPa questions and the three stiffness presets on that limit. Its
sheet asks for an enclosed printer with an activated-carbon filter (PVC gives off hydrogen chloride when it overheats):
recorded on its profile (m478), it keeps PVC-P one check away for the indoor prototype, which it had passed on the rubber
family's chamber-need row, an asked-for enclosure being a statement the chamber need never fills (D151). A Variant
class was not used: a Variant stays inside rigid PVC's estimates, and no physics limit can reach a Variant. Its modulus is
not published, and no maker emails were sent, as you decided.

## 4. Spectrum PET-G HT100

Its sheet: "a co-polyester based filament", 1.18 g/cm³, HDT 100 °C (94 °C HDT B in Spectrum's portfolio), nozzle 250-280 °C,
bed 100-110 °C. A PETG is 1.22 to 1.30 g/cm³ and, glassy with a glass transition near 80 °C, deflects near 70 °C at
0.45 MPa. HT100's figures are, line for line, Eastman's Tritan brochure's (1.18, 43 MPa yield, 7 and 210 % elongation,
1575 MPa, Rockwell R 111, notched Izod 860 J/m; Eastman SP-MBS-1538, fetched 2026-10-19, SHA-256 c97993ff…): a copolyester
with a glass transition near 110 °C. Spectrum's safety data sheet says "a modified copolyester". It is not a PETG something
changed, so a Variant class would be the wrong word for it; CPE already holds this kind (colorFabb HT, made from Amphora
HT5300, and Fiberlogy CPE HT, glass transition 110 °C). Moved there (m474). Its values are the resin's moulded-bar figures,
which the round's ruling on undescribed bars judges like any other.

## What moved, and what is left

Of existing materials' verdicts: PET-GF from pass to "unlikely to meet" for 90 and 120 °C as printed; PETG from pass to
"unlikely" for 90 °C; rigid PVC from pass to fail for 20 and 100 % elongation as published and to fail for the lightweight
structure; PA-ESD from fail to pass for 5 and 20 % elongation as published. Every other verdict that moved is a new
material's (PCL-EC, Nylon-CE, PVC-P), and SBC now reads "unlikely" or "likely" where it read "not enough data". The full
lists are in [DECISION-DIFF.md](DECISION-DIFF.md).

Left open, each in OPEN-PROBLEMS: a crystallised bar whose sheet states no treatment is judged by a flag, one product at a
time (§38.10); PVC-P passes no softness question, for want of a published modulus, and the rubber family's chamber-need row
should name its kinds by base polymer, a change of its own (§38.9); FKuR's sheet waits for colorFabb woodFill (§14); colorFabb's 2015 carbon sheet, igus A350 and SKULPT
stay deferred, as before (§14).

## Sources

Registered in b49 (the import pipeline, staged by digest): R-MULTI3D-ELECTRIFI-TDS (SHA-256 2688570615b2…),
R-MULTI3D-ELECTRIFI-SDS (6904261403724…), R-STRATASYS-mds-fdm-diran410mf07-0224a (34f028a12c8c…), R-NANOVIA-ISTROFLEX-SDS
(a62b2abe8219…), R-INEOS-STYROLUX-656C-TDS (a0e20a397574…), R-INEOS-KRESIN-KR03-PAGE (e7f210454338…, a Wayback copy,
cited by SBC's density row since m478). Registered in b49-2: R-FAINPLAST-PVC-FLEXIBLE-EXTRUSION (2596444c6206…), cited by
PVC-P's rubber limit. Read and cited from the registered store: the PET sheets in the table above, S-PCGF-PET-CF-TDS,
D-FLASH-PET-GF-TDS-EN, R-MARKFORGED-CompositesMaterialDatasheet, R-FABRU-PUREFIL-7782-Materialdatenblatt-PVC-P-purefil,
S-SPECTRUM-en-tds-spectrum-petg-ht100, R-SPECTRUM-PORTFOLIO-2024, R-COLORFABB-TDS-E-ColorFabb-HT,
R-FIBERLOGY-FIBERLOGY-CPE-HT-TDS-0, R-NANOVIA-ISTROFLEX, R-BASF-ECOFLEX-C1200-PI. Fetched and hashed for this memo, not
registered (no value rests on them): LEHVOSS's LUVOCOM 3F PET CF 9780 BK filament and ISO sheets, Raise3D Industrial PET CF
V4.0, Polymaker Fiberon PET-GF15 V1.0, UltiMaker's PET CF annealing article, Flashforge's PET-GF and PET-CF product pages
(which print 205 °C beside the sheets' 200 and 100 °C), Eastman Tritan TX1001 and the 2015 Tritan brochure, Spectrum's
PET-G HT100 safety data sheet, colorFabb's woodFill sheets and FKuR's colorFabb case study, INEOS Styrolux 684D and 3G55,
Styroflex 2G66, purefil's PVC-P page and Multi3D's Electrifi FAQ and product page.
