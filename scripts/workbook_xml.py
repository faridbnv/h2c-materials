"""
Minimal, reviewable edits to the workbook's sheet XML.

The build never writes the workbook (docs/DECISIONS.md, D1). When an audit changes it, the change is
a script under docs/audits/<folder>/ that uses this module, so every edit goes through the same code:
an existing cell keeps its style and gets a new value, a new row is appended to its Excel table and
the table range grows to cover it, and nothing else in the file is touched.
"""

import html
import re
import shutil
import tempfile
import zipfile
from decimal import Decimal
from pathlib import Path

SHEETS = {  # sheet name -> (worksheet part, table part, header row)
    'Materials': ('xl/worksheets/sheet1.xml', 'xl/tables/table1.xml', 6),
    'Grades': ('xl/worksheets/sheet2.xml', 'xl/tables/table2.xml', 3),
    'Print setup': ('xl/worksheets/sheet3.xml', 'xl/tables/table3.xml', 3),
    'Properties': ('xl/worksheets/sheet4.xml', 'xl/tables/table4.xml', 3),
    'Use & durability': ('xl/worksheets/sheet5.xml', 'xl/tables/table5.xml', 3),
    'Prices CA': ('xl/worksheets/sheet6.xml', 'xl/tables/table6.xml', 3),
    'Sources': ('xl/worksheets/sheet7.xml', 'xl/tables/table7.xml', 3),
    'Coverage': ('xl/worksheets/sheet8.xml', 'xl/tables/table8.xml', 3),
    'Method': ('xl/worksheets/sheet9.xml', 'xl/tables/table9.xml', 3),
}

NS_ROW = re.compile(r'<x:row r="(\d+)"[^>]*>.*?</x:row>', re.S)

def col_letter(i):
    s = ''
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s

def col_index(letters):
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n - 1

def xml_text(s):
    return html.escape(str(s), quote=False)

class Book:
    def __init__(self, path):
        self.zin = zipfile.ZipFile(path)
        self.parts = {n: self.zin.read(n) for n in self.zin.namelist()}
        self.shared = [
            html.unescape(''.join(re.findall(r'<x:t[^>]*>(.*?)</x:t>', si, re.S)))
            for si in re.findall(r'<x:si>(.*?)</x:si>', self.parts['xl/sharedStrings.xml'].decode(), re.S)
        ]
        self.changes = []

    def xml(self, part):
        return self.parts[part].decode()

    def put(self, part, text):
        self.parts[part] = text.encode()

    def headers(self, sheet):
        table = self.xml(SHEETS[sheet][1])
        return [html.unescape(n) for n in re.findall(r'<x:tableColumn id="\d+" name="([^"]*)"', table)]

    def cell_text(self, cell):
        t = re.search(r' t="([^"]+)"', cell)
        v = re.search(r'<x:v>(.*?)</x:v>', cell, re.S)
        if not v:
            return None
        if t and t.group(1) == 's':
            return self.shared[int(v.group(1))]
        return html.unescape(v.group(1))

    def row_of(self, sheet, key):
        part = SHEETS[sheet][0]
        for rm in NS_ROW.finditer(self.xml(part)):
            a = re.search(r'<x:c r="A%s"[^>]*?(?:/>|>.*?</x:c>)' % rm.group(1), rm.group(0), re.S)
            if a and self.cell_text(a.group(0)) == key:
                return int(rm.group(1))
        raise KeyError(f'{sheet}: no row with identifier {key}')

    def get(self, sheet, row, column):
        col = col_letter(self.headers(sheet).index(column))
        xml = self.xml(SHEETS[sheet][0])
        rm = re.search(r'<x:row r="%d"[^>]*>.*?</x:row>' % row, xml, re.S)
        c = re.search(r'<x:c r="%s%d"[^>]*?(?:/>|>.*?</x:c>)' % (col, row), rm.group(0), re.S)
        return self.cell_text(c.group(0)) if c else None

    def set(self, sheet, key, column, value, key_column=None):
        row = self.row_of(sheet, key)
        part = SHEETS[sheet][0]
        col = col_letter(self.headers(sheet).index(column))
        ref = f'{col}{row}'
        xml = self.xml(part)
        rm = re.search(r'<x:row r="%d"[^>]*>.*?</x:row>' % row, xml, re.S)
        c = re.search(r'<x:c r="%s"([^>]*?)(?:/>|>.*?</x:c>)' % ref, rm.group(0), re.S)
        if not c:
            raise KeyError(f'{sheet} {ref}: cell not present')
        before = self.cell_text(c.group(0))
        style = re.search(r' s="(\d+)"', c.group(1))
        s_attr = f' s="{style.group(1)}"' if style else ''
        new = (f'<x:c r="{ref}"{s_attr} t="n"><x:v>{value}</x:v></x:c>' if isinstance(value, Decimal)
               else f'<x:c r="{ref}"{s_attr} t="str"><x:v>{xml_text(value)}</x:v></x:c>')
        new_row = rm.group(0)[:c.start()] + new + rm.group(0)[c.end():]
        self.put(part, xml[:rm.start()] + new_row + xml[rm.end():])
        self.changes.append(dict(sheet=sheet, record=key, cell=ref, action='Edited', field=column,
                                 before=before, after=str(value)))

    def append(self, sheet, record):
        part, table_part, _ = SHEETS[sheet]
        headers = self.headers(sheet)
        missing = [h for h in headers if h not in record]
        if missing:
            raise KeyError(f'{sheet} {record.get(headers[0])}: no value for {missing}')
        xml = self.xml(part)
        last = max(int(r) for r in re.findall(r'<x:row r="(\d+)"', xml))
        row = last + 1
        cells = []
        for i, h in enumerate(headers):
            v = record[h]
            ref = f'{col_letter(i)}{row}'
            cells.append(f'<x:c r="{ref}" t="n"><x:v>{v}</x:v></x:c>' if isinstance(v, Decimal)
                         else f'<x:c r="{ref}" t="str"><x:v>{xml_text(v)}</x:v></x:c>')
        xml = xml.replace('</x:sheetData>', f'<x:row r="{row}">{"".join(cells)}</x:row></x:sheetData>', 1)
        self.put(part, xml)
        table = self.xml(table_part)
        end_col = col_letter(len(headers) - 1)
        table = re.sub(r'ref="A(\d+):%s\d+"' % end_col, lambda mm: f'ref="A{mm.group(1)}:{end_col}{row}"', table)
        self.put(table_part, table)
        self.changes.append(dict(sheet=sheet, record=record[headers[0]], cell=f'A{row}:{end_col}{row}', action='Added',
                                 field='', before='', after=''))

    def save(self, path):
        tmp = Path(tempfile.mkstemp(suffix='.xlsx')[1])
        with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as out:
            for info in self.zin.infolist():
                out.writestr(info, self.parts[info.filename])
        shutil.move(tmp, path)


def next_id(book, sheet, prefix, width):
    part = SHEETS[sheet][0]
    xml = book.xml(part)
    best = 0
    for rm in NS_ROW.finditer(xml):
        a = re.search(r'<x:c r="A%s"[^>]*?(?:/>|>.*?</x:c>)' % rm.group(1), rm.group(0), re.S)
        t = a and book.cell_text(a.group(0))
        if t and t.startswith(prefix) and t[len(prefix):].isdigit():
            best = max(best, int(t[len(prefix):]))
    return lambda i: f'{prefix}{best + 1 + i:0{width}d}'


