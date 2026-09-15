# H2C FDM Material Selection Tool

A self-contained browser application for choosing FDM filaments for a fully configured Bambu Lab
H2C. It compiles a frozen research database into a single HTML file that runs offline, from a local
file, a shared drive or static hosting, with no backend.

**Live: [pdynamics.ca/h2c-materials](https://pdynamics.ca/h2c-materials/)**

The tool is **decision support**: screening, comparison and evidence navigation. It is not a source
of certified design allowables, not a substitute for reading the exact grade's technical and safety
data sheets, and not a guarantee that any third-party filament runs on an H2C.

---

## Quick start

```bash
npm install --prefix build     # once
npm run hooks                  # once per clone: the pre-commit data check
npm run build                  # -> dist/H2C_Material_Selector_<snapshot>.html and dist/manifest.json
npm run verify:fast            # while you work: format, schema, lint, generated docs, build and tests (about 25 s)
npm run verify                 # before a commit: verify:fast, audit, review snapshot, interface views, 300 rendered scenarios
npm run build:diff             # what a change did to the compiled database, against HEAD
npm run ui:fuzz:full           # 2,000 random scenarios through the built page, compared with the engine (nightly in CI)
npm run data:check             # the schema gate alone, under a second
npm run trace -- PETG          # any headline back to its measurement, grade and source
npm run data:new-material -- --name PA11 --polymer PA11   # a material and its first grade, and what it still needs
npm run data:export-xlsx       # read-only review workbook in dist/review/
```

Changing data? Read [AGENTS.md](AGENTS.md) first.

Open the file in `dist/` in any current browser. Nothing else is required.

## Publishing

`.github/workflows/pages.yml` runs `npm run verify` and rebuilds the selector from `data/tables` on every
push to `main`, then publishes it to GitHub Pages. `verify.yml` runs the same gate on every branch. The distributable HTML is **not committed**, so the published page
cannot drift from the source of truth, and a database that fails validation stops in CI and never
reaches the site.

The page is served at the site root, so the address opens straight into the tool. The
snapshot-stamped filename and the validation report are published alongside it:

| Address | What |
|---|---|
| [`/h2c-materials/`](https://pdynamics.ca/h2c-materials/) | The tool |
| `/h2c-materials/H2C_Material_Selector_2026-09-13.html` | The same build, pinned to its database snapshot |
| `/h2c-materials/validation-report.md` | What the compiled database cannot support |
| `/h2c-materials/manifest.json` | The commit, input hashes and output hashes the page was built from |

## Documentation

| Read this | For |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | The three layers, the module map, where to add things |
| [docs/PIPELINE.md](docs/PIPELINE.md) | What each build stage does, and what it refuses to do |
| [AGENTS.md](AGENTS.md) | How to change data, for people and AI agents alike |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | The tables, the registry, the compiled shape, the three kinds of number |
| [docs/INTERFACE.md](docs/INTERFACE.md) | The workflow, the lenses, the words, the visual vocabulary |
| [docs/DECISIONS.md](docs/DECISIONS.md) | The non-obvious decisions, and the bugs that forced them |
| [docs/audits/](docs/audits/) | Every audit of the tool and the database, each with its report and what was done about it |
| [docs/background/](docs/background/) | The research inputs this was built from |

## Layout

```
data/tables/                            the source of truth: one CSV per table, canonical form
data/tables/properties.csv              the property registry; headline_definitions.csv the headlines
data/manifest.json                      row count and SHA-256 of every table
schema/tables/  schema/vocab/           the declared contract for every table, and its vocabularies
schema/db.schema.json                   the contract for the compiled database

build/src/                              check -> load -> normalize -> compile -> validate -> contract -> bundle
build/src/coverage-rules.js             one definition of what counts as a material's own data
build/mappings/estimate-model.json      the estimate model's conversions, physical limits and fitting judgements, reviewed like code
build/reports/                          the validation report, regenerated every build

app/js/engine/                          the selection logic. Pure: no DOM, never imports from ui/
app/js/ui/                              rendering and interaction
app/js/ui/registry.js                   labels, filters, axes, columns and export, built from the registry
app/js/ui/labels.js                     the one vocabulary: what every criterion and verdict is called
app/js/main.js                          the only place that holds state

test/                                   engine, data gate, registry, contract, scale and database tests
scripts/data/                           fmt, check, lint and build-finding review, new, retire, new-id, diff, the edit API, review workbook, scale data
scripts/audit/                          source completeness: every PDF source re-read for values not in the tables
scripts/snapshot.mjs, ui-probe.mjs      the committed review snapshot and interface views (build/snapshot/)
scripts/ui-fuzz.mjs                     random scenarios through the built page, checked against the engine
scripts/trace.mjs                       a headline back to its source
scripts/audit-data.mjs                  record/family inventory and source-to-HTML checks
scripts/migrate/                        the 2026-09-14 conversion (m01-m09) and the source corrections that followed (m10-m22, m24-m26)
.githooks/pre-commit                    format, schema and no-deletion check on data commits
.github/workflows/                      verify on every push; build, verify, publish on main
dist/                                   build output, not committed

docs/                                   how it works and why
docs/background/                        the research inputs it was built from
docs/audits/<date>-<subject>/           one folder per audit: the report as delivered, and what was done
```

## What the code enforces

These come from the database's own Method table, the architecture brief and the audits. They are not stylistic
preferences: changing one changes what the tool asserts.

1. **A headline is a selected measurement, never a copied number.** `headlines.csv` names the measurement
   behind each headline and the value is read from it; the build checks the selection, and a bad one
   fails the build.
2. **Missing data is information.** Not published, not comparable, not applicable and quarantined
   are four different answers and stay distinct. Nothing becomes zero.
3. **Four constraint states.** A published range straddling a threshold is INDETERMINATE, not a lucky PASS. A
   published mean ± spread is judged on its mean and says when the threshold lies within the spread (D54).
4. **Hard constraints decide eligibility; a preference never removes a candidate.** It is reported
   on each material as "tracked only". It does not reorder the list yet, and the interface does not
   claim it does.
5. **XY and Z never merge**, and an unstated direction is not XY.
6. **Impact in J/m is never converted to kJ/m²** without specimen geometry.
7. **Quarantined measurements stay out of every numeric summary**, and a value physics rules out is kept, flagged
   "physically implausible", and backs no headline, estimate or bound (D55).
8. **A load that was never stated is never assumed.** An HDT headline whose source names no load says so,
   and the build lists every one (HDT-LOAD-UNSTATED).
9. **Evidence outranks silence.** A material whose profiles demonstrably exceed the printer's
   envelope reports as exceeding, even when another profile publishes nothing.
10. **Generic reference materials are a drawing layer**, never candidates.
11. **An estimate never passes a material, and screens only where a back-test shows it screens reliably.**
    Every build hides each measured headline as far as an evidence class requires and checks the calibrated
    ranges would have held (D48). In Explore it may screen a material out when the range its class may screen
    on wholly fails, never when the material's own printed measurement bounds the headline and meets the requirement.
12. **The familiar baseline is a reference, never a candidate.** PLA drawn beside the results is
    excluded from every count, the Pareto front and the shortlist, exactly like the steel envelopes.
13. **No sampled offer is not the same as unavailable.** Three Canadian retailers on one day cannot
    prove a material cannot be bought, so the availability criterion reports UNKNOWN rather than
    FAIL when nobody listed it.
14. **One name per thing.** Every property and every criterion is named by `app/js/ui/labels.js`,
    so no screen can print an internal key while the screen beside it reads plainly.
15. **A chamber answered in words stays words.** "Not required", "recommended" and a data sheet's "-"
    are manufacturer evidence and never become a temperature. A chamber window the H2C only partly
    reaches is partial, never within.
16. **An estimated chamber band decides nothing.** The research's bands are shown, marked, only where
    no source says anything better, and they can neither clear nor fail a material.
17. **Nothing enters the data from a report.** Every value is re-read from its source and the
    source's SHA-256 recorded; a source that cannot be retrieved contributes nothing.
18. **Coverage is terminal, but it must be true.** A coverage row cannot say `Gap` beside the
    material's own data or claim evidence that belongs only to another material. Family citations
    may remain as context in use, durability and safety notes; they are not grade evidence.
19. **A headline describes a dry, as-printed, printed part.** A moulded bar, a film, a filament strand, a conditioned
    value or an annealed value beside its as-printed twin never becomes one, and none of them bounds one (D55, D56).
20. **A compound does not speak for its polymer.** A product whose density or stiffness no unfilled grade can reach is
    declared a variant, or filed as its own material, and says so (D57).

## Three kinds of number

Only the first is evidence. The interface renders them differently on purpose.

| | What it is | Looks like |
|---|---|---|
| **Measured** | A verified headline, traceable to one measurement, grade and source | `4.43` |
| **Related** | A real measurement of the same property, never promoted to a headline | `46*` |
| **Estimated** | The likely (80%) range of a calibrated model of every observation. Inference, not evidence | `~71.3–92.5†` |

Estimates exist because in Explore a material with no mechanical data answered UNKNOWN to every
mechanical criterion, so PLA Lite sat among the elastomers in a search for "elongation at least
100%". The first estimate model fixed that by pooling whole families and treating a sample's extremes
as a bound, which was wrong in its own way; the second stopped estimates deciding anything; the third
used only like-for-like evidence and gave ranges too wide to use, such as PA-CF strength 38–204 MPa.
The current model fits one calibrated Gaussian model per property to every observation in the
database, each converted to the headline (a break strength, a flexural modulus, a Z value, a resin
data sheet), with polymer, reinforcement and melting-point structure shared across a family. PA-CF
strength (its product, CarbonX CF PA12, now recorded only under PA12-CF) reads 70–92 MPa, PA66-CF sits above PA66, and hidden measured values fall inside the
shown 80% range 79–81% of the time. Every in-scope headline has a value, an estimate or a reason it
does not apply. An estimate never passes a material, and screens one out only when its 95% range
clearly fails and the material's own data does not contradict it. See
[the data model](docs/DATA-MODEL.md#estimates) and DECISIONS D43.

*Strict and Explore are the names used in the code and in these documents. On screen the control is
labelled "If a material has no data", and the two buttons read "Leave it out" and "Keep it, flagged",
because the words Strict and Explore told a first-time reader nothing about what they did.*

## H2C hardware baseline

350 °C nozzle, 120 °C bed, 65 °C active chamber, from the Method table. The build parses each
profile's published requirement and compares it against this envelope. All six materials the
database marks as out of scope trip that gate independently, on their own published requirements.
A chamber window that starts inside the envelope and ends above it, such as Bambu PPS-CF's 60–90 °C,
is reported as partly reachable rather than as a failure.

## The validation report

`build/reports/validation-report.md` is a deliverable, not console noise. It records what the
compiled database cannot support, so the interface can say so rather than implying a certainty it
does not have. Its warnings name their records: unstated heat loads, outlying headlines, imprecise estimates,
family-order breaks and materials without measurements. Each record is fixed or accepted with a reason in
`data/review/accepted-findings.csv`, and `verify` fails on one that is neither (D57).
