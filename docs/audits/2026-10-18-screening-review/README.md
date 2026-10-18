# Screening review: what happens to materials that could not be checked, 2026-10-18

> **Historical record** (2026-10-18): a review of release 9ca94d31fc5d. It describes the tool as it was then; for where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** The owner asked how the selector treats the materials it could not check: the "Include" choice, the
> switch "Let estimates rule out materials", and the five places a material can land (Supported, Estimated candidates to
> verify, Insufficient evidence, Screened, Fail). Three engineer reviewers went through the six templates, a first-time
> engineer used only the page, and a census and a reading of the code counted every answer. The rules underneath are
> sound (a material passes when one of its products passes, and fails only when every product fails), but the way the
> unchecked materials are sorted and named misleads an engineer. The switch called "rule out" almost
> never rules anything out (30 of its 33 exclusions are elastomers whose heat deflection does not apply), and its real
> effect, which its name never mentions, is to promote materials on the middle value of an estimate, so PLA is offered
> for a 100 °C outdoor bracket and PC and PETG for a gasket. "Insufficient evidence" lumps four situations together: of
> its 436 listings, 234 are materials whose measured products or estimates already miss the limit, 76 meet every number
> and wait only on a print setting the sheet does not state, 15 have no product to buy, and 111 are genuinely open. A few
> data and estimate faults also put named materials in the wrong group. The changes below start with wording that moves
> no answer, then data corrections, then a regrouping by what the evidence says, and the owner decides the group names,
> the switch's name, and each earlier decision a later change would amend, all named in the tables.

## How this review was done

The question belongs to GOALS step 2 (Screen: each material is answered all, some or none of its products pass, or
unknown) and step 4 (Understand: the rest show why they fell out), and to scorecard lines C6 (screening), C12
(estimates), C9 (printability) and C1 (templates) ([GOALS](../../GOALS.md)). Everything was run on release
9ca94d31fc5d, from its built `dist/db.json` and `dist/h2c.sqlite`, with nothing rebuilt or changed.

1. **A census.** [census.mjs](census.mjs) ran the six landing-page templates as the page runs them (Include, estimates
   on, values with stated conditions only, as printed, dry) and put every material in the group the page shows it in.
   With `--full` it also wrote every product's answer, requirement by requirement, which the reviewers queried.
2. **The logic, reconstructed.** [LOGIC.md](LOGIC.md) traces a material from the switch to its row, file by file and
   line by line, and counts which kinds of inference can hold a material out today.
3. **Three engineer reviewers, by property.** Heat (Outdoor structural part, Warm environment), stiffness (Lightweight
   structure, High-stiffness fixture), and stretch and printability (Flexible component, Indoor prototype). Each judged
   every material they found questionable plus two Insufficient-evidence materials per template drawn at random (seed
   20261018), traced the products' decisions, read the cached sheets, and named root causes (F-H, F-M and F-F).
4. **A first-time engineer** who never read the repository used only the page (headless Chrome, 1400 × 1000), ran each
   template three ways, and scored every label.
5. **This combination**, by Claude Opus 5.5 (agent) as product manager: the reports read against GOALS and the
   decisions, their figures reconciled, five figures re-derived from the census output and the engine (each marked
   "re-derived" below, and reproducible from the last section), and the findings, verdicts and changes written. The
   reviewers in steps 1 to 4 were Claude agents.

| File | What it holds |
|---|---|
| [README.md](README.md) | This review: the verdict, the findings F01 to F29, the verdicts V01 to V23 and the changes C01 to C30 |
| [LOGIC.md](LOGIC.md) | How the page sorts a material, with file and line; which inferences are live; twelve observations |
| [CENSUS.md](CENSUS.md) | Every material's group, product counts and reasons in each template (generated) |
| [census.mjs](census.mjs) | The script that writes CENSUS.md, the scenario files and, with `--full`, every product's answer |
| [scenarios/](scenarios/) | The six templates as scenario files the page could save, for `npm run trace -- --scenario` |
| [presets/hdt-presets.md](presets/hdt-presets.md) | Outdoor structural part and Warm environment: root causes F-H1 to F-H6 |
| [presets/modulus-presets.md](presets/modulus-presets.md) | Lightweight structure and High-stiffness fixture: F-M1 to F-M7 |
| [presets/flexible-and-indoor.md](presets/flexible-and-indoor.md) | Flexible component and Indoor prototype: F-F1 to F-F7 |
| [FIRST-TIME-USER.md](FIRST-TIME-USER.md) | The first-time engineer's trial, the labels scored, the top confusions |
| [first-time-user/](first-time-user/) | The six screenshots that trial cites |

A few terms used throughout. A value is **comparable** when it states the test direction and load the requirement
needs, on a printed or unstated bar (D84, the decision that such values decide and others are counted apart). A
**product prediction** is the estimate model's value for one product that publishes no comparable value (D81, D137). A
**material estimate** is the model's value for a material none of whose products publishes one (D43). Each has a
**centre** (the 50 % value), a **likely range** (80 %, the one the page shows) and a **plausible range** (95 %). A
**print gate** is a product's nozzle, bed or chamber temperature against the H2C's 350, 120 and 65 °C (D101).
**Screened** means held out by inference while the verdict stays UNKNOWN.

## The verdict, from the top

### The rules underneath are right, but the sorting on top uses the wrong axis

For an engineer choosing a filament, the evidence model is the right one and should stay. Each product is PASS, FAIL or
UNKNOWN on its own data, and a mode never changes what the evidence says (D26: Leave out and Include decide only what
is listed). A material passes when one product passes and fails only when every product fails (D83, D100). That is the
Ashby screen GOALS asks for: a family is the range of what its products can be. Across the six templates it leaves 512
of the 912 material answers UNKNOWN (CENSUS status bars), so the team's real work is in the unknowns, and sorting them
well is the whole value of Include.

The three-way split under Include (supported, estimated, insufficient, plus screened) is the right kind of thing: an
engineer needs the unknowns ordered by what to do next. It sorts on the wrong axis, though. It asks first whether a
model's middle value meets the limit, which is the weakest evidence the tool holds, instead of what the evidence says and
what it would take to settle the question. So it promotes coin flips and buries the best leads. Of the 43 "Estimated
candidates" (a listing is one material in one template's answer), about 9 survive the tests C18 and C19 propose
(re-derived). Meanwhile 88 listings whose products meet every number on their own data, and wait only on a print
setting, sit collapsed beside 249 that the evidence says miss.

### "Could not be checked" is six different things

