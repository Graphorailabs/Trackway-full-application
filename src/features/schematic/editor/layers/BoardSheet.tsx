import { Rect, Line, Text, Group } from "react-konva";
import {  useEffect } from "react";
import { useStage } from "../context/stageProvider";

export default function BoardSheet() {
  // A4 @ 96 DPI  (Portrait)
  const A4_WIDTH = 900;
  const A4_HEIGHT =  650;

  const { state } = useStage();
  const { scale, position } = state;

  // useEffect(() => {
  //   const handleResize = () => {
  //     setStageSize({
  //       width: window.innerWidth,
  //       height: window.innerHeight,
  //     });
  //     centerBoard();
  //   };

  //   window.addEventListener("resize", handleResize);
  //   handleResize();

  //   return () => window.removeEventListener("resize", handleResize);
  // }, []);

  // const centerBoard = () => {
  //   setPosition({
  //     x: stageSize.width / 2 - (A4_WIDTH * scale) / 2,
  //     y: stageSize.height / 2 - (A4_HEIGHT * scale) / 2,
  //   });
  // };

  // Disable right-click menu
  useEffect(() => {
    const preventContextMenu = (e: any) => e.preventDefault();
    document.addEventListener("contextmenu", preventContextMenu);
    return () => document.removeEventListener("contextmenu", preventContextMenu);
  }, []);

    const borderColor = "red";
  const fontSize = 12;
  return (
    <>
   <Group
      x={position.x}
      y={position.y}
      scaleX={scale}
      scaleY={scale}
    >
          {/* A4 Double Border */}
         <Rect x={0} y={0} width={A4_WIDTH} height={A4_HEIGHT} stroke={borderColor} strokeWidth={2} />
          <Rect x={10} y={10} width={A4_WIDTH - 20} height={A4_HEIGHT - 20} stroke={borderColor} strokeWidth={1.2} />


          {/* ✅ Title Block (bottom right) */}
            <Group x={70} y={A4_HEIGHT - 160}>
            {/* Outer Titleblock border */}
            <Rect x={0} y={0} width={A4_WIDTH - 80} height={150} stroke={borderColor} strokeWidth={1.2} />

            {/* Horizontal Dividers */}
            <Line points={[0, 35, A4_WIDTH - 80, 35]} stroke={borderColor} />
            <Line points={[0, 70, A4_WIDTH - 80, 70]} stroke={borderColor} />
            <Line points={[0, 105, A4_WIDTH - 80, 105]} stroke={borderColor} />
            <Line points={[0, 130, A4_WIDTH - 80, 130]} stroke={borderColor} />

            {/* Vertical Dividers Left */}
            <Line points={[120, 0, 120, 130]} stroke={borderColor} />
            <Line points={[350, 0, 350, 105]} stroke={borderColor} />
            <Line points={[480, 105, 480, 150]} stroke={borderColor} />
            <Line points={[600, 105, 600, 150]} stroke={borderColor} />

            {/* Vertical Right Block */}
            <Line points={[A4_WIDTH - 240, 0, A4_WIDTH - 240, 70]} stroke={borderColor} />
            <Line points={[A4_WIDTH - 80, 0, A4_WIDTH - 80, 105]} stroke={borderColor} />


            {/* ✅ Labels Left Section */}
            <Text x={10} y={10} text="Schematic" fontSize={fontSize} />
            <Text x={10} y={45} text="Board" fontSize={fontSize} />
            <Text x={10} y={80} text="Drawn" fontSize={fontSize} />
            <Text x={10} y={115} text="Reviewed" fontSize={fontSize} />

            {/* ✅ Title Center */}
            <Text x={160} y={10} text="Schematic1" fontSize={16} fontStyle="bold" />
            <Text x={160} y={45} text="Board1" fontSize={fontSize} />

            {/* ✅ Chip name center bottom */}
            <Text x={350} y={80} text="title name" fontSize={16} fontStyle="bold" >
                {name}
              </Text>

            {/* ✅ Right Section Block */}
            <Text x={A4_WIDTH - 230} y={10} text="Create at:" fontSize={fontSize} />
            <Text x={A4_WIDTH - 170} y={10} text="2025-10-28" fontSize={fontSize} />

            <Text x={A4_WIDTH - 230} y={45} text="Update at:" fontSize={fontSize} />
            <Text x={A4_WIDTH - 170} y={45} text="2025-10-28" fontSize={fontSize} />

            <Text x={A4_WIDTH - 190} y={80} text="Page" fontSize={fontSize} />
            <Text x={A4_WIDTH - 110} y={80} text="P1" fontSize={fontSize} />

            {/* ✅ Bottom Row */}
            <Text x={360} y={112} text="Version" fontSize={fontSize} />
            <Text x={500} y={112} text="Size" fontSize={fontSize} />
            <Text x={650} y={112} text="Page 1   Total 1" fontSize={fontSize} />

            <Text x={375} y={138} text="V1.0" fontSize={fontSize} />
            <Text x={505} y={138} text="A4" fontSize={fontSize} />
            <Text x={650} y={138} text="trackway.com" fontSize={fontSize} />

          </Group>
   
      </Group>
    </>
  );
}
