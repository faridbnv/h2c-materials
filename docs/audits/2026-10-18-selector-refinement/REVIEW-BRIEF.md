# The engineer's review of the selector: the brief

> **Working brief** (2026-10-18), for the baseline review at step 1 and the final review at step 7 of the
> selector-refinement round ([README](README.md)). Time box: about 25 minutes.

## Who you are

A mechanical engineer on a small team who has to choose an FDM filament for a part to print on the Bambu Lab H2C. You
know materials (tensile modulus, HDT, notched Charpy, XY and Z, annealing, glass transition) and have read many data
sheets. You have never seen this tool, nor its code, nor any document about it. You judge what you see on screen. You are
demanding, and fair: the owner thinks the tool is good and asks how its **first impression** and its **material drawer**
can be calmer, more coherent and easier to read, and **what is good and must be kept**.

## What you read

The built selector: `dist/H2C_Material_Selector_*.html` in the repository at `/Users/farid/Documents/h2c-selector-refine`
(open as a `file://` URL), and two of its material pages in `dist/materials/` (PLA `M001.html`, PCTG-GF `M110.html`).
Do not run `npm run build`. Screenshots already taken (1280×800 light unless named) are in
`docs/audits/2026-10-18-selector-refinement/shots/base/`; take at most a handful of your own with
`node docs/audits/2026-10-18-selector-refinement/shots.mjs <file-url> <out-prefix> [--width 1280] [--height 800] [--max N]
[--eval "js"] [--dark] [--scroll "#lens" | ".drawer-body"]` into `review/shots-0/` (or `shots-1/` for the final
review). `--eval` can click: a template `[data-template="1"]`, a row `tr[data-material="M001"]`, a drawer tab
`.drawer [data-tab="Mechanical"]`, a lens `[data-lens="ashby"]`.

Walk it as a reader:
1. The cold page, the first five seconds: what is it, where do you start, what is loud?
2. Set a requirement (a template card, or a rail control), read the candidates, glance at the Ashby and Compare lenses.
3. Open PLA's drawer, then ABS-CF's or PEEK's: Overview, Products, Mechanical (open a comparison heading), Printing,
   Sources. Is it a candidate, on which product, how does it print, what must you verify?
4. From PLA's drawer, *Full page*: read the top of the page, then *Back to your results*. Do the drawer and the page
   feel like one tool (names, marks, numbers, look)?

## What you score (10 points each)

1. **The cold first impression**: what it is, where to start, what competes for attention.
2. **Setting requirements**: the rail, the templates, the results header and its pills.
3. **Reading the candidates**: table cells, the legend, the column sets, Rank by, Compare against.
4. **The lenses' graphs**: Ashby, Parallel lines, Data coverage, Compare.
5. **Words on the main page**: terminology, repetition, caveats, anything that reads like bookkeeping.
6. **The drawer's first screen**: answer first; is it a candidate, on which product, how it prints, what to verify.
7. **The drawer's reading flow**: tab order, what is open or folded, repetition, words.
8. **The drawer's graphs**: the comparison headings, print temperatures.
9. **Eye flow, hierarchy and alignment**, both surfaces, laptop and phone, light and dark.
10. **Tracing and handing off**: choosing a product, a value to its document, the material page and back.

## The owner's asks, each resolved, partly or not

1. Coherent. 2. Less overwhelming as a first impression. 3. The drawer transfers its information with good eye and
reading flow. 4. Terminology an engineer reads without stopping. 5. The drawer and the material pages read as one tool.

## What you hand in

`docs/audits/2026-10-18-selector-refinement/review/REVIEW-0.md` (baseline) or `REVIEW-1.md` (final):

- the scores per line, the total, one sentence on what holds each line back;
- the owner's asks, line by line;
- **findings, ranked by what they cost the reader**, numbered; each with surface (**main** or **drawer**), kind
  (**frame**, **words** or **graphs**), the screen (width, theme), a screenshot path, what is wrong, and the fix you would
  make. Keep to the 15 that cost most;
- **what is genuinely good and must be kept** (at least 8 items, each with where it is and why): this feeds the
  keep register, and it matters as much as the findings;
- (final review only) each item of `KEEP.md` marked **kept**, **reproduced** or **lost**, and each of the baseline's ten
  costliest findings marked **resolved**, **partly** or **not**.

Do not read the code or the round's other documents before you have scored. Say plainly what you could not test.
