# The open-problems pass of 2026-10-02

GOALS steps 2, 4 and 5; C3, C5, C6, C9, C13, C15. Decisions D121, D122 and D123. On 2026-10-02 the owner asked for a
priority list of everything [OPEN-PROBLEMS.md](../../OPEN-PROBLEMS.md) holds, then for every fix an agent can make on
its own, with the decisions that list recommended, and Claude Sonnet agents wherever they could do the work.

## The priorities, and what was done with each

Wrong answers first, then values the held sheets print, then what only people can do, then unknowns, then hygiene.

| Priority | Item (OPEN-PROBLEMS) | Done | Where |
|---|---|---|---|
| P1 | Print profiles still 5 % wrong in deciding fields (§28) | A fresh draw of 40 found 1 (2.5 %), under the 3 % target; a second, blind reader found none. Its family fixed on 18 profiles; Recreus PET-G's garbled bed and Eryone's "75℃-85, 6h" read | m299, `process.js`, `propose.mjs` |
| P1 | The import's fibre sentence on 174 profiles (§28) | The rule is in method.csv and said as one; profiles say what their sheets say | m296, D121 |
| P1 | A stress at 100 % elongation deciding as a strength (§11) | Five properties, one per stated elongation; 25 rows re-filed; the lexicon reads them | m297, D122 |
| P1 | One product on two grades (§13, §14, §16, §28) | 29 products merged into one grade each, records moved with their IDs | m302, D123 |
| P1 | A published bound drawn as a plain number (§21) | "> 300 %" everywhere a value is shown; exports keep it machine-readable | `format.js`, `products.js` |
| P2 | Values the held sheets print and nobody read (§11, §15, §18, §28) | 242 values (Nobufil's FDM H column, BASF's per-direction columns and impact tables, Raise3D PET CF V4.0, colorFabb LW-PLA/LW-PLA-HT, Stratasys XZ heat deflections, PolyMide CoPA wet, Nanovia Flex V0) and 35 cells corrected | m298 |
| P2 | Polymaker's letter-spaced specimen heading; Eryone's and SUNLU's specimen notes (§12, §18) | 197 page_context rows; 626 bars' print parameters | m300 |
| P2 | Eryone's "X-Z" (§18) | The owner's ruling: Z, 72 tensile rows on 27 sheets | m301, D123 |
| P3 | A person's spot-check (C3), the team trial (C7) | Not done: they need people | |
| P4 | Products one fact from an answer; 255 maker questions (§15, §19) | Not done: the targeted product tranche is a campaign decision, and writing to makers is the owner's | |
| P4 | Chamber stated only in words (§12) | 3DXSTAT ESD-PLA has its maker page's recipe; SUNLU PP and QIDI ASA-Aero left (their words ask for nothing settled) | m299 |
| P5 | Cold `verify:fast` over budget (§19) | Measured: 29.6 s warm, 68.2 s cold, within 90 s | |
| P5 | Detectors outside the repository (§28) | `npm run audit:profile-marks`, byte-identical output to the original | `scripts/audit/profile-marks*.mjs` |
| P5 | A measurement's stale Parse review unchecked (§28) | PARSE-REVIEW-STALE checks measurements too | `typed-values.js` |
| P5 | `--refetch --recheck` overwrote an applied document's digest (§19) | The digest stands; new bytes are stored as an unregistered revision | `fetch.mjs` |
| P5 | Chamber bands on five aliases (§12) | Removed through the ledger; the build refuses them | m303, `chamber-estimates.js` |

Also found and fixed on the way: two copies of Eryone's PETG-GF sheet on one product (m304); the D93 enclosure
declaration on three merged products whose other sheet states the chamber (m302); a heat deflection's flat bar
preferred to an edge one for a headline with no direction (`products.js`); the post-processing reader's "before
annealed" and "without annealing"; the campaign status closing a merged product's frozen target into the kept one's.

## Method

- **Readers propose, a migration writes.** Seven Claude Sonnet readers read the cached, hash-checked sheets (rendering a
  page wherever the text layer runs columns together or garbles glyphs) and wrote proposals in three formats: a new
  value copying a row of the same sheet and product, a corrected cell with the value it replaces, a page statement.
  Each migration (m296 to m304) checks every quote on the cached sheet again before it writes, names the value it
  replaces, is a no-op when re-run, and stops when the data moved. The nine were replayed from the committed tables twice
  and converged.
- **Code by agents in worktrees.** Four Sonnet agents each made one code change on its own branch with a test that fails
  without it (the bound display, the stale-review check, the detectors, the refetch), and their commits were picked onto
  this branch.
