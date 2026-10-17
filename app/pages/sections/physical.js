// Physical properties: density (a key property, compared), then water absorption, melt flow, shrinkage and the other
// physical properties on file, each with how many products publish it and the lowest and highest value as published,
// and the way to its records. No figure: their test conditions differ from sheet to sheet, and none is compared.

import { measuredIn } from '../../js/ui/material-facts.js';
import { emptyBody, otherProperties, findingsBlock } from './common.js';
import { physicalFindings } from '../findings.js';

export default {
  id: 'physical',
  title: 'Physical properties',
  records: '#measurements-physical',
  render(c) {
    const mi = measuredIn(c, 'Physical');
    const other = otherProperties(c, 'Physical', new Set(), '#measurements-physical', { title: 'Physical properties on file' });
    if (!mi.rows.length) {
      return { empty: true, html: emptyBody(c, 'No physical value is on file for this material.', { anchor: '#measurements-physical' }) + other.html, stats: {} };
    }
    return { empty: false, html: `${findingsBlock(physicalFindings(c.m, other.list))}${other.html}`, stats: {} };
  },
};
