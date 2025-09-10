import { Suspense } from "react"
import { CloudStorageSimple } from "@/components/cloud-storage-simple"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { getPathContents } from "./actions"

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function CloudStorageLoading() {
  return (
    <div className="h-full flex flex-col">
      {/* Header skeleton */}
      <div className="border-b p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-80" />
          <div className="flex space-x-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <Skeleton className="h-24 rounded-lg mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

async function CloudStorageContent({ userId }: { userId: string }) {
  // Load initial files, folders and breadcrumbs on the server
  const initialPath = `user_${userId}`
  const { files, folders, breadcrumbs, error } = await getPathContents(userId, initialPath)

  if (error) {
    console.error('Error loading initial files:', error)
  }

  return (
    <CloudStorageSimple
      userId={userId}
      initialPath={initialPath}
      initialFiles={files}
      initialFolders={folders}
      initialBreadcrumbs={breadcrumbs}
    />
  )
}

export default async function DateienPage() {
  const supabase = await createClient()
  
  // Get user on server side
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }

  return (
    <div className="h-full">
      <Suspense fallback={<CloudStorageLoading />}>
        <CloudStorageContent userId={user.id} />
      </Suspense>
    </div>
  )
}