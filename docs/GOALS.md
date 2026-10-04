# What this tool is for

The owner set this on 2026-09-25, after a step back from V2 ([the review and plan](audits/2026-09-25-re-center/REPORT.md)),
and extended it on 2026-09-28 for version 2.1 (below).
Every piece of work names the step and the scorecard line below that it improves. Work that names neither waits.
A change of direction changes this page first.

## The goal

A small engineering team's workbench for choosing FDM materials for the Bambu Lab H2C. It turns a part's
requirements into a defensible shortlist:
- first of **materials** the H2C can print;
- then of specific **products**, each with how to print and treat it and what its maker says about it.

Every number can be traced, every gap is visible, and the team confirms the final pick with its own print.

It is not a source of design allowables, a substitute for the exact product's data sheet, or a universal ranking
(the [brief](background/architecture-brief.md), §2.3, still holds).

## The method: engineering selection, adapted to printing

| Step | What happens |
|---|---|
| 1. Translate | What the part must do becomes limits (at least 100 °C, at least 3 GPa) and a goal (lightest, stiffest for its weight). |
| 2. Screen | Each **material** is the range of its products, and is answered **all / some / none of its products pass**, or unknown. A product must meet every requirement at once, including whether our H2C can print it: nozzle, bed, chamber, enclosure, hardened nozzle, and any treatment it needs. |
| 3. Rank | The survivors are ordered by the goal (a performance index, computed per product). |
| 4. Understand | The trade-off chart draws each material at its typical value or as the range of its passing products, and each passing product in the state it would be used in. Up to six can be compared, and the rest show why they fell out. |
| 5. Drill down | Inside a material: which products pass, their makers and test conditions, each product's print recipe and treatment, and what makers say (benefits, pitfalls, warping, precision, good for). |
| 6. Practicalities | Price and where to buy. |
| 7. Confirm | The team prints and tests. Later, the result is recorded and ranks above data sheets. |

**Core decisions:**
- mechanical properties and weight;
- heat and environment;
- printability on the H2C.

**Later in the funnel:** cost and sourcing.

**Standard of evidence: screening grade.** Data sheets as published, test conditions shown, comparability flagged.

## Two tiers of data: record everything, verify what decides

| Tier | What it holds | How it is checked | Where it shows |
|---|---|---|---|
| **Decision** | The values that pass or fail a product: its properties and its print requirements. | Strictly: typed conditions, windows, findings, the sources re-read where a verdict turns on them. | Selection, table, chart, panel. |
| **Record** | Everything else a source publishes: unmapped properties, notes, claims, and makers' know-how. It is kept as printed, with its page. It attaches to the source, and to the product when that is settled. | Lightly: a schema check and a sampled read against the page. No rulings and no per-row review. | Database only, except makers' know-how, which the panel shows. |

Where a maker's know-how or print recipe is not on its data sheet (often it is on the maker's site instead), the
gap is shown per material, in one of three states:
- collected;
- sheet silent, site not yet searched;
- searched, nothing published.

It is queued for a later search, never hidden.

## Scorecard

Each line is scored 1 to 5, where 5 means as good as it needs to be. It is re-scored at the end of every phase.

