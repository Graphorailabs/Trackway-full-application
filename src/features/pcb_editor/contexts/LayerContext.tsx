/* eslint-disable react-refresh/only-export-components -- Shared context module exports hooks and helpers */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { PCB_EDITOR_LAYERS, type EditorLayer } from "@/features/pcb_editor/constants";
import type { CanonicalLayer } from "trackway-parser-wasm";

export type LayerId = CanonicalLayer;

type LayerVisibilityMap = Record<LayerId, boolean>;

export type LayerContextValue = {
  layers: EditorLayer[];
  selectedLayerId: LayerId;
  selectLayer: (id: LayerId) => void;
  visibility: LayerVisibilityMap;
  setLayerVisibility: (id: LayerId, visible: boolean) => void;
  toggleLayerVisibility: (id: LayerId) => void;
};

const LayerContext = createContext<LayerContextValue | null>(null);

export function useLayers(): LayerContextValue {
  const ctx = useContext(LayerContext);
  if (!ctx) {
    throw new Error("useLayers must be used within <LayerProvider>");
  }
  return ctx;
}

export function LayerProvider({ children }: PropsWithChildren) {
  const allLayers = PCB_EDITOR_LAYERS;
  const defaultLayerId: LayerId = allLayers[0]?.canonical_name ?? "F.Cu";
  const [selectedLayerId, setSelectedLayerId] = useState<LayerId>(defaultLayerId);
  const [visibility, setVisibility] = useState<LayerVisibilityMap>(() => {
    // Make all layers visible by default.
    return allLayers.reduce<LayerVisibilityMap>((acc, layer) => {
      acc[layer.canonical_name] = true;
      return acc;
    }, {} as LayerVisibilityMap);
  });

  const selectLayer = useCallback((id: LayerId) => {
    setSelectedLayerId(id);
  }, []);

  const setLayerVisibility = useCallback((id: LayerId, visible: boolean) => {
    setVisibility((current) => ({ ...current, [id]: visible }));
  }, []);

  const toggleLayerVisibility = useCallback((id: LayerId) => {
    setVisibility((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  const value = useMemo<LayerContextValue>(
    () => ({
      layers: allLayers,
      selectedLayerId,
      selectLayer,
      visibility,
      setLayerVisibility,
      toggleLayerVisibility,
    }),
    [allLayers, selectedLayerId, visibility, selectLayer, setLayerVisibility, toggleLayerVisibility],
  );

  return <LayerContext.Provider value={value}>{children}</LayerContext.Provider>;
}
