// The sections of a material page, in reading order. Each is `{ id, title, records?, render(c, env, place) → { html,
// empty, stats } }`: it draws from the material's facts (material-facts.js materialContext) and nothing else, and is
// always present; an empty one says so in one line with the recorded reason. The masthead and the footer have no title
// and are not numbered. A new section is a file here and a line in this list.

import masthead from './masthead.js';
import inShort from './in-short.js';
import keyFigures from './key-figures.js';
import printing from './printing.js';
import mechanical from './mechanical.js';
import thermal from './thermal.js';
import physical from './physical.js';
import environment from './environment.js';
import products from './products.js';
import makersSay from './makers-say.js';
import price from './price.js';
import estimates from './estimates.js';
import sources from './sources.js';
import footer from './footer.js';

export const SECTIONS = [masthead, inShort, keyFigures, printing, mechanical, thermal, physical, environment, products, makersSay, price, estimates, sources, footer];
