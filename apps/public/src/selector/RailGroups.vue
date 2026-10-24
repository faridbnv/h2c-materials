<script setup lang="ts">
// The groups of the filter rail (the old rail, app/js/ui/filters.js, as a component). Every control reads the scenario's requirements and writes
// them back through `changed`; nothing is kept in the page about a control but what the old rail kept (which groups are open, an operator chosen
// before a number was typed). The rail is rebuilt by Vue from the scenario, so a box the reader is in stays the same element and keeps focus.
import { computed, reactive } from 'vue';
import { GATE, H2C_CHECK, H2C_STATUS, envLabel, envRequirement, prop } from '@atlas/pages/facts/labels';
import { nonNegativeKeys, numericFilters } from '@atlas/pages/facts/registry';
import type { Loose } from '@atlas/pages/loose';
import { GROUPS, GROUP_ICON, GROUP_LABEL, H2C_STATUSES, OP_WORD, OPEN_BY_DEFAULT, activeIn, familiesOf, fillersOf, find, numericsOf, printGatesOf, statusMeanings } from './rail.ts';
import { PRINTABLE } from './templates.ts';
import type { Store } from './store.ts';

const props = defineProps<{ readonly store: Store }>();
const { state, actions } = props.store;

// Interface state that must survive a change: which groups the reader opened or closed, and an operator chosen before a number was typed.
const openGroups = reactive(new Map<string, boolean>());
const draftOps = reactive(new Map<string, string>());
const errors = reactive(new Map<string, string>());

const scenario = computed(() => { void state.vrev; return state.scenario; });
// The scenario's requirements, as the scenario holds them now: the state is shallow, so a list replaced by `drop` is not seen by a cached computed.
const cs = { get value(): Loose[] { return scenario.value.constraints; } };
// Counts are over candidates. A family entry owns no product, so counting it would read as missing data.
const materials = computed<Loose[]>(() => { void state.vrev; return state.db.materials.filter((m: Loose) => !m.familyEntry); });
const db = state.db;

const isOpen = (group: string): boolean => {
  const n = activeIn(group, scenario.value);
  // The build-material check sits in the family group but is set by every template: alone, it names itself on the
  // badge ("1 set" read as a family picked) and leaves the group closed.
  const buildOnly = group === 'Material family' && n === 1 && cs.value.some((c) => c.facet === 'supportMaterial');
  return openGroups.has(group) ? !!openGroups.get(group) : OPEN_BY_DEFAULT.has(group) || (n > 0 && !buildOnly);
};
const buildOnly = (group: string): boolean => group === 'Material family' && activeIn(group, scenario.value) === 1 && cs.value.some((c) => c.facet === 'supportMaterial');
const onToggle = (group: string, event: Event): void => { openGroups.set(group, (event.target as HTMLDetailsElement).open); };

const drop = (pred: (c: Loose) => boolean): void => { scenario.value.constraints = cs.value.filter((c) => !pred(c)); };

// ---- the family group
const families = computed(() => { void state.vrev; return familiesOf(materials.value, cs.value, state.ctx); });
const polymersOf = (family: string): string[] => families.value.find((f) => f.name === family)?.polymers.map((p) => p.name) ?? [];
/** The polymers chosen inside a family: the boxes exist only while the family is on and has more than one polymer. */
const chosenOf = (family: string): string[] => {
  const f = families.value.find((x) => x.name === family);
  return f && f.on && f.polymers.length > 1 ? f.polymers.filter((p) => p.on).map((p) => p.name) : [];
};
// Family, then polymer. A polymer chosen inside one family narrows that family only: the polymer requirement lists the chosen polymers of the
// families that have some chosen, and every polymer of the families that have none (each named within its family, so the two requirements
// together say exactly that).
function applyFamilies(chosenFamilies: string[], chosen: (family: string) => string[]): void {
  drop((c) => c.facet === 'family' || c.facet === 'polymer');
  if (chosenFamilies.length) {
    cs.value.push({ kind: 'facet', facet: 'family', in: chosenFamilies, __group: 'Material family' });
    if (chosenFamilies.some((f) => chosen(f).length)) {
      const polymers = chosenFamilies.flatMap((f) => (chosen(f).length ? chosen(f) : polymersOf(f)));
      cs.value.push({ kind: 'facet', facet: 'polymer', in: [...new Set(polymers)], __group: 'Material family' });
    }
  }
  actions.changed();
}
function toggleFamily(name: string, on: boolean): void {
  const current = families.value.filter((f) => f.on).map((f) => f.name);
  const next = on ? [...current, name] : current.filter((f) => f !== name);
  // Unticking a family unticks its polymers.
  applyFamilies(next, (f) => (f === name && !on ? [] : chosenOf(f)));
}
function togglePolymer(family: string, polymer: string, on: boolean): void {
  const current = chosenOf(family);
  const next = on ? [...current, polymer] : current.filter((p) => p !== polymer);
  applyFamilies(families.value.filter((f) => f.on).map((f) => f.name), (f) => (f === family ? next : chosenOf(f)));
}

