import { createElement } from 'react';
import type { ReactNode } from 'react';

import type { ToolItemDescriptor } from './components/toolbat';
import type { DashboardProjectSummary } from '@/types/project';

const iconBase = 'h-5 w-5 text-sky-500';

const createIcon = (paths: string[]): ReactNode =>
  createElement(
    'svg',
    {
      className: iconBase,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.5,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
  'aria-hidden': true,
    },
    paths.map((d, index) =>
      createElement('path', {
        key: `${d}-${index}`,
        d,
      }),
    ),
  );

export interface DashboardEditorSummary {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  route: string;
}

export const DASHBOARD_TOOL_ITEMS: ToolItemDescriptor[] = [
  {
    id: 'new-project',
    label: 'New Project',
    hint: 'Create a brand-new KiCad-style project',
    shortcut: 'Ctrl+N',
    icon: createIcon(['M5 5h6l3 3h5v11H5z', 'M9 13h6', 'M12 10v6']),
  },
  {
    id: 'import-project',
    label: 'Import Project',
    hint: 'Bring an external project into Trackway',
    shortcut: 'Ctrl+I',
    icon: createIcon(['M12 3v12', 'M8 11l4 4 4-4', 'M5 19h14']),
  },
  {
    id: 'export-project',
    label: 'Export Project',
    hint: 'Manage all your projects in one place',
    shortcut: 'Ctrl+E',
    icon: createIcon(['M12 21V9', 'M16 13l-4-4-4 4', 'M5 5h14']),
  },
];

export const DASHBOARD_SAMPLE_PROJECTS: DashboardProjectSummary[] = [
  {
    id: 'project-neo-micro',
    name: 'Neo Microcontroller',
    description: 'Mixed-signal control board for next-gen robotics actuator system.',
    updatedAt: '2025-10-11',
  },
  {
    id: 'project-orbit-sat',
    name: 'OrbitSat Beacon',
    description: 'Compact satellite beacon with combined RF front-end and MCU core.',
    updatedAt: '2025-09-28',
  },
  {
    id: 'project-hydra-psu',
    name: 'Hydra PSU Module',
    description: 'High-efficiency modular power supply for instrumentation racks.',
    updatedAt: '2025-09-15',
  },
];

export const DASHBOARD_EDITOR_CARDS: DashboardEditorSummary[] = [
  {
    id: 'schematic-editor',
    title: 'Schematic Editor',
    description: 'Design and annotate circuitry with hierarchical sheet support.',
    icon: createIcon(['M6 9l6-6 6 6', 'M6 15l6-6 6 6', 'M6 21l6-6 6 6']),
    route: 'schematic',
  },
  {
    id: 'pcb-editor',
    title: 'PCB Editor',
    description: 'Route multi-layer boards with differential pairs and constraints.',
    icon: createIcon(['M5 5h14v14H5z', 'M9 9h6v6H9z', 'M5 12h4', 'M15 12h4']),
    route: 'pcb-editor',
  },
  {
    id: 'gerber-viewer',
    title: 'Gerber Viewer',
    description: 'Inspect fabrication outputs across copper, mask, and drill layers.',
    icon: createIcon(['M4 12h16', 'M12 4v16', 'M8 8l8 8', 'M8 16l8-8']),
    route: 'gerber',
  },
];
