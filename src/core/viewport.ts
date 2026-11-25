// One coordinate system for every scene (DECISIONS.md 95).
//
// Every background picture is 1170 x 1755 pixels and is always drawn at the same
// fixed scale, centered on the 390 x 844 design frame. So a world point is a
// fixed spot of the picture, whatever the screen: pic() converts picture pixels
// to world units, and characters and objects placed in world units always land
// on the same spot of the picture.
//
// The camera shows a portrait frame:
//  - it always shows the whole 390 x 844 design frame (the play area);
//  - on a taller or wider phone it shows a little more of the picture around it;
//  - it never shows past the edge of the picture. On a wide screen (a laptop, a
//    tablet) the frame is centered and the rest of the window is a plain bar.
// The canvas is drawn at device resolution (capped at 2x for a steady frame rate).
export const DESIGN_W = 390;
export const DESIGN_H = 844;

/** Background pictures (all the same size) and the fixed scale they are drawn at. */
export const PIC_PX = { w: 1170, h: 1755 };
export const COVER_FACTOR = 1.12; // the picture is 1.12 times the design frame's height
/** World units per picture pixel. */
export const PIC_SCALE = (DESIGN_H * COVER_FACTOR) / PIC_PX.h;
/** The picture's rectangle in world units. */
export const PIC = {
  w: PIC_PX.w * PIC_SCALE,
  h: PIC_PX.h * PIC_SCALE,
  x: DESIGN_W / 2 - (PIC_PX.w * PIC_SCALE) / 2,
  y: DESIGN_H / 2 - (PIC_PX.h * PIC_SCALE) / 2,
};

/** A point given in background-picture pixels, in world units. */
export function pic(px: number, py: number): { x: number; y: number } {
  return { x: PIC.x + px * PIC_SCALE, y: PIC.y + py * PIC_SCALE };
}

/** A length given in background-picture pixels, in world units. */
export const picLen = (px: number): number => px * PIC_SCALE;

export const vp = {
  dpr: 1,
  cssW: DESIGN_W,
  cssH: DESIGN_H,
  /** canvas size in device pixels */
  w: DESIGN_W,
  h: DESIGN_H,
  /** canvas pixels per world unit */
  zoom: 1,
  /** the portrait frame the camera draws into, in canvas pixels */
  frame: { x: 0, y: 0, w: DESIGN_W, h: DESIGN_H },
};

export function measure(): void {
  vp.dpr = Math.min(window.devicePixelRatio || 1, 2);
  vp.cssW = Math.max(1, window.innerWidth);
  vp.cssH = Math.max(1, window.innerHeight);
  vp.w = Math.round(vp.cssW * vp.dpr);
  vp.h = Math.round(vp.cssH * vp.dpr);
  // The whole design frame always fits.
  vp.zoom = Math.min(vp.w / DESIGN_W, vp.h / DESIGN_H);
  // Show more of the picture where the screen allows, but never past its edges.
  // Rounded down, so the frame never shows past the picture's edge.
  const fw = Math.floor(Math.min(vp.w / vp.zoom, PIC.w) * vp.zoom);
  const fh = Math.floor(Math.min(vp.h / vp.zoom, PIC.h) * vp.zoom);
  vp.frame = { x: Math.round((vp.w - fw) / 2), y: Math.round((vp.h - fh) / 2), w: fw, h: fh };
  // The HTML interface (place name, home button, speech bubble) follows the frame.
  const css = document.documentElement.style;
  css.setProperty('--frame-left', `${vp.frame.x / vp.dpr}px`);
  css.setProperty('--frame-top', `${vp.frame.y / vp.dpr}px`);
  css.setProperty('--frame-width', `${fw / vp.dpr}px`);
  css.setProperty('--frame-height', `${fh / vp.dpr}px`);
  // A short frame (a 16:9 phone, a laptop window) gets a smaller speech-bubble
  // text, so a line that wraps does not push the bubble over things he must touch.
  document.documentElement.toggleAttribute('data-short-frame', fh / vp.dpr < 760);
  // The plain bars around the frame: they cover anything drawn past the picture
  // and swallow touches, so a hand resting on a bar never reaches the game.
  const bars = document.getElementById('bars');
  if (bars) {
    const [l, r, t, b] = Array.from(bars.children) as HTMLElement[];
    const fx = vp.frame.x / vp.dpr, fy = vp.frame.y / vp.dpr, cw = fw / vp.dpr, chh = fh / vp.dpr;
    Object.assign(l.style, { left: '0px', top: '0px', width: `${fx}px`, height: '100%' });
    Object.assign(r.style, { left: `${fx + cw}px`, top: '0px', right: '0px', height: '100%' });
    Object.assign(t.style, { left: `${fx}px`, top: '0px', width: `${cw}px`, height: `${fy}px` });
    Object.assign(b.style, { left: `${fx}px`, top: `${fy + chh}px`, width: `${cw}px`, bottom: '0px' });
  }
}

/** The world rectangle of the portrait frame (what the player sees). */
export function view(): { x: number; y: number; w: number; h: number; bottom: number; right: number } {
  const w = vp.frame.w / vp.zoom;
  const h = vp.frame.h / vp.zoom;
  const x = DESIGN_W / 2 - w / 2;
  const y = DESIGN_H / 2 - h / 2;
  return { x, y, w, h, bottom: y + h, right: x + w };
}

/** Convert CSS pixels (DOM) to world units. */
export function cssToWorld(px: number): number {
  return (px * vp.dpr) / vp.zoom;
}
