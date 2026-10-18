> **Historical record** (2026-10-18): written for the screening review. It describes the tool as it was on release 9ca94d31fc5d; rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** Every product of a material is checked against every requirement on its own data. A material **passes** if one product passes, **fails** only if every product fails, and is **unknown** otherwise. With the materials that could not be checked included, the unknown ones are split three ways: **estimated candidates to verify** (one product's only gaps are numbers whose model estimate, at its middle value, would meet the limit), **insufficient evidence** (every other unknown, in a collapsed list), and **screened** (every unresolved product is ruled out by inference: a property that does not apply to it, its base resin's chemical data, or an estimate). Screened materials are hidden behind the SCREENED chip, failures behind the FAIL chip. In this release no product estimate can screen anything. The screens that actually happen are not-applicable properties (elastomers' heat deflection, supports' mechanical values), resin chemical data, and estimates for the three materials that have no products.

The page names the two switches differently from the brief. "Materials with missing data: Include uncertain" has been
**"Materials that could not be checked: Leave out | Include"** since D146 (`app/js/ui/labels.js:27`, `app/js/ui/labels.js:33`,
`app/index.html:44`). The stored keys are unchanged: `scenario.unknownPolicy` is `'strict'` or `'exploration'`, beside
`scenario.useEstimates`. "Let estimates rule out materials" is unchanged (`app/index.html:56`). Every figure below was
re-run on release 9ca94d31fc5d. The per-template lists are in [CENSUS.md](CENSUS.md) (`census.mjs`), and decisions
are cited by number from [DECISIONS.md](../../DECISIONS.md).

## 1. What the reader sees

In plain words, there are four places. The bar at the bottom counts materials by answer and lets the reader show or
hide each kind. The list splits into sections under Include. Each row says how many of its products pass and why it is
unresolved. A separate view ranks the requirements by how many materials each costs.

| Element | Words on the page | Where | Shown when |
|---|---|---|---|
| Status chips | `PASS n`, `UNKNOWN n`, `FAIL n`; titles "that meet every requirement", "that could not be checked for missing data", "that fail a requirement" | `app/js/main.js:600-613`, `app/index.html:110-112` | Once a requirement is set. Leave out shows PASS only; Include shows PASS + UNKNOWN; FAIL is always off by default (`app/js/main.js:35-36`). |
| SCREENED chip | `SCREENED n`; title "…UNKNOWN materials are excluded: an estimate of a missing value clearly misses a requirement, or resin reference data reports the base polymer attacked or dissolved" | `app/js/main.js:632-638`, `app/index.html:113` | Only with Include, estimates on and at least one screen (`app/js/main.js:541-542`). Off by default (`app/js/main.js:52`). Screened materials are counted inside UNKNOWN, never FAIL (`app/js/engine/constraints.js:752-758`). |
| Count line | "N shown PASS + UNKNOWN · X candidates, Y could not be checked, Z screened out, W failed" | `app/js/main.js:550-588` | Always. Under Include, "candidates" counts every unscreened UNKNOWN too. |
| Under the switch | "N screened"; when Leave out is set: "Works only when the materials that could not be checked are included" | `app/js/main.js:618-628`, `app/index.html:62` | |
| List sections | "Supported candidates (n)"; "Estimated candidates to verify (n)" with "Predicted centres meet the missing numerical requirements. Still UNKNOWN; confirm before choosing."; a collapsed "Insufficient evidence (n) — included in counts and exports"; "Excluded / screened (n)" | `app/js/ui/table.js:550-561` | Only with Include and a requirement set. "Excluded / screened" holds only the rows a reader brought back with the FAIL or SCREENED chip. The same group order sorts the export (`app/js/ui/table.js:149-154`). |
| Result cell | verdict chip; a `screened` chip ("Screened by an estimate: …" / "Screened by the base polymer's published behaviour: …" + "Not a failure; not measured."); share "3 of 27 products" or "none judged"; "Estimated candidate to verify: 7 products fail at least one requirement; 4 remain unresolved" or "Insufficient evidence: 11 products have no complete qualifying evidence" | `app/js/ui/table.js:333`, `app/js/ui/labels.js:231-258`, `app/js/ui/table.js:183-200`, `app/js/ui/table.js:248-254` | The share's title adds "None passes, but not every product fails, so the material is unresolved, not failed" (D100). "likely fails" is no longer printed anywhere; it survives only in a comment (`app/js/ui/table.js:246`). |
| A material's reasons | "Shown for its closest product, *X*." then one line per requirement | `app/js/ui/explain.js:101-150` | Drawer and Why. |
| Heading sentence | "Included, those N are listed flagged, except the K excluded by an estimate or by resin reference data; the SCREENED chip at the bottom shows them." | `app/js/ui/start.js:123-128` | |
| "Why the rest were excluded" | Per requirement: "failed N · could not check M (K of them excluded by an estimate / by resin reference data) · removing it would bring back R candidates" | `app/js/ui/start.js:157`, `app/js/ui/explain.js:21-26`, `app/js/ui/explain.js:58` | Counts come from `explainExclusions` (`app/js/engine/constraints.js:767-795`). |
| CSV export | Header "# materials that could not be checked: include; estimates and polymer data on (never pass; may screen out)". Columns `Estimated fields`, `Screened by estimate` and `Screened by base polymer` appear only with estimates on; `Candidate group` (supported / estimated / insufficient / excluded) is always there | `app/js/ui/table.js:628-711`, products export `app/js/ui/table.js:744`, `:768` | |

