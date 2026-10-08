# Why a material measured below the limit stays "uncertain", 2026-10-07

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

> **In short.** The owner opened the High-stiffness fixture question (Tensile modulus (XY) at least 5 GPa, Include uncertain,
> estimates on) and saw ASA-GF listed as uncertain with a modulus of 1.86 to 2.76 GPa. The numbers are right. The material is
> kept because four of its six products publish no comparable modulus, and neither the verdict rule (D100) nor the estimate
> stage (D43, D83) can say anything about a silent product that has measured siblings. Nothing was changed: this is the
> finding, recorded as [OPEN-PROBLEMS §35](../../OPEN-PROBLEMS.md) so it can be taken up later.

## The question

The shared link is in `scenario-link.txt` (release 7ae5afa74786): template "High-stiffness fixture", Build material (not a
support), Tensile modulus (XY) >= 5 GPa (required), HDT at 0.45 MPa >= 90 °C (reported, not required), Materials with missing
data: Include uncertain, Let estimates rule out materials: on. Run `node docs/audits/2026-10-07-uncertain-logic/census.mjs`
(after `npm run build`) for every figure below; `npm run trace -- --scenario <file> --product <GradeID> --requirement tensileModulusXY`
gives one product's decision record by record.

## What happens to ASA-GF (M034)

Six products, judged as printed and dry:

| Product | Tensile modulus XY | Verdict | Why |
|---|---|---|---|
| G034-06 Eryone ASA - GF | 1.8579 GPa (V004983), printed | FAIL | |
| G034-03 IPCON ASA GF | 2.758 GPa (V001985), printed | FAIL | |
| G034-01 Spectrum ASA-X GF10 | 2.55 GPa (V001998), injection-moulded bar | UNKNOWN | a raw-material value is not the printed part's |
| G034-05 Extrudr DURAPRO ASA GF | 3.1 GPa (V013042) | UNKNOWN | specimen and direction not stated (D84); counts only if Data quality admits such values |
| G034-04 Flashforge ASAGF10 | none (flexural 3.359 GPa only) | UNKNOWN | "Not published in the sampled sources" |
| G034-02 iSANMATE ASA Glass Fiber | none (flexural 2.765 GPa only) | UNKNOWN | "Not published in the sampled sources" |

The row's 1.86 to 2.76 is the spread of the two products that publish a comparable value; both fail. The material's verdict is
UNKNOWN because `evaluateProducts` (`app/js/engine/constraints.js`) is PASS when one product passes, UNKNOWN when none passes
and one is unresolved, and FAIL only when every product fails (D100). The four unresolved products hold it.

## Why "Let estimates rule out materials" does not remove it

1. The estimate stage runs only for a headline that no product publishes (`build/src/estimate/index.js`, `if (!h || h.known …) continue`).
   The build rejects an estimate beside a measured headline (EST-INVALID in `validate.js`).
2. The product view passes the material's estimate to a silent product only when no sibling publishes
   (`productHeadline` in `app/js/engine/products.js`, `base.estimate && !(summary?.n > 0)`). D83 states the intent: "a silent
   product beside siblings that publish is untested, not estimated."
3. So the four silent products get a plain "Not published" or "not comparable", with no range the screening rule could test.

## The inconsistency

Measuring a product makes its material harder to rule out. With the same requirement and the same switches:

- ASA-EC (M105) and ASA-AF (M113), where no product publishes a modulus, are screened out on estimates of 2.22 to 3.74 and 1.05 to
  3.06 GPa.
- ASA-GF, with two measured products at 1.86 and 2.76 GPa, is kept.
- TPU harder than 95A (M162) is screened out on an estimate of 0.01 to 0.42 GPa; TPU 85A class and softer (M159), whose two measured
  products are 0.0068 and 0.025 GPa, is kept because 16 of its products publish nothing.

The scenario holds 106 candidates: 20 pass, 86 unresolved. Of the 86, 55 are unresolved with a measured failing product and silent
siblings, and in 51 of those every comparable value is below 5 GPa. They include PLA (48 fail, 147 silent), PETG, ABS, ASA, PC,
PEI, PEKK and the three TPU hardness classes. The committed snapshot shows the same thing for the template
(`build/snapshot/ui/11-high-stiffness-fixture-explore-estimates.txt`, ASA-GF: "0 of 2 products, likely fails: 2 with data miss, 4
publish none"). D100's own record says the intent: "Include uncertain is wider, on purpose: a team can see what nobody has measured."
What it did not weigh is a material whose every measured product fails by a wide margin.

## The wording is also wrong

- "4 publish none" (`app/js/ui/table.js`, `likely-fails`) and its tooltip ("publish nothing to judge") are untrue for three of the four:
  Spectrum prints 2.55 GPa (moulded), Extrudr 3.1 GPa (no direction), Flashforge a flexural 3.359 GPa. They publish no *comparable* value.
- The product reason "Not published in the sampled sources" says the same thing for a product that publishes a value that does not
  qualify; the other branches (`asPublished`, `elsewhere`) are reached only when the product's own value is an as-published or
  other-state one, and a moulded raw-material value or a flexural modulus has neither.
- "Likely fails" is a guess the page makes from the siblings; it is not a finding about the silent products.

## Ways it could be closed (none taken)

1. **Give a silent product its own estimate** from its measured siblings plus its own related values (the moulded value, the value
   with no direction, the flexural value), back-tested by holding out each measured product and predicting it from the rest. D100
   stays: a sibling's failure still does not count against a silent product. It would remove a product only with estimates on, and the
   verdict stays UNKNOWN. This amends D83 and needs a back-test row (AGENTS: no new branch for a case the model cannot express).
2. **Screen on the siblings' measured range**, as a second kind of screen with its own labels. Cheaper, but it is the inference D100
   refused.
3. **Wording only.** Say "publish no comparable value" and name what the silent product does publish. Does not change an answer.
4. **Leave it,** and say on the row that the material is kept only by products nobody has measured.

Either of the first two moves answers, so it needs the decision diff and the scenario count (GOALS working rules) before it is built.
