#!/usr/bin/env python3
"""
Apply the 2026-09-13 missing-data research to the workbook, reviewably.

The build never writes the workbook (docs/DECISIONS.md, D1). This script is the record of the one
deliberate edit that implemented REPORT.md in this folder. It edits the sheet XML directly, so
styles, formulas, conditional formatting and table definitions outside the named cells are left
exactly as they were: an existing cell keeps its style and receives a new value, and a new row is
appended to its table, whose range is extended to cover it. That is the same shape the
2026-09-13 manufacturer audit used.

Every value below was re-read from the source it cites on 2026-09-13, and the source files'
SHA-256 digests are recorded in the Sources rows. Where a source could not be retrieved, nothing
from it was entered.

    python3 apply-workbook-changes.py <workbook.xlsx>      edits in place, writes changelog.csv

It refuses to run on a workbook that does not have the SHA-256 it was written against, so it can
never be applied twice or to a workbook that has moved underneath it.
"""

import csv
import hashlib
import html
import re
import shutil
import sys
import tempfile
import zipfile
from decimal import Decimal
from pathlib import Path

EXPECTED_SHA256 = '9018c6368a1e8c2184ce74407ded8cd12d237cf6bd90bf74e67d8deaab3a0acf'
HERE = Path(__file__).resolve().parent
TODAY = '2026-09-13'

SHEETS = {  # sheet name -> (worksheet part, table part, header row)
    'Materials': ('xl/worksheets/sheet1.xml', 'xl/tables/table1.xml', 6),
    'Grades': ('xl/worksheets/sheet2.xml', 'xl/tables/table2.xml', 3),
    'Print setup': ('xl/worksheets/sheet3.xml', 'xl/tables/table3.xml', 3),
    'Properties': ('xl/worksheets/sheet4.xml', 'xl/tables/table4.xml', 3),
    'Sources': ('xl/worksheets/sheet7.xml', 'xl/tables/table7.xml', 3),
    'Coverage': ('xl/worksheets/sheet8.xml', 'xl/tables/table8.xml', 3),
    'Method': ('xl/worksheets/sheet9.xml', 'xl/tables/table9.xml', 3),
}

# ---------------------------------------------------------------------------------------- sources

SRC = [
    dict(SourceID='R-ESUN-PLA-LITE-PAGE', Publisher='eSUN', Title='eSUN PLA-Lite product page',
         Revision='Not published', URL='https://www.esun3d.com/epla-lite-product',
         Locator='Printing Parameter: Physical Performance, Mechanical Properties, Recommended Printing Parameters',
         grades='M004 / G004-01', cls='Manufacturer product / guide', status='Retrieved',
         sha='b8807094397d378aee0717e441947378f5d537a510d1c8cf8fb3d89146d1d8b2'),
    dict(SourceID='R-POLYMAKER-SILK-PLA-PAGE', Publisher='Polymaker', Title='Panchroma Silk PLA product page',
         Revision='Not published', URL='https://shop.polymaker.com/products/silk-pla',
         Locator='Technical Specifications', grades='M008 / G008-01', cls='Manufacturer product / guide',
         status='Retrieved', sha='d74050b88ed9f9e214e461804d297fdf98808c991ef496c5bbc2aa6e55da6d5d'),
    dict(SourceID='R-POLYMAKER-PANCHROMA-TDS-V2-1', Publisher='Polymaker', Title='Panchroma Product Data Sheet',
         Revision='V2.1', URL='https://polymaker.com/wp-content/uploads/Panchroma_TDS_V2.1.pdf',
         Locator='Data table; How to make specimens', grades='M008 / G008-01; M091 / G091-02',
         cls='Manufacturer TDS', status='Retrieved',
         sha='12015f8e82a3420ed806e90c8c730645accda3fcc37f6b51f907e0574ff3c895'),
    dict(SourceID='R-POLYMAKER-WIKI-PANCHROMA-COPE', Publisher='Polymaker', Title='Panchroma CoPE | Polymaker Wiki',
         Revision='Not published',
         URL='https://wiki.polymaker.com/polymaker-products/polymaker-filaments/panchroma-tm/panchroma-tm-cope',
         Locator='Recommended printing settings', grades='M091 / G091-02', cls='Manufacturer product / guide',
         status='Retrieved', sha='db568e0f9c59febd061e48b8d79823c1688c3dbdbe842f118cb3d380b2b1bae8'),
    dict(SourceID='R-POLYMAKER-COPE-TDS-V5-4', Publisher='Polymaker', Title='Panchroma CoPE Technical Data Sheet',
         Revision='V5.4', URL='https://polymaker.com/wp-content/uploads/lana-downloads/Panchroma-CoPE_TDS_EN_V5.4.pdf',
         Locator='Cited by the 2026-09-13 research for density 1.296 g/cm³ and elongation 10.5 ± 3.8%',
         grades='M091 / G091-02', cls='Manufacturer TDS',
         status='Not retrieved: HTTP 404 on 2026-09-13. Nothing from this source was entered', sha='Not recorded'),
    dict(SourceID='R-FIBERON-PETGF15-TDS', Publisher='Polymaker (Fiberon)', Title='Fiberon PET-GF15 Technical Data Sheet',
         Revision='V1.0', URL='https://fiberon.polymaker.com/wp-content/uploads/TDS_FIBERON-PET-GF15_V1.0_EN.pdf',
         Locator='Physical, thermal and mechanical properties; recommended printing conditions; how to make specimens',
         grades='M068 / G068-02', cls='Manufacturer TDS', status='Retrieved',
         sha='cdb81cbccd54e790038caf17353bd91172713cb7d35f7d8e16f919124923b37b'),
    dict(SourceID='R-FIBERON-PETGF15-PAGE', Publisher='Polymaker (Fiberon)', Title='Fiberon PET-GF15 product page',
         Revision='Not published', URL='https://fiberon.polymaker.com/product/pet-gf15/',
         Locator='Cited by the 2026-09-13 research for chamber guidance', grades='M068 / G068-02',
         cls='Manufacturer product / guide',
         status='Not retrieved: HTTP 403 on 2026-09-13. Nothing from this source was entered', sha='Not recorded'),
    dict(SourceID='R-FILLAMENTUM-CPE-HG100-TDS', Publisher='Fillamentum', Title='CPE HG100 Datasheet',
         Revision='2019-01-03', URL='https://fillamentum.com/wp-content/uploads/2020/10/Technical-Data-Sheet_CPE-HG100_03012019.pdf',
         Locator='Physical, mechanical and thermal properties', grades='M089 / G089-01', cls='Manufacturer TDS',
         status='Retrieved', sha='ad4f1420c47b40cc8972c202724dae27c1718c9070938e077c6150f33071f495'),
    dict(SourceID='R-FILLAMENTUM-CPE-HG100-GUIDE', Publisher='Fillamentum', Title='3D Printing Guide: Fillamentum CPE HG100',
         Revision='Not published', URL='https://fillamentum.com/wp-content/uploads/2021/02/Fillamentum_Printing_Guide_CPE-HG100.pdf',
         Locator='Printing parameters', grades='M089 / G089-01', cls='Manufacturer product / guide',
         status='Retrieved', sha='cd37bc12f747170a4f51a8f9cf18b40fac21652f1f0b02802432207cf95ce19b'),
    dict(SourceID='R-FILLAMENTUM-CPE-CF112-GUIDE', Publisher='Fillamentum', Title='3D Printing Guide: Fillamentum CPE CF112 Carbon',
         Revision='Not published', URL='https://fillamentum.com/wp-content/uploads/2020/10/FI_Printing_Guide_CPE-CF112-Carbon.pdf',
         Locator='Printing parameters; Nozzle', grades='M090 / G090-01', cls='Manufacturer product / guide',
         status='Retrieved', sha='fed13e64605e32d803a832009efcebef37aa0204e0f8282c7b67d206ddc7137a'),
    dict(SourceID='R-COLORFABB-NGEN-TDS-V2', Publisher='colorFabb', Title='Technical datasheet colorFabb_nGen',
         Revision='v2.0, 2023-09-01', URL='https://colorfabb.com/media/datasheets/tds/colorfabb/TDS_E_ColorFabb_nGen.pdf',
         Locator='Typical properties; guideline for print settings; notes', grades='M092 / G092-01',
         cls='Manufacturer TDS', status='Retrieved',
         sha='d0a40f96297dcfd4e658dd0ffadeb0e848aafd66c6371b516394f5475b956afa'),
]

