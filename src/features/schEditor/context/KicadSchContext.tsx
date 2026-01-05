import { createContext, useContext, useMemo, useEffect, useRef, useState } from "react";
import type { KicadSch } from "trackway-parser-wasm";
import { useSymbol } from "./SymbolContext";
import { useProject } from "@/hooks/useProject";
import { DISABLE_AUTOSAVE } from "../constants";
import type { ErcIssue, PinInstance, LocationInfo } from "trackway-parser-wasm";

/* ========================= TYPES ========================= */

export type Uuid = string;
export type Paper = any;
export type TitleBlock = any;
export type Polyline = any;
export type GraphText = any;
export type LocalLabel = any;
export type GlobalLabel = any;
export type RootPath = any;

export type SchematicSymbol = {
  id: string;
  symbolId?: string;
  position?: { x: number; y: number };
  pins?: Array<{ id: string; x?: number; y?: number; net?: string }>;
  raw?: any;
};

export type LibSymbols = any;
export type Junction = any;
export type NoConnect = any;
export type BusEntry = any;
export type Bus = any;

type KicadSchContextType = {
  kicad: KicadSch;
  runErc: () => ErcIssue[];
};

const KicadSchContext = createContext<KicadSchContextType | null>(null);

/* ========================= PROVIDER ========================= */

export const KicadSchProvider = ({ children }: any) => {
  const [wires, setWires] = useState<any[]>([]);
  const { placedSymbols, livePinPositionsRef, setPlacedSymbols } = useSymbol();
  const { currentProject, updateCurrentProjectFiles } = useProject();

  /* ---------- refs for latest state ---------- */

  const placedSymbolsRef = useRef<any[]>(placedSymbols || []);
  const wiresRef = useRef<any[]>(wires || []);
  useEffect(() => { placedSymbolsRef.current = placedSymbols || []; }, [placedSymbols]);
  useEffect(() => { wiresRef.current = wires || []; }, [wires]);

  /* ---------- rehydration guard ---------- */

  const isRehydratedRef = useRef(false);
  const rehydratedProjectIds = useRef<Record<string, boolean>>({});

  /* ---------- publish wires ---------- */

  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent("set-wires", { detail: wires || [] }));
    } catch {}
  }, [wires]);

  /* ========================= AUTOSAVE ========================= */

  const saveTimerRef = useRef<number | null>(null);

  const doSaveTrackway = async () => {
    if (!currentProject?.id) return;
    if (!isRehydratedRef.current) return;

    const payload = {
      placedSymbols: placedSymbolsRef.current || [],
      wires: wiresRef.current || [],
    };

    const fileName = `${currentProject.id}.trackway.json`;
    const files: Record<string, string> = {
      [fileName]: JSON.stringify(payload, null, 2),
    };

    try {
      await updateCurrentProjectFiles(files);
    } catch (e) {
      console.warn("[KicadSchProvider] failed to save", e);
    }
  };

  const scheduleSave = () => {
    if (!isRehydratedRef.current) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    saveTimerRef.current = window.setTimeout(() => {
      void doSaveTrackway();
      saveTimerRef.current = null;
    }, 250) as unknown as number;
  };

  /* ========================= REHYDRATE ========================= */

  useEffect(() => {
    if (DISABLE_AUTOSAVE) {
      console.debug('[KicadSchProvider] rehydrate skipped due to DISABLE_AUTOSAVE constant');
      return;
    }
    const pid = currentProject?.id;
    if (!pid) return;
    if (rehydratedProjectIds.current[pid]) return;

    const files = currentProject.files ?? {};
    const companionPath = Object.keys(files).find(p =>
      p.toLowerCase().endsWith(".trackway.json")
    );

    if (!companionPath) {
      rehydratedProjectIds.current[pid] = true;
      console.debug(`[KicadSchProvider] rehydrated editor state from ${companionPath}`, { placedCount, wireCount });
    } catch (e) {
      console.warn("Failed to rehydrate editor state from companion file", e);
    }
    // only run when project id changes
  }, [currentProject?.id, setPlacedSymbols, setWires]);

