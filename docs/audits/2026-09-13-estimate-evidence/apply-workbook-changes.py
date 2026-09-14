#!/usr/bin/env python3
"""
Apply the 2026-09-13 estimate-evidence research to the workbook, reviewably.

The build never writes the workbook (docs/DECISIONS.md, D1). This script is the record of the one
deliberate edit that implemented REPORT.md in this folder, using the shared XML editor so styles,
formulas and table definitions outside the named cells are untouched.

Three kinds of change, each re-read from its source on 2026-09-13:

  1. Values that registered, hash-matched sources publish and the workbook got wrong or missed:
     21 heat deflection loads printed by 3DXTECH as "at 0.45 MPa (66psi)" and one ISO 75-2 method B,
     an iSANMATE glass transition read as 1135780 °C, an iSANMATE PLA film value read as 3 MPa, an
     iSANMATE PETG-GF Vicat read as 120 °C, and values those sheets publish that were never entered.
  2. New printed-product evidence: Eryone PETG-GF, IPCON ASA GF and Grupa Azoty Tarfuse POM, which
     become representative grades because the current ones publish no printed mechanical values,
     Flashforge ASA GF10, and the Stratasys FDM Nylon 12 data sheet for the PA12 study grade already
     in the workbook.
  3. Resin references for the three identities no filament source characterises: DuPont Delrin 100P
     (POM), Zytel 101L (PA66) and Zytel 151L (PA612). They are study grades (R suffix), recorded as
     raw-material values, never headlines, and exist to anchor estimates.

    python3 apply-workbook-changes.py <workbook.xlsx>      edits in place, writes changelog.csv

Refuses any workbook but the one it was written against.
"""

import csv
import hashlib
import re
import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'scripts'))
from workbook_xml import SHEETS, NS_ROW, Book, next_id, xml_text  # noqa: E402

EXPECTED_SHA256 = 'ac038449bf49a5c182130c370223a111fe492643375b715eb6adff70f65823c1'
HERE = Path(__file__).resolve().parent
TODAY = '2026-09-13'

# ---------------------------------------------------------------------------------------- sources

SRC = [
    dict(SourceID='R-ERYONE-PETG-GF-TDS', Publisher='Shenzhen Eryone Technology', Title='Technical Data Sheet (TDS) PETG-GF',
         Revision='version 1.0, 08/2024', URL='https://file.globalso.com/file_manage/3828/20250630/eryone-petg-gf-tds.pdf',
         Locator='Part I Suggested printing parameters; Part II Physical properties; Part III Mechanical properties of printed samples',
         grades='M025 / G025-02', cls='Manufacturer TDS', sha='8351e38bad369f131d878557886517762e4732eecff5352744c9034dd90b7c5d'),
    dict(SourceID='R-IPCON-ASA-GF-TDS', Publisher='IPCON Polymer Material (Suzhou)', Title='IPCON ASA GF Technical Data Sheet',
         Revision='Version 1.0, 2026.06.01', URL='https://www.ipconpolymer.com/wp-content/uploads/2026/06/IPCON-ASA-GF_TDS-Technical-Data-Sheet_V1.0.pdf',
         Locator="Filament's properties; Recommended printing settings", grades='M034 / G034-03', cls='Manufacturer TDS',
         sha='a756397ca7e6529e0a9c081fca8fe54beb71aebc5000d63d4d2d2fe5f7a4f5db'),
    dict(SourceID='R-FLASHFORGE-ASA-GF10-TDS', Publisher='Flashforge', Title='Technical Data Sheet ASAGF10 Filament',
         Revision='Not published', URL='https://after-support.flashforge.jp/uploads/datasheet/tds/ASA_GF_TDS_EN.pdf',
         Locator='Properties; Recommended printing conditions', grades='M034 / G034-04', cls='Manufacturer TDS',
         sha='b82515bd92eec4b61acc1fe20ff4145407644964a73d0fdfea4f9306744a49c3'),
    dict(SourceID='R-GRUPA-AZOTY-TARFUSE-POM-TDS', Publisher='Grupa Azoty (document mirrored by filamentworld.de)', Title='Preliminary Technical Data Sheet Tarfuse POM 3D Filament',
         Revision='Version 1.1, April 2021', URL='https://filamentworld.de/fact-sheets/Grupa-Azoty_Tarfuse-POM_Datenblatt_EN.pdf',
         Locator='p. 2: Recommended print processing parameters; Physical properties; Mechanical properties (XY flat)',
         grades='M087 / G087-02', cls='Manufacturer TDS', sha='ef0bbc0dd06cf77c1c14d95f0338d3541e287b36920e5f212492399fcb3263ea'),
    dict(SourceID='R-STRATASYS-FDM-NYLON12-MDS', Publisher='Stratasys', Title='FDM Nylon 12 Data Sheet',
         Revision='Not published (file metadata 2021-09)', URL='https://www.stratasys.com/siteassets/materials/materials-catalog/fdm-materials/nylon-12/mds_fdm_nylon-12_0921a.pdf',
         Locator='Table 2 ordering information (310-21800); Table 3 physical properties; Table 4 mechanical properties (F900, T16 tip)',
         grades='M052 / G052-R1', cls='Manufacturer TDS', sha='d7c3536b4c6a9cabf3c08cb76d33864ecc231e79343e1834c02776e585caabf9'),
    dict(SourceID='R-DUPONT-DELRIN-100P', Publisher='DuPont (document mirrored by Upmold)', Title='Product Information Delrin 100P NC010',
         Revision='060412/060413', URL='https://upmold.com/wp-content/uploads/data-sheet/POM-DuPont-Delrin-100P%20NC010.pdf',
         Locator='Mechanical; Thermal; Other', grades='M087 / G087-R1', cls='Resin supplier data sheet',
         sha='65ea95a42700a8d69cc0668a50684fadd79ab30480137d1e4c7445e20c3a248f'),
    dict(SourceID='R-CELANESE-ZYTEL-101L', Publisher='Celanese / DuPont (document mirrored by Quickparts)', Title='Zytel 101L NC010 Nylon Resin',
         Revision='Revised 2023-04-04 (Celanese Materials Database)', URL='https://quickparts.com/wp-content/uploads/2023/04/zytel%C2%AE-101l-nc010-gb.pdf',
         Locator='Typical mechanical properties dry/cond.; Thermal properties; Other properties', grades='M055 / G055-R1',
         cls='Resin supplier data sheet', sha='9a201771bddfa931faafbcab2fce64d01c57e6f36303340166bb87c4a62f69e9'),
    dict(SourceID='R-DUPONT-ZYTEL-GUIDE', Publisher='DuPont (document mirrored by T-Link)', Title='DuPont Zytel nylon resin: product guide and properties',
         Revision='Not published', URL='https://t-link.com.hk/MaterialSpec/Nylon66/ALL%20Zytel.pdf',
         Locator='p. 8 Unreinforced PA612, Zytel 151L, DAM column', grades='M058 / G058-R1', cls='Resin supplier data sheet',
         sha='4b28bc3c55f6cebb864463b497521e9dcdca89a1edd82de6fee0bb2a0e820092'),
]

# ----------------------------------------------------------------------------------------- grades

