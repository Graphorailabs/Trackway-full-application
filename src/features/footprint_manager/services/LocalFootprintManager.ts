import type { LocalPackageManager, FootprintMetadata, FootprintPackage } from "../types";
import JSZip from "jszip";

// Local manager that stores categories and individual footprints in IndexedDB.
// - `categories` store contains one record per category (id = category name)
// - `footprints` store contains one record per footprint with a blob for the file
// The UI expects `listInstalled()` to return the flattened list of footprints
// where `.category` is the category name.
export class LocalFootprintManager implements LocalPackageManager {
  private dbName = "trackway-footprints-v2";
  private categoriesStore = "categories";
  private footprintsStore = "footprints";
  // legacy metadata key (kept for compatibility/fast reads if desired)
  private storageKey = "trackway.localFootprints";

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.categoriesStore)) {
          db.createObjectStore(this.categoriesStore, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(this.footprintsStore)) {
          const store = db.createObjectStore(this.footprintsStore, { keyPath: "id" });
          store.createIndex("byCategory", "category", { unique: false });
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

  private async putFootprintToDb(obj: any) {
    const db = await this.openDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.footprintsStore, "readwrite");
      const store = tx.objectStore(this.footprintsStore);
      const r = store.put(obj);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }

  private async getFootprintFromDb(id: string): Promise<any | null> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.footprintsStore, "readonly");
      const store = tx.objectStore(this.footprintsStore);
      const r = store.get(id);
      r.onsuccess = () => resolve(r.result ?? null);
      r.onerror = () => reject(r.error);
    });
  }

  private async getAllFootprintsFromDb(): Promise<any[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.footprintsStore, "readonly");
      const store = tx.objectStore(this.footprintsStore);
      const r = store.getAll();
      r.onsuccess = () => resolve(r.result ?? []);
      r.onerror = () => reject(r.error);
    });
  }

  private async deleteFootprintFromDb(id: string): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.footprintsStore, "readwrite");
      const store = tx.objectStore(this.footprintsStore);
      const r = store.delete(id);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }

  private async countFootprintsInCategory(cat: string): Promise<number> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.footprintsStore, "readonly");
      const store = tx.objectStore(this.footprintsStore);
      const idx = store.index("byCategory");
      const r = idx.count(IDBKeyRange.only(cat));
      r.onsuccess = () => resolve(r.result ?? 0);
      r.onerror = () => reject(r.error);
    });
  }

  // Reads installed footprints. Returns flattened list of footprint metadata.
  async listInstalled(): Promise<FootprintMetadata[]> {
    try {
      const items = await this.getAllFootprintsFromDb();
      // each stored item has shape { id, meta, file }
      return items.map((it) => it.meta as FootprintMetadata);
    } catch (e) {
      // fallback to legacy localStorage if DB not available
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return [];
        return JSON.parse(raw) as FootprintMetadata[];
      } catch (e) {
        return [];
      }
    }
  }

  // Install a .pretty.zip: extract footprints under the category folder (or use provided
  // category), create one footprint record per file, and store the file blob alongside
  // the footprint metadata in IndexedDB. Returns the first created FootprintMetadata
  // (so callers that append a single item still get a visible result).
  async installFromZip(buffer: ArrayBuffer, category: string): Promise<FootprintMetadata> {
    const zip = await JSZip.loadAsync(buffer);

    // Attempt to find metadata file inside the zip
    const metaFilenames = ["metadata.json", "manifest.json", "package.json", "meta.json"];
    let parsedMeta: Partial<FootprintMetadata> | null = null;
    for (const name of metaFilenames) {
      const file = zip.file(name);
      if (file) {
        try {
          const txt = await file.async("text");
          parsedMeta = JSON.parse(txt) as Partial<FootprintMetadata>;
          break;
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    // detect category folder like "name.pretty/" if present
    let categoryFolder: string | null = null;
    for (const p of Object.keys(zip.files)) {
      const parts = p.split("/").filter(Boolean);
      if (parts.length > 0 && parts[0].toLowerCase().endsWith(".pretty")) {
        categoryFolder = parts[0];
        break;
      }
    }
    const catName = (categoryFolder ? categoryFolder.replace(/\.pretty$/i, "") : category) || parsedMeta?.category || "local";

    // No thumbnail support: footprints are file-based and will be rendered by
    // the footprint renderer later. We do not create or store thumbnails here.

    // persist category record
    const categoryId = catName;
    try {
      await this.putCategoryToDb({ id: categoryId, name: catName, description: parsedMeta?.description ?? "" });
    } catch (e) {
      console.warn("Failed to persist category", e);
    }

    const created: FootprintMetadata[] = [];

    // iterate files under the category folder (or whole archive if no folder)
    for (const p of Object.keys(zip.files)) {
      if (zip.files[p].dir) continue;
      if (categoryFolder && !p.startsWith(categoryFolder + "/")) continue;
      const parts = p.split("/").filter(Boolean);
      const filename = parts[parts.length - 1];
      const lower = filename.toLowerCase();
      if (metaFilenames.includes(lower) || lower === "thumbnail.png" || lower === "preview.png" || lower === "cover.png") continue;

      try {
        const blob = await zip.files[p].async("blob");
        const fpId = `${categoryId}::${filename}::${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const fpMeta: FootprintMetadata = {
          id: fpId,
          name: filename.replace(/\.[^.]+$/, ""),
          category: categoryId,
          description: parsedMeta?.description ?? "",
          source: "local",
        };

        // No thumbnail assignment; renderer will parse footprint files when needed.

        // store footprint record with its file blob
        await this.putFootprintToDb({ id: fpId, meta: fpMeta, file: blob });
        created.push(fpMeta);
      } catch (e) {
        console.warn("failed to read entry", p, e);
      }
    }

    // Update a simple localStorage cache for fast reads (optional)
    try {
      const existing = await this.listInstalled();
      const merged = existing.concat(created);
      localStorage.setItem(this.storageKey, JSON.stringify(merged));
    } catch (e) {
      // ignore
    }

    // return the first created footprint metadata so callers that append a single
    // item to UI will show something immediately
    if (created.length > 0) return created[0];

    // if nothing created, return a synthetic meta for the category
    return { id: `local-${Date.now()}`, name: parsedMeta?.name ?? `Installed ${categoryId}`, category: categoryId, source: "local" };
  }

  // uninstall a single footprint id. If the category becomes empty, clean it up.
  async uninstall(id: string): Promise<void> {
    // get footprint metadata
    const item = await this.getFootprintFromDb(id);
    // No thumbnail object URLs to revoke. Footprint renderer will handle any
    // derived previews at render time.

    try {
      await this.deleteFootprintFromDb(id);
    } catch (e) {
      console.warn("Failed to delete footprint from DB", e);
    }

    // remove from localStorage cache if present
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const arr = JSON.parse(raw) as FootprintMetadata[];
        const filtered = arr.filter((m) => m.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(filtered));
      }
    } catch (e) { /* ignore */ }

    // if category empty, remove category record
    try {
      const cat = item?.meta?.category;
      if (cat) {
        const count = await this.countFootprintsInCategory(cat);
        if (count <= 0) {
          const db = await this.openDb();
          const tx = db.transaction(this.categoriesStore, "readwrite");
          tx.objectStore(this.categoriesStore).delete(cat);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // get package: return the stored file blob as ArrayBuffer for the footprint id
  async getPackage(id: string): Promise<FootprintPackage | null> {
    const fp = await this.getFootprintFromDb(id);
    if (!fp) return null;
    const meta = fp.meta as FootprintMetadata;
    const file: Blob | undefined = fp.file;
    if (!file) return { meta, data: undefined };
    try {
      const ab = await file.arrayBuffer();
      return { meta, data: ab };
    } catch (e) {
      return { meta, data: undefined };
    }
  }
}
