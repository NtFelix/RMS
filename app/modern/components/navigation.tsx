"use client"

import { useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { Menu, X, DollarSign, Home, User as UserIcon, LogIn, LogOut, Check, LayoutDashboard, BookOpen, Package, Wrench, Lightbulb, HelpCircle, FileText, Building2, Users, Calculator, TrendingUp, BarChart3, Shield, Zap, MessageSquare, Phone, Mail, ChevronDown, Settings, ArrowRight, Sparkles } from "lucide-react"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { LOGO_URL } from "@/lib/constants"
import { Button } from '@/components/ui/button'
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PillContainer } from "@/components/ui/pill-container";
import { useUserProfile } from "@/hooks/use-user-profile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuthModal } from "@/components/auth-modal-provider";
import { useIsOverflowing } from "@/hooks/use-responsive";

// Navigation dropdown items
const produkteItems = [
  { name: "Web-Anwendung", href: "/home", icon: LayoutDashboard, description: "Die Web-Anwendung" },
  { name: "Browser-Erweiterung", href: "/warteliste/browser-erweiterung", icon: Package, description: "Demnächst verfügbar" },
  { name: "Mobile App", href: "/warteliste/mobile-app", icon: Phone, description: "Demnächst verfügbar" },
]

const funktionenItems = [
  { name: "Wohnungsverwaltung", href: "/funktionen/wohnungsverwaltung", icon: Building2, description: "Verwalten Sie Ihre Wohnungen zentral" },
  { name: "Finanzverwaltung", href: "/funktionen/finanzverwaltung", icon: TrendingUp, description: "Behalten Sie Ihre Finanzen im Blick" },
  { name: "Betriebskosten", href: "/funktionen/betriebskosten", icon: Calculator, description: "Automatische Nebenkostenabrechnung" },
]

const loesungenItems = [
  { name: "Für Privatvermieter", href: "/loesungen/privatvermieter", icon: Home, description: "Perfekt für private Vermieter" },
  { name: "Für kleine bis mittlere Hausverwaltungen", href: "/loesungen/kleine-mittlere-hausverwaltungen", icon: Building2, description: "Professionelle Verwaltungslösung" },
  { name: "Für große Hausverwaltungen", href: "/loesungen/grosse-hausverwaltungen", icon: TrendingUp, description: "Enterprise-Lösungen für große Portfolios" },
]

const hilfeItems = [
  { name: "Dokumentation", href: "/hilfe/dokumentation", icon: BookOpen, description: "Ausführliche Anleitungen" },
  { name: "Support", href: "#cta", icon: MessageSquare, description: "Kontaktieren Sie unser Team" },
  { name: "Kontakt", href: "#cta", icon: Mail, description: "Schreiben Sie uns" },
]

interface NavigationProps {
  onLogin?: () => void;
}