# ----------------------------------------------------------------------------------------- grades

DEFAULT_DIAMETER = 'Check 1.75 mm variant; diameter is not part tolerance'
GRADES = [
    dict(GradeID='G004-01', MaterialID='M004', Manufacturer='eSUN', **{
        'Product name': 'PLA-Lite', 'Shared formulation key': 'R-ESUN-PLA-LITE-PAGE',
        'Composition / filler': 'Not published', 'Colour caveat': 'Properties may vary by colour; use product page scope',
        'Availability': 'Current official eSUN product page retrieved 2026-09-13', 'Certification claims': 'Not published',
        'Selected-grade rationale': 'Technical grade sample for the generic PLA Lite entry, recorded 2026-09-13. The only exact commercial product found under this name with printed-direction data. Not a Bambu Lab product and not the rejected PLA Pure lead',
        'SourceID': 'R-ESUN-PLA-LITE-PAGE', 'Source locator': 'Printing Parameter tab', 'Diameter compatibility': DEFAULT_DIAMETER}),
    dict(GradeID='G008-01', MaterialID='M008', Manufacturer='Polymaker', **{
        'Product name': 'Panchroma Silk PLA', 'Shared formulation key': 'R-POLYMAKER-PANCHROMA-TDS-V2-1',
        'Composition / filler': 'Not published', 'Colour caveat': 'Silk colour range; use TDS column scope',
        'Availability': 'Current official Polymaker product page retrieved 2026-09-13', 'Certification claims': 'Not published',
        'Selected-grade rationale': 'Technical grade sample of a silk-effect PLA, recorded 2026-09-13 with printed ISO 527 data. It is not the original product this entry was opened for, and Bambu PLA Silk+ is still not substituted',
        'SourceID': 'R-POLYMAKER-PANCHROMA-TDS-V2-1', 'Source locator': 'Data table, Silk column', 'Diameter compatibility': DEFAULT_DIAMETER}),
    dict(GradeID='G068-02', MaterialID='M068', Manufacturer='Polymaker (Fiberon)', **{
        'Product name': 'Fiberon PET-GF15', 'Shared formulation key': 'R-FIBERON-PETGF15-TDS',
        'Composition / filler': 'PET, glass fibre (GF15 product designation)', 'Colour caveat': 'Use exact TDS scope',
        'Availability': 'Official Fiberon TDS retrieved 2026-09-13; product page returned HTTP 403', 'Certification claims': 'UL 94 HB at 1.5 mm per TDS; not printed-part certification',
        'Selected-grade rationale': 'Second exact PET-GF formulation, recorded 2026-09-13 because it publishes printed XY and Z test data. Flashforge PET-GF (G068-01) is retained unchanged; its values were not overwritten',
        'SourceID': 'R-FIBERON-PETGF15-TDS', 'Source locator': 'TDS V1.0, p. 1', 'Diameter compatibility': DEFAULT_DIAMETER}),
    dict(GradeID='G091-02', MaterialID='M091', Manufacturer='Polymaker', **{
        'Product name': 'Panchroma CoPE', 'Shared formulation key': 'R-POLYMAKER-PANCHROMA-TDS-V2-1',
        'Composition / filler': 'Co-polyester (CoPE); composition not disclosed', 'Colour caveat': 'CoPE colour range; use TDS column scope',
        'Availability': 'Current Polymaker wiki page retrieved 2026-09-13', 'Certification claims': 'Not published',
        'Selected-grade rationale': 'Exact CoPE identity, recorded 2026-09-13 as the representative grade. Replaces G091-01, which duplicated Fillamentum CPE HG100 (the CPE grade G089-01)',
        'SourceID': 'R-POLYMAKER-PANCHROMA-TDS-V2-1', 'Source locator': 'Data table, CoPE column', 'Diameter compatibility': DEFAULT_DIAMETER}),
]
GRADE_EDITS = [
    ('G091-01', 'Selected-grade rationale', 'Superseded 2026-09-13. This row duplicates Fillamentum CPE HG100, the CPE grade G089-01, and is not a CoPE identity. Retained as an audit trail; G091-02 is the representative CoPE grade'),
]

# --------------------------------------------------------------------------------------- profiles

ROUTING = 'Verify exact grade/nozzle; no blanket approval'
AMS = 'Not verified for every grade'
TEMP_GROUP = 'Do not combine high- and low-temperature materials; low-temperature chamber guide limit 45°C. Grade-specific verification required.'

def profile(pid, mid, gid, src, locator, **fields):
    row = {'ProfileID': pid, 'MaterialID': mid, 'GradeID': gid, 'Profile': 'Manufacturer published guidance',
           'H2C left': ROUTING, 'H2C right': ROUTING, 'AMS 2 Pro': AMS, 'AMS HT': AMS,
           'Temperature-group conflict': TEMP_GROUP, 'SourceID': src, 'H2C SourceID': 'H2C-WIKI', 'Locator': locator}
    row.update(fields)
    return row

