// One explanation popover, for every mark whose meaning is more than its glyph.
//
// A native title was the only place many meanings lived: what an estimate rests on, why a measured value is not the
// headline, which kind of absence a dash is, why a material was screened. A title never appears on a touch screen,
// cannot be reached from the keyboard, arrives late on a desktop and is cut short (DECISIONS D61). Every such mark is
// now a real button (explainButton in format.js) that opens this popover, and keeps its title, which may repeat what
// the popover says but is never the only place it is said.
//
// A trigger is any element with data-explain, its text. It may add data-explain-head, a short heading, and
// data-explain-action with data-explain-id, the one next step the popover offers. One element is reused, and the
// listeners sit on the document, so a renderer that draws a trigger has nothing to wire and cannot forget to.

let panel = null;
// The trigger the open popover belongs to, where focus returns when it closes.
let current = null;
let actions = null;

const ACTIONS = {
  estimate: { label: 'Open the estimate', run: (id) => actions.openMaterial(id, 'Overview') },
  printing: { label: 'Open the Printing tab', run: (id) => actions.openMaterial(id, 'Printing') },
  measurement: { label: 'Open the measurement', run: (id) => actions.openMeasurement(id) },
};

const focusables = () => [...panel.querySelectorAll('button')].filter((b) => !b.hidden);

/** Whether an explanation is on screen. */
export const popoverOpen = () => !!panel && !panel.hidden;

/**
 * Close the popover. Focus goes back to its trigger when the reader closed it (Escape, the close button, the trigger
 * again or an action), and stays where it is when they moved on by clicking or tabbing elsewhere.
 */
export function closePopover(restoreFocus = false) {
  if (!popoverOpen()) return;
  panel.hidden = true;
  const trigger = current;
  current = null;
  trigger?.setAttribute('aria-expanded', 'false');
  if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true });
}

function open(trigger) {
  if (current && current !== trigger) current.setAttribute('aria-expanded', 'false');
  current = trigger;
  const d = trigger.dataset;
  panel.querySelector('.popover-head strong').textContent = d.explainHead || 'What this means';
  panel.querySelector('.popover-text').textContent = d.explain;
  const next = ACTIONS[d.explainAction];
  const button = panel.querySelector('.popover-action');
  button.hidden = !(next && d.explainId && actions);
  button.textContent = next?.label ?? '';
  panel.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  place();
  panel.focus({ preventScroll: true });
}

/**
 * Beside its trigger and inside the viewport: below when it fits or when there is more room below, else above, and
 * never wider or taller than the screen leaves. A trigger that has left the screen, or the page, takes it along.
 */
function place() {
  if (!current?.isConnected) { closePopover(false); return; }
  const r = current.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  if (r.bottom < 0 || r.top > vh || (r.width === 0 && r.height === 0)) { closePopover(false); return; }
  const margin = 8, gap = 6;
  panel.style.maxHeight = '';
  const width = panel.offsetWidth;
  const height = panel.offsetHeight;
  const below = vh - r.bottom - gap - margin;
  const above = r.top - gap - margin;
  const downward = height <= below || below >= above;
  const room = Math.max(downward ? below : above, 80);
  const shown = Math.min(height, room);
  panel.style.maxHeight = `${room}px`;
  panel.style.left = `${Math.max(margin, Math.min(r.left, vw - width - margin))}px`;
  panel.style.top = `${downward ? Math.min(r.bottom + gap, vh - margin - shown) : Math.max(margin, r.top - gap - shown)}px`;
}

/** Called once at start-up with the actions an explanation's next step may take. */
export function initPopover(appActions) {
  actions = appActions;
  panel = document.createElement('div');
  panel.className = 'popover';
  panel.id = 'explain-popover';
  panel.hidden = true;
  panel.tabIndex = -1;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'explain-popover-head');
  panel.setAttribute('aria-describedby', 'explain-popover-text');
  panel.innerHTML = `<div class="popover-head"><strong id="explain-popover-head"></strong>
      <button type="button" class="icon-btn popover-close" aria-label="Close this explanation">✕</button></div>
    <p class="popover-text" id="explain-popover-text"></p>
    <button type="button" class="btn btn-sm popover-action" hidden></button>`;
  document.body.appendChild(panel);

  panel.querySelector('.popover-close').addEventListener('click', () => closePopover(true));
  panel.querySelector('.popover-action').addEventListener('click', () => {
    const { explainAction, explainId } = current?.dataset ?? {};
    // Back on the trigger first, so the drawer this opens returns focus there rather than to a hidden popover.
    closePopover(true);
    ACTIONS[explainAction]?.run(explainId);
  });

  // Capture, so a mark does its own job and only that: inside a table row, the row's own listener never sees the
  // click, and the row's drawer does not open behind the explanation.
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest?.('[data-explain]');
    if (trigger && !panel.contains(trigger)) {
      e.stopPropagation();
      e.preventDefault();
      if (current === trigger && popoverOpen()) closePopover(true);
      else open(trigger);
      return;
    }
    if (popoverOpen() && !panel.contains(e.target)) closePopover(false);
  }, true);

  document.addEventListener('keydown', (e) => {
    // Escape closes the explanation, not the drawer behind it.
    if (e.key === 'Escape' && popoverOpen()) {
      e.stopPropagation();
      e.preventDefault();
      closePopover(true);
      return;
    }
    // Enter and Space press the mark's button; they must not reach a row that opens a drawer on Enter.
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest?.('[data-explain]')) {
      e.stopPropagation();
      return;
    }
    // Tabbing past either end of the popover closes it and carries on through the page from the trigger, so a
    // keyboard reader continues along the row they were reading instead of landing at the end of the document.
    if (e.key === 'Tab' && popoverOpen() && panel.contains(e.target)) {
      const list = focusables();
      const leavingForward = !e.shiftKey && e.target === list[list.length - 1];
      const leavingBack = e.shiftKey && (e.target === panel || e.target === list[0]);
      if (!leavingForward && !leavingBack) return;
      const trigger = current;
      closePopover(true);
      // Backwards lands on the trigger itself; forwards moves on from it.
      if (leavingBack && trigger?.isConnected) e.preventDefault();
    }
  }, true);

  panel.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== current) closePopover(false);
  });
  document.addEventListener('scroll', () => { if (popoverOpen()) place(); }, true);
  window.addEventListener('resize', () => { if (popoverOpen()) place(); });
}
