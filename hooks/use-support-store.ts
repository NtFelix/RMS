import { create } from 'zustand'
import type { SupportTicket } from '@/lib/posthog-support'

interface SupportState {
  isOpen: boolean
  unreadCount: number
  isAvailable: boolean
  tickets: SupportTicket[]
  selectedTicketId: string | null
  isComposingNew: boolean
  setOpen: (isOpen: boolean) => void
  openSupport: () => void
  openSupportWithTicket: (ticketId: string) => void
  openSupportNewTicket: () => void
  closeSupport: () => void
  setUnreadCount: (count: number) => void
  setIsAvailable: (isAvailable: boolean) => void
  setTickets: (tickets: SupportTicket[] | ((prev: SupportTicket[]) => SupportTicket[])) => void
  setSelectedTicketId: (ticketId: string | null) => void
  setIsComposingNew: (isComposing: boolean) => void
}

export const useSupportStore = create<SupportState>((set) => ({
  isOpen: false,
  unreadCount: 0,
  isAvailable: false,
  tickets: [],
  selectedTicketId: null,
  isComposingNew: false,
  setOpen: (isOpen) => set({ isOpen }),
  openSupport: () => set({ isOpen: true }),
  openSupportWithTicket: (ticketId) => set({ isOpen: true, selectedTicketId: ticketId, isComposingNew: false }),
  openSupportNewTicket: () => set({ isOpen: true, selectedTicketId: null, isComposingNew: true }),
  closeSupport: () => set({ isOpen: false }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setIsAvailable: (isAvailable) => set({ isAvailable }),
  setTickets: (tickets) =>
    set((state) => ({
      tickets: typeof tickets === 'function' ? tickets(state.tickets) : tickets,
    })),
  setSelectedTicketId: (selectedTicketId) => set({ selectedTicketId }),
  setIsComposingNew: (isComposingNew) => set({ isComposingNew }),
}))