| # | Component | 2026-09-25 | 2026-09-27 | 2026-09-28 | What moved it, and what holds it back |
|---|---|:-:|:-:|:-:|---|
| C1 | Translate requirements (limits engineers use, a goal to rank by) | 2 | 4 | 4 | Ten limits and Rank by; since 2.1 the question also says the state the part is used in: as printed or annealed (with the oven's limit), dry or humid (D99). No template uses the four newest limits |
| C2 | Classification (family → polymer → material → product, a home for everything) | 2 | 4 | 4 | Product lines are products, TPU by hardness; a product is named for what its maker's documents say it is, searched beyond its sheet (D106), and a home per family holds only what no maker discloses (11 products). Held sheets still need exact identities, and 3 materials have no product to buy (1 with only a resin reference). b38 admitted the held Recreus PET-G sheet under its exact identity; other held documents remain subject to the import pause |
| C3 | Evidence store, decision tier (values with their conditions) | 3 | 3 | 3 | A deciding value must be a number its evidence line prints, in one role (D97), and decides only in the state it was measured in (D99); no person has measured the error rate. The pre-gap-closure sample drew 32 of 310 deciding values (SPOT-CHECK-DECISIVE.md); the gap-closing response lists the additional agent re-reads awaiting a person. Measured on 2026-10-01 by fresh random re-reads after the error-class sweep: 1 of 70 deciding measurements wrong (the audit found 6.3 %), and every guard that keeps a root cause out at zero unreviewed findings ([sweep](audits/2026-10-01-error-classes/README.md)) |
| C4 | Comparability (how comparable each value is, the user chooses how strict) | 2 | 4 | 4 | Comparable and as published on every headline, and each value's state; a verdict names what it admitted unstated. A value takes what its page states once (specimen, moisture, treatment, standard, test temperature, D116) |
| C5 | Material summary (range and typical value across products) | 1 | 4 | 4 | Every material is its products' spread, variants and twins placed by rule |
| C6 | Screening (pass / fail / unknown, explained, nearest miss) | 3 | 4 | 4 | Product/state-owned evidence decides (D98–D100); the current [campaign status](audits/2026-09-30-coverage-expansion/STATUS.md) and frozen replay show answer changes. The v2.1 audit's scenario-gap count describes that release; rerun its generator after data changes. Application judgments and narrative claims never create passes. A row says how many products pass and shows the passing products' range; an unknown says how many measure below and how many publish nothing (D117) |
| C7 | Rank and trade-offs (goal ordering, material ranges, Pareto, compare) | 2 | 3 | 3 | One ranking across the table, the chart and the export (D102); since 2026-09-29 the chart draws and counts exact product states (D107), its controls and views reworked after the owner used it (D108 to D112), not re-scored; untested with the team (TEAM-TRIAL.md) |
| C8 | Drill down to products (which pass, by maker; search by maker or product) | 2 | 4 | 4 | Passing products first, in the drawer's first view on a laptop; a product can be chosen, with its state, and its decision brief written (D103) |
| C9 | Printability and treatment (each product's own recipe against the H2C) | 2 | 4 | 4 | Every template asks nozzle, bed and chamber against the H2C, from own evidence, permitted twin, then labelled Bambu guide (D101). Current known/unknown counts are generated in [campaign status](audits/2026-09-30-coverage-expansion/STATUS.md) and [print.csv](../build/snapshot/print.csv); drying and bounded windows retain source limits, and annealing remains a repeatable state. Print settings are checked against what the import's own reader reads on every profile's sheet (D119); the last fresh draw after that sweep found 3 of 40 profiles wrong (target under 3 %, OPEN-PROBLEMS §28). On 2026-10-02 the profiles were fixed by cause rather than re-read (D120, [sweep](audits/2026-10-02-profile-root-causes/README.md)): every line where an error could hide was marked and read, each cause was taught to the import's reader that checks every profile, and four fresh draws found 4, 4, 2 and 2 deciding errors in 40, each family then swept; the next draw (v12, 2026-10-02) found 1 in 40 (2.5 %, a second blind reader none), under the target, and its family was swept (m299) |
| C10 | Makers' know-how (in the panel, gaps visible) | 1 | 4 | 4 | Current statement/product counts are in [counts.md](../build/snapshot/counts.md), with silent recipes/products in the generated [worklist](audits/2026-09-25-re-center/KNOW-HOW-WORKLIST.md). Literal claims now show their recorded scope/conditions separately; no suitability verdict follows |
| C11 | The record (everything published, searchable, never deciding) | 1 | 4 | 4 | Unmapped facts and cached page text in release-stamped dist/h2c.sqlite (D105). The local full-text index remains partial; the dated current custody/index receipt and limitations are in OPEN-PROBLEMS §19. Private originals/text are not shipped to CI or Pages |
| C12 | Estimates (a marked hint where nothing is published) | 3, over-built | 3 | 3 | Estimated only where no product publishes (148 material cells, `build/snapshot/counts.md`); the special cases went with the representative grade |
| C13 | Data operations (a product in minutes, verify in about a minute) | 2 | 3 | 4 | Campaign warm checks: 27.48 s and 51.57 s previously; the resumed material tranche passed in 50.6 s, within 90 s, with complete browser QA; [receipts](audits/2026-09-30-coverage-expansion/STATUS.md). The historical 106.7 s cold overrun is gone: 29.6 s warm and 68.2 s with the build cache off, measured 2026-10-02 (OPEN-PROBLEMS §19). Campaign docs are generated and checked in verify:fast; imports stay paused outside named exceptions |
| C14 | Team layer (shared scenarios, approved list, own tests); later | 1 | 1 | 2 | A chosen product keeps its state, release, note and the team's own test results with the scenario, and its brief is written (D103); no shared list, account or server, as decided |
| C15 | Engineering hygiene (checks guard decisions, docs short and current) | 2 | 3 | 4 | An independent acceptance portfolio (46 expectations) and seven metamorphic relations guard the decisions; a release is its content (D96); `verify` fails without Chrome; `npm run doctor` and three routes start a reader. The audit record is still long. Since 2026-10-01 `audit:context` checks each value, page statement and print setting against its cached sheet in `verify`, and a Parse review names the columns it explains (D115) |
| C16 | Price (a CAD/kg for each material, each product's own where it has one) | – | – | – | Added with the price pass of 2026-09-30, not yet scored; price was 33 materials and 38 products until then. Now 101 of 136 materials and 214 of 1,049 products priced (1,077 before m302 merged 28 in-scope products held on two grades), 30 materials from a converted foreign listing (D113); 35 unpriced with why (OPEN-PROBLEMS §22); a snapshot of two days, with no refresh routine |

Re-scored on 2026-09-28, at the end of version 2.1, by Claude (an agent) from the build and the record
([RESPONSE.md](audits/2026-09-27-v2.1-review/RESPONSE.md)). The owner may re-score. Two lines wait on people, not code:
C3 on the decisive-value spot-check ([SPOT-CHECK-DECISIVE.md](audits/2026-09-27-v2.1-review/SPOT-CHECK-DECISIVE.md)), C7
on the team trial ([TEAM-TRIAL.md](audits/2026-09-27-v2.1-review/TEAM-TRIAL.md)).

Evidence for C6/C9/C10/C11/C13 was refreshed after the 2026-09-28
[source backup and gap closure](audits/2026-09-28-gap-closing/RESPONSE.md), without changing the scores.
The score values remain dated 2026-09-28. Their explanatory links now point to current generated evidence; older refresh paragraphs below are historical, not current campaign totals. Private full-text figures describe a dated local cache, not CI.

The table's counts were refreshed on 2026-09-30 from the build after the
[gap-fill tranche](audits/2026-09-29-gap-fill-implementation/README.md), again without changing a score: it gave a nozzle
verdict to one more product and a bed verdict to one more, a drying schedule to 19 more (462 of 1,128), and 663 material
values from products with 148 estimated (659 and 150 before). Two answers moved, both to FAIL on a published value.

## Decided on 2026-09-25

Each becomes an entry in [DECISIONS.md](DECISIONS.md) in the change that builds it, not before, so DECISIONS never
describes a tool that does not exist yet. D83 and D84 are entered (the build and the engine carry them; the page reads
them from phase 3; phase 4 retired the representative grade and its hand picks, m137). D85 is entered with the record
tier's first lane: `source_facts` and the full-text index `documents_fts` in `dist/h2c.sqlite`. Makers' know-how in the
panel is built with lane 3 (m140; D85, its last part). Phase 5's decisions are D86 (m141) and D87 (m142, m143). Phase
6's decisions 1 and 2 are D88 (m150) and D89. Of those of 2026-09-26, decisions 1, 4, 5, 6 and 8 are D90 (m165), D91
(m168), D93 (m190), D95 (m197) and D94 (m195); 2, 3 and 7 are data (m166, m167, m198).

- **D83. A material is the range of its products.**
  - Each product's values are derived by rule, and `headlines.csv` becomes an override.
  - The material shows the range and typical value across its products, with declared variants kept apart.
  - Its verdict is all / some / none of its products pass.
  - This supersedes D8 and amends D2 and D37. The representative grade retires.
- **D84. Two evidence levels in the decision tier.**
  - "Comparable": printed or unstated specimen, stated direction, dry or unstated. This is the default that decides.
  - "As published": direction or load not stated. It is shown with its own count, and decides only when the user
    asks.
- **D85. The record tier.**
  - Any fact a source publishes may be recorded as printed, with its page.
  - It is never used in a verdict, needs no ruling or per-row review, and is not shipped in the page, except makers'
    know-how in the panel.
- **Printability per product.** Each product's own profile screens it. A union across a material's products never
  does.
- **New document imports are paused** until the re-center is built. The documents already fetched are mined first:
  for the record, print recipes and makers' know-how. The owner lifted it for one set on 2026-09-25, for targeted
  fetches in phase 6, and for two held sheets on 2026-09-27 (all below).

## Decided on 2026-09-25, for phase 5

Asked with the facts and a recommendation each; the owner's answers:

1. **A maker's product line is a product, and TPU is read by hardness.** The eleven PLA, PLA Silk and PETG rows that
   were one product each (Bambu's PLA Basic, Matte, Basic Gradient, Tough+, Translucent, Silk+, Silk Dual Color, PETG
   Basic, HF, Translucent, and eSUN's PLA-Lite) become products of the material they are, their names kept as aliases.
   TPU is split by the Shore hardness its makers rate it, for every maker: 87A or softer, 88 to 92A, 93 to 97A, 98A
   and above or Shore D (the class named "harder than 95A"), and hardness not stated; Bambu's four TPU rows are aliases
   of their class. Built in m141 (D86).
2. **A family gets a "polymer not stated" home,** for products whose sheets name only the family ("colorFabb PA Neat",
   "eSUN TPE 83A"): shown and judged like any product, clearly labelled, with no estimate. The 50 sheets waiting on it
   are imported now, the owner's exception to the pause. Built in m142 and m143 (D87): 44 of the 74 held sheets
   entered, 22 are deferred with the gap named (batch b34).
3. **Metal and ceramic sintering filaments are out of scope** (316L, 17-4 PH, SiC, alumina): recorded, never a
   candidate, because the printed part must be debinded and sintered elsewhere and its properties are the sintered
   metal's. The other rulings pending follow the defaults proposed: Antero 800NA is PEKK (out of scope); PI is the
   out-of-scope TPI its sheet names; colorFabb Amphora AM3300 is nGen / Amphora; WearX is a PA6; the styrenic elastomers (TPS) are a
   material of their own; the elastomers named only by hardness and the undisclosed bio-copolymers (FiberFlex, MattFlex,
   GreenTEC, niceBIO) take their family's "polymer not stated" home. Built in m142 and m143 (D87). The three questions
   batch b34 left were answered the same day and built in m144 and m145 (batch b35): Crystal Flex is a new SBC
   material, purefil's TPV is TPE, polymer not stated (a material of its own, TPV, since 2026-09-28: see "Decided on 2026-09-28, polymer names"), QIDI S-White is Support for ABS, and PI stays TPI (R193).
4. **eSUN's densities keep counting.** m128's reading stands: a density is not measured on the bar eSUN's sentence
   describes, and most makers' density is the resin's.

## Decided on 2026-09-25, for phase 6

Asked with the facts and a recommendation each; the owner took each recommendation:

1. **Where a product's own sheet is silent on printing, Bambu Lab's Filament Guide decides its printability gate**,
   for the material types the guide covers, labelled as the guide's and not the maker's. A product's own statement
   always wins. The guide is a registered source, re-fetched and hash-checked before use.
2. **A twin reads its sibling's values and print recipe.** A product whose sheet prints the same table as a sibling of
   the same material (R053) shows the sibling's, labelled "same sheet as …", so the counts of products that pass are
   right. A product that reprints another material's table (R166) still reads nothing.
3. **Price waits** (lifted on 2026-09-30 by the price pass, below). No price refresh in phase 6; cost sits late in the funnel, and a refresh routine comes with the
   team layer. The Indoor prototype keeps saying which materials lack a sampled price.
4. **Lane 4 fetches new documents only where one settles a blocking answer**, through the import pipeline and named
   reviews. The general pause on imports stays, and no new reader rules are built for the held sheets.

## Decided on 2026-09-26, for phase 6

Raised by the lanes' findings; asked with the facts and a recommendation each:

1. **Bambu's "print with an enclosure" counts as within the H2C's chamber** for the nine types its guide asks it for
   (ABS, ABS-GF, ASA, PC, PAHT-CF, PA6-CF, PA6-GF, PPA-CF, PPS-CF), where a product's own sheet is silent, labelled as
   the guide's. The guide is written for Bambu's own enclosed printers. A maker's own chamber statement always wins;
   revisit if one states a higher chamber for these types. (Recommended; taken.)
2. **Out of scope is said once.** Scope holds the exclusion; the fourteen industrial high-temperature materials' H2C
   status is "Exceeds H2C limits"; the two families drop their "- Outside H2C …" suffixes. (Recommended; taken.)
3. **Nanovia's "Elongation ultimate strength" is the strain at the ultimate strength**, not an elongation at break:
   its 14 values are refiled as that property, shown and kept, and no longer fill elongation at break. (Recommended;
   taken.)
4. **A tensile value labelled only by a ±45° raster counts as an XY value.** Makers commonly print their flat XY bars
   with a ±45° raster; this supersedes m33's reading for such values. (The recommendation was to keep m33 until a
   sheet printing both showed they agree; the owner chose to count them.)
5. **A maker's own "enclosure needed" or "recommended", with no temperature, reads as the guide's tick does**: within
   the H2C's chamber, for the same nine types, labelled as the maker's words. A maker's stated temperature above 65 °C
   still reads as partial or beyond. (Recommended; taken.)
6. **colorFabb's lightweight PETs are judged foamed**: the value as the product is meant to be printed decides, and the
   unfoamed value is recorded beside it. (Recommended; taken.)
7. **LEHVOSS's printed-specimen sheet for LUVOCOM 3F PAHT 9825 NT enters by a migration that checks each figure on its
   page**, not by a new reader rule. (Recommended; taken.)
8. **Notched Izod becomes a filter beside notched Charpy.** The two tests are never mixed or converted, and each says
   so. (The recommendation was one impact filter until a requirement asked for Izod; the owner chose both.)

## Decided on 2026-09-27, on the research package of 2026-09-26

A research agent worked from the brief of 2026-09-26 against an older commit and returned an evidence package (1,160
findings, 1,014 saved documents). Three questions about how its findings enter were asked, each with a recommendation,
and the owner took each:

1. **Bambu Lab's Filament Guide: verify, then switch.** The package reported that Bambu Lab's guide page links the
   ".../250123/..." PDF, which D88 had taken for the older revision. The page was loaded in headless Chrome and does
   link it, and the bytes hash to B-GUIDE's digest. So the build reads B-GUIDE (eighteen types), and the guide's
   "Required" enclosure for ASA-CF reads as D90 reads the nine types. PC FR, which the same guide asks an enclosure for,
   is read the same way, and D93 follows for ASA-CF (m209, m210).
2. **The held sheets whose makers' pages name the polymer enter as batch b37**: Fillamentum Timberfill and NinjaTek
   Eel (m207). Multi3D Electrifi's safety data sheet says "biodegradable polyester", and it stays held until a
   polyester home is decided.
3. **The documents the package saved enter from their copies**: staged by digest, with the URL and the date the
   research agents read them (`ingest:witness --from`). Every quotation is re-checked on those bytes.

## Decided on 2026-09-28, for version 2.1

A review of 2026-09-27 ([REVIEW.md](audits/2026-09-27-v2.1-review/REVIEW.md), with its
[plan](audits/2026-09-27-v2.1-review/V2.1-PLAN.md)) found the decision contract less complete than the data's: a
product could pass on another product's evidence or offer, on values from two treatment states, or without a print gate
the H2C could meet. The owner asked for version 2.1 to be built from that plan on the `v2` branch, not `main`, and took
its recommended answer to each of the seven questions it put. Each is a DECISIONS entry, made in the change that built
it: 1 is D98, 2 and 5 are D99, 3 is D100, 4 is D101, 6 is D96, and 7 is D103. The plan's other findings, which put no
question to the owner, are D97, D102, D104 and D105.

1. **A product's verdict rests on its own evidence.** The exact product decides; a twin that prints the same sheet
   (D89) reads its sibling's; a record filed under the material with no product, or a polymer's published behaviour, is
   context and never passes. An offer is that product's own, never a sibling's. A conflict finding names the product it
   is about, and holds out only that product.
2. **A product is judged in a state it can be made in.** As printed is the default. An annealed value decides only
   where the scenario permits annealing, at the schedule its sheet states, and every verdict and export names the
   treatment it needs. Dry and conditioned values stay apart: the scenario says which service state it asks about. An
   unstated condition is admitted under the screening policy and said so, never invented.
3. **A material passes when one product passes, is unknown while one is unresolved, and fails only when every product
   fails.** This revises D83's "fails when none passes and one fails", deliberately: one measured failure no longer
   removes a material whose other products nobody has measured. The counts of products passing, failing and untested
   stay beside every verdict.
4. **Every standard template asks whether the H2C can print the product** (nozzle, bed and chamber, on the product's own
   recipe, as D88 and D89 read it). Browsing materials without that check is a research mode, labelled as one.
5. **"Comparable" is a screening policy, not an equivalence.** A verdict says which conditions are stated and which
   the policy admits unstated (specimen, moisture, treatment), and heat deflection names its method.
6. **A release is its content.** A deterministic release ID over the data, the rules and the engine travels with the
   page, every saved scenario, link and export; a scenario saved against another release says so when reopened, even
   on the same data date. The page of every release stays available.
7. **The team layer starts as a local decision brief.** A chosen product, its state, what it passed, what is still
   unverified, its print recipe and treatment, and the test the team will run, exported beside the release it was
   chosen on. Shared approvals and a team test registry wait until the team has used this.

The plan's order holds: decisions true first, then the practical workflow, then operations. What each step did, and
the scenario answers it moved, is in [RESPONSE.md](audits/2026-09-27-v2.1-review/RESPONSE.md). The acceptance
portfolio (twelve source-grounded questions whose expected answers were written before the code that meets them) is
[ACCEPTANCE.md](audits/2026-09-27-v2.1-review/ACCEPTANCE.md); its answers were written by an agent, and wait for a
person's review.

## Decided on 2026-09-28, for source backup and targeted gap closure

The owner asked Codex to execute `lively-gliding-allen.md` on `v2`, and confirmed all generated targets rather than
only the 32 multi-question facts. GOALS steps 2 and 5, C6/C9/C13: back up source bytes and derived evidence to the
private OneDrive store first; re-read cached sheets; mine held documents only where they settle a frozen target;
then search the makers' product pages, downloads and print guides for remaining print-settings targets. Print tests
stay out, unknown conditions are never inferred, and a bounded unsuccessful search remains a recorded result.

- **b38** permits the held Recreus PET-G sheet (2023 revision, cached digest `9cb0b12cb848a735875ffac3e8b059902bc6d7c12584d3d6414d8d9d4558eb38`)
  for G020-70's heat-deflection targets. Its printed page identifies PET-G, not the ledger's unsupported High Flow
  label. Its broken glyph mapping requires optical extraction and visual row review. Other held sheets enter only
  if their exact identity and question-specific fact are established; the general import pause remains.
- **b39** permits maker-site witnesses for the 65 chamber targets in
  [TARGETS.csv](audits/2026-09-28-gap-closing/TARGETS.csv), minus those settled in A/B. The frozen file names every
  authorized product. New retrievals retain their own bytes, date and digest; searches that find no applicable
  chamber statement are recorded without treating silence, an unavailable site or an unresolved identity as a value.

## Decided on 2026-09-28, polymer names

The owner, looking at the page: materials named "polymer not stated", and "TPU, hardness not stated", hold products with
good data, and naming them so is not acceptable. Search the sources beyond the data sheets and name them. Built in m223
(D106; the record is [2026-09-28-polymer-names](audits/2026-09-28-polymer-names/README.md)):

1. **A product is filed under what its maker's documents name**: its safety data sheet, pages, guides and older
   editions, searched before it enters a home. 28 of the 41 products the homes held are settled so. The eight TPUs
   are rated, and "TPU, hardness not stated" is a family entry. The bio-based compounds are a PLA blend.
2. **Where the documents fall short, the owner files on the best evidence, marked inferred.** Asked with the facts and
   a recommendation (keep them labelled as undisclosed), the owner chose to file two: Yousu Nylon and Spectrum
   ThermaTech PA under PA66.
3. **What no document names stays in a home that says the maker does not disclose it** (11 products), with the leads
   for a later ruling.

## Decided on 2026-09-29, the Ashby makeover

The owner asked for the external review and plan of 2026-09-28 (the package ASHBY-MAKEOVER-2026-09-28) to be built on the
branch Ashby-makeover, the Ashby tab staying coherent with the rest of the page. GOALS steps 3 and 4, C7: the chart becomes
a selection exercise over exact product states, with one goal for the table, the chart and the export, a line that counts
what it is drawn over, and an objective stage (D107). No verdict moved; rankings of conditioned questions lost the
materials that had ranked on a state they do not publish. The same day, after using it, the owner asked for its controls
to be reworked: one control row whose words do not change, the filter rail as the one place for requirements, the line
as a guide (the objective stage removed), and material ranges drawn as the table summarises a material, variants apart
(D108; no verdict or ranking moved); then every option laid out in three rows with one planned effect each, the axes on
the chart, and the reader's zoom, list and place kept through every press (D109); the views ordered coarse to fine
(Material typicals, Material ranges, Products) with the test pairs under More, a shape per filler on every view and a
mark's details in place of the list (D110); every view laid out, sized, framed and labelled by one rule (D111); and
Material typicals drawn as one dot per material that points to Material ranges (D112). None of these moved a verdict,
ranking or count. The team trial that would re-score C7 has not been run ([the record](audits/2026-09-29-ashby-makeover/README.md)).

## Decided on 2026-09-29, the gap-fill tranche

The owner asked for the reviewed gap-fill research of 2026-09-28 (the packages GAP-FILL-PLAN-2026-09-28 and
GAP-FILL-RESEARCH-2026-09-28, with their implementation handoff of 2026-09-29) to be finished, putting only its
defensible, useful improvements into the tool: on a branch of the latest main in a separate checkout, committed
locally, and pushed to main on 2026-09-30 at the owner's word. GOALS steps 2 and 5, C3/C6/C9/C10; step 6 only if its prices passed their own gate. It is a
bounded exception to the import pause, not its end, and adds no product, material, identity or estimate rule.

- **A fact is recorded from the document already held where that document prints it.** The research read most of its
  facts on newer copies of pages the database had registered; where the registered page prints the same line, the fact
  is recorded from it (m225) and the copy stays in the research package. 25 values, one column correction and eleven
  drying schedules entered so.
- **b40** takes nine exact-product pages the research saved and the database did not hold, staged from its copies by
  digest, each for its product's drying schedule and, for Recreus Conductive Filaflex, its nozzle and bed (m226).
- **Held**: the two findings the research held, Spectrum GreenyHT's contested identity, and every price. After the
  plan's own rules, eight comparable offers remained, all foreign, and the currency contract they need was not built
  for them; price still waits, as decided for phase 6 ([OPEN-PROBLEMS §21](OPEN-PROBLEMS.md)).
- **Price keeps waiting (2026-09-30).** Asked with the facts (732 products pass at least one template or acceptance
  question and 34 of them have a price) and a recommendation (a Canadian price for each passing material's best
  product, in the current CAD contract, before any currency work), the owner chose to keep price waiting for now. When
  it resumes, that pass comes first; foreign prices only for passing products no Canadian seller carries. Revisit with
  the team layer's refresh routine, or when the team asks for cost.

## Decided on 2026-09-30, the price pass

Later the same day the owner started price (GOALS step 6): **a price for each material**, and for each product where
that is possible, which is good to have but not required. It takes the place of "Price keeps waiting" above, which is
kept as what was decided that morning. The record is [the price pass](audits/2026-09-30-price-pass/README.md).

- **CAD first.** A product's price comes from a Canadian shop in CAD where one sells it. Where none does, an Amazon.ca
  listing counts as the last Canadian option, only where the seller is the maker's own store and the page shows its
  regular price. Then the maker's own shop or a seller in USD, then in EUR with the VAT taken off at the rate the page
  states. A foreign price is compared at one frozen Bank of Canada rate per currency, and says so wherever it is shown;
  it never makes a product "listed in Canada", buyable here, or its material's Canadian-price gap closed.
- **Exact product, regular price, from a saved page.** 1.75 mm, one spool or refill, its net mass printed; a sale price
  is kept and never compared; every number, the currency and the stock state are read from the page the shop served,
  fetched and hashed like any document (D35). Research notes and search results are leads, never values.
- **Bounded.** A material is searched product by product, tier by tier, and stops at the first usable price; a tier
  that gives nothing after the maker's shop and two sellers passes the material on, and a material no tier prices is
  recorded as such. The 33 materials priced on 2026-09-10 keep their prices; no refresh routine is built here.
- It is a bounded exception to the import pause (batches p01 to p04), like b34 to b40, and adds no product,
  material, identity or estimate rule.
- **Where it ended (2026-09-30).** 101 of 136 materials have a price (33 before), 71 of them from a Canadian listing and
  30 converted from USD or EUR, marked ¤; 214 products have their own (38 before), 146 of the 732 that pass a frozen
  default question. The 35 without one are listed with why in the record's OUTCOMES.csv (OPEN-PROBLEMS §22): no
  procurement product, a product its maker no longer lists, a shop that prints VAT without its rate, out of stock
  everywhere, or not found in a bounded search. No verdict moved: every template tracks price, none requires it.

## Decided on 2026-09-30, the coverage-expansion campaign

The owner approved the end-to-end plan for all 136 existing H2C-relevant materials and their active products:
GOALS steps 2 and 5, C3/C6/C9/C10/C13. Application means sourced intended-use, finishing and limitation
assessment, never suitability rules. Environment keeps category-level screening and its exposure caveat.
Research first reuses the registered originals and the reviewed 2026-09-28 packages, then bounded targeted
maker routes. New documents needed by this frozen existing-catalogue worklist may enter through the import
pipeline; this is a campaign exception, not a reopening of general imports. No catalogue expansion, estimate
model change, manufacturer messaging, physical testing, price refresh routine or push is authorized.

One injector applies guarded, idempotent migrations. An independent AI reviewer rereads every new deciding
fact, identity correction, conflict resolution and Application judgement; narrative additions are sampled.
The first batch has at most twelve products and is verified and committed before production expands.
Every target keeps a final evidenced outcome, including unresolved, inaccessible, vendor-needed and test-needed
ones. A bounded search never proves universal absence. Local commits require the repository's complete checks.
The external campaign package is `COVERAGE-EXPANSION-2026-09-30` beside the owner's two gap-fill packages;
public audit reports must contain no private source originals or machine-specific source-store paths.

## Authorized on 2026-10-01: document and publish completed campaign work

The owner asked for coherent, current repository documentation of everything completed and remaining,
then a push to main. This lifts the original campaign's local-only publication boundary for the already
reviewed work and its documentation. It does not mark the campaign complete, expand the catalogue,
reopen the general import pause, authorize messages/testing, or change the evidence/selection contract.

[Current status](audits/2026-09-30-coverage-expansion/STATUS.md) is generated from the build, the frozen
1213-target inventory and approved committed task outcomes, and checked in verify:fast. It separates
UI marks, manual material assessments and joined product passes. The historical audit packets and
failed/corrected review receipts remain intact. The [effort/value recommendation](audits/2026-09-30-coverage-expansion/EFFORT-AND-VALUE.md)
is an estimate for the owner, not an automatic change to the all-target plan or a new spending authority.

## Decided on 2026-10-01, the error-class sweep

After the PM trial and the data audit of 2026-10-01 (external package `PM-TRIAL-2026-10-01`), the owner approved a plan
whose goal is the important PM findings and the audit's root causes removed at their mechanisms, not its sampled
records patched one by one: GOALS steps 2 and 5, C1/C3/C4/C5/C6/C9/C15. Scope: the confident wrong answers, the data
root causes and their guards; the rest of the PM findings are a specified backlog. Approved rule changes: a Parse
review covers only the columns it names (D115); what a page states once applies to the values on it (D116); "Official
Bambu product" means made by Bambu (D118). Declined: typical values from as-printed values only (a badge discloses the
state instead) and print checks on by default. The page sweep is led by the guards' signals with a residual random
sample; agent-read corrections enter by migration, guard-checked against the cached sheet, with a 30-record owner
spot-check. Work on a branch, one verified commit per phase, pushed when the owner says. The record is
[the error-class sweep](audits/2026-10-01-error-classes/README.md); on 2026-10-01 the owner asked for it to be
documented and pushed to main.

## Decided on 2026-10-02, print profiles by cause

The owner asked for a middle ground between another random draw of profiles and a re-read of all of them: find the
root causes, fix every profile each cause touched, and have Claude Sonnet read wherever reading is needed. A script
marks every line where a profile error could hide; Sonnet readers judge only the marks; each cause is fixed in the
import's sheet reader and the parsers, which the guard runs over every profile; fresh draws measure what is left, and
each family they find is taught and swept the same way. The record is
[the profile root-cause sweep](audits/2026-10-02-profile-root-causes/README.md) (D120).

## Decided on 2026-10-02, the open-problems pass

The owner asked for every open problem to be ranked, then for every fix an agent could make on its own, with the
decisions that ranking recommended, and Claude Sonnet agents wherever they could work: GOALS steps 2, 4 and 5,
C3/C5/C6/C9/C13/C15. The recommendations taken: a product held on two grades is merged into one, its records moved
rather than its copy retired (D123); values a registered, hash-checked sheet prints and nobody transcribed are recorded,
which is not an import (D123); a stress at a stated elongation is a property of its own (D122); Eryone's template "X-Z"
bar is the Z bar (D123). The fibre rule became a rule (D121). Not taken here, because they are the owner's, the makers'
or people's: FiberFlex Aero's filing, retiring profile notes, a twin's additive-specific nozzle statement, the maker
questions, the next campaign tranche, the spot-check and the team trial (OPEN-PROBLEMS §29). Built on a branch; the
owner then asked for the documents to be made consistent and the work pushed to main the same day. The record is
[the open-problems pass](audits/2026-10-02-open-problems-pass/README.md).

## Authorized on 2026-10-02: finish material assessment, then priority products

The owner resumed the coverage campaign after requesting reconciliation with current main. The current tranche
finishes the 61 remaining material Application assessments first, then completes 100 additional priority live-product
passes, with an optional expansion to 150 only if the measured benefit supports it. It replaces the previous requirement
to finish every catalogue product in this run. Unselected products remain explicitly pending, never silently closed.

The product-owner aim is better defensible shortlists and useful product guidance (steps 2 and 5, C3/C6/C9/C10/C13),
not a higher percentage obtained by duplicating maker claims. Rank the live products using freshly replayed scenario
gaps, practical print/state blockers and unresolved source/identity defects; favour reusable maker documents and
products with a credible evidence route. Reuse the error-class/profile/open-problem sweeps of D115–D123 rather than
repeating them. Preserve source conditions and pending owner/vendor/test decisions. Use one writer and the campaign's
independent AI review gates, maker batches of at most 12 products and coherent verified commits. Reassess yield after
five batches and shorten low-return routes without dropping assigned targets. Existing no-contact/no-testing/no-price-
refresh and no-catalogue-expansion boundaries remain. This resumed tranche ends in verified local commits,
as the original research plan states; the earlier publication receipt covers the work already published on 2026-10-01.

## Working rules

1. **Goal first.** Name the step and scorecard line a piece of work improves.
2. **Record everything, verify what decides.** Recording a fact stays cheap. The strict checks go on verdict values.
3. **Show the decision diff.** Every change reports how many scenario answers it moved (`build/snapshot/templates.csv`).
4. **Targets before volume.** Decision-tier data closes a gap the tool shows, never just for completeness.
5. **Budget.** `npm run verify:fast` stays at or under 90 seconds. A new check or document fits the budget or
   replaces something.
6. **Questions to the owner** come with a recommended answer, what they affect later, and when to revisit them.
7. **Re-check decisions at scale.** Whenever the data triples, and at each phase end, re-score the table above and
   re-read the root decisions.
8. **The owner sets direction; agents build.** A change of direction updates this page first.
9. **Say only what is true.** Counts are generated. A review says who, or what, made it.

The second priority-product batch (2026-10-02, Polymaker12) recovers source-grounded PC-Max XY measurements
and coherent TPU90 ISO37 results, and admits ABS Pro's explicit50°C+ chamber minimum. Its
[report](audits/2026-09-30-coverage-expansion/priority-02-report.md) separates published facts,
automatic recalibration and changed scenario answers. All Application judgments remain source-bounded;
maker know-how creates no suitability passes. C3/C6/C9/C10/C13 verification and remaining source limits
are recorded with the tranche; the dated score values are unchanged.

The final four selected maker batches (priority06–09,2026-10-04) complete source review of46products,
including22previously missing drying schedules, scoped chemical claims and unresolved revision/identity
limits. Their [report](audits/2026-09-30-coverage-expansion/priority-06-09-report.md) records actual
answer movements, verification and guarded holds. Selected-product closure is counted only after its
verified local commit in the generated status; full-catalogue targets remain outside this narrowed run.
