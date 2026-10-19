# The owner's decisions, dated

> **In short.** Every decision the owner has made about the tool's direction since the re-center of 2026-09-25, dated, newest last: what was asked, what was recommended, what was chosen, and which DECISIONS entry or round record built it. What the tool is for, its method, scorecard and working rules are in [GOALS.md](GOALS.md); this log was the second half of that page until 2026-10-15. A new decision is added at the end with its date, and one that changes the goal, the method or a working rule changes GOALS.md in the same commit.

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
- **New document imports are paused** until the re-center is built (lifted on 2026-10-05: check round 3, item 5, below). The documents already fetched are mined first:
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

The second priority-product batch (2026-10-02, twelve Polymaker products) recovers source-grounded PC-Max XY measurements
and coherent TPU90 ISO 37 results, and admits ABS Pro's explicit 50°C+ chamber minimum. Its
[report](audits/2026-09-30-coverage-expansion/priority-02-report.md) separates published facts,
automatic recalibration and changed scenario answers. All Application judgments remain source-bounded;
maker know-how creates no suitability passes. C3/C6/C9/C10/C13 verification and remaining source limits
are recorded with the tranche; the dated score values are unchanged.

The final four selected maker batches (priority06–09, 2026-10-04) complete source review of 46 products,
including 22 previously missing drying schedules, scoped chemical claims and unresolved revision/identity
limits. Their [report](audits/2026-09-30-coverage-expansion/priority-06-09-report.md) records actual
answer movements, verification and guarded holds. Selected-product closure is counted after its
verified local commit in the generated status; full-catalogue targets remain outside this narrowed run.

The selected run closed on 2026-10-04: all 136 material assessments and 100 additional priority products
have reviewed outcomes; final data commit `5397478` is named in the completion ledger. Optional
expansion to 150 was not frozen: observed yield favours targeted held-source admission and human/team
validation over another broad sweep. The full-catalogue backlog and source limits remain explicit.

## Authorized on 2026-10-04: publish the completed selected run to main

The owner requested a final documentation, naming and coherence check, then publication to main of
this completed selected run. This supersedes its local-only publication boundary, without extending
research to the 930 unselected historical catalogue targets or the optional next 50 products.
Preserve signed source/review artifacts and dated historical reports. Current status and the selected
completion report own current counts; the publication check records links, path/migration naming,
source-review hashes and a zero-behaviour documentation diff. Push normally after full verification,
retain remote changes, and let the existing Verify/Pages workflows run their gates.

## Decided on 2026-10-04, the engineer-grade interface

The owner used the page and found the left rail's arrangement, its wording and the material drawer hard to follow:
the H2C checks sat on top and again at the bottom, the part's state mixed a checkbox and a radio without saying what it
did, the collapse marks read as dots, and the drawer's sentences read as the database talking to itself. GOALS steps 1,
4 and 5; C1, C7 and C8. No verdict, count or ranking moves. The owner's answers:

1. **The rail is ordered as an engineer screens.** Material family, Mechanical, Thermal, Environment, then **Printing on
   the H2C** (which replaces Compatibility and the two boxes that sat above every group: one box for the H2C's
   temperature limits, with nozzle, bed and chamber under it), **Part condition**, Cost and availability, Data quality.
2. **Part condition is a group of its own,** lower down: post-processing (as printed, or annealing allowed) and moisture
   (dry or conditioned), each saying what it does to the answers.
3. **The drawer's tabs follow how a material is checked:** Overview, Products, Mechanical, Thermal, Printing,
   Environment, Price, Sources. Mechanical and Thermal stay apart. Coverage joins Sources as its known gaps, and Products
   and Sources say how they relate: a product is what you buy, a source is a document its values were read from.
4. **Record IDs leave the page's sentences.** A source button beside a value holds them. The decision brief and the
   exports keep them.
5. **Write for the reader.** The reader is an engineer: mechanical, thermal, material family, tensile modulus, HDT,
   conditioned and annealed are their words and stay. The project's own coinages ("twin", "admitted for screening",
   "research mode", "in scope", "Theoretical") go, and every text is written knowing whom it serves and what decision it
   supports (D124).

## Decided on 2026-10-04, the reader round

The owner opened makers' sheets the tool called silent and found the values printed there (purefil's LCP sheet prints
its nozzle, bed and drying), and asked for a reader equal to the sheets' many layouts, the gaps re-read with it, and the
mismatches it meets corrected: GOALS steps 2 and 5; C3, C4, C9, C11, C12 and C13. The owner's answers:

1. **Every page of every document tied to a gap is re-read**: a material or product missing a print setting (nozzle,
   bed, chamber, drying), a mechanical value (tensile strength, modulus, elongation, density) or HDT, and the conflicts
   the coverage page notes. Claude Sonnet reads the page images; the import's reader learns each layout it missed, so
   its guard checks every profile and value afterwards. What a registered sheet prints enters by migration, each number
   checked on its page (D123); a number only an image shows needs two independent reads that agree.
2. **Makers' sites are searched** for the materials with two sources or fewer, for every product still missing a nozzle
   or bed after the re-read, and for a chamber only where no product of its material states one. A new document enters
   through the import pipeline (batches b41 onward), a bounded exception to the import pause like b34 to b40. A search
   that finds nothing is recorded as searched, never as a value.
