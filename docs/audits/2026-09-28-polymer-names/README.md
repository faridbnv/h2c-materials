# What the makers say each product is (2026-09-28, m223, D106)

The owner, looking at the page: several materials are named "polymer not stated", and "TPU, hardness not stated", while
their products have good data. Naming them so is not acceptable. Search the sources beyond the data sheets, and change
their names to what they are.

Who did the work: five Claude research agents (claude-opus-5.5) searched the 41 products. Claude checked each finding
and wrote m223. The owner ruled on the two nylons the documents leave uncertain. No person has read the pages; every
quotation was checked by script on the cached, hash-checked bytes (`scripts/migrate/printed-on.mjs`).

GOALS step 2 (screen) and step 5 (drill down); scorecard C2.

## How it was searched

Each product was searched in order:

1. the maker's safety data sheet (the composition section, and its CAS numbers);
2. the maker's product page, printing guide, catalogue and news, in each language the maker publishes;
3. older and newer editions of each, including Internet Archive copies where the maker's link is gone;
4. the maker's store listings;
5. then distributors, retailers and papers, as pointers.

A statement counts only when its bytes were fetched and hashed, and the words are on the page the source's locator
names. Four safety data sheets have no usable text layer: Fiberlogy's three current ones are page images, and BigRep's
PRO HT draws its letters as unmapped glyphs. They were read optically (ocrmypdf), and the composition line was checked
against the page image by an agent.

Every document is registered in `sources.csv` with Citation role `corroboration` (27 new sources, `D-...`), and staged
in the ledger as a witness (`ingest:witness --from`). The product-by-product record, with each source, page, words and
reason, is `scripts/migrate/m223-what-the-makers-say-it-is.csv`. The rulings are R205 to R226 in
`docs/audits/2026-09-18-v2-import/rulings/rulings.csv`.

## What moved (21 products)

