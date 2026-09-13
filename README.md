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
npm run build                  # -> dist/H2C_Material_Selector_<snapshot>.html
npm test                       # 96 engine, parser, search, scenario, template and database tests
npm run validate               # validate only, no bundle
```

Open the file in `dist/` in any current browser. Nothing else is required.

## Publishing

`.github/workflows/pages.yml` rebuilds the selector from the workbooks on every push to `main` and
publishes it to GitHub Pages. The distributable HTML is **not committed**, so the published page
cannot drift from the source of truth, and a database that fails validation stops in CI and never
reaches the site.

The page is served at the site root, so the address opens straight into the tool. The
snapshot-stamped filename and the validation report are published alongside it:

| Address | What |
|---|---|
| [`/h2c-materials/`](https://pdynamics.ca/h2c-materials/) | The tool |
| `/h2c-materials/H2C_Material_Selector_2026-09-13.html` | The same build, pinned to its database snapshot |
| `/h2c-materials/validation-report.md` | What the compiled database cannot support |

## Documentation

| Read this | For |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | The three layers, the module map, where to add things |
| [docs/PIPELINE.md](docs/PIPELINE.md) | What each build stage does, and what it refuses to do |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | The entities, the compiled shape, the three kinds of number |
| [docs/INTERFACE.md](docs/INTERFACE.md) | The workflow, the lenses, the words, the visual vocabulary |
| [docs/DECISIONS.md](docs/DECISIONS.md) | The non-obvious decisions, and the bugs that forced them |
| [docs/audits/](docs/audits/) | Every audit of the tool and the database, each with its report and what was done about it |
| [docs/background/](docs/background/) | The research inputs this was built from |

## Layout

```
data/H2C_FDM_Material_Database.xlsx     the frozen authoring source of truth; never written by the build
data/Generic_Materials_Reference.xlsx   generic engineering materials, an Ashby baseline only

build/src/                              extract -> normalize -> compile -> validate -> bundle
build/mappings/                         hand-maintained vocabulary maps, reviewed like code
build/reports/                          the validation report, regenerated every build

app/js/engine/                          the selection logic. Pure: no DOM, never imports from ui/
app/js/ui/                              rendering and interaction
app/js/ui/labels.js                     the one vocabulary: what every property and criterion is called
app/js/main.js                          the only place that holds state

test/                                   engine, scenario, template, parser and compiled-database tests
scripts/ensure-db.mjs                   compiles the database first if a test run needs it
.github/workflows/pages.yml             build, test, publish
dist/                                   build output, not committed

docs/                                   how it works and why
docs/background/                        the research inputs it was built from
docs/audits/<date>-<subject>/           one folder per audit: the report as delivered, and what was done
```

## What the code enforces

These come from the workbook's own Method sheet, the architecture brief and the audits. They are not stylistic
preferences: changing one changes what the tool asserts.

1. **Headline values are verified, never recomputed.** The workbook already cites the measurement
   behind each headline; the build checks the number matches. All 369 reconcile, and a mismatch
   fails the build.
2. **Missing data is information.** Not published, not comparable, not applicable and quarantined
   are four different answers and stay distinct. Nothing becomes zero.
3. **Four constraint states.** A range straddling a threshold is INDETERMINATE, not a lucky PASS.
4. **Hard constraints decide eligibility; a preference never removes a candidate.** It is reported
   on each material as "tracked only". It does not reorder the list yet, and the interface does not
   claim it does.
5. **XY and Z never merge**, and an unstated direction is not XY.
6. **Impact in J/m is never converted to kJ/m²** without specimen geometry.
7. **Quarantined measurements stay out of every numeric summary.**
8. **A load that was never stated is never assumed.** 25 of 69 HDT headlines are in that position
   and say so.
9. **Evidence outranks silence.** A material whose profiles demonstrably exceed the printer's
   envelope reports as exceeding, even when another profile publishes nothing.
10. **Generic reference materials are a drawing layer**, never candidates.
11. **A family estimate may rule a material out, never confirm it in.**
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
17. **Nothing enters the workbook from a report.** Every value is re-read from its source and the
    source's SHA-256 recorded; a source that cannot be retrieved contributes nothing.

## Three kinds of number

Only the first is evidence. The interface renders them differently on purpose.

| | What it is | Looks like |
|---|---|---|
| **Measured** | A verified headline, traceable to one measurement, grade and source | `4.43` |
| **Related** | A real measurement of the same property, never promoted to a headline | `46*` |
| **Estimated** | The span of the material's closest measured relatives. Inference, not evidence | `~2.8–15.3†` |

Estimates exist because in Explore mode a material with no mechanical data answered UNKNOWN to every
mechanical criterion, so PLA Lite survived a search for "elongation at least 100%" and sat among the
elastomers. Knowing that all fourteen measured unreinforced PLA grades fall between 2.8 and 15.3% is
enough to rule it out, without pretending to know its value. (PLA Lite has since been measured, at
3.89%.) See
[docs/DATA-MODEL.md](docs/DATA-MODEL.md#three-kinds-of-number).

*Strict and Explore are the names used in the code and in these documents. On screen the control is
labelled "If a material has no data", and the two buttons read "Leave it out" and "Keep it, flagged",
because the words Strict and Explore told a first-time reader nothing about what they did.*

## H2C hardware baseline

350 °C nozzle, 120 °C bed, 65 °C active chamber, from the Method sheet. The build parses each
profile's published requirement and compares it against this envelope. All six materials the
database marks as out of scope trip that gate independently, on their own published requirements.
A chamber window that starts inside the envelope and ends above it, such as Bambu PPS-CF's 60–90 °C,
is reported as partly reachable rather than as a failure.

## The validation report

`build/reports/validation-report.md` is a deliverable, not console noise. It records what the
compiled database cannot support, so the interface can say so rather than implying a certainty it
does not have. It currently carries four standing warnings, each of which is a real limit of the
snapshot rather than a defect in the build.
