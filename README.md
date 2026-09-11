# H2C FDM Material Selection Tool

A self-contained browser application for selecting FDM filaments for a fully configured
Bambu Lab H2C. It compiles a frozen research database into a single HTML file that runs
offline, from a local file, a shared drive or static hosting, with no backend.

The tool is **decision support**: screening, comparison and evidence navigation. It is not a
source of certified design allowables, not a substitute for exact-grade TDS and SDS review,
and not a guarantee of H2C compatibility for any third-party formulation.

## Quick start

```bash
npm install --prefix build     # once
npm run build                  # -> dist/H2C_Material_Selector_<snapshot>.html
npm test                       # engine and parser tests
npm run validate               # validate only, no bundle
```

Open `dist/H2C_Material_Selector_<snapshot>.html` in any current browser.

## What is in the repository

| Path | What it is |
|---|---|
| `H2C_FDM_Material_Database.xlsx` | The frozen authoring source of truth. Never written by the build. |
| `generic_materials.xlsx` | Generic engineering materials, used only as an Ashby baseline layer. |
| `build/src/` | Extract, normalize, validate, compile and bundle stages. |
| `build/mappings/` | Hand-maintained vocabulary maps, reviewed like code. |
| `build/reports/` | The validation report, regenerated on every build. |
| `app/js/engine/` | The selection engine. Pure, no DOM, unit-tested. |
| `app/js/ui/` | Rendering. Never imported by the engine. |
| `test/` | Engine and parser tests. |
| `dist/` | Build output. Not committed; run `npm run build`. |

Supporting documents: `H2C_FDM_Material_Selection_Tool_Architecture_Recomendation.md` is the
product and architecture brief, `Bambu_H2C_Consolidated_Filament_Material_Master_List.md` is
the canonical scope, and `H2C_Database_Gaps_and_Conflicts_Priority.md` prioritises the known
research gaps.

## Pipeline

```
H2C_FDM_Material_Database.xlsx   (frozen)
      |  extract    SheetJS -> raw rows
      |  normalize  free text -> canonical values, every one tagged with its origin
      |  validate   schema, references, citations, engineering consistency
      v
   db.json + reference.json
      |  bundle     gzip the data, inline the libraries
      v
   one self-contained HTML file
```

The workbook is authoring format; JSON is the compiled runtime representation. The build is
deterministic and fails on any validation error.

## The rules the code enforces

These come from the workbook's own Method sheet and the architecture brief. They are not
stylistic preferences, and changing them changes what the tool asserts.

1. **Headline values are verified, never recomputed.** The Materials sheet already cites the
   MeasurementID behind each headline. The build checks that the number equals its citation.
   All 388 reconcile; a mismatch fails the build.
2. **Missing data is information.** Not published, not comparable, not applicable and
   quarantined are four different states and stay distinct. Nothing is ever zero.
3. **Four constraint states.** PASS, FAIL, UNKNOWN and INDETERMINATE. A range that straddles
   a threshold is INDETERMINATE, not a lucky PASS.
4. **Hard constraints decide eligibility; preferences only rank.** A soft criterion never
   removes a candidate.
5. **XY and Z never merge**, and an unknown direction is not XY.
6. **Impact in J/m is never converted to kJ/m²** without specimen geometry.
7. **Quarantined measurements stay out of every numeric summary.**
8. **A load that was never stated is never assumed.** 24 of 66 HDT headlines cite a source
   that names the standard but not the load; they carry `loadStated: false`.
9. **Evidence outranks silence.** A material whose profiles demonstrably exceed the H2C
   envelope reports as exceeding even when another profile publishes nothing.
10. **Generic reference materials are a drawing layer**, never candidates, never in counts,
    Pareto fronts, search, exports or the shortlist.
11. **A family estimate may rule a material out, never confirm it in.** See below.

## Three kinds of number

The interface shows them differently on purpose, and only the first is evidence.

| | What it is | How it looks |
|---|---|---|
| **Measured** | A verified headline value, traceable to one measurement, grade and source | plain |
| **Related** | A real measurement of the same property that was never promoted to a headline, because the source stated no direction or a different endpoint | `46*` |
| **Estimated** | The span of the material's closest measured relatives. Inference, not evidence | `~2.8–15.3†` |

### Why estimates exist

In Explore mode a material with no mechanical data answered UNKNOWN to every mechanical criterion,
so PLA Lite survived a search for "elongation at least 100%" and sat among the elastomers. Knowing
that all fourteen measured unreinforced PLA grades fall between 2.8 and 15.3% is enough to rule it
out, without pretending to know its actual value.

The rule that keeps this honest is asymmetric: **a failing estimate fails; a passing one still
reports UNKNOWN.** A bound drawn from a material's relatives can show it cannot meet a requirement.
It can never certify that it does.

Estimates are built from compiled headline values only, so every contributing number is already
verified, measured in XY where direction applies, and drawn from a single grade. Peers are pooled
by the most specific tier that has at least two independent observations: family and filler class,
then family, then behaviour and filler class. Elastomers, support materials and rigid
thermoplastics are never pooled with each other. Peers sharing one commercial formulation key count
once, because the Method sheet calls those repeated commercial evidence rather than independent
tests. Every estimate carries its basis, its peer count and the peers themselves, and Strict mode
never sees them.

## H2C hardware baseline

350 °C nozzle, 120 °C bed, 65 °C active chamber, from the Method sheet. The build parses each
profile's published requirement and compares it against this envelope.

## Validation report

`build/reports/validation-report.md` is a deliverable, not console noise. It records what the
compiled database cannot support, so the interface can say so rather than implying a certainty
it does not have.
