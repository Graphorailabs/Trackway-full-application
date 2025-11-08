export type GridPoint = { x: number; y: number };

function heuristic(a: GridPoint, b: GridPoint) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function neighbors(n: GridPoint, step: number) {
  return [
    { x: n.x + step, y: n.y },
    { x: n.x - step, y: n.y },
    { x: n.x, y: n.y + step },
    { x: n.x, y: n.y - step },
  ];
}

export function aStarRoute(
  start: GridPoint,
  end: GridPoint,
  obstacles: GridPoint[],
  step: number
): GridPoint[] {
  const key = (p: GridPoint) => `${p.x},${p.y}`;
  const blocked = new Set(obstacles.map(key));

  const open = new Set([key(start)]);
  const came = new Map<string, GridPoint>();
  const g = new Map([[key(start), 0]]);
  const f = new Map([[key(start), heuristic(start, end)]]);

  while (open.size) {
    let currentKey = [...open].reduce((a, b) =>
      (f.get(a) ?? 99999) < (f.get(b) ?? 99999) ? a : b
    );

    let [cx, cy] = currentKey.split(",").map(Number);
    let current = { x: cx, y: cy };

    if (current.x === end.x && current.y === end.y) {
      let path = [current];
      while (came.has(currentKey)) {
        current = came.get(currentKey)!;
        currentKey = key(current);
        path.unshift(current);
      }
      return path;
    }

    open.delete(currentKey);

    for (let nxt of neighbors(current, step)) {
      if (blocked.has(key(nxt))) continue;

      const nk = key(nxt);
      const newG = (g.get(currentKey) ?? 99999) + 1;

      if (newG < (g.get(nk) ?? 99999)) {
        came.set(nk, current);
        g.set(nk, newG);
        f.set(nk, newG + heuristic(nxt, end));
        open.add(nk);
      }
    }
  }

  return [];
}
