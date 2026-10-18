# The shared frame and identity: selector against material pages

> **Historical record** (2026-10-18, coherence review, ui-frame lens). Reviewed by Claude Opus (agent), about 30
> minutes, on main at 0125d29e as built. Nothing in the code or data was changed. The screenshots are in `shots/`. The
> footer mock-ups (`footer-A-*`, `footer-B-*`) were made with CSS and DOM injected into a built page.

## Findings at a glance

**What is already one tool.** The mark and the wordmark are the same SVG drawn the same way on both surfaces (26 px,
9 px gap, 16 px / 700 / -0.015 em). Both read one palette from `tokens.css` in light and dark, and the status colours
appear only in the selector, which is right because the pages decide nothing. Both use the same segmented control: the
selector's lens tabs and the page's *Overview | Products* are one component. The focus ring is the same (2 px accent,
2 px offset). Icons are drawn in the same 20 px, 1.7-stroke line style. Buttons are built the same way (surface fill,
`--border-strong` edge, 7 px radius). Both remember the theme under the same key (`h2c-theme`), and both follow the
system's theme until the reader chooses one. That is a good base. The differences below are small, and each one is
noticed at the moment a reader crosses from one surface to the other.

**Differences that are right (different jobs: keep them).**
- An app bar against a document bar. The selector's bar runs edge to edge (the brand at x = 16), while the page's bar
  sits within the 1120 px column (the brand at x = 80). One is a workspace and the other is something to read.
- Underline tabs in the drawer (eight tabs in 620 px) against a segmented control on the page (two pages).
- Newsreader for names, section titles and the summary on the pages, and none in the selector's controls.
- A search box, the missing-data settings and Save / share live only in the selector's bar. The page's bar has the
  breadcrumbs and the way back.

**Differences that should align.** Each is explained in a recommendation below.

| Element | Selector | Material pages | Verdict |
|---|---|---|---|
| Theme control: icon | moon or sun, showing the theme a press switches to | half-filled disc, the same at all times | align to the selector |
| Theme control: words | "Switch to dark theme" | "Dark theme" | align to the selector |
| Theme control: box | 34 px, radius 8 | 36 px, radius 7 | align |
| Stored theme applied | by the app script at the end of the 8.4 MB file | by a head script, before the first paint | selector: add the head script |
| Bar background | `--surface` (white), 58 px | `--bg` (warm grey), 56 + 1 px | page bar to `--surface` |
| Sans typeface | system stack (SF Pro on a Mac, Segoe UI on Windows); Inter is not loaded | Inter, embedded | one face |
| The mark links to | nothing (it is an `h1`) | the index, as the *Materials* crumb beside it also does | one meaning |
| The mark on a phone | hidden, so there is no identity on a 390 px screen | kept (the name is hidden) | keep it on both |
| Provenance | "data 2026-09-21 · release 3cc2e5f2a439" | "release 3cc2e5f2a439. Documents read 2026-09-10 to 2026-10-05; built 2026-10-17." | one string |
| The way across | "Full page", with no icon | "← Open in the selector" / "Back to your results" | mirror the arrow |
| Radii | 6, 7, 8, 9, 11, 999 | 6, 7, 10, 12, 999 | three tokens |

One contradiction stands out. An engineer who sees "data 2026-09-21" in the selector and then "documents read … to
2026-10-05" on the page will reasonably ask which is current. The 2026-09-21 is the name of the snapshot, not a date of
the data, but the selector prints it as one.

**The footer (the colophon).** Its content is good: the standing sentence, the way back, the release, who wrote the
summary, and the citation. As a footer it has four problems:
1. It does not read as the end of the page. It sits on the same `--bg` as the content behind one hairline, which is how
   every section is divided, and its 16 px standing sentence reads as the last paragraph of Sources (`page-pla-14.png`).
2. The fine-print column is three grey paragraphs. The documents-read span appears in it twice, and a third time in
   Sources just above, in a different date format ("10 Sep–5 Oct 2026" against "2026-09-10 to 2026-10-05").
3. The three page kinds end three different ways:
   - Overview: two buttons, the method link and three lines of fine print.
   - Method page: *Open the selector* and *All materials*.
   - Index: no buttons at all.

   The material page's footer is the only one without *All materials*.
4. On a phone, the return button in the footer shows the bar's short label, "← Selector", although the footer has the
   full width (`page-pla-phone-21.png`).

**My verdict on the footer: keep it a footer and make it a band.** Of the three options in R5, I recommend B. It puts
the colophon on a full-width `--surface` band, and closes the page with one sign-off line that starts with the mark
and gives the provenance once, in the same words as the selector's status bar. Both surfaces would then end the same
way: a quiet strip with the mark's colour and the release. It is a little different from today, it still says that the
page has ended, and it removes repetition rather than adding anything.

**Is more coherence worth it?** Yes, for the frame, but only for the parts a reader touches when crossing from one
surface to the other: the bar, the theme button, the mark, the arrow, the provenance and the typeface. Do not go
further. The drawer is a dense instrument and the page is a document, and making them identical would hurt both.

## Recommendations, ranked by benefit for effort

