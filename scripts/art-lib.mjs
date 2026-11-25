// Shared art helpers for prepare-art.mjs and check-art.mjs.
// The asset list mirrors GAME_SPEC.md section 6.5 and art/Fael_Khair_Art_Checklist.xlsx
// (MISSIONS_V2.md added the names marked by wave).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const INCOMING = path.join(ROOT, 'art', 'incoming');
export const OUT_ART = path.join(ROOT, 'public', 'assets', 'art');
export const OUT_ICONS = path.join(ROOT, 'public', 'icons');

export const BACKGROUNDS = [
  'bg_map', 'bg_petra_siq', 'bg_petra_treasury', 'bg_ummqais_well',
  'bg_amman_home', 'bg_irbid_dusk', 'bg_wadirum_night',
  // MISSIONS_V2, wave 1
  'bg_petra_tombs',
  // MISSIONS_V2, wave 2
  'bg_ummqais_grove', 'bg_amman_stairs', 'bg_irbid_bakery', 'bg_irbid_alley',
  // MISSIONS_V2, wave 3
  'bg_jerash_plaza', 'bg_jerash_cardo', 'bg_deadsea_restarea',
  'bg_deadsea_shore',
  // MISSIONS_V2, wave 4
  'bg_aqaba_beach', 'bg_aqaba_harbor',
];

export const CHARACTERS = [
  'boy_idle', 'boy_walk_a', 'boy_walk_b', 'boy_lift', 'boy_pull', 'boy_carry',
  'boy_peek', 'boy_worried', 'boy_happy', 'boy_sweep', 'boy_sit_back',
  'dog_thirsty', 'dog_drinking', 'dog_happy', 'elder_cart', 'mama_stand',
  'mama_kneel', 'neighbor_basket', 'passerby_walk', 'passerby_look',
  // MISSIONS_V2, wave 1
  'boy_offer', 'boy_kneel', 'guard_stand', 'traveler_worried',
  'traveler_happy', 'traveler_b', 'elder_stand', 'donkey_stand',
  'donkey_tired', 'girl_happy',
  // MISSIONS_V2, wave 2
  'boy_water', 'boy_angry', 'boy_breathe', 'boy_carry_bags', 'boy_kick',
  'boy_wave', 'birds_eating', 'friend_a', 'friend_b', 'sister_play',
  'sister_sorry', 'sister_happy', 'mama_bags', 'cat_sleeping', 'baker_busy',
  'baker_smile', 'newboy_alone', 'newboy_happy', 'stranger_rest',
  // MISSIONS_V2, wave 3
  'boy_sit_front', 'grandpa_sit', 'girl_crying', 'mother_search',
  'visitor_a', 'visitor_b', 'classmate_hungry', 'classmate_happy',
  'baba_sit', 'grandpa_baba_walk', 'mother_hug', 'guard_sweep',
  // MISSIONS_V2, wave 4
  'turtle_tangled', 'turtle_free', 'ranger_stand', 'ranger_kneel',
  'fisherman_stand', 'customer_basket', 'sister_bucket_wait',
];

export const OBJECTS = [
  'rock_a', 'rock_b', 'rock_c', 'rock_d', 'thorn_branch', 'big_branch',
  'bucket_empty', 'bucket_full', 'trough_water', 'jar_whole', 'shard_a',
  'shard_b', 'shard_c', 'ball', 'dustpan', 'cloth', 'basket_empty',
  'basket_full', 'food_bread', 'food_olives', 'food_labneh',
  'food_tomatoes', 'food_apples',
  // MISSIONS_V2, wave 1
  'pouch_red', 'pouch_blue', 'pouch_red_moon', 'sack_small', 'sack_big',
  'pouch_red_bluestring', 'cart_empty',
  // MISSIONS_V2, wave 2
  'sapling_small', 'soil_mound', 'watering_can', 'olives_pile',
  'basket_olives', 'olive_young', 'olive_young_wilt', 'olive_tree_fruit',
  'scale_base', 'scale_beam', 'scale_pan', 'block', 'bag_light', 'bag_heavy',
  'blanket_messy', 'blanket_folded', 'coin', 'bread_bag', 'plant_dry',
  'plant_fresh',
  // MISSIONS_V2, wave 3
  'litter_bottle', 'litter_paper', 'litter_peel', 'glass_broken', 'bin',
  'sandwich_whole', 'sandwich_half', 'cup_empty', 'cup_full', 'water_bottle',
  'tap_body', 'tap_handle', 'pipe_leak', 'bench', 'bag_small',
  // MISSIONS_V2, wave 4
  'plastic_bag', 'litter_sack', 'fish_big', 'fish_small', 'weight_iron',
  'sand_bucket', 'sand_tower', 'shell',
];

