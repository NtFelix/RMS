"use client";

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load recharts components to reduce initial bundle size
// Recharts adds ~300-400kB to the bundle

const ChartLoadingFallback = () => (
    <div className="w-full h-full min-h-[200px] flex items-center justify-center">
        <Skeleton className="w-full h-full rounded-lg" />
    </div>
);

// Export lazy-loaded recharts components
export const LazyBarChart = dynamic(
    () => import('recharts').then((mod) => mod.BarChart),
    {
        ssr: false,
        loading: ChartLoadingFallback
    }
);

export const LazyLineChart = dynamic(
    () => import('recharts').then((mod) => mod.LineChart),
    {
        ssr: false,
        loading: ChartLoadingFallback
    }
);

export const LazyPieChart = dynamic(
    () => import('recharts').then((mod) => mod.PieChart),
    {
        ssr: false,
        loading: ChartLoadingFallback
    }
);

export const LazyResponsiveContainer = dynamic(
    () => import('recharts').then((mod) => mod.ResponsiveContainer),
    { ssr: false }
);

// Re-export commonly used components via dynamic imports
export const LazyAreaChart = dynamic(
    () => import('recharts').then((mod) => mod.AreaChart),
    {
        ssr: false,
        loading: ChartLoadingFallback
    }
);

// For static elements that don't need lazy loading, export directly from recharts
// These are lightweight and can be imported directly
export {
    Bar,
    Line,
    Area,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