3. **What is shown keeps physical order.** An estimate is floored by the product's own yield, break or tensile strength
   when its bar is printed or its specimen is not stated, in any direction; moulded, film and strand values stay out. No
   number shown may break an order physics sets: the ultimate strength is at least the yield and break strength,
   elongation at break at least elongation at yield, HDT at 0.45 MPa at least HDT at 1.8 MPa.
4. Built on a branch, and pushed to main when done.

## Decided on 2026-10-05, the reader round's open calls

The owner accepted the three recommendations the reader round left open (OPEN-PROBLEMS §30):

1. **A maker's "Heated Chamber: Recommended" with no temperature stays unknown** on the H2C's chamber (D33, D93): it
   cannot be checked against the 65 °C limit, so the product waits for its maker to print one. PPA-CF and ASA-CF keep
   their unknown answers in four templates.
2. **A conditioned density stands in for no headline.** A sheet that prints density only after moisture conditioning
   leaves its product's density unpublished; no product is affected today.
3. **Two makers' sheets that print the same numbers stay two products**, each with its own sheet's values, accepted as
   twins with a reason and never retired, until a maker says one is the other's rebrand (Raise3D Premium PETG and PC
   beside Polymaker's PolyLite sheets; the Extrudr language editions).

## Decided on 2026-10-05, gap round 2

The reader round named the causes that still keep values out or wrong; the owner asked for a round that works them by
priority (OPEN-PROBLEMS §30 and the sections it bundles with), Claude Opus deciding and Claude Sonnet doing the reading
and coding, and chose:

1. **Bambu Lab's guide fills a silent product's drying**, labelled as the guide's, as it fills nozzle, bed and chamber
   (D88): a product whose own sheet and twin say nothing about drying reads its material's guide row.
2. **Drying is recorded as it is stated**: required, optional or not needed, with an open-ended duration ("6+ hours",
   "> 5 h"). A sheet that says drying is not needed no longer counts as publishing a schedule.
3. **A page statement can be scoped to the table it heads**, not only to a page and a class of property.
4. **New documents within a bound**: the thirteen held sheets that failed only on the reader's limits (OPEN-PROBLEMS
   §14), and the makers' own sites for the products still without a nozzle or bed, those with no document read, and the
   materials with no data (batches b43 onward, a bounded exception to the import pause like b41 and b42).
5. Built on a branch, checked for documentation consistency and for the fixes' effect, cleaned, and pushed to main.
6. **A twin reads its sibling's hardened-nozzle statement only where it holds no profile of its own** (the reader
   round's recommendation, OPEN-PROBLEMS §28), approved with the round's plan; D127 records it.

## Decided on 2026-10-05, the owner's answers after gap round 2

After the round, the owner answered the questions it left (OPEN-PROBLEMS §29 and §31), and asked for the documents to
be written for a reader who does not hold the project's names and numbers in mind:

1. **The questions for makers are not sent.** `MAKER-QUESTIONS.md` stays as a record of what only a maker could settle.
2. **Filing questions are Claude's to judge** from the documents and the makers' sites, with the reasons recorded: eSUN
   eSilk-PLA, Fiberlogy FiberFlex Aero, Polymaker's PLA Pro beside PolyLite PLA Pro, and purefil's POM (D130, m368).
3. **A page that says two things about drying shows both.** Where Polymaker's pages print a schedule in one place and a
   condition in another, the product reads the page as a whole and keeps the other statement beside it (D130, m367).
4. **Test bars printed at 20 % infill are labelled, not hidden.** Their values stay visible with that label and never
   stand for the product or the material (D130, m366).
5. **The makers' extracted text stays on this machine**, with the whole document cache backed up to OneDrive in an
   organised, searchable form (`npm run data:sources -- --export "$H2C_SOURCE_BACKUP" --derived` writes an index and a
   README there). The context audit stays a local check.
6. **GitHub runs less**: the full check once per push to main (and on pull requests), the site published after it
   without repeating it, and the 2,000-scenario run weekly instead of nightly.
7. **The documents say where things stand in plain words first** (README, `docs/README.md`, and an opening section on
   each main document), with the details, numbers and citations below; every dated audit says plainly that it is a
   historical record.

## Decided on 2026-10-05, check round 3

The owner asked for the next stage to fill what gap round 2 left, add checks that work, use OCR only where it is needed,
re-check the rest cheaply with Claude Sonnet, and find the causes of our own mistakes (D131,
`docs/audits/2026-10-05-check-round-3/`). Along the way the owner decided:

1. **OCR is a one-off check, with Mistral's best model only** (`mistral-ocr-latest`), and its key never enters the
   repository. The account allowed no requests, so the check did not run; the script waits in the packet.
2. **The documents whose bytes were lost are fetched again** and added to the checks and the OneDrive backup. A page
   that changed since is kept beside the store as a later copy and read as one; it is not registered (D131).
3. **The round is pushed to main when it is finished** and its documents are up to date.
4. **GitHub's check is split to wait less.** On every push the data checks and the interface checks run side by side,
   and the scale and reproducible-build checks move to the weekly run beside the 2,000 scenarios; every step still
   runs locally before a push. A Chrome that fails to start is launched once more instead of failing the run.