DIAMETER = 'Check 1.75 mm variant; diameter is not part tolerance'
RESIN = 'Resin reference only; not a filament and not an H2C feeding approval'
GRADES = [
    dict(GradeID='G025-02', MaterialID='M025', Manufacturer='Eryone', **{
        'Product name': 'PETG-GF', 'Shared formulation key': 'R-ERYONE-PETG-GF-TDS', 'Composition / filler': 'PETG with 10% glass fibre (TDS)',
        'Colour caveat': 'Properties may vary by colour; use TDS scope', 'Availability': 'Official Eryone TDS retrieved 2026-09-13',
        'Certification claims': 'Not published',
        'Selected-grade rationale': 'Representative grade from 2026-09-13: the only PETG-GF found with printed X-Y tensile data. iSANMATE PETG Glass Fiber (G025-01) publishes no specimen direction and is kept',
        'SourceID': 'R-ERYONE-PETG-GF-TDS', 'Source locator': 'TDS version 1.0, pp. 1-2', 'Diameter compatibility': DIAMETER}),
    dict(GradeID='G034-03', MaterialID='M034', Manufacturer='IPCON', **{
        'Product name': 'IPCON ASA GF', 'Shared formulation key': 'R-IPCON-ASA-GF-TDS', 'Composition / filler': 'ASA with glass fibre (fraction not published)',
        'Colour caveat': 'Specimens printed from Matte Blue; use TDS scope', 'Availability': 'Official IPCON TDS retrieved 2026-09-13',
        'Certification claims': 'Not published',
        'Selected-grade rationale': 'Representative grade from 2026-09-13: printed XY and Z tensile data on a Bambu P1S. Spectrum ASA-X GF10 (G034-01) publishes injection-moulded mechanical values only and is kept',
        'SourceID': 'R-IPCON-ASA-GF-TDS', 'Source locator': 'TDS Version 1.0, pp. 1-2', 'Diameter compatibility': '1.75 ± 0.03 mm (TDS)'}),
    dict(GradeID='G034-04', MaterialID='M034', Manufacturer='Flashforge', **{
        'Product name': 'ASAGF10', 'Shared formulation key': 'R-FLASHFORGE-ASA-GF10-TDS', 'Composition / filler': 'Modified ASA with 10% glass fibre (TDS)',
        'Colour caveat': 'Properties may vary by colour; use TDS scope', 'Availability': 'Official Flashforge TDS retrieved 2026-09-13',
        'Certification claims': 'Not published',
        'Selected-grade rationale': 'Additional ASA-GF formulation with printed X-Y strength and elongation, recorded 2026-09-13',
        'SourceID': 'R-FLASHFORGE-ASA-GF10-TDS', 'Source locator': 'TDS pp. 1-2', 'Diameter compatibility': DIAMETER}),
    dict(GradeID='G087-02', MaterialID='M087', Manufacturer='Grupa Azoty', **{
        'Product name': 'Tarfuse POM 3D Filament', 'Shared formulation key': 'R-GRUPA-AZOTY-TARFUSE-POM-TDS', 'Composition / filler': 'Polyacetal copolymer (TDS)',
        'Colour caveat': 'Natural, black', 'Availability': 'Preliminary manufacturer TDS retrieved 2026-09-13 via a distributor mirror',
        'Certification claims': 'Not published',
        'Selected-grade rationale': 'Representative grade from 2026-09-13: the only POM filament found with printed XY tensile data. purefil POM (G087-01) publishes print settings only and is kept',
        'SourceID': 'R-GRUPA-AZOTY-TARFUSE-POM-TDS', 'Source locator': 'Version 1.1, p. 2', 'Diameter compatibility': '1.75 ± 0.05 mm (TDS)'}),
    dict(GradeID='G055-R1', MaterialID='M055', Manufacturer='DuPont / Celanese', **{
        'Product name': 'Zytel 101L NC010 (PA66 resin)', 'Shared formulation key': 'R-CELANESE-ZYTEL-101L', 'Composition / filler': 'Unfilled lubricated PA66 injection-moulding resin',
        'Colour caveat': 'NC010 natural', 'Availability': RESIN, 'Certification claims': 'Not applicable',
        'Selected-grade rationale': 'Resin reference recorded 2026-09-13 to anchor PA66 estimates: no printed PA66 filament data was found. Moulded values are raw-material values, never headlines',
        'SourceID': 'R-CELANESE-ZYTEL-101L', 'Source locator': 'Data sheet pp. 1-3', 'Diameter compatibility': 'Not applicable (resin)'}),
    dict(GradeID='G058-R1', MaterialID='M058', Manufacturer='DuPont', **{
        'Product name': 'Zytel 151L NC010 (PA612 resin)', 'Shared formulation key': 'R-DUPONT-ZYTEL-GUIDE', 'Composition / filler': 'Unfilled lubricated PA612 injection-moulding resin',
        'Colour caveat': 'NC010 natural', 'Availability': RESIN, 'Certification claims': 'Not applicable',
        'Selected-grade rationale': 'Resin reference recorded 2026-09-13 to anchor PA612 estimates: no unfilled PA612 filament data was found. Moulded values are raw-material values, never headlines',
        'SourceID': 'R-DUPONT-ZYTEL-GUIDE', 'Source locator': 'p. 8, Zytel 151L DAM column', 'Diameter compatibility': 'Not applicable (resin)'}),
    dict(GradeID='G087-R1', MaterialID='M087', Manufacturer='DuPont', **{
        'Product name': 'Delrin 100P NC010 (POM homopolymer resin)', 'Shared formulation key': 'R-DUPONT-DELRIN-100P', 'Composition / filler': 'Unfilled acetal homopolymer injection-moulding resin',
        'Colour caveat': 'NC010 natural', 'Availability': RESIN, 'Certification claims': 'Not applicable',
        'Selected-grade rationale': 'Resin reference recorded 2026-09-13 to anchor POM estimates: purefil POM publishes no mechanical or thermal values. A homopolymer; a POM filament is often a copolymer. Moulded values are raw-material values, never headlines',
        'SourceID': 'R-DUPONT-DELRIN-100P', 'Source locator': 'pp. 1-3', 'Diameter compatibility': 'Not applicable (resin)'}),
]

# --------------------------------------------------------------------------------------- profiles

ROUTING = 'Verify exact grade/nozzle; no blanket approval'
AMS = 'Not verified for every grade'
TEMP_GROUP = 'Do not combine high- and low-temperature materials; low-temperature chamber guide limit 45°C. Grade-specific verification required.'
ABRASIVE = 'Use abrasion-resistant nozzle; verify minimum orifice. Fibre concentration and length are grade-specific.'

def profile(pid, mid, gid, src, locator, **fields):
    row = {'ProfileID': pid, 'MaterialID': mid, 'GradeID': gid, 'Profile': 'Manufacturer published guidance',
           'H2C left': ROUTING, 'H2C right': ROUTING, 'AMS 2 Pro': AMS, 'AMS HT': AMS,
           'Temperature-group conflict': TEMP_GROUP, 'SourceID': src, 'H2C SourceID': 'H2C-WIKI', 'Locator': locator}
    row.update(fields)
    return row

PETGGF_NOZZLE, PETGGF_BED = '250-280 °C', '60-70 °C'
ASAGF_NOZZLE, ASAGF_BED, ASAGF_CHAMBER = '265-290 °C', '90-110 °C', 'Not required (TDS: no need for positive chamber heating)'