PROFILES = [
    profile('P0161', 'M004', 'G004-01', 'R-ESUN-PLA-LITE-PAGE', 'Recommended Printing Parameters; product features', **{
        'Nozzle °C': '190-230 °C', 'Bed °C': '45-60 °C', 'Chamber °C': 'Not required (no enclosure needed)',
        'Enclosure': 'No enclosure needed', 'Cooling': '100%', 'Speed': '<200 mm/s (high-speed parameter)'}),
    profile('P0162', 'M008', 'G008-01', 'R-POLYMAKER-SILK-PLA-PAGE', 'Technical Specifications', **{
        'Nozzle °C': '190-230 °C', 'Bed °C': '25-60 °C', 'Chamber °C': 'Not required (enclosure not needed)',
        'Enclosure': 'Not needed', 'Speed': 'Up to 250 mm/s', 'Drying': '55 °C for 6 h'}),
    profile('P0163', 'M091', 'G091-02', 'R-POLYMAKER-WIKI-PANCHROMA-COPE', 'Recommended printing settings', **{
        'Nozzle °C': '190-230 °C', 'Bed °C': '25-60 °C', 'Chamber °C': 'Not required (closure chamber not needed)',
        'Enclosure': 'Not needed', 'Speed': 'Up to 400 mm/s', 'Drying': '55 °C for 6 h (only if moisture absorbed)',
        'Support pairing': 'PolySupport and PolyDissolve S1'}),
    profile('P0164', 'M068', 'G068-02', 'R-FIBERON-PETGF15-TDS', 'Recommended printing conditions; note', **{
        'Nozzle °C': '280-310 °C', 'Bed °C': '70-80 °C', 'Chamber °C': 'Room temp.', 'Cooling': 'Off',
        'Speed': 'Up to 250 mm/s', 'Drying': '100 °C for 10 h', 'Storage humidity': 'Below 20% RH',
        'Abrasion / clogging': 'Wear-resistant nozzle (hardened steel or ruby) highly recommended; a brass nozzle lasts about 9 h',
        'Failure modes': 'Slight surface discolouration with large layer-time differences (crystallinity), not a quality defect'}),
    profile('P0165', 'M089', 'G089-01', 'R-FILLAMENTUM-CPE-HG100-GUIDE', 'Printing parameters', **{
        'Nozzle °C': '255-275 °C', 'Bed °C': '70-85 °C', 'Chamber °C': 'Not required (heated chamber / enclosure not needed)',
        'Enclosure': 'Not needed', 'Plate': 'PEI, mirror / glass', 'Adhesion / release': 'Magigoo, 3DLac, PVA glue',
        'Cooling': '0-15%', 'Speed': '40-60 mm/s', 'Drying': '75 °C for 4 h', 'Storage humidity': 'Airtight bag with desiccant'}),
    profile('P0166', 'M090', 'G090-01', 'R-FILLAMENTUM-CPE-CF112-GUIDE', 'Printing parameters; Nozzle', **{
        'Nozzle °C': '250-270 °C', 'Bed °C': '70-85 °C', 'Chamber °C': 'Not required (heated chamber / enclosure not needed)',
        'Enclosure': 'Not needed', 'Plate': 'PEI, mirror / glass', 'Adhesion / release': 'Magigoo, 3DLac, PVA glue',
        'Cooling': '0-15%', 'Speed': '30-50 mm/s', 'Drying': '75 °C for 3 h', 'Storage humidity': 'Airtight bag with desiccant',
        'Abrasion / clogging': 'Hardened steel, ruby or other wear-resistant nozzle necessary (carbon fibre)'}),
    profile('P0167', 'M092', 'G092-01', 'R-COLORFABB-NGEN-TDS-V2', 'p. 2: Guideline for print settings', **{
        'Nozzle °C': '220-240 °C', 'Bed °C': '75-85 °C', 'Cooling': '0-80%', 'Speed': '40-70 mm/s'}),
]

# Chamber cells that were blank in the workbook although the cited source states them. Each source
# file was re-fetched on 2026-09-13 and its SHA-256 equals the digest already in the Sources sheet,
# so these are omissions from the same document, not new evidence. In the Bambu data sheets the
# chamber row is the first row after the page break in the settings table.
CHAMBER_RECOVERED = {
    'P0004': ('25 - 45 °C', 'B-pla-basic-filament-TDS'),
    'P0005': ('25 - 45 °C', 'B-pla-matte-TDS'),
    'P0011': ('25 - 45 °C', 'B-pla-metal-TDS'),
    'P0012': ('25 - 45 °C', 'B-pla-marble-TDS'),
    'P0013': ('25-45 °C', 'B-pla-sparkle-TDS'),
    'P0015': ('25 - 45 °C', 'B-pla-galaxy-TDS'),
    'P0024': ('35 - 50 °C', 'B-petg-basic-TDS'),
    'P0025': ('35 - 50 °C', 'B-petg-hf-TDS'),
    'P0027': ('35 - 50 °C', 'B-petg-cf-TDS'),
    'P0044': ('45 - 60 °C', 'B-pc-fr-TDS'),
    'P0063': ('45 - 60 °C', 'B-paht-cf-TDS'),
    'P0089': ('50 - 80 °C', 'B-ppa-cf-TDS'),
    'P0093': ('60 - 90 °C', 'B-pps-cf-TDS'),
    'P0100': ('45-60 °C', 'B-support-for-pa-pet-TDS'),
    'P0002': ('Not required (Closure Chamber: No needed)', 'S-POLYCN-PolySonic-PLA-EN-V5-3-TDS'),
    'P0055': ("No setpoint published ('-' in TDS)", 'S-TPC'),
    'P0059': ("No setpoint published ('-' in TDS)", 'S-TPC'),
    'P0092': ('Active heated 60-80 °C (Closed chamber row)', 'S-SPECTRUM-en-tds-spectrum-pps-am230'),
}

# ------------------------------------------------------------------------------------- properties

FACTOR = {'g/cm³': ('1000', 'kg/m³'), 'MPa-modulus': ('0.001', 'GPa')}

def norm(value, factor):
    d = Decimal(value) * Decimal(factor)
    s = format(d.normalize(), 'f')
    return s[:-2] if s.endswith('.0') else s

MEASUREMENTS = []

def m(mid, gid, src, prop, raw, value, unit, *, unc=None, direction='Not published', std='Not published',
      loc='Not published', spec='Not published (do not assume printed)', post='Not published',
      moist='Not published', params='Not published', notch='Not applicable', notes='Not applicable',
      op='=', temp='Not published', status='Published value', modulus=False, key=None):
    if unit == 'g/cm³':
        factor, nunit = FACTOR['g/cm³']
    elif modulus:
        factor, nunit = FACTOR['MPa-modulus']
    else:
        factor, nunit = '1', unit
    numeric = status == 'Published value'
    row = {
        'MaterialID': mid, 'GradeID': gid, 'Property': prop, 'Raw value': raw, 'Raw unit': unit,
        'Raw numeric': value if numeric else 'Not published',
        'Raw uncertainty ±': unc if unc else 'Not applicable', 'Raw upper bound': 'Not applicable',
        'Operator': op if numeric else 'Not applicable', 'Conversion factor': factor,
        'Normalized value': norm(value, factor) if numeric else 'Not published',
        'Normalized uncertainty ±': norm(unc, factor) if unc else 'Not applicable',
        'Normalized upper bound': 'Not applicable', 'Normalized unit': nunit, 'Data status': status,
        'Specimen type': spec, 'Direction': direction, 'Moisture condition': moist, 'Post-processing': post,
        'Test temperature': temp, 'Standard / load': std, 'Notch': notch, 'Specimen / print parameters': params,
        'SourceID': src, 'Locator': loc, 'Notes': notes,
        'Stress max MPa': 'Not applicable', 'Stress min MPa': 'Not applicable', 'Stress amplitude MPa': 'Not applicable',
        'Frequency Hz': 'Not applicable', 'Load ratio R': 'Not applicable', 'Run-out': 'Not applicable',
        '__key': key,
    }
    MEASUREMENTS.append(row)

DENSITY_SPEC = 'Not published (density specimen form not explicitly established)'
NA = 'Not applicable'

# eSUN PLA-Lite: the product page states XY and Z but no standards and no specimen preparation.
S = ('M004', 'G004-01', 'R-ESUN-PLA-LITE-PAGE')
m(*S, 'Density', '1.23 g/cm3 (unit to be confirmed)', '1.23', 'g/cm³', direction=NA, spec=DENSITY_SPEC,
  loc='Physical Performance: Density', key='lite-density',
  notes='The page labels the unit "g/cm3 (unit to be confirmed)". 1.23 g/cm³ is consistent with PLA and is recorded as g/cm³.')
