#!/usr/bin/env python3
"""
Give every commercial product exactly one home in the workbook.

Five canonical rows held products that belong to specific rows, and six products were filed under two
or three materials (REPORT.md in this folder). This script, run once against the workbook it was
written for:

  1. Retires each duplicate grade with the exact marker, and marks its measurements and evidence
     "Retired duplicate record". Before touching anything it proves that every retired record has an
     identical twin under the grade that keeps it, so nothing is lost.
  2. Re-files the products that were in the wrong row (iSANMATE PA6 CF, AmideX PA6-GF30, PolyMide
     PA6-GF, PolyFlex TPU90): a new grade under the right material, the old one retired, and every
     measurement, profile, price and evidence record moved to the new grade.
  3. Makes PA, PA-CF, PA-GF, TPE and CoPA family entries (Scope "Family entry"): no product, no values.
  4. Gives PLA Silk and CoPE their own formulation keys: they are two columns of one Polymaker data
     sheet, not one product.
  5. Records PA-ESD's own print settings from its hash-matched data sheet, which the retired duplicate
     had been standing in for.

    python3 apply-workbook-changes.py <workbook.xlsx>      edits in place, writes changelog.csv
"""

import csv
import hashlib
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'scripts'))
from workbook_xml import SHEETS, NS_ROW, Book, col_letter, next_id  # noqa: E402

EXPECTED_SHA256 = '1e7589120cb1c5c044c173edba75af0608b20162d752f18c3ad0b0e4594c1cad'
HERE = Path(__file__).resolve().parent
RETIRED = 'Retired mapping; audit trail only'
RETIRED_RECORD = 'Retired duplicate record'
TODAY = '2026-09-13'

# duplicate grade -> the grade that keeps the same data sheet
DUPLICATES = {
    'G047-01': 'G057-01',  # Polymaker PolyMide CoPA, under PA
    'G047-02': 'G057-02',  # 3DXTECH AmideX PA6 Copolymer, under PA
    'G047-03': 'G049-01',  # Spectrum PA6 Neat BK, under PA
    'G061-01': 'G057-01',  # Polymaker PolyMide CoPA, under CoPA
    'G061-02': 'G057-02',  # 3DXTECH AmideX PA6 Copolymer, under CoPA
    'G062-01': 'G053-01',  # 3DXTECH CarbonX CF PA12, under PA-CF
    'G062-02': 'G059-01',  # Polymaker Fiberon PA612-CF15, under PA-CF
    'G064-02': 'G065-01',  # Polymaker Fiberon PA612-ESD, under PA-ESD
    'G044-01': 'G046-01',  # BASF Ultrafuse TPC 45D, under TPE
}
# mis-filed grade -> (new grade, material)
REFILE = {
    'G062-03': ('G050-02', 'M050', 'iSANMATE PA6 CF is a PA6-CF (TDS: "PA6 CF")'),
    'G063-01': ('G051-02', 'M051', '3DXTECH AmideX PA6-GF30 is a PA6-GF (TDS title "AmideX PA6-GF30 Glass Fiber Nylon")'),
    'G063-02': ('G051-03', 'M051', 'Polymaker PolyMide PA6-GF is a PA6-GF (TDS: "a glass fiber reinforced PA6 (Nylon 6) filament")'),
    'G044-02': ('G039-03', 'M039', 'Polymaker PolyFlex TPU90 is a TPU'),
}
FAMILY = {
    'M047': ('PA', 'a family entry for unfilled aliphatic polyamides: PA6, PA6/66, PA66, PA12, PA612'),
    'M062': ('PA-CF', 'a family entry for carbon-fibre polyamides: PA6-CF, PA66-CF, PA12-CF, PA612-CF, PAHT-CF'),
    'M063': ('PA-GF', 'a family entry for glass-fibre polyamides: PA6-GF, PA12-GF, PA612-GF'),
    'M044': ('TPE', 'a family entry for thermoplastic elastomers: TPU (all grades), PEBA, TPC / TPEE, OBC'),
    'M061': ('CoPA', 'an alias of PA6/66: both products it held are nylon 6 and 6,6 copolymers'),
}
# family-context evidence (GradeID Not applicable) a family entry keeps
KEEP_USE = {'M047': 'Q00298', 'M044': 'Q00294; Q00295; Q00296; Q00297'}
KEEP_ENV = {'M047': 'Q00299'}
KEEP_PRINTING = {'M047': 'Q00359'}


