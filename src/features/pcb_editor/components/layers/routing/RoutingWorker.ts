// RoutingWorker.ts - Web Worker for octilinear routing computations

interface Pt {
  x: number;
  y: number;
}

// Import editor-level constants (worker bundler will inline these)
import { ENABLE_ENDPOINT_SNAP, ENDPOINT_SNAP_TOLERANCE } from "../../../constants";

interface RouterParams {
  gridStep: number;
  trackWidth: number;
  clearance: number;
  maxNodes: number;
  maxShoveDepth: number;
  shoveStep: number;
  orthoCost: number;
  diagCost: number;
  turnPenalty: number;
  shovePenalty: number;
}

interface RouteResult {
  success: boolean;
  path?: Pt[];
  error?: string;
}

interface ObstacleSeg { start: Pt; end: Pt; width: number }

interface RouteMessage {
  type: "route";
  id?: number;
  start: Pt;
  goal: Pt;
  params: RouterParams;
  obstacles?: ObstacleSeg[];
  padZones?: Array<{ cx: number; cy: number; r: number }>;
}

interface RouteResponse {
  type: "routeResult";
  id?: number;
  result: RouteResult;
}

// Basic collision API for worker that uses a list of linear obstacles.
class WorkerCollisionAPI {
  obstacles: ObstacleSeg[];
  padZones: Array<{ cx: number; cy: number; r: number }> | undefined;

  constructor(obstacles?: ObstacleSeg[]) {
    this.obstacles = obstacles ?? [];
    this.padZones = undefined;
  }

  // Helper: check if two segments intersect (including colinear overlap)
  private segsIntersect(a1: Pt, a2: Pt, b1: Pt, b2: Pt): boolean {
    const orient = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    const onSegment = (p: Pt, q: Pt, r: Pt) => (Math.min(p.x, r.x) <= q.x && q.x <= Math.max(p.x, r.x) && Math.min(p.y, r.y) <= q.y && q.y <= Math.max(p.y, r.y));
    const o1 = orient(a1, a2, b1);
    const o2 = orient(a1, a2, b2);
    const o3 = orient(b1, b2, a1);
    const o4 = orient(b1, b2, a2);
    if (o1 === 0 && onSegment(a1, b1, a2)) return true;
    if (o2 === 0 && onSegment(a1, b2, a2)) return true;
    if (o3 === 0 && onSegment(b1, a1, b2)) return true;
    if (o4 === 0 && onSegment(b1, a2, b2)) return true;
    return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
  }

  // Helper: point-to-segment distance
  private pointSegmentDist(px: Pt, a: Pt, b: Pt): number {
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const wx = px.x - a.x;
    const wy = px.y - a.y;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return Math.hypot(px.x - a.x, px.y - a.y);
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return Math.hypot(px.x - b.x, px.y - b.y);
    const t = c1 / c2;
    const projx = a.x + t * vx;
    const projy = a.y + t * vy;
    return Math.hypot(px.x - projx, px.y - projy);
  }

  // approximate segment-to-segment distance
  private segSegDist(a1: Pt, a2: Pt, b1: Pt, b2: Pt): number {
    if (this.segsIntersect(a1, a2, b1, b2)) return 0;
    const d1 = this.pointSegmentDist(a1, b1, b2);
    const d2 = this.pointSegmentDist(a2, b1, b2);
    const d3 = this.pointSegmentDist(b1, a1, a2);
    const d4 = this.pointSegmentDist(b2, a1, a2);
    return Math.min(d1, d2, d3, d4);
  }

