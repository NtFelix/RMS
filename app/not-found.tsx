import Link from "next/link"
import Image from "next/image"

import { Home, Building2, Users, Wallet, FileSpreadsheet, CheckSquare } from "lucide-react"
import { LOGO_URL } from "@/lib/constants"

const quickLinks = [
  {
    title: "Dashboard",
    href: "/home",
    icon: Home,
    description: "Zurück zur Übersicht"
  },
  {
    title: "Häuser",
    href: "/haeuser",
    icon: Building2,
    description: "Immobilien verwalten"
  },
  {
    title: "Mieter",
    href: "/mieter",
    icon: Users,
    description: "Mieter verwalten"
  },
  {
    title: "Finanzen",
    href: "/finanzen",
    icon: Wallet,
    description: "Finanzübersicht"
  },
  {
    title: "Betriebskosten",
    href: "/betriebskosten",
    icon: FileSpreadsheet,
    description: "Nebenkosten verwalten"
  },
  {
    title: "Aufgaben",
    href: "/todos",
    icon: CheckSquare,
    description: "To-Do Liste"
  }
]

export default function NotFound() {

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Logo */}
      <header className="border-b bg-background px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="relative w-8 h-8 rounded-full overflow-hidden">
            <Image
              src={LOGO_URL}
              alt="Mietfluss Logo"
              fill
              className="object-cover"
              unoptimized // Supabase images are stored as pre-optimized .avif
            />
          </div>
          <span className="text-lg">Mietfluss</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* 404 Error */}
          <div className="space-y-4">
            <h1 className="text-8xl font-bold text-primary/20">404</h1>
            <h2 className="text-3xl font-semibold text-foreground">
              Seite nicht gefunden
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Die angeforderte Seite konnte nicht gefunden werden.
              Möglicherweise wurde sie verschoben oder existiert nicht mehr.
            </p>
          </div>

          {/* Quick Links Grid */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-6">
                Häufig verwendete Bereiche
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group p-4 rounded-lg border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all duration-500 ease-out hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-1 hover:border-accent/50 transform-gpu"
                  >
                    <div className="flex flex-col items-center space-y-2 text-center">
                      <link.icon className="h-8 w-8 text-primary group-hover:text-accent-foreground group-hover:scale-125 group-hover:rotate-3 transition-all duration-500 ease-out" />
                      <div className="group-hover:-translate-y-0.5 transition-transform duration-500 ease-out">
                        <h4 className="font-medium group-hover:font-semibold transition-all duration-500 ease-out">{link.title}</h4>
                        <p className="text-sm text-muted-foreground group-hover:text-accent-foreground/80 transition-all duration-500 ease-out">
                          {link.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>


          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background px-6 py-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            Bei weiteren Problemen wenden Sie sich an den Support oder kehren Sie zur{" "}
            <Link href="/" className="text-primary hover:underline">
              Startseite
            </Link>{" "}
            zurück.
          </p>
        </div>
      </footer>
    </div>
  )
}