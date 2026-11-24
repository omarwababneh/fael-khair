import Phaser from 'phaser';
import { motes } from '../../core/fx';
import { music } from '../../core/music';
import { session, sunStep } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';

interface Pin {
  id: string;
  name: string; // with full vowel marks
  line: string;
  x: number; // design-frame position (390 x 844), roughly true geography
  y: number;
  /** Scene to open, if this place has an adventure built. */
  scene?: string;
  adventure?: boolean;
}

// Positions follow the real map (north at top). Tune them here once bg_map arrives.
export const PINS: Pin[] = [
  { id: 'ummqais', name: 'أُمّ قَيْس', line: 'map_ummqais', x: 124, y: 158, adventure: true },
  { id: 'irbid', name: 'إِرْبِد', line: 'map_irbid', x: 262, y: 180, adventure: true },
  { id: 'jerash', name: 'جَرَش', line: 'map_jerash', x: 214, y: 262 },
  { id: 'amman', name: 'عَمّان', line: 'map_amman', x: 288, y: 338, adventure: true },
  { id: 'deadsea', name: 'البَحْر المَيِّت', line: 'map_deadsea', x: 104, y: 390 },
  { id: 'petra', name: 'البَتْرا', line: 'map_petra', x: 150, y: 498, scene: 'petra', adventure: true },
  { id: 'wadirum', name: 'وادي رَمّ', line: 'map_wadirum', x: 268, y: 572 },
  { id: 'aqaba', name: 'العَقَبة', line: 'map_aqaba', x: 86, y: 632 },
];

// The sun's path across the top of the map, from morning to sunset (west).
const SUN_PATH = [
  { x: 330, y: 112, color: 0xffd84a },
  { x: 268, y: 92, color: 0xffcc40 },
  { x: 200, y: 86, color: 0xffb93a },
  { x: 134, y: 94, color: 0xff9c38 },
  { x: 72, y: 116, color: 0xff7b36 },
];
const WARMTH = [0, 0.05, 0.1, 0.15, 0.22];

export class MapScene extends BaseScene {
  private busy = false;
  private idleTimer?: Phaser.Time.TimerEvent;
  private sun!: Phaser.GameObjects.Container;
  private sunDisc!: Phaser.GameObjects.Arc;
  private tint: Phaser.GameObjects.Rectangle | null = null;
  private removeLock: (() => void) | null = null;

  constructor() {
    super('map');
  }

