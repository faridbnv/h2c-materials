// The reader's own zoom on the Ashby chart (D109), kept across redraws for as long as the axes and their scales are the same: a press on a
// switch, a filter or the line redraws the chart, and a zoom that snapped back after each one was lost work. A new pair of axes starts from
// the whole picture, and a double-click on the chart, or Show all, gives it back. Its own small module, so that the store can forget a zoom
// (a new goal sets new axes) without loading the chart code.
import type { Loose } from '@atlas/pages/loose';

export const zoomMemory: Loose = { sig: null, x: null, y: null };
export const zoomSig = (p: Loose) => `${p.x}|${p.y}|${!!p.xLog}|${!!p.yLog}`;
export const forgetZoom = () => { zoomMemory.sig = null; zoomMemory.x = null; zoomMemory.y = null; };
/** Put the remembered zoom on a layout about to be drawn; true when it did. */
export function applyZoom(layout: Loose, sig: Loose) {
  if (zoomMemory.sig !== sig || !zoomMemory.x || !zoomMemory.y) return false;
  layout.xaxis.range = [...zoomMemory.x];
  layout.yaxis.range = [...zoomMemory.y];
  return true;
}
