"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Menu, X, DollarSign, Home, User as UserIcon, LogIn, LogOut, Check, LayoutDashboard, BookOpen } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LOGO_URL } from "@/lib/constants"
import { Button } from '@/components/ui/button'

interface DashboardMenuItemProps {
  onClick?: () => void;
}

const DashboardMenuItem = ({ onClick }: DashboardMenuItemProps) => (
  <DropdownMenuItem asChild>
    <Link 
      href="/home" 
      className="flex items-center cursor-pointer relative overflow-hidden group" 
      onClick={onClick}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
      <LayoutDashboard className="w-4 h-4 mr-2 relative z-10" />
      <span className="relative z-10">Dashboard</span>
    </Link>
  </DropdownMenuItem>
);
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import AuthModal from "@/components/auth-modal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PillContainer } from "@/components/ui/pill-container";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { name: "Startseite", href: "#hero", icon: Home },
  { name: "Funktionen", href: "#features", icon: Check },
  { name: "Preise", href: "#pricing", icon: DollarSign },
]

const staticNavItems = [
  { name: "Dokumentation", href: "/dokumentation", icon: BookOpen },
]

interface NavigationProps {
  onLogin?: () => void;
}

// Custom hook for debounced window resize events
function useDebouncedResize(callback: () => void, delay = 100) {
  // Store the callback in a ref to avoid re-subscribing on every render
  const savedCallback = useRef(callback);
  
  // Update the saved callback if it changes
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout>;
    
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => savedCallback.current(), delay);
    };
    
    // Add event listener
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      
      // Initial call
      handleResize();
    }
    
    // Clean up
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
      clearTimeout(resizeTimer);
    };
  }, [delay]);
}

// Custom hook to check if container is overflowing
function useIsOverflowing() {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  const ref = useCallback((node: HTMLElement | null) => {
    if (node !== null) {
      setContainer(node);
    }
  }, []);

  const checkOverflow = useCallback(() => {
    if (container) {
      const { scrollWidth, clientWidth } = container;
      setIsOverflowing(scrollWidth > clientWidth);
    }
  }, [container]);

  // Use the debounced resize hook
  useDebouncedResize(checkOverflow);
  
  // Check for mutations (like when content changes)
  useEffect(() => {
    if (!container) return;
    
    // Initial check
    checkOverflow();
    
    const observer = new MutationObserver(checkOverflow);
    observer.observe(container, { childList: true, subtree: true });
    
    return () => {
      observer.disconnect();
    };
  }, [container, checkOverflow]);

  return { ref, isOverflowing };
}

