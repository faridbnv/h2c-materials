// Targeted b38: the held PET-G sheet's HDT at 0.45 MPa. Codex AI agent, 2026-09-28.
// The source's glyph map is broken and the first OCR reads 68 as 63. The original page image was visually
// read as 68.0 °C. A second optical pass on thresholded page images reproduces that reading without altering
// source bytes or weakening the import guard. All other proposed rows are rejected outside this target.
import { readFileSync, writeFileSync, cpSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { locate } from '../../../../../scripts/data/source-store.mjs';
import { sha256, documentText, cacheDir, numberOnPage } from '../../../../../scripts/lib/pdf-text.mjs';
import { pageImages } from '../../../../../scripts/ingest/ocr.mjs';
import { PROPOSALS } from '../../../../../scripts/ingest/context.mjs';
const sha='9cb0b12cb848a735875ffac3e8b059902bc6d7c12584d3d6414d8d9d4558eb38';
const found=locate(sha,'');if(found.bytes!=='present')throw new Error('b38: original bytes unavailable');
const pages=pageImages(found.path,sha),dir=mkdtempSync(join(tmpdir(),'h2c-b38-'));
execFileSync('python3',['-c',`from PIL import Image
from pathlib import Path
import sys
pages=[]
for p in sorted(Path(sys.argv[1]).glob('p-*.png')):
 im=Image.open(p).convert('L').resize((3307,4678))
 pages.append(im.point(lambda v:255 if v>230 else 0).convert('RGB'))
pages[0].save(sys.argv[2],save_all=True,append_images=pages[1:],resolution=400)`,pages,join(dir,'threshold.pdf')]);
const copy=cacheDir('ocr',`${sha}.pdf`);
execFileSync('ocrmypdf',['--force-ocr','--quiet','--tesseract-pagesegmode','6','--language','eng','--output-type','pdf',join(dir,'threshold.pdf'),copy]);
const text=await documentText(readFileSync(copy),{sha,refresh:true});
if(!numberOnPage(text,1,'68'))throw new Error('b38: improved optical pass still cannot read 68; stop');
writeFileSync(cacheDir('text',`${sha}.json`),JSON.stringify({...text,ocr:{tool:'ocrmypdf; b38 threshold 230/255, 400 dpi, PSM 6',copy:sha256(readFileSync(copy)),date:'2026-09-28'}}));
const path=join(PROPOSALS,'b38',`${sha.slice(0,16)}.json`),p=JSON.parse(readFileSync(path));
const sid='X-RECREUS-PET-G-TDS-2023';
const by='Codex AI agent, 2026-09-28';
p.review={status:'reviewed',by,note:'Exact PET-G grade G020-70 from the printed title/footer. HDT row read visually against original p. 1; scope is heat-deflection target only.'};
Object.assign(p.source.row,{SourceID:sid,Revision:'26.09.2023','Publication date':'2023-09-26','Source note':'Held manufacturer sheet, retrieved before this campaign; 2023 revision re-read for G020-70. Broken glyph map: optical reading and original page image preserved. Prior 2020 source stays registered.'});
p.source.review={status:'accepted',by,visual:true};
for(const g of p.grades){g.row.SourceID=sid;g.review={status:'accepted',by,visual:true,note:'Maps to existing PET-G G020-70; no new grade or formulation assumed.'};}
for(const r of [...p.measurements,...p.profiles])r.review={status:'rejected',by,note:'Outside this targeted heat-deflection intake, or an erroneous optical reading; retained in proposal, not entered.'};
const base=p.measurements.find((r)=>r.row.Property==='HDT');
if(!p.measurements.some((r)=>r.id==='hdt045-reviewed'))p.measurements.push({id:'hdt045-reviewed',gradeKey:'main',row:{...base.row,SourceID:sid,'Raw value':'68,0 °C','Raw numeric':'68','Normalized value':'68','Standard / load':'HDT (0,45MPa); ISO 75-2',Standards:'ISO 75','Test load MPa':'0.45',Locator:'p. 1: HDT (0,45MPa) 68,0 °C ISO 75-2',Notes:'Specimen, direction, moisture and post-processing are not stated. Source spelling and row read against original image; no printed-coupon assumption.', 'Parse review':'Not applicable'},evidence:{page:1,text:'HDT (0,45MPa) 68,0 °C ISO 75-2',ocr:true},review:{status:'accepted',by,visual:'Original p. 1 thermal table visually checked: 68,0 °C under 0,45 MPa, ISO 75-2; optical value confirmed after contrast pass.'}});
writeFileSync(path,JSON.stringify(p,null,2)+'\n');
console.log('b38: exact PET-G revision and one visual/optically bound HDT row reviewed');
