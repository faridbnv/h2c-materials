# Embedded typefaces

> **In short.** The static material pages embed three variable typefaces, subset to Latin plus the symbols the pages use, as WOFF2: Inter (sans) and Newsreader roman and italic (serif). All are under the SIL Open Font License 1.1 with no Reserved Font Name. This file is written by `scripts/pages/subset-fonts.mjs`; do not edit it by hand.

## Sources

| Face | Version | Source | Input file | Input SHA-256 |
| --- | --- | --- | --- | --- |
| Inter | 4.1 | `https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip` (zip SHA-256 `9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e`) | `InterVariable.ttf` | `4989b125924991b90d05b2d16e0e388c48f7d5bb8b30539bbf9c755278d0ccaf` |
| Newsreader roman | google/fonts `main`, `ofl/newsreader/` (pinned here by hash, not by commit) | `https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/Newsreader%5Bopsz,wght%5D.ttf` | `Newsreader[opsz,wght].ttf` | `8a08d13f8a6c0d51be379a60af84f945f65369a67e509ee3c3bdcc421254d7c1` |
| Newsreader italic | as above | `https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/Newsreader-Italic%5Bopsz,wght%5D.ttf` | `Newsreader-Italic[opsz,wght].ttf` | `796668611f80b64d5adf182fde3b6f29ed83b4e7cbec7b96937e84ac01364792` |