5. **The import pause is lifted.** The pause of 2026-09-25 (above, "Decided on 2026-09-25") ends: a new document may enter
   through the import pipeline whenever a round needs it, with no exception to ask for. Nothing is imported now; the
   rules for how a document enters (IMPORTING.md, AGENTS.md) are unchanged.


## Decided on 2026-10-06, published impact evidence and its explanation

> **Withdrawn on 2026-10-06** (D132): reverted the same day; see "Decided on 2026-10-06, later" below.

The owner asked to execute the [published-evidence plan](audits/2026-10-06-published-evidence/README.md):
GOALS steps 2 and 5, and the existing interface in step 4; C3–C10 and C13. The round freezes at most 24 existing
products, re-reads published impact values and practical blockers, and records every outcome and bounded hold.
PLA remains grouped: Tough/Pro products keep their own identity and values inside PLA. No taxonomy, median weighting,
selection policy, new view, toughness estimate, physical test or manufacturer contact is authorized.

A display-only Impact and toughness topic holds exact maker statements with sources; claims decide no requirement.
The current drawer explains each impact test and its state eligibility, and identifies the exact products and makers
contributing to the material median. Registered originals are restored before searching; changed bytes remain separate
revisions through the import pipeline. Source-first guarded migrations and full verification precede local checkpoint
commits. The dated execution packet retains assignments, verification and the next action so another AI can resume
without repeating completed reads. The original plan deferred publication; the owner subsequently authorized it below.

## Authorized on 2026-10-06: document and push the completed published-evidence work

> **Withdrawn on 2026-10-06** (D132): the pushed work was reverted; see the section below.

The owner asked to make sure the documents reflect the completed work and push it to main. The implementation is
commit `f57dffdaf106fa5029d778799d5cc6723214e498`, release `3d10601675b8`: 24 target outcomes, 27 confirmed readings,
fifteen exact-product claims, existing impact-test/state explanations and median contributors, with zero changed
numerical answers. Its source custody, eight source-conflict holds and eight chamber holds remain explicit.

The publication checkpoint updates the user guide, interface/data model, documentation map and current handoff, then
passes the repository checks and advances main without overwriting remote work. This authorization does not start
another research batch, change the selection policy, send maker questions or commission physical tests. The normal
Verify and Publish to Pages workflows run from main; their success and the live manifest are checked separately from
the Git push.

## Decided on 2026-10-06, later: revert the impact round, and compare the two impact tests properly

A review of the pushed round found it moved no number but put wrong words on the page (D132, now withdrawn): seven
products read "Not stated by the maker" beside the statement that states it, 34 impact records read "not stated" for a
condition their page gives once for the table, and a "+" in a product's name was read as a claim of toughness. The owner
asked to revert it and to do the job again. In their words: "the main goal is to give the reader in the drawer section a
better way to make comparison of the two impact measures. And also for cases that there is tough filament (like PLA
Tough and Pro) bundled with other types pushing the range high, the reader does not make mistake that for all of the
types." Fetching or re-fetching data is allowed where the gap is large.

- **The revert keeps the verified data.** The later saved Bambu PLA Tough+ page and the four maker statements found on
  their hashed pages stay, under the topics they belong to; the eleven moved statements go back (m384). Nothing is
  deleted.
- **The drawer compares notched Charpy and notched Izod side by side**: one dot per product on a shared kJ/m² scale for
  each test, and a table of products with both columns. No value is converted (D92, D94).
- **Products sold as toughened are named.** First the material's median stays over all its products and the drawer shows
  the split (how many values are from products their makers sell as toughened, and what the rest give). Once the marks
  pass a check for missed products, toughened products are set apart from the impact medians only, as special
  formulations already are. (Built: D133 sets them apart; the marks were checked and widened in m400 and m408, D134.)
- **The data round covers every material's impact values**: what cached sheets print and no row holds, the errors found
  in what is held, and a small fetch of well-known toughened PLAs that are absent. Reading and fetching are done by
  Claude Sonnet agents; targets, judgements and migrations by Claude Opus.

## Decided on 2026-10-07, the quality round

The owner asked which open problems are left that need no person's test or opinion, sorted by priority, and then to
"plan number 1 - 14 in an efficient way. Sonnet for labour and Opus for brain. Report during the run. Make sure
everything in the data and tool is coherent and non conflicting with your changes. Push in the end." The fourteen items
are the open-problems list of that day (OPEN-PROBLEMS §8, §17, §18, §22, §30 to §32): copies of moulded values, digit
suspects and garbled pages, the later copies of refetched documents, outliers, hidden duplicates, a small batch of named
records, a page's statement of print orientation, the impact readings the impact round held, thin materials, unpriced
materials, unmarked toughened products, purefil GreenTEC, PA612-GF's heat deflection estimate, and unreachable sources.

