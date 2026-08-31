"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePostHog } from "posthog-js/react"
import { useAuth } from "@/components/auth/auth-provider"
import { useSupportStore } from "@/hooks/use-support-store"
import {
  syncSupportIdentity,
  buildSupportTraits,
  getSupportErrorMessage,
  isRateLimitedError,
  loadConversationsBundle,
  ensureConversationsReady,
  SUPPORT_POLL_INTERVAL_MS,
  type SupportMessage,
  type SupportTicket,
  type RestoreResult,
} from "@/lib/posthog-support"
import { getUserDisplayData } from "@/lib/utils/user"
import { formatRelativeTime } from "@/lib/format-relative-time"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import {
  MessageCircle,
  MessageSquarePlus,
  Send,
  Loader2,
  RefreshCcw,
  Headphones,
  CheckCircle2,
  Plus,
  ArrowLeft,
  ChevronRight,
  Bot,
  Search,
  Check,
  Clock,
  Sparkles,
  Inbox,
  ArrowUp,
} from "lucide-react"

const ticketStatusLabels: Record<string, string> = {
  new: 'Neu',
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  resolved: 'Gelöst',
  closed: 'Geschlossen',
  on_hold: 'Wartend',
}

const ticketStatusClasses: Record<string, string> = {
  new: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  open: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  in_progress: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  resolved: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20',
  closed: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20',
  on_hold: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
}

function normalizeMessages(messages: SupportMessage[]): SupportMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

function formatTicketTitle(ticket: SupportTicket): string {
  if (ticket.last_message) {
    const clean = ticket.last_message.replace(/\s+/g, ' ').trim()
    return clean.length > 42 ? `${clean.slice(0, 40)}…` : clean
  }
  return `Ticket #${ticket.id.slice(-6)}`
}

function getTicketPreview(ticket: SupportTicket): string {
  if (ticket.last_message) {
    const clean = ticket.last_message.replace(/\s+/g, ' ').trim()
    return clean.length > 80 ? `${clean.slice(0, 78)}…` : clean
  }
  return 'Keine weiteren Details vorhanden.'
}

async function loadSupportTickets(
  posthog: ReturnType<typeof usePostHog>,
  options?: { limit?: number; offset?: number },
) {
  if (!posthog?.conversations?.isAvailable?.() || typeof posthog.conversations.getTickets !== 'function') {
    return null
  }
  return posthog.conversations.getTickets(options)
}

async function loadSupportMessages(
  posthog: ReturnType<typeof usePostHog>,
  ticketId?: string | null,
  after?: string,
) {
  if (!ticketId || !posthog?.conversations?.isAvailable?.() || typeof posthog.conversations.getMessages !== 'function') {
    return null
  }
  return posthog.conversations.getMessages(ticketId, after)
}