- **Guards.** The build (PARSE-MISMATCH, PROCESS-ENCLOSED, CHAMBER-BAND), `data:lint` (34 new findings, each read and
  accepted with its reason: BASF's J/m Izod beside ISO 180, two flexural strengths below tensile and one strain the
  sheets print), `audit:context` (0 new; 2 acceptances it no longer needs removed) and the tests (481).
- **Independent review.** A separate Sonnet reviewer read a random sample of 70 changed records against their sheets
  ([review.csv](review.csv), [the sample](review-sample.csv)): 64 ok, 4 wrong, 2 doubtful, "approve with findings". Acted
  on: two BASF ASA rows had the conditioning words but not the conditioned state; SUNLU's specimen note is footnote [1]
  on p. 3 under values on p. 1, so its page_context rows reached nothing (now on p. 1); 3DXSTAT ESD-PLA's bed is
  recommended, its page saying "Ideal for printing without a heated bed"; Braskem PP-CF's nozzle row names a hardened
  nozzle. Left, as the reviewer marked doubtful: Braskem's recommended and alternate beds (§28). The reviewer is an AI,
  not a person.
- **The documents checked against the data.** Before the push a Sonnet reader checked README, AGENTS, GOALS,
  OPEN-PROBLEMS, ARCHITECTURE, DATA-MODEL, IMPORTING, the decisions' index and status lines and this record against the
  tables, the code and the generated counts. It found 22 things: statements this pass had made untrue elsewhere in
  OPEN-PROBLEMS (Nanovia's held finding, BASF's impact tables, the specimen blocks), counts (18 profiles, not 17; 59
  sources; the guard's 57 and 19 acceptances; the screens two in and six out), decision cross-references (D72, D73, D86,
  D27) and the data model's new fields. Each is corrected.
- **The measuring draw** ([cases](control-v12-cases.csv), [first reader](control-v12-first-reader.csv),
  [second reader](control-v12-second-reader.csv)). 40 profiles no earlier round read, drawn from the tables the
  root-cause sweep left (seed 20261102). The first reader found one deciding error (W021, a Filaflex Foamy bed read as
  required); a second reader, blind to the first, found none and called one SUNLU speed band merged, at low confidence.
  The profile-check reader agreed with all nine of the first reader's findings. Both readers' other findings were nozzle
  sizes and notes, which decide nothing.

## What moved

`npm run build:diff` against 44adc67 (with the four code commits picked onto it); `build/snapshot` and the 69 interface
views are updated with the change. Record by record (`npm run data:diff`, saved as [data-diff.csv](data-diff.csv)): 242 measurements added and 1,034 edited, 197
page_context rows and 5 properties added, 232 profiles edited and 1 added, 31 grades edited (29 retired), 119 evidence
rows, 59 sources, 5 prices and 2 coverage rows re-pointed to their kept grade, 5 chamber bands removed through the
ledger, 1 method rule added.

**Decisions.** Across the six templates in their three modes (1,717 rows), one material's answer moved: PBT (M140) in
Lightweight structure, Explore and Explore with estimates, from unknown to fail. Its two grades were one product in two
languages, one with the published density (1,310 kg/m³ against at most 1,250) and one without, so the material was
unresolved; as one product it fails on its own published value (D100). Eight "Explore with estimates" screens moved with
the recalibrated estimates (two in, six out), none a verdict. 332 rows changed their product counts (68 their passing
count), mostly where a merged product stopped counting twice. The acceptance portfolio's A01 now ranks three materials
on a conditioned question where it ranked one: Raise3D Industrial PET CF and Polymaker PolyMide CoPA publish a
conditioned modulus since m298.

## Left open

Recorded in OPEN-PROBLEMS §28 and §29: the owner's calls (FiberFlex Aero's filing, which empties CPE-LW; a way to retire
profile notes; whether a twin reads a sibling's additive-specific nozzle statement; sending the 255 maker questions),
the makers' (purefil PA6 GF10's two bed rows; Extrudr's and Siraya's own contradictions), and the people's (the C3
spot-check and the C7 team trial). New leads the readers saw are listed there too.

## Cost

Claude Sonnet: seven proposal readers (about 1.2 million tokens), four code agents (about 0.48 million), the
reviewer (about 0.25 million), two draw readers (about 0.21 million) and the documents' consistency check (about
0.32 million): about 2.5 million in all. Claude Opus wrote the
migrations, the parser and rule changes, merged the agents' work and wrote this record.
