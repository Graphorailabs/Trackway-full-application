import type { FootprintManager, FootprintMetadata, FootprintPackage } from "../types";
import { BASE_BACKEND_URL, CATEGOTIES_ENDPOINT } from "../constants";

// Cloud-backed footprint manager that uses the server's public GET endpoints.
export class CloudFootprintManager implements FootprintManager {
  private baseUrl: string;
  constructor(baseUrl: string = BASE_BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  async listCategories(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}${CATEGOTIES_ENDPOINT}`);
      if (!res.ok) return [];
      const body = await res.json();
      // server returns `{ data: [{ id, name, slug, ... }, ...] }`
      const list = Array.isArray(body?.data) ? body.data : [];
      // return slug strings used by the UI as category keys
      return list.map((c: any) => c.slug || c.name).filter(Boolean);
    } catch (e) {
      console.warn("CloudFootprintManager.listCategories failed", e);
      return [];
    }
  }

  async listByCategory(category: string): Promise<FootprintMetadata[]> {
    try {
      const res = await fetch(`${this.baseUrl}${CATEGOTIES_ENDPOINT}/${encodeURIComponent(category)}`);
      if (!res.ok) return [];
      const body = await res.json();
      const items = Array.isArray(body?.footprints) ? body.footprints : [];
      return items.map((it: any) => ({
        id: it.id,
        name: it.name,
        category: category,
        source: "cloud",
      } as FootprintMetadata));
    } catch (e) {
      console.warn("CloudFootprintManager.listByCategory failed", e);
      return [];
    }
  }

  async getPackage(id: string): Promise<FootprintPackage | null> {
    try {
      const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}/content`);
      if (!res.ok) return null;
      const body = await res.json();
      // backend returns { id, name, category, content }
      const meta: FootprintMetadata = {
        id: body.id,
        name: body.name,
        category: body?.category?.slug || body?.category || "",
        source: "cloud",
      };

      // Backend returns `content` as UTF-8 string. Convert to ArrayBuffer so
      // callers (install/preview flow) can decode or parse directly.
      const txt = typeof body.content === "string" ? body.content : "";
      const ab = txt ? (new TextEncoder().encode(txt)).buffer : null;
      return { meta, data: ab ?? "" };
    } catch (e) {
      console.warn("CloudFootprintManager.getPackage failed", e);
      return null;
    }
  }
}
