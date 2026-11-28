import Phaser from 'phaser';
import { COVER_FACTOR, DESIGN_H, DESIGN_W, vp } from '../core/viewport';
import { clearLabels, fadeLabels, layoutLabels } from '../core/labels';
import { completeMission, session, type Place } from '../core/session';
import { ui } from '../core/ui';
import { Voice } from '../core/voice';
import { addAnimals } from './animals';
import { addGrowth } from './growth';
import { LayerSet } from './layers';

/** Before his first touch in a scene, the hint hand shows after this long. */
const FIRST_HINT_MS = 3000;

/** The cream edge colors of the map picture (top and bottom rows, measured). */
export const MAP_CREAM = '#f9e8ce';
const MAP_TOP = 0xfbe7c9;
const MAP_BOTTOM = 0xf8e8d3;
/** The map is drawn this fraction of the design frame's width: an 18-point margin each side at 390. */
export const MAP_SCALE = (DESIGN_W - 36) / DESIGN_W;
/** A point measured on the map drawn 390 wide (the old layout), where it is now. */
export const onMap = (x: number, y: number): { x: number; y: number } => ({
  x: DESIGN_W / 2 + (x - DESIGN_W / 2) * MAP_SCALE,
  y: DESIGN_H / 2 + (y - DESIGN_H / 2) * MAP_SCALE,
});

/** After the closing line, free time begins this long after. */
const FREE_START_MS = 1200;
/** In free time, the father asks once whether to go on after this long. Nothing forces him out. */
const FREE_INVITE_MS = 45000;
/** The smallest touch area of a free-time thing, in points (the touch-size rule). */
const FREE_MIN_HIT = 56;

/**
 * Something in the scene that reacts in free time. A reaction is small, soft and
 * the same every time: no goal, no count, no praise, nothing stored.
 */
export interface FreeTarget {
  /** What he touches. */
  obj: Phaser.GameObjects.GameObject & { getBounds: () => Phaser.Geom.Rectangle; visible: boolean };
  /** A touch area other than the picture's bounds, in world points. */
  area?: () => Phaser.Geom.Rectangle;
  /** The motion and sound; returns how long it lasts. Touches meanwhile do nothing. */
  react: () => number;
}

/** Shared camera fitting, background covering and scene changes. */
export abstract class BaseScene extends Phaser.Scene {
  /** False once the scene is leaving; async steps check it before acting. */
  alive = false;
  private covers: Array<{ img: Phaser.GameObjects.Image; factor: number }> = [];
  private baseIdleTimer?: Phaser.Time.TimerEvent;
  private idleAction: (() => void) | null = null;
  private idleMs = 6000;
  /** Until his first touch, the hint comes sooner: the first easy win within ten seconds. */
  private touched = false;
  private earlyHint = true;
  /** Free time after an ordinary mission: the scene stays open until he taps home. */
  protected inFreeTime = false;
  /** Everything that reacts in free time now (the scene's things and its animals). */
  freeActive: FreeTarget[] = [];
  /** The moving layers over this scene's background (version 3 part B). */
  protected layers: LayerSet | null = null;
  /** The father says world_grown before the first line (a plant here has grown). */
  private grownPending = false;

