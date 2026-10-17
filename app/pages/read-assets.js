// Node only: reads what the pages' shared assets are made from, for render.js buildAssets, which is pure and reads no
// file itself. The build's stage 8 (app/pages/stage.js, step 3) and scripts/pages/render.mjs both read them here.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The faces embedded in assets/pages.css, from app/pages/assets/fonts (FONTS.md says where they come from). */
const FACES = [
  { family: 'Inter', style: 'normal', weight: '400 700', file: 'Inter-Variable.subset.woff2' },
  { family: 'Newsreader', style: 'normal', weight: '400 700', file: 'Newsreader-Variable.subset.woff2' },
  { family: 'Newsreader', style: 'italic', weight: '400 700', file: 'Newsreader-Italic-Variable.subset.woff2' },
];
const LICENCES = ['Inter-OFL.txt', 'Newsreader-OFL.txt'];

/** The assets' inputs, from a checkout's root: { tokensCss, pagesCss, pageJs, tablesCss, tablesJs, fonts, licences }. */
export function readAssets(projectRoot) {
  const at = (...p) => join(projectRoot, ...p);
  const fonts = at('app/pages/assets/fonts');
  return {
    tokensCss: readFileSync(at('app/css/tokens.css'), 'utf8'),
    pagesCss: readFileSync(at('app/pages/assets/pages.src.css'), 'utf8'),
    pageJs: readFileSync(at('app/pages/assets/page.js'), 'utf8'),
    tablesCss: readFileSync(at('app/pages/assets/tables.src.css'), 'utf8'),
    tablesJs: readFileSync(at('app/pages/assets/tables.src.js'), 'utf8'),
    fonts: FACES.map((f) => ({ ...f, base64: readFileSync(join(fonts, f.file)).toString('base64') })),
    licences: LICENCES.map((name) => [name, readFileSync(join(fonts, name), 'utf8')]),
  };
}
