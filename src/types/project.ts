export interface DashboardProjectSummary {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
}

export type ProjectID = string;

export interface ProjectFileMap {
  [path: string]: string; // filename/path -> text content
}

export interface ProjectRecord {
  id: ProjectID;
  name: string;
  files: ProjectFileMap;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
