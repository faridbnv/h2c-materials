# The impact round's two draws (2026-10-06)

> **Current** (2026-10-06): what the round's sealed checks found.

**Blind re-read of 37 records** ([key.csv](key.csv), [tasks.csv](tasks.csv), [BLIND-PROMPT.md](BLIND-PROMPT.md),
[blind.csv](blind.csv)). Thirty values m388 added, drawn at random (seed 20261006), and seven records m387 changed (a
moved row, the Hyper PLA-CF sheet's impact and tensile rows, the unflagged colorFabb value, a flagged BASF row and two
notched rows printing 1eU) were given to a fresh Claude Sonnet reader by source, page, product and label only, without
the stored value. All 37 numbers agree with what is stored, and so do the unit, notch, direction, temperature and
specimen wherever the reader found them stated. Where the reader left a notch "not stated" and the record says
unnotched (Prusament's sheets, D09, D11, D15, D26), the sheet prints the notched row separately ("not applicable" or its
own value) and names the unnotched method in a footnote (4) or (3), which the reader did not reach on that page.
**0 errors in 37.**

**Missed-claim draw of 20 products** ([negative-tasks.csv](negative-tasks.csv), [NEGATIVE-PROMPT.md](NEGATIVE-PROMPT.md),
[negative.csv](negative.csv)). Twenty of the 366 products that publish an impact value and carry no "sold as toughened"
mark, drawn at random, twelve of them from names with Tough, Pro, +, Impact, Max or HT. A reader copied every sentence
of their documents about toughness or impact; Claude Opus judged each against the rule. One meets it: colorFabb's page
for PET HIGH SPEED PRO, "High-speed filament with increased toughness … offers increased flexibility and impact
resistance", more than its standard form (marked by m389; its notched Charpy is 1.2 kJ/m²). Not marked, and why:
BigRep says plain PLA "is somewhat stronger and resistant to impact" than its PRO HT; 3D-Fuel compares its Pro PCTG with
PETG, another polymer; Extrudr's carbon-fibre grades state a trade-off in impact; the rest list toughness as a property
or say nothing. **1 missed in 20**, within the one the plan allowed, so the impact medians set the toughened products
apart (m390).
