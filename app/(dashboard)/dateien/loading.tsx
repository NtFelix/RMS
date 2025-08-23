import { Cloud, Folder, HardDrive } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function DateienLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Cloud Storage</h1>
          </div>
        </div>

        {/* Storage Quota Skeleton */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HardDrive className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Folder Tree Sidebar */}
        <div className="w-80 border-r bg-background flex-shrink-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="text-sm font-semibold">Ordner</h3>
              <Skeleton className="h-7 w-7 rounded" />
            </div>
            
            <div className="flex-1 p-2 space-y-2">
              {/* Folder skeleton items */}
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 p-2">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-6 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* File Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Welcome Screen Skeleton */}
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md space-y-4">
              <Cloud className="h-16 w-16 text-muted-foreground mx-auto" />
              <Skeleton className="h-6 w-64 mx-auto" />
              <Skeleton className="h-4 w-80 mx-auto" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-72 mx-auto" />
                <Skeleton className="h-3 w-48 mx-auto" />
                <Skeleton className="h-3 w-56 mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Storage Quota Skeleton */}
      <div className="sm:hidden p-4 border-t bg-muted/30">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <HardDrive className="h-4 w-4" />
            <span>Speicher</span>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}