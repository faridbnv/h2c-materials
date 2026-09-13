"""Audited cell edits; reuse the repository XML editor and preserve every other ZIP part.
Run once from the repository root. Source PDFs were retrieved again and SHA256 matched Sources.
"""
import csv
import hashlib
import sys
import re
from decimal import Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from workbook_xml import Book, SHEETS, col_letter

path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'data/H2C_FDM_Material_Database.xlsx'
expected = '9267c9a3b6197ab9a374f6e2b052b810bf3f352e5e5dd23faf502af58078363f'
assert hashlib.sha256(path.read_bytes()).hexdigest() == expected, 'Workbook changed; re-audit before applying'
book = Book(path)
for key, value in [('V000539', '4.3'), ('V000894', '4.4'), ('V000920', '4.4'), ('V001349', '1.3')]:
    book.set('Properties', key, 'Raw numeric', Decimal(value))
    # Preserve the existing formula; update only its cached result after changing Raw numeric.
    row = book.row_of('Properties', key)
    ref = f'L{row}'
    part = SHEETS['Properties'][0]
    xml = book.xml(part)
    match = re.search(r'<x:c r="' + ref + r'"[^>]*>.*?</x:c>', xml, re.S)
    assert match and '<x:f ' in match.group(0), f'{ref}: expected existing normalization formula'
    before = book.cell_text(match.group(0))
    cell = re.sub(r'<x:v>.*?</x:v>', f'<x:v>{value}</x:v>', match.group(0))
    book.put(part, xml[:match.start()] + cell + xml[match.end():])
    book.changes.append(dict(sheet='Properties', record=key, cell=ref, action='Recalculated cache',
                             field='Normalized value', before=before, after=value))
    book.set('Properties', key, 'Data status', 'Published value (transcription corrected)')
    book.set('Properties', key, 'Notes', 'Decimal comma preserved from the cited manufacturer PDF; re-read and source SHA256 matched 2026-09-13. Systematic audit SD-01.')
for key in ['V000894', 'V000920']:
    book.set('Properties', key, 'Property', 'Tensile strain at strength')
    book.set('Properties', key, 'Notes', 'Source says elongation at maximum force, not at break; 4,40% = 4.4%. Dry, 50 mm/min; table heading 23 C / 50% RH. Source SHA256 matched 2026-09-13. SD-01 / SD-02.')
    book.set('Properties', key, 'Moisture condition', 'Dry (source row); table heading 50% RH')
    book.set('Properties', key, 'Test temperature', '23°C')
book.set('Properties', 'V000419', 'Data status', 'Published qualitative result')
book.set('Grades', 'G091-01', 'Availability', 'Retired mapping; audit trail only')
book.set('Materials', 'M091', 'GradeIDs', 'G091-02')
book.save(path)
with (HERE / 'changelog.csv').open('w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['sheet', 'record', 'cell', 'action', 'field', 'before', 'after'])
    writer.writeheader()
    writer.writerows(book.changes)
print(f'{len(book.changes)} cell changes; output SHA256 {hashlib.sha256(path.read_bytes()).hexdigest()}')