## 2. The decision tree

In plain words: each requirement gets one of four answers for each product (pass, fail, unknown, or "the data straddles
the limit"). The product's answer is the worst of its required answers. A product that may be annealed or conditioned
is tried in each permitted state and keeps the best try. The material's answer comes from its products.

### 2.1 One requirement, one product (`evaluateConstraint`, `app/js/engine/constraints.js:582`)

A product is judged through a *view* of its material that holds the product's own values and print recipe
(`productView`, `app/js/engine/products.js:230`). A value decides when it is comparable, or when Data quality admits
values published without their direction or load (`app/js/engine/products.js:151`, D84). A material-level "not
applicable" passes through to every product (`:148`). A product prediction is attached only in the as-printed, dry state
(`:169-171`). The material's own estimate is used only for snapshots before version 2 (`:172-175`), which never applies
here, because the build stamps every grade `estimateVersion = 2` (`build/src/estimate/index.js:210`).

**Numeric requirement** (`evaluateNumeric`, `:124-251`), first matching row wins:

| # | The product's headline | Status | Screened? | Estimated? | Code | Rule |
|---|---|---|---|---|---|---|
| 1 | A value that decides | Compared as an interval. A "mean ± band" is judged on the mean and flagged close to the limit; a range or a one-sided bound is judged as itself, and a straddle is INDETERMINATE | no | no | `:207-250`, `compareInterval` `:92-120` | D54, D84 |
| 2 | Not applicable, with estimates on | UNKNOWN | **yes**, whatever the threshold | no | `:132-137` | D43, D56 |
| 3 | An estimate, with estimates on | UNKNOWN, never PASS | yes only if the plausible (95%) range **and** `screenRange` both wholly fail, `canScreen` is set, permission holds (a material estimate always has it; a product prediction needs `completeProductContext`), and no implied lower bound meets the limit (veto) | **yes** | `:145-184` (`:148`, `:151-152`, `:157-159`) | D26, D43, D48, D59, D137 |
| 4 | Published without direction or load | UNKNOWN, "not comparable" | no | no | `:186-192` | D84 |
| 5 | Published only in another state | UNKNOWN, "other state" | no | no | `:194-196` | D99 |
| 6 | Nothing | UNKNOWN: "Not published in the sampled sources…", or "No qualifying measurement. Published related values: …" | no | no | `:197-204` | D26 |

With estimates off, row 2 is skipped and a not-applicable headline falls to row 6.

**Other requirements:**

- **Print gates** (`evaluateGate`, `:304-402`). A nozzle, bed or chamber verdict maps through `GATE_STATUS` (`:30-36`):
  `within` is PASS; `partial` (chamber, D32) and `exceeds-recommended` (D6) are INDETERMINATE; `exceeds` is FAIL; and
  `unknown` or no profile is UNKNOWN (`app/js/engine/products.js:185`, `:195`). Several profiles combine in the order
  within > partial > exceeds-recommended > exceeds > unknown (`build/src/gates.js:18-43`). Scope FAILs an excluded
  material (`:305-316`). The hardened-nozzle check FAILs a stated requirement, PASSes a stated no-concern, holds a silent
  fibre-filled product UNKNOWN and passes the rest (`:338-358`, D27, D121). Availability is UNKNOWN with no offer and
  FAIL when the offer is out of stock (`:365-385`, D98). Drying is PASS on any statement and UNKNOWN on silence
  (`:387-396`, D127).
- **Facet** (`:406-426`): a recorded value passes or fails; an unrecorded one is UNKNOWN.
- **Environment** (`:436-510`), from the product's own records, else its twin's (D98, D89). A contrary record alone is
  FAIL. Mixed records, or a positive record beside a limited or narrative one, are INDETERMINATE (D28). A positive record
  alone is PASS, and anything else UNKNOWN. An "indicator" category is always UNKNOWN (`:442-449`). A material with no
  record in the category reads its base polymer's resin data (`:466-467`). That answer is always UNKNOWN, and it is
  screened when the resin record `screens` and estimates are on (`evaluatePolymerLevel`, `:530-540`, D64).
- **Evidence** (`:548-580`): the exact-grade and no-conflict checks pass or fail.
- **Treatment** (`:281-288`): a product used as printed PASSes. An annealed state PASSes with a full schedule and is
  UNKNOWN with a partial one (D99).

### 2.2 One product, all requirements, one state (`evaluateMaterial`, `:598-643`)

```
failed     = required results that FAIL                                   (reported ones never count)
unresolved = required results that are UNKNOWN or INDETERMINATE
verdict    = FAIL if any failed, else PASS if nothing unresolved, else UNKNOWN              (D26)
screened   = Include  and  verdict UNKNOWN  and  ANY unresolved result is screened          (:614)
estimatedCandidate = unresolved non-empty and EVERY unresolved result is an estimate,
                     not screened, whose CENTRE meets the limit                             (:615-616, D137)
group      = PASS → supported; UNKNOWN and not screened → estimated | insufficient; else excluded  (:617-618)
eligible   = PASS, or (Include and UNKNOWN and not screened)                                (:624)
```

### 2.3 One product, its permitted states (`judgeProduct`, `:650-666`)

The states come from `scenarioStates` (`app/js/engine/products.js:48-55`): as printed first, annealed only when the
scenario allows it and at a temperature the oven reaches, and in the moisture state asked for. An empty state stands in
where the product publishes none. An annealed try carries the treatment requirement. `completeProductContext` is true
only for the untreated dry try when all three of the product's print gates are `within` (`:658-659`); it is the
permission a product prediction needs before it may screen (D137). The best try wins: PASS, then estimated, then
insufficient, then screened, then FAIL (`:662-664`).

### 2.4 The material (`evaluateProducts`, `:681-714`)

```
verdict  = PASS if any product passes; UNKNOWN if none passes and any is UNKNOWN (someFail when some fail);
           FAIL only if every product fails                                                  (:688, D100)
share    = all | some | none, null when nothing could be judged                              (:689, D83)
screened = Include and UNKNOWN and EVERY unknown product is screened; failing products are ignored  (:691, D137)
best     = first PASS, else first unscreened 'estimated', else first unscreened UNKNOWN,
           else first UNKNOWN, else first FAIL, in the material's product order              (:692)
row      = best product's results, failed, unresolved, shortlistGroup, gradeId and state,
           plus the material's verdict, eligibility, screened and counts                    (:693-713)
```

When the material is screened, `unresolved` lists every unknown product's screened results, each prefixed with the
product's ID (`:701`). A material with no product is judged on its own headline and estimate (`:682`). In this release
that is three materials: M056 PA66-CF, M058 PA612 and M060 PA612-GF.

| Products: pass / fail / unknown | All unknown products screened? | An unknown product 'estimated'? | Verdict | Section under Include | Shown by default |
|---|---|---|---|---|---|
| ≥ 1 / any / any | – | – | PASS | Supported candidates | yes |
| 0 / any / ≥ 1 | no | yes | UNKNOWN | Estimated candidates to verify | yes |
| 0 / any / ≥ 1 | no | no | UNKNOWN | Insufficient evidence (collapsed) | yes, collapsed |
| 0 / any / ≥ 1 | yes | – | UNKNOWN + screened | Excluded / screened | no (SCREENED chip) |
| 0 / all / 0 | – | – | FAIL | Excluded / screened | no (FAIL chip) |

Under Leave out there are no sections. PASS is listed; UNKNOWN and FAIL are counted and hidden; and `heldBy` names the
requirements an unknown material could not be checked against (`:702`).

## 3. Where the inputs come from, and what is live in 9ca94d31fc5d

In plain words: the build makes three kinds of inference. Only two of them can rule a product out today, plus the
estimates of the three materials that have no products. The material estimates the build certifies to screen are no
longer read for any material that has products. The product estimates that replaced them are certified for nothing.

- **Material estimates** (`build/src/estimate/index.js:116-185`, D43). They exist only for a headline no product
  publishes comparably (`:118`). Each has a likely (80%) range, the one shown, and a plausible (95%) range. The
  back-test sets `screenRange` end by end (`build/src/estimate/screening.js:78-143`, D48, D59). An end screens where its
  evidence class is certified at a tolerance limit. Otherwise it screens only where the family model's end agrees. It
  never screens against the material's own evidence (`:126-133`). `canScreen` is true when either end is set, and
  `screenLimit` says why an end is not. These ranges reach a verdict only through `evaluateMaterial` on a material with
  no product (§2.4).
- **Product predictions** (`build/src/estimate/grades.js:94-147`, D81; `build/src/estimate/product-screening.js:81-160`,
  D137). One is attached to every product without a comparable value of its own (`grades.js:140`). A product estimate
  may screen only with a certificate: a 10% / 90% budget split over five properties, so 2% at 98% each
  (`product-screening.js:105-107`). That needs 194 calibration groups per evidence class. `screenRange` and `canScreen`
  are set only when certified (`:150-155`). Heat deflection's grade calibration reaches its clamp
  (`build/src/estimate/index.js:105-109`), so no product has an HDT prediction at all.
- **Not applicable** (D56): from the headline definition's "Applies to" (elastomers' HDT), and for a support material
  with nothing of its own (`build/src/estimate/index.js:130-132`).
