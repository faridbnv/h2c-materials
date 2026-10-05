# H2C material selector: where V2 stands, and the plan to re-center it

> **Historical record** (2026-09-25): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

Written 2026-09-25 for the owner. Sources:
- the code and the data, queried from `dist/h2c.sqlite`, `dist/db.json` and `data/tables/`;
- the 276 commits from 2026-09-11 to 2026-09-21;
- the audits in `docs/audits/`;
- four independent read-throughs: product and interface, data model and build, the import and its history, and a
  technical design for the change, which I checked against the engine and the data.

A glossary of the terms is at the end.

---

## 0. The short version, in plain words

**What happened.** In eleven days the project turned a 102-material spreadsheet into a working selection page
(days 1–7), then spent four days (163 commits) importing about 1,300 manufacturer data sheets. The database grew
from 179 products to 1,119, and from 2,645 measured values to 11,096.

**The strict verdict.** The foundations are good: every number traces to its source, missing data is never
treated as zero, and the build is repeatable and heavily tested. But almost all the recent effort went into
**getting more numbers in and making them pass more checks**. Almost none went into **turning the data into better
engineering decisions**. Three things show it:

1. **The selector cannot see most of the data.** It judges each material by one hand-picked product (the
   "representative grade"), so only 20 % of the 11,096 values ever reach a verdict. Across the six ready-made
   scenarios, the whole import changed **one** verdict among the original materials.
2. **Most new values could not be compared anyway.** They lack the facts that make two numbers comparable:
   whether the test bar was printed or moulded, which way it was printed, and whether it was dry. Half of all
   values do not state the specimen, 92 % do not state moisture, and a second reader disagreed with the recorded
   conditions on 26 % of sampled rows.
3. **The practical knowledge on the same pages was skipped.** The reader skipped 39,468 distinct lines on 1,499
   documents and recorded none of them. They include makers' statements about shrinkage, warping, precision and what a material is good for, and properties
   the database has no slot for. Qualitative statements were never proposed at all. Of the 1,098 products, only 140
   have a recorded chamber requirement and 181 a drying recipe.

**PLA shows the first two.**
- The page judges all 198 PLA products by one of them (3DXTECH ECOMAX PLA, 2.87 GPa), so PLA "fails" a
  3 GPa stiffness requirement.
- 27 PLA products publish a stiffness measured in the print direction. They span 0.95–2.95 GPa, with a typical value
  of 2.3, and none reaches 3 GPa.
- Another 46 publish a stiffness without saying how the bar was made or oriented, and 30 of those exceed 3 GPa.
  They are probably moulded bars, which read stiffer than printed parts.
- (Figures as the phase 1 build computes them, variants such as metal-filled PLA left out; the first draft of this
  report, from a looser query, said 0.95–3.4 GPa and 49.)
- The truthful answer is "almost no PLA printed part reaches 3 GPa, and here are the exceptions". Today the tool
  can give neither the answer nor the exceptions.

**Why it keeps getting harder.** A few early decisions made sense at 100 materials and do not at 1,100 products.
Each problem that surfaced was fixed locally, with a new rule, check, ruling or document, and nobody stepped back.
So the machinery grew faster than the product. Only 2 of the 163 V2 commits touched the interface, and `verify`
went from 25 seconds to about 24 minutes.

**What to do.**
1. Pause bulk importing of new documents.
2. Re-center the tool on the engineering selection method you described: family → material → screen (properties
   **and printability on the H2C**) → rank → then products, brands and price.
3. Show each material as the **range and typical value of its products**. Answer "**all / some / none** of its
   products pass", with each product checked against the properties and its own print requirements together. Let
   the user open a material to see which products those are, how to print and treat each one, and what makers say
   about it.
4. **Record everything, verify what decides.** Keep two tiers of data:
   - a light **record tier**, in the database only, holding everything a source publishes, so we know it exists;
   - a strict **decision tier** for the values that pass or fail a material.

   The first comes mostly from documents already fetched and cached.
5. Remove the machinery that only exists to hold the old shape together, and bring `verify` back to about a minute.
6. Then use the re-centered tool to show which gaps actually block decisions, and fill those first.

**Be realistic about the gain.** Under strict comparability, the new "some products pass" answer rescues about 14
material verdicts across the six scenarios. Most of the payoff is elsewhere:
- the tool shows what the data really says;
- requirements, including printability, are checked together on each real product;
- the team gets how-to-print and maker know-how in one place;
- every product added later counts automatically.

**Your answers that shaped this plan (2026-09-25):**

| Question | Answer |
|---|---|
| Audience | A small engineering team |
| Method | Ashby-style engineering selection, ending in economics, brands and products |
| Material view | Range plus typical value across its products |
| Core decisions | Mechanical and weight, heat and environment, and **printability on the H2C**: nozzle, bed, chamber, enclosure, hardened nozzle, and print treatment such as drying and annealing. Cost comes later in the funnel |
| Makers' know-how | Benefits, pitfalls, warping, precision, "good for": collected in the database and shown in the material panel; not used for selection. Where the data sheet is silent (it often lives on the maker's site instead), the gap is shown per material and queued for a later search |
| Everything else a source publishes | Recorded in the database so we know it exists; not shown in the selector |
| Evidence standard | Screening-grade: data sheets as published, final choice confirmed by the team's own prints |
| Delivery | One offline file now, designed so a shared version can come later |
| New document imports | Resume only after the re-center. Documents already fetched are mined for printability, know-how and the record tier |

---

## 1. The story so far

