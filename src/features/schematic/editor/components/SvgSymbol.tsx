import { useEffect, useState } from "react";
import { Group, Path } from "react-konva";

interface SvgSymbolProps {
  x?: number;
  y?: number;
  scale: number;
  path: string;
}

export const SvgSymbol: React.FC<SvgSymbolProps> = ({ x = 0, y = 0, scale, path }) => {
  const [pathData, setPathData] = useState("");

useEffect(() => {
  console.log("Fetching SVG:", path);

  fetch(path)
    .then(res => {
      console.log("Response status:", res.status);
      return res.text();
    })
    .then(svg => {
      console.log("SVG Raw:", svg.substring(0, 100), "...");

      // ✅ More robust parse
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, "image/svg+xml");
      const paths = Array.from(doc.querySelectorAll("path"));

      console.log("Found paths:", paths.length);

      if (paths.length === 0) {
        console.warn("⚠️ No <path> elements inside:", path);
        return;
      }

      const d = paths
        .map((p) => p.getAttribute("d"))
        .filter(Boolean)
        .join(" ");

      console.log("Final d:", d);

      setPathData(d);
    })
    .catch(err => console.error("SVG fetch error:", err));
}, [path]);


  return (
    <Group x={x} y={y}>
      <Path
        data={pathData}
        stroke="#cc0202ff"
        strokeWidth={2 / scale}
        scaleX={1}
        scaleY={1}
        offsetX={0}
        offsetY={0}
      />
    </Group>
  );
};
