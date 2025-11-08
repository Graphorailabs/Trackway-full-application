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

export interface Point {
  x: number;
  y: number;
}

export interface WireSegment {
  id: string;
  points: Point[];
  startComponent?: string;
  startPin?: string;
  endComponent?: string;
  endPin?: string;
  isTemp: boolean;
}

export interface Component {
  id: string;
  name: string;
  position: Point;
  rotation: number;
  pins: ComponentPin[];
}

export interface ComponentPin {
  id: string;
  name: string;
  position: Point;
  type: 'input' | 'output' | 'bidirectional' | 'power';
}
