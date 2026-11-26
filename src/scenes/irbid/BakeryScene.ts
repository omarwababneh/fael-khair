import Phaser from 'phaser';
import { fitHeight } from '../../core/assets';
import { glowRing, HintHand, motes } from '../../core/fx';
import { music } from '../../core/music';
import { completeMission, currentLap } from '../../core/session';
import { sfx } from '../../core/sfx';
import { ui } from '../../core/ui';
import { PIC, view, vp } from '../../core/viewport';
import { Voice } from '../../core/voice';
import { BaseScene } from '../BaseScene';
import { breathe, pose, walkTo } from '../kit';

// I2. Irbid: too much change (value: trust, giving people what is theirs;
// source quran_4_58). MISSIONS_V2.md section 5.
// Mama gave him coins for bread. The busy baker hands back too much change. On
// the counter are coin-shaped outlines for his change: he fills them, and drags
// the coins left over back to the baker's tray. The coins are story objects he
// hands back; he never keeps or counts anything for himself (GAME_SPEC.md section 2).

// Measured on bg_irbid_bakery: the counter top is at y = 500, the tray on it at (230, 474).
const COUNTER_Y = 500;
const TRAY = { x: 230, y: 476, w: 88 };
const BAKER = { x: 268, foot: 590, h: 140 * 1.35 }; // behind the tray, inside the close-up
const BOY = { x: 120, foot: 716, h: 150 };
const COIN_H = 15; // drawn a little larger than life: the camera is close
const CLOSE = { x: 200, y: 470, zoom: 2.0 }; // the camera moves in to the counter for counting (it shows x 102 to 298)

// [paid, price, handed back]: always small enough to count on one hand.
const ROUNDS: Array<[number, number, number]> = [[5, 3, 4], [5, 2, 4], [4, 2, 3]];

type State = 'intro' | 'pay' | 'change' | 'end';

interface Coin { img: Phaser.GameObjects.Image; where: 'hand' | 'slot' | 'tray'; home: { x: number; y: number } }

export class BakeryScene extends BaseScene {
  private state: State = 'intro';
  private baker!: Phaser.GameObjects.Image;
  private boy!: Phaser.GameObjects.Image;
  private coins: Coin[] = [];
  private slots: Array<{ x: number; y: number; ring: Phaser.GameObjects.Image; coin: Coin | null }> = [];
  private round: [number, number, number] = ROUNDS[0];
  private held: Coin | null = null;
  private dragId = -1;
  private zoomed = false;
  private saidExtra = false;
  private hint!: HintHand;

  constructor() {
    super('i2');
  }

  create(): void {
    this.setup();
    this.state = 'intro';
    this.coins = [];
    this.slots = [];
    this.held = null;
    this.dragId = -1;
    this.zoomed = false;
    this.saidExtra = false;
    this.hint = new HintHand(this);
    // First lap: five coins, bread for three, four handed back. Later laps: the numbers change a little.
    this.round = currentLap() ? ROUNDS[1 + Math.floor(Math.random() * 2)] : ROUNDS[0];

    ui.setPill('إِرْبِد');
    ui.setHome(() => this.goTo('map'));
    ui.clearBubble();
    music.play('irbid');

    this.addCover('bg_irbid_bakery');
    motes(this, { x: 20, y: 160, w: 350, h: 480 }, 40);

    // The busy baker stands behind the counter: only what is above it shows.
    this.baker = this.add.image(BAKER.x, BAKER.foot, 'baker_busy').setOrigin(0.5, 1).setDepth(10);
    this.cropBaker('baker_busy');
    this.boy = this.add.image(BOY.x, BOY.foot, 'boy_idle').setOrigin(0.5, 1).setDepth(30);
    fitHeight(this.boy, BOY.h);
    breathe(this, this.boy);

    // His coins, on the counter in front of him.
    const [paid] = this.round;
    for (let i = 0; i < paid; i++) {
      const home = { x: 128 + i * 16, y: COUNTER_Y - 2 };
      const img = this.add.image(home.x, home.y, 'coin').setOrigin(0.5, 1).setDepth(40);
      fitHeight(img, COIN_H);
      this.coins.push({ img, where: 'hand', home });
    }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
    this.events.once('shutdown', () => this.hint.clear());

    void this.intro();
  }

  private cropBaker(key: string): void {
    this.baker.setTexture(key);
    fitHeight(this.baker, BAKER.h);
    const s = this.baker.scaleY;
    const visible = (COUNTER_Y + 2 - (BAKER.foot - BAKER.h)) / s; // frame pixels above the counter
    this.baker.setCrop(0, 0, this.baker.frame.width, visible);
  }

