#!/usr/bin/env python3
"""
Record two rules in the workbook's Method sheet, which is where the rules the database is built under
live (docs/DATA-MODEL.md, "The Method sheet is executable").

  Identity / Retired mappings  The exact Availability phrase that makes a grade an audit record. The
                               systematic data audit introduced it in code only.
  Comparison / Estimates       What an estimate may be built from and what it may do, as implemented
                               in build/src/estimates.js and app/js/engine/constraints.js (D42).

    python3 docs/audits/2026-09-13-systematic-data-review/apply-workbook-changes.py

Appends two rows and nothing else. Refuses any workbook but the one it was written against.
"""

import csv
import hashlib
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from workbook_xml import Book  # noqa: E402

EXPECTED_SHA256 = 'e8532eda180f008afa2960c78cf0b5b2eb911afe2d95a1f8ed388ebcf4cd1175'

ROWS = [
    {'Section': 'Identity', 'Topic': 'Retired mappings',
     'Definition / rule': 'A grade whose Availability reads exactly "Retired mapping; audit trail only" is kept as an audit record and is inactive: it is not listed in its material\'s GradeIDs, its profiles leave the material\'s print summary and gates, and no active measurement, price, headline or use record may cite it. Any other wording mentioning retirement is rejected by the build, because a near miss would silently leave the grade active.'},
    {'Section': 'Comparison', 'Topic': 'Estimates',
     'Definition / rule': 'A missing headline may carry an estimate, always shown as an estimate: first from the material\'s own other grades with the headline\'s test semantics, then from other materials of the same polymer and reinforcement class, then from a declared close-analogue group as context only. Every estimate is a 95% prediction interval for one more formulation, using a documented between-formulation spread or the sample\'s own where wider. An estimate never passes a requirement. In exploration it may screen a material out only from its own grades or at least five peer formulations, only when the whole interval fails, and never when one of the material\'s own measurements of that property could meet the requirement. Display families and behaviour classes are never pooled. Parameters: build/mappings/estimate-model.json.'},
]


def main(path):
    digest = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    if digest != EXPECTED_SHA256:
        sys.exit(f'Refusing to run: workbook SHA-256 is {digest}, expected {EXPECTED_SHA256}.')
    book = Book(path)
    for row in ROWS:
        book.append('Method', row)
    book.save(path)
    with open(HERE / 'changelog.csv', 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['sheet', 'record', 'cell', 'action', 'field', 'before', 'after'])
        w.writeheader()
        w.writerows(book.changes)
    print(f'{len(book.changes)} changes; SHA-256 now {hashlib.sha256(Path(path).read_bytes()).hexdigest()}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else str(ROOT / 'data/H2C_FDM_Material_Database.xlsx'))
