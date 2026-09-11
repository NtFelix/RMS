"use client"

import { useState } from "react"
import { MessageCircle, Plus } from "lucide-react"
import { useSupportStore } from "@/hooks/use-support-store"
import { formatRelativeTime } from "@/lib/format-relative-time"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface SupportButtonProps {
  className?: string
}

export function SupportButton({ className }: SupportButtonProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const {
    openSupport,
    openSupportWithTicket,
    openSupportNewTicket,
    unreadCount,
    isAvailable,
    tickets,
  } = useSupportStore()

  const hasUnread = unreadCount > 0

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex size-11 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white text-zinc-600 shadow-lg shadow-zinc-950/5 transition-all duration-200 hover:scale-105 hover:text-zinc-950 dark:border-zinc-800/80 dark:bg-[#181818] dark:text-zinc-300 dark:hover:text-zinc-50 cursor-pointer",
            className,
          )}
          aria-label="Support öffnen"
          title="Support öffnen"
        >
          <MessageCircle className="size-5" />
          {hasUnread && (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white shadow-md">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {!isAvailable && (
            <span className="absolute bottom-0 right-0 size-2 rounded-full bg-amber-400 shadow-[0_0_0_2px_white] dark:shadow-[0_0_0_2px_#181818]" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        className="w-88 max-w-[calc(100vw-32px)] p-0 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#181818] rounded-2xl shadow-2xl z-50 animate-in fade-in-50 slide-in-from-bottom-4 duration-300 overflow-hidden"
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Support & Hilfe</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                  {unreadCount} neu
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false)
                openSupportNewTicket()
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Plus className="size-3.5" />
              Neu
            </button>
          </div>

          {/* Conversations List */}
          {tickets.length > 0 ? (
            <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/40 p-1">
              {tickets.slice(0, 5).map((ticket) => {
                const isTicketUnread = (ticket.unread_count || 0) > 0
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => {
                      setPopoverOpen(false)
                      openSupportWithTicket(ticket.id)
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors flex flex-col gap-1 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        "text-xs line-clamp-1 group-hover:text-primary transition-colors",
                        isTicketUnread ? "font-semibold text-zinc-900 dark:text-zinc-50" : "text-zinc-700 dark:text-zinc-300"
                      )}>
                        {ticket.last_message || 'Keine Nachricht'}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
                        {formatRelativeTime(ticket.last_message_at || ticket.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                        {ticket.status === 'resolved' ? 'Gelöst' : ticket.status === 'on_hold' ? 'Wartend' : 'Aktiv'}
                      </span>
                      {isTicketUnread && (
                        <span className="size-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
              <div className="size-10 rounded-full bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center border border-zinc-100 dark:border-zinc-800/50 mb-2.5 shadow-inner">
                <MessageCircle className="size-4 text-zinc-400 dark:text-zinc-500" />
              </div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Keine aktiven Tickets</h4>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-[220px] leading-relaxed">
                Hast du Fragen oder Feedback? Erstelle jederzeit eine neue Support-Anfrage.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="p-2 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20">
            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false)
                openSupport()
              }}
              className="flex items-center justify-center w-full py-2 rounded-xl bg-white hover:bg-zinc-100 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-800/40 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-all duration-200 cursor-pointer"
            >
              {tickets.length > 0 ? 'Alle Anfragen anzeigen' : 'Support-Chat öffnen'}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
