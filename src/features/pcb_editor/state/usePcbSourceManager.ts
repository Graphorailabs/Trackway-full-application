/**
 * React hook that centralizes PCB project loading, reloading, and persistence.
 *
 * The hook keeps all side-effectful logic (localStorage hydration, WASM parsing,
 * save retries, logging, etc.) in one place so the consuming context can stay
 * laser-focused on exposing document commands to the renderer.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { projectStorage } from "@/services/ProjectStorageService";
import type { ProjectFileMap, ProjectRecord } from "@/types/project";
import {
  createBlankPcb,
  ensureDefaults,
  parsePcbCandidate,
  pickProjectPcbFile,
} from "@/features/pcb_editor/state/pcbDocumentUtils";
import {
  pcbValueToJson,
  pcbValueToSexpr,
  type Pcb,
} from "trackway-parser-wasm";

/**
 * Metadata describing the on-disk source file currently backing the PCB editor.
 */
export type PcbSource = {
  projectId: string;
  filePath: string;
  format: "sexpr" | "json";
};

type UsePcbSourceManagerArgs = {
  currentProject: ProjectRecord | null;
  isProjectLoading: boolean;
  selectionHydrated: boolean;
  loadProject: (id: string) => Promise<ProjectRecord | null>;
  updateCurrentProjectFiles: (files: ProjectFileMap) => Promise<ProjectRecord>;
  applyLoadedPcb: (pcb: Pcb) => void;
  getSnapshot: () => Pcb;
};

/**
 * The hook's return signature combines loading state, errors, and persistence helpers.
 */
export type UsePcbSourceManagerResult = {
  source: PcbSource | null;
  isLoading: boolean;
  loadError: string | null;
  reloadFromProject: () => void;
  isSaving: boolean;
  saveError: string | null;
  lastSavedAt: number | null;
  savePcb: () => Promise<{ filePath: string }>;
};

type LastPersisted = {
  projectId: string;
  path: string;
  content: string;
  pcb: Pcb;
};

type RestoreAttempt = {
  id: string | null;
  inFlight: boolean;
};

/**
 * Watches the active project record and orchestrates loading/saving the PCB document.
 */
