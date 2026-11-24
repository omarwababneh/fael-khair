// Arabic text that sits in the game world (map place names, "آي!") is drawn as
// HTML, not on the canvas. HTML Arabic (with its vowel marks) renders correctly on
// iPhone Safari; canvas text did not. The layer is scaled to match the 390 x 844
// design frame, so labels use the same coordinates as the game.
import { DESIGN_H, DESIGN_W, vp } from './viewport';

const layer = document.getElementById('labels') as HTMLDivElement;
layer.style.width = `${DESIGN_W}px`;
layer.style.height = `${DESIGN_H}px`;

export function layoutLabels(): void {
  const s = vp.zoom / vp.dpr; // CSS pixels per design point
  const left = (vp.cssW - DESIGN_W * s) / 2;
  const top = (vp.cssH - DESIGN_H * s) / 2;
  layer.style.transform = `translate(${left}px, ${top}px) scale(${s})`;
}

/** Fade the whole label layer, in step with the camera fades. */
export function fadeLabels(to: 0 | 1, ms: number): void {
  layer.style.transition = `opacity ${ms}ms ease`;
  layer.style.opacity = String(to);
}

export function clearLabels(): void {
  layer.replaceChildren();
}

/** A label centred on (x, y) in design coordinates. */
export function addLabel(text: string, x: number, y: number, cls: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `fk-label ${cls}`;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  layer.append(el);
  return el;
}

/** Restart a CSS animation class on an element. */
export function replay(el: HTMLElement, cls: string): void {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
