"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronDown, Mail } from "lucide-react"
import Link from "next/link"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { BRAND_NAME_PART_1, BRAND_NAME_PART_2, BRAND_NAME, SUPPORT_EMAIL, ROUTES, EXTERNAL_LINKS, LOGO_URL } from "@/lib/constants"
import { trackFooterLinkClicked, trackFooterSocialClicked, type FooterCategory } from "@/lib/posthog-landing-events"
import type { FooterLink } from "@/lib/types"

// Pixel-perfect official X (formerly Twitter) SVG logo icon
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

// Special links that require custom routing or display text
const specialLinks: Record<string, FooterLink> = {
  "Wohnungsverwaltung": { href: ROUTES.FEATURES_WOHNUNGSVERWALTUNG, text: "Wohnungsverwaltung" },
  "Finanzverwaltung": { href: ROUTES.FEATURES_FINANZVERWALTUNG, text: "Finanzverwaltung" },
  "Betriebskosten": { href: ROUTES.FEATURES_BETRIEBSKOSTEN, text: "Betriebskosten" },
  "Hilfezentrum": { href: EXTERNAL_LINKS.DOCUMENTATION, text: "Dokumentation", target: "_blank", rel: "noopener noreferrer" },
  "Datenschutz": { href: ROUTES.PRIVACY, text: "Datenschutz" },
  "AGB": { href: ROUTES.TERMS, text: "AGB" },
  "Impressum": { href: ROUTES.IMPRESSUM, text: "Impressum" },
  "Preise": { href: ROUTES.PRICING, text: "Preise" },
  "Kontakt": { href: `mailto:${SUPPORT_EMAIL}`, text: "Kontakt" },
  "Privatvermieter": { href: "/loesungen/privatvermieter", text: "Privatvermieter" },
  "kleine Hausverwaltungen": { href: "/loesungen/kleine-mittlere-hausverwaltungen", text: "kleine Hausverwaltungen" },
  "Hausverwaltungen": { href: "/loesungen/grosse-hausverwaltungen", text: "Hausverwaltungen" },
}

const socialLinks = [
  { icon: XIcon, href: "https://x.com/Mietevo", label: "X (formerly Twitter)", platform: "twitter" as const },
  { icon: Mail, href: `mailto:${SUPPORT_EMAIL}`, label: "Email", platform: "email" as const },
]

// Map category names to FooterCategory type
const categoryMap: Record<string, FooterCategory> = {
  "Funktionen": "funktionen",
  "Ressourcen": "ressourcen",
  "Mietevo für": "loesungen" as FooterCategory,
}

