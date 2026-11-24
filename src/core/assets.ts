import Phaser from 'phaser';

export interface AssetIndex {
  art: Record<string, { w: number; h: number }>;
  audio: { vo: string[]; music: string[]; sfx: string[]; quran: string[] };
}

export let assetIndex: AssetIndex = { art: {}, audio: { vo: [], music: [], sfx: [], quran: [] } };

export async function loadIndex(): Promise<void> {
  try {
    const res = await fetch('assets/index.json');
    if (res.ok) assetIndex = (await res.json()) as AssetIndex;
  } catch {
    /* no index: every image shows as a placeholder, every voice uses the phone */
  }
}

export const hasAudio = (kind: keyof AssetIndex['audio'], name: string): boolean =>
  assetIndex.audio[kind].includes(name);

/** Required art used by Milestone 1 scenes, with placeholder proportions (w, h). */
export const ART: Record<string, [number, number]> = {
  bg_map: [1170, 1755],
  bg_petra_siq: [1170, 1755],
  bg_petra_treasury: [1170, 1755],
  boy_idle: [400, 768],
  boy_walk_a: [400, 768],
  boy_walk_b: [400, 768],
  boy_lift: [480, 700],
  boy_worried: [400, 768],
  boy_happy: [400, 768],
  elder_cart: [768, 520],
  rock_a: [400, 300],
  rock_b: [420, 320],
  rock_c: [440, 340],
  rock_d: [480, 380],
  thorn_branch: [768, 240],
  big_branch: [768, 300],
  // Umm Qais
  bg_ummqais_well: [1170, 1755],
  boy_pull: [420, 768],
  dog_thirsty: [768, 560],
  dog_drinking: [768, 520],
  dog_happy: [768, 600],
  bucket_empty: [420, 440],
  bucket_full: [420, 440],
  trough_water: [768, 200],
  // Amman
  bg_amman_home: [1170, 1755],
  boy_sweep: [480, 768],
  mama_stand: [380, 768],
  mama_kneel: [600, 700],
  jar_whole: [400, 520],
  shard_a: [300, 220],
  shard_b: [280, 240],
  shard_c: [320, 200],
  ball: [400, 400],
  dustpan: [500, 300],
  cloth: [400, 320],
  // Irbid
  bg_irbid_dusk: [1170, 1755],
  boy_carry: [440, 768],
  boy_peek: [520, 640],
  neighbor_basket: [440, 768],
  passerby_walk: [380, 768],
  passerby_look: [380, 768],
  basket_empty: [600, 440],
  basket_full: [600, 500],
  food_bread: [500, 360],
  food_olives: [420, 340],
  food_labneh: [400, 340],
  food_tomatoes: [460, 360],
  food_apples: [460, 360],
  // Wadi Rum
  bg_wadirum_night: [1170, 1755],
  boy_sit_back: [500, 600],
};

/** Optional art: used if delivered, otherwise skipped (never a placeholder). */
export const OPTIONAL_ART = ['bird'];

export function queueArt(scene: Phaser.Scene): void {
  for (const name of [...Object.keys(ART), ...OPTIONAL_ART]) {
    if (assetIndex.art[name]) scene.load.image(name, `assets/art/${name}.webp`);
  }
}

/**
 * Missing art shows as a flat magenta box with the asset name written on it,
 * so it is never mistaken for a design.
 */
export function makePlaceholders(scene: Phaser.Scene): void {
  for (const [name, [w0, h0]] of Object.entries(ART)) {
    if (scene.textures.exists(name)) continue;
    const s = 0.5;
    const w = Math.round(w0 * s), h = Math.round(h0 * s);
    const tex = scene.textures.createCanvas(name, w, h);
    if (!tex) continue;
    const ctx = tex.getContext();
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = Math.min(48, Math.floor(w / (name.length * 0.62)));
    size = Math.max(12, size);
    if (name.startsWith('bg_')) {
      // Backgrounds: a small name near the top, so the placeholder does not
      // dominate the screen. Still unmistakably a missing image.
      size = 16;
      ctx.font = `bold ${size}px sans-serif`;
      ctx.fillText(`missing art: ${name}`, w / 2, h * 0.183);
    } else {
      ctx.font = `bold ${size}px sans-serif`;
      ctx.fillText(name, w / 2, h / 2);
    }
    tex.refresh();
  }
}

export const hasArt = (scene: Phaser.Scene, name: string): boolean =>
  scene.textures.exists(name) && !!assetIndex.art[name];

/** Scale an image so its displayed height (or width) matches, keeping proportions. */
export function fitHeight(img: Phaser.GameObjects.Image, h: number): number {
  const s = h / img.frame.height;
  img.setScale(s);
  return s;
}

export function fitWidth(img: Phaser.GameObjects.Image, w: number): number {
  const s = w / img.frame.width;
  img.setScale(s);
  return s;
}