  protected setup(): void {
    this.alive = true;
    this.inFreeTime = false;
    this.layers = null;
    this.grownPending = false;
    this.freeActive = [];
    this.covers = [];
    this.baseIdleTimer = undefined;
    this.idleAction = null;
    this.touched = false;
    this.input.on('pointerdown', () => {
      this.touched = true;
      this.kickIdle();
    });
    clearLabels();
    this.fit();
    const onResize = () => this.fit();
    this.game.events.on('fk-resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.alive = false;
      clearLabels();
      this.game.events.off('fk-resize', onResize);
      this.tweens.killAll();
      this.time.removeAllEvents();
    });
    this.cameras.main.fadeIn(350, 243, 223, 180);
    fadeLabels(0, 0);
    requestAnimationFrame(() => fadeLabels(1, 350));
  }

  /**
   * The camera covers the whole canvas (so a touch always maps to the right
   * world point), zoomed so the 390 x 844 design frame fits and centred on it.
   * Anything past the portrait frame is covered by the HTML bars (main.ts).
   */
  protected fit(): void {
    const cam = this.cameras.main;
    cam.setViewport(0, 0, vp.w, vp.h);
    cam.setZoom(vp.zoom);
    cam.centerOn(DESIGN_W / 2, DESIGN_H / 2);
    for (const c of this.covers) this.sizeCover(c.img, c.factor);
    layoutLabels();
    this.onLayout();
  }

  /** Scenes override to re-place things anchored to the screen edges. */
  protected onLayout(): void {}

  /**
   * A background picture, centred on the design frame at the one fixed scale
   * (see core/viewport.ts). Its size never depends on the screen, so the
   * characters and objects placed on it stay on the same spot of the picture.
   */
  protected addCover(key: string, factor = COVER_FACTOR, depth = 0): Phaser.GameObjects.Image {
    const img = this.add.image(DESIGN_W / 2, DESIGN_H / 2, key).setDepth(depth);
    this.covers.push({ img, factor });
    this.sizeCover(img, factor);
    if (!this.layers) {
      // The background's moving layers, and (an ordinary mission only) the plant
      // that shows how the place has grown.
      this.layers = new LayerSet(this, img, key);
      const run = session.current;
      this.grownPending = addGrowth(this, this.scene.key, run?.place, !run || run.quiet);
    }
    return img;
  }

  /**
   * The scene's first line. If a plant here has reached its first bigger stage,
   * the father says world_grown first (once, on arrival).
   */
  protected sayOpening(id: string): Promise<boolean> {
    if (!this.grownPending) return Voice.say(id);
    this.grownPending = false;
    // The opening line always follows, even if world_grown was cut short (a replay
    // tap on the bubble): once nothing is speaking.
    return Voice.say('world_grown').then(async () => {
      for (let i = 0; i < 40 && this.alive && Voice.busy; i++) await this.wait(200);
      return this.alive ? Voice.say(id) : false;
    });
  }

  /**
   * The map picture: shown whole, with a margin on every side (MAP_SCALE of the
   * design frame's width), so nothing touches the screen edge at any phone size.
   * The space around it is filled with the picture's own cream color.
   */
  protected addMapPicture(key: string): Phaser.GameObjects.Image {
    this.cameras.main.setBackgroundColor(MAP_CREAM);
    const img = this.add.image(DESIGN_W / 2, DESIGN_H / 2, key).setDepth(0);
    img.setScale((DESIGN_W * MAP_SCALE) / img.frame.width);
    // Bands above and below in the picture's own edge colors, so no seam shows.
    const h = img.frame.height * img.scale;
    const top = DESIGN_H / 2 - h / 2, bottom = DESIGN_H / 2 + h / 2;
    this.add.rectangle(DESIGN_W / 2, top - 600, 3000, 1200 + 1, MAP_TOP).setDepth(-1);
    this.add.rectangle(DESIGN_W / 2, bottom + 600, 3000, 1200 + 1, MAP_BOTTOM).setDepth(-1);
    return img;
  }

  protected sizeCover(img: Phaser.GameObjects.Image, factor: number): void {
    // Delivered backgrounds and their placeholders share the 2:3 shape, so one
    // fixed scale puts every background on the same picture rectangle.
    img.setScale((DESIGN_H * factor) / img.frame.height);
  }

  /**
   * What to show if he does nothing for 6 seconds (the hint hand).
   * Any touch restarts the wait; null switches hints off.
   */
  protected setIdle(action: (() => void) | null, ms = 6000, early = true): void {
    this.idleAction = action;
    this.idleMs = ms;
    this.earlyHint = early;
    this.kickIdle(ms);
  }

  /** Restart the wait; it keeps the delay the hint was set with. */
  protected kickIdle(ms = this.idleMs): void {
    this.baseIdleTimer?.remove();
    this.baseIdleTimer = undefined;
    if (!this.idleAction || !this.alive) return;
    if (!this.touched && this.earlyHint) ms = Math.min(ms, FIRST_HINT_MS);
    this.baseIdleTimer = this.time.delayedCall(ms, () => {
      if (this.alive && this.idleAction) this.idleAction();
    });
  }

  /**
   * Every mission ends the same way: the father's closing line (from the
   * registry) over a calm final frame, then back to the map. A quiet deed passes
   * null: no closing line at all. Nothing about the player changes.
   */
  protected async finishAdventure(place: Place, closingLine: string | null): Promise<void> {
    this.setIdle(null);
    // The layers go still for the father's closing line, and for good at a quiet deed's final moment.
    this.layers?.still(true);
    // The story's consequence is done: the place counts even if he taps home now.
    completeMission(place);
    if (closingLine) {
      await Voice.say(closingLine);
      if (!this.alive) return;
    }
    await this.afterClosing(2600);
  }

  /**
   * What the scene can offer in free time (two or three things). Scenes with an
   * ordinary mission override this; a quiet deed and Wadi Rum never have free time.
   */
  protected freeTargets(): FreeTarget[] {
    return [];
  }

  /**
   * Called once as free time begins: a scene may settle its view first, and
   * returns how long that takes (free time and free_open start after it).
   */
  protected onFreeTime(): number {
    return 0;
  }

  /**
   * After an ordinary mission's closing line: free time if the scene offers it,
   * otherwise (and always after a quiet deed) back to the map after `ms`.
   */
  protected async afterClosing(ms: number): Promise<void> {
    const run = session.current;
    const targets = run && !run.quiet ? this.freeTargets() : [];
    if (!targets.length) {
      await this.wait(ms);
      if (!this.alive) return;
      this.goTo('map');
      return;
    }
    await this.wait(FREE_START_MS);
    if (!this.alive) return;
    this.freeTime(targets);
  }

  /**
   * Free time: the scene stays open. The father says free_open once; the
   * things in `targets` react to a touch; after 45 seconds he says free_invite
   * once. The home button takes him to the map whenever he wants.
   */
  private freeTime(targets: FreeTarget[]): void {
    this.setIdle(null);
    ui.setHome(() => this.goTo('map'));
    const settle = this.onFreeTime();
    if (settle > 0) {
      this.time.delayedCall(settle, () => this.alive && this.freeTimeNow(targets));
      return;
    }
    this.freeTimeNow(targets);
  }

  private freeTimeNow(targets: FreeTarget[]): void {
    this.inFreeTime = true;
    // The layers move again, and the place's small animals come out.
    this.layers?.still(false);
    targets = [...targets, ...addAnimals(this, this.scene.key)];
    this.freeActive = targets;
    const busyUntil = new Map<FreeTarget, number>();
    const areaOf = (t: FreeTarget): Phaser.Geom.Rectangle => {
      const r = t.area ? t.area() : t.obj.getBounds();
      const w = Math.max(r.width, FREE_MIN_HIT), h = Math.max(r.height, FREE_MIN_HIT);
      return new Phaser.Geom.Rectangle(r.centerX - w / 2, r.centerY - h / 2, w, h);
    };
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.alive || !this.inFreeTime) return;
      let best: FreeTarget | null = null;
      let bestD = Infinity;
      for (const t of targets) {
        if (!t.obj.active || !t.obj.visible || ((t.obj as unknown as { alpha?: number }).alpha ?? 1) < 0.05) continue;
        const r = areaOf(t);
        if (!r.contains(p.worldX, p.worldY)) continue;
        const d = Phaser.Math.Distance.Between(p.worldX, p.worldY, r.centerX, r.centerY);
        if (d < bestD) { bestD = d; best = t; }
      }
      if (!best || this.time.now < (busyUntil.get(best) ?? 0)) return;
      busyUntil.set(best, this.time.now + best.react());
    });
    void Voice.say('free_open');
    this.time.delayedCall(FREE_INVITE_MS, () => {
      if (this.alive && this.inFreeTime) void Voice.say('free_invite');
    });
  }

  /** Leave for another scene with a soft fade. */
  goTo(key: string, data?: object): void {
    if (!this.alive) return;
    this.alive = false;
    this.events.emit('leave');
    Voice.stop(false);
    ui.setHome(null);
    this.input.enabled = false;
    this.cameras.main.fadeOut(350, 243, 223, 180);
    fadeLabels(0, 350);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(key, data));
  }

  /**
   * The opening: one line, then (if nothing else has been said meanwhile) what to
   * do. Never awaited: he can act as soon as the scene is visible.
   */
  protected open(first: string, then?: string): void {
    void this.sayOpening(first).then((ended) => {
      // Only after the opening ended by itself (a replay or another line cancels it).
      if (this.alive && then && ended) void Voice.say(then);
    });
  }

  /** Promise that resolves after ms of game time (pauses with the game). */
  wait(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, () => res()));
  }
}