export default function Navigation({ onLogin }: NavigationProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Check if the navigation is overflowing
  const { ref: navRef, isOverflowing } = useIsOverflowing();
  
  // Set hasMounted to true after component mounts on client side
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  // Use a ref to store the resize handler
  const resizeHandler = useRef<(() => void) | null>(null);

  // Define the checkIfMobile function
  const checkIfMobile = useCallback(() => {
    if (typeof window === 'undefined' || !hasMounted) return;
    const isSmallScreen = window.innerWidth < 768;
    const shouldUseMobile = isSmallScreen || isOverflowing;
    setIsMobile(shouldUseMobile);
  }, [isOverflowing, hasMounted]);

  // Update mobile state based on viewport width and overflow
  useEffect(() => {
    if (!hasMounted) return;
    
    // Initial check
    checkIfMobile();
    
    // Set up debounced resize handler
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkIfMobile, 100);
    };
    
    // Store the handler in the ref
    resizeHandler.current = handleResize;
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
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
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
      }
    }
    setIsOpen(false)
  }

  const handleOpenLoginModal = () => {
    // Clear any existing auth intent for regular login
    try {
      sessionStorage.removeItem('authIntent');
    } catch (e) {
      console.warn('SessionStorage not available');
    }
    if (onLogin) {
      onLogin();
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error logging out:", error.message);
        // Optionally: toast({ title: "Logout Failed", description: error.message, variant: "destructive" });
      } else {
        setCurrentUser(null);
        // Optionally: toast({ title: "Logged Out", description: "You have been successfully logged out." });
      }
    } catch (error: any) {
      console.error("Error logging out (catch):", error.message);
      // Optionally: toast({ title: "Logout Failed", description: "An unexpected error occurred.", variant: "destructive" });
    }
  };

  // Don't render the navigation until we're on the client side to prevent hydration issues
  if (!hasMounted) {
    // Render a placeholder with the same dimensions to prevent layout shift
    return <nav className="fixed top-2 sm:top-4 left-0 right-0 z-50 px-2 sm:px-4 h-16"></nav>;
  }

  return (
    <nav className="fixed top-2 sm:top-4 left-0 right-0 z-50 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Header with Menu Button and Logo - shown on mobile or when content overflows */}
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
                  alt="IV Logo"
                  fill
                  className="object-cover"
                  sizes="24px"
                />
              </div>
              <span className="text-base font-bold text-foreground group-hover:text-foreground/80 transition-colors">
                <span className="text-primary">Miet</span>fluss
              </span>
            </Link>
          </div>
        )}

        {/* Desktop Navigation - One Big Pill - hidden on mobile or when content overflows */}
        {!isMobile && !isOverflowing && (
          <div className="flex justify-center">
            <div className="inline-flex w-auto max-w-full" ref={navRef}>
              <PillContainer className="flex items-center gap-2 w-full">
              {/* Logo Section */}
              <Link href="/" className="flex items-center space-x-2 group px-2">
                <div className="relative w-8 h-8 rounded-full group-hover:scale-110 transition-transform overflow-hidden">
                  <Image
                    src={LOGO_URL}
                    alt="IV Logo"
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
                <span className="text-xl font-bold text-foreground group-hover:text-foreground/80 transition-colors whitespace-nowrap">
                  <span className="text-primary">Miet</span>fluss
                </span>
              </Link>

              {/* Divider */}
              <div className="h-8 w-px bg-border/50 mx-2" />

              {/* Navigation Items Section */}
              <div className="flex items-center gap-1">
                {pathname === "/" ? (
                  // Home page navigation with smooth scroll
                  <>
                    {navItems.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => handleNavClick(item.href)}
                        className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 hover:text-foreground dark:btn-ghost-hover transition-colors duration-200 flex items-center space-x-2 whitespace-nowrap"
                      >
                        {item.icon && <item.icon className="w-4 h-4" />}
                        <span>{item.name}</span>
                      </button>
                    ))}
                    {/* Static navigation items */}
                    {staticNavItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 hover:text-foreground dark:btn-ghost-hover transition-colors duration-200 flex items-center space-x-2 whitespace-nowrap"
                      >
                        {item.icon && <item.icon className="w-4 h-4" />}
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </>
                ) : (
                  // Other pages navigation
                  <>
                    <Button asChild variant="ghost" className="rounded-full text-foreground whitespace-nowrap">
                      <Link href="/">
                        Startseite
                      </Link>
                    </Button>
                    {staticNavItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center space-x-2 whitespace-nowrap ${
                          pathname === item.href 
                            ? 'bg-primary text-primary-foreground' 
                            : 'text-foreground hover:bg-gray-200'
                        }`}
                      >
                        {item.icon && <item.icon className="w-4 h-4" />}
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-border/50 mx-2" />

              {/* Auth Section */}
              <div className="flex items-center pr-0">
                {currentUser ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="relative cursor-pointer transition-opacity hover:opacity-80 hover:bg-white/50 transition-all duration-300 rounded-full">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={currentUser.user_metadata?.avatar_url || ''} alt="User avatar" />
                          <AvatarFallback className="bg-muted">
                            <UserIcon className="w-4 h-4 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground">
                      <DashboardMenuItem />
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={handleLogout}
                        className="text-destructive hover:!bg-destructive/10 hover:!text-destructive focus:!bg-destructive/10 focus:!text-destructive cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Abmelden
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    className="rounded-full whitespace-nowrap shadow-sm hover:shadow-md transition-shadow"
                    onClick={handleOpenLoginModal}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Anmelden
                  </Button>
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
            
            {/* Menu Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-72 max-w-full bg-background/95 backdrop-blur-lg z-50 shadow-2xl md:hidden overflow-y-auto"
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
                  {pathname === "/" ? (
                    <>
                      {navItems.map((item) => (
                        <button
                          key={item.name}
                          onClick={() => handleNavClick(item.href)}
                          className="flex items-center w-full text-left px-4 py-3 rounded-lg text-foreground hover:bg-muted/50 transition-colors duration-200"
                        >
                          {item.icon && <item.icon className="w-5 h-5 mr-3 text-muted-foreground" />}
                          <span className="text-base">{item.name}</span>
                        </button>
                      ))}
                      {/* Static navigation items */}
                      {staticNavItems.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center w-full text-left px-4 py-3 rounded-lg text-foreground hover:bg-muted/50 transition-colors duration-200"
                        >
                          {item.icon && <item.icon className="w-5 h-5 mr-3 text-muted-foreground" />}
                          <span className="text-base">{item.name}</span>
                        </Link>
                      ))}
                    </>
                  ) : (
                    <>
                      <Link
                        href="/"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center w-full text-left px-4 py-3 rounded-lg text-foreground hover:bg-muted/50 transition-colors duration-200"
                      >
                        <Home className="w-5 h-5 mr-3 text-muted-foreground" />
                        <span className="text-base">Startseite</span>
                      </Link>
                      {staticNavItems.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 ${
                            pathname === item.href 
                              ? 'bg-primary text-primary-foreground' 
                              : 'text-foreground hover:bg-muted/50'
                          }`}
                        >
                          {item.icon && <item.icon className="w-5 h-5 mr-3" />}
                          <span className="text-base">{item.name}</span>
                        </Link>
                      ))}
                    </>
                  )}

                  <div className="pt-2 mt-2 border-t border-border/50">
                    {currentUser ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className="flex items-center space-x-3 cursor-pointer w-full p-3 rounded-lg hover:bg-muted/50 transition-colors">
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={currentUser.user_metadata?.avatar_url || ''} alt="User avatar" />
                              <AvatarFallback className="bg-muted">
                                <UserIcon className="w-4 h-4 text-muted-foreground" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">Mein Konto</p>
                              <p className="text-xs text-muted-foreground">Profil verwalten</p>
                            </div>
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 bg-background/95 backdrop-blur-lg border-border/50 shadow-xl">
                          <DashboardMenuItem onClick={() => setIsOpen(false)} />
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={handleLogout}
                            className="text-destructive hover:!bg-destructive/10 hover:!text-destructive focus:!bg-destructive/10 focus:!text-destructive cursor-pointer"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Abmelden
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button
                        variant="ghost"
                        size="lg"
                        className="w-full justify-start px-4 py-6 text-base hover:bg-muted/50"
                        onClick={handleOpenLoginModal}
                      >
                        <LogIn className="w-5 h-5 mr-3" />
                        <span>Anmelden</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  )
}
