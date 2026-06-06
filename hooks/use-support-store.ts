import { create } from 'zustand'

interface SupportState {
  isOpen: boolean
  unreadCount: number
  isAvailable: boolean
  setOpen: (isOpen: boolean) => void
  openSupport: () => void
  closeSupport: () => void
  setUnreadCount: (count: number) => void
  setIsAvailable: (isAvailable: boolean) => void
}

export const useSupportStore = create<SupportState>((set) => ({
  isOpen: false,
  unreadCount: 0,
  isAvailable: false,
  setOpen: (isOpen) => set({ isOpen }),
  openSupport: () => set({ isOpen: true }),
  closeSupport: () => set({ isOpen: false }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setIsAvailable: (isAvailable) => set({ isAvailable }),
}))

