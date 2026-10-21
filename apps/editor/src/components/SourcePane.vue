<script setup lang="ts">
// The source page beside the record (05 section 11.2: "source beside record, always"). The stored text of the page, the quote under a
// marker, and the page image when the private store holds one. If the document is not on this computer it says so and shows nothing
// in its place. Words of the document are shown as text and never as markup.
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { Failure, api, imageUrl } from '../api.ts';
import { describeFailure } from '../store.ts';
import type { SourceInfo, SourcePage } from '../../shared/api.ts';

const props = defineProps<{ source: SourceInfo | null; page: number; quote: string }>();
const emit = defineEmits<{ 'update:page': [page: number]; pick: [text: string] }>();

const text = ref<SourcePage | null>(null);
const image = ref<string | null>(null);
const mode = ref<'text' | 'image'>('text');
const problem = ref<string | null>(null);
const pane = ref<HTMLElement | null>(null);
const active = ref(0);
let ticket = 0;

const available = computed(() => props.source?.availability === 'available');
const hasImage = computed(() => available.value && (props.source?.imagePages.includes(props.page) ?? false));
const squeeze = (value: string): string => value.replace(/\s+/g, '');
const wanted = computed(() => props.quote.replace(/\s+/g, ' ').trim());

async function load(): Promise<void> {
  const mine = ++ticket;
  text.value = null;
  problem.value = null;
  releaseImage();
  const source = props.source;
  if (source === null || source.availability !== 'available') return;
  try {
    const found = await api<SourcePage>(`/api/sources/${encodeURIComponent(source.sourceId)}/pages/${props.page}`);
    if (mine === ticket) { text.value = found; active.value = 0; }
  } catch (error) {
    if (mine === ticket) problem.value = error instanceof Failure ? `Page ${props.page} is not in the stored document (it has ${source.pageCount ?? 'no'} page(s)).` : describeFailure(error);
  }
}

function releaseImage(): void {
  if (image.value !== null) URL.revokeObjectURL(image.value);
  image.value = null;
}

async function showImage(): Promise<void> {
  mode.value = 'image';
  if (image.value !== null || props.source === null) return;
  try { image.value = await imageUrl(`/api/sources/${encodeURIComponent(props.source.sourceId)}/pages/${props.page}/image`); } catch (error) { problem.value = describeFailure(error); }
}

watch(() => [props.source?.sourceId, props.page], () => { mode.value = 'text'; void load(); }, { immediate: true });
onBeforeUnmount(releaseImage);

function setPage(event: Event): void {
  if (event.target instanceof HTMLInputElement) emit('update:page', Math.max(1, Math.floor(Number(event.target.value)) || 1));
}

interface Marked { readonly before: string; readonly mark: string; readonly after: string }

/**
 * Each line with its marked parts. The quote is marked where it stands inside a line; a quote that runs over several lines is found
 * in the page's text with the spaces taken out (as the service looks for it) and every line it touches is marked whole.
 */
const lines = computed((): { line: string; parts: Marked | null }[] => {
  const all = text.value?.lines ?? [];
  const want = wanted.value;
  const unmarked = all.map((line) => ({ line, parts: null }));
  if (want === '') return unmarked;
  const exact = all.map((line): Marked | null => {
    const flat = line.replace(/\s+/g, ' ');
    const at = flat.indexOf(want);
    return at < 0 ? null : { before: flat.slice(0, at), mark: want, after: flat.slice(at + want.length) };
  });
  if (exact.some((e) => e !== null)) return all.map((line, k) => ({ line, parts: exact[k] ?? null }));
  const target = squeeze(want);
  const squeezed = all.map(squeeze);
  const at = target.length >= 4 ? squeezed.join('').indexOf(target) : -1;
  if (at < 0) return unmarked;
  let start = 0;
  return all.map((line, k) => {
    const end = start + (squeezed[k]?.length ?? 0);
    const touched = end > start && start < at + target.length && end > at;
    start = end;
    return { line, parts: touched ? { before: '', mark: line, after: '' } : null };
  });
});

function pickSelection(): void {
  const selection = window.getSelection();
  const chosen = selection?.toString().replace(/\s+/g, ' ').trim() ?? '';
  if (chosen !== '' && pane.value !== null && selection?.anchorNode && pane.value.contains(selection.anchorNode)) emit('pick', chosen);
}

function move(step: number, event: KeyboardEvent): void {
  const count = text.value?.lines.length ?? 0;
  if (count === 0) return;
  active.value = Math.min(count - 1, Math.max(0, active.value + step));
  event.preventDefault();
  void Promise.resolve().then(() => pane.value?.querySelectorAll<HTMLElement>('.page-text button')[active.value]?.focus());
}
</script>

<template>
  <div ref="pane" class="stack">
    <h2 id="source-h">Source page</h2>
    <p v-if="source === null" class="muted">Choose a value to read the page it came from.</p>
    <template v-else>
      <p>
        <strong>{{ source.title ?? source.sourceId }}</strong>
        <span class="muted"> · {{ [source.publisher, source.revision].filter((v) => v && v !== 'Not published').join(', ') }}</span>
      </p>
      <p v-if="!available" class="banner warn" role="status">{{ source.note }}</p>
      <template v-else>
        <div class="pager">
          <button class="btn" type="button" :disabled="page <= 1" @click="emit('update:page', page - 1)">Previous page</button>
          <label for="source-page" class="hint">Page</label>
          <input id="source-page" type="number" min="1" :max="source.pageCount ?? undefined" :value="page" @change="setPage" />
          <span class="muted">of {{ source.pageCount }}</span>
          <button class="btn" type="button" :disabled="source.pageCount !== null && page >= source.pageCount" @click="emit('update:page', page + 1)">Next page</button>
          <template v-if="hasImage">
            <button class="btn" type="button" :aria-pressed="mode === 'text'" @click="mode = 'text'">Text</button>
            <button class="btn" type="button" :aria-pressed="mode === 'image'" @click="showImage">Page image</button>
          </template>
        </div>
        <p class="hint">{{ source.note }}</p>
        <p v-if="problem" class="banner error" role="alert">{{ problem }}</p>
        <img v-if="mode === 'image' && image" class="page-image" :src="image" :alt="`Page ${page} of the source document, as an image`" />
        <template v-else-if="text">
          <div class="row">
            <button class="btn" type="button" @click="pickSelection">Use the selected words as the quote</button>
            <span class="hint">or press Enter on a line to use all of it. Up and Down move between lines.</span>
          </div>
          <ul class="page-text" aria-labelledby="source-h">
            <li v-for="(item, k) in lines" :key="k">
              <button type="button" :tabindex="k === active ? 0 : -1" :aria-current="item.parts ? 'true' : undefined"
                @click="active = k; emit('pick', item.line.replace(/\s+/g, ' ').trim())" @keydown.down="move(1, $event)" @keydown.up="move(-1, $event)">
                <template v-if="item.parts">{{ item.parts.before }}<mark>{{ item.parts.mark }}</mark>{{ item.parts.after }}</template>
                <template v-else>{{ item.line }}</template>
              </button>
            </li>
          </ul>
          <p v-if="text.lines.length === 0" class="muted">The stored text of this page is empty.</p>
        </template>
      </template>
    </template>
  </div>
</template>
