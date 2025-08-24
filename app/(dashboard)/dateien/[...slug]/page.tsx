import { CloudStorageEnhanced } from "@/components/cloud-storage-enhanced"
import { NavigationInterceptor } from "@/components/navigation-interceptor"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { getPathContents } from "../actions"
import { FEATURE_FLAGS } from "@/lib/constants"
import { headers } from "next/headers"

export const runtime = 'edge'

export default async function DateienPathPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/auth/login')
  }

  const resolved = await params
  const slug = Array.isArray(resolved.slug) ? resolved.slug : []
  const initialPath = [`user_${user.id}`, ...slug].join('/')

  // Detect if this is a client-side navigation or direct URL access
  const headersList = await headers()
  const referer = headersList.get('referer')
  const userAgent = headersList.get('user-agent')
  const isDirectAccess = !referer || !referer.includes('/dateien')
  const isBot = userAgent && /bot|crawler|spider/i.test(userAgent)

  // Load path contents on server for SSR and direct access
  const { files, folders, breadcrumbs, error: loadError } = await getPathContents(user.id, initialPath)

  if (loadError) {
    // We keep rendering, the client UI will show any errors if needed
    console.error('Error loading path contents:', loadError)
  }

  // Determine navigation capabilities based on feature flags and context
  const enableClientNavigation = FEATURE_FLAGS.ENABLE_CLIENT_NAVIGATION && 
                                FEATURE_FLAGS.ENABLE_HYBRID_NAVIGATION && 
                                !isBot // Disable client navigation for bots
  const enableOptimisticUI = FEATURE_FLAGS.ENABLE_OPTIMISTIC_UI && !isDirectAccess
  const enableNavigationCache = FEATURE_FLAGS.ENABLE_NAVIGATION_CACHE

  return (
    <NavigationInterceptor 
      userId={user.id} 
      fallbackToSSR={true}
      enableDebouncing={enableClientNavigation}
    >
      <CloudStorageEnhanced
        userId={user.id}
        initialPath={initialPath}
        initialFiles={files}
        initialFolders={folders}
        initialBreadcrumbs={breadcrumbs}
        isSSR={true}
        enableClientNavigation={enableClientNavigation}
        enableOptimisticUI={enableOptimisticUI}
        enableNavigationCache={enableNavigationCache}
        isDirectAccess={isDirectAccess}
      />
    </NavigationInterceptor>
  )
}
