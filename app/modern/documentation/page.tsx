import Navigation from "../components/navigation"
import DocumentationContent from "../components/documentation-content"
import DocumentationSidebar from "../components/documentation-sidebar"

export default function DocumentationPage() {
  return (
    <>
      <Navigation />
      {/* Theming will be handled by ThemeProvider and globals.css */}
      <div className="min-h-screen pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <DocumentationSidebar />
            <div className="lg:col-span-3">
              <DocumentationContent />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
