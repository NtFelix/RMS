import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Instruction Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1,2,3,4].map((idx) => (
          <Card key={idx} className="rounded-2xl">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-48" /> {/* Mimics CardTitle */}
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-2/3" /> {/* Mimics description */}
              <Skeleton className="h-9 w-28" /> {/* Mimics action button */}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Card Structure Skeleton */}
      <Card className="overflow-hidden rounded-2xl shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          {/* Left side: Card Title Skeleton */}
          <Skeleton className="h-6 w-48" /> {/* Mimics CardTitle */}
          {/* Right side: Button Skeleton */}
          <Skeleton className="h-10 w-60 sm:w-[280px]" /> {/* Mimics Button "Betriebskostenabrechnung erstellen" */}
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Filters Skeleton */}
          <div className="flex flex-col sm:flex-row gap-4 mb-2"> {/* Adjusted mb from 6 to 2 to match original page better */}
            <Skeleton className="h-10 flex-grow" /> {/* Mimics search input */}
            <Skeleton className="h-10 w-full sm:w-48" /> {/* Mimics a select filter */}
            <Skeleton className="h-10 w-full sm:w-48" /> {/* Mimics another select filter */}
          </div>

          {/* Table Skeleton */}
          <div className="rounded-md border">
            {/* Table Header Skeleton */}
            <Skeleton className="h-12 w-full" />
            {/* Table Body Skeletons (Rows) */}
            <div className="p-4 space-y-2"> {/* Added padding and spacing for rows if table rows have it */}
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