const fillers = computed(() => { void state.vrev; return fillersOf(materials.value, cs.value); });
function toggleFiller(key: string, on: boolean): void {
  const current = fillers.value.filter((f) => f.on).map((f) => f.key);
  const chosen = on ? [...current, key] : current.filter((k) => k !== key);
  drop((c) => c.facet === 'reinforcement' || c.facet === 'filler');
  if (chosen.length) cs.value.push({ kind: 'facet', facet: 'filler', in: chosen, __group: 'Manufacturing' });
  actions.changed();
}
const buildMaterial = computed(() => find(cs.value, (c) => c.facet === 'supportMaterial'));
const supports = computed(() => materials.value.filter((m) => m.facets.supportMaterial?.value).length);
function toggleBuildMaterial(on: boolean): void {
  drop((c) => c.facet === 'supportMaterial');
  if (on) cs.value.push({ kind: 'facet', facet: 'supportMaterial', equals: false, __group: 'Manufacturing' });
  actions.changed();
}

// ---- the H2C group
const printGates = computed(() => { void state.vrev; return printGatesOf(materials.value, cs.value); });
function togglePrintable(on: boolean): void {
  drop((c) => c.kind === 'gate' && PRINTABLE.some((p) => p.gate === c.gate));
  if (on) cs.value.push(...PRINTABLE.map((c) => ({ ...c })));
  actions.changed();
}
function toggleGate(gate: string, on: boolean): void {
  drop((c) => c.gate === gate);
  if (on) {
    const group = gate === 'dryingKnown' ? 'Manufacturing' : 'Compatibility';
    cs.value.push({ kind: 'gate', gate, __group: group, ...(gate === 'abrasive' ? { hardenedAvailable: false } : {}) });
  }
  actions.changed();
}
const brass = computed(() => find(cs.value, (c) => c.gate === 'abrasive' && !c.hardenedAvailable));
const needsHardened = computed(() => materials.value.filter((m) => m.gates.abrasive === 'requires-hardened').length);
const drying = computed(() => find(cs.value, (c) => c.gate === 'dryingKnown'));
const scope = computed(() => {
  const excluded = materials.value.filter((m) => m.excluded);
  const byFamily = new Map<string, Loose[]>();
  for (const m of excluded) byFamily.set(m.family, [...(byFamily.get(m.family) ?? []), m]);
  const familyWords = [...byFamily].sort((x, y) => y[1].length - x[1].length).map(([f, ms]) => {
    const polymers = [...new Set(ms.map((m) => m.basePolymer).filter(Boolean))];
    return `${f} (${ms.length}${polymers.length > 2 ? `, e.g. ${polymers.slice(0, 2).join(', ')}` : ''})`;
  });
  return { on: !!find(cs.value, (c) => c.gate === 'scope'), count: excluded.length, words: familyWords.join(' and ') };
});
const statuses = computed(() => {
  const sel: string[] = find(cs.value, (c) => c.gate === 'h2cStatus')?.in ?? [];
  const counts: Record<string, number> = {};
  for (const m of materials.value) counts[m.h2cStatus] = (counts[m.h2cStatus] ?? 0) + 1;
  return { sel, counts };
});
function toggleStatus(status: string, on: boolean): void {
  const chosen = on ? [...statuses.value.sel, status] : statuses.value.sel.filter((s) => s !== status);
  drop((c) => c.gate === 'h2cStatus');
  // In the rail's own order, as the boxes read.
  const ordered = H2C_STATUSES.filter((s) => chosen.includes(s));
  if (ordered.length) cs.value.push({ kind: 'gate', gate: 'h2cStatus', in: ordered, __group: 'Compatibility' });
  actions.changed();
}