  create(): void {
    // Fields survive a scene restart; clear references to last visit's objects.
    this.tint = null;
    this.idleTimer = undefined;
    this.setup();
    this.busy = false;
    ui.setPill(null);
    ui.setHome(null);
    ui.clearBubble();
    music.play('map');

    const bg = this.addCover('bg_map');
    this.tweens.add({ targets: bg, scale: bg.scale * 1.015, duration: 7000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const v = view();
    this.tint = this.add.rectangle(v.x, v.y, v.w, v.h, 0xff9a4a, 0).setOrigin(0).setDepth(1).setBlendMode(Phaser.BlendModes.MULTIPLY);
    motes(this, v, 2);

    this.makeSun();
    for (const p of PINS) this.makePin(p);

    this.removeLock = ui.showLock(() => this.openParent());
    this.events.once('shutdown', () => {
      this.removeLock?.();
      this.removeLock = null;
    });

    this.input.on('pointerdown', () => this.resetIdle());
    void this.greet();
  }

  protected onLayout(): void {
    if (this.tint) {
      const v = view();
      this.tint.setPosition(v.x, v.y).setSize(v.w, v.h);
    }
  }

  private async greet(): Promise<void> {
    const target = sunStep();
    const from = session.shownSunStep;
    this.placeSun(from, false);
    await this.wait(500);
    if (!this.alive) return;
    if (target !== from) {
      // The only sign of progress: the sun moves one step toward sunset.
      this.placeSun(target, true);
      session.shownSunStep = target;
      await this.wait(1600);
      if (!this.alive) return;
    }
    if (!this.busy) {
      const first = !session.greeted;
      session.greeted = true;
      await Voice.say(first ? 'start' : 'map_next');
    }
    this.resetIdle();
  }

  private resetIdle(): void {
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(9000, () => {
      if (this.alive && !this.busy) void Voice.say('map_hint');
    });
  }

  private makeSun(): void {
    const rays = this.add.graphics();
    rays.fillStyle(0xffe27a, 0.55);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays.fillTriangle(
        Math.cos(a - 0.12) * 30, Math.sin(a - 0.12) * 30,
        Math.cos(a + 0.12) * 30, Math.sin(a + 0.12) * 30,
        Math.cos(a) * 46, Math.sin(a) * 46,
      );
    }
    const glow = this.add.image(0, 0, 'fx_glow').setDisplaySize(150, 150).setAlpha(0.8);
    this.sunDisc = this.add.circle(0, 0, 25, SUN_PATH[0].color).setStrokeStyle(3, 0x4a2c17);
    this.sun = this.add.container(0, 0, [glow, rays, this.sunDisc]).setDepth(3);
    this.tweens.add({ targets: rays, angle: 360, duration: 40000, repeat: -1 });
    this.tweens.add({ targets: glow, scale: glow.scale * 1.12, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private placeSun(step: number, animate: boolean): void {
    const s = SUN_PATH[Math.min(step, SUN_PATH.length - 1)];
    const warmth = WARMTH[Math.min(step, WARMTH.length - 1)];
    if (!animate) {
      this.sun.setPosition(s.x, s.y);
      this.sunDisc.setFillStyle(s.color);
      this.tint?.setFillStyle(0xff9a4a, warmth);
      return;
    }
    sfx('chime', { volume: 0.5 });
    this.tweens.add({ targets: this.sun, x: s.x, y: s.y, duration: 1500, ease: 'Sine.easeInOut' });
    this.tweens.addCounter({
      from: 0, to: 1, duration: 1500,
      onUpdate: (tw) => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(this.sunDisc.fillColor),
          Phaser.Display.Color.ValueToColor(s.color), 1, tw.getValue() ?? 0);
        this.sunDisc.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        this.tint?.setFillStyle(0xff9a4a, Phaser.Math.Linear(this.tint.fillAlpha, warmth, tw.getValue() ?? 0));
      },
    });
  }

  private makePin(p: Pin): void {
    const big = !!p.adventure;
    const r = big ? 22 : 16;
    const ring = this.add.image(0, 0, 'fx_ring').setDisplaySize(r * 3.2, r * 3.2).setAlpha(big ? 0.9 : 0.6);
    const dot = this.add.circle(0, 0, r * 0.55, big ? 0xc8623a : 0xfbf1dc).setStrokeStyle(3, 0x4a2c17);
    const label = this.text(0, r + 20, p.name, 22);
    const padX = 12;
    const lw = label.width + padX * 2;
    const pill = this.add.graphics();
    pill.fillStyle(0xfbf1dc, 0.94);
    pill.lineStyle(2.5, 0x4a2c17, 1);
    pill.fillRoundedRect(-lw / 2, r + 3, lw, 36, 18);
    pill.strokeRoundedRect(-lw / 2, r + 3, lw, 36, 18);
    const c = this.add.container(p.x, p.y, [ring, pill, dot, label]).setDepth(10);
    // Generous hit area: covers the pin and its label (at least 56 points).
    const hw = Math.max(34, lw / 2 + 4);
    c.setInteractive(new Phaser.Geom.Rectangle(-hw, -34, hw * 2, r + 3 + 36 + 34 + 4), Phaser.Geom.Rectangle.Contains);
    // Gentle life: every pin breathes a little, out of step with the others.
    this.tweens.add({ targets: ring, scale: ring.scale * 1.15, duration: 1300 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 800 });
    c.on('pointerdown', () => this.tapPin(p, c));
  }

  private async tapPin(p: Pin, c: Phaser.GameObjects.Container): Promise<void> {
    if (this.busy) return;
    sfx('pop');
    this.tweens.add({ targets: c, scale: { from: 1.3, to: 1 }, duration: 450, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, y: { from: p.y - 14, to: p.y }, duration: 450, ease: 'Bounce.easeOut' });
    if (!p.scene) {
      void Voice.say(p.line);
      return;
    }
    this.busy = true;
    sfx('whoosh');
    const said = Voice.say(p.line);
    await Promise.race([said, this.wait(3500)]);
    if (!this.alive) return;
    this.goTo(p.scene);
  }

  private openParent(): void {
    this.busy = true;
    Voice.stop(false);
    ui.openParent({
      musicOn: music.isOn,
      voice: Voice.voiceLabel,
      onMusic: (on) => music.setOn(on),
      onClose: () => {
        this.busy = false;
        this.resetIdle();
      },
    });
  }
}
