# Blind draw prompt (quality round 2026-10-07)

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

You read filament data sheets and copy what they print. You are checking other people's work blind: **never open
anything under data/, build/, dist/, docs/ other than the two input files below, or any other round's files**, so
nothing tells you what they recorded. Work in /Users/farid/Documents/h2c-materials-branch. Write ONLY `{OUT1}` and `{OUT2}`
and scratch files under `{SCRATCH}`. Use Python's csv module.

**Part 1** — input docs/audits/2026-10-07-quality-round/blind-draw/draw.csv: Task, Kind, Table, Record, SourceID, SHA256,
Page, Product, Label, Question. For each task open the document: text `.cache/text/<SHA256>.json` (pages[].lines[].text)
and, for a PDF, the page image (`pdftoppm -r 130 -f N -l N -png .cache/sources/by-sha/<SHA256>.pdf {SCRATCH}/<sha8>-pN`,
then Read the png; judge digits from the image). Find the row the Label names on that page for that Product and answer
the Question. A retirement task names a second record's SourceID: find its SHA256 in the first row of draw.csv that
carries the same SourceID, or, if none does, say so; do not open data/.
Write `{OUT1}` with columns Task, Record, printed (what the page prints, as printed: value with unit and every condition
the row or its table states), second (for a retirement: what the second page prints for the same property), quote
(1–3 verbatim text-layer pieces), note, confidence.

**Part 2** — input docs/audits/2026-10-07-quality-round/blind-draw/negative.csv: Task, GradeID, Product, Documents
("SourceID=SHA256 | ..."). For each product, read every listed document's cached text and copy EVERY sentence that says
anything about toughness, impact or impact resistance, brittleness or shattering, or an impact modifier, exactly as
printed, one row per sentence. Skip table rows that only give a number. Write `{OUT2}` with columns Task, GradeID,
SourceID, page, sentence. A product with no such sentence gets one row with sentence "none".

Copy, never judge whether a value is right. When done, reply in at most 50 words with row counts.
