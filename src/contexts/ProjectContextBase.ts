import { createContext } from "react";
import type { ProjectID, ProjectRecord, ProjectFileMap } from "@/types/project";
import type { StorageEstimate } from "@/storage/MediaStorage";

export type ExportFormat = "zip" | "json";

export type ProjectContextState = {
  projects: ProjectRecord[];
  currentProject: ProjectRecord | null;
  isLoading: boolean;
  isExporting: boolean;
  error: string | null;
  selectionHydrated: boolean;

  // last computed storage estimate (null until fetched)
  storageEstimate: StorageEstimate | null;
};

export type ProjectContextActions = {
  refresh: () => Promise<void>;

  createProject: (name: string, files?: ProjectFileMap) => Promise<ProjectRecord>;
  loadProject: (id: ProjectID) => Promise<ProjectRecord | null>;
  deleteProject: (id: ProjectID) => Promise<void>;

  updateCurrentProjectFiles: (files: ProjectFileMap) => Promise<ProjectRecord>;
  renameCurrentProject: (name: string) => Promise<ProjectRecord>;

  exportProject: (id: ProjectID, format?: ExportFormat, download?: boolean) => Promise<Blob>;
  closeCurrent: () => void;

  // fetch a fresh estimate from storage backend and cache it in state
  getStorageEstimate: () => Promise<StorageEstimate>;

  // NEW: import a previously exported project (ZIP or JSON)
  importProject: (file: File, nameOverride?: string) => Promise<ProjectRecord>;

  // Import a project from an already-materialized file map (e.g. fetched
  // from an external source like Flow), bypassing File/Blob parsing.
  importRemoteFiles: (name: string, files: ProjectFileMap) => Promise<ProjectRecord>;
};

export type ProjectContextValue = ProjectContextState & ProjectContextActions;

export const ProjectContext = createContext<ProjectContextValue | null>(null);
