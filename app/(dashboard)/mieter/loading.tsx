import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Card className="overflow-hidden rounded-xl border border-[#F1F3F3] shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
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
