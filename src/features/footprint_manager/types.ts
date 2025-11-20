export type FootprintMetadata = {
  id: string;
  name: string;
  category: string;
  description?: string;
  thumbnailUrl?: string;
  source?: "cloud" | "local";
  tags?: string[];
};

export type FootprintPackage = {
  meta: FootprintMetadata;
  // raw data or an URL to the package contents
  data?: ArrayBuffer | string;
};

// High level facade used by the UI to list/search/install footprints.
export interface FootprintManager {
  listCategories(): Promise<string[]>;
  listByCategory(category: string): Promise<FootprintMetadata[]>;
  getPackage(id: string): Promise<FootprintPackage | null>;
}

// Local installation helper API
export interface LocalPackageManager {
  listInstalled(): Promise<FootprintMetadata[]>;
  installFromZip(buffer: ArrayBuffer, category: string): Promise<FootprintMetadata>;
  uninstall(id: string): Promise<void>;
}

// Combined runtime object used by the context/provider
export type FootprintManagers = {
  cloud: FootprintManager;
  local: LocalPackageManager;
};
