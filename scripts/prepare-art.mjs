// npm run art
// Reads art/incoming/, cleans and resizes every image, writes WebP files to
// public/assets/art/, writes the home-screen icons, and writes
// public/assets/index.json (the list of art and audio files the game can use,
// so the game never has to probe for missing files over the network).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  ROOT, INCOMING, OUT_ART, OUT_ICONS, REQUIRED, ICON, isBackground,
  scanIncoming, loadRaw, removeBackground, alphaBounds, cropRaw, rawToSharp, printTable,
} from './art-lib.mjs';

const quiet = process.argv.includes('--quiet');
const log = (...a) => { if (!quiet) console.log(...a); };

fs.mkdirSync(OUT_ART, { recursive: true });
fs.mkdirSync(OUT_ICONS, { recursive: true });

const { sources, notes } = await scanIncoming();
const produced = {};
const rows = [];

for (const [name, src] of sources) {
  if (name === ICON) continue;
  const outFile = path.join(OUT_ART, `${name}.webp`);
  let img;
  if (isBackground(name)) {
    img = sharp(path.join(INCOMING, src.file)).resize({ width: 1170 });
  } else {
    let raw = src.fromSheet ? cropRaw(src.raw, src.box) : removeBackground(await loadRaw(path.join(INCOMING, src.file)));
    const b = alphaBounds(raw);
    if (b) raw = cropRaw(raw, b);
    img = rawToSharp(raw).resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true });
  }
  const info = await img.webp({ quality: 86, alphaQuality: 90 }).toFile(outFile);
  produced[name] = { w: info.width, h: info.height };
  rows.push([name, src.fromSheet ? `${src.file} (sheet)` : src.file, `${info.width} x ${info.height}`]);
}

// Remove stale outputs whose source has gone.
for (const f of fs.readdirSync(OUT_ART)) {
  const base = path.basename(f, path.extname(f));
  if (!produced[base]) fs.rmSync(path.join(OUT_ART, f));
}

// Home-screen icons from icon_app, or a magenta placeholder.
const iconSrc = sources.get(ICON);
const iconSizes = [180, 192, 512];
for (const size of iconSizes) {
  const out = path.join(OUT_ICONS, `icon-${size}.png`);
  if (iconSrc) {
    const input = iconSrc.fromSheet
      ? rawToSharp(cropRaw(iconSrc.raw, iconSrc.box)).png()
      : sharp(path.join(INCOMING, iconSrc.file));
    await sharp(await input.toBuffer()).resize(size, size, { fit: 'cover' }).flatten({ background: '#f3dfb4' }).png().toFile(out);
  } else {
    const fontSize = Math.round(size / 7);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="100%" height="100%" fill="#ff00ff"/>
      <text x="50%" y="54%" font-family="sans-serif" font-size="${fontSize}" text-anchor="middle" fill="#000">icon_app</text>
    </svg>`;
    await sharp(Buffer.from(svg)).png().toFile(out);
  }
}

// Audio files present (recordings and overrides).
const audioDir = path.join(ROOT, 'public', 'assets', 'audio');
const listAudio = (sub) => {
  const d = path.join(audioDir, sub);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.toLowerCase().endsWith('.m4a')).map((f) => path.basename(f, '.m4a')).sort();
};
const index = {
  art: produced,
  audio: { vo: listAudio('vo'), music: listAudio('music'), sfx: listAudio('sfx'), quran: listAudio('quran') },
};
fs.writeFileSync(path.join(ROOT, 'public', 'assets', 'index.json'), JSON.stringify(index, null, 1) + '\n');

const missing = REQUIRED.filter((n) => n === ICON ? !iconSrc : !produced[n]);
if (!quiet) {
  if (rows.length) { console.log('\nProduced:'); printTable(rows, ['asset', 'source', 'output']); }
  else console.log('\nProduced: nothing yet (art/incoming/ has no usable images).');
  if (iconSrc) console.log(`\nIcons: made from ${iconSrc.file}`);
  console.log(`\nStill missing (${missing.length} of ${REQUIRED.length}):`);
  console.log(missing.length ? '  ' + missing.join(', ') : '  none');
  for (const n of notes) console.log(`Note: ${n}`);
} else if (notes.length) {
  for (const n of notes) console.log(`prepare-art note: ${n}`);
}
log('');
