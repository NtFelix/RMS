import Navigation from "@/app/modern/components/navigation"
import Footer from "@/app/modern/components/footer"

export default function DatenschutzLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
