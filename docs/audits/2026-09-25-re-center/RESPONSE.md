# Re-center: what was done

The [report](REPORT.md) is the review and plan as the owner approved it on 2026-09-25. This page records what each phase did,
with the figures its gate asked for.

## Phase 0: pause, tidy, tell the truth (2026-09-25)

| Item | What was done |
|---|---|
| The goal written down | [docs/GOALS.md](../../GOALS.md): the goal, the method, the two data tiers, the scorecard, what is decided and not yet built (D83 to D85), the working rules. `CLAUDE.md`, `AGENTS.md` and `docs/README.md` send a reader there first |
| Imports paused | `AGENTS.md` ("Importing a batch of data sheets") and the head of `PLAN-REMAINING.md`, which is marked superseded as the working plan |
| The close report corrected | V2's `RESPONSE.md` said every ledger row was terminal; 39 were `held`. Corrected, with a note on who reviewed and what parity measures |
| Who reviewed | Every one of the 20,478 review decisions in the import's proposals is an agent's. `AGENTS.md` now says "a named reviewer (a person, or an agent named as one)" and that a report must say which |
| What parity measures | `ingest:propose -- --compare --all` now also scores the reader against only the values recorded before the import (up to V002645, commit 73de8d2), which it did not write; STATUS.md shows both. **Independent parity 87.1 %** (1,759 of 2,020 values on 141 sheets), against a regression figure of 96.6 %. Most makers imported in V2 have one such sheet or none |
| Stale documents | DATA-MODEL (counts in the diagram, the calibration table and the estimate counts now point at `build/reports/validation-report.md`), ARCHITECTURE (payload size), HOW-IT-WORKS ("about a hundred filaments"), README (the mode buttons' names), PIPELINE (a timing that contradicted itself, a test file's name), OPEN-PROBLEMS §8 (source counts), `docs/README.md` and `docs/audits/README.md` (the index), the b27 batch title, `bundle.js` and `ui-fuzz.mjs` comments |
| Decisions | D83 (a material is the range of its products), D84 (two evidence levels) and D85 (the record tier) are written in GOALS.md as decided; each enters DECISIONS.md in the change that builds it |
| Faster checks | The build result is cached by content (`build/src/build-cache.js`, `.cache/build/`, keyed on the tables in memory, the build code, the runtime and the options; a private copy per hit; off in CI, in the audit's rebuild, the scale check and the reproducibility test, and with `H2C_NO_BUILD_CACHE=1`). Tests that look only for a compile or validate error build without estimates; the declared-variant test's four builds run in parallel; the import pipeline's tests moved to `npm run test:ingest`, which `verify` runs. Five tests pin the cache key and its entries |

**Gate.**

| | Before | After |
|---|---:|---:|
| `verify:fast`, after a change (empty cache) | about 168 s | 75 s |
| `verify:fast`, nothing the build reads changed | about 168 s | 29 s |
| Tests passing | 433 | 438 (274 in `npm test`, 164 in `test:ingest`; 5 new) |
| `npm run verify`, end to end | documented as about 24 min | 3 min 39 s, passing |
| `npm run build:diff` | | 0 differences |

`dist/db.json`, `reference.json` and the page are byte-identical with the cache off, on a cold run and on a hit.

**Found, not changed:** a build result shares two module constants (`db.meta.h2cBaseline`,
`db.meta.estimateModel.levels`), so a caller that edits one changes later builds in its process; the cache hands out
copies, but the build should copy them itself. `build/package.json`'s own `test` script still runs every file.

**Branching (owner, 2026-09-25).** V2 is not merged into `main` and is not tagged as a release: the owner is not
satisfied with the state V2 closed in. The re-center is how V2 gets finished, so it continues on the `v2` branch, one
commit per phase step; `main` stays at V1 until the re-centered V2 passes its phase 3 gate and the owner asks.

**Waiting on the owner:** the taxonomy decision in phase 5 (Bambu's product lines as products of their material, an
"other / unspecified" home per family).

## Phase 1: every product's own values and print recipe, by rule (2026-09-25)

`build/src/products.js` adds, beside each material's headline and deciding nothing yet:

- **`grades[].headline[key]`**: each product's own value per headline, chosen by rule from its own measurements, at
  one of two levels (D84 as decided): comparable, or as published where the source leaves the direction or the load
  unstated. A `headlines.csv` value row pins its product's value.
- **`grades[].print`**: each product's own recipe from its own profiles: the gate and window per axis, enclosure,
  hardened nozzle, drying, and the annealing its sheets state. Never a union across the material.
- **`materials[].summary[key]`**: the spread across the material's procurement products that are not declared
  variants: products, n comparable, range, quartiles, median, the typical product, and the as-published values and
  variants counted apart.

`aggregateGate` moved to `build/src/gates.js` and `cents` to `normalize/values.js`, unchanged, so a product and a
material share them. The contract (`schema/db.schema.json`) describes the three additions; the snapshot gains
`products.csv` and `summaries.csv`, and `npm run sql` gains `products_compiled` and `summaries_compiled`.

**Gate.**

| | Result |
|---|---|
| `npm run build:diff` | only `db.grades[].headline` (1,098), `db.grades[].print` (1,098) and `db.materials[].summary` (153): nothing that existed moved |
| The rule against the 477 hand picks | **all 477 agree** (471 the same measurement, 6 the same value): [rule-vs-hand-picks.md](rule-vs-hand-picks.md). The picks are redundant, which phase 4 acts on |
| Headlines the hand left empty that the rule fills on the representative grade | 122, listed in the same report (PLA's strength among them: a printed XY break strength of 56 MPa nobody selected) |
| Product values | 3,356 on 3,318 distinct measurements, against 2,166 measurements on representative grades before: density 843; modulus 254 comparable + 307 as published; strength 335 + 393; elongation 328 + 361; heat deflection 415 + 82; price 38 |
| PLA, stiffness | 27 comparable products, 0.95–2.95 GPa, median 2.27, none at 3 GPa; 46 as published, 1.44–4.78 GPa, 30 of them at 3 GPa or more; 11 variants apart. The report's first figures (0.95–3.4, 49) came from a looser query and are corrected there |
| Tests | 9 new (`test/products.test.js`), each a rule over every product; 283 pass in `npm test` |
| `verify:fast` / `verify` | 71 s cold / 3 min 1 s, passing |
| `db.json` / page | 20.1 → 20.8 MiB / 6.03 → 6.14 MiB |

Where the hand picks sat matters for phase 2: the report lists, per material, the share of its products at or below
the picked value. 87 picks sit at an extreme (0 % or 100 %) of their material; PA12-CF's stiffness, for one, was 8 GPa
against a median of 3.3 across its four comparable products.

Not built in this step, and why: a print summary per material (the engine will need the products' recipes, not a
summary of them; the table's print columns come in phase 3), and D83/D84 in DECISIONS.md (they are entered with the
phase 2 change that makes them decide).

## Phase 2: the engine answers all / some / none, including printability (2026-09-25)

`app/js/engine/products.js` gives a **product view**: the material with one product's values and its own print recipe.
`evaluateProducts` (`constraints.js`) judges every product on every requirement at once and rolls up: PASS when one
product passes, with share ALL or SOME; FAIL (NONE) when none passes and one fails; UNKNOWN when none could be judged;
untested products counted and never held against the material. The material's estimate stands in only where none of
its products publishes a comparable value. `runSelection` and `explainExclusions` do this whenever the context carries
`productsByMaterial`; `explainExclusions` also counts the products each requirement removes. `rankMaterials`
(`indices.js`) ranks by the median index over a material's passing products, computed product by product. Search finds
a material by its products' makers and names ("Polymaker", "Prusament"), in the page and in the fuzzer alike. D83 and
D84 are entered in DECISIONS.md, with D8 marked superseded in its refusal of a range and D2 and D37 amended.

**The page still judges materials on their headline**, as planned: phase 3 switches it, with the interface that can
show a SOME row. `build/snapshot/templates-products.csv` holds the templates judged by products.

**Gate: the decision diff**, six templates, Include uncertain, materials judged by their headline against by products:

| Template | Headline: PASS / FAIL / UNKNOWN | Products: PASS / FAIL / UNKNOWN | FAIL→PASS | UNKNOWN→PASS | UNKNOWN→FAIL | SOME |
|---|---|---|---:|---:|---:|---:|
| Outdoor structural part | 17 / 88 / 48 | 18 / 96 / 39 | 1 | 0 | 9 | 8 |
| Indoor prototype | 20 / 35 / 98 | 20 / 35 / 98 | 0 | 0 | 0 | 0 |
| Lightweight structure | 23 / 84 / 46 | 27 / 93 / 33 | 4 | 0 | 13 | 11 |
| Warm environment | 23 / 57 / 73 | 28 / 63 / 62 | 1 | 4 | 7 | 13 |
| High-stiffness fixture | 12 / 87 / 54 | 18 / 85 / 50 | 6 | 0 | 4 | 10 |
| Flexible component | 8 / 91 / 54 | 13 / 93 / 47 | 1 | 4 | 3 | 1 |
| **Total** | 103 / 442 / 373 | 124 / 465 / 329 | **13** | **8** | **36** | 43 |

No PASS was lost, per-product print gates included. The 13 FAIL→PASS match the phase 1 estimate of about 14. Examples:
- PA6-CF, PET-CF, PAHT-CF, ASA-CF, PETG-CF and PA6-GF pass the stiffness fixture through a product the representative
  grade was not.
- PLA passes the warm-environment template through 5 of its 63 judged products (135 untested), and PETG through 1 of 27.
- The 36 UNKNOWN→FAIL are materials whose representative grade was silent but whose products that publish all fail:
  PLA Silk's 10 judged products for heat, PP's 5 for stiffness.

UNKNOWN among the materials not ruled out fell from 78 % (373 of 476) to 73 % (329 of 453).

| | Result |
|---|---|
| Tests | 10 new engine tests (`test/selection-products.test.js`: joint judgement, all / some / none, D84 levels, print gates per product, the estimate's reach, a material without products, why excluded, ranking), 1 search test; 293 pass in `npm test`, 164 in `test:ingest` |
| `verify` | 3 min 41 s, passing; the page's 63 views and 300 fuzzed scenarios unchanged |

Not built in this step: `rankBy` and `evidence` in the scenario and its link, which arrive with the controls that set
them (phase 3), so no saved scenario changes shape before the page can use it.