| When | What happened | Commits |
|---|---|---:|
| 09-10 | Starting point: a research workbook with 102 materials, 136 products, 1,807 values and 104 Canadian prices. The brief (`docs/background/architecture-brief.md`) says the data "is not intended to be expanded" | – |
| 09-11 → 09-13 | V1: build, engine, single-file page. First-time-user and product-owner audits, most findings fixed. Six data audits. Family estimates added | 26 |
| 09-14 → 09-15 | The workbook is replaced by CSV tables under a schema (D45). An architecture review finds "the skeleton is right; the burden is that every data discovery becomes a code branch" | 61 |
| 09-16 → 09-17 | Calibrated estimate model (D43, D48, D59). The data-gaps audit says **"target the gaps; volume won't close them"**, and 14 targeted sheets move the results. Model freeze | 26 |
| 09-18 | Direction change. Rulings R002 and R003: **"import everything the corpus publishes, transcribe everything each sheet says"** | – |
| 09-18 → 09-21 | V2 import: 33 batches, 31 batch migrations, 40 correction migrations, 164 rulings, 58 revisions of the sheet reader (`scripts/ingest/propose.mjs`, 3,273 lines). **2 interface commits** | 163 |

| | Before the import (09-18) | Now |
|---|---:|---:|
| Materials | 103 | 158 |
| Products (grades) | 179 | 1,119 |
| Measured values | 2,645 | 11,096 |
| Sources | 300 | 1,422 |
| Price listings | 104 | 104 (never grew) |
| Six scenarios, include-uncertain mode: PASS / UNKNOWN | 97 / 149 | 103 / 373 |
| Verdicts changed among the original materials | – | **1** |
| `verify:fast` / `verify` | ~25 s / – | ~4 min / ~24 min |

The import did add something real: a traceable library of 1,119 products, 840 with a print profile. The documents
are fetched, hashed and their text cached. The selector simply cannot use most of it yet, and the reader recorded
only the lines that fitted the existing number slots.

---

## 2. What the ideal tool looks like

**The goal in one sentence.** An engineering team's workbench for choosing FDM materials for the H2C. It turns a
part's requirements into a defensible shortlist of *materials* the H2C can print, then of specific *products*,
each with how to print and treat it and what its maker warns about. Every number can be traced, every gap is
visible, and the final pick is confirmed by the team's own print.

**The method, Ashby's adapted to printing:**

```
 1 Translate      what the part must do → limits (≥ 100 °C, ≥ 3 GPa) and a goal (lightest, stiffest per kg)
 2 Screen         each MATERIAL as the range of its products → ALL / SOME / NONE pass, or UNKNOWN
                  each product is checked on its properties AND on whether our H2C can print it
                  (nozzle, bed, chamber, enclosure, hardened nozzle, required treatment)
 3 Rank           the survivors by the goal (a performance index, e.g. stiffness per weight)
 4 Understand     the trade-off chart (materials as bubbles), compare 2–6, why the rest fell out
 5 Drill down     inside a material: which products pass, their makers, test conditions, sources,
                  the print recipe and treatment, and what makers say (benefits, pitfalls, good for)
 6 Practicalities what it costs, where to buy it
 7 Confirm        the team prints and tests; the result is recorded (later: it feeds back)

 Underneath all steps: the RECORD, everything each source publishes, kept even when nothing uses it yet
```

### Component by component: the ideal against today

Score: 5 means as good as it needs to be; 1 means missing or working against the goal.

| # | Component | "Ideal" for a small engineering team | Where V2 is | Score |
|---|---|---|---|:-:|
| C1 | **Translate requirements** | Templates plus the limits engineers use: stiffness, strength, impact, Z (layer) strength, heat, glass transition, environment. A goal to rank by | 6 templates and 6 numeric filters. No impact, Z-strength or glass-transition filter, although the data holds 1,031 impact and 432 glass-transition values. No goal to rank by | 2 |
| C2 | **Classification** | Family → base polymer → material (polymer + filler) → product. Consistent, with a clear home for odd products | A two-level filter exists. The tree is inconsistent: 16 Bambu product lines are their own "materials" (PLA Basic, PLA Matte, PETG HF…) beside a "PLA" holding 198 products. 140 of the 164 rulings ask "which bucket does this go in" | 2 |
| C3 | **Evidence store (decision tier)** | Every value with its product, source, page and test conditions | Strong provenance: hashes, page locators, 1,422 sources. Weak context: specimen unstated on 50 %, moisture on 92 %, conditions disputed on 26 % of sampled rows. The numbers themselves are about 98 % right | 3 |
| C4 | **Comparability** | Each value labelled by how comparable it is (printed / moulded / unstated; XY / Z / unstated), and the user decides how strict to be | Strict rules exist, but only for the six values of the one representative product. Elsewhere comparability is text in the side panel | 2 |
| C5 | **Material summary** | Range plus typical value across the material's products, variants kept apart, and a count of products with data | **One hand-picked product per material.** A range was refused on purpose (D8). 20 % of values used | 1 |
| C6 | **Screening** | PASS / FAIL / UNKNOWN, explained, with "remove one requirement" and "nearest miss" | The semantics and the "why excluded" view are good, but they run on the wrong unit. Of materials not ruled out, 78 % are UNKNOWN | 3 |
| C7 | **Rank and trade-offs** | Survivors sorted by the chosen goal; an Ashby chart with material bubbles; Pareto front; compare | The table sorts by name. Ranking exists only as a top-10 inside the Ashby card. Bubbles are drawn only for estimates | 2 |
| C8 | **Drill down to products** | Inside a material, which products pass, by maker, with their conditions. Search by maker or product | The side panel groups products by maker and has a search box. Global search finds no maker or product: "Polymaker" returns 0 | 2 |
| C9 | **Printability and treatment** (core) | Each product's own print recipe: nozzle, bed and chamber windows, enclosure, plate, hardened nozzle, drying before and annealing after, checked against our H2C (350 / 120 / 65 °C) and setup. A value that needs annealing says so | Profiles exist for 840 of 1,098 products: nozzle 762, bed 668, chamber stated 140, drying 181, enclosure 135. The screen and the panel use **unions across all a material's products** (PPS-CF shows nozzle 310–400 °C beside a "needs up to 340 °C" pass). Annealing is only context on a measurement; there is no treatment recipe | 2 |
| C10 | **Makers' know-how** (panel only) | Per product, the maker's own words on benefits, pitfalls, warping, shrinkage, precision, surface, moisture sensitivity, what it is good for, with a count per topic at material level ("7 of 12 makers warn about warping"). Where nothing was collected, the panel says why (sheet silent, site not searched yet) | 497 statements on 87 products, mostly chemical resistance. Warping appears in 17 print notes, precision in 27. The import proposed **no** qualitative statements (PLAN-REMAINING §5) | 1 |
| C11 | **The record** (database only) | Everything a source publishes kept, as printed, with its page: unmapped properties, notes, claims. Searchable, never deciding | 39,468 distinct lines the reader skipped exist only inside 75 MB of proposal files, with page and text; the cached text of every fetched document sits in `.cache/`, not searchable from the database | 1 |
| C12 | **Estimates for gaps** | A clearly marked hint where nothing is published, never the main story | Technically excellent (calibrated, back-tested), but over-built for what it does: it never changes a PASS. It also shows an "estimate" beside a product's own measured value, which is a bug | 3 (over-built) |
| C13 | **Data operations** | Adding or correcting a product takes minutes; checking takes about a minute; sources are refreshed on a routine | One sheet travels ledger → proposal → review → ruling → migration. `verify` takes 24 minutes. There are 125 migrations and no refresh routine for 1,422 sources that get revised | 2 |
| C14 | **Team layer** (later) | Shared scenarios, an approved-materials list, a decision record, the team's own test results | Links and scenario files only. Fine for now, as long as nothing blocks a shared version | 1 (expected) |
| C15 | **Engineering hygiene** | Checks guard decisions; tests assert rules; docs are short and current | Very thorough but out of proportion (section 3, cause 5). Several docs are stale, and the close-out report claims more than the ledger shows | 2 |

