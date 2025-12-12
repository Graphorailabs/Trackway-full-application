import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { useFootprintManagers } from "../FootprintManagerContext";
import { useSearch } from "./useSearch";
import type { Footprint3DModelMetadata, FootprintMetadata } from "../types";

export function useFootprintManager(open: boolean) {
  const { cloud, local, models } = useFootprintManagers();
  const { search, setSearch, debouncedSearch, tokenMatch } = useSearch("");

  const [categories, setCategories] = useState<string[]>([]);
  const [expandedCloud, setExpandedCloud] = useState<Record<string, boolean>>({});
  const [cloudItems, setCloudItems] = useState<Record<string, FootprintMetadata[]>>({});
  const [installed, setInstalled] = useState<FootprintMetadata[]>([]);
  const [installedModels, setInstalledModels] = useState<Footprint3DModelMetadata[]>([]);
  const [viewMode, setViewMode] = useState<"cloud" | "installed">("cloud");
  const [expandedLocal, setExpandedLocal] = useState<Record<string, boolean>>({});
  const [expandedModelLocal, setExpandedModelLocal] = useState<Record<string, boolean>>({});
  const [selected, setSelectedFootprintState] = useState<FootprintMetadata | null>(null);
  const [selectedModel, setSelectedModelState] = useState<Footprint3DModelMetadata | null>(null);
  const [loadingCategories, setLoadingCategories] = useState<Record<string, boolean>>({});
  const hasModelManager = !!models;

  const selectFootprint = (meta: FootprintMetadata | null) => {
    setSelectedFootprintState(meta);
    if (meta) setSelectedModelState(null);
  };

  const selectModel = (meta: Footprint3DModelMetadata | null) => {
    setSelectedModelState(meta);
    if (meta) setSelectedFootprintState(null);
  };

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const cats = await cloud.listCategories();
        setCategories(cats);
      } catch (e) {
        console.warn("failed to load cloud categories", e);
      }
      try {
        const localInstalled = await local.listInstalled();
        setInstalled(localInstalled);
      } catch (e) {
        console.warn("failed to load installed footprints", e);
      }
      if (models) {
        try {
          const modelInstalled = await models.listInstalled();
          setInstalledModels(modelInstalled);
        } catch (e) {
          console.warn("failed to load installed 3D models", e);
        }
      }
    })();
  }, [open, cloud, local, models]);

  // prefetch cloud categories when searching so we can match inside packages
  useEffect(() => {
    if (!open) return;
    if (viewMode !== "cloud") return;
    if (!debouncedSearch) return;
    (async () => {
      const missing = categories.filter((c) => !cloudItems[c] && !loadingCategories[c]);
      await Promise.all(
        missing.map(async (c) => {
          try {
            setLoadingCategories((p) => ({ ...p, [c]: true }));
            const items = await cloud.listByCategory(c);
            setCloudItems((prev) => ({ ...prev, [c]: items }));
          } catch (e) {
            // ignore
          } finally {
            setLoadingCategories((p) => ({ ...p, [c]: false }));
          }
        })
      );
    })();
  }, [debouncedSearch, viewMode, open, categories, cloud, cloudItems, loadingCategories]);

  const toggleCloudCategory = async (cat: string) => {
    setExpandedCloud((prev) => ({ ...prev, [cat]: !prev[cat] }));
    if (!cloudItems[cat]) {
      try {
        setLoadingCategories((p) => ({ ...p, [cat]: true }));
        const items = await cloud.listByCategory(cat);
        setCloudItems((prev) => ({ ...prev, [cat]: items }));
      } catch (e) {
        console.warn("failed to load category items", cat, e);
      } finally {
        setLoadingCategories((p) => ({ ...p, [cat]: false }));
      }
    }
  };

  const handleInstallCategory = async (cat: string) => {
    try {
      if (!cloudItems[cat]) {
        const items = await cloud.listByCategory(cat);
        setCloudItems((prev) => ({ ...prev, [cat]: items }));
      }
      const items = cloudItems[cat] ?? (await cloud.listByCategory(cat));
      for (const it of items) {
        try {
          const pkg = await cloud.getPackage(it.id);
          if (!pkg) continue;
          let buf: ArrayBuffer | null = null;
          if (pkg.data instanceof ArrayBuffer) buf = pkg.data;
          else if (typeof pkg.data === "string" && pkg.data.length > 0) {
            const res = await fetch(pkg.data);
            buf = await res.arrayBuffer();
          }
          if (!buf) continue;
          await local.installFromZip(buf, cat || it.category || "local");
        } catch (e) {
          console.warn("failed to install item", it.id, e);
        }
      }
      // refresh installed
      try {
        const localInstalled = await local.listInstalled();
        setInstalled(localInstalled);
      } catch (e) {
        console.warn("failed to refresh installed list", e);
      }
    } catch (e) {
      console.error("Failed to install category", cat, e);
    }
  };

  const handleUninstallCategory = async (cat: string) => {
    try {
      const toRemove = installed.filter((i) => (i.category || "local") === cat);
      for (const it of toRemove) {
        try {
          await local.uninstall(it.id);
        } catch (e) {
          console.warn("failed to uninstall", it.id, e);
        }
      }
      setInstalled((s) => s.filter((i) => (i.category || "local") !== cat));
      if (selected && (selected.category || "local") === cat) selectFootprint(null);
    } catch (e) {
      console.error("Failed to uninstall category", cat, e);
    }
  };

  const handleInstallZip = async (fileBuffer: ArrayBuffer, category?: string) => {
    try {
      await local.installFromZip(fileBuffer, category || "local");
      const localInstalled = await local.listInstalled();
      setInstalled(localInstalled);
    } catch (e) {
      console.warn("failed to install zip", e);
    }
  };

  const handleInstallZipEvent = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const name = f.name;
    const parts = name.split(".pretty");
    const category = parts[0] || "local";
    const buf = await f.arrayBuffer();
    await handleInstallZip(buf, category);
  };

  const handleUninstall = async (id: string) => {
    try {
      await local.uninstall(id);
      setInstalled((s) => s.filter((i) => i.id !== id));
      if (selected?.id === id) selectFootprint(null);
    } catch (e) {
      console.warn("failed to uninstall", id, e);
    }
  };

  const refreshInstalledModels = async () => {
    if (!models) return;
    try {
      const list = await models.listInstalled();
      setInstalledModels(list);
    } catch (e) {
      console.warn("failed to refresh 3D models", e);
    }
  };

  const handleInstallModelZip = async (fileBuffer: ArrayBuffer, category?: string) => {
    if (!models) return;
    try {
      await models.installFromZip(fileBuffer, category || "local");
      await refreshInstalledModels();
    } catch (e) {
      console.warn("failed to install 3D zip", e);
    }
  };

  const handleInstallModelZipEvent = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!models) return;
    const f = e.target.files?.[0];
    if (!f) return;
    const lower = f.name.toLowerCase();
    let derived = "local";
    if (lower.includes(".3dshapes")) {
      derived = f.name.replace(/\.3dshapes.*$/i, "") || "local";
    } else if (lower.endsWith(".zip")) {
      derived = f.name.replace(/\.zip$/i, "") || "local";
    }
    const buf = await f.arrayBuffer();
    await handleInstallModelZip(buf, derived);
    e.target.value = "";
  };

  const handleUninstallModelCategory = async (cat: string) => {
    if (!models) return;
    try {
      const toRemove = installedModels.filter((m) => (m.category || "local") === cat);
      for (const it of toRemove) {
        try {
          await models.uninstall(it.id);
        } catch (e) {
          console.warn("failed to uninstall 3D model", it.id, e);
        }
      }
      setInstalledModels((s) => s.filter((m) => (m.category || "local") !== cat));
      if (selectedModel && (selectedModel.category || "local") === cat) selectModel(null);
    } catch (e) {
      console.error("Failed to uninstall 3D category", cat, e);
    }
  };

  return {
    // search
    search,
    setSearch,
    debouncedSearch,
    tokenMatch,
    // cloud
    categories,
    expandedCloud,
    cloudItems,
    toggleCloudCategory,
    handleInstallCategory,
    loadingCategories,
    // installed
    installed,
    handleUninstallCategory,
    handleUninstall,
    handleInstallZip,
    handleInstallZipEvent,
    // models
    hasModelManager,
    installedModels,
    expandedModelLocal,
    setExpandedModelLocal,
    handleInstallModelZip,
    handleInstallModelZipEvent,
    handleUninstallModelCategory,
    // UI state
    viewMode,
    setViewMode,
    expandedLocal,
    setExpandedLocal,
    selected,
    setSelected: selectFootprint,
    selectedModel,
    setSelectedModel: selectModel,
  } as const;
}
