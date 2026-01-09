import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Home, Key, Euro, Ruler } from "lucide-react"
import { PageSkeleton } from "@/components/skeletons/page-skeleton"

export default function Loading() {
  return (
    <PageSkeleton
      buttonWidth="w-48"
      statsCards={
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wohnungen gesamt</CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <Home className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
            </CardContent>
          </Card>
          <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Frei / Vermietet</CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <Key className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-2" />
            </CardContent>
          </Card>
          <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ø Miete</CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <Euro className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
            </CardContent>
          </Card>
          <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ø Preis pro m²</CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <Ruler className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
            </CardContent>
          </Card>
        </div>
      }
    />
  )
}