Left/right nozzle routing, AMS and pairing materials in one print stay as text until a real need appears; the H2C's
temperatures, enclosure and hardened nozzle are the printability that screens.

---

## 3. The strict assessment: five root causes

**1. The unit of selection stayed "one product per material" after the data became 1,100 products.**
- Headline values come from "Representative grade" in `materials.csv` plus hand-picked rows in `headlines.csv`,
  checked at `build/src/compile.js:300-312`.
- The refusal of any range across products (D8, restated 2026-09-21) was right for a workbook of about 100
  materials. Now it hides the spread, lets the choice of product decide the verdict, and makes new data invisible.
- The same flattening happens to printability: print windows are unions across every product of a material.
- The workarounds this shape required: grade estimates (D81), the 18-move representative-grade report waiting on
  you, `relatedEvidence`, and the "measured, not the headline" asterisks.

**2. Volume of numbers came before any decision needed it, and the practical knowledge was left behind.**
- The 2026-09-17 data-gaps audit said to target about 12 documents and the comparability rows, because volume
  would not close the structural gaps. That was followed for one day (m38–m41), and it worked. Then R002 and R003
  switched to "everything".
- 461 of the 940 new products went into six common materials that already had answers: PLA +195, PETG +71,
  TPU +67, ABS +56, ASA +41, PLA Silk +31.
- 55 new materials arrived, 28 of them with a single product. Across the six scenarios, PASS went from 97 to 103
  and UNKNOWN from 149 to 373.
- R003 said "transcribe everything", but in practice the reader kept only what fitted a known number slot:
  - 39,468 distinct lines on 1,499 documents were skipped. Examples: "low processing (linear) shrinkage up to 0.3 %", an insulation resistance,
    storage notes.
  - No qualitative statement was proposed.
  - Chamber and drying requirements were recorded for fewer than one product in six.
  - So "everything" produced neither the complete record nor the know-how.

**3. Strictness was applied everywhere, not where decisions are made.**
- Every value got page-level provenance, typed columns, plausibility windows and a signed review.
- The context that decides comparability (specimen, direction, moisture) is missing on most values and disputed on
  a quarter of those sampled.
- Because every recorded fact had to meet the decision standard, recording a fact was expensive. That is why so
  much was skipped.
- The cost of checking grew with every row. Trust in the values that decide did not.

**4. The taxonomy turns every unusual product into a question.**
- R001 says: a new material for each polymer × filler × variant, and the reader never guesses. That produced 164
  rulings, 85 % of them about which bucket a product belongs in.
- At the same time Bambu's own product lines were kept as separate materials, so the tree is not consistent either.
- 178 documents are deferred, 74 of them for identity alone. Their contents cannot be recorded until someone
  decides which material they belong to.

**5. Process machinery outgrew the product, and decisions were never re-checked at scale.**

| What | Size |
|---|---|
| Import pipeline | 7,673 lines, more than the whole app (6,851) |
| Checks | 112 check codes; 295 accepted findings, up from 13 a week earlier |
| Tests | 434 tests: 38 % test the import pipeline, 36 pin specific records |
| History | 125 migrations; 82 decisions, 43 of them in nine days |
| Docs | about 86,000 words of core docs and 132,000 words of audit narrative |
| Proposals | 75 MB of import proposals committed under `docs/` |
| Build and verify | a full build takes about 14 s, 13.6 s of it the estimate model; `verify` rebuilds it more than ten times |

Many decisions were answers to a narrow question an agent asked, given without the big picture. None was revisited
when the data grew tenfold.

**Honesty gaps to fix, because a team will rely on this:**
- All 20,478 review signatures on imported rows belong to AI agents, while the docs say "a named person".
- The "96.6 % reader parity" mostly measures the reader agreeing with rows it wrote itself. Only 144 of the 1,257
  sheets compared were transcribed before the import.
- `RESPONSE.md` says every ledger row is terminal, but 39 are still `held`. Twenty of those already have a verdict
  and are stuck on a gap in the logic.
