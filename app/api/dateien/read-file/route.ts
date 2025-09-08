import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { filePath, fileName } = await request.json()

    if (!filePath || !fileName) {
      return NextResponse.json({ error: 'File path and name are required' }, { status: 400 })
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

    console.log(`Reading file: ${fullPath}`)

    // Download the file from Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .download(fullPath)

    if (error) {
      console.error('Error downloading file:', error)
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
    }

    // Convert blob to text
    const content = await data.text()

    console.log(`File read successfully: ${fullPath}, content length: ${content.length}`)
    return NextResponse.json({ content })
  } catch (error) {
    console.error('Error reading file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}