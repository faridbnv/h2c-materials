#!/usr/bin/env node
// Migration m34: source Titles that were not titles (D63). A Title is the document's own title as the publisher printed
// it. Seventy-eight sources carried something else: 22 shop pages had the page's <title> with the store's payment
// footer glued on ("... Ach Direct Debit Amazon American Express ..."), 40 Bambu Lab data sheets had a file-name stub
// ("B pla basic filament", "B PC"), 15 PDFs had an .xlsx or underscore file name, and one was "untitled".
//
// - The 22 pages were re-fetched on 2026-09-16 (curl); the Title is the page's <title>, which equals its og:title and
//   its main heading, with the store's " | 3DXTECH" suffix removed. Flashforge's <title> is a tagline ("High-Strength
//   PET-GF Filament for Industrial Applications"); its heading and og:title, "Flashforge PET-GF Filament", is the
//   product title. Access date and SHA-256 record the new fetch.
// - Every PDF was read from .cache/sources/ with its SHA-256 matched to sources.csv. A Bambu sheet prints "Bambu
//   Filament / Technical Data Sheet Vx.y / <product>", recorded as "Bambu Filament Technical Data Sheet - <product>"
//   (the wording R-BAMBU-SUPPORT-PLA-NEW-TDS already used); the version printed is checked against Revision. Two
//   sheets are titled for a product other than the one the source is filed under: the PLA Basic Gradient sheet (V2.0)
//   prints "PLA Basic", and the PLA Silk Dual Color sheet (V3.0) prints "PLA Silk"; the Title says what is printed.
// - Where the sheet prints a revision the Revision column lacked, it is filled (CarbonX CF PA12, FibreX PA12 GF30,
//   3DXSTAT ESD PA12: "Rev 1.0"; Polymaker HT-PLA-GF: V1.1; Fiberon PA612-CF15: V1.1; Fiberon PA612-ESD: V1.0; Fiberon PPS-GF20: V1.1).
//
// Every edit is guarded by the value it replaces; a re-run is a no-op, and a run after the data moved stops.
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm34';
const DATE = '2026-09-16';
const CHROME = ' Ach Direct Debit Amazon American Express Apple Pay Diners Club Discover Google Pay Mastercard Shop Pay Visa';

