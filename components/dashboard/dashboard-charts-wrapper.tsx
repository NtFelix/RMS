"use client";

import dynamic from "next/dynamic";
import { cva } from "class-variance-authority";

// Loading component for standard charts
const ChartSkeleton = () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-[#22272e] rounded-[2rem] border border-gray-200 dark:border-[#3C4251]">
        <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
    </div>
);

// High-end simulated bar chart skeleton matching Fluctuation card
const TenantFluctuationSkeleton = () => (
    <div className="w-full h-full flex flex-col bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 justify-between animate-pulse">
        {/* Header */}
        <div className="space-y-2 pb-2 shrink-0">
            <div className="h-5 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            <div className="h-3 w-56 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-full" />
        </div>

        {/* Simulated Dual Bar Chart Grid */}
        <div className="flex-1 flex items-end justify-between gap-3 px-2 pt-8 pb-4 min-h-[220px]">
            {[35, 60, 45, 80, 50, 70, 40, 90].map((height, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div className="flex items-end gap-1 w-full h-full">
                        <div 
                            style={{ height: `${height}%` }} 
                            className="w-1/2 bg-zinc-200 dark:bg-zinc-800/80 rounded-t-sm"
                        />
                        <div 
                            style={{ height: `${height * 0.7}%` }} 
                            className="w-1/2 bg-zinc-200/50 dark:bg-zinc-800/40 rounded-t-sm"
                        />
                    </div>
                </div>
            ))}
        </div>

        {/* Simulated Legend */}
        <div className="flex justify-center items-center gap-4 pt-3 border-t border-zinc-200/20 dark:border-zinc-800/20 shrink-0">
            <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            </div>
            <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-full" />
                <div className="h-3 w-12 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-full" />
            </div>
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

export const TenantFluctuationChart = dynamic(
    () => import("@/components/charts/tenant-fluctuation-chart").then(mod => mod.TenantFluctuationChart),
    { ssr: false, loading: () => <TenantFluctuationSkeleton /> }
);
