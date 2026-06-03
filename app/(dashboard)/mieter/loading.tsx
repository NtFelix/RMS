import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, BadgeCheck, Euro } from "lucide-react"
import { PageSkeleton } from "@/components/skeletons/page-skeleton"

function MieterStats() {
  return (
    <div className="flex flex-wrap gap-4">
      <Card className="flex-1 min-w-[200px] bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Mieter gesamt</CardTitle>
          <div className="p-2 bg-muted rounded-lg">
            <Users className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
        </CardContent>
      </Card>
      <Card className="flex-1 min-w-[200px] bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Aktiv / Ehemalig</CardTitle>
          <div className="p-2 bg-muted rounded-lg">
            <BadgeCheck className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
        </CardContent>
      </Card>
      <Card className="flex-1 min-w-[200px] bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Ø Nebenkosten</CardTitle>
          <div className="p-2 bg-muted rounded-lg">
            <Euro className="size-4 text-muted-foreground" />
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
      headerTitleWidth="w-40"
      headerDescriptionWidth="w-64"
      buttonWidth="w-44"
      tabCount={3}
      tabWidth="w-28"
      tabContainerWidth="sm:w-[380px]"
    >
      <MieterStats />
    </PageSkeleton>
  )
}