// Shop pages: [SourceID, old Title, new Title, old SHA-256, SHA-256 of the 2026-09-16 fetch].
export const PAGES = [
  ['S-PA12', `AMIDEX™ NYLON 12${CHROME}`, 'AMIDEX™ NYLON 12', '1d6825f9ff5c9e47747596704646a2ed9df298d44bf9ea3f89b9a6c83ac96361', '69602b5548f83fcbc2290e79b51a1021adefda667dccb0fbe1d1cbf6165eb064'],
  ['D-FLASH-PETGF', 'High-Strength PET-GF Filament for Industrial Applications Visa Discover Mastercard American Express PayPal Apple Pay Google Pay Klarna', 'Flashforge PET-GF Filament', '602c51559c49dc07d03be8d5c8b07a2ff15db5e70b781ea037a929fb38c6a4e4', '484b74dddee3da5a94bf6621a3aeedd635be4f83743c826d2c0e0f98eb350efb'],
  ['XP-ecomax-r-pla', `ECOMAX® PLA${CHROME}`, 'ECOMAX® PLA', '6fdedd7334ab958804a0da2aca18e7192fb4f29e81389e9fcb9104e2922d54cd', '9b21f17f9b11b4543aafd9198ae955ea3e38a24c0142d2a7c8c413b7392f858f'],
  ['XP-3dxstat-esd-petg-1', `3DXSTAT™ ESD-PETG${CHROME}`, '3DXSTAT™ ESD-PETG', '5f96006e9549765763228d1e69c6a7ed3b96dbfd1e0577fd69bdb298d1a20b8d', '10b66502cdb1fbc3463b2e6cb5c885a2c7e03c09b51d6aaa7a3fc18ba87ecbf5'],
  ['XP-carbonx-abs-cf-1', `CARBONX™ ABS+CF${CHROME}`, 'CARBONX™ ABS+CF', 'fe21927a61c094b6037140ac3b3b2340c24fbfe68a64c50aef21c7f052c073e1', 'f8b457f8d9270311692c0927c92b0b69e2cfe56920e543793651808ac92bb475'],
  ['XP-3dxstat-esd-abs-1', `3DXSTAT™ ESD-ABS${CHROME}`, '3DXSTAT™ ESD-ABS', '97afcaaeb4862230723475cae00a8c5f890c22db2cb715d3fbf35a38ae73ec54', 'e61960fe6d4f97867263dbd9eb11a1fc4b6286ee69eeab73e48ea34eb5dbcd0b'],
  ['XP-carbonx-pc-cf-1', `CARBONX™ PC+CF${CHROME}`, 'CARBONX™ PC+CF', '05ae1f022a1a2a4c9559ee0d66b801eea49bc6b45a0b258905320c7696ce4188', 'a488ecc931717aa82d9c8058275725980b95caafb0af67de2217480e4368b533'],
  ['XP-amidex-nylon-6-67', `AmideX Nylon 6-66 | 3DXTECH${CHROME}`, 'AmideX Nylon 6-66', 'd21b8e739e4dcb190728e7699e49b76846c931ebe5204c730d657c4b39861a5b', '84ab9bc06d3378d0e1464e3e3b13576bc7ea6dc32104baf21a2be7ae150c9391'],
  ['XP-carbonx-nylon-12-cf-1', `CARBONX™ NYLON 12+CF${CHROME}`, 'CARBONX™ NYLON 12+CF', '721a92f6c71af9e988217cbd94d5817d5b2305046bcb2d3f34dab55bf3a2cb20', '3c549529581c8ee387da14d02111765f6855cb6e5f25e117af66e1de711f436a'],
  ['XP-fibrex-nylon-12-gf30-1', `FIBREX™ NYLON 12+GF30${CHROME}`, 'FIBREX™ NYLON 12+GF30', 'c37c5fe2e6b48f92f66990c0f7a3632493ec9a72ddae0863c7f514a3fc5bf558', 'fb5938120ddceb5cfeb1345f7ebde3f477a2195e7f630e751b6d972a517c7a84'],
  ['XP-thermax-pps', `THERMAX™ PPS${CHROME}`, 'THERMAX™ PPS', '39ad51172025781779b786b50191398b2b6c0ff5feef4fb971ce75691e70d9a2', '17a34615ac529b6c9fba884368958fd04c6ab2c108350f431c780b3beedadb81'],
  ['XP-3dxmax-hips', `3DXMAX® HIPS${CHROME}`, '3DXMAX® HIPS', '091e525a0e18f115ce58766c545549b94d7b4af7693d510e4a476a476decccb3', '2f126775e23471dae7a501dbd6d1ba43a829d8ea6092bc9fb7b65e613ae02316'],
  ['XP-carbonx-pp-cf-1', `CARBONX™ PP+CF${CHROME}`, 'CARBONX™ PP+CF', 'f582ae748a63c4c0610cb118207e6a88f29e601fca2f4484cf90770ea7e1c47e', '92512529b727d51ca105ab3d662e32592e495fe28496e43aaa74d26b46a3cd2d'],
  ['XP-max-g-pctg-1', `MAX-G™ PCTG${CHROME}`, 'MAX-G™ PCTG', '1e525352e915d9db89595e2ff9248f0d642c1c7483502497face6c9e9d991efc', '54eea34e03c1704d424415775e81268b62a997240c12c07c53a06f2b9ebc1c93'],
  ['XP-3dxmaxa-r-pc-abs', `3DXMAX PC-ABS Filament | 3DXTECH${CHROME}`, '3DXMAX PC-ABS Filament', 'aabba449d5a6b6f5082e0577d984ca7bde7d39c2f7f006ff5508bb4b79089a77', '23162ca745d557749395e97fef6fcd81554c493ece6580e220a1e41f73675c91'],
  ['XP-fluorx-pvdf-1', `FluorX PVDF Filament | 3DXTECH${CHROME}`, 'FluorX PVDF Filament', '7f8742cbb0372c613573124217b5ade6bcc615b26a90c36278b4f37bb6bf38bb', '24c99f12f4a2a3ceee09aca914147aa5bde7f2fd4cabd2204d93bec43c1efd2a'],
  ['XP-thermax-peek-1', `THERMAX™ PEEK${CHROME}`, 'THERMAX™ PEEK', '6b75a32cb2be1a4e6cc1789d99b3ec24398cf692807ed43bd25a46c23e7a4040', 'aae2d4e991dbe1076139a0137ec132fd03ee1c98cd3e2894e9048deed42f0c0c'],
  ['XP-pekk-a', `THERMAX™ PEKK-A${CHROME}`, 'THERMAX™ PEKK-A', '1809548d47e2efc84bd2d2ef33296132bdc33556d53af0f0946b6ac53168f8c4', '80b51a7a322ad6f6f9d5f8eb2d51b176b3348768c14dc759150c70058b99107b'],
  ['XP-thermax-pei-1010', `THERMAX™ PEI 1010${CHROME}`, 'THERMAX™ PEI 1010', '8ced7cdde39163e1af20f9c3f01bdfae1f1e22b65a971a95678a4c7d0b6c3840', 'abca56b66176b1df23bbe123ae9eb3521d3a282caed591dffe9c4fc88fe7b945'],
  ['XP-thermax-psu-1', `THERMAX™ PSU${CHROME}`, 'THERMAX™ PSU', 'fbc10588eeaddbaf7f0bb6d042d87ee6a66790931961b3dae95c58b9125f76ed', '8b594b19c99e2e53ae4bad957de4b489638c307279725bd4546fae628280b166'],
  ['S-PES', `THERMAX™ PES${CHROME}`, 'THERMAX™ PES', '2dfa974686807903fe33318150adb1633191b7cc9dc468409283e568fe953716', '24d203ef2f3ffa6e8c0ccadbac8944605d099a6bb71c6210254d2e79aa905040'],
  ['XP-thermax-ppsu-1', `THERMAX™ PPSU${CHROME}`, 'THERMAX™ PPSU', 'e27a2733e0fc48077600d8a3681f69801620ffaa5e6d5ca09f892904a743c240', '75fc3ced8d1fbb556011c8a902e03aac265dc5aac6efb00d0f1383fe9513ab8c'],
];

