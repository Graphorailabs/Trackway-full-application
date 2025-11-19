/* eslint-disable react-refresh/only-export-components -- Canvas component is fine to export */
import React, { useEffect, useRef } from "react";
import { useGrid } from "@/features/pcb_editor/contexts/GridContext";
import { useZoom } from "@/features/pcb_editor/contexts/ZoomContext";

type ViewportCenter = { x: number; y: number };

export default function GridCanvas({
  width,
  height,
  viewportCenter,
}: {
  width: number;
  height: number;
  viewportCenter: ViewportCenter;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { minorSpacing, majorSpacing, renderMinorPx } = useGrid();
  const { zoom, camera } = useZoom();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    // backing store size for crisp lines
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // world->screen: screen = zoom * world + (viewportCenter - zoom * camera)
    // incorporate DPR so setTransform maps world (mm) -> device pixels
    const scale = dpr * zoom;
    const tx = dpr * (viewportCenter.x - zoom * camera.x);
    const ty = dpr * (viewportCenter.y - zoom * camera.y);

    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, tx, ty);

    // Decide visible step in world-space (mm) using GridContext's renderMinorPx
    const targetPx = Math.max(1, renderMinorPx ?? minorSpacing * zoom);
    const steps = Math.max(1, Math.round(targetPx / (minorSpacing * zoom)));
    const visibleStep = minorSpacing * steps;

    // compute world bounds that cover the screen
    const worldLeft = (0 - viewportCenter.x) / zoom + camera.x;
    const worldTop = (0 - viewportCenter.y) / zoom + camera.y;
    const worldRight = worldLeft + width / zoom;
    const worldBottom = worldTop + height / zoom;

    // Draw minor grid lines
    ctx.lineWidth = Math.max(1 / scale, 0.0001);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";

    const startX = Math.floor(worldLeft / visibleStep) * visibleStep;
    for (let x = startX; x <= worldRight; x += visibleStep) {
      ctx.beginPath();
      ctx.moveTo(x, worldTop);
      ctx.lineTo(x, worldBottom);
      ctx.stroke();
    }

    const startY = Math.floor(worldTop / visibleStep) * visibleStep;
    for (let y = startY; y <= worldBottom; y += visibleStep) {
      ctx.beginPath();
      ctx.moveTo(worldLeft, y);
      ctx.lineTo(worldRight, y);
      ctx.stroke();
    }

    // Draw major grid lines
    const majorStep = visibleStep * Math.max(1, Math.round(majorSpacing / minorSpacing));
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = Math.max(1.5 / scale, 0.0001);

    const startXmaj = Math.floor(worldLeft / majorStep) * majorStep;
    for (let x = startXmaj; x <= worldRight; x += majorStep) {
      ctx.beginPath();
      ctx.moveTo(x, worldTop);
      ctx.lineTo(x, worldBottom);
      ctx.stroke();
    }

    const startYmaj = Math.floor(worldTop / majorStep) * majorStep;
    for (let y = startYmaj; y <= worldBottom; y += majorStep) {
      ctx.beginPath();
      ctx.moveTo(worldLeft, y);
      ctx.lineTo(worldRight, y);
      ctx.stroke();
    }

    ctx.restore();
  }, [width, height, viewportCenter, zoom, camera.x, camera.y, minorSpacing, majorSpacing, renderMinorPx]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%", display: "block" }}
      aria-hidden
    />
  );
}