- Counts are stale in ARCHITECTURE, DATA-MODEL, PIPELINE, README and OPEN-PROBLEMS. For example, db.json is
  described as "about 3 MB" but is 21 MB, and `verify:fast` as "about 25 seconds" but takes 4 minutes.

**What is genuinely good and must be kept:**
- traceability to source, page and hash;
- missing is never zero;
- the PASS / FAIL / UNKNOWN semantics and the "why excluded" view;
- the single offline file;
- the deterministic build and `build:diff`;
- the SQLite query layer;
- the fuzz test comparing the page with the engine;
- the core of the estimate model;
- CSV under a schema, with migrations as the history;
- the fetched, hashed, cached corpus of about 1,300 documents, and the reader's page-and-line record of what it
  skipped.

---

## 4. Decisions to revisit

| Decision | Why it made sense then | Why it hurts now | New direction |
|---|---|---|---|
| D8, and the 09-21 ruling: never a range across products | Three PEBA grades (7.5, 25 and 30 MPa) would read as uncertainty | A material's range is exactly what engineering screening needs | **Range plus typical value, labelled "products differ"** (your answer); new decision D83 |
| D2 / D37: a headline is one hand-picked measurement of the representative grade | About 100 materials, one product each | 1,119 products; the pick decides the verdict; 18 moves are waiting | Each product's values **derived by rule**; `headlines.csv` becomes overrides only |
| Printability as material-level unions and "any profile fits" | One product per material | A union is not any product's recipe | **Each product's own recipe** screens and is shown |
| R002 / R003: import and transcribe everything, all to the decision standard | Completeness felt safer | Expensive per fact, so the know-how and the unusual facts were skipped | **Record everything, verify what decides.** A light record tier for all facts and statements (database only), a strict decision tier for verdict values (new decision D85). New document imports paused until the re-center (your answer) |
| R001: one bucket per polymer × filler × variant, with Bambu lines as materials | Precise identity | 140 rulings, an inconsistent tree, and 74 documents unrecorded for identity alone | Bambu lines become products of their material; each family gets an "other / unspecified" home; record-tier facts attach to the *source* when identity is unsettled (your decision in phase 5) |
| D48 / D59 / D81: estimates may screen; grade estimates everywhere | Rigour | Machinery for a chip in one mode; confusing on screen | Material estimates only where **no product** publishes the property; grade estimates only where the product has no value of its own |
| D49: typed columns beside raw text | A parser change could silently move a verdict | Over 99 % of typed cells repeat the parser | Keep them in the decision tier; they also catch transcription errors. None in the record tier |
| D50: every finding fixed or accepted, record by record | Nothing slips through | 295 acceptances, many bulk-accepted with one sentence | Findings on the values that decide; the rest fixed by a rule or a window, as D80 did |

---

## 5. The plan

Each phase ends at a gate you can see. The session counts are rough. Phases 1–5 change the tool; phase 6 fills the
data, and its first two lanes can run alongside phases 3–5 because they touch no selection code.

### Phase 0: Pause, tidy, tell the truth (1 session)

*In plain words: stop bulk importing, correct what the records overstate, write down the goal, and make checking
fast again.*

- **Pause new imports.** Note it in PLAN-REMAINING and AGENTS.md. The 39 `held` rows stay as they are, but are no
  longer described as terminal.
- **Honest wording.**
  - Review signatures are described as agent reviews.
  - Parity is reported separately against the 144 sheets transcribed before the import.
  - RESPONSE.md is corrected.
  - Stale counts are removed or replaced by a pointer to the generated STATUS.md.
- **Write the goal down.** A short `docs/GOALS.md` with the one-sentence goal, the audience, the funnel, the two data
  tiers, the scorecard in section 2, and the working rules in section 7. This is the missing north star; every later
  piece of work points to a line in it.
- **Record the decisions.**
  - D83: range plus typical value, and the all / some / none roll-up. It supersedes D8 and amends D2 and D37.
  - D84: two evidence levels in the decision tier, "comparable" and "as published", with "comparable" as the default
    that decides verdicts.
  - D85: the record tier. Every fact a source publishes may be recorded as printed, attached to the source and,
    when known, the product. It is never used in a verdict, never subject to rulings or per-row review, and never
    shipped in the page, except makers' know-how, which the panel shows.
- **Faster checks.**
  - Cache the estimate stage in `.cache/estimates/<sha>.json`, keyed on the table hashes, the files in
    `build/src/{estimate,normalize}` and the model config.
  - Add a test loader that reads the fresh `dist/db.json` instead of rebuilding.
  - Tests that change data run with `estimates: false`.
  - Move the eight `ingest-*` test files to `npm run test:ingest`, which runs in CI while imports are paused.
- **Gate:** `verify:fast` at or under 90 s; `npm run build:diff` shows 0 differences.
- **Branching:** tag the current state `v2.0`. Merge it to `main` when you say so. The re-center happens on its own
  branch.

### Phase 1: Every product gets its own values and its own print recipe, by rule (2–3 sessions)

*In plain words: instead of a person choosing one product to speak for a material, the build works out each
product's values and print requirements by the same rules, then summarises each material from its products.*

- **Product values.**
  - New `build/src/product-headlines.js`, holding the validity chain extracted from `compile.js:301-312` as
    `headlineProblem(m, def, gradeMeasurements)`. It drops the representative-grade clause and adds the HDT load
    check now in `validate.js:250`.
  - Each value gets a level:
    - **Comparable:** direction as the headline requires, specimen printed or unstated, dry or unstated, load stated.
    - **As published:** direction or load not stated. The value is flagged with which one.
    - **Excluded:** as today (Z direction, film, filament or moulded specimens, conditioned, implausible, annealed
      beside an as-printed value).
  - When a product has several candidates, the preference order is: printed over unstated; as-printed over annealed;
    dry over unstated; the order of `Value properties`; a point over a bound; the newest source; the lowest ID. It is
    deterministic.
  - Output: `db.grades[].headline[key]`. An annealed value carries its schedule (Anneal °C and h are already
    columns on the measurement), so the tool can say "reaches this after annealing".
