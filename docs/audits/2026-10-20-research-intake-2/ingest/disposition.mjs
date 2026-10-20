// What became of every finding of the second research package (research intake 2, 2026-10-20): applied (the stage and the
// migration), already in the data, superseded, or left (with why). Writes archive/research-2026-10-20/disposition.csv and a
// copy of the package's handoffs.
//
//   node docs/audits/2026-10-20-research-intake-2/ingest/disposition.mjs --package <research package folder>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readCsv, csvText } from '../../../../build/src/csv.js';

const at = process.argv.indexOf('--package');
if (at < 0) { console.error('usage: disposition.mjs --package <folder>'); process.exit(2); }
const PACKAGE = resolve(process.argv[at + 1]);
const OUT = 'archive/research-2026-10-20';
const rows = (p) => readCsv(p).records.map((r) => r.values);
const findings = rows(join(PACKAGE, 'output/findings.csv'));

const A = (stage, why) => ({ Disposition: 'applied', Stage: stage, Why: why });
const D = (why) => ({ Disposition: 'already-in-data', Stage: '', Why: why });
const L = (why) => ({ Disposition: 'left', Stage: '', Why: why });
const S = (why) => ({ Disposition: 'superseded', Stage: '', Why: why });
const BY_ID = {
  'F-0001': A('stage 4, m490', 'Extrudr DURAPRO PC FR V0 (G035-11) filed under PC FR with moveGrade; PC FR gains a page.'),
  'F-0002': L('INNOVATEFIL PP GF\'s current shop page is not captured and its sheet prints dashes; held (OPEN-PROBLEMS §39.2).'),
  'F-0003': A('stages 2 and 3, m488, m489', 'Kexcelled THE K8 OBC (G086-03) admitted with its data sheet; OBC gains a page.'),
  'F-0004': A('stages 2 and 3, m488, m489', 'Filamentive Hemp PLA (G152-03) admitted with its sheet and store page; PLA-NF gains a page. Its "3.8 MPa" flexural modulus is flagged implausible (m489).'),
  'F-0005': A('stages 2 and 3, m488, m489, m491', 'QIDI PPS-GF20 (G074-03) admitted with its page and recipe; its figures reprint Fiberon PPS-GF20\'s annealed table, recorded once as its twin (m491); PPS-GF gains a page.'),
  'F-0006': A('stages 2 and 3, m488, m489', 'Forward AM Ultrafuse PP GF30 (G084-03) admitted with its extended sheet; the tensile conditioning footnote kept on the tensile rows alone; PP-GF gains a page.'),
  'F-0007': L('INTAMSYS PPS\'s exact variant is not on sale; no grade.'),
  'F-0034': L('LEHVOSS 9936 BK/L is unreinforced where the held 9936 BK is ceramic-filled: identity unresolved, not entered.'),
  'F-0035': A('stages 2 and 3, m488, m489', 'AzureFilm\'s own ASA sheet (05.24) registered beside the held 3DJake-hosted one; its 100 % infill XY, XZ and ZX values entered; the ZX yield "0.0" left out.'),
  'F-0036': L('AzureFilm ABS+ is not established as the held ABS product; not entered.'),
  'F-0037': A('stage 3, m489', 'COC flex\'s thermal conductivity and nozzle window entered; its "below –90 °C" glass transition left held (the raw text reads no number).'),
  'F-0038': A('stage 3, m489', 'Conductive PLA\'s three volume resistivities entered; its melting onset ("approx. 155 deg C") left held as a prose claim.'),
  'F-0039': A('stage 3, m489', 'Nanovia PC-PTFE\'s 38 MPa tensile strength entered, its raster at 0° typed as no usable direction.'),
  'F-0040': A('stages 2 and 3, m488, m489', 'Sakata 3D PA-NT (G164-12) admitted; HTA3D is a Spanish shop, so no Canadian price.'),
  'F-0041': A('stages 2 and 3, m488, m489', 'Sakata 3D PA-CF15 (G165-07) admitted, its dry-as-moulded values as raw material values.'),
  'F-0042': L('Sakata PA-GF20-FR: stock to confirm before a product enters.'),
  'F-0043': L('Bambu Lab\'s support SDS lists TPU and a PETG copolymer where the held sheet says PLA: a conflict filed (OPEN-PROBLEMS §33.4); the product keeps its home.'),
  'F-0044': A('stages 2 and 3, m488, m489, m491', 'The QIDI page reused for F-0005, no duplicate source.'),
  'F-0045': L('IIIDMAX PA6/66-CF15 is an archived page: current stock not established.'),
  'F-0139': A('stage 3, m489', 'LEHVOSS\'s "no temperature-controlled chamber" typed by hand; CN07 counts 11 makers and stays reported (m493).'),
  'F-0140': A('stages 3 and 5, m489, m493', 'AzureFilm\'s "can be printed without an enclosed printer": no enclosure needed (D168); the 19th ASA maker.'),
  'F-0141': A('stages 3 and 5, m489, m493', 'Prusa\'s enclosure recommendation: an enclosure asked for (D93); the 20th ASA maker; CN02 decides.'),
  'F-0142': L('Fillamentum\'s ASA wording is ambiguous on the chamber: not counted.'),
  'F-0144': A('stage 3, m489', 'Raise3D PA12 CF "without the heating chamber" on its RMF 500: no heated chamber needed; nylon counts 18 makers, 2 above (CN10 reported).'),
  'F-0145': A('stage 3, m489, m491', 'Raise3D PA12 CF\'s as-printed 90 °C at 0.45 MPa and its annealed figures entered; the data sheet\'s unlabelled copies retired beside them.'),
  'F-0146': A('stage 3, m489', 'PolyMide PA12-CF\'s conditional drying entered as optional, 80 °C for 12 h.'),
  'F-0147': A('stage 3, m489', 'PolyMide PA12-CF\'s as-printed figures entered; its annealed ones are held from its data sheet, whose schedule differs (OPEN-PROBLEMS).'),
  'F-0152': L('colorFabb PA-CF\'s chamber wording is ambiguous: not counted.'),
  'F-0170': D('eTwinkling\'s drying stays unknown: the manual\'s dash is no instruction.'),
  'F-0311': A('stage 3, m489', 'Braskem FL900PP-CF\'s "no drying needed" typed on both its profiles.'),
  'F-0605': A('stage 3, m489', 'Eryone PLA-CF\'s 15 % carbon fibre entered from its own page.'),
  'F-0606': A('stage 3, m489', 'MatterHackers PRO Series PA CF\'s 20 % entered from its page.'),
  'F-0607': D('Extrudr ASA-CF\'s 12 % by volume is already in its grade\'s words; a volume fraction is not a load by weight.'),
  'F-0608': A('stage 3, m489', 'eSUN ePLA-CF\'s 15-20 % entered from its archived SDS.'),
  'F-0609': A('stage 4, m490', 'Essentium PA-CF (G165-05) filed under PA6/66-CF on its SDS\'s "Polyamide (PA 6/66)".'),
  'F-0678': A('stage 4, m490', 'PolyTerra PLA\'s later name, Panchroma Matte PLA, recorded in its grade\'s words.'),
  'F-0679': L('Whether Polymaker PLA Pro and PolySonic PLA Pro 6.0 are one product stays the owner\'s call (OPEN-PROBLEMS §31.12); the current pages\' links are recorded there.'),
  'F-0680': A('stages 2 and 3, m488, m489', 'Fiberlogy R PP\'s 2025 sheet registered; its 40 °C heat deflection at 1.8 MPa entered beside the page\'s 0.45 MPa label (OPEN-PROBLEMS §39.1); its other figures are held from the product page already.'),
  'F-0681': D('Flashforge PET-GF\'s 30 % and the sheet\'s 15 % are both held, the conflict filed (OPEN-PROBLEMS).'),
  'F-0682': L('An XT-CF20 identity lead; the sheet is registered (G090-03), no change.'),
  'F-0683': S('Electrifi\'s home was decided by D176 (M176).'),
  'F-0684': S('Diran 410MF07\'s home was decided by D176 (M177).'),
  'F-0685': L('nGen AM3300\'s producer density: polymers.csv is frozen (D58, D138); filed (OPEN-PROBLEMS §38.4).'),
  'F-0686': L('The BVOH producer SDS gives no density method, and its reference PVA interval is not the named grade\'s; polymers.csv is frozen; filed (OPEN-PROBLEMS §38.5).'),
  'F-0709': L('GreenyHT\'s page served a password wall: needs capture.'),
  'F-0820': D('ESD-PETG\'s 260-280 °C is held already (P1847).'),
};
const SAME_BYTES = new Set(['F-0824', 'F-0830', 'F-0838', 'F-0868', 'F-0871']);
const byOutcome = (f) => {
  if (SAME_BYTES.has(f.finding_id)) return D('The copy is byte for byte a source the database already registers.');
  if (f.task_id === 'T10' && f.outcome === 'FOUND-NEW') return L('A copy whose bytes differ from the held original, with no edition established: kept by the package, not registered (D131, D171); no link repointed (OPEN-PROBLEMS §34.6, §37.12).');
  switch (f.outcome) {
    case 'NOT-FOUND-SEARCHED': return L('A scoped search that found nothing (searches.csv in the package).');
    case 'CONFIRMED-AS-RECORDED': return D('The page confirms the held record.');
    case 'NEEDS-MAKER': return L('A question only the maker can answer; the owner sends no maker emails (2026-10-05): the handoff is kept beside this file.');
    case 'NEEDS-OWNER': return L('A question for the owner, filed in OPEN-PROBLEMS.');
    case 'NEEDS-CAPTURE': return L('A page that needs a browser capture first.');
    case 'AMBIGUOUS-ON-PAGE': return L('The page\'s words do not settle it; not entered.');
    default: return L('Left by the triage (ingest/intake.mjs says why for each reading).');
  }
};
const out = findings.map((f) => ({ FindingID: f.finding_id, Task: f.task_id, Target: `${f.target_type} ${f.target_id}`, Outcome: f.outcome, ...(BY_ID[f.finding_id] ?? byOutcome(f)) }));
for (const id of Object.keys(BY_ID)) if (!findings.some((f) => f.finding_id === id)) throw new Error(`${id}: not a finding`);
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'disposition.csv'), csvText(['FindingID', 'Task', 'Target', 'Outcome', 'Disposition', 'Stage', 'Why'], out));
writeFileSync(join(OUT, 'handoffs.csv'), readFileSync(join(PACKAGE, 'output/handoffs.csv')));
const count = {}; for (const r of out) count[r.Disposition] = (count[r.Disposition] ?? 0) + 1;
console.log(JSON.stringify({ findings: out.length, ...count }));
