"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, FileText, Home, User as UserIcon, LogIn } from "lucide-react"
import { Button } from '../../../components/ui/button'
import Link from "next/link"
import { usePathname } from "next/navigation"
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import AuthModal from "@/components/AuthModal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-zinc-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-white font-bold text-sm">DS</span>
            </div>
            <span className="text-xl font-bold text-white group-hover:text-slate-300 transition-colors">
              Design<span className="text-slate-400">Studio</span>
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
                    className="text-slate-300 hover:text-white transition-colors relative group"
                  >
                    {item.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-slate-400 group-hover:w-full transition-all duration-300" />
                  </button>
                ))}
              </>
            ) : (
              // Other pages navigation
              <Link href="/" className="text-slate-300 hover:text-white transition-colors relative group">
                Home
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-slate-400 group-hover:w-full transition-all duration-300" />
              </Link>
            )}

            <Link
              href="/modern/documentation"
              className={`flex items-center gap-2 text-slate-300 hover:text-white transition-colors relative group ${
                pathname?.startsWith("/modern/documentation") ? "text-white" : ""
              }`}
            >
              <FileText className="w-4 h-4" />
              Documentation
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-slate-400 group-hover:w-full transition-all duration-300" />
            </Link>

            {currentUser ? (
              <Avatar onClick={handleOpenLoginModal} className="cursor-pointer w-8 h-8">
                <AvatarImage src={currentUser.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-slate-700">
                  <UserIcon className="w-4 h-4 text-slate-300" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-700"
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
            className="md:hidden text-white hover:text-slate-300 transition-colors"
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
            className="md:hidden bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50"
          >
            <div className="px-4 py-4 space-y-4">
              {pathname === "/" ? (
                <>
                  {navItems.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => handleNavClick(item.href)}
                      className="block w-full text-left text-slate-300 hover:text-white transition-colors py-2"
                    >
                      {item.name}
                    </button>
                  ))}
                </>
              ) : (
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className="block text-slate-300 hover:text-white transition-colors py-2"
                >
                  Home
                </Link>
              )}

              <Link
                href="/modern/documentation"
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 text-slate-300 hover:text-white transition-colors py-2 ${
                  pathname?.startsWith("/modern/documentation") ? "text-white" : ""
                }`}
              >
                <FileText className="w-4 h-4" />
                Documentation
              </Link>

              {currentUser ? (
                <div className="mt-4 flex items-center space-x-3 cursor-pointer" onClick={handleOpenLoginModal}>
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={currentUser.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-slate-700">
                      <UserIcon className="w-4 h-4 text-slate-300" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-slate-300 hover:text-white">Profile</span>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700 py-2 mt-4"
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
