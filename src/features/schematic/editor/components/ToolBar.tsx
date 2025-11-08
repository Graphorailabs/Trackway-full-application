import { useState } from "react";
import { useTool, type ComponentKey } from "../context/ToolContext";
import { LuMousePointer2, LuSpline } from "react-icons/lu";
import { TbCircuitResistor, TbCircuitCapacitor, TbCircuitInductor, TbCircuitGround } from "react-icons/tb";
import { IoIosArrowDown } from "react-icons/io";

export default function Toolbar() {
  const { tool, setTool, selectedComponent, setSelectedComponent } = useTool();
  const [dropdownOpen, setDropdownOpen] = useState(false);

 const COMPONENTS: { key: ComponentKey; icon: React.ReactNode }[] = [
  { key: "resistor", icon: <TbCircuitResistor /> },
  { key: "capacitor", icon: <TbCircuitCapacitor /> },
  { key: "inductor", icon: <TbCircuitInductor /> },
  { key: "ground", icon: <TbCircuitGround /> },
  // Optional: add "vcc" only if you have an icon for it
];


  // default show resistor if none selected
  const currentComponent =
    COMPONENTS.find(c => c.key === selectedComponent)?.icon || <TbCircuitResistor />;

  return (
    <div className="relative flex gap-3 p-2 bg-gray-200 text-black">

      {/* SELECT TOOL */}
      <button
        className={`px-3 py-2 rounded ${tool === "none" ? "bg-green-300" : "bg-gray-100"}`}
        onClick={() => {
          setTool("none");
          setSelectedComponent(null);
        }}
      >
        <LuMousePointer2 />
      </button>

      {/* WIRE TOOL */}
      <button
        className={`px-3 py-2 rounded ${tool === "wire" ? "bg-green-300" : "bg-gray-100"}`}
        onClick={() => {
          setTool("wire");
          setSelectedComponent(null);
        }}
      >
        <LuSpline />
      </button>

      {/* COMPONENT DROPDOWN */}
      <div className="relative">
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded ${
            tool === "component" ? "bg-green-300" : "bg-gray-100"
          }`}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          {currentComponent}
          <IoIosArrowDown size={14} />
        </button>

        {/* DROPDOWN LIST */}
        {dropdownOpen && (
          <div className="absolute mt-1 left-0 bg-white shadow-lg border rounded z-50">
            {COMPONENTS.map((comp) => (
              <button
                key={comp.key}
                className="flex gap-2 items-center px-3 py-1 hover:bg-gray-200 w-full text-left"
                onClick={() => {
                  setSelectedComponent(comp.key);
                  setTool("component");
                  setDropdownOpen(false);
                }}
              >
                {comp.icon}
                {comp.key}
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
