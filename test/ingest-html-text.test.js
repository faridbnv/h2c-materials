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
