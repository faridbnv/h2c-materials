# UI fuzz harness (workstream A)

> Since the audit's fixes the harness lives at `scripts/ui-fuzz.mjs` (`npm run ui:fuzz`, in verify); its oracle now
> validates a scenario as the page does. The results in this folder are the baseline run against `ef26807`.

`ui-fuzz.mjs` drives the built page `dist/H2C_Material_Selector_2026-09-13.html` in headless Chrome and compares what
it shows with the selection engine run in Node on `dist/db.json`. It has no dependencies (Node's WebSocket and fetch,
and a local Chrome).

```bash
node docs/audits/2026-09-15-filtering-estimates-data/ui-fuzz/ui-fuzz.mjs --n 3000 --seed 1 --tabs 10
#   --import 0.8     share of scenarios opened with the in-app "Load a saved scenario" path; the rest are fresh page loads of the #hash URL
#   --recycle 40     reload a tab after this many in-app loads (the page leaks memory on every Ashby render, finding A-04)
#   --roundtrip 0.05 share of scenarios whose link is reopened in a fresh load and compared (I7)
#   --tmp DIR        Chrome profile and scenario files (default: os tmpdir); --out DIR for results (default: here)
```

Outputs: `results.json` (runtime, counts of checks and violations per invariant, violation signatures),
`violations.jsonl` (at most 50 examples per invariant and 8 per signature, each with the seed, scenario index, setting,
scenario JSON and the file:// URL with hash), `findings.csv` (violations traced to their causes).

## How it works

1. **Generator** (seeded mulberry32). Numeric requirements on all six headlines with `>= <= > <`. Half the thresholds
   come from the data: headline values, interval ends, load brackets, estimate likely/plausible/screen range ends and
   implied bounds. They are used exactly, ± one display step, ± half a step, at the displayed (rounded) value, or
   halfway between the value and its display. 35% of those picks are values the table shows rounded. Also: tracked
   (non-mandatory) requirements, two requirements on one property, every gate (scope, nozzle, bed, chamber, abrasive
   with and without a hardened nozzle, buyable with and without stock, dryingKnown, h2cStatus subsets), the reinforcement,
   supportMaterial and flexible facets, every environment category (indicator ones included), and the evidence
   criteria. The six templates appear with a dropped requirement, changed values, a flipped mandatory flag or an added
   requirement. About 10% of scenarios carry assumptions (a specific material or `*`, sometimes with no unit) and 15% a
   search (material and family names, `PA-CF`, `pla`, junk). About 3% of requirements are shapes only a link can carry.
   20% of scenarios are a *child*: an earlier scenario plus one mandatory requirement (I8). 15% use the Printing columns.
2. **Opening a scenario.** The app reads the hash only at start-up. So a scenario is opened either with a fresh
   navigation to `…html?n=i#hash`, or with the app's own *Save / share → Load a saved scenario*: CDP intercepts the
   file chooser and passes a JSON file. Both go through `validateScenario` and `hydrate`. The starting setting and lens
   are random.
3. **One evaluate per scenario.** An injected helper sets the search box, then visits the four settings {Strict, e on},
   {Strict, e off}, {Explore, e off}, {Explore, e on} in random order through the real controls (the `#use-estimates`
   change event and the mode buttons). At each setting it reads the table and the Ashby lens through the lens buttons.
   In a 25% sample it also turns SCREENED on (at Explore with estimates) and shows FAIL (at Strict). The plot is read
   from the Plotly div's `.data`: point traces through their 8-field customdata, envelopes through the "Estimated
   material range" hover template, and the "Pareto front" trace.
4. **Oracle.** It follows `recompute()` in main.js: family entries removed, `applyAssumptions`, `runSelection` with
   `useEstimates = showEstimates = explore && e`, `matchesQuery` with family members, the policy's default visible
   verdicts plus the clicked chips. The count text, the chips and the results header are rebuilt from that. The plot
   expectations are written separately from ashby.js: points where both headlines are known, envelopes where one axis is
   estimated with finite ends, and a Pareto front of its own over eligible points.

## Invariants

| Code | Check |
|---|---|
| I1 | table material set, verdict chip, screened chip (screened rows only with SCREENED on), search-excluded group, no-results panel |
| I2 | `#count` text, the four chips (hidden state and text), the results header's pass / total / unknown sentence |
| I3 | Strict renders the same text with estimates on and off (count, chips and lens hashed); no `.est`, † or envelope in Strict, or in Explore with estimates off |
| I4 | point set, coordinates equal headline values, hover verdict, envelope set (none with estimates off or plot showEstimates false), front over eligible only, legend counts (plotted + lacking + estimated = rows), estimate sentences, axis-picker counts; assumption-backed points; non-positive values on log axes |
| I5 | for every visible row and numeric requirement on a point value: the displayed text compared with the threshold gives the same result as the real value (and the same against the pill's rounded threshold) |
| I6 | Runtime exceptions, console errors, dialogs; NaN / undefined / null / [object Object] in the lens and plot text; non-empty reasons in screened chips, the exclusion list and every engine result; an assumption described as "Published" |
| I7 | a sample of links reopened in a fresh load gives the same count, chips and rows or points |
| I8 | rendered sets: Strict ⊆ Explore+estimates ⊆ Explore without estimates; a child scenario never shows a row its parent did not |
| I9 | the filter rail shows the requirement on each property |

## Runtime achieved

The final run (seed 1, 3000 scenarios, 10 tabs) took **224.5 s**. It made 26,198 readings and 3.35 M checks, with 755
page loads, 2,409 in-app loads, 164 round trips and 3 import fallbacks. An earlier complete run of the same seed
without tab recycling took 199.3 s, with identical violation counts. Its results were overwritten, so only the timing
is kept here.

The 3-minute target was not met. The reasons, as measured:

- A fresh page load costs about 360 ms on one tab and 540-890 ms each with 6-10 parallel tabs (the page is 4.9 MB, and
  its database is gzip+base64 inflated at start-up). With no `hashchange` listener (A-07), a scenario means a reload
  or the import path.
- A scenario does 8-10 readings, that is about 17 renders including 8-10 `Plotly.newPlot`.
- The page leaks a plot and a resize listener on every Ashby render (A-04). An in-app load on a fresh tab takes about
  17 ms and grows to an average of 156-210 ms over a long run. Cold tabs managed about 20 scenarios/s (600 in 29 s),
  which puts 3000 at about 150 s without the leak. Other agents were running on the same 10-core machine during the
  final run.

## Harness bugs found and fixed during the work

- A price cell's text is `28↗` (plus "out of stock"), so `Number()` failed and I5 skipped every price. It now reads the
  first number in the cell.
- The detached file input the app creates can be garbage-collected before CDP resolves it ("No node found for given
  backend id"). The harness retries that scenario as a fresh load and counts it in `importFallbacks`.
- The file-chooser timeout rejected after a failed click with no handler attached, and the unhandled rejection killed a
  3000-scenario run at 2500. It is now caught and the timer is cleared.
- Self-test: `FZ_MUTATE=rows` (drops an oracle row) and `FZ_MUTATE=value` (nudges an x coordinate) make I1, I2, I4-points,
  I4-coords, I4-front and I4-legend fire. That shows the clean invariants are checked, not vacuous.

## Limits

- Only the Table and Ashby lenses at "One material" detail. Not covered: measurement-level points, the index line, the
  reference layer, a baseline, lasso subsets, sorting order, the drawer, Compare, Parallel, Coverage, Explain and the CSV
  export (engine reasons are checked in Node, not as rendered in the drawer or export).
- Settings are reached by clicking from a random starting setting, not by loading all four from the hash. The hash
  path is covered by the fresh loads (25%) and the I7 round trips.
- I5 checks point values only. Ranges, uncertainties and load-not-stated headlines are INDETERMINATE by design, and
  estimates are never compared.
- The rail is checked only for numeric requirements. The rail's own controls are not driven: requirements come from
  links or files, which is also why A-02, A-03, A-05 and A-06 are link/file-only.
- The oracle reuses the engine modules (`runSelection`, `matchesQuery`, `applyAssumptions`). An engine bug that the page
  shows faithfully is out of scope for this workstream (see the engine workstreams). The composition in main.js, the
  rendering and the plot are tested independently.
