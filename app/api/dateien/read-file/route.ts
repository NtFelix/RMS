import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { NO_CACHE_HEADERS } from '@/lib/constants/http'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { filePath, fileName, timestamp } = await request.json()

    if (!filePath || !fileName) {
      return NextResponse.json({ error: 'File path and name are required' }, {
        status: 400,
        headers: NO_CACHE_HEADERS,
      })
    }

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, {
        status: 401,
        headers: NO_CACHE_HEADERS,
      })
    }

    // Validate that the path belongs to the user
    if (!filePath.startsWith(`user_${user.id}`)) {
      return NextResponse.json({ error: 'Invalid path' }, {
        status: 403,
        headers: NO_CACHE_HEADERS,
      })
    }

    // Construct the full file path
    const fullPath = `${filePath}/${fileName}`.replace(/\/+/g, '/').replace(/^\//, '')

    console.log(`Reading file: ${fullPath} (timestamp: ${timestamp || 'none'})`)

    // Download the file from Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .download(fullPath)

    if (error) {
      console.error('Error downloading file:', error)
      return NextResponse.json({ error: 'File not found or access denied' }, {
        status: 404,
        headers: NO_CACHE_HEADERS,
      })
    }

    // Convert blob to text
    const content = await data.text()

    console.log(`File read successfully: ${fullPath}, content length: ${content.length}`)

    // Return with cache-busting headers
    return NextResponse.json({ content }, {
      headers: NO_CACHE_HEADERS
    })
  } catch (error) {
    console.error('Error reading file:', error)
    return NextResponse.json({ error: 'Internal server error' }, {
      status: 500,
      headers: NO_CACHE_HEADERS,
    })
  }
}