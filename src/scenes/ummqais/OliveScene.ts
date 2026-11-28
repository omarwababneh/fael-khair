import Phaser from 'phaser';
import { fitHeight, fitWidth } from '../../core/assets';
import { droplets, dustPuff, glowRing, HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { completeMission, currentLap } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { PIC, view } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene, type FreeTarget } from '../BaseScene';
import { breathe, freeHop, freeSway, pose, PourCan, walkTo, type PourTarget } from '../kit';

// U2. Umm Qais: the olive saplings (value: planting good that others enjoy
// later; patience; trust in Allah; source muslim_1553a). MISSIONS_V2.md section 5.
// He digs, sets three saplings, presses the soil and waters them, each a little
// trickier. Then the seasons pass: the trees grow, birds come to eat, a stranger
// rests in the shade, long after the work.
//
// The same grove at dusk is Umm Qais's quiet deed (scene key 'ummqais-dusk',
// section 6): a neighbor's young trees are wilting; he waters them while nobody
// is there and goes; in the evening they stand up straight. No chime, no
// hadith line, nobody thanks him.

// Measured on bg_ummqais_grove: bare soil from y = 570 down; the terraces above.
const GROUND = 706;
const SPOTS = [80, 200, 320];
const BOY_H = 140;
// Heights from the art checklist (boy = 1.0).
// The sapling he lifts and the can are drawn larger than the checklist: at least 44 points tall.
const H = { sapling: 0.35, lying: 0.55, soil: 0.15, can: 0.4, young: 0.9, grown: 2.2, stranger: 0.85, birds: 0.25, stone: 0.48 };
const CAN_REST = { x: 360, y: GROUND + 2 };
const RUB_NEED = [260, 460, 320]; // points of rubbing to dig each hole; the second soil is harder
const POUR_NEED = [1500, 1800, 2600]; // ms of pouring; the last one needs a longer pour

type State = 'intro' | 'stone' | 'dig' | 'plant' | 'press' | 'water' | 'busy' | 'end';

interface Spot {
  x: number;
  tree: Phaser.GameObjects.Image | null;
  mound: Phaser.GameObjects.Image | null;
  pour: PourTarget;
}

export class OliveScene extends BaseScene {
  private state: State = 'intro';
  private quiet = false;
  private boy!: Phaser.GameObjects.Image;
  private can!: PourCan;
  private spots: Spot[] = [];
  private cur = 0;
  private rubbed = 0;
  private presses = 0;
  private stone: Phaser.GameObjects.Image | null = null;
  private stoneHome = { x: 0, y: 0 };
  private lying: Phaser.GameObjects.Image | null = null;
  private drag: 'stone' | 'sapling' | 'can' | 'rub' | null = null;
  private dragId = -1;
  private last = new Phaser.Math.Vector2();
  private ring: Phaser.GameObjects.Image | null = null;
  private hint!: HintHand;
  private lastPuff = 0;
  private said = { hard: false };

  constructor(key = 'u2') {
    super(key);
  }

