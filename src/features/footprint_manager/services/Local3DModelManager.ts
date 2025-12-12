import type { Footprint3DModelMetadata, Footprint3DModelPackage, Local3DModelManager as Local3DModelManagerContract } from "../types";

// Lazy-load JSZip to keep the default bundle lean.
async function loadJSZip() {
  const mod = await import("jszip");
  return (mod as any).default ?? mod;
}

const SUPPORTED_MODEL_EXTENSIONS = ["wrl", "step", "stp", "obj", "3mf", "igs", "iges", "glb", "gltf", "ply", "3ds"];

const META_FILENAMES = ["metadata.json", "manifest.json", "package.json", "meta.json"];

type StoredModelRecord = {
  id: string;
  meta: Footprint3DModelMetadata;
  file?: Blob;
  category: string;
  footprintName?: string;
  footprintNameLc?: string;
};

export class Local3DModelManager implements Local3DModelManagerContract {
  private dbName = "trackway-footprint-models-v1";
  private categoriesStore = "modelCategories";
  private modelsStore = "footprintModels";
  private storageKey = "trackway.localFootprintModels3d";

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.categoriesStore)) {
          db.createObjectStore(this.categoriesStore, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(this.modelsStore)) {
          const store = db.createObjectStore(this.modelsStore, { keyPath: "id" });
          store.createIndex("byCategory", "category", { unique: false });
          store.createIndex("byFootprintLc", "footprintNameLc", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async putCategoryToDb(obj: any) {
    const db = await this.openDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.categoriesStore, "readwrite");
      const store = tx.objectStore(this.categoriesStore);
      const r = store.put(obj);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }

  private async putModelToDb(record: StoredModelRecord) {
    const db = await this.openDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.modelsStore, "readwrite");
      const store = tx.objectStore(this.modelsStore);
      const r = store.put(record);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }

  private async getModelFromDb(id: string): Promise<StoredModelRecord | null> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.modelsStore, "readonly");
      const store = tx.objectStore(this.modelsStore);
      const r = store.get(id);
      r.onsuccess = () => resolve((r.result as StoredModelRecord) ?? null);
      r.onerror = () => reject(r.error);
    });
  }

  private async getModelByFootprintNameLc(nameLc: string): Promise<StoredModelRecord | null> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.modelsStore, "readonly");
      const store = tx.objectStore(this.modelsStore);
      const idx = store.index("byFootprintLc");
      const r = idx.get(nameLc);
      r.onsuccess = () => resolve((r.result as StoredModelRecord) ?? null);
      r.onerror = () => reject(r.error);
    });
  }

  private async getAllModelsFromDb(): Promise<StoredModelRecord[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.modelsStore, "readonly");
      const store = tx.objectStore(this.modelsStore);
      const r = store.getAll();
      r.onsuccess = () => resolve((r.result as StoredModelRecord[]) ?? []);
      r.onerror = () => reject(r.error);
    });
  }

  private async deleteModelFromDb(id: string): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.modelsStore, "readwrite");
      const store = tx.objectStore(this.modelsStore);
      const r = store.delete(id);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }

  private async countModelsInCategory(category: string): Promise<number> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.modelsStore, "readonly");
      const store = tx.objectStore(this.modelsStore);
      const idx = store.index("byCategory");
      const r = idx.count(IDBKeyRange.only(category));
      r.onsuccess = () => resolve(r.result ?? 0);
      r.onerror = () => reject(r.error);
    });
  }

  private normalizeFootprintName(name: string) {
    return name.trim().toLowerCase();
  }

  private async readPackageMetadata(zip: any): Promise<Partial<Footprint3DModelMetadata> | null> {
    for (const filename of META_FILENAMES) {
      const file = zip.file(filename);
      if (!file) continue;
      try {
        const text = await file.async("text");
        return JSON.parse(text) as Partial<Footprint3DModelMetadata>;
      } catch (err) {
        console.warn("Failed to parse 3D metadata", err);
      }
    }
    return null;
  }

  private getExtension(filename: string): string | null {
    const parts = filename.split(".");
    if (parts.length < 2) return null;
    const ext = parts.pop()?.toLowerCase() ?? null;
    if (!ext || !SUPPORTED_MODEL_EXTENSIONS.includes(ext)) return null;
    return ext;
  }

  private deriveFootprintName(filename: string) {
    const idx = filename.lastIndexOf(".");
    const name = idx >= 0 ? filename.slice(0, idx) : filename;
    return name.trim();
  }

  private extractModelInfo(path: string): { category: string; relativePath: string; filename: string } | null {
    const parts = path.split("/").filter(Boolean);
    if (!parts.length) return null;
    const shapesIndex = parts.findIndex((seg) => seg.toLowerCase().endsWith(".3dshapes"));
    if (shapesIndex === -1) return null;
    const category = parts[shapesIndex].replace(/\.3dshapes$/i, "") || "local";
    const relativeParts = parts.slice(shapesIndex + 1);
    if (!relativeParts.length) return null;
    return {
      category,
      relativePath: relativeParts.join("/"),
      filename: relativeParts[relativeParts.length - 1],
    };
  }

  private async syncStorageCache() {
    try {
      const records = await this.getAllModelsFromDb();
      const payload = records.map((record) => record.meta);
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch (err) {
      console.warn("Failed to sync 3D model cache", err);
    }
  }

  async listInstalled(): Promise<Footprint3DModelMetadata[]> {
    try {
      const records = await this.getAllModelsFromDb();
      return records.map((rec) => rec.meta);
    } catch (err) {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return [];
        return JSON.parse(raw) as Footprint3DModelMetadata[];
      } catch {
        return [];
      }
    }
  }

  async installFromZip(buffer: ArrayBuffer, category?: string): Promise<Footprint3DModelMetadata[]> {
    const JSZip = await loadJSZip();
    const zip = await JSZip.loadAsync(buffer);
    const parsedMeta = await this.readPackageMetadata(zip);
    const created: Footprint3DModelMetadata[] = [];
    const touchedCategories = new Set<string>();
    const fallbackCategory = category || parsedMeta?.category || "local";

    const paths = Object.keys(zip.files);
    for (const path of paths) {
      const entry = zip.files[path];
      if (!entry || entry.dir) continue;
      const info = this.extractModelInfo(path);
      const activeCategory = info?.category ?? fallbackCategory;
      const fallbackParts = path.split("/").filter(Boolean);
      const filename = info?.filename ?? fallbackParts[fallbackParts.length - 1] ?? path;
      const relativePath = info?.relativePath ?? (fallbackParts.join("/") || filename);
      const ext = this.getExtension(filename);
      if (!ext) continue;

      try {
        const blob = await entry.async("blob");
        const footprintName = this.deriveFootprintName(filename);
        const id = `${activeCategory}::${relativePath}::${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const meta: Footprint3DModelMetadata = {
          id,
          name: relativePath,
          category: activeCategory,
          description: parsedMeta?.description ?? "",
          footprintName,
          format: ext,
          source: "local",
        };

        await this.putModelToDb({
          id,
          meta,
          file: blob,
          category: meta.category,
          footprintName: meta.footprintName,
          footprintNameLc: meta.footprintName ? this.normalizeFootprintName(meta.footprintName) : undefined,
        });

        created.push(meta);
        if (!touchedCategories.has(activeCategory)) {
          touchedCategories.add(activeCategory);
          await this.putCategoryToDb({ id: activeCategory, name: activeCategory, description: parsedMeta?.description ?? "" });
        }
      } catch (err) {
        console.warn("Failed to store 3D model", path, err);
      }
    }

    await this.syncStorageCache();
    return created;
  }

  async uninstall(id: string): Promise<void> {
    const record = await this.getModelFromDb(id);
    if (!record) return;
    try {
      await this.deleteModelFromDb(id);
    } catch (err) {
      console.warn("Failed to delete 3D model", err);
    }

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const arr = JSON.parse(raw) as Footprint3DModelMetadata[];
        const filtered = arr.filter((meta) => meta.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(filtered));
      }
    } catch (err) {
      console.warn("Failed to update 3D cache", err);
    }

    try {
      const category = record.meta.category;
      const remaining = await this.countModelsInCategory(category);
      if (remaining <= 0) {
        const db = await this.openDb();
        const tx = db.transaction(this.categoriesStore, "readwrite");
        tx.objectStore(this.categoriesStore).delete(category);
      }
    } catch (err) {
      console.warn("Failed to prune 3D model category", err);
    }
  }

  async getModel(id: string): Promise<Footprint3DModelPackage | null> {
    const record = await this.getModelFromDb(id);
    if (!record) return null;
    const { meta, file } = record;
    if (!file) return { meta, data: undefined };
    try {
      const data = await file.arrayBuffer();
      return { meta, data };
    } catch (err) {
      console.warn("Failed to read 3D blob", err);
      return { meta, data: undefined };
    }
  }

  async findByFootprintName(footprintName: string): Promise<Footprint3DModelPackage | null> {
    const normalized = this.normalizeFootprintName(footprintName);
    const record = await this.getModelByFootprintNameLc(normalized);
    if (!record) return null;
    const { meta, file } = record;
    if (!file) return { meta, data: undefined };
    try {
      const data = await file.arrayBuffer();
      return { meta, data };
    } catch (err) {
      console.warn("Failed to read 3D blob", err);
      return { meta, data: undefined };
    }
  }
}
