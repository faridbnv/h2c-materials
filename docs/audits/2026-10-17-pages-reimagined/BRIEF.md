# The material pages, reimagined: the brief for the three experts

> **Historical record** (2026-10-17), working brief for the pages-reimagined round. The plan that follows from it is PLAN.md
> beside it. It describes the tool as it was then; the round's [README](README.md) says what was built.

## Why this round exists

Filament Atlas (the tool; `docs/GOALS.md` says what it is for) has a static page per well-documented material, built in
the last two days (decision D142, `docs/DECISIONS.md`; `docs/INTERFACE.md`, "The material pages"). It is a first
version. The owner read it and wrote, in their words:

> - The texts are not giving a reader a coherent from-beginning-to-end understanding. Lots of placeholders that a human
>   reader has to read and say What??? Why is it here. From the beginning to summary to the very end.
> - It is not the page to say "aww, I have all I need to know about this filament", in an amazing way.
> - The links to other pages are terrible, and the general page navigation at the bottom and the top is absolutely
>   terribly designed. The back to selector tool is also really not thought of, and is put there for the sake of being
>   there.
> - The plots are a little better but still dull, not helpful, hastily designed to just be there.
> - The main hub for materials is also a confusing AI-generated wiki index, with links that take you here and there,
>   and a top menu navigation that you don't know what to do with, while it already has too many unnecessary links and
>   buttons.
> - The every-products page is even worse: buggy, unnecessary, extensive filter menus; bugs from graphically ghosting
>   one another to reading them and showing bad mechanisms that lead you to strange combos; graphically bad decisions.

The owner does **not** want these fixed one by one. They want the pages **reimagined**: three experts (you are one)
each reimagine their side, report to the executor, who combines them with the project's constraints into one plan and
then builds it with you.

## Who reads the pages, and why

An engineer (mechanical or manufacturing) on a small team choosing an FDM filament for the Bambu Lab H2C printer. They
arrive at a page from the selector (the main tool, `dist/H2C_Material_Selector_*.html`, where they set requirements and
get a shortlist); a material's drawer there has a "Full page" link. On the page they want to understand the material
across its products: how strong, stiff, tough and heat-resistant it typically is and how much products vary; how to
print it on the H2C and what goes wrong; which products are worth a look and why; what makers say; what it costs; how
far to trust the numbers. They may print the page or send it to a colleague. Engineering terms are right (tensile
modulus, HDT at 0.45 MPa, notched Charpy, XY/Z, annealed, median); the project's own coinages are not
(`docs/INTERFACE.md`, "Words").

## What is there now (look at it before you think)

- The built pages: `dist/materials/` (76 material pages `M###.html`, 76 records pages `M###-records.html`, and
  `index.html`, the hub). Open them in Chrome; or screenshot them with
  `node /private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/962eb155-5885-4063-adc2-7c275a8aeaf7/scratchpad/shoot.mjs <file-url> <out-prefix> [--width 1280] [--height 1600] [--max 12] [--eval "js to run first"] [--dark]`,
  which writes `<out-prefix>-01.png`, `-02.png` … (read them with the Read tool). Write your screenshots into your own
  folder below. Sample pages: PLA `M001` (195 products, the largest), PETG `M020`, PPS-CF `M073` (7 products, the
  median), PCTG-GF `M110` (3 products, the thinnest).
- The "every products page" the owner means is the Products section of a material page (section 6, its search,
  toggles, sorting and expanding cards) and the records page `M###-records.html` (its finder: type, product, document,
  orientation, property chips, search). Treat both.
- The selector itself (`dist/H2C_Material_Selector_*.html`, open in Chrome, click a material row to open its drawer):
  the pages are part of the same tool, so its frame, mark and design language matter.
- The page's text without markup: `npm run pages:text -- M001`. The data: `dist/db.json` (the compiled database; read it
  with node), `npm run sql -- "select …"` (SQLite of the same, `dist/h2c.sqlite`).
- The code: `app/pages/` (renderer: `render.js`, `shell.js`, `sections/*.js`, `charts/*.js`, `records/*.js`,
  `index-page.js`, `assets/` with the stylesheet and the two scripts); `app/js/ui/material-facts.js` (what is counted,
  shared with the drawer), `material-words.js` (the sentences), `material-stats.js` (display statistics),
  `scales.js`. `docs/INTERFACE.md` "The material pages" describes it; the last round's history is in
  `docs/audits/2026-10-16-material-pages-round/README.md` (owner 65/100, reviewers 66, 72, 70).

## Constraints (hard: the plan must keep them)

1. **One source of data.** Every number on a page comes from the compiled database (`dist/db.json`), through the facts
   layer the selector's drawer also uses (`app/js/ui/material-facts.js` and its siblings), so a data change or addition
   reaches the selector and the pages alike, and the two never disagree. A page may compute display statistics
   (medians of what it shows, ranks, counts) at build time, never a value that decides anything.
2. **Generated, static, self-contained.** The build writes every page (stage 8, `app/pages/stage.js`) as HTML with
   inline SVG figures drawn at build time and a small vanilla script (no framework, no CDN, no network). A page must
   work opened from disk (`file://`, unzipped beside a downloaded selector) exactly as on the site (GitHub Pages).
   Fonts are embedded (Inter and Newsreader, approved by the owner; change them only with a strong case). Weight
   budgets are in `app/pages/budget.js` (they can be revisited, not ignored).
3. **Decides nothing.** No requirement is set on a page, no product passes or fails there. The selector decides.
4. **The written summary** at the top of each page is a paragraph per material in `data/tables/material_summaries.csv`,
   drafted by agents, reviewed by the owner; it types no number: each is a placeholder the build fills (`{products}`,
   `{hdt045.median}`), so it cannot go stale. Its rules may change; the principle (no hand-typed number) stays.
5. **Which materials get a page**: at least 3 products and 20 measured values (owner's decision). Others are listed,
   not paged.
6. **Every value traces** to its document, page and conditions, somewhere a reader can reach (today the records page).
   The way there can be redesigned.
7. **Checks exist** (`npm run pages:check`, the interface probe's page views, the drawer's golden renders). They follow
   the design; they are not a reason to keep a bad one. But the plan must say how the new design is checked.

Everything else (the sections and their order, the hub, the records page, the product table, the figures, the
navigation, the way back to the selector, the colours, the "How this is counted" folds) is open.

## What each expert delivers

Write into your own folder under `docs/audits/2026-10-17-pages-reimagined/` (`ux/`, `content/`, `dataviz/`); nothing
outside it, and no change to the code or the data. Lead your proposal with a one-screen summary of your vision; then
specifics an implementer can build from without guessing. Be opinionated: say what to cut as clearly as what to add.
Name, for every proposal, what in the data feeds it (a field of `dist/db.json` or a facts-layer function), or say
plainly that the data does not hold it. A proposal the data cannot feed is a wish; mark it so. Keep it to what
earns its place: the owner asked for efficiency, not volume.