  /** The camera moves in to the counter (it stays in after a resize). */
  protected onLayout(): void {
    if (!this.zoomed) return;
    const cam = this.cameras.main;
    cam.setZoom(vp.zoom * CLOSE.zoom);
    cam.centerOn(CLOSE.x, CLOSE.y);
  }

  private closeUp(on: boolean): Promise<void> {
    this.zoomed = on;
    const cam = this.cameras.main;
    return new Promise((res) => {
      cam.pan(on ? CLOSE.x : 195, on ? CLOSE.y : 422, 700, 'Sine.easeInOut');
      cam.zoomTo(vp.zoom * (on ? CLOSE.zoom : 1), 700, 'Sine.easeInOut', false, (_c, p) => { if (p === 1) res(); });
    });
  }

  private async intro(): Promise<void> {
    const [paid, price] = this.round;
    await this.closeUp(true);
    if (!this.alive) return;
    await Voice.say(`i2_open_${paid}_${price}`);
    if (!this.alive) return;
    this.state = 'pay';
    this.setIdle(() => this.showHint());
  }

  // ---------------------------------------------------------------- paying

  private async pay(): Promise<void> {
    this.state = 'intro';
    this.setIdle(null);
    sfx('pop');
    this.coins.forEach((c, i) => {
      c.where = 'tray';
      this.tweens.add({ targets: c.img, x: TRAY.x - 30 + i * 13, y: TRAY.y + 4, duration: 420, delay: i * 90, ease: 'Sine.easeInOut' });
    });
    this.time.delayedCall(300, () => sfx('knock', { volume: 0.3 }));
    await this.wait(1100);
    if (!this.alive) return;
    // The busy baker puts the bread down and hands back the change, quickly: too much.
    const [, price, back] = this.round;
    const bread = this.add.image(112, COUNTER_Y, 'bread_bag').setOrigin(0.5, 1).setDepth(38).setAlpha(0);
    fitHeight(bread, BOY.h * 0.25);
    this.tweens.add({ targets: bread, alpha: 1, x: 122, duration: 400 });
    sfx('rustle', { volume: 0.6 });
    this.tweens.add({ targets: this.baker, x: BAKER.x - 6, duration: 200, yoyo: true, repeat: 1 });
    // The coins on the tray: the price stays, the rest comes back.
    const backCoins = this.coins.slice(price);
    this.coins = this.coins.slice(0, price);
    for (let i = 0; i < back; i++) {
      const src = backCoins[i];
      const img = src ? src.img : this.add.image(TRAY.x + 20, TRAY.y + 4, 'coin').setOrigin(0.5, 1).setDepth(40);
      if (!src) fitHeight(img, COIN_H);
      const home = { x: 162 + i * 17, y: COUNTER_Y - 2 };
      const c: Coin = { img, where: 'hand', home };
      this.coins.push(c);
      this.tweens.add({ targets: img, x: home.x, y: home.y, duration: 420, delay: 300 + i * 120, ease: 'Sine.easeOut' });
    }
    this.time.delayedCall(500, () => sfx('knock', { volume: 0.3 }));
    await this.wait(400 + back * 120 + 500);
    if (!this.alive) return;
    // Outlines for his change.
    const change = this.round[0] - price;
    for (let i = 0; i < change; i++) {
      // Outlines just behind the coins, on the counter top.
      const x = 144 + i * 20, y = COUNTER_Y - 18;
      this.slots.push({ x, y, ring: glowRing(this, x, y, 9, 39), coin: null });
    }
    this.state = 'change';
    await Voice.say(`i2_change_${change}`);
    this.setIdle(() => this.showHint());
  }

  // ---------------------------------------------------------------- the change

  private down(p: Phaser.Input.Pointer): void {
    if (!this.alive || this.held) return;
    this.hint.clear();
    const x = p.worldX, y = p.worldY;
    if (this.state === 'pay') {
      if (this.coins.some((c) => Phaser.Math.Distance.Between(x, y, c.img.x, c.img.y - COIN_H / 2) < 30)) void this.pay();
    } else if (this.state === 'change') {
      // His coins (the ones handed back), wherever they are except on the tray.
      const c = this.coins.filter((k) => this.isMine(k) && k.where !== 'tray')
        .map((k) => ({ k, d: Phaser.Math.Distance.Between(x, y, k.img.x, k.img.y - COIN_H / 2) }))
        .filter((o) => o.d < 26).sort((a, b) => a.d - b.d)[0];
      if (!c) return;
      this.held = c.k;
      const slot = this.slots.find((s) => s.coin === c.k);
      if (slot) slot.coin = null;
      c.k.where = 'hand';
      c.k.img.setDepth(70);
      sfx('grab', { volume: 0.5 });
      this.dragId = p.id;
    }
  }

