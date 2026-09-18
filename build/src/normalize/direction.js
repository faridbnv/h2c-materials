// Method sheet, Comparison / Directions: "XY and Z remain separate. Unknown direction is not XY."
// Three of the nine spellings in the Properties sheet are the source's own words rather than a
// confirmed build orientation, so they get their own canonical values and never merge into XY or Z.

export const DIRECTION = {
  XY: 'XY',
  Z: 'Z',
  XZ: 'XZ',
  ZX: 'ZX',
  HORIZONTAL_LABEL: 'horizontal-source-label',
  VERTICAL_XZ_LABEL: 'vertical-xz-source-label',
  ALONG_FLOW: 'along-flow',
  // An alternating ±45° raster (Essentium PPS-CF) is its own orientation, neither XY nor Z (audit 2026-09-15, C-06).
  RASTER_45: 'raster-45',
  NOT_APPLICABLE: 'not-applicable',
  UNKNOWN: 'unknown',
};

const MAP = new Map([
  ['XY', DIRECTION.XY],
  ['Z', DIRECTION.Z],
  ['XZ', DIRECTION.XZ],
  ['ZX', DIRECTION.ZX],
  ['Horizontal (source label)', DIRECTION.HORIZONTAL_LABEL],
  ['Vertical XZ (source label)', DIRECTION.VERTICAL_XZ_LABEL],
  ['Along flow', DIRECTION.ALONG_FLOW],
  ['45/45', DIRECTION.RASTER_45],
  ['Not applicable', DIRECTION.NOT_APPLICABLE],
  ['Not published', DIRECTION.UNKNOWN],
  // Two reviewed forms of unknown (m47). Both are unknown to the build; they differ in what the source did, and in
  // that someone has read it: "Not published" is a row nobody has checked, which is what the lint looks for.
  ['Unstated', DIRECTION.UNKNOWN],
  ['Stated, not a usable direction', DIRECTION.UNKNOWN],
]);

// Which canonical directions may be compared with each other under Strict comparability.
// A source label is not evidence of a build orientation, so it matches only itself.
const STRICT_EQUIVALENCE = {
  [DIRECTION.XY]: [DIRECTION.XY],
  [DIRECTION.Z]: [DIRECTION.Z],
  [DIRECTION.XZ]: [DIRECTION.XZ],
  [DIRECTION.ZX]: [DIRECTION.ZX],
  [DIRECTION.HORIZONTAL_LABEL]: [DIRECTION.HORIZONTAL_LABEL],
  [DIRECTION.VERTICAL_XZ_LABEL]: [DIRECTION.VERTICAL_XZ_LABEL],
  [DIRECTION.ALONG_FLOW]: [DIRECTION.ALONG_FLOW],
  [DIRECTION.RASTER_45]: [DIRECTION.RASTER_45],
  [DIRECTION.NOT_APPLICABLE]: [DIRECTION.NOT_APPLICABLE],
  [DIRECTION.UNKNOWN]: [DIRECTION.UNKNOWN],
};

export function normalizeDirection(raw) {
  const text = raw == null ? '' : String(raw).trim();
  const canonical = MAP.get(text);
  if (canonical) return { canonical, text, mapped: true };
  return { canonical: DIRECTION.UNKNOWN, text, mapped: false };
}

export function directionsComparable(a, b, mode = 'strict') {
  if (mode === 'broad') return true;
  return (STRICT_EQUIVALENCE[a] || []).includes(b);
}

/** Directions that are a real build orientation, for the "is this an anisotropy pair" check. */
export const isBuildOrientation = (d) => d === DIRECTION.XY || d === DIRECTION.Z || d === DIRECTION.XZ || d === DIRECTION.ZX;
