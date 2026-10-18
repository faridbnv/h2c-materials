# UI and visual: proposal (Part B)

> **Working proposal** (2026-10-18), selector-refinement round. It answers [REVIEW-0](../review/REVIEW-0.md) F4, F3, F10,
> F13, F14 and my own finding (section heads are the faintest type), against [KEEP.md](../KEEP.md). Inventory:
> [INVENTORY.md](INVENTORY.md). Mocks are CSS and DOM moves on the built file (`dist/…7f3f14384dab.html`, which predates
> 862f67b0), in `ux/mock-*.css` / `ux/mock-*.js`, shot with `shots.mjs --css --eval`.

## Vision

The tool already has the right parts. What tires the eye is **chrome, and structure carried by the faintest type**.
Today a third of the drawer's first screen is header and tabs. The section heads are 12.5 px grey capitals at 3.5:1, so
the reader finds structure from the bold lines underneath. On the main page, the loudest box answers a question nobody
has asked yet. The cure is subtraction and a stronger hierarchy, not new parts:

- **The frame gets thinner.** The drawer's header takes two lines and its tabs one row. The top bar is one line high,
  with no panel. The table's controls sit on one row.
- **Headings lead.** Section heads become the material page's plate heading: sans, 600, ink, sentence case. This one
  rule makes the drawer read top-down and makes it look like the page it hands off to (P4).
- **Each fact has one place, in one layout.** Printing on the H2C becomes one block of gate rows (K19). Key properties
  come before printing. The lede no longer restates the header chip.
- **Grey text that has to be read reaches 4.5:1.** This uses a selector text token in `app.css`; `tokens.css` and the
  pages stay unchanged.

Nothing on the main page moves place. Every lens, rail group, control, template and column stays.

## Changes, ranked