- **Implied lower bounds** (D48 veto; `headline_definitions.csv` Lower bound): a yield or break stress bounds strength, a
  yield strain bounds elongation, HDT at 1.8 MPa bounds HDT at 0.45 MPa.
- **Base-polymer environment** (D64): `db.polymerEvidence`. A record is attached only where the material has no
  record of its own in the category.

Counts on `dist/db.json`, release 9ca94d31fc5d. "Missing" counts the 135 in-scope materials (no family entries, not
excluded) with no comparable product value. Predictions are on active products.

| Headline | Missing | Material estimate | …`canScreen` | Not applicable | Product predictions | …`canScreen` | Single-test diagnostic (not deployed) |
|---|---:|---:|---:|---:|---:|---:|---|
| density | 5 | 5 | 5 | 0 | 94 | 0 | this-material passes: 6 of 110 wrong, ≤ 9.4% |
| tensile modulus XY | 47 | 38 | 35 | 4 (supports) | 698 | 0 | this-grade passes: 0 of 41, ≤ 5.5% |
| tensile strength XY | 41 | 32 | 32 | 4 | 602 | 0 | this-grade passes: 0 of 55, ≤ 4.1% |
| elongation XY | 44 | 35 | 33 | 4 | 648 | 0 | none |
| HDT 0.45 MPa | 49 | 28 | 27 | 19 (elastomers, supports) | 0 (grade calibration clamped) | – | – |

