import { CloudStorageEnhanced } from "@/components/cloud-storage-enhanced"
import { NavigationInterceptor } from "@/components/navigation-interceptor"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { getPathContents } from "../actions"

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

  const { files, folders, breadcrumbs, error: loadError } = await getPathContents(user.id, initialPath)

  if (loadError) {
    // We keep rendering, the client UI will show any errors if needed
    console.error('Error loading path contents:', loadError)
  }

  return (
    <NavigationInterceptor userId={user.id} fallbackToSSR={true}>
      <CloudStorageEnhanced
        userId={user.id}
        initialPath={initialPath}
        initialFiles={files}
        initialFolders={folders}
        initialBreadcrumbs={breadcrumbs}
        isSSR={true}
        enableClientNavigation={true}
      />
    </NavigationInterceptor>
  )
}
