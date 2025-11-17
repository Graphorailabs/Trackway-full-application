
import { Stage, Layer, Line, Text, Group } from "react-konva";

interface UnitData {
  graphics: any[];
  pin: any[];
}

interface Props {
  data: Record<string, UnitData>; // your getContentById
}

export const SymbolPreview = ({ data }: Props) => {
  if (!data) return <div>No symbol selected</div>;

  const scale = 8; // KiCad units → px

  return (
    <Stage width={600} height={600} style={{ background: "#111" }}>
      <Layer>
        {Object.entries(data).map(([unitId, unit]) => (
          <Group key={unitId}>
            {/* Draw graphics */}
            {unit.graphics.map((g: any, idx: number) => {
              if (g.kind === "Polyline") {
                const pts = g.data.pts.xy.flat().map((n: number) => n * scale);

                return (
                  <Line
                    key={idx}
                    points={pts}
                    stroke="white"
                    strokeWidth={1}
                    closed={false}
                  />
                );
              }
              return null;
            })}

            {/* Draw pins */}
            {unit.pin.map((p: any, idx: number) => {
              const [x, y, rotation] = p.at;
              const px = x * scale;
              const py = y * scale;

              // pin line endpoint
              const len = p.length * scale;

              let dx = 0, dy = 0;
              if (rotation === 0) dx = -len;
              else if (rotation === 180) dx = len;
              else if (rotation === 90) dy = -len;
              else if (rotation === 270) dy = len;

              const name = p.name[""];
              const number = p.number[""];

              return (
                <Group key={idx}>
                  {/* Pin line */}
                  <Line
                    points={[px, py, px + dx, py + dy]}
                    stroke="cyan"
                    strokeWidth={1}
                  />

                  {/* Pin Name */}
                  <Text
                    x={px + dx - 10}
                    y={py + dy - 10}
                    text={name}
                    fontSize={10}
                    fill="#ccc"
                  />

                  {/* Pin Number */}
                  <Text
                    x={px + 2}
                    y={py + 2}
                    text={number}
                    fontSize={10}
                    fill="#999"
                  />
                </Group>
              );
            })}
          </Group>
        ))}
      </Layer>
    </Stage>
  );
};