  create(): void {
    this.quiet = this.scene.key === 'ummqais-dusk';
    this.setup();
    this.state = 'intro';
    this.spots = [];
    this.cur = 0;
    this.rubbed = 0;
    this.presses = 0;
    this.stone = this.lying = this.ring = null;
    this.drag = null;
    this.dragId = -1;
    this.said = { hard: false };
    this.hint = new HintHand(this);

    ui.setPill('أُمّ قَيْس');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('ummqais', { natureOnly: this.quiet }); // a quiet deed has no music

    const bg = this.addCover('bg_ummqais_grove');
    this.tweens.add({ targets: bg, scale: bg.scale * 1.01, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    motes(this, { x: 20, y: 160, w: 350, h: 480 }, 40);

    const lap = currentLap();
    for (const [i, x] of SPOTS.entries()) {
      const need = this.quiet ? 1400 + i * 300 : POUR_NEED[i] * (lap ? 1.2 : 1);
      this.spots.push({ x, tree: null, mound: null, pour: { x, y: GROUND - 40, progress: 0, need, done: false } });
    }

    // At dusk he stands in front of the trees, between the second and the third.
    this.boy = this.add.image(this.quiet ? 262 : SPOTS[0] - 44, this.quiet ? GROUND + 18 : GROUND + 8, 'boy_idle').setOrigin(0.5, 1).setDepth(36);
    fitHeight(this.boy, BOY_H);
    breathe(this, this.boy);
    this.can = new PourCan(this, CAN_REST.x, CAN_REST.y, BOY_H * H.can);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    this.events.once('shutdown', () => this.hint.clear());
    this.time.addEvent({ delay: 7000, loop: true, callback: () => Math.random() < 0.6 && sfx('birds', { volume: 0.45 }) });

    if (this.quiet) void this.startDusk();
    else void this.startPlanting();
  }

  update(_t: number, dt: number): void {
    if (this.state !== 'water') return;
    // In U2 only the sapling just planted takes water; at dusk, any wilting tree.
    const targets = this.quiet ? this.spots.map((s) => s.pour) : [this.spots[this.cur].pour];
    const done = this.can.update(dt, targets);
    if (done) this.watered(this.spots.find((s) => s.pour === done) as Spot);
  }

  // ---------------------------------------------------------------- U2

  private async startPlanting(): Promise<void> {
    // The opening, then what to do; the first spot does not say it again.
    this.open('u2_open', 'u2_dig');
    this.beginSpot(0);
  }

  private beginSpot(i: number): void {
    this.cur = i;
    this.rubbed = 0;
    this.presses = 0;
    const s = this.spots[i];
    void walkTo(this, this.boy, { x: s.x - 44 }, BOY_H).then(() => {
      if (!this.alive) return;
      pose(this, this.boy, 'boy_kneel', BOY_H * 0.65);
      // The third spot has a stone on it to move first (heavier on a later lap).
      if (i === 2) {
        const w = BOY_H * H.stone; // heavier on a later lap: it follows the finger more slowly
        this.stoneHome = { x: s.x + 4, y: GROUND - 6 };
        this.stone = this.add.image(this.stoneHome.x, this.stoneHome.y, 'rock_b').setDepth(30).setTint(0x5a5652);
        fitWidth(this.stone, w);
        this.state = 'stone';
        void Voice.say('u2_stone');
      } else {
        this.startDig();
      }
    });
  }

  private startDig(): void {
    this.state = 'dig';
    const s = this.spots[this.cur];
    this.ring?.destroy();
    this.ring = glowRing(this, s.x, GROUND - 6, 30, 20);
    // The first spot's line follows the opening (see startPlanting).
    if (this.cur === 1 && !this.said.hard) {
      this.said.hard = true;
      void Voice.say('u2_hard');
    }
    this.setIdle(() => this.showHint());
  }

  private rub(x: number, y: number): void {
    const s = this.spots[this.cur];
    if (Math.abs(x - s.x) > 60 || Math.abs(y - (GROUND - 6)) > 50) return;
    const d = Phaser.Math.Distance.Between(x, y, this.last.x, this.last.y);
    this.rubbed += d;
    const need = RUB_NEED[this.cur] * (currentLap() ? 1.2 : 1);
    if (!s.mound) {
      s.mound = this.add.image(s.x + 24, GROUND + 4, 'soil_mound').setOrigin(0.5, 1).setDepth(31);
      fitWidth(s.mound, BOY_H * 0.72); // 44 points tall: he presses it
      s.mound.setScale(0.01);
    }
    const k = Math.min(1, this.rubbed / need);
    const full = (BOY_H * 0.72) / s.mound.frame.width;
    s.mound.setScale(full * (0.2 + 0.8 * k));
    if (this.time.now - this.lastPuff > 120) {
      this.lastPuff = this.time.now;
      dustPuff(this, s.x, GROUND - 4, 4, 0x8a5a3a, 32);
      sfx('sweep', { volume: 0.5 });
    }
    if (k >= 1) this.dug();
  }

  private dug(): void {
    this.state = 'plant';
    this.drag = null;
    this.ring?.destroy();
    this.ring = null;
    sfx('chime', { volume: 0.4 });
    const s = this.spots[this.cur];
    // The sapling lies ready beside the hole (on the side away from the boy).
    const lx = this.cur === 2 ? s.x + 52 : s.x + 60;
    this.lying = this.add.image(lx, GROUND + 6, 'sapling_small').setOrigin(0.5, 1).setDepth(34).setAngle(70);
    fitHeight(this.lying, BOY_H * H.lying);
    this.lying.setData('home', { x: lx, y: GROUND + 6 });
    if (this.cur === 0) void Voice.say('u2_plant');
    this.kickIdle();
  }

  private planted(): void {
    const s = this.spots[this.cur];
    const img = this.lying as Phaser.GameObjects.Image;
    this.lying = null;
    this.tweens.killTweensOf(img);
    img.setAngle(0).setPosition(s.x, GROUND).setDepth(30);
    fitHeight(img, BOY_H * H.sapling);
    s.tree = img;
    sfx('thud', { weight: 0.1, volume: 0.6 });
    this.state = 'press';
    if (this.cur === 0) void Voice.say('u2_press');
    this.kickIdle();
  }

  private press(): void {
    const s = this.spots[this.cur];
    if (!s.mound) return;
    this.presses++;
    sfx('thud', { weight: 0.2, volume: 0.6 });
    dustPuff(this, s.x, GROUND, 5, 0x8a5a3a, 32);
    const k = 1 - this.presses / 3;
    this.tweens.add({ targets: s.mound, x: s.x + 24 * k, scaleX: s.mound.scaleX * 0.8, scaleY: s.mound.scaleY * 0.6, duration: 200 });
    if (s.tree) this.tweens.add({ targets: s.tree, scaleY: { from: s.tree.scaleY * 0.94, to: s.tree.scaleY }, duration: 260, ease: 'Back.easeOut' });
    if (this.presses >= 3) {
      const m = s.mound;
      this.tweens.add({ targets: m, alpha: 0, duration: 300, onComplete: () => m.destroy() });
      s.mound = null;
      this.state = 'water';
      pose(this, this.boy, 'boy_idle', BOY_H);
      if (this.cur === 0) void Voice.say('u2_water');
      this.kickIdle();
    }
  }

  /** A sapling (or a wilting tree) has had all its water. */
  private watered(s: Spot): void {
    droplets(this, s.x, GROUND - 10, 8, 33);
    if (s.tree) this.tweens.add({ targets: s.tree, scaleY: { from: s.tree.scaleY * 1.06, to: s.tree.scaleY }, duration: 500, ease: 'Back.easeOut' });
    if (this.quiet) {
      // A quiet deed has no chime at all.
      if (this.spots.every((x) => x.pour.done)) void this.duskLeave();
      return;
    }
    // A finished step chimes, but not the last sapling (not on the step that finishes the deed: that would be a reward sting).
    if (this.cur < 2) sfx('chime', { volume: 0.4 });
    if (s !== this.spots[this.cur]) return;
    this.state = 'busy';
    if (this.cur < 2) this.time.delayedCall(500, () => this.alive && this.beginSpot(this.cur + 1));
    else void this.seasons();
  }

  /** The seasons pass in front of him: the trees grow, slowly. */
  private async seasons(): Promise<void> {
    this.setIdle(null);
    this.tweens.add({ targets: this.can.img, alpha: 0, duration: 400, onComplete: () => this.can.img.setVisible(false).setAlpha(1) });
    await walkTo(this, this.boy, { x: 352, y: GROUND + 18 }, BOY_H);
    if (!this.alive) return;
    pose(this, this.boy, 'boy_idle', BOY_H);
    await Voice.say('u2_wait');
    if (!this.alive) return;
    const v = PIC;
    const light = this.add.rectangle(v.x, v.y, v.w, v.h, 0xffffff, 0).setOrigin(0).setDepth(80);
    const season = (color: number, alpha: number) => this.tweens.add({ targets: light, fillColor: color, fillAlpha: alpha, duration: 900 });
    const fall = (tint: number, speed: number, scale: number) => this.add.particles(0, 0, 'fx_dot', {
      x: { min: view().x, max: view().right }, y: view().y, speedY: { min: speed, max: speed * 1.3 }, speedX: { min: -10, max: 10 },
      scale, alpha: 0.85, lifespan: 2600, frequency: 25, tint,
    }).setDepth(81);
    const grow = (key: string, h: number) => {
      for (const s of this.spots) {
        if (!s.tree) continue;
        const t = s.tree;
        this.tweens.add({ targets: t, alpha: 0.2, duration: 400, yoyo: true, onYoyo: () => { t.setTexture(key); fitHeight(t, BOY_H * h); } });
      }
      sfx('rustle', { volume: 0.6 });
    };
    // Sun.
    season(0xffd27a, 0.18);
    await this.wait(1200);
    // Rain: the trees grow.
    season(0x6b8bb8, 0.28);
    const rain = fall(0x9fd0f0, 520, 0.18);
    this.time.addEvent({ delay: 400, repeat: 5, callback: () => sfx('splash', { volume: 0.15 }) });
    await this.wait(700);
    grow('olive_young', H.young);
    await this.wait(1000);
    rain.emitting = false;
    // A dusting of snow.
    season(0xe8eef8, 0.32);
    const snow = fall(0xffffff, 70, 0.3);
    await this.wait(1300);
    snow.emitting = false;
    // Spring: full grown, with fruit.
    season(0xc8f0a0, 0.14);
    grow('olive_tree_fruit', H.grown);
    sfx('birds', { volume: 0.7 });
    await this.wait(1400);
    if (!this.alive) return;
    this.tweens.add({ targets: light, fillAlpha: 0, duration: 1200 });
    // Birds come and eat; a stranger rests in the shade.
    for (const [i, s] of [this.spots[0], this.spots[2]].entries()) {
      const b = this.add.image(s.x + (i ? -20 : 20), GROUND - BOY_H * H.grown * 0.62, 'birds_eating').setDepth(32).setAlpha(0);
      fitHeight(b, BOY_H * H.birds);
      this.tweens.add({ targets: b, alpha: 1, y: b.y + 6, duration: 600, delay: i * 500 });
      this.tweens.add({ targets: b, angle: { from: -3, to: 3 }, duration: 500, yoyo: true, repeat: -1, delay: 700 + i * 500 }); // pecking
    }
    sfx('birds', { volume: 0.8 });
    const st = this.add.image(SPOTS[1] + 46, GROUND + 4, 'stranger_rest').setOrigin(0.5, 1).setDepth(33).setAlpha(0);
    fitHeight(st, BOY_H * H.stranger);
    this.tweens.add({ targets: st, alpha: 1, duration: 900, delay: 900, onComplete: () => this.alive && breathe(this, st) });
    // The consequence: long after the work, others enjoy it.
    completeMission('ummqais');
    await this.wait(800);
    if (!this.alive) return;
    await Voice.say('u2_trust');
    if (!this.alive) return;
    await Voice.say('u2_end');
    if (!this.alive) return;
    await this.finishAdventure('ummqais', 'u2_hadith');
  }

  // ---------------------------------------------------------------- the quiet deed

  private async startDusk(): Promise<void> {
    // The neighbor's young trees, wilting.
    for (const s of this.spots) {
      s.tree = this.add.image(s.x, GROUND, 'olive_young_wilt').setOrigin(0.5, 1).setDepth(30);
      fitHeight(s.tree, BOY_H * H.young);
      s.pour.y = GROUND - BOY_H * H.young * 0.55;
    }
    this.state = 'water';
    this.setIdle(() => this.showHint());
    this.open('qdu_open');
  }

  /** He leaves; in the evening the trees stand up straight. One plain line. */
  private async duskLeave(): Promise<void> {
    this.state = 'end';
    this.setIdle(null);
    this.tweens.add({ targets: this.can.img, alpha: 0, duration: 400, onComplete: () => this.can.img.setVisible(false).setAlpha(1) });
    await walkTo(this, this.boy, { x: view().x - 80 }, BOY_H);
    if (!this.alive) return;
    this.boy.setVisible(false);
    const dusk = this.add.rectangle(PIC.x, PIC.y, PIC.w, PIC.h, 0x6a4a8a, 0).setOrigin(0).setDepth(80);
    this.tweens.add({ targets: dusk, fillAlpha: 0.32, duration: 3000 });
    await this.wait(2000);
    if (!this.alive) return;
    for (const s of this.spots) {
      const t = s.tree as Phaser.GameObjects.Image;
      this.tweens.add({ targets: t, alpha: 0.3, duration: 500, yoyo: true, onYoyo: () => { t.setTexture('olive_young'); fitHeight(t, BOY_H * H.young); } });
    }
    sfx('rustle', { volume: 0.5 });
    completeMission('ummqais');
    await this.wait(1800);
    if (!this.alive) return;
    await Voice.say('qdu_end');
    if (!this.alive) return;
    await this.finishAdventure('ummqais', null);
  }

  /**
   * Free time in the grown grove: the middle olive tree sways in the breeze,
   * the bird pecking in the left tree hops, and the boy gives a small hop.
   * The resting stranger is left in peace. Never at dusk (a quiet deed).
   */
  protected freeTargets(): FreeTarget[] {
    if (this.quiet) return [];
    const out: FreeTarget[] = [];
    const tree = this.spots[1]?.tree;
    if (tree) {
      // Only the crown: the trunk's foot is behind the stranger.
      const crown = () => {
        const b = tree.getBounds();
        return new Phaser.Geom.Rectangle(tree.x - 60, b.y + 10, 120, b.height * 0.45);
      };
      out.push({ obj: tree, area: crown, react: () => freeSway(this, tree, 2.5, 0.3) });
    }
    const bird = this.children.list.find((o) => o instanceof Phaser.GameObjects.Image && o.texture.key === 'birds_eating') as Phaser.GameObjects.Image | undefined;
    if (bird) out.push({ obj: bird, react: () => freeHop(this, bird, 'birds', 8, 0.3) });
    out.push({ obj: this.boy, react: () => freeHop(this, this.boy, 'step', 10) });
    return out;
  }

  // ---------------------------------------------------------------- input

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive || this.drag) return;
    this.hint.clear();
    const x = p.worldX, y = p.worldY;
    this.last.set(x, y);
    if (this.state === 'stone' && this.stone && Phaser.Math.Distance.Between(x, y, this.stone.x, this.stone.y) < 40) {
      this.drag = 'stone';
      sfx('grab', { volume: 0.6 });
    } else if (this.state === 'dig') {
      this.drag = 'rub';
    } else if (this.state === 'plant' && this.lying && Phaser.Math.Distance.Between(x, y, this.lying.x, this.lying.y - 14) < 44) {
      this.drag = 'sapling';
      this.lying.setDepth(70);
      this.tweens.add({ targets: this.lying, angle: 0, duration: 200 });
      sfx('grab', { volume: 0.6 });
    } else if (this.state === 'press') {
      const s = this.spots[this.cur];
      if (Math.abs(x - s.x) < 70 && Math.abs(y - GROUND) < 60) this.press();
    } else if (this.state === 'water' && this.can.hit(x, y)) {
      this.drag = 'can';
      this.can.grab(p);
      pose(this, this.boy, 'boy_water', BOY_H);
    }
    if (this.drag) this.dragId = p.id;
  }

