import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { privateNoindexMetadata } from "@/lib/seo";
import { SettingsLayoutGate } from "./settings-layout-gate";

export const metadata: Metadata = privateNoindexMetadata;

// Static fallback: no data, no nav entries (those depend on permissions).
// Keep the outer container classes in sync with SettingsLayoutClient; the sidebar width and the
// skeleton heights are approximations, so adjust them there if the real layout changes.
function SettingsLayoutFallback() {
  return (
    <div className="flex h-full gap-3 p-4">
      <div className="w-56 shrink-0 space-y-3 rounded-2xl border border-border/50 p-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-6 w-3/4" />
      </div>
      <div className="flex-1 overflow-y-auto min-w-0 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    </div>
  );
}

export default function EinstellungenLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<SettingsLayoutFallback />}>
      <SettingsLayoutGate>{children}</SettingsLayoutGate>
    </Suspense>
  );
}
