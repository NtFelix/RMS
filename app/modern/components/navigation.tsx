"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, DollarSign, Home, User as UserIcon, LogIn, LogOut } from "lucide-react"
import { Button } from '@/components/ui/button' // Corrected import path
import Link from "next/link"
import { usePathname } from "next/navigation"
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import AuthModal from "@/components/auth-modal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { name: "Startseite", href: "#hero", icon: Home },
  { name: "Funktionen", href: "#features" },
  { name: "Preise", href: "#pricing" },
  
]

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<"login" | "register">("login");

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

  const handleAuthenticated = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };

  const handleOpenLoginModal = () => {
    setAuthModalInitialTab("login");
    setIsAuthModalOpen(true);
  };

  const handleOpenRegisterModal = () => {
    setAuthModalInitialTab("register");
    setIsAuthModalOpen(true);
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
      className="fixed top-4 left-0 right-0 z-50 px-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between relative">
        {/* Logo Pill */}
        <div className="flex-shrink-0 z-10">
          <div className="glass shadow-lg rounded-full h-16 px-6 flex items-center backdrop-blur-md">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-primary-foreground font-bold text-sm">IV</span>
              </div>
              <span className="text-xl font-bold text-foreground group-hover:text-foreground/80 transition-colors">
                Immobilien<span className="text-primary">Verwalter</span>
              </span>
            </Link>
          </div>
        </div>

        {/* Desktop Navigation Pill */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="glass shadow-lg rounded-full h-16 px-6 flex items-center space-x-1 backdrop-blur-md">
            {pathname === "/" ? (
              // Home page navigation with smooth scroll
              <>
                {navItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item.href)}
                  className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 transition-all duration-300"
                  >
                    {item.name}
                  </button>
                ))}
              </>
            ) : (
              // Other pages navigation
            <Link href="/" className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-gray-200 transition-all duration-300">
                Startseite
              </Link>
            )}
          </div>
        </div>

        {/* Auth Pill */}
        <div className="flex-shrink-0 z-10">
          <div className="glass shadow-lg rounded-full h-16 px-6 flex items-center backdrop-blur-md">
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
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-foreground hover:text-foreground/80 transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden glass"
          >
            <div className="px-4 py-4 space-y-4">
              {pathname === "/" ? (
                <>
                  {navItems.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => handleNavClick(item.href)}
                      className="block w-full text-left px-3 py-2 rounded-md text-muted-foreground hover:bg-gray-200 transition-all duration-300"
                    >
                      {item.name}
                    </button>
                  ))}
                </>
              ) : (
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-left px-3 py-2 rounded-md text-muted-foreground hover:bg-gray-200 transition-all duration-300"
                >
                  Startseite
                </Link>
              )}

              {currentUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="mt-4 flex items-center space-x-3 cursor-pointer w-full py-2 px-1 rounded-md hover:bg-white/50 transition-all duration-300">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={currentUser.user_metadata?.avatar_url || ''} alt="User avatar" />
                        <AvatarFallback className="bg-muted">
                          <UserIcon className="w-4 h-4 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">Profil</span>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground w-[calc(100vw-2rem)]">
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
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start py-2 mt-4" // Removed text color and hover classes
                  onClick={handleOpenLoginModal}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Anmelden
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
        initialTab={authModalInitialTab}
      />
    </motion.nav>
  )
}