m(*S, 'Melt mass-flow rate', '5.7 g/10 min', '5.7', 'g/10 min', direction=NA, std='190 °C, 2.16 kg',
  loc='Physical Performance: Melt Flow Index')
m(*S, 'HDT', '53 °C', '53', '°C', direction=NA, std='Not published (standard and load not stated)',
  loc='Physical Performance: Heat Distortion Temperature', key='lite-hdt')
m(*S, 'Tensile strength (endpoint unspecified)', '53.05 MPa', '53.05', 'MPa', direction='XY', loc='Mechanical Properties: Tensile Strength (XY)', key='lite-strength')
m(*S, 'Tensile strength (endpoint unspecified)', '26.88 MPa', '26.88', 'MPa', direction='Z', loc='Mechanical Properties: Tensile Strength (Z)')
m(*S, 'Elongation at break', '3.89 %', '3.89', '%', direction='XY', loc='Mechanical Properties: Elongation at Break (XY)', key='lite-elongation')
m(*S, 'Elongation at break', '2.39 %', '2.39', '%', direction='Z', loc='Mechanical Properties: Elongation at Break (Z)')
m(*S, 'Flexural strength', '90.57 MPa', '90.57', 'MPa', direction='XY', loc='Mechanical Properties: Flexural Strength (XY)')
m(*S, 'Flexural strength', '62.2 MPa', '62.2', 'MPa', direction='Z', loc='Mechanical Properties: Flexural Strength (Z)')
m(*S, 'Flexural modulus', '3114.92 MPa', '3114.92', 'MPa', modulus=True, direction='XY', loc='Mechanical Properties: Flexural Modulus (XY)',
  notes='Flexural, not tensile. It never fills the tensile-modulus headline.')
m(*S, 'Flexural modulus', '2832.91 MPa', '2832.91', 'MPa', modulus=True, direction='Z', loc='Mechanical Properties: Flexural Modulus (Z)')
m(*S, 'Izod impact strength', '4.53 kJ/m²', '4.53', 'kJ/m²', direction='XY', notch='Not published', loc='Mechanical Properties: IZOD Impact Strength (XY)')
m(*S, 'Izod impact strength', '2.33 kJ/m²', '2.33', 'kJ/m²', direction='Z', notch='Not published', loc='Mechanical Properties: IZOD Impact Strength (Z)')

# Panchroma TDS V2.1: printed ISO 527 / ISO 179 specimens, ISO 306 Vicat.
PANCHROMA_PARAMS = 'Printed at 230 °C nozzle, 50 °C bed, 100% infill, 2 shells, 3 top and bottom layers, ambient environment, cooling fan on'
for gid, mid, col, dens, vicat, mod, mod_u, xy, xy_u, z, z_u, charpy, charpy_u, key in [
    ('G008-01', 'M008', 'Silk', '1.24', '64.7', '2403', '74.5', '41.1', '0.8', '23.8', '2.8', '13.8', '1.3', 'silk'),
    ('G091-02', 'M091', 'CoPE', '1.30', '66', '2515', '71', '51.6', '0.3', '36.1', '1.2', '2.9', '0.1', 'cope'),
]:
    S = (mid, gid, 'R-POLYMAKER-PANCHROMA-TDS-V2-1')
    m(*S, 'Density', f'{dens} g/cm³ at 23 °C', dens, 'g/cm³', direction=NA, spec=DENSITY_SPEC, temp='23 °C',
      loc=f'Data table, {col}: Density', key=f'{key}-density')
    m(*S, 'Vicat softening temperature', f'{vicat} °C', vicat, '°C', direction=NA, std='ISO 306',
      loc=f'Data table, {col}: Vicat softening temperature', key=f'{key}-vicat')
    m(*S, 'Tensile modulus', f'{mod} ± {mod_u} MPa', mod, 'MPa', unc=mod_u, modulus=True, direction='XY', std='ISO 527',
      spec='Printed specimen', params=PANCHROMA_PARAMS, loc=f"Data table, {col}: Young's modulus (X-Y)", key=f'{key}-modulus')
    m(*S, 'Tensile strength (endpoint unspecified)', f'{xy} ± {xy_u} MPa', xy, 'MPa', unc=xy_u, direction='XY', std='ISO 527',
      spec='Printed specimen', params=PANCHROMA_PARAMS, loc=f'Data table, {col}: Tensile strength (X-Y)', key=f'{key}-strength')
    m(*S, 'Tensile strength (endpoint unspecified)', f'{z} ± {z_u} MPa', z, 'MPa', unc=z_u, direction='Z', std='ISO 527',
      spec='Printed specimen', params=PANCHROMA_PARAMS, loc=f'Data table, {col}: Tensile strength (Z)')
    m(*S, 'Charpy strength', f'{charpy} ± {charpy_u} kJ/m²', charpy, 'kJ/m²', unc=charpy_u, std='ISO 179', notch='Notched',
      spec='Printed specimen', params=PANCHROMA_PARAMS, loc=f'Data table, {col}: Notched Charpy impact strength')

# Fiberon PET-GF15 TDS V1.0. The note directly under the mechanical table reads "All specimens were
# annealed at 120°C for 16h"; HDT is published both as printed and annealed, and those stay two
# measurements.
S = ('M068', 'G068-02', 'R-FIBERON-PETGF15-TDS')
PETGF_PARAMS = 'Printed at 300 °C nozzle, 80 °C bed, 100% infill, 2 shells, 3 top and bottom layers, cooling fan off'
PETGF_ANNEAL = 'All specimens were annealed at 120 °C for 16 h (TDS note under the mechanical table)'
m(*S, 'Density', '1.43 g/cm3 at 23°C', '1.43', 'g/cm³', direction=NA, spec=DENSITY_SPEC, std='ISO 1183, GB/T 1033', temp='23 °C',
  loc='Physical properties: Density', key='petgf-density')
m(*S, 'Melt mass-flow rate', '36.9 g/10min', '36.9', 'g/10 min', direction=NA, std='270 °C, 2.16 kg', loc='Physical properties: Melt index')
m(*S, 'Glass transition temperature', '59.5 °C', '59.5', '°C', direction=NA, std='DSC, 10 °C/min', loc='Thermal properties: Glass transition temp.')
m(*S, 'Melting temperature', '231.6 °C', '231.6', '°C', direction=NA, std='DSC, 10 °C/min', loc='Thermal properties: Melting temperature')
m(*S, 'Vicat softening temperature', '232.6 °C', '232.6', '°C', direction=NA, std='ISO 306, GB/T 1633', loc='Thermal properties: Vicat softening temp.',
  notes='Recorded as published. The value sits 1 °C above the published melting temperature and was not reinterpreted.')
m(*S, 'HDT', '71.8 °C (as printed)', '71.8', '°C', direction=NA, std='ISO 75 1.8 MPa', post='As printed', params=PETGF_PARAMS,
  spec='Printed specimen', loc='Thermal properties: Heat deflection temp. (as printed)')