  private move(p: Phaser.Input.Pointer): void {
    if (p.id !== this.dragId) return;
    const x = p.worldX, y = p.worldY, v = view();
    if (this.drag === 'rub') this.rub(x, y);
    else if (this.drag === 'stone' && this.stone) {
      // Heavier on a later lap: it lags behind the finger.
      const k = currentLap() ? 0.35 : 0.6;
      this.stone.x += (x - this.stone.x) * k;
      this.stone.y += (Phaser.Math.Clamp(y, 600, 716) - this.stone.y) * k;
    } else if (this.drag === 'sapling' && this.lying) this.lying.setPosition(x, Math.min(y + 20, 730));
    else if (this.drag === 'can') this.can.move(p, { x: v.x + 30, right: v.right - 30, top: 520, bottom: GROUND + 6 });
    this.last.set(x, y);
  }

  private up(p: Phaser.Input.Pointer): void {
    if (p.id !== this.dragId) return;
    const was = this.drag;
    this.drag = null;
    this.dragId = -1;
    const s = this.spots[this.cur];
    if (was === 'stone' && this.stone) {
      if (Phaser.Math.Distance.Between(this.stone.x, this.stone.y, this.stoneHome.x, this.stoneHome.y) > 45) {
        sfx('thud', { weight: 0.5 });
        dustPuff(this, this.stone.x, this.stone.y + 8, 6);
        this.stone.setDepth(29);
        this.stone = null;
        this.startDig();
      } else {
        sfx('slide', { volume: 0.6 });
        this.tweens.add({ targets: this.stone, x: this.stoneHome.x, y: this.stoneHome.y, duration: 300, ease: 'Back.easeOut' });
      }
    } else if (was === 'sapling' && this.lying) {
      if (Math.abs(this.lying.x - s.x) < 46 && Math.abs(this.lying.y - GROUND) < 60) this.planted();
      else {
        const h = this.lying.getData('home') as { x: number; y: number };
        sfx('slide', { volume: 0.6 });
        this.tweens.add({ targets: this.lying, x: h.x, y: h.y, angle: 70, duration: 320, ease: 'Back.easeOut' });
      }
    } else if (was === 'can') {
      this.can.release(p);
      if (this.state === 'water') pose(this, this.boy, 'boy_idle', BOY_H);
    }
    this.kickIdle();
  }

