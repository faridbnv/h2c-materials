#!/usr/bin/env python3
"""Check round 3's decision diff: every template answer, estimate-mode candidate and print answer that moved against
baseline/ (the snapshot at the round's start), written to DECISION-DIFF.md beside this file. Run after `npm run snapshot`.

    python3 docs/audits/2026-10-05-check-round-3/after/decision-diff.py
"""
import csv, collections
from pathlib import Path

HERE = Path(__file__).parent
BASE = HERE.parent / 'baseline'
rows = lambda p: list(csv.DictReader(open(p)))
key = lambda r: (r['Template'], r['Mode'], r['MaterialID'])
B = {key(r): r for r in rows(BASE / 'templates.csv')}
A = {key(r): r for r in rows('build/snapshot/templates.csv')}
verdict = [(k, B[k], A[k]) for k in B if k in A and B[k]['Verdict'] != A[k]['Verdict']]
cand = sorted((k, A[k]['Material'], B[k]['Candidate'], A[k]['Candidate'], A[k]['ScreenedBy'] or B[k]['ScreenedBy']) for k in B if k in A and B[k]['Candidate'] != A[k]['Candidate'])
counts, mats = collections.Counter(), set()
for k in B:
    if k in A and (B[k]['Pass'], B[k]['Fail'], B[k]['Untested']) != (A[k]['Pass'], A[k]['Fail'], A[k]['Untested']):
        counts[k[0]] += 1; mats.add(A[k]['Material'])
pb = {r['GradeID']: r for r in rows(BASE / 'print.csv')}
pa = {r['GradeID']: r for r in rows('build/snapshot/print.csv')}
cols = ['Nozzle', 'Bed', 'Chamber', 'Enclosure', 'Abrasive', 'Drying']
moves = [(g, pa[g]['Product'], pa[g]['MaterialID'], [f'{c} {pb[g][c]} → {pa[g][c]}' for c in cols if pb[g][c] != pa[g][c]]) for g in sorted(set(pb) & set(pa))]
moves = [m for m in moves if m[3]]
gone = sorted(set(pb) - set(pa))
WHY = {
    'G001-188': '"Enclosure is not recommended for PLA" was read as recommending one (m371)',
    'G027-21': 'MakerBot Tough is filed under PLA and reads the PLA guide (m374)',
    'G081-06': 'its drying is conditional ("when the spools has been exposed to moisture", m377)',
    'G164-06': 'its drying is conditional ("If absorbed moisture levels are too high", m382)',
    'G046-03': 'its nozzle and bed had been read to the °F numbers 473 and 140 as °C; m381 reads 220-245 and 40-60 °C',
    'G027-58': 'a glow-pigmented Variant reads no printer guide (m374, D129)',
}
L = ['# Decision diff: check round 3 against its baseline', '',
     '> **Historical record** (2026-10-05): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).', '',
     'Against `baseline/` (the snapshot at the round\'s start, ecf6b99), after m369 to m382. Written by `decision-diff.py`.', '',
     '## Template answers', '',
     f'- **Material verdicts moved: {len(verdict)}.**' + (' No material passes, fails or is unresolved in any template where it did not before.' if not verdict else ''),
     ]
for k, b, a in verdict: L.append(f'  - {k[0]} ({k[1]}): {a["Material"]} {b["Verdict"]} → {a["Verdict"]}.')
L += [f'- **Product counts moved in {sum(counts.values())} template rows** ({", ".join(f"{t} {n}" for t, n in counts.most_common())}): the merges (m373) took nine duplicate products out of their materials\' counts, rows moved to the product their sheet names (m372, m374), values typed annealed or dry now stand for that state (m370, m376, m378), and seven new Variants (six for their density, one glow-pigmented) count apart (m374). Materials whose counts moved: {", ".join(sorted(mats))}.',
      f'- **Estimate-mode candidates moved: {len(cand)}** (Explore with estimates, where an estimate may screen a material out but never in, D43):']
for k, m, x, y, s in cand: L.append(f'  - {k[0]}: {m} {x} → {y} ({s or "no screen"}).')
L += ['  Each follows the estimate model\'s refit on the corrected observations. The screening ends\' back-test counts moved by one or two (`build/snapshot/screening.csv`).', '',
      '## Print answers', '',
      f'{len(gone)} products left the list because they merged into another grade ({", ".join(gone)}). {len(moves)} products\' print answers moved:', '']
for g, p, m, d in moves:
    why = WHY.get(g, 'a density Variant reads no printer guide (m374, D129), so the gates only the guide answered are unknown')
    L.append(f'- {g} {p} ({m}): {"; ".join(d)}. {why[0].upper() + why[1:]}.')
(HERE / 'DECISION-DIFF.md').write_text('\n'.join(L) + '\n')
print('\n'.join(L))
