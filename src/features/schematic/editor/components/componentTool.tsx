import { Circle, Group, Layer, Rect } from "react-konva";
import { useStage } from "../context/stageProvider";
import { useTool } from "../context/ToolContext";
import { useEffect, useState } from "react";
import { useComponents } from "../context/ComponentContext";
import { SvgSymbol } from "./SvgSymbol";
import { useWires } from "../context/WireContext";
import { useGrid } from "../context/GlobalGrid";
// import { useGrid } from "../context/GridContext";

export default function ComponentTool() {
  const { stageRef, state } = useStage();
  const { tool, selectedComponent, setTool, setSelectedComponent } = useTool();
  const { components, addComponent, updateComponent } = useComponents();
  const { scale, position } = state;

  const { updateWirePinPosition} = useWires();

  
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const toWorld = (p: any) => ({
    x: (p.x - position.x) / scale,
    y: (p.y - position.y) / scale,
  });

  // const PIN_OFFSET = 30;
  const PIN_RADIUS = 4;

  const createPins = (type: string) => {
    const PIN_OFFSET = 30;
    const newPin = (offsetX: number, offsetY: number) => ({
      id: crypto.randomUUID(),
      offsetX,
      offsetY,
      x: offsetX,
      y: offsetY, 
      connected: false,
      wireId: null
    });

    switch (type) {
      case "resistor":
      case "capacitor":
      case "inductor":
        return [
          newPin(-PIN_OFFSET, 0),
          newPin(PIN_OFFSET, 0)
        ];
      case "ground":
        return [newPin(0, -5)];
      default:
        return [];
    }
  };


    const placeComponent = () => {
      if (!selectedComponent || tool !== "component") return;

      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (!pointer) return;

      const pos = toWorld(pointer);

      const snappedX = Math.round(pos.x / gridStep) * gridStep;
      const snappedY = Math.round(pos.y / gridStep) * gridStep;

      addComponent({
        id: crypto.randomUUID(),
        name: selectedComponent,
        position: { x: snappedX, y: snappedY },
        pins: createPins(selectedComponent).map((p: any) => ({
          ...p,
          x: snappedX + p.offsetX,
          y: snappedY + p.offsetY,
        })),
      });
    };


    useEffect(() => {
      const stage = stageRef.current;
      if (!stage) return;

      stage.on("click", placeComponent);

      const exitPlacement = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setSelectedComponent(null);
          setTool("none"); // ✅ Exit placement mode
        }
      };

      window.addEventListener("keydown", exitPlacement);

      return () => {
        stage.off("click", placeComponent);
        window.removeEventListener("keydown", exitPlacement);
      };
    }, [tool, selectedComponent]);



 const { gridStep } = useGrid(); // ✅ get grid spacing

const handleDragMove = (comp: any, e: any) => {
  const stage = e.target.getStage();
  if (!stage) return;

  const pointer = stage.getPointerPosition();
  if (!pointer) return;

  const wx = (pointer.x - state.position.x) / state.scale;
  const wy = (pointer.y - state.position.y) / state.scale;

  // ✅ Snap to grid
  const snappedX = Math.round(wx / gridStep) * gridStep;
  const snappedY = Math.round(wy / gridStep) * gridStep;

  updateComponent(comp.id, {
    position: { x: snappedX, y: snappedY },
    pins: comp.pins.map((pin: any) => {
      const newPinX = snappedX + pin.offsetX;
      const newPinY = snappedY + pin.offsetY;

      // ✅ Live wire update during drag
      if (pin.connected) {
        updateWirePinPosition(pin.id, newPinX, newPinY);
      }
      return { ...pin, x: newPinX, y: newPinY };
    }),
  });
};



  const symbolPath: any = {
    resistor: "/symbols/resistor.svg",
    capacitor: "/symbols/capacitor.svg",
    inductor: "/symbols/inductor.svg",
    ground: "/symbols/ground.svg",
  };

  return (
    <Layer
      x = {position.x}
      y = {position.y}
      scale={{x: scale, y: scale}}
    >
      {components.map((c: any) => (
        <Group
          key={c.id}
          x={c.position.x}
          y={c.position.y}
          draggable
          onClick={() => setSelectedId(c.id)}
          onDragMove={(e) => handleDragMove(c, e)}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = "move";
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = "default";
          }}
        >
          {/* ✅ Component symbol */}
          <SvgSymbol path={symbolPath[c.name]} scale={scale} />

 {c.pins.map((p: any) =>
  !p.connected && (
    <Circle
      key={p.id}
      x={p.x - c.position.x}
      y={p.y - c.position.y}
      radius={PIN_RADIUS / scale}
      fill="white"
      stroke="black"
      strokeWidth={1 / scale}

      draggable // ✅ Enable dragging

      onDragMove={(e) => {
        const nx = e.target.x() + c.position.x;
        const ny = e.target.y() + c.position.y;

        // ✅ Auto-reroute wires while pin drags
        updateWirePinPosition(p.id, nx, ny);
      }}

      onDragEnd={(e) => {
        const nx = e.target.x() + c.position.x;
        const ny = e.target.y() + c.position.y;

        // ✅ Final update on release
        updateWirePinPosition(p.id, nx, ny);
      }}

      hitStrokeWidth={20 / scale} // ✅ easier to grab
    />
  )
)}


          {/* ✅ Dashed highlight rectangle */}
          {selectedId === c.id && (
            <Rect
              x={-35}
              y={-20}
              width={70}
              height={40}
              stroke="cyan"
              strokeWidth={1 / scale}
              dash={[4, 4]}
            />
          )}
        </Group>
      ))}
    </Layer>
  );
}
