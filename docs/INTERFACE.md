# The interface

## The problem it is shaped around

Two readers share one screen: someone who wants a shortlist, and an engineer who wants the evidence
behind it. Progressive disclosure answers that.

This dataset adds a harder problem. It is sparse, and deliberately honest about being sparse.
Tensile strength exists for 52 of 102 materials, price for 40, and most process fields for almost
none. A conventional filter interface renders that as a tool that looks broken. **Making absence
legible and useful, rather than invisible, is the design problem.** Most of what follows is
downstream of it.

## The workflow

```
1 Set requirements  ›  2 Read the candidates  ›  3 Compare trade-offs  ›  4 Check the evidence
```

Named on the opening panel, because opening on 102 rows of everything gave no entry point.

The panel offers six application templates. A template **populates controls and then gets out of the
way**: every value it sets stays editable, and the header afterwards says which template was used.

Once a requirement is set, the panel gives way to a statement of what is being asked, as pills that
drop a criterion on click. The previous build simply removed the panel, so using the tool left a
bare table and no statement of the query.

## One candidate set, five lenses

Table, Ashby, Parallel, Coverage and Compare all render the same filtered set. Switching lens never
changes membership. A material highlighted in one is highlighted in all.

| Lens | For |
|---|---|
| **Table** | Reading candidates and their headline numbers |
| **Ashby** | The trade space: two properties, constraint overlays, Pareto front, performance indices |
| **Parallel** | Several properties at once across a narrowed set |
| **Coverage** | What the database knows and does not |
| **Compare** | Two to six materials side by side, with their measurement conditions |

## The filter rail

Groups are ordered by how often a criterion actually decides something: mechanical and thermal lead,
compatibility sits last. For this database compatibility mostly cannot discriminate, and putting it
first made the whole rail look like it did nothing.

**Every numeric control states its own data availability before it is touched.**

```
HDT at 0.45 MPa                          66 of 102 have data
[>=] [ 100 ] °C
     24 of those 66 cite a source that states the standard but not the load
```

This single pattern does most of the work. It says what a criterion can and cannot decide before
anyone relies on it, and it turns the build's audit findings into everyday guidance.

**A field that cannot discriminate is not built as a filter.** H2C routing and AMS read "verify the
exact grade" on 133 of 156 profiles, and printing difficulty is unpublished on all 156. They appear
in a material's Printing tab as evidence. A filter that passes everything teaches the reader to
trust something that checked nothing.

Environment criteria split by what the data can answer. Six categories carry reducible verdicts and
are offered as filters. Six others have records but no reducible verdict among them, UV and outdoor
being the sharpest at six records and zero verdicts; offering those as constraints would return
UNKNOWN for all 102 materials while looking like a working filter.

## Strict and Explore

The most consequential control, so it sits in the top bar.

- **Strict** — a criterion that cannot be evaluated holds the material out. Measured evidence only;
  family estimates are not consulted at all.
- **Explore** — materials with unresolved criteria stay visible and flagged, and family estimates
  may rule out ones that clearly cannot qualify.

Switching resets which verdicts the table shows, so the change is visible in the results rather than
only in a label. `defaultShowStates` in `main.js` is the single source of that, because when the
mode buttons owned it independently a shared Explore link rendered as Strict.

The **Estimates** toggle appears in Explore only, and reports how many materials it ruled out.

## The four states

One vocabulary, used identically in table cells, chart points, explain panels, compare rows and
exports. Always icon plus text, never colour alone.

| State | Mark | Meaning |
|---|---|---|
| PASS | check | Evidence satisfies the criterion |
| FAIL | cross | Evidence violates it |
| UNKNOWN | question | No comparable evidence |
| INDETERMINATE | half circle | A range straddles the threshold |

The status bar chips are **buttons**: they choose which verdicts the table shows.

## Reading a number

| Looks like | Is |
|---|---|
| `4.43` | A measured, verified headline |
| `46*` | A real measurement never promoted to a headline. Hover for why |
| `~2.8–15.3†` | An estimate from relatives. Rules out, never rules in |
| `—` | Not published. Hover for which kind of absence |

Every measured value carries a small dot: click it to open the measurement, with its direction,
specimen, conditioning, standard, grade and source. That is one click from anywhere a number
appears.

## The Ashby lens

- The axis picker reports the **point count for the chosen pair before drawing**. Some pairs are
  genuinely thin, and below ten points the count becomes a warning.
- **Points**: Headline draws one point per material. Measurements draws one per grade per compatible
  pair, so PA6-CF appears twice, at 4.43 GPa in XY and 2.17 in Z. Anisotropy becomes visible instead
  of averaged away.
- **Comparability**: Strict admits only measurements matching the axis definition. Broad admits
  looser ones, draws them hollow, and names in a banner exactly what it mixed.
- **Encoding**: colour is polymer family, marker shape is filler class, outline carries evidence
  status. There are 19 families, past what a categorical palette can separate, so the eight largest
  get their own hue and the rest group as Other.
- **Performance indices** ship as named design cases with their formula, log-log slope and caveats.
  On log-log axes an index of the form `P^n / rho` is a straight line of slope `1/n`. Two caveats
  ride on every card: the strength indices are derived for the elastic limit while this database
  mostly records an unspecified endpoint, and index theory assumes isotropy while FDM parts are not
  isotropic.
- Drag is **zoom**, not lasso. With lasso as the default every stray drag became a candidate subset,
  which read as the chart filtering itself at random. Lasso stays one click away in the mode bar.

Parallel coordinates is drawn in SVG rather than by the plotting library, whose version needs WebGL
and fails outright on plenty of real machines.

## Deliberate omissions

- **No radar charts of raw engineering properties.** Mixing GPa, MPa, °C and CAD/kg on one radial
  axis is meaningless. Aligned bars instead.
- **No universal material score.** Scores are scenario preferences applied after hard constraints,
  never a quality ranking.
- **No imputation presented as data.** Estimates exist, are labelled, and can only exclude.

## Accessibility and output

Full keyboard path through filter, result, pin and compare. Colour never the sole carrier of
meaning. A print stylesheet produces a clean comparison summary with the scenario header intact.
Client-side CSV export carries the four states, which criteria held each candidate out, and any
estimates in their own column.

## State in the URL

The scenario lives in the URL hash: constraints, policy, shortlist, plot settings, current lens, the
open material and whether estimates are on. A link reopens the same question.
