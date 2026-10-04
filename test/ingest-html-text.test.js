import test from 'node:test';
import assert from 'node:assert/strict';
import {pageLinesFromHtml} from '../scripts/lib/html-text.mjs';
test('nested maker paragraphs survive long wrappers, with headings and table columns',()=>{
 const statement='This exact product does not require a heated chamber. '+ 'Published context. '.repeat(30);
 const html=`<div><div><h2>Printing</h2><p>${statement}</p><div><p>Enclosure <strong>not required</strong>.</p></div></div><table><tr><th>Chamber</th><td>40–60 °C</td></tr></table><script><p>Invented 999 °C</p></script></div>`;
 const lines=pageLinesFromHtml(html);
 assert.equal(lines.filter(l=>l.text===statement.trim()).length,1);
 assert.equal(lines.find(l=>l.text===statement.trim()).heading,'Printing');
 assert.equal(lines.filter(l=>l.text==='Enclosure not required .').length,1);
 assert.deepEqual(lines.find(l=>l.text.includes('40–60')).spans.map(s=>s.str),['Chamber','40–60 °C']);
 assert.ok(!lines.some(l=>l.text.includes('999')));
});

test('literal and escaped numerical bounds survive source table markup',()=>{
 const lines=pageLinesFromHtml('<table><tr><td>Water absorption</td><td>< 1</td><td>%</td><td>after 24h of submersion</td></tr><tr><td>Strain</td><td>&lt;50</td><td>%</td></tr></table><p>Keep below < 80 °C.</p>');
 assert.deepEqual(lines[0].spans.map(s=>s.str),['Water absorption','< 1','%','after 24h of submersion']);
 assert.deepEqual(lines[1].spans.map(s=>s.str),['Strain','<50','%']);
 assert.equal(lines[2].text,'Keep below < 80 °C.');
});

test('standalone specimen context spans survive, inline spans appear only once',()=>{
 const context='Test performed at 50mm/min on ISO 3167 A test specimens';
 const lines=pageLinesFromHtml(`<div class="tensile-data" id="tensile-data-0" style="display:block"><span>${context}</span><table><tr><td>Modulus</td><td>3800</td><td>MPa</td></tr></table></div><p>Use <span>dry filament</span>.</p><div class="wrapper-with-a-long-attribute-for-a-short-child"><span>One instruction</span></div>`);
 assert.equal(lines.filter(l=>l.text===context).length,1);
 assert.ok(lines.findIndex(l=>l.text===context)<lines.findIndex(l=>l.text.includes('3800')));
 assert.equal(lines.filter(l=>l.text==='Use dry filament .').length,1);
 assert.ok(!lines.some(l=>l.text==='dry filament'));
 assert.equal(lines.filter(l=>l.text==='One instruction').length,1);
});

test('standalone table-body specimen statements stay beside their own rows',()=>{
 const context='Test performed at 1mm/min on 3D printed test specimins successively at 45° and -45° per layer.';
 const lines=pageLinesFromHtml(`<h2>Tensile</h2><table><caption>Own test table</caption><tbody><span>${context}</span><tr><td>Young’s modulus</td><td><span>4150</span></td><td>MPa</td></tr><p>Temperature not stated</p><tr><td>Strength</td><td>50</td><td>MPa</td></tr></tbody></table>`);
 assert.deepEqual(lines.map(l=>l.text),['Tensile','Own test table',context,'Young’s modulus  4150  MPa','Temperature not stated','Strength  50  MPa']);
 assert.equal(lines.filter(l=>l.text===context).length,1);
 assert.ok(!lines.some(l=>l.text==='4150'));
 assert.deepEqual(lines[3].spans.map(s=>s.str),['Young’s modulus','4150','MPa']);
});

test('table caption inline children are not repeated as extra context',()=>{
 const lines=pageLinesFromHtml('<table><caption>Testing <strong>dry</strong> material</caption><tr><td>Modulus</td><td>2000</td></tr><span>After <strong>annealing</strong></span></table>');
 assert.deepEqual(lines.map(l=>l.text),['Testing dry material','Modulus  2000','After annealing']);
});

test('a div spec grid is read as label/value rows, a heading above it stays a heading, a colon label stays one sentence',()=>{
 const row=(l,v,c='')=>`<div class="spec"><span class="${c}label">${l}</span><span class="${c}value">${v}</span></div>`;
 const lines=pageLinesFromHtml(`<h2>Printing</h2><div class="specs">${row('Nozzle temperature','200-230°C')}${row('Bed temperature','60 &deg;C')}${row('Drying','80 °C, 4 h')}<p>Print slowly.</p></div><div>${row('Nozzle Specs:','hardened steel')}${row('Bed:','glass')}${row('Fan:','off')}</div>`);
 assert.deepEqual(lines.slice(0,5).map(l=>l.spans.map(s=>s.str)),[['Printing'],['Nozzle temperature','200-230°C'],['Bed temperature','60 °C'],['Drying','80 °C, 4 h'],['Print slowly.']]);
 assert.equal(lines[1].heading,'Printing');
 assert.deepEqual(lines[5].spans.map(s=>s.str),['Nozzle Specs: hardened steel']);
});

