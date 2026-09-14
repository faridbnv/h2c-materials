# Response to the review

Every problem in [REPORT.md](REPORT.md) is fixed, and the estimate model is replaced.

Verification: `npm run build` reports zero errors and the same four standing warnings. 118 tests pass.
`npm run audit:data` reports zero errors and matching source, JSON and embedded HTML data. The
screening chip, the drawer's estimate card and the Why excluded count were checked in headless Chrome
with no console errors.

## Problems

| ID | Fix |
|---|---|
| RV-01 | Both documents in the systematic data audit now carry a marked correction saying the commit was published. The original sentences are left in place, so the record shows what was claimed |
| RV-02 | Replaced by the screening model below: `screened` and `screenedBy` on each evaluation, a SCREENED chip, "N screened" on the Estimates toggle, and a "Screened by estimate" CSV column naming the requirement |
| RV-03 | All three now say an unstated-load heat value can neither pass nor fail a heat requirement outright |
| RV-04 | D23, D34, the chamber-band comment, README, DATA-MODEL, INTERFACE, PIPELINE and ARCHITECTURE describe the new model; D10, D11 and D40 are marked superseded |
| RV-05 | Estimate endpoints are rounded outward to four significant figures and observed ranges are stripped of floating-point noise |
| RV-06 | The Method sheet now states the retirement marker, and the build rejects any Availability that mentions retirement without being the exact phrase. `build/reports/data-audit/` is ignored. The committed audit output is left as the record of that audit |

The Method sheet also gains a row stating the estimate rule. Both rows were added by
[apply-workbook-changes.py](apply-workbook-changes.py), which appends two rows and nothing else and
refuses any other workbook; see [changelog.csv](changelog.csv). The workbook's SHA-256 moves from
`e8532eda180f008afa2960c78cf0b5b2eb911afe2d95a1f8ed388ebcf4cd1175` to
`ac038449bf49a5c182130c370223a111fe492643375b715eb6adff70f65823c1`.

## The estimate model (DECISIONS D42)

Designed with the tool's owner, who chose three things when asked: estimates screen materials out of
Explore but stay revealable; only the material's own grades and strong peers may screen; intervals
are at 95%.

**Evidence ladder.** The material's own other grades with the headline's exact test semantics; then
same-polymer peers of the same reinforcement class; then declared close analogues, context only. No
display family, no behaviour class. The analogue groups, scales and spreads are in
`build/mappings/estimate-model.json`.

**Intervals.** A 95% prediction interval for one more formulation, using a documented conservative
between-formulation spread, or a sample's own where wider. The snapshot's observed spread is printed
in the validation report, and the build fails if the median group exceeds the documented one.

**Effect.** Never a pass. In Explore, a screen requires an estimate that may screen, an interval that
wholly fails, and no own measurement of the material that could meet the requirement. Screened
materials stay UNKNOWN, and the SCREENED chip brings them back.

Two approaches were tried and rejected on this snapshot's data before this one shipped:

- **Class envelopes.** A screening envelope per behaviour and filler class, as a 99% interval, would have
  screened CPE out of "elongation at least 100%" although CPE's own data sheet reports 150%; also PE,
  PA12 and PA6. Class-level screening was dropped.
- **Own grades as the material's value.** Treating another grade's measured range as the material's
  value screened generic PLA out of "strength at least 60 MPa" because one PLA grade measures 46 MPa.
  Own-grade evidence now gets the same prediction interval as peers.

Result on the current snapshot: 23 estimates (16 own-grade, 4 peer, 3 analogue), 19 able to screen.
Typical requirements screen only clear cases: elongation at least 100% screens PLA Silk and PA-ESD;
strength at least 120 MPa screens five materials; strength at least 60 MPa and stiffness at least
3 GPa screen none.

**Later the same day:** the owner found this model's ranges too wide to use and its gaps too many. It was
replaced by a calibrated model of every observation; see
[../2026-09-13-estimate-evidence/](../2026-09-13-estimate-evidence/REPORT.md) and DECISIONS D43.