// ---- Part condition (D99)
const live = computed(() => state.db.grades.filter((g: Loose) => !g.retired));
const annealed = computed(() => live.value.filter((g: Loose) => g.states?.some((s: Loose) => s.treatment)).length);
const conditioned = computed(() => live.value.filter((g: Loose) => g.states?.some((s: Loose) => s.moisture === 'conditioned')).length);
function setAnneal(on: boolean): void {
  const sc = scenario.value;
  if (sc.anneal === on) return;
  sc.anneal = on;
  if (!on) sc.annealMaxC = null;
  actions.changed();
}
function setAnnealMax(event: Event): void {
  const el = event.target as HTMLInputElement;
  const v = Number(el.value);
  scenario.value.annealMaxC = el.value.trim() !== '' && Number.isFinite(v) && v > 0 ? v : null;
  actions.changed();
}
function setMoisture(next: 'dry' | 'conditioned'): void {
  const sc = scenario.value;
  if ((sc.moisture === 'conditioned' ? 'conditioned' : 'dry') === next) return;
  sc.moisture = next;
  actions.changed();
}

// ---- numbers
const numerics = (group: string) => numericsOf(group, materials.value, cs.value, db, state.ctx);
const nonNegative = computed(() => nonNegativeKeys());
/** Say what is wrong and leave the entry and the applied criterion alone, rather than dropping the requirement because the box could not be read. */
function upsertNumeric(key: string, root: HTMLElement | null): void {
  const opEl = root?.querySelector<HTMLSelectElement>(`[data-op-for="${key}"]`);
  const vEl = root?.querySelector<HTMLInputElement>(`[data-value-for="${key}"]`);
  if (!opEl || !vEl) return;
  const def = numericFilters().find((f: Loose) => f.key === key);
  const raw = vEl.value.trim();
  const existing = find(cs.value, (c) => c.property === key);
  draftOps.set(key, opEl.value);
  const problem = vEl.validity.badInput ? 'Enter a number.'
    : raw !== '' && !Number.isFinite(Number(raw)) ? 'Enter a number.'
    : raw !== '' && nonNegative.value.has(key) && Number(raw) < 0 ? `${prop(key).plain} cannot be negative.`
    : null;
  if (problem) errors.set(key, problem); else errors.delete(key);
  if (problem) return;
  // An operator picked before any number is typed is a draft, not a change.
  if (raw === '' && !existing) return;
  drop((c) => c.property === key);
  if (raw !== '') {
    const existingSoft = root?.querySelector<HTMLInputElement>(`[data-soft="${key}"]`)?.checked ?? false;
    cs.value.push({ kind: 'numeric', property: key, operator: opEl.value, value: Number(raw), mandatory: !existingSoft, __group: def.group });
  }
  actions.changed();
}
const rootEl = (event: Event): HTMLElement | null => (event.currentTarget as HTMLElement).closest('.group-body');
function clearNumeric(key: string): void { drop((c) => c.property === key); actions.changed(); }

