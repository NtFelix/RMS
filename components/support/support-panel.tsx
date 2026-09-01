"use client"

import type React from "react"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, memo } from "react"
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
  MAX_SUPPORT_MESSAGE_LENGTH,
  WARN_SUPPORT_MESSAGE_LENGTH,
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
import { SearchInput } from "@/components/ui/search-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import Link from "next/link"
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
  Filter,
  Check,
  Clock,
  Sparkles,
  Inbox,
  ArrowUp,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  X,
  Lock,
} from "lucide-react"
import { SupportMessageContent } from "./support-message-content"
import { SupportImageLightbox, type LightboxImageData } from "./support-image-lightbox"

const ticketStatusLabels: Record<string, string> = {
  new: 'Neu',
  open: 'Offen',
  pending: 'Ausstehend',
  in_progress: 'In Bearbeitung',
  on_hold: 'Pausiert',
  resolved: 'Gelöst',
  closed: 'Geschlossen',
}

const ticketStatusClasses: Record<string, string> = {
  new: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:bg-emerald-500/20 font-medium',
  open: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 dark:bg-blue-500/20 font-medium',
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 dark:bg-amber-500/20 font-medium',
  in_progress: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 dark:bg-indigo-500/20 font-medium',
  on_hold: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 dark:bg-purple-500/20 font-medium',
  resolved: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30 dark:bg-teal-500/20 font-medium',
  closed: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30 dark:bg-zinc-500/20 font-medium',
}

const ticketStatusDotClasses: Record<string, string> = {
  new: 'bg-emerald-500 animate-pulse',
  open: 'bg-blue-500',
  pending: 'bg-amber-500',
  in_progress: 'bg-indigo-500',
  on_hold: 'bg-purple-500',
  resolved: 'bg-teal-500',
  closed: 'bg-zinc-400',
}

function normalizeTicketStatusKey(rawStatus?: string | null): string {
  if (!rawStatus) return 'open'
  const s = rawStatus.toLowerCase().trim().replace(/[\s-]+/g, '_')
  if (s === 'hold' || s === 'on_hold' || s === 'onhold') return 'on_hold'
  if (s === 'progress' || s === 'in_progress' || s === 'inprog') return 'in_progress'
  if (s === 'pend' || s === 'pending' || s === 'ausstehend') return 'pending'
  if (s === 'res' || s === 'resolved' || s === 'geloest' || s === 'gelöst') return 'resolved'
  if (s === 'close' || s === 'closed' || s === 'geschlossen') return 'closed'
  if (s === 'neu' || s === 'new') return 'new'
  if (s === 'offen' || s === 'open') return 'open'
  return s
}

function getTicketStatusLabel(status?: string | null): string {
  const key = normalizeTicketStatusKey(status)
  return ticketStatusLabels[key] || status || 'Offen'
}

function getTicketStatusClass(status?: string | null): string {
  const key = normalizeTicketStatusKey(status)
  return ticketStatusClasses[key] || 'bg-muted text-muted-foreground border-border'
}

