# The interface

## The problem it is shaped around

Two readers share one screen: someone who wants a shortlist, and an engineer who wants the evidence
behind it. Progressive disclosure answers that.

This dataset adds a harder problem. It is sparse, and deliberately honest about being sparse.
Tensile strength exists for 57 of 102 materials, price for 40, and most process fields for almost
none. A conventional filter interface renders that as a tool that looks broken. **Making absence
legible and useful, rather than invisible, is the design problem.** Most of what follows is
downstream of it.

## The workflow

```
1 Set requirements  ›  2 Read the candidates  ›  3 Compare trade-offs  ›  4 Check the evidence
```

Named on the opening panel, because opening on 102 rows of everything gave no entry point.

The panel offers six application templates. A template **populates controls and then gets out of the
way**: every value it sets stays editable, and the header afterwards says which template was used and
whether it has since been changed.

A template is a starting screen, not a recommendation. Its description names what it tests, and the
results header repeats, beside the count, what it **does not check**: UV for the outdoor part,
spring-back for the flexible one, printing without active chamber heat for the warm one. Every
template is for a part you build, so every one screens out support and interface materials.

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
| **Compare** | Up to six shortlisted materials side by side, or one against a familiar baseline, with their measurement conditions and each one's current result |

A sixth tab, **Why excluded**, sits beside them and is not a lens: it explains what is *not* in the
candidate set, ranked by how many materials each criterion costs. It is a tab rather than a hidden
mode because it used to be reachable only through a button that left every tab rendering unselected,
with no way back except guessing.

The table offers two column sets. **Properties** answers which material is right; **Printing**
answers whether the machine can run it and what to set, with nozzle, bed and chamber windows and
what else the job needs. The second existed only in the drawer before, one tab deep.

The Chamber column has more kinds of answer than the other two, and shows each as what it is:

| Cell | Means |
|---|---|
| `45–60` | A published window |
| `not required` | A source says no heated chamber is needed, in the chamber row or by saying an enclosure is not necessary |
| `recommended` | A source recommends a heated chamber and gives no temperature |
| `no setpoint` | The data sheet prints "-". Not zero, and not "not required" |
| `~80–120†` | The 2026-09-13 research's estimated band, shown while estimates are on. Not a setting, and it changes no result |
| `—` | Nothing published |

A word never becomes a number, and a band never sits beside a published window. In the drawer the
same answers appear under "Can the H2C print it?": a window the chamber only partly reaches reads
**Partly** and says which part is reachable, a statement in words is quoted, and a band gets its own
card with the basis and caution the research wrote.

## The filter rail

Groups are ordered by how often a criterion actually decides something: mechanical and thermal lead,
compatibility sits last. For this database compatibility mostly cannot discriminate, and putting it
first made the whole rail look like it did nothing.

**Every numeric control states its own data availability before it is touched.**

```
HDT at 0.45 MPa                          69 of 102 have data
[>=] [ 100 ] °C
     25 of those 69 cite a source that states the standard but not the load
```

This single pattern does most of the work. It says what a criterion can and cannot decide before
anyone relies on it, and it turns the build's audit findings into everyday guidance.

**A field that cannot discriminate is not built as a filter.** H2C routing and AMS read "verify the
exact grade" on 140 of 167 profiles, and printing difficulty is unpublished on all 167. They appear
in a material's Printing tab as evidence. A filter that passes everything teaches the reader to
trust something that checked nothing.

The rail is rebuilt on every change, and keeps what the user was doing: which groups are open,
which control has focus, and an operator chosen before a number was typed. A number the property
cannot take, such as a negative density, is refused inline and the applied requirement is left alone.

The nozzle question is asked as the hardware you lack, **"I don't have a hardened nozzle"**. Owning
one removes nothing, so there is nothing to ask. The criterion fails materials a source says need a
hardened nozzle, holds fibre-filled materials with no guidance as unresolved, and passes the rest
with a reason that says no requirement was recorded, which is not proof of being safe for brass.

The chamber check counts its two kinds of answer apart: how many materials publish a chamber
temperature, how many more say no heated chamber is needed, and, as a caveat, how many publish a
window the H2C only partly reaches, which stay unresolved rather than passing.

**In the H2C research scope** is what the pinned checkbox says, because that is all it reads. It
used to say "Printable on an H2C", a promise about temperatures and feed paths it never tested.

Environment criteria split by what the data can answer. Six categories carry reducible verdicts and
are offered as filters. Six others have records but no reducible verdict among them, UV and outdoor
being the sharpest at seven records and zero verdicts; offering those as constraints would return
UNKNOWN for all 102 materials while looking like a working filter. Among the six that are offered,
only an unqualified record passes: "limited resistance" is unresolved, never a PASS.