| Licence file | Taken from | SHA-256 | Copyright line |
| --- | --- | --- | --- |
| `Inter-OFL.txt` | `LICENSE.txt` in the Inter 4.1 zip | `262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a` | Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter) |
| `Newsreader-OFL.txt` | `https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/OFL.txt` | `fdfad38143ec470553cae82a1e45320bdd1b9ec70415d37bd0171051d8a4ded8` | Copyright 2020 The Newsreader Project Authors (http://github.com/productiontype/Newsreader) |

## Outputs

| File | Bytes | SHA-256 | Axes kept (of the source’s) |
| --- | ---: | --- | --- |
| `Inter-Variable.subset.woff2` | 60152 | `4db50a9a9d53eec4a8049f17a11081c2a8f46dad48e546cb57f1f3a124f2b965` | opsz 14–32 (source 14–32); wght 400–700 (source 100–900) |
| `Newsreader-Variable.subset.woff2` | 118120 | `dc9dbd0e3794f7a2e614c20ba7d6b30e88fa849012015cc9be2a6c226f17c74f` | wght 400–700 (source 200–800); opsz 6–72 (source 6–72) |
| `Newsreader-Italic-Variable.subset.woff2` | 135492 | `628e0f943e7114746048a48a3c9ad217faa55f6f7be67318090678e87f72f700` | wght 400–700 (source 200–800); opsz 6–72 (source 6–72) |
| Total | 313764 | | |

The sizes and hashes depend on the subsetting tool’s release: the script is pinned to `subset-font` 2.9.0 (through `harfbuzzjs` 1.6.3, a WebAssembly build of HarfBuzz), exact in the root `package.json` and `package-lock.json`. A new release of the tool can change an output's hash with no change in what it draws.

## Code points

411 code points asked for in every face: U+0020–007E, U+00A0–00FF, U+0100–017F, U+02DA, U+0394, U+03A9, U+03BC, U+2010–2015, U+2018–201F, U+2020–2022, U+2026, U+2030, U+2032–2033, U+2039–203A, U+2044, U+2060, U+2070–209F, U+2103, U+2122, U+2190–2193, U+2212, U+2248, U+2260, U+2264–2265, U+2605–2606, U+2713, U+2717.

- Inter Variable: the source lacks U+00AD, U+0149, U+2060, U+2072, U+2073, U+208F, U+209D, U+209E, U+209F; those fall back to the next font in the page’s stack.
- Newsreader Variable (roman): the source lacks U+0132, U+0133, U+0149, U+017F, U+0394, U+03A9, U+03BC, U+2011, U+2012, U+2015, U+201B, U+201F, U+2060, U+2071, U+2072, U+2073, U+2075, U+2076, U+2077, U+2078, U+2079, U+207A, U+207B, U+207C, U+207D, U+207E, U+207F, U+2080, U+2081, U+2082, U+2083, U+2084, U+2085, U+2086, U+2087, U+2088, U+2089, U+208A, U+208B, U+208C, U+208D, U+208E, U+208F, U+2090, U+2091, U+2092, U+2093, U+2094, U+2095, U+2096, U+2097, U+2098, U+2099, U+209A, U+209B, U+209C, U+209D, U+209E, U+209F, U+2103, U+2190, U+2191, U+2192, U+2193, U+2605, U+2606, U+2713, U+2717; those fall back to the next font in the page’s stack.
- Newsreader Variable (italic): the source lacks U+0132, U+0133, U+0149, U+017F, U+0394, U+03A9, U+03BC, U+2011, U+2012, U+2015, U+201B, U+201F, U+2060, U+2071, U+2072, U+2073, U+2075, U+2076, U+2077, U+2078, U+2079, U+207A, U+207B, U+207C, U+207D, U+207E, U+207F, U+2080, U+2081, U+2082, U+2083, U+2084, U+2085, U+2086, U+2087, U+2088, U+2089, U+208A, U+208B, U+208C, U+208D, U+208E, U+208F, U+2090, U+2091, U+2092, U+2093, U+2094, U+2095, U+2096, U+2097, U+2098, U+2099, U+209A, U+209B, U+209C, U+209D, U+209E, U+209F, U+2103, U+2190, U+2191, U+2192, U+2193, U+2605, U+2606, U+2713, U+2717; those fall back to the next font in the page’s stack.

U+2060 (word joiner) and U+00AD (soft hyphen) are default-ignorable: a browser draws nothing for them whether or not the font maps them, so their absence from a face costs nothing. The other code points a face lacks are drawn by the next font in the stack, so the stack (Inter first for symbols, arrows, sub- and superscripts, ★, ✓ and ✗, which Newsreader does not have) decides how they look.

## Layout features

Kept (`keepFeatures`): `kern`, `liga`, `tnum`, `lnum`, `case`, `frac`, `sups`, `subs`, `ccmp`, `locl`, `mark`, `mkmk`, `calt`, `pnum`, `rvrn`. Named by the pages: `kern`, `liga`, `tnum`, `lnum`, `case`, `frac`, `sups`, `subs`. Kept so the faces draw as designed: `ccmp`, `locl`, `mark`, `mkmk`, `calt`, `pnum`, `rvrn` (accent composition and positioning, Inter’s contextual alternates, proportional figures, Newsreader’s optical-size substitutions).

- Inter Variable: features present in the output: `calt` `case` `frac` `kern` `locl` `pnum` `subs` `sups` `tnum`. Kept-list features the source does not have: `liga` `lnum` `rvrn`.
- Newsreader Variable (roman): features present in the output: `case` `kern` `liga` `locl` `pnum` `rvrn` `sups` `tnum`. Kept-list features the source does not have: `lnum` `frac` `subs` `ccmp` `calt`.
- Newsreader Variable (italic): features present in the output: `case` `kern` `liga` `locl` `pnum` `rvrn` `sups` `tnum`. Kept-list features the source does not have: `lnum` `frac` `subs` `ccmp` `calt`.

Left out: Inter’s stylistic sets and character variants (`ss01`–`ss08`, `cv01`–`cv11`), which would add about 13 KB to the Inter subset. Where a face lacks a feature the pages name (Inter has no `liga`; neither family has `lnum`), the `font-feature-settings` or `font-variant-numeric` request does nothing and is harmless.

## Regenerate

```bash
npm install            # subset-font is a devDependency of the root package
node scripts/pages/subset-fonts.mjs
```

The script downloads into new directories under `.cache/fonts/` (ignored by git), stops if any download’s SHA-256 differs from the constants in the script or if a licence is not OFL 1.1 or declares a Reserved Font Name, then subsets, re-reads each output, and rewrites everything in this folder.

## Licence

All three faces are licensed under the SIL Open Font License, Version 1.1 (<https://openfontlicense.org>). Neither licence header declares a Reserved Font Name, so the subset may keep the families’ own names. The licence grants permission to use, study, copy, merge, embed, modify and redistribute the fonts, alone or inside other software, provided that:

- the copyright notice and the licence text travel with every copy: `Inter-OFL.txt` and `Newsreader-OFL.txt` sit beside the subsets, and each subset keeps its own copyright notice (name ID 0), licence description (13) and licence URL (14) in its `name` table;
- the fonts are not sold on their own: they are embedded in pages that are the product;
- a modified version is itself released under the OFL: a subset with a narrowed axis range is a modified version, and these files stay under the same licence, as this file says;
- no Reserved Font Name is used in a modified version: none is declared.

Embedding in a document is expressly within the licence: the OFL FAQ treats embedding a font in a web page or document as use, not as redistribution of the font as a product.
