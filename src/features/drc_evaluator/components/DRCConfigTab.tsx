import React, { useState, useMemo } from 'react';
import { usePcb } from '@/features/pcb_editor/contexts/PcbContext';
import type { DrcConfig, ClearanceConfig, ZoneRules, NetClass, Net } from 'trackway-parser-wasm';

export const DRCConfigTab: React.FC<{
  config: DrcConfig;
  onChange: (c: DrcConfig) => void;
}> = ({ config, onChange }) => {
  const update = (patch: Partial<DrcConfig>) => onChange({ ...config, ...patch } as DrcConfig);

  // Zone rules editor helpers
  const updateZone = (patch: Partial<ZoneRules>) => {
    update({ zone_rules: { ...(config.zone_rules ?? defaultZone()), ...patch } });
  };

  function defaultZone(): ZoneRules {
    return {
      zone_clearance: null,
      min_island_area: 0,
      thermal_relief_gap: 0.254,
      thermal_spoke_width: 0.254,
      thermal_spoke_count: 4,
    } as ZoneRules;
  }

  // Net classes editor
  const { pcb } = usePcb();

  const nets: Net[] = (pcb?.nets ?? []) as Net[];

  const existingOrdinals = new Set((config.net_classes ?? []).map((n) => n.ordinal));

  const availableNets = useMemo(() => nets.filter((n) => !existingOrdinals.has(n.ordinal)), [nets, existingOrdinals]);

  const [selectedAddOrdinal, setSelectedAddOrdinal] = useState<number | ''>('');

  const addNetClass = () => {
    if (selectedAddOrdinal === '') return;
    const next: NetClass = { ordinal: Number(selectedAddOrdinal), clearance_override: null, track_width_override: null, via_diameter_override: null, via_drill_override: null } as NetClass;
    update({ net_classes: [...(config.net_classes ?? []), next] });
    setSelectedAddOrdinal('');
  };

  const updateNetClass = (idx: number, patch: Partial<NetClass>) => {
    const arr = [...(config.net_classes ?? [])];
    arr[idx] = { ...(arr[idx] ?? {}), ...patch } as NetClass;
    update({ net_classes: arr });
  };

  const removeNetClass = (idx: number) => {
    const arr = [...(config.net_classes ?? [])];
    arr.splice(idx, 1);
    update({ net_classes: arr });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#cfe9ff' }}>Clearance / Baseline</h4>
          <label style={labelStyle}>
            cu2cu (mm)
            <input
              type="number"
              value={config.clearances.cu2cu}
              onChange={(e) => update({ clearances: { ...(config.clearances ?? {} as ClearanceConfig), cu2cu: Number(e.target.value) } })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            cu2board_edge (mm)
            <input
              type="number"
              value={config.clearances.cu2board_edge}
              onChange={(e) => update({ clearances: { ...(config.clearances ?? {} as ClearanceConfig), cu2board_edge: Number(e.target.value) } })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            min_track_width (mm)
            <input
              type="number"
              value={config.clearances.min_track_width}
              onChange={(e) => update({ clearances: { ...(config.clearances ?? {} as ClearanceConfig), min_track_width: Number(e.target.value) } })}
              style={inputStyle}
            />
          </label>
        </div>

        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#cfe9ff' }}>Zone Rules</h4>
          <label style={labelStyle}>
            zone_clearance (mm)
            <input
              type="number"
              value={config.zone_rules?.zone_clearance ?? ''}
              onChange={(e) => updateZone({ zone_clearance: e.target.value === '' ? null : Number(e.target.value) })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            min_island_area (mm^2)
            <input
              type="number"
              value={config.zone_rules?.min_island_area ?? 0}
              onChange={(e) => updateZone({ min_island_area: Number(e.target.value) })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            thermal_relief_gap (mm)
            <input
              type="number"
              value={config.zone_rules?.thermal_relief_gap ?? 0}
              onChange={(e) => updateZone({ thermal_relief_gap: Number(e.target.value) })}
              style={inputStyle}
            />
          </label>
        </div>
      </div>

      <div>
        <h4 style={{ margin: '0 0 8px 0', color: '#cfe9ff' }}>Net Classes</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(config.net_classes ?? []).map((nc, idx) => {
            const netName = nets.find((n) => n.ordinal === nc.ordinal)?.name ?? '';
            return (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ minWidth: 140 }}>
                  <strong>{nc.ordinal}</strong>{netName ? ` — ${netName}` : ''}
                </div>
                <input type="number" placeholder="clearance_override" value={nc.clearance_override ?? ''} onChange={(e) => updateNetClass(idx, { clearance_override: e.target.value === '' ? null : Number(e.target.value) })} style={inputStyle} />
                <input type="number" placeholder="track_width_override" value={nc.track_width_override ?? ''} onChange={(e) => updateNetClass(idx, { track_width_override: e.target.value === '' ? null : Number(e.target.value) })} style={inputStyle} />
                <button onClick={() => removeNetClass(idx)} style={secondaryBtn}>Remove</button>
              </div>
            );
          })}
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={selectedAddOrdinal} onChange={(e) => setSelectedAddOrdinal(e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle}>
              <option value="">Select net to add</option>
              {availableNets.map((n) => (
                <option key={n.ordinal} value={n.ordinal}>{n.ordinal} — {n.name}</option>
              ))}
            </select>
            <button onClick={addNetClass} style={saveBtn} disabled={selectedAddOrdinal === ''}>Add Net Class</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button onClick={() => onChange({ ...config })} style={saveBtn}>
          Apply
        </button>
        <button
          onClick={() => onChange(drcDefaults())}
          style={secondaryBtn}
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, color: '#cfe9ff' };
// labelStyleRow intentionally removed — not used in current layout
const inputStyle: React.CSSProperties = { padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', color: '#dff2ff' };
const saveBtn: React.CSSProperties = { background: '#2dd4bf', color: '#002322', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' };
const secondaryBtn: React.CSSProperties = { background: 'transparent', color: '#cfe9ff', border: '1px solid rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: 6 };

// Helper to lazily import defaults from the wasm package so this file can be
// used even if the wasm module fails to initialize during dev.
function drcDefaults(): DrcConfig {
  try {
    // dynamic require to avoid bundler tree-shaking issues in some setups
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('trackway-parser-wasm');
    if (pkg && typeof pkg.drcCreateDefaultConfig === 'function') return pkg.drcCreateDefaultConfig() as unknown as DrcConfig;
  } catch (e) {}
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