## What to do with missing data

The most consequential control, so it sits in the top bar under its own label, "If a material has
no data". The two names in the code and in these documents are Strict and Explore; the buttons say
what each one does, because the words themselves told a first-time reader nothing.

- **Leave it out** (Strict) — a criterion that cannot be evaluated holds the material out. Measured
  evidence only; family estimates are not consulted at all. The material's result is still UNKNOWN,
  not FAIL: the policy decides eligibility, and the verdict keeps describing the evidence, so the
  FAIL count only ever counts materials that failed something.
- **Keep it, flagged** (Explore) — materials with unresolved criteria stay visible and flagged, and
  family estimates may rule out ones that clearly cannot qualify.

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

The status bar chips are **buttons**: they choose which verdicts the table shows. The last one
switched on stays on, and says so.

Before any requirement is set nothing has been tested, so rows read **not tested** and the chips
stand down. A green PASS on a blank screen asserted a test that never ran.

## Reading a number

| Looks like | Is |
|---|---|
| `4.43` | A measured, verified headline |
| `46*` | A real measurement never promoted to a headline. Hover for why |
| `~2.8–15.3†` | An estimate from relatives. Rules out, never rules in |
| `80?` | A heat value whose source states the standard but not the load. It cannot pass a heat requirement outright |
| `—` | Not published. Hover for which kind of absence |

Every measured value carries a small dot, a real button reachable by keyboard: it opens the
measurement with its direction, specimen, conditioning, standard, post-processing, test temperature,
print parameters, notes, grade and source, and the source's original is a link. The dot works in
the table, the Overview and Compare. It opens the Evidence tab, scrolls that
measurement into view and marks it, because PA6-CF has 21 and "one click to the evidence" was
otherwise one click plus a hunt.

## Search

Matching is by word, not by substring: a query term has to begin a word of the material's name,
family, full name, abbreviation, base polymer, modifier or one of its grade identifiers. "pa6"
finds PA6-CF, "cf" finds every carbon-filled grade, "support" finds the support materials through
their family. Slashes separate, so "Support for PLA/PETG" answers to either name.

A substring test would be simpler and is wrong in a way that is hard to see: "PLA" sits inside
"thermoplastic", so searching for the most common filament there is returned every TPU and TPE in
the database, looking for all the world like a deliberate classification.

Search runs over the whole database, never only over what survived the filters. Hits the
requirements removed are listed separately, each with the criterion that removed it. A search that
matches nothing says so and offers **Clear the search**; brand and product names are not indexed,
and the empty screen says that too.

## Words

Property names come from one module, `app/js/ui/labels.js`. The plain name leads and the technical
name is the tooltip: "Stiffness", not "Tensile modulus XY". Constraints are described by one
function, used by the requirement pills, the explain panel, the per-candidate why list, the
excluded-search group and the CSV export, so the panel can never print `hdt045 >= 100` while the
pill beside it says "Heat resistance at least 100 °C".

Environment category names are authored in `build/mappings/environment-topics.json` and compiled
into the snapshot, in a heading form ("Acid resistance") and a sentence form ("acids"). The engine
and the interface both read them from there, which is why a category name cannot drift between the
two, and why nothing builds a name by appending "resistance" to an internal key.

## Buying it

The price cell links to the best sampled offer: in stock first, then the observation behind the
headline, then whatever has a price. The Price tab lists every observation with retailer, pack
size, stock and the date it was seen. An optional filter shows only materials a sampled retailer
listed, and optionally only those in stock.

A material no sampled retailer listed is reported UNKNOWN, not FAIL. Three Canadian retailers on a
single day is not evidence that something cannot be bought.

## The Ashby lens

The controls sit in three tiers, in the order a reader uses them. The previous layout gave four
option cards equal weight in a row that wrapped, left two identical "Scale" labels floating between
the axis pickers, and put the index slider below the reading notes, far from the menu that opened
it; a first-time reader could not tell what belonged to what.

```
Vertical axis   [Stiffness (70 measured) ▾] [Linear|Log]   ⇄ Swap   Horizontal axis [Density ▾] [Linear|Log]
─────────────────────────────────────────────────────────────────────────────────────────────────
POINTS                         COMPARE WITH                    DESIGN GUIDE LINE
[One dot per material ▾]       [No familiar filament ▾]        [None ▾]
☐ Also draw the 25 estimated   ☐ Steel, aluminium and wood
─────────────────────────────────────────────────────────────────────────────────────────────────
warnings and banners · the chart · the guide-line card · reading this chart
```

