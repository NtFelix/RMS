import { SettingsSectionSkeleton } from "@/components/settings/section-skeletons";

// Loading state of a settings page that awaits request data before it can render its own Suspense
// boundary (e.g. API-Keys, MCP-Server). Without this file those pages inherit the dashboard home skeleton.
export default function EinstellungenLoading() {
  return <SettingsSectionSkeleton />;
}
