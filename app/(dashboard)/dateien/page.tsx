import { Suspense } from 'react'
import { CloudStorage } from "@/components/cloud-storage/cloud-storage"
import { requireAuthenticatedUser } from "@/lib/server/route-access"
import { requirePermission } from "@/lib/permissions"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { getActiveOrgId } from "@/lib/storage-access"
import { orgRoot } from "@/lib/storage-paths"
import { getFolderContents } from "./actions"
import DateienLoading from './loading'



async function CloudStorageContent() {
    // Authentication and permission are request-time work: they run inside the Suspense boundary so that
    // the page itself stays a static shell (cacheComponents)
    const { user } = await requireAuthenticatedUser()
    await requirePermission('dokumente', 'ansehen')

    const supabase = await createSupabaseServerClient()
    const orgId = await getActiveOrgId(supabase)
    if (!orgId) {
        throw new Error('Keine aktive Organisation gefunden')
    }

    // Load initial files, folders and breadcrumbs on the server using unified RPC
    const initialPath = orgRoot(orgId)
    const { files, folders, breadcrumbs, totalSize, error: loadError } = await getFolderContents(initialPath)

    if (loadError) {
        console.error('Error loading initial files:', loadError)
    }

    return (
        <CloudStorage
            userId={user.id}
            orgId={orgId}
            initialPath={initialPath}
            initialFiles={files}
            initialFolders={folders}
            initialBreadcrumbs={breadcrumbs}
            initialTotalSize={totalSize}
            initialError={loadError}
        />
    )
}

export default function DateienPage() {
    return (
        <Suspense fallback={<DateienLoading />}>
            <CloudStorageContent />
        </Suspense>
    )
}