export const ICON = 'icon_app';

// Not in the spec manifest. Used only if delivered; never shown as a placeholder.
// See DECISIONS.md.
export const OPTIONAL = ['bird'];

export const REQUIRED = [...BACKGROUNDS, ...CHARACTERS, ...OBJECTS, ICON];
export const ALL_NAMES = [...REQUIRED, ...OPTIONAL];

export const EXTS = ['.png', '.jpg', '.jpeg', '.webp'];

export const isBackground = (name) => name.startsWith('bg_');

// Minimum source sizes (section 6.5).
export function minSizeProblem(name, w, h, fromSheet = false) {
  if (name === ICON) return (w < 1024 || h < 1024) ? `needs 1024 x 1024, got ${w} x ${h}` : null;
  if (isBackground(name)) {
    return (w < 1024 || h < 1536) ? `needs at least 1024 x 1536, got ${w} x ${h}` : null;
  }
  const long = Math.max(w, h);
  const need = fromSheet ? 384 : 1024;
  return long < need ? `needs at least ${need} px on the long side, got ${long}` : null;
}

export function listIncoming() {
  if (!fs.existsSync(INCOMING)) return [];
  return fs.readdirSync(INCOMING)
    .filter((f) => EXTS.includes(path.extname(f).toLowerCase()))
    .sort();
}

export function readSheetsMap() {
  const p = path.join(INCOMING, 'sheets.json');
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    throw new Error(`art/incoming/sheets.json is not valid JSON: ${e.message}`);
  }
}

/** Load an image as raw RGBA. */
export async function loadRaw(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function hasTransparency(raw) {
  const { data } = raw;
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) transparent++;
  return transparent > (data.length / 4) * 0.01;
}

/**
 * Remove a flat background: flood-fill from the four corners with a small
 * color tolerance, then soften the edge by one pixel. Mutates raw.data.
 */
export function removeBackground(raw, tolerance = 28) {
  if (hasTransparency(raw)) return raw;
  const { data, width: w, height: h } = raw;
  const bg = new Uint8Array(w * h);
  const stack = [];
  const corners = [0, w - 1, (h - 1) * w, (h - 1) * w + (w - 1)];
  const tol2 = tolerance * tolerance;
  for (const start of corners) {
    if (bg[start]) continue;
    const sr = data[start * 4], sg = data[start * 4 + 1], sb = data[start * 4 + 2];
    stack.push(start);
    while (stack.length) {
      const p = stack.pop();
      if (bg[p]) continue;
      const r = data[p * 4] - sr, g = data[p * 4 + 1] - sg, b = data[p * 4 + 2] - sb;
      if (r * r + g * g + b * b > tol2) continue;
      bg[p] = 1;
      const x = p % w, y = (p - x) / w;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (y > 0) stack.push(p - w);
      if (y < h - 1) stack.push(p + w);
    }
  }
  for (let p = 0; p < w * h; p++) if (bg[p]) data[p * 4 + 3] = 0;
  // Soften: pixels touching the removed background become half transparent.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (bg[p]) continue;
      const edge = (x > 0 && bg[p - 1]) || (x < w - 1 && bg[p + 1]) ||
        (y > 0 && bg[p - w]) || (y < h - 1 && bg[p + w]);
      if (edge) data[p * 4 + 3] = Math.round(data[p * 4 + 3] * 0.5);
    }
  }
  return raw;
}

/** Bounding box of pixels with alpha > threshold, or null if empty. */
export function alphaBounds(raw, threshold = 8) {
  const { data, width: w, height: h } = raw;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > threshold) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * Split a sheet (already background-removed) into object regions.
 * Returns boxes in reading order: rows top to bottom, left to right in each row.
 */
