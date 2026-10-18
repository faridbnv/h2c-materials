# Coherence review: the brief

> **Historical record** (2026-10-18): the brief for a review-only round. Nothing in the code or the data changes in it.

## What the owner asked

Filament Atlas has two surfaces an engineer moves between: the **selector** (the main screening page and its material
**drawer**) and each material's **page** (an Overview and a Products page, the index of materials, the method page). Both
were reworked in the last two days (D145, the pages; D146, the selector and drawer). The owner is satisfied with both and
says they are "very good, but also substantially very different". The owner asks for a review, **not a build**: where
are they incoherent, what could each borrow from the other, is more coherence even worth it, and what **small, subtle
fixes** would make them feel like one tool without changing either much. In the owner's words: "I'm satisfied with what
we have right now, but I think with minor tweaks we can improve them."

Specific asks:
- **The material page's footer**: keep it a footer, but it "can be a little bit different". What do you think of it, as UI
  and UX?
- **The drawer against the material page**: what can one borrow from the other to be more coherent? Is more coherence
  beneficial, and how much would it help?
- **Shared elements done two ways**: the dark/light theme control, the logo/mark, and others like them. Both ways are good,
  but different: what minor changes make them feel coherent?
- **The Parallel lines view** (a lens of the selector): how good is it, is it the best way to support a decision and a
  trade-off, or are there better ones? A general review and easy recommendations, nothing built.
- **Words**: are the material pages and the selector/drawer coherent in tone, word choice and language? What minor fixes?
- **UI and UX at large**: graphics, flow, general experience, identity (graphic and experiential), features, use cases.

## Rules for every recommendation

- **Subtle and minor.** No restructuring, no new surface, no new lens. Each recommendation is something a developer could
  do in an hour or two. Prefer aligning to what already works.
- **Say what you would keep.** If a difference between the two surfaces is right (they do different jobs), say so.
- **Name the place** (surface, file or screen), **the evidence** (a screenshot path), **the change** (before → after), its
  **benefit** (who notices, why it matters), its **effort** (S under an hour, M a few hours) and any **risk**.
- No change to the code, the data or anything outside your own folder.

## What there is

Repository: `/Users/farid/Documents/h2c-coherence-review` (main at 0125d29e, built). **Do not run `npm run build`.**

- The selector: `dist/H2C_Material_Selector_2026-09-21_3cc2e5f2a439.html` (open as a `file://` URL). The material pages:
  `dist/materials/` (`index.html`, `method.html`, `M001.html` PLA, `M001-products.html`, `M020.html` PETG, `M110.html`
  PCTG-GF, `M118.html` PEI-CF, `M073.html` PPS-CF). The drawer's *Full page* link opens the page; the page's *Back to your
  results* returns.
- Screenshots: `node docs/audits/2026-10-18-selector-refinement/shots.mjs <file-url> <out-prefix> [--width 1280]
  [--height 800] [--max N] [--eval "js"] [--dark] [--scroll "#lens" | ".drawer-body"] [--css <file>]` (slices of the page
  or of a scrolling element; `--eval` can click: a template `[data-template="1"]`, a table row `tr[data-material="M001"]`, a
  drawer tab `.drawer [data-tab="Mechanical"]`, a lens `[data-lens="parallel"]`). Write your shots into your own folder
  below and read them with the Read tool. A prepared set of the selector after the last round is in
  `docs/audits/2026-10-18-selector-refinement/review/shots-1/`.
- Docs worth a skim: `docs/INTERFACE.md` ("The frame", "The material drawer", "The material pages", "Words", "One
  candidate set, five lenses"), `docs/DECISIONS.md` D124, D145, D146. The last reviews:
  `docs/audits/2026-10-18-selector-refinement/review/REVIEW-1.md` (selector, 70/100) and
  `docs/audits/2026-10-17-pages-reimagined/review/REVIEW-3.md` (pages, 72/100). Known open items:
  `docs/OPEN-PROBLEMS.md` §37.18 to §37.20.
- The reader: a mechanical or manufacturing engineer on a small team choosing an FDM filament for a Bambu Lab H2C.

## What you hand in

`docs/audits/2026-10-18-coherence-review/<your folder>/REVIEW.md`: one screen of findings first (what is coherent, what is
not, your verdict on the owner's questions), then **at most 12 recommendations**, ranked by benefit for effort, each with
the fields above. Screenshots in your folder. Be direct and specific; the owner reads this.
