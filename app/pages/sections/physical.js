// Physical: density (a key figure, section 2), water absorption, melt flow, shrinkage and the other physical properties
// on file, each counted with the lowest and highest value as published and the way to its records. No figure: their
// test conditions differ from sheet to sheet, and none is compared.

import { esc, count } from '../html.js';
import { measuredIn } from '../../js/ui/material-facts.js';
import { emptyBody, otherProperties } from './common.js';

export default {
  id: 'physical',
  title: 'Physical',
  records: '#measurements-physical',
  render(c) {
    const mi = measuredIn(c, 'Physical');
    const other = otherProperties(c, 'Physical', new Set(), '#measurements-physical', { title: 'Physical properties on file' });
    if (!mi.rows.length) {
      return { empty: true, html: emptyBody(c, 'No physical value is on file for this material.', { anchor: '#measurements-physical' }) + other.html, stats: {} };
    }
    const products = new Set(mi.rows.map((x) => x.gradeId)).size;
    const lead = `${count(mi.rows.length, 'published physical value')} from ${count(products, 'product')}. Density is compared as a key figure; the others are counted here.`;
    return { empty: false, html: `<p class="lead">${esc(lead)}</p>${other.html}`, stats: {} };
  },
};
