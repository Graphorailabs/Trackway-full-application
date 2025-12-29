import { createContext, useContext, useState, useCallback, useRef, type PropsWithChildren } from "react";
import type { Pt } from "../components/wiring/manhattanRouter";

interface RoutingContextValue {
  previewTracks: Pt[];
  setPreviewTracks: (tracks: Pt[]) => void;
  previewIncompatibleWithPad: boolean;
  setPreviewIncompatibleWithPad: (v: boolean) => void;
  // fast drawing controls to allow immediate start/stop from UI
  isDrawing: boolean;
  startDrawing: (start?: Pt | null) => void;
  stopDrawing: () => void;
  // selection + deletion support for wires
  selectedWireId?: string | null;
  setSelectedWireId: (id: string | null) => void;
  removeWire: (wireId: string, pinIds?: string[]) => void;
  // worker control: allow UI to prime or post messages to router worker
  prepareWorker: () => void;
  postWorkerMessage: (msg: any) => void;
}

const RoutingContext = createContext<RoutingContextValue | null>(null);

export function useRouting() {
  const ctx = useContext(RoutingContext);
  if (!ctx) throw new Error("useRouting must be used within RoutingProvider");
  return ctx;
}

export function RoutingProvider({ children }: PropsWithChildren) {
  const [previewTracks, setPreviewTracks] = useState<Pt[]>([]);
  const [previewIncompatibleWithPad, setPreviewIncompatibleWithPad] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const lastStartRef = useRef<Pt | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const ensureWorker = () => {
    if (workerRef.current) return workerRef.current;
    try {
      workerRef.current = new Worker(new URL('../components/wiring/WiringWorker.ts', import.meta.url), { type: 'module' });
      workerRef.current.onmessage = (ev: MessageEvent) => {
        const msg = ev.data || {};
        if (msg.type === 'routeResult') {
          const result = msg.result || {};
          if (result.success && Array.isArray(result.path)) {
            setPreviewTracks(result.path);
          } else {
            setPreviewTracks([]);
          }
        }
      };
    } catch (err) {
      console.warn('Routing worker failed to start in RoutingProvider', err);
      workerRef.current = null;
    }
    return workerRef.current;
  };

  const prepareWorker = () => {
    const w = ensureWorker();
    try { w?.postMessage({ type: 'prepare' }); } catch (e) {}
  };

  const postWorkerMessage = (msg: any) => {
    const w = ensureWorker();
    try { w?.postMessage(msg); } catch (e) {}
  };


  const startDrawing = useCallback((start?: Pt | null) => {
    lastStartRef.current = start ?? null;
    setIsDrawing(true);
    if (start) setPreviewTracks([start]);
    else setPreviewTracks([]);
  }, []);

  const stopDrawing = useCallback(() => {
    lastStartRef.current = null;
    setIsDrawing(false);
    setPreviewTracks([]);
  }, []);

  const removeWire = useCallback((wireId: string, pinIds?: string[]) => {
    try {
      window.dispatchEvent(new CustomEvent('wire-removed', { detail: { wireId, pinIds } }));
    } catch (e) {
      // fallback: also dispatch legacy event name
      try { window.dispatchEvent(new CustomEvent('wire-removed', { detail: { wireId, pinIds } })); } catch (err) {}
    }
    // clear selection if deleted
    setSelectedWireId((cur) => (cur === wireId ? null : cur));
  }, []);

  return (
    <RoutingContext.Provider value={{ previewTracks, setPreviewTracks, previewIncompatibleWithPad, setPreviewIncompatibleWithPad, isDrawing, startDrawing, stopDrawing, selectedWireId, setSelectedWireId, removeWire, prepareWorker, postWorkerMessage }}>
      {children}
    </RoutingContext.Provider>
  );
}