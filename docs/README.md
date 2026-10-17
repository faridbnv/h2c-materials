# Documentation

## Start here

Filament Atlas (the H2C Material Selector until 2026-10-16) helps a small engineering team pick a 3D-printing filament
for its Bambu Lab H2C printer: it turns what a part must do into a shortlist of filament types the H2C can print, then
of the products that pass, each with how to print it and where every number comes from. The [README](../README.md)
says, in plain words, what it is, where things stand and what is still missing. Read that first; this page is the map
of everything else.

Three things are useful to know before opening any document here:

- **The data is a set of tables** (`data/tables/*.csv`), each column described in [DATA-DICTIONARY.md](DATA-DICTIONARY.md).
  A build turns them into the one HTML page that is the tool, and a page of its own for each well-documented material
  beside it. Every value names the source document and page it was read from.
- **The project moves in rounds of work.** Each round starts from the owner's decision (recorded, dated, in
  [GOALS-LOG.md](GOALS-LOG.md)), changes the data through small scripts that check each value against its source page
  ("migrations", numbered m1, m2 and so on), records the reasons as numbered decisions (D1, D2 and so on, in
  [DECISIONS.md](DECISIONS.md)), and ends with a check of its own accuracy (`npm run round:close`). Its reports stay in a
  dated folder under [audits/](audits/); its working files go to the private evidence store, listed in the folder's
  `PACKETS.md`.
- **Current or history.** The documents in this folder's top level are kept current, except the walkthrough, which
  says at its top that it is history. Everything under
  [audits/](audits/), [background/](background/) and [../archive/](../archive/) is a record of its day, and says so at its
  top ("Historical record"); the few there that are kept up to date say "Current". A test fails if a document there
  carries neither mark (`npm run docs:history`).

## Which document answers what

| Document | Answers |
|---|---|
| [OPERATING.md](OPERATING.md) | For a person keeping the tool running: the five commands, and how to correct a value, add a data sheet, publish (the site's material pages and each release's pages zip too) and review a material's written summary |
| [GOALS.md](GOALS.md) | What is the tool for, who is it for, and how is a change judged? |
| [GOALS-LOG.md](GOALS-LOG.md) | What has the owner decided, and when? (dated, newest last) |
| [HOW-IT-WORKS.md](HOW-IT-WORKS.md) | For an engineer using the tool: how a data sheet becomes a number on the screen, what each kind of number means, how far to trust it, and what the tool is not |
| [OPEN-PROBLEMS.md](OPEN-PROBLEMS.md) | What is known to be wrong or missing right now, and what would fix each? |
| [DATA-MODEL.md](DATA-MODEL.md) | What is this number, which table holds it, and how much should I trust it? (the material pages' written summaries too) |
| [INTERFACE.md](INTERFACE.md) | Why does the screen behave this way? The selector's frame, views and drawer, and [the material pages](INTERFACE.md#the-material-pages) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How is the code put together, how do the tables become the page and the material pages (stage 8 of [the build](ARCHITECTURE.md#the-build-stage-by-stage)), and where does a change go? |
| [../AGENTS.md](../AGENTS.md) | How do I change data safely (for people and AI agents alike)? |
| [IMPORTING.md](IMPORTING.md) | How does a batch of makers' data sheets enter the database? (open since 2026-10-05) |
| [DECISIONS.md](DECISIONS.md) | Why was it done like that, and what breaks if I change it? ([DECISIONS-ARCHIVE.md](DECISIONS-ARCHIVE.md) holds the few no longer in force) |
| [DATA-DICTIONARY.md](DATA-DICTIONARY.md) | What does this column mean, and what may it hold? (generated) |
| [RULES.md](RULES.md) | What does this error or warning code mean, and how do I fix it? (generated) |
| [WALKTHROUGH-ADD-A-MATERIAL.md](WALKTHROUGH-ADD-A-MATERIAL.md) | How do a material's records fit together? (a worked example from 2026-09-16, kept as history) |
| [audits/](audits/README.md) | What did each review and round of work find, and what was done about it? (history) |
| [Coverage campaign status](audits/2026-09-30-coverage-expansion/STATUS.md) | How far the research campaign of 2026-09-30 got, and every target still open (current, generated) |
| [background/](background/) | What was the tool built from? (history) |

## Three routes

- **An engineer choosing a material and a product:** [HOW-IT-WORKS.md](HOW-IT-WORKS.md), then the page. Set what the part
  must do (or start from a template), say whether you can anneal and whether the part lives humid, read the passing
  products first, choose the one to print, and take its decision brief (Save / share).
- **A maintainer correcting one value of a source already held:** [OPERATING.md](OPERATING.md) step by step, and
  [AGENTS.md](../AGENTS.md), "Correct a published value", for the full rules:
  re-read the source page, write a small migration that names the value it replaces (`archive/migrations/m212-an-anneal-is-not-a-test-temperature.mjs` is a short one), then
  `npm run verify:fast`, `npm run snapshot` and `npm run build:diff`, and `npm run trace -- <MeasurementID>` to see what
  it decides (`npm run trace -- --scenario <saved file> --product <GradeID>` for one product's decision).
- **An import of a new document:** [IMPORTING.md](IMPORTING.md). Imports are open since 2026-10-05, when the owner lifted
  the pause of 2026-09-25 ([GOALS-LOG.md](GOALS-LOG.md)); a document never enters by hand.

## Tracing why something is the way it is

Three places, in the order to try them.

1. **The source comment.** Most traps here produce plausible-looking wrong answers rather than errors, so the reason
   usually sits directly above the code.
2. **[DECISIONS.md](DECISIONS.md).** Numbered, with an index at the head saying which still hold, each saying what would
   break if it were reversed, and a table of bugs worth remembering, with what pins each one now. A decision no longer in
   force at all is in [DECISIONS-ARCHIVE.md](DECISIONS-ARCHIVE.md), linked from the index.
3. **[audits/](audits/README.md).** Each review and round in its own dated folder, listed in order with what it asked
   and what came of it. Where the interface is the way it is because a first-time user hit it, the audit says so; where
   it is the way it is because of what the data can and cannot support, DECISIONS says so. If neither does, the git
   history of the file will.

## Working on it

**The build must stay deterministic and must keep failing loudly.** If a change makes a validation error into a
warning, the build will happily ship a database that has drifted.

**Comments explain why, not what.** The source is dense with explanations of failures that already happened, because
most of the traps here produce plausible-looking wrong answers rather than errors. A comment saying a parser cannot
accept a leading minus is worth more than the regex it sits above.

**A bug in a parser gets a test with the failure in the comment.** See `test/normalize.test.js`. Those tests read oddly
without the context, which is exactly why the context is in them.

**If you weaken a rule in the list in the README, say so in DECISIONS.md.** Those rules are what the tool asserts about
its own trustworthiness.

**Names live in one place.** `data/tables/headline_definitions.csv` for properties, `app/js/ui/labels.js` for criteria
and verdicts, `schema/vocab/environment-categories.csv` for environment categories. A second way to name something does
not look wrong where you write it; it looks wrong three screens away, to a reader who now doubts the number beside it.

**A round of work ends by marking its folder as history.** `npm run docs:history` marks every unmarked document under
`audits/`, `background/` and `../archive/`; a document there that is kept up to date carries "Current" instead.