def profiles(pid):
    return [
        profile(pid(0), 'M025', 'G025-02', 'R-ERYONE-PETG-GF-TDS', 'Part I: Suggested printing parameters', **{
            'Nozzle °C': PETGGF_NOZZLE, 'Bed °C': PETGGF_BED, 'Enclosure': 'Recommended: sealed / closed printing (TDS)',
            'Plate': 'Glass, PEI, spring steel plate', 'Speed': '30-150 mm/s', 'Drying': '60-70 °C, 4-8 h', 'Abrasion / clogging': ABRASIVE}),
        profile(pid(1), 'M034', 'G034-03', 'R-IPCON-ASA-GF-TDS', 'Recommended Printing Settings', **{
            'Nozzle °C': ASAGF_NOZZLE, 'Bed °C': ASAGF_BED, 'Chamber °C': ASAGF_CHAMBER,
            'Enclosure': 'Enclosed frame recommended; open frame compatible', 'Plate': 'Smooth / textured PEI; glue if first layer does not bond',
            'Cooling': '10-40%', 'Speed': 'Up to 300 mm/s', 'Drying': '70-90 °C, 4-8 h (blast drying oven)', 'Storage humidity': '≤ 20% RH',
            'Nozzle material': 'Hardened steel, diamond, tungsten carbide', 'Nozzle diameter': '0.6 mm recommended; 0.4 / 0.8 mm', 'Abrasion / clogging': ABRASIVE}),
        profile(pid(3), 'M087', 'G087-02', 'R-GRUPA-AZOTY-TARFUSE-POM-TDS', 'p. 2: Recommended print processing parameters', **{
            'Nozzle °C': '210-240 °C', 'Bed °C': '100-130 °C', 'Chamber °C': '70-140 °C (build chamber temperature)',
            'Plate': 'Cellulose mat (paper, wood, cork) with PVA glue', 'Speed': '10-30 mm/s', 'Drying': '140 °C, 4-6 h (hot air dryer)',
            'Nozzle diameter': '≥ 0.4 mm'}),
        profile(pid(2), 'M034', 'G034-04', 'R-FLASHFORGE-ASA-GF10-TDS', 'Recommended Printing Conditions', **{
            'Nozzle °C': '240-260 °C', 'Bed °C': '100-120 °C', 'Chamber °C': 'Room temperature-60 °C (ambient temperature for printing)',
            'Plate': 'Tempered glass, BuildTak, carbon fibre plate', 'Cooling': '0-20%', 'Speed': '40-250 mm/s',
            'Drying': '80 °C, at least 5 h', 'Nozzle material': 'Hardened steel', 'Nozzle diameter': '0.4 mm recommended; 0.6 mm', 'Abrasion / clogging': ABRASIVE}),
    ]

# Print settings a registered, hash-matched source publishes and the workbook left blank.
PROFILE_EDITS = [
    ('P0104', 'Nozzle °C', '240-260 °C', 'iSANMATE PP TDS: "240-260℃ Printing Temperature"'),
    ('P0103', 'Nozzle °C', '235 °C (printed-specimen extrusion temperature; no recommended window published)', 'HyperLite PP TDS, Printed Specimen Conditions'),
    ('P0103', 'Bed °C', '60 °C (printed-specimen bed temperature)', 'HyperLite PP TDS, Printed Specimen Conditions'),
    ('P0106', 'Nozzle °C', '265 °C (printed-specimen extrusion temperature; no recommended window published)', 'FibreX PP+GF30 TDS, Printed Specimen Conditions'),
    ('P0106', 'Bed °C', '85 °C (printed-specimen bed temperature)', 'FibreX PP+GF30 TDS, Printed Specimen Conditions'),
]

# ------------------------------------------------------------------------------------- properties

def norm(value, factor):
    d = Decimal(value) * Decimal(factor)
    s = format(d.normalize(), 'f')
    return s[:-2] if s.endswith('.0') else s

MEASUREMENTS = []
NA = 'Not applicable'
DENSITY_SPEC = 'Not published (density specimen form not explicitly established)'
RAW_SPEC = 'Raw material value'

def m(mid, gid, src, prop, raw, value, unit, *, unc=None, upper=None, direction='Not published', std='Not published',
      loc='Not published', spec='Not published (do not assume printed)', post='Not published', moist='Not published',
      params='Not published', notch=NA, notes=NA, temp='Not published', key=None):
    if unit == 'g/cm³':
        factor, nunit = '1000', 'kg/m³'
    elif unit == 'MPa-modulus':
        factor, nunit, unit = '0.001', 'GPa', 'MPa'
    else:
        factor, nunit = '1', unit
    MEASUREMENTS.append({
        'MaterialID': mid, 'GradeID': gid, 'Property': prop, 'Raw value': raw, 'Raw unit': unit, 'Raw numeric': value,
        'Raw uncertainty ±': unc or NA, 'Raw upper bound': upper or NA, 'Operator': '=', 'Conversion factor': factor,
        'Normalized value': norm(value, factor), 'Normalized uncertainty ±': norm(unc, factor) if unc else NA,
        'Normalized upper bound': norm(upper, factor) if upper else NA, 'Normalized unit': nunit, 'Data status': 'Published value',
        'Specimen type': spec, 'Direction': direction, 'Moisture condition': moist, 'Post-processing': post, 'Test temperature': temp,
        'Standard / load': std, 'Notch': notch, 'Specimen / print parameters': params, 'SourceID': src, 'Locator': loc, 'Notes': notes,
        'Stress max MPa': NA, 'Stress min MPa': NA, 'Stress amplitude MPa': NA, 'Frequency Hz': NA, 'Load ratio R': NA, 'Run-out': NA,
        '__key': key,
    })

# Eryone PETG-GF. Printed samples: 250 °C nozzle, 80 mm/s, 60 °C plate, 100% infill, 0.4 mm nozzle.
S = ('M025', 'G025-02', 'R-ERYONE-PETG-GF-TDS')
P = 'Printed specimen'
ERYONE = 'Printed at 250 °C nozzle, 80 mm/s, 60 °C base plate, 100% infill, 0.4 mm nozzle'
m(*S, 'Density', '1.33 g/cm³ at 21.5 °C', '1.33', 'g/cm³', direction=NA, spec=DENSITY_SPEC, std='ASTM D792 (ISO 1183, GB/T 1033)', temp='21.5 °C',
  loc='Part II: Density', key='eryone-density')
m(*S, 'HDT', '80 °C', '80', '°C', direction=NA, std='ASTM D648 (the row lists both standard loads and one value; load ambiguous)',
  loc='Part II: Heat distortion temperature', notes='The published row names both 1.8 MPa and 0.45 MPa and gives a single value, so the load is not stated.')
m(*S, 'Glass transition temperature', '75 °C', '75', '°C', direction=NA, std='DSC, 10 °C/min', loc='Part II: Glass transition temperature')
m(*S, 'Tensile strength (endpoint unspecified)', '53.6 MPa', '53.6', 'MPa', direction='XY', std='GB/T 1040.4, 50 mm/min', spec=P, params=ERYONE,
  loc='Part III: Tensile strength X-Y', key='eryone-strength')
m(*S, 'Tensile modulus', '2334.5 MPa', '2334.5', 'MPa-modulus', direction='XY', std='GB/T 1040.1-2006, 50 mm/min', spec=P, params=ERYONE,
  loc='Part III: Elastic modulus X-Y', key='eryone-modulus')
m(*S, 'Elongation at break', '1.9 %', '1.9', '%', direction='XY', std='GB/T 1040.4, 50 mm/min', spec=P, params=ERYONE,
  loc='Part III: Elongation at break X-Y', key='eryone-elongation')
for prop, raw, v, unit, label in [('Tensile strength (endpoint unspecified)', '25.1 MPa', '25.1', 'MPa', 'Tensile strength X-Z'),
                                  ('Tensile modulus', '2109.7 MPa', '2109.7', 'MPa-modulus', 'Elastic modulus X-Z'),
                                  ('Elongation at break', '1.7 %', '1.7', '%', 'Elongation at break X-Z')]:
    m(*S, prop, raw, v, unit, std='GB/T 1040, 50 mm/min', spec=P, params=ERYONE, loc=f'Part III: {label}',
      notes='Source label X-Z. Strength is about half the X-Y value, so this is not read as an on-edge XZ bar; direction recorded as not published.')