export function usePcbSourceManager(args: UsePcbSourceManagerArgs): UsePcbSourceManagerResult {
  const {
    currentProject,
    isProjectLoading,
    selectionHydrated,
    loadProject,
    updateCurrentProjectFiles,
    applyLoadedPcb,
    getSnapshot,
  } = args;

  const [source, setSource] = useState<PcbSource | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const lastPersistedRef = useRef<LastPersisted | null>(null);
  const restoreAttemptRef = useRef<RestoreAttempt>({ id: null, inFlight: false });
  const lastLoadSignatureRef = useRef<string | null>(null);
  const lastLoggedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (isProjectLoading) return;

    if (!currentProject) {
      lastLoggedSignatureRef.current = null;
      return;
    }

    const signature = `${currentProject.id}:${reloadToken}`;
    if (lastLoggedSignatureRef.current === signature) return;

    lastLoggedSignatureRef.current = signature;
    console.log("[PCBEditor] Current project ready", {
      id: currentProject.id,
      name: currentProject.name,
      fileCount: Object.keys(currentProject.files ?? {}).length,
      reloadToken,
    });
  }, [currentProject, reloadToken, isProjectLoading]);

  useEffect(() => {
    if (!selectionHydrated) {
      setIsLoading(true);
      return () => {};
    }

    if (isProjectLoading) {
      setIsLoading(true);
      return () => {};
    }

    if (!currentProject) {
      setIsLoading(true);
      let aborted = false;

      void (async () => {
        const persistedId = await projectStorage.getActiveProjectId();
        if (!persistedId || aborted) return;

        const alreadyAttempted =
          restoreAttemptRef.current.id === persistedId && restoreAttemptRef.current.inFlight;
        if (alreadyAttempted) return;

        restoreAttemptRef.current = { id: persistedId, inFlight: true };
        console.log("[PCBEditor] Forcing project load", { persistedId });
        try {
          await loadProject(persistedId);
        } catch (err) {
          if (!aborted) {
            console.error("[PCBEditor] Failed to force project load", err);
          }
        } finally {
          if (!aborted) {
            restoreAttemptRef.current = { id: persistedId, inFlight: false };
          }
        }
      })();

      return () => {
        aborted = true;
      };
    }

    let cancelled = false;
    const candidate = pickProjectPcbFile(currentProject);

    const loadSignature = candidate
      ? `${currentProject.id}:${candidate.path}:${reloadToken}`
      : `${currentProject.id}:none:${reloadToken}`;
    const isStrictReplay =
      process.env.NODE_ENV !== "production" && lastLoadSignatureRef.current === loadSignature;
    if (isStrictReplay) {
      return () => {};
    }
    lastLoadSignatureRef.current = loadSignature;

    console.log("[PCBEditor] Reload requested", {
      hasProject: Boolean(currentProject),
      projectId: currentProject?.id ?? null,
      projectName: currentProject?.name ?? null,
      reloadToken,
    });

    if (!currentProject) {
      setSource(null);
      setLoadError(null);
      setIsLoading(true);
      return () => {
        cancelled = true;
      };
    }

    if (!candidate) {
      setSource(null);
      setLoadError("No PCB file found in selected project.");
      const blank = createBlankPcb();
      console.log("[PCBEditor] Applied blank PCB page", blank.page);
      applyLoadedPcb(blank);
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const pendingPersist = lastPersistedRef.current;
    if (process.env.NODE_ENV !== "production") {
      console.log("[PCBEditor] Loading PCB candidate", {
        projectId: currentProject.id,
        path: candidate.path,
        format: candidate.format,
        contentPreview: candidate.content.slice(0, 500),
      });
    }

    if (
      pendingPersist &&
      pendingPersist.projectId === currentProject.id &&
      pendingPersist.path === candidate.path &&
      pendingPersist.content === candidate.content
    ) {
      setSource({ projectId: currentProject.id, filePath: candidate.path, format: candidate.format });
      console.log("[PCBEditor] Applied pendingPersist PCB page", pendingPersist.pcb.page);
      applyLoadedPcb(pendingPersist.pcb);
      setLoadError(null);
      setIsLoading(false);
      lastPersistedRef.current = null;
      return () => {
        cancelled = true;
      };
    }
    lastPersistedRef.current = null;

    setIsLoading(true);
    setLoadError(null);

    try {
      const parsed = parsePcbCandidate(candidate);
      if (process.env.NODE_ENV !== "production") {
        console.log("[PCBEditor] Parsed PCB page", parsed.page);
      }
      if (!cancelled) {
        const ensured = ensureDefaults(parsed);
        if (process.env.NODE_ENV !== "production") {
          console.log("[PCBEditor] Ensured PCB page", ensured.page);
        }
        applyLoadedPcb(ensured);
        console.log("[PCBEditor] Applied parsed PCB page", ensured.page);
        setSource({ projectId: currentProject.id, filePath: candidate.path, format: candidate.format });
        setIsLoading(false);
      }
    } catch (err) {
      if (!cancelled) {
        const message = err instanceof Error ? err.message : "Failed to parse PCB file.";
        setLoadError(message);
        setSource(null);
        console.error("[PCBEditor] PCB load failed", err);
        const blank = createBlankPcb();
        console.log("[PCBEditor] Applied blank PCB page after parse failure", blank.page);
        applyLoadedPcb(blank);
        setIsLoading(false);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [
    currentProject,
    reloadToken,
    isProjectLoading,
    selectionHydrated,
    loadProject,
    applyLoadedPcb,
  ]);

  /**
   * Forces the hook to re-fetch the PCB file, even if the project has the same id.
   */
  const reloadFromProject = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  /**
   * Persists the latest PCB snapshot back into the active project storage.
   */
  const savePcb = useCallback(async () => {
    if (!currentProject) {
      throw new Error("No project is currently loaded.");
    }

    setIsSaving(true);
    setSaveError(null);

    const filePath = source?.filePath ?? deriveDefaultPcbPath(currentProject.name);
    const snapshot = getSnapshot();
    const targetFormat = determineSaveFormat(filePath, source?.format);
    const serialized = targetFormat === "json"
      ? pcbValueToJson(snapshot, true)
      : pcbValueToSexpr(snapshot, true);

    try {
      if (process.env.NODE_ENV !== "production") {
        console.log("[PCBEditor] Saving PCB payload", {
          projectId: currentProject.id,
          filePath,
          format: targetFormat,
          serialized,
        });
      }

      const updatedFiles: ProjectFileMap = { ...(currentProject.files ?? {}) };
      updatedFiles[filePath] = serialized;
      const updatedProject = await updateCurrentProjectFiles(updatedFiles);
      const persistedContent = updatedProject.files?.[filePath];
      if (typeof persistedContent !== "string") {
        throw new Error("Saved project is missing the PCB file.");
      }
      if (persistedContent !== serialized) {
        throw new Error("Saved PCB content mismatch. Please try again.");
      }
      lastPersistedRef.current = {
        projectId: updatedProject.id,
        path: filePath,
        content: persistedContent,
        pcb: snapshot,
      };
      setSource({ projectId: currentProject.id, filePath, format: targetFormat });
      console.log("[PCBEditor] Applied snapshot PCB page", snapshot.page);
      applyLoadedPcb(snapshot);
      setLastSavedAt(Date.now());
      return { filePath };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save PCB";
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [currentProject, source, updateCurrentProjectFiles, getSnapshot, applyLoadedPcb]);

  return {
    source,
    isLoading,
    loadError,
    reloadFromProject,
    isSaving,
    saveError,
    lastSavedAt,
    savePcb,
  };
}

/**
 * Generates a deterministic KiCad file path when a project has no PCB yet.
 */
function deriveDefaultPcbPath(projectName?: string | null): string {
  const base = projectName?.trim() || "pcb-layout";
  const dashed = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const safe = dashed || "pcb-layout";
  return `${safe}.kicad_pcb`;
}

/**
 * Resolves the serialization format based on filename or prior source format.
 */
function determineSaveFormat(path: string, hint?: "sexpr" | "json"): "sexpr" | "json" {
  if (hint === "sexpr" || hint === "json") {
    return hint;
  }
  const lower = path.toLowerCase();
  if (lower.endsWith(".json")) {
    return "json";
  }
  return "sexpr";
}
