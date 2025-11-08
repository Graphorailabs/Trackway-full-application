export type Point = { x: number; y: number };

/**
 * Converts a polyline of world points into a rounded orthogonal SVG path.
 */
export function makeOrthogonalRoundedPath(points: Point[], radius = 8): string {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const cmds: string[] = [];
  cmds.push(`M ${points[0].x} ${points[0].y}`);

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];

    if (p0.x === p1.x || p0.y === p1.y) {
      cmds.push(`L ${p1.x} ${p1.y}`);
      continue;
    }

    const corner = { x: p1.x, y: p0.y };
    const distA = Math.abs(corner.x - p0.x);
    const distB = Math.abs(p1.y - corner.y);
    const r = Math.max(0, Math.min(radius, distA / 2, distB / 2));
    const signX = corner.x >= p0.x ? 1 : -1;
    const signY = p1.y >= corner.y ? 1 : -1;

    const pre = { x: corner.x - signX * r, y: corner.y };
    const post = { x: corner.x, y: corner.y + signY * r };

    cmds.push(`L ${pre.x} ${pre.y}`);
    cmds.push(`Q ${corner.x} ${corner.y} ${post.x} ${post.y}`);
    cmds.push(`L ${p1.x} ${p1.y}`);
  }

  return cmds.join(" ");
}