- **Product print recipe.**
  - `db.grades[].print` holds each product's own nozzle, bed and chamber windows and states, enclosure, plate,
    hardened-nozzle need, drying (°C, h) and the annealing its sheet states.
  - It is taken from its own profile(s) in `profiles.csv`, using the typed columns that already exist, instead of a
    union across the material.
  - Where a product has no profile, the recipe says "not published" and the panel shows its siblings' range as a
    hint, never as its own.
- **Overrides.**
  - `headlines.csv` keeps working, now as an override pinning a product's value.
  - 395 of its 477 value rows have exactly one candidate; the build warns that these are redundant.
- **Material summaries.**
  - `db.materials[].summary[key]` holds n, n comparable, min, lower quartile, median, upper quartile, max, the typical
    product (the one nearest the median), as-published values {n, min, max}, and variants listed separately.
    Quartiles are shown only when n ≥ 4.
  - The same summary applies to the print temperatures, for the material view.
  - Declared variants (30 active products, such as metal-filled or foamed PLA) stay out of the range. With them,
    PLA's density runs 800–4000; without them it runs 1170–1329.
  - Product price: each product's median regular per-kg price.
- **Compatibility.** `material.headline[key]` stays as a derived view (the median plus the typical product) for
  sorting, charts and export. It no longer decides anything.
- **Gate:**
  - `build:diff` shows only the new `grades[*].headline`, `grades[*].print` and `materials[*].summary`.
  - `build/snapshot/products.csv` and `summaries.csv` are added.
  - A report compares the rule with the 477 hand picks: at least 90 % should agree, and each disagreement is listed
    for your review.

### Phase 2: The engine answers "all / some / none", including printability, and ranks (2 sessions)

*In plain words: each product is checked against all requirements together, including whether our H2C can print
it. The material's answer is how many of its products pass. Survivors are sorted by the goal you choose.*

- **Per-product checks** in `app/js/engine/constraints.js`:
  - `productView(material, grade, ctx)` is the material with this product's values and print recipe.
  - `evaluateProducts(...)` runs the existing `evaluateMaterial` on each product view.
  - **Printability gates become per product**: nozzle, bed and chamber within the H2C limits, enclosure,
    hardened-nozzle need against the user's setup (today `constraints.js:226-244`), and optionally "no annealing
    required". A product without a profile is UNKNOWN on those gates, not a pass.
  - Family and environment filters are evaluated once per material and reused.
- **Roll-up**, counting only products that could be decided:
  - **PASS**, with share **ALL** or **SOME**: at least one product passes.
  - **FAIL** (**NONE**): none pass and at least one fails.
  - **UNKNOWN**: no product could be decided.
  - The count of untested products is always shown.
  - `verdict` keeps its three values, and `share` and `counts` are added, so the modes, the count bar and the fuzz
    invariants keep their meaning.
- **Why excluded** (`explainExclusions`) reports the materials and products removed by each requirement, printability
  included.
- **Ranking.**
  - `rankMaterials(evaluations, index)` in `app/js/engine/indices.js` reuses `indexValue` and ranks by the median
    index over passing products, with the best product shown beside it.
  - Indices are always computed per product and then summarised, never from medians taken from different products.
- **Scenario.**
  - Optional `rankBy`, `evidence` and machine-setup fields go in `app/js/engine/scenario.js`.
  - `validateScenario` fills in defaults, so old links still load.
- **Search.** Search covers makers and product names (`app/js/engine/search.js`).
- **Gate:**
  - `templates.csv` gains Share, Pass and Decided columns.
  - FAIL→SOME flips on properties match the measured expectation: outdoor 1, indoor 0, lightweight 4, warm 2,
    stiffness 6, flexible 1.
  - Printability flips are listed and reviewed, since per-product gates can also turn a material from PASS to SOME.
  - Nothing reaches the interface yet, so a SOME row cannot show a failing median.

### Phase 3: The interface follows the funnel (3–4 sessions)

*In plain words: the table shows each material's range and how many products pass, sorted by your goal. The chart
shows materials as bubbles. Opening a material shows its products, how to print and treat each, and what makers
say.*

- **Table** (`app/js/ui/table.js`):
  - each cell shows the median, a min–max bar and n;
  - the result chip reads, for example, "SOME · 3 of 27 (171 untested)";
  - rows expand to their products;
  - a "Sort by goal" control uses `rankBy`;
  - the Printing column set shows per-product ranges, not unions.
- **Ashby chart** (`app/js/ui/ashby.js`):
  - a material is a bubble: a lower-to-upper-quartile box with min–max whiskers, reusing the envelope drawing;
  - a "products" level plots one point per product;
  - estimate envelopes are drawn only for materials with no product data;
  - the Pareto front is computed over products;
  - use Plotly `scattergl` if 1,100 points are slow.
- **Side panel** (`app/js/ui/detail.js`):
  - a range summary per property, then products with their values and pass/fail;
  - **per product, a print-and-treat card**: nozzle, bed and chamber, enclosure, plate, hardened nozzle, drying,
    annealing, and the speed, cooling and retraction notes from `profile_notes.csv`;
  - **"What makers say"**: each product's statements grouped by topic (benefits, pitfalls, warping and shrinkage,
    precision and tolerance, surface, moisture, good for), in the maker's words with the source, and a count per
    topic at material level. It is display only. Where nothing was collected, it shows the gap state from lane 3
    ("sheet silent, maker site not searched yet") rather than an empty section;
  - the "stands for this material" label goes;
  - a grade estimate is shown only where the product has no value of its own, which fixes `detail.js:244-257`.
