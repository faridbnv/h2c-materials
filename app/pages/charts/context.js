// Where a material's median stands among the other materials' medians, in words (the key figures' rank line).

/** Where the median stands among the other materials' medians (material-facts.js rankOf), in words. */
export function rankWords(r) {
  const others = r.of - 1;
  if (others < 1) return 'No other material has a value to compare with.';
  const level = others - r.below - r.above;
  if (!r.below && !level) return `Below the medians of all ${others} other materials with a value.`;
  if (!r.above && !level) return `Above the medians of all ${others} other materials with a value.`;
  const parts = [r.below ? `above ${r.below}` : null, level ? `level with ${level}` : null, r.above ? `below ${r.above}` : null].filter(Boolean);
  const said = parts.length === 3 ? `${parts[0]}, ${parts[1]} and ${parts[2]}` : parts.join(' and ');
  return `${said.charAt(0).toUpperCase()}${said.slice(1)} of the ${others} other materials' medians.`;
}
