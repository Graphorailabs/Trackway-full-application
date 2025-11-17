/* eslint-disable react-refresh/only-export-components -- Context module shares hooks and helpers */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { useProject } from "@/hooks/useProject";
import { projectStorage } from "@/services/ProjectStorageService";
import type { SheetMetadata } from "@/features/pcb_editor/types";
import type { ProjectRecord } from "@/types/project";
import {
  createMinimalPcb,
  pcbJsonToValue,
  pcbSexprToValue,
  pcbValueToJson,
  pcbValueToSexpr,
  type Page,
  type Pcb,
  type Property,
} from "trackway-parser-wasm";

const DEFAULT_PROPERTIES: Property[] = [];

type PcbSource = {
  projectId: string;
  filePath: string;
  format: "sexpr" | "json";
};

export type PcbContextValue = {
  pcb: Pcb;
  page: Page | null;
  sheetMetadata: SheetMetadata;
  source: PcbSource | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  saveError: string | null;
  lastSavedAt: number | null;
  updatePcb: (updater: (current: Pcb) => Pcb) => void;
  reloadFromProject: () => void;
  savePcb: () => Promise<{ filePath: string }>;
};

const PcbContext = createContext<PcbContextValue | null>(null);

export function usePcb() {
  const ctx = useContext(PcbContext);
  if (!ctx) throw new Error("usePcb must be used within <PcbProvider>");
  return ctx;
}

function normalizeProperty(entry?: Property): { key: string; entry: Property } | null {
  if (!entry) return null;
  const [rawKey, rawValue] = entry;
  if (typeof rawKey !== "string") return null;
  const key = rawKey.trim();
  if (!key) return null;
  const value = typeof rawValue === "string" ? rawValue : rawValue == null ? "" : String(rawValue);
  return { key: key.toLowerCase(), entry: [rawKey, value] };
}

function mergeProperties(current: Property[] | undefined, defaults: Property[]): Property[] {
  const map = new Map<string, Property>();
  const addEntry = (candidate?: Property) => {
    const normalized = normalizeProperty(candidate);
    if (!normalized) return;
    map.set(normalized.key, normalized.entry);
  };

  for (const entry of current ?? []) {
    addEntry(entry);
  }
  for (const entry of defaults) {
    const normalized = normalizeProperty(entry);
    if (!normalized || map.has(normalized.key)) continue;
    map.set(normalized.key, normalized.entry);
  }
  return Array.from(map.values());
}

function deriveMetadata(pcb: Pcb): SheetMetadata {
  const map = new Map<string, string>();
  for (const [key, value] of pcb.properties ?? []) {
    map.set(key.toLowerCase(), value);
  }
  const pick = (keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = map.get(key);
      if (value) return value;
    }
    return undefined;
  };

  return {
    title: pick(["title", "project"]),
    subtitle: pick(["subtitle", "sub_title", "section"]),
    company: pick(["company", "org", "organization"]),
    revision: pick(["revision", "rev"]),
    documentId: pick(["document", "documentid", "doc id", "document id"]),
    page: pick(["page", "sheet"]),
    totalPages: pick(["totalpages", "pages", "total pages"]),
    designer: pick(["designer", "drafter"]),
    checker: pick(["checker", "checked by"]),
    date: pick(["date", "created", "updated"]),
  };
}

function ensureDefaults(base: Pcb): Pcb {
  return {
    ...base,
    page: base.page ?? null,
    properties: mergeProperties(base.properties, DEFAULT_PROPERTIES),
  };
}

type PcbFileCandidate = {
  path: string;
  content: string;
  format: "sexpr" | "json";
};

