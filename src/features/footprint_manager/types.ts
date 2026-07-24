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

export type Footprint3DModelMetadata = {
  id: string;
  name: string;
  category: string;
  footprintName?: string;
  format?: string;
  description?: string;
  source?: "cloud" | "local";
  tags?: string[];
};

export type Footprint3DModelPackage = {
  meta: Footprint3DModelMetadata;
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

export interface Local3DModelManager {
  listInstalled(): Promise<Footprint3DModelMetadata[]>;
  installFromZip(buffer: ArrayBuffer, category?: string): Promise<Footprint3DModelMetadata[]>;
  uninstall(id: string): Promise<void>;
  getModel(id: string): Promise<Footprint3DModelPackage | null>;
  findByFootprintName(footprintName: string): Promise<Footprint3DModelPackage | null>;
}

// Combined runtime object used by the context/provider
export type FootprintManagers = {
  cloud: FootprintManager;
  local: LocalPackageManager;
  models?: Local3DModelManager;
};
