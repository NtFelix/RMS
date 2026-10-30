import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder for the deposit card of the Mieter overview while the feature flag `advanced-kautionsmanagment`
 * is still loading. Occupies the card's grid slot (same column span and surface), so the neighbouring card
 * does not jump when the flag arrives.
 */
export function KautionKarteSkeleton() {
  return (
    <Card
      role="status"
      aria-busy="true"
      aria-label="Kautionsdaten werden geladen"
      className="lg:col-span-7 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6"
    >
      <CardHeader className="px-0 pt-0">
        <Skeleton className="h-5 w-56" />
      </CardHeader>
      <CardContent className="px-0 pb-0 mt-2 flex flex-col gap-4">
        <Skeleton className="h-[74px] rounded-2xl" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
      </CardContent>
    </Card>
  );
}