m(*S, 'Flexural strength', '78.5 MPa', '78.5', 'MPa', std='GB/T 9341, 2 mm/min', spec=P, params=ERYONE, loc='Part III: Bending strength')
m(*S, 'Flexural modulus', '3027.5 MPa', '3027.5', 'MPa-modulus', std='GB/T 9341, 2 mm/min', spec=P, params=ERYONE, loc='Part III: Bending modulus')

# iSANMATE PETG Glass Fiber: values the hash-matched TDS publishes and the workbook never entered.
S = ('M025', 'G025-01', 'I-PETG-Glass-Fiber-Technical-Data-Sheet')
m(*S, 'Tensile strength (endpoint unspecified)', '53 MPa', '53', 'MPa', std='ASTM D-638', loc='p. 1: Tensile Strength',
  notes='Missed at first transcription; recovered 2026-09-13 from the hash-matched TDS.')
m(*S, 'Flexural modulus', '1986 MPa', '1986', 'MPa-modulus', std='ASTM D-790', loc='p. 1: Flexural modulus',
  notes='Missed at first transcription; recovered 2026-09-13 from the hash-matched TDS.')

# IPCON ASA GF. Mechanical specimens printed on a Bambu P1S, 275 °C nozzle, 100 °C bed, 100% concentric infill.
S = ('M034', 'G034-03', 'R-IPCON-ASA-GF-TDS')
IPCON = 'Printed by IPCON on a Bambu P1S: 275 °C nozzle, 100 °C bed, 155 mm/s XY and 147 mm/s Z, 100% concentric infill, Matte Blue'
m(*S, 'Density', '1.11 g/cm³', '1.11', 'g/cm³', direction=NA, spec=DENSITY_SPEC, std='ISO 1183-3', loc="Filament's properties: Density", key='ipcon-density')
m(*S, 'Vicat softening temperature', '107 °C', '107', '°C', direction=NA, std='ISO 306, GB/T 1633', loc="Filament's properties: Vicat softening temperature")
m(*S, 'HDT', '98 °C', '98', '°C', direction=NA, std='ISO 75, 0.45 MPa', loc="Filament's properties: Heat deflection temperature", key='ipcon-hdt')
for prop, xy, z, unit, label in [('Tensile strength (endpoint unspecified)', '39', '28', 'MPa', 'Tensile Strength'),
                                 ('Tensile modulus', '2758', '2156', 'MPa-modulus', "Young's Modulus"),
                                 ('Elongation at break', '5.8', '2.1', '%', 'Breaking Elongation Rate'),
                                 ('Flexural strength', '76', '49', 'MPa', 'Flexural Strength'),
                                 ('Flexural modulus', '2758', '2156', 'MPa-modulus', 'Flexural Modulus')]:
    std = 'ISO 178, GB/T 9341' if prop.startswith('Flexural') else 'ISO 527, GB/T 1040'
    shown = 'MPa' if unit == 'MPa-modulus' else unit
    notes = 'Published equal to the tensile modulus in the same TDS; recorded as published.' if prop == 'Flexural modulus' else NA
    k = {'Tensile strength (endpoint unspecified)': 'ipcon-strength', 'Tensile modulus': 'ipcon-modulus', 'Elongation at break': 'ipcon-elongation'}.get(prop)
    m(*S, prop, f'{xy} {shown}', xy, unit, direction='XY', std=std, spec=P, params=IPCON, loc=f'Mechanical properties: {label} XY', notes=notes, key=k)
    m(*S, prop, f'{z} {shown}', z, unit, direction='Z', std=std, spec=P, params=IPCON, loc=f'Mechanical properties: {label} Z', notes=notes)

# Flashforge ASAGF10. The flexural rows swap "modulus" and "strength" labels in the TDS, so they are not entered.
S = ('M034', 'G034-04', 'R-FLASHFORGE-ASA-GF10-TDS')
FF = 'Printed on a Flashforge Guider 3 Ultra: 0.4 mm nozzle, 250 °C, 200 mm/s, 100% concentric infill'
FF_NOTE = 'The TDS labels its flexural rows the wrong way round (72.5-74.1 "modulus", 3359-3368 "strength"); those rows were not entered.'
m(*S, 'Density', '1.17~1.18 g/cm³', '1.17', 'g/cm³', upper='1.18', direction=NA, spec=DENSITY_SPEC, std='ISO 1183', loc='Physical Properties: Density')
m(*S, 'Tensile strength (endpoint unspecified)', '40.8~41.3 MPa', '40.8', 'MPa', upper='41.3', direction='XY', std='ISO 527', spec=P, params=FF,
  loc='Mechanical Properties: Tensile Strength (X-Y)', notes=FF_NOTE)
m(*S, 'Elongation at break', '5.3~5.8 %', '5.3', '%', upper='5.8', direction='XY', std='ISO 527', spec=P, params=FF,
  loc='Mechanical Properties: Elongation at Break (X-Y)')
m(*S, 'HDT', '88 °C', '88', '°C', direction=NA, std='ISO 75, 0.455 MPa (66 psi)', loc='Thermal Properties: HDT @ 0.455 MPa (66 psi)')

# Spectrum ASA-X GF10: the asterisked rows are injection moulded per the TDS footnote "*injection moulding".
S = ('M034', 'G034-01', 'S-SPECTRUM-en-tds-spectrum-asax-x-gf10')
SPEC_NOTE = 'TDS footnote "*injection moulding": a moulded specimen, not a printed part. Missed at first transcription; recovered 2026-09-13 from the hash-matched TDS.'
m(*S, 'Tensile break strength', '55 MPa', '55', 'MPa', std='ISO 527', spec=RAW_SPEC, loc='Mechanical properties: Tensile Strength* at break', notes=SPEC_NOTE)
m(*S, 'Tensile modulus', '2550 MPa', '2550', 'MPa-modulus', std='ISO 527, 1 mm/min', spec=RAW_SPEC, loc='Mechanical properties: Elastic modulus tensile*', notes=SPEC_NOTE)
m(*S, 'Elongation at yield', '2.80 %', '2.8', '%', std='ISO 527', spec=RAW_SPEC, loc='Mechanical properties: Tensile Elongation* at yield', notes=SPEC_NOTE)
m(*S, 'HDT', '100 °C', '100', '°C', direction=NA, std='ISO 75, 0.45 MPa', spec=RAW_SPEC, loc='Thermal properties: Heat Deflection Temperature 0.45mn/m2*', notes=SPEC_NOTE)
m(*S, 'HDT', '90 °C', '90', '°C', direction=NA, std='ISO 75, 1.81 MPa', spec=RAW_SPEC, loc='Thermal properties: Heat Deflection Temperature 1.81mn/m2*', notes=SPEC_NOTE)

# Stratasys FDM Nylon 12, the 310-21800 canister already recorded as the fatigue-study grade G052-R1.
S = ('M052', 'G052-R1', 'R-STRATASYS-FDM-NYLON12-MDS')
SS = 'Printed on a Stratasys F900, T16 tip, 0.254 mm layer height; values as printed'
m(*S, 'Density', 'Specific gravity 1.01 at 23 °C', '1.01', 'g/cm³', direction=NA, spec=DENSITY_SPEC, temp='23 °C',
  std='Not published (the table cites ASTM D257, a resistivity method)', loc='Table 3: Specific Gravity')
