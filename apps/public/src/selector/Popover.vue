<script setup lang="ts">
// One explanation popover, for every mark whose meaning is more than its glyph (the old popover.js, as a component).
//
// A native title was the only place many meanings lived: what an estimate rests on, why a measured value is not the headline, which kind of
// absence a dash is, why a material was screened. A title never appears on a touch screen, cannot be reached from the keyboard, arrives late
// on a desktop and is cut short (DECISIONS D61). Every such mark is a real button (explainButton in the facts layer) that opens this popover,
// and keeps its title, which may repeat what the popover says but is never the only place it is said.
//
// A trigger is any element with data-explain, its text. It may add data-explain-head, a short heading, and data-explain-action with
// data-explain-id, the one next step the popover offers. The listeners sit on the document, so a renderer that draws a trigger has nothing to
// wire and cannot forget to.
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import type { Store } from './store.ts';

const props = defineProps<{ readonly store: Store }>();
const { actions } = props.store;

const panel = ref<HTMLElement | null>(null);
const shown = ref(false);
const head = ref('What this means');
const text = ref('');
const action = ref<{ label: string; run: () => void } | null>(null);
const placed = ref({ left: '0px', top: '0px', maxHeight: '' });
// The trigger the open popover belongs to, where focus returns when it closes.
let current: HTMLElement | null = null;

const ACTIONS: Record<string, { label: string; run: (id: string) => void }> = {
  estimate: { label: 'Open the estimate', run: (id) => actions.openMaterial(id, 'Overview') },
  polymer: { label: 'Open the Environment tab', run: (id) => actions.openMaterial(id, 'Environment') },
  printing: { label: 'Open the Printing tab', run: (id) => actions.openMaterial(id, 'Printing') },
  products: { label: 'Open its products', run: (id) => actions.openMaterial(id, 'Grades') },
  measurement: { label: 'Open the measurement', run: (id) => actions.openMeasurement(id) },
};

const focusables = (): HTMLElement[] => [...(panel.value?.querySelectorAll('button') ?? [])].filter((b) => !b.hidden);

/** Close the popover. Focus goes back to its trigger when the reader closed it (Escape, the close button, the trigger again or an action), and stays where it is when they moved on by clicking or tabbing elsewhere. */
function close(restoreFocus = false): void {
  if (!shown.value) return;
  shown.value = false;
  const trigger = current;
  current = null;
  trigger?.setAttribute('aria-expanded', 'false');
  if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true });
}

async function open(trigger: HTMLElement): Promise<void> {
  if (current && current !== trigger) current.setAttribute('aria-expanded', 'false');
  current = trigger;
  const d = trigger.dataset;
  head.value = d['explainHead'] || 'What this means';
  text.value = d['explain'] ?? '';
  const next = ACTIONS[d['explainAction'] ?? ''];
  action.value = next && d['explainId'] ? { label: next.label, run: () => next.run(d['explainId'] ?? '') } : null;
  shown.value = true;
  trigger.setAttribute('aria-expanded', 'true');
  await nextTick();
  place();
  panel.value?.focus({ preventScroll: true });
}

/** Beside its trigger and inside the viewport: below when it fits or when there is more room below, else above, and never wider or taller than the screen leaves. A trigger that has left the screen, or the page, takes it along. */
function place(): void {
  const el = panel.value;
  if (!el) return;
  if (!current?.isConnected) { close(false); return; }
  const r = current.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  if (r.bottom < 0 || r.top > vh || (r.width === 0 && r.height === 0)) { close(false); return; }
  const margin = 8, gap = 6;
  el.style.maxHeight = '';
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  const below = vh - r.bottom - gap - margin;
  const above = r.top - gap - margin;
  const downward = height <= below || below >= above;
  const room = Math.max(downward ? below : above, 80);
  const visible = Math.min(height, room);
  placed.value = {
    maxHeight: `${room}px`,
    left: `${Math.max(margin, Math.min(r.left, vw - width - margin))}px`,
    top: `${downward ? Math.min(r.bottom + gap, vh - margin - visible) : Math.max(margin, r.top - gap - visible)}px`,
  };
}

function runAction(): void {
  const next = action.value;
  // Back on the trigger first, so the drawer this opens returns focus there rather than to a hidden popover.
  close(true);
  next?.run();
}

// Capture, so a mark does its own job and only that: inside a table row, the row's own listener never sees the click, and the row's drawer
// does not open behind the explanation.
function onClick(e: MouseEvent): void {
  const target = e.target instanceof Element ? e.target : null;
  const trigger = target?.closest<HTMLElement>('[data-explain]');
  if (trigger && !panel.value?.contains(trigger)) {
    e.stopPropagation();
    e.preventDefault();
    if (current === trigger && shown.value) close(true);
    else void open(trigger);
    return;
  }
  if (shown.value && !panel.value?.contains(target)) close(false);
}

function onKey(e: KeyboardEvent): void {
  const target = e.target instanceof Element ? e.target : null;
  // Escape closes the explanation, not the drawer behind it.
  if (e.key === 'Escape' && shown.value) {
    e.stopPropagation();
    e.preventDefault();
    close(true);
    return;
  }
  // Enter and Space press the mark's button; they must not reach a row that opens a drawer on Enter.
  if ((e.key === 'Enter' || e.key === ' ') && target?.closest('[data-explain]')) {
    e.stopPropagation();
    return;
  }
  // Tabbing past either end of the popover closes it and carries on through the page from the trigger, so a keyboard reader continues along
  // the row they were reading instead of landing at the end of the document.
  if (e.key === 'Tab' && shown.value && target && panel.value?.contains(target)) {
    const list = focusables();
    const leavingForward = !e.shiftKey && target === list[list.length - 1];
    const leavingBack = e.shiftKey && (target === panel.value || target === list[0]);
    if (!leavingForward && !leavingBack) return;
    const trigger = current;
    close(true);
    // Backwards lands on the trigger itself; forwards moves on from it.
    if (leavingBack && trigger?.isConnected) e.preventDefault();
  }
}

function onFocusOut(e: FocusEvent): void {
  const next = e.relatedTarget;
  if (next instanceof Node && !panel.value?.contains(next) && next !== current) close(false);
}
const onScroll = (): void => { if (shown.value) place(); };

onMounted(() => {
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onScroll);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('keydown', onKey, true);
  document.removeEventListener('scroll', onScroll, true);
  window.removeEventListener('resize', onScroll);
});
defineExpose({ isOpen: () => shown.value, contains: (node: Node | null) => !!node && !!panel.value?.contains(node) });
</script>

<template>
  <div id="explain-popover" ref="panel" class="popover" :hidden="!shown" tabindex="-1" role="dialog" aria-labelledby="explain-popover-head" aria-describedby="explain-popover-text"
    data-testid="popover" :style="placed" @focusout="onFocusOut">
    <div class="popover-head"><strong id="explain-popover-head">{{ head }}</strong>
      <button type="button" class="icon-btn popover-close" aria-label="Close this explanation" @click="close(true)">✕</button></div>
    <p id="explain-popover-text" class="popover-text">{{ text }}</p>
    <button type="button" class="btn btn-sm popover-action" :hidden="!action" @click="runAction">{{ action?.label ?? '' }}</button>
  </div>
</template>
