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
