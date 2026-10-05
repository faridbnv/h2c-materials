# Preserve an unpublished lower temperature bound

> **Historical record** (2026-10-01): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

GOALS steps2/5; C3/C9/C12/C13/C15. A material summary replaced a profile's missing lower endpoint with its upper endpoint. During the coverage campaign, the exact PAHT9825 guide's `<80°C` bed became80–80°C and incorrectly supplied a numeric peer to another material's estimated bed window. This separate compiler correction precedes admission of that campaign tranche.

The summary preserves `min:null`; table, drawer and CSV call it an upper bound, with the original strict/conditional words retained in the individual profile. A published incomplete window prevents an estimate replacing that record, but cannot supply a calibration midpoint or two numeric peer endpoints. Product gates and selection rules are unchanged. The existing treatment of lower-only summary windows remains outside this correction.

Four focused tests cover an upper-only source, a mixed union, peer exclusion/own-record preservation and fibre-offset exclusion. The compiled invariant now rejects a fabricated lower endpoint instead of repeating the faulty fallback. Independent AI review reproduced the four cases and actual profile/drawer/export checks; no human review is claimed.

On the committed baseline, the compiled diff has57 paths: two corrected material-summary lower endpoints and non-deciding nozzle-estimate calibration/peer metadata. Canonical tables and numeric measurement/state/headline lanes are unchanged. Full verification and native-browser receipts are in verification.json; the independent review remains pinned to the exact six reviewed code/test files in packet.json.
