# Source backup and targeted gap closure

Start with [RESPONSE.md](RESPONSE.md) for results, evidence boundaries and verification.

- [TARGETS.csv](TARGETS.csv): immutable 3,464-target baseline.
- [OUTCOMES.csv](OUTCOMES.csv): one disposition per target; [HANDOFFS.csv](HANDOFFS.csv) holds unresolved facts.
- [TARGET-QUESTION-OUTCOMES.csv](TARGET-QUESTION-OUTCOMES.csv): exact current state/result for every associated question.
- [C-SITE-OUTCOMES.csv](C-SITE-OUTCOMES.csv): 63 bounded print-settings searches and access/identity limits.
- [STATE-VARIANTS-FOLLOWUP.csv](STATE-VARIANTS-FOLLOWUP.csv): additional states queued, with no research claimed.
- [FINAL-MOVEMENT.csv](FINAL-MOVEMENT.csv): answers moved against the original questions.
- [DECISION-TRACE-INDEX.csv](DECISION-TRACE-INDEX.csv): current-release end-to-end traces for all changed product answers.
- [RESTORE-COUNTS.json](RESTORE-COUNTS.json): empty-cache source/derived restore and intentionally excluded mismatch.
- [SPOT-CHECK-DECISIVE.md](SPOT-CHECK-DECISIVE.md): agent re-reads awaiting a person.

Reproduce final reports after `npm run build`:

```bash
node scripts/audit/gap-response.mjs C --against B-ANSWERS.json --compiled
node scripts/audit/gap-response.mjs FINAL --compiled
node scripts/audit/gap-outcomes.mjs
node scripts/audit/gap-state-followup.mjs
node scripts/audit/gap-final-traces.mjs
npm run audit:scenario-gaps
npm run data:sources -- --export "$H2C_SOURCE_BACKUP" --derived
npm run doctor
```

Checkpoint JSON is gzip-compressed; use `gzip -dc <checkpoint>.json.gz` to inspect it. A-FTS-HITS.txt and A-UNUSED-FACTS.txt are retained SQL table output, not JSON. The report scripts refuse stale compiled releases where applicable. TARGETS.csv is never overwritten by a subsequent audit. Manufacturer originals and page images remain in the private cache/store, outside Git. No vendor contact, coupon test, cloud upload confirmation or push is implied.
