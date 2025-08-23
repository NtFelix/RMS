import { Suspense } from "react"
import { CloudStorageTab } from "@/components/cloud-storage-tab"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { getInitialFiles } from "./actions"

function CloudStorageLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

async function CloudStorageContent({ userId }: { userId: string }) {
  // Load initial files on the server
  const { files, error } = await getInitialFiles(userId)
  
  if (error) {
    console.error('Error loading initial files:', error)
  }

  return <CloudStorageTab userId={userId} initialFiles={files} />
}

export default async function DateienPage() {
  const supabase = await createClient()
  
  // Get user on server side
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }

  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<CloudStorageLoading />}>
        <CloudStorageContent userId={user.id} />
      </Suspense>
    </div>
  )
}