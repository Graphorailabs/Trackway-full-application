import { WebStorage } from "./WebStorage";
import type { MediaStorage } from "@/storage/MediaStorage";

let instance: MediaStorage | null = null;

export type StorageKind = "web" /* | "cloud" | "localfs" */;

export interface StorageProviderOptions {
  kind?: StorageKind;
}

/**
 * Returns a singleton MediaStorage implementation.
 * Defaults to 'web' (IndexedDB).
 */
export async function getMediaStorage(
  opts?: StorageProviderOptions,
): Promise<MediaStorage> {
  if (instance) return instance;

  const kind = opts?.kind ?? "web";

  switch (kind) {
    case "web": {
      const s = new WebStorage();
      await s.init();
      instance = s;
      return s;
    }
    // case "cloud":
    //   const c = new CloudStorage(...); await c.init(); instance = c; return c;
    // case "localfs":
    //   const l = new LocalFSStorage(...); await l.init(); instance = l; return l;
    default:
      throw new Error(`Unsupported storage kind: ${kind}`);
  }
}