| # | Change | P | Answers | Keep items | Fed by | Size | Risk (guardrails 6, 7) |
|---|---|---|---|---|---|---|---|
| 1 | **Drawer chrome.** Name and full name on one line; identity and status chip on the next. **Tabs on one row**: counts only on Products and Sources. A tab at 0 stays grey through `data-empty`. Padding 6 px, 13 px type. **The tab sentence leaves the sticky strip**: it becomes the first line of each record tab's body; Overview drops it, since its answer is its purpose. Content starts at **148 px instead of 261**. | P2 | F4, M3a/b | K12, K15 (link untouched), K29 (kept on 7 tabs, dropped on Overview: **owner's word**), K38 | `detail.js` renderDrawer head and tabs (≈443–472), `TAB_HELP`; `app.css` 386–407 | S | Tab keys unchanged (Grades, Evidence, Coverage still land). `aria-describedby` moves with the sentence. |
| 2 | **Section heads in the page's plate style; small grey text at 4.5:1.** `h3.sec` becomes 15 px / 650 / `--ink` / sentence case, the same as the page's `.h2c-h h2`. A new `--ink-3-text` in `app.css` (#6e6e66 light: 5.1, 4.8 and 4.6:1 on surface, bg and surface-2; #8f939c dark: 5.4, 5.9 and 4.9:1) replaces `--ink-3` in **text** rules only (the mock does this for the drawer's small text). Borders, marks and the grey 0-tab keep `--ink-3`. Uppercase labels in the results area go to sentence case (`.pill-label` "REPORTED, NOT REQUIRED", `.shared-head`, `.ws-label`): the frame's rule, extended. | P2, P4 | own finding; M6 | K01, K39 | `app.css` 486, 1203, 446, 565, 609; the text rules among the 88 `color: var(--ink-3)` | S–M | `tokens.css` unchanged. `app/css` is in the pages' `CODE_ROOTS` (`stage.js` 32), so the pages' stamp re-renders but their CSS does not change. |
| 3 | **Overview order and one printing block.** With requirements: answer, Your requirements, **Key properties** (estimates beneath, K16), **Printing on the H2C**, applications, limitations, guidance, On file, the allowables line. **The bullet count list folds into the gate rows**: each row's reason line carries its count, the same `printCountWords`. Nozzle, bed and chamber keep the chip column. Hardened nozzle, drying and AMS become label and value rows, with no chip, like the page's *On the H2C* plate. **The lede goes where it restates the header chip**; the chip's popover keeps the sentence. An excluded material says it once: the banner and the chip, no second sentence. The words and coherence experts own the one window and its numbers (F1, F7, F15); this change is the frame they fill. | P3 | F4, F1, F15; M3c | K07, K08, K16, K19, K36, K27 | `detail.js` 1001–1045 (`lede`, `numbers`, `print`), 674/709–711 (`productPrintCounts`), `gateLine` | M | `ui-probe` view 15 reads `.print-counts`, and text views 13, 14 and 30 move: say so in the snapshot. `ledeWords` (`material-words.js`) is not used by the pages. |
| 4 | **The missing-data setting, quiet in place.** No panel, tint or border. The label sits beside the choice on one line, and the segmented control is smaller. **The estimates switch shows only under Include uncertain**, in the same place. Its "?" moves next to the choice so a reader still learns estimates exist (mock 2 hides it with the group). Top bar: **78 to 58 px**. | P2 | F3 | K01 | `index.html` 34–62; `main.js` 614–622 (`est-group.hidden = !explore`); `app.css` 74–78, 87–91 | S | **Owner's word**: this reverses "shown in both modes" (INTERFACE ≈316, the `index.html` comment). `ui-fuzz` sets `#use-estimates` from script (624–632, I3 at 807), and `hidden` does not block that. Confirm in the build. |
| 5 | **The rail opens on what a part needs.** `OPEN_BY_DEFAULT` loses Material family, which still opens by itself when a family or polymer is ticked. Its badge names the build-material check ("Build materials only") instead of "1 set". Density moves **from about 850 px to 290 px**. | P5, P2 | F14 | K04, K44 | `filters.js` 32, 92–101 | S | Moving the check out of the group would be a control move: **owner's word**, not proposed. |
| 6 | **Cold start panel, tighter.** The four-step line is folded away (**owner's word**: it is not a control, and the alternative is one quiet line). The intro takes one line. Cards are tighter, with `align-content: start`: at 1180 px their text floats to the middle. Facts and the promise sit closer, and the promise keeps its words (K25). **"not tested" becomes quiet text, not a chip**: ui-fuzz reads the text, which stays. Removing the text would need `ui-fuzz.mjs` 387 and `table.js` 308/715. Table bar: **761 to 573 px** at 1280×800 and **891 to about 700 px** at 1180×760. M2a's "≥ 3 rows" also needs the words expert's shorter cards, since "within H2C temperature limits" in five of them costs a line in four. | P2 | F3, F14 (third point); M2a/b | K03, K23, K25, K05 | `start.js` 22–50; `app.css` 1102–1124, 1417; `table.js` 308 (style only) | S | None for the checks. Rows reach the fold only with shorter cards. |
| 7 | **Results header and table, one control row.** The column-set caption is hidden visually; it is still read aloud, and the buttons' titles hold it. Rank by and Compare against join the Properties / Printing row, and cell padding goes from 10 to 7 px. The first row moves **from 580 to 497 px**, and three rows show under Indoor. The legend is tighter, but "n/a" still wraps at 1280: one line needs a shorter label, from the words or graphs expert. The doubled "87" belongs to the words expert; `#count` is read by fuzz and is left alone. | P5 | F10 | K05, K24, K28, K34, K40 | `table.js` 521–543; `app.css` 1297–1304, 320 | S | The cell form `lo–hi ·` and the legend text are unchanged. |
| 8 | **Phone: the tab strip says it scrolls.** The strip's right edge fades (`mask-image`), with end padding so the last tab scrolls clear. `keepInView` already brings the open tab into sight. *Full page* is already labelled "Page" (862f67b0). | P2 | F13 | K15 | `app.css` 922–925 | S | None. |
| 9 | **A heading that draws products says so; Printing opens on its graph.** In Mechanical and Thermal, a comparison heading carries a small strip-plot glyph in the frame's icon language (20 px, 1.7 stroke). Plain property lists carry none. *Print temperatures across products* opens by default, and the makers' profiles follow. | P3 | F4 (reading flow) | K10, K17, K18 | `detail.js` comparison summary and Printing tab; one icon path | S | Overlaps the graphs expert: the executor merges. |
| 10 | **Bookkeeping folded, never dropped.** In a print profile, rows reading "Not published" collapse to one line ("6 settings not published: bed, chamber, …"). The ID, *where* and *review note* chips move to the end of the record's locator line as one quiet group, never before the value. | P3 | F6 | K11, K13, K21, K22 | `detail.js` profile rows and record footer | M | `drawer-ids.mjs` must reach the same set: the IDs stay in the DOM. |

**Cut or quieten.** Cut tab counts other than Products and Sources; the Overview's tab sentence; the lede where it
repeats the chip; the bullet count list (it moves into the gate rows); the four-step line (owner's word); the settings
panel's box; the disabled estimates switch under Confirmed only (owner's word); the open family list at load; the chip
on "not tested"; and the column-set caption. Make every uppercase grey label sentence case.

## Before and after (three mocks)

| Mock | Before | After | What moves |
|---|---|---|---|
| 1 Drawer first screen (changes 1–3, 8) | `shots/base/drawer-pla-overview-01.png`, `-02`; phone `shots/base/drawer-pla-overview-phone-01.png` | `ux/shots/mock1-drawer-after-01.png`, `-02`; phone `ux/shots/mock1-phone-after-01.png` | Content from 261 to 148 px. The answer box from 310 to 175 px. Answer, requirements and all ten key properties on one screen. Overview body from 1,594 to 1,466 px, in a taller pane (about 3 screens down to about 2.2). |
| 2 Cold main page (4–6) | `shots/base/main-cold-01.png`, `main-cold-1180-01.png` | `ux/shots/mock2-cold-after-01.png`, `mock2-cold-1180-after-01.png` | Top bar from 78 to 58 px. Table bar from 761 to 573 px. Rail opens on Mechanical. |
| 3 Indoor results (2, 4, 5, 7) | `shots/base/main-indoor-01.png` | `ux/shots/mock3-indoor-after-01.png` | Column header from 540 to 458 px, first row from 580 to 497 px, three rows in view. Sentence-case label. |

Also mine, for the graphs and coherence experts: `ux/shots/pla-Mechanical-open-*`, `pla-Printing-open-*` (headings
opened) and `page-pla-01` (the page's plate and tiles, the reference for change 2).