  // ---------------------------------------------------------------- hints

  private showHint(): void {
    if (!this.alive || this.drag) return this.kickIdle();
    const again = () => this.kickIdle();
    const s = this.spots[this.cur];
    if (this.state === 'stone' && this.stone) this.hint.show('drag', { x: this.stone.x, y: this.stone.y }, { x: this.stone.x + 70, y: this.stone.y + 4 }, again);
    else if (this.state === 'dig') this.hint.show('hold', { x: s.x - 30, y: GROUND - 6 }, { x: s.x + 30, y: GROUND - 6 }, again);
    else if (this.state === 'plant' && this.lying) this.hint.show('drag', { x: this.lying.x, y: this.lying.y - 14 }, { x: s.x, y: GROUND - 10 }, again);
    else if (this.state === 'press') this.hint.show('tap', { x: s.x + 10, y: GROUND - 4 }, undefined, again);
    else if (this.state === 'water') {
      const t = this.spots.find((x) => !x.pour.done);
      if (t) this.hint.show('drag', { x: this.can.img.x, y: this.can.img.y - 20 }, { x: t.x - 40, y: t.pour.y + 30 }, again);
    } else again();
  }
}

/** Umm Qais's quiet deed: the neighbor's wilting trees, watered while nobody is there. */
export class UmmQaisDuskScene extends OliveScene {
  constructor() {
    super('ummqais-dusk');
  }
}
