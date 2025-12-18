import { Suspense } from 'react'
import { CloudStorageSimple } from "@/components/cloud-storage-simple"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { getPathContents, getTotalStorageUsage } from "./actions"
import DateienLoading from './loading'

export const runtime = 'edge'

async function CloudStorageContent({ userId }: { userId: string }) {
  // Load initial files, folders and breadcrumbs on the server
  const initialPath = `user_${userId}`
  const [pathContents, totalSize] = await Promise.all([
    getPathContents(userId, initialPath),
    getTotalStorageUsage(userId)
  ])

  const { files, folders, breadcrumbs, error: loadError } = pathContents

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
      initialTotalSize={totalSize}
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
    <Suspense fallback={<DateienLoading />}>
      <CloudStorageContent userId={user.id} />
    </Suspense>
  )
}