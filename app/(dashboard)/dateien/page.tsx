import { CloudStorageSimple } from "@/components/cloud-storage-simple"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { getPathContents } from "./actions"

export const runtime = 'edge'

export default async function DateienPage() {
  const supabase = await createClient()
  
  // Get user on server side
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }

  // Load initial files, folders and breadcrumbs on the server
  const initialPath = `user_${user.id}`
  const { files, folders, breadcrumbs, error: loadError } = await getPathContents(user.id, initialPath)

  if (loadError) {
    console.error('Error loading initial files:', loadError)
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