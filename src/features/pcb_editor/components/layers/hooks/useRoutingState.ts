import { useState, useRef, useEffect } from "react";
import type { Pt } from "../routing/octilinearRouter";
import { routerParams } from "../constants/routingConstants";

export const useRoutingState = (setPreviewTracks: (tracks: Pt[]) => void) => {
    // Routing state
    const [routingStart, setRoutingStart] = useState<Pt | null>(null);
    const [routingActive, setRoutingActive] = useState(false);
    const workerRef = useRef<Worker | null>(null);
    const routingActiveRef = useRef<boolean>(false);
    const workerRequestIdRef = useRef<number>(0);
    // Segments placed during the current continuous routing session.
    // Stored in a ref so we can include them in obstacle lists immediately
    // without waiting for `pcb` state to update.
    const placedSegmentsRef = useRef<Array<{ start: Pt; end: Pt; width: number; layer?: string }>>([]);

    useEffect(() => {
        // Initialize worker (module type so `import` inside worker works)
        workerRef.current = new Worker(new URL('../routing/RoutingWorker.ts', import.meta.url), { type: 'module' });
        workerRef.current.onmessage = (e) => {
            if (e.data.type === 'routeResult') {
                // Ignore stale responses that don't match the last request id
                if (typeof e.data.id !== 'number' || e.data.id !== workerRequestIdRef.current) return;
                // Avoid applying worker results after routing was finalized.
                if (!routingActiveRef.current) return;
                if (e.data.result.success && e.data.result.path) {
                    setPreviewTracks(e.data.result.path);
                } else {
                    setPreviewTracks([]);
                }
            }
        };
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    // keep a ref in sync so worker message handler can check latest active state
    useEffect(() => {
        routingActiveRef.current = routingActive;
    }, [routingActive]);

    // Handle Escape to cancel routing
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setRoutingStart(null);
                setPreviewTracks([]);
                setRoutingActive(false);
                routingActiveRef.current = false;
                placedSegmentsRef.current = [];
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    return {
        routingStart,
        setRoutingStart,
        routingActive,
        setRoutingActive,
        workerRef,
        routingActiveRef,
        workerRequestIdRef,
        placedSegmentsRef,
        routerParams,
    };
};