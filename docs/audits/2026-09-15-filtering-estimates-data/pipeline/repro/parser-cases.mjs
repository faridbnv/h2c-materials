const ROOT = decodeURIComponent(new URL('../../../../../', import.meta.url).pathname);
import { parseHdtStandard } from '../../../../../build/src/normalize/thermal.js';
for (const t of ['ASTM D648, 264 psi','ASTM D648 @ 66 psi','ASTM D648, 18.6 kg/cm²','ISO 75-2/Af','ISO 75-2 Bf','ASTM D648 1.8MPa/0.45MPa','ISO 75, 1.8 & 0.45 MPa','ISO 10.45','ISO 75: Method A (0.45 MPa)'])
  { const p = parseHdtStandard(t); console.log(JSON.stringify(t), '=>', p.standard, p.loadMPa ?? 'unstated'); }
