import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { serverFileStorageService } from '@/lib/file-storage-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { fileId } = await params;
    
    // Get file metadata first
    const { data: fileData, error: fileError } = await supabase
      .from('file_metadata')
      .select('file_name, mime_type')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (fileError || !fileData) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Download file blob
    const fileBlob = await serverFileStorageService.downloadFile(fileId, user.id);
    
    if (!fileBlob) {
      return NextResponse.json(
        { error: 'Failed to download file' },
        { status: 400 }
      );
    }

    // Convert blob to array buffer
    const arrayBuffer = await fileBlob.arrayBuffer();
    
    // Return file with appropriate headers
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': fileData.mime_type,
        'Content-Disposition': `attachment; filename="${fileData.file_name}"`,
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}