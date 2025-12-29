import { useEffect } from "react";

export default function BoardSheet() {
  const A4_WIDTH = 900;
  const A4_HEIGHT = 650;

  // When rendered inside `CanvasSurface`, the parent applies the world
  // transform. Rendering a plain DOM/SVG block here in world coordinates
  // avoids requiring a Konva `Stage`.
  const left = -A4_WIDTH / 2;
  const top = -A4_HEIGHT / 2;

  useEffect(() => {
    const preventContextMenu = (e: any) => e.preventDefault();
    document.addEventListener("contextmenu", preventContextMenu);
    return () => document.removeEventListener("contextmenu", preventContextMenu);
  }, []);

  const borderColor = "#d70000ff";
  const fontSize = 12;

  return (
    <div
      style={{
        position: "absolute",
        left: `${left}px`,
        top: `${top}px`,
        width: `${A4_WIDTH}px`,
        height: `${A4_HEIGHT}px`,
        pointerEvents: "none",
      }}
    >
      <svg width={A4_WIDTH} height={A4_HEIGHT}>
        <rect x={0} y={0} width={A4_WIDTH} height={A4_HEIGHT} fill="none" stroke={borderColor} strokeWidth={2} />
        <rect x={10} y={10} width={A4_WIDTH - 20} height={A4_HEIGHT - 20} fill="none" stroke={borderColor} strokeWidth={1.2} />

        <g transform={`translate(70, ${A4_HEIGHT - 160})`}>
          <rect x={0} y={0} width={A4_WIDTH - 80} height={150} fill="none" stroke={borderColor} strokeWidth={1.2} />
          <line x1={0} y1={35} x2={A4_WIDTH - 80} y2={35} stroke={borderColor} />
          <line x1={0} y1={70} x2={A4_WIDTH - 80} y2={70} stroke={borderColor} />
          <line x1={0} y1={105} x2={A4_WIDTH - 80} y2={105} stroke={borderColor} />
          <line x1={0} y1={130} x2={A4_WIDTH - 80} y2={130} stroke={borderColor} />

          <line x1={120} y1={0} x2={120} y2={130} stroke={borderColor} />
          <line x1={350} y1={0} x2={350} y2={105} stroke={borderColor} />
          <line x1={480} y1={105} x2={480} y2={150} stroke={borderColor} />
          <line x1={600} y1={105} x2={600} y2={150} stroke={borderColor} />

          <line x1={A4_WIDTH - 240} y1={0} x2={A4_WIDTH - 240} y2={70} stroke={borderColor} />
          <line x1={A4_WIDTH - 80} y1={0} x2={A4_WIDTH - 80} y2={105} stroke={borderColor} />

          <text x={10} y={10} fontSize={fontSize} fill={borderColor}>Schematic</text>
          <text x={10} y={45} fontSize={fontSize} fill={borderColor}>Board</text>
          <text x={10} y={80} fontSize={fontSize} fill={borderColor}>Drawn</text>
          <text x={10} y={115} fontSize={fontSize} fill={borderColor}>Reviewed</text>

          <text x={160} y={10} fontSize={16} fontWeight="bold" fill={borderColor}>Schematic1</text>
          <text x={160} y={45} fontSize={fontSize} fill={borderColor}>Board1</text>

          <text x={350} y={80} fontSize={16} fontWeight="bold" fill={borderColor}>title name</text>

          <text x={A4_WIDTH - 230} y={10} fontSize={fontSize} fill={borderColor}>Create at:</text>
          <text x={A4_WIDTH - 170} y={10} fontSize={fontSize} fill={borderColor}>2025-10-28</text>

          <text x={A4_WIDTH - 230} y={45} fontSize={fontSize} fill={borderColor}>Update at:</text>
          <text x={A4_WIDTH - 170} y={45} fontSize={fontSize} fill={borderColor}>2025-10-28</text>

          <text x={A4_WIDTH - 190} y={80} fontSize={fontSize} fill={borderColor}>Page</text>
          <text x={A4_WIDTH - 110} y={80} fontSize={fontSize} fill={borderColor}>P1</text>

          <text x={360} y={112} fontSize={fontSize} fill={borderColor}>Version</text>
          <text x={500} y={112} fontSize={fontSize} fill={borderColor}>Size</text>
          <text x={650} y={112} fontSize={fontSize} fill={borderColor}>Page 1   Total 1</text>

          <text x={375} y={138} fontSize={fontSize} fill={borderColor}>V1.0</text>
          <text x={505} y={138} fontSize={fontSize} fill={borderColor}>A4</text>
          <text x={650} y={138} fontSize={fontSize} fill={borderColor}>trackway.com</text>
        </g>
      </svg>
    </div>
  );
}
