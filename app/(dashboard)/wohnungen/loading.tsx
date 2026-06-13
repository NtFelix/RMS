import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Home, Key, Euro, Ruler } from "lucide-react"
import { PageSkeleton } from "@/components/skeletons/page-skeleton"

function WohnungenStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Wohnungen gesamt</CardTitle>
          <div className="p-2 bg-muted rounded-lg">
            <Home className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
        </CardContent>
      </Card>
      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Frei / Vermietet</CardTitle>
          <div className="p-2 bg-muted rounded-lg">
            <Key className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
        </CardContent>
      </Card>
      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Ø Miete</CardTitle>
          <div className="p-2 bg-muted rounded-lg">
            <Euro className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
        </CardContent>
      </Card>
      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Ø Preis pro m²</CardTitle>
          <div className="p-2 bg-muted rounded-lg">
            <Ruler className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function Loading() {
  return (
    <PageSkeleton
      tabCount={2}
      buttonWidth="w-48"
    >
      <WohnungenStats />
    </PageSkeleton>
  )
}