// Bambu Lab sheets: [SourceID, old Title, product name as printed on p. 1, version printed on p. 1].
export const BAMBU = [
  ['B-pla-basic-filament-TDS', 'B pla basic filament', 'PLA Basic', 'V3.0'],
  ['B-pla-matte-TDS', 'B pla matte', 'PLA Matte', 'V3.0'],
  ['B-pla-basic-gradient-TDS', 'B pla basic gradient', 'PLA Basic', 'V2.0'],
  ['B-pla-tough-upgrade-TDS', 'B pla tough upgrade', 'PLA Tough+', 'V3.0'],
  ['B-pla-translucent-TDS', 'B pla translucent', 'PLA Translucent', 'V3.0'],
  ['B-pla-silk-upgrade-TDS', 'B pla silk upgrade', 'PLA Silk+', 'V1.0'],
  ['B-pla-silk-dual-color-TDS', 'B pla silk dual color', 'PLA Silk', 'V3.0'],
  ['B-pla-metal-TDS', 'B pla metal', 'PLA Metal', 'V3.0'],
  ['B-pla-marble-TDS', 'B pla marble', 'PLA Marble', 'V3.0'],
  ['B-pla-sparkle-TDS', 'B pla sparkle', 'PLA Sparkle', 'V1.0'],
  ['B-pla-wood-TDS', 'B pla wood', 'PLA Wood', 'V1.0'],
  ['B-pla-galaxy-TDS', 'B pla galaxy', 'PLA Galaxy', 'V1.0'],
  ['B-pla-glow-TDS', 'B pla glow', 'PLA Glow', 'V1.0'],
  ['B-pla-aero-TDS', 'B pla aero', 'PLA Aero', 'V4.0'],
  ['B-pla-cf-TDS', 'B pla cf', 'PLA-CF', 'V2.0'],
  ['B-petg-basic-TDS', 'B petg basic', 'PETG Basic', 'V3.0'],
  ['B-petg-hf-TDS', 'B petg hf', 'PETG HF', 'V1.0'],
  ['B-petg-translucent-TDS', 'B petg translucent', 'PETG Translucent', 'V1.0'],
  ['B-petg-cf-TDS', 'B petg cf', 'PETG-CF', 'V3.0'],
  ['B-abs-filament-TDS', 'B abs filament', 'ABS', 'V3.0'],
  ['B-abs-gf-TDS', 'B abs gf', 'ABS-GF', 'V1.0'],
  ['B-asa-filament-TDS', 'B asa filament', 'ASA', 'V3.0'],
  ['B-asa-aero-TDS', 'B asa aero', 'ASA Aero', 'V1.0'],
  ['B-asa-cf-TDS', 'B asa cf', 'ASA-CF', 'V1.0'],
  ['B-pc-fr-TDS', 'B pc fr', 'PC FR', 'V1.0'],
  ['B-tpu-for-ams-TDS', 'B tpu for ams', 'TPU for AMS', 'V1.0'],
  ['B-tpu-95a-hf-TDS', 'B tpu 95a hf', 'TPU 95A HF', 'V1.0'],
  ['B-paht-cf-TDS', 'B paht cf', 'PAHT-CF', 'V3.0'],
  ['B-pa6-cf-TDS', 'B pa6 cf', 'PA6-CF', 'V3.0'],
  ['B-pa6-gf-TDS', 'B pa6 gf', 'PA6-GF', 'V1.0'],
  ['B-pet-cf-TDS', 'B pet cf', 'PET-CF', 'V3.0'],
  ['B-ppa-cf-TDS', 'B ppa cf', 'PPA-CF', 'V1.0'],
  ['B-pps-cf-TDS', 'B pps cf', 'PPS-CF', 'V1.0'],
  ['B-pva-TDS', 'B pva', 'PVA', 'V1.0'],
  ['B-support-for-pla-petg-TDS', 'B support for pla petg', 'Support for PLA/PETG', 'V1.0'],
  ['B-support-for-abs-TDS', 'B support for abs', 'Support for ABS', 'V1.0'],
  ['B-support-for-pa-pet-TDS', 'B support for pa pet', 'Support for PA/PET', 'V1.0'],
  ['B-PC-TDS', 'B PC', 'PC', 'V2.0'],
  ['B-TPU-SOFT-TDS-4', 'B TPU SOFT', 'TPU 90A', 'V1.0'],
  ['B-TPU-SOFT-TDS-5', 'B TPU SOFT', 'TPU 85A', 'V1.0'],
];

