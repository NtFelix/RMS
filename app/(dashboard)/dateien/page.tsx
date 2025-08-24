import { Suspense } from "react"
import { CloudStorageEnhanced } from "@/components/cloud-storage-enhanced"
import { NavigationInterceptor } from "@/components/navigation-interceptor"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { getPathContents } from "./actions"
import { FEATURE_FLAGS } from "@/lib/constants"

export const runtime = 'edge'

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

  // Detect navigation mode based on feature flags and request context
  const enableClientNavigation = FEATURE_FLAGS.ENABLE_CLIENT_NAVIGATION && FEATURE_FLAGS.ENABLE_HYBRID_NAVIGATION
  const enableOptimisticUI = FEATURE_FLAGS.ENABLE_OPTIMISTIC_UI
  const enableNavigationCache = FEATURE_FLAGS.ENABLE_NAVIGATION_CACHE

  return (
    <NavigationInterceptor 
      userId={userId} 
      fallbackToSSR={true}
      enableDebouncing={enableClientNavigation}
    >
      <CloudStorageEnhanced
        userId={userId}
        initialPath={initialPath}
        initialFiles={files}
        initialFolders={folders}
        initialBreadcrumbs={breadcrumbs}
        isSSR={true}
        enableClientNavigation={enableClientNavigation}
        enableOptimisticUI={enableOptimisticUI}
        enableNavigationCache={enableNavigationCache}
      />
    </NavigationInterceptor>
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