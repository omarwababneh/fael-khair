import Phaser from 'phaser';
import { fitHeight } from '../../core/assets';
import { dustPuff, HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { completeMission, currentLap } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { PIC, view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';
import { breathe, pose } from '../kit';

// A2. Amman: the block tower (value: self-control when angry; source
// bukhari_6114). MISSIONS_V2.md section 5.
// He stacks blocks by dropping each at the right moment. His little sister
// knocks the tower over; his face goes hot. He breathes three slow breaths
// (press and hold while a circle grows, let go while it shrinks), says how he
// feels, she says she wanted to play too, and they rebuild it together, taller.
// The anger is never called bad.

const FLOOR = 700; // on the rug of bg_amman_home
const BOY = { x: 120, h: 150 };
const TOWER_X = 236;
const BLOCK_H = BOY.h * 0.2; // owner: 0.2 of the boy, so each block reads clearly (DECISIONS 116)
const SISTER_H = BOY.h * 0.75;
const COLORS = [0xf2a65a, 0x7cc0e8, 0xf06f6f, 0x9ad17a, 0xf5d36a, 0xc59be0, 0xf2a65a, 0x7cc0e8, 0xf06f6f, 0x9ad17a];
const BREATH_MS = 2400; // to breathe in fully
const CIRCLE = { x: 195, y: 410, min: 26, max: 96 };

type State = 'intro' | 'build' | 'fall' | 'breathe' | 'talk' | 'rebuild' | 'end';

export class BlocksScene extends BaseScene {
  private state: State = 'intro';
  private boy!: Phaser.GameObjects.Image;
  private sister: Phaser.GameObjects.Image | null = null;
  private tower: Phaser.GameObjects.Image[] = [];
  private swinging: Phaser.GameObjects.Image | null = null;
  private swingTween: Phaser.Tweens.Tween | null = null;
  private target = 5;
  private firstHeight = 0;
  private swingMs = 1600;
  private tolerance = 0.7;
  private hot: Phaser.GameObjects.Image | null = null;
  private circle!: Phaser.GameObjects.Graphics;
  private radius = CIRCLE.min;
  private holding = -1;
  private breaths = 0;
  private reachedFull = false;
  private hint!: HintHand;
  private dropping = false;

  constructor() {
    super('a2');
  }

  create(): void {
    this.setup();
    this.state = 'intro';
    this.tower = [];
    this.swinging = null;
    this.swingTween = null;
    this.sister = this.hot = null;
    this.radius = CIRCLE.min;
    this.holding = -1;
    this.breaths = 0;
    this.reachedFull = false;
    this.dropping = false;
    this.hint = new HintHand(this);
    // First lap: five blocks, a slow swing and a forgiving catch. Later laps: seven, a little quicker.
    const lap = currentLap();
    this.target = lap ? 7 : 5;
    this.swingMs = lap ? 1250 : 1600;
    this.tolerance = lap ? 0.55 : 0.7;

    ui.setPill('عَمّان');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('amman');

    const bg = this.addCover('bg_amman_home');
    this.tweens.add({ targets: bg, scale: bg.scale * 1.01, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    motes(this, { x: 20, y: 160, w: 350, h: 480 }, 40);

    this.boy = this.add.image(BOY.x, FLOOR, 'boy_happy').setOrigin(0.5, 1).setDepth(30);
    fitHeight(this.boy, BOY.h);
    breathe(this, this.boy);

    this.circle = this.add.graphics().setDepth(90).setVisible(false);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    this.events.once('shutdown', () => this.hint.clear());

    void this.intro();
  }

  update(_t: number, dt: number): void {
    if (this.state !== 'breathe') return;
    // Holding: breathe in (the circle grows). Let go: breathe out (it shrinks).
    const range = CIRCLE.max - CIRCLE.min;
    const step = (range * dt) / BREATH_MS;
    if (this.holding !== -1) {
      this.radius = Math.min(CIRCLE.max, this.radius + step);
      if (this.radius >= CIRCLE.max - 1) this.reachedFull = true;
    } else {
      this.radius = Math.max(CIRCLE.min, this.radius - step * 1.2);
      if (this.reachedFull && this.radius <= CIRCLE.min + 1) {
        this.reachedFull = false;
        this.breathDone();
      }
    }
    this.drawCircle();
  }

  private async intro(): Promise<void> {
    this.open('a2_open');
    this.state = 'build';
    this.nextBlock();
    this.setIdle(() => this.showHint());
  }

  // ---------------------------------------------------------------- building

  private topY(): number {
    return FLOOR - this.tower.length * BLOCK_H;
  }

  private nextBlock(from?: { x: number; y: number }): void {
    const i = this.tower.length;
    const y = Math.min(this.topY() - 70, 560);
    const b = this.add.image(from?.x ?? TOWER_X, from?.y ?? y, 'block').setOrigin(0.5, 1).setDepth(40).setTint(COLORS[i % COLORS.length]);
    fitHeight(b, BLOCK_H);
    // It can be dropped only once it swings (not while the sister hands it over).
    this.swinging = null;
    const swing = () => {
      if (!this.alive) return;
      this.swinging = b;
      b.setPosition(TOWER_X - 46, y);
      this.swingTween = this.tweens.add({ targets: b, x: TOWER_X + 46, duration: this.swingMs, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    };
    if (from) this.tweens.add({ targets: b, x: TOWER_X - 46, y, duration: 450, ease: 'Sine.easeOut', onComplete: swing });
    else swing();
  }

  private drop(): void {
    const b = this.swinging;
    if (!b || this.dropping) return;
    this.dropping = true;
    this.swingTween?.stop();
    this.tweens.killTweensOf(b);
    this.swinging = null;
    const below = this.tower[this.tower.length - 1];
    const cx = below ? below.x : TOWER_X;
    const w = b.frame.width * b.scaleX;
    const off = b.x - cx;
    const lands = Math.abs(off) < w * this.tolerance;
    const y = this.topY();
    this.tweens.add({
      targets: b, y, duration: 260, ease: 'Quad.easeIn',
      onComplete: () => {
        this.dropping = false;
        if (lands) {
          // It settles a little toward the middle, so the tower stays upright.
          b.x = cx + off * 0.4;
          this.tower.push(b);
          sfx('knock', { volume: 0.6 });
          this.tweens.add({ targets: b, scaleY: { from: b.scaleY * 0.85, to: b.scaleY }, duration: 200, ease: 'Back.easeOut' });
          sfx('chime', { volume: 0.3 }); // a finished step
          this.afterLanding();
        } else {
          // Too far out: it slips off and he simply tries again.
          sfx('slide', { volume: 0.6 });
          this.tweens.add({ targets: b, x: b.x + Math.sign(off) * 50, y: FLOOR, angle: Math.sign(off) * 80, alpha: 0, duration: 500, onComplete: () => b.destroy() });
          this.time.delayedCall(500, () => this.alive && this.nextBlock(this.state === 'rebuild' ? this.sisterHands() : undefined));
        }
      },
    });
  }

  private afterLanding(): void {
    if (this.state === 'build') {
      if (this.tower.length >= this.target) void this.knockedOver();
      else this.time.delayedCall(250, () => this.alive && this.nextBlock());
    } else if (this.state === 'rebuild') {
      if (this.tower.length >= this.firstHeight + 2) void this.ending();
      else this.time.delayedCall(250, () => this.alive && this.nextBlock(this.sisterHands()));
    }
  }

  // ---------------------------------------------------------------- the knock

  private async knockedOver(): Promise<void> {
    this.state = 'fall';
    this.setIdle(null);
    this.firstHeight = this.tower.length;
    pose(this, this.boy, 'boy_happy', BOY.h);
    await this.wait(700);
    if (!this.alive) return;
    // His little sister toddles in and knocks it over.
    const v = view();
    const s = this.add.image(v.right + 40, FLOOR + 4, 'sister_play').setOrigin(0.5, 1).setDepth(35);
    fitHeight(s, SISTER_H);
    this.sister = s;
    this.tweens.add({ targets: s, angle: { from: -3, to: 3 }, duration: 200, yoyo: true, repeat: 5 });
    await new Promise<void>((res) => this.tweens.add({ targets: s, x: TOWER_X + 40, duration: 1300, ease: 'Sine.easeIn', onComplete: () => res() }));
    if (!this.alive) return;
    sfx('bounce', { weight: 0.8 });
    for (const [i, b] of this.tower.entries()) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      this.tweens.add({ targets: b, x: b.x + dir * Phaser.Math.Between(20, 70) - 20, y: FLOOR + Phaser.Math.Between(-4, 10), angle: dir * Phaser.Math.Between(40, 160), duration: 420 + i * 40, ease: 'Quad.easeIn' });
      this.time.delayedCall(420 + i * 40, () => this.alive && sfx('knock', { volume: 0.5 }));
    }
    dustPuff(this, TOWER_X, FLOOR, 10, 0xe8d8b8, 45);
    // His face goes hot: a warm red at the edges and a short rumble.
    pose(this, this.boy, 'boy_angry', BOY.h);
    this.hot = this.add.image(PIC.x + PIC.w / 2, PIC.y + PIC.h / 2, 'fx_vignette').setDepth(85).setAlpha(0);
    this.hot.setDisplaySize(view().w + 20, view().h + 20);
    this.tweens.add({ targets: this.hot, alpha: 0.75, duration: 500 });
    this.cameras.main.shake(400, 0.004);
    sfx('thud', { weight: 0.9, volume: 0.7 });
    await this.wait(900);
    if (!this.alive) return;
    pose(this, s, 'sister_sorry', SISTER_H);
    await this.wait(400);
    if (!this.alive) return;
    // The anger is not called bad: first, three slow breaths.
    await Voice.say('a2_hot');
    if (!this.alive) return;
    this.startBreathing();
  }

  // ---------------------------------------------------------------- breathing

  private startBreathing(): void {
    this.state = 'breathe';
    this.radius = CIRCLE.min;
    this.circle.setVisible(true);
    this.drawCircle();
    pose(this, this.boy, 'boy_breathe', BOY.h);
    void Voice.say('a2_breathe');
    this.setIdle(() => this.showHint());
  }

  private drawCircle(): void {
    const g = this.circle;
    g.clear();
    g.fillStyle(0xbfe6ff, 0.35);
    g.fillCircle(CIRCLE.x, CIRCLE.y, this.radius);
    g.lineStyle(4, 0xffffff, 0.9);
    g.strokeCircle(CIRCLE.x, CIRCLE.y, this.radius);
    g.lineStyle(2, 0xffffff, 0.5);
    g.strokeCircle(CIRCLE.x, CIRCLE.y, CIRCLE.max);
  }

  private breathDone(): void {
    this.breaths++;
    // The red fades with each breath.
    if (this.hot) this.tweens.add({ targets: this.hot, alpha: 0.75 * (1 - this.breaths / 3), duration: 600 });
    this.tweens.add({ targets: this.boy, scaleY: { from: this.boy.scaleY * 1.02, to: this.boy.scaleY }, duration: 600 });
    if (this.breaths >= 3) void this.talk();
  }

  private async talk(): Promise<void> {
    this.state = 'talk';
    this.setIdle(null);
    this.holding = -1;
    this.tweens.add({ targets: this.circle, alpha: 0, duration: 500, onComplete: () => this.circle.setVisible(false).setAlpha(1) });
    this.hot?.destroy();
    this.hot = null;
    pose(this, this.boy, 'boy_idle', BOY.h);
    await this.wait(500);
    if (!this.alive) return;
    // He says how he feels; she says she wanted to play too.
    await Voice.say('a2_feel');
    if (!this.alive) return;
    await Voice.say('a2_sister');
    if (!this.alive) return;
    // They rebuild together: she hands him the blocks.
    for (const b of this.tower) this.tweens.add({ targets: b, alpha: 0, duration: 400, onComplete: () => b.destroy() });
    this.tower = [];
    if (this.sister) {
      pose(this, this.sister, 'sister_happy', SISTER_H);
      this.tweens.add({ targets: this.sister, x: TOWER_X + 70, duration: 500 });
    }
    pose(this, this.boy, 'boy_happy', BOY.h);
    await Voice.say('a2_together');
    if (!this.alive) return;
    this.state = 'rebuild';
    this.nextBlock(this.sisterHands());
    this.setIdle(() => this.showHint());
  }

  private sisterHands(): { x: number; y: number } {
    return { x: (this.sister?.x ?? TOWER_X + 70) - 10, y: FLOOR - SISTER_H * 0.5 };
  }

  private async ending(): Promise<void> {
    this.state = 'end';
    this.setIdle(null);
    // The consequence: a taller tower, built together.
    completeMission('amman');
    if (this.sister) this.tweens.add({ targets: this.sister, y: FLOOR - 8, duration: 200, yoyo: true, repeat: 1 });
    this.tweens.add({ targets: this.boy, y: FLOOR - 8, duration: 200, yoyo: true, repeat: 1 });
    await this.wait(900);
    if (!this.alive) return;
    await Voice.say('a2_end');
    if (!this.alive) return;
    await this.finishAdventure('amman', 'a2_hadith');
  }

  // ---------------------------------------------------------------- input

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive) return;
    this.hint.clear();
    if (this.state === 'build' || this.state === 'rebuild') this.drop();
    else if (this.state === 'breathe' && this.holding === -1) this.holding = p.id;
  }

  private up(p: Phaser.Input.Pointer): void {
    if (p.id === this.holding) this.holding = -1;
    this.kickIdle();
  }

  private showHint(): void {
    if (!this.alive) return;
    const again = () => this.kickIdle();
    if ((this.state === 'build' || this.state === 'rebuild') && this.swinging) {
      this.hint.show('tap', { x: TOWER_X, y: this.topY() - 30 }, undefined, again);
    } else if (this.state === 'breathe' && this.holding === -1) {
      this.hint.show('hold', { x: CIRCLE.x, y: CIRCLE.y }, { x: CIRCLE.x, y: CIRCLE.y }, again);
    } else again();
  }
}
