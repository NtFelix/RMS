"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, DollarSign, Home, User as UserIcon, LogIn, LogOut, Check } from "lucide-react"
import { Button } from '@/components/ui/button' // Corrected import path
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
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

interface NavigationProps {
  onLogin?: () => void;
}

export default function Navigation({ onLogin }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const [currentUser, setCurrentUser] = useState<User | null>(null);

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

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-2 sm:top-4 left-0 right-0 z-50 px-2 sm:px-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between relative">
        {/* Mobile Header with Menu Button and Logo */}
        <div className="flex-shrink-0 z-10 md:hidden flex items-center space-x-2">
          <PillContainer>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-foreground hover:text-foreground/80 transition-colors flex items-center space-x-2"
            >
              <Menu className="w-5 h-5" />
              <span className="text-sm font-medium">Menü</span>
            </button>
          </PillContainer>
          <Link href="/" className="flex items-center space-x-1 group">
            <Image src="/mascot/normal.png" alt="ImmobilienVerwalter Mascot" width={24} height={24} className="group-hover:scale-110 transition-transform" />
            <span className="text-base font-bold text-foreground group-hover:text-foreground/80 transition-colors">
              Immobilien<span className="text-primary">Verwalter</span>
            </span>
          </Link>
        </div>
        <div className="hidden md:flex flex-shrink-0 z-10">
          <PillContainer>
            <Link href="/" className="flex items-center space-x-1 sm:space-x-2 group">
              <Image src="/mascot/normal.png" alt="ImmobilienVerwalter Mascot" width={32} height={32} className="group-hover:scale-110 transition-transform" />
              <span className="text-lg sm:text-xl font-bold text-foreground group-hover:text-foreground/80 transition-colors">
                Immobilien<span className="text-primary">Verwalter</span>
              </span>
            </Link>
          </PillContainer>
        </div>

        {/* Desktop Navigation Pill */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <PillContainer>
            {pathname === "/" ? (
              // Home page navigation with smooth scroll
              <>
                {navItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item.href)}
                    className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 transition-all duration-300 flex items-center space-x-2"
                  >
                    {item.icon && <item.icon className="w-4 h-4" />}
                    <span>{item.name}</span>
                  </button>
                ))}
              </>
            ) : (
              // Other pages navigation
            <Link href="/" className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 transition-all duration-300">
                Startseite
              </Link>
            )}
          </PillContainer>
        </div>

        {/* Auth Pill */}
        <div className="hidden md:flex flex-shrink-0 z-10">
          <PillContainer>
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
                size="sm"
                className="rounded-full"
                onClick={handleOpenLoginModal}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Anmelden
              </Button>
            )}
          </PillContainer>
        </div>
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
                    </>
                  ) : (
                    <Link
                      href="/"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center w-full text-left px-4 py-3 rounded-lg text-foreground hover:bg-muted/50 transition-colors duration-200"
                    >
                      <Home className="w-5 h-5 mr-3 text-muted-foreground" />
                      <span className="text-base">Startseite</span>
                    </Link>
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
    </motion.nav>
  )
}