- **Compare** shows range bars. **Export** adds a products CSV (product, maker, values, print recipe, sources,
  verdict).
- **Plain-language pass.**
  - The word "headline" leaves the screen.
  - The estimate wording is rewritten for a non-statistician.
  - One "what these marks mean" popover.
- **Test harness.** Update the ui-fuzz invariants in `scripts/ui-fuzz.mjs`:
  - I1: the chip.
  - I4: the point sets.
  - I5: SOME means the displayed maximum meets the limit.
  - I8 already holds.

  Then regenerate the ui-probe views and add views for the print card and "What makers say".
- **Team test at real volume** (none has been run since the data grew tenfold). Two engineers do five tasks without
  help, for example:
  - "An outdoor part above 80 °C, the lightest above 3 GPa, printable on our H2C without a hardened nozzle: which
    materials, which products, how do we print them, and why?"

  Findings are logged. Boot time is measured in a browser.
- **Gate:**
  - the views are reviewed and `npm run ui:fuzz:full` passes;
  - PLA reads "27 comparable products, 0.95–2.95 GPa, typical 2.3, +46 whose sheets do not state the direction";
  - PPS-CF shows each product's own nozzle window;
  - the team test is written up.

### Phase 4: Retire the old shape (2 sessions)

*In plain words: remove the "representative product" machinery the new approach no longer needs, and shrink
estimates to where they help.*

- **One migration:**
  - removes the `Representative grade` column, with the old picks archived under `docs/audits/<date>-re-center/`;
  - removes redundant `headlines.csv` rows through `data/review/removed-records.csv` (D72);
  - adds a required Reason to the remaining overrides;
  - updates the `method.csv` rules on headlines and ranges.
- **Estimates.**
  - A material estimate is made only where no product publishes the property.
  - Grade estimates are for display, and only where a product has no value of its own.
  - The HDT unstated-load bracket is switched off; the as-published level replaces it.
  - The representative-grade special cases in `build/src/estimate/` (`bounds.js`, `grades.js`, `observations.js`,
    `validate.js`) go.
- **Obsolete checks removed:** REP-GRADE-NOT-OWN, HEADLINE-DIRECTION, MEAS-HEADLINE-TYPE, and the representative-grade
  parts of HEADLINE-CITATION and HEADLINE-SELECTION-INVALID. The union-based printability code in the engine goes.
- **Stored copies removed:** Availability's "Retired mapping" copy of Status (GRADE-RETIREMENT-HALF), and H2C status's
  "Excluded" copy of Scope (EXCLUSION).
- `scripts/data/representative.mjs` is retired.
- **Tests:** retire or rewrite the ones that assert the old shape: `test/headlines.test.js`, and the listed cases in
  `test/database.test.js`, `test/constraints.test.js`, `test/screening.test.js`, `test/contract.test.js` and
  `test/new-property.test.js`. Add roll-up and per-product gate tests.
- **Gate:** `data:diff --fail-on-removed` passes against the ledger; the `screening.csv` diff is reviewed; RULES.md
  is regenerated.

### Phase 5: Simplify the machine and settle the taxonomy (2 sessions, can interleave with 3–4)

*In plain words: fewer, clearer checks and docs, and a family tree with a home for everything.*

- **Tests.** The 36 tests that pin records become rules over all products (for example, "no product value comes from
  a moulded, film or Z-direction bar"). `products.csv` holds the specific values.
- **Findings.** Bulk acceptances are replaced by windows or rules, as D80 did. New findings are raised on values that
  feed a verdict.
- **Archive.** Move `docs/audits/2026-09-18-v2-import/proposals` (75 MB) to `archive/ingest-2026-09-18/` and update
  `proposalsOf` (`scripts/ingest/apply.mjs:55`). The migrations need the files, and phase 6 mines their skipped
  lines, so they are kept.
- **Docs.**
  - A `docs:counts` generator writes the one block of numbers, and the other docs link to it.
  - ARCHITECTURE, PIPELINE and HOW-IT-WORKS merge into one document.
  - Each decision in DECISIONS gets a one-line plain summary, and superseded ones are marked.
  - The audit narratives stay as history and are no longer required reading.
  - AGENTS.md is shortened to the new recipes.
- **Taxonomy** (your decision, in this phase):
  - The 16 single-product Bambu lines become products of their material. This is a migration, and old links map
    through the removal ledger.
  - Each family gets an "other / unspecified" material, which ends the ruling queue for the 50 family-only names and
    the 24 identity rulings.
  - The reference layer's misspellings and its dead `offset` go.

### Phase 6: Fill the data in four lanes (lanes 1–2 can start alongside phase 3)

*In plain words: first keep everything the documents already say, then fill the print recipes and makers'
know-how, then fix only the numbers that block an answer. Almost all of it comes from documents already fetched,
hashed and cached. New fetching waits for a gap that needs it.*

**How the light tier stays light**, so this does not recreate the import machinery:
- A record-tier row needs only the source, the page, the text as printed, and a topic or property if one is obvious.
  It attaches to the product when the source's product is settled, and to the source alone when it is not, so no
  ruling is needed.
- There is no per-row signed review, no typed-column parser and no plausibility window. The only check is a schema
  check. A sample of 30–50 rows per lane is checked by a person against the page image.
- It stays out of the selection engine and out of the page, except lane 3's statements in the panel.

**Lane 1: the record** (database only, about 1–2 sessions)
- Turn the reader's 39,468 distinct skipped lines (page, text, reason, already in the proposal files, repeated
  across batches that re-read a document) into a
  `source_facts` table in the database. Each row is a fact as printed, with its source, page and whether it maps to a
  known property. Add the rows the build never used.
- Add a full-text index of every cached document's text to `dist/h2c.sqlite`, rebuilt from the cache. It is not
  committed, since the text is the makers' and the cache is keyed by digest. `npm run sql` can then answer "which
  sheets mention annealing, UL 94, insulation resistance".
