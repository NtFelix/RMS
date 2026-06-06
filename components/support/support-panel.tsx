"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePostHog } from "posthog-js/react"
import { useAuth } from "@/components/auth/auth-provider"
import { useSupportStore } from "@/hooks/use-support-store"
import { syncSupportIdentity, buildSupportTraits, SUPPORT_POLL_INTERVAL_MS, type SupportMessage, type SupportTicket } from "@/lib/posthog-support"
import { getUserDisplayData } from "@/lib/utils/user"
import { formatRelativeTime } from "@/lib/format-relative-time"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { Loader2, MessageCircle, Plus, RefreshCcw, RotateCcw, Send } from "lucide-react"

const ticketStatusLabels: Record<string, string> = {
  new: 'Neu',
  open: 'Offen',
  pending: 'Wartet',
  on_hold: 'Pausiert',
  resolved: 'Gelöst',
}

const ticketStatusClasses: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  open: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  on_hold: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300',
  resolved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
}

function normalizeMessages(messages: SupportMessage[]) {
  return messages.filter((message) => !message.is_private)
}

function formatTicketTitle(ticket: SupportTicket) {
  return ticket.last_message?.trim() || `Ticket ${ticket.id.slice(0, 8)}`
}

function getTicketPreview(ticket: SupportTicket) {
  if (ticket.last_message?.trim()) {
    return ticket.last_message.trim()
  }

  return `${ticket.message_count} Nachricht${ticket.message_count === 1 ? '' : 'en'}`
}

async function loadSupportTickets(posthog: ReturnType<typeof usePostHog>) {
  if (!posthog?.conversations?.isAvailable?.() || typeof posthog.conversations.getTickets !== 'function') {
    return null
  }

  return posthog.conversations.getTickets()
}

async function loadSupportMessages(
  posthog: ReturnType<typeof usePostHog>,
  ticketId?: string | null,
) {
  if (!ticketId || !posthog?.conversations?.isAvailable?.() || typeof posthog.conversations.getMessages !== 'function') {
    return null
  }

  return posthog.conversations.getMessages(ticketId)
}

