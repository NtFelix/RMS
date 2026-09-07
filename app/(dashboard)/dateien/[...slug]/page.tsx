import { CloudStorage } from "@/components/cloud-storage/cloud-storage"
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation"
import { getFolderContents } from "../actions"


// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;


export default async function DateienPathPage({ params }: { params: Promise<{ slug: string[] }> }) {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/auth/login')
    }

    const resolved = await params
    const slug = Array.isArray(resolved.slug) ? resolved.slug : []
    const initialPath = [`user_${user.id}`, ...slug].join('/')

    // Load path contents on server for SSR using unified RPC
    const { files, folders, breadcrumbs, totalSize, error: loadError } = await getFolderContents(user.id, initialPath)

    if (loadError) {
        console.error('Error loading path contents:', loadError)
    }

    return (
        <CloudStorage
            userId={user.id}
            initialPath={initialPath}
            initialFiles={files}
            initialFolders={folders}
            initialBreadcrumbs={breadcrumbs}
            initialTotalSize={totalSize}
        />
    )
}
