"use client"

import { Package, Wrench, ChevronDown, Sparkles, ArrowRight, Lightbulb, DollarSign, HelpCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { PillContainer } from "@/components/ui/pill-container"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LOGO_URL, BRAND_NAME_PART_1, BRAND_NAME_PART_2 } from "@/lib/constants"
import { trackNavLinkClicked, trackNavDropdownOpened } from "@/lib/posthog-landing-events"
import { NavUserMenu } from "./NavUserMenu"
import { produkteItems, funktionenItems, loesungenItems, hilfeItems } from "./constants"

interface DesktopNavigationProps {
  navRef: React.RefObject<HTMLDivElement | null>
  showProdukte: boolean
  showLoesungen: boolean
  currentUser: User | null
  handleLogout: () => Promise<void>
  handleOpenLoginModal: () => void
  handleRegisterClick: () => void
}

export function DesktopNavigation({
  navRef,
  showProdukte,
  showLoesungen,
  currentUser,
  handleLogout,
  handleOpenLoginModal,
  handleRegisterClick,
}: DesktopNavigationProps) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex w-auto max-w-full" ref={navRef}>
        <PillContainer className="flex items-center gap-2 w-full">
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-2 group px-2">
            <div className="relative size-8 rounded-full group-hover:scale-110 transition-transform overflow-hidden">
              <Image
                src={LOGO_URL}
                alt="Mietevo Logo"
                fill
                sizes="32px"
                className="object-cover"
                unoptimized
              />
            </div>
            <span className="text-xl font-bold text-foreground group-hover:text-foreground/80 transition-colors whitespace-nowrap">
              <span className="text-primary">{BRAND_NAME_PART_1}</span>{BRAND_NAME_PART_2}
            </span>
          </Link>

          {/* Divider */}
          <div className="h-8 w-px bg-border/50 mx-2" />

          {/* Navigation Items Section */}
          <div className="flex items-center gap-1">
            {/* Produkte Dropdown */}
            {showProdukte && (
              <DropdownMenu onOpenChange={(open) => open && trackNavDropdownOpened('produkte')}>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 hover:text-foreground dark:btn-ghost-hover transition-colors duration-200 flex items-center gap-1 whitespace-nowrap cursor-pointer">
                    <Package className="size-4" />
                    <span>Produkte</span>
                    <ChevronDown className="size-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  {produkteItems.map((item) => (
                    <DropdownMenuItem key={item.name} asChild>
                      <Link href={item.href} onClick={() => trackNavLinkClicked(item.name, item.href, 'produkte')}>
                        <item.icon className="size-4 shrink-0" />
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-xs text-muted-foreground">{item.description}</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Funktionen Dropdown */}
            <DropdownMenu onOpenChange={(open) => open && trackNavDropdownOpened('funktionen')}>
              <DropdownMenuTrigger asChild>
                <button type="button" className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 hover:text-foreground dark:btn-ghost-hover transition-colors duration-200 flex items-center gap-1 whitespace-nowrap cursor-pointer">
                  <Wrench className="size-4" />
                  <span>Funktionen</span>
                  <ChevronDown className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[600px] p-0">
                <div className="grid grid-cols-2">
                  <div className="p-2">
                    {funktionenItems.map((item) => (
                      <DropdownMenuItem key={item.name} asChild>
                        <Link href={item.href} onClick={() => trackNavLinkClicked(item.name, item.href, 'funktionen')}>
                          <item.icon className="size-4 shrink-0" />
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <div className="p-2">
                    <div className="h-full w-full rounded-xl bg-linear-to-br from-primary/5 via-muted/20 to-transparent border border-border/50 p-4 flex flex-col justify-between relative overflow-hidden group/card hover:border-primary/20 transition-colors">
                      <div className="absolute -right-6 -top-6 size-32 bg-primary/10 rounded-full blur-3xl group-hover/card:bg-primary/20 transition-colors duration-500" />
                      <div className="absolute right-2 top-2 opacity-[0.08] group-hover/card:opacity-[0.15] transition-all duration-500 transform group-hover/card:scale-110 group-hover/card:-rotate-6">
                        <Sparkles className="size-20" />
                      </div>

                      <div className="relative z-10">
                        <div className="font-semibold text-sm mb-1">Mietevo erleben</div>
                        <p className="text-xs text-muted-foreground">
                          Starten Sie jetzt und entdecken Sie alle Funktionen in der kostenlosen Testphase.
                        </p>
                      </div>

                      <div className="relative z-10 mt-2">
                        <DropdownMenuItem asChild>
                          <Button
                            onClick={handleRegisterClick}
                            size="sm"
                            className="w-full group h-8 text-xs"
                          >
                            Kostenlos starten
                            <ArrowRight className="size-3 ml-2 transition-transform group-hover:translate-x-1" />
                          </Button>
                        </DropdownMenuItem>
                      </div>
                    </div>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Lösungen Dropdown */}
            {showLoesungen && (
              <DropdownMenu onOpenChange={(open) => open && trackNavDropdownOpened('loesungen')}>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 hover:text-foreground dark:btn-ghost-hover transition-colors duration-200 flex items-center gap-1 whitespace-nowrap cursor-pointer">
                    <Lightbulb className="size-4" />
                    <span>Lösungen</span>
                    <ChevronDown className="size-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  {loesungenItems.map((item) => (
                    <DropdownMenuItem key={item.name} asChild>
                      <Link href={item.href} onClick={() => trackNavLinkClicked(item.name, item.href, 'loesungen')}>
                        <item.icon className="size-4 shrink-0" />
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-xs text-muted-foreground">{item.description}</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Preise Link */}
            <Link
              href="/preise"
              onClick={() => trackNavLinkClicked('Preise', '/preise')}
              className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 hover:text-foreground dark:btn-ghost-hover transition-colors duration-200 flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <DollarSign className="size-4" />
              <span>Preise</span>
            </Link>

            {/* Hilfe Dropdown */}
            <DropdownMenu onOpenChange={(open) => open && trackNavDropdownOpened('hilfe')}>
              <DropdownMenuTrigger asChild>
                <button type="button" className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 hover:text-foreground dark:btn-ghost-hover transition-colors duration-200 flex items-center gap-1 whitespace-nowrap cursor-pointer">
                  <HelpCircle className="size-4" />
                  <span>Hilfe</span>
                  <ChevronDown className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                {hilfeItems.map((item) => (
                  <DropdownMenuItem key={item.name} asChild>
                    <Link
                      href={item.href}
                      onClick={() => trackNavLinkClicked(item.name, item.href, 'hilfe')}
                    >
                      <item.icon className="size-4 shrink-0" />
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-border/50 mx-2" />

          {/* Auth Section */}
          <NavUserMenu
            currentUser={currentUser}
            handleLogout={handleLogout}
            handleOpenLoginModal={handleOpenLoginModal}
            handleRegisterClick={handleRegisterClick}
          />
        </PillContainer>
      </div>
    </div>
  )
}
