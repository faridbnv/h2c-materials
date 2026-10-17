# Blind draw of the data review fixes, 2026-10-17

> **Historical record** (2026-10-17): written for one round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

20 records drawn at random (seed 20261017) from the 868 the round changed (sources 470, measurements 318, evidence 65,
properties 6, coverage 4, page_context 3, product_claims 1, print_guide_materials 1), read by a Claude Sonnet reader
who had not seen the migrations, against each record's document ([draw](../PACKETS.md),
[verdicts](verdicts-20261017.csv); its Decided column is the final call).

- **18 right.** Two of them could not be read against a page: 3D Printing Canada's catalogue page (no cached copy; the
  shop's URL and sibling catalogues name it), and Prusa's Vertical xz bars, read as the sheet's own XZ label.
- **1 wrong** (record 5): Hyper PETG's sheet, which m428 gave to 3DJake as naming no maker, is headed on every page by
  the CREALITY logo. Its family was read: the five Hyper sheets are Creality's and the PLA Basic sheet is nice
  essentials' by their logos (m432); the other 3DJake sheets are titled "Technical Data Sheet 3DJAKE ...".
- **1 partly** (record 16): Kingroon PLA Basic's unnotched Charpy row reads "Not published (do not assume printed)" in
  its own cell; the build gives it "Printed specimen" from the page statement m422 recorded (PC01010, D116), which is
  what the reader asked for. Nothing to change.