| Product | Was | Now | Settled by |
|---|---|---|---|
| Eryone Hyper Speed TPU | TPU, hardness not stated | TPU 95A class | its own sheet: "Its hardness is 95A." |
| Eryone Standard TPU | TPU, hardness not stated | TPU 95A class | its own sheet (the one Eryone's 95A page links; Standard TPU also comes in 85A and 90A) |
| Anycubic TPU | TPU, hardness not stated | TPU 95A class | its own sheet: "an average hardness of 95A" |
| MatterHackers Build Series TPU | TPU, hardness not stated | TPU 95A class | its maker's page: "Durometer: 95A" |
| SUNLU TPU | TPU, hardness not stated | TPU 95A class | SUNLU's own 2024 sheet: the same figures, and Shore 95 |
| eSUN eFlex | TPU, hardness not stated | TPU 85A class and softer | its own sheet: "a hardness of 87A" |
| purefil TPU | TPU, hardness not stated | TPU harder than 95A | its maker's page: "Shore hardness of 53D" |
| Siraya Tech Flex TPU Air | TPU, hardness not stated | TPU-LW | its own page: "Actively Foaming Thermoplastic Polyurethane (TPU)" |
| Fillamentum Flexfill TPE 90A, 96A | TPE, polymer not stated | TPS | their safety data sheets: polypropylene and SEBS block copolymer |
| eSUN TPE-83A | TPE, polymer not stated | TPS | its safety data sheet: hydrogenated styrene/butadiene copolymer, CAS 91261-65-3 |
| Fiberlogy FiberFlex 30D, FiberFlex 40D, MattFlex 40D | TPE, polymer not stated | TPC / TPEE | every safety data sheet found, 2017 to 2025: a copolyester elastomer (CAS 9078-71-1, 9086-55-9) |
| Nanovia Flex (V0) | TPE, polymer not stated | TPU 90A class | its safety data sheet: "Polyurethane / anti-fire additif"; rated 90 Shore A |
| NinjaTek Chinchilla | TPE, polymer not stated | TPC / TPEE, a declared softer grade | its safety data sheet: a thermoplastic polyester elastomer and another TPE, 48.5 to 50 % each |
| purefil TPV | TPE, polymer not stated | TPV (new material M175) | its own sheet: "a high-quality thermoplastic vulcanizate" |
| Fillamentum Nylon FX256 | Nylon, polymer not stated | PA12 | its maker's printing guide: "Fillamentum Nylon FX256 (Polyamide 12)" |
| MatterHackers PRO Series Nylon | Nylon, polymer not stated | PA6/66 | its maker's page: "Nylon Grade: PA6 / PA66 blend" |
| Yousu Nylon | Nylon, polymer not stated | PA66, **inferred** | the owner's ruling on the best evidence; see below |
| Spectrum ThermaTech PA | Nylon, polymer not stated | PA66, **inferred** | the owner's ruling on the best evidence; see below |

Two of these conflict with the product's own marketing, and the safety data sheet decides:

- **Fiberlogy.** The relaunched site calls FiberFlex "a flexible TPU filament". Every safety data sheet since 2017 names
  a copolyester elastomer, and nothing else. The sheets' numbers support the safety data sheets: FiberFlex 30D prints a
  density of 1.07 and a melting point of 174 °C, and DuPont Hytrel 3078 prints 1.07 and 177 °C. FiberFlex 40D prints
  1.16 and 157 to 160 °C, and Hytrel 4056 prints 1.16 and 152 °C. MattFlex's page offers it as "an excellent
  alternative to traditional TPU filaments".
- **NinjaTek Chinchilla.** Retailers list it as TPU, but NinjaTek never does, and its safety data sheet names a
  copolyester elastomer as half of the blend.

The two filed on the owner's ruling (R225, R226) are marked **inferred** on the grade:

- **Yousu Nylon.** Its own safety data sheet names PA66 by chemical name and CAS number (32131-17-2). The same sheet
  prints a melting point of 224 °C, and the data sheet a printing range of 220 to 260 °C; both are a PA6's.
- **Spectrum ThermaTech PA.** Two retailers name it PA6/6 (3Digital and 3DJake), and Spectrum's safety data sheet gives
  a melting range of 225 to 265 °C. Spectrum itself names no polyamide. Its ceramic load stays a declared dense filler.

PA66 (M055) had no product until now. Its headlines are now these two products' values, and each grade says it is
inferred.

## What was renamed (9 products, nothing moved)

The bio-based compounds are PLA-based by their makers' own documents, so their homes are named for that:

- **PLA blend** (M168);
- **PLA blend-CF** (M169).

| Product | Settled by |
|---|---|
| Extrudr GreenTEC | its current English safety data sheet: "Biobased batch based on PLA, contains copolyester and additives." |
| Extrudr GreenTEC Pro; purefil GreenTEC Pro | Extrudr's 2019 safety data sheet: "based on PLA, contains copolyester". The 2026 edition says only "bio-copolyester". A study with material Extrudr supplied (Burkhardt et al., Sci. Rep. 12, 20341, 2022) reports PLA, PBAT and PHA with a mineral filler. purefil's sheet repeats Extrudr's value for value. |
| Extrudr GreenTEC Pro CF | its German safety data sheet: "auf PLA-Basis, enthält Copolyester" |
| BigRep HI-TEMP CF | its maker's page: "a PLA blend reinforced with 10% chopped carbon fiber" |
| BigRep PRO HT | its safety data sheet: "Polylactic acid (PLA) compound" (read optically) |
| 3DJake niceBIO | 3DJake's own answer on its product page: "there are other contents besides the PLA" |
| Spectrum GreenyHT, Greeny Pro | Spectrum files both under "PLA / Bio-performance", which it describes as modified PLA |

The Extrudr editions disagree with each other: some omit PLA. The name follows the editions that name it, and the
table in `sources.csv` records both.

## What is still undisclosed (11 products)

These stay in their homes, which are now named for what is true of them:

- Nylon, maker-undisclosed polyamide;
- Nylon-CF, maker-undisclosed polyamide;
- Nylon-GF, maker-undisclosed polyamide;
- TPE, maker-undisclosed elastomer.

The leads found, for a later ruling:

| Product | What the search found | What would settle it |
|---|---|---|
| colorFabb PA Neat | colorFabb: the same base as PA-CF Low Warp; retailers: "PA6, PA12" | a colorFabb document naming the polyamide |
| colorFabb PA Blue Metal Detectable | MatterHackers: "PA6/PA12 blend"; its safety data sheet names titanium dioxide only | as above |
| colorFabb PA-CF Low Warp (Nylon-CF) | colorFabb: "features the mechanical properties of a PA6", developed with LEHVOSS; its 2018 safety data sheet: melting point about 235 °C, which fits neither PA6 nor PA12 | as above |
| Nanovia PA Food Industry | its food-contact declaration lists laurolactam and m-xylylenediamine as monomers (PA12 and an MXD polyamide), and no caprolactam | Nanovia's safety data sheet (its link is dead) |
| MakerBot Specialty Nylon | its safety data sheets (2022, 2024) name carbon black only | a MakerBot or UltiMaker document |
| CreatBot Ultra PA | melting point 231 °C and density 1.21, between PA6 and PA66 | a CreatBot safety data sheet (none found) |
| Markforged Onyx GF (Nylon-GF) | its safety data sheet names titanium dioxide only. Onyx's own names caprolactam (PA6), but that does not carry over | a Markforged document |
| Nanovia TPE 22D | its safety data sheet: "Thermoplastic elastomer"; density 1.00 | a Nanovia document |
| Nanovia Flex VX | its safety data sheet names copper oxide only; Nanovia groups it with ISTROFLEX at Shore 44D, and it prints ISTROFLEX's Vicat and melt flow | as above |
| Nanovia Flex B4C | "Combined with an industrial polymer" | as above |
| Nanovia ISTROFLEX | its safety data sheet: "Modified Polyester alloy and oyster shell powder", "based on biodegradable monomers" | the owner's word on a biodegradable-polyester home, as for Multi3D Electrifi (OPEN-PROBLEMS §14) |

## Also found

- **SUNLU TPU (G039-51)** is most likely an earlier sheet of SUNLU TPU 95A (G039-19). Its figures are SUNLU's
  2024 sheet's, and the 95A product's current sheet prints newer ones. Both are now in the 95A class, as two products.
  Whether to merge them is a separate decision.
- **MatterHackers Build Series TPU's safety data sheet** gives epsilon-caprolactone (CAS 502-44-3). That looks copied
  from a PCL sheet, and nothing uses it.
- **eSUN renamed eFlex "TPU-85A"** at the same address in late 2025. It stays in the same class.

## The decision diff

These are the answers in `build/snapshot/templates.csv`:

- **Verdicts.** No material's verdict changed in any template or mode.
- **Counts.** 175 rows changed their counts of passing, failing and untested products. The TPU 95A class now passes
  Indoor prototype on 30 of 30 products, where it was 25 of 25. It passes Flexible component on 9 of 30 (strict),
  where it was 7 of 25. The TPU 90A class gains Nanovia Flex.
- **Removed.** 16 rows went with "TPU, hardness not stated", which is now a family entry. Its products answer inside
  their classes. So one fewer material passes Indoor prototype (79 of 153) and Flexible component (6), but no product
  stops passing: the class's products pass inside the TPU 95A class.
- **Added.** 12 rows are the new TPV material, which is unknown everywhere.
- **Research mode only.** In "Explore with estimates", three candidates changed, because the estimate model now learns
  from the moved products: PA6 and PBT are no longer screened out of Flexible component, and COC is screened out of
  Lightweight structure. `build:diff` shows the model's grade estimates shifting across materials for the same reason.
- **Renamed.** 46 rows changed only in name.

## Afterwards: what still said the old thing (m224)

An agent then read every current-state text for the retired names. m224 corrected what it found:

- TPU's family entry listed "TPU, hardness not stated" as a member and omitted TPU-LW.
- The family entries' coverage findings omitted members. PA, PA-CF and PA-GF omitted their maker-undisclosed homes,
  and TPE omitted TPS, TPV and its own maker-undisclosed home. Each finding is superseded by one that names every
  member, and the migration checks those names against `family_members.csv`.
- PA66 said only that no PA66 sheet was found, although it now holds two products, marked inferred.
- Heat deflection's Not applicable reason named "TPE polymer not stated" among the elastomers it leaves out, and did
  not name TPV.
- Research limitations still counted PA66 and POM as having no profile or values.

Rulings R170 and R198 note the renamed homes. DATA-MODEL, the D43 status line and HEADLINE-UNESTIMATED say the same.
The two generated gap lists (BLOCKING-GAPS, SCENARIO-GAPS), last written on 2026-09-27, were regenerated. No
headline, estimate, gate or template answer moved: `build:diff` shows text only.