  private move(p: Phaser.Input.Pointer): void {
    if (!this.held || p.id !== this.dragId) return;
    this.held.img.setPosition(p.worldX, p.worldY + 6);
  }

  private up(p: Phaser.Input.Pointer): void {
    if (!this.held || p.id !== this.dragId) return;
    const c = this.held;
    this.held = null;
    this.dragId = -1;
    const x = c.img.x, y = c.img.y;
    const free = this.slots.find((s) => !s.coin && Phaser.Math.Distance.Between(x, y, s.x, s.y + 8) < 22);
    const loose = this.coins.filter((k) => this.isMine(k) && k.where === 'hand' && k !== c).length;
    const emptySlots = this.slots.filter((s) => !s.coin).length;
    const onTray = Math.abs(x - TRAY.x) < TRAY.w / 2 + 10 && Math.abs(y - TRAY.y) < 22;
    if (free) {
      free.coin = c;
      c.where = 'slot';
      sfx('knock', { volume: 0.35 });
      this.tweens.add({ targets: c.img, x: free.x, y: free.y + 8, duration: 150 });
      free.ring.setVisible(false);
    } else if (onTray && loose >= emptySlots) {
      // It was not his: back on the baker's tray.
      c.where = 'tray';
      sfx('knock', { volume: 0.35 });
      this.tweens.add({ targets: c.img, x: TRAY.x + Phaser.Math.Between(-30, 30), y: TRAY.y + 4, duration: 180 });
    } else {
      sfx('slide', { volume: 0.5 });
      this.tweens.add({ targets: c.img, x: c.home.x, y: c.home.y, duration: 260, ease: 'Back.easeOut' });
    }
    c.img.setDepth(40);
    for (const s of this.slots) s.ring.setVisible(!s.coin);
    this.kickIdle();
    void this.check();
  }

  /** His coins are the ones handed back to him (not the price on the tray). */
  private isMine(k: Coin): boolean {
    return this.coins.indexOf(k) >= this.round[1];
  }

  private async check(): Promise<void> {
    const mine = this.coins.filter((k) => this.isMine(k));
    const filled = this.slots.every((s) => s.coin);
    const loose = mine.filter((k) => k.where === 'hand').length;
    if (filled && loose > 0 && !this.saidExtra) {
      this.saidExtra = true;
      void Voice.say(`i2_extra_${loose}`);
    }
    if (filled && loose === 0) await this.thanks();
  }

  private async thanks(): Promise<void> {
    if (this.state !== 'change') return;
    this.state = 'end';
    this.setIdle(null);
    await this.wait(400);
    if (!this.alive) return;
    // The baker's surprise and warm thanks.
    this.cropBaker('baker_smile');
    this.tweens.add({ targets: this.baker, y: BAKER.foot - 4, duration: 200, yoyo: true });
    await Voice.say('i2_baker');
    if (!this.alive) return;
    await this.closeUp(false);
    if (!this.alive) return;
    pose(this, this.boy, 'boy_happy', BOY.h);
    // Closing time: the light turns to evening, and his tray is right.
    const eve = this.add.rectangle(PIC.x, PIC.y, PIC.w, PIC.h, 0xff9a4a, 0).setOrigin(0).setDepth(80);
    this.tweens.add({ targets: eve, fillAlpha: 0.22, duration: 2200 });
    // He walks home with the bread.
    await walkTo(this, this.boy, { x: view().x - 70 }, BOY.h);
    if (!this.alive) return;
    this.boy.setVisible(false);
    this.tweens.add({ targets: this.baker, angle: { from: -3, to: 3 }, duration: 300, yoyo: true, repeat: 3 });
    sfx('knock', { volume: 0.3 });
    completeMission('irbid');
    await this.wait(1400);
    if (!this.alive) return;
    await Voice.say('i2_end');
    if (!this.alive) return;
    await this.finishAdventure('irbid', 'i2_hadith');
  }

  private showHint(): void {
    if (!this.alive || this.held) return this.kickIdle();
    const again = () => this.kickIdle();
    if (this.state === 'pay') {
      const c = this.coins[0];
      this.hint.show('tap', { x: c.img.x, y: c.img.y - 8 }, undefined, again);
    } else if (this.state === 'change') {
      const c = this.coins.find((k) => this.isMine(k) && k.where === 'hand');
      const slot = this.slots.find((s) => !s.coin);
      if (c && slot) this.hint.show('drag', { x: c.img.x, y: c.img.y - 8 }, { x: slot.x, y: slot.y }, again);
      else if (c) this.hint.show('drag', { x: c.img.x, y: c.img.y - 8 }, { x: TRAY.x, y: TRAY.y }, again);
      else again();
    } else again();
  }
}