### R1. One theme control, and no flash of the light theme on the way back (S)
- **Where:**
  - `app/pages/shell.js` (`ICON.theme`, the `THEME` head script)
  - `app/pages/assets/page.js` (`paintTheme`)
  - `app/index.html` `<head>`
- **Evidence:**
  - `z-sel-topbar-right.png` (the moon) against `z-page-bar.png` (the half disc)
  - Measured on a local file: with dark stored and a light system, the selector's body and top bar were in the DOM in
    the light theme at 60 ms, and switched to dark at about 145 ms. The selector applies the stored theme only in
    `start()` (`main.js:1101`), and that script comes after the frame and about 8 MB of data. Over the network the gap
    is longer.
- **Change:**
  - On the pages, the half-disc icon becomes the selector's moon and sun pair, with the same toggling.
  - On the pages, the words "Dark theme" become "Switch to dark theme" / "Switch to light theme", as the accessible
    name and the title.
  - One button box on both: 36 × 36 with radius `--radius`.
  - The pages' one-line `THEME` script is copied into the selector's `<head>`.
- **Benefit:** the most-used shared control looks and speaks the same on both surfaces. A reader in dark mode no longer
  sees a white flash every time *Back to your results* reopens the selector.
- **Risk:** none of note. The interface views will show the new icon (`ui:check -- --write`).