  isSegmentFree(p1: Pt, p2: Pt, _trackWidth: number, clearance: number): boolean {
    const eps = 1e-4;
    const ptsEq = (a: Pt, b: Pt) => Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps;
    const endpointTol = ENABLE_ENDPOINT_SNAP ? ENDPOINT_SNAP_TOLERANCE : 0;
    const ptDist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
    for (const o of this.obstacles) {
      // If pad zones provided, allow segment-obstacle overlap when both
      // the tested segment and the obstacle overlap the same pad zone.
      if (this.padZones && this.padZones.length) {
        for (const z of this.padZones) {
          const segDistToZone = this.pointSegmentDist({ x: z.cx, y: z.cy }, p1, p2);
          const obsDistToZone = this.pointSegmentDist({ x: z.cx, y: z.cy }, o.start, o.end);
          if (segDistToZone <= z.r + 1e-6 && obsDistToZone <= z.r + 1e-6) {
            // both lie within same pad zone -> ignore this obstacle
            continue;
          }
        }
      }
      // Ignore obstacle if it only shares an endpoint with the tested segment.
      if (ptsEq(p1, o.start) || ptsEq(p1, o.end) || ptsEq(p2, o.start) || ptsEq(p2, o.end)) continue;
      const thresh = (o.width / 2) + clearance + (_trackWidth / 2);
      const dist = this.segSegDist(p1, p2, o.start, o.end);
      if (dist <= thresh) {
        // Allow near-endpoint contacts if the closest approach is due to
        // a segment endpoint being very close to an obstacle endpoint.
        const dists = [ptDist(p1, o.start), ptDist(p1, o.end), ptDist(p2, o.start), ptDist(p2, o.end)];
        const minPtDist = Math.min(...dists);
        if (endpointTol > 0 && minPtDist <= endpointTol && Math.abs(minPtDist - dist) <= 1e-3) {
          continue;
        }
        return false;
      }
    }
    return true;
  }

  findBlockingObjects(p1: Pt, p2: Pt, _trackWidth: number, clearance: number) {
    const eps = 1e-4;
    const ptsEq = (a: Pt, b: Pt) => Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps;
    const endpointTol = ENABLE_ENDPOINT_SNAP ? ENDPOINT_SNAP_TOLERANCE : 0;
    const ptDist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
    return this.obstacles.filter(o => {
      if (ptsEq(p1, o.start) || ptsEq(p1, o.end) || ptsEq(p2, o.start) || ptsEq(p2, o.end)) return false;
      // If pad zones provided, allow segment-obstacle overlap when both
      // the tested segment and the obstacle overlap the same pad zone.
      if (this.padZones && this.padZones.length) {
        for (const z of this.padZones) {
          const segDistToZone = this.pointSegmentDist({ x: z.cx, y: z.cy }, p1, p2);
          const obsDistToZone = this.pointSegmentDist({ x: z.cx, y: z.cy }, o.start, o.end);
          if (segDistToZone <= z.r + 1e-6 && obsDistToZone <= z.r + 1e-6) {
            return false;
          }
        }
      }
      const dist = this.segSegDist(p1, p2, o.start, o.end);
      const thresh = (o.width / 2) + clearance + (_trackWidth / 2);
      if (dist <= thresh) {
        const minPtDist = Math.min(ptDist(p1, o.start), ptDist(p1, o.end), ptDist(p2, o.start), ptDist(p2, o.end));
        if (endpointTol > 0 && minPtDist <= endpointTol && Math.abs(minPtDist - dist) <= 1e-3) return false;
        return true;
      }
      return false;
    });
  }

  findCollisionsForObjectTranslation(_obj: any, _dx: number, _dy: number) {
    return [];
  }

  moveObjectTentative(_obj: any, _dx: number, _dy: number) {
    // noop for now
  }

  rollbackTentativeMoves(_moves: any[]) {
    // noop for now
  }

  commitTentativeMoves(_moves: any[]) {
    // noop for now
  }
}

// Simplified router for worker (copy relevant parts)
class WorkerOctilinearRouter {
  private params: RouterParams;
  private collisionAPI: WorkerCollisionAPI;

  constructor(params: RouterParams, collisionAPI: WorkerCollisionAPI) {
    this.params = params;
    this.collisionAPI = collisionAPI;
  }

  worldToGrid(pt: Pt) {
    return {
      gx: Math.round(pt.x / this.params.gridStep),
      gy: Math.round(pt.y / this.params.gridStep),
    };
  }