// Other PDFs: [SourceID, old Title, new Title, [old Revision, new Revision]?].
export const PDFS = [
  ['S-PCGF-TDS-1', 'untitled', 'PC-GF FILAMENT: 3D Printing Filament · Siddament V2 Range · Technical Data Sheet'],
  ['S-POLYCN-Polymaker-HT-PLA-GF-TDS-EN-V1-1', 'Polymaker HT-PLA-GF.xlsx', 'Polymaker™ HT-PLA-GF Technical Data Sheet', ['Not published', 'V1.1']],
  ['S-POLYCN-PolyMax-PETG-ESD-TDS-V5-3', 'PolyMax_PETG-ESD_TDS_Template_V5.3', 'PolyMax™ PETG-ESD Technical Data Sheet'],
  ['S-FIBER-PA612', 'TDS_FIBERON PA612-CF15_V1.1_EN', 'Fiberon™ PA612-CF15 Technical Data Sheet', ['Not published', 'V1.1']],
  ['S-POLYCN-TDS-FIBERON-PA612-ESD-V1-0-EN-1', 'TDS_FIBERON PA612-ESD_V1.0_EN', 'Fiberon™ PA612-ESD Technical Data Sheet', ['Not published', 'V1.0']],
  ['S-FIBER-PPSGF-TDS-2', 'TDS_FIBERON PPS-GF20_V1.1', 'Fiberon™ PPS-GF20 Technical Data Sheet', ['Not published', 'V1.1']],
  ['X-AMIDEX-PA6-Copolymer-v1-0', 'UN_PA6_Copolymer_v1.0.xlsx', 'Technical Data Sheet: AmideX™ PA6 Copolymer 3D Printing Filament'],
  ['X-CarbonX-CF-PA12-TDS-v1', 'CF_PA12_v1.xlsx', 'CarbonX™ Carbon Fiber Nylon 12 (PA12) 3D Filament', ['Not published', 'Rev 1.0']],
  ['X-FIBREX-PA12-GF30-TDS-v1-0', 'GF30_PA12_v1.xlsx', 'FibreX™ Glass Fiber Reinforced Nylon 12 [PA12+GF30]', ['Not published', 'Rev 1.0']],
  ['X-3DXSTAT-ESD-PA12-TDS-v1', 'ESD_PA12_v1.xlsx', '3DXSTAT™ ESD-Safe Nylon 12 (PA12) 3D Filament', ['Not published', 'Rev 1.0']],
  ['X-Hyperlite-PP-TDS-v1', 'Hyperlite_PP_v1.xlsx', 'Technical Data Sheet: HyperLite™ PP 3D Printing Filament'],
  ['X-CarbonX-CF-PP-TDSv1', 'CF_PP_v1.xlsx', 'Technical Data Sheet: CarbonX™ PP+CF 3D Printing Filament'],
  ['X-FIBREX-GF-PP-TDS-v1', 'GF_PP_v1.xlsx', 'Technical Data Sheet: FibreX™ PP+GF30 3D Printing Filament'],
  ['X-MAXG-PCTG-TDS-v1-0', 'UN_PCTG_v1.0.xlsx', 'Technical Data Sheet: MAX-G™ PCTG 3D Printing Filament'],
  ['X-Thermax-PEKK-A-TDS-v2-1', 'UN_PEKK-A_v2.1.xlsx', 'Technical Data Sheet: ThermaX™ PEKK-A 3D Printing Filament'],
  ['X-Thermax-PEKK-C-TDS-v3-3', 'UN_PEKK-C_v3.3.xlsx', 'Technical Data Sheet: ThermaX™ PEKK-C 3D Printing Filament'],
];

