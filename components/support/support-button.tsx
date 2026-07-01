"use client"

import { MessageCircle } from "lucide-react"
import { useSupportStore } from "@/hooks/use-support-store"
import { cn } from "@/lib/utils"

interface SupportButtonProps {
  className?: string
}

export function SupportButton({ className }: SupportButtonProps) {
  const { openSupport, unreadCount, isAvailable } = useSupportStore()

  return (
    <button
      type="button"
      onClick={openSupport}
      className={cn(
        "relative inline-flex size-11 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white text-zinc-600 shadow-lg shadow-zinc-950/5 transition-all duration-200 hover:scale-105 hover:text-zinc-950 dark:border-zinc-800/80 dark:bg-[#181818] dark:text-zinc-300 dark:hover:text-zinc-50",
        className,
      )}
      aria-label="Support öffnen"
      title="Support öffnen"
    >
      <MessageCircle className="size-5" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white shadow-md">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      {!isAvailable && (
        <span className="absolute bottom-0 right-0 size-2 rounded-full bg-amber-400 shadow-[0_0_0_2px_white] dark:shadow-[0_0_0_2px_#181818]" />
      )}
    </button>
  )
}

