// The parent's own recordings of the voice lines, made in the parents' corner.
// They stay on this phone only (IndexedDB, in this app's own storage). They are
// never uploaded or sent anywhere. A recorded line always plays instead of the
// phone's voice (voice.ts). Every call is wrapped: without storage (a private
// window, for example) there are simply no recordings.

const DB_NAME = 'fk-recordings';
const STORE = 'lines';

let dbp: Promise<IDBDatabase | null> | null = null;
const ids = new Set<string>();
const listeners: Array<() => void> = [];

function open(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
      req.onblocked = () => res(null);
    } catch {
      res(null);
    }
  });
  return dbp;
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return open().then((db) => new Promise<T | null>((res) => {
    if (!db) return res(null);
    try {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
    } catch {
      res(null);
    }
  }));
}

export const recordings = {
  /** Load the list of recorded lines (call once at start). */
  async init(): Promise<void> {
    const keys = await run<IDBValidKey[]>('readonly', (s) => s.getAllKeys());
    ids.clear();
    for (const k of keys ?? []) ids.add(String(k));
  },
  has(id: string): boolean {
    return ids.has(id);
  },
  get(id: string): Promise<Blob | null> {
    return run<Blob>('readonly', (s) => s.get(id) as IDBRequest<Blob>);
  },
  async put(id: string, blob: Blob): Promise<boolean> {
    // Ask the browser to keep this app's storage (so Safari does not clear the recordings).
    try { void navigator.storage?.persist?.(); } catch { /* not supported */ }
    const ok = (await run('readwrite', (s) => s.put(blob, id))) !== null;
    if (ok) ids.add(id);
    for (const fn of listeners) fn();
    return ok;
  },
  async remove(id: string): Promise<void> {
    await run('readwrite', (s) => s.delete(id));
    ids.delete(id);
    for (const fn of listeners) fn();
  },
  /** Called after any change (the voice forgets its decoded copy). */
  onChange(fn: () => void): void {
    listeners.push(fn);
  },
};

/** Can this phone record here (microphone and MediaRecorder)? */
export const canRecord = (): boolean =>
  typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

/** Start recording from the microphone. stop() resolves with the recording. */
export async function startRecording(): Promise<{ stop: () => Promise<Blob | null> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported?.(t));
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.start();
  return {
    stop: () => new Promise((res) => {
      rec.onstop = () => {
        for (const t of stream.getTracks()) t.stop();
        res(chunks.length ? new Blob(chunks, { type: rec.mimeType || type || 'audio/mp4' }) : null);
      };
      try {
        rec.stop();
      } catch {
        for (const t of stream.getTracks()) t.stop();
        res(null);
      }
    }),
  };
}
