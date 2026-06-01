/**
 * Global chart color palette shared across all dashboards and chart components.
 * 
 * Order is optimized so the first 4 colors match the primary dashboard chart:
 * 1. Emerald (Green) - Positive/Primary
 * 2. Amber (Orange/Yellow) - Neutral/Warning
 * 3. Indigo (Purple/Blue) - Secondary
 * 4. Rose (Red) - Negative/Critical
 * 
 * Subsequent colors are chosen for high contrast and visual harmony to support 
 * charts with up to 8 distinct data points.
 */
export const GLOBAL_CHART_COLORS = [
  "#059669", // Emerald 600
  "#d97706", // Amber 600
  "#4f46e5", // Indigo 600
  "#e11d48", // Rose 600
  "#0284c7", // Sky 600
  "#7c3aed", // Violet 600
  "#db2777", // Pink 600
  "#0891b2", // Cyan 600
] as const;

export type ChartColor = typeof GLOBAL_CHART_COLORS[number];