def table(book, sheet):
    """Every data row of a sheet as {header: text}, with its row number."""
    hs = book.headers(sheet)
    out = []
    for rm in NS_ROW.finditer(book.xml(SHEETS[sheet][0])):
        r = int(rm.group(1))
        cells = {}
        for cm in re.finditer(r'<x:c r="([A-Z]+)%d"[^>]*?(?:/>|>.*?</x:c>)' % r, rm.group(0), re.S):
            cells[cm.group(1)] = book.cell_text(cm.group(0))
        d = {h: cells.get(col_letter(i)) for i, h in enumerate(hs)}
        if d[hs[0]] and d[hs[0]] != hs[0] and r > SHEETS[sheet][2]:
            d['__row'] = r
            out.append(d)
    return out


def ids(cell):
    return [x.strip() for x in re.split(r'[;,]', cell or '') if x.strip() and x.strip() not in ('Not published', 'Not applicable')]


def main(path):
    digest = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    if digest != EXPECTED_SHA256:
        sys.exit(f'Refusing to run: workbook SHA-256 is {digest}, expected {EXPECTED_SHA256}.')
    book = Book(path)
    props, evid, prices, profiles, grades = (table(book, s) for s in ('Properties', 'Use & durability', 'Prices CA', 'Print setup', 'Grades'))

    # -- 1. prove every duplicate record has a twin under the kept grade --------------------------
    msig = lambda r: (r['Property'], r['Direction'], r['Normalized value'], r['Normalized unit'], r['Moisture condition'], r['Standard / load'], r['Specimen type'])
    esig = lambda r: (r['Domain'], r['Topic'], r['Finding'])
    for dup, keep in DUPLICATES.items():
        for rows, sig, what in ((props, msig, 'measurement'), (evid, esig, 'evidence')):
            kept = [sig(r) for r in rows if r['GradeID'] == keep]
            for r in rows:
                if r['GradeID'] != dup:
                    continue
                if sig(r) not in kept:
                    sys.exit(f'Refusing to run: {what} {r[list(r)[0]]} of {dup} has no identical record under {keep}')
                kept.remove(sig(r))

    grade = {g['GradeID']: g for g in grades}
    for dup, keep in DUPLICATES.items():
        book.set('Grades', dup, 'Availability', RETIRED)
        book.set('Grades', dup, 'Selected-grade rationale',
                 f'Retired {TODAY}: duplicate of {keep}, the same data sheet filed under another material. Every measurement and evidence record has an identical twin under {keep}')
        for r in props:
            if r['GradeID'] == dup:
                book.set('Properties', r['MeasurementID'], 'Data status', RETIRED_RECORD)
                book.set('Properties', r['MeasurementID'], 'Notes', f'Retired {TODAY}: duplicate of the same record under {keep}')
        for r in evid:
            if r['GradeID'] == dup:
                book.set('Use & durability', r['EvidenceID'], 'Evidence type', RETIRED_RECORD)
        for r in prices:
            if r['GradeID'] == dup:
                book.set('Prices CA', r['PriceID'], 'Regular price basis', f'Quarantined {TODAY}: duplicate listing of the product under {keep}')
                book.set('Prices CA', r['PriceID'], 'Headline sample', '0')

    # -- 2. re-file mis-filed products ---------------------------------------------------------------
    for old, (new, mid, why) in REFILE.items():
        row = {h: grade[old][h] if grade[old][h] is not None else 'Not published' for h in book.headers('Grades')}
        row.update({'GradeID': new, 'MaterialID': mid,
                    'Selected-grade rationale': f'{grade[old]["Selected-grade rationale"]}. Re-filed {TODAY} from {old}: {why}'})
        book.append('Grades', row)
        book.set('Grades', old, 'Availability', RETIRED)
        book.set('Grades', old, 'Selected-grade rationale', f'Retired {TODAY}: re-filed as {new} under {mid}. {why}')
        # The source register names the grades a data sheet applies to; it follows the product.
        book.set('Sources', grade[old]['SourceID'], 'Applicable grades', f'{new} (re-filed {TODAY} from {old})')
        for sheet, rows, key in (('Properties', props, 'MeasurementID'), ('Print setup', profiles, 'ProfileID'),
                                 ('Prices CA', prices, 'PriceID'), ('Use & durability', evid, 'EvidenceID')):
            for r in rows:
                if r['GradeID'] == old:
                    book.set(sheet, r[key], 'MaterialID', mid)
                    book.set(sheet, r[key], 'GradeID', new)
                    if sheet == 'Prices CA' and r['Headline sample'] == '1':
                        # Its old material's price headline was built from it; the new one's is not.
                        book.set(sheet, r[key], 'Headline sample', '0')

    # -- 3. materials ------------------------------------------------------------------------------------
    NP, NA = 'Not published', 'Not applicable'
    for mid, (name, what) in FAMILY.items():
        edits = {
            'Scope': 'Family entry', 'Representative grade': NP, 'GradeIDs': NP,
            'Nozzle guidance': NP, 'Bed guidance': NP, 'Chamber guidance': NP, 'Printing evidence': KEEP_PRINTING.get(mid, NA),
            'Density kg/m³': NP, 'Tensile modulus XY GPa': NP, 'Tensile strength XY MPa': NP, 'Elongation at break XY %': NP,
            'Mechanical evidence': NA, 'Measurement conditions': 'Not applicable: family entry', 'HDT 0.45 MPa °C': NP, 'Thermal evidence': NA,
            'Price CAD/kg': 'Not available in sampled Canadian market', 'Price evidence': NA,
            'Price basis': 'Family entry: no product of its own',
            'Use evidence': KEEP_USE.get(mid, NA), 'Environmental evidence': KEEP_ENV.get(mid, NA),
            'Headline basis': 'Family entry: no values of its own; see its member materials',
            'Identity notes': f'{name} is {what}. Until {TODAY} this row held products that belong to those rows, so their numbers appeared twice; the products now live only in their own rows (docs/audits/2026-09-13-duplicate-products/).',
        }
        for column, value in edits.items():
            book.set('Materials', mid, column, value)
    mats = {r['MaterialID']: r for r in table(book, 'Materials')}
    receive = {
        'M050': {'GradeIDs': 'G050-01; G050-02'},
        'M051': {'GradeIDs': 'G051-01; G051-02; G051-03',
                 'Environmental evidence': '; '.join(ids(mats['M051']['Environmental evidence']) + ['Q00216', 'Q00217', 'Q00218', 'Q00219', 'Q00220', 'Q00221']),
                 'Use evidence': 'Q00222'},
        'M039': {'GradeIDs': 'G039-01; G039-02; G039-03',
                 'Environmental evidence': '; '.join(ids(mats['M039']['Environmental evidence']) + ['Q00165', 'Q00166', 'Q00167', 'Q00168', 'Q00169', 'Q00170'])},
        'M064': {'GradeIDs': 'G064-01', 'Use evidence': NA},
    }
    for mid, edits in receive.items():
        for column, value in edits.items():
            book.set('Materials', mid, column, value)

    # PA-ESD's print window came only from the retired Fiberon PA612-ESD duplicate. Its own product's data
    # sheet, X-3DXSTAT-ESD-PA12-TDS-v1 (SHA-256 matches the register), prints the settings it was
    # printed with; they had not been transcribed.
    book.set('Print setup', 'P0082', 'Nozzle °C', '265-285 °C')
    book.set('Print setup', 'P0082', 'Bed °C', '90-110 °C')
    book.set('Materials', 'M064', 'Nozzle guidance', '265-285 °C')
    book.set('Materials', 'M064', 'Bed guidance', '90-110 °C')

    # -- 4. one product, one formulation key -------------------------------------------------------------
    book.set('Grades', 'G008-01', 'Shared formulation key', 'R-POLYMAKER-PANCHROMA-TDS-V2-1#Silk')
    book.set('Grades', 'G091-02', 'Shared formulation key', 'R-POLYMAKER-PANCHROMA-TDS-V2-1#CoPE')

    # -- coverage ---------------------------------------------------------------------------------------------
    members = {mid: what for mid, (_, what) in FAMILY.items()}
    for r in table(book, 'Coverage'):
        mid = r['MaterialID']
        if mid in FAMILY and r['Domain'] not in ('Identity', 'H2C status'):
            book.set('Coverage', r['CoverageID'], 'Status', 'Not applicable')
            book.set('Coverage', r['CoverageID'], 'Finding', f'Family entry since {TODAY}: no product of its own. {FAMILY[mid][0]} is {members[mid]}.')
        if mid == 'M064' and r['Domain'] == 'Grades':
            book.set('Coverage', r['CoverageID'], 'Finding', '1 distinct manufacturer(s) documented against target 3. Fiberon PA612-ESD (G064-02) duplicated PA612-ESD and was retired 2026-09-13.')
    new_rows = []
    add = lambda mid, domain, status, finding: new_rows.append({'MaterialID': mid, 'Domain': domain, 'Status': status, 'Finding': finding})
    for dup, keep in DUPLICATES.items():
        add(grade[dup]['MaterialID'], 'Identity', 'Resolved',
            f'{dup} ({grade[dup]["Manufacturer"]} {grade[dup]["Product name"]}) retired {TODAY}: the same data sheet is {keep} under {grade[keep]["MaterialID"]}. Its records were identical to those of {keep}.')
    for old, (new, mid, why) in REFILE.items():
        add(mid, 'Grades', 'Evidence recorded', f'{new} re-filed {TODAY} from {old} under {grade[old]["MaterialID"]}: {why}. Its measurements, profiles, prices and evidence moved with it.')
    add('M064', 'Print setup', 'Evidence recorded', f'3DXSTAT ESD PA12 TDS: extrusion 265-285 °C, bed 90-110 °C (P0082), recovered {TODAY} from the hash-matched data sheet. The earlier window came from the retired Fiberon PA612-ESD duplicate.')
    add('M008', 'Identity', 'Resolved', f'G008-01 and CoPE G091-02 are two columns of the Panchroma TDS V2.1 and shared one formulation key; separated {TODAY}.')
    cov = next_id(book, 'Coverage', 'C', 5)
    for i, row in enumerate(new_rows):
        book.append('Coverage', {'CoverageID': cov(i), **row})

    book.append('Method', {'Section': 'Identity', 'Topic': 'Family entries',
                           'Definition / rule': 'A canonical name that is a family or an alias (PA, PA-CF, PA-GF, TPE; CoPA for PA6/66) has Scope "Family entry". It owns no product and carries no value; each commercial product is recorded once, under the most specific material it is. A product found under two materials is retired from the less specific one with the retirement marker, and its records are marked "Retired duplicate record" after proving each has an identical twin. Members: build/mappings/family-entries.json.'})

    book.save(path)
    with open(HERE / 'changelog.csv', 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['sheet', 'record', 'cell', 'action', 'field', 'before', 'after'])
        w.writeheader()
        w.writerows(book.changes)
    print(f'{len(book.changes)} changes; SHA-256 now {hashlib.sha256(Path(path).read_bytes()).hexdigest()}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else str(HERE.parents[2] / 'data/H2C_FDM_Material_Database.xlsx'))
