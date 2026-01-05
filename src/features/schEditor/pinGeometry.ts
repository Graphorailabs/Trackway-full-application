// pinGeometry.ts
export function computePinEnd(
  pin: any,
  gfxBounds: any,
  scale = 1,
  lengthMultiplier = 1.5
) {
  const [px, py, rot] = pin.at;
  const len = (pin.length || 1.5) * scale * lengthMultiplier;

  let ix = px * scale;
  let iy = py * scale;

  if (gfxBounds) {
    if (rot === 0) ix = gfxBounds.minX;
    else if (rot === 180) ix = gfxBounds.maxX;
    else if (rot === 90) iy = gfxBounds.maxY;
    else if (rot === 270) iy = gfxBounds.minY;
  }

  let ex = ix;
  let ey = iy;

  if (rot === 0) ex += len;
  else if (rot === 180) ex -= len;
  else if (rot === 90) ey += len;
  else if (rot === 270) ey -= len;

  return { ix, iy, ex, ey };
}