m(*S, 'HDT', '81.6 °C (as printed)', '81.6', '°C', direction=NA, std='ISO 75 0.45 MPa', post='As printed', params=PETGF_PARAMS,
  spec='Printed specimen', loc='Thermal properties: Heat deflection temp. (as printed)', key='petgf-hdt')
m(*S, 'HDT', '87.3 °C (annealed)', '87.3', '°C', direction=NA, std='ISO 75 1.8 MPa', post='Annealed (schedule not stated beside the HDT row)',
  params=PETGF_PARAMS, spec='Printed specimen', loc='Thermal properties: Heat deflection temp. (annealed)')
m(*S, 'HDT', '133.7 °C (annealed)', '133.7', '°C', direction=NA, std='ISO 75 0.45 MPa', post='Annealed (schedule not stated beside the HDT row)',
  params=PETGF_PARAMS, spec='Printed specimen', loc='Thermal properties: Heat deflection temp. (annealed)',
  notes='The product page headlines this annealed figure. The as-printed value at the same load is 81.6 °C (separate row).')
for prop, xy, xy_u, z, z_u, std, is_mod, kxy in [
    ('Tensile modulus', '4144.2', '133.3', '3428.9', '257.2', 'ISO 527, GB/T 1040', True, 'petgf-modulus'),
    ('Tensile strength (endpoint unspecified)', '59.9', '0.8', '48.2', '0.3', 'ISO 527, GB/T 1040', False, 'petgf-strength'),
    ('Elongation at break', '4.0', '0.5', '2.6', '0.1', 'ISO 527, GB/T 1040', False, 'petgf-elongation'),
    ('Flexural modulus', '3705.4', '84.5', '2998.4', '92.3', 'ISO 178, GB/T 9341', True, None),
    ('Flexural strength', '104.2', '2.4', '80.3', '2.5', 'ISO 178, GB/T 9341', False, None),
]:
    unit = 'MPa' if prop != 'Elongation at break' else '%'
    label = {'Tensile modulus': "Young's modulus", 'Tensile strength (endpoint unspecified)': 'Tensile strength',
             'Elongation at break': 'Elongation at break', 'Flexural modulus': 'Bending modulus',
             'Flexural strength': 'Bending strength'}[prop]
    for direction, v, u, k in [('XY', xy, xy_u, kxy), ('Z', z, z_u, None)]:
        m(*S, prop, f'{v} ± {u} {unit}', v, unit, unc=u, modulus=is_mod, direction=direction, std=std,
          spec='Printed specimen', post=PETGF_ANNEAL, params=PETGF_PARAMS,
          loc=f"Mechanical properties: {label} ({'X-Y' if direction == 'XY' else 'Z'})", key=k)
m(*S, 'Charpy strength', '8.7 ± 0.6 kJ/m2', '8.7', 'kJ/m²', unc='0.6', direction='XY', notch='Notched', std='ISO 179, GB/T 1043',
  spec='Printed specimen', post=PETGF_ANNEAL, params=PETGF_PARAMS, loc='Mechanical properties: Charpy impact strength (X-Y) notched')
m(*S, 'Charpy strength', '27.2 ± 2.0 kJ/m2', '27.2', 'kJ/m²', unc='2.0', direction='XY', notch='Unnotched', std='ISO 179, GB/T 1043',
  spec='Printed specimen', post=PETGF_ANNEAL, params=PETGF_PARAMS, loc='Mechanical properties: Charpy impact strength (X-Y) un-notched')
m(*S, 'Charpy strength', '13.9 ± 1.6 kJ/m2', '13.9', 'kJ/m²', unc='1.6', direction='Z', notch='Unnotched', std='ISO 179, GB/T 1043',
  spec='Printed specimen', post=PETGF_ANNEAL, params=PETGF_PARAMS, loc='Mechanical properties: Charpy impact strength (Z) un-notched')

# Fillamentum CPE HG100 TDS: no specimen form and no orientation, so the tensile rows cannot be XY
# headlines. Density and the ASTM D648 HDT at its stated 0.455 MPa load are headline-eligible.
S = ('M089', 'G089-01', 'R-FILLAMENTUM-CPE-HG100-TDS')
m(*S, 'Density', '1,25 g/cm3', '1.25', 'g/cm³', direction=NA, spec=DENSITY_SPEC, std='ASTM D792', loc='Physical properties: Material density', key='cpe-density')
m(*S, 'Tensile yield strength', '47 MPa', '47', 'MPa', std='ASTM D638, at yield, 50 mm/min', loc='Mechanical properties: Tensile strength (at yield)')
m(*S, 'Tensile break strength', '48 MPa', '48', 'MPa', std='ASTM D638, at break, 50 mm/min', loc='Mechanical properties: Tensile strength (at break)')
m(*S, 'Elongation at break', '150 %', '150', '%', std='ASTM D638, 50 mm/min', loc='Mechanical properties: Elongation at break')
m(*S, 'Flexural strength', '71 MPa', '71', 'MPa', std='ASTM D790, 1.27 mm/min', loc='Mechanical properties: Flexural strength')
m(*S, 'Flexural modulus', '1860 MPa', '1860', 'MPa', modulus=True, std='ASTM D790, 1.27 mm/min', loc='Mechanical properties: Flexural modulus')
m(*S, 'Izod impact strength', 'no break', '0', 'J/m', std='ASTM D256', notch='Notched', temp='23 °C', status='Published qualitative result',
  loc='Mechanical properties: Izod impact strength')
m(*S, 'HDT', '80 °C', '80', '°C', direction=NA, std='ASTM D648, 0.455 MPa', loc='Thermal properties: Heat distortion temperature', key='cpe-hdt')
m(*S, 'Glass transition temperature', '90 °C', '90', '°C', direction=NA, std='ASTM D1525', loc='Thermal properties: Glass transition temperature',
  notes='Recorded under the source label. ASTM D1525 is the Vicat softening method, so this is not a DSC glass transition and must not be read as Vicat either.')

# colorFabb nGen TDS v2.0: the 3D-printed block is printed in the XY plane; the injection-moulded block
# and the thermal block carry the footnote "obtained from the information provided by the supplier of
# the raw material".
S = ('M092', 'G092-01', 'R-COLORFABB-NGEN-TDS-V2')
NGEN_PARAMS = 'Printed in the XY plane, 0.15 mm layer height, 100% infill, 0.4 mm nozzle, 230 °C nozzle, 80 °C bed; average of a batch of printed specimens'
RAW_NOTE = 'TDS footnote: obtained from the information provided by the supplier of the raw material. Not a printed or product specimen.'
m(*S, 'Tensile modulus', '1700 MPa', '1700', 'MPa', modulus=True, direction='XY', std='ISO 527-1A', spec='Printed specimen', params=NGEN_PARAMS,
  loc='p. 1: Mechanical Properties - 3D Printed: Youngs Modulus', key='ngen-modulus')
m(*S, 'Tensile strength (endpoint unspecified)', '54 MPa', '54', 'MPa', direction='XY', std='ISO 527-1A', spec='Printed specimen', params=NGEN_PARAMS,
  loc='p. 1: Mechanical Properties - 3D Printed: Tensile Strength', key='ngen-strength')
m(*S, 'Elongation at break', '11 %', '11', '%', direction='XY', std='ISO 527-1A', spec='Printed specimen', params=NGEN_PARAMS,
  loc='p. 1: Mechanical Properties - 3D Printed: Elongation at break', key='ngen-elongation')
