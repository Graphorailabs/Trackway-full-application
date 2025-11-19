import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/* eslint-disable react-refresh/only-export-components -- context module shares hooks and helpers */
import type { DashboardProjectSummary } from '../../../types/project';

export interface DashboardProjectContextValue {
  projects: DashboardProjectSummary[];
  selectedProjectId?: string;
  selectedProject?: DashboardProjectSummary;
  selectProject: (projectId?: string) => void;
}

const DashboardProjectContext = createContext<DashboardProjectContextValue | undefined>(undefined);

export interface DashboardProjectProviderProps {
  projects: DashboardProjectSummary[];
  children: ReactNode;
  initialSelectedProjectId?: string;
}

export function DashboardProjectProvider({
  projects,
  children,
  initialSelectedProjectId,
}: DashboardProjectProviderProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(() => {
    if (!initialSelectedProjectId) {
      return undefined;
    }

    const exists = projects.some((project) => project.id === initialSelectedProjectId);
    return exists ? initialSelectedProjectId : undefined;
  });

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    const exists = projects.some((project) => project.id === selectedProjectId);
    if (!exists) {
      setSelectedProjectId(undefined);
    }
  }, [projects, selectedProjectId]);

  const selectProject = useCallback((projectId?: string) => {
    if (!projectId) {
      setSelectedProjectId(undefined);
      return;
    }

    const exists = projects.some((project) => project.id === projectId);
    setSelectedProjectId(exists ? projectId : undefined);
  }, [projects]);

  const value = useMemo<DashboardProjectContextValue>(() => {
    const selectedProject = projects.find((project) => project.id === selectedProjectId);

    return {
      projects,
      selectedProjectId,
      selectedProject,
      selectProject,
    };
  }, [projects, selectProject, selectedProjectId]);

  return (
    <DashboardProjectContext.Provider value={value}>{children}</DashboardProjectContext.Provider>
  );
}

export function useDashboardProject(): DashboardProjectContextValue {
  const context = useContext(DashboardProjectContext);
  if (!context) {
    throw new Error('useDashboardProject must be used within a DashboardProjectProvider.');
  }

  return context;
}
