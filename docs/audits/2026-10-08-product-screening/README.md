# Product uncertainty fix, 2026-10-08

> **Historical record** (2026-10-08): implementation and validation of D137 against the frozen baseline. Later releases may change these figures. Read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md) for current status.

Missing product predictions are now available independently of sibling coverage. They never pass a requirement or replace measurements. The observed material spread stays descriptive. Independently certified product bounds may change shortlist eligibility; unsupported scenarios remain unresolved. Under Include uncertain, supported options and estimated candidates to verify precede a separate expandable insufficient-evidence list; collapsed options remain counted and exported.

## Independent exclusion validation

Formulations and connected source-byte duplicates are grouped before splitting, including twins. One ground truth per group avoids counting copies as independent products. SHA-256 selects 60% training, 20% calibration and 20% independent evaluation. All qualifying target observations and their learned conversion pairs are withheld, including break/yield values the compiler can use for the same strength headline. Withdrawing only the preferred observation kind would leak the answer back as a related input; a regression test guards this. Related properties remain inputs. Displayed estimate centres/ranges and their existing stop rules are unchanged.

Reserve the 10% error budget and 90% confidence conservatively across all five possible numerical predicates before selecting a question: each gets 2% at 98% confidence. Absolute residual bounds cover both ends. Union bounds avoid joint success probabilities and ensure adding a mandatory requirement cannot revoke an exclusion. Only the as-printed/dry route can receive numerical inference, so another manufacturing route has to fail on its own evidence before a product is excluded. Calibration/evaluation ground truth includes the required property and all three printer temperature gates; incomplete records are not successes.

The allocated tolerance gate needs 194 calibration groups per evidence class; none has that many. **All new numerical exclusions are disabled.** The table below is the separate **single-test diagnostic** at 10% / 90%, not deployment permission. The first implementation's one-test-only runtime restriction was withdrawn because adding a second requirement could restore an excluded product. A focused monotonicity test and the existing rendered-scenario invariant guard the final contract.

| Property / shadow evidence class | Calibration groups | Evaluation groups | Potential wrong exclusions | Retained failures | Upper wrong-exclusion rate at 90% confidence | Single-test gate only |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Density / other products of this material | 112 | 110 | 6 | 43 | 9.38% | Yes |
| Tensile strength XY / this product's related values | 32 | 51 | 1 | 49 | 7.41% | Yes |
| Tensile modulus XY / this product's related values | 24 | 39 | 2 | 37 | 13.08% | No |

All other classes lack enough independent calibration cases even for that preliminary single-test diagnostic. Every complete-scenario certificate remains disabled. HDT's existing grade-calibration clamp still stops product predictions. `null` counts in [RESULTS.json](RESULTS.json) mean validation was unavailable, not zero errors. Retained failures use a minimum threshold 10% (at least one property unit) above the published truth; broad bounds retain many failures. A future certified bound must also include the existing plausible range and retain physical-floor vetoes. These diagnostic counts can therefore overstate actual exclusions; this release deploys none of them.

## Baseline and decision replay

[BASELINE.json](BASELINE.json) freezes main `d97769c57f742a203eaaddc6025b555457d5322e`, all 31 canonical CSV hashes and protected acceptance fixtures. The compiled baseline is locally retained at `.cache/uncertain-screening-baseline/db.json`; it can be reproduced by building that commit in a separate checkout. Supply its database to [replay.mjs](replay.mjs), relative to the repository root:

```sh
node docs/audits/2026-10-08-product-screening/replay.mjs .cache/uncertain-screening-baseline/db.json --write
```

The replay covers 145 scenarios: six templates in both uncertainty modes with estimates off/on (24), the reported 5 GPa scenario, and 120 deterministic property thresholds and evidence/service-state combinations. It checks identical CSVs, protected fixtures, all observed material summaries, published product values/states, displayed prediction ranges and material evidence verdicts. It records every eligibility change individually. These scenarios are regression coverage, not independent model-accuracy evidence; incomplete ground truth never counts as a successful calibration/evaluation case.

There are **775 material/scenario eligibility changes**, all explained in RESULTS.json, with **zero evidence-verdict changes** and **zero source-data, published-value or displayed-prediction changes**. The reported 5 GPa question keeps 20 PASS, 27 FAIL and 105 UNKNOWN. Its old 19 material-level exclusions have no product-scenario certificate, so it now retains 125 materials: 20 supported, 11 estimated suggestions and 94 insufficient-evidence options. ASA-GF stays unresolved; iSANMATE's existing plausible range reaches 5.06 GPa. No removal target or protected acceptance expectation was changed.

## Verification

All 18 local verification gates passed in 473.5 s: 581 application tests, 293 import tests, 73 browser views, 300 rendered scenarios / 2,578 readings with no violations, private-cache source-context checks (136 existing accepted findings, none new or stale), snapshots, data audit, scale and reproducibility. The fast portion took 80.9 s, within its 90 s budget; the doubled-data compile took 84.8 s, within 150 s. Canonical data diff is empty. The 15,669 compiled differences are solely additive product prediction/certification metadata and its model-level contract. [VALIDATION.json](VALIDATION.json) records these gates and the local log digest. Deployment checks compare remote main, Verify, Pages, the live manifest and seven saved scenarios; the completion report gives their remote run links. Source data corrections, imports, kernel redesign and unrelated interface changes are outside this fix. Remaining scope limitations stay in OPEN-PROBLEMS §35; the original 2026-10-07 audit is preserved.