Of the 132 material estimates with `canScreen`, 117 belong to materials that have products. The engine never reads
those 117. The other 15 belong to M056, M058 and M060. Implied bounds sit on 32 strength, 34 elongation and 12 HDT
material headlines, and on 865 of the 2,042 product predictions. They veto nothing now, because nothing reaches them.
Of the 314 base-polymer records, 68 `screen`, across 45 materials. By category: solvents 18, acids 14, alkalis 13,
flammability 11, hydrolysis 10, UV 1 and water solubility 1. Moisture and oil have none.
`test/product-screening.test.js:106` pins "no complete-scenario class meets the reserved risk gate in this release".

**What actually screens** (six templates, Include, estimates on; it matches [CENSUS.md](CENSUS.md)): Outdoor 14, all
on not-applicable HDT; Warm environment 16, all not applicable; High-stiffness 1 (M058 PA612, on its material
estimate); Flexible 2 (M056, M060, on material estimates); Indoor and Lightweight 0. That is 33 screens: 30 not
applicable, 3 estimates of product-less materials, none from a product prediction, and none from resin data, since no
template asks about the environment. A single environment requirement does screen: "Resists organic solvents" alone
screens 18 materials on resin data.

## 4. The two switches

In plain words: **Include** decides whether materials that could not be checked are listed. **Let estimates rule out
materials** works only under Include. It lets inference hold some of them out, and it also creates the "Estimated
candidates to verify" section. Under Leave out, estimates are neither shown nor used.

