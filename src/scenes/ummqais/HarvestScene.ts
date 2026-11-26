import Phaser from 'phaser';
import { fitHeight, fitWidth } from '../../core/assets';
import { HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { completeMission, currentLap } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';
import { breathe, pose } from '../kit';

// U3. Umm Qais: sharing the harvest (value: fairness between two; source
// bukhari_2989, part "justice"). MISSIONS_V2.md section 5.
// Two friends picked olives together all morning, so they are owed the same
// share. He deals handfuls into their baskets, then checks with a balance scale
// and moves a handful across until the beam is level.

const GROUND = 712; // feet on the soil of bg_ummqais_grove
const BOY_H = 140;
const FRIEND_H = 140; // friends: the boy's age (art checklist 1.0)
const LEFT = { friend: 46, basket: 96 };
const RIGHT = { friend: 344, basket: 294 };
const PILE = { x: 195, y: GROUND + 4 };
// The balance scale (art: scale_base 0.8, scale_beam 0.9 wide, scale_pan 0.3).
const SCALE_FOOT = GROUND - 22; // it stands a little farther back than the baskets
const BASE_H = BOY_H * 0.8;
const BEAM_W = BOY_H * 0.9;
const PAN_H = BOY_H * 0.3;
const TILT_PER = 7; // degrees per handful of difference
const HANDFUL_W = BOY_H * 0.25;

type State = 'intro' | 'deal' | 'weigh' | 'end';
type Side = 'left' | 'right';

interface Handful { img: Phaser.GameObjects.Image; w: number }

export class HarvestScene extends BaseScene {
  private state: State = 'intro';
  private boy!: Phaser.GameObjects.Image;
  private friends: Record<Side, Phaser.GameObjects.Image> = {} as Record<Side, Phaser.GameObjects.Image>;
  private baskets: Record<Side, Phaser.GameObjects.Image> = {} as Record<Side, Phaser.GameObjects.Image>;
  private inBasket: Record<Side, Handful[]> = { left: [], right: [] };
  private inPan: Record<Side, Handful[]> = { left: [], right: [] };
  private pile!: Phaser.GameObjects.Image;
  private pileLeft: number[] = []; // weights of the handfuls still in the pile
  private pileScale = 1;
  private beam: Phaser.GameObjects.Image | null = null;
  private pans: Record<Side, Phaser.GameObjects.Image> | null = null;
  private held: { h: Handful; from: 'pile' | Side } | null = null;
  private dragId = -1;
  private hint!: HintHand;

  constructor() {
    super('u3');
  }

  create(): void {
    this.setup();
    this.state = 'intro';
    this.inBasket = { left: [], right: [] };
    this.inPan = { left: [], right: [] };
    this.beam = null;
    this.pans = null;
    this.held = null;
    this.dragId = -1;
    this.hint = new HintHand(this);
    // First lap: eight even handfuls. Later laps: one handful is a double one.
    this.pileLeft = currentLap() ? [1, 1, 1, 2, 1, 1, 1, 1, 1] : [1, 1, 1, 1, 1, 1, 1, 1];

    ui.setPill('أُمّ قَيْس');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('ummqais');

    const bg = this.addCover('bg_ummqais_grove');
    this.tweens.add({ targets: bg, scale: bg.scale * 1.01, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    motes(this, { x: 20, y: 160, w: 350, h: 480 }, 40);

    this.friends.left = this.add.image(LEFT.friend, GROUND, 'friend_a').setOrigin(0.5, 1).setDepth(30);
    this.friends.right = this.add.image(RIGHT.friend, GROUND, 'friend_b').setOrigin(0.5, 1).setDepth(30);
    for (const f of Object.values(this.friends)) { fitHeight(f, FRIEND_H); breathe(this, f); }
    for (const side of ['left', 'right'] as Side[]) {
      const b = this.add.image(side === 'left' ? LEFT.basket : RIGHT.basket, GROUND + 8, 'basket_empty').setOrigin(0.5, 1).setDepth(34);
      fitHeight(b, BOY_H * 0.5);
      this.baskets[side] = b;
    }
    this.pile = this.add.image(PILE.x, PILE.y, 'olives_pile').setOrigin(0.5, 1).setDepth(35).setScale(0.01);
    this.pileScale = (BOY_H * 0.9) / this.pile.frame.width;

    this.boy = this.add.image(PILE.x, GROUND - 26, 'boy_idle').setOrigin(0.5, 1).setDepth(29);
    fitHeight(this.boy, BOY_H * 0.95); // a step farther back, behind the pile
    breathe(this, this.boy);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    this.events.once('shutdown', () => this.hint.clear());
    this.time.addEvent({ delay: 7000, loop: true, callback: () => Math.random() < 0.6 && sfx('birds', { volume: 0.45 }) });

    void this.intro();
  }

  /** Briefly: the two friends picking together, the pile growing between them. */
  private async intro(): Promise<void> {
    const said = Voice.say('u3_open');
    for (const f of Object.values(this.friends)) {
      this.tweens.add({ targets: f, angle: { from: -3, to: 3 }, duration: 380, yoyo: true, repeat: 5, ease: 'Sine.easeInOut' });
    }
    const drops = this.add.particles(0, 0, 'fx_dot', {
      x: { min: PILE.x - 40, max: PILE.x + 40 }, y: GROUND - 200, speedY: { min: 200, max: 280 }, gravityY: 300,
      scale: { min: 0.25, max: 0.4 }, lifespan: 600, frequency: 90, tint: [0x6b7a2a, 0x3d2a3a, 0x8a9a3a],
    }).setDepth(36);
    this.tweens.add({ targets: this.pile, scale: this.pileScale, duration: 3200, ease: 'Sine.easeOut' });
    this.time.addEvent({ delay: 600, repeat: 4, callback: () => sfx('rustle', { volume: 0.5 }) });
    await Promise.all([said, this.wait(3400)]);
    drops.emitting = false;
    if (!this.alive) return;
    this.state = 'deal';
    void Voice.say('u3_deal');
    this.setIdle(() => this.showHint());
  }

  // ---------------------------------------------------------------- input

  private handfulImg(x: number, y: number, w: number): Handful {
    const img = this.add.image(x, y, 'olives_pile').setDepth(70);
    fitWidth(img, HANDFUL_W * (w > 1 ? 1.45 : 1));
    return { img, w };
  }

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive || this.held) return;
    this.hint.clear();
    const x = p.worldX, y = p.worldY;
    if (this.state === 'deal' && this.pileLeft.length && Math.abs(x - PILE.x) < 70 && Math.abs(y - (PILE.y - 18)) < 50) {
      const w = this.pileLeft.shift() as number;
      this.held = { h: this.handfulImg(x, y - 10, w), from: 'pile' };
      this.shrinkPile();
      pose(this, this.boy, 'boy_lift', BOY_H * 0.95 * 0.8);
      sfx('grab', { volume: 0.6 });
    } else if (this.state === 'weigh' && this.pans) {
      for (const side of ['left', 'right'] as Side[]) {
        const pan = this.pans[side];
        const list = this.inPan[side];
        if (!list.length || Phaser.Math.Distance.Between(x, y, pan.x, pan.y + PAN_H * 0.7) > 46) continue;
        const h = list.pop() as Handful;
        h.img.setDepth(70);
        this.held = { h, from: side };
        this.tilt();
        sfx('grab', { volume: 0.6 });
        break;
      }
    }
    if (this.held) this.dragId = p.id;
  }

  private move(p: Phaser.Input.Pointer): void {
    if (!this.held || p.id !== this.dragId) return;
    this.held.h.img.setPosition(p.worldX, p.worldY - 10);
  }

  private up(p: Phaser.Input.Pointer): void {
    if (!this.held || p.id !== this.dragId) return;
    const { h, from } = this.held;
    this.held = null;
    this.dragId = -1;
    pose(this, this.boy, 'boy_idle', BOY_H * 0.95);
    if (this.state === 'deal') {
      const side = (['left', 'right'] as Side[]).find((s) => Phaser.Math.Distance.Between(h.img.x, h.img.y, this.baskets[s].x, this.baskets[s].y - 30) < 62);
      if (side) this.intoBasket(h, side);
      else {
        // Back onto the pile.
        this.pileLeft.unshift(h.w);
        this.shrinkPile();
        this.tweens.add({ targets: h.img, x: PILE.x, y: PILE.y - 14, alpha: 0, duration: 260, onComplete: () => h.img.destroy() });
      }
    } else if (this.state === 'weigh' && this.pans) {
      const to = (['left', 'right'] as Side[]).find((s) => Phaser.Math.Distance.Between(h.img.x, h.img.y, this.pans![s].x, this.pans![s].y + PAN_H * 0.6) < 60) ?? (from as Side);
      this.intoPan(h, to);
      this.tilt();
      if (this.level()) void this.balanced();
    }
    this.kickIdle();
  }

  // ---------------------------------------------------------------- dealing

  private shrinkPile(): void {
    const total = currentLap() ? 10 : 8;
    const left = this.pileLeft.reduce((a, b) => a + b, 0);
    this.tweens.add({ targets: this.pile, scale: this.pileScale * Math.max(0.0001, left / total), duration: 200 });
  }

  private intoBasket(h: Handful, side: Side): void {
    const b = this.baskets[side];
    this.inBasket[side].push(h);
    sfx('rustle', { volume: 0.6 });
    this.tweens.add({ targets: h.img, x: b.x + Phaser.Math.Between(-10, 10), y: b.y - BOY_H * 0.36, scale: h.img.scale * 0.7, duration: 200, onComplete: () => h.img.setVisible(false) });
    if (b.texture.key !== 'basket_olives') {
      b.setTexture('basket_olives');
      fitHeight(b, BOY_H * 0.55);
    }
    this.tweens.add({ targets: b, scaleY: { from: b.scaleY * 0.9, to: b.scaleY }, duration: 260, ease: 'Back.easeOut' });
    if (!this.pileLeft.length) void this.weigh();
  }

  // ---------------------------------------------------------------- weighing

  private pivot(): { x: number; y: number } {
    return { x: PILE.x, y: SCALE_FOOT - BASE_H + 6 };
  }

  /** The beam's hook on one side, for the current tilt. */
  private hook(side: Side): { x: number; y: number } {
    const p = this.pivot();
    const a = Phaser.Math.DegToRad(this.beam?.angle ?? 0);
    const dx = (side === 'left' ? -1 : 1) * BEAM_W * 0.46, dy = BEAM_W * 0.1;
    return { x: p.x + dx * Math.cos(a) - dy * Math.sin(a), y: p.y + dx * Math.sin(a) + dy * Math.cos(a) };
  }

  private weightOf(side: Side): number {
    return this.inPan[side].reduce((a, h) => a + h.w, 0);
  }

  private level(): boolean {
    return this.weightOf('left') === this.weightOf('right');
  }

  /** He checks with the scale: each basket's olives go into its pan. */
  private async weigh(): Promise<void> {
    this.state = 'end'; // nothing to touch while the scale is set up
    this.setIdle(null);
    await this.wait(400);
    if (!this.alive) return;
    void Voice.say('u3_check');
    const base = this.add.image(PILE.x, SCALE_FOOT, 'scale_base').setOrigin(0.5, 1).setDepth(31).setAlpha(0);
    fitHeight(base, BASE_H);
    this.beam = this.add.image(this.pivot().x, this.pivot().y, 'scale_beam').setDepth(32).setAlpha(0);
    fitWidth(this.beam, BEAM_W);
    this.pans = {
      left: this.add.image(0, 0, 'scale_pan').setOrigin(0.5, 0.03).setDepth(33).setAlpha(0),
      right: this.add.image(0, 0, 'scale_pan').setOrigin(0.5, 0.03).setDepth(33).setAlpha(0),
    };
    for (const pan of Object.values(this.pans)) fitHeight(pan, PAN_H);
    this.placePans();
    this.tweens.add({ targets: [base, this.beam, this.pans.left, this.pans.right], alpha: 1, duration: 500 });
    await this.wait(800);
    if (!this.alive) return;
    // Out of the baskets and into the pans.
    for (const side of ['left', 'right'] as Side[]) {
      for (const h of this.inBasket[side]) {
        h.img.setVisible(true).setAlpha(1);
        fitWidth(h.img, HANDFUL_W * (h.w > 1 ? 1.45 : 1) * 0.8);
        this.intoPan(h, side);
      }
      this.inBasket[side] = [];
      this.baskets[side].setTexture('basket_empty');
      fitHeight(this.baskets[side], BOY_H * 0.5);
    }
    sfx('rustle', { volume: 0.7 });
    await this.wait(500);
    if (!this.alive) return;
    this.tilt();
    await this.wait(900);
    if (!this.alive) return;
    if (this.level()) {
      void this.balanced();
      return;
    }
    this.state = 'weigh';
    void Voice.say('u3_move');
    this.setIdle(() => this.showHint());
  }

  private intoPan(h: Handful, side: Side): void {
    this.inPan[side].push(h);
    h.img.setDepth(34);
    this.arrangePan(side, true);
  }

  /** Handfuls sit in a little heap in the pan's bowl. */
  private arrangePan(side: Side, animate: boolean): void {
    if (!this.pans) return;
    const pan = this.pans[side];
    this.inPan[side].forEach((h, i) => {
      const x = pan.x + ((i % 3) - 1) * 9, y = pan.y + PAN_H * 0.62 - Math.floor(i / 3) * 6;
      if (animate) this.tweens.add({ targets: h.img, x, y, duration: 240, ease: 'Sine.easeOut' });
      else h.img.setPosition(x, y);
    });
  }

  private placePans(): void {
    if (!this.pans) return;
    for (const side of ['left', 'right'] as Side[]) {
      const hk = this.hook(side);
      this.pans[side].setPosition(hk.x, hk.y);
      this.arrangePan(side, false);
    }
  }

  /** The heavier side goes down; a level beam means a fair share. */
  private tilt(): void {
    if (!this.beam) return;
    const diff = this.weightOf('right') - this.weightOf('left');
    const to = Phaser.Math.Clamp(diff * TILT_PER, -18, 18);
    sfx('creak', { volume: 0.4 });
    this.tweens.add({ targets: this.beam, angle: to, duration: 600, ease: 'Back.easeOut', onUpdate: () => this.placePans() });
  }

  private async balanced(): Promise<void> {
    this.state = 'end';
    this.setIdle(null);
    await this.wait(700);
    if (!this.alive) return;
    sfx('chime', { volume: 0.45 }); // the beam is level: a finished step
    await Voice.say('u3_level');
    if (!this.alive || !this.pans) return;
    // Back into the baskets: two full, equal baskets.
    for (const side of ['left', 'right'] as Side[]) {
      const b = this.baskets[side];
      for (const h of this.inPan[side]) this.tweens.add({ targets: h.img, x: b.x, y: b.y - BOY_H * 0.36, alpha: 0, duration: 400 });
      this.time.delayedCall(420, () => { b.setTexture('basket_olives'); fitHeight(b, BOY_H * 0.55); });
    }
    sfx('rustle', { volume: 0.6 });
    await this.wait(800);
    if (!this.alive) return;
    // Both friends carry a full basket home.
    completeMission('ummqais');
    const said = Voice.say('u3_end');
    const v = view();
    for (const side of ['left', 'right'] as Side[]) {
      const f = this.friends[side], b = this.baskets[side];
      const out = side === 'left' ? v.x - 90 : v.right + 90;
      this.tweens.killTweensOf(f);
      f.setFlipX(side === 'left'); // friend_a faces right, friend_b faces left: each turns to go
      this.tweens.add({ targets: b, x: f.x, y: GROUND - FRIEND_H * 0.32, duration: 400 });
      this.tweens.add({ targets: [f, b], x: out, duration: 3000, delay: 450, ease: 'Sine.easeIn' });
      this.tweens.add({ targets: f, angle: { from: -2, to: 2 }, duration: 260, yoyo: true, repeat: 6, delay: 450 });
    }
    this.time.addEvent({ delay: 420, repeat: 6, callback: () => sfx('step', { volume: 0.35 }) });
    pose(this, this.boy, 'boy_happy', BOY_H * 0.95);
    await Promise.all([said, this.wait(3500)]);
    if (!this.alive) return;
    await this.finishAdventure('ummqais', 'u3_hadith');
  }

  // ---------------------------------------------------------------- hints

  private showHint(): void {
    if (!this.alive || this.held) return this.kickIdle();
    const again = () => this.kickIdle();
    if (this.state === 'deal') {
      // Toward the basket with less in it.
      const side: Side = this.inBasket.left.length <= this.inBasket.right.length ? 'left' : 'right';
      const b = this.baskets[side];
      this.hint.show('drag', { x: PILE.x, y: PILE.y - 16 }, { x: b.x, y: b.y - 30 }, again);
    } else if (this.state === 'weigh' && this.pans) {
      const heavy: Side = this.weightOf('left') > this.weightOf('right') ? 'left' : 'right';
      const light: Side = heavy === 'left' ? 'right' : 'left';
      this.hint.show('drag', { x: this.pans[heavy].x, y: this.pans[heavy].y + PAN_H * 0.6 }, { x: this.pans[light].x, y: this.pans[light].y + PAN_H * 0.6 }, again);
    } else again();
  }
}
