import { useState, useRef, useEffect, type ReactNode } from "react";
import { FcElectricalSensor } from "react-icons/fc";
// import ErcRunner from "./ErcRunner";
import  ErcRunner, { type  ErcRunnerHandle }  from "./ErcRunner";

interface ErcCheckerProps {
  children?: ReactNode;
  onClose?: () => void;
}

export const ErcChecker = ({ children, onClose }: ErcCheckerProps) => {
  const [isOpen, setIsOpen] = useState(false);
const modalRef = useRef<HTMLDivElement | null>(null);
const runnerRef = useRef<ErcRunnerHandle | null>(null);
const [errorCount, setErrorCount] = useState<number>(0);
  const [warnCount, setWarnCount] = useState<number>(0);

  const handleIssuesChange = (issues: any[] | null) => {
    if (!issues || issues.length === 0) {
      setErrorCount(0);
      setWarnCount(0);
      return;
    }
    let e = 0;
    let w = 0;
    for (const iss of issues) {
      const sev = (iss.severity || "ERROR").toString();
      if (sev === "ERROR") e++;
      else if (sev === "WARNING") w++;
    }
    setErrorCount(e);
    setWarnCount(w);
  };

  // null => centered. otherwise fixed position {x,y}
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{ dragging: boolean; offsetX: number; offsetY: number }>({ dragging: false, offsetX: 0, offsetY: 0 });

  // handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // open button
  const open = () => setIsOpen(true);

  // close helper
  const close = () => {
    setIsOpen(false);
    onClose?.();
  };


  return (
    <>
      <button
        onClick={open}
        className="bg-white text-black font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-gray-300 transition"
        title="Run ERC"
      >
        <FcElectricalSensor />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-transparent flex items-center justify-center z-50"
          onClick={() => close()}
        >
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            style={
              pos
                ? { position: "fixed", left: pos.x, top: pos.y, transform: "none" }
                : { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }
            }
            className="bg-[#0E0E0E] w-[80%] max-w-4xl h-[70vh] rounded-xl shadow-2xl flex flex-col border border-gray-700 overflow-hidden"
          >
            {/* Header: pointer down here starts drag */}
            <div
              className="flex items-center bg-black/60 justify-between border-b border-gray-700 p-3 cursor-move select-none"
              onPointerDown={(e) => {
                const modal = modalRef.current;
                if (!modal) return;
                e.preventDefault();

                // get current rect
                const rect = modal.getBoundingClientRect();
                dragState.current.dragging = true;
                dragState.current.offsetX = e.clientX - rect.left;
                dragState.current.offsetY = e.clientY - rect.top;

                // ensure explicit pos is set (switch from centered to left/top)
                setPos({ x: rect.left, y: rect.top });

                const onMove = (ev: PointerEvent) => {
                  if (!dragState.current.dragging) return;
                  setPos({ x: ev.clientX - dragState.current.offsetX, y: ev.clientY - dragState.current.offsetY });
                };

                const onUp = () => {
                  dragState.current.dragging = false;
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);
                };

                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp);
              }}
            >
              <h3 className="text-sm font-semibold text-gray-200">ERC Checker</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => close()}
                  className="justify-end text-gray-300 hover:text-white p-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 p-4 overflow-auto bg-[#0b0b0b] text-gray-200">
              {children ?? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                 <ErcRunner ref={runnerRef} onIssuesChange={handleIssuesChange} />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-3 border-t border-gray-700">
             <div className="flex items-center gap-3">
               <div className="flex items-center gap-3 mr-4">
                 <div className="text-sm text-gray-200">Show:</div>
                 <div className="flex items-center gap-2 px-2 py-1 bg-[#121212] rounded">
                   <label className="text-xs text-gray-300">All</label>
                 </div>
                 <div className="flex items-center gap-2 px-2 py-1 bg-[#3b2d2d] rounded">
                   <span className="text-xs text-red-400">Errors</span>
                   <span className="ml-1 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{errorCount}</span>
                 </div>
                 <div className="flex items-center gap-2 px-2 py-1 bg-[#2d3b2d] rounded">
                   <span className="text-xs text-amber-300">Warnings</span>
                   <span className="ml-1 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{warnCount}</span>
                 </div>
               </div>

               <button onClick={() => {
                 // call the runner's run() if available
                //  runnerRef.current?.run();
               }}
               className="bg-green-600 rounded px-4 py-1 text-white hover:bg-gray-500">
                 Run ERC
               </button>
             </div>
              <button onClick={() => close()} className="bg-gray-600 rounded px-4 py-1 text-white hover:bg-gray-500">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