// ---- cost, environment, evidence
const buy = computed(() => find(cs.value, (c) => c.gate === 'buyable'));
const cost = computed(() => ({ withOffer: materials.value.filter((m) => m.buy).length, inStock: materials.value.filter((m) => m.buy?.anyInStock).length }));
function toggleBuy(which: 'any' | 'stock', on: boolean): void {
  const anyOn = which === 'any' ? on : which === 'stock' && on ? true : !!buy.value;
  const stockOn = which === 'stock' ? on : which === 'any' && !on ? false : !!buy.value?.inStock;
  drop((c) => c.gate === 'buyable');
  // "In stock" only means anything once the offer filter itself is on.
  if (anyOn) cs.value.push({ kind: 'gate', gate: 'buyable', inStock: stockOn, __group: 'Cost' });
  actions.changed();
}
const envCats = computed(() => {
  const cats: Loose = state.db.meta.environmentCategories ?? {};
  const entries = Object.entries(cats) as [string, Loose][];
  return { verdict: entries.filter(([, v]) => v.kind === 'verdict').sort((a, b) => b[1].usable - a[1].usable), indicator: entries.filter(([, v]) => v.kind === 'indicator') };
});
const envOn = (key: string): boolean => !!find(cs.value, (c) => c.kind === 'environment' && c.category === key);
function toggleEnv(category: string, on: boolean): void {
  drop((c) => c.kind === 'environment' && c.category === category);
  if (on) cs.value.push({ kind: 'environment', category, __group: 'Environment' });
  actions.changed();
}
const evidence = computed(() => find(cs.value, (c) => c.kind === 'evidence'));
const evidenceFacts = computed(() => {
  const measured = new Set(state.db.measurements.map((m: Loose) => m.materialId));
  return {
    unmeasured: materials.value.filter((m) => !measured.has(m.id)).length,
    conflicts: state.db.coverage.filter((r: Loose) => r.status === 'Conflict' || r.status === 'Quarantined').length,
  };
});
function toggleEvidence(key: 'exactGrade' | 'noConflicts', on: boolean): void {
  const spec: Record<string, boolean> = {};
  for (const k of ['exactGrade', 'noConflicts']) if (k === key ? on : !!evidence.value?.[k]) spec[k] = true;
  drop((c) => c.kind === 'evidence');
  if (Object.keys(spec).length) cs.value.push({ kind: 'evidence', ...spec, __group: 'Evidence' });
  actions.changed();
}
const profiles = state.facts.profiles;
</script>

