# The drawer's first screen (the owner's rulings, 2026-10-20)

> **Historical record** (2026-10-20): written for one round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../OPEN-PROBLEMS.md).

> **In short.** The owner ruled that the first screen of a material's drawer needed redesign, "in a friendly, easy to
> read UI" (GOALS-LOG, 2026-10-20, ruling 5). It had shown about 40 numbers under a template; it now answers five
> questions in a few large figures, with everything it no longer shows one press away. PLA's first screen holds 21
> numbers under Indoor prototype where it held 38, and 20 with no requirement where it held 48. Display only: no verdict,
> count or listing moved. Decision D173; built by a Claude Opus agent (track T2 of [the round](../README.md)).

## What the first screen answers now

An engineer opening a material's drawer, before scrolling or opening anything, reads in this order:

| Question | Before | Now | Where what left the first screen went |
|---|---|---|---|
| Does it meet my requirements? | "Of its 196 products, 184 meet all your requirements and 12 publish too little to judge", a button beside it | "**184 of its 196 products** meet all your requirements.", the rest on a line under it with *Show the products*; "is shown to meet" where some publish too little to judge | – |
| On which product, and why? | Every requirement's whole reason (up to 723 characters; PETG's HDT line took five lines) | The reason's first sentence, the value that decided it; a *thin margin* tag beside the requirement | The whole reason under **more**, a popover |
| What are its numbers? | Six key figures, each with its middle half and product count; seven more headlines on an *Also* line; the basis sentence | Six tiles, the median large and its unit small; a property a requirement asks about joins them (density under Outdoor, elongation under Flexible), tagged *required* or *reported*; a foot only where the figure is not a median of four or more ("median of only 2 products", "one product's value", "as published, no stated orientation") | The middle half and count in the median's popover, and with every other headline and the basis sentence under **Spread across products, and 6 more properties** |
| How do I print it on the H2C? | A chip and two lines of counts per setting ("Most products that give one · All 196 products are within the H2C's 350 °C."), drying and nozzle type as paragraphs, two lines on borrowed settings | One row per setting: the window, and a chip in one column; "4 of 7 within" on the chip where some products are within and others not; "None within the H2C's 350 °C" under the window where none is; drying with whether to dry; nozzle type | Each chip's popover holds the window's note and every product's count; nozzle type's tally in its popover; the borrowed settings' counts behind one fine line |
| How well documented is it? | At the foot, after Typical applications, Limitations and the family's guidance | Right after On the H2C, the first screen's last line | – |

Below the first screen, unchanged in content: Typical applications, Limitations, General guidance, the estimates and
the properties that do not apply, the record notes and the method's caveat. A material beyond the H2C's capability
keeps its one-line callout (now naming the settings, its counts in the rows), except where the requirements ask it and
their FAIL line says it: it had stacked a second red box on a failed answer.

## Measured

The numbers and words visible in the drawer's body as it opens (a span "190–230" is two numbers; text inside a closed
disclosure is not counted), and the body's full height, from `shots.mjs`'s run on each build
([before](before/measures.txt), [after](after/measures.txt)). 1280×800 unless named; templates as on the start panel.

| View | Numbers before | after | Words before | after | Height before (px) | after |
|---|--:|--:|--:|--:|--:|--:|
| PLA, Indoor prototype | 38 | 21 | 212 | 122 | 1,366 | 1,068 |
| PLA, no requirement | 48 | 20 | 237 | 118 | 1,072 | 802 |
| PLA, Outdoor structural part | 19 | 17 | 190 | 182 | 1,640 | 1,404 |
| PLA, Indoor prototype, 390×844 | 29 | 17 | 129 | 114 | 1,797 | 1,275 |
| PETG, Outdoor structural part | 24 | 23 | 184 | 164 | 1,599 | 1,346 |
| ABS-CF, Outdoor structural part | 23 | 21 | 178 | 163 | 1,879 | 1,750 |
| ABS-CF, no requirement | 49 | 27 | 228 | 123 | 1,294 | 1,132 |
| PEEK, Indoor prototype | 32 | 24 | 175 | 161 | 1,726 | 1,426 |
| PEEK, Indoor prototype, 390×844 | 31 | 20 | 159 | 136 | 2,260 | 1,772 |
| PCTG-GF, Indoor prototype | 19 | 15 | 164 | 125 | 1,205 | 1,078 |
| TPU 95A class, Flexible component | 30 | 24 | 152 | 146 | 1,546 | 1,406 |

