import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, BadgeCheck, Euro } from "lucide-react"
import { PageSkeleton } from "@/components/skeletons/page-skeleton"

export default function Loading() {
  return (
    <PageSkeleton
      headerTitleWidth="w-40"
      headerDescriptionWidth="w-64"
      buttonWidth="w-44"
      statsCards={
        <div className="flex flex-wrap gap-4">
          <Card className="flex-1 min-w-[200px] bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mieter gesamt</CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-[200px] bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktiv / Ehemalig</CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <BadgeCheck className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-2" />
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-[200px] bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ø Nebenkosten</CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <Euro className="h-4 w-4 text-muted-foreground" />
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
