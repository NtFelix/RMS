import type { ReactNode } from "react"
import { StatCard } from "@/components/common/stat-card"

// Shared by the real stat rows (mieter, haeuser, wohnungen) and their loading skeletons, so both lay out the
// same way and the cards do not change height when the data arrives.
export const STAT_CARD_ROW_CLASS = "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4"

const STAT_CARD_CLASS =
  "bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"

export function StatCardsSkeleton({ cards }: { cards: { title: string; icon: ReactNode }[] }) {
  return (
    <div className={STAT_CARD_ROW_CLASS}>
      {cards.map((card) => (
        <StatCard key={card.title} title={card.title} value="" icon={card.icon} className={STAT_CARD_CLASS} loading />
      ))}
    </div>
  )
}
