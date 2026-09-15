const ROOT = decodeURIComponent(new URL('../../../../../', import.meta.url).pathname);
import { readCsv } from '../../../../../build/src/csv.js';
import { normalizeDirection } from '../../../../../build/src/normalize/direction.js';
const vocab = readCsv((ROOT + 'schema/vocab/directions.csv')).records.map(r=>r.values.Value);
console.log('vocab values with no direction.js mapping:', vocab.filter(v=>!normalizeDirection(v).mapped));
const rows = readCsv((ROOT + 'data/tables/measurements.csv')).records.map(r=>r.values);
const mech = new Set(readCsv((ROOT + 'data/tables/properties.csv')).records.map(r=>r.values).filter(p=>p.Domain==='mechanical').map(p=>p.Property));
const na = rows.filter(r=>mech.has(r.Property) && /^Published value/.test(r['Data status']) && r.Direction==='Not applicable');
console.log(`${na.length} published mechanical rows with Direction "Not applicable":`); for (const r of na) console.log(' ', r.MeasurementID, r.Property, r['Specimen type'].slice(0,30), '|', r.Locator.slice(0,60));
