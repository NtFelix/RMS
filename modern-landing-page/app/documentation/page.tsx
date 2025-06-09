import Navigation from "../../components/navigation"
import DocumentationContent from "../../components/documentation-content"
import DocumentationSidebar from "../../components/documentation-sidebar"

export default function DocumentationPage() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-zinc-950 text-white pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <DocumentationSidebar />
            </div>
            <div className="lg:col-span-3">
              <DocumentationContent />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
