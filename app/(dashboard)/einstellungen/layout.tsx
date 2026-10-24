import { Suspense } from "react";
import type { Metadata } from "next";
import { SettingsLayoutSkeleton } from "@/components/settings/settings-layout-skeleton";
import { privateNoindexMetadata } from "@/lib/seo";
import { SettingsLayoutGate } from "./settings-layout-gate";

export const metadata: Metadata = privateNoindexMetadata;

export default function EinstellungenLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<SettingsLayoutSkeleton />}>
      <SettingsLayoutGate>{children}</SettingsLayoutGate>
    </Suspense>
  );
}
