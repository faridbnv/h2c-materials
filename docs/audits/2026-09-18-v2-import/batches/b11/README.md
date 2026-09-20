# Batch b11: what was left of the makers already proved

Applied 2026-09-20 by `m77-batch-b11`: 526 records from 49 documents — Extrudr 15, 3DJake's own-brand and
mirrored sheets 12, Polymaker / Fiberon 7, Spectrum 7, Fabru / purefil 5, and one each from 3DXTECH, Flashforge
and Braskem. The database goes from 509 grades, 6,140 measurement rows and 681 sources to 528, 6,556 and 730.
No material was created.

Twenty of the forty-nine are a maker's German, French, Italian or Polish edition, and none of them has an
English sibling anywhere in the corpus: a sheet is its numbers, and these are the only copy of theirs.

## What the reader had to learn

**A table can say which specimen it describes.** colorFabb heads one table "TYPICAL MATERIAL PROPERTIES – 3D
Printed" and the next "– Injection molded". Read without those headings, its PLA Chameleon sheet gave one grade
a printed tensile modulus of 3285.79 MPa and a moulded one of 3400, a printed yield of 70.91 MPa and a moulded
tensile strength of 45 — one grade contradicting itself, and the moulded values recorded as printed bars that a
headline may cite. A heading naming a specimen form now governs the rows under it, exactly as the as-printed and
annealed headings already do, so a moulded row carries `Raw material value` and no headline can reach it. The
physics lint is what found it: the batch was refused because a yield strength stood above an ultimate one.

**A maker's name is the vocabulary's spelling.** The ledger carries the name the research workbook gave, which
is a brand line as often as a maker: "Polymaker (Fiberon)" is an alias of Polymaker (m50), and eight Fiberon
grades were refused at the gate until the reader read the Aliases column.

**Four more things a product's name is not.** A letter-spaced title — the Fiberon library prints
"T E C H N I C A L  D A T A  S H E E T" across the head of every sheet, and eight of its products were named
"D A T A S H E E T"; the "T M" left under it; a revision line beginning "Date /"; and "Généralités", which is
purefil's French for the section heading its English sheets call General.

## What was held, and why

| Held | Documents | Why |
|---|---:|---|
| Identity unsettled | 122 | GreenTEC, XT, stoneFill, PLA/PHA, the "Nylon" sheets, BASF's metal and ceramic powders, and the rest |
| The same numbers under another name | 21 | queued rather than registered twice (R053) |
| Read optically | 11 | a value read from a picture waits for somebody to read it against the page image |
| A product the database already holds | 2 | Extrudr FLEX MEDIUM and FLEX HARD are already G039-17 and G039-16 |

The twenty-one twins are worth naming, because they are three different things: purefil publishes each sheet in
German and English and both were read; Spectrum serves some sheets from two URLs that differ only in case; and
colorFabb has revisions whose numbers did not change. Registering both of any pair would count one measurement
twice in the estimate model.

## What was decided rather than accepted

Four values are recorded as printed and marked physically implausible, each with its reason: a carbon-filled
polycarbonate that cannot draw the "> 100 %" its sheet prints (the defect V000729 already carries); two PLA
sheets printing a flexural modulus of 3.8 MPa where they mean GPa (as V002818 and V004034 already do); and an
Extrudr PLA whose 500 MPa tensile modulus the database already flags on the English edition of the same sheet
(V004255).

One density row is rejected: the low end of a foaming filament's "0.40 – 1.07 g/cm³" is what the filament
reaches when its foaming is active, which is what the process does and not what the material weighs. b09
rejected two such rows for the same reason.

Seven physics findings are accepted with a reason apiece — a PC-PBT blend tougher than the amorphous class its
window is drawn for, an Izod published in kg·cm/cm whose conversion is exact, a carbon-filled PP at the neat
polymer's density, a low notched PLA, a foaming TPU whose hard segment governs its glass transition, a Z
strength above its own X-Y, and the printed-against-moulded pair above.

`ISO 4649` and `ISO 815` enter `schema/vocab/standards.csv` with the rows that cite them.

One estimate finding is accepted: PPS-GF's X-Y modulus of 5.764 GPa now reads as an outlier because b11 filled
out the family around it, not because the value moved.
