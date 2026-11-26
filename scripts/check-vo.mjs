// npm run check:vo
// Compares the voice lines in content/lines.json with the built-in voice files
// in public/assets/audio/vo/<line id>.m4a and lists:
//   - spoken lines with no file (they fall back to the phone's speech), and
//   - files with no line (never played).
// A line that must never be spoken by a synthetic voice (the Wadi Rum ayah, or
// any line marked "speak": false) is expected to have no file; if one has a
// file it is listed too.
// Always exits 0: in the build it is a warning, not a failure.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quiet = process.argv.includes('--build');
const lines = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'lines.json'), 'utf8'));
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'registry.json'), 'utf8'));
const dir = path.join(ROOT, 'public', 'assets', 'audio', 'vo');
const files = fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((f) => f.endsWith('.m4a')).map((f) => f.slice(0, -4))
  : [];

/** Same rule as src/core/content.ts: may a synthetic voice say this line? */
function speakable(raw) {
  if (!raw.registry) return raw.speak !== false;
  const e = registry.find((r) => r.source_id === raw.registry);
  if (!e) return false;
  const p = raw.part ? e.parts?.[raw.part] : e;
  return e.tts !== false && !!p?.child_paraphrase_tts;
}

const ids = Object.keys(lines);
const have = new Set(files);
const missing = ids.filter((id) => speakable(lines[id]) && !have.has(id));
const unspoken = ids.filter((id) => !speakable(lines[id]) && have.has(id));
const orphans = files.filter((f) => !(f in lines));

const spoken = ids.filter((id) => speakable(lines[id])).length;
const ok = !missing.length && !unspoken.length && !orphans.length;
const tag = quiet ? 'check:vo warning:' : '';
if (ok) {
  if (!quiet) console.log(`check:vo: all ${spoken} spoken lines have a voice file; no extra files.`);
} else {
  if (missing.length) console.warn(`${tag} ${missing.length} spoken line(s) with no file in public/assets/audio/vo (the phone's speech is used):\n  ${missing.join('\n  ')}`);
  if (unspoken.length) console.warn(`${tag} ${unspoken.length} file(s) for lines that must not be spoken by a synthetic voice (never played):\n  ${unspoken.join('\n  ')}`);
  if (orphans.length) console.warn(`${tag} ${orphans.length} file(s) with no line in content/lines.json:\n  ${orphans.join('\n  ')}`);
  if (!quiet) console.log(`check:vo: ${spoken - missing.length} of ${spoken} spoken lines have a file.`);
}
process.exit(0);
