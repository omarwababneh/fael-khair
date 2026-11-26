import linesJson from '../../content/lines.json';
import registryJson from '../../content/registry.json';

interface RawLine { tts?: string; script?: string; registry?: string; part?: string; speak?: boolean }
export interface Paraphrase {
  child_paraphrase_tts: string | null;
  child_paraphrase_script: string | null;
}
export interface RegistryEntry extends Paraphrase {
  source_id: string;
  reference: string;
  used_in: string[];
  /** direct, application (or one per mission), or father_own_words: a line of
   *  the father's own that is reviewed together with the religious texts. */
  kind: string | Record<string, string>;
  tts?: boolean;
  /** One source used by several missions keeps one paraphrase per part (bukhari_2989). */
  parts?: Record<string, Paraphrase>;
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
    const p: Paraphrase | undefined = raw.part ? e.parts?.[raw.part] : e;
    if (!p) throw new Error(`Registry part missing: ${raw.registry} ${raw.part}`);
    return {
      id,
      tts: p.child_paraphrase_tts ?? '',
      script: p.child_paraphrase_script ?? p.child_paraphrase_tts ?? '',
      speakable: e.tts !== false && !!p.child_paraphrase_tts,
    };
  }
  return { id, tts: raw.tts ?? '', script: raw.script ?? raw.tts ?? '', speakable: raw.speak !== false };
}