export function SupportPanel() {
  const posthog = usePostHog()
  const { user } = useAuth()
  const posthogExposedRef = useRef(false)
  if (!posthogExposedRef.current && typeof window !== 'undefined') {
    posthogExposedRef.current = true
    ;(window as any).__posthog = posthog
  }

  const {
    isOpen,
    closeSupport,
    unreadCount,
    setUnreadCount,
    isAvailable,
    setIsAvailable,
    setTickets: setStoreTickets,
    selectedTicketId: storeSelectedTicketId,
    setSelectedTicketId: setStoreSelectedTicketId,
    isComposingNew: storeIsComposingNew,
    setIsComposingNew: setStoreIsComposingNew,
  } = useSupportStore()

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticketsError, setTicketsError] = useState<string | null>(null)
  
  // View mode: 'inbox' (list of all tickets) | 'chat' (active conversation or new ticket draft)
  const [viewMode, setViewMode] = useState<'inbox' | 'chat'>('chat')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all')

  const selectedTicketIdRef = useRef(selectedTicketId)
  selectedTicketIdRef.current = selectedTicketId

  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [identityReady, setIdentityReady] = useState(false)
  const [availabilityTimedOut, setAvailabilityTimedOut] = useState(false)
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreEmailSent, setRestoreEmailSent] = useState(false)
  const [isComposingNewTicket, setIsComposingNewTicket] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false)
  const [totalTicketsCount, setTotalTicketsCount] = useState(0)
  const [loadingMoreTickets, setLoadingMoreTickets] = useState(false)

  const lastIdentityUserId = useRef<string | null>(null)
  const messageCursorRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesCacheRef = useRef<Record<string, SupportMessage[]>>({})

  const visibleTicketId = isComposingNewTicket ? null : (selectedTicketId || currentTicketId)
  const visibleTicket = tickets.find((ticket) => ticket.id === visibleTicketId) || null
  const visibleMessages = useMemo(() => normalizeMessages(messages), [messages])
  const canReplyToSelection = isComposingNewTicket || !selectedTicketId || selectedTicketId === currentTicketId
  const userDisplay = getUserDisplayData(user)
  const supportTraits = buildSupportTraits(user)

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
    }
  }, [])

  useEffect(() => {
    if (viewMode === 'chat' && visibleMessages.length > 0) {
      scrollToBottom(false)
    }
  }, [viewMode, visibleTicketId, visibleMessages.length, scrollToBottom])

  // Sync external store selections (e.g. from the dropdown popover)
  useEffect(() => {
    if (storeIsComposingNew) {
      setIsComposingNewTicket(true)
      setSelectedTicketId(null)
      setCurrentTicketId(null)
      setMessages([])
      setDraft('')
      setViewMode('chat')
      setStoreIsComposingNew(false)
      setTimeout(() => textareaRef.current?.focus(), 150)
      return
    }

    if (storeSelectedTicketId) {
      setIsComposingNewTicket(false)
      setSelectedTicketId(storeSelectedTicketId)
      setViewMode('chat')
      const cached = messagesCacheRef.current[storeSelectedTicketId]
      if (cached && cached.length > 0) {
        setMessages(cached)
      }
      setStoreSelectedTicketId(null)
    }
  }, [storeSelectedTicketId, storeIsComposingNew, setStoreIsComposingNew, setStoreSelectedTicketId])

  // Robust conversations initialization
  useEffect(() => {
    let cancelled = false
    let attempts = 0
    const maxAttempts = 6

    const checkAndInit = async () => {
      if (cancelled) return

      if (posthog?.conversations?.isAvailable?.()) {
        setIsAvailable(true)
        setAvailabilityTimedOut(false)
        setTicketsError(null)
        return
      }

      const ready = await ensureConversationsReady(posthog)
      if (cancelled) return

      if (ready) {
        setIsAvailable(true)
        setAvailabilityTimedOut(false)
        setTicketsError(null)
        return
      }

      attempts++
      if (attempts < maxAttempts) {
        setTimeout(checkAndInit, 1200)
      } else {
        setAvailabilityTimedOut(true)
      }
    }

    void checkAndInit()

    return () => {
      cancelled = true
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
    if (!isAvailable) return

    if (!user?.id) {
      setIdentityReady(true)
      return
    }

    if (lastIdentityUserId.current === user.id) return

    lastIdentityUserId.current = user.id
    void syncSupportIdentity(posthog, user.id).then((identity) => {
      if (identity) {
        setIdentityReady(true)
      }
    })
  }, [isAvailable, posthog, user?.id])

  const refreshTickets = useCallback(async (isBackground = false) => {
    if (!posthog || !isAvailable) return

    if (!isBackground) {
      setTicketsLoading(true)
    }
    try {
      const response = await loadSupportTickets(posthog, { limit: 25, offset: 0 })
      if (!response) return

      const normalizedTickets = response.results.toSorted((a, b) => {
        return new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime()
      })

      setTickets(normalizedTickets)
      setStoreTickets(normalizedTickets)
      setTotalTicketsCount(response.count)
      setUnreadCount(normalizedTickets.reduce((total, ticket) => total + (ticket.unread_count || 0), 0))
      
      const activeTicketId = isComposingNewTicket ? null : posthog.conversations?.getCurrentTicketId?.() || null
      setCurrentTicketId(activeTicketId)

      if (!selectedTicketIdRef.current && !isComposingNewTicket) {
        const targetId = activeTicketId || normalizedTickets[0]?.id || null
        setSelectedTicketId(targetId)
        if (!targetId) {
          setIsComposingNewTicket(true)
          setViewMode('chat')
        }
      }
    } catch (error) {
      setTicketsError(getSupportErrorMessage(error))
    } finally {
      if (!isBackground) {
        setTicketsLoading(false)
      }
    }
  }, [isAvailable, isComposingNewTicket, posthog, setStoreTickets, setUnreadCount])

  const refreshMessages = useCallback(async (ticketId: string | null, isBackground = false) => {
    if (!posthog || !isAvailable || !ticketId) {
      if (!isBackground) setMessages([])
      return
    }

    if (!isBackground && (!messagesCacheRef.current[ticketId] || messagesCacheRef.current[ticketId].length === 0)) {
      setMessagesLoading(true)
    }
    setMessageError(null)

    try {
      const response = await loadSupportMessages(posthog, ticketId)
      if (!response) {
        if (!isBackground) setMessages([])
        return
      }

      messagesCacheRef.current[ticketId] = response.messages
      setMessages(response.messages)
      setHasMoreMessages(response.has_more)
      if (response.messages.length > 0) {
        const oldest = response.messages.reduce((a, b) => a.created_at < b.created_at ? a : b)
        messageCursorRef.current = oldest.created_at
      }

      if (response.unread_count > 0 && typeof posthog.conversations?.markAsRead === 'function') {
        await posthog.conversations.markAsRead(ticketId)
      }
    } catch (error) {
      setMessageError(getSupportErrorMessage(error))
    } finally {
      if (!isBackground) {
        setMessagesLoading(false)
      }
    }
  }, [isAvailable, posthog])

  const refreshTicketsRef = useRef(refreshTickets)
  refreshTicketsRef.current = refreshTickets
  const refreshMessagesRef = useRef(refreshMessages)
  refreshMessagesRef.current = refreshMessages

  const loadOlderMessages = useCallback(async () => {
    if (!posthog || !isAvailable || !visibleTicketId || !messageCursorRef.current) {
      return
    }

    setLoadingOlderMessages(true)
    try {
      const response = await loadSupportMessages(posthog, visibleTicketId, messageCursorRef.current)
      if (!response || response.messages.length === 0) {
        setHasMoreMessages(false)
        return
      }

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id))
        const newMessages = response.messages.filter((m) => !existingIds.has(m.id))
        const merged = [...newMessages, ...prev]
        const oldest = merged.reduce((a, b) => a.created_at < b.created_at ? a : b)
        messageCursorRef.current = oldest.created_at
        setHasMoreMessages(response.has_more)
        if (visibleTicketId) {
          messagesCacheRef.current[visibleTicketId] = merged
        }
        return merged
      })
    } catch (error) {
      setMessageError(getSupportErrorMessage(error))
    } finally {
      setLoadingOlderMessages(false)
    }
  }, [isAvailable, posthog, visibleTicketId])

  const loadMoreTickets = useCallback(async () => {
    if (!posthog || !isAvailable) return

    setLoadingMoreTickets(true)
    try {
      const offset = tickets.length
      const response = await loadSupportTickets(posthog, { limit: 20, offset })
      if (!response || response.results.length === 0) return

      const existingIds = new Set(tickets.map((t) => t.id))
      const newTickets = response.results.filter((t) => !existingIds.has(t.id))
      const merged = [...tickets, ...newTickets]
      setTickets(merged)
      setStoreTickets(merged)
      const totalUnread = merged.reduce((total, ticket) => total + (ticket.unread_count || 0), 0)
      setUnreadCount(totalUnread)
    } catch (error) {
      setTicketsError(getSupportErrorMessage(error))
    } finally {
      setLoadingMoreTickets(false)
    }
  }, [isAvailable, posthog, setStoreTickets, setUnreadCount, tickets])

  useEffect(() => {
    if (!isAvailable || typeof posthog?.conversations?.restoreFromUrlToken !== 'function') {
      return
    }

    void posthog.conversations.restoreFromUrlToken().then((result) => {
      if (result?.status === 'success' && result.migrated_ticket_ids && result.migrated_ticket_ids.length > 0) {
        setRestoreResult(result as RestoreResult)
        void refreshTicketsRef.current()
      }
    }).catch((error) => {
      setRestoreError(getSupportErrorMessage(error))
    })
  }, [isAvailable, posthog])

  useEffect(() => {
    if (!isAvailable) return
    void refreshTicketsRef.current().then(() => {
      setIdentityReady(true)
    })
  }, [isAvailable])

  useEffect(() => {
    if (!selectedTicketId && currentTicketId) {
      void refreshMessagesRef.current(currentTicketId, true)
      return
    }
    if (selectedTicketId) {
      const cached = messagesCacheRef.current[selectedTicketId]
      if (cached && cached.length > 0) {
        setMessages(cached)
        void refreshMessagesRef.current(selectedTicketId, true)
      } else {
        void refreshMessagesRef.current(selectedTicketId, false)
      }
    }
  }, [currentTicketId, isAvailable, selectedTicketId])

  useEffect(() => {
    if (!isAvailable) return
    const ticketsTimer = window.setInterval(() => {
      void refreshTicketsRef.current(true)
    }, SUPPORT_POLL_INTERVAL_MS)
    return () => window.clearInterval(ticketsTimer)
  }, [isAvailable])

  useEffect(() => {
    if (!isOpen || !isAvailable || !visibleTicketId || viewMode !== 'chat') {
      return
    }
    const messagesTimer = window.setInterval(() => {
      void refreshMessagesRef.current(visibleTicketId, true)
    }, SUPPORT_POLL_INTERVAL_MS)
    return () => window.clearInterval(messagesTimer)
  }, [isAvailable, isOpen, visibleTicketId, viewMode])

  const handleSelectTicket = (ticket: SupportTicket) => {
    setIsComposingNewTicket(false)
    setSelectedTicketId(ticket.id)
    setViewMode('chat')
    setDraft('')
    
    // Instant display from cache if available (0ms delay)
    const cached = messagesCacheRef.current[ticket.id]
    if (cached && cached.length > 0) {
      setMessages(cached)
      void refreshMessages(ticket.id, true)
    } else {
      setMessages([])
      void refreshMessages(ticket.id, false)
    }
  }

  const handleStartNewTicket = () => {
    setIsComposingNewTicket(true)
    setSelectedTicketId(null)
    setCurrentTicketId(null)
    setMessages([])
    setDraft('')
    setMessageError(null)
    setViewMode('chat')
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }

  const handleSendMessage = () => {
    if (!posthog || !supportTraits || !draft.trim() || !isAvailable || !canReplyToSelection || typeof posthog.conversations?.sendMessage !== 'function') {
      return
    }

    const message = draft.trim()
    const isNew = isComposingNewTicket || !currentTicketId || selectedTicketId === null
    const tempMsgId = `temp-msg-${Date.now()}`
    const tempTicketId = selectedTicketId || currentTicketId || `temp-ticket-${Date.now()}`
    const nowIso = new Date().toISOString()

    const optimisticMessage: SupportMessage = {
      id: tempMsgId,
      content: message,
      author_type: 'customer',
      author_name: userDisplay.userName || 'Sie',
      created_at: nowIso,
      is_private: false,
    }

    // 1. Instant optimistic message in chat
    setMessages((prev) => {
      const next = [...prev, optimisticMessage]
      messagesCacheRef.current[tempTicketId] = next
      return next
    })

    // 2. Instant optimistic ticket in ticket list
    if (isNew) {
      const optimisticTicket: SupportTicket = {
        id: tempTicketId,
        status: 'new',
        last_message: message,
        last_message_at: nowIso,
        created_at: nowIso,
        message_count: 1,
        unread_count: 0,
      }
      setTickets((prev) => {
        const next = [optimisticTicket, ...prev.filter((t) => t.id !== tempTicketId)]
        setStoreTickets(next)
        return next
      })
      setSelectedTicketId(tempTicketId)
      setCurrentTicketId(tempTicketId)
      setIsComposingNewTicket(false)
    } else if (selectedTicketId) {
      setTickets((prev) => {
        const next = prev.map((t) =>
          t.id === selectedTicketId
            ? { ...t, last_message: message, last_message_at: nowIso, message_count: t.message_count + 1 }
            : t
        )
        setStoreTickets(next)
        return next
      })
    }

    setDraft('')
    setMessageError(null)
    setIsSending(true)
    setTimeout(() => scrollToBottom(true), 30)

    void posthog.conversations.sendMessage(message, supportTraits, isNew)
      .then((response) => {
        if (!response) {
          setMessages((prev) => prev.filter((msg) => msg.id !== tempMsgId))
          return
        }

        const realTicketId = response.ticket_id
        const realMsgId = response.message_id
        const realCreatedAt = response.created_at || nowIso

        // Replace temp IDs with real server IDs
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === tempMsgId
              ? { ...m, id: realMsgId, created_at: realCreatedAt }
              : m
          )
          messagesCacheRef.current[realTicketId] = updated
          return updated
        })

        setTickets((prev) => {
          const updated = prev.map((t) =>
            t.id === tempTicketId || t.id === realTicketId
              ? {
                  ...t,
                  id: realTicketId,
                  status: response.ticket_status || t.status,
                  last_message: message,
                  last_message_at: realCreatedAt,
                }
              : t
          )
          setStoreTickets(updated)
          return updated
        })

        setSelectedTicketId(realTicketId)
        setCurrentTicketId(realTicketId)
        setIsComposingNewTicket(false)

        // Silent background sync without UI flashes
        void refreshTickets(true)
        void refreshMessages(realTicketId, true)
      })
      .catch((error) => {
        setMessages((prev) => prev.filter((msg) => msg.id !== tempMsgId))
        setDraft(message)
        setMessageError(getSupportErrorMessage(error))
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

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (statusFilter === 'open' && (ticket.status === 'resolved' || ticket.status === 'closed')) return false
      if (statusFilter === 'resolved' && ticket.status !== 'resolved' && ticket.status !== 'closed') return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = formatTicketTitle(ticket).toLowerCase().includes(q)
        const matchLast = (ticket.last_message || '').toLowerCase().includes(q)
        if (!matchTitle && !matchLast) return false
      }
      return true
    })
  }, [tickets, statusFilter, searchQuery])

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? undefined : closeSupport())}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex h-[100dvh] w-full flex-col gap-0 border-zinc-200/80 bg-background p-0 shadow-2xl dark:border-zinc-800/80 focus:outline-hidden",
          isMobile ? "h-[92vh] max-h-[92vh] max-w-none rounded-t-3xl" : "sm:w-[500px] md:w-[540px] lg:w-[580px] sm:max-w-[92vw]",
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          {/* Header - Styled like Tenant Modal / Form Modal Shell with precise vertical alignment */}
          <SheetHeader className="h-16 shrink-0 border-b border-border/70 bg-background/95 px-4 pl-14 flex flex-row items-center justify-between backdrop-blur-md space-y-0 text-left">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {viewMode === 'chat' && tickets.length > 0 ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('inbox')}
                    className="h-8 gap-1.5 rounded-xl px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0"
                  >
                    <ArrowLeft className="size-3.5" />
                    <span>Übersicht</span>
                  </Button>
                  <div className="h-4 w-px bg-border/80 shrink-0" />
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <SheetTitle className="truncate text-sm font-bold text-foreground leading-tight">
                        {isComposingNewTicket
                          ? 'Neue Support-Anfrage'
                          : visibleTicket
                          ? formatTicketTitle(visibleTicket)
                          : 'Support-Chat'}
                      </SheetTitle>
                      {visibleTicket && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "px-1.5 py-0 text-[10px] font-medium border uppercase tracking-wider shrink-0 h-4.5 flex items-center",
                            ticketStatusClasses[visibleTicket.status] || 'bg-muted text-muted-foreground',
                          )}
                        >
                          {ticketStatusLabels[visibleTicket.status] || visibleTicket.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                      {visibleTicket
                        ? formatRelativeTime(visibleTicket.last_message_at || visibleTicket.created_at)
                        : 'Mietevo Support Team'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                    <Headphones className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <SheetTitle className="text-sm font-bold text-foreground leading-tight">
                      Support & Hilfe
                    </SheetTitle>
                    <SheetDescription className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                      {tickets.length > 0 ? `${tickets.length} Anfragen gesamt` : 'Direkte Unterstützung'}
                    </SheetDescription>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {viewMode === 'inbox' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => void refreshTickets()}
                  disabled={ticketsLoading}
                  className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                  title="Tickets aktualisieren"
                >
                  <RefreshCcw className={cn("size-3.5", ticketsLoading && "animate-spin")} />
                </Button>
              )}

              {viewMode === 'chat' && !isComposingNewTicket && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStartNewTicket}
                  className="h-8 gap-1.5 rounded-xl px-2.5 text-xs font-semibold shadow-xs"
                >
                  <Plus className="size-3.5" />
                  <span>Neu</span>
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Service Availability Alerts */}
          {!isAvailable && !availabilityTimedOut && (
            <div className="p-4">
              <Alert className="border-blue-500/20 bg-blue-500/5 text-blue-900 dark:text-blue-200 rounded-2xl">
                <Loader2 className="size-4 animate-spin text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-sm font-medium">Support-Dienst wird initialisiert</AlertTitle>
                <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
                  Verbindung wird hergestellt...
                </AlertDescription>
              </Alert>
            </div>
          )}

          {availabilityTimedOut && (
            <div className="p-4">
              <Alert variant="destructive" className="rounded-2xl">
                <AlertTitle className="text-sm font-bold">Support aktuell nicht erreichbar</AlertTitle>
                <AlertDescription className="text-xs">
                  Der Support-Chat konnte nicht geladen werden. Bitte laden Sie die Seite neu.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {restoreResult && (
            <div className="px-4 pt-3">
              <Alert className="border-emerald-500/20 bg-emerald-500/10 py-2.5 rounded-2xl">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <AlertDescription className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  {restoreResult.migrated_ticket_ids?.length} Ticket(s) erfolgreich wiederhergestellt.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {restoreEmailSent && (
            <div className="px-4 pt-3">
              <Alert className="border-emerald-500/20 bg-emerald-500/10 py-2.5 rounded-2xl">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <AlertDescription className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  Wiederherstellungs-Link wurde an {user?.email} gesendet.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* MAIN BODY: VIEW SWITCHER */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/20">
            {/* VIEW 1: INBOX / TICKET LIST */}
            {viewMode === 'inbox' && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* Search & Filter Bar */}
                <div className="shrink-0 p-4 space-y-3 bg-background border-b border-border/60">
                  <Button
                    type="button"
                    onClick={handleStartNewTicket}
                    className="w-full justify-center gap-2 rounded-2xl bg-primary py-5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/95 active:scale-[0.99] cursor-pointer"
                  >
                    <Plus className="size-4" />
                    <span>Neues Ticket erstellen</span>
                  </Button>

                  {tickets.length > 0 && (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Anfragen durchsuchen..."
                          className="h-9 pl-9 rounded-xl text-xs bg-muted/40 border-border/60"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setStatusFilter('all')}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                            statusFilter === 'all'
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "bg-muted/60 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Alle ({tickets.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('open')}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                            statusFilter === 'open'
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "bg-muted/60 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Offen ({tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('resolved')}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                            statusFilter === 'resolved'
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "bg-muted/60 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Gelöst ({tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length})
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <ScrollArea className="flex-1 px-4 py-3">
                  <div className="space-y-2.5">
                    {filteredTickets.length === 0 && !ticketsLoading ? (
                      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/80 bg-background/60 p-8 text-center my-4">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                          <MessageCircle className="size-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            {searchQuery ? 'Keine passenden Anfragen' : 'Noch keine Anfragen'}
                          </p>
                          <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
                            {searchQuery
                              ? 'Versuche einen anderen Suchbegriff.'
                              : 'Haben Sie Fragen oder benötigen Hilfe? Starten Sie einfach eine neue Support-Anfrage.'}
                          </p>
                        </div>
                        {user?.email && typeof posthog?.conversations?.requestRestoreLink === 'function' && !searchQuery && (
                          <button
                            type="button"
                            disabled={!isAvailable}
                            onClick={async () => {
                              if (!isAvailable || !user?.email) return
                              setRestoreError(null)
                              setRestoreEmailSent(false)
                              try {
                                await posthog.conversations.requestRestoreLink!(user.email)
                                setRestoreEmailSent(true)
                              } catch (error) {
                                setRestoreError(getSupportErrorMessage(error))
                              }
                            }}
                            className="mt-2 text-xs font-medium text-primary hover:underline cursor-pointer"
                          >
                            Frühere Tickets per E-Mail wiederherstellen
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredTickets.map((ticket) => {
                        const active = ticket.id === selectedTicketId
                        const unread = ticket.unread_count || 0

                        return (
                          <button
                            key={ticket.id}
                            type="button"
                            onClick={() => handleSelectTicket(ticket)}
                            className={cn(
                              "group relative flex w-full flex-col gap-2 rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer shadow-xs",
                              active
                                ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                                : "border-border/70 bg-card hover:border-border hover:bg-muted/40",
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-xs font-bold text-foreground">
                                {formatTicketTitle(ticket)}
                              </p>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-lg",
                                    ticketStatusClasses[ticket.status] || 'bg-muted text-muted-foreground',
                                  )}
                                >
                                  {ticketStatusLabels[ticket.status] || ticket.status}
                                </Badge>
                                {unread > 0 && (
                                  <span className="flex size-2 rounded-full bg-accent" />
                                )}
                              </div>
                            </div>

                            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                              {getTicketPreview(ticket)}
                            </p>

                            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground/80 pt-1 border-t border-border/40">
                              <span>{formatRelativeTime(ticket.last_message_at || ticket.created_at)}</span>
                              <div className="flex items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors font-medium">
                                <span>Öffnen</span>
                                <ChevronRight className="size-3" />
                              </div>
                            </div>
                          </button>
                        )
                      })
                    )}

                    {totalTicketsCount > tickets.length && (
                      <div className="flex justify-center pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void loadMoreTickets()}
                          disabled={loadingMoreTickets}
                          className="h-8 text-xs text-muted-foreground"
                        >
                          {loadingMoreTickets ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            `Weitere laden (${tickets.length}/${totalTicketsCount})`
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* VIEW 2: CHAT CONVERSATION & INPUT COMPOSER */}
            {viewMode === 'chat' && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
                {/* Message stream */}
                <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
                  <div className="space-y-4 pb-2">
                    {messagesLoading && (
                      <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        <span>Nachrichten werden geladen...</span>
                      </div>
                    )}

                    {messageError && (
                      <Alert variant="destructive" className="py-2.5 text-xs rounded-2xl">
                        <AlertTitle className="text-xs font-semibold">Fehler</AlertTitle>
                        <AlertDescription>{messageError}</AlertDescription>
                      </Alert>
                    )}

                    {!messagesLoading && visibleMessages.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/80 bg-muted/20 p-8 text-center my-6">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                          <Sparkles className="size-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-foreground">
                            {isComposingNewTicket ? 'Wie können wir Ihnen helfen?' : 'Noch keine Nachrichten'}
                          </p>
                          <p className="text-xs leading-relaxed text-muted-foreground max-w-xs">
                            Beschreiben Sie Ihr Anliegen so detailliert wie möglich. Unser Team antwortet Ihnen schnellstmöglich.
                          </p>
                        </div>
                      </div>
                    )}

                    {hasMoreMessages && visibleMessages.length > 0 && (
                      <div className="flex justify-center pb-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void loadOlderMessages()}
                          disabled={loadingOlderMessages}
                          className="h-7 text-[11px] text-muted-foreground"
                        >
                          {loadingOlderMessages ? (
                            <Loader2 className="size-3 animate-spin mr-1" />
                          ) : (
                            <RefreshCcw className="size-3 mr-1" />
                          )}
                          Ältere Nachrichten laden
                        </Button>
                      </div>
                    )}

                    {visibleMessages.map((message) => {
                      const isCustomer = message.author_type === 'customer'
                      const isAI = message.author_type === 'AI'

                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex flex-col gap-1.5",
                            isCustomer ? "items-end" : "items-start",
                          )}
                        >
                          <div className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
                            {!isCustomer && (
                              <span className="flex size-4 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                {isAI ? <Bot className="size-2.5" /> : <Headphones className="size-2.5" />}
                              </span>
                            )}
                            <span className="font-medium">{isCustomer ? 'Sie' : isAI ? 'Mietevo AI' : message.author_name || 'Support'}</span>
                            <span>•</span>
                            <span>{formatRelativeTime(message.created_at)}</span>
                          </div>

                          <div
                            className={cn(
                              "max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs",
                              isCustomer
                                ? "bg-primary text-primary-foreground rounded-tr-xs font-normal shadow-sm"
                                : "border border-border/70 bg-card text-card-foreground dark:bg-zinc-900 rounded-tl-xs",
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Message Composer - Single sleek container matching AI Chat Input */}
                <div className="shrink-0 p-4 bg-background border-t border-border/60 shadow-sm z-20">
                  {!canReplyToSelection && (
                    <div className="mb-3 flex items-center justify-between rounded-xl bg-amber-500/10 px-3.5 py-2 text-xs text-amber-800 dark:text-amber-300 border border-amber-500/20">
                      <span>Dies ist ein abgeschlossenes Ticket.</span>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={handleStartNewTicket}
                        className="h-auto p-0 text-xs font-semibold text-amber-800 underline dark:text-amber-300"
                      >
                        Neues Ticket erstellen
                      </Button>
                    </div>
                  )}

                  <div className="relative border border-border/80 dark:border-border/20 rounded-2xl shadow-sm focus-within:ring-1 focus-within:ring-primary/25 transition-all duration-200 bg-white dark:bg-[#1A1A1A] text-foreground">
                    <div className="px-4 pt-3">
                      <textarea
                        ref={textareaRef}
                        value={draft}
                        onChange={(e) => {
                          setDraft(e.target.value)
                          e.target.style.height = 'auto'
                          e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={
                          isComposingNewTicket
                            ? "Beschreiben Sie Ihr Anliegen detailliert..."
                            : "Antwort schreiben..."
                        }
                        disabled={isSending || !canReplyToSelection}
                        rows={1}
                        aria-label="Support-Nachricht eingeben"
                        className="w-full bg-transparent border-0 focus:ring-0 resize-none max-h-[140px] text-xs sm:text-sm placeholder:text-muted-foreground disabled:opacity-50 min-h-[44px] outline-none leading-relaxed"
                        style={{ overflowY: draft.length > 80 ? 'auto' : 'hidden' }}
                      />
                    </div>

                    <div className="flex items-center justify-between px-3 pb-3">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-normal">
                        <span className="hidden sm:inline">
                          <kbd className="rounded border border-border/60 px-1 py-0.5 text-[9px] bg-muted/40 font-mono">⌘</kbd> + <kbd className="rounded border border-border/60 px-1 py-0.5 text-[9px] bg-muted/40 font-mono">↵</kbd> zum Senden
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={handleSendMessage}
                          disabled={!draft.trim() || isSending || !isAvailable || !supportTraits || !canReplyToSelection}
                          size="icon"
                          aria-label={isComposingNewTicket ? 'Ticket erstellen' : 'Nachricht senden'}
                          title={isComposingNewTicket ? 'Ticket erstellen' : 'Nachricht senden'}
                          className="rounded-full size-9 shrink-0 shadow-none transition-all active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:hover:bg-primary cursor-pointer"
                        >
                          {isSending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <ArrowUp className="size-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {!supportTraits && (
                    <p className="mt-2 text-center text-[11px] text-muted-foreground">
                      {userDisplay.userEmail === 'Nicht angemeldet'
                        ? 'Bitte melden Sie sich an, um Support-Nachrichten zu senden.'
                        : 'Benutzerdaten werden geladen...'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