function looksJson(content: string): boolean {
  const trimmed = content.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function rankPath(path: string): number {
  const lower = path.toLowerCase();
  if (lower.endsWith(".kicad_pcb")) return 0;
  if (lower.endsWith(".pcb.json")) return 1;
  if (lower.endsWith(".json")) return 2;
  return 5;
}

function detectFormat(path: string, content: string): "sexpr" | "json" {
  if (/\.json$/i.test(path)) {
    return "json";
  }
  return looksJson(content) ? "json" : "sexpr";
}

function pickProjectPcbFile(project?: ProjectRecord | null): PcbFileCandidate | null {
  if (!project) return null;
  const entries = Object.entries(project.files ?? {});
  if (!entries.length) return null;
  const sorted = [...entries].sort((a, b) => rankPath(a[0]) - rankPath(b[0]));
  const [path, content] = sorted[0];
  return {
    path,
    content,
    format: detectFormat(path, content),
  };
}

function parsePcbCandidate(candidate: PcbFileCandidate): Pcb {
  if (candidate.format === "json") {
    return pcbJsonToValue(candidate.content) as Pcb;
  }
  try {
    return pcbSexprToValue(candidate.content) as Pcb;
  } catch (sexprError) {
    if (looksJson(candidate.content)) {
      return pcbJsonToValue(candidate.content) as Pcb;
    }
    throw sexprError;
  }
}

function createBlankPcb(): Pcb {
  const blank = ensureDefaults(createMinimalPcb() as Pcb);
  return {
    ...blank,
    page: blank.page ?? { size: "A4", portrait: false },
  };
}

export function PcbProvider({ children }: PropsWithChildren) {
  const {
    currentProject,
    updateCurrentProjectFiles,
    isLoading: isProjectLoading,
    selectionHydrated,
    loadProject,
  } = useProject();
  const [pcb, setPcb] = useState<Pcb>(() => createBlankPcb());
  const pcbRef = useRef<Pcb>(pcb);
  const lastLoggedSignatureRef = useRef<string | null>(null);
  const [source, setSource] = useState<PcbSource | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const lastPersistedRef = useRef<{
    projectId: string;
    path: string;
    content: string;
    pcb: Pcb;
  } | null>(null);
  const restoreAttemptRef = useRef<{ id: string | null; inFlight: boolean }>({ id: null, inFlight: false });
  const lastLoadSignatureRef = useRef<string | null>(null);

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

    const loadSignature = candidate ? `${currentProject.id}:${candidate.path}:${reloadToken}` : `${currentProject.id}:none:${reloadToken}`;
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
      setPcb(blank);
      pcbRef.current = blank;
      console.log("[PCBEditor] Applied blank PCB page", blank.page);
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
      setPcb(pendingPersist.pcb);
      pcbRef.current = pendingPersist.pcb;
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
        setPcb(ensured);
        console.log("[PCBEditor] Applied parsed PCB page", ensured.page);
        pcbRef.current = ensured;
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
        setPcb(blank);
        pcbRef.current = blank;
        setIsLoading(false);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [currentProject, reloadToken, isProjectLoading, selectionHydrated, loadProject]);

  const sheetMetadata = useMemo<SheetMetadata>(() => deriveMetadata(pcb), [pcb]);
  const page = pcb.page ?? null;

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[PCBEditor] pcb.page updated", pcb.page ? { ...pcb.page } : null);
    }
  }, [pcb]);

  const updatePcb = useCallback((updater: (current: Pcb) => Pcb) => {
    setPcb((current) => {
      const next = ensureDefaults(updater(current));
      if (process.env.NODE_ENV !== "production") {
        console.log("[PCBEditor] updatePcb next page", next.page);
      }
      pcbRef.current = next;
      return next;
    });
  }, []);

  const reloadFromProject = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const savePcb = useCallback(async () => {
    if (!currentProject) {
      throw new Error("No project is currently loaded.");
    }

    setIsSaving(true);
    setSaveError(null);

    const filePath = source?.filePath ?? deriveDefaultPcbPath(currentProject.name);
    const snapshot = pcbRef.current ?? createBlankPcb();
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

      const updatedFiles = { ...(currentProject.files ?? {}) };
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
      setPcb(snapshot);
      pcbRef.current = snapshot;
      setLastSavedAt(Date.now());
      return { filePath };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save PCB";
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [currentProject, source, updateCurrentProjectFiles]);

  const value = useMemo<PcbContextValue>(
    () => ({
      pcb,
      page,
      sheetMetadata,
      source,
      isLoading,
      isSaving,
      error: loadError,
      saveError,
      lastSavedAt,
      updatePcb,
      reloadFromProject,
      savePcb,
    }),
    [
      pcb,
      page,
      sheetMetadata,
      source,
      isLoading,
      isSaving,
      loadError,
      saveError,
      lastSavedAt,
      updatePcb,
      reloadFromProject,
      savePcb,
    ],
  );

  return <PcbContext.Provider value={value}>{children}</PcbContext.Provider>;
}

function deriveDefaultPcbPath(projectName?: string | null): string {
  const base = projectName?.trim() || "pcb-layout";
  const dashed = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const safe = dashed || "pcb-layout";
  return `${safe}.kicad_pcb`;
}

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
