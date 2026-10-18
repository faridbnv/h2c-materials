# Coherence review: flow, features and use cases

> **Historical record** (2026-10-18): one reviewer's walk of six tasks across the selector, its drawer and the material
> pages, on main at 0125d29e as built. Nothing in the code or the data was changed. Shots are in this folder (`t*.png`),
> taken at 1280 × 800 and 390 × 844 (the light/dark mix is what the screenshot browser's system theme gave).

## Findings first

**What is coherent, and should stay.** The round trip is the best thing in the tool. The drawer's *Full page* opens the
page in the same tab. *Back to your results* then reopens the selector exactly as it was: same requirements, same
scroll, the row highlighted and the drawer open on that material (`t2-page-from-drawer.png` → `t2-back-to-results.png`).
It does the same on a phone (`t6-phone-back.png`). The page keeps the selection out of its address, so a copied link is
clean. The two surfaces also split the work well:

- **The selector and drawer judge.** They show PASS/FAIL, *Choose this product*, the shortlist and the decision brief.
- **The page explains.** It shows medians, figures and every product, with no verdict.

That split is right. Do not give the page a Shortlist or a Choose button, and do not colour its products by your
requirements. The way back is one press, and that is enough.

**Where the hand-offs break.** Each break is small, and each sits where you cross from one surface to the other:

1. **The page's Products page.** You come from a drawer that says "2 of 17 pass" and land on all 17 with nothing marked
   (`t7-drawer-asacf-products.png` against `t7-page-asacf-products.png`). That is right for the page. The problem is the
   way back: it reopens the drawer on whatever tab you left, usually Overview, not on Products, where PASS and *Choose*
   are (`t6-phone-back.png`).
2. **The first product differs in each place.** For PETG under the Indoor prototype template, the first product shown
   is different on each surface:
   - the drawer's Overview is "Shown for Bambu Lab PETG Basic";
   - its Products tab opens 3DXTECH 3DXPRO LG PETG first (passing products in maker order);
   - the page's Products page opens with Bambu Lab PETG HF (most documented first).

   One material gives three "first" products (`t5-drawer-chosen.png`, `t6-phone-products.png`).
3. **Nothing you hand on points to the page.** The decision brief (`app/js/ui/brief.js`) and the drawer's product
   blocks never link to the page, although the page's Products page has an anchor for every product's card (`#G…`). A
   colleague who gets the brief cannot open the page that explains the material.
4. **The wording is wrong when there are no results.** With no requirement set, the status bar's *Material pages* link
   still makes every page say *Back to your results* (`t3-index-cold.png`, over "152 materials, no requirements set").
5. **There is no shared way into comparing.** The page's *Against its alternatives* is a better comparison than the
   Compare lens: six materials by six properties on one screen (`t4-page-alternatives.png` against
   `t4-compare-pla-petg.png`). But you cannot take those six into the selector. In the selector, Compare's empty state
   says "use the star in the results table". At 1280 px with the rail open, that star column is off the right edge of
   the table (x = 1364 in a 1280 window), so you can only reach it by scrolling sideways.
6. **The pages are hard to find.** On a cold start, the only way to the pages is "Material pages" at the far right of
   the status bar, beside the release stamp (`shots-1/main-cold-01.png`). The index's "use the selector" is not a link.

**Features found in one surface and missed in the other:**

| Feature | Selector and drawer | Material pages | Verdict |
|---|---|---|---|
| Search | Top bar; drawer Products tab | Index; Products page | Right as is. One fix: the drawer's search sits *below* the passing products (rec 4). |
| Sort | Results table (by name); none in the drawer's Products tab | Products page, 12 orders | Do not add sort to the drawer. Align its default order instead (rec 3). |
| Copy citation | None | Colophon | Right: the brief carries the release. |
| Print | Compare's *Print summary*; brief | Print stylesheet, but no button | Add a button in the footer (rec 8). |
| Product chosen | Drawer and *Save / share* | None | Keep it in the selector. Point back to it (rec 1). |
| Your verdict | Everywhere | None | Keep it that way. |

**My verdict on the owner's question.** More coherence is worth it *at the seams*, not across the surfaces. A reader
does not mind that the drawer and the page look different, because they do different jobs. What the reader notices is
losing their place, or the context, when crossing from one to the other. All the fixes below are links, labels and
orderings. None needs a new surface.

## Recommendations, by benefit for effort

### 1. The way back from the Products page opens the drawer's Products tab

- **Place.** `app/pages/assets/page.js` (the return link) and the selector's kept tab (`atlas-scroll`, `app/js/main.js`
  `keepScroll`).