Under a template of four requirements or more (Outdoor) the first screen is the answer and its lines, as it should be,
and their numbers are the reader's own question, so they fall least. No view scrolls sideways, before or after.

## Screenshots

[before/](before/) and [after/](after/) hold the same views under the same names, `-01` the first screen and `-02`,
`-03` the drawer's body scrolled a screen at a time: `pla-indoor`, `pla-cold`, `pla-outdoor`, `pla-indoor-dark`,
`pla-indoor-phone`, `petg-outdoor`, `abscf-outdoor`, `abscf-cold`, `peek-indoor`, `peek-indoor-phone`, `pctggf-indoor`,
`tpu-flexible`. `after/` also holds what is one press away: `press-pla-spread` (the spread table opened),
`press-peek-chamber` (a chip's popover) and `press-petg-more` (a requirement's whole reason).

To take them again: `npm run build`, then `node docs/audits/2026-10-20-owner-rulings/drawer/shots.mjs <dir>` (headless
Chrome through `scripts/lib/cdp.mjs`, as the selector-refinement round's `shots.mjs`); `--only <name>` for one view.

## The first-time reader's review

One Claude Sonnet agent, briefed as a mechanical engineer who had never used the tool, read the after set and the old
PLA and PETG screens. It found the new first screen "much clearer than the old design" and named what misled it; the
first four were fixed before the round's commit, and its screenshots are the set above:

| It found | Done |
|---|---|
| A green "Within" beside PEEK's 90 °C chamber and 120 °C bed, and ABS-CF's chamber, where only 1, 4 and 3 products are within | The chip says how many are within ("1 of 7 within") wherever some are and some are not; it is still the best product's verdict |
| "asked" on a tile was cryptic, and read as a verdict | *required* or *reported*, as the requirement is; the tag's title says the tile is the median and the lines above the product shown |
| PEEK stacked the red beyond-capability box on a red FAIL answer | The box is left out where a requirement's FAIL line says it |
| "only 2 products" did not say what it qualified; "None of its 73 products meets" read as a final no for a material with 21 unjudged | "median of only 2 products", "one product's value"; "is shown to meet" where some publish too little to judge |
| The whole reason behind *more* prints related values in the engine's raw words ("(Not published (do not assume printed), not-applicable)") | Left: the engine's wording, which the first screen no longer shows (OPEN-PROBLEMS §37.20) |
| On a laptop under Indoor prototype, On the H2C starts below the first screen | Left: the requirements come first and say whether the nozzle, bed and chamber are met; with no requirement it is all on the first screen |
| The header wraps a long full name and a count across lines; the phone's tab strip scrolls | Left: the header and tabs are outside this ruling and unchanged |

## Checks

`npm run verify:fast`, `npm run ui:check` (114 views match, no layout failure on the laptop, tablet and phone screens;
the drawer views it records measure layout, not words, so `--write` changed nothing), `npm run ui:fuzz -- --n 300`, and
every material's Overview rendered in Node under six situations (no requirement; Outdoor in both modes; Indoor; Flexible
and Warm with estimates), 1,050 drawers with no "undefined", "NaN" or doubled unit. The tests that read the Overview
(`print-spread.test.js`, the window line against On the H2C's rows; `pages.check.js` P13, the page link;
`material-facts.test.js`, the tab counts) pass unchanged: the rows keep `data-print` and their `<b>` and `h2c-v` text.
