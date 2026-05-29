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
  "#34d399", // Emerald
  "#f59e42", // Amber
  "#818cf8", // Indigo
  "#f87171", // Rose
  "#60a5fa", // Sky Blue
  "#a78bfa", // Violet/Purple
  "#f472b6", // Pink
  "#38bdf8", // Light Cyan
] as const;

export type ChartColor = typeof GLOBAL_CHART_COLORS[number];
