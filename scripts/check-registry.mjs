// Prints a clear warning for every religious registry entry that is not yet
// approved by the owner. Never blocks the build (GAME_SPEC.md section 8).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './art-lib.mjs';

const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'registry.json'), 'utf8'));
const pending = reg.filter((e) => e.approval_status !== 'approved');
if (pending.length) {
  console.warn('\n================ RELIGIOUS CONTENT: OWNER REVIEW NEEDED ================');
  console.warn(`${pending.length} of ${reg.length} registry entries are not approved yet:`);
  for (const e of pending) console.warn(`  - ${e.source_id} (${e.reference}): ${e.approval_status}`);
  console.warn('Review content/registry.json and set "approval_status" to "approved".');
  console.warn('=========================================================================\n');
} else {
  console.log('Registry: all entries approved.');
}