m(*S, 'HDT', '94.7 °C (XY)', '94.7', '°C', direction=NA, std='ASTM D648 Method B, 66 psi (0.455 MPa)', spec=P, params=SS, post='As printed',
  loc='Table 3: HDT @ 66 psi, XY', notes='Flat (XY) bar. The XZ/ZX bars measured 91.9 °C.')
m(*S, 'HDT', '84.3 °C (XY)', '84.3', '°C', direction=NA, std='ASTM D648 Method B, 264 psi (1.82 MPa)', spec=P, params=SS, post='As printed',
  loc='Table 3: HDT @ 264 psi, XY', notes='Flat (XY) bar. The XZ/ZX bars measured 75.3 °C.')
m(*S, 'Glass transition temperature', '34.03 °C', '34.03', '°C', direction=NA, std='ASTM D7426, inflection point', spec=P, loc='Table 3: Tg')
for prop, xz, xz_u, zx, zx_u, unit, label in [
    ('Tensile yield strength', '49.3', '0.48', '41.8', '0.67', 'MPa', 'Yield Strength'),
    ('Elongation at yield', '6.1', '0.068', '5.8', '0.16', '%', 'Elongation @ Yield'),
    ('Tensile break strength', '33.4', '1.7', '41.2', '0.72', 'MPa', 'Strength @ Break'),
    ('Elongation at break', '30', '23', '6.5', '0.39', '%', 'Elongation @ Break'),
    ('Tensile modulus', '1.51', '0.087', '1.25', '0.12', 'GPa', 'Modulus (Elastic)'),
    ('Flexural modulus', '1.26', '0.13', '1.20', '0.12', 'GPa', 'Flexural Modulus'),
]:
    std = 'ASTM D790, Procedure A' if prop.startswith('Flexural') else 'ASTM D638'
    for direction, v, u in [('XZ', xz, xz_u), ('ZX', zx, zx_u)]:
        m(*S, prop, f'{v} ({u}) {unit}', v, unit, unc=u, direction=direction, std=std, spec=P, params=SS, post='As printed',
          loc=f'Table 4: {label}, {direction} orientation', notes='Value in parentheses is the standard deviation. XZ is a bar printed on edge; ZX is upright.')

# Grupa Azoty Tarfuse POM, preliminary TDS: XY is a flat printed bar; XZ and ZX "to be tested".
S = ('M087', 'G087-02', 'R-GRUPA-AZOTY-TARFUSE-POM-TDS')
TARFUSE = 'Printed flat (XY); tested at 23 °C; print parameters as recommended in the TDS'
m(*S, 'Density', '1,42 g/cm3', '1.42', 'g/cm³', direction=NA, spec=DENSITY_SPEC, std='ISO 1183', loc='Physical Properties: Density', key='tarfuse-density')
m(*S, 'Melting temperature', '165-170 °C', '165', '°C', upper='170', direction=NA, std='ISO 11357-1-3, DSC 10 °C/min', loc='Physical Properties: Melting temperature')
m(*S, 'Glass transition temperature', '-50 °C', '-50', '°C', direction=NA, std='ISO 11357-1-3, DSC 10 °C/min', loc='Physical Properties: Glass transition temperature')
m(*S, 'Tensile strength (endpoint unspecified)', '50 MPa', '50', 'MPa', direction='XY', std='ISO 527-1,-2, 50 mm/min', spec=P, params=TARFUSE,
  loc='Mechanical Properties: Tensile strength, XY (flat)', key='tarfuse-strength')
m(*S, 'Elongation at break', '11 %', '11', '%', direction='XY', std='ISO 527-1,-2, 50 mm/min', spec=P, params=TARFUSE,
  loc='Mechanical Properties: Elongation at break, XY (flat)', key='tarfuse-elongation')
m(*S, 'Tensile modulus', '1870 MPa', '1870', 'MPa-modulus', direction='XY', std='ISO 527-1,-2, 1 mm/min', spec=P, params=TARFUSE,
  loc='Mechanical Properties: Tensile E-modulus, XY (flat)', key='tarfuse-modulus')

# Resin references: injection-moulded specimens, never headlines.
DAM = 'Dry as moulded'
S = ('M087', 'G087-R1', 'R-DUPONT-DELRIN-100P')
RESIN_NOTE = 'Resin supplier value from a moulded specimen, recorded 2026-09-13 to anchor estimates. Not a printed part.'
m(*S, 'Density', '1.42 g/cm3 (1420 kg/m3)', '1.42', 'g/cm³', direction=NA, spec=RAW_SPEC, std='ISO 1183', loc='Other: Density', notes=RESIN_NOTE)
m(*S, 'Tensile yield strength', '70 MPa', '70', 'MPa', std='ISO 527', spec=RAW_SPEC, loc='Mechanical: Yield Stress', notes=RESIN_NOTE)
m(*S, 'Tensile modulus', '2900 MPa', '2900', 'MPa-modulus', std='ISO 527', spec=RAW_SPEC, loc='Mechanical: Tensile Modulus', notes=RESIN_NOTE)
m(*S, 'Elongation at break', '65 %', '65', '%', std='ISO 527, 50 mm/min', spec=RAW_SPEC, loc='Mechanical: Strain at Break, 50mm/min', notes=RESIN_NOTE)
m(*S, 'Flexural modulus', '2600 MPa', '2600', 'MPa-modulus', std='ISO 178', spec=RAW_SPEC, loc='Mechanical: Flexural Modulus', notes=RESIN_NOTE)
m(*S, 'HDT', '160 °C', '160', '°C', direction=NA, std='ISO 75-1/-2, 0.45 MPa', spec=RAW_SPEC, loc='Thermal: Deflection Temperature 0.45MPa', notes=RESIN_NOTE)
m(*S, 'HDT', '93 °C', '93', '°C', direction=NA, std='ISO 75-1/-2, 1.80 MPa', spec=RAW_SPEC, loc='Thermal: Deflection Temperature 1.80MPa', notes=RESIN_NOTE)
m(*S, 'Melting temperature', '178 °C', '178', '°C', direction=NA, std='ISO 11357-1/-3, 10 °C/min', spec=RAW_SPEC, loc='Thermal: Melting Temperature', notes=RESIN_NOTE)
m(*S, 'Vicat softening temperature', '160 °C', '160', '°C', direction=NA, std='ISO 306, 50 N', spec=RAW_SPEC, loc='Thermal: Vicat Softening Temperature', notes=RESIN_NOTE)