### R2. One provenance string on both surfaces (S)
- **Where:**
  - `main.js:1123` (the `#meta` text in the selector's status bar)
  - `app/pages/sections/footer.js` (`.col-fine`)
  - `index-page.js` and `shell.js` `siteFooter`
- **Evidence:** `z-sel-statusbar.png` against `page-pla-14.png`, `method-07.png` and `index-03.png`.
- **Change:** before, the selector shows "data 2026-09-21 · release 3cc2e5f2a439" and the three page kinds each word
  it differently. After, both surfaces use one helper (for example in `format.js`) that prints "release 3cc2e5f2a439 ·
  documents read 10 Sep – 5 Oct 2026 · built 17 Oct 2026". Every visible date uses the page's day-month form, and the
  snapshot name moves into the tooltip.
- **Benefit:** the two surfaces stop appearing to disagree about how current the data is. This is the one place in the
  frame where the difference could mislead, not just look different.
- **Risk:** the title text and any test that reads `#meta`. The citation keeps ISO dates if the owner prefers them for
  citing.

### R3. The page bar on the selector's surface (S)
- **Where:** `frame.src.css` `.atlas-bar`.
- **Evidence:** `sel-cold-01.png` against `page-pla-01.png`, and `z-sel-topbar-dark.png` against
  `z-page-bar-dark.png`.
- **Change:** `background: var(--bg)` becomes `var(--surface)`, and the bar's height becomes 58 px. The centred
  content width stays as it is.
- **Benefit:** the strip at the top of the screen, the first thing the eye compares after *Full page*, keeps its tone.
  The page then reads as the same tool showing a document, not as a different site.
- **Risk:** the white bar sits closer in tone to the white key-figure plate below it. In the shots I see no clash,
  because the hairline separates them.

### R4. The mark means the same thing everywhere (S)
- **Where:**
  - `shell.js` (`.bar-brand href="index.html"`)
  - `app.css:998` (`.topbar h1 { display: none }` on a phone)
- **Evidence:** `z-page-bar.png` (the mark and *Materials* both lead to the index), and `sel-cold-phone-01.png` (no
  mark).
- **Change:**
  - On the pages, the mark leads to the selector: the tool's home, carrying the reader's selection. `page.js` already
    rewrites `[data-return-brand]` links. *Materials* stays the way to the index.
  - On a selector phone, hide `.brand-name` only, so the 26 px mark stays.
- **Benefit:**
  - The usual convention holds: the logo goes home.
  - The bar loses a duplicate link.
  - The selector keeps its identity on a phone, as the pages do.
- **Risk:**
  - This reverses one line of D145 ("the mark and Materials to the index"), so the owner should decide it.
  - On a phone the search box loses 34 px.
  - If the owner prefers the index, keep it. The selector's mark could then lead to `materials/index.html`, so that
    the mark means "the atlas of materials" on both surfaces.

### R5. The footer: a band that ends the page (S to M)

Three options, all of which keep it a footer. Mock-ups: `footer-0-now.png`, `footer-A-band.png`,
`footer-B-band-signoff.png`, `-dark` and `-phone`.

- **A. The band (S).** The colophon sits on a full-width `--surface` band. No hairline is needed, because the edge of
  the band is the divider. Nothing else moves.
  - It says "the page ends here" and echoes the selector's white status bar.
  - Implementation note: `.page` has `overflow-x: clip`, which clipped the full-bleed band in my mock-up. The footer
    has to be rendered just after `</main>` in `shell.js`, not inside it.
- **B. The band and a sign-off line (M). Recommended.** This is A, plus:
  - *All materials* is added to the button row, so all three page kinds offer the same ways out.
  - The fine-print column keeps the summary's authorship and the citation.
  - The release and dates leave that column for one closing line across the full width: the 18 px mark, **Filament
    Atlas** · release · documents read · built, in R2's words.
  - The footer's return button keeps its long words on a phone. Scope the `.ret-long` / `.ret-short` swap to
    `.atlas-bar`.

  This removes two repetitions and gives the page a signature that matches the selector's provenance.
- **C. A citation plate (S, on top of A or B).** The citation becomes a small plate: `--surface`, a hairline, radius
  12, the citation in Inter at 14 px, and *Copy the citation* as a real button. It helps the "print it or send it"
  reader. Do it only if citing turns out to be a real use, because it adds weight.
- **Risk:** the colophon checks (`pages:check`, P12) read the summary-status words. B keeps those words. Printing is
  unchanged: the band falls back to white on paper.

### R6. One sans typeface: Inter in the selector (M)
- **Where:**
  - `tokens.css` `--sans`
  - `build/src/bundle.js`, which would inline the existing `Inter-Variable.subset.woff2`
- **Evidence:** the probe found Inter loaded on the pages and no web font loaded in the selector. On a Mac the selector
  is in SF Pro; on Windows it would be in Segoe UI. Compare the figures in `z-sel-drawer-head.png` with
  `z-page-head.png`.
- **Change:** put "Inter" first in `--sans`, and embed the same 60 KB subset in the selector (about 80 KB in base64,
  about 1 % of the 8.4 MB file).
- **Benefit:** the same number, for example "2.53 GPa", is drawn with the same glyphs in the drawer and on the page.
  The difference is felt more than seen on a Mac, and it is plain on Windows, where the team may be.
- **Risk:**
  - Inter runs slightly wider than SF Pro, so the top bar's one-row breakpoints (1101 to 1250 px) need a check.
  - The interface views will change wholesale (`ui:check -- --write`).

### R7. *Full page* takes the arrow that mirrors the way back (S)
- **Where:** `app/js/ui/detail.js:461`.
- **Evidence:** `z-sel-drawer-head.png` against `z-page-bar.png`.
- **Change:** "Full page" becomes "Full page →", drawn with the 20 px arrow from the shared icon set (the mirror of
  `ICON.back`). On a phone it becomes "Page →".
- **Benefit:** the two halves of one round trip look like a pair, and the arrow says that this navigates in the same
  tab. It does not open a dialog.
- **Risk:** none.

### R8. The drawer's material name in Newsreader (M, optional)
- **Where:** `app.css` `.drawer-head h2` and `.h2-full`.
- **Evidence:** `z-sel-drawer-head.png` ("PLA" in 21 px bold sans) against `z-page-head.png` (Newsreader at 64 px,
  with the full name in Newsreader italic).
- **Change:** the name is set in Newsreader 600 at 24 px and the full name in Newsreader italic. Embed a subset of one
  roman and one italic weight covering basic Latin, about 20 to 30 KB, not the 250 KB set the pages use.
- **Benefit:** this is the strongest single cue that the drawer is the page in short. The reader recognises the name
  before reading it.
- **Risk:** a second web font in the selector. Do this only after R6, and only if the owner likes the look.

### R9. Three radii, one button weight (S)
- **Where:** `tokens.css`, `app.css` (`.segmented` 9 / 6, `.topbar .btn` 8, `.btn` weight 400) and `frame.src.css`
  (`.tabs` 10 / 7).
- **Change:** move `--r-ctl: 7px`, `--r-track: 10px` and `--r-plate: 12px` into `tokens.css`, and use them on both
  surfaces. The selector's segmented control goes from 9 / 6 to 10 / 7, its top-bar buttons from 8 to 7, and `.btn`
  takes font-weight 500 as the pages' does.
- **Benefit:** the lens tabs and the *Overview | Products* tabs become identical to the pixel, and buttons carry the
  same weight on both surfaces. Few readers will see this, but the surfaces will feel more alike.
- **Risk:** none. The interface views will move by a pixel.

### R10. No 10 px text in the drawer's head (S)
- **Where:** `app.css:1078` (`.chip-small { font-size: 10px }`).
- **Evidence:** `z-sel-drawer-head.png`: "Type on Bambu Lab's H2C list" is set at 10 px / 650, the smallest text in
  either frame. The page says the same thing in a 16 px sentence.
- **Change:** 10 px becomes `--t-label` (12.5 px), at weight 600.
- **Benefit:** it can be read without zooming, and it matches the selector's own type scale (12.5 px minimum).
- **Risk:** the drawer's head may grow by about 2 px.

### R11. One search field (S)
- **Where:** `frame.src.css` and `products.src.css` (the search on the index and the Products page).
- **Evidence:** `sel-cold-01.png` (a filled `--surface-2` pill) against `index-01.png` and
  `page-pla-products-01.png` (a white pill).
- **Change:** the pages' search takes the selector's fill and its focus state (a white fill with an accent edge).
- **Benefit:** the same control looks the same wherever a reader types a material's name.
- **Risk:** none.

## What I would not change
- The centred document bar on the pages, and the flush app bar in the selector.
- The drawer's underline tabs.
- The status chips, which belong only in the selector.
- The standing sentence in the footer, word for word.
- The shared tokens and the focus ring.
- The breadcrumbs with the section in view, a good idea the selector has no need for.
