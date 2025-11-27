
// import { useState } from "react";
import { useTool } from "../context/ToolContext";
import { LuMousePointer2, LuSpline } from "react-icons/lu";
// import {
//   TbCircuitResistor,
//   TbCircuitCapacitor,
//   TbCircuitInductor,
//   TbCircuitGround,
// } from "react-icons/tb";

// import { IoIosArrowDown } from "react-icons/io";
import { LoadSymbol } from "./LoadSymbol";
import { useSymbol } from "../context/SymbolContext";

export default function Toolbar() {
  const { tool, setTool, setSelectedComponent } = useTool();

  // ⭐ SymbolContext → contains selectedSymbol
  const { selectedSymbol } = useSymbol();
  // const [dropdownOpen, setDropdownOpen] = useState(false);

  // const handlesymboldata = () => {
  //     console.log('pendingdatatoolbar', pendingSymbol )
  // }
  // const COMPONENTS = [
  //   { key: "resistor", icon: <TbCircuitResistor /> },
  //   { key: "capacitor", icon: <TbCircuitCapacitor /> },
  //   { key: "inductor", icon: <TbCircuitInductor /> },
  //   { key: "ground", icon: <TbCircuitGround /> },
  // ];

  // ⭐ If a symbol is selected → show its ID
  //const currentComponent = selectedSymbol?.id 
// const currentComponent = selectedSymbol?.id;

    // COMPONENTS.find((c) => c.key === selectedComponent)?.key ||
    // "resistor";

  return (
    <div className="flex flex-col items-center gap-2 p-1">
      {/* SELECT TOOL */}
      <button
        title="Select"
        className={`w-10 h-10 rounded flex items-center justify-center ${
          tool === "none" ? "bg-green-300" : "bg-gray-100"
        }`}
        onClick={() => {
          setTool("none");
          setSelectedComponent(null);
        }}
      >
        <LuMousePointer2 />
      </button>

      {/* WIRE TOOL */}
      <button
        title="Wire"
        className={`w-10 h-10 rounded flex items-center justify-center ${
          tool === "wire" ? "bg-green-300" : "bg-gray-100"
        }`}
        onClick={() => {
          setTool("wire");
          setSelectedComponent(null);
        }}
      >
        <LuSpline />
      </button>

      {/* Load Symbol Button */}
      <div className="w-10 h-10 flex items-center justify-center">
        <LoadSymbol />
      </div>

      {selectedSymbol && (
        <div className="text-xs text-gray-700 truncate w-12 text-center">
          {selectedSymbol.id}
        </div>
      )}
      

      {/* COMPONENT / SYMBOL SELECT DROPDOWN */}
      {/* <div className="relative">
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded ${
            tool ===  "symbol" ? "bg-red-300" : "bg-gray-100"
          }`}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
      {selectedSymbol ? (
        <div className="flex items-center">
          <span className="ml-1">{selectedSymbol.id}</span>
        </div>
      ) : (
         currentComponent  // built-in resistor/capacitor icons
      )}

          <IoIosArrowDown size={14} />
        </button> */}

        {/* DROPDOWN */}
        {/* {dropdownOpen && (
          <div className="absolute mt-1 left-0 bg-white shadow-lg border rounded z-50"> */}
            {/* Built-in Components */}
            {/* {COMPONENTS.map((comp) => (
              <button
                key={comp.key}
                className="flex gap-2 items-center px-3 py-1 hover:bg-gray-200 w-full text-left"
                onClick={() => {
                  setTool("component");
                  setDropdownOpen(false);
                }}
              >
                {comp.icon}
                {comp.key}
              </button>
            ))} */}

            {/* ⭐ If symbol loaded → show symbol id */}
            {/* {selectedSymbol && selectedSymbolId ? (
              <button
                className="flex gap-2 items-center px-3 py-1 hover:bg-blue-200 w-full text-left"
                onClick={() => {
                  if (!selectedSymbol) return;
                  setSelectedSymbolId(selectedSymbol.id); // string ID
                  setPendingSymbol(selectedSymbol); // full object
                  setTool("symbol");
                  setDropdownOpen(false);
                }}
              >
                📘 Symbol: {selectedSymbol.id}
              </button>

            ): (
                <span>Select Symbol</span>
            )} */}
          {/* </div>
        )} */}

{/*        
      </div> */}
    </div>
  );
}