S = ('M055', 'G055-R1', 'R-CELANESE-ZYTEL-101L')
m(*S, 'Density', '1140 kg/m³', '1140', 'kg/m³', direction=NA, spec=RAW_SPEC, std='ISO 1183', loc='Other properties: Density', notes=RESIN_NOTE)
m(*S, 'Tensile yield strength', '82 MPa (dry)', '82', 'MPa', std='ISO 527-1/-2, 50 mm/min', spec=RAW_SPEC, moist=DAM, loc='Typical mechanical properties: Yield stress, dry', notes=RESIN_NOTE)
m(*S, 'Tensile modulus', '3100 MPa (dry)', '3100', 'MPa-modulus', std='ISO 527-1/-2', spec=RAW_SPEC, moist=DAM, loc='Typical mechanical properties: Tensile Modulus, dry', notes=RESIN_NOTE)
m(*S, 'Elongation at break', '45 % (dry)', '45', '%', std='ISO 527-1/-2, 50 mm/min', spec=RAW_SPEC, moist=DAM, loc='Typical mechanical properties: Strain at break, dry', notes=RESIN_NOTE)
m(*S, 'Flexural modulus', '2800 MPa (dry)', '2800', 'MPa-modulus', std='ISO 178', spec=RAW_SPEC, moist=DAM, loc='Typical mechanical properties: Flexural Modulus, dry', notes=RESIN_NOTE)
m(*S, 'HDT', '190 °C (dry)', '190', '°C', direction=NA, std='ISO 75-1/-2, 0.45 MPa', spec=RAW_SPEC, moist=DAM, loc='Thermal properties: Temp. of deflection under load, 0.45 MPa', notes=RESIN_NOTE)
m(*S, 'HDT', '70 °C (dry)', '70', '°C', direction=NA, std='ISO 75-1/-2, 1.8 MPa', spec=RAW_SPEC, moist=DAM, loc='Thermal properties: Temp. of deflection under load, 1.8 MPa', notes=RESIN_NOTE)
m(*S, 'Melting temperature', '262 °C', '262', '°C', direction=NA, std='ISO 11357-1/-3, 10 °C/min', spec=RAW_SPEC, loc='Thermal properties: Melting temperature', notes=RESIN_NOTE)
m(*S, 'Glass transition temperature', '70 °C (dry)', '70', '°C', direction=NA, std='ISO 11357-1/-3, 10 °C/min', spec=RAW_SPEC, moist=DAM, loc='Thermal properties: Glass transition temperature', notes=RESIN_NOTE)

S = ('M058', 'G058-R1', 'R-DUPONT-ZYTEL-GUIDE')
m(*S, 'Density', '1060 kg/m³', '1060', 'kg/m³', direction=NA, spec=RAW_SPEC, std='ISO 1183', loc='p. 8: Density, Zytel 151L', notes=RESIN_NOTE)
m(*S, 'Tensile yield strength', '62 MPa (DAM)', '62', 'MPa', std='ISO 527-1/-2, 50 mm/min', spec=RAW_SPEC, moist=DAM, loc='p. 8: Yield stress, Zytel 151L DAM', notes=RESIN_NOTE)
m(*S, 'Tensile modulus', '2400 MPa (DAM)', '2400', 'MPa-modulus', std='ISO 527-1/-2, 1 mm/min', spec=RAW_SPEC, moist=DAM, loc='p. 8: Tensile modulus, Zytel 151L DAM', notes=RESIN_NOTE)
m(*S, 'Elongation at break', '100 % (DAM)', '100', '%', std='ISO 527-1/-2, 50 mm/min', spec=RAW_SPEC, moist=DAM, loc='p. 8: Strain at break 50 mm/min, Zytel 151L DAM', notes=RESIN_NOTE)
m(*S, 'HDT', '135 °C', '135', '°C', direction=NA, std='ISO 75-1/-2, 0.45 MPa', spec=RAW_SPEC, loc='p. 8: Temperature of deflection under load 0.45 MPa, Zytel 151L', notes=RESIN_NOTE)
m(*S, 'HDT', '62 °C', '62', '°C', direction=NA, std='ISO 75-1/-2, 1.8 MPa', spec=RAW_SPEC, loc='p. 8: Temperature of deflection under load 1.8 MPa, Zytel 151L', notes=RESIN_NOTE)
m(*S, 'Melting temperature', '218 °C', '218', '°C', direction=NA, std='ISO 11357-1/-3, 10 °C/min', spec=RAW_SPEC, loc='p. 8: Melting temperature, Zytel 151L', notes=RESIN_NOTE)
m(*S, 'Vicat softening temperature', '181 °C', '181', '°C', direction=NA, std='ISO 306, 50 N, 50 °C/h', spec=RAW_SPEC, loc='p. 8: Vicat softening temperature, Zytel 151L', notes=RESIN_NOTE)

# --------------------------------------------------------------------------- corrections in place

HDT_045 = 'ISO 75, 0.45 MPa (66 psi)'
HDT_LOAD_RECOVERED = ['V000008', 'V000389', 'V000517', 'V000594', 'V000603', 'V000726', 'V000890', 'V000971', 'V001014',
                      'V001051', 'V001117', 'V001125', 'V001170', 'V001207', 'V001346', 'V001477', 'V001496', 'V001508',
                      'V001515', 'V001531', 'V001554', 'V001610']
FILM = 'Film specimen (ASTM D882); not a printed or moulded bar'
MEASUREMENT_EDITS = [
    ('V000605', {'Raw value': '80 °C', 'Raw numeric': '80', 'Normalized value': '80', 'Standard / load': 'ISO 11357',
                 'Data status': 'Published value (transcription corrected)',
                 'Notes': 'Corrected 2026-09-13. The TDS prints "ISO 11357 80°C"; the standard number and the value had been read as one number, 1135780.'}),
    ('V000039', {'Raw value': '110,3 MPa', 'Raw numeric': '110.3', 'Normalized value': '110.3', 'Standard / load': 'ASTM D882, machine direction',
                 'Specimen type': FILM, 'Data status': 'Published value (transcription corrected)',
                 'Notes': 'Corrected 2026-09-13. "110,3" uses a decimal comma and had been read as 3. ASTM D882 is the thin-film tensile method; MD is the film machine direction. Not comparable with a printed bar.'}),
    ('V000040', {'Specimen type': FILM, 'Notes': 'ASTM D882 thin-film value, machine direction. Not comparable with a printed bar (2026-09-13).'}),
    ('V000041', {'Specimen type': FILM, 'Notes': 'ASTM D882 thin-film value, machine direction. Not comparable with a printed bar (2026-09-13).'}),
    ('V000507', {'Raw value': '72 ℃', 'Raw numeric': '72', 'Normalized value': '72', 'Standard / load': 'Vicat A/120 (the TDS cites ASTM D-648 beside it)',
                 'Data status': 'Published value (transcription corrected)',
                 'Notes': 'Corrected 2026-09-13. The TDS row reads "Vicat softening point A/120 ℃ ASTM D-648 72": A/120 is the Vicat method and 72 °C the value, which had been read as 120.'}),
    ('V001489', {'Standard / load': 'ISO 75-2 method B (0.45 MPa)',
                 'Notes': 'ISO 75-2 method B is the 0.45 MPa load; the load is stated by the method letter (2026-09-13).'}),
] + [(vid, {'Standard / load': HDT_045}) for vid in HDT_LOAD_RECOVERED]

# -------------------------------------------------------------------------------------- materials