export function SupportPanel() {
  const posthog = usePostHog()
  const { user } = useAuth()
  const { isOpen, closeSupport, unreadCount, setUnreadCount, isAvailable, setIsAvailable } = useSupportStore()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticketsError, setTicketsError] = useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [identityReady, setIdentityReady] = useState(false)
  const [isComposingNewTicket, setIsComposingNewTicket] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const lastIdentityUserId = useRef<string | null>(null)
  const visibleTicketId = isComposingNewTicket ? null : (selectedTicketId || currentTicketId)
  const visibleTicket = tickets.find((ticket) => ticket.id === visibleTicketId) || null
  const visibleMessages = useMemo(() => normalizeMessages(messages), [messages])
  const canReplyToSelection = isComposingNewTicket || !selectedTicketId || selectedTicketId === currentTicketId
  const userDisplay = getUserDisplayData(user)
  const supportTraits = buildSupportTraits(user)

  useEffect(() => {
    let cancelled = false
    let availabilityCheck: number | undefined

    const updateAvailability = () => {
      const available = Boolean(posthog?.conversations?.isAvailable?.())
      setIsAvailable(available)

      if (available) {
        setTicketsError(null)
        setIdentityReady(true)
        return true
      }

      return false
    }

    if (updateAvailability()) {
      return
    }

    availabilityCheck = window.setInterval(() => {
      if (cancelled) {
        return
      }

      if (updateAvailability() && availabilityCheck) {
        window.clearInterval(availabilityCheck)
      }
    }, 500)

    return () => {
      cancelled = true
      if (availabilityCheck) {
        window.clearInterval(availabilityCheck)
      }
    }
  }, [posthog, setIsAvailable])

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth < 640)
    }

    updateViewport()
    window.addEventListener('resize', updateViewport, { passive: true })

    return () => {
      window.removeEventListener('resize', updateViewport)
    }
  }, [])

  useEffect(() => {
    if (!user?.id || !posthog || !isAvailable) {
      return
    }

    if (lastIdentityUserId.current === user.id) {
      return
    }

    lastIdentityUserId.current = user.id
    void syncSupportIdentity(posthog, user.id).then((identity) => {
      if (identity) {
        setIdentityReady(true)
      }
    })
  }, [isAvailable, posthog, user?.id])

  const refreshTickets = useCallback(async () => {
    if (!posthog || !isAvailable) {
      return
    }

    setTicketsLoading(true)
    try {
      const response = await loadSupportTickets(posthog)

      if (!response) {
        return
      }

      const normalizedTickets = [...response.results].sort((a, b) => {
        return new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime()
      })

      setTickets(normalizedTickets)
      setUnreadCount(normalizedTickets.reduce((total, ticket) => total + (ticket.unread_count || 0), 0))
      const activeTicketId = isComposingNewTicket ? null : posthog.conversations?.getCurrentTicketId?.() || null
      setCurrentTicketId(activeTicketId)

      if (!selectedTicketId && !isComposingNewTicket) {
        setSelectedTicketId(activeTicketId || normalizedTickets[0]?.id || null)
      }
    } catch (error) {
      setTicketsError(error instanceof Error ? error.message : 'Tickets konnten nicht geladen werden.')
    } finally {
      setTicketsLoading(false)
    }
  }, [isAvailable, isComposingNewTicket, posthog, selectedTicketId, setUnreadCount])

  const refreshMessages = useCallback(async (ticketId: string | null) => {
    if (!posthog || !isAvailable || !ticketId) {
      setMessages([])
      return
    }

    setMessagesLoading(true)
    setMessageError(null)

    try {
      const response = await loadSupportMessages(posthog, ticketId)

      if (!response) {
        setMessages([])
        return
      }

      setMessages(response.messages)

      if (response.unread_count > 0 && typeof posthog.conversations?.markAsRead === 'function') {
        await posthog.conversations.markAsRead(ticketId)
      }
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : 'Nachrichten konnten nicht geladen werden.')
    } finally {
      setMessagesLoading(false)
    }
  }, [isAvailable, posthog])

  useEffect(() => {
    if (!isAvailable) {
      return
    }

    void refreshTickets()
  }, [isAvailable, refreshTickets])

  useEffect(() => {
    if (!selectedTicketId && currentTicketId) {
      void refreshMessages(currentTicketId)
      return
    }

    if (selectedTicketId) {
      void refreshMessages(selectedTicketId)
    }
  }, [currentTicketId, isAvailable, refreshMessages, selectedTicketId])

  useEffect(() => {
    if (!isAvailable) {
      return
    }

    const ticketsTimer = window.setInterval(() => {
      void refreshTickets()
    }, SUPPORT_POLL_INTERVAL_MS)

    return () => window.clearInterval(ticketsTimer)
  }, [isAvailable, refreshTickets])

  useEffect(() => {
    if (!isOpen || !isAvailable || !visibleTicketId) {
      return
    }

    const messagesTimer = window.setInterval(() => {
      void refreshMessages(visibleTicketId)
    }, SUPPORT_POLL_INTERVAL_MS)

    return () => window.clearInterval(messagesTimer)
  }, [isAvailable, isOpen, refreshMessages, visibleTicketId])

  const handleSelectTicket = (ticket: SupportTicket) => {
    setIsComposingNewTicket(false)
    setSelectedTicketId(ticket.id)
    setDraft('')
    void refreshMessages(ticket.id)
  }

  const handleStartNewTicket = () => {
    setIsComposingNewTicket(true)
    setSelectedTicketId(null)
    setCurrentTicketId(null)
    setMessages([])
    setDraft('')
    setMessageError(null)
  }

  const handleSendMessage = () => {
    if (!posthog || !supportTraits || !draft.trim() || !isAvailable || !canReplyToSelection || typeof posthog.conversations?.sendMessage !== 'function') {
      return
    }

    const message = draft.trim()
    const shouldCreateNewTicket = isComposingNewTicket || !currentTicketId || selectedTicketId === null

    setDraft('')
    setMessageError(null)
    setIsSending(true)

    void posthog.conversations?.sendMessage?.(message, supportTraits, shouldCreateNewTicket)
      .then((response) => {
        if (!response) {
          return
        }

        setCurrentTicketId(response.ticket_id)
        setSelectedTicketId(response.ticket_id)
        setIsComposingNewTicket(false)
        void refreshTickets()
        void refreshMessages(response.ticket_id)
      })
      .catch((error) => {
        setDraft(message)
        setMessageError(error instanceof Error ? error.message : 'Nachricht konnte nicht gesendet werden.')
      })
      .finally(() => {
        setIsSending(false)
      })
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? undefined : closeSupport())}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex h-[100dvh] w-full flex-col gap-0 border-zinc-200/70 bg-[#fcfcfd] p-0 dark:border-zinc-800/70 dark:bg-[#111111]",
          isMobile ? "h-[88vh] max-h-[88vh] max-w-none rounded-t-[1.75rem]" : "sm:max-w-[46rem]",
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <SheetHeader className="border-b border-zinc-200/70 px-5 py-4 text-left dark:border-zinc-800/70">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <SheetTitle className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                  <MessageCircle className="size-4" />
                  Support
                </SheetTitle>
                <SheetDescription className="text-sm text-zinc-500 dark:text-zinc-400">
                  {identityReady
                    ? 'Tickets, Nachrichten und Antworten direkt in Mietevo.'
                    : 'Lade Support-Verbindungen...'}
                </SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void refreshTickets()}
                  className="gap-2"
                >
                  <RefreshCcw className="size-3.5" />
                  Aktualisieren
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleStartNewTicket}
                  className="gap-2"
                >
                  <Plus className="size-3.5" />
                  Neues Ticket
                </Button>
              </div>
            </div>
          </SheetHeader>

          {!isAvailable && (
            <div className="px-5 py-4">
              <Alert>
                <Loader2 className="size-4 animate-spin" />
                <AlertTitle>Support wird geladen</AlertTitle>
                <AlertDescription>
                  Wir verbinden Mietevo mit PostHog Conversations. Wenn der Dienst aktiviert ist, erscheinen hier automatisch Ihre Tickets.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {ticketsError && (
            <div className="px-5 pt-4">
              <Alert variant="destructive">
                <AlertTitle>Tickets konnten nicht geladen werden</AlertTitle>
                <AlertDescription>{ticketsError}</AlertDescription>
              </Alert>
            </div>
          )}

          <div className="grid flex-1 min-h-0 gap-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <aside className="border-b border-zinc-200/70 bg-white/80 dark:border-zinc-800/70 dark:bg-zinc-950/40 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between border-b border-zinc-200/70 px-4 py-3 dark:border-zinc-800/70">
                <div>
                  <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Tickets</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {unreadCount > 0 ? `${unreadCount} unbeantwortete Nachricht${unreadCount === 1 ? '' : 'en'}` : 'Keine ungelesenen Antworten'}
                  </p>
                </div>
                <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-[11px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  {ticketsLoading ? 'Laden' : `${tickets.length}`}
                </Badge>
              </div>

              <ScrollArea className="h-[26rem] lg:h-[calc(100dvh-12rem)]">
                <div className="p-2">
                  {tickets.length === 0 && !ticketsLoading ? (
                    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-900">
                        <MessageCircle className="size-5" />
                      </div>
                      <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">Noch keine Tickets</p>
                      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        Starten Sie eine neue Support-Anfrage, sobald Sie Hilfe benötigen.
                      </p>
                    </div>
                  ) : (
                    tickets.map((ticket) => {
                      const active = ticket.id === selectedTicketId
                      const unread = ticket.unread_count || 0

                      return (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={() => handleSelectTicket(ticket)}
                          className={cn(
                            "mb-2 w-full rounded-2xl border p-3 text-left transition-all duration-200",
                            active
                              ? "border-primary/40 bg-primary/5 shadow-sm"
                              : "border-zinc-200/70 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800/70 dark:bg-zinc-950/40 dark:hover:bg-zinc-900/50",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                                {formatTicketTitle(ticket)}
                              </p>
                              <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                {getTicketPreview(ticket)}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                  ticketStatusClasses[ticket.status] || 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300',
                                )}
                              >
                                {ticketStatusLabels[ticket.status] || ticket.status}
                              </Badge>
                              {unread > 0 && (
                                <Badge variant="destructive" className="px-2 py-0.5 text-[10px] font-semibold">
                                  {unread}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
                            <span>{formatRelativeTime(ticket.last_message_at || ticket.created_at)}</span>
                            <span>{ticket.message_count} Nachricht{ticket.message_count === 1 ? '' : 'en'}</span>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </aside>

            <section className="flex min-h-0 flex-col bg-[#fcfcfd] dark:bg-[#111111]">
              <div className="flex items-center justify-between border-b border-zinc-200/70 px-5 py-4 dark:border-zinc-800/70">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    {visibleTicket ? formatTicketTitle(visibleTicket) : 'Neue Support-Anfrage'}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {visibleTicket
                      ? `Status: ${ticketStatusLabels[visibleTicket.status] || visibleTicket.status}`
                      : 'Schreiben Sie uns direkt aus Mietevo.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedTicketId && selectedTicketId !== currentTicketId && !isComposingNewTicket && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleStartNewTicket}
                      className="gap-2"
                    >
                      <RotateCcw className="size-3.5" />
                      Neue Anfrage
                    </Button>
                  )}
                  <Badge variant="outline" className="border-zinc-200 bg-white text-[11px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                    {canReplyToSelection ? 'Antwort möglich' : 'Nur Verlauf'}
                  </Badge>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <ScrollArea className="flex-1">
                  <div className="space-y-4 px-5 py-4">
                    {messagesLoading && (
                      <div className="flex items-center gap-2 rounded-2xl border border-zinc-200/70 bg-white px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800/70 dark:bg-zinc-950/40 dark:text-zinc-400">
                        <Loader2 className="size-4 animate-spin" />
                        Nachrichten werden geladen...
                      </div>
                    )}

                    {messageError && (
                      <Alert variant="destructive">
                        <AlertTitle>Nachrichten konnten nicht geladen werden</AlertTitle>
                        <AlertDescription>{messageError}</AlertDescription>
                      </Alert>
                    )}

                    {!messagesLoading && visibleMessages.length === 0 && (
                      <div className="flex min-h-[18rem] flex-col items-center justify-center gap-3 rounded-[1.75rem] border border-dashed border-zinc-200 bg-white/70 px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-950/30">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <MessageCircle className="size-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                            {selectedTicketId && !isComposingNewTicket ? 'Kein Verlauf verfügbar' : 'Starten Sie den Support-Chat'}
                          </p>
                          <p className="max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                            {selectedTicketId && !isComposingNewTicket
                              ? 'Dieses Ticket enthält aktuell keine sichtbaren Nachrichten.'
                              : 'Beschreiben Sie Ihr Anliegen in ein bis zwei Sätzen. Wir erstellen automatisch ein Ticket und beantworten es direkt in Mietevo.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {visibleMessages.map((message) => {
                      const isCustomer = message.author_type === 'customer'
                      const isHuman = message.author_type === 'human'
                      const isAssistant = message.author_type === 'AI'
                      const alignRight = isCustomer

                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            alignRight ? "justify-end" : "justify-start",
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] rounded-[1.5rem] border px-4 py-3 shadow-sm",
                              alignRight
                                ? "border-primary/20 bg-primary text-primary-foreground"
                                : "border-zinc-200/70 bg-white dark:border-zinc-800/70 dark:bg-zinc-950/60",
                            )}
                          >
                            <div className="mb-2 flex items-center justify-between gap-4">
                              <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                                {isCustomer ? 'Sie' : isHuman ? 'Support-Team' : isAssistant ? 'PostHog AI' : message.author_name || 'Nachricht'}
                              </div>
                              <div className={cn("text-[11px]", alignRight ? "text-primary-foreground/70" : "text-zinc-400 dark:text-zinc-500")}>
                                {formatRelativeTime(message.created_at)}
                              </div>
                            </div>
                            <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", alignRight ? "text-primary-foreground" : "text-zinc-700 dark:text-zinc-200")}>
                              {message.content}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>

                <div className="border-t border-zinc-200/70 bg-white/90 px-5 py-4 backdrop-blur-sm dark:border-zinc-800/70 dark:bg-[#111111]/90">
                  {!canReplyToSelection && (
                    <div className="mb-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                      Sie sehen gerade den Verlauf eines älteren Tickets. Für eine neue Antwort starten Sie bitte ein neues Ticket.
                    </div>
                  )}

                  <div className="space-y-3">
                    <Textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Schreiben Sie Ihre Nachricht an den Support..."
                      className="min-h-[7rem] resize-none rounded-[1.25rem] border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/80 dark:bg-zinc-950/70"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        Drücken Sie <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">Cmd</kbd> + <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">Enter</kbd> zum Senden.
                      </p>
                      <Button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={!draft.trim() || isSending || !isAvailable || !supportTraits || !canReplyToSelection}
                        className="gap-2 rounded-full px-5"
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Wird gesendet
                          </>
                        ) : (
                          <>
                            <Send className="size-4" />
                            Senden
                          </>
                        )}
                      </Button>
                    </div>
                    {!supportTraits && (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        {userDisplay.userEmail === 'Nicht angemeldet'
                          ? 'Für Support-Nachrichten muss ein Nutzer angemeldet sein.'
                          : 'Benutzerinformationen werden geladen...'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
