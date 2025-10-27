import type { ProjectID, ProjectRecord } from "@/types/project";

export interface CreateProjectInput {
  name: string;
  files?: ProjectRecord["files"];
}

/** Optional feature flags a backend can expose for nicer UX */
export interface MediaStorageCapabilities {
  /** Can the backend provide origin/drive quota info? */
  canEstimate: boolean;
  /** Can the backend request persistence (reduced eviction risk)? */
  canPersist: boolean;
  /** Accepts ZIP file import via this backend (vs requiring service-layer unzip)? */
  supportsZipImport: boolean;
  /** Accepts JSON import (serialized ProjectRecord) via this backend? */
  supportsJsonImport: boolean;
  /** Identifier like "indexeddb" | "opfs" | "pickedDir" | "cloud" | "fs" */
  backend: string;
}

/**
 * Generic, backend-agnostic storage estimate.
 * - quotaBytes may be null if unknown/unbounded.
 */
export interface StorageEstimate {
  usageBytes: number;
  quotaBytes: number | null;
  freeBytes: number | null;
  persisted?: boolean;
  backend?: string;
  details?: Record<string, unknown>;
}

export interface MediaStorage {
  init(): Promise<void>;

  // --- CRUD ---
  createProject(input: CreateProjectInput): Promise<ProjectRecord>;
  getProject(id: ProjectID): Promise<ProjectRecord | null>;
  listProjects(): Promise<ProjectRecord[]>;
  deleteProject(id: ProjectID): Promise<void>;
  updateProject(project: ProjectRecord): Promise<ProjectRecord>;

  // --- Export ---
  exportProjectAsJSON(id: ProjectID): Promise<Blob>;
  /**
   * Tries to export as ZIP (uses jszip if available).
   * If unavailable or fails, falls back to JSON blob.
   */
  exportProjectAsZip(id: ProjectID): Promise<Blob>;

  // --- Import ---
  /**
   * Import a project from a user-provided file (ZIP or JSON).
   * The implementation may:
   *  - handle ZIP/JSON natively (supportsZipImport/supportsJsonImport = true), or
   *  - throw UnsupportedError so the service layer can do the parsing and call createProject().
   */
  importProjectFromFile(
    file: File | Blob,
    options?: { nameOverride?: string; mimeTypeHint?: string }
  ): Promise<ProjectRecord>;

  // --- Capability & quota ---
  getStorageEstimate(): Promise<StorageEstimate>;
  getCapabilities(): Promise<MediaStorageCapabilities>;

  /**
   * Best-effort request for persistent storage (if supported by the backend).
   * Returns true if persistence is active after the call.
   */
  requestPersistence?(): Promise<boolean>;
}
