# UX and data audit

**Persona.** A 3D printer owner. Competent with their machine, buys filament online, has printed
PLA, PETG and maybe ABS. Has never heard of HDT, tensile modulus, ISO 527, an Ashby chart or a
Pareto front. Does not know this database exists and has no idea what "the architecture brief" is.
They arrived because they want to know what to print a part from.

**Method.** Every scenario below was walked through in the built application. Findings are evidence
based: counts come from the compiled database, layout problems from rendered screens.

**Status.** Nothing here is fixed. This is the list.

---

## Part 1 — What people come here to do

Ordered roughly by how often a printer owner would want each one.

| # | Scenario | Does the app serve it? |
|---|---|---|
| S1 | "What should I print this bracket from?" | Yes, this is the main flow |
| S2 | "I need something stronger than PLA" | Partly. No way to compare against PLA as a baseline |
| S3 | "It has to survive in a hot car" | Yes, but the control is labelled "HDT at 0.45 MPa" |
| S4 | "I need something flexible" | Yes, template exists |
| S5 | "It lives outdoors in the sun" | **No.** UV evidence is 6 records, 0 verdicts, deliberately not filterable |
| S6 | "Cheapest thing that will work" | Partly. Only 40 of 96 materials have a price |
| S7 | "Can my printer even run this?" | Partly. Temperature gates yes; enclosure, AMS, routing almost no data |
| S8 | "What do I set the nozzle and bed to?" | Buried. Printing tab only, free text, never in the table |
| S9 | "Do I need a hardened nozzle, an enclosure, a dryer?" | Hardened nozzle and drying yes. Enclosure: 14 of 156 profiles say anything |
| S10 | "Compare these three I am deciding between" | Yes, Compare lens |
| S11 | "Is it food safe?" | **No.** 2 records total |
| S12 | "Where do I buy it and what does it cost?" | **No buy link anywhere**, though 104 price rows carry a URL |
| S13 | "Can I trust this number?" | Yes. Best-served scenario in the whole tool |
| S14 | "Just show me what exists" | Yes, but the table opens on lab properties |
| S15 | "Send my choice to a friend" | Yes, URL carries the state. Not discoverable |
| S16 | "I want Polymaker PolyMide specifically" | **No.** Brand search returns nothing |
| S17 | "Which is lighter for the same stiffness?" | Yes, performance indices. Expert framing |
| S18 | "Will it warp?" | **No.** 6 evidence records in the whole database |
| S19 | "What colours does it come in?" | Data exists per grade, never surfaced |
| S20 | "What can this tool not tell me?" | Yes, Coverage lens. Probably the least-visited tab |

---

## Part 2 — Findings

Severity: **Blocker** stops the persona completing a scenario. **Major** causes a wrong conclusion or
a dead end. **Minor** is friction.

### Search

**F1 · Blocker · No brand or product name is searchable**
Typing `Polymaker`, `Bambu`, `PolyLite`, `PolyMide` or `3DXTECH` returns zero results. The search
matches material name, family, full name, base polymer, abbreviation and grade IDs only. Grade IDs
are strings like `G050-01`. The database *does* hold manufacturers and product names on 136 grades.
Searching by brand is the single most natural thing a filament buyer does.
**Fix:** add `manufacturer` and `product` from the grades table to the search index, and show which
grade matched underneath the material name in the result row.

**F2 · Major · Search only looks at rows that already passed the filters**
Set a heat requirement, then search "PLA". You get nothing, because PLA failed. The honest reading
is "PLA is not in this database", which is wrong.
**Fix:** always search the full set. Render non-matching-filter hits in a separate "excluded by your
current requirements" group, with the criterion that excluded each one.

### Getting stuck

**F3 · Major · Zero results is a blank table with no guidance**
Over-constraining is the most likely novice mistake. The result is an empty grid, a column header
row, and a footnote about what an em dash means. No suggestion, no route out. The design spec called
for the ranked exclusion panel to open automatically here; it does not.
**Fix:** when the count reaches zero, replace the table with the ranked exclusion panel, the single
criterion that costs the most, a one-click relax, and a one-click switch to Explore.

**F4 · Major · "Explain exclusions" enters a view that is not one of the tabs**
Clicking it switches to a lens with no corresponding tab, so all five tabs render unselected. There
is no back button and no breadcrumb. The only way out is to guess that "Table" is where you were.
**Fix:** make it a panel over the current lens, or a sixth tab, or give it an explicit "Back to
results". Whichever, the tab bar must never show nothing selected.

**F5 · Major · Three detail tabs are invisible**
The drawer is 620 px wide and the nine tabs need about 906 px. Price, Evidence and Coverage overflow
with no arrow, fade or scrollbar hint. Evidence is the tool's headline promise and most users will
never see that it exists.
**Fix:** wrap to two rows, or shorten labels and drop counts to a dot, or add a visible scroll
affordance. Tabs are the primary navigation of that panel and cannot be hidden.

### Language

