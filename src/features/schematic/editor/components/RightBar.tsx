
import { useSymbol } from "../context/SymbolContext";
import { useWires } from "../context/WireContext";
import { useTool } from "../context/ToolContext";

// Simple minimalistic icons
const SymbolMiniIcon = ({ colorBg = 'bg-green-500', colorBorder = 'border-green-900' }: any) => (
  <span className={`inline-block w-3 h-3 rounded-sm mr-1 ${colorBg} ${colorBorder}`} />
);
const WireMiniIcon = ({ colorBg = 'bg-blue-500', colorBorder = 'border-blue-900' }: any) => (
  <span className={`inline-block w-3 h-3 rounded-full mr-1 ${colorBg} ${colorBorder}`} />
);

export default function RightBar() {
  const { placedSymbols = [], setSelectedSymbol, removePlacedSymbol } = useSymbol();
  const { wires = [], setWires } = useWires();
  const { tool } = useTool();

  const isWireMode = tool === 'wire';
  

  const removeWire = (id: string) => {
    setWires((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <aside className="h-screen w-full bg-[#181f2a] border-l-4 border-green-500 flex flex-col gap-6 p-3 shadow-inner">
      {/* Symbols */}
      <section>
        <div className="flex items-center gap-2 mb-2 text-green-400 font-bold tracking-wide text-sm uppercase">
          <span className="w-2 h-5 bg-green-500 rounded-sm mr-1" />
          Symbols <span className="ml-1 text-xs text-green-200">({placedSymbols.length})</span>
        </div>
        <div className="flex flex-col gap-2">
          {placedSymbols.length === 0 && <div className="text-xs text-gray-500 italic">No symbols placed</div>}
          {placedSymbols.map((s: any) => (
            <div
              key={s.id}
              className={`flex items-center gap-2 px-2 py-1 rounded bg-[#232c3b] shadow group hover:bg-[#263040] transition border-l-4 ${isWireMode ? 'border-cyan-400' : 'border-green-500'}`}>
              <SymbolMiniIcon colorBg={isWireMode ? 'bg-cyan-500' : 'bg-green-500'} colorBorder={isWireMode ? 'border-cyan-900' : 'border-green-900'} />
              <div className="min-w-0 flex-1">
                <div className={`truncate font-semibold text-xs ${isWireMode ? 'text-cyan-200' : 'text-green-200'}`}>{s.symbolId ?? s.id}</div>
                <div className={`text-[10px] ${isWireMode ? 'text-cyan-300' : 'text-green-300'}`}>x: {Math.round((s.position?.x ?? 0) * 100) / 100}, y: {Math.round((s.position?.y ?? 0) * 100) / 100}</div>
                <div className={`text-[10px] ${isWireMode ? 'text-cyan-300' : 'text-green-300'}`}>pins: {(s.pins || []).length}</div>
              </div>
              <div className="flex flex-col gap-1 ml-2">
                <button
                  className="text-[10px] px-2 py-0.5 rounded bg-green-900 text-green-200 border border-green-700 hover:bg-green-500 hover:text-[#181f2a] transition"
                  onClick={() => setSelectedSymbol && setSelectedSymbol(s)}
                  title="Select symbol"
                >
                  Select
                </button>
                <button
                  className="text-[10px] px-2 py-0.5 rounded bg-green-900 text-red-300 border border-red-700 hover:bg-red-500 hover:text-[#181f2a] transition"
                  onClick={() => removePlacedSymbol && removePlacedSymbol(s.id)}
                  title="Remove symbol"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Save button
      <div className="px-2">
        <button
          className="w-full text-sm px-3 py-2 rounded bg-indigo-700 text-white hover:bg-indigo-500 transition"
          onClick={() => void saveSchematic()}
          title="Save schematic into current project"
          disabled={isSaving}
        >
          {isSaving ? "Saving…" : "Save Schematic"}
        </button>
        {saveError && <div className="text-xs text-red-400 mt-1">{saveError}</div>}
      </div> */}

      {/* Wires */}
      <section>
        <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold tracking-wide text-sm uppercase">
          <span className="w-2 h-5 bg-blue-500 rounded-sm mr-1" />
          Wires <span className="ml-1 text-xs text-blue-200">({wires.length})</span>
        </div>
        <div className="flex flex-col gap-2">
          {wires.length === 0 && <div className="text-xs text-gray-500 italic">No wires</div>}
          {wires.map((w: any) => (
            <div key={w.id} className={`flex items-center gap-2 px-2 py-1 rounded bg-[#232c3b] shadow group hover:bg-[#263040] transition border-l-4 ${isWireMode ? 'border-cyan-400' : 'border-blue-500'}`}>
              <WireMiniIcon colorBg={isWireMode ? 'bg-cyan-500' : 'bg-blue-500'} colorBorder={isWireMode ? 'border-cyan-900' : 'border-blue-900'} />
              <div className="min-w-0 flex-1">
                <div className={`truncate font-semibold text-xs ${isWireMode ? 'text-cyan-200' : 'text-blue-200'}`}>Wire {w.id}</div>
                <div className={`text-[10px] ${isWireMode ? 'text-cyan-300' : 'text-blue-300'}`}>points: {(w.points || []).length}</div>
                <div className={`text-[10px] ${isWireMode ? 'text-cyan-300' : 'text-blue-300'}`}>pins: {(w.points || []).filter((p: any) => p.pinId).length}</div>
              </div>
              <div className="flex flex-col gap-1 ml-2">
                <button
                  className="text-[10px] px-2 py-0.5 rounded bg-blue-900 text-red-300 border border-red-700 hover:bg-red-500 hover:text-[#181f2a] transition"
                  onClick={() => removeWire(w.id)}
                  title="Remove wire"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