function getTicketStatusDotClass(status?: string | null): string {
  const key = normalizeTicketStatusKey(status)
  return ticketStatusDotClasses[key] || 'bg-muted-foreground'
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

// Memoized Message Bubble component to prevent re-renders when typing
interface SupportMessageBubbleProps {
  message: SupportMessage
  onOpenImage: (data: LightboxImageData) => void
  onRetryMessage: (message: SupportMessage) => void
  onEditFailedMessage: (message: SupportMessage) => void
}

const SupportMessageBubble = memo(function SupportMessageBubble({
  message,
  onOpenImage,
  onRetryMessage,
  onEditFailedMessage,
}: SupportMessageBubbleProps) {
  const isCustomer = message.author_type === 'customer'
  const isAI =
    message.author_type === 'bot' ||
    Boolean(message.author_name && message.author_name.toLowerCase().includes('ai'))
  const isSendingMessage = message.status === 'sending'
  const isFailedMessage = message.status === 'failed'

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        isCustomer ? "items-end" : "items-start",
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {!isCustomer && (
          <span className="flex size-4 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {isAI ? <Bot className="size-2.5" /> : <Headphones className="size-2.5" />}
          </span>
        )}
        <span className="font-medium">
          {isCustomer ? 'Sie' : isAI ? 'Mietevo AI' : message.author_name || 'Support'}
        </span>
        <span>•</span>
        {isSendingMessage ? (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="size-2.5 animate-spin" />
            <span>Wird gesendet...</span>
          </span>
        ) : isFailedMessage ? (
          <span className="flex items-center gap-1 text-[10px] font-medium text-destructive">
            <AlertCircle className="size-2.5" />
            <span>Fehlgeschlagen</span>
          </span>
        ) : (
          <span>{formatRelativeTime(message.created_at)}</span>
        )}
      </div>

      <div
        className={cn(
          "max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs transition-all",
          isFailedMessage
            ? "border border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/20 rounded-tr-xs"
            : isCustomer
            ? cn(
                "bg-primary text-primary-foreground rounded-tr-xs font-normal shadow-sm",
                isSendingMessage && "opacity-80",
              )
            : "border border-border/70 bg-card text-card-foreground dark:bg-zinc-900 rounded-tl-xs",
        )}
      >
        <SupportMessageContent
          content={message.content}
          isCustomer={isCustomer}
          onOpenImage={onOpenImage}
        />
      </div>

      {isFailedMessage && (
        <div className="flex flex-wrap items-center justify-end gap-1.5 text-[11px] text-destructive">
          <AlertCircle className="size-3 shrink-0" />
          <span className="font-medium">Nicht übermittelt</span>
          {message.error && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-destructive/90 max-w-[280px] truncate" title={message.error}>
                {message.error}
              </span>
            </>
          )}
          <span className="text-muted-foreground/40">•</span>
          <button
            type="button"
            onClick={() => onRetryMessage(message)}
            className="inline-flex items-center gap-0.5 font-semibold text-destructive underline hover:no-underline cursor-pointer"
          >
            <RotateCcw className="size-2.5 mr-0.5" />
            <span>Wiederholen</span>
          </button>
          <span className="text-muted-foreground/40">•</span>
          <button
            type="button"
            onClick={() => onEditFailedMessage(message)}
            className="font-semibold text-destructive underline hover:no-underline cursor-pointer"
          >
            Bearbeiten
          </button>
        </div>
      )}
    </div>
  )
})