- **Who did what.** Claude Sonnet agents read pages (978 tasks on 387 documents, then the held impact columns, six
  sheets' mechanical tables, five documents for import and a blind draw), searched the web and fetched documents.
  Claude Opus froze the targets, judged every reading, wrote the code and the migrations (m394 to m408), and checked
  each part with `verify:fast` before its local commit.
- **Imports through the pipeline**, as open since 2026-10-05: one batch of documents (b45) and one of prices (p05).
- **What a person or a maker must still decide** is in OPEN-PROBLEMS §33, with the round's record in
  [docs/audits/2026-10-07-quality-round/](audits/2026-10-07-quality-round/README.md) (D134, D135).

## Decided on 2026-10-07, the completeness round

The owner asked which open problems agents can fix now, by priority, and chose "10, 1, 2, and 5 together, then 12, and
4": the open-problems page's stale lines (10), values the held sheets print and the tables lacked (1), products and sheets
counted twice (2) and held sources without full text (5); then the tooling debt (12); then the makers' statements in
documents nobody had read for them (4).

- **Who did what.** Claude Sonnet agents read pages (311 sheets for values, 510 cells read again blind, 208 documents
  for makers' statements, the duplicate pairs and two blind draws). Claude Opus froze the targets, judged every reading,
  wrote the code and the migrations (m409 to m413) and checked each part with `verify:fast` before its local commit.
- **What a person or a maker must still decide** is in OPEN-PROBLEMS §34, with the round's record in
  [docs/audits/2026-10-07-completeness-round/](audits/2026-10-07-completeness-round/README.md) (D136).

## Product uncertainty and screening, 2026-10-08

The owner authorised a fix for OPEN-PROBLEMS §35 (steps 2, 4 and 5; C4, C6, C8, C12). Keep evidence verdicts, predictions and shortlist eligibility distinct. Each catalogued product reads its own missing-value predictions even when siblings publish; measured values always win. Estimates never pass. New exclusion permissions require separate formulation-group calibration and complete-scenario evaluation, within the existing 10% wrong-exclusion / 90% confidence budget allocated across numerical tests and alternative routes. Unsupported contexts and insufficient independent cases stay unresolved. Observed material spreads and source records do not change. Under Include uncertain, separate estimated candidates to verify from insufficient evidence; preserve scenarios, ranking and exports. Finish with full local verification, reviewed scenario differences, a push to main and verified deployment.

## Decided on 2026-10-15, the maintainability round

The owner asked for an architecture review (2026-10-14: [the review](audits/2026-10-14-architecture-maintainability/README.md))
and then for its eight recommendations to be carried out, keeping the code clean and readable, everything working and
the documents useful; Claude Opus as the brain and Claude Sonnet agents for labour; pushed to main at the end. Asked
with a recommendation each, the owner chose:

1. **A round's working files go to the private evidence store** (`$H2C_SOURCE_BACKUP`, beside the source documents),
   each listed in its round folder with its digest; git history keeps them too.
2. **The two failures of the weekly check of 2026-10-11 are fixed in this round**: the reproducible-build check had no
   build to compare, and the fuzz read a material's assumed value where the engine rightly judged its product's own.
3. **OPEN-PROBLEMS is filed by subject**, its section numbers kept as the items' names.

Built as D138; the record is [the maintainability round](audits/2026-10-15-maintainability-round/README.md).

## Decided on 2026-10-16, the impact heading's way of reading reaches tensile and heat results

The owner read what the impact round built in the drawer (a dot per product, the median table, then every result with
its document) and found it a good setup for more of the drawer: mechanical, thermal "and maybe even printing". Asked
four questions, each with a recommendation, the owner chose every recommended answer:

1. **Two more headings.** Mechanical gets **Tensile tests, XY and Z**: tensile modulus, tensile strength and elongation
   at break, each a scale with an XY row and a Z row. Thermal gets **Heat deflection and glass transition**: HDT at 0.45
   MPa, HDT at 1.8 MPa and Tg on one °C scale. Vicat (its A50 or B50 method is typed on none of its rows) and flexural
   results stay property lists.
2. **The new rows are drawn in the drawer alone** (tensile modulus Z, elongation at break Z, HDT at 1.8 MPa): no filter,
   table or export column, chart axis or answer reads them; one can be made selectable later, when a part needs it.
3. **One tensile heading with three graphs**, as Impact tests is one heading, rather than three headings.
4. **Printing comes second**, after the owner has seen the first two: each product's lowest and highest print
   temperature as dots, the H2C's limit drawn, a dot opening its profile. The owner saw them the same day and said to go
   on; it was built then.

Claude Opus designed, judged and wrote the code and migrations (m414 to m416); Claude Sonnet agents wrote tests from its
specifications, read every material's new headings against a checklist, re-read a sample of the newly drawn values on
their pages and proofread the living documents. Built as D139, and pushed to main at the owner's word.

## Decided on 2026-10-16, later: flexural results drawn, their relation to tensile ones explained

Having seen the tensile, heat and print temperature headings, the owner asked, of what the drawer already holds, for
"the same thing for the flexural", an expandable explanation "in a subtle way" of the theoretical relation of flexural
and tensile results, and tensile strain at strength under the tensile heading, "if not a good idea tell me why"; then to
make everything coherent, complete the repository and push.

- **Flexural tests, XY and Z** on Mechanical: flexural modulus and strength, each an XY row and a Z row, drawn in the
  drawer alone, with a closed line **How flexural and tensile results relate**.
- **Tensile strain at strength** is listed inside the tensile heading rather than drawn, since it is another endpoint
  than elongation at break, seldom published (8 materials with two products) and mostly with no orientation; the reply
  to the owner said why.

Built as D140 (m417) by Claude Opus, Claude Sonnet agents sweeping the headings and re-reading a blind sample.

## Decided on 2026-10-16, a page of its own for each well-documented material

The owner proposed an independent HTML page per material, opened from the drawer, "like a wiki page": a summary
written by us, then the material's data with figures beyond what the drawer can hold, designed to be read with
pleasure, and asked for a critical assessment against GitHub Pages' limits, CI load, maintenance and design
([assessment](audits/2026-10-16-material-pages/README.md)). Asked eight questions, each with a recommendation, the
owner chose:

1. **Not every material.** A page needs at least 3 products and 20 measured values (76 of 152 materials on the day);
   the recommendation had been every listed material.
2. **A written summary is allowed** under the recommended rules: no number typed by hand (a placeholder the build
   fills), its author, date and review status shown, deciding nothing; agents draft, the owner reviews.
3. **An embedded typeface, done professionally**, at once, where the recommendation had been the tool's own fonts and a
   decision on a typeface after seeing the prototypes.
4. **Processed, selected data on the page**, and every record behind a link on a records page: "Reading that much raw
   data and that many sources is not going to happen by any user. The page should contain usable data." (The
   recommendation had been every record on the page up to 3 MB, and a separate page beyond.)
5. **SVG figures drawn by the build**, designed professionally and consistently.
6. **Three prototype pages first**, approved before the rest.
7. **The pages travel with each GitHub release** as a zip.
8. **Only the drawer links to a page**; the recommended top-bar link was declined.

Then the owner asked for the execution to be planned with agents, Opus for logic and design and Sonnet for labour,
around one source of truth so the pages cannot diverge from the drawer, and approved the
[plan](audits/2026-10-16-material-pages-round/PLAN.md).

The owner then scored the three prototype pages 65/100: "not easy to read… both because of way of writing and
graphics", figures "almost what is already available in the drawer", and product tables "pure headaches to read and
scroll or search". After the redesign and two engineer reviews (66 and 72), the owner chose to go on, with one more
page pass and no further review. On 2026-10-17 the owner chose to run the build stage (step 3) and a data round on
what the reviews found at the same time (below), and to take the pages to main through a pull request first, then the
verify speed-up (below), then the summaries and the blind read on a branch from main.

Built as D142 in the [material pages round](audits/2026-10-16-material-pages-round/README.md); merged by the owner as
#3 (0a5259c1, with the data round) and #4 (f0e69019, the summaries and the close).

## Decided on 2026-10-16, the tool is named Filament Atlas

Readers had called the top of the page overwhelming. A redesign of its frame (the header, the status bar and the
filter rail, in one quiet design language) named the tool **Filament Atlas**, with a mark of three printed layers: a
name that says what the tool is, not which printer it was first built for. The owner merged it (#1, 9aac19e2) and
said of it, to the agent building the material pages: "The only meaningful change is change of the name of the
tool to Fillament Atlas and some graphical logos. Consider it from now on." The H2C is still named where it decides something (the rail's Printing on the H2C, the
gates, the templates); the built file's name, the exports and the briefs keep H2C Material Selector, which links,
scripts and saved files rely on ([INTERFACE.md, "The frame"](INTERFACE.md#the-frame)). Built by Claude (an agent);
the living documents name the tool so since 2026-10-17.

## Decided on 2026-10-17, a plausibility window is a check, never a filter

The owner saw, in the PEEK-CF drawer, LEHVOSS's "450 - 520 °C" nozzle beside a material window of 380–460 °C, and asked
for the root cause, what else it touched, and a fix; then for "any other issues like this".

- **The temperature parser filtered a cell's numbers by a plausibility window before reading the window**, so a stated
  endpoint outside it vanished and the window collapsed onto what was left; the typed columns, written from the parser,
  carried the collapse where PARSE-MISMATCH could not see it. Five print windows, three drying cells, one hardened-nozzle
  flag and 41 heat-deflection loads were typed again from their cells' own words (m420, m421), and the readers learnt
  the spellings; a number outside a window is now read and reported (PROCESS-WINDOW-IMPLAUSIBLE). Three scenario
  answers moved: PCL passes Flexible component and Indoor prototype, PETG passes Warm environment.
- **Two agents swept every other typed column against its reader.** What they found and the change did not fix is in
  OPEN-PROBLEMS §3, §4, §11 and §12.

Built as D141 (m420, m421) by Claude, with two Claude Opus agents sweeping the readers.

## Decided on 2026-10-17, a data round on what the material pages' reviews found

Two reviewers, each reading the new per-material pages as a mechanical engineer, scored them, and both found faults
that were in the data, not the pages: the pages show the data as it is. The owner chose to fix those faults in a round
of their own, run in parallel with the pages work on its own branch (data-review-fixes), and to decide its merging.

- **What the pages showed, fixed on the documents.** Kingroon's reprints of Bambu Lab's tables carry what each page
  states; tests only an elastomer is put through apply to elastomers (and tear strength and the 100 % stress to the
  polyolefins); Prusa's Horizontal and Vertical xz test bars are XY and XZ, as Prusa's own coefficient shows; eleven
  tensile moduli their own sheets rule out are flagged; a maker's word on moisture counts on the coverage page; one
  publisher is spelt one way; words broken at line ends, OCR-garbled titles and every XZ, ZX and YX label are as the
  sheets print them; two reasons say what their documents say.
- **Rules changed** (D143): Prusa's columns, a YX bar recorded as its own label, a maker's moisture statement a moisture
  record.

Built by Claude Opus (m422 to m432, D143), with Claude Sonnet agents sweeping publishers, broken words, titles and
orientation labels and re-reading a blind sample; merged into the material pages' branch, and to main by the owner
with it as #3 (0a5259c1).

## Decided on 2026-10-17, the checks take less time and lose none

The owner found the checks too slow and asked whether they are all needed, then to make them faster without removing
a needed check or any accuracy. Every check was found to guard what no other does, and none was dropped or loosened.
`npm run verify` and `verify:fast` now run the steps that need nothing of each other side by side, CI runs the 300
rendered scenarios as three jobs beside the data and views jobs (the weekly 2,000 as four), and the scale budget
re-runs a miss only where a miss can fail. On a 4-core Linux container, from an empty build cache, verify took 746 s
where it had taken 1,069 s; on the owner's 10-core machine, with the material pages' checks in, 432 s where the same
checks one at a time took 627 s. Built as D144 by Claude (an agent) on a branch, renumbered from D142 when the material
pages took that number, and merged by the owner as #2 (1b9c107f).

## Built on 2026-10-17, the material pages' summaries, their blind read and the round's close

The owner's plan for the material pages (D142, 2026-10-16) ended in two steps: a written summary at the head of each
page, and a blind read of the pages before the round closed.

- **The summaries.** 76 paragraphs, one per material with a page, in `material_summaries.csv`: every number a
  placeholder the build fills from the data, so none goes stale; drafted by Claude Sonnet agents from the pages alone,
  40 judged claim by claim by Claude Opus (5 false claims in the first pass, 0 after the second), and a style pass that
  revised 70 of them. All are drafts for the owner to review in batches.
- **The blind read.** Four Claude Sonnet readers read 40 pages by a seeded draw against their records pages, the drawer
  and the documents, and a fifth proofread the documents. Of their 233 findings, 152 were fixed at their cause (the
  drawer's drying count, counts that did not say what they were of, figure text cut on a phone, the project's own words
  quoted as a maker's, the nearest value's conditions), 38 are by design, 35 are left in OPEN-PROBLEMS §37. The data they
  traced was corrected in m433 to m436; no scenario answer moved.
- **The final review.** A fresh Claude Opus reviewer read PETG, PLA and PCTG-GF as a mechanical engineer and scored
  them 70/100 (the prototypes 65, the reviews between 66 and 72); its five changes and the inconsistencies it found are
  the owner's to decide (OPEN-PROBLEMS §37.18).

Built by Claude Opus on `material-pages-summaries` (D142, m433 to m436), with Claude Sonnet agents drafting, editing and
reading; merged to main by the owner as #4 (f0e69019).

## Decided and built on 2026-10-17, the material pages reimagined

The owner read the first material pages and asked for them to be reimagined, not patched: the text was not one account
from the first line to the last, the links and the way back were badly designed, the plots dull, the index a confusing
wiki, and the products page buggy and over-filtered. Three expert agents (UI/UX, content, data visualisation) each
proposed their side; the executor decided where they differed against the tool's goals and planned the build
([plan](audits/2026-10-17-pages-reimagined/PLAN.md)). The owner took its three recommendations: a quiet link from the
selector to the index, the page rule unchanged, and the alternatives listed for a read and kept to materials the H2C
can print. Midway the owner asked for the work to go much faster: weak parts were cut rather than polished, the
executor implemented the Overview directly, and a fixed definition of done replaced a full review per round.

- **Built (D145).** Each material has an Overview and a Products page; the records page redirects; the index is a list
  by family; one bar and a *Back to your results* that restores the selection, the drawer, its tab and the scroll;
  five kinds of figure on one scale per property; one evidence line instead of caveats in every sentence; the 76
  summaries rewritten as drafts (Claude Sonnet drafted, Claude Opus judged them against their pages, 55 changed).
- **Measured.** Three independent Claude Opus reviews, each by a reviewer who had seen no earlier version, scored the
  pages 58, 66 and 72 of 100 (the first pages 65 to 72 before); PLA's Overview 14,250 px at the second review, about
  10,900 at the close. No scenario answer, headline or gate moved. What the reviews leave is OPEN-PROBLEMS §37.19.

Built by Claude Opus with three Claude Opus expert agents and Claude Sonnet drafters, on the branch `pages-reimagined`.

## Decided and built on 2026-10-18, the selector refined

The owner asked for the selector itself, its main page and its material drawer, to be refined by the method the pages
had been, with changes "far more subtle": the tool "is good as is", the main screening tool at "an acceptable level".
The aim was a calmer, more coherent first impression and a drawer that reads, and the owner added that "anything that is
good in the drawer and in the actual tool should be recorded and then preserved or at least reproduced", with
first impression and coherence with the material pages weighed as the landing pages. The owner approved a plan with
priorities (keep what works as a gate, the two landing screens, the drawer's reading flow, coherence with the pages,
the rest of the main page) measured in a tracker, and answered: the main page polish only, the drawer free to change,
the material pages link as built, one new release for approved wording. At the gate the owner took all four
recommendations: fold the step line, the page's form for the drawer's key figures, rename the missing-data choice, and
reproduce six keep items in new form.

- **Built (D146).** The drawer prints the page's *On the H2C* and key figures, so the two agree (they had disagreed on
  the print windows, PEEK's bed *Within* under a failed bed requirement, and in 11 starred values); a thinner head and
  one row of tabs; the product shown for the requirements one the reader can buy; the maintainers' notes behind the ID
  mark; the graphs in the page's grammar. The main page: "Materials that could not be checked: Leave out | Include",
  the rail on what a part needs, the step line folded and the H2C clause said once, one control row, the table's marks.
- **Measured.** A fresh Claude Opus engineer scored the selector 62 before and another 70 after; the keep register's 45
  items all kept or reproduced; no answer moved. What it leaves is OPEN-PROBLEMS §37.20.

Built by Claude Opus with four Claude Opus expert agents (UI and visual, words, graphs, first impression and coherence)
and two Claude Opus reviewers, on the branch `selector-refinement` ([the round](audits/2026-10-18-selector-refinement/README.md)).


## Decided and built on 2026-10-18, the selector and the material pages made one tool

The owner found the selector and the material pages "very good, but also substantially very different", and asked for a
review, not a build: where they are incoherent, what each could borrow from the other, whether more coherence is worth
it, and which small fixes would make them feel like one tool ([brief](audits/2026-10-18-coherence-review/BRIEF.md)).
Five expert agents reviewed the frame, the flow, the drawer against the page, the graphs and the words, and a product
manager combined them into changes C01 to C54 and judgements V01 to V36
([recommendations](audits/2026-10-18-coherence-review/RECOMMENDATIONS.md)). The owner chose all of S1 (the shared words
and helpers, C01 to C13), the *do* changes of S2 to S5 (C14 to C22, C23 to C29 with C31 as the footer's option B, C32 to
C39, C40 to C44) and, of S6, the two leaning yes, C50 (Inter in the selector) and C51 (one meaning per colour).

- **Built (D147).** The drawer and the page say each fact from one function and in one set of words: dates as "13 Sep
  2026", one name for the guide, a bound with its sign, the gap count the list shows, the page's evidence word, a count
  of statements per exposure, the price the page's way. One provenance line on both surfaces ("release 9ca94d31fc5d ·
  documents read 10 Sep–7 Oct 2026"), one theme button, three radii, Inter in both, and a footer band that ends every
  page. The way back lands on the drawer's Products tab, whose products open in one stated order and link to their cards;
  the decision brief names the material page; the shortlist star follows the material's name. Parallel lines draws each
  line's result and the requirements, opens on the properties asked, and takes the Ashby chart's family colours, in
  which no family is blue.
- **Measured.** No scenario answer moved: `build:diff` lists words only, and every snapshot CSV but `pages.csv` is
  unchanged; the release moved from 3cc2e5f2a439 to 9ca94d31fc5d. `npm test` 709 of 709, `pages:check` 16 of 16, 300
  rendered scenarios, no layout failure, and every record each drawer reached it still reaches. What the round leaves,
  the six *later* changes (C30, C45 to C49) and the three the owner was advised against (C52 to C54), is OPEN-PROBLEMS
  §37.21.

Built by Claude Opus as executor, with four tracks side by side (words and frame by Claude Opus, charts and hand-offs by
Claude Sonnet), on the branch `coherence-review` ([the build](audits/2026-10-18-coherence-review/BUILD.md)).


## Decided and built on 2026-10-18, the screening rulings

The owner asked how the selector treats the materials it could not check, and a review answered it with three engineer
reviewers, a first-time user who never read the repository, two outside experts who saw only the data, and a product
manager's synthesis ([the review](audits/2026-10-18-screening-review/README.md)). It put ten decisions to the owner.

- **Chosen.** Yes to decisions 1 to 8 and 10, as recommended: sort the materials that could not be checked by what would
  settle each (one check away, not enough data, unlikely to meet); decide a sheet's silence on the chamber by the kind of
  plastic, and pass a printer window the H2C covers in part, flagged; let a plastic's physics settle a requirement nobody
  measured (rubber stiffness and neat density now, the limits read off the database after a back-test); let a value
  measured another way decide in its one safe direction, through an evidence ledger; a value just under the limit is on
  the line; an estimate only orders the list and tags "likely" when the range shown meets the limit; rename the switch
  "Use estimates and resin data"; the Flexible component preset asks tensile modulus at most 0.1 GPa; the outdoor preset
  warns that nylons are judged dry. Every change C01 to C40 of the
  [recommendations](audits/2026-10-18-screening-review/RECOMMENDATIONS.md) except C16, the architecture's "yes" items and
  its "later" item (one conversion layer shared by the estimate model and the ledger), and the estimate model reopened
  for C26 to C29 and PLA's class (C36), each with a decision and a back-test (D58, D138).
- **Declined: decision 9.** PA66-CF, PA612 and PA612-GF stay materials. The owner: "people are selling them, maybe the
  sources we find are not selling, but I searched and they are sellable". OPEN-PROBLEMS §5 records it for a later
  search; their behaviour is not changed beyond what the other changes do.
- **How it is built.** Stage by stage, each stage merged to main once its full `npm run verify` passes on the latest
  main; a new evidence rule lands reporting only and is switched to deciding in its own commit with its own answer diff;
  an Opus agent settles each flagged data value against its page and the owner gets the list to spot-check; Opus for
  design, code, migrations and judging, Sonnet for re-reading sheets, transcribing and sweeps. The plan and the stage
  reports are in [the build round](audits/2026-10-18-screening-build/README.md).
- **Built (D148 to D167).** Stage by stage, each merged once `npm run verify` passed on the latest main
  ([the build round](audits/2026-10-18-screening-build/README.md)): the switch renamed and "does not apply" hiding
  whatever it says (D148); four physics checks and the values they settled (D149); fibre content and Shore hardness
  (D150); the printer check by how much of a window the H2C covers, and a silent chamber by the kind of plastic (D151);
  on the line (D152); the evidence ledger (D153); physics limits of a kind of plastic (D154); the groups (D155); the
  Flexible preset's softness (D156); the estimate model reopened and back-tested (D157 to D165); and the corrections two
  independent reviews and a second blind trial found (D166, D167).
- **Measured.** Every preset's answers, before and after, in the round's table: the materials nothing settles, one
  folded list of 39 to 94 per preset before, are now one check away, not enough data or unlikely to meet. The two
  reviews found four wrong answers in the new code and the trial a misapplied "on the line"; all were fixed before the
  close. The second blind trial scored the labels 3.0 of 5 (about 2 before). What is left is OPEN-PROBLEMS §35 and §38.

Built by Claude Opus as executor with Claude Opus agents for each stage, the reviews and the trials, and Claude Sonnet
agents for re-reading sheets and fibre content, on branches `screening-build/stage-*`.


## Decided on 2026-10-19, the research intake (built)

The owner had an external research agent work the open problems an agent can close by reading and searching (priorities
1 to 4 of OPEN-PROBLEMS, outside the repository), and asked for its results to be taken in the repository's way: errors
fixed, new and updated sources entered, new products completed and entered, everything carried through the database,
the selector and the material pages, archived and documented, and OPEN-PROBLEMS rewritten for a next research round.
The package (827 findings, 539 page readings, 275 saved documents) stays outside the repository; its dispositions are
kept in `archive/research-2026-10-19/`.

- **Chosen (the owner's answers of 2026-10-19).** Adopt the research's three reading rules for print wordings (an
  enclosure that is "not mandatory" or lists open-frame printers is not needed; a sheet that accepts a stainless nozzle,
  or only cautions about wear, does not require a hardened one; drying advised once a spool is opened, or depending on
  moisture, is optional). Switch the polyolefins' chamber row to deciding if Braskem's statement brings it to ten makers.
  This round completes the new products only (their data sheets, recipes and prices); everything else the research left
  goes to the next research round. Push to main when verified.
- **How it is built.** Corrections to registered sheets by guarded migration; new documents through the import pipeline
  (batch b48), page readings through the reading tools with blind second reads, prices through the price pipeline (p06);
  then the build, the snapshot, the selector's views and the material pages, a material that newly meets the page rule
  given its summary. Opus for triage, judging, code, migrations and the documents; Sonnet for fetching, page reading,
  second reads and sweeps. The record is [the round](audits/2026-10-19-research-intake/README.md).
- **Built and measured (2026-10-19).** m452 to m456, batch b48 (57 documents, four products) and price batch p06, D168,
  the polyolefins chamber row deciding, and two build fixes (a flagged value no longer stands in for a material; a
  material's print gate names its product). Against main before it: drying statements missing on 145 products (205),
  chamber checks unanswered on 213 (221), fibre loads of their own on 174 of 255 fibre-filled products (141 of 252), 113
  materials priced (108), Nylon-GF given a material page; 84 material verdicts moved in the 138 census cases, from
  Nylon-GF's new products, HIPS's and PCTG's sourced resin densities, the polyolefins' chamber and stage 2's
  corrections ([decision diff](audits/2026-10-19-research-intake/after/DECISION-DIFF.md)). Citing producers' sheets for
  PCTG, HIPS, PA6/66 and PVB switched the density class limit CL02 (D154) on for them. The round's review found eight
  things to fix, all fixed: among them, a maker's "stainless steel or hardened alloys" or wear caution leaves the
  no-hardened-nozzle screen unresolved in the maker's words, never a pass. What it left is OPEN-PROBLEMS
  §39 and the dated paragraphs it added; the findings' fates are `archive/research-2026-10-19/disposition.csv`.

## Decided on 2026-10-19, the clean-up round (priorities 5 to 7)

The owner asked for the fixable list's priorities 5 (data clean-up), 6 (interface fixes the reviews left) and 7 (tooling)
to be done efficiently and pushed to main. Built on one branch in four parallel tracks: the data clean-up by migration
(m459, m460), the material pages and the selector by two Claude Opus agents, and the import tools by a third, merged and
checked together with one review. Left on purpose, each still in OPEN-PROBLEMS with its reason: the large re-read
backlogs (unconfirmed records, test-bar print parameters, outliers, digit suspects, held readings), and what needs a
design or an owner's ruling (a foamed filament's density, a fibre-basis column, a state for a sentence copied from
another product's page, the selector's layout calls). The record is [the round](audits/2026-10-19-clean-up/README.md).
