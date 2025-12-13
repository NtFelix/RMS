import { Suspense } from 'react'
import { CloudStorageSimple } from "@/components/cloud-storage-simple"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { getPathContents } from "./actions"
import DateienLoading from './loading'

export const runtime = 'edge'

async function CloudStorageContent({ userId }: { userId: string }) {
  // Load initial files, folders and breadcrumbs on the server
  const initialPath = `user_${userId}`
  const { files, folders, breadcrumbs, error: loadError } = await getPathContents(userId, initialPath)

  if (loadError) {
    console.error('Error loading initial files:', loadError)
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
  const supabase = await createSupabaseServerClient()
  
  // Get user on server side
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }

  return (
    <Suspense fallback={<DateienLoading />}>
      <CloudStorageContent userId={user.id} />
    </Suspense>
  )
}