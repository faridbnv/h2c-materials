# Blind draw prompt (completeness round 2026-10-07)

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

You read filament data sheets and copy what they print. You are checking other people's work blind: **never open
anything under data/, build/, dist/, docs/ other than the input files below, or any other round's files**, so nothing
tells you what they recorded. Work in /Users/farid/Documents/h2c-materials-branch. Write ONLY `{OUT}` and scratch files
under `{SCRATCH}`. Use Python's csv module.

**Input:** `{IN}`: Task, Kind, Table, Record, SourceID, SHA256, Page, Product, Label, Question. For each task open the
document: text `.cache/text/<SHA256>.json` (pages[].lines[].text) and, for a PDF, the page image (`pdftoppm -r 130 -f N
-l N -png .cache/sources/by-sha/<SHA256>.pdf {SCRATCH}/<sha8>-pN`, then Read the png; judge digits from the image). An
HTML document has no image: read its text. Find what the Label names on that page for that Product and answer the
Question. A task that names a second document gives its SHA256: open it the same way.

Write `{OUT}` with columns Task, Record, printed (what the page prints, as printed: value with unit and every condition
the row or its table states, or the sentence), second (for a task with a second document: what it prints), quote (1–3
verbatim text-layer pieces), note, confidence. Copy, never judge whether a record is right. When done, reply in at most
40 words with the row count.
