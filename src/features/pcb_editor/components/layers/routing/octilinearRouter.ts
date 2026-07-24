// Octilinear Router Implementation based on KiCad's algorithm
import type { Point } from "@/types/project";

// Types
export interface Pt extends Point {}

export interface GridCoord {
  gx: number;
  gy: number;
}

export interface Node {
  gx: number;
  gy: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
  dirFromParent: number;
  shoveMoves?: MoveRecord[];
}

export interface MoveRecord {
  obj: BlockingObject;
  dx: number;
  dy: number;
}

export interface BlockingObject {
  id: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  movable: boolean;
}

export interface RouteResult {
  success: boolean;
  path?: Pt[];
  error?: string;
}

export interface RouterParams {
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

// Directions: E, NE, N, NW, W, SW, S, SE
const DIRS = [
  { dx: 1, dy: 0 },   // E
  { dx: 1, dy: 1 },   // NE
  { dx: 0, dy: 1 },   // N
  { dx: -1, dy: 1 },  // NW
  { dx: -1, dy: 0 },  // W
  { dx: -1, dy: -1 }, // SW
  { dx: 0, dy: -1 },  // S
  { dx: 1, dy: -1 },  // SE
];

// External API interfaces (to be implemented by collision detection system)
export interface CollisionAPI {
  isSegmentFree(p1: Pt, p2: Pt, trackWidth: number, clearance: number): boolean;
  findBlockingObjects(p1: Pt, p2: Pt, trackWidth: number, clearance: number): BlockingObject[];
  findCollisionsForObjectTranslation(obj: BlockingObject, dx: number, dy: number): BlockingObject[];
  moveObjectTentative(obj: BlockingObject, dx: number, dy: number): void;
  rollbackTentativeMoves(moves: MoveRecord[]): void;
  commitTentativeMoves(moves: MoveRecord[]): void;
}

export class OctilinearRouter {
  private params: RouterParams;
  private collisionAPI: CollisionAPI;

  constructor(params: RouterParams, collisionAPI: CollisionAPI) {
    this.params = params;
    this.collisionAPI = collisionAPI;
  }

