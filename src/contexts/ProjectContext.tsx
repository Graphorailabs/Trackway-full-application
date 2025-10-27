import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ProjectID, ProjectRecord, ProjectFileMap } from "@/types/project";
import type { StorageEstimate } from "@/storage/MediaStorage";
import { projectStorage } from "@/services/ProjectStorageService";
import {
  ProjectContext,
  type ProjectContextValue,
  type ExportFormat,
} from "./ProjectContextBase";

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null); // NEW

  const currentProjectRef = useRef<ProjectRecord | null>(null);
  const refreshTokenRef = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => { currentProjectRef.current = currentProject; }, [currentProject]);

  const safeSet = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>) => {
    return (v: React.SetStateAction<T>) => { if (mounted.current) setter(v); };
  }, []);
  const _setProjects = useMemo(() => safeSet(setProjects), [safeSet]);
  const _setCurrent = useMemo(() => safeSet(setCurrentProject), [safeSet]);
  const _setLoading = useMemo(() => safeSet(setIsLoading), [safeSet]);
  const _setExporting = useMemo(() => safeSet(setIsExporting), [safeSet]);
  const _setError = useMemo(() => safeSet(setError), [safeSet]);
  const _setStorageEstimate = useMemo(() => safeSet(setStorageEstimate), [safeSet]); // NEW

  const refresh = useCallback(async () => {
    const token = ++refreshTokenRef.current;
    _setLoading(true);
    _setError(null);
    try {
      const list = await projectStorage.list();
      if (!mounted.current || refreshTokenRef.current !== token) return;
      _setProjects(list);
      const activeCurrent = currentProjectRef.current;
      if (activeCurrent) {
        const updated = list.find((p) => p.id === activeCurrent.id) ?? null;
        _setCurrent(updated);
      }
    } catch (e: unknown) {
      if (!mounted.current || refreshTokenRef.current !== token) return;
      _setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      if (mounted.current && refreshTokenRef.current === token) {
        _setLoading(false);
      }
    }
  }, [_setCurrent, _setError, _setLoading, _setProjects]);

  useEffect(() => { refresh(); }, [refresh]);

  // Persist current project id across reloads
  useEffect(() => {
    if (currentProject?.id) localStorage.setItem("currentProjectId", currentProject.id);
    else localStorage.removeItem("currentProjectId");
  }, [currentProject?.id]);

  useEffect(() => {
    const id = localStorage.getItem("currentProjectId");
    if (id) {
      projectStorage.get(id as ProjectID)
        .then((p) => { if (p && mounted.current) _setCurrent(p); })
        .catch(() => localStorage.removeItem("currentProjectId"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NEW: expose as action; also call once on mount to warm the value
  const getStorageEstimate = useCallback(async (): Promise<StorageEstimate> => {
    try {
      const est = await projectStorage.getStorageEstimate();
      _setStorageEstimate(est);
      return est;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to estimate storage";
      _setError(msg);
      // Return a minimal, safe object so callers can proceed
      const fallback: StorageEstimate = {
        usageBytes: 0,
        quotaBytes: null,
        freeBytes: null,
        backend: "indexeddb",
      };
      _setStorageEstimate(fallback);
      return fallback;
    }
  }, [_setError, _setStorageEstimate]);

  useEffect(() => { void getStorageEstimate(); }, [getStorageEstimate]); // warm up

  const createProject = useCallback(async (name: string) => {
    _setError(null);
    const created = await projectStorage.create(name);
    _setProjects((prev) => [created, ...prev]);
    _setCurrent(created);
    // refresh estimate after writes
    void getStorageEstimate();
    return created;
  }, [_setCurrent, _setProjects, _setError, getStorageEstimate]);

  const loadProject = useCallback(async (id: ProjectID) => {
    _setError(null);
    const p = await projectStorage.get(id);
    _setCurrent(p);
    return p;
  }, [_setCurrent, _setError]);

  const deleteProject = useCallback(async (id: ProjectID) => {
    _setError(null);
    await projectStorage.delete(id);
    _setProjects((prev) => prev.filter((p) => p.id !== id));
    if (currentProject?.id === id) _setCurrent(null);
    // refresh estimate after writes
    void getStorageEstimate();
  }, [currentProject?.id, _setCurrent, _setProjects, _setError, getStorageEstimate]);

  const updateCurrentProjectFiles = useCallback(async (files: ProjectFileMap) => {
    if (!currentProject) throw new Error("No project loaded");
    const updated = await projectStorage.updateFiles(currentProject.id, files);
    _setCurrent(updated);
    _setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    // refresh estimate after writes
    void getStorageEstimate();
    return updated;
  }, [currentProject, _setCurrent, _setProjects, getStorageEstimate]);

  const renameCurrentProject = useCallback(async (name: string) => {
    if (!currentProject) throw new Error("No project loaded");
    const rec = await projectStorage.rename(currentProject.id, name);
    _setCurrent(rec);
    _setProjects((prev) => prev.map((p) => (p.id === rec.id ? rec : p)));
    return rec;
  }, [currentProject, _setCurrent, _setProjects]);

  const exportProject = useCallback(
    async (id: ProjectID, format: ExportFormat = "zip", download = true) => {
      _setExporting(true);
      _setError(null);
      try {
        const blob =
          format === "zip"
            ? await projectStorage.exportZip(id)
            : await projectStorage.exportJSON(id);

        if (download && typeof window !== "undefined" && typeof document !== "undefined") {
          const proj =
            currentProject?.id === id
              ? currentProject
              : (projects.find((p) => p.id === id) ?? null);

          const baseName = (proj?.name ?? "project").trim() || "project";
          const safeName = baseName.replace(/[\\/:*?"<>|]+/g, "_");
          const fileName = `${safeName}.${format === "zip" ? "zip" : "json"}`;

          // IE/old Edge
          if (typeof navigator !== "undefined" && "msSaveOrOpenBlob" in navigator) {
            (navigator as typeof navigator & {
              msSaveOrOpenBlob?: (blob: Blob, defaultName?: string) => void;
            }).msSaveOrOpenBlob?.(blob, fileName);
          } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.setTimeout(() => URL.revokeObjectURL(url), 0);
          }
        }
        return blob;
      } catch (e: unknown) {
        _setError(e instanceof Error ? e.message : "Export failed");
        throw e;
      } finally {
        _setExporting(false);
      }
    },
    [currentProject, projects, _setError, _setExporting]
  );

  const importProject = useCallback(
    async (file: File, nameOverride?: string) => {
      _setError(null);
      try {
        const rec = await projectStorage.importFromFile(file, nameOverride);
        _setProjects((prev) => [rec, ...prev]);
        _setCurrent(rec);
        void getStorageEstimate();
        return rec;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to import project";
        _setError(message);
        throw e;
      }
    },
    [_setProjects, _setCurrent, _setError, getStorageEstimate]
  );

  const closeCurrent = useCallback(() => _setCurrent(null), [_setCurrent]);

  const value: ProjectContextValue = useMemo(() => ({
    projects,
    currentProject,
    isLoading,
    isExporting,
    error,
    storageEstimate,
    refresh,
    createProject,
    loadProject,
    deleteProject,
    updateCurrentProjectFiles,
    renameCurrentProject,
    exportProject,
    closeCurrent,
    getStorageEstimate,
    importProject,
  }), [
    projects,
    currentProject,
    isLoading,
    isExporting,
    error,
    storageEstimate,
    refresh,
    createProject,
    loadProject,
    deleteProject,
    updateCurrentProjectFiles,
    renameCurrentProject,
    exportProject,
    closeCurrent,
    getStorageEstimate,
    importProject,
  ]);

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}
