import { useEffect, useState } from "react";

/** Returns pattern image and readiness state for a dot tile. */
export function useDotPattern({
  step,
  dotRadius,
  dotColor,
  dotOpacity,
}: {
  step: number;
  dotRadius: number;
  dotColor: string;
  dotOpacity: number;
}): { image: HTMLImageElement | null; ready: boolean } {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    // draw on a tiny tile canvas
    const c = document.createElement("canvas");
  const tile = Math.max(2, Math.round(step));
  c.width = tile;
  c.height = tile;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.globalAlpha = dotOpacity;
    ctx.fillStyle = dotColor;
  const cx = c.width / 2;
  const cy = c.height / 2;
  const r = Math.max(0.5, Math.min(dotRadius, tile / 2 - 0.5));
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setImage(img);
      setReady(true);
    };
    img.src = c.toDataURL("image/png");

    return () => {
      cancelled = true;
    };
  }, [step, dotRadius, dotColor, dotOpacity]);

  return { image, ready };
}