export default function Navigation({ onLogin }: NavigationProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { userName } = useUserProfile();
  const { ref: navRef, isOverflowing } = useIsOverflowing();
  const showProdukte = useFeatureFlagEnabled('show-produkte-dropdown');
  const showLoesungen = useFeatureFlagEnabled('show-loesungen-dropdown');
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const checkIfMobile = useCallback(() => {
    if (typeof window === 'undefined' || !hasMounted) return;
    const isSmallScreen = window.innerWidth < 768;
    const shouldUseMobile = isSmallScreen || isOverflowing;
    setIsMobile(shouldUseMobile);
  }, [isOverflowing, hasMounted]);

  useEffect(() => {
    if (!hasMounted) return;

    checkIfMobile();

    const handleResize = () => {
      checkIfMobile();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkIfMobile, hasMounted]);

  useEffect(() => {
    const supabase = createClient();
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleNavClick = (href: string) => {
    if (href.startsWith("#") && pathname === "/") {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
      setIsOpen(false);
    } else if (href.startsWith("#")) {
      window.location.href = `/${href}`;
    } else {
      window.location.href = href;
    }
  };

  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      // If we're not on a page with the pricing section, redirect to home with hash
      window.location.href = '/#pricing';
    }
  };

  const handleOpenLoginModal = () => {
    try {
      sessionStorage.removeItem('authIntent');
    } catch (e) {
      console.warn('SessionStorage not available');
    }
    if (onLogin) {
      onLogin();
    } else {
      router.push('/auth/login');
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (!hasMounted) {
    return <nav className="fixed top-2 sm:top-4 left-0 right-0 z-50 px-2 sm:px-4 h-16"></nav>;
  }

  const renderNavItem = (item: { name: string; href: string; icon: any; description: string }, index: number) => (
    <Link
      key={index}
      href={item.href}
      onClick={() => setIsOpen(false)}
      className="flex items-center w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 hover:bg-muted/50"
    >
      <item.icon className="w-5 h-5 mr-3" />
      <div>
        <div className="font-medium">{item.name}</div>
        <div className="text-sm text-muted-foreground">{item.description}</div>
      </div>
    </Link>
  );

  return (
    <nav className="fixed top-2 sm:top-4 left-0 right-0 z-50 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Header with Menu Button and Logo */}
        {(isMobile || isOverflowing) && (
          <div className="flex items-center space-x-2">
            <PillContainer>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-200 hover:text-foreground dark:btn-ghost-hover transition-colors duration-200 flex items-center space-x-2"
              >
                <Menu className="w-5 h-5" />
                <span className="text-sm font-medium">Menü</span>
              </button>
            </PillContainer>
            <Link href="/" className="flex items-center space-x-1 group">
              <div className="relative w-6 h-6 rounded-full group-hover:scale-110 transition-transform overflow-hidden">
                <Image
                  src={LOGO_URL}
                  alt="Mietevo Logo"
                  fill
                  className="object-cover"
                  unoptimized // Supabase images are stored as pre-optimized .avif
                />
              </div>
              <span className="text-base font-bold text-foreground group-hover:text-foreground/80 transition-colors">
                <span className="text-primary">Miet</span>evo
              </span>
            </Link>
          </div>
        )}

        {/* Desktop Navigation */}
        {!isMobile && !isOverflowing && (
          <div className="flex justify-center">
            <div className="inline-flex w-auto max-w-full" ref={navRef}>
              <PillContainer className="flex items-center gap-2 w-full">
                {/* Logo Section */}
                <Link href="/" className="flex items-center space-x-2 group px-2">
                  <div className="relative w-8 h-8 rounded-full group-hover:scale-110 transition-transform overflow-hidden">
                    <Image
                      src={LOGO_URL}
                      alt="Mietevo Logo"
                      fill
                      className="object-cover"
                      unoptimized // Supabase images are stored as pre-optimized .avif
                    />
                  </div>
                  <span className="text-xl font-bold text-foreground group-hover:text-foreground/80 transition-colors whitespace-nowrap">
                    <span className="text-primary">Miet</span>evo
                  </span>
                </Link>

                {/* Divider */}
                <div className="h-8 w-px bg-border/50 mx-2" />

                {/* Navigation Items Section */}
                <div className="flex items-center gap-1">
                  {/* Produkte Dropdown */}
                  {showProdukte && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 hover:text-foreground dark:btn-ghost-hover transition-colors duration-200 flex items-center space-x-1 whitespace-nowrap">
                          <Package className="w-4 h-4" />
                          <span>Produkte</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-72">
                        {produkteItems.map((item, index) => (
                          <DropdownMenuItem key={index} asChild>
                            <Link href={item.href}>
                              <item.icon className="w-4 h-4 shrink-0" />
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 hover:text-foreground dark:btn-ghost-hover transition-colors duration-200 flex items-center space-x-1 whitespace-nowrap">
                        <Wrench className="w-4 h-4" />
                        <span>Funktionen</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[600px] p-0">
                      <div className="grid grid-cols-2">
                        <div className="p-2">
                          {funktionenItems.map((item, index) => (
                            <DropdownMenuItem key={index} asChild>
                              <Link href={item.href}>
                                <item.icon className="w-4 h-4 shrink-0" />
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="font-medium">{item.name}</span>
                                  <span className="text-xs text-muted-foreground">{item.description}</span>
                                </div>
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </div>
                        <div className="p-2">
                          <div className="h-full w-full rounded-xl bg-gradient-to-br from-primary/5 via-muted/20 to-transparent border border-border/50 p-4 flex flex-col justify-between relative overflow-hidden group/card hover:border-primary/20 transition-colors">
                            {/* Abstract shapes/illustration */}
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover/card:bg-primary/20 transition-colors duration-500" />
                            <div className="absolute right-2 top-2 opacity-[0.08] group-hover/card:opacity-[0.15] transition-all duration-500 transform group-hover/card:scale-110 group-hover/card:-rotate-6">
                              <Sparkles className="w-20 h-20" />
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
                                  onClick={() => router.push('/auth/register')}
                                  size="sm"
                                  className="w-full group h-8 text-xs"
                                >
                                  Kostenlos starten
                                  <ArrowRight className="w-3 h-3 ml-2 transition-transform group-hover:translate-x-1" />
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 hover:text-foreground dark:btn-ghost-hover transition-colors duration-200 flex items-center space-x-1 whitespace-nowrap">
                          <Lightbulb className="w-4 h-4" />
                          <span>Lösungen</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-72">
                        {loesungenItems.map((item, index) => (
                          <DropdownMenuItem key={index} asChild>
                            <Link href={item.href}>
                              <item.icon className="w-4 h-4 shrink-0" />
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
                  <Link href="/preise" className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 hover:text-foreground dark:btn-ghost-hover transition-colors duration-200 flex items-center space-x-1 whitespace-nowrap">
                    <DollarSign className="w-4 h-4" />
                    <span>Preise</span>
                  </Link>

                  {/* Hilfe Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 hover:text-foreground dark:btn-ghost-hover transition-colors duration-200 flex items-center space-x-1 whitespace-nowrap">
                        <HelpCircle className="w-4 h-4" />
                        <span>Hilfe</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72">
                      {hilfeItems.map((item, index) => (
                        <DropdownMenuItem key={index} asChild>
                          <Link href={item.href}>
                            <item.icon className="w-4 h-4 shrink-0" />
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
                <div className="flex items-center pr-0">
                  {currentUser ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="px-2 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 hover:text-foreground dark:btn-ghost-hover transition-colors duration-200 flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={currentUser.user_metadata?.avatar_url} alt={currentUser.email || 'User'} />
                            <AvatarFallback className="text-xs">
                              {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="whitespace-nowrap">Mein Konto</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-60 p-2">
                        <div className="flex items-center space-x-3 px-2 py-2">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={currentUser.user_metadata?.avatar_url} alt={currentUser.email || 'User'} />
                            <AvatarFallback className="text-sm">
                              {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium line-clamp-1">
                              {userName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {currentUser.email || 'Konto verwalten'}
                            </p>
                          </div>
                        </div>
                        <DropdownMenuSeparator className="my-2" />
                        <DropdownMenuItem asChild className="px-3 py-2 rounded-xl group">
                          <Link href="/home" className="w-full hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary/90">
                            <LayoutDashboard className="w-4 h-4 mr-3 text-muted-foreground group-hover:text-white" />
                            <span>Dashboard</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="px-3 py-2 rounded-xl group hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary/90 cursor-pointer"
                          onClick={() => {
                            // Navigate to dashboard first
                            window.location.href = '/home';
                            // Then open settings after a small delay to ensure navigation completes
                            setTimeout(() => {
                              setIsSettingsOpen(true);
                            }, 100);
                          }}
                        >
                          <Settings className="w-4 h-4 mr-3 text-muted-foreground group-hover:text-white" />
                          <span>Einstellungen</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-2" />
                        <DropdownMenuItem
                          onClick={handleLogout}
                          className="px-3 py-2 rounded-xl group hover:bg-red-600 hover:text-white dark:hover:bg-red-600/90 cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 mr-3 group-hover:text-white" />
                          <span className="group-hover:text-white">Abmelden</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        onClick={handleOpenLoginModal}
                        className="px-4 py-2 h-9 text-sm font-medium text-foreground hover:bg-muted/50"
                      >
                        Anmelden
                      </Button>
                      <Button
                        onClick={() => router.push('/auth/register')}
                        className="ml-2 px-4 py-2 h-9 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Kostenlos testen
                      </Button>
                    </>
                  )}
                </div>
              </PillContainer>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
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
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-full hover:bg-muted transition-colors"
                      aria-label="Menü schließen"
                    >
                      <X className="w-5 h-5" />
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
                      {produkteItems.map((item, index) => renderNavItem(item, index))}
                    </div>
                  )}

                  {/* Funktionen Section */}
                  <div className="mb-4">
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Funktionen
                    </div>
                    {funktionenItems.map((item, index) => renderNavItem(item, index))}
                  </div>

                  {/* Lösungen Section */}
                  {showLoesungen && (
                    <div className="mb-4">
                      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Lösungen
                      </div>
                      {loesungenItems.map((item, index) => renderNavItem(item, index))}
                    </div>
                  )}

                  {/* Preise Section */}
                  <div className="mb-4">
                    <Link
                      href="/preise"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 hover:bg-muted/50"
                    >
                      <DollarSign className="w-5 h-5 mr-3" />
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
                    {hilfeItems.map((item, index) => renderNavItem(item, index))}
                  </div>
                </div>

                {/* Auth Section */}
                <div className="p-4 border-t border-border/50">
                  {currentUser ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 px-2">
                        <Avatar className="h-10 w-10">
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
                        <Link href="/home">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Dashboard
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" />
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
    </nav>
  )
}
