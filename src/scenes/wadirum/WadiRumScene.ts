import Phaser from 'phaser';
import { fitHeight, hasAudio } from '../../core/assets';
import { audio } from '../../core/audio';
import { registry } from '../../core/content';
import { music } from '../../core/music';
import { nightAmbience, setSfxMuted, sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';

// Wadi Rum: the night sky (value: reflection on creation and gratitude;
// source quran_3_190). Slow and quiet: no goal, no count.
//
// The ayah rules (GAME_SPEC.md sections 2 and 4E): it is shown only here, as
// still text; never animated as a prize, never draggable or collectible; never
// read by a synthetic voice. All game input and all sound effects stop while it
// is on screen, and the music fades out fully before it appears.

const BOY = { x: 195, y: 712, h: 150 };
const SKY_BOTTOM = 560; // the sky fills the upper two thirds of bg_wadirum_night
const PLAY_MS = 30000; // about 30 seconds of stars
const STOPPED_MS = 9000; // ...or he has stopped touching for a while
const SILENT_AYAH_MS = 10000; // without a recitation file, the ayah is shown in silence

export class WadiRumScene extends BaseScene {
  private playing = false;
  private touchedOnce = false;
  private lastTouch = 0;
  private startedAt = 0;
  private stopAmbience: (() => void) | null = null;
  private removeDone: (() => void) | null = null;
  private lastSpark = 0;

  constructor() {
    super('wadirum');
  }

  create(): void {
    this.setup();
    this.playing = false;
    this.touchedOnce = false;
    this.stopAmbience = null;
    this.removeDone = null;

    ui.setPill('وادي رَمّ');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('wadirum');
    setSfxMuted(false, 0.3);
    this.stopAmbience = nightAmbience();
    this.events.once('leave', () => this.cleanUp());
    this.events.once('shutdown', () => this.cleanUp());

    const bg = this.addCover('bg_wadirum_night');
    this.tweens.add({ targets: bg, scale: bg.scale * 1.01, duration: 12000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // The boy sits on a rock, seen from behind, looking up.
    const boy = this.add.image(BOY.x, BOY.y, 'boy_sit_back').setOrigin(0.5, 1).setDepth(30);
    fitHeight(boy, BOY.h);
    this.tweens.add({ targets: boy, scaleY: boy.scaleY * 1.012, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Faint twinkles everywhere, so the sky is never perfectly still.
    const v = view();
    const twinkle = this.add.particles(0, 0, 'fx_dot', {
      x: { min: v.x, max: v.right },
      y: { min: v.y + 60, max: SKY_BOTTOM },
      scale: { min: 0.08, max: 0.22 },
      alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.8 },
      lifespan: { min: 1800, max: 3600 },
      frequency: 140,
      blendMode: Phaser.BlendModes.ADD,
    });
    twinkle.setDepth(10);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.touch(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => p.isDown && this.touch(p));

    this.time.addEvent({ delay: 5200, loop: true, callback: () => this.playing && Math.random() < 0.75 && this.shootingStar() });
    void this.begin();
  }

  private cleanUp(): void {
    this.stopAmbience?.();
    this.stopAmbience = null;
    this.removeDone?.();
    this.removeDone = null;
    setSfxMuted(false, 0.3);
  }

  private async begin(): Promise<void> {
    await this.wait(600);
    if (!this.alive) return;
    this.playing = true;
    this.startedAt = this.time.now;
    this.lastTouch = this.time.now;
    void Voice.say('wr_open');
    // Ends after about 30 seconds, or once he has stopped touching the sky.
    const check = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => {
        if (!this.playing) return;
        const now = this.time.now;
        const idleLimit = this.touchedOnce ? STOPPED_MS : STOPPED_MS + 6000;
        if (now - this.startedAt > PLAY_MS || now - this.lastTouch > idleLimit) {
          check.remove();
          void this.ayah();
        }
      },
    });
  }

  /** Stars brighten where his finger passes. */
  private touch(p: Phaser.Input.Pointer): void {
    if (!this.playing) return;
    this.touchedOnce = true;
    this.lastTouch = this.time.now;
    if (p.worldY > SKY_BOTTOM) return;
    if (this.time.now - this.lastSpark < 70) return;
    this.lastSpark = this.time.now;
    const star = this.add.image(p.worldX + Phaser.Math.Between(-10, 10), p.worldY + Phaser.Math.Between(-10, 10), 'fx_dot')
      .setDepth(12).setBlendMode(Phaser.BlendModes.ADD).setScale(0.05).setTint(Math.random() < 0.3 ? 0xfff1c4 : 0xffffff);
    this.tweens.add({ targets: star, scale: 0.55 + Math.random() * 0.35, duration: 380, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: star, alpha: 0.35, scale: 0.3, delay: 900, duration: 2600, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: star, alpha: 0, delay: 6000, duration: 4000, onComplete: () => star.destroy() });
    if (Math.random() < 0.35) sfx('twinkle', { volume: 0.6 });
  }

  /** Now and then a shooting star crosses (particles). */
  private shootingStar(): void {
    const v = view();
    const x0 = Phaser.Math.Between(v.x + 80, v.right - 20), y0 = Phaser.Math.Between(v.y + 80, 260);
    const head = this.add.image(x0, y0, 'fx_dot').setDepth(11).setBlendMode(Phaser.BlendModes.ADD).setScale(0.3);
    const trail = this.add.particles(0, 0, 'fx_dot', {
      follow: head, lifespan: 500, frequency: 16, scale: { start: 0.22, end: 0 }, alpha: { start: 0.8, end: 0 }, blendMode: Phaser.BlendModes.ADD,
    }).setDepth(11);
    this.tweens.add({
      targets: head, x: x0 - 220, y: y0 + 120, alpha: 0, duration: 1100, ease: 'Sine.easeIn',
      onComplete: () => { head.destroy(); this.time.delayedCall(600, () => trail.destroy()); },
    });
  }

  private async ayah(): Promise<void> {
    if (!this.alive) return;
    this.playing = false;
    await Voice.say('wr_subhan');
    if (!this.alive) return;

    // Everything else stops: input, sound effects, and the music fades out fully.
    this.input.enabled = false;
    ui.setHome(null);
    ui.setPill(null);
    ui.clearBubble();
    setSfxMuted(true, 1.2);
    this.stopAmbience?.();
    this.stopAmbience = null;
    music.stop(2.4);
    await this.wait(2800);
    if (!this.alive) return;

    const entry = registry.find((r) => r.source_id === 'quran_3_190') as { original_arabic?: string } | undefined;
    const block = ui.showAyah(entry?.original_arabic ?? '', 'آل عمران ١٩٠');
    await this.wait(2400); // let it fade in
    if (!this.alive) return block.hide(0);
    // A real recitation if the file exists; otherwise the text in silence.
    if (hasAudio('quran', '3_190') && audio.ready) {
      const played = await audio.playFile('assets/audio/quran/3_190.m4a');
      if (!played) await this.wait(SILENT_AYAH_MS);
      else await this.wait(1200);
    } else {
      await this.wait(SILENT_AYAH_MS);
    }
    if (!this.alive) return block.hide(0);
    await block.hide(1800);
    if (!this.alive) return;

    // The father's goodnight line, then the end of the day.
    setSfxMuted(false, 0.5);
    await Voice.say('wr_night');
    if (!this.alive) return;
    this.removeDone = ui.showDone('خلصنا لليوم', () => {
      this.removeDone = null;
      this.goTo('start'); // the start screen begins a fresh day
    });
  }
}
