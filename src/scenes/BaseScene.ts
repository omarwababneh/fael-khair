import Phaser from 'phaser';
import { DESIGN_H, DESIGN_W, view, vp } from '../core/viewport';
import { ui } from '../core/ui';
import { Voice } from '../core/voice';

export const FONT = '"Baloo Bhaijaan 2", sans-serif';

/** Shared camera fitting, background covering and scene changes. */
export abstract class BaseScene extends Phaser.Scene {
  /** False once the scene is leaving; async steps check it before acting. */
  alive = false;
  private covers: Array<{ img: Phaser.GameObjects.Image; factor: number }> = [];

  protected setup(): void {
    this.alive = true;
    this.covers = [];
    this.fit();
    const onResize = () => this.fit();
    this.game.events.on('fk-resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.alive = false;
      this.game.events.off('fk-resize', onResize);
      this.tweens.killAll();
      this.time.removeAllEvents();
    });
    this.cameras.main.fadeIn(350, 243, 223, 180);
  }

  /** Fit the 390 x 844 design frame inside the screen. */
  protected fit(): void {
    const cam = this.cameras.main;
    cam.setSize(vp.w, vp.h);
    cam.setZoom(vp.zoom);
    cam.centerOn(DESIGN_W / 2, DESIGN_H / 2);
    for (const c of this.covers) this.sizeCover(c.img, c.factor);
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

  protected sizeCover(img: Phaser.GameObjects.Image, factor: number): void {
    const v = view();
    const s = Math.max((DESIGN_H * factor) / img.frame.height, (v.h + 4) / img.frame.height, (v.w + 4) / img.frame.width);
    img.setScale(s);
  }

  /** Text drawn in the world (pin labels, small exclamations). */
  protected text(x: number, y: number, s: string, size: number, color = '#4a2c17'): Phaser.GameObjects.Text {
    // Phaser's `rtl` option breaks on iPhone Safari (it ignores the canvas
    // direction, so only one letter showed). Drawing left-to-right is safe:
    // Arabic letters still join and run right to left on their own, and the
    // right-to-left marks (U+200F) keep punctuation such as "!" on the correct side.
    return this.add.text(x, y, `\u200F${s}\u200F`, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color,
      resolution: Math.max(1, vp.zoom),
      padding: { x: 4, y: 6 },
    }).setOrigin(0.5);
  }

  /** Leave for another scene with a soft fade. */
  goTo(key: string, data?: object): void {
    if (!this.alive) return;
    this.alive = false;
    Voice.stop(false);
    ui.setHome(null);
    this.input.enabled = false;
    this.cameras.main.fadeOut(350, 243, 223, 180);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(key, data));
  }

  /** Promise that resolves after ms of game time (pauses with the game). */
  wait(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, () => res()));
  }
}