// Memoized Composer Component with smooth auto-height
interface SupportComposerProps {
  draft: string
  setDraft: React.Dispatch<React.SetStateAction<string>>
  isSending: boolean
  isComposingNewTicket: boolean
  canReplyToSelection: boolean
  isAvailable: boolean
  supportTraitsReady: boolean
  messageError: string | null
  onClearMessageError: () => void
  onSendMessage: () => void
  onStartNewTicket: () => void
  userEmail?: string
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

const SupportComposer = memo(function SupportComposer({
  draft,
  setDraft,
  isSending,
  isComposingNewTicket,
  canReplyToSelection,
  isAvailable,
  supportTraitsReady,
  messageError,
  onClearMessageError,
  onSendMessage,
  onStartNewTicket,
  userEmail,
  textareaRef,
}: SupportComposerProps) {
  const [isMultiline, setIsMultiline] = useState(false)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSendMessage()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setDraft(val)
    if (messageError) onClearMessageError()
  }

  // Smooth layout effect for textarea auto-resizing and pill-to-box shape transition
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const scrollHeight = el.scrollHeight
    const newHeight = Math.min(scrollHeight, 140)
    el.style.height = `${Math.max(newHeight, 36)}px`
    setIsMultiline(scrollHeight > 42 || draft.includes('\n'))
  }, [draft, textareaRef])

  const isOverLimit = draft.length > MAX_SUPPORT_MESSAGE_LENGTH
  const isApproachingLimit = draft.length >= WARN_SUPPORT_MESSAGE_LENGTH

  return (
    <div className="shrink-0 p-3 bg-background border-t border-border/60 shadow-sm z-20">
      {messageError && (
        <div className="mb-2.5 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive animate-in fade-in-50 duration-200">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs leading-tight">Nachricht konnte nicht gesendet werden</p>
            <p className="text-[11px] text-destructive/90 mt-0.5 leading-snug break-words">{messageError}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClearMessageError}
            className="size-5 rounded-md hover:bg-destructive/20 text-destructive shrink-0"
          >
            <X className="size-3" />
          </Button>
        </div>
      )}

      {!canReplyToSelection && (
        <div className="mb-2.5 flex items-center justify-between rounded-xl bg-amber-500/10 px-3.5 py-2 text-xs text-amber-800 dark:text-amber-300 border border-amber-500/20">
          <span>Dies ist ein abgeschlossenes Ticket.</span>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={onStartNewTicket}
            className="h-auto p-0 text-xs font-semibold text-amber-800 underline dark:text-amber-300"
          >
            Neues Ticket erstellen
          </Button>
        </div>
      )}

      {draft.length > 500 && (
        <div className="flex items-center justify-between px-1 pb-1 text-[11px]">
          {isOverLimit ? (
            <span className="text-destructive font-semibold flex items-center gap-1">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>
                {(draft.length - MAX_SUPPORT_MESSAGE_LENGTH).toLocaleString('de-DE')} Zeichen zu lang (max. {MAX_SUPPORT_MESSAGE_LENGTH.toLocaleString('de-DE')})
              </span>
            </span>
          ) : isApproachingLimit ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Noch {(MAX_SUPPORT_MESSAGE_LENGTH - draft.length).toLocaleString('de-DE')} Zeichen übrig
            </span>
          ) : (
            <span />
          )}
          <span
            className={cn(
              "text-[10px] tabular-nums font-medium",
              isOverLimit
                ? "text-destructive font-bold"
                : isApproachingLimit
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground/70",
            )}
          >
            {draft.length.toLocaleString('de-DE')} / {MAX_SUPPORT_MESSAGE_LENGTH.toLocaleString('de-DE')}
          </span>
        </div>
      )}

      <div
        className={cn(
          "relative flex items-end gap-2 border shadow-xs focus-within:ring-1 transition-all duration-200 bg-white dark:bg-[#1A1A1A] text-foreground",
          isMultiline ? "rounded-2xl p-2 pl-3.5" : "rounded-full py-1 pl-4 pr-1.5",
          isOverLimit
            ? "border-destructive/60 focus-within:ring-destructive/30"
            : "border-border/80 dark:border-border/20 focus-within:ring-primary/25",
        )}
      >
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isComposingNewTicket
              ? "Beschreiben Sie Ihr Anliegen..."
              : "Antwort schreiben..."
          }
          disabled={isSending || !canReplyToSelection}
          rows={1}
          aria-label="Support-Nachricht eingeben"
          className={cn(
            "w-full flex-1 bg-transparent border-0 focus:ring-0 resize-none max-h-[140px] text-xs sm:text-sm placeholder:text-muted-foreground disabled:opacity-50 outline-none leading-relaxed overflow-y-auto",
            isMultiline ? "min-h-[36px] py-1" : "min-h-[32px] py-1.5",
          )}
        />

        <Button
          type="button"
          onClick={onSendMessage}
          disabled={
            !draft.trim() ||
            isSending ||
            !isAvailable ||
            !supportTraitsReady ||
            !canReplyToSelection ||
            isOverLimit
          }
          size="icon"
          aria-label={isComposingNewTicket ? 'Ticket erstellen' : 'Nachricht senden'}
          title={
            isOverLimit
              ? 'Nachricht ist zu lang'
              : isComposingNewTicket
              ? 'Ticket erstellen'
              : 'Nachricht senden'
          }
          className={cn(
            "rounded-full size-8 shrink-0 shadow-none transition-all active:scale-95 text-primary-foreground cursor-pointer",
            isMultiline ? "mb-0.5" : "my-auto",
            isOverLimit
              ? "bg-destructive hover:bg-destructive/90 disabled:opacity-40"
              : "bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:hover:bg-primary",
          )}
        >
          {isSending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ArrowUp className="size-3.5" />
          )}
        </Button>
      </div>

      {!supportTraitsReady && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {userEmail === 'Nicht angemeldet'
            ? 'Bitte melden Sie sich an, um Support-Nachrichten zu senden.'
            : 'Benutzerdaten werden geladen...'}
        </p>
      )}
    </div>
  )
})

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
    tickets,
    setTickets,
    selectedTicketId: storeSelectedTicketId,
    setSelectedTicketId: setStoreSelectedTicketId,
    isComposingNew: storeIsComposingNew,
    setIsComposingNew: setStoreIsComposingNew,
  } = useSupportStore()

  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticketsError, setTicketsError] = useState<string | null>(null)
  
  // View mode: 'inbox' (list of all tickets) | 'chat' (active conversation or new ticket draft)
  const [viewMode, setViewMode] = useState<'inbox' | 'chat'>('chat')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

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

  // Image Lightbox state
  const [lightboxImage, setLightboxImage] = useState<LightboxImageData | null>(null)

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
  const prevMessageCountRef = useRef(0)
  const prevTicketIdRef = useRef<string | null>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
    }
  }, [])

  useEffect(() => {
    if (viewMode === 'chat' && visibleMessages.length > 0) {
      if (
        visibleMessages.length !== prevMessageCountRef.current ||
        visibleTicketId !== prevTicketIdRef.current
      ) {
        prevMessageCountRef.current = visibleMessages.length
        prevTicketIdRef.current = visibleTicketId
        scrollToBottom(false)
      }
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
    if (!posthog || !isAvailable || !user?.id) return

    if (!isBackground) {
      setTicketsLoading(true)
    }
    try {
      const response = await loadSupportTickets(posthog, { limit: 25, offset: 0 })
      if (!response) return

      const normalizedTickets = response.results.toSorted((a, b) => {
        return new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime()
      })

      const isIdentical =
        tickets.length === normalizedTickets.length &&
        tickets.every((t, i) => {
          const n = normalizedTickets[i]
          return (
            t.id === n?.id &&
            t.status === n?.status &&
            t.last_message === n?.last_message &&
            t.unread_count === n?.unread_count
          )
        })

      if (!isIdentical) {
        setTickets(normalizedTickets)
      }

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
  }, [isAvailable, isComposingNewTicket, posthog, setTickets, setUnreadCount, tickets, user?.id])

  const refreshMessages = useCallback(async (ticketId: string | null, isBackground = false) => {
    if (!posthog || !isAvailable || !ticketId || !user?.id) {
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

      const newMessages = (response.messages || []) as SupportMessage[]
      setMessages((prev) => {
        if (prev.length === newMessages.length) {
          const identical = prev.every((m, i) => {
            const n = newMessages[i]
            return (
              m.id === n?.id &&
              m.content === n?.content &&
              m.status === n?.status &&
              m.error === n?.error
            )
          })
          if (identical) return prev
        }
        messagesCacheRef.current[ticketId] = newMessages
        return newMessages
      })

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
  }, [isAvailable, posthog, user?.id])

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
      const totalUnread = merged.reduce((total, ticket) => total + (ticket.unread_count || 0), 0)
      setUnreadCount(totalUnread)
    } catch (error) {
      setTicketsError(getSupportErrorMessage(error))
    } finally {
      setLoadingMoreTickets(false)
    }
  }, [isAvailable, posthog, setTickets, setUnreadCount, tickets])

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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    
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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setMessageError(null)
    setViewMode('chat')
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }

  const sendMessageContent = useCallback(
    async (content: string, failedMsgIdToReplace?: string) => {
      const message = content.trim()
      if (!message) return

      if (message.length > MAX_SUPPORT_MESSAGE_LENGTH) {
        const over = message.length - MAX_SUPPORT_MESSAGE_LENGTH
        setMessageError(
          `Die Nachricht ist um ${over.toLocaleString('de-DE')} Zeichen zu lang (maximal ${MAX_SUPPORT_MESSAGE_LENGTH.toLocaleString('de-DE')} Zeichen erlaubt). Bitte kürzen Sie Ihren Text.`,
        )
        return
      }

      if (!user?.id || !supportTraits) {
        setMessageError('Sie müssen angemeldet sein, um eine Nachricht an den Support zu senden.')
        return
      }

      if (
        !posthog ||
        !isAvailable ||
        !canReplyToSelection ||
        typeof posthog.conversations?.sendMessage !== 'function'
      ) {
        setMessageError('Der Support-Dienst ist momentan nicht bereit. Bitte versuchen Sie es in wenigen Sekunden erneut.')
        return
      }

      const isNew = isComposingNewTicket || !currentTicketId || selectedTicketId === null
      const tempMsgId = failedMsgIdToReplace || `temp-msg-${Date.now()}`
      const tempTicketId = selectedTicketId || currentTicketId || `temp-ticket-${Date.now()}`
      const nowIso = new Date().toISOString()

      const optimisticMessage: SupportMessage = {
        id: tempMsgId,
        content: message,
        author_type: 'customer',
        author_name: userDisplay.userName || 'Sie',
        created_at: nowIso,
        is_private: false,
        status: 'sending',
      }

      // 1. Instant optimistic message in chat
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== tempMsgId)
        const next = [...filtered, optimisticMessage]
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
        setTickets([optimisticTicket, ...tickets.filter((t) => t.id !== tempTicketId)])
        setSelectedTicketId(tempTicketId)
        setCurrentTicketId(tempTicketId)
        setIsComposingNewTicket(false)
      } else if (selectedTicketId) {
        setTickets(
          tickets.map((t) =>
            t.id === selectedTicketId
              ? { ...t, last_message: message, last_message_at: nowIso, message_count: t.message_count + 1 }
              : t,
          ),
        )
      }

      if (!failedMsgIdToReplace) {
        setDraft('')
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
      }

      setMessageError(null)
      setIsSending(true)
      setTimeout(() => scrollToBottom(true), 30)

      try {
        const response = await posthog.conversations.sendMessage(message, supportTraits, isNew)
        if (!response || !response.ticket_id) {
          throw new Error('Der Server hat keine Bestätigung für die Nachricht zurückgegeben.')
        }

        const realTicketId = response.ticket_id
        const realMsgId = response.message_id
        const realCreatedAt = response.created_at || nowIso

        // Replace temp IDs with real server IDs
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === tempMsgId
              ? { ...m, id: realMsgId, created_at: realCreatedAt, status: 'sent' as const, error: undefined }
              : m,
          )
          messagesCacheRef.current[realTicketId] = updated
          return updated
        })

        setTickets(
          tickets.map((t) =>
            t.id === tempTicketId || t.id === realTicketId
              ? {
                  ...t,
                  id: realTicketId,
                  status: response.ticket_status || t.status,
                  last_message: message,
                  last_message_at: realCreatedAt,
                }
              : t,
          ),
        )

        setSelectedTicketId(realTicketId)
        setCurrentTicketId(realTicketId)
        setIsComposingNewTicket(false)

        // Silent background sync without UI flashes
        void refreshTickets(true)
        void refreshMessages(realTicketId, true)
      } catch (error) {
        const errorMsg = getSupportErrorMessage(error)
        setMessageError(errorMsg)

        // Mark message as failed in UI so user can retry or edit
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === tempMsgId
              ? { ...m, status: 'failed' as const, error: errorMsg }
              : m,
          )
          messagesCacheRef.current[tempTicketId] = updated
          return updated
        })
      } finally {
        setIsSending(false)
      }
    },
    [
      canReplyToSelection,
      currentTicketId,
      isAvailable,
      isComposingNewTicket,
      posthog,
      refreshMessages,
      refreshTickets,
      scrollToBottom,
      selectedTicketId,
      setTickets,
      supportTraits,
      tickets,
      userDisplay.userName,
    ],
  )

  const handleSendMessage = () => {
    void sendMessageContent(draft)
  }

  const handleRetryMessage = (failedMsg: SupportMessage) => {
    void sendMessageContent(failedMsg.content, failedMsg.id)
  }

  const handleEditFailedMessage = (failedMsg: SupportMessage) => {
    setDraft(failedMsg.content)
    setMessages((prev) => prev.filter((m) => m.id !== failedMsg.id))
    setMessageError(null)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px'
          textareaRef.current.focus()
        }
      }, 50)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (statusFilter === 'open' && (ticket.status === 'resolved' || ticket.status === 'closed')) return false
      if (statusFilter === 'resolved' && ticket.status !== 'resolved' && ticket.status !== 'closed') return false
      if (statusFilter !== 'all' && statusFilter !== 'open' && statusFilter !== 'resolved' && ticket.status !== statusFilter) return false

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
                    className="h-8 gap-1.5 rounded-xl px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0 cursor-pointer"
                  >
                    <ArrowLeft className="size-3.5" />
                    <span>Übersicht</span>
                  </Button>
                  <div className="h-4 w-px bg-border/80 shrink-0" />
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <SheetTitle className="truncate text-sm font-bold text-foreground leading-tight">
                      {isComposingNewTicket
                        ? 'Neue Support-Anfrage'
                        : visibleTicket
                        ? formatTicketTitle(visibleTicket)
                        : 'Support-Chat'}
                    </SheetTitle>
                    {visibleTicket && !isComposingNewTicket && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-semibold border uppercase tracking-wider shrink-0 h-5 flex items-center gap-1.5 rounded-full shadow-2xs",
                          getTicketStatusClass(visibleTicket.status),
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full shrink-0",
                            getTicketStatusDotClass(visibleTicket.status),
                          )}
                        />
                        <span>{getTicketStatusLabel(visibleTicket.status)}</span>
                      </Badge>
                    )}
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

          {/* Body Content */}
          <div className="flex flex-1 flex-col overflow-hidden bg-background">
            {!user ? (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center animate-in fade-in-50 duration-200">
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                  <Lock className="size-6" />
                </div>
                <h3 className="mb-2 text-base font-bold text-foreground">
                  Anmeldung erforderlich
                </h3>
                <p className="mb-6 max-w-sm text-xs text-muted-foreground leading-relaxed">
                  Der Mietevo Support steht exklusiv angemeldeten Nutzern zur Verfügung. Bitte melden Sie sich mit Ihrem Konto an, um Support-Tickets zu erstellen oder einzusehen.
                </p>
                <Button asChild className="rounded-xl text-xs font-semibold shadow-xs">
                  <Link href="/auth/login">Jetzt anmelden</Link>
                </Button>
              </div>
            ) : availabilityTimedOut ? (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Headphones className="size-6" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-foreground">
                  Support aktuell nicht erreichbar
                </h3>
                <p className="mb-6 max-w-sm text-xs text-muted-foreground">
                  Der Support-Chat konnte nicht initialisiert werden. Bitte überprüfen Sie Ihre Internetverbindung oder versuchen Sie es in wenigen Momenten erneut.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAvailabilityTimedOut(false)
                    void refreshTickets()
                  }}
                  className="gap-2 rounded-xl text-xs font-medium"
                >
                  <RefreshCcw className="size-3.5" />
                  <span>Erneut versuchen</span>
                </Button>
              </div>
            ) : viewMode === 'inbox' ? (
              /* INBOX VIEW - All Tickets */
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Search & Actions Bar - matching templates modal look */}
                <div className="shrink-0 pb-3 pt-3 px-3.5 border-b border-border/70 space-y-2.5 bg-background/50">
                  {/* Single Row: Search, Filter, and Create Button */}
                  <div className="flex items-center gap-2">
                    {/* Search Bar - Takes most space */}
                    <div className="flex-1 min-w-0">
                      <SearchInput
                        placeholder="Tickets durchsuchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onClear={() => setSearchQuery("")}
                        mode="modal"
                        className="h-9 text-xs"
                        aria-label="Tickets durchsuchen"
                      />
                    </div>

                    {/* Status Filter - Select dropdown with Filter icon */}
                    <div className="min-w-0">
                      <div className="relative w-[125px] sm:w-[145px] min-w-0">
                        <Select
                          value={statusFilter}
                          onValueChange={(value) => setStatusFilter(value)}
                        >
                          <SelectTrigger className="w-full h-9 text-xs focus-visible:scale-100 focus:ring-1 border-border/80 px-2.5">
                            <div className="flex items-center gap-1.5 truncate">
                              <Filter className="size-3.5 text-muted-foreground shrink-0" />
                              <SelectValue placeholder="Status" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="z-50 min-w-[170px]">
                            <SelectItem value="all">Alle Status</SelectItem>
                            <SelectItem value="open">Offen</SelectItem>
                            <SelectItem value="pending">Ausstehend</SelectItem>
                            <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                            <SelectItem value="new">Neu</SelectItem>
                            <SelectItem value="on_hold">Pausiert</SelectItem>
                            <SelectItem value="resolved">Gelöst</SelectItem>
                            <SelectItem value="closed">Geschlossen</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Create Ticket Button */}
                    <Button
                      type="button"
                      onClick={handleStartNewTicket}
                      className="shrink-0 h-9 px-3 gap-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/95 cursor-pointer"
                      aria-label="Neues Ticket erstellen"
                    >
                      <Plus className="size-3.5" />
                      <span className="hidden sm:inline">Neues Ticket</span>
                      <span className="sm:hidden">Neu</span>
                    </Button>
                  </div>

                  {/* Active Filters Row (matching templates modal) */}
                  {(searchQuery || statusFilter !== 'all') && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border/60 animate-in fade-in-50 duration-150">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        <span className="hidden sm:inline">Aktive Filter:</span>
                        <span className="sm:hidden">Filter:</span>
                      </span>
                      {searchQuery && (
                        <Badge variant="outline" className="text-[11px] font-normal gap-1 bg-muted/40 py-0 px-2 h-5">
                          <span>Suche: "{searchQuery}"</span>
                        </Badge>
                      )}
                      {statusFilter !== 'all' && (
                        <Badge variant="outline" className="text-[11px] font-normal gap-1 bg-muted/40 py-0 px-2 h-5">
                          <span>Status: {statusFilter === 'open' ? 'Offen' : getTicketStatusLabel(statusFilter)}</span>
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchQuery('')
                          setStatusFilter('all')
                        }}
                        className="h-5 px-2 text-[11px] text-muted-foreground hover:text-foreground ml-auto rounded-md cursor-pointer"
                      >
                        Zurücksetzen
                      </Button>
                    </div>
                  )}
                </div>

                {/* Ticket List */}
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-2">
                    {ticketsLoading && tickets.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <Loader2 className="size-6 animate-spin mb-3 text-primary" />
                        <p className="text-xs font-medium">Lade Support-Anfragen...</p>
                      </div>
                    ) : filteredTickets.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
                          <Inbox className="size-6" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">Keine Anfragen gefunden</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs mb-3">
                          {searchQuery || statusFilter !== 'all'
                            ? 'Versuchen Sie andere Suchbegriffe oder Filter.'
                            : 'Erstellen Sie Ihr erstes Support-Ticket über den Button oben.'}
                        </p>
                        {(searchQuery || statusFilter !== 'all') && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchQuery('')
                              setStatusFilter('all')
                            }}
                            className="h-8 text-xs rounded-xl cursor-pointer"
                          >
                            Filter zurücksetzen
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
                        {filteredTickets.map((ticket) => {
                          const isCurrent = ticket.id === currentTicketId
                          const isResolved = ticket.status === 'resolved' || ticket.status === 'closed'
                          const unread = ticket.unread_count || 0

                          return (
                            <button
                              key={ticket.id}
                              type="button"
                              onClick={() => handleSelectTicket(ticket)}
                              className={cn(
                                "group relative flex w-full flex-col gap-1.5 rounded-xl border p-3 text-left transition-all hover:shadow-xs active:scale-99 cursor-pointer",
                                isCurrent
                                  ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                                  : "border-border/70 bg-card hover:border-border hover:bg-muted/40"
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "px-2 py-0.5 text-[10px] font-semibold border uppercase tracking-wider shrink-0 flex items-center gap-1.5 rounded-full shadow-2xs",
                                      getTicketStatusClass(ticket.status),
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "size-1.5 rounded-full shrink-0",
                                        getTicketStatusDotClass(ticket.status),
                                      )}
                                    />
                                    <span>{getTicketStatusLabel(ticket.status)}</span>
                                  </Badge>
                                  <span className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                                    {formatTicketTitle(ticket)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {unread > 0 && (
                                    <span className="flex min-w-4 h-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground px-1">
                                      {unread}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-muted-foreground font-normal">
                                    {formatRelativeTime(ticket.last_message_at || ticket.created_at)}
                                  </span>
                                  <ChevronRight className="size-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                                </div>
                              </div>

                              <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                                {ticket.last_message || 'Keine Nachrichtenvorschau'}
                              </p>
                            </button>
                          )
                        })}

                        {tickets.length < totalTicketsCount && (
                          <div className="pt-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => void loadMoreTickets()}
                              disabled={loadingMoreTickets}
                              className="text-xs text-muted-foreground hover:text-foreground rounded-xl"
                            >
                              {loadingMoreTickets ? (
                                <>
                                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                                  <span>Lade weitere...</span>
                                </>
                              ) : (
                                <span>Weitere Anfragen laden ({totalTicketsCount - tickets.length})</span>
                              )}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              /* CHAT VIEW - Conversation Stream */
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto p-4">
                  {messagesLoading && messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                      <Loader2 className="size-6 animate-spin mb-3 text-primary" />
                      <p className="text-xs font-medium">Lade Unterhaltung...</p>
                    </div>
                  ) : visibleMessages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
                      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                        <MessageSquarePlus className="size-6" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground">
                        {isComposingNewTicket ? 'Wie können wir Ihnen helfen?' : 'Keine Nachrichten vorhanden'}
                      </h4>
                      <p className="mt-1.5 max-w-xs text-xs text-muted-foreground leading-relaxed">
                        {isComposingNewTicket
                          ? 'Beschreiben Sie Ihr Anliegen im Textfeld unten. Unser Team antwortet Ihnen schnellstmöglich.'
                          : 'Senden Sie Ihre erste Nachricht, um die Unterhaltung zu starten.'}
                      </p>
                    </div>
                  ) : null}

                  {hasMoreMessages && (
                    <div className="mb-3 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void loadOlderMessages()}
                        disabled={loadingOlderMessages}
                        className="h-7 text-[11px] text-muted-foreground rounded-lg"
                      >
                        {loadingOlderMessages ? (
                          <Loader2 className="size-3 animate-spin mr-1" />
                        ) : (
                          'Ältere Nachrichten laden'
                        )}
                      </Button>
                    </div>
                  )}

                  <div className="space-y-4">
                    {visibleMessages.map((message) => (
                      <SupportMessageBubble
                        key={message.id}
                        message={message}
                        onOpenImage={setLightboxImage}
                        onRetryMessage={handleRetryMessage}
                        onEditFailedMessage={handleEditFailedMessage}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Message Composer */}
                <SupportComposer
                  draft={draft}
                  setDraft={setDraft}
                  isSending={isSending}
                  isComposingNewTicket={isComposingNewTicket}
                  canReplyToSelection={canReplyToSelection}
                  isAvailable={isAvailable}
                  supportTraitsReady={Boolean(supportTraits)}
                  messageError={messageError}
                  onClearMessageError={() => setMessageError(null)}
                  onSendMessage={handleSendMessage}
                  onStartNewTicket={handleStartNewTicket}
                  userEmail={userDisplay.userEmail}
                  textareaRef={textareaRef}
                />
              </div>
            )}
          </div>
        </div>
      </SheetContent>

      {/* Full Resolution Image Lightbox Dialog */}
      <SupportImageLightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </Sheet>
  )
}
