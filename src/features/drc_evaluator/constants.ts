export const DEFAULT_DRC_CONFIG = {
  minClearance: 6, // mils
  maxOverlaps: 0,
  checkCopperToBoardEdge: true,
  ignoreSmallFeatures: false,
  reportLevel: 'warning', // 'info' | 'warning' | 'error'
} as const;

export const DRC_CATEGORIES = ['error', 'warning', 'info'] as const;