- **Evidence.** `t7-page-asacf-products.png`, then `t6-phone-back.png`, which comes back on Overview.
- **Change.**
  - *Before:* from `M033-products.html`, *Back to your results* reopens the drawer on the last tab you used.
  - *After:* when the page you leave from is a Products page, the drawer opens on its Products tab (`Grades`). That is
    where the PASS chips and *Choose this product* are. One way to do it: write `tab: 'Grades'` into `atlas-scroll` when
    that link is clicked.
- **Benefit.** This is the moment you are choosing a product. You browsed all 17, and now you land on the 2 that pass,
  with Choose beside them. It keeps the page verdict-free.
- **Effort.** S.
- **Risk.** Low. It only applies when the selection is the same one.

### 2. Say "Back to the selector" when there are no results

- **Place.** `page.js`, where it sets `Back to your results` / `Results`. Also the index's intro line
  (`app/pages/index-page.js`).
- **Evidence.** `t3-index-cold.png`, `t3-page-petg-cold.png`.
- **Change.**
  - *Before:* *Back to your results* even when the carried selection has no requirement and an empty shortlist.
  - *After:* *Back to the selector* in that case. Also make "use the selector" in the index's intro a `data-return`
    link.
- **Benefit.** A first-time reader who browsed from the cold page is not promised results that do not exist.
- **Effort.** S.
- **Risk.** Low. The words are not tested in `pages:check`, as far as I can see; check the interface views.

### 3. List the drawer's products in the page's order

- **Place.** `app/js/ui/detail.js`, Products tab (`passing`, `groupByMaker`).
- **Evidence.** `t5-drawer-chosen.png` (3DXTECH first) against `t6-phone-products.png` (Bambu Lab PETG HF first) and
  the drawer Overview's "Shown for Bambu Lab PETG Basic".
- **Change.**
  - *Before:* the products that pass are listed in maker order, and the first one opens.
  - *After:* sort them by the Products page's default, most documented first. Open first the product the Overview was
    "Shown for", if it passes.
- **Benefit.** One material has one "first" product on both surfaces. The product opened first is the best-evidenced
  one, not the alphabetically first maker.
- **Effort.** S.
- **Risk.** Snapshot views move. Bring the order key over from the page's sort, so it is one rule, not a second one.

### 4. Put the drawer's product search above the passing products

- **Place.** `detail.js`, about line 1338, where `searchBox('a product or maker')` comes after the pass block.
- **Evidence.** PETG under the Indoor prototype template has 63 products that pass (`t5-drawer-chosen.png`). The search
  box is below all 63.
- **Change.**
  - *Before:* pass block, then the spread, then the search, then the products by maker.
  - *After:* the search first, filtering both lists. This matches the Products page, where the search heads the list.
- **Benefit.** "Is the Polymaker one among those that pass?" is answered without scrolling past 60 rows.
- **Effort.** S.
- **Risk.** None.

### 5. Link each drawer product to its card on the Products page

- **Place.** `detail.js`, each `grade-block`, under *Product details*, or beside *Sources*.
- **Evidence.** The drawer's product block has no way to the page (`t7-drawer-asacf-products.png`). The page's card
  (`#G…`) is the richer view: values grouped by document, whether each value is in the median, and why.
- **Change.**
  - *Before:* none.
  - *After:* "Its card on the Products page", linked to `M033-products.html#G033-xx`, carrying the selection the way
    *Full page* does. Show it only where `pageOf` gives the material a page.
- **Benefit.** You can check the one product you are about to choose in full, and come back with recommendation 1.
- **Effort.** S.
- **Risk.** Low.

### 6. The decision brief names the material page and the product's card

- **Place.** `app/js/ui/brief.js`, in the head of the brief.
- **Evidence.** `brief.js` has no link at all (grep for `href` and `materials/` finds nothing). The brief is what a
  colleague receives (`t5-save-share-chosen.png`).
- **Change.**
  - *Before:* the brief stands alone.
  - *After:* one line: "Material page: materials/M020.html · this product: materials/M020-products.html#G020-xx
    (release …)". On the site, use the absolute address.
- **Benefit.** The person you hand the decision to can read why, in the tool's own explanation, not just the verdict.
  This is the hand-off the pages were built for.
- **Effort.** S.
- **Risk.** A relative link only works where the pages zip is unzipped beside it. Say so in one clause.