/** Set Title from its expected old value; a row already at the new value is skipped (re-run). Returns true if edited. */
function retitle(t, id, from, to) {
  const row = t.get('sources', id);
  if (row.Title === to) return false;
  if (row.Title !== from) throw new Error(`${MIGRATION}: ${id} Title is "${row.Title}", expected "${from}"; the data moved since this correction was written`);
  t.set('sources', id, 'Title', to, { expect: from });
  return true;
}

export function migrate(t) {
  let changed = 0;
  for (const [id, from, to, oldSha, newSha] of PAGES) {
    if (!retitle(t, id, from, to)) continue;
    t.set('sources', id, 'SHA256', newSha, { expect: oldSha });
    t.set('sources', id, 'Access date', DATE);
    changed++;
  }
  for (const [id, from, product, version] of BAMBU) {
    const row = t.get('sources', id);
    if (row.Revision !== `Technical Data Sheet ${version}`) throw new Error(`${MIGRATION}: ${id} Revision is "${row.Revision}" but p. 1 prints "Technical Data Sheet ${version}"`);
    if (retitle(t, id, from, `Bambu Filament Technical Data Sheet - ${product}`)) changed++;
  }
  for (const [id, from, to, revision] of PDFS) {
    if (retitle(t, id, from, to)) changed++;
    if (revision) {
      const [was, now] = revision;
      if (t.get('sources', id).Revision !== now) { t.set('sources', id, 'Revision', now, { expect: was }); changed++; }
    }
  }
  return changed;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  const n = migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record} ${c.field ?? ''}: ${c.before} -> ${c.after}`);
  console.log(`${MIGRATION}: ${n} source(s) changed`);
}