def materials_edits(V, P):
    return {
        'M025': {
            'Representative grade': 'G025-02', 'GradeIDs': 'G025-01; G025-02', 'Printing evidence': P(0),
            'Nozzle guidance': PETGGF_NOZZLE, 'Bed guidance': PETGGF_BED, 'Chamber guidance': 'Not published',
            'Density kg/m³': Decimal('1330'), 'Tensile modulus XY GPa': Decimal('2.3345'), 'Tensile strength XY MPa': Decimal('53.6'),
            'Elongation at break XY %': Decimal('1.9'),
            'Mechanical evidence': f"{V('eryone-density')}; {V('eryone-modulus')}; {V('eryone-strength')}; {V('eryone-elongation')}",
            'Measurement conditions': 'Printed X-Y specimens, 250 °C nozzle, 100% infill; GB/T 1040 tensile at 50 mm/min. HDT is published with an ambiguous load and is not a headline',
            'Identity notes': 'Representative grade changed 2026-09-13 from iSANMATE PETG Glass Fiber (G025-01, no specimen direction published) to Eryone PETG-GF (G025-02, printed X-Y data, 10% glass fibre). iSANMATE was not overwritten.',
        },
        'M034': {
            'Representative grade': 'G034-03', 'GradeIDs': 'G034-01; G034-02; G034-03; G034-04', 'Printing evidence': P(1),
            'Nozzle guidance': ASAGF_NOZZLE, 'Bed guidance': ASAGF_BED, 'Chamber guidance': ASAGF_CHAMBER,
            'Density kg/m³': Decimal('1110'), 'Tensile modulus XY GPa': Decimal('2.758'), 'Tensile strength XY MPa': Decimal('39'),
            'Elongation at break XY %': Decimal('5.8'),
            'Mechanical evidence': f"{V('ipcon-density')}; {V('ipcon-modulus')}; {V('ipcon-strength')}; {V('ipcon-elongation')}",
            'Measurement conditions': 'Printed by IPCON on a Bambu P1S, 275 °C nozzle, 100% concentric infill; ISO 527. HDT ISO 75 at 0.45 MPa',
            'HDT 0.45 MPa °C': Decimal('98'), 'Thermal evidence': V('ipcon-hdt'),
            'Identity notes': 'Representative grade changed 2026-09-13 from Spectrum ASA-X GF10 (G034-01), whose mechanical and HDT values are injection moulded per its TDS, to IPCON ASA GF (G034-03), which publishes printed XY and Z data. Flashforge ASAGF10 (G034-04) added.',
        },
        'M087': {
            'Representative grade': 'G087-02', 'GradeIDs': 'G087-01; G087-02',
            'Density kg/m³': Decimal('1420'), 'Tensile modulus XY GPa': Decimal('1.87'), 'Tensile strength XY MPa': Decimal('50'),
            'Elongation at break XY %': Decimal('11'),
            'Mechanical evidence': f"{V('tarfuse-density')}; {V('tarfuse-modulus')}; {V('tarfuse-strength')}; {V('tarfuse-elongation')}",
            'Measurement conditions': 'Printed flat (XY) ISO 527 bars at 23 °C, preliminary TDS; XZ and ZX not yet tested. HDT not published',
            'Identity notes': 'Representative grade changed 2026-09-13 from purefil POM (G087-01, print settings only) to Grupa Azoty Tarfuse POM (G087-02, printed XY data, polyacetal copolymer). purefil remains the printing evidence. Delrin 100P (G087-R1) is a resin reference only.',
        },
        'M082': {'Nozzle guidance': PROFILE_EDITS[1][2], 'Bed guidance': PROFILE_EDITS[2][2]},
        'M084': {'Nozzle guidance': PROFILE_EDITS[3][2], 'Bed guidance': PROFILE_EDITS[4][2]},
    }

# --------------------------------------------------------------------------------------- coverage

COVERAGE_EDITS = {
    'C00005': ('Gap', '2 distinct manufacturer(s) documented against target 3. Eryone PETG-GF (G025-02) added 2026-09-13 as the representative grade.'),
    'C00305': ('Evidence recorded', 'Eryone PETG-GF TDS recorded 2026-09-13: nozzle 250-280 °C, bed 60-70 °C, closed printing.'),
    'C00306': ('Evidence recorded', 'Eryone PETG-GF printed X-Y tensile values are the headlines. iSANMATE tensile strength 53 MPa and flexural modulus 1986 MPa, published but never entered, recovered 2026-09-13; its 98% elongation has no stated direction and conflicts with every glass-filled value.'),
    'C00307': ('Evidence recorded', 'Eryone HDT 80 °C is published with an ambiguous load and is not a headline; Tg 75 °C. The iSANMATE Vicat value was corrected from 120 °C to 72 °C.'),
    'C00008': ('Evidence recorded', '4 distinct manufacturer(s) documented against target 3. IPCON ASA GF (G034-03, representative) and Flashforge ASAGF10 (G034-04) added 2026-09-13.'),
    'C00395': ('Evidence recorded', 'IPCON ASA GF: nozzle 265-290 °C, bed 90-110 °C, no positive chamber heating. Flashforge ASAGF10: nozzle 240-260 °C, bed 100-120 °C, room temperature to 60 °C. Spectrum ASA-X GF10: nozzle 240-270 °C, bed 80-100 °C.'),
    'C00396': ('Evidence recorded', 'IPCON ASA GF printed XY and Z tensile values are the headlines. Spectrum ASA-X GF10 tensile values are injection moulded per its TDS footnote and are recorded as raw-material values.'),
    'C00397': ('Evidence recorded', 'IPCON HDT 98 °C at 0.45 MPa (ISO 75) is the headline. Spectrum moulded HDT 100 °C at 0.45 MPa and 90 °C at 1.81 MPa are raw-material values; Flashforge 88 °C at 0.455 MPa.'),
    'C00576': ('Limited comparability', 'Stratasys FDM Nylon 12 data sheet recorded 2026-09-13 on the study grade G052-R1: printed XZ (on edge) and ZX (upright) tensile and flexural values. None is an XY headline, and the AMIDEX representative grade publishes no mechanical value.'),
    'C00577': ('Limited comparability', 'Stratasys FDM Nylon 12: HDT 94.7 °C at 66 psi and 84.3 °C at 264 psi (XY bars), Tg 34 °C, on the study grade G052-R1. Not the representative grade, so not a headline.'),
    'C00605': ('Limited comparability', 'Resin reference only: Zytel 101L NC010 moulded, dry (G055-R1), recorded 2026-09-13 as raw-material values to anchor estimates. No printed PA66 filament data was found.'),
    'C00606': ('Limited comparability', 'Resin reference only: Zytel 101L NC010 HDT 190 °C at 0.45 MPa and 70 °C at 1.8 MPa, moulded, dry; melting point 262 °C.'),
    'C00635': ('Limited comparability', 'Resin reference only: Zytel 151L NC010 moulded, dry as moulded (G058-R1), recorded 2026-09-13 as raw-material values to anchor estimates. No unfilled PA612 filament data was found.'),
    'C00636': ('Limited comparability', 'Resin reference only: Zytel 151L NC010 HDT 135 °C at 0.45 MPa and 62 °C at 1.8 MPa, moulded; melting point 218 °C.'),
    'C00041': ('Gap', '2 distinct manufacturer(s) documented against target 3. Grupa Azoty Tarfuse POM (G087-02) added 2026-09-13 as the representative grade.'),
    'C00930': ('Evidence recorded', 'purefil POM: nozzle 190-210 °C, bed 120-150 °C (P0109). Tarfuse POM: nozzle 210-240 °C, bed 100-130 °C, build chamber 70-140 °C, recorded 2026-09-13.'),
    'C00931': ('Evidence recorded', 'Tarfuse POM printed XY tensile strength, modulus and elongation are the headlines (preliminary TDS; XZ and ZX not yet tested). Delrin 100P NC010 moulded values (G087-R1) are a resin reference.'),
    'C00932': ('Evidence recorded', 'Tarfuse POM: melting point 165-170 °C, Tg -50 °C; no HDT published. Delrin 100P NC010 resin reference: HDT 160 °C at 0.45 MPa and 93 °C at 1.80 MPa, moulded.'),
    'C00879': ('Evidence recorded', 'iSANMATE PP recommends a 240-260 °C nozzle (recovered 2026-09-13 from the hash-matched TDS) and a 40-60 °C bed (P0104). HyperLite PP specimens were printed at 235 °C nozzle and 60 °C bed (P0103). No chamber temperature is published.'),
    'C00899': ('Partially resolved', 'FibreX PP+GF30 publishes only its printed-specimen conditions, 265 °C nozzle and 85 °C bed (P0106), recorded 2026-09-13. No recommended window.'),
}