- Documents deferred only for identity (74) get their facts recorded against the source.
- **Gate:** a query finds a given skipped fact by its words and page; nothing in `db.json` changes.

**Lane 2: printability and treatment** (priority; about 2 sessions)
- From the cached documents of products with no recorded chamber (958 products), drying (917) or enclosure need, and
  from those with a stated annealing schedule, fill `profiles.csv`. These are decision-tier values that screen, so
  they get the decision checks, but only these columns.
- Treatment statements (drying before, annealing after with its effect, other post-processing) go in `evidence.csv`
  under Post-processing with their schedule. They link to the annealed values they explain.
- Where makers are silent, a polymer-level printing guide can apply from a fetched reference such as Bambu's
  material guide. It is labelled polymer-level, as `polymer_environment.csv` already does for chemistry (D64), and a
  product's own profile always wins.
- **Gate:** products with a stated chamber, drying and enclosure state counted before and after; Phase 2's printability
  UNKNOWNs drop accordingly.

**Lane 3: makers' know-how** (panel only; about 1–2 sessions)
- Statements on benefits, pitfalls, warping and shrinkage, precision and tolerance, surface, layer adhesion,
  moisture sensitivity, odour, nozzle wear and "good for", taken from the skipped lines and cached text. They are
  recorded in `evidence.csv` under new display-only domains with a topic vocabulary, in the maker's words, and the
  engine never reads them.
- The makers' product pages already fetched as witnesses count too, labelled as marketing text where they are.
- **A visible gap where the sheet is silent.** Much of this know-how is not on a data sheet at all. It sits on the
  maker's product page, FAQ or printing guide, which this round does not search. So the gap is recorded, not hidden:
  - each material and product gets a know-how state: **collected**, **sheet silent — maker site not yet searched**,
    or **searched — nothing published** (dated);
  - the state is a derived coverage row (the build already derives coverage domains, D74), and the panel's "What
    makers say" shows it in place of an empty section: "Hatchbox's data sheet says nothing about printing pitfalls;
    its website has not been searched yet";
  - a generated worklist, in the manner of BLOCKERS.md, lists every material in the second state with its makers'
    site addresses, so the later search round starts from a list, not a memory.
- The same three states apply to lane 2's print recipe, where a product's sheet gives no chamber, drying or
  annealing.
- **Gate:** products with at least one statement, counted before (87, mostly chemical) and after; every material
  carries one of the three states; the sample check passes.

**Lane 4: the numbers that decide** (after phase 3, driven by a report)
- A "blocking gaps" report for the six scenarios and common limits lists:
  - materials that are SOME or UNKNOWN only because values lack a stated direction or specimen;
  - products within about 10 % of a limit, where a re-read could change the answer;
  - materials with no data.
- Then, in that order:
  1. Re-read the test conditions of the values that decide, a few hundred rather than 11,000. That covers the
     second-read findings that matter and the batches b28–b33 that were never re-read.
  2. Targeted sheets for materials with no data.
  3. New selectable properties where enough comparable data exists: notched impact, glass transition, Z-direction
     strength. Lane 1 shows what exists.
  4. Price: is it worth a refresh routine, since it sits late in the funnel?
  5. Resume importing deferred, gated or new documents where they fill a blocking gap.
- **A human spot-check.** You or a team engineer checks 30–50 random decision values against their sheets, so the
  team knows the real error rate.

### Later: the team layer

- Split `db.json` into a small selection layer and an evidence layer loaded per material. The engine already reads
  only compiled values, so keep it that way.
- Team state (shortlists, an approved list, a decision record) lives in scenario files first, then in a shared store.
- The team's own test results and print experience enter as ordinary measurements and statements with an in-house
  source class, ranked above data sheets.
- **A maker-site search round** for the materials lane 2 and lane 3 left as "sheet silent — maker site not yet
  searched": product pages, FAQs and printing guides, fetched and hashed like any source. It runs from the generated
  worklist, material by material, with the materials the team uses most first.
- A price refresh; left/right nozzle, AMS and multi-material pairing if a need appears.
- Add `meta.schemaVersion` now; keep scenarios referring only to stable IDs.

---

## 6. Remaining work

### A. The open items of the current plan (PLAN-REMAINING §5 and §8), and what happens to each

| Item | After the re-center |
|---|---|
| 18 representative-grade moves waiting on you | **Obsolete.** Phase 4 removes the representative grade; don't spend review time on it |
| 24 identity rulings waiting on you; 50 family-only names | Phase 5's "other / unspecified" home settles them in one pass; their facts are recorded against the source in lane 1 before that |
| 39 `held` rows (20 with a verdict stuck on a logic gap) | Phase 0 records them honestly; paused until lane 4 |
| INTAMSYS (33 gated), 15 unreachable | Unchanged; revisited in lane 4 only if they block a decision |
| "Evidence rows are not read" (§5) | **Lanes 2 and 3** |
| 69 deferred second-read findings | Lane 4, only those on values that decide |
| A property for stress at a stated elongation; Nobufil and BASF column layouts; iSANMATE reader parity | Recorded as facts in lane 1; decision values only if lane 4 needs them |
| Estimate centres on the parallel-lines view | **Dropped**: ranges replace them |
| "Nearest miss" in Why excluded | Phase 3 |
| Reference-layer misspellings and `offset` | Phase 5 |
| `grades_compiled` in SQLite | Phase 1 (a products table) |
| Boot time measured | Phase 3 |
| Merge v2 into `main` | When you ask; recommended after phase 0 |

### B. What the current plan does not cover, and should

- A written goal and success measure (now section 2 and `docs/GOALS.md`).
- A user test since the data grew tenfold.
- Ranking the survivors, product search, and the engineering filters that are missing.
- Per-product printability, treatment recipes, and the chamber and drying gaps (13 % and 16 % of products).
- Makers' know-how, and the record of everything else the sheets say.
- The missing test conditions on most values, which is the most important lever for the numbers that decide.
- An independent re-read of b28–b33 (about 1,000 rows, never re-read), and a human sample of agent-reviewed rows.
- A refresh routine for 1,422 sources whose revisions drift.
- The time `verify` takes, and stale documents.

