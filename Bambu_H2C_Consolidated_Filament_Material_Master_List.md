# Bambu Lab H2C - Consolidated FDM Filament Material Master List

## Purpose

This document consolidates the filament/material research from this chat into a starting taxonomy for an FDM material database centered on a fully configured Bambu Lab H2C. It combines Bambu-named filament products and material families with additional material families discussed as theoretically compatible with the H2C hardware envelope.

The table is intentionally limited to three database-friendly fields: **abbreviation/name**, **full name**, and **category**. Bambu product variants are retained as separate entries where they represent distinct commercial filament formulations or useful database records.

## Search and consolidation method

The research was consolidated in three layers:

1. **Official Bambu H2C and Bambu filament documentation** - used to establish the core material families and Bambu filament names, including engineering and fiber-reinforced materials.
2. **Bambu AMS/AMS HT compatibility documentation and Bambu community references** - used to capture additional materials Bambu recognizes in its ecosystem, notably PP, POM, and HIPS, even when they are not emphasized in the H2C's headline material list.
3. **Theoretical H2C-compatible extensions discussed in this chat** - additional third-party FDM families were included when their typical processing requirements are plausibly within the H2C's extrusion, bed, chamber, and feed-path capabilities. These are not equivalent to official Bambu validation; individual formulations can still require special build surfaces, hardened nozzles, external spool feeding, drying, ventilation, or parameter tuning.

Names were normalized, obvious duplicates were merged where practical, and reinforced/ESD variants were kept separate because they can have materially different mechanical, thermal, abrasive, electrical, and processing behavior.

## Consolidated H2C Material List