**F6 · Blocker for this persona · Every column and filter is materials-science jargon**
"Tensile modulus XY", "Elongation at break XY", "HDT at 0.45 MPa", "Density kg/m³". The detail
drawer already solves this, calling them Stiffness, Stretch before breaking and Heat resistance with
a plain-English hint under each. The table and the filter rail do not.
**Fix:** use the drawer's plain labels everywhere, with the technical name as a subtitle or tooltip.
One vocabulary, and let the plain one lead.

**F7 · Major · The explain panel prints internal identifiers**
It shows `hdt045 >= 100`, `tensileModulusXY >= 3` and `scope`. The pills in the header of the same
screen render the same constraints correctly as "HDT at least 100 °C". Two different code paths
describe a constraint and only one is fit to read.
**Fix:** one shared `describeConstraint()`, used by the pills, the explain panel, the why-panel and
the CSV export.

**F8 · Major · The start panel refers to documents the user has never seen**
"Mirrors the worked example in the architecture brief." "Pair with the beam or panel index on the
Ashby lens." These are notes to the author.
**Fix:** rewrite the six template descriptions in terms of the part being made. "A bracket that
lives outside and gets warm."

**F9 · Minor · "Strict" and "Explore" are unlabeled**
The explanatory label was removed to fit the top bar. The meaning now lives only in a tooltip and in
a monospace line at the bottom right that reads like a log entry.
**Fix:** label them in plain words, for example "Missing data: exclude / keep visible", and move the
explanation next to the control.

**F10 · Minor · Generated category names are ungrammatical**
"water solubility resistance" comes from appending "resistance" to every environment category.
**Fix:** store a display label per category rather than building one by concatenation.

**F11 · Minor · Developer metadata sits in the most valuable screen position**
`snapshot 2026-09-10 · build 2026-09-11 · 102 materials · 1807 measurements` in monospace, top
right. It is provenance, and it matters, but not more than everything else up there.
**Fix:** move it into the Scenario panel, which already repeats it, and leave a small date.

**F12 · Minor · "PASS" is shown before anything is being tested**
On first load the count reads "102 shown PASS" with no constraints set.
**Fix:** suppress the state label until at least one requirement exists.

**F13 · Minor · Counting is inconsistent**
The header says "9 of 102 materials meet these requirements" while the H2C-relevant filter is on and
only 96 are in scope. Two different denominators in one sentence.
**Fix:** count against the scoped population and say which population it is.

### Redundancy

Four actions each have two entry points, with different labels and different styling:

| Action | Place 1 | Place 2 |
|---|---|---|
| Clear everything | "Reset" in the filter rail | "Start over" in the results header |
| Explain what was excluded | "Explain exclusions" in the status bar | "Why the rest were excluded" in the header |
| Go to Compare | The Compare tab | The Compare button in the shortlist tray |
| Apply a template | The six cards on the start panel | The same six as list items in the Scenario panel |

**F14 · Minor.** Two names for one action teaches the user they are two actions.
**Fix:** pick one name each. Keep Reset in the rail, keep the explain entry in the header where the
result is, drop the tray Compare button because the tab is right there, and let the Scenario panel
link to the start panel rather than duplicate it.

**F15 · Minor · The theme button is an unlabeled ◐ that cycles three states**
Dark, light, then follow-the-system, with no indication of which you are in.
**Fix:** two states with an icon that shows the current one, or a labelled menu.

### The results table

**F16 · Major · Nothing a printer owner needs first is in the table**
All six columns are laboratory properties. Missing: nozzle temperature, bed temperature, whether an
enclosure is needed, whether a hardened nozzle is needed, whether it must be dried, and where to buy
it. Those are the questions that decide whether someone can print a material at all.
**Fix:** add a compact "Printing" column group, at minimum nozzle and bed temperature and an icon
row for hardened-nozzle and must-dry. Consider a column preset switch: "What I print with" against
"Engineering properties".

**F17 · Major · The purchase links are in the data and never shown**
104 price observations carry a retailer URL. The tool displays a price for 40 materials and no link,
anywhere, ever. A user who decides on PA6-CF has no path to buying it.
**Fix:** make the price cell a link to the cheapest in-stock eligible observation, and list retailer,
pack size, stock and date in the Price tab.

**F18 · Minor · The Family column mostly repeats the Material column**
34 of 96 rows read ABS/ABS, ASA/ASA, PLA/PLA. It consumes 13% of the width.
**Fix:** drop it, or show it only where it differs, or merge it under the material name.

**F19 · Minor · The legends for `—` and `*` sit below the table**
Both markers first appear in row one; their explanation is after the last row.
**Fix:** move to a single line directly under the header, or attach to the first occurrence.

**F20 · Minor · The pin control is an unlabeled star**
Nothing says it builds a shortlist, and the shortlist tray only appears after the first pin.
**Fix:** label the column "Shortlist", and show the empty tray with a hint on first load.

