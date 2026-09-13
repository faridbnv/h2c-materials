#!/usr/bin/env python3
"""
Apply the 2026-09-13 coverage consolidation to the workbook.

Everything this changes is listed in plan.json, which plan.mjs computes from the compiled snapshot
and the rules in build/src/coverage-rules.js. This script adds nothing of its own: it appends the
planned Use & durability rows, rewrites the planned Environmental evidence cells and coverage rows,
and records each change in changelog.csv.

    npm run build
    node docs/audits/2026-09-13-coverage-consolidation/plan.mjs
    python3 docs/audits/2026-09-13-coverage-consolidation/apply-workbook-changes.py

It refuses to run on a workbook whose SHA-256 is not the one plan.json was computed against.
"""

import csv
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from workbook_xml import Book  # noqa: E402


def main(path):
    plan = json.loads((HERE / 'plan.json').read_text())
    digest = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    if digest != plan['workbookSha256']:
        sys.exit(f'Refusing to run: workbook SHA-256 is {digest}, plan.json was computed against {plan["workbookSha256"]}.')
    book = Book(path)

    for row in plan['newEvidence']:
        book.append('Use & durability', row)
    for edit in plan['materialEdits']:
        book.set('Materials', edit['MaterialID'], edit['column'], edit['after'])
    for edit in plan['coverageEdits']:
        status, finding = edit['after']
        if edit['before'][0] != status:
            book.set('Coverage', edit['CoverageID'], 'Status', status)
        if edit['before'][1] != finding:
            book.set('Coverage', edit['CoverageID'], 'Finding', finding)

    book.save(path)
    with open(HERE / 'changelog.csv', 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['sheet', 'record', 'cell', 'action', 'field', 'before', 'after'])
        w.writeheader()
        w.writerows(book.changes)
    print(f'{len(book.changes)} changes; SHA-256 now {hashlib.sha256(Path(path).read_bytes()).hexdigest()}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else str(ROOT / 'data/H2C_FDM_Material_Database.xlsx'))