| Abbreviation / Name | Full Name | Category |
|---|---|---|
| PLA | Polylactic Acid | PLA |
| PLA Basic | Polylactic Acid - Basic | PLA |
| PLA Matte | Polylactic Acid - Matte | PLA |
| PLA Lite | Polylactic Acid - Lite | PLA |
| PLA Basic Gradient | Polylactic Acid - Basic Gradient | PLA |
| PLA Tough+ | Polylactic Acid - Tough+ | PLA |
| PLA Translucent | Polylactic Acid - Translucent | PLA |
| PLA Silk | Polylactic Acid - Silk | PLA |
| PLA Silk+ | Polylactic Acid - Silk+ | PLA |
| PLA Silk Dual Color | Polylactic Acid - Silk Dual Color | PLA |
| PLA Metal | Polylactic Acid - Metal-Effect | PLA |
| PLA Marble | Polylactic Acid - Marble-Effect | PLA |
| PLA Sparkle | Polylactic Acid - Sparkle | PLA |
| PLA Wood | Polylactic Acid - Wood-Effect / Wood-Filled | PLA |
| PLA Galaxy | Polylactic Acid - Galaxy-Effect | PLA |
| PLA Glow | Polylactic Acid - Glow-in-the-Dark | PLA |
| PLA Aero | Lightweight / Foaming Polylactic Acid | PLA |
| PLA-CF | Carbon-Fiber-Reinforced Polylactic Acid | PLA |
| PLA-GF | Glass-Fiber-Reinforced Polylactic Acid | PLA |
| PETG | Polyethylene Terephthalate Glycol-Modified | PETG |
| PETG Basic | Polyethylene Terephthalate Glycol-Modified - Basic | PETG |
| PETG HF | Polyethylene Terephthalate Glycol-Modified - High Flow | PETG |
| PETG Translucent | Polyethylene Terephthalate Glycol-Modified - Translucent | PETG |
| PETG-CF | Carbon-Fiber-Reinforced PETG | PETG |
| PETG-GF | Glass-Fiber-Reinforced PETG | PETG |
| PETG-ESD | Electrostatic-Dissipative PETG | PETG |
| ABS | Acrylonitrile Butadiene Styrene | ABS |
| ABS-GF | Glass-Fiber-Reinforced Acrylonitrile Butadiene Styrene | ABS |
| ABS-CF | Carbon-Fiber-Reinforced Acrylonitrile Butadiene Styrene | ABS |
| ABS-ESD | Electrostatic-Dissipative Acrylonitrile Butadiene Styrene | ABS |
| ASA | Acrylonitrile Styrene Acrylate | ASA |
| ASA Aero | Lightweight / Foaming Acrylonitrile Styrene Acrylate | ASA |
| ASA-CF | Carbon-Fiber-Reinforced Acrylonitrile Styrene Acrylate | ASA |
| ASA-GF | Glass-Fiber-Reinforced Acrylonitrile Styrene Acrylate | ASA |
| PC | Polycarbonate | Polycarbonate |
| PC FR | Flame-Retardant Polycarbonate | Polycarbonate |
| PC-CF | Carbon-Fiber-Reinforced Polycarbonate | Polycarbonate |
| PC-GF | Glass-Fiber-Reinforced Polycarbonate | Polycarbonate |
| TPU | Thermoplastic Polyurethane | Flexible Elastomers |
| TPU for AMS | Thermoplastic Polyurethane for Automatic Material System | Flexible Elastomers |
| TPU 95A HF | Thermoplastic Polyurethane, Shore 95A - High Flow | Flexible Elastomers |
| TPU 90A | Thermoplastic Polyurethane, Shore 90A | Flexible Elastomers |
| TPU 85A | Thermoplastic Polyurethane, Shore 85A | Flexible Elastomers |
| TPE | Thermoplastic Elastomer | Flexible Elastomers |
| PEBA | Polyether Block Amide | Flexible Elastomers |
| TPC / TPEE | Thermoplastic Copolyester / Thermoplastic Polyester Elastomer | Flexible Elastomers |
| PA | Polyamide (Nylon) | Nylon / Polyamide |
| PAHT-CF | Carbon-Fiber-Reinforced High-Temperature Polyamide | Nylon / Polyamide |
| PA6 | Polyamide 6 (Nylon 6) | Nylon / Polyamide |
| PA6-CF | Carbon-Fiber-Reinforced Polyamide 6 | Nylon / Polyamide |
| PA6-GF | Glass-Fiber-Reinforced Polyamide 6 | Nylon / Polyamide |
| PA12 | Polyamide 12 (Nylon 12) | Nylon / Polyamide |
| PA12-CF | Carbon-Fiber-Reinforced Polyamide 12 | Nylon / Polyamide |
| PA12-GF | Glass-Fiber-Reinforced Polyamide 12 | Nylon / Polyamide |
| PA66 | Polyamide 66 (Nylon 66) | Nylon / Polyamide |
| PA66-CF | Carbon-Fiber-Reinforced Polyamide 66 | Nylon / Polyamide |
| PA6/66 | Polyamide 6/66 Copolymer (Nylon 6/66) | Nylon / Polyamide |
| PA612 | Polyamide 612 (Nylon 612) | Nylon / Polyamide |
| PA612-CF | Carbon-Fiber-Reinforced Polyamide 612 | Nylon / Polyamide |
| PA612-GF | Glass-Fiber-Reinforced Polyamide 612 | Nylon / Polyamide |
| CoPA | Copolyamide | Nylon / Polyamide |
| PA-CF | Carbon-Fiber-Reinforced Polyamide | Nylon / Polyamide |
| PA-GF | Glass-Fiber-Reinforced Polyamide | Nylon / Polyamide |
| PA-ESD | Electrostatic-Dissipative Polyamide | Nylon / Polyamide |
| PA612-ESD | Electrostatic-Dissipative Polyamide 612 | Nylon / Polyamide |
| PET | Polyethylene Terephthalate | PET Engineering |
| PET-CF | Carbon-Fiber-Reinforced Polyethylene Terephthalate | PET Engineering |
| PET-GF | Glass-Fiber-Reinforced Polyethylene Terephthalate | PET Engineering |
| PPA | Polyphthalamide | High-Performance Engineering |
| PPA-CF | Carbon-Fiber-Reinforced Polyphthalamide | High-Performance Engineering |
| PPA-GF | Glass-Fiber-Reinforced Polyphthalamide | High-Performance Engineering |
| PPS | Polyphenylene Sulfide | High-Performance Engineering |
| PPS-CF | Carbon-Fiber-Reinforced Polyphenylene Sulfide | High-Performance Engineering |
| PPS-GF | Glass-Fiber-Reinforced Polyphenylene Sulfide | High-Performance Engineering |
| PVA | Polyvinyl Alcohol | Support / Soluble |
| BVOH | Butenediol Vinyl Alcohol Copolymer | Support / Soluble |
| Support for PLA | Support Material for PLA | Support / Interface |
| Support for PLA/PETG | Support Material for PLA and PETG | Support / Interface |
| Support for ABS | Support Material for ABS | Support / Interface |
| Support for PA/PET | Support Material for PA and PET | Support / Interface |
| HIPS | High-Impact Polystyrene | Styrenics |
| PP | Polypropylene | Polyolefins |
| PP-CF | Carbon-Fiber-Reinforced Polypropylene | Polyolefins |
| PP-GF | Glass-Fiber-Reinforced Polypropylene | Polyolefins |
| PE | Polyethylene | Polyolefins |
| OBC | Olefin Block Copolymer | Polyolefins |
| POM / Acetal | Polyoxymethylene (Acetal) | Acetals |
| PCTG | Glycol-Modified Polycyclohexylenedimethylene Terephthalate | Copolyesters |
| CPE | Copolyester | Copolyesters |
| CPE-CF | Carbon-Fiber-Reinforced Copolyester | Copolyesters |
| CoPE | Copolyester | Copolyesters |
| nGen / Amphora | Amphora-Based Copolyester (nGen Family) | Copolyesters |
| PVB | Polyvinyl Butyral | PVB / Specialty Polymers |
| PC-ABS | Polycarbonate / Acrylonitrile Butadiene Styrene Blend | Polymer Blends |
| PC-PBT | Polycarbonate / Polybutylene Terephthalate Blend | Polymer Blends |
| PVDF | Polyvinylidene Fluoride | Fluoropolymers |

