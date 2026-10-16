# E1 findings: mechanical-read.txt (Tensile XY/Z and Impact headings)

> **Historical record** (2026-10-16): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

Method: all 255 blocks parsed by script (/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/72c77321-f3e0-499c-927d-991f68ee2f5d/scratchpad/sweep/e1/chk.py), then the sentence templates, all 96 "No graph" sentences and every flagged block read by hand. Checks 1 to 8 were computed for every block, not sampled.

## Findings

| MaterialID | heading | check # | quoted lines | why |
|---|---|---|---|---|
| M016 | Impact tests | 2 | `Notched Izod impact 0 —` / `— —` (header: `Notched Izod impact 1 product`; `Also drawn ...: 1 with no stated orientation (3.9).`) | Table row of dashes (n 0, no median, no middle half, no range) for a row the graph draws |
| M019 | Impact tests | 2 | `Notched Izod impact 0 —` / `— —` / `Also drawn, not in the median: 1 with no stated orientation (5).` | same |
| M066 | Impact tests | 2 | `Notched Izod impact 0 —` / `— —` / `Also drawn ...: 1 with no stated orientation (3).` | same |
| M067 | Impact tests | 2 | `Notched Izod impact 0 — ` / `— —` | same |
| M082 | Tensile | 2 | `Tensile modulus (XY) GPa 0 —` / `— —` / `Also drawn, not in the median: 2 with no stated orientation (1.2-1.4) and 3 special formulations (0.605-1.1).` | same (5 products drawn, row is dashes) |
| M082 | Impact tests | 2 | `Notched Charpy impact 0 —` / `— —` / `Also drawn ...: 1 with no stated orientation (65) and 3 special formulations (3.56-30).` | same |
| M089 | Impact tests | 2 | `Notched Izod impact 0 —` / `— —` | same |
| M149 | Tensile | 2 | `Tensile modulus (XY) GPa 0 —` / `— —` and `Tensile strength (XY) MPa 0 —` / `— —` (each: `Also drawn ...: 2 with no stated orientation (0.35)` / `(45)`) | two dash rows in one table |
| M162 | Tensile | 2 | `Tensile modulus (XY) GPa 0 —` / `— —` / `Also drawn ...: 7 with no stated orientation (0.12-0.4).` | same |
| M019 | Impact tests | 4 | key: `orientation stated (XY) no stated orientation sold as toughened (the maker's statement)`; table: Charpy n 1 5.31, Izod 0 with `1 with no stated orientation (5)`; no "sold as toughened" in any Also-drawn line, n sentence has no toughened wording | Key entry for a mark that no row, line or note carries |
| M028 | Impact tests | 4 | key: `... measured after annealing sold as toughened (the maker's statement) median`; Also-drawn lines name only `no stated orientation` | same |
| M081 | Impact tests | 4 | key: `orientation stated (XY) no stated orientation sold as toughened (the maker's statement)`; Also-drawn lines name only `no stated orientation` | same |
| M082 | Impact tests | 4 | key: `... special formulation sold as toughened (the maker's statement)`; Also-drawn lines name only `no stated orientation` and `special formulations` | same |
| M026 | Impact tests | 4 and 9 | key has `sold as toughened`; table `Notched Charpy impact 1 5.7`; n sentence: `... except special formulations. ... Notched Charpy impact: That product is one its maker sells as toughened or impact-modified (5.7 kJ/m²).` | The toughened product is the one counted in n and the median, while the other 5 blocks with this note say n excludes "products sold as toughened" (and list them under Also drawn). Contradiction beside it; also "That product is one its maker sells" reads as broken (missing "that"; "That product" has no antecedent beyond the row label) |
| M066 | Impact tests | 4 and 9 | `Notched Charpy impact 1 1.2` / `Notched Charpy impact: That product is one its maker sells as toughened or impact-modified (1.2 kJ/m²).` | same as M026 |
| M068 | Tensile | 7 | `Tensile modulus (XY) 2 products` / `Tensile modulus (Z) 3 products`; `Both orientations: 2 products for tensile modulus ...` | Z row has more products than its XY row (Z-only product; likely data/grouping, not wording) |
| M081 | Tensile | 7 | `Tensile modulus (XY) GPa 3 1.59` vs `Tensile modulus (Z) GPa 2 1.77`; `Tensile strength (XY) MPa 3 18.4` vs `Tensile strength (Z) MPa 2 18.6`; `... tensile modulus 101 % (1 product)` | Z median above XY for modulus and strength (n 2 and 3; Z 101 % for the one paired product) |
| M001 | Tensile | 6 | `elongation at break 59 % (3 %-246 %, 33 products)` | share range 3 %..246 % (median ok) |
| M008 | Tensile | 6 | `elongation at break 65 % (16 %-83 %, 9 products)` | range end 16 % |
| M018 | Tensile | 6 | `elongation at break 43 % (7 %-69 %, 5 products)` | range end 7 % |
| M027 | Tensile | 6 | `elongation at break 38 % (17 %-79 %, 9 products)` | range end 17 % |
| M048 | Tensile | 6 | `tensile strength 31 % (18 %-51 %, 3 products)` | range end 18 % |
| M051 | Tensile | 6 | `elongation at break 85 % (59 %-167 %, 3 products)` | range end 167 % |
| M057 | Tensile | 6 | `elongation at break 10 % (1 product)` | share 10 % |
| M076 | Tensile | 6 | `elongation at break 4 % (1 product)` | share 4 % |
| M093 | Tensile | 6 | `elongation at break 21 % (19 %-23 %, 2 products)` | range end 19 % (median in band) |
| M156 | Tensile | 6 | `elongation at break 155 % (1 product)` | share 155 % |
| M162 | Tensile | 6 | `elongation at break 19 % (5 %-33 %, 2 products)` | median 19 %, range end 5 % |
| M109 | Tensile | 9 | `No graph: ... Fiberlogy PETG+PTFE's elongation at break (XY) of &gt; 100 % , with no stated orientation.` | Unescaped HTML entity `&gt;` shown to the reader |
| M114 | Tensile | 9 | `Elongation at break (XY): only one product has a value, 3DXTECH 3DXSTAT ESD-TPC (90A)'s &gt; 300 % .` | same |
| M157 | Tensile | 9 | `Elongation at break (XY): only one product has a value, NinjaTek Eel's &gt; 50 % , with no stated orientation.` | same |
| M008 | Impact tests | 9 | `Notched Izod impact 6 3.5` / `3.5-3.5 3.5-4.29` | Degenerate middle half "3.5-3.5" (also M099 tensile `Elongation at break (XY) % 5 3` / `3-3 3-5.1`) |
| M036, M053, M160 (x3) | Tensile | 9 | e.g. M160 `tensile modulus 83 % (83 %-83 %, 2 products)`, `81 % (81 %-81 %, ...)`, `54 % (54 %-54 %, ...)`; M036 `63 % (63 %-63 %`; M053 `55 % (55 %-55 %` | Share range with identical ends reads as redundant (5 cases) |
| 35 blocks (see list) | both | 9 (count that does not square beside the row counts) | e.g. M008 Tensile: rows `19, 8, 26, 12, 24, 10 products` (= 99) but `Of the 104 results below, 69 are drawn above`; M008 Impact: `Notched Charpy impact 3 products`, `Notched Izod impact 7 products` (10 dots) but `7 are drawn above`; M001 Tensile 468 vs 452 | Sum of the rows' product counts exceeds the "drawn above" figure with no "named above" to account for it. Not a check-1 failure (the counted line itself squares everywhere) but a reader adding the row counts will not get the drawn figure. Blocks (sum of rows vs drawn): M001T 468/452, M001I 68/64, M008T 99/69, M008I 10/7, M020T 203/201, M027T 154/146, M027I 35/32, M031T 112/108, M031I 16/13, M033T 49/46, M033I 10/9, M035T 61/59, M046T 24/23, M050T 43/40, M050I 10/9, M051T 34/31, M051I 5/4, M052I 6/5, M070T 21/18, M070I 3/2, M073T 24/21, M073I 5/4, M081T 30/27, M081I 9/8, M086T 8/6, M088I 7/4, M099T 29/26, M099I 8/6, M113T 3/1, M159T 42/38, M160T 33/30, M160I 3/2, M161T 66/60, M168T 19/16, M168I 4/3. (Blocks with "named above" excluded, since named products have no row.) |

