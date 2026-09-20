git add -A && git commit -q -F - <<'ENDOFMSG' && git log --oneline -1
Batch b15, and a label that stands on either side of its own row

SIDDAMENT's twenty-one sheets and 3DJake's six had been held since b12 because the reader could find no name on
their pages. It could: the name was on the first line, in front of the words that announce the sheet. Two rules
between them lost it — a line ending in "datasheet" was rejected whole, and the line that announces a sheet was
read only after the announcement and then below it — so the reader walked down into the Precautions paragraph and
came back with "unused filament properly after use", and twenty-one products were called that. 239 records enter.

The same commit teaches the reader to read a table by the labels around its rows, which is what QIDI's library
needs and what this session held its twenty-nine documents for:

**The nearer label beats one carried down to the row.** QIDI prints the property in Chinese on one baseline, the
standard and the value on the next, and English on the one after. "ISO 527 2317±246.0 MPa" begins with a standard,
which is what a wrapped row looks like, so a label held three rows above claimed it and a Young's modulus of 2317
MPa was recorded as a tensile yield strength.

**A label may stand on both sides of its row**, and then neither half names the property alone. Yousu prints
"Notched IZOD" above the line and "Impact" below it; the lower half alone is an impact strength of no stated test.
Both halves have to be halves of a label, too: read without that guard, an "IMPACT" heading above and a Charpy row
below made an impact strength of no stated test out of a row that names Izod itself.

**Fifteen Chinese property labels**, because a bilingual sheet says it twice and this reader had only ever read
one of the two; and ISO 75's own title, "Determination of temperature of deflection under load", which QIDI heads
its heat-deflection row with and which was being recorded as a Vicat point.

**A load in brackets behind the value** is a condition of the test as much as a word is. Without it both of
QIDI's heat deflections stated no load at all and could screen no heat requirement (D65).

Parity over all thirty-six makers, measured with and without: **+3 and -0** (Polymaker +2, Bambu +1). Two losses
found on the way — a Yousu Izod and a Nanovia one — are what the two guards above are for, and both are back.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
ENDOFMSG