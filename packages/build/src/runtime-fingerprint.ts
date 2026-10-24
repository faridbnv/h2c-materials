// What the build ran on, as far as it can change an answer (WP-21; owner rulings OQ-07 A and OQ-08 A).
//
// The estimate stage sorts with `localeCompare` (gaussian.ts, calibration.ts) and uses `Math.log`, `Math.exp` and `Math.pow`, so its
// numbers are a function of the runtime: gap-1 measured that a plain code-unit sort changes 2,362 leaves of db.json, and that
// Linux/x64 and macOS/arm64 can disagree on the last bit of a float. The owner postponed fixing that (DT-2) and ruled that Node is
// pinned and ICU recorded instead. This is the record: it goes in the estimate stage's cache key (a different runtime can never
// be served another runtime's estimates) and in each release's manifest.
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export interface RuntimeFingerprint {
  /** `process.version`: the Node build. Its minor version moves V8, zlib and ICU. */
  node: string;
  /** V8's version: the maths library (`Math.log`, `Math.exp`) is V8's own. */
  v8: string;
  platform: string;
  arch: string;
  /** ICU, CLDR and Unicode versions: the collation `localeCompare` sorts by. */
  icu: string;
  cldr: string;
  unicode: string;
  /** The default collator's settings as resolved on this machine (locale, collation, case order, numeric): `LANG` can change them. */
  collator: string;
  /** A short digest of the order a fixed list of strings sorts in. It sees a collation change that no version string shows. */
  collationProbe: string;
}

// Strings of the kinds the estimate sampler sorts: mixed-case document keys with hyphens and bars, and identifiers with digits.
const PROBE = [
  'X-ECOMAX-PLA-TDS-v3|density', 'B-pla-basic-filament-TDS|density', 'b-pla|density', 'A|b', 'a|b', 'a-b', 'a b', 'ab', 'a_b', 'M010', 'M009', 'M100', 'm010',
  '10', '9', '1e3', 'é', 'e', 'f', 'z', 'Z', 'ß', 'ss', 'æ', 'ae', 'ö', 'o', '-x', 'x-', '—', '_', '|', 'Ω', 'ω',
];

function collationProbe(): string {
  const order = [...PROBE].sort((a, b) => a.localeCompare(b));
  return createHash('sha256').update(JSON.stringify(order)).digest('hex').slice(0, 16);
}

/** The runtime this process runs on. */
export function runtimeFingerprint(): RuntimeFingerprint {
  const v = process.versions;
  return {
    node: process.version,
    v8: v.v8,
    platform: process.platform,
    arch: process.arch,
    icu: v.icu ?? 'no-icu',
    cldr: v.cldr ?? 'no-cldr',
    unicode: v.unicode ?? 'no-unicode',
    collator: JSON.stringify(new Intl.Collator().resolvedOptions()),
    collationProbe: collationProbe(),
  };
}

export interface NodePin {
  /** The version `.nvmrc` names, or null where there is no such file. */
  pin: string | null;
  /** Whether the running Node is that version (a pin of `26` names a major, `26.12.0` an exact version). */
  matches: boolean;
}

/** The Node version the repository pins (`.nvmrc`), and whether this process runs it. */
export function nodePin(projectRoot: string, node: string = process.version): NodePin {
  const file = join(projectRoot, '.nvmrc');
  if (!existsSync(file)) return { pin: null, matches: false };
  const pin = readFileSync(file, 'utf8').trim().replace(/^v/, '');
  const running = node.replace(/^v/, '');
  return { pin, matches: running === pin || running.startsWith(`${pin}.`) };
}