def coverage_new(material_of_measurement):
    rows = []
    add = lambda mid, domain, status, finding: rows.append({'MaterialID': mid, 'Domain': domain, 'Status': status, 'Finding': finding})
    for vid in HDT_LOAD_RECOVERED:
        add(material_of_measurement[vid], 'Thermal', 'Resolved',
            f'{vid}: the hash-matched 3DXTECH TDS prints "Deflection Temperature at 0.45 MPa (66psi)"; the load had been lost at a line break and is recorded 2026-09-13.')
    add('M081', 'Thermal', 'Resolved', 'V001489: ISO 75-2 method B is the 0.45 MPa load; recorded 2026-09-13 as stated.')
    add('M030', 'Research conflict', 'Resolved', 'V000605 corrected 2026-09-13: the iSANMATE ESD-ABS TDS prints "ISO 11357 80°C", read as 1135780 °C.')
    add('M001', 'Research conflict', 'Resolved', 'V000039-V000041 are ASTM D882 thin-film values in the iSANMATE PLA TDS, not printed bars; V000039 corrected from 3 to 110.3 MPa (decimal comma) on 2026-09-13.')
    add('M025', 'Research conflict', 'Resolved', 'V000507 corrected 2026-09-13: iSANMATE "Vicat softening point A/120 ... 72" is method A/120 at 72 °C, read as 120 °C.')
    add('M034', 'Comparability', 'Limited comparability', 'Spectrum ASA-X GF10 mechanical and HDT values are injection moulded (TDS footnote); IPCON and Flashforge values are printed. Flashforge labels its flexural rows the wrong way round; not entered.')
    return rows

# ----------------------------------------------------------------------------------------- method

METHOD_ESTIMATES = ('Comparison', 'Estimates', (
    'A missing headline may carry an estimate, always shown as an estimate. One Gaussian model per headline, on a log '
    'scale for density, stiffness, strength and elongation and in °C for heat deflection, takes every observation in '
    'the snapshot: measured headlines, a material\'s related measurements (another endpoint, direction, load or '
    'specimen, and resin data sheets) and its other grades, each converted to the headline\'s own semantics with a '
    'documented offset and spread refined from grades that publish both. Its structure is polymer identity within '
    'its chemical group, reinforcement by matrix, declared variants, test house and, for the heat deflection of '
    'polymers that crystallise while printing, the melting point; each material and product adds its own deviation. '
    'Melting point and glass transition limit heat deflection. The likely (80%) and plausible (95%) ranges are '
    'calibrated by hiding each measured headline and predicting it back. An estimate never passes a requirement; in '
    'exploration it may screen a material out only when its plausible range wholly fails, no own measurement of that '
    'property could meet the requirement, and it rests on the material\'s own evidence or an identity measured on at '
    'least two products. Heat deflection of an elastomer, and any value of a support product, is not applicable '
    'unless its own sources publish one. Parameters: build/mappings/estimate-model.json.'))
METHOD_NEW = [
    {'Section': 'Evidence', 'Topic': 'Resin references',
     'Definition / rule': 'A resin supplier data sheet may be recorded for an identity no filament source characterises, as a study grade (R suffix) whose values are raw-material values from moulded specimens. It is never a headline or a procurement grade; it anchors estimates through a documented moulded-to-printed conversion.'},
]

def set_method(book, section, topic, text):
    part = SHEETS['Method'][0]
    xml = book.xml(part)
    target = None
    for rm in NS_ROW.finditer(xml):
        b = re.search(r'<x:c r="B%s"[^>]*?(?:/>|>.*?</x:c>)' % rm.group(1), rm.group(0), re.S)
        a = re.search(r'<x:c r="A%s"[^>]*?(?:/>|>.*?</x:c>)' % rm.group(1), rm.group(0), re.S)
        if b and a and book.cell_text(b.group(0)) == topic and book.cell_text(a.group(0)) == section:
            target = rm
    if target is None:
        raise KeyError(f'Method: no row {section} / {topic}')
    c = re.search(r'<x:c r="C%s"([^>]*?)(?:/>|>.*?</x:c>)' % target.group(1), target.group(0), re.S)
    style = re.search(r' s="(\d+)"', c.group(1))
    s_attr = f' s="{style.group(1)}"' if style else ''
    new = f'<x:c r="C{target.group(1)}"{s_attr} t="str"><x:v>{xml_text(text)}</x:v></x:c>'
    before = book.cell_text(c.group(0))
    row_xml = target.group(0)[:c.start()] + new + target.group(0)[c.end():]
    book.put(part, xml[:target.start()] + row_xml + xml[target.end():])
    book.changes.append(dict(sheet='Method', record=f'{section} / {topic}', cell=f'C{target.group(1)}', action='Edited',
                             field='Definition / rule', before=before, after=text))


def main(path):
    digest = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    if digest != EXPECTED_SHA256:
        sys.exit(f'Refusing to run: workbook SHA-256 is {digest}, expected {EXPECTED_SHA256}.')
    book = Book(path)

    for s in SRC:
        book.append('Sources', {'SourceID': s['SourceID'], 'Publisher': s['Publisher'], 'Title': s['Title'],
                                'Revision': s['Revision'], 'Publication date': 'Not published', 'Access date': TODAY,
                                'Source class': s['cls'], 'URL': s['URL'], 'Locator': s['Locator'],
                                'Applicable grades': s['grades'], 'Access status': 'Retrieved', 'SHA256': s['sha']})
    for g in GRADES:
        book.append('Grades', g)

    pid = next_id(book, 'Print setup', 'P', 4)
    new_profiles = profiles(pid)
    headers = book.headers('Print setup')
    for p in new_profiles:
        book.append('Print setup', {h: p.get(h, 'Not published') for h in headers})
    for profile_id, column, value, _why in PROFILE_EDITS:
        book.set('Print setup', profile_id, column, value)

    vid = next_id(book, 'Properties', 'V', 6)
    keyed = {}
    for i, row in enumerate(MEASUREMENTS):
        row = dict(row)
        row['MeasurementID'] = vid(i)
        if row['__key']:
            keyed[row['__key']] = row['MeasurementID']
        del row['__key']
        book.append('Properties', row)
    material_of = {}
    for measurement_id, edits in MEASUREMENT_EDITS:
        r = book.row_of('Properties', measurement_id)
        material_of[measurement_id] = book.get('Properties', r, 'MaterialID')
        for column, value in edits.items():
            book.set('Properties', measurement_id, column, value)

    for mid, edits in materials_edits(lambda k: keyed[k], lambda i: new_profiles[i]['ProfileID']).items():
        for column, value in edits.items():
            book.set('Materials', mid, column, value)

    for cid, (status, finding) in COVERAGE_EDITS.items():
        book.set('Coverage', cid, 'Status', status)
        book.set('Coverage', cid, 'Finding', finding)
    cov = next_id(book, 'Coverage', 'C', 5)
    for i, row in enumerate(coverage_new(material_of)):
        book.append('Coverage', {'CoverageID': cov(i), **row})

    set_method(book, *METHOD_ESTIMATES)
    for row in METHOD_NEW:
        book.append('Method', row)

    book.save(path)
    with open(HERE / 'changelog.csv', 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['sheet', 'record', 'cell', 'action', 'field', 'before', 'after'])
        w.writeheader()
        w.writerows(book.changes)
    counts = {}
    for c in book.changes:
        if c['action'] == 'Added':
            counts[c['sheet']] = counts.get(c['sheet'], 0) + 1
    print(f'{len(book.changes)} changes; rows added {counts}; SHA-256 now {hashlib.sha256(Path(path).read_bytes()).hexdigest()}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else str(HERE.parents[2] / 'data/H2C_FDM_Material_Database.xlsx'))
