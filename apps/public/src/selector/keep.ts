// What a trip to a material page and back keeps (the old main.js keepDecisionNotes and keepScroll; D145). The page reloads the selector from its
// link, so what the link does not carry is kept for the tab, in sessionStorage, and given back when the same selection returns.
//
//   - a chosen product's note and test results travel in a saved file, not in the link (D103): kept for the tab and given back to the same chosen
//     product, in the same state;
//   - where the reader was in the results: the view's scroll, the page's scroll and the drawer's tab, given back when the selection is the same
//     one, whichever material's drawer the return opens. A different selection starts at the top, as it always did.
//
// Nothing else is kept, and a new tab starts empty. Storage refused (a private window) keeps nothing and the page works the same.
import { toHash } from '@atlas/engine/port/scenario.ts';
import type { Loose } from '@atlas/pages/loose';

const NOTES_KEY = 'atlas-decision-notes';
const SCROLL_KEY = 'atlas-scroll';

const sameSelection = (a: string, b: string): boolean => {
  try {
    const x = JSON.parse(decodeURIComponent(a)), y = JSON.parse(decodeURIComponent(b));
    delete x.m; delete y.m;
    return JSON.stringify(x) === JSON.stringify(y);
  } catch { return false; }
};

/** Give back what was kept for this selection, and keep what changes from now until the page is left. Returns the function that stops keeping. */
export function keepPlace(state: Loose, lens: () => HTMLElement | null): () => void {
  try {
    const kept = JSON.parse(sessionStorage.getItem(NOTES_KEY) ?? '[]');
    for (const d of state.scenario.decisions ?? []) {
      const k = kept.find((x: Loose) => x.gradeId === d.gradeId && (x.stateId ?? null) === (d.stateId ?? null));
      if (k && !d.note && !d.tests?.length) { d.note = k.note ?? null; d.tests = Array.isArray(k.tests) ? k.tests : []; }
    }
  } catch { /* private mode, or nothing kept */ }
  try {
    const kept = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? 'null');
    if (kept && sameSelection(kept.hash, toHash(state.scenario))) {
      if (kept.tab && kept.tab !== state.drawerTab && state.selectedMaterialId) state.drawerTab = kept.tab;
      requestAnimationFrame(() => {
        const el = lens();
        if (el) el.scrollTop = kept.lens || 0;
        if (kept.page) window.scrollTo(0, kept.page);
      });
    }
  } catch { /* nothing kept */ }

  const onLeave = (): void => {
    try {
      const notes = (state.scenario.decisions ?? []).filter((d: Loose) => d.note || d.tests?.length)
        .map((d: Loose) => ({ gradeId: d.gradeId, stateId: d.stateId ?? null, note: d.note ?? null, tests: d.tests ?? [] }));
      sessionStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch { /* private mode */ }
    try {
      sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ hash: toHash(state.scenario), lens: lens()?.scrollTop ?? 0, page: window.scrollY, tab: state.drawerTab }));
    } catch { /* private mode */ }
  };
  window.addEventListener('pagehide', onLeave);
  return () => { window.removeEventListener('pagehide', onLeave); };
};
