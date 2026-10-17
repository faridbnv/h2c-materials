# Writing a material's summary: the brief for the drafters

> **Historical record** (2026-10-17). Brief for the agents who draft the 76 material summaries in the pages-reimagined round
> (step 3 of PLAN.md). The rules are AGENTS.md, "Write or revise a material's summary"; this brief puts them in a
> checklist and gives two models. You write drafts; the owner reviews them. It describes the tool as it was then; the round's [README](../README.md) says what was built.

## What a summary is for

It is the lede of a material's Overview. It sits beside *On the H2C*, under the six key figures and the line that says
how well documented the material is. Write it as an engineer would brief a colleague in twenty seconds: what the material
is, what it is sold for, how it behaves in service, and the one thing that decides how it prints on the H2C. The reader is
a mechanical or manufacturing engineer. Use their words: tensile modulus, HDT at 0.45 MPa, glass transition, notched
Charpy, XY and Z, annealed, hardened nozzle. The page already gives the numbers and the caveats, so the summary gives
the meaning.

## What you read

For each material you are given (its ID, such as M020):

```bash
npm run pages:text -- M020      # the Overview as text: every claim you make must be on it
npm run pages:fields -- M020    # the placeholders you may use, each with the value the build will put there
```

Read the whole page text first. Base each claim on a sentence, table or quote that is on the page. Use nothing from memory or
from outside the page, and nothing a single product's card says that the Overview does not.

## The checklist

1. **40 to 75 words**, three or four sentences, no semicolons.
2. **First sentence**: what it is in engineering terms ("a glass-fibre-filled PCTG copolyester", "polylactic acid").
   Then what makers sell it for, said as theirs ("Makers sell it for…", "A maker sells it for…").
3. **Middle**: how it behaves in service, from the Mechanical or Thermal sections, with at most two numbers.
4. **Last**: the one thing that decides how it prints on the H2C (a hardened nozzle, drying, chamber heat, a plate), or
   the main limitation its makers state.
5. **Numbers only as placeholders.** Use those `pages:fields` lists: `{hdt045.median}`, `{hdt045.range}`,
   `{tensileStrengthXY.median}`, `{nozzle.window}`, `{bed.window}`, `{drying.schedule}`, `{zshare.tensileStrength}`, and
   `{hdt045.label}` for a property whose name has a figure in it ("HDT at 0.45 MPa"). Never type a digit, a temperature, a load
   or a count. Where three products or fewer publish a property, prefer `.range` to `.median`. Never use a window that
   `pages:fields` marks "one product's window" as the material's.
6. **Never count.** `{products}`, `{makers}`, `{values}` and `{profiles}` are refused, and so are "195 products", "three
   makers", "two of its products" and "one maker" (write "a maker"). The page's head gives the counts.
7. **Never say what is missing**: no "not published", "not compared", "not ranked", and no thin-data hedging. The
   evidence line says that once.
8. **Never compare** with another material: the first figure does that. Use no superlative and no verdict ("ideal",
   "best", "excellent", "brittle" as a judgement).
9. **Attribute statements.** A maker's statement is the maker's. Bambu Lab's Filament Guide, a printer maker's guide
   or resin reference data is theirs. Never say "many by the Bambu Lab Filament Guide": where a count was read is not the
   reader's concern.
10. **No project words**: product, not grade. No "special formulation", "counted", "key values", "comparable basis",
    "twin". Say "a data sheet shared with".

## What you hand in

A CSV with the columns of `data/tables/material_summaries.csv`, one row per material, in this order:

| Column | Value |
|---|---|
| MaterialID | the material's ID, e.g. `M110` |
| Summary | the text, with its placeholders |
| Written by | `Claude Sonnet (agent)` |
| Written on | today's date, `2026-10-17` |
| Review status | `draft` |
| Notes | `Release <id from pages:text's first line>.` then, for each claim, the section of the page it rests on: "glass transition (Thermal properties); hardened nozzle (Printing on the H2C, settings table)" |

Before you hand it in, check it. The check refuses an unknown placeholder, a typed number and a count, and notes a length
outside 40 to 75 words:

```bash
npm run pages:add-summaries -- <your.csv> --check --revise
```

Fix every refusal and every length note before you hand in. Do not run it without `--check`: the coordinator applies the
rows.

## Two models

These are written to the rules above. Each passes `--check`. With its placeholders filled, each reads as shown under
it.

**PLA (M001)**

```
{name} is polylactic acid. Makers sell it for prototypes and display models, and a printer maker's guide rates it easy
to print. It is amorphous as printed, so it softens at its glass transition: its {hdt045.label} is {hdt045.median}, and
the heavier load gives the same. On the H2C it needs no heated chamber and, except a few filled products, no hardened
nozzle. Makers' statements on acids and alkalis mostly say it does not resist them.
```

> PLA is polylactic acid. Makers sell it for prototypes and display models, and a printer maker's guide rates it easy to
> print. It is amorphous as printed, so it softens at its glass transition: its HDT at 0.45 MPa is 55 °C, and the heavier
> load gives the same. On the H2C it needs no heated chamber and, except a few filled products, no hardened nozzle.
> Makers' statements on acids and alkalis mostly say it does not resist them.

Notes: *Release ba203c390ae5. Polylactic acid (head); prototypes and display models (Uses, What it is sold for); easy to
print (Printing on the H2C, On PLA in general, Prusa Knowledge Base); amorphous, softens at Tg, the same HDT at both loads
(Thermal properties); no heated chamber, a few products need a hardened nozzle (Printing on the H2C); acids and alkalis
(Uses, Chemicals and environment).*

**PCTG-GF (M110), the thinnest page**

```
{name} is a glass-fibre-filled PCTG copolyester. A maker sells it for tooling, equipment and manufacturing aids, and its
makers stress its low shrinkage. Its {hdt045.label} is {hdt045.range}, below its glass transition. On the H2C it prints
at {nozzle.window} without chamber heat, but makers call for a ruby or hardened steel nozzle and for drying before
printing.
```

> PCTG-GF is a glass-fibre-filled PCTG copolyester. A maker sells it for tooling, equipment and manufacturing aids, and
> its makers stress its low shrinkage. Its HDT at 0.45 MPa is 76–78 °C, below its glass transition. On the H2C it prints
> at 250–270 °C without chamber heat, but makers call for a ruby or hardened steel nozzle and for drying before printing.

Notes: *Release ba203c390ae5. Glass-fibre-filled PCTG copolyester (head); tooling, equipment and manufacturing aids
(Uses, What it is sold for); low shrinkage (Printing on the H2C, What makers say: Warping and shrinkage, Adhesion between
layers); HDT below the glass transition (Thermal properties); nozzle window, no chamber, ruby or hardened nozzle, drying
(Printing on the H2C, the settings table, Nozzle wear, Moisture sensitivity).*

What the models leave out on purpose: counts of products, the thin evidence on the PCTG-GF page (the evidence line says
it), and the price, a comparison with PLA or PETG, and the seven properties nobody publishes.
