// Design at 390 x 844 logical points; scale to fit any phone.
// The canvas is drawn at device resolution (capped at 2x for steady frame rate).
// Each scene's camera zooms so the 390 x 844 design frame fits inside the
// screen; backgrounds are sized to cover everything the camera can see.
export const DESIGN_W = 390;
export const DESIGN_H = 844;

export const vp = {
  dpr: 1,
  cssW: DESIGN_W,
  cssH: DESIGN_H,
  w: DESIGN_W,
  h: DESIGN_H,
  /** canvas pixels per design point */
  zoom: 1,
};

export function measure(): void {
  vp.dpr = Math.min(window.devicePixelRatio || 1, 2);
  vp.cssW = Math.max(1, window.innerWidth);
  vp.cssH = Math.max(1, window.innerHeight);
  vp.w = Math.round(vp.cssW * vp.dpr);
  vp.h = Math.round(vp.cssH * vp.dpr);
  vp.zoom = Math.min(vp.w / DESIGN_W, vp.h / DESIGN_H);
}

/** The world rectangle the camera currently shows. */
export function view(): { x: number; y: number; w: number; h: number; bottom: number; right: number } {
  const w = vp.w / vp.zoom;
  const h = vp.h / vp.zoom;
  const x = DESIGN_W / 2 - w / 2;
  const y = DESIGN_H / 2 - h / 2;
  return { x, y, w, h, bottom: y + h, right: x + w };
}

/** Convert CSS pixels (DOM) to world units. */
export function cssToWorld(px: number): number {
  return (px * vp.dpr) / vp.zoom;
}
