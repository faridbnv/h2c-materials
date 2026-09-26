# What this tool is for

The owner set this on 2026-09-25, after a step back from V2 ([the review and plan](audits/2026-09-25-re-center/REPORT.md)).
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
| 4. Understand | The trade-off chart shows materials as bubbles spanning their products. Up to six can be compared, and the rest show why they fell out. |
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

| # | Component | 2026-09-25 |
|---|---|:-:|
| C1 | Translate requirements (limits engineers use, a goal to rank by) | 2 |
| C2 | Classification (family → polymer → material → product, a home for everything) | 2 |
| C3 | Evidence store, decision tier (values with their conditions) | 3 |
| C4 | Comparability (how comparable each value is, the user chooses how strict) | 2 |
| C5 | Material summary (range and typical value across products) | 1 |
| C6 | Screening (pass / fail / unknown, explained, nearest miss) | 3 |
| C7 | Rank and trade-offs (goal ordering, bubbles, Pareto, compare) | 2 |
| C8 | Drill down to products (which pass, by maker; search by maker or product) | 2 |
| C9 | Printability and treatment (each product's own recipe against the H2C) | 2 |
| C10 | Makers' know-how (in the panel, gaps visible) | 1 |
| C11 | The record (everything published, searchable, never deciding) | 1 |
| C12 | Estimates (a marked hint where nothing is published) | 3, over-built |
| C13 | Data operations (a product in minutes, verify in about a minute) | 2 |
| C14 | Team layer (shared scenarios, approved list, own tests); later | 1 |
| C15 | Engineering hygiene (checks guard decisions, docs short and current) | 2 |

## Decided on 2026-09-25

Each becomes an entry in [DECISIONS.md](DECISIONS.md) in the change that builds it, not before, so DECISIONS never
describes a tool that does not exist yet. D83 and D84 are entered (the build and the engine carry them; the page reads
them from phase 3; phase 4 retired the representative grade and its hand picks, m137). D85 is entered with the record
tier's first lane: `source_facts` and the full-text index `documents_fts` in `dist/h2c.sqlite`. Makers' know-how in the
panel is built with lane 3 (m140; D85, its last part). Phase 5's decisions are D86 (m141) and D87 (m142, m143).

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
  for the record, print recipes and makers' know-how. The owner lifted it for one set on 2026-09-25 (below).

## Decided on 2026-09-25, for phase 5

Asked with the facts and a recommendation each; the owner's answers:

1. **A maker's product line is a product, and TPU is read by hardness.** The eleven PLA, PLA Silk and PETG rows that
   were one product each (Bambu's PLA Basic, Matte, Basic Gradient, Tough+, Translucent, Silk+, Silk Dual Color, PETG
   Basic, HF, Translucent, and eSUN's PLA-Lite) become products of the material they are, their names kept as aliases.
   TPU is split by the Shore hardness its makers rate it, for every maker: 87A or softer, 88 to 92A, 93 to 97A,
   harder than 95A, and hardness not stated; Bambu's four TPU rows are aliases of their class. Built in m141 (D86).
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
   material, purefil's TPV is TPE, polymer not stated, QIDI S-White is Support for ABS, and PI stays TPI (R193).
4. **eSUN's densities keep counting.** m128's reading stands: a density is not measured on the bar eSUN's sentence
   describes, and most makers' density is the resin's.

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
