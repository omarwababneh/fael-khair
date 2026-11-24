import Phaser from 'phaser';
import { DESIGN_H, DESIGN_W, view, vp } from '../core/viewport';
import { clearLabels, fadeLabels, layoutLabels } from '../core/labels';
import { session, type Adventure } from '../core/session';
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

  /** Fit the 390 x 844 design frame inside the screen. */
  protected fit(): void {
    const cam = this.cameras.main;
    cam.setSize(vp.w, vp.h);
    cam.setZoom(vp.zoom);
    cam.centerOn(DESIGN_W / 2, DESIGN_H / 2);
    for (const c of this.covers) this.sizeCover(c.img, c.factor);
    layoutLabels();
    this.onLayout();
  }

  /** Scenes override to re-place things anchored to the screen edges. */
  protected onLayout(): void {}

  /**
   * A background centred on the design frame, `factor` times the frame height,
   * and never smaller than what the camera shows. Keeping its size tied to the
   * design frame keeps art and gameplay lined up on every phone.
   */
  protected addCover(key: string, factor = 1.12, depth = 0): Phaser.GameObjects.Image {
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
    const v = view();
    const s = Math.max((DESIGN_H * factor) / img.frame.height, (v.h + 4) / img.frame.height, (v.w + 4) / img.frame.width);
    img.setScale(s);
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
   * Every adventure ends the same way: the father's hadith line over a calm
   * final frame, then back to the map. Nothing about the player changes.
   */
  protected async finishAdventure(id: Adventure, hadithLine: string): Promise<void> {
    this.setIdle(null);
    // The story's consequence is done: the place counts even if he taps home now.
    session.done.add(id);
    await Voice.say(hadithLine);
    if (!this.alive) return;
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
