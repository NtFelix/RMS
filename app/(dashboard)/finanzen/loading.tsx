import { Skeleton } from "@/components/ui/skeleton";

export default function FinanzenLoading() {
  return (
    <div className="flex flex-col gap-8 p-4 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-72 mt-2" />
        </div>
        <Skeleton className="h-10 w-48 sm:w-auto" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>

      <div>
        <Skeleton className="h-80 w-full" />
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-5 w-60" />
        </div>
        <div className="rounded-md border">
            <Skeleton className="h-12 w-full rounded-t-md" />
            {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="border-t p-4">
                    <Skeleton className="h-5 w-full" />
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
