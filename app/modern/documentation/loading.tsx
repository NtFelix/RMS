import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentationLoading() {
  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar skeleton */}
          <div className="sticky top-20 h-[calc(100vh-5rem)]">
            <div className="bg-card border border-border rounded-2xl p-6">
              <Skeleton className="h-10 w-full mb-6" />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-3/4" />
                  <div className="ml-4 space-y-2">
                    <Skeleton className="h-6 w-5/6" />
                    <Skeleton className="h-6 w-4/5" />
                    <Skeleton className="h-6 w-3/4" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-8 w-2/3" />
                  <div className="ml-4 space-y-2">
                    <Skeleton className="h-6 w-4/5" />
                    <Skeleton className="h-6 w-5/6" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content skeleton */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}