- **Defaults.** A new scenario is `unknownPolicy: 'strict'` and `useEstimates: true` (`app/js/engine/scenario.js:34`,
  `:44`; `app/js/main.js:46`), so pressing Include turns estimates on at once. The engine reads
  `ctx.useEstimates = Include && switch` (`app/js/main.js:177`), and the switch is disabled under Leave out
  (`app/js/main.js:621`). `scripts/trace.mjs:49` (`pageContext`) applies the same rule, so a trace or census matches
  the page.
- **What Include changes:** UNKNOWN is listed and `eligible`, the list is grouped, and FAIL stays hidden. Verdicts never
  change (D26).
- **What the estimates switch changes, under Include only:**
  1. A result can become `estimated`, which can lift a material into "Estimated candidates to verify" (§2.2). The
     switch's name and its help text (`app/index.html:59`) mention only ruling out.
  2. Screens: not applicable, base-polymer data, and estimates with `canScreen` (§3).
  3. Display: estimate cells, cards and the three export columns (`showEstimates`, `app/js/main.js:184`).
- **Leave out + estimates on** behaves exactly as Leave out on the page. Called directly, the engine with strict and
  `useEstimates` still marks 'estimated' groups but never screens (`:614`), and the candidates are unchanged.

| Template | Leave out: candidates | Include, estimates off | Include, estimates on: supported / estimated / insufficient (screened) |
|---|---:|---:|---|
| Outdoor structural part | 7 | 108 | 7 / 6 / 81 (14) |
| Indoor prototype | 87 | 126 | 87 / 0 / 39 (0) |
| Lightweight structure | 15 | 97 | 15 / 18 / 64 (0) |
| Warm environment | 39 | 123 | 39 / 0 / 68 (16) |
| High-stiffness fixture | 5 | 109 | 5 / 9 / 94 (1) |
| Flexible component | 8 | 110 | 8 / 10 / 90 (2) |

## 5. Observations

Each was checked in the code or the data; none is a proposal.

1. **The page promises estimate screens that no longer happen.** The switch's help text (`app/index.html:59`), the
   drawer's estimate card ("It can exclude this material from …", `app/js/ui/detail.js:384-386`) and its group note
   (`app/js/ui/detail.js:411`), the table legend (`app/js/ui/table.js:462`), the export's "can screen"
   (`app/js/ui/table.js:669`) and `build/snapshot/screening.csv` ("Screens yes") all describe the material estimate as
   able to rule a material out. For a material with products, the estimate stage's own `estimateVersion = 2`
   (`build/src/estimate/index.js:210`) means `products.js:172` never hands it to a product. So 117 "can screen"
   estimates decide nothing. In the six templates, 55 (material, template) pairs keep a material whose own estimate
   wholly fails a requirement with `canScreen` and no veto. ASA-EC and ASA-AF at 5 GPa, the
   [2026-10-07 audit](../2026-10-07-uncertain-logic/README.md)'s screened examples, are now "Insufficient evidence".
   D137 and OPEN-PROBLEMS §35 say "all *new* numerical exclusions are disabled". Neither says that the D48/D59 material
   screens stopped too. D138 still credits the estimate stage with "32 of 673 template candidates" screened; today's
   33 are 30 not-applicable headlines and 3 product-less estimates.
