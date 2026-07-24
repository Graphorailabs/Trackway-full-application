import type { Footprint3DModelMetadata, Footprint3DModelPackage } from "../types";
import { BASE_BACKEND_URL, MODEL3D_ENDPOINT } from "../constants";

// Cloud-only 3D model provider. This class is fetch-only and does not
// perform any local storage or installation. It provides two helper
// methods: `getModel(id)` and `findByFootprintName(name)` which attempt to
// retrieve model metadata and binary content from the backend.
export class Cloud3DModelManager {
  private baseUrl: string;
  private modelsBase: string;

  constructor(baseUrl: string = BASE_BACKEND_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    // Compute API root (strip trailing `/footprints` if present) so 3D model
    // endpoints are addressed at `<apiRoot>/3dmodels/...` rather than under
    // `/footprints/3dmodels/...`.
    const apiRoot = this.baseUrl.replace(/\/footprints\/?$/i, "");
    this.modelsBase = `${apiRoot}${MODEL3D_ENDPOINT}`.replace(/\/$/, "");
  }

  private async fetchJson(path: string) {
    const url = path.startsWith("http") ? path : `${this.modelsBase}${path.startsWith("/") ? path : "/" + path}`;
    const res = await fetch(url);
    if (!res.ok) {
      try { console.warn("Cloud3DModelManager.fetchJson non-OK response", { url, status: res.status, statusText: res.statusText }); } catch {}
      throw new Error(`Request failed: ${res.status}`);
    }
    return res.json();
  }

  private async fetchBinary(path: string): Promise<ArrayBuffer | null> {
    const url = path.startsWith("http") ? path : `${this.modelsBase}${path.startsWith("/") ? path : "/" + path}`;
    const res = await fetch(url);
    if (!res.ok) {
      try { console.warn("Cloud3DModelManager.fetchBinary non-OK response", { url, status: res.status, statusText: res.statusText }); } catch {}
      return null;
    }
    try {
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        const body = await res.json();
        const txt = typeof body?.content === "string" ? body.content : undefined;
        if (typeof txt === "string") return new TextEncoder().encode(txt).buffer;
        return null;
      }
      return await res.arrayBuffer();
    } catch (e) {
      console.warn("Cloud3DModelManager.fetchBinary failed", e);
      return null;
    }
  }

  // Fetch a model by its server id. Returns null when not found.
  async getModel(id: string): Promise<Footprint3DModelPackage | null> {
    try {
      // Try JSON metadata endpoint first
      const json = await this.fetchJson(`/${encodeURIComponent(id)}`);
      const meta: Footprint3DModelMetadata = {
        id: json.id ?? id,
        name: json.name ?? json.filename ?? "",
        category: json?.category?.slug || json?.category || "",
        footprintName: json.footprintName ?? json.name ?? undefined,
        format: json.format ?? undefined,
        description: json.description ?? undefined,
        source: "cloud",
      };

      // Attempt to fetch binary content. Backend may expose `content` on the
      // JSON response or provide a raw binary endpoint at `/3dmodel/:id/content`.
      if (typeof json.content === "string") {
        const buf = new TextEncoder().encode(json.content).buffer;
        return { meta, data: buf };
      }

      const bin = await this.fetchBinary(`/${encodeURIComponent(id)}/content`);
      return { meta, data: bin ?? undefined };
    } catch (e) {
      try { console.warn("Cloud3DModelManager.getModel failed", { id, error: e }); } catch {}
      return null;
    }
  }

  // Fetch a model by footprint name. The implementation tries a few
  // reasonable endpoints: `/3dmodel/search?name=...` and
  // `/3dmodel/by-name/:name`. Returns the first match or null.
  async findByFootprintName(footprintName: string): Promise<Footprint3DModelPackage | null> {
    try {
      const name = encodeURIComponent(footprintName.trim());
      const byNamePath = `/by-name/${name}`;

      // Try binary fetch first (some backends return the model file directly)
      try { console.info("Cloud3DModelManager.findByFootprintName -> trying binary fetch", byNamePath); } catch {}
      const binary = await this.fetchBinary(byNamePath);
      if (binary instanceof ArrayBuffer) {
        // Detect GLB via header 'glTF'
        let format: string | undefined = undefined;
        try {
          if (binary.byteLength >= 4) {
            const header = new Uint8Array(binary.slice(0, 4));
            const headerStr = String.fromCharCode(...Array.from(header));
            if (headerStr === "glTF") format = "glb";
          }
        } catch {}

        const meta: Footprint3DModelMetadata = {
          id: footprintName,
          name: footprintName,
          category: "",
          footprintName: footprintName,
          format: format,
          source: "cloud",
        };
        try { console.info("Cloud3DModelManager.findByFootprintName -> binary returned", { footprintName, format }); } catch {}
        return { meta, data: binary };
      }

      // Fallback to JSON lookup which may return an item with an id
      try { console.info("Cloud3DModelManager.findByFootprintName -> falling back to JSON lookup", byNamePath); } catch {}
      let body: any = null;
      try {
        body = await this.fetchJson(byNamePath);
      } catch (err) {
        try { console.warn("Cloud3DModelManager.findByFootprintName fetch failed", { name: footprintName, error: err }); } catch {}
        body = null;
      }

      if (!body) return null;

      const item = Array.isArray(body) ? body[0] : body?.data ?? body;
      if (!item) return null;

      const id = item.id ?? item._id ?? item.name ?? null;
      if (!id) {
        try { console.warn("Cloud3DModelManager.findByFootprintName: item missing id", { item }); } catch {}
        return null;
      }

      return this.getModel(String(id));
    } catch (e) {
      try { console.warn("Cloud3DModelManager.findByFootprintName failed", e); } catch {}
      return null;
    }
  }
}
