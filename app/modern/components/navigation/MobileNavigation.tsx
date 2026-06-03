"use client"

import { AnimatePresence, motion } from "framer-motion"
import { X, DollarSign, LayoutDashboard, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ROUTES } from "@/lib/constants"
import { trackNavLinkClicked } from "@/lib/posthog-landing-events"
import type { NavItem } from "@/lib/types"
import type { NavDropdown } from "@/lib/posthog-landing-events"
import { produkteItems, funktionenItems, loesungenItems, hilfeItems } from "./constants"

interface MobileNavigationProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  showProdukte: boolean
  showLoesungen: boolean
  currentUser: User | null
  handleLogout: () => Promise<void>
  handleOpenLoginModal: () => void
}

export function MobileNavigation({
  isOpen,
  setIsOpen,
  showProdukte,
  showLoesungen,
  currentUser,
  handleLogout,
  handleOpenLoginModal,
}: MobileNavigationProps) {
  const router = useRouter()

  const renderNavItem = (item: NavItem, dropdown?: NavDropdown) => (
    <Link
      key={item.name}
      href={item.href}
      target={item.target}
      rel={item.rel}
      onClick={() => {
        trackNavLinkClicked(item.name, item.href, dropdown);
        setIsOpen(false);
      }}
      className="flex items-center w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 hover:bg-muted/50"
    >
      <item.icon className="size-5 mr-3" />
      <div>
        <div className="font-medium">
          {item.name}
          {item.target === "_blank" && (
            <span className="sr-only"> (öffnet in neuem Tab)</span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">{item.description}</div>
      </div>
    </Link>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-xs z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Mobile Menu */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="fixed inset-y-0 left-0 w-80 max-w-[90vw] bg-background border-r border-border/50 z-50 shadow-xl overflow-y-auto"
          >
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Navigation</h3>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-full hover:bg-muted transition-colors"
                    aria-label="Menü schließen"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {/* Produkte Section */}
                {showProdukte && (
                  <div className="mb-4">
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Produkte
                    </div>
                    {produkteItems.map((item) => renderNavItem(item))}
                  </div>
                )}

                {/* Funktionen Section */}
                <div className="mb-4">
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Funktionen
                  </div>
                  {funktionenItems.map((item) => renderNavItem(item))}
                </div>

                {/* Lösungen Section */}
                {showLoesungen && (
                  <div className="mb-4">
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Lösungen
                    </div>
                    {loesungenItems.map((item) => renderNavItem(item))}
                  </div>
                )}

                {/* Preise Section */}
                <div className="mb-4">
                  <Link
                    href="/preise"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 hover:bg-muted/50"
                  >
                    <DollarSign className="size-5 mr-3" />
                    <div>
                      <div className="font-medium">Preise</div>
                      <div className="text-sm text-muted-foreground">Unsere Tarife im Überblick</div>
                    </div>
                  </Link>
                </div>

                {/* Hilfe Section */}
                <div className="mb-4">
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Hilfe
                  </div>
                  {hilfeItems.map((item) => renderNavItem(item))}
                </div>
              </div>

              {/* Auth Section */}
              <div className="p-4 border-t border-border/50">
                {currentUser ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-2">
                      <Avatar className="size-10">
                        <AvatarImage src={currentUser.user_metadata?.avatar_url} alt={currentUser.email || 'User'} />
                        <AvatarFallback>
                          {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{currentUser.email}</p>
                        <p className="text-xs text-muted-foreground">Konto verwalten</p>
                      </div>
                    </div>
                    <Button asChild variant="outline" className="w-full">
                      <Link href={ROUTES.HOME}>
                        <LayoutDashboard className="size-4 mr-2" />
                        Dashboard
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleLogout}>
                      <LogOut className="size-4 mr-2" />
                      Abmelden
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button onClick={handleOpenLoginModal} className="w-full">
                      Anmelden
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/auth/register')} className="w-full">
                      Kostenlos testen
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
