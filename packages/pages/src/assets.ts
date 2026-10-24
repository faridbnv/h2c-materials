// What the pages' shared assets are made from, read from the package's own assets/ and browser/ folders (render.ts
// buildAssets is pure and reads no file). The stylesheets, in the order buildAssets puts them: the shared tokens, the
// faces, the frame (frame.src.css), the sections' (sections.src.css), the figures' (figures.src.css) and the Products
// page's (products.src.css). The page script is the bundle of browser/page.ts and browser/products.ts.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The package folder (packages/pages). */
export const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The faces embedded in assets/pages.css, from assets/fonts (FONTS.md says where they come from). */
const FACES = [
  { family: 'Inter', style: 'normal', weight: '400 700', file: 'Inter-Variable.subset.woff2' },
  { family: 'Newsreader', style: 'normal', weight: '400 700', file: 'Newsreader-Variable.subset.woff2' },
  { family: 'Newsreader', style: 'italic', weight: '400 700', file: 'Newsreader-Italic-Variable.subset.woff2' },
] as const;
const LICENCES = ['Inter-OFL.txt', 'Newsreader-OFL.txt'] as const;

export interface AssetInput {
  readonly tokensCss: string;
  readonly frameCss: string;
  readonly sectionsCss: string;
  readonly figuresCss: string;
  readonly productsCss: string;
  /** The page script as the browser loads it: page.ts then products.ts, bundled and minified. */
  readonly script: string;
  readonly fonts: readonly { family: string; style: string; weight: string; file: string; base64: string }[];
  readonly licences: readonly (readonly [string, string])[];
}

const BANNER = '/* Filament Atlas material pages: the frame\'s script and the lists\' script (packages/pages/browser). Classic, no library; every page reads in full without it. */';

/** The two page scripts, each bundled as one classic script and appended in the order the pages need them. */
export async function bundleScripts(root: string = PACKAGE_ROOT): Promise<string> {
  const { build } = await import('vite');
  const parts: string[] = [];
  for (const name of ['page', 'products'] as const) {
    const result = await build({
      configFile: false, logLevel: 'silent',
      build: { write: false, minify: true, target: 'es2019', lib: { entry: join(root, 'browser', `${name}.ts`), formats: ['iife'], name: `atlas_${name}` } },
    });
    const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) => ('output' in r ? r.output : []));
    const chunk = outputs.find((o) => o.type === 'chunk');
    if (!chunk || chunk.type !== 'chunk') throw new Error(`bundling browser/${name}.ts produced no script`);
    parts.push(chunk.code.trim());
  }
  return `${BANNER}\n${parts.join('\n')}\n`;
}

/** The assets' inputs: the stylesheets and faces from `root`, and the bundled page script. */
export function readAssets(script: string, root: string = PACKAGE_ROOT): AssetInput {
  const read = (...p: string[]): string => readFileSync(join(root, 'assets', ...p), 'utf8');
  return {
    tokensCss: read('tokens.css'),
    frameCss: read('frame.src.css'),
    sectionsCss: read('sections.src.css'),
    figuresCss: read('figures.src.css'),
    productsCss: read('products.src.css'),
    script,
    fonts: FACES.map((f) => ({ ...f, base64: readFileSync(join(root, 'assets', 'fonts', f.file)).toString('base64') })),
    licences: LICENCES.map((name) => [name, read('fonts', name)] as const),
  };
}