---

## 7. Working rules from here, so issues stop scaling

1. **Goal first.** Every piece of work names the funnel step and scorecard line (section 2) it improves. If it
   names none, it waits.
2. **Record everything, verify what decides.** Any fact may be recorded cheaply as printed. Only the values that
   pass or fail a product carry the strict checks. Never let the cost of verifying stop a fact being recorded.
3. **Show the decision diff.** Every change reports how many scenario answers moved (`templates.csv`, and
   `summaries.csv` from phase 1). Decision-tier work that moves no answer is questioned before it continues.
4. **Targets before volume.** Decision-tier data is added to close a gap the tool shows, never just for completeness.
5. **Budgets.** `verify:fast` stays at or under 90 s. A new check or document has to fit that budget, or replace
   something.
6. **Better questions to you.** Every question from an agent comes with a recommended answer, what it affects
   later, and when to revisit it.
7. **Re-check decisions at scale.** Whenever the data triples, and at each phase end, re-score section 2's table and
   re-read the root decisions. It takes about 30 minutes.
8. **You set direction; agents build.** A change of direction (like R002/R003) updates `docs/GOALS.md` first.
9. **Say only what is true.** Counts are generated; labels say who, or what, reviewed.

---

## 8. Verification: how we will know it worked

- **Per-phase gates** as written above, using `npm run build:diff`, `npm run snapshot`,
  `npm run ui:check -- --write`, `npm run ui:fuzz:full` and `npm run verify`.
- **Outcome measures**, recorded before phase 1 and after phase 3, and after each lane:

  | Measure | Now | Target |
  |---|---|---|
  | Share of live values that feed a verdict | 20 % | reported; expected to rise several-fold |
  | UNKNOWN among materials not ruled out, six scenarios | 78 % | reported, counting only products that could be decided |
  | FAIL→SOME flips on properties | – | 14 (outdoor 1, indoor 0, lightweight 4, warm 2, stiffness 6, flexible 1) |
  | PLA reads correctly | – | 27 comparable products, 0.95–2.95 GPa, typical 2.3, +46 without a stated direction |
  | Products with their own nozzle / bed / chamber / drying recipe | 762 / 668 / 140 / 181 of 1,098 | reported after lane 2; chamber and drying the priority |
  | Products with at least one maker statement | 87, mostly chemical | reported after lane 3 |
  | Skipped facts searchable in the database | 0 of 39,468 | all, after lane 1 |
  | Materials whose know-how gap is labelled (collected / sheet silent, site not searched / searched, none) | 0 | all 158, after lane 3 |
  | `verify:fast` | ~4 min | ≤ 90 s |
  | Team test (5 tasks, 2 engineers) | – | completed without help |
  | Scorecard in section 2 | – | re-scored at each phase end; C5, C7 and C9 at 4 or more after phase 3 |

**Critical files:**

| Area | Files |
|---|---|
| Build | `build/src/compile.js`; `build/src/product-headlines.js` (new); `build/src/estimate/index.js`; `build/src/typed-values.js` (profile columns) |
| Engine | `app/js/engine/constraints.js`, `indices.js`, `scenario.js`, `search.js` |
| Interface | `app/js/ui/table.js`, `ashby.js`, `detail.js` |
| Checks | `scripts/snapshot.mjs`, `scripts/ui-fuzz.mjs`, `scripts/data/sqlite.mjs` (products table, `source_facts`, full-text index) |
| Data | `data/tables/materials.csv`, `headlines.csv`, `method.csv`, `profiles.csv`, `evidence.csv`; `schema/vocab/` (know-how topics) |
| Contract | `schema/db.schema.json` |
| Import | `scripts/ingest/apply.mjs` (`proposalsOf`) and the proposal files' `skipped` lists |
| Docs | `docs/DECISIONS.md` (D83, D84, D85); `docs/GOALS.md` (new) |

---

## Glossary, in plain words

| Term | Meaning |
|---|---|
| **Material** | A kind of plastic as an engineer names it: PLA, PA6-CF, PETG. It groups many products |
| **Product (grade)** | One filament you can buy, such as "Polymaker PolyLite PLA" |
| **Headline value** | The number the table shows for a property (stiffness, strength…) |
| **Representative grade** | Today, the one product chosen to supply a material's headline values. It goes away |
| **Range plus typical** | The lowest to highest value across a material's products, and the middle one |
| **All / some / none** | How many of a material's products meet all your requirements together, printability included |
| **Print recipe** | One product's own nozzle, bed and chamber temperatures, enclosure, plate, nozzle type, drying and annealing |
| **Makers' know-how** | What a maker writes about a product beyond numbers: benefits, pitfalls, warping, precision, what it is good for |
| **Decision tier** | The values that pass or fail a product. Strictly checked |
| **Record tier** | Everything else a source says, kept as printed with its page so we know it exists. Lightly checked, never deciding |
| **Comparable value** | Measured on a printed (or unstated) bar, in the stated direction, dry. Safe to compare |
| **As published** | The sheet does not say how the bar was made or oriented, so it may read higher than a printed part. Shown, but not used for the verdict unless you ask |
| **Estimate** | A statistical guess where nothing is published. A hint; it never makes a material pass |
| **Performance index** | A formula ranking materials for a goal. For example, stiffness ÷ density is "stiffest for its weight" |
| **Ashby chart** | A chart of one property against another, with each material drawn as a bubble covering its products |
| **Ruling** | A written answer to a data question, such as which material a product belongs to |
| **Migration** | A script that changes the data tables in a recorded, repeatable way |
| **Verify** | The command that checks everything before a commit |