  gridToWorld(gx: number, gy: number): Pt {
    return {
      x: gx * this.params.gridStep,
      y: gy * this.params.gridStep,
    };
  }

  octileHeuristic(gx: number, gy: number, goalGx: number, goalGy: number): number {
    const dx = Math.abs(gx - goalGx);
    const dy = Math.abs(gy - goalGy);
    const minD = Math.min(dx, dy);
    const maxD = Math.max(dx, dy);
    return this.params.diagCost * minD + this.params.orthoCost * (maxD - minD);
  }

  // Build a minimal octilinear path between two points snapped to the grid.
  // All returned points will be grid-aligned (multiples of params.gridStep),
  // and each segment will be either axis-aligned or 45° diagonal.
  private minimalOctilinearPath(start: Pt, goal: Pt): Pt[] {
    const startG = this.worldToGrid(start);
    const goalG = this.worldToGrid(goal);

    const dxG = goalG.gx - startG.gx;
    const dyG = goalG.gy - startG.gy;

    // Same grid column or row -> straight segment
    if (startG.gx === goalG.gx || startG.gy === goalG.gy) {
      return [this.gridToWorld(startG.gx, startG.gy), this.gridToWorld(goalG.gx, goalG.gy)];
    }

    const absdx = Math.abs(dxG);
    const absdy = Math.abs(dyG);

    // exact diagonal in grid -> straight diagonal segment
    if (absdx === absdy) {
      return [this.gridToWorld(startG.gx, startG.gy), this.gridToWorld(goalG.gx, goalG.gy)];
    }

    const signx = dxG < 0 ? -1 : 1;
    const signy = dyG < 0 ? -1 : 1;
    const diag = Math.min(absdx, absdy);
    const midGx = startG.gx + diag * signx;
    const midGy = startG.gy + diag * signy;

    return [this.gridToWorld(startG.gx, startG.gy), this.gridToWorld(midGx, midGy), this.gridToWorld(goalG.gx, goalG.gy)];
  }

