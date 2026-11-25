import Phaser from 'phaser';
import { COVER_FACTOR, DESIGN_H, DESIGN_W, vp } from '../core/viewport';
import { clearLabels, fadeLabels, layoutLabels } from '../core/labels';
import { completeMission, type Place } from '../core/session';
import { ui } from '../core/ui';
import { Voice } from '../core/voice';

/** The cream edge colors of the map picture (top and bottom rows, measured). */
export const MAP_CREAM = '#f9e8ce';
const MAP_TOP = 0xfbe7c9;
const MAP_BOTTOM = 0xf8e8d3;

/** Shared camera fitting, background covering and scene changes. */
export abstract class BaseScene extends Phaser.Scene {
  /** False once the scene is leaving; async steps check it before acting. */
  alive = false;
  private covers: Array<{ img: Phaser.GameObjects.Image; factor: number }> = [];
  private baseIdleTimer?: Phaser.Time.TimerEvent;
  private idleAction: (() => void) | null = null;

  protected setup(): void {
    this.alive = true;
    this.covers = [];
    this.baseIdleTimer = undefined;
    this.idleAction = null;
    this.input.on('pointerdown', () => this.kickIdle());
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
    return img;
  }

  /**
   * The map picture: shown whole, 390 points wide in the design frame (cropping
   * it would cut off the Dead Sea and Aqaba). The space around it is filled with
   * the picture's own cream color.
   */
  protected addMapPicture(key: string): Phaser.GameObjects.Image {
    this.cameras.main.setBackgroundColor(MAP_CREAM);
    const img = this.add.image(DESIGN_W / 2, DESIGN_H / 2, key).setDepth(0);
    img.setScale(DESIGN_W / img.frame.width);
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
  protected setIdle(action: (() => void) | null, ms = 6000): void {
    this.idleAction = action;
    this.kickIdle(ms);
  }

  protected kickIdle(ms = 6000): void {
    this.baseIdleTimer?.remove();
    this.baseIdleTimer = undefined;
    if (!this.idleAction || !this.alive) return;
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
    // The story's consequence is done: the place counts even if he taps home now.
    completeMission(place);
    if (closingLine) {
      await Voice.say(closingLine);
      if (!this.alive) return;
    }
    await this.wait(2600);
    if (!this.alive) return;
    this.goTo('map');
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

  /** Promise that resolves after ms of game time (pauses with the game). */
  wait(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, () => res()));
  }
}
