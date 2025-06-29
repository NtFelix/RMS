import Navigation from "../modern/components/navigation";
import DocumentationContent from "../modern/components/documentation-content";
import DocumentationSidebar from "../modern/components/documentation-sidebar";

export default function DocumentationPage() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-zinc-950 text-white pt-16">
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
  );
}
