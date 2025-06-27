"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, FileText, Home, User as UserIcon, LogIn, LogOut } from "lucide-react"
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
  { name: "Home", href: "#hero", icon: Home },
  { name: "Features", href: "#features" },
  { name: "Services", href: "#services" },
  { name: "Testimonials", href: "#testimonials" },
  { name: "Contact", href: "#cta" },
]

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<"login" | "register">("login");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/95 backdrop-blur-md border-b border-border/50" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-primary-foreground font-bold text-sm">DS</span>
            </div>
            <span className="text-xl font-bold text-foreground group-hover:text-foreground/80 transition-colors">
              Design<span className="text-primary">Studio</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {pathname === "/" ? (
              // Home page navigation with smooth scroll
              <>
                {navItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item.href)}
                    className="text-muted-foreground hover:text-foreground transition-colors relative group"
                  >
                    {item.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
                  </button>
                ))}
              </>
            ) : (
              // Other pages navigation
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors relative group">
                Home
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
              </Link>
            )}

            <Link
              href="/modern/documentation"
              className={`flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors relative group ${
                pathname?.startsWith("/modern/documentation") ? "text-foreground" : ""
              }`}
            >
              <FileText className="w-4 h-4" />
              Documentation
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
            </Link>

            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="relative cursor-pointer transition-opacity hover:opacity-80">
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
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-accent"
                onClick={handleOpenLoginModal}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
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
            className="md:hidden bg-background/95 backdrop-blur-md border-b border-border/50"
          >
            <div className="px-4 py-4 space-y-4">
              {pathname === "/" ? (
                <>
                  {navItems.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => handleNavClick(item.href)}
                      className="block w-full text-left text-muted-foreground hover:text-foreground transition-colors py-2"
                    >
                      {item.name}
                    </button>
                  ))}
                </>
              ) : (
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className="block text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Home
                </Link>
              )}

              <Link
                href="/modern/documentation"
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors py-2 ${
                  pathname?.startsWith("/modern/documentation") ? "text-foreground" : ""
                }`}
              >
                <FileText className="w-4 h-4" />
                Documentation
              </Link>

              {currentUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="mt-4 flex items-center space-x-3 cursor-pointer w-full py-2 px-1 rounded-md hover:bg-accent">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={currentUser.user_metadata?.avatar_url || ''} alt="User avatar" />
                        <AvatarFallback className="bg-muted">
                          <UserIcon className="w-4 h-4 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">Profile</span>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground w-[calc(100vw-2rem)]">
                    <DropdownMenuItem
                      onSelect={handleLogout}
                      className="text-destructive hover:!bg-destructive/10 hover:!text-destructive focus:!bg-destructive/10 focus:!text-destructive cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent py-2 mt-4"
                  onClick={handleOpenLoginModal}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
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
