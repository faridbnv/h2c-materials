# The interface

> **In short.** Why the page looks and behaves as it does. One screen serves someone who wants a shortlist and an engineer who wants the evidence behind it, for data that is sparse and says so. This document covers the workflow (requirements, the ranked table and chart, a material's drawer with its products and their print recipes), the words the page uses and why, and its visual vocabulary.

## The problem it is shaped around

Two readers share one screen: someone who wants a shortlist, and an engineer who wants the evidence
behind it. Progressive disclosure answers that.

This dataset adds a harder problem. It is sparse, and deliberately honest about being sparse.
Tensile strength is published for about two in three of the materials, a price was sampled for about one product in five, and
most process fields for almost none (the filter rail states each count, from the build it ships with). A conventional
filter interface renders that as a tool that looks broken. **Making absence
legible and useful, rather than invisible, is the design problem.** Most of what follows is
downstream of it.

## The workflow

```
1 Set requirements  ›  2 Read the candidates  ›  3 Compare trade-offs  ›  4 Check the evidence
```

Named on the opening panel, because opening on every row of everything (every material in the database) gave no
entry point.

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

The heading above the pills adds up to the rows under it. It counts against the materials in the database that are
not family entries or aliases, the same denominator the start panel and the rail use (a family name is never a
candidate, so none counts; the current numbers are in [build/snapshot/counts.md](../build/snapshot/counts.md)). Under
**Confirmed only** it reads, for the Indoor prototype template, "87 of the 152 materials meet these requirements" (2026-10-07; 15
when this was written) and says how many more could not be checked and are left out ("39 more could not be checked,
left out under Confirmed only"). Under **Include uncertain** those materials are listed, flagged, so the heading counts
them too, and the sentence under it says how many an estimate screened out of the list. A count of materials that
meet the requirements above a longer list of rows had read as a contradiction. Both headings, as the current build words them, are in
[build/snapshot/ui/10-indoor-prototype-strict.txt](../build/snapshot/ui/10-indoor-prototype-strict.txt) and
`11-indoor-prototype-explore-estimates.txt` beside it.

## One candidate set, five lenses

Table, Ashby, Parallel lines, Data coverage and Compare all render the same filtered set. Switching lens never
changes membership. A material highlighted in one is highlighted in all.

| Lens | For |
|---|---|
| **Table** | Reading candidates and their headline numbers |
| **Ashby** | The trade space: two properties, constraint overlays, Pareto front, performance indices |
| **Parallel lines** | Several properties at once across a narrowed set |
| **Data coverage** | What the database knows and does not |
| **Compare** | Up to six shortlisted materials side by side, or one against a familiar baseline, with their measurement conditions and each one's current result |

One line under the tabs says what the active view is for ("The candidates as a sortable list"). It is the tab's own
title, shown: the names "Ashby", "Parallel" and "Coverage" had explained themselves only in a tooltip, and the last two
are now called what they show. The line starts under the first tab wherever the tabs sit; it had been right-aligned on
a row of its own, under tabs that had wrapped to the left. A selected tab keeps the width of its bold label, here and in
the drawer, so choosing a view or a drawer tab no longer moves the tabs beside it.

**Compare** draws each property as one track per shortlisted material, and the track spans every candidate in the
database, the lowest value at its left end and the highest at its right, both printed under the bars (with estimates
shown, their estimated ranges count too). A bar's length is where the material sits among everything the tool could have
offered. Scaled to the shortlist's own maximum, densities of 1,050, 1,110 and 1,090 kg/m³ had drawn three nearly full
bars that said nothing. A requirement on the property is an upright line across its tracks, named beside the property
and dashed when only tracked; a track widens past the candidates to show a requirement or a value outside their range,
and says so under it. A requirement further out than the candidates' own spread is drawn doubled at the end it lies
beyond, since widening that far would crush every bar to a sliver. The published range marks, the `*` tick and the estimate spans sit on the same scale.

A property whose candidates span more than a hundredfold is drawn on a **log track**, labelled "log scale" under its
end values, where each tenfold step takes the same length; the intro above the tracks names which properties are. Stiffness
runs from 0.0046 to 12.5 GPa and stretch from 0.8 to 1,740 %: on a linear track nearly every material was a sliver at the
left end, and only the elastomers that set the range read as bars. A log track needs every value on it to be positive
(the candidates' range, the shortlisted values, their published ranges and estimates, and the requirements), and falls
back to linear otherwise. The requirement lines, range marks, `*` ticks and estimate spans are placed on the same log
scale, and "widened" and "past the end" are judged in tens there too.

**Data coverage** grids eight domains per candidate. Every cell but Application says what the records show, since D114
derives a gap as it derives evidence: a blank cell is "not assessed", which only Application, a reviewer's column, can
be. The price column is "CA price": ✓ a Canadian listing, ◐ a price converted from a foreign listing only (D113), – no
price. Under the grid, two sections say what the columns cannot, each headed and opened by one line saying what it
is. **Conflicts outside these columns** lists, one material to a line, a conflict or held-back value recorded in an area
the grid has no column for (a composition, a source contradicting itself). **Rarely published properties**
(compression strength, thermal expansion, conductivity, fracture toughness, fatigue, creep, friction; `db.meta.sparseProperties`)
are not a column: nearly no source publishes them for any filament, so the column had been a gap on every row ("0 of 82
recorded") and told one candidate from another by nothing. A table lists each property with how many candidates on
screen publish it and which, by the rule that derives each material's record (a measurement of its own, numeric or in
words, not held back). It had been one paragraph per distinct list of what was missing, seven near-identical sentences
that hid the few materials that do publish one (D124). Every name there opens the material's Known gaps.
A cell of the grid opens the material's Sources tab at its Known gaps, where the Coverage tab's rows now are (D124).

A sixth tab, **Why excluded**, sits beside them and is not a lens: it explains what is *not* in the
candidate set, ranked by how many materials each criterion costs. It is a tab rather than a hidden
mode because it used to be reachable only through a button that left every tab rendering unselected,
with no way back except guessing. Before any requirement is set it says so, and offers **Start from a typical part**
(the templates) and a pointer to Filters: one sentence saying nothing was excluded had been a dead end.

Every view draws into one scroll area, and below 600 px the page scrolls as a whole (see Accessibility and output). A
new lens, a template and a scenario loaded from a link or a file start at the top; a table read halfway down used to
open the Ashby chart with its axis controls scrolled out of sight. Changing a result chip, a sort, a filter or the search
keeps the reader's place.

The table offers two column sets. **Properties** answers which material is right; **Printing**
answers whether the machine can run it and what to set, with nozzle, bed and chamber windows and
what else the job needs. The chooser says which on screen, beside it ("What the material is like"), and **Compare
against** starts at "no reference", where "nothing" had read as a missing value. The second set existed only in the
drawer before, one tab deep. Switching keeps the sort when
the sorted column is in both sets (material, result, price). Otherwise the order goes back to material name and a
line above the table says so, naming the column that went: the list used to reorder itself without a word.

The Chamber column has more kinds of answer than the other two, and shows each as what it is:

| Cell | Means |
|---|---|
| `45–60` | A published window |
| `not required` | A source says no heated chamber is needed, in the chamber row or by saying an enclosure is not necessary |
| `recommended` | A source recommends a heated chamber and gives no temperature |
| `no setpoint` | The data sheet prints "-". Not zero, and not "not required" |
| `~80–120†` | The 2026-09-13 research's estimated band, shown while estimates are on. Not a setting, and it changes no result |
| `—` | Nothing published |

Every window, word and band in these columns opens its explanation: a range says it spans every recorded profile and
offers the Printing tab, a word quotes what the source said, a band says what it rests on and offers the estimate.

A word never becomes a number, and a band never sits beside a published window. In the drawer the
same answers appear under "H2C printability": a window the chamber only partly reaches reads
**Partly within** and says which part is reachable, a statement in words is quoted, and a band gets its own
card with the basis and caution the research wrote.

## The filter rail

The groups are in the order an engineer screens (the owner's ruling of 2026-10-04, D124): **Material family** (with
the filler and *Build materials only*), **Mechanical**, **Thermal**, **Environment**, **Printing on the H2C**, **Part
condition**, **Cost and availability**, **Data quality**. The H2C's checks had sat as two boxes above every group, with
the same three temperature gates repeated under Compatibility at the bottom; they are one group now. The headings are
display names (`GROUP_LABEL` in `filters.js`) over the stored group keys, which saved scenarios carry, and a
requirement is counted in the group it is shown in (`railGroupOf`), whatever key it was saved with. A group's
collapse mark is a chevron drawn in CSS, 16 px wide: the 10 px grey "▸" it replaced read as a dot.

**Material family** comes first because a reader usually starts from a family ("a nylon") before a
number. It is two levels: the families, each with a count, and under a chosen family its base polymers. A polymer
chosen in one family narrows that family only; a second chosen family with no polymer chosen keeps all of its own. The
polymer is named within its family in the requirement ("Polymer Blends › PC"), because PC heads two families and a
PC chosen among the blends must not admit polycarbonate. These are the only counts in the rail that follow the other
requirements: each says how many of that family the rest of the query leaves, which is what a click would show. The
availability lines elsewhere describe the data and stay fixed. A chosen family also takes the first colour on the
chart, so a family asked about is never in the grey "other families".

**Every numeric control states its own data availability before it is touched.**

```
Heat resistance
temperature where it starts to soften under load
97 of 134 have data
Applies only to Morphology amorphous | semicrystalline | … ; 19 other materials are not applicable
[at least ▾] [ 100 ] °C
```

(The counts are the build of 27 September 2026; a property that applies to some filaments only counts those.) Until
m137 (D84) the heat control added a line counting the values whose source named no load; those are now values
published without their conditions, counted apart like a value with no stated direction.

This single pattern does most of the work. It says what a criterion can and cannot decide before
anyone relies on it, and it turns the build's audit findings into everyday guidance.

The numeric controls are the registry's measured headlines, in its order (D46): under **Mechanical** density,
stiffness, strength, **strength across layers** (tensile strength along Z), stretch before breaking, **notched impact,
Charpy** (ISO 179, kJ/m²) and **notched impact, Izod** (ISO 180, kJ/m²), never mixed or converted; under **Thermal**
heat resistance and **glass transition**; under **Cost** the price. The four in bold came with D92 and D94 and are
filters, chart axes, drawer key numbers, Compare rows and export columns, but not default table columns: the
Properties table fits a 1440 px screen with the filters open with the columns it has, and one more made it scroll.
What each compares, and what it leaves out, is in DATA-MODEL, "What each selectable property compares"; the drawer
says it beside the values left out (below).

A group's badge says what it counts ("2 set"): a bare number beside "Mechanical" read as a count of results. Part
condition and Data quality count the settings that change which values are judged as well. Bambu Lab's standing is
**Bambu Lab status**, its stored values shown under the names an engineer would use (Bambu Lab filament, Type on
Bambu's H2C list, Unlisted, usable with conditions, Unlisted, within H2C temperatures) with their meanings one press
away, and the temperature checks read **Nozzle ≤ 350 °C**, **Bed ≤ 120 °C**, **Chamber ≤ 65 °C**, the limits read from
the build's H2C baseline.

**A field that cannot discriminate is not built as a filter.** H2C routing and AMS read "verify the
exact grade" on nearly every profile, and printing difficulty is unpublished on all of them (the rail's note under
Printing on the H2C gives the counts). They appear
in a material's Printing tab as evidence. A filter that passes everything teaches the reader to
trust something that checked nothing.

The Overview's "Can it run through the AMS?" line is not a verdict chip either: it quotes what the profiles record
under AMS published, AMS 2 Pro and AMS HT, or says no source publishes AMS compatibility. It used to read "Not
established" for every material, in the same chip as the checks that are evaluated.

The rail is rebuilt on every change, and keeps what the user was doing: which groups are open,
which control has focus, and an operator chosen before a number was typed. A number the property
cannot take, such as a negative density, is refused inline and the applied requirement is left alone.

The rail holds one requirement per property. A link or file carrying a second one on the same property, or a
requirement this build cannot evaluate (an unknown property, gate, facet or environment, an empty list), is left out
when it loads, with a warning that names it: a second requirement used to be invisible in the rail and dropped by
editing the first, and a typo read as a gap in every material's data.

The nozzle question is asked as the hardware you lack, **Brass nozzle only**. Owning
one removes nothing, so there is nothing to ask. The criterion fails materials a source says need a
hardened nozzle, holds fibre-filled materials with no guidance as unresolved, and passes the rest
with a reason that says no requirement was recorded, which is not proof of being safe for brass.

The chamber check counts its two kinds of answer apart: how many materials publish a chamber
temperature, how many more say no heated chamber is needed, and, as a caveat, how many publish a
window the H2C only partly reaches, which stay unresolved rather than passing.

**Within H2C temperature limits** is one box over the three temperature gates, each indented under it with its data
line; it is ticked when all three are asked, indeterminate when one or two are. The scope list is a box of its own,
**Exclude materials beyond H2C capability**, which names the families it removes (industrial high-temperature plastics
and sintering filaments): it reads that list and no temperature, so it is not called printable.

**Part condition** is a group of two two-way switches: *Post-processing* (As printed | Annealing allowed, with the
oven's limit) and *Moisture in service* (Dry | Conditioned). Each says what it does to the answers: annealing allowed
can only add passes; conditioned judges only values measured after moisture conditioning, so most materials become
unknown. They add no requirement. They had been a checkbox and a radio pair pinned above every group, under "How the
part is made and used", saying neither.

Environment criteria split by what the data can answer. A category is offered as a filter ("Resists acids") where a
grade-level record states a verdict (acids, alkalis, solvents, oils and grease, water, fire), or where the base
polymer's published behaviour covers some materials (sunlight and weather, moisture, hot water and steam: no record of
a material's own states a verdict in these, so they pass nothing and only screen, below). Food contact, creep and
fatigue have records but no reducible verdict among them, and are named under the filters as evidence only: offered as
constraints they would return UNKNOWN for every material while looking like a working filter. Among the categories
offered, only an unqualified record passes: "limited resistance" is unresolved, never a PASS.

A material's Environment tab counts every record it lists, and its first line says how many of them are in
categories the filters can use. The tab used to count only those, so ABS read 8 over thirteen records and BVOH read
0 over one.

Where a material has no record of its own in a category, its base polymer's published behaviour stands in (D64): a
resin producer's or handbook reference for the neat polymer, from `polymer_environment.csv`. The rail counts those
materials apart under the category, "N more from the base polymer, shown but never passing", because that is exactly
what they do: the record is shown in the drawer, it never passes the requirement, and where the reference finds the
polymer resistant to nothing in the class (attacked or dissolved by what it reports, with no agent rated resistant) it
screens the material out under Include uncertain with **Let estimates rule out materials** on. A polymer attacked only by
the concentrated acid beside a resistant dilute one is `limited`, not screened: that is what a grade sheet's "resistant
to acids" means too (D64). A category with polymer-level records is offered as a filter even where no grade-level
record states a verdict; it cannot pass there, and its line says "0 records state a verdict".

## What to do with missing data

The most consequential control, so it sits in the top bar under its own label, "Materials
with missing data", shown at every width ("Missing data" on a phone; "Candidate confidence" until the trial of
2026-10-01 read it as a statistical confidence), beside the buttons on a wide screen and above them at 1400 px
and narrower: below 1100 px it used to be hidden, leaving two unlabelled buttons. The internal policy names remain Strict and Explore; the buttons describe the result
set in plain language. Those two names, **Confirmed only** and **Include uncertain**, come from one place
(`POLICY_LABELS` in `app/js/ui/labels.js`) and every sentence about the mode uses them: the Why excluded tab, the
excluded search hits, the results heading, Compare and Save / share. They had also been called "leave it out" and
"keep it", and a button offered to "keep materials with missing data visible"; a button now says which mode it
switches to ("Switch to Include uncertain").

- **Confirmed only** (Strict) — a criterion that cannot be evaluated holds the material out. Measured
  evidence only; estimates are not consulted at all, and not shown anywhere, the material drawer included. The
  drawer's Key numbers say estimates are available under Include uncertain, where they used to appear regardless. The material's result is still UNKNOWN,
  not FAIL: the policy decides eligibility, and the verdict keeps describing the evidence, so the
  FAIL count only ever counts materials that failed something.
- **Include uncertain** (Explore) — materials with unresolved criteria stay visible and flagged. With
  **Let estimates rule out materials** on, a material whose estimate clearly cannot meet a requirement is screened out,
  and so is one whose base polymer a reference finds resistant to nothing in what the requirement asks it to
  resist, where the material has no record of its own (D64).

An estimate never passes anything. The reader sees its likely (80%) range; it screens a material out
only when the range the build lets it screen on wholly fails the requirement. That range is set end by end from a
back-test of every measured headline (DECISIONS D48, D59): an end may screen only where the back-test has shown a new
true value lies beyond it at most 10% of the time, it is never inside the plausible (95%) range, and an end the
material's own evidence lies beyond is open and screens nothing. A printed measurement of the material that bounds
the headline from below and meets the requirement vetoes a screen; a resin supplier's moulded value is not one of
those and vetoes nothing. The drawer says, for each estimate, which ends may screen and why. A heat value whose source
does not state the load is published without its conditions (D84): marked not comparable, it decides nothing unless
*Include values with no stated orientation or load* (Data quality) is on. (Until m137 it was read as a bracket that
could screen.) A property that is not applicable (`n/a`), such as heat deflection of an elastomer, screens as an
estimate that wholly fails a requirement does. A screened material's result is still UNKNOWN and it is counted there;
the Why excluded tab says how many each requirement screened.

Some canonical names are families or aliases, not materials: a family groups materials (PA, PA-CF, PA-GF, TPE, TPU, and "TPU, hardness not stated"),
and an alias names another material's products (CoPA, another name for PA6/66; a Bambu Lab product line such as PLA
Basic; a Bambu Lab TPU, filed under its hardness class; CPE-LW). How many there are is in
[build/snapshot/counts.md](../build/snapshot/counts.md). They are never rows. Searching one lists its members, with a
line saying what it is ("a family in this database, not one material", or "another name for" the material), and its
members link to their drawers. Its own name opens its entry: what it is, why it has no tabs (its measurements,
profiles, grades and prices are recorded under each member), and its members, each opening its drawer.

With estimates on, the table cell shows the estimate rather than the related `*` value, because the
estimate already contains that measurement converted to the headline. Sorting then counts it: a column sorts an
estimated row by its estimate's centre, and a measured row before an estimated one at the same value, where estimated rows
had always sunk to the bottom whatever the cell showed (OBC's `~0.008–0.21†` GPa listed after the stiffest carbon-fibre
grades). An estimated nozzle, bed or chamber window sorts by its top, as a published window does. With estimates hidden
the order is as before, anything without a measurement last in both directions, and the CSV export keeps the table's
order either way. An imprecise estimate is in
italic, and the legend above the table says so. Selecting it says what it rests on, both ranges and its precision, and
offers **Open the estimate**; the drawer lists every measurement behind it with its converted value. Where no source publishes a nozzle or bed window, the
Printing table shows an estimated one, marked `†`, which decides nothing.

Switching resets which verdicts the table shows, so the change is visible in the results rather than
only in a label. `defaultShowStates` in `main.js` is the single source of that, because when the
mode buttons owned it independently a shared Explore link rendered as Strict.

**Let estimates rule out materials** is in the top bar in both modes, and says beneath it how many materials it screened. Under
Confirmed only it is disabled, with "Only under Include uncertain" beneath it: hiding it there meant a reader in the default
mode never learned estimates exist. What the switch governs, an estimate of a missing number and a base polymer's published
behaviour, sits behind the **?** beside it, not in a tooltip. It is one switch because both are inference about a material
that publishes nothing, and both obey the same rule: never a pass, a screen only where the evidence wholly fails. Its
element ids and the scenario field keep the old name (`use-estimates`, `useEstimates`), so links and saved files still work.

## The four states

One vocabulary, used identically in table cells, chart points, explain panels, compare rows and
exports. Always icon plus text, never colour alone.

| State | Mark | Meaning |
|---|---|---|
| PASS | check | Evidence satisfies the criterion |
| FAIL | cross | Evidence violates it |
| UNKNOWN | question | No comparable evidence |
| INDETERMINATE | half circle | A published range straddles the threshold, or the source leaves it unsettled (a chamber window only partly reachable, a recommended window above the H2C's) |

A published mean with its spread is not a range: it passes or fails on its mean, and a threshold inside the spread
marks the value `≈` "close to the limit" (D54).

The status bar chips are **buttons**: they choose which verdicts the table shows, under the label **Show in table**.
Each leads with a box, ticked (☑) while its results are shown and empty (☐) while they are hidden, so on and off differ
without colour: `PASS 15 · UNKNOWN 16 · FAIL 67` had read as a tally. The last one switched on stays on, and says so.

The count above the results names what is shown in one order, PASS, UNKNOWN, FAIL, then SCREENED while that chip is on
("31 shown PASS + UNKNOWN + SCREENED"), where it had printed the set alphabetically ("FAIL + PASS"). When the rows are
not exactly the candidates the missing-data rule keeps, it says what they are, in parts that add up to the number shown:
"31 shown PASS + UNKNOWN + SCREENED · 23 candidates, 8 screened out", "82 shown PASS + FAIL · 15 candidates, 67 failed",
"8 shown UNKNOWN · 8 of the 23 candidates". It had said "31 shown PASS + UNKNOWN · 23 candidates", which left the 8 rows
the SCREENED chip brought back unexplained, and before that "eligible", a word defined nowhere.

A fourth chip, **SCREENED**, appears only when an estimate or a base polymer's published behaviour screened something. It
is not a verdict: its materials are already counted under UNKNOWN. It brings them back into the table, each marked
"screened"; the mark names what held it out and the requirements, in the pills' words: "Screened by an estimate: Heat
resistance at least 100 °C", "Screened by the base polymer's published behaviour: Resists solvents" (D64), as the
export's Screened by estimate and Screened by base polymer columns do, where both had printed the engine's criterion
("hdt045 >= 100"). An estimate's mark offers to open the estimate; the polymer's offers the Environment tab, where its
rows are. Why excluded counts the two kinds of screen apart under each requirement.

Before any requirement is set nothing has been tested, so rows read **not tested** and the chips
stand down. A green PASS on a blank screen asserted a test that never ran.

## Reading a number

| Looks like | Is |
|---|---|
| `2.58` over `0.433–4.24 · 52` | A material as the spread of its products (D83): their typical value (median), their range, and how many publish it comparably. Select it for the details and **Open its products** |
| `4.43` | A measured value of the material's one product that publishes it comparably |
| `PASS` over `1 of 4` | One of the four products that could be judged meets every requirement together. Select it for the untested count |
| `46*` | A real measurement that no product publishes comparably. Select it for why, and **Open the measurement** |
| `~1.9–5.3†` | An estimate: the likely (80%) range of a calibrated model of every observation. Never passes; select it for its evidence and which ends may screen, and **Open the estimate** |
| `35≈` | A published mean ± spread whose spread contains the requirement's threshold. Judged on the mean (D54); select the mark for the spread |
| `166¤` | A price converted from a foreign listing: the product has no Canadian listing in the sample, so its price is its own currency before VAT at the Bank of Canada rate (D113); select the mark for the listing and the rate |
| `50.99` | A number beside a requirement on its column keeps the digits that put it on its own side of the threshold, where rounding would cross it |
| `—` | Not published. Select it for which kind of absence |

An estimate's two ends are printed together, on one step: the coarser of a tenth of the range's width (to a power of
ten) and three significant digits of its larger end, keeping the step's decimals, so both ends read to the same place and
a wide, rough estimate shows fewer digits than a narrow one. The ends are rounded **outward**, the lower end down and the
upper end up, so the printed range always contains the range it stands for; a centre, or any value inside, is rounded to
the nearest. An end smaller than the step keeps one significant digit of its own, rounded outward too, rather than
rounding to zero. An open or zero-width range keeps a single number's digits, still rounded outward.

| Estimate | Printed before | Printed now |
|---|---|---|
| OBC stiffness 0.00896–0.203 GPa | `~0.00896–0.203` | `~0.008–0.21` |
| OBC stretch 731–1,390 % | `~731–1,390` | `~730–1,390` |
| ABS-CF strength 46.9–57.5 MPa | `~47–58` | `~46–58` |
| PA66-CF stiffness 3.85–7.87 GPa | `~3.9–7.9` | `~3.8–7.9` |
| PA6 strength 49.5–107 MPa | `~49.5–107` | `~49–107` |
| a range 55.1–118 | `~60–120` | `~55–118` |

Rounded to the nearest, `46.9–57.5` printed `47–58`, narrower than the estimate at its bottom, and a lower end of 55.1 on
a step of 10 printed 60: a range could look clear of a requirement it was not clear of. Outward, an end moves by at most
one step, and the step is at most a tenth of the width, so no printed range is more than a tenth wider than the estimate
at either end (197–1,030 prints `190–1,030`). On a step of a fifth of the width it printed `100–1,100`, and PA6's
49.5–107 printed `40–110`: wider than the estimate by enough to be read as a rougher one. A test
reads every estimate in the database back from its printed string and checks that the printed range contains the true
one, in both units and for the plausible range as well.

The centre and the plausible range are
printed on the likely range's step, so the wider range never seems to start inside the narrower. A table column and a
Compare heading keep their unit. Where the unit is printed beside the numbers (the drawer's Key numbers and estimate
cards, and the estimate's explanation) a stiffness under 1 GPa reads in MPa, `8–210 MPa`, and the text gives the range in
the column's unit too. The screening range in that text keeps a single number's three significant digits: its ends are
where a screen starts. A measured value is printed as before.

One line above the table names these marks, always the same entries in the same order: `—` not published, `2.3` over
`1.0–3.0 · 27` median and range, `*` published, not comparable, `~a–b†` estimate (italic = rough), `≈` close to the
limit, `n/a` not applicable. The `?` entry for a heat value whose load was not stated went with m137 (D84), since such
a value is now counted apart like any other published without its conditions. The estimate entry shows whenever
estimates do, in both column sets, since the Printing columns show estimated windows too. Each entry opens its
definition. It replaced a paragraph whose entries came and went with the rows and told the reader to hover.

Every number measured on one product is itself a button, marked by a small dot, at least 24 px each way and reachable
by keyboard: it opens the measurement with its direction, specimen, conditioning, standard, post-processing, test
temperature, print parameters, notes, grade and source, and the source's original is a link. It works in the table,
the Overview, Compare and the Products tab. It opens the Sources tab, scrolls that measurement into view, opens
whatever of it is collapsed and marks it, because PA6-CF has well over a hundred measurements and "one click to the
evidence" was otherwise one click plus a hunt. Only the six-pixel dot used to be the button, while the drawer said
"click any number". A material's typical value over several products is no one measurement: selecting it explains the
spread (the median, the range, how many products and which are set apart) and offers **Open its products**, as the
table under Reading a number says.

## Explanations on the page

A tooltip may repeat what is on screen; it may not be the only place a meaning is said (D61). Every mark whose meaning
is more than its glyph is a real button that opens one explanation popover: a material's typical value, an estimate, a
`*` value, `≈`, `n/a`, a "not comparable" mark on a product's value, a dash or a missing-state word, the Also needs
chips and "none recorded", a chamber word or band, a print window, "no price" and "out of stock", the screened, assumed
and baseline chips, each legend entry, Use estimates, the drawer's gate chips, its "recorded 240–270 °C" caveat, a
quarantined price listing and a physically implausible measurement, and in Compare each result, gate and estimate.

- Click, tap, Enter or Space opens it beside the mark, inside the screen at any width; Escape, the close button, the
  mark again or a click elsewhere closes it, and focus returns to the mark. Tabbing past either end closes it and
  carries on from the mark.
- Where there is a natural next step it ends with one action: an estimate or a screened chip offers **Open the
  estimate** (the material's Overview), a `*` value **Open the measurement**, a material's typical value **Open its
  products**, a print window or need **Open the Printing tab**.
- Inside a table row a mark does only its own job: the row's drawer does not open behind it.
- The words come from the functions that wrote the tooltips (`estimateTitle` and the rest), and each mark keeps its
  title, so a mouse still gets it on hover and the wording cannot fork.

## The material drawer

The drawer is where an engineer checks a candidate, so it is ordered by the questions asked of it, and every value leads
to its source.

**Header.** The material's name, its full name once, and one identity line: base polymer, filler, and how many products
from how many makers ("ASA · carbon-fibre filled · 17 products from 15 makers"), then its Bambu Lab status as a chip,
under the rail's display names.

**Overview.** With requirements set it opens on **the answer**: how many of its products meet all the requirements,
how many fail one and how many publish too little to judge, with *Show the products*. Then **Your requirements**, the
best product's result on each, named once above the lines ("Shown for its best match, Polymaker FIBERON ASA CF08"); a
line that rests on another product names it, the passing material-level and print checks fold into one "Also met"
line, and each value's **source** button opens the measurement. Then **H2C printability** (whether every product is
within the H2C's limits, where the settings came from, the ranges across products, hardened nozzle, drying and AMS in a
sentence each), **Key properties** (a compact list: each property's median, range and product count, its basis behind
its name), **Typical applications**, **Limitations**, **General guidance** for the family, a one-line **On file** count
with the way to Sources, and, once at the foot, the method sentence that data-sheet values are not design allowables.
Without requirements the order is the lede, Key properties, H2C printability, then the rest. Record IDs are never in
these sentences (D124).

**Estimates** follow the Key numbers under **Estimated, not measured**, one line each, in the data's own terms: "Strength
~46–58 MPa† · good precision · from 3 of its own measurements", or "from the family model only". Opening a line gives
today's full record: both ranges, what it rests on, what limits it, what it may screen, and every measurement behind it,
converted. What every estimate shares, that the ranges are calibrated, that an estimate never passes and when one may
screen, is said once under the group. Six lines of prose per estimate, with those two sentences in each, had pushed "Can
the H2C print it?" off the screen. Under Confirmed only there are no estimates in the drawer at all, as before.

**Typical applications and general guidance.** For 50 materials the materials table's Best uses cell holds pointers
rather than prose, "Family context in Q00282, Q00283, Q00284, Q00285": evidence records filed under the family's own
material. The data is left as it is and the drawer resolves them. A record whose topic is Best uses becomes the
**Typical applications** text, with a line saying it is guidance for the family in general and its source; the others
are listed under **General guidance for** the family, each as topic and finding with its source. Where no referenced
record is a Best uses record (PVA, BVOH) there is no Typical applications. A pointer that resolves to no record is
listed as not found, never dropped, and Limitations is read the same way. No record ID is printed in the Overview.

**Tabs.** Eight, in the order a material is checked (D124): **Overview, Products, Mechanical, Thermal, Printing,
Environment, Price, Sources**. Each has a count and one line under the strip saying what it holds. Products, the things
you buy, comes second: it had been sixth. **Sources** is last and says how it relates to Products: a product is what
you buy, a source is a document its values were read from, and one document can cover several products. Each document
lists the products it **Covers** and what it **Gave** (values, print settings, maker statements, environment
statements), and each product card ends with its own Sources. Sources lists every document the material's records
cite, not only those behind a measurement. The Coverage tab is Sources' last section, **Known gaps**: the gap, limited,
conflict and held-back rows in the reviewer's words; a row that says only that data exists is left out, since the
other tabs show it, and a reviewer's note on a settled domain sits under a collapsed **Review notes**. The internal keys
stay (Grades, Evidence, Coverage): a request for Coverage, from a Data coverage cell or an empty tab, opens Sources at
Known gaps. A tab with nothing in it says "Nothing on file for this material", gives the recorded reason where there is
one, and offers the known gaps.

**Products.** The passing products come first, under *Meet all your requirements*, the first of them open. Every other
product is one line until opened: its name, its result and its key values, with **Choose** beside the line rather than
inside it. Opened, it shows what it fails or leaves unresolved, the state it was evaluated in, its print settings (each
part read elsewhere labelled "data sheet shared with …" or "from Bambu Lab's Filament Guide for …"), its values, what
its maker says (each quote with its document and page, and a **limits** mark where a reviewer recorded what the claim
does not say), its Sources and its product details. A card stays as the reader left it when the drawer is redrawn.

**Impact tests, one heading (D133).** Mechanical shows everything on impact under one closed heading, **Impact tests**,
in the place of the first impact property, instead of a comparison beside three property headings. Opened, it shows:

- the two notched tests drawn one above the other on one kJ/m² scale with labelled ticks (logarithmic, at 1, 2 and 5 of
  each decade, once the largest value is more than ten times the smallest): a dot per product at its published value
  (filled: orientation stated; hollow: no stated orientation; square: measured after annealing; diamond: a special
  formulation), the middle half of the compared products shaded and their median a line;
- a small table, a test a row: how many products are compared, their median, middle half and range, and on a line
  under it the products drawn but left out of the median, by why (no stated orientation, special formulation, sold as
  toughened), then the products that publish both tests, by name;
- one closed line, **How Charpy and Izod differ, and what is compared**: method.csv's caption (how the tests differ,
  that nothing is converted) and each test's comparison note, there for a reader who asks;
- **Every result, with its document**: one line counting the results below by what each is ("Of the 269 results
  below, 63 are drawn above; the other 206: 47 with no stated notch, 40 unnotched, 39 in J/m, 32 on moulded bars, …"),
  so the counts under the property headings add up, then the property blocks (Charpy impact strength, Izod impact
  strength, and Impact strength, test unclear, where the material has them), closed, each with every value, its product
  and its source. The record a dot stands for carries a line **On the graph** with the dot's mark: in the median, or
  not and why, what changed its bar (annealed, conditioned; from the build's typed fields, "stated once on its page"
  where a page heading supplied it), and a **sold as toughened** mark with the maker's quote. A sibling's record that a
  twin reads (D89) carries a line for each product it stands for.

What is drawn decides itself, from the products' values, with no list of materials anywhere:

- **No graph with fewer than two values.** A spread needs two points. The heading then opens on one line that says why
  and counts the results below, so it never seems to contradict them: "No graph: no product has a value to draw. The
  2 results below: 2 on moulded bars." (ASA-AF), or "No graph: only one product has a value to draw, iSANMATE ASA Glass
  Fiber's notched Izod impact of 9 kJ/m², with no stated orientation. The other 14 results below: 6 on moulded bars, 5
  with no stated notch, 2 unnotched and 1 struck cold." (ASA-GF; the value opens its record). The closed line on how
  the tests differ and the lists follow; nothing else.
- **A row only for a test with a value.** A test no product has a value of gets no empty row; a line under the table
  says so and that its results are listed below.
- **A key only for the marks drawn**, and the middle half and median only where a row has them.
- **No median table without a median.** Where none of the values drawn is compared, one sentence says so and why
  ("No median: none of the 5 values drawn states the bar's orientation (XY), and only those that do are compared."),
  instead of a table of dashes.

Why each result is or is not drawn is read from its typed fields in the order the build reads them (products.js
assess); test/impact-compare.test.js checks the two agree on every impact record, and that each counted line adds up.

There is no product-by-product table: it repeated the lists (most of a material's impact records were in both), and
few products publish both tests (23 of 386 when it was removed; PLA has one). Hovering a product's dot on one row lights its dot on the other; selecting
a dot (or the one value a sentence names) opens its list on this tab, marks its record and brings it into view, and
the record's document opens Sources.
Which headlines are drawn together is the Drawer comparison column of headline_definitions.csv; a property they read is
folded into the heading. A material where neither headline applies keeps its impact properties as headings of their own.

**Impact strength, test unclear (D133).** The third impact property holds results whose sheet names no test, or names
both (a Charpy label beside an Izod standard). Its note says so, its values are never compared, and each carries a line
"Which test: probably Charpy" (or Izod, or "cannot tell") with the reason, marked as our reading and not the sheet's
words (impact_test_guesses.csv). A result whose own label or standard names the test is under that test's property.

**Sold as toughened (D133).** A product whose maker's own statement presents it as toughened or impact-modified
(product_claims.csv) carries a **sold as toughened** mark beside its name in its product card, and on the impact record
its dot stands for;
the mark's explanation is the maker's quote, its document and page, and "the maker's statement, not a test result". Its
dots are coloured. The impact heading's table, and the Products tab's spread table, say how many of the comparable
values are from such products and their range. On the two impact headlines they are set apart (m390): the
material's median, range and middle half are the other products', and the toughened ones are listed under "Left out" in
the median's explanation and the Products table, and drawn as open marks outside the material's box in the Material
ranges view on an impact axis, unless every comparable value is theirs.

**Record notes.** Nearly every measurement's Notes cell is the record's history ("Added 2026-09-17 (m39): re-read from
the source document"). It is shown, collapsed, as **Record notes**, never among the test conditions. Every record ID is
behind a small **ID** mark beside what it names.

**Measurements** in Sources are grouped by the source that published them; Mechanical and Thermal lead with the
property instead (see "The drawer on 21 September 2026" below). A condition the source states once for its sheet
(post-processing, test temperature, print parameters, notes) is said once at the top of its block, "For every
measurement below from this source", when more than half of the block's measurements, and at least two, state it in the
same words; a measurement whose wording differs shows its own, and one that states none where the others do says so
("Except where one says otherwise"). ABS had repeated one 60-word print-parameter paragraph under all 20 of its
measurements. A paragraph longer than about 140 characters shows its first words and **Show all**; a native
disclosure, so it works from the keyboard and the browser's find opens it. A property the sheet names without a value is
not an entry: it goes on one line at the end of its block, "Also on this sheet, not published: glass transition
temperature, crystallization temperature", and in Mechanical and Thermal on one line at the end of the tab, "Named on a
sheet, not published", with each product's name. Mechanical and Thermal still count those, as the measurement records
they are.

**From a value to its source.** Each measurement ends in labelled parts. In Mechanical and Thermal, where it is led by
its product's name, it ends "Measurement V000554 · source: Bambu Lab, Bambu Filament Technical Data Sheet - ABS, p. 2:
Young's Modulus (X-Y)", and the source's name is a button that opens the Sources tab at that source's block, marked,
with focus on its heading. In Sources, under that heading, it ends "Measurement V000554 · grade G027-01 · on the source:
p. 2: Young's Modulus (X-Y)". A block there is headed by the source's publisher and title, then its class and access
date, and **Open the original (PDF)** or **(web page)**, where the raw URL had been the link; the source ID is a small
tag. The source's title is the one the sources table records: the heading the document prints, not a file name (D63). A
measured value opened from the table, the Overview, Compare or the Products tab lands on its measurement, opened and
marked, whatever is collapsed around it.

**From the base polymer.** Where a material has no environment record of its own in a category, the Environment tab
ends with a section headed "From the base polymer PLA" (D64): one line saying that no source tested this material or its
grades, that what follows is the neat resin's published behaviour from a resin producer's or handbook reference, not a
test of this grade, that it never passes a requirement and, where the reference reports the polymer attacked or
dissolved, that it screens the material out with Let estimates rule out materials on. Then each category with its derived
verdict, marked "polymer-level", and every agent row under it: the agent, its verdict, the finding, the conditions, the
notes and the source by name. The tab's count includes these records and its first line says how many of them are the
polymer's. Nothing here is only in a tooltip (D61). The section shows in both modes: it is published evidence, labelled
for what it is, not a model's output.

**Headings name things, not IDs.** Printing profiles are headed by the grade's product and the profile's kind ("Bambu
Lab ABS · Manufacturer published guidance"), products by the product's name, and each has its IDs as tags; Coverage
rows lead with the domain and status and end with the record's ID as a tag; Environment records end in labelled parts
with the source by name. `P0032 · G027-01 · MANUFACTURER PUBLISHED GUIDANCE` and `B-ABS-FILAMENT-TDS` had been the
headings.

**Products** (the Grades tab until phase 3) says once, above the products, that the colours a product is sold in are
not in this database and pigment can change strength and stiffness; a product shows the colour its specimens were
printed in only where that is recorded. The same sentence under every grade had read as something different about
each.

A family entry has no tabs, and its drawer says why in one line (its measurements, profiles, grades and prices are
recorded under each member) above the list of members.

## Search

Matching is by word, not by substring: a query term has to begin a word of the material's name,
family, full name, abbreviation, base polymer, modifier, one of its grade identifiers, or the maker or name of one of
its active products ("Polymaker", "PolyLite", "Prusament"). "pa6" finds PA6-CF, "cf" finds every carbon-filled grade,
"support" finds the support materials through their family. Slashes separate, so "Support for PLA/PETG" answers to
either name. Searching a brand was the first thing a first-time reader tried (audit 2026-09-11, F1), and it had found
nothing.

A substring test would be simpler and is wrong in a way that is hard to see: "PLA" sits inside
"thermoplastic", so searching for the most common filament there is returned every TPU and TPE in
the database, looking for all the world like a deliberate classification.

Search runs over the whole database, never only over what survived the filters. Hits the
requirements removed are listed separately, each with the criterion that removed it. The heading over them gives the
reason: the requirements rule them out, the result chips hide them, or, when both apply, how many of each. A search that
matches nothing says so, says what search looks at, suggests searching the polymer instead, and offers **Clear the
search**.

## Words

Every sentence on the page is written for one reader and one purpose (D124, the owner's ruling of 2026-10-04).

**The reader** is a mechanical or manufacturing engineer choosing a filament for a part the team will print on its
Bambu Lab H2C. They read technical data sheets: tensile modulus, yield and break, XY and Z orientation, HDT at
0.45 MPa, Tg, notched Charpy and Izod, ISO and ASTM methods, annealing, moisture conditioning, enclosures, hardened
nozzles, AMS, median and range are their words, and the page uses them. They do not know this project: its data model,
its policies, its migrations or the words it coined for them.

**The purpose of each place:**

| Place | The decision it serves | What it says |
|---|---|---|
| A rail control | Can I filter on this, and what does it compare? | The property in standard terms, the basis it is compared on (method, orientation, state), how many materials report it |
| The results header | What did I ask, and what is not checked? | The requirements as set; what the question leaves unchecked |
| The drawer's Overview | Is this material a candidate, on which product, and what must I verify? | How many products pass, the evidence per requirement, H2C printability, key properties, limitations |
| Products | Which product do I buy, and how do I print it? | Each product's verdict, print settings and where they come from, its values, its maker's statements |
| Mechanical, Thermal, Environment | What exactly was measured, and how? | Every value with its method, orientation, specimen and condition |
| Sources | Can I trust and trace this number? | The documents, what each covers, the link to the original, the known gaps |
| A popover | What does this mark mean for my decision? | At most four sentences, in standard terms |

**Engineering terms stay; the project's coinages do not.** Where the database has its own word, the page says what an
engineer would:

| The database says | The page says |
|---|---|
| grade | product |
| twin, "same sheet as X" | data sheet shared with X |
| admitted for screening | not stated |
| research mode, print checks off | H2C printability not checked |
| in the H2C's scope, outside the printer's envelope | beyond H2C capability |
| the printer maker's guide | the Bambu Lab Filament Guide |
| Official Bambu product, Officially listed family, Conditional, Theoretical | Bambu Lab filament, Type on Bambu's H2C list, Unlisted, usable with conditions, Unlisted, within H2C temperatures |
| typical (of a material), headline | median of its products, key property |
| typical: annealed | annealed median |
| screened (outside the fuzz-pinned chip and header words) | excluded by an estimate, excluded by resin reference data |
| quarantined | held back |
| track only, preference only | report only |
| coverage record, evidence recorded | data on file, known gap |
| family entry | group name |

**How a sentence is written.** The answer first, then what qualifies it. One idea to a sentence, with no chains of
semicolons. A caveat that holds for every row is said once, at the top of its view. Numbers and units as a data sheet
prints them. Record IDs never stand in a sentence on the page: a source button beside a value holds them, with the
page and the locator (the decision brief and the exports keep them, as records do). A reviewer's, migration's or audit's
note is not reader text: it sits under a collapsed "Review notes" or "Record notes".

**Names are display, keys are not.** What the page shows is mapped over the stored value (`GROUP_LABEL` in
`filters.js`, `H2C_STATUS_LABEL` and the rest in `app/js/ui/labels.js`), so a link, a saved scenario or an export made
before a rename still reads. Property names come from `headline_definitions.csv` (`Plain`, the data-sheet name, and
`Technical`, the method). Constraints are described by one function, `describeConstraint`, used by the requirement
pills, the explain panel, the per-candidate why list, the excluded-search group, the Products tab and the CSV export,
so the panel can never print `hdt045 >= 100` while the pill beside it says "HDT at 0.45 MPa at least 100 °C".

Environment category names are authored in `schema/vocab/environment-categories.csv` and compiled
into the snapshot, in a heading form ("Acid resistance") and a sentence form ("acids"). The engine
and the interface both read them from there, which is why a category name cannot drift between the
two, and why nothing builds a name by appending "resistance" to an internal key.

## Buying it

The price cell links to the best sampled offer: in stock first, then the observation behind the
headline, then whatever has a price. A listing with no usable price reads "no price" with the link's arrow beside it, on
one line; the words open who lists it, when it was seen and whether it was in stock. A dash with a link arrow had read as
nothing to buy, and "listed, no price" over "out of stock" took three lines of a desktop column and doubled the row. Under
a price, "out of stock" is a small second line. A material with no price observation says "No price", not "No CA
price". A price read from a foreign listing carries a ¤ mark that says from which currency, at which Bank of Canada rate
date, before VAT, and that no Canadian shop in the sample lists the product (D113). The Price tab lists every observation with its retailer, variant, pack size, price per kilogram, stock and
whether it is in the sample, a foreign one with its ¤ and the arithmetic from its own currency, under one line giving how
many shops were sampled and when (a listing's own date is in the
explanation its "offer" or "no price" opens). A listing with a displayed price but no regular price the sample could
rely on (44 of the 104 sampled in September 2026) shows the displayed price per kilogram marked "offer", which opens
who lists it, at what shelf price, and why it is not a regular price; it backs no headline. A listing with no price at
all reads "no price" the same way, where it had read "n/a". A quarantined listing is struck through and its reason is
a line under its row, where it had been only the row's title and a button. An optional filter shows only materials a
sampled retailer listed, and optionally only those in stock.

A material no sampled retailer listed is reported UNKNOWN, not FAIL. A few Canadian retailers on the days they were read
is not evidence that something cannot be bought, and a foreign listing never counts as one.

## The Ashby lens

Since D107 the lens is an engineering selection exercise, not a browser of recorded properties. It reads one model,
`buildWorkspace` (`app/js/engine/workspace.js`), and so do its result list, its inspector, the line and the chart's
exports: a mark is one product in the state its answer is in, and both its coordinates, its index and its rank come from
that state. D108 then simplified its controls after the owner used it (the filter rail as the one place to set a
requirement, the line as a guide, material ranges drawn as the table summarises a material), and D109 laid every option
out as three rows with one planned effect each and made the lens keep the reader's place. D110 ordered the views coarse
to fine with a shape per filler and put a mark's details in place of the list, D111 drew every view by one rule of
layout, size, frame and ticks, and D112 made Material typicals one dot per material. The reviews that led to them are
`docs/audits/2026-09-29-ashby-makeover/`.

```
GOAL  [Beam, minimum mass, stiffness prescribed ▾]  Maximise M = E^(1/2)/ρ   Cross-section area free, proportions fixed
ASKED As printed, dry · H2C scope and print gates · Stiffness at least 3 GPa · Density at most 1250 kg/m³  Change in Filters
┌──────────────────────────────────────────────────────────────┐ ┌ list (scrolls on its own)       ┐
│ DRAW  [Material typicals | Material ranges | Products]  More ▾ │ │ [Find a material]               │
│ ALSO  (Unsettled) (Failing) (Estimates) (Pareto front) | (Metals & wood) [Familiar ▾] │ Ranking M = E^(1/2)/ρ │
│ LINE  M = [0.001734] ━━●━━ ▼ ▲   8 products from 5 materials above the line          │ 1 PPA-CF 0.00231 ⤢ ☆  │
└──────────────────────────────────────────────────────────────┘ │ ── line · M 0.00173 ──           │
┌ ↑ [Stiffness ▾] GPa Lin|Log        ⇄        → [Density ▾] kg/m³ Lin|Log ┐ │ 6 PLA …             │
│ [Zoomed to PA6-CF · Show all] [Picked out: PA6-CF ×]   chart  │ │ (a mark pressed: its details    │
│                                                                │ │  replace the list; ← Ranking)   │
└──────────────────────────────────────────────────────────────┘
marks · Drawn: 14 products from 8 materials · ▸ Reading this chart
```

- **The question** is one bar. *Goal* is the scenario's one goal, with its formula (its geometry in the formula's
  tooltip and beside it). *Asked* reads back what the filter rail holds: the state every product is judged in, the H2C
  limits (or *H2C printability not checked*, with **Check nozzle, bed and chamber**) and each requirement, then **Change in Filters**, which opens
  or shows the rail. Nothing in the lens sets a requirement: the rail is the one place (D108).
- **A new exercise** (no requirement and no goal) opens on *What must the part do?*: lightest stiff part, lightest
  strength-limited part, lowest material cost, each by member (tie, beam, panel) with a sketch and what its geometry
  leaves free, and *My geometry is fixed*, which compares two properties with no index. The H2C's scope and print gates
  are proposed, ticked, and said to be asked once they are. Once one is pressed the starter does not come back.
- **The goal** is the scenario's one `rankBy`: the table's ranking, the chart's line and the export's rank columns.
  Choosing it anywhere sets its axes (its property up; density across, or material cost per volume for a cost goal) and
  both Log scales. A table column sort orders the rows without dropping the goal, and says so with **Order by rank**.
  Strength goals say their strength is a proxy: the recorded tensile strength, its endpoint as each sheet states it.
- **The controls** (D109, D110) read top to bottom as the chart is built. *Draw* chooses what is drawn, coarse to fine:
  *Material typicals* (one dot per material at its products' median datasheet value, as printed and dry), *Material
  ranges*, *Products*. **More**, at its end, holds the rarely needed raw measurements (test pairs in matched or mixed
  conditions) and the exports. *Also* is a row of chips, each a switch whose state is its look: Unsettled products, Failing
  products, Estimates, the Pareto front, and for scale Metals & wood and a familiar filament. *Line* is the goal's line. The
  axes sit on the chart they set, in a bar across its top: the vertical axis at its left, the horizontal at its right, each
  a menu of property names in one fixed order with its unit and Lin/Log, the swap between. Every option is in view, its
  state on its face; only the test pairs and the exports are a second level, under More. One that does not apply is greyed with
  its reason ("Drawn in the Products view", "Needs Include uncertain and Use estimates, at the top of the page"), never
  removed. Unsettled products follow Materials with missing data (drawn under Include uncertain, as the table lists them) until
  their chip is pressed; changing the mode hands them back to it.
- **One planned effect per control, and the reader's place kept** (D109). Each control changes one thing and leaves the
  rest; a change of axes starts the picture whole. The lens is redrawn on every change and puts back the list's search,
  scroll and open folds, the page's scroll, the focused control and the chart's zoom on the same axes. What narrows the
  picture is said on the chart's top-left corner, with the way back: *Zoomed to …, Show all*, *Picked out: … ×*; a double-click on
  the chart gives the whole picture back. The full table of effects is D109's.
- **Products** draws each product that meets every requirement, in the state its answer is in (annealed at its
  schedule where annealing is permitted, conditioned where that is asked), coloured by family and shaped by filler as
  every view shapes it (D110: circle unfilled, diamond carbon fibre, square glass fibre, triangle ESD, star foaming,
  hexagon an undisclosed variant). A value the
  registry declares unchanged by the state, a density, is read from the product's first state, and the inspector says
  so. A pass is the filled shape; unresolved products (the shape hollow) and failed ones (small and faint) are drawn by
  their chips under Also, never ranked,
  counted on the line or put on the front. A passing product with no value on an axis in its state is listed beside the
  chart with why ("stiffness is published only dry (V…); nothing is read across states").
- **Material ranges** draws each material as the rest of the page summarises it (D83, D108): a box over the middle half
  of its products on each axis (all of them under four), whiskers through the medians to the lowest and highest, a thin
  plus where they cross carrying its name, and its products as small shapes. A product the data marks as a variant (a wood or
  metal filler, a foaming or lightweight additive; its Variant column) is drawn as its shape ringed with a dot and kept out of the range, as
  the build keeps it out of the material's spread, since its values describe the product, not the polymer. PLA's box in
  the scope-only chart was 1230–1250 kg/m³ by 1.5–2.8 GPa with whiskers to 1170–1310 and 0.43–4.2 when D108 drew it
  (about 1222–1240 by 1.9–2.9 GPa on 2026-10-07), where the envelope of every product had run 800–1400 kg/m³ (PolyWood
  and PLA-Lite, both variants). Pressing a box opens the material in the
  inspector, its range in words and its variants named; a lasso or ⤢ zooms the chart and changes no answer, count
  or rank; *Show all*, on the chart, resets it.
- **The line** sits above the chart, in Material ranges and Products: M as a number to type, a slider that moves the drawn line and
  its count as it slides and keeps the position when released, and ▼ ▲, which move it past the next product. It says how
  many products, from how many materials, are on its better side (a product on it counts). It is a guide: it keeps and
  removes nothing (D108). The ranking beside the chart shows where it falls, as a rule between the materials whose median
  is on its better side and the rest. On axes that cannot show the goal it says what they need and offers **Use the
  goal's axes**; on a Linear axis it offers **Switch both axes to Log**; swapped axes draw the same line (the denominator
  up, better below it). On Material typicals and the test pairs the row stays, saying the line is "Drawn over products,
  in Material ranges and Products", each a press away (D111).
- **One count.** A count of marks is said one way everywhere in the lens and its exports: "N products from K materials".
  Under the chart one line says what is drawn and what is not ("Drawn: 14 products from 8 materials, each meeting every
  requirement. Not drawn: …"); the rest a careful reader needs is under **Reading this chart**, closed until opened.
- **The result list** beside the chart (under it below 1100 px) is the keyboard's way to every mark: each material with
  its place, median M, its value relative to the first and its best product, then its products, each of which opens in
  the inspector. A row does one thing per control: the name picks the material out on the chart (its marks stay bright,
  the rest fade; pressed again, it lets go), ⤢ zooms to its products, "best" opens that product, ☆ shortlists it, and the
  fold lists its products. A mark's details replace the list (D110): pressing mark after mark swaps them in place under a
  bar with **← Ranking**, which brings the list back as it was left, the picked material's row in view. A search box
  narrows the list. Materials that pass but cannot rank, passing products not drawable on
  these axes, and a cost goal's unpriced products are listed with why.
- **The inspector** shows one product: its state and schedule, each coordinate with its measurement (a link to it), the
  state it was read from, the source's own ± as published, what the policy admitted unstated, the strength endpoint, a
  variant's class, the goal's M and its material's rank; **Choose this exact product** records it with its state (D103),
  and **Open its material's products** opens the drawer. Pressing a crowded spot lists the marks within a few pixels to
  choose from. An estimate's inspector gives its likely, plausible and screening ranges apart, its basis, the index over
  its rectangle's corners (a bound over two independent ranges, not a confidence interval or a rank) and what would
  resolve it.
- **Requirements on the chart** are the red dashed lines of before; each label is a button that opens the filter rail at
  that requirement (`editRequirements(property)`).
- **Estimates** (under Also) shade, never as a point, the materials on screen none of whose products publishes a value on
  an axis (a material the requirements failed gets none), as a faint wash with no outline, the picked material's
  outlined: the estimate's likely range beside the other axis's measured span across its products, called
  marginal ranges with joint combinations unknown. They follow the page's rule for estimates: only under Include
  uncertain with estimates on, never under Confirmed only; a conditioned question gets none, since an estimate describes
  dry products as printed, and an open or non-positive range on a Log axis is counted, not drawn.
- **A cost goal** draws each product's material cost per volume, its own CAD/kg price times its own density; a twin's
  price is never read, and the unpriced are listed. Prices are observed listings with their dates, Canadian where one
  exists and otherwise a foreign one converted at the Bank of Canada rate (D113); shipping and duty are excluded.
- **Exports** (under **More**, from Material ranges or Products; greyed with that reason on the other views): **Chart
  data (CSV)**, every mark with its identity, variant, state, inputs, verdict, rank and whether it is on the line's better
  side, under a header that says the question, axes, scales, populations and what each range means; and **Chart image
  (PNG)**, captioned the same way. Both carry the release, which More also names.
- **Size.** The filter rail's **Hide** gives a wide screen's width to the chart (a viewer's choice kept in the browser;
  **Filters** in the top bar brings it back). The chart fills what the lens shows of it: at 1440 x 900 with the rail hidden
  at least 700 x 450 px of plotting area, at 1024 x 768 at least 520 x 360 with the results under it, both checked by
  `npm run ui:check`; on a phone the question, the control rows (wrapped), the chart and the results are one under
  another.

**Material typicals and the test pairs** draw published values, whatever state the question judges products in, on the
same controls, layout, size, frame and tick labels as the other views (D111). *Material typicals* is one dot per material
at its typical value, the median of its products' datasheet values as printed and dry, with nothing drawn around it
(D112): the spread of a material's products is Material ranges', for the products that pass. Pointing at a dot says it
is the whole material, how many products the median rests on per axis, and how many of its products pass, "see Material
ranges"; the line under the chart ends *Which products pass: Material ranges*, a press away. A dot is pale where its
material does not pass every requirement. With a goal the list beside it is the same ranking; with none it lists the
materials drawn, at their typical values. Estimates draw a material with only an estimate on one axis as a dotted box
or capped line beside the other axis's product span, and the Pareto front joins the materials nothing beats at their
typical values. The test pairs, under **More**, are *Test pairs, matched conditions* and *Test pairs, mixed
conditions*; while one is drawn, a line under the controls says they are raw measurements for research, not the
decision, with **Back to Products**. A matched pair is two measurements of one product in one condition from one
document: moisture, treatment and schedule, specimen form and direction agree, or one side leaves a condition unstated
and the hover says so; a dry modulus and a conditioned strength never pair (D107). The mixed view draws every pair of a
product's measurements, hollow where they conflict, naming the conflict. At measurement level a dot is a pair of
measurements of one product, not a material, and one material's dots are joined by a faint line. The goal's line is not
drawn on published data; it counts exact products.

A scenario saved before D107 (version 1) keeps its question; its chart opens in the view it was saved with, said so in the
notice, with **Products** one press away (`migrateV1`, `app/js/engine/scenario.js`). One saved with objective stages (a
version 2 scenario from before D108) keeps its question; the line is placed where the goal's own stage cut, and the notice
says that nothing is set aside any more.

Chart mechanics every view shares (`app/js/ui/chart.js`):

- A value at or below zero has no logarithm: on a Log axis it is not drawn, not counted as drawn, and the note says how
  many were left off and that Linear shows them. Celsius axes open on Linear.
- The chart is not responsive on its own: one window listener resizes whichever plot is on screen, because a listener
  per plot kept every replaced plot alive (800 redraws once held 569 MB).
- **Legend and key.** The legend lists family colours drawn (the eight largest families and Other); pressing one hides
  that colour. Beside a plot wide enough to spare it, else under it. What a mark's shape, fill and outline mean is said once,
  in a key under the chart that lists only what is drawn.
- A requirement on either axis is a dashed line labelled in the pill's words, at its value on a Log axis too, its label on
  the side of the line with the plot's room.
- **Point labels never print over each other**: each goes where it clears every other label and marker, inside the plot,
  above, below, right or left; a chosen product and the inspected mark get a leader line first, then the leading
  materials' best products and the front, then the rest. A label that fits nowhere is left off; its mark keeps its hover.
- Drag is **zoom**, not lasso; lasso stays one click away in the mode bar and only focuses.

Parallel coordinates is drawn in SVG rather than by the plotting library, whose version needs WebGL
and fails outright on plenty of real machines. It is drawn at the width it is given, down to 520 px; narrower, it keeps
520 px and scrolls sideways, where it had been scaled down until its labels were 8 px.

A line is read in a readout above the chart: its material, family and value on every axis. A mouse keeps what it had,
pointing at a line to read it and a click to open the material. On a touch screen the first tap on a line highlights it
and shows it in the readout, with **Open material** as the next step, where the tap used to open the drawer before the line
could be read; a tap on the chart away from the lines clears it. Each line takes the pointer 14 px wide, so a finger can
hit one drawn under 2 px wide. From the keyboard, Tab reaches each line, highlights it and reads it, and Enter or Space
opens it.

## Deliberate omissions

- **No radar charts of raw engineering properties.** Mixing GPa, MPa, °C and CAD/kg on one radial
  axis is meaningless. Aligned bars instead.
- **No universal material score.** Scores are scenario preferences applied after hard constraints,
  never a quality ranking.
- **No imputation presented as data.** Estimates exist, are labelled as intervals, never pass a requirement, and screen only as D48 and D59 allow.

## Accessibility and output

Full keyboard path through filter, result, shortlist, evidence and compare. The first Tab stop is **Skip to
results**, shown when it has focus, which moves focus past the top bar and the filters to the results; the first row
had been 68 presses away. The search box shows its `/` shortcut until it is used. Enter on a row opens it; Enter
or Space on the star, the link or a mark inside the row does only that.

**Shortlist** is the one word for it: the drawer's button reads "☆ Shortlist" and, like the table's star, keeps its
name and shows its state by `aria-pressed` and a highlighted, filled star. A seventh material is refused with a line in
the shortlist bar, where a browser alert had pointed at "the tray". The theme button says what pressing it does,
"Switch to light theme", on screen and to a screen reader alike; it had read "Dark" while its accessible name said the
opposite. Wording that assumed a desktop layout ("on the left") now says "in Filters". Both drawers take focus when they open, close on
Escape and return focus to what opened them. Below 1100 CSS pixels, including at high zoom, the
filter rail is a drawer opened from **Filters**; opening it focuses its close button, not **Clear requirements**,
which is the first button in its header and which Enter used to press. At phone width the page stays as wide as the
screen: the status chips and the shortlist tray wrap onto a second line rather than widening the layout, which once
laid a 390 px phone out at 533 px with the right side clipped. Colour never the sole carrier of meaning.

**Narrow screens** (DECISIONS D62). What does not fit scrolls sideways inside its own box, and the page never does:

- **Tables**, in the table lens, the excluded search hits, Compare and the drawer's Price tab, give each kind of column
  a minimum width (176 px for the material, about 96 px for a number, wider where an estimate range needs it) and keep
  the column percentages where there is room. Below that they scroll sideways in their box with the material's name held
  at the left edge, as in Data coverage. At 1440 px with the filters open the Properties table fits without scrolling. A
  box scrolls only when its table is wider than it is, because a box that can scroll sideways also scrolls vertically, and
  the column headings would stop sticking under a wide screen's scrolled results. Squeezed instead, 46 of 207 cells had
  overprinted their neighbours at 820 px and 132 at 390 px.
- **The top bar** is one row from 1101 px: the theme button is a sun or a moon up to 1600 px, with "Switch to light
  theme" or "Switch to dark theme" kept as its name and title (with its words it took a second row of its own from 1401
  to 1600 px), its buttons are one height, and below 1400 px the mode's label sits above its buttons. Below 600 px
  it is two rows: Filters, the search, Save / share and the theme as icons (each named), then the mode buttons with Use
  estimates; the title goes, since the browser tab carries it. It had been four rows on a phone.
- **The view tabs**, below 1100 px, and **the drawer's eight tabs**, below 1100 px, are each one strip that scrolls
  sideways with the active tab kept in sight, rather than two and three wrapped rows.
- **The drawer**, below 1100 px, covers the screen and is a modal dialog: `aria-modal`, the page behind it inert, a
  backdrop that closes it, Tab and Shift+Tab cycling inside it, Escape closing it and focus returning to what opened
  it. On a wider screen it is a side panel beside results that stay usable, and is not modal. Enter on a table row opens
  it and consumes the key: the drawer takes focus on its close button, and the same Enter used to press that button and
  shut the drawer as it opened.
- **The page scrolls as a whole below 600 px**, so the status bar and the shortlist are reached by scrolling to them; fitted
  into one screen they left the results a slot a few rows tall, and the browser's toolbar could hide them outright. Above
  600 px the layout fills the window (`100dvh`, with `100vh` where that is not understood).
- **Ashby's** result list goes under the chart below 1100 px, and **Compare's** bars give the name and value columns way
  (`minmax`) before the bar.
- Every close button on a shortlist pin, the requirement pills and the ? beside Use estimates are at least 24 px each
  way. The design guide line's slider is named "Move the line" and speaks its value as the index and how many materials
  are above the line.

`npm run ui:check` fails on any layout failure at 1180, 820 and 390 px: a page wider than the screen, anything past its
right edge outside a scroll box, a clipped table cell, a control off screen, estimates in the Confirmed-only drawer, or a
full-screen drawer that is not modal. The drawer is measured on its Overview, Mechanical, Printing, Price and Sources tabs.

Compare leads with the requirements, missing-data rule and snapshot, on screen and in the print
stylesheet, so a printed comparison says which question it answers.

The CSV export lists the rows in the table's order, with the requirements and policy in its header,
each row's result, whether it is in the results, every failed and unchecked criterion with its
reason, value qualifiers and measurement IDs. Estimates get their own columns only when they were in
use: each estimate with its kind, interval, basis and whether it can screen, and which requirement
screened the row, if any.

## State in the URL

The scenario lives in the URL hash: constraints, policy, shortlist, assumptions, the goal, the chart's
view, axes, layers, line and focus, current lens, the open material, whether estimates are on, the release and the database
snapshot, and its version (2 since D107). A link reopens the same question and warns when the release differs. Search
text is not carried; a lasso only focuses the chart, and that focus is carried as a view. A copied link from a local file only works on that computer, and the panel says so.

A saved file and a link are both validated completely before anything changes. A damaged one is
refused with a reason and the running session is left as it was. A requirement the build cannot evaluate (an unknown
property, gate, facet or environment, an empty list) and a second requirement on one property are left out with a
warning, so a hand-edited link never reads as a data gap. A link pasted into an open tab applies at once.

A scenario assumption stands in for a missing value only: never for one that does not apply, labelled "Assumed" in
every reason, drawn faint on the chart and never on its front. Loading a file restores the lens,
columns, baseline and estimates switch as well as the requirements, through the same function the
page uses at startup.

## A material answered by its products (re-center phase 3)

The page judges a material by its products (D83): each product on every requirement at once, printing included, and
the material passes when one product passes. The table's Result says how many (`1 of 4`), each number cell the
products' typical value with their range under it, and **Rank by** orders the results by a goal: a performance index
worked out for each passing product, the material placed by the median of its products, its best product named under
its name. A column sort clears the ranking. The drawer's **Products** tab (the Grades tab before) opens with the
material's spread per property and, with requirements set, the products that meet all of them; a product that fails
says which requirements, in the pills' words. Each product shows its own values, marked where not comparable, **How
to print it** from its own profiles, and **What the maker says**: since phase 6 (D85), its maker's own statements about
printing and using it, quoted and grouped by topic (warping, precision, nozzle wear and the rest), each with the
document and page it is on and a product page marked as marketing text, then a line naming the maker and what its
documents leave out (a topic, a chamber, drying or annealing need) and whether its website has been searched; its
other evidence records follow, folded. Above the products, **What makers say** counts, topic by topic, how many makers
say something, and for how many of the products the makers' websites were searched. The Overview counts, axis by axis, how many products the H2C can print. The Ashby chart drew each
material as a bubble (the middle half of its products, whiskers to the extremes) behind its typical point; since D107
it draws each passing product in the state its answer is in, since D108 Material ranges draws the boxes, over the
passing products, and since D112 Material typicals is one dot per material. Compare draws each material's product range
behind its bar. **Export their products** writes every product of the materials on screen with its values, levels,
print settings and verdict. **Include values with no stated orientation or load**, under Data quality,
lets such values decide (D84); it travels in the link.

Measured on 2026-09-25 in headless Chrome on the owner's laptop: the page renders its first result in about 0.36 s
from a cached file, with a 104 MB heap, well inside the 1.5 s at which measurements would move to a second payload.

## The drawer on 21 September 2026, at 1,119 products

On 21 September 2026 PLA had 198 products and 700 measurements, and the drawer listed both flat. Its long tabs became
groups that open one at a time, as they still are. **Products** (then Grades), **Printing** and **Sources** group by
maker (by publisher, for sources): each maker is one collapsed line saying how many products, profiles or sources it
holds, the maker of the material's typical product open (in Products, with requirements set, the products that meet
them all are a group of their own above, open instead), and a search box above filters by product, grade, maker or
source and opens what it finds. (Until phase 4 a "representative grade" was marked "stands for this material"; since
D83 no product stands for it.) **Mechanical** and **Thermal** lead with the property: each is a collapsed line with its
count, and inside it every value with its product and source, largest first, keeping the two short conditions
(post-processing, test temperature) and leaving the print-parameter paragraphs to the Sources tab. No range is drawn
across a property's values. A property another replaced holds no values and is never listed as not published. Where a selectable property compares only some of a property's values, its comparison
note opens the property's block and says which, and why the rest are shown but not compared: above the impact results
(said once, in the Impact tests heading), that only a notched Charpy bar (ISO 179) or a notched Izod bar (ISO 180, D94)
in kJ/m² at room temperature is; under each tensile strength, that only a bar the source
says it pulled along Z is a layer strength; under the glass transition, that a resin supplier's value is the raw
material's (D92). With estimates on, each product ends with what the model says of it, one line per headline it
publishes no comparable value for (D81); in Confirmed only it shows nothing. (The layout probe's check for estimates in
a Confirmed-only drawer opens ABS-CF's Overview, not this tab.)

## Where a product's own sheet is silent (re-center phase 6)

A product whose own sheet says nothing on a value, or on a part of how to print it, may be answered by another sheet,
and the page says which wherever the answer is shown (D88, D89). Its own sheet always wins, stricter or looser.

**A twin's sheet** (D89). Products of one material whose sheets print one table are recorded once. A product reads
its twin's value for a key number it publishes none of, and its twin's recipe for a part of printing its own profiles
are silent on (nozzle, bed, chamber, enclosure, hardened nozzle, drying, annealing). Each value or setting read so
carries, in small type beside it, "data sheet shared with" and the sibling's maker and product ("data sheet shared
with Spectrum PC 275" on FormFutura's Kratos PC): in the Products tab's values and in its **How to print it**. The engine's reason ends with
the same words, so the results panel and the exports carry them; a point under **One product** has them in its label;
a material's typical value, selected, says how many of its products are such twins and that each counts as the
product it is; and **Export their products** names them under Values read from and Recipe read from. A price is never
read from a twin.

**The printer maker's guide** (D88). Where a product's own sheet and its twin's are both silent on a part of its print
gate (nozzle, bed, chamber, enclosure, hardened nozzle) or on its drying, it reads its material's row of Bambu Lab's
Filament Guide, if the guide names the material's type; a product with a Variant reads none (D129). The setting in **How to print it** then carries "from Bambu Lab's Filament
Guide for PLA", whoever makes the product (D124); the gate's reason
ends with the same words in brackets, so the results panel and the exports carry them; and the products export names
the guide under Recipe read from. The guide fills drying (D127), labelled as the guide's, but never annealing. For the eleven types it asks an
enclosure for, a chamber so read says "an enclosure, which the H2C's heated chamber is" (D90); where the product's own maker asks
for one and states no temperature, it says "an enclosure its maker asks for, which the H2C's heated chamber is" (D93).

**Counted on the Overview.** Under "H2C printability", one sentence says whether every product is within the H2C's
limits, or counts them axis by axis, and a line says how many settings came from the Bambu Lab Filament Guide and how
many from a data sheet shared with another product; each product in Products says which.

**The guide's row in the Printing tab.** For a material the guide names, the Printing tab opens with the guide's row,
above the profiles. It is headed by the guide's name ("Bambu Lab's Filament Guide for PLA") with the row's ID as a
tag. A line says what it is: what the printer maker's guide states for its type, standing in for a product's print
gate only where the product's own sheet, and a twin's, say nothing on that part, labelled there as the guide's and
never the maker's; how many of the material's products read a part from it; and why the row speaks for this
material. Then its nozzle and bed, each with its gate chip; its chamber (for the eleven enclosure types, "No chamber
temperature stated; the enclosure it asks for on its maker's own printers is the H2C's heated chamber"); its enclosure
answer as the guide prints it, with its reading ("Optional: not needed"); its nozzle line, with whether a hardened nozzle is
required; its drying line, with how the build reads it (required, optional, not needed); and its source, with the column and rows. A
material the guide does not name has no such block, and a material with a guide row but no profile of its own shows
the block alone.

## The decision on the page (version 2.1)

The review of 2026-09-27 found the page answering a narrower question than it looked to: a product could pass on
another product's record, on values of two treatment states, or with no word on whether the H2C prints it; the chart and
the table ranked one goal two ways; and the funnel ended at a material. What the screen does about each:

- **Part condition** (pinned under the scope toggle until D124 made it a rail group): annealing allowed (with the
  oven's highest temperature, optional) and whether the part lives *dry* or *conditioned* (D99). The results header
  says, in one line, how every product is judged, and offers *Allow annealing: N more pass* when that would add any.
- **Within H2C temperature limits** (called Printable on the H2C until D124) is one toggle and one pill: the three
  print gates together, asked by every template (D101). Off, the header says *H2C printability not checked*; with one
  or two asked, *partly checked*, naming what is not.
- **The header is the answer first** (F09): the count and what could not be checked in two lines, the requirements as
  small pills, the state line, and the template's limits and the database's one press away with their first sentence
  showing. At 1,024 × 768 four rows show above the fold; `npm run ui:check` holds three. On a phone, *Read the
  candidates* jumps to the first row.
- **A material's Products tab opens on its passing products**, each with its state (annealed at its sheet's schedule,
  conditioned), what is not settled and why, its recipe before its values, and *Choose this product*. The spread and the
  makers' coverage follow, collapsed.
- **Compare** shows the passing products' own print gates, with the material's window across every product under it.
- **Search** names the products a maker or product search matched, with their own verdicts, and says when the material
  passes on another product.
- **Empty answers** tell all-failed (relax a requirement) from none-confirmable (the records cannot answer; keep the
  requirement and test) and from a mix of both.
- **One ranking** (D102): the table's order, the chart guide's top ten (since D107 the ranking beside the chart, with
  the line drawn into it) and the export all read one result, by passing products; a candidate the goal cannot rank
  says so.
- **Chosen products** (D103) live under *Save / share*: each with its current answer, the release it was chosen on, its
  decision brief, a note, and the team's own test results; the shortlist bar says how many are chosen.
- **The filter rail below 1,100 px is a modal dialog** (F10), as the material drawer is.
- **The release** (D96) is in the top bar and under *Save / share*, and in every export and brief.

## Product uncertainty groups (D137)

The saved controls and scenario format stay the same. With requirements set and Include uncertain selected, the table lists Supported candidates, Estimated candidates to verify and an expandable Insufficient evidence group. Counts, exports, comparison and plot eligibility include collapsed rows. Expansion is local presentation state, not a saved filter; it survives ordinary table redraws. Existing goal or column sorting operates within each group, and material/product CSVs append Candidate group.

Estimated candidates remain UNKNOWN and require every unresolved mandatory numeric centre to meet the limit. Missing categorical/printing evidence or a prediction crossing the centre threshold goes to insufficient evidence. Product cards show each estimate's centre/ranges and its separate exclusion permission. A product estimate screened chip opens Products, where the relevant certificate and records are shown; material-only estimates still open Overview. Reasons distinguish missing, non-comparable and other-state values and name the next maker question or coupon test. New screening is limited to independently certified as-printed/dry scopes under the reserved complete-scenario budget; none currently qualifies; it cannot pass or overrule a measurement.
