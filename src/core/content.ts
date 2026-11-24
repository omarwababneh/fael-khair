import linesJson from '../../content/lines.json';
import registryJson from '../../content/registry.json';

interface RawLine { tts?: string; script?: string; registry?: string; speak?: boolean }
interface RegistryEntry {
  source_id: string;
  child_paraphrase_tts: string | null;
  child_paraphrase_script: string | null;
  tts?: boolean;
  approval_status: string;
}

export interface Line {
  id: string;
  /** Standard Arabic, for the phone's voice and the phase-1 bubble. */
  tts: string;
  /** Jordanian Arabic, for the father's recording. */
  script: string;
  /** false: never spoken by a synthetic voice. */
  speakable: boolean;
}

const lines = linesJson as Record<string, RawLine>;
export const registry = registryJson as RegistryEntry[];

export function getLine(id: string): Line {
  const raw = lines[id];
  if (!raw) throw new Error(`Unknown voice line: ${id}`);
  if (raw.registry) {
    // Religious lines come only from the registry.
    const e = registry.find((r) => r.source_id === raw.registry);
    if (!e) throw new Error(`Registry entry missing: ${raw.registry}`);
    return {
      id,
      tts: e.child_paraphrase_tts ?? '',
      script: e.child_paraphrase_script ?? e.child_paraphrase_tts ?? '',
      speakable: e.tts !== false && !!e.child_paraphrase_tts,
    };
  }
  return { id, tts: raw.tts ?? '', script: raw.script ?? raw.tts ?? '', speakable: raw.speak !== false };
}
