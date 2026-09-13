# Implementing the 13 September manufacturer audit

How each change in [REPORT.md](REPORT.md) and [changelog.csv](changelog.csv) reached the
selector, and what implementing it turned up.

The audit updated the workbook and deliberately left the tool alone. The build refused the new
workbook until it was taught four things: new row counts, a new data status, 15 new use-and-durability
topics, and a snapshot date it had been hardcoding. It also found two citation defects in the
delivered workbook, which were corrected.

Verification: `npm run build` reports zero errors (four standing warnings). 83 tests pass, six of
them new, each pinning one change from the changelog. In the rebuilt bundle, the ABS price tab,
the PEBA-S "No break" row, the Essentium profile and the Support for PLA density were each checked in
headless Chrome, with no console errors.

## Changelog items

| Change | In the tool | Notes |
|---|---|---|
| CHG-001 to 004 · Support for PLA (G077-01) | Grade, profile P0157, 21 property and 8 use records compiled | Its density (1,330 kg/m³) is the material's first measured headline. Oil and grease reads as limited resistance ("resistant to most kinds"), solvents as limited, acids and alkalis as not resistant |
| CHG-005 to 007 · BASF Ultrafuse PC GF30 (G038-02) | Grade, profile P0158, 33 property rows compiled | Nozzle and bed within the H2C baseline. Not promoted to a headline |
| CHG-008 to 010 · Kimya PEBA-S (G045-03) | Grade, profile P0159, 13 property rows compiled | "No break" is the new data status *Published qualitative result*: shown in words, never a number |
| CHG-011 to 013 · Essentium PPS-CF (G073-02) | Grade, profile P0160, 25 property rows compiled | The profile's own nozzle gate reads *exceeds* (400 °C against 350 °C). PPS-CF stays printable through its other grade, as for every material with one fitting grade |
| CHG-014 to 016 · Bambu notch and locator corrections | Compiled as corrected | Pinned by a test |
| CHG-017 · CA0069 quarantined | Excluded from the ABS median, the buy link and the in-stock evidence; struck through in the Price tab | ABS headline is 25.99 CAD/kg from CA0037. See the correction below |
| CHG-018 · 10 sources | Compiled; 224 in total | The Kimya TDS source carries its access limitation and no hash, as recorded |
| CHG-019 · 10 coverage records | Compiled; 1,116 in total | |
| CHG-020 · Method and snapshot | The snapshot date is now read from the Method sheet. The bundle is `H2C_Material_Selector_2026-09-13.html` | Prices keep their own sampling date, 2026-09-10, in every price label |

## What the build needed

- **Row counts.** `build/src/extract.js` holds the expected count for each sheet and stops when the
  workbook moves. Updated to this snapshot.
- **Snapshot date.** It was a constant in `build/src/index.js`. It is read from Method › Scope ›
  Snapshot now (DECISIONS D30).
- **Data status.** *Published qualitative result* is recognised as evidence that is not a number.
- **Topics.** The 15 new topic names are mapped in `build/mappings/environment-topics.json`. The
  six chemical ones join their existing categories: acid, alkali, organic solvent, oil and grease,
  water solubility, and moisture. UV resistance joins UV and outdoor, which stays evidence-only. The
  rest (intended role, published applications, elasticity, layer adhesion, processing ventilation,
  chemical stability, abrasive wear) are narrative categories that never back a filter.
- **Price citations.** The build checked a price headline's value but not what it cited. It now
  fails when a headline cites an observation outside its sample (DECISIONS D31).

## Workbook corrections

The build found two defects in the delivered workbook that the audit's own structural checks did not
cover. Each was corrected by editing the named cells only; no other part of the file changed.

| Cell | Before | After | Why |
|---|---|---|---|
| Materials `N83`, Support for PLA, Mechanical evidence | Not applicable | V001808 | The density headline 1,330 cited no measurement. V001808 is the TDS density it came from |
| Materials `R33`, ABS, Price CAD/kg | Median of CA0037 and CA0069 | Median of CA0037 | CA0069 is quarantined. The value was already 25.99, because the quarantined row has no CAD/kg |
| Materials `S33`, ABS, Price evidence | CA0037; CA0069 | CA0037 | Same |
| Materials `T33`, ABS, Price basis | 2 in-stock regular-price observation(s) | 1 in-stock regular-price observation(s) | Same |

The workbook's SHA-256 is therefore no longer the one recorded in
[audit-evidence.json](audit-evidence.json). It is
`9018c6368a1e8c2184ce74407ded8cd12d237cf6bd90bf74e67d8deaab3a0acf`.

## Repository housekeeping

The delivery copy under `outputs/h2c-manufacturer-audit-2026-09-13/` was compared sheet by sheet
with the workbook as delivered: every sheet was identical. It was removed rather than committed as a
second source of truth. Its screenshot of the Method sheet is kept here as
[method-sheet.png](method-sheet.png).