m(*S, 'Charpy strength', '3.3 kJ/m2', '3.3', 'kJ/m²', direction='XY', std='ISO 179', notch='Notched', spec='Printed specimen', params=NGEN_PARAMS,
  loc='p. 1: Mechanical Properties - 3D Printed: Impact Strength')
m(*S, 'Tensile strength (endpoint unspecified)', '50 MPa', '50', 'MPa', std='ASTM D638', spec='Raw material value', notes=RAW_NOTE,
  loc='p. 1: Mechanical Properties - Injection Molded: Tensile Strength')
m(*S, 'Elongation at break', '190 %', '190', '%', std='ASTM D638', spec='Raw material value', notes=RAW_NOTE,
  loc='p. 1: Mechanical Properties - Injection Molded: Elongation at break')
m(*S, 'Flexural modulus', '1800 MPa', '1800', 'MPa', modulus=True, std='ASTM D790', spec='Raw material value', notes=RAW_NOTE,
  loc='p. 1: Mechanical Properties - Injection Molded: Flexural Modulus')
m(*S, 'Izod impact strength', '70 J/m', '70', 'J/m', std='ASTM D256', notch='Notched', spec='Raw material value', notes=RAW_NOTE,
  loc='p. 1: Mechanical Properties - Injection Molded: Izod Impact Strength')
m(*S, 'Density', '1.2 g/cm3', '1.2', 'g/cm³', direction=NA, std='ISO 1183', spec='Raw material value', notes=RAW_NOTE,
  loc='p. 1: Mechanical Properties - Injection Molded: Density', key='ngen-density')
m(*S, 'HDT', '71 °C', '71', '°C', direction=NA, std='ASTM D648, 0.455 MPa', spec='Raw material value', notes=RAW_NOTE,
  loc='p. 1: Thermal Properties: Heat Deflection Temp. @0.455 MPa', key='ngen-hdt')
m(*S, 'HDT', '63 °C', '63', '°C', direction=NA, std='ASTM D648, 1.82 MPa', spec='Raw material value', notes=RAW_NOTE,
  loc='p. 1: Thermal Properties: Heat Deflection Temp. @1.82 MPa')

# -------------------------------------------------------------------------------------- materials
# Filled in once measurement identifiers are assigned. `V(key)` resolves a keyed measurement.

def materials_edits(V):
    return {
        'M004': {
            'Representative grade': 'G004-01', 'GradeIDs': 'G004-01', 'Printing evidence': 'P0161',
            'Nozzle guidance': '190-230 °C', 'Bed guidance': '45-60 °C', 'Chamber guidance': 'Not required (no enclosure needed)',
            'Density kg/m³': Decimal('1230'), 'Tensile strength XY MPa': Decimal('53.05'), 'Elongation at break XY %': Decimal('3.89'),
            'Mechanical evidence': f"{V('lite-density')}; {V('lite-strength')}; {V('lite-elongation')}",
            'Measurement conditions': 'Manufacturer product page; XY direction stated; specimen preparation and test standards not published',
            'HDT 0.45 MPa °C': Decimal('53'), 'Thermal evidence': V('lite-hdt'),
            'Headline basis': 'Single-grade observations; not a polymer-family range',
            'Identity notes': 'eSUN PLA-Lite recorded 2026-09-13 as a technical grade sample for this generic entry. The earlier PLA Pure lead remains rejected; no Bambu product is implied.',
        },
        'M008': {
            'Representative grade': 'G008-01', 'GradeIDs': 'G008-01', 'Printing evidence': 'P0162',
            'Nozzle guidance': '190-230 °C', 'Bed guidance': '25-60 °C', 'Chamber guidance': 'Not required (enclosure not needed)',
            'Density kg/m³': Decimal('1240'), 'Tensile modulus XY GPa': Decimal('2.403'), 'Tensile strength XY MPa': Decimal('41.1'),
            'Mechanical evidence': f"{V('silk-density')}; {V('silk-modulus')}; {V('silk-strength')}",
            'Measurement conditions': 'Printed ISO 527 specimens, 230 °C nozzle, 100% infill; elongation and HDT not published',
            'Thermal evidence': V('silk-vicat'),
            'Headline basis': 'Single-grade observations; not a polymer-family range',
            'Identity notes': 'Polymaker Panchroma Silk PLA recorded 2026-09-13 as a technical grade sample of a silk-effect PLA. It is not the original product, and Bambu PLA Silk+ is still not substituted.',
        },
        'M091': {
            'Representative grade': 'G091-02', 'GradeIDs': 'G091-01; G091-02', 'Printing evidence': 'P0163',
            'Nozzle guidance': '190-230 °C', 'Bed guidance': '25-60 °C', 'Chamber guidance': 'Not required (closure chamber not needed)',
            'Density kg/m³': Decimal('1300'), 'Tensile modulus XY GPa': Decimal('2.515'), 'Tensile strength XY MPa': Decimal('51.6'),
            'Mechanical evidence': f"{V('cope-density')}; {V('cope-modulus')}; {V('cope-strength')}",
            'Measurement conditions': 'Printed ISO 527 specimens, 230 °C nozzle, 100% infill; elongation and HDT not verified',
            'Thermal evidence': V('cope-vicat'),
            'Identity notes': 'Until 2026-09-13 this row pointed at Fillamentum CPE HG100 (G091-01), the same grade as CPE. Polymaker Panchroma CoPE (G091-02) is now the exact CoPE identity and representative grade; G091-01 is kept as an audit trail.',
        },
        'M068': {
            'Representative grade': 'G068-02', 'GradeIDs': 'G068-01; G068-02', 'Printing evidence': 'P0164',
            'Nozzle guidance': '280-310 °C', 'Bed guidance': '70-80 °C', 'Chamber guidance': 'Room temp.',
            'Density kg/m³': Decimal('1430'), 'Tensile modulus XY GPa': Decimal('4.1442'), 'Tensile strength XY MPa': Decimal('59.9'),
            'Elongation at break XY %': Decimal('4'),
            'Mechanical evidence': f"{V('petgf-density')}; {V('petgf-modulus')}; {V('petgf-strength')}; {V('petgf-elongation')}",
            'Measurement conditions': 'Printed specimens (300 °C nozzle, 100% infill), annealed 120 °C for 16 h before mechanical tests; HDT as printed',
            'HDT 0.45 MPa °C': Decimal('81.6'), 'Thermal evidence': V('petgf-hdt'),
            'Identity notes': 'Representative grade changed 2026-09-13 from Flashforge PET-GF (G068-01, no published properties) to Fiberon PET-GF15 (G068-02), which publishes printed test data. Flashforge was not overwritten. The annealed HDT of 133.7 °C is on record and is not the headline.',
        },
        'M089': {
            'Printing evidence': 'P0165', 'Nozzle guidance': '255-275 °C', 'Bed guidance': '70-85 °C',
            'Chamber guidance': 'Not required (heated chamber / enclosure not needed)',
            'Density kg/m³': Decimal('1250'), 'Mechanical evidence': V('cpe-density'),
            'Measurement conditions': 'Manufacturer TDS; specimen form and orientation not published, so tensile values are related evidence, not headlines',
            'HDT 0.45 MPa °C': Decimal('80'), 'Thermal evidence': V('cpe-hdt'),
        },
        'M092': {
            'Printing evidence': 'P0167', 'Nozzle guidance': '220-240 °C', 'Bed guidance': '75-85 °C',
            'Tensile modulus XY GPa': Decimal('1.7'), 'Tensile strength XY MPa': Decimal('54'), 'Elongation at break XY %': Decimal('11'),
            'Mechanical evidence': f"{V('ngen-modulus')}; {V('ngen-strength')}; {V('ngen-elongation')}",
            'Measurement conditions': 'Printed in the XY plane, ISO 527-1A, 100% infill, 230 °C nozzle, 80 °C bed. Density and HDT in the TDS are raw-material supplier values and are not headlines',
            'Thermal evidence': V('ngen-hdt'),
            'Identity notes': 'nGen uses Eastman Amphora AM3300 per the original record. Not synonymous with all Amphora formulations. The current colorFabb TDS v2.0 names Amphora HT3300; recorded as an open identity conflict 2026-09-13.',
        },
    }

