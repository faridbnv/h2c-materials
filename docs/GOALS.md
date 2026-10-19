# What Filament Atlas is for

> **In short.** This page is the owner's. It says what the tool is for (a workbench that turns a part's requirements into a defensible shortlist of filaments the H2C can print, then of products), the seven-step method it follows, a scorecard rating each part of the tool, and the working rules every change is held to. Every decision the owner has made, dated, newest last, is in [GOALS-LOG.md](GOALS-LOG.md). A change of direction is written here first and logged there. Where things stand today is in the [README](../README.md); what is wrong or missing, in [OPEN-PROBLEMS.md](OPEN-PROBLEMS.md).

The owner set this on 2026-09-25, after a step back from V2 ([the review and plan](audits/2026-09-25-re-center/REPORT.md)),
and extended it on 2026-09-28 for version 2.1 ([GOALS-LOG.md](GOALS-LOG.md)).
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
| 2. Screen | Each **material** is the range of its products, and is answered **all / some / none of its products pass**, or unknown. A product must meet every requirement at once, including whether our H2C can print it: nozzle, bed, chamber, enclosure, hardened nozzle, and any treatment it needs. Since 2026-10-18 ([GOALS-LOG](GOALS-LOG.md); D151 to D155), a value measured another way decides in its one safe direction, a plastic's physics may settle what nobody measured, a near miss is on the line, and an unknown is sorted by what would settle it: one check away, not enough data, or unlikely to meet, naming the product that decides it. |
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

Each line is scored 1 to 5, where 5 means as good as it needs to be, and is meant to be re-scored at the end of every
phase. The scores were last set on 2026-09-28; later rounds have changed a line's text, not its score.

