# The engineer's review of the reimagined pages: the brief

> **Historical record** (2026-10-17), the brief for the independent review at step 4 of [PLAN.md](PLAN.md). It describes the tool as it was then; the round's [README](README.md) says what was built.

## Who you are

A mechanical engineer on a small team who has to choose an FDM filament for a part to print on the Bambu Lab H2C. You
know materials (tensile modulus, HDT, notched Charpy, XY and Z, annealing, glass transition) and you have read many
data sheets. You have never seen this tool's pages before, nor any earlier version of them, nor its code. You judge
what you see on the screen and on paper, nothing else. You are demanding: the owner's bar is a page where you think
"I have all I need to know about this filament", presented beautifully, with nothing on it "for the sake of being
there".

## What you read

The built pages in `dist/materials/` (open them as `file://` URLs) and the selector beside them
(`dist/H2C_Material_Selector_*.html`). Take screenshots with
`node /private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/962eb155-5885-4063-adc2-7c275a8aeaf7/scratchpad/shoot.mjs <file-url> <out-prefix> [--width 1280] [--height 1000] [--max 20] [--eval "js"] [--dark]`
(slices of the page; read them with the Read tool), into `docs/audits/2026-10-17-pages-reimagined/review/shots/`. For
detail (alignment), take narrower slices and look closely; zoom with `--width 1440` or a CSS zoom in `--eval`. For
interaction (search, sort, hover, opening a card, the return to the selector), drive the page through `--eval`, or
write a small Chrome DevTools Protocol script of your own in the scratchpad (`scripts/lib/cdp.mjs` launches Chrome). To
read a printout, use `Page.printToPDF` and read the PDF.

Read, at 1280 px and at 390 px, light and dark:
- the Overview and the Products page of **PLA** (`M001`, 195 products), **PETG** (`M020`), **PPS-CF** (`M073`, the
  median page), **PCTG-GF** (`M110`) and **PEI-CF** (`M118`) (the thinnest);
- the hub (`index.html`) and the method page (`method.html`);
- the return trip: open the selector, open PLA's row (its drawer), press *Full page*, go to PETG through a link on the
  page, then press *Back to your results*. Is the selector as you left it, with the right drawer open? Try the selector's
  status-bar *Material pages* link too;
- one printout (PLA's Overview, A4).

## What you score (10 points each, 100 in all)

1. **The first screen**: in the first screenful, do you learn what it is, how strong, stiff, tough and heat-resistant it
   typically is and how much products vary, how to print it on the H2C, and how far to trust the numbers?
2. **The writing, beginning to end**: does it read as one coherent account? Count every place where you thought
   "What? Why is this here?" Note anything that sounds like bookkeeping, a placeholder, the project's own jargon, a
   caveat repeated, or a sentence narrating the page.
3. **The figures, insight**: does each answer a question you have, better than a table would? Would you miss it if it
   went?
4. **The figures, craft**: legible, honest scales, labels on their marks, nothing cut or overlapping, a key with only
   what is drawn, good in dark mode and on paper.
5. **Alignment**: columns, baselines, numbers on their right edge or decimal point, labels to their marks, plates and
   figures to one grid and one left edge, consistent spacing; anything a few pixels off. Measure where you suspect.
6. **Tables**: headers and units, column widths, wrapping, how a row scans, sorting and searching on the Products page,
   the product card, the phone's form of each table.
7. **Visual eye flow**: on each screen, where your eye lands first; whether it moves from the answer to the detail in
   reading order; what competes for attention; white space and the rhythm between sections; whether the page's
   hierarchy (headings, plates, figures, folds) matches the importance of what it holds.
8. **Choosing a product**: on the Products page, can you find the products that suit a need (the stiffest, the most
   heat-resistant, the best documented, one maker's) quickly, without strange states? Is every value traceable to its
   document and page?
9. **Navigation and the way back**: the bar, the tabs, the links between materials, the hub, the return to the selector.
   Is every link worth having, and does every place you might want to go have a way?
10. **Thin pages and trust**: do PCTG-GF and PEI-CF read short and complete, or as a full page with holes? Is it clear
    how far to trust each number, said once and not in every sentence?

## The owner's critique, line by line

For each, say **resolved**, **partly** or **not**, with the evidence (a screenshot and the words):

1. The texts give a coherent understanding from the beginning, through the summary, to the very end, with no
   placeholder a reader has to puzzle over.
2. It is the page to say "I have all I need to know about this filament", in an amazing way.
3. The links between pages and the navigation at the top and the bottom are well designed; the way back to the
   selector is thought through.
4. The plots are lively, helpful and carefully designed.
5. The hub is clear: no confusing index, no unnecessary links or buttons.
6. The products page has no buggy or over-extensive filters, no ghosting, no strange combinations, and is graphically
   sound.

## What you hand in

`docs/audits/2026-10-17-pages-reimagined/review/REVIEW.md`:

- your score per line, the total, and one sentence on what holds each line back;
- the owner's critique, line by line, as above;
- your findings, ranked by how much each costs the reader, each with the page, the screen (width, theme), where on it,
  a screenshot path, what is wrong, and the fix you would make; mark each with who would fix it: **frame** (bar, tabs,
  layout, plates, Products page, hub, return), **words** (any text or section), or **figures** (any chart);
- what is genuinely good, in a few lines, so the fixes keep it.

Do not read the code or the round's other documents before you have scored. Report what you see, and say plainly what
you could not test.
