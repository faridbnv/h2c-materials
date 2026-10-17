// In short: folded into the Overview's first screen (sections/masthead.js, the summary beside "On the H2C") when the
// pages were reimagined (2026-10-17). Kept as an untitled section that renders nothing, so the section list
// (sections/index.js, track B) can drop it at its own pace: render.js leaves an untitled empty section out silently.

export default {
  id: 'in-short',
  title: null,
  render() {
    return { html: '', empty: true, stats: {} };
  },
};
