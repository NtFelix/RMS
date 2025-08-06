import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SummaryCardSkeleton } from "@/components/summary-card-skeleton";
import { Home, Key, Euro, Ruler } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCardSkeleton title="Wohnungen gesamt" icon={<Home className="h-4 w-4 text-muted-foreground" />} />
        <SummaryCardSkeleton title="Frei / Vermietet" icon={<Key className="h-4 w-4 text-muted-foreground" />} />
        <SummaryCardSkeleton title="Ø Miete" icon={<Euro className="h-4 w-4 text-muted-foreground" />} />
        <SummaryCardSkeleton title="Ø Preis pro m²" icon={<Ruler className="h-4 w-4 text-muted-foreground" />} />
      </div>
      <Card className="overflow-hidden rounded-xl shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Loading skeletons for list items */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
