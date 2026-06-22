import { LayoutDashboard, Package, Phone, Building2, TrendingUp, Calculator, Home, BookOpen, Mail } from "lucide-react"
import { ROUTES, EXTERNAL_LINKS, INFO_EMAIL } from "@/lib/constants"
import type { NavItem } from "@/lib/types"

export const produkteItems: NavItem[] = [
  { name: "Web-Anwendung", href: ROUTES.HOME, icon: LayoutDashboard, description: "Die Web-Anwendung" },
  { name: "Browser-Erweiterung", href: "/warteliste/browser-erweiterung", icon: Package, description: "Demnächst verfügbar" },
  { name: "Mobile App", href: "/warteliste/mobile-app", icon: Phone, description: "Demnächst verfügbar" },
]

export const funktionenItems: NavItem[] = [
  { name: "Wohnungsverwaltung", href: "/funktionen/wohnungsverwaltung", icon: Building2, description: "Verwalten Sie Ihre Wohnungen zentral" },
  { name: "Finanzverwaltung", href: "/funktionen/finanzverwaltung", icon: TrendingUp, description: "Behalten Sie Ihre Finanzen im Blick" },
  { name: "Betriebskosten", href: "/funktionen/betriebskosten", icon: Calculator, description: "Automatische Nebenkostenabrechnung" },
]

export const loesungenItems: NavItem[] = [
  { name: "Für Privatvermieter", href: "/loesungen/privatvermieter", icon: Home, description: "Perfekt für private Vermieter" },
  { name: "Für kleine bis mittlere Hausverwaltungen", href: "/loesungen/kleine-mittlere-hausverwaltungen", icon: Building2, description: "Professionelle Verwaltungslösung" },
  { name: "Für große Hausverwaltungen", href: "/loesungen/grosse-hausverwaltungen", icon: TrendingUp, description: "Enterprise-Lösungen für große Portfolios" },
]

export const hilfeItems: NavItem[] = [
  { name: "Dokumentation", href: EXTERNAL_LINKS.DOCUMENTATION, icon: BookOpen, description: "Ausführliche Anleitungen", target: "_blank", rel: "noopener noreferrer" },
  { name: "Kontakt", href: `mailto:${INFO_EMAIL}`, icon: Mail, description: "Schreiben Sie uns" },
]
