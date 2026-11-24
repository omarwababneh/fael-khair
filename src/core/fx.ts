// Interface chrome and particles drawn in code (allowed by GAME_SPEC 6.2):
// glow rings, the hint hand, particles, the sun. Never scenery or characters.
import Phaser from 'phaser';

export function makeFxTextures(scene: Phaser.Scene): void {
  const soft = (key: string, size: number, inner: string, outer: string) => {
    if (scene.textures.exists(key)) return;
    const t = scene.textures.createCanvas(key, size, size);
    if (!t) return;
    const c = t.getContext();
    const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    t.refresh();
  };
  soft('fx_dot', 32, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  soft('fx_glow', 128, 'rgba(255,236,170,0.9)', 'rgba(255,220,140,0)');

  if (!scene.textures.exists('fx_ring')) {
    const s = 128;
    const t = scene.textures.createCanvas('fx_ring', s, s);
    if (t) {
      const c = t.getContext();
      const g = c.createRadialGradient(s / 2, s / 2, s * 0.22, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,240,190,0)');
      g.addColorStop(0.55, 'rgba(255,236,170,0.95)');
      g.addColorStop(0.7, 'rgba(255,214,120,0.6)');
      g.addColorStop(1, 'rgba(255,200,100,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, s, s);
      c.strokeStyle = 'rgba(255,255,255,0.9)';
      c.lineWidth = 3;
      c.setLineDash([10, 8]);
      c.beginPath();
      c.arc(s / 2, s / 2, s * 0.36, 0, Math.PI * 2);
      c.stroke();
      t.refresh();
    }
  }

  // Hint hand: a simple pointing hand icon.
  if (!scene.textures.exists('fx_hand')) {
    const w = 96, h = 120;
    const t = scene.textures.createCanvas('fx_hand', w, h);
    if (t) {
      const c = t.getContext();
      c.lineJoin = 'round';
      c.lineCap = 'round';
      c.fillStyle = '#ffffff';
      c.strokeStyle = '#4a2c17';
      c.lineWidth = 5;
      const rr = (x: number, y: number, ww: number, hh: number, r: number) => {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + ww, y, x + ww, y + hh, r);
        c.arcTo(x + ww, y + hh, x, y + hh, r);
        c.arcTo(x, y + hh, x, y, r);
        c.arcTo(x, y, x + ww, y, r);
        c.closePath();
      };
      // palm
      rr(18, 50, 64, 62, 20);
      c.fill(); c.stroke();
      // folded fingers
      for (let i = 0; i < 3; i++) {
        rr(44 + i * 13, 44 + i * 2, 16, 26, 8);
        c.fill(); c.stroke();
      }
      // pointing finger
      rr(26, 6, 20, 62, 10);
      c.fill(); c.stroke();
      // thumb
      rr(8, 62, 26, 18, 9);
      c.fill(); c.stroke();
      t.refresh();
    }
  }
}

/** A short burst of dust at a point. */
export function dustPuff(scene: Phaser.Scene, x: number, y: number, amount = 14, tint = 0xd9b98a, depth = 50): void {
  const e = scene.add.particles(x, y, 'fx_dot', {
    speed: { min: 30, max: 110 },
    angle: { min: 180, max: 360 },
    scale: { start: 0.9, end: 2.2 },
    alpha: { start: 0.55, end: 0 },
    lifespan: { min: 450, max: 800 },
    gravityY: -20,
    tint,
    emitting: false,
  });
  e.setDepth(depth);
  e.explode(amount);
  scene.time.delayedCall(1000, () => e.destroy());
}

/** Golden dust motes drifting slowly through the light. */
export function motes(scene: Phaser.Scene, area: { x: number; y: number; w: number; h: number }, depth = 40, tint = 0xffe7a8): Phaser.GameObjects.Particles.ParticleEmitter {
  const e = scene.add.particles(0, 0, 'fx_dot', {
    x: { min: area.x, max: area.x + area.w },
    y: { min: area.y, max: area.y + area.h },
    speedX: { min: -8, max: 8 },
    speedY: { min: -12, max: 4 },
    scale: { min: 0.12, max: 0.32 },
    // fades in and out over its life
    alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.75 },
    lifespan: { min: 4000, max: 7000 },
    frequency: 260,
    tint,
    blendMode: Phaser.BlendModes.ADD,
  });
  e.setDepth(depth);
  return e;
}

/** A glowing ring that pulses gently. */
export function glowRing(scene: Phaser.Scene, x: number, y: number, radius: number, depth = 5): Phaser.GameObjects.Image {
  const img = scene.add.image(x, y, 'fx_ring').setDepth(depth);
  img.setDisplaySize(radius * 2.4, radius * 2.4);
  const base = img.scale;
  scene.tweens.add({ targets: img, scale: base * 1.1, alpha: { from: 0.95, to: 0.6 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  img.setData('baseScale', base);
  return img;
}
