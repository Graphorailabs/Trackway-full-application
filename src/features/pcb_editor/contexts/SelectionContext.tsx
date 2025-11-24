/* eslint-disable react-refresh/only-export-components -- context exports hooks/helpers */
import React, { createContext, useContext, useEffect, useState } from "react";
import { usePcb } from "./PcbContext";

type SelectionContextValue = {
    selectedUuid: string | null;
    select: (uuid: string | null) => void;
    clear: () => void;
    deleteSelected: () => void;
    // context menu state (coordinates are container-relative)
    contextMenuPos: { x: number; y: number } | null;
    openContextMenu: (pos: { x: number; y: number } | null) => void;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function useSelection() {
    const ctx = useContext(SelectionContext);
    if (!ctx) throw new Error("useSelection must be used within <SelectionProvider>");
    return ctx;
}

export function SelectionProvider({ children }: { children: React.ReactNode }) {
    const { updatePcb } = usePcb();
    const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
    const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

    const select = (uuid: string | null) => setSelectedUuid(uuid);
    const clear = () => {
        setSelectedUuid(null);
        setContextMenuPos(null);
    };

    const deleteSelected = () => {
        if (!selectedUuid) return;
        // If a whole route was selected, delete all connected segments in that route
        if (selectedUuid.startsWith("__route:")) {
            const token = selectedUuid.slice("__route:".length);
            // Build segments list with ids
            const segs: Array<{ id: string; start: [number, number]; end: [number, number] }> = [];
            for (const t of (updatePcb as any ? [] : [])) { /* noop placeholder to satisfy TS */ }
            // We can't access pcb here directly, so rely on updatePcb's callback snapshot
            updatePcb((current) => {
                for (const t of (current.tracks ?? [])) {
                    if (t.kind !== 'segment') continue;
                    const d: any = t.data ?? {};
                    const s = d.start ?? [0,0];
                    const e = d.end ?? [0,0];
                    const id = (d.uuid as string) || `__track:${s[0]}:${s[1]}:${e[0]}:${e[1]}:${d.width ?? 0}`;
                    segs.push({ id, start: [s[0] ?? 0, s[1] ?? 0], end: [e[0] ?? 0, e[1] ?? 0] });
                }
                const startIdx = segs.findIndex(s => s.id === token);
                if (startIdx === -1) return current; // nothing to delete
                const eps = 1e-6;
                const eq = (a: [number, number], b: [number, number]) => Math.abs(a[0]-b[0]) <= eps && Math.abs(a[1]-b[1]) <= eps;
                const neighbors = new Map<number, number[]>();
                for (let i = 0; i < segs.length; i++) neighbors.set(i, []);
                for (let i = 0; i < segs.length; i++) {
                    for (let j = i+1; j < segs.length; j++) {
                        const si = segs[i];
                        const sj = segs[j];
                        if (eq(si.start, sj.start) || eq(si.start, sj.end) || eq(si.end, sj.start) || eq(si.end, sj.end)) {
                            neighbors.get(i)!.push(j);
                            neighbors.get(j)!.push(i);
                        }
                    }
                }
                const visited = new Set<number>();
                const q: number[] = [startIdx];
                visited.add(startIdx);
                while (q.length) {
                    const cur = q.shift()!;
                    for (const nb of neighbors.get(cur) ?? []) {
                        if (!visited.has(nb)) { visited.add(nb); q.push(nb); }
                    }
                }
                // Build set of ids to remove
                const removeIds = new Set(Array.from(visited).map(i => segs[i].id));
                return {
                    ...current,
                    tracks: (current.tracks ?? []).filter((t) => {
                        if (t.kind !== 'segment') return true;
                        const d: any = t.data ?? {};
                        const id = (d.uuid as string) || `__track:${(d.start?.[0] ?? 0)}:${(d.start?.[1] ?? 0)}:${(d.end?.[0] ?? 0)}:${(d.end?.[1] ?? 0)}:${d.width ?? 0}`;
                        return !removeIds.has(id);
                    }),
                } as any;
            });
            setSelectedUuid(null);
            return;
        }
        // Support deleting graphics, footprints and tracks (segments/vias).
        // The `selectedUuid` may be a special token for a track selection
        // (format: `__track:startX:startY:endX:endY:width`). Handle that
        // case first, otherwise match by `data.uuid` like other entities.
        if (selectedUuid.startsWith("__track:")) {
            const parts = selectedUuid.split(":");
            if (parts.length >= 6) {
                const sx = Number(parts[1]);
                const sy = Number(parts[2]);
                const ex = Number(parts[3]);
                const ey = Number(parts[4]);
                const w = Number(parts[5]);
                const eps = 1e-6;
                updatePcb((current) => ({
                    ...current,
                    tracks: (current.tracks ?? []).filter((t) => {
                        try {
                            if (t.kind !== 'segment') return true;
                            const d: any = t.data || {};
                            const s = d.start ?? [0,0];
                            const e = d.end ?? [0,0];
                            const ww = d.width ?? 0;
                            const matches = Math.abs((s[0]||0) - sx) <= eps && Math.abs((s[1]||0) - sy) <= eps && Math.abs((e[0]||0) - ex) <= eps && Math.abs((e[1]||0) - ey) <= eps && Math.abs((ww||0) - w) <= eps;
                            return !matches;
                        } catch (err) { return true; }
                    }),
                }));
                setSelectedUuid(null);
                return;
            }
        }

        updatePcb((current) => ({
            ...current,
            graphics: (current.graphics ?? []).filter((g) => ((g.data as unknown as { uuid?: string }).uuid) !== selectedUuid),
            footprints: (current.footprints ?? []).filter((f) => (f as unknown as { uuid?: string }).uuid !== selectedUuid),
            tracks: (current.tracks ?? []).filter((t) => !(((t.data as any)?.uuid) === selectedUuid)),
        }));
        setSelectedUuid(null);
    };

    const openContextMenu = (pos: { x: number; y: number } | null) => {
        setContextMenuPos(pos);
    };

    // Unselect on Escape key globally when selection exists
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setSelectedUuid(null);
                setContextMenuPos(null);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const value: SelectionContextValue = {
        selectedUuid,
        select,
        clear,
        deleteSelected,
        contextMenuPos,
        openContextMenu,
    };

    return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export default SelectionContext;
