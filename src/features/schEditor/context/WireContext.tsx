import { createContext, useContext, useState, useCallback, useRef, useEffect, type PropsWithChildren } from "react";
import { DISABLE_AUTOSAVE } from "../constants";
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
  const endpointWorkerRef = useRef<Worker | null>(null);
  const wiresMirrorRef = useRef<any[]>([]);

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

  const ensureEndpointWorker = () => {
    if (endpointWorkerRef.current) return endpointWorkerRef.current;
    try {
      endpointWorkerRef.current = new Worker(new URL('../components/wiring/WireEndpointUpdater.worker.ts', import.meta.url), { type: 'module' });
      endpointWorkerRef.current.onmessage = (ev: MessageEvent) => {
        const msg = ev.data || {};
        try { console.info('[WireContext] endpointWorker.onmessage', msg && (msg.type || 'no-type'), { updatedCount: Array.isArray(msg.updated) ? msg.updated.length : 0, debugCount: Array.isArray(msg.debug) ? msg.debug.length : 0 }); } catch (err) {}
        if (msg.type === 'updated' && Array.isArray(msg.updated)) {
          // dispatch wire-committed for each updated wire so canvases can merge
          for (const w of msg.updated) {
            try { window.dispatchEvent(new CustomEvent('wire-committed', { detail: { wire: w } })); } catch (e) {}
            try { console.info('[WireContext] dispatched wire-committed from worker', { wireId: w?.id ?? w?.uuid }); } catch (err) {}
          }
          // print worker debug info when present
          try { if (Array.isArray(msg.debug) && msg.debug.length > 0) console.info('[WireContext] endpointWorker.debug', msg.debug.slice(0,50)); } catch (err) {}
        }
      };
    } catch (err) {
      console.warn('Endpoint worker failed to start', err);
      endpointWorkerRef.current = null;
    }
    return endpointWorkerRef.current;
  };

  const prepareWorker = () => {
    const w = ensureWorker();
    try { w?.postMessage({ type: 'prepare' }); } catch (e) {}
  };

  const postWorkerMessage = (msg: any) => {
    const w = ensureWorker();
    try { w?.postMessage(msg); } catch (e) {}
  };

  const postEndpointUpdate = (payload: { wires: any[]; movedPins: any[] }) => {
    const w = ensureEndpointWorker();
    try { w?.postMessage({ type: 'updateEndpoints', wires: payload.wires, movedPins: payload.movedPins }); } catch (e) {}
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

  // Mirror canonical wires by listening to wire lifecycle events so the
  // endpoint-updater worker can compute updates without depending on the
  // heavier Kicad provider.
  useEffect(() => {
    const onSetWires = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail || {};
      const list = Array.isArray(detail) ? detail : (detail.wires || detail.list || null);
      if (Array.isArray(list)) {
        try { console.info('[WireContext] onSetWires', { incomingCount: list.length, sample: list.slice(0,3) }); } catch (e) {}
        wiresMirrorRef.current = list.map((w:any)=>({ ...(w||{}) }));
      }
    };
    const onWireCommit = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail || {};
      const wire = detail?.wire;
      if (!wire) return;
      // replace or append
      const arr = wiresMirrorRef.current.slice();
      const idx = arr.findIndex((x:any)=> (x.id===wire.id || x.uuid===wire.id || x.id===wire.uuid || x.uuid===wire.uuid));
      if (idx>=0) arr[idx] = wire; else arr.push(wire);
      wiresMirrorRef.current = arr;
    };
    const onWireRemoved = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail || {};
      const wid = detail?.wireId;
      if (!wid) return;
      wiresMirrorRef.current = wiresMirrorRef.current.filter((w:any)=> (w.id ?? w.uuid) !== wid);
    };

    window.addEventListener('set-wires', onSetWires as EventListener);
    window.addEventListener('wire-committed', onWireCommit as EventListener);
    window.addEventListener('wire-added', onWireCommit as EventListener);
    window.addEventListener('wire-removed', onWireRemoved as EventListener);

    // When placed symbols move, send mirror wires + moved pins to worker.
    const onPlacedMoved = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail || {};
      const movedPins = Array.isArray(detail?.pins) ? detail.pins : [];
      if (!movedPins.length) return;
      try { console.info('[WireContext] placed-symbol-moved received', { placedId: detail.placedId, movedPinsCount: movedPins.length, mirrorSize: wiresMirrorRef.current.length }); } catch (err) {}
      try { console.info('[WireContext] wiresMirror snapshot', { sample: wiresMirrorRef.current.slice(0,3), mirrorSize: wiresMirrorRef.current.length }); } catch (err) {}
      // If we don't have any canonical wires mirrored yet, try to bootstrap
      // from localStorage autosave before requesting the heavy provider.
      if (!wiresMirrorRef.current || wiresMirrorRef.current.length === 0) {
        try {
          if (!DISABLE_AUTOSAVE) {
            // attempt localStorage fallback (same key used by KicadSchProvider)
            const raw = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem('trackway.editor.autosave') : null;
            if (raw) {
              try {
                const parsed = JSON.parse(raw || '{}');
                const found = Array.isArray(parsed?.wires) ? parsed.wires : (Array.isArray(parsed) ? parsed : null);
                if (Array.isArray(found) && found.length > 0) {
                  try { console.info('[WireContext] populated wires mirror from localStorage autosave', { count: found.length }); } catch (e) {}
                  try { window.dispatchEvent(new CustomEvent('set-wires', { detail: found })); } catch (e) {}
                }
              } catch (e) { /* ignore parse errors */ }
            }
          } else {
            try { console.debug('[WireContext] skipped localStorage fallback due to DISABLE_AUTOSAVE'); } catch (e) {}
          }
        } catch (e) {}

        // If still empty after localStorage attempt (or skipped), request canonical provider
        if (!wiresMirrorRef.current || wiresMirrorRef.current.length === 0) {
          try {
            console.info('[WireContext] wires mirror empty — requesting canonical wires');
            window.dispatchEvent(new CustomEvent('request-wires'));
          } catch (e) {}
          return;
        }
      }

      // send current mirror to worker (fast clone)
      try { 
        try { console.info('[WireContext] posting endpoint update', { wiresCount: wiresMirrorRef.current.length, wireSample: wiresMirrorRef.current.slice(0,2), movedPinsCount: movedPins.length, movedPinsSample: movedPins.slice(0,3) }); } catch (e) {}
        postEndpointUpdate({ wires: wiresMirrorRef.current.slice(), movedPins }); 
      } catch (e) { try { console.warn('[WireContext] postEndpointUpdate failed', e); } catch {} }
    };
    window.addEventListener('placed-symbol-moved', onPlacedMoved as EventListener);

    // On mount ask for wires once so mirror gets populated in cases where
    // the canonical provider is already available but hasn't emitted yet.
    try {
      if (!wiresMirrorRef.current || wiresMirrorRef.current.length === 0) {
        console.info('[WireContext] requesting canonical wires on mount');
        window.dispatchEvent(new CustomEvent('request-wires'));
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('set-wires', onSetWires as EventListener);
      window.removeEventListener('wire-committed', onWireCommit as EventListener);
      window.removeEventListener('wire-added', onWireCommit as EventListener);
      window.removeEventListener('wire-removed', onWireRemoved as EventListener);
      window.removeEventListener('placed-symbol-moved', onPlacedMoved as EventListener);
      try { endpointWorkerRef.current?.terminate(); endpointWorkerRef.current = null; } catch (e) {}
    };
  }, []);

  return (
    <RoutingContext.Provider value={{ previewTracks, setPreviewTracks, previewIncompatibleWithPad, setPreviewIncompatibleWithPad, isDrawing, startDrawing, stopDrawing, selectedWireId, setSelectedWireId, removeWire, prepareWorker, postWorkerMessage }}>
      {children}
    </RoutingContext.Provider>
  );
}