// Module-level dev helper: always-available console function that dispatches
// an event the provider will handle when mounted. This prevents "not a
// function" errors if the provider hasn't attached its own helper yet.
try {
  if (typeof window !== 'undefined' && !(window as any).__trackway_forceCreateWire) {
    (window as any).__trackway_forceCreateWire = () => {
      try { window.dispatchEvent(new CustomEvent('dev-force-create-wire')); return true; } catch (e) { return false; }
    };
  }
} catch (e) {}


  // Autosave placed symbols and wires into the current project's companion
  // file. Debounced so rapid edits don't thrash storage; skip the immediate
  // save that follows rehydration.
  useEffect(() => {
    console.debug('[KicadSchProvider] autosave effect triggered', { projectId: currentProject?.id ?? null, placedCount: (placedSymbols||[]).length, wireCount: (wires||[]).length, skipInitial: skipInitialSaveRef.current });
    // allow tests/dev to disable autosave via constant
    if (DISABLE_AUTOSAVE) {
      console.debug('[KicadSchProvider] autosave disabled by DISABLE_AUTOSAVE constant');
      return;
    }

    if (skipInitialSaveRef.current) {
      // clear the flag and do not save the initial rehydration values
      console.debug('[KicadSchProvider] skipping autosave due to initial rehydration flag');
      skipInitialSaveRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const payload = { placedSymbols: placedSymbols || [], wires: wires || [] };
        console.debug('[KicadSchProvider] autosave payload prepared', { placedCount: payload.placedSymbols.length, wireCount: payload.wires.length });
        if (currentProject && typeof updateCurrentProjectFiles === 'function') {
          const files = { ...(currentProject.files || {}) } as any;
          const fileName = `editor.trackway.json`;
          files[fileName] = JSON.stringify(payload, null, 2);
          console.debug('[KicadSchProvider] writing to project files', { projectId: currentProject.id, fileName });
          await updateCurrentProjectFiles(files);
          console.debug('[KicadSchProvider] autosaved editor state to', fileName);
        } else if (typeof window !== 'undefined' && window.localStorage) {
          // no active project: write to localStorage as a local autosave
          try { window.localStorage.setItem(LOCAL_AUTOSAVE_KEY, JSON.stringify(payload)); console.debug('[KicadSchProvider] autosaved editor state to localStorage', { key: LOCAL_AUTOSAVE_KEY }); } catch (err) { console.warn('[KicadSchProvider] localStorage autosave failed', err); }
        }
      } catch (err) {
        console.warn('[KicadSchProvider] autosave failed', err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [placedSymbols, wires, currentProject?.id, updateCurrentProjectFiles]);

  // If no project is loaded, try to restore from a local autosave in localStorage
  useEffect(() => {
    if (DISABLE_AUTOSAVE) {
      console.debug('[KicadSchProvider] restore from localStorage skipped due to DISABLE_AUTOSAVE');
      return;
    }
    if (currentProject) return; // only run when no project selected
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(LOCAL_AUTOSAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed) {
        if (Array.isArray(parsed.placedSymbols) && typeof setPlacedSymbols === 'function') setPlacedSymbols(parsed.placedSymbols);
        if (Array.isArray(parsed.wires) && typeof setWires === 'function') setWires(parsed.wires);
        console.debug('[KicadSchProvider] restored editor state from localStorage autosave');
        // avoid immediately persisting this restore back
        skipInitialSaveRef.current = true;
      }
    } catch (err) {
      // ignore parse errors
    }
  }, [currentProject]);

  // Keep placed symbol pin `connected` flags in sync with the wires array.
  // This ensures ERC and saving reflect actual connections.
  useEffect(() => {
    try {
      const connectedPinIds = new Set<string>();
      (wires || []).forEach((w: any) => {
        (w.points || []).forEach((p: any) => { if (p && p.pinId) connectedPinIds.add(p.pinId); });
      });
      if (typeof setPlacedSymbols === 'function') {
        setPlacedSymbols((prevPlaced: any[] | undefined) => {
          const base = Array.isArray(prevPlaced) ? prevPlaced : (placedSymbolsRef.current || []);
          const next = base.map((s: any) => ({
            ...s,
            pins: (s.pins || []).map((p: any) => ({ ...p, connected: connectedPinIds.has(p.id) }))
          }));
          // shallow-detect whether any connected flag actually changed to avoid unnecessary re-renders
          let changed = false;
          if (next.length !== base.length) changed = true;
          else {
            for (let i = 0; i < next.length && !changed; i++) {
              const a = base[i]; const b = next[i];
              const ap = Array.isArray(a?.pins) ? a.pins : [];
              const bp = Array.isArray(b?.pins) ? b.pins : [];
              if (ap.length !== bp.length) { changed = true; break; }
              for (let j = 0; j < ap.length; j++) {
                const av = !!ap[j]?.connected;
                const bv = !!bp[j]?.connected;
                if (av !== bv) { changed = true; break; }
              }
            }
          }
          return changed ? next : base;
        });
      }
    } catch (e) {
      console.warn("Rehydrate failed", e);
    }

    rehydratedProjectIds.current[pid] = true;
    isRehydratedRef.current = true;
  }, [currentProject?.id, setPlacedSymbols]);

  /* ========================= WIRE EVENTS ========================= */

  useEffect(() => {
    // Allow external triggers to save the editor's placed symbol and wire
    // state into the current project's companion `.trackway.json` file.
    const onSave = async (_ev: Event) => {
      // Respect schematic constant for autosave (developer/testing)
      if (DISABLE_AUTOSAVE) {
        console.debug('[KicadSchProvider] save-trackway ignored due to DISABLE_AUTOSAVE constant');
        return;
      }
      try {
        const payload = { placedSymbols: placedSymbolsRef.current || [], wires: wiresRef.current || [] };
        const fileName = `editor.trackway.json`;
        if (currentProject && typeof updateCurrentProjectFiles === 'function') {
          try {
            const files = { ...(currentProject.files || {}) } as any;
            files[fileName] = JSON.stringify(payload, null, 2);
            await updateCurrentProjectFiles(files);
            console.debug('[KicadSchProvider] saved editor state to', fileName, { projectId: currentProject.id });
            return;
          } catch (err) {
            console.warn('[KicadSchProvider] failed to save editor state to project files', err);
            // fallthrough to localStorage fallback
          }
        }

        // Fallback: write to localStorage so the state is not lost on refresh
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            window.localStorage.setItem(LOCAL_AUTOSAVE_KEY, JSON.stringify(payload));
            console.debug('[KicadSchProvider] saved editor state to localStorage', { key: LOCAL_AUTOSAVE_KEY });
            return;
          } catch (err) {
            console.warn('[KicadSchProvider] failed to save editor state to localStorage', err);
          }
        }
      } catch (err) {
        console.warn('[KicadSchProvider] save handler failed', err);
      }
    };
    window.addEventListener('save-trackway', onSave as EventListener);

    // Ensure we persist a final snapshot to localStorage on unload. IndexedDB
    // operations are async and not reliable during unload, so we always write
    // a JSON snapshot to localStorage as a last-resort recovery.
    const onBeforeUnload = () => {
      try {
        if (DISABLE_AUTOSAVE) {
          console.debug('[KicadSchProvider] beforeunload skipped due to DISABLE_AUTOSAVE constant');
          return;
        }
        const payload = { placedSymbols: placedSymbolsRef.current || [], wires: wiresRef.current || [] };
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(LOCAL_AUTOSAVE_KEY, JSON.stringify(payload));
          console.debug('[KicadSchProvider] beforeunload: wrote localStorage autosave');
        }
      } catch (e) {
        // ignore
      }
    };

    const onWireCommit = (ev: Event) => {
      const wire = (ev as CustomEvent).detail?.wire ?? (ev as CustomEvent).detail;
      if (!wire) return;

      // Ensure every wire has a stable id. If id/uuid is missing (or becomes
      // the literal string "undefined"), multiple wires can collapse into the
      // same group and appear as if the previous wire disappeared.
      try {
        const curId = wire?.id ?? wire?.uuid;
        const bad = !curId || curId === 'undefined' || curId === 'null';
        if (bad) {
          const gen = (globalThis as any)?.crypto?.randomUUID?.();
          const fallback = `w-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          const nextId = gen || fallback;
          wire.id = nextId;
          if (!wire.uuid || wire.uuid === 'undefined' || wire.uuid === 'null') wire.uuid = nextId;
        } else {
          // keep uuid aligned when absent
          if (!wire.uuid) wire.uuid = curId;
          if (!wire.id) wire.id = curId;
        }
      } catch (e) {}

      try {
        console.info('[KicadSch] onWireCommitted received', {
          wireId: wire?.id ?? wire?.uuid,
          wiresRefSize: Array.isArray(wiresRef.current) ? wiresRef.current.length : 0,
          placedSymbolsCount: Array.isArray(placedSymbolsRef.current) ? placedSymbolsRef.current.length : 0,
          projectId: currentProject?.id ?? null,
          companion: (() => {
            try {
              const files = (currentProject && currentProject.files) ? currentProject.files : {};
              const companionPath = Object.keys(files || {}).find((p) => p.toLowerCase().endsWith('.trackway.json'));
              if (!companionPath) return null;
              const raw = files[companionPath];
              return { path: companionPath, size: raw ? String(raw).length : 0 };
            } catch (e) { return null; }
          })()
        });
      } catch (e) {}
      const normalizePoints = (pts: any[] | undefined) => {
        if (!Array.isArray(pts)) return pts || [];
        const out: any[] = [];
        for (const p of pts) {
          if (!p) continue;
          const last = out[out.length - 1];
          if (last && Math.abs((last.x||0) - (p.x||0)) < 1e-6 && Math.abs((last.y||0) - (p.y||0)) < 1e-6) continue;
          out.push(p);
        }
        return out;
      };
      // ensure committed wire has no consecutive duplicate points
      try { wire.points = normalizePoints(Array.isArray(wire.points) ? wire.points : (wire.pts && Array.isArray((wire.pts as any).xy) ? (wire.pts as any).xy.map((pp: any)=>({ x: pp[0], y: pp[1] })) : wire.points)); } catch (e) {}
      setWires((prev: any[]) => {
        const arr = Array.isArray(prev) ? prev.slice() : [];
        const idx = arr.findIndex((w: any) => w.id === wire.id || w.uuid === wire.id || w.id === wire.uuid || w.uuid === wire.uuid);
        if (idx >= 0) arr[idx] = wire;
        else arr.push(wire);

        // Also publish the full canonical list so listeners that missed the
        // incremental event (or remounted) can recover.
        try {
          const payload = arr.slice();
          setTimeout(() => {
            try { window.dispatchEvent(new CustomEvent('set-wires', { detail: payload })); } catch (e) {}
          }, 0);
        } catch (e) {}

        return arr;
      });
      // schedule immediate save so project files reflect committed wire
      setTimeout(() => { try { if (!DISABLE_AUTOSAVE) window.dispatchEvent(new Event('save-trackway')); } catch (e) {} }, 0);
    };

    const onWireRemovedEvent = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail || {};
      const wireId = detail?.wireId;
      const pinIds: string[] = Array.isArray(detail?.pinIds) ? detail.pinIds : [];
      if (wireId) {
        setWires((prev: any[]) => (prev || []).filter((w: any) => w.id !== wireId));
        setTimeout(() => { try { if (!DISABLE_AUTOSAVE) window.dispatchEvent(new Event('save-trackway')); } catch (e) {} }, 0);
      } else if (pinIds.length > 0) {
        setWires((prev: any[]) => (prev || []).filter((w: any) => {
          const pts = w.points || [];
          return !pts.some((p: any) => p && p.pinId && pinIds.includes(p.pinId));
        }));
        setTimeout(() => { try { if (!DISABLE_AUTOSAVE) window.dispatchEvent(new Event('save-trackway')); } catch (e) {} }, 0);
      }
      // ensure symbol pins are cleared (SymbolContext also listens, but keep provider in sync)
      if (pinIds.length > 0 && typeof setPlacedSymbols === 'function') {
        setPlacedSymbols((prev) => (prev || []).map((s: any) => ({
          ...s,
          pins: (s.pins || []).map((p: any) => (pinIds.includes(p.id) ? { ...p, connected: false } : p))
        })));
      }
    };

    const onSetWires = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail || {};
      const newWires = Array.isArray(detail?.wires) ? detail.wires : undefined;
      if (newWires) setWires(newWires);
      setTimeout(() => { try { if (!DISABLE_AUTOSAVE) window.dispatchEvent(new Event('save-trackway')); } catch (e) {} }, 0);
    };

    window.addEventListener('wire-committed', onWireCommitted as EventListener);
    window.addEventListener('wire-added', onWireCommitted as EventListener);
    window.addEventListener('wire-removed', onWireRemovedEvent as EventListener);
    window.addEventListener('set-wires', onSetWires as EventListener);
    const onRequestWires = (_ev: Event) => {
      try {
        const payload = wiresRef.current || [];
        try { console.info('[KicadSch] request-wires received; emitting set-wires', { count: Array.isArray(payload) ? payload.length : 0 }); } catch(e) {}
        try { setTimeout(() => { try { window.dispatchEvent(new CustomEvent('set-wires', { detail: payload })); } catch (err) {} }, 0); } catch (err) {}
      } catch (e) {}
    };
    window.addEventListener('request-wires', onRequestWires as EventListener);
    const onConnectWireToPin = (ev: Event) => {
      try {
        const detail: any = (ev as CustomEvent).detail || {};
        try { console.info('[KicadSch] onConnectWireToPin received', { detailSample: { pinId: detail?.pinId, x: detail?.x, y: detail?.y, wireId: detail?.wireId, end: detail?.end } }); } catch (e) {}
        const pinId: string | undefined = detail?.pinId || undefined;
        const x: number | undefined = typeof detail?.x === 'number' ? detail.x : undefined;
        const y: number | undefined = typeof detail?.y === 'number' ? detail.y : undefined;
        const wireId: string | undefined = detail?.wireId || undefined;
        const end: 'start'|'end'|undefined = detail?.end;
        if (!pinId || typeof x !== 'number' || typeof y !== 'number') return;

        setWires((prev: any[]) => {
          const arr = (prev || []).map((w: any) => ({ ...w, points: Array.isArray(w.points) ? w.points.map((p: any) => ({ ...p })) : (w.points || []) }));
          // find target wire
          let targetIdx = -1;
          if (wireId) targetIdx = arr.findIndex((w: any) => (w.id ?? w.uuid) === wireId);
          if (targetIdx < 0) {
            // fallback: nearest wire endpoint
            let best = { idx: -1, dist: Infinity, ptIdx: -1 };
            for (let i = 0; i < arr.length; i++) {
              const w = arr[i]; const pts = w.points || [];
              for (let j = 0; j < pts.length; j++) {
                const p = pts[j]; if (!p) continue;
                const dx = (p.x ?? 0) - x; const dy = (p.y ?? 0) - y; const d = Math.hypot(dx, dy);
                if (d < best.dist) { best = { idx: i, dist: d, ptIdx: j }; }
              }
            }
            if (best.idx >= 0) { targetIdx = best.idx; }
          }

          if (targetIdx >= 0) {
            const w = arr[targetIdx]; const pts = w.points || [];
            // choose point to attach: prefer explicit end request
            let attachIdx = -1;
            if (end === 'start') attachIdx = 0;
            else if (end === 'end') attachIdx = Math.max(0, pts.length - 1);
            else {
              // nearest point
              let bestD = Infinity; for (let j = 0; j < pts.length; j++) { const p = pts[j]; if (!p) continue; const d = Math.hypot((p.x ?? 0) - x, (p.y ?? 0) - y); if (d < bestD) { bestD = d; attachIdx = j; } }
            }
            if (attachIdx >= 0) {
              pts[attachIdx] = { ...(pts[attachIdx] || {}), x, y, pinId };
              // build anchors and recompute similar to placed-symbol-moved
              const anchors: any[] = [];
              const first = pts[0]; anchors.push({ x: first.x, y: first.y, pinId: first.pinId });
              for (let i = 1; i < pts.length - 1; i++) { const p = pts[i]; if (p && p.pinId) anchors.push({ x: p.x, y: p.y, pinId: p.pinId }); }
              const last = pts[pts.length - 1]; if (!(last.x === first.x && last.y === first.y)) anchors.push({ x: last.x, y: last.y, pinId: last.pinId });

              const snapToGrid = (pt: { x: number; y: number }) => ({ x: Math.round(pt.x), y: Math.round(pt.y) });
              const minimalManhattanPath = (a: any, b: any) => {
                const A = snapToGrid(a); const B = snapToGrid(b);
                if (A.x === B.x || A.y === B.y) return [A, B];
                const cornerB = { x: B.x, y: A.y };
                return [A, cornerB, B];
              };

              const newPts: any[] = [];
              for (let ai = 0; ai < anchors.length - 1; ai++) {
                const A = anchors[ai]; const B = anchors[ai + 1];
                const segment = minimalManhattanPath({ x: A.x, y: A.y }, { x: B.x, y: B.y });
                for (let si = 0; si < segment.length; si++) {
                  const spt = segment[si];
                  if (newPts.length > 0) {
                    const lp = newPts[newPts.length - 1]; if (Math.abs(lp.x - spt.x) < 1e-6 && Math.abs(lp.y - spt.y) < 1e-6) continue;
                  }
                  let pId: string | undefined = undefined;
                  if (si === 0 && A.pinId) pId = A.pinId;
                  if (si === segment.length - 1 && B.pinId) pId = B.pinId;
                  newPts.push({ x: spt.x, y: spt.y, pinId: pId });
                }
              }
              const newWire = { ...w, points: newPts };
              arr[targetIdx] = newWire;
              try { console.info('[KicadSch] dispatching wire-committed (connect-wire-to-pin)', { wireId: newWire.id ?? newWire.uuid, points: newWire.points?.length }); } catch (e) {}
              try { window.dispatchEvent(new CustomEvent('wire-committed', { detail: { wire: newWire } })); } catch (err) {}
            }
          }
          return arr;
        });
      } catch (err) {}
    };
    window.addEventListener('connect-wire-to-pin', onConnectWireToPin as EventListener);

    // When a placed symbol is moved, update only the explicit pin-attached
    // points (and attach nearby points). Defer the heavier Manhattan
    // recompute to the endpoint worker so this handler stays fast and
    // non-blocking on the main thread.
    const onPlacedSymbolMoved = (ev: Event) => {
      try {
        const detail: any = (ev as CustomEvent).detail || {};
        try { console.info('[KicadSch] onPlacedSymbolMoved (light) received', { movedPinsCount: Array.isArray(detail?.pins) ? detail.pins.length : 0 }); } catch (e) {}
        const movedPins: Array<any> = Array.isArray(detail?.pins) ? detail.pins : [];
        if (!movedPins.length) return;
        const movedById: Record<string, { x: number; y: number }> = {};
        for (const p of movedPins) if (p && p.id) movedById[p.id] = { x: p.x, y: p.y };

        // Prefer prior positions supplied by the mover (prevX/prevY). Fall back
        // to placedSymbolsRef when prev positions are not present.
        const priorById: Record<string, { x: number; y: number } | undefined> = {};
        try {
          for (const p of movedPins) {
            if (p && p.id && typeof p.prevX === 'number' && typeof p.prevY === 'number') {
              priorById[p.id] = { x: p.prevX, y: p.prevY };
            }
          }
          // fallback to placedSymbolsRef-derived priors only when needed
          for (const ps of (placedSymbolsRef.current || [])) {
            const pins = Array.isArray(ps.pins) ? ps.pins : [];
            for (const pp of pins) {
              if (pp && pp.id && movedById[pp.id] && !priorById[pp.id]) {
                priorById[pp.id] = { x: pp.x ?? (ps.position?.x ?? 0), y: pp.y ?? (ps.position?.y ?? 0) };
              }
            }
          }
        } catch (e) {}

        setWires((prevWires: any[]) => {
          const next = (prevWires || []).map((w: any) => {
            const pts = Array.isArray(w.points) ? w.points.map((p: any) => ({ ...p })) : [];
            let touched = false;
            // update explicit pin-attached points
            for (const pt of pts) {
              if (pt && pt.pinId && movedById[pt.pinId]) {
                const np = movedById[pt.pinId]; pt.x = np.x; pt.y = np.y; touched = true;
              }
            }
            // attempt to attach moved pins to untagged points that were at the
            // prior pin position (handles wires created before `pinId` was set)
            if (!touched) {
              const ATTACH_TH = 2; // world units tolerance
              for (const mid of Object.keys(movedById)) {
                const prior = priorById[mid];
                if (!prior) continue;
                for (let pi = 0; pi < pts.length; pi++) {
                  const pt = pts[pi]; if (!pt) continue;
                  if (pt.pinId) continue; // already tagged
                  const dx = (pt.x ?? 0) - prior.x; const dy = (pt.y ?? 0) - prior.y;
                  if (Math.hypot(dx, dy) <= ATTACH_TH) {
                    const np = movedById[mid]; pts[pi] = { ...(pts[pi] || {}), x: np.x, y: np.y, pinId: mid };
                    touched = true;
                    try { console.debug('[KicadSch] attached pinId to nearby wire point', { wireId: w.id ?? w.uuid, pinId: mid, prior, newPos: np }); } catch (e) {}
                    break;
                  }
                }
                if (touched) break;
              }
            }
            if (!touched) return w;

            // Recompute orthogonal Manhattan path between anchors so we don't
            // reuse potentially diagonal interior points. Build anchors from
            // explicit pin-attached points (first, any pinned midpoints, last)
            try {
              const anchors: any[] = [];
              if (pts.length === 0) return w;
              const first = pts[0]; anchors.push({ x: first.x, y: first.y, pinId: first.pinId });
              for (let i = 1; i < pts.length - 1; i++) { const p = pts[i]; if (p && p.pinId) anchors.push({ x: p.x, y: p.y, pinId: p.pinId }); }
              const last = pts[pts.length - 1]; if (!(last.x === first.x && last.y === first.y)) anchors.push({ x: last.x, y: last.y, pinId: last.pinId });

              const snapToGrid = (pt: { x: number; y: number }) => ({ x: Math.round(pt.x), y: Math.round(pt.y) });
              const minimalManhattanPath = (a: any, b: any) => {
                const A = snapToGrid(a); const B = snapToGrid(b);
                if (A.x === B.x || A.y === B.y) return [A, B];
                const corner = { x: B.x, y: A.y };
                return [A, corner, B];
              };

              const newPts: any[] = [];
              for (let ai = 0; ai < anchors.length - 1; ai++) {
                const A = anchors[ai]; const B = anchors[ai + 1];
                const segment = minimalManhattanPath({ x: A.x, y: A.y }, { x: B.x, y: B.y });
                for (let si = 0; si < segment.length; si++) {
                  const spt = segment[si];
                  if (newPts.length > 0) {
                    const lp = newPts[newPts.length - 1]; if (Math.abs(lp.x - spt.x) < 1e-6 && Math.abs(lp.y - spt.y) < 1e-6) continue;
                  }
                  let pId: string | undefined = undefined;
                  if (si === 0 && A.pinId) pId = A.pinId;
                  if (si === segment.length - 1 && B.pinId) pId = B.pinId;
                  newPts.push({ x: spt.x, y: spt.y, pinId: pId });
                }
              }
              if (newPts.length < 2 && anchors.length >= 2) {
                newPts.push({ x: anchors[anchors.length - 1].x, y: anchors[anchors.length - 1].y, pinId: anchors[anchors.length - 1].pinId });
              }
              return { ...w, points: newPts };
            } catch (e) {
              return { ...w, points: pts };
            }
          });

          // normalize consecutive duplicate points for all updated wires
          try {
            for (let i = 0; i < next.length; i++) {
              const w = next[i];
              if (!w) continue;
              const pts = Array.isArray(w.points) ? w.points : (w.pts && Array.isArray((w.pts as any).xy) ? (w.pts as any).xy.map((pp: any)=>({ x: pp[0], y: pp[1] })) : []);
              const out: any[] = [];
              for (const p of pts) {
                if (!p) continue;
                const last = out[out.length - 1];
                if (last && Math.abs((last.x||0) - (p.x||0)) < 1e-6 && Math.abs((last.y||0) - (p.y||0)) < 1e-6) continue;
                out.push(p);
              }
              if (out.length) next[i] = { ...w, points: out };
            }
          } catch (e) {}

          // Notify mirrors and other listeners of the updated canonical wire list
          try { setTimeout(() => { try { window.dispatchEvent(new CustomEvent('set-wires', { detail: next })); } catch (e) {} }, 0); } catch (e) {}
          // persist a snapshot asynchronously
          setTimeout(() => { try { if (!DISABLE_AUTOSAVE) window.dispatchEvent(new Event('save-trackway')); } catch (e) {} }, 0);
          return next;
        });
      } catch (err) {
        // ignore errors during lightweight update
      }
    };
    window.addEventListener('placed-symbol-moved', onPlacedSymbolMoved as EventListener);

    // Expose a debug helper so developers can force a save from the browser
    // console: `await window.__trackway_saveNow()` which will return a result
    // object and print debug logs. This helps diagnose why autosave may be
    // failing in a user's environment.
    // @ts-ignore
    (window as any).__trackway_saveNow = async () => {
      try {
        await onSave(new Event('save-trackway'));
        console.debug('[KicadSchProvider] __trackway_saveNow succeeded');
        return { ok: true };
      } catch (err) {
        console.warn('[KicadSchProvider] __trackway_saveNow failed', err);
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    };

    // Dev helper: force-create a sample wire and emit wire-committed so canvases
    // can validate wire merge and mirror population without interacting UI.
    // Usage: `window.__trackway_forceCreateWire()` in the browser console.
    // @ts-ignore
    (window as any).__trackway_forceCreateWire = () => {
      try {
        // create sample wire and dispatch so canvases receive it
        const sampleWire = { id: `dev-${Date.now()}`, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], __version: 1 };
        try { setWires((prev:any[]) => ([...(prev||[]), sampleWire])); } catch (e) {}
        try { window.dispatchEvent(new CustomEvent('wire-committed', { detail: { wire: sampleWire } })); } catch (e) {}
        try { console.info('[KicadSch] __trackway_forceCreateWire dispatched', { wireId: sampleWire.id }); } catch (e) {}
        return sampleWire;
      } catch (e) { console.warn('[KicadSch] __trackway_forceCreateWire failed', e); return null; }
    };

    // Also respond to the module-level `dev-force-create-wire` event in case
    // the global wrapper was called before this provider mounted.
    const onDevForceCreate = () => {
      try {
        const sampleWire = { id: `dev-${Date.now()}`, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], __version: 1 };
        try { setWires((prev:any[]) => ([...(prev||[]), sampleWire])); } catch (e) {}
        try { window.dispatchEvent(new CustomEvent('wire-committed', { detail: { wire: sampleWire } })); } catch (e) {}
        try { console.info('[KicadSch] dev-force-create-wire handled', { wireId: sampleWire.id }); } catch (e) {}
      } catch (e) {}
    };
    window.addEventListener('dev-force-create-wire', onDevForceCreate as EventListener);

    return () => {
      window.removeEventListener('wire-committed', onWireCommitted as EventListener);
      window.removeEventListener('wire-added', onWireCommitted as EventListener);
      window.removeEventListener('wire-removed', onWireRemovedEvent as EventListener);
      window.removeEventListener('set-wires', onSetWires as EventListener);
      window.removeEventListener('request-wires', onRequestWires as EventListener);
      window.removeEventListener('connect-wire-to-pin', onConnectWireToPin as EventListener);
      window.removeEventListener('save-trackway', onSave as EventListener);
      window.removeEventListener('beforeunload', onBeforeUnload as EventListener);
      window.removeEventListener('dev-force-create-wire', onDevForceCreate as EventListener);
      // cleanup debug helper
      try { // avoid exceptions in non-browser test environments
        // @ts-ignore
        if ((window as any).__trackway_saveNow) delete (window as any).__trackway_saveNow;
        // @ts-ignore
        if ((window as any).__trackway_forceCreateWire) delete (window as any).__trackway_forceCreateWire;
      } catch (e) {}
    };
  }, [setWires, setPlacedSymbols]);

  /* ========================= KICAD SCHEMA ========================= */

  const stableUuidRef = useRef<string>(
    crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  );

  const kicad = useMemo<KicadSch>(() => {
    const symbols = placedSymbols.map((p: any) => ({
      lib_id: p.symbolId ?? p.id,
      at: [p.position?.x ?? 0, p.position?.y ?? 0, 0],
      uuid: p.id,
      pins: (p.pins || []).map((pp: any, i: number) => ({
        number: String(i + 1),
        uuid: pp.id,
      })),
    }));

    const kicadWires = wires.map((w: any) => ({
      pts: { xy: w.points.map((p: any) => [p.x, p.y]) },
      stroke: { width: 1, type: "solid" as any },
      uuid: w.id,
    }));

    return {
      version: 20220414,
      generator: "trackway-web",
      uuid: stableUuidRef.current,
      symbol: symbols as any,
      wire: kicadWires,
    } as KicadSch;
  }, [placedSymbols, wires]);

  /* ========================= ERC ========================= */

  const runErc = (): ErcIssue[] => {
    return [];
  };

  return (
    <KicadSchContext.Provider value={{ kicad, runErc }}>
      {children}
    </KicadSchContext.Provider>
  );
};

/* ========================= HOOKS ========================= */

export const useKicadSch = () => {
  const ctx = useContext(KicadSchContext);
  if (!ctx) throw new Error("useKicadSch must be used within provider");
  return ctx;
};

export const useKicadSchSafe = () => useContext(KicadSchContext);
export default KicadSchContext;
