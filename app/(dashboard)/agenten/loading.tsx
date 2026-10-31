import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the agents overview (AgentList): header with the "Neuer Agent" button, search field and the
// three placeholder cards AgentList itself shows while loading. The page awaits authentication and a
// feature-flag check first, so without this file it inherits the dashboard home skeleton.
export default function AgentenLoading() {
  return (
    <div className="p-8" role="status" aria-busy="true" aria-label="Wird geladen">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-5 w-full max-w-md" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 border rounded-lg animate-pulse bg-muted/40" />
          ))}
        </div>
      </div>
    </div>
  );
}
