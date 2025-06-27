"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, FileText, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"

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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleNavClick = (href: string) => {
    if (href.startsWith("#") && pathname === "/") {
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
      }
    }
    setIsOpen(false)
  }

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
            {/* Removed group-hover:scale-110 from logo icon part */}
            <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-zinc-500 rounded-lg flex items-center justify-center transition-transform">
              <span className="text-white font-bold text-sm">DS</span>
            </div>
            {/* Retained text color change on hover for logo text */}
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
                    // Removed animated underline (group and span)
                    className="text-slate-300 hover:text-white transition-colors"
                  >
                    {item.name}
                  </button>
                ))}
              </>
            ) : (
              // Other pages navigation
              // Removed animated underline (group and span)
              <Link href="/" className="text-slate-300 hover:text-white transition-colors">
                Home
              </Link>
            )}

            <Link
              href="/documentation"
              // Removed animated underline (group and span)
              className={`flex items-center gap-2 text-slate-300 hover:text-white transition-colors ${
                pathname === "/documentation" ? "text-white" : ""
              }`}
            >
              <FileText className="w-4 h-4" />
              Documentation
            </Link>

            {/* Standardized "Get Started" button. It will use default variant hover from button.tsx */}
            {/* The original 'bg-white text-zinc-900 hover:bg-slate-100' was quite different. */}
            {/* Using default variant for consistency with how primary CTAs might be in main app. */}
            {/* If a light button is strictly needed, a custom variant or specific classes matching main app's light button style would be better. */}
            {/* For now, aligning to 'default' variant from this landing page's button.tsx. */}
            <Button size="sm" variant="default" className="font-semibold">
              Get Started
            </Button>
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
                href="/documentation"
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 text-slate-300 hover:text-white transition-colors py-2 ${
                  pathname === "/documentation" ? "text-white" : ""
                }`}
              >
                <FileText className="w-4 h-4" />
                Documentation
              </Link>

              <Button size="sm" className="bg-white text-zinc-900 hover:bg-slate-100 font-semibold w-full mt-4">
                Get Started
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
