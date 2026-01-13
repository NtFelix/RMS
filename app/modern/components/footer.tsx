"use client"

import { m } from "framer-motion"
import { /* Github, */ Twitter, /* Linkedin, */ Mail } from "lucide-react"
import Link from "next/link"
import { BRAND_NAME_PART_1, BRAND_NAME_PART_2, BRAND_NAME, INFO_EMAIL, SUPPORT_EMAIL, ROUTES } from "@/lib/constants"
import { trackFooterLinkClicked, trackFooterSocialClicked, type FooterCategory } from "@/lib/posthog-landing-events"

const footerLinks = {
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
  Rechtliches: [
    "Datenschutz",
    "AGB",
    "Impressum",
  ],
}

// Special links that require custom routing or display text
const specialLinks: Record<string, { href: string; text: string }> = {
  "Wohnungsverwaltung": { href: ROUTES.FEATURES_WOHNUNGSVERWALTUNG, text: "Wohnungsverwaltung" },
  "Finanzverwaltung": { href: ROUTES.FEATURES_FINANZVERWALTUNG, text: "Finanzverwaltung" },
  "Betriebskosten": { href: ROUTES.FEATURES_BETRIEBSKOSTEN, text: "Betriebskosten" },
  "Hilfezentrum": { href: ROUTES.DOCUMENTATION, text: "Dokumentation" },
  "Datenschutz": { href: ROUTES.PRIVACY, text: "Datenschutz" },
  "AGB": { href: ROUTES.TERMS, text: "AGB" },
  "Impressum": { href: ROUTES.IMPRESSUM, text: "Impressum" },
  "Preise": { href: ROUTES.PRICING, text: "Preise" },
  "Kontakt": { href: `mailto:${INFO_EMAIL}`, text: "Kontakt" },
}

const socialLinks = [
  { icon: Mail, href: `mailto:${SUPPORT_EMAIL}`, label: "Email", platform: "email" as const },
  // { icon: Github, href: "#", label: "GitHub", platform: "github" as const },
  { icon: Twitter, href: "https://x.com/Mietevo", label: "X (formerly Twitter)", platform: "twitter" as const },
  // { icon: Linkedin, href: "#", label: "LinkedIn", platform: "linkedin" as const },
]

// Map category names to FooterCategory type
const categoryMap: Record<string, FooterCategory> = {
  "Funktionen": "funktionen",
  "Ressourcen": "ressourcen",
  "Rechtliches": "rechtliches",
}

export default function Footer() {
  return (
    <footer id="footer" className="relative py-20 px-4 border-t border-border bg-background text-foreground">
      {/* Footer Background Pattern - Adjusted for theme */}
      <div className="absolute inset-0 opacity-5 dark:opacity-3">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(0deg, transparent 24%, hsl(var(--muted-foreground)/0.1) 25%, hsl(var(--muted-foreground)/0.1) 26%, transparent 27%, transparent 74%, hsl(var(--muted-foreground)/0.05) 75%, hsl(var(--muted-foreground)/0.05) 76%, transparent 77%, transparent),
                           linear-gradient(90deg, transparent 24%, hsl(var(--muted-foreground)/0.1) 25%, hsl(var(--muted-foreground)/0.1) 26%, transparent 27%, transparent 74%, hsl(var(--muted-foreground)/0.05) 75%, hsl(var(--muted-foreground)/0.05) 76%, transparent 77%, transparent)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand Section */}
          <div className="sm:col-span-2 lg:col-span-2">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold text-foreground mb-4">
                <span className="text-primary">{BRAND_NAME_PART_1}</span>{BRAND_NAME_PART_2}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Die moderne Lösung für Ihre Mietverwaltung und Betriebskostenabrechnung.
              </p>
              <div className="flex gap-4">
                {socialLinks.map((social, index) => (
                  <m.a
                    key={index}
                    href={social.href}
                    target={social.href.startsWith("http") ? "_blank" : undefined}
                    rel={social.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="group w-10 h-10 bg-card hover:bg-accent rounded-lg flex items-center justify-center transition-colors border border-border hover:border-white dark:hover:border-primary/50"
                    aria-label={social.label}
                    onClick={() => trackFooterSocialClicked(social.platform, social.href)}
                  >
                    <social.icon className="w-5 h-5 text-muted-foreground group-hover:text-accent-foreground" />
                  </m.a>
                ))}
              </div>
            </m.div>
          </div>

          {/* Links Sections */}
          {Object.entries(footerLinks)
            .filter(([, links]) => links.length > 0)
            .map(([category, links], categoryIndex) => (
              <m.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
                viewport={{ once: true }}
              >
                <h4 className="text-foreground font-semibold mb-4">{category}</h4>
                <ul className="space-y-3">
                  {links.map((link, linkIndex) => {
                    const specialLink = specialLinks[link];
                    const footerCategory = categoryMap[category];
                    return (
                      <li key={linkIndex}>
                        {specialLink ? (
                          <Link
                            href={specialLink.href}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => trackFooterLinkClicked(specialLink.text, footerCategory, specialLink.href)}
                          >
                            {specialLink.text}
                          </Link>
                        ) : (
                          <a
                            href="#"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => trackFooterLinkClicked(link, footerCategory, '#')}
                          >
                            {link}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </m.div>
            ))}
        </div>

        {/* Bottom Section */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="pt-8 border-t border-border flex flex-col justify-center items-center text-center gap-3"
        >
          <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} {BRAND_NAME}. Alle Rechte vorbehalten.</p>
          <p className="text-muted-foreground/70 text-sm">Entwickelt, um die Mietverwaltung für alle zu vereinfachen.</p>
        </m.div>
      </div>
    </footer>
  )
}