  // Helpers
  worldToGrid(pt: Pt): GridCoord {
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

  key(gx: number, gy: number): string {
    return `${gx},${gy}`;
  }

  // Main route function
  route(start: Pt, goal: Pt): RouteResult {
    if (this.collisionAPI.isSegmentFree(start, goal, this.params.trackWidth, this.params.clearance)) {
      return { success: true, path: [start, goal] };
    }

    const startG = this.worldToGrid(start);
    const goalG = this.worldToGrid(goal);

    const openSet: Node[] = [];
    const closedSet = new Set<string>();

    const startNode: Node = {
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

    while (openSet.length > 0) {
      // Sort by f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      expansions++;
      if (expansions > this.params.maxNodes) {
        return { success: false, error: "node limit exceeded" };
      }

      if (current.gx === goalG.gx && current.gy === goalG.gy) {
        const rawPath = this.reconstructPath(current);
        const smoothPath = this.smooth(rawPath);
        this.commitTentativeShovesAlongPath(current);
        return { success: true, path: smoothPath };
      }

      closedSet.add(this.key(current.gx, current.gy));

      for (let dirIdx = 0; dirIdx < 8; dirIdx++) {
        const d = DIRS[dirIdx];
        const ngx = current.gx + d.dx;
        const ngy = current.gy + d.dy;

        if (closedSet.has(this.key(ngx, ngy))) continue;

        const p1 = this.gridToWorld(current.gx, current.gy);
        const p2 = this.gridToWorld(ngx, ngy);

        // Prevent diagonal corner cutting
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
          const moveCost =
            Math.abs(d.dx) === 1 && Math.abs(d.dy) === 1 ? this.params.diagCost : this.params.orthoCost;
          const turnCost = current.dirFromParent === dirIdx ? 0 : this.params.turnPenalty;
          const tentativeG = current.g + moveCost + turnCost;
          const h = this.octileHeuristic(ngx, ngy, goalG.gx, goalG.gy);
          const newNode: Node = {
            gx: ngx,
            gy: ngy,
            g: tentativeG,
            h,
            f: tentativeG + h,
            parent: current,
            dirFromParent: dirIdx,
          };
          // Push or update
          const existing = openSet.find(n => n.gx === ngx && n.gy === ngy);
          if (!existing || tentativeG < existing.g) {
            if (existing) {
              openSet.splice(openSet.indexOf(existing), 1);
            }
            openSet.push(newNode);
          }
        } else {
          const blockers = this.collisionAPI.findBlockingObjects(p1, p2, this.params.trackWidth, this.params.clearance);
          if (blockers.length === 0) continue;
          if (blockers.some(b => !b.movable)) continue;

          const recordedMoves: MoveRecord[] = [];
          if (this.attemptShove(blockers, d, this.params.maxShoveDepth, recordedMoves)) {
            const moveCost =
              Math.abs(d.dx) === 1 && Math.abs(d.dy) === 1 ? this.params.diagCost : this.params.orthoCost;
            const tentativeG = current.g + moveCost + this.params.shovePenalty;
            const h = this.octileHeuristic(ngx, ngy, goalG.gx, goalG.gy);
            const newNode: Node = {
              gx: ngx,
              gy: ngy,
              g: tentativeG,
              h,
              f: tentativeG + h,
              parent: current,
              dirFromParent: dirIdx,
              shoveMoves: [...recordedMoves],
            };
            const existing = openSet.find(n => n.gx === ngx && n.gy === ngy);
            if (!existing || tentativeG < existing.g) {
              if (existing) {
                openSet.splice(openSet.indexOf(existing), 1);
              }
              openSet.push(newNode);
            }
          } else {
            continue;
          }
        }
      }
    }

    return { success: false, error: "no path found" };
  }

  private attemptShove(
    blockers: BlockingObject[],
    pushDir: { dx: number; dy: number },
    depth: number,
    recordedMoves: MoveRecord[]
  ): boolean {
    if (depth <= 0) return false;

    for (const blocker of blockers) {
      const dx = this.normalize(pushDir).x * this.params.shoveStep;
      const dy = this.normalize(pushDir).y * this.params.shoveStep;
      const collisions = this.collisionAPI.findCollisionsForObjectTranslation(blocker, dx, dy);
      if (collisions.length === 0) {
        this.collisionAPI.moveObjectTentative(blocker, dx, dy);
        recordedMoves.push({ obj: blocker, dx, dy });
      } else {
        if (collisions.some(c => !c.movable)) {
          this.collisionAPI.rollbackTentativeMoves(recordedMoves);
          return false;
        }
        const nestedMoves: MoveRecord[] = [];
        const ok = this.attemptShove(collisions, pushDir, depth - 1, nestedMoves);
        if (!ok) {
          this.collisionAPI.rollbackTentativeMoves(nestedMoves);
          this.collisionAPI.rollbackTentativeMoves(recordedMoves);
          return false;
        }
        this.collisionAPI.moveObjectTentative(blocker, dx, dy);
        recordedMoves.push({ obj: blocker, dx, dy });
      }
    }
    return true;
  }

  private normalize(dir: { dx: number; dy: number }): { x: number; y: number } {
    const len = Math.sqrt(dir.dx * dir.dx + dir.dy * dir.dy);
    return len === 0 ? { x: 0, y: 0 } : { x: dir.dx / len, y: dir.dy / len };
  }

  private commitTentativeShovesAlongPath(node: Node): void {
    const collected: MoveRecord[] = [];
    let n: Node | null = node;
    while (n !== null) {
      if (n.shoveMoves) {
        collected.push(...n.shoveMoves);
      }
      n = n.parent;
    }
    this.collisionAPI.commitTentativeMoves(collected);
  }

  private reconstructPath(node: Node): Pt[] {
    const pts: Pt[] = [];
    let cur: Node | null = node;
    while (cur !== null) {
      pts.unshift(this.gridToWorld(cur.gx, cur.gy));
      cur = cur.parent;
    }
    return pts;
  }

  private smooth(path: Pt[]): Pt[] {
    if (path.length < 3) return path;

    // Remove collinear points
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

    // Shortcut
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
    if (dx === 0 && dy > 0) return 2; // N
    if (dx > 0 && dy > 0) return 1; // NE
    if (dx > 0 && dy === 0) return 0; // E
    if (dx > 0 && dy < 0) return 7; // SE
    if (dx === 0 && dy < 0) return 6; // S
    if (dx < 0 && dy < 0) return 5; // SW
    if (dx < 0 && dy === 0) return 4; // W
    if (dx < 0 && dy > 0) return 3; // NW
    return -1; // Same point
  }
} 