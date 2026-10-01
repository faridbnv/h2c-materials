# Separate statements at one locator

Fluorodur's original prints food-contact and medical-use exclusions in one paragraph.
The campaign migration previously found the first record sharing the paragraph and topic,
so its rerun compared the second exclusion with the wrong record and stopped.
The matcher now identifies each statement by its full raw wording, then guards every
proposed field. An unrecognised changed peer still stops admission before any save.

`test/coverage-clause.test.js` checks both exclusion statements in either order and
refuses changed wording. `clause-guard-fixtures.json` records an end-to-end disposable
copy test: m238 reruns with zero writes, and altered wording refuses without saving.
The full campaign verification includes the regression tests. This repair changes no
compiled data or screening rule; the reviewed facts are committed separately.
