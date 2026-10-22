// What the lenses of part 2 do to the page's state, beyond what the table does (the old main.js actions setPlot, startExercise, inspect, select and
// setFocus). They live with the lenses, so the first screen does not carry them; each changes a view or the question and then asks the store to
// draw and to keep the address (touch, pushHash, changed).
import { indexById } from '@atlas/engine/port/indices.ts';
import { goalAxes } from '@atlas/engine/port/goal-axes.ts';
import { nextTick } from 'vue';
import type { Loose } from '@atlas/pages/loose';
import type { Store } from '../store.ts';
import { PRINTABLE } from '../templates.ts';
import { forgetZoom } from './zoom.ts';

export function lensActions(store: Store): Loose {
  const { state, actions, touch, pushHash } = store;
  return {
    ...actions,
    // The filter rail is the one place a requirement is set (D108): the chart's requirement lines and its question bar open it, at the property named.
    // The rail is opened by the same button the reader would press (the filter rail's dialog on a narrow screen, the hidden rail on a wide one).
    editRequirements(property: string | null = null) {
      const main = document.getElementById('main');
      const narrow = matchMedia('(max-width: 1100px)').matches;
      if (narrow ? main?.dataset['railOpen'] !== 'true' : main?.dataset['railCollapsed'] === 'true') document.getElementById('btn-filters')?.click();
      void nextTick(() => {
        // A property's own box, opening its group if the reader had it closed; else the rail's first control.
        const box = property ? document.querySelector<HTMLElement>(`#rail [data-value-for="${CSS.escape(property)}"]`) : null;
        const group = box?.closest('details');
        if (group && !group.open) group.open = true;
        (box ?? document.querySelector<HTMLElement>('#rail .group-body input, #rail .group-body select'))?.focus();
        box?.scrollIntoView({ block: 'center' });
      });
    },
    setPlot(patch: Loose) { Object.assign(state.scenario.plot, patch); touch(); pushHash(); },
    // The first step of a new exercise (D107): the member and what is prescribed, with the H2C's requirements proposed.
    startExercise(id: string | null, withGates: boolean) {
      // Asked, even when it asked nothing yet ("compare properties" without the H2C's gates): the starter has done its job.
      state.ashbyStarted = true;
      const cs = state.scenario.constraints;
      if (withGates) {
        if (!cs.some((c: Loose) => c.kind === 'gate' && c.gate === 'scope')) cs.push({ kind: 'gate', gate: 'scope', __group: 'Compatibility' });
        for (const g of PRINTABLE) if (!cs.some((c: Loose) => c.kind === 'gate' && c.gate === g.gate)) cs.push({ ...g });
      }
      const index = id ? indexById(id) : null;
      state.scenario.rankBy = index ? index.id : null;
      Object.assign(state.scenario.plot, index ? goalAxes(index) : {}, { view: 'decision', indexM: null });
      if (!index && !withGates && !cs.length) state.scenario.rankBy = null;
      actions.changed();
    },
    // Open a mark in the inspector. A product's material is picked out with it; one pressed on the chart is also brought into view in the list (D109).
    inspect(target: Loose) {
      // Back to the list: the picked material's row is brought into view if the list had it out of sight.
      if (!target && state.inspect) state.revealMaterial = state.selected;
      state.inspect = target;
      state.inspectFocus = !!target;
      const material = target?.kind === 'pair' ? target.key.split('|')[0] : target?.kind === 'material' ? target.key : null;
      if (material) state.selected = material;
      touch();
    },
    // Pick a material out on the Ashby chart, or let go (null): its marks stay bright and the rest fade. A view only.
    select(id: string | null) { state.selected = id; touch(); },
    // A focus zooms the chart to some materials; it changes no answer, count or rank, and is reset in one press.
    setFocus(ids: string[]) { forgetZoom(); state.scenario.plot.focus = ids; touch(); pushHash(); },
  };
}