Every UNKNOWN listing in the six templates, sorted by what its evidence actually says (re-derived from the census.
The split of today's Estimated group applies C18's order and C19's likely-range test):

| Kind | What it means | Where it lands today | Listings | What an engineer does with it |
|---|---|---|---:|---|
| Does not apply | The property is not defined for the material (the heat deflection of an elastomer, D56) | SCREENED, labelled "by an estimate" | 30 | Nothing: it is not a rigid part at temperature |
| Nothing to buy | PA66-CF, PA612, PA612-GF: no product, only a family guess | Insufficient (15), SCREENED (3) | 18 | Nothing |
| Printing not confirmed | One product meets every required number on its own data; only a print gate is open, mostly a chamber the sheet never mentions | Insufficient (76), or in Estimated behind an estimated sibling (12) | 88 | The best leads: ask the maker or print a test part |
| Evidence points to a miss | On a required number every measured product misses (181), or every unresolved product's own estimate misses wholly (109), 56 both | Insufficient (234), Estimated (15) | 249 | Set aside unless a silent product is known to be special |
| Estimate suggests a pass | An open number's likely range meets the limit and no measured sibling contradicts it | Estimated | 9 | Verify with a coupon |
| Genuinely open | None of the above | Insufficient (111), Estimated (7) | 118 | Gather data |

Product by product, the reasons are as varied. Of the 3,033 open required numbers on unresolved products (re-derived),
2,024 carry a product prediction (three in four of the promoted ones rest on the product's own value that lacks a test
direction or comes from a moulded bar, [modulus-presets.md](presets/modulus-presets.md) F-M2), 395 have nothing and no
estimate (mostly heat deflection), 230 are published only after annealing, 162 are published without direction, load or
orientation, 219 do not apply and 3 straddle the limit. "No data", "data that is not comparable", "measured siblings
all fail", "only the printer gate is open" and "the estimate says no" are each common, and the page names none of them.

### What the words promise, and what they do

| Words on the page | What a reader takes them to mean | What they do | First-time user (1–5) | PM (1–5) | Change |
|---|---|---|:-:|:-:|---|
| "Materials that could not be checked: Leave out \| Include" (since D146, the selector refinement) | Show or hide the unknowns | Does that, but a template click resets it to Leave out and the switch beside it looks on while disabled | 3 | 4 | C08 |
| "Let estimates rule out materials" | Estimates drop clear mismatches | Promotes 43 entries on a centre; holds out 30 not-applicable and 3 product-less materials; no product estimate can rule anything out | 2 | 1 | C02, C20 |
| "Supported candidates" | Published data meets everything | Right, product by product ("2 of 17 products"), but collides with support materials | 3 | 3 | C06 |
| "Estimated candidates to verify" with "Predicted centres meet the missing numerical requirements" | The model predicts a pass | One product's 50 % value meets; half are coin flips; the row may show a median that fails | 2 | 2 | C05, C18, C19 |
| "Insufficient evidence (n) — included in counts and exports" | No data to judge | Four situations, more than half of them evidence that misses | 2 | 1 | C18 |
| "SCREENED", "Screened by an estimate" | Removed by an estimate | 30 of the 33 are a property that does not apply | 2 | 1 | C04, C20 |
| "Excluded / screened" | The screened materials | Also every plain FAIL (Indoor: 26) | 2 | 2 | C06 |
| "Shown for its closest product" | The product nearest to passing | The first product of the best group in the material's own order; nothing is measured | – | 1 | C05 |
| "0 of 195 products" and "N products fail at least one requirement; M remain unresolved" | What the unknown rests on | True counts, but never which requirement or which product decides; the reason is on hover only | 3 | 3 | C05, C18 |
| "Why the rest were excluded" | What each requirement costs | The clearest view on the page (the first-time user's words), but its "excluded by an estimate" counts include materials that fail elsewhere | – | 3 | C07 |

### Promotion on a coin flip, exclusion on a certificate nobody holds

A product reaches "Estimated candidates" when the centre of its estimate meets the limit: no certificate, and each of
several open requirements taken as met on its own. A product estimate may hold a material out only when its plausible
range wholly misses and its evidence class holds a certificate: a 10 % wrong-exclusion budget at 90 % confidence split
over five properties, which needs 194 independent calibration groups per class (D137, the 2026-10-08 fix). No class has
them, so no product estimate can exclude anything, and the switch named "rule out" in practice only promotes.

Caution should be asymmetric, and the owner was right to make exclusion hard: a wrong exclusion hides a good material
for good, a wrong promotion costs a check. But the promotion bar is now so low that it is the main source of wrong
answers (53 of the 105 promoted requirements are coin flips, [modulus-presets.md](presets/modulus-presets.md) F-M1),
and the exclusion bar is out of reach for years. The fix is neither to loosen exclusion nor to wait for it. Give
promotion a floor that a measured sibling can contradict, and let a demotion within the visible list (which excludes
nothing, and so needs no certificate) do what exclusion cannot.

### One product names the material

A material's group and its reasons are one product's: the first that passes, else the first estimated, else the first
unresolved (D100's roll-up, `constraints.js:692`). Its value columns are every product's spread. So PLA is promoted for a
100 °C outdoor bracket by colorFabb PLA-HP alone while its row shows a 55 °C median and "96 products fail at least one
requirement; 99 remain unresolved". In 20 of the 43 estimated entries the row's median fails the requirement the heading
says is met, and in 24 one product carries the material ([modulus-presets.md](presets/modulus-presets.md) F-M4). And an
estimated product outranks a sibling whose own measured values pass and which waits only on a chamber line (PEBA,
[flexible-and-indoor.md](presets/flexible-and-indoor.md) F-F3). D100's verdict is right. Its listing needs to name the
deciding product and sort by fact.

### What "Let estimates rule out materials" does today

Under Include only (under Leave out it does nothing, though it shows checked):

1. It creates the "Estimated candidates to verify" section (43 entries), and shows estimate cells, cards and three
   export columns. Neither its name nor its help mentions this.
2. It holds out materials for which a required property does not apply: 30 screens (Outdoor 14, Warm 16), all
   elastomers and OBC on heat deflection.
3. It holds out a material with no product on its family estimate: 3 (PA612 at 5 GPa, PA66-CF and PA612-GF at 100 %).
4. It holds out on the base resin's published chemical data where an environment requirement is asked: none in the
   templates, while "Resists organic solvents" alone screens 18 materials (LOGIC §3).
5. It never holds out on a product prediction (none of 2,042 is certified), and it never reads the 117 certified
   material estimates of materials that have products, though five places on the page say it can.

### Can a reader tell why a material is where it is?

Only for a pass. The first-time engineer found the reasons "spread across a hover title, a drawer about one closest
product and the Products tab", and would "turn Include and the estimates off before sharing a result with the team".
The row never says which product decides, which requirement it is open on, or whether the measured products all miss.

### How it is executed: the faults that put named materials in the wrong group

| Template | Material | Group now | What the evidence supports | Cause |
|---|---|---|---|---|
| Outdoor | PLA | Estimated | Insufficient: PLA-HP's 135 °C is a moulded figure | F24 |
| Warm | PLA-CF, PLA-NF | Supported | Unknown: their passing HDTs sit 25–34 °C above their own sheets' Tg | F24 |
| Warm | PBAT | Supported | Unknown: a 6 MPa filament has no meaningful HDT | F16 |
| Warm | PAHT, PA6-CE | Insufficient | Supported: a printed HDT at 1.8 MPa already meets 80 °C | F15 |
| Lightweight | ABS | Estimated | Unlikely: a resin sheet's flexural modulus read as tensile | F25 |
| Lightweight | CPE-CF, PA6-GF | Estimated | Open: their own values miss, pooling lifts the centre | F21 |
| Lightweight | PLA Silk, Marble, Sparkle, Galaxy, Glow | Estimated | Unlikely: every measured product misses 2.5 GPa | F11, F22 |
| Lightweight | PETG-CF | Estimated | Decided on densities fibre can give | F26 |
| High-stiffness | PLA-CF | Estimated | Unlikely: six printed values, 1.1 to 4.95 GPa | F22, F25 |
| High-stiffness | PET-CF | Estimated | Supported: BASF's 6.18 GPa at standard lab climate | F17 |
| High-stiffness | TPU classes, PP, PEBA, OBC and others (44 in all) | Insufficient | Unlikely: every open product's estimate lies wholly below 5 GPa | F11 |
| Flexible | PETG, PC, PCTG, CPE, PETG-PTFE | Estimated | Unlikely: printed bars break at 4 to 90 % | F20, F25 |
| Flexible | PEBA, TPC, TPU harder than 95A | Estimated, on an estimate | Meets every number on measured products; printing not confirmed | F12 |
| Flexible | PA6/66 | Supported | Fails any test of flexibility: 1,980 MPa | F28 |
| Indoor | PLA-PHA, TPU-LW | Insufficient | Printing not confirmed for types printed open | F13 |
| All six | LCP, PPS-ESD | FAIL, hidden | Unknown: the H2C's 120 °C bed is the bottom of their window | F14 |
| All six | PA66-CF, PA612, PA612-GF | Listed or screened | Not candidates: nothing to buy | F18 |

## Findings

Severity: **wrong answer** (a material in a group its evidence does not support), **misleading** (the group may be
right by the rules, but a reader is led to a wrong conclusion), **cosmetic**. "First-time user" says whether the engineer
who never read the repository hit it from the page alone, which is the strongest evidence a finding has.

### Labels and presentation

**F01. The switch named "rule out" mostly promotes, and rules out almost nothing.** Under Include it creates the
"Estimated candidates to verify" section, which disappears when it is off, and it holds out 33 materials: 30 for which
a property does not apply and the 3 with no product. No product prediction can hold anything out (D137). Its name and
help speak only of ruling out ("an estimate excludes a material only when its whole plausible range misses the
requirement"), so a reader sees TPU harder than 95A stay listed at about 0.01 to 0.41 GPa against 5 GPa and loses
trust. *Misleading.* Reach: 5 of 6 templates, 33 screens, 43 promotions ([LOGIC.md](LOGIC.md) §3–4,
[hdt-presets.md](presets/hdt-presets.md) F-H3). First-time user: yes, confusions 1 and 2,
[screenshot 3](first-time-user/3-stiffness-tpu-not-ruled-out.png).

**F02. The page still promises screens by material estimates that stopped.** Material estimates are certified to screen
end by end by a back-test (D48, D59), but since D137 each product reads its own prediction, so the 117 of 132 certified
estimates that belong to materials with products are never read. The help text, the drawer's estimate card ("It can
exclude this material from …"), its group note, the table legend, the export's "can screen" and the Screens column of
`build/snapshot/screening.csv` still say they can. In 55 (material, template) pairs a material stays listed whose own
estimate wholly misses with no veto (ASA-EC and ASA-AF at 5 GPa, screened in the
[2026-10-07 audit](../2026-10-07-uncertain-logic/README.md)). D137 and OPEN-PROBLEMS §35 say new exclusions are
disabled, not that these stopped. D138 (the 2026-10-15 decision that froze the estimate stage) still credits it with 32
screens, and two code comments describe the old contract. *Misleading.* Reach: 117 estimates, 55 pairs
([LOGIC.md](LOGIC.md) §5, observations 1 and 11). First-time user: in part (the help popup set the expectation of
confusion 1).

**F03. A property that does not apply is reported as "Screened by an estimate".** 30 of the 33 screens are a headline
that does not apply by definition (D56, the elastomer rule). The SCREENED mark, Why excluded, the heading sentence and
the export file them under estimates, and the mark repeats the requirement once per product (ten times for TPC). With
estimates off, the same headline reads "Not published in the sampled sources; ask the maker or test a printed coupon".
*Misleading.* Reach: 30 screens ([LOGIC.md](LOGIC.md) observation 5). First-time user: yes, confusion 3,
[screenshot 2](first-time-user/2-outdoor-tpc-screened-drawer.png).

**F04. "Insufficient evidence" holds four different situations.** Of its 436 listings across the six templates
(re-derived): 234 where the evidence already points below the limit, 76 with a product that meets every number and waits
only on a print gate, 15 with no product, and 111 genuinely open. They read alike under one collapsed heading, and the
word points an engineer to missing properties when the gap is printability (PPS-CF at 251 °C in Warm, and all 39 in
Indoor). *Misleading.* Reach: 436 listings ([flexible-and-indoor.md](presets/flexible-and-indoor.md) F-F4,
[hdt-presets.md](presets/hdt-presets.md) F-H4, [modulus-presets.md](presets/modulus-presets.md) F-M5). First-time user:
yes ("lumps clear mismatches, well-documented materials stuck on a chamber window and true gaps").

**F05. The row does not name the product that decides its group, and its numbers contradict the heading.** Group and
reasons are one product's, value columns every product's. 24 of the 43 estimated entries rest on one product. In 20 the
row's median fails the requirement the heading says is met, in 13 every comparable value fails it. The row line counts
products and never names the one. The drawer calls it "its closest product", which nothing measures. The estimate cell
shows the material estimate while the reason quotes the product prediction (ASA-EC: 1.93 to 4.3 GPa against 1.83 to
4.52), against D147's rule of one computation per fact. *Misleading.* Reach: 43 entries
([modulus-presets.md](presets/modulus-presets.md) F-M4, [LOGIC.md](LOGIC.md) observations 4 and 8). First-time user: yes,
PLA in Outdoor ([screenshot 1](first-time-user/1-outdoor-pla-estimated-candidate.png)), PETG in Flexible.

**F06. Group, heading and chip words mislead or collide.** "Supported" collides with support materials and the "Build
material (not a support)" chip. "Predicted centres meet the missing numerical requirements" reads as "likely meets".
"Excluded / screened" holds plain FAILs. A screened row is labelled "Insufficient evidence" beside its SCREENED chip.
"1 products fail". "Included in counts and exports" sits under a headline count that reads otherwise. "Screened" also
means GOALS step 2 on the chart. The export and several documents still say "Include uncertain". A reason runs two
clauses together and repeats "no qualifying measurement". *Cosmetic, misleading together.* Reach: page-wide
([LOGIC.md](LOGIC.md) observations 6, 9, 10, 12). First-time user: yes, most of the label table.

**F07. Counts that do not reconcile.** Why excluded counts "excluded by an estimate" per requirement over every
material, including materials that fail another requirement and requirements that are only reported. Re-derived with the
engine: Outdoor's HDT "22" is the 14 screened materials plus 8 that already fail (three supports, three sintering
filaments, TPC-ESD, TPU-GF). The modulus "4" in Outdoor and Lightweight is the four support materials, though Lightweight
screens nothing. High-stiffness's reported-only HDT says 22. The UNKNOWN chip counts screened materials while the header
says "shown PASS + UNKNOWN". A latent per-product mismatch sits beside it ([LOGIC.md](LOGIC.md) observation 7).
*Misleading.* First-time user: yes, confusion 7, [screenshot 6](first-time-user/6-why-excluded-tab.png).

**F08. The mode and the switch hide their state.** The switch is stored on, so under Leave out it shows checked but
greyed, and pressing Include turns estimates on at once. A template click returns Include to Leave out without a word
(`app/js/main.js:438`). Under Leave out the UNKNOWN chip lists the unknowns while the subtitle says they are left out.
*Cosmetic.* First-time user: yes, confusions 5 and 6, [screenshot 5](first-time-user/5-leave-out-yet-listed.png).

**F09. An annealed-only reason invites an action that cannot help.** "Published only after annealing at 55 °C for 8 h
(60 °C) … Allow annealing under Part condition to use it" is printed even where the annealed value itself misses the
limit (PLA Silk+ against 100 °C). 141 product results carry an annealed value below a minimum (Outdoor 56, Lightweight
21, Warm 23, High-stiffness 41). *Misleading.* ([hdt-presets.md](presets/hdt-presets.md) F-H5, CENSUS Outdoor.)

### Engine rules

**F10. Promotion reads only the estimate's centre.** Of the 105 estimated requirements behind the 43 entries, 53 centres
lie within half the plausible width of the limit, 47 plausible and 37 likely ranges contain it. FormFutura Silk Gloss
PLA is a candidate at exactly 2.50 GPa against 2.5. Extrudr DURAPRO PA6 GF needs two coin flips at once. Re-derived: 30
of the 43 entries have a product whose likely range meets every open limit, 28 have no required number on which every
measured product misses, and 19 pass both. *Misleading, a wrong answer where a data fault adds to it.*
([modulus-presets.md](presets/modulus-presets.md) F-M1, [LOGIC.md](LOGIC.md) observation 3.) First-time user: yes, PLA
Silk and Glow promoted at 2.5 GPa.

**F11. A material whose every measured product misses stays among the unknowns, unmarked.** D100 rightly keeps it
UNKNOWN while one product is unmeasured, but neither the row nor the group says the measured ones all miss. In 181 of the
436 Insufficient listings a required number has at least one measured product and none that passes: Outdoor 43 of 81,
Lightweight 23 of 64, Warm 19 of 68 (ten PLA variants top out at 51 to 62 °C against 80), High-stiffness 47 of 94,
Flexible 49 of 90 (the stiffness report counts 45 of 94 for High-stiffness by another query, a gap that changes no
conclusion). A second measure, 109 listings where every unresolved product's own estimate misses wholly, overlaps it in
56: 181 is what was measured, 109 what the model predicts, and the two together are the 234 of F04. *Misleading.* Reach:
234 of 436 ([hdt-presets.md](presets/hdt-presets.md) F-H4, [modulus-presets.md](presets/modulus-presets.md) F-M5,
[flexible-and-indoor.md](presets/flexible-and-indoor.md) F-F4). First-time user: yes, confusion 4 ("I cannot scan a list
that large").

**F12. An estimated product represents its material before a measured one held only by a print gate.** PEBA's row says
"No qualifying measurement. Estimated 492 to 1,090 %" for one product while six siblings pass on printed values up to
1,110 % and wait only on a chamber line. 12 material-template pairs: PEBA, TPC and TPU harder than 95A in Flexible,
PA12-CF and PPA-CF in three templates each, PLA Wood, ASA-CF and PPS-CF. *Misleading.*
([flexible-and-indoor.md](presets/flexible-and-indoor.md) F-F3.)

**F13. A chamber the sheet does not mention holds a product.** A silent gate is unknown. Bambu Lab's guide fills it for
the 17 of 152 materials mapped to a guide row (D88, D90), a product with a Variant reads none (D129), and a gate is
never estimated. 314 products have an unknown chamber or no profile (OPEN-PROBLEMS §30.3). In the templates, 102 products
in 50 materials are unresolved by a print gate alone, and 88 material-template pairs would pass if those gates read
within (Indoor 36 of 39): 62 products silent, 16 partial, 15 "recommended" with no temperature, 7 with no profile, 2 a
"-". The owner kept "recommended, no temperature" unknown on 2026-10-05. Silence for a type printed open (130 of the 314
are PLA, elastomer, PETG or copolyester products) is undecided. *A wrong answer where the sheet itself says it prints
open (PLA-PHA), misleading elsewhere.* ([flexible-and-indoor.md](presets/flexible-and-indoor.md) F-F2.) First-time user:
yes ("Insufficient evidence here means print settings incomplete", and PPS-CF).

**F14. Nozzle and bed windows are read by their top end.** Only the chamber has a partial state (D32). LCP's bed 120 to
150 °C reads "Requires up to 150 °C" and fails, though the H2C's 120 °C is the window's own bottom. PPS-ESD (120 to
160 °C) and Spectrum PC 275 (90 to 130 °C) fail the same way. 34 products in 19 materials. LCP and PPS-ESD are FAIL in
all six templates. *Wrong answer (2 materials).* ([flexible-and-indoor.md](presets/flexible-and-indoor.md) F-F7.)

**F15. One-way physical bounds never decide.** On the same bar, HDT at 0.45 MPa is at least the HDT at 1.8 MPa
(physical relation PR08), but such a value only vetoes estimate screens (D48: "a bound never passes"), and the product
reads "Not published in the sampled sources" (LUVOCOM PAHT, 80 °C). 51 products in 28 materials hold one at 80 °C or more
with no comparable 0.45 MPa value. In Warm 24 have nothing else open, and 3 materials would be Supported (PA6-CE, PAHT,
and ASA-AF, whose copy is disputed). *Misleading, one reason untrue.* ([hdt-presets.md](presets/hdt-presets.md) F-H5.)

**F16. Whether heat deflection applies follows the polymer, not the product, and only with estimates on.** D56 rests on
a product property (a bar under about 225 MPa has no meaningful HDT), but the rule reads the polymer's class. PBAT is
semicrystalline by its polymer row, so Flashforge's 6 MPa "Flexible" passes Warm environment on 90 °C. nGen FLEX (150
MPa), Crystal Flex and purefil PVC-P 94A sit in Insufficient, not screened. The not-applicable screen also runs only with
estimates on. *Wrong answer (PBAT), misleading (3).* ([hdt-presets.md](presets/hdt-presets.md) F-H2,
[LOGIC.md](LOGIC.md) observation 5.) First-time user: yes, confusion 8.

**F17. A standard test climate counts as a conditioned state for a polymer water barely changes.** BASF Ultrafuse PET
CF15's 6,178 MPa on printed XY bars "conditioned in standard climate (23 °C, 50 % RH 72 h)" is no qualifying value in a
dry question, because the state rule is per headline (D99, the as-printed and dry default) while the model treats PET
as taking up no water. PET-CF is Estimated, not Supported, at 5 GPa. 6 products. *Misleading.*
([modulus-presets.md](presets/modulus-presets.md) F-M7.)

**F18. The weakest estimates screen, and the stronger cannot.** PA66-CF, PA612 and PA612-GF have no product. They are
judged on their own family-only estimate, which may screen (D48, D59), while no product prediction may (D137). They read
"No print profile recorded" on every gate. They are the only three numeric screens in the templates and appear 15 more
times in Insufficient. *Misleading.* Reach: 18 rows ([flexible-and-indoor.md](presets/flexible-and-indoor.md) F-F6).
First-time user: yes (PA612 the only screen, and rows that read just "UNKNOWN").

**F19. The screening guard test runs a path the page does not.** `test/screening.test.js`, which AGENTS.md names as the
guarantee that no material stays a candidate for a requirement its defended range wholly fails, builds its context
without products, so it tests the material-headline path. On the page's path the 55 pairs of F02 break the guarantee.
*Misleading, to maintainers.* ([LOGIC.md](LOGIC.md) observation 2.)

### Estimate model

**F20. An elongation whose specimen is not stated floors the printed part's prediction.** D126 (the owner's choice that
a bar whose specimen is not stated bounds as a printed one does) lets a resin sheet's break strain floor a product's XY
prediction. Each of PETG's 8 estimated products is floored by its own unstated value (120 to 280 %), while the 26 PETG
products with a printed XY value publish 4.1 to 90 %. PC (a resin sheet's 150 %), PCTG, CPE and PETG-PTFE go the same
way, and with the centre test a floor at the limit guarantees promotion. Database-wide 356 elongation predictions carry
such a floor, 275 sit on it, 67 lie above every printed value of their material. The model's own conversion puts a
moulded break strain at about 1.7 times the printed one. The mirror: TPS, SBC and TPV, which publish 150 to 650 %
unstated, get no estimate at all. *Wrong answer (5 rigid materials offered for a gasket).*
([flexible-and-indoor.md](presets/flexible-and-indoor.md) F-F1.) First-time user: yes,
[screenshot 4](first-time-user/4-flexible-pc-estimated-candidate.png).

**F21. A product's prediction pools its own value with its material, and crosses the limit.** A grade's prediction
weights its own observations about 0.7 and its material the rest, and the engine reads that as the product's expected
value. In Lightweight, 9 products whose own value misses 2.5 GPa get a centre that meets it. Two decide their material:
Fillamentum CPE CF112 (2.2 to 2.53 GPa, pulled by a 20 % carbon sibling) and Extrudr DURAPRO PA6 GF (a moulded 2.4 to a
printed 2.76). 12 of 54 products with a moulded modulus are predicted stiffer printed than moulded. *Wrong answer (2).*
([modulus-presets.md](presets/modulus-presets.md) F-M2.)

**F22. Values with no stated direction enter at par, so stiffness predictions run high.** Such a modulus converts at
offset 0 while a moulded one takes −0.15. Across the 62 materials whose products publish both, the as-published median
sits about 21 % above the comparable one, which is D84's own premise. Silent products' sibling-based predictions sit above
their material's comparable median in 49 of 65 (median ratio 1.16). 313 of 691 product modulus predictions rest on the
product's own value with no stated direction or from a moulded bar, and so do 75 of the 105 promoted requirements.
*Wrong answer (PLA-CF at 5 GPa, the PLA variants at 2.5 GPa).* ([modulus-presets.md](presets/modulus-presets.md) F-M3.)
First-time user: yes ("I expect silk and glow PLAs to be less stiff than plain PLA").

**F23. Heat deflection has no product predictions, and annealed-only products get none.** HDT's grade calibration hits
its clamp, so no product has an HDT prediction: a heat question can never have an estimated candidate. A product whose
only comparable modulus is annealed gets no as-printed prediction (46 products in 29 materials per modulus template),
against D137's "every catalogued product". *Misleading.* ([hdt-presets.md](presets/hdt-presets.md) F-H3,
[modulus-presets.md](presets/modulus-presets.md) F-M5.)

### Build rules and data

**F24. Moulded, annealed or Tg-inconsistent heat deflections are read as the printed part's.** colorFabb PLA-HP's 135 °C
(V005853) is recorded as printed from a "3D Printed" heading, though its row footnote points to annealing and the
product's earlier sheet says the figure is injection-moulded. It alone makes PLA an Estimated candidate for a 100 °C
bracket. Six PLA-family products pass Warm on an HDT 25 to 34 °C above their own sheet's Tg (CarbonX CF-PLA 91 against
60, Nanovia PLA Flax 80–90 against 55–60 beside "Max temperature 55 °C"), which makes PLA-CF and PLA-NF Supported.
Over 97 PLA sheets with both values, HDT at 0.45 MPa sits 2 °C below Tg on average. No physical relation ties HDT to
Tg for a polymer that prints amorphous, and plausibility window W0056 states the opposite basis. *Wrong answer (3
groups).* ([hdt-presets.md](presets/hdt-presets.md) F-H1.) First-time user: yes, PLA in Outdoor.

**F25. Resin-sheet values are read as printed values.** purefil's ABS resin sheet prints "Tensile modulus (ASTM D790)
2700 MPa", a flexural standard, read as an unstated tensile value: it alone promotes ABS at 2.5 GPa over 13 measured
products at 1.6 to 2.38. Yousu's PC (150 %), Fillamentum CPE HG100, Spectrum's PCTG and PETG Lite (a strength by ASTM
D 882, a film test) feed F20's floors, and iSANMATE's PLA-CF resin sheet (25 GPa on ISO 3167 bars) is predicted as a
15.1 GPa printed part. *Wrong answer.* ([modulus-presets.md](presets/modulus-presets.md) ABS and PLA-CF rows,
[flexible-and-indoor.md](presets/flexible-and-indoor.md) F-F1.)

**F26. Fibre-filled densities below their matrix, and a later sheet unregistered.** 11 carbon- or glass-filled products
publish a density below their neat polymer's minimum, which fibre can only raise. The density query of OPEN-PROBLEMS §17
covers unfilled grades only. FormFutura CarbonFil (1.19 from a 2021 sheet, while a cached 2024 revision prints 1.32 and
is not registered) and Recreus PET-G CF (1.1) keep PETG-CF in the lightweight list. *Wrong answer (1 group).*
([modulus-presets.md](presets/modulus-presets.md) F-M6.)

**F27. One number typed at two loads across two documents.** Fiberlogy PP's 51 °C is "@ 1.8 MPa" on its sheet and
"@ 0.45 MPa" on its product page. colorFabb PA Blue Metal Detectable's "(A)" is read as method A beside an "amorphous"
60. The load lint compares within one source only. 6 grades, one product verdict. Latent: with F15's bound adopted,
G164-02 would pass wrongly. *Cosmetic now.* ([hdt-presets.md](presets/hdt-presets.md) F-H6.)

### Templates

**F28. Flexible component tests stretch, not flexibility.** Its one requirement is elongation at break of at least 100 %.
7 of the 18 materials listed above the collapsed group have a tensile modulus of 1.5 GPa or more (PA6/66 is Supported on
a printed 100 % beside its own 1,980 MPa), while the elastomers sit at 0.005 to 0.09 GPa. The template's "not checked"
line says so, but the list does not. *Misleading.* ([flexible-and-indoor.md](presets/flexible-and-indoor.md) F-F5.)
First-time user: yes ("a rigid nylon in a gasket list surprised me").

**F29. The heat templates rest largely on HDTs whose specimen is not stated.** In Warm, 66 of the 118 passing products
pass on such a value, and 13 of the 39 Supported materials rest on such values alone (PETG on one row at exactly 80 °C).
794 of 1,323 HDT rows state no specimen. Admitting them is the owner's policy (D84), and the template does not say so.
*Misleading.* ([hdt-presets.md](presets/hdt-presets.md), Warm environment.)

## Verdicts

Each judgement a reviewer made, or this review makes, that the owner may want to agree or disagree with. Where
reviewers pointed different ways, the PM's stance is the decision the changes follow.

| ID | Judgement | Held by | PM's stance | Decisions it touches |
|---|---|---|---|---|
| V01 | Keep the evidence verdicts: PASS, FAIL or UNKNOWN per product, a material passing when one product passes and failing only when every product fails | All three engineer reviewers work within it; the first-time user questions its outcome | Keep. It is GOALS step 2 and D26's rule that a mode never changes a verdict. Reversing D100 would let one measured failure rule out products nobody measured (acceptance question S08, the metamorphic test). Fix the listing (V02), not the verdict | D26, D83, D100 kept |
| V02 | A material whose every measured product misses should not sit in "Insufficient evidence" | Heat reviewer (F-H4), stiffness reviewer (F-M5), first-time user | Agree about the listing: its own collapsed group, named by the fact, with the counts (C18). Verdict UNKNOWN, still eligible and exported. Grouping on a fact excludes nothing, so it needs no certificate | Amends D137's grouping; D100 unchanged |
| V03 | "Let estimates rule out materials" should be renamed or removed | First-time user (clarity 2), heat reviewer ("say so on the switch, or certify a class") | Rename and keep one switch (C02); take "does not apply" out of it (C20). Removing it would leave no way to read the list without estimates, which GOALS C12 calls a marked hint | D43, D137 |
| V04 | Promotion on the centre is too weak | Stiffness reviewer (F-M1), first-time user | Agree: the likely range must meet each open limit, and no measured sibling may contradict (C19). Still a hint, never a pass | Amends D137 |
| V05 | Exclusion by product estimates should be certified or relaxed to match material screening (F-M5); product-less materials should not screen on the weakest evidence (F-F6); the switch should be honest or a class certified (F-H3) | Stiffness, flexible and heat reviewers, three directions | Do not relax D137's budget and do not revive the material screens of D48 and D59 for materials with products. Make the three product-less materials family entries (C16), so no screen rests on the weakest evidence, and let the regrouping (C18) do what exclusion cannot. Recorded, not recommended now: single-test certificates per requirement (density, strength and this-grade modulus now pass 10 % at 90 % singly, LOGIC §3), which would reverse D137's up-front reservation | D48, D59, D137 kept |
| V06 | Exclusion must stay stricter than promotion | PM | Keep the asymmetry. What changes is that promotion gets a floor (V04) | D43 |
| V07 | Elongation at break of at least 100 % is not a flexibility test | Flexible reviewer (F-F5), first-time user | Agree; add a stiffness ceiling, the number the owner's (C30) | D29 (a template names what it cannot check) |
| V08 | Heat deflection should not apply to a product whose own modulus shows it is an elastomer | Heat reviewer (F-H2), first-time user | Agree in substance, done as data: flag the value and add the physics to the lint (C12), not a product branch in the engine (AGENTS.md: a case the model cannot express belongs in the data) | D56, D83 |
| V09 | TPU-CF's screen is arguable (one 2.2 GPa moulded bar) | Heat reviewer | Keep it screened: a moulded bar does not make a TPU rigid, and the value is already questioned (OPEN-PROBLEMS §37.3) | D56 |
| V10 | A chamber the sheet does not mention should not hold a product of a type printed open | Flexible reviewer (F-F2) | Use the guide where the type is the guide's (C17) and show the rest as "printing not confirmed" (C18). No new inference for types the guide does not cover, now. The owner's ruling of 2026-10-05 on "recommended, no temperature" stands. Revisit with the count C17 and C18 leave | D33 (an enclosure "recommended" does not clear the chamber), D88, D90, D129 kept |
| V11 | A window whose bottom the H2C reaches is not a failure | Flexible reviewer (F-F7) | Agree: unresolved (partial), not a pass, as the chamber already is (C21) | Amends D32 |
| V12 | A printed HDT at 1.8 MPa should pass a 0.45 MPa minimum | Heat reviewer (F-H5) | Agree, narrowly: one same-bar physical order, labelled, after the cross-document load check (C15, C22) | Amends D48 |
| V13 | An annealed value below a minimum shows the printed part misses it too | Heat reviewer (F-H5), stiffness reviewer (F-M5) | Not yet: fix the reason first (C09), back-test the physical claim before a rule (C24) | D99, D58 |
| V14 | A specimen not stated should not floor elongation | Flexible reviewer (F-F1) | Agree for elongation. The owner chose the floor in D126, so it is the owner's call, with a back-test (C26) | Amends D126 |
| V15 | A value with no stated direction needs a haircut in the model | Stiffness reviewer (F-M3) | Agree in direction; back-test (C27) | D84, D58, D138 |
| V16 | A product's own value should bound or anchor its prediction | Stiffness reviewer (F-M2) | Lower priority: C19 already stops a crossing from promoting a material; back-test (C28) | D81, D137 |
| V17 | A standard test climate is not a moisture state for PET | Stiffness reviewer (F-M7) | Agree, by the polymer's water uptake (C23) | Amends D99 |
| V18 | "Does not apply" is a definition, not an estimate | LOGIC observation 5, first-time user | Agree: hold out whether or not estimates are on, labelled "Does not apply" (C04, C20); still UNKNOWN, never FAIL | Amends D43's coupling |
| V19 | Values whose specimen is not stated stay admitted for heat deflection | Heat reviewer (the owner's policy noted) | Keep D84; catch the outliers by physics (C11) and say it in the template (C10) | D84 |
| V20 | Keep an "estimated" group at all | PM | Keep it, smaller (about 9 entries): it is where a hint points to a product worth a test print. If stage 4 leaves it near empty, the owner may fold it into "Not enough data" | D137 |
| V21 | Groups change presentation only | PM | Eligibility, the status bar's counts and every exported row stay; the count line names each group's size | D26, D137 |
| V22 | "I would turn Include and the estimates off before sharing" | First-time user | That is this review's measure: after stage 3, repeat the first-time-user trial; Include should be shareable | GOALS C6 |
| V23 | A template should keep the reader's mode | First-time user | Agree: a template sets requirements, not the evidence policy (C08) | D29 |

## Recommended changes

In execution order. Every data change is a migration that names the value it replaces, each value re-read from its
source first (D35, [AGENTS.md](../../../AGENTS.md)). Every rule change is a DECISIONS entry with `npm run build:diff`,
`npm run snapshot` and the decision diff reported (GOALS working rule 3). The estimate stage is frozen (D138), so a
stage-4 change also needs a decision and a back-test row (D58). Answer moves are rough, from the reports or re-derived.
"Groups only" means no verdict moves.

### Stage 1: words and records (no answer moves)

| ID | Change | Fixes | Depends on / unblocks | Effort | Moves answers | Owner's call |
|---|---|---|---|:-:|---|---|
| C01 | Record what this review leaves open in OPEN-PROBLEMS, under its subjects: in §35 that no estimate screens a material that has products (the D48/D59 screens stopped with D137), what the switch does today and the 436-listing breakdown; F13 and F14 under printability; F20 to F23 under the model; F24 to F27 under sources. Each entry leaves as its change lands | F02 and all | First / – | S | No | No |
| C02 | Rename "Let estimates rule out materials" to "Use estimates and resin data" and say what it does: shows estimates where nothing is published and sorts the materials that could not be checked by them, never passing one; holds a material out where a property does not apply to it, where its base resin's data reports it attacked or dissolved by the chemical asked, or where a material with no product has an estimate that wholly misses; in this release no product estimate holds anything out. C16, C18, C19 and C20 each rewrite this text in their own commit | F01 | – / C20 | S | No | Yes: the name (V03) |
| C03 | Stop promising material-estimate screens: the drawer's estimate card and group note, the table legend, the export's "can screen", the Screens column of `build/snapshot/screening.csv` (say it is read only for a material with no product), the comments at `build/src/estimate/index.js:9-10` and `app/js/engine/constraints.js:138-144`, and a dated note on D138's "32 of 673" | F02 | C01 / C25 | S | No | No |
| C04 | Say "Does not apply" for a property that does not apply, apart from estimates, once per material: in the SCREENED mark, Why excluded, the heading sentence and the export; with estimates off, the reason says the same, not "Not published … ask the maker" | F03 | – / C20 | S | No (texts only) | No |
| C05 | Name the product that decides the row ("Estimated candidate on 1 of 195 products: colorFabb PLA-HP, density estimated 1,190 to 1,300 kg/m³"); replace "Shown for its closest product" with "Shown for one product, X" and why it was chosen; the estimate cell and the reason from one computation (D147) | F05 | – / C18 | M | No | No |
| C06 | Words: "Supported candidates" becomes "Meet every requirement"; the estimated heading in plain words ("A model estimate suggests a product meets the numbers it does not publish. Not a pass: confirm before choosing."); "Excluded / screened" split into "Fail" and "Held out by inference"; a screened row's line says so; plurals; the counts sentence; "screened" kept for the held-out meaning; the export's group names and the documents' "Include uncertain"; the reason's run-on clause | F06 | – / C18 | S | No | No |
| C07 | Why excluded counts a screen (or "does not apply") only for materials that requirement alone holds out, never one that fails another requirement nor a reported requirement, and takes the material's own screen, not its first product's; the status bar says "UNKNOWN n (m screened, hidden)" | F07 | – | S | No (panel figures only) | No |
| C08 | Under Leave out the switch shows unchecked and disabled, its stored value kept; a template keeps the reader's mode; under Leave out with the UNKNOWN chip on, the subtitle says the unknowns are shown | F08 | – | S | No | Yes: keep the mode (recommended) or announce the reset (V23) |
| C09 | Where an annealed-only value also misses the limit, the reason says so ("… (60 °C), which also misses 100 °C") and offers no "Allow annealing" | F09 | – / C24 | S | No | No |
| C10 | Template notes: Outdoor and Warm say that an HDT whose specimen the sheet does not state is admitted; Flexible says it tests stretch, not softness, until C30 | F28, F29 | – / C30 replaces Flexible's line | S | No (the release ID moves) | No |

### Stage 2: data corrections

| ID | Change | Fixes | Depends on / unblocks | Effort | Moves answers | Owner's call |
|---|---|---|---|:-:|---|---|
| C11 | Re-read colorFabb PLA-HP V005853 and type it as its sheet says (moulded, or annealed with its schedule); re-read V010211, V003309, V003212, V007474, V007533 and V010287 and flag as physically implausible each the sheet does not support as an as-printed bar; add to `physical_relations.csv` an order "HDT at 0.45 MPa at most Tg plus a margin, as printed, for a polymer that prints amorphous", with the margin the 97 PLA pairs set, read by the physics lint; correct W0056's stated basis | F24 | – | M | Yes: 3 groups (PLA leaves Estimated in Outdoor; PLA-CF and PLA-NF leave Supported in Warm), more if the lint finds others | No (a person settles each lint finding) |
| C12 | Flag Flashforge "Flexible" PBAT's HDT (V005369) as physically implausible beside its 6 to 7 MPa modulus (AGENTS.md's recipe for a value physics rules out); add the relation "an HDT needs a bar of about 225 MPa or stiffer", D56's own reason, to the lint, and settle what it finds (nGen FLEX, Crystal Flex, purefil PVC-P 94A) | F16 (data) | – | S | Yes: PBAT leaves Supported in Warm and in any heat question at 90 °C or less | No |
| C13 | Re-read the resin and film sheets read as printed bars: purefil ABS V005563 (ASTM D790, so flexural), Yousu PC V013304, Fillamentum CPE HG100, Spectrum PCTG, PETG Lite V002708, iSANMATE PLA-CF V009912; type each as its sheet shows it | F25, narrows F20 and F22 | – / C26, C27 | M | Yes, once each page is read: likely ABS in Lightweight, PC, CPE, PCTG and PETG in Flexible, PLA-CF in High-stiffness leave Estimated | No |
| C14 | Register CarbonFil's 2024 revision (document 7b525961687e2d89) as a new source and record its values; re-read Recreus PET-G CF's 1.1 g/cm³; extend §17's density query to filled grades as a lint | F26 | – | S | Yes: PETG-CF in Lightweight | No |
| C15 | Extend PR08's load check from one source to one grade, and re-read the six grades it names (G001-77, G020-25, G031-13, G082-10, G129-01, G164-02) | F27 | – / C22 | S | One product verdict, no group | No |
| C16 | Make PA66-CF, PA612 and PA612-GF family entries, as AGENTS.md does for a material left with no product (m141 is the example); their resin references stay as study grades | F18 | – / C02's text | S | Yes: 18 rows leave the lists (3 screened, 15 Insufficient) | Yes: GOALS C2 counts them as materials with nothing to buy |
| C17 | For each of the 50 materials held by a print gate alone, check whether it is the type a `print_guide.csv` column heads and, where it is, map it in `print_guide_materials.csv` with a Reason naming the neighbours it is not; a Variant still reads none (D129) | F13 (part) | – / C18 | M | Yes: part of the 88 pairs F13 counts move to PASS | No (V10 records what is not done) |

### Stage 3: engine rules

| ID | Change | Fixes | Depends on / unblocks | Effort | Moves answers | Owner's call |
|---|---|---|---|:-:|---|---|
| C18 | Sort the materials that could not be checked by what the evidence says. Under Include, after "Meet every requirement": (1) "Meets every number; printing on the H2C not confirmed", where a product meets every required number on its own data and only a print gate is open; (2) "Estimated to meet: verify" (C19's test); (3) "Not enough data"; (4) "Unlikely to meet", collapsed, where on a required number at least one product is measured and none passes, or every unresolved product's own estimate wholly misses, its row saying which ("every measured product misses HDT ≥ 100 °C: 45 of 73; 28 publish nothing"). A material takes its best product's group in that order, so a measured product held by a gate represents it before an estimate. "Insufficient evidence" goes. Verdicts, eligibility, counts and every exported row stay; the export's Candidate group takes the new names | F04, F11, F12, F13 (listing) | C05, C06 / C25, C30 | L | Groups only (re-derived, of 479 listed unknowns): about 88 to (1), 9 to (2) with C19, 118 to (3), 249 to (4); the other 15 have no product and leave with C16 | Yes: the names, and whether (4) is collapsed and counted in the count line (V02, V21); amends D137's grouping |
| C19 | A product is an estimated candidate only when, for every open required number, the likely (80 %) range meets the limit, and its material has no required number on which every measured product misses. Still never a pass | F10, and the promotions F20 to F22 cause | – / C18 | S | Groups only: the 43 estimated entries become 19 alone, about 9 with C18 (re-derived) | Yes: amends D137 (V04) |
| C20 | A property that does not apply holds a material out under Include whether or not estimates are on, labelled "Does not apply", still UNKNOWN and never FAIL; C02's text drops the clause | F03, F16 (switch), F01 | C04 / C25 | S | Yes: with estimates off, 30 pairs (Outdoor 14, Warm 16) move from listed to held out | Yes: amends D43's coupling (V18) |
| C21 | A nozzle or bed window whose lower end the H2C reaches reads as partial (unresolved), like the chamber, and says "Needs 120–150 °C; the H2C reaches 120 °C, the bottom of that window" | F14 | – | S | Yes: LCP and PPS-ESD from FAIL to UNKNOWN in six templates (12 pairs); products in 19 materials | Yes: amends D32 (V11) |
| C22 | A printed HDT at 1.8 MPa at or above the limit passes an "HDT at 0.45 MPa at least" requirement on the same product, labelled "passes on its HDT at 1.8 MPa, a harsher load" | F15 | C15 | S | Yes: in Warm 24 products, up to 3 materials to Supported (PA6-CE, PAHT, ASA-AF once its copy is settled) | Yes: amends D48 for PR08 only (V12) |
| C23 | A polymer whose water uptake is "Not applicable" in `polymers.csv` has one moisture state: its standard-climate value decides as dry | F17 | – | S | Yes: PET-CF to Supported in High-stiffness; 6 products | Yes: amends D99 (V17) |
| C24 | Back-test whether an annealed value bounds the as-printed one from above, over the products that publish both (`build/snapshot/states.csv`); only if it holds, let an annealed HDT or modulus below a minimum fail the as-printed product, labelled | F09, F15 (annealed part) | C09 / – | M | If adopted: 6 listings (PC FR in three templates, M106, M065, M074), 141 product results | Yes: a new physical rule (V13, D58) |
| C25 | The guard test runs the page's path, products and predictions included, and asserts the contract that holds after C18 to C20 (no material sits in groups (1) or (2) for a requirement its own defended range wholly misses); AGENTS.md's sentence naming it changes in the same commit | F19 | C03, C18, C19, C20 | S | No | No |

### Stage 4: the estimate model (frozen: a decision and a back-test row each)

| ID | Change | Fixes | Depends on / unblocks | Effort | Moves answers | Owner's call |
|---|---|---|---|:-:|---|---|
| C26 | An elongation whose specimen is not stated no longer floors a product's XY prediction, or floors it through the moulded conversion; strength floors stay as D126 decided unless the back-test says otherwise | F20 | C13 / – | M | Yes: Flexible's floored rigid materials (PETG, PC, PCTG, CPE, PETG-PTFE) fall, little after C19 | Yes: amends the owner's own D126 choice (V14) |
| C27 | Learn the no-stated-direction modulus offset across products, not within products that repeat one number | F22 | C13 / C28 | M | Yes: 313 of 691 modulus predictions fall; the stiffness templates' estimated groups shrink | Yes (V15) |
| C28 | Back-test whether a prediction may cross a limit the product's own published value (no direction, moulded) misses; if not, let that value anchor it | F21 | C27 / – | M | A few: CPE-CF and PA6-GF in Lightweight | Yes (V16) |
| C29 | Predict annealed-only products in the as-printed state, and lift HDT's grade clamp if the back-test allows | F23 | C24 / – | L | Yes: heat templates can gain estimated candidates; 46 products per stiffness template gain a prediction | Yes |

### Stage 5: templates

| ID | Change | Fixes | Depends on / unblocks | Effort | Moves answers | Owner's call |
|---|---|---|---|:-:|---|---|
| C30 | Flexible component asks a tensile modulus (XY) ceiling beside elongation of at least 100 %. Any value from 0.1 to 1 GPa separates every listed material; 0.3 GPa is recommended. Its "not checked" line becomes "recovery and sealing", replacing C10's | F28 | C18, C19 / – | S | Yes, many in Flexible: PA6/66 and PP leave Supported, the rigid estimated candidates fail on their measured modulus; read `build:diff` before adopting | Yes: the number (V07) |

## Coherence check

The thirty changes do not contradict each other or GOALS. None lets an estimate pass a material (D43), and none excludes
on an uncertified prediction (D137). C18 and C19 move groups, never verdicts, eligibility or counts (D26, D100, V21).
Where two changes touch one text, the later one owns it: C02's help is rewritten by C16, C18, C19 and C20 in their own
commits, C18 renames the groups C06 words, and C30 replaces C10's Flexible line. C22 waits for C15's load check, C25
for the contract C18 to C20 set, and stage 4 for the owner's decisions and their back-tests. Data corrections come before
rule changes, so each rule's decision diff is read on corrected data. The changes improve GOALS steps 2 and 4 and lines
C6, C9, C12 and C1, and the lints they add are cheap enough for the 90-second budget of `verify:fast`. Deliberately
unchanged: D100's verdict (a material fails only when every product fails), D137's certification budget (no new
exclusion), D84's admission of values with unstated conditions, the owner's 2026-10-05 ruling on a chamber "recommended"
with no temperature, the behaviour of Leave out, the four-state vocabulary, and the estimate model until stage 4.

## What this review did not do

- It changed no data, code, test or build. Every figure is from release 9ca94d31fc5d as built, and from the census.
- It ran the six templates only, as the landing page sets them. No environment requirement was asked, so resin-data
  screens were not exercised beyond LOGIC's single solvent check, and annealed or conditioned states were not swept.
- The engineer reviewers sampled: every material they judged questionable, plus two random Insufficient-evidence
  materials per template (twelve in all). Sheets were read from the cached text, not re-fetched. Each data claim above
  needs its re-read on the page before a migration (D35).
- The first-time engineer was one agent session in headless Chrome, not a person and not the team. GOALS C7's team trial
  still waits.
- The PM's re-derived figures (the 436 breakdown, the 3,033 open numbers, the promotion tests, the regrouping, Why
  excluded's composition) read the census output and the engine. The regrouping simulates C18 over that output.
- No back-test was run. Stage 4's effects are directions, not measurements. The GOALS scorecard was not re-scored.
- Two points the first-time engineer raised are left alone: an outdoor nylon judged dry, and UV not checked (the
  template says so).

## Reproduce

`F` is the file `node docs/audits/2026-10-18-screening-review/census.mjs --full $F` writes, run from the repository
root on a build of release 9ca94d31fc5d. The reviewers' own one-liners are in their reports.

```bash
# The 436 Insufficient listings by kind (F04): no product, printing only, measured or estimated miss, open
node -e 'const d=require(process.argv[1]),G=/^(Nozzle|Bed|Chamber) temp/,O=/^(priceCADkg|hdt045 >= 90)/,N=/^(hdt045|tensileModulusXY|density|elongationXY) /,open=x=>x.results.filter(r=>!O.test(r.criterion)&&r.status!=="PASS"),miss=(r)=>{const[,op,v]=r.criterion.split(" "),q=r.prediction?.plausible;return q&&(op[0]===">"?q.hi<+v:q.lo>+v)};for(const[p,ms]of Object.entries(d)){const k={noProduct:0,printingOnly:0,measuredOrEstimatedMiss:0,open:0};for(const m of Object.values(ms)){if(m.group!=="insufficient")continue;const u=m.products.filter(x=>x.verdict==="UNKNOWN");const fq=[...new Set(m.products.flatMap(x=>x.results.filter(r=>r.status==="FAIL"&&N.test(r.criterion)&&!O.test(r.criterion)).map(r=>r.criterion)))];k[!m.products.length?"noProduct":u.some(x=>{const o=open(x);return o.length&&o.every(r=>G.test(r.criterion))})?"printingOnly":fq.some(q=>m.products.every(x=>x.results.some(r=>r.criterion===q)))||u.every(x=>x.results.some(r=>!O.test(r.criterion)&&!G.test(r.criterion)&&miss(r)))?"measuredOrEstimatedMiss":"open"]++}console.log(p,JSON.stringify(k))}' $F
# Why excluded's "excluded by an estimate" per requirement, beside the SCREENED chip (F07)
node --input-type=module -e 'import fs from "node:fs";import{pageContext}from"./scripts/trace.mjs";import{runSelection,explainExclusions}from"./app/js/engine/constraints.js";import{newScenario}from"./app/js/engine/scenario.js";import{TEMPLATES}from"./app/js/ui/templates.js";const db=JSON.parse(fs.readFileSync("dist/db.json","utf8")),mats=db.materials.filter(m=>!m.familyEntry);for(const t of TEMPLATES){const ctx=pageContext(db,{...newScenario(db.meta),constraints:t.constraints,unknownPolicy:"exploration",useEstimates:true});console.log(t.name,"SCREENED",runSelection(mats,t.constraints,ctx).counts.screened,explainExclusions(mats,t.constraints,ctx).filter(x=>x.screened).map(x=>`${x.constraint.property}${x.constraint.mandatory===false?" (reported)":""} ${x.screened}`).join(", "))}'
```

F10's promotion tests and C18's regrouping apply the same rules to the `estimated` and `insufficient` entries of `$F`,
reading the likely range from each estimated reason ("Estimated a to b").
