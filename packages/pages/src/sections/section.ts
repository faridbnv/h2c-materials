import type { Loose } from '../loose.ts';

/** A section of the Overview: titled ones are wrapped by render.ts, a bare one writes its own section, `menu: false` keeps it off the bar. */
export interface Section {
  id: string;
  title: string | null;
  bare?: boolean;
  menu?: boolean;
  render(c: Loose, env?: Loose, place?: Loose): Loose;
}
