# Evidence-contract test corrections

GOALS steps2/5; C3/C13/C15. Two tests assumed every off-recipe result had an in-recipe counterpart in the same document and every raw temperature was understood by the parser. A source can print an off-recipe specimen without a companion value; an explicit source-reviewed parser exception may carry a literal Unicode temperature.

The universal off-recipe headline/bound exclusion remains. The original14 two-column fixtures retain their paired-source checks, and a new independent fixture excludes an off-recipe value without companion records. Temperature tests compare every compiled typed value to its canonical value, require an explicit review for raw-parser exceptions, and reject the same Unicode exception without that review. Production code and data are unchanged in this commit.

The independent AI reviewer signed both file hashes and passed34 targeted tests. A disposable checkout of983607f, containing only these two test changes, passed full verification in236.89s:69 interface views,300 rendered scenarios and2592 readings. No UI baselines were regenerated. The test-only compiled diff is recorded separately; the uncommitted eighth data tranche was excluded from this verification.

The separately rebuilt test-only database has0 compiled differences against its frozen baseline.
