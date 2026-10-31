import { CloudStorage } from "@/components/cloud-storage/cloud-storage"
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkStoragePathAccess, getActiveOrgId } from "@/lib/storage-access"
import { orgRoot } from "@/lib/storage-paths"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { getFolderContents } from "../actions"
import DateienLoading from "../loading"



async function CloudStoragePathContent({ params }: { params: Promise<{ slug: string[] }> }) {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/auth/login')
    }

    const orgId = await getActiveOrgId(supabase)
    if (!orgId) {
        throw new Error('Keine aktive Organisation gefunden')
    }

    const resolved = await params
    const slug = Array.isArray(resolved.slug) ? resolved.slug : []
    const initialPath = [orgRoot(orgId), ...slug].join('/')

    // Unknown, legacy (user_) or foreign paths fall back to the org root
    const accessError = await checkStoragePathAccess(supabase, user.id, initialPath, { allowLegacyOwnRead: true })
    if (accessError) {
        redirect('/dateien')
    }

    // Load path contents on server for SSR using unified RPC
    const { files, folders, breadcrumbs, totalSize, error: loadError } = await getFolderContents(initialPath)

    if (loadError) {
        console.error('Error loading path contents:', loadError)
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

export default function DateienPathPage({ params }: { params: Promise<{ slug: string[] }> }) {
    // Request-time work (auth, organisation, folder contents) runs inside the Suspense boundary
    return (
        <Suspense fallback={<DateienLoading />}>
            <CloudStoragePathContent params={params} />
        </Suspense>
    )
}