<template>
  <details v-for="group in GROUPS" :key="group" class="group" :data-group="group" :open="isOpen(group)" :data-testid="`rail-group-${group}`" @toggle="onToggle(group, $event)">
    <summary>
      <svg class="icon group-icon" viewBox="0 0 20 20" aria-hidden="true" v-html="GROUP_ICON[group] ?? ''" />{{ GROUP_LABEL[group] ?? group }}<span class="count" :data-zero="activeIn(group, scenario) === 0">{{ buildOnly(group) ? 'Build materials only' : `${activeIn(group, scenario)} set` }}</span><span class="chevron" aria-hidden="true"></span>
    </summary>
    <div class="group-body">
      <!-- Part condition (D99): the state the part is used in, which decides which of a product's published values are judged. -->
      <template v-if="group === 'Part condition'">
        <div class="avail">The state the part is used in. It selects which published values your requirements are
          judged on, and adds no requirement of its own.</div>
        <div class="control part-state" :data-active="scenario.anneal === true">
          <div class="seg-label" id="seg-anneal">Post-processing</div>
          <div class="segmented seg-sm" role="group" aria-labelledby="seg-anneal">
            <button type="button" data-anneal="off" :aria-pressed="scenario.anneal !== true" @click="setAnneal(false)">As printed</button><button type="button" data-anneal="on" :aria-pressed="scenario.anneal === true" @click="setAnneal(true)">Annealing allowed</button></div>
          <label v-if="scenario.anneal === true" class="anneal-max">Oven reaches up to <input type="number" data-anneal-max min="0" step="5" :value="scenario.annealMaxC ?? ''"
            placeholder="any" aria-label="The highest annealing temperature your oven reaches, in °C" @change="setAnnealMax"> °C</label>
          <div class="avail">{{ annealed }} products publish annealed values. With annealing allowed, a product may be judged on them,
            and its result names the schedule from its data sheet. This can only add passes.</div>
        </div>
        <div class="control part-state" :data-active="scenario.moisture === 'conditioned'">
          <div class="seg-label" id="seg-moisture">Moisture in service</div>
          <div class="segmented seg-sm" role="group" aria-labelledby="seg-moisture">
            <button type="button" data-moisture="dry" :aria-pressed="scenario.moisture !== 'conditioned'" @click="setMoisture('dry')">Dry</button><button type="button" data-moisture="conditioned" :aria-pressed="scenario.moisture === 'conditioned'" @click="setMoisture('conditioned')">Conditioned</button></div>
          <div class="avail">Data sheets test dry bars. Conditioned judges only values measured after moisture conditioning,
            which {{ conditioned }} products publish, so most materials could not be checked and are left out unless included.</div>
        </div>
      </template>

      <template v-else>
        <template v-if="group === 'Material family'">
          <div class="control family-facet" :data-active="families.some((f) => f.on)">
            <div class="avail">Each count is how many of that family your other requirements leave. Tick a family to list its
              polymers.</div>
            <div class="checks">
              <div v-for="f in families" :key="f.name" class="family-chip">
                <label :title="`${f.open} of ${f.total} left by the other requirements`"><input type="checkbox" :data-family="f.name" :checked="f.on" @change="toggleFamily(f.name, ($event.target as HTMLInputElement).checked)">
                  {{ f.name }}<span class="n">{{ f.open }}</span></label>
                <div v-if="f.on && f.polymers.length > 1" class="checks sub-checks">
                  <label v-for="p in f.polymers" :key="p.name"><input type="checkbox" :data-polymer="p.name" :data-polymer-family="f.name" :checked="p.on" @change="togglePolymer(f.name, p.name, ($event.target as HTMLInputElement).checked)">
                    {{ p.label }}<span class="n" :title="`${p.open} of ${p.total} left by the other requirements`">{{ p.open }}</span></label>
                </div>
              </div>
            </div>
          </div>
          <div class="control" :data-active="fillers.some((f) => f.on)">
            <label>Filler</label>
            <div class="checks">
              <label v-for="f in fillers" :key="f.key"><input type="checkbox" :data-facet="f.key" :checked="f.on" @change="toggleFiller(f.key, ($event.target as HTMLInputElement).checked)">
                {{ f.label }}<span class="n">{{ f.n }}</span></label>
            </div>
          </div>
          <div class="control" :data-active="!!buildMaterial">
            <label><input type="checkbox" data-build-material :checked="!!buildMaterial" @change="toggleBuildMaterial(($event.target as HTMLInputElement).checked)"> Build materials only</label>
            <div class="avail">Excludes the {{ supports }} support and interface materials.</div>
          </div>
        </template>

        <template v-if="group === 'Compatibility'">
          <!-- One check for the H2C's temperature limits, with its three parts under it: every template asks all three (D101), and a reader may drop one. -->
          <div class="control print-check" :data-active="printGates.check !== 'none'">
            <label><input type="checkbox" data-printable :checked="printGates.check === 'all'" :indeterminate.prop="printGates.check === 'some'" @change="togglePrintable(($event.target as HTMLInputElement).checked)"> {{ H2C_CHECK }}</label>
            <div class="avail">Reads each product's own nozzle, bed and chamber windows. Where its data sheet is silent, a data
              sheet shared with another product, then the Bambu Lab Filament Guide, stands in; the drawer says which.</div>
            <div class="checks sub-checks">
              <div v-for="gate in ['nozzle', 'bed', 'chamber']" :key="gate">
                <label><input type="checkbox" :data-gate="gate" :checked="printGates.asked[gate]" @change="toggleGate(gate, ($event.target as HTMLInputElement).checked)"> {{ GATE[gate].plain }}</label>
                <div class="avail">{{ printGates.lines[gate]?.text }}<span v-if="printGates.lines[gate]?.edge" class="caveat">{{ printGates.lines[gate]?.edge }} publish a window the H2C reaches only at its bottom edge; they stay unresolved</span></div>
              </div>
            </div>
          </div>

          <!-- Asked as the hardware you lack. Owning a hardened nozzle removes nothing, so there is nothing to ask about it. -->
          <div class="control" :data-active="!!brass">
            <label><input type="checkbox" data-gate="abrasive" :checked="!!brass" @change="toggleGate('abrasive', ($event.target as HTMLInputElement).checked)"> Brass nozzle only</label>
            <div class="avail">Excludes the {{ needsHardened }} materials whose sources call for a hardened nozzle.</div>
            <div class="eg">A missing statement is not proof a filament is safe for brass. Fibre-filled materials without one stay
              unresolved; glow, metal, wood and marble fills deserve a check too.</div>
          </div>

          <div class="control" :data-active="!!drying">
            <label><input type="checkbox" data-gate="dryingKnown" :checked="!!drying" @change="toggleGate('dryingKnown', ($event.target as HTMLInputElement).checked)"> Drying instructions published</label>
            <div class="avail">{{ profiles.dryingRequired }} of {{ profiles.total }} print profiles require drying, {{ profiles.dryingOptional }} advise it for a condition and {{ profiles.dryingNotNeeded }} say it is not needed.</div>
          </div>

          <!-- The scope: materials the database holds for completeness that the H2C cannot finish, named by their families. -->
          <div class="control" :data-active="scope.on">
            <label><input type="checkbox" data-gate="scope" :checked="scope.on" @change="toggleGate('scope', ($event.target as HTMLInputElement).checked)"> Exclude materials beyond H2C capability</label>
            <div class="avail">Reads a list, not temperatures: the {{ scope.count }} materials Bambu Lab's list and their makers'
              limitations put beyond the H2C as a whole, {{ scope.words }}.</div>
          </div>

          <div class="control" :data-active="statuses.sel.length > 0">
            <label>{{ GATE.h2cStatus.plain }} <button type="button" class="mark info-mark" :title="statusMeanings()" :data-explain="statusMeanings()" data-explain-head="Bambu Lab status" aria-label="What each Bambu Lab status means" aria-haspopup="dialog" aria-expanded="false">?</button></label>
            <div class="avail">Counts are of materials. A material can hold several products.</div>
            <div class="checks">
              <label v-for="st in H2C_STATUSES" :key="st" :title="H2C_STATUS[st].meaning"><input type="checkbox" :data-status="st" :checked="statuses.sel.includes(st)" @change="toggleStatus(st, ($event.target as HTMLInputElement).checked)">
                {{ H2C_STATUS[st].label }}<span class="n">{{ statuses.counts[st] ?? 0 }}</span></label>
            </div>
          </div>

          <div class="note"><strong>Not filters:</strong> AMS compatibility, H2C nozzle routing and print difficulty.
            {{ profiles.verifyExactGrade }} of {{ profiles.total }} print profiles say only "verify the exact grade", and none rates difficulty, so a
            filter would pass everything. Each material's Printing tab shows what is recorded.</div>
        </template>

        <div v-if="group === 'Mechanical' || group === 'Thermal'" class="avail">Compared on printed (or unstated) specimens, in the orientation named, as printed and dry unless
          Part condition says otherwise.</div>

        <div v-for="n in numerics(group)" :key="n.key" class="control" :data-active="!!n.requirement">
          <label :title="n.P.technical">{{ n.P.plain }}</label>
          <div class="sub-label">{{ n.P.hint }}</div>
          <div class="avail">{{ n.avail }}<span v-if="n.caveat" class="caveat">{{ n.caveat }}</span></div>
          <div class="row">
            <select class="op" data-testid="rail-op" :data-op-for="n.key" :aria-label="`${n.P.plain} comparison`" @change="upsertNumeric(n.key, rootEl($event))">
              <option v-for="o in ['>=', '<=', '>', '<']" :key="o" :value="o" :selected="(n.requirement?.operator ?? draftOps.get(n.key) ?? n.op) === o">{{ OP_WORD[o] }}</option>
            </select>
            <input type="number" step="any" data-testid="rail-value" :data-value-for="n.key" :value="n.requirement ? n.requirement.value : ''"
              :min="nonNegative.has(n.key) ? 0 : undefined" :aria-label="`${n.P.plain} value`" :aria-describedby="`err-${n.key}`" :aria-invalid="errors.has(n.key)"
              @change="upsertNumeric(n.key, rootEl($event))" @keydown.enter="upsertNumeric(n.key, rootEl($event))">
            <span class="unit">{{ n.P.unit }}</span>
            <button v-if="n.requirement" type="button" class="icon-btn clear" :data-clear="n.key" :title="`Remove the ${n.P.plain.toLowerCase()} requirement`" :aria-label="`Remove the ${n.P.plain.toLowerCase()} requirement`" @click="clearNumeric(n.key)">✕</button>
          </div>
          <div :id="`err-${n.key}`" class="field-error" role="alert" :hidden="!errors.has(n.key)">{{ errors.get(n.key) ?? '' }}</div>
          <div v-if="!n.requirement" class="eg">{{ n.example }}.</div>
          <label v-else class="sub-check"><input type="checkbox" data-testid="rail-soft" :data-soft="n.key" :checked="n.requirement.mandatory === false" @change="upsertNumeric(n.key, rootEl($event))"> Report only: shown for each material, does not filter</label>
        </div>

        <!-- Availability: whether a sampled Canadian shop listed the product, and had it in stock on the day. -->
        <div v-if="group === 'Cost'" class="control" :data-active="!!buy">
          <label><input type="checkbox" data-buy="any" :checked="!!buy" @change="toggleBuy('any', ($event.target as HTMLInputElement).checked)"> Sold in Canada (sampled)</label>
          <div class="avail">{{ cost.withOffer }} of {{ materials.length }} materials had a product listed by a sampled Canadian shop.</div>
          <label class="sub-check"><input type="checkbox" data-buy="stock" :checked="!!buy?.inStock" :disabled="!buy" @change="toggleBuy('stock', ($event.target as HTMLInputElement).checked)">
            In stock when sampled</label>
          <div class="avail">{{ cost.inStock }} had one in stock on the sampling day. Not live stock.</div>
          <div class="eg">Each product is judged on its own listings. No listing does not mean unavailable, so such a product
            stays unknown, not failed.</div>
        </div>

        <template v-if="group === 'Environment'">
          <div v-for="[key, v] in envCats.verdict" :key="key" class="control" :data-active="envOn(key)">
            <label><input type="checkbox" :data-env="key" :checked="envOn(key)" @change="toggleEnv(key, ($event.target as HTMLInputElement).checked)"> {{ envRequirement(key) }}</label>
            <div class="avail">{{ v.usable ? `Makers state a verdict for ${v.materials} materials` : 'No maker states a verdict' }}.<span v-if="v.polymerMaterials" class="caveat">{{ v.polymerMaterials }} more have base-polymer reference data only, which never passes</span></div>
          </div>
          <details v-if="envCats.verdict.length" class="rail-more"><summary><span class="chevron" aria-hidden="true"></span>How these are judged</summary>
            <p>A product passes only on its own maker's statement, or one in the data sheet it shares with another product.
            "Resistant" passes; "limited resistance", or a limit stated in words, stays unresolved. A pass covers the agents
            its source tested, not every chemical in the class.<template v-if="envCats.verdict.some(([, v]) => v.polymerMaterials)"> Base-polymer reference data never passes; with
            "Use estimates and resin data" on, it hides a material whose polymer the reference reports attacked or
            dissolved.</template> Each material's Environment tab gives the agents and conditions.</p>
          </details>
          <div v-if="envCats.indicator.length" class="note"><strong>Not filters:</strong>
            {{ envCats.indicator.map(([k, v]) => `${envLabel(k).toLowerCase()} (${v.records})`).join(', ') }}. These are described in
            words with no pass or fail, so they cannot filter. Each material's Environment tab shows them.</div>
        </template>

        <template v-if="group === 'Evidence'">
          <div class="control" :data-active="!!evidence?.exactGrade">
            <label><input type="checkbox" data-evidence="exactGrade" :checked="!!evidence?.exactGrade" @change="toggleEvidence('exactGrade', ($event.target as HTMLInputElement).checked)"> Require product-level measurements</label>
            <div class="avail">A number measured on the product itself, or in the data sheet it shares with another product.
              {{ evidenceFacts.unmeasured }} of {{ materials.length }} materials have no measurements at all.</div>
          </div>
          <div class="control" :data-active="!!evidence?.noConflicts">
            <label><input type="checkbox" data-evidence="noConflicts" :checked="!!evidence?.noConflicts" @change="toggleEvidence('noConflicts', ($event.target as HTMLInputElement).checked)"> Exclude unresolved data conflicts</label>
            <div class="avail">Excludes a product whose sources disagree or whose value is held back: {{ evidenceFacts.conflicts }} on file, each
              affecting only the product it names.</div>
          </div>
          <!-- Which values decide (D84, D172): a value whose test bar no document describes as printed is set apart for good. -->
          <div class="note">{{ state.facts.setApart }} product values are shown and never judged: nothing on their documents says, even
            implicitly, that the test bar was printed (many are moulded bars, stiffer and stronger than a print), or a heat
            deflection gives no test load. A heat deflection of a plastic that cannot crystallise is judged all the same, since
            its glass transition sets it, unless its document points to a moulded or resin bar. Each product's drawer names
            them.</div>
        </template>
      </template>
    </div>
  </details>
</template>
