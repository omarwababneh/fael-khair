// npm run check:art
// Lists every missing or undersized asset in art/incoming/.
// With --build: exits with an error when required art is missing,
// unless the environment variable ALLOW_PLACEHOLDERS=1 is set.
import { REQUIRED, scanIncoming, minSizeProblem, printTable } from './art-lib.mjs';

const buildMode = process.argv.includes('--build');
const allow = process.env.ALLOW_PLACEHOLDERS === '1';

const { sources, notes } = await scanIncoming({ loadPixels: false });
const missing = REQUIRED.filter((n) => !sources.has(n));
const small = [];
for (const [name, s] of sources) {
  const p = minSizeProblem(name, s.width, s.height, s.fromSheet);
  if (p) small.push([name, s.file, p]);
}

console.log(`Art check: ${REQUIRED.length - missing.length} of ${REQUIRED.length} required assets present.`);
if (missing.length) {
  console.log(`\nMissing (${missing.length}):`);
  for (const m of missing) console.log(`  - ${m}`);
}
if (small.length) {
  console.log(`\nUndersized (${small.length}):`);
  printTable(small, ['asset', 'file', 'problem']);
}
for (const n of notes) console.log(`Note: ${n}`);

if (buildMode && missing.length) {
  if (allow) {
    console.log(`\nALLOW_PLACEHOLDERS=1: building anyway. Missing art shows as magenta boxes.\n`);
  } else {
    console.error(`\nBuild stopped: ${missing.length} required art files are missing.\n` +
      `Add them to art/incoming/, or build with ALLOW_PLACEHOLDERS=1 to use magenta placeholders.\n`);
    process.exit(1);
  }
}
