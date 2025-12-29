// src/storage/providers/WebStorage.ts
import type {
  MediaStorage,
  CreateProjectInput,
  StorageEstimate,
  MediaStorageCapabilities,
} from "@/storage/MediaStorage";
import type { ProjectID, ProjectRecord } from "@/types/project";

/* ----------------------------- IndexedDB setup ----------------------------- */

const DB_NAME = "trackway.projects.db";
const DB_VERSION = 1;
const STORE = "projects";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("by_updatedAt", "updatedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
 
function tx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    Promise.resolve(fn(store))
      .then((res) => {
        t.oncomplete = () => resolve(res);
        t.onerror = () => reject(t.error);
      })
      .catch(reject);
  });
}

function getReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

function uuid(): string {
  return (
    crypto.randomUUID?.() ??
    `p_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );
}

/* ------------------------------- Misc helpers ------------------------------ */

// Approximate UTF-8 bytes for strings (for per-backend usage estimate)
const enc = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
function bytesOfString(s: string): number {
  if (!s) return 0;
  if (enc) return enc.encode(s).length;
  return new Blob([s]).size;
}

// Lazy-load JSZip to avoid bundling/init-order issues in production builds
async function loadJSZip() {
  const mod = await import("jszip");
  return (mod as any).default ?? mod;
}

// Import helpers
function stripTopFolder(path: string): string {
  const clean = path.replace(/^[./]+/, "");
  const parts = clean.split("/");
  return parts.length > 1 ? parts.slice(1).join("/") : parts[0];
}

async function unzipToFileMap(blob: Blob): Promise<Record<string, string>> {
  try {
    const JSZip = await loadJSZip();
    const zip = await JSZip.loadAsync(blob);
    const files: Record<string, string> = {};
    const entries = Object.values(zip.files) as any[];
    await Promise.all(
      entries.map(async (entry: any) => {
        if (entry.dir) return;
        const base = entry.name.replace(/^[./]+/, "");
        if (base.toLowerCase() === "project.json") return;
        const rel = stripTopFolder(base);
        files[rel] = await entry.async("string");
      })
    );
    return files;
  } catch {
    throw new Error(
      "ZIP import requires the 'jszip' package. Install it or import a JSON export instead."
    );
  }
}

async function readBlobText(b: Blob): Promise<string> {
  return "text" in b ? (b as File).text() : new Response(b).text();
}

function guessIsZip(file: File | Blob, hint?: string): boolean {
  const name = (file as File).name || "";
  const type = (file as File).type || "";
  const h = hint || "";
  return (
    /\.zip$/i.test(name) ||
    type === "application/zip" ||
    type === "application/x-zip-compressed" ||
    /zip/i.test(h)
  );
}

/* ---------------------------- WebStorage backend --------------------------- */

export class WebStorage implements MediaStorage {
  private db?: IDBDatabase;

  async init(): Promise<void> {
    if (!this.db) {
      this.db = await openDB();
    }
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) throw new Error("WebStorage not initialized. Call init() first.");
    return this.db;
  }

  /* --------------------------------- CRUD ---------------------------------- */

  async createProject(input: CreateProjectInput): Promise<ProjectRecord> {
    const db = this.ensureDB();
    const now = new Date().toISOString();
    const record: ProjectRecord = {
      id: uuid(),
      name: input.name,
      files: input.files ?? {},
      createdAt: now,
      updatedAt: now,
    };
    await tx(db, "readwrite", (store) => getReq(store.add(record)));
    return record;
  }

  async getProject(id: ProjectID): Promise<ProjectRecord | null> {
    const db = this.ensureDB();
    return tx(db, "readonly", (store) =>
      getReq<ProjectRecord | null>(store.get(id)),
    );
  }

  async listProjects(): Promise<ProjectRecord[]> {
    const db = this.ensureDB();
    return tx(db, "readonly", async (store) => {
      const req = store.getAll();
      const all = await getReq<ProjectRecord[]>(req);
      return all.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)); // newest first
    });
  }

  async deleteProject(id: ProjectID): Promise<void> {
    const db = this.ensureDB();
    await tx(db, "readwrite", (store) => getReq(store.delete(id)));
  }

  async updateProject(project: ProjectRecord): Promise<ProjectRecord> {
    const db = this.ensureDB();
    project.updatedAt = new Date().toISOString();
    await tx(db, "readwrite", (store) => getReq(store.put(project)));
    return project;
  }

  /* -------------------------------- Export --------------------------------- */

  async exportProjectAsJSON(id: ProjectID): Promise<Blob> {
    const proj = await this.getProject(id);
    if (!proj) throw new Error("Project not found");
    return new Blob([JSON.stringify(proj, null, 2)], { type: "application/json" });
  }

  async exportProjectAsZip(id: ProjectID): Promise<Blob> {
    const proj = await this.getProject(id);
    if (!proj) throw new Error("Project not found");

    try {
      const JSZip = await loadJSZip();
      const zip = new JSZip();

      zip.file(
        "project.json",
        JSON.stringify(
          { id: proj.id, name: proj.name, createdAt: proj.createdAt, updatedAt: proj.updatedAt },
          null,
          2,
        ),
      );

      const baseName = proj.name?.trim() || "project";
      const safeName = baseName.replace(/[\\/:*?"<>|]+/g, "_") || "project";
      const filesFolder = zip.folder(safeName);
      Object.entries(proj.files).forEach(([path, content]) => {
        filesFolder?.file(path, content);
      });

      return await zip.generateAsync({ type: "blob" });
    } catch {
      // Fallback to JSON if jszip not present or dynamic import fails
      return this.exportProjectAsJSON(id);
    }
  }

  /* -------------------------- Import (ZIP or JSON) -------------------------- */

  async importProjectFromFile(
    file: File | Blob,
    options?: { nameOverride?: string; mimeTypeHint?: string }
  ): Promise<ProjectRecord> {
    this.ensureDB(); // ensure init was called

    const nameFromFile =
      typeof (file as File).name === "string"
        ? (file as File).name.replace(/\.(zip|json)$/i, "")
        : "Imported Project";
    const name =
      (options?.nameOverride ?? (nameFromFile || "Imported Project")).trim() || "Imported Project";

    let files: Record<string, string> = {};
    if (guessIsZip(file, options?.mimeTypeHint)) {
      files = await unzipToFileMap(file);
    } else {
      const txt = await readBlobText(file);
      try {
        const json = JSON.parse(txt) as Partial<ProjectRecord>;
        files = (json.files ?? {}) as Record<string, string>;
      } catch {
        throw new Error("Unsupported import file. Provide a ZIP or a JSON export.");
      }
    }

    return this.createProject({ name, files });
  }

  /* --------------------------- Quota & capabilities ------------------------- */

  async getStorageEstimate(): Promise<StorageEstimate> {
    let usage: number | undefined;
    let quota: number | undefined;
    let persisted: boolean | undefined;

    try {
      if (
        typeof navigator !== "undefined" &&
        "storage" in navigator &&
        typeof navigator.storage.estimate === "function"
      ) {
        const { usage: u, quota: q } = await navigator.storage.estimate();
        if (typeof u === "number") usage = u;
        if (typeof q === "number") quota = q;
      }
      if (
        typeof navigator !== "undefined" &&
        "storage" in navigator &&
        typeof navigator.storage.persisted === "function"
      ) {
        persisted = await navigator.storage.persisted();
      }
    } catch {
      // ignore; fallback below
    }

    // Backend-specific approximation: sum metadata + filenames + contents
    let projectsApproxBytes = 0;
    let projectCount = 0;
    try {
      const all = await this.listProjects();
      projectCount = all.length;
      for (const p of all) {
        projectsApproxBytes += bytesOfString(p.id);
        projectsApproxBytes += bytesOfString(p.name);
        projectsApproxBytes += bytesOfString(p.createdAt);
        projectsApproxBytes += bytesOfString(p.updatedAt);
        for (const [path, content] of Object.entries(p.files)) {
          projectsApproxBytes += bytesOfString(path);
          projectsApproxBytes += bytesOfString(content);
        }
      }
    } catch {
      // keep approx at 0 if listing fails
    }

    const usageBytes = typeof usage === "number" ? usage : projectsApproxBytes;
    const quotaBytes = typeof quota === "number" ? quota : null;
    const freeBytes = quotaBytes != null ? Math.max(0, quotaBytes - usageBytes) : null;

    return {
      usageBytes,
      quotaBytes,
      freeBytes,
      persisted,
      backend: "indexeddb",
      details: {
        projectsApproxBytes,
        projectCount,
        estimateSource: typeof usage === "number" ? "StorageManager.estimate" : "approx",
      },
    };
  }

  async getCapabilities(): Promise<MediaStorageCapabilities> {
    const canEstimate =
      typeof navigator !== "undefined" &&
      "storage" in navigator &&
      typeof navigator.storage.estimate === "function";

    const canPersist =
      typeof navigator !== "undefined" &&
      "storage" in navigator &&
      typeof navigator.storage.persist === "function";

    return {
      backend: "indexeddb",
      canEstimate,
      canPersist,
      supportsZipImport: true,  // via optional jszip
      supportsJsonImport: true,
    };
  }

  async requestPersistence(): Promise<boolean> {
    if (
      typeof navigator !== "undefined" &&
      "storage" in navigator &&
      typeof navigator.storage.persist === "function"
    ) {
      try {
        return await navigator.storage.persist();
      } catch {
        return false;
      }
    }
    return false;
  }
}