### 7. Point to the pages from the cold start panel

- **Place.** The start panel (`app/js/ui/start.js`), under the template cards or in the database line.
- **Evidence.** `shots-1/main-cold-01.png`. The only way to the pages is the small "Material pages" link beside the
  release stamp.
- **Change.**
  - *Before:* the pages are only in the status bar.
  - *After:* one line, "Or read a material whole: the 76 material pages, by family", linked to the same href as
    `#pages-link`, which already carries the selection.
- **Benefit.** The second way in, browsing instead of screening, is visible on the first screen. Task 3 ("arrive at the
  pages without a selection") then starts from somewhere a reader would look.
- **Effort.** S.
- **Risk.** Adds one line to a screen that was just made calmer. Keep it to one line of grey text.

### 8. A *Print this page* button in the page footer

- **Place.** The colophon (`app/pages/sections/footer.js`, and `shell.js` `siteFooter`), beside *Copy the citation*.
- **Evidence.** `t2-page-footer.png`. The page states its purpose as "to read whole, print or send", and it has a print
  stylesheet, but nothing on screen offers it. The selector offers *Print summary* in Compare.
- **Change.**
  - *Before:* the citation only.
  - *After:* *Print this page* (calls `window.print()`) and *Copy the citation*, in the same icon language.
- **Benefit.** It makes the footer the page's place for "take it with you", which mirrors the selector's *Save / share*.
  It answers the owner's footer question: keep it a footer, and make its second column the hand-off column.
- **Effort.** S.
- **Risk.** Hide the button in print, as the other controls are hidden.

### 9. Move the table's shortlist star next to the material name

- **Place.** `app/js/ui/table.js`, `pin-col`, currently the last column.
- **Evidence.** At 1280 × 800 with the rail open, the star is at x = 1364, past the 1280 px window. The table wrapper
  is 908 px wide and the table is 1,073 px (found with `getBoundingClientRect` on the Indoor prototype view). Compare's
  empty state tells you to use that star (`shots-1/walk-compare-01.png`).
- **Change.**
  - *Before:* last column, reached only by scrolling sideways.
  - *After:* a narrow column straight after *Material*, or the star inside the Material cell.
- **Benefit.** Building a shortlist to compare is possible without the drawer. Compare's own instruction becomes true
  on a laptop screen.
- **Effort.** S.
- **Risk.** The interface views and `ui:fuzz` select by column. Update the views.

### 10. *Compare these in the selector* under the page's alternatives

- **Place.** The *Against its alternatives* figure (`app/pages/sections/among.js`).
- **Evidence.** `t4-page-alternatives.png` shows six materials, the material and five peers. The shortlist holds 6
  ("Shortlist 0 of 6").
- **Change.**
  - *Before:* each peer links to its page only.
  - *After:* one link under the figure that opens the selector with these six on the shortlist and the Compare lens
    showing (`s: [...]`, `l: 'compare'` in the hash).
- **Benefit.** It joins the page's best comparison to the selector's judged one. You can see those six against *your*
  requirements in one press.
- **Effort.** S to M.
- **Risk.** It replaces the reader's shortlist. Offer it only when the page was not opened from a selection, or say
  "replaces your shortlist".

### 11. On a phone, the drawer's full name goes on its own line

- **Place.** The drawer head CSS (`.h2-full`) below about 600 px.
- **Evidence.** `t6-phone-drawer.png`. "Polyethylene / Terephthalate Glycol- / Modified" wraps beside the buttons and
  takes about 200 px before the first fact. The page puts the full name on its own line under the name
  (`t6-phone-page.png`).
- **Change.**
  - *Before:* inline beside the name.
  - *After:* `display: block`, smaller, under the name, as the page does.
- **Benefit.** Task 6 shows the answer about 120 px sooner, and the drawer head reads like the page's.
- **Effort.** S.
- **Risk.** None.

## Considered, not recommended

- **Marking the products that pass, or the chosen one, on the page's Products page.** It would close gap 1 fully, but
  the page would then show a verdict it does not compute. That blurs the one difference that makes the two surfaces
  trustworthy. Recommendation 1 gets the same result by sending you back to the drawer, where the verdict is.
- **Adding sort to the drawer's Products tab.** The Products page already does this well, and recommendation 5 is the
  bridge to it.
- **Making a template set *Rank by*.** After a template, results list A→Z with "Rank by: none". That is a
  selector-only question with a decision behind it (templates decide nothing), so it is out of scope here.
