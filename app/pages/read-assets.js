// Node only: reads what the pages' shared assets are made from, for render.js buildAssets, which is pure and reads no
// file itself. The build's stage 8 (app/pages/stage.js, step 3) and scripts/pages/render.mjs both read them here.
//
// The stylesheets, in the order buildAssets puts them: the shared tokens (app/css/tokens.css), the faces, the frame
// (frame.src.css, track A), the sections' (sections.src.css, track B), the figures' (figures.src.css, track C) and the
// Products page's (products.src.css, track A).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The faces embedded in assets/pages.css, from app/pages/assets/fonts (FONTS.md says where they come from). */
const FACES = [
  { family: 'Inter', style: 'normal', weight: '400 700', file: 'Inter-Variable.subset.woff2' },
  { family: 'Newsreader', style: 'normal', weight: '400 700', file: 'Newsreader-Variable.subset.woff2' },
  { family: 'Newsreader', style: 'italic', weight: '400 700', file: 'Newsreader-Italic-Variable.subset.woff2' },
];
const LICENCES = ['Inter-OFL.txt', 'Newsreader-OFL.txt'];

/** The assets' inputs, from a checkout's root. */
export function readAssets(projectRoot) {
  const at = (...p) => join(projectRoot, ...p);
  const read = (...p) => readFileSync(at(...p), 'utf8');
  const fonts = at('app/pages/assets/fonts');
  return {
    tokensCss: readFileSync(at('app/css/tokens.css'), 'utf8'),
    frameCss: read('app/pages/assets/frame.src.css'),
    sectionsCss: read('app/pages/assets/sections.src.css'),
    figuresCss: read('app/pages/assets/figures.src.css'),
    productsCss: read('app/pages/assets/products.src.css'),
    pageJs: readFileSync(at('app/pages/assets/page.js'), 'utf8'),
    productsJs: read('app/pages/assets/products.src.js'),
    fonts: FACES.map((f) => ({ ...f, base64: readFileSync(join(fonts, f.file)).toString('base64') })),
    licences: LICENCES.map((name) => [name, readFileSync(join(fonts, name), 'utf8')]),
  };
}
