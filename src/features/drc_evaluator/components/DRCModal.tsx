import React, { useMemo, useState } from 'react';
import { usePcb } from '@/features/pcb_editor/contexts/PcbContext';
import { drcRunFromPcbValue, drcCreateDefaultConfig } from 'trackway-parser-wasm';
import type { DrcConfig, DRCIssue as PkgDRCIssue, DRCCode, DRCSeverity, Xy, Uuid } from 'trackway-parser-wasm';
import { DRC_CATEGORIES } from '../constants';
import { DRCIssueList } from './DRCIssueList';
import { DRCConfigTab } from './DRCConfigTab';

interface DRCModalProps {
  open: boolean;
  onClose: () => void;
}

const chipColor: Record<string, string> = {
  error: '#ff6b6b',
  warning: '#ffb86b',
  info: '#6bb7ff',
};

// No local UI type: we render the package `DRCIssue` directly. Helper to
// normalise severity strings for counting and display.
function severityToKey(s: unknown): 'error' | 'warning' | 'info' {
  const sev = String(s ?? '').toLowerCase();
  if (sev === 'error') return 'error';
  if (sev === 'warning') return 'warning';
  return 'info';
}

function createFallbackDrcConfig(): DrcConfig {
  return {
    clearances: {
      cu2cu: 0.254,
      cu2board_edge: 0.5,
      cu2hole: 0.254,
      min_track_width: 0.2,
      min_via_diameter: 0.6,
      min_pad2pad: 0,
      min_pad2hole: 0,
      min_annular_ring: 0.2,
      min_via_drill: 0.3,
      cu2via: null,
    },
    zone_rules: null,
    net_classes: [],
    advanced_clearance: null,
  } as DrcConfig;
}

export const DRCModal: React.FC<DRCModalProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState<'issues' | 'config'>('issues');
  const [issues, setIssues] = useState<PkgDRCIssue[]>([]);
  const [config, setConfig] = useState<DrcConfig>(() => {
    try {
      const def = drcCreateDefaultConfig() as unknown as DrcConfig | null;
      if (def) return def;
    } catch (e) {}
    return createFallbackDrcConfig();
  });
  const [running, setRunning] = useState(false);
  const { pcb } = usePcb();

  const counts = useMemo(() => {
    const c: Record<'error' | 'warning' | 'info', number> = { error: 0, warning: 0, info: 0 };
    for (const i of issues) {
      const key = severityToKey((i as PkgDRCIssue).severity);
      c[key] = (c[key] || 0) + 1;
    }
    return c;
  }, [issues]);

  const runDRC = async () => {
    setRunning(true);
    try {
      // Prefer running DRC on the current PCB value exposed by the editor context.
      const pcbVal = pcb;
      // The wasm function returns `any` per definitions; cast safely to the package type.
      const pkgIssues = drcRunFromPcbValue(pcbVal, config) as unknown as PkgDRCIssue[] | undefined;
      setIssues(Array.isArray(pkgIssues) ? pkgIssues : []);
    } catch (err) {
      // Construct a minimal shaped issue compatible with the package `DRCIssue`.
      const fallback: PkgDRCIssue = {
        id: (Date.now()).toString() as Uuid,
        code: 'ClearanceViolation' as DRCCode,
        severity: 'Warning' as DRCSeverity,
        message: 'DRC failed: ' + (err instanceof Error ? err.message : String(err)),
        objects: [],
        layer: null,
        point: [0, 0] as unknown as Xy,
        measured: null,
        required: null,
      } as PkgDRCIssue;
      setIssues([fallback]);
    }
    setActiveTab('issues');
    setRunning(false);
  };

  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 style={{ margin: 0 }}>DRC Evaluator</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {DRC_CATEGORIES.map((cat) => (
                <div key={cat} style={{ ...chipBaseStyle, background: chipColor[cat] }}>
                  {cat}: {counts[cat] || 0}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={runDRC} style={primaryBtn} disabled={running}>
              {running ? 'Running…' : 'Run DRC'}
            </button>
            <button onClick={onClose} style={secondaryBtn}>
              Close
            </button>
          </div>
        </div>

        <div style={tabsBar}>
          <button onClick={() => setActiveTab('issues')} style={tabButton(activeTab === 'issues')}>
            Issues
          </button>
          <button onClick={() => setActiveTab('config')} style={tabButton(activeTab === 'config')}>
            Configuration
          </button>
        </div>

        <div style={contentStyle}>
          {activeTab === 'issues' ? (
            <DRCIssueList issues={issues} />
          ) : (
            <DRCConfigTab config={config} onChange={setConfig} />
          )}
        </div>
      </div>
    </div>
  );
};

// Styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
};

const modalStyle: React.CSSProperties = {
  width: 820,
  maxWidth: '95%',
  background: '#0f1724',
  color: '#e6eef8',
  borderRadius: 8,
  boxShadow: '0 8px 30px rgba(2,6,23,0.6)',
  overflow: 'hidden',
  maxHeight: '80vh',
  height: 'auto',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
};

const chipBaseStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 12,
  fontSize: 12,
  color: '#071528',
};

const primaryBtn: React.CSSProperties = {
  background: '#2dd4bf',
  color: '#002322',
  padding: '8px 12px',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
};

const secondaryBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#cfe9ff',
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.05)',
  cursor: 'pointer',
};

const tabsBar: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.03)',
};

const tabButton = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
  color: active ? '#fff' : '#b7c9d9',
  border: 'none',
  padding: '8px 12px',
  borderRadius: 6,
  cursor: 'pointer',
});

const contentStyle: React.CSSProperties = { padding: 16, minHeight: 120, flex: 1, overflowY: 'auto' };
