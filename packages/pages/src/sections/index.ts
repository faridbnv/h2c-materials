// The sections of a material's Overview, in reading order (docs/audits/2026-10-17-pages-reimagined/PLAN.md, "The
// pages"). Each is `{ id, title, render(c, env) → { html, empty, stats } }`: it draws from the material's facts
// (material-facts.js materialContext) and nothing else, and a section with nothing to say returns `empty` and leaves the
// page silently. The masthead (head, key figures, summary, On the H2C), the products hand-off and the footer are the
// frame's (track A); the rest are the words' (track B). A new section is a file here and a line in this list.

import type { Section } from './section.ts';
import masthead from './masthead.ts';
import among from './among.ts';
import mechanical from './mechanical.ts';
import thermal from './thermal.ts';
import printing from './printing.ts';
import products from './products.ts';
import uses from './uses.ts';
import price from './price.ts';
import other from './other.ts';
import estimates from './estimates.ts';
import sources from './sources.ts';
import footer from './footer.ts';

// What it is and its numbers; where it sits among the materials; how strong and stiff, how hot it can get; how to print
// it; which products; what it is used for and what makers warn about; its weight and cost; the rest as published; what
// is estimated; and where every number comes from.
export const SECTIONS: Section[] = [masthead, among, mechanical, thermal, printing, products, uses, price, other, estimates, sources, footer];