test('a value drawn before its label is turned round by the class names; two pairs are not a grid',()=>{
 const pair=(a,b,ca='',cb='')=>`<div><span class="${ca}">${a}</span><span class="${cb}">${b}</span></div>`;
 const lines=pageLinesFromHtml(`<section>${pair('250 °C','Nozzle','spec-value','spec-label')}${pair('80 °C','Bed','spec-value','spec-label')}${pair('4 h','Drying','spec-value','spec-label')}</section><nav>${pair('Home','3')}${pair('Shop','9')}</nav>`);
 assert.deepEqual(lines.slice(0,3).map(l=>l.spans.map(s=>s.str)),[['Nozzle','250 °C'],['Bed','80 °C'],['Drying','4 h']]);
 assert.deepEqual(lines.slice(3).map(l=>l.text),['Home 3','Shop 9']);
});

test('dl/dt/dd is a two-cell line per term, a second definition joins the first',()=>{
 const lines=pageLinesFromHtml('<dl><dt>Density</dt><dd>1.24 g/cm³</dd><dt>Glass transition</dt><dd>60 °C</dd><dd>(DSC)</dd></dl>');
 assert.deepEqual(lines.map(l=>l.spans.map(s=>s.str)),[['Density','1.24 g/cm³'],['Glass transition','60 °C; (DSC)']]);
});

test('colspan and rowspan keep the cells beside a merged cell in their column and do not repeat the merged text',()=>{
 const lines=pageLinesFromHtml('<table><tr><th rowspan="2">Tensile</th><td>Modulus</td><td>3000</td></tr><tr><td>Strength</td><td>50</td></tr><tr><th colspan="2">Dry</th><td>9</td></tr><tr><td>a</td><td colspan="3">b</td></tr></table>');
 assert.deepEqual(lines.map(l=>l.spans.map(s=>s.str)),[['Tensile','Modulus','3000'],['','Strength','50'],['Dry','','9'],['a','b']]);
 assert.deepEqual(lines[1].spans.map(s=>s.x),[60,180,300]);
});

test('JSON-LD Product data is read under its own heading, description markup and entities included, offers ignored',()=>{
 const ld=JSON.stringify({'@context':'https://schema.org','@type':'Product',name:'PA12 CF',description:'<p>Print at 260-280°C.</p><p>Dry 80 &deg;C for 6 h.</p>',offers:{'@type':'Offer',price:'99.99',priceCurrency:'CAD'},additionalProperty:[{'@type':'PropertyValue',name:'Density',value:'1.2',unitText:'g/cm3'}]});
 const lines=pageLinesFromHtml(`<p>Visible page.</p><script type="application/ld+json">${ld}</script>`);
 const at=lines.findIndex(l=>l.text==='Product data (structured)');
 assert.ok(at>0);
 assert.deepEqual(lines.slice(at+1).map(l=>l.text),['PA12 CF','Print at 260-280°C.','Dry 80 °C for 6 h.','Density  1.2 g/cm3']);
 assert.ok(lines.slice(at).every(l=>l.heading==='Product data (structured)'));
 assert.ok(!lines.some(l=>/99\.99/.test(l.text)));
});

test('a Shopify product JSON and a body_html literal are read; what the page already prints is not repeated',()=>{
 const description='<p>Nozzle: 250°C</p><table><tr><td>MFR</td><td>12 g/10 min</td></tr></table><p>Already on the page, word for word.</p>';
 const shop=JSON.stringify({product:{id:1,handle:'x',title:'Facilan HT',description}});
 const lines=pageLinesFromHtml(`<p>Already on the page, word for word.</p><script type="application/json" data-product-json>${shop}</script><script>var meta={"body_html":${JSON.stringify('<p>From a script variable, with 3 mm walls.</p>')}};</script>`);
 const at=lines.findIndex(l=>l.text==='Product data (structured)');
 assert.deepEqual(lines.slice(at+1).map(l=>l.text),['Facilan HT','Nozzle: 250°C','MFR  12 g/10 min','From a script variable, with 3 mm walls.']);
 assert.equal(lines.filter(l=>l.text==='Already on the page, word for word.').length,1);
});

test('__NEXT_DATA__ descriptions of a product object are read, other strings in it are not; a page with no data adds nothing',()=>{
 const next=JSON.stringify({props:{pageProps:{product:{sku:'A1',name:'PETG',description:'Glycol modified PET, print at 230-250 °C.'},i18n:{description:'Create your account today, it is free.'}}}});
 const lines=pageLinesFromHtml(`<script id="__NEXT_DATA__" type="application/json">${next}</script>`);
 assert.deepEqual(lines.map(l=>l.text),['Product data (structured)','PETG','Glycol modified PET, print at 230-250 °C.']);
 assert.deepEqual(pageLinesFromHtml('<p>Plain.</p>').map(l=>l.text),['Plain.']);
});

test('the capture script that opens tabs and accordions is valid script',async()=>{
 const {EXPAND_SCRIPT}=await import('../scripts/ingest/capture.mjs');
 assert.doesNotThrow(()=>new Function(`return ${EXPAND_SCRIPT}`));
});
