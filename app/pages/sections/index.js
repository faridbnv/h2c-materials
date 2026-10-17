// The sections of a material's Overview, in reading order (docs/audits/2026-10-17-pages-reimagined/PLAN.md, "The
// pages"). Each is `{ id, title, render(c, env) → { html, empty, stats } }`: it draws from the material's facts
// (material-facts.js materialContext) and nothing else, and a section with nothing to say returns `empty` and leaves the
// page silently. The masthead (head, key figures, summary, On the H2C), the products hand-off and the footer are the
// frame's (track A); the rest are the words' (track B). A new section is a file here and a line in this list.

import masthead from './masthead.js';
import among from './among.js';
import mechanical from './mechanical.js';
import thermal from './thermal.js';
import printing from './printing.js';
import products from './products.js';
import uses from './uses.js';
import price from './price.js';
import other from './other.js';
import estimates from './estimates.js';
import sources from './sources.js';
import footer from './footer.js';

// What it is and its numbers; where it sits among the materials; how strong and stiff, how hot it can get; how to print
// it; which products; what it is used for and what makers warn about; its weight and cost; the rest as published; what
// is estimated; and where every number comes from.
export const SECTIONS = [masthead, among, mechanical, thermal, printing, products, uses, price, other, estimates, sources, footer];