## What was checked and came out clean

- Check 1: 489 row comparisons (header "N products" vs table n + Also-drawn counts) and 159 counted lines (drawn + named + each item = N; "the other M" = N - drawn - named) plus 96 No-graph sentences (item sum = stated count; "values" in the heading equals N in the counted line): 0 failures.
- Check 2 "No median" beside a table with a median: 0 (30 blocks have "No median" and no table).
- Check 3: 339 tick groups, none with fewer than two product dots; no "only one product has a value" sentence for a row that is also drawn (13 blocks carry such sentences for rows with no graph row).
- Check 4: middle half and median marks all have a row carrying them (apart from the toughened entries above). Note 41 graph blocks have a "Median" table column with a key that does not list "median" (n 1 rows only); not flagged.
- Check 5: Both orientations counts never exceed either row; Z-share counts never exceed Both; "Both tests" never exceeds either impact row.
- Check 8: 290 tick groups tested against the table and Also-drawn ranges (linear: within one tick step; log: within one decade step); no empty or single-tick lists; no violations.
- Check 7 otherwise clean (only M068, M081 above).
- Medians sit inside middle half and range; middle half inside range; n=1 rows have a single value; no stray undefined/NaN/null/code words/duplicated words.

## Overall counts

- Blocks read: 255 (Tensile tests, XY and Z: 143; Impact tests: 112).

- With a graph: 159 (Tensile 101, Impact 58). With "No graph": 96 (Tensile 42, Impact 54). With no median ("No median" sentence, graph but no compared value): 30 (Tensile 15, Impact 15).