# --------------------------------------------------------------------------------------- coverage

COVERAGE_EDITS = {
    'C00001': ('Resolved', 'eSUN PLA-Lite recorded 2026-09-13 as G004-01, a technical grade sample for this generic entry. The earlier PLA Pure lead remains rejected; no Bambu product is implied.'),
    'C00097': ('Evidence recorded', 'eSUN PLA-Lite printing parameters recorded as P0161; no enclosure needed.'),
    'C00098': ('Evidence recorded', 'eSUN PLA-Lite XY and Z tensile strength, elongation, flexural and Izod values recorded. Tensile modulus is not published; 3114.92 MPa is flexural and is not substituted.'),
    'C00099': ('Partially resolved', 'HDT 53 °C recorded; the page states neither the standard nor the load, so it carries the load-not-stated caveat.'),
    'C00002': ('Resolved', 'Polymaker Panchroma Silk PLA recorded 2026-09-13 as G008-01, a technical grade sample of a silk-effect PLA. The original product and Bambu PLA Silk+ are not substituted.'),
    'C00136': ('Evidence recorded', 'Panchroma Silk PLA printing guidance recorded as P0162; enclosure not needed.'),
    'C00137': ('Partially resolved', 'Printed XY modulus and strength, Z strength and notched Charpy recorded from the Panchroma TDS V2.1. Elongation at break is not published.'),
    'C00138': ('Partially resolved', 'Vicat 64.7 °C recorded. HDT is not published, and Vicat is not substituted for it.'),
    'C00045': ('Resolved', 'Panchroma CoPE (G091-02) recorded 2026-09-13 as the exact CoPE identity and representative grade. G091-01 duplicated Fillamentum CPE HG100 and is retained only as an audit trail.'),
    'C00969': ('Evidence recorded', 'Panchroma CoPE printing guidance recorded as P0163; closure chamber not needed.'),
    'C00970': ('Partially resolved', 'Printed XY modulus and strength, Z strength and notched Charpy recorded from the Panchroma TDS V2.1. The elongation of 10.5 ± 3.8% cited from the CoPE TDS V5.4 could not be retrieved (HTTP 404) and was not entered.'),
    'C00971': ('Partially resolved', 'Vicat 66 °C recorded. HDT is not published, and Vicat is not substituted for it.'),
    'C00028': ('Gap', '2 distinct manufacturers documented against target 3 after adding Fiberon PET-GF15 (G068-02) on 2026-09-13.'),
    'C00735': ('Evidence recorded', 'Fiberon PET-GF15 printed XY and Z tensile, flexural and Charpy values recorded; all specimens annealed 120 °C for 16 h before testing.'),
    'C00736': ('Evidence recorded', 'Fiberon PET-GF15 HDT at 0.45 MPa is published as printed (81.6 °C) and annealed (133.7 °C); recorded as separate measurements, and the headline is the as-printed value.'),
    'C00950': ('Evidence recorded', 'Fillamentum CPE HG100 printing guide recorded as P0165; heated chamber / enclosure not needed.'),
    'C00951': ('Limited comparability', 'CPE HG100 TDS values recorded 2026-09-13. Specimen form and orientation are not published, so tensile values are related evidence only; density is the only mechanical headline.'),
    'C00952': ('Evidence recorded', 'HDT 80 °C at 0.455 MPa (ASTM D648) recorded as the headline. The TDS labels 90 °C a glass transition under ASTM D1525, the Vicat method; kept under its own label.'),
    'C00978': ('Evidence recorded', 'colorFabb nGen TDS v2.0 print guideline recorded as P0167.'),
    'C00979': ('Evidence recorded', 'Printed XY modulus, strength, elongation and notched Charpy from TDS v2.0 are headlines. Injection-moulded raw-material values are recorded separately and never headlines.'),
    'C00980': ('Limited comparability', 'HDT 71 °C at 0.455 MPa is raw-material supplier data per the TDS footnote and is not a headline.'),
}

def coverage_new():
    rows = []
    add = lambda mid, domain, status, finding: rows.append({'MaterialID': mid, 'Domain': domain, 'Status': status, 'Finding': finding})
    material_of = {'P0004': 'M002', 'P0005': 'M003', 'P0011': 'M011', 'P0012': 'M012', 'P0013': 'M013', 'P0015': 'M015',
                   'P0024': 'M021', 'P0025': 'M022', 'P0027': 'M024', 'P0044': 'M036', 'P0063': 'M048', 'P0089': 'M070',
                   'P0093': 'M073', 'P0100': 'M080'}
    for pid, mid in material_of.items():
        text, src = CHAMBER_RECOVERED[pid]
        add(mid, 'Print setup', 'Resolved',
            f'{pid} chamber temperature "{text}" recovered 2026-09-13 from {src}. The re-fetched file matches the recorded SHA-256; the row follows a page break and was missed in transcription.')
    add('M001', 'Print setup', 'Resolved', 'P0002 PolySonic PLA TDS states "Closure Chamber: No needed"; recorded 2026-09-13 as not required.')
    for mid in ('M044', 'M046'):
        add(mid, 'Print setup', 'Reviewed with limitations', 'BASF Ultrafuse TPC 45D lists build chamber temperature as "-". Recorded 2026-09-13 as no setpoint published: not zero and not "not required".')
    add('M072', 'Print setup', 'Resolved', 'Spectrum PPS AM230 "Closed chamber: active heated (60-80°C)" was held only in the Enclosure column of P0092; recorded 2026-09-13 as the chamber window as well.')
    add('M090', 'Print setup', 'Evidence recorded', 'Fillamentum CPE CF112 Carbon printing guide recorded as P0166: heated chamber / enclosure not needed; wear-resistant nozzle necessary.')
    add('M068', 'Source conflict', 'Conflict', 'The 2026-09-13 research cites the Fiberon PET-GF15 product page as recommending a chamber for dimensional stability. TDS V1.0 states room temperature, which is recorded. The product page returned HTTP 403 and was not verified.')
    add('M092', 'Identity', 'Conflict', 'The grade row names Eastman Amphora AM3300; colorFabb TDS v2.0 (2023-09-01) names Amphora HT3300. Not resolved 2026-09-13.')
    add('M070', 'Research conflict', 'Resolved', 'The 2026-09-13 research report says the accessible Bambu PPA-CF TDS publishes no chamber range. The hash-matched TDS V1.0 states 50-80 °C, which is recorded. The reseller 100-120 °C figure is not used.')
    for mid in ('M055', 'M056', 'M058', 'M060'):
        add(mid, 'Grades', 'Reviewed with limitations', '2026-09-13 research found no defensible exact commercial grade. Stratasys PA6/66-GF30-FR and Fiberon PA612-CF15 are different formulations and were not substituted.')
    add('M087', 'Print setup', 'Reviewed with limitations', 'purefil POM page re-read 2026-09-13: bed 120-150 °C, no chamber temperature and no mechanical or HDT values. A chamber temperature is not inferred from the bed temperature.')
    for mid in ('M069', 'M071'):
        add(mid, 'Print setup', 'Gap', 'The cited IPCON TDS was re-read 2026-09-13 (SHA-256 matches) and publishes no chamber temperature.')
    add('M096', 'Print setup', 'Reviewed with limitations', '3DXTECH FluorX PVDF recommends a heated chamber and publishes no temperature. The 2026-09-13 research assigns no estimate band, and none is used.')
    return rows