## Materials Discussed but Excluded from the H2C-Compatible Master List

These high-temperature polymers were discussed in the chat specifically as materials that should **not** be treated as normal H2C-capable filaments. Their typical processing requirements exceed one or more practical H2C temperature limits, especially nozzle, bed, or chamber temperature.

| Abbreviation / Name | Full Name | Category |
|---|---|---|
| PEEK | Polyether Ether Ketone | Industrial High-Temperature - Outside H2C Practical Envelope |
| PEKK | Polyether Ketone Ketone | Industrial High-Temperature - Outside H2C Practical Envelope |
| PEI / ULTEM | Polyetherimide | Industrial High-Temperature - Outside H2C Practical Envelope |
| PSU | Polysulfone | Industrial High-Temperature - Outside H2C Practical Envelope |
| PESU / PES | Polyethersulfone | Industrial High-Temperature - Outside H2C Practical Envelope |
| PPSU | Polyphenylsulfone | Industrial High-Temperature - Outside H2C Practical Envelope |

## Primary source types used in the chat

- Bambu Lab H2C technical specifications and material-support documentation
- Bambu Lab filament guides and product compatibility tables
- Bambu Lab AMS / AMS HT material compatibility documentation
- Bambu Lab Community Forum reports for H2C-specific or ecosystem-specific material use
- Third-party filament manufacturer processing guidance for theoretical compatibility checks

---

**Database note:** Inclusion in the consolidated table means the material was part of the H2C material discussion; it does not mean every brand or formulation is automatically safe, printable, or AMS-compatible. Material-specific verification should be performed when property data and print-process records are added to the database.