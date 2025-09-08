import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { filePath, fileName, content } = await request.json()

    if (!filePath || !fileName || content === undefined) {
      return NextResponse.json({ error: 'File path, name, and content are required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate that the path belongs to the user
    if (!filePath.startsWith(`user_${user.id}`)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
    }

    // Construct the full file path
    const fullPath = `${filePath}/${fileName}`.replace(/\/+/g, '/').replace(/^\//, '')

    // First, try to delete the existing file if it exists
    const { error: deleteError } = await supabase.storage
      .from('documents')
      .remove([fullPath])

    // Note: We don't check for deleteError because the file might not exist yet

    // Create a blob from the content
    const blob = new Blob([content], { type: 'text/markdown' })

    // Upload the file (now it's a fresh upload)
    const { error } = await supabase.storage
      .from('documents')
      .upload(fullPath, blob, {
        upsert: false, // Since we deleted it first, this should be a new upload
        contentType: 'text/markdown',
        cacheControl: '3600'
      })

    if (error) {
      console.error('Error uploading file:', error)
      return NextResponse.json({ error: 'Failed to save file' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}