- **What is plotted**: each axis carries its own scale toggle, and Swap exchanges the axes with
  their scales.
- **How it is drawn**: three labelled groups, each with one line of help for the current choice.
  A control that does not apply is disabled with its reason, never replaced by a sentence, so the
  panel keeps its shape as settings change.
- **The guide-line card** sits directly under the chart it moves. When the line cannot be drawn it
  says why and offers the fix as a button: switch both scales to Log, or set Density across and the
  index's property up. It closes with ×.
- The lens is rebuilt on every change, and keeps keyboard focus on the control that was used.

- The axis picker reports the **point count for the chosen pair before drawing**. Some pairs are
  genuinely thin, and below ten points the count becomes a warning.
- **Points** is one ordered choice of how much evidence to draw, replacing two switches that
  overlapped. *One dot per material* uses the headline. *Every measurement* draws one point per
  grade per compatible pair, so PA6-CF appears twice, at 4.43 GPa in XY and 2.17 in Z, and
  anisotropy becomes visible instead of averaged away. *Every measurement, mixed conditions* also
  admits looser matches, draws them hollow, and names in a banner exactly what it mixed.

  At measurement level a dot is **a pair of measurements of one grade, not a material**, and the
  chart says so before anything else. The two values were recorded under compatible conditions, not
  necessarily on the same specimen, so the chart does not call a dot a test. The dots belonging to one material are joined by a faint line, so a cluster reads as one
  thing measured repeatedly rather than as several materials. The name sits on the leftmost dot of
  each material; grade and direction are on hover. The width of a cluster is the honest answer to
  "how much should I trust the headline number".

  Hollow means a condition was relaxed, never merely that something went unstated. A source that
  does not name its specimen form is the ordinary case, and on an axis with no direction
  requirement it is not a mismatch with anything, so it stays solid and says so on hover. A warning
  that fires when nothing is wrong teaches the reader to ignore the one that matters.

- **Also draw the estimated materials** draws the candidates that have no measurement of their own on one of the
  chosen axes. They appear as a dotted range rather than a dot, because the value is the span of
  their closest measured relatives and not a position anyone measured; where the other axis is
  measured the range collapses to a whisker. Off by default, since twenty-five overlapping ranges
  are less readable than none, but **the count is in the footer either way**. Nothing that the
  filters kept is ever silently missing from the picture.

  The two switches it replaced were "Points" and "Comparability". That reads as four combinations
  and was three: comparability could do nothing in headline mode, because a headline is one fixed
  value with no measurement conditions left to match. Its "Strict" also meant measurement
  conditions, an unrelated idea to the "Strict" in the top bar, which is about missing data.
- **Compare with** adds one familiar filament, PLA by default, as a labelled cross. It is a
  reference, not a candidate: excluded from the front, from the counts and from the index tally,
  exactly like the steel and aluminium envelopes.
- **Encoding**: colour is polymer family, marker shape is filler class, outline carries evidence
  status. There are 19 families, past what a categorical palette can separate, so the eight largest
  get their own hue and the rest group as Other.
- **Performance indices**, chosen under **Design guide line** and grouped by lightest and cheapest part,
  ship as named design cases with their formula, log-log slope and caveats.
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

Full keyboard path through filter, result, pin, evidence and compare. Enter on a row opens it; Enter
on the star or link inside the row does only that. Both drawers take focus when they open, close on
Escape and return focus to what opened them. Below 1100 CSS pixels, including at high zoom, the
filter rail is a drawer opened from **Filters**. Colour never the sole carrier of meaning.

Compare leads with the requirements, missing-data rule and snapshot, on screen and in the print
stylesheet, so a printed comparison says which question it answers.

The CSV export lists the rows in the table's order, with the requirements and policy in its header,
each row's result, whether it is in the results, every failed and unchecked criterion with its
reason, value qualifiers and measurement IDs. Estimates get their own columns only when they were in
use.

## State in the URL

The scenario lives in the URL hash: constraints, policy, shortlist, assumptions, plot settings,
current lens, the open material, whether estimates are on and the database snapshot. A link reopens
the same question and warns when the snapshot differs. Search text and a lasso selection are not
carried. A copied link from a local file only works on that computer, and the panel says so.

A saved file and a link are both validated completely before anything changes. A damaged one is
refused with a reason and the running session is left as it was. Loading a file restores the lens,
columns, baseline and estimates switch as well as the requirements, through the same function the
page uses at startup.
