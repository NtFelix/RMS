import { CloudStorageSimple } from "@/components/cloud-storage-simple"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { getPathContents } from "../actions"

export const runtime = 'edge'

export default async function DateienPathPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/auth/login')
  }

  const resolved = await params
  const slug = Array.isArray(resolved.slug) ? resolved.slug : []
  const initialPath = [`user_${user.id}`, ...slug].join('/')

  // Load path contents on server for SSR
  const { files, folders, breadcrumbs, error: loadError } = await getPathContents(user.id, initialPath)

  if (loadError) {
    console.error('Error loading path contents:', loadError)
  }

  return (
    <CloudStorageSimple
      userId={user.id}
      initialPath={initialPath}
      initialFiles={files}
      initialFolders={folders}
      initialBreadcrumbs={breadcrumbs}
    />
  )
}
