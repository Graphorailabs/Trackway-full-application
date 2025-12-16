import { useState, useImperativeHandle, forwardRef } from "react";
import { useKicadSchSafe } from "../context/KicadSchContext";
import type { ErcIssue } from "pkg/trackway_parser_wasm";

export type ErcRunnerHandle = {
  run: () => void;
};

export interface ErcRunnerProps {
  onIssuesChange?: (issues: any[] | null) => void;
}

const ErcRunner = forwardRef<ErcRunnerHandle, ErcRunnerProps>(({ onIssuesChange }, ref) => {
  const ctx = useKicadSchSafe();
  const runErc = ctx?.runErc;
  const [issues, setIssues] = useState<any[] | null>(null);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // type ErcIssue = {
  //   id: string;
  //   severity: string;
  //   message: string;
  //   refs: string[];
  // };

  type RunErcResult = ErcIssue[] | { issues: ErcIssue[] };

  const run = () => {
    if (!runErc) {
      const noProv = [{ id: "no-provider", severity: "ERROR", message: "KicadSchProvider not found", refs: [] }];
      setIssues(noProv);
      onIssuesChange?.(noProv);
      return;
    }



    setRunning(true);
    try {
      const res = runErc() as unknown as RunErcResult;
      const list = Array.isArray(res) ? res : res?.issues ?? [];
      setIssues(list);
      onIssuesChange?.(list);
      console.log("ErcRunner: issues", list);
    } catch (err) {
      console.error("ErcRunner error", err);
      const errList = [{ id: "internal-error", severity: "ERROR", message: String(err), refs: [] }];
      setIssues(errList);
      onIssuesChange?.(errList);
    } finally {
      setRunning(false);
    }
  };

  useImperativeHandle(ref, () => ({ run }));

  return (
    <div className="flex flex-col w-full h-full">
      {running && <div className="text-xs text-gray-400 mb-2">Running…</div>}
      <div className="flex-1 overflow-auto bg-[#0b0b0b] p-2 rounded">
        {!issues || issues.length === 0 ? (
          <div className="text-sm text-gray-400">No ERC issues — run the checker to populate results.</div>
        ) : (
          <div className="space-y-2 text-sm">
            {issues.map((iss: any, idx: number) => {
              const key = iss.id ?? `${idx}-${iss.code ?? iss.message}`;
              const isOpen = !!expanded[key];
              const sev = (iss.severity || "ERROR").toString();
              const prefix = sev === "ERROR" ? "Error:" : sev === "WARNING" ? "Warning:" : "Error:";

              return (
                <div key={key} className="p-2 rounded border border-gray-800 bg-[#0f0f0f]">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpanded((s) => ({ ...s, [key]: !s[key] }))}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-200">{prefix} { iss.message}</div>
                        </div>
                        <div className="text-xs text-green-400">{iss.net_name ?? iss.net_id ?? iss.code ?? ''}</div>
                      </div>
                    </button>
                    <div className="text-sm text-green-400">{isOpen ? "▾" : "▸"}</div>
                  </div>

                  {isOpen && (
                    <div className="mt-2 pl-3 text-sm text-gray-200">
                      {/* show pin lines if available */}
                        {iss.pins && iss.pins.length > 0 ? (
                        iss.pins.map((p: any, i: number) => (
                          <div key={p.id ?? i} className="mb-1">
                            {/* prefer the enriched pin_name and human_type injected by KicadSchContext */}
                            <div className="text-sm ">
                              {`Symbol ${p.ref ?? p.ref_id ?? ''} Pin ${p.pin_number ?? p.number ?? ''} [`}
                              {p.pin_name ?? p.pinName ?? ''}
                              {p.human_type || p.humanType ? `, ${p.human_type ?? p.humanType}` : ''}
                              {p.raw_type ? `, ${p.raw_type}` : ''}
                              {p.is_power_flag ? `, Power input` : ''}
                              {p.has_no_connect_flag ? `, NC` : ''}
                              {`]`}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-400">{iss.message}</div>
                      )}

                      {/* location hints */}
                      {/* {iss.location_hints && iss.location_hints.length > 0 && (
                        <div className="mt-2 text-xs text-gray-400">
                          {iss.location_hints.map((lh: any, i: number) => (
                            <div key={i}>{lh.sheet ?? ''} @ {lh.x},{lh.y}</div>
                          ))}
                        </div>
                      )} */}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

export default ErcRunner;

  
