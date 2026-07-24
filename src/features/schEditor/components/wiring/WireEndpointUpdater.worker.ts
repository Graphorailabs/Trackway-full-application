// Lightweight worker to update wire endpoints when placed symbols move.
// Receives messages: { type: 'updateEndpoints', wires: Wire[], movedPins: {id,x,y}[] }
// Replies with: { type: 'updated', updated: Wire[] }

self.addEventListener('message', (ev: MessageEvent) => {
  const msg = ev.data || {};
  if (!msg || msg.type !== 'updateEndpoints') return;
  const wires = Array.isArray(msg.wires) ? msg.wires : [];
  const movedPins = Array.isArray(msg.movedPins) ? msg.movedPins : [];
  const movedById: Record<string, { x: number; y: number }> = {};
  for (const p of movedPins) if (p && p.id) movedById[p.id] = { x: Number(p.x) || 0, y: Number(p.y) || 0 };
  const priorById: Record<string, { x: number; y: number } | undefined> = {};
  for (const p of movedPins) if (p && p.id && typeof p.prevX === 'number' && typeof p.prevY === 'number') priorById[p.id] = { x: Number(p.prevX) || 0, y: Number(p.prevY) || 0 };

  const ATTACH_TH = 2; // threshold in world units
  const snapToGrid = (pt: { x: number; y: number }) => ({ x: Math.round(pt.x), y: Math.round(pt.y) });
  const minimalManhattanPath = (a: { x: number; y: number }, b: { x: number; y: number }, preferredAxis?: 'h'|'v') => {
    const A = snapToGrid(a); const B = snapToGrid(b);
    if (A.x === B.x || A.y === B.y) return [A, B];
    const cornerA = { x: A.x, y: B.y };
    const cornerB = { x: B.x, y: A.y };
    if (preferredAxis === 'h') return [A, cornerB, B];
    if (preferredAxis === 'v') return [A, cornerA, B];
    return [A, cornerB, B];
  };

  const updated: any[] = [];
  const debug: any[] = [];
  for (const w of wires) {
    try {
      const pts = Array.isArray(w.points) ? w.points.map((p:any)=>({ ...(p||{}) })) : [];
      let touched = false;
      // update explicit pinId points
      for (let i=0;i<pts.length;i++){
        const pt = pts[i];
        if (pt && pt.pinId && movedById[pt.pinId]) {
          const np = movedById[pt.pinId]; pt.x = np.x; pt.y = np.y; touched = true;
          debug.push({ wireId: w.id ?? w.uuid, action: 'updateExplicitPin', pinId: pt.pinId, index: i, newPos: np });
        }
      }
      // attach untagged points that are within ATTACH_TH of moved pin PRIOR position (if available)
      if (!touched) {
        for (const mid of Object.keys(movedById)) {
          const prior = priorById[mid];
          const np = movedById[mid];
          for (let i=0;i<pts.length;i++){
            const pt = pts[i]; if (!pt) continue; if (pt.pinId) continue;
            const ref = prior || np; // prefer prior position when provided
            const dx = (pt.x||0) - ref.x; const dy = (pt.y||0) - ref.y;
            if (Math.hypot(dx,dy) <= ATTACH_TH) {
              debug.push({ wireId: w.id ?? w.uuid, action: 'attachNearby', pinId: mid, index: i, priorRef: ref, ptBefore: pt, newPos: np });
              pts[i] = { ...(pts[i]||{}), x: np.x, y: np.y, pinId: mid };
              touched = true;
              break;
            }
          }
          if (touched) break;
        }
      }

      if (!touched) continue;

      // build anchors and recompute minimal Manhattan segments
      const anchors: any[] = [];
      if (pts.length === 0) continue;
      const first = pts[0]; anchors.push({ x: first.x, y: first.y, pinId: first.pinId });
      for (let i=1;i<pts.length-1;i++){ const p=pts[i]; if (p && p.pinId) anchors.push({ x: p.x, y: p.y, pinId: p.pinId }); }
      const last = pts[pts.length-1]; if (!(last.x === first.x && last.y === first.y)) anchors.push({ x: last.x, y: last.y, pinId: last.pinId });

      const newPts: any[] = [];
      for (let ai=0; ai<anchors.length-1; ai++){
        const A = anchors[ai]; const B = anchors[ai+1];
        const segment = minimalManhattanPath({ x: A.x, y: A.y }, { x: B.x, y: B.y });
        for (let si=0; si<segment.length; si++){
          const spt = segment[si];
          if (newPts.length > 0) {
            const lp = newPts[newPts.length-1]; if (Math.abs(lp.x - spt.x) < 1e-6 && Math.abs(lp.y - spt.y) < 1e-6) continue;
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
      const newWire = { ...w, points: newPts };
      updated.push(newWire);
    } catch (e) {
      // ignore per-wire errors
    }
  }

  // Post updated wires and debug information for diagnostics
  (self as any).postMessage({ type: 'updated', updated, debug });
});