export function splitSheet(raw, threshold = 8) {
  const { data, width: w, height: h } = raw;
  const label = new Int32Array(w * h).fill(-1);
  const boxes = [];
  const stack = [];
  for (let start = 0; start < w * h; start++) {
    if (label[start] !== -1 || data[start * 4 + 3] <= threshold) continue;
    const id = boxes.length;
    const box = { x0: w, y0: h, x1: -1, y1: -1, px: 0 };
    stack.push(start);
    label[start] = id;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p - x) / w;
      box.px++;
      if (x < box.x0) box.x0 = x; if (x > box.x1) box.x1 = x;
      if (y < box.y0) box.y0 = y; if (y > box.y1) box.y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (label[q] === -1 && data[q * 4 + 3] > threshold) { label[q] = id; stack.push(q); }
        }
      }
    }
    boxes.push(box);
  }
  // Drop specks, then merge boxes that overlap or nearly touch (detached bits of one object).
  const minPx = Math.max(200, (w * h) * 0.0005);
  let list = boxes.filter((b) => b.px >= minPx);
  const pad = Math.max(8, Math.round(Math.min(w, h) * 0.01));
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.x0 - pad <= b.x1 && b.x0 - pad <= a.x1 && a.y0 - pad <= b.y1 && b.y0 - pad <= a.y1) {
          list[i] = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1), px: a.px + b.px };
          list.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }
  // Reading order: group into rows by vertical overlap.
  list.sort((a, b) => a.y0 - b.y0);
  const rows = [];
  for (const b of list) {
    const row = rows.find((r) => b.y0 <= r.y1 && b.y1 >= r.y0);
    if (row) { row.items.push(b); row.y0 = Math.min(row.y0, b.y0); row.y1 = Math.max(row.y1, b.y1); }
    else rows.push({ y0: b.y0, y1: b.y1, items: [b] });
  }
  rows.sort((a, b) => a.y0 - b.y0);
  return rows.flatMap((r) => r.items.sort((a, b) => a.x0 - b.x0))
    .map((b) => ({ x: b.x0, y: b.y0, w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1 }));
}

export function cropRaw(raw, box) {
  const out = Buffer.alloc(box.w * box.h * 4);
  for (let y = 0; y < box.h; y++) {
    const src = ((box.y + y) * raw.width + box.x) * 4;
    raw.data.copy(out, y * box.w * 4, src, src + box.w * 4);
  }
  return { data: out, width: box.w, height: box.h };
}

export function rawToSharp(raw) {
  return sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 } });
}

/**
 * Scan art/incoming and return every source we can find:
 * Map name -> { file, raw?, box?, fromSheet, width, height }.
 * Also returns problems (bad sheets, unknown files).
 */
export async function scanIncoming({ loadPixels = true } = {}) {
  const files = listIncoming();
  const sheets = readSheetsMap();
  const sources = new Map();
  const notes = [];
  const sheetFiles = new Set(Object.keys(sheets));

  for (const f of files) {
    const full = path.join(INCOMING, f);
    const base = path.basename(f, path.extname(f));
    if (sheetFiles.has(f) || sheetFiles.has(base)) {
      const names = sheets[f] || sheets[base];
      if (!Array.isArray(names)) { notes.push(`sheets.json entry for ${f} must be a list of names`); continue; }
      const raw = removeBackground(await loadRaw(full));
      const boxes = splitSheet(raw);
      if (boxes.length !== names.length) {
        notes.push(`sheet ${f}: found ${boxes.length} objects but sheets.json lists ${names.length}; sheet skipped`);
        continue;
      }
      boxes.forEach((box, i) => {
        sources.set(names[i], { file: f, raw, box, fromSheet: true, width: box.w, height: box.h });
      });
      continue;
    }
    if (!ALL_NAMES.includes(base)) { notes.push(`unknown file ${f} (name not in the manifest), ignored`); continue; }
    const meta = await sharp(full).metadata();
    sources.set(base, { file: f, fromSheet: false, width: meta.width, height: meta.height, full, loadPixels });
  }
  for (const key of Object.keys(sheets)) {
    if (!files.includes(key) && !files.some((f) => path.basename(f, path.extname(f)) === key)) {
      notes.push(`sheets.json mentions ${key} but no such file is in art/incoming`);
    }
  }
  return { sources, notes };
}

export function printTable(rows, headers) {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells) => cells.map((c, i) => String(c).padEnd(widths[i])).join('  ');
  console.log(line(headers));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) console.log(line(r));
}
