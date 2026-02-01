"use client";

import dynamic from "next/dynamic";

// Loading component for charts
const ChartSkeleton = () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-[#22272e] rounded-[2rem] border border-gray-200 dark:border-[#3C4251]">
        <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
    </div>
);

export const RevenueExpensesChart = dynamic(
    () => import("@/components/charts/revenue-expenses-chart").then(mod => mod.RevenueExpensesChart),
    { ssr: false, loading: () => <ChartSkeleton /> }
);

export const OccupancyChart = dynamic(
    () => import("@/components/charts/occupancy-chart").then(mod => mod.OccupancyChart),
    { ssr: false, loading: () => <ChartSkeleton /> }
);

export const MaintenanceDonutChart = dynamic(
    () => import("@/components/charts/maintenance-donut-chart").then(mod => mod.MaintenanceDonutChart),
    { ssr: false, loading: () => <ChartSkeleton /> }
);

export const NebenkostenChart = dynamic(
    () => import("@/components/charts/nebenkosten-chart").then(mod => mod.NebenkostenChart),
    { ssr: false, loading: () => <ChartSkeleton /> }
);
