"use client"

import { motion } from "framer-motion"
import { Github, Twitter, Linkedin, Mail } from "lucide-react"
import Link from "next/link"
import { CONTACT_EMAIL } from "@/constants"

const footerLinks = {
  Unternehmen: [
    // "Über uns",
    "Kontakt",
    // "Karriere",
    // "Blog",
  ],
  Plattform: [
    "Funktionen",
    "Preise",
    // "Integrationen",
    // "API",
  ],
  Ressourcen: [
    "Hilfezentrum",
    // "Anleitungen",
    // "Webinare",
    // "Community",
  ],
  Rechtliches: [
    "Datenschutz",
    "AGB",
    // "Sicherheit",
    // "Lizenzen",
  ],
}

// Special links that require custom routing or display text
const specialLinks: Record<string, { href: string; text: string }> = {
  "Hilfezentrum": { href: "/dokumentation", text: "Dokumentation" },
  "Datenschutz": { href: "/datenschutz", text: "Datenschutz" },
  "AGB": { href: "/agb", text: "AGB" },
  "Funktionen": { href: "/funktionen", text: "Funktionen" },
  "Preise": { href: "/preise", text: "Preise" },
  "Kontakt": { href: `mailto:${CONTACT_EMAIL}`, text: "Kontakt" },
}

const socialLinks = [
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Twitter, href: "https://x.com/Mietevo", label: "X (formerly Twitter)" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Mail, href: `mailto:${CONTACT_EMAIL}`, label: "Email" },
]

export default function Footer() {
  return (
    <footer className="relative py-20 px-4 border-t border-border bg-background text-foreground">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">
          {/* Brand Section */}
          <div className="sm:col-span-2 lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold text-foreground mb-4">
                <span className="text-primary">Miet</span>evo
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Die moderne Lösung für Ihre Mietverwaltung und Nebenkostenabrechnung.
              </p>
              <div className="flex gap-4">
                {socialLinks.map((social, index) => (
                  <motion.a
                    key={index}
                    href={social.href}
                    target={social.href.startsWith("http") ? "_blank" : undefined}
                    rel={social.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 bg-card hover:bg-accent rounded-lg flex items-center justify-center transition-colors border border-border"
                    aria-label={social.label}
                  >
                    <social.icon className="w-5 h-5 text-muted-foreground group-hover:text-accent-foreground" />
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Links Sections */}
          {Object.entries(footerLinks)
            .filter(([, links]) => links.length > 0)
            .map(([category, links], categoryIndex) => (
              <motion.div
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
                    return (
                      <li key={linkIndex}>
                        {specialLink ? (
                          <Link href={specialLink.href} className="text-muted-foreground hover:text-foreground transition-colors">
                            {specialLink.text}
                          </Link>
                        ) : (
                          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                            {link}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            ))}
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="pt-8 border-t border-border flex flex-col justify-center items-center text-center gap-3"
        >
          <p className="text-muted-foreground text-sm">© 2025 Mietevo. Alle Rechte vorbehalten.</p>
          <p className="text-muted-foreground/70 text-sm">Entwickelt, um die Mietverwaltung für alle zu vereinfachen.</p>
        </motion.div>
      </div>
    </footer>
  )
}
