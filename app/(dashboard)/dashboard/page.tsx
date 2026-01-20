import type { Metadata } from 'next';
import { getDashboardSummary, getNebenkostenChartData } from "@/lib/data-fetching";
import DashboardClient from "./dashboard-client";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Prevent this private dashboard page from being indexed by search engines
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      noimageindex: true,
    },
  },
};

export default async function Dashboard() {
  // Fetch real data from database
  const [summary, nebenkostenData] = await Promise.all([
    getDashboardSummary(),
    getNebenkostenChartData()
  ]);

  const { data: nebenkostenChartData, year: nebenkostenYear } = nebenkostenData;

  return (
    <DashboardClient
      summary={summary}
      nebenkostenData={{
        nebenkostenChartData,
        nebenkostenYear
      }}
    />
  );
}
