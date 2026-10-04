// b41: the manifest `ingest:witness --from` stages. Run from the project root with the fetched bytes in .b41tmp/.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const A = 'http://web.archive.org/web/';
const docs = [
  ['m064', `${A}20251115020229id_/https://www.3dxtech.com/products/3dxstat-esd-nylon-12`, 'X-3DXSTAT-ESD-PA12-TDS-v1', '3DXTECH', '3DXSTAT ESD PA12'],
  ['m103', `${A}20250917152246id_/https://www.3dxtech.com/products/hyperlite%E2%84%A2-pp`, 'X-Hyperlite-PP-TDS-v1', '3DXTECH', 'Hyperlite PP'],
  ['m119', `${A}20231002212720id_/https://www.3dxtech.com/product/3dxmax-pc-asa/`, 'X-ECOMAX-3DXMAX-PCASA-TDS-v3', '3DXTECH', '3DXMAX PC/ASA'],
  ['m120', `${A}20231002204210id_/https://www.3dxtech.com/product/3dxstat-esd-pvdf/`, 'X-ECOMAX-3DXSTAT-ESD-PVDF-v3-TDS', '3DXTECH', '3DXSTAT ESD-PVDF'],
  ['m124', `${A}20240528134142id_/https://www.3dxtech.com/product/3dxstat-esd-pps/`, 'X-ECOMAX-3DXSTAT-ESD-PPS-v3-TDS', '3DXTECH', '3DXSTAT ESD-PPS'],
  ['m128', `${A}20230603150315id_/https://www.3dxtech.com/product/carbonx-pc-abs-cf/`, 'X-ECOMAX-CarbonX-CF-PC-ABS-TDS-v1-1', '3DXTECH', 'CarbonX Carbon Fiber PC/ABS'],
  ['m132', `${A}20240813223834id_/https://flashforge.com/products/pbt-gf`, 'D-FLASH-PBT-GF-TDS-EN', 'Flashforge', 'PBT-GF'],
  ['m133', `${A}20251008152550id_/https://www.flashforge.com/products/flexible`, 'D-FLASH-PBAT-TDS-EN', 'Flashforge', 'Flexible'],
  ['m146', 'https://fillamentum.com/wp-content/uploads/2024/11/3D_PRINT_GUIDE_NONOILEN_8_2024.pdf', 'R-FILLAMENTUM-Technical-Data-Sheet-NonOilen-EN-03082020-FfN', 'Fillamentum', 'NonOilen'],
  ['m154', 'https://fillamentum.com/wp-content/uploads/2020/10/FI_Printing_Guide_Nylon_AF80_Aramid.pdf', 'R-FILLAMENTUM-Technical-Data-Sheet-Nylon-AF80-Aramid', 'Fillamentum', 'Nylon AF80 Aramid'],
];
const q = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const lines = ['file,url,doc,for,provider,manufacturer,product,sha256,accessed,by'];
for (const [n, url, src, prov, prod] of docs) {
  const sha = createHash('sha256').update(readFileSync(`.b41tmp/${n}.bin`)).digest('hex');
  lines.push([`${n}.bin`, url, '', src, prov, prov, prod, sha, '2026-10-04', 'Claude Sonnet (reader round b41)'].map(q).join(','));
}
writeFileSync('.b41tmp/manifest.csv', lines.join('\n') + '\n');
console.log(lines.join('\n'));
