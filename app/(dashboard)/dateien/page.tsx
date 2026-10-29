import { Suspense } from 'react'
import { CloudStorage } from "@/components/cloud-storage/cloud-storage"
import { requireAuthenticatedUser } from "@/lib/server/route-access"
import { requirePermission } from "@/lib/permissions"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { getActiveOrgId } from "@/lib/storage-access"
import { orgRoot } from "@/lib/storage-paths"
import { getFolderContents } from "./actions"
import DateienLoading from './loading'



async function CloudStorageContent({ userId }: { userId: string }) {
    const supabase = await createSupabaseServerClient()
    const orgId = await getActiveOrgId(supabase)
    if (!orgId) {
        throw new Error('Keine aktive Organisation gefunden')
    }

    // Load initial files, folders and breadcrumbs on the server using unified RPC
    const initialPath = orgRoot(orgId)
    const { files, folders, breadcrumbs, totalSize, error: loadError } = await getFolderContents(userId, initialPath)

    if (loadError) {
        console.error('Error loading initial files:', loadError)
    }

    return (
        <CloudStorage
            userId={userId}
            orgId={orgId}
            initialPath={initialPath}
            initialFiles={files}
            initialFolders={folders}
            initialBreadcrumbs={breadcrumbs}
            initialTotalSize={totalSize}
        />
    )
}

export default async function DateienPage() {
    const { user } = await requireAuthenticatedUser()
    await requirePermission('dokumente', 'ansehen')

    return (
        <Suspense fallback={<DateienLoading />}>
            <CloudStorageContent userId={user.id} />
        </Suspense>
    )
}
