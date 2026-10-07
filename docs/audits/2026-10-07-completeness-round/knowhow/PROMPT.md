# Know-how reader prompt, completeness round (item 4)

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

You read 3D-printing filament makers' documents and copy what the maker says about using and printing the product, in
the maker's own words. Work in /Users/farid/Documents/h2c-materials-branch. Write ONLY `{OUTPUT}` and scratch files
under `{SCRATCH}`. No git, no npm, never touch data/ or code. Use Python's csv module to write the CSV.

**Tasks:** `{TASKS}` (CSV: SourceID, SHA256, Class, Title, Pages, Why, Grades, Products). Each row is one document and
the products (GradeID = maker + product name) the database links it to.

For each document, read its whole cached text: `.cache/text/<SHA256>.json` (`pages[N-1].lines[].text`). Where a page's
text is empty or garbled, render it (`pdftoppm -r 110 -gray -f N -l N -png .cache/sources/by-sha/<SHA256>.pdf
{SCRATCH}/<first 8>-pN`) and read the image; copy a statement only if you can match it to text-layer characters.

Copy every sentence or bullet in which the maker says something about one of these topics, one row per statement:

| Topic (write exactly) | What it holds |
|---|---|
| Good for | applications, intended uses, what the product is for |
| Benefits | what the product does well (a feature claim) |
| Pitfalls and limitations | warnings, what it is not for, what goes wrong |
| Warping and shrinkage | warping, shrinkage, dimensional stability while printing |
| Precision and tolerance | accuracy, tolerance, fine detail |
| Surface finish | finish, gloss, texture, colour appearance |
| Adhesion between layers | layer bonding, strength across layers |
| Moisture sensitivity | moisture uptake, drying advice, storage (a drying temperature and time belongs here) |
| Nozzle wear | abrasion, hardened or steel nozzle, nozzle size advice |
| Odour and emissions | odour, fumes, ventilation |
| Supports and removal | support material and removing it |
| Printing advice | any other practical advice: enclosure or chamber, cooling, bed surface, adhesion to the bed, speed, annealing |

Rules:
- **Finding** is the maker's text copied exactly: a whole sentence or bullet, or an exact contiguous part of one, from
  ONE text line or consecutive lines joined with a single space. Never paraphrase, translate, fix typos or combine
  sentences from different places. Keep the page's language (a German or Polish sentence stays German or Polish).
- Not statements: rows of a property table (a number with a unit and a test method), rows of a print-settings table
  (nozzle 200-220 °C), the title, the company address, legal disclaimers, safety-data-sheet text, a retailer's own
  words (shipping, price), a sentence that only names the product.
- **GradeID:** the product the statement speaks for, from the task's Products. A document about one product: that
  GradeID. A document that names several: the GradeID of the product the sentence names or the section it sits in; a
  statement about the whole range goes to every listed product it covers (one row each).
- **Claim:** `toughened` where the sentence says the product is toughened or impact-modified, names what toughens it,
  claims more toughness or impact resistance than the standard form of its polymer or its maker's standard grade, or says
  it was designed or optimised for impact; otherwise empty. (Toughness listed as a property, "tougher than PLA" of a
  PETG, or a comparison with another product is not a claim: leave empty.)
- **Page:** the page number (1 for an HTML document).
- A document with no statement at all gets one row with Topic `none` and a Note saying what the document holds.

Output columns, in order: `SourceID, Page, GradeID, Topic, Finding, Claim, Note`. Be faithful and complete: every
statement of these kinds the document prints, no more. When done, reply in at most 60 words: documents read, statements
per topic, claims found.
