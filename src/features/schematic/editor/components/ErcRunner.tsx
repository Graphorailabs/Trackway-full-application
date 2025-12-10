import { useState, useImperativeHandle, forwardRef } from "react";
import { useKicadSchSafe } from "../context/KicadSchContext";

export type ErcRunnerHandle = {
  run: () => void;
};

const ErcRunner = forwardRef<ErcRunnerHandle>((_, ref) => {
  const ctx = useKicadSchSafe();
  const runErc = ctx?.runErc;
  const [issues, setIssues] = useState<any[] | null>(null);
  const [running, setRunning] = useState(false);

  type ErcIssue = {
    id: string;
    severity: string;
    message: string;
    refs: string[];
  };

  type RunErcResult = ErcIssue[] | { issues: ErcIssue[] };

  const run = () => {
    if (!runErc) {
      setIssues([{ id: "no-provider", severity: "ERROR", message: "KicadSchProvider not found", refs: [] }]);
      return;
    }

    setRunning(true);
    try {
      const res = runErc() as RunErcResult;
      const list = Array.isArray(res) ? res : res?.issues ?? [];
      setIssues(list);
      console.log("ErcRunner: issues", list);
    } catch (err) {
      console.error("ErcRunner error", err);
      setIssues([{ id: "internal-error", severity: "ERROR", message: String(err), refs: [] }]);
    } finally {
      setRunning(false);
    }
  };

  useImperativeHandle(ref, () => ({ run }));

  return (
    <div className="flex flex-col h-full">
      {/* <div className="flex gap-2 mb-3">
        <button
          onClick={run}
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          disabled={running}
        >
          {running ? "Running…" : "Run ERC"}
        </button>
        <button
          onClick={() => setIssues(null)}
          className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-500"
        >
          Clear
        </button>
      </div> */}

      <div className="flex-1 overflow-auto bg-[#0b0b0b] p-2 rounded">
        {!issues || issues.length === 0 ? (
          <div className="text-sm text-gray-400">No ERC issues — run the checker to populate results.</div>
        ) : (
          <ul className="space-y-2 text-sm">
            {issues.map((iss: any) => (
              <li key={iss.id} className="p-2 rounded border border-gray-800 bg-[#0f0f0f]">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="mr-2">{iss.severity}</strong>
                    <span className="text-gray-200">{iss.message}</span>
                  </div>
                  <div className="text-xs text-gray-400">{iss.id}</div>
                </div>
                {iss.refs && iss.refs.length > 0 && (
                  <div className="mt-2 text-xs text-gray-400">Refs: {iss.refs.join(", ")}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});

export default ErcRunner;

  
// export const ErcRunner = () => {
 
 
//     return (
//        <>
//          <div>
//              erc logs here
//          </div>
//        </>
//     );

// }