export default function Footer() {
  const showLoesungen = useFeatureFlagEnabled('show-loesungen-dropdown')

  // Dynamic link categories depending on the feature flag
  const activeFooterLinks = {
    Funktionen: [
      "Wohnungsverwaltung",
      "Finanzverwaltung",
      "Betriebskosten",
    ],
    Ressourcen: [
      "Preise",
      "Hilfezentrum",
      "Kontakt",
    ],
    ...(showLoesungen ? {
      "Mietevo für": [
        "Privatvermieter",
        "kleine Hausverwaltungen",
        "Hausverwaltungen",
      ]
    } : {})
  }

  // Custom cursor spotlight tracking
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  // Mobile Accordion state
  const [openMobileCategory, setOpenMobileCategory] = useState<string | null>(null)
  const toggleCategory = (category: string) => {
    setOpenMobileCategory(prev => prev === category ? null : category)
  }

  return (
    <footer 
      id="footer" 
      className="relative py-16 px-4 md:py-24 overflow-hidden bg-background"
    >
      {/* Huge Watermark Background Logo, partially cut off at the bottom */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[-80px] md:bottom-[-160px] text-[10rem] md:text-[22rem] font-black text-foreground/[0.05] dark:text-foreground/[0.03] tracking-tighter select-none font-sans uppercase pointer-events-none z-0">
        {BRAND_NAME}
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Floating Card Container */}
        <div 
          onMouseMove={handleMouseMove}
          className="bg-card dark:bg-card/45 backdrop-blur-md rounded-[2.5rem] border border-border/80 p-8 md:p-12 shadow-2xl hover:shadow-[0_20px_50px_rgba(99,102,241,0.03)] transition-all duration-500 overflow-hidden relative group"
        >
          {/* Subtle Dynamic Glow Spotlight inside the card (visible in dark mode) */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 dark:block hidden"
            style={{
              background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99,102,241,0.04), transparent 80%)`
            }}
          />

          {/* Dynamic grid classes based on showLoesungen feature flag */}
          <div className={`grid grid-cols-1 md:grid-cols-2 ${showLoesungen ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-12 mb-12 relative z-10`}>
            {/* Brand Section (spans 2 columns on desktop) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <img 
                  src={LOGO_URL}
                  alt={`${BRAND_NAME} Mascot`}
                  className="w-8 h-8 object-contain select-none"
                />
                <h3 className="text-xl font-bold text-foreground tracking-tight">
                  <span className="text-primary">{BRAND_NAME_PART_1}</span>{BRAND_NAME_PART_2}
                </h3>
              </div>
              
              <p className="text-muted-foreground leading-relaxed text-sm max-w-sm">
                Mit Mietevo verwalten Sie Ihre Mietobjekte professionell. Automatische Betriebskostenabrechnungen, Mieterverwaltung und Finanzen. Alles in einer Software.
              </p>

              {/* Minimal inline grey-to-dark social icons matching Graphy design */}
              <div className="flex gap-4 pt-1">
                {socialLinks.map((social) => (
                  <motion.a
                    key={social.platform}
                    href={social.href}
                    target={social.href.startsWith("http") ? "_blank" : undefined}
                    rel={social.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                    aria-label={social.label}
                    onClick={() => trackFooterSocialClicked(social.platform, social.href)}
                  >
                    <social.icon className="w-5 h-5" />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Links Sections (spans remaining 2 or 3 columns on desktop dynamically) */}
            {Object.entries(activeFooterLinks)
              .filter(([, links]) => links.length > 0)
              .map(([category, links]) => {
                const isAccordionOpen = openMobileCategory === category
                return (
                  <div key={category} className="border-b border-border/40 md:border-b-0 pb-4 md:pb-0">
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="w-full md:cursor-default flex items-center justify-between text-left text-foreground font-semibold mb-2 md:mb-4 focus:outline-none"
                    >
                      <span className="text-sm font-semibold tracking-wide text-foreground select-none">{category}</span>
                      <ChevronDown 
                        className={`w-4 h-4 text-muted-foreground md:hidden transition-transform duration-300 ${isAccordionOpen ? "rotate-180 text-primary" : ""}`} 
                      />
                    </button>
                    <ul className={`space-y-3 mt-3 md:mt-0 ${isAccordionOpen ? "block" : "hidden md:block"} transition-all duration-300`}>
                      {links.map((link) => {
                        const specialLink = specialLinks[link]
                        const footerCategory = categoryMap[category]
                        return (
                          <li key={link}>
                            {specialLink ? (
                              <Link
                                href={specialLink.href}
                                target={specialLink.target}
                                rel={specialLink.rel}
                                className="text-muted-foreground hover:text-foreground transition-colors text-sm hover:underline"
                                onClick={() => trackFooterLinkClicked(specialLink.text, footerCategory, specialLink.href)}
                              >
                                {specialLink.text}
                              </Link>
                            ) : (
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground transition-colors text-sm text-left hover:underline"
                                onClick={() => trackFooterLinkClicked(link, footerCategory, "#")}
                              >
                                {link}
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
          </div>

          {/* Solid card-level divider line */}
          <div className="border-t border-border/80 my-8 relative z-10" />

          {/* Bottom Bar: Copyright on left, legal links on right */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground relative z-10">
            <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start">
              <span>© {new Date().getFullYear()} {BRAND_NAME}. Alle Rechte vorbehalten.</span>
            </div>
            
            {/* Inline right-aligned legal links */}
            <div className="flex flex-wrap justify-center gap-6">
              <Link href={ROUTES.PRIVACY} className="hover:text-foreground transition-colors hover:underline">Datenschutz</Link>
              <Link href={ROUTES.TERMS} className="hover:text-foreground transition-colors hover:underline">AGB</Link>
              <Link href={ROUTES.IMPRESSUM} className="hover:text-foreground transition-colors hover:underline">Impressum</Link>
            </div>
          </div>

        </div>
      </div>
    </footer>
  )
}
