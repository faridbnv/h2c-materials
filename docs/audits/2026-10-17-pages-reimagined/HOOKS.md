# The pages' data hooks, for the checks

> **Current** (2026-10-17), working notes of the pages-reimagined round: the attributes each track's markup emits so
> `test/pages.check.js` and the interface probe can hold a page to the facts without parsing its words.

## Files (track A)

Per material the page rule admits: `materials/<id>.html` (Overview), `materials/<id>-products.html` (Products),
`materials/<id>-records.html` (a stub that redirects old links). Once: `materials/index.html` (hub),
`materials/method.html` (How the numbers are worked out, track B), `materials/assets/pages.css`, `assets/page.js`, the
two font licences. Budgets: `app/pages/budget.js` (`main` for Overview, hub and method; `products`; `records` for the
stub; `css`; `script`; `set`).

## Every page (A)

- `main[data-page="overview|products|hub|method|stub"][data-material][data-release][data-snapshot][data-build]`.
- Each section `<section data-section="<id>">`; the bar's section list `a[href="#<id>"]`, one per non-empty section.
- Tabs `a[data-tab="overview|products"]`, the products count in `data-n`.
- Return links `a[data-return]`: the static href is the fallback (`selectorLink`: a fresh selection with this
  material's drawer open; the hub's opens the selector with none); `page.js` rewrites it from sessionStorage
  `atlas-return` (set from `?from=`, the selector's `toHash` JSON, with `m` set to the page's material).

## Overview

- Key-figure plate: each cell `[data-key][data-v][data-n]`, or `[data-state="as-published|missing|na"]`; its small
  drawing `svg[data-mini=<key>][data-n]` (C).
- On the H2C rows `[data-print="nozzle|bed|chamber|drying|hardened"]`.
- Printing's settings table rows `[data-print="nozzle|bed|chamber|drying|hardened|ams"]` (B).
- A number in a sentence stating a compiled value: `span[data-v][data-key]` (B).
- Stand-out product lines `[data-grade]` (B).
- Records the Overview holds carry `data-rec="<ID>"`: statements about the material in general (Uses), documents and
  known gaps (Sources) (B).

## Figures (C)

- `figure.fig#fig-<slug>[data-figure]`: `fig-alternatives` (peers), `fig-among-materials` (maps),
  `fig-products-<id>` (strips: mechanical, thermal, density-price), `fig-layers`, `fig-temperatures`.
- Product mark: `data-grade`, `data-key`, `data-v` (raw compiled value), `data-kind` (compared, as-published, variant,
  annealed, claimed; space-separated). On maps and layers `data-key`/`data-v` are the vertical value and
  `data-xkey`/`data-xv` the horizontal one. Map products are those with both values compared and not modified; layer
  points are exactly `layerPairs`.
- Material mark: `data-mat`, `data-key`, `data-v` (the median). Peers rows `[data-mat]`, `data-alt="1"` for an
  alternative, `data-self` for this material; an open cell `data-kind="as-published"` with `data-v` the highest published.
- Temperatures: print rows `[data-print="nozzle|bed|chamber|drying"]` with `data-limit`; drying marks
  `data-key="drying"`; one-end print marks carry `nozzle`, `bed` or `chamber`; service rows `[data-key]`.
- Folds `details.fig-data` (the figure as a table); method links to `method.html#alternatives|maps|products|layers|temperatures`.

## Products (A)

- Each product row `details[data-grade]`; reference and study specimens in `[data-group="reference"]`; the visible
  count `[data-count]`.
- Every record in a card `[data-rec="<ID>"]` (measurements, print profiles, maker statements, environment statements
  tied to a product, price listings), with `id` where it is an anchor (`V…`); documents in cards `[data-doc]` (their
  `data-rec` is in the Overview's Sources only).
- Every record of a material appears exactly once across its Overview and Products page.

## Hub (A)

Each material `[data-mat]`, an `a` where it has a page; names that are not materials `[data-alias]`.

## Words the checks refuse anywhere on a page

"counted products", "(of ", "not compared", "special formulation", "drawn but not counted", "Key values", and the
coinages INTERFACE "Words" rules out.