2. **The guard tests a path the page does not run.** `test/screening.test.js:85-116` ("no material stays a candidate
   for a requirement its defended range fails") builds its context without `productsByMaterial`. It therefore exercises
   `evaluateMaterial` on the material headline (`app/js/engine/constraints.js:740-744`). AGENTS.md names this test as
   that guarantee; on the page's path, the 55 pairs above break it.
3. **Promotion rests on the centre; exclusion rests on the whole range and a certificate.** `estimatedCandidate`
   compares the estimate's centre, its 50% value, with the limit (`:615-616`). Screening needs the 95% range, the
   back-tested `screenRange` and a certificate (`:159`). Promotion needs no certificate at all. In 24 of the 43
   estimated rows across the templates, the representing product's own plausible range still crosses the limit. PLA-CF
   at 5 GPa is a coin flip: centre 5.05, plausible 2.53 to 10.1. D137 decided centre-based grouping. The section
   heading is its only disclosure, since the row's reason never states the centre (`:160-168`).
4. **One product names the material.** A material is an "Estimated candidate to verify" when any one product is
   (`:692`). In 24 of 43 rows exactly one product is, and 29 of 43 have failing products. PLA in Outdoor has 96 failing,
   98 insufficient and 1 estimated (colorFabb PLA-HP, density). On such a row the label and the reasons are that one
   product's (`:693`), the value columns are the spread of every product, and an estimate cell shows the *material*
   estimate, which decides nothing. The reason quotes the *product* prediction: for ASA-EC's modulus the cell's
   plausible range is 1.93 to 4.3 GPa and the reason's is 1.83 to 4.52 (D147: one computation per fact).
5. **"Not applicable" is reported as an estimate.** `screenedByKind` files every non-polymer screen under "Screened by
   an estimate" (`app/js/ui/labels.js:231-237`). So do the Why excluded clause (`app/js/ui/explain.js:21-26`), the
   heading (`app/js/ui/start.js:126-127`) and the export column. Yet 30 of the 33 template screens are a headline that
   does not apply by definition (D56). With estimates off, the same headline reads "Not published in the sampled
   sources; ask the maker or test a printed coupon", because the not-applicable branch needs `useEstimates` (`:132`,
   `:197-204`). PEBA's HDT shows this.
6. **A screened row is labelled "Insufficient evidence".** `unknownMark` tests only for 'estimated'
   (`app/js/ui/table.js:251`), so a screened row in "Excluded / screened" carries that label beside its SCREENED chip.
   The same line prints "1 products fail" (`:252`).
7. **Why excluded can count a screen the material does not have.** Per requirement, `explainExclusions` takes the first
   non-failing product (`:784`) and counts the material screened if that product is (`:787`). The material itself is
   screened only when every unresolved product is (`:691`). This is latent today, because every live screen applies to
   the whole material.
8. **"Shown for its closest product"** (`app/js/ui/explain.js:129`) names the first product of the best group in the
   material's product order (`:692`). For a FAIL material that is the first failing product. "Closest" is not measured
   anywhere.
9. **One word, two meanings.** "Screened" is the SCREENED chip (held out by inference) and also GOALS step 2 and the
   chart's "nothing is screened until a requirement is asked" (`app/js/ui/decision.js:107`, `:393`, `:880`).
10. **Names drift.** The page says "Leave out | Include" (D146), while D100, D137, OPEN-PROBLEMS §35 and the export's
    internal values (supported / estimated / insufficient / excluded, `app/js/ui/table.js:707`) keep "Include
    uncertain", "Confirmed only" or code keys. `Candidate group` is also filled under Leave out, as "insufficient" for an
    UNKNOWN row that is not a candidate there.
11. **Code comments describe the old contract.** `build/src/estimate/index.js:9-10` says the material estimate "stands
    in for each of the material's products" and that grade estimates "decide nothing". `constraints.js:138-144`
    describes material-estimate screening as live.
12. **Minor wording.** A product prediction's reason runs "…without a calibrated bound Published related values: …;
    no qualifying measurement." with no full stop between the clauses, and repeats "no qualifying measurement"
    (`:167`, `:171`, `:181`).

## 6. What the earlier audits still say truly

Of the [2026-10-07 finding](../2026-10-07-uncertain-logic/README.md), this still holds: ASA-GF is UNKNOWN at 5 GPa
(2 of its products fail, 4 are unresolved) under D100. The material estimate still exists only where no product
publishes. Its causes have changed: since D137 each silent product carries its own prediction (it no longer reads
"Not published" when it publishes related values), but none may screen. So its "inconsistency" is gone by levelling
down: ASA-EC, ASA-AF and TPU harder than 95A are no longer screened either. "publish none" and "likely fails" are gone
from the page. Of the [2026-10-08 fix](../2026-10-08-product-screening/README.md), this still holds: every complete-scenario
certificate is disabled (194 groups needed; no product prediction has `canScreen`); HDT's grade clamp stops product
predictions; and the grouping into supported / estimated / insufficient is as built. Its single-test diagnostics have
moved with the data: modulus now passes (0 of 41 wrong, ≤ 5.5%, where the audit had 13.08%), and strength is 0 of 55
(≤ 4.1%). Its scenario counts (for example "20 supported, 11 estimated, 94 insufficient" at 5 GPa) describe that
baseline, not the High-stiffness template today, which is 5 / 9 / 94.
