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
        updatePcb((current) => ({
            ...current,
            graphics: (current.graphics ?? []).filter((g) => ((g.data as unknown as { uuid?: string }).uuid) !== selectedUuid),
            footprints: (current.footprints ?? []).filter((f) => (f as unknown as { uuid?: string }).uuid !== selectedUuid),
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