# ----------------------------------------------------------------------------------------- method

METHOD_EDITS = {
    'Snapshot': '2026-09-13. Exactly 96 H2C-relevant and six excluded canonical entries. Manufacturer source audit and missing-data research implemented; no ranking or weighted selection score.',
    'Research limitations': 'Rare PA66, PA66-CF, unfilled PA612 and PA612-GF lack verified exact-grade technical profiles in this sample; POM has an exact product page but no mechanical, HDT or chamber values. PLA Lite and PLA Silk carry third-party technical grade samples (eSUN PLA-Lite, Panchroma Silk PLA), not the original products. Full H2C routing/AMS validation is not established for every third-party grade.',
}
METHOD_NEW = [
    {'Section': 'H2C', 'Topic': 'Chamber evidence',
     'Definition / rule': 'A published chamber window is read against the 65 °C active chamber. At or below it: within. Starting at or below it and extending above: partial, because only part of the window is reachable; never within. Wholly above: exceeds. "Not required", room temperature or "enclosure not needed" clear the chamber question without inventing a temperature. "Recommended" without a number, "-" in a TDS and no setpoint stay unknown. An enclosure is not an actively heated chamber.'},
    {'Section': 'Evidence', 'Topic': '2026-09-13 missing-data research',
     'Definition / rule': 'Implemented after re-reading every cited source. Chamber rows missed at a page break were recovered from 14 Bambu TDS files whose SHA-256 matches this register. Four technical grade samples were added (eSUN PLA-Lite, Panchroma Silk PLA, Panchroma CoPE, Fiberon PET-GF15) and CoPE was separated from CPE. Sources that could not be retrieved contributed nothing. Research chamber bands are inference kept outside this workbook.'},
]

# =================================================================================== XML machinery

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


def main(path):
    digest = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    if digest != EXPECTED_SHA256:
        sys.exit(f'Refusing to run: workbook SHA-256 is {digest}, expected {EXPECTED_SHA256}.')
    book = Book(path)

    for s in SRC:
        book.append('Sources', {'SourceID': s['SourceID'], 'Publisher': s['Publisher'], 'Title': s['Title'],
                                'Revision': s['Revision'], 'Publication date': 'Not published', 'Access date': TODAY,
                                'Source class': s['cls'], 'URL': s['URL'], 'Locator': s['Locator'],
                                'Applicable grades': s['grades'], 'Access status': s['status'], 'SHA256': s['sha']})
    for g in GRADES:
        book.append('Grades', g)
    for gid, column, value in GRADE_EDITS:
        book.set('Grades', gid, column, value)

    profile_headers = book.headers('Print setup')
    for p in PROFILES:
        book.append('Print setup', {h: p.get(h, 'Not published') for h in profile_headers})
    for pid, (text, _src) in CHAMBER_RECOVERED.items():
        book.set('Print setup', pid, 'Chamber °C', text)

    vid = next_id(book, 'Properties', 'V', 6)
    keyed = {}
    for i, row in enumerate(MEASUREMENTS):
        row = dict(row)
        row['MeasurementID'] = vid(i)
        if row['__key']:
            keyed[row['__key']] = row['MeasurementID']
        del row['__key']
        book.append('Properties', row)

    for mid, edits in materials_edits(lambda k: keyed[k]).items():
        for column, value in edits.items():
            book.set('Materials', mid, column, value)
    # A material's chamber guidance follows the profile its Printing evidence cites.
    for pid, (text, _src) in CHAMBER_RECOVERED.items():
        profile_row = book.row_of('Print setup', pid)
        mid = book.get('Print setup', profile_row, 'MaterialID')
        mrow = book.row_of('Materials', mid)
        cites = book.get('Materials', mrow, 'Printing evidence') or ''
        if pid in [x.strip() for x in cites.split(';')] and book.get('Materials', mrow, 'Chamber guidance') == 'Not published':
            book.set('Materials', mid, 'Chamber guidance', text)

    for cid, (status, finding) in COVERAGE_EDITS.items():
        book.set('Coverage', cid, 'Status', status)
        book.set('Coverage', cid, 'Finding', finding)
    cov = next_id(book, 'Coverage', 'C', 5)
    for i, row in enumerate(coverage_new()):
        book.append('Coverage', {'CoverageID': cov(i), **row})

    # Method rows are keyed by topic, not by an identifier in column A.
    part = SHEETS['Method'][0]
    for topic, text in METHOD_EDITS.items():
        xml = book.xml(part)
        target = None
        for rm in NS_ROW.finditer(xml):
            b = re.search(r'<x:c r="B%s"[^>]*?(?:/>|>.*?</x:c>)' % rm.group(1), rm.group(0), re.S)
            if b and book.cell_text(b.group(0)) == topic:
                target = rm
        a = re.search(r'<x:c r="A%s"[^>]*?(?:/>|>.*?</x:c>)' % target.group(1), target.group(0), re.S)
        section = book.cell_text(a.group(0))
        # set() looks rows up by column A, which repeats in Method, so address the row directly.
        c = re.search(r'<x:c r="C%s"([^>]*?)(?:/>|>.*?</x:c>)' % target.group(1), target.group(0), re.S)
        style = re.search(r' s="(\d+)"', c.group(1))
        s_attr = f' s="{style.group(1)}"' if style else ''
        new = f'<x:c r="C{target.group(1)}"{s_attr} t="str"><x:v>{xml_text(text)}</x:v></x:c>'
        before = book.cell_text(c.group(0))
        row_xml = target.group(0)[:c.start()] + new + target.group(0)[c.end():]
        book.put(part, xml[:target.start()] + row_xml + xml[target.end():])
        book.changes.append(dict(sheet='Method', record=f'{section} / {topic}', cell=f'C{target.group(1)}', action='Edited',
                                 field='Definition / rule', before=before, after=text))
    for row in METHOD_NEW:
        book.append('Method', row)

    book.save(path)
    with open(HERE / 'changelog.csv', 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['sheet', 'record', 'cell', 'action', 'field', 'before', 'after'])
        w.writeheader()
        w.writerows(book.changes)
    print(f'{len(book.changes)} changes; SHA-256 now {hashlib.sha256(Path(path).read_bytes()).hexdigest()}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else str(HERE.parents[2] / 'data/H2C_FDM_Material_Database.xlsx'))
