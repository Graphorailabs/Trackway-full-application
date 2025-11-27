
import { useSymbol } from "../context/SymbolContext";
import { useWires } from "../context/WireContext";

// Simple minimalistic icons
const SymbolMiniIcon = () => (
  <span className="inline-block w-3 h-3 rounded-sm bg-green-500 mr-1 border border-green-900" />
);
const WireMiniIcon = () => (
  <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1 border border-blue-900" />
);

export default function RightBar() {
  const { placedSymbols = [], setSelectedSymbol, removePlacedSymbol } = useSymbol();
  const { wires = [], setWires } = useWires();

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
              className="flex items-center gap-2 px-2 py-1 rounded bg-[#232c3b] border-l-4 border-green-500 shadow group hover:bg-[#263040] transition"
            >
              <SymbolMiniIcon />
              <div className="min-w-0 flex-1">
                <div className="truncate text-green-200 font-semibold text-xs">{s.symbolId ?? s.id}</div>
                <div className="text-[10px] text-green-300">x: {Math.round((s.position?.x ?? 0) * 100) / 100}, y: {Math.round((s.position?.y ?? 0) * 100) / 100}</div>
                <div className="text-[10px] text-green-300">pins: {(s.pins || []).length}</div>
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

      {/* Wires */}
      <section>
        <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold tracking-wide text-sm uppercase">
          <span className="w-2 h-5 bg-blue-500 rounded-sm mr-1" />
          Wires <span className="ml-1 text-xs text-blue-200">({wires.length})</span>
        </div>
        <div className="flex flex-col gap-2">
          {wires.length === 0 && <div className="text-xs text-gray-500 italic">No wires</div>}
          {wires.map((w: any) => (
            <div key={w.id} className="flex items-center gap-2 px-2 py-1 rounded bg-[#232c3b] border-l-4 border-blue-500 shadow group hover:bg-[#263040] transition">
              <WireMiniIcon />
              <div className="min-w-0 flex-1">
                <div className="truncate text-blue-200 font-semibold text-xs">Wire {w.id}</div>
                <div className="text-[10px] text-blue-300">points: {(w.points || []).length}</div>
                <div className="text-[10px] text-blue-300">pins: {(w.points || []).filter((p: any) => p.pinId).length}</div>
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