| # | Component | 2026-09-25 | 2026-09-27 | 2026-09-28 | What moved it, and what holds it back |
|---|---|:-:|:-:|:-:|---|
| C1 | Translate requirements (limits engineers use, a goal to rank by) | 2 | 4 | 4 | Twelve limits and Rank by; since 2.1 the question also says the state the part is used in: as printed or annealed (with the oven's limit), dry or humid (D99). No template uses the six newest limits (Shore A and Shore D hardness joined them in D150) |
| C2 | Classification (family → polymer → material → product, a home for everything) | 2 | 4 | 4 | Product lines are products, TPU by hardness; a product is named for what its maker's documents say it is, searched beyond its sheet (D106), and a home per family holds only what no maker discloses (18 products; 11 before b43 admitted seven). Held sheets still need exact identities, and 3 materials have no product to buy (1 with only a resin reference). b38 admitted the held Recreus PET-G sheet under its exact identity; other held documents enter through the import pipeline, open since 2026-10-05 |
| C3 | Evidence store, decision tier (values with their conditions) | 3 | 3 | 3 | A deciding value must be a number its evidence line prints, in one role (D97), and decides only in the state it was measured in (D99); no person has measured the error rate. The pre-gap-closure sample drew 32 of 310 deciding values (SPOT-CHECK-DECISIVE.md); the gap-closing response lists the additional agent re-reads awaiting a person. Measured on 2026-10-01 by fresh random re-reads after the error-class sweep: 1 of 70 deciding measurements wrong (the audit found 6.3 %), and every guard that keeps a root cause out at zero unreviewed findings ([sweep](audits/2026-10-01-error-classes/README.md)). The reader round's records, measured blind on 2026-10-05: 2 of 40 wrong and 2 partly in each of two draws, every family a draw named swept ([blind draws](audits/2026-10-04-reader-round/blind-draw/)). Gap round 2's records: its first draw found 6 of 40 wrong (4 deciding), every family swept (m365, D129); its second none of 40 ([blind draws](audits/2026-10-05-gap-round-2/blind-draw/)). Check round 3 (2026-10-05, D131) read a sealed sample of 100 deciding records drawn before anything was read: of the 98 readable, 15 had a wrong cell and 2 a wrong deciding one, both families fixed (m381, m382; [round](audits/2026-10-05-check-round-3/README.md)). The quality round's draw found all 40 of its records right, and the completeness round's 38 of 40 and then 19 of 20, each error in a cell that decides nothing (D136; [closing check](audits/2026-10-07-completeness-round/blind-draw/RESULT.md)) |
| C4 | Comparability (how comparable each value is, the user chooses how strict) | 2 | 4 | 4 | Comparable and as published on every headline, and each value's state; a verdict names what it admitted unstated. A value takes what its page states once (specimen, moisture, treatment, standard, test temperature, D116), and a statement that heads one table reaches only that table (D128). A value measured another way (another load, state, bar or property) bounds a headline only through a deciding row of the evidence ledger, in its one safe direction, and a comparable value always wins (D153) |
| C5 | Material summary (range and typical value across products) | 1 | 4 | 4 | Every material is its products' spread, variants and twins placed by rule |
| C6 | Screening (pass / fail / unknown, explained, nearest miss) | 3 | 4 | 4 | Product/state-owned evidence decides (D98–D100); the current [campaign status](audits/2026-09-30-coverage-expansion/STATUS.md) and frozen replay show answer changes. The v2.1 audit's scenario-gap count describes that release; rerun its generator after data changes. Application judgments and narrative claims never create passes. A row says how many products pass and shows the passing products' range; an unknown says how many measure below and how many publish nothing (D117). A property that does not apply (an elastomer's HDT) now hides the material whatever the estimates switch says, named "Does not apply" (D148). A published value short of a limit by less than its test scatter (10 % stiffness and strength, 5 °C HDT, 20 % elongation, 2 % density) is on the line, unresolved, and one just over it passes with a thin margin (D152). A product with no value measured the way asked passes or fails on what its other records and its kind's sourced physics limits bound it to, naming the record; records with no value between them are "sheets disagree", unresolved (D153, D154). Under Include an unknown is sorted by what would settle it, one check away, not enough data (likely first) or unlikely to meet, and names the product that decides it (D155) |
| C7 | Rank and trade-offs (goal ordering, material ranges, Pareto, compare) | 2 | 3 | 3 | One ranking across the table, the chart and the export (D102); since 2026-09-29 the chart draws and counts exact product states (D107), its controls and views reworked after the owner used it (D108 to D112), not re-scored; untested with the team (TEAM-TRIAL.md) |
| C8 | Drill down to products (which pass, by maker; search by maker or product) | 2 | 4 | 4 | Passing products first, in the drawer's first view on a laptop; a product can be chosen, with its state, and its decision brief written (D103) |
| C9 | Printability and treatment (each product's own recipe against the H2C) | 2 | 4 | 4 | Every template asks nozzle, bed and chamber against the H2C, from own evidence, permitted twin, then labelled Bambu guide (D101). Current known/unknown counts are generated in [campaign status](audits/2026-09-30-coverage-expansion/STATUS.md) and [print.csv](../build/snapshot/print.csv); drying and bounded windows retain source limits, and annealing remains a repeatable state. Print settings are checked against what the import's own reader reads on every profile's sheet (D119); the last fresh draw after that sweep found 3 of 40 profiles wrong (target under 3 %, OPEN-PROBLEMS §28). On 2026-10-02 the profiles were fixed by cause rather than re-read (D120, [sweep](audits/2026-10-02-profile-root-causes/README.md)): every line where an error could hide was marked and read, each cause was taught to the import's reader that checks every profile, and four fresh draws found 4, 4, 2 and 2 deciding errors in 40, each family then swept; the next draw (v12, 2026-10-02) found 1 in 40 (2.5 %, a second blind reader none), under the target, and its family was swept (m299). The reader round (2026-10-04, D125) read every page of the 1,377 documents tied to a gap from its image, and searched makers' sites (b41, b42): products with no nozzle fell from 83 to 28 and with no bed from 103 to 25 ([progress](audits/2026-10-04-reader-round/after/PROGRESS.md)); the guard also checks a product's own sheet no profile holds (CONTEXT-PROFILE-UNRECORDED). Gap round 2 (2026-10-05, D127–D129) records drying as a sheet states it (required, optional, not needed), lets the guide answer a silent product's drying, labelled, and answers only for its type; at its close (2026-10-05), of the products in scope 20 had no nozzle, 20 no bed and 179 no drying (16, 15 and 140 of its frozen targets; the rest are new products, [progress](audits/2026-10-05-gap-round-2/after/PROGRESS.md)); its first blind draw found 6 of 40 wrong (a dry box held as drying on 169 profiles among the families swept, m365), the second none of 40. Since the screening build's stage 3a (2026-10-18, D151) a maker's window whose bottom the H2C covers by 5 °C or more passes, at its low end, one it reaches only at its edge is on the line, and a chamber no sheet, twin or guide speaks to is read from the makers of its kind of plastic where at least ten state one and at most one in ten asks above 65 °C (PLA, PETG, the elastomers and ABS: 94 products; 220 stay unanswered, OPEN-PROBLEMS §30.3) |
| C10 | Makers' know-how (in the panel, gaps visible) | 1 | 4 | 4 | Current statement/product counts are in [counts.md](../build/snapshot/counts.md), with silent recipes/products in the generated [worklist](audits/2026-09-25-re-center/KNOW-HOW-WORKLIST.md). Literal claims now show their recorded scope/conditions separately; no suitability verdict follows |
| C11 | The record (everything published, searchable, never deciding) | 1 | 4 | 4 | Unmapped facts and cached page text in release-stamped dist/h2c.sqlite (D105). The local full-text index remains partial; the dated current custody/index receipt and limitations are in OPEN-PROBLEMS §19. Private originals/text are not shipped to CI or Pages. The reader round's 13,909 held readings, 5,313 of them naming a property no table column holds, are kept with their reasons in its packet (in the private store since 2026-10-15; the round's PACKETS.md names it) |
| C12 | Estimates (a marked hint where nothing is published) | 3, over-built | 3 | 3 | Material values estimated only where no product publishes; D137 makes missing product predictions available independently of siblings (the count is "Material values estimated" in `build/snapshot/counts.md`); the special cases went with the representative grade. Since D126 an estimate never sits under what its own product's yield, break or strength proves, a material's range contains every product's floor, and calibration holds unchanged ([back-test](audits/2026-10-04-reader-round/estimate-order/backtest.md)) Stage 4 of the screening build reopened the model, a decision and a back-test each: PLA classed as it prints (D158), an unstated direction learned across products (D159), elongation floored by printed bars (D161), heat deflection estimated per product with a spread per matrix, and annealed values a kind of their own (D162) ([back-tests](audits/2026-10-18-screening-build/stage-4-backtests.md)) |
| C13 | Data operations (a product in minutes, verify in about a minute) | 2 | 3 | 4 | Campaign warm checks: 27.48 s and 51.57 s previously; the resumed material tranche passed in 50.6 s, within 90 s, with complete browser QA; [receipts](audits/2026-09-30-coverage-expansion/STATUS.md). The historical 106.7 s cold overrun is gone: 29.6 s warm and 68.2 s with the build cache off, measured 2026-10-02 (OPEN-PROBLEMS §19). Campaign docs are generated and checked in verify (in verify:fast until 2026-10-15). 38.4 s warm after the reader round (2026-10-04). After the completeness round (2026-10-07, D136): 78 s after a data change (the build cache emptied; it was up to 92 s) and 45 s warm, since a test's build of the tables as they are reuses the entry npm run build stores and tests that read no estimate build the core database only. The full `npm run verify` took 467 s on the same day, 64.5 s of it verify:fast's steps. Since 2026-10-17 (D144) verify runs side by side the steps that do not depend on each other and CI runs the 300 rendered scenarios in three parallel jobs: on a 4-core Linux container from an empty build cache, verify took 746 s where the runner before took 1,069 s, verify:fast 203 s where it took 214 s, and a third of the scenarios 82 to 87 s where all 300 took 254 s. On the owner's 10-core machine on 2026-10-17, with the material pages' checks in (D142) and from an empty build cache, verify took 432 s side by side where the same checks one at a time took 627 s; verify:fast's steps ended at 88.4 s beside the others (86.9 s one at a time, within the 90 s budget either way) |
| C14 | Team layer (shared scenarios, approved list, own tests); later | 1 | 1 | 2 | A chosen product keeps its state, release, note and the team's own test results with the scenario, and its brief is written (D103); no shared list, account or server, as decided |
| C15 | Engineering hygiene (checks guard decisions, docs short and current) | 2 | 3 | 4 | An independent acceptance portfolio (twelve questions, 39 expectations, `test/acceptance/portfolio.json`) and seven metamorphic relations guard the decisions; a release is its content (D96); `verify` fails without Chrome; `npm run doctor` and three routes start a reader. The audit record is still long; since 2026-10-15 a round's working files are in the private store, its folder listing them in PACKETS.md (D138). Since 2026-10-01 `audit:context` checks each value, page statement and print setting against its cached sheet in `verify`, and a Parse review names the columns it explains (D115) |
| C16 | Price (a CAD/kg for each material, each product's own where it has one) | – | – | – | Added with the price pass of 2026-09-30, not yet scored; price was 33 materials and 38 products until then. Now 108 of 135 materials and 221 of 1,105 products priced (2026-10-07, after the quality round's p05; 101 and 214 at the price pass), 37 materials from a converted foreign listing (D113); 27 unpriced with why (OPEN-PROBLEMS §22); listings read on three days (2026-09-10, 09-30 and 10-07), with no refresh routine |

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
8. **The owner sets direction; agents build.** A change of direction updates this page first, and is logged, dated, in
   [GOALS-LOG.md](GOALS-LOG.md).
9. **Say only what is true.** Counts are generated. A review says who, or what, made it.

## The owner's decisions

Every decision the owner has made about the tool's direction, from the re-center of 2026-09-25 on, is in
[GOALS-LOG.md](GOALS-LOG.md), dated, newest last: what was asked, what was recommended, what the owner chose, and which
DECISIONS entry or round record built it. They were the second half of this page until 2026-10-15.
