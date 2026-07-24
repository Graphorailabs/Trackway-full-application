import type { ProjectID, ProjectRecord, ProjectFileMap } from "@/types/project";
import { getMediaStorage } from "@/storage/providers/MediaStorageProvider";
import { createProjectZip, createProjectJson } from "@/services/ProjectService";
import type { StorageEstimate, MediaStorageCapabilities } from "@/storage/MediaStorage";
// Lazy-load JSZip to avoid bundling/init-order issues in production builds
async function loadJSZip() {
  const mod = await import("jszip");
  // support both ESM default and CJS interop
  return (mod as any).default ?? mod;
}

/* ------------------------------ helpers ----------------------------------- */

async function unzipToFileMap(blob: Blob): Promise<ProjectFileMap> {
  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(blob);
  const files: ProjectFileMap = {};
  const entries = Object.values(zip.files) as any[];

  await Promise.all(
    entries.map(async (entry: any) => {
      if (entry.dir) return;
      const text = await entry.async("string");
      const path = entry.name.replace(/^[./]+/, "");
      files[path] = text;
    })
  );

  return files;
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

/* -------------------------- ProjectStorageService -------------------------- */

export class ProjectStorageService {
  private ready: Promise<void>;
  private static ACTIVE_PROJECT_KEY = "trackway.activeProjectId";
  constructor() {
    this.ready = getMediaStorage().then(() => undefined);
  }

  private async storage() {
    await this.ready;
    return getMediaStorage(); // singleton
  }

  /* ------------------------------- Create ---------------------------------- */

  async create(name: string): Promise<ProjectRecord> {
    const s = await this.storage();

    let files: ProjectFileMap = {};
    try {
      const zipBlob = await createProjectZip(name);
      files = await unzipToFileMap(zipBlob);
    } catch {
      try {
        const res = await createProjectJson(name);
        files = res.files ?? {};
      } catch {
        files = {};
      }
    }

    return s.createProject({ name, files });
  }

  // Create a project directly from an already-materialized file map (e.g.
  // fetched from a remote source), skipping the WASM starter-file generation.
  async createWithFiles(name: string, files: ProjectFileMap): Promise<ProjectRecord> {
    const s = await this.storage();
    return s.createProject({ name, files });
  }

  /* --------------------------------- CRUD ---------------------------------- */

  async list(): Promise<ProjectRecord[]> {
    const s = await this.storage();
    return s.listProjects();
  }

  async get(id: ProjectID): Promise<ProjectRecord | null> {
    const s = await this.storage();
    return s.getProject(id);
  }

  async delete(id: ProjectID): Promise<void> {
    const s = await this.storage();
    return s.deleteProject(id);
  }

  async updateFiles(id: ProjectID, files: ProjectFileMap): Promise<ProjectRecord> {
    const s = await this.storage();
    const existing = await s.getProject(id);
    if (!existing) throw new Error("Project not found");
    existing.files = files;
    return s.updateProject(existing);
  }

  /* -------------------------------- Export --------------------------------- */

  async exportJSON(id: ProjectID): Promise<Blob> {
    const s = await this.storage();
    return s.exportProjectAsJSON(id);
  }

  async exportZip(id: ProjectID): Promise<Blob> {
    const s = await this.storage();
    return s.exportProjectAsZip(id);
  }

  /* ------------------------------- Rename ---------------------------------- */

  async rename(id: ProjectID, name: string): Promise<ProjectRecord> {
    const s = await this.storage();
    const rec = await s.getProject(id);
    if (!rec) throw new Error("Project not found");
    rec.name = name;
    return s.updateProject(rec);
  }

  /* ------------------------------- Import ---------------------------------- */

  // Legacy helper (kept): import a raw ZIP blob with a provided name
  async importZip(name: string, blob: Blob): Promise<ProjectRecord> {
    const s = await this.storage();
    const files = await unzipToFileMap(blob);
    return s.createProject({ name, files });
  }

  // NEW: unified import from a browser File (ZIP or JSON)
  async importFromFile(file: File, nameOverride?: string): Promise<ProjectRecord> {
    const s = await this.storage();

    // 1) Prefer backend-native import if available (lets other backends handle it)
    try {
      return await s.importProjectFromFile(file, { nameOverride });
    } catch {
      // fall through to service-side parsing
    }

    // 2) Service-side parsing fallback (works with your current IndexedDB backend)
    if (guessIsZip(file)) {
      const files = await unzipToFileMap(file);
      const name = nameOverride ?? (file.name.replace(/\.zip$/i, "") || "Imported Project");
      return s.createProject({ name, files });
    }

    // JSON export fallback
    const txt = await readBlobText(file);
    try {
      const json = JSON.parse(txt) as Partial<ProjectRecord>;
      const name =
        nameOverride ?? (json.name ?? (file.name.replace(/\.json$/i, "") || "Imported Project"));
      const files = (json.files ?? {}) as ProjectFileMap;
      return s.createProject({ name, files });
    } catch {
      throw new Error("Unsupported import file. Provide a ZIP (recommended) or JSON export.");
    }
  }

  /* --------------------------- Quota & capabilities ------------------------- */

  async getStorageEstimate(): Promise<StorageEstimate> {
    const s = await this.storage();
    return s.getStorageEstimate();
  }

  async getCapabilities(): Promise<MediaStorageCapabilities> {
    const s = await this.storage();
    try {
      return await s.getCapabilities();
    } catch {
      return {
        backend: "unknown",
        canEstimate: false,
        canPersist: false,
        supportsZipImport: false,
        supportsJsonImport: false,
      };
    }
  }

  async requestPersistence(): Promise<boolean> {
    const s = await this.storage();
    if (typeof s.requestPersistence === "function") {
      return s.requestPersistence();
    }
    return false;
  }

  /* -------------------------- Active project helpers ------------------------- */

  async getActiveProjectId(): Promise<ProjectID | null> {
    return this.readActiveProjectId();
  }

  async setActiveProjectId(id: ProjectID | null): Promise<void> {
    this.writeActiveProjectId(id);
  }

  private readActiveProjectId(): ProjectID | null {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(ProjectStorageService.ACTIVE_PROJECT_KEY);
      return raw ? (raw as ProjectID) : null;
    } catch {
      return null;
    }
  }

  private writeActiveProjectId(id: ProjectID | null): void {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return;
    }
    try {
      if (id) {
        window.localStorage.setItem(ProjectStorageService.ACTIVE_PROJECT_KEY, id);
      } else {
        window.localStorage.removeItem(ProjectStorageService.ACTIVE_PROJECT_KEY);
      }
    } catch {
      // ignore persistence failures (private browsing etc.)
    }
  }
}

export const projectStorage = new ProjectStorageService();
