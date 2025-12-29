import React from 'react';
import type { DRCIssue as PkgDRCIssue, DRCSeverity } from 'trackway-parser-wasm';

function severityKey(s: DRCSeverity | string): 'error' | 'warning' | 'info' {
  const low = String(s ?? '').toLowerCase();
  if (low === 'error') return 'error';
  if (low === 'warning') return 'warning';
  return 'info';
}

export const DRCIssueList: React.FC<{ issues: PkgDRCIssue[] }> = ({ issues }) => {
  if (!issues || issues.length === 0) {
    return <div style={{ color: '#9fb4c9' }}>No issues. Run DRC to analyze the board.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {issues.map((iss) => {
        const key = String(iss.id);
        const sevKey = severityKey(iss.severity);
        return (
          <div key={key} style={issueRowStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ ...severityDot(sevKey), minWidth: 10, height: 10 }} />
              <div style={{ fontWeight: 600 }}>{String(iss.severity).toUpperCase()}</div>
              <div style={{ color: '#bcd6ea', marginLeft: 8 }}>{String(iss.layer ?? '')}</div>
            </div>
            <div style={{ color: '#cfe9ff' }}>{iss.message}</div>
          </div>
        );
      })}
    </div>
  );
};

const issueRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: 12,
  borderRadius: 6,
  background: 'linear-gradient(90deg, rgba(255,255,255,0.01), rgba(255,255,255,0.005))',
};

const severityDot = (s: string): React.CSSProperties => ({
  borderRadius: 6,
  background: s === 'error' ? '#ff6b6b' : s === 'warning' ? '#ffb86b' : '#6bb7ff',
});
