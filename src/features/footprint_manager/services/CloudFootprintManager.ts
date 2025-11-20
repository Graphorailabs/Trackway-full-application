import type { FootprintManager, FootprintMetadata, FootprintPackage } from "../types";

// Minimal stub implementation that would call your cloud API.
export class CloudFootprintManager implements FootprintManager {
  constructor() {}

  async listCategories(): Promise<string[]> {
    // TODO: replace with real API call
    // No sample categories by default — cloud API will provide these when available.
    return [];
  }

  async listByCategory(_category: string): Promise<FootprintMetadata[]> {
    // TODO: replace with real API call
    // Return empty list until real cloud API is wired up.
    return [];
  }

  async getPackage(id: string): Promise<FootprintPackage | null> {
    // TODO: fetch package data from cloud
    return { meta: { id, name: id, category: "unknown", source: "cloud" }, data: "" };
  }
}