**F21 · Minor · Filter placeholders look like live values**
Grey `1400`, `3`, `50`, `5`, `100` sit in the boxes and read as applied settings, especially since
an applied value looks nearly identical.
**Fix:** drop the placeholders, or move the example into the helper line.

### Detail drawer

**F22 · Major · The evidence dot leads to a haystack**
Clicking the dot next to a number opens the Evidence tab but does not scroll to or highlight that
measurement. PA6-CF has 21, grouped by source. The claim that provenance is one click away is not
true; it is one click plus a manual hunt.
**Fix:** scroll the target into view and highlight it. Ideally open it as a small popover in place.

**F23 · Minor · The Overview never states the print temperatures**
"Can the H2C print it?" answers yes or no but not what to set. The numbers are one tab away.
**Fix:** put nozzle and bed ranges in that section, since it is the section about printing it.

**F24 · Minor · The AMS note explains a design decision instead of answering the question**
A grey box says routing and AMS are recorded per grade and are not summarised "because summarising
them would overstate what is known". The user asked whether they can use the AMS.
**Fix:** answer plainly, "Not established for this material. Bambu has not published AMS
compatibility for it," and keep the reasoning in the docs.

**F25 · Minor · "Hardened nozzle" uses the ambiguity chip**
The half-filled INDETERMINATE marker reads as "we are not sure" when the meaning is "you need one".
**Fix:** a requirement badge, distinct from the four constraint states.

**F26 · Minor · Degree symbols are dropped in gate reasons**
"Needs up to 290 C, within the 350 C baseline" while every other temperature in the app is °C.

### Charts

**F27 · Major · Ashby points are anonymous**
Ten dots, no labels. The legend maps colour and shape to family and filler, not to a material, so a
user cannot tell which dot is which without hovering each one. Only pinned materials get labels.
**Fix:** label points when there are few enough, say under 15, and always label the Pareto front.

**F28 · Minor · The axis dropdown reads like a value**
"Price — 10" is the property and the count of materials that have it. It reads as ten dollars.
**Fix:** "Price (10 materials have this)" or a separate count chip.

**F29 · Minor · The Pareto front is drawn without explanation**
A dotted line appears with a legend entry reading "Pareto front" and nothing else.
**Fix:** one sentence under the chart: "these are the materials nothing else beats on both axes".

**F30 · Minor · Expert controls sit at the same level as the axes**
"Points", "Comparability" and "Performance index" are presented as peers of the X and Y pickers.
Only the axes matter to most users.
**Fix:** collapse the three behind an "Advanced" disclosure.

### Data

**F31 · Major · There is no familiar anchor**
A printer owner judges every material against PLA and PETG. The tool reports 4.43 GPa and 102 MPa
with nothing to compare them to. The reference layer exists but holds steel, aluminium and CFRP, is
Ashby-only, and is off by default.
**Fix:** offer "compare against PLA" as a one-click baseline everywhere numbers appear: a ghost row
in the table, a reference point on the chart, a column in Compare.

**F32 · Major · Half the recommendations cannot be bought**
Of the nine results from the outdoor template, five have no price. Nothing tells the user whether a
material is purchasable in Canada, and availability data exists per grade.
**Fix:** an availability indicator in the results, and an optional "only show what I can buy" filter.

**F33 · Minor · The printer-facing fields are nearly empty and the tool does not say so up front**
Enclosure is answerable for 14 of 156 profiles, AMS for 5, warping for 6 records in the whole
database. The filter rail explains this well for the fields it does offer, but a user hunting for
"will it warp" finds nothing and no explanation.
**Fix:** a short "what this database does not cover" note on the start panel, naming warping, AMS
compatibility and enclosure as the main gaps.

**F34 · Minor · Names with slashes read as two materials**
"TPC / TPEE", "PA6/66", "POM / Acetal", "nGen / Amphora", "PEI / ULTEM".
**Fix:** a primary name plus an "also known as" line.

**F35 · Minor · Grade colour data is collected and never shown**
All 136 grades carry a colour caveat. Colour is often the deciding factor in a filament purchase.

---

## Part 3 — What to do first

If only five things get fixed, these five remove the most damage for this persona.

1. **F1** brand search, because it is the first thing a filament buyer types
2. **F3** the zero-result dead end, because over-constraining is the most likely novice mistake
3. **F6** plain-language labels in the table and rail, reusing what the drawer already does well
4. **F16 and F17** printing information and a buy link, because the tool currently stops one step
   short of the decision it exists to support
5. **F5** the hidden drawer tabs, because Evidence is the tool's differentiator and is invisible

## What is already good, and should not be lost in fixing the above

The provenance model, the honesty about missing data, the four constraint states, the availability
line under every filter control, the detail drawer's plain-language Key Numbers, the ranked
exclusion panel's ranking, and the estimate layer's asymmetry. Scenario S13, "can I trust this
number", is served better here than in any commercial filament comparison site. The problems above
are almost all about the distance between that engine and a printer owner's vocabulary and errands.