  route(start: Pt, goal: Pt): RouteResult {
    // Prefer a minimal octilinear path (diagonal + axis) — this ensures
    // segments are 45° or 90° and avoids returning an arbitrary-angle
    // straight line when points are not axis-aligned.
    const candidate = this.minimalOctilinearPath(start, goal);
    let candidateFree = true;
    for (let i = 0; i < candidate.length - 1; i++) {
      if (!this.collisionAPI.isSegmentFree(candidate[i], candidate[i + 1], this.params.trackWidth, this.params.clearance)) {
        candidateFree = false;
        break;
      }
    }
    if (candidateFree) {
      return { success: true, path: candidate };
    }

    const startG = this.worldToGrid(start);
    const goalG = this.worldToGrid(goal);

    const openSet: any[] = [];
    const closedSet = new Set<string>();

    const startNode = {
      gx: startG.gx,
      gy: startG.gy,
      g: 0,
      h: this.octileHeuristic(startG.gx, startG.gy, goalG.gx, goalG.gy),
      f: 0,
      parent: null,
      dirFromParent: -1,
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    let expansions = 0;
    const DIRS = [
      { dx: 1, dy: 0 }, { dx: 1, dy: 1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 1 },
      { dx: -1, dy: 0 }, { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
    ];

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      expansions++;
      if (expansions > this.params.maxNodes) {
        return { success: false, error: "node limit" };
      }

      if (current.gx === goalG.gx && current.gy === goalG.gy) {
        const rawPath = this.reconstructPath(current);
        const smoothPath = this.smooth(rawPath);
        return { success: true, path: smoothPath };
      }

      closedSet.add(`${current.gx},${current.gy}`);

      for (let dirIdx = 0; dirIdx < 8; dirIdx++) {
        const d = DIRS[dirIdx];
        const ngx = current.gx + d.dx;
        const ngy = current.gy + d.dy;

        if (closedSet.has(`${ngx},${ngy}`)) continue;

        const p1 = this.gridToWorld(current.gx, current.gy);
        const p2 = this.gridToWorld(ngx, ngy);

        if (Math.abs(d.dx) === 1 && Math.abs(d.dy) === 1) {
          const side1 = this.gridToWorld(current.gx + d.dx, current.gy);
          const side2 = this.gridToWorld(current.gx, current.gy + d.dy);
          if (
            !this.collisionAPI.isSegmentFree(p1, side1, this.params.trackWidth, this.params.clearance) &&
            !this.collisionAPI.isSegmentFree(p1, side2, this.params.trackWidth, this.params.clearance)
          ) {
            continue;
          }
        }

        if (this.collisionAPI.isSegmentFree(p1, p2, this.params.trackWidth, this.params.clearance)) {
          const moveCost = Math.abs(d.dx) === 1 && Math.abs(d.dy) === 1 ? this.params.diagCost : this.params.orthoCost;
          const turnCost = current.dirFromParent === dirIdx ? 0 : this.params.turnPenalty;
          const tentativeG = current.g + moveCost + turnCost;
          const h = this.octileHeuristic(ngx, ngy, goalG.gx, goalG.gy);
          const newNode = {
            gx: ngx,
            gy: ngy,
            g: tentativeG,
            h,
            f: tentativeG + h,
            parent: current,
            dirFromParent: dirIdx,
          };
          const existing = openSet.find(n => n.gx === ngx && n.gy === ngy);
          if (!existing || tentativeG < existing.g) {
            if (existing) {
              openSet.splice(openSet.indexOf(existing), 1);
            }
            openSet.push(newNode);
          }
        }
      }
    }

    return { success: false, error: "no path found" };
  }

  private reconstructPath(node: any): Pt[] {
    const pts: Pt[] = [];
    let cur: any = node;
    while (cur !== null) {
      pts.unshift(this.gridToWorld(cur.gx, cur.gy));
      cur = cur.parent;
    }
    return pts;
  }

  private smooth(path: Pt[]): Pt[] {
    if (path.length < 3) return path;

    let out = [path[0]];
    for (let i = 1; i < path.length - 1; i++) {
      const prev = out[out.length - 1];
      const cur = path[i];
      const next = path[i + 1];
      if (this.octilinearDir(prev, cur) === this.octilinearDir(cur, next)) {
        continue;
      } else {
        out.push(cur);
      }
    }
    out.push(path[path.length - 1]);

    let i = 0;
    while (i < out.length - 2) {
      let j = out.length - 1;
      let shortened = false;
      while (j > i + 1) {
        if (this.collisionAPI.isSegmentFree(out[i], out[j], this.params.trackWidth, this.params.clearance)) {
          out.splice(i + 1, j - i - 1);
          shortened = true;
          break;
        }
        j--;
      }
      if (!shortened) i++;
    }
    return out;
  }

  private octilinearDir(a: Pt, b: Pt): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy > 0) return 2;
    if (dx > 0 && dy > 0) return 1;
    if (dx > 0 && dy === 0) return 0;
    if (dx > 0 && dy < 0) return 7;
    if (dx === 0 && dy < 0) return 6;
    if (dx < 0 && dy < 0) return 5;
    if (dx < 0 && dy === 0) return 4;
    if (dx < 0 && dy > 0) return 3;
    return -1;
  }
}

// Worker logic
self.onmessage = (e: MessageEvent<RouteMessage>) => {
  const message = e.data;

  if (message.type === "route") {
    const collisionAPI = new WorkerCollisionAPI((message as any).obstacles as ObstacleSeg[] | undefined);
    // attach padZones if provided so collision checks can allow pad-internal crossings
    (collisionAPI as any).padZones = (message as any).padZones ?? [];
    const router = new WorkerOctilinearRouter(message.params, collisionAPI);
    const result = router.route(message.start, message.goal);

    const response: RouteResponse = {
      type: "routeResult",
      id: (message as any).id,
      result,
    };

    (self as any).postMessage(response);
